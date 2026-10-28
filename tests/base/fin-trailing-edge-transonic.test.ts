/**
 * The square trailing edge's base drag at Mach 1.0 to 1.5 (design record
 * 0019 section 3.4.1; src/base/fin-te-transonic.ts and its use in
 * src/base/fin-trailing-edge.ts): the readings held to their files, the
 * nominal from the flat-faced sets, every band-setting point of every
 * reading inside the band at its own Mach number, the step at Mach 1.5,
 * the shape widening and its ordering, the refusals and the labels; and
 * planted errors the checks must catch.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildTransonicTrailingEdge,
  layerParameterRange,
  propertiesOf,
  SHAPE_WIDENING_TWO_SIDED,
  setValue,
  shapeAllowanceNpl,
  TRANSONIC_SETS,
  TRANSONIC_TE_EVIDENCE,
  TRANSONIC_TE_NODES,
  type TransonicEvidencePoint,
  type TransonicTrailingEdge,
} from '../../src/base/fin-te-transonic';
import { TRANSONIC_TE_READINGS, type TransonicPoint } from '../../src/base/fin-te-transonic-data';
import {
  FIN_TRAILING_EDGE_BAND,
  FIN_TRAILING_EDGE_LABEL_ANALOGY,
  FIN_TRAILING_EDGE_LABEL_TRANSONIC_ANALOGY,
  FIN_TRAILING_EDGE_LABEL_TRANSONIC_FREE,
  finTrailingEdgeBaseDrag,
  THICK_LAYER_LIMIT,
  thickLayerFactor,
  THIN_LAYER_LIMIT,
  thinLayerBasePressure,
  ABOVE_BAND_LINES,
  type AboveBandLine,
  aboveRatios,
  bandAbove,
  bandHighAbove,
  bandLowAbove,
  RM_A52E01_LINE10_ALTERNATIVE_END,
  RM_A52E01_M17_LINE7,
  RM_A52E01_M17_LINE9,
  RM_A52E01_M17_LINE10,
  TrailingEdgeRefusals,
  trailingEdgeBasis,
  transonicTrailingEdge,
} from '../../src/base/fin-trailing-edge';
import { BaseRefusal } from '../../src/base/refusal';

// ---------------------------------------------------------------------------
// The reading files, parsed here independently of the generator.

/** RFC 4180 rows: quoted fields may hold commas and doubled quotes. */
function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '' || line.startsWith('#')) continue;
    const fields: string[] = [];
    let f = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i]!;
      if (quoted) {
        if (c === '"' && line[i + 1] === '"') {
          f += '"';
          i++;
        } else if (c === '"') quoted = false;
        else f += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') {
        fields.push(f);
        f = '';
      } else f += c;
    }
    fields.push(f);
    out.push(fields);
  }
  return out;
}

const records = (path: string): Record<string, string>[] => {
  const [header, ...rows] = parseCsv(
    readFileSync(new URL(`../../docs/research/total-drag/audit/${path}`, import.meta.url), 'utf8'),
  );
  return rows.map((r) => Object.fromEntries(header!.map((n, i) => [n, r[i] ?? ''])));
};

const cpOf = (ratio: number, mach: number) => ((ratio - 1) * 2) / (1.4 * mach * mach);
const inWindow = (m: number) => m >= 0.97 && m <= 1.75;
type Expected = [string, string, number, number, number, number];
const point = (
  id: string,
  series: string,
  m: number,
  err: number,
  lo: number,
  hi = lo,
): Expected => [id, series, m, err, lo, hi];

/** Each group's points as the reading files give them (the rules of 0019 section 3.4.1 item 2). */
function expectedGroups(): Map<string, Expected[]> {
  const g = new Map<string, Expected[]>();
  // A set whose report states no Mach accuracy carries at least +-0.01, RM A51J11 +-0.02 (the
  // coordinator's decisions of 2026-10-27, 0019 3.4.1 item 6).
  const floor: Record<string, number> = {
    'R&M 3427 fig. 13': 0.01,
    'R&M 3348 table 3': 0.01,
    'R&M 3348 fig. 30a': 0.01,
    'RM A51J25 fig. 7 symbols': 0.01,
    'RM A51J11 fig. 14': 0.02,
    'RM A51J11 fig. 15': 0.02,
    'RM A52E01 fig. 8(a)': 0.01,
    'RM A52E01 fig. 8(b)': 0.01,
  };
  const add = (set: string, reading: string, p: Expected) => {
    if (!inWindow(p[2])) return;
    const k = `${set}|${reading}`;
    const q: Expected = [p[0], p[1], p[2], Math.max(p[3], floor[set] ?? 0), p[4], p[5]];
    g.set(k, [...(g.get(k) ?? []), q]);
  };
  for (const r of records('w7-fins/tn3548_fig6_first.csv')) {
    add('TN 3548 fig. 6', 'first (W7)', point(r.id!, `${r.slit} slit`, +r.mach!, 0.01, +r.cp_b!));
  }
  for (const r of records('round11/readings/tn3548_fig6.csv').filter((r) => r.item === 'symbol')) {
    const slit = r.series!.includes('inboard') ? 'inboard slit' : 'outboard slit';
    add('TN 3548 fig. 6', 'second (round 11)', point(r.id!, slit, +r.M!, 0.01, +r.Cp_b!));
  }
  for (const r of records('w7-fins/rm3427_fig13_first.csv')) {
    const p = point(`h${r.hole}-${r.mach}`, `hole ${r.hole}`, +r.mach!, +r.mach_err!, +r.cp_b!);
    add('R&M 3427 fig. 13', 'first (W7)', p);
  }
  for (const r of records('round10/readings/rm3427_fig13_base.csv')) {
    if (r.item !== 'symbol') continue;
    const p = point(r.id!, `hole ${r.series!.split(' ')[1]}`, +r.M_inf!, +r.M_inf_err!, +r.Cp!);
    add('R&M 3427 fig. 13', 'second (round 10)', p);
  }
  for (const r of records('w7-fins/rm3348_table3_first.csv')) {
    if (r.sweep_deg !== '0' || r.alpha_deg !== '0') continue;
    const m = +r.mach!;
    const p = point(`${r.case}-h${r.hole}`, `hole ${r.hole}`, m, 0, cpOf(+r.pb_over_p0!, m));
    add('R&M 3348 table 3', 'first typing (W7)', p);
  }
  for (const r of records('round8/readings/rm3348_table3.csv')) {
    if (r.phi_deg !== '0' || r.alpha_deg !== '0') continue;
    const m = +r.M0!;
    const p = point(`${r.sub_table}-h${r.hole}`, `hole ${r.hole}`, m, 0, cpOf(+r.p_b_over_p0!, m));
    add('R&M 3348 table 3', 'second typing (round 8)', p);
  }
  for (const r of records('w7-fins/rm3348_fig30a_first.csv')) {
    if (!r.series!.startsWith('phi 0 ')) continue;
    const m = +r.mach!;
    add(
      'R&M 3348 fig. 30a',
      'first (W7)',
      point(r.id!, 'phi 0 deg', m, +r.mach_err!, cpOf(+r.pb_over_p0!, m)),
    );
  }
  for (const r of records('round10/readings/rm3348_fig30a.csv')) {
    if (r.item !== 'symbol' || !r.series!.includes('phi = 0 deg')) continue;
    const m = +r.M0!;
    add(
      'R&M 3348 fig. 30a',
      'second (round 10)',
      point(r.id!, 'phi 0 deg', m, +r.M0_err!, cpOf(+r.pb_p0!, m)),
    );
  }
  // Johnston states the test region's Mach number uniform to about +-0.010 (PDF p. 6).
  const johnston = (err: number) => Math.max(err, 0.01);
  for (const r of records('w7-fins/johnston_fig10b_first.csv')) {
    if (r.alpha_deg !== '0') continue;
    add(
      'Johnston fig. 10(b)',
      'first (W7)',
      point(r.id!, 'alpha 0 deg', +r.mach!, johnston(+r.mach_err!), +r.cpb!),
    );
  }
  for (const r of records('round13/readings/johnston_fig10b.csv')) {
    if (r.series !== 'alpha 0 deg') continue;
    if (r.x_val !== '') {
      const p = point(r.id!, 'alpha 0 deg', +r.x_val!, johnston(+r.x_err!), +r.y_val!);
      add('Johnston fig. 10(b)', 'second (round 13)', p);
    } else {
      const [m0, m1] = r.extent_x!.split('..').map(Number) as [number, number];
      const [c0, c1] = r.extent_y!.split('..').map(Number) as [number, number];
      const p = point(r.id!, 'alpha 0 deg', (m0 + m1) / 2, johnston((m1 - m0) / 2), c0, c1);
      add('Johnston fig. 10(b)', 'second (round 13), box', p);
    }
  }
  for (const r of records('w7-fins/rma51j25_fig7_below15_first.csv')) {
    if (r.kind !== 'symbol' || r.id === 'f1') continue;
    const m = +r.mach_prime!;
    const p = point(r.id!, r.note!.split(' (')[0]!, m, 0, cpOf(+r.p_mid!, m));
    add('RM A51J25 fig. 7 symbols', 'first (W7)', p);
  }
  for (const r of records('round11/readings/rma51j25_fig7.csv')) {
    if (r.item !== 'symbol' || r.id!.startsWith('pard')) continue;
    const m = +r.M_prime!;
    const p = point(r.id!, r.series!, m, +r.M_prime_err!, cpOf(+r.pb_over_pprime!, m));
    add('RM A51J25 fig. 7 symbols', 'second (round 11)', p);
  }
  // RM A51J11 figs. 14 and 15, round 15's two readings (0019 3.4.1 item 6): every curve, curve end
  // and box a point; a bound as its range, a 2-sigma row as its value.
  const ht = (series: string) => /h\/t(?: =|,) (0\.3|0\.6|1\.0)/.exec(series)![1]!;
  const range = (r: Record<string, string>): [number, number] => {
    const y = +r.y!;
    const e = +r.y_err!;
    return r.kind === 'box' || r.err_basis === 'bound' ? [y - e, y + e] : [y, y];
  };
  const curveRow = (r: Record<string, string>) => ['curve', 'curve_end', 'box'].includes(r.kind!);
  for (const reader of ['A', 'B']) {
    for (const r of records(`round15-${reader}/readings/a51j11_fig14.csv`).filter(curveRow)) {
      const rough = r.series!.toLowerCase().includes('without') ? 'without' : 'with';
      const [lo, hi] = range(r);
      add(
        'RM A51J11 fig. 14',
        `round 15 reader ${reader}`,
        point(r.id!, `h/t ${ht(r.series!)}, ${rough} roughness`, +r.x!, +r.x_err!, lo, hi),
      );
    }
    for (const r of records(`round15-${reader}/readings/a51j11_fig15.csv`).filter(curveRow)) {
      const mach = Number(r.series!.split('M').at(-1)!.replace('=', '').trim());
      const [lo, hi] = range(r);
      const series = `h/t ${ht(r.series!)}, 2y/b ${(+r.x!).toFixed(3)}`;
      add('RM A51J11 fig. 15', `round 15 reader ${reader}`, point(r.id!, series, mach, 0, lo, hi));
    }
  }
  // RM A52E01 fig. 8 from the three-way pairing under the three-reading rule (0019 3.4.1 item 6),
  // fig. 8(a)'s Mach 1.7 curves from the four-way pairing under the same rule.
  for (const [figure, set] of [
    ['a52e01_fig8a', 'RM A52E01 fig. 8(a)'],
    ['a52e01_fig8b', 'RM A52E01 fig. 8(b)'],
  ] as const) {
    const four = new Map(fourWayOf(figure).map((r) => [r.drawn_curve!, r]));
    for (const r of four.values()) {
      if (!r.alpha0_status!.startsWith('TWO OR MORE')) continue;
      for (const k of ['A', 'B', 'C', 'D']) {
        const v = alpha0Of(r[`alpha0_${k}`]!);
        if (v === undefined) continue;
        add(
          set,
          `four-way pairing, reader ${k}`,
          point(`${r.drawn_curve} (${k})`, wingOfFour(r), 1.7, 0, v[0], v[1]),
        );
      }
    }
    const three = curvesOf(figure).filter((c) => !four.has(c.drawn_curve!));
    for (const r of three.filter((c) => c.alpha0_status!.startsWith('TWO OR MORE'))) {
      for (const k of ['A', 'B', 'C']) {
        const v = alpha0Of(r[`alpha0_${k}`]!);
        if (v === undefined) continue;
        add(
          set,
          `three-way pairing, reader ${k}`,
          point(`${r.drawn_curve} (${k})`, wingOf(r), machOf(r), 0, v[0], v[1]),
        );
      }
    }
  }
  return g;
}

/** The three-way pairing's drawn curves of one figure (identity_map.csv). */
const curvesOf = (figure: string) =>
  records('pairing-2026-10-26-a52e01-three/identity_map.csv').filter((r) => r.figure === figure);

/** The four-way pairing's drawn curves (fig. 8(a), Mach 1.7). */
const fourWayOf = (figure: string) =>
  records('pairing-2026-10-27-a52e01-m17-four/identity_map.csv').filter((r) => r.figure === figure);

/** The rule with four readers: only "confidence high" is not uncertain. */
function wingOfFour(r: Record<string, string>): string {
  const named = ['A', 'B', 'C', 'D']
    .map((k) => r[`${k}_wing_call`]!)
    .filter((c) => c.startsWith('wing '))
    .map((c) => [c.split(',')[0]!, !c.includes('confidence high')] as const);
  const same = new Set(named.map(([w]) => w)).size === 1;
  return named.length >= 2 && same && named.every(([, u]) => !u) ? named[0]![0] : 'any wing';
}

/** '-0.5727 +-0.0060 (bound, flagged)' as its range (a bound) or value; undefined for none. */
function alpha0Of(text: string): [number, number] | undefined {
  const t = text.trim();
  if (t === '' || t.startsWith('no ')) return undefined;
  const [value, rest] = t.split('+-') as [string, string];
  const v = Number(value);
  const e = Number(rest.trim().split(' ')[0]);
  return rest.includes('bound') ? [v - e, v + e] : [v, v];
}

/** The three-reading rule: a wing only if two or more name the same one and none is uncertain. */
function wingOf(r: Record<string, string>): string {
  const named = ['A', 'B', 'C']
    .map((k) => [r[`${k}_wing`]!, r[`${k}_wing_uncertain`]!] as const)
    .filter(([w]) => w !== '' && w !== 'none');
  const same = new Set(named.map(([w]) => w)).size === 1;
  return named.length >= 2 && same && named.every(([, u]) => u !== 'yes')
    ? `wing ${named[0]![0]}`
    : 'any wing';
}

/** The panel's Mach number, or the supersonic group every reader giving one agrees on. */
function machOf(r: Record<string, string>): number {
  if (!r.group!.startsWith('M=1')) return Number(r.group!.replace('M=', ''));
  const m = new Set(['A', 'B', 'C'].map((k) => r[`${k}_mach`]!).filter((x) => x !== ''));
  if (m.size !== 1) throw new Error(`readers differ on the Mach number of ${r.drawn_curve}`);
  return Number([...m][0]);
}

describe('the readings, held to their files', () => {
  const expected = expectedGroups();

  it('holds every group of every reading, and nothing else', () => {
    const held = new Set(TRANSONIC_TE_READINGS.map((g) => `${g.set}|${g.reading}`));
    expect([...held].sort()).toEqual([...expected.keys()].sort());
    expect(TRANSONIC_TE_READINGS.reduce((n, g) => n + g.points.length, 0)).toBe(567);
  });

  it('takes RM A52E01 from the neutral pairings only, under the three-reading rule', () => {
    const held = (set: string) =>
      TRANSONIC_TE_READINGS.filter((g) => g.set === set).flatMap((g) => g.points);
    for (const [figure, set, curves] of [
      ['a52e01_fig8a', 'RM A52E01 fig. 8(a)', ['#2', '#3', '#6', '#7', '#9', '#10']],
      ['a52e01_fig8b', 'RM A52E01 fig. 8(b)', ['#1', '#2', '#3', '#4', '#5', '#6']],
    ] as const) {
      const four = new Map(fourWayOf(figure).map((r) => [r.drawn_curve!, r]));
      const supersonic = curvesOf(figure).filter((r) => r.group!.startsWith('M=1'));
      // Reader B flags every supersonic wing call uncertain: every supersonic curve is any wing,
      // with three readers or four.
      for (const r of supersonic) expect(wingOf(r), r.drawn_curve).toBe('any wing');
      for (const r of four.values()) expect(wingOfFour(r), r.drawn_curve).toBe('any wing');
      // Held: the supersonic curves with two or more agreeing alpha 0 values (B, C and, at Mach
      // 1.7 in fig. 8(a), D; reader A gives none there).
      const set2 = new Set(held(set).map((p) => p[0].replace(/ \([ABCD]\)$/, '')));
      expect([...set2].map((x) => x.split(' ').at(-1)).sort()).toEqual([...curves].sort());
      for (const p of held(set)) expect(p[0]).toMatch(/\((B|C|D)\)$/);
      // Not held: values read once, values no pair agrees on, curves nobody reads at alpha 0.
      for (const r of supersonic) {
        const status = (four.get(r.drawn_curve!) ?? r).alpha0_status!;
        if (!status.startsWith('TWO OR MORE')) expect([...set2]).not.toContain(r.drawn_curve);
      }
    }
  });

  it('holds each point as read (to 1e-6), both readings of each set', () => {
    for (const g of TRANSONIC_TE_READINGS) {
      const e = expected.get(`${g.set}|${g.reading}`)!;
      expect(g.points.length).toBe(e.length);
      g.points.forEach((p: TransonicPoint, k) => {
        const q = e[k]!;
        expect([p[0], p[1]]).toEqual([q[0], q[1]]);
        const held = [p[2], p[3], p[4], p[5]];
        const read = [q[2], q[3], q[4], q[5]];
        held.forEach((v, i) => {
          expect(Math.abs(v - read[i]!)).toBeLessThan(1e-6);
        });
      });
    }
  });

  it('has both readings of every set', () => {
    for (const set of [...Object.keys(TRANSONIC_SETS), 'RM A51J11 fig. 14', 'RM A51J11 fig. 15']) {
      const readings = new Set(
        TRANSONIC_TE_READINGS.filter((g) => g.set === set).map((g) => g.reading),
      );
      expect(readings.size, set).toBeGreaterThanOrEqual(2);
    }
  });

  it('takes each set as its report gives it', () => {
    // TN 3548: a 6% slab, Reynolds number 2.8e6 to 9.8e6 on the chord (PDF p. 4).
    const tn = TRANSONIC_SETS['TN 3548 fig. 6']!.layer!;
    expect(tn[0]).toBeCloseTo(1 / (0.06 * 9.8e6 ** 0.2), 12);
    expect(tn[1]).toBeCloseTo(1 / (0.06 * 2.8e6 ** 0.2), 12);
    expect(layerParameterRange(0.2, 1.2e6, 1.4e6).map((x) => +x.toFixed(3))).toEqual([
      0.295, 0.304,
    ]);
    expect(TRANSONIC_SETS['R&M 3348 table 3']!.faceAngleDeg).toBe(4);
    expect(TRANSONIC_SETS['Johnston fig. 10(b)']!.faceAngleDeg).toBe(5.7);
    for (const [name, p] of Object.entries(TRANSONIC_SETS)) {
      expect(p.formsNominal, name).toBe(name === 'TN 3548 fig. 6' || name === 'R&M 3427 fig. 13');
      if (p.formsNominal) expect(p.shape).toBe('flat');
    }
  });

  it('takes RM A51J11 and RM A52E01 as item 6 says, series by series', () => {
    // RM A51J11: h/c 0.04 h/t; with roughness its layer sets the reach, without it does not.
    const rough = propertiesOf('RM A51J11 fig. 14', 'h/t 0.3, with roughness');
    expect([rough.hOverC, rough.shape, rough.faceAngleDeg]).toEqual([0.012, 'converging', 2.1]);
    expect(rough.layer).toEqual(layerParameterRange(0.012, 1.7e6, 2.2e6));
    const smooth = propertiesOf('RM A51J11 fig. 14', 'h/t 0.3, without roughness');
    expect(smooth.layer).toBeUndefined();
    expect(smooth.ratioLayer).toEqual([0, layerParameterRange(0.012, 1.7e6, 2.2e6)[1]]);
    expect(propertiesOf('RM A51J11 fig. 15', 'h/t 1.0, 2y/b 0.250').layer).toBeUndefined();
    expect(propertiesOf('RM A51J11 fig. 14', 'h/t 1.0, with roughness').shape).toBe('flat');
    expect(propertiesOf('RM A51J11 fig. 14', 'h/t 0.6, with roughness').faceAngleDeg).toBe(1.0);
    // RM A52E01: each wing; a line whose wing is disputed is any of them at once. Its layer state
    // is not stated (the surfaces "polished smooth"): the band only, no layer reach, its ratio
    // over K from 1 to the turbulent value (the decision of 2026-10-27, item 6).
    const any = propertiesOf('RM A52E01 fig. 8(a)', 'any wing');
    expect([any.shape, any.faceAngleDeg, any.hOverC]).toEqual(['converging', 6.88, 0.03]);
    expect(any.layer).toBeUndefined();
    expect(any.ratioLayer).toEqual([0, layerParameterRange(0.015, 1.5e6, 1.5e6)[1]]);
    for (const set of ['RM A52E01 fig. 8(a)', 'RM A52E01 fig. 8(b)']) {
      for (const wing of ['wing 2', 'wing 3', 'wing 4', 'any wing']) {
        expect(propertiesOf(set, wing).layer, `${set} ${wing}`).toBeUndefined();
        expect(propertiesOf(set, wing).ratioLayer![0]).toBe(0);
      }
    }
    expect(propertiesOf('RM A52E01 fig. 8(b)', 'wing 2').ratioLayer).toEqual([
      0,
      layerParameterRange(0.03, 3.8e6, 3.8e6)[1],
    ]);
    expect(propertiesOf('RM A52E01 fig. 8(b)', 'wing 3').faceAngleDeg).toBe(6.88);
    expect(propertiesOf('RM A52E01 fig. 8(b)', 'wing 2').shape).toBe('flat');
    expect(() => propertiesOf('RM A52E01 fig. 8(a)', 'wing 5')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// The checks, as functions, so that the planted errors below can show they catch errors.

/** K at Mach 1.5 over a set's layer range (1 for a thin layer), least and greatest. */
const kRangeOf = (p: TransonicEvidencePoint): [number, number] => {
  const range = p.properties.ratioLayer ?? p.properties.layer;
  if (range === undefined) return [1, 1];
  const ks = Array.from({ length: 9 }, (_, i) => {
    const x = Math.min(range[0] + ((range[1] - range[0]) * i) / 8, THICK_LAYER_LIMIT);
    return x <= THIN_LAYER_LIMIT ? 1 : thickLayerFactor(1.5, x).nominal;
  });
  return [Math.min(...ks), Math.max(...ks)];
};

/** A point's ratio range against a method's nominal times K at its own Mach number. */
const ratioAt = (t: TransonicTrailingEdge, p: TransonicEvidencePoint) => {
  const n = t.nominal(p.mach);
  const [k0, k1] = kRangeOf(p);
  const r = [p.cpLow, p.cpHigh].flatMap((cp) => [cp / (n * k0), cp / (n * k1)]);
  return [Math.min(...r), Math.max(...r)] as [number, number];
};

/** The band served at M by a method (0019 section 3.4.1 item 5), thin layer. */
const bandOf = (t: TransonicTrailingEdge, mach: number) => {
  const e = t.envelope(mach);
  return {
    low: Math.min(FIN_TRAILING_EDGE_BAND.low, e.low),
    high: Math.max(FIN_TRAILING_EDGE_BAND.high, e.high),
  };
};

/** Every band-setting point outside the band at its own Mach number. */
const pointsOutside = (t: TransonicTrailingEdge, evidence: readonly TransonicEvidencePoint[]) =>
  evidence
    .filter((p) => p.mach >= 1 && p.mach <= 1.5)
    .filter((p) => {
      const [lo, hi] = ratioAt(t, p);
      const b = bandOf(t, p.mach);
      return lo < b.low - 1e-12 || hi > b.high + 1e-12;
    });

/** The step at Mach 1.5 in a method's nominal (Cp_b), against the curve above. */
const stepAt15 = (t: TransonicTrailingEdge) =>
  Math.abs(t.nominal(1.5) - thinLayerBasePressure(1.5));

/**
 * The check above Mach 1.5 (0019 section 3.4.1, the results note): each point the readings hold
 * above 1.5 against the term served there, the curve times K(M, X) and the band served there
 * (0.93 to 1.21, widened at both ends near Mach 1.7, F4 and R1) times K's spread, over the
 * point's Mach interval (from 1.5) and its layer range. RM A52E01's lines are any wing: each is
 * taken as wing 2 (h/c 0.030) and as wing 3 or 4 (h/c 0.015, the same layer). The ratios are as
 * measured, with no shape widening: the band's widening near 1.7 holds the allowance itself.
 */
function checkAbove15(): string[] {
  const out = [
    '# The check above Mach 1.5 (0019 section 3.4.1): the band there is 0.93 to 1.21, widened at',
    "# both ends near Mach 1.7 by RM A52E01's lines at Mach 1.7 (F4, R1). ratio: base drag",
    "# measured over the term served (curve times K(M, X)); band: the band's ends times K's spread",
    '# over K. Written by tests/base/fin-trailing-edge-transonic.test.ts.',
  ];
  const line = (p: TransonicEvidencePoint, taken: string, xs: readonly number[]) => {
    const m0 = Math.max(p.machLow, 1.5);
    const machs = [m0, (m0 + p.machHigh) / 2, p.machHigh];
    let [rLo, rHi, bLo, bHi] = [Infinity, -Infinity, Infinity, -Infinity];
    let inside = true;
    for (const m of machs) {
      for (const x of xs) {
        const k = thickLayerFactor(m, x);
        const r = [p.cpLow, p.cpHigh].map((cp) => cp / (thinLayerBasePressure(m) * k.nominal));
        const b = [
          (trailingEdgeBasis(m).band.low * k.low) / k.nominal,
          (trailingEdgeBasis(m).band.high * k.high) / k.nominal,
        ] as const;
        [rLo, rHi] = [Math.min(rLo, ...r), Math.max(rHi, ...r)];
        [bLo, bHi] = [Math.min(bLo, b[0]), Math.max(bHi, b[1])];
        if (Math.min(...r) < b[0] || Math.max(...r) > b[1]) inside = false;
      }
    }
    const f = (x: number) => x.toFixed(3);
    out.push(
      [
        p.set,
        p.set.startsWith('RM A52E01') ? p.id : `${p.id}, reading ${p.reading}`,
        taken,
        `M ${p.mach} +- ${f(p.machHigh - p.mach)}`,
        `ratio ${f(rLo)} to ${f(rHi)}`,
        `band ${f(bLo)} to ${f(bHi)}`,
        inside ? 'inside' : 'partly outside',
      ].join(' | '),
    );
  };
  for (const p of TRANSONIC_TE_EVIDENCE.filter((q) => q.machHigh > 1.5)) {
    if (p.set.startsWith('RM A52E01')) {
      const re = p.set.endsWith('(a)') ? 1.5e6 : 3.8e6;
      line(p, 'as wing 2', [layerParameterRange(0.03, re, re)[0]]);
      line(p, 'as wing 3 or 4', [layerParameterRange(0.015, re, re)[0]]);
    } else {
      const r = p.properties.ratioLayer ?? p.properties.layer;
      line(p, p.series, r === undefined ? [1] : [r[0], (r[0] + r[1]) / 2, r[1]]);
    }
  }
  return out;
}

/** The band-setting points at Mach 1.0 to 1.5, every reading. */
const USED_POINTS = 383;

const deps = {
  cpAt15: thinLayerBasePressure(1.5),
  thickLayerAt15: (x: number) => thickLayerFactor(1.5, x),
  thickLayerLimit: THICK_LAYER_LIMIT,
  thinLayerLimit: THIN_LAYER_LIMIT,
};

// ---------------------------------------------------------------------------

describe('the nominal below Mach 1.5 (item 3)', () => {
  const t = transonicTrailingEdge();

  it('has its nodes every 0.05 from 1.00, from the flat-faced sets, joined to the curve at 1.5', () => {
    expect([...TRANSONIC_TE_NODES]).toEqual([
      1.0, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3, 1.35, 1.4, 1.45, 1.5,
    ]);
    expect(t.nodes.map((n) => +n.cp.toFixed(4))).toEqual([
      -0.7703, -0.6803, -0.6064, -0.5236, -0.4696, -0.4305, -0.3952, -0.3733, -0.36, -0.3428,
      -0.334,
    ]);
    for (const n of t.nodes.slice(0, -1)) {
      const v = ['TN 3548 fig. 6', 'R&M 3427 fig. 13']
        .map((s) => setValue(TRANSONIC_TE_EVIDENCE, s, n.mach))
        .filter((x): x is number => x !== undefined);
      expect(n.cp).toBeCloseTo(v.reduce((a, b) => a + b, 0) / v.length, 12);
    }
    expect(stepAt15(t)).toBe(0);
  });

  it('is not fig. 7 curve below 1.5: TN 3548 lies 7% to 18% above it at M_0 1.17 to 1.24', () => {
    const tn = TRANSONIC_TE_EVIDENCE.filter(
      (p) => p.set === 'TN 3548 fig. 6' && p.mach >= 1.17 && p.mach <= 1.24,
    );
    expect(tn.length).toBe(12);
    const r = tn.map((p) => p.cpLow / thinLayerBasePressure(Math.max(p.mach, 1.167)));
    expect(Math.min(...r)).toBeGreaterThan(1.07);
    expect(Math.max(...r)).toBeLessThan(1.19);
  });

  it('serves the curve at and above 1.5, and its own nominal below, with no step', () => {
    expect(trailingEdgeBasis(1.5).pB).toBe(thinLayerBasePressure(1.5));
    expect(trailingEdgeBasis(1.5 - 1e-9).pB).toBeCloseTo(thinLayerBasePressure(1.5), 9);
    expect(trailingEdgeBasis(1.2).pB).toBe(t.nominal(1.2));
    expect(trailingEdgeBasis(1.6).belowBand).toBe(false);
    expect(trailingEdgeBasis(1.4999).belowBand).toBe(true);
  });
});

describe('the band below Mach 1.5 (items 5 and 6)', () => {
  const t = transonicTrailingEdge();

  it('holds every band-setting point of every reading at its own Mach number', () => {
    const used = TRANSONIC_TE_EVIDENCE.filter((p) => p.mach >= 1 && p.mach <= 1.5);
    expect(used.length).toBe(USED_POINTS);
    expect(pointsOutside(t, TRANSONIC_TE_EVIDENCE)).toEqual([]);
    // And the served band holds them (trailingEdgeBasis, as the term uses it).
    for (const p of used) {
      const [lo, hi] = ratioAt(t, p);
      const b = trailingEdgeBasis(p.mach).band;
      expect(lo).toBeGreaterThanOrEqual(b.low - 1e-12);
      expect(hi).toBeLessThanOrEqual(b.high + 1e-12);
    }
  });

  it('is never narrower than 0.93 to 1.21, and wider where the sets near Mach 1 are', () => {
    for (let m = 1; m <= 1.5 + 1e-12; m += 0.005) {
      const b = trailingEdgeBasis(Math.min(m, 1.5)).band;
      expect(b.low).toBeLessThanOrEqual(0.93);
      expect(b.high).toBeGreaterThanOrEqual(1.21);
    }
    // Wide near Mach 1 (RM A51J11 at +-0.02 in Mach: its outboard station at 1.06 below, its
    // flat section above) and where RM A52E01's unidentified wings are (1.15 to 1.25, 1.35 to
    // 1.45); 0.93 to 1.21 at 1.3, where only TN 3548 and RM A51J25 are, and at 1.5.
    const band = (m: number) => {
      const b = trailingEdgeBasis(m).band;
      return [+b.low.toFixed(3), +b.high.toFixed(3)];
    };
    expect(band(1.0)).toEqual([0.505, 1.515]);
    expect(band(1.1)).toEqual([0.505, 1.515]);
    expect(band(1.15)).toEqual([0.822, 1.583]);
    expect(band(1.2)).toEqual([0.93, 1.583]);
    expect(band(1.3)).toEqual([0.93, 1.21]);
    expect(band(1.4)).toEqual([0.845, 1.55]);
  });

  it('has no step at Mach 1.5: equal to 0.93 to 1.21 from both sides', () => {
    const below = trailingEdgeBasis(1.5 - 1e-9).band;
    expect(below.low).toBeCloseTo(0.93, 6);
    expect(below.high).toBeCloseTo(1.21, 6);
    expect(trailingEdgeBasis(1.5).band).toEqual(FIN_TRAILING_EDGE_BAND);
    // The points at 1.45 to 1.50 lie inside 0.93 to 1.21 (else the step would be reported).
    const last = t.nodes[t.nodes.length - 1]!;
    expect(last.low).toBeGreaterThanOrEqual(0.93);
    expect(last.high).toBeLessThanOrEqual(1.21);
    // The term itself, a thin-layer edge (c/[h Re^(1/5)] 0.55), from both sides of 1.5.
    const edge = {
      count: 4,
      thickness: 0.01,
      span: 0.1,
      chord: 0.1,
      tanSweep: 0,
      inBasePlane: false,
      layer: 'turbulent' as const,
      reynoldsPerLength: 2e7,
      referenceArea: 0.01,
    };
    const a = finTrailingEdgeBaseDrag({ ...edge, mach: 1.5 - 1e-9 });
    const b = finTrailingEdgeBaseDrag({ ...edge, mach: 1.5 });
    expect(a.cd).toBeCloseTo(b.cd, 9);
    expect(a.low).toBeCloseTo(b.low, 9);
    expect(a.high).toBeCloseTo(b.high, 9);
  });

  it('the check above Mach 1.5, with the band widened near 1.7 (F4): check-above-1.5.out', () => {
    const lines = checkAbove15();
    expect(lines.join('\n') + '\n').toBe(
      readFileSync(
        new URL(
          '../../docs/research/total-drag/audit/te-below-1.5/check-above-1.5.out',
          import.meta.url,
        ),
        'utf8',
      ),
    );
    // Every point inside: TN 3548 and RM A51J25 fig. 7's symbols as before; RM A52E01 at Mach 1.7,
    // any wing, so taken as each, inside the band widened there at both ends by its lines with
    // an agreeing pair (F4, R1); the lines read once, or with no agreeing pair, stay checks.
    expect(lines.filter((l) => l.endsWith('partly outside'))).toEqual([]);
    expect(lines.filter((l) => l.endsWith('inside')).length).toBe(33);
  });

  it('sizes the shape allowance on the NPL pair: R&M 3348 above R&M 3427 at every common Mach number', () => {
    const { allowance, pairs } = shapeAllowanceNpl(TRANSONIC_TE_EVIDENCE);
    expect(allowance).toBeCloseTo(0.0903, 4);
    expect(t.shapeAllowance).toBe(allowance);
    expect(pairs.length).toBeGreaterThan(0);
    for (const p of pairs) expect(p.ratio).toBeGreaterThan(1);
    // The ordering across facilities too: Johnston's 5.7 deg wedge above the flat-faced nominal.
    for (const p of TRANSONIC_TE_EVIDENCE.filter(
      (q) => q.set === 'Johnston fig. 10(b)' && q.mach >= 1 && q.mach <= 1.25,
    )) {
      expect(ratioAt(t, p)[0]).toBeGreaterThan(1.15);
    }
  });

  it('widens every inclined set both ways by S(angle) = S_NPL angle / 4 deg: the ordering is contradicted', () => {
    // The check (ordering-check.out): RM A51J11 fig. 15 at Mach 1.06, h/t 0.6 (faces closing about
    // 1.0 deg) above the flat h/t 1.0 in base drag, in each reading on its own.
    for (const reader of ['A', 'B']) {
      const f15 = records(`round15-${reader}/readings/a51j11_fig15.csv`).filter(
        (r) => r.series!.includes('1.06') && r.kind === 'curve',
      );
      const at = (ht: string) =>
        new Map(
          f15
            .filter((r) => r.series!.includes(`h/t = ${ht}`) || r.series!.includes(`h/t, ${ht}`))
            .map((r) => [(+r.x!).toFixed(3), -Number(r.y)]),
        );
      const [closed, flat] = [at('0.6'), at('1.0')];
      const reversed = [...closed].filter(([x, d]) => flat.has(x) && d > flat.get(x)! + 0.05);
      expect(reversed.length, reader).toBeGreaterThan(0);
    }
    expect(SHAPE_WIDENING_TWO_SIDED).toBe(true);
    for (const r of t.ratios) {
      const s = (t.shapeAllowance * r.point.properties.faceAngleDeg) / 4;
      if (r.point.properties.shape === 'flat') {
        expect([r.low, r.high]).toEqual([r.measuredLow, r.measuredHigh]);
      } else {
        expect(r.low).toBeCloseTo(r.measuredLow * (1 - s), 12);
        expect(r.high).toBeCloseTo(r.measuredHigh * (1 + s), 12);
      }
    }
    // Who sets the high end: RM A51J11's flat section to Mach 1.10, RM A52E01 at 1.15 to 1.25 and
    // 1.35 to 1.45.
    for (const n of t.nodes.filter((x) => x.mach <= 1.1)) {
      expect(n.highBy).toMatch(/^RM A51J11 fig. 14/);
    }
    for (const n of t.nodes.filter(
      (x) => (x.mach >= 1.15 && x.mach <= 1.25) || (x.mach >= 1.35 && x.mach <= 1.45),
    )) {
      expect(n.highBy).toMatch(/^RM A52E01/);
    }
  });
});

describe("the band above Mach 1.5 near 1.7: RM A52E01's lines (0019 3.4.1 item 6, F4; R1)", () => {
  const four = 'pairing-2026-10-27-a52e01-m17-four';
  const fourRow = (curve: string) =>
    records(`${four}/identity_map.csv`).find((r) => r.drawn_curve === `M=1.2, 1.4, 1.7 ${curve}`)!;
  const threeRow = (figure: string, curve: string) =>
    curvesOf(figure).find((r) => r.drawn_curve === `M=1.2, 1.4, 1.7 ${curve}`)!;
  const valuesOf = (r: Record<string, string>, readers: readonly string[]) =>
    readers.flatMap((k) => alpha0Of(r[`alpha0_${k}`]!) ?? []);

  it('holds every RM A52E01 line at Mach 1.7 with an agreeing pair at alpha 0, and no other', () => {
    // From the pairings: 8(a) #7, #9 and #10 (four-way), 8(b) #6 (three-way); read once or with
    // no agreeing pair, the rest stay checks.
    expect(ABOVE_BAND_LINES.map((l) => `${l.set} ${l.curve.split(' ').at(-1)}`).sort()).toEqual([
      'RM A52E01 fig. 8(a) #10',
      'RM A52E01 fig. 8(a) #7',
      'RM A52E01 fig. 8(a) #9',
      'RM A52E01 fig. 8(b) #6',
    ]);
    for (const curve of ['#7', '#8', '#9', '#10']) {
      const agreeing = fourRow(curve).alpha0_status!.startsWith('TWO OR MORE');
      expect(ABOVE_BAND_LINES.some((l) => l.set.endsWith('8(a)') && l.curve.endsWith(curve))).toBe(
        agreeing,
      );
    }
    for (const r of curvesOf('a52e01_fig8b').filter((c) => c.drawn_curve!.startsWith('M=1.2'))) {
      if (r.A_mach !== '1.7' && r.B_mach !== '1.7' && r.C_mach !== '1.7') continue;
      const curve = r.drawn_curve!.split(' ').at(-1)!;
      expect(
        ABOVE_BAND_LINES.some((l) => l.set.endsWith('8(b)') && l.curve.endsWith(` ${curve}`)),
        curve,
      ).toBe(r.alpha0_status!.startsWith('TWO OR MORE'));
    }
    // Each the envelope of every reading's value; any wing (a naming reader unsure in each);
    // wings 3 and 4's layer for K; the 6.88 deg allowance; Mach +-0.01.
    const expected: [AboveBandLine, number[], string][] = [
      [RM_A52E01_M17_LINE7, valuesOf(fourRow('#7'), ['A', 'B', 'C', 'D']), 'four'],
      [RM_A52E01_M17_LINE9, valuesOf(fourRow('#9'), ['A', 'B', 'C', 'D']), 'four'],
      [
        RM_A52E01_M17_LINE10,
        [...valuesOf(fourRow('#10'), ['A', 'B', 'C', 'D']), RM_A52E01_LINE10_ALTERNATIVE_END],
        'four',
      ],
    ];
    const b6 = ABOVE_BAND_LINES.find((l) => l.set.endsWith('8(b)'))!;
    expected.push([b6, valuesOf(threeRow('a52e01_fig8b', '#6'), ['A', 'B', 'C']), 'three']);
    for (const [l, values] of expected) {
      expect(l.cpLow, l.curve).toBeCloseTo(Math.min(...values), 12);
      expect(l.cpHigh, l.curve).toBeCloseTo(Math.max(...values), 12);
      expect(l.machErr).toBeCloseTo(0.01, 12);
      expect([l.mach, l.wing, l.shape, l.faceAngleDeg]).toEqual([
        1.7,
        'any wing',
        'converging',
        6.88,
      ]);
      const re = l.set.endsWith('8(a)') ? 1.5e6 : 3.8e6;
      expect(l.layerX).toBeCloseTo(layerParameterRange(0.015, re, re)[1], 12);
    }
    for (const r of [fourRow('#7'), fourRow('#9'), fourRow('#10')]) {
      expect(wingOfFour(r)).toBe('any wing');
    }
  });

  it("takes #10's alternative end from the pairing, as F4's rule takes it, a value", () => {
    const text = readFileSync(
      new URL(`../../docs/research/total-drag/audit/${four}/pairing.txt`, import.meta.url),
      'utf8',
    );
    const alt = /lowest end at alpha 0\.343 \+-0\.068, (-0\.\d+) \+-/.exec(text)!;
    expect(RM_A52E01_LINE10_ALTERNATIVE_END).toBe(Number(alt[1]));
    expect(fourRow('#10').alpha0_status).toMatch(/^TWO OR MORE AGREEING READINGS \(C-D\)/);
  });

  it("widens both ends at Mach 1.60 to 1.80, by item 5's windows, to the lines' ratios", () => {
    const band = (m: number) => {
      const b = bandAbove(m);
      return [+b.low.toFixed(4), +b.high.toFixed(4)];
    };
    for (const m of [1.5, 1.55, 1.6, 1.8, 1.9, 2.0, 2.5, 3.2])
      expect(band(m), `${m}`).toEqual([0.93, 1.21]);
    for (const m of [1.65, 1.69, 1.7, 1.71, 1.75]) expect(band(m), `${m}`).toEqual([0.35, 1.26]);
    expect(band(1.625)).toEqual([0.64, 1.235]);
    expect(band(1.775)).toEqual([0.64, 1.235]);
    expect(band(1.799)).toEqual([0.9184, 1.211]);
    expect([bandLowAbove(1.7), bandHighAbove(1.7)]).toEqual([0.35, 1.26]);
    // Each line's ratios: #10 sets the low end (0.418 less the 6.88 deg allowance, 0.353), #9 the
    // high end (1.084 more the allowance, 1.252), both rounded outward.
    const r = (l: AboveBandLine) => aboveRatios(l);
    expect(r(RM_A52E01_M17_LINE10)).toEqual({ low: 0.35, high: 0.67 });
    expect(r(RM_A52E01_M17_LINE9)).toEqual({ low: 0.75, high: 1.26 });
    expect(r(RM_A52E01_M17_LINE7)).toEqual({ low: 0.51, high: 0.86 });
    expect(r(ABOVE_BAND_LINES.find((l) => l.set.endsWith('8(b)'))!)).toEqual({
      low: 0.73,
      high: 1.17,
    });
    // The band at Mach 1.5 is unchanged: no step there.
    expect(trailingEdgeBasis(1.5).band).toEqual(FIN_TRAILING_EDGE_BAND);
    expect(trailingEdgeBasis(1.7).band).toEqual({ low: 0.35, high: 1.26 });
  });

  it('holds every reading of every line inside the term served, as every wing it may be', () => {
    for (const l of ABOVE_BAND_LINES) {
      const re = l.set.endsWith('8(a)') ? 1.5e6 : 3.8e6;
      for (const hc of [0.03, 0.015]) {
        const xTurbulent = layerParameterRange(hc, re, re)[1];
        for (let i = 0; i <= 10; i++) {
          const m = 1.69 + 0.002 * i;
          for (let j = 0; j <= 8; j++) {
            const x = 0.5 + ((xTurbulent - 0.5) * j) / 8;
            const h = hc * 0.1;
            const t = finTrailingEdgeBaseDrag({
              mach: m,
              count: 1,
              thickness: h,
              span: 1,
              chord: 0.1,
              tanSweep: 0,
              inBasePlane: false,
              layer: 'turbulent',
              reynoldsPerLength: (1 / (hc * x)) ** 5 / 0.1,
              referenceArea: h,
            });
            const at = `${l.set} ${l.curve} h/c ${hc} M ${m} X ${x}`;
            expect(t.low, at).toBeLessThanOrEqual(-l.cpHigh);
            expect(t.high, at).toBeGreaterThanOrEqual(-l.cpLow);
            expect(t.label).toMatch(
              /band widened to 0\.350 to 1\.260 near Mach 1\.7 on RM A52E01's wings at Re 1\.5e6 and 3\.8e6/,
            );
          }
        }
      }
    }
  });

  it('#7, any wing, outside 0.93 to 1.21 as #10 is, is covered by the widening', () => {
    // At -0.18, 0.62 to 0.74 of the term served at Mach 1.7: outside the band before F4.
    expect(-RM_A52E01_M17_LINE7.cpHigh / -thinLayerBasePressure(1.7)).toBeLessThan(0.93);
    expect(-RM_A52E01_M17_LINE7.cpHigh / -thinLayerBasePressure(1.69)).toBeCloseTo(0.6046, 3);
    expect(aboveRatios(RM_A52E01_M17_LINE7).low).toBeGreaterThan(bandLowAbove(1.7));
  });
});

describe('what is refused below Mach 1.5 (item 7), and the labels (item 8)', () => {
  const reason = (f: () => unknown) => {
    try {
      f();
    } catch (e) {
      expect(e).toBeInstanceOf(BaseRefusal);
      return (e as BaseRefusal).reason;
    }
    return 'none';
  };
  // c / [h Re_c^(1/5)] = 0.1 / (0.01 x 2e6^0.2) = 0.55, h/c 0.10: inside what the sets reach.
  const edge = {
    mach: 1.2,
    count: 4,
    thickness: 0.01,
    span: 0.1,
    chord: 0.1,
    tanSweep: 0,
    inBasePlane: false,
    layer: 'turbulent' as const,
    reynoldsPerLength: 2e7,
    referenceArea: 0.01,
  };

  it('serves a thin-layer edge inside the sets, with the band of its Mach number', () => {
    const r = finTrailingEdgeBaseDrag(edge);
    const b = trailingEdgeBasis(1.2);
    const cd = (-b.pB * 4 * 0.01 * 0.1) / 0.01;
    expect(r.cd).toBeCloseTo(cd, 14);
    expect(r.low).toBeCloseTo(b.band.low * cd, 14);
    expect(r.high).toBeCloseTo(b.band.high * cd, 14);
    expect(r.label).toBe(FIN_TRAILING_EDGE_LABEL_TRANSONIC_FREE);
    expect(finTrailingEdgeBaseDrag({ ...edge, inBasePlane: true }).label).toBe(
      FIN_TRAILING_EDGE_LABEL_TRANSONIC_ANALOGY,
    );
    expect(finTrailingEdgeBaseDrag({ ...edge, mach: 1.6, inBasePlane: true }).label).toBe(
      FIN_TRAILING_EDGE_LABEL_ANALOGY,
    );
    expect(FIN_TRAILING_EDGE_LABEL_TRANSONIC_FREE).toMatch(/^estimated on component data/);
    expect(FIN_TRAILING_EDGE_LABEL_TRANSONIC_ANALOGY).toMatch(/^an analogy, not a measurement/);
  });

  it('refuses below Mach 1.0, a layer or an h/c beyond the sets, a laminar or swept edge', () => {
    expect(reason(() => finTrailingEdgeBaseDrag({ ...edge, mach: 0.99 }))).toBe('mach-range');
    expect(reason(() => finTrailingEdgeBaseDrag({ ...edge, mach: 1.0 }))).toBe('none');
    // What the nodes' windows reach, each set counted at the least c/[h Re^(1/5)] of its test: RM
    // A51J11's h/t 0.3 with roughness (4.49) to the node at 1.15 (its points to 1.10, +-0.02 in
    // Mach); then TN 3548 at its highest Reynolds number (0.666). RM A52E01 counts toward no reach
    // (its layer state is not stated, the decision of 2026-10-27). Since 2026-10-28 the reach
    // served is also bounded by each series' own Mach intervals (the next test).
    const reach = transonicTrailingEdge().nodes.map((n) => +n.layerReached.toFixed(3));
    const tn = +(1 / (0.06 * 9.8e6 ** 0.2)).toFixed(3);
    const a51 = (hc: number) => +layerParameterRange(hc, 1.7e6, 2.2e6)[0].toFixed(3);
    expect(reach).toEqual([
      a51(0.012),
      a51(0.012),
      a51(0.012),
      a51(0.012),
      tn,
      tn,
      tn,
      tn,
      tn,
      tn,
      tn,
    ]);
    // 0.75 at Mach 1.3, inside TN 3548's range at its lowest Reynolds number, is refused there.
    expect(
      reason(() => finTrailingEdgeBaseDrag({ ...edge, mach: 1.3, reynoldsPerLength: 4.2e6 })),
    ).toBe('thick-layer');
    // A hobby fin: 3 mm plate, 100 mm chord, Re' 1.2e7: c/[h Re^(1/5)] 2.03, h/c 0.03. Served from
    // Mach 1.0 to 1.10 on RM A51J11's thick layers (h/t 0.6's points, X 2.25, to Mach 1.103);
    // refused above, where nothing measured reaches 2.03 (served to 1.15 before 2026-10-28).
    const hobby = { ...edge, thickness: 0.003, reynoldsPerLength: 1.2e7 };
    expect(reason(() => finTrailingEdgeBaseDrag({ ...hobby, mach: 1.0 }))).toBe('none');
    expect(reason(() => finTrailingEdgeBaseDrag({ ...hobby, mach: 1.1 }))).toBe('none');
    expect(reason(() => finTrailingEdgeBaseDrag({ ...hobby, mach: 1.11 }))).toBe('thick-layer');
    expect(reason(() => finTrailingEdgeBaseDrag({ ...hobby, mach: 1.15 }))).toBe('thick-layer');
    expect(reason(() => finTrailingEdgeBaseDrag({ ...hobby, mach: 1.16 }))).toBe('thick-layer');
    expect(reason(() => finTrailingEdgeBaseDrag(hobby))).toBe('thick-layer');
    // At Re' 2.2e7 (1.80): RM A52E01 no longer reaches it, so it is refused at 1.2 to 1.47 too.
    const thinner = { ...hobby, reynoldsPerLength: 2.2e7 };
    for (const mach of [1.2, 1.3, 1.4, 1.47]) {
      expect(
        reason(() => finTrailingEdgeBaseDrag({ ...thinner, mach })),
        `${mach}`,
      ).toBe('thick-layer');
    }
    // Beyond the reach and laminar: refused with both reasons (the review's F10).
    try {
      finTrailingEdgeBaseDrag({ ...hobby, mach: 1.3, transitionReynolds: [3e6] });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(TrailingEdgeRefusals);
      const all = (e as TrailingEdgeRefusals).all.map((r) => r.reason);
      expect(all).toEqual(['thick-layer', 'laminar-trailing-edge']);
      expect((e as BaseRefusal).message).toMatch(/c\/\[h Re_c\^\(1\/5\)\] up to 0\.67.*laminar/);
    }
    // Varying chord too.
    try {
      finTrailingEdgeBaseDrag({
        ...hobby,
        mach: 1.3,
        tipChord: 0.08,
        tipThickness: 0.003,
        transitionReynolds: [3e6],
      });
      expect.unreachable();
    } catch (e) {
      expect((e as TrailingEdgeRefusals).all.map((r) => r.reason)).toEqual([
        'thick-layer',
        'laminar-trailing-edge',
      ]);
    }
    // Beyond what any set reaches at Mach 1.05: c/[h Re^(1/5)] 4.6 (h/c 0.012 at Re' 5e5).
    expect(
      reason(() =>
        finTrailingEdgeBaseDrag({
          ...hobby,
          mach: 1.05,
          thickness: 0.0012,
          reynoldsPerLength: 5e6,
        }),
      ),
    ).toBe('thick-layer');
    // h/c 0.01 with a thin layer (Re' so high that c/[h Re^(1/5)] is 0.6): thinner than any set
    // (RM A51J11's 0.012).
    expect(
      reason(() =>
        finTrailingEdgeBaseDrag({ ...edge, thickness: 0.001, reynoldsPerLength: 1.1e12 }),
      ),
    ).toBe('thick-layer');
    // h/c 0.25, thicker than any set.
    expect(reason(() => finTrailingEdgeBaseDrag({ ...edge, thickness: 0.025 }))).toBe(
      'beyond-read-range',
    );
    // A transition input reaching the edge: refused below 1.5, served above.
    const laminar = { ...edge, transitionReynolds: [3e6] };
    expect(reason(() => finTrailingEdgeBaseDrag(laminar))).toBe('laminar-trailing-edge');
    // Above 1.5 TR 1109 fig. 29 serves it (h/c 0.04 puts c/[h Re^(1/2)] inside its readings).
    expect(reason(() => finTrailingEdgeBaseDrag({ ...laminar, thickness: 0.004, mach: 1.6 }))).toBe(
      'none',
    );
    expect(reason(() => finTrailingEdgeBaseDrag({ ...edge, transitionReynolds: [1e6] }))).toBe(
      'none',
    );
    expect(reason(() => finTrailingEdgeBaseDrag({ ...edge, tanSweep: 0.2 }))).toBe(
      'swept-trailing-edge',
    );
  });

  it('serves a layer only over the Mach range its own points measured (item 7, M3)', () => {
    // The review of B1 on main (M3): the windows let RM A51J11's thick layers, whose points' Mach
    // intervals end at 1.10 to 1.12, reach the node at 1.15. Now each series counts only over its
    // own points' intervals, from its lowest point's to its highest point's.
    const x2 = { ...edge, thickness: 0.003, reynoldsPerLength: (0.1 / (0.003 * 2.0)) ** 5 / 0.1 };
    expect(reason(() => finTrailingEdgeBaseDrag({ ...x2, mach: 1.13 }))).toBe('thick-layer');
    expect(reason(() => finTrailingEdgeBaseDrag({ ...x2, mach: 1.1 }))).toBe('none');
    try {
      finTrailingEdgeBaseDrag({ ...x2, mach: 1.13 });
    } catch (e) {
      expect((e as BaseRefusal).message).toMatch(/up to 0\.67 near Mach 1\.13/);
    }
    // The reach served: h/t 0.3 (4.49) to 1.10, h/t 0.6 (2.25) to 1.103, h/t 1.0 (1.35) to 1.121,
    // then TN 3548 (0.666); the nodes' windows unchanged.
    const t = transonicTrailingEdge();
    const a51 = (hc: number) => layerParameterRange(hc, 1.7e6, 2.2e6)[0];
    const tn = 1 / (0.06 * 9.8e6 ** 0.2);
    const at: [number, number][] = [
      [1.0, a51(0.012)],
      [1.05, a51(0.012)],
      [1.1, a51(0.012)],
      [1.102, a51(0.024)],
      [1.11, a51(0.04)],
      [1.12, a51(0.04)],
      [1.125, tn],
      [1.15, tn],
      [1.3, tn],
      [1.5, tn],
    ];
    for (const [m, x] of at) expect(t.layerReach(m), `${m}`).toBeCloseTo(x, 3);
    expect(t.bracket(1.13).map((n) => +n.layerReached.toFixed(3))).toEqual([
      +a51(0.012).toFixed(3),
      +a51(0.012).toFixed(3),
    ]);
  });

  it('gives every reason that applies, each once (review R2)', () => {
    const reasons = (f: () => unknown) => {
      try {
        f();
      } catch (e) {
        if (e instanceof TrailingEdgeRefusals) return e.all.map((r) => r.reason);
        expect(e).toBeInstanceOf(BaseRefusal);
        return [(e as BaseRefusal).reason];
      }
      return [];
    };
    // h/c 0.25 with c/[h Re^(1/5)] 0.8 at Mach 1.3: beyond the reach (0.666) and thicker than
    // any set (0.20).
    const thick = {
      ...edge,
      mach: 1.3,
      thickness: 0.025,
      reynoldsPerLength: (0.1 / (0.025 * 0.8)) ** 5 / 0.1,
    };
    expect(reasons(() => finTrailingEdgeBaseDrag(thick))).toEqual([
      'thick-layer',
      'beyond-read-range',
    ]);
    // A tapered plate, root c/[h Re^(1/5)] 1.7 (h/c 0.03), tip h/c 0.3, at Mach 1.3: the root's
    // layer and the tip's h/c, each once over every station.
    const root = 0.1 / (0.003 * 1.7);
    const tapered = {
      ...edge,
      mach: 1.3,
      thickness: 0.003,
      tipThickness: 0.003,
      tipChord: 0.01,
      reynoldsPerLength: root ** 5 / 0.1,
    };
    expect(reasons(() => finTrailingEdgeBaseDrag(tapered))).toEqual([
      'thick-layer',
      'beyond-read-range',
    ]);
    // A swept laminar edge: the sweep and the laminar layer, above 1.5 and below.
    expect(
      reasons(() =>
        finTrailingEdgeBaseDrag({ ...edge, mach: 2.0, tanSweep: 0.2, layer: 'laminar' }),
      ),
    ).toEqual(['swept-trailing-edge', 'laminar-trailing-edge']);
    expect(
      reasons(() =>
        finTrailingEdgeBaseDrag({ ...edge, mach: 1.3, tanSweep: 0.2, transitionReynolds: [3e6] }),
      ),
    ).toEqual(['swept-trailing-edge', 'laminar-trailing-edge']);
    // Above 1.5, swept, laminar and beyond X 4.5 (the quick look's example: Mach 2.0, X 4.7): the
    // sweep, the layer and the thick layer, each once, on a constant chord and a tapered one.
    const beyond = {
      ...edge,
      mach: 2.0,
      tanSweep: 0.2,
      layer: 'laminar' as const,
      reynoldsPerLength: (0.1 / (0.01 * 4.7)) ** 5 / 0.1,
    };
    expect(reasons(() => finTrailingEdgeBaseDrag(beyond))).toEqual([
      'swept-trailing-edge',
      'laminar-trailing-edge',
      'thick-layer',
    ]);
    expect(
      reasons(() => finTrailingEdgeBaseDrag({ ...beyond, tipChord: 0.08, tipThickness: 0.01 })),
    ).toEqual(['swept-trailing-edge', 'laminar-trailing-edge', 'thick-layer']);
    // One reason once: a tapered plate beyond the reach at every station is refused for it once.
    const allThin = { ...tapered, tipChord: 0.08 };
    expect(reasons(() => finTrailingEdgeBaseDrag(allThin))).toEqual(['thick-layer']);
  });

  it('checks every station on fins of varying chord', () => {
    // A tapered plate: the tip's chord 0.04 gives h/c 0.25 there, beyond the sets.
    const tapered = { ...edge, tipChord: 0.04, tipThickness: 0.01 };
    expect(reason(() => finTrailingEdgeBaseDrag(tapered))).toBe('beyond-read-range');
    // Scaled with the chord (a bevelled section), every station is h/c 0.10: served.
    const scaled = { ...edge, tipChord: 0.06, tipThickness: 0.006 };
    const r = finTrailingEdgeBaseDrag(scaled);
    expect(r.label).toMatch(/^estimated on component data/);
    expect(r.low).toBeLessThan(r.cd);
    expect(r.high).toBeGreaterThan(r.cd);
    expect(reason(() => finTrailingEdgeBaseDrag({ ...scaled, transitionReynolds: [1.3e6] }))).toBe(
      'laminar-trailing-edge',
    );
  });
});

describe('planted errors: the checks catch them', () => {
  const t = transonicTrailingEdge();

  it('a misread point (moved 15% up) falls outside the band', () => {
    const moved = TRANSONIC_TE_EVIDENCE.map((p, i) =>
      i === 0 ? { ...p, mach: 1.2, cpLow: p.cpLow * 1.6, cpHigh: p.cpHigh * 1.6 } : p,
    );
    expect(pointsOutside(t, moved).length).toBe(1);
  });

  it('a window that leaves out the neighbouring nodes leaves points outside', () => {
    // Built on the evidence with every point's Mach interval cut to zero and moved half a node
    // over, the band no longer holds the real points: the in-band check sees it.
    const shifted = TRANSONIC_TE_EVIDENCE.map((p) => ({
      ...p,
      mach: p.mach + 0.025,
      machLow: p.mach + 0.025,
      machHigh: p.mach + 0.025,
    }));
    const wrong = buildTransonicTrailingEdge(deps, shifted);
    expect(pointsOutside(wrong, TRANSONIC_TE_EVIDENCE).length).toBeGreaterThan(0);
  });

  it('the fallback ignored (one-sided after the contradiction) leaves inclined points unwidened', () => {
    const wrong = buildTransonicTrailingEdge(deps, TRANSONIC_TE_EVIDENCE, { twoSided: false });
    const bothWays = (x: TransonicTrailingEdge) =>
      x.ratios.filter((r) => r.low < r.measuredLow && r.high > r.measuredHigh).length;
    expect(bothWays(wrong)).toBe(0);
    expect(bothWays(t)).toBeGreaterThan(0);
  });

  it('a nominal not joined to the curve at 1.5 shows a step', () => {
    const wrong = buildTransonicTrailingEdge({ ...deps, cpAt15: deps.cpAt15 * 1.02 });
    expect(stepAt15(wrong)).toBeGreaterThan(0.006);
    expect(stepAt15(t)).toBe(0);
  });
});
