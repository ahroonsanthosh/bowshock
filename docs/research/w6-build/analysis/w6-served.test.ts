// W6: what the registered served rule would serve from the references in
// hand (README section 10.2), counted over the refusal audit's population
// as its run draws it (docs/research/refusals: population(2000), one
// condition per Mach band from mulberry32(7), impact.test.ts's order), the
// rounded-tip refusal (evaluate.ts's `noseTip`) lifted only for a capped
// nose inside W6's outline. Writes W6_SERVED_OUT (text) if set.
// Run: ONLY=<abs path of this file> nice -n 10 npx vitest run --config docs/research/refusals/vitest.config.ts
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import {
  drawAltitude,
  MACH_BANDS,
  mulberry32,
  population,
  type NoseKind,
} from '../../refusals/population';

/**
 * The outline per shape: the convex hull, in (calibers, r_n/R, Mach), of
 * the cases whose referenced lines carry half the drag or more (section
 * 10.2): the 3-caliber ogive at (0.03, 1.3) alone; the Von Karman nose
 * at (0.03, 1.3) from 3 to 5 calibers.
 */
function inside(kind: NoseKind, calibers: number, ratio: number, mach: number): boolean {
  if (ratio !== 0.03 || mach !== 1.3) return false;
  if (kind === 'tangent-ogive') return calibers === 3;
  if (kind === 'von-karman') return calibers >= 3 && calibers <= 5;
  return false;
}

it('W6 served cases over the audit population', () => {
  const rockets = population(Number(process.env.N_ROCKETS ?? 2000));
  const rand = mulberry32(7);
  const bands = MACH_BANDS.map(() => ({ cases: 0, rounded: 0, ogiveOrVk: 0, served: 0 }));
  for (const rocket of rockets) {
    MACH_BANDS.forEach(([lo, hi], band) => {
      const mach = lo + (hi - lo) * (0.0005 + 0.999 * rand());
      drawAltitude(rand(), rand());
      const b = bands[band]!;
      b.cases++;
      if (rocket.tipRadiusRatio > 0) {
        b.rounded++;
        if (rocket.nose === 'tangent-ogive' || rocket.nose === 'von-karman') b.ogiveOrVk++;
        if (inside(rocket.nose, rocket.noseFineness, rocket.tipRadiusRatio, mach)) b.served++;
      }
    });
  }
  const lines = [
    `rockets ${rockets.length}; per Mach band: cases, rounded tips, of which ogive or Von Karman, served by W6`,
    ...bands.map(
      (b, k) =>
        `M ${MACH_BANDS[k]![0].toFixed(1)}-${MACH_BANDS[k]![1].toFixed(1)}: ${b.cases}, ${b.rounded}, ${b.ogiveOrVk}, ${b.served}`,
    ),
  ];
  const text = `${lines.join('\n')}\n`;
  console.log(text);
  if (process.env.W6_SERVED_OUT) writeFileSync(process.env.W6_SERVED_OUT, text);
});
