// W6 build: a starting checkpoint from the W6 probe's converged fit of the
// same case and grid (same ni and nj, checked by fit.test.ts on resume):
// the probe's cells and shock heights, the iteration count reset to 0.
// The converged fit does not depend on its start; this only shortens it.
// Usage: node adopt.mjs <probe save> <checkpoint out>
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
const [from, to] = process.argv.slice(2);
const head = JSON.parse(readFileSync(`${from}.json`, 'utf8'));
copyFileSync(`${from}.bin`, `${to}.bin`);
writeFileSync(
  `${to}.json`,
  JSON.stringify({ heights: head.heights, iterations: 0, ni: head.ni, nj: head.nj, adoptedFrom: from }),
);
console.log(`adopted ${to} (${head.ni} x ${head.nj}) from ${from}`);
