/**
 * Planar Euler (src/engine-cpu/euler2d.ts) solution of half a symmetric
 * sharp section above its symmetry plane, on nested grids, against
 * shock-expansion theory. One solve at a time. Env: CASE (dw or hex),
 * LEVELS (e.g. 0,1,2).
 */
import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { Euler2D } from '../../src/engine-cpu/euler2d';
import { gridFromFunction } from '../../src/grid/structured';
import { doubleWedge, hexagonal, type SymmetricSection } from '../../src/fins/section';
import { ackeretSectionDrag, exactSectionDrag } from '../../src/fins/section-drag';

const OUT = 'tests/tmp-fins/euler.jsonl';
const log = (o: object) => appendFileSync(OUT, JSON.stringify(o) + '\n');
const gamma = 1.4;

const CASES: Record<string, { section: SymmetricSection; mach: number }> = {
  dw: { section: doubleWedge(0.08), mach: 1.5 },
  hex: { section: hexagonal(0.08, 0.15), mach: 2 },
};

const X_MIN = -0.3;
const X_MAX = 1.2;
const HEIGHT = 1.4;
const H0 = 0.025; // base cell length in x
const NJ0 = 28;

function grid(section: SymmetricSection, level: number) {
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
  const ni = xNodes.length - 1;
  const nj = NJ0 * m;
  return gridFromFunction(ni, nj, (i, j) => {
    const x = xNodes[i]!;
    const y0 = wall(x);
    return [x, y0 + ((HEIGHT - y0) * j) / nj];
  });
}

it('planar Euler section drag on nested grids', () => {
  const name = process.env.CASE ?? 'dw';
  const { section, mach } = CASES[name]!;
  const free = { rho: 1, u: mach * Math.sqrt(gamma), v: 0, p: 1 };
  const q = 0.5 * gamma * mach * mach;
  const se = exactSectionDrag(section, mach, { neglectReflectedWaves: true });
  log({ case: name, mach, shockExpansion: se.cd, exact: se.exact, firstReflection: se.upper.firstReflection, ackeret: ackeretSectionDrag(section, mach) });
  for (const level of (process.env.LEVELS ?? '0,1,2').split(',').map(Number)) {
    const g = grid(section, level);
    const s = new Euler2D({
      grid: g,
      geometry: 'planar',
      gamma,
      flux: 'hllc',
      limiter: 'vanAlbada',
      reconstruction: 'sharedScaled',
      timeIntegrator: 'ssprk2',
      cfl: 0.8,
      timeStepping: 'local',
      boundaries: {
        iMin: { kind: 'inflow', state: free },
        iMax: { kind: 'outflow' },
        jMin: { kind: 'wall' },
        jMax: { kind: 'outflow' },
      },
    });
    s.setInitialCondition(() => free);
    const r0 = s.densityResidualNorm();
    // Both surfaces: twice the upper half's drag.
    const drag = () => {
      let d = 0;
      for (const f of s.boundaryFluxes('jMin')) {
        const p = f.flux[1] * f.nx + f.flux[2] * f.ny;
        d += (p - 1) * f.nx * f.area;
      }
      return (2 * d) / q;
    };
    const t0 = performance.now();
    let previous = NaN;
    let its = 0;
    const chunk = 100 * 2 ** level;
    for (;;) {
      s.iterate(chunk);
      its += chunk;
      const d = drag();
      const res = s.densityResidualNorm() / r0;
      const change = Math.abs(d / previous - 1);
      previous = d;
      if ((res < 1e-11 && change < 1e-11) || its >= 40000 * 2 ** level) {
        log({ case: name, level, ni: g.ni, nj: g.nj, iterations: its, residual: res, change, cd: d, overSE: d / se.cd - 1, seconds: Math.round((performance.now() - t0) / 1000) });
        break;
      }
    }
  }
});
