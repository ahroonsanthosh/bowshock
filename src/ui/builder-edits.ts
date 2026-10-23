/**
 * The builder's edits without the DOM (src/ui/builder.ts): what a typed
 * field reads as, and the designs an edit makes. A field that does not
 * read as a valid value is never committed to the design: the field is
 * marked and the rocket keeps its last valid value, so a cleared field
 * cannot leave a NaN in the fins' position for later edits to carry.
 */

import { aheadOfBase } from '../rocket/adapter';
import { baseStation, type FinSetDesign, type RocketDesign } from '../rocket/design';
import { toMetres, type LengthUnit } from '../rocket/units';

/** A typed length in metres, or null where it is not one (empty, not a number, negative, or zero where zero is not allowed). */
export function typedLength(text: string, unit: LengthUnit, zeroAllowed: boolean): number | null {
  const typed = text.trim() === '' ? Number.NaN : Number(text);
  const ok = Number.isFinite(typed) && (typed > 0 || (zeroAllowed && typed === 0));
  return ok ? toMetres(typed, unit) : null;
}

/** A typed number of at least `min`, or null where it is not one. */
export function typedNumber(text: string, min: number): number | null {
  const typed = text.trim() === '' ? Number.NaN : Number(text);
  return Number.isFinite(typed) && typed >= min ? typed : null;
}

/** A finite typed number (an altitude), or null. */
export function typedFinite(text: string): number | null {
  const typed = text.trim() === '' ? Number.NaN : Number(text);
  return Number.isFinite(typed) ? typed : null;
}

/** The suffix an edited preset's or import's name takes. */
export const EDITED = ' (edited)';

/**
 * The design after an edit: typed by the user, and, on the first edit of
 * a preset or an import, renamed "<name> (edited)" so that the curve, its
 * CSV and PNG never carry the preset's name for another rocket.
 */
export function edited(before: RocketDesign, after: RocketDesign): RocketDesign {
  const rename = before.source.kind !== 'typed' && !after.name.endsWith(EDITED);
  return {
    ...after,
    name: rename ? `${after.name}${EDITED}` : after.name,
    source: { kind: 'typed' },
  };
}

type Tube = Extract<RocketDesign['body'][number], { kind: 'tube' }>;
type Trapezoid = Extract<FinSetDesign['planform'], { kind: 'trapezoidal' }>;

/** The fins' trailing edges ahead of the base, m (0 within rounding, as the adapter takes it). */
export function finsAhead(design: RocketDesign): number {
  const f = design.finSets[0]!;
  return aheadOfBase(design, f.rootLeadingEdge + (f.planform as Trapezoid).rootChord);
}

/**
 * A new nose or tube length (m), the fins kept the same distance ahead of
 * the base. Each length must be valid: the caller commits only what
 * typedLength reads.
 */
export function withBodyLengths(
  design: RocketDesign,
  change: { readonly nose?: number; readonly tube?: number },
): RocketDesign {
  const ahead = finsAhead(design);
  const tube = design.body[0] as Tube;
  const moved: RocketDesign = {
    ...design,
    nose: { ...design.nose, length: change.nose ?? design.nose.length },
    body: [{ ...tube, length: change.tube ?? tube.length }],
  };
  const f = design.finSets[0]!;
  const rootChord = (f.planform as Trapezoid).rootChord;
  return {
    ...moved,
    finSets: [{ ...f, rootLeadingEdge: baseStation(moved) - ahead - rootChord }],
  };
}
