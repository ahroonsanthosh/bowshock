// W6 build, the second march (docs/research/w6-build README section 6):
// a starting line whose points take their streamline's entropy from the
// fitted shock, mapped by stream function, in place of the entropy of the
// line's interpolated cells. Pressure and flow direction are kept; the
// density follows from the pressure and the entropy, the speed from the
// total enthalpy. The wall point takes the normal shock's entropy.
import type { StartingLine, StartingState } from '../../src/validation/characteristics';
import { normalShock } from '../../src/validation/gas-dynamics';
import { effectiveMach, gamma, type Fit } from './fitdata';

/** Entropy p / rho^gamma behind a shock of wave angle beta in the free stream (p = rho = 1). */
function shockEntropy(mach: number, beta: number): number {
  const mn = mach * Math.sin(beta);
  if (!(mn > 1)) return 1;
  const s = normalShock(mn, gamma);
  return s.pressureRatio / s.densityRatio ** gamma;
}

export interface ShockEntropyLine {
  readonly start: StartingLine;
  /** The line's own stream function at its shock point over rho U y_s^2 / 2 there. */
  readonly massRatio: number;
  /** Largest change of a point's entropy, relative. */
  readonly largestEntropyChange: number;
}

export function shockEntropyLine(f: Fit, i: number, start: StartingLine): ShockEntropyLine {
  const mach = effectiveMach(f);
  const U = f.freeStream.u;
  const n = f.lines.length - 1;
  // The fitted shock's nodes and their entropy, outward from the axis.
  const node = (k: number) => {
    const l = f.lines[k]!;
    const h = f.heights[k]!;
    return { x: l.x + h * l.dx, y: l.y + h * l.dy };
  };
  const table: { psi: number; k: number }[] = [];
  for (let k = 0; k <= n; k++) {
    const b = node(k);
    let beta: number;
    if (k === 0) {
      beta = Math.PI / 2; // the shock is normal to the axis there
    } else {
      const a = node(k - 1);
      const c = node(Math.min(k + 1, n));
      const s1 = Math.hypot(b.x - a.x, b.y - a.y);
      const s2 = k < n ? Math.hypot(c.x - b.x, c.y - b.y) : 0;
      let dx: number;
      let dy: number;
      if (k < n) {
        const d = (fa: number, fb: number, fc: number) =>
          (-s2 / (s1 * (s1 + s2))) * fa + ((s2 - s1) / (s1 * s2)) * fb + (s1 / (s2 * (s1 + s2))) * fc;
        dx = d(a.x, b.x, c.x);
        dy = d(a.y, b.y, c.y);
      } else {
        dx = (b.x - a.x) / s1;
        dy = (b.y - a.y) / s1;
      }
      beta = Math.atan2(dy, dx);
    }
    table.push({ psi: 0.5 * U * b.y * b.y, k: shockEntropy(mach, beta) });
  }
  const entropyAt = (psi: number) => {
    if (psi <= table[0]!.psi) return table[0]!.k;
    let lo = 0;
    let hi = table.length - 1;
    if (psi >= table[hi]!.psi) return table[hi]!.k;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (table[mid]!.psi <= psi) lo = mid;
      else hi = mid;
    }
    const t = (psi - table[lo]!.psi) / (table[hi]!.psi - table[lo]!.psi);
    return table[lo]!.k + t * (table[hi]!.k - table[lo]!.k);
  };
  // The stream function along the line from the data's own mass flux
  // (trapezoidal), the normal to the line pointing downstream.
  const l = f.lines[i]!;
  const nx = l.dy;
  const ny = -l.dx;
  const pts = start.points;
  const flux = (p: StartingState) => p.rho * (p.u * nx + p.v * ny) * p.y;
  const psi: number[] = [0];
  for (let j = 1; j < pts.length; j++) {
    const a = pts[j - 1]!;
    const b = pts[j]!;
    const ds = Math.hypot(b.x - a.x, b.y - a.y);
    psi.push(psi[j - 1]! + 0.5 * (flux(a) + flux(b)) * ds);
  }
  const last = pts[pts.length - 1]!;
  const massRatio = psi[pts.length - 1]! / (0.5 * U * last.y * last.y);
  const cp = gamma / (gamma - 1);
  const H = cp + 0.5 * U * U;
  let largestEntropyChange = 0;
  const points = pts.map((p, j) => {
    if (j === pts.length - 1) return p; // only its position is used
    const k = j === 0 ? table[0]!.k : entropyAt(psi[j]!);
    largestEntropyChange = Math.max(largestEntropyChange, Math.abs(k / (p.p / p.rho ** gamma) - 1));
    const rho = (p.p / k) ** (1 / gamma);
    const speed = Math.sqrt(Math.max(0, 2 * (H - (cp * p.p) / rho)));
    const angle = Math.atan2(p.v, p.u);
    return { ...p, rho, u: speed * Math.cos(angle), v: speed * Math.sin(angle) };
  });
  return { start: { ...start, points }, massRatio, largestEntropyChange };
}
