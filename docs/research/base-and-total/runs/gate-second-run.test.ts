// The Basic Finner gate, second run (0010 section 4.2): run ONCE, after the independent
// reader's report, as gate2.test.ts in tests/tmp-total; its output is gate-second-run.out and .json.
import { appendFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
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

const OUT = 'tests/tmp-total/gate-second-run.out';
const JSON_OUT = 'tests/tmp-total/gate-second-run.json';
const log = (s: string) => appendFileSync(OUT, s + '\n');

it('the second gate run', () => {
  writeFileSync(OUT, '');
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
  const spread = BASIC_FINNER_CLUSTERS.map(([a, b]) => {
    const v = gated.filter((s) => s.mach >= a && s.mach <= b).map((s) => s.cx0);
    const mean = v.reduce((p, q) => p + q, 0) / v.length;
    return { lo: Math.min(...v) / mean - 1, hi: Math.max(...v) / mean - 1 };
  });
  const clusterOf = (m: number) => BASIC_FINNER_CLUSTERS.findIndex(([a, b]) => m >= a && m <= b);
  const json: unknown[] = [];
  const residuals: [number, number][] = [];
  for (const s of gated) {
    const r = finnedBodyComponents(
      config,
      { mach: s.mach, temperature, reynoldsPerLength: s.reynolds / G.length },
      exactConeNoseWaveDrag(s.mach, half),
      { transitionReynolds, wallTemperature: temperature },
    );
    if (r.refusals.length > 0) {
      log(`${s.shot} M ${s.mach}: REFUSED ${r.refusals.map((x) => `${x.component} (${x.reason}): ${x.message}`).join(' | ')}`);
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
    const c = (n: string) => t.components.find((x) => x.name === n)!;
    log(
      `${s.shot} M ${s.mach} CX0 ${s.cx0} | total ${t.cd.toFixed(4)} band ${t.low.toFixed(4)}..${t.high.toFixed(4)} | ` +
        t.components.map((x) => `${x.name} ${x.cd.toFixed(4)} [${x.low.toFixed(4)}, ${x.high.toFixed(4)}]`).join('; ') +
        ' | ' +
        t.inputs.map((i) => `${i.name} ${i.low.toFixed(4)}..${i.high.toFixed(4)}`).join('; ') +
        ` | residual ${(100 * residual).toFixed(1)}% tolerance ${(100 * lo).toFixed(1)}% to ${(100 * hi).toFixed(1)}% (without the wall ${(100 * hiNoWall).toFixed(1)}%) ${pass ? 'PASS' : 'FAIL'}` +
        ` | LE: ${c('fin leading edges').label.slice(-60)} | TE input: ${t.inputs.find((i) => i.name === 'transition at the fin trailing edges')?.label ?? 'none'}`,
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
      pass,
      components: Object.fromEntries(t.components.map((x) => [x.name, +x.cd.toFixed(5)])),
    });
  }
  for (let k = 0; k < BASIC_FINNER_CLUSTERS.length; k++) {
    const [a, b] = BASIC_FINNER_CLUSTERS[k]!;
    const v = residuals.filter(([m]) => m >= a && m <= b).map(([, r]) => r);
    if (v.length === 0) continue;
    const mean = v.reduce((p, q) => p + q, 0) / v.length;
    const sd = v.length > 1 ? Math.sqrt(v.reduce((p, q) => p + (q - mean) ** 2, 0) / (v.length - 1)) : 0;
    log(`cluster ${a} to ${b}: n ${v.length}, mean ${(100 * mean).toFixed(1)}%, min ${(100 * Math.min(...v)).toFixed(1)}%, max ${(100 * Math.max(...v)).toFixed(1)}%, sd ${(100 * sd).toFixed(1)}%`);
  }
  for (const s of BASIC_FINNER_SHOTS.filter((x) => x.use === 'reported')) {
    const r = finnedBodyComponents(
      config,
      { mach: s.mach, temperature, reynoldsPerLength: s.reynolds / G.length },
      exactConeNoseWaveDrag(s.mach, half),
      { transitionReynolds, wallTemperature: temperature },
    );
    log(`reported M ${s.mach}: ${r.refusals.length > 0 ? 'refused: ' + r.refusals.map((x) => `${x.component} (${x.reason})`).join('; ') : 'computed'}`);
  }
  writeFileSync(JSON_OUT, JSON.stringify(json, null, 1));
});
