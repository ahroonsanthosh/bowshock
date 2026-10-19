/**
 * Fin planforms: one exposed panel from the root (on the body wall, y = 0)
 * to the tip (y = span), with straight leading and trailing edges and a
 * streamwise tip. x runs downstream from the root leading edge.
 *
 *   leading edge:  x = y tan(LE sweep)
 *   trailing edge: x = rootChord + y tan(TE sweep)
 *   chord:         c(y) = rootChord + y (tan(TE sweep) - tan(LE sweep))
 *
 * Trapezoidal planforms have any trailing-edge sweep; a clipped delta has
 * an unswept trailing edge and is given by its taper ratio. Leading edges
 * swept forward are refused (not verified).
 */

import { FinRefusal } from './refusal';

export interface Planform {
  readonly rootChord: number;
  /** Exposed span, root to tip. */
  readonly span: number;
  /** tan of the leading-edge sweep, >= 0 (swept back). */
  readonly tanLeadingEdge: number;
  /** tan of the trailing-edge sweep (positive: swept back). */
  readonly tanTrailingEdge: number;
}

/** A trapezoidal planform from its sweep angles (radians). */
export function trapezoidalPlanform(p: {
  readonly rootChord: number;
  readonly span: number;
  readonly leadingEdgeSweep: number;
  readonly trailingEdgeSweep?: number;
}): Planform {
  const planform = {
    rootChord: p.rootChord,
    span: p.span,
    tanLeadingEdge: Math.tan(p.leadingEdgeSweep),
    tanTrailingEdge: Math.tan(p.trailingEdgeSweep ?? 0),
  };
  validatePlanform(planform);
  return planform;
}

/** A clipped delta: unswept trailing edge, tip chord = taper ratio times root chord. */
export function clippedDeltaPlanform(p: {
  readonly rootChord: number;
  readonly span: number;
  readonly taperRatio: number;
}): Planform {
  if (!(p.taperRatio > 0 && p.taperRatio <= 1)) {
    throw new FinRefusal('planform', 'a clipped delta needs a taper ratio in (0, 1]');
  }
  const planform = {
    rootChord: p.rootChord,
    span: p.span,
    tanLeadingEdge: (p.rootChord * (1 - p.taperRatio)) / p.span,
    tanTrailingEdge: 0,
  };
  validatePlanform(planform);
  return planform;
}

export function tipChord(p: Planform): number {
  return p.rootChord + p.span * (p.tanTrailingEdge - p.tanLeadingEdge);
}

export function chordAt(p: Planform, y: number): number {
  return p.rootChord + Math.abs(y) * (p.tanTrailingEdge - p.tanLeadingEdge);
}

/** Planform area of the exposed panel. */
export function planformArea(p: Planform): number {
  return (p.span * (p.rootChord + tipChord(p))) / 2;
}

/** beta cot(LE sweep): above 1 the leading edge is supersonic. Infinity when unswept. */
export function leadingEdgeMachParameter(p: Planform, mach: number): number {
  const beta = Math.sqrt(mach * mach - 1);
  return p.tanLeadingEdge > 0 ? beta / p.tanLeadingEdge : Infinity;
}

export function validatePlanform(p: Planform): void {
  for (const v of [p.rootChord, p.span, p.tanLeadingEdge, p.tanTrailingEdge]) {
    if (!Number.isFinite(v)) throw new FinRefusal('planform', 'the planform must be finite');
  }
  if (!(p.rootChord > 0 && p.span > 0)) {
    throw new FinRefusal('planform', 'the root chord and span must be positive');
  }
  if (p.tanLeadingEdge < 0) {
    throw new FinRefusal('planform', 'leading edges swept forward are not supported');
  }
  if (!(tipChord(p) > 0)) {
    throw new FinRefusal('planform', 'the tip chord must be positive');
  }
}
