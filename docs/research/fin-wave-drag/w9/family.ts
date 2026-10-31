/**
 * W9(a)'s family as 0009 section 9 registers it (with 9.12's rulings): the
 * grid, a case's levels by the planar method of characteristics, the
 * criteria of 9.5, the candidate cells and the band of 9.6, and the check
 * points. Shared by the runs in this folder.
 */

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { exactSectionDrag } from '../../../../src/fins/section-drag';
import { hexagonal, type SymmetricSection } from '../../../../src/fins/section';
import { obliqueShock } from '../../../../src/validation/gas-dynamics';
import {
  CharacteristicsFailure,
  hexagonCharacteristics,
  type TraceInterpolation,
} from '../../../../src/validation/planar-characteristics';

export const DEG = Math.PI / 180;
/** 9.4's grid: half-angle (deg), bevel over chord, Mach number. */
export const THETA = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;
export const BEVEL = Array.from({ length: 12 }, (_, k) => 0.01 * 2 ** (k / 2));
export const MACH = [1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0] as const;
/** 9.7's Euler cases. */
export const E_CASES: Record<string, { section: SymmetricSection; mach: number; theta: number; bevel: number }> = {
  E1: { section: hexagonal(0.08, 0.15), mach: 2.0, theta: Math.atan(0.04 / 0.15) / DEG, bevel: 0.15 },
  E2: { section: hexagonal(2 * 0.12 * Math.tan(15 * DEG), 0.12), mach: 1.8, theta: 15, bevel: 0.12 },
  E3: { section: hexagonal(2 * 0.1 * Math.tan(15 * DEG), 0.1), mach: 3.0, theta: 15, bevel: 0.1 },
};
/** 9.5's levels. */
export const LEVELS = [16, 32, 64, 128, 256] as const;
/** 9.4's ruling: no cell with a corner below this Mach number behind the shock is served. */
export const NEAR_SONIC = 1.1;

/** Mach number behind the straight leading-edge shock, or undefined where there is no attached supersonic solution. */
export function behindShock(theta: number, mach: number): number | undefined {
  try {
    const m = obliqueShock(mach, theta * DEG, 1.4).downstreamMach;
    return m > 1 ? m : undefined;
  } catch {
    return undefined;
  }
}

/** The library's shock-expansion value with the reflections neglected, and its verdict. */
export function shockExpansion(theta: number, bevel: number, mach: number) {
  const r = exactSectionDrag(hexagonal(2 * bevel * Math.tan(theta * DEG), bevel), mach, {
    neglectReflectedWaves: true,
  });
  return { cd: r.cd, exact: r.exact, firstReflection: r.upper.firstReflection };
}

export interface Level {
  readonly N: number;
  readonly eps: number | null;
  readonly mass: number | null;
  readonly stepLines?: number;
  readonly rearLines?: number;
  readonly ms?: number;
  readonly failure?: string;
}

/** One solve: a case at one level with one interpolation. */
export function solve(
  theta: number,
  bevel: number,
  mach: number,
  N: number,
  interpolation: TraceInterpolation,
  cdSE: number,
): Level {
  const t0 = performance.now();
  try {
    const s = hexagonCharacteristics(mach, theta * DEG, bevel, N, { interpolation });
    return {
      N,
      eps: s.cd / cdSE - 1,
      mass: s.massBalance,
      stepLines: s.stepLines,
      rearLines: s.rearLines,
      ms: Math.round(performance.now() - t0),
    };
  } catch (e) {
    if (!(e instanceof CharacteristicsFailure)) throw e;
    return { N, eps: null, mass: null, failure: e.message, ms: Math.round(performance.now() - t0) };
  }
}

export interface Judgement {
  readonly pass: boolean;
  readonly why: string;
  readonly value: number | null;
  readonly U: number | null;
  /** The order used, log2(d_128 / d_256), and the coarser ones, log2(d_32 / d_64) and log2(d_64 / d_128). */
  readonly order: number | null;
  readonly coarseOrders: readonly (number | null)[];
}

const order = (a: number, b: number) => (a * b > 0 ? Math.log2(a / b) : null);

/** 9.5: whether a case's five levels pass, its value and its uncertainty. */
export function judge95(levels: readonly Level[]): Judgement {
  const failed = levels.find((l) => l.failure !== undefined || l.eps === null);
  if (failed !== undefined) {
    return { pass: false, why: `N = ${failed.N} stops: ${failed.failure}`, value: null, U: null, order: null, coarseOrders: [] };
  }
  const eps = levels.map((l) => l.eps!);
  const d = [NaN, eps[1]! - eps[0]!, eps[2]! - eps[1]!, eps[3]! - eps[2]!, eps[4]! - eps[3]!];
  const [d32, d64, d128, d256] = [d[1]!, d[2]!, d[3]!, d[4]!];
  const m128 = levels[3]!.mass!;
  const m256 = levels[4]!.mass!;
  const p = order(d128, d256);
  const coarseOrders = [order(d32, d64), order(d64, d128)];
  const U = 2 * Math.abs(d256) + 1e-6;
  const reasons: string[] = [];
  if (!(m256 <= m128 / 2 || (m256 < 1e-9 && m128 < 1e-9))) {
    reasons.push(`mass balance ${m128.toExponential(2)} to ${m256.toExponential(2)}, not halved`);
  }
  const a = Math.abs(d256) <= 1e-6 && Math.abs(d128) <= 4e-6;
  const b = p !== null && p >= 0.8 && p <= 3.0 && Math.abs(d256) <= 1e-4;
  if (!(a || b)) {
    reasons.push(
      `changes ${d128.toExponential(2)}, ${d256.toExponential(2)}: neither (a) nor (b)` +
        (p === null ? ' (signs differ)' : ` (order ${p.toFixed(2)})`),
    );
  }
  const tiny = [d64, d128, d256].every((v) => Math.abs(v) < 1e-12);
  if (!(tiny || (Math.abs(d64) >= Math.abs(d128) && Math.abs(d128) >= Math.abs(d256)))) {
    reasons.push(`changes do not shrink: ${[d64, d128, d256].map((v) => v.toExponential(2)).join(', ')}`);
  }
  return {
    pass: reasons.length === 0,
    why: reasons.length === 0 ? (a ? 'passes by (a)' : 'passes by (b)') : reasons.join('; '),
    value: eps[4]!,
    U,
    order: p,
    coarseOrders,
  };
}

/** A case's five levels with one interpolation, each solve logged (and reused on a restart). */
export function levelsOf(
  key: string,
  theta: number,
  bevel: number,
  mach: number,
  interpolation: TraceInterpolation,
  cdSE: number,
  log: SolveLog,
): Level[] {
  return LEVELS.map((N) => {
    const k = `${key}|${interpolation}|${N}`;
    const hit = log.get(k);
    if (hit !== undefined) return hit;
    const l = solve(theta, bevel, mach, N, interpolation, cdSE);
    log.put(k, l);
    return l;
  });
}

/** The per-solve log: one line per solve, so a restart loses at most the solve in progress. */
export class SolveLog {
  private readonly done = new Map<string, Level>();
  constructor(private readonly path: string) {
    if (existsSync(path)) {
      for (const line of readFileSync(path, 'utf8').split('\n')) {
        if (line.trim() === '') continue;
        try {
          const r = JSON.parse(line) as { key: string; level: Level };
          this.done.set(r.key, r.level);
        } catch {
          // A line cut by a restart: its solve is run again.
        }
      }
    }
  }
  get(key: string): Level | undefined {
    return this.done.get(key);
  }
  put(key: string, level: Level): void {
    appendFileSync(this.path, JSON.stringify({ key, level }) + '\n');
    this.done.set(key, level);
  }
}

/** The lines of a jsonl file already written (a cut last line ignored). */
export function readJsonl<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  const out: T[] = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    try {
      out.push(JSON.parse(line) as T);
    } catch {
      // cut by a restart
    }
  }
  return out;
}

export const nodeKey = (i: number, j: number, k: number) => `${i}|${j}|${k}`;

/** One line of nodes.jsonl. */
export interface NodeRecord {
  readonly key: string;
  readonly theta: number;
  readonly bevel: number;
  readonly mach: number;
  readonly m1: number;
  readonly libraryExact: boolean;
  readonly cdSE: number;
  readonly levels: readonly Level[];
  readonly judgement: Judgement;
  /** The nu diagnostic (9.12). */
  readonly nu: { readonly levels: readonly Level[]; readonly judgement: Judgement };
  readonly nuConverged: boolean;
  /** Where both converged: whether they agree within the larger U; null where they cannot be compared. */
  readonly nuAgrees: boolean | null;
  /** For a hexagon the library calls exact: whether |eps| <= 1e-12 at every level (9.4); null otherwise. */
  readonly exactHolds: boolean | null;
  readonly commit: string;
}

/** The cell index of v in a grid, the last cell taking its upper face; -1 outside. */
export function cellIndex(grid: readonly number[], v: number): number {
  if (!(v >= grid[0]! && v <= grid[grid.length - 1]!)) return -1;
  for (let i = 0; i < grid.length - 2; i++) if (v < grid[i + 1]!) return i;
  return grid.length - 2;
}

export interface Cell {
  readonly i: number;
  readonly j: number;
  readonly k: number;
  readonly corners: readonly NodeRecord[];
  readonly epsLo: number;
  readonly epsHi: number;
}

/** 9.6's band of a cell from its corners: the envelope of eps -+ U, widened by 5e-4, rounded outward to 1e-3. */
export function cellBand(corners: readonly NodeRecord[]): { epsLo: number; epsHi: number } {
  const lo = Math.min(...corners.map((c) => c.judgement.value! - c.judgement.U!)) - 5e-4;
  const hi = Math.max(...corners.map((c) => c.judgement.value! + c.judgement.U!)) + 5e-4;
  return { epsLo: Math.floor(lo / 1e-3) * 1e-3, epsHi: Math.ceil(hi / 1e-3) * 1e-3 };
}

/** 9.6's candidate cells: eight corners computed, passing 9.5, with Mach 1.1 or more behind the shock. */
export function candidateCells(nodes: ReadonlyMap<string, NodeRecord>): Cell[] {
  const cells: Cell[] = [];
  for (let i = 0; i + 1 < THETA.length; i++) {
    for (let j = 0; j + 1 < BEVEL.length; j++) {
      for (let k = 0; k + 1 < MACH.length; k++) {
        const corners: NodeRecord[] = [];
        for (const di of [0, 1]) {
          for (const dj of [0, 1]) {
            for (const dk of [0, 1]) {
              const n = nodes.get(nodeKey(i + di, j + dj, k + dk));
              if (n !== undefined) corners.push(n);
            }
          }
        }
        if (corners.length !== 8) continue;
        if (!corners.every((c) => c.judgement.pass && c.m1 >= NEAR_SONIC)) continue;
        cells.push({ i, j, k, corners, ...cellBand(corners) });
      }
    }
  }
  return cells;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface CheckPoint {
  readonly id: string;
  readonly kind: 'population' | 'random' | 'centre';
  readonly theta: number;
  readonly bevel: number;
  readonly mach: number;
  readonly cell: readonly [number, number, number];
}

/** 9.6's check points (ii) and (iii) over the candidate cells, in their (theta, b, M) index order. */
export function drawnCheckPoints(cells: readonly Cell[]): CheckPoint[] {
  const sorted = [...cells].sort((a, b) => a.i - b.i || a.j - b.j || a.k - b.k);
  const out: CheckPoint[] = [];
  const rand = mulberry32(20261030);
  for (let n = 0; n < 200; n++) {
    const c = sorted[Math.floor(rand() * sorted.length)]!;
    const theta = THETA[c.i]! + rand() * (THETA[c.i + 1]! - THETA[c.i]!);
    const lnb = Math.log(BEVEL[c.j]!) + rand() * (Math.log(BEVEL[c.j + 1]!) - Math.log(BEVEL[c.j]!));
    const mach = MACH[c.k]! + rand() * (MACH[c.k + 1]! - MACH[c.k]!);
    out.push({ id: `random-${n}`, kind: 'random', theta, bevel: Math.exp(lnb), mach, cell: [c.i, c.j, c.k] });
  }
  for (const c of sorted) {
    out.push({
      id: `centre-${c.i}-${c.j}-${c.k}`,
      kind: 'centre',
      theta: 0.5 * (THETA[c.i]! + THETA[c.i + 1]!),
      bevel: Math.exp(0.5 * (Math.log(BEVEL[c.j]!) + Math.log(BEVEL[c.j + 1]!))),
      mach: 0.5 * (MACH[c.k]! + MACH[c.k + 1]!),
      cell: [c.i, c.j, c.k],
    });
  }
  return out;
}
