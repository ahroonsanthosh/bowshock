/**
 * Draws a 2D or axisymmetric flow straight from a GPU solver's buffers,
 * as it converges: nothing is read back to draw a frame. The fields of
 * src/render/flow-fields.ts are computed per cell on the GPU
 * (shaders/flow-fields.wgsl) and drawn on the dual mesh of the cell
 * centres (shaders/flow-draw.wgsl), so the value drawn at a cell's centre
 * is the solver's value in that cell. An axisymmetric flow is drawn
 * mirrored about the axis, the body as a solid, with grid lines and the
 * fitted shock as a line on request.
 *
 * The grid is the moving grid of a fitted shock: its nodes are placed on
 * the GPU each frame from the line grid's own buffers
 * (src/engine-gpu/line-grid.ts).
 */

import gasWgsl from '../engine-gpu/shaders/gas.wgsl?raw';
import { BufferSet, compileShader } from '../engine-gpu/gpu-common';
import type { Primitive2D } from '../scheme/flux';
import { colormapTable, hexToRgb, SCHLIEREN_DARK, SCHLIEREN_LIGHT } from './colormap';
import { FLOW_FIELD_CODES, type FlowField } from './flow-fields';
import flowDrawWgsl from './shaders/flow-draw.wgsl?raw';
import flowFieldsWgsl from './shaders/flow-fields.wgsl?raw';
import { clipTransform, type Bounds, type View } from './view';

const WORKGROUP_SIZE = 64;
const FLOW_PARAMS_BYTES = 64;
const DRAW_PARAMS_BYTES = 112;
const LINE_PARAMS_BYTES = 32;
/** What a probe reads where no field is drawn. */
const NOTHING_DRAWN = -3e38;

/** Where the grid's nodes come from. */
export type FlowNodes =
  /** Already placed in a GPU buffer, as vec2f, node (i, j) at i + j (ni + 1). */
  | { readonly kind: 'placed'; readonly buffer: GPUBuffer }
  | {
      readonly kind: 'lines';
      /** The line grid's buffers (GpuLineGrid.nodeBuffers). */
      readonly lines: GPUBuffer;
      readonly fractions: GPUBuffer;
      readonly heights: GPUBuffer;
    };

/** A flow to draw: a solver's state on its grid. */
export interface FlowSource {
  readonly ni: number;
  readonly nj: number;
  /** As the solver uses it. */
  readonly gamma: number;
  readonly freeStream: Primitive2D;
  /** Axisymmetric: drawn mirrored about the axis (y = 0). */
  readonly mirror: boolean;
  /** Whether the grid's jMax boundary is a fitted shock (S draws it). */
  readonly fittedShock: boolean;
  readonly nodes: FlowNodes;
  /** The buffer holding the current solution, (rho, rho u, rho v, E) per cell. */
  state(): GPUBuffer;
  /** The domain's extent as last known on the CPU, for fitting the view (the upper half). */
  bounds(): Bounds;
}

export interface FlowDrawOptions {
  readonly view: View;
  /** The field shown; in the split view, the one below the axis. */
  readonly field: FlowField;
  /** Schlieren above the axis, `field` below. */
  readonly split: boolean;
  readonly grid: boolean;
  /** The fitted shock as a line. */
  readonly shock: boolean;
  /** Schlieren's brightness 1 - exp(-k g) for the gradient g (schlierenBrightness). */
  readonly schlierenContrast: number;
  /** The length that makes schlieren's gradient dimensionless (the body's radius). */
  readonly lengthScale: number;
  /** Draw every stride-th grid line. */
  readonly gridStride: number;
  readonly background: GPUColor;
}

/** The colours of what is drawn over the field, as RGBA from 0 to 1. */
const COLOURS = {
  grid: [1, 1, 1, 0.16],
  shock: [0.95, 0.96, 0.98, 0.92],
  body: [...hexToRgb('#2a3039'), 1],
  bodyEdge: [...hexToRgb('#7d8796'), 1],
} as const;

/** The pipelines, compiled once per device and target format. */
class FlowPipelines {
  constructor(
    readonly computeLayout: GPUBindGroupLayout,
    readonly drawLayout: GPUBindGroupLayout,
    readonly lineLayout: GPUBindGroupLayout,
    readonly compute: Record<
      'flow_nodes' | 'flow_cell_values' | 'flow_range_partials' | 'flow_finalize_range',
      GPUComputePipeline
    >,
    readonly drawModule: GPUShaderModule,
    readonly drawPipelineLayout: GPUPipelineLayout,
    private readonly device: GPUDevice,
  ) {}

  private readonly byFormat = new Map<string, Promise<DrawPipelines>>();
  private readonly ready = new Map<string, DrawPipelines>();

  static async create(device: GPUDevice): Promise<FlowPipelines> {
    const computeModule = await compileShader(
      device,
      'flow fields',
      [gasWgsl, flowFieldsWgsl].join('\n'),
    );
    const drawModule = await compileShader(device, 'flow draw', flowDrawWgsl);
    const entry = (
      binding: number,
      visibility: number,
      type: GPUBufferBindingType,
    ): GPUBindGroupLayoutEntry => ({ binding, visibility, buffer: { type } });
    const C = GPUShaderStage.COMPUTE;
    const computeLayout = device.createBindGroupLayout({
      label: 'flow fields',
      entries: [
        entry(0, C, 'uniform'),
        entry(1, C, 'read-only-storage'),
        entry(2, C, 'storage'),
        entry(3, C, 'storage'),
        entry(4, C, 'storage'),
        entry(5, C, 'read-only-storage'),
        entry(6, C, 'read-only-storage'),
        entry(7, C, 'read-only-storage'),
      ],
    });
    const VF = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;
    const drawLayout = device.createBindGroupLayout({
      label: 'flow draw',
      entries: [
        entry(0, VF, 'uniform'),
        entry(1, GPUShaderStage.VERTEX, 'read-only-storage'),
        entry(2, GPUShaderStage.VERTEX, 'read-only-storage'),
        entry(3, GPUShaderStage.FRAGMENT, 'read-only-storage'),
        entry(4, GPUShaderStage.FRAGMENT, 'read-only-storage'),
      ],
    });
    const lineLayout = device.createBindGroupLayout({
      label: 'flow lines',
      entries: [entry(0, VF, 'uniform'), entry(1, GPUShaderStage.VERTEX, 'read-only-storage')],
    });
    const computePipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [computeLayout],
    });
    const names = [
      'flow_nodes',
      'flow_cell_values',
      'flow_range_partials',
      'flow_finalize_range',
    ] as const;
    const pipelines = await Promise.all(
      names.map((entryPoint) =>
        device.createComputePipelineAsync({
          label: entryPoint,
          layout: computePipelineLayout,
          compute: { module: computeModule, entryPoint },
        }),
      ),
    );
    return new FlowPipelines(
      computeLayout,
      drawLayout,
      lineLayout,
      Object.fromEntries(names.map((n, k) => [n, pipelines[k]!])) as FlowPipelines['compute'],
      drawModule,
      device.createPipelineLayout({ bindGroupLayouts: [drawLayout, lineLayout] }),
      device,
    );
  }

  /** Make the render pipelines for a target format (once). */
  prepare(format: GPUTextureFormat): Promise<DrawPipelines> {
    let pipelines = this.byFormat.get(format);
    if (pipelines === undefined) {
      pipelines = this.makeDraw(format).then((made) => {
        this.ready.set(format, made);
        return made;
      });
      this.byFormat.set(format, pipelines);
    }
    return pipelines;
  }

  /** The render pipelines for a target format, made by prepare(). */
  draw(format: GPUTextureFormat): DrawPipelines {
    const pipelines = this.ready.get(format);
    if (pipelines === undefined) throw new Error(`prepare the flow view for ${format} first`);
    return pipelines;
  }

  private async makeDraw(format: GPUTextureFormat): Promise<DrawPipelines> {
    const blend: GPUBlendState = {
      color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
      alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
    };
    const make = (
      label: string,
      vertex: string,
      fragment: string,
      topology: GPUPrimitiveTopology,
      blended: boolean,
      targetFormat: GPUTextureFormat = format,
    ) =>
      this.device.createRenderPipelineAsync({
        label,
        layout: this.drawPipelineLayout,
        vertex: { module: this.drawModule, entryPoint: vertex },
        fragment: {
          module: this.drawModule,
          entryPoint: fragment,
          targets: [{ format: targetFormat, ...(blended ? { blend } : {}) }],
        },
        primitive: { topology },
      });
    const [field, probe, grid, body, line] = await Promise.all([
      make('flow field', 'vs_field', 'fs_field', 'triangle-list', false),
      make('flow probe', 'vs_field', 'fs_probe', 'triangle-list', false, 'r32float'),
      make('flow grid', 'vs_grid', 'fs_grid', 'line-list', true),
      make('flow body', 'vs_body', 'fs_body', 'triangle-strip', false),
      make('flow line', 'vs_line', 'fs_line', 'triangle-list', true),
    ]);
    return { field, probe, grid, body, line };
  }
}

interface DrawPipelines {
  readonly field: GPURenderPipeline;
  readonly probe: GPURenderPipeline;
  readonly grid: GPURenderPipeline;
  readonly body: GPURenderPipeline;
  readonly line: GPURenderPipeline;
}

/** The buffers of one source (one grid size). */
interface SourceResources {
  readonly source: FlowSource;
  readonly buffers: BufferSet;
  readonly nodes: GPUBuffer;
  readonly values: GPUBuffer;
  readonly range: GPUBuffer;
  readonly nPartials: number;
  readonly flowParams: GPUBuffer;
  readonly drawGroup: GPUBindGroup;
  readonly shockGroup: GPUBindGroup;
  readonly shockParams: GPUBuffer;
  /** Compute bind groups by the state buffer bound. */
  readonly computeGroups: Map<GPUBuffer, GPUBindGroup>;
  /** The slots whose fields and ranges have been computed at least once. */
  readonly computed: Set<number>;
}

export class FlowRenderer {
  private resources: SourceResources | null = null;
  private readonly buffers: BufferSet;
  private readonly drawParams: GPUBuffer;
  private readonly colormap: GPUBuffer;
  private readonly rangeReadback: GPUBuffer;
  private readonly placeholder: GPUBuffer;
  private body: {
    readonly points: GPUBuffer;
    readonly count: number;
    readonly fill: GPUBindGroup;
    readonly edge: GPUBindGroup;
  } | null = null;
  private readonly bodyBuffers: BufferSet;
  private mapping = false;

  /** A renderer able to draw into textures of `format`, and of rgba8unorm (for PNGs). */
  static async create(device: GPUDevice, format: GPUTextureFormat): Promise<FlowRenderer> {
    const pipelines = await FlowPipelines.create(device);
    await Promise.all([pipelines.prepare(format), pipelines.prepare('rgba8unorm')]);
    return new FlowRenderer(device, pipelines);
  }

  private constructor(
    private readonly device: GPUDevice,
    private readonly pipelines: FlowPipelines,
  ) {
    const usage = GPUBufferUsage;
    this.buffers = new BufferSet(device);
    this.bodyBuffers = new BufferSet(device);
    this.drawParams = this.buffers.create(
      'flow draw params',
      DRAW_PARAMS_BYTES,
      usage.UNIFORM | usage.COPY_DST,
    );
    this.colormap = this.buffers.createWith('colormap', colormapTable(256), usage.STORAGE);
    this.rangeReadback = this.buffers.create(
      'flow range readback',
      16,
      usage.MAP_READ | usage.COPY_DST,
    );
    this.placeholder = this.buffers.create('flow placeholder', 16, usage.STORAGE);
  }

  get source(): FlowSource | null {
    return this.resources?.source ?? null;
  }

  /** Draw this source from now on (null: none). Its buffers must outlive its use here. */
  setSource(source: FlowSource | null): void {
    this.resources?.buffers.destroyAll();
    this.resources = source === null ? null : this.allocate(source, new BufferSet(this.device));
  }

  /**
   * Keep drawing the current flow after its solver is released: its state
   * and its nodes as they are now are copied into buffers of the
   * renderer's own, on the GPU (nothing is read back). Call it before the
   * solver's buffers are destroyed.
   */
  freeze(): void {
    const r = this.resources;
    if (r === null) return;
    const { source } = r;
    const { ni, nj } = source;
    const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
    const owned = new BufferSet(this.device);
    const state = owned.create('frozen state', 16 * ni * nj, usage);
    const nodes = owned.create('frozen nodes', 8 * (ni + 1) * (nj + 1), usage);
    const encoder = this.device.createCommandEncoder({ label: 'freeze the flow' });
    if (source.nodes.kind === 'lines') {
      // Place the nodes at the latest heights.
      this.computeFields(encoder, r, { field: 'density', split: false, lengthScale: 1 });
    }
    encoder.copyBufferToBuffer(source.state(), 0, state, 0, state.size);
    encoder.copyBufferToBuffer(r.nodes, 0, nodes, 0, nodes.size);
    this.device.queue.submit([encoder.finish()]);
    const bounds = source.bounds();
    const frozen: FlowSource = {
      ni,
      nj,
      gamma: source.gamma,
      freeStream: source.freeStream,
      mirror: source.mirror,
      fittedShock: source.fittedShock,
      nodes: { kind: 'placed', buffer: nodes },
      state: () => state,
      bounds: () => bounds,
    };
    r.buffers.destroyAll();
    this.resources = this.allocate(frozen, owned);
  }

  /** The body's outline, (x, r) from the tip to the base, drawn as a solid mirrored about the axis. */
  setBody(outline: readonly (readonly [number, number])[] | null): void {
    this.bodyBuffers.destroyAll();
    this.body = null;
    if (outline === null || outline.length < 2) return;
    const usage = GPUBufferUsage;
    const points = this.bodyBuffers.createWith(
      'body outline',
      new Float32Array(outline.flatMap(([x, r]) => [x, r])),
      usage.STORAGE,
    );
    const group = (colour: readonly number[], width: number) => {
      const params = new ArrayBuffer(LINE_PARAMS_BYTES);
      new Uint32Array(params, 0, 2).set([0, outline.length]);
      new Float32Array(params, 8, 1).set([width]);
      new Float32Array(params, 16, 4).set(colour);
      const buffer = this.bodyBuffers.createWith(
        'body params',
        new Uint8Array(params),
        usage.UNIFORM,
      );
      return this.device.createBindGroup({
        layout: this.pipelines.lineLayout,
        entries: [buffer, points].map((b, binding) => ({ binding, resource: { buffer: b } })),
      });
    };
    this.body = {
      points,
      count: outline.length,
      fill: group(COLOURS.body, 0),
      edge: group(COLOURS.bodyEdge, 1.25 * (window.devicePixelRatio || 1)),
    };
  }

  /**
   * Draw the source into `target` (cleared to the background), computing
   * its fields from the solver's current state: no readback. The target's
   * format must have been prepared.
   */
  draw(target: GPUTexture, options: FlowDrawOptions): void {
    const pipelines = this.pipelines.draw(target.format);
    const encoder = this.device.createCommandEncoder({ label: 'flow view' });
    const r = this.resources;
    const slots = r === null ? null : this.computeFields(encoder, r, options);
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: target.createView(),
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: options.background,
        },
      ],
    });
    if (r !== null && slots !== null) {
      this.writeDrawParams(r, options, slots, target.width, target.height, options.view);
      const instances = r.source.mirror ? 2 : 1;
      const { ni, nj } = r.source;
      pass.setBindGroup(0, r.drawGroup);
      pass.setBindGroup(1, r.shockGroup);
      pass.setPipeline(pipelines.field);
      pass.draw(6 * (ni + 1) * (nj + 1), instances);
      if (this.body !== null) {
        pass.setBindGroup(1, this.body.fill);
        pass.setPipeline(pipelines.body);
        pass.draw(2 * this.body.count);
      }
      if (options.grid) {
        const stride = Math.max(1, Math.round(options.gridStride));
        const segments = (Math.floor(ni / stride) + 1) * nj + (Math.floor(nj / stride) + 1) * ni;
        pass.setPipeline(pipelines.grid);
        pass.draw(2 * segments, instances);
      }
      if (options.shock && r.source.fittedShock) {
        pass.setBindGroup(1, r.shockGroup);
        pass.setPipeline(pipelines.line);
        pass.draw(6 * ni, instances);
      }
      if (this.body !== null) {
        pass.setBindGroup(1, this.body.edge);
        pass.setPipeline(pipelines.line);
        pass.draw(6 * (this.body.count - 1), 2);
      }
    }
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  /**
   * The value drawn at each world point, as the field pass draws it: the
   * view centred on each point in turn, the field's own interpolated
   * value (not its colour) rendered into a pixel of a 32-bit float
   * target. NaN where nothing is drawn.
   */
  async probe(
    points: readonly (readonly [number, number])[],
    options: Omit<FlowDrawOptions, 'view' | 'background'>,
    /** Pixels per unit of length of the view centred on each point. */
    pixelsPerUnit = 1e4,
  ): Promise<number[]> {
    const r = this.resources;
    if (r === null) throw new Error('no flow to probe');
    const pipelines = this.pipelines.draw('rgba8unorm');
    const n = points.length;
    const texture = this.device.createTexture({
      size: [n, 1],
      format: 'r32float',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });
    const stride = Math.ceil((4 * n) / 256) * 256;
    const readback = this.device.createBuffer({
      size: stride,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    try {
      const fields = this.device.createCommandEncoder();
      const slots = this.computeFields(fields, r, options);
      this.device.queue.submit([fields.finish()]);
      for (let k = 0; k < n; k++) {
        const [x, y] = points[k]!;
        // A 1 x 1 viewport whose pixel centre is the point.
        this.writeDrawParams(r, options, slots, 1, 1, { cx: x, cy: y, ppu: pixelsPerUnit });
        const encoder = this.device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
          colorAttachments: [
            {
              view: texture.createView(),
              loadOp: k === 0 ? 'clear' : 'load',
              storeOp: 'store',
              clearValue: { r: NOTHING_DRAWN, g: 0, b: 0, a: 0 },
            },
          ],
        });
        pass.setViewport(k, 0, 1, 1, 0, 1);
        pass.setBindGroup(0, r.drawGroup);
        pass.setBindGroup(1, r.shockGroup);
        pass.setPipeline(pipelines.probe);
        pass.draw(6 * (r.source.ni + 1) * (r.source.nj + 1), r.source.mirror ? 2 : 1);
        pass.end();
        this.device.queue.submit([encoder.finish()]);
      }
      const copy = this.device.createCommandEncoder();
      copy.copyTextureToBuffer({ texture }, { buffer: readback, bytesPerRow: stride }, [n, 1]);
      this.device.queue.submit([copy.finish()]);
      await readback.mapAsync(GPUMapMode.READ);
      const values = Array.from(new Float32Array(readback.getMappedRange().slice(0, 4 * n)));
      readback.unmap();
      return values.map((v) => (v === Math.fround(NOTHING_DRAWN) ? Number.NaN : v));
    } finally {
      texture.destroy();
      readback.destroy();
    }
  }

  /**
   * The range (minimum, maximum) of a slot's field as last computed, for
   * the legend: 8 bytes, read at most a few times a second, never per
   * frame. Null if a read is already in flight or there is no source.
   */
  async readRange(slot: 0 | 1): Promise<{ min: number; max: number } | null> {
    const r = this.resources;
    // A source not yet drawn (just set, or just frozen) has no range yet.
    if (r === null || this.mapping || !r.computed.has(slot)) return null;
    this.mapping = true;
    try {
      const encoder = this.device.createCommandEncoder();
      encoder.copyBufferToBuffer(r.range, 8 * slot * (1 + r.nPartials), this.rangeReadback, 0, 8);
      this.device.queue.submit([encoder.finish()]);
      await this.rangeReadback.mapAsync(GPUMapMode.READ, 0, 8);
      const [min, max] = new Float32Array(this.rangeReadback.getMappedRange(0, 8).slice(0));
      this.rangeReadback.unmap();
      return { min: min!, max: max! };
    } finally {
      this.mapping = false;
    }
  }

  /** The node positions as last placed (for tests). */
  get nodeBuffer(): GPUBuffer | null {
    return this.resources?.nodes ?? null;
  }

  /** The cell values of the slots as last computed (for tests). */
  get valueBuffer(): GPUBuffer | null {
    return this.resources?.values ?? null;
  }

  destroy(): void {
    this.resources?.buffers.destroyAll();
    this.resources = null;
    this.bodyBuffers.destroyAll();
    this.body = null;
    this.buffers.destroyAll();
  }

  /** The buffers for a source, made in (and destroyed with) `buffers`. */
  private allocate(source: FlowSource, buffers: BufferSet): SourceResources {
    const { ni, nj } = source;
    const usage = GPUBufferUsage;
    const nCells = ni * nj;
    const nNodes = (ni + 1) * (nj + 1);
    const nPartials = Math.ceil(nCells / WORKGROUP_SIZE);
    const kind = source.nodes.kind;
    const nodes =
      kind === 'placed'
        ? source.nodes.buffer
        : buffers.create('flow nodes', 8 * nNodes, usage.STORAGE | usage.COPY_SRC);
    const values = buffers.create('flow values', 4 * 2 * nCells, usage.STORAGE | usage.COPY_SRC);
    const range = buffers.create(
      'flow range',
      8 * 2 * (1 + nPartials),
      usage.STORAGE | usage.COPY_SRC,
    );
    const flowParams = buffers.create(
      'flow params',
      FLOW_PARAMS_BYTES,
      usage.UNIFORM | usage.COPY_DST,
    );
    const shockParams = buffers.create(
      'shock line params',
      LINE_PARAMS_BYTES,
      usage.UNIFORM | usage.COPY_DST,
    );
    const params = new ArrayBuffer(LINE_PARAMS_BYTES);
    new Uint32Array(params, 0, 2).set([nj * (ni + 1), ni + 1]);
    new Float32Array(params, 8, 1).set([1.6 * (window.devicePixelRatio || 1)]);
    new Float32Array(params, 16, 4).set(COLOURS.shock);
    this.device.queue.writeBuffer(shockParams, 0, params);
    const bind = (layout: GPUBindGroupLayout, list: GPUBuffer[]) =>
      this.device.createBindGroup({
        layout,
        entries: list.map((buffer, binding) => ({ binding, resource: { buffer } })),
      });
    return {
      source,
      buffers,
      nodes,
      values,
      range,
      nPartials,
      flowParams,
      shockParams,
      drawGroup: bind(this.pipelines.drawLayout, [
        this.drawParams,
        nodes,
        values,
        range,
        this.colormap,
      ]),
      shockGroup: bind(this.pipelines.lineLayout, [shockParams, nodes]),
      computeGroups: new Map(),
      computed: new Set(),
    };
  }

  /** Encode the nodes (if they move), the fields of the slots and their ranges; the slots' fields. */
  private computeFields(
    encoder: GPUCommandEncoder,
    r: SourceResources,
    options: Pick<FlowDrawOptions, 'field' | 'split' | 'lengthScale'>,
  ): [FlowField, FlowField] {
    const { source } = r;
    const slots: [FlowField, FlowField] = options.split
      ? ['schlieren', options.field === 'schlieren' ? 'mach' : options.field]
      : [options.field, options.field];
    const count = options.split ? 2 : 1;
    const params = new ArrayBuffer(FLOW_PARAMS_BYTES);
    new Uint32Array(params, 0, 5).set([
      source.ni,
      source.nj,
      r.nPartials,
      FLOW_FIELD_CODES[slots[0]],
      FLOW_FIELD_CODES[slots[1]],
    ]);
    const w = source.freeStream;
    new Float32Array(params, 32, 6).set([w.rho, w.u, w.v, w.p, source.gamma, options.lengthScale]);
    this.device.queue.writeBuffer(r.flowParams, 0, params);

    const pass = encoder.beginComputePass({ label: 'flow fields' });
    pass.setBindGroup(0, this.computeGroup(r));
    if (source.nodes.kind === 'lines') {
      pass.setPipeline(this.pipelines.compute.flow_nodes);
      pass.dispatchWorkgroups(Math.ceil(((source.ni + 1) * (source.nj + 1)) / WORKGROUP_SIZE));
    }
    pass.setPipeline(this.pipelines.compute.flow_cell_values);
    pass.dispatchWorkgroups(r.nPartials, count);
    pass.setPipeline(this.pipelines.compute.flow_range_partials);
    pass.dispatchWorkgroups(r.nPartials, count);
    pass.setPipeline(this.pipelines.compute.flow_finalize_range);
    pass.dispatchWorkgroups(1, count);
    pass.end();
    for (let slot = 0; slot < count; slot++) r.computed.add(slot);
    return slots;
  }

  private computeGroup(r: SourceResources): GPUBindGroup {
    const state = r.source.state();
    let group = r.computeGroups.get(state);
    if (group === undefined) {
      const lines = r.source.nodes.kind === 'lines' ? r.source.nodes : null;
      group = this.device.createBindGroup({
        label: 'flow fields',
        layout: this.pipelines.computeLayout,
        entries: [
          r.flowParams,
          state,
          r.nodes,
          r.values,
          r.range,
          lines?.lines ?? this.placeholder,
          lines?.fractions ?? this.placeholder,
          lines?.heights ?? this.placeholder,
        ].map((buffer, binding) => ({ binding, resource: { buffer } })),
      });
      r.computeGroups.set(state, group);
    }
    return group;
  }

  private writeDrawParams(
    r: SourceResources,
    options: Pick<FlowDrawOptions, 'split' | 'schlierenContrast' | 'gridStride'>,
    slots: [FlowField, FlowField],
    width: number,
    height: number,
    view: View,
  ): void {
    const { scale, offset } = clipTransform(view, width, height);
    const params = new ArrayBuffer(DRAW_PARAMS_BYTES);
    const floats = new Float32Array(params);
    const words = new Uint32Array(params);
    floats.set([...scale, ...offset, width, height], 0);
    const lower = options.split ? 1 : 0;
    words.set(
      [
        r.source.ni,
        r.source.nj,
        FLOW_FIELD_CODES[slots[0]],
        FLOW_FIELD_CODES[slots[lower]],
        0,
        lower,
        r.nPartials,
        Math.max(1, Math.round(options.gridStride)),
      ],
      6,
    );
    floats[14] = options.schlierenContrast;
    floats.set([...hexToRgb(SCHLIEREN_DARK), 1, ...hexToRgb(SCHLIEREN_LIGHT), 1], 16);
    floats.set(COLOURS.grid, 24);
    this.device.queue.writeBuffer(this.drawParams, 0, params);
  }
}

/** Node positions as vec2f, node (i, j) at index i + j * (ni + 1). */
