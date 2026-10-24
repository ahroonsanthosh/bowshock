/**
 * The numerics of the CPU job (../blind-run-3-solve.test.ts), the owner's
 * GPU kit (./owner-kit/gpu-solve.test.ts) and the 800-radius test
 * (./far-800.test.ts): the driver's grid solve (src/analysis/transonic-drag.ts,
 * solveGrid, its tests and constants unchanged, engine-agnostic), item 18's
 * stable stepping path with its caps, the records 0014 10.7 (y) asks of
 * every grid, and the problems of the family and the nested base grids.
 * Everything that determines a grid's numbers is here or in the src files
 * this file imports (transitively): a kept grid's fingerprint hashes
 * exactly those files (mid-checkpoint's numericsHash), so that a change
 * elsewhere (the store, the scripts, the documents) keeps the grids and a
 * change here does not. Keep the store and the allowance rule's
 * application out of this file for that reason (they are solve-common's).
 * No file system here.
 *
 * Below Mach 1 (0014 10.7 (y), item 5 and the absolute scale S): every
 * threshold that the driver takes relative to |drag| is taken relative to
 * S = max(|drag|, SUBSONIC_SCALE) instead, because the inviscid drag is
 * near zero there and a relative threshold collapses. At Mach 1 and above
 * nothing changes.
 */
import {
  cpuTransonicEngine,
  GEOMETRIC_NOISE,
  RESIDUAL_DIVERGENCE,
  RESIDUAL_FALL,
  SETTLE_NOISE,
  transonicDomains,
  WANDER_CHECKS,
  type TransonicCells,
  type TransonicEngine,
} from '../../../src/analysis/transonic-drag';
import { transonicProblem, type TransonicProblem } from '../../../src/analysis/transonic-flow';
import { Euler2D } from '../../../src/engine-cpu/euler2d';
import type { Body } from '../../../src/geometry/body';
import { TN4233_CONE_HALF_ANGLE, TN4233_ORIFICES } from '../../../src/validation/cone-cylinder-tn4233';
import {
  interpolateWall,
  SUBSONIC_SCALE,
  totalPressureRatio,
  type WallLoss,
} from '../../../src/validation/subsonic-verification';
import type { DomainAllowance } from '../../../src/verification/domain-allowance';
import {
  dampedOscillationBound,
  SettlingValue,
} from '../../../src/verification/iterative-convergence';

export const gamma = 1.4;
export const FIRST_MACH = 1.078;
// The driver's grid-solve settings (verifiedTransonicDrag's defaults).
export const CHECK_EVERY = 50;
export const MAX_STEPS = 400_000;
export const CFL = 1000;

/** The cone-cylinder, base radius 1 (as tests/analysis/transonic-flow.test.ts). */
export const body: Body = {
  nose: { shape: { kind: 'conical' }, length: 1 / Math.tan(TN4233_CONE_HALF_ANGLE), baseRadius: 1 },
  cylinderLength: 0,
};
/** The ten cone stations of TN 4233 ahead of x/l 0.95, in body radii. */
export const STATIONS_RADII: readonly number[] = TN4233_ORIFICES.slice(0, 10).map(
  (xl) => xl * body.nose.length,
);

/** The scale of the relative thresholds: |drag| at Mach 1 and above, S below (0014 10.7 (y)). */
export function thresholdScale(mach: number, drag: number): number {
  return mach < 1 ? Math.max(Math.abs(drag), SUBSONIC_SCALE) : Math.abs(drag);
}

/** Why a grid gave no value: the iteration diverged (the residual past 100 times its first value, or a drag not finite), or it ran to its step cap, or something else. */
export type NotConvergedKind = 'diverged' | 'cap' | 'other';
export class NotConverged extends Error {
  constructor(
    message: string,
    readonly kind: NotConvergedKind = 'other',
  ) {
    super(message);
  }
}

/** The iteration path a grid settled by ((y) item 18). */
export type SolvePath = 'implicit' | 'explicit' | 'implicit10';
/**
 * The explicit path's cap: the explicit steps converge at about 0.997 per
 * step on these grids (0013, "Solving to a steady state"), so a settled
 * drag to 1e-7 of S takes a few hundred thousand steps; 2,000,000 steps of
 * about 5,300 cells are about 8 hours of one core. Registered in (y).
 */
export const MAX_STEPS_EXPLICIT = 2_000_000;
/** The capped CFL number of the second fallback path. */
export const FALLBACK_CFL = 10;

/** The engine's explicit steps (SSPRK2, local time steps, CFL 0.8 as configured). */
export function explicitEngine(): TransonicEngine {
  return (problem) => {
    const solver = new Euler2D(problem.config);
    return Promise.resolve({
      start: (cells) => {
        solver.setCellPrimitives(cells);
        return Promise.resolve();
      },
      iterate: (steps) => {
        solver.iterate(steps);
        return Promise.resolve();
      },
      drag: () => Promise.resolve(problem.drag(solver)),
      residual: () => Promise.resolve(solver.densityResidualNorm()),
      checkPrecision: () => Promise.resolve(),
      cells: () => {
        const copy = new Euler2D(problem.config);
        copy.setConserved(solver.conserved());
        return Promise.resolve((i: number, j: number) => copy.primitive(i, j));
      },
      destroy: () => undefined,
    });
  };
}

/** The fallback engines of (y) item 18, in their registered order; null where no fallback applies (the GPU kit). */
export interface FallbackEngines {
  readonly explicit: TransonicEngine;
  readonly implicit10: TransonicEngine;
}
export function cpuFallback(): FallbackEngines {
  return { explicit: explicitEngine(), implicit10: cpuTransonicEngine(FALLBACK_CFL) };
}

export interface WallCell {
  /** Centroid along the axis, body radii. */
  readonly x: number;
  readonly mach: number;
  /** Total pressure over the free stream's. */
  readonly p0: number;
}

export interface GridResult {
  readonly refinement: number;
  readonly ni: number;
  readonly nj: number;
  readonly drag: number;
  readonly steps: number;
  readonly seconds: number;
  /** Relative to the scale (thresholdScale). */
  readonly noise: number;
  readonly rate: number;
  /** The scale the thresholds used. */
  readonly scale: number;
  /** The iteration path that settled it ((y) item 18). */
  readonly path: SolvePath;
}

export interface GridRecords {
  /** The wall pressure coefficient on the cone and the first 4 radii of cylinder. */
  readonly wall: readonly { x: number; y: number; cp: number }[];
  /** Cp at STATIONS_RADII, interpolated on this grid. */
  readonly stationCp: readonly number[];
  /** The wall cells' Mach number and total pressure, cone and cylinder. */
  readonly wallCells: readonly WallCell[];
  readonly loss: WallLoss;
}

/** As transonic-drag.ts. */
function geometricRemaining(values: readonly number[]): number {
  if (values.length < 3) return Infinity;
  const [a, b, c] = values.slice(-3) as [number, number, number];
  const d1 = b - a;
  const d2 = c - b;
  if (Math.abs(d2) <= 1e-12 * Math.abs(c)) return Math.abs(d2);
  if (d1 === 0) return Infinity;
  const r = Math.abs(d2 / d1);
  return r < 1 ? (Math.abs(d2) * r) / (1 - r) : Infinity;
}

export type Log = (line: string) => Promise<void> | void;

/**
 * A mid-grid checkpoint (the container restarts every few hours and a
 * fine grid takes longer): `load` gives a saved state to continue from
 * (the settling test then starts afresh on it, which costs its window of
 * checks, nothing else), `save` is called with the current state every
 * `everySeconds` of wall time.
 */
export interface MidState {
  readonly conserved: Float64Array;
  /** The steps taken on this grid so far (the step cap is per grid, across restarts). */
  readonly steps: number;
  /** The first check's residual (the 100 times divergence test) and the largest seen (the settling test). */
  readonly firstResidual: number;
  readonly largestResidual: number;
}
export interface MidCheckpoint {
  readonly load: () => MidState | null;
  readonly save: (state: MidState) => void;
  readonly everySeconds: number;
}

/**
 * verifiedTransonicDrag's solveGrid on any engine, its tests unchanged
 * except for the scale below Mach 1 (thresholdScale). `start` is the
 * coarser grid's solution, or null to start from the free stream.
 */
export async function solveGrid(
  engine: TransonicEngine,
  problem: TransonicProblem,
  start: { problem: TransonicProblem; cells: TransonicCells; rate: number } | null,
  tag: string,
  log: Log,
  checkPrecision = false,
  maxSteps = MAX_STEPS,
  mid: MidCheckpoint | null = null,
  path: SolvePath = 'implicit',
): Promise<{ result: GridResult; conserved: Float64Array }> {
  const refinement = problem.options.refinement;
  const mach = problem.options.mach;
  const every = CHECK_EVERY * refinement;
  const free = problem.freeStream.state;
  // Below Mach 1 the settling test sees the drag shifted by S, so that its
  // relative noise acts on S (a shift changes no difference).
  const shift = mach < 1 ? SUBSONIC_SCALE : 0;
  const solver = await engine(problem);
  const t0 = performance.now();
  try {
    const saved = mid?.load() ?? null;
    if (saved !== null) {
      const holder = new Euler2D(problem.config);
      holder.setConserved(saved.conserved);
      await solver.start((i, j) => holder.primitive(i, j), CFL);
      await log(
        `${tag} r=${refinement} continued from its mid-grid checkpoint at step ${saved.steps} (first residual ${saved.firstResidual.toExponential(3)})`,
      );
    } else if (start === null) await solver.start(() => free, 1);
    else {
      const ratio = refinement / start.problem.options.refinement;
      const coarse = start.cells;
      await solver.start((i, j) => coarse(Math.floor(i / ratio), Math.floor(j / ratio)), CFL);
    }
    let lastSave = performance.now();
    const settling = new SettlingValue(SETTLE_NOISE, start?.rate ?? Number.NaN);
    const history: number[] = [];
    // The step count and the residual marks carry across restarts, so the
    // cap and the divergence test are per grid, not per process.
    let steps = saved?.steps ?? 0;
    let drag = Number.NaN;
    let passes = 0;
    let remaining = Infinity;
    let oscillation = 0;
    let firstResidual = saved?.firstResidual ?? Number.NaN;
    let largestResidual = saved?.largestResidual ?? 0;
    let lastResidual = Number.NaN;
    let settled = false;
    while (steps < maxSteps) {
      await solver.iterate(every);
      steps += every;
      if (checkPrecision && steps === every) await solver.checkPrecision();
      drag = await solver.drag();
      if (!Number.isFinite(drag)) throw new NotConverged('the drag is not finite', 'diverged');
      const residual = await solver.residual();
      if (Number.isNaN(firstResidual)) firstResidual = residual;
      if (residual > RESIDUAL_DIVERGENCE * firstResidual)
        throw new NotConverged(
          `the residual grew from ${firstResidual} to ${residual}`,
          'diverged',
        );
      largestResidual = Math.max(largestResidual, residual);
      const moving = residual !== lastResidual;
      lastResidual = residual;
      await log(
        `${tag} r=${refinement} steps=${steps} drag=${drag.toPrecision(9)} residual=${residual.toExponential(3)} s=${((performance.now() - t0) / 1000).toFixed(0)}`,
      );
      const scale = thresholdScale(mach, drag);
      history.push(drag);
      if (mid !== null && performance.now() - lastSave > 1000 * mid.everySeconds) {
        const copy = new Euler2D(problem.config);
        copy.setCellPrimitives(await solver.cells());
        mid.save({ conserved: copy.conserved(), steps, firstResidual, largestResidual });
        lastSave = performance.now();
        await log(`${tag} r=${refinement} mid-grid checkpoint saved at step ${steps}`);
      }
      remaining = geometricRemaining(history);
      passes = remaining <= GEOMETRIC_NOISE * scale ? passes + 1 : 0;
      const settlingPassed = settling.add(drag + shift);
      if (!(settlingPassed || passes >= 2)) continue;
      if (!Number.isFinite(remaining)) continue;
      if (!(moving && residual <= RESIDUAL_FALL * largestResidual)) continue;
      const fit = dampedOscillationBound(history, 10 * GEOMETRIC_NOISE * scale);
      oscillation = fit.bound;
      if (fit.fitted > 0 && fit.decaying && oscillation <= SETTLE_NOISE * scale) {
        settled = true;
        break;
      }
    }
    if (!settled) throw new NotConverged(`the drag did not settle within ${maxSteps} steps`, 'cap');
    let low = drag;
    let high = drag;
    for (let k = 0; k < WANDER_CHECKS; k++) {
      await solver.iterate(every);
      steps += every;
      drag = await solver.drag();
      low = Math.min(low, drag);
      high = Math.max(high, drag);
    }
    const scale = thresholdScale(mach, drag);
    const noise = Math.max(
      SETTLE_NOISE,
      (high - low) / scale,
      remaining / scale,
      oscillation / scale,
    );
    const copy = new Euler2D(problem.config);
    copy.setCellPrimitives(await solver.cells());
    return {
      result: {
        refinement,
        ni: problem.config.grid.ni,
        nj: problem.config.grid.nj,
        drag,
        steps,
        seconds: (performance.now() - t0) / 1000,
        noise,
        rate: settling.rateToPassOn,
        scale,
        path,
      },
      conserved: copy.conserved(),
    };
  } finally {
    solver.destroy();
  }
}

/** The paths of (y) item 18 in their registered order, each with its cap (the explicit path's by default MAX_STEPS_EXPLICIT). */
export function fallbackPaths(
  engine: TransonicEngine,
  fallback: FallbackEngines | null,
  explicitCap = MAX_STEPS_EXPLICIT,
): { path: SolvePath; engine: TransonicEngine; maxSteps: number }[] {
  const paths: { path: SolvePath; engine: TransonicEngine; maxSteps: number }[] = [
    { path: 'implicit', engine, maxSteps: MAX_STEPS },
  ];
  if (fallback !== null) {
    paths.push({ path: 'explicit', engine: fallback.explicit, maxSteps: explicitCap });
    paths.push({ path: 'implicit10', engine: fallback.implicit10, maxSteps: MAX_STEPS });
  }
  return paths;
}

/**
 * (y) item 18: solveGrid by the implicit steps and, if they diverge (never
 * on a step-cap miss), the same grid from the same start by the fallback
 * engines in their registered order: the explicit steps under their own
 * cap, then the implicit steps at CFL 10 under the ordinary cap. A
 * divergence or a cap miss of the last path is thrown as it is. With
 * `fallback` null (the GPU kit) a divergence is thrown at once. `midFor`
 * gives each path its own mid-grid checkpoint; a saved fallback state
 * found at the start means the implicit path had already diverged before
 * a restart, so that path is skipped.
 */
export async function solveGridStably(
  engine: TransonicEngine,
  problem: TransonicProblem,
  start: { problem: TransonicProblem; cells: TransonicCells; rate: number } | null,
  tag: string,
  log: Log,
  checkPrecision = false,
  fallback: FallbackEngines | null = null,
  midFor: (path: SolvePath) => MidCheckpoint | null = () => null,
  explicitCap = MAX_STEPS_EXPLICIT,
): Promise<{ result: GridResult; conserved: Float64Array }> {
  const paths = fallbackPaths(engine, fallback, explicitCap);
  // A fallback path with a saved state was running before a restart: the earlier paths had failed.
  let first = 0;
  for (let k = paths.length - 1; k > 0; k--) {
    if (midFor(paths[k]!.path)?.load() !== null && midFor(paths[k]!.path) !== null) {
      first = k;
      break;
    }
  }
  const reasons: string[] = [];
  for (let k = first; k < paths.length; k++) {
    const { path, engine: e, maxSteps } = paths[k]!;
    try {
      return await solveGrid(
        e,
        problem,
        start,
        path === 'implicit' ? tag : `${tag} ${path}`,
        log,
        checkPrecision && path === 'implicit',
        maxSteps,
        midFor(path),
        path,
      );
    } catch (error) {
      if (!(error instanceof NotConverged)) throw error;
      reasons.push(`${path}: ${error.message}`);
      const last = k === paths.length - 1;
      // The implicit path falls back on a divergence only (a cap miss is
      // final); the explicit path goes on to CFL 10 on any failure, a
      // divergence or its cap (item 18 and the far-800 order); the last
      // path's failure is final.
      const goOn = path === 'implicit' ? error.kind === 'diverged' : true;
      if (!goOn || last) {
        throw new NotConverged(reasons.join('; '), error.kind);
      }
      await log(
        `${tag} r=${problem.options.refinement}: the ${path} steps ${error.kind === 'diverged' ? 'diverged' : 'did not settle'} (${error.message}); re-solving by the ${paths[k + 1]!.path} steps from the same start ((y) item 18)`,
      );
    }
  }
  throw new NotConverged(reasons.join('; '), 'other');
}

/** The records of 0014 10.7 (y) items 3 Q2, Q3 and Q5 from a grid's converged state. */
export function gridRecords(problem: TransonicProblem, conserved: Float64Array): GridRecords {
  const solver = new Euler2D(problem.config);
  solver.setConserved(conserved);
  const { pressure, dynamicPressure } = problem.freeStream;
  const mach = problem.options.mach;
  const L = body.nose.length;
  const faces = solver.boundaryFluxes('jMin');
  const wall = faces
    .filter((f) => f.x >= 0 && f.x <= L + 4 && f.y > 1e-12)
    .map((f) => {
      // On a wall the momentum flux along the outward normal is the pressure.
      const p = f.flux[1] * f.nx + f.flux[2] * f.ny;
      return { x: f.x, y: f.y, cp: (p - pressure) / dynamicPressure };
    });
  const stationCp = STATIONS_RADII.map((x) => interpolateWall(wall, x));
  // The wall cells (j = 0) along the body, by the faces' order along i.
  const p0Free = pressure * totalPressureRatio(mach, gamma);
  const wallCells: WallCell[] = [];
  const { ni } = problem.config.grid;
  for (let i = 0; i < ni; i++) {
    const face = faces[i]!;
    if (!(face.x >= 0 && face.y > 1e-12)) continue;
    const q = solver.primitive(i, 0);
    const a = Math.sqrt((gamma * q.p) / q.rho);
    const m = Math.hypot(q.u, q.v) / a;
    wallCells.push({ x: face.x, mach: m, p0: (q.p * totalPressureRatio(m, gamma)) / p0Free });
  }
  const supersonic = wallCells.filter((c) => c.mach > 1);
  const firstSupersonic = supersonic.length > 0 ? Math.min(...supersonic.map((c) => c.x)) : Infinity;
  const aheadLimit = Math.min(0.9 * L, firstSupersonic);
  // From the first station (the tip's stagnation spike excluded, (y) item 6 (e)).
  const ahead = wallCells.filter((c) => c.x >= STATIONS_RADII[0]! && c.x < aheadLimit);
  // The largest deviation of the wall's total pressure from the free
  // stream's, either way (a gain is as much an error as a loss), with its
  // sign recorded.
  let worst = { loss: 0, signed: 0, pressureRatio: 1 };
  for (const c of ahead) {
    const signed = 1 - c.p0;
    if (Math.abs(signed) > worst.loss) {
      const cp = interpolateWall(wall, c.x);
      worst = { loss: Math.abs(signed), signed, pressureRatio: 1 + (cp * dynamicPressure) / pressure };
    }
  }
  const behindCells = wallCells.filter((c) => c.x >= L + 6);
  const behind = behindCells.length > 0 ? 1 - behindCells[0]!.p0 : Number.NaN;
  return {
    wall,
    stationCp,
    wallCells,
    loss: {
      ahead: worst.loss,
      aheadSigned: worst.signed,
      pressureRatio: worst.pressureRatio,
      behind,
      supersonicCells: supersonic.length,
      maxMach: Math.max(...wallCells.map((c) => c.mach)),
    },
  };
}

export type Nested = { readonly farField?: number; readonly cylinder?: number };

/** The family's grid of refinement r, with its far boundaries or cylinder moved node for node (the driver's problemOf). */
export function problemOf(mach: number, refinement: number, nested?: Nested): TransonicProblem {
  const domains = transonicDomains(body, mach);
  const merged = { ...domains.family.nested, ...nested };
  return transonicProblem(body, {
    mach,
    gamma,
    refinement,
    farField: domains.family.farField,
    cylinder: domains.family.cylinder,
    ...(Object.keys(merged).length === 0 ? {} : { nested: merged }),
  });
}

export interface AllowanceRecord {
  readonly kind: 'farField' | 'cylinder';
  /** As asked of the grid (radii, or calibers). */
  readonly domains: readonly [number, number, number];
  /** The grids' own distances, which the rule uses. */
  readonly distances: readonly [number, number, number];
  readonly values: readonly [number, number, number];
  readonly noise: number;
  readonly result: DomainAllowance;
  /** Each base grid's records (smaller, own, larger). */
  readonly grids: readonly [GridResult, GridResult, GridResult];
  readonly stationCp: readonly [readonly number[], readonly number[], readonly number[]];
  /** The per-station far-field allowance (addendum item 5), or null if refused. */
  readonly stationAllowance: readonly number[] | null;
}

export function distanceOf(kind: 'farField' | 'cylinder', problem: TransonicProblem): number {
  return kind === 'farField'
    ? problem.grid.farRadius / body.nose.baseRadius
    : (problem.grid.xEnd - body.nose.length) / (2 * body.nose.baseRadius);
}
