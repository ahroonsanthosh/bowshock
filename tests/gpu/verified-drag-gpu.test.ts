import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { gpuEngine } from '../../src/analysis/gpu-engine';
import { verifiedForebodyDrag } from '../../src/analysis/verified-drag';
import type { Body } from '../../src/geometry/body';
import { requireDevice } from './device';

let device: GPUDevice;
beforeAll(async () => {
  device = await requireDevice();
});
afterAll(() => {
  device.destroy();
});

describe('verified forebody drag on the GPU engine', () => {
  it('matches the CPU engine level by level on a cone (within 2e-6 relative)', async () => {
    const cone: Body = {
      nose: {
        shape: { kind: 'conical' },
        length: 0.5 / Math.tan((20 * Math.PI) / 180),
        baseRadius: 0.5,
      },
      cylinderLength: 4,
    };
    // CPU engine on the same grids, measured when written.
    const cpu = [0.283263704066, 0.283554287806];
    const result = await verifiedForebodyDrag(
      cone,
      {
        mach: 3,
        gamma: 1.4,
        tolerance: 1e-4,
        maxRefinement: 2,
        noise: 1e-6,
        floor: 2e-4,
        orderTolerance: 0.5,
      },
      gpuEngine(device),
    );
    expect(result.kind).toBe('solved');
    if (result.kind !== 'solved') return;
    expect(result.reports.map((r) => r.refinement)).toEqual([1, 2]);
    result.reports.forEach((r, k) => {
      expect(Math.abs(r.drag / cpu[k]! - 1)).toBeLessThan(2e-6);
    });
  }, 1_800_000);
});
