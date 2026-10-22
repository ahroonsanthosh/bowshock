import { describe, expect, it } from 'vitest';
import { RESIDUAL_PRECISION, residualPrecision } from '../../src/analysis/gpu-transonic';
import { GpuPrecisionError } from '../../src/engine-gpu/gpu-common';
import { checkSelfTest, split } from '../../src/engine-gpu/euler2d-two-float';

/**
 * The two checks that refuse a GPU losing the low parts of two-float
 * numbers (design record 0013, step 4b; review of aed95b0, S5): the
 * self-test, once per device, and the residual against the CPU's, once
 * per solve. Their refusal paths, without a GPU.
 */

const a = 1 / 3;
const b = Math.PI / 7;

/** What a GPU keeping two-float arithmetic exact returns: each result as a high and a low part. */
function exactResults(): Float32Array {
  const [ah, al] = split(a);
  const [bh, bl] = split(b);
  const x = ah + al;
  const y = bh + bl;
  return new Float32Array([x + y, x * y, x / y, Math.sqrt(y)].flatMap((v) => split(v)));
}

describe('two-float precision checks', () => {
  it('the self-test passes a GPU whose results keep their low parts', () => {
    expect(() => {
      checkSelfTest(exactResults(), a, b);
    }).not.toThrow();
  });

  it('the self-test refuses a GPU that loses the low parts (GpuPrecisionError)', () => {
    for (let k = 0; k < 4; k++) {
      const lost = exactResults();
      lost[2 * k + 1] = 0;
      expect(() => {
        checkSelfTest(lost, a, b);
      }, `operation ${k}`).toThrow(GpuPrecisionError);
      expect(() => {
        checkSelfTest(lost, a, b);
      }).toThrow(/does not keep two-float arithmetic exact/);
    }
    const nan = exactResults();
    nan[0] = Number.NaN;
    expect(() => {
      checkSelfTest(nan, a, b);
    }).toThrow(GpuPrecisionError);
  });

  it('the residual check passes two-float differences and refuses 32-bit ones', () => {
    expect(RESIDUAL_PRECISION).toBe(1e-6);
    const n = 4000;
    const cpu = new Float64Array(n);
    for (let k = 0; k < n; k++) cpu[k] = 0.1 * Math.sin(k * 0.37);
    // Two-float, as measured on SwiftShader: 2.2e-9 of the largest.
    const twoFloat = cpu.map((v, k) => v + 2.2e-9 * 0.1 * Math.cos(k));
    expect(residualPrecision(twoFloat, cpu)).toBeNull();
    // 32-bit face fluxes of order 1e3 lose about 1e-4 in each cell's sum.
    const lost = cpu.map((v, k) => v + 1e-4 * Math.cos(k));
    expect(residualPrecision(lost, cpu)).toMatch(/loses the low parts/);
    const broken = Float64Array.from(cpu);
    broken[7] = Number.NaN;
    expect(residualPrecision(broken, cpu)).not.toBeNull();
    expect(residualPrecision(cpu.subarray(1), cpu)).not.toBeNull();
  });
});
