// Throwaway: the two stages of a blunt family's start, ungated, with the
// quality of each grid and where it is worst. Env: SHAPE and its parameter,
// L, M, CYL, NJ, MARGIN (fraction over the captured shock), CELLS, TIPSMOOTH.
import { it } from 'vitest';
import { Euler2D } from '../../src/engine-cpu/euler2d';
import { freeStreamAt } from '../../src/analysis/verified-drag';
import { bluntBodyGrid, outerCellHeight, type BluntGrid } from '../../src/grid/blunt-grid';
import { FITTED_QUALITY_LIMITS, gridQuality, qualityFailures } from '../../src/grid/quality';
import { nodeIndex } from '../../src/grid/structured';
import { capturedShockHeights } from '../../src/solver/shock-fitting';
import { bodyFromEnv, gamma, idFromEnv, log } from './common';

const M = Number(process.env.M ?? 2);
const NJ = Number(process.env.NJ ?? 20);
const MARGIN = Number(process.env.MARGIN ?? 0.5);
const CELLS = Number(process.env.CELLS ?? 3);
const tuning = process.env.FANRATIO ? { fanRatio: Number(process.env.FANRATIO) } : {};
const id = `${idFromEnv()} nj${NJ} margin${MARGIN} cells${CELLS} ${JSON.stringify(tuning)}`;
const deg = (r: number) => (r * 180) / Math.PI;

function describe(name: string, g: BluntGrid, heights: readonly number[] | null) {
  const q = gridQuality(g.grid);
  const { ni, nj, x, y } = g.grid;
  const node = (i: number, j: number) => [x[nodeIndex(g.grid, i, j)]!, y[nodeIndex(g.grid, i, j)]!] as const;
  const width = (i: number, j: number) => {
    const [x0, y0] = node(i, j);
    const [x1, y1] = node(i + 1, j);
    return Math.hypot(x1 - x0, y1 - y0);
  };
  let worst = 1;
  let worstAt = '';
  for (let j = 0; j < nj; j++) {
    for (let i = 0; i + 1 < ni; i++) {
      const w0 = 0.5 * (width(i, j) + width(i, j + 1));
      const w1 = 0.5 * (width(i + 1, j) + width(i + 1, j + 1));
      const r = Math.max(w0 / w1, w1 / w0);
      if (r > worst) {
        worst = r;
        worstAt = `cells ${i}/${i + 1} row ${j} x=${node(i, 0)[0].toExponential(3)} (widths ${w0.toExponential(3)}, ${w1.toExponential(3)})`;
      }
    }
  }
  let worstH = 1;
  let worstHAt = '';
  for (let i = 0; i < ni; i++) {
    for (let j = 0; j + 1 < nj; j++) {
      const h = (jj: number) => {
        const [x0, y0] = node(i, jj);
        const [x1, y1] = node(i, jj + 1);
        const [x2, y2] = node(i + 1, jj);
        const [x3, y3] = node(i + 1, jj + 1);
        return 0.5 * (Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x3 - x2, y3 - y2));
      };
      const r = Math.max(h(j) / h(j + 1), h(j + 1) / h(j));
      if (r > worstH) {
        worstH = r;
        worstHAt = `column ${i} rows ${j}/${j + 1} x=${node(i, 0)[0].toExponential(3)}`;
      }
    }
  }
  log(
    `${id} ${name}: ${ni}x${nj}; standoff ${g.outerStandoff.toExponential(3)}; minAngle=${deg(q.minAngle).toFixed(1)} wall=${deg(q.minWallAngle).toFixed(1)} sizeRatio=${q.maxSizeRatio.toFixed(3)} aspect=${q.maxAspectRatio.toFixed(2)}; generated gates: ${qualityFailures(q).join('; ') || 'pass'}; fitted gates: ${qualityFailures(q, FITTED_QUALITY_LIMITS).join('; ') || 'pass'}; worst width ratio ${worst.toFixed(3)} at ${worstAt}; worst height ratio ${worstH.toFixed(3)} at ${worstHAt}${heights ? `; captured standoff ${heights[0]!.toExponential(4)} (${(heights[0]! / g.outerStandoff).toFixed(3)} of the boundary)` : ''}`,
  );
  let rep = '';
  for (let i = 0; i < Math.min(ni, Number(process.env.LINES ?? 14)); i++) {
    const [x0, y0] = node(i, 0);
    const [x1, y1] = node(i + 1, 0);
    const [x2, y2] = node(i, 1);
    const a = Math.acos(((x1 - x0) * (x2 - x0) + (y1 - y0) * (y2 - y0)) / (Math.hypot(x1 - x0, y1 - y0) * Math.hypot(x2 - x0, y2 - y0)));
    rep += `  line ${i} s~${Math.hypot(x0, y0).toExponential(2)} psi=${deg(Math.atan2(g.lines[i]!.dy, -g.lines[i]!.dx)).toFixed(1)} wallAngle=${deg(a).toFixed(1)} wallW=${width(i, 0).toExponential(2)} outerW=${width(i, nj).toExponential(2)} h=${g.lines[i]!.h.toExponential(3)}${heights ? ` h_s=${heights[i]!.toExponential(3)}` : ''}\n`;
  }
  log(rep);
  return q;
}

it(`stages ${id}`, () => {
  const body = bodyFromEnv();
  const R = body.nose.baseRadius;
  const free = freeStreamAt(M, gamma).state;
  const capture = (grid: BluntGrid) => {
    const solver = new Euler2D({
      grid: grid.grid,
      geometry: 'axisymmetric',
      gamma,
      flux: 'hllc',
      limiter: 'vanAlbada',
      reconstruction: 'sharedScaled',
      timeIntegrator: 'ssprk2',
      cfl: 0.8,
      timeStepping: 'local',
      boundaries: {
        iMin: { kind: 'wall' },
        iMax: { kind: 'outflow' },
        jMin: { kind: 'wall' },
        jMax: { kind: 'inflow', state: free },
      },
    });
    solver.setInitialCondition(() => free);
    solver.iterate(3000);
    const residual = solver.densityResidualNorm();
    const heights = capturedShockHeights(solver, grid.grid, grid.lines, free);
    let dev = 0;
    for (let i = 0; i < grid.grid.ni; i++) {
      const w = solver.primitive(i, grid.grid.nj - 1);
      dev = Math.max(dev, Math.abs(w.p - 1), Math.abs(w.rho - 1));
    }
    log(`${id}: captured residual ${residual.toExponential(2)}, outer row deviation ${dev.toExponential(2)}`);
    return heights;
  };
  const t0 = performance.now();
  const first = bluntBodyGrid(body, { nj: NJ, mach: M, gated: false, tuning });
  const h1 = capture(first);
  describe('first', first, h1);
  const distances = h1.map((shock) => {
    let d = (1 + MARGIN) * shock;
    for (let k = 0; k < 20; k++) d = Math.max(d, shock + CELLS * outerCellHeight(d, NJ, R));
    return d;
  });
  for (let pass = 0; pass < Number(process.env.SMOOTH ?? 50); pass++) {
    const copy = [...distances];
    const n = copy.length - 1;
    distances[0] = 0.5 * (copy[0]! + copy[1]!);
    for (let i = 1; i < n; i++) distances[i] = 0.25 * copy[i - 1]! + 0.5 * copy[i]! + 0.25 * copy[i + 1]!;
    distances[n] = 0.5 * (copy[n]! + copy[n - 1]!);
  }
  const outerBoundary = first.lines.map((l, i) => {
    const d = distances[i]!;
    return { x: l.x + d * l.dx, y: l.y + d * l.dy };
  });
  {
    const n = outerBoundary.length - 1;
    const a = outerBoundary[n - 2]!;
    const b = outerBoundary[n - 1]!;
    const last = first.lines[n]!;
    const y = b.y + ((last.x - b.x) * (b.y - a.y)) / (b.x - a.x);
    if (y > b.y) outerBoundary[n] = { x: last.x, y };
  }
  const second = bluntBodyGrid(body, { nj: NJ, mach: M, gated: false, outerBoundary, tuning });
  const h2 = capture(second);
  describe('second', second, h2);
  log(`${id}: stages in ${((performance.now() - t0) / 1000).toFixed(0)}s`);
});
