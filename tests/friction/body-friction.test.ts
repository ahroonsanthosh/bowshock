/**
 * The body-of-revolution integration (src/friction/body-friction.ts)
 * against closed forms of its own models.
 *
 * Local Reynolds number: with cf(Re_s) at the surface distance s, a cone
 * of half-angle delta and slant length l has
 *
 *   C_D = 2 cot(delta) I / Re_l^2,   I = integral from 0 to Re_l of cf(Re) Re dRe,
 *
 * and a cylinder of radius R from s1 to s2 adds 4 pi R (Re_theta(s2) -
 * Re_theta(s1)) / Re_1 to D / q (cf = 2 dRe_theta / dRe_x). For a laminar
 * layer cf = c / sqrt(Re), so I = (2/3) c Re_l^(3/2). For van Driest II
 * with Karman-Schoenherr, cf(Re) = cf_inc(F_x Re) / F_c, and with
 * Y = Re_x CF of the law (cf_inc dRe = dY, Re = Y (log10 Y)^2 / k^2)
 *
 *   integral of cf_inc(R) R dR = [Y^2 (ln^2 Y / 2 - ln Y / 2 + 1/4)] / (k ln 10)^2
 *
 * from Y = 1, k = 0.242, so I = that, at F_x Re_l, over F_c F_x^2. With
 * transition at Re_T and the turbulent layer from the virtual origin
 * Re_T - shift, the turbulent part is the same closed form shifted, plus
 * the shift times the integral of cf.
 *
 * Momentum integral: on a laminar cone (cf = c^2 / Re_theta) the equation
 * d(s theta)/ds = s cf / 2 has theta(s) = theta_plate(s / 3), so cf is
 * sqrt(3) times the flat plate's at the same s (Mangler's factor); on a
 * cylinder it is the flat plate continued from the entry momentum
 * thickness.
 */

import { describe, expect, it } from 'vitest';
import {
  bodyFriction,
  profileFriction,
  type BodyFrictionMethod,
} from '../../src/friction/body-friction';
import { flatPlateFriction } from '../../src/friction/flat-plate';
import { karmanSchoenherrY } from '../../src/friction/karman-schoenherr';
import {
  vanDriestMomentumReynolds,
  vanDriestReynoldsForMomentum,
} from '../../src/friction/van-driest';
import type { Body } from '../../src/geometry/body';
import type { NoseShape } from '../../src/geometry/nose';

const FLOW = { mach: 2.5, temperature: 220, reynoldsPerLength: 2e7 } as const;
const LOCAL = { ...FLOW, method: 'local-reynolds' } as const;
const INTEGRAL = { ...FLOW, method: 'momentum-integral' } as const;
const METHODS: BodyFrictionMethod[] = ['local-reynolds', 'momentum-integral'];

/** Integral from 0 to Re of cf(R) R dR for the turbulent plate of `plate`, from its origin. */
function turbulentMoment(plate: ReturnType<typeof flatPlateFriction>, re: number): number {
  const { fc, fx } = plate.turbulent;
  const y = karmanSchoenherrY(fx * re);
  const l = Math.log(y);
  const k = 0.242 * Math.LN10;
  const inc = (y * y * ((l * l) / 2 - l / 2 + 0.25) - 0.25) / (k * k);
  return inc / (fc * fx * fx);
}

function cone(halfAngleDeg: number, slant: number, cylinderLength = 0): Body {
  const d = (halfAngleDeg * Math.PI) / 180;
  return {
    nose: {
      shape: { kind: 'conical' },
      length: slant * Math.cos(d),
      baseRadius: slant * Math.sin(d),
    },
    cylinderLength,
  };
}

const delta = (12 * Math.PI) / 180;
const slant = 0.3;
const reL = FLOW.reynoldsPerLength * slant;

describe('body friction, local Reynolds number, against closed forms', () => {
  it('laminar cone: C_D = (4/3) cot(delta) c / sqrt(Re_l)', () => {
    const conditions = { ...LOCAL, transitionReynolds: Infinity };
    const c = flatPlateFriction(conditions).laminar!.cfSqrtRe;
    const exact = ((4 / 3) * c) / Math.tan(delta) / Math.sqrt(reL);
    const r = bodyFriction(cone(12, slant), conditions);
    expect(Math.abs(r.cd / exact - 1)).toBeLessThan(1e-6);
    expect(r.surfaceLength).toBeCloseTo(slant, 14);
    expect(r.transitionDistance).toBeUndefined();
  });

  it('turbulent cone: the Karman-Schoenherr closed form', () => {
    const plate = flatPlateFriction(LOCAL);
    const exact = (2 * turbulentMoment(plate, reL)) / Math.tan(delta) / (reL * reL);
    const r = bodyFriction(cone(12, slant), LOCAL);
    expect(Math.abs(r.cd / exact - 1)).toBeLessThan(1e-6);
  });

  it('cone with transition on it, and a cylinder behind it', () => {
    const reT = 1.6e6;
    const conditions = { ...LOCAL, transitionReynolds: reT };
    const plate = flatPlateFriction(conditions);
    const c = plate.laminar!.cfSqrtRe;
    const shift = plate.turbulentOrigin;
    const turbulentPart =
      turbulentMoment(plate, reL - shift) -
      turbulentMoment(plate, reT - shift) +
      shift * 2 * (plate.momentumReynolds(reL) - plate.momentumReynolds(reT));
    const moment = (2 / 3) * c * reT ** 1.5 + turbulentPart;
    const exactCone = (2 * moment) / Math.tan(delta) / (reL * reL);
    const r = bodyFriction(cone(12, slant), conditions);
    expect(r.transitionDistance).toBeCloseTo(reT / FLOW.reynoldsPerLength, 14);
    expect(Math.abs(r.cd / exactCone - 1)).toBeLessThan(1e-6);

    // A cylinder of 2 slant lengths behind it adds 4 pi R dRe_theta / Re_1 to D / q.
    const radius = slant * Math.sin(delta);
    const withCylinder = bodyFriction(cone(12, slant, 2 * slant), conditions);
    const reEnd = FLOW.reynoldsPerLength * 3 * slant;
    const cylinderDragOverQ =
      (4 * Math.PI * radius * (plate.momentumReynolds(reEnd) - plate.momentumReynolds(reL))) /
      FLOW.reynoldsPerLength;
    const exact = exactCone + cylinderDragOverQ / (Math.PI * radius * radius);
    expect(Math.abs(withCylinder.cd / exact - 1)).toBeLessThan(1e-6);
    expect(withCylinder.wettedArea).toBeCloseTo(
      Math.PI * radius * slant + 2 * Math.PI * radius * 2 * slant,
      12,
    );
  });
});

describe('body friction, momentum integral, against closed forms', () => {
  it("laminar cone: sqrt(3) times the local-Reynolds-number value (Mangler's factor)", () => {
    const conditions = { ...INTEGRAL, transitionReynolds: Infinity };
    const c = flatPlateFriction(conditions).laminar!.cfSqrtRe;
    const exact = (Math.sqrt(3) * (4 / 3) * c) / Math.tan(delta) / Math.sqrt(reL);
    const r = bodyFriction(cone(12, slant), conditions);
    expect(Math.abs(r.cd / exact - 1)).toBeLessThan(1e-6);
    // Measured: 6e-8 (Heun's method, second order).
    expect(Math.abs(r.endMomentumReynolds / (c * Math.sqrt(reL / 3)) - 1)).toBeLessThan(1e-6);
  });

  it('laminar cone, then a cylinder with transition on it: the flat plate continued', () => {
    const lengthCylinder = 2 * slant;
    const reT = FLOW.reynoldsPerLength * (slant + 0.5 * lengthCylinder);
    const conditions = { ...INTEGRAL, transitionReynolds: reT };
    const plate = flatPlateFriction(conditions);
    const c = plate.laminar!.cfSqrtRe;
    const radius = slant * Math.sin(delta);
    const re1 = FLOW.reynoldsPerLength;
    // Cone: sqrt(3) times the local laminar value.
    const coneDragOverQ =
      ((Math.sqrt(3) * (4 / 3) * c) / Math.tan(delta) / Math.sqrt(reL)) * Math.PI * radius ** 2;
    // Cylinder, laminar: Re_theta^2 grows by c^2 dRe_s.
    const theta0 = c * Math.sqrt(reL / 3);
    const thetaT = Math.sqrt(theta0 * theta0 + c * c * (reT - reL));
    // Cylinder, turbulent: the turbulent plate from the length with Re_theta = thetaT.
    const reEnd = re1 * (slant + lengthCylinder);
    const equivalent = vanDriestReynoldsForMomentum(thetaT, plate.turbulent);
    const thetaEnd = vanDriestMomentumReynolds(equivalent + reEnd - reT, plate.turbulent);
    const cylinderDragOverQ = (4 * Math.PI * radius * (thetaEnd - theta0)) / re1;
    const exact = (coneDragOverQ + cylinderDragOverQ) / (Math.PI * radius * radius);
    const r = bodyFriction(cone(12, slant, lengthCylinder), conditions);
    expect(Math.abs(r.cd / exact - 1)).toBeLessThan(1e-6);
    expect(r.endMomentumReynolds / thetaEnd - 1).toBeCloseTo(0, 7);
  });
});

describe('body friction: discretisation', () => {
  const body: Body = {
    nose: { shape: { kind: 'ogive', parameter: 1 }, length: 0.25, baseRadius: 0.05 },
    cylinderLength: 1,
  };

  for (const method of METHODS) {
    it(`${method}: second order in the panel count, the default within 1e-6`, () => {
      const conditions = { ...FLOW, method, transitionReynolds: 1.6e6 };
      const cd = (panels: number) => bodyFriction(body, { ...conditions, panels }).cd;
      const [a, b, c] = [cd(250), cd(500), cd(1000)];
      const ratio = (a - b) / (b - c);
      expect(ratio).toBeGreaterThan(3.5);
      expect(ratio).toBeLessThan(4.5);
      const extrapolated = c + (c - b) / 3;
      expect(Math.abs(cd(4000) / extrapolated - 1)).toBeLessThan(1e-6);
    });
  }

  it('converges on every nose shape; C_D pi R^2 is the average cf times the wetted area', () => {
    const shapes: NoseShape[] = [
      { kind: 'ogive', parameter: 1 },
      { kind: 'ogive', parameter: 0.5 },
      { kind: 'ellipsoid' },
      { kind: 'power', exponent: 0.5 },
      { kind: 'parabolic', parameter: 1 },
      { kind: 'haack', parameter: 0 },
      { kind: 'haack', parameter: 1 / 3 },
    ];
    for (const method of METHODS) {
      for (const shape of shapes) {
        const b: Body = { nose: { shape, length: 0.25, baseRadius: 0.05 }, cylinderLength: 1 };
        const conditions = { ...FLOW, method, transitionReynolds: 1e6 };
        const coarse = bodyFriction(b, { ...conditions, panels: 2000 });
        const fine = bodyFriction(b, { ...conditions, panels: 4000 });
        expect(Math.abs(coarse.cd / fine.cd - 1), `${method} ${shape.kind}`).toBeLessThan(2e-6);
        expect(fine.cd * Math.PI * 0.05 * 0.05).toBeCloseTo(fine.averageCf * fine.wettedArea, 15);
      }
    }
  });

  it('the wetted area of an ellipsoid nose is half a prolate spheroid (vertical tangent at the tip)', () => {
    const length = 0.2;
    const radius = 0.05;
    const r = bodyFriction(
      { nose: { shape: { kind: 'ellipsoid' }, length, baseRadius: radius }, cylinderLength: 0 },
      LOCAL,
    );
    const e = Math.sqrt(1 - (radius / length) ** 2);
    const exact = Math.PI * radius * radius * (1 + (length / (radius * e)) * Math.asin(e));
    expect(Math.abs(r.wettedArea / exact - 1)).toBeLessThan(1e-6);
  });

  it('refuses a profile that does not start at a point', () => {
    expect(() =>
      profileFriction(
        { length: 1, radius: () => 0.1, breakpoints: [0, 1], referenceRadius: 0.1 },
        LOCAL,
      ),
    ).toThrow(RangeError);
  });
});
