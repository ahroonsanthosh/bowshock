// W6 build, the TR 1386 check (README section 8): the wall pressure
// coefficient and the surface Mach number along a capped nose from its
// saved fits on nj = 20, 40 and 80. Each wall face: x, Cp from its
// pressure, and the Mach number of the wall cell beside it. Env: SHAPE,
// CAL, RATIO, M, CYL, FILES (saves of refinements 1, 2, 4 in order), OUT.
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { caseFromEnv } from './common';
import { gamma, loadFit } from './fitdata';

it('wall pressure and surface Mach number', () => {
  const { body, mach: M, tag } = caseFromEnv();
  const files = (process.env.FILES ?? '').split(',');
  const grids = files.map((file, n) => {
    const r = 2 ** n;
    const f = loadFit(body, M, r, file);
    const q = 0.5 * f.freeStream.u * f.freeStream.u * f.freeStream.rho;
    const faces = f.wall.map((w, i) => {
      const p = w.flux[1]! * w.nx + w.flux[2]! * w.ny;
      const k = 4 * i; // wall row, j = 0
      const rho = f.cells[k]!;
      const u = f.cells[k + 1]!;
      const v = f.cells[k + 2]!;
      const pc = f.cells[k + 3]!;
      return {
        x: w.x,
        cp: (p - f.freeStream.p) / q,
        wallCellMach: Math.hypot(u, v) / Math.sqrt((gamma * pc) / rho),
      };
    });
    return { r, ni: f.ni, nj: f.nj, drag: f.drag, faces };
  });
  writeFileSync(
    process.env.OUT ?? `wallcp-${tag}.json`,
    JSON.stringify({ tag, mach: M, noseLength: body.nose.length, grids }),
  );
});
