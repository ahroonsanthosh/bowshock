/**
 * The curve's points in the Mach windows BRL Report 934's range A tested
 * (src/app/curve.ts; the owner's decision after the sub-class merged): a
 * rocket the logic places inside the BRL sub-class gets a point in each
 * window, solved and labelled exactly as the logic says (Validated, with
 * its text and caveats); any other rocket gets none. The windows are read
 * from the logic.
 */

import { describe, expect, it } from 'vitest';
import type { LevelReport, VerifiedDrag } from '../../src/analysis/verified-drag';
import {
  curveMachs,
  CurveRun,
  TESTED_WINDOWS,
  testedWindowsFor,
  type NoseSolver,
} from '../../src/app/curve';
import { csvRow } from '../../src/app/curve-csv';
import { pointView, resultLine } from '../../src/app/point-view';
import {
  ASSUMED_CAVEAT,
  BRL934_SUB_CLASS,
  brl934SubClass,
  ROUNDED_EDGE_CAVEAT,
  VALIDATED_CLAIM,
} from '../../src/app/total-drag';
import { designForm } from '../../src/rocket/adapter';
import type { RocketDesign } from '../../src/rocket/design';
import { preset } from '../../src/rocket/presets';
import { exactConeNoseWaveDrag } from '../../src/total/nose';

/** Every length of a design times `k`. */
function scaled(d: RocketDesign, k: number): RocketDesign {
  const f = d.finSets[0]!;
  if (f.planform.kind !== 'trapezoidal' || f.section.kind !== 'wedge') throw new Error('not BF');
  return {
    ...d,
    nose: { ...d.nose, length: k * d.nose.length, diameter: k * d.nose.diameter },
    body: d.body.map((s) =>
      s.kind === 'tube'
        ? { ...s, length: k * s.length, diameter: k * s.diameter }
        : {
            ...s,
            length: k * s.length,
            foreDiameter: k * s.foreDiameter,
            aftDiameter: k * s.aftDiameter,
          },
    ),
    finSets: [
      {
        ...f,
        planform: {
          ...f.planform,
          rootChord: k * f.planform.rootChord,
          tipChord: k * f.planform.tipChord,
          span: k * f.planform.span,
          sweepLength: k * f.planform.sweepLength,
        },
        thickness: k * f.thickness,
        section: { kind: 'wedge', leadingEdgeRadius: k * f.section.leadingEdgeRadius },
        rootLeadingEdge: k * f.rootLeadingEdge,
      },
    ],
  };
}

/** The Basic Finner with sharp fin leading edges, sized so that Re on length / Mach is 4.634e6 at sea level. */
function brlFinner(): RocketDesign {
  const bf = preset('basic-finner').design;
  const f = bf.finSets[0]!;
  const sharp: RocketDesign = {
    ...bf,
    name: 'Basic Finner, sharp, BRL size',
    finSets: [{ ...f, section: { kind: 'wedge', leadingEdgeRadius: 0 } }],
    flight: { ...bf.flight, altitude: 0 },
  };
  const asked = designForm(sharp, 2, { without: false });
  if (asked.kind !== 'form') throw new Error(asked.kind);
  return scaled(sharp, 4.634e6 / (asked.form.reynoldsOnLength / 2));
}

const solver: NoseSolver = async (body, mach, hooks) => {
  let value: number;
  try {
    value = exactConeNoseWaveDrag(mach, Math.atan(0.5 / body.nose.length)).cd;
  } catch (e) {
    // As the solver refuses a case it does not serve (Mach 1.0: the cone's shock detaches).
    return { kind: 'error', message: String(e), gpuFailed: false };
  }
  const reports: LevelReport[] = [0, 1, 2, 3].map((k) => ({
    refinement: 2 ** k,
    cells: { ni: 191 * 2 ** k, nj: 20 * 2 ** k },
    iterations: 750,
    drag: value,
  }));
  await Promise.resolve();
  for (const r of reports) hooks.onLevel(r);
  return {
    kind: 'solved',
    estimate: { kind: 'monotone', value, extrapolated: value, order: 2, uncertainty: 1e-5 },
    uncertainty: 1e-5 + 7e-5 * value,
    verified: true,
    levels: reports.map((r) => ({ refinement: r.refinement, value: r.drag })),
    reports,
  } satisfies VerifiedDrag;
};

describe('the tested windows', { timeout: 120_000 }, () => {
  it("are the logic's windows, each with a point strictly inside it at the curve's two decimals", () => {
    expect(TESTED_WINDOWS.map((w) => [w.from, w.to])).toEqual(
      BRL934_SUB_CLASS.windows.map((w) => [...w.mach]),
    );
    expect(TESTED_WINDOWS.map((w) => w.mach)).toEqual([1.81, 2.45]);
    for (const w of TESTED_WINDOWS) {
      expect(w.mach).toBeGreaterThan(w.from);
      expect(w.mach).toBeLessThan(w.to);
      expect(Number(w.mach.toFixed(2))).toBe(w.mach);
      // Neither is a point the curve has anyway.
      expect(curveMachs(0.1)).not.toContain(w.mach);
    }
  });

  it('a rocket inside the sub-class gets both points, solved and labelled Validated as the logic says', async () => {
    const design = brlFinner();
    for (const w of TESTED_WINDOWS) {
      const asked = designForm(design, w.mach, { without: false });
      if (asked.kind !== 'form') throw new Error(asked.kind);
      expect(brl934SubClass(asked.form).inside).toBe(true);
    }
    for (const step of [0.2, 0.1]) {
      const run = new CurveRun({ design, without: false, step, finest: 8 }, solver, () => {});
      expect(run.points.map((p) => p.mach)).toEqual(
        [...curveMachs(step), 1.81, 2.45].sort((a, b) => a - b),
      );
      await run.run();
      const tested = run.points.filter((p) => p.tested !== undefined);
      expect(tested.map((p) => p.mach)).toEqual([1.81, 2.45]);
      for (const p of tested) {
        const s = p.state;
        if (s.kind !== 'done' || s.result.kind !== 'total') throw new Error('no total');
        expect(s.result.view.claim).toEqual({
          kind: 'validated',
          text: VALIDATED_CLAIM,
          caveats: [ASSUMED_CAVEAT, ROUNDED_EDGE_CAVEAT],
        });
        const v = pointView(p, true);
        expect(v.status.word).toBe('Validated');
        expect(v.claim).toBe(VALIDATED_CLAIM);
        expect(v.tested).toBe(
          `Mach window BRL Report 934 tested (${p.tested!.from} to ${p.tested!.to})`,
        );
        expect(resultLine(v)).toMatch(/: Validated$/);
        const row = csvRow(p);
        expect(row.split(',')[4]).toBe('validated');
        expect(row).toContain(
          `Mach window BRL Report 934 tested (${p.tested!.from} to ${p.tested!.to}); Validated:`,
        );
      }
      // Every other point of the same rocket: what the logic says there, never Validated.
      for (const p of run.points.filter((q) => q.tested === undefined)) {
        expect(pointView(p, true).status.word).not.toBe('Validated');
      }
    }
  });

  it('without WebGPU none is added (it could never be solved there)', () => {
    const run = new CurveRun(
      { design: brlFinner(), without: false, step: 0.2, finest: 8, noGpu: true },
      solver,
      () => {},
    );
    expect(run.points.map((p) => p.mach)).toEqual(curveMachs(0.2));
  });

  it('before it is solved, the CSV says only the window, with no run-on', () => {
    const run = new CurveRun(
      { design: brlFinner(), without: false, step: 0.2, finest: 8 },
      solver,
      () => {},
    );
    const p = run.points.find((q) => q.tested !== undefined)!;
    expect(csvRow(p)).toBe(
      `${p.mach.toFixed(2)},,,,not-finished,Mach window BRL Report 934 tested (${p.tested!.from} to ${p.tested!.to}),`,
    );
  });

  it('a rocket outside it gets none: rounded edges, another size, another altitude', () => {
    const bf = preset('basic-finner').design;
    const sharpBrl = brlFinner();
    const cases: [string, RocketDesign][] = [
      ['the Basic Finner preset (rounded edges, 30 mm)', bf],
      [
        'the BRL size with rounded edges',
        {
          ...sharpBrl,
          finSets: [
            {
              ...sharpBrl.finSets[0]!,
              section: { kind: 'wedge', leadingEdgeRadius: 0.004 * sharpBrl.nose.diameter },
            },
          ],
        },
      ],
      ['sharp, 30 mm', scaled(sharpBrl, 0.03 / sharpBrl.nose.diameter)],
      [
        'sharp, BRL size, 3000 m up',
        { ...sharpBrl, flight: { ...sharpBrl.flight, altitude: 3000 } },
      ],
      ['the 54 mm example', preset('example-54').design],
    ];
    for (const [name, design] of cases) {
      expect(testedWindowsFor(design, false), name).toEqual([]);
      const run = new CurveRun({ design, without: false, step: 0.2, finest: 8 }, solver, () => {});
      expect(
        run.points.map((p) => p.mach),
        name,
      ).toEqual(curveMachs(0.2));
    }
  });
});
