/**
 * The parameters the fin terms near Mach 1 turn on (docs/design/0019-fins-near-mach-1.md),
 * over the population (./population.ts) at the impact run's conditions: the normal Mach
 * numbers of rounded and bevelled leading edges, the bevel angles, the double wedges'
 * transonic similarity parameters, the blunt trailing edges' thickness ratios and layer
 * parameter, the fins' chord Reynolds numbers, and the share of cases whose fin terms the
 * plan of 0019 would serve, for each variant it weighs. Writes ./out/w7-plan.out.
 *
 * Only the fin terms are tested here (friction, edges, section, trailing edge); the nose,
 * the body base and the fins-on-base factor are other packages (0014 W1, W2, W5 to W8).
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';
import { finWaveDrag } from '../../../src/fins/fin-wave-drag';
import { trapezoidalPlanform } from '../../../src/fins/planform';
import { FinRefusal } from '../../../src/fins/refusal';
import { doubleWedge, hexagonal, type SymmetricSection } from '../../../src/fins/section';
import { MACH_BANDS, atmosphere, drawAltitude, mulberry32, population, type Rocket } from './population';

const here = dirname(fileURLToPath(import.meta.url));
const N = Number(process.env.N_ROCKETS ?? 2000);
const DEG = Math.PI / 180;
const GAMMA = 1.4;

function quantiles(v: number[]): string {
  if (v.length === 0) return '-';
  const s = [...v].sort((a, b) => a - b);
  const at = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))]!;
  return [0.05, 0.25, 0.5, 0.75, 0.95].map((p) => at(p).toPrecision(3)).join(' / ');
}
const pct = (k: number, n: number) => (n === 0 ? '-' : `${((100 * k) / n).toFixed(1)}%`);

interface Case {
  readonly r: Rocket;
  readonly mach: number;
  readonly rePerMetre: number;
}

const roundedLe = (r: Rocket) => r.section === 'rounded-le-square-te' || r.section === 'rounded-both';
const bevelledLe = (r: Rocket) => r.section === 'bevel-both' || r.section === 'bevel-le-square-te';
const bluntTe = (r: Rocket) =>
  r.section === 'rounded-le-square-te' || r.section === 'square-both' || r.section === 'bevel-le-square-te';

/** Normal Mach number of the leading edge. */
const normalMach = (c: Case) => c.mach * Math.cos(c.r.leadingEdgeSweepDeg * DEG);

/** Aspect ratio of the fin and its image (0009's wing on a plane wall): (2s)^2 / (2 S). */
function aspectRatio(r: Rocket): number {
  const area = 0.5 * (r.rootChord + r.tipChord) * r.span;
  return (2 * r.span * r.span) / area;
}

/** The layer parameter c / [h Re_c^(1/5)] at the root and the tip (largest of the two). */
function layerParameter(c: Case): number {
  const { r } = c;
  const x = (chord: number) => {
    const h = r.section === 'bevel-le-square-te' ? (r.thickness * chord) / r.rootChord : r.thickness;
    return chord / (h * (c.rePerMetre * chord) ** 0.2);
  };
  return Math.max(x(r.rootChord), x(r.tipChord));
}

/**
 * The plan's domains for each fin term at Mach 1.0 to 1.2 (0019 section 6), as booleans.
 * `variant` selects the rounded-edge treatment below M_n 1.0 and the swept trailing edge.
 */
interface Variant {
  readonly name: string;
  /** Serve a rounded leading edge below M_n 1.0 ("bounded, not measured" by a recorded decision). */
  readonly roundedBelowSonic: boolean;
  /** Serve swept blunt trailing edges by the sweep analogy measured on R&M 3348's table 3. */
  readonly sweptTe: boolean;
  /** Largest bevel half-angle served, degrees (Bryson's thin wedges reach 10 deg). */
  readonly bevelMax: number;
  /** Largest normal Mach number of a bevel served on measured data (Bryson's subsonic set ends near 0.9). */
  readonly bevelMnMax: number;
}

const VARIANTS: readonly Variant[] = [
  { name: 'A: on data', roundedBelowSonic: false, sweptTe: false, bevelMax: 10, bevelMnMax: 0.9 },
  { name: 'B: A with swept trailing edges (R&M 3348)', roundedBelowSonic: false, sweptTe: true, bevelMax: 10, bevelMnMax: 0.9 },
  { name: 'C: B with rounded edges below M_n 1.0 bounded', roundedBelowSonic: true, sweptTe: true, bevelMax: 10, bevelMnMax: 0.9 },
  { name: 'D: C with bevels to 15 deg and M_n to 1.2 (theory-bridged)', roundedBelowSonic: true, sweptTe: true, bevelMax: 15, bevelMnMax: 1.2 },
];

function finReasons(c: Case, v: Variant): string[] {
  const { r } = c;
  const out: string[] = [];
  const mn = normalMach(c);
  if (r.section === 'square-both') out.push('square leading edge (W11)');
  if (r.section === 'rounded-both') out.push('rounded trailing edge (W11)');
  if (roundedLe(r)) {
    if (r.leadingEdgeSweepDeg > 60 + 1e-9) out.push('rounded edge swept beyond 60 deg');
    else if (mn < 1.0 && !v.roundedBelowSonic) out.push('rounded edge below M_n 1.0');
    const reN = c.rePerMetre * r.thickness * Math.cos(r.leadingEdgeSweepDeg * DEG);
    if (!(reN >= 6.7e3 && reN <= 1e6)) out.push('rounded edge Re_D outside 6.7e3 to 1e6');
  }
  if (bevelledLe(r)) {
    if (r.bevelDeg > v.bevelMax + 1e-9) out.push('bevel beyond the measured half-angle');
    if (r.leadingEdgeSweepDeg > 60 + 1e-9) out.push('bevel swept beyond 60 deg');
    if (mn > v.bevelMnMax) out.push('bevel at a normal Mach number not measured');
  }
  if (r.section === 'bevel-both') out.push('rear bevel near Mach 1 (no source)');
  if (r.section === 'double-wedge') {
    const tau = r.thickness / r.rootChord;
    const a = aspectRatio(r) * tau ** (1 / 3);
    if (a > 1) out.push('double wedge, A tau^(1/3) above 1');
  }
  if (bluntTe(r)) {
    if (r.trailingEdgeSweepDeg > 1e-9 && !v.sweptTe) out.push('swept blunt trailing edge');
    if (r.trailingEdgeSweepDeg > 60 + 1e-9) out.push('trailing edge swept beyond 60 deg');
  }
  return out;
}

test('fin terms near Mach 1 over the population', () => {
  const rockets = population(N);
  const rand = mulberry32(7);
  const bands: Case[][] = MACH_BANDS.map(() => []);
  for (const r of rockets) {
    MACH_BANDS.forEach(([lo, hi], band) => {
      // The impact run's draws, in its order: Mach, then the altitude pair.
      const mach = lo + (hi - lo) * (0.0005 + 0.999 * rand());
      const altitude = drawAltitude(rand(), rand());
      const air = atmosphere(altitude);
      bands[band]!.push({ r, mach, rePerMetre: (air.rho * air.a * mach) / air.mu });
    });
  }
  const lines = ['# Fin terms near Mach 1 (generated by w7-fins.test.ts; do not edit)', ''];
  const [low, next] = [bands[0]!, bands[1]!];

  lines.push('## Sections at Mach 1.0 to 1.2', '', '| Section | Share of cases |', '| --- | --- |');
  const kinds = [...new Set(low.map((c) => c.r.section))].sort();
  for (const k of kinds) lines.push(`| ${k} | ${pct(low.filter((c) => c.r.section === k).length, low.length)} |`);

  const row = (label: string, cs: Case[], f: (c: Case) => number, tests: [string, (x: number) => boolean][]) => {
    const v = cs.map(f);
    return `| ${label} | ${cs.length} | ${quantiles(v)} | ${tests.map(([n, t]) => `${n} ${pct(v.filter(t).length, v.length)}`).join('; ')} |`;
  };
  const header = ['| Quantity | Cases | 5% / 25% / 50% / 75% / 95% | Shares |', '| --- | --- | --- | --- |'];

  lines.push('', '## Rounded leading edges (plates, both kinds)', '', ...header);
  for (const [name, cs] of [['M 1.0 to 1.2', low], ['M 1.2 to 1.5', next]] as const) {
    lines.push(
      row(`M_n, ${name}`, cs.filter((c) => roundedLe(c.r)), normalMach, [
        ['below 0.8', (x) => x < 0.8],
        ['below 1.0', (x) => x < 1.0],
        ['1.0 or more', (x) => x >= 1.0],
      ]),
    );
  }
  lines.push(
    row('LE sweep, deg', low.filter((c) => roundedLe(c.r)), (c) => c.r.leadingEdgeSweepDeg, [
      ['above 60', (x) => x > 60],
      ['at most 45', (x) => x <= 45],
    ]),
  );

  lines.push('', '## Bevelled leading edges (bevel-both, bevel-le-square-te)', '', ...header);
  lines.push(
    row('M_n, M 1.0 to 1.2', low.filter((c) => bevelledLe(c.r)), normalMach, [
      ['at most 0.9', (x) => x <= 0.9],
      ['0.9 to 1.2', (x) => x > 0.9 && x <= 1.2],
    ]),
  );
  lines.push(
    row('bevel half-angle, deg', low.filter((c) => bevelledLe(c.r)), (c) => c.r.bevelDeg, [
      ['at most 10', (x) => x <= 10],
    ]),
  );
  lines.push(
    row('bevel length over root chord', low.filter((c) => bevelledLe(c.r)), (c) => c.r.thickness / 2 / Math.tan(c.r.bevelDeg * DEG) / c.r.rootChord, []),
  );

  lines.push('', '## Double wedges: transonic similarity parameters', '', ...header);
  const dw = low.filter((c) => c.r.section === 'double-wedge');
  lines.push(row('t/c', dw, (c) => c.r.thickness / c.r.rootChord, []));
  lines.push(row('A (fin and image)', dw, (c) => aspectRatio(c.r), []));
  lines.push(
    row('A tau^(1/3)', dw, (c) => aspectRatio(c.r) * (c.r.thickness / c.r.rootChord) ** (1 / 3), [
      ['at most 1', (x) => x <= 1],
    ]),
  );
  lines.push(
    row('xi = (M^2 - 1) / [(gamma + 1) tau]^(2/3)', dw, (c) => (c.mach * c.mach - 1) / ((GAMMA + 1) * (c.r.thickness / c.r.rootChord)) ** (2 / 3), [
      ['below 1', (x) => x < 1],
      ['below 3', (x) => x < 3],
    ]),
  );
  lines.push(row('LE sweep, deg', dw, (c) => c.r.leadingEdgeSweepDeg, []));

  lines.push('', '## Blunt trailing edges (rounded-le-square-te, square-both, bevel-le-square-te)', '', ...header);
  const te = low.filter((c) => bluntTe(c.r));
  lines.push(row('h/c at the root', te, (c) => (c.r.section === 'bevel-le-square-te' ? c.r.thickness / c.r.rootChord : c.r.thickness / c.r.rootChord), [['above 0.02', (x) => x > 0.02]]));
  lines.push(row('h/c at the tip (plates)', te.filter((c) => c.r.section !== 'bevel-le-square-te'), (c) => c.r.thickness / c.r.tipChord, []));
  lines.push(row('c/[h Re_c^(1/5)], largest of root and tip', te, layerParameter, [['at most 4.5', (x) => x <= 4.5]]));
  lines.push(row('TE sweep, deg', te, (c) => c.r.trailingEdgeSweepDeg, [['swept', (x) => x > 1e-9], ['above 60', (x) => x > 60]]));
  lines.push(row('at the base (root TE ahead of the base, chords)', te, (c) => c.r.trailingEdgeAheadChords, [['at the base', (x) => x === 0]]));

  lines.push('', '## Fin chord Reynolds numbers (friction)', '', ...header);
  lines.push(row('Re on the mean chord, M 1.0 to 1.2', low, (c) => c.rePerMetre * 0.5 * (c.r.rootChord + c.r.tipChord), [['below 1e6', (x) => x < 1e6], ['above 1e7', (x) => x > 1e7]]));

  lines.push('', '## Fin terms served at Mach 1.0 to 1.2, by variant (fin terms only)', '');
  lines.push('| Variant | Served | Refused for these reasons (share of all cases, a case may have several) |', '| --- | --- | --- |');
  for (const v of VARIANTS) {
    const reasons = low.map((c) => finReasons(c, v));
    const served = reasons.filter((x) => x.length === 0).length;
    const counts = new Map<string, number>();
    for (const rs of reasons) for (const k of rs) counts.set(k, (counts.get(k) ?? 0) + 1);
    const list = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${pct(n, low.length)}`).join('; ');
    lines.push(`| ${v.name} | ${pct(served, low.length)} | ${list} |`);
  }
  // The present code (src/fins) near Mach 1: which sharp sections it serves below Mach 1.2,
  // where the fins' own-drag band (ARCAS, Mach 1.5 to 2.96) is carried without data.
  lines.push('', '## The present code near Mach 1 (src/fins, sharp sections)', '');
  lines.push(
    'The hobby planform of 0016 (root 120 mm, tip 48 mm, span 80 mm, leading edge swept 42 deg), double wedges:',
    '',
    '| t/c | M | Outcome |',
    '| --- | --- | --- |',
  );
  const hobby = trapezoidalPlanform({ rootChord: 120, span: 80, leadingEdgeSweep: Math.atan(72 / 80) });
  for (const tc of [0.015, 0.024, 0.04]) {
    for (const m of [1.01, 1.05, 1.08, 1.1, 1.15, 1.2]) {
      let outcome: string;
      try {
        const w = finWaveDrag(hobby, doubleWedge(tc, 0.5), m);
        outcome = `served: section C_d ${w.sectionCd.toExponential(3)}, 3D ratio ${w.ratio.toFixed(4)}`;
      } catch (e) {
        if (!(e instanceof FinRefusal)) throw e;
        outcome = `refused (${e.reason})`;
      }
      lines.push(`| ${tc} | ${m} | ${outcome} |`);
    }
  }
  const sharp = low.filter((c) => c.r.section === 'double-wedge' || c.r.section === 'bevel-both');
  let served = 0;
  for (const c of sharp) {
    const tc = c.r.thickness / c.r.rootChord;
    const bevel = c.r.thickness / 2 / Math.tan(c.r.bevelDeg * DEG) / c.r.rootChord;
    const section: SymmetricSection = c.r.section === 'double-wedge' ? doubleWedge(tc, 0.5) : hexagonal(tc, bevel, bevel);
    const pf = trapezoidalPlanform({
      rootChord: c.r.rootChord,
      span: c.r.span,
      leadingEdgeSweep: c.r.leadingEdgeSweepDeg * DEG,
      trailingEdgeSweep: c.r.trailingEdgeSweepDeg * DEG,
    });
    try {
      finWaveDrag(pf, section, c.mach);
      served++;
    } catch (e) {
      if (!(e instanceof FinRefusal)) throw e;
    }
  }
  lines.push(
    '',
    `Population at Mach 1.0 to 1.2: of ${sharp.length} double-wedge and hexagonal fins, the present code serves the wave drag of ${served} (${pct(served, low.length)} of all cases), each with the ARCAS band.`,
  );
  lines.push('', `Rockets: ${N}; one condition per band, the impact run's draws.`);
  const outDir = join(here, 'out');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'w7-plan.out'), lines.join('\n') + '\n');
});
