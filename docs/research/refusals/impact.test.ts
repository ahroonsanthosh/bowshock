/**
 * The refusal audit's impact measurement (docs/design/0014-refusals.md):
 * a population of supersonic amateur and student rockets (./population.ts),
 * each at one condition drawn in every Mach band, run through the page's
 * and the libraries' refusals (./evaluate.ts). Writes ./out/impact.out
 * (the tables) and ./out/impact.json (per-band summaries). Re-run: see
 * ./README.md.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';
import {
  BASELINE,
  MACH_BANDS,
  drawAltitude,
  mulberry32,
  population,
  type Rocket,
  type Weights,
} from './population';
import {
  REASONS,
  libraryRefused,
  noseReasons,
  totalReasons,
  type Condition,
  type ReasonKey,
} from './evaluate';

const here = dirname(fileURLToPath(import.meta.url));
// OUT_DIR, relative to the repository root, writes a run elsewhere (the dated runs under out/).
const outDir = process.env.OUT_DIR === undefined ? join(here, 'out') : process.env.OUT_DIR;

const N_ROCKETS = Number(process.env.N_ROCKETS ?? 2000);
const CROSS_CHECK = Number(process.env.CROSS_CHECK ?? 300);

/**
 * Work packages: the refusals one piece of work lifts together (0014
 * section 6). Reasons that co-occur on one fin (a rounded flat-plate edge is
 * refused as a flat plate, as tapered and as swept) belong to one package,
 * since lifting one alone unlocks nothing.
 */
export const WORK_ITEMS: Record<string, readonly ReasonKey[]> = {
  // Since W1, W1b and W2 (0015): what the rebuilt fins-on-base factor still refuses at M 1.0 to 3.0 (the present
  // factor's refusals no longer arise there; below M 1.5 they belong to W2).
  'W1 fins at the base the rebuilt factor still refuses (sweeps not measured, steep bevels, rounded trailing edges; fins ahead of the base where TN 2360 does not measure them)': [
    'finsW1Sweep',
    'finsW1Thickness',
    'finsW1TrailingEdge',
    'finsW1Count',
    'finsNearBase',
  ],
  'W2 the base below Mach 1.5 (served since 0015 section 11): what remains, the body base outside 1.0 to 3.0 and fins at the base below 1.0': ['baseMach', 'finsAtBaseLowMach'],
  'W3 blunt trailing edges of thin fins (thick layer, tapered, swept, M 1.0 to 1.5)': ['teThick', 'teTaper', 'teSwept', 'teMach', 'teBelow15'],
  'W4 rounded leading edges on flat plates, tapered and swept, M 1.0 to 3.0': [
    'flatPlateLe',
    'roundedLeTaper',
    'roundedLeSwept',
    'roundedLeMach',
    'roundedLeReynolds',
  ],
  'W5 Haack and power-series noses (the Von Karman nose outside its checked outline, the rest)': ['noseHaack'],
  'W6 blunted nose tips': ['noseTip'],
  'W7 Mach 1.0 to 1.2 nose solve (0013, in progress); the fin terms near Mach 1 (0019: the fins\' own-drag band below Mach 1.5)': [
    'noseMach',
    'finsOwnDragMach',
  ],
  'W8 steep, detached and subsonic sharp tips': ['noseDetached', 'noseSubsonicTip', 'noseSteep', 'noseEllipsoid'],
  'W9 sharp sections: reflected waves and detached bevel shocks': ['sectionReflected', 'sectionDetached'],
  'W10 boat-tails': ['boatTail'],
  'W11 square-cut leading edges and rounded trailing edges': ['squareLe', 'roundedTe'],
  'W12 page: the wedge-flat section with a blunt trailing edge': ['pageSection'],
};

interface Evaluation {
  readonly rocket: Rocket;
  readonly band: number;
  readonly condition: Condition;
  readonly nose: readonly ReasonKey[];
  readonly total: readonly ReasonKey[];
}

type Outcome = 'total' | 'nose only' | 'nothing';

function outcome(e: Evaluation, lifted: ReadonlySet<ReasonKey> = new Set()): Outcome {
  if (e.nose.some((k) => !lifted.has(k))) return 'nothing';
  if (e.total.some((k) => !lifted.has(k))) return 'nose only';
  return 'total';
}

function evaluateAll(rockets: readonly Rocket[], seed: number, altitude?: number): Evaluation[] {
  const rand = mulberry32(seed);
  const out: Evaluation[] = [];
  for (const rocket of rockets) {
    MACH_BANDS.forEach(([lo, hi], band) => {
      const mach = lo + (hi - lo) * (0.0005 + 0.999 * rand());
      // Drawn even where fixed, so every altitude case sees the same Mach numbers.
      const drawn = drawAltitude(rand(), rand());
      const altitudeKm = altitude ?? drawn;
      const condition = { mach, altitudeKm };
      out.push({
        rocket,
        band,
        condition,
        nose: noseReasons(rocket, mach),
        total: totalReasons(rocket, condition),
      });
    });
  }
  return out;
}

const pct = (n: number, d: number) => (d === 0 ? '-' : `${((100 * n) / d).toFixed(1)}%`);
const bandName = (b: number) => `M ${MACH_BANDS[b]![0].toFixed(1)}-${MACH_BANDS[b]![1].toFixed(1)}`;

function outcomeTable(evals: readonly Evaluation[], lines: string[], title: string): Record<string, Record<Outcome, number>> {
  lines.push(`## ${title}`, '', '| Band | Total | Nose wave drag only | Nothing |', '| --- | --- | --- | --- |');
  const json: Record<string, Record<Outcome, number>> = {};
  for (let b = -1; b < MACH_BANDS.length; b++) {
    const sel = evals.filter((e) => b < 0 || e.band === b);
    const count = { total: 0, 'nose only': 0, nothing: 0 } as Record<Outcome, number>;
    for (const e of sel) count[outcome(e)]++;
    const name = b < 0 ? 'all bands' : bandName(b);
    json[name] = count;
    lines.push(`| ${name} | ${pct(count.total, sel.length)} | ${pct(count['nose only'], sel.length)} | ${pct(count.nothing, sel.length)} |`);
  }
  lines.push('');
  return json;
}

function reasonTable(evals: readonly Evaluation[], lines: string[]): void {
  lines.push(
    '## Refusal rate per reason (share of the population at that band whose case triggers it; a case may trigger several)',
    '',
    `| Reason | ${MACH_BANDS.map((_, b) => bandName(b)).join(' | ')} | All | Sole blocker of a total |`,
    `| --- | ${MACH_BANDS.map(() => '---').join(' | ')} | --- | --- |`,
  );
  const keys = Object.keys(REASONS) as ReasonKey[];
  const rows = keys.map((k) => {
    const per = MACH_BANDS.map((_, b) => {
      const sel = evals.filter((e) => e.band === b);
      return sel.filter((e) => e.nose.includes(k) || e.total.includes(k)).length / sel.length;
    });
    const all = evals.filter((e) => e.nose.includes(k) || e.total.includes(k)).length / evals.length;
    const sole = evals.filter((e) => outcome(e, new Set([k])) === 'total' && outcome(e) !== 'total').length / evals.length;
    return { k, per, all, sole };
  });
  rows.sort((a, b) => b.all - a.all);
  for (const r of rows) {
    lines.push(
      `| ${REASONS[r.k]} | ${r.per.map((x) => `${(100 * x).toFixed(1)}%`).join(' | ')} | ${(100 * r.all).toFixed(1)}% | ${(100 * r.sole).toFixed(2)}% |`,
    );
  }
  lines.push('');
}

/**
 * Greedy order of the work items: at each step the item that, lifted with
 * those before it, turns the most cases into totals; ties (and steps where
 * no item alone unlocks any) broken by how many still-blocked cases the
 * item's reasons appear in.
 */
function greedy(evals: readonly Evaluation[], lines: string[], title: string): string[] {
  lines.push(`## ${title}`, '', `| Step | Work item lifted | Cases it appears in (still blocked) | Totals after, all bands | ${MACH_BANDS.map((_, b) => bandName(b)).join(' | ')} |`, `| --- | --- | --- | --- | ${MACH_BANDS.map(() => '---').join(' | ')} |`);
  const lifted = new Set<ReasonKey>();
  const remaining = new Map(Object.entries(WORK_ITEMS));
  const order: string[] = [];
  const totals = () => evals.filter((e) => outcome(e, lifted) === 'total').length;
  let step = 0;
  while (remaining.size > 0) {
    let best: { name: string; gain: number; appears: number } | undefined;
    const base = totals();
    const blocked = evals.filter((e) => outcome(e, lifted) !== 'total');
    for (const [name, keys] of remaining) {
      const trial = new Set([...lifted, ...keys]);
      const gain = evals.filter((e) => outcome(e, trial) === 'total').length - base;
      const appears = blocked.filter((e) => keys.some((k) => e.nose.includes(k) || e.total.includes(k))).length;
      if (best === undefined || gain > best.gain || (gain === best.gain && appears > best.appears)) best = { name, gain, appears };
    }
    if (best === undefined || best.appears === 0) break;
    for (const k of remaining.get(best.name)!) lifted.add(k);
    remaining.delete(best.name);
    order.push(best.name);
    step++;
    const perBand = MACH_BANDS.map((_, b) => {
      const sel = evals.filter((e) => e.band === b);
      return pct(sel.filter((e) => outcome(e, lifted) === 'total').length, sel.length);
    });
    lines.push(`| ${step} | ${best.name} | ${pct(best.appears, evals.length)} | ${pct(totals(), evals.length)} | ${perBand.join(' | ')} |`);
  }
  lines.push('');
  return order;
}

/** 0014's ranked order (section 6), packages in a row lifted together. */
const PLAN_ORDER: readonly (readonly string[])[] = [
  ['W1'],
  ['W3', 'W4'],
  ['W5'],
  ['W2'],
  ['W6'],
  ['W9'],
  ['W11'],
  ['W7'],
  ['W10'],
  ['W8'],
  ['W12'],
];

/** Totals per band after each step of the plan's order, cumulatively. */
function planTable(evals: readonly Evaluation[], lines: string[], title: string): void {
  lines.push(
    `## ${title}`,
    '',
    `| After | Totals, all bands | ${MACH_BANDS.map((_, b) => bandName(b)).join(' | ')} |`,
    `| --- | --- | ${MACH_BANDS.map(() => '---').join(' | ')} |`,
  );
  const lifted = new Set<ReasonKey>();
  for (const step of PLAN_ORDER) {
    for (const id of step) {
      const name = Object.keys(WORK_ITEMS).find((n) => n.startsWith(`${id} `))!;
      for (const k of WORK_ITEMS[name]!) lifted.add(k);
    }
    const per = MACH_BANDS.map((_, b) => {
      const sel = evals.filter((e) => e.band === b);
      return pct(sel.filter((e) => outcome(e, lifted) === 'total').length, sel.length);
    });
    lines.push(`| ${step.join(' + ')} | ${pct(evals.filter((e) => outcome(e, lifted) === 'total').length, evals.length)} | ${per.join(' | ')} |`);
  }
  lines.push('');
}

/** Per package: the cases it appears in (necessary for them), and what lifting it alone gives. */
function packageTable(evals: readonly Evaluation[], lines: string[], title: string): void {
  lines.push(
    `## ${title}`,
    '',
    `| Package | Appears in: ${MACH_BANDS.map((_, b) => bandName(b)).join(' | ')} | All | Totals if lifted alone |`,
    `| --- | ${MACH_BANDS.map(() => '---').join(' | ')} | --- | --- |`,
  );
  for (const [name, keys] of Object.entries(WORK_ITEMS)) {
    const has = (e: Evaluation) => keys.some((k) => e.nose.includes(k) || e.total.includes(k));
    const per = MACH_BANDS.map((_, b) => {
      const sel = evals.filter((e) => e.band === b);
      return pct(sel.filter(has).length, sel.length);
    });
    const alone = evals.filter((e) => outcome(e, new Set(keys)) === 'total').length;
    lines.push(`| ${name} | ${per.join(' | ')} | ${pct(evals.filter(has).length, evals.length)} | ${pct(alone, evals.length)} |`);
  }
  lines.push('');
}

function populationSummary(rockets: readonly Rocket[], lines: string[]): void {
  const count = <T,>(f: (r: Rocket) => T) => {
    const m = new Map<T, number>();
    for (const r of rockets) m.set(f(r), (m.get(f(r)) ?? 0) + 1);
    return [...m.entries()].map(([k, v]) => `${String(k)} ${pct(v, rockets.length)}`).join(', ');
  };
  const q = (f: (r: Rocket) => number) => {
    const v = rockets.map(f).sort((a, b) => a - b);
    const at = (p: number) => v[Math.min(v.length - 1, Math.floor(p * v.length))]!;
    return `${at(0.05).toFixed(3)} / ${at(0.5).toFixed(3)} / ${at(0.95).toFixed(3)}`;
  };
  lines.push(
    '## The population drawn',
    '',
    `- rockets: ${rockets.length}, each at one condition per Mach band`,
    `- diameter: ${count((r) => `${(r.diameter * 1000).toFixed(0)} mm`)}`,
    `- nose: ${count((r) => r.nose)}`,
    `- rounded tip: ${count((r) => r.tipRadiusRatio > 0)}`,
    `- fin count: ${count((r) => r.finCount)}`,
    `- planform: ${count((r) => r.planform)}`,
    `- section: ${count((r) => r.section)}`,
    `- fins at the base: ${count((r) => (r.trailingEdgeAheadChords === 0 ? 'at base' : r.trailingEdgeAheadChords < 1 ? 'within a chord' : 'a chord or more ahead'))}`,
    `- boat-tail: ${count((r) => r.boatTail)}`,
    `- t/c (5% / median / 95%): ${q((r) => r.thickness / r.rootChord)}`,
    `- leading-edge sweep, deg (5% / median / 95%): ${q((r) => r.leadingEdgeSweepDeg)}`,
    `- overall L/D (5% / median / 95%): ${q((r) => r.overallFineness)}`,
    '',
  );
}

const VARIANTS: Record<string, Weights> = {
  'more four-fin, sharp-edged, high-power fins (four fins 70%; bevelled or double-wedge sections 60%; boat-tails 5%)': {
    ...BASELINE,
    fourFins: 0.7,
    boatTail: 0.05,
    section: {
      'rounded-le-square-te': 0.15,
      'rounded-both': 0.1,
      'square-both': 0.05,
      'bevel-both': 0.35,
      'bevel-le-square-te': 0.1,
      'double-wedge': 0.25,
    },
  },
  'fewer Haack noses, sharper tips (Von Karman 25%, tangent ogive 45%, conical 20%; rounded tips 20%)': {
    ...BASELINE,
    roundedTip: 0.2,
    nose: { 'von-karman': 0.25, 'lv-haack': 0.02, 'tangent-ogive': 0.45, conical: 0.2, ellipsoid: 0.03, parabolic: 0.03, 'power-half': 0.02 },
  },
};

test('refusal impact on a population of supersonic amateur rockets', () => {
  mkdirSync(outDir, { recursive: true });
  const lines: string[] = ['# Refusal impact (generated by impact.test.ts; do not edit)', ''];
  const rockets = population(N_ROCKETS);
  populationSummary(rockets, lines);
  const evals = evaluateAll(rockets, 7);
  const json: Record<string, unknown> = {};
  json.baseline = outcomeTable(evals, lines, 'Outcome today, baseline population (altitude 0 to 20 km as drawn)');
  reasonTable(evals, lines);
  packageTable(evals, lines, 'Work packages: the share of cases each is needed for (its refusals appear in them)');
  json.order = greedy(evals, lines, 'Work packages in greedy order (each lifted with those above it)');
  planTable(evals, lines, "Totals after each step of 0014's ranked order (cumulative)");

  // The same with the rounded tip counted as the page treats it today (a
  // sharp nose entered, the bluntness "not represented", a number served).
  const lenient = evals.map((e) => ({ ...e, nose: e.nose.filter((k) => k !== 'noseTip') }));
  json.lenientTip = outcomeTable(lenient, lines, 'Outcome today if a blunted tip is entered as sharp (what the page would serve, with an unmeasured error)');

  // Every Reynolds-dependent refusal at the two ends of the altitude range.
  for (const altitude of [0, 20]) {
    const at = evaluateAll(rockets, 7, altitude);
    json[`altitude${altitude}`] = outcomeTable(at, lines, `Outcome today, every condition at ${altitude} km`);
    const k: ReasonKey[] = ['teThick', 'teBelow15', 'roundedLeReynolds'];
    lines.push(
      ...k.map((key) => `- ${REASONS[key]}: ${pct(at.filter((e) => e.total.includes(key)).length, at.length)} of cases at ${altitude} km`),
      '',
    );
  }

  for (const [name, weights] of Object.entries(VARIANTS)) {
    const v = evaluateAll(population(N_ROCKETS, 20261020, weights), 7);
    json[name] = outcomeTable(v, lines, `Sensitivity: ${name}`);
    packageTable(v, lines, `Sensitivity: ${name}, the share of cases each package is needed for`);
    json[`${name} order`] = greedy(v, lines, `Sensitivity: ${name}, greedy order`);
    planTable(v, lines, `Sensitivity: ${name}, totals after each step of 0014's ranked order`);
  }

  // The decomposition against the library's own verdict, where the library
  // can represent the rocket (page-only reasons left out).
  let checked = 0;
  let agree = 0;
  const disagreements: string[] = [];
  for (const e of evals.slice(0, CROSS_CHECK * 4)) {
    const lib = libraryRefused(e.rocket, e.condition);
    if (lib === undefined) continue;
    checked++;
    const mine = e.total.some((k) => k !== 'pageSection');
    if (lib === mine) agree++;
    else disagreements.push(`rocket ${e.rocket.id} at M ${e.condition.mach.toFixed(3)}: library ${lib}, decomposition ${mine} (${e.total.join(', ')})`);
  }
  lines.push(
    '## Cross-check of the decomposition against src/total',
    '',
    `- cases the library can represent, checked: ${checked}; refused-or-not agreeing: ${agree}`,
    ...disagreements.slice(0, 20).map((d) => `- ${d}`),
    '',
  );
  json.crossCheck = { checked, agree };
  // OUT_NAME keeps a later run beside the one 0014 quotes (impact.out): 0016's is impact-w34.
  const name = process.env.OUT_NAME ?? 'impact';
  writeFileSync(join(outDir, `${name}.out`), lines.join('\n'));
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify(json, null, 1));
});
