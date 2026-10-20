import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import {
  ackeretSectionDrag,
  busemannCoefficients,
  busemannSectionDrag,
  exactSectionDrag,
} from '../../src/fins/section-drag';
import { doubleWedge, hexagonal, type SymmetricSection } from '../../src/fins/section';

const OUT = 'tests/tmp-fins/section.out';
const log = (s: string) => appendFileSync(OUT, s + '\n');

const shapes: Record<string, (t: number) => SymmetricSection> = {
  'double wedge': (t) => doubleWedge(t),
  'double wedge, ridge 0.3': (t) => doubleWedge(t, 0.3),
  'hexagon, bevels 0.3': (t) => hexagonal(t, 0.3),
  'hexagon, bevels 0.3 and 0.15': (t) => hexagonal(t, 0.3, 0.15),
};

it('thin limit', () => {
  for (const [name, mk] of Object.entries(shapes)) {
    for (const mach of [1.5, 2, 3]) {
      const rows: string[] = [];
      let prevA = NaN;
      let prevB = NaN;
      for (const t of [0.04, 0.02, 0.01, 0.005, 0.0025]) {
        const s = mk(t);
        let ex: number;
        let exact = true;
        try {
          const r = exactSectionDrag(s, mach);
          ex = r.cd;
        } catch {
          const r = exactSectionDrag(s, mach, { neglectReflectedWaves: true });
          ex = r.cd;
          exact = r.exact;
        }
        const eA = ex / ackeretSectionDrag(s, mach) - 1;
        const eB = ex / busemannSectionDrag(s, mach) - 1;
        const oA = Math.log2(prevA / eA);
        const oB = Math.log2(prevB / eB);
        rows.push(
          `t ${t}: A ${eA.toExponential(4)} (p ${oA.toFixed(3)}, /t ${(eA / t).toExponential(4)}, /t2 ${(eA / t / t).toExponential(4)}) B ${eB.toExponential(4)} (p ${oB.toFixed(3)}, /t2 ${(eB / t / t).toExponential(4)})${exact ? '' : ' [reflections neglected]'}`,
        );
        prevA = eA;
        prevB = eB;
      }
      // Busemann's prediction of the first-order coefficient of exact/Ackeret - 1.
      const s1 = mk(1);
      const { c1, c2 } = busemannCoefficients(mach);
      let num = 0;
      let den = 0;
      for (let k = 0; k + 1 < s1.x.length; k++) {
        const dl = (s1.halfThickness[k + 1]! - s1.halfThickness[k]!) / (s1.x[k + 1]! - s1.x[k]!);
        const dx = s1.x[k + 1]! - s1.x[k]!;
        num += 2 * c2 * dl ** 3 * dx;
        den += 2 * c1 * dl ** 2 * dx;
      }
      log(`${name} M${mach}: Busemann coefficient of (exact/Ackeret - 1)/t = ${(num / den).toExponential(4)}`);
      for (const r of rows) log('   ' + r);
    }
  }
});
