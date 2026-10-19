/**
 * The nose wave drag of a sharp cone, for totals whose nose is a cone:
 * the exact Taylor-Maccoll value (src/validation/taylor-maccoll.ts), whose
 * surface pressure acts over the cone's projected area, the cross-section
 * of the cylinder behind it, so C_D on that cross-section is the cone's
 * surface pressure coefficient. The cylinder carries no pressure drag at
 * zero incidence. Its band is the fitted solver's floor, FITTED_DRAG_FLOOR
 * (7e-5 of the value, docs/design/0006-shock-fitting.md): the part of the
 * page's band that no grid family shows, so the band a fitted solve of
 * this nose could not go below. The integration's own error (about ten
 * digits) is far below it.
 *
 * Other noses take their wave drag, with its band, from the page's
 * verified solve (src/analysis/verified-drag.ts).
 */

import { FITTED_DRAG_FLOOR } from '../analysis/verified-drag';
import { taylorMaccoll } from '../validation/taylor-maccoll';
import type { DragComponent } from './total-drag';

export function exactConeNoseWaveDrag(mach: number, halfAngle: number, gamma = 1.4): DragComponent {
  const cd = taylorMaccoll(mach, halfAngle, gamma).surfacePressureCoefficient;
  return {
    name: 'nose wave drag',
    cd,
    low: cd * (1 - FITTED_DRAG_FLOOR),
    high: cd * (1 + FITTED_DRAG_FLOOR),
    label: 'exact (Taylor-Maccoll), sharp cone',
    band: `the fitted solver's floor, ${FITTED_DRAG_FLOOR} of the value (0006)`,
  };
}
