// W6 third march, V1 as registered (README section 9), with its
// diagnostics. A concave 5 deg turn at Mach 2 on a cylinder of radius 1e4
// turn lengths, the turn a circular arc of length 1 from x = 1, straight
// after it to x = 13; the starting line vertical at x = 0.5 in the free
// stream, 10 high, its top a Mach wave (the march's "shock", of zero
// strength). The registered pair is n = 800 and 1600 (24 C+ lines on the
// turn on the coarser). Diagnostics: n = 3200 as well, and the same three
// on the planar network (no axisymmetric terms). Writes V1_OUT (JSON):
// every row and the registered verdict. It asserts nothing: the verdict is
// recorded, not enforced, until the coordinator rules (README section 9).
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { characteristicsFromShocked } from '../../../../src/validation/characteristics-shocked';
import { machFromPrandtlMeyer, prandtlMeyer } from '../../../../src/validation/gas-dynamics';

const gamma = 1.4;
const deg = Math.PI / 180;

function concaveTurn(intervals: number, planar: boolean) {
  const mach = 2;
  const turn = 5 * deg;
  const r0 = 1e4;
  const x0 = 1;
  const rc = 1 / turn;
  const xArc = rc * Math.sin(turn);
  const radius = (x: number) => {
    if (x <= x0) return r0;
    if (x <= x0 + xArc) return r0 + (rc - Math.sqrt(rc * rc - (x - x0) ** 2));
    return r0 + (rc * (1 - Math.cos(turn)) + (x - x0 - xArc) * Math.tan(turn));
  };
  const profile = { radius, scale: 1, end: x0 + 12, breakpoints: [x0, x0 + xArc] };
  const u = mach * Math.sqrt(gamma);
  const points = Array.from({ length: 41 }, (_, k) => ({
    x: 0.5,
    y: r0 + (10 * k) / 40,
    rho: 1,
    u,
    v: 0,
    p: 1,
  }));
  const start = { points, shockAngle: Math.asin(1 / mach) };
  const solution = characteristicsFromShocked(profile, start, {
    mach,
    gamma,
    intervals,
    network: { planar },
  });
  return { solution, x0, xArc, rc, r0, turn, mach };
}

/**
 * The planar simple wave's first crossing of neighbouring C+
 * characteristics from the arc (the least x of their crossings; on this
 * arc the crossings move downstream along the turn, so it is the first
 * line's, the envelope's start).
 */
function envelopeStart(x0: number, r0: number, rc: number, turn: number, mach: number) {
  const nu0 = prandtlMeyer(mach, gamma);
  const line = (phi: number) => {
    const m = machFromPrandtlMeyer(nu0 - phi, gamma);
    const alpha = phi + Math.asin(1 / m);
    return {
      x: x0 + rc * Math.sin(phi),
      y: r0 + rc * (1 - Math.cos(phi)),
      c: Math.cos(alpha),
      s: Math.sin(alpha),
    };
  };
  let best = { x: Infinity, y: 0 };
  const steps = 2000;
  for (let k = 0; k < steps; k++) {
    const a = line((turn * k) / steps);
    const b = line((turn * (k + 1)) / steps);
    const det = a.c * -b.s - a.s * -b.c;
    const t = ((b.x - a.x) * -b.s - (b.y - a.y) * -b.c) / det;
    const x = a.x + t * a.c;
    if (x < best.x) best = { x, y: a.y + t * a.s };
  }
  return best;
}

function row(n: number, planar: boolean) {
  const t = concaveTurn(n, planar);
  const nu = prandtlMeyer(t.mach, gamma) - t.turn;
  const m2 = machFromPrandtlMeyer(nu, gamma);
  const half = (gamma - 1) / 2;
  const pExact = ((1 + half * t.mach ** 2) / (1 + half * m2 ** 2)) ** (gamma / (gamma - 1));
  // The wall pressure 0.5 behind the turn's end.
  const xp = t.x0 + t.xArc + 0.5;
  const w = t.solution.wall;
  let k = 0;
  while (k < w.length - 2 && w[k + 1]!.x < xp) k++;
  const p = w[k]!.p + ((w[k + 1]!.p - w[k]!.p) * (xp - w[k]!.x)) / (w[k + 1]!.x - w[k]!.x);
  const env = envelopeStart(t.x0, t.r0, t.rc, t.turn, t.mach);
  const formed = t.solution.formed;
  const e = t.solution.embedded;
  const last = e[e.length - 1];
  return {
    n,
    planar,
    linesOnTurn: w.filter((q) => q.x > t.x0 && q.x < t.x0 + t.xArc).length,
    wallEnd: w[w.length - 1]!.x,
    pressure: p,
    pressureExact: pExact,
    pressureError: Math.abs(p / pExact - 1),
    formed: formed && { x: formed.x, y: formed.y - t.r0 },
    envelope: { x: env.x, y: env.y - t.r0 },
    formationError: formed ? Math.hypot(formed.x - env.x, formed.y - env.y) : null,
    embeddedPoints: e.length,
    lastShock: last && {
      x: last.x,
      y: last.y - t.r0,
      betaDeg: last.beta / deg,
      pressureRatio: last.pressureRatio,
    },
    merged: t.solution.merged,
    massBalance: t.solution.massBalance,
  };
}

it('V1 as registered, and its diagnostics', () => {
  const rows = [];
  for (const planar of [false, true]) {
    for (const n of [800, 1600, 3200]) {
      const r = row(n, planar);
      rows.push(r);
      console.log(JSON.stringify(r));
    }
  }
  const coarse = rows[0]!;
  const fine = rows[1]!;
  const order = (a: number | null, b: number | null) =>
    a !== null && b !== null ? Math.log2(a / b) : null;
  const pressureOrder = order(coarse.pressureError, fine.pressureError);
  const formationOrder = order(coarse.formationError, fine.formationError);
  const within = (q: number | null) => q !== null && q > 0.8 && q < 3;
  const verdict = {
    pair: [coarse.n, fine.n],
    linesOnTurnCoarse: coarse.linesOnTurn,
    a: { error: fine.pressureError, limit: 5e-4, pass: fine.pressureError < 5e-4 },
    b: {
      error: fine.formationError,
      limit: 0.05,
      pass: fine.formationError !== null && fine.formationError < 0.05,
    },
    c: {
      pressureOrder,
      formationOrder,
      pass: within(pressureOrder) && within(formationOrder),
    },
  };
  console.log(JSON.stringify(verdict));
  if (process.env.V1_OUT) {
    writeFileSync(process.env.V1_OUT, `${JSON.stringify({ verdict, rows }, null, 1)}\n`);
  }
});
