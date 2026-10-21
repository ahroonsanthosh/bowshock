import { describe, expect, it } from 'vitest';
import { trapezoidalPlanform } from '../../src/fins/planform';
import { doubleWedge, flatPlate, singleWedge } from '../../src/fins/section';
import { bodyLength, type Body } from '../../src/geometry/body';
import { noseRadius, type NoseShape } from '../../src/geometry/nose';
import {
  bodyMesh,
  finPlacement,
  finsMesh,
  noseProfile,
  rocketMesh,
  type FinSet,
} from '../../src/render3d/rocket-mesh';

const SHAPES: NoseShape[] = [
  { kind: 'conical' },
  { kind: 'ogive', parameter: 1 },
  { kind: 'ogive', parameter: 0.5 },
  { kind: 'ellipsoid' },
  { kind: 'power', exponent: 0.5 },
  { kind: 'power', exponent: 0.75 },
  { kind: 'parabolic', parameter: 0.5 },
  { kind: 'parabolic', parameter: 1 },
  { kind: 'haack', parameter: 0 },
  { kind: 'haack', parameter: 1 / 3 },
];

const bodyWith = (shape: NoseShape): Body => ({
  nose: { shape, length: 3, baseRadius: 0.5 },
  cylinderLength: 7,
});

describe('the rocket mesh', () => {
  for (const shape of SHAPES) {
    const label = `${shape.kind}${'parameter' in shape ? ` ${shape.parameter.toFixed(2)}` : 'exponent' in shape ? ` ${shape.exponent}` : ''}`;
    it(`revolves the exact nose profile (${label}): every ring at the radius of src/geometry within 1e-6`, () => {
      const body = bodyWith(shape);
      const profile = noseProfile(body);
      // The profile's samples are the geometry's own radii.
      profile.x.forEach((x, k) => {
        expect(profile.r[k]).toBe(noseRadius(body.nose, x));
      });
      // Between samples the curve stays within the sampling tolerance of
      // each chord (its distance from the chord's line).
      for (let k = 0; k + 1 < profile.x.length; k++) {
        const [xa, xb, ra, rb] = [
          profile.x[k]!,
          profile.x[k + 1]!,
          profile.r[k]!,
          profile.r[k + 1]!,
        ];
        const len = Math.hypot(xb - xa, rb - ra);
        for (const f of [0.1, 0.25, 0.5, 0.75, 0.9]) {
          const x = xa + f * (xb - xa);
          const d =
            Math.abs((xb - xa) * (noseRadius(body.nose, x) - ra) - (rb - ra) * (x - xa)) / len;
          expect(d).toBeLessThan(2e-5);
        }
      }
      // Every vertex of the nose (in 32-bit) lies at the profile's radius for its x.
      const mesh = bodyMesh(body, 64);
      let checked = 0;
      for (let v = 0; v < mesh.parts.length; v++) {
        if (mesh.parts[v] !== 0) continue;
        const x = mesh.positions[3 * v]!;
        if (x >= body.nose.length) continue;
        const r = Math.hypot(mesh.positions[3 * v + 1]!, mesh.positions[3 * v + 2]!);
        const k = profile.x.findIndex((px) => Math.abs(px - x) <= 1e-6 * Math.max(1, px));
        expect(k).toBeGreaterThanOrEqual(0);
        expect(Math.abs(r - profile.r[k]!)).toBeLessThan(1e-6);
        checked++;
      }
      expect(checked).toBeGreaterThan(100);
    });
  }

  it('closes the body with a flat base at its length, and normals of unit length facing out', () => {
    const body = bodyWith({ kind: 'ogive', parameter: 1 });
    const mesh = bodyMesh(body, 48);
    const L = bodyLength(body);
    for (let v = 0; v < mesh.parts.length; v++) {
      const n = [mesh.normals[3 * v]!, mesh.normals[3 * v + 1]!, mesh.normals[3 * v + 2]!];
      expect(Math.hypot(n[0]!, n[1]!, n[2]!)).toBeCloseTo(1, 6);
      const p = [mesh.positions[3 * v]!, mesh.positions[3 * v + 1]!, mesh.positions[3 * v + 2]!];
      if (mesh.parts[v] === 2) {
        expect(p[0]).toBeCloseTo(L, 6);
        expect(n).toEqual([1, 0, 0]);
      } else {
        // Out of the axis: the normal's radial part points away from it.
        expect(n[1]! * p[1]! + n[2]! * p[2]!).toBeGreaterThanOrEqual(-1e-6);
      }
    }
    expect(mesh.indices.length % 3).toBe(0);
    expect(Math.max(...mesh.indices)).toBeLessThan(mesh.parts.length);
  });

  it('places the fins: their count, evenly round the body at its roll, at the base, root to tip, chords and sweep', () => {
    const body = bodyWith({ kind: 'conical' });
    const planform = trapezoidalPlanform({
      rootChord: 1.2,
      span: 0.9,
      leadingEdgeSweep: (35 * Math.PI) / 180,
      trailingEdgeSweep: (10 * Math.PI) / 180,
    });
    for (const count of [3, 4, 6]) {
      const fins: FinSet = {
        count,
        planform,
        section: doubleWedge(0.06),
        trailingEdgeAheadOfBase: 0.2,
        roll: 0.3,
      };
      const mesh = finsMesh(body, fins);
      const L = bodyLength(body);
      const R = 0.5;
      // Group the vertices by azimuth about the axis (each fin's own).
      const groups = new Map<number, number[]>();
      for (let v = 0; v < mesh.parts.length; v++) {
        expect(mesh.parts[v]).toBe(1);
        const y = mesh.positions[3 * v + 1]!;
        const z = mesh.positions[3 * v + 2]!;
        const k =
          Math.round(((Math.atan2(z, y) - 0.3) / (2 * Math.PI)) * count + 10 * count) % count;
        groups.set(k, [...(groups.get(k) ?? []), v]);
      }
      expect(groups.size).toBe(count);
      for (const [k, vs] of groups) {
        const place = finPlacement(body, fins, k);
        expect(place.phi).toBeCloseTo(0.3 + (2 * Math.PI * k) / count, 12);
        const radial = (v: number) =>
          mesh.positions[3 * v + 1]! * Math.cos(place.phi) +
          mesh.positions[3 * v + 2]! * Math.sin(place.phi);
        const across = (v: number) =>
          -mesh.positions[3 * v + 1]! * Math.sin(place.phi) +
          mesh.positions[3 * v + 2]! * Math.cos(place.phi);
        const xs = vs.map((v) => mesh.positions[3 * v]!);
        const rs = vs.map(radial);
        // Tip at the span from the body's surface; root sunk slightly into it.
        expect(Math.max(...rs)).toBeCloseTo(R + planform.span, 5);
        expect(Math.min(...rs)).toBeLessThan(R);
        expect(Math.min(...rs)).toBeGreaterThan(0.9 * R);
        // Root trailing edge at its distance ahead of the base.
        expect(Math.max(...xs)).toBeCloseTo(
          L - 0.2 + Math.max(0, planform.span * planform.tanTrailingEdge),
          5,
        );
        // The tip's chord and leading edge (sweep).
        const tip = vs.filter((v) => Math.abs(radial(v) - (R + planform.span)) < 1e-5);
        const tipX = tip.map((v) => mesh.positions[3 * v]!);
        const rootLE = L - 0.2 - planform.rootChord;
        expect(Math.min(...tipX)).toBeCloseTo(rootLE + planform.span * planform.tanLeadingEdge, 5);
        const tipChord =
          planform.rootChord + planform.span * (planform.tanTrailingEdge - planform.tanLeadingEdge);
        expect(Math.max(...tipX) - Math.min(...tipX)).toBeCloseTo(tipChord, 5);
        // Thickness: the double wedge's 6% of the local chord at its ridge.
        const thickness = Math.max(...tip.map(across)) - Math.min(...tip.map(across));
        expect(thickness).toBeCloseTo(0.06 * tipChord, 5);
      }
    }
  });

  it('gives the Basic Finner four fins with the blunt trailing edge of its single wedge', () => {
    const body: Body = {
      nose: {
        shape: { kind: 'conical' },
        length: 0.5 / Math.tan((10 * Math.PI) / 180),
        baseRadius: 0.5,
      },
      cylinderLength: 10 - 0.5 / Math.tan((10 * Math.PI) / 180),
    };
    const fins: FinSet = {
      count: 4,
      planform: { rootChord: 1, span: 1, tanLeadingEdge: 0, tanTrailingEdge: 0 },
      section: singleWedge(0.08),
      trailingEdgeAheadOfBase: 0,
    };
    const mesh = rocketMesh({ body, fins }, 32);
    const finVertices = [...mesh.parts].flatMap((p, v) => (p === 1 ? [v] : []));
    const atBase = finVertices.filter((v) => Math.abs(mesh.positions[3 * v]! - 10) < 1e-6);
    // At the base, each fin's trailing edge is 0.08 calibres thick.
    const zs = atBase
      .filter((v) => mesh.positions[3 * v + 1]! > 0.6)
      .map((v) => mesh.positions[3 * v + 2]!);
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(0.08, 6);
    const leading = finVertices.filter((v) => mesh.positions[3 * v]! < 9.0 + 1e-6);
    expect(leading.length).toBeGreaterThan(0);
    expect(Math.min(...finVertices.map((v) => mesh.positions[3 * v]!))).toBeCloseTo(9, 1);
  });

  for (const [leadingEdge, trailingEdge] of [
    ['rounded', 'square'],
    ['square', 'rounded'],
    ['rounded', 'rounded'],
  ] as const) {
    it(`draws a tapered flat plate (${leadingEdge} leading, ${trailingEdge} trailing edge) one thickness at root and tip`, () => {
      const body = bodyWith({ kind: 'ogive', parameter: 1 });
      const planform = trapezoidalPlanform({
        rootChord: 2,
        span: 1,
        leadingEdgeSweep: Math.atan(1.2),
        trailingEdgeSweep: 0,
      });
      const thickness = 0.05;
      const fins: FinSet = {
        count: 3,
        planform,
        section: flatPlate(thickness, leadingEdge, trailingEdge),
        trailingEdgeAheadOfBase: 0,
        roll: 0,
      };
      const mesh = finsMesh(body, fins);
      const place = finPlacement(body, fins, 0);
      const radial = (v: number) =>
        mesh.positions[3 * v + 1]! * Math.cos(place.phi) +
        mesh.positions[3 * v + 2]! * Math.sin(place.phi);
      const across = (v: number) =>
        -mesh.positions[3 * v + 1]! * Math.sin(place.phi) +
        mesh.positions[3 * v + 2]! * Math.cos(place.phi);
      const first = [...Array(mesh.parts.length).keys()].filter(
        (v) => Math.abs(across(v)) < 0.2 && radial(v) > 0.4,
      );
      const tip = first.filter((v) => Math.abs(radial(v) - (0.5 + planform.span)) < 1e-6);
      const root = first.filter((v) => radial(v) < 0.5);
      for (const station of [root, tip]) {
        const t = station.map(across);
        // Half the thickness each side, whatever the chord (0.8 at the tip, 2 at the root).
        expect(Math.max(...t)).toBeCloseTo(thickness / 2, 9);
        expect(Math.min(...t)).toBeCloseTo(-thickness / 2, 9);
        // Rounded edges reach the mid-plane at the edge; square ones are full thickness there.
        const xs = station.map((v) => mesh.positions[3 * v]!);
        const lead = Math.min(...xs);
        const atLead = station.filter((v) => Math.abs(mesh.positions[3 * v]! - lead) < 1e-9);
        expect(Math.max(...atLead.map(across))).toBeCloseTo(
          leadingEdge === 'square' ? thickness / 2 : 0,
          9,
        );
        const trail = Math.max(...xs);
        const atTrail = station.filter((v) => Math.abs(mesh.positions[3 * v]! - trail) < 1e-9);
        expect(Math.max(...atTrail.map(across))).toBeCloseTo(
          trailingEdge === 'square' ? thickness / 2 : 0,
          9,
        );
      }
    });
  }
});
