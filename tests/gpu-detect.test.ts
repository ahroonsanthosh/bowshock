import { describe, expect, it } from 'vitest';
import { detectGpu, RELEVANT_LIMITS, type GpuEntryPoint } from '../src/gpu/detect';

function fakeAdapter(): GPUAdapter {
  const limits = Object.fromEntries(RELEVANT_LIMITS.map((name, i) => [name, 1000 + i]));
  return {
    limits,
    features: new Set(['timestamp-query', 'subgroups']),
    info: { vendor: 'acme', architecture: 'rdna', description: '' },
  } as unknown as GPUAdapter;
}

describe('detectGpu', () => {
  it('reports unavailable when the browser has no WebGPU', async () => {
    const result = await detectGpu(undefined);
    expect(result.kind).toBe('unavailable');
  });

  it('reports unavailable when no adapter is returned', async () => {
    const gpu: GpuEntryPoint = { requestAdapter: () => Promise.resolve(null) };
    const result = await detectGpu(gpu);
    expect(result.kind).toBe('unavailable');
  });

  it('reports unavailable, with the cause, when requesting an adapter throws', async () => {
    const gpu: GpuEntryPoint = { requestAdapter: () => Promise.reject(new Error('boom')) };
    const result = await detectGpu(gpu);
    expect(result).toEqual({
      kind: 'unavailable',
      reason: 'Requesting a GPU adapter failed: Error: boom',
    });
  });

  it('copies limits, sorts features and describes the adapter', async () => {
    const gpu: GpuEntryPoint = { requestAdapter: () => Promise.resolve(fakeAdapter()) };
    const result = await detectGpu(gpu);
    if (result.kind !== 'webgpu') throw new Error('expected webgpu');
    expect(result.adapterDescription).toBe('acme / rdna');
    expect(result.features).toEqual(['subgroups', 'timestamp-query']);
    expect(result.limits.maxBufferSize).toBe(1000);
  });
});
