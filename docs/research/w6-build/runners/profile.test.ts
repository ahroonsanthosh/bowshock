// W6 build diagnostic (not a reference): the fitted flow across grid
// lines, from the wall to the shock, on each saved grid of a family: the
// pressure, Mach number and entropy on each row, to look for a
// recompression shock in the layer. Env: SHAPE, CAL, RATIO, M, CYL,
// FILES (saved states, refinements 1, 2, 4 in order), LINES (base-grid
// indices), OUT.
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { caseFromEnv } from './common';
import { gamma, lineData, loadFit } from './fitdata';

it('profiles across lines', () => {
  const { body, mach: M, tag } = caseFromEnv();
  const files = (process.env.FILES ?? '').split(',');
  const lines = (process.env.LINES ?? '22,28,34,40').split(',').map(Number);
  const out: object[] = [];
  files.forEach((file, n) => {
    const r = 2 ** n;
    const f = loadFit(body, M, r, file);
    for (const base of lines) {
      const d = lineData(f, base * r);
      const pts = d.start.points.slice(1, -1);
      out.push({
        r,
        line: base,
        x: d.x,
        rows: pts.map((p) => ({
          t: Math.hypot(p.x - pts[0]!.x, p.y - pts[0]!.y),
          p: p.p,
          mach: Math.hypot(p.u, p.v) / Math.sqrt((gamma * p.p) / p.rho),
          k: p.p / p.rho ** gamma,
        })),
      });
    }
  });
  writeFileSync(process.env.OUT ?? `profile-${tag}.json`, JSON.stringify(out));
});
