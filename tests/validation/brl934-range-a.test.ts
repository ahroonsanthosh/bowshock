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
 * The harness is validated on the DREV gate (tests/validation/hold-out-run.test.ts),
 * not on BRL. The run writes its output when BRL934_RUN_OUT names a folder.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
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

/** What the run recorded, per model and round. */
interface RecordedRun {
  readonly present: readonly {
    readonly round: number;
    readonly cd: number;
    readonly low: number;
    readonly high: number;
    readonly residual: number;
    readonly tolerance: readonly [number, number];
    readonly inside: boolean;
  }[];
  readonly rebuilt: readonly { readonly round: number; readonly reasons: readonly string[] }[];
}

/**
 * The run as it came out. Null until the run is made (the pre-run commit holds no expectation);
 * filled from its output after it, as basic-finner.test.ts records its second run.
 */
const RECORDED = null as RecordedRun | null;

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

  // Placeholder until the run: its values are recorded here after it, as they came out.
  it.skipIf(RECORDED === null)('as recorded', () => {
    expect(RECORDED).not.toBeNull();
  });
});
