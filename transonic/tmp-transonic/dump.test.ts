/**
 * Dump a saved state (family.test.ts) as JSON for plotting: node
 * coordinates, cell Mach number and pressure coefficient, and the wall
 * pressure coefficient. Environment as family.test.ts, plus REF.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { Euler2D } from '../../src/engine-cpu/euler2d';
import { transonicProblem } from '../../src/analysis/transonic-flow';
import type { Body } from '../../src/geometry/body';

const deg = Math.PI / 180;
const bodies: Record<string, Body> = {
  cone7: {
    nose: { shape: { kind: 'conical' }, length: 1 / Math.tan((6 + 59 / 60) * deg), baseRadius: 1 },
    cylinderLength: 0,
  },
  hemi: { nose: { shape: { kind: 'ellipsoid' }, length: 1, baseRadius: 1 }, cylinderLength: 0 },
  ell2: { nose: { shape: { kind: 'ellipsoid' }, length: 2, baseRadius: 1 }, cylinderLength: 0 },
  ogive10: { nose: { shape: { kind: 'ogive', parameter: 1 }, length: 20, baseRadius: 1 }, cylinderLength: 0 },
  ogive5: { nose: { shape: { kind: 'ogive', parameter: 1 }, length: 10, baseRadius: 1 }, cylinderLength: 0 },
  ogive3: { nose: { shape: { kind: 'ogive', parameter: 1 }, length: 6, baseRadius: 1 }, cylinderLength: 0 },
};

it('dump', () => {
  const bodyName = process.env.BODY ?? 'cone7';
  const mach = Number(process.env.MACH ?? 1.05);
  const farField = Number(process.env.FAR ?? 100);
  const cylinder = Number(process.env.CYL ?? 10);
  const refinement = Number(process.env.REF ?? 1);
  const tag = process.env.TAG ?? `${bodyName}-m${mach}-f${farField}-c${cylinder}`;
  const problem = transonicProblem(bodies[bodyName]!, {
    mach,
    gamma: 1.4,
    refinement,
    farField,
    cylinder,
    ...(process.env.SPACING !== undefined ? { spacing: JSON.parse(process.env.SPACING) as object } : {}),
  });
  const solver = new Euler2D(problem.config);
  const bytes = readFileSync(`tests/tmp-transonic/states/${tag}-r${refinement}.bin`);
  solver.setConserved(Float64Array.from(new Float64Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 8)));
  const { ni, nj } = problem.config.grid;
  const machField: number[] = [];
  const cpField: number[] = [];
  const q = problem.freeStream.dynamicPressure;
  for (let j = 0; j < nj; j++) {
    for (let i = 0; i < ni; i++) {
      const w = solver.primitive(i, j);
      machField.push(Math.hypot(w.u, w.v) / Math.sqrt((1.4 * w.p) / w.rho));
      cpField.push((w.p - 1) / q);
    }
  }
  const wall = solver.boundaryFluxes('jMin').map((f) => ({
    x: f.x,
    y: f.y,
    cp: (f.flux[1] * f.nx + f.flux[2] * f.ny - 1) / q,
  }));
  mkdirSync('tests/tmp-transonic/dumps', { recursive: true });
  writeFileSync(
    `tests/tmp-transonic/dumps/${tag}-r${refinement}.json`,
    JSON.stringify({
      ni,
      nj,
      x: Array.from(problem.config.grid.x),
      y: Array.from(problem.config.grid.y),
      mach: machField,
      cp: cpField,
      wall,
      drag: problem.drag(solver),
    }),
  );
});
