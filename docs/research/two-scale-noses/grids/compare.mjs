// Compare two dumps of dump.test.ts: for each grid in both, whether every
// line (x, y, dx, dy, h) is identical, bit for bit.
// Usage: node compare.mjs <a.json> <b.json>
import { readFileSync } from 'node:fs';
const [a, b] = process.argv.slice(2).map((f) => JSON.parse(readFileSync(f, 'utf8')));
const both = Object.keys(a).filter((k) => k in b);
const differ = both.filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
const only = (x, y) => Object.keys(x).filter((k) => !(k in y));
console.log(
  `grids in both ${both.length}: identical ${both.length - differ.length}, differ ${differ.length}` +
    (differ.length ? ` (${differ.join(', ')})` : ''),
);
console.log(`only in the first: ${only(a, b).length}; only in the second: ${only(b, a).length}`);
