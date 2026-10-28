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

import { bluntNoseRefusal, sharpFitProblem } from '../../../src/analysis/fitted-flow';
import { bodyBaseDrag } from '../../../src/base/base-drag';
import { BaseRefusal } from '../../../src/base/refusal';
import { FinRefusal } from '../../../src/fins/refusal';
import { exactSectionDrag } from '../../../src/fins/section-drag';
import { doubleWedge, flatPlate, hexagonal, type FlatPlate, type SymmetricSection } from '../../../src/fins/section';
import { trapezoidalPlanform } from '../../../src/fins/planform';
import type { Body } from '../../../src/geometry/body';
import { noseTipSlope, type NoseShape } from '../../../src/geometry/nose';
import { baseFinsOf, finnedBodyComponents, type FinnedBody } from '../../../src/total/finned-body';
import type { DragComponent } from '../../../src/total/total-drag';
import { taylorMaccoll } from '../../../src/validation/taylor-maccoll';
import { atmosphere, type NoseKind, type Rocket } from './population';

const DEG = Math.PI / 180;

/**
 * The code these refusals mirror. 'w4e' (the default since
 * docs/design/0016-fin-edges-of-flat-plates.md section 11): as 'w34', and a
 * flat plate's rounded leading edge from normal Mach number 1.0. 'w34'
 * (0016 sections 1 to 10, EDGES=w34): flat plates served, rounded leading
 * edges on any planform swept to 60 deg at normal Mach numbers 1.49 to 3.0
 * (normal-component Reynolds number), blunt trailing edges on fins of
 * varying chord and with layers to c/[h Re_c^(1/5)] 4.5 (to 1.0 above M
 * 3.1). 'before': the code 0014 measured (EDGES=before).
 */
export const EDGES: 'w4e' | 'w34' | 'before' =
  process.env.EDGES === 'before' ? 'before' : process.env.EDGES === 'w34' ? 'w34' : 'w4e';
/** The lowest normal Mach number served on a plate's rounded leading edge. */
const LE_NORMAL_MACH_FLOOR = EDGES === 'w4e' ? 1.0 : 1.49;

export const REASONS = {
  // Nose (the page's solve).
  noseMach: 'nose: Mach below 1.2 (page input and solver; transonic solver in progress, 0013)',
  noseHaack:
    'nose: Haack or power-series shape not served (only the Von Karman nose, inside the lengths and Mach numbers checked against a reference)',
  noseTip: 'nose: rounded (blunted) tip not represented',
  noseDetached: 'nose: tip shock detaches',
  noseSubsonicTip: 'nose: axially subsonic tip flow (at a corner, or subsonic on the surface)',
  noseSteep: 'nose: tip steeper than 40 deg (fitted grids wall gate)',
  noseEllipsoid: 'nose: ellipsoid outside the measured domain',
  // Fin sections and leading edges.
  squareLe:
    EDGES !== 'before'
      ? 'fins: square-cut (blunt) leading edge (bounded; the ordering not shown, 0016)'
      : 'fins: square-cut (blunt) leading edge not represented',
  roundedTe:
    EDGES !== 'before'
      ? 'fins: rounded trailing edge (bounded; the ordering not shown, 0016)'
      : 'fins: rounded trailing edge not represented',
  flatPlateLe:
    EDGES !== 'before'
      ? 'fins: rounded leading edge on a flat plate (lifted by 0016)'
      : 'fins: rounded leading edge on a flat plate (the model needs a wedge, h > r)',
  roundedLeTaper:
    EDGES !== 'before'
      ? 'fins: rounded leading edge on fins of varying chord (lifted by 0016)'
      : 'fins: rounded leading edge on fins of varying chord',
  roundedLeSwept:
    EDGES !== 'before' ? 'fins: rounded leading edge swept beyond 60 deg' : 'fins: swept rounded leading edge',
  roundedLeMach:
    EDGES === 'w4e'
      ? 'fins: rounded leading edge, normal Mach number M cos(sweep) outside 1.0 to 3.0 (on a flat plate, 0016)'
      : EDGES === 'w34'
        ? 'fins: rounded leading edge, normal Mach number M cos(sweep) outside 1.49 to 3.0'
        : 'fins: rounded leading edge outside M 1.49 to 3.0',
  roundedLeReynolds:
    EDGES !== 'before'
      ? 'fins: rounded leading edge outside Re_D 6.7e3 to 1e6 (normal component)'
      : 'fins: rounded leading edge outside Re_D 6.7e3 to 1e6',
  sectionDetached: 'fins: sharp section, leading-edge shock detached or subsonic behind it',
  sectionReflected: 'fins: sharp section, a wave reflected from the leading-edge shock reaches the surface',
  pageSection: 'page: section not offered (wedge-flat with a blunt trailing edge; the library takes it)',
  finsOwnDragMach:
    "fins: below Mach 1.5, fin friction and the wave drag of sharp sections (the fins' own-drag band, ARCAS, is measured at Mach 1.5 to 2.96 only, 0014 section 10.7 (f))",
  // Body base.
  baseMach: 'base: Mach outside 1.0 to 3.0 (below 1.5: W2, 0015 section 11)',
  boatTail: 'base: boat-tail',
  finsNearBase: 'base: fins ending ahead of the base where TN 2360 does not measure them (below Mach 1.5 or above 2.0, another root chord than 1.5 body diameters, or more than a chord ahead; 0014 section 10.7 (ad))',
  finsAtBaseCount: 'base: fins at the base, not four',
  finsAtBaseThickness: 'base: fins at the base, t/c outside 0.05 to 0.10 (since 0016 section 18 above 0.10 only)',
  finsAtBaseSwept: 'base: fins at the base, a swept leading or trailing edge (factor measured on unswept fins; 2026-10-21)',
  finsAtBasePlate: 'base: fins at the base, flat plates (RM L52E06 fig. 7 measures relief, outside the factor; 2026-10-21)',
  finsAtBaseMach: 'base: fins at the base, Mach 1.5 to 1.8 (outside 1.8 to 3.0)',
  finsAtBaseLowMach: 'base: fins at the base, Mach below 1.0 (the rebuilt factor from 1.0)',
  // The rebuilt factor's refusals (src/base/fins-on-base-w1.ts, 0015), where the present one refuses.
  finsW1Count: 'base (rebuilt factor): fins at the base, not two to four',
  finsW1Thickness: 'base (rebuilt factor): a section outside the 10% circular arc (steep bevels)',
  finsW1TrailingEdge: 'base (rebuilt factor): a rounded or diverging blunt trailing edge',
  finsW1Sweep: 'base (rebuilt factor): sweep not measured (leading edge 0 to 45 or above 60 deg, or trailing edge beyond it; a sharp section with a trailing edge swept aft closer to the base than 0.9 root chords, or swept forward)',
  // Fin trailing-edge base.
  teTaper:
    EDGES !== 'before'
      ? 'te: blunt trailing edge on fins of varying chord (lifted by 0016)'
      : 'te: blunt trailing edge on fins of varying chord',
  teSwept: 'te: swept blunt trailing edge',
  teMach: 'te: Mach outside 1.5 to 3.2',
  teThick:
    EDGES !== 'before'
      ? 'te: thick boundary layer, c/[h Re_c^(1/5)] > 4.5 anywhere along the span (> 1 above M 3.1)'
      : 'te: thick boundary layer, c/[h Re_c^(1/5)] > 1',
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
    // Two-scale noses: the solver's own gate (0006 "Two-scale noses"), which
    // serves the Von Karman nose inside its checked outline and refuses the rest.
    if (bluntNoseRefusal(calibreBody(r), mach) !== undefined) out.push('noseHaack');
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

/** The section the library would take, or undefined where it has none. */
export function librarySection(r: Rocket): SymmetricSection | FlatPlate | undefined {
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
      return flatPlate(r.thickness, 'rounded', 'square');
    case 'rounded-both':
      return flatPlate(r.thickness, 'rounded', 'rounded');
    case 'square-both':
      return flatPlate(r.thickness, 'square', 'square');
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
  // The body base's fin input (a plate's largest t/c at its shorter end chord, 0016 section 16) is src/total's
  // own (baseFinsOf), asked through finsOnBaseReason below.

  // Sections and edges.
  if (r.section === 'square-both') out.push('squareLe');
  if (r.section === 'rounded-both') out.push('roundedTe');
  if (roundedLeadingEdge(r) && EDGES === 'before') {
    out.push('flatPlateLe');
    if (!constantChord) out.push('roundedLeTaper');
    if (tanLe !== 0) out.push('roundedLeSwept');
    if (!(mach >= 1.49 && mach <= 3.0)) out.push('roundedLeMach');
    const reD = rePerMetre * r.thickness;
    if (!(reD >= 6.7e3 && reD <= 1e6)) out.push('roundedLeReynolds');
  } else if (roundedLeadingEdge(r)) {
    // 0016: on the normal components, to 60 deg of sweep.
    const cos = Math.cos(r.leadingEdgeSweepDeg * DEG);
    if (r.leadingEdgeSweepDeg > 60 + 1e-9) out.push('roundedLeSwept');
    else {
      if (!(mach * cos >= LE_NORMAL_MACH_FLOOR && mach * cos <= 3.0)) out.push('roundedLeMach');
      const reN = rePerMetre * r.thickness * cos;
      if (!(reN >= 6.7e3 && reN <= 1e6)) out.push('roundedLeReynolds');
    }
  }
  if (r.section === 'bevel-le-square-te') out.push('pageSection');
  // 0014 section 10.7 (f): below Mach 1.5 fin friction (every fin) and the wave drag of sharp sections
  // carry a band measured only at Mach 1.5 to 2.96, and are refused.
  if (mach < 1.5) out.push('finsOwnDragMach');
  if (r.section === 'bevel-both' || r.section === 'bevel-le-square-te' || r.section === 'double-wedge') {
    try {
      exactSectionDrag(librarySection(r)!, mach);
    } catch (e) {
      if (!(e instanceof FinRefusal)) throw e;
      out.push(e.reason === 'reflected-wave' ? 'sectionReflected' : 'sectionDetached');
    }
  }

  // Body base (src/base/base-drag.ts, fins-on-base.ts, fins-on-base-w1.ts): the present factor where
  // it serves, the rebuilt one where it refuses (0015 section 5), decided by the library itself.
  // Since W2 (0015 section 11) the body base serves Mach 1.0 to 3.0, and the rebuilt factor fins at the base
  // from 1.0 (the owner's decision of 2026-10-21); the library decides.
  if (!(mach >= 1.0 && mach <= 3.0)) out.push('baseMach');
  if (r.boatTail) out.push('boatTail');
  const x = r.trailingEdgeAheadChords;
  if (x >= 0 && mach >= 1.0 && mach <= 3.0) {
    const k = finsOnBaseReason(r, mach);
    if (k !== undefined) out.push(k);
  }

  // Blunt fin trailing edges (src/base/fin-trailing-edge.ts, src/total).
  if (bluntTrailingEdge(r) && EDGES === 'before') {
    if (!constantChord) out.push('teTaper');
    if (tanTe !== 0) out.push('teSwept');
    if (!(mach >= 1.5 && mach <= 3.2)) out.push('teMach');
    const reC = rePerMetre * r.rootChord;
    if (r.rootChord / (r.thickness * reC ** 0.2) > 1) out.push('teThick');
  } else if (bluntTrailingEdge(r)) {
    // 0016: integrated along the span; a plate's thickness the same at every station, the
    // bevelled section's (in chord units, as the library holds it) scaled with the chord.
    if (tanTe !== 0) out.push('teSwept');
    if (!(mach >= 1.5 && mach <= 3.2)) out.push('teMach');
    const tip = r.rootChord + r.span * (tanTe - tanLe);
    const x = (c: number) => {
      const h = r.section === 'bevel-le-square-te' ? (r.thickness * c) / r.rootChord : r.thickness;
      return c / (h * (rePerMetre * c) ** 0.2);
    };
    const xMax = Math.max(x(r.rootChord), x(tip));
    if (xMax > 4.5 || (xMax > 1 && mach > 3.1)) out.push('teThick');
  }
  return out;
}

/** The section of the fins as the body base sees it: the physical section, flat plates as plates. */
/**
 * The fins-on-base factor's refusal at M 1.0 to 3.0, by the library (src/base/base-drag.ts) with the fin input
 * src/total builds (baseFinsOf: a plate's largest t/c at its shorter end chord and its thinnest station, both
 * edge sweeps, the rebuilt factor's section); undefined if served.
 */
export function finsOnBaseReason(r: Rocket, mach: number): ReasonKey | undefined {
  const section = librarySection(r)!;
  try {
    bodyBaseDrag({
      mach,
      afterbody: 'cylinder',
      boundaryLayerAtBase: 'turbulent',
      baseAreaRatio: 1,
      fins: baseFinsOf({
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
      }, r.diameter),
    });
    return undefined;
  } catch (e) {
    if (!(e instanceof BaseRefusal)) throw e;
    // A rounded trailing edge has no section the rebuilt factor takes (0015 section 4): the refusal is its.
    if (r.section === 'rounded-both') return 'finsW1TrailingEdge';
    switch (e.reason) {
      case 'fin-count':
        return 'finsW1Count';
      case 'fin-thickness':
        return 'finsW1Thickness';
      case 'fin-trailing-edge':
      case 'flat-plate-fins':
        return 'finsW1TrailingEdge';
      case 'fin-sweep':
        return 'finsW1Sweep';
      case 'fins-near-base':
        return 'finsNearBase';
      case 'mach-range':
        return 'finsAtBaseLowMach';
      default:
        throw e;
    }
  }
}

const DUMMY_NOSE: DragComponent = { name: 'nose wave drag', cd: 0, low: 0, high: 0, label: '', band: '' };

/**
 * The library's own verdict (src/total/finned-body.ts) for a rocket it can
 * represent: true if any component is refused. Undefined where the library
 * has no section for it.
 */
export function libraryRefused(r: Rocket, c: Condition): boolean | undefined {
  // The library is the present code: no cross-check of the code 0014 or 0016's sections 1 to 10 measured.
  if (EDGES !== 'w4e') return undefined;
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
