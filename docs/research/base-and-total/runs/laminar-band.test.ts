// Throwaway: the trailing-edge laminar input band per gated shot, from each shot's Reynolds
// number only (no drag value is read).
import { appendFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { laminarOverTurbulent } from '../../src/base/fin-trailing-edge';
import { BASIC_FINNER_GEOMETRY as G, BASIC_FINNER_SHOTS } from '../../src/validation/basic-finner';

const out = 'tests/tmp-total/laminar-band.out';

it('prints', () => {
  writeFileSync(out, '');
  const rows = BASIC_FINNER_SHOTS.filter((s) => s.use === 'gate').map((s) => {
    const reC = (s.reynolds / G.length) * G.finChord;
    const l = laminarOverTurbulent(G.finChord / G.finTrailingEdgeThickness, reC);
    appendFileSync(
      out,
      `${s.shot} M ${s.mach} Re_c ${reC.toExponential(3)} xl ${l.laminarAbscissa.toFixed(5)} xt ${l.turbulentAbscissa.toFixed(3)} ` +
        `ratio ${l.low.toFixed(4)} to ${l.high.toFixed(4)} (${(100 * (l.low - 1)).toFixed(1)}% to +${(100 * (l.high - 1)).toFixed(1)}%) extrapolated ${l.extrapolated} ` +
        l.byMach.map((m) => `M${m.mach} ${m.low.toFixed(4)}-${m.high.toFixed(4)}${m.extrapolated ? '*' : ''}`).join(' ') +
        '\n',
    );
    return l;
  });
  appendFileSync(
    out,
    `over the shots: ${(100 * (Math.min(...rows.map((l) => l.low)) - 1)).toFixed(1)}% to +${(100 * (Math.max(...rows.map((l) => l.high)) - 1)).toFixed(1)}%; ` +
      `not extrapolated only: ${rows.filter((l) => !l.extrapolated).length} shots\n`,
  );
});
