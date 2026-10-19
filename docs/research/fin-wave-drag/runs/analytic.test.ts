import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { linearSectionDrag, linearSurfacePressure } from '../../src/fins/linear-wave-drag';
import { doubleWedge, hexagonal } from '../../src/fins/section';

const OUT = 'tests/tmp-fins/analytic.out';
const log = (s: string) => appendFileSync(OUT, s + '\n');
const deg = Math.PI / 180;
const tc = 0.05;

function lam2(sec: ReturnType<typeof doubleWedge>): number {
  let s = 0;
  for (let k = 0; k + 1 < sec.x.length; k++) {
    const dx = sec.x[k + 1]! - sec.x[k]!;
    s += ((sec.halfThickness[k + 1]! - sec.halfThickness[k]!) / dx) ** 2 * dx;
  }
  return s;
}

it('analytic checks', () => {
  const secs = { dw: doubleWedge(tc), dw3: doubleWedge(tc, 0.3), hex: hexagonal(tc, 0.15) };
  for (const n of [16, 24, 48]) {
    let w1 = 0;
    for (const sec of Object.values(secs)) {
      for (const mach of [1.2, 1.5, 2, 3]) {
        const beta = Math.sqrt(mach * mach - 1);
        const cd = linearSectionDrag({ rootChord: 1, span: 50, tanLeadingEdge: 0, tanTrailingEdge: 0 }, sec, mach, 25, { chord: n, eta: n });
        w1 = Math.max(w1, Math.abs(cd / ((4 / beta) * lam2(sec)) - 1));
      }
    }
    let w2 = 0;
    for (const sec of Object.values(secs)) {
      for (const [mach, L] of [
        [2, 30],
        [3, 45],
        [1.5, 20],
      ] as const) {
        const t = Math.tan(L * deg);
        const cd = linearSectionDrag({ rootChord: 1, span: 40, tanLeadingEdge: t, tanTrailingEdge: t }, sec, mach, 6, { chord: n, eta: n });
        const exact = (4 * Math.cos(L * deg) * lam2(sec)) / Math.sqrt((mach * Math.cos(L * deg)) ** 2 - 1);
        w2 = Math.max(w2, Math.abs(cd / exact - 1));
      }
    }
    log(`n ${n}: 2D limit worst ${w1.toExponential(2)}; swept supersonic worst ${w2.toExponential(2)}`);
    for (const [mach, L] of [
      [1.5, 60],
      [2, 70],
    ] as const) {
      const t = Math.tan(L * deg);
      const beta = Math.sqrt(mach * mach - 1);
      const row: string[] = [];
      for (const y of [20, 80, 320]) {
        const cd = linearSectionDrag({ rootChord: 1, span: 1000, tanLeadingEdge: t, tanTrailingEdge: t }, secs.dw, mach, y, { chord: n, eta: n });
        row.push(`y ${y}: ${(cd / ((4 * tc * tc) / beta)).toExponential(3)}`);
      }
      log(`   subsonic edges M${mach} L${L}: ${row.join('  ')}`);
    }
    // Tip cone of a constant-slope sheet.
    let w4 = 0;
    let count = 0;
    for (const mach of [1.5, 2, 3]) {
      const beta = Math.sqrt(mach * mach - 1);
      for (const x of [0.1, 0.25, 0.45]) {
        for (const f of [0.2, 0.6, 0.95, -0.5]) {
          // f in (0, 1): inside the tip cone at beta (s - y) = f x; f < 0: beyond it.
          const y = f > 0 ? 1 - (f * x) / beta : 1 - (1.5 * x) / beta;
          if (!(y > 0)) continue;
          const cp = linearSurfacePressure({ rootChord: 1, span: 1, tanLeadingEdge: 0, tanTrailingEdge: 0 }, secs.dw, mach, x, y, n);
          const cp2 = (2 * tc) / beta;
          const ratio = f > 0 ? 0.5 + Math.asin(f) / Math.PI : 1;
          w4 = Math.max(w4, Math.abs(cp / cp2 / ratio - 1));
          count++;
        }
      }
    }
    log(`   tip cone worst ${w4.toExponential(2)} on ${count} points`);
  }
});
