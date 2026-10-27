// W6 fourth march, V3 as registered (README section 10), run once: past
// the merge on an axisymmetric body. A 10 deg cone at Mach 2 to x = 1, a
// concave circular arc turning the surface to 15 deg over an arc length of
// 0.05, a 15 deg cone to x = 6; from Taylor-Maccoll data on the vertical
// line at x = 0.5; n = 640, 1280, 2560 and 5120. Writes V3_OUT (JSON): every
// resolution's numbers and the verdict by the four registered conditions.
// It asserts nothing: the verdict is recorded.
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import type { StartingLine, StartingState } from '../../../../src/validation/characteristics';
import { characteristicsFromShocked } from '../../../../src/validation/characteristics-shocked';
import { normalShock } from '../../../../src/validation/gas-dynamics';
import { coneFlowField } from '../../../../src/validation/taylor-maccoll';

const gamma = 1.4;
const mach = 2;
const deg = Math.PI / 180;
const half = 10 * deg;
const flare = 15 * deg;
const rc = 0.05 / (5 * deg);
const xc = 1;
const yc = Math.tan(half);
const x1 = xc + rc * (Math.sin(flare) - Math.sin(half));
const y1 = yc + rc * (Math.cos(half) - Math.cos(flare));
const end = 6;
const resolutions = [640, 1280, 2560, 5120];

/** The body: the cone, the concave arc (surface angle phi from 10 to 15 deg), the flare. */
function radius(x: number) {
  if (x <= xc) return x * Math.tan(half);
  if (x <= x1) {
    const phi = Math.asin(Math.sin(half) + (x - xc) / rc);
    return yc + rc * (Math.cos(half) - Math.cos(phi));
  }
  return y1 + (x - x1) * Math.tan(flare);
}

// Taylor-Maccoll data on a line, as tests/validation/characteristics.test.ts
// builds it (coneLine, stateOf, shockEntropy).
const stateOf = (at: { x: number; y: number; p: number; theta: number; k: number }): StartingState => {
  const cp = gamma / (gamma - 1);
  const enthalpy = cp + 0.5 * gamma * mach * mach;
  const rho = (at.p / at.k) ** (1 / gamma);
  const v = Math.sqrt(2 * (enthalpy - (cp * at.p) / rho));
  return { x: at.x, y: at.y, rho, u: v * Math.cos(at.theta), v: v * Math.sin(at.theta), p: at.p };
};
const shockEntropy = (beta: number) => {
  const s = normalShock(mach * Math.sin(beta), gamma);
  return s.pressureRatio / s.densityRatio ** gamma;
};
function coneLine(x0: number, phi: number, count: number): StartingLine {
  const field = coneFlowField(mach, half, gamma);
  const beta = field.flow.shockAngle;
  const k = shockEntropy(beta);
  const cp = gamma / (gamma - 1);
  const vMax = Math.sqrt(2 * (cp + 0.5 * gamma * mach * mach));
  const y0 = x0 * Math.tan(half);
  const h = (x0 * Math.tan(beta) - y0) / (Math.sin(phi) - Math.cos(phi) * Math.tan(beta));
  const points = Array.from({ length: count + 1 }, (_, j) => {
    const x = x0 + ((h * j) / count) * Math.cos(phi);
    const y = y0 + ((h * j) / count) * Math.sin(phi);
    const c = field.at(Math.min(Math.max(Math.atan2(y, x), half), beta));
    const v = c.speed * vMax;
    const rho = ((0.5 * (vMax * vMax - v * v)) / (cp * k)) ** (1 / (gamma - 1));
    return stateOf({ x, y, p: k * rho ** gamma, theta: c.flowAngle, k });
  });
  return { points, shockAngle: beta };
}

/**
 * The wall's pressure drag from the line's foot to the body's end, the
 * pressure there extrapolated from the last two wall points: the
 * trapezoid of (p - 1) over r^2, over the dynamic pressure and r(end)^2.
 */
function drag(wall: readonly { x: number; p: number }[]) {
  const a = wall[wall.length - 2]!;
  const b = wall[wall.length - 1]!;
  const closed = [...wall, { x: end, p: b.p + ((b.p - a.p) * (end - b.x)) / (b.x - a.x) }];
  let sum = 0;
  for (let i = 1; i < closed.length; i++) {
    const p = closed[i - 1]!;
    const q = closed[i]!;
    sum += 0.5 * (p.p - 1 + (q.p - 1)) * (radius(q.x) ** 2 - radius(p.x) ** 2);
  }
  return sum / (0.5 * gamma * mach * mach * radius(end) ** 2);
}

it('V3 as registered', () => {
  const start = coneLine(0.5, 90 * deg, 400);
  const profile = { radius, scale: 1, end, breakpoints: [xc, x1] };
  const rows: {
    n: number;
    wallEnd: number;
    formed: { x: number; y: number } | null;
    merged: { x: number; y: number } | null;
    shortfall: number;
    inserted: number;
    embeddedPoints: number;
    massBalance: number;
    penetration: number;
    drag: number;
  }[] = [];
  const failures: { n: number; error: string }[] = [];
  for (const n of resolutions) {
    try {
      const s = characteristicsFromShocked(profile, start, { mach, gamma, intervals: n, reseed: true });
      const row = {
        n,
        wallEnd: s.wall[s.wall.length - 1]!.x,
        formed: s.formed,
        merged: s.merged,
        shortfall: s.shortfall,
        inserted: s.inserted,
        embeddedPoints: s.embedded.length,
        massBalance: s.massBalance,
        penetration: s.penetration,
        drag: drag(s.wall),
      };
      rows.push(row);
      console.log(JSON.stringify(row));
    } catch (err) {
      failures.push({ n, error: String(err) });
      console.log(`n ${n}: ${String(err)}`);
    }
  }
  const byN = (n: number) => rows.find((r) => r.n === n);
  const complete =
    failures.length === 0 &&
    rows.length === resolutions.length &&
    rows.every((r) => r.wallEnd > 5.5 && r.formed !== null && r.merged !== null && r.shortfall >= 0);
  // Least-squares slope of ln(mass balance) against ln(1/n).
  let massOrder: number | null = null;
  if (complete) {
    const xs = rows.map((r) => Math.log(1 / r.n));
    const ys = rows.map((r) => Math.log(r.massBalance));
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    let sxy = 0;
    let sxx = 0;
    for (let i = 0; i < xs.length; i++) {
      sxy += (xs[i]! - mx) * (ys[i]! - my);
      sxx += (xs[i]! - mx) ** 2;
    }
    massOrder = sxy / sxx;
  }
  const d1 = byN(1280)?.drag;
  const d2 = byN(2560)?.drag;
  const d3 = byN(5120)?.drag;
  const dragChange =
    d2 !== undefined && d3 !== undefined ? Math.abs(d3 - d2) / Math.abs(d3) : null;
  const dragOrder =
    d1 !== undefined && d2 !== undefined && d3 !== undefined
      ? Math.log2((d1 - d2) / (d2 - d3))
      : null;
  const within = (q: number | null) => q !== null && q > 0.8 && q < 3;
  const conditions = {
    1: { complete, failures },
    2: {
      mass2560: byN(2560)?.massBalance ?? null,
      mass5120: byN(5120)?.massBalance ?? null,
      limit: 3.5e-5,
      pass: complete && byN(2560)!.massBalance < 3.5e-5 && byN(5120)!.massBalance < 3.5e-5,
    },
    3: { massOrder, pass: within(massOrder) },
    4: {
      dragChange,
      dragOrder,
      pass: complete && dragChange !== null && dragChange < 3.5e-5 && within(dragOrder),
    },
  };
  const pass = complete && conditions[2].pass && conditions[3].pass && conditions[4].pass;
  const verdict = { pass, conditions };
  console.log(JSON.stringify(verdict));
  if (process.env.V3_OUT) {
    writeFileSync(process.env.V3_OUT, `${JSON.stringify({ verdict, rows }, null, 1)}\n`);
  }
});
