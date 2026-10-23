/** The engine's packed forms (src/solver3d/flux3d.ts) against the object forms the other tests check. */

import { describe, expect, it } from 'vitest';
import {
  hllc3D,
  hllc3DPacked,
  reconstruct3D,
  reconstructPacked,
  type Primitive3D,
} from '../../src/solver3d/flux3d';
import { random } from './helpers';

const GAMMA = 1.4;

function state(rand: () => number): Primitive3D {
  return {
    rho: 0.5 + rand(),
    u: 3 * (rand() - 0.5),
    v: 3 * (rand() - 0.5),
    w: 3 * (rand() - 0.5),
    p: 0.5 + 2 * rand(),
  };
}

describe('the packed forms used by the engine', () => {
  it('give the same values as reconstruct3D and hllc3D, exactly', () => {
    const rand = random(4);
    const P = new Float64Array(15);
    const out = new Float64Array(5);
    const f1 = new Float64Array(5);
    const f2 = new Float64Array(5);
    for (let n = 0; n < 500; n++) {
      const s = [state(rand), state(rand), state(rand)];
      s.forEach((q, c) => {
        P.set([q.rho, q.u, q.v, q.w, q.p], 5 * c);
      });
      for (const side of [1, -1] as const) {
        reconstructPacked(P, 0, 5, 10, side, GAMMA, out);
        const o = reconstruct3D(s[0]!, s[1]!, s[2]!, side, GAMMA);
        expect(Array.from(out)).toEqual([o.rho, o.u, o.v, o.w, o.p]);
      }
      hllc3D(s[0]!, s[1]!, 0.6, 0, 0.8, GAMMA, f1);
      hllc3DPacked(P.subarray(0, 5), P.subarray(5, 10), 0.6, 0, 0.8, GAMMA, f2);
      expect(Array.from(f2)).toEqual(Array.from(f1));
    }
  });
});
