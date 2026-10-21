/**
 * A typed mirror of the rocket in an OpenRocket file: its stages and, in
 * each, the components in the file's order, with every attribute the
 * outer shape (and so the drag) could depend on. Lengths are in metres
 * and angles in degrees, as OpenRocket stores them.
 *
 * Values are as the file gives them: a number the file does not give, or
 * gives as something other than a finite number, is null (the reader
 * says which in the document's warnings). Where OpenRocket treats an
 * absent element as a feature switched off (no cant, no fillet, a nose
 * not flipped), the mirror holds that default and says so in the
 * warnings. Shape and cross-section names are kept as written, so that
 * a name this importer does not know is reported, not guessed.
 *
 * The element and attribute names were learnt from OpenRocket's saver
 * and loader (core/.../file/openrocket/savers and importt, GPLv3; read,
 * not copied). docs/design/0018-openrocket-import.md section 3.
 */

import type { OrkContainer } from './container';

/** A number from the file: null when absent or not a finite number. */
export type OrkNumber = number | null;

export interface OrkDocument {
  readonly container: OrkContainer;
  /** The `<openrocket version>` attribute, the file format version (e.g. "1.10"). */
  readonly formatVersion: string | null;
  /** The `<openrocket creator>` attribute (e.g. "OpenRocket 24.12"). */
  readonly creator: string | null;
  readonly rocket: OrkRocket;
  /** The simulations' settings and summary results (their time series are not kept). */
  readonly simulations: readonly OrkSimulation[];
  /** What the reader met that it could not take as written, in plain words. */
  readonly warnings: readonly string[];
}

/** One of the file's simulations: its launch site and the summary of its last run. */
export interface OrkSimulation {
  readonly name: string;
  /** OpenRocket's status: 'uptodate', 'loaded', 'outdated', 'cantrun' or 'notsimulated'. */
  readonly status: string | null;
  /** The launch site's altitude above sea level, m (`<conditions><launchaltitude>`). */
  readonly launchAltitude: OrkNumber;
  /** The run's summary (`<flightdata>` attributes); null if the file holds no result. */
  readonly result: {
    readonly maxMach: OrkNumber;
    readonly maxAltitude: OrkNumber;
    readonly maxVelocity: OrkNumber;
  } | null;
}

export interface OrkRocket {
  readonly name: string;
  readonly designer: string | null;
  readonly stages: readonly OrkStage[];
  /** Components placed directly in the rocket that are not stages (OpenRocket ignores them). */
  readonly unattached: readonly OrkComponent[];
}

/** A stage: in the rocket, the body components in order from the front. */
export interface OrkStage extends OrkCommon {
  readonly type: 'stage';
}

/** OpenRocket's axial position methods (core/.../rocketcomponent/position/AxialMethod.java). */
export type OrkAxialMethod = 'absolute' | 'after' | 'top' | 'middle' | 'bottom';

export interface OrkAxialOffset {
  /**
   * absolute: from the rocket's tip to this component's front; top: from
   * the parent's front to this component's front; middle: between their
   * middles; bottom: from the parent's aft end to this component's aft end;
   * after: behind the previous component (offset zero).
   */
  readonly method: OrkAxialMethod;
  /** Metres, positive aft. */
  readonly offset: number;
}

/** A radius OpenRocket can take automatically from the neighbouring component. */
export interface OrkRadius {
  /** Metres; null when absent, or automatic and not stored (older files store "auto" alone). */
  readonly value: OrkNumber;
  readonly automatic: boolean;
}

export interface OrkMaterial {
  readonly name: string;
  /** 'bulk', 'surface' or 'line'. */
  readonly type: string | null;
  /** kg/m^3, kg/m^2 or kg/m by type. */
  readonly density: OrkNumber;
}

export interface OrkAngleOffset {
  /** 'relative', 'fixed' or 'mirror'; null for the older `<rotation>` and `<radialdirection>`. */
  readonly method: string | null;
  readonly degrees: number;
}

export interface OrkRadiusOffset {
  /** 'surface', 'relative', 'free' or 'coaxial'. */
  readonly method: string | null;
  /** Metres. */
  readonly value: OrkNumber;
}

/** What every component carries. */
export interface OrkCommon {
  readonly name: string;
  readonly id: string | null;
  /** null: placed after the previous component, OpenRocket's default (not written). */
  readonly axialOffset: OrkAxialOffset | null;
  /** OpenRocket's override of the component's drag coefficient, when set. */
  readonly overrideCd: OrkNumber;
  /** OpenRocket's override of the component's mass (kg), when set. */
  readonly overrideMass: OrkNumber;
  readonly comment: string | null;
  readonly children: readonly OrkComponent[];
}

/** What components on the outside carry. */
export interface OrkExternal {
  /**
   * The surface finish as written (e.g. 'normal'); ORK_FINISHES gives its
   * roughness height. OpenRocket takes 'normal' when it is absent.
   */
  readonly finish: string;
  readonly material: OrkMaterial | null;
}

export interface OrkShoulder {
  readonly radius: OrkNumber;
  readonly length: OrkNumber;
  readonly thickness: OrkNumber;
  readonly capped: boolean | null;
}

export interface OrkNoseCone extends OrkCommon, OrkExternal {
  readonly type: 'nosecone';
  readonly length: OrkNumber;
  /** Wall thickness, or 'filled' for a solid nose. */
  readonly thickness: OrkNumber | 'filled';
  /** As written (conical, ogive, ellipsoid, power, parabolic, haack); 'ogive' when absent. */
  readonly shape: string;
  /** The shape parameter in effect: the shape's default when the file gives none after the shape. */
  readonly shapeParameter: OrkNumber;
  readonly shapeClipped: boolean | null;
  /** The base radius. */
  readonly aftRadius: OrkRadius;
  /** The shoulder, inside the next body tube. */
  readonly aftShoulder: OrkShoulder;
  /** A flipped nose cone is a tail cone, pointing aft. */
  readonly flipped: boolean;
}

export interface OrkTransition extends OrkCommon, OrkExternal {
  readonly type: 'transition';
  readonly length: OrkNumber;
  readonly thickness: OrkNumber | 'filled';
  /** As written; 'conical' when absent. */
  readonly shape: string;
  readonly shapeParameter: OrkNumber;
  readonly shapeClipped: boolean | null;
  readonly foreRadius: OrkRadius;
  readonly aftRadius: OrkRadius;
  readonly foreShoulder: OrkShoulder;
  readonly aftShoulder: OrkShoulder;
}

export interface OrkMotor {
  readonly configId: string | null;
  readonly designation: string | null;
  readonly manufacturer: string | null;
  readonly diameter: OrkNumber;
  readonly length: OrkNumber;
}

export interface OrkMotorMount {
  /** How far the motor reaches aft of the mount's aft end, metres. */
  readonly overhang: OrkNumber;
  readonly motors: readonly OrkMotor[];
}

export interface OrkBodyTube extends OrkCommon, OrkExternal {
  readonly type: 'bodytube';
  readonly length: OrkNumber;
  readonly thickness: OrkNumber | 'filled';
  readonly outerRadius: OrkRadius;
  readonly motorMount: OrkMotorMount | null;
}

/** What every fin set (trapezoidal, elliptical, freeform) carries. */
export interface OrkFinSetCommon extends OrkCommon, OrkExternal {
  readonly count: OrkNumber;
  /** The first fin's roll angle. */
  readonly angleOffset: OrkAngleOffset | null;
  /** Fins sit on the body surface in OpenRocket whatever this says; kept as written. */
  readonly radiusOffset: OrkRadiusOffset | null;
  /** Fin thickness, metres. */
  readonly thickness: OrkNumber;
  /** As written: 'square', 'rounded' or 'airfoil' ('square' when absent, OpenRocket's default). */
  readonly crossSection: string;
  /** Cant angle, degrees (0 when absent). */
  readonly cantDegrees: OrkNumber;
  /** The tab, inside the body tube, when the file gives one. */
  readonly tab: OrkFinTab | null;
  /** Radius of the fillets at the root, metres (0 when absent). */
  readonly filletRadius: OrkNumber;
  readonly filletMaterial: OrkMaterial | null;
}

export interface OrkFinTab {
  readonly height: OrkNumber;
  readonly length: OrkNumber;
  /** The last `<tabposition>`: its reference ('front', 'center', 'end' or 'top', 'middle', 'bottom') and value. */
  readonly relativeTo: string | null;
  readonly position: OrkNumber;
}

export interface OrkTrapezoidFinSet extends OrkFinSetCommon {
  readonly type: 'trapezoidfinset';
  readonly rootChord: OrkNumber;
  readonly tipChord: OrkNumber;
  /** Axial distance from the root's leading edge to the tip's leading edge, metres. */
  readonly sweepLength: OrkNumber;
  /** Span from the root to the tip, metres. */
  readonly height: OrkNumber;
}

export interface OrkEllipticalFinSet extends OrkFinSetCommon {
  readonly type: 'ellipticalfinset';
  readonly rootChord: OrkNumber;
  readonly height: OrkNumber;
}

export interface OrkFinPoint {
  readonly x: number;
  readonly y: number;
}

export interface OrkFreeformFinSet extends OrkFinSetCommon {
  readonly type: 'freeformfinset';
  /** The outline from the root's leading edge (0, 0) round to the root's trailing edge; null if a point is invalid. */
  readonly points: readonly OrkFinPoint[] | null;
}

export interface OrkTubeFinSet extends OrkCommon, OrkExternal {
  readonly type: 'tubefinset';
  readonly count: OrkNumber;
  readonly angleOffset: OrkAngleOffset | null;
  readonly outerRadius: OrkRadius;
  readonly length: OrkNumber;
  readonly thickness: OrkNumber;
}

export interface OrkLaunchLug extends OrkCommon, OrkExternal {
  readonly type: 'launchlug';
  readonly outerRadius: OrkNumber;
  readonly length: OrkNumber;
  readonly thickness: OrkNumber;
  readonly instanceCount: OrkNumber;
  readonly instanceSeparation: OrkNumber;
  readonly angleOffset: OrkAngleOffset | null;
}

export interface OrkRailButton extends OrkCommon, OrkExternal {
  readonly type: 'railbutton';
  readonly outerDiameter: OrkNumber;
  readonly innerDiameter: OrkNumber;
  readonly height: OrkNumber;
  readonly baseHeight: OrkNumber;
  readonly flangeHeight: OrkNumber;
  readonly screwHeight: OrkNumber;
  readonly instanceCount: OrkNumber;
  readonly instanceSeparation: OrkNumber;
  readonly angleOffset: OrkAngleOffset | null;
}

/** Tubes and rings inside the body. */
export interface OrkInnerTube extends OrkCommon {
  readonly type: 'innertube';
  readonly length: OrkNumber;
  readonly outerRadius: OrkRadius;
  readonly thickness: OrkNumber;
  readonly radialPosition: OrkNumber;
  readonly cluster: string | null;
  readonly clusterScale: OrkNumber;
  readonly motorMount: OrkMotorMount | null;
  readonly material: OrkMaterial | null;
}

export interface OrkRing extends OrkCommon {
  readonly type: 'tubecoupler' | 'engineblock' | 'centeringring' | 'bulkhead';
  readonly length: OrkNumber;
  readonly outerRadius: OrkRadius;
  /** Centering rings only. */
  readonly innerRadius: OrkRadius | null;
  /** Tube couplers and engine blocks only. */
  readonly thickness: OrkNumber;
  readonly radialPosition: OrkNumber;
  readonly material: OrkMaterial | null;
}

/** Masses inside the body: mass components, shock cords, parachutes, streamers. */
export interface OrkMassObject extends OrkCommon {
  readonly type: 'masscomponent' | 'shockcord' | 'parachute' | 'streamer';
  readonly packedLength: OrkNumber;
  readonly packedRadius: OrkRadius;
  /** Mass components only, kg. */
  readonly mass: OrkNumber;
}

/** Pod sets and parallel (booster) stages: bodies beside the main one. */
export interface OrkPodSet extends OrkCommon {
  readonly type: 'podset' | 'parallelstage';
  readonly instanceCount: OrkNumber;
  readonly radiusOffset: OrkRadiusOffset | null;
  readonly angleOffset: OrkAngleOffset | null;
}

/** An element this reader does not know (from a newer OpenRocket, or not OpenRocket's). */
export interface OrkUnknown extends OrkCommon {
  readonly type: 'unknown';
  readonly element: string;
}

export type OrkFinSet = OrkTrapezoidFinSet | OrkEllipticalFinSet | OrkFreeformFinSet;

export type OrkComponent =
  | OrkNoseCone
  | OrkTransition
  | OrkBodyTube
  | OrkFinSet
  | OrkTubeFinSet
  | OrkLaunchLug
  | OrkRailButton
  | OrkInnerTube
  | OrkRing
  | OrkMassObject
  | OrkPodSet
  | OrkStage
  | OrkUnknown;

/**
 * OpenRocket's surface finishes and their roughness heights, metres
 * (core/.../rocketcomponent/ExternalComponent.java, enum Finish), with the
 * names OpenRocket shows for them.
 */
export const ORK_FINISHES: Readonly<
  Record<string, { readonly label: string; readonly roughness: number }>
> = {
  rough: { label: 'Rough', roughness: 500e-6 },
  roughunfinished: { label: 'Rough unfinished', roughness: 250e-6 },
  unfinished: { label: 'Unfinished', roughness: 150e-6 },
  normal: { label: 'Regular paint', roughness: 60e-6 },
  smooth: { label: 'Smooth paint', roughness: 20e-6 },
  optimum: { label: 'Optimum paint', roughness: 5e-6 },
  polished: { label: 'Aircraft sheet-metal', roughness: 2e-6 },
  finishpolished: { label: 'Finished/polished surface', roughness: 0.5e-6 },
  mirror: { label: 'Mirror surface', roughness: 0 },
};

/** Plain names for each component type, for reports. */
export const ORK_TYPE_NAMES: Readonly<Record<OrkComponent['type'], string>> = {
  nosecone: 'nose cone',
  transition: 'transition',
  bodytube: 'body tube',
  trapezoidfinset: 'trapezoidal fin set',
  ellipticalfinset: 'elliptical fin set',
  freeformfinset: 'freeform fin set',
  tubefinset: 'tube fin set',
  launchlug: 'launch lug',
  railbutton: 'rail button',
  innertube: 'inner tube',
  tubecoupler: 'tube coupler',
  engineblock: 'engine block',
  centeringring: 'centering ring',
  bulkhead: 'bulkhead',
  masscomponent: 'mass component',
  shockcord: 'shock cord',
  parachute: 'parachute',
  streamer: 'streamer',
  podset: 'pod set',
  parallelstage: 'parallel (booster) stage',
  stage: 'stage',
  unknown: 'unknown component',
};
