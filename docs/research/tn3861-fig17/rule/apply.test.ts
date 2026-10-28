/**
 * 0016 section 21.2's rule, as the second (ab) addendum of 0014 section
 * 10.7 writes it out (21a0686), applied to the paired fresh readings of TN
 * 3861 fig. 17 (d0094f2, pairing 3d7dd16) with figs. 15 and 16 as read
 * twice for 0016 section 16 (figs15-16.json, from export_figs15_16.py).
 * Every quantity is taken on every combination of the readings and each
 * pair's envelope in the direction against the claim. Since the re-review
 * of ef7fc7d..5159cac (2026-10-28) a fig. 17 point's readings are all that
 * either reader states for it, as ambiguous points keep every reading: the
 * two primaries, every numeric alternative, and the readings each gives
 * under a named convention (the cross-stroke intersection, the bounding
 * square or box). Run from the repository root:
 *
 *   python3 -I docs/research/tn3861-fig17/rule/export_figs15_16.py
 *   ONLY=../tn3861-fig17/rule/apply.test.ts nice -n 10 npx vitest run --config docs/research/square-edge/vitest.config.ts
 *
 * It writes out/verdict.txt beside this file.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { it } from 'vitest';
import {
  pitotPressureCoefficient,
  roundedLeadingEdgeDrag,
  tn2960Integrated,
  transonicFrontSide,
} from '../../../../src/fins/rounded-leading-edge';
import { TN2960_FIG5C, TN2960_FIG5C_SECOND } from '../../../../src/fins/tn2960';

const here = dirname(fileURLToPath(import.meta.url));
const DEG = Math.PI / 180;
const PAIRS = join(here, '..', 'readers', 'pairing-2026-10-27', 'tn3861_fig17_pairs.csv');

interface Fig17Reading {
  readonly who: string;
  readonly mc: number;
  readonly cd: number;
}
interface Fig1516Reading {
  readonly figure: '15' | '16';
  readonly set: string;
  readonly reading: string;
  readonly mc: number;
  readonly value: number;
}

function csvRows(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  const split = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') quoted = false;
        else cur += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') {
        out.push(cur);
        cur = '';
      } else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const head = split(lines[0]!);
  return lines.slice(1).map((l) => {
    const v = split(l);
    return Object.fromEntries(head.map((h, i) => [h, v[i] ?? '']));
  });
}

/** Modified Newtonian on the diameter, (2/3) Cp_pitot. */
const mn = (m: number) => (2 / 3) * pitotPressureCoefficient(m);
/** kappa: the term over modified Newtonian (0016 section 11), 1 from M_n 1.49. */
const kappa = (m: number) => (m < 1.49 ? transonicFrontSide(m).nominal : 1);

/**
 * The lower bound's end over modified Newtonian at a normal Mach number: the
 * term's band low end (sweep allowance included) times kappa, the highest
 * over the Reynolds numbers the term serves (every regime), the points'
 * Reynolds numbers taken as not stated. The term at 45 deg at the same
 * normal Mach and Reynolds numbers has the same band (the allowance is flat
 * from 14.3 deg).
 */
function lowerEndOverMn(mN: number): { value: number; at: string } {
  let best = { value: -Infinity, at: '' };
  const c45 = Math.cos(45 * DEG);
  for (let k = 0; k <= 400; k++) {
    const reN = 6.7e3 * (1e6 / 6.7e3) ** (k / 400);
    let t;
    try {
      t = roundedLeadingEdgeDrag({
        mach: mN / c45,
        radius: 0.001,
        faceAngle: 0,
        tanLeadingEdgeSweep: 1,
        reynoldsOnDiameter: reN / c45,
      });
    } catch {
      continue;
    }
    const v = kappa(mN) * t.band.low;
    if (v > best.value) best = { value: v, at: `Re_n ${reN.toPrecision(3)}, ${t.regime}` };
  }
  return best;
}

it("21.2's rule on the paired fig. 17", () => {
  const pairs = csvRows(readFileSync(PAIRS, 'utf8'));
  /** Every reading either reader states for a point: primaries, alternatives, named conventions. */
  const fig17 = (id: string): Fig17Reading[] => {
    const p = pairs.find((r) => r['pair'] === id)!;
    const out: Fig17Reading[] = [
      { who: 'A', mc: Number(p['x_A']), cd: Number(p['value_A']) },
      { who: 'B', mc: Number(p['x_B']), cd: Number(p['value_B']) },
    ];
    for (const who of ['A', 'B'] as const) {
      for (const m of (p[`alternatives_${who}`] ?? '').matchAll(/x=([\d.]+) value=([\d.]+)/g)) {
        out.push({ who: `${who} alternative`, mc: Number(m[1]), cd: Number(m[2]) });
      }
    }
    for (const [col, name] of [
      ['cross_intersections', 'cross'],
      ['bounding_box', 'box'],
    ] as const) {
      for (const m of (p[col] ?? '').matchAll(/([AB]) \(([\d.]+), ([\d.]+)\)/g)) {
        out.push({ who: `${m[1]} ${name}`, mc: Number(m[2]), cd: Number(m[3]) });
      }
    }
    return out;
  };
  /** The two primaries only, as first applied (b463654). */
  const primaries = (id: string) => fig17(id).slice(0, 2);
  const f1516 = JSON.parse(readFileSync(join(here, 'figs15-16.json'), 'utf8')) as Fig1516Reading[];
  const near = (figure: '15' | '16', set: string, mc: number) =>
    f1516.filter((r) => r.figure === figure && r.set === set && Math.abs(r.mc - mc) < 0.1);

  const lines: string[] = [];
  const say = (s = '') => lines.push(s);
  say("0016 SECTION 21.2'S RULE, AS THE SECOND (ab) ADDENDUM WRITES IT, ON THE PAIRED TN 3861 FIG. 17");
  say('docs/research/tn3861-fig17/rule/apply.test.ts; fig. 17: d0094f2, pairing 3d7dd16; figs. 15 and 16: 0016 section 16');
  say('');

  // ---- e, the estimate's error, on TN 2960's three cylinders (P04, P08, P12) ----
  const integrated = [TN2960_FIG5C, TN2960_FIG5C_SECOND].map((r) => tn2960Integrated(r));
  let e = 0;
  let eAt = '';
  let ePrimary = 0;
  say("THE ESTIMATE'S ERROR e: F/MN against TN 2960's integrated front side over MN (both readings of TN 2960 fig. 5)");
  for (const id of ['P04', 'P08', 'P12']) {
    for (const r17 of primaries(id)) {
      for (const r16 of near('16', 'TN 2960', r17.mc)) {
        const mcm = (r17.mc + r16.mc) / 2;
        const f = r17.cd + r16.value;
        for (const integ of integrated) {
          const ref = integ.reduce((a, b) => (Math.abs(b.mach - mcm) < Math.abs(a.mach - mcm) ? b : a));
          ePrimary = Math.max(ePrimary, Math.abs(f / mn(mcm) - ref.frontOverModifiedNewtonian));
        }
      }
    }
    for (const r17 of fig17(id)) {
      for (const r16 of near('16', 'TN 2960', r17.mc)) {
        const mcm = (r17.mc + r16.mc) / 2;
        const f = r17.cd + r16.value;
        for (const [k, integ] of integrated.entries()) {
          const ref = integ.reduce((a, b) => (Math.abs(b.mach - mcm) < Math.abs(a.mach - mcm) ? b : a));
          const d = Math.abs(f / mn(mcm) - ref.frontOverModifiedNewtonian);
          if (d > e) {
            e = d;
            eAt = `${id} (fig. 17 ${r17.who}, fig. 16 ${r16.reading}, TN 2960 fig. 5 reading ${k + 1}, M ${ref.mach})`;
          }
        }
      }
    }
    const r = fig17(id);
    say(`  ${id}: ${r.map((x) => `${x.who} (${x.mc}, ${x.cd})`).join('; ')}`);
  }
  say(`  e = ${e.toFixed(4)}, the largest over every reading, at ${eAt}`);
  say(`  (on the two primaries only, as first applied in b463654: ${ePrimary.toFixed(4)})`);
  say('  (as first estimated in 0016 section 16 on the fig. 17 reading that does not count: 0.086)');
  say('');

  // ---- the three named points ----
  const L_U = 'Lord and Ulmann';
  const points = [
    { name: "Lord and Ulmann's 70 deg point", id: 'P03', set: L_U, mach: 4.04, alpha: undefined as number | undefined },
    { name: "Lord and Ulmann's 75 deg point", id: 'P02', set: L_U, mach: 4.04, alpha: 15 },
    { name: "Penland's 75.1 deg point (pressure series)", id: 'P06', set: 'Penland', mach: 6.86, alpha: 14.9 },
  ];
  say("WHICH LORD AND ULMANN POINT IS THE 70 DEG ONE: each crossed Lord and Ulmann point's sweep, 90 deg less asin(M_c / 4.04)");
  for (const id of ['P01', 'P02', 'P03', 'P09']) {
    const s = fig17(id).map((r) => 90 - Math.asin(r.mc / 4.04) / DEG);
    say(`  ${id}: ${s.map((x) => x.toFixed(2)).join(' / ')} deg`);
  }
  say('  Only P03 lies at 70 deg (to the degree, as the record names it); P01 is at 80 deg, P02 the stated 75 deg');
  say('  (alpha 15 deg, TN 3861 p. 11), P09 at 60 deg (the point within the served sweep, 0016 section 16).');
  say('');

  let holds = true;
  for (const p of points) {
    say(`${p.name}: ${p.id}`);
    // (a) the stagnation pressure, fig. 15, over Rayleigh's at its M_c: both readings.
    const r17 = fig17(p.id);
    const st = near('15', p.set, r17[0]!.mc);
    const stag = st.map((r) => ({ r, ratio: r.value / pitotPressureCoefficient(r.mc) }));
    const stagMin = Math.min(...stag.map((x) => x.ratio));
    for (const x of stag) say(`  fig. 15 ${x.r.reading}: M_c ${x.r.mc.toFixed(3)}, over Rayleigh's ${x.ratio.toFixed(4)}`);
    // F on every combination; the term at the point's sweep and Mach number.
    let fTermMin = Infinity;
    let bMin = Infinity;
    let lowEnd = { value: -Infinity, at: '' };
    for (const a of r17) {
      for (const d of near('16', p.set, a.mc)) {
        const mcm = (a.mc + d.mc) / 2;
        const f = a.cd + d.value;
        const mN = p.alpha === undefined ? a.mc : p.mach * Math.sin(p.alpha * DEG);
        const sweep = p.alpha === undefined ? 90 - Math.asin(a.mc / p.mach) / DEG : 90 - p.alpha;
        const fTerm = f / (kappa(mN) * mn(mN));
        const end = lowerEndOverMn(mN);
        if (end.value > lowEnd.value) lowEnd = end;
        const b = f / mn(mcm) - e - end.value;
        fTermMin = Math.min(fTermMin, fTerm);
        bMin = Math.min(bMin, b);
        say(
          `  fig. 17 ${a.who} (M_c ${a.mc}, C_D ${a.cd}) + fig. 16 ${d.reading} (M_c ${d.mc.toFixed(3)}, ` +
            `Cp_down ${d.value.toFixed(4)}): F ${f.toFixed(4)}, F/MN ${(f / mn(mcm)).toFixed(4)}; sweep ` +
            `${sweep.toFixed(2)} deg, M_n ${mN.toFixed(3)}, kappa ${kappa(mN).toFixed(3)}; F over the term ` +
            `${fTerm.toFixed(4)}; F/MN - e - lower end ${b >= 0 ? '+' : ''}${b.toFixed(4)} (lower end ${end.value.toFixed(4)}, ${end.at})`,
        );
      }
    }
    const a1 = stagMin > 1;
    const a2 = fTermMin > 1;
    const b = bMin >= 0;
    holds = holds && a1 && a2 && b;
    say(
      `  (a) stagnation over Rayleigh's, least ${stagMin.toFixed(4)}: ${a1 ? 'above' : 'NOT above'}; F over the term, least ` +
        `${fTermMin.toFixed(4)}: ${a2 ? 'above' : 'NOT above'}`,
    );
    say(`  (b) F/MN less e at least the lower bound's end, least margin ${bMin.toFixed(4)}: ${b ? 'holds' : 'FAILS'}`);
    say('');
  }
  say(`VERDICT: the rule ${holds ? 'HOLDS at all three points' : 'FAILS'}`);
  const text = lines.join('\n') + '\n';
  mkdirSync(join(here, 'out'), { recursive: true });
  writeFileSync(join(here, 'out', 'verdict.txt'), text);
  console.log(text);
});
