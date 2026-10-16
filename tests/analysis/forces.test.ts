import { describe, expect, it } from 'vitest';
import { forebodyPressureDrag } from '../../src/analysis/forces';
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
