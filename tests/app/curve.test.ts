/**
 * The drag curve (src/app/curve.ts, src/app/curve-csv.ts;
 * docs/design/0017-rocketeer-interface.md section 8) with a stand-in for
 * the nose solve: the points and their order, points refused at once,
 * provisional values, each finished point exactly the logic's view, stop,
 * the nose's ends, and the CSV.
 */

import { describe, expect, it } from 'vitest';
import type { LevelReport, VerifiedDrag } from '../../src/analysis/verified-drag';
import {
  CurveRun,
  curveMachs,
  provisionalTotal,
  secondsPerPoint,
  solveOrder,
  type NoseSolver,
} from '../../src/app/curve';
import { CSV_HEADER, csvField, csvRow, curveCsv } from '../../src/app/curve-csv';
import { CLASS_CLAIM, totalDragView } from '../../src/app/total-drag';
import { noseStateOf } from '../../src/app/total-drag-display';
import type { Body } from '../../src/geometry/body';
import { designForm } from '../../src/rocket/adapter';
import type { RocketDesign } from '../../src/rocket/design';
import { preset } from '../../src/rocket/presets';
import { exactConeNoseWaveDrag } from '../../src/total/nose';

const basic = () => preset('basic-finner').design;

/** A stand-in nose solve: four grids converging on the cone's exact drag, with a band. */
function standIn(
  options: {
    band?: boolean;
    calls?: number[];
    fail?: 'gpu' | 'case';
    onStart?: (mach: number) => void;
  } = {},
): NoseSolver {
  return async (body: Body, mach: number, hooks) => {
    options.calls?.push(mach);
    options.onStart?.(mach);
    if (options.fail === 'gpu') return { kind: 'error', message: 'device lost', gpuFailed: true };
    if (options.fail === 'case') {
      return { kind: 'error', message: 'the tip shock detaches', gpuFailed: false };
    }
    const exact = exactConeNoseWaveDrag(mach, Math.atan(0.5 / body.nose.length)).cd;
    const reports: LevelReport[] = [];
    for (let k = 0; k < 4; k++) {
      await Promise.resolve();
      if (hooks.signal.aborted) return { kind: 'cancelled', reports };
      const report: LevelReport = {
        refinement: 2 ** k,
        cells: { ni: 191 * 2 ** k, nj: 20 * 2 ** k },
        iterations: 750 * 2 ** k,
        drag: exact * (1 + 1e-3 / 4 ** k),
      };
      reports.push(report);
      hooks.onLevel(report);
    }
    const value = reports[3]!.drag;
    const outcome: VerifiedDrag = {
      kind: 'solved',
      estimate:
        options.band === false
          ? { kind: 'unresolved', value, reason: 'the observed orders differ' }
          : { kind: 'monotone', value, extrapolated: exact, order: 2, uncertainty: 2e-5 },
      uncertainty: options.band === false ? undefined : 2e-5 + 7e-5 * value,
      verified: options.band !== false,
      levels: reports.map((r) => ({ refinement: r.refinement, value: r.drag })),
      reports,
    };
    return outcome;
  };
}

const options = (design: RocketDesign = basic()) => ({
  design,
  without: false,
  step: 0.2,
  finest: 8,
});

describe('the points', { timeout: 60_000 }, () => {
  it('Mach 1.0 to 3.0 every 0.2 or 0.1, whatever the rocket flies to', () => {
    expect(curveMachs(0.2)).toEqual([1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4, 2.6, 2.8, 3]);
    expect(curveMachs(0.1).length).toBe(21);
    // A rocket flying to Mach 0.28 (an OpenRocket file's own simulation) gets the whole curve.
    const b = preset('basic-finner').design;
    for (const maxMach of [0.28, 1.6, 3.6]) {
      const run = new CurveRun(
        { ...options(), design: { ...b, flight: { ...b.flight, maxMach } } },
        standIn(),
        () => {},
      );
      expect(run.points.map((p) => p.mach)).toEqual(curveMachs(0.2));
    }
  });

  it('solved coarse to fine: the ends, then the middles', () => {
    expect(solveOrder(11)).toEqual([0, 10, 5, 2, 7, 1, 3, 6, 8, 4, 9]);
    for (const n of [1, 2, 3, 7, 21]) {
      expect([...solveOrder(n)].sort((a, b) => a - b)).toEqual([...Array(n).keys()]);
    }
  });
});

describe('the Basic Finner with a stand-in nose', { timeout: 120_000 }, () => {
  it('refuses Mach 1.0 to 1.6 at once, with no solve; solves the rest coarse to fine', async () => {
    const calls: number[] = [];
    const run = new CurveRun(options(), standIn({ calls }), () => {});
    expect(run.points.slice(0, 4).map((p) => p.state.kind)).toEqual([
      'done',
      'done',
      'done',
      'done',
    ]);
    expect(run.queue.map((k) => run.points[k]!.mach)).toEqual([1.8, 3, 2.4, 2, 2.6, 2.2, 2.8]);
    await run.run();
    expect(calls).toEqual([1.8, 3, 2.4, 2, 2.6, 2.2, 2.8]);
    expect(run.done).toBe(true);
  });

  it("every finished point is exactly the logic's view of its form and the nose's outcome", async () => {
    const outcomes = new Map<number, VerifiedDrag>();
    const solver = standIn();
    const recording: NoseSolver = async (body, mach, hooks) => {
      const outcome = await solver(body, mach, hooks);
      if (outcome.kind !== 'error') outcomes.set(mach, outcome);
      return outcome;
    };
    const run = new CurveRun(options(), recording, () => {});
    await run.run();
    for (const p of run.points) {
      const form = designForm(basic(), p.mach, { without: false });
      if (form.kind !== 'form') throw new Error('no form');
      expect(p.state.kind).toBe('done');
      if (p.state.kind !== 'done') continue;
      const outcome = outcomes.get(p.mach);
      if (outcome === undefined) {
        expect(p.state.result.kind).toBe('refused');
        continue;
      }
      const view = totalDragView(form.form, noseStateOf(outcome)!);
      expect(p.state.result).toEqual({ kind: 'total', view, without: [] });
      if (p.state.result.kind === 'total') {
        // An estimate everywhere while the Basic Finner's claim is suspended; inside its class, said so.
        expect(p.state.result.view.claim.kind).toBe('estimate');
        expect(p.state.result.view.claim.text === CLASS_CLAIM).toBe(p.mach <= 2.15);
      }
    }
  });

  it('provisional after each grid: the total with that grid’s nose, no band', async () => {
    const seen: { grid: number; provisional: number | null }[] = [];
    const run = new CurveRun(options(), standIn(), (r, k) => {
      const s = r.points[k]?.state;
      if (k === 4 && s?.kind === 'solving') seen.push({ grid: s.grid, provisional: s.provisional });
    });
    await run.run();
    expect(seen.map((s) => s.grid)).toEqual([0, 1, 2, 3, 4]);
    expect(seen[0]!.provisional).toBeNull();
    const form = designForm(basic(), 1.8, { without: false });
    if (form.kind !== 'form') throw new Error('no form');
    const exact = exactConeNoseWaveDrag(1.8, Math.atan(0.5 / form.form.body.nose.length)).cd;
    expect(seen[1]!.provisional).toBe(provisionalTotal(form.form, exact * (1 + 1e-3), 1));
    expect(seen[1]!.provisional).toBeGreaterThan(0.5);
  });

  it('stop: the point under way and every point after it stopped, the run done', async () => {
    let run: CurveRun | null = null;
    const seen: boolean[] = [];
    const solver = standIn({
      onStart: (mach) => {
        seen.push(run?.running ?? false);
        if (mach === 3) run?.stop();
      },
    });
    run = new CurveRun(options(), solver, () => {});
    // Not running until run() (a preview), running while it solves, then done.
    expect(run.running).toBe(false);
    await run.run();
    expect(seen.every((r) => r)).toBe(true);
    expect(run.running).toBe(false);
    const at = (mach: number) => run.points.find((p) => p.mach === mach)!.state.kind;
    expect(at(1.8)).toBe('done');
    expect(at(3)).toBe('stopped');
    expect(at(2.4)).toBe('stopped');
    expect(at(1.4)).toBe('done');
    expect(run.done).toBe(true);
  });

  it("the nose's ends: no band, a refused case, a failed GPU, no WebGPU", async () => {
    const ends = async (solver: NoseSolver, noGpu = false) => {
      const run = new CurveRun({ ...options(), noGpu }, solver, () => {});
      await run.run();
      return run.points.map((p) =>
        p.state.kind === 'done' && p.state.result.kind === 'refused'
          ? p.state.result.nose
          : p.state.kind,
      );
    };
    expect((await ends(standIn({ band: false }))).slice(4)).toEqual(Array(7).fill('no-band'));
    expect((await ends(standIn({ fail: 'case' }))).slice(4)).toEqual(Array(7).fill('refused-case'));
    // The GPU failed: that point has no number, and nothing more is solved.
    expect((await ends(standIn({ fail: 'gpu' }))).slice(4)).toEqual([
      'gpu-failed',
      'stopped',
      'stopped',
      'stopped',
      'stopped',
      'stopped',
      'stopped',
    ]);
    const calls: number[] = [];
    expect((await ends(standIn({ calls }), true)).slice(4)).toEqual(Array(7).fill('no-webgpu'));
    expect(calls).toEqual([]);
  });

  it('a rocket not modelled, or asking about its parts: every point says so, nothing is solved', async () => {
    const calls: number[] = [];
    const b = basic();
    const notModelled = new CurveRun(options({ ...b, finSets: [] }), standIn({ calls }), () => {});
    expect(
      notModelled.points.every(
        (p) => p.state.kind === 'done' && p.state.result.kind === 'not-modelled',
      ),
    ).toBe(true);
    const lugged = {
      ...b,
      otherParts: [{ kind: 'launch-lug' as const, name: 'Launch lug', count: 1 }],
    };
    const asking = new CurveRun(options(lugged), standIn({ calls }), () => {});
    expect(
      asking.points.every((p) => p.state.kind === 'done' && p.state.result.kind === 'choose'),
    ).toBe(true);
    await notModelled.run();
    await asking.run();
    expect(calls).toEqual([]);
    // Chosen: computed without it, and labelled so.
    const without = new CurveRun({ ...options(lugged), without: true }, standIn(), () => {});
    await without.run();
    const p = without.points.find((q) => q.mach === 2)!;
    expect(
      p.state.kind === 'done' && p.state.result.kind === 'total' && p.state.result.without,
    ).toEqual(['the launch lug']);
  });

  it('the time a point takes: from the grids solved, then from the last point finished', async () => {
    let estimate: number | null = null;
    const run = new CurveRun(options(), standIn(), (r) => {
      const s = secondsPerPoint(r);
      if (s !== null) estimate = s;
    });
    expect(secondsPerPoint(run)).toBeNull();
    await run.run();
    expect(estimate).not.toBeNull();
    expect(estimate!).toBeGreaterThanOrEqual(0);
  });
});

describe('the CSV', { timeout: 120_000 }, () => {
  it('pins the format: comment lines, the header, a row per point', async () => {
    const run = new CurveRun(options(), standIn(), () => {});
    await run.run();
    const csv = curveCsv(run, 'bowshock test build');
    const lines = csv.trimEnd().split('\n');
    expect(lines[0]).toBe('# bowshock drag curve: Basic Finner');
    expect(lines[1]).toBe(
      '# altitude 0 m above sea level (U.S. Standard Atmosphere, 1976); zero incidence, power off; nose solved to 160 cells across',
    );
    expect(lines[2]).toBe('# bowshock test build');
    expect(lines[3]).toBe(CSV_HEADER);
    expect(lines.length).toBe(4 + 11);
    // A refused row: no number, every refusal in the reason.
    expect(lines[4]).toMatch(/^1\.00,,,,refused,"fin friction \(fins-own-drag-mach\): /);
    expect(lines[4]).toMatch(/fin leading edges \(leading-edge-range\): /);
    // A row with a number: C_D to four decimals, the band outward, the logic's claim.
    const at2 = run.points.find((p) => p.mach === 2)!;
    if (at2.state.kind !== 'done' || at2.state.result.kind !== 'total') throw new Error('no total');
    const t = at2.state.result.view.total;
    const row = lines[4 + 5]!;
    expect(row.startsWith(`2.00,${t.cd.toFixed(4)},`)).toBe(true);
    expect(row).toMatch(
      /,estimate,"Estimate, not validated: this case lies inside the Basic Finner's class/,
    );
    expect(row).toMatch(
      /Because: the fins-on-base factor was corrected after the Basic Finner gate/,
    );
    const [, , low, high] = row.split(',');
    expect(Number(low)).toBeLessThanOrEqual(t.low);
    expect(Number(high)).toBeGreaterThanOrEqual(t.high);
  });

  it('fields quoted where they must be; unfinished points without a number', () => {
    expect(csvField('a, "b"')).toBe('"a, ""b"""');
    expect(csvField('plain')).toBe('plain');
    expect(
      csvRow({ mach: 1.2, state: { kind: 'waiting' }, nose: null, seconds: 0, cellUpdates: 0 }),
    ).toBe('1.20,,,,not-finished,not computed');
    expect(
      csvRow({
        mach: 1.2,
        state: { kind: 'solving', grid: 2, grids: 4, provisional: 0.6 },
        nose: null,
        seconds: 0,
        cellUpdates: 0,
      }),
    ).toBe('1.20,,,,not-finished,not computed');
  });
});
