// Throwaway: the Haack tip geometry and what the current generator says.
import { it } from 'vitest';
import { noseRadius } from '../../src/geometry/nose';
import { bluntBodyGrid } from '../../src/grid/blunt-grid';
import { haack, log, power } from './common';

const LOG = 'tests/tmp-haack/geometry.txt';

it('tip geometry', () => {
  for (const [C, L] of [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 5],
    [1 / 3, 3],
  ] as const) {
    const body = haack(C, L);
    const r = (x: number) => noseRadius(body.nose, x);
    // 45-degree scale: x where r(x) = x.
    let lo = 0;
    let hi = L;
    for (let k = 0; k < 200; k++) {
      const m = 0.5 * (lo + hi);
      if (r(m) > m) lo = m;
      else hi = m;
    }
    const l45 = 0.5 * (lo + hi);
    const lTheory = 2.88 * (1 + 1.5 * C) ** 2 * 0.5 ** 4 / L ** 3;
    log(`C=${C} L=${L}: l45=${l45.toExponential(4)} theory=${lTheory.toExponential(4)}`, LOG);
    for (const k of [0.01, 0.1, 0.316, 1, 2, 5, 10, 50, 100, 450]) {
      const x = k * l45;
      if (x > L) continue;
      const e = 1e-6 * x;
      const slope = (r(x + e) - r(x - e)) / (2 * e);
      const asym = 0.75 * (l45 / x) ** 0.25;
      log(
        `  x=${k} l: r/l=${(r(x) / l45).toFixed(4)} slope=${slope.toFixed(4)} (asym ${asym.toFixed(4)}) delta=${((Math.atan(slope) * 180) / Math.PI).toFixed(2)} deg`,
        LOG,
      );
    }
    for (const x of [0.05, 0.1, 0.2, 0.3, 0.5, 1, 1.5, 2, 2.5, 2.9, 3, 4, 5]) {
      if (x > L) continue;
      const e = 1e-7 * L;
      const slope = (r(Math.min(x + e, L)) - r(x - e)) / (Math.min(x + e, L) - (x - e));
      log(`  x=${x}: r=${r(x).toFixed(5)} delta=${((Math.atan(slope) * 180) / Math.PI).toFixed(2)} deg`, LOG);
    }
  }
  for (const [name, body] of [
    ['haack 0 L3', haack(0, 3)],
    ['haack 0 L2', haack(0, 2)],
    ['haack 0 L5', haack(0, 5)],
    ['power 0.75 L3', power(0.75, 3)],
  ] as const) {
    for (const mach of [1.5, 2, 3, 5]) {
      try {
        const g = bluntBodyGrid(body, { nj: 20, mach });
        log(`${name} M${mach}: ok ni=${g.grid.ni}`, LOG);
      } catch (e) {
        log(`${name} M${mach}: ${(e as Error).message}`, LOG);
      }
    }
  }
});
