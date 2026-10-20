/**
 * The vacuum bound on base drag. A base cannot carry less than zero
 * absolute pressure, so its pressure coefficient P_B = (p_b - p_inf) /
 * q_inf is at least -2 / (gamma M^2), and its drag on its own area at most
 *
 *   -P_B = 2 / (gamma M^2).
 *
 * A base drag above this implies a negative absolute base pressure. No
 * base drag term, and no end of any band or input band on a base term, may
 * exceed it: src/base clamps every such value there and says which it
 * clamped (docs/design/0010-base-drag-and-total.md, section 10, round 5).
 */

const GAMMA = 1.4;

/** The base drag at zero base pressure, on the base's own area: 2 / (gamma M^2). */
export function vacuumBaseDrag(mach: number, gamma = GAMMA): number {
  if (!(mach > 0 && Number.isFinite(mach))) throw new RangeError(`bad Mach number ${mach}`);
  return 2 / (gamma * mach * mach);
}
