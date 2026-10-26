// W6 build: the capped geometry after the review's fixes (this branch's
// src) against the geometry the reference lanes run (the frozen tree's src
// at ae794e4), at the lanes' cases: the cap's offset and tangent point and
// the radius along the nose. Run from tests/w6dbg/ (a copy of this file):
// npx vitest run tests/w6dbg/geometry-compare.test.ts; writes OUT.
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { cappedNose, noseRadius, type Nose } from '../../src/geometry/nose';
import {
  cappedNose as lanesCappedNose,
  noseRadius as lanesNoseRadius,
} from '../tmp-w6b/tree/src/geometry/nose';

const OUT =
  process.env.OUT ?? '/home/user/bowshock/.claude/worktrees/agent-aebcae66a0febc475/tests/tmp-w6b/out/geometry-compare.json';

it('geometry against the lanes', () => {
  const rows: object[] = [];
  for (const [kind, parameter] of [
    ['ogive', 1],
    ['haack', 0],
  ] as const) {
    for (const calibers of [3, 5]) {
      for (const ratio of [0.03, 0.05, 0.15]) {
        const make = (): Nose => ({
          shape: { kind, parameter },
          length: calibers,
          baseRadius: 0.5,
          tipRadius: 0.5 * ratio,
        });
        const now = make();
        const lanes = make();
        const a = cappedNose(now);
        const b = lanesCappedNose(lanes);
        let worst = 0;
        let worstAt = 0;
        for (let k = 0; k <= 20000; k++) {
          // Clustered at the tip, where the cap and its tangent point lie.
          const x = calibers * (k / 20000) ** 3;
          const d = Math.abs(noseRadius(now, x) - lanesNoseRadius(lanes, x)) / 0.5;
          if (d > worst) {
            worst = d;
            worstAt = x;
          }
        }
        rows.push({
          shape: kind,
          calibers,
          ratio,
          offset: a.offset,
          offsetChange: a.offset - b.offset,
          tangentX: a.tangentX,
          tangentXChange: a.tangentX - b.tangentX,
          parentLengthChange: a.parent.length - b.parent.length,
          largestRadiusChangeOverR: worst,
          at: worstAt,
        });
      }
    }
  }
  writeFileSync(OUT, JSON.stringify(rows, null, 1));
});
