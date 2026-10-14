import { physicalFlux } from '../../src/scheme/flux';
import { soundSpeed, totalEnergy, type Primitive1D } from '../../src/scheme/gas';

/**
 * Per-component scale for comparing flux vectors: the magnitude of the terms
 * a flux formula combines, max |F_i(w)| + s_max max |U_i(w)| over the states
 * w, with s_max the largest wave speed |u| + a of any of them (as in the
 * Rusanov dissipation term). Errors are then measured relative to the size
 * of what was computed, so rounding is judged fairly.
 */
export function fluxScales(gamma: number, ...ws: Primitive1D[]): number[] {
  const sMax = Math.max(...ws.map((w) => Math.abs(w.u) + soundSpeed(w.rho, w.p, gamma)));
  const scales = [0, 0, 0];
  const f = new Float64Array(3);
  for (const w of ws) {
    physicalFlux(w, gamma, f);
    const conserved = [w.rho, w.rho * w.u, totalEnergy(w.rho, w.u, w.p, gamma)];
    for (let i = 0; i < 3; i++) {
      scales[i] = Math.max(scales[i]!, Math.abs(f[i]!) + sMax * Math.abs(conserved[i]!));
    }
  }
  return scales;
}

/** Largest component error of `actual` against `expected`, relative to `scales`. */
export function scaledError(
  actual: ArrayLike<number>,
  expected: ArrayLike<number>,
  scales: readonly number[],
): number {
  let worst = 0;
  for (let i = 0; i < scales.length; i++) {
    worst = Math.max(worst, Math.abs(actual[i]! - expected[i]!) / scales[i]!);
  }
  return worst;
}
