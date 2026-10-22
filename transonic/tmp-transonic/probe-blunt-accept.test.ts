/** Which Mach numbers the supersonic blunt grid accepts for the hemisphere and 2:1 ellipsoid (no solve). */
import { appendFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import type { Body } from '../../src/geometry/body';
import { bluntBodyGrid } from '../../src/grid/blunt-grid';

it('blunt grid acceptance', () => {
  const out = 'tests/tmp-transonic/probe-blunt-accept.jsonl';
  writeFileSync(out, '');
  for (const L of [1, 2]) {
    for (const cyl of [2, 4, 8, 12, 16, 24]) {
      const body: Body = {
        nose: { shape: { kind: 'ellipsoid' }, length: L, baseRadius: 1 },
        cylinderLength: cyl,
      };
      for (const mach of [1.2]) {
        let result = 'accepted';
        try {
          bluntBodyGrid(body, { nj: 20, mach });
        } catch (error) {
          result = String(error);
        }
        appendFileSync(out, JSON.stringify({ L, cyl, mach, result }) + '\n');
      }
    }
  }
});
