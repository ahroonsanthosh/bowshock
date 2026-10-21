/**
 * The rocket of an OpenRocket file (./model.ts) mapped onto what the drag
 * model takes (./design.ts), conservatively: every component ends up
 * represented exactly, reported as not represented with the reason, or
 * listed as ignored with the reason. Nothing is approximated.
 *
 * - Represented: one stage whose outer shape is one nose cone followed by
 *   body tubes of the nose's base diameter to a flat base, and at most one
 *   set of identical, evenly spaced fins on the body tubes, with straight
 *   edges and a tip parallel to the root, square or rounded in section.
 *   Fin sets that OpenRocket holds apart but that are identical, at one
 *   position, and evenly spaced together are one set.
 * - Not represented, so no design: more than one stage, pods and boosters,
 *   transitions (boat-tails, flares, shoulders), a second diameter, a
 *   second fin set, elliptical, freeform (unless a trapezoid) and tube
 *   fins, fins on the nose or reaching past the base, OpenRocket's airfoil
 *   section, and anything this importer does not know.
 * - Not represented, the design built without it: launch lugs, rail
 *   buttons, fin cant, fin fillets, and a motor or inner tube reaching aft
 *   of the base.
 * - Ignored: what lies inside the body (inner tubes, couplers, rings,
 *   bulkheads, masses, recovery gear, fin tabs), components OpenRocket
 *   itself does not attach, and OpenRocket's drag-coefficient overrides.
 *
 * Surface finishes are reported with OpenRocket's roughness heights; the
 * drag model takes roughness only as a band with its source, and the
 * import does not make one.
 *
 * docs/design/0018-openrocket-import.md section 4.
 */

import { validateNose, type NoseShape } from '../geometry/nose';
import type { DesignFinSet, FlatPlateSection, ImportedDesign } from './design';
import {
  ORK_FINISHES,
  ORK_TYPE_NAMES,
  type OrkBodyTube,
  type OrkComponent,
  type OrkFinSet,
  type OrkMotorMount,
  type OrkNoseCone,
  type OrkRocket,
  type OrkStage,
  type OrkTransition,
  type OrkTubeFinSet,
} from './model';
import { ORK_SHAPES } from './parse';

/**
 * Lengths that differ by no more than this (metres) are taken as equal:
 * radii of one diameter, fins at the base. A nanometre is far below any
 * rocket's tolerances and far above the rounding of a length in metres.
 */
export const LENGTH_TOLERANCE = 1e-9;
/** OpenRocket sets a relative position under this (metres) to zero (RocketComponent.setAxialOffset). */
export const POSITION_SNAP = 1e-6;
/** OpenRocket draws a power series of parameter at most this as a flat-faced cylinder. */
export const POWER_FLAT_FACE = 1e-5;
/** Fin sets taken as one set must be evenly spaced within this (degrees). */
export const ANGLE_TOLERANCE = 1e-6;

export interface ComponentRef {
  /** The component in plain words, e.g. `launch lug "Launch lug" (on body tube "Body tube")`. */
  readonly component: string;
  /** OpenRocket's element name ('nosecone', 'launchlug', ...), or 'rocket'. */
  readonly type: OrkComponent['type'] | 'rocket';
  /** Its name in the file. */
  readonly name: string;
}

export interface RepresentedNote extends ComponentRef {
  /** How the design represents it. */
  readonly as: string;
}

export interface NotRepresentedNote extends ComponentRef {
  readonly reason: string;
  /**
   * 'no-design': because of it the import gives no design (the body or the
   * fins cannot be represented without it). 'omitted': the design is built
   * without it, and a drag computed for the design leaves it out.
   */
  readonly effect: 'no-design' | 'omitted';
}

export interface IgnoredNote extends ComponentRef {
  readonly reason: string;
}

export interface FinishNote extends ComponentRef {
  /** As written in the file. */
  readonly finish: string;
  /** OpenRocket's name for it; null if OpenRocket does not know the finish. */
  readonly label: string | null;
  /** OpenRocket's roughness height for it, metres; null if unknown. */
  readonly roughnessHeight: number | null;
}

export interface OrkMapping {
  /**
   * The design, or null when a component marked 'no-design' keeps the
   * body or the fins from being represented.
   */
  readonly design: ImportedDesign | null;
  /** True when the design is the whole rocket: a design, and nothing not represented. */
  readonly exact: boolean;
  /** Components the design represents exactly (or would, were the 'no-design' ones changed). */
  readonly represented: readonly RepresentedNote[];
  readonly notRepresented: readonly NotRepresentedNote[];
  readonly ignored: readonly IgnoredNote[];
  /** The surface finish of each external component of the stage mapped. */
  readonly finishes: readonly FinishNote[];
}

/** Why finishes are reported and not used. */
export const ROUGHNESS_NOTE =
  "OpenRocket's surface finishes are reported with OpenRocket's roughness heights. The drag " +
  'model takes roughness only as a band with its source (no roughness model is validated in ' +
  'bowshock: design record 0008 section 2.3), so the import does not turn a finish into a band.';

const typeName = (c: OrkComponent) => ORK_TYPE_NAMES[c.type];

/** A length in plain words: millimetres below a metre, metres above. */
export function formatLength(metres: number): string {
  const a = Math.abs(metres);
  if (a !== 0 && a < 1) return `${Number((metres * 1000).toPrecision(4))} mm`;
  return `${Number(metres.toPrecision(5))} m`;
}

const BODY_TYPES = new Set(['nosecone', 'bodytube', 'transition']);
const INTERNAL_TYPES = new Set([
  'innertube',
  'tubecoupler',
  'engineblock',
  'centeringring',
  'bulkhead',
  'masscomponent',
  'shockcord',
  'parachute',
  'streamer',
]);
const EXTERNAL_ATTACHED = new Set([
  'trapezoidfinset',
  'ellipticalfinset',
  'freeformfinset',
  'tubefinset',
  'launchlug',
  'railbutton',
]);

/**
 * Whether OpenRocket attaches a child of this type to this parent (each
 * component's isCompatible); an incompatible child is ignored by
 * OpenRocket's loader with everything in it. Unknown elements are left to
 * the caller.
 */
function attaches(parent: string, child: string): boolean {
  switch (parent) {
    case 'stage':
    case 'podset':
    case 'parallelstage':
      return BODY_TYPES.has(child);
    case 'bodytube':
      return (
        child === 'podset' ||
        child === 'parallelstage' ||
        INTERNAL_TYPES.has(child) ||
        EXTERNAL_ATTACHED.has(child)
      );
    case 'nosecone':
    case 'transition':
      return INTERNAL_TYPES.has(child) || child === 'freeformfinset';
    case 'innertube':
    case 'tubecoupler':
    case 'masscomponent':
      return INTERNAL_TYPES.has(child);
    default:
      return false;
  }
}

/** How many components a subtree holds below its root. */
function countBelow(c: OrkComponent): number {
  return c.children.reduce((n, k) => n + 1 + countBelow(k), 0);
}

function withContents(c: OrkComponent): string {
  const n = countBelow(c);
  return n === 0 ? '' : ` (with the ${n} component${n === 1 ? '' : 's'} in it)`;
}

/** OpenRocket's getLength(): the extent along the axis used to place components. */
function lengthOf(c: OrkComponent): number | null {
  switch (c.type) {
    case 'nosecone':
    case 'transition':
    case 'bodytube':
    case 'tubefinset':
    case 'launchlug':
    case 'innertube':
    case 'tubecoupler':
    case 'engineblock':
    case 'centeringring':
    case 'bulkhead':
      return c.length;
    case 'trapezoidfinset':
    case 'ellipticalfinset':
      return c.rootChord;
    case 'freeformfinset': {
      const last = c.points?.[c.points.length - 1];
      return last === undefined ? null : last.x;
    }
    case 'railbutton':
      // OpenRocket leaves a rail button's length at zero.
      return 0;
    case 'masscomponent':
    case 'shockcord':
    case 'parachute':
    case 'streamer':
      // OpenRocket computes the length itself when the packed radius is automatic.
      return c.packedRadius.automatic ? null : c.packedLength;
    case 'podset':
    case 'parallelstage':
    case 'stage': {
      let sum = 0;
      for (const k of c.children) {
        if (k.axialOffset !== null && k.axialOffset.method !== 'after') continue;
        const l = lengthOf(k);
        if (l === null) return null;
        sum += l;
      }
      return sum;
    }
    case 'unknown':
      return null;
  }
}

interface Parent {
  readonly component: OrkComponent;
  readonly label: string;
  /** Absolute position of the front, metres from the rocket's tip; null if unknown. */
  readonly absX: number | null;
  readonly length: number | null;
  /** Length of the body behind this body component (body components only). */
  readonly bodyBehind: number | null;
}

/**
 * A child's position relative to its parent's front, as OpenRocket's
 * AxialMethod.getAsPosition gives it; `previousEnd` is where the previous
 * sibling ends (0 for the first child).
 */
function relativePosition(
  c: OrkComponent,
  parent: Parent,
  previousEnd: number | null,
): number | null {
  const a = c.axialOffset;
  const own = lengthOf(c);
  let x: number | null;
  if (a === null || a.method === 'after') x = previousEnd;
  else if (a.method === 'top') x = a.offset;
  else if (a.method === 'middle') {
    x = parent.length === null || own === null ? null : a.offset + (parent.length - own) / 2;
  } else if (a.method === 'bottom') {
    x = parent.length === null || own === null ? null : a.offset + (parent.length - own);
  } else x = parent.absX === null ? null : a.offset - parent.absX;
  if (x !== null && Math.abs(x) < POSITION_SNAP) x = 0;
  return x;
}

/** A fin set's planform, or why it has none the design can hold. */
interface Planform {
  readonly rootChord: number;
  readonly tipChord: number;
  readonly span: number;
  readonly sweepLength: number;
}

function planformOf(f: OrkFinSet | OrkTubeFinSet): Planform | string {
  switch (f.type) {
    case 'tubefinset':
      return 'tube fins: the drag model takes flat fins only';
    case 'ellipticalfinset':
      return 'an elliptical planform: the drag model takes fins with straight edges and a tip parallel to the root';
    case 'trapezoidfinset': {
      const { rootChord, tipChord, sweepLength, height } = f;
      if (rootChord === null || tipChord === null || sweepLength === null || height === null) {
        return 'the file does not give its root chord, tip chord, sweep length and height';
      }
      if (!(rootChord > 0 && height > 0 && tipChord >= 0)) {
        return (
          `a root chord of ${formatLength(rootChord)}, tip chord of ${formatLength(tipChord)} and ` +
          `height of ${formatLength(height)}: not a fin (OpenRocket takes none of them negative)`
        );
      }
      return { rootChord, tipChord, span: height, sweepLength };
    }
    case 'freeformfinset': {
      const p = f.points;
      if (p === null) return 'the file does not give its outline as points';
      const notTrapezoid =
        `a freeform outline of ${p.length} points that is not a trapezoid with a tip parallel ` +
        'to the root: the drag model takes fins with straight edges and such a tip';
      const first = p[0];
      const last = p[p.length - 1];
      if (first === undefined || last === undefined || first.x !== 0 || first.y !== 0) {
        return notTrapezoid;
      }
      if (!(last.y === 0 && last.x > 0)) return notTrapezoid;
      if (p.length === 3) {
        const tip = p[1]!;
        if (!(tip.y > 0)) return notTrapezoid;
        return { rootChord: last.x, tipChord: 0, span: tip.y, sweepLength: tip.x };
      }
      if (p.length === 4) {
        const a = p[1]!;
        const b = p[2]!;
        const t = b.x - a.x;
        if (!(a.y > 0 && Math.abs(a.y - b.y) <= LENGTH_TOLERANCE && t >= 0)) return notTrapezoid;
        return { rootChord: last.x, tipChord: t, span: a.y, sweepLength: a.x };
      }
      return notTrapezoid;
    }
  }
}

/** OpenRocket's cross section as the design's flat plate, or why it has no exact counterpart. */
function sectionOf(crossSection: string, thickness: number): FlatPlateSection | string {
  switch (crossSection) {
    case 'square':
      return { kind: 'flat-plate', thickness, leadingEdge: 'square', trailingEdge: 'square' };
    case 'rounded':
      return { kind: 'flat-plate', thickness, leadingEdge: 'rounded', trailingEdge: 'rounded' };
    case 'airfoil':
      return (
        "OpenRocket's airfoil cross section names no profile: the file gives only the " +
        'thickness, and no thickness distribution or edge radius, so it has no exact counterpart ' +
        "among the drag model's sections (picking one, a wedge or a rounded plate, would be a guess)"
      );
    default:
      return `the cross section "${crossSection}" is not one OpenRocket knows`;
  }
}

/** The nose's shape as src/geometry's NoseShape, or why it has none. */
function noseShapeOf(nose: OrkNoseCone): NoseShape | string {
  const range = ORK_SHAPES[nose.shape];
  if (range === undefined) return `the shape "${nose.shape}" is not one OpenRocket knows`;
  const p = nose.shapeParameter;
  if (range.usesParameter) {
    if (p === null) return 'the file does not give a readable shape parameter';
    if (!(p >= range.min && p <= range.max)) {
      return (
        `the shape parameter ${p} lies outside ${range.min} to ${Number(range.max.toPrecision(6))}, ` +
        'the range OpenRocket accepts for this shape (it would clamp it)'
      );
    }
  }
  switch (nose.shape) {
    case 'conical':
      return { kind: 'conical' };
    case 'ogive':
      return { kind: 'ogive', parameter: p! };
    case 'ellipsoid':
      return { kind: 'ellipsoid' };
    case 'power':
      if (p! <= POWER_FLAT_FACE) {
        return (
          `a power series of parameter ${p}, which OpenRocket draws as a cylinder with a flat ` +
          'face: a blunt body the drag model does not take'
        );
      }
      return { kind: 'power', exponent: p! };
    case 'parabolic':
      return { kind: 'parabolic', parameter: p! };
    case 'haack':
      return { kind: 'haack', parameter: p! };
    default:
      return `the shape "${nose.shape}" is not one OpenRocket knows`;
  }
}

function describeShape(shape: NoseShape): string {
  switch (shape.kind) {
    case 'conical':
      return 'a cone';
    case 'ogive':
      return shape.parameter === 1 ? 'a tangent ogive' : `an ogive of parameter ${shape.parameter}`;
    case 'ellipsoid':
      return 'an ellipsoid';
    case 'power':
      return `a power series of exponent ${shape.exponent}`;
    case 'parabolic':
      return `a parabolic series of parameter ${shape.parameter}`;
    case 'haack':
      return shape.parameter === 0
        ? 'a Von Karman (LD-Haack) nose'
        : `a Haack series of parameter ${shape.parameter}`;
  }
}

interface FinCandidate {
  readonly fins: OrkFinSet;
  readonly label: string;
  readonly planform: Planform;
  readonly section: FlatPlateSection;
  readonly count: number;
  readonly aheadOfBase: number;
  readonly angleDegrees: number;
  readonly mirrored: boolean;
}

class Mapper {
  readonly represented: RepresentedNote[] = [];
  readonly notRepresented: NotRepresentedNote[] = [];
  readonly ignored: IgnoredNote[] = [];
  readonly finishes: FinishNote[] = [];
  readonly candidates: FinCandidate[] = [];
  /** The nose's length once read: fins must start behind it. */
  noseLength: number | null = null;
  /** Whether stages follow the one mapped: its aft end is then a joint, not the base. */
  multiStage = false;

  /** Something inside reaching `reach` aft of the stage's aft end: outside the body, or into the next stage. */
  reachesAft(c: OrkComponent, label: string, reach: number, what: string) {
    if (this.multiStage) {
      this.ignore(
        c,
        label,
        `${what} reaches ${formatLength(reach)} past the end of this stage, into the stage ` +
          'behind it (inside the stack)',
      );
    } else {
      this.omit(
        c,
        label,
        `${what} reaches ${formatLength(reach)} aft of the base, outside the body: the drag ` +
          "model's base is a flat disc and does not include it",
      );
    }
  }

  ref(c: OrkComponent, label: string): ComponentRef {
    return { component: label, type: c.type, name: c.name };
  }

  represent(c: OrkComponent, label: string, as: string) {
    this.represented.push({ ...this.ref(c, label), as });
  }

  refuse(c: OrkComponent, label: string, reason: string) {
    this.notRepresented.push({ ...this.ref(c, label), reason, effect: 'no-design' });
  }

  omit(c: OrkComponent, label: string, reason: string) {
    this.notRepresented.push({ ...this.ref(c, label), reason, effect: 'omitted' });
  }

  ignore(c: OrkComponent, label: string, reason: string) {
    this.ignored.push({ ...this.ref(c, label), reason });
  }

  /** The aspects every component may carry: a drag override, a surface finish. */
  common(c: OrkComponent, label: string) {
    if (c.overrideCd !== null) {
      this.ignore(
        c,
        label,
        `its drag-coefficient override in OpenRocket (${c.overrideCd}) is a setting of ` +
          "OpenRocket's own estimate; bowshock computes the drag from the shape",
      );
    }
    if ('finish' in c) {
      const known = ORK_FINISHES[c.finish];
      this.finishes.push({
        ...this.ref(c, label),
        finish: c.finish,
        label: known?.label ?? null,
        roughnessHeight: known?.roughness ?? null,
      });
    }
  }
}

/** Map the rocket of an OpenRocket file onto the design. */
export function mapRocket(rocket: OrkRocket): OrkMapping {
  const m = new Mapper();
  for (const c of rocket.unattached) {
    m.ignore(
      c,
      `${typeName(c)} "${c.name}"`,
      `OpenRocket attaches only stages to the rocket and ignores a ${typeName(c)} placed ` +
        `there${withContents(c)}`,
    );
  }
  const [stage, ...others] = rocket.stages;
  if (stage === undefined) {
    m.notRepresented.push({
      component: `rocket "${rocket.name}"`,
      type: 'rocket',
      name: rocket.name,
      reason: 'the file holds no stage, so there is no body to represent',
      effect: 'no-design',
    });
    return finish(m, null);
  }
  for (const s of others) {
    m.refuse(
      s,
      `stage "${s.name}"`,
      'a second stage: the drag model takes a single-stage rocket (the stack and what is left ' +
        `after separation are other shapes)${withContents(s)}`,
    );
  }
  m.multiStage = others.length > 0;
  const design = mapStage(m, stage, m.multiStage);
  return finish(m, design);
}

function finish(m: Mapper, design: ImportedDesign | null): OrkMapping {
  const blocked = m.notRepresented.some((n) => n.effect === 'no-design');
  const result = blocked ? null : design;
  return {
    design: result,
    exact: result !== null && m.notRepresented.length === 0,
    represented: m.represented,
    notRepresented: m.notRepresented,
    ignored: m.ignored,
    finishes: m.finishes,
  };
}

function mapStage(m: Mapper, stage: OrkStage, multiStage: boolean): ImportedDesign | null {
  const stageLabel = `stage "${stage.name}"`;
  m.common(stage, stageLabel);
  if (!multiStage) m.represent(stage, stageLabel, "the rocket's single stage");
  else m.represent(stage, stageLabel, 'the first stage, mapped on its own for this report');

  const body: (OrkNoseCone | OrkBodyTube | OrkTransition)[] = [];
  for (const c of stage.children) {
    const label = `${typeName(c)} "${c.name}"`;
    if (c.type === 'nosecone' || c.type === 'bodytube' || c.type === 'transition') body.push(c);
    else if (c.type === 'unknown') {
      m.refuse(c, label, unknownReason(c.element));
    } else {
      m.ignore(
        c,
        label,
        `OpenRocket attaches only nose cones, body tubes and transitions to a stage and ignores ` +
          `a ${typeName(c)} placed there${withContents(c)}`,
      );
    }
  }

  // The body: lengths, positions and the one radius.
  const nose = body[0]?.type === 'nosecone' && !body[0].flipped ? body[0] : undefined;
  if (body.length === 0) {
    m.notRepresented.push({
      component: stageLabel,
      type: 'stage',
      name: stage.name,
      reason: 'the stage holds no nose cone, body tube or transition, so there is no body',
      effect: 'no-design',
    });
  }
  let radius: number | null = null;
  if (nose !== undefined) {
    m.noseLength = nose.length;
    radius = nose.aftRadius.value;
    // An automatic radius that the file does not store: OpenRocket takes
    // the next component's (an older file's "auto" with no number).
    const next = body[1];
    if (radius === null && nose.aftRadius.automatic && next?.type === 'bodytube') {
      radius = next.outerRadius.value;
    }
  }
  const lengths = body.map((c) => c.length);
  const behind: (number | null)[] = lengths.map((_, i) => {
    let s = 0;
    for (const l of lengths.slice(i + 1)) {
      if (l === null) return null;
      s += l;
    }
    return s;
  });
  let absX: number | null = 0;
  let cylinderLength = 0;
  let shape: NoseShape | undefined;
  body.forEach((c, i) => {
    const label = `${typeName(c)} "${c.name}"`;
    m.common(c, label);
    const front = absX;
    absX = absX === null || c.length === null ? null : absX + c.length;
    if (c.axialOffset !== null && c.axialOffset.method !== 'after') {
      m.refuse(
        c,
        label,
        `it is placed ${formatLength(c.axialOffset.offset)} from its ${c.axialOffset.method} ` +
          'reference rather than behind the component before it, so the body may have a gap ' +
          'or an overlap',
      );
    }
    if (c.length === null || !(c.length >= 0)) {
      m.refuse(c, label, 'the file does not give a length of zero or more');
    }
    if (i === 0 && c !== nose) {
      m.refuse(
        c,
        label,
        c.type === 'nosecone'
          ? 'the rocket starts with a flipped nose cone (a tail cone), not a nose'
          : `the rocket starts with a ${typeName(c)}, not a nose cone`,
      );
    } else if (c.type === 'nosecone' && c !== nose) {
      m.refuse(
        c,
        label,
        c.flipped
          ? 'a tail cone (a flipped nose cone): the drag model takes a cylinder to a flat base'
          : 'a second nose cone behind the first: the drag model takes one nose and a cylinder',
      );
    } else if (c.type === 'transition') {
      m.refuse(c, label, transitionReason(c, i === body.length - 1));
    } else if (c.type === 'nosecone') {
      const s = noseShapeOf(c);
      if (typeof s === 'string') m.refuse(c, label, s);
      else if (radius === null || !(radius > 0)) {
        m.refuse(c, label, 'the file does not give a base radius greater than zero');
      } else if (c.length !== null && c.length > 0) {
        try {
          validateNose({ shape: s, length: c.length, baseRadius: radius });
          shape = s;
          const shoulder = c.aftShoulder;
          if (
            shoulder.length !== null &&
            shoulder.length > 0 &&
            shoulder.radius !== null &&
            shoulder.radius > radius + LENGTH_TOLERANCE
          ) {
            m.omit(
              c,
              `shoulder of ${label}`,
              `the shoulder's radius, ${formatLength(shoulder.radius)}, is greater than the ` +
                `body's, ${formatLength(radius)}, so it would stand out of the body tube`,
            );
          }
          m.represent(
            c,
            label,
            `the nose: ${describeShape(s)} ${formatLength(c.length)} long, base radius ` +
              formatLength(radius) +
              (c.aftShoulder.length !== null && c.aftShoulder.length > 0
                ? '; its shoulder lies inside the body tube'
                : ''),
          );
        } catch (e) {
          if (!(e instanceof RangeError)) throw e;
          m.refuse(c, label, e.message);
        }
      } else {
        m.refuse(c, label, 'the nose has no length');
      }
    } else {
      // A body tube.
      const r = c.outerRadius.value ?? (c.outerRadius.automatic ? radius : null);
      if (r === null) m.refuse(c, label, 'the file does not give its radius');
      else if (radius !== null && Math.abs(r - radius) > LENGTH_TOLERANCE) {
        m.refuse(
          c,
          label,
          `a radius of ${formatLength(r)} behind a nose of base radius ${formatLength(radius)}: ` +
            "more than one diameter, and the drag model takes one cylinder of the nose's diameter",
        );
      } else if (c.length !== null && c.length >= 0) {
        cylinderLength += c.length;
        m.represent(
          c,
          label,
          `${formatLength(c.length)} of the cylinder` +
            (c.outerRadius.value === null ? ' (its automatic radius taken from the nose)' : ''),
        );
      }
    }
    mapChildren(m, {
      component: c,
      label,
      absX: front,
      length: c.length,
      bodyBehind: behind[i] ?? null,
    });
    if (c.type === 'bodytube' && c.motorMount !== null) {
      checkMotor(m, c, label, c.motorMount, behind[i] ?? null);
    }
  });

  const finSet = mapFins(m);
  if (nose === undefined || shape === undefined || radius === null || nose.length === null) {
    return null;
  }
  return {
    body: { nose: { shape, length: nose.length, baseRadius: radius }, cylinderLength },
    fins: finSet,
  };
}

function unknownReason(element: string): string {
  return (
    `<${element}> is not a component this importer knows (perhaps from a newer OpenRocket); ` +
    'it may stand on the outside, so the drag of what the file holds cannot be computed without it'
  );
}

function transitionReason(t: OrkTransition, last: boolean): string {
  const fore = t.foreRadius.value;
  const aft = t.aftRadius.value;
  const kind =
    fore === null || aft === null
      ? 'a transition'
      : aft < fore && last
        ? 'a boat-tail (a transition narrowing to the base)'
        : aft < fore
          ? 'a transition narrowing aft'
          : aft > fore
            ? 'a transition widening aft (a flare or a shoulder to a larger tube)'
            : 'a transition';
  return `${kind}: the drag model takes a cylinder of one diameter to a flat base`;
}

/**
 * The motor of a mount: whether it reaches aft of the base. The motor's
 * aft end is the mount's aft end plus OpenRocket's overhang;
 * `mountEndAheadOfBase` is how far the mount's aft end lies ahead of the
 * base.
 */
function checkMotor(
  m: Mapper,
  mount: OrkComponent,
  label: string,
  motorMount: OrkMotorMount,
  mountEndAheadOfBase: number | null,
) {
  if (motorMount.motors.length === 0) return;
  const motorLabel = `motor in ${label}`;
  const reach =
    motorMount.overhang === null || mountEndAheadOfBase === null
      ? null
      : motorMount.overhang - mountEndAheadOfBase;
  if (reach === null) {
    m.omit(
      mount,
      motorLabel,
      'the file does not give enough to place the motor, so whether it reaches aft of the base ' +
        'cannot be checked',
    );
  } else if (reach > LENGTH_TOLERANCE) {
    m.reachesAft(mount, motorLabel, reach, "the motor (by OpenRocket's overhang)");
  }
}

/** Walk the children of a component, placing each as OpenRocket does. */
function mapChildren(m: Mapper, parent: Parent) {
  let previousEnd: number | null = 0;
  for (const c of parent.component.children) {
    const label = `${typeName(c)} "${c.name}" (${c.type === 'trapezoidfinset' || c.type === 'ellipticalfinset' || c.type === 'freeformfinset' || c.type === 'tubefinset' || c.type === 'launchlug' || c.type === 'railbutton' ? 'on' : 'in'} ${parent.label})`;
    const x = relativePosition(c, parent, previousEnd);
    const own = lengthOf(c);
    previousEnd = x === null || own === null ? null : x + own;
    if (c.type === 'unknown') {
      m.refuse(c, label, unknownReason(c.element));
      continue;
    }
    if (!attaches(parent.component.type, c.type)) {
      m.ignore(
        c,
        label,
        `OpenRocket does not attach a ${typeName(c)} to a ${typeName(parent.component)} and ` +
          `ignores it${withContents(c)}`,
      );
      continue;
    }
    m.common(c, label);
    const absX = parent.absX === null || x === null ? null : parent.absX + x;
    // Distance from this component's aft end to the parent's aft end, and
    // from the parent's aft end to the base (body components only carry
    // the latter; inside them it is inherited).
    const aheadOfParentEnd = aftEndAheadOfParentEnd(c, parent, x);
    switch (c.type) {
      case 'trapezoidfinset':
      case 'ellipticalfinset':
      case 'freeformfinset':
      case 'tubefinset':
        fin(m, c, label, parent, aheadOfParentEnd);
        break;
      case 'launchlug': {
        const size =
          c.outerRadius !== null && c.length !== null
            ? ` (a tube ${formatLength(2 * c.outerRadius)} across and ${formatLength(c.length)} long${(c.instanceCount ?? 1) > 1 ? `, ${c.instanceCount} of them` : ''})`
            : '';
        m.omit(c, label, `an external protuberance${size} the drag model does not include`);
        break;
      }
      case 'railbutton': {
        const n = c.instanceCount ?? 1;
        const size =
          c.outerDiameter !== null && c.height !== null
            ? ` ${formatLength(c.outerDiameter)} across and ${formatLength(c.height)} tall`
            : '';
        m.omit(
          c,
          label,
          `${n === 1 ? 'a rail button' : `${n} rail buttons`}${size}: external protuberances ` +
            'the drag model does not include',
        );
        break;
      }
      case 'podset':
      case 'parallelstage':
        m.refuse(
          c,
          label,
          `${c.type === 'podset' ? 'pods' : 'boosters'}: bodies beside the main body, which the ` +
            `drag model does not include${withContents(c)}`,
        );
        break;
      case 'stage':
      case 'nosecone':
      case 'bodytube':
      case 'transition':
        // Not attached by OpenRocket (handled above); unreachable.
        break;
      default:
        internal(m, c, label, parent, absX, aheadOfParentEnd);
    }
  }
}

/**
 * How far a child's aft end lies ahead of its parent's aft end, computed
 * from the offset where OpenRocket measures from the aft end, so that a
 * component placed flush with the aft end gives exactly zero.
 */
function aftEndAheadOfParentEnd(c: OrkComponent, parent: Parent, x: number | null): number | null {
  const own = lengthOf(c);
  const a = c.axialOffset;
  if (x === null || own === null || parent.length === null) return null;
  if (x !== 0 && a !== null) {
    if (a.method === 'bottom') return -a.offset;
    if (a.method === 'top') return parent.length - a.offset - own;
    if (a.method === 'middle') return (parent.length - own) / 2 - a.offset;
  }
  return parent.length - (x + own);
}

function fin(
  m: Mapper,
  c: OrkFinSet | OrkTubeFinSet,
  label: string,
  parent: Parent,
  aheadOfParentEnd: number | null,
) {
  if (parent.component.type !== 'bodytube') {
    m.refuse(
      c,
      label,
      `fins on a ${typeName(parent.component)}: the drag model takes fins on the cylinder`,
    );
    return;
  }
  const planform = planformOf(c);
  if (typeof planform === 'string') {
    m.refuse(c, label, planform);
    return;
  }
  // c is a planar fin set from here (tube fins have no planform).
  const f = c as OrkFinSet;
  const problems: string[] = [];
  const count = f.count;
  if (count === null || !Number.isInteger(count))
    problems.push('the file does not give a fin count');
  else if (count < 1 || count > 8) {
    problems.push(`${count} fins in a set: outside 1 to 8, what OpenRocket accepts`);
  }
  let section: FlatPlateSection | undefined;
  if (f.thickness === null || !(f.thickness > 0)) {
    problems.push('the file does not give a fin thickness greater than zero');
  } else {
    const s = sectionOf(f.crossSection, f.thickness);
    if (typeof s === 'string') problems.push(s);
    else section = s;
  }
  const ahead =
    aheadOfParentEnd === null || parent.bodyBehind === null
      ? null
      : aheadOfParentEnd + parent.bodyBehind;
  const aheadOfBase = ahead !== null && Math.abs(ahead) <= LENGTH_TOLERANCE ? 0 : ahead;
  if (aheadOfBase === null) problems.push('the file does not give enough to place the fins');
  else if (aheadOfBase < 0) {
    problems.push(
      `the fins reach ${formatLength(-aheadOfBase)} aft of the base: the drag model takes fins ` +
        'that end at the base or ahead of it',
    );
  } else if (parent.absX !== null && parent.length !== null && parent.bodyBehind !== null) {
    // The root's leading edge must lie on the cylinder, behind the nose.
    const rootFront =
      parent.absX + parent.length + parent.bodyBehind - aheadOfBase - planform.rootChord;
    if (m.noseLength !== null && rootFront < m.noseLength - LENGTH_TOLERANCE) {
      problems.push(
        'the fin root reaches forward onto the nose: the drag model takes fins on the cylinder',
      );
    }
  }
  if (problems.length > 0) {
    m.refuse(c, label, problems.join('; '));
    return;
  }
  // Aspects the design leaves out, the fins themselves represented.
  if (f.cantDegrees !== null && f.cantDegrees !== 0) {
    m.omit(
      c,
      `cant of ${label}`,
      `the fins are canted ${f.cantDegrees} degree${Math.abs(f.cantDegrees) === 1 ? '' : 's'}` +
        (Math.abs(f.cantDegrees) > 15 ? ' (beyond the 15 degrees OpenRocket accepts)' : '') +
        ': the drag model takes fins aligned with the axis (no cant, no roll)',
    );
  } else if (f.cantDegrees === null) {
    m.omit(c, `cant of ${label}`, 'the file does not give a readable cant angle');
  }
  if (f.filletRadius === null || f.filletRadius !== 0) {
    m.omit(
      c,
      `fillets of ${label}`,
      f.filletRadius === null
        ? 'the file does not give a readable fillet radius'
        : `fillets of radius ${formatLength(f.filletRadius)} at the fin roots: the drag model ` +
            'does not include fillets',
    );
  }
  if (f.tab !== null && (f.tab.height ?? 0) > 0 && (f.tab.length ?? 0) > 0) {
    m.ignore(
      c,
      `tab of ${label}`,
      'the fin tab lies inside the body tube: it does not change the outer shape',
    );
  }
  m.candidates.push({
    fins: f,
    label,
    planform,
    section: section!,
    count: count!,
    aheadOfBase: aheadOfBase!,
    angleDegrees: f.angleOffset?.degrees ?? 0,
    mirrored: f.angleOffset?.method === 'mirror',
  });
}

function internal(
  m: Mapper,
  c: OrkComponent,
  label: string,
  parent: Parent,
  absX: number | null,
  aheadOfParentEnd: number | null,
) {
  const inside = 'inside the body: it does not change the outer shape';
  // How far its aft end lies ahead of the base (negative: aft of it).
  const behind =
    aheadOfParentEnd === null || parent.bodyBehind === null
      ? null
      : aheadOfParentEnd + parent.bodyBehind;
  switch (c.type) {
    case 'masscomponent':
    case 'shockcord':
    case 'parachute':
    case 'streamer':
      m.ignore(c, label, `a mass ${inside}`);
      break;
    default: {
      if (behind === null) {
        m.omit(
          c,
          label,
          'the file does not give enough to place it, so whether it reaches aft of the base ' +
            'cannot be checked',
        );
      } else if (behind < -LENGTH_TOLERANCE) {
        m.reachesAft(c, label, -behind, 'it');
      } else {
        m.ignore(c, label, inside);
      }
      if (c.type === 'innertube' && c.motorMount !== null) {
        checkMotor(m, c, label, c.motorMount, behind);
      }
    }
  }
  // What is inside it: placed relative to it, the body behind it inherited.
  mapChildren(m, {
    component: c,
    label: `${typeName(c)} "${c.name}"`,
    absX,
    length: lengthOf(c),
    bodyBehind: behind,
  });
}

/**
 * The fin set of the design: the candidates that are one set of identical,
 * evenly spaced fins at one position, or null when there are none.
 */
function mapFins(m: Mapper): DesignFinSet | null {
  const groups: FinCandidate[][] = [];
  for (const c of m.candidates) {
    const group = groups.find((g) => sameFins(g[0]!, c));
    if (group === undefined) groups.push([c]);
    else group.push(c);
  }
  // A group is one set only if its fins are evenly spaced round the body.
  const sets: FinCandidate[][] = [];
  for (const g of groups) {
    if (g.length === 1 || evenlySpaced(g)) sets.push(g);
    else for (const c of g) sets.push([c]);
  }
  if (sets.length === 0) return null;
  if (sets.length > 1) {
    for (const s of sets) {
      for (const c of s) {
        m.refuse(
          c.fins,
          c.label,
          `one of ${sets.length} fin sets that are not one set of identical, evenly spaced fins ` +
            'at one position: the drag model takes one fin set',
        );
      }
    }
    return null;
  }
  const set = sets[0]!;
  const first = set[0]!;
  const count = set.reduce((n, c) => n + c.count, 0);
  const p = first.planform;
  const s = first.section;
  const edges =
    s.leadingEdge === 'square'
      ? 'square-cut edges (OpenRocket\'s "square" section)'
      : 'rounded edges, each a full radius of half the thickness (OpenRocket\'s "rounded" section)';
  const others =
    set.length > 1
      ? `with ${set.length - 1} other identical fin set${set.length > 2 ? 's' : ''}, `
      : '';
  for (const c of set) {
    m.represent(
      c.fins,
      c.label,
      others +
        `${count} fins: root chord ${formatLength(p.rootChord)}, tip chord ${formatLength(p.tipChord)}, ` +
        `span ${formatLength(p.span)}, leading edge swept ${formatLength(p.sweepLength)} aft at the tip; ` +
        `flat plates ${formatLength(s.thickness)} thick with ${edges}; ` +
        (first.aheadOfBase === 0
          ? 'trailing edges at the base'
          : `trailing edges ${formatLength(first.aheadOfBase)} ahead of the base`),
    );
  }
  return {
    count,
    rootChord: p.rootChord,
    tipChord: p.tipChord,
    span: p.span,
    sweepLength: p.sweepLength,
    trailingEdgeAheadOfBase: first.aheadOfBase,
    section: s,
  };
}

const near = (a: number, b: number) => Math.abs(a - b) <= LENGTH_TOLERANCE;

function sameFins(a: FinCandidate, b: FinCandidate): boolean {
  return (
    near(a.planform.rootChord, b.planform.rootChord) &&
    near(a.planform.tipChord, b.planform.tipChord) &&
    near(a.planform.span, b.planform.span) &&
    near(a.planform.sweepLength, b.planform.sweepLength) &&
    near(a.section.thickness, b.section.thickness) &&
    a.section.leadingEdge === b.section.leadingEdge &&
    a.section.trailingEdge === b.section.trailingEdge &&
    near(a.aheadOfBase, b.aheadOfBase) &&
    a.fins.cantDegrees === b.fins.cantDegrees &&
    a.fins.filletRadius === b.fins.filletRadius
  );
}

/** Whether the fins of these sets together sit at equal angles round the body. */
function evenlySpaced(group: readonly FinCandidate[]): boolean {
  if (group.some((c) => c.mirrored)) return false;
  const angles: number[] = [];
  for (const c of group) {
    for (let j = 0; j < c.count; j++) {
      const a = (c.angleDegrees + (360 * j) / c.count) % 360;
      angles.push(a < 0 ? a + 360 : a);
    }
  }
  angles.sort((a, b) => a - b);
  const n = angles.length;
  const step = 360 / n;
  for (let k = 0; k < n; k++) {
    const gap = k + 1 < n ? angles[k + 1]! - angles[k]! : angles[0]! + 360 - angles[k]!;
    if (Math.abs(gap - step) > ANGLE_TOLERANCE) return false;
  }
  return true;
}
