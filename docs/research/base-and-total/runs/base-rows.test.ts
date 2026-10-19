import { appendFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import {
  COMPILED_CURVE_BAND,
  COMPILED_CURVE_CURVATURE_BOUND,
  compiledCurveBandEvidence,
  interpolationErrorBound,
  twiceReadNodes,
} from '../../src/base/compiled-curve';
import { FINS_ON_BASE_ROWS, finsOnBaseRows, tunnelExcess } from '../../src/base/fins-on-base';
import { TN3819_FIG18_CURVES } from '../../src/base/tn3819-fig18';
import { TN3819_FIG35_FREE_FLIGHT, TN3819_FIG35_TUNNEL } from '../../src/base/tn3819-fig35';

const OUT = 'tests/tmp-total/base-rows.out';
const log = (s: string) => appendFileSync(OUT, s + '\n');
it('scratch', () => {
  writeFileSync(OUT, '');
  log(JSON.stringify(compiledCurveBandEvidence()));
  log(JSON.stringify(COMPILED_CURVE_BAND));
  log('K ' + COMPILED_CURVE_CURVATURE_BOUND);
  for (const c of ['moreNegative', 'lessNegative'] as const)
    log(c + ' ' + JSON.stringify(twiceReadNodes(c)));
  // LOO
  const rows = TN3819_FIG18_CURVES;
  for (let i = 1; i + 1 < rows.length; i++) {
    const a = rows[i - 1]!,
      b = rows[i]!,
      c = rows[i + 1]!;
    for (const k of ['moreNegative', 'lessNegative'] as const) {
      const t = (b.mach - a.mach) / (c.mach - a.mach);
      const lin = a[k] + t * (c[k] - a[k]);
      const bound = 0.5 * (b.mach - a.mach) * (c.mach - b.mach) * COMPILED_CURVE_CURVATURE_BOUND;
      log(`${b.mach} ${k} dev ${(b[k] - lin).toFixed(5)} bound ${bound.toFixed(5)}`);
    }
  }
  for (const m of [1.799, 1.85, 2.348, 2.414, 2.663, 2.75, 2.97])
    log(`interp ${m} ${interpolationErrorBound(m).toExponential(2)}`);
  log(JSON.stringify(tunnelExcess()));
  for (const r of FINS_ON_BASE_ROWS)
    log(
      `${r.mach} nofin ${r.pBNoFins.toFixed(4)} ff ${r.freeFlight.map((f) => `${f.reading}:${f.factor.toFixed(3)}+-${f.error.toFixed(3)}${f.extrapolated ? 'x' : ''}`).join(' ')} tun ${r.tunnel?.toFixed(3)} car ${r.carried?.toFixed(3)} low ${r.low.toFixed(3)} high ${r.high.toFixed(3)} hw ${((r.high - r.low) / (r.high + r.low) * 100).toFixed(1)} n ${r.readCount}`,
    );
  log('--- 0008 reproduction');
  const first = TN3819_FIG35_FREE_FLIGHT.filter((r) => r.reading === 'first');
  for (const r of finsOnBaseRows({
    readings: first,
    tunnel: TN3819_FIG35_TUNNEL.filter((p) => p.reading === 'first'),
    carryTunnelExcess: false,
    identitySwap: false,
    machs: [1.8, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.97, 3.0],
  }))
    log(`${r.mach} F ${r.freeFlight[0]!.factor.toFixed(3)} tun ${r.tunnel?.toFixed(3)} low ${r.low.toFixed(3)} high ${r.high.toFixed(3)}`);
});
