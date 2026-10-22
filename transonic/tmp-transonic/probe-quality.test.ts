import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { transonicGrid } from '../../src/grid/transonic-grid';
import { nodeIndex } from '../../src/grid/structured';

const out = 'tests/tmp-transonic/probe-quality.jsonl';
const deg = Math.PI / 180;
it('quality', () => {
  const half = (6 + 59 / 60) * deg;
  const body = {
    nose: { shape: { kind: 'conical' as const }, length: 1 / Math.tan(half), baseRadius: 1 },
    cylinderLength: 0,
  };
  const { grid } = transonicGrid(body, { refinement: Number(process.env.REF ?? 1), farField: 100, cylinder: 10 });
  const { ni, nj, x, y } = grid;
  const node = (i: number, j: number) => [x[nodeIndex(grid, i, j)]!, y[nodeIndex(grid, i, j)]!];
  const worst: Record<string, { v: number; i: number; j: number }> = {
    angle: { v: 999, i: -1, j: -1 },
    width: { v: 0, i: -1, j: -1 },
    height: { v: 0, i: -1, j: -1 },
    aspect: { v: 0, i: -1, j: -1 },
  };
  const w = (i: number, j: number) => {
    const [a, b] = [node(i, j), node(i + 1, j)];
    const [c, d] = [node(i, j + 1), node(i + 1, j + 1)];
    return 0.5 * (Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!) + Math.hypot(d[0]! - c[0]!, d[1]! - c[1]!));
  };
  const h = (i: number, j: number) => {
    const [a, b] = [node(i, j), node(i, j + 1)];
    const [c, d] = [node(i + 1, j), node(i + 1, j + 1)];
    return 0.5 * (Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!) + Math.hypot(d[0]! - c[0]!, d[1]! - c[1]!));
  };
  for (let j = 0; j < nj; j++) {
    for (let i = 0; i < ni; i++) {
      const c = [node(i, j), node(i + 1, j), node(i + 1, j + 1), node(i, j + 1)];
      for (let k = 0; k < 4; k++) {
        const a = c[k]!;
        const b = c[(k + 1) % 4]!;
        const p = c[(k + 3) % 4]!;
        const ang =
          Math.acos(
            ((b[0]! - a[0]!) * (p[0]! - a[0]!) + (b[1]! - a[1]!) * (p[1]! - a[1]!)) /
              (Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!) * Math.hypot(p[0]! - a[0]!, p[1]! - a[1]!)),
          ) / deg;
        if (ang < worst.angle!.v) worst.angle = { v: ang, i, j };
      }
      const ar = Math.max(w(i, j) / h(i, j), h(i, j) / w(i, j));
      if (ar > worst.aspect!.v) worst.aspect = { v: ar, i, j };
      const yc = 0.25 * (c[0]![1]! + c[1]![1]! + c[2]![1]! + c[3]![1]!);
      if (yc > 5 && ar > (worst.aspectAway?.v ?? 0)) worst.aspectAway = { v: ar, i, j };
      if (yc < 5 && i > 30 && ar > (worst.aspectNear?.v ?? 0)) worst.aspectNear = { v: ar, i, j };
      if (i + 1 < ni) {
        const r = Math.max(w(i, j) / w(i + 1, j), w(i + 1, j) / w(i, j));
        if (r > worst.width!.v) worst.width = { v: r, i, j };
      }
      if (j + 1 < nj) {
        const r = Math.max(h(i, j) / h(i, j + 1), h(i, j + 1) / h(i, j));
        if (r > worst.height!.v) worst.height = { v: r, i, j };
      }
    }
  }
  const at = (k: { i: number; j: number }) => node(k.i, k.j);
  appendFileSync(
    out,
    JSON.stringify(
      Object.fromEntries(Object.entries(worst).map(([k, v]) => [k, { ...v, at: at(v) }])),
    ) + '\n',
  );
});
