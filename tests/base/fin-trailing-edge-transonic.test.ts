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
const inWindow = (m: number) => m >= 0.97 && m <= 1.65;
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
  const add = (set: string, reading: string, p: Expected) => {
    if (!inWindow(p[2])) return;
    const k = `${set}|${reading}`;
    g.set(k, [...(g.get(k) ?? []), p]);
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
  return g;
}

/**
 * RM A52E01 fig. 8's points as the neutral pairing gives them (0019 3.4.1 item 6): the alpha 0
 * rows both readings give (agree or DISAGREE), both values; the wing both readings agree on, else
 * any. Values read once give none.
 */
function a52e01Expected(figure: string) {
  const dir = 'pairing-2026-10-26-a51j11-a52e01';
  const idmap = records(`${dir}/identity_map.csv`);
  const pairs = records(`${dir}/pairs_${figure}.csv`);
  const twice = pairs.filter(
    (r) => r.category === 'alpha 0' && (r.verdict === 'agree' || r.verdict === 'DISAGREE'),
  );
  const once = pairs.filter((r) => r.category === 'alpha 0' && /READ ONCE/.test(r.verdict!));
  return { twice, once, idmap };
}

describe('the readings, held to their files', () => {
  const expected = expectedGroups();

  it('holds every group of every reading, and nothing else', () => {
    const held = new Set(TRANSONIC_TE_READINGS.map((g) => `${g.set}|${g.reading}`));
    expect([...held].sort()).toEqual([...expected.keys()].sort());
    expect(TRANSONIC_TE_READINGS.reduce((n, g) => n + g.points.length, 0)).toBe(542);
  });

  it('takes RM A52E01 from the pairing only: no value read once, so none from two readers', () => {
    for (const figure of ['a52e01_fig8a', 'a52e01_fig8b']) {
      const { twice, once } = a52e01Expected(figure);
      // Every supersonic alpha 0 value is read once (reader B) or by neither (the pairing).
      const supersonic = twice.filter((r) => r.group!.startsWith('M=1'));
      expect(supersonic, figure).toEqual([]);
      expect(once.filter((r) => r.group!.startsWith('M=1')).length).toBeGreaterThan(0);
      // The values read twice are all subsonic, below the term's range: none is held.
      for (const r of twice) expect(Number(r.group!.replace('M=', ''))).toBeLessThan(0.97);
    }
    expect(TRANSONIC_TE_READINGS.some((g) => g.set.startsWith('RM A52E01'))).toBe(false);
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
    // RM A52E01: each wing; a line whose wing is disputed is any of them at once.
    const any = propertiesOf('RM A52E01 fig. 8(a)', 'any wing');
    expect([any.shape, any.faceAngleDeg, any.hOverC]).toEqual(['converging', 6.88, 0.03]);
    expect(any.layer).toEqual(layerParameterRange(0.03, 1.5e6, 1.5e6));
    expect(any.ratioLayer).toEqual([
      layerParameterRange(0.03, 1.5e6, 1.5e6)[0],
      layerParameterRange(0.015, 1.5e6, 1.5e6)[1],
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

/** Nodes where a diverging set sets the high end above its own measured ratio (widened up). */
const wedgesWidenedUp = (t: TransonicTrailingEdge) =>
  t.nodes.filter((n) => {
    const r = t.ratios.find(
      (x) => `${x.point.set}, ${x.point.reading}, ${x.point.id}` === n.highBy,
    )!;
    return r.point.properties.shape === 'diverging' && n.high > r.measuredHigh + 1e-12;
  });

/** The step at Mach 1.5 in a method's nominal (Cp_b), against the curve above. */
const stepAt15 = (t: TransonicTrailingEdge) =>
  Math.abs(t.nominal(1.5) - thinLayerBasePressure(1.5));

/** The band-setting points at Mach 1.0 to 1.5, every reading. */
const USED_POINTS = 367;

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
    // Wide near Mach 1 (RM A51J11's thick layers and faces converging to the base below, its flat
    // section above), narrowing to 0.93 to 1.21 by Mach 1.3.
    expect(trailingEdgeBasis(1.0).band.low).toBeCloseTo(0.912, 3);
    expect(trailingEdgeBasis(1.0).band.high).toBeCloseTo(1.442, 3);
    expect(trailingEdgeBasis(1.1).band.low).toBeCloseTo(0.557, 3);
    expect(trailingEdgeBasis(1.15).band.high).toBeCloseTo(1.271, 3);
    expect(trailingEdgeBasis(1.2).band.high).toBeCloseTo(1.246, 3);
    expect(trailingEdgeBasis(1.45).band.low).toBeCloseTo(0.921, 3);
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

  it('widens a diverging set only downward and a converging one only upward, by S(angle) = S_NPL angle / 4 deg', () => {
    for (const r of t.ratios) {
      const s = (t.shapeAllowance * r.point.properties.faceAngleDeg) / 4;
      if (r.point.properties.shape === 'diverging') {
        expect(r.low).toBeCloseTo(r.measuredLow * (1 - s), 12);
        expect(r.high).toBe(r.measuredHigh);
      } else if (r.point.properties.shape === 'converging') {
        expect(r.low).toBe(r.measuredLow);
        expect(r.high).toBeCloseTo(r.measuredHigh * (1 + s), 12);
      } else {
        expect([r.low, r.high]).toEqual([r.measuredLow, r.measuredHigh]);
      }
    }
    expect(wedgesWidenedUp(t)).toEqual([]);
    // RM A51J11's flat section sets the high end from Mach 1.0 to 1.15, Johnston's wedge at 1.2 and 1.25.
    for (const n of t.nodes.filter((x) => x.mach <= 1.15)) {
      expect(n.highBy).toMatch(/^RM A51J11 fig. 14/);
    }
    for (const n of t.nodes.filter((x) => x.mach >= 1.2 && x.mach <= 1.25)) {
      expect(n.highBy).toMatch(/^Johnston/);
    }
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
    // What the sets are sure to reach, each counted at the least c/[h Re^(1/5)] of its test: RM
    // A51J11's h/t 0.3 with roughness (4.49) to Mach 1.10, its h/t 1.0 (1.35) in the window of
    // 1.15, then TN 3548 at its highest Reynolds number (0.666).
    const reach = transonicTrailingEdge().nodes.map((n) => +n.layerReached.toFixed(3));
    const tn = +(1 / (0.06 * 9.8e6 ** 0.2)).toFixed(3);
    const a51 = (hc: number) => +layerParameterRange(hc, 1.7e6, 2.2e6)[0].toFixed(3);
    expect(reach).toEqual([
      a51(0.012),
      a51(0.012),
      a51(0.012),
      a51(0.04),
      tn,
      tn,
      tn,
      tn,
      tn,
      tn,
      tn,
    ]);
    // 0.75 at Mach 1.2, inside TN 3548's range at its lowest Reynolds number, is refused.
    expect(reason(() => finTrailingEdgeBaseDrag({ ...edge, reynoldsPerLength: 4.2e6 }))).toBe(
      'thick-layer',
    );
    // A hobby fin: 3 mm plate, 100 mm chord, Re' 1.5e7: c/[h Re^(1/5)] 1.9, h/c 0.03. Served from
    // Mach 1.0 to 1.10 on RM A51J11's thick layers; refused where nothing reaches 1.9.
    const hobby = { ...edge, thickness: 0.003, reynoldsPerLength: 1.5e7 };
    expect(reason(() => finTrailingEdgeBaseDrag({ ...hobby, mach: 1.0 }))).toBe('none');
    expect(reason(() => finTrailingEdgeBaseDrag({ ...hobby, mach: 1.1 }))).toBe('none');
    expect(reason(() => finTrailingEdgeBaseDrag({ ...hobby, mach: 1.12 }))).toBe('thick-layer');
    expect(reason(() => finTrailingEdgeBaseDrag(hobby))).toBe('thick-layer');
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

  it('the shape widening on the wrong side widens a wedge upward', () => {
    const wrong = buildTransonicTrailingEdge(deps, TRANSONIC_TE_EVIDENCE, { twoSided: true });
    expect(wedgesWidenedUp(wrong).length).toBeGreaterThan(0);
    expect(wedgesWidenedUp(t)).toEqual([]);
  });

  it('a nominal not joined to the curve at 1.5 shows a step', () => {
    const wrong = buildTransonicTrailingEdge({ ...deps, cpAt15: deps.cpAt15 * 1.02 });
    expect(stepAt15(wrong)).toBeGreaterThan(0.006);
    expect(stepAt15(t)).toBe(0);
  });
});
