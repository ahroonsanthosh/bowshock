// W6 third march, V1b as registered (README section 9.2), run once: the
// concave 5 deg turn at Mach 2 on the planar network, the wall at y = 1,
// the starting line placed so the arc's start lies halfway between two
// wall points at every resolution, n = 800, 1600, 3200 and 6400. Writes
// V1B_OUT (JSON): every resolution's numbers and the verdict by the four
// registered conditions. It asserts nothing: the verdict is recorded.
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { characteristicsFromShocked } from '../../../../src/validation/characteristics-shocked';
import { machFromPrandtlMeyer, prandtlMeyer } from '../../../../src/validation/gas-dynamics';

const gamma = 1.4;
const mach = 2;
const turn = (5 * Math.PI) / 180;
const rc = 1 / turn;
const x0 = 1;
const xArc = rc * Math.sin(turn);
const mu0 = Math.asin(1 / mach);
const resolutions = [800, 1600, 3200, 6400];

/** The wall: y = 1, then the arc (without cancellation), then straight. */
function radius(x: number) {
  if (x <= x0) return 1;
  if (x <= x0 + xArc) {
    const d = x - x0;
    return 1 + (d * d) / (rc + Math.sqrt(rc * rc - d * d));
  }
  return 1 + 2 * rc * Math.sin(turn / 2) ** 2 + (x - x0 - xArc) * Math.tan(turn);
}

/** The wall-point spacing in the free stream and the starting line's x. */
function placement(n: number) {
  const m = n / 2;
  const delta = 10 / Math.tan(mu0) / m;
  const K = Math.floor(0.5 / delta);
  return { delta, xs: x0 - (K + 0.5) * delta };
}

/** The envelope's start in closed form (README section 9.2, measure (b)). */
function envelopeStart() {
  const dmu = (1 + ((gamma - 1) / 2) * mach * mach) / (mach * mach - 1);
  const t0 = (rc * Math.sin(mu0)) / (1 + dmu);
  return { x: x0 + t0 * Math.cos(mu0), y: 1 + t0 * Math.sin(mu0), t0 };
}

function pressureExact() {
  const m2 = machFromPrandtlMeyer(prandtlMeyer(mach, gamma) - turn, gamma);
  const half = (gamma - 1) / 2;
  return ((1 + half * mach * mach) / (1 + half * m2 * m2)) ** (gamma / (gamma - 1));
}

function run(n: number) {
  const { delta, xs } = placement(n);
  const profile = { radius, scale: 1, end: 13, breakpoints: [x0, x0 + xArc] };
  const u = mach * Math.sqrt(gamma);
  const points = Array.from({ length: 41 }, (_, k) => ({
    x: xs,
    y: 1 + (10 * k) / 40,
    rho: 1,
    u,
    v: 0,
    p: 1,
  }));
  const start = { points, shockAngle: mu0 };
  const solution = characteristicsFromShocked(profile, start, {
    mach,
    gamma,
    intervals: n,
    network: { planar: true },
  });
  const w = solution.wall;
  const xp = x0 + xArc + 0.5;
  let k = 0;
  while (k < w.length - 2 && w[k + 1]!.x < xp) k++;
  const p = w[k]!.p + ((w[k + 1]!.p - w[k]!.p) * (xp - w[k]!.x)) / (w[k + 1]!.x - w[k]!.x);
  const pPM = pressureExact();
  const env = envelopeStart();
  const formed = solution.formed;
  // The realized wall phase: the wall points either side of the arc's start.
  let j = 0;
  while (j < w.length - 1 && w[j + 1]!.x <= x0) j++;
  const e = solution.embedded;
  const last = e[e.length - 1];
  return {
    n,
    delta,
    xs,
    wallEnd: w[w.length - 1]!.x,
    bracketPressure: [w[k]!.x, w[k + 1]!.x],
    phase: { before: (x0 - w[j]!.x) / delta, after: (w[j + 1]!.x - x0) / delta },
    pressure: p,
    pressureExact: pPM,
    pressureError: Math.abs(p / pPM - 1),
    formed: formed && { x: formed.x, y: formed.y },
    envelope: env,
    formationError: formed ? Math.hypot(formed.x - env.x, formed.y - env.y) : null,
    embeddedPoints: e.length,
    lastShock: last && {
      x: last.x,
      y: last.y,
      betaDeg: (last.beta * 180) / Math.PI,
      pressureRatio: last.pressureRatio,
    },
  };
}

/** Least-squares slope of ln(error) against ln(delta). */
function order(rows: { delta: number; error: number }[]) {
  const xs = rows.map((r) => Math.log(r.delta));
  const ys = rows.map((r) => Math.log(r.error));
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < xs.length; i++) {
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sxx += (xs[i]! - mx) ** 2;
  }
  return sxy / sxx;
}

it('V1b as registered', () => {
  const rows: ReturnType<typeof run>[] = [];
  const failures: { n: number; error: string }[] = [];
  for (const n of resolutions) {
    try {
      const r = run(n);
      rows.push(r);
      console.log(JSON.stringify(r));
    } catch (err) {
      failures.push({ n, error: String(err) });
      console.log(`n ${n}: ${String(err)}`);
    }
  }
  const complete =
    failures.length === 0 &&
    rows.length === resolutions.length &&
    rows.every((r) => r.formed !== null);
  const finest = rows[rows.length - 1];
  const a = complete
    ? order(rows.map((r) => ({ delta: r.delta, error: r.pressureError })))
    : null;
  const b = complete
    ? order(rows.map((r) => ({ delta: r.delta, error: r.formationError! })))
    : null;
  const within = (q: number | null) => q !== null && q > 0.8 && q < 3;
  const conditions = {
    1: { complete, failures },
    2: {
      error: finest?.pressureError ?? null,
      limit: 5e-4,
      pass: complete && finest!.pressureError < 5e-4,
    },
    3: {
      error: finest?.formationError ?? null,
      limit: 0.05,
      pass: complete && finest!.formationError! < 0.05,
    },
    4: { pressureOrder: a, formationOrder: b, pass: within(a) && within(b) },
  };
  const pass = complete && conditions[2].pass && conditions[3].pass && conditions[4].pass;
  const verdict = { pass, conditions };
  console.log(JSON.stringify(verdict));
  if (process.env.V1B_OUT) {
    writeFileSync(process.env.V1B_OUT, `${JSON.stringify({ verdict, rows }, null, 1)}\n`);
  }
});
