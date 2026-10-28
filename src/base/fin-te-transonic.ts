/**
 * The base drag of square (blunt) fin trailing edges at free-stream Mach
 * 1.0 to 1.5: docs/design/0019-fins-near-mach-1.md section 3.4.1. Above
 * Mach 1.5 the term is ./fin-trailing-edge.ts's (RM A51J25 fig. 7's curve,
 * band 0.93 to 1.21); this module gives, below 1.5:
 *
 * - the nominal two-dimensional base pressure Cp_b(M) of a flat-faced edge
 *   with a thin layer: piecewise linear through nodes every 0.05 from 1.00
 *   to 1.45, each the mean of the flat-faced thin-layer sets that reach it
 *   (TN 3548 fig. 6 in free flight, R&M 3427 fig. 13), and at 1.50 the
 *   curve the code holds above 1.5, so the nominal has no step there;
 * - the band, base drag measured over modelled: at each node the least and
 *   greatest ratio of every band-setting point whose Mach interval meets
 *   the span between the neighbouring nodes, linear between nodes, so each
 *   point lies inside the band at its own Mach number. Points of sections
 *   whose faces are inclined at the base (single wedges, diverging;
 *   thickened airfoils, converging) enter unshifted, their range extended
 *   by S(angle) on the side the shape ordering does not bound;
 * - what the data cover: the layer parameter c / [h Re_c^(1/5)] and h / c
 *   reached at each node.
 *
 * Every set is on the free-stream Mach number and pressure (0014 section
 * 10.7 (r)). The readings are ./fin-te-transonic-data.ts (both readings of
 * each set, generated from the audit's reading files).
 *
 * The term's own dependencies (the curve above 1.5, TR 1109's thick-layer
 * factor) are passed in by ./fin-trailing-edge.ts, so this module does not
 * import it.
 */

import { TRANSONIC_TE_READINGS, type TransonicPoint } from './fin-te-transonic-data';

/** How a section's faces meet the base. */
export type FaceShape = 'flat' | 'diverging' | 'converging';

/** What the method takes from a set: its shape, its edge and its layer. */
export interface TransonicSetProperties {
  readonly shape: FaceShape;
  /** The faces' inclination to the stream at the base, deg (0 for flat faces). */
  readonly faceAngleDeg: number;
  /** Trailing-edge thickness over chord; undefined where the source does not state it. */
  readonly hOverC: number | undefined;
  /** c / [h Re_c^(1/5)], least and greatest over the test's Reynolds numbers; undefined if not stated. */
  readonly layer: readonly [number, number] | undefined;
  /** True for the flat-faced thin-layer sets the nominal is formed on. */
  readonly formsNominal: boolean;
  /**
   * The layer parameters the set's ratio is formed over (K at Mach 1.5 at
   * each), where they differ from `layer`: a set whose layer may be laminar
   * or turbulent counts toward no layer reach (`layer` undefined) but its
   * ratio is formed over K from 1 (thin) to its turbulent value (0019
   * section 3.4.1 item 6).
   */
  readonly ratioLayer?: readonly [number, number];
}

/** c / [h Re_c^(1/5)] over a range of chord Reynolds numbers, least first. */
export function layerParameterRange(
  hOverC: number,
  reynoldsLow: number,
  reynoldsHigh: number,
): readonly [number, number] {
  return [1 / (hOverC * reynoldsHigh ** 0.2), 1 / (hOverC * reynoldsLow ** 0.2)];
}

/**
 * Each set's properties, from its report (0019 section 3.4.1 item 2):
 * TN 3548, a 6% slab, chord 9.582 in, Reynolds number 2.8e6 to 9.8e6 on
 * the chord (PDF pp. 4 and 7); R&M 3427, h/c 0.10, 0.8e6 to 2.7e6; R&M
 * 3348, a 4.0 deg single wedge, h/c 0.14, 1.25e6 to 3.41e6 on the
 * streamwise chord; Johnston, a 5.7 deg single wedge, h/c 0.20, 1.2e6 to
 * 1.4e6; RM A51J25 fig. 7's symbols, sections and Reynolds numbers not
 * stated, taken as flat at M = M' (Chapman's correlation for thin layers),
 * as the code serves that curve above Mach 1.5.
 */
export const TRANSONIC_SETS: Readonly<Record<string, TransonicSetProperties>> = {
  'TN 3548 fig. 6': {
    shape: 'flat',
    faceAngleDeg: 0,
    hOverC: 0.06,
    layer: layerParameterRange(0.06, 2.8e6, 9.8e6),
    formsNominal: true,
  },
  'R&M 3427 fig. 13': {
    shape: 'flat',
    faceAngleDeg: 0,
    hOverC: 0.1,
    layer: layerParameterRange(0.1, 0.8e6, 2.7e6),
    formsNominal: true,
  },
  'R&M 3348 table 3': {
    shape: 'diverging',
    faceAngleDeg: 4,
    hOverC: 0.14,
    layer: layerParameterRange(0.14, 1.25e6, 3.41e6),
    formsNominal: false,
  },
  'R&M 3348 fig. 30a': {
    shape: 'diverging',
    faceAngleDeg: 4,
    hOverC: 0.14,
    layer: layerParameterRange(0.14, 1.25e6, 3.41e6),
    formsNominal: false,
  },
  'Johnston fig. 10(b)': {
    shape: 'diverging',
    faceAngleDeg: 5.7,
    hOverC: 0.2,
    layer: layerParameterRange(0.2, 1.2e6, 1.4e6),
    formsNominal: false,
  },
  'RM A51J25 fig. 7 symbols': {
    shape: 'flat',
    faceAngleDeg: 0,
    hOverC: undefined,
    layer: undefined,
    formsNominal: false,
  },
};

/** One point of a band-setting set, with what the method needs. */
export interface TransonicEvidencePoint {
  readonly set: string;
  readonly reading: string;
  readonly id: string;
  readonly series: string;
  readonly mach: number;
  readonly machLow: number;
  readonly machHigh: number;
  readonly cpLow: number;
  readonly cpHigh: number;
  readonly properties: TransonicSetProperties;
}

/**
 * Sets whose properties change from series to series (a report's several
 * trailing-edge thicknesses or wings): the properties of each series, by
 * its name as read; undefined for a series the method does not take.
 */
export const TRANSONIC_SERIES_SETS: Readonly<
  Record<string, (series: string) => TransonicSetProperties | undefined>
> = {
  'RM A51J11 fig. 14': (series) => a51j11(series, !series.includes('without roughness')),
  'RM A51J11 fig. 15': (series) => a51j11(series, false),
  'RM A52E01 fig. 8(a)': (series) => a52e01(series, 1.5e6),
  'RM A52E01 fig. 8(b)': (series) => a52e01(series, 3.8e6),
};

/**
 * RM A51J11 (0014 10.7 (ac)): the 4% circular arc built up to h/t 0.3, 0.6
 * and 1.0 of the maximum thickness (h/c 0.012, 0.024, 0.040), faired back
 * by straight lines that meet the base parallel at h/t 1.0 and converging
 * by about 2.1 and 1.0 deg at 0.3 and 0.6; Re 1.7e6 to 2.2e6 on the chord.
 * With surface roughness its layer is turbulent and sets the layer reach;
 * without, and in fig. 15, the layer state is not known: no reach, the
 * ratio formed over K from 1 to the turbulent value (0019 3.4.1 item 6).
 */
function a51j11(series: string, turbulent: boolean): TransonicSetProperties | undefined {
  const ht = /h\/t (0\.3|0\.6|1\.0)/.exec(series)?.[1];
  if (ht === undefined) return undefined;
  const hOverC = 0.04 * Number(ht);
  const layer = layerParameterRange(hOverC, 1.7e6, 2.2e6);
  const faceAngleDeg = ht === '1.0' ? 0 : ht === '0.6' ? 1.0 : 2.1;
  return {
    shape: faceAngleDeg === 0 ? 'flat' : 'converging',
    faceAngleDeg,
    hOverC,
    layer: turbulent ? layer : undefined,
    ratioLayer: [0, layer[1]],
    formsNominal: false,
  };
}

/**
 * RM A52E01 (0014 10.7 (ac)): the 3% biconvex wing; wing 2 h/c 0.030 with
 * faces parallel at the base, wings 4 and 3 h/c 0.015 with boattails of
 * 2.02 and 6.88 deg; Re 1.5e6 or 3.8e6 on the mean aerodynamic chord. Its
 * text states no transition strip and no layer state ("The surfaces of the
 * body and wings were polished smooth."), so it sets the band only, not the
 * layer reach, as RM A51J11 without roughness: the ratio formed over K from
 * 1 to the turbulent value (the coordinator's decision of 2026-10-27, 0019
 * 3.4.1 item 6). A line whose wing the readings do not agree on is any of
 * the three at once: the layers of all three in its ratio, the 6.88 deg
 * widening, and wing 2's h/c.
 */
function a52e01(series: string, reynolds: number): TransonicSetProperties | undefined {
  const wing2 = layerParameterRange(0.03, reynolds, reynolds);
  const wing34 = layerParameterRange(0.015, reynolds, reynolds);
  switch (series) {
    case 'wing 2':
      return {
        shape: 'flat',
        faceAngleDeg: 0,
        hOverC: 0.03,
        layer: undefined,
        ratioLayer: [0, wing2[1]],
        formsNominal: false,
      };
    case 'wing 4':
      return {
        shape: 'converging',
        faceAngleDeg: 2.02,
        hOverC: 0.015,
        layer: undefined,
        ratioLayer: [0, wing34[1]],
        formsNominal: false,
      };
    case 'wing 3':
      return {
        shape: 'converging',
        faceAngleDeg: 6.88,
        hOverC: 0.015,
        layer: undefined,
        ratioLayer: [0, wing34[1]],
        formsNominal: false,
      };
    case 'any wing':
      // Its h/c taken as wing 2's, the larger: the least it is sure to reach toward thin edges.
      return {
        shape: 'converging',
        faceAngleDeg: 6.88,
        hOverC: 0.03,
        layer: undefined,
        ratioLayer: [0, wing34[1]],
        formsNominal: false,
      };
    default:
      return undefined;
  }
}

/** A point's set and series properties; throws for a set or series the method does not know. */
export function propertiesOf(set: string, series: string): TransonicSetProperties {
  const bySeries = TRANSONIC_SERIES_SETS[set];
  const p = bySeries === undefined ? TRANSONIC_SETS[set] : bySeries(series);
  if (p === undefined) throw new Error(`no properties for ${set}, ${series}`);
  return p;
}

const points = (groups: typeof TRANSONIC_TE_READINGS): TransonicEvidencePoint[] =>
  groups.flatMap((g) =>
    g.points.map(([id, series, mach, machErr, cpLow, cpHigh]: TransonicPoint) => ({
      set: g.set,
      reading: g.reading,
      id,
      series,
      mach,
      machLow: mach - machErr,
      machHigh: mach + machErr,
      cpLow,
      cpHigh,
      properties: propertiesOf(g.set, series),
    })),
  );

/** Every band-setting point of every reading. */
export const TRANSONIC_TE_EVIDENCE: readonly TransonicEvidencePoint[] =
  points(TRANSONIC_TE_READINGS);

/** The domain below the band of ./fin-trailing-edge.ts. */
export const TRANSONIC_TE_MACH_RANGE = [1.0, 1.5] as const;
/** The nodes of the nominal and of the band. */
export const TRANSONIC_TE_NODES = [
  1.0, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3, 1.35, 1.4, 1.45, 1.5,
] as const;
/** The face angle against which the shape allowance was measured (R&M 3348's wedge), deg. */
export const SHAPE_REFERENCE_ANGLE_DEG = 4;
/**
 * The shape ordering's fallback (0019 section 3.4.1 item 6): false while no
 * pair measured in one facility contradicts the ordering; then the widening
 * is two-sided for every inclined set. True since the check of 2026-10-26
 * (docs/research/total-drag/audit/te-below-1.5/ordering-check.out): in RM
 * A51J11 fig. 15 at Mach 1.06, both readings show h/t 0.6 (faces closing
 * about 1.0 deg) with more base drag than the flat h/t 1.0 at the stations
 * from 2y/b 0.40 to 0.875, by up to 0.13 in Cp_b, beyond the readings'
 * summed errors from 0.45 out.
 */
export const SHAPE_WIDENING_TWO_SIDED = true;

/** The mean over values, undefined when there are none. */
const mean = (v: readonly number[]) =>
  v.length === 0 ? undefined : v.reduce((a, b) => a + b, 0) / v.length;

/** A series' Cp_b at M, linear between its points; undefined outside its Mach range. */
export function seriesValue(
  series: readonly TransonicEvidencePoint[],
  mach: number,
): number | undefined {
  const s = [...series].sort((a, b) => a.mach - b.mach);
  for (let i = 0; i + 1 < s.length; i++) {
    const a = s[i]!;
    const b = s[i + 1]!;
    if (mach >= a.mach && mach <= b.mach && b.mach > a.mach) {
      const ca = (a.cpLow + a.cpHigh) / 2;
      const cb = (b.cpLow + b.cpHigh) / 2;
      return ca + ((mach - a.mach) / (b.mach - a.mach)) * (cb - ca);
    }
  }
  return undefined;
}

/** The points grouped by set, reading and series. */
function seriesOf(evidence: readonly TransonicEvidencePoint[], set: string) {
  const bySeries = new Map<string, TransonicEvidencePoint[]>();
  for (const p of evidence.filter((q) => q.set === set)) {
    const key = `${p.reading}|${p.series}`;
    bySeries.set(key, [...(bySeries.get(key) ?? []), p]);
  }
  return [...bySeries.values()];
}

/** A set's value at M: the mean over its readings and series that reach M. */
export function setValue(
  evidence: readonly TransonicEvidencePoint[],
  set: string,
  mach: number,
): number | undefined {
  return mean(
    seriesOf(evidence, set)
      .map((s) => seriesValue(s, mach))
      .filter((v): v is number => v !== undefined),
  );
}

/**
 * The shape allowance's size: the largest ratio, less one, of R&M 3348's
 * unswept base pressure (table 3 and fig. 30a, every reading) to R&M 3427's
 * (one tunnel, the NPL 18 by 14 in; each reading of its hole 6, linear in
 * M) at the Mach numbers from 1.0 where both are measured.
 */
export function shapeAllowanceNpl(evidence: readonly TransonicEvidencePoint[]): {
  readonly allowance: number;
  readonly pairs: readonly { readonly mach: number; readonly ratio: number }[];
} {
  const plate = seriesOf(evidence, 'R&M 3427 fig. 13').filter((s) => s[0]!.series === 'hole 6');
  const pairs: { mach: number; ratio: number }[] = [];
  for (const w of evidence.filter(
    (p) => (p.set === 'R&M 3348 table 3' || p.set === 'R&M 3348 fig. 30a') && p.mach >= 1,
  )) {
    for (const s of plate) {
      const v = seriesValue(s, w.mach);
      if (v !== undefined) {
        pairs.push({ mach: w.mach, ratio: w.cpLow / v }, { mach: w.mach, ratio: w.cpHigh / v });
      }
    }
  }
  if (pairs.length === 0)
    throw new Error('no Mach number where R&M 3348 and R&M 3427 both measure');
  return { allowance: Math.max(...pairs.map((p) => p.ratio)) - 1, pairs };
}

/** What the term passes in: the nominal at Mach 1.5 and TR 1109's factor at Mach 1.5. */
export interface TransonicDependencies {
  /** Cp_b of the thin-layer curve at Mach 1.5 (the code's nominal there). */
  readonly cpAt15: number;
  /** K(1.5, X): nominal, least and greatest. */
  readonly thickLayerAt15: (layer: number) => { nominal: number; low: number; high: number };
  /** The largest c / [h Re_c^(1/5)] the factor is read to. */
  readonly thickLayerLimit: number;
  /** The c / [h Re_c^(1/5)] up to which the layer is thin (K = 1). */
  readonly thinLayerLimit: number;
}

/** One node of the band. */
export interface TransonicNode {
  readonly mach: number;
  /** The nominal Cp_b. */
  readonly cp: number;
  /** The least and greatest ratio, base drag measured over modelled, of the points in the window. */
  readonly low: number;
  readonly high: number;
  /** Which point sets each end. */
  readonly lowBy: string;
  readonly highBy: string;
  /** The largest layer parameter the window's points are sure to reach (each set's least). */
  readonly layerReached: number;
  /** The least and greatest h / c of the window's points. */
  readonly hOverC: readonly [number, number];
  /** The points in the window. */
  readonly count: number;
}

/** A point's ratio range, base drag measured over modelled, after the shape widening. */
export interface PointRatio {
  readonly point: TransonicEvidencePoint;
  readonly low: number;
  readonly high: number;
  /** The range before the shape widening. */
  readonly measuredLow: number;
  readonly measuredHigh: number;
}

export interface TransonicTrailingEdge {
  readonly nodes: readonly TransonicNode[];
  readonly shapeAllowance: number;
  /** The least and greatest h / c of all band-setting sets below Mach 1.5 (item 7). */
  readonly hOverCRange: readonly [number, number];
  readonly ratios: readonly PointRatio[];
  /** Nominal Cp_b at M (1.0 to 1.5). */
  nominal(mach: number): number;
  /** The band's ends from the evidence alone at M, linear between nodes. */
  envelope(mach: number): { readonly low: number; readonly high: number };
  /** The nodes either side of M. */
  bracket(mach: number): readonly [TransonicNode, TransonicNode];
}

/**
 * The nominal, the point ratios and the band's nodes from the evidence
 * (0019 section 3.4.1 items 3 to 6).
 */
export function buildTransonicTrailingEdge(
  deps: TransonicDependencies,
  evidence: readonly TransonicEvidencePoint[] = TRANSONIC_TE_EVIDENCE,
  options: { readonly twoSided?: boolean } = {},
): TransonicTrailingEdge {
  const twoSided = options.twoSided ?? SHAPE_WIDENING_TWO_SIDED;
  const [lo, hi] = TRANSONIC_TE_MACH_RANGE;
  const nominalSets = Object.entries(TRANSONIC_SETS)
    .filter(([, p]) => p.formsNominal)
    .map(([name]) => name);
  const nodeCp = TRANSONIC_TE_NODES.map((m) => {
    if (m === hi) return deps.cpAt15;
    const values = nominalSets
      .map((s) => setValue(evidence, s, m))
      .filter((v): v is number => v !== undefined);
    const v = mean(values);
    if (v === undefined) throw new Error(`no flat-faced thin-layer set reaches Mach ${m}`);
    return v;
  });
  const nominal = (mach: number) => {
    if (!(mach >= lo && mach <= hi))
      throw new RangeError(`the nominal is formed at Mach ${lo} to ${hi}`);
    let k = 0;
    while (k + 2 < TRANSONIC_TE_NODES.length && mach > TRANSONIC_TE_NODES[k + 1]!) k++;
    const a = TRANSONIC_TE_NODES[k]!;
    const b = TRANSONIC_TE_NODES[k + 1]!;
    return nodeCp[k]! + ((mach - a) / (b - a)) * (nodeCp[k + 1]! - nodeCp[k]!);
  };
  const { allowance } = shapeAllowanceNpl(evidence);

  const kRange = (p: TransonicSetProperties) => {
    const range = p.ratioLayer ?? p.layer;
    if (range === undefined) return [1, 1];
    const [x0, x1] = range;
    const ks: number[] = [];
    for (let i = 0; i <= 8; i++) {
      const x = Math.min(x0 + ((x1 - x0) * i) / 8, deps.thickLayerLimit);
      ks.push(x <= deps.thinLayerLimit ? 1 : deps.thickLayerAt15(x).nominal);
    }
    return [Math.min(...ks), Math.max(...ks)];
  };

  const ratios: PointRatio[] = [];
  for (const p of evidence) {
    const m0 = Math.max(p.machLow, lo);
    const m1 = Math.min(p.machHigh, hi);
    if (!(m1 >= m0)) continue;
    const machs = [m0, m1, ...TRANSONIC_TE_NODES.filter((m) => m > m0 && m < m1)];
    const [k0, k1] = kRange(p.properties);
    const values = machs.flatMap((m) =>
      [p.cpLow, p.cpHigh].flatMap((cp) => [k0!, k1!].map((k) => cp / (nominal(m) * k))),
    );
    const measuredLow = Math.min(...values);
    const measuredHigh = Math.max(...values);
    const s = (allowance * p.properties.faceAngleDeg) / SHAPE_REFERENCE_ANGLE_DEG;
    const down = p.properties.shape === 'diverging' || (twoSided && p.properties.shape !== 'flat');
    const up = p.properties.shape === 'converging' || (twoSided && p.properties.shape !== 'flat');
    ratios.push({
      point: p,
      low: down ? measuredLow * (1 - s) : measuredLow,
      high: up ? measuredHigh * (1 + s) : measuredHigh,
      measuredLow,
      measuredHigh,
    });
  }

  const nodes: TransonicNode[] = TRANSONIC_TE_NODES.map((m, k) => {
    const a = TRANSONIC_TE_NODES[Math.max(0, k - 1)]!;
    const b = TRANSONIC_TE_NODES[Math.min(TRANSONIC_TE_NODES.length - 1, k + 1)]!;
    const inWindow = ratios.filter((r) => r.point.machHigh >= a && r.point.machLow <= b);
    if (inWindow.length === 0) throw new Error(`no point near Mach ${m}`);
    const lowest = inWindow.reduce((x, y) => (y.low < x.low ? y : x));
    const highest = inWindow.reduce((x, y) => (y.high > x.high ? y : x));
    const name = (r: PointRatio) => `${r.point.set}, ${r.point.reading}, ${r.point.id}`;
    const layers = inWindow
      .map((r) => r.point.properties.layer?.[0])
      .filter((x): x is number => x !== undefined);
    const hc = inWindow
      .map((r) => r.point.properties.hOverC)
      .filter((x): x is number => x !== undefined);
    return {
      mach: m,
      cp: nodeCp[k]!,
      low: lowest.low,
      high: highest.high,
      lowBy: name(lowest),
      highBy: name(highest),
      layerReached: Math.max(...layers),
      hOverC: [Math.min(...hc), Math.max(...hc)],
      count: inWindow.length,
    };
  });

  const bracket = (mach: number): readonly [TransonicNode, TransonicNode] => {
    if (!(mach >= lo && mach <= hi))
      throw new RangeError(`the band is formed at Mach ${lo} to ${hi}`);
    let k = 0;
    while (k + 2 < nodes.length && mach > nodes[k + 1]!.mach) k++;
    return [nodes[k]!, nodes[k + 1]!];
  };
  const envelope = (mach: number) => {
    const [a, b] = bracket(mach);
    const t = (mach - a.mach) / (b.mach - a.mach);
    return { low: a.low + t * (b.low - a.low), high: a.high + t * (b.high - a.high) };
  };
  const hcAll = ratios
    .map((r) => r.point.properties.hOverC)
    .filter((x): x is number => x !== undefined);
  return {
    nodes,
    shapeAllowance: allowance,
    hOverCRange: [Math.min(...hcAll), Math.max(...hcAll)],
    ratios,
    nominal,
    envelope,
    bracket,
  };
}
