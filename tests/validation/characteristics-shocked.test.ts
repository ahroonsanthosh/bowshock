import { describe, expect, it } from 'vitest';
import { characteristicNetwork, type Point } from '../../src/validation/characteristics';
import {
  behindEmbeddedShock,
  embeddedShockPoint,
} from '../../src/validation/characteristics-shocked';
import { obliqueShock } from '../../src/validation/gas-dynamics';

const gamma = 1.4;
const deg = Math.PI / 180;

describe('the embedded shock (W6 README section 9)', () => {
  it('V0: with the states of an exact oblique shock either side, the unit process returns them', () => {
    // Planar flow (no axisymmetric terms), uniform on each side: the new
    // point must lie where the C- line from a meets the shock, with the
    // shock's angle and both states unchanged, to 1e-10.
    const profile = { radius: () => 0, scale: 1, end: 100, breakpoints: [] };
    for (const mach of [2, 3]) {
      const net = characteristicNetwork(profile, mach, gamma, { planar: true });
      for (const turn of [2, 5, 10]) {
        const exact = obliqueShock(mach, turn * deg, gamma);
        const beta = exact.beta;
        const up: Point = { x: 0, y: 1, theta: 0, p: 1, k: 1, psi: 0 };
        const p = exact.pressureRatio;
        const rho = exact.densityRatio;
        const down: Point = { ...up, theta: turn * deg, p, k: p / rho ** gamma };
        const tag = `M ${mach}, ${turn} deg`;
        // The relations themselves.
        const behind = behindEmbeddedShock(net, gamma, up, beta);
        expect(Math.abs(behind.p / p - 1), tag).toBeLessThan(1e-12);
        expect(Math.abs(behind.theta - turn * deg), tag).toBeLessThan(1e-12);
        expect(Math.abs(behind.k / down.k - 1), tag).toBeLessThan(1e-12);
        // The old shock point s and the old line's segments either side of it.
        const s = { x: 0, y: 1, beta, up, down };
        const muUp = net.derived(up).mu;
        const muDown = net.derived(down).mu;
        const h = 0.2;
        const upA: Point = { ...up, x: -h * Math.cos(-muUp), y: 1 - h * Math.sin(-muUp) };
        const downB: Point = {
          ...down,
          x: h * Math.cos(down.theta - muDown),
          y: 1 + h * Math.sin(down.theta - muDown),
        };
        // The new C- line comes down from a to the shock at distance d along it.
        const d = 0.05;
        const target = { x: d * Math.cos(beta), y: 1 + d * Math.sin(beta) };
        const e = 0.03;
        const a: Point = {
          ...up,
          x: target.x - e * Math.cos(-muUp),
          y: target.y - e * Math.sin(-muUp),
        };
        const next = embeddedShockPoint(net, gamma, s, a, upA, downB, () => 1);
        expect(Math.abs(next.beta - beta), tag).toBeLessThan(1e-10);
        expect(Math.abs(next.x - target.x), tag).toBeLessThan(1e-10);
        expect(Math.abs(next.y - target.y), tag).toBeLessThan(1e-10);
        expect(Math.abs(next.up.p - 1), tag).toBeLessThan(1e-10);
        expect(Math.abs(next.up.theta), tag).toBeLessThan(1e-10);
        expect(Math.abs(next.down.p / p - 1), tag).toBeLessThan(1e-10);
        expect(Math.abs(next.down.theta - turn * deg), tag).toBeLessThan(1e-10);
        expect(Math.abs(next.down.k / down.k - 1), tag).toBeLessThan(1e-10);
      }
    }
  });
});
