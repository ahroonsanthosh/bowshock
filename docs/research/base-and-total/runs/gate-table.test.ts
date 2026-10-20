// Throwaway: the Basic Finner partial-sum table for 0010 and the gate test.
import { appendFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { trapezoidalPlanform } from '../../src/fins/planform';
import { singleWedge } from '../../src/fins/section';
import { finnedBodyComponents, type FinnedBody } from '../../src/total/finned-body';
import { exactConeNoseWaveDrag } from '../../src/total/nose';
import { combineComponents } from '../../src/total/total-drag';
import { BASIC_FINNER_CLUSTERS, BASIC_FINNER_SHOTS } from '../../src/validation/basic-finner';

const OUT = 'tests/tmp-total/gate-table.out';
const log = (s: string) => appendFileSync(OUT, s + '\n');
it('table', () => {
  writeFileSync(OUT, '');
  const half = (10 * Math.PI) / 180;
  const noseL = 0.5 / Math.tan(half);
  const config: FinnedBody = {
    body: { nose: { shape: { kind: 'conical' }, length: noseL, baseRadius: 0.5 }, cylinderLength: 10 - noseL },
    afterbody: 'cylinder',
    fins: {
      count: 4,
      planform: trapezoidalPlanform({ rootChord: 1, span: 1, leadingEdgeSweep: 0 }),
      section: singleWedge(0.08),
      sectionFamily: 'other',
      leadingEdgeRadius: 0.004,
      trailingEdgeAheadOfBase: 0,
    },
  };
  const gamma = 1.4;
  const aref = Math.PI / 4;
  const gated = BASIC_FINNER_SHOTS.filter((x) => x.use === 'gate');
  const clusterOf = (m: number) => BASIC_FINNER_CLUSTERS.findIndex(([a, b]) => m >= a && m <= b);
  const spread = BASIC_FINNER_CLUSTERS.map(([a, b]) => {
    const v = gated.filter((s) => s.mach >= a && s.mach <= b).map((s) => s.cx0);
    const mean = v.reduce((p, q) => p + q, 0) / v.length;
    return { mean, lo: Math.min(...v) / mean - 1, hi: Math.max(...v) / mean - 1 };
  });
  log(JSON.stringify(spread));
  const res: number[][] = [];
  for (const [label, T] of [
    ['a 343.7', 343.7 ** 2 / (gamma * 287.05)],
    ['a 343.4', 343.4 ** 2 / (gamma * 287.05)],
    ['a 344.0', 344.0 ** 2 / (gamma * 287.05)],
  ] as const) {
    log(`--- ${label} T ${T}`);
    for (const s of gated) {
      const r = finnedBodyComponents(
        config,
        { mach: s.mach, temperature: T, reynoldsPerLength: s.reynolds / 10 },
        exactConeNoseWaveDrag(s.mach, half),
        { transitionReynolds: [5e5, 1.6e6, 3e6], wallTemperature: T },
      );
      const t = combineComponents(r.components, r.inputs);
      const c = (n: string) => t.components.find((x) => x.name === n)!;
      const tr = t.inputs.find((i) => i.name === 'transition')!;
      const wall = t.inputs.find((i) => i.name === 'wall temperature')!;
      const sp = spread[clusterOf(s.mach)]!;
      const resid = s.cx0 / t.cd - 1;
      const tolLo = (t.low + tr.low) / t.cd - 1 + sp.lo;
      const tolHi0 = t.high / t.cd - 1 + sp.hi;
      const tolHi = (t.high + wall.high) / t.cd - 1 + sp.hi;
      const residCold = s.cx0 / (t.cd + wall.high) - 1;
      const gap = s.cx0 - t.cd;
      const vac = (4 * 0.08 * 1 * (2 / (gamma * s.mach * s.mach))) / aref;
      const m = s.mach;
      const sh = 1 + ((2 * gamma) / (gamma + 1)) * (m * m - 1);
      const m2 = Math.sqrt(((gamma - 1) * m * m + 2) / (2 * gamma * m * m - (gamma - 1)));
      const cpPitot = (sh * (1 + 0.2 * m2 * m2) ** 3.5 - 1) / (0.7 * m * m);
      const le = (4 * 0.008 * cpPitot) / aref;
      if (label === 'a 343.7') res.push([s.mach, resid]);
      log(
        `${s.shot} M ${s.mach} CX0 ${s.cx0} | nose ${c('nose wave drag').cd.toFixed(4)} bf ${c('body friction').cd.toFixed(4)} ff ${c('fin friction').cd.toFixed(4)} fw ${c('fin wave drag').cd.toFixed(4)} base ${c('body base').cd.toFixed(4)} | sum ${t.cd.toFixed(4)} band ${t.low.toFixed(4)}..${t.high.toFixed(4)} tr ${tr.low.toFixed(4)} wall +${wall.high.toFixed(4)} | resid ${(100 * resid).toFixed(1)}% cold ${(100 * residCold).toFixed(1)}% tol ${(100 * tolLo).toFixed(1)}..${(100 * tolHi0).toFixed(1)} (wall ${(100 * tolHi).toFixed(1)}) | gap ${gap.toFixed(4)} gapCold ${(gap - wall.high).toFixed(4)} LEpitot ${le.toFixed(4)} TEvac ${vac.toFixed(4)} | F ${r.base!.finsOnBase!.nominal.toFixed(4)} ${r.base!.finsOnBase!.low.toFixed(4)}..${r.base!.finsOnBase!.high.toFixed(4)} pB ${r.base!.curve.pB.toFixed(5)} e ${r.base!.curve.interpolationError.toExponential(2)}`,
      );
      if (label === 'a 343.7') {
        log(
          `JSON ${JSON.stringify({ shot: s.shot, mach: s.mach, cd: +t.cd.toFixed(5), low: +t.low.toFixed(5), high: +t.high.toFixed(5), transition: +tr.low.toFixed(5), wall: +wall.high.toFixed(5), residual: +resid.toFixed(4) })}`,
        );
      }
    }
  }
  for (let k = 0; k < BASIC_FINNER_CLUSTERS.length; k++) {
    const [a, b] = BASIC_FINNER_CLUSTERS[k]!;
    const v = res.filter(([m]) => m! >= a && m! <= b).map(([, r]) => r!);
    const mean = v.reduce((p, q) => p + q, 0) / v.length;
    const sd = Math.sqrt(v.reduce((p, q) => p + (q - mean) ** 2, 0) / (v.length - 1));
    log(`cluster ${a}-${b}: n ${v.length} mean ${(100 * mean).toFixed(1)}% min ${(100 * Math.min(...v)).toFixed(1)} max ${(100 * Math.max(...v)).toFixed(1)} sd ${(100 * sd).toFixed(1)}`);
  }
  for (const s of BASIC_FINNER_SHOTS.filter((x) => x.use === 'reported')) {
    const T = 343.7 ** 2 / (gamma * 287.05);
    const r = finnedBodyComponents(
      config,
      { mach: s.mach, temperature: T, reynoldsPerLength: s.reynolds / 10 },
      exactConeNoseWaveDrag(s.mach, half),
      {},
    );
    log(`reported ${s.mach}: ${r.refusals.map((x) => x.component + ': ' + x.reason).join('; ')}`);
  }
});
