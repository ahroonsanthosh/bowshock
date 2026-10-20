// The Basic Finner gate re-derived after the round 5 audit (0010 section 10), run on
// 2026-10-20, with the round 5 code final, as gate-round5.test.ts in tests/tmp-total; its
// output is gate-round5.out and .json (the runs made while this runner was written, on
// the same code, gave the same values). The configuration, the data and the components are the second run's
// (gate-second-run.test.ts, kept with its output); the band arithmetic changed after the
// hold-out was used: the transition input is evaluated as states of the boundary layer
// (finding 7) and no base term or band end exceeds the vacuum bound (finding 8). The
// residuals do not change. Each shot also prints the tolerance's high end under the second
// run's arithmetic (the trailing edges' laminar band added on its own, unclamped), which
// must reproduce gate-second-run.out, and the tolerance under the flagged alternative of
// section 10.2 (the laminar ratio at the nearest read Mach number), which is not adopted.
import { appendFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { finTrailingEdgeBaseDrag } from '../../src/base/fin-trailing-edge';
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

const OUT = 'tests/tmp-total/gate-round5.out';
const JSON_OUT = 'tests/tmp-total/gate-round5.json';
const log = (s: string) => appendFileSync(OUT, s + '\n');
const f4 = (x: number) => x.toFixed(4);
const pc = (x: number) => (100 * x).toFixed(1) + '%';

it('the gate re-derived after round 5', () => {
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
    const conditions = { mach: s.mach, temperature, reynoldsPerLength: s.reynolds / G.length };
    const r = finnedBodyComponents(config, conditions, exactConeNoseWaveDrag(s.mach, half), {
      transitionReynolds,
      wallTemperature: temperature,
    });
    if (r.refusals.length > 0) {
      log(
        `${s.shot} M ${s.mach}: REFUSED ${r.refusals.map((x) => `${x.component} (${x.reason}): ${x.message}`).join(' | ')}`,
      );
      json.push({ shot: s.shot, mach: s.mach, refused: r.refusals.map((x) => x.reason) });
      continue;
    }
    const t = combineComponents(r.components, r.inputs);
    const sp = spread[clusterOf(s.mach)]!;
    const inLow = t.inputs.reduce((a, i) => a + i.low, 0);
    const inHigh = t.inputs.reduce((a, i) => a + i.high, 0);
    const wall = t.inputs.find((i) => i.name === 'wall temperature')!;
    const transition = t.inputs.find((i) => i.name === 'transition')!;
    const residual = s.cx0 / t.cd - 1;
    const lo = (t.low + inLow) / t.cd - 1 + sp.lo;
    const hi = (t.high + inHigh) / t.cd - 1 + sp.hi;
    const hiNoWall = (t.high + inHigh - wall.high) / t.cd - 1 + sp.hi;
    const pass = residual >= lo && residual <= hi;
    residuals.push([s.mach, residual]);
    // The trailing-edge term as src/base gives it, with its laminar band beside it.
    const te = finTrailingEdgeBaseDrag({
      mach: s.mach,
      count: G.finCount,
      thickness: G.finTrailingEdgeThickness,
      span: G.finSpan,
      chord: G.finChord,
      tanSweep: 0,
      inBasePlane: true,
      layer: 'turbulent',
      reynoldsPerLength: conditions.reynoldsPerLength,
      transitionReynolds,
      referenceArea: Math.PI / 4,
    });
    // The second run's arithmetic: friction alone (high end 0) plus the trailing edges'
    // laminar band on its own, unclamped.
    const secondRunHigh = hi + (Math.max(0, (te.laminar!.high - 1) * te.cd) - transition.high) / t.cd;
    // The same with the vacuum bound alone (the laminar band clamped, still added on its own).
    const secondRunHighClamped = hi + (te.laminarInput.high - transition.high) / t.cd;
    // The flagged alternative to the envelope over M 1.5, 2.0 and 3.1 (not adopted, 0010
    // section 10.2): the laminar ratio at the read Mach number nearest the shot's.
    const nearest = te.laminar!.byMach.reduce((a, m) =>
      Math.abs(m.mach - s.mach) < Math.abs(a.mach - s.mach) ? m : a,
    );
    const altLow = Math.min(
      0,
      ...r.transitionStates.map(
        (x) => x.friction + (x.laminarTrailingEdge ? (nearest.low - 1) * te.cd : 0),
      ),
    );
    const altHigh = Math.max(
      0,
      ...r.transitionStates.map(
        (x) =>
          x.friction +
          (x.laminarTrailingEdge ? Math.min(nearest.high * te.cd, te.vacuum) - te.cd : 0),
      ),
    );
    const altLo = (t.low + inLow - transition.low + altLow) / t.cd - 1 + sp.lo;
    const altHi = (t.high + inHigh - transition.high + altHigh) / t.cd - 1 + sp.hi;
    const setsLow = r.transitionStates.find((x) => x.low === transition.low);
    const highState = r.transitionStates.reduce((a, x) => (x.high > a.high ? x : a));
    const c = (n: string) => t.components.find((x) => x.name === n)!;
    log(
      `${s.shot} M ${s.mach} CX0 ${s.cx0} | total ${f4(t.cd)} band ${f4(t.low)}..${f4(t.high)} | ` +
        t.components.map((x) => `${x.name} ${f4(x.cd)} [${f4(x.low)}, ${f4(x.high)}]`).join('; ') +
        ' | ' +
        t.inputs.map((i) => `${i.name} ${f4(i.low)}..${f4(i.high)}`).join('; ') +
        ` | residual ${pc(residual)} tolerance ${pc(lo)} to ${pc(hi)} (without the wall ${pc(hiNoWall)}) ${pass ? 'PASS' : 'FAIL'}` +
        ` | second run's arithmetic: high end ${pc(secondRunHigh)} (${(100 * secondRunHighClamped).toFixed(2)}% with the vacuum bound alone)` +
        ` | nearest-Mach alternative (M ${nearest.mach}, ${nearest.low.toFixed(3)} to ${nearest.high.toFixed(3)}): tolerance ${pc(altLo)} to ${pc(altHi)}` +
        ` | transition low set by Re_T ${setsLow?.reynolds.toExponential(1)}${setsLow?.bodyTurbulent === true ? ' (body turbulent)' : ''}, highest state ${f4(highState.high)} (Re_T ${highState.reynolds.toExponential(1)}${highState.bodyTurbulent ? ', body turbulent' : ''})` +
        ` | trailing edges: high end ${(c('fin trailing-edge base').high / te.vacuum).toFixed(3)} of the vacuum bound, laminar band ${f4(te.laminarInput.low)}..${f4(te.laminarInput.high)} beside the term${te.vacuumClamped.length > 0 ? ` (clamped: ${te.vacuumClamped.join(', ')})` : ''}` +
        ` | LE: ${c('fin leading edges').label.slice(-60)} | ${transition.label}`,
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
      transition: [+transition.low.toFixed(5), +transition.high.toFixed(5)],
      wall: +wall.high.toFixed(5),
      residual: +residual.toFixed(4),
      tolerance: [+lo.toFixed(4), +hi.toFixed(4)],
      toleranceHighWithoutWall: +hiNoWall.toFixed(4),
      toleranceHighSecondRunArithmetic: +secondRunHigh.toFixed(4),
      toleranceHighSecondRunArithmeticClamped: +secondRunHighClamped.toFixed(4),
      nearestMachAlternative: {
        mach: nearest.mach,
        ratio: [+nearest.low.toFixed(4), +nearest.high.toFixed(4)],
        tolerance: [+altLo.toFixed(4), +altHi.toFixed(4)],
      },
      pass,
      trailingEdge: {
        highOverVacuum: +(c('fin trailing-edge base').high / te.vacuum).toFixed(4),
        laminarBand: [+te.laminarInput.low.toFixed(5), +te.laminarInput.high.toFixed(5)],
        vacuumClamped: te.vacuumClamped,
      },
      components: Object.fromEntries(t.components.map((x) => [x.name, +x.cd.toFixed(5)])),
    });
  }
  for (let k = 0; k < BASIC_FINNER_CLUSTERS.length; k++) {
    const [a, b] = BASIC_FINNER_CLUSTERS[k]!;
    const v = residuals.filter(([m]) => m >= a && m <= b).map(([, r]) => r);
    if (v.length === 0) continue;
    const mean = v.reduce((p, q) => p + q, 0) / v.length;
    const sd =
      v.length > 1 ? Math.sqrt(v.reduce((p, q) => p + (q - mean) ** 2, 0) / (v.length - 1)) : 0;
    log(
      `cluster ${a} to ${b}: n ${v.length}, mean ${pc(mean)}, min ${pc(Math.min(...v))}, max ${pc(Math.max(...v))}, sd ${pc(sd)}`,
    );
  }
  for (const s of BASIC_FINNER_SHOTS.filter((x) => x.use === 'reported')) {
    const r = finnedBodyComponents(
      config,
      { mach: s.mach, temperature, reynoldsPerLength: s.reynolds / G.length },
      exactConeNoseWaveDrag(s.mach, half),
      { transitionReynolds, wallTemperature: temperature },
    );
    log(
      `reported M ${s.mach}: ${r.refusals.length > 0 ? 'refused: ' + r.refusals.map((x) => `${x.component} (${x.reason})`).join('; ') : 'computed'}`,
    );
  }
  writeFileSync(JSON_OUT, JSON.stringify(json, null, 1));
});
