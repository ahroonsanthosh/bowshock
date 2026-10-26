// W6 build: per case, the family on nj = 20, 40, 80 (results.jsonl), and
// the references from the marches of characteristics (moc-<case>.jsonl),
// as docs/research/two-scale-noses/analysis/moc3.mjs computes them for the
// Von Karman noses:
// - a line passes W5's criterion where, on every grid, the march's mass
//   balance on its finest intervals and the change from the intervals
//   before are below 3.5e-5 (the change relative to the nose's drag);
// - the reference is the march extrapolated over the grids plus the
//   fitted drag upstream of the line extrapolated, each at its observed
//   order capped at 2 ("obs") and at second order ("2nd");
// - the lowest bound is the finest grid's march plus that upstream part;
// - the miss is the procedure's extrapolation (order capped at 2) minus
//   the reference, relative to the nose's drag; it is given for the
//   passing lines and for the lines next to them (as W5's allowance).
// Usage: node references.mjs <out dir> [case]
import { existsSync, readFileSync } from 'node:fs';

const dir = process.argv[2] ?? 'results';
const want = process.argv[3];
const CRITERION = 3.5e-5;
const read = (f) =>
  readFileSync(f, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));

const fits = new Map();
for (const r of read(`${dir}/results.jsonl`)) {
  if (r.kind !== 'fit') continue;
  if (!fits.has(r.tag)) fits.set(r.tag, {});
  fits.get(r.tag)[r.REF] = r; // the last record per grid
}
const ord = (a, b, c) => Math.log2((a - b) / (b - c));
const ext = (b, c, p) => c - (b - c) / (2 ** p - 1);
const cap = (p) => (Number.isFinite(p) ? Math.min(p, 2) : 2);
const e = (v) => (Number.isFinite(v) ? v.toExponential(2) : '-');

const summary = [];
for (const [tag, g] of [...fits.entries()].sort()) {
  if (want && tag !== want) continue;
  const rs = [1, 2, 4].filter((r) => g[r]);
  const T = Object.fromEntries(rs.map((r) => [r, g[r].drag]));
  console.log(`== ${tag}: ${rs.map((r) => `nj${20 * r} ${T[r].toPrecision(12)}`).join(', ')}`);
  for (const r of rs) {
    const x = g[r];
    console.log(
      `   nj${20 * r}: converged ${x.converged} (${x.iterations} its), checks ${x.caseFailure ?? 'pass'}, wall ${x.quality.wall.toFixed(1)} deg, size ${x.quality.sizeRatio.toFixed(3)}, aspect ${x.quality.aspect.toFixed(2)}, stagnation ${e(x.stagnationError)}`,
    );
  }
  const row = { tag, grids: rs.length, checks: rs.every((r) => !g[r].caseFailure && g[r].converged) };
  if (rs.length < 3) {
    summary.push(row);
    continue;
  }
  const pT = ord(T[1], T[2], T[4]);
  const procExt = ext(T[2], T[4], cap(pT));
  const band = (1.25 * Math.abs(T[2] - T[4])) / (2 ** cap(pT) - 1);
  Object.assign(row, { order: pT, band: band / T[4], value: T[4] });
  console.log(
    `   order ${pT.toFixed(3)}, procedure's extrapolation ${procExt.toPrecision(10)} (${e((procExt - T[4]) / T[4])}), one-triple band ${e(band / T[4])} of the drag`,
  );
  const mocFile = `${dir}/moc-${tag}.jsonl`;
  if (!existsSync(mocFile)) {
    summary.push(row);
    continue;
  }
  const L = new Map();
  for (const m of read(mocFile)) {
    if (!L.has(m.line)) L.set(m.line, { x: m.x, g: {} });
    const l = L.get(m.line);
    l.g[m.r] ??= { fitted: m.fitted, total: m.total, minMach: m.minMach, moc: {}, mass: {} };
    l.g[m.r].moc[m.n] = m.moc;
    l.g[m.r].mass[m.n] = m.mass;
  }
  const lines = [...L.keys()].sort((a, b) => a - b);
  const results = [];
  for (const line of lines) {
    const l = L.get(line);
    if (!rs.every((r) => l.g[r])) continue;
    const ns = (r) =>
      Object.keys(l.g[r].moc)
        .map(Number)
        .sort((a, b) => a - b);
    const finest = (r) => l.g[r].moc[ns(r).at(-1)];
    const change = (r) => {
      const n = ns(r);
      return n.length > 1 ? Math.abs(l.g[r].moc[n.at(-1)] - l.g[r].moc[n.at(-2)]) / T[r] : Infinity;
    };
    const mass = (r) => Math.abs(l.g[r].mass[ns(r).at(-1)]);
    const passes = rs.every((r) => mass(r) < CRITERION && change(r) < CRITERION && Number.isFinite(finest(r)));
    const F = rs.map((r) => l.g[r].fitted);
    const M = rs.map(finest);
    const U = rs.map((r, k) => T[r] - F[k]);
    const pM = ord(...M);
    const pU = ord(...U);
    const Uo = ext(U[1], U[2], cap(pU));
    const refO = ext(M[1], M[2], cap(pM)) + Uo;
    const ref2 = ext(M[1], M[2], 2) + Uo;
    const lower = M[2] + Uo;
    const res = {
      line,
      x: l.x,
      share: F[2] / T[4],
      minMach: l.g[4].minMach,
      passes,
      pM,
      missO: (procExt - refO) / T[4],
      miss2: (procExt - ref2) / T[4],
      finestMinusLower: (T[4] - lower) / T[4],
      refO,
      ref2,
      lower,
    };
    results.push(res);
    console.log(
      ` line ${line} x ${l.x.toFixed(4)} share ${(100 * res.share).toFixed(1)}% minM ${res.minMach.toFixed(3)} ${passes ? 'PASS' : 'fail'} (mass ${rs.map((r) => e(mass(r))).join(', ')}; change ${rs.map((r) => e(change(r))).join(', ')})`,
    );
    console.log(
      `   march order ${pM.toFixed(2)}, references ${refO.toPrecision(10)} (obs), ${ref2.toPrecision(10)} (2nd); miss ${e(res.missO)}, ${e(res.miss2)}; finest minus lowest bound ${e(res.finestMinusLower)}`,
    );
  }
  const used = results.filter((r) => r.passes);
  const neighbours = results.filter(
    (r, k) => !r.passes && (results[k - 1]?.passes || results[k + 1]?.passes),
  );
  const misses = [...used, ...neighbours].flatMap((r) => [Math.abs(r.missO), Math.abs(r.miss2)]);
  Object.assign(row, {
    passing: used.length,
    largestMiss: misses.length ? Math.max(...misses) : NaN,
    largestFinestMinusLower: used.length ? Math.max(...used.map((r) => r.finestMinusLower)) : NaN,
  });
  console.log(
    `   passing lines ${used.length}; largest miss over them and their neighbours ${e(row.largestMiss)}; largest finest minus lowest bound ${e(row.largestFinestMinusLower)}`,
  );
  summary.push(row);
}
console.log('\n== summary');
for (const r of summary) {
  console.log(
    `${r.tag}: grids ${r.grids}, checks ${r.checks}, order ${r.order?.toFixed(2) ?? '-'}, band ${e(r.band)}, passing lines ${r.passing ?? '-'}, largest miss ${e(r.largestMiss)}, finest minus lowest bound ${e(r.largestFinestMinusLower)}`,
  );
}
const all = summary.map((r) => r.largestMiss).filter(Number.isFinite);
if (all.length) console.log(`largest miss over every case: ${e(Math.max(...all))}; twice: ${e(2 * Math.max(...all))}`);
