/**
 * Where the boat-tail's own pressure drag is served, and why not elsewhere
 * (design record 0023 section 2.5). The term is the fitted solve's over the
 * boat-tail (`boatTailDrag`, src/analysis/fitted-flow.ts), inviscid, with
 * the viscous allowance of 0023 section 3 set on RM E51F26's side
 * pressures, measured at Mach 1.91 only.
 */

import { boatTailAngle, type Body } from '../geometry/body';
import { noseTipSlope } from '../geometry/nose';

/**
 * Free-stream Mach numbers at which the boat-tail term is served: around
 * RM E51F26's Mach 1.91, where its viscous allowance is measured (0014
 * 10.7 (ae) item 1). Carrying the allowance to other Mach numbers is the
 * owner's question (0023 section 7); widening it is a change of this line.
 */
export const BOAT_TAIL_MACH_RANGE: readonly [number, number] = [1.8, 2.0];

/**
 * Boat-tail half-angles, degrees, and lengths, calibers, of the reference
 * cases the fitted solve was measured on against the method of
 * characteristics (0023 section 2.3). Provisional: the served ranges are
 * decided from the finished four-grid families.
 */
export const BOAT_TAIL_ANGLE_RANGE: readonly [number, number] = [4, 16];
export const BOAT_TAIL_LENGTH_RANGE: readonly [number, number] = [0.5, 2];

/**
 * Whether the viscous allowance is set: false until RM E51F26's figures
 * named in 0014 10.7 (ae) are read twice and paired.
 */
export const BOAT_TAIL_ALLOWANCE_SET: boolean = false;

/** Why a body's boat-tail term is not served at this Mach number, in plain words, or undefined if it is. */
export function boatTailRefusal(body: Body, mach: number): string | undefined {
  const tail = body.boatTail;
  if (tail === undefined) return undefined;
  const reasons: string[] = [];
  if (!Number.isFinite(noseTipSlope(body.nose))) {
    reasons.push(
      "a boat-tail behind a blunt nose is not solved yet: the blunt noses' grids end in a cylinder",
    );
  }
  const [low, high] = BOAT_TAIL_MACH_RANGE;
  if (!(mach >= low && mach <= high)) {
    reasons.push(
      `the boat-tail's allowance for the boundary layer is measured at Mach 1.91 only (NACA RM E51F26), so its drag is served at Mach ${low} to ${high} only`,
    );
  }
  const angle = (boatTailAngle(body) * 180) / Math.PI;
  const [a0, a1] = BOAT_TAIL_ANGLE_RANGE;
  if (!(angle >= a0 - 1e-9 && angle <= a1 + 1e-9)) {
    reasons.push(
      `a boat-tail of ${angle.toFixed(1)} deg lies outside the angles checked against the method of characteristics (${a0} to ${a1} deg)`,
    );
  }
  const calibers = tail.length / (2 * body.nose.baseRadius);
  const [l0, l1] = BOAT_TAIL_LENGTH_RANGE;
  if (!(calibers >= l0 - 1e-9 && calibers <= l1 + 1e-9)) {
    reasons.push(
      `a boat-tail ${calibers.toFixed(2)} calibers long lies outside the lengths checked against the method of characteristics (${l0} to ${l1} calibers)`,
    );
  }
  if (!BOAT_TAIL_ALLOWANCE_SET) {
    reasons.push(
      "the boat-tail's allowance for the boundary layer waits for its figures (NACA RM E51F26, named in design record 0014 section 10.7 (ae)) to be read twice",
    );
  }
  return reasons.length > 0 ? reasons.join('; ') : undefined;
}
