/**
 * Square-cut fin leading edges at zero incidence, "bounded, not measured"
 * (docs/design/0016-fin-edges-of-flat-plates.md section 21.1; 0014 section
 * 10.2 as amended by 10.7 (aa)).
 *
 * **The term.** A flat plate's square-cut leading edge is a flat face of
 * height t, the plate's thickness, normal to the plate and to the edge. Its
 * pressure drag per unit span is (p_f - p_inf) t, with p_f the face's mean
 * pressure; the plate's faces behind the corners lie parallel to the stream
 * and carry none. Swept S deg, by the independence principle, the flow
 * normal to the edge is the two-dimensional flow at M_n = M cos(S) on the
 * normal dynamic pressure q cos^2(S), and the drag per unit span is still
 * (p_f - p_inf) t.
 *
 * **The bounds**, physical limits on the normal flow: the face is wetted by
 * the one streamline that crosses the bow shock where it is normal, so its
 * pressure is at most that streamline's total pressure, the pitot pressure
 * p02 (upper); and it lies inside the subsonic region behind the shock,
 * the sonic line attached at its corners, so its pressure is at least the
 * sonic pressure p* = 0.5283 p02 on that streamline (lower). Swept, each is
 * widened by the sweep allowance measured on yawed cylinders
 * (./rounded-leading-edge.ts, `sweepAllowanceAt`), an analogy for a flat
 * face: a real swept stagnation line was measured above the principle's
 * pitot pressure (RM A55H31 fig. 11 at 60 deg, 1.098 of it).
 *
 * **What is served**: the midpoint of the band from the lower bound's low
 * end to the upper bound's high end, the band the whole gap (0014 section
 * 10.2), labelled "bounded, not measured". The root (the body's boundary
 * layer, the junction's separation) and the tip are not represented.
 *
 * **Domain.** M_n 1.0 to 3.0 (below, no shock stands in the normal flow and
 * p* falls below the free stream's pressure; above, beyond every fin edge
 * served), sweep up to 60 deg (the yawed-cylinder checks), the Reynolds
 * number on the thickness, normal component, at least 6.7e3 (the rounded
 * edge's floor: the face's layer thin). Refused outside it, every reason
 * given (`square-leading-edge`).
 */

import { FinRefusal } from './refusal';
import {
  pitotPressureCoefficient,
  RM_A55H31_RANGE,
  SMALLEST_TESTED_SWEEP,
  SWEEP_ALLOWANCE_SERVED,
  SWEEP_LIMIT_DEGREES,
  sweepAllowanceAt,
} from './rounded-leading-edge';

const GAMMA = 1.4;
const DEG = Math.PI / 180;

/** The sonic pressure over the total pressure on a streamline: (2 / (gamma + 1))^(gamma / (gamma - 1)). */
export const SONIC_PRESSURE_RATIO = (2 / (GAMMA + 1)) ** (GAMMA / (GAMMA - 1));

/** The normal Mach numbers over which the bounds are served (0016 section 21.1, item 7). */
export const SQUARE_EDGE_MACH_RANGE = [1.0, 3.0] as const;

/** The lowest Reynolds number on the thickness (normal component) served: the rounded edge's floor. */
export const SQUARE_EDGE_REYNOLDS_FLOOR = RM_A55H31_RANGE.reynolds[0];

/**
 * The sonic pressure behind a normal shock as a pressure coefficient on the
 * free stream: (p* / p_inf - 1) / (gamma M^2 / 2), p* = 0.5283 p02. Zero at
 * Mach 1, where p* is the free stream's pressure.
 */
export function sonicPressureCoefficient(mach: number, gamma = GAMMA): number {
  if (!(mach >= 1))
    throw new RangeError(`the sonic pressure behind a normal shock needs M >= 1 (M ${mach})`);
  const q = 0.5 * gamma * mach * mach;
  const p02 = 1 + q * pitotPressureCoefficient(mach, gamma);
  const star = (2 / (gamma + 1)) ** (gamma / (gamma - 1));
  return (star * p02 - 1) / q;
}

export interface SquareLeadingEdge {
  /** The served value per unit span over q (a length): the band's midpoint. */
  readonly dragPerSpan: number;
  /** The band as ratios on the served value: the lower bound's low end and the upper's high end. */
  readonly band: { readonly low: number; readonly high: number };
  /** The bounds per unit span over q, before the sweep allowance: p* and p02 on the whole face. */
  readonly lowerPerSpan: number;
  readonly upperPerSpan: number;
  /** The sweep allowance applied to them (1 and 1 unswept). */
  readonly allowance: { readonly low: number; readonly high: number };
  readonly label: string;
  /** The Mach number normal to the edge, M cos(sweep). */
  readonly normalMach: number;
  readonly sweepDegrees: number;
  /** The Reynolds number on the thickness, normal component. */
  readonly reynoldsOnThickness: number;
}

/** A number printed with the digits that keep a stated inequality true at its boundary. */
function shown(x: number, limit: number, side: 'below' | 'above'): string {
  for (let digits = 4; digits <= 15; digits++) {
    const text = x.toPrecision(digits);
    const v = Number(text);
    if (side === 'below' ? v < limit : v > limit) return text;
  }
  return String(x);
}

/**
 * The square-cut leading edge's term, bounded (0016 section 21.1), at the
 * free-stream Mach number, for a plate of thickness t (in the body's length
 * unit), its leading edge swept atan(tanLeadingEdgeSweep), with the
 * free-stream Reynolds number on the thickness (its normal component decides
 * the domain).
 */
export function squareLeadingEdgeDrag(input: {
  readonly mach: number;
  readonly thickness: number;
  readonly tanLeadingEdgeSweep: number;
  readonly reynoldsOnThickness: number;
}): SquareLeadingEdge {
  const tanSweep = input.tanLeadingEdgeSweep;
  if (!(tanSweep >= 0 && Number.isFinite(tanSweep))) {
    throw new FinRefusal('square-leading-edge', `bad leading-edge sweep (tan ${tanSweep})`);
  }
  if (!(input.thickness > 0 && Number.isFinite(input.thickness))) {
    throw new FinRefusal('square-leading-edge', `bad plate thickness (${input.thickness})`);
  }
  const sweep = Math.atan(tanSweep);
  const sweepDegrees = sweep / DEG;
  const cosSweep = Math.cos(sweep);
  const normalMach = input.mach * cosSweep;
  const re = input.reynoldsOnThickness * cosSweep;
  const swept = tanSweep !== 0;
  const normal = swept ? ' normal to the edge, M cos(sweep),' : '';
  const [mLo, mHi] = SQUARE_EDGE_MACH_RANGE;
  const failed: string[] = [];
  if (sweepDegrees > SWEEP_LIMIT_DEGREES + 1e-9) {
    failed.push(
      `a square-cut leading edge swept ${sweepDegrees.toFixed(1)} deg is refused: its bounds are ` +
        'carried to a swept edge by the independence principle, whose yawed-cylinder checks reach ' +
        `${SWEEP_LIMIT_DEGREES} deg (RM A55H31 fig. 12)`,
    );
  }
  if (!(normalMach >= mLo)) {
    failed.push(
      `the Mach number${normal} ${shown(normalMach, mLo, 'below')} is below ${mLo.toFixed(1)}: ` +
        'no shock stands in the flow normal to the edge, the sonic pressure falls below the free ' +
        "stream's and bounds nothing, and no fin edge is served there (0016 section 21.1)",
    );
  }
  if (!(normalMach <= mHi)) {
    failed.push(
      `the Mach number${normal} ${shown(normalMach, mHi, 'above')} is above ${mHi.toFixed(1)}, ` +
        'beyond every fin edge served (0016 section 21.1)',
    );
  }
  if (!(re >= SQUARE_EDGE_REYNOLDS_FLOOR)) {
    failed.push(
      `the Reynolds number ${shown(re, SQUARE_EDGE_REYNOLDS_FLOOR, 'below')} on the plate's ` +
        `thickness${swept ? ' (normal component)' : ''} is below ${SQUARE_EDGE_REYNOLDS_FLOOR}: ` +
        "the face's boundary layer is not shown thin enough for the bounds' margin at its " +
        "corners (0016 section 21.1, item 4; the rounded edge's floor, RM A55H31)",
    );
  }
  if (failed.length > 0) {
    throw new FinRefusal(
      'square-leading-edge',
      'a square-cut leading edge is served bounded, not measured, only where its bounds hold ' +
        `(0016 section 21.1): ${failed.join('; and ')}`,
    );
  }
  const c2 = cosSweep * cosSweep;
  const lowerPerSpan = sonicPressureCoefficient(normalMach) * c2 * input.thickness;
  const upperPerSpan = pitotPressureCoefficient(normalMach) * c2 * input.thickness;
  const allowance = swept ? sweepAllowanceAt(sweepDegrees) : { low: 1, high: 1 };
  const low = lowerPerSpan * allowance.low;
  const high = upperPerSpan * allowance.high;
  const dragPerSpan = 0.5 * (low + high);
  const t = input.thickness;
  const cpLow = lowerPerSpan / (c2 * t);
  const cpHigh = upperPerSpan / (c2 * t);
  const sweptText = swept
    ? `; swept ${sweepDegrees.toFixed(1)} deg: the independence principle (the bounds on the flow ` +
      'normal to the edge, on the normal dynamic pressure), both bounds widened by the sweep ' +
      `allowance measured on yawed cylinders (RM A55H31 figs. 11, 12; ${allowance.low.toFixed(3)} ` +
      `to ${allowance.high.toFixed(3)} here, ${SWEEP_ALLOWANCE_SERVED.low.toFixed(2)} to ` +
      `${SWEEP_ALLOWANCE_SERVED.high.toFixed(2)} from ${SMALLEST_TESTED_SWEEP} deg), an analogy ` +
      'for a flat face'
    : '';
  const label =
    'bounded, not measured: between the sonic pressure behind a normal shock (p*) and the pitot ' +
    `pressure on the whole face (Cp ${cpLow.toFixed(3)} to ${cpHigh.toFixed(3)} on the thickness ` +
    `at M_n ${normalMach.toFixed(3)}), physical limits: the face, wetted by the streamline that ` +
    'crosses the bow shock where it is normal, lies inside the subsonic region behind it with the ' +
    'sonic line at its corners; the band is the whole gap between them' +
    sweptText +
    "; the fin's root and tip not represented (0016 section 21.1)";
  return {
    dragPerSpan,
    band: { low: low / dragPerSpan, high: high / dragPerSpan },
    lowerPerSpan,
    upperPerSpan,
    allowance,
    label,
    normalMach,
    sweepDegrees,
    reynoldsOnThickness: re,
  };
}
