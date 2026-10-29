// W5's seed.mjs (docs/research/two-scale-noses/runners/tmp-haackmoc), with
// the coarse save's fingerprint carried as seedFingerprint, which
// fitsave.test.ts checks: a starting checkpoint for a fit on the grid
// refined by 2 from a saved fit: each finer cell takes the state of the
// coarser cell it lies in (the families nest), each even line the coarser
// line's height, each odd line the mean of its two neighbours'. The
// converged fit does not depend on its start; this only shortens it.
// Usage: node seed.mjs <coarse save> <checkpoint out>
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
const [from, to] = process.argv.slice(2);
const head = JSON.parse(readFileSync(`${from}.json`, 'utf8'));
if (!head.fingerprint) throw new Error(`${from}: no fingerprint`);
const coarse = new Float64Array(readFileSync(`${from}.bin`).buffer.slice(0));
const { ni, nj } = head;
const fni = 2 * ni;
const fnj = 2 * nj;
const cells = new Float64Array(4 * fni * fnj);
for (let j = 0; j < fnj; j++) {
  for (let i = 0; i < fni; i++) {
    const c = 4 * (Math.floor(i / 2) + Math.floor(j / 2) * ni);
    const f = 4 * (i + j * fni);
    for (let q = 0; q < 4; q++) cells[f + q] = coarse[c + q];
  }
}
const h = head.heights;
const heights = [];
for (let k = 0; k <= fni; k++) heights.push(k % 2 === 0 ? h[k / 2] : 0.5 * (h[(k - 1) / 2] + h[(k + 1) / 2]));
writeFileSync(`${to}.bin.tmp`, Buffer.from(cells.buffer));
writeFileSync(
  `${to}.json.tmp`,
  JSON.stringify({ heights, iterations: 0, ni: fni, nj: fnj, seededFrom: from, seedFingerprint: head.fingerprint }),
);
renameSync(`${to}.bin.tmp`, `${to}.bin`);
renameSync(`${to}.json.tmp`, `${to}.json`);
console.log(`seeded ${to} (${fni} x ${fnj}) from ${from} (${ni} x ${nj})`);
