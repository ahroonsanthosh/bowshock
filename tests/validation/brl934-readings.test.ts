/**
 * BRL Report 934 (src/validation/brl934.ts): the values the range A run uses,
 * held to their readings, and the rounds admitted by 0014 section 10.6 item
 * 5's rule. No drag model is run here.
 *
 * - Table III (M, mean squared yaw, C_D, -C_Ma) and Table II (M, average
 *   yaw): the first reading (`basic_finner_brl934.csv`) against round 9's
 *   blind reading (`audit/round9/readings/`), all 27 rounds: no difference.
 * - Graph I's symbols: the first reading (the csv's graph1 column and
 *   flags) against round 7's (`audit/round7/readings/brl934_graph1_pairing.csv`).
 * - Graph II: both readings as transcribed, and the zero-yaw values of the
 *   transcription's section 6.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BRL934_ADMITTED,
  BRL934_AIR,
  BRL934_DIAMETER_INCHES,
  BRL934_GRAPH2,
  BRL934_PRESENT_FROM,
  BRL934_RANGE_A,
  BRL934_RANGE_A_ROUNDS,
  admission,
  brl934ConditionSet,
  brl934Conditions,
  graph2Reading,
  textYawDragCoefficient,
  zeroYawCd,
} from '../../src/validation/brl934';

/** A CSV with quoted fields ("" an escaped quote), comment lines (#) dropped. */
function csv(path: string): Record<string, string>[] {
  const text = readFileSync(path, 'utf8');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let atLineStart = true;
  let comment = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (atLineStart && !quoted) {
      comment = ch === '#';
      atLineStart = false;
    }
    if (comment) {
      if (ch === '\n') atLineStart = true;
      continue;
    }
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
      field = '';
      atLineStart = true;
    } else if (ch !== '\r') field += ch;
  }
  if (field !== '' || row.length > 0) rows.push([...row, field]);
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head!.map((h, k) => [h, r[k] ?? ''])));
}

const DATA = 'docs/research/total-drag/data/';
const first = csv(`${DATA}basic_finner_brl934.csv`);
const r9t3 = csv('docs/research/total-drag/audit/round9/readings/brl934_table3.csv');
const r9t2 = csv('docs/research/total-drag/audit/round9/readings/brl934_table2.csv');
const pairing = csv('docs/research/total-drag/audit/round7/readings/brl934_graph1_pairing.csv');
const graph2 = csv(`${DATA}basic_finner_brl934_graph2.csv`);

/** A printed number, the parenthesised percentage dropped; undefined when blank. */
const num = (s: string | undefined): number | undefined => {
  const t = (s ?? '').replace(/\(.*\)/, '').trim();
  return t === '' ? undefined : Number(t);
};
/** Round 9 types abbreviated round numbers as printed (2588, 89, ...): the full number from the series. */
const fullRound = (printed: string, previous: number): number => {
  const n = Number(printed);
  if (n >= 1000) return n;
  const series = Math.floor(previous / 100) * 100;
  return series + n;
};

describe('the readings', () => {
  it('Table III and Table II: round 9 reads every one of the 27 rounds as the first reading (M, mean squared yaw, C_D, -C_Ma; M, average yaw)', () => {
    expect(first.length).toBe(27);
    expect(r9t3.length).toBe(27);
    expect(r9t2.length).toBe(27);
    let prev3 = 0;
    let prev2 = 0;
    const differences: string[] = [];
    first.forEach((f, k) => {
      const a = r9t3[k]!;
      const b = r9t2[k]!;
      prev3 = fullRound(a['Round No.']!, prev3);
      prev2 = fullRound(b['Round No.']!, prev2);
      const round = Number(f.round);
      if (prev3 !== round) differences.push(`row ${k}: Table III round ${prev3} vs ${round}`);
      if (prev2 !== round) differences.push(`row ${k}: Table II round ${prev2} vs ${round}`);
      // By column, as printed: Table III Round No., Mach No., mean squared yaw (deg^2), C_D,
      // C_Na, -C_Ma, ...; Table II Round No., M, Ave Yaw, ...
      const a3 = Object.values(a);
      const b2 = Object.values(b);
      const pairs: [string, number | undefined, number | undefined][] = [
        ['Table III M', num(a3[1]), num(f.M_T3)],
        ['Table III dbar2', num(a3[2]), num(f.dbar2_deg2)],
        ['Table III C_D', num(a3[3]), num(f.CD)],
        ['Table III -C_Ma', num(a3[5]), num(f.CMa_T3)],
        ['Table II M', num(b2[1]), num(f.M_T2)],
        ['Table II average yaw', num(b2[2]), num(f.ave_yaw_deg)],
      ];
      for (const [what, x, y] of pairs) {
        if (x !== y) differences.push(`${round} ${what}: round 9 ${x}, first ${y}`);
      }
    });
    expect(differences).toEqual([]);
  });

  it("the range A rounds as src/validation/brl934.ts holds them: the first reading's values", () => {
    const inA = first.filter(
      (f) => Number(f.M_T3) >= BRL934_RANGE_A[0] && Number(f.M_T3) <= BRL934_RANGE_A[1],
    );
    expect(inA.length).toBe(16);
    expect(BRL934_RANGE_A_ROUNDS.length).toBe(16);
    for (const r of BRL934_RANGE_A_ROUNDS) {
      const f = inA.find((x) => Number(x.round) === r.round)!;
      expect(f).toBeDefined();
      expect([r.mach, r.meanSquaredYaw, r.cd, r.averageYaw]).toEqual([
        num(f.M_T3),
        num(f.dbar2_deg2),
        num(f.CD),
        num(f.ave_yaw_deg),
      ]);
      expect(r.phase).toBe(Number(f.phase));
      // The first reading's laminar mark is its 'lam' flag and its graph1 'circle'.
      expect(r.laminarFirst).toBe(f.flags!.split(';').includes('lam'));
      expect(r.laminarFirst).toBe(f.graph1!.includes('circle'));
    }
    // Mach order.
    const m = BRL934_RANGE_A_ROUNDS.map((r) => r.mach);
    expect([...m].sort((a, b) => a - b)).toEqual(m);
  });

  it("Graph I, round 7 against the first reading: 3249's open circle by both; 3263's lower symbol a dot as recorded (the blind call an open circle, low); 3264's call left out, nothing near 0.449", () => {
    const pair = (id: string) => pairing.find((p) => p.pair === id)!;
    expect([pair('P5').round_TableIII, pair('P5').first_symbol, pair('P5').second_symbol]).toEqual([
      '3249',
      'open circle',
      'open circle',
    ]);
    expect(pair('P5').verdict).toBe('agree');
    expect(pair('P8').round_TableIII).toBe('3263');
    expect(pair('P8').second_symbol).toBe('open circle');
    expect(pair('P8').second_call_confidence).toBe('low');
    expect(pair('P8').resolution).toMatch(/^third look: resolved to dot\./);
    expect(pair('P8').resolution).toMatch(/replaces J2 for any use/);
    expect(pair('P9').round_TableIII).toBe('3264');
    expect(pair('P9').resolution).toMatch(/^third look: unresolved, call left out/);
    expect(pair('P9').resolution).toMatch(/nothing is plotted near Table III's 0\.449/);
    // No other open circle at M 1.5 and above in either reading.
    const circles = pairing.filter(
      (p) => p.second_symbol === 'open circle' && Number(p.second_M) >= 1.5,
    );
    expect(circles.map((p) => p.pair)).toEqual(['P5', 'P8']);
    expect(
      first
        .filter((f) => Number(f.M_T3) >= 1.5 && f.graph1!.includes('circle'))
        .map((f) => f.round),
    ).toEqual(['3249']);
    const laminar = BRL934_RANGE_A_ROUNDS.filter((r) => r.laminarFirst || r.laminarSecond);
    expect(laminar.map((r) => [r.round, r.laminarFirst, r.laminarSecond])).toEqual([
      [3249, true, true],
    ]);
  });

  it('Graph II: both readings as transcribed', () => {
    for (const k of [0, 1] as const) {
      const rows = graph2
        .filter((g) => Number(g.reading) === k + 1)
        .map((g) => [Number(g.M), Number(g.CDprime_per_rad2)]);
      expect(BRL934_GRAPH2[k]!.map((p) => [...p])).toEqual(rows);
    }
    // The text's figures, 15.0 at M 1.4 and 8.9 at 2.4, on the line.
    expect(textYawDragCoefficient(1.4)).toBeCloseTo(15.0, 12);
    expect(textYawDragCoefficient(2.4)).toBeCloseTo(8.9, 12);
  });
});

describe('the rounds admitted by 0014 section 10.6 item 5', () => {
  it('ten rounds: 3254, 2595, 2599, 2591, 2588, 2590, 2596, 2589, 3263, 3264', () => {
    expect(BRL934_ADMITTED.map((r) => r.round)).toEqual([
      3254, 2595, 2599, 2591, 2588, 2590, 2596, 2589, 3263, 3264,
    ]);
  });

  it('six out, each for its registered reason', () => {
    const out = BRL934_RANGE_A_ROUNDS.filter((r) => !admission(r).admitted).map((r) => [
      r.round,
      admission(r).reason,
    ]);
    expect(out.map(([r]) => r)).toEqual([2593, 2594, 2598, 3256, 3255, 3249]);
    const reason = (n: number) => out.find(([r]) => r === n)![1] as string;
    expect(reason(2593)).toMatch(/^mean squared yaw 53\.4 deg\^2, above 5/);
    expect(reason(2594)).toMatch(/^mean squared yaw 36\.2 deg\^2, above 5/);
    expect(reason(2598)).toMatch(/^mean squared yaw 5\.6 deg\^2, above 5/);
    expect(reason(3256)).toMatch(/^mean squared yaw 6\.6 deg\^2, above 5/);
    expect(reason(3255)).toMatch(/^no mean squared yaw printed/);
    expect(reason(3249)).toMatch(/marked laminar .* by both readings$/);
  });

  it("the present model's rounds, M 1.798 to 2.47: seven (2591, 2588, 2590, 2596, 2589, 3263, 3264)", () => {
    expect(
      BRL934_ADMITTED.filter((r) => r.mach >= BRL934_PRESENT_FROM).map((r) => r.round),
    ).toEqual([2591, 2588, 2590, 2596, 2589, 3263, 3264]);
  });

  it("the zero-yaw values, CD0 from Graph II's curve, as the transcription's section 6 gives them", () => {
    const cd0 = BRL934_ADMITTED.map((r) => Math.round(1e4 * zeroYawCd(r)) / 1e4);
    expect(cd0).toEqual([
      0.6936, 0.6218, 0.6565, 0.6033, 0.6145, 0.6436, 0.6236, 0.6115, 0.4698, 0.4484,
    ]);
    // Each reading alone within 1e-4 of the mean on every admitted round.
    for (const r of BRL934_ADMITTED) {
      for (const k of [0, 1] as const) {
        const one = zeroYawCd(r, (m) => graph2Reading(k, m));
        expect(Math.abs(one - zeroYawCd(r))).toBeLessThan(1e-4);
      }
      // The text's rounded C_D' moves CD0 by at most 0.0004 on these rounds (transcription section 7).
      expect(Math.abs(zeroYawCd(r, textYawDragCoefficient) - zeroYawCd(r))).toBeLessThan(4.5e-4);
    }
  });
});

describe('the conditions (0014 section 10.6 items 1 and 2)', () => {
  it("the Reynolds number on the diameter: scripts/brl934.py's estimates at 288.15 and 298.15 K reproduced", () => {
    // Round 2588, M 1.802: 7.963e5 (0.78 in, 298.15 K) to 8.744e5 (0.82 in, 288.15 K).
    expect(brl934Conditions(1.802, 0.78, 298.15).reynoldsPerLength).toBeCloseTo(7.963e5, -2);
    expect(brl934Conditions(1.802, 0.82, 288.15).reynoldsPerLength).toBeCloseTo(8.744e5, -2);
    // Round 3264, M 2.468: 1.091e6 to 1.198e6.
    expect(brl934Conditions(2.468, 0.78, 298.15).reynoldsPerLength).toBeCloseTo(1.091e6, -3);
    expect(brl934Conditions(2.468, 0.82, 288.15).reynoldsPerLength).toBeCloseTo(1.198e6, -3);
  });

  it('the nominal at the midpoints (0.80 in, 293 K, 1 atm), the four corners of 0.78 to 0.82 in and 288 to 298 K', () => {
    const s = brl934ConditionSet(2.0);
    expect(s.nominal).toEqual(
      brl934Conditions(2.0, BRL934_DIAMETER_INCHES.nominal, BRL934_AIR.temperatureNominal),
    );
    expect(s.corners.map((c) => c.name)).toEqual([
      'd 0.78 in, 288 K',
      'd 0.78 in, 298 K',
      'd 0.82 in, 288 K',
      'd 0.82 in, 298 K',
    ]);
    const re = s.corners.map((c) => c.conditions.reynoldsPerLength);
    expect(Math.min(...re)).toBeLessThan(s.nominal.reynoldsPerLength);
    expect(Math.max(...re)).toBeGreaterThan(s.nominal.reynoldsPerLength);
    // About +-5% in Reynolds number (transcription section 9 item 3).
    expect(Math.max(...re) / s.nominal.reynoldsPerLength - 1).toBeLessThan(0.07);
    expect(1 - Math.min(...re) / s.nominal.reynoldsPerLength).toBeLessThan(0.07);
  });
});
