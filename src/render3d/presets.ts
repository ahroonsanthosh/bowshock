/**
 * Rockets for the 3D view from the shapes bowshock already has: the
 * Basic Finner of the validation, and the drag page's form (its body and
 * fins, in calibres, as the drag logic reads them).
 */

import { configurationOf, type TotalDragForm } from '../app/total-drag';
import { singleWedge } from '../fins/section';
import { BASIC_FINNER_GEOMETRY, basicFinnerBodyAsTyped } from '../validation/basic-finner';
import type { Rocket } from './rocket-mesh';

/** The Basic Finner with its four fins (geometry only), the first fin along +y. */
export function basicFinnerRocket(): Rocket {
  const g = BASIC_FINNER_GEOMETRY;
  return {
    body: basicFinnerBodyAsTyped(),
    fins: {
      count: g.finCount,
      planform: { rootChord: g.finChord, span: g.finSpan, tanLeadingEdge: 0, tanTrailingEdge: 0 },
      section: singleWedge(g.finTrailingEdgeThickness / g.finChord),
      trailingEdgeAheadOfBase: 0,
      roll: 0,
    },
  };
}

/**
 * The drag page's rocket: its body, and its fins where the drag logic
 * accepts them (configurationOf); the body alone where it refuses the case.
 */
export function rocketFromForm(form: TotalDragForm): Rocket {
  const c = configurationOf(form);
  if (c.kind !== 'ok') return { body: form.body };
  const f = c.value.config.fins;
  return {
    body: form.body,
    fins: {
      count: f.count,
      planform: f.planform,
      section: f.section,
      trailingEdgeAheadOfBase: f.trailingEdgeAheadOfBase,
      roll: 0,
    },
  };
}
