/**
 * Which refusals of the drag page and its libraries a rocket at a flight
 * condition triggers (docs/design/0014-refusals.md, the inventory). Each
 * condition is tested on its own, mirroring the code it names, so that a
 * case refused for several reasons lists all of them (the libraries stop at
 * the first). `libraryRefused` cross-checks the decomposition against the
 * library itself where the library can represent the rocket.
 *
 * Nose: the page's shapes (src/app/nose-drag.ts), Mach 1.2 and above (the
 * page's input), and for sharp tips the solver's own tip tests
 * (sharpFitProblem, src/analysis/fitted-flow.ts) and the fitted grids' wall
 * gate (50 deg, so tips up to 40 deg; src/grid/quality.ts). Not modelled:
 * the grid gates on long bodies (a fallback family exists), fits that do not
 * converge, and families whose band cannot be measured ("not verified"):
 * these can only be known by solving, so the nose is counted as served
 * wherever the documented domain serves it.
 */

import { sharpFitProblem } from '../../../src/analysis/fitted-flow';
import { FinRefusal } from '../../../src/fins/refusal';
import { exactSectionDrag } from '../../../src/fins/section-drag';
import { doubleWedge, hexagonal, singleWedge, type SymmetricSection } from '../../../src/fins/section';
import { trapezoidalPlanform } from '../../../src/fins/planform';
import type { Body } from '../../../src/geometry/body';
import { noseTipSlope, type NoseShape } from '../../../src/geometry/nose';
import { finnedBodyComponents, type FinnedBody } from '../../../src/total/finned-body';
import type { DragComponent } from '../../../src/total/total-drag';
import { taylorMaccoll } from '../../../src/validation/taylor-maccoll';
import { atmosphere, type NoseKind, type Rocket } from './population';

const DEG = Math.PI / 180;

export const REASONS = {
  // Nose (the page's solve).
  noseMach: 'nose: Mach below 1.2 (page input and solver; transonic solver in progress, 0013)',
  noseHaack: 'nose: Haack (Von Karman, LV) or power-series shape not served (two-scale grids in progress)',
  noseTip: 'nose: rounded (blunted) tip not represented',
  noseDetached: 'nose: tip shock detaches',
  noseSubsonicTip: 'nose: axially subsonic tip flow (at a corner, or subsonic on the surface)',
  noseSteep: 'nose: tip steeper than 40 deg (fitted grids wall gate)',
  noseEllipsoid: 'nose: ellipsoid outside the measured domain',
  // Fin sections and leading edges.
  squareLe: 'fins: square-cut (blunt) leading edge not represented',
  roundedTe: 'fins: rounded trailing edge not represented',
  flatPlateLe: 'fins: rounded leading edge on a flat plate (the model needs a wedge, h > r)',
  roundedLeTaper: 'fins: rounded leading edge on fins of varying chord',
  roundedLeSwept: 'fins: swept rounded leading edge',
  roundedLeMach: 'fins: rounded leading edge outside M 1.49 to 3.0',
  roundedLeReynolds: 'fins: rounded leading edge outside Re_D 6.7e3 to 1e6',
  sectionDetached: 'fins: sharp section, leading-edge shock detached or subsonic behind it',
  sectionReflected: 'fins: sharp section, a wave reflected from the leading-edge shock reaches the surface',
  pageSection: 'page: section not offered (wedge-flat with a blunt trailing edge; the library takes it)',
  // Body base.
  baseMach: 'base: Mach outside 1.5 to 3.0',
  boatTail: 'base: boat-tail',
  finsNearBase: 'base: fins ending within a chord of the base',
  finsAtBaseCount: 'base: fins at the base, not four',
  finsAtBaseThickness: 'base: fins at the base, t/c outside 0.05 to 0.10',
  finsAtBaseMach: 'base: fins at the base, Mach 1.5 to 1.8 (outside 1.8 to 3.0)',
  finsAtBaseLowMach: 'base: fins at the base, Mach below 1.5 (outside 1.8 to 3.0)',
  // Fin trailing-edge base.
  teTaper: 'te: blunt trailing edge on fins of varying chord',
  teSwept: 'te: swept blunt trailing edge',
  teMach: 'te: Mach outside 1.5 to 3.2',
  teThick: 'te: thick boundary layer, c/[h Re_c^(1/5)] > 1',
} as const;

export type ReasonKey = keyof typeof REASONS;

export function noseShape(kind: NoseKind): NoseShape {
  switch (kind) {
    case 'von-karman':
      return { kind: 'haack', parameter: 0 };
    case 'lv-haack':
      return { kind: 'haack', parameter: 1 / 3 };
    case 'tangent-ogive':
      return { kind: 'ogive', parameter: 1 };
    case 'conical':
      return { kind: 'conical' };
    case 'ellipsoid':
      return { kind: 'ellipsoid' };
    case 'parabolic':
      return { kind: 'parabolic', parameter: 1 };
    case 'power-half':
      return { kind: 'power', exponent: 0.5 };
  }
}

/** The nose and body in calibres (base radius 0.5), as the page builds it. */
export function calibreBody(r: Rocket): Body {
  return {
    nose: { shape: noseShape(r.nose), length: r.noseFineness, baseRadius: 0.5 },
    cylinderLength: r.overallFineness - r.noseFineness,
  };
}

const noseCache = new Map<string, ReasonKey[]>();

/** Refusals of the nose solve on the page (a rounded tip aside). */
export function noseReasons(r: Rocket, mach: number): ReasonKey[] {
  const out: ReasonKey[] = [];
  if (mach < 1.2) out.push('noseMach');
  if (r.tipRadiusRatio > 0) out.push('noseTip');
  if (r.nose === 'von-karman' || r.nose === 'lv-haack' || r.nose === 'power-half') {
    out.push('noseHaack');
    return out;
  }
  if (r.nose === 'ellipsoid') {
    // 0006 "Ellipsoids at low Mach numbers": 0.5 to 6 calibres served at
    // Mach 1.2 to 1.5 but the 6-calibre nose at 1.2; Mach 2 and 3 measured.
    if (r.noseFineness > 6 || (r.noseFineness >= 6 && mach < 1.3)) out.push('noseEllipsoid');
    return out;
  }
  // Sharp tips: the tests the solver itself makes before solving, at the
  // Mach number asked (also below 1.2, to show what would remain).
  const body = calibreBody(r);
  const tip = Math.atan(noseTipSlope(body.nose)) / DEG;
  if (tip > 40) out.push('noseSteep');
  const key = `${r.nose}|${r.noseFineness.toFixed(3)}|${r.overallFineness.toFixed(2)}|${mach.toFixed(4)}`;
  let tipReasons = noseCache.get(key);
  if (tipReasons === undefined) {
    tipReasons = [];
    // Screen with the tip cone's own solution (11 ms against sharpFitProblem's
    // 300 ms): a detached shock, or a surface flow axially supersonic by a
    // margin, decides it; between, sharpFitProblem's own test decides.
    let clear = false;
    try {
      const cone = taylorMaccoll(mach, tip * DEG, 1.4);
      clear = cone.surfaceMach * Math.cos(tip * DEG) > 1.05;
    } catch (e) {
      if (!(e instanceof RangeError && /detaches/.test(e.message))) throw e;
    }
    if (!clear) {
      try {
        sharpFitProblem(body, { mach, gamma: 1.4, nj: 20, refinement: 1 });
      } catch (e) {
        if (!(e instanceof RangeError)) throw e;
        if (/cannot stay attached/.test(e.message)) tipReasons.push('noseDetached');
        else if (/starting plane|subsonic at the surface/.test(e.message)) tipReasons.push('noseSubsonicTip');
        else throw e;
      }
    }
    noseCache.set(key, tipReasons);
  }
  out.push(...tipReasons);
  return out;
}

export interface Condition {
  readonly mach: number;
  readonly altitudeKm: number;
}

/** The section in chord units the library would take, or undefined where it has none. */
export function librarySection(r: Rocket): SymmetricSection | undefined {
  const tc = r.thickness / r.rootChord;
  const bevel = r.thickness / 2 / Math.tan(r.bevelDeg * DEG) / r.rootChord;
  switch (r.section) {
    case 'bevel-both':
      return hexagonal(tc, bevel, bevel);
    case 'bevel-le-square-te':
      return { x: [0, bevel, 1], halfThickness: [0, tc / 2, tc / 2], bluntTrailingEdge: true };
    case 'double-wedge':
      return doubleWedge(tc, 0.5);
    case 'rounded-le-square-te':
      // The page's only form for a rounded edge: a single wedge to a blunt
      // trailing edge as thick as the plate, with the plate's radius; the
      // library refuses it (h = r).
      return singleWedge(tc);
    case 'rounded-both':
    case 'square-both':
      return undefined;
  }
}

const bluntTrailingEdge = (r: Rocket) =>
  r.section === 'rounded-le-square-te' || r.section === 'square-both' || r.section === 'bevel-le-square-te';
const roundedLeadingEdge = (r: Rocket) => r.section === 'rounded-le-square-te' || r.section === 'rounded-both';

/** Refusals of every component but the nose, each condition on its own. */
export function totalReasons(r: Rocket, c: Condition): ReasonKey[] {
  const out: ReasonKey[] = [];
  const { mach } = c;
  const air = atmosphere(c.altitudeKm);
  const rePerMetre = (air.rho * air.a * mach) / air.mu;
  const tanLe = Math.tan(r.leadingEdgeSweepDeg * DEG);
  const tanTe = Math.tan(r.trailingEdgeSweepDeg * DEG);
  const constantChord = Math.abs(tanLe - tanTe) < 1e-9;
  const tc = r.thickness / r.rootChord;

  // Sections and edges.
  if (r.section === 'square-both') out.push('squareLe');
  if (r.section === 'rounded-both') out.push('roundedTe');
  if (roundedLeadingEdge(r)) {
    out.push('flatPlateLe');
    if (!constantChord) out.push('roundedLeTaper');
    if (tanLe !== 0) out.push('roundedLeSwept');
    if (!(mach >= 1.49 && mach <= 3.0)) out.push('roundedLeMach');
    const reD = rePerMetre * r.thickness;
    if (!(reD >= 6.7e3 && reD <= 1e6)) out.push('roundedLeReynolds');
  }
  if (r.section === 'bevel-le-square-te') out.push('pageSection');
  if (r.section === 'bevel-both' || r.section === 'bevel-le-square-te' || r.section === 'double-wedge') {
    try {
      exactSectionDrag(librarySection(r)!, mach);
    } catch (e) {
      if (!(e instanceof FinRefusal)) throw e;
      out.push(e.reason === 'reflected-wave' ? 'sectionReflected' : 'sectionDetached');
    }
  }

  // Body base (src/base/base-drag.ts, fins-on-base.ts).
  if (!(mach >= 1.5 && mach <= 3.0)) out.push('baseMach');
  if (r.boatTail) out.push('boatTail');
  const x = r.trailingEdgeAheadChords;
  if (x > 0 && x < 1) out.push('finsNearBase');
  if (x === 0) {
    if (r.finCount !== 4) out.push('finsAtBaseCount');
    if (!(tc >= 0.05 && tc <= 0.1)) out.push('finsAtBaseThickness');
    if (!(mach >= 1.8 - 0.002 && mach <= 3.0)) out.push(mach >= 1.5 ? 'finsAtBaseMach' : 'finsAtBaseLowMach');
  }

  // Blunt fin trailing edges (src/base/fin-trailing-edge.ts, src/total).
  if (bluntTrailingEdge(r)) {
    if (!constantChord) out.push('teTaper');
    if (tanTe !== 0) out.push('teSwept');
    if (!(mach >= 1.5 && mach <= 3.2)) out.push('teMach');
    const reC = rePerMetre * r.rootChord;
    if (r.rootChord / (r.thickness * reC ** 0.2) > 1) out.push('teThick');
  }
  return out;
}

const DUMMY_NOSE: DragComponent = { name: 'nose wave drag', cd: 0, low: 0, high: 0, label: '', band: '' };

/**
 * The library's own verdict (src/total/finned-body.ts) for a rocket it can
 * represent: true if any component is refused. Undefined where the library
 * has no section for it.
 */
export function libraryRefused(r: Rocket, c: Condition): boolean | undefined {
  const section = librarySection(r);
  if (section === undefined) return undefined;
  const air = atmosphere(c.altitudeKm);
  const L = r.overallFineness * r.diameter;
  const Ln = r.noseFineness * r.diameter;
  const config: FinnedBody = {
    body: { nose: { shape: noseShape(r.nose), length: Ln, baseRadius: r.diameter / 2 }, cylinderLength: L - Ln },
    afterbody: r.boatTail ? 'boat-tail' : 'cylinder',
    fins: {
      count: r.finCount,
      planform: trapezoidalPlanform({
        rootChord: r.rootChord,
        span: r.span,
        leadingEdgeSweep: r.leadingEdgeSweepDeg * DEG,
        trailingEdgeSweep: r.trailingEdgeSweepDeg * DEG,
      }),
      section,
      sectionFamily: 'other',
      leadingEdgeRadius: roundedLeadingEdge(r) ? r.thickness / 2 : 0,
      trailingEdgeAheadOfBase: r.trailingEdgeAheadChords * r.rootChord,
    },
  };
  const parts = finnedBodyComponents(
    config,
    { mach: c.mach, temperature: air.t, reynoldsPerLength: (air.rho * air.a * c.mach) / air.mu },
    DUMMY_NOSE,
  );
  return parts.refusals.length > 0;
}
