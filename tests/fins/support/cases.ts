/**
 * The fins measured in docs/design/0009-fin-wave-drag.md: the eight of the
 * research's fin_cases.py (A to G, with C-hex; the keys of
 * docs/research/total-drag/data/fin_linear_theory_results.json begin with
 * `research`), the rectangle of span 0.2 chords the research and the audit
 * also ran, and one planform with its trailing edge swept forward (H),
 * added here. Double wedges of t/c 0.05 with the ridge at mid chord unless
 * stated (the ratios do not depend on t/c).
 */

import type { Planform } from '../../../src/fins/planform';
import { doubleWedge, hexagonal, type SymmetricSection } from '../../../src/fins/section';

export interface FinCase {
  readonly name: string;
  readonly research: string;
  readonly description: string;
  readonly planform: Planform;
  readonly section: SymmetricSection;
}

const deg = Math.PI / 180;
const tc = 0.05;
const trapezoid = (
  rootChord: number,
  span: number,
  tanLeadingEdge: number,
  tanTrailingEdge = 0,
) => ({
  rootChord,
  span,
  tanLeadingEdge,
  tanTrailingEdge,
});

export const FINS: readonly FinCase[] = [
  {
    name: 'A',
    research: 'A',
    description:
      'ARCAS fin (TN D-4014 fig. 1(b)): root 3.38, span 2.103, LE 30 deg, ridge at 0.536 c',
    planform: trapezoid(3.38, 2.103, Math.tan(30 * deg)),
    section: doubleWedge(tc, 0.536),
  },
  {
    name: 'B',
    research: 'B',
    description: 'clipped delta: root 1, span 0.5, LE 45 deg, taper 0.5',
    planform: trapezoid(1, 0.5, 1),
    section: doubleWedge(tc),
  },
  {
    name: 'C',
    research: 'C',
    description: 'trapezoid: root 1, span 1, LE 26.6 deg, taper 0.5',
    planform: trapezoid(1, 1, 0.5),
    section: doubleWedge(tc),
  },
  {
    name: 'C-hex',
    research: 'C-hex',
    description: 'the same planform, hexagonal section with 15% bevels',
    planform: trapezoid(1, 1, 0.5),
    section: hexagonal(tc, 0.15),
  },
  {
    name: 'D',
    research: 'D',
    description: 'rectangle: chord 1, span 1',
    planform: trapezoid(1, 1, 0),
    section: doubleWedge(tc),
  },
  {
    name: 'E',
    research: 'E',
    description: 'swept trailing edge: root 1, span 0.75, LE 45 deg, TE 16.7 deg, taper 0.475',
    planform: trapezoid(1, 0.75, 1, 0.3),
    section: doubleWedge(tc),
  },
  {
    name: 'F',
    research: 'F',
    description:
      'RM A53D02 planform: root 0.75, span 0.125, LE 71.6 deg (double wedge, not its section)',
    planform: trapezoid(0.75, 0.125, 3),
    section: doubleWedge(tc),
  },
  {
    name: 'G',
    research: 'G',
    description: 'clipped delta: root 1, span 1, LE 36.9 deg, taper 0.25',
    planform: trapezoid(1, 1, 0.75),
    section: doubleWedge(tc),
  },
  {
    name: 'R02',
    research: '',
    description: 'rectangle: chord 1, span 0.2',
    planform: trapezoid(1, 0.2, 0),
    section: doubleWedge(tc),
  },
  {
    name: 'H',
    research: '',
    description:
      'trailing edge swept forward: root 1, span 0.6, LE 45 deg, TE -16.7 deg, taper 0.22',
    planform: trapezoid(1, 0.6, 1, -0.3),
    section: doubleWedge(tc),
  },
];

export const MACHS = [1.2, 1.5, 2, 2.5, 3] as const;
