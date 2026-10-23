/**
 * Small OpenRocket documents for the tests, written as OpenRocket's savers
 * write them (core/.../file/openrocket/savers: the same elements, in the
 * same order), so that each mapping rule and refusal can be exercised on
 * a document that differs from a representable one in one thing.
 */

import { readFileSync } from 'node:fs';

export const FIXTURES = 'tests/import/fixtures';

export function fixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(`${FIXTURES}/${name}`));
}

export function bytesOf(xml: string): Uint8Array {
  return new TextEncoder().encode(xml);
}

type Position = { readonly method: string; readonly offset: number } | null;

const position = (p: Position) =>
  p === null
    ? ''
    : `<axialoffset method="${p.method}">${p.offset}</axialoffset>` +
      `<position type="${p.method}">${p.offset}</position>`;

const material = '<material type="bulk" density="680.0" group="PaperProducts">Cardboard</material>';

export interface NoseSpec {
  readonly name?: string;
  readonly shape?: string;
  /** Omitted: no <shapeparameter> element. */
  readonly parameter?: number;
  readonly length?: number;
  /** Written as given: '0.0125', 'auto 0.0125' or 'auto'. */
  readonly radius?: string;
  readonly flipped?: boolean;
  readonly shoulderRadius?: number;
  readonly shoulderLength?: number;
  readonly children?: readonly string[];
  readonly extra?: string;
}

export function nose(s: NoseSpec = {}): string {
  return (
    `<nosecone><name>${s.name ?? 'Nose cone'}</name>${s.extra ?? ''}<finish>normal</finish>` +
    `${material}<length>${s.length ?? 0.1}</length><thickness>0.002</thickness>` +
    `<shape>${s.shape ?? 'ogive'}</shape>` +
    (s.parameter === undefined ? '' : `<shapeparameter>${s.parameter}</shapeparameter>`) +
    `<aftradius>${s.radius ?? '0.0125'}</aftradius>` +
    `<aftshoulderradius>${s.shoulderRadius ?? 0.0115}</aftshoulderradius>` +
    `<aftshoulderlength>${s.shoulderLength ?? 0.02}</aftshoulderlength>` +
    '<aftshoulderthickness>0.002</aftshoulderthickness><aftshouldercapped>true</aftshouldercapped>' +
    `<isflipped>${s.flipped ?? false}</isflipped>` +
    subcomponents(s.children) +
    '</nosecone>'
  );
}

export interface TubeSpec {
  readonly name?: string;
  readonly length?: number;
  readonly radius?: string;
  readonly position?: Position;
  readonly motorMount?: string;
  readonly children?: readonly string[];
  readonly extra?: string;
}

export function tube(s: TubeSpec = {}): string {
  return (
    `<bodytube><name>${s.name ?? 'Body tube'}</name>${position(s.position ?? null)}` +
    `${s.extra ?? ''}<finish>normal</finish>${material}<length>${s.length ?? 0.3}</length>` +
    `<thickness>0.001</thickness><radius>${s.radius ?? 'auto 0.0125'}</radius>` +
    (s.motorMount ?? '') +
    subcomponents(s.children) +
    '</bodytube>'
  );
}

export function transition(fore: number, aft: number, length = 0.03): string {
  return (
    `<transition><name>Transition</name><finish>normal</finish>${material}` +
    `<length>${length}</length><thickness>0.002</thickness><shape>conical</shape>` +
    `<foreradius>${fore}</foreradius><aftradius>${aft}</aftradius>` +
    '<foreshoulderradius>0.0</foreshoulderradius><foreshoulderlength>0.0</foreshoulderlength>' +
    '<foreshoulderthickness>0.0</foreshoulderthickness><foreshouldercapped>false</foreshouldercapped>' +
    '<aftshoulderradius>0.0</aftshoulderradius><aftshoulderlength>0.0</aftshoulderlength>' +
    '<aftshoulderthickness>0.0</aftshoulderthickness><aftshouldercapped>false</aftshouldercapped>' +
    '</transition>'
  );
}

export interface FinSpec {
  readonly name?: string;
  readonly count?: number;
  readonly angle?: number;
  readonly angleMethod?: string;
  readonly position?: Position;
  readonly thickness?: number;
  readonly crossSection?: string;
  readonly cant?: number;
  readonly fillet?: number;
  readonly rootChord?: number;
  readonly tipChord?: number;
  readonly sweep?: number;
  readonly height?: number;
  readonly tab?: boolean;
  readonly extra?: string;
}

function finCommon(s: FinSpec): string {
  const count = s.count ?? 3;
  const angle = s.angle ?? 0;
  return (
    `<name>${s.name ?? 'Fins'}</name>${s.extra ?? ''}` +
    `<instancecount>${count}</instancecount><fincount>${count}</fincount>` +
    '<radiusoffset method="surface">0.0</radiusoffset>' +
    `<angleoffset method="${s.angleMethod ?? 'relative'}">${angle}</angleoffset><rotation>${angle}</rotation>` +
    position(s.position === undefined ? { method: 'bottom', offset: 0 } : s.position) +
    `<finish>normal</finish>${material}<thickness>${s.thickness ?? 0.003}</thickness>` +
    `<crosssection>${s.crossSection ?? 'square'}</crosssection><cant>${s.cant ?? 0}</cant>` +
    (s.tab === true
      ? '<tabheight>0.01</tabheight><tablength>0.04</tablength>' +
        '<tabposition relativeto="center">0.0</tabposition><tabposition relativeto="middle">0.0</tabposition>'
      : '') +
    `<filletradius>${s.fillet ?? 0}</filletradius>` +
    '<filletmaterial type="bulk" density="680.0" group="PaperProducts">Cardboard</filletmaterial>'
  );
}

export function trapezoidFins(s: FinSpec = {}): string {
  return (
    `<trapezoidfinset>${finCommon(s)}<rootchord>${s.rootChord ?? 0.05}</rootchord>` +
    `<tipchord>${s.tipChord ?? 0.03}</tipchord><sweeplength>${s.sweep ?? 0.02}</sweeplength>` +
    `<height>${s.height ?? 0.04}</height></trapezoidfinset>`
  );
}

export function ellipticalFins(s: FinSpec = {}): string {
  return (
    `<ellipticalfinset>${finCommon(s)}<rootchord>${s.rootChord ?? 0.05}</rootchord>` +
    `<height>${s.height ?? 0.04}</height></ellipticalfinset>`
  );
}

export function freeformFins(
  points: readonly (readonly [number, number])[],
  s: FinSpec = {},
): string {
  return (
    `<freeformfinset>${finCommon(s)}<finpoints>` +
    points.map(([x, y]) => `<point x="${x}" y="${y}"/>`).join('') +
    '</finpoints></freeformfinset>'
  );
}

export function tubeFins(): string {
  return (
    '<tubefinset><name>Tube fins</name><instancecount>6</instancecount><fincount>6</fincount>' +
    '<radiusoffset method="coaxial">0.0</radiusoffset><angleoffset method="fixed">0.0</angleoffset>' +
    '<rotation>0.0</rotation><axialoffset method="bottom">0.0</axialoffset>' +
    '<position type="bottom">0.0</position><finish>normal</finish>' +
    `${material}<fincount>6</fincount><rotation>0.0</rotation><radius>auto</radius>` +
    '<length>0.06</length><thickness>3.0E-4</thickness></tubefinset>'
  );
}

export function launchLug(): string {
  return (
    '<launchlug><name>Launch lug</name><instancecount>1</instancecount>' +
    '<instanceseparation>0.0</instanceseparation><angleoffset method="relative">30.0</angleoffset>' +
    '<radialdirection>30.0</radialdirection><axialoffset method="middle">0.0</axialoffset>' +
    `<position type="middle">0.0</position><finish>normal</finish>${material}` +
    '<radius>0.0035</radius><length>0.035</length><thickness>0.001</thickness></launchlug>'
  );
}

export function railButtons(): string {
  return (
    '<railbutton><name>Rail button</name><instancecount>2</instancecount>' +
    '<instanceseparation>0.2</instanceseparation><angleoffset method="relative">180.0</angleoffset>' +
    '<axialoffset method="middle">0.0</axialoffset><position type="middle">0.0</position>' +
    '<finish>normal</finish>' +
    `${material}<outerdiameter>0.0097</outerdiameter><innerdiameter>0.008</innerdiameter>` +
    '<height>0.0097</height><baseheight>0.002</baseheight><flangeheight>0.002</flangeheight>' +
    '<screwheight>0.0</screwheight></railbutton>'
  );
}

export function innerTube(
  s: { position?: Position; length?: number; overhang?: number; motor?: boolean } = {},
): string {
  const mount =
    s.motor === false
      ? ''
      : '<motormount><ignitionevent>automatic</ignitionevent><ignitiondelay>0.0</ignitiondelay>' +
        `<overhang>${s.overhang ?? 0}</overhang><motor configid="c1"><type>single</type>` +
        '<manufacturer>Estes</manufacturer><designation>C6</designation><diameter>0.018</diameter>' +
        '<length>0.07</length><delay>5.0</delay></motor></motormount>';
  return (
    `<innertube><name>Inner tube</name>${position(s.position ?? { method: 'bottom', offset: 0 })}` +
    `${material}<length>${s.length ?? 0.075}</length><radialposition>0.0</radialposition>` +
    '<radialdirection>0.0</radialdirection><outerradius>0.0095</outerradius>' +
    '<thickness>5.0E-4</thickness><clusterconfiguration>single</clusterconfiguration>' +
    `<clusterscale>1.0</clusterscale><clusterrotation>0.0</clusterrotation>${mount}</innertube>`
  );
}

export function massComponent(name = 'Mass'): string {
  return (
    `<masscomponent><name>${name}</name><axialoffset method="top">0.01</axialoffset>` +
    '<position type="top">0.01</position><packedlength>0.03</packedlength>' +
    '<packedradius>0.01</packedradius><radialposition>0.0</radialposition>' +
    '<radialdirection>0.0</radialdirection><mass>0.01</mass>' +
    '<masscomponenttype>masscomponent</masscomponenttype></masscomponent>'
  );
}

export function podSet(children: readonly string[]): string {
  return (
    '<podset><name>Pods</name><instancecount>2</instancecount>' +
    '<radiusoffset method="relative">0.02</radiusoffset><angleoffset method="relative">0.0</angleoffset>' +
    '<axialoffset method="bottom">0.0</axialoffset><position type="bottom">0.0</position>' +
    subcomponents(children) +
    '</podset>'
  );
}

function subcomponents(children: readonly string[] | undefined): string {
  return children === undefined || children.length === 0
    ? ''
    : `<subcomponents>${children.join('')}</subcomponents>`;
}

export function stage(components: readonly string[], name = 'Sustainer'): string {
  return `<stage><name>${name}</name>${subcomponents(components)}</stage>`;
}

/** A whole document; `stages` are stage elements (or anything to put in the rocket). */
export function document(stages: readonly string[], version = '1.10'): string {
  return (
    "<?xml version='1.0' encoding='utf-8'?>\n" +
    `<openrocket version="${version}" creator="bowshock tests"><rocket><name>Test rocket</name>` +
    `${subcomponents(stages)}</rocket></openrocket>`
  );
}

/** The usual representable rocket: a nose, a tube and fins at the base, with `extra` children on the tube. */
export function simpleRocket(
  options: {
    noseSpec?: NoseSpec;
    finSpec?: FinSpec;
    tubeChildren?: readonly string[];
    fins?: readonly string[];
  } = {},
): string {
  const fins = options.fins ?? [trapezoidFins(options.finSpec)];
  return document([
    stage([nose(options.noseSpec), tube({ children: [...fins, ...(options.tubeChildren ?? [])] })]),
  ]);
}
