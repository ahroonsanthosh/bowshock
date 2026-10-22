/** Evaluates the pre-registered test of the corrected allowance rule (0013, 20ab07a), and case A. */
import { readFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { domainAllowance } from '../../src/verification/domain-allowance';
import { gridConvergence } from '../../src/verification/grid-convergence';

const drag = (tag: string): { drag: number; far: number } => {
  const lines = readFileSync(`tests/tmp-transonic/results/${tag}.jsonl`, 'utf8').trim().split('\n');
  const l = lines.map((x) => JSON.parse(x) as { converged: boolean; refinement: number; drag: number; farRadius: number })
    .find((x) => x.converged && x.refinement === 1)!;
  return { drag: l.drag, far: l.farRadius };
};

it('s2 test', () => {
  const out: string[] = ['| Case | a (55.1 to 100.6) | b (100.6 to 224.2) | Rule | Allowance | C(408.7) - C(100.6) | Verdict |', '| --- | --- | --- | --- | --- | --- | --- |'];
  for (const c of ['cone7-m1.005', 'cone7-m1.0125', 'cone7-m1.025', 'ogive5-m1.01', 'ogive5-m1.02', 'ogive5-m1.03']) {
    const v = ['f50', 'base', 'f200', 'f400'].map((s) => drag(`t-${c}-${s}`));
    const three = [v[0]!.drag, v[1]!.drag, v[2]!.drag] as const;
    const noise = 3.5e-6 / Math.max(...three.map(Math.abs));
    const a = domainAllowance(three, [v[0]!.far, v[1]!.far, v[2]!.far], noise);
    const truth = v[3]!.drag - v[1]!.drag;
    const verdict = a.kind === 'refused' ? 'refused (not a failure)' : Math.abs(truth) <= a.allowance ? 'contained' : 'FAILS';
    out.push(`| ${c} | ${a.changes[0].toExponential(3)} | ${a.changes[1].toExponential(3)} | ${a.kind} | ${a.kind === 'refused' ? '' : a.allowance.toExponential(3)} | ${truth.toExponential(3)} | ${verdict} |`);
    // The moved frame, for the record (no larger domain to test against).
    const moved = [v[1]!.drag, v[2]!.drag, v[3]!.drag] as const;
    const m = domainAllowance(moved, [v[1]!.far, v[2]!.far, v[3]!.far], 3.5e-6 / Math.max(...moved.map(Math.abs)));
    out.push(`| ${c}, family on 224.2 | ${m.changes[0].toExponential(3)} | ${m.changes[1].toExponential(3)} | ${m.kind} | ${m.kind === 'refused' ? '' : m.allowance.toExponential(3)} | | not testable |`);
  }
  // Case A: the 3-caliber tangent ogive at Mach 1.2.
  const fam = [0.10952300682872691, 0.10891098521113923, 0.10887237169358288, 0.10889830735173912];
  const e = gridConvergence(fam, { orderTolerance: 0.5, noise: 1e-7 });
  const far = domainAllowance([drag('n-ogive3-m1.2-f50').drag, fam[0]!, drag('n-ogive3-m1.2-f200').drag], [55.10160405104679, 100.60719837318378, 224.2118229126046], 1e-7);
  const L = 6;
  const cyl = (x: number) => (x - L) / 2;
  const cylA = domainAllowance(
    [drag('n-ogive3-m1.2-c5').drag, fam[0]!, drag('n-ogive3-m1.2-c20').drag],
    [cyl(L + 10), cyl(L + 20), cyl(L + 40)],
    1e-7,
  );
  out.push('', `case A: ${JSON.stringify(e)}`, `far ${JSON.stringify(far)}`, `cylinder ${JSON.stringify(cylA)}`);
  if (e.kind !== 'unresolved') {
    const floor = 7e-5 * e.value;
    const fa = far.kind === 'refused' ? NaN : far.allowance;
    const ca = cylA.kind === 'refused' ? NaN : cylA.allowance;
    out.push(`value ${e.value} grids ${e.uncertainty} floor ${floor} far ${fa} cylinder ${ca} band ${e.uncertainty + floor + fa + ca}`);
  }
  writeFileSync('tests/tmp-transonic/s2test-eval.md', out.join('\n') + '\n');
});
