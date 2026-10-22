/**
 * Pieces shared by the GPU engines: shader compilation with readable
 * errors, buffer ownership, and the one-operation-at-a-time guard.
 */

/** Compile WGSL, throwing with the compiler's messages if it fails. */
export async function compileShader(
  device: GPUDevice,
  label: string,
  code: string,
): Promise<GPUShaderModule> {
  const module = device.createShaderModule({ label, code });
  const info = await module.getCompilationInfo();
  const errors = info.messages.filter((m) => m.type === 'error');
  if (errors.length > 0) {
    throw new Error(
      `WGSL compilation of ${label} failed:\n` +
        errors.map((m) => `${m.lineNum}:${m.linePos} ${m.message}`).join('\n'),
    );
  }
  return module;
}

/** Creates buffers and remembers them so they can all be destroyed together. */
export class BufferSet {
  private readonly buffers: GPUBuffer[] = [];

  constructor(private readonly device: GPUDevice) {}

  create(label: string, size: number, usage: number): GPUBuffer {
    const buffer = this.device.createBuffer({ label, size, usage });
    this.buffers.push(buffer);
    return buffer;
  }

  /** Create a buffer initialised with `data`. */
  createWith(label: string, data: ArrayBufferView<ArrayBuffer>, usage: number): GPUBuffer {
    const buffer = this.create(label, data.byteLength, usage | GPUBufferUsage.COPY_DST);
    this.device.queue.writeBuffer(buffer, 0, data);
    return buffer;
  }

  destroyAll(): void {
    for (const b of this.buffers) b.destroy();
    this.buffers.length = 0;
  }
}

/**
 * Runs asynchronous operations one at a time. GPU engines share readback
 * buffers between operations, so overlapping calls would corrupt each
 * other; they throw instead.
 */
export class ExclusiveRunner {
  private busy = false;

  constructor(private readonly name: string) {}

  assertIdle(): void {
    if (this.busy) throw new Error(`${this.name}: await the previous operation first`);
  }

  async run<T>(operation: () => Promise<T>): Promise<T> {
    this.assertIdle();
    this.busy = true;
    try {
      return await operation();
    } finally {
      this.busy = false;
    }
  }
}

/** Read `size` bytes of a MAP_READ buffer after copying `source` into it. */
export async function readBuffer(
  device: GPUDevice,
  source: GPUBuffer,
  readback: GPUBuffer,
  size: number,
): Promise<ArrayBuffer> {
  const encoder = device.createCommandEncoder();
  encoder.copyBufferToBuffer(source, 0, readback, 0, size);
  device.queue.submit([encoder.finish()]);
  await readback.mapAsync(GPUMapMode.READ, 0, size);
  const bytes = readback.getMappedRange(0, size).slice(0);
  readback.unmap();
  return bytes;
}
