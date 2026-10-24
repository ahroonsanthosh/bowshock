/**
 * The nose's model-form allowance: the inviscid model against measured
 * nose pressures, as design record 0022 sections 4.3 to 4.5 and 5 fix it
 * (registered as 0014 section 10.7 (w)). Nothing here reads a source: it
 * takes readings (typed pressure coefficients at the orifice stations) and
 * an inviscid solution, and forms
 *
 * - per body, Mach number and reading (every ambiguous alternative in
 *   turn), the like-for-like difference r = D_meas / D_inv - 1, the
 *   measurement term u_meas and the uncovered term u_unc (4.3 items 1 to
 *   5), and the half-width a_b = max(|r| + u_meas + u_unc) (item 6);
 * - the coverage check: a body whose inviscid drag lies more than a tenth
 *   outside its orifices sets nothing (item 3);
 * - the floor of a seen set from its published integrated figures (section
 *   5, condition (a)): a lower limit only;
 * - the allowance at a case: the largest half-width or floor of every box
 *   (+-0.05 Mach, +-0.25 calibers, same family) that contains it, the union
 *   of boxes and never their hull (4.4); none outside every box;
 * - the nose's band in the total: symmetric, D (1 - a) - n to D (1 + a) + n
 *   (4.3, the sign rule).
 *
 * All lengths are in body diameters; the pressure coefficients are on the
 * free-stream dynamic pressure; drags are on the base area pi R^2.
 */

/** The nose families of 0022 section 4.4; a blunted variant is its own family. */
export type NoseFamily =
  | 'cone'
  | 'tangent ogive'
  | 'secant ogive'
  | 'parabolic'
  | 'ellipsoid'
  | 'haack'
  | 'power series'
  | `blunted ${string}`;

/** One orifice of one reading: its station and every plausible reading of its cell. */
export interface ReadingStation {
  /** Distance from the tip, in body diameters. */
  readonly x: number;
  readonly cp: number;
  /** Other plausible readings of an ambiguous cell (0022 section 4.2). */
  readonly alternatives?: readonly number[];
}

/** One reading of one table or figure at one Mach number. */
export interface Reading {
  /** Who read it and when, or where it is typed. */
  readonly label: string;
  readonly stations: readonly ReadingStation[];
}

/** One measured body at one Mach number, with its inviscid solution. */
export interface MeasuredCase {
  readonly id: string;
  readonly family: NoseFamily;
  /** Nose length in calibers (body diameters). */
  readonly fineness: number;
  readonly mach: number;
  /** The tunnel Reynolds number as the report states it, for the label (4.4). */
  readonly reynolds: string;
  /** Nose radius at x (body diameters), from the tip (0) to the shoulder (fineness). */
  readonly radius: (x: number) => number;
  /** The converged inviscid Cp on the surface at x, for the report's body and Mach number. */
  readonly inviscidCp: (x: number) => number;
  /** The report's stated uncertainty of each Cp (4.3 item 5). */
  readonly cpUncertainty: number;
  /**
   * The inviscid solution's own numerical band in Cp at the stations (the
   * largest per-station band of 0014 10.7 (y) item 6 (d)), entering as the
   * term u_num beside u_meas, over the same bias area (0022 section 8 item
   * 10); 0 or absent where the solution is exact to far below e.
   */
  readonly inviscidUncertainty?: number;
  readonly readings: readonly Reading[];
  /** Seen before registration (0014 10.7 (w) item 3): widening only, never a test. */
  readonly seen: boolean;
  /**
   * The measure (0022 section 8 item 10, the dated rule of 2026-10-24):
   * 'ratio' (the default), r = D_meas / D_inv - 1 with u relative to D_inv;
   * or 'absolute', d = D_meas - D_inv in CD on the base area with u in the
   * same units, for rows below MEASURE_BOUNDARY_MACH, where the inviscid
   * nose drag is near zero and the ratio is ill-conditioned.
   */
  readonly measure?: Measure;
}

export type Measure = 'ratio' | 'absolute';
/** 0022 section 8 item 10: rows at indicated Mach below this take the absolute measure. */
export const MEASURE_BOUNDARY_MACH = 1;
export function measureFor(mach: number): Measure {
  return mach < MEASURE_BOUNDARY_MACH ? 'absolute' : 'ratio';
}

/** 4.3 item 3: a body whose inviscid drag lies more than this share outside its orifices sets nothing. */
export const COVERAGE_LIMIT = 0.1;
/** 4.4: the half-sides of a measured case's box. */
export const BOX_MACH = 0.05;
export const BOX_FINENESS = 0.25;
/** Steps of the fine quadrature of the inviscid solution over the stretches outside the orifices. */
const FINE_STEPS = 4000;

/** One reading with one choice of every ambiguous cell, through 4.3 items 2 to 5. */
export interface Evaluation {
  readonly reading: string;
  /** The value taken at each nose station, in station order. */
  readonly cps: readonly number[];
  readonly measuredDrag: number;
  readonly inviscidDrag: number;
  /** r = D_meas / D_inv - 1 (ill-conditioned where D_inv is near zero; the absolute measure uses d). */
  readonly r: number;
  /** d = D_meas - D_inv, in CD on the base area. */
  readonly difference: number;
  /** In the measure's units: relative to D_inv for 'ratio', CD for 'absolute'. */
  readonly uMeas: number;
  readonly uUnc: number;
  /** u_num: the inviscid solution's numerical band over the bias area, in the measure's units. */
  readonly uNum: number;
  /** |r| + u_meas + u_unc ('ratio'), or |d| + u_meas + u_unc ('absolute'), in the measure's units. */
  readonly halfWidth: number;
  /** The largest |Cp_meas - Cp_inv| over the stations. */
  readonly largestStationDifference: number;
}

export interface CaseResult {
  readonly id: string;
  readonly family: NoseFamily;
  readonly fineness: number;
  readonly mach: number;
  readonly reynolds: string;
  readonly seen: boolean;
  readonly measure: Measure;
  /** Nose stations used (0 < x <= fineness), in order. */
  readonly stations: readonly number[];
  /** The inviscid drag of the whole nose, by the fine quadrature. */
  readonly inviscidNoseDrag: number;
  /** Share of that drag outside the orifices (ahead of the first, behind the last). */
  readonly uncoveredShare: number;
  /** Covered fraction of the base area, (r(x_last)^2 - r(x_first)^2) / R^2 (u_unc's complement). */
  readonly coveredArea: number;
  /**
   * The fraction of the base area a common bias acts on, (R^2 - r(x_first)^2) / R^2:
   * from the first orifice to the shoulder, since the value held behind the
   * last orifice carries the same bias (u_meas).
   */
  readonly biasArea: number;
  /**
   * Whether the body sets anything: uncoveredShare <= COVERAGE_LIMIT for the
   * ratio measure; for the absolute measure the uncovered fraction of the
   * base area (1 - coveredArea) <= COVERAGE_LIMIT, since the share of a
   * near-zero drag means nothing.
   */
  readonly sets: boolean;
  readonly evaluations: readonly Evaluation[];
  /** a_b: the largest half-width over the evaluations; null when the body sets nothing. */
  readonly halfWidth: number | null;
}

/** Integral of f over x in [a, b] against d(r^2), by the midpoint rule on n steps. */
function integrateAgainstAreaFine(
  f: (x: number) => number,
  radius: (x: number) => number,
  a: number,
  b: number,
  n = FINE_STEPS,
): number {
  if (!(b > a)) return 0;
  let sum = 0;
  let r0 = radius(a);
  const h = (b - a) / n;
  for (let i = 0; i < n; i++) {
    const x1 = a + (i + 1) * h;
    const r1 = radius(x1);
    sum += f(a + (i + 0.5) * h) * (r1 * r1 - r0 * r0);
    r0 = r1;
  }
  return sum;
}

/** Every combination of the stations' readings (an ambiguous cell taken each way). */
function combinations(stations: readonly ReadingStation[]): number[][] {
  let out: number[][] = [[]];
  for (const s of stations) {
    const options = [s.cp, ...(s.alternatives ?? [])];
    const next: number[][] = [];
    for (const c of out) for (const v of options) next.push([...c, v]);
    out = next;
    if (out.length > 1 << 16) throw new RangeError('too many ambiguous cells to enumerate');
  }
  return out;
}

/**
 * The like-for-like nose drag of 4.3 item 2 for station values cps: the
 * trapezoid rule in r^2 between stations; from the tip to the first
 * station the inviscid solution's own integral (the same for measured and
 * inviscid, so it carries no difference); from the last station to the
 * shoulder the last station's value held. On the base area (divided by
 * R^2).
 */
function stationDrag(
  xs: readonly number[],
  cps: readonly number[],
  tipPart: number,
  radius: (x: number) => number,
  L: number,
): number {
  const R2 = radius(L) ** 2;
  let sum = tipPart;
  for (let i = 0; i + 1 < xs.length; i++) {
    const ra = radius(xs[i]!);
    const rb = radius(xs[i + 1]!);
    sum += 0.5 * (cps[i]! + cps[i + 1]!) * (rb * rb - ra * ra);
  }
  const rl = radius(xs[xs.length - 1]!);
  sum += cps[cps.length - 1]! * (R2 - rl * rl);
  return sum / R2;
}

/** 0022 section 4.3, items 1 to 6, for one measured body at one Mach number. */
export function evaluateCase(c: MeasuredCase): CaseResult {
  const measure: Measure = c.measure ?? 'ratio';
  const L = c.fineness;
  const R2 = c.radius(L) ** 2;
  if (c.readings.length === 0) throw new RangeError(`${c.id}: no reading`);
  let stations: number[] | null = null;
  const evaluations: Evaluation[] = [];
  let shareAndArea: {
    share: number;
    area: number;
    biasArea: number;
    full: number;
    tip: number;
  } | null = null;
  for (const reading of c.readings) {
    // Item 1: the orifices on the nose, from the tip to the shoulder.
    const onNose = reading.stations
      .filter((s) => s.x > 0 && s.x <= L + 1e-12)
      .sort((a, b) => a.x - b.x);
    if (onNose.length < 2) throw new RangeError(`${c.id}: fewer than two stations on the nose`);
    const xs = onNose.map((s) => s.x);
    if (stations === null) stations = xs;
    else if (xs.length !== stations.length || xs.some((x, i) => Math.abs(x - stations![i]!) > 1e-9))
      throw new RangeError(`${c.id}: the readings disagree on the stations`);
    if (shareAndArea === null) {
      const full = integrateAgainstAreaFine(c.inviscidCp, c.radius, 0, L) / R2;
      const tip = integrateAgainstAreaFine(c.inviscidCp, c.radius, 0, xs[0]!);
      const aft = integrateAgainstAreaFine(c.inviscidCp, c.radius, xs[xs.length - 1]!, L);
      const share =
        Math.abs(full) > 0 ? (Math.abs(tip) + Math.abs(aft)) / R2 / Math.abs(full) : Infinity;
      const rf = c.radius(xs[0]!);
      const rl = c.radius(xs[xs.length - 1]!);
      shareAndArea = {
        share,
        area: (rl * rl - rf * rf) / R2,
        biasArea: (R2 - rf * rf) / R2,
        full,
        tip,
      };
    }
    const { area, biasArea, tip } = shareAndArea;
    const inv = xs.map((x) => c.inviscidCp(x));
    const inviscidDrag = stationDrag(xs, inv, tip, c.radius, L);
    for (const cps of combinations(onNose)) {
      const measuredDrag = stationDrag(xs, cps, tip, c.radius, L);
      const r = measuredDrag / inviscidDrag - 1;
      const difference = measuredDrag - inviscidDrag;
      const largest = Math.max(...cps.map((v, i) => Math.abs(v - inv[i]!)));
      // The ratio measure divides by D_inv; the absolute one does not.
      const over = measure === 'ratio' ? Math.abs(inviscidDrag) : 1;
      const uMeas = (c.cpUncertainty * biasArea) / over;
      const uUnc = ((1 - area) * largest) / over;
      const uNum = ((c.inviscidUncertainty ?? 0) * biasArea) / over;
      evaluations.push({
        reading: reading.label,
        cps,
        measuredDrag,
        inviscidDrag,
        r,
        difference,
        uMeas,
        uUnc,
        uNum,
        halfWidth: (measure === 'ratio' ? Math.abs(r) : Math.abs(difference)) + uMeas + uUnc + uNum,
        largestStationDifference: largest,
      });
    }
  }
  const { share, area, biasArea, full } = shareAndArea!;
  const sets = measure === 'ratio' ? share <= COVERAGE_LIMIT : 1 - area <= COVERAGE_LIMIT;
  return {
    id: c.id,
    family: c.family,
    fineness: c.fineness,
    mach: c.mach,
    reynolds: c.reynolds,
    seen: c.seen,
    measure,
    stations: stations!,
    inviscidNoseDrag: full,
    uncoveredShare: share,
    coveredArea: area,
    biasArea,
    sets,
    evaluations,
    halfWidth: sets ? Math.max(...evaluations.map((e) => e.halfWidth)) : null,
  };
}

/**
 * The floor of a seen set (0022 section 5, condition (a)): the published
 * integrated difference, the larger end of its range, plus the stated Cp
 * uncertainty over the published inviscid drag. A lower limit only.
 */
export function publishedFloor(
  measured: readonly [number, number],
  inviscid: number,
  cpUncertainty: number,
): number {
  const r = Math.max(Math.abs(measured[0] / inviscid - 1), Math.abs(measured[1] / inviscid - 1));
  return r + cpUncertainty / inviscid;
}

/** A measured case's box (4.4): its half-width and, for a seen set with a published figure, its floor. */
export interface Box {
  readonly id: string;
  readonly family: NoseFamily;
  readonly fineness: number;
  readonly mach: number;
  readonly reynolds: string;
  readonly seen: boolean;
  /** The measure of halfWidth: relative to the nose term ('ratio') or CD on the base area ('absolute'). */
  readonly measure: Measure;
  /** a_b in the measure's units, or null when the body set nothing (4.3 item 3). */
  readonly halfWidth: number | null;
  /** The published floor (section 5), or null. */
  readonly floor: number | null;
}

export function boxOf(result: CaseResult, floor: number | null = null): Box {
  return {
    id: result.id,
    family: result.family,
    fineness: result.fineness,
    mach: result.mach,
    reynolds: result.reynolds,
    seen: result.seen,
    measure: result.measure,
    halfWidth: result.halfWidth,
    floor,
  };
}

/** Whether a box contains a case: the same family, within its half-sides (4.4). */
export function boxContains(box: Box, family: NoseFamily, fineness: number, mach: number): boolean {
  const eps = 1e-12;
  return (
    box.family === family &&
    Math.abs(mach - box.mach) <= BOX_MACH + eps &&
    Math.abs(fineness - box.fineness) <= BOX_FINENESS + eps
  );
}

export interface Allowance {
  /** The half-width a, relative to the nose term, from the ratio boxes (0 if none). */
  readonly halfWidth: number;
  /**
   * The half-width in CD on the base area from the absolute boxes (0 if
   * none). Where a box of each measure contains the case, the band at a
   * nose term D is the wider of halfWidth x D and this (noseBand).
   */
  readonly absolute: number;
  /** The boxes that contain the case and carry a value. */
  readonly boxes: readonly Box[];
  /** True when every one of those boxes is a seen set's: the label says so (section 5 (c)). */
  readonly seenOnly: boolean;
}

/**
 * The allowance at a case (4.4): the largest of the half-widths and floors
 * of every box that contains it, the floor a lower limit only; null outside
 * every box, where the nose stays "numerical error only".
 */
export function allowanceAt(
  boxes: readonly Box[],
  family: NoseFamily,
  fineness: number,
  mach: number,
): Allowance | null {
  const inside = boxes.filter(
    (b) => boxContains(b, family, fineness, mach) && (b.halfWidth !== null || b.floor !== null),
  );
  if (inside.length === 0) return null;
  // A published floor (section 5) is relative to the nose term, so it
  // enters the ratio boxes only; an absolute box carries its half-width alone.
  const widest = (measure: Measure) =>
    Math.max(
      0,
      ...inside
        .filter((b) => b.measure === measure)
        .map((b) => Math.max(b.halfWidth ?? 0, measure === 'ratio' ? (b.floor ?? 0) : 0)),
    );
  return {
    halfWidth: widest('ratio'),
    absolute: widest('absolute'),
    boxes: inside,
    seenOnly: inside.every((b) => b.seen),
  };
}

/**
 * The nose's band in the total (4.3, the sign rule; 0008 section 6.3):
 * symmetric, the allowance on the nose term and the numerical band n
 * beside it, both added linearly.
 */
export function noseBand(
  drag: number,
  allowance: number | Pick<Allowance, 'halfWidth' | 'absolute'>,
  numerical: number,
): { low: number; high: number } {
  // 0022 section 8 item 10: in a box mixing the two measures, whichever
  // form gives the wider band in CD at this nose term.
  const a =
    typeof allowance === 'number'
      ? allowance * Math.abs(drag)
      : Math.max(allowance.halfWidth * Math.abs(drag), allowance.absolute);
  return { low: drag - a - numerical, high: drag + a + numerical };
}
