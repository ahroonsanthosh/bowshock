// The Basic Finner gate re-run with the corrected fins-on-base factor (0010 section 11), run
// on 2026-10-21 as gate-corrected.test.ts in tests/tmp-total; its output is
// gate-corrected.out and .json. A RECORDED CORRECTION, not a validation: the correction
// replaced the readings of TN 3819 fig. 35 that followed estimate B above M 2.15 by two
// readings of the free-flight curve as identified, and made the factor bounded, not
// measured, above the curve's end (M 2.56). It was made on the figure's evidence alone,
// after the gate's residuals were known. Everything else is round 5's configuration and
// arithmetic (gate-round5.test.ts, kept with its output). Printed first: the factor's rows,
// the tunnel excesses, the bounded band and its checks, the superseded factor beside the
// corrected one, and the two readings paired.
import { appendFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { compiledCurveValue } from '../../src/base/compiled-curve';
import {
  FINS_ON_BASE_BOUNDED,
  FINS_ON_BASE_ROWS,
  finsOnBaseFactor,
  finsOnBaseRows,
  tunnelExcess,
} from '../../src/base/fins-on-base';
import {
  FIG35_IDENTITY_SWAP_SUPERSEDED,
  TN3819_FIG35_ESTIMATES,
  TN3819_FIG35_FREE_FLIGHT,
  TN3819_FIG35_SUPERSEDED,
} from '../../src/base/tn3819-fig35';
import { trapezoidalPlanform } from '../../src/fins/planform';
import { singleWedge } from '../../src/fins/section';
import { finnedBodyComponents, type FinnedBody } from '../../src/total/finned-body';
import { exactConeNoseWaveDrag } from '../../src/total/nose';
import { combineComponents } from '../../src/total/total-drag';
import {
  BASIC_FINNER_CLUSTERS,
  BASIC_FINNER_GEOMETRY as G,
  BASIC_FINNER_SHOTS,
} from '../../src/validation/basic-finner';

const OUT = 'tests/tmp-total/gate-corrected.out';
const JSON_OUT = 'tests/tmp-total/gate-corrected.json';
const log = (s: string) => appendFileSync(OUT, s + '\n');
const f4 = (x: number) => x.toFixed(4);
const pc = (x: number) => (100 * x).toFixed(1) + '%';

function at(points: readonly { mach: number; pB: number }[], m: number): number | undefined {
  for (let k = 0; k < points.length; k++) {
    const p = points[k]!;
    if (Math.abs(p.mach - m) < 1e-9) return p.pB;
    const q = points[k + 1];
    if (q !== undefined && m > p.mach && m < q.mach)
      return p.pB + ((m - p.mach) / (q.mach - p.mach)) * (q.pB - p.pB);
  }
  return undefined;
}

it('the gate with the corrected fins-on-base factor', () => {
  writeFileSync(OUT, '');
  const wedge = {
    count: 4,
    thicknessRatio: 0.08,
    section: 'other' as const,
    // Unswept: the factor refuses swept fins since 2026-10-21 (0014 section 10.7).
    tanLeadingEdge: 0,
    tanTrailingEdge: 0,
  };

  log('== the two readings of the free-flight curve, paired');
  const [r1, r2] = TN3819_FIG35_FREE_FLIGHT;
  let worst = { d: 0, m: 0, ratio: 0 };
  for (const p of r1!.points) {
    const q = r2!.points.find((x) => Math.abs(x.mach - p.mach) < 1e-9);
    if (q === undefined) continue;
    const d = Math.abs(p.pB - q.pB);
    const ratio = d / (p.error + q.error);
    if (d > worst.d) worst = { d, m: p.mach, ratio };
    log(
      `M ${p.mach}: first ${p.pB} (+-${p.error}), second ${q.pB} (+-${q.error}), difference ${d.toFixed(4)}, ${ratio <= 1 ? 'within' : 'BEYOND'} the combined errors (${(100 * ratio).toFixed(0)}%)`,
    );
  }
  log(`largest difference ${worst.d.toFixed(4)} at M ${worst.m}`);

  log('== the identity-swap allowance: distance to the nearer estimate, each reading its own');
  let largest = { d: 0, m: 0, reading: '', which: '' };
  for (const r of TN3819_FIG35_FREE_FLIGHT) {
    const est = TN3819_FIG35_ESTIMATES.filter((e) => e.reading === r.reading);
    for (const p of r.points) {
      if (p.mach < 1.75 - 1e-9 || p.mach > 2.56 + 1e-9) continue;
      const ds = est
        .map((e) => ({ which: e.estimate, v: at(e.points, p.mach) }))
        .filter((x) => x.v !== undefined)
        .map((x) => ({ which: x.which, d: Math.abs(p.pB - x.v!) }));
      if (ds.length === 0) continue;
      const near = ds.reduce((a, b) => (b.d < a.d ? b : a));
      if (near.d > largest.d) largest = { d: near.d, m: p.mach, reading: r.reading, which: near.which };
      log(`${r.reading} M ${p.mach}: nearer estimate ${near.which}, ${near.d.toFixed(4)}`);
    }
  }
  log(`largest: ${largest.d.toFixed(4)}, estimate ${largest.which}, M ${largest.m}, ${largest.reading}`);

  log('== the tunnel excess over free flight');
  for (const e of tunnelExcess())
    log(`M ${e.mach} tunnel ${e.tunnelReading} line ${e.lineReading}: ${e.excess.toFixed(4)}`);

  log('== the rows (measured, M 1.80 to 2.56)');
  for (const r of FINS_ON_BASE_ROWS) {
    log(
      `M ${r.mach}: no fins ${r.pBNoFins.toFixed(4)} | ` +
        r.freeFlight.map((f) => `${f.reading} F ${f.factor.toFixed(4)} +-${f.error.toFixed(4)}`).join('; ') +
        ` | tunnel ${r.tunnel?.toFixed(4) ?? '-'} carried ${r.carried?.toFixed(4) ?? '-'} | low ${r.low.toFixed(4)} high ${r.high.toFixed(4)} nominal ${(0.5 * (r.low + r.high)).toFixed(4)} | read ${r.readCount}`,
    );
  }
  const b = FINS_ON_BASE_BOUNDED;
  log(`== bounded, M ${b.from} to ${b.to}: ${b.low} to ${b.high.toFixed(4)}, nominal ${(0.5 * (b.low + b.high)).toFixed(4)}`);
  for (const e of TN3819_FIG35_ESTIMATES) {
    for (const p of e.points.filter((x) => x.mach > b.from)) {
      const F = p.pB / compiledCurveValue(p.mach, 'lessNegative');
      const Fe = p.error / Math.abs(compiledCurveValue(p.mach, 'lessNegative'));
      log(
        `estimate ${e.estimate} (${e.reading}) M ${p.mach}: F ${F.toFixed(4)} (+-${Fe.toFixed(4)}) ${F - Fe >= b.low && F + Fe <= b.high ? 'inside' : 'OUTSIDE'}`,
      );
    }
  }
  const end = FINS_ON_BASE_ROWS[FINS_ON_BASE_ROWS.length - 1]!;
  for (const m of [2.6, 2.8, 3.0]) {
    const inc = 1 + ((b.high - 1) * end.pBNoFins) / compiledCurveValue(m, 'lessNegative');
    const beta = (x: number) => Math.sqrt(x * x - 1);
    log(
      `M ${m}: increment carried instead of the ratio: high end ${inc.toFixed(4)}; sqrt(M^2-1)|P_B,no fins| ${(beta(m) * -compiledCurveValue(m, 'lessNegative')).toFixed(4)} (at the end ${(beta(end.mach) * -end.pBNoFins).toFixed(4)})`,
    );
  }

  log('== the factor at the gated shots: superseded and corrected (body base, area ratio 1)');
  const oldRows = finsOnBaseRows({
    readings: TN3819_FIG35_SUPERSEDED,
    identitySwapSpan: FIG35_IDENTITY_SWAP_SUPERSEDED,
    machs: [1.8, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.41, 2.5, 2.6, 2.7, 2.8, 2.85, 2.9, 2.97, 3.0],
  });
  const oldFactor = (m: number) => {
    const mm = Math.max(m, 1.8);
    let k = 0;
    while (k + 2 < oldRows.length && mm > oldRows[k + 1]!.mach) k++;
    const a = oldRows[k]!;
    const c = oldRows[k + 1]!;
    const t = mm <= a.mach ? 0 : (mm - a.mach) / (c.mach - a.mach);
    const lo = a.low + t * (c.low - a.low);
    const hi = a.high + t * (c.high - a.high);
    return { low: lo, high: hi, nominal: 0.5 * (lo + hi) };
  };

  const gamma = 1.4;
  const half = (G.coneHalfAngleDegrees * Math.PI) / 180;
  const noseLength = G.length / 20 / Math.tan(half);
  const config: FinnedBody = {
    body: {
      nose: { shape: { kind: 'conical' }, length: noseLength, baseRadius: 0.5 },
      cylinderLength: G.length - noseLength,
    },
    afterbody: 'cylinder',
    fins: {
      count: G.finCount,
      planform: trapezoidalPlanform({ rootChord: G.finChord, span: G.finSpan, leadingEdgeSweep: 0 }),
      section: singleWedge(G.finTrailingEdgeThickness / G.finChord),
      sectionFamily: 'other',
      leadingEdgeRadius: G.finLeadingEdgeRadius,
      trailingEdgeAheadOfBase: 0,
    },
  };
  const temperature = 343.7 ** 2 / (gamma * 287.05);
  const transitionReynolds = [5e5, 1.6e6, 3e6];
  const gated = BASIC_FINNER_SHOTS.filter((s) => s.use === 'gate');
  for (const s of gated) {
    const o = oldFactor(s.mach);
    const n = finsOnBaseFactor(s.mach, wedge);
    const q = -compiledCurveValue(s.mach, 'lessNegative');
    log(
      `${s.shot} M ${s.mach}: superseded F ${f4(o.nominal)} (${f4(o.low)} to ${f4(o.high)}), corrected F ${f4(n.nominal)} (${f4(n.low)} to ${f4(n.high)})${n.bounded ? ' bounded' : ''}; body base nominal moves ${((n.nominal - o.nominal) * q).toFixed(5)}`,
    );
  }

  log('== the gate, corrected');
  const spread = BASIC_FINNER_CLUSTERS.map(([a, c]) => {
    const v = gated.filter((s) => s.mach >= a && s.mach <= c).map((s) => s.cx0);
    const mean = v.reduce((p, x) => p + x, 0) / v.length;
    return { lo: Math.min(...v) / mean - 1, hi: Math.max(...v) / mean - 1 };
  });
  const clusterOf = (m: number) => BASIC_FINNER_CLUSTERS.findIndex(([a, c]) => m >= a && m <= c);
  const json: unknown[] = [];
  const residuals: [number, number][] = [];
  for (const s of gated) {
    const conditions = { mach: s.mach, temperature, reynoldsPerLength: s.reynolds / G.length };
    const r = finnedBodyComponents(config, conditions, exactConeNoseWaveDrag(s.mach, half), {
      transitionReynolds,
      wallTemperature: temperature,
    });
    if (r.refusals.length > 0) {
      log(`${s.shot} M ${s.mach}: REFUSED ${r.refusals.map((x) => x.reason).join(', ')}`);
      json.push({ shot: s.shot, mach: s.mach, refused: r.refusals.map((x) => x.reason) });
      continue;
    }
    const t = combineComponents(r.components, r.inputs);
    const sp = spread[clusterOf(s.mach)]!;
    const inLow = t.inputs.reduce((a, i) => a + i.low, 0);
    const inHigh = t.inputs.reduce((a, i) => a + i.high, 0);
    const wall = t.inputs.find((i) => i.name === 'wall temperature')!;
    const residual = s.cx0 / t.cd - 1;
    const lo = (t.low + inLow) / t.cd - 1 + sp.lo;
    const hi = (t.high + inHigh) / t.cd - 1 + sp.hi;
    const hiNoWall = (t.high + inHigh - wall.high) / t.cd - 1 + sp.hi;
    const pass = residual >= lo && residual <= hi;
    residuals.push([s.mach, residual]);
    const base = t.components.find((x) => x.name === 'body base')!;
    log(
      `${s.shot} M ${s.mach} CX0 ${s.cx0} | total ${f4(t.cd)} band ${f4(t.low)}..${f4(t.high)} | ` +
        t.components.map((x) => `${x.name} ${f4(x.cd)} [${f4(x.low)}, ${f4(x.high)}]`).join('; ') +
        ' | ' +
        t.inputs.map((i) => `${i.name} ${f4(i.low)}..${f4(i.high)}`).join('; ') +
        ` | residual ${pc(residual)} tolerance ${pc(lo)} to ${pc(hi)} (without the wall ${pc(hiNoWall)}) ${pass ? 'PASS' : 'FAIL'}` +
        ` | body base label: ${base.label.slice(base.label.indexOf(';') + 2)}`,
    );
    json.push({
      shot: s.shot,
      mach: s.mach,
      cx0: s.cx0,
      cd: +t.cd.toFixed(5),
      low: +t.low.toFixed(5),
      high: +t.high.toFixed(5),
      inputLow: +inLow.toFixed(5),
      inputHigh: +inHigh.toFixed(5),
      residual: +residual.toFixed(4),
      tolerance: [+lo.toFixed(4), +hi.toFixed(4)],
      toleranceHighWithoutWall: +hiNoWall.toFixed(4),
      pass,
      bodyBase: [+base.cd.toFixed(5), +base.low.toFixed(5), +base.high.toFixed(5)],
      components: Object.fromEntries(t.components.map((x) => [x.name, +x.cd.toFixed(5)])),
    });
  }
  for (let k = 0; k < BASIC_FINNER_CLUSTERS.length; k++) {
    const [a, c] = BASIC_FINNER_CLUSTERS[k]!;
    const v = residuals.filter(([m]) => m >= a && m <= c).map(([, x]) => x);
    const mean = v.reduce((p, x) => p + x, 0) / v.length;
    const sd = v.length > 1 ? Math.sqrt(v.reduce((p, x) => p + (x - mean) ** 2, 0) / (v.length - 1)) : 0;
    log(
      `cluster ${a} to ${c}: n ${v.length}, mean ${pc(mean)}, min ${pc(Math.min(...v))}, max ${pc(Math.max(...v))}, sd ${pc(sd)}`,
    );
  }
  const all = residuals.map(([, x]) => x);
  log(`all: mean ${pc(all.reduce((p, x) => p + x, 0) / all.length)}, min ${pc(Math.min(...all))}, max ${pc(Math.max(...all))}`);
  writeFileSync(JSON_OUT, JSON.stringify(json, null, 1));
});
