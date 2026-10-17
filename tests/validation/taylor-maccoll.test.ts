import { describe, expect, it } from 'vitest';
import {
  deflectionAngle,
  machAngle,
  stagnationPressureRatio,
} from '../../src/validation/gas-dynamics';
import { coneFlowField, taylorMaccoll } from '../../src/validation/taylor-maccoll';

const gamma = 1.4;
const deg = Math.PI / 180;

describe('Taylor-Maccoll solution against the tables of NASA SP-3004', () => {
  // J. L. Sims, Tables for Supersonic Flow Around Right Circular Cones at
  // Zero Angle of Attack, NASA SP-3004, 1964 (Taylor-Maccoll, gamma = 1.4,
  // the free-stream Mach number met to six or more significant figures):
  // table 11 (shock angle, radians), table 7 (surface Mach number) and
  // table 9 (surface pressure coefficient), read from the NTRS scan.
  // Measured when written: shock angles within 2e-6 rad, surface Mach
  // numbers 5 to 16 ppm below the tables, Cp within 2.2e-5 (the Mach
  // difference, amplified for thin cones whose surface pressure barely
  // exceeds the free stream's).
  const rows: [number, number, number, number, number][] = [
    // cone (deg), Mach, shock angle, surface Mach, Cp
    [2.5, 1.5, 0.72979225, 1.4866884, 0.0123382],
    [2.5, 2.0, 0.5236989, 1.9808615, 0.0107862],
    [2.5, 3.0, 0.34011057, 2.96276, 0.00913541],
    [5, 1.5, 0.73078309, 1.4579318, 0.0396615],
    [5, 3.0, 0.34409993, 2.8913832, 0.02824024],
    [10, 1.5, 0.74466072, 1.3748579, 0.1237983],
    [10, 2.0, 0.54464827, 1.8340453, 0.1044583],
    [10, 3.0, 0.37899374, 2.7101402, 0.08747518],
    [10, 5.0, 0.27241579, 4.2921847, 0.07475691],
    [12.5, 3.0, 0.40760084, 2.6103929, 0.1270239],
  ];
  it.each(rows)('%s deg cone at Mach %s', (cone, mach, shockAngle, surfaceMach, cp) => {
    const flow = taylorMaccoll(mach, cone * deg, gamma);
    expect(Math.abs(flow.shockAngle - shockAngle)).toBeLessThan(5e-6);
    expect(Math.abs(flow.surfaceMach / surfaceMach - 1)).toBeLessThan(3e-5);
    expect(Math.abs(flow.surfacePressureCoefficient - cp)).toBeLessThan(3e-5);
  });
});

describe('Taylor-Maccoll cone flow', () => {
  it('reproduces the NPARC/WIND validation case: 10 deg cone at Mach 2.35', () => {
    // NASA Glenn NPARC Alliance validation archive, "Conical Shock on a 10
    // Degree Cone at Mach 2.35" (https://www.grc.nasa.gov/WWW/wind/valid/
    // cone10/cone10.html). Its theory table (from the HAP program of Heiser
    // and Pratt) gives M = 2.2677 behind the shock and M = 2.1469 on the
    // cone; five CFD codes on the same page give a surface pressure of
    // p/p1 = 1.3740 to 1.3741 and a grid-converged surface Mach number of
    // 2.1467886.
    //
    // The same table's shock angle (27.1843 deg) and static ratios (p/p1 =
    // 1.1781 behind the shock, 1.4234 on the cone) are inconsistent with its
    // own Mach numbers: at a 27.1843 deg shock, energy conservation forces
    // M = 2.245 behind it, not 2.2677; and isentropic flow to M = 2.1469
    // gives p/p1 = 1.3741, not 1.4234. Both tabulated pressures are about
    // 3.6% above the consistent values, which is why the page reports a
    // 3.5% "error" for every CFD code. We test against the self-consistent
    // values: the tabulated Mach numbers and the CFD surface pressure.
    const flow = taylorMaccoll(2.35, 10 * deg, gamma);
    expect(flow.postShockMach).toBeCloseTo(2.2677, 3);
    expect(flow.surfaceMach).toBeCloseTo(2.1469, 3);
    expect(Math.abs(flow.surfaceMach - 2.1467886)).toBeLessThan(2e-4);
    expect(Math.abs(flow.surfacePressureRatio - 1.37405)).toBeLessThan(5e-4);
    // And it is self-consistent: surface pressure isentropic from the
    // surface Mach number.
    const isentropic =
      stagnationPressureRatio(2.35, gamma) / stagnationPressureRatio(flow.surfaceMach, gamma);
    expect(flow.surfacePressureRatio).toBeCloseTo(isentropic, 3);
  });

  it('converges as the integration tolerance tightens', () => {
    const at = (tolerance: number) => taylorMaccoll(2, 15 * deg, gamma, tolerance).surfaceMach;
    const reference = at(1e-14);
    expect(Math.abs(at(1e-8) - reference)).toBeLessThan(1e-6);
    expect(Math.abs(at(1e-11) - reference)).toBeLessThan(Math.abs(at(1e-8) - reference) + 1e-12);
    expect(Math.abs(at(1e-11) - reference)).toBeLessThan(1e-9);
  });

  it('approaches slender-body theory as the cone angle tends to zero', () => {
    // Slender-body theory for a cone of half-angle theta, with
    // beta = sqrt(M^2 - 1): Cp = 2 theta^2 (ln(2 / (beta theta)) - 1/2). It is
    // the small-angle limit, so agreement must improve as theta shrinks, and
    // the shock must approach the Mach angle.
    const mach = 3;
    const slender = (theta: number) =>
      2 * theta * theta * (Math.log(2 / (Math.sqrt(mach * mach - 1) * theta)) - 0.5);
    const mismatch = (cone: number) =>
      Math.abs(
        taylorMaccoll(mach, cone * deg, gamma).surfacePressureCoefficient / slender(cone * deg) - 1,
      );
    expect(mismatch(0.5)).toBeLessThan(mismatch(1));
    expect(mismatch(1)).toBeLessThan(mismatch(2));
    expect(mismatch(0.5)).toBeLessThan(5e-3);
    const thin = taylorMaccoll(mach, 0.05 * deg, gamma);
    expect(thin.shockAngle - machAngle(mach)).toBeGreaterThan(0);
    expect(thin.shockAngle - machAngle(mach)).toBeLessThan(1e-8);
  });

  it('compresses isentropically between the shock and the cone', () => {
    // The flow keeps turning behind a conical shock, unlike behind a wedge:
    // the surface pressure exceeds the post-shock pressure, and the surface
    // Mach number is lower than the post-shock Mach number.
    for (const [mach, cone] of [
      [1.5, 10],
      [2, 20],
      [4, 30],
    ] as const) {
      const flow = taylorMaccoll(mach, cone * deg, gamma);
      expect(flow.surfacePressureRatio).toBeGreaterThan(flow.postShockPressureRatio);
      expect(flow.surfaceMach).toBeLessThan(flow.postShockMach);
      expect(flow.shockAngle).toBeGreaterThan(cone * deg);
    }
  });

  it('refuses cones beyond shock detachment', () => {
    expect(() => taylorMaccoll(1.5, 40 * deg, gamma)).toThrow(RangeError);
  });
});

describe('the Taylor-Maccoll flow field', () => {
  it('meets the shock and the cone with the states both give', () => {
    const mach = 3;
    const cone = 20 * deg;
    const { flow, at } = coneFlowField(mach, cone, gamma);
    // Behind the shock the flow is deflected by the oblique-shock angle.
    const behind = at(flow.shockAngle);
    expect(behind.flowAngle).toBeCloseTo(deflectionAngle(mach, flow.shockAngle, gamma), 12);
    // On the cone the flow is tangent, at the surface Mach number.
    const surface = at(cone);
    expect(surface.flowAngle).toBeCloseTo(cone, 12);
    const speed = 1 / Math.sqrt(1 + 2 / ((gamma - 1) * flow.surfaceMach ** 2));
    expect(surface.speed).toBeCloseTo(speed, 12);
  });

  it('interpolates smoothly: the flow angle rises monotonically from the shock to the cone', () => {
    const { flow, at } = coneFlowField(2, 15 * deg, gamma);
    let previous = -Infinity;
    for (let k = 0; k <= 400; k++) {
      const polar = flow.shockAngle + ((15 * deg - flow.shockAngle) * k) / 400;
      const angle = at(polar).flowAngle;
      expect(angle).toBeGreaterThan(previous);
      previous = angle;
    }
  });

  it('gives the state on the cone itself, at every Mach number', () => {
    // The samples end on the cone found from the bisected shock angle, a
    // few 1e-15 rad off the requested one: before rays down to the
    // requested cone were accepted, its own ray was refused at 26 of these
    // 101 Mach numbers. The cone is the tip of the 5.75-caliber tangent
    // ogive of NACA RM A53E01 (arc radius 33.3 calibers), 9.94 deg.
    const cone = Math.atan(5.75 / 32.8125);
    for (let k = 0; k <= 100; k++) {
      const mach = 1.9 + 0.002 * k;
      const { flow, at } = coneFlowField(mach, cone, gamma);
      const surface = at(cone);
      expect(Math.abs(surface.flowAngle - cone)).toBeLessThan(1e-12);
      const speed = 1 / Math.sqrt(1 + 2 / ((gamma - 1) * flow.surfaceMach ** 2));
      expect(surface.speed).toBeCloseTo(speed, 12);
    }
  });
});
