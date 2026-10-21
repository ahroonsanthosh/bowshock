/**
 * Renders a display field of a 2D solution with WebGPU, straight from the
 * solver's state buffer: the field is computed on the grid nodes
 * (fields.wgsl) and the grid drawn as smoothly shaded triangles
 * (render.wgsl). Nothing is copied back to the CPU.
 */

import gasWgsl from '../engine-gpu/shaders/gas.wgsl?raw';
import { BufferSet, compileShader } from '../engine-gpu/gpu-common';
import type { StructuredGrid } from '../grid/structured';
import { colormapTable, hexToRgb, SCHLIEREN_DARK, SCHLIEREN_LIGHT } from './colormap';
import { DISPLAY_FIELD_CODES, type DisplayField } from './fields';
import fieldsWgsl from './shaders/fields.wgsl?raw';
import renderWgsl from './shaders/render.wgsl?raw';

const WORKGROUP_SIZE = 64;

export interface RenderOptions {
  readonly field: DisplayField;
  readonly gamma: number;
  /** Schlieren contrast k in exp(-k g / g_max); about 10 to 15 shows weak waves. */
  readonly schlierenContrast: number;
  /**
   * Schlieren dark on light (white where the density is uniform, the
   * default) or light on dark (SCHLIEREN_DARK where it is uniform, towards
   * SCHLIEREN_LIGHT at the steepest gradients; the same shade inverted).
   */
  readonly schlierenStyle?: 'dark-on-light' | 'light-on-dark';
  /**
   * Light on dark only: the gradient's fraction of its largest is raised
   * to this power before shading (default 1). Above 1, the steepest
   * gradients (the shock) stay bright and its smeared flanks dim: a
   * thinner line, the same values.
   */
  readonly schlierenExponent?: number;
}

/** A rectangle of a texture, in pixels from its top left corner. */
export interface PixelArea {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Size of the RenderParams struct of render.wgsl. */
const RENDER_PARAMS_BYTES = 80;

export class FieldRenderer {
  private readonly buffers: BufferSet;
  private readonly fieldParams: GPUBuffer;
  private readonly renderParams: GPUBuffer;
  private readonly cellValues: GPUBuffer;
  private readonly nodeValues: GPUBuffer;
  private readonly range: GPUBuffer;
  private readonly fieldBindGroups = new Map<GPUBuffer, GPUBindGroup>();
  private readonly renderBindGroup: GPUBindGroup;
  private readonly nodes: GPUBuffer;
  private readonly nNodePartials: number;
  private readonly rangeReadback: GPUBuffer;

  /** `format` is the format of the textures that render() will draw into. */
  static async create(
    device: GPUDevice,
    format: GPUTextureFormat,
    grid: StructuredGrid,
  ): Promise<FieldRenderer> {
    const fieldsModule = await compileShader(device, 'fields', [gasWgsl, fieldsWgsl].join('\n'));
    const renderModule = await compileShader(device, 'render', renderWgsl);
    const entries = [
      'cell_values',
      'node_average',
      'cell_gradient',
      'range_partials',
      'finalize_range',
    ] as const;
    const fieldLayout = device.createBindGroupLayout({
      label: 'fields',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      ],
    });
    const fieldPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [fieldLayout] });
    const compute = await Promise.all(
      entries.map((entryPoint) =>
        device.createComputePipelineAsync({
          label: entryPoint,
          layout: fieldPipelineLayout,
          compute: { module: fieldsModule, entryPoint },
        }),
      ),
    );
    const render = await device.createRenderPipelineAsync({
      label: 'field render',
      layout: 'auto',
      vertex: { module: renderModule, entryPoint: 'vs_main' },
      fragment: { module: renderModule, entryPoint: 'fs_main', targets: [{ format }] },
      primitive: { topology: 'triangle-list' },
    });
    return new FieldRenderer(
      device,
      grid,
      fieldLayout,
      Object.fromEntries(entries.map((name, k) => [name, compute[k]!])) as Record<
        (typeof entries)[number],
        GPUComputePipeline
      >,
      render,
    );
  }

  private constructor(
    private readonly device: GPUDevice,
    private readonly grid: StructuredGrid,
    private readonly fieldLayout: GPUBindGroupLayout,
    private readonly compute: Record<
      'cell_values' | 'node_average' | 'cell_gradient' | 'range_partials' | 'finalize_range',
      GPUComputePipeline
    >,
    private readonly renderPipeline: GPURenderPipeline,
  ) {
    const { ni, nj } = grid;
    const nNodes = (ni + 1) * (nj + 1);
    this.nNodePartials = Math.ceil(nNodes / WORKGROUP_SIZE);
    const usage = GPUBufferUsage;
    this.buffers = new BufferSet(device);
    const b = this.buffers;
    this.nodes = b.createWith('nodes', packNodes(grid), usage.STORAGE);
    this.fieldParams = b.create('field params', 32, usage.UNIFORM | usage.COPY_DST);
    this.renderParams = b.create(
      'render params',
      RENDER_PARAMS_BYTES,
      usage.UNIFORM | usage.COPY_DST,
    );
    this.cellValues = b.create('cell values', 4 * ni * nj, usage.STORAGE);
    this.nodeValues = b.create('node values', 4 * nNodes, usage.STORAGE | usage.COPY_SRC);
    this.range = b.create('range', 8 * (1 + this.nNodePartials), usage.STORAGE | usage.COPY_SRC);
    this.rangeReadback = b.create('range readback', 8, usage.MAP_READ | usage.COPY_DST);
    const colormap = b.createWith('colormap', colormapTable(256), usage.STORAGE);
    this.renderBindGroup = device.createBindGroup({
      label: 'field render',
      layout: renderPipeline.getBindGroupLayout(0),
      entries: [this.renderParams, this.nodes, this.nodeValues, this.range, colormap].map(
        (buffer, binding) => ({ binding, resource: { buffer } }),
      ),
    });
  }

  /** Buffer of node values from the last call to computeField (for tests). */
  get nodeValueBuffer(): GPUBuffer {
    return this.nodeValues;
  }

  /** Compute the node values of a field from a state buffer of (rho, rho u, rho v, E) per cell. */
  computeField(encoder: GPUCommandEncoder, state: GPUBuffer, options: RenderOptions): void {
    const { ni, nj } = this.grid;
    const params = new ArrayBuffer(32);
    new Uint32Array(params, 0, 4).set([
      ni,
      nj,
      DISPLAY_FIELD_CODES[options.field],
      this.nNodePartials,
    ]);
    new Float32Array(params, 16, 1).set([options.gamma]);
    this.device.queue.writeBuffer(this.fieldParams, 0, params);

    const cellGroups = Math.ceil((ni * nj) / WORKGROUP_SIZE);
    const pass = encoder.beginComputePass({ label: 'display field' });
    pass.setBindGroup(0, this.fieldBindGroup(state));
    pass.setPipeline(this.compute.cell_values);
    pass.dispatchWorkgroups(cellGroups);
    pass.setPipeline(this.compute.node_average);
    pass.dispatchWorkgroups(this.nNodePartials);
    if (options.field === 'schlieren') {
      pass.setPipeline(this.compute.cell_gradient);
      pass.dispatchWorkgroups(cellGroups);
      pass.setPipeline(this.compute.node_average);
      pass.dispatchWorkgroups(this.nNodePartials);
    }
    pass.setPipeline(this.compute.range_partials);
    pass.dispatchWorkgroups(this.nNodePartials);
    pass.setPipeline(this.compute.finalize_range);
    pass.dispatchWorkgroups(1);
    pass.end();
  }

  /**
   * Compute a field and draw it into `target` (for example a canvas's
   * current texture), fitting the domain with its aspect ratio kept into
   * `area` (by default the whole texture, which is cleared to `background`
   * in either case).
   */
  render(
    target: GPUTexture,
    state: GPUBuffer,
    options: RenderOptions,
    background: GPUColor,
    area: PixelArea = { x: 0, y: 0, width: target.width, height: target.height },
  ): void {
    const { scale, offset } = fitToViewport(this.grid, area.width, area.height);
    const params = new ArrayBuffer(RENDER_PARAMS_BYTES);
    new Uint32Array(params, 0, 4).set([
      this.grid.ni,
      this.grid.nj,
      DISPLAY_FIELD_CODES[options.field],
      options.schlierenStyle === 'light-on-dark' ? 1 : 0,
    ]);
    new Float32Array(params, 16, 6).set([
      ...scale,
      ...offset,
      options.schlierenContrast,
      options.schlierenExponent ?? 1,
    ]);
    new Float32Array(params, 48, 8).set([
      ...hexToRgb(SCHLIEREN_DARK),
      1,
      ...hexToRgb(SCHLIEREN_LIGHT),
      1,
    ]);
    this.device.queue.writeBuffer(this.renderParams, 0, params);

    const encoder = this.device.createCommandEncoder({ label: 'render field' });
    this.computeField(encoder, state, options);
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        { view: target.createView(), loadOp: 'clear', storeOp: 'store', clearValue: background },
      ],
    });
    pass.setViewport(area.x, area.y, area.width, area.height, 0, 1);
    pass.setPipeline(this.renderPipeline);
    pass.setBindGroup(0, this.renderBindGroup);
    pass.draw(6 * this.grid.ni * this.grid.nj);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  /** Minimum and maximum of the field drawn by the last render (for a colour legend). */
  async readRange(): Promise<{ min: number; max: number }> {
    const encoder = this.device.createCommandEncoder();
    encoder.copyBufferToBuffer(this.range, 0, this.rangeReadback, 0, 8);
    this.device.queue.submit([encoder.finish()]);
    await this.rangeReadback.mapAsync(GPUMapMode.READ);
    const [min, max] = new Float32Array(this.rangeReadback.getMappedRange().slice(0));
    this.rangeReadback.unmap();
    return { min: min!, max: max! };
  }

  destroy(): void {
    this.buffers.destroyAll();
  }

  private fieldBindGroup(state: GPUBuffer): GPUBindGroup {
    let group = this.fieldBindGroups.get(state);
    if (group === undefined) {
      group = this.device.createBindGroup({
        label: 'fields',
        layout: this.fieldLayout,
        entries: [
          this.fieldParams,
          this.nodes,
          state,
          this.cellValues,
          this.nodeValues,
          this.range,
        ].map((buffer, binding) => ({ binding, resource: { buffer } })),
      });
      this.fieldBindGroups.set(state, group);
    }
    return group;
  }
}

/** Node positions as vec2f, node (i, j) at index i + j * (ni + 1). */
function packNodes(grid: StructuredGrid): Float32Array<ArrayBuffer> {
  const data = new Float32Array(2 * grid.x.length);
  for (let n = 0; n < grid.x.length; n++) data.set([grid.x[n]!, grid.y[n]!], 2 * n);
  return data;
}

/**
 * Where the domain point (x, y) is drawn by render() into `area`, in
 * pixels of the target: for drawing over the field (a wall, grid lines)
 * with the same fit.
 */
export function domainToPixels(
  grid: StructuredGrid,
  area: PixelArea,
): (x: number, y: number) => [number, number] {
  const { scale, offset } = fitToViewport(grid, area.width, area.height);
  return (x, y) => [
    area.x + 0.5 * (x * scale[0] + offset[0] + 1) * area.width,
    area.y + 0.5 * (1 - (y * scale[1] + offset[1])) * area.height,
  ];
}

/**
 * Scale and offset taking node positions to clip space so that the grid's
 * bounding box fills the viewport with its aspect ratio kept (and a small
 * margin), centred.
 */
export function fitToViewport(
  grid: StructuredGrid,
  width: number,
  height: number,
): { scale: [number, number]; offset: [number, number] } {
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let n = 0; n < grid.x.length; n++) {
    xMin = Math.min(xMin, grid.x[n]!);
    xMax = Math.max(xMax, grid.x[n]!);
    yMin = Math.min(yMin, grid.y[n]!);
    yMax = Math.max(yMax, grid.y[n]!);
  }
  const margin = 0.98;
  // Clip space spans 2 units in each direction; one domain unit maps to
  // `pixelsPerUnit` pixels in both directions.
  const pixelsPerUnit = margin * Math.min(width / (xMax - xMin), height / (yMax - yMin));
  const sx = (2 * pixelsPerUnit) / width;
  const sy = (2 * pixelsPerUnit) / height;
  return {
    scale: [sx, sy],
    offset: [-sx * 0.5 * (xMin + xMax), -sy * 0.5 * (yMin + yMax)],
  };
}
