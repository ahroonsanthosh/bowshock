import { describe, expect, it } from 'vitest';
import { forebodyPressureDrag, pressureDragFromProfile } from '../../src/analysis/forces';
import type { BoundaryFaceFlux } from '../../src/engine-cpu/euler2d';
import { bodyRadius, type Body } from '../../src/geometry/body';

/** Wall faces along a body profile carrying a given pressure, per radian. */
function wallFaces(body: Body, pressure: (x: number) => number, n: number): BoundaryFaceFlux[] {
  const L = body.nose.length + body.cylinderLength;
  const faces: BoundaryFaceFlux[] = [];
  for (let k = 0; k < n; k++) {
    const [x1, x2] = [(L * k) / n, (L * (k + 1)) / n];
    const [r1, r2] = [bodyRadius(body, x1), bodyRadius(body, x2)];
    const length = Math.hypot(x2 - x1, r2 - r1);
    // Outward normal of the flow domain: into the body.
    const nx = (r2 - r1) / length;
    const ny = -(x2 - x1) / length;
    const p = pressure((x1 + x2) / 2);
    faces.push({
      x: (x1 + x2) / 2,
      y: (r1 + r2) / 2,
      nx,
      ny,
      area: (length * (r1 + r2)) / 2,
      flux: [0, p * nx, p * ny, 0],
    });
  }
  return faces;
}

describe('forebody pressure drag', () => {
  const freeStream = { pressure: 1, dynamicPressure: 0.5 * 1.4 * 4 };

  it('is the pressure coefficient on a cone of uniform surface pressure, exactly', () => {
    const cone: Body = {
      nose: { shape: { kind: 'conical' }, length: 2, baseRadius: 0.5 },
      cylinderLength: 3,
    };
    const pc = 1.7;
    const drag = forebodyPressureDrag(
      wallFaces(cone, (x) => (x < 2 ? pc : 0.9), 50),
      freeStream,
      0.5,
    );
    // The cylinder, its normal radial, adds nothing whatever its pressure.
    expect(drag).toBeCloseTo((pc - 1) / freeStream.dynamicPressure, 12);
  });

  it('vanishes in the free stream on any profile', () => {
    const ogive: Body = {
      nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 },
      cylinderLength: 2,
    };
    expect(
      forebodyPressureDrag(
        wallFaces(ogive, () => 1, 200),
        freeStream,
        0.5,
      ),
    ).toBeCloseTo(0, 12);
  });
});

describe('pressure drag from a surface-pressure profile', () => {
  const freeStream = { pressure: 1, dynamicPressure: 0.5 * 1.4 * 4 };

  it('is the pressure coefficient for a uniform pressure, whatever the profile', () => {
    const ogive: Body = {
      nose: { shape: { kind: 'ogive', parameter: 1 }, length: 3, baseRadius: 0.5 },
      cylinderLength: 0,
    };
    const points = Array.from({ length: 50 }, (_, k) => ({ x: 0.01 + (2.98 * k) / 49, p: 1.6 }));
    const drag = pressureDragFromProfile(points, (x) => bodyRadius(ogive, x), freeStream, 0.5, 1.6);
    expect(drag).toBeCloseTo(0.6 / freeStream.dynamicPressure, 12);
  });

  it('agrees with the wall-face integral on the same faces', () => {
    const cone: Body = {
      nose: { shape: { kind: 'conical' }, length: 2, baseRadius: 0.5 },
      cylinderLength: 0,
    };
    // A pressure varying along the cone, sampled at the face midpoints.
    const pressure = (x: number) => 1.5 + 0.2 * Math.sin(x);
    const faces = wallFaces(cone, pressure, 400);
    const fromFaces = forebodyPressureDrag(faces, freeStream, 0.5);
    const points = faces.map((f) => ({ x: f.x, p: pressure(f.x) }));
    const fromProfile = pressureDragFromProfile(
      points,
      (x) => bodyRadius(cone, x),
      freeStream,
      0.5,
      pressure(0),
    );
    // Midpoint and trapezoidal rules: equal to second order in the spacing.
    expect(Math.abs(fromProfile - fromFaces)).toBeLessThan(1e-5);
  });
});
