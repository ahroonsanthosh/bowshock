// The march from fitted data against the fitted drag downstream, per case.
// Usage: node moc3.mjs moc.jsonl [case]
import { readFileSync } from 'node:fs';
const known = [
  ['C0 L3 M2 cyl2', [0.0806584338, 0.0804716502, 0.0804049623]],
  ['C0 L5 M1.5 cyl2', [0.0346246642, 0.0344608100, 0.0344269903]],
  ['C0 L3 M3 cyl2', [0.0730333563]],
];
const caseOf = (r) => {
  if (r.case) return r.case;
  for (const [name, totals] of known) if (totals.some((t) => Math.abs(r.total / t - 1) < 1e-8)) return name;
  return 'unknown';
};
const rows = readFileSync(process.argv[2], 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const want = process.argv[3];
const cases = new Map();
for (const r of rows) {
  const c = caseOf(r);
  if (want && c !== want) continue;
  if (!cases.has(c)) cases.set(c, { T: {}, L: new Map() });
  const e = cases.get(c);
  e.T[r.r] = r.total;
  if (!e.L.has(r.line)) e.L.set(r.line, { x: r.x, g: {} });
  const l = e.L.get(r.line);
  l.g[r.r] ??= { fitted: r.fitted, minMach: r.minMach, m: {}, mass: {} };
  l.g[r.r].m[r.n] = r.moc;
  l.g[r.r].mass[r.n] = r.mass;
}
const ord = (a, b, c) => Math.log2((a - b) / (b - c));
const ext = (b, c, p) => c - (b - c) / (2 ** p - 1);
for (const [name, { T, L }] of cases) {
  const rs = [1, 2, 4].filter((r) => T[r] !== undefined);
  const nose = T[rs.at(-1)];
  const f = (v) => (v / nose).toExponential(2);
  console.log(`== ${name}: totals ${rs.map((r) => T[r].toPrecision(12)).join(', ')}`);
  let pT = NaN, procExt = NaN;
  if (rs.length === 3) {
    pT = ord(T[1], T[2], T[4]);
    procExt = ext(T[2], T[4], Math.min(pT, 2));
    console.log(`   order ${pT.toFixed(3)}, procedure's extrapolation ${procExt.toPrecision(10)} (${f(procExt - T[4])}), GCI ${f(1.25 * (T[2] - T[4]) / (2 ** Math.min(pT, 2) - 1))}`);
  }
  for (const [line, e] of [...L.entries()].sort((a, b) => a[0] - b[0])) {
    const rr = rs.filter((r) => e.g[r]);
    const best = {}, ierr = {};
    for (const r of rr) {
      const ns = Object.keys(e.g[r].m).map(Number).sort((a, b) => a - b);
      best[r] = e.g[r].m[ns.at(-1)];
      ierr[r] = ns.length > 1 ? e.g[r].m[ns.at(-1)] - e.g[r].m[ns.at(-2)] : NaN;
    }
    const F = rr.map((r) => e.g[r].fitted), M = rr.map((r) => best[r]);
    const U = rr.map((r, k) => T[r] - F[k]);
    const last = rr.at(-1);
    console.log(` line ${line} x ${e.x.toFixed(4)} share ${(100 * F.at(-1) / T[last]).toFixed(1)}% minM ${e.g[last].minMach.toFixed(3)} mass(last) ${Object.values(e.g[last].mass).at(-1)?.toExponential(1)}`);
    console.log(`   fitted ${F.map((v) => v.toPrecision(10)).join(', ')}; march ${M.map((v) => v.toPrecision(10)).join(', ')}; last interval changes ${rr.map((r) => f(ierr[r])).join(', ')}`);
    console.log(`   fitted - march ${F.map((v, k) => f(v - M[k])).join(', ')}`);
    if (rr.length === 3) {
      const pF = ord(...F), pM = ord(...M), pU = ord(...U);
      const Uo = ext(U[1], U[2], Math.min(pU, 2));
      const refO = ext(M[1], M[2], Math.min(pM, 2)) + Uo, ref2 = ext(M[1], M[2], 2) + Uo;
      const lower = M[2] + Uo;
      console.log(`   orders: fitted ${pF.toFixed(2)}, march ${pM.toFixed(2)}, upstream part ${pU.toFixed(2)}; references (march + upstream extrapolated): obs ${refO.toPrecision(10)}, 2nd ${ref2.toPrecision(10)}; lower bound ${lower.toPrecision(10)}`);
      console.log(`   procedure's extrapolation minus reference: obs ${f(procExt - refO)}, 2nd ${f(procExt - ref2)}; finest minus reference: ${f(T[4] - refO)}, ${f(T[4] - ref2)}; finest minus lower bound ${f(T[4] - lower)}`);
    }
  }
}
