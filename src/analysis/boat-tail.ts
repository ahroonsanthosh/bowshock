/**
 * Where the boat-tail's own pressure drag is served, and why not elsewhere
 * (design record 0023 section 2.5). The term is the fitted solve's over the
 * boat-tail (`boatTailDrag`, src/analysis/fitted-flow.ts), inviscid, with
 * the viscous allowance of 0023 section 3, set only by the measured side
 * pressures that pass the checks of 0014 10.7 (ag) and its addendum of
 * 2026-10-27 (RM E51F26 is only a check). None has passed yet.
 */

import { boatTailAngle, type Body } from '../geometry/body';
import { noseTipSlope } from '../geometry/nose';

/**
 * Free-stream Mach numbers at which the boat-tail term may be served, at
 * most: those of (ae), Mach 1.8 to 2.0, and only once a set counts there
 * (0014 10.7 (ag) addendum, items 2 and 9). Sets counting at other Mach
 * numbers, as that addendum carries them, widen this line.
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
 * Whether the viscous allowance is set: false until a set named in 0014
 * 10.7 (ag) is read twice, paired, and counts by its addendum. If only one
 * angle and base ratio count, only that angle and ratio will be served.
 */
export const BOAT_TAIL_ALLOWANCE_SET: boolean = false;

/** One reason the boat-tail term is refused: a key for counting, and the plain words shown. */
export interface BoatTailReason {
  readonly key: 'bluntNose' | 'mach' | 'angle' | 'length' | 'allowance';
  readonly text: string;
}

/** Every reason a body's boat-tail term is not served at this Mach number (none if it is, or if it has no boat-tail). */
export function boatTailReasons(body: Body, mach: number): BoatTailReason[] {
  const tail = body.boatTail;
  if (tail === undefined) return [];
  const reasons: BoatTailReason[] = [];
  if (!Number.isFinite(noseTipSlope(body.nose))) {
    reasons.push({
      key: 'bluntNose',
      text: 'a boat-tail behind a blunt nose is solved but not yet checked against a reference (the method of characteristics needs the subsonic nose region solved first)',
    });
  }
  const [low, high] = BOAT_TAIL_MACH_RANGE;
  if (!(mach >= low && mach <= high)) {
    reasons.push({
      key: 'mach',
      text: `the boat-tail's allowance for the boundary layer may be served at Mach ${low.toFixed(1)} to ${high.toFixed(1)} at most: no measurement at other Mach numbers has passed its checks`,
    });
  }
  const angle = (boatTailAngle(body) * 180) / Math.PI;
  const [a0, a1] = BOAT_TAIL_ANGLE_RANGE;
  if (!(angle >= a0 - 1e-9 && angle <= a1 + 1e-9)) {
    reasons.push({
      key: 'angle',
      text: `a boat-tail of ${angle.toFixed(1)} deg lies outside the angles checked against the method of characteristics (${a0} to ${a1} deg)`,
    });
  }
  const calibers = tail.length / (2 * body.nose.baseRadius);
  const [l0, l1] = BOAT_TAIL_LENGTH_RANGE;
  if (!(calibers >= l0 - 1e-9 && calibers <= l1 + 1e-9)) {
    reasons.push({
      key: 'length',
      text: `a boat-tail ${calibers.toFixed(2)} calibers long lies outside the lengths checked against the method of characteristics (${l0} to ${l1} calibers)`,
    });
  }
  if (!BOAT_TAIL_ALLOWANCE_SET) {
    reasons.push({
      key: 'allowance',
      text: "no measurement of the boat-tail's allowance for the boundary layer has passed its checks yet (the figures named in design record 0014 section 10.7 (ag) wait to be read twice)",
    });
  }
  return reasons;
}

/** Why a body's boat-tail term is not served at this Mach number, in plain words, or undefined if it is. */
export function boatTailRefusal(body: Body, mach: number): string | undefined {
  const reasons = boatTailReasons(body, mach);
  return reasons.length > 0 ? reasons.map((r) => r.text).join('; ') : undefined;
}
