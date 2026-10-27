// W6, the TR 1386 check (README section 8, 0014 10.7 (x)): figure 4's
// surface pressures of one model at one Mach number against W6's capped
// cone on nj = 20, 40 and 80 (runners/wallcp.test.ts's output).
// - Comparable only if the computed surface Mach number (nj = 80, the wall
//   cells) is above 1 from the end of the cap's subsonic region to the
//   corner (x = the nose's length); stations only ahead of the corner
//   (the pair's X/L envelope ending at 1 or before).
// - The computed value over the station's X/L envelope: Cp on nj = 80
//   (linear in x between face centres) with a band of 1.25 |Cp80 - Cp40| / 3
//   where the three grids change monotonically, else their range; the
//   union over the envelope (sampled at 41 points).
// - Agreement: overlap with the pair's P envelope widened by 0.004; else
//   the difference to the nearer edge, against the widened envelope and
//   the envelope itself.
// Usage: node tr1386.mjs <wallcp json> <model, e.g. 4p> <Mach as printed, e.g. 1.50> [pairs csv]
import { readFileSync } from 'node:fs';

const [file, model, machLabel, pairsFile = 'docs/research/tr1386/pairing-2026-10-26/pairs-fig4.csv'] =
  process.argv.slice(2);
const w = JSON.parse(readFileSync(file, 'utf8'));
const L = w.noseLength;

/** A CSV line's fields (quoted fields may hold commas). */
function fields(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}
const lines = readFileSync(pairsFile, 'utf8').trim().split('\n');
const head = fields(lines[0]);
const rows = lines.slice(1).map((l) => Object.fromEntries(fields(l).map((v, k) => [head[k], v])));
const stations = rows
  .filter((r) => (r.A_model || r.B_model) === model && (r.A_mach || r.B_mach) === machLabel)
  .map((r) => ({
    id: r.pair_id,
    status: r.status,
    xlo: Number(r.x_envelope_lo),
    xhi: Number(r.x_envelope_hi),
    plo: Number(r.y_envelope_lo),
    phi: Number(r.y_envelope_hi),
  }))
  .sort((a, b) => a.xlo - b.xlo);

/** Linear interpolation of a grid's faces at x (clamped to the faces' range). */
const at = (faces, x, key) => {
  if (x <= faces[0].x) return faces[0][key];
  for (let i = 1; i < faces.length; i++) {
    if (faces[i].x >= x) {
      const a = faces[i - 1];
      const b = faces[i];
      return a[key] + ((b[key] - a[key]) * (x - a.x)) / (b.x - a.x);
    }
  }
  return faces[faces.length - 1][key];
};
const [g20, g40, g80] = w.grids;

// Comparable: the surface Mach number on nj = 80 above 1 from the end of the
// cap's subsonic region to the corner.
const nose = g80.faces.filter((f) => f.x <= L);
let lastSubsonic = -1;
for (let i = 0; i < nose.length; i++) if (!(nose[i].wallCellMach > 1)) lastSubsonic = i;
const firstSupersonic = nose.findIndex((f) => f.wallCellMach > 1);
const comparable = nose.slice(firstSupersonic).every((f) => f.wallCellMach > 1);
console.log(
  `${w.tag}, ${model} at M ${machLabel}: nose length ${L}; surface Mach on nj 80 first above 1 at x/L ${(nose[firstSupersonic]?.x / L).toFixed(4)}, last at or below 1 at x/L ${lastSubsonic >= 0 ? (nose[lastSubsonic].x / L).toFixed(4) : '-'}; least ahead of the corner after the cap ${Math.min(...nose.slice(firstSupersonic).map((f) => f.wallCellMach)).toFixed(4)}: ${comparable ? 'comparable' : 'NOT comparable'}`,
);
for (const g of w.grids) {
  const ns = g.faces.filter((f) => f.x <= L);
  const first = ns.findIndex((f) => f.wallCellMach > 1);
  const ok = ns.slice(first).every((f) => f.wallCellMach > 1);
  console.log(`  nj ${g.nj}: supersonic from x/L ${(ns[first].x / L).toFixed(4)} to the corner: ${ok}`);
}
if (!comparable) process.exit(0);

console.log('station | X/L envelope | P envelope | computed (nj 80 with band) | widened by 0.004 | envelope alone');
let agreeW = 0;
let agreeE = 0;
let n = 0;
for (const s of stations) {
  if (s.xhi > 1) {
    console.log(`${s.id} | ${s.xlo.toFixed(4)} to ${s.xhi.toFixed(4)} | not ahead of the corner: not compared`);
    continue;
  }
  n++;
  let lo = Infinity;
  let hi = -Infinity;
  for (let k = 0; k <= 40; k++) {
    const x = Math.max(s.xlo + ((s.xhi - s.xlo) * k) / 40, 0) * L;
    const c = [g20, g40, g80].map((g) => at(g.faces, x, 'cp'));
    const monotone = (c[0] - c[1]) * (c[1] - c[2]) > 0;
    const band = monotone ? (1.25 * Math.abs(c[2] - c[1])) / 3 : Math.max(...c) - Math.min(...c);
    lo = Math.min(lo, monotone ? c[2] - band : Math.min(...c));
    hi = Math.max(hi, monotone ? c[2] + band : Math.max(...c));
  }
  const versus = (elo, ehi) => {
    if (hi >= elo && lo <= ehi) return 'agrees';
    const d = lo > ehi ? lo - ehi : hi - elo;
    return `differs by ${d >= 0 ? '+' : ''}${d.toFixed(4)}`;
  };
  const wv = versus(s.plo - 0.004, s.phi + 0.004);
  const ev = versus(s.plo, s.phi);
  if (wv === 'agrees') agreeW++;
  if (ev === 'agrees') agreeE++;
  console.log(
    `${s.id} | ${s.xlo.toFixed(4)} to ${s.xhi.toFixed(4)} | ${s.plo.toFixed(4)} to ${s.phi.toFixed(4)} | ${lo.toFixed(4)} to ${hi.toFixed(4)} | ${wv} | ${ev}`,
  );
}
console.log(
  `stations compared ${n}; agreeing with the widened envelope ${agreeW}; with the envelope alone ${agreeE}`,
);
