/**
 * The OpenRocket XML tree (./xml.ts) as the typed mirror of ./model.ts.
 *
 * As OpenRocket's loader does, the parameters of a component are applied
 * in the file's order, so a later element overrides an earlier one (the
 * file writes each position twice, as `<axialoffset>` and as the older
 * `<position>`; each fin count as `<instancecount>` and `<fincount>`), and
 * setting a shape resets the shape parameter to that shape's default.
 * Numbers are read as Java's Double.parseDouble reads decimal numbers;
 * anything else is reported and read as absent.
 *
 * docs/design/0018-openrocket-import.md section 3.
 */

import type { OrkContainer } from './container';
import type {
  OrkAngleOffset,
  OrkAxialMethod,
  OrkAxialOffset,
  OrkComponent,
  OrkDocument,
  OrkFinPoint,
  OrkFinTab,
  OrkMaterial,
  OrkMotor,
  OrkMotorMount,
  OrkNumber,
  OrkRadius,
  OrkRadiusOffset,
  OrkShoulder,
  OrkSimulation,
  OrkStage,
} from './model';
import { ORK_TYPE_NAMES } from './model';
import type { XmlElement } from './xml';

/** The file format versions OpenRocket 24.12 to 26 knows (DocumentConfig.SUPPORTED_VERSIONS). */
export const KNOWN_FORMAT_VERSIONS = [
  '1.0',
  '1.1',
  '1.2',
  '1.3',
  '1.4',
  '1.5',
  '1.6',
  '1.7',
  '1.8',
  '1.9',
  '1.10',
  '1.11',
] as const;

/**
 * Each shape's parameter range and the default OpenRocket sets with the
 * shape (core/.../rocketcomponent/Transition.java, enum Shape).
 */
export const ORK_SHAPES: Readonly<
  Record<
    string,
    {
      readonly usesParameter: boolean;
      readonly min: number;
      readonly max: number;
      readonly default: number;
    }
  >
> = {
  conical: { usesParameter: false, min: 0, max: 1, default: 0 },
  ogive: { usesParameter: true, min: 0, max: 1, default: 1 },
  ellipsoid: { usesParameter: false, min: 0, max: 1, default: 0 },
  power: { usesParameter: true, min: 0, max: 1, default: 0.5 },
  parabolic: { usesParameter: true, min: 0, max: 1, default: 1 },
  haack: { usesParameter: true, min: 0, max: 1 / 3, default: 0 },
};

const AXIAL_METHODS: readonly OrkAxialMethod[] = ['absolute', 'after', 'top', 'middle', 'bottom'];

/** Elements that hold structure or appearance, not a parameter. */
const STRUCTURE = new Set([
  'subcomponents',
  'appearance',
  'insideappearance',
  'inside-appearance',
  'motormount',
  'finpoints',
  'deploymentconfiguration',
  'separationconfiguration',
  'motorconfiguration',
  'flightconfiguration',
]);

/** Java's Double.parseDouble on a decimal number (with an optional type suffix). */
const DECIMAL = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?[fFdD]?$/;

export function parseJavaDouble(text: string): number | null {
  const t = text.trim();
  if (!DECIMAL.test(t)) return null;
  const v = Number(t.replace(/[fFdD]$/, ''));
  return Number.isFinite(v) ? v : null;
}

class Context {
  readonly warnings: string[] = [];
  warn(where: string, what: string) {
    this.warnings.push(`${where}: ${what}`);
  }
}

/** The parameters of one component element, read in the file's order. */
class Params {
  /** The last element of each name, as OpenRocket's setters leave it. */
  private readonly last = new Map<string, XmlElement>();
  constructor(
    readonly element: XmlElement,
    readonly where: string,
    private readonly ctx: Context,
  ) {
    for (const c of element.children) {
      if (!STRUCTURE.has(c.name)) this.last.set(c.name, c);
    }
  }

  has(name: string): boolean {
    return this.last.has(name);
  }

  text(name: string): string | null {
    const e = this.last.get(name);
    return e === undefined ? null : e.text.trim();
  }

  number(name: string): OrkNumber {
    const e = this.last.get(name);
    if (e === undefined) return null;
    const v = parseJavaDouble(e.text);
    if (v === null) this.ctx.warn(this.where, `<${name}> "${e.text.trim()}" is not a number`);
    return v;
  }

  integer(name: string): OrkNumber {
    const e = this.last.get(name);
    if (e === undefined) return null;
    const t = e.text.trim();
    if (!/^[+-]?\d+$/.test(t)) {
      this.ctx.warn(this.where, `<${name}> "${t}" is not a whole number`);
      return null;
    }
    return Number(t);
  }

  boolean(name: string): boolean | null {
    const t = this.text(name);
    return t === null ? null : t.toLowerCase() === 'true';
  }

  /** A number, or OpenRocket's default with a warning when the element is absent. */
  numberOr(name: string, fallback: number, what: string): OrkNumber {
    if (!this.has(name)) {
      this.ctx.warn(this.where, `no <${name}>; OpenRocket's default, ${what}, is taken`);
      return fallback;
    }
    return this.number(name);
  }

  /** A number OpenRocket can also set automatically: "auto", "auto 0.0125" or "0.0125". */
  radius(name: string): OrkRadius {
    const t = this.text(name);
    if (t === null) return { value: null, automatic: false };
    const parts = t.split(/\s+/);
    if (parts[0]!.toLowerCase() === 'auto') {
      if (parts.length === 1) return { value: null, automatic: true };
      const v = parseJavaDouble(parts.slice(1).join(' '));
      if (v === null) this.ctx.warn(this.where, `<${name}> "${t}" does not end in a number`);
      return { value: v, automatic: true };
    }
    return { value: this.number(name), automatic: false };
  }

  thickness(name: string): OrkNumber | 'filled' {
    const t = this.text(name);
    if (t !== null && t.toLowerCase() === 'filled') return 'filled';
    return this.number(name);
  }

  material(name: string): OrkMaterial | null {
    const e = this.last.get(name);
    if (e === undefined) return null;
    const density = e.attributes.get('density');
    return {
      name: e.text.trim(),
      type: e.attributes.get('type') ?? null,
      density: density === undefined ? null : parseJavaDouble(density),
    };
  }

  shoulder(prefix: 'fore' | 'aft'): OrkShoulder {
    return {
      radius: this.number(`${prefix}shoulderradius`),
      length: this.number(`${prefix}shoulderlength`),
      thickness: this.number(`${prefix}shoulderthickness`),
      capped: this.boolean(`${prefix}shouldercapped`),
    };
  }

  /** `<axialoffset method>` or the older `<position type>`, whichever comes last. */
  axialOffset(): OrkAxialOffset | null {
    let result: OrkAxialOffset | null = null;
    for (const c of this.element.children) {
      if (c.name !== 'axialoffset' && c.name !== 'position') continue;
      const raw = (c.attributes.get('method') ?? c.attributes.get('type') ?? '').trim();
      const method = AXIAL_METHODS.find((m) => m === raw);
      const offset = parseJavaDouble(c.text);
      if (method === undefined || offset === null) {
        this.ctx.warn(this.where, `<${c.name}> "${raw}" "${c.text.trim()}" is not a position`);
        continue;
      }
      result = { method, offset };
    }
    return result;
  }

  /** `<angleoffset method>`, or the older `<rotation>` / `<radialdirection>`, whichever comes last. */
  angleOffset(legacy: readonly string[]): OrkAngleOffset | null {
    let result: OrkAngleOffset | null = null;
    for (const c of this.element.children) {
      if (c.name !== 'angleoffset' && !legacy.includes(c.name)) continue;
      const degrees = parseJavaDouble(c.text);
      if (degrees === null) {
        this.ctx.warn(this.where, `<${c.name}> "${c.text.trim()}" is not an angle`);
        continue;
      }
      result = {
        method: c.name === 'angleoffset' ? (c.attributes.get('method') ?? null) : null,
        degrees,
      };
    }
    return result;
  }

  radiusOffset(): OrkRadiusOffset | null {
    const e = this.last.get('radiusoffset');
    if (e === undefined) return null;
    return { method: e.attributes.get('method') ?? null, value: parseJavaDouble(e.text) };
  }

  /** The count: `<instancecount>` or `<fincount>`, whichever comes last. */
  count(): OrkNumber {
    let result: OrkNumber = null;
    for (const c of this.element.children) {
      if (c.name !== 'instancecount' && c.name !== 'fincount') continue;
      const t = c.text.trim();
      if (!/^[+-]?\d+$/.test(t)) {
        this.ctx.warn(this.where, `<${c.name}> "${t}" is not a whole number`);
        result = null;
        continue;
      }
      result = Number(t);
    }
    return result;
  }

  /** The shape and its parameter as OpenRocket's setters leave them, in the file's order. */
  shape(initial: string): { shape: string; parameter: OrkNumber } {
    let shape = initial;
    let parameter: OrkNumber = ORK_SHAPES[initial]!.default;
    for (const c of this.element.children) {
      if (c.name === 'shape') {
        shape = c.text.trim();
        const known = ORK_SHAPES[shape];
        if (known === undefined) {
          this.ctx.warn(this.where, `the shape "${shape}" is not one OpenRocket knows`);
          parameter = null;
        } else {
          parameter = known.default;
        }
      } else if (c.name === 'shapeparameter') {
        parameter = parseJavaDouble(c.text);
        if (parameter === null) {
          this.ctx.warn(this.where, `<shapeparameter> "${c.text.trim()}" is not a number`);
        }
      }
    }
    return { shape, parameter };
  }

  /** A text OpenRocket takes a default for when it is absent; the default is said in the warnings. */
  textOr(name: string, fallback: string): string {
    const t = this.text(name);
    if (t === null) {
      this.ctx.warn(this.where, `no <${name}>; OpenRocket's default, "${fallback}", is taken`);
      return fallback;
    }
    return t;
  }
}

function motorMountOf(element: XmlElement, where: string, ctx: Context): OrkMotorMount | null {
  const mount = element.children.find((c) => c.name === 'motormount');
  if (mount === undefined) return null;
  const p = new Params(mount, `${where}, motor mount`, ctx);
  const motors: OrkMotor[] = [];
  for (const m of mount.children) {
    if (m.name !== 'motor') continue;
    const mp = new Params(m, `${where}, motor`, ctx);
    motors.push({
      configId: m.attributes.get('configid') ?? null,
      designation: mp.text('designation'),
      manufacturer: mp.text('manufacturer'),
      diameter: mp.number('diameter'),
      length: mp.number('length'),
    });
  }
  return { overhang: p.number('overhang'), motors };
}

function finPointsOf(element: XmlElement, where: string, ctx: Context): OrkFinPoint[] | null {
  const list = element.children.find((c) => c.name === 'finpoints');
  if (list === undefined) {
    ctx.warn(where, 'no <finpoints>');
    return null;
  }
  const points: OrkFinPoint[] = [];
  for (const p of list.children) {
    const x = parseJavaDouble(p.attributes.get('x') ?? '');
    const y = parseJavaDouble(p.attributes.get('y') ?? '');
    if (p.name !== 'point' || x === null || y === null) {
      ctx.warn(where, 'a fin point that is not a pair of numbers');
      return null;
    }
    points.push({ x, y });
  }
  return points;
}

function tabOf(p: Params): OrkFinTab | null {
  if (!p.has('tabheight') && !p.has('tablength') && !p.has('tabposition')) return null;
  const position = [...p.element.children].reverse().find((c) => c.name === 'tabposition');
  return {
    height: p.number('tabheight'),
    length: p.number('tablength'),
    relativeTo: position?.attributes.get('relativeto') ?? null,
    position: position === undefined ? null : parseJavaDouble(position.text),
  };
}

function componentOf(element: XmlElement, path: string, ctx: Context): OrkComponent {
  const p0 = new Params(element, path, ctx);
  const name = p0.text('name') ?? '';
  const known = (ORK_TYPE_NAMES as Record<string, string>)[element.name];
  const typeName = known ?? `<${element.name}>`;
  const where = `${path}${path === '' ? '' : ' / '}${typeName} "${name}"`;
  const p = new Params(element, where, ctx);
  const subcomponents = element.children.find((c) => c.name === 'subcomponents');
  const children = (subcomponents?.children ?? []).map((c) => componentOf(c, where, ctx));
  const common = {
    name,
    id: p.text('id'),
    axialOffset: p.axialOffset(),
    overrideCd: p.number('overridecd'),
    overrideMass: p.number('overridemass'),
    comment: p.text('comment'),
    children,
  };
  const external = () => ({
    finish: p.textOr('finish', 'normal'),
    material: p.material('material'),
  });
  const fins = () => ({
    ...common,
    ...external(),
    count: p.count(),
    angleOffset: p.angleOffset(['rotation']),
    radiusOffset: p.radiusOffset(),
    thickness: p.number('thickness'),
    crossSection: p.textOr('crosssection', 'square'),
    cantDegrees: p.numberOr('cant', 0, '0 degrees'),
    tab: tabOf(p),
    filletRadius: p.has('filletradius') ? p.number('filletradius') : 0,
    filletMaterial: p.material('filletmaterial'),
  });

  switch (element.name) {
    case 'nosecone': {
      const { shape, parameter } = p.shape('ogive');
      return {
        type: 'nosecone',
        ...common,
        ...external(),
        length: p.number('length'),
        thickness: p.thickness('thickness'),
        shape,
        shapeParameter: parameter,
        shapeClipped: p.boolean('shapeclipped'),
        aftRadius: p.radius('aftradius'),
        aftShoulder: p.shoulder('aft'),
        flipped: p.boolean('isflipped') ?? false,
      };
    }
    case 'transition': {
      const { shape, parameter } = p.shape('conical');
      return {
        type: 'transition',
        ...common,
        ...external(),
        length: p.number('length'),
        thickness: p.thickness('thickness'),
        shape,
        shapeParameter: parameter,
        shapeClipped: p.boolean('shapeclipped'),
        foreRadius: p.radius('foreradius'),
        aftRadius: p.radius('aftradius'),
        foreShoulder: p.shoulder('fore'),
        aftShoulder: p.shoulder('aft'),
      };
    }
    case 'bodytube':
      return {
        type: 'bodytube',
        ...common,
        ...external(),
        length: p.number('length'),
        thickness: p.thickness('thickness'),
        outerRadius: p.radius('radius'),
        motorMount: motorMountOf(element, where, ctx),
      };
    case 'trapezoidfinset':
      return {
        type: 'trapezoidfinset',
        ...fins(),
        rootChord: p.number('rootchord'),
        tipChord: p.number('tipchord'),
        sweepLength: p.number('sweeplength'),
        height: p.number('height'),
      };
    case 'ellipticalfinset':
      return {
        type: 'ellipticalfinset',
        ...fins(),
        rootChord: p.number('rootchord'),
        height: p.number('height'),
      };
    case 'freeformfinset':
      return { type: 'freeformfinset', ...fins(), points: finPointsOf(element, where, ctx) };
    case 'tubefinset':
      return {
        type: 'tubefinset',
        ...common,
        ...external(),
        count: p.count(),
        angleOffset: p.angleOffset(['rotation']),
        outerRadius: p.radius('radius'),
        length: p.number('length'),
        thickness: p.number('thickness'),
      };
    case 'launchlug':
      return {
        type: 'launchlug',
        ...common,
        ...external(),
        outerRadius: p.number('radius'),
        length: p.number('length'),
        thickness: p.number('thickness'),
        instanceCount: p.integer('instancecount'),
        instanceSeparation: p.number('instanceseparation'),
        angleOffset: p.angleOffset(['radialdirection']),
      };
    case 'railbutton':
      return {
        type: 'railbutton',
        ...common,
        ...external(),
        outerDiameter: p.number('outerdiameter'),
        innerDiameter: p.number('innerdiameter'),
        height: p.number('height'),
        baseHeight: p.number('baseheight'),
        flangeHeight: p.number('flangeheight'),
        screwHeight: p.number('screwheight'),
        instanceCount: p.integer('instancecount'),
        instanceSeparation: p.number('instanceseparation'),
        angleOffset: p.angleOffset([]),
      };
    case 'innertube':
      return {
        type: 'innertube',
        ...common,
        length: p.number('length'),
        outerRadius: p.radius('outerradius'),
        thickness: p.number('thickness'),
        radialPosition: p.number('radialposition'),
        cluster: p.text('clusterconfiguration'),
        clusterScale: p.number('clusterscale'),
        motorMount: motorMountOf(element, where, ctx),
        material: p.material('material'),
      };
    case 'tubecoupler':
    case 'engineblock':
    case 'centeringring':
    case 'bulkhead':
      return {
        type: element.name,
        ...common,
        length: p.number('length'),
        outerRadius: p.radius('outerradius'),
        innerRadius: element.name === 'centeringring' ? p.radius('innerradius') : null,
        thickness: p.number('thickness'),
        radialPosition: p.number('radialposition'),
        material: p.material('material'),
      };
    case 'masscomponent':
    case 'shockcord':
    case 'parachute':
    case 'streamer':
      return {
        type: element.name,
        ...common,
        packedLength: p.number('packedlength'),
        packedRadius: p.radius('packedradius'),
        mass: element.name === 'masscomponent' ? p.number('mass') : null,
      };
    case 'podset':
    case 'parallelstage':
    case 'boosterset':
      return {
        type: element.name === 'podset' ? 'podset' : 'parallelstage',
        ...common,
        instanceCount: p.integer('instancecount'),
        radiusOffset: p.radiusOffset(),
        angleOffset: p.angleOffset([]),
      };
    case 'stage':
      return { type: 'stage', ...common };
    default:
      ctx.warn(where, `<${element.name}> is not a component this reader knows`);
      return { type: 'unknown', element: element.name, ...common, children: [] };
  }
}

/** A simulation's launch altitude and summary result; its time series are not kept. */
function simulationOf(s: XmlElement): OrkSimulation {
  const text = (e: XmlElement | undefined, name: string) =>
    e?.children.find((c) => c.name === name)?.text.trim() ?? null;
  const conditions = s.children.find((c) => c.name === 'conditions');
  const data = s.children.find((c) => c.name === 'flightdata');
  const altitude = text(conditions, 'launchaltitude');
  const attribute = (name: string) => {
    const v = data?.attributes.get(name);
    return v === undefined ? null : parseJavaDouble(v);
  };
  return {
    name: text(s, 'name') ?? '',
    status: s.attributes.get('status') ?? null,
    launchAltitude: altitude === null ? null : parseJavaDouble(altitude),
    result:
      data === undefined
        ? null
        : {
            maxMach: attribute('maxmach'),
            maxAltitude: attribute('maxaltitude'),
            maxVelocity: attribute('maxvelocity'),
          },
  };
}

/** The mirror of a parsed `<openrocket>` document. */
export function documentOf(root: XmlElement, container: OrkContainer): OrkDocument {
  const ctx = new Context();
  const formatVersion = root.attributes.get('version') ?? null;
  const creator = root.attributes.get('creator') ?? null;
  if (
    formatVersion === null ||
    !(KNOWN_FORMAT_VERSIONS as readonly string[]).includes(formatVersion)
  ) {
    ctx.warn(
      'file',
      `format version ${formatVersion ?? '(none given)'} is not one this reader knows ` +
        `(${KNOWN_FORMAT_VERSIONS[0]} to ${KNOWN_FORMAT_VERSIONS[KNOWN_FORMAT_VERSIONS.length - 1]}); ` +
        'it is read anyway, and any component it does not know is reported',
    );
  }
  const rockets = root.children.filter((c) => c.name === 'rocket');
  const rocketElement = rockets[0];
  if (rockets.length > 1) {
    ctx.warn('file', 'more than one <rocket>; as in OpenRocket, the first is read');
  }
  const stages: OrkStage[] = [];
  const unattached: OrkComponent[] = [];
  let name = '';
  let designer: string | null = null;
  if (rocketElement === undefined) {
    ctx.warn('file', 'no <rocket> element');
  } else {
    const p = new Params(rocketElement, 'rocket', ctx);
    name = p.text('name') ?? '';
    designer = p.text('designer');
    const sub = rocketElement.children.find((c) => c.name === 'subcomponents');
    for (const c of sub?.children ?? []) {
      const component = componentOf(c, '', ctx);
      if (component.type === 'stage') stages.push(component);
      else unattached.push(component);
    }
  }
  const simulations = root.children
    .filter((c) => c.name === 'simulations')
    .slice(0, 1)
    .flatMap((s) => s.children.filter((c) => c.name === 'simulation'))
    .map((s) => simulationOf(s));
  return {
    container,
    formatVersion,
    creator,
    rocket: { name, designer, stages, unattached },
    simulations,
    warnings: ctx.warnings,
  };
}
