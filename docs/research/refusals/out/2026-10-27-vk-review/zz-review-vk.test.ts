// Temporary review probe (not to be committed): the Von Karman cases the
// audit now serves (a total or the nose alone), at the run's own draws.
import { test } from 'vitest';
import { MACH_BANDS, drawAltitude, mulberry32, population } from './population';
import { calibreBody, noseReasons, totalReasons } from './evaluate';

test('Von Karman cases now served', () => {
  const rockets = population(2000);
  const rand = mulberry32(7);
  const rows: string[] = [];
  let total = 0;
  let noseOnly = 0;
  let vkCases = 0;
  let minCyl = Infinity;
  let maxCyl = 0;
  let minMach = Infinity;
  let maxMach = 0;
  for (const r of rockets) {
    MACH_BANDS.forEach(([lo, hi], band) => {
      const mach = lo + (hi - lo) * (0.0005 + 0.999 * rand());
      const altitudeKm = drawAltitude(rand(), rand());
      if (r.nose !== 'von-karman') return;
      vkCases++;
      const nose = noseReasons(r, mach);
      if (nose.length > 0) return;
      const tot = totalReasons(r, { mach, altitudeKm });
      const body = calibreBody(r);
      if (tot.length === 0) total++;
      else noseOnly++;
      minCyl = Math.min(minCyl, body.cylinderLength);
      maxCyl = Math.max(maxCyl, body.cylinderLength);
      minMach = Math.min(minMach, mach);
      maxMach = Math.max(maxMach, mach);
      rows.push(
        `${tot.length === 0 ? 'TOTAL' : 'nose '} id ${r.id} band ${band} M ${mach.toFixed(4)} nose ${r.noseFineness.toFixed(3)} cal cylinder ${body.cylinderLength.toFixed(3)} cal tip ${r.tipRadiusRatio}`,
      );
    });
  }
  console.log(rows.join('\n'));
  console.log(
    `VK cases ${vkCases}; served with a total ${total}, nose only ${noseOnly}; cylinder ${minCyl.toFixed(2)} to ${maxCyl.toFixed(2)} cal; Mach ${minMach.toFixed(4)} to ${maxMach.toFixed(4)}`,
  );
});
