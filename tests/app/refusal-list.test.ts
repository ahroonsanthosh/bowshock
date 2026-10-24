/**
 * Every refusal of the logic reaches the page, in plain words, and the
 * page never promises a change gives a number where the logic says
 * otherwise (src/app/point-view.ts; the interface review's item 1). Run
 * over every preset, with WebGPU (a stand-in nose solve) and without it,
 * at every point of the curve, and over the four cases the review found.
 */

import { describe, expect, it } from 'vitest';
import type { LevelReport, VerifiedDrag } from '../../src/analysis/verified-drag';
import { CurveRun, type NoseSolver } from '../../src/app/curve';
import { plainReasons, pointView } from '../../src/app/point-view';
import { noseWords, refusalWords } from '../../src/app/status-words';
import type { FinSetDesign, RocketDesign } from '../../src/rocket/design';
import { PRESETS, preset } from '../../src/rocket/presets';
import { exactConeNoseWaveDrag } from '../../src/total/nose';

/** A stand-in nose solve with a band: the exact cone's drag. */
const solver: NoseSolver = async (body, mach, hooks) => {
  // As the solver refuses a case it does not serve (Mach 1.0: the cone's shock detaches).
  if (!(mach > 1)) return { kind: 'error', message: 'the tip shock detaches', gpuFailed: false };
  const value = exactConeNoseWaveDrag(mach, Math.atan(0.5 / body.nose.length)).cd;
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

async function curve(design: RocketDesign, gpu: boolean): Promise<CurveRun> {
  const run = new CurveRun(
    { design, without: true, step: 0.1, finest: 8, noGpu: !gpu },
    solver,
    () => {},
  );
  await run.run();
  return run;
}

const NOTHING = 'Nothing about the rocket';

/** The checks at every refused point of a curve; returns the views of its refused points. */
function check(run: CurveRun) {
  const out = new Map<number, ReturnType<typeof pointView>>();
  for (const p of run.points) {
    const s = p.state;
    if (s.kind !== 'done' || s.result.kind !== 'refused') continue;
    const r = s.result;
    const v = pointView(p, true);
    const reasons = plainReasons(p, true)!;
    out.set(p.mach, v);
    expect(v.status.word).toBe('No number');
    expect(v.reasons).toEqual(reasons.map((x) => x.reason));
    // Every refusal of the logic appears, in plain words.
    for (const x of r.refusals) {
      const words =
        x.component === 'nose wave drag' && r.nose !== null
          ? noseWords(r.nose, true)
          : refusalWords(x);
      expect(v.reasons, `${p.mach}: ${x.component} (${x.reason})`).toContain(words.reason);
    }
    if (r.nose !== null) expect(v.reasons).toContain(noseWords(r.nose, true).reason);
    // A browser is never promised a number: the solve itself may not settle.
    expect(v.change!).not.toMatch(/To get a number: .*Chrome/);
    // A change is offered as giving a number only where it is the one reason.
    if (v.change!.startsWith('To get a number')) expect(v.reasons).toHaveLength(1);
    // A reason nothing about the rocket clears: no change is offered.
    if (reasons.some((x) => x.change === '')) expect(v.change!.startsWith(NOTHING)).toBe(true);
    // With several reasons, the sentence says so and each is listed.
    if (reasons.length > 1) {
      expect(v.status.sentence).toMatch(/reasons, each listed below/);
      expect(v.change!.startsWith('To get a number')).toBe(false);
    }
  }
  return out;
}

const fins = (d: RocketDesign, change: Partial<FinSetDesign>): RocketDesign => ({
  ...d,
  name: `${d.name} (edited)`,
  finSets: [{ ...d.finSets[0]!, ...change }],
});

describe('every refusal shown, no false promise', { timeout: 600_000 }, () => {
  for (const p of PRESETS) {
    for (const gpu of [true, false]) {
      it(`${p.id}, ${gpu ? 'with' : 'without'} WebGPU`, async () => {
        check(await curve(p.design, gpu));
      });
    }
  }

  it('Basic Finner without WebGPU at Mach 1.0 and 1.2: no promise of Chrome', async () => {
    const views = check(await curve(preset('basic-finner').design, false));
    for (const mach of [1, 1.2]) {
      const v = views.get(mach)!;
      expect(v.reasons).toContain(noseWords('no-webgpu', false).reason);
      expect(v.reasons.some((t) => t.startsWith("the fins' own drag"))).toBe(true);
      expect(v.change).toBe(
        'Nothing about the rocket or the browser changes this: this speed has no number yet.',
      );
    }
  });

  it('example-98-rounded at Mach 2 without WebGPU: the base named too', async () => {
    const v = check(await curve(preset('example-98-rounded').design, false)).get(2)!;
    expect(v.reasons.length).toBeGreaterThan(1);
    expect(v.reasons).toContain(noseWords('no-webgpu', false).reason);
    expect(v.reasons.some((t) => /base drag/.test(t))).toBe(true);
    expect(v.change).toMatch(/^No one change gives a number here: each reason needs its own \(/);
    expect(v.change).toMatch(/a recent Chrome or Edge/);
  });

  it('example-54 with five fins at Mach 1.5: four fins named too', async () => {
    const d = fins(preset('example-54').design, { count: 5 });
    const v = check(await curve(d, true)).get(1.5)!;
    expect(v.reasons.length).toBeGreaterThan(1);
    expect(v.reasons.some((t) => /four fins/.test(t))).toBe(true);
    expect(v.change).toMatch(/four fins/);
    expect(v.change!.startsWith('To get a number')).toBe(false);
  });

  it('Basic Finner, flat fins with square leading and rounded trailing edges, Mach 2', async () => {
    const d = fins(preset('basic-finner').design, {
      section: { kind: 'flat', leadingEdge: { kind: 'square' }, trailingEdge: { kind: 'rounded' } },
    });
    const v = check(await curve(d, true)).get(2)!;
    expect(v.reasons.some((t) => /square-cut leading edge/.test(t))).toBe(true);
    expect(v.reasons.some((t) => /rounded trailing edge/.test(t))).toBe(true);
    expect(v.reasons.some((t) => /base drag with fins at the base/.test(t))).toBe(true);
    expect(v.change!.startsWith('To get a number')).toBe(false);
  });

  it('without WebGPU and nothing else refused: needs a browser with WebGPU, no number promised', async () => {
    const views = check(await curve(preset('basic-finner').design, false));
    const v = views.get(2)!;
    expect(v.reasons).toEqual([noseWords('no-webgpu', false).reason]);
    expect(v.change).toBe(
      'Needs a browser with WebGPU (a recent Chrome or Edge); then the airflow is solved here.',
    );
  });
});
