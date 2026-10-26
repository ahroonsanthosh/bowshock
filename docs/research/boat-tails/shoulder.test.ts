/**
 * The wall pressure behind the shoulder (design record 0023 section 2.4):
 * for each case named in CASES (comma-separated), the march's pressure just
 * ahead of the shoulder and just behind it (its Prandtl-Meyer fan), and each
 * fitted grid's wall pressure coefficient from the lane's results against
 * Prandtl-Meyer and against the march at the same station. Appends to
 * out/shoulder.txt. Run: ONLY=./shoulder.test.ts CASES=... npx vitest run
 * --config docs/research/boat-tails/vitest.config.ts
 */
import { fileURLToPath } from 'node:url';
import { appendFileSync, readFileSync } from 'node:fs';
import { it } from 'vitest';
import { characteristics } from '../../../src/validation/characteristics';
import { bodyLength, shoulderPosition } from '../../../src/geometry/body';
import { CASES, GAMMA, RM_E51F26, caseBody } from './cases';
import { sharpFitProblem } from '../../../src/analysis/fitted-flow';

const OUT = fileURLToPath(new URL('./out/shoulder.txt', import.meta.url));
const out = (line: string) => appendFileSync(OUT, line + '\n');

it('the wall pressure behind the shoulder: fitted grids against the march', () => {
  const names = (process.env.CASES ?? 'o3-c3-bt6-l1-m2').split(',');
  for (const name of names) {
    const c = [...CASES, ...RM_E51F26].find((k) => k.name === name)!;
    const asked = caseBody(c);
    const lines = sharpFitProblem(asked, { mach: c.mach, gamma: GAMMA, nj: 20, refinement: 1 }).lines;
    const extra = lines[lines.length - 1]!.x - bodyLength(asked);
    const tail = asked.boatTail!;
    const slope = (0.5 - tail.baseRadius) / tail.length;
    const solved = { ...asked, boatTail: { length: tail.length + extra, baseRadius: tail.baseRadius - extra * slope } };
    const xs = shoulderPosition(asked);
    const xb = bodyLength(asked);
    const sol = characteristics(solved, { mach: c.mach, gamma: GAMMA, intervals: 1280, start: 1e-3 });
    const q = 0.5 * GAMMA * c.mach * c.mach;
    const corner = sol.wall.filter((w) => w.x === xs);
    const pm = (corner[1]!.p - 1) / q;
    const ahead = (corner[0]!.p - 1) / q;
    // March's wall Cp at x, linear between its wall points (after the fan).
    const after = sol.wall.filter((w, k) => w.x > xs || (w.x === xs && k > 0 && sol.wall[k - 1]!.x === xs));
    const mocCp = (x: number) => {
      let k = 0;
      while (k + 2 < after.length && after[k + 1]!.x < x) k++;
      const a = after[k]!;
      const b = after[k + 1]!;
      return ((a.p + ((x - a.x) / (b.x - a.x)) * (b.p - a.p)) - 1) / q;
    };
    out(`== ${name}: Cp ahead of the shoulder ${ahead.toFixed(6)}, behind (Prandtl-Meyer) ${pm.toFixed(6)}`);
    const rows = readFileSync(fileURLToPath(new URL(`./out/${name}.jsonl`, import.meta.url)), 'utf8')
      .split('\n')
      .filter((l) => l.includes('"kind":"fit"'))
      .map((l) => JSON.parse(l) as { refinement: number; cpWall: [number, number][] });
    for (const r of rows) {
      const faces = r.cpWall.filter(([x]) => x > xs && x < xb);
      const first = faces[0]!;
      const errs = faces.map(([x, cp]) => [x, cp - mocCp(x)] as const);
      const worst = errs.reduce((m, e) => (Math.abs(e[1]) > Math.abs(m[1]) ? e : m));
      const mid = errs[Math.floor(errs.length / 2)]!;
      out(
        `  nj ${20 * r.refinement}: first face x - xs ${(first[0] - xs).toExponential(2)} Cp ${first[1].toFixed(6)} (PM ${(first[1] - pm).toExponential(2)}, march there ${(first[1] - mocCp(first[0])).toExponential(2)}); worst ${worst[1].toExponential(2)} at x - xs ${(worst[0] - xs).toFixed(3)}; mid ${mid[1].toExponential(2)}; last ${errs[errs.length - 1]![1].toExponential(2)}`,
      );
    }
  }
});
