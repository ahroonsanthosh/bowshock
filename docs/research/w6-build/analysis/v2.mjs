// W6 third march, V2 (README section 9): judges each case's third march
// (moc3-<case>.jsonl) by the registered rules, with the first march
// (moc-<case>.jsonl) as the control and the family's fits (results.jsonl):
// - W5's line criterion, unchanged: on every grid, the march's mass
//   balance on 2560 intervals and its change from 1280, below 3.5e-5 of
//   the nose's drag;
// - its own resolution, on every line used: on every grid, the change
//   from 2560 to 5120 intervals below 3.5e-5 of the drag, and the
//   observed order over 1280, 2560 and 5120 between 0.8 and 3 (a line
//   failing it is not used);
// - the control (section 6 item 2): on lines where both marches pass the
//   criterion, they agree on every grid within the larger of their
//   changes from 1280 to 2560 intervals plus 1e-5 of the drag;
// - coverage (section 6 item 3): two or more used lines carrying 50% or
//   more of the drag downstream, and on each the fitted drag downstream
//   minus the march (2560 intervals) smaller in size on nj = 40 than on
//   20, and on 80 than on 40, by a factor of 2 or more;
// - section 6 item 4's check: a used line whose reference differs from
//   the family's extrapolation by more than the family's band.
// References and misses as references.mjs, from the 2560-interval march.
// Usage: node v2.mjs <out dir> [case]
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
const ord = (a, b, c) => Math.log2((a - b) / (b - c));
const ext = (b, c, p) => c - (b - c) / (2 ** p - 1);
const cap = (p) => (Number.isFinite(p) ? Math.min(p, 2) : 2);
const e = (v) => (Number.isFinite(v) ? v.toExponential(2) : '-');

const fits = new Map();
for (const r of read(`${dir}/results.jsonl`)) {
  if (r.kind !== 'fit') continue;
  if (!fits.has(r.tag)) fits.set(r.tag, {});
  fits.get(r.tag)[r.REF] = r;
}

/** Lines of a march file: line -> { x, g: { r: { fitted, minMach, moc: {n}, mass: {n}, embedded: {n} } } }. */
function lines(file) {
  const L = new Map();
  if (!existsSync(file)) return L;
  for (const m of read(file)) {
    if (!L.has(m.line)) L.set(m.line, { x: m.x, g: {} });
    const l = L.get(m.line);
    l.g[m.r] ??= { fitted: m.fitted, minMach: m.minMach, moc: {}, mass: {}, embedded: {} };
    l.g[m.r].moc[m.n] = m.moc;
    l.g[m.r].mass[m.n] = m.mass;
    if (m.embedded) l.g[m.r].embedded[m.n] = m.embedded;
  }
  return L;
}

const rs = [1, 2, 4];
for (const [tag, g] of [...fits.entries()].sort()) {
  if (want && tag !== want) continue;
  const third = lines(`${dir}/moc3-${tag}.jsonl`);
  if (third.size === 0 || !rs.every((r) => g[r])) continue;
  const first = lines(`${dir}/moc-${tag}.jsonl`);
  const T = Object.fromEntries(rs.map((r) => [r, g[r].drag]));
  const pT = ord(T[1], T[2], T[4]);
  const procExt = ext(T[2], T[4], cap(pT));
  const band = (1.25 * Math.abs(T[2] - T[4])) / (2 ** cap(pT) - 1);
  console.log(
    `== ${tag}: drag ${rs.map((r) => T[r].toPrecision(10)).join(', ')}; order ${pT.toFixed(3)}, extrapolation ${procExt.toPrecision(10)}, band ${e(band / T[4])} of the drag`,
  );
  const criterion = (l, r) => {
    const q = l?.g[r];
    if (!q) return { pass: false, mass: NaN, change: NaN };
    const mass = Math.abs(q.mass[2560]);
    const change = Math.abs(q.moc[2560] - q.moc[1280]) / T[r];
    return {
      pass: mass < CRITERION && change < CRITERION && Number.isFinite(q.moc[2560]),
      mass,
      change,
    };
  };
  const results = [];
  for (const line of [...third.keys()].sort((a, b) => a - b)) {
    const l = third.get(line);
    if (!rs.every((r) => l.g[r])) continue;
    const c = rs.map((r) => criterion(l, r));
    const passes = c.every((q) => q.pass);
    const own = rs.map((r) => {
      const m = l.g[r].moc;
      const change = Math.abs(m[5120] - m[2560]) / T[r];
      const order = ord(m[1280], m[2560], m[5120]);
      return { change, order, pass: change < CRITERION && order > 0.8 && order < 3 };
    });
    const ownPass = own.every((q) => q.pass);
    const used = passes && ownPass;
    // The control against the first march, where both pass.
    const f = first.get(line);
    const fc = rs.map((r) => criterion(f, r));
    const bothPass = passes && fc.every((q) => q.pass);
    const control = bothPass
      ? rs.map((r, k) => {
          const diff = Math.abs(l.g[r].moc[2560] - f.g[r].moc[2560]) / T[r];
          const allowed = Math.max(c[k].change, fc[k].change) + 1e-5;
          return { diff, allowed, pass: diff <= allowed };
        })
      : null;
    const F = rs.map((r) => l.g[r].fitted);
    const M = rs.map((r) => l.g[r].moc[2560]);
    const D = rs.map((r, k) => (F[k] - M[k]) / T[r]);
    const falls = Math.abs(D[1]) * 2 <= Math.abs(D[0]) && Math.abs(D[2]) * 2 <= Math.abs(D[1]);
    const U = rs.map((r, k) => T[r] - F[k]);
    const pM = ord(...M);
    const pU = ord(...U);
    const Uo = ext(U[1], U[2], cap(pU));
    const refO = ext(M[1], M[2], cap(pM)) + Uo;
    const ref2 = ext(M[1], M[2], 2) + Uo;
    const emb = l.g[4].embedded[2560];
    const res = {
      line,
      x: l.x,
      share: F[2] / T[4],
      passes,
      ownPass,
      used,
      bothPass,
      control,
      falls,
      D,
      missO: (procExt - refO) / T[4],
      miss2: (procExt - ref2) / T[4],
      suspect: used && Math.abs(refO - procExt) > band,
      emb,
    };
    results.push(res);
    console.log(
      ` line ${line} x ${l.x.toFixed(4)} share ${(100 * res.share).toFixed(1)}%: criterion ${passes ? 'PASS' : 'fail'} (mass ${c.map((q) => e(q.mass)).join(', ')}; change ${c.map((q) => e(q.change)).join(', ')}); own resolution ${ownPass ? 'PASS' : 'fail'} (change ${own.map((q) => e(q.change)).join(', ')}; order ${own.map((q) => q.order.toFixed(2)).join(', ')})`,
    );
    console.log(
      `   fitted - march ${D.map(e).join(', ')} of the drag (${falls ? 'falls by 2 or more per grid' : 'does not fall by 2 per grid'}); first march criterion ${fc.every((q) => q.pass) ? 'PASS' : 'fail'}${control ? `; control ${control.every((q) => q.pass) ? 'PASS' : 'FAIL'} (${control.map((q) => `${e(q.diff)} <= ${e(q.allowed)}`).join(', ')})` : ''}`,
    );
    console.log(
      `   embedded shock (nj 80, 2560): ${emb?.formed ? `formed x ${emb.formed.x.toFixed(4)}` : 'none'}${emb?.merged ? `, merged x ${emb.merged.x.toFixed(4)}` : ''}, pressure ratio up to ${emb ? emb.strongest.toFixed(5) : '-'}; references ${refO.toPrecision(10)} (obs), ${ref2.toPrecision(10)} (2nd); miss ${e(res.missO)}, ${e(res.miss2)}${res.suspect ? '; differs from the extrapolation by more than the band' : ''}`,
    );
  }
  const used = results.filter((r) => r.used);
  const covering = used.filter((r) => r.share >= 0.5 && r.falls);
  const controls = results.filter((r) => r.control);
  const controlPass = controls.every((r) => r.control.every((q) => q.pass));
  const neighbours = results.filter(
    (r, k) => !r.used && (results[k - 1]?.used || results[k + 1]?.used),
  );
  const misses = [...used, ...neighbours].flatMap((r) => [Math.abs(r.missO), Math.abs(r.miss2)]);
  console.log(
    `   used lines ${used.length} (${used.map((r) => r.line).join(',')}); covering (share >= 50%, falling by 2 per grid) ${covering.length}; coverage ${covering.length >= 2 ? 'PASS' : 'fail'}; control on ${controls.length} line(s) ${controls.length ? (controlPass ? 'PASS' : 'FAIL') : '-'}; largest miss over used lines and neighbours ${e(misses.length ? Math.max(...misses) : NaN)}; suspect lines ${results.filter((r) => r.suspect).length}`,
  );
}
