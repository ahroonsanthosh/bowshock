/**
 * F2 of design record 0019 (section 3.2): the nose drag of a flat plate's
 * rounded leading edge (a semicircle of radius t/2 on parallel faces) at a
 * subsonic normal Mach number, "bounded, not measured" (0014 section 10.2).
 * No source measures this nose below M_n 1.0; the term is the midpoint of
 * two bounds whose orderings 0019 section 3.2 writes out, the band the
 * whole gap. On the normal dynamic pressure q_n and the frontal height t,
 * per unit span, as the measured term at M_n 1.0 and above
 * (`roundedLeadingEdgeDrag`, 0016):
 *
 * - the high end: the term at M_n 1.0 at its band's high end (CR-149372's
 *   node, modified Newtonian, the Reynolds-number allowance where the edge
 *   is outside CR-149372's Reynolds numbers, the sweep allowance), which the
 *   nose does not exceed at M_n 0.8 or below ((U1) to (U4));
 * - the low end: no drag on the nose (the half-body theorem, (L1) to (L3))
 *   less twice the trailing edge's linearised upstream influence: the
 *   trailing edge as an infinite swept line sink of the plate's thickness,
 *   at its own normal Mach number ((L4)); none where the trailing edge's
 *   normal Mach number is supersonic, linear theory giving it no upstream
 *   influence there.
 *
 * Refused where the argument does not reach ((L5), (U3)): a free stream
 * below Mach 1.06 (the body's base and the flow along it near sonic), a
 * normal Mach number above 0.8, a trailing edge whose normal Mach number is
 * inside the plate's transonic range, sweeps beyond 60 deg, and Reynolds
 * numbers outside the measured term's.
 *
 * NOT WIRED into the total, and served nowhere. The owner decided on
 * 2026-10-22 (0014 section 10.7 (o), superseding (k)'s item 1) that rounded
 * leading edges of flat plates below M_n 1.0 are refused until NASA TM X-653
 * is read; `roundedLeadingEdgeDrag` refuses them with that reason, and a test
 * pins that nothing under src/ imports this module. It is kept as a recorded
 * candidate: if TM X-653 measures such an edge the term becomes "estimated on
 * component data" instead, and if it does not, this bound goes back to the
 * owner. Each case the independent review of 2026-10-22 names is a test
 * (tests/fins/rounded-edge-bounded.test.ts), for the re-review.
 */

import { chordAt, tipChord, type Planform } from './planform';
import { FinRefusal } from './refusal';
import {
  MACHA_REYNOLDS,
  REYNOLDS_ALLOWANCE,
  RM_A55H31_RANGE,
  SWEEP_LIMIT_DEGREES,
  TN2960_RANGE,
  pitotPressureCoefficient,
  sweepAllowanceAt,
  transonicFrontSide,
} from './rounded-leading-edge';

const GAMMA = 1.4;
const DEG = Math.PI / 180;

/**
 * The highest normal Mach number served (0019 section 3.2, (U3)). The
 * margin of the high end (0.659, or 0.679 with the Reynolds-number
 * allowance) over the fuller of the nose's front-side estimates (a) and (b),
 * built on the reviewer's first look at CR-149372 fig. 8a: 16% to 20% at
 * M_n 0.8 (over (b), 0.566); 8% to 11% at 0.85 (over (b) interpolated
 * between fig. 8a's M 0.8 and 0.9 sets, 0.610; fig. 8a has no 0.85 set);
 * 0.8% to 3.8% at 0.9 (over (b), 0.654). Estimate (c) exceeds the high end
 * by 2% to 5% at 0.8 already. 0.8 until fig. 8a, read twice, shows the
 * margin at 0.85 to 0.9.
 */
export const NORMAL_MACH_CAP = 0.8;

/**
 * The lowest free-stream Mach number served (0019 section 3.2, (L5)). Below
 * Mach 1 the body's base and the plate's trailing edge are felt at the nose
 * in subsonic flow, and that is not bounded here; above it linear theory
 * gives the body's base no upstream influence, which holds once the flow
 * along the body is supersonic with a margin. The boundary layer's
 * displacement growth, at most 0.004 rad at the population's Reynolds
 * numbers, turns the flow by that much; by the transonic Prandtl-Meyer
 * function nu = (2/3)(M^2 - 1)^(3/2)/(gamma + 1) the flow stays supersonic
 * if M^2 - 1 >= (3 (gamma + 1) theta / 2)^(2/3) = 0.06; twice that, M^2 - 1
 * >= 0.12, gives Mach 1.058, taken as 1.06. That is the floor for the
 * boundary layer alone; the fins' own thickness turns the flow along the
 * body further (`freeStreamFloor`, the re-review of 2026-10-22, N1), and the
 * floor served is the higher.
 */
export const FREE_STREAM_FLOOR = 1.06;

/** The boundary layer's displacement growth along the body, rad ((L5)). */
export const BOUNDARY_LAYER_TURNING = 0.004;

/**
 * The flow along the body near the fins' roots is turned by the boundary
 * layer's growth and by the fins' own thickness, which adds n t of section
 * area per unit span over the leading edge's streamwise extent s
 * tan(Lambda_LE), spread over the body's circumference 2 pi r: theta_f = n t
 * / (2 pi r tan(Lambda_LE)) (the span cancels). Taken as a two-dimensional
 * turning, which overstates an axisymmetric compression, on the
 * conservative side. With (L5)'s transonic Prandtl-Meyer condition and its
 * factor of 2: M^2 - 1 >= 2 (3 (gamma + 1) theta / 2)^(2/3). An unswept
 * leading edge adds the fins' thickness at once: no floor (Infinity).
 * Never below FREE_STREAM_FLOOR.
 */
export function freeStreamFloor(p: {
  readonly finCount: number;
  readonly thickness: number;
  readonly bodyRadius: number;
  readonly tanLeadingEdge: number;
}): number {
  if (!(p.tanLeadingEdge > 0)) return Infinity;
  const theta =
    BOUNDARY_LAYER_TURNING +
    (p.finCount * p.thickness) / (2 * Math.PI * p.bodyRadius * p.tanLeadingEdge);
  const floor = Math.sqrt(1 + 2 * ((3 * (GAMMA + 1) * theta) / 2) ** (2 / 3));
  return Math.max(FREE_STREAM_FLOOR, floor);
}

/**
 * The transonic similarity parameter below which, in magnitude, the
 * trailing edge's influence is not argued (0019 section 3.2, (L5)). The
 * linear estimate is kept where the small-disturbance equation's nonlinear
 * term, (gamma + 1) M^2 u/U with u/U = 2 tau / (pi beta) (the nose's source
 * and the trailing edge's sink at mid-chord, linear), takes at most half of
 * 1 - M^2: beta^3 >= (4/pi)(gamma + 1) M^2 tau, that is
 * xi = (1 - M^2) / [(gamma + 1) M^2 tau]^(2/3) >= (4/pi)^(2/3) = 1.175.
 * The local beta then falls by at most a factor of 2^(1/2), inside the
 * lower bound's margin of 2. The same magnitude is required on the
 * supersonic side (xi <= -1.175), where linear theory gives the trailing
 * edge no upstream influence: the transonic range's width is set by the
 * same nonlinear term either side of sonic.
 */
export const TRANSONIC_XI_MIN = (4 / Math.PI) ** (2 / 3);

/** The lower bound's margin on the linear estimate of the trailing edge's influence ((L4)). */
export const LOWER_BOUND_MARGIN = 2;

/** Why a case is refused; several may apply, all are listed. */
export type BoundedEdgeCondition =
  'free-stream' | 'sweep' | 'normal-mach' | 'trailing-edge-transonic' | 'reynolds';

export class BoundedEdgeRefusal extends FinRefusal {
  readonly conditions: readonly BoundedEdgeCondition[];

  constructor(conditions: readonly BoundedEdgeCondition[], message: string) {
    super('bounded-edge-range', message);
    this.conditions = conditions;
  }
}

/**
 * The trailing edge's linearised upstream influence on the nose (0019
 * section 3.2, (L4)), as a change of the nose's term on q_n t, with no
 * margin: the trailing edge, swept Lambda_TE, as an infinite line sink of
 * strength U cos(Lambda_TE) t per unit length, a distance c cos(Lambda_TE)
 * behind the leading edge at a station of streamwise chord c. In the plane
 * normal to it the flow is two-dimensional at its normal Mach number M_TE =
 * M cos(Lambda_TE); the sink induces u = U t / (2 pi beta_TE c) normal to
 * the line, so Cp = -(t / c) cos(Lambda_TE) / (pi beta_TE) on q, that is
 * -(cos(Lambda_TE) / cos^2(Lambda_LE)) (t / c) / (pi beta_TE) on q_n. With
 * parallel edges, -(t / c_n) / (pi beta_n), c_n = c cos(Lambda). Only for a
 * subsonic trailing edge; the infinite line includes segments a real fin
 * does not have (inboard of its root), so it overstates the effect.
 */
export function trailingEdgeSinkShift(p: {
  readonly mach: number;
  readonly leadingEdgeSweep: number;
  readonly trailingEdgeSweep: number;
  readonly thicknessOverChord: number;
}): number {
  const cosTe = Math.cos(p.trailingEdgeSweep);
  const cosLe = Math.cos(p.leadingEdgeSweep);
  const mTe = p.mach * cosTe;
  if (!(mTe < 1)) throw new RangeError('the trailing edge is not subsonic');
  const beta = Math.sqrt(1 - mTe * mTe);
  return -((cosTe / (cosLe * cosLe)) * p.thicknessOverChord) / (Math.PI * beta);
}

/**
 * xi of the plate in the plane normal to its trailing edge: (1 - M_TE^2) /
 * [(gamma + 1) M_TE^2 tau]^(2/3), tau = t / (c cos(Lambda_TE)), the
 * thickness over the distance from the leading edge to the trailing-edge
 * line, normal to it. Positive for a subsonic trailing edge.
 */
export function trailingEdgeXi(p: {
  readonly mach: number;
  readonly trailingEdgeSweep: number;
  readonly thicknessOverChord: number;
}): number {
  const cosTe = Math.cos(p.trailingEdgeSweep);
  const m = p.mach * cosTe;
  const tau = p.thicknessOverChord / cosTe;
  return (1 - m * m) / ((GAMMA + 1) * m * m * tau) ** (2 / 3);
}

/**
 * Bryson's stationarity (TR 1094 eqs. 35 and 43): with the local Mach
 * numbers stationary in the free stream's at M = 1, a forebody's pressure
 * drag on its frontal height rises through M = 1 at dC/dM = (4 - 2 C) /
 * (gamma + 1).
 */
export function stationaritySlope(c: number): number {
  return (4 - 2 * c) / (GAMMA + 1);
}

export interface BoundedRoundedEdge {
  /** Free-stream Mach number. */
  readonly mach: number;
  /** M cos(Lambda_LE). */
  readonly normalMach: number;
  /** M cos(Lambda_TE). */
  readonly trailingEdgeNormalMach: number;
  /** xi in the trailing edge's normal plane at the shortest chord (the governing station). */
  readonly trailingEdgeXi: number;
  /** On q_n t, the span's mean: the low end, the high end, the midpoint served. */
  readonly low: number;
  readonly high: number;
  readonly nominal: number;
  /** The same per unit span on the free stream's q (multiply by the span and the fin count). */
  readonly dragPerSpan: { readonly low: number; readonly high: number; readonly nominal: number };
  /** Whether the Reynolds-number allowance widened the high end. */
  readonly reynoldsAllowance: boolean;
  readonly label: string;
}

/**
 * The bounded term for a flat plate of thickness t with semicircular leading
 * edges on `planform`, at free-stream Mach `mach`, the Reynolds number on
 * the edge's diameter t taken on the free stream (its normal component
 * decides the domain, as for the measured term).
 */
export function boundedRoundedEdge(input: {
  readonly mach: number;
  readonly planform: Planform;
  readonly thickness: number;
  readonly reynoldsOnDiameter: number;
  /** The number of fins and the body's radius at the fins, for the free-stream floor ((L5)). */
  readonly finCount: number;
  readonly bodyRadius: number;
}): BoundedRoundedEdge {
  const { mach, planform, thickness } = input;
  const floor = freeStreamFloor({
    finCount: input.finCount,
    thickness,
    bodyRadius: input.bodyRadius,
    tanLeadingEdge: planform.tanLeadingEdge,
  });
  const leSweep = Math.atan(planform.tanLeadingEdge);
  const teSweep = Math.atan(planform.tanTrailingEdge);
  const sweepDeg = leSweep / DEG;
  const normalMach = mach * Math.cos(leSweep);
  const teMach = mach * Math.cos(teSweep);
  const shortest = Math.min(planform.rootChord, tipChord(planform));
  const xi = trailingEdgeXi({
    mach,
    trailingEdgeSweep: teSweep,
    thicknessOverChord: thickness / shortest,
  });
  const reN = input.reynoldsOnDiameter * Math.cos(leSweep);

  const failed: [BoundedEdgeCondition, string][] = [];
  if (!(mach >= floor)) {
    failed.push([
      'free-stream',
      Number.isFinite(floor)
        ? `the free stream, Mach ${mach}, is below ${floor.toFixed(3)}, where the flow along the ` +
          "body, turned by its boundary layer and the fins' thickness, stays supersonic with a " +
          "margin of 2: nearer sonic the body's base and the flow along the body are not shown " +
          'to leave the nose alone'
        : "the leading edge is unswept, so the fins' thickness turns the flow along the body at " +
          'once and no free-stream Mach number is shown to keep it supersonic there',
    ]);
  }
  if (sweepDeg > SWEEP_LIMIT_DEGREES + 1e-9) {
    failed.push([
      'sweep',
      `the leading edge is swept ${sweepDeg.toFixed(1)} deg, beyond the ${SWEEP_LIMIT_DEGREES} deg of ` +
        "the measured term's sweep allowance",
    ]);
  }
  if (!(normalMach <= NORMAL_MACH_CAP)) {
    failed.push([
      'normal-mach',
      normalMach >= 1
        ? `the normal Mach number ${normalMach.toFixed(3)} is 1.0 or more, the measured term's range`
        : `the normal Mach number ${normalMach.toFixed(3)} is above ${NORMAL_MACH_CAP}, where the ` +
          "high end's margin over the nose is not shown",
    ]);
  }
  if (!(Math.abs(xi) >= TRANSONIC_XI_MIN)) {
    failed.push([
      'trailing-edge-transonic',
      `the trailing edge's normal Mach number ${teMach.toFixed(3)} is transonic for the plate ` +
        `(xi ${xi.toFixed(3)} at the shortest chord, inside +-${TRANSONIC_XI_MIN.toFixed(3)}): ` +
        'its upstream influence is not argued there',
    ]);
  }
  if (!(reN >= RM_A55H31_RANGE.reynolds[0] && reN <= TN2960_RANGE.reynolds[1])) {
    failed.push([
      'reynolds',
      `the Reynolds number on the edge's diameter (normal component) ${reN.toPrecision(3)} is ` +
        `outside ${RM_A55H31_RANGE.reynolds[0]} to ${TN2960_RANGE.reynolds[1]}`,
    ]);
  }
  if (failed.length > 0) {
    throw new BoundedEdgeRefusal(
      failed.map(([c]) => c),
      'a rounded leading edge below M_n 1.0 is bounded, not measured (0019 section 3.2), and ' +
        'refused here: ' +
        failed.map(([, m]) => m).join('; '),
    );
  }

  // The high end: the measured term at M_n 1.0 at its band's high end (0016 section 11), with
  // the Reynolds-number allowance outside CR-149372's Reynolds numbers and the sweep allowance,
  // as `roundedLeadingEdgeDrag` forms them.
  const node = transonicFrontSide(1.0);
  const modified = (2 / 3) * pitotPressureCoefficient(1.0);
  const reynoldsAllowance = !(reN >= MACHA_REYNOLDS[0] && reN <= MACHA_REYNOLDS[1]);
  const ratioHigh = node.high / node.nominal + (reynoldsAllowance ? REYNOLDS_ALLOWANCE : 0);
  const swept = planform.tanLeadingEdge !== 0;
  const allowed = swept
    ? Math.ceil(ratioHigh * sweepAllowanceAt(sweepDeg).high * 1000 - 1e-9) / 1000
    : ratioHigh;
  const high = node.nominal * modified * allowed;

  // The low end: twice the sink's shift, the span's mean of 1/c, or none for a supersonic
  // trailing edge.
  let low = 0;
  if (teMach < 1) {
    const k = planform.tanTrailingEdge - planform.tanLeadingEdge;
    const s = planform.span;
    const meanInverseChord =
      Math.abs(k * s) < 1e-12 * planform.rootChord
        ? 1 / planform.rootChord
        : Math.log(chordAt(planform, s) / planform.rootChord) / (k * s);
    low =
      LOWER_BOUND_MARGIN *
      trailingEdgeSinkShift({
        mach,
        leadingEdgeSweep: leSweep,
        trailingEdgeSweep: teSweep,
        thicknessOverChord: thickness * meanInverseChord,
      });
  }
  const nominal = (low + high) / 2;
  const perSpan = (c: number) => c * Math.cos(leSweep) ** 2 * thickness;
  return {
    mach,
    normalMach,
    trailingEdgeNormalMach: teMach,
    trailingEdgeXi: xi,
    low,
    high,
    nominal,
    dragPerSpan: { low: perSpan(low), high: perSpan(high), nominal: perSpan(nominal) },
    reynoldsAllowance,
    label:
      "bounded, not measured: between no drag on the nose less twice the trailing edge's " +
      'linearised upstream influence (an inviscid argument, 0019 section 3.2) and the term at ' +
      "M_n 1.0 at its band's high end (CR-149372, TN 2960" +
      (reynoldsAllowance ? ', the Reynolds-number allowance' : '') +
      (swept ? ', the sweep allowance' : '') +
      "); its upper ordering rests on an analogy, not a measurement: that the plate nose's " +
      "front pressures stay within about a fifth of a cylinder's (0019 section 3.2, (U3) and " +
      "(U4)), and the fullest estimate of the nose's front side, (c), exceeds the high end by 2% " +
      'to 5% at M_n 0.8; a recorded candidate, not served: refused until NASA TM X-653 is read ' +
      '(0014 section 10.7 (o))',
  };
}
