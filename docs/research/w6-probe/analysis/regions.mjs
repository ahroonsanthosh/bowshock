// W6 probe: the family's drag split by region of the body (diag.jsonl from
// runners/diag.test.ts), with each region's change between grids relative
// to the whole drag, and its order. Usage: node regions.mjs results/diag.jsonl
import { readFileSync } from 'node:fs';

const rows = readFileSync(process.argv[2] ?? 'results/diag.jsonl', 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l));
const cases = new Map();
for (const r of rows) {
  if (!cases.has(r.id)) cases.set(r.id, {});
  cases.get(r.id)[r.REF] = r; // the last record per grid
}
for (const [id, g] of cases) {
  const refs = [1, 2, 4].filter((k) => g[k]);
  const st = g[refs[0]].stations;
  const D = g[refs[refs.length - 1]].total;
  console.log(`${id} (drag ${D.toPrecision(8)}; changes relative to it)`);
  const edges = [0, ...st, Infinity];
  for (let s = 0; s <= st.length; s++) {
    const part = (k) =>
      (s < st.length ? g[k].ahead[s] : g[k].total) - (s > 0 ? g[k].ahead[s - 1] : 0);
    const v = refs.map(part);
    const c = v.slice(1).map((x, i) => (x - v[i]) / D);
    const order = c.length === 2 ? Math.log(c[0] / c[1]) / Math.log(2) : NaN;
    console.log(
      `  x ${edges[s].toPrecision(3)} to ${edges[s + 1].toPrecision(3)}: ${v[v.length - 1].toExponential(4)}; changes ${c.map((x) => x.toExponential(2)).join(', ')}${Number.isNaN(order) ? '' : `; order ${order.toFixed(2)}`}`,
    );
  }
}
