// W6 build (copied from docs/research/two-scale-noses/runners/tmp-haackmoc/fitdata.ts,
// unchanged below this header). A saved fitted solution of a blunt family (fitsave.test.ts or
// the queue's checkpoint) rebuilt on its grid, and the flow on its grid
// lines, as tests/tmp-lowblunt/fitdata.ts at main (the measurement of
// docs/design/0006-shock-fitting.md): each row of cells interpolated
// across the line (cubic through the four nearest centroids, in their
// signed distance from it), the row next to the wall left out, the wall
// pressure that of the wall faces (cubic in x), the wall entropy
// extrapolated (cubic) from the next four rows, the shock node, its angle
// from the three nodes about it.
import { readFileSync } from 'node:fs';
import { bluntFitProblem } from '../../src/analysis/fitted-flow';
import { pressureDragFromProfile } from '../../src/analysis/forces';
import { Euler2D } from '../../src/engine-cpu/euler2d';
import { bodyRadius, type Body } from '../../src/geometry/body';
import { gridOnLines } from '../../src/grid/blunt-grid';
import type { StartingLine, StartingState } from '../../src/validation/characteristics';
import { normalShock } from '../../src/validation/gas-dynamics';

export const gamma = 1.4;

export interface Fit {
  body: Body;
  ni: number;
  nj: number;
  drag: number;
  freeStream: { rho: number; u: number; v: number; p: number };
  lines: { x: number; y: number; dx: number; dy: number }[];
  heights: number[];
  centroidX: Float64Array;
  centroidY: Float64Array;
  cells: Float64Array;
  wall: { x: number; y: number; nx: number; ny: number; area: number; flux: number[] }[];
}

/** The saved state `file` (.bin and .json) of the family's grid of refinement r. */
export function loadFit(body: Body, mach: number, r: number, file: string): Fit {
  const head = JSON.parse(readFileSync(`${file}.json`, 'utf8')) as {
    heights: number[];
    ni: number;
    nj: number;
  };
  const cells = new Float64Array(readFileSync(`${file}.bin`).buffer.slice(0));
  const problem = bluntFitProblem(body, {
    mach,
    gamma,
    nj: 20,
    refinement: r,
    gated: false,
  } as Parameters<typeof bluntFitProblem>[1]);
  const ni = problem.lines.length - 1;
  if (head.ni !== ni || head.nj !== problem.nj) throw new Error('saved state of another grid');
  const grid = gridOnLines(problem.lines, head.heights, problem.nj, problem.baseRadius, false);
  const solver = new Euler2D(problem.configFor(grid, []));
  solver.setCellPrimitives((i, j) => {
    const k = 4 * (i + j * ni);
    return { rho: cells[k]!, u: cells[k + 1]!, v: cells[k + 2]!, p: cells[k + 3]! };
  });
  const faces = solver.boundaryFluxes('jMin');
  return {
    body: { ...body, cylinderLength: Math.max(body.cylinderLength, 2 * body.nose.baseRadius) },
    ni,
    nj: problem.nj,
    drag: problem.drag(faces),
    freeStream: problem.freeStream as Fit['freeStream'],
    lines: problem.lines.map((l) => ({ x: l.x, y: l.y, dx: l.dx, dy: l.dy })),
    heights: head.heights,
    centroidX: solver.metrics.centroidX as Float64Array,
    centroidY: solver.metrics.centroidY as Float64Array,
    cells,
    wall: faces.map((f) => ({ x: f.x, y: f.y, nx: f.nx, ny: f.ny, area: f.area, flux: [...f.flux] })),
  };
}

/** The Mach number at which the fitted solver runs: its free-stream speed is rounded to 32 bits. */
export const effectiveMach = (f: Fit) => f.freeStream.u / Math.sqrt(gamma);

/** The solver's forebody drag from the wall faces from node i on. */
export function fittedDragFrom(f: Fit, i: number): number {
  const q = 0.5 * f.freeStream.u ** 2;
  const R = f.body.nose.baseRadius;
  let force = 0;
  for (let t = i; t < f.wall.length; t++) {
    const w = f.wall[t]!;
    force += (w.flux[1]! - f.freeStream.p * w.nx) * w.area;
  }
  return (2 * force) / (q * R * R);
}

const lagrange = (ss: readonly number[], fs: readonly number[], s: number) => {
  let sum = 0;
  for (let a = 0; a < ss.length; a++) {
    let w = 1;
    for (let b = 0; b < ss.length; b++) if (b !== a) w *= (s - ss[b]!) / (ss[a]! - ss[b]!);
    sum += w * fs[a]!;
  }
  return sum;
};

export function lineData(f: Fit, i: number) {
  const { ni, nj } = f;
  if (!(i >= 2 && i <= ni - 2)) throw new RangeError('the line needs two columns of cells on either side');
  const l = f.lines[i]!;
  const rows: { t: number; rho: number; u: number; v: number; p: number }[] = [];
  for (let j = 0; j < nj; j++) {
    const cols = [i - 2, i - 1, i, i + 1];
    const ds: number[] = [];
    const ts: number[] = [];
    for (const c of cols) {
      const k = c + j * ni;
      const ex = f.centroidX[k]! - l.x;
      const ey = f.centroidY[k]! - l.y;
      ds.push(ex * l.dy - ey * l.dx);
      ts.push(ex * l.dx + ey * l.dy);
    }
    const at = (q: number) => lagrange(ds, cols.map((c) => f.cells[4 * (c + j * ni) + q]!), 0);
    rows.push({ t: lagrange(ds, ts, 0), rho: at(0), u: at(1), v: at(2), p: at(3) });
  }
  // The row next to the wall left out.
  const wallRow = rows.shift()!;
  const first4 = rows.slice(0, 4);
  const ext = (g: (r: (typeof rows)[number]) => number) =>
    lagrange(
      first4.map((r) => r.t),
      first4.map(g),
      0,
    );
  const k = (r: { rho: number; p: number }) => r.p / r.rho ** gamma;
  const faces = [i - 2, i - 1, i, i + 1].map((t) => f.wall[t]!);
  const pWall = lagrange(
    faces.map((w) => w.x),
    faces.map((w) => w.flux[1]! * w.nx + w.flux[2]! * w.ny),
    l.x,
  );
  const kWall = ext(k);
  const rhoWall = (pWall / kWall) ** (1 / gamma);
  const cp = gamma / (gamma - 1);
  const H = cp + 0.5 * f.freeStream.u ** 2;
  const vWall = Math.sqrt(2 * (H - (cp * pWall) / rhoWall));
  const wallState: StartingState = { x: l.x, y: bodyRadius(f.body, l.x), rho: rhoWall, u: vWall, v: 0, p: pWall };
  const node = (c: number) => {
    const ll = f.lines[c]!;
    const h = f.heights[c]!;
    return { x: ll.x + h * ll.dx, y: ll.y + h * ll.dy };
  };
  const a = node(i - 1);
  const b = node(i);
  const c = node(i + 1);
  const s1 = Math.hypot(b.x - a.x, b.y - a.y);
  const s2 = Math.hypot(c.x - b.x, c.y - b.y);
  const deriv = (fa: number, fb: number, fc: number) =>
    (-s2 / (s1 * (s1 + s2))) * fa + ((s2 - s1) / (s1 * s2)) * fb + (s1 / (s2 * (s1 + s2))) * fc;
  const shockAngle = Math.atan2(deriv(a.y, b.y, c.y), deriv(a.x, b.x, c.x));
  const shockState: StartingState = { x: b.x, y: b.y, rho: 1, u: 1, v: 0, p: 1 };
  const points: StartingState[] = [
    wallState,
    ...rows.map((r) => ({ x: l.x + r.t * l.dx, y: l.y + r.t * l.dy, rho: r.rho, u: r.u, v: r.v, p: r.p })),
    shockState,
  ];
  const mach = (r: { rho: number; u: number; v: number; p: number }) =>
    Math.hypot(r.u, r.v) / Math.sqrt((gamma * r.p) / r.rho);
  const ns = normalShock(effectiveMach(f), gamma);
  const kNormal = ns.pressureRatio / ns.densityRatio ** gamma;
  return {
    start: { points, shockAngle } as StartingLine,
    minMach: Math.min(...rows.map(mach), mach(wallRow), vWall / Math.sqrt((gamma * pWall) / rhoWall)),
    wallEntropyError: kWall / kNormal - 1,
    wallRowEntropyError: k(wallRow) / kNormal - 1,
    x: l.x,
  };
}

/**
 * Pressure drag coefficient (on the base area) of the body from the first
 * wall point to the end of the nose, by the trapezoidal rule in r^2, closed
 * at the end of the nose with the pressure interpolated there.
 */
export function downstreamDrag(body: Body, mach: number, wall: readonly { x: number; p: number }[]): number {
  const L = body.nose.length;
  const beyond = wall.findIndex((w) => w.x >= L);
  const k = beyond > 0 ? beyond : wall.length - 1;
  const a = wall[k - 1]!;
  const b = wall[k]!;
  const end = { x: L, p: a.p + ((b.p - a.p) * (L - a.x)) / (b.x - a.x) };
  return pressureDragFromProfile(
    [...wall.filter((w) => w.x < L), end],
    (x) => bodyRadius(body, x),
    { pressure: 1, dynamicPressure: 0.5 * gamma * mach * mach },
    body.nose.baseRadius,
    1,
  );
}
