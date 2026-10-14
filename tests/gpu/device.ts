/** Shared helper for GPU tests: one device per test file. */
export async function requireDevice(): Promise<GPUDevice> {
  if (!('gpu' in navigator)) {
    throw new Error('navigator.gpu missing: is the browser launched with WebGPU enabled?');
  }
  const adapter = await navigator.gpu.requestAdapter();
  if (adapter === null) throw new Error('No WebGPU adapter available');
  return adapter.requestDevice();
}
