/**
 * The numbers check of 0017 section 12, at the level of what the page
 * shows: for the Basic Finner inside its class, an estimate outside it
 * (the 54 mm example), a bounded case (the Basic Finner above Mach 2.56)
 * and a refused case (the Basic Finner at Mach 1.4), every number, band,
 * status and reason the page shows of a point (its PointView, which the
 * chart, the table, the pinned line and the PNG show) and the CSV row are
 * the logic's own for the same nose outcome: `totalDragView` of the
 * adapter's form, computed here independently of the curve.
 */

import { describe, expect, it } from 'vitest';
import type { LevelReport, VerifiedDrag } from '../../src/analysis/verified-drag';
import { outward } from '../../src/app/band';
import { CurveRun, type NoseSolver } from '../../src/app/curve';
import { csvRow } from '../../src/app/curve-csv';
import { pointView } from '../../src/app/point-view';
import { claimWords, refusalWords } from '../../src/app/status-words';
import { totalDragView } from '../../src/app/total-drag';
import { noseStateOf } from '../../src/app/total-drag-display';
import { designForm } from '../../src/rocket/adapter';
import type { RocketDesign } from '../../src/rocket/design';
import { preset } from '../../src/rocket/presets';
import { exactConeNoseWaveDrag } from '../../src/total/nose';

/** A nose outcome of the shape the GPU solve returns, with a band (four grids). */
function outcomeFor(value: number): VerifiedDrag {
  const reports: LevelReport[] = [0, 1, 2, 3].map((k) => ({
    refinement: 2 ** k,
    cells: { ni: 191 * 2 ** k, nj: 20 * 2 ** k },
    iterations: 750,
    drag: value,
  }));
  return {
    kind: 'solved',
    estimate: { kind: 'monotone', value, extrapolated: value, order: 2, uncertainty: 2e-4 },
    uncertainty: 2e-4 + 7e-5 * value,
    verified: true,
    levels: reports.map((r) => ({ refinement: r.refinement, value: r.drag })),
    reports,
  };
}

/** The nose's value at a Mach number: the cone's exact one for the cone, a fixed one otherwise. */
const noseValue = (design: RocketDesign, mach: number) =>
  design.nose.shape.kind === 'conical'
    ? exactConeNoseWaveDrag(mach, Math.atan(0.5 / (design.nose.length / design.nose.diameter))).cd
    : 0.05 + 0.01 * mach;

const solver =
  (design: RocketDesign): NoseSolver =>
  async (_body, mach, hooks) => {
    const outcome = outcomeFor(noseValue(design, mach));
    await Promise.resolve();
    for (const r of outcome.kind === 'solved' ? outcome.reports : []) hooks.onLevel(r);
    return outcome;
  };

/** The 54 mm example with flat sheet fins (a rounded leading, a square trailing edge). */
function plates54(): RocketDesign {
  const b = preset('example-54').design;
  const set = b.finSets[0]!;
  return {
    ...b,
    name: 'Example: 54 mm, flat plates',
    finSets: [
      {
        ...set,
        section: {
          kind: 'flat',
          leadingEdge: { kind: 'rounded' },
          trailingEdge: { kind: 'square' },
        },
      },
    ],
  };
}

const CASES: readonly {
  name: string;
  id: string;
  mach: number;
  word: string | null;
  design?: () => RocketDesign;
}[] = [
  {
    name: 'the Basic Finner inside its class',
    id: 'basic-finner',
    mach: 2,
    word: 'Estimate, tested class',
  },
  { name: 'an estimate outside it', id: 'example-54', mach: 2, word: 'Estimate' },
  { name: 'a bounded case', id: 'basic-finner', mach: 2.8, word: 'Estimate, bounded' },
  {
    name: "a case the rebuilt factor bounds (main's W1)",
    id: 'flat plates at the base',
    mach: 2,
    word: 'Estimate, bounded',
    design: plates54,
  },
  { name: 'a refused case', id: 'basic-finner', mach: 1.4, word: null },
];

describe('the numbers the page shows are the logic’s', { timeout: 600_000 }, () => {
  for (const c of CASES) {
    it(`${c.name}: ${c.id} at Mach ${c.mach.toFixed(1)}`, async () => {
      const design = c.design?.() ?? preset(c.id).design;
      const run = new CurveRun(
        { design, without: false, step: 0.2, finest: 8 },
        solver(design),
        () => {},
      );
      await run.run();
      const point = run.points.find((p) => p.mach === c.mach)!;
      const shown = pointView(point, true);
      const row = csvRow(point).split(',');

      // The logic, independently: the adapter's form and the same nose outcome.
      const asked = designForm(design, c.mach, { without: false });
      if (asked.kind !== 'form') throw new Error(asked.kind);
      const logic = totalDragView(asked.form, noseStateOf(outcomeFor(noseValue(design, c.mach)))!);

      if (c.word === null) {
        expect(logic.kind).toBe('refused');
        if (logic.kind !== 'refused') return;
        expect([shown.value, shown.band]).toEqual([null, null]);
        expect(shown.status.word).toBe('No number');
        // Every one of the logic's refusals, in its plain words.
        for (const r of logic.refusals) expect(shown.reasons).toContain(refusalWords(r).reason);
        expect(row[4]).toBe('refused');
        const reason = csvRow(point).slice(row.slice(0, 5).join(',').length + 1);
        for (const r of logic.refusals)
          expect(reason).toContain(`${r.component} (${r.reason}): ${r.message}`);
        return;
      }
      expect(logic.kind).toBe('total');
      if (logic.kind !== 'total') return;
      const [low, high] = outward(logic.total.low, logic.total.high, 4);
      expect(shown.value).toBe(logic.total.cd.toFixed(4));
      expect(shown.band).toBe(`${low} to ${high}`);
      expect(shown.status).toEqual(claimWords(logic.claim));
      expect(shown.status.word).toBe(c.word);
      expect(row.slice(0, 5)).toEqual([
        c.mach.toFixed(2),
        logic.total.cd.toFixed(4),
        low,
        high,
        logic.claim.kind,
      ]);
      expect(csvRow(point)).toContain(logic.claim.text.slice(0, 60));
      for (const r of logic.claim.reasons) expect(csvRow(point)).toContain(r.slice(0, 40));
    });
  }
});
