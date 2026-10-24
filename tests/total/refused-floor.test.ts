/**
 * A refused total's parts and floor (src/total/refused-floor.ts;
 * docs/design/0011-total-drag-on-the-page.md section 10): each refused
 * part's class, the floor where every refused part is not negative and
 * withheld otherwise with every reason, the boat-tail and every base
 * refusal withheld, the sharp section's wave drag not shown under a
 * refused rounded edge, the supersonic-edge conditions at their limits;
 * every refused case of a sample of 0014's population; and the property
 * that the floor, computed as if any set of the non-negative-class parts
 * were refused, never exceeds the total's low end with its input bands.
 */

import fc from 'fast-check';
import type { NoseShape } from '../../src/geometry/nose';
import { describe, expect, it } from 'vitest';
import { trapezoidalPlanform } from '../../src/fins/planform';
import {
  doubleWedge,
  flatPlate,
  hexagonal,
  singleWedge,
  type FlatPlate,
  type SymmetricSection,
} from '../../src/fins/section';
import {
  finnedBodyComponents,
  type FinnedBody,
  type FinnedBodyComponents,
  type FlightConditions,
} from '../../src/total/finned-body';
import {
  FLOOR_EDGE_MACH,
  FLOOR_XI_MIN,
  floorLabel,
  refusedPartWithholds,
  refusedTotalParts,
  SHARP_SECTION_NOT_SHOWN,
  supersonicEdgeFailures,
} from '../../src/total/refused-floor';
import { bandWithInputs, combineComponents, type DragComponent } from '../../src/total/total-drag';
import {
  atmosphere,
  MACH_BANDS,
  mulberry32,
  population,
  type Rocket,
} from '../../docs/research/refusals/population';

const DEG = Math.PI / 180;

/** A served nose term with a band: the stand-in for the page's solve. */
const NOSE: DragComponent = {
  name: 'nose wave drag',
  cd: 0.05,
  low: 0.0499,
  high: 0.0501,
  label: 'stand-in',
  band: 'stand-in',
};

interface Shape {
  readonly section: SymmetricSection | FlatPlate;
  readonly leadingEdgeRadius?: number;
  readonly sweepLe?: number;
  readonly sweepTe?: number;
  /** Root chords ahead of the base. */
  readonly ahead?: number;
  readonly afterbody?: FinnedBody['afterbody'];
  readonly count?: number;
}

/** A 3-calibre cone on a 9-calibre cylinder, fins of root chord 1.2 and span 1 calibre. */
function rocket(s: Shape): FinnedBody {
  const root = 1.2;
  return {
    body: { nose: { shape: { kind: 'conical' }, length: 3, baseRadius: 0.5 }, cylinderLength: 9 },
    afterbody: s.afterbody ?? 'cylinder',
    fins: {
      count: s.count ?? 4,
      planform: trapezoidalPlanform({
        rootChord: root,
        span: 1,
        leadingEdgeSweep: (s.sweepLe ?? 0) * DEG,
        // Parallel edges unless given: a constant chord.
        trailingEdgeSweep: (s.sweepTe ?? s.sweepLe ?? 0) * DEG,
      }),
      section: s.section,
      sectionFamily: 'other',
      leadingEdgeRadius: s.leadingEdgeRadius ?? 0,
      trailingEdgeAheadOfBase: (s.ahead ?? 2) * root,
    },
  };
}

const at = (mach: number): FlightConditions => ({
  mach,
  temperature: 288.15,
  reynoldsPerLength: 1.4e6 * mach,
});

function refused(c: FinnedBody, mach: number, inputs = {}) {
  const parts = finnedBodyComponents(c, at(mach), NOSE, inputs);
  return { parts, view: refusedTotalParts(c, at(mach), parts, { kind: 'served' }) };
}

const names = (cs: readonly { name: string }[]) => cs.map((c) => c.name);
const refusedOf = (parts: FinnedBodyComponents) => parts.refusals.map((r) => r.component);
const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

/** The non-negative class (0011 section 10.3), as the module decides it. */
const nonNegative = (name: string, c: FinnedBody, mach: number) =>
  name !== 'nose wave drag' && refusedPartWithholds(name, c, at(mach)) === null;

describe('each refused part, and the floor', () => {
  it('fin friction and square trailing edges refused below Mach 1.5: a floor, the parts named', () => {
    const c = rocket({ section: flatPlate(0.06, 'rounded', 'square') });
    const { parts, view } = refused(c, 1.4);
    expect(refusedOf(parts)).toEqual(['fin friction', 'fin trailing-edge base']);
    // Every part served is shown, unchanged.
    expect(view.served).toEqual(parts.components);
    expect(view.notShown).toEqual([]);
    expect(view.floor).toEqual({
      kind: 'floor',
      value: sum(parts.components.map((x) => x.low)) + sum(parts.inputs.map((i) => i.low)),
      refused: ['fin friction', 'fin trailing-edge base'],
      withInputs: false,
      label: floorLabel(['fin friction', 'fin trailing-edge base'], false),
    });
    expect(view.floor.kind === 'floor' && view.floor.label).toBe(
      "a floor, not an estimate: the sum of the served parts' low ends; the refused parts " +
        '(fin friction, fin trailing-edge base) are not negative',
    );
  });

  it("the input bands' low ends are added, and the label says so", () => {
    const c = rocket({ section: flatPlate(0.06, 'rounded', 'square') });
    const { parts, view } = refused(c, 1.4, { transitionReynolds: [5e5], wallTemperature: 250 });
    const lows = parts.inputs.map((i) => i.low);
    expect(Math.min(...lows)).toBeLessThan(0);
    expect(view.floor.kind).toBe('floor');
    if (view.floor.kind !== 'floor') return;
    expect(view.floor.value).toBe(sum(parts.components.map((x) => x.low)) + sum(lows));
    expect(view.floor.withInputs).toBe(true);
    expect(view.floor.label.endsWith("; the input bands' low ends are added")).toBe(true);
  });

  it('a closed section (double wedge, hexagonal) refused below Mach 1.5: not negative', () => {
    for (const section of [doubleWedge(0.05), hexagonal(0.05, 0.2, 0.2)]) {
      const c = rocket({ section });
      const { parts, view } = refused(c, 1.3);
      expect(refusedOf(parts)).toEqual(['fin friction', 'fin wave drag']);
      expect(view.floor.kind).toBe('floor');
    }
  });

  it("a single wedge's faces refused below Mach 1.5: withheld, the conditions named", () => {
    const c = rocket({ section: singleWedge(0.05) });
    const { parts, view } = refused(c, 1.3);
    expect(refusedOf(parts)).toContain('fin wave drag');
    expect(view.floor).toEqual({
      kind: 'withheld',
      reasons: [
        'the fin wave drag of a single wedge (a blunt trailing edge) is refused, and its faces ' +
          'are shown not to be negative only with supersonic edges (design record 0011, section ' +
          '10.3): the Mach number 1.3 is below 1.5',
      ],
    });
  });

  it("a flat plate's square-cut leading edge: not negative with supersonic edges only", () => {
    const square = (sweepLe: number) =>
      rocket({ section: flatPlate(0.06, 'square', 'square'), sweepLe });
    // Mach 2, unswept: every condition holds.
    const ok = refused(square(0), 2);
    expect(refusedOf(ok.parts)).toEqual(['fin leading edges']);
    expect(ok.view.floor.kind).toBe('floor');
    // Mach 1.4: below 1.5, and the friction and trailing edge refused besides (not negative).
    const low = refused(square(0), 1.4);
    expect(low.view.floor.kind === 'withheld' && low.view.floor.reasons).toEqual([
      "the fin leading edges are refused, and a flat plate's leading edge is shown not to be " +
        "negative only with supersonic edges, its trailing edge and the body's base lowering it " +
        'otherwise (design record 0011, section 10.3): the Mach number 1.4 is below 1.5',
    ]);
    // Mach 2, swept 65 deg: the edge's normal Mach number 0.845.
    const swept = refused(square(65), 2);
    expect(swept.view.floor.kind).toBe('withheld');
    if (swept.view.floor.kind !== 'withheld') return;
    expect(swept.view.floor.reasons[0]).toMatch(
      /the Mach number normal to the leading edge, 0\.845, is below 1/,
    );
  });

  it('the body base refused (a boat-tail; fins at the base the factor refuses): no floor', () => {
    const tail = refused(
      rocket({ section: flatPlate(0.06, 'rounded', 'square'), afterbody: 'boat-tail' }),
      2,
    );
    expect(refusedOf(tail.parts)).toEqual(['body base']);
    expect(tail.view.floor).toEqual({
      kind: 'withheld',
      reasons: [
        'the body base is refused, and its sign with these fins or this afterbody is not argued ' +
          '(design record 0011, section 10.2)',
      ],
    });
    // The Basic Finner's wedges at the base below Mach 1.8 (0015: their blunt trailing edges).
    const wedge = refused(
      rocket({ section: singleWedge(0.08), ahead: 0, leadingEdgeRadius: 0.004 }),
      2.4,
    );
    if (wedge.parts.refusals.some((r) => r.component === 'body base')) {
      expect(wedge.view.floor.kind).toBe('withheld');
    }
    const bf = refused(rocket({ section: singleWedge(0.08), ahead: 0 }), 1.6);
    expect(refusedOf(bf.parts)).toContain('body base');
    expect(bf.view.floor.kind).toBe('withheld');
  });

  it('a rounded edge refused on a section that is not a plate: the sharp wave drag not shown, no floor', () => {
    // A rounded edge on a double wedge: 'leading-edge-geometry'.
    const c = rocket({ section: doubleWedge(0.05), leadingEdgeRadius: 0.005 });
    const { parts, view } = refused(c, 2);
    expect(refusedOf(parts)).toEqual(['fin leading edges']);
    expect(names(parts.components)).toContain('fin wave drag');
    expect(names(view.served)).not.toContain('fin wave drag');
    expect(view.notShown).toEqual([{ name: 'fin wave drag', reason: SHARP_SECTION_NOT_SHOWN }]);
    expect(view.floor).toEqual({
      kind: 'withheld',
      reasons: [
        'the rounded leading edge of this section is refused, and with it the faces of the ' +
          'rounded wedge; the sign of the two together is not argued (design record 0011, section ' +
          '10.3)',
      ],
    });
  });

  it('the nose not solved: not among the parts, and the floor withheld with its reason', () => {
    const c = rocket({ section: flatPlate(0.06, 'rounded', 'square') });
    const parts = finnedBodyComponents(c, at(1.4), NOSE);
    const view = refusedTotalParts(c, at(1.4), parts, {
      kind: 'not-solved',
      reason: 'the nose wave drag is not solved yet',
    });
    expect(names(view.served)).not.toContain('nose wave drag');
    expect(view.served).toEqual(parts.components.slice(1));
    expect(view.floor).toEqual({
      kind: 'withheld',
      reasons: ['the nose wave drag is not solved yet'],
    });
  });

  it('every reason is listed, each once', () => {
    const c = rocket({ section: singleWedge(0.05), afterbody: 'boat-tail' });
    const { view } = refused(c, 1.3);
    expect(view.floor.kind === 'withheld' && view.floor.reasons.length).toBe(2);
  });
});

describe('the supersonic edges (0011 section 10.3)', () => {
  const plate = (sweepLe = 0, sweepTe = sweepLe, t = 0.06) =>
    rocket({ section: flatPlate(t, 'square', 'square'), sweepLe, sweepTe });

  it('Mach 1.5 and above', () => {
    expect(FLOOR_EDGE_MACH).toBe(1.5);
    expect(supersonicEdgeFailures(plate(), at(1.5))).toEqual([]);
    expect(supersonicEdgeFailures(plate(), at(1.4999))).toEqual([
      'the Mach number 1.4999 is below 1.5',
    ]);
  });

  it("the leading edge's normal Mach number at least 1", () => {
    // cos(60 deg) = 0.5: Mach 2 is exactly sonic normal to the edge.
    const at60 = supersonicEdgeFailures(plate(60), at(2.0001));
    expect(at60.some((f) => f.includes('normal to the leading edge'))).toBe(false);
    const beyond = supersonicEdgeFailures(plate(61), at(2));
    expect(beyond.some((f) => f.includes('normal to the leading edge'))).toBe(true);
  });

  it("the trailing edge's normal flow outside the transonic range: xi at most -1.175", () => {
    expect(FLOOR_XI_MIN).toBeCloseTo(1.1747, 4);
    // Trailing edge swept so that its normal Mach number is just above 1: transonic.
    const near = supersonicEdgeFailures(plate(0, Math.acos(1.02 / 2) / DEG), at(2));
    expect(near.some((f) => f.startsWith('the flow normal to the trailing edge'))).toBe(true);
    // Unswept at Mach 2: far outside.
    expect(supersonicEdgeFailures(plate(0, 0), at(2))).toEqual([]);
    // The limit itself: xi = -1.175 exactly at M_TE with (1 - M^2) = -1.175 [(gamma+1) M^2 tau]^(2/3).
    const tau = 0.06 / 1.2;
    const xiAt = (m: number) => (1 - m * m) / (2.4 * m * m * tau) ** (2 / 3);
    let lo = 1.0001;
    let hi = 2;
    for (let k = 0; k < 80; k++) {
      const mid = (lo + hi) / 2;
      if (xiAt(mid) > -FLOOR_XI_MIN) lo = mid;
      else hi = mid;
    }
    expect(supersonicEdgeFailures(plate(), at(Math.max(1.5, hi * 1.0001)))).toEqual([]);
  });

  it("a swept leading edge: the free stream above (L5)'s floor", () => {
    // Thick plates, many of them, swept 55 deg: the floor exceeds Mach 1.5.
    const thick = rocket({ section: flatPlate(0.12, 'square', 'square'), sweepLe: 55, count: 6 });
    const theta = 0.004 + (6 * 0.12) / (2 * Math.PI * 0.5 * Math.tan(55 * DEG));
    const floor = Math.sqrt(1 + 2 * ((3 * 2.4 * theta) / 2) ** (2 / 3));
    expect(floor).toBeGreaterThan(1.5);
    expect(supersonicEdgeFailures(thick, at(floor * 0.999)).some((f) => f.includes('(L5)'))).toBe(
      true,
    );
    expect(supersonicEdgeFailures(thick, at(floor * 1.001)).some((f) => f.includes('(L5)'))).toBe(
      false,
    );
  });
});

// ------------------------------------------------------------- the population

/** The nose shapes, as docs/research/refusals/evaluate.ts maps them (not imported: it is not typechecked). */
function noseShape(kind: Rocket['nose']): NoseShape {
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

/** The section the library takes, as evaluate.ts's `librarySection`. */
function librarySection(r: Rocket): SymmetricSection | FlatPlate {
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

/** A population rocket as `src/total` takes it, in metres (as evaluate.ts's cross-check). */
function populationRocket(r: Rocket): FinnedBody {
  const section = librarySection(r);
  const L = r.overallFineness * r.diameter;
  const Ln = r.noseFineness * r.diameter;
  const rounded = r.section === 'rounded-le-square-te' || r.section === 'rounded-both';
  return {
    body: {
      nose: { shape: noseShape(r.nose), length: Ln, baseRadius: r.diameter / 2 },
      cylinderLength: L - Ln,
    },
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
      leadingEdgeRadius: rounded ? r.thickness / 2 : 0,
      trailingEdgeAheadOfBase: r.trailingEdgeAheadChords * r.rootChord,
    },
  };
}

interface Case {
  readonly config: FinnedBody;
  readonly conditions: FlightConditions;
  readonly parts: FinnedBodyComponents;
  readonly boatTail: boolean;
}

/** The first N rockets of 0014's population, each at a Mach number and altitude in every band. */
function populationCases(n: number): Case[] {
  const rand = mulberry32(20261024);
  const out: Case[] = [];
  for (const r of population(n)) {
    const config = populationRocket(r);
    for (const [lo, hi] of MACH_BANDS) {
      const mach = lo + (hi - lo) * rand();
      const altitudeKm = 12 * rand();
      const air = atmosphere(altitudeKm);
      const conditions = {
        mach,
        temperature: air.t,
        reynoldsPerLength: (air.rho * air.a * mach) / air.mu,
      };
      let parts: FinnedBodyComponents;
      try {
        parts = finnedBodyComponents(config, conditions, NOSE);
      } catch {
        continue;
      }
      out.push({ config, conditions, parts, boatTail: r.boatTail });
    }
  }
  return out;
}

describe("0014's population", { timeout: 600_000 }, () => {
  const cases = populationCases(400);
  const refusedCases = cases.filter((c) => c.parts.refusals.length > 0);
  const servedCases = cases.filter((c) => c.parts.refusals.length === 0);

  it('every refused case: every part served shown, and a floor exactly where every refused part is not negative', () => {
    expect(refusedCases.length).toBeGreaterThan(500);
    let floors = 0;
    for (const c of refusedCases) {
      const view = refusedTotalParts(c.config, c.conditions, c.parts, { kind: 'served' });
      const refusedNames = [...new Set(c.parts.refusals.map((r) => r.component))];
      // The parts served: all of src/total's, but a sharp section's wave drag under a refused rounded edge.
      const hidden = names(view.notShown);
      expect([...names(view.served), ...hidden].sort()).toEqual(names(c.parts.components).sort());
      for (const p of view.served) expect(c.parts.components).toContainEqual(p);
      const allNonNegative = refusedNames.every((n) => nonNegative(n, c.config, c.conditions.mach));
      expect(view.floor.kind).toBe(allNonNegative ? 'floor' : 'withheld');
      // Never with the body base refused (a boat-tail included), nor a rounded edge on a section.
      if (c.boatTail || refusedNames.includes('body base'))
        expect(view.floor.kind).toBe('withheld');
      if (view.floor.kind === 'floor') {
        floors++;
        expect(view.floor.refused).toEqual(refusedNames);
        expect(view.floor.value).toBeCloseTo(
          sum(view.served.map((p) => p.low)) + sum(c.parts.inputs.map((i) => i.low)),
          14,
        );
        expect(view.notShown).toEqual([]);
        // Each refused part is in a class 0011 section 10.3 argues.
        for (const n of refusedNames) {
          expect([
            'fin friction',
            'fin trailing-edge base',
            'fin wave drag',
            'fin leading edges',
          ]).toContain(n);
        }
      } else {
        expect(view.floor.reasons.length).toBeGreaterThan(0);
        expect(new Set(view.floor.reasons).size).toBe(view.floor.reasons.length);
      }
    }
    // Recorded for the report: how many refused cases get a floor in this sample.
    console.log(
      `population sample: ${cases.length} cases, ${servedCases.length} totals served, ` +
        `${refusedCases.length} refused, ${floors} of them with a floor`,
    );
    expect(floors).toBeGreaterThan(0);
  });

  it('the floor as if any set of the non-negative-class parts were refused never exceeds the low end with the inputs', () => {
    expect(servedCases.length).toBeGreaterThan(10);
    for (const c of servedCases) checkFloorBelowTotal(c.config, c.conditions, c.parts);
  });
});

/** For a served total, every subset of its non-negative-class parts taken as refused. */
function checkFloorBelowTotal(
  config: FinnedBody,
  conditions: FlightConditions,
  parts: FinnedBodyComponents,
): void {
  const total = combineComponents(parts.components, parts.inputs);
  const low = bandWithInputs(total)[0];
  const candidates = parts.components.filter((p) => nonNegative(p.name, config, conditions.mach));
  for (let mask = 1; mask < 1 << candidates.length; mask++) {
    const out = candidates.filter((_, k) => (mask >> k) & 1);
    const asRefused: FinnedBodyComponents = {
      ...parts,
      components: parts.components.filter((p) => !out.includes(p)),
      refusals: out.map((p) => ({ component: p.name, reason: 'test', message: 'as if refused' })),
    };
    const view = refusedTotalParts(config, conditions, asRefused, { kind: 'served' });
    expect(view.floor.kind).toBe('floor');
    if (view.floor.kind !== 'floor') continue;
    expect(view.floor.value).toBeLessThanOrEqual(low + 1e-12);
  }
}

describe('the floor never exceeds the total (random cases)', { timeout: 600_000 }, () => {
  it('as if any set of the non-negative-class parts were refused', () => {
    const shape = fc.record({
      kind: fc.constantFrom('plate-rounded', 'plate-square', 'single', 'double', 'hexagonal'),
      thickness: fc.double({ min: 0.02, max: 0.09, noNaN: true }),
      sweepLe: fc.double({ min: 0, max: 55, noNaN: true }),
      sweepTeShare: fc.double({ min: 0, max: 1, noNaN: true }),
      ahead: fc.constantFrom(0, 1.5, 3),
      mach: fc.double({ min: 1.05, max: 3, noNaN: true }),
      transition: fc.option(fc.double({ min: 2e5, max: 3e6, noNaN: true }), { nil: undefined }),
    });
    let served = 0;
    fc.assert(
      fc.property(shape, (s) => {
        const section =
          s.kind === 'plate-rounded'
            ? flatPlate(s.thickness, 'rounded', 'square')
            : s.kind === 'plate-square'
              ? flatPlate(s.thickness, 'square', 'square')
              : s.kind === 'single'
                ? singleWedge(s.thickness / 1.2)
                : s.kind === 'double'
                  ? doubleWedge(s.thickness / 1.2)
                  : hexagonal(s.thickness / 1.2, 0.2, 0.2);
        let c: FinnedBody;
        let parts: FinnedBodyComponents;
        try {
          c = rocket({
            section,
            sweepLe: s.sweepLe,
            sweepTe: s.sweepLe * s.sweepTeShare,
            ahead: s.ahead,
          });
          parts = finnedBodyComponents(
            c,
            at(s.mach),
            NOSE,
            s.transition === undefined ? {} : { transitionReynolds: [s.transition] },
          );
        } catch {
          return;
        }
        if (parts.refusals.length > 0) return;
        served++;
        checkFloorBelowTotal(c, at(s.mach), parts);
      }),
      { numRuns: 400, seed: 20261024 },
    );
    expect(served).toBeGreaterThan(20);
  });
});
