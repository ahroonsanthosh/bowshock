/**
 * The computed check of design record 0016 section 21.3 (registered there
 * before this was run): planar Euler solutions (src/engine-cpu/euler2d.ts,
 * HLLC, steady) of half a flat-faced plate above its mid-plane. The face is
 * x = 0 from the mid-plane (y = 0) to y = 1 (the half-thickness), its
 * corner rounded to a radius RHO, then the plate's side y = 1 downstream to
 * x = SIDE. Grid lines are the body's outward normals: horizontal from the
 * face, a fan from the rounding, vertical from the side, out to DMAX(M).
 * Three nested grids (cells halved each way); each finer grid starts from
 * the coarser solution.
 *
 * Reported per Mach number, radius and grid: on the straight face (y up to
 * 1 - RHO) the largest wall Mach number (first cells, and isentropic from
 * the wall pressure on p02) and the smallest and largest wall pressure over
 * p02; where the sonic point lies; the face's mean gauge pressure over the
 * pitot's over the whole height (face and rounding); the velocity gradient
 * at the stagnation point. Env: MACHS (e.g. 1.2,1.5,2,3), RADII (0.04,0.02),
 * LEVELS (0,1,2). Writes out/flat-face.jsonl (one line per solve).
 */
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { it } from 'vitest';
import { Euler2D } from '../../../src/engine-cpu/euler2d';
import { gridFromFunction, type StructuredGrid } from '../../../src/grid/structured';
import type { Primitive2D } from '../../../src/scheme/flux';
import { NonPhysicalStateError } from '../../../src/solver/errors';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'out', 'flat-face.jsonl');
const GAMMA = 1.4;
const P_STAR_OVER_P0 = (2 / (GAMMA + 1)) ** (GAMMA / (GAMMA - 1));

/** The plate's side behind the corner, half-thicknesses. */
const SIDE = 3;
/**
 * The wall's turn at the corner, deg: 90 is the plate (its side parallel to
 * the stream); less, a side inclined outward, which keeps the inviscid
 * expansion behind the corner moderate. The face lies upstream of the sonic
 * line, so its flow does not depend on the turn beyond it (0016 section
 * 21.3, checked with two turns).
 */
const TURN = Number(process.env.TURN ?? 90);
/** Far boundary's distance from the body, half-thicknesses: beyond the bow shock's stand-off. */
const DMAX: Record<string, number> = { '1.2': 30, '1.5': 12, '2': 8, '3': 6 };
/** Cells on the coarsest grid: along the face, around the rounding, along the side, outward. */
const N_FACE = Number(process.env.N_FACE ?? 16);
const N_ARC = Number(process.env.N_ARC ?? 4);
const N_SIDE = 16;
const N_OUT = 24;
/** Wall spacing outward on the middle grid, half-thicknesses. */
const WALL_SPACING_MIDDLE = 0.005;

/** Rayleigh's pitot pressure over the static. */
function pitotRatio(m: number): number {
  const g = GAMMA;
  return (
    ((((g + 1) * m * m) / 2) ** (g / (g - 1)) * ((g + 1) / (2 * g * m * m - (g - 1))) ** (1 / (g - 1)))
  );
}

/** k such that D k / (e^k - 1) / n = spacing (the first cell of an exponential stretch). */
function stretchExponent(d: number, n: number, spacing: number): number {
  const target = (spacing * n) / d;
  let lo = 1e-6;
  let hi = 50;
  for (let it = 0; it < 200; it++) {
    const k = 0.5 * (lo + hi);
    if (k / Math.expm1(k) > target) lo = k;
    else hi = k;
  }
  return 0.5 * (lo + hi);
}

interface Wall {
  readonly x: number;
  readonly y: number;
  readonly nx: number;
  readonly ny: number;
}

function grid(mach: number, rho: number, level: number): { grid: StructuredGrid; nFace: number; nArc: number } {
  const m = 2 ** level;
  const nFace = N_FACE * m;
  const nArc = N_ARC * m;
  const nSide = N_SIDE * m;
  const nj = N_OUT * m;
  const dmax = DMAX[String(mach)]!;
  const k = stretchExponent(dmax, 2 * N_OUT, WALL_SPACING_MIDDLE);
  const wall: Wall[] = [];
  // The face, clustered toward the corner: y = (1 - rho) (a s + (1 - a) sin(pi s / 2)).
  const a = 0.3;
  for (let i = 0; i <= nFace; i++) {
    const s = i / nFace;
    wall.push({ x: 0, y: (1 - rho) * (a * s + (1 - a) * Math.sin((Math.PI * s) / 2)), nx: -1, ny: 0 });
  }
  // The rounding turns the wall TURN deg from the face's direction (90: to the plate's side).
  const turn = (TURN * Math.PI) / 180;
  for (let i = 1; i <= nArc; i++) {
    const phi = Math.PI - turn * (i / nArc);
    wall.push({
      x: rho + rho * Math.cos(phi),
      y: 1 - rho + rho * Math.sin(phi),
      nx: Math.cos(phi),
      ny: Math.sin(phi),
    });
  }
  // The side, straight from the rounding's end along its tangent, clustered toward the corner.
  const phiEnd = Math.PI - turn;
  const end = wall[wall.length - 1]!;
  const tx = Math.sin(phiEnd);
  const ty = -Math.cos(phiEnd);
  const ks = 4;
  for (let i = 1; i <= nSide; i++) {
    const s = (SIDE - rho) * (Math.expm1((ks * i) / nSide) / Math.expm1(ks));
    wall.push({ x: end.x + tx * s, y: end.y + ty * s, nx: Math.cos(phiEnd), ny: Math.sin(phiEnd) });
  }
  const ni = wall.length - 1;
  const g = gridFromFunction(ni, nj, (i, j) => {
    const w = wall[i]!;
    const d = (dmax * Math.expm1((k * j) / nj)) / Math.expm1(k);
    return [w.x + w.nx * d, w.y + w.ny * d];
  });
  return { grid: g, nFace, nArc };
}

interface Measures {
  readonly maxCellMachFace: number;
  readonly maxIsentropicMachFace: number;
  readonly minPOverP02Face: number;
  readonly maxPOverP02Face: number;
  /** Where the wall first reaches p*: on the face (y), or on the rounding (its turn, deg). */
  readonly sonicAt: string;
  readonly faceMeanGauge: number;
  /** The face's mean absolute pressure over p02, face and rounding, over the half-height. */
  readonly faceMeanOverP02: number;
  /** Velocity gradient at the stagnation point, beta t / U (t = 2, the full thickness). */
  readonly betaTOverU: number;
  /** The wall pressure over p02 along the face, for the zone margin: [y, p/p02] at each wall face. */
  readonly wallProfile: readonly (readonly [number, number])[];
}

function measure(s: Euler2D, mach: number, rho: number, nFace: number, nArc: number): Measures {
  const p02 = pitotRatio(mach);
  const pInf = 1;
  const u = mach * Math.sqrt(GAMMA);
  const faces = s.boundaryFluxes('jMin');
  let maxCell = 0;
  let maxIse = 0;
  let minP = Infinity;
  let maxP = 0;
  let sonicAt = 'not reached on the face or rounding';
  let force = 0;
  const profile: [number, number][] = [];
  for (let t = 0; t < nFace + nArc; t++) {
    const f = faces[t]!;
    const p = f.flux[1] * f.nx + f.flux[2] * f.ny;
    const c = s.primitive(t, 0);
    const cellMach = Math.hypot(c.u, c.v) / Math.sqrt((GAMMA * c.p) / c.rho);
    const ise = Math.sqrt(((p02 / p) ** ((GAMMA - 1) / GAMMA) - 1) * (2 / (GAMMA - 1)));
    if (f.nx > 1e-12) force += (p - pInf) * f.nx * f.area;
    profile.push([f.y, p / p02]);
    if (sonicAt.startsWith('not') && p <= P_STAR_OVER_P0 * p02) {
      sonicAt =
        t < nFace
          ? `on the face at y ${f.y.toFixed(4)}`
          : `on the rounding, ${(180 - (Math.atan2(f.y - (1 - rho), f.x - rho) * 180) / Math.PI).toFixed(1)} deg into its turn`;
    }
    if (t < nFace) {
      maxCell = Math.max(maxCell, cellMach);
      maxIse = Math.max(maxIse, Number.isFinite(ise) ? ise : 0);
      minP = Math.min(minP, p / p02);
      maxP = Math.max(maxP, p / p02);
    }
  }
  // The stagnation point's velocity gradient: v = beta y through the first three wall cells.
  let num = 0;
  let den = 0;
  for (let t = 0; t < 3; t++) {
    const c = s.primitive(t, 0);
    const y = faces[t]!.y;
    num += c.v * y;
    den += y * y;
  }
  const beta = num / den;
  return {
    maxCellMachFace: maxCell,
    maxIsentropicMachFace: maxIse,
    minPOverP02Face: minP,
    maxPOverP02Face: maxP,
    sonicAt,
    faceMeanGauge: force / (p02 - pInf),
    faceMeanOverP02: (force + pInf) / p02,
    betaTOverU: (beta * 2) / u,
    wallProfile: profile,
  };
}

it('flat-faced plate, planar Euler, nested grids', () => {
  mkdirSync(dirname(OUT), { recursive: true });
  const machs = (process.env.MACHS ?? '1.2,1.5,2,3').split(',').map(Number);
  const radii = (process.env.RADII ?? '0.04,0.02').split(',').map(Number);
  const levels = (process.env.LEVELS ?? '0,1,2').split(',').map(Number);
  for (const mach of machs) {
    for (const rho of radii) {
      const free: Primitive2D = { rho: 1, u: mach * Math.sqrt(GAMMA), v: 0, p: 1 };
      let previous: { solver: Euler2D; level: number } | undefined;
      for (const level of levels) {
        const { grid: g, nFace, nArc } = grid(mach, rho, level);
        const s = new Euler2D({
          grid: g,
          geometry: 'planar',
          gamma: GAMMA,
          flux: (process.env.FLUX ?? 'hllc') as 'hllc' | 'hll' | 'rotatedHybrid' | 'rusanov',
          limiter: (process.env.LIMITER ?? 'vanAlbada') as 'vanAlbada' | 'minmod' | 'firstOrder' | 'vanLeer',
          reconstruction: (process.env.RECON ?? 'sharedScaled') as 'sharedScaled' | 'perVariable' | 'shared',
          timeIntegrator: 'ssprk2',
          cfl: 0.5,
          timeStepping: 'local',
          boundaries: {
            iMin: { kind: 'wall' },
            iMax: { kind: 'outflow' },
            jMin: { kind: 'wall' },
            jMax: { kind: 'farField', state: free },
          },
        });
        if (previous === undefined) s.setInitialCondition(() => free);
        else {
          const from = previous.solver;
          const r = 2 ** (level - previous.level);
          s.setCellPrimitives((i, j) => from.primitive(Math.floor(i / r), Math.floor(j / r)));
        }
        const t0 = performance.now();
        const r0 = s.densityResidualNorm();
        let steps = 0;
        let cfl = previous === undefined ? 0.5 : 2;
        let last = NaN;
        let change = NaN;
        let note = '';
        const byLevel = (process.env.MAX_STEPS_BY_LEVEL ?? '').split(',').filter((x) => x !== '');
        const maxSteps = Number(byLevel[level] ?? process.env.MAX_STEPS ?? 30000);
        // The envelope over the last half of the iterations: where a solve does not settle, the
        // face's extremes over its oscillation (0016 section 21.3).
        const env = {
          samples: 0,
          maxIsentropicMachFace: 0,
          maxCellMachFace: 0,
          minPOverP02Face: Infinity,
          maxPOverP02Face: 0,
          faceMeanMin: Infinity,
          faceMeanMax: -Infinity,
          sonicAt: new Set<string>(),
        };
        const cflMax = Number(process.env.CFL_MAX ?? 20);
        const scheme = process.env.SCHEME ?? 'block';
        for (;;) {
          try {
            if (scheme === 'explicit') s.iterate(100);
            else if (scheme === 'lusgs') s.iterateImplicit(100, cfl);
            else s.iterateBlockImplicit(100, cfl);
          } catch (e) {
            if (!(e instanceof NonPhysicalStateError)) throw e;
            note = `non-physical state at ${steps} steps: ${e.message}`;
            break;
          }
          steps += 100;
          cfl = Math.min(cflMax, cfl * 1.5);
          const now = measure(s, mach, rho, nFace, nArc);
          const mean = now.faceMeanGauge;
          if (steps > maxSteps / 2) {
            env.samples++;
            env.maxIsentropicMachFace = Math.max(env.maxIsentropicMachFace, now.maxIsentropicMachFace);
            env.maxCellMachFace = Math.max(env.maxCellMachFace, now.maxCellMachFace);
            env.minPOverP02Face = Math.min(env.minPOverP02Face, now.minPOverP02Face);
            env.maxPOverP02Face = Math.max(env.maxPOverP02Face, now.maxPOverP02Face);
            env.faceMeanMin = Math.min(env.faceMeanMin, mean);
            env.faceMeanMax = Math.max(env.faceMeanMax, mean);
            env.sonicAt.add(now.sonicAt.replace(/[\d.]+ deg/, (d) => `${Math.round(parseFloat(d))} deg`));
          }
          change = Math.abs(mean - last);
          last = mean;
          const res = s.densityResidualNorm() / r0;
          if (process.env.TRACE !== undefined && steps % 1000 === 0) {
            // Where the residual is largest, and the outflow column's least streamwise velocity.
            const rv = s.residualVector();
            let worst = 0;
            let at = [0, 0];
            for (let j = 0; j < g.nj; j++) {
              for (let i = 0; i < g.ni; i++) {
                const v = Math.abs(rv[4 * (i + j * g.ni)]!) / s.metrics.volume[i + j * g.ni]!;
                if (v > worst) {
                  worst = v;
                  at = [i, j];
                }
              }
            }
            let minU = Infinity;
            let minP = Infinity;
            for (let j = 0; j < g.nj; j++) minU = Math.min(minU, s.primitive(g.ni - 1, j).u);
            for (let j = 0; j < g.nj; j++) for (let i = 0; i < g.ni; i++) minP = Math.min(minP, s.primitive(i, j).p);
            const k = at[0]! + at[1]! * (g.ni + 1);
            appendFileSync(
              OUT.replace('.jsonl', '-trace.jsonl'),
              JSON.stringify({ mach, rho, turn: TURN, recon: process.env.RECON, limiter: process.env.LIMITER, level, steps, cfl, res, mean, worstCell: at, worstX: g.x[k], worstY: g.y[k], minUOutflow: minU, minP }) + '\n',
            );
          }
          if ((change < 1e-8 && res < 1e-9) || steps >= maxSteps) break;
        }
        const m = measure(s, mach, rho, nFace, nArc);
        // Along the grid line from the rounding's end, outward: the flow's Mach number normal to
        // the line (the line's own normal points downstream), its least value, and where.
        const lineMach: { j: number; x: number; y: number; normalMach: number }[] = [];
        {
          const i = nFace + nArc;
          for (let j = 0; j < g.nj; j++) {
            const c = s.primitive(i, j);
            const k0 = i + j * (g.ni + 1);
            const k1 = i + (j + 1) * (g.ni + 1);
            // The line's direction, and the normal pointing to larger i.
            const dx = g.x[k1]! - g.x[k0]!;
            const dy = g.y[k1]! - g.y[k0]!;
            const len = Math.hypot(dx, dy);
            const nx = dy / len;
            const ny = -dx / len;
            const a = Math.sqrt((GAMMA * c.p) / c.rho);
            lineMach.push({ j, x: g.x[k0]!, y: g.y[k0]!, normalMach: (c.u * nx + c.v * ny) / a });
          }
        }
        const leastLine = lineMach.reduce((a, b) => (b.normalMach < a.normalMach ? b : a));
        appendFileSync(
          OUT,
          JSON.stringify({
            mach,
            rho,
            turn: TURN,
            flux: process.env.FLUX ?? 'hllc',
            reconstruction: process.env.RECON ?? 'sharedScaled',
            limiter: process.env.LIMITER ?? 'vanAlbada',
            level,
            ni: g.ni,
            nj: g.nj,
            steps,
            residual: s.densityResidualNorm() / r0,
            lastChange: change,
            seconds: Math.round((performance.now() - t0) / 1000),
            note,
            pStarOverP02: P_STAR_OVER_P0,
            envelope: { ...env, sonicAt: [...env.sonicAt] },
            leastNormalMachOnRoundingEndLine: leastLine,
            roundingEndLine: lineMach.map((q) => [Number(q.y.toFixed(3)), Number(q.normalMach.toFixed(3))]),
            ...m,
          }) + '\n',
        );
        previous = { solver: s, level };
      }
    }
  }
});
