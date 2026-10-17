/**
 * Pieces shared by the GPU engines: shader compilation with readable
 * errors, buffer ownership, and the one-operation-at-a-time guard.
 */

/** A grid too large for the device's limits: buffer sizes, or workgroups in one dispatch. */
export class GpuMemoryLimitError extends RangeError {}

/** Work the GPU did not do: rejected by validation, out of memory, or the device lost. */
export class GpuExecutionError extends Error {}

/**
 * Throws GpuMemoryLimitError if one invocation per item, in workgroups of
 * `size` along one dimension, needs more workgroups than the device
 * allows: such a dispatch fails validation, which throws nothing in
 * JavaScript, and none of the work in its command buffer runs.
 */
export function checkDispatchSize(
  device: GPUDevice,
  items: number,
  size: number,
  what: string,
): void {
  const groups = Math.ceil(items / size);
  const limit = device.limits.maxComputeWorkgroupsPerDimension;
  if (groups > limit) {
    throw new GpuMemoryLimitError(
      `${what} needs ${groups} workgroups in one dispatch, more than this GPU allows (${limit})`,
    );
  }
}

/**
 * Runs `create` and turns the device errors raised during it (out of
 * memory, validation), which WebGPU reports only through error scopes,
 * into exceptions, destroying what was created. `create` is synchronous
 * and both scopes are popped before anything is awaited, so no other
 * work on the device can run inside them.
 */
export async function withDeviceErrors<T>(
  device: GPUDevice,
  what: string,
  create: () => T,
  destroy: (created: T) => void,
): Promise<T> {
  device.pushErrorScope('out-of-memory');
  device.pushErrorScope('validation');
  let popped: Promise<[GPUError | null, GPUError | null]>;
  let created: T;
  try {
    created = create();
  } finally {
    popped = Promise.all([device.popErrorScope(), device.popErrorScope()]);
  }
  const [invalid, memory] = await popped;
  if (memory !== null) {
    destroy(created);
    throw new GpuMemoryLimitError(`${what}: the GPU ran out of memory (${memory.message})`);
  }
  if (invalid !== null) {
    destroy(created);
    throw new GpuExecutionError(`${what}: ${invalid.message}`);
  }
  return created;
}

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
