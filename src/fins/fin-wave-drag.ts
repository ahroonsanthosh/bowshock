/**
 * Thickness wave drag of a fin: the exact 2D section drag
 * (./section-drag.ts) times the ratio of linear 3D to strip-theory drag of
 * the planform (./linear-wave-drag.ts), the method of step B4 of the
 * total-drag plan. Nothing here is served yet; see
 * docs/design/0009-fin-wave-drag.md for what is verified and what is not.
 */

import { exactSectionDrag, type SectionDragOptions } from './section-drag';
import { DEFAULT_RESOLUTION, linearWaveDrag, type LinearDragResolution } from './linear-wave-drag';
import type { Planform } from './planform';
import type { SymmetricSection } from './section';

export interface StripTheoryRatio {
  /** Linear 3D over strip-theory thickness drag. */
  readonly ratio: number;
  /** Estimated quadrature error of the ratio, absolute. */
  readonly quadratureError: number;
}

/**
 * Ratio of the linear 3D thickness drag of a fin on a plane wall (the fin
 * and its image in the wall) to strip theory on the same planform, at the
 * free-stream Mach number. In linear theory it does not depend on the
 * thickness ratio, only on the planform, the section's shape and beta.
 *
 * What strip theory misses, as measured by tests/fins/fin-wave-drag.test.ts
 * on ten planforms with double-wedge and hexagonal sections at Mach 1.2,
 * 1.5, 2, 2.5 and 3 (table in 0009, section 4); B = beta cot(LE sweep), the
 * leading edge supersonic for B > 1; the ratio minus one is the 3D drag's
 * difference from strip theory's:
 *
 * - B above 2, span at least half the root chord: within 6% (ratios 1.000
 *   to 1.059).
 * - B between 1 and 2: up to 20%, the 3D drag always the higher (ratios
 *   1.024 to 1.196).
 * - Subsonic leading edges (B below 1): from 58% below to 10% above
 *   (ratios 0.421 to 1.101); for the 71.6 deg planform of RM A53D02 at
 *   Mach 1.2 strip theory gives 2.4 times the 3D drag.
 * - Short spans, whatever B: a rectangle of span 0.2 chords (B infinite)
 *   has ratios 0.654, 0.865 and 0.981 at Mach 1.2, 1.5 and 2.
 * - The rectangle of span equal to the chord: 1 at every Mach number, the
 *   tip effects cancelling in the total (not station by station).
 *
 * These are statements about the planforms measured, not a law. The ratio
 * is linear theory's: how well linear theory itself predicts the 3D wave
 * drag of fins has not been measured against data or a 3D solution.
 */
export function stripTheoryRatio(
  planform: Planform,
  section: SymmetricSection,
  mach: number,
  resolution: LinearDragResolution = DEFAULT_RESOLUTION,
): StripTheoryRatio {
  const r = linearWaveDrag(planform, section, mach, resolution);
  return { ratio: r.ratio, quadratureError: r.quadratureError };
}

export interface FinWaveDrag {
  /** Exact inviscid 2D drag of the section, on the chord. */
  readonly sectionCd: number;
  /** Ratio of linear 3D to strip-theory drag (`stripTheoryRatio`). */
  readonly ratio: number;
  /** sectionCd times ratio: one fin's wave drag, both faces, on its planform area. */
  readonly cd: number;
  /** Quadrature error of cd from that of the ratio (the section drag is exact). */
  readonly quadratureError: number;
  /** False when the section drag neglects reflected waves (see ./section-drag.ts). */
  readonly exactSection: boolean;
}

/**
 * One fin's thickness wave drag at zero incidence, on its planform area:
 * the exact 2D section drag (the same at every station, since the section
 * keeps its shape and thickness ratio along the span) times the 3D to
 * strip ratio. The product assumes the nonlinear (exact over Ackeret)
 * section correction applies unchanged in 3D; that assumption has not been
 * measured. Refuses (FinRefusal) whatever the section method refuses.
 */
export function finWaveDrag(
  planform: Planform,
  section: SymmetricSection,
  mach: number,
  options: SectionDragOptions & { readonly resolution?: LinearDragResolution } = {},
): FinWaveDrag {
  const exact = exactSectionDrag(section, mach, options);
  const r = stripTheoryRatio(planform, section, mach, options.resolution);
  return {
    sectionCd: exact.cd,
    ratio: r.ratio,
    cd: exact.cd * r.ratio,
    quadratureError: exact.cd * r.quadratureError,
    exactSection: exact.exact,
  };
}
