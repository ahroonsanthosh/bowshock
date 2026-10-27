/**
 * BRL Report 934's range A (Mach 1.5 to 2.47), run once as registered in
 * docs/design/0014-refusals.md section 10 (10.1 rules 3 to 5, 10.3, 10.5,
 * 10.6, and the amendment of 10.7 (n), which lists the rounds and inputs
 * below and was committed before this run).
 *
 * The set: the Basic Finner in the BRL Free Flight Aerodynamics Range, its
 * Table III per round (src/validation/brl934.ts), read twice (round 9) with
 * Graph I's symbols read twice (round 7). Held back: no band was set or
 * shaped on it, and nothing here may be tuned on it (0008 section 6.1).
 *
 * What is run, per admitted round (10.6 item 5's rule, `BRL934_ADMITTED`):
 *
 * - the rebuilt-factor total: the library's components with the body base's
 *   fins-on-base factor the rebuilt one (W1, src/base/fins-on-base-w1.ts),
 *   asked directly (src/validation/hold-out-run.ts); W2 serves the body base
 *   below Mach 1.5 only, where no admitted round lies;
 * - the present-model total, at the rounds at Mach 1.798 to 2.47 (10.3): the
 *   library's total as served, its body base on the present factor (0010
 *   section 1.3);
 * - each with its tolerance by rule 4 of 10.1, as the DREV gate builds it
 *   (tests/validation/basic-finner.test.ts; 0010 sections 4.1, 6.2, 10.3):
 *   the model-form band, the input bands (transition as states, 0008's
 *   input as for DREV; the wall from adiabatic to the air temperature; the
 *   diameter and air ranges, 10.6 items 1 and 2, as one band over their four
 *   corners) and the spread of the round's Mach cluster, over the modelled
 *   total; the residual CD0 / modelled - 1, CD0 from Graph II's curve (10.6
 *   item 5).
 *
 * Reported beside the verdict, never as it (10.6): CD0 with the text's
 * rounded C_D'; DREV's 0.004 cal leading edge where the library serves it;
 * the trailing-edge term halved (the tapered alternative, by hand). And two
 * readings the registration's text leaves open, decided before the run and
 * reported beside it (10.7 (n)): round 3263 out (round 7's blind call of its
 * lower symbol), and the present model's cluster spread at M 1.78 to 1.83
 * taken over all seven admitted rounds there.
 *
 * Run once, on 2026-10-22, at the pre-run commit 1af3786; RECORDED below holds what it gave.
 * The harness is validated on the DREV gate (tests/validation/hold-out-run.test.ts),
 * not on BRL. The run writes its output when BRL934_RUN_OUT names a folder.
 *
 * After the run (2026-10-27, 0014 section 10.7 (ah)) the compiled curve's band widened from 0.82 to 1.08,
 * which the run used, to 0.77 to 1.18, by 0008 section 3.3's rule applied to body-alone base pressures it had
 * left out: a band widened after this hold-out was used. It moves no total and no residual, only the body
 * base's band ends (by the change in the band's end times the body base term) and with them each tolerance.
 * RECORDED keeps what the run gave; the tests check the model against it plus that widening (`widenedBy`). The
 * verdicts are unchanged.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { COMPILED_CURVE_BAND } from '../../src/base/compiled-curve';
import { trapezoidalPlanform } from '../../src/fins/planform';
import { singleWedge } from '../../src/fins/section';
import type { FinnedBody } from '../../src/total/finned-body';
import type { TotalDrag } from '../../src/total/total-drag';
import {
  BRL934_ADMITTED,
  BRL934_AIR,
  BRL934_CLUSTERS,
  BRL934_GEOMETRY as G,
  BRL934_PRESENT_FROM,
  BRL934_RANGE_A_ROUNDS,
  BRL934_TRANSITION_REYNOLDS,
  admission,
  brl934ConditionSet,
  graph2Reading,
  textYawDragCoefficient,
  zeroYawCd,
  type Brl934Round,
} from '../../src/validation/brl934';
import {
  clusterSpread,
  modelCase,
  verdictOf,
  withTrailingEdgeScaled,
  type BodyBaseModel,
  type HoldOutCase,
  type HoldOutConfiguration,
  type ModelledCase,
  type Verdict,
} from '../../src/validation/hold-out-run';

const half = (G.coneHalfAngleDegrees * Math.PI) / 180;
const noseLength = 0.5 / Math.tan(half);
const bodyWith = (leadingEdgeRadius: number): FinnedBody => ({
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
    leadingEdgeRadius,
    trailingEdgeAheadOfBase: 0,
  },
});
const configWith = (leadingEdgeRadius: number): HoldOutConfiguration => ({
  body: bodyWith(leadingEdgeRadius),
  coneHalfAngle: half,
  inputs: {
    transitionReynolds: [...BRL934_TRANSITION_REYNOLDS],
    wallTemperature: BRL934_AIR.temperatureNominal,
  },
});
const NOMINAL = configWith(G.finLeadingEdgeRadius);
const DREV_EDGE = configWith(G.sensitivityLeadingEdgeRadius);

const ROUNDS: Record<BodyBaseModel, readonly Brl934Round[]> = {
  present: BRL934_ADMITTED.filter((r) => r.mach >= BRL934_PRESENT_FROM),
  rebuilt: BRL934_ADMITTED,
};

const caseOf = (r: Brl934Round, measured: number): HoldOutCase => {
  const s = brl934ConditionSet(r.mach);
  return {
    id: String(r.round),
    mach: r.mach,
    measured,
    conditions: s.nominal,
    corners: s.corners,
  };
};

/** Each round's cluster spread, over the given rounds' values in its Mach cluster. */
function spreadsOver(
  rounds: readonly Brl934Round[],
  value: (r: Brl934Round) => number,
): Map<number, { lo: number; hi: number }> {
  const out = new Map<number, { lo: number; hi: number }>();
  for (const [a, b] of BRL934_CLUSTERS) {
    const members = rounds.filter((r) => r.mach >= a && r.mach <= b);
    if (members.length === 0) continue;
    const s = clusterSpread(members.map(value));
    for (const r of members) out.set(r.round, s);
  }
  for (const r of rounds) {
    if (!out.has(r.round)) throw new Error(`round ${r.round} lies in no cluster`);
  }
  return out;
}

interface Served {
  readonly cd: number;
  readonly low: number;
  readonly high: number;
  readonly residual: number;
  readonly tolerance: readonly [number, number];
  readonly highWithoutWall: number;
  readonly inside: boolean;
}
interface Refused {
  readonly refusals: readonly { component: string; reason: string; message: string }[];
}
type Outcome = (Served & { readonly refused: false }) | (Refused & { readonly refused: true });

const served = (t: TotalDrag, v: Verdict): Outcome => ({
  refused: false,
  cd: t.cd,
  low: t.low,
  high: t.high,
  residual: v.residual,
  tolerance: v.tolerance,
  highWithoutWall: v.highWithoutWall,
  inside: v.inside,
});
const refusedOf = (m: ModelledCase): Outcome => ({
  refused: true,
  refusals: m.refusals.map((r) => ({ ...r })),
});

interface RoundRecord {
  readonly round: number;
  readonly mach: number;
  readonly model: BodyBaseModel;
  readonly cd0: number;
  readonly cd0ByReading: readonly [number, number];
  readonly reynoldsOnLength: { nominal: number; low: number; high: number };
  readonly spread: { lo: number; hi: number };
  readonly outcome: Outcome;
  readonly components?: readonly { name: string; cd: number; low: number; high: number }[];
  readonly inputs?: readonly { name: string; low: number; high: number }[];
  readonly bodyBaseLabel?: string;
  /** The library's own total at the round, as it routes the body base: its source, or its refusals. */
  readonly library: string;
  readonly sensitivities: {
    readonly cdPrimeText: { cd0: number; spread: { lo: number; hi: number }; outcome: Outcome };
    readonly drevLeadingEdge: Outcome;
    readonly taperedTrailingEdge: Outcome;
    readonly without3263?: Outcome;
    readonly sevenRoundSpread?: Outcome;
  };
  readonly error?: string;
}

interface RunRecord {
  readonly date: string;
  readonly rounds: readonly RoundRecord[];
  /** Anything thrown that is not a refusal: a harness error, which stops the record's use. */
  readonly errors: readonly string[];
  readonly verdict: Record<BodyBaseModel, string>;
}

function verdictText(records: readonly RoundRecord[]): string {
  const outs = records.map((r) => r.outcome);
  const refused = records.filter((r) => r.outcome.refused).map((r) => r.round);
  const outside = records
    .filter((r) => !r.outcome.refused && !(r.outcome as Served).inside)
    .map((r) => r.round);
  if (records.some((r) => r.error !== undefined)) return 'error: the run did not complete';
  if (outside.length > 0) return `fail: outside the tolerance at ${outside.join(', ')}`;
  if (refused.length === outs.length) return `refused at every round (${refused.join(', ')})`;
  if (refused.length > 0) return `no pass: refused at ${refused.join(', ')}; the rest inside`;
  return 'pass: every round inside its tolerance';
}

function runOnce(): RunRecord {
  const cd0 = (r: Brl934Round) => zeroYawCd(r);
  const cd0Text = (r: Brl934Round) => zeroYawCd(r, textYawDragCoefficient);
  const records: RoundRecord[] = [];
  const errors: string[] = [];
  for (const model of ['present', 'rebuilt'] as const) {
    const rounds = ROUNDS[model];
    const spreads = spreadsOver(rounds, cd0);
    const spreadsText = spreadsOver(rounds, cd0Text);
    const without3263 = spreadsOver(
      rounds.filter((r) => r.round !== 3263),
      cd0,
    );
    const seven = spreadsOver(BRL934_ADMITTED, cd0);
    for (const r of rounds) {
      const measured = cd0(r);
      const spread = spreads.get(r.round)!;
      const set = brl934ConditionSet(r.mach);
      const re = [set.nominal, ...set.corners.map((c) => c.conditions)].map(
        (c) => c.reynoldsPerLength * G.length,
      );
      const base = {
        round: r.round,
        mach: r.mach,
        model,
        cd0: measured,
        cd0ByReading: [0, 1].map((k) =>
          zeroYawCd(r, (m) => graph2Reading(k as 0 | 1, m)),
        ) as unknown as readonly [number, number],
        reynoldsOnLength: { nominal: re[0]!, low: Math.min(...re), high: Math.max(...re) },
        spread,
      };
      try {
        const m = modelCase(NOMINAL, caseOf(r, measured), model);
        const library =
          m.parts.refusals.length > 0
            ? `refused: ${m.parts.refusals.map((x) => `${x.component} (${x.reason}): ${x.message}`).join('; ')}`
            : `served, the body base on the ${m.parts.base?.finsOnBaseSource ?? 'no'} factor`;
        let leOutcome: Outcome;
        try {
          const le = modelCase(DREV_EDGE, caseOf(r, measured), model);
          leOutcome =
            le.total === undefined
              ? refusedOf(le)
              : served(le.total, verdictOf(le.total, measured, spread));
        } catch (e) {
          const message = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
          errors.push(`round ${r.round}, ${model}, DREV's edge: ${message}`);
          leOutcome = {
            refused: true,
            refusals: [{ component: 'harness', reason: 'error', message }],
          };
        }
        const textSpread = spreadsText.get(r.round)!;
        if (m.total === undefined) {
          records.push({
            ...base,
            outcome: refusedOf(m),
            library,
            sensitivities: {
              cdPrimeText: { cd0: cd0Text(r), spread: textSpread, outcome: refusedOf(m) },
              drevLeadingEdge: leOutcome,
              taperedTrailingEdge: refusedOf(m),
            },
          });
          continue;
        }
        const t = m.total;
        const halved = withTrailingEdgeScaled(m, G.trailingEdgeTaperedFactor);
        const alt3263 =
          r.round === 3264
            ? served(t, verdictOf(t, measured, without3263.get(r.round)!))
            : undefined;
        const inSeven = model === 'present' && r.mach >= 1.78 && r.mach <= 1.83;
        const alt7 = inSeven ? served(t, verdictOf(t, measured, seven.get(r.round)!)) : undefined;
        records.push({
          ...base,
          outcome: served(t, verdictOf(t, measured, spread)),
          components: t.components.map((c) => ({
            name: c.name,
            cd: c.cd,
            low: c.low,
            high: c.high,
          })),
          inputs: t.inputs.map((i) => ({ name: i.name, low: i.low, high: i.high })),
          bodyBaseLabel: t.components.find((c) => c.name === 'body base')?.label ?? '',
          library,
          sensitivities: {
            cdPrimeText: {
              cd0: cd0Text(r),
              spread: textSpread,
              outcome: served(t, verdictOf(t, cd0Text(r), textSpread)),
            },
            drevLeadingEdge: leOutcome,
            taperedTrailingEdge: served(halved, verdictOf(halved, measured, spread)),
            ...(alt3263 === undefined ? {} : { without3263: alt3263 }),
            ...(alt7 === undefined ? {} : { sevenRoundSpread: alt7 }),
          },
        });
      } catch (e) {
        const none: Outcome = { refused: true, refusals: [] };
        records.push({
          ...base,
          outcome: none,
          library: '',
          sensitivities: {
            cdPrimeText: { cd0: cd0Text(r), spread: spreadsText.get(r.round)!, outcome: none },
            drevLeadingEdge: none,
            taperedTrailingEdge: none,
          },
          error: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
        });
        errors.push(`round ${r.round}, ${model}: ${records[records.length - 1]!.error!}`);
      }
    }
  }
  const of = (model: BodyBaseModel) => records.filter((r) => r.model === model);
  return {
    date: new Date().toISOString(),
    rounds: records,
    errors,
    verdict: {
      present: errors.length > 0 ? 'error: the run did not complete' : verdictText(of('present')),
      rebuilt: errors.length > 0 ? 'error: the run did not complete' : verdictText(of('rebuilt')),
    },
  };
}

const pc = (x: number) => `${x >= 0 ? '+' : ''}${(100 * x).toFixed(1)}%`;
function outcomeText(o: Outcome): string {
  if (o.refused) {
    return o.refusals.length === 0
      ? 'error'
      : `refused: ${o.refusals.map((x) => `${x.component} (${x.reason}): ${x.message}`).join('; ')}`;
  }
  return (
    `C_D ${o.cd.toFixed(4)} (${o.low.toFixed(4)} to ${o.high.toFixed(4)}), residual ${pc(o.residual)}, ` +
    `tolerance ${pc(o.tolerance[0])} to ${pc(o.tolerance[1])} (high end without the wall ` +
    `${pc(o.highWithoutWall)}): ${o.inside ? 'inside' : 'OUTSIDE'}`
  );
}

function report(run: RunRecord): string {
  const lines: string[] = [];
  lines.push(`BRL Report 934, range A (Mach 1.5 to 2.47), run once: ${run.date}`);
  lines.push('');
  lines.push('== The rounds of range A (0014 section 10.6 item 5; no drag value used)');
  for (const r of BRL934_RANGE_A_ROUNDS) {
    const a = admission(r);
    lines.push(
      `round ${r.round}, M ${r.mach.toFixed(3)}: ${a.admitted ? 'in' : 'out'}, ${a.reason}`,
    );
  }
  lines.push('');
  if (run.errors.length > 0) {
    lines.push('== ERRORS');
    for (const e of run.errors) lines.push(e);
    lines.push('');
  }
  for (const model of ['present', 'rebuilt'] as const) {
    lines.push(
      model === 'present'
        ? '== The present model (present fins-on-base factor), the rounds at Mach 1.798 to 2.47'
        : '== The rebuilt-factor total (W1), every admitted round',
    );
    lines.push(`Verdict by rule 4: ${run.verdict[model]}`);
    for (const r of run.rounds.filter((x) => x.model === model)) {
      lines.push('');
      lines.push(
        `round ${r.round}, M ${r.mach.toFixed(3)}: CD0 ${r.cd0.toFixed(4)} (Graph II readings ` +
          `${r.cd0ByReading.map((x) => x.toFixed(4)).join(', ')}); Re on 10 cal ` +
          `${r.reynoldsOnLength.nominal.toExponential(3)} (${r.reynoldsOnLength.low.toExponential(3)} to ` +
          `${r.reynoldsOnLength.high.toExponential(3)}); cluster spread ${pc(r.spread.lo)} to ${pc(r.spread.hi)}`,
      );
      if (r.error !== undefined) lines.push(`  ERROR: ${r.error}`);
      lines.push(`  ${outcomeText(r.outcome)}`);
      if (r.components !== undefined) {
        for (const c of r.components) {
          lines.push(
            `    ${c.name}: ${c.cd.toFixed(5)} (${c.low.toFixed(5)} to ${c.high.toFixed(5)})`,
          );
        }
        for (const i of r.inputs ?? []) {
          lines.push(`    input ${i.name}: ${i.low.toFixed(5)} to ${i.high.toFixed(5)}`);
        }
        lines.push(`    body base: ${r.bodyBaseLabel}`);
      }
      lines.push(`  library as routed: ${r.library}`);
      const s = r.sensitivities;
      lines.push(
        `  sensitivity, the text's C_D' (CD0 ${s.cdPrimeText.cd0.toFixed(4)}, spread ` +
          `${pc(s.cdPrimeText.spread.lo)} to ${pc(s.cdPrimeText.spread.hi)}): ${outcomeText(s.cdPrimeText.outcome)}`,
      );
      lines.push(`  sensitivity, DREV's 0.004 cal edge: ${outcomeText(s.drevLeadingEdge)}`);
      lines.push(
        `  sensitivity, the trailing-edge term halved: ${outcomeText(s.taperedTrailingEdge)}`,
      );
      if (s.without3263 !== undefined) {
        lines.push(`  reading alternative, 3263 out: ${outcomeText(s.without3263)}`);
      }
      if (s.sevenRoundSpread !== undefined) {
        lines.push(
          `  reading alternative, the spread over all seven admitted rounds at M 1.78 to 1.83: ${outcomeText(s.sevenRoundSpread)}`,
        );
      }
    }
    lines.push('');
  }
  return lines.join('\n') + '\n';
}

type RecordedOutcome =
  | {
      readonly residual: number;
      readonly tolerance: readonly [number, number];
      readonly inside: boolean;
    }
  | { readonly refused: readonly string[] };

/** What the run recorded, per model and round. */
interface RecordedRun {
  readonly verdict: Record<BodyBaseModel, string>;
  readonly present: readonly {
    readonly round: number;
    readonly cd0: number;
    readonly cd: number;
    readonly low: number;
    readonly high: number;
    readonly inputLow: number;
    readonly inputHigh: number;
    /** The diameter-and-air input band. */
    readonly conditions: readonly [number, number];
    readonly residual: number;
    readonly tolerance: readonly [number, number];
    readonly highWithoutWall: number;
    readonly inside: boolean;
    /** Nose wave drag, body friction, fin friction, fin wave drag, body base, fin trailing-edge base. */
    readonly components: readonly number[];
    readonly text: RecordedOutcome;
    readonly drevEdge: RecordedOutcome;
    readonly tapered: RecordedOutcome;
    readonly without3263?: RecordedOutcome;
    readonly seven?: RecordedOutcome;
  }[];
  readonly rebuilt: readonly {
    readonly round: number;
    readonly refusals: readonly (readonly [string, string])[];
  }[];
}

/**
 * The run as it came out, made once on 2026-10-22 at the pre-run commit (1af3786), its output
 * kept unchanged as docs/research/base-and-total/runs/brl934-range-a.out and .json; recorded
 * here after it, as basic-finner.test.ts records its second run (C_D to five decimals, residuals
 * and tolerances to four). Result and verdicts: docs/design/0020-brl934-range-a.md.
 */
const RECORDED: RecordedRun = {
  verdict: {
    present: 'pass: every round inside its tolerance',
    rebuilt: 'refused at every round (3254, 2595, 2599, 2591, 2588, 2590, 2596, 2589, 3263, 3264)',
  },
  present: [
    {
      round: 2591,
      cd0: 0.60327,
      cd: 0.5804,
      low: 0.49804,
      high: 0.69735,
      inputLow: -0.05978,
      inputHigh: 0.01723,
      conditions: [-0.00102, 0.00104],
      residual: 0.0394,
      tolerance: [-0.2708, 0.2705],
      highWithoutWall: 0.2426,
      inside: true,
      components: [0.11047, 0.08538, 0.03872, 0.02041, 0.21842, 0.10701],
      text: { residual: 0.0393, tolerance: [-0.2707, 0.2706], inside: true },
      drevEdge: { refused: ['leading-edge-range'] },
      tapered: { residual: 0.145, tolerance: [-0.2688, 0.2726], inside: true },
      seven: { residual: 0.0394, tolerance: [-0.2796, 0.2816], inside: true },
    },
    {
      round: 2588,
      cd0: 0.61454,
      cd: 0.58,
      low: 0.49774,
      high: 0.69684,
      inputLow: -0.05973,
      inputHigh: 0.01724,
      conditions: [-0.00102, 0.00104],
      residual: 0.0596,
      tolerance: [-0.2707, 0.2705],
      highWithoutWall: 0.2425,
      inside: true,
      components: [0.11044, 0.08535, 0.03871, 0.0204, 0.21819, 0.10692],
      text: { residual: 0.0594, tolerance: [-0.2706, 0.2706], inside: true },
      drevEdge: { refused: ['leading-edge-range'] },
      tapered: { residual: 0.1671, tolerance: [-0.2687, 0.2726], inside: true },
      seven: { residual: 0.0596, tolerance: [-0.2795, 0.2816], inside: true },
    },
    {
      round: 2590,
      cd0: 0.64364,
      cd: 0.57959,
      low: 0.49744,
      high: 0.69632,
      inputLow: -0.05968,
      inputHigh: 0.01725,
      conditions: [-0.00102, 0.00104],
      residual: 0.1105,
      tolerance: [-0.2706, 0.2704],
      highWithoutWall: 0.2425,
      inside: true,
      components: [0.1104, 0.08533, 0.0387, 0.02038, 0.21796, 0.10683],
      text: { residual: 0.1105, tolerance: [-0.2705, 0.2706], inside: true },
      drevEdge: { refused: ['leading-edge-range'] },
      tapered: { residual: 0.2232, tolerance: [-0.2686, 0.2726], inside: true },
      seven: { residual: 0.1105, tolerance: [-0.2794, 0.2816], inside: true },
    },
    {
      round: 2596,
      cd0: 0.62358,
      cd: 0.57517,
      low: 0.49418,
      high: 0.69067,
      inputLow: -0.05914,
      inputHigh: 0.01736,
      conditions: [-0.00102, 0.00104],
      residual: 0.0842,
      tolerance: [-0.2695, 0.2703],
      highWithoutWall: 0.2419,
      inside: true,
      components: [0.11003, 0.08506, 0.03857, 0.02023, 0.21543, 0.10585],
      text: { residual: 0.0837, tolerance: [-0.2694, 0.2704], inside: true },
      drevEdge: { refused: ['leading-edge-range'] },
      tapered: { residual: 0.194, tolerance: [-0.2675, 0.2724], inside: true },
      seven: { residual: 0.0842, tolerance: [-0.2783, 0.2814], inside: true },
    },
    {
      round: 2589,
      cd0: 0.61149,
      cd: 0.57,
      low: 0.49039,
      high: 0.68404,
      inputLow: -0.05851,
      inputHigh: 0.0175,
      conditions: [-0.00101, 0.00103],
      residual: 0.0728,
      tolerance: [-0.2682, 0.2701],
      highWithoutWall: 0.2412,
      inside: true,
      components: [0.10959, 0.08475, 0.03843, 0.02005, 0.21246, 0.10472],
      text: { residual: 0.0726, tolerance: [-0.2681, 0.2702], inside: true },
      drevEdge: { refused: ['leading-edge-range'] },
      tapered: { residual: 0.1813, tolerance: [-0.2661, 0.2722], inside: true },
      seven: { residual: 0.0728, tolerance: [-0.277, 0.2812], inside: true },
    },
    {
      round: 3263,
      cd0: 0.46982,
      cd: 0.4314,
      low: 0.37253,
      high: 0.51881,
      inputLow: -0.03871,
      inputHigh: 0.02275,
      conditions: [-0.00085, 0.00087],
      residual: 0.0891,
      tolerance: [-0.2495, 0.2786],
      highWithoutWall: 0.2279,
      inside: true,
      components: [0.09543, 0.07166, 0.03257, 0.01452, 0.14645, 0.07078],
      text: { residual: 0.0901, tolerance: [-0.2499, 0.279], inside: true },
      drevEdge: { residual: -0.0112, tolerance: [-0.2326, 0.2605], inside: true },
      tapered: { residual: 0.1864, tolerance: [-0.2491, 0.2827], inside: true },
    },
    {
      round: 3264,
      cd0: 0.44844,
      cd: 0.42395,
      low: 0.36629,
      high: 0.50973,
      inputLow: -0.03768,
      inputHigh: 0.02307,
      conditions: [-0.00084, 0.00085],
      residual: 0.0578,
      tolerance: [-0.2482, 0.28],
      highWithoutWall: 0.2276,
      inside: true,
      components: [0.09466, 0.07077, 0.03217, 0.01424, 0.14327, 0.06884],
      text: { residual: 0.0579, tolerance: [-0.2486, 0.2804], inside: true },
      drevEdge: { residual: -0.0415, tolerance: [-0.2311, 0.2615], inside: true },
      tapered: { residual: 0.1512, tolerance: [-0.2479, 0.2842], inside: true },
      without3263: { residual: 0.0578, tolerance: [-0.2249, 0.2567], inside: true },
    },
  ],
  rebuilt: [
    { round: 3254, refusals: [['body base', 'fin-trailing-edge']] },
    { round: 2595, refusals: [['body base', 'fin-trailing-edge']] },
    { round: 2599, refusals: [['body base', 'fin-trailing-edge']] },
    { round: 2591, refusals: [['body base', 'fin-trailing-edge']] },
    { round: 2588, refusals: [['body base', 'fin-trailing-edge']] },
    { round: 2590, refusals: [['body base', 'fin-trailing-edge']] },
    { round: 2596, refusals: [['body base', 'fin-trailing-edge']] },
    { round: 2589, refusals: [['body base', 'fin-trailing-edge']] },
    { round: 3263, refusals: [['body base', 'fin-trailing-edge']] },
    { round: 3264, refusals: [['body base', 'fin-trailing-edge']] },
  ],
};

let run: RunRecord | undefined;

beforeAll(() => {
  run = runOnce();
  const dir = process.env.BRL934_RUN_OUT;
  if (dir !== undefined && dir !== '') {
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}/brl934-range-a.out`, report(run));
    writeFileSync(`${dir}/brl934-range-a.json`, JSON.stringify(run, null, 2) + '\n');
  }
}, 3_600_000);

const near = (a: number, b: number, tol: number) => Math.abs(a - b) < tol;

/** The compiled curve's band when the run was made (0010 section 1.2), before 0014 10.7 (ah). */
const BAND_AT_THE_RUN = { low: 0.82, high: 1.08 } as const;
/** What 0014 10.7 (ah) adds to the body base's band ends, in C_D, for a body base term `cd`. */
const widenedBy = (cd: number) => ({
  low: (COMPILED_CURVE_BAND.low - BAND_AT_THE_RUN.low) * cd,
  high: (COMPILED_CURVE_BAND.high - BAND_AT_THE_RUN.high) * cd,
});
/** The recorded outcome's tolerance moved by a widening `w` (C_D) of a total `cd`. */
const widenedOutcome = (
  r: RecordedOutcome,
  w: { low: number; high: number },
  cd: number,
): RecordedOutcome =>
  'refused' in r
    ? r
    : {
        ...r,
        tolerance: [r.tolerance[0] + w.low / cd, r.tolerance[1] + w.high / cd],
      };

function matches(o: Outcome, r: RecordedOutcome): boolean {
  if ('refused' in r)
    return o.refused && o.refusals.map((x) => x.reason).join() === r.refused.join();
  return (
    !o.refused &&
    near(o.residual, r.residual, 1e-4) &&
    near(o.tolerance[0], r.tolerance[0], 1e-4) &&
    near(o.tolerance[1], r.tolerance[1], 1e-4) &&
    o.inside === r.inside
  );
}

describe('BRL Report 934, range A, run once as registered', { timeout: 3_600_000 }, () => {
  it('computes every admitted round under each model: a total or its refusals, no error', () => {
    const r = run!;
    expect(r.rounds.filter((x) => x.model === 'present').map((x) => x.round)).toEqual([
      2591, 2588, 2590, 2596, 2589, 3263, 3264,
    ]);
    expect(r.rounds.filter((x) => x.model === 'rebuilt').map((x) => x.round)).toEqual([
      3254, 2595, 2599, 2591, 2588, 2590, 2596, 2589, 3263, 3264,
    ]);
    expect(r.errors).toEqual([]);
    for (const x of r.rounds) {
      if (x.outcome.refused) expect(x.outcome.refusals.length).toBeGreaterThan(0);
      else expect(Number.isFinite(x.outcome.residual)).toBe(true);
    }
  });

  it('the verdicts by rule 4: the present model passes at all seven rounds; the rebuilt factor is refused at all ten', () => {
    expect(run!.verdict).toEqual(RECORDED.verdict);
  });

  it('the present model, per round as recorded: the total, its band, its input bands, the residual and the tolerance', () => {
    const rounds = run!.rounds.filter((x) => x.model === 'present');
    expect(rounds.map((x) => x.round)).toEqual(RECORDED.present.map((x) => x.round));
    rounds.forEach((x, k) => {
      const r = RECORDED.present[k]!;
      const o = x.outcome;
      if (o.refused) throw new Error(`round ${x.round} refused`);
      expect(near(x.cd0, r.cd0, 1e-5)).toBe(true);
      // The run's values plus 0014 10.7 (ah)'s widening of the body base's band (its term, r.components[4]).
      const w = widenedBy(r.components[4]!);
      expect(
        [o.cd, o.low, o.high].map((v, i) =>
          near(v, [r.cd, r.low + w.low, r.high + w.high][i]!, 1e-5),
        ),
      ).toEqual([true, true, true]);
      const inputs = x.inputs!;
      expect(inputs.map((i) => i.name)).toEqual([
        'transition',
        'wall temperature',
        'roughness',
        'diameter and air',
      ]);
      expect(
        near(
          inputs.reduce((a, i) => a + i.low, 0),
          r.inputLow,
          1e-5,
        ),
      ).toBe(true);
      expect(
        near(
          inputs.reduce((a, i) => a + i.high, 0),
          r.inputHigh,
          1e-5,
        ),
      ).toBe(true);
      const band = inputs.find((i) => i.name === 'diameter and air')!;
      expect([
        near(band.low, r.conditions[0], 1e-5),
        near(band.high, r.conditions[1], 1e-5),
      ]).toEqual([true, true]);
      expect(near(o.residual, r.residual, 1e-4)).toBe(true);
      expect(near(o.tolerance[0], r.tolerance[0] + w.low / r.cd, 1e-4)).toBe(true);
      expect(near(o.tolerance[1], r.tolerance[1] + w.high / r.cd, 1e-4)).toBe(true);
      expect(near(o.highWithoutWall, r.highWithoutWall + w.high / r.cd, 1e-4)).toBe(true);
      expect(o.inside).toBe(r.inside);
      const body = x.components!.find((c) => c.name === 'body base')!;
      expect(near(body.cd, r.components[4]!, 1e-5)).toBe(true);
      expect(x.components!.map((c) => c.name)).toEqual([
        'nose wave drag',
        'body friction',
        'fin friction',
        'fin wave drag',
        'body base',
        'fin trailing-edge base',
      ]);
      expect(x.components!.map((c, j) => near(c.cd, r.components[j]!, 1e-5))).toEqual(
        r.components.map(() => true),
      );
      expect(x.library).toBe('served, the body base on the present factor');
    });
    // Residuals +3.9, +6.0, +11.0, +8.4, +7.3, +8.9, +5.8 % (mean +7.3%); tolerances at the run -24.8%
    // to -27.1% and +27.0% to +28.0%, and with the band widened after it (0014 10.7 (ah)) -26.5% to
    // -29.0% and +30.7% to +31.4%: every round still inside.
    const outcomes = rounds.map((x) => x.outcome as Served);
    const pct = (v: number[]) => v.map((y) => Math.round(1000 * y) / 10);
    expect(pct(outcomes.map((o) => o.residual))).toEqual([3.9, 6.0, 11.0, 8.4, 7.3, 8.9, 5.8]);
    const mean = outcomes.reduce((a, o) => a + o.residual, 0) / outcomes.length;
    expect(Math.round(1000 * mean) / 10).toBe(7.3);
    const lo = outcomes.map((o) => o.tolerance[0]);
    const hi = outcomes.map((o) => o.tolerance[1]);
    expect(pct([Math.min(...lo), Math.max(...lo), Math.min(...hi), Math.max(...hi)])).toEqual([
      -29.0, -26.5, 30.7, 31.4,
    ]);
    const tol = RECORDED.present.map((r) => r.tolerance);
    expect(
      pct([
        Math.min(...tol.map((t) => t[0])),
        Math.max(...tol.map((t) => t[0])),
        Math.min(...tol.map((t) => t[1])),
        Math.max(...tol.map((t) => t[1])),
      ]),
    ).toEqual([-27.1, -24.8, 27.0, 28.0]);
    expect(outcomes.every((o) => o.inside)).toBe(true);
  });

  it('the rebuilt factor, per round as recorded: refused for the body base, the faces diverging to the trailing edge', () => {
    const rounds = run!.rounds.filter((x) => x.model === 'rebuilt');
    expect(rounds.map((x) => x.round)).toEqual(RECORDED.rebuilt.map((x) => x.round));
    rounds.forEach((x, k) => {
      const o = x.outcome;
      if (!o.refused) throw new Error(`round ${x.round} served`);
      expect(o.refusals.map((r) => [r.component, r.reason])).toEqual(
        RECORDED.rebuilt[k]!.refusals.map((r) => [...r]),
      );
      expect(o.refusals[0]!.message).toMatch(/^faces that diverge to a blunt trailing edge/);
    });
  });

  it('the sensitivities and reading alternatives beside the verdict, as recorded', () => {
    const rounds = run!.rounds.filter((x) => x.model === 'present');
    rounds.forEach((x, k) => {
      const r = RECORDED.present[k]!;
      const s = x.sensitivities;
      // Each moved by 0014 10.7 (ah)'s widening over its own total: the run's total, or, with DREV's
      // leading edge or the trailing-edge term halved, that total (CD0 over one plus its residual);
      // the body base term is the same in each.
      const w = widenedBy(r.components[4]!);
      const on = (o: RecordedOutcome) => widenedOutcome(o, w, r.cd);
      const onOwn = (o: RecordedOutcome) =>
        widenedOutcome(o, w, 'refused' in o ? r.cd : r.cd0 / (1 + o.residual));
      expect(matches(s.cdPrimeText.outcome, on(r.text))).toBe(true);
      expect(matches(s.drevLeadingEdge, onOwn(r.drevEdge))).toBe(true);
      expect(matches(s.taperedTrailingEdge, onOwn(r.tapered))).toBe(true);
      expect(s.without3263 === undefined).toBe(r.without3263 === undefined);
      if (s.without3263 !== undefined)
        expect(matches(s.without3263, on(r.without3263!))).toBe(true);
      expect(s.sevenRoundSpread === undefined).toBe(r.seven === undefined);
      if (s.sevenRoundSpread !== undefined)
        expect(matches(s.sevenRoundSpread, on(r.seven!))).toBe(true);
    });
  });
});
