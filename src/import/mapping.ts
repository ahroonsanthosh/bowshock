/**
 * The rocket of an OpenRocket file (./model.ts) as src/rocket's
 * RocketDesign, filled completely: every outside component is held in the
 * design as it is, or, where the design has no place for something, held
 * as far as it can be with a note (DesignNote) that says what is missing.
 * Nothing is approximated and nothing outside is dropped. Whether the drag
 * logic can represent the design is the adapter's question
 * (src/rocket/adapter.ts, design record 0017 section 4.2), not this one's.
 *
 * - Held exactly: the nose; the body tubes and transitions of every stage,
 *   front to back (a tail cone, a flipped nose cone, is a transition to
 *   nothing); the fin sets, trapezoidal, elliptical or freeform, with
 *   their section (OpenRocket's square and rounded are flat plates with
 *   square or rounded edges, its airfoil is the airfoil), thickness,
 *   position, rotation, cant and fillets. Fin sets OpenRocket holds apart
 *   that are identical, at one position, and evenly spaced together are
 *   one set; a freeform outline that is exactly a trapezoid is held as one.
 * - Held as other parts, with a note for what the design cannot hold
 *   (size, place, contents): launch lugs, rail buttons, pods, boosters,
 *   tube fins, components this importer does not know, and an inner part
 *   or motor reaching aft of the base.
 * - Notes only: more than one stage (the stack is held as one body),
 *   OpenRocket's drag-coefficient overrides, the surface finishes (with
 *   OpenRocket's roughness heights; the drag model takes roughness only as
 *   a band with its source, and the import makes none), and a transition
 *   whose profile OpenRocket clips.
 * - Ignored, each with its reason: what lies inside the body (inner tubes,
 *   couplers, rings, bulkheads, masses, recovery gear, fin tabs) and
 *   components OpenRocket itself does not attach.
 * - No design, with the reasons: what the design cannot hold at all (no
 *   nose cone first, a shape OpenRocket draws but NoseShape cannot,
 *   body sections with gaps or overlaps) and values the file does not give.
 *
 * docs/design/0018-openrocket-import.md section 4.
 */

import { validateNose, type NoseShape } from '../geometry/nose';
import type {
  BodySection,
  DesignNote,
  FinPlanform,
  FinSection,
  FinSetDesign,
  FlightDesign,
  NoseDesign,
  OtherPart,
  PartSize,
  RocketDesign,
} from '../rocket/design';
import {
  ORK_FINISHES,
  ORK_TYPE_NAMES,
  type OrkBodyTube,
  type OrkComponent,
  type OrkDocument,
  type OrkFinSet,
  type OrkMotorMount,
  type OrkNoseCone,
  type OrkPodSet,
  type OrkSimulation,
  type OrkTransition,
} from './model';
import { ORK_SHAPES } from './parse';

/**
 * Positions that differ by no more than this (metres) are taken as equal
 * (fin sets at one position, a part flush with the base). A nanometre is
 * far below any rocket's tolerances and far above the rounding of a
 * position in metres.
 */
export const LENGTH_TOLERANCE = 1e-9;
/** OpenRocket sets a relative position under this (metres) to zero (RocketComponent.setAxialOffset). */
export const POSITION_SNAP = 1e-6;
/** OpenRocket draws a power series of parameter at most this as a flat-faced cylinder. */
export const POWER_FLAT_FACE = 1e-5;
/** Fin sets taken as one set must be evenly spaced within this (degrees). */
export const ANGLE_TOLERANCE = 1e-6;
/** OpenRocket's limits: fins per set, and cant (FinSet.setFinCount, MAX_CANT_RADIANS). */
export const OPENROCKET_MAX_FINS = 8;
export const OPENROCKET_MAX_CANT_DEGREES = 15;
/** The flight when neither the caller nor the file gives one (the page's defaults, 0017 section 2). */
export const DEFAULT_FLIGHT: FlightDesign = { maxMach: 3.0, altitude: 0 };

export interface ComponentRef {
  /** The component in plain words, e.g. `launch lug "Launch lug" (on body tube "Body tube")`. */
  readonly component: string;
  /** OpenRocket's element name ('nosecone', 'launchlug', ...), or 'rocket' or 'file'. */
  readonly type: OrkComponent['type'] | 'rocket' | 'file';
  /** Its name in the file. */
  readonly name: string;
}

export interface RepresentedNote extends ComponentRef {
  /** How the design holds it. */
  readonly as: string;
}

export interface NotRepresentedNote extends ComponentRef {
  readonly reason: string;
  /**
   * 'no-design': the design cannot hold it at all, so there is no design.
   * 'note': the design holds it as far as it can (or not at all, for a
   * setting), and the reason is among the design's notes.
   */
  readonly effect: 'no-design' | 'note';
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

export interface MapOptions {
  /** The file's name, for the design's source. */
  readonly fileName: string;
  /** The flight to hold; by default the file's simulations give it (see `flightFrom`). */
  readonly flight?: FlightDesign;
}

/**
 * The size of an other part, metres, as the file gives it; each field
 * only where it applies (RocketDesign's PartSize, held in the part). A
 * motor mount holds one motor per flight configuration: a motor's
 * diameter and length are the largest among them.
 */
export type { PartSize } from '../rocket/design';

/** One of the design's other parts, with what OtherPart has no place for. */
export interface OtherPartDetail {
  /** The part as in `design.otherParts`, at the same index. */
  readonly part: OtherPart;
  /** The component in plain words, as in the notes. */
  readonly component: string;
  /** OpenRocket's element name. */
  readonly type: OrkComponent['type'];
  readonly size: PartSize;
  /** Its front, metres from the nose's tip; null if the file does not give enough to place it. */
  readonly front: number | null;
  /** The first one's roll angle, degrees, where the file gives one. */
  readonly rotation: number | null;
}

export interface OrkMapping {
  /** The design, or null when something marked 'no-design' keeps it from being made. */
  readonly design: RocketDesign | null;
  /** Components the design holds exactly. */
  readonly represented: readonly RepresentedNote[];
  /** Components and settings the design cannot hold exactly, each with its reason. */
  readonly notRepresented: readonly NotRepresentedNote[];
  /**
   * Components that do not belong in the design (inside the body, or not
   * attached by OpenRocket); each is also among the design's notes, its
   * reason starting "ignored:".
   */
  readonly ignored: readonly IgnoredNote[];
  /** Each of `design.otherParts`, in the same order, with its size and place. */
  readonly otherPartDetails: readonly OtherPartDetail[];
  /** The surface finish of each outside component. */
  readonly finishes: readonly FinishNote[];
  /** Where the design's flight came from, in plain words. */
  readonly flightFrom: string;
}

const typeName = (c: OrkComponent) => ORK_TYPE_NAMES[c.type];
const named = (c: OrkComponent) => `${typeName(c)} "${c.name}"`;

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
 * component's isCompatible); OpenRocket's loader ignores an incompatible
 * child with everything in it. Unknown elements are left to the caller.
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
  /** Absolute position of the front, metres from the nose's tip; null if unknown. */
  readonly absX: number | null;
  readonly length: number | null;
  /** A body tube's outer radius (pods and boosters are placed from it); null otherwise. */
  readonly radius: number | null;
}

/** The fields of a PartSize that the file gives: absent and unreadable values left out. */
function sized(fields: { readonly [K in keyof PartSize]?: number | null }): PartSize {
  const size: Record<string, number> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === 'number') size[k] = v;
  }
  return size;
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

/** A shape and parameter as src/geometry's NoseShape, or why it has none. */
function shapeOf(shape: string, p: number | null): NoseShape | string {
  const range = ORK_SHAPES[shape];
  if (range === undefined) return `the shape "${shape}" is not one OpenRocket knows`;
  if (range.usesParameter) {
    if (p === null) return 'the file does not give a readable shape parameter';
    if (!(p >= range.min && p <= range.max)) {
      return (
        `the shape parameter ${p} lies outside ${range.min} to ${Number(range.max.toPrecision(6))}, ` +
        'the range OpenRocket accepts for this shape (it would change it)'
      );
    }
  }
  switch (shape) {
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
          'face, a shape the design cannot hold'
        );
      }
      return { kind: 'power', exponent: p! };
    case 'parabolic':
      return { kind: 'parabolic', parameter: p! };
    default:
      return { kind: 'haack', parameter: p! };
  }
}

function describeShape(shape: NoseShape): string {
  switch (shape.kind) {
    case 'conical':
      return 'conical';
    case 'ogive':
      return shape.parameter === 1 ? 'tangent ogive' : `ogive of parameter ${shape.parameter}`;
    case 'ellipsoid':
      return 'ellipsoid';
    case 'power':
      return `power series of exponent ${shape.exponent}`;
    case 'parabolic':
      return `parabolic series of parameter ${shape.parameter}`;
    case 'haack':
      return shape.parameter === 0
        ? 'Von Karman (LD-Haack)'
        : `Haack series of parameter ${shape.parameter}`;
  }
}

/** A fin set's outline as the design holds it, or why it cannot. */
function planformOf(f: OrkFinSet): { planform: FinPlanform; how: string } | string {
  switch (f.type) {
    case 'trapezoidfinset': {
      const { rootChord, tipChord, sweepLength, height } = f;
      if (rootChord === null || tipChord === null || sweepLength === null || height === null) {
        return 'the file does not give its root chord, tip chord, sweep length and height';
      }
      if (!(rootChord >= 0 && tipChord >= 0 && height >= 0)) {
        return 'a negative root chord, tip chord or height, which OpenRocket does not accept';
      }
      return {
        planform: { kind: 'trapezoidal', rootChord, tipChord, span: height, sweepLength },
        how:
          `trapezoidal, root chord ${formatLength(rootChord)}, tip chord ${formatLength(tipChord)}, ` +
          `span ${formatLength(height)}, the tip's leading edge ${formatLength(sweepLength)} aft`,
      };
    }
    case 'ellipticalfinset': {
      const { rootChord, height } = f;
      if (rootChord === null || height === null) {
        return 'the file does not give its root chord and height';
      }
      if (!(rootChord >= 0 && height >= 0)) {
        return 'a negative root chord or height, which OpenRocket does not accept';
      }
      return {
        planform: { kind: 'elliptical', rootChord, span: height },
        how: `elliptical, root chord ${formatLength(rootChord)}, span ${formatLength(height)}`,
      };
    }
    case 'freeformfinset': {
      const p = f.points;
      if (p === null) return 'the file does not give its outline as points';
      // A trapezoid (or a triangle) with a tip parallel to the root, exactly.
      const first = p[0];
      const last = p[p.length - 1];
      const rootOk =
        first !== undefined &&
        last !== undefined &&
        first.x === 0 &&
        first.y === 0 &&
        last.y === 0 &&
        last.x > 0;
      if (rootOk && p.length === 4) {
        const a = p[1]!;
        const b = p[2]!;
        if (a.y > 0 && a.y === b.y && b.x >= a.x) {
          return {
            planform: {
              kind: 'trapezoidal',
              rootChord: last.x,
              tipChord: b.x - a.x,
              span: a.y,
              sweepLength: a.x,
            },
            how:
              `an outline of 4 points that is exactly a trapezoid, held as one: root chord ` +
              `${formatLength(last.x)}, tip chord ${formatLength(b.x - a.x)}, span ` +
              `${formatLength(a.y)}, the tip's leading edge ${formatLength(a.x)} aft`,
          };
        }
      }
      if (rootOk && p.length === 3 && p[1]!.y > 0) {
        const tip = p[1]!;
        return {
          planform: {
            kind: 'trapezoidal',
            rootChord: last.x,
            tipChord: 0,
            span: tip.y,
            sweepLength: tip.x,
          },
          how:
            `an outline of 3 points, a triangle, held as a trapezoid of tip chord 0: root chord ` +
            `${formatLength(last.x)}, span ${formatLength(tip.y)}, the tip ${formatLength(tip.x)} aft`,
        };
      }
      return {
        planform: { kind: 'freeform', points: p.map((q) => [q.x, q.y] as const) },
        how: `freeform, an outline of ${p.length} points`,
      };
    }
  }
}

/** OpenRocket's cross section as the design's, and a note if OpenRocket does not know it. */
function sectionOf(crossSection: string): { section: FinSection; how: string; note?: string } {
  switch (crossSection) {
    case 'square':
      return {
        section: {
          kind: 'flat',
          leadingEdge: { kind: 'square' },
          trailingEdge: { kind: 'square' },
        },
        how: 'flat, edges cut square (OpenRocket\'s "square")',
      };
    case 'rounded':
      return {
        section: {
          kind: 'flat',
          leadingEdge: { kind: 'rounded' },
          trailingEdge: { kind: 'rounded' },
        },
        how: 'flat, both edges rounded to half a circle of the thickness (OpenRocket\'s "rounded")',
      };
    case 'airfoil':
      return { section: { kind: 'airfoil' }, how: 'OpenRocket\'s "airfoil"' };
    default:
      return {
        section: {
          kind: 'flat',
          leadingEdge: { kind: 'square' },
          trailingEdge: { kind: 'square' },
        },
        how: 'flat, edges cut square',
        note:
          `the file names the cross section "${crossSection}", which OpenRocket does not know; ` +
          'OpenRocket keeps its default, square, and so does this import',
      };
  }
}

interface FinCandidate {
  readonly fins: OrkFinSet;
  readonly label: string;
  readonly planform: FinPlanform;
  readonly how: string;
  readonly section: FinSection;
  readonly sectionHow: string;
  readonly thickness: number;
  readonly count: number;
  readonly rootLeadingEdge: number;
  readonly rotation: number;
  readonly cant: number;
  readonly filletRadius: number;
  readonly mirrored: boolean;
}

class Mapper {
  readonly represented: RepresentedNote[] = [];
  readonly notRepresented: NotRepresentedNote[] = [];
  readonly ignored: IgnoredNote[] = [];
  readonly finishes: FinishNote[] = [];
  readonly candidates: FinCandidate[] = [];
  readonly otherParts: OtherPart[] = [];
  readonly otherPartDetails: OtherPartDetail[] = [];
  /** The base's position from the nose's tip, once the body is read. */
  base: number | null = null;

  ref(c: OrkComponent, label: string): ComponentRef {
    return { component: label, type: c.type, name: c.name };
  }

  represent(c: OrkComponent, label: string, as: string) {
    this.represented.push({ ...this.ref(c, label), as });
  }

  /** The design cannot hold it at all: no design. */
  refuse(c: OrkComponent, label: string, reason: string) {
    this.notRepresented.push({ ...this.ref(c, label), reason, effect: 'no-design' });
  }

  /** Held as far as the design can, the rest said in a note. */
  note(c: OrkComponent, label: string, reason: string) {
    this.notRepresented.push({ ...this.ref(c, label), reason, effect: 'note' });
  }

  ignore(c: OrkComponent, label: string, reason: string) {
    this.ignored.push({ ...this.ref(c, label), reason });
  }

  /** An outside part the design holds as an other part, with its size and place (and beside it). */
  other(
    c: OrkComponent,
    label: string,
    part: { kind: OtherPart['kind']; count: number | null; name?: string },
    size: PartSize,
    front: number | null,
    rotation: number | null = null,
  ) {
    // Its size, front and roll in the part itself (and beside it, as before).
    const p: OtherPart = {
      kind: part.kind,
      name: part.name ?? c.name,
      count: part.count ?? 1,
      size,
      ...(front === null ? {} : { front }),
      ...(rotation === null ? {} : { rotation }),
    };
    this.otherParts.push(p);
    this.otherPartDetails.push({ part: p, component: label, type: c.type, size, front, rotation });
  }

  /** The aspects every component may carry: a drag override, a surface finish. */
  common(c: OrkComponent, label: string) {
    if (c.overrideCd !== null) {
      this.note(
        c,
        `drag override on ${label}`,
        `OpenRocket's override of its drag coefficient (${c.overrideCd}) is a setting of ` +
          "OpenRocket's own estimate, which the design has no place for; bowshock computes the " +
          'drag from the shape',
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

type BodyComponent = OrkNoseCone | OrkBodyTube | OrkTransition;

interface BodyItem {
  readonly c: BodyComponent;
  readonly label: string;
  fore: number | null;
  aft: number | null;
  readonly foreAuto: boolean;
  readonly aftAuto: boolean;
}

/** The radii at each end of a body component as the file gives them (null: automatic and not stored). */
function bodyItem(c: BodyComponent): BodyItem {
  const label = named(c);
  switch (c.type) {
    case 'nosecone': {
      // The file's <aftradius> is the base radius, at the fore end of a flipped nose.
      const r = c.aftRadius;
      return c.flipped
        ? { c, label, fore: r.value, aft: 0, foreAuto: r.automatic, aftAuto: false }
        : { c, label, fore: 0, aft: r.value, foreAuto: false, aftAuto: r.automatic };
    }
    case 'bodytube': {
      const r = c.outerRadius;
      return { c, label, fore: r.value, aft: r.value, foreAuto: r.automatic, aftAuto: r.automatic };
    }
    case 'transition':
      return {
        c,
        label,
        fore: c.foreRadius.value,
        aft: c.aftRadius.value,
        foreAuto: c.foreRadius.automatic,
        aftAuto: c.aftRadius.automatic,
      };
  }
}

/** Map an OpenRocket document's rocket onto the design. */
export function mapOrk(doc: OrkDocument, options: MapOptions): OrkMapping {
  const m = new Mapper();
  const rocket = doc.rocket;
  for (const c of rocket.unattached) {
    m.ignore(
      c,
      named(c),
      `OpenRocket attaches only stages to the rocket and ignores a ${typeName(c)} placed ` +
        `there${withContents(c)}`,
    );
  }
  const { flight, flightFrom } = flightOf(doc.simulations, options.flight);
  if (rocket.stages.length === 0) {
    m.notRepresented.push({
      component: `rocket "${rocket.name}"`,
      type: 'rocket',
      name: rocket.name,
      reason: 'the file holds no stage, so there is no body',
      effect: 'no-design',
    });
    return result(m, null, flightFrom);
  }

  // The body: every stage's nose cones, tubes and transitions, front to back.
  const items: BodyItem[] = [];
  rocket.stages.forEach((s, k) => {
    const label = `stage "${s.name}"`;
    m.common(s, label);
    if (s.axialOffset !== null && s.axialOffset.method !== 'after') {
      m.refuse(s, label, positionedReason(s));
    } else if (k === 0) {
      m.represent(
        s,
        label,
        rocket.stages.length === 1 ? "the rocket's only stage" : 'the top stage',
      );
    } else {
      m.note(
        s,
        label,
        `stage ${k + 1} of ${rocket.stages.length}: the design holds the stack as one body, front ` +
          "to back, with every stage's fins; that the stages separate in flight has no place in it",
      );
    }
    for (const c of s.children) {
      if (c.type === 'nosecone' || c.type === 'bodytube' || c.type === 'transition') {
        items.push(bodyItem(c));
      } else if (c.type === 'unknown') {
        unknown(m, c, named(c), null);
      } else {
        m.ignore(
          c,
          named(c),
          'OpenRocket attaches only nose cones, body tubes and transitions to a stage and ' +
            `ignores a ${typeName(c)} placed there${withContents(c)}`,
        );
      }
    }
  });
  resolveAutomaticRadii(items);

  const first = items[0];
  if (first === undefined) {
    m.notRepresented.push({
      component: `rocket "${rocket.name}"`,
      type: 'rocket',
      name: rocket.name,
      reason: 'its stages hold no nose cone, body tube or transition, so there is no body',
      effect: 'no-design',
    });
  } else if (first.c.type !== 'nosecone' || first.c.flipped) {
    m.refuse(
      first.c,
      first.label,
      first.c.type === 'nosecone'
        ? 'the rocket starts with a flipped nose cone (a tail cone): the design needs a nose first'
        : `the rocket starts with a ${typeName(first.c)}: the design needs a nose cone first`,
    );
  }

  // Positions along the body, and the base.
  const fronts: (number | null)[] = [];
  let at: number | null = 0;
  for (const item of items) {
    fronts.push(at);
    at = at === null || item.c.length === null ? null : at + item.c.length;
  }
  m.base = at;

  let nose: NoseDesign | undefined;
  const body: BodySection[] = [];
  items.forEach((item, i) => {
    const { c, label } = item;
    m.common(c, label);
    const problems: string[] = [];
    if (c.axialOffset !== null && c.axialOffset.method !== 'after') {
      problems.push(positionedReason(c));
    }
    const length = c.length;
    if (length === null || !(length >= 0)) {
      problems.push('the file does not give a length of zero or more');
    }
    const { fore, aft } = item;
    if (fore === null || aft === null || !(fore >= 0 && aft >= 0)) {
      problems.push('the file does not give its radius (or gives a negative one)');
    }
    const shape = c.type === 'bodytube' ? undefined : shapeOf(c.shape, c.shapeParameter);
    if (typeof shape === 'string') problems.push(shape);
    if (problems.length > 0 || length === null || fore === null || aft === null) {
      // Not when the first component is not a nose: that is said already.
      if (problems.length > 0) m.refuse(c, label, problems.join('; '));
      mapChildren(m, {
        component: c,
        label,
        absX: fronts[i] ?? null,
        length: c.length,
        radius: c.type === 'bodytube' ? fore : null,
      });
      return;
    }
    if (i === 0 && c.type === 'nosecone' && !c.flipped) {
      const s = shape as NoseShape;
      try {
        validateNose({ shape: s, length, baseRadius: aft });
        nose = { shape: s, length, diameter: 2 * aft };
        m.represent(
          c,
          label,
          `the nose: ${describeShape(s)}, ${formatLength(length)} long, ` +
            `${formatLength(2 * aft)} across at its base` +
            (c.aftShoulder.length !== null && c.aftShoulder.length > 0
              ? ' (its shoulder lies inside the body tube)'
              : ''),
        );
        shoulderCheck(m, c, label, aft, length);
      } catch (e) {
        if (!(e instanceof RangeError)) throw e;
        m.refuse(c, label, e.message);
      }
    } else if (i > 0 && c.type === 'bodytube') {
      body.push({ kind: 'tube', length, diameter: 2 * fore });
      m.represent(
        c,
        label,
        `a tube ${formatLength(length)} long, ${formatLength(2 * fore)} across`,
      );
    } else if (i > 0 && c.type !== 'bodytube') {
      const s = shape as NoseShape;
      let refused = false;
      // A transition of zero length is a step between the two diameters,
      // whatever its shape; shapeOf has checked the shape's range already,
      // so this is a guard.
      if (fore !== aft && length > 0) {
        try {
          validateNose({ shape: s, length, baseRadius: Math.abs(aft - fore) });
        } catch (e) {
          if (!(e instanceof RangeError)) throw e;
          m.refuse(c, label, e.message);
          refused = true;
        }
      }
      if (!refused) transitionOf(m, c, label, s, length, fore, aft, body);
    }
    mapChildren(m, {
      component: c,
      label,
      absX: fronts[i] ?? null,
      length,
      radius: c.type === 'bodytube' ? fore : null,
    });
    if (c.type === 'bodytube' && c.motorMount !== null) {
      const end = fronts[i] === null || fronts[i] === undefined ? null : fronts[i] + length;
      checkMotor(m, c, label, c.motorMount, end);
    }
  });

  const finSets = mapFins(m);
  finishNote(m);
  if (nose === undefined || m.notRepresented.some((n) => n.effect === 'no-design')) {
    return result(m, null, flightFrom);
  }
  // The notes: what the design holds only in part or not at all, then
  // what was ignored (inside the body, or not attached by OpenRocket).
  const notes: DesignNote[] = [
    ...m.notRepresented.map((n) => ({ feature: n.component, reason: n.reason })),
    ...m.ignored.map((n) => ({ feature: n.component, reason: `ignored: ${n.reason}` })),
  ];
  return result(
    m,
    {
      name: rocket.name === '' ? options.fileName : rocket.name,
      nose,
      body,
      finSets,
      otherParts: m.otherParts,
      // Where the flight's numbers came from, said on the page beside them.
      flight: flight.from === undefined ? { ...flight, from: flightFrom } : flight,
      notes,
      source: { kind: 'openrocket', fileName: options.fileName },
    },
    flightFrom,
  );
}

/** A transition, or a nose cone behind the front, as the design's transition. */
function transitionOf(
  m: Mapper,
  c: OrkNoseCone | OrkTransition,
  label: string,
  shape: NoseShape,
  length: number,
  fore: number,
  aft: number,
  body: BodySection[],
) {
  const clipped = c.type === 'transition' && clips(c);
  body.push({
    kind: 'transition',
    length,
    foreDiameter: 2 * fore,
    aftDiameter: 2 * aft,
    shape,
    ...(clipped ? { clipped: true } : {}),
  });
  const what =
    c.type === 'nosecone'
      ? c.flipped
        ? 'a tail cone (a flipped nose cone), held as a transition'
        : 'a nose cone behind the front of the rocket, held as a transition'
      : 'a transition';
  m.represent(
    c,
    label,
    `${what}: ${describeShape(shape)}${clipped ? ', clipped as OpenRocket clips it' : ''}, ` +
      `${formatLength(length)} long, from ${formatLength(2 * fore)} to ${formatLength(2 * aft)} across`,
  );
}

function result(m: Mapper, design: RocketDesign | null, flightFrom: string): OrkMapping {
  return {
    design,
    represented: m.represented,
    notRepresented: m.notRepresented,
    ignored: m.ignored,
    otherPartDetails: design === null ? [] : m.otherPartDetails,
    finishes: m.finishes,
    flightFrom,
  };
}

function positionedReason(c: OrkComponent): string {
  const a = c.axialOffset!;
  return (
    `it is placed ${formatLength(a.offset)} from its ${a.method} reference rather than behind ` +
    'the component before it, so the body may have a gap or an overlap, which the design has no ' +
    'place for'
  );
}

/**
 * Automatic radii the file does not store (older files write "auto"
 * alone): as OpenRocket, a fore radius from the component ahead, an aft
 * radius from the component behind, a tube's from either.
 */
function resolveAutomaticRadii(items: BodyItem[]) {
  for (let pass = 0; pass < 2; pass++) {
    items.forEach((item, i) => {
      const before = items[i - 1];
      const after = items[i + 1];
      if (item.c.type === 'bodytube') {
        if (item.fore === null && item.foreAuto) {
          const r = before?.aft ?? after?.fore ?? null;
          item.fore = r;
          item.aft = r;
        }
        return;
      }
      if (item.fore === null && item.foreAuto) item.fore = before?.aft ?? null;
      if (item.aft === null && item.aftAuto) item.aft = after?.fore ?? null;
    });
  }
}

/** A shoulder wider than the body would stand out of the body tube: an other part. */
function shoulderCheck(m: Mapper, c: OrkNoseCone, label: string, radius: number, length: number) {
  const s = c.aftShoulder;
  if (
    s.length !== null &&
    s.length > 0 &&
    s.radius !== null &&
    s.radius > radius + LENGTH_TOLERANCE
  ) {
    const shoulder = `shoulder of ${label}`;
    m.other(
      c,
      shoulder,
      { kind: 'other', count: 1, name: `${c.name} shoulder` },
      sized({ length: s.length, diameter: 2 * s.radius }),
      length,
    );
    m.note(
      c,
      shoulder,
      `the shoulder's radius, ${formatLength(s.radius)}, is greater than the nose's base ` +
        `radius, ${formatLength(radius)}, so it would stand out of the body tube; the design ` +
        'holds it as another part',
    );
  }
}

/**
 * Whether OpenRocket clips this transition's profile (by default for the
 * ellipsoid, power and Haack shapes): it is then the part of a nose of the
 * larger radius lying between the two radii, not the nose shape laid
 * between them; the design's transition holds it as `clipped`.
 */
function clips(c: OrkTransition): boolean {
  const clippable = c.shape === 'ellipsoid' || c.shape === 'power' || c.shape === 'haack';
  return clippable && c.shapeClipped !== false;
}

/**
 * A pod's or booster's size: the length of its body, its largest
 * diameter, and its axis's distance from the rocket's, by OpenRocket's
 * radius methods (RadiusMethod: free, the offset itself; relative, the
 * body tube's radius, the offset and the pod's radius; surface, the two
 * radii; coaxial, zero).
 */
function podSize(c: OrkPodSet, parentRadius: number | null): PartSize {
  let radius: number | null = 0;
  for (const k of c.children) {
    const r =
      k.type === 'nosecone'
        ? k.aftRadius.value
        : k.type === 'bodytube'
          ? k.outerRadius.value
          : k.type === 'transition'
            ? k.foreRadius.value === null || k.aftRadius.value === null
              ? null
              : Math.max(k.foreRadius.value, k.aftRadius.value)
            : 0;
    radius = radius === null || r === null ? null : Math.max(radius, r);
  }
  const o = c.radiusOffset;
  const radialOffset =
    o === null
      ? null
      : o.method === 'coaxial'
        ? 0
        : o.method === 'free'
          ? o.value
          : o.method === 'relative' && o.value !== null && parentRadius !== null && radius !== null
            ? parentRadius + o.value + radius
            : o.method === 'surface' && parentRadius !== null && radius !== null
              ? parentRadius + radius
              : null;
  return sized({
    length: lengthOf(c),
    diameter: radius === null ? null : 2 * radius,
    radialOffset,
  });
}

function unknown(m: Mapper, c: OrkComponent, label: string, front: number | null) {
  const element = c.type === 'unknown' ? c.element : c.type;
  m.other(
    c,
    label,
    { kind: 'other', count: 1, name: c.name === '' ? `<${element}>` : c.name },
    {},
    front,
  );
  m.note(
    c,
    label,
    `<${element}> is not a component this importer knows (perhaps from a newer OpenRocket); it ` +
      'may stand outside the body, so it is held as another part, its shape unknown',
  );
}

/**
 * The motor of a mount: whether it reaches aft of the base. The motor's
 * aft end is the mount's aft end plus OpenRocket's overhang.
 */
function checkMotor(
  m: Mapper,
  mount: OrkComponent,
  label: string,
  motorMount: OrkMotorMount,
  mountEnd: number | null,
) {
  if (motorMount.motors.length === 0) return;
  const motorLabel = `motor in ${label}`;
  const reach =
    motorMount.overhang === null || mountEnd === null || m.base === null
      ? null
      : mountEnd + motorMount.overhang - m.base;
  const largest = (values: readonly (number | null)[]) => {
    const known = values.filter((v): v is number => v !== null);
    return known.length === 0 ? null : Math.max(...known);
  };
  const diameter = largest(motorMount.motors.map((x) => x.diameter));
  const length = largest(motorMount.motors.map((x) => x.length));
  const part = { kind: 'other' as const, count: 1, name: `motor in ${mount.name}` };
  if (reach === null) {
    m.other(mount, motorLabel, part, sized({ diameter, length }), null);
    m.note(
      mount,
      motorLabel,
      'the file does not give enough to place the motor, so whether it reaches aft of the base ' +
        'is not known; the design holds it as another part',
    );
  } else if (reach > LENGTH_TOLERANCE) {
    const front =
      length === null || mountEnd === null ? null : mountEnd + motorMount.overhang! - length;
    m.other(mount, motorLabel, part, sized({ diameter, length, reachAftOfBase: reach }), front);
    m.note(
      mount,
      motorLabel,
      `the motor reaches ${formatLength(reach)} aft of the base (by OpenRocket's overhang); the ` +
        'design holds it as another part',
    );
  }
}

/** Walk the children of a component, placing each as OpenRocket does. */
function mapChildren(m: Mapper, parent: Parent) {
  let previousEnd: number | null = 0;
  for (const c of parent.component.children) {
    const on = EXTERNAL_ATTACHED.has(c.type) ? 'on' : 'in';
    const label = `${named(c)} (${on} ${parent.label})`;
    const x = relativePosition(c, parent, previousEnd);
    const own = lengthOf(c);
    previousEnd = x === null || own === null ? null : x + own;
    if (c.type === 'unknown') {
      unknown(m, c, label, parent.absX === null || x === null ? null : parent.absX + x);
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
    const where = absX === null ? '' : `, its front ${formatLength(absX)} from the nose's tip`;
    switch (c.type) {
      case 'trapezoidfinset':
      case 'ellipticalfinset':
      case 'freeformfinset':
        fin(m, c, label, absX);
        break;
      case 'tubefinset': {
        m.other(
          c,
          label,
          { kind: 'other', count: c.count },
          sized({
            length: c.length,
            diameter: c.outerRadius.value === null ? null : 2 * c.outerRadius.value,
            thickness: c.thickness,
          }),
          absX,
          c.angleOffset?.degrees ?? null,
        );
        const size =
          c.length === null
            ? ''
            : `, ${formatLength(c.length)} long` +
              (c.outerRadius.value === null
                ? ''
                : `, ${formatLength(2 * c.outerRadius.value)} across`);
        m.note(
          c,
          label,
          `${c.count ?? 'some'} tube fins${size}${where}: the design's fin sets are flat fins, so ` +
            'it holds them as another part, not their shape',
        );
        break;
      }
      case 'launchlug': {
        m.other(
          c,
          label,
          { kind: 'launch-lug', count: c.instanceCount },
          sized({
            length: c.length,
            diameter: c.outerRadius === null ? null : 2 * c.outerRadius,
            thickness: c.thickness,
            separation: (c.instanceCount ?? 1) > 1 ? c.instanceSeparation : null,
          }),
          absX,
          c.angleOffset?.degrees ?? null,
        );
        const size =
          c.outerRadius !== null && c.length !== null
            ? `a tube ${formatLength(2 * c.outerRadius)} across and ${formatLength(c.length)} long`
            : 'a launch lug';
        m.note(
          c,
          label,
          `${size}${where}: the design holds it with its size and place; bowshock does not ` +
            "model a launch lug's drag",
        );
        break;
      }
      case 'railbutton': {
        const n = c.instanceCount ?? 1;
        m.other(
          c,
          label,
          { kind: 'rail-button', count: n },
          sized({
            diameter: c.outerDiameter,
            innerDiameter: c.innerDiameter,
            height: c.height,
            baseHeight: c.baseHeight,
            flangeHeight: c.flangeHeight,
            screwHeight: c.screwHeight,
            separation: n > 1 ? c.instanceSeparation : null,
          }),
          absX,
          c.angleOffset?.degrees ?? null,
        );
        const size =
          c.outerDiameter !== null && c.height !== null
            ? ` ${formatLength(c.outerDiameter)} across and ${formatLength(c.height)} tall`
            : '';
        const place =
          absX === null
            ? ''
            : n === 1
              ? `, ${formatLength(absX)} from the nose's tip`
              : `, the first ${formatLength(absX)} from the nose's tip` +
                (c.instanceSeparation === null
                  ? ''
                  : `, ${formatLength(c.instanceSeparation)} apart`);
        m.note(
          c,
          label,
          `${n === 1 ? 'a rail button' : `${n} rail buttons`}${size}${place}: the design ` +
            `holds ${n === 1 ? 'it' : 'them'} with ${n === 1 ? 'its' : 'their'} size and place; ` +
            "bowshock does not model a rail button's drag",
        );
        break;
      }
      case 'podset':
        m.other(
          c,
          label,
          { kind: 'pod', count: c.instanceCount },
          podSize(c, parent.radius),
          absX,
          c.angleOffset?.degrees ?? null,
        );
        m.note(
          c,
          label,
          `${c.instanceCount ?? 1} pod${c.instanceCount === 1 ? '' : 's'} beside the body` +
            `${withContents(c)}: the design holds their size and place, not their shape`,
        );
        break;
      case 'parallelstage':
        m.other(
          c,
          label,
          { kind: 'other', count: c.instanceCount },
          podSize(c, parent.radius),
          absX,
          c.angleOffset?.degrees ?? null,
        );
        m.note(
          c,
          label,
          `${c.instanceCount ?? 1} booster${c.instanceCount === 1 ? '' : 's'} (a parallel stage) ` +
            `beside the body${withContents(c)}: the design holds them as another part, with ` +
            'their size and place, not their shape or that they separate',
        );
        break;
      case 'stage':
      case 'nosecone':
      case 'bodytube':
      case 'transition':
        // Not attached by OpenRocket here (handled above).
        break;
      default:
        internal(m, c, label, absX, own);
    }
  }
}

function fin(m: Mapper, f: OrkFinSet, label: string, rootLeadingEdge: number | null) {
  const problems: string[] = [];
  const outline = planformOf(f);
  if (typeof outline === 'string') problems.push(outline);
  const count = f.count;
  if (count === null) problems.push('the file does not give a fin count');
  else if (!(Number.isInteger(count) && count >= 1 && count <= OPENROCKET_MAX_FINS)) {
    problems.push(
      `${count} fins in a set, outside 1 to ${OPENROCKET_MAX_FINS}, what OpenRocket accepts`,
    );
  }
  if (f.thickness === null || !(f.thickness >= 0)) {
    problems.push('the file does not give a fin thickness of zero or more');
  }
  const cant = f.cantDegrees;
  if (cant === null) problems.push('the file does not give a readable cant');
  else if (Math.abs(cant) > OPENROCKET_MAX_CANT_DEGREES) {
    problems.push(
      `a cant of ${cant} degrees, beyond the ${OPENROCKET_MAX_CANT_DEGREES} OpenRocket accepts`,
    );
  }
  if (f.filletRadius === null || !(f.filletRadius >= 0)) {
    problems.push('the file does not give a fillet radius of zero or more');
  }
  if (rootLeadingEdge === null) problems.push('the file does not give enough to place the fins');
  if (problems.length > 0 || typeof outline === 'string') {
    m.refuse(f, label, problems.join('; '));
    return;
  }
  const { section, how: sectionHow, note } = sectionOf(f.crossSection);
  if (note !== undefined) m.note(f, `section of ${label}`, note);
  if (f.tab !== null && (f.tab.height ?? 0) > 0 && (f.tab.length ?? 0) > 0) {
    m.ignore(
      f,
      `tab of ${label}`,
      'the fin tab lies inside the body tube: it does not change the outside',
    );
  }
  m.candidates.push({
    fins: f,
    label,
    planform: outline.planform,
    how: outline.how,
    section,
    sectionHow,
    thickness: f.thickness!,
    count: count!,
    rootLeadingEdge: rootLeadingEdge!,
    rotation: f.angleOffset?.degrees ?? 0,
    cant: cant!,
    filletRadius: f.filletRadius!,
    mirrored: f.angleOffset?.method === 'mirror',
  });
}

function internal(
  m: Mapper,
  c: OrkComponent,
  label: string,
  absX: number | null,
  own: number | null,
) {
  const inside = 'inside the body: it does not change the outside';
  switch (c.type) {
    case 'masscomponent':
    case 'shockcord':
    case 'parachute':
    case 'streamer':
      m.ignore(c, label, `a mass ${inside}`);
      break;
    default: {
      const end = absX === null || own === null ? null : absX + own;
      const reach = end === null || m.base === null ? null : end - m.base;
      const outer =
        c.type === 'innertube' || c.type === 'tubecoupler' || c.type === 'engineblock'
          ? c.outerRadius.value
          : c.type === 'centeringring' || c.type === 'bulkhead'
            ? c.outerRadius.value
            : null;
      const diameter = outer === null ? null : 2 * outer;
      if (reach === null) {
        m.other(c, label, { kind: 'other', count: 1 }, sized({ length: own, diameter }), absX);
        m.note(
          c,
          label,
          'the file does not give enough to place it, so whether it reaches aft of the base ' +
            'is not known; the design holds it as another part',
        );
      } else if (reach > LENGTH_TOLERANCE) {
        m.other(
          c,
          label,
          { kind: 'other', count: 1 },
          sized({ length: own, diameter, reachAftOfBase: reach }),
          absX,
        );
        m.note(
          c,
          label,
          `it reaches ${formatLength(reach)} aft of the base, outside the body; the design ` +
            'holds it as another part',
        );
      } else {
        m.ignore(c, label, inside);
      }
      if (c.type === 'innertube' && c.motorMount !== null) {
        checkMotor(m, c, label, c.motorMount, end);
      }
    }
  }
  // What is inside it, placed relative to it.
  mapChildren(m, { component: c, label: named(c), absX, length: own, radius: null });
}

/**
 * The fin sets of the design: candidates that are identical, at one
 * position and evenly spaced together are one set; any others are their
 * own sets.
 */
function mapFins(m: Mapper): FinSetDesign[] {
  const groups: FinCandidate[][] = [];
  for (const c of m.candidates) {
    const group = groups.find((g) => sameFins(g[0]!, c));
    if (group === undefined) groups.push([c]);
    else group.push(c);
  }
  const sets: FinCandidate[][] = [];
  for (const g of groups) {
    if (g.length === 1 || evenlySpaced(g)) sets.push(g);
    else for (const c of g) sets.push([c]);
  }
  return sets.map((set) => {
    const first = set[0]!;
    const count = set.reduce((n, c) => n + c.count, 0);
    const others =
      set.length > 1
        ? `with ${set.length - 1} other identical fin set${set.length > 2 ? 's' : ''} at the ` +
          'same position, one set of evenly spaced fins; '
        : '';
    for (const c of set) {
      m.represent(
        c.fins,
        c.label,
        `${others}${count} fin${count === 1 ? '' : 's'}, ${c.how}; section ${c.sectionHow}, ` +
          `${formatLength(c.thickness)} thick; root leading edge ${formatLength(c.rootLeadingEdge)} ` +
          `from the nose's tip; rotation ${c.rotation} degrees, cant ${c.cant} degrees, fillets ` +
          formatLength(c.filletRadius),
      );
    }
    return {
      count,
      planform: first.planform,
      thickness: first.thickness,
      section: first.section,
      rootLeadingEdge: first.rootLeadingEdge,
      rotation: first.rotation,
      cant: first.cant,
      filletRadius: first.filletRadius,
    };
  });
}

function sameFins(a: FinCandidate, b: FinCandidate): boolean {
  return (
    JSON.stringify(a.planform) === JSON.stringify(b.planform) &&
    JSON.stringify(a.section) === JSON.stringify(b.section) &&
    a.thickness === b.thickness &&
    a.cant === b.cant &&
    a.filletRadius === b.filletRadius &&
    Math.abs(a.rootLeadingEdge - b.rootLeadingEdge) <= LENGTH_TOLERANCE
  );
}

/** Whether the fins of these sets together sit at equal angles round the body. */
function evenlySpaced(group: readonly FinCandidate[]): boolean {
  if (group.some((c) => c.mirrored)) return false;
  const angles: number[] = [];
  for (const c of group) {
    for (let j = 0; j < c.count; j++) {
      const a = (c.rotation + (360 * j) / c.count) % 360;
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

/** One note for the surface finishes, grouped by finish. */
function finishNote(m: Mapper) {
  if (m.finishes.length === 0) return;
  const byFinish = new Map<string, string[]>();
  for (const f of m.finishes) {
    const key =
      f.label === null
        ? `"${f.finish}" (not a finish OpenRocket knows)`
        : `${f.label} (OpenRocket's roughness height ${Number((f.roughnessHeight! * 1e6).toPrecision(3))} micrometres)`;
    byFinish.set(key, [...(byFinish.get(key) ?? []), f.component]);
  }
  const parts = [...byFinish.entries()].map(([finish, components]) =>
    byFinish.size === 1
      ? `${finish} on every outside component`
      : `${finish}: ${components.join(', ')}`,
  );
  m.notRepresented.push({
    component: 'surface finish',
    type: 'file',
    name: '',
    reason:
      `${parts.join('; ')}. The design has no place for surface roughness, and the drag model ` +
      'takes roughness only as a band with its source (design record 0008 section 2.3), so ' +
      'none is made from it',
    effect: 'note',
  });
}

/**
 * The flight: the caller's, else the highest Mach number among the file's
 * simulation results (those up to date with the design first) at that
 * simulation's launch altitude, else the page's defaults.
 */
function flightOf(
  simulations: readonly OrkSimulation[],
  given: FlightDesign | undefined,
): { flight: FlightDesign; flightFrom: string } {
  if (given !== undefined) return { flight: given, flightFrom: 'given by the caller' };
  const withResult = simulations.filter((s) => s.result?.maxMach != null);
  const current = withResult.filter((s) => s.status === 'uptodate');
  const pool = current.length > 0 ? current : withResult;
  let best: OrkSimulation | undefined;
  for (const s of pool) {
    if (best === undefined || s.result!.maxMach! > best.result!.maxMach!) best = s;
  }
  if (best === undefined) {
    return {
      flight: DEFAULT_FLIGHT,
      flightFrom:
        `the file holds no simulation results, so the defaults: Mach ${DEFAULT_FLIGHT.maxMach} ` +
        `at ${DEFAULT_FLIGHT.altitude} m`,
    };
  }
  const maxMach = best.result!.maxMach!;
  const altitude = best.launchAltitude ?? 0;
  return {
    flight: { maxMach, altitude },
    flightFrom:
      `the highest Mach number of the file's ${current.length > 0 ? 'up-to-date ' : ''}` +
      `simulations, ${maxMach} in "${best.name}" (OpenRocket's own estimate), at its launch ` +
      (best.launchAltitude === null
        ? 'site, whose altitude the file does not give (0 m taken)'
        : `site's altitude, ${altitude} m`) +
      (current.length > 0 ? '' : '; no simulation is up to date with the design'),
  };
}
