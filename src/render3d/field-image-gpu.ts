/**
 * The field's images on the GPU (./field-image.ts, shaders/field-image.wgsl):
 * the meridional field rasterised into a texture the 3D view's shaders
 * sample (the cut faces, the sheets' fibres), and the fibres along the
 * flow (line integral convolution) computed from it once per field.
 */

import { compileShader } from '../engine-gpu/gpu-common';
import { IMAGE_VERTEX_FLOATS, streakNoise, whiteNoise, type FieldImageMesh } from './field-image';
import imageWgsl from './shaders/field-image.wgsl?raw';

const FIELD_FORMAT: GPUTextureFormat = 'rgba16float';
const LIC_FORMAT: GPUTextureFormat = 'r8unorm';
/** The sheets' streak texture: square, and its streaks this many texels long. */
const STREAK_SIZE = 256;
const STREAK_LENGTH = 40;

export class FieldImage {
  /** Changes whenever the textures are made anew (a bind group holding them is then stale). */
  version = 0;
  field: GPUTexture;
  lic: GPUTexture;
  readonly streak: GPUTexture;
  private noise: GPUTexture | null = null;
  private readonly params: GPUBuffer;

  private constructor(
    private readonly device: GPUDevice,
    private readonly raster: GPURenderPipeline,
    private readonly licPipeline: GPURenderPipeline,
    private readonly sampler: GPUSampler,
  ) {
    this.field = this.texture(1, 1, FIELD_FORMAT, 'field image');
    this.lic = this.texture(1, 1, LIC_FORMAT, 'fibres');
    // An empty field: outside everywhere.
    device.queue.writeTexture(
      { texture: this.field },
      new Uint16Array([0, 0, 0, 0xbc00]),
      { bytesPerRow: 8 },
      [1, 1],
    );
    this.streak = device.createTexture({
      label: '3D streaks',
      size: [STREAK_SIZE, STREAK_SIZE],
      format: 'r8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    device.queue.writeTexture(
      { texture: this.streak },
      streakNoise(STREAK_SIZE, STREAK_LENGTH, 7),
      { bytesPerRow: STREAK_SIZE },
      [STREAK_SIZE, STREAK_SIZE],
    );
    this.params = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  static async create(device: GPUDevice): Promise<FieldImage> {
    const module = await compileShader(device, '3D field image', imageWgsl);
    const [raster, licPipeline] = await Promise.all([
      device.createRenderPipelineAsync({
        label: '3D field image',
        layout: 'auto',
        vertex: {
          module,
          entryPoint: 'image_vs',
          buffers: [
            {
              arrayStride: 4 * IMAGE_VERTEX_FLOATS,
              attributes: [
                { shaderLocation: 0, offset: 0, format: 'float32x2' },
                { shaderLocation: 1, offset: 8, format: 'float32x2' },
                { shaderLocation: 2, offset: 16, format: 'float32' },
                { shaderLocation: 3, offset: 20, format: 'float32' },
              ],
            },
          ],
        },
        fragment: { module, entryPoint: 'image_fs', targets: [{ format: FIELD_FORMAT }] },
        primitive: { topology: 'triangle-list', cullMode: 'none' },
      }),
      device.createRenderPipelineAsync({
        label: '3D fibres',
        layout: 'auto',
        vertex: { module, entryPoint: 'lic_vs' },
        fragment: { module, entryPoint: 'lic_fs', targets: [{ format: LIC_FORMAT }] },
        primitive: { topology: 'triangle-list' },
      }),
    ]);
    const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
    return new FieldImage(device, raster, licPipeline, sampler);
  }

  private texture(w: number, h: number, format: GPUTextureFormat, label: string): GPUTexture {
    return this.device.createTexture({
      label: `3D ${label}`,
      size: [w, h],
      format,
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.COPY_DST,
    });
  }

  /**
   * Draw the field's image at width x height texels and its fibres
   * (`steps` each way along the flow, of `stepLength` texels, over a
   * carrier of grains `grain` texels across).
   */
  update(
    mesh: FieldImageMesh,
    width: number,
    height: number,
    steps: number,
    stepLength = 0.8,
    grain = 1,
    /** Whether the fibres are wanted (the slice shows them): else only the field's image. */
    fibres = true,
  ): void {
    const device = this.device;
    if (this.field.width !== width || this.field.height !== height) {
      this.field.destroy();
      this.lic.destroy();
      this.noise?.destroy();
      this.field = this.texture(width, height, FIELD_FORMAT, 'field image');
      this.lic = this.texture(width, height, LIC_FORMAT, 'fibres');
      this.noise = device.createTexture({
        label: '3D fibres noise',
        size: [width, height],
        format: 'r8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
      });
      const row = Math.ceil(width / 256) * 256;
      const white = whiteNoise(row * height, 3);
      device.queue.writeTexture({ texture: this.noise }, white, { bytesPerRow: row }, [
        width,
        height,
      ]);
      this.version += 1;
    }
    const vertices = device.createBuffer({
      size: mesh.vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertices, 0, mesh.vertices);
    const indices = device.createBuffer({
      size: Math.max(mesh.indices.byteLength, 16),
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(indices, 0, mesh.indices);
    device.queue.writeBuffer(this.params, 0, new Float32Array([steps, stepLength, 0.9, grain]));
    const encoder = device.createCommandEncoder({ label: '3D field image' });
    const raster = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.field.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: -1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });
    raster.setPipeline(this.raster);
    raster.setVertexBuffer(0, vertices);
    raster.setIndexBuffer(indices, 'uint32');
    raster.drawIndexed(mesh.indices.length);
    raster.end();
    if (!fibres) {
      device.queue.submit([encoder.finish()]);
      vertices.destroy();
      indices.destroy();
      return;
    }
    const group = device.createBindGroup({
      layout: this.licPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.field.createView() },
        { binding: 1, resource: this.noise!.createView() },
        { binding: 2, resource: this.sampler },
        { binding: 3, resource: { buffer: this.params } },
      ],
    });
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.lic.createView(),
          clearValue: { r: 0.5, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });
    pass.setPipeline(this.licPipeline);
    pass.setBindGroup(0, group);
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);
    vertices.destroy();
    indices.destroy();
  }

  destroy(): void {
    this.field.destroy();
    this.lic.destroy();
    this.noise?.destroy();
    this.streak.destroy();
    this.params.destroy();
  }
}
