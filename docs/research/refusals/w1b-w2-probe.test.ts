/**
 * Expected coverage of the two proposals that follow W1 (docs/research/refusals/README.md):
 * (1) fins at the base with a leading edge swept 0 to 45 deg, and (2) W2, the body base below
 * Mach 1.5 with W1's part there. Nothing is implemented: each proposal is applied to the same
 * cases as impact.test.ts (the baseline population, seed 7) by editing the case's refusals as
 * the proposal would, the rest of the rebuilt factor's rules asked of the library itself.
 * Writes ./out/w1b-w2-probe.out. Run:
 *
 *   ONLY=./w1b-w2-probe.test.ts nice -n 15 npx vitest run --config docs/research/refusals/vitest.config.ts
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';
import { MACH_BANDS, drawAltitude, mulberry32, population, type Rocket } from './population';
import { finsOnBaseReason, noseReasons, totalReasons, type ReasonKey } from './evaluate';

const here = dirname(fileURLToPath(import.meta.url));
const N_ROCKETS = Number(process.env.N_ROCKETS ?? 2000);

interface Case {
  readonly rocket: Rocket;
  readonly band: number;
  readonly mach: number;
  readonly nose: readonly ReasonKey[];
  readonly total: readonly ReasonKey[];
}

const BASE_KEYS: readonly ReasonKey[] = [
  'baseMach',
  'boatTail',
  'finsNearBase',
  'finsAtBaseCount',
  'finsAtBaseThickness',
  'finsAtBaseMach',
  'finsAtBaseLowMach',
  'finsW1Count',
  'finsW1Thickness',
  'finsW1TrailingEdge',
  'finsW1Sweep',
];
/** W3, W4 and W5's reasons (impact.test.ts WORK_ITEMS), for the totals once those are done. */
const W3_W5: readonly ReasonKey[] = [
  'teThick',
  'teTaper',
  'teSwept',
  'teMach',
  'teBelow15',
  'flatPlateLe',
  'roundedLeTaper',
  'roundedLeSwept',
  'roundedLeMach',
  'roundedLeReynolds',
  'noseHaack',
];

type SweepClass = 'unswept' | 'TE 0, LE 0-45' | 'TE 0, LE 45-60' | 'TE swept, LE 0-45' | 'TE swept, LE 45-60' | 'LE above 60';
function sweepClass(r: Rocket): SweepClass {
  const le = r.leadingEdgeSweepDeg;
  const te = r.trailingEdgeSweepDeg;
  if (le > 60 + 1e-9) return 'LE above 60';
  if (te <= 1e-9) return le <= 1e-9 ? 'unswept' : le < 45 - 1e-9 ? 'TE 0, LE 0-45' : 'TE 0, LE 45-60';
  return le < 45 - 1e-9 ? 'TE swept, LE 0-45' : 'TE swept, LE 45-60';
}

interface Proposal {
  readonly name: string;
  /** The case's total refusals as the proposal would leave them. */
  readonly apply: (c: Case) => readonly ReasonKey[];
}

/** The rebuilt factor's verdict on the fins as if their sweep were a measured one (LE 50 deg, TE kept). */
function asIfMeasuredSweep(r: Rocket, mach: number): ReasonKey | undefined {
  return finsOnBaseReason(
    { ...r, leadingEdgeSweepDeg: 50, trailingEdgeSweepDeg: Math.min(r.trailingEdgeSweepDeg, 50) },
    mach,
  );
}

function replace(keys: readonly ReasonKey[], from: ReasonKey, to: ReasonKey | undefined): ReasonKey[] {
  return keys.flatMap((k) => (k === from ? (to === undefined ? [] : [to]) : [k]));
}

/** (1): moderately swept fins at the base, served by the swept bracket where the proposal covers them. */
function sweepProposal(name: string, classes: readonly SweepClass[], machLow: number): Proposal {
  return {
    name,
    apply: (c) =>
      c.total.includes('finsW1Sweep') && classes.includes(sweepClass(c.rocket)) && c.mach >= machLow
        ? replace(c.total, 'finsW1Sweep', asIfMeasuredSweep(c.rocket, c.mach))
        : c.total,
  };
}

/**
 * (2): the body base below Mach 1.5 (the curve continued, M 1.0 to 1.5), and with `fins` also fins
 * at the base from fig. 35's free-flight line (M 1.1 to 1.5) under the rebuilt factor's rules,
 * asked of the library at M 1.5 (the same members' rules; positions ahead of the base refused).
 * `sweptBelow`: which swept fins (leading edge 45 to 60 deg) are served below M 1.5: 'flat' only
 * flat-faced fins (RM L52E06's swept flat plates, M 0.7 to 1.11), 'all' every section (as at M 1.5).
 */
function w2Proposal(name: string, fins: boolean, sweptBelow: 'flat' | 'all' = 'flat', then?: Proposal): Proposal {
  return {
    name,
    apply: (c) => {
      let keys: readonly ReasonKey[] = then ? then.apply(c) : c.total;
      if (c.mach >= 1.5) return keys;
      keys = replace(keys, 'baseMach', undefined);
      if (fins && c.mach >= 1.1 && keys.includes('finsAtBaseLowMach')) {
        const r = c.rocket;
        let k = finsOnBaseReason(r, 1.5);
        const swept = r.leadingEdgeSweepDeg > 1e-9 || r.trailingEdgeSweepDeg > 1e-9;
        const flat = r.section === 'rounded-le-square-te' || r.section === 'square-both';
        if (k === undefined && swept && sweptBelow === 'flat' && !flat) k = 'finsW1Sweep';
        keys = replace(keys, 'finsAtBaseLowMach', k);
      }
      return keys;
    },
  };
}

const NONE: Proposal = { name: 'today (W1 committed)', apply: (c) => c.total };
const P1A = sweepProposal('(1a) TE unswept, LE 0 to 45, M 2.0 to 3.0', ['TE 0, LE 0-45'], 2.0);
const P1B = sweepProposal('(1b) TE unswept, LE 0 to 45, M 1.5 to 3.0', ['TE 0, LE 0-45'], 1.5);
const P1C = sweepProposal('(1c) any TE up to the LE, LE 0 to 45, M 1.5 to 3.0', ['TE 0, LE 0-45', 'TE swept, LE 0-45'], 1.5);
const P2A = w2Proposal('(2a) body base M 1.0 to 1.5 (no fins factor below 1.5)', false);
const P2B = w2Proposal('(2b) (2a) + fins at the base M 1.1 to 1.5: unswept, and swept flat plates', true, 'flat');
const P2C = w2Proposal('(2c) (2b) + swept 45 to 60 deg of every section M 1.1 to 1.5', true, 'all');
const P2B1A = w2Proposal('(2b) + (1a)', true, 'flat', P1A);
const PROPOSALS: readonly Proposal[] = [NONE, P1A, P1B, P1C, P2A, P2B, P2C, P2B1A];

const pct = (n: number, d: number) => (d === 0 ? '-' : `${((100 * n) / d).toFixed(1)}%`);
const bandName = (b: number) => `M ${MACH_BANDS[b]![0].toFixed(1)}-${MACH_BANDS[b]![1].toFixed(1)}`;

test('coverage of the sweep and W2 proposals', () => {
  const rockets = population(N_ROCKETS);
  const rand = mulberry32(7);
  const cases: Case[] = [];
  for (const rocket of rockets) {
    MACH_BANDS.forEach(([lo, hi], band) => {
      const mach = lo + (hi - lo) * (0.0005 + 0.999 * rand());
      const altitudeKm = drawAltitude(rand(), rand());
      cases.push({ rocket, band, mach, nose: noseReasons(rocket, mach), total: totalReasons(rocket, { mach, altitudeKm }) });
    });
  }
  const lines: string[] = ['# Sweep and W2 proposals: expected coverage (generated by w1b-w2-probe.test.ts; do not edit)', ''];
  lines.push(`Baseline population, ${N_ROCKETS} rockets, the same cases as impact.test.ts.`, '');

  // Where the fins at the base sit by sweep, among the cases the rebuilt factor refuses for sweep.
  lines.push('## Cases refused for sweep (rebuilt factor), by sweep class', '');
  lines.push(`| Class | ${MACH_BANDS.map((_, b) => bandName(b)).join(' | ')} |`, `| --- | ${MACH_BANDS.map(() => '---').join(' | ')} |`);
  const classes: SweepClass[] = ['TE 0, LE 0-45', 'TE swept, LE 0-45', 'LE above 60', 'TE 0, LE 45-60', 'TE swept, LE 45-60', 'unswept'];
  for (const k of classes) {
    const row = MACH_BANDS.map((_, b) => {
      const sel = cases.filter((c) => c.band === b);
      return pct(sel.filter((c) => c.total.includes('finsW1Sweep') && sweepClass(c.rocket) === k).length, sel.length);
    });
    lines.push(`| ${k} | ${row.join(' | ')} |`);
  }
  lines.push('');

  const baseServed = (keys: readonly ReasonKey[]) => !keys.some((k) => BASE_KEYS.includes(k));
  const totalServed = (c: Case, keys: readonly ReasonKey[], lifted: readonly ReasonKey[]) =>
    !c.nose.some((k) => !lifted.includes(k)) && !keys.some((k) => !lifted.includes(k));
  for (const [title, select] of [
    ['Base term served (share of the band)', (_c: Case, keys: readonly ReasonKey[]) => baseServed(keys)],
    ['Totals served (share of the band)', (c: Case, keys: readonly ReasonKey[]) => totalServed(c, keys, [])],
    ['Totals served once W3, W4 and W5 are done (share of the band)', (c: Case, keys: readonly ReasonKey[]) => totalServed(c, keys, W3_W5)],
  ] as const) {
    lines.push(`## ${title}`, '', `| Proposal | All bands | ${MACH_BANDS.map((_, b) => bandName(b)).join(' | ')} |`, `| --- | --- | ${MACH_BANDS.map(() => '---').join(' | ')} |`);
    for (const p of PROPOSALS) {
      const per = MACH_BANDS.map((_, b) => {
        const sel = cases.filter((c) => c.band === b);
        return pct(sel.filter((c) => select(c, p.apply(c))).length, sel.length);
      });
      lines.push(`| ${p.name} | ${pct(cases.filter((c) => select(c, p.apply(c))).length, cases.length)} | ${per.join(' | ')} |`);
    }
    lines.push('');
  }

  // What still refuses the base term below Mach 1.5 under (2b).
  lines.push('## Base-term refusals left below Mach 1.5 under (2b) (share of the band)', '');
  lines.push(`| Reason | ${bandName(0)} | ${bandName(1)} |`, '| --- | --- | --- |');
  for (const k of BASE_KEYS) {
    const row = [0, 1].map((b) => {
      const sel = cases.filter((c) => c.band === b);
      return pct(sel.filter((c) => P2B.apply(c).includes(k)).length, sel.length);
    });
    if (row.some((x) => x !== '0.0%')) lines.push(`| ${k} | ${row.join(' | ')} |`);
  }
  lines.push('');

  mkdirSync(join(here, 'out'), { recursive: true });
  writeFileSync(join(here, 'out', 'w1b-w2-probe.out'), lines.join('\n'));
});
