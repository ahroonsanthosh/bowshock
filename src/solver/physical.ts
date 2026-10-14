import { pressureFromConserved } from '../scheme/gas';

/**
 * Index of the first of `count` cells, starting at `start`, whose density or
 * pressure is non-positive or not finite; -1 if every cell is physical.
 */
export function firstNonPhysicalCell1D(
  rho: ArrayLike<number>,
  mom: ArrayLike<number>,
  energy: ArrayLike<number>,
  gamma: number,
  start = 0,
  count = rho.length - start,
): number {
  for (let k = start; k < start + count; k++) {
    const r = rho[k]!;
    const p = pressureFromConserved(r, mom[k]!, energy[k]!, gamma);
    if (!(r > 0 && p > 0 && Number.isFinite(r) && Number.isFinite(p))) return k;
  }
  return -1;
}
