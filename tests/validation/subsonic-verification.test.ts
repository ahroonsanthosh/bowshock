import { describe, expect, it } from 'vitest';
import {
  applyOrdering,
  CP_STATION_TOLERANCE,
  far800Contained,
  gridConvergenceScaled,
  interpolateWall,
  judgeRung,
  linearisedConeCylinderCp,
  nearSonicHold,
  orderingCheck,
  pointwiseBand,
  rowGate,
  rowsKeptOut,
  slenderConeCylinderCp,
  stationCpAllowance,
  SUBSONIC_SCALE,
  subsonicScale,
  totalPressureRatio,
  wallLossTolerance,
  ZERO_DRAG_BAND_CAP,
  ZERO_DRAG_TOLERANCE,
  type RungInput,
  type RungLevel,
} from '../../src/validation/subsonic-verification';
import { domainAllowance, tailFactor } from '../../src/verification/domain-allowance';
import { gridConvergence } from '../../src/verification/grid-convergence';

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

  it('the procedure on the scale S gives the family’s band and extrapolation, its noise acting on S', () => {
    // A second-order family converging to a near-zero value.
    const values = [1, 2, 4, 8].map((r) => 3e-5 + 4e-4 / r ** 2);
    const est = gridConvergenceScaled(values, 1e-7);
    expect(est.kind).toBe('monotone');
    if (est.kind !== 'monotone') return;
    expect(est.value).toBeCloseTo(values[3]!, 15);
    expect(est.extrapolated).toBeCloseTo(3e-5, 9);
    expect(est.uncertainty).toBeCloseTo((1.25 * (4e-4 / 16 - 4e-4 / 64)) / 3, 12);
    // Changes of 1e-8 on a drag near 1e-4: measurable on the value (1e-7 x
    // 1e-4 x 10 = 1e-10), too small on S (1e-7 x 0.01 x 10 = 1e-8).
    const tiny = [1e-4 + 1.6e-8, 1e-4 + 8e-9, 1e-4 + 4e-9, 1e-4 + 2e-9];
    expect(gridConvergence(tiny, { noise: 1e-7, orderTolerance: 0.5 }).kind).toBe('monotone');
    expect(gridConvergenceScaled(tiny, 1e-7).kind).toBe('unresolved');
    // S is max(|CD|, 0.01), not |CD| + 0.01: a drag of 0.05 keeps its own scale.
    const big = [1, 2, 4, 8].map((r) => 0.05 + 4e-4 / r ** 2);
    expect(gridConvergenceScaled(big, 1e-7)).toEqual(
      gridConvergence(big, { noise: 1e-7, orderTolerance: 0.5, scale: 0.05 + 4e-4 }),
    );
  });

  it('the loss tolerance carries p_inf / p_wall: at twice the pressure, half the loss', () => {
    expect(wallLossTolerance(0.6, 2)).toBeCloseTo(wallLossTolerance(0.6, 1) / 2, 15);
    expect(wallLossTolerance(0.9, 0.8)).toBeCloseTo(wallLossTolerance(0.9, 1) / 0.8, 15);
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
  const stationCylinder =
    cyl.kind === 'refused' ? null : Array.from({ length: n }, () => cyl.allowance);
  const { mach: machOf, ...rest } = over;
  return {
    mach: machOf,
    levels,
    farField: far,
    cylinder: cyl,
    stationFar,
    stationCylinder,
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

  it('Mach 0.6 fails the exact check just past 2e-4 plus the band, and passes just inside', () => {
    // The band of this synthetic family does not depend on the limit, so
    // it is read off a passing verdict and the limit set against it.
    const probe = judgeRung(rung({ mach: 0.6, limit: 5e-5 }));
    const band = probe.band! - probe.parts.floor;
    const r8 = 4e-4 / 64;
    const over = judgeRung(rung({ mach: 0.6, limit: ZERO_DRAG_TOLERANCE + band - r8 + 1e-8 }));
    expect(Math.abs(over.value)).toBeGreaterThan(ZERO_DRAG_TOLERANCE + band);
    expect(over.criteria.b.status).toBe('fail');
    const under = judgeRung(rung({ mach: 0.6, limit: ZERO_DRAG_TOLERANCE + band - r8 - 1e-8 }));
    expect(under.criteria.b.status).toBe('pass');
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

  it('Mach 0.6: a procedure band above the cap fails (b), since a pass could not show the error', () => {
    const base = rung({ mach: 0.6, limit: 5e-5 });
    // A first-order family with changes of 8e-4: the finest band 1.25 x 2e-4, above the cap.
    const levels = base.levels.map((l) => ({ ...l, drag: 5e-5 + 1.6e-3 / l.refinement }));
    const v = judgeRung({ ...base, levels });
    expect(v.parts.grids!).toBeGreaterThan(ZERO_DRAG_BAND_CAP);
    expect(v.criteria.b.status).toBe('fail');
    expect(v.criteria.b.detail).toMatch(/cap/);
  });

  it('the station band carries the floor and the cylinder term: dropping either would pass a wide band', () => {
    const base = rung({ mach: 0.8, limit: 1e-3, floor: 4.5e-4 });
    const v = judgeRung(base);
    // Grid and domain parts are tiny here; the floor alone takes the station band past 5e-4.
    expect(v.stationBands.every((b) => b.band < 1e-4)).toBe(true);
    expect(v.criteria.d.status).toBe('reported');
    const noFloor = judgeRung({ ...base, floor: 1e-5 });
    expect(noFloor.criteria.d.status).toBe('pass');
    const wideCylinder = judgeRung({
      ...base,
      floor: 1e-5,
      stationCylinder: base.stationCylinder!.map(() => 6e-4),
    });
    expect(wideCylinder.criteria.d.status).toBe('reported');
    expect(judgeRung({ ...base, floor: 1e-5, stationCylinder: null }).criteria.d.status).toBe(
      'fail',
    );
  });

  it('a station whose changes do not shrink gets no band and fails (d)', () => {
    const base = rung({ mach: 0.8, limit: 1e-3, floor: 1e-5 });
    const levels = base.levels.map((l, k) => ({
      ...l,
      // Station 1 changes by 1e-5 at every refinement: no band by 0005,
      // though the sum of its changes (2e-5) is far inside the tolerance,
      // so only the rule fails it.
      stationCp: l.stationCp.map((cp, j) => (j === 1 ? 0.08 + 1e-5 * k * (1 + 0.1 * k) : cp)),
    }));
    const v = judgeRung({ ...base, levels });
    expect(v.stationBands[1]!.kind).toBe('not-shrinking');
    expect(v.stationBands[1]!.band).toBeLessThan(CP_STATION_TOLERANCE);
    expect(v.criteria.d.status).toBe('fail');
  });

  it('(e): a flat loss far below the tolerance needs no order; above it the order must be 0.8', () => {
    const base = rung({ mach: 0.6, limit: 5e-5 });
    const flatTiny = base.levels.map((l) => ({ ...l, loss: { ...l.loss, ahead: 1e-9 } }));
    expect(judgeRung({ ...base, levels: flatTiny }).criteria.e.status).toBe('pass');
    const flatBig = base.levels.map((l) => ({ ...l, loss: { ...l.loss, ahead: 5e-5 } }));
    expect(judgeRung({ ...base, levels: flatBig }).criteria.e.status).toBe('fail');
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
    const flat = base.levels.map((l) => ({ ...l, loss: { ...l.loss, ahead: 1e-5 } }));
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

  it('R5: within the procedure bands plus the margin passes; domain allowances do not enter; a wide or missing code band is no reference', () => {
    const base = rung({ mach: 0.901, limit: 2e-3, floor: 1e-5 });
    const v = judgeRung({ ...base, code: { drag: 2.3e-3, band: 2e-4, levels: 3 } });
    expect(v.criteria.r5.status).toBe('pass');
    const far = judgeRung({ ...base, code: { drag: 4e-3, band: 2e-4, levels: 3 } });
    expect(far.criteria.r5.status).toBe('fail');
    // A gap inside the full band (with a large far-field allowance) but
    // outside the procedure bands plus the margin fails: the codes share
    // the domain.
    const wideFar = {
      ...base,
      farField: {
        kind: 'turning' as const,
        allowance: 5e-3,
        changes: [1e-3, 1e-4] as const,
        measurability: 1e-9,
      },
      stationFar: base.stationFar!.map(() => 5e-3),
    };
    const g = judgeRung({ ...wideFar, code: { drag: 3.5e-3, band: 2e-4, levels: 3 } });
    expect(g.band!).toBeGreaterThan(Math.abs(g.value - 3.5e-3));
    expect(g.criteria.r5.status).toBe('fail');
    const wide = judgeRung({ ...base, code: { drag: 2e-3, band: 2e-3, levels: 3 } });
    expect(wide.criteria.r5.status).toBe('not-applicable');
    const none = judgeRung({ ...base, code: { drag: Number.NaN, band: null, levels: 3 } });
    expect(none.criteria.r5.status).toBe('not-applicable');
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
    expect(bad.violations[0]!.machs).toEqual([0.6, 0.8]);
    // The top rung: CD + band must lie below the Mach 1.0 estimate, so
    // 0.090 with a band of 0.005 violates (0.095 is not below 0.0932).
    const top = orderingCheck([{ mach: 0.991, drag: 0.09, band: 5e-3 }]);
    expect(top.ok).toBe(false);
    expect(top.violations[0]!.machs).toEqual([0.991]);
    expect(orderingCheck([{ mach: 0.991, drag: 0.09, band: 2e-3 }]).ok).toBe(true);
  });

  it('a failed rung keeps the rows within +-0.05 Mach out, with the rung and its reasons', () => {
    const good = judgeRung(rung({ mach: 0.6, limit: 5e-5 }));
    const bad = judgeRung(rung({ mach: 0.8, limit: -2e-3, floor: good.floorSet }));
    expect(bad.verdict).toBe('fail');
    const rows = [0.6, 0.601, 0.701, 0.797, 0.8, 0.85, 0.851, 0.899, 0.901];
    const out = rowsKeptOut([good, bad], rows, [], [0.6, 0.8]);
    expect(out.map((r) => r.mach)).toEqual([0.797, 0.8, 0.85]);
    expect(out[0]!.rung).toBe(0.8);
    expect(out[0]!.reason).toMatch(/\(c\)/);
    // Every registered rung must pass to release its box: with only Mach
    // 0.6 judged, the other four rungs keep their boxes out as "not run".
    const onlyGood = rowsKeptOut([good], rows);
    // 0.851 lies within 0.05 of the 0.901 rung, so it stays out too.
    expect(onlyGood.map((r) => r.mach)).toEqual([0.797, 0.8, 0.85, 0.851, 0.899, 0.901]);
    expect(onlyGood[0]!.reason).toMatch(/not judged: not run/);
    expect(rowsKeptOut([good], rows, [], [0.6])).toEqual([]);
  });

  it('a rung not converged, or waiting for the floor, keeps its box out with that reason', () => {
    const rows = [
      0.6, 0.601, 0.701, 0.797, 0.8, 0.85, 0.899, 0.901, 0.92, 0.939, 0.96, 0.964, 0.98, 0.981,
      0.989, 0.991,
    ];
    const good = judgeRung(rung({ mach: 0.6, limit: 5e-5 }));
    const notConverged = rowsKeptOut(
      [good],
      rows,
      [{ mach: 0.8, reason: 'not converged: the drag did not settle' }],
      [0.6, 0.8],
    );
    expect(notConverged.map((r) => r.mach)).toEqual([0.797, 0.8, 0.85]);
    expect(notConverged[0]!.reason).toMatch(/not converged/);
    // Mach 0.6 fails: no floor, so every other rung waits and every row from 0.701 up stays out.
    const bad = judgeRung(rung({ mach: 0.6, limit: 3e-3 }));
    const pending = [0.8, 0.901, 0.96, 0.991].map((mach) => ({ mach, reason: 'no floor' }));
    const noFloor = rowsKeptOut([bad], rows, pending);
    expect(noFloor.map((r) => r.mach)).toEqual(rows.filter((m) => m !== 0.701));
    expect(noFloor.find((r) => r.mach === 0.8)!.reason).toMatch(/no floor/);
    expect(noFloor.find((r) => r.mach === 0.6)!.reason).toMatch(/failed/);
  });

  it('the rows at Mach 1.001 to 1.041 wait for the 800-radius test and the results’ review', () => {
    expect(nearSonicHold(1.02, null, true)).toMatch(/has not run/);
    expect(nearSonicHold(1.02, false, true)).toMatch(/failed/);
    expect(nearSonicHold(1.02, true, false)).toMatch(/not yet reviewed/);
    expect(nearSonicHold(1.02, true, true)).toBeNull();
    expect(nearSonicHold(1.001, null, false)).not.toBeNull();
    expect(nearSonicHold(1.041, null, false)).not.toBeNull();
    // The served family's rows (1.05 and above) and the subsonic rows (their own hold) are not this gate's.
    expect(nearSonicHold(1.05, null, false)).toBeNull();
    expect(nearSonicHold(1.064, false, false)).toBeNull();
    expect(nearSonicHold(0.991, null, false)).toBeNull();
  });

  it('the row gate: every gate of (y) in order, each refusing with its reason', () => {
    const verification = {
      solvesTag: 'solves',
      solvesHash: 'abc',
      keptOut: [{ mach: 0.85, reason: 'rung Mach 0.8 failed: (c) ...' }],
      far800Pass: true,
      rowResults: [
        { mach: 0.6, largestStationBand: 3e-4, stationFailed: false, verdict: 'pass' },
        { mach: 0.92, largestStationBand: 2.5e-3, stationFailed: true, verdict: 'fail' },
        { mach: 1.02, largestStationBand: 4e-3, stationFailed: false, verdict: 'pass' },
        { mach: 1.064, largestStationBand: 1e-4, stationFailed: false, verdict: 'pass' },
      ],
    };
    const base = {
      solvesTag: 'solves',
      solvesHash: 'abc',
      gpu: false,
      gpuMatch: null,
      verification,
      resultsReviewed: true,
    };
    // A GPU run without a passed hardware match: every row, 1.064 included (6 (h)).
    const noMatch = rowGate({ ...base, mach: 1.064, gpu: true, gpuMatch: null });
    expect(noMatch).toMatchObject({ allowed: false });
    expect((noMatch as { reason: string }).reason).toMatch(/6 \(h\)/);
    expect(rowGate({ ...base, mach: 1.064, gpu: true, gpuMatch: { passed: false } })).toMatchObject(
      { allowed: false },
    );
    expect(
      rowGate({ ...base, mach: 1.064, gpu: true, gpuMatch: { passed: true, software: true } }),
    ).toMatchObject({ allowed: false });
    expect(
      rowGate({ ...base, mach: 1.064, gpu: true, gpuMatch: { passed: true, software: false } }),
    ).toMatchObject({ allowed: true, inviscidUncertainty: 1e-4 });
    // The served family passes on the CPU, with u_num where the evaluation has the row.
    expect(rowGate({ ...base, mach: 1.064 })).toMatchObject({
      allowed: true,
      inviscidUncertainty: 1e-4,
    });
    expect(rowGate({ ...base, mach: 1.05, verification: null })).toMatchObject({
      allowed: true,
      inviscidUncertainty: 0,
    });
    // Below 1.05: the evaluation must exist, be of these solves, and be current.
    expect(
      (rowGate({ ...base, mach: 0.6, verification: null }) as { reason: string }).reason,
    ).toMatch(/has not run/);
    expect(
      (
        rowGate({
          ...base,
          mach: 0.6,
          solvesTag: 'solves-gpu',
          gpu: true,
          gpuMatch: { passed: true },
        }) as { reason: string }
      ).reason,
    ).toMatch(/evaluated solves, not solves-gpu/);
    expect(
      (rowGate({ ...base, mach: 0.6, solvesHash: 'changed' }) as { reason: string }).reason,
    ).toMatch(/hash mismatch/);
    // Kept out by a rung; the 800-radius test; the review.
    expect((rowGate({ ...base, mach: 0.85 }) as { reason: string }).reason).toMatch(/item 6/);
    expect(
      (
        rowGate({ ...base, mach: 1.02, verification: { ...verification, far800Pass: null } }) as {
          reason: string;
        }
      ).reason,
    ).toMatch(/item 8/);
    expect(
      (rowGate({ ...base, mach: 0.6, resultsReviewed: false }) as { reason: string }).reason,
    ).toMatch(/not yet reviewed/);
    // No judged per-row result (0.701 outside every box when 0.6 failed, or not solved): refused.
    expect((rowGate({ ...base, mach: 0.701 }) as { reason: string }).reason).toMatch(
      /no judged per-row result/,
    );
    // 6 (d) failed for the row: refused.
    expect((rowGate({ ...base, mach: 0.92 }) as { reason: string }).reason).toMatch(
      /6 \(d\) failed/,
    );
    // The happy path wires u_num.
    expect(rowGate({ ...base, mach: 0.6 })).toMatchObject({
      allowed: true,
      inviscidUncertainty: 3e-4,
    });
    expect(rowGate({ ...base, mach: 1.02 })).toMatchObject({
      allowed: true,
      inviscidUncertainty: 4e-3,
    });
  });

  it('applyOrdering fails the rungs a violation names, and leaves the others', () => {
    const a = judgeRung(rung({ mach: 0.6, limit: 5e-5 }));
    const b = judgeRung(rung({ mach: 0.8, limit: 3e-3, floor: a.floorSet }));
    const c = judgeRung(rung({ mach: 0.901, limit: 2e-3, floor: a.floorSet }));
    expect([a, b, c].map((v) => v.verdict)).toEqual(['pass', 'pass', 'pass']);
    const judged = applyOrdering([a, b, c]);
    expect(judged[0]!.verdict).toBe('pass');
    expect(judged[1]!.verdict).toBe('fail');
    expect(judged[2]!.verdict).toBe('fail');
    expect(judged[1]!.criteria.c.status).toBe('fail');
    expect(judged[1]!.criteria.c.detail).toMatch(/ordering/);
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
