// Throwaway: dump blunt-grid lines for comparison between code versions.
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { bluntBodyGrid } from '../../src/grid/blunt-grid';
import type { Body } from '../../src/geometry/body';

const cases: [string, Body, number][] = [];
const ell = (L: number, c: number): Body => ({ nose: { shape: { kind: 'ellipsoid' }, length: L, baseRadius: 0.5 }, cylinderLength: c });
for (const [L, c, M] of [[3, 2, 2], [1, 2, 2], [3, 2, 3], [0.5, 2, 2], [0.5, 2, 3], [1.5, 2, 2], [1.5, 1, 1.2], [3, 1, 1.2], [1, 1, 1.5], [0.5, 1, 1.3], [1.5, 3, 1.2], [3, 2, 1.2], [0.5, 3, 1.3], [6, 2, 1.2], [6, 1, 1.5], [1, 4, 1.2]] as const) {
  cases.push([`ell L${L} c${c} M${M}`, ell(L, c), M]);
}
const shape = (s: Body['nose']['shape'], L: number, c: number): Body => ({ nose: { shape: s, length: L, baseRadius: 0.5 }, cylinderLength: c });
if (process.env.TWO === '1') {
  cases.push(['haack0 L3 c2 M2', shape({ kind: 'haack', parameter: 0 }, 3, 2), 2]);
  cases.push(['haack0 L5 c2 M1.5', shape({ kind: 'haack', parameter: 0 }, 5, 2), 1.5]);
  cases.push(['haack0 L3 c2 M3', shape({ kind: 'haack', parameter: 0 }, 3, 2), 3]);
  cases.push(['haack1/3 L3 c2 M2', shape({ kind: 'haack', parameter: 1 / 3 }, 3, 2), 2]);
  cases.push(['power0.75 L3 c2 M2', shape({ kind: 'power', exponent: 0.75 }, 3, 2), 2]);
  cases.push(['ogive1 L1 c2 M1.5', shape({ kind: 'ogive', parameter: 1 }, 1, 2), 1.5]);
  cases.push(['parab1 L1 c5 M1.2', shape({ kind: 'parabolic', parameter: 1 }, 1, 5), 1.2]);
  cases.push(['ogive1 L1.5 c5 M1.2', shape({ kind: 'ogive', parameter: 1 }, 1.5, 5), 1.2]);
}
it('dump', () => {
  const out: Record<string, number[][]> = {};
  for (const [name, body, M] of cases) {
    for (const r of [1, 2, 4]) {
      try {
        const g = bluntBodyGrid(body, { nj: 20, refinement: r, mach: M, gated: false } as never);
        out[`${name} r${r}`] = g.lines.map((l) => [l.x, l.y, l.dx, l.dy, l.h]);
      } catch (e) {
        out[`${name} r${r}`] = [[Number.NaN]];
      }
    }
  }
  writeFileSync(process.env.OUTFILE!, JSON.stringify(out));
});
