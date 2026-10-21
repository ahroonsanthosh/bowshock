/**
 * The 3D view of a solved flow (WebGPU): the rocket, and the axisymmetric
 * flow the solver computes around its body, revolved about the axis
 * (exact at zero incidence: src/render3d/field.ts), in the manner of
 * FluidX3D's renders (learnt from its README's pictures and descriptions
 * only; none of its code): a black background, a thin bounding box of
 * the computed region, luminous shells and filaments on a saturated
 * palette, and a small text readout.
 *
 * Layers (each switchable; keys of ./controls.ts):
 *  1 the rocket, solid or as a wireframe; the fins are geometry only (the
 *    flow solved is the body's; the fins' drag is computed separately);
 *  2 the field on a slice: the faces of a cutaway quarter, a plane
 *    through the axis, or a plane across it;
 *  3 streamlines, seeded upstream in the free stream at many radii and
 *    azimuths, straight to the shock, then traced through the field;
 *  4 iso-surfaces of the quantity shown, revolved iso-lines, cut away;
 *  the fitted bow shock as a translucent surface; the bounding box.
 * Behind the base nothing is computed: the flow's region ends there, at a
 * hatched plane labelled "not simulated", and nothing of the flow is
 * drawn beyond it.
 */

import { compileShader } from '../engine-gpu/gpu-common';
import { bytesPerRow, CanvasPresenter, CopyPresenter, type Presenter } from '../render/presenter';
import type { FlowSource } from '../render/flow-renderer';
import {
  eyeOf,
  cameraFrame,
  multiply,
  orbitBy,
  panBy,
  threeQuarterView,
  transform,
  viewProjection,
  zoomBy,
  type Mat4,
  type Orbit,
  type Vec3,
} from './camera';
import { fieldFromConserved, fieldBounds, shockLine, type MeridionalField } from './field';
import {
  LINE_FLOATS,
  boxEdges,
  crossSliceTriangles,
  flowGeometry,
  meridionalLineSegments,
  meridionalOutline,
  meridionalSliceTriangles,
  segments3d,
  shellSegments,
  shockRadiusAt,
  shockSegments,
  type FlowGeometry,
} from './geometry';
import { legend, textBlock, type Canvas2D } from './overlay';
import { QUANTITIES, type Quantity, type QuantityScale, type Units } from './quantities';
import { bodyLength } from '../geometry/body';
import { noseProfile, rocketMesh, finPlacement, type Rocket } from './rocket-mesh';
import commonWgsl from './shaders/common.wgsl?raw';
import bodyWgsl from './shaders/body.wgsl?raw';
import revolveWgsl from './shaders/revolve.wgsl?raw';
import ribbonWgsl from './shaders/ribbon.wgsl?raw';
import sliceWgsl from './shaders/slice.wgsl?raw';
import spriteWgsl from './shaders/sprite.wgsl?raw';
import gatherWgsl from './shaders/gather.wgsl?raw';

export type BodyLayer = 'solid' | 'wireframe' | 'off';
export type SliceMode = 'cutaway' | 'axial' | 'cross';

export interface SceneLayers {
  /** Key 1: the rocket solid, as a wireframe, or not drawn. */
  readonly body: BodyLayer;
  /** Key 2: the field on the slice (`sliceMode`). */
  readonly slice: boolean;
  /** Key 3. */
  readonly streamlines: boolean;
  /** Key 4: iso-surfaces of the quantity shown. */
  readonly isosurfaces: boolean;
  readonly shock: boolean;
  /** Iso-surfaces as lit, opaque shells (else thin glowing ones). */
  readonly solidShells: boolean;
  /** A quarter cut away from the surfaces and streamlines, facing the default view. */
  readonly cutaway: boolean;
  readonly box: boolean;
  /** The text readout, legend and notes drawn into the scene. */
  readonly overlay: boolean;
  /** Key H. */
  readonly help: boolean;
}

export const DEFAULT_LAYERS: SceneLayers = {
  body: 'solid',
  slice: true,
  streamlines: true,
  isosurfaces: true,
  solidShells: false,
  shock: true,
  cutaway: true,
  box: true,
  overlay: true,
  help: false,
};

/** What the readout says of the solve. */
export interface SceneStatus {
  readonly steps?: number | undefined;
  readonly converged?: boolean | undefined;
  /** Cell updates per second, if the page measures them. */
  readonly cellRate?: number | undefined;
  /** A first line naming the case. */
  readonly caption?: string | undefined;
}

/** The colour channel's scale, for a page's own legend. */
export interface SceneScale {
  readonly quantity: Quantity;
  readonly label: string;
  readonly unit: string;
  readonly min: number;
  readonly max: number;
  readonly freeValue: number;
  /** Iso-surface levels drawn. */
  readonly levels: readonly number[];
  /** The palette, t in [0, 1] of the range. */
  readonly colour: (t: number) => [number, number, number];
}

export interface FlowScene3DOptions {
  /** How frames reach the page (as the 2D view's): a canvas context, or copied (software adapters). */
  readonly presentation?: 'canvas' | 'copy' | Presenter;
  /** Device pixels per CSS pixel for text and line widths (default the window's). */
  readonly pixelRatio?: number;
  /** Units of the speed and temperature (with the free stream's temperature, m/s and K). */
  readonly units?: Units;
  /** Most of each second a live view may spend drawing (default 0.06). */
  readonly liveDuty?: number;
}

/** Samples per pixel: 4 (multisampled) in full quality, 1 in draft (live frames on a slow adapter). */
const SAMPLES = 4;
/** A frame slower than this (ms) makes live frames drafts. */
const DRAFT_ABOVE_MS = 150;
/** Live frames a second at most. */
const MAX_LIVE_FPS = 30;
const DEPTH_FORMAT: GPUTextureFormat = 'depth24plus';
const FRAME_BYTES = 256;
const DRAW_BYTES = 64;
const PALETTE_SIZE = 256;
/** Azimuths of the streamlines (every 10 degrees). */
const STREAMLINE_AZIMUTHS = 36;
const DRAFT_STREAMLINE_AZIMUTHS = 18;
/** Sectors of a full turn of the revolved surfaces. */
const SHELL_SECTORS = 144;
const DRAFT_SHELL_SECTORS = 64;
/**
 * The cutaway: a quarter turn from azimuth `cutStart` towards +z, facing
 * the default view; it starts at the first fin, so that fins lie on its
 * faces rather than behind them.
 */
const CUT_WIDTH = Math.PI / 2;

type DrawName =
  | 'body'
  | 'slice'
  | 'base'
  | 'shells'
  | 'shock'
  | 'streamlines'
  | 'freeLines'
  | 'cutLines'
  | 'outline'
  | 'wire'
  | 'box'
  | 'hatch';

interface LineSet {
  buffer: GPUBuffer;
  count: number;
}

interface Sprite {
  texture: GPUTexture;
  bindGroup: GPUBindGroup;
  uniform: GPUBuffer;
  width: number;
  height: number;
}

class Pipelines {
  constructor(
    readonly frameLayout: GPUBindGroupLayout,
    readonly drawLayout: GPUBindGroupLayout,
    readonly storageLayout: GPUBindGroupLayout,
    readonly spriteLayout: GPUBindGroupLayout,
    readonly body: GPURenderPipeline,
    readonly shell: GPURenderPipeline,
    readonly shellLit: GPURenderPipeline,
    readonly line: GPURenderPipeline,
    readonly slice: GPURenderPipeline,
    readonly sprite: GPURenderPipeline,
  ) {}

  static async create(
    device: GPUDevice,
    format: GPUTextureFormat,
    samples: number,
    shared?: Pipelines,
  ): Promise<Pipelines> {
    const VF = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;
    const frameLayout =
      shared?.frameLayout ??
      device.createBindGroupLayout({
        label: '3D frame',
        entries: [
          { binding: 0, visibility: VF, buffer: { type: 'uniform' } },
          { binding: 1, visibility: VF, buffer: { type: 'read-only-storage' } },
        ],
      });
    const drawLayout =
      shared?.drawLayout ??
      device.createBindGroupLayout({
        label: '3D draw',
        entries: [{ binding: 0, visibility: VF, buffer: { type: 'uniform' } }],
      });
    const storageLayout =
      shared?.storageLayout ??
      device.createBindGroupLayout({
        label: '3D draw with segments',
        entries: [
          { binding: 0, visibility: VF, buffer: { type: 'uniform' } },
          { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
        ],
      });
    const spriteLayout =
      shared?.spriteLayout ??
      device.createBindGroupLayout({
        label: '3D sprite',
        entries: [
          { binding: 0, visibility: VF, buffer: { type: 'uniform' } },
          { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
          { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
        ],
      });
    const layout = (second: GPUBindGroupLayout) =>
      device.createPipelineLayout({ bindGroupLayouts: [frameLayout, second] });
    const [bodyModule, shellModule, lineModule, sliceModule, spriteModule] = await Promise.all([
      compileShader(device, '3D body', commonWgsl + bodyWgsl),
      compileShader(device, '3D shells', commonWgsl + revolveWgsl),
      compileShader(device, '3D lines', commonWgsl + ribbonWgsl),
      compileShader(device, '3D slices', commonWgsl + sliceWgsl),
      compileShader(device, '3D sprites', commonWgsl + spriteWgsl),
    ]);
    const additive: GPUBlendState = {
      color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
      alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
    };
    const alpha: GPUBlendState = {
      color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
      alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
    };
    const premultiplied: GPUBlendState = {
      color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
      alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
    };
    const depth = (write: boolean, compare: GPUCompareFunction = 'less'): GPUDepthStencilState => ({
      format: DEPTH_FORMAT,
      depthWriteEnabled: write,
      depthCompare: compare,
    });
    const multisample = { count: samples };
    const primitive: GPUPrimitiveState = { topology: 'triangle-list', cullMode: 'none' };
    const [body, shell, shellLit, line, slice, sprite] = await Promise.all([
      device.createRenderPipelineAsync({
        label: '3D body',
        layout: layout(drawLayout),
        vertex: {
          module: bodyModule,
          entryPoint: 'body_vs',
          buffers: [
            {
              arrayStride: 12,
              attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }],
            },
            {
              arrayStride: 12,
              attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x3' }],
            },
            { arrayStride: 4, attributes: [{ shaderLocation: 2, offset: 0, format: 'float32' }] },
          ],
        },
        fragment: { module: bodyModule, entryPoint: 'body_fs', targets: [{ format }] },
        primitive,
        depthStencil: depth(true),
        multisample,
      }),
      device.createRenderPipelineAsync({
        label: '3D shells',
        layout: layout(storageLayout),
        vertex: { module: shellModule, entryPoint: 'shell_vs' },
        fragment: {
          module: shellModule,
          entryPoint: 'shell_fs',
          targets: [{ format, blend: additive }],
        },
        primitive,
        depthStencil: depth(false),
        multisample,
      }),
      device.createRenderPipelineAsync({
        label: '3D lit shells',
        layout: layout(storageLayout),
        vertex: { module: shellModule, entryPoint: 'shell_vs' },
        fragment: { module: shellModule, entryPoint: 'shell_lit_fs', targets: [{ format }] },
        primitive,
        depthStencil: depth(true),
        multisample,
      }),
      device.createRenderPipelineAsync({
        label: '3D lines',
        layout: layout(storageLayout),
        vertex: { module: lineModule, entryPoint: 'line_vs' },
        fragment: {
          module: lineModule,
          entryPoint: 'line_fs',
          targets: [{ format, blend: additive }],
        },
        primitive,
        depthStencil: depth(false, 'less-equal'),
        multisample,
      }),
      device.createRenderPipelineAsync({
        label: '3D slices',
        layout: layout(drawLayout),
        vertex: {
          module: sliceModule,
          entryPoint: 'slice_vs',
          buffers: [
            {
              arrayStride: 16,
              attributes: [
                { shaderLocation: 0, offset: 0, format: 'float32x3' },
                { shaderLocation: 1, offset: 12, format: 'float32' },
              ],
            },
          ],
        },
        fragment: {
          module: sliceModule,
          entryPoint: 'slice_fs',
          targets: [{ format, blend: alpha }],
        },
        primitive,
        depthStencil: depth(false),
        multisample,
      }),
      device.createRenderPipelineAsync({
        label: '3D sprites',
        layout: layout(spriteLayout),
        vertex: { module: spriteModule, entryPoint: 'sprite_vs' },
        fragment: {
          module: spriteModule,
          entryPoint: 'sprite_fs',
          targets: [{ format, blend: premultiplied }],
        },
        primitive,
        depthStencil: depth(false, 'always'),
        multisample,
      }),
    ]);
    return new Pipelines(
      frameLayout,
      drawLayout,
      storageLayout,
      spriteLayout,
      body,
      shell,
      shellLit,
      line,
      slice,
      sprite,
    );
  }
}

/** The look of each draw: Draw's colour, look, sweep and extra (see common.wgsl). */
interface DrawLook {
  colour?: [number, number, number, number];
  look?: [number, number, number, number];
  sweep?: [number, number, number, number];
  extra?: [number, number, number, number];
}

export class FlowScene3D {
  private readonly frameBuffer: GPUBuffer;
  private readonly paletteBuffer: GPUBuffer;
  private readonly frameGroup: GPUBindGroup;
  private readonly draws = new Map<DrawName, { uniform: GPUBuffer; group?: GPUBindGroup }>();
  private readonly sampler: GPUSampler;
  private msaa: GPUTexture | null = null;
  private depth: GPUTexture | null = null;
  private draftPipelines: Promise<Pipelines> | null = null;
  /** Live frames are drafts on an adapter where a full frame is slow. */
  private lastFullFrameMs = 0;
  /** What the last frame cost (drawFrame). */
  private lastFrameMs = 0;
  private geometryDraft = false;

  private rocket: Rocket | null = null;
  private bodyBuffers: {
    position: GPUBuffer;
    normal: GPUBuffer;
    part: GPUBuffer;
    index: GPUBuffer;
    count: number;
  } | null = null;
  private wire: LineSet | null = null;

  private field: MeridionalField | null = null;
  private geometry: FlowGeometry | null = null;
  private shells: LineSet | null = null;
  private shock: LineSet | null = null;
  private streamlines: LineSet | null = null;
  private freeLines: LineSet | null = null;
  private cutLines: LineSet | null = null;
  private outline: LineSet | null = null;
  private box: LineSet | null = null;
  private hatch: LineSet | null = null;
  private sliceTriangles: { buffer: GPUBuffer; count: number } | null = null;
  private baseTriangles: { buffer: GPUBuffer; count: number } | null = null;
  private geometryDirty = true;

  private sprites: Record<'corner' | 'legend' | 'notes' | 'base' | 'help', Sprite | undefined> = {
    corner: undefined,
    legend: undefined,
    notes: undefined,
    base: undefined,
    help: undefined,
  };
  private overlayDirty = true;

  private layers: SceneLayers = DEFAULT_LAYERS;
  private quantity: Quantity = 'mach';
  private sliceMode: SliceMode = 'cutaway';
  /** Axial: the plane's azimuth; cross: its x as a fraction of the region's length. */
  private slicePosition = { axial: 0, cross: 0.55 };
  private orbit: Orbit | null = null;
  private cutStart = 0;
  /** The part of the canvas the view is fitted into (device pixels), or the whole. */
  private viewRect: { x: number; y: number; width: number; height: number } | null = null;
  /** The region the view was last fitted to, while the viewer has not moved it. */
  private fittedTo: string | null = null;
  private status: SceneStatus = {};
  private units: Units;
  private readonly pixelRatio: number;
  private scaleListeners: ((scale: SceneScale) => void)[] = [];

  private source: FlowSource | null = null;
  private live = false;
  private liveTimer: ReturnType<typeof setTimeout> | null = null;
  private reading: Promise<void> | null = null;
  private readonly liveDuty: number;
  private gatherPipeline: Promise<GPUComputePipeline> | null = null;
  private drawing: Promise<void> | null = null;
  private redrawAfter = false;
  private destroyed = false;
  /** Frames drawn, for a page to measure. */
  framesDrawn = 0;

  private constructor(
    private readonly device: GPUDevice,
    private readonly canvas: HTMLCanvasElement | OffscreenCanvas,
    private readonly presenter: Presenter,
    private readonly pipelines: Pipelines,
    options: FlowScene3DOptions,
  ) {
    this.pixelRatio =
      options.pixelRatio ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    this.units = options.units ?? {};
    this.liveDuty = options.liveDuty ?? 0.06;
    const usage = GPUBufferUsage;
    this.frameBuffer = device.createBuffer({
      label: '3D frame',
      size: FRAME_BYTES,
      usage: usage.UNIFORM | usage.COPY_DST,
    });
    this.paletteBuffer = device.createBuffer({
      label: '3D palette',
      size: 16 * PALETTE_SIZE,
      usage: usage.STORAGE | usage.COPY_DST,
    });
    this.frameGroup = device.createBindGroup({
      layout: pipelines.frameLayout,
      entries: [
        { binding: 0, resource: { buffer: this.frameBuffer } },
        { binding: 1, resource: { buffer: this.paletteBuffer } },
      ],
    });
    this.sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
    for (const name of [
      'body',
      'slice',
      'base',
      'shells',
      'shock',
      'streamlines',
      'freeLines',
      'cutLines',
      'outline',
      'wire',
      'box',
      'hatch',
    ] as const) {
      this.draws.set(name, {
        uniform: device.createBuffer({
          label: `3D ${name}`,
          size: DRAW_BYTES,
          usage: usage.UNIFORM | usage.COPY_DST,
        }),
      });
    }
  }

  /**
   * A scene drawing into `canvas` with `device` (the solver's own, so that
   * a live fit's buffers can be read without copying them between devices).
   */
  static async create(
    device: GPUDevice,
    canvas: HTMLCanvasElement | OffscreenCanvas,
    options: FlowScene3DOptions = {},
  ): Promise<FlowScene3D> {
    const p = options.presentation ?? 'canvas';
    const presenter =
      p === 'canvas'
        ? new CanvasPresenter(device, canvas as HTMLCanvasElement)
        : p === 'copy'
          ? new CopyPresenter(device, canvas as HTMLCanvasElement)
          : p;
    const pipelines = await Pipelines.create(device, presenter.format, SAMPLES);
    return new FlowScene3D(device, canvas, presenter, pipelines, options);
  }

  // ---------------------------------------------------------------- inputs

  /** The rocket to draw: its body (the solver's) and fins (geometry only). */
  setRocket(rocket: Rocket | null): void {
    this.rocket = rocket;
    this.cutStart = cutStartFor(rocket);
    this.destroyBody();
    if (rocket !== null) {
      const mesh = rocketMesh(rocket);
      const make = (
        label: string,
        data: Float32Array<ArrayBuffer> | Uint32Array<ArrayBuffer>,
        usage: number,
      ) => {
        const b = this.device.createBuffer({
          label,
          size: Math.max(data.byteLength, 16),
          usage: usage | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(b, 0, data);
        return b;
      };
      this.bodyBuffers = {
        position: make('3D body positions', mesh.positions, GPUBufferUsage.VERTEX),
        normal: make('3D body normals', mesh.normals, GPUBufferUsage.VERTEX),
        part: make('3D body parts', mesh.parts, GPUBufferUsage.VERTEX),
        index: make('3D body indices', mesh.indices, GPUBufferUsage.INDEX),
        count: mesh.indices.length,
      };
      this.wire = this.lineSet('wire', wireframe(rocket));
    }
    this.geometryDirty = true;
    this.overlayDirty = true;
    this.requestDraw();
  }

  /** A flow already on the CPU (a CPU fit, a GPU fit read back, a cached field). */
  setField(field: MeridionalField | null, status?: SceneStatus): void {
    this.field = field;
    if (status !== undefined) this.status = { ...this.status, ...status };
    this.geometryDirty = true;
    this.overlayDirty = true;
    this.requestDraw(true);
  }

  /**
   * A flow on the GPU as it converges (`liveFitSource` of
   * src/render/flow-source.ts), read back while live at most `liveDuty`
   * of the time; null for none (the last flow read stays drawn).
   */
  setFlow(source: FlowSource | null): void {
    this.source = source;
    if (source !== null) void this.readSource();
  }

  /** The flow drawn (as last set or read back), null for none. */
  getField(): MeridionalField | null {
    return this.field;
  }

  /** Read the source's buffers now (resolves when the flow read is set). */
  async refresh(): Promise<void> {
    while (this.reading !== null) await this.reading;
    await this.readSource();
  }

  /** Keep the last flow read; the source's buffers may be released after this. */
  freeze(): void {
    this.setLive(false);
    this.source = null;
    // The last flow read, drawn again in full quality.
    this.requestDraw();
  }

  /** Read and draw the source continuously (while its solver runs). */
  setLive(live: boolean): void {
    this.live = live;
    if (!live && this.liveTimer !== null) {
      clearTimeout(this.liveTimer);
      this.liveTimer = null;
    }
    if (live) this.scheduleLive(0);
  }

  setStatus(status: SceneStatus): void {
    this.status = { ...this.status, ...status };
    this.overlayDirty = true;
    this.requestDraw(true);
  }

  setUnits(units: Units): void {
    this.units = units;
    this.geometryDirty = true;
    this.overlayDirty = true;
    this.requestDraw();
  }

  setLayers(layers: Partial<SceneLayers>): void {
    const before = this.layers;
    this.layers = { ...this.layers, ...layers };
    if (before.cutaway !== this.layers.cutaway) this.geometryDirty = true;
    this.overlayDirty = true;
    this.requestDraw();
  }

  getLayers(): SceneLayers {
    return this.layers;
  }

  setQuantity(quantity: Quantity): void {
    this.quantity = quantity;
    this.geometryDirty = true;
    this.overlayDirty = true;
    this.requestDraw();
  }

  getQuantity(): Quantity {
    return this.quantity;
  }

  /** Key Z: the next quantity. */
  cycleQuantity(): Quantity {
    const k = QUANTITIES.indexOf(this.quantity);
    this.setQuantity(QUANTITIES[(k + 1) % QUANTITIES.length]!);
    return this.quantity;
  }

  setSlice(mode: SliceMode): void {
    this.sliceMode = mode;
    this.geometryDirty = true;
    this.overlayDirty = true;
    this.requestDraw();
  }

  getSlice(): SliceMode {
    return this.sliceMode;
  }

  /** Key T: the next slice orientation. */
  cycleSlice(): SliceMode {
    const modes: SliceMode[] = ['cutaway', 'axial', 'cross'];
    this.setSlice(modes[(modes.indexOf(this.sliceMode) + 1) % modes.length]!);
    return this.sliceMode;
  }

  /** Keys Q and E: move the slice (turn the axial plane, move the cross plane along the axis). */
  moveSlice(steps: number): void {
    if (this.sliceMode === 'axial') {
      this.slicePosition.axial += (steps * Math.PI) / 36;
    } else if (this.sliceMode === 'cross') {
      this.slicePosition.cross = Math.min(
        Math.max(this.slicePosition.cross + 0.02 * steps, 0.005),
        0.995,
      );
    }
    this.geometryDirty = true;
    this.requestDraw();
  }

  /** Called with the colour channel's scale whenever it changes. */
  onScale(listener: (scale: SceneScale) => void): () => void {
    this.scaleListeners.push(listener);
    const g = this.geometry;
    if (g !== null) listener(sceneScale(g));
    return () => {
      this.scaleListeners = this.scaleListeners.filter((l) => l !== listener);
    };
  }

  // ---------------------------------------------------------------- camera

  resetView(): void {
    const b = this.regionBox();
    if (b === null) return;
    const g = this.field !== null ? shockLine(this.field) : undefined;
    this.orbit = threeQuarterView(
      b.xMin,
      b.xMax,
      b.rMax,
      this.aspect(),
      g === undefined ? undefined : clipOutline(g, b.xMax),
    );
    this.fittedTo = regionKey(b, this.aspect());
    this.requestDraw();
  }

  getOrbit(): Orbit | null {
    return this.orbit;
  }

  setOrbit(orbit: Orbit): void {
    this.orbit = orbit;
    this.fittedTo = null;
    this.requestDraw();
  }

  orbitBy(dYaw: number, dPitch: number): void {
    if (this.orbit === null) return;
    this.orbit = orbitBy(this.orbit, dYaw, dPitch);
    this.fittedTo = null;
    this.requestDraw();
  }

  /** Pan by a drag of (dx, dy) pixels of the canvas. */
  panPixels(dx: number, dy: number): void {
    if (this.orbit === null) return;
    const scale = (2 * Math.tan(this.orbit.fovY / 2)) / Math.max(this.canvas.height, 1);
    this.orbit = panBy(this.orbit, dx * scale, dy * scale);
    this.fittedTo = null;
    this.requestDraw();
  }

  zoomBy(factor: number): void {
    if (this.orbit === null) return;
    const b = this.regionBox();
    const size = b === null ? 10 : Math.hypot(b.xMax - b.xMin, b.rMax);
    this.orbit = zoomBy(this.orbit, factor, 0.05 * size, 8 * size);
    this.fittedTo = null;
    this.requestDraw();
  }

  // ---------------------------------------------------------------- drawing

  /**
   * Draw a frame when the browser next can (coalesced). A change of the
   * data (`fromData`: the flow, the status) waits, while live, for the
   * next live frame, which draws it at the live rate.
   */
  requestDraw(fromData = false): void {
    if (this.destroyed || (fromData && this.live)) return;
    if (this.drawing !== null) {
      this.redrawAfter = true;
      return;
    }
    const schedule =
      typeof requestAnimationFrame !== 'undefined'
        ? requestAnimationFrame
        : (f: () => void) => setTimeout(f, 0);
    if (this.pendingFrame) return;
    this.pendingFrame = true;
    schedule(() => {
      this.pendingFrame = false;
      void this.render();
    });
  }

  private pendingFrame = false;

  /** Draw a frame now; resolves when it has been shown. */
  async render(): Promise<void> {
    if (this.destroyed) return;
    if (this.drawing !== null) {
      this.redrawAfter = true;
      return this.drawing;
    }
    const draft = this.live && this.lastFullFrameMs > DRAFT_ABOVE_MS;
    this.drawing = this.drawFrame(undefined, draft)
      .then(() => undefined)
      .finally(() => {
        this.drawing = null;
        if (this.redrawAfter) {
          this.redrawAfter = false;
          this.requestDraw();
        }
      });
    return this.drawing;
  }

  private aspect(): number {
    const r = this.viewRect;
    if (r !== null) return Math.max(r.width, 1) / Math.max(r.height, 1);
    return Math.max(this.canvas.width, 1) / Math.max(this.canvas.height, 1);
  }

  /**
   * Fit the view into this part of the canvas (device pixels from its top
   * left), the part the page's panels leave uncovered; null for the whole.
   */
  fit(rect: { x: number; y: number; width: number; height: number } | null): void {
    this.viewRect = rect;
    this.resetView();
  }

  /** Clip space of the view rectangle within the canvas's (an off-centre projection). */
  private rectTransform(): Mat4 | null {
    const r = this.viewRect;
    if (r === null) return null;
    const W = Math.max(this.canvas.width, 1);
    const H = Math.max(this.canvas.height, 1);
    const sx = r.width / W;
    const sy = r.height / H;
    const ox = (2 * (r.x + r.width / 2)) / W - 1;
    const oy = 1 - (2 * (r.y + r.height / 2)) / H;
    return new Float32Array([sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, 1, 0, ox, oy, 0, 1]);
  }

  /** The computed region's box (along the axis to the base, radius to the shock's largest). */
  private regionBox(): { xMin: number; xMax: number; rMax: number } | null {
    if (this.field !== null) {
      const b = fieldBounds(this.field);
      const end = this.rocket !== null ? bodyLength(this.rocket.body) : b.xMax;
      return { xMin: Math.min(b.xMin, 0), xMax: Math.min(b.xMax, end), rMax: b.rMax };
    }
    if (this.rocket !== null) {
      const L = bodyLength(this.rocket.body);
      return { xMin: 0, xMax: L, rMax: 0.35 * L };
    }
    return null;
  }

  private lineSet(
    name: string,
    data: Float32Array<ArrayBuffer>,
    stride = 4 * LINE_FLOATS,
  ): LineSet | null {
    if (data.length === 0) return null;
    const buffer = this.device.createBuffer({
      label: `3D ${name}`,
      size: data.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(buffer, 0, data);
    return { buffer, count: data.byteLength / stride };
  }

  private triangleSet(
    name: string,
    data: Float32Array<ArrayBuffer>,
  ): { buffer: GPUBuffer; count: number } | null {
    if (data.length === 0) return null;
    const buffer = this.device.createBuffer({
      label: `3D ${name}`,
      size: data.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(buffer, 0, data);
    return { buffer, count: data.length / 4 };
  }

  private rebuildGeometry(draft: boolean): void {
    this.geometryDirty = false;
    this.geometryDraft = draft;
    for (const s of [
      this.shells,
      this.shock,
      this.streamlines,
      this.freeLines,
      this.cutLines,
      this.outline,
      this.box,
      this.hatch,
    ])
      s?.buffer.destroy();
    this.sliceTriangles?.buffer.destroy();
    this.baseTriangles?.buffer.destroy();
    this.shells =
      this.shock =
      this.streamlines =
      this.freeLines =
      this.cutLines =
      this.outline =
      this.box =
      this.hatch =
        null;
    this.sliceTriangles = this.baseTriangles = null;
    const field = this.field;
    const region = this.regionBox();
    if (region !== null) {
      this.box = this.lineSet('box', boxEdges(region.xMin, region.xMax, region.rMax));
    }
    if (field === null || region === null) {
      this.geometry = null;
      return;
    }
    const g = flowGeometry(field, {
      quantity: this.quantity,
      units: this.units,
      xEnd: region.xMax,
      draft,
    });
    this.geometry = g;
    const palette = new Float32Array(4 * PALETTE_SIZE);
    for (let k = 0; k < PALETTE_SIZE; k++)
      palette.set([...g.scale.palette(k / (PALETTE_SIZE - 1)), 1], 4 * k);
    this.device.queue.writeBuffer(this.paletteBuffer, 0, palette);
    this.shells = this.lineSet(
      'shells',
      shellSegments(g.isoLines, (l) => l.level),
      48,
    );
    this.shock = this.lineSet('shock', shockSegments(g.shock), 48);
    // The computed part of each streamline, and the free stream's part (drawn dimmer).
    const parts = g.streamlines.map((l) => splitStreamline(l));
    this.streamlines = this.lineSet(
      'streamlines',
      meridionalLineSegments(parts.map((p) => decimate(p.computed))),
    );
    this.freeLines = this.lineSet(
      'free stream lines',
      meridionalLineSegments(parts.flatMap((p) => p.free)),
    );
    // On the slice's faces: the iso-lines and the region's outline.
    const outline = meridionalOutline(g.mesh);
    this.cutLines = this.lineSet(
      'cut lines',
      meridionalLineSegments(
        g.isoLines.map((l) => ({ x: l.x, r: l.r, value: l.x.map(() => l.level) })),
      ),
    );
    this.outline = this.lineSet(
      'outline',
      meridionalLineSegments([{ ...outline, value: outline.x.map(() => 0) }]),
    );
    const slice = this.sliceGeometry(g);
    this.sliceTriangles = slice === null ? null : this.triangleSet('slice', slice);
    // The base: the end of the computed region, hatched.
    const h = region.rMax;
    const xb = region.xMax;
    this.baseTriangles = this.triangleSet('base plane', squareAt(xb, h, 0));
    const hatch: [number[], number[]][] = [];
    const n = 16;
    for (let k = 1; k < 2 * n; k++) {
      // Lines y - z = c across the square [-h, h]^2.
      const c = -2 * h + (4 * h * k) / (2 * n);
      const y0 = Math.max(-h, c - h);
      const y1 = Math.min(h, c + h);
      hatch.push([
        [xb, y0, y0 - c],
        [xb, y1, y1 - c],
      ]);
    }
    this.hatch = this.lineSet('hatch', segments3d(hatch));
    const scale = sceneScale(g);
    for (const l of this.scaleListeners) l(scale);
  }

  private sliceGeometry(g: FlowGeometry): Float32Array<ArrayBuffer> | null {
    switch (this.sliceMode) {
      case 'cutaway':
        // With nothing cut away, the plane through the axis.
        return this.layers.cutaway
          ? meridionalSliceTriangles(g.mesh, g.values, [this.cutStart, this.cutStart + CUT_WIDTH])
          : meridionalSliceTriangles(g.mesh, g.values, [
              this.slicePosition.axial,
              this.slicePosition.axial + Math.PI,
            ]);
      case 'axial': {
        // The plane through the axis, the free stream filled out to the box.
        const phis = [this.slicePosition.axial, this.slicePosition.axial + Math.PI];
        return concat(meridionalSliceTriangles(g.mesh, g.values, phis), freeStreamPlane(g, phis));
      }
      case 'cross': {
        const x = g.bounds.xMin + this.slicePosition.cross * (g.bounds.xMax - g.bounds.xMin);
        return concat(crossSliceTriangles(g.mesh, g.values, x, 144), freeStreamDisc(g, x, 144));
      }
    }
  }

  private writeDraw(name: DrawName, look: DrawLook): GPUBuffer {
    const d = this.draws.get(name)!;
    const data = new Float32Array(16);
    data.set(look.colour ?? [1, 1, 1, 0], 0);
    data.set(look.look ?? [1, 0, 1, 0], 4);
    data.set(look.sweep ?? [0, 0, 1, 0], 8);
    data.set(look.extra ?? [1, 1, 0, 0], 12);
    this.device.queue.writeBuffer(d.uniform, 0, data);
    return d.uniform;
  }

  private groupFor(name: DrawName, storage: GPUBuffer | null): GPUBindGroup {
    const d = this.draws.get(name)!;
    if (storage === null) {
      d.group ??= this.device.createBindGroup({
        layout: this.pipelines.drawLayout,
        entries: [{ binding: 0, resource: { buffer: d.uniform } }],
      });
      return d.group;
    }
    return this.device.createBindGroup({
      layout: this.pipelines.storageLayout,
      entries: [
        { binding: 0, resource: { buffer: d.uniform } },
        { binding: 1, resource: { buffer: storage } },
      ],
    });
  }

  private writeFrame(viewProj: Mat4, orbit: Orbit): void {
    const data = new Float32Array(FRAME_BYTES / 4);
    data.set(viewProj, 0);
    const eye = eyeOf(orbit);
    data.set([...eye, 1], 16);
    const w = this.canvas.width;
    const h = this.canvas.height;
    data.set([w, h, 1 / w, 1 / h], 20);
    const { right, up, back } = cameraFrame(orbit);
    const dir = (a: number, b: number, c: number): number[] => {
      const v = [0, 1, 2].map((k) => a * right[k]! + b * up[k]! + c * back[k]!);
      const l = Math.hypot(v[0]!, v[1]!, v[2]!);
      return [v[0]! / l, v[1]! / l, v[2]! / l, 0];
    };
    data.set(dir(-0.45, 0.75, 0.55), 24); // key: upper left, in front
    data.set(dir(0.35, 0.4, -0.85), 28); // rim: from behind
    data.set(dir(0.7, -0.2, 0.5), 32); // fill: right, low
    const g = this.geometry;
    const min = g?.range.min ?? 0;
    const max = g?.range.max ?? 1;
    data.set([min, max, 1 / (max - min), 0], 36);
    data.set([this.cutStart, CUT_WIDTH, this.layers.cutaway ? 1 : 0, 0], 40);
    const region = this.regionBox();
    data.set([region?.xMax ?? 0, region !== null ? 1 : 0, 0, 0], 44);
    this.device.queue.writeBuffer(this.frameBuffer, 0, data);
  }

  private ensureTargets(samples: number): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (this.depth?.width !== w || this.depth.height !== h) this.overlayDirty = true;
    if (samples > 1 && (this.msaa?.width !== w || this.msaa.height !== h)) {
      this.msaa?.destroy();
      this.msaa = this.device.createTexture({
        label: '3D colour (multisampled)',
        size: [w, h],
        format: this.presenter.format,
        sampleCount: samples,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }
    if (this.depth?.width !== w || this.depth.height !== h || this.depth.sampleCount !== samples) {
      this.depth?.destroy();
      this.depth = this.device.createTexture({
        label: '3D depth',
        size: [w, h],
        format: DEPTH_FORMAT,
        sampleCount: samples,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }
  }

  /**
   * Draw a frame; resolves, once the GPU has done it, to what it cost (ms):
   * the CPU's time to build and encode it, and the GPU's from when the
   * queue reached it (after the work before it, the solver's) to its end.
   */
  private async drawFrame(into?: GPUTexture, draft = false): Promise<number> {
    if (this.canvas.width < 2 || this.canvas.height < 2) return 0;
    const pipelines = draft
      ? await (this.draftPipelines ??= Pipelines.create(
          this.device,
          this.presenter.format,
          1,
          this.pipelines,
        ))
      : this.pipelines;
    const started = performance.now();
    if (this.geometryDirty || this.geometryDraft !== draft) this.rebuildGeometry(draft);
    const samples = draft ? 1 : SAMPLES;
    // Fit the view to the region while the viewer has not moved it (the
    // region grows as the shock settles, and the canvas may be resized).
    const box = this.regionBox();
    if (
      this.orbit === null ||
      (this.fittedTo !== null && box !== null && this.fittedTo !== regionKey(box, this.aspect()))
    ) {
      this.resetView();
    }
    const orbit = this.orbit;
    if (orbit === null) return 0;
    this.ensureTargets(samples);
    const region = this.regionBox();
    const sceneRadius =
      region === null ? 10 : Math.hypot(region.xMax - region.xMin, 2 * region.rMax);
    const projection = viewProjection(orbit, this.aspect(), sceneRadius);
    const shift = this.rectTransform();
    const viewProj = shift === null ? projection : multiply(shift, projection);
    this.writeFrame(viewProj, orbit);
    if (this.overlayDirty) this.rebuildOverlay();
    const target = into ?? this.presenter.frameTexture();
    const encoder = this.device.createCommandEncoder({ label: '3D frame' });
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        samples > 1
          ? {
              view: this.msaa!.createView(),
              resolveTarget: target.createView(),
              clearValue: { r: 0, g: 0, b: 0, a: 1 },
              loadOp: 'clear',
              storeOp: 'discard',
            }
          : {
              view: target.createView(),
              clearValue: { r: 0, g: 0, b: 0, a: 1 },
              loadOp: 'clear',
              storeOp: 'store',
            },
      ],
      depthStencilAttachment: {
        view: this.depth!.createView(),
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'discard',
      },
    });
    pass.setBindGroup(0, this.frameGroup);
    const L = this.layers;
    const px = this.pixelRatio;
    const g = this.geometry;
    // The rocket, opaque.
    if (L.body === 'solid' && this.bodyBuffers !== null) {
      const b = this.bodyBuffers;
      this.writeDraw('body', {});
      pass.setPipeline(pipelines.body);
      pass.setBindGroup(1, this.groupFor('body', null));
      pass.setVertexBuffer(0, b.position);
      pass.setVertexBuffer(1, b.normal);
      pass.setVertexBuffer(2, b.part);
      pass.setIndexBuffer(b.index, 'uint32');
      pass.drawIndexed(b.count);
    }
    const visibleTurn = L.cutaway ? 2 * Math.PI - CUT_WIDTH : 2 * Math.PI;
    const firstAzimuth = L.cutaway ? this.cutStart + CUT_WIDTH : 0;
    const shellSectors = Math.round(
      ((draft ? DRAFT_SHELL_SECTORS : SHELL_SECTORS) * visibleTurn) / (2 * Math.PI),
    );
    if (L.isosurfaces && L.solidShells && this.shells !== null) {
      this.writeDraw('shells', {
        sweep: [firstAzimuth, visibleTurn / shellSectors, shellSectors, 0],
      });
      pass.setPipeline(pipelines.shellLit);
      pass.setBindGroup(1, this.groupFor('shells', this.shells.buffer));
      pass.draw(6, this.shells.count * shellSectors);
    }
    // The base plane: the end of the computed region (translucent).
    if (this.baseTriangles !== null && g !== null) {
      this.writeDraw('base', {
        colour: [0.42, 0.45, 0.52, 1],
        look: [1, 0, 0, 0],
        extra: [1, 0.1, 0, 0],
      });
      pass.setPipeline(pipelines.slice);
      pass.setBindGroup(1, this.groupFor('base', null));
      pass.setVertexBuffer(0, this.baseTriangles.buffer);
      pass.draw(this.baseTriangles.count);
    }
    // The field on the slice.
    if (L.slice && this.sliceTriangles !== null) {
      // Nearly opaque alone; translucent over the other layers.
      const alone = !L.streamlines && !L.isosurfaces;
      this.writeDraw('slice', {
        look: [alone ? 1 : 0.85, 0, 0, 0],
        extra: [1, alone ? 0.9 : 0.36, 0, 1],
      });
      pass.setPipeline(pipelines.slice);
      pass.setBindGroup(1, this.groupFor('slice', null));
      pass.setVertexBuffer(0, this.sliceTriangles.buffer);
      pass.draw(this.sliceTriangles.count);
    }
    const visible = L.cutaway ? 2 * Math.PI - CUT_WIDTH : 2 * Math.PI;
    const start = L.cutaway ? this.cutStart + CUT_WIDTH : 0;
    const sectors = Math.round(
      ((draft ? DRAFT_SHELL_SECTORS : SHELL_SECTORS) * visible) / (2 * Math.PI),
    );
    const shellSweep: [number, number, number, number] = [start, visible / sectors, sectors, 0];
    if (L.isosurfaces && !L.solidShells && this.shells !== null) {
      this.writeDraw('shells', { look: [0.035, 0.42, 2.6, 0], sweep: shellSweep });
      pass.setPipeline(pipelines.shell);
      pass.setBindGroup(1, this.groupFor('shells', this.shells.buffer));
      pass.draw(6, this.shells.count * sectors);
    }
    if (L.shock && this.shock !== null) {
      this.writeDraw('shock', { look: [0.035, 0.55, 3.0, 0.6], sweep: shellSweep });
      pass.setPipeline(pipelines.shell);
      pass.setBindGroup(1, this.groupFor('shock', this.shock.buffer));
      pass.draw(6, this.shock.count * sectors);
    }
    pass.setPipeline(pipelines.line);
    const azimuths = draft ? DRAFT_STREAMLINE_AZIMUTHS : STREAMLINE_AZIMUTHS;
    if (L.streamlines && this.streamlines !== null) {
      this.writeDraw('streamlines', {
        look: [0.9, 0, 0, 0],
        sweep: [this.cutStart + Math.PI / azimuths, (2 * Math.PI) / azimuths, azimuths, 0],
        extra: [1.3 * px, 1, 1, 1],
      });
      pass.setBindGroup(1, this.groupFor('streamlines', this.streamlines.buffer));
      pass.draw(6, this.streamlines.count * azimuths);
    }
    if (L.streamlines && this.freeLines !== null) {
      this.writeDraw('freeLines', {
        look: [0.3, 0, 0, 0],
        sweep: [this.cutStart + Math.PI / azimuths, (2 * Math.PI) / azimuths, azimuths, 0],
        extra: [1.0 * px, 1, 1, 1],
      });
      pass.setBindGroup(1, this.groupFor('freeLines', this.freeLines.buffer));
      pass.draw(6, this.freeLines.count * azimuths);
    }
    if (L.isosurfaces && L.cutaway && this.cutLines !== null) {
      this.writeDraw('cutLines', {
        look: [1.0, 0, 0, 0],
        sweep: [this.cutStart, CUT_WIDTH, 2, 0],
        extra: [1.4 * px, 1, 0, 1],
      });
      pass.setBindGroup(1, this.groupFor('cutLines', this.cutLines.buffer));
      pass.draw(6, this.cutLines.count * 2);
    }
    if (L.slice && this.sliceMode === 'cutaway' && L.cutaway && this.outline !== null) {
      this.writeDraw('outline', {
        colour: [0.8, 0.82, 0.86, 1],
        look: [0.7, 0, 0, 0],
        sweep: [this.cutStart, CUT_WIDTH, 2, 0],
        extra: [1.1 * px, 1, 0, 1],
      });
      pass.setBindGroup(1, this.groupFor('outline', this.outline.buffer));
      pass.draw(6, this.outline.count * 2);
    }
    if (L.body === 'wireframe' && this.wire !== null) {
      this.writeDraw('wire', {
        colour: [0.75, 0.77, 0.8, 1],
        look: [0.8, 0, 0, 0],
        extra: [1 * px, 1, 0, 0],
      });
      pass.setBindGroup(1, this.groupFor('wire', this.wire.buffer));
      pass.draw(6, this.wire.count);
    }
    if (this.hatch !== null && g !== null) {
      this.writeDraw('hatch', {
        colour: [0.5, 0.53, 0.6, 1],
        look: [0.55, 0, 0, 0],
        extra: [1 * px, 1, 0, 0],
      });
      pass.setBindGroup(1, this.groupFor('hatch', this.hatch.buffer));
      pass.draw(6, this.hatch.count);
    }
    if (L.box && this.box !== null) {
      this.writeDraw('box', {
        colour: [0.62, 0.64, 0.68, 1],
        look: [0.8, 0, 0, 0],
        extra: [1 * px, 1, 0, 0],
      });
      pass.setBindGroup(1, this.groupFor('box', this.box.buffer));
      pass.draw(6, this.box.count);
    }
    // Text over the scene.
    if (L.overlay || L.help) {
      pass.setPipeline(pipelines.sprite);
      const w = this.canvas.width;
      const h = this.canvas.height;
      const margin = Math.round(14 * px);
      const place = (sprite: Sprite | undefined, x: number, y: number) => {
        if (sprite === undefined) return;
        const data = new Float32Array(16);
        data.set([Math.round(x), Math.round(y), sprite.width, sprite.height], 8);
        this.device.queue.writeBuffer(sprite.uniform, 0, data);
        pass.setBindGroup(1, sprite.bindGroup);
        pass.draw(6);
      };
      const s = this.sprites;
      if (L.overlay) {
        place(s.corner, margin, margin);
        if (s.legend !== undefined) place(s.legend, margin, h - margin - s.legend.height);
        if (s.notes !== undefined)
          place(s.notes, w - margin - s.notes.width, h - margin - s.notes.height);
        if (s.base !== undefined && region !== null) {
          // In the base plane, half way out to its corner on the viewer's side.
          const anchor: Vec3 = [region.xMax, 0.5 * region.rMax, 0.5 * region.rMax];
          const c = transform(viewProj, anchor);
          if (c[3] > 0) {
            const sx = (0.5 + (0.5 * c[0]) / c[3]) * w;
            const sy = (0.5 - (0.5 * c[1]) / c[3]) * h;
            place(
              s.base,
              Math.min(Math.max(sx - s.base.width / 2, 0), w - s.base.width - margin),
              Math.min(Math.max(sy - s.base.height / 2, margin), h - s.base.height - margin),
            );
          }
        }
      }
      if (L.help && s.help !== undefined)
        place(s.help, (w - s.help.width) / 2, (h - s.help.height) / 2);
    }
    pass.end();
    // When the queue has done the work before this frame, and this frame.
    const reached = this.device.queue.onSubmittedWorkDone().then(() => performance.now());
    const submitted = performance.now();
    this.device.queue.submit([encoder.finish()]);
    const done = this.device.queue.onSubmittedWorkDone().then(() => performance.now());
    this.framesDrawn += 1;
    if (into === undefined) await this.presenter.present();
    const [tReached, tDone] = await Promise.all([reached, done]);
    const cost = submitted - started + (tDone - Math.max(tReached, submitted));
    if (!draft) this.lastFullFrameMs = cost;
    this.lastFrameMs = cost;
    return cost;
  }

  // ---------------------------------------------------------------- text

  private sprite(canvas: Canvas2D, old: Sprite | undefined): Sprite {
    old?.texture.destroy();
    old?.uniform.destroy();
    const texture = this.device.createTexture({
      size: [canvas.width, canvas.height],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.device.queue.copyExternalImageToTexture(
      { source: canvas },
      { texture, premultipliedAlpha: true },
      [canvas.width, canvas.height],
    );
    const uniform = this.device.createBuffer({
      size: DRAW_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const bindGroup = this.device.createBindGroup({
      layout: this.pipelines.spriteLayout,
      entries: [
        { binding: 0, resource: { buffer: uniform } },
        { binding: 1, resource: texture.createView() },
        { binding: 2, resource: this.sampler },
      ],
    });
    return { texture, bindGroup, uniform, width: canvas.width, height: canvas.height };
  }

  private rebuildOverlay(): void {
    this.overlayDirty = false;
    const px = Math.round(12.5 * this.pixelRatio);
    const s = this.sprites;
    const field = this.field;
    const g = this.geometry;
    const lines: { text: string; colour?: string; bold?: boolean }[] = [];
    if (this.status.caption !== undefined) lines.push({ text: this.status.caption, bold: true });
    if (field !== null) {
      const steps = this.status.steps;
      const conv =
        this.status.converged === true
          ? ', converged'
          : this.status.converged === false
            ? ', converging'
            : '';
      lines.push({
        text: `${field.ni} x ${field.nj} grid${steps !== undefined ? `, ${steps.toLocaleString('en')} steps` : ''}${conv}`,
      });
      const m =
        Math.hypot(field.freeStream.u, field.freeStream.v) /
        Math.sqrt((field.gamma * field.freeStream.p) / field.freeStream.rho);
      lines.push({ text: `Mach ${m.toFixed(2)}, zero incidence, axisymmetric Euler` });
      if (this.status.cellRate !== undefined) {
        lines.push({ text: `${(this.status.cellRate / 1e6).toFixed(1)} M cell updates/s` });
      }
    }
    s.corner =
      lines.length > 0 ? this.sprite(textBlock(lines, px, { backing: true }), s.corner) : undefined;
    s.legend =
      g !== null
        ? this.sprite(
            legend(g.scale, g.range, this.layers.isosurfaces ? g.levels : [], px),
            s.legend,
          )
        : undefined;
    const notes = [
      { text: 'The airflow shown is around the body; the fins\u2019 drag is computed separately.' },
      { text: 'Behind the base: not simulated.' },
    ];
    s.notes = this.sprite(
      textBlock(notes, Math.round(px * 0.92), { align: 'right', backing: true }),
      s.notes,
    );
    s.base =
      g !== null
        ? this.sprite(
            textBlock(
              [{ text: 'base: flow behind it not simulated', colour: 'rgba(190, 196, 208, 0.95)' }],
              Math.round(px * 0.92),
            ),
            s.base,
          )
        : undefined;
    s.help = this.layers.help
      ? this.sprite(textBlock(helpLines(this, g?.scale), px, { panel: true }), s.help)
      : undefined;
  }

  // ---------------------------------------------------------------- live

  private scheduleLive(delay: number): void {
    if (!this.live || this.destroyed || this.liveTimer !== null) return;
    this.liveTimer = setTimeout(() => {
      this.liveTimer = null;
      void this.liveFrame();
    }, delay);
  }

  /**
   * One live frame: the flow read back (which waits for the solver's batch
   * of steps in the queue), drawn, and the next frame put off so that
   * drawing takes at most `liveDuty` of the time (by the frame's own cost,
   * not the solver's work it waited behind); one frame in flight.
   */
  private async liveFrame(): Promise<void> {
    await this.readSource();
    await this.render();
    const cost = this.lastFrameMs;
    this.scheduleLive(Math.max(1000 / MAX_LIVE_FPS, (cost * (1 - this.liveDuty)) / this.liveDuty));
  }

  /** Read the source's state and grid back into a field (a few kilobytes); once at a time. */
  private readSource(): Promise<void> {
    if (this.reading !== null) return this.reading;
    const source = this.source;
    if (source === null) return Promise.resolve();
    this.reading = this.readFrom(source).finally(() => {
      this.reading = null;
    });
    return this.reading;
  }

  private async readFrom(source: FlowSource): Promise<void> {
    const { ni, nj } = source;
    const device = this.device;
    const gather = await (this.gatherPipeline ??= device.createComputePipelineAsync({
      label: '3D gather flow',
      layout: 'auto',
      compute: {
        module: await compileShader(device, '3D gather flow', gatherWgsl),
        entryPoint: 'gather',
      },
    }));
    if (this.source !== source) return;
    const usage = GPUBufferUsage;
    const stateBytes = 16 * ni * nj;
    const nodeBytes = 8 * (ni + 1) * (nj + 1);
    const params = device.createBuffer({ size: 16, usage: usage.UNIFORM | usage.COPY_DST });
    const nodes = source.nodes;
    device.queue.writeBuffer(
      params,
      0,
      new Uint32Array([ni, nj, nodes.kind === 'lines' ? 1 : 0, 0]),
    );
    const stateOut = device.createBuffer({
      size: stateBytes,
      usage: usage.STORAGE | usage.COPY_SRC,
    });
    const nodesOut = device.createBuffer({
      size: nodeBytes,
      usage: usage.STORAGE | usage.COPY_SRC,
    });
    const dummy = device.createBuffer({ size: 16, usage: usage.STORAGE });
    const stateRead = device.createBuffer({
      size: stateBytes,
      usage: usage.MAP_READ | usage.COPY_DST,
    });
    const nodesRead = device.createBuffer({
      size: nodeBytes,
      usage: usage.MAP_READ | usage.COPY_DST,
    });
    const group = device.createBindGroup({
      layout: gather.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: params } },
        { binding: 1, resource: { buffer: source.state() } },
        { binding: 2, resource: { buffer: nodes.kind === 'lines' ? nodes.lines : dummy } },
        { binding: 3, resource: { buffer: nodes.kind === 'lines' ? nodes.fractions : dummy } },
        { binding: 4, resource: { buffer: nodes.kind === 'lines' ? nodes.heights : dummy } },
        { binding: 5, resource: { buffer: nodes.kind === 'placed' ? nodes.buffer : dummy } },
        { binding: 6, resource: { buffer: stateOut } },
        { binding: 7, resource: { buffer: nodesOut } },
      ],
    });
    const encoder = device.createCommandEncoder({ label: '3D read flow' });
    const pass = encoder.beginComputePass();
    pass.setPipeline(gather);
    pass.setBindGroup(0, group);
    pass.dispatchWorkgroups(Math.ceil(Math.max(ni * nj, (ni + 1) * (nj + 1)) / 64));
    pass.end();
    encoder.copyBufferToBuffer(stateOut, 0, stateRead, 0, stateBytes);
    encoder.copyBufferToBuffer(nodesOut, 0, nodesRead, 0, nodeBytes);
    device.queue.submit([encoder.finish()]);
    try {
      await Promise.all([stateRead.mapAsync(GPUMapMode.READ), nodesRead.mapAsync(GPUMapMode.READ)]);
      const state = new Float32Array(stateRead.getMappedRange().slice(0));
      const placed = new Float32Array(nodesRead.getMappedRange().slice(0));
      if (this.source !== source) return;
      const x = new Float64Array((ni + 1) * (nj + 1));
      const r = new Float64Array((ni + 1) * (nj + 1));
      for (let k = 0; k < x.length; k++) {
        x[k] = placed[2 * k]!;
        r[k] = placed[2 * k + 1]!;
      }
      this.setField(fieldFromConserved(ni, nj, x, r, state, source.gamma, source.freeStream));
    } finally {
      for (const b of [params, stateOut, nodesOut, dummy, stateRead, nodesRead]) b.destroy();
    }
  }

  // ---------------------------------------------------------------- output

  /** The frame as pixels (RGBA), drawn offscreen at the canvas's size. */
  async pixels(): Promise<ImageData> {
    while (this.drawing !== null) await this.drawing;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const stride = bytesPerRow(width);
    const copy = this.device.createTexture({
      size: [width, height],
      format: this.presenter.format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });
    const drawing = this.drawFrame(copy).then(() => undefined);
    this.drawing = drawing;
    try {
      await drawing;
    } finally {
      this.drawing = null;
    }
    const original = this.presenter;
    const buffer = this.device.createBuffer({
      size: stride * height,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    const encoder = this.device.createCommandEncoder();
    encoder.copyTextureToBuffer({ texture: copy }, { buffer, bytesPerRow: stride }, [
      width,
      height,
    ]);
    this.device.queue.submit([encoder.finish()]);
    await buffer.mapAsync(GPUMapMode.READ);
    const rows = new Uint8Array(buffer.getMappedRange());
    const image = new ImageData(width, height);
    const bgra = original.format === 'bgra8unorm';
    for (let y = 0; y < height; y++) {
      const row = rows.subarray(y * stride, y * stride + 4 * width);
      if (bgra) {
        for (let x = 0; x < width; x++) {
          image.data[4 * (y * width + x)] = row[4 * x + 2]!;
          image.data[4 * (y * width + x) + 1] = row[4 * x + 1]!;
          image.data[4 * (y * width + x) + 2] = row[4 * x]!;
          image.data[4 * (y * width + x) + 3] = 255;
        }
      } else {
        image.data.set(row, 4 * width * y);
      }
    }
    buffer.unmap();
    buffer.destroy();
    copy.destroy();
    return image;
  }

  /**
   * The frame as a PNG, with the scene's own text (readout, legend, notes)
   * drawn in whatever the overlay layer's setting, and `caption` (the case)
   * as its first line if given.
   */
  async pngBlob(caption?: string): Promise<Blob> {
    const saved = { layers: this.layers, status: this.status };
    this.layers = { ...this.layers, overlay: true };
    if (caption !== undefined) this.status = { ...this.status, caption };
    this.overlayDirty = true;
    let image: ImageData;
    try {
      image = await this.pixels();
    } finally {
      this.layers = saved.layers;
      this.status = saved.status;
      this.overlayDirty = true;
    }
    const c = new OffscreenCanvas(image.width, image.height);
    c.getContext('2d')!.putImageData(image, 0, 0);
    return c.convertToBlob({ type: 'image/png' });
  }

  private destroyBody(): void {
    if (this.bodyBuffers !== null) {
      const b = this.bodyBuffers;
      for (const x of [b.position, b.normal, b.part, b.index]) x.destroy();
      this.bodyBuffers = null;
    }
    this.wire?.buffer.destroy();
    this.wire = null;
  }

  destroy(): void {
    this.destroyed = true;
    this.setLive(false);
    this.destroyBody();
    for (const s of [
      this.shells,
      this.shock,
      this.streamlines,
      this.freeLines,
      this.cutLines,
      this.outline,
      this.box,
      this.hatch,
    ])
      s?.buffer.destroy();
    this.sliceTriangles?.buffer.destroy();
    this.baseTriangles?.buffer.destroy();
    for (const d of this.draws.values()) d.uniform.destroy();
    for (const s of Object.values(this.sprites)) {
      s?.texture.destroy();
      s?.uniform.destroy();
    }
    this.frameBuffer.destroy();
    this.paletteBuffer.destroy();
    this.msaa?.destroy();
    this.depth?.destroy();
    this.presenter.destroy();
  }
}

/** The shock's line up to x = xEnd (the base), with the axis below its ends. */
function clipOutline(
  line: { x: number[]; r: number[] },
  xEnd: number,
): { x: number[]; r: number[] } {
  const x: number[] = [line.x[0]!];
  const r: number[] = [0];
  for (let k = 0; k < line.x.length && line.x[k]! <= xEnd; k++) {
    x.push(line.x[k]!);
    r.push(line.r[k]!);
  }
  x.push(xEnd);
  r.push(r[r.length - 1]!);
  return { x, r };
}

function concat(
  a: Float32Array<ArrayBuffer>,
  b: Float32Array<ArrayBuffer>,
): Float32Array<ArrayBuffer> {
  const out = new Float32Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

/**
 * The free stream in the half-planes at these azimuths: from the shock to
 * the box's edge (r = rMax) and ahead of the shock, at the free stream's
 * value, as triangles (x, y, z, value).
 */
function freeStreamPlane(g: FlowGeometry, phis: readonly number[]): Float32Array<ArrayBuffer> {
  const { x, r } = g.shock;
  const { xMin, xMax, rMax } = g.bounds;
  const v = g.scale.freeValue;
  const quads: [number, number][][] = [];
  // Ahead of the shock's first point.
  if (x[0]! > xMin) {
    quads.push([
      [xMin, 0],
      [x[0]!, 0],
      [x[0]!, rMax],
      [xMin, rMax],
    ]);
  }
  for (let k = 0; k + 1 < x.length && x[k]! < xMax; k++) {
    const x1 = Math.min(x[k + 1]!, xMax);
    quads.push([
      [x[k]!, Math.min(r[k]!, rMax)],
      [x1, Math.min(r[k + 1]!, rMax)],
      [x1, rMax],
      [x[k]!, rMax],
    ]);
  }
  const out = new Float32Array(phis.length * quads.length * 6 * 4);
  let o = 0;
  for (const phi of phis) {
    const c = Math.cos(phi);
    const sn = Math.sin(phi);
    for (const q of quads) {
      for (const k of [0, 1, 2, 0, 2, 3]) {
        const [px, pr] = q[k]!;
        out.set([px, pr * c, pr * sn, v], o);
        o += 4;
      }
    }
  }
  return out;
}

/** The free stream across the axis at x: a ring from the shock's radius there to the box's. */
function freeStreamDisc(g: FlowGeometry, x: number, sectors: number): Float32Array<ArrayBuffer> {
  const inner = shockRadiusAt(g.shock, x);
  const outer = g.bounds.rMax;
  if (!(outer > inner)) return new Float32Array(0);
  const v = g.scale.freeValue;
  const out = new Float32Array(sectors * 6 * 4);
  let o = 0;
  for (let s = 0; s < sectors; s++) {
    const a0 = (2 * Math.PI * s) / sectors;
    const a1 = (2 * Math.PI * (s + 1)) / sectors;
    const p = (r: number, a: number) => [x, r * Math.cos(a), r * Math.sin(a), v];
    for (const q of [
      p(inner, a0),
      p(outer, a0),
      p(outer, a1),
      p(inner, a0),
      p(outer, a1),
      p(inner, a1),
    ]) {
      out.set(q, o);
      o += 4;
    }
  }
  return out;
}

/** Two triangles (x, y, z, value) of the square [-h, h]^2 in the plane at x. */
function squareAt(x: number, h: number, value: number): Float32Array<ArrayBuffer> {
  const corner = (y: number, z: number) => [x, y, z, value];
  return new Float32Array([
    ...corner(-h, -h),
    ...corner(h, -h),
    ...corner(h, h),
    ...corner(-h, -h),
    ...corner(h, h),
    ...corner(-h, h),
  ]);
}

/** The cutaway's first azimuth: the fin nearest azimuth 0, so that fins lie on its faces. */
function cutStartFor(rocket: Rocket | null): number {
  const fins = rocket?.fins;
  if (fins === undefined || fins.count < 1) return 0;
  const step = (2 * Math.PI) / fins.count;
  const roll = fins.roll ?? 0;
  return roll + step * Math.round(-roll / step);
}

/** A region and aspect, to the precision that changes the fitted view visibly. */
function regionKey(b: { xMin: number; xMax: number; rMax: number }, aspect: number): string {
  return [b.xMin, b.xMax, b.rMax, aspect].map((v) => v.toPrecision(3)).join(' ');
}

function sceneScale(g: FlowGeometry): SceneScale {
  return {
    quantity: g.scale.quantity,
    label: g.scale.label,
    unit: g.scale.unit,
    min: g.range.min,
    max: g.range.max,
    freeValue: g.scale.freeValue,
    levels: g.levels,
    colour: g.scale.palette,
  };
}

/** A streamline's computed part, and its free-stream parts (before the shock, or all of it outside). */
function splitStreamline(line: {
  x: number[];
  r: number[];
  value: number[];
  computed: boolean[];
}): {
  computed: { x: number[]; r: number[]; value: number[] };
  free: { x: number[]; r: number[]; value: number[]; brightness: number[] }[];
} {
  const pick = (want: boolean) => {
    const idx = line.computed.flatMap((c, k) => (c === want ? [k] : []));
    return {
      x: idx.map((k) => line.x[k]!),
      r: idx.map((k) => line.r[k]!),
      value: idx.map((k) => line.value[k]!),
    };
  };
  // The free stream's part fades in from its seed to the shock.
  const free = pick(false);
  const n = free.x.length;
  const brightness = free.x.map((_, k) => (n > 1 && k === 0 ? 0 : 1));
  return { computed: pick(true), free: [{ ...free, brightness }] };
}

/** Fewer points along a streamline where it runs straight (within a small turn and value change). */
function decimate(line: { x: number[]; r: number[]; value: number[] }): {
  x: number[];
  r: number[];
  value: number[];
} {
  const n = line.x.length;
  if (n <= 2) return line;
  const keep = [0];
  for (let k = 1; k < n - 1; k++) {
    const a = keep[keep.length - 1]!;
    const dx1 = line.x[k]! - line.x[a]!;
    const dr1 = line.r[k]! - line.r[a]!;
    const dx2 = line.x[k + 1]! - line.x[k]!;
    const dr2 = line.r[k + 1]! - line.r[k]!;
    const turn =
      Math.abs(dx1 * dr2 - dr1 * dx2) / (Math.hypot(dx1, dr1) * Math.hypot(dx2, dr2) || 1);
    const dv = Math.abs(line.value[k + 1]! - line.value[a]!);
    const span = Math.abs(line.value[a]!) + 1e-9;
    if (turn > 0.004 || dv / span > 0.004 || k - a >= 24) keep.push(k);
  }
  keep.push(n - 1);
  return {
    x: keep.map((k) => line.x[k]!),
    r: keep.map((k) => line.r[k]!),
    value: keep.map((k) => line.value[k]!),
  };
}

/** The rocket's wireframe: its profile at every 15 degrees, rings along it, the fins' outlines. */
function wireframe(rocket: Rocket): Float32Array<ArrayBuffer> {
  const body = rocket.body;
  const profile = noseProfile(body, 2e-3);
  const L = bodyLength(body);
  const R = body.nose.baseRadius;
  const xs = [...profile.x, L];
  const rs = [...profile.r, R];
  const pairs: [number[], number[]][] = [];
  const turns = 24;
  for (let a = 0; a < turns; a++) {
    const phi = (2 * Math.PI * a) / turns;
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    for (let k = 0; k + 1 < xs.length; k++) {
      pairs.push([
        [xs[k]!, rs[k]! * c, rs[k]! * s],
        [xs[k + 1]!, rs[k + 1]! * c, rs[k + 1]! * s],
      ]);
    }
    // The base's spokes.
    pairs.push([
      [L, R * c, R * s],
      [L, 0, 0],
    ]);
  }
  const rings = 40;
  for (let q = 1; q <= rings; q++) {
    const x = (L * q) / rings;
    const r = x < body.nose.length ? (profile.r[profile.x.findIndex((v) => v >= x)] ?? R) : R;
    for (let a = 0; a < 96; a++) {
      const p0 = (2 * Math.PI * a) / 96;
      const p1 = (2 * Math.PI * (a + 1)) / 96;
      pairs.push([
        [x, r * Math.cos(p0), r * Math.sin(p0)],
        [x, r * Math.cos(p1), r * Math.sin(p1)],
      ]);
    }
  }
  const fins = rocket.fins;
  if (fins !== undefined) {
    const p = fins.planform;
    for (let k = 0; k < fins.count; k++) {
      const place = finPlacement(body, fins, k);
      const er = [Math.cos(place.phi), Math.sin(place.phi)];
      const at = (x: number, r: number) => [x, r * er[0]!, r * er[1]!];
      const le0 = place.rootLeading;
      const te0 = le0 + p.rootChord;
      const le1 = le0 + p.span * p.tanLeadingEdge;
      const te1 = le0 + p.rootChord + p.span * p.tanTrailingEdge;
      const r0 = place.rootRadius;
      const r1 = place.tipRadius;
      pairs.push(
        [at(le0, r0), at(le1, r1)],
        [at(le1, r1), at(te1, r1)],
        [at(te1, r1), at(te0, r0)],
      );
    }
  }
  return segments3d(pairs);
}

/** The help (key H): the keys, the colour scale and its units, the simulation. */
function helpLines(
  scene: FlowScene3D,
  scale: QuantityScale | undefined,
): { text: string; bold?: boolean; colour?: string }[] {
  const L = scene.getLayers();
  const on = (b: boolean) => (b ? 'on' : 'off');
  const unit = scale === undefined ? '' : scale.unit === '' ? '' : ` (${scale.unit})`;
  return [
    { text: 'bowshock 3D view: keys', bold: true },
    { text: `1  rocket: solid, wireframe or off (now ${L.body})` },
    { text: `2  field on a slice (now ${on(L.slice)}, ${scene.getSlice()})` },
    { text: `3  streamlines (now ${on(L.streamlines)})` },
    {
      text: `4  iso-surfaces of the colour quantity: glowing, solid, off (now ${L.isosurfaces ? (L.solidShells ? 'solid' : 'glowing') : 'off'})`,
    },
    { text: `5  bow shock (now ${on(L.shock)})    6  cutaway (now ${on(L.cutaway)})` },
    { text: `Z  colour: ${scale?.label ?? ''}${unit}` },
    { text: 'T  slice: cutaway faces, plane through the axis, plane across it' },
    { text: 'Q / E  move the slice    0  reset the view    H  this help' },
    { text: 'drag: orbit    right drag or shift drag: pan    wheel or pinch: zoom' },
    { text: 'arrows: orbit    shift arrows: pan    + / -: zoom' },
    { text: '' },
    { text: 'What is drawn', bold: true },
    { text: 'The flow is the axisymmetric Euler solution around the body at zero' },
    { text: 'incidence, from the body to the fitted bow shock, revolved about the axis' },
    { text: '(exact: every meridional plane holds the same flow). Outside the shock' },
    { text: 'the flow is the undisturbed free stream. FluidX3D draws Q-criterion' },
    { text: 'iso-surfaces (vortices); this smooth inviscid flow has no vortices, so the' },
    { text: 'iso-surfaces here are of the quantity coloured (Mach number by default).' },
    { text: 'Not computed: the fins’ flow (fins are geometry; their drag comes from' },
    { text: 'correlations), the base and wake, boundary layers, turbulence.' },
  ];
}
