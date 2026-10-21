/**
 * Total drag of a finned body of revolution (a nose, a cylinder to a flat
 * base, a set of identical fins on the cylinder) at zero incidence, power
 * off: step B5 of docs/design/0008-total-drag.md as a library, served on
 * the drag page through src/app/total-drag.ts
 * (docs/design/0011-total-drag-on-the-page.md). Every component is on the
 * cylinder's cross-section.
 *
 * | Component | Model | Band | Label |
 * | --- | --- | --- | --- |
 * | nose wave drag | given (the page's verified solve, or ./nose.ts for a sharp cone) | given | given |
 * | body friction | van Driest II, axisymmetric momentum integral (src/friction, 0007) | measured over modelled 0.88 to 1.19 (0007) | correlation, validated on component data |
 * | fin friction | van Driest II flat plates of the local chord, both faces | fins' own drag, 1.01 to 1.59 (0008 section 4.3) | estimated on ARCAS, tested only in the total |
 * | fin wave drag | exact 2D section drag times the linear 3D ratio (src/fins, 0009); with a rounded leading edge, the faces of the tangent geometry on their own rise | the same, plus the quadrature error | as above |
 * | fin leading edges | rounded, unswept: modified-Newtonian front side (src/fins/rounded-leading-edge.ts) | 0.99 to 1.06 (TN 2960), +-3% more where extrapolated in Reynolds number | an analogy, not a measurement |
 * | body base | compiled curve times the fins-on-base factor (src/base): the present factor wherever it serves (the Basic Finner's class keeps it), the rebuilt factor of 0015 only where the present one refuses | curve 0.82 to 1.08, interpolation, fins-on-base band | correlation; the present factor measured on circular-arc fins, an analogy for others; the rebuilt factor estimated on component data, bracketed |
 * | fin trailing-edge base | blunt, unswept, turbulent: two-dimensional base pressure at the free-stream Mach number (src/base/fin-trailing-edge.ts) | 0.93 to 1.21 | an analogy, not a measurement, for edges in the base plane |
 *
 * Friction is at free-stream edge conditions, turbulent from the tip and
 * from each fin's leading edge by default, on an adiabatic wall (the
 * condition 0007's band is measured on). Inputs, each its own band beside
 * the model-form band:
 *
 * - transition: a laminar run to each Reynolds number given (on the
 *   surface distance from the tip, and from each fin's leading edge),
 *   against fully turbulent; a laminar layer at the base refuses the base.
 *   Each Reynolds number is one state of the boundary layer, and every
 *   component it reaches changes together: the friction of the body and
 *   of the fins and, where the run reaches a fin's blunt trailing edge
 *   (Re_T at least the chord Reynolds number, so the fin is laminar along
 *   its whole chord), the trailing-edge base at its laminar value
 *   (src/base/fin-trailing-edge.ts, at most the vacuum bound). Since the
 *   body's transition need not follow the fins', each state is also taken
 *   with the body turbulent. The input's ends are the lowest and highest
 *   change over the states and the fully turbulent nominal (zero); no end
 *   of one component is added to an end of another from a different state
 *   (0010 section 10, round 5, finding 7);
 * - wall temperature: the change from the adiabatic wall to the
 *   temperature given (0007's band is measured on adiabatic walls only;
 *   the change is van Driest II's and the laminar solution's, not
 *   validated against data);
 * - roughness: smooth by default, which is no band; a band supplied by the
 *   caller with its source otherwise (no roughness model is validated in
 *   bowshock: 0008 section 2.3).
 *
 * Refused, each listed with its reason (the total is refused if any is):
 * whatever src/base and src/fins refuse (among them swept rounded leading
 * edges and swept, laminar or thick-layer blunt trailing edges), a rounded
 * leading edge on anything but a single-wedge fin of constant chord, a
 * blunt trailing edge on a fin of varying chord, and a transition input
 * that leaves the boundary layer laminar at the base.
 *
 * Not represented, with their sizes where known (0010 section 3): the
 * nose's friction at its own surface state (it is taken at the free
 * stream's edge conditions; on the Basic Finner's 10 deg cone about
 * +0.0012 to +0.0035 in C_D omitted, round 5); the fins' roots do not
 * remove body wetted area and the fins' tip faces carry no friction (net
 * +0.0003 omitted on the Basic Finner); fin-body interference and the
 * body's boundary layer at the fin roots; the Mach number and pressure
 * ahead of the base are the free stream's (fig. 18's abscissa for
 * cylindrical afterbodies); fin cant and roll; a nose-tip bluntness; the
 * rounded leading edge's effect on the fin faces (the analogy's stated
 * gap). If the trailing-edge term is refused, its laminar change is in no
 * transition state; the total is refused then anyway.
 */

import {
  bodyBaseDrag,
  FINS_ON_BASE_THINNEST_DATA,
  type BaseFins,
  type BodyBaseDrag,
} from '../base/base-drag';
import {
  FIN_TRAILING_EDGE_BAND,
  finTrailingEdgeBaseDrag,
  type FinTrailingEdgeBase,
} from '../base/fin-trailing-edge';
import { BaseRefusal } from '../base/refusal';
import { finWaveDrag } from '../fins/fin-wave-drag';
import { chordAt, planformArea, tipChord, type Planform } from '../fins/planform';
import { gaussLegendre } from '../fins/quadrature';
import { FinRefusal } from '../fins/refusal';
import {
  roundedLeadingEdgeDrag,
  roundedWedge,
  type RoundedWedge,
} from '../fins/rounded-leading-edge';
import {
  isFlatPlate,
  singleWedge,
  symmetricThicknessRatio,
  type FlatPlate,
  type SymmetricSection,
} from '../fins/section';
import { bodyFriction } from '../friction/body-friction';
import { flatPlateFriction } from '../friction/flat-plate';
import type { Body } from '../geometry/body';
import {
  combineComponents,
  componentWithRatioBand,
  TotalDragRefusal,
  type ComponentRefusal,
  type DragComponent,
  type InputBand,
  type TotalDrag,
} from './total-drag';

/** 0007 section 4: measured over modelled turbulent friction, 23 comparisons. */
export const BODY_FRICTION_BAND = [0.88, 1.19] as const;
/**
 * 0008 section 4.3 and B4: measured over modelled fins' own drag (wave
 * drag and friction), from the ARCAS increments with the measured chamber
 * change removed; one-sided (the model was never above the data).
 */
export const FINS_OWN_DRAG_BAND = [1.01, 1.59] as const;

export interface FinSet {
  readonly count: number;
  /** One exposed panel, in the body's length unit. */
  readonly planform: Planform;
  /**
   * The section: in chord units, the same along the span; or a flat plate
   * of uniform thickness in the body's length unit, with its edges' shapes.
   */
  readonly section: SymmetricSection | FlatPlate;
  /** 'circular-arc' for the section of TN 3819 fig. 35's fins, else 'other'. */
  readonly sectionFamily: 'circular-arc' | 'other';
  /**
   * Leading-edge radius in the body's length unit; 0 is sharp. Not used for
   * a flat plate, whose rounded edge has half its thickness as its radius.
   */
  readonly leadingEdgeRadius: number;
  /** Distance of the root trailing edge ahead of the base, in the body's length unit. */
  readonly trailingEdgeAheadOfBase: number;
}

export interface FinnedBody {
  /** Nose and cylinder; the base is the end of the cylinder. */
  readonly body: Body;
  readonly afterbody: 'cylinder' | 'boat-tail' | 'flare';
  readonly fins: FinSet;
}

export interface FlightConditions {
  readonly mach: number;
  /** Free-stream static temperature, kelvin. */
  readonly temperature: number;
  /** Free-stream Reynolds number per unit of the body's length unit. */
  readonly reynoldsPerLength: number;
}

export interface DragInputs {
  /** Transition Reynolds numbers bounding the transition band; the nominal is fully turbulent. */
  readonly transitionReynolds?: readonly number[];
  /** A wall temperature, kelvin, bounding the wall-temperature band against the adiabatic nominal. */
  readonly wallTemperature?: number;
  /** A roughness band supplied by the caller, C_D, with its source. */
  readonly roughness?: { readonly low: number; readonly high: number; readonly source: string };
}

/** One state of the transition input: a laminar run to one Reynolds number, every component it reaches changed together. */
export interface TransitionState {
  /** The run's Reynolds number, on the surface distance from the tip and from each fin's leading edge. */
  readonly reynolds: number;
  /** True when the body is taken turbulent and only the fins carry the run. */
  readonly bodyTurbulent: boolean;
  /** Friction against fully turbulent, C_D: the body's (unless bodyTurbulent) and the fins'. */
  readonly friction: number;
  /** True when the run reaches the fins' blunt trailing edges (Re_T at least Re_c). */
  readonly laminarTrailingEdge: boolean;
  /** The trailing-edge base's change in this state, C_D (zero while the edges stay turbulent). */
  readonly trailingEdge: { readonly low: number; readonly high: number };
  /** The state's change of the total, C_D: friction plus the trailing-edge change. */
  readonly low: number;
  readonly high: number;
}

export interface FinnedBodyComponents {
  /** The components that could be computed. */
  readonly components: readonly DragComponent[];
  readonly inputs: readonly InputBand[];
  readonly refusals: readonly ComponentRefusal[];
  /** The body base's breakdown, when computed. */
  readonly base: BodyBaseDrag | undefined;
  /** The states behind the transition input band (empty without a transition input). */
  readonly transitionStates: readonly TransitionState[];
}

interface FrictionSettings {
  readonly transitionReynolds?: number;
  readonly wallTemperature?: number;
}

function frictionCds(config: FinnedBody, conditions: FlightConditions, s: FrictionSettings) {
  const { body, fins } = config;
  const radius = body.nose.baseRadius;
  const area = Math.PI * radius * radius;
  const extra = {
    ...(s.transitionReynolds === undefined ? {} : { transitionReynolds: s.transitionReynolds }),
    ...(s.wallTemperature === undefined ? {} : { wallTemperature: s.wallTemperature }),
  };
  const bodyCd = bodyFriction(body, {
    method: 'momentum-integral',
    mach: conditions.mach,
    temperature: conditions.temperature,
    reynoldsPerLength: conditions.reynoldsPerLength,
    ...extra,
  });
  // Fins: flat plates of the local chord, both faces; the axial component
  // of the shear over a face is cf times its planform projection.
  const plate = flatPlateFriction({
    mach: conditions.mach,
    temperature: conditions.temperature,
    ...extra,
  });
  const rule = gaussLegendre(16);
  const span = fins.planform.span;
  let oneFin = 0;
  for (let i = 0; i < rule.nodes.length; i++) {
    const y = 0.5 * span * (rule.nodes[i]! + 1);
    const c = chordAt(fins.planform, y);
    oneFin +=
      0.5 * span * rule.weights[i]! * 2 * c * plate.averageCf(conditions.reynoldsPerLength * c);
  }
  return {
    body: bodyCd.cd,
    fins: (fins.count * oneFin) / area,
    surfaceReynolds: bodyCd.surfaceLength * conditions.reynoldsPerLength,
  };
}

function refusalOf(component: string, e: unknown): ComponentRefusal {
  if (e instanceof BaseRefusal || e instanceof FinRefusal) {
    return { component, reason: e.reason, message: e.message };
  }
  throw e;
}

/**
 * Every component that can be computed, the input bands, and every
 * refusal. `finnedBodyTotalDrag` is the total; this is also what a
 * diagnostic of a refused total reads (never a total itself).
 */
export function finnedBodyComponents(
  config: FinnedBody,
  conditions: FlightConditions,
  nose: DragComponent,
  inputs: DragInputs = {},
): FinnedBodyComponents {
  const { body, fins } = config;
  const radius = body.nose.baseRadius;
  const area = Math.PI * radius * radius;
  const components: DragComponent[] = [nose];
  const refusals: ComponentRefusal[] = [];
  if (!(fins.count >= 1 && Number.isInteger(fins.count))) {
    throw new RangeError(`bad fin count ${fins.count}`);
  }

  const nominal = frictionCds(config, conditions, {});
  components.push(
    componentWithRatioBand(
      'body friction',
      nominal.body,
      BODY_FRICTION_BAND,
      'correlation: van Driest II, momentum integral, adiabatic wall (0007)',
      '0007: measured over modelled 0.88 to 1.19 on TN 3097 and RM L54G14',
    ),
  );
  const finsLabel = 'estimated on the ARCAS increments (TN D-4014), tested only in the total';
  const finsBand = "0008 section 4.3: fins' own drag, measured over modelled 1.01 to 1.59";
  components.push(
    componentWithRatioBand(
      'fin friction',
      nominal.fins,
      FINS_OWN_DRAG_BAND,
      `van Driest II flat plates of the local chord, adiabatic wall; ${finsLabel}`,
      finsBand,
    ),
  );

  // Fin wave drag, and the nose of a rounded leading edge.
  const constantChord = fins.planform.tanTrailingEdge === fins.planform.tanLeadingEdge;
  let rounded: RoundedWedge | undefined;
  const plate = isFlatPlate(fins.section) ? fins.section : undefined;
  if (plate !== undefined) {
    platePart(plate, config, conditions, area, components, refusals);
  } else if (fins.leadingEdgeRadius !== 0) {
    const s = fins.section as SymmetricSection;
    try {
      if (!(s.bluntTrailingEdge === true && s.x.length === 2 && constantChord)) {
        throw new FinRefusal(
          'leading-edge-geometry',
          'the rounded leading-edge model is for single-wedge fins of constant chord (0010 ' +
            'section 5); this section or planform is not represented',
        );
      }
      const c = fins.planform.rootChord;
      rounded = roundedWedge(s.halfThickness[1]!, fins.leadingEdgeRadius / c, 1);
      const nose = roundedLeadingEdgeDrag({
        mach: conditions.mach,
        radius: fins.leadingEdgeRadius,
        faceAngle: rounded.faceAngle,
        tanLeadingEdgeSweep: fins.planform.tanLeadingEdge,
        reynoldsOnDiameter: conditions.reynoldsPerLength * 2 * fins.leadingEdgeRadius,
      });
      const cd = (fins.count * nose.dragPerSpan * fins.planform.span) / area;
      components.push({
        name: 'fin leading edges',
        cd,
        low: nose.band.low * cd,
        high: nose.band.high * cd,
        label: nose.label,
        band: `${nose.transonic ? 'NASA CR-149372 and TN 2960' : 'TN 2960'}, front side over modified Newtonian, ${outward(nose.band)} (${nose.regime})`,
      });
    } catch (e) {
      refusals.push(refusalOf('fin leading edges', e));
    }
  }
  if (plate === undefined) {
    try {
      // With a rounded edge the faces are a wedge at the tangent geometry's
      // angle, on their own rise (src/fins/rounded-leading-edge.ts).
      const section =
        rounded === undefined
          ? (fins.section as SymmetricSection)
          : singleWedge(2 * Math.tan(rounded.faceAngle));
      const rise = rounded === undefined ? 1 : rounded.faceRise / Math.tan(rounded.faceAngle);
      const w = finWaveDrag(fins.planform, section, conditions.mach);
      const scale = (fins.count * planformArea(fins.planform) * rise) / area;
      const cd = w.cd * scale;
      const q = w.quadratureError * scale;
      components.push({
        name: 'fin wave drag',
        cd,
        low: FINS_OWN_DRAG_BAND[0] * cd - q,
        high: FINS_OWN_DRAG_BAND[1] * cd + q,
        label:
          `exact section drag times the linear 3D ratio (0009)` +
          (rounded === undefined ? '' : ', the faces of the rounded wedge') +
          `; ${finsLabel}`,
        band: `${finsBand}, and the quadrature error`,
      });
    } catch (e) {
      refusals.push(refusalOf('fin wave drag', e));
    }
  }

  // Inputs. The friction of each transition state; the states are formed
  // once the trailing edges' laminar term is known (below).
  const transitions = inputs.transitionReynolds ?? [];
  const runs = transitions.map((reT) => {
    if (!(reT > 0 && Number.isFinite(reT))) {
      throw new RangeError(`a transition Reynolds number must be positive and finite, got ${reT}`);
    }
    const f = frictionCds(config, conditions, { transitionReynolds: reT });
    return { reT, body: f.body - nominal.body, fins: f.fins - nominal.fins };
  });
  // A transition input at or beyond the base leaves the layer laminar there.
  const laminarBase = transitions.some((reT) => reT >= nominal.surfaceReynolds);
  let wallBand: InputBand | undefined;
  if (inputs.wallTemperature !== undefined) {
    const f = frictionCds(config, conditions, { wallTemperature: inputs.wallTemperature });
    const d = f.body + f.fins - nominal.body - nominal.fins;
    wallBand = {
      name: 'wall temperature',
      low: Math.min(0, d),
      high: Math.max(0, d),
      label:
        `input: the wall from adiabatic to ${inputs.wallTemperature} K; 0007's friction band is ` +
        'measured on adiabatic walls only',
    };
  }
  const roughnessBand: InputBand =
    inputs.roughness === undefined
      ? {
          name: 'roughness',
          low: 0,
          high: 0,
          label: 'smooth wall assumed; roughness not modelled (0008 section 2.3)',
        }
      : {
          name: 'roughness',
          low: inputs.roughness.low,
          high: inputs.roughness.high,
          label: `input: roughness, ${inputs.roughness.source}`,
        };

  // Body base.
  let base: BodyBaseDrag | undefined;
  try {
    base = bodyBaseDrag({
      mach: conditions.mach,
      afterbody: config.afterbody,
      boundaryLayerAtBase: laminarBase ? 'laminar' : 'turbulent',
      baseAreaRatio: 1,
      fins: baseFinsOf(fins),
    });
    components.push({
      name: 'body base',
      cd: base.cd,
      low: base.low,
      high: base.high,
      label: base.labels.join('; '),
      band:
        (base.curveBand.source === 'w2'
          ? `curve ${base.curveBand.low.toFixed(2)} to ${base.curveBand.high.toFixed(2)} below Mach 1.5 (0015 section 11), interpolation, `
          : 'curve 0.82 to 1.08 (0008 section 3.3), interpolation, ') +
        (base.finsOnBaseSource === 'rebuilt'
          ? "the rebuilt fins-on-base factor's band (0015)"
          : 'fins-on-base band (section 3.4)'),
    });
  } catch (e) {
    refusals.push(refusalOf('body base', e));
  }

  // Fin trailing-edge base: none for sharp trailing edges. On fins of
  // varying chord the term is integrated along the span (0016, W3(b)): a
  // plate's thickness is the same at every station, a section's scales
  // with the chord.
  let te: FinTrailingEdgeBase | undefined;
  const blunt =
    plate === undefined ? (fins.section as SymmetricSection).bluntTrailingEdge === true : true;
  if (blunt) {
    const root = fins.planform.rootChord;
    const tip = tipChord(fins.planform);
    let rootThickness: number;
    let tipThickness: number;
    if (plate === undefined) {
      const h = (fins.section as SymmetricSection).halfThickness;
      rootThickness = 2 * h[h.length - 1]! * root;
      tipThickness = 2 * h[h.length - 1]! * tip;
    } else {
      rootThickness = plate.thickness;
      tipThickness = plate.thickness;
    }
    try {
      if (plate !== undefined && plate.trailingEdge === 'rounded') {
        throw new BaseRefusal(
          'rounded-trailing-edge',
          'a rounded trailing edge is refused: "bounded, not measured" (0014 section 10.2) needs ' +
            "it shown to carry no more than the square edge's base drag, and the nearest " +
            "measurement contradicts that: TN 2960's cylinder rear side is 1.35 and 1.16 times a " +
            'square base of the same height at M 1.49 and 1.98 (0016)',
        );
      }
      te = finTrailingEdgeBaseDrag({
        mach: conditions.mach,
        count: fins.count,
        thickness: rootThickness,
        span: fins.planform.span,
        chord: root,
        ...(constantChord ? {} : { tipChord: tip, tipThickness }),
        tanSweep: fins.planform.tanTrailingEdge,
        inBasePlane: fins.trailingEdgeAheadOfBase === 0,
        layer: 'turbulent',
        reynoldsPerLength: conditions.reynoldsPerLength,
        transitionReynolds: transitions,
        referenceArea: area,
      });
      components.push({
        name: 'fin trailing-edge base',
        cd: te.cd,
        low: te.low,
        high: te.high,
        label: te.label,
        band: `two-dimensional base pressure, ${FIN_TRAILING_EDGE_BAND.low} to ${FIN_TRAILING_EDGE_BAND.high} (0008 section 3.4, 0010 section 5)`,
      });
    } catch (e) {
      te = undefined;
      refusals.push(refusalOf('fin trailing-edge base', e));
    }
  }

  // The transition input: each Reynolds number one state of the boundary
  // layer, on the body and the fins, or on the fins with the body turbulent.
  const laminarEdge =
    te?.laminarTerm === undefined
      ? undefined
      : {
          chordReynolds: te.chordReynolds,
          low: te.laminarTerm.low - te.cd,
          high: te.laminarTerm.high - te.cd,
        };
  const transitionStates: TransitionState[] = [];
  for (const [i, run] of runs.entries()) {
    // On fins of varying chord, the part of the span the run reaches (0016).
    const partial = te?.laminarStates?.[i];
    const laminarTrailingEdge =
      partial !== undefined
        ? partial.laminarSpanFraction > 0
        : laminarEdge !== undefined && run.reT >= laminarEdge.chordReynolds;
    const trailingEdge =
      partial !== undefined
        ? { low: partial.low, high: partial.high }
        : laminarTrailingEdge
          ? { low: laminarEdge!.low, high: laminarEdge!.high }
          : { low: 0, high: 0 };
    for (const bodyTurbulent of [false, true]) {
      const friction = (bodyTurbulent ? 0 : run.body) + run.fins;
      transitionStates.push({
        reynolds: run.reT,
        bodyTurbulent,
        friction,
        laminarTrailingEdge,
        trailingEdge,
        low: friction + trailingEdge.low,
        high: friction + trailingEdge.high,
      });
    }
  }
  const inputBands: InputBand[] = [];
  if (runs.length > 0) {
    const lam = te?.laminar;
    const teLabel =
      te === undefined || lam === undefined
        ? ''
        : "; where the run reaches the fins' trailing edges, their base laminar with them " +
          `(TR 1109 fig. 29, ${lam.low.toFixed(3)} to ${lam.high.toFixed(3)} of the term at ` +
          `c/[h Re^(1/2)] ${lam.laminarAbscissa.toFixed(4)}` +
          (lam.extrapolated ? ', extrapolated within one read interval' : '') +
          (te.vacuumClamped.includes('laminar high end')
            ? ', the high end clamped at the vacuum bound'
            : '') +
          ')';
    inputBands.push({
      name: 'transition',
      low: Math.min(0, ...transitionStates.map((x) => x.low)),
      high: Math.max(0, ...transitionStates.map((x) => x.high)),
      label:
        `input: a laminar run to Re_T = ${transitions.map((t) => t.toExponential(2)).join(', ')} ` +
        'against fully turbulent, each Re_T one state of the boundary layer, the body also ' +
        'taken turbulent (0008 section 2.3, 0010 section 3)' +
        teLabel,
    });
  }
  if (wallBand !== undefined) inputBands.push(wallBand);
  inputBands.push(roughnessBand);

  return { components, inputs: inputBands, refusals, base, transitionStates };
}

/**
 * The leading edges and faces of a flat plate (0016, W4): a rounded edge's
 * nose, a radius of half the thickness, at face angle zero on any planform
 * and sweep; faces parallel to the stream, no wave drag. A square-cut edge
 * is refused: "bounded, not measured" needs its bounds' ordering shown, and
 * it is not.
 */
function platePart(
  plate: FlatPlate,
  config: FinnedBody,
  conditions: FlightConditions,
  area: number,
  components: DragComponent[],
  refusals: ComponentRefusal[],
): void {
  const { fins } = config;
  try {
    if (plate.leadingEdge === 'square') {
      throw new FinRefusal(
        'square-leading-edge',
        'a square-cut leading edge is refused: "bounded, not measured" (0014 section 10.2) ' +
          "needs it shown to carry at least a half-cylinder's front-side drag, and that is shown " +
          'only where the half-cylinder is already supersonic, not over the inner part of the ' +
          'face; no flat-face measurement is among the sources that set bands (0016)',
      );
    }
    const radius = plate.thickness / 2;
    const nose = roundedLeadingEdgeDrag({
      mach: conditions.mach,
      radius,
      faceAngle: 0,
      tanLeadingEdgeSweep: fins.planform.tanLeadingEdge,
      reynoldsOnDiameter: conditions.reynoldsPerLength * plate.thickness,
    });
    const cd = (fins.count * nose.dragPerSpan * fins.planform.span) / area;
    components.push({
      name: 'fin leading edges',
      cd,
      low: nose.band.low * cd,
      high: nose.band.high * cd,
      label: `${nose.label}; on a flat plate, a semicircular nose (0016)`,
      band:
        `${nose.transonic ? 'NASA CR-149372 and TN 2960' : 'TN 2960'}, front side over modified ` +
        `Newtonian, ${outward(nose.band)} ` +
        `(${nose.regime}${nose.sweepDegrees > 0 ? ', swept' : ''})`,
    });
  } catch (e) {
    refusals.push(refusalOf('fin leading edges', e));
  }
  components.push({
    name: 'fin wave drag',
    cd: 0,
    low: 0,
    high: 0,
    label:
      "a flat plate's faces lie parallel to the stream and carry no wave drag; its edges are " +
      'their own terms (0016)',
    band: 'none: zero by the geometry',
  });
}

/** The total, or TotalDragRefusal listing every component refused. */
export function finnedBodyTotalDrag(
  config: FinnedBody,
  conditions: FlightConditions,
  nose: DragComponent,
  inputs: DragInputs = {},
): TotalDrag {
  const r = finnedBodyComponents(config, conditions, nose, inputs);
  if (r.refusals.length > 0) throw new TotalDragRefusal(r.refusals);
  return combineComponents(r.components, r.inputs);
}

/**
 * The body base's fin input (src/base/base-drag.ts) for a fin set: for the
 * present factor, the largest t/c (a plate's at its shorter end chord; a
 * section's is the same at every station) and a plate's thinnest station
 * (0016 sections 16 and 18), with both edge sweeps; for the rebuilt factor
 * (0015 section 5), the section in chord units at the thickest station
 * (a plate: flat faces to a square trailing edge at that t/c; its thinner
 * stations follow from `thinnest`). A plate with a rounded trailing edge has
 * no section the rebuilt factor takes (0015 section 4), so it is not given
 * one, and the present factor's verdict stands.
 */
export function baseFinsOf(fins: FinSet): BaseFins {
  const plate = isFlatPlate(fins.section) ? fins.section : undefined;
  const thicknessRatio =
    plate === undefined
      ? symmetricThicknessRatio(fins.section as SymmetricSection)
      : plate.thickness / Math.min(fins.planform.rootChord, tipChord(fins.planform));
  const section: SymmetricSection | undefined =
    plate === undefined
      ? (fins.section as SymmetricSection)
      : plate.trailingEdge === 'square'
        ? {
            x: [0, 1e-3, 1],
            halfThickness: [0, thicknessRatio / 2, thicknessRatio / 2],
            bluntTrailingEdge: true,
          }
        : undefined;
  return {
    count: fins.count,
    thicknessRatio,
    ...(plate === undefined ? {} : { thinnest: plateThinnest(plate.thickness, fins.planform) }),
    section: fins.sectionFamily,
    tanLeadingEdge: fins.planform.tanLeadingEdge,
    tanTrailingEdge: fins.planform.tanTrailingEdge,
    trailingEdgeAheadOfBase: fins.trailingEdgeAheadOfBase / fins.planform.rootChord,
    // For the rebuilt factor, used only where the present one refuses (0015 section 5).
    ...(section === undefined
      ? {}
      : {
          nearBase: {
            section,
            sectionFamily: fins.sectionFamily,
            tanLeadingEdgeSweep: fins.planform.tanLeadingEdge,
            tanTrailingEdgeSweep: fins.planform.tanTrailingEdge,
          },
        }),
  };
}

/**
 * A flat plate's thinnest station (thickness over the longer end chord) and
 * the share of its span thinner than the fins-on-base factor's 5% data,
 * where the chord, linear along the span, exceeds 20 thicknesses.
 */
function plateThinnest(
  thickness: number,
  planform: Planform,
): { thicknessRatio: number; spanShareBelow: number } {
  const root = planform.rootChord;
  const tip = tipChord(planform);
  const limit = thickness / FINS_ON_BASE_THINNEST_DATA;
  let share: number;
  if (root === tip) share = root > limit ? 1 : 0;
  else {
    // c(y) = root + (tip - root) y: the span fraction where c > limit.
    const yAt = (limit - root) / (tip - root);
    share = tip < root ? Math.min(1, Math.max(0, yAt)) : 1 - Math.min(1, Math.max(0, yAt));
  }
  return { thicknessRatio: thickness / Math.max(root, tip), spanShareBelow: share };
}

/** A band printed to two decimals, rounded outward, so the text never narrows it. */
function outward(band: { readonly low: number; readonly high: number }): string {
  const low = Math.floor(band.low * 100 + 1e-9) / 100;
  const high = Math.ceil(band.high * 100 - 1e-9) / 100;
  return `${low.toFixed(2)} to ${high.toFixed(2)}`;
}
