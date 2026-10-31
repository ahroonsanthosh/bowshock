/**
 * Shared by the corrected independent check of 0009 section 9.13 (as
 * revised after Fable's review): its cases, section 2.4's grid and solver
 * set-up as 9.7 ran them (euler.test.ts), the reference flow, and the
 * windows. Used by paired.test.ts (the solves) and paired-judge.test.ts
 * (the verdict).
 */

import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { Euler2D } from '../../../../src/engine-cpu/euler2d';
import { gridFromFunction, type StructuredGrid } from '../../../../src/grid/structured';
import { hexagonal, type SymmetricSection } from '../../../../src/fins/section';
import { exactSectionDrag } from '../../../../src/fins/section-drag';
import { machFromPrandtlMeyer, obliqueShock, prandtlMeyer } from '../../../../src/validation/gas-dynamics';
import { BEVEL, DEG } from './family';

export const GAMMA = 1.4;

/** 9.13's five cases; K1 to K3 and K5 are nodes of 9.4's grid (their keys). */
export const P_CASES: Record<string, { theta: number; bevel: number; mach: number; node: string | null }> = {
  K1: { theta: 15, bevel: BEVEL[6]!, mach: 1.8, node: '10|6|3' },
  K2: { theta: 15, bevel: BEVEL[6]!, mach: 2.0, node: '10|6|5' },
  K3: { theta: 13, bevel: BEVEL[6]!, mach: 1.8, node: '8|6|3' },
  K5: { theta: 15, bevel: BEVEL[6]!, mach: 3.0, node: '10|6|10' },
  E2: { theta: 15, bevel: 0.12, mach: 1.8, node: null },
};
export const P_NAMES = ['K1', 'K2', 'K3', 'K5', 'E2'] as const;

export const sectionOf = (theta: number, bevel: number): SymmetricSection =>
  hexagonal(2 * bevel * Math.tan(theta * DEG), bevel);

// Section 2.4's set-up (runs/euler.test.ts; w9/euler.test.ts).
const X_MIN = -0.3;
const X_MAX = 1.2;
const HEIGHT = 1.4;
const H0 = 0.025;
const NJ0 = 28;

/** The hexagon's grid lines at a level: section 2.4's, every corner on a vertical line. */
export function gridLines(section: SymmetricSection, level: number) {
  const m = 2 ** level;
  const xs = [X_MIN, ...section.x, X_MAX];
  const counts: number[] = [];
  for (let k = 0; k + 1 < xs.length; k++) counts.push(Math.round((xs[k + 1]! - xs[k]!) / H0) * m);
  const xNodes: number[] = [X_MIN];
  for (let k = 0; k + 1 < xs.length; k++) {
    for (let i = 1; i <= counts[k]!; i++) xNodes.push(xs[k]! + ((xs[k + 1]! - xs[k]!) * i) / counts[k]!);
  }
  const wall = (x: number) => {
    if (x <= 0 || x >= 1) return 0;
    for (let k = 1; k < section.x.length; k++) {
      if (x <= section.x[k]!) {
        const [x0, x1] = [section.x[k - 1]!, section.x[k]!];
        const [g0, g1] = [section.halfThickness[k - 1]!, section.halfThickness[k]!];
        return g0 + ((g1 - g0) * (x - x0)) / (x1 - x0);
      }
    }
    return 0;
  };
  return { xNodes, wall, nj: NJ0 * m };
}

/** The grid from column `from` on (0 for the hexagon; the reference's x_s column for the reference). */
export function gridFrom(section: SymmetricSection, level: number, from: number, flatWall = false): StructuredGrid {
  const { xNodes, wall, nj } = gridLines(section, level);
  // flatWall (9.15's exactness check only): the wall held at the flat's height throughout.
  const flat = section.halfThickness[1]!;
  return gridFromFunction(xNodes.length - 1 - from, nj, (i, j) => {
    const x = xNodes[from + i]!;
    const y0 = flatWall ? flat : wall(x);
    return [x, y0 + ((HEIGHT - y0) * j) / nj];
  });
}

/** x_s: the level-0 grid line on the flat nearest below 1 - b - 0.1, and its column at a level. */
export function referenceStart(section: SymmetricSection, bevel: number, level: number) {
  const { xNodes } = gridLines(section, 0);
  let i0 = -1;
  for (let i = 0; i < xNodes.length; i++) {
    if (xNodes[i]! >= bevel && xNodes[i]! <= 1 - bevel - 0.1) i0 = i;
  }
  if (i0 < 0) throw new RangeError('no level-0 grid line on the flat below 1 - b - 0.1');
  return { xs: xNodes[i0]!, column: i0 * 2 ** level };
}

export interface Primitive {
  readonly rho: number;
  readonly u: number;
  readonly v: number;
  readonly p: number;
}

export interface SolveResult {
  readonly solver: Euler2D;
  readonly iterations: number;
  readonly residual: number;
  readonly change: number;
  readonly converged: boolean;
  readonly cd: number;
  /** Seconds over every session of the solve. */
  readonly seconds: number;
  /** How many times the solve was resumed from its checkpoint. */
  readonly resumed: number;
}

/**
 * Where a solve saves its state, so that a restart of the machine loses at
 * most `everySeconds` of it. The state is the cells' conserved variables
 * and the loop's counters (iterations, the last drag, the starting
 * residual); the solver keeps nothing else between iterations, so a
 * resumed solve follows the same iterates, to the bit, as one never
 * stopped. `abortAfterSave` is for the check of that only.
 */
export interface Checkpoint {
  readonly path: string;
  readonly everySeconds: number;
  readonly abortAfterSave?: boolean;
}

/**
 * 9.7's solver on a grid: HLLC, van Albada, shared scaled reconstruction,
 * SSPRK2, CFL 0.8, local steps, a wall below and outflow above and behind;
 * a uniform inflow (9.7, 9.13) or one state per row on a faceStates side
 * (9.15), every cell started from the inflow (its row's state).
 */
export function makeSolver(grid: StructuredGrid, inflow: Primitive | readonly Primitive[]): Euler2D {
  const s = new Euler2D({
    grid,
    geometry: 'planar',
    gamma: GAMMA,
    flux: 'hllc',
    limiter: 'vanAlbada',
    reconstruction: 'sharedScaled',
    timeIntegrator: 'ssprk2',
    cfl: 0.8,
    timeStepping: 'local',
    boundaries: {
      iMin: Array.isArray(inflow) ? { kind: 'faceStates', states: inflow } : { kind: 'inflow', state: inflow as Primitive },
      iMax: { kind: 'outflow' },
      jMin: { kind: 'wall' },
      jMax: { kind: 'outflow' },
    },
  });
  if (Array.isArray(inflow)) {
    const rows = inflow as readonly Primitive[];
    s.setCellPrimitives((_, j) => rows[j]!);
  } else {
    const uniform = inflow as Primitive;
    s.setInitialCondition(() => uniform);
  }
  return s;
}

/** 9.7's solve: HLLC, van Albada, shared scaled reconstruction, SSPRK2, CFL 0.8, local steps; its stopping rule and cap. */
export function solveEuler(
  grid: StructuredGrid,
  inflow: Primitive | readonly Primitive[],
  mach: number,
  level: number,
  checkpoint?: Checkpoint,
): SolveResult {
  const q = 0.5 * GAMMA * mach * mach;
  const s = makeSolver(grid, inflow);
  let r0 = s.densityResidualNorm();
  const drag = () => {
    let d = 0;
    for (const f of s.boundaryFluxes('jMin')) {
      const p = f.flux[1] * f.nx + f.flux[2] * f.ny;
      d += (p - 1) * f.nx * f.area;
    }
    return (2 * d) / q;
  };
  let previous = NaN;
  let its = 0;
  let earlier = 0;
  let resumed = 0;
  if (checkpoint !== undefined && existsSync(checkpoint.path)) {
    const b = readFileSync(checkpoint.path);
    const all = new Float64Array(b.byteLength / 8);
    for (let i = 0; i < all.length; i++) all[i] = b.readDoubleLE(8 * i);
    const n = all[5]!;
    if (all.length !== 6 + n) throw new Error(`${checkpoint.path} is cut: ${all.length} values, ${6 + n} expected`);
    its = all[0]!;
    previous = all[1]!;
    r0 = all[2]!;
    earlier = all[3]!;
    resumed = all[4]! + 1;
    s.setConserved(all.slice(6));
  }
  const t0 = performance.now();
  let lastSave = t0;
  const save = () => {
    if (checkpoint === undefined || performance.now() - lastSave < 1000 * checkpoint.everySeconds) return;
    const state = s.conserved();
    const all = new Float64Array(6 + state.length);
    all.set([its, previous, r0, earlier + (performance.now() - t0) / 1000, resumed, state.length]);
    all.set(state, 6);
    writeFileSync(checkpoint.path + '.tmp', new Uint8Array(all.buffer));
    renameSync(checkpoint.path + '.tmp', checkpoint.path);
    lastSave = performance.now();
    if (checkpoint.abortAfterSave) throw new Error('aborted after a save (the check of resuming)');
  };
  const chunk = 100 * 2 ** level;
  const sub = 100;
  const cap = 40000 * 2 ** level;
  let res = NaN;
  let change = NaN;
  let d = NaN;
  for (;;) {
    // Iterations in steps of 100 up to the next multiple of the chunk: the
    // same iterates as one call of `chunk` iterations, with a save between.
    const end = its + chunk - (its % chunk);
    while (its < end) {
      const n = Math.min(sub, end - its);
      s.iterate(n);
      its += n;
      if (its < end) save();
    }
    d = drag();
    res = s.densityResidualNorm() / r0;
    change = Math.abs(d / previous - 1);
    previous = d;
    if ((res < 1e-11 && change < 1e-11) || its >= cap) break;
    save();
  }
  return {
    solver: s,
    iterations: its,
    residual: res,
    change,
    converged: res < 1e-11 && change < 1e-11,
    cd: d,
    seconds: Math.round(earlier + (performance.now() - t0) / 1000),
    resumed,
  };
}

/** One wall face and its wall cell: the face's centre, pressure, length and outward normal, and the cell's p / rho^gamma. */
export interface WallFace {
  readonly x: number;
  readonly y: number;
  readonly p: number;
  readonly length: number;
  readonly nx: number;
  readonly K: number;
}

export function wallFaces(s: Euler2D): WallFace[] {
  return s.boundaryFluxes('jMin').map((f, i) => {
    const c = s.primitive(i, 0);
    return {
      x: f.x,
      y: f.y,
      p: f.flux[1] * f.nx + f.flux[2] * f.ny,
      length: f.area,
      nx: f.nx,
      K: c.p / c.rho ** GAMMA,
    };
  });
}

/** The free stream (pressure and density 1). */
export const freeStream = (mach: number): Primitive => ({ rho: 1, u: mach * Math.sqrt(GAMMA), v: 0, p: 1 });

/** Shock-expansion's flat and bevel pressures and the shock's entropy, with the reflections neglected. */
export function shockExpansionState(theta: number, bevel: number, mach: number) {
  const se = exactSectionDrag(sectionOf(theta, bevel), mach, { neglectReflectedWaves: true });
  const sh = obliqueShock(mach, theta * DEG, GAMMA);
  return {
    cdSE: se.cd,
    p2: se.upper.faces[1]!.pressureRatio,
    p3: se.upper.faces[2]!.pressureRatio,
    Kshock: sh.pressureRatio / sh.densityRatio ** GAMMA,
  };
}

/**
 * The reference's inflow (9.13): pressure p2, entropy K, the free stream's
 * total enthalpy, along x; and its exact bevel pressure, the Prandtl-Meyer
 * expansion of that state by the half-angle.
 */
export function referenceInflow(theta: number, mach: number, p2: number, K: number) {
  const h0 = GAMMA / (GAMMA - 1) + (GAMMA * mach * mach) / 2;
  const rho = (p2 / K) ** (1 / GAMMA);
  const a2 = (GAMMA * p2) / rho;
  const V = Math.sqrt(2 * (h0 - a2 / (GAMMA - 1)));
  const M = V / Math.sqrt(a2);
  const M3 = machFromPrandtlMeyer(prandtlMeyer(M, GAMMA) + theta * DEG, GAMMA);
  const p3 = p2 * ((1 + 0.5 * (GAMMA - 1) * M * M) / (1 + 0.5 * (GAMMA - 1) * M3 * M3)) ** (GAMMA / (GAMMA - 1));
  return { state: { rho, u: V, v: 0, p: p2 } as Primitive, mach: M, p3 };
}

/** 9.13's windows. */
export const bevelWindow = (b: number) => [1 - 0.75 * b, 1 - 0.25 * b] as const;
export const flatWindow = (landing: number, b: number) => [landing, 1 - 1.25 * b] as const;
/** Where the reference's entropy is sampled: wall cells with centres on the flat from x_s to 1 - 1.25 b. */
export const entropyStretch = (xs: number, b: number) => [xs, 1 - 1.25 * b] as const;

/** The cell states of a solve's column i (one per row), with each cell's p / rho^gamma. */
export function columnStates(s: Euler2D, i: number) {
  const out: { j: number; rho: number; u: number; v: number; p: number; K: number }[] = [];
  for (let j = 0; ; j++) {
    let c: Primitive;
    try {
      c = s.primitive(i, j);
    } catch {
      break;
    }
    out.push({ j, rho: c.rho, u: c.u, v: c.v, p: c.p, K: c.p / c.rho ** GAMMA });
  }
  return out;
}
