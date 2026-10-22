import { describe, expect, it } from 'vitest';
import { solveNoseDrag, solverFor, type NoseDragSolvers } from '../../src/analysis/nose-drag-solve';
import { verifiedTransonicDrag, type TransonicDrag } from '../../src/analysis/transonic-drag';
import type { VerifiedDrag } from '../../src/analysis/verified-drag';
import type { Body } from '../../src/geometry/body';

const deg = Math.PI / 180;
const cone: Body = {
  nose: { shape: { kind: 'conical' }, length: 1 / Math.tan((6 + 59 / 60) * deg), baseRadius: 1 },
  cylinderLength: 0,
};

/** Stand-ins that record which solver ran and return a fixed result. */
function recording(): { solvers: NoseDragSolvers; ran: string[] } {
  const ran: string[] = [];
  const transonic: TransonicDrag = { kind: 'cancelled', levels: [] };
  const fitted: VerifiedDrag = { kind: 'cancelled', reports: [] };
  return {
    ran,
    solvers: {
      transonic: () => {
        ran.push('transonic');
        return Promise.resolve(transonic);
      },
      fitted: () => {
        ran.push('fitted');
        return Promise.resolve(fitted);
      },
    },
  };
}

describe('the nose drag solver for a Mach number (design record 0013, serving rule 7)', () => {
  it('pins the ranges: [1, 1.2) transonic, 1.2 and up fitted, below 1 none', () => {
    expect(solverFor(0.999)).toBeNull();
    expect(solverFor(1)).toBe('transonic');
    expect(solverFor(1.1999)).toBe('transonic');
    expect(solverFor(1.2)).toBe('fitted');
    expect(solverFor(1.2001)).toBe('fitted');
    expect(solverFor(5)).toBe('fitted');
    expect(solverFor(Number.NaN)).toBeNull();
  });

  it.each([
    [0.999, null],
    [1, 'transonic'],
    [1.2, 'fitted'],
    [1.2001, 'fitted'],
  ] as const)('at Mach %s solveNoseDrag runs %s', async (mach, expected) => {
    const { solvers, ran } = recording();
    const outcome = await solveNoseDrag(cone, { mach, gamma: 1.4, finest: 8 }, solvers);
    expect(outcome.solver).toBe(expected);
    expect(ran).toEqual(expected === null ? [] : [expected]);
    if (expected === null) expect(outcome.status).toBe('refused');
  });

  it('the transonic solve itself refuses Mach numbers outside [1, 1.2), saying where the fitted solver serves', async () => {
    const engine = () => Promise.reject(new Error('not reached'));
    for (const mach of [0.999, 1.2, 1.2001]) {
      await expect(
        verifiedTransonicDrag(cone, { mach, gamma: 1.4, finest: 8 }, engine),
      ).rejects.toThrow('the transonic solve serves Mach 1 to 1.2 (the fitted solver from 1.2)');
    }
  });

  it('a body the fitted solver refuses by throwing comes back refused with the reason', async () => {
    const outcome = await solveNoseDrag(
      cone,
      { mach: 2, gamma: 1.4, finest: 8 },
      {
        transonic: () => Promise.reject(new Error('not reached')),
        fitted: () => Promise.reject(new Error('the shock would detach')),
      },
    );
    expect(outcome).toMatchObject({
      solver: 'fitted',
      status: 'refused',
      text: 'the shock would detach',
    });
  });
});
