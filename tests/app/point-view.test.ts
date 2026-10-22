/**
 * A point as the page shows it (src/app/point-view.ts): its C_D, band and
 * percentages are the drag page's own headline's, digit for digit, and
 * every status has its words.
 */

import { describe, expect, it } from 'vitest';
import type { LevelReport, VerifiedDrag } from '../../src/analysis/verified-drag';
import { CurveRun, type CurvePoint, type NoseSolver } from '../../src/app/curve';
import { headlineDigits, pointView } from '../../src/app/point-view';
import { totalDragDisplay } from '../../src/app/total-drag-display';
import { preset } from '../../src/rocket/presets';
import { exactConeNoseWaveDrag } from '../../src/total/nose';

const solver =
  (band = true): NoseSolver =>
  async (body, mach, hooks) => {
    const value = exactConeNoseWaveDrag(mach, Math.atan(0.5 / body.nose.length)).cd;
    const reports: LevelReport[] = [0, 1, 2, 3].map((k) => ({
      refinement: 2 ** k,
      cells: { ni: 191 * 2 ** k, nj: 20 * 2 ** k },
      iterations: 750,
      drag: value,
    }));
    await Promise.resolve();
    for (const r of reports) hooks.onLevel(r);
    const outcome: VerifiedDrag = {
      kind: 'solved',
      estimate: band
        ? { kind: 'monotone', value, extrapolated: value, order: 2, uncertainty: 1e-5 }
        : { kind: 'unresolved', value, reason: 'no order' },
      uncertainty: band ? 1e-5 + 7e-5 * value : undefined,
      verified: band,
      levels: reports.map((r) => ({ refinement: r.refinement, value: r.drag })),
      reports,
    };
    return outcome;
  };

async function basicFinnerRun(band = true): Promise<CurveRun> {
  const run = new CurveRun(
    { design: preset('basic-finner').design, without: false, step: 0.2, finest: 8 },
    solver(band),
    () => {},
  );
  await run.run();
  return run;
}

const at = (run: CurveRun, mach: number) => run.points.find((p) => p.mach === mach)!;

describe('a point as shown', { timeout: 120_000 }, () => {
  it("C_D, band and percentages: the drag page's headline, digit for digit", async () => {
    const run = await basicFinnerRun();
    for (const mach of [1.8, 2, 2.4, 3]) {
      const p = at(run, mach);
      if (p.state.kind !== 'done' || p.state.result.kind !== 'total') throw new Error('no total');
      const view = pointView(p, true);
      const headline = totalDragDisplay(p.state.result.view)[0]!;
      if (headline.kind !== 'paragraph') throw new Error('no headline');
      expect(
        headline.text.startsWith(
          `Total C_D = ${view.value}, model-form band ${view.band} (${view.percent})`,
        ),
      ).toBe(true);
      // Inside the class (to 2.15), outside it, and above Mach 2.56 with the fins-on-base factor bounded.
      expect(view.status.word).toBe(
        mach <= 2.15 ? 'Estimate, tested class' : mach <= 2.56 ? 'Estimate' : 'Estimate, bounded',
      );
      expect(view.change).toBeNull();
    }
  });

  it('the headline: three significant figures where the band is wider than 1%', async () => {
    const run = await basicFinnerRun();
    for (const mach of [1.8, 2, 2.4, 3]) {
      const p = at(run, mach);
      if (p.state.kind !== 'done' || p.state.result.kind !== 'total') throw new Error('no total');
      const t = p.state.result.view.total;
      const view = pointView(p, true);
      // The Basic Finner's bands are tens of percent wide: three figures, the band outward.
      expect(Math.max(1 - t.low / t.cd, t.high / t.cd - 1)).toBeGreaterThan(0.01);
      expect(view.headline).toBe(t.cd.toFixed(3));
      const [low, high] = view.headlineBand!.split(' to ').map(Number);
      expect(low!).toBeLessThanOrEqual(t.low);
      expect(high!).toBeGreaterThanOrEqual(t.high);
      // The full figures stay in the view for Details, the table and the CSV.
      expect(view.value).toBe(t.cd.toFixed(4));
    }
  });

  it('headline digits: four decimals within 1%, else three significant figures', () => {
    expect(headlineDigits(0.5463, 0.5443, 0.5483)).toBe(4);
    expect(headlineDigits(0.5463, 0.4, 0.7)).toBe(3);
    expect(headlineDigits(0.5463, 0.5463, 0.552)).toBe(3);
    expect(headlineDigits(1.234, 1.0, 1.5)).toBe(2);
    expect(headlineDigits(0.0812, 0.07, 0.09)).toBe(4);
  });

  it('a refused point: no number, the plain reason, and what could change it', async () => {
    const run = await basicFinnerRun();
    const v = pointView(at(run, 1.4), true);
    expect([v.value, v.band, v.percent]).toEqual([null, null, null]);
    expect(v.status.word).toBe('No number');
    // The first of the logic's refusals there: the fins' own drag, below Mach 1.5 (main's 7411c70).
    expect(v.status.sentence).toBe(
      "The drag here cannot be given to a known accuracy: the fins' own drag (their friction, " +
        "and a sharp section's wave drag) is checked against flight measurements only from " +
        'Mach 1.5 to 2.96, and its error grows below that.',
    );
    expect(v.change).toBe('Nothing about the rocket changes this: this speed has no number yet.');
  });

  it('a nose without a band: the finer grid suggested only where it is offered', async () => {
    const run = await basicFinnerRun(false);
    expect(pointView(at(run, 2), true).change).toBe(
      'To get a number: the finer grid (320 cells across).',
    );
    expect(pointView(at(run, 2), false).change).toBe(
      'Nothing about the rocket changes this: this speed has no number yet.',
    );
  });

  it('waiting, solving, provisional and stopped points have no band', () => {
    const base = { mach: 2, nose: null, seconds: 0, cellUpdates: 0 };
    const states: CurvePoint['state'][] = [
      { kind: 'waiting' },
      { kind: 'solving', grid: 0, grids: 4, provisional: null },
      { kind: 'solving', grid: 2, grids: 4, provisional: 0.55012 },
      { kind: 'stopped' },
    ];
    const views = states.map((state) => pointView({ ...base, state }, true));
    expect(views.map((v) => v.status.word)).toEqual([
      'Waiting',
      'Solving',
      'Provisional',
      'Stopped',
    ]);
    expect(views.map((v) => v.value)).toEqual([null, null, '0.550', null]);
    expect(views.map((v) => v.headline)).toEqual([null, null, '0.550', null]);
    expect(views.every((v) => v.band === null)).toBe(true);
  });

  it('parts to choose about, and a rocket not modelled', () => {
    const base = { mach: 2, nose: null, seconds: 0, cellUpdates: 0 };
    const choose = pointView(
      {
        ...base,
        state: {
          kind: 'done',
          result: { kind: 'choose', excludable: [{ part: 'the launch lug' }] },
        },
      },
      true,
    );
    expect(choose.status.sentence).toBe(
      'bowshock does not model the drag of the launch lug: compute without it, or keep it and get no number.',
    );
    const notModelled = pointView(
      {
        ...base,
        state: {
          kind: 'done',
          result: {
            kind: 'not-modelled',
            features: [
              { feature: 'a boat-tail', reason: 'one diameter only', change: 'a straight body' },
            ],
          },
        },
      },
      true,
    );
    expect(notModelled.status.sentence).toBe(
      'The drag here cannot be given to a known accuracy: bowshock does not model a boat-tail (one diameter only).',
    );
    expect(notModelled.change).toBe('To get a number: a straight body.');
  });
});
