/**
 * The OpenRocket importer's designs as the page takes them (0017 and 0018,
 * the coordinator's decisions of 2026-10-21): each other part named with
 * its size; a clipped transition drawn clipped; fins at the base exactly
 * at the base in the logic's inputs; the flight said with its source, the
 * curve at Mach 1.0 to 3.0 whatever it is.
 */

import { describe, expect, it } from 'vitest';
import { flightWords } from '../../src/app/status-words';
import { noseRadius } from '../../src/geometry/nose';
import { importOrk } from '../../src/import/index';
import { designForm, excludableParts, partSizeWords } from '../../src/rocket/adapter';
import type { OtherPart, RocketDesign } from '../../src/rocket/design';
import { clippedPoints, rocketGeometry } from '../../src/rocket/geometry';
import { preset } from '../../src/rocket/presets';
import { fixture } from '../import/build';

const imported = async (name: string): Promise<RocketDesign> => {
  const { mapping } = await importOrk(fixture(name), { fileName: name });
  if (mapping.design === null) throw new Error(`no design from ${name}`);
  return mapping.design;
};

describe('the other parts, named with their size', () => {
  it('words a lug, rail buttons, a pod and a part reaching aft, in either unit', () => {
    const lug: OtherPart = {
      kind: 'launch-lug',
      name: 'Lug',
      count: 1,
      size: { length: 0.035, diameter: 0.007 },
      front: 0.2575,
    };
    expect(partSizeWords(lug, 'mm')).toBe(
      "7 mm across and 35 mm long, its front 257.5 mm from the nose's tip",
    );
    expect(partSizeWords(lug, 'in')).toBe(
      "0.276 in across and 1.378 in long, its front 10.138 in from the nose's tip",
    );
    const buttons: OtherPart = {
      kind: 'rail-button',
      name: 'Rail button',
      count: 2,
      size: { diameter: 0.0097, height: 0.0097, separation: 0.2 },
      front: 0.25,
    };
    expect(partSizeWords(buttons, 'mm')).toBe(
      "9.7 mm across and 9.7 mm tall, the first 250 mm from the nose's tip, 200 mm apart",
    );
    const pod: OtherPart = {
      kind: 'pod',
      name: 'Pods',
      count: 2,
      size: { length: 0.2, diameter: 0.025, radialOffset: 0.04 },
    };
    expect(partSizeWords(pod, 'mm')).toBe(
      "25 mm across and 200 mm long, its axis 40 mm from the rocket's",
    );
    const motor: OtherPart = {
      kind: 'other',
      name: 'motor',
      count: 1,
      size: { reachAftOfBase: 0.008 },
    };
    expect(partSizeWords(motor, 'mm')).toBe('reaching 8 mm aft of the base');
    expect(partSizeWords({ kind: 'other', name: 'x', count: 1 }, 'mm')).toBe('');
  });

  it("gives each excludable part of an imported rocket its own size: the sport rocket's lug", async () => {
    const design = await imported('sport-four-fins-launch-lug.ork');
    const [lug] = excludableParts(design);
    expect(lug?.part).toBe('the launch lug');
    expect(partSizeWords(lug!.of!, 'mm')).toBe(
      "7 mm across and 35 mm long, its front 257.5 mm from the nose's tip",
    );
  });
});

describe('a clipped transition', () => {
  it("is the part of an ellipsoid nose of the larger radius between the radii (OpenRocket's clip)", () => {
    // A boat-tail from 27 mm to 20 mm in radius over 40 mm (lengths in calibres of 54 mm).
    const d = 0.054;
    const [R, r, L] = [0.027 / d, 0.02 / d, 0.04 / d];
    const points = clippedPoints({ kind: 'ellipsoid' }, 5, L, R, r, 32);
    expect(points[0]![0]).toBeCloseTo(5, 12);
    expect(points[0]![1]).toBeCloseTo(R, 12);
    expect(points.at(-1)![0]).toBeCloseTo(5 + L, 12);
    expect(points.at(-1)![1]).toBeCloseTo(r, 12);
    // The ellipsoid nose of radius R and length c + L, with radius r at c:
    // 1 - (1 - c / (c + L))^2 = (r / R)^2, so c = L a / (1 - a), a = 1 - sqrt(1 - (r / R)^2).
    const a = 1 - Math.sqrt(1 - (r / R) ** 2);
    const c = (L * a) / (1 - a);
    for (const [x, rad] of points) {
      // Seen from the narrow (aft) end: s from c to c + L.
      const s = c + (5 + L - x);
      const exact = R * Math.sqrt(1 - (1 - s / (c + L)) ** 2);
      expect(rad).toBeCloseTo(exact, 9);
      expect(rad).toBeCloseTo(
        noseRadius({ shape: { kind: 'ellipsoid' }, length: c + L, baseRadius: R }, s),
        9,
      );
    }
  });

  it('is drawn so in the geometry, and unclipped otherwise', () => {
    const b = preset('example-54').design;
    const tail = (clipped: boolean): RocketDesign => ({
      ...b,
      body: [
        ...b.body,
        {
          kind: 'transition',
          length: 0.04,
          foreDiameter: 0.054,
          aftDiameter: 0.04,
          shape: { kind: 'ellipsoid' },
          ...(clipped ? { clipped: true } : {}),
        },
      ],
    });
    const mid = (design: RocketDesign) => {
      const g = rocketGeometry(design);
      const x = g.length - 0.02 / 0.054;
      const near = g.profile.reduce((best, p) =>
        Math.abs(p[0] - x) < Math.abs(best[0] - x) ? p : best,
      );
      return near[1];
    };
    // The clipped profile is a different curve from the shape laid between the radii.
    expect(Math.abs(mid(tail(true)) - mid(tail(false)))).toBeGreaterThan(0.005);
  });
});

describe('fins at the base', () => {
  it("are exactly at the base in the logic's inputs, from a file's sum of lengths", async () => {
    const design = await imported('minimum-diameter.ork');
    const asked = designForm(design, 2, { without: true });
    expect(asked.kind).toBe('form');
    if (asked.kind === 'form') expect(asked.form.trailingEdgeAheadOfBase).toBe(0);
  });
});

describe('the flight', () => {
  it('says where its Mach number came from, and that the curve runs 1.0 to 3.0 below Mach 1', async () => {
    const design = await imported('a-simple-model-rocket.ork');
    expect(design.flight.maxMach).toBeLessThan(1);
    expect(flightWords(design)).toBe(
      `It flies to Mach 0.28 (${design.flight.from!}): below the curve, which runs from Mach 1.0 to 3.0 all the same.`,
    );
    expect(design.flight.from).toMatch(/the file's up-to-date simulations, 0.281/);
    const b = preset('example-98').design;
    expect(flightWords(b)).toBe(
      "It flies to Mach 1.60 (the example's own figure), marked on the curve.",
    );
    const typed = { ...b, flight: { maxMach: 3.4, altitude: 0 } };
    expect(flightWords(typed)).toBe(
      "It flies to Mach 3.40 (as set in the builder): past the curve's end at Mach 3.0.",
    );
  });
});
