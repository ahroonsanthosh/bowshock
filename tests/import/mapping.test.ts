import { describe, expect, it } from 'vitest';
import { importOrk, type OrkMapping } from '../../src/import/index';
import { baseStation, type RocketDesign } from '../../src/rocket/design';
import {
  bytesOf,
  document,
  ellipticalFins,
  fixture,
  freeformFins,
  innerTube,
  launchLug,
  massComponent,
  nose,
  podSet,
  railButtons,
  simpleRocket,
  stage,
  transition,
  trapezoidFins,
  tube,
  tubeFins,
} from './build';

async function mapXml(xml: string): Promise<OrkMapping> {
  return (await importOrk(bytesOf(xml), { fileName: 'test.ork' })).mapping;
}

async function mapFile(name: string): Promise<OrkMapping> {
  return (await importOrk(fixture(name), { fileName: name })).mapping;
}

function designOf(m: OrkMapping): RocketDesign {
  if (m.design === null) throw new Error(`no design: ${JSON.stringify(m.notRepresented)}`);
  return m.design;
}

/** The notes other than the surface finish, which every file has. */
const notesOf = (m: OrkMapping) => m.notRepresented.filter((n) => n.component !== 'surface finish');

describe('fixtures written for these tests', () => {
  it('a minimum-diameter rocket with three fins: held exactly, nothing noted but its finish', async () => {
    const m = await mapFile('minimum-diameter.ork');
    const d = designOf(m);
    expect(d).toEqual({
      name: 'Minimum diameter',
      nose: { shape: { kind: 'haack', parameter: 0 }, length: 0.25, diameter: 0.055 },
      body: [{ kind: 'tube', length: 0.6, diameter: 0.055 }],
      finSets: [
        {
          count: 3,
          planform: {
            kind: 'trapezoidal',
            rootChord: 0.12,
            tipChord: 0.04,
            span: 0.06,
            sweepLength: 0.07,
          },
          thickness: 0.003,
          section: {
            kind: 'flat',
            leadingEdge: { kind: 'square' },
            trailingEdge: { kind: 'square' },
          },
          rootLeadingEdge: 0.25 + 0.6 - 0.12,
          rotation: 0,
          cant: 0,
          filletRadius: 0,
        },
      ],
      otherParts: [],
      flight: { maxMach: 3, altitude: 0 },
      notes: [
        {
          feature: 'surface finish',
          reason:
            "Smooth paint (OpenRocket's roughness height 20 micrometres) on every outside " +
            'component. The design has no place for surface roughness, and the drag model ' +
            'takes roughness only as a band with its source (design record 0008 section 2.3), ' +
            'so none is made from it',
        },
        {
          feature: 'mass component "Altimeter" (in nose cone "Von Karman nose")',
          reason: 'ignored: a mass inside the body: it does not change the outside',
        },
        {
          feature: 'parachute "Parachute" (in body tube "Airframe and motor case")',
          reason: 'ignored: a mass inside the body: it does not change the outside',
        },
      ],
      source: { kind: 'openrocket', fileName: 'minimum-diameter.ork' },
    });
    expect(m.otherPartDetails).toEqual([]);
    expect(m.flightFrom).toMatch(/no simulation results, so the defaults: Mach 3 at 0 m/);
    // The fins end at the base, to the rounding of a sum of lengths.
    const fins = d.finSets[0]!;
    const planform = fins.planform;
    if (planform.kind !== 'trapezoidal') throw new Error('not trapezoidal');
    expect(Math.abs(baseStation(d) - fins.rootLeadingEdge - planform.rootChord)).toBeLessThan(
      1e-15,
    );
    expect(m.represented.map((r) => r.type)).toEqual([
      'stage',
      'nosecone',
      'bodytube',
      'trapezoidfinset',
    ]);
    expect(m.ignored.map((r) => r.reason)).toEqual([
      'a mass inside the body: it does not change the outside',
      'a mass inside the body: it does not change the outside',
    ]);
  });

  it('the same rocket from gzip-compressed and plain XML gives the same design', async () => {
    const plain = await mapFile('minimum-diameter.ork');
    const gzip = await mapFile('minimum-diameter-gzip.ork');
    expect({ ...designOf(gzip), source: null }).toEqual({ ...designOf(plain), source: null });
  });

  it('a four-fin sport rocket with a launch lug: the lug is an other part, with a note', async () => {
    const m = await mapFile('sport-four-fins-launch-lug.ork');
    const d = designOf(m);
    expect(d.finSets).toHaveLength(1);
    expect(d.finSets[0]).toMatchObject({
      count: 4,
      thickness: 0.0024,
      section: {
        kind: 'flat',
        leadingEdge: { kind: 'rounded' },
        trailingEdge: { kind: 'rounded' },
      },
    });
    expect(d.otherParts).toEqual([{ kind: 'launch-lug', name: 'Launch lug', count: 1 }]);
    expect(notesOf(m)).toEqual([
      {
        component: 'launch lug "Launch lug" (on body tube "Body tube")',
        type: 'launchlug',
        name: 'Launch lug',
        reason:
          "a tube 7 mm across and 35 mm long, its front 257.5 mm from the nose's tip: the " +
          'design holds that it is there, not its size or place',
        effect: 'note',
      },
    ]);
    // The motor mount is flush with the base: inside, ignored.
    expect(m.ignored.find((i) => i.type === 'innertube')?.reason).toBe(
      'inside the body: it does not change the outside',
    );
  });

  it('a boat-tail: held as a transition narrowing to the base', async () => {
    const m = await mapFile('boattail.ork');
    const d = designOf(m);
    expect(d.body).toEqual([
      { kind: 'tube', length: 0.5, diameter: 0.038 },
      {
        kind: 'transition',
        length: 0.03,
        foreDiameter: 0.038,
        aftDiameter: 0.029,
        shape: { kind: 'conical' },
      },
    ]);
    expect(baseStation(d)).toBeCloseTo(0.73, 15);
    // The fins end at the tube's aft end, 30 mm ahead of the base.
    expect(d.finSets[0]!.rootLeadingEdge).toBeCloseTo(0.2 + 0.5 - 0.08, 15);
    expect(m.represented.find((r) => r.type === 'transition')?.as).toBe(
      'a transition: conical, 30 mm long, from 38 mm to 29 mm across',
    );
  });
});

describe('the body', () => {
  it('two stages: the stack is one body, the second stage a note', async () => {
    const m = await mapXml(
      document([
        stage([nose(), tube({ length: 0.3 })]),
        stage(
          [tube({ name: 'Booster tube', length: 0.2, children: [trapezoidFins()] })],
          'Booster',
        ),
      ]),
    );
    const d = designOf(m);
    expect(d.body.map((b) => b.length)).toEqual([0.3, 0.2]);
    expect(d.finSets[0]!.rootLeadingEdge).toBeCloseTo(0.1 + 0.3 + 0.2 - 0.05, 15);
    expect(notesOf(m).map((n) => [n.component, n.reason])).toEqual([
      [
        'stage "Booster"',
        "stage 2 of 2: the design holds the stack as one body, front to back, with every stage's " +
          'fins; that the stages separate in flight has no place in it',
      ],
    ]);
  });

  it('the real two-stage file: every stage held, its stages noted', async () => {
    const m = await mapFile('two-stage-high-power-rocket.ork');
    const d = designOf(m);
    expect(d.body).toHaveLength(8);
    expect(d.finSets.map((f) => f.count)).toEqual([3, 3]);
    expect(d.otherParts.map((p) => [p.kind, p.count])).toEqual([
      ['rail-button', 2],
      ['rail-button', 2],
    ]);
    expect(notesOf(m).map((n) => n.type)).toEqual(['stage', 'railbutton', 'railbutton']);
  });

  it('more than one diameter is held as it is', async () => {
    const m = await mapXml(
      document([stage([nose(), tube({ radius: '0.0125' }), tube({ radius: '0.015' })])]),
    );
    expect(designOf(m).body.map((b) => (b.kind === 'tube' ? b.diameter : 0))).toEqual([
      0.025, 0.03,
    ]);
  });

  it('a tail cone (a flipped nose cone) is a transition to nothing', async () => {
    const m = await mapXml(
      document([
        stage([
          nose(),
          tube(),
          nose({ name: 'Tail', flipped: true, shape: 'ellipsoid', length: 0.02 }),
        ]),
      ]),
    );
    expect(designOf(m).body[1]).toEqual({
      kind: 'transition',
      length: 0.02,
      foreDiameter: 0.025,
      aftDiameter: 0,
      shape: { kind: 'ellipsoid' },
    });
  });

  it("an older file's automatic radius with no number takes its neighbour's", async () => {
    const m = await mapXml(document([stage([nose({ radius: 'auto' }), tube({ radius: '0.02' })])]));
    expect(designOf(m).nose.diameter).toBe(0.04);
    const t = await mapXml(document([stage([nose({ radius: '0.02' }), tube({ radius: 'auto' })])]));
    expect(designOf(t).body[0]).toMatchObject({ diameter: 0.04 });
  });

  it('a transition the design cannot hold still has what is on it accounted for', async () => {
    const bad = transition(0.0125, 0.01)
      .replace(
        '</transition>',
        '<subcomponents>' + massComponent('Weight') + '</subcomponents></transition>',
      )
      .replace(
        '<shape>conical</shape>',
        '<shape>haack</shape><shapeparameter>0.9</shapeparameter>',
      );
    const m = await mapXml(document([stage([nose(), tube(), bad])]));
    expect(m.design).toBeNull();
    expect(m.notRepresented.find((n) => n.type === 'transition')?.reason).toMatch(
      /0\.9 lies outside/,
    );
    expect(m.ignored.map((i) => i.name)).toEqual(['Weight']);
  });

  it('a transition of zero length is a step between two diameters, held as it is', async () => {
    const step = transition(0.0125, 0.0155, 0).replace(
      '</transition>',
      '<subcomponents>' + massComponent('Weight') + '</subcomponents></transition>',
    );
    const m = await mapXml(document([stage([nose(), tube(), step, tube({ radius: '0.0155' })])]));
    expect(designOf(m).body[1]).toEqual({
      kind: 'transition',
      length: 0,
      foreDiameter: 0.025,
      aftDiameter: 0.031,
      shape: { kind: 'conical' },
    });
    expect(m.ignored.map((i) => i.name)).toEqual(['Weight']);
  });

  it("OpenRocket's clipped transition profile is noted", async () => {
    const clipped = transition(0.0125, 0.01).replace(
      '<shape>conical</shape>',
      '<shape>ellipsoid</shape><shapeclipped>true</shapeclipped>',
    );
    const m = await mapXml(document([stage([nose(), tube(), clipped])]));
    expect(designOf(m).body[1]).toMatchObject({ kind: 'transition', shape: { kind: 'ellipsoid' } });
    expect(notesOf(m)[0]!.reason).toMatch(/OpenRocket clips this transition's profile/);
  });

  const noDesign: readonly (readonly [string, () => string, RegExp])[] = [
    ['no stage', () => document([]), /no stage, so there is no body/],
    [
      'a stage with no body',
      () => document([stage([])]),
      /hold no nose cone, body tube or transition/,
    ],
    ['no nose cone first', () => document([stage([tube(), nose()])]), /starts with a body tube/],
    [
      'a flipped nose cone first',
      () => document([stage([nose({ flipped: true }), tube()])]),
      /starts with a flipped nose cone/,
    ],
    [
      'a body tube placed by an offset',
      () => document([stage([nose(), tube({ position: { method: 'absolute', offset: 0.5 } })])]),
      /placed 500 mm from its absolute reference.*gap or an overlap/,
    ],
    [
      'a length the file does not give',
      () => document([stage([nose({ length: Number.NaN }), tube()])]),
      /does not give a length/,
    ],
  ];
  for (const [what, xml, reason] of noDesign) {
    it(`no design, with the reason: ${what}`, async () => {
      const m = await mapXml(xml());
      expect(m.design).toBeNull();
      const blocking = m.notRepresented.filter((n) => n.effect === 'no-design');
      expect(blocking.length).toBeGreaterThan(0);
      expect(blocking.map((n) => n.reason).join(' | ')).toMatch(reason);
    });
  }
});

describe('fin sets', () => {
  it("OpenRocket's three sections", async () => {
    const section = async (crossSection: string) =>
      designOf(await mapXml(simpleRocket({ finSpec: { crossSection } }))).finSets[0]!.section;
    expect(await section('square')).toEqual({
      kind: 'flat',
      leadingEdge: { kind: 'square' },
      trailingEdge: { kind: 'square' },
    });
    expect(await section('rounded')).toEqual({
      kind: 'flat',
      leadingEdge: { kind: 'rounded' },
      trailingEdge: { kind: 'rounded' },
    });
    expect(await section('airfoil')).toEqual({ kind: 'airfoil' });
  });

  it('a cross section OpenRocket does not know: its default, square, with a note', async () => {
    const m = await mapXml(simpleRocket({ finSpec: { crossSection: 'diamond' } }));
    expect(designOf(m).finSets[0]!.section).toMatchObject({ leadingEdge: { kind: 'square' } });
    expect(notesOf(m)[0]!.reason).toMatch(/"diamond", which OpenRocket does not know/);
  });

  it('cant, fillets, rotation and position are held', async () => {
    const m = await mapXml(
      simpleRocket({
        finSpec: { cant: 2.5, fillet: 0.004, angle: 30, position: { method: 'top', offset: 0.1 } },
      }),
    );
    expect(designOf(m).finSets[0]).toMatchObject({
      cant: 2.5,
      filletRadius: 0.004,
      rotation: 30,
      rootLeadingEdge: 0.1 + 0.1,
    });
  });

  it('elliptical and freeform outlines are held as they are', async () => {
    const e = await mapXml(
      simpleRocket({ fins: [ellipticalFins({ rootChord: 0.06, height: 0.05 })] }),
    );
    expect(designOf(e).finSets[0]!.planform).toEqual({
      kind: 'elliptical',
      rootChord: 0.06,
      span: 0.05,
    });
    const points = [
      [0, 0],
      [0.02, 0.03],
      [0.05, 0.04],
      [0.06, 0.01],
      [0.07, 0],
    ] as const;
    const f = await mapXml(simpleRocket({ fins: [freeformFins(points)] }));
    expect(designOf(f).finSets[0]!.planform).toEqual({ kind: 'freeform', points });
  });

  it('a freeform outline that is exactly a trapezoid is held as one', async () => {
    const f = await mapXml(
      simpleRocket({
        fins: [
          freeformFins([
            [0, 0],
            [0.02, 0.04],
            [0.05, 0.04],
            [0.06, 0],
          ]),
        ],
      }),
    );
    expect(designOf(f).finSets[0]!.planform).toEqual({
      kind: 'trapezoidal',
      rootChord: 0.06,
      tipChord: 0.05 - 0.02,
      span: 0.04,
      sweepLength: 0.02,
    });
    // A tip not exactly parallel to the root stays freeform.
    const g = await mapXml(
      simpleRocket({
        fins: [
          freeformFins([
            [0, 0],
            [0.02, 0.04],
            [0.05, 0.0400001],
            [0.06, 0],
          ]),
        ],
      }),
    );
    expect(designOf(g).finSets[0]!.planform.kind).toBe('freeform');
  });

  it('identical fin sets at one position, evenly spaced together, are one set', async () => {
    const one = (angle: number) => trapezoidFins({ count: 1, angle });
    const m = await mapXml(simpleRocket({ fins: [one(90), one(-150), one(-30.000000000000014)] }));
    const d = designOf(m);
    expect(d.finSets).toHaveLength(1);
    expect(d.finSets[0]).toMatchObject({ count: 3, rotation: 90 });
    expect(m.represented.filter((r) => r.type === 'trapezoidfinset')).toHaveLength(3);
  });

  it('fin sets not evenly spaced, or different, stay apart', async () => {
    const uneven = await mapXml(
      simpleRocket({
        fins: [trapezoidFins({ count: 1, angle: 0 }), trapezoidFins({ count: 1, angle: 100 })],
      }),
    );
    expect(designOf(uneven).finSets.map((f) => [f.count, f.rotation])).toEqual([
      [1, 0],
      [1, 100],
    ]);
    const two = await mapXml(
      simpleRocket({
        fins: [trapezoidFins(), trapezoidFins({ position: { method: 'top', offset: 0 } })],
      }),
    );
    expect(designOf(two).finSets).toHaveLength(2);
  });

  it('fins on the nose cone are held where they are', async () => {
    const m = await mapXml(
      document([
        stage([
          nose({
            children: [
              freeformFins(
                [
                  [0, 0],
                  [0.01, 0.01],
                  [0.03, 0],
                ],
                { position: { method: 'top', offset: 0.05 } },
              ),
            ],
          }),
          tube(),
        ]),
      ]),
    );
    expect(designOf(m).finSets[0]).toMatchObject({ rootLeadingEdge: 0.05 });
  });

  it('a fin tab is ignored: it lies inside the body tube', async () => {
    const m = await mapXml(simpleRocket({ finSpec: { tab: true } }));
    expect(m.ignored.map((i) => i.component)).toContain(
      'tab of trapezoidal fin set "Fins" (on body tube "Body tube")',
    );
  });

  it('values OpenRocket would not accept, or the file does not give: no design', async () => {
    for (const finSpec of [
      { count: 9 },
      { cant: 20 },
      { thickness: -1 },
      { rootChord: Number.NaN },
    ]) {
      const m = await mapXml(simpleRocket({ finSpec }));
      expect(m.design).toBeNull();
      expect(
        m.notRepresented.some((n) => n.type === 'trapezoidfinset' && n.effect === 'no-design'),
      ).toBe(true);
    }
  });
});

describe('other parts outside the body', () => {
  it('launch lugs, rail buttons, pods and tube fins are held as other parts, each with a note', async () => {
    const m = await mapXml(
      simpleRocket({
        tubeChildren: [launchLug(), railButtons(), podSet([nose(), tube()]), tubeFins()],
      }),
    );
    const d = designOf(m);
    expect(d.otherParts).toEqual([
      { kind: 'launch-lug', name: 'Launch lug', count: 1 },
      { kind: 'rail-button', name: 'Rail button', count: 2 },
      { kind: 'pod', name: 'Pods', count: 2 },
      { kind: 'other', name: 'Tube fins', count: 6 },
    ]);
    expect(notesOf(m).map((n) => n.reason)).toEqual([
      "a tube 7 mm across and 35 mm long, its front 232.5 mm from the nose's tip: the design " +
        'holds that it is there, not its size or place',
      "2 rail buttons 9.7 mm across and 9.7 mm tall, the first 250 mm from the nose's tip, " +
        '200 mm apart: the design holds that they are there, not their size or place',
      '2 pods beside the body (with the 2 components in it): the design holds that they are ' +
        'there, not their shape',
      "6 tube fins, 60 mm long, its front 340 mm from the nose's tip: the design's fin sets are " +
        'flat fins, so it holds them as another part, not their shape',
    ]);
  });

  it('an inner tube and a motor reaching aft of the base are other parts, with notes', async () => {
    const m = await mapXml(
      simpleRocket({
        tubeChildren: [
          innerTube({ position: { method: 'bottom', offset: 0.005 }, overhang: 0.003 }),
        ],
      }),
    );
    expect(designOf(m).otherParts).toEqual([
      { kind: 'other', name: 'Inner tube', count: 1 },
      { kind: 'other', name: 'motor in Inner tube', count: 1 },
    ]);
    expect(notesOf(m).map((n) => n.reason)).toEqual([
      'it reaches 5 mm aft of the base, outside the body; the design holds it as another part',
      "the motor reaches 8 mm aft of the base (by OpenRocket's overhang); the design holds it as another part",
    ]);
    // The simple rocket: a 100 mm nose, a 300 mm tube; the mount 75 mm long, its aft end
    // 5 mm aft of the base; the C6 70 mm long, 3 mm beyond the mount.
    const [tubePart, motor] = m.otherPartDetails;
    expect(tubePart!.size).toMatchObject({ length: 0.075, diameter: 0.019 });
    expect(tubePart!.size.reachAftOfBase).toBeCloseTo(0.005, 15);
    expect(tubePart!.front).toBeCloseTo(0.4 + 0.005 - 0.075, 15);
    expect(motor!.size.diameter).toBe(0.018);
    expect(motor!.size.length).toBe(0.07);
    expect(motor!.size.reachAftOfBase).toBeCloseTo(0.008, 15);
    expect(motor!.front).toBeCloseTo(0.4 + 0.008 - 0.07, 15);
  });

  it('each other part with its size and place, beside the design, in the same order', async () => {
    const m = await mapXml(
      simpleRocket({
        tubeChildren: [
          launchLug(),
          railButtons(),
          podSet([nose({ radius: '0.006', shoulderRadius: 0.005 }), tube({ radius: '0.006' })]),
          tubeFins(),
        ],
      }),
    );
    const details = m.otherPartDetails;
    expect(details.map((d) => d.part)).toEqual(designOf(m).otherParts);
    expect(details.map((d) => [d.type, d.size, d.rotation])).toEqual([
      ['launchlug', { length: 0.035, diameter: 0.007, thickness: 0.001 }, 30],
      [
        'railbutton',
        {
          diameter: 0.0097,
          innerDiameter: 0.008,
          height: 0.0097,
          baseHeight: 0.002,
          flangeHeight: 0.002,
          screwHeight: 0,
          separation: 0.2,
        },
        180,
      ],
      // The pods: a 100 mm nose and a 300 mm tube of radius 6 mm, 20 mm off the
      // 12.5 mm body tube's surface ("relative"): 12.5 + 20 + 6 mm axis to axis.
      ['podset', { length: 0.4, diameter: 0.012, radialOffset: 0.0125 + 0.02 + 0.006 }, 0],
      // The tube fins' radius is automatic and not stored: no diameter.
      ['tubefinset', { length: 0.06, thickness: 0.0003 }, 0],
    ]);
    // Fronts: the lug and the buttons centred on the 300 mm tube behind the 100 mm nose,
    // the pods (400 mm) and the tube fins (60 mm) flush with its aft end.
    const fronts = details.map((d) => d.front!);
    const expected = [0.1 + (0.3 - 0.035) / 2, 0.1 + 0.3 / 2, 0.1 + 0.3 - 0.4, 0.1 + 0.3 - 0.06];
    fronts.forEach((f, k) => {
      expect(f).toBeCloseTo(expected[k]!, 15);
    });
  });

  it('a nose shoulder wider than the body is an other part', async () => {
    const m = await mapXml(simpleRocket({ noseSpec: { shoulderRadius: 0.014 } }));
    expect(designOf(m).otherParts).toEqual([
      { kind: 'other', name: 'Nose cone shoulder', count: 1 },
    ]);
    expect(m.otherPartDetails[0]).toMatchObject({
      size: { length: 0.02, diameter: 0.028 },
      front: 0.1,
    });
  });

  it("inside components are among the design's notes, as ignored", async () => {
    const m = await mapXml(simpleRocket({ tubeChildren: [massComponent('Ballast')] }));
    expect(designOf(m).notes).toContainEqual({
      feature: 'mass component "Ballast" (in body tube "Body tube")',
      reason: 'ignored: a mass inside the body: it does not change the outside',
    });
  });

  it('a mount flush with the base, its motor not overhanging: inside, ignored', async () => {
    const m = await mapXml(simpleRocket({ tubeChildren: [innerTube(), massComponent()] }));
    expect(designOf(m).otherParts).toEqual([]);
    expect(m.ignored.map((i) => i.type)).toEqual(['innertube', 'masscomponent']);
  });

  it('a component this importer does not know is another part, with a note', async () => {
    const m = await mapXml(
      simpleRocket({ tubeChildren: ['<widget><name>Camera pod</name></widget>'] }),
    );
    expect(designOf(m).otherParts).toEqual([{ kind: 'other', name: 'Camera pod', count: 1 }]);
    expect(notesOf(m)[0]!.reason).toMatch(/<widget> is not a component this importer knows/);
  });

  it('components OpenRocket does not attach are ignored, as OpenRocket ignores them', async () => {
    const m = await mapXml(
      document([
        stage([
          nose({ children: [trapezoidFins()] }),
          tube({ children: [nose({ name: 'Inner nose' })] }),
        ]),
        tube({ name: 'Loose tube' }),
      ]),
    );
    expect(m.ignored.map((i) => i.reason)).toEqual([
      'OpenRocket attaches only stages to the rocket and ignores a body tube placed there',
      'OpenRocket does not attach a trapezoidal fin set to a nose cone and ignores it',
      'OpenRocket does not attach a nose cone to a body tube and ignores it',
    ]);
    expect(designOf(m).finSets).toEqual([]);
  });
});

describe('settings', () => {
  it("OpenRocket's drag override is noted, not used", async () => {
    const m = await mapXml(simpleRocket({ noseSpec: { extra: '<overridecd>0.4</overridecd>' } }));
    expect(notesOf(m)).toEqual([
      expect.objectContaining({
        component: 'drag override on nose cone "Nose cone"',
        reason: expect.stringMatching(/override of its drag coefficient \(0\.4\)/) as unknown,
      }),
    ]);
  });

  it('finishes: each with its roughness height, grouped in one note', async () => {
    const m = await mapFile('a-simple-model-rocket.ork');
    expect(m.finishes.map((f) => [f.name, f.finish, f.label, f.roughnessHeight])).toEqual([
      ['Nose cone', 'normal', 'Regular paint', 60e-6],
      ['Body tube', 'normal', 'Regular paint', 60e-6],
      ['Launch lug', 'normal', 'Regular paint', 60e-6],
      ['Trapezoidal fin set', 'normal', 'Regular paint', 60e-6],
    ]);
    const xml = simpleRocket().replace('<finish>normal</finish>', '<finish>rough</finish>');
    const mixed = await mapXml(xml);
    expect(mixed.notRepresented.find((n) => n.component === 'surface finish')?.reason).toMatch(
      /^Rough \(OpenRocket's roughness height 500 micrometres\): nose cone "Nose cone"; Regular paint \(OpenRocket's roughness height 60 micrometres\): body tube "Body tube", trapezoidal fin set "Fins" \(on body tube "Body tube"\)\./,
    );
  });

  it("the flight: the highest Mach number of the file's up-to-date simulations, at its launch altitude", async () => {
    const m = await mapFile('a-simple-model-rocket.ork');
    expect(designOf(m).flight).toEqual({ maxMach: 0.281, altitude: 0 });
    expect(m.flightFrom).toBe(
      'the highest Mach number of the file\'s up-to-date simulations, 0.281 in "Simulation 3 - ' +
        "too short delay\" (OpenRocket's own estimate), at its launch site's altitude, 0 m",
    );
    const given = (
      await importOrk(fixture('a-simple-model-rocket.ork'), {
        fileName: 'x.ork',
        flight: { maxMach: 2, altitude: 1500 },
      })
    ).mapping;
    expect(designOf(given).flight).toEqual({ maxMach: 2, altitude: 1500 });
    expect(given.flightFrom).toBe('given by the caller');
  });
});

describe('every component accounted for', () => {
  for (const name of [
    'a-simple-model-rocket.ork',
    'airstart-timing.ork',
    'pods-airframes-and-winglets.ork',
    'simulation-extensions.ork',
    'tube-fin-rocket.ork',
    'two-stage-high-power-rocket.ork',
  ]) {
    it(`${name}: each component held, noted or ignored`, async () => {
      const { document: doc, mapping } = await importOrk(fixture(name), { fileName: name });
      const names: string[] = [];
      const walk = (c: {
        name: string;
        children: readonly { name: string; children: readonly unknown[] }[];
      }) => {
        names.push(c.name);
        for (const k of c.children) walk(k as never);
      };
      for (const s of doc.rocket.stages) walk(s);
      const accounted = new Set(
        [...mapping.represented, ...mapping.notRepresented, ...mapping.ignored].map((n) => n.name),
      );
      // A pod set's contents are accounted for by the pod set's note.
      const insidePods = new Set<string>();
      const pods = (c: { type: string; children: readonly unknown[] }, inPod: boolean) => {
        for (const k of c.children as {
          type: string;
          name: string;
          children: readonly unknown[];
        }[]) {
          if (inPod) insidePods.add(k.name);
          pods(k, inPod || k.type === 'podset' || k.type === 'parallelstage');
        }
      };
      for (const s of doc.rocket.stages) pods(s, false);
      for (const n of names) {
        expect(accounted.has(n) || insidePods.has(n), n).toBe(true);
      }
    });
  }
});
