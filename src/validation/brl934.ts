/**
 * The Basic Finner in the BRL Free Flight Aerodynamics Range: L. C.
 * MacAllister, "The Aerodynamic Properties of a Simple Non Rolling Finned
 * Cone-Cylinder Configuration Between Mach Numbers 1.0 and 2.5", BRL Report
 * No. 934, May 1955, DTIC AD068959. Transcribed in
 * `docs/research/total-drag/data/basic_finner_brl934.md` and `.csv` (the
 * first reading); Tables II and III read again blind by round 9
 * (`docs/research/total-drag/audit/round9/`), Graph I's symbols by round 7
 * (`docs/research/total-drag/audit/round7/`, method.md item 5 and
 * `readings/brl934_graph1_pairing.csv`), Graph II twice by two methods
 * (`basic_finner_brl934_graph2.csv`). tests/validation/brl934-readings.test.ts
 * holds every value here to those files.
 *
 * A held-back set (docs/design/0014-refusals.md section 10.1): its Table III
 * and Graphs I and II set or shape no band. Its range A, Mach 1.5 to 2.47
 * (10.5), is run once by tests/validation/brl934-range-a.test.ts, with the
 * inputs it does not state decided before the run (10.6), each below with
 * its item, and the rounds admitted by 10.6 item 5's rule alone, which uses
 * no drag value (`admission`).
 */

import type { FlightConditions } from '../total/finned-body';
import { SUTHERLAND_BETA, SUTHERLAND_CONSTANT } from '../atmosphere/us-standard-1976';

/** Range A of 0014 section 10.5: a round belongs to it when its Mach number lies in it, the lower end included. */
export const BRL934_RANGE_A = [1.5, 2.47] as const;

/**
 * The present model is reported at the rounds at Mach 1.798 to 2.47 (0014
 * section 10.3): from where the present fins-on-base factor serves (its M
 * 1.80 row less the reading error 0.002, src/base/fins-on-base.ts).
 */
export const BRL934_PRESENT_FROM = 1.798;

/**
 * Geometry, in calibres (the model diameter), text p. 6 and the abstract
 * (transcription section 2): a 10 deg half-angle cone on a cylinder, 10 cal
 * overall; four rectangular fins, 1 cal chord and 1 cal exposed span, at the
 * base; an 8% single wedge, 0.08 cal thick at the trailing edge.
 */
export const BRL934_GEOMETRY = {
  length: 10.0,
  coneHalfAngleDegrees: 10,
  finCount: 4,
  finChord: 1.0,
  finSpan: 1.0,
  finTrailingEdgeThickness: 0.08,
  /** 0014 section 10.6 item 3: sharp, no rounded-edge term (Kermeen, DTIC AD146516 fig. 1; NAVORD 6652 fig. 1). */
  finLeadingEdgeRadius: 0,
  /** 0014 section 10.6 item 3: DREV's 0.004 cal (TM 9703 p. 3), a stated sensitivity, not the verdict. */
  sensitivityLeadingEdgeRadius: 0.004,
  /**
   * 0014 section 10.6 item 4: constant thickness across the span, 0.32 cal^2
   * over the four fins (0.08 cal over the 1 cal span each). The tapered
   * alternative, 0.16 cal^2, which the library refuses, is reported as the
   * trailing-edge term halved, by hand.
   */
  trailingEdgeArea: 0.32,
  trailingEdgeTaperedFactor: 0.5,
} as const;

/** 0014 section 10.6 item 1: the model diameter, an input range (Graph IV's legend against Table I). */
export const BRL934_DIAMETER_INCHES = { range: [0.78, 0.82] as const, nominal: 0.8 } as const;

/**
 * 0014 section 10.6 item 2: the range air, an assumption for an enclosed
 * gallery stated as one, 288 to 298 K at 1 atm, an input range with the
 * diameter's; the nominal at the midpoints. The cold-wall input (item 5,
 * wall) is the wall at the nominal air temperature.
 */
export const BRL934_AIR = {
  temperatureRange: [288, 298] as const,
  temperatureNominal: 293,
  pressure: 101325,
} as const;

/** 0014 section 10.6 item 5, transition: 0008's transition input band as for the DREV gate (laminar runs to these Re_T). */
export const BRL934_TRANSITION_REYNOLDS = [5e5, 1.6e6, 3e6] as const;

const GAMMA = 1.4;
const R_AIR = 287.05;
const INCH = 0.0254;

/**
 * The flight conditions of a round, per calibre: the measured Mach number,
 * the static temperature, and the Reynolds number on one model diameter,
 * rho V d / mu, with V = M sqrt(gamma R T), rho = p / (R T), mu by
 * Sutherland's law (src/atmosphere/us-standard-1976.ts's constants).
 */
export function brl934Conditions(
  mach: number,
  diameterInches: number,
  temperature: number,
  pressure: number = BRL934_AIR.pressure,
): FlightConditions {
  const a = Math.sqrt(GAMMA * R_AIR * temperature);
  const rho = pressure / (R_AIR * temperature);
  const mu = (SUTHERLAND_BETA * temperature ** 1.5) / (temperature + SUTHERLAND_CONSTANT);
  return {
    mach,
    temperature,
    reynoldsPerLength: (rho * mach * a * diameterInches * INCH) / mu,
  };
}

/** The nominal conditions and the four corners of the diameter and air ranges (0014 section 10.6 items 1 and 2). */
export function brl934ConditionSet(mach: number): {
  nominal: FlightConditions;
  corners: { name: string; conditions: FlightConditions }[];
} {
  const corners: { name: string; conditions: FlightConditions }[] = [];
  for (const d of BRL934_DIAMETER_INCHES.range) {
    for (const t of BRL934_AIR.temperatureRange) {
      corners.push({
        name: `d ${d.toFixed(2)} in, ${t} K`,
        conditions: brl934Conditions(mach, d, t),
      });
    }
  }
  return {
    nominal: brl934Conditions(mach, BRL934_DIAMETER_INCHES.nominal, BRL934_AIR.temperatureNominal),
    corners,
  };
}

export interface Brl934Round {
  readonly round: number;
  readonly phase: 1 | 2;
  /** Table III, Mach number. */
  readonly mach: number;
  /** Table III, mean squared yaw, deg^2; undefined where none is printed. */
  readonly meanSquaredYaw: number | undefined;
  /** Table III, C_D at the round's yaw, on the body's cross-section. */
  readonly cd: number;
  /** Table II, average yaw, deg. */
  readonly averageYaw: number;
  /** Graph I, the first reading's symbols at the round (the csv's graph1 column, transcription section 7). */
  readonly graph1First: string;
  /** Graph I, round 7's (brl934_graph1.csv and its pairing). */
  readonly graph1Second: string;
  /** Marked laminar (an open circle, "corrected for yaw and full turbulent B.L.") by the first reading. */
  readonly laminarFirst: boolean;
  /** Marked laminar by round 7's reading as recorded after its pairing (its third look). */
  readonly laminarSecond: boolean;
}

/** Every round of Table III in range A (16 rounds), in Mach order. */
export const BRL934_RANGE_A_ROUNDS: readonly Brl934Round[] = [
  {
    round: 3254,
    phase: 2,
    mach: 1.506,
    meanSquaredYaw: 3.7,
    cd: 0.71,
    averageYaw: 1.9,
    graph1First: 'plus; dot',
    graph1Second: 'plus (F1); dot (F2)',
    laminarFirst: false,
    laminarSecond: false,
  },
  {
    round: 2593,
    phase: 1,
    mach: 1.733,
    meanSquaredYaw: 53.4,
    cd: 0.873,
    averageYaw: 7.4,
    graph1First: 'phase-1 consolidation symbol only',
    graph1Second: 'phase-1 consolidation symbol only (G1)',
    laminarFirst: false,
    laminarSecond: false,
  },
  {
    round: 2594,
    phase: 1,
    mach: 1.745,
    meanSquaredYaw: 36.2,
    cd: 0.777,
    averageYaw: 6.0,
    graph1First: 'phase-1 consolidation symbol only',
    graph1Second: 'phase-1 consolidation symbol only (G1)',
    laminarFirst: false,
    laminarSecond: false,
  },
  {
    round: 2595,
    phase: 1,
    mach: 1.784,
    meanSquaredYaw: 0.6,
    cd: 0.624,
    averageYaw: 0.8,
    graph1First: 'phase-1 consolidation symbol only',
    graph1Second: 'phase-1 consolidation symbol only (G1)',
    laminarFirst: false,
    laminarSecond: false,
  },
  {
    round: 2599,
    phase: 1,
    mach: 1.788,
    meanSquaredYaw: 1.5,
    cd: 0.662,
    averageYaw: 1.2,
    graph1First: 'phase-1 consolidation symbol only',
    graph1Second: 'phase-1 consolidation symbol only (G1)',
    laminarFirst: false,
    laminarSecond: false,
  },
  {
    round: 2598,
    phase: 1,
    mach: 1.798,
    meanSquaredYaw: 5.6,
    cd: 0.621,
    averageYaw: 2.4,
    graph1First: 'phase-1 consolidation symbol only',
    graph1Second: 'phase-1 consolidation symbol only (G1)',
    laminarFirst: false,
    laminarSecond: false,
  },
  {
    round: 2591,
    phase: 1,
    mach: 1.801,
    meanSquaredYaw: 0.2,
    cd: 0.604,
    averageYaw: 0.5,
    graph1First: 'phase-1 consolidation symbol only',
    graph1Second: 'phase-1 consolidation symbol only (G1)',
    laminarFirst: false,
    laminarSecond: false,
  },
  {
    round: 2588,
    phase: 1,
    mach: 1.802,
    meanSquaredYaw: 0.4,
    cd: 0.616,
    averageYaw: 0.7,
    graph1First: 'phase-1 consolidation symbol only',
    graph1Second: 'phase-1 consolidation symbol only (G1)',
    laminarFirst: false,
    laminarSecond: false,
  },
  {
    round: 2590,
    phase: 1,
    mach: 1.803,
    meanSquaredYaw: 0.1,
    cd: 0.644,
    averageYaw: 0.3,
    graph1First: 'phase-1 consolidation symbol only',
    graph1Second: 'phase-1 consolidation symbol only (G1)',
    laminarFirst: false,
    laminarSecond: false,
  },
  {
    round: 2596,
    phase: 1,
    mach: 1.814,
    meanSquaredYaw: 1.5,
    cd: 0.629,
    averageYaw: 1.2,
    graph1First: 'phase-1 consolidation symbol only',
    graph1Second: 'phase-1 consolidation symbol only (G1)',
    laminarFirst: false,
    laminarSecond: false,
  },
  {
    round: 2589,
    phase: 1,
    mach: 1.827,
    meanSquaredYaw: 0.7,
    cd: 0.614,
    averageYaw: 0.9,
    graph1First: 'phase-1 consolidation symbol only',
    graph1Second: 'phase-1 consolidation symbol only (G1)',
    laminarFirst: false,
    laminarSecond: false,
  },
  {
    round: 3256,
    phase: 2,
    mach: 1.993,
    meanSquaredYaw: 6.6,
    cd: 0.584,
    averageYaw: 2.6,
    graph1First: 'plus; dot',
    graph1Second: 'plus (H1); dot (H2)',
    laminarFirst: false,
    laminarSecond: false,
  },
  {
    round: 3255,
    phase: 2,
    mach: 2.032,
    meanSquaredYaw: undefined,
    cd: 0.568,
    averageYaw: 0,
    graph1First: 'plus',
    graph1Second: 'plus (I1)',
    laminarFirst: false,
    laminarSecond: false,
  },
  {
    round: 3249,
    phase: 2,
    mach: 2.05,
    meanSquaredYaw: 5.0,
    cd: 0.526,
    averageYaw: 2.3,
    graph1First: 'open circle; dot',
    graph1Second: 'open circle (I2); dot (I3)',
    laminarFirst: true,
    laminarSecond: true,
  },
  {
    round: 3263,
    phase: 2,
    mach: 2.423,
    meanSquaredYaw: 2.9,
    cd: 0.478,
    averageYaw: 1.7,
    graph1First: 'plus; dot on the faired curve',
    graph1Second:
      'plus (J1); dot (J2: called an open circle at low confidence, "could be a dot", when read ' +
      'blind; resolved to a dot on the third look, which replaces J2 for any use)',
    laminarFirst: false,
    laminarSecond: false,
  },
  {
    round: 3264,
    phase: 2,
    mach: 2.468,
    meanSquaredYaw: 0.2,
    cd: 0.449,
    averageYaw: 0.5,
    graph1First: 'filled dot at C_D about 0.473 (Table III 0.449; nothing plotted near it)',
    graph1Second:
      'plus, or a small dot under a plus (K1: call left out) at C_D about 0.474; nothing plotted ' +
      'near 0.449',
    laminarFirst: false,
    laminarSecond: false,
  },
];

/**
 * 0014 section 10.6 item 5, rounds: those in range A whose mean squared yaw
 * is printed and at most 5 deg^2, and which neither reading of Graph I marks
 * laminar; 3264 at Table III's values (the primary record), the independent
 * reading of Table III agreeing. No drag value enters.
 */
export function admission(r: Brl934Round): { admitted: boolean; reason: string } {
  if (!(r.mach >= BRL934_RANGE_A[0] && r.mach <= BRL934_RANGE_A[1])) {
    return { admitted: false, reason: `M ${r.mach} outside range A (Mach 1.5 to 2.47)` };
  }
  if (r.meanSquaredYaw === undefined) {
    return {
      admitted: false,
      reason:
        'no mean squared yaw printed (Table III, both readings; Table II average yaw 0, "Model ' +
        'Magnet de-magnetized")',
    };
  }
  if (r.meanSquaredYaw > 5) {
    return {
      admitted: false,
      reason: `mean squared yaw ${r.meanSquaredYaw.toFixed(1)} deg^2, above 5 (Table III, both readings)`,
    };
  }
  if (r.laminarFirst || r.laminarSecond) {
    const by =
      r.laminarFirst && r.laminarSecond
        ? 'both readings'
        : r.laminarFirst
          ? 'the first reading'
          : 'round 7';
    return {
      admitted: false,
      reason: `marked laminar on Graph I (an open circle, "corrected for yaw and full turbulent B.L.") by ${by}`,
    };
  }
  const yaw = `mean squared yaw ${r.meanSquaredYaw.toFixed(1)} deg^2 printed, at most 5`;
  const g1 = 'not marked laminar by either reading of Graph I';
  const extra =
    r.round === 3264
      ? "; used at Table III's values, which round 9 reads alike (Graph I's mark at M 2.47 lies at C_D 0.471 to 0.474 in both readings, nothing near 0.449)"
      : r.round === 3263
        ? "; round 7's blind call of its lower symbol (an open circle at low confidence) was resolved to a dot on that reader's third look, the first reading's call"
        : '';
  return { admitted: true, reason: `${yaw}; ${g1}${extra}` };
}

/** The admitted rounds, by the rule alone. */
export const BRL934_ADMITTED: readonly Brl934Round[] = BRL934_RANGE_A_ROUNDS.filter(
  (r) => admission(r).admitted,
);

/**
 * Graph II, the yaw drag coefficient C_D' per rad^2 (CD = CD0 + C_D'
 * dbar^2), its faired curve read twice (basic_finner_brl934_graph2.csv):
 * reading 1 by eye, reading 2 scripted.
 */
export const BRL934_GRAPH2: readonly (readonly (readonly [number, number])[])[] = [
  [
    [1.277, 17.8],
    [1.297, 17.58],
    [1.338, 16.94],
    [1.378, 16.3],
    [1.418, 15.62],
    [1.458, 15.13],
    [1.498, 14.65],
    [1.578, 13.74],
    [1.618, 13.37],
    [1.658, 13.08],
    [1.697, 12.75],
    [1.737, 12.38],
    [1.777, 12.09],
    [1.817, 11.88],
    [1.856, 11.6],
    [1.896, 11.39],
    [1.983, 10.85],
    [2.015, 10.57],
    [2.055, 10.36],
    [2.094, 10.23],
    [2.134, 9.97],
    [2.19, 9.77],
    [2.249, 9.62],
    [2.324, 9.39],
    [2.411, 9.25],
    [2.517, 9.18],
  ],
  [
    [1.3, 17.48],
    [1.35, 16.57],
    [1.4, 15.73],
    [1.45, 15.17],
    [1.5, 14.63],
    [1.55, 13.92],
    [1.6, 13.61],
    [1.65, 13.09],
    [1.7, 12.66],
    [1.75, 12.26],
    [1.8, 11.95],
    [1.85, 11.51],
    [1.9, 11.26],
    [1.95, 10.86],
    [2.0, 10.75],
    [2.05, 10.48],
    [2.1, 10.29],
    [2.15, 10.06],
    [2.2, 9.87],
    [2.25, 9.67],
    [2.3, 9.5],
    [2.35, 9.49],
    [2.4, 9.29],
    [2.45, 9.24],
    [2.5, 9.16],
  ],
];

/** One reading of Graph II at M, linear between its points (as scripts/brl934.py interpolates). */
export function graph2Reading(reading: 0 | 1, mach: number): number {
  const p = BRL934_GRAPH2[reading]!;
  if (!(mach >= p[0]![0] && mach <= p[p.length - 1]![0])) {
    throw new RangeError(`Graph II reading ${reading + 1} does not reach M ${mach}`);
  }
  let k = 0;
  while (k + 2 < p.length && mach > p[k + 1]![0]) k++;
  const [m0, v0] = p[k]!;
  const [m1, v1] = p[k + 1]!;
  return v0 + ((v1 - v0) * (mach - m0)) / (m1 - m0);
}

/** 0014 section 10.6 item 5, zero-yaw value: C_D' from Graph II's curve, the mean of its two readings. */
export function yawDragCoefficient(mach: number): number {
  return 0.5 * (graph2Reading(0, mach) + graph2Reading(1, mach));
}

/**
 * The text's rounded C_D' (report p. 8, "decreases from about 15.0 per
 * radian squared to 8.9 from a Mach number of 1.4 to 2.4"): the line through
 * those two points, continued beyond them. Reported beside the verdict (0014
 * section 10.6 item 5).
 */
export function textYawDragCoefficient(mach: number): number {
  return 15.0 + ((8.9 - 15.0) * (mach - 1.4)) / (2.4 - 1.4);
}

/** CD0 = CD - C_D'(M) dbar^2, dbar^2 in rad^2. */
export function zeroYawCd(
  r: Brl934Round,
  cdPrime: (mach: number) => number = yawDragCoefficient,
): number {
  if (r.meanSquaredYaw === undefined) throw new RangeError(`round ${r.round}: no yaw printed`);
  return r.cd - cdPrime(r.mach) * r.meanSquaredYaw * (Math.PI / 180) ** 2;
}

/**
 * The Mach clusters of the admitted rounds (0014 section 10.6 item 5,
 * tolerance: the spread per Mach cluster from the admitted rounds). Each
 * model's spread is taken over the rounds that model is tested at: for the
 * present model, at M 1.798 and above, the five rounds at M 1.80 to 1.83 and
 * the two at 2.42 to 2.47 (the transcription's section 9 item 9, adopted by
 * 10.6 item 5).
 */
export const BRL934_CLUSTERS: readonly (readonly [number, number])[] = [
  [1.5, 1.51],
  [1.78, 1.83],
  [2.42, 2.47],
];
