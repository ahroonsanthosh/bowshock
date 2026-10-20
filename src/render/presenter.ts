/**
 * Ways of getting rendered frames onto a page.
 *
 * Normally WebGPU draws straight into a canvas (CanvasPresenter). Some
 * environments can run WebGPU compute but lose the device when presenting
 * to a canvas (for example headless browsers on software rendering); there
 * CopyPresenter renders into an offscreen texture and copies the pixels to
 * a 2D canvas. It is slower, but works wherever compute works.
 */

export interface Presenter {
  /** Texture format the renderer must draw in. */
  readonly format: GPUTextureFormat;
  /** Texture to draw the next frame into. */
  frameTexture(): GPUTexture;
  /** Show the frame drawn into frameTexture(). */
  present(): Promise<void>;
  destroy(): void;
}

export class CanvasPresenter implements Presenter {
  readonly format: GPUTextureFormat;
  private readonly context: GPUCanvasContext;

  constructor(device: GPUDevice, canvas: HTMLCanvasElement) {
    const context = canvas.getContext('webgpu');
    if (context === null) throw new Error('the canvas has no WebGPU context');
    this.context = context;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format: this.format, alphaMode: 'opaque' });
  }

  frameTexture(): GPUTexture {
    return this.context.getCurrentTexture();
  }

  present(): Promise<void> {
    // The browser presents the current texture after the task completes.
    return Promise.resolve();
  }

  destroy(): void {
    this.context.unconfigure();
  }
}

export class CopyPresenter implements Presenter {
  readonly format = 'rgba8unorm';
  private texture: GPUTexture | null = null;
  private readback: GPUBuffer | null = null;
  private readonly context: CanvasRenderingContext2D;
  /** Frames being copied to the page; their buffers must outlive a resize. */
  private inFlight = 0;
  private retired: { destroy(): void }[] = [];

  constructor(
    private readonly device: GPUDevice,
    private readonly canvas: HTMLCanvasElement,
  ) {
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('the canvas has no 2D context');
    this.context = context;
  }

  frameTexture(): GPUTexture {
    const { width, height } = this.canvas;
    if (this.texture?.width !== width || this.texture.height !== height) {
      // A frame still being copied keeps using the old texture and buffer.
      this.retire(this.texture);
      this.retire(this.readback);
      this.texture = this.device.createTexture({
        size: [width, height],
        format: this.format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
      });
      this.readback = this.device.createBuffer({
        size: bytesPerRow(width) * height,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      });
    }
    return this.texture;
  }

  async present(): Promise<void> {
    const texture = this.texture;
    const readback = this.readback;
    if (texture === null || readback === null) return;
    this.inFlight += 1;
    try {
      const image = this.context.createImageData(texture.width, texture.height);
      await readPixels(this.device, texture, readback, image);
      this.context.putImageData(image, 0, 0);
    } finally {
      this.inFlight -= 1;
      if (this.inFlight === 0) this.destroyRetired();
    }
  }

  destroy(): void {
    this.retire(this.texture);
    this.retire(this.readback);
    this.texture = null;
    this.readback = null;
    if (this.inFlight === 0) this.destroyRetired();
  }

  private retire(resource: { destroy(): void } | null): void {
    if (resource === null) return;
    this.retired.push(resource);
    if (this.inFlight === 0) this.destroyRetired();
  }

  private destroyRetired(): void {
    for (const resource of this.retired) resource.destroy();
    this.retired = [];
  }
}

/** Texture-to-buffer copies need rows padded to 256 bytes. */
export function bytesPerRow(width: number): number {
  return Math.ceil((4 * width) / 256) * 256;
}

/**
 * Read an rgba8unorm texture into `image` (of the texture's size) through
 * `buffer` (MAP_READ | COPY_DST, at least bytesPerRow(width) * height).
 */
export async function readPixels(
  device: GPUDevice,
  texture: GPUTexture,
  buffer: GPUBuffer,
  image: ImageData,
): Promise<void> {
  const { width, height } = texture;
  const stride = bytesPerRow(width);
  const encoder = device.createCommandEncoder();
  encoder.copyTextureToBuffer({ texture }, { buffer, bytesPerRow: stride }, [width, height]);
  device.queue.submit([encoder.finish()]);
  await buffer.mapAsync(GPUMapMode.READ);
  const rows = new Uint8Array(buffer.getMappedRange());
  for (let y = 0; y < height; y++) {
    image.data.set(rows.subarray(y * stride, y * stride + 4 * width), 4 * width * y);
  }
  buffer.unmap();
}

/** What presentationFor needs to know of an adapter (GPUAdapter.info). */
export interface AdapterTraits {
  readonly vendor: string;
  readonly architecture: string;
  readonly description: string;
  readonly isFallbackAdapter?: boolean;
}

/**
 * How a page should show frames from this adapter: straight into a canvas,
 * or by copying them (CopyPresenter) on a software adapter, where
 * presenting to a canvas can lose the device (headless browsers on
 * SwiftShader). A page that solves and draws on one device cannot afford
 * to lose it: the solution would go with it.
 */
export function presentationFor(adapter: AdapterTraits): 'canvas' | 'copy' {
  const software =
    adapter.isFallbackAdapter === true ||
    /swiftshader|llvmpipe|lavapipe|software|warp/i.test(
      `${adapter.vendor} ${adapter.architecture} ${adapter.description}`,
    );
  return software ? 'copy' : 'canvas';
}
