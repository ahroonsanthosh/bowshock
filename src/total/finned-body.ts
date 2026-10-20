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
 * | body base | compiled curve times the fins-on-base factor (src/base) | curve 0.82 to 1.08, interpolation, fins-on-base band | correlation; the factor measured on circular-arc fins, an analogy for others |
 * | fin trailing-edge base | blunt, unswept, turbulent: two-dimensional base pressure at the free-stream Mach number (src/base/fin-trailing-edge.ts) | 0.93 to 1.21 | an analogy, not a measurement, for edges in the base plane |
 *
 * Friction is at free-stream edge conditions, turbulent from the tip and
 * from each fin's leading edge by default, on an adiabatic wall (the
 * condition 0007's band is measured on). Inputs, each its own band beside
 * the model-form band:
 *
 * - transition: a laminar run to each Reynolds number given (on the
 *   surface distance from the tip, and from each fin's leading edge),
 *   against fully turbulent; a laminar layer at the base refuses the base;
 *   where it leaves a fin laminar at its blunt trailing edge, the
 *   trailing-edge term's laminar-against-turbulent change is a further
 *   input band;
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
 * Not represented, with their sizes where known (0010): the fins' roots
 * do not remove body wetted area; fin-body interference and the body's
 * boundary layer at the fin roots; the Mach number and pressure ahead of
 * the base are the free stream's (fig. 18's abscissa for cylindrical
 * afterbodies); fin cant and roll; a nose-tip bluntness; the rounded
 * leading edge's effect on the fin faces (the analogy's stated gap).
 */

import { bodyBaseDrag, type BodyBaseDrag } from '../base/base-drag';
import { FIN_TRAILING_EDGE_BAND, finTrailingEdgeBaseDrag } from '../base/fin-trailing-edge';
import { BaseRefusal } from '../base/refusal';
import { finWaveDrag } from '../fins/fin-wave-drag';
import { chordAt, planformArea, type Planform } from '../fins/planform';
import { gaussLegendre } from '../fins/quadrature';
import { FinRefusal } from '../fins/refusal';
import {
  roundedLeadingEdgeDrag,
  roundedWedge,
  type RoundedWedge,
} from '../fins/rounded-leading-edge';
import { singleWedge, symmetricThicknessRatio, type SymmetricSection } from '../fins/section';
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
  /** The section, in chord units, the same along the span. */
  readonly section: SymmetricSection;
  /** 'circular-arc' for the section of TN 3819 fig. 35's fins, else 'other'. */
  readonly sectionFamily: 'circular-arc' | 'other';
  /** Leading-edge radius in the body's length unit; 0 is sharp. */
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

export interface FinnedBodyComponents {
  /** The components that could be computed. */
  readonly components: readonly DragComponent[];
  readonly inputs: readonly InputBand[];
  readonly refusals: readonly ComponentRefusal[];
  /** The body base's breakdown, when computed. */
  readonly base: BodyBaseDrag | undefined;
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
  if (fins.leadingEdgeRadius !== 0) {
    const s = fins.section;
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
        band: `TN 2960, front side over modified Newtonian, ${nose.band.low.toFixed(2)} to ${nose.band.high.toFixed(2)} (${nose.regime})`,
      });
    } catch (e) {
      refusals.push(refusalOf('fin leading edges', e));
    }
  }
  try {
    // With a rounded edge the faces are a wedge at the tangent geometry's
    // angle, on their own rise (src/fins/rounded-leading-edge.ts).
    const section =
      rounded === undefined ? fins.section : singleWedge(2 * Math.tan(rounded.faceAngle));
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

  // Inputs.
  const inputBands: InputBand[] = [];
  const transitions = inputs.transitionReynolds ?? [];
  // A transition input at or beyond the base leaves the layer laminar there.
  const laminarBase = transitions.some((reT) => reT >= nominal.surfaceReynolds);
  if (transitions.length > 0) {
    const deltas = transitions.map((reT) => {
      if (!(reT > 0 && Number.isFinite(reT))) {
        throw new RangeError(
          `a transition Reynolds number must be positive and finite, got ${reT}`,
        );
      }
      const f = frictionCds(config, conditions, { transitionReynolds: reT });
      return f.body + f.fins - nominal.body - nominal.fins;
    });
    inputBands.push({
      name: 'transition',
      low: Math.min(0, ...deltas),
      high: Math.max(0, ...deltas),
      label:
        `input: a laminar run to Re_T = ${transitions.map((t) => t.toExponential(2)).join(', ')} ` +
        'against fully turbulent (0008 section 2.3)',
    });
  }
  if (inputs.wallTemperature !== undefined) {
    const f = frictionCds(config, conditions, { wallTemperature: inputs.wallTemperature });
    const d = f.body + f.fins - nominal.body - nominal.fins;
    inputBands.push({
      name: 'wall temperature',
      low: Math.min(0, d),
      high: Math.max(0, d),
      label:
        `input: the wall from adiabatic to ${inputs.wallTemperature} K; 0007's friction band is ` +
        'measured on adiabatic walls only',
    });
  }
  inputBands.push(
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
        },
  );

  // Body base.
  let base: BodyBaseDrag | undefined;
  try {
    base = bodyBaseDrag({
      mach: conditions.mach,
      afterbody: config.afterbody,
      boundaryLayerAtBase: laminarBase ? 'laminar' : 'turbulent',
      baseAreaRatio: 1,
      fins: {
        count: fins.count,
        thicknessRatio: symmetricThicknessRatio(fins.section),
        section: fins.sectionFamily,
        trailingEdgeAheadOfBase: fins.trailingEdgeAheadOfBase / fins.planform.rootChord,
      },
    });
    components.push({
      name: 'body base',
      cd: base.cd,
      low: base.low,
      high: base.high,
      label: base.labels.join('; '),
      band: 'curve 0.82 to 1.08 (0008 section 3.3), interpolation, fins-on-base band (section 3.4)',
    });
  } catch (e) {
    refusals.push(refusalOf('body base', e));
  }

  // Fin trailing-edge base: none for sharp trailing edges.
  if (fins.section.bluntTrailingEdge === true) {
    const h = fins.section.halfThickness;
    try {
      if (!constantChord) {
        throw new BaseRefusal(
          'input',
          'the trailing-edge base term is implemented for fins of constant chord (c / h and the ' +
            'chord Reynolds number then hold along the span)',
        );
      }
      const te = finTrailingEdgeBaseDrag({
        mach: conditions.mach,
        count: fins.count,
        thickness: 2 * h[h.length - 1]! * fins.planform.rootChord,
        span: fins.planform.span,
        chord: fins.planform.rootChord,
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
      if (te.laminar !== undefined) {
        inputBands.push({
          name: 'transition at the fin trailing edges',
          low: te.laminarInput.low,
          high: te.laminarInput.high,
          label:
            'input: laminar against turbulent trailing-edge base drag (TR 1109 fig. 29, ' +
            `${te.laminar.low.toFixed(3)} to ${te.laminar.high.toFixed(3)} at c/[h Re^(1/2)] ` +
            `${te.laminar.laminarAbscissa.toFixed(4)})` +
            (te.laminar.extrapolated ? ', extrapolated within one read interval' : ''),
        });
      }
    } catch (e) {
      refusals.push(refusalOf('fin trailing-edge base', e));
    }
  }

  return { components, inputs: inputBands, refusals, base };
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
