/**
 * A refused point's parts served and floor on the page
 * (docs/design/0011-total-drag-on-the-page.md section 10): every preset,
 * with and without the parts it is computed without, at every Mach number
 * of the curve where its total is refused, with the nose solved (a
 * stand-in band, Mach 1.0 refused as the solver does) and without WebGPU.
 * At each, the logic's parts and floor (totalDragView's), and the point
 * view, the table's line, the CSV row and the PNG's caption carry them
 * word for word; no refused point has a value, band or headline (the
 * chart draws no mark for the floor).
 */

import { describe, expect, it } from 'vitest';
import type { LevelReport, VerifiedDrag } from '../../src/analysis/verified-drag';
import { CurveRun, type NoseSolver } from '../../src/app/curve';
import { csvRow } from '../../src/app/curve-csv';
import { captionLines, pointView } from '../../src/app/point-view';
import {
  floorText,
  floorValue,
  KNOWN_HEADING,
  notShownLine,
  partLabel,
  partLine,
  partsSentence,
} from '../../src/app/refused-parts';
import { totalDragView } from '../../src/app/total-drag';
import { NO_WEBGPU, noseStateOf } from '../../src/app/total-drag-display';
import { designForm } from '../../src/rocket/adapter';
import type { FinSetDesign, RocketDesign } from '../../src/rocket/design';
import { preset, PRESETS } from '../../src/rocket/presets';

/** A stand-in nose solve with a band; Mach 1.0 refused, as the solver refuses it. */
function outcomeAt(
  mach: number,
): VerifiedDrag | { kind: 'error'; message: string; gpuFailed: false } {
  if (!(mach > 1)) return { kind: 'error', message: 'the tip shock detaches', gpuFailed: false };
  const value = 0.05 + 0.01 * mach;
  const reports: LevelReport[] = [0, 1, 2, 3].map((k) => ({
    refinement: 2 ** k,
    cells: { ni: 191 * 2 ** k, nj: 20 * 2 ** k },
    iterations: 750,
    drag: value,
  }));
  return {
    kind: 'solved',
    floor: 7e-5,
    estimate: { kind: 'monotone', value, extrapolated: value, order: 2, uncertainty: 1e-5 },
    uncertainty: 1e-5 + 7e-5 * value,
    verified: true,
    levels: reports.map((r) => ({ refinement: r.refinement, value: r.drag })),
    reports,
  };
}

const solver: NoseSolver = async (_body, mach, hooks) => {
  const outcome = outcomeAt(mach);
  await Promise.resolve();
  if (outcome.kind === 'solved') for (const r of outcome.reports) hooks.onLevel(r);
  return outcome;
};

async function curve(design: RocketDesign, gpu: boolean, without: boolean): Promise<CurveRun> {
  const run = new CurveRun(
    { design, without, step: 0.2, finest: 8, noGpu: !gpu },
    solver,
    () => {},
  );
  await run.run();
  return run;
}

/** The checks at every refused point; the number of points with a floor. */
function check(run: CurveRun, design: RocketDesign, gpu: boolean, without: boolean): number {
  let floors = 0;
  for (const p of run.points) {
    const s = p.state;
    if (s.kind !== 'done' || s.result.kind !== 'refused') continue;
    const r = s.result;
    const asked = designForm(design, p.mach, { without });
    if (asked.kind !== 'form') throw new Error(asked.kind);
    // The logic's view at this point: the nose as solved, or as no WebGPU leaves it.
    const nose = gpu ? noseStateOf(outcomeAt(p.mach)) : NO_WEBGPU;
    const view = totalDragView(asked.form, nose!);
    expect(view.kind).toBe('refused');
    if (view.kind !== 'refused') continue;
    expect(r.parts).toEqual(view.parts);
    const parts = view.parts;
    const v = pointView(p, true);
    const where = `${design.name} at Mach ${p.mach}`;
    // No value, band or headline: the chart has nothing to mark but the cross.
    expect(v.value, where).toBeNull();
    expect(v.band).toBeNull();
    expect(v.headline).toBeNull();
    expect(v.status.word).toBe('No number');
    if (parts === null) {
      expect(v.floor).toBeNull();
      expect(v.parts).toEqual([]);
      continue;
    }
    // The point block: each part with its band and label, word for word, and the floor.
    expect(v.parts).toEqual(parts.served.map((c) => ({ line: partLine(c), label: partLabel(c) })));
    expect(v.notShown).toEqual(parts.notShown.map(notShownLine));
    expect(v.floor).toBe(floorText(parts.floor, true));
    expect(v.floorFull).toBe(floorText(parts.floor));
    expect(v.known!.startsWith(KNOWN_HEADING)).toBe(true);
    for (const c of parts.served) expect(v.known).toContain(partLine(c));
    // The nose is a part only once it is solved with a band.
    expect(parts.served.some((c) => c.name === 'nose wave drag')).toBe(gpu && p.mach > 1);
    // The CSV: the parts with their labels and the floor in the reason, the floor in its column.
    const row = csvRow(p);
    expect(row).toContain(partsSentence(parts, true).replace(/"/g, '""'));
    expect(row.endsWith(`,${floorValue(parts.floor)}`)).toBe(true);
    expect(row.split(',').slice(1, 4)).toEqual(['', '', '']);
    // The PNG's caption: the parts' lines and the floor (or that none is given).
    const caption = captionLines(v);
    if (parts.served.length > 0) {
      expect(caption).toContain(`Known: ${parts.served.map(partLine).join(', ')}`);
    }
    if (parts.floor.kind === 'floor') {
      floors++;
      expect(v.floor!.startsWith('At least ')).toBe(true);
      expect(v.floor).toContain(
        ": a floor, not an estimate: the sum of the served parts' low ends; the refused parts (",
      );
      expect(caption).toContain(v.floor);
      expect(Number(floorValue(parts.floor))).toBeLessThanOrEqual(parts.floor.value);
      // Never a floor without the nose solved, nor with the body base refused.
      expect(gpu && p.mach > 1).toBe(true);
      expect(r.refusals.some((x) => x.component === 'body base')).toBe(false);
    } else {
      expect(v.floor!.startsWith('No floor is given: ')).toBe(true);
      expect(caption).toContain('No floor is given.');
      expect(row.endsWith(',')).toBe(true);
    }
  }
  return floors;
}

const fins = (d: RocketDesign, change: Partial<FinSetDesign>): RocketDesign => ({
  ...d,
  name: `${d.name} (edited)`,
  finSets: [{ ...d.finSets[0]!, ...change }],
});

describe("a refused point's parts and floor", { timeout: 600_000 }, () => {
  for (const p of PRESETS) {
    for (const gpu of [true, false]) {
      it(`${p.id}, ${gpu ? 'the nose solved' : 'without WebGPU'}`, async () => {
        for (const without of [false, true]) {
          check(await curve(p.design, gpu, without), p.design, gpu, without);
        }
      });
    }
  }

  it("the Basic Finner below Mach 1.8: the nose among the parts, no floor (its wedges' base)", async () => {
    const design = preset('basic-finner').design;
    const run = await curve(design, true, false);
    check(run, design, true, false);
    const at14 = pointView(
      run.points.find((q) => q.mach === 1.4)!,
      true,
    );
    expect(at14.parts[0]!.line).toMatch(/^nose wave drag 0\.0640 \(0\.0639 to 0\.0641\)$/);
    expect(at14.floor).toMatch(/^No floor is given: the fin wave drag of a single wedge/);
    expect(at14.floor).toMatch(/; the body base is refused, and its sign/);
  });

  it('flat plates a chord ahead of the base, square-cut at Mach 2: a floor', async () => {
    const b = preset('basic-finner').design;
    const d: RocketDesign = {
      ...fins(b, {
        section: {
          kind: 'flat',
          leadingEdge: { kind: 'square' },
          trailingEdge: { kind: 'square' },
        },
      }),
    };
    // The fins two root chords (30 mm each) ahead of the base.
    const set = d.finSets[0]!;
    const ahead: RocketDesign = {
      ...d,
      finSets: [{ ...set, rootLeadingEdge: set.rootLeadingEdge - 0.06 }],
    };
    const run = await curve(ahead, true, false);
    expect(check(run, ahead, true, false)).toBeGreaterThan(0);
    const v = pointView(
      run.points.find((q) => q.mach === 2)!,
      true,
    );
    expect(v.floor).toMatch(
      /^At least 0\.\d{2,4}: a floor, not an estimate: the sum of the served parts' low ends; the refused parts \(fin leading edges\) are not negative\.$/,
    );
  });
});
