// Throwaway: the captured-shock solver (CPU) on a case, nj = 20 to 160, recording every level.
// Env: CASE, OUT, MAXREF (default 8).
import { test } from 'vitest';
import { append, bodyOf, caseOf, gamma } from './common';
import {
  CPU_NOISE,
  DRAG_FLOOR,
  ORDER_TOLERANCE,
  cpuEngine,
  verifiedForebodyDrag,
} from './snap/src/analysis/verified-drag';
import { bodyGrid } from './snap/src/grid/body-grid';

const OUT = process.env.OUT!;
const c = caseOf(process.env.CASE!);
const maxRefinement = Number(process.env.MAXREF ?? 8);

test(`captured ${c.id}`, async () => {
  const body = bodyOf(c);
  const failures: string[][] = [];
  (globalThis as { SUBTIP_GATE_FAILURES?: string[][] }).SUBTIP_GATE_FAILURES = failures;
  for (let r = 1; r <= maxRefinement; r *= 2) {
    const { grid, iTip, outerAngle } = bodyGrid(body, { nj: 20, refinement: r, mach: c.mach, gamma });
    append({ kind: 'captured-grid', id: c.id, refinement: r, ni: grid.ni, nj: grid.nj, iTip, outerAngleDeg: (outerAngle * 180) / Math.PI, gateFailures: failures[failures.length - 1] }, OUT);
  }
  const t0 = Date.now();
  let tLevel = Date.now();
  const result = await verifiedForebodyDrag(
    body,
    {
      mach: c.mach,
      gamma,
      tolerance: 0,
      maxRefinement,
      noise: CPU_NOISE,
      floor: DRAG_FLOOR,
      orderTolerance: ORDER_TOLERANCE,
      onLevel: (level) => {
        append({ kind: 'captured-level', id: c.id, ...level, elapsed: (Date.now() - tLevel) / 1000 }, OUT);
        tLevel = Date.now();
      },
      onProgress: (refinement, iterations, drag) => {
        append({ kind: 'captured-progress', id: c.id, refinement, iterations, drag }, OUT);
      },
    },
    cpuEngine,
  );
  append({ kind: 'captured-result', id: c.id, result, elapsed: (Date.now() - t0) / 1000 }, OUT);
});
