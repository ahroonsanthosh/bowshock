// The criteria registered in 0006 ("Widening the outline: registration",
// 2026-10-27), applied to W5's references and the new ones: per case, the
// fits (settled, gates, monotone), the lines passing W5's line criterion,
// their references, lowest bounds and misses (as analysis/moc3.mjs), the
// allowance by W5's rule (twice the largest miss, over every passing line
// and, for a case resting on one passing line, the marched lines next to
// it, rounded up to one significant figure), and each band's containment
// of its error against the lowest bound of every passing line.
//
// Usage: node judge.mjs <W5 moc.jsonl> <new out dir> [--json out.json]
// The new out dir holds the saves (L<cal>c<cyl>M<mach>r<ref>.json) and the
// marches (moc-L<cal>c<cyl>M<mach>.jsonl) of the lanes.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const LIMIT = 3.5e-5;
const MAXIT = 40000;
const [w5File, newDir] = process.argv.slice(2);
const jsonOut = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : undefined;

const ord = (a, b, c) => Math.log2((a - b) / (b - c));
const ext = (b, c, p) => c - (b - c) / (2 ** p - 1);
const monotone = (a, b, c) => (a - b) * (b - c) > 0;
/** Rounded up to one significant figure. */
export const ceil1 = (v) => {
  const e = Math.floor(Math.log10(v));
  const m = v / 10 ** e;
  return (Math.ceil(m - 1e-9) * 10 ** e);
};

// W5's cases (moc3.mjs's names for rows without a case field).
const known = [
  ['C0 L3 M2 cyl2', [0.0806584338, 0.0804716502, 0.0804049623]],
  ['C0 L5 M1.5 cyl2', [0.03462466420, 0.03446081, 0.03442699030]],
  ['C0 L3 M3 cyl2', [0.0730333563]],
];
const caseOf = (r) => {
  if (r.case) return r.case;
  for (const [name, totals] of known) if (totals.some((t) => Math.abs(r.total / t - 1) < 1e-8)) return name;
  return 'unknown';
};

/** Cases from march rows: totals per grid, and per line per grid the fitted drag, marches and mass balances. */
function casesFrom(rows) {
  const cases = new Map();
  for (const r of rows) {
    const c = caseOf(r);
    if (!cases.has(c)) cases.set(c, { T: {}, L: new Map() });
    const e = cases.get(c);
    e.T[r.r] = r.total;
    if (!e.L.has(r.line)) e.L.set(r.line, { x: r.x, g: {} });
    const l = e.L.get(r.line);
    l.g[r.r] ??= { fitted: r.fitted, minMach: r.minMach, m: {}, mass: {} };
    l.g[r.r].m[r.n] = r.moc;
    l.g[r.r].mass[r.n] = r.mass;
  }
  return cases;
}

function judgeLines(name, { T, L }) {
  const T4 = T[4];
  const fam = { T1: T[1], T2: T[2], T4 };
  const pT = ord(T[1], T[2], T[4]);
  const pc = Math.min(pT, 2);
  fam.order = pT;
  fam.monotone = monotone(T[1], T[2], T[4]);
  fam.procExt = ext(T[2], T[4], pc);
  fam.band = (1.25 * Math.abs(T[2] - T[4])) / (2 ** pc - 1) / T4;
  const lines = [];
  for (const [line, e] of [...L.entries()].sort((a, b) => a[0] - b[0])) {
    const rs = [1, 2, 4];
    const out = { line, x: e.x, share: e.g[4]?.fitted / T4, reasons: [] };
    if (!rs.every((r) => e.g[r])) {
      out.reasons.push('not marched on every grid');
      lines.push(out);
      continue;
    }
    const mass = rs.map((r) => e.g[r].mass[2560]);
    const change = rs.map((r) => (e.g[r].m[2560] - e.g[r].m[1280]) / T4);
    out.mass = mass;
    out.change = change;
    out.minMach = rs.map((r) => e.g[r].minMach);
    if (mass.some((v) => v === undefined) || change.some((v) => !Number.isFinite(v)))
      out.reasons.push('no march on 1280 and 2560 intervals on every grid');
    else {
      if (mass.some((v) => !(Math.abs(v) < LIMIT))) out.reasons.push(`mass balance ${mass.map((v) => v.toExponential(1)).join(', ')}`);
      if (change.some((v) => !(Math.abs(v) < LIMIT))) out.reasons.push(`change from 1280 ${change.map((v) => v.toExponential(1)).join(', ')}`);
    }
    const F = rs.map((r) => e.g[r].fitted);
    const M = rs.map((r) => e.g[r].m[2560] ?? e.g[r].m[Math.max(...Object.keys(e.g[r].m).map(Number))]);
    const U = rs.map((r, k) => T[r] - F[k]);
    out.marchOrder = ord(...M);
    out.upstreamOrder = ord(...U);
    out.fittedOrder = ord(...F);
    const reference = monotone(...M) && monotone(...U);
    if (!reference) out.reasons.push(`not monotone (march ${monotone(...M)}, upstream ${monotone(...U)})`);
    else {
      const Uo = ext(U[1], U[2], Math.min(out.upstreamOrder, 2));
      out.refObserved = ext(M[1], M[2], Math.min(out.marchOrder, 2)) + Uo;
      out.refSecond = ext(M[1], M[2], 2) + Uo;
      out.lowest = M[2] + Uo;
      out.miss = [(fam.procExt - out.refObserved) / T4, (fam.procExt - out.refSecond) / T4];
      out.finestMinusLowest = (T4 - out.lowest) / T4;
    }
    out.passes = out.reasons.length === 0;
    lines.push(out);
  }
  return { name, fam, lines };
}

// W5's cases.
const w5 = casesFrom(readFileSync(w5File, 'utf8').trim().split('\n').map((l) => JSON.parse(l)));
const judged = [...w5.entries()].map(([n, c]) => ({ ...judgeLines(n, c), source: 'W5' }));

// The new cases: their saves and marches.
const fits = {};
if (newDir && existsSync(newDir)) {
  for (const f of readdirSync(newDir)) {
    const m = /^(L[\d.]+c\d+M[\d.]+)r(\d)\.json$/.exec(f);
    if (!m) continue;
    const head = JSON.parse(readFileSync(join(newDir, f), 'utf8'));
    (fits[m[1]] ??= {})[m[2]] = head;
  }
  for (const f of readdirSync(newDir)) {
    const m = /^moc-(L[\d.]+c\d+M[\d.]+)\.jsonl$/.exec(f);
    if (!m) continue;
    const text = readFileSync(join(newDir, f), 'utf8').trim();
    if (!text) continue;
    for (const [n, c] of casesFrom(text.split('\n').map((l) => JSON.parse(l))))
      judged.push({ ...judgeLines(n, c), source: 'new', tag: m[1] });
  }
}

// Fits of the new cases: settled within the limit, gates, monotone.
const fitVerdicts = {};
for (const [tag, g] of Object.entries(fits)) {
  const reasons = [];
  for (const r of ['1', '2', '4']) {
    const h = g[r];
    if (!h) {
      reasons.push(`nj ${20 * r} not saved`);
      continue;
    }
    if (!(h.settledEarly || h.converged) || h.iterations >= MAXIT * Number(r)) reasons.push(`nj ${20 * r} not settled (${h.iterations} iterations)`);
    if (h.quality.gates.length > 0) reasons.push(`nj ${20 * r} gates: ${h.quality.gates.join('; ')}`);
  }
  if (g['1'] && g['2'] && g['4'] && !monotone(g['1'].drag, g['2'].drag, g['4'].drag)) reasons.push('drags not monotone');
  fitVerdicts[tag] = { reasons, drags: ['1', '2', '4'].map((r) => g[r]?.drag), iterations: ['1', '2', '4'].map((r) => g[r]?.iterations), quality: ['1', '2', '4'].map((r) => g[r]?.quality) };
}

// The allowance: twice the largest miss over every passing line, and the
// lines next to a case's only passing line.
let largest = 0;
let largestAt = '';
for (const c of judged) {
  const passing = c.lines.filter((l) => l.passes);
  const counted = [...passing];
  if (passing.length === 1) {
    const k = c.lines.indexOf(passing[0]);
    for (const n of [c.lines[k - 1], c.lines[k + 1]]) if (n && n.miss) counted.push(n);
  }
  c.counted = counted.map((l) => l.line);
  for (const l of counted) {
    for (const m of l.miss) {
      if (Math.abs(m) > largest) {
        largest = Math.abs(m);
        largestAt = `${c.name} line ${l.line} (x ${l.x.toFixed(3)})`;
      }
    }
  }
}
const allowance = ceil1(2 * largest);

const f = (v) => (v === undefined || Number.isNaN(v) ? 'n/a' : v.toExponential(2));
console.log(`Largest miss ${f(largest)} at ${largestAt}; allowance (twice, rounded up) ${allowance.toExponential(0)}`);
const verdicts = [];
for (const c of judged) {
  const passing = c.lines.filter((l) => l.passes);
  const ratios = passing.map((l) => (c.fam.band + allowance) / Math.abs(l.finestMinusLowest));
  const fitVerdict = c.tag ? fitVerdicts[c.tag] : undefined;
  const reasons = [...(fitVerdict?.reasons ?? [])];
  if (c.source === 'new' && !c.fam.monotone) reasons.push('family not monotone');
  if (passing.length === 0) reasons.push('no line passes the line criterion');
  if (ratios.some((r) => !(r >= 1))) reasons.push(`band does not contain the error against a lowest bound (ratios ${ratios.map((r) => r.toFixed(2)).join(', ')})`);
  const pass = reasons.length === 0;
  verdicts.push({ case: c.name, source: c.source, pass, reasons, family: c.fam, lines: c.lines, counted: c.counted, containment: ratios, fits: fitVerdict });
  console.log(`== ${c.name} (${c.source}): ${pass ? 'PASS' : 'FAIL'}${reasons.length ? ` (${reasons.join('; ')})` : ''}`);
  console.log(`   drags ${[c.fam.T1, c.fam.T2, c.fam.T4].map((v) => v?.toPrecision(10)).join(', ')}, order ${c.fam.order.toFixed(2)}, extrapolation ${f((c.fam.procExt - c.fam.T4) / c.fam.T4)}, band (no allowance) ${f(c.fam.band)}`);
  for (const l of c.lines) {
    console.log(
      `   line ${l.line} x ${l.x.toFixed(4)} share ${(100 * l.share).toFixed(1)}%: ${l.passes ? 'passes' : `fails (${l.reasons.join('; ')})`}${l.miss ? `; orders fitted ${l.fittedOrder.toFixed(2)} march ${l.marchOrder.toFixed(2)} upstream ${l.upstreamOrder.toFixed(2)}; miss ${f(l.miss[0])}, ${f(l.miss[1])}; finest minus lowest bound ${f(l.finestMinusLowest)}` : ''}`,
    );
  }
  if (passing.length) console.log(`   containment (band + allowance over the error against each passing line's lowest bound): ${ratios.map((r) => r.toFixed(2)).join(', ')}`);
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ largest, largestAt, allowance, verdicts, fits: fitVerdicts }, null, 1));
