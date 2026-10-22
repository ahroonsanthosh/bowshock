/** Reviewer's adversarial inputs for verifiedTransonicDrag (not part of the branch). */
import { describe, expect, it } from 'vitest';
import { verifiedTransonicDrag, type TransonicEngine } from '../../src/analysis/transonic-drag';
import type { TransonicProblem } from '../../src/analysis/transonic-flow';
import type { Body } from '../../src/geometry/body';
import { domainAllowance } from '../../src/verification/domain-allowance';

const deg = Math.PI / 180;
const cone: Body = {
  nose: { shape: { kind: 'conical' }, length: 1 / Math.tan((6 + 59 / 60) * deg), baseRadius: 1 },
  cylinderLength: 0,
};
const ogive10: Body = {
  nose: { shape: { kind: 'ogive', parameter: 1 }, length: 20, baseRadius: 1 },
  cylinderLength: 0,
};
const cone10: Body = {
  nose: { shape: { kind: 'conical' }, length: 1 / Math.tan(10 * deg), baseRadius: 1 },
  cylinderLength: 0,
};

/** Converges to `converged(...)` with a damped oscillation (relative amplitude amp, period, decay). */
function engine(
  converged: (r: number, far?: number, cyl?: number) => number,
  shape: (steps: number) => number = (s) => 0.01 * 0.99 ** s,
): TransonicEngine {
  return (problem: TransonicProblem) => {
    const { refinement, nested } = problem.options;
    const target = converged(refinement, nested?.farField, nested?.cylinder);
    let steps = 0;
    return Promise.resolve({
      start: () => Promise.resolve(),
      iterate: (n) => {
        steps += n;
        return Promise.resolve();
      },
      drag: () => Promise.resolve(target * (1 + shape(steps))),
      cells: () => Promise.resolve(() => problem.freeStream.state),
      destroy: () => undefined,
    });
  };
}

const opts = { mach: 1.015, gamma: 1.4, finest: 8, checkEvery: 50 } as const;

describe('adversarial', () => {
  it('A1 overshoot: c1, c2 same sign, c2 tiny, the effect reverses beyond 224 radii', async () => {
    // Shaped on the nested cone data: at Mach 1.01 c1 = +2.86e-3, c2 = +9.03e-4,
    // c3 = -4.0e-5; at 1.02 c2 = -1.03e-4. In between, c2 passes through 0+.
    const own = 0.105;
    const trueInfinity = own - 6e-5; // the drag keeps falling past its peak
    const r = await verifiedTransonicDrag(
      cone,
      opts,
      engine((ref, far) => {
        const base = own + 2e-4 / ref ** 2 - 2e-4 / 64;
        return far === 50 ? base - 1.5e-3 : far === 200 ? base + 2e-6 : base;
      }),
    );
    console.log('A1', JSON.stringify(r.kind === 'solved' ? { value: r.value, band: r.band, parts: r.parts, far: r.allowances.farField.result } : r));
    expect(r.kind).toBe('solved');
    if (r.kind === 'solved') {
      console.log('A1 true domain error', trueInfinity - own, 'allowance', r.parts.farField, 'whole band', r.band);
    }
  });

  it('A2 negligible branch with slow decay (power law q = 0.45)', () => {
    const q = 0.45;
    const C = (D: number) => 0.1 - 1e-3 * D ** -q;
    const values = [C(55.1), C(100.6), C(224.2)] as [number, number, number];
    const band = 4 * Math.max(Math.abs(values[1] - values[0]), Math.abs(values[2] - values[1])) * 1.001;
    const a = domainAllowance(values, band, 1e-7);
    console.log('A2', JSON.stringify(a), 'true remainder', 1e-3 * 100.6 ** -q, 'band', band);
  });

  it('A3 Mach 1 + 2e-9 is not refused', async () => {
    const r = await verifiedTransonicDrag(
      cone,
      { ...opts, mach: 1 + 2e-9 },
      engine((ref, far) => 0.0917 - 2e-4 / ref + (far === 50 ? -1.9e-3 : far === 200 ? 1.1e-3 : 0)),
    );
    console.log('A3', r.kind, r.kind === 'solved' ? r.label : (r as { reason?: string }).reason);
  });

  it('A4 a damped oscillation of long period: the noise reported against the true iteration error', async () => {
    // Period 6000 steps, decay time 1800 steps (the nested Mach 1.02 base run's fit).
    const shape = (s: number) => 0.3 * Math.exp(-s / 1800) * Math.cos((2 * Math.PI * s) / 6000 + 0.3);
    const target = (ref: number) => 0.1098 + 1e-4 / ref;
    const levels: { refinement: number; drag: number; noise: number; steps: number }[] = [];
    await verifiedTransonicDrag(
      cone,
      { ...opts, onLevel: (l) => levels.push(l) },
      engine((ref) => target(ref), shape),
    );
    for (const l of levels) {
      console.log('A4', l.refinement, 'steps', l.steps, 'noise', l.noise.toExponential(2), 'true error', (l.drag / target(l.refinement) - 1).toExponential(2));
    }
  });

  it('A5 a 10-caliber ogive: RangeError only after the whole family', async () => {
    let solved = 0;
    await expect(
      verifiedTransonicDrag(
        ogive10,
        { ...opts, mach: 1.1, onLevel: () => solved++ },
        engine((ref) => 0.0114 + 1e-5 / ref ** 2),
      ),
    ).rejects.toThrow(RangeError);
    console.log('A5 levels solved before the RangeError', solved);
  });

  it('A6 the label of a 10 deg cone at Mach 1.15', async () => {
    const r = await verifiedTransonicDrag(
      cone10,
      { ...opts, mach: 1.19 },
      engine((ref) => 0.15 + 1e-4 / ref ** 2),
    );
    console.log('A6', r.kind, r.kind === 'solved' ? r.label : JSON.stringify(r));
  });
});
