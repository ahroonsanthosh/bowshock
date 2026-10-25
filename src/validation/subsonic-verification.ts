/**
 * The verification of the transonic solver (design record 0013) below Mach
 * 1 and near Mach 1, as 0014 section 10.7 (y) registers it before any such
 * value is looked at: the rungs, the quantities, the references, the
 * tolerances and the pass or fail rules. Nothing here reads a measured
 * value: the inputs are the solver's own grids, the exact results of
 * inviscid theory, and (when the owner runs it) an independent code's
 * numbers.
 *
 * The references (0014 10.7 (y), item 4):
 * - R1, exact: the nose pressure drag of a nose on a semi-infinite cylinder
 *   in shock-free subsonic inviscid flow is zero (the momentum balance on a
 *   sphere pierced by the body; Lagally's theorem gives the same; checked on
 *   the Rankine half-body, whose Cp runs from 1 at the nose to -1/3 and
 *   integrates to zero on the base area). It applies where the shoulder's
 *   sonic bubble carries no drag: at Mach 0.6 (bubble about 3e-4 radii by
 *   the convex-corner estimate); from 0.7 up it is an ordering check only.
 * - R2, exact: the total pressure is conserved on the cone wall ahead of the
 *   shoulder and of any supersonic wall cell. A loss d of p0 is a Cp error
 *   of d (p / p_inf) / (gamma M^2 / 2).
 * - R3, a level check that sets nothing: the linearised compressible
 *   axisymmetric solution (Goethert's rule on the von Karman-Moore source
 *   integral), in closed form here, a few percent of Cp from the Euler
 *   solution on a 7 deg cone.
 * - R5, an independent code (SU2, axisymmetric Euler, run by the owner),
 *   with its own grid family and a width limit, the only reference at
 *   Mach 0.9 to 0.99.
 */

import { gridConvergence, type ConvergenceEstimate } from '../verification/grid-convergence';
import { MEASURABILITY, type DomainAllowance } from '../verification/domain-allowance';
import { ORDER_TOLERANCE } from '../analysis/verified-drag';
import { NEAR_SONIC_LIMIT } from '../analysis/transonic-drag';

// ------------------------------------------------------------- constants

/**
 * The absolute scale S = max(|CD|, SUBSONIC_SCALE) that every relative
 * threshold of the grid solve (settling, geometric remainder, oscillation
 * bound, noise) and of the procedure uses below Mach 1, where the inviscid
 * drag is near zero and a relative threshold collapses. 0.01 is about a
 * tenth of the cone's drag at Mach 1 (0.093), so 1e-7 of it is 1e-9
 * absolute.
 */
export const SUBSONIC_SCALE = 0.01;
/** The rungs below Mach 1 (TN 4233's indicated Mach numbers, 14-foot or 2-foot rows). */
export const SUBSONIC_RUNGS = [0.6, 0.8, 0.901, 0.96, 0.991] as const;
/** The rung where R1 is exact (item 5 (b)). */
export const ZERO_DRAG_RUNG = 0.6;
/** The near-sonic rungs of the 800-radius test (addendum item 4). */
export const NEAR_SONIC_RUNGS = [1.001, 1.02, 1.041] as const;
/** The fourth far-field distance of that test, in radii as asked of the grid. */
export const FAR_800 = 800;
/** Item 5 (b): |CD_r8| at Mach 0.6 at most this plus the band (a tenth of 0022's measurement term, 2e-3). */
export const ZERO_DRAG_TOLERANCE = 2e-4;
/** Item 5 (d): the per-station Cp band on r = 8 at most this (a quarter of TN 4233's stated 0.002). */
export const CP_STATION_TOLERANCE = 5e-4;
/** Item 5 (d): above this a row stays out. */
export const CP_STATION_LIMIT = 2e-3;
/** Item 5 (e): the wall loss must fall across r = 2, 4, 8 at least at this observed order. */
export const WALL_LOSS_ORDER = 0.8;
/** Item 5 (b)'s exception: the loss behind the shoulder at least this many times the loss ahead. */
export const POCKET_LOSS_RATIO = 5;
/** Item 5 (g): R3 within this of Cp, or within LINEAR_CHECK_ABSOLUTE; sets nothing. */
export const LINEAR_CHECK_RELATIVE = 0.2;
export const LINEAR_CHECK_ABSOLUTE = 0.01;
/** Item 4 R5: the independent code's own band at most the larger of these. */
export const CODE_WIDTH_LIMIT_RELATIVE = 0.035;
export const CODE_WIDTH_LIMIT_ABSOLUTE = 5e-4;
/** Item 4 R5: the two finest values within the sum of the two bands plus this. */
export const CODE_COMPARISON_MARGIN = 5e-4;
/** Item 5 (c): CD(0.99) must lie below 0013's Mach 1.0 estimate by more than its band. */
export const SONIC_DRAG_ESTIMATE = 0.0932;
/** Item 6 (e): below this deviation of p0 on r = 8 the order test is not required (far below the tolerance). */
export const WALL_LOSS_ORDER_FLOOR = 1e-6;
/** Item 6 (b): the procedure's own band at Mach 0.6 must be at most the tolerance, or the pass shows nothing. */
export const ZERO_DRAG_BAND_CAP = ZERO_DRAG_TOLERANCE;
/** The subsonic absolute floor is this times the larger of |CD_r8| and |extrapolated| at the zero-drag rung. */
export const FLOOR_FACTOR = 2;
/** 0022's dated rule: rows at indicated Mach below this use the absolute measure. */
export const MEASURE_BOUNDARY_MACH = 1;

export function subsonicScale(drag: number): number {
  return Math.max(Math.abs(drag), SUBSONIC_SCALE);
}

/**
 * R2: the largest wall loss of total pressure (as a fraction of p0) that
 * keeps the Cp error within CP_STATION_TOLERANCE at this Mach number, at a
 * wall pressure of pressureRatio times the free stream's.
 */
export function wallLossTolerance(mach: number, pressureRatio: number, gamma = 1.4): number {
  return (CP_STATION_TOLERANCE * 0.5 * gamma * mach * mach) / pressureRatio;
}

/** The isentropic total pressure over the static one at Mach m. */
export function totalPressureRatio(mach: number, gamma = 1.4): number {
  return (1 + 0.5 * (gamma - 1) * mach * mach) ** (gamma / (gamma - 1));
}

// -------------------------------------------- R3: the linearised solution

/**
 * The linearised compressible axisymmetric solution for a cone-cylinder
 * (semiapex tangent tau, nose length L in body radii, base radius 1) in a
 * subsonic stream: the source distribution f(xi) = U tau^2 xi on the cone,
 * none on the cylinder, with the subsonic kernel 1 / sqrt((x - xi)^2 +
 * beta^2 r^2), beta^2 = 1 - M^2 (Goethert's rule on the von Karman-Moore
 * integral). With eta = xi - x and b = beta r:
 *
 *   u = -(tau^2 / 2) [asinh(eta / b) - eta / s - x / s]  from -x to L - x,
 *   v =  (tau^2 / 2) beta^2 r [-1 / s + x eta / (b^2 s)]  from -x to L - x,
 *   s = sqrt(eta^2 + b^2),
 *
 * evaluated on the surface r = tau x, and Cp = -2 u - v^2 (the slender
 * body's second-order term kept; v = tau on the surface to O(tau^3)). A
 * level check only: its difference from the Euler solution is of second
 * order in tau, a few percent of Cp on a 7 deg cone.
 */
export function linearisedConeCylinderCp(
  tau: number,
  L: number,
  mach: number,
  x: number,
): { readonly u: number; readonly v: number; readonly cp: number } {
  if (!(mach > 0 && mach < 1)) throw new RangeError('the linearised solution is for Mach 0 to 1');
  if (!(x > 0 && x < L)) throw new RangeError('x must lie on the cone, 0 < x < L');
  const beta2 = 1 - mach * mach;
  const r = tau * x;
  const b = Math.sqrt(beta2) * r;
  const Fu = (eta: number) => {
    const s = Math.hypot(eta, b);
    return Math.asinh(eta / b) - eta / s - x / s;
  };
  const Fv = (eta: number) => {
    const s = Math.hypot(eta, b);
    return -1 / s + (x * eta) / (b * b * s);
  };
  const u = -(tau * tau * 0.5) * (Fu(L - x) - Fu(-x));
  const v = tau * tau * 0.5 * beta2 * r * (Fv(L - x) - Fv(-x));
  return { u, v, cp: -2 * u - v * v };
}

/**
 * The slender-body (inner) form of the same solution: the log form that
 * the source integral reduces to as tau goes to zero,
 * Cp = tau^2 [ln(4 (L - x) / (beta^2 tau^2 x)) - x / (L - x) - 2]. The
 * closed form above agrees with it to O(tau^4) (tested).
 */
export function slenderConeCylinderCp(tau: number, L: number, mach: number, x: number): number {
  const beta2 = 1 - mach * mach;
  return tau * tau * (Math.log((4 * (L - x)) / (beta2 * tau * tau * x)) - x / (L - x) - 2);
}

// --------------------------------------------------- station quantities

export interface WallPoint {
  /** Along the axis, in body radii. */
  readonly x: number;
  readonly cp: number;
}

/**
 * The wall Cp at x (body radii): linear between the wall faces' midpoints,
 * the first face's value ahead of it (the grid's tip).
 */
export function interpolateWall(wall: readonly WallPoint[], x: number): number {
  const pts = [...wall].sort((a, b) => a.x - b.x);
  if (pts.length === 0) throw new RangeError('no wall points');
  if (x <= pts[0]!.x) return pts[0]!.cp;
  let k = 0;
  while (k < pts.length - 2 && pts[k + 1]!.x < x) k++;
  const a = pts[k]!;
  const b = pts[k + 1]!;
  return a.cp + ((b.cp - a.cp) * (x - a.x)) / (b.x - a.x);
}

export type PointwiseBand =
  | { readonly kind: 'monotone'; readonly band: number; readonly order: number }
  | { readonly kind: 'oscillatory'; readonly band: number }
  | { readonly kind: 'not-shrinking'; readonly band: number }
  | { readonly kind: 'too-small'; readonly band: number };

/**
 * A per-station band from three grids (coarse to fine, r = 2, 4, 8):
 * Richardson's index on the finest change at the observed order capped at
 * 2 (as 0005), the range of the three where they oscillate, and twice the
 * noise where the changes are below it. Where the changes do not shrink
 * there is no band (0005): the kind 'not-shrinking' carries the sum of the
 * two changes for the record only, and judgeRung fails (d) on it.
 */
export function pointwiseBand(values: readonly number[], noise: number): PointwiseBand {
  if (values.length < 3) throw new RangeError('three grids are needed');
  const [c, m, f] = values.slice(-3) as [number, number, number];
  const e21 = m - f;
  const e32 = c - m;
  if (Math.abs(e21) <= noise && Math.abs(e32) <= noise)
    return { kind: 'too-small', band: 2 * noise };
  if (e21 * e32 < 0) return { kind: 'oscillatory', band: Math.max(c, m, f) - Math.min(c, m, f) };
  if (!(Math.abs(e32) > Math.abs(e21)))
    return { kind: 'not-shrinking', band: Math.abs(e21) + Math.abs(e32) };
  const order = Math.min(2, Math.log2(Math.abs(e32 / e21)));
  return { kind: 'monotone', band: (1.25 * Math.abs(e21)) / (2 ** order - 1), order };
}

/**
 * The procedure of 0005 on a family whose values may be near zero: its
 * relative noise acts on the scale S = max(largest |value|, SUBSONIC_SCALE)
 * (the procedure's `scale` option), never on a value that collapses.
 */
export function gridConvergenceScaled(
  values: readonly number[],
  noise: number,
): ConvergenceEstimate {
  const scale = Math.max(...values.map(Math.abs), SUBSONIC_SCALE);
  return gridConvergence(values, { noise, orderTolerance: ORDER_TOLERANCE, scale });
}

/**
 * (y) item 9: the per-station Cp allowance of a domain (the far boundaries,
 * and likewise the cylinder). A uniform shift of Cp by d is exactly d in
 * CD on the base area, so each station takes the drag's allowance plus a
 * non-uniformity term: T times the station's deviation from the mean of
 * the changes between the family's own domain and the larger one (base
 * grids), plus the measurability level m (so m is counted twice, once
 * inside the drag's allowance and once here: on the safe side, noted in
 * the revision of (y)).
 */
export function stationCpAllowance(
  own: readonly number[],
  larger: readonly number[],
  dragAllowance: number,
  tail: number,
  measurability: number,
): number[] {
  if (own.length !== larger.length || own.length === 0) throw new RangeError('stations differ');
  const changes = own.map((v, j) => larger[j]! - v);
  const mean = changes.reduce((s, v) => s + v, 0) / changes.length;
  return changes.map((d) => dragAllowance + tail * Math.abs(d - mean) + measurability);
}

// ------------------------------------------------------------ the rungs

export interface WallLoss {
  /**
   * Largest deviation of the wall's total pressure from the free stream's
   * (fraction of p0, either way) on the cone from the first station (x/l
   * 0.082, the tip's spike excluded) to x/l 0.9, and ahead of any
   * supersonic wall cell.
   */
  readonly ahead: number;
  /** That deviation with its sign: positive a loss, negative a gain. */
  readonly aheadSigned?: number;
  /** The wall pressure over the free stream's where that loss is largest. */
  readonly pressureRatio: number;
  /** Loss on the cylinder wall 3 calibers behind the shoulder. */
  readonly behind: number;
  /** Supersonic wall cells on this grid. */
  readonly supersonicCells: number;
  /** The largest wall Mach number. */
  readonly maxMach: number;
}

export interface RungLevel {
  readonly refinement: number;
  readonly drag: number;
  /** Relative to the scale S (the solve's own). */
  readonly noise: number;
  /** Cp at the stations, finest grids only need r = 2, 4, 8. */
  readonly stationCp: readonly number[];
  readonly loss: WallLoss;
}

export interface RungInput {
  readonly mach: number;
  readonly levels: readonly RungLevel[];
  readonly farField: DomainAllowance;
  readonly cylinder: DomainAllowance;
  /** The per-station far-field allowance (stationCpAllowance), or null if the rule refused. */
  readonly stationFar: readonly number[] | null;
  /** The per-station cylinder (outlet) allowance, or null if the rule refused. */
  readonly stationCylinder: readonly number[] | null;
  /** The subsonic absolute floor set at the zero-drag rung, or null at that rung. */
  readonly floor: number | null;
  /** R3 at the stations, for the level check; null at Mach 1 and above, where R3 is not defined (then (g) is not applicable). */
  readonly linear: readonly number[] | null;
  /** R5, if run: the independent code's finest value and its own band (null where its levels give none). */
  readonly code?:
    { readonly drag: number; readonly band: number | null; readonly levels: number } | undefined;
}

export type Criterion =
  | { readonly status: 'pass' | 'fail' | 'reported'; readonly detail: string }
  | { readonly status: 'not-applicable'; readonly detail: string };

export interface RungVerdict {
  readonly mach: number;
  readonly value: number;
  readonly estimate: ConvergenceEstimate;
  /** The band: procedure + floor + far field + cylinder (absolute). */
  readonly band: number | null;
  readonly parts: {
    readonly grids: number | null;
    readonly floor: number;
    readonly farField: number | null;
    readonly cylinder: number | null;
  };
  readonly stationBands: readonly PointwiseBand[];
  readonly criteria: Readonly<Record<'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'r5', Criterion>>;
  /** The floor this rung sets (the zero-drag rung only). */
  readonly floorSet: number | null;
  readonly verdict: 'pass' | 'pass, band too wide for the use' | 'fail';
}

/** Item 5 (a) to (g) and R5 on one rung below Mach 1 (the ordering check (c) is across rungs: orderingCheck). */
export function judgeRung(input: RungInput): RungVerdict {
  const { mach, levels } = input;
  if (levels.length < 4) throw new RangeError('four grids are needed');
  const finest = levels[levels.length - 1]!;
  const value = finest.drag;
  const noise = Math.max(...levels.map((l) => l.noise));
  const scale = Math.max(...levels.map((l) => Math.abs(l.drag)), SUBSONIC_SCALE);
  const estimate = gridConvergenceScaled(
    levels.map((l) => l.drag),
    noise,
  );
  const grids = estimate.kind === 'unresolved' ? null : estimate.uncertainty;
  const c_a: Criterion =
    estimate.kind === 'unresolved'
      ? { status: 'fail', detail: `the procedure gives no band: ${estimate.reason}` }
      : {
          status: 'pass',
          detail: `${estimate.kind}, band ${estimate.uncertainty.toExponential(2)}`,
        };
  const far = input.farField.kind === 'refused' ? null : input.farField.allowance;
  const cyl = input.cylinder.kind === 'refused' ? null : input.cylinder.allowance;
  const c_f: Criterion =
    far === null || cyl === null
      ? {
          status: 'fail',
          detail:
            `the allowance rule refused: ${far === null ? `far field (${(input.farField as { reason: string }).reason})` : ''} ${cyl === null ? `cylinder (${(input.cylinder as { reason: string }).reason})` : ''}`.trim(),
        }
      : {
          status: 'pass',
          detail: `far field ${input.farField.kind} ${far.toExponential(2)}, cylinder ${input.cylinder.kind} ${cyl.toExponential(2)}`,
        };
  const atZeroRung = Math.abs(mach - ZERO_DRAG_RUNG) < 1e-9;
  let c_b: Criterion;
  let c_r5: Criterion;
  let floorSet: number | null = null;
  let floor = input.floor ?? 0;
  const band = grids === null || far === null || cyl === null ? null : grids + floor + far + cyl;

  // (b) the exact zero-drag check at Mach 0.6; the floor it sets.
  if (atZeroRung) {
    if (band === null) c_b = { status: 'fail', detail: 'no band to test the exact value against' };
    else {
      const miss = Math.abs(value);
      const extrapolated = estimate.kind === 'monotone' ? Math.abs(estimate.extrapolated) : miss;
      const limit = ZERO_DRAG_TOLERANCE + band;
      const pocket =
        finest.loss.supersonicCells > 0 &&
        finest.loss.behind >= POCKET_LOSS_RATIO * finest.loss.ahead;
      if (grids! > ZERO_DRAG_BAND_CAP) {
        c_b = {
          status: 'fail',
          detail: `the procedure's band ${grids!.toExponential(2)} exceeds the cap ${ZERO_DRAG_BAND_CAP}: a pass could not show the error is at most the tolerance`,
        };
      } else if (miss <= limit) {
        floorSet = FLOOR_FACTOR * Math.max(miss, extrapolated);
        floor = floorSet;
        c_b = {
          status: 'pass',
          detail: `|CD_r8| ${miss.toExponential(2)} within ${ZERO_DRAG_TOLERANCE} + band ${band.toExponential(2)}; floor set at ${floorSet.toExponential(2)}`,
        };
      } else {
        c_b = {
          status: 'fail',
          detail: `|CD_r8| ${miss.toExponential(2)} exceeds ${ZERO_DRAG_TOLERANCE} + band ${band.toExponential(2)}${pocket ? '; the pocket diagnostic shows the drag is the bubble’s (check not applicable; the rung still fails for want of a reference; the owner decides by a new dated entry)' : ''}`,
        };
      }
    }
  } else {
    c_b = { status: 'not-applicable', detail: 'the exact zero-drag check is Mach 0.6’s' };
  }
  const fullBand = band === null ? null : grids! + floor + far! + cyl!;

  // (c) sign: a confidently negative drag is numerical.
  const c_c: Criterion =
    fullBand === null
      ? { status: 'fail', detail: 'no band' }
      : value + fullBand >= 0
        ? {
            status: 'pass',
            detail: `CD_r8 + band = ${(value + fullBand).toExponential(2)} >= 0 (ordering across rungs: orderingCheck)`,
          }
        : {
            status: 'fail',
            detail: `CD_r8 + band = ${(value + fullBand).toExponential(2)} < 0: a negative drag beyond the band`,
          };

  // (d) the stations.
  const three = levels.slice(-3);
  const stations = finest.stationCp.length;
  const stationBands: PointwiseBand[] = [];
  for (let j = 0; j < stations; j++) {
    stationBands.push(
      pointwiseBand(
        three.map((l) => l.stationCp[j]!),
        noise * scale,
      ),
    );
  }
  const stationTotal = stationBands.map(
    (b, j) =>
      b.band +
      (input.stationFar === null ? Infinity : input.stationFar[j]!) +
      (input.stationCylinder === null ? Infinity : input.stationCylinder[j]!) +
      floor,
  );
  const worst = Math.max(...stationTotal);
  const notShrinking = stationBands.filter((b) => b.kind === 'not-shrinking').length;
  const c_d: Criterion =
    notShrinking > 0
      ? {
          status: 'fail',
          detail: `${notShrinking} station(s) whose changes do not shrink under refinement: no band (0005)`,
        }
      : worst <= CP_STATION_TOLERANCE
        ? {
            status: 'pass',
            detail: `largest station band ${worst.toExponential(2)} within ${CP_STATION_TOLERANCE}`,
          }
        : worst <= CP_STATION_LIMIT
          ? {
              status: 'reported',
              detail: `largest station band ${worst.toExponential(2)} above ${CP_STATION_TOLERANCE}: verified, band too wide for the use; it enters 0022 as u_num`,
            }
          : {
              status: 'fail',
              detail: `largest station band ${worst.toExponential(2)} above ${CP_STATION_LIMIT}: the rows stay out`,
            };

  // (e) the wall loss and its order.
  const lossTol = wallLossTolerance(mach, finest.loss.pressureRatio);
  const losses = three.map((l) => l.loss.ahead);
  const lossOrder =
    losses[1]! > 0 && losses[2]! > 0 ? Math.log2(losses[0]! / losses[1]!) : Infinity;
  const lossOrder2 = losses[2]! > 0 ? Math.log2(losses[1]! / losses[2]!) : Infinity;
  const orderOk =
    finest.loss.ahead <= WALL_LOSS_ORDER_FLOOR ||
    Math.min(lossOrder, lossOrder2) >= WALL_LOSS_ORDER;
  const c_e: Criterion =
    finest.loss.ahead <= lossTol && orderOk
      ? {
          status: 'pass',
          detail: `loss ahead ${finest.loss.ahead.toExponential(2)} of p0 within ${lossTol.toExponential(2)}, orders ${lossOrder.toFixed(2)} and ${lossOrder2.toFixed(2)}`,
        }
      : {
          status: 'fail',
          detail: `loss ahead ${finest.loss.ahead.toExponential(2)} of p0 (limit ${lossTol.toExponential(2)}), orders ${lossOrder.toFixed(2)} and ${lossOrder2.toFixed(2)} (at least ${WALL_LOSS_ORDER} needed)`,
        };

  // (g) R3, reported; it sets nothing, and is defined below Mach 1 only
  // ((y) revision item 19: not applicable at Mach 1 and above).
  const linear = input.linear;
  let c_g: Criterion;
  if (mach >= 1 || linear === null) {
    c_g = { status: 'not-applicable', detail: 'R3 is defined below Mach 1 only (sets nothing)' };
  } else {
    const misses = finest.stationCp.map((cp, j) => Math.abs(cp - linear[j]!));
    const outside = misses.filter(
      (m, j) => m > LINEAR_CHECK_RELATIVE * Math.abs(linear[j]!) && m > LINEAR_CHECK_ABSOLUTE,
    ).length;
    c_g = {
      status: 'reported',
      detail: `R3: largest station difference ${Math.max(...misses).toExponential(2)}; ${outside} station(s) outside the gross-error check (sets nothing)`,
    };
  }

  // R5, the independent code.
  if (input.code === undefined) {
    c_r5 = { status: 'not-applicable', detail: 'not run' };
  } else if (input.code.band === null) {
    c_r5 = { status: 'not-applicable', detail: 'the code’s levels give no band: not a reference' };
  } else if (grids === null) {
    c_r5 = { status: 'fail', detail: 'no procedure band to compare' };
  } else {
    const widthLimit = Math.max(
      CODE_WIDTH_LIMIT_ABSOLUTE,
      CODE_WIDTH_LIMIT_RELATIVE * Math.abs(input.code.drag),
    );
    if (input.code.band > widthLimit) {
      c_r5 = {
        status: 'not-applicable',
        detail: `the code’s band ${input.code.band.toExponential(2)} exceeds its width limit ${widthLimit.toExponential(2)}: not a reference`,
      };
    } else {
      // Both codes share the domain, so only the procedure bands enter.
      const gap = Math.abs(value - input.code.drag);
      const limit = grids + input.code.band + CODE_COMPARISON_MARGIN;
      c_r5 =
        gap <= limit
          ? {
              status: 'pass',
              detail: `|CD - code| ${gap.toExponential(2)} within ${limit.toExponential(2)}`,
            }
          : {
              status: 'fail',
              detail: `|CD - code| ${gap.toExponential(2)} exceeds ${limit.toExponential(2)}`,
            };
    }
  }

  const criteria = { a: c_a, b: c_b, c: c_c, d: c_d, e: c_e, f: c_f, g: c_g, r5: c_r5 };
  const failed = Object.values(criteria).some((c) => c.status === 'fail');
  const verdict = failed
    ? 'fail'
    : c_d.status === 'reported'
      ? 'pass, band too wide for the use'
      : 'pass';
  return {
    mach,
    value,
    estimate,
    band: fullBand,
    parts: { grids, floor, farField: far, cylinder: cyl },
    stationBands,
    criteria,
    floorSet,
    verdict,
  };
}

/**
 * Item 5 (c) across rungs: CD must not fall as Mach rises, each pair within
 * the sum of its bands, and CD at the highest rung must lie below 0013's
 * Mach 1.0 estimate by more than its band.
 */
export interface OrderingViolation {
  readonly machs: readonly number[];
  readonly detail: string;
}

export function orderingCheck(
  rungs: readonly { readonly mach: number; readonly drag: number; readonly band: number }[],
  sonic = SONIC_DRAG_ESTIMATE,
): { readonly ok: boolean; readonly violations: readonly OrderingViolation[] } {
  const sorted = [...rungs].sort((a, b) => a.mach - b.mach);
  const violations: OrderingViolation[] = [];
  for (let k = 0; k + 1 < sorted.length; k++) {
    const lo = sorted[k]!;
    const hi = sorted[k + 1]!;
    if (hi.drag + hi.band + lo.band < lo.drag)
      violations.push({
        machs: [lo.mach, hi.mach],
        detail: `CD(${hi.mach}) = ${hi.drag.toExponential(3)} lies below CD(${lo.mach}) = ${lo.drag.toExponential(3)} by more than the bands`,
      });
  }
  const top = sorted[sorted.length - 1];
  // CD + band must lie below the Mach 1.0 estimate: the whole band under it.
  if (top !== undefined && top.mach < 1 && top.drag + top.band >= sonic)
    violations.push({
      machs: [top.mach],
      detail: `CD(${top.mach}) + band = ${(top.drag + top.band).toExponential(3)} is not below the Mach 1.0 estimate ${sonic}`,
    });
  return { ok: violations.length === 0, violations };
}

/** Item 6 (c): a violation fails every rung it names; the verdicts come back with (c) failed. */
export function applyOrdering(verdicts: readonly RungVerdict[]): RungVerdict[] {
  const check = orderingCheck(
    verdicts
      .filter((v) => v.band !== null)
      .map((v) => ({ mach: v.mach, drag: v.value, band: v.band! })),
  );
  return verdicts.map((v) => {
    const hits = check.violations.filter((x) => x.machs.some((m) => Math.abs(m - v.mach) < 1e-9));
    if (hits.length === 0) return v;
    return {
      ...v,
      criteria: {
        ...v.criteria,
        c: { status: 'fail', detail: `ordering: ${hits.map((h) => h.detail).join('; ')}` },
      },
      verdict: 'fail',
    };
  });
}

/**
 * (y) item 6: a rung that did not pass keeps the TN 4233 rows of its box,
 * +-BOX_MACH in Mach, out of (w)'s allowance. Every registered rung counts:
 * one judged 'fail' with its failed criteria; one not judged (not run, not
 * converged, waiting for the floor) with that reason, given in `pending`
 * or "not run" by default. Only a rung judged 'pass' or 'pass, band too
 * wide for the use' releases its box.
 */
export const BOX_MACH = 0.05;
export interface RowKeptOut {
  readonly mach: number;
  readonly rung: number;
  readonly reason: string;
}
export function rowsKeptOut(
  verdicts: readonly Pick<RungVerdict, 'mach' | 'verdict' | 'criteria'>[],
  rows: readonly number[],
  pending: readonly { readonly mach: number; readonly reason: string }[] = [],
  rungs: readonly number[] = SUBSONIC_RUNGS,
): RowKeptOut[] {
  const same = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  const blocking: { rung: number; reason: string }[] = [];
  for (const rung of rungs) {
    const v = verdicts.find((x) => same(x.mach, rung));
    if (v === undefined) {
      const why = pending.find((p) => same(p.mach, rung))?.reason ?? 'not run';
      blocking.push({ rung, reason: `rung Mach ${rung} not judged: ${why}` });
      continue;
    }
    if (v.verdict === 'fail') {
      const reasons = Object.entries(v.criteria)
        .filter(([, c]) => c.status === 'fail')
        .map(([k, c]) => `(${k}) ${c.detail}`)
        .join('; ');
      blocking.push({ rung, reason: `rung Mach ${rung} failed: ${reasons}` });
    }
  }
  const out: RowKeptOut[] = [];
  for (const mach of rows) {
    const hit = blocking.find((b) => Math.abs(mach - b.rung) <= BOX_MACH + 1e-9);
    if (hit !== undefined) out.push({ mach, rung: hit.rung, reason: hit.reason });
  }
  return out;
}

/**
 * The registered rung whose box (+-BOX_MACH) covers a Mach number, or null
 * where none does ((y) item 16 and its clarification of 2026-10-25: a row
 * that no rung covers is never released; TN 4233's row at 0.701 is one).
 */
export function rungCovering(
  mach: number,
  rungs: readonly number[] = SUBSONIC_RUNGS,
): number | null {
  return rungs.find((r) => Math.abs(mach - r) <= BOX_MACH + 1e-9) ?? null;
}

/**
 * (y) item 8: the rows at Mach 1.001 to 1.041 (the moved family, below
 * NEAR_SONIC_LIMIT) wait for the 800-radius test and for the results'
 * review; rows at 1.05 and above are the served family's and do not wait.
 * The reason a row is held, or null if it may be evaluated.
 */
export function nearSonicHold(
  mach: number,
  far800Pass: boolean | null,
  resultsReviewed: boolean,
  nearSonicLimit = 1.05,
): string | null {
  if (mach < 1 || mach >= nearSonicLimit) return null;
  if (far800Pass !== true)
    return far800Pass === null
      ? 'the 800-radius test of (y) item 8 has not run'
      : 'the 800-radius test of (y) item 8 failed: the moved family\u2019s allowance is withdrawn';
  if (!resultsReviewed) return 'the results of (y) are not yet reviewed (Y_RESULTS_REVIEWED)';
  return null;
}

/** What the evaluation records per row, as the row gate reads it. */
export interface RowResultSummary {
  readonly mach: number;
  /** The largest per-station band (grid + domain allowances + floor), the row's u_num in Cp. */
  readonly largestStationBand: number;
  /** Whether 6 (d) failed for the row (a station band above 2e-3, or a station without a band). */
  readonly stationFailed: boolean;
  readonly verdict: string;
}

/** What verify-subsonic.json carries for the row gate. */
export interface VerificationSummary {
  /** The solves it evaluated: the directory's name ('solves' or 'solves-gpu'). */
  readonly solvesTag: string;
  /** A hash of every solve file it read (solvesHash), so stale or swapped solves are refused. */
  readonly solvesHash: string;
  readonly keptOut: readonly { readonly mach: number; readonly reason: string }[];
  readonly far800Pass: boolean | null;
  readonly rowResults: readonly RowResultSummary[];
}

export type EngineKind = 'cpu' | 'gpu' | 'software' | 'unknown';

/**
 * Which engine a solve file records, from its own fields (never from the
 * directory it sits in): the CPU job writes `engine: 'CPU, ...'`, the GPU
 * kit `engine: 'GPU two-float ...'` with a `device`; a file with neither
 * is 'unknown' and is refused.
 */
export function engineKind(solve: {
  readonly engine?: string;
  readonly device?: unknown;
}): EngineKind {
  const e = (solve.engine ?? '').toLowerCase();
  if (solve.device !== undefined) {
    // A device record means a GPU run; one naming SwiftShader or a fallback
    // adapter is software rendering, never hardware (6 (h)).
    const d = JSON.stringify(solve.device).toLowerCase();
    const fallback =
      typeof solve.device === 'object' &&
      solve.device !== null &&
      (solve.device as { isFallbackAdapter?: unknown }).isFallbackAdapter === true;
    return d.includes('swiftshader') || fallback ? 'software' : 'gpu';
  }
  if (e.startsWith('gpu')) return 'gpu';
  if (e.startsWith('cpu')) return 'cpu';
  return 'unknown';
}

export interface RowGateInput {
  readonly mach: number;
  /** The solves blind-run-3 is evaluating: their directory's name and their hash now. */
  readonly solvesTag: string;
  readonly solvesHash: string;
  /** The engine this row's solve file records (engineKind), and the GPU kit's match record. */
  readonly engine: EngineKind;
  readonly gpuMatch: { readonly passed?: boolean; readonly software?: boolean } | null;
  readonly verification: VerificationSummary | null;
  readonly resultsReviewed: boolean;
}

export type RowGate =
  | { readonly allowed: true; readonly inviscidUncertainty: number; readonly note: string }
  | { readonly allowed: false; readonly reason: string };

/**
 * Every gate a TN 4233 row below Mach 1.078 passes before 0022's script
 * evaluates it, in one tested place ((y) items 6, 8 and 11 and 6 (h); the
 * re-check of 602d8f7):
 * 1. a solve file that records no engine is refused; a GPU solve needs the
 *    kit's match record passed on hardware (6 (h)), for every row;
 * 2. rows at NEAR_SONIC_LIMIT (Mach 1.05) and above (the served family)
 *    then pass, with u_num from the evaluation's per-row result where it
 *    exists;
 * 3. rows below it need the evaluation, made on these same solves (the
 *    same directory, the same hash), the results' review, not to be kept
 *    out by a rung, a registered rung's box covering them (item 16; the
 *    row at 0.701 has none), the 800-radius test where (y) item 8 applies, a judged
 *    per-row result whose own verdict is not 'fail' ((y) item 3: the rung
 *    rules apply per row, so an unresolved family, a negative drag, a wall
 *    loss or a station band failing refuses the row); then they pass with
 *    u_num = that row's largest station band.
 */
export function rowGate(input: RowGateInput): RowGate {
  const { mach, verification } = input;
  const same = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  if (input.engine === 'unknown')
    return { allowed: false, reason: '(y): the solve file records no engine; refused' };
  if (input.engine === 'software')
    return {
      allowed: false,
      reason:
        '(y) 6 (h): the solve file records a software adapter (SwiftShader or a fallback); refused',
    };
  if (
    input.engine === 'gpu' &&
    !(input.gpuMatch?.passed === true && input.gpuMatch.software !== true)
  )
    return {
      allowed: false,
      reason:
        '(y) 6 (h): the GPU kit\u2019s match test has not passed on hardware; no GPU row counts',
    };
  const row =
    verification !== null &&
    verification.solvesTag === input.solvesTag &&
    verification.solvesHash === input.solvesHash
      ? (verification.rowResults.find((r) => same(r.mach, mach)) ?? null)
      : null;
  if (mach >= NEAR_SONIC_LIMIT) {
    return {
      allowed: true,
      inviscidUncertainty: row?.largestStationBand ?? 0,
      note:
        row === null
          ? 'served family; no per-row result of (y) for these solves, u_num 0'
          : `served family; u_num ${row.largestStationBand.toExponential(2)} from (y)`,
    };
  }
  if (verification === null)
    return { allowed: false, reason: '(y): the verification (verify-subsonic) has not run' };
  if (verification.solvesTag !== input.solvesTag)
    return {
      allowed: false,
      reason: `(y): the verification evaluated ${verification.solvesTag}, not ${input.solvesTag}`,
    };
  if (verification.solvesHash !== input.solvesHash)
    return {
      allowed: false,
      reason:
        '(y): the solve files changed since the verification ran (hash mismatch); run it again',
    };
  const kept = verification.keptOut.find((r) => same(r.mach, mach));
  if (kept !== undefined) return { allowed: false, reason: `(y) item 6: ${kept.reason}` };
  if (rungCovering(mach) === null)
    return {
      allowed: false,
      reason: `(y) item 16: no registered rung\u2019s box (+-${BOX_MACH} Mach) covers Mach ${mach.toFixed(3)}; a row no rung verifies is not released`,
    };
  const near = nearSonicHold(mach, verification.far800Pass, input.resultsReviewed);
  if (near !== null) return { allowed: false, reason: `(y) item 8: ${near}` };
  if (mach < 1 && !input.resultsReviewed)
    return { allowed: false, reason: '(y): the results are not yet reviewed (Y_RESULTS_REVIEWED)' };
  if (row === null)
    return {
      allowed: false,
      reason: '(y): no judged per-row result for this row (not solved, not converged, or no floor)',
    };
  if (row.verdict === 'fail' || row.stationFailed)
    return {
      allowed: false,
      reason: row.stationFailed
        ? '(y) 6 (d) failed for this row: its station band is above 2e-3 or a station has no band'
        : '(y) item 3: the row\u2019s own verdict is a fail (its family, sign, wall loss or allowances), so it is refused as a rung would be',
    };
  return {
    allowed: true,
    inviscidUncertainty: row.largestStationBand,
    note: `u_num ${row.largestStationBand.toExponential(2)} from (y); row verdict ${row.verdict}`,
  };
}

/**
 * Addendum item 4: whether the moved family's allowance from 100.6, 224.2
 * and 408.7 radii contains C(800) - C(224.2); `m` is the measurability
 * level MEASURABILITY nu max|C| of the base grids.
 */
export function far800Contained(
  allowance: DomainAllowance,
  own: number,
  at800: number,
): { readonly contained: boolean; readonly change: number; readonly detail: string } {
  const change = at800 - own;
  if (allowance.kind === 'refused')
    return {
      contained: false,
      change,
      detail: `the rule refused (${allowance.reason}); the change to 800 radii is ${change.toExponential(3)}`,
    };
  const contained = Math.abs(change) <= allowance.allowance;
  return {
    contained,
    change,
    detail: `${allowance.kind} allowance ${allowance.allowance.toExponential(3)} (m = ${allowance.measurability.toExponential(2)}, ${MEASURABILITY} nu max|C|) against C(800) - C(224.2) = ${change.toExponential(3)}: ${contained ? 'contained' : 'NOT contained'}`,
  };
}
