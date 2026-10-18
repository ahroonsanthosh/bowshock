/**
 * Full-approximation-scheme (FAS) multigrid for steady flows on a nested
 * family of grids, each coarser grid having every second line of the
 * finer one (as the generated grid families do: each coarse cell is the
 * union of 2 x 2 fine cells), with implicit LU-SGS steps
 * (Euler2D.iterateImplicit) as the smoother. After A. Brandt,
 * "Multi-level adaptive solutions to boundary-value problems", Math.
 * Comp. 31 (1977) 333-390, and its use for the Euler equations by A.
 * Jameson ("Solution of the Euler equations for two dimensional transonic
 * flow by a multigrid method", Appl. Math. Comput. 13 (1983) 327-355) and
 * with LU-SGS by S. Yoon and A. Jameson (AIAA J. 26 (1988) 1025).
 *
 * A cycle on a level smooths, then moves the state to the next coarser
 * level (volume-weighted averages of the conserved variables) together
 * with the forcing P_c = sum of the fine residuals over each coarse cell
 * less the coarse residual of the moved state, so that the coarse level
 * solves R_c(Q) + P_c = 0, whose solution is the moved state wherever the
 * fine residual vanishes; the coarse level's change is added back to
 * each fine cell it covers, and the fine level is smoothed again. Only the
 * path changes: a converged fine level has zero residual, the steady
 * state of its own scheme, whatever the coarse levels did.
 */

import type { Euler2D } from '../engine-cpu/euler2d';

export interface MultigridLevel {
  readonly solver: Euler2D;
  /**
   * The solver's configured source (its config.source, the same array),
   * which holds the forcing; null on the finest level, which has none.
   */
  readonly forcing: Float64Array | null;
}

export interface CycleOptions {
  readonly cfl: number;
  /** Smoothing steps before and after the coarse-level correction. */
  readonly pre: number;
  readonly post: number;
  /** Steps on the coarsest level. */
  readonly coarsest: number;
  /** Coarse cycles per level: 1 for a V cycle, 2 for a W cycle. */
  readonly gamma: number;
}

export class FasMultigrid {
  constructor(
    /** Finest first; each level's grid has half the lines of the one before. */
    readonly levels: readonly MultigridLevel[],
  ) {
    for (let l = 1; l < levels.length; l++) {
      const fine = levels[l - 1]!.solver.metrics;
      const coarse = levels[l]!.solver.metrics;
      if (fine.ni !== 2 * coarse.ni || fine.nj !== 2 * coarse.nj) {
        throw new RangeError('each coarser level must have half the cells in each direction');
      }
      if (levels[l]!.forcing === null) throw new RangeError('coarse levels need a forcing array');
    }
  }

  /** One cycle from the finest level. */
  cycle(options: CycleOptions): void {
    this.cycleOn(0, options);
  }

  private cycleOn(level: number, options: CycleOptions): void {
    const { solver } = this.levels[level]!;
    if (level === this.levels.length - 1) {
      solver.iterateImplicit(options.coarsest, options.cfl);
      return;
    }
    solver.iterateImplicit(options.pre, options.cfl);
    const coarse = this.levels[level + 1]!;
    const fineMetrics = solver.metrics;
    const coarseMetrics = coarse.solver.metrics;
    const q = solver.conserved();
    const r = solver.residualVector();
    const start = restrict(q, fineMetrics.volume, fineMetrics.ni, fineMetrics.nj, true);
    coarse.solver.setConserved(start, false);
    const forcing = coarse.forcing!;
    forcing.fill(0);
    const coarseResidual = coarse.solver.residualVector();
    const summed = restrict(r, fineMetrics.volume, fineMetrics.ni, fineMetrics.nj, false);
    for (let k = 0; k < forcing.length; k++) forcing[k] = summed[k]! - coarseResidual[k]!;
    for (let g = 0; g < options.gamma; g++) this.cycleOn(level + 1, options);
    const solved = coarse.solver.conserved();
    prolongCorrection(q, solved, start, fineMetrics.ni, fineMetrics.nj, coarseMetrics.ni, solver);
    solver.setConserved(q, false);
    solver.iterateImplicit(options.post, options.cfl);
  }
}

/**
 * Coarse-cell values from the fine cells' (four per cell): their
 * volume-weighted mean (states) or their sum (residuals, which are rates
 * times volumes).
 */
function restrict(
  fine: Float64Array,
  volume: Float64Array,
  ni: number,
  nj: number,
  average: boolean,
): Float64Array {
  const ci = ni / 2;
  const cj = nj / 2;
  const out = new Float64Array(4 * ci * cj);
  for (let J = 0; J < cj; J++) {
    for (let I = 0; I < ci; I++) {
      const c = 4 * (I + J * ci);
      let weight = 0;
      for (let b = 0; b < 2; b++) {
        for (let a = 0; a < 2; a++) {
          const f = 2 * I + a + (2 * J + b) * ni;
          const w = average ? volume[f]! : 1;
          weight += w;
          for (let v = 0; v < 4; v++) out[c + v] = out[c + v]! + w * fine[4 * f + v]!;
        }
      }
      if (average) for (let v = 0; v < 4; v++) out[c + v] = out[c + v]! / weight;
    }
  }
  return out;
}

/**
 * Add the coarse level's change (solved - start) to the fine cells,
 * interpolated bilinearly in index space (each fine centre lies a quarter
 * of the way from its coarse cell's centre towards a neighbour's: weights
 * 9/16, 3/16, 3/16 and 1/16, a missing neighbour at a boundary replaced by
 * the cell itself), scaled down by halves in a cell where it would change
 * the density or pressure by more than a factor of two.
 */
function prolongCorrection(
  q: Float64Array,
  solved: Float64Array,
  start: Float64Array,
  ni: number,
  nj: number,
  ci: number,
  solver: Euler2D,
): void {
  const gamma = solver.config.gamma;
  const cj = nj / 2;
  const pressure = (rho: number, mx: number, my: number, e: number) =>
    (gamma - 1) * (e - (0.5 * (mx * mx + my * my)) / rho);
  const change = new Float64Array(4);
  for (let j = 0; j < nj; j++) {
    for (let i = 0; i < ni; i++) {
      const f = 4 * (i + j * ni);
      const I = Math.floor(i / 2);
      const J = Math.floor(j / 2);
      const I2 = Math.min(Math.max(I + (i % 2 === 0 ? -1 : 1), 0), ci - 1);
      const J2 = Math.min(Math.max(J + (j % 2 === 0 ? -1 : 1), 0), cj - 1);
      const corners: [number, number][] = [
        [I + J * ci, 9 / 16],
        [I2 + J * ci, 3 / 16],
        [I + J2 * ci, 3 / 16],
        [I2 + J2 * ci, 1 / 16],
      ];
      change.fill(0);
      for (const [c, w] of corners) {
        for (let v = 0; v < 4; v++) {
          change[v] = change[v]! + w * (solved[4 * c + v]! - start[4 * c + v]!);
        }
      }
      const rho = q[f]!;
      const p = pressure(rho, q[f + 1]!, q[f + 2]!, q[f + 3]!);
      let alpha = 1;
      for (let tries = 0; tries < 30; tries++) {
        const r1 = rho + alpha * change[0]!;
        const p1 = pressure(
          r1,
          q[f + 1]! + alpha * change[1]!,
          q[f + 2]! + alpha * change[2]!,
          q[f + 3]! + alpha * change[3]!,
        );
        if (r1 > 0.5 * rho && r1 < 2 * rho && p1 > 0.5 * p && p1 < 2 * p) break;
        alpha *= 0.5;
      }
      for (let v = 0; v < 4; v++) q[f + v] = q[f + v]! + alpha * change[v]!;
    }
  }
}
