/**
 * What the CPU job (../blind-run-3-solve.test.ts) and the owner's GPU kit
 * (./owner-kit/gpu-solve.test.ts) share: the numerics (./solve-numerics.ts,
 * re-exported here: the driver's grid solve, item 18's stable stepping,
 * the records, the problems), the store of kept grids with its
 * fingerprint, and the allowances of the driver on the nested base grids.
 * No file system here: each script keeps its own checkpoints and output.
 */

import {
  transonicDomains,
  type TransonicCells,
  type TransonicEngine,
} from '../../../src/analysis/transonic-drag';
import type { TransonicProblem } from '../../../src/analysis/transonic-flow';
import { SUBSONIC_SCALE } from '../../../src/validation/subsonic-verification';
import { domainAllowance, tailFactor } from '../../../src/verification/domain-allowance';
import {
  body,
  CFL,
  CHECK_EVERY,
  distanceOf,
  FALLBACK_CFL,
  gridRecords,
  MAX_STEPS,
  MAX_STEPS_EXPLICIT,
  problemOf,
  solveGridStably,
  thresholdScale,
  type AllowanceRecord,
  type FallbackEngines,
  type GridRecords,
  type GridResult,
  type Log,
  type MidCheckpoint,
  type Nested,
  type SolvePath,
} from './solve-numerics';
import {
  GEOMETRIC_NOISE,
  RESIDUAL_DIVERGENCE,
  RESIDUAL_FALL,
  SETTLE_NOISE,
  WANDER_CHECKS,
} from '../../../src/analysis/transonic-drag';

export * from './solve-numerics';

/**
 * The allowances of the driver (0013, "The allowance rule corrected for
 * sign reversal", with the decaying branch's distance condition): the base
 * grid on the smaller and the larger nested domain, each from the free
 * stream, the rule on the three drags at the grids' own distances with the
 * largest noise, and the per-station far-field allowance.
 */
/**
 * Where a script keeps its allowance base grids across restarts
 * (infrastructure, no rule): a finished grid by its key (its result and
 * state, never re-solved), and a mid-grid checkpoint per path for the
 * running one, so that a restart resumes exactly where it was, with
 * item 18's path order and caps per grid. Null (the GPU kit) keeps nothing.
 */
/**
 * What a kept grid was made with: its grid, the engine and settling
 * constants, the caps, the scale and a content hash of the numerics (the
 * files solve-numerics.ts imports, transitively, with itself; see
 * mid-checkpoint's numericsHash). A kept grid whose fingerprint differs
 * from the current one in any compared field is not used (the code or the
 * constants changed under it). The commit and the note are informational,
 * never compared: a commit that leaves the numerics files as they were
 * keeps every grid.
 */
export interface GridFingerprint {
  readonly ni: number;
  readonly nj: number;
  readonly farRadius: number;
  readonly xEnd: number;
  readonly mach: number;
  readonly refinement: number;
  readonly engine: string;
  readonly cfl: number;
  readonly checkEvery: number;
  readonly maxSteps: number;
  readonly maxStepsExplicit: number;
  readonly fallbackCfl: number;
  readonly settleNoise: number;
  readonly geometricNoise: number;
  readonly wanderChecks: number;
  readonly residualDivergence: number;
  readonly residualFall: number;
  readonly subsonicScale: number;
  /** The content hash of the numerics files (compared). */
  readonly numerics: string;
  /** The solve code's commit (git rev-parse HEAD of the worktree, "-dirty" if the research or src files differed); informational. */
  readonly commit: string;
  /** How the fingerprint came to be, when not written by the solve that kept the grid (tag-kept.test.ts); informational. */
  readonly note?: string;
}

/** The fields of a fingerprint that are not compared. */
export const INFORMATIONAL_FINGERPRINT_FIELDS: ReadonlySet<keyof GridFingerprint> = new Set([
  'commit',
  'note',
] as const);

/** The compared fields in which two fingerprints differ. */
export function fingerprintDifferences(
  a: GridFingerprint,
  b: GridFingerprint,
): (keyof GridFingerprint)[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)] as (keyof GridFingerprint)[]);
  return [...keys].filter((k) => !INFORMATIONAL_FINGERPRINT_FIELDS.has(k) && a[k] !== b[k]);
}

export function gridFingerprint(
  problem: TransonicProblem,
  engine: string,
  code: { readonly numerics: string; readonly commit: string },
): GridFingerprint {
  return {
    ni: problem.config.grid.ni,
    nj: problem.config.grid.nj,
    farRadius: problem.grid.farRadius,
    xEnd: problem.grid.xEnd,
    mach: problem.options.mach,
    refinement: problem.options.refinement,
    engine,
    cfl: CFL,
    checkEvery: CHECK_EVERY,
    maxSteps: MAX_STEPS,
    maxStepsExplicit: MAX_STEPS_EXPLICIT,
    fallbackCfl: FALLBACK_CFL,
    settleNoise: SETTLE_NOISE,
    geometricNoise: GEOMETRIC_NOISE,
    wanderChecks: WANDER_CHECKS,
    residualDivergence: RESIDUAL_DIVERGENCE,
    residualFall: RESIDUAL_FALL,
    subsonicScale: SUBSONIC_SCALE,
    numerics: code.numerics,
    commit: code.commit,
  };
}

export function sameFingerprint(a: GridFingerprint, b: GridFingerprint): boolean {
  return fingerprintDifferences(a, b).length === 0;
}

export interface GridStore {
  /** The kept grid under this key, if its fingerprint is the one given (a mismatch counts as not kept, and is logged by the caller). */
  readonly done: (
    key: string,
    fingerprint: GridFingerprint,
  ) => { result: GridResult; conserved: Float64Array } | { mismatch: GridFingerprint } | null;
  readonly keep: (
    key: string,
    result: GridResult,
    conserved: Float64Array,
    fingerprint: GridFingerprint,
  ) => void;
  readonly midFor: (key: string, path: SolvePath) => MidCheckpoint | null;
  /** Called once a grid is kept: its mid states are no longer needed. */
  readonly clearMid: (key: string) => void;
}

/** solveGridStably through a store: a kept grid comes back at once, a running one resumes from its path's mid state. */
export async function solveGridKept(
  store: GridStore | null,
  key: string,
  engine: TransonicEngine,
  problem: TransonicProblem,
  start: { problem: TransonicProblem; cells: TransonicCells; rate: number } | null,
  tag: string,
  log: Log,
  fallback: FallbackEngines | null,
  fingerprint: GridFingerprint = gridFingerprint(problem, 'unspecified', {
    numerics: 'unspecified',
    commit: 'unspecified',
  }),
): Promise<{ result: GridResult; conserved: Float64Array }> {
  const kept = store?.done(key, fingerprint) ?? null;
  if (kept !== null && 'mismatch' in kept) {
    const differ = fingerprintDifferences(fingerprint, kept.mismatch);
    await log(
      `${tag} kept grid refused: its fingerprint differs in ${differ.join(', ')} (kept ${differ.map((k) => String(kept.mismatch[k])).join(', ')}; now ${differ.map((k) => String(fingerprint[k])).join(', ')}); solved again`,
    );
  } else if (kept !== null) {
    await log(
      `${tag} kept from before: drag ${kept.result.drag} (${kept.result.path} steps, ${kept.result.steps} steps)`,
    );
    return kept;
  }
  const solved = await solveGridStably(
    engine,
    problem,
    start,
    tag,
    log,
    false,
    fallback,
    store === null ? () => null : (path) => store.midFor(key, path),
  );
  if (store !== null) {
    store.keep(key, solved.result, solved.conserved, fingerprint);
    store.clearMid(key);
  }
  return solved;
}

export async function solveAllowance(
  engine: TransonicEngine,
  mach: number,
  kind: 'farField' | 'cylinder',
  own: { result: GridResult; records: GridRecords; problem: TransonicProblem },
  tag: string,
  log: Log,
  fallback: FallbackEngines | null = null,
  store: GridStore | null = null,
  code: { engine: string; numerics: string; commit: string } = {
    engine: 'unspecified',
    numerics: 'unspecified',
    commit: 'unspecified',
  },
): Promise<AllowanceRecord> {
  const domains = transonicDomains(body, mach);
  const sizes = kind === 'farField' ? domains.farField : domains.cylinder;
  const nestedOf = (size: number): Nested =>
    kind === 'farField' ? { farField: size } : { cylinder: size };
  const smallerProblem = problemOf(mach, 1, nestedOf(sizes[0]));
  const largerProblem = problemOf(mach, 1, nestedOf(sizes[2]));
  const keyOf = (size: number) => `M${mach.toFixed(3)}-${kind}-${size}`;
  const smaller = await solveGridKept(
    store,
    keyOf(sizes[0]),
    engine,
    smallerProblem,
    null,
    `${tag} ${kind} ${sizes[0]}`,
    log,
    fallback,
    gridFingerprint(smallerProblem, code.engine, code),
  );
  const larger = await solveGridKept(
    store,
    keyOf(sizes[2]),
    engine,
    largerProblem,
    null,
    `${tag} ${kind} ${sizes[2]}`,
    log,
    fallback,
    gridFingerprint(largerProblem, code.engine, code),
  );
  const smallerRecords = gridRecords(smallerProblem, smaller.conserved);
  const largerRecords = gridRecords(largerProblem, larger.conserved);
  const values = [smaller.result.drag, own.result.drag, larger.result.drag] as const;
  const distances = [
    distanceOf(kind, smallerProblem),
    distanceOf(kind, own.problem),
    distanceOf(kind, largerProblem),
  ] as const;
  const noise = Math.max(smaller.result.noise, own.result.noise, larger.result.noise);
  // The noise is relative to the grids' scale (S below Mach 1), so m = 2 nu S there.
  const scale = Math.max(...values.map((v) => thresholdScale(mach, v)));
  const result = domainAllowance(values, distances, noise, scale);
  let stationAllowance: number[] | null = null;
  if (result.kind !== 'refused') {
    const T = tailFactor(distances[1], distances[2]);
    const changes = own.records.stationCp.map((v, j) => largerRecords.stationCp[j]! - v);
    const mean = changes.reduce((s, v) => s + v, 0) / changes.length;
    stationAllowance = changes.map(
      (d) => result.allowance + T * Math.abs(d - mean) + result.measurability,
    );
  }
  return {
    kind,
    domains: sizes,
    distances,
    values,
    noise,
    result,
    grids: [smaller.result, own.result, larger.result],
    stationCp: [smallerRecords.stationCp, own.records.stationCp, largerRecords.stationCp],
    stationAllowance,
  };
}
