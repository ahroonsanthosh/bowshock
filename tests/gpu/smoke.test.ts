import { describe, expect, it } from 'vitest';
import { requireDevice } from './device';
import { evaluateWgsl } from './wgsl-harness';

describe('WebGPU compute smoke test', () => {
  it('runs a compute shader and reads the result back', async () => {
    const device = await requireDevice();
    try {
      const inputs = Array.from({ length: 1000 }, (_, i) => [i * 0.5]);
      const outputs = await evaluateWgsl(device, '', 'vec4f(2.0 * x[0] + 1.0)', inputs);
      // 2x + 1 is exact in f32 for these inputs, so equality is the right check.
      outputs.forEach((out, i) => {
        expect(out[0]).toBe(2 * (i * 0.5) + 1);
      });
    } finally {
      device.destroy();
    }
  });
});
