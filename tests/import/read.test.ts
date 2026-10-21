import { describe, expect, it } from 'vitest';
import { OrkReadError } from '../../src/import/errors';
import type { OrkComponent, OrkStage } from '../../src/import/model';
import { parseJavaDouble } from '../../src/import/parse';
import { readOrk } from '../../src/import/read';
import { bytesOf, document, fixture, nose, stage, trapezoidFins, tube } from './build';

function find(stage: OrkStage, type: OrkComponent['type'], name?: string): OrkComponent {
  const all: OrkComponent[] = [];
  const walk = (c: OrkComponent) => {
    all.push(c);
    c.children.forEach(walk);
  };
  stage.children.forEach(walk);
  const found = all.find((c) => c.type === type && (name === undefined || c.name === name));
  if (found === undefined) throw new Error(`no ${type} ${name ?? ''}`);
  return found;
}

describe('reading the mirror of a real OpenRocket file', () => {
  it('"A simple model rocket" (OpenRocket 24.12, format 1.10), value for value', async () => {
    const doc = await readOrk(fixture('a-simple-model-rocket.ork'));
    expect(doc.container).toBe('zip');
    expect(doc.formatVersion).toBe('1.10');
    expect(doc.creator).toBe('OpenRocket 24.12');
    expect(doc.warnings).toEqual([]);
    expect(doc.rocket.name).toBe('A simple model rocket');
    expect(doc.rocket.designer).toBe('Sampo Niskanen');
    expect(doc.rocket.stages.map((s) => s.name)).toEqual(['Sustainer']);
    const s = doc.rocket.stages[0]!;
    expect(s.children.map((c) => c.type)).toEqual(['nosecone', 'bodytube']);

    const n = s.children[0]!;
    if (n.type !== 'nosecone') throw new Error('not a nose');
    expect(n).toMatchObject({
      name: 'Nose cone',
      finish: 'normal',
      material: { name: 'Polystyrene', type: 'bulk', density: 1050 },
      length: 0.1,
      thickness: 0.002,
      shape: 'ogive',
      shapeParameter: 1,
      aftRadius: { value: 0.0125, automatic: false },
      aftShoulder: { radius: 0.0115, length: 0.02, thickness: 0.002, capped: true },
      flipped: false,
      axialOffset: null,
    });

    const t = s.children[1]!;
    if (t.type !== 'bodytube') throw new Error('not a tube');
    expect(t.outerRadius).toEqual({ value: 0.0125, automatic: true });
    expect(t.length).toBe(0.3);
    expect(t.children.map((c) => c.type)).toEqual([
      'parachute',
      'shockcord',
      'masscomponent',
      'launchlug',
      'trapezoidfinset',
      'centeringring',
      'centeringring',
      'innertube',
    ]);

    const fins = find(s, 'trapezoidfinset');
    if (fins.type !== 'trapezoidfinset') throw new Error('not fins');
    expect(fins).toMatchObject({
      count: 3,
      angleOffset: { method: null, degrees: 0 }, // the later <rotation> wins, as in OpenRocket
      radiusOffset: { method: 'surface', value: 0 },
      axialOffset: { method: 'bottom', offset: 0 },
      thickness: 0.002,
      crossSection: 'rounded',
      cantDegrees: 0,
      tab: null,
      filletRadius: 0,
      rootChord: 0.0508,
      tipChord: 0.0508,
      sweepLength: 0.0254,
      height: 0.03,
    });

    const lug = find(s, 'launchlug');
    expect(lug).toMatchObject({
      outerRadius: 0.0035,
      length: 0.035,
      thickness: 0.001,
      instanceCount: 1,
      angleOffset: { method: null, degrees: 19 },
      axialOffset: { method: 'middle', offset: 0 },
    });

    const mount = find(s, 'innertube');
    if (mount.type !== 'innertube') throw new Error('not an inner tube');
    expect(mount.axialOffset).toEqual({ method: 'bottom', offset: 0.005 });
    expect(mount.motorMount?.overhang).toBe(0.003);
    expect(mount.motorMount?.motors.map((m) => m.designation)).toEqual([
      'A8',
      'B4',
      'C6',
      'C6',
      'C6',
    ]);
    expect(find(s, 'engineblock').axialOffset).toEqual({ method: 'top', offset: 0.002 });

    expect(doc.simulations.map((x) => x.result?.maxMach)).toEqual([
      0.086, 0.157, 0.281, 0.281, 0.281,
    ]);
    expect(doc.simulations.every((x) => x.status === 'uptodate' && x.launchAltitude === 0)).toBe(
      true,
    );
  });

  it('freeform points, pods and fins on a nose ("Pods--airframes and winglets")', async () => {
    const doc = await readOrk(fixture('pods-airframes-and-winglets.ork'));
    const s = doc.rocket.stages[0]!;
    const cockpit = find(s, 'freeformfinset', 'Cockpit');
    if (cockpit.type !== 'freeformfinset') throw new Error('not freeform');
    expect(cockpit.points).toEqual([
      { x: 0, y: 0 },
      { x: 0.009347826086956524, y: 0.006956521739130436 },
      { x: 0.05, y: 0.0022276567072510058 },
    ]);
    const pods = find(s, 'podset', 'Wing pods');
    expect(pods).toMatchObject({
      instanceCount: 2,
      radiusOffset: { method: 'relative', value: 0.0508 },
    });
    expect(pods.children.map((c) => c.type)).toEqual(['nosecone', 'bodytube', 'nosecone']);
    expect(find(s, 'nosecone', 'Pod tail')).toMatchObject({ flipped: true, shape: 'ellipsoid' });
  });

  it('tube fins with an automatic radius not stored ("Tube fin rocket")', async () => {
    const doc = await readOrk(fixture('tube-fin-rocket.ork'));
    const tf = find(doc.rocket.stages[0]!, 'tubefinset');
    expect(tf).toMatchObject({
      count: 6,
      outerRadius: { value: null, automatic: true },
      length: 0.07619999999999999,
    });
  });

  it('two stages and fin tabs ("Two stage high power rocket", format 1.11)', async () => {
    const doc = await readOrk(fixture('two-stage-high-power-rocket.ork'));
    expect(doc.formatVersion).toBe('1.11');
    expect(doc.rocket.stages.map((s) => s.name)).toEqual(['Sustainer', 'Booster']);
    const fins = find(doc.rocket.stages[0]!, 'trapezoidfinset');
    if (fins.type !== 'trapezoidfinset') throw new Error('not fins');
    expect(fins.tab).toEqual({
      height: 0.011429999999999996,
      length: 0.1460499999999999,
      relativeTo: 'middle',
      position: 5.551115123125783e-17,
    });
  });
});

describe('reading: the rules OpenRocket loads by', () => {
  it('a shape resets the shape parameter to its default; a later parameter sets it', async () => {
    const read = async (extra: string) =>
      (await readOrk(bytesOf(document([stage([nose({ extra })])])))).rocket.stages[0]!.children[0]!;
    // The builder writes <shape>ogive</shape> after `extra`.
    expect(await read('<shapeparameter>0.4</shapeparameter>')).toMatchObject({
      shape: 'ogive',
      shapeParameter: 1,
    });
    const doc = await readOrk(
      bytesOf(document([stage([nose({ shape: 'power', parameter: 0.4 })])])),
    );
    expect(doc.rocket.stages[0]!.children[0]).toMatchObject({
      shape: 'power',
      shapeParameter: 0.4,
    });
    const defaulted = await readOrk(bytesOf(document([stage([nose({ shape: 'haack' })])])));
    expect(defaulted.rocket.stages[0]!.children[0]).toMatchObject({ shapeParameter: 0 });
  });

  it('numbers as Java reads them, and anything else reported, not guessed', async () => {
    expect(parseJavaDouble(' 1.5E-3 ')).toBe(0.0015);
    expect(parseJavaDouble('2d')).toBe(2);
    expect(parseJavaDouble('.5')).toBe(0.5);
    expect(parseJavaDouble('NaN')).toBeNull();
    expect(parseJavaDouble('Infinity')).toBeNull();
    expect(parseJavaDouble('0x10')).toBeNull();
    expect(parseJavaDouble('')).toBeNull();
    const doc = await readOrk(bytesOf(document([stage([nose({ length: Number.NaN })])])));
    expect(doc.rocket.stages[0]!.children[0]).toMatchObject({ length: null });
    expect(doc.warnings).toEqual([
      'stage "Sustainer" / nose cone "Nose cone": <length> "NaN" is not a number',
    ]);
  });

  it("absent elements every version writes take OpenRocket's default, said in a warning", async () => {
    const fins = trapezoidFins()
      .replace('<cant>0</cant>', '')
      .replace(/<crosssection>\w+<\/crosssection>/, '');
    const doc = await readOrk(bytesOf(document([stage([nose(), tube({ children: [fins] })])])));
    expect(find(doc.rocket.stages[0]!, 'trapezoidfinset')).toMatchObject({
      cantDegrees: 0,
      crossSection: 'square',
    });
    expect(doc.warnings).toEqual([
      'stage "Sustainer" / body tube "Body tube" / trapezoidal fin set "Fins": no <crosssection>; OpenRocket\'s default, "square", is taken',
      'stage "Sustainer" / body tube "Body tube" / trapezoidal fin set "Fins": no <cant>; OpenRocket\'s default, 0 degrees, is taken',
    ]);
  });

  it('an element this reader does not know is kept as unknown, with a warning', async () => {
    const doc = await readOrk(
      bytesOf(document([stage([nose(), tube({ children: ['<widget><name>W</name></widget>'] })])])),
    );
    expect(find(doc.rocket.stages[0]!, 'unknown')).toMatchObject({ element: 'widget', name: 'W' });
    expect(doc.warnings[0]).toMatch(/<widget> is not a component this reader knows/);
  });

  it('a newer format version is read, with a warning', async () => {
    const doc = await readOrk(bytesOf(document([stage([nose()])], '1.12')));
    expect(doc.warnings[0]).toMatch(/format version 1\.12 is not one this reader knows/);
  });

  it('another encoding, when the declaration names it', async () => {
    const xml = document([stage([nose({ name: 'Ogive été' })])]).replace(
      "encoding='utf-8'",
      "encoding='ISO-8859-1'",
    );
    // Every character is below 256: one byte each.
    const latin1 = Uint8Array.from({ length: xml.length }, (_, i) => xml.charCodeAt(i));
    const doc = await readOrk(latin1);
    expect(doc.rocket.stages[0]!.children[0]!.name).toBe('Ogive été');
  });
});

describe('reading: files that are not OpenRocket designs', () => {
  const fails = async (xml: string) => {
    try {
      await readOrk(bytesOf(xml));
    } catch (e) {
      expect(e).toBeInstanceOf(OrkReadError);
      return e as OrkReadError;
    }
    throw new Error('expected a refusal');
  };

  it('a RockSim design', async () => {
    const e = await fails('<?xml version="1.0"?><RockSimDoc><DesignInformation/></RockSimDoc>');
    expect(e.kind).toBe('not-openrocket');
    expect(e.message).toMatch(/RockSim design, not an OpenRocket one/);
  });

  it('XML of another kind', async () => {
    const e = await fails('<svg xmlns="http://www.w3.org/2000/svg"/>');
    expect(e.message).toMatch(/its root element is <svg>/);
  });

  it('OpenRocket XML that is not well-formed', async () => {
    const e = await fails('<openrocket version="1.10"><rocket><name>x</rocket></openrocket>');
    expect(e.kind).toBe('malformed-xml');
    expect(e.message).toMatch(/not well-formed XML: <\/rocket> closes <name>/);
  });

  it('a document type declaration with an entity bomb', async () => {
    const e = await fails(
      '<?xml version="1.0"?><!DOCTYPE openrocket [<!ENTITY a "aaaaaaaaaa"><!ENTITY b "&a;&a;&a;">]>' +
        '<openrocket><rocket><name>&b;</name></rocket></openrocket>',
    );
    expect(e.kind).toBe('malformed-xml');
    expect(e.message).toMatch(/document type declaration/);
  });

  it('text that is not XML', async () => {
    const e = await fails('just some notes about my rocket');
    expect(e.kind).toBe('not-openrocket');
  });
});
