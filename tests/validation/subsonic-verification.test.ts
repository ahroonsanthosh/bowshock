import { describe, expect, it } from 'vitest';
import {
  CP_STATION_TOLERANCE,
  far800Contained,
  gridConvergenceScaled,
  interpolateWall,
  judgeRung,
  linearisedConeCylinderCp,
  orderingCheck,
  pointwiseBand,
  slenderConeCylinderCp,
  stationCpAllowance,
  SUBSONIC_SCALE,
  subsonicScale,
  totalPressureRatio,
  wallLossTolerance,
  ZERO_DRAG_TOLERANCE,
  type RungInput,
  type RungLevel,
} from '../../src/validation/subsonic-verification';
import { domainAllowance, tailFactor } from '../../src/verification/domain-allowance';

// Synthetic families only: no solver value and no measured value (0014
// 10.7 (y) is checked here before any subsonic grid is solved).

describe('R3, the linearised cone-cylinder in closed form', () => {
  it('agrees with the slender-body log form to fourth order in tau', () => {
    // The difference over tau^4 is the same at tau = 0.01 and 0.003 (within
    // 1%), at three stations of a 10-radius cone at Mach 0.6.
    for (const x of [2, 5, 8]) {
      const scaled = [0.01, 0.003].map(
        (tau) =>
          (linearisedConeCylinderCp(tau, 10, 0.6, x).cp - slenderConeCylinderCp(tau, 10, 0.6, x)) /
          tau ** 4,
      );
      expect(Math.abs(scaled[0]! / scaled[1]! - 1), `x ${x}`).toBeLessThan(0.01);
      // And the two agree to 1% of Cp at tau = 0.01 ahead of the shoulder's log.
      if (x < 8) {
        const lin = linearisedConeCylinderCp(0.01, 10, 0.6, x).cp;
        expect(Math.abs(lin / slenderConeCylinderCp(0.01, 10, 0.6, x) - 1)).toBeLessThan(0.01);
      }
    }
  });

  it('keeps the tangency condition v = tau on the surface, to O(tau^3)', () => {
    for (const tau of [0.1225, 0.03]) {
      const { v } = linearisedConeCylinderCp(tau, 8.169, 0.8, 4);
      expect(Math.abs(v / tau - 1)).toBeLessThan(2 * tau * tau + 1e-3);
    }
  });

  it('refuses a supersonic stream and a station off the cone', () => {
    expect(() => linearisedConeCylinderCp(0.1, 8, 1.1, 4)).toThrow(/Mach 0 to 1/);
    expect(() => linearisedConeCylinderCp(0.1, 8, 0.8, 9)).toThrow(/on the cone/);
  });

  it('on the 7 deg cone at Mach 0.6 the pressure falls along the cone towards the shoulder', () => {
    const tau = Math.tan(((6 + 59 / 60) * Math.PI) / 180);
    const L = 1 / tau;
    const cps = [0.1, 0.3, 0.5, 0.7, 0.9].map(
      (f) => linearisedConeCylinderCp(tau, L, 0.6, f * L).cp,
    );
    for (let k = 0; k + 1 < cps.length; k++) expect(cps[k + 1]!).toBeLessThan(cps[k]!);
    expect(cps[0]!).toBeGreaterThan(0);
  });
});

describe('the scale, the loss tolerance and the station tools', () => {
  it('S = max(|CD|, 0.01)', () => {
    expect(subsonicScale(3e-4)).toBe(SUBSONIC_SCALE);
    expect(subsonicScale(-0.05)).toBe(0.05);
  });

  it('a wall loss d of p0 is a Cp error of d (p / p_inf) / (gamma M^2 / 2)', () => {
    // At Mach 0.6 and p = p_inf the tolerance is 5e-4 x 0.7 x 0.36 = 1.26e-4.
    expect(wallLossTolerance(0.6, 1)).toBeCloseTo(1.26e-4, 8);
    expect(wallLossTolerance(0.9, 1)).toBeCloseTo(CP_STATION_TOLERANCE * 0.7 * 0.81, 10);
    expect(totalPressureRatio(1)).toBeCloseTo(1.2 ** 3.5, 12);
  });

  it('interpolates the wall linearly and holds the first face ahead of it', () => {
    const wall = [
      { x: 1, cp: 0.1 },
      { x: 3, cp: 0.3 },
      { x: 2, cp: 0.2 },
    ];
    expect(interpolateWall(wall, 2.5)).toBeCloseTo(0.25, 12);
    expect(interpolateWall(wall, 0.2)).toBe(0.1);
  });

  it('pointwise bands: monotone, oscillatory, not shrinking, too small', () => {
    const m = pointwiseBand([1 + 4e-4, 1 + 1e-4, 1 + 2.5e-5], 1e-9);
    expect(m.kind).toBe('monotone');
    if (m.kind === 'monotone') {
      expect(m.order).toBeCloseTo(2, 6);
      expect(m.band).toBeCloseTo((1.25 * 7.5e-5) / 3, 12);
    }
    const o = pointwiseBand([1, 1.001, 1.0005], 1e-9);
    expect(o.kind).toBe('oscillatory');
    expect(o.band).toBeCloseTo(1e-3, 12);
    expect(pointwiseBand([1, 1.001, 1.002], 1e-9)).toMatchObject({ kind: 'not-shrinking' });
    expect(pointwiseBand([1, 1 + 1e-10, 1 + 2e-10], 1e-9)).toMatchObject({
      kind: 'too-small',
      band: 2e-9,
    });
  });

  it('the shifted procedure gives the unshifted family’s band and extrapolation', () => {
    // A second-order family converging to a near-zero value.
    const values = [1, 2, 4, 8].map((r) => 3e-5 + 4e-4 / r ** 2);
    const est = gridConvergenceScaled(values, 1e-7);
    expect(est.kind).toBe('monotone');
    if (est.kind !== 'monotone') return;
    expect(est.value).toBeCloseTo(values[3]!, 15);
    expect(est.extrapolated).toBeCloseTo(3e-5, 9);
    expect(est.uncertainty).toBeCloseTo((1.25 * (4e-4 / 16 - 4e-4 / 64)) / 3, 12);
  });

  it('the station allowance is the drag’s allowance plus T times the deviation from a uniform shift', () => {
    const own = [0.1, 0.09, 0.08];
    const larger = [0.1006, 0.09107, 0.0805];
    const out = stationCpAllowance(own, larger, 1e-3, 4, 1e-6);
    // Changes 6e-4, 1.07e-3, 5e-4; mean 7.233e-4.
    expect(out[0]).toBeCloseTo(1e-3 + 4 * Math.abs(6e-4 - 7.2333e-4) + 1e-6, 7);
    expect(out[1]).toBeCloseTo(1e-3 + 4 * Math.abs(1.07e-3 - 7.2333e-4) + 1e-6, 7);
  });
});

/** A rung whose family converges at second order to `limit`, with a tiny wall loss falling at first order. */
function rung(
  over: Partial<RungInput> & { limit: number; mach: number; stations?: number },
): RungInput {
  const { limit } = over;
  const n = over.stations ?? 3;
  const levels: RungLevel[] = [1, 2, 4, 8].map((r) => ({
    refinement: r,
    drag: limit + 4e-4 / r ** 2,
    noise: 1e-7,
    stationCp: Array.from({ length: n }, (_, j) => 0.1 - 0.02 * j + 1e-3 / r ** 2),
    loss: { ahead: 4e-5 / r, pressureRatio: 1, behind: 1e-4 / r, supersonicCells: 0, maxMach: 0.9 },
  }));
  const far = domainAllowance([0.1 - 2e-5, 0.1, 0.1 + 4e-6], [100.6, 224.2, 408.7], 1e-7);
  const cyl = domainAllowance([0.1, 0.1 + 1e-9, 0.1 + 1e-9], [5, 10, 20], 1e-7);
  const stationFar = far.kind === 'refused' ? null : Array.from({ length: n }, () => far.allowance);
  const { mach: machOf, ...rest } = over;
  return {
    mach: machOf,
    levels,
    farField: far,
    cylinder: cyl,
    stationFar,
    floor: null,
    linear: Array.from({ length: n }, (_, j) => 0.1 - 0.02 * j),
    ...rest,
  };
}

describe('item 5: the rung verdicts', () => {
  it('Mach 0.6 passes the exact zero-drag check and sets the floor at twice the larger miss', () => {
    const v = judgeRung(rung({ mach: 0.6, limit: 5e-5 }));
    expect(v.criteria.a.status).toBe('pass');
    expect(v.criteria.b.status).toBe('pass');
    expect(v.criteria.c.status).toBe('pass');
    expect(v.criteria.e.status).toBe('pass');
    expect(v.criteria.f.status).toBe('pass');
    expect(v.criteria.r5.status).toBe('not-applicable');
    // |CD_r8| = 5e-5 + 6.25e-6; the extrapolation 5e-5; the floor twice the larger.
    expect(v.floorSet).toBeCloseTo(2 * (5e-5 + 4e-4 / 64), 12);
    expect(v.parts.floor).toBe(v.floorSet);
    expect(v.verdict).toBe('pass');
    expect(v.band).toBeCloseTo(
      v.parts.grids! + v.parts.floor + v.parts.farField! + v.parts.cylinder!,
      15,
    );
  });

  it('Mach 0.6 fails the exact check when the finest drag exceeds 2e-4 plus the band', () => {
    const v = judgeRung(rung({ mach: 0.6, limit: 3e-3 }));
    expect(v.criteria.b.status).toBe('fail');
    expect(v.verdict).toBe('fail');
    expect(v.floorSet).toBeNull();
    // With the pocket diagnostic showing the bubble, the detail says so but the rung still fails.
    const pocket = rung({ mach: 0.6, limit: 3e-3 });
    const levels = pocket.levels.map((l) => ({
      ...l,
      loss: { ...l.loss, supersonicCells: 3, behind: 10 * l.loss.ahead },
    }));
    const w = judgeRung({ ...pocket, levels });
    expect(w.criteria.b.status).toBe('fail');
    expect(w.criteria.b.detail).toMatch(/bubble/);
  });

  it('a confidently negative drag fails the sign check', () => {
    const v = judgeRung(rung({ mach: 0.8, limit: -2e-3, floor: 1e-5 }));
    expect(v.criteria.b.status).toBe('not-applicable');
    expect(v.criteria.c.status).toBe('fail');
    expect(v.verdict).toBe('fail');
  });

  it('a station band above 5e-4 is reported as too wide for the use, above 2e-3 it fails', () => {
    const wide = rung({ mach: 0.8, limit: 1e-3, floor: 1e-5 });
    const levels = wide.levels.map((l) => ({
      ...l,
      stationCp: l.stationCp.map((cp) => cp + 4e-3 / l.refinement),
    }));
    const v = judgeRung({ ...wide, levels });
    expect(v.criteria.d.status).toBe('reported');
    expect(v.verdict).toBe('pass, band too wide for the use');
    const worse = wide.levels.map((l) => ({
      ...l,
      stationCp: l.stationCp.map((cp) => cp + 2e-2 / l.refinement),
    }));
    expect(judgeRung({ ...wide, levels: worse }).criteria.d.status).toBe('fail');
  });

  it('a wall loss above the tolerance, or one not falling at order 0.8, fails (e)', () => {
    const base = rung({ mach: 0.6, limit: 5e-5 });
    const big = base.levels.map((l) => ({ ...l, loss: { ...l.loss, ahead: 2e-3 / l.refinement } }));
    expect(judgeRung({ ...base, levels: big }).criteria.e.status).toBe('fail');
    const flat = base.levels.map((l) => ({ ...l, loss: { ...l.loss, ahead: 1e-6 } }));
    expect(judgeRung({ ...base, levels: flat }).criteria.e.status).toBe('fail');
  });

  it('an unresolved family or a refused allowance fails', () => {
    const base = rung({ mach: 0.8, limit: 1e-3, floor: 1e-5 });
    // Orders that disagree: the coarse triple converges fast, the fine one does not shrink.
    const steps = [4e-4, 2e-4, 1.9e-4, 1e-4];
    const osc = base.levels.map((l, k) => ({ ...l, drag: 1e-3 + steps[k]! }));
    const v = judgeRung({ ...base, levels: osc });
    expect(v.criteria.a.status).toBe('fail');
    const refused = domainAllowance([0.1, 0.1 + 1e-3, 0.1 + 1.8e-3], [100.6, 224.2, 408.7], 1e-7);
    expect(refused.kind).toBe('refused');
    expect(judgeRung({ ...base, farField: refused, stationFar: null }).criteria.f.status).toBe(
      'fail',
    );
  });

  it('R5: within the sum of the bands plus the margin passes; a wide code band is no reference', () => {
    const base = rung({ mach: 0.901, limit: 2e-3, floor: 1e-5 });
    const v = judgeRung({ ...base, code: { drag: 2.3e-3, band: 2e-4, levels: 3 } });
    expect(v.criteria.r5.status).toBe('pass');
    const far = judgeRung({ ...base, code: { drag: 4e-3, band: 2e-4, levels: 3 } });
    expect(far.criteria.r5.status).toBe('fail');
    const wide = judgeRung({ ...base, code: { drag: 2e-3, band: 2e-3, levels: 3 } });
    expect(wide.criteria.r5.status).toBe('not-applicable');
  });

  it('the ordering across rungs: the drag must not fall as Mach rises beyond the bands', () => {
    const ok = orderingCheck([
      { mach: 0.6, drag: 5e-5, band: 1e-4 },
      { mach: 0.8, drag: 1e-3, band: 2e-4 },
      { mach: 0.991, drag: 0.06, band: 1e-3 },
    ]);
    expect(ok.ok).toBe(true);
    const bad = orderingCheck([
      { mach: 0.6, drag: 2e-3, band: 1e-4 },
      { mach: 0.8, drag: 1e-3, band: 2e-4 },
      { mach: 0.991, drag: 0.095, band: 1e-3 },
    ]);
    expect(bad.ok).toBe(false);
    expect(bad.violations).toHaveLength(2);
  });

  it('the 800-radius test: the moved family’s allowance must contain C(800) - C(224.2)', () => {
    const values = [0.1026, 0.1035, 0.10347] as const;
    const a = domainAllowance(values, [100.6, 224.2, 408.7], 3.5e-6 / 0.1035);
    expect(a.kind).toBe('turning');
    const T = tailFactor(224.2, 408.7);
    const inside = far800Contained(a, values[1], values[1] - 1e-4);
    expect(inside.contained).toBe(true);
    const outside = far800Contained(a, values[1], values[1] - (3e-5 + T * 9e-4 + 1e-3));
    expect(outside.contained).toBe(false);
    expect(ZERO_DRAG_TOLERANCE).toBe(2e-4);
  });
});
