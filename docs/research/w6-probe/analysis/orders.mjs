// W6 probe: per case, the drags on nj = 20, 40, 80 from results.jsonl (the
// last record per grid), the observed order, the second-order and
// observed-order extrapolations, the finest grid's band as the page
// computes it from one triple (1.25 |e21| / (2^p - 1), p capped at 2), and
// the probe's criteria. Usage: node orders.mjs results/results.jsonl
import { readFileSync } from 'node:fs';

const rows = readFileSync(process.argv[2] ?? 'results/results.jsonl', 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l))
  .filter((r) => r.kind === 'fit');
const byCase = new Map();
for (const r of rows) {
  const key = `rn ${r.ratio} M ${r.M}`;
  if (!byCase.has(key)) byCase.set(key, {});
  byCase.get(key)[r.REF] = r;
}
const fmt = (x, d = 3) => (x === undefined ? '-' : x.toExponential(d));
for (const [key, g] of byCase) {
  const refs = [1, 2, 4].filter((k) => g[k]);
  const d = refs.map((k) => g[k].drag);
  const line = [`${key}:`];
  for (const k of refs) {
    const r = g[k];
    line.push(
      `nj${20 * k} ${r.drag.toPrecision(10)} conv ${r.converged} its ${r.iterations} stag ${fmt(r.stagnationError, 2)} wall ${r.quality.wall.toFixed(1)} size ${r.quality.sizeRatio.toFixed(3)} aspect ${r.quality.aspect.toFixed(2)} outflow ${r.outflowMach.toFixed(3)} base ${r.baseMach === null ? 'end' : r.baseMach.toFixed(3)} checks ${r.caseFailure ?? 'pass'} cap ${r.capDrag.toPrecision(6)}`,
    );
  }
  if (d.length === 3) {
    const e21 = d[1] - d[0];
    const e32 = d[2] - d[1];
    const ratio = e21 / e32;
    const p = Math.log(ratio) / Math.log(2);
    const pc = Math.min(p, 2);
    const ext2 = d[2] + e32 / 3;
    const extp = d[2] + e32 / (2 ** p - 1);
    const band = (1.25 * Math.abs(e32)) / (2 ** pc - 1);
    line.push(
      `ratio ${ratio.toFixed(3)} order ${p.toFixed(3)} monotone ${Math.sign(e21) === Math.sign(e32)} ext(2) ${ext2.toPrecision(10)} ext(p) ${extp.toPrecision(10)} finest band ${fmt(band / Math.abs(d[2]), 2)} of the drag; takes it (order 1.5 to 2.5, monotone, checks) ${p >= 1.5 && p <= 2.5 && ratio > 0 && refs.every((k) => g[k].converged && !g[k].caseFailure)}`,
    );
  } else if (d.length === 2) {
    line.push(`change 20 to 40: ${fmt((d[1] - d[0]) / d[1], 2)} of the drag`);
  }
  console.log(line.join('\n  '));
}
