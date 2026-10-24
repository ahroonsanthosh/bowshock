/**
 * The sector grid of docs/design/0021-3d-euler-fins.md section 2 for fins on a cylinder: coordinates (x, r,
 * theta), from the start plane to the base plane, from the body to the envelope r_out(x), and from the fin's
 * face (theta_0) to the mirror plane theta = pi / N. This file builds sharp sections (the sharp-section path:
 * no block L); blunt leading edges add block L (2.5).
 *
 * One global index grid holds every block (src/solver3d/multiblock.ts):
 * - k < N_S: the slab (2.4), above the tip and within the tip's chord, between theta = 0 and the tip's face;
 *   elsewhere those cells are holes (the fin, or nothing: its nodes collapse onto theta_0);
 * - k >= N_S: the main block, split into boxes whose sides are each wholly a wall, a boundary or an interface:
 *   below the tip (Ma), and above it ahead of the tip's chord (Mb), over it (Mc, on the slab) and behind it (Md).
 * Every node of a row lies on its row's radius at its own angle; the main block's first theta node line is the
 * fin's face (theta_0 = asin(z / r)), the slab's top above the tip, and the plane theta = 0 elsewhere.
 *
 * Spacing (2.10, 2.4), on L0, with w = (t_tip / 2) / N_S the slab's cell width:
 * - along x: [start, leading edge], the chord's segments between the section's breakpoints, and [trailing edge,
 *   base] where the fin ends ahead of the base; clustered at the edges and the breakpoints, the first cell 1% of
 *   the local chord, growth at most 1.2, cells at most 13 w (cells next to the fin and the slab);
 * - along r: [body, tip] clustered at both ends (first cell 1% of the span) and [tip, r_out] clustered at the
 *   tip, cells at most 13 w;
 * - along theta: the slab N_S = 4 uniform cells; the main block's first cell 1.3 w (arc length), growing by at
 *   most 1.2 to the mirror plane;
 * - the envelope r_out(x) = r_tip + max(0, x - x_tip,LE) tan(beta) + 3 L0 cells, the margin taken as 3 times
 *   13 w (the largest cell next to the fin; an assumption of this layout, recorded by the spike).
 * Counts on L0 are multiples of 8 (from the longest row or column); level l multiplies each by 1.5^l and
 * evaluates the same mappings at finer parameters (spacing3d.ts).
 */

import { type Planform } from '../fins/planform';
import { atLevel, clusteredNodes, countFor, segmentCount, segmentNodes } from './spacing3d';
import { nodeIndex3D, type StructuredGrid3D } from './grid3d';
import { type Box3D } from './multiblock';
import { quality3D, type Quality3D, type QualityOptions, type WallSide } from './quality3d';

export const N_S = 4;
/**
 * Revision 3f: the slab cells over a sharp tip's bevels, at most this many L0 columns from a sharp end of the tip
 * chord (1.5^l times as many on level l), are exempt from the aspect and size-ratio gates (2.4 weakened, bounded
 * by the tip allowance A_tip).
 */
export const N_TIP = 32;
/** Revision 3f: root sweeps above this are refused until the bent columns are built. */
export const MAX_SWEEP_DEG = 40;
/** Cells next to the fin, the slab or block L are at most this many slab widths (2.4). */
export const SIZE_CAP = 13;

/** A sharp symmetric section in physical lengths, as a function of the chord (bevels keep their length). */
export interface SharpSection3D {
  readonly kind: 'sharp';
  /** Half-thickness at distance s behind the leading edge on a chord c. */
  halfThickness(s: number, c: number): number;
  /** Interior breakpoints (corners), distances behind the leading edge, on a chord c. */
  breakpoints(c: number): number[];
  /** Square trailing edge (a base of the plate's thickness): the plate continues to the base as a fictitious plate. */
  readonly bluntTrailingEdge: boolean;
}

/** A plate of thickness t bevelled to sharp edges at the half-angle given, at the leading edge and optionally the trailing edge. */
export function bevelledPlate3D(
  thickness: number,
  bevelHalfAngle: number,
  trailing: 'bevel' | 'square',
): SharpSection3D {
  const h = thickness / 2;
  const b = h / Math.tan(bevelHalfAngle);
  return {
    kind: 'sharp',
    halfThickness: (s, c) => {
      const lead = Math.min(h, (s / b) * h);
      const tail = trailing === 'bevel' ? Math.min(h, ((c - s) / b) * h) : h;
      return Math.max(0, Math.min(lead, tail));
    },
    breakpoints: (c) => {
      if (trailing === 'bevel' && 2 * b >= c)
        throw new RangeError('the bevels meet: the chord is shorter than both bevels');
      if (b >= c) throw new RangeError('the bevel is longer than the chord');
      return trailing === 'bevel' ? [b, c - b] : [b];
    },
    bluntTrailingEdge: trailing === 'square',
  };
}

/** A symmetric double wedge of thickness t (physical, the same on every chord), its ridge at the chord fraction given. */
export function doubleWedge3D(thickness: number, ridge = 0.5): SharpSection3D {
  const h = thickness / 2;
  return {
    kind: 'sharp',
    halfThickness: (s, c) => {
      const f = s / c;
      return f <= ridge ? (h * f) / ridge : (h * (1 - f)) / (1 - ridge);
    },
    breakpoints: (c) => [ridge * c],
    bluntTrailingEdge: false,
  };
}

export interface SectorInput {
  /** Body radius. */
  readonly bodyRadius: number;
  readonly fins: number;
  /** Axial position of the root's leading edge, the nose's shoulder, and the base. */
  readonly rootLeadingEdge: number;
  readonly shoulder: number;
  readonly base: number;
  readonly planform: Planform;
  readonly section: SharpSection3D;
  /** tan of the tip section's leading-wedge shock angle in the local flow (the envelope's slope, 2.4). */
  readonly tanTipShock: number;
  /** The 2D bow shock's radius at x, for the envelope's refusal (2.4); omitted: not checked. */
  readonly bowShock?: (x: number) => number;
  /**
   * Rung (c)'s plane wall (4.3) in place of the body: planar coordinates (x, y, z), the wall at y = 0, the fin
   * in the mirror plane z = 0, a mirror face at z = zMax beyond the envelope; bodyRadius, fins and shoulder are
   * then not used.
   */
  readonly planeWall?: { readonly zMax: number };
}

export interface SectorGrid {
  readonly level: number;
  readonly grid: StructuredGrid3D;
  readonly boxes: readonly Box3D[];
  readonly names: readonly string[];
  /** Global column of the tip's leading edge and of the slab's end; row of the tip. */
  readonly iTipLE: number;
  readonly iSlabEnd: number;
  readonly jTip: number;
  /** The fin's planform at each node column: inside it at node (i, j) (rows up to the tip). */
  readonly onFin: (i: number, j: number) => boolean;
  /** Is slab column i over a sharp tip's bevel, within N_TIP L0 columns of a sharp end (revision 3f)? */
  readonly overTipBevel: (i: number) => boolean;
  readonly w: number;
  readonly counts: {
    readonly columns: readonly number[];
    readonly rowsBelow: number;
    readonly rowsAbove: number;
    readonly theta: number;
  };
  readonly startPlane: number;
  readonly geometry: 'cylindrical' | 'planar';
}

/** Refusals of the layout (each with its reason). */
export class SectorRefusal extends RangeError {}

export function sectorGrid(input: SectorInput, level: number): SectorGrid {
  const { fins: N, planform: p, section } = input;
  const planar = input.planeWall !== undefined;
  const R = planar ? 0 : input.bodyRadius;
  const zMax = input.planeWall?.zMax ?? 0;
  // The angle (cylindrical) or the distance (planar) of the fin's face, and of a point s along the arc from it.
  const angleOf = (z: number, r: number) => (planar ? z : Math.asin(z / r));
  const arcOf = (r: number, theta0: number) =>
    planar ? zMax - theta0 : r * (Math.PI / N - theta0);
  const along = (theta0: number, sArc: number, r: number) =>
    planar ? theta0 + sArc : theta0 + sArc / r;
  const span = p.span;
  const rTip = R + span;
  const chordAt = (y: number) => p.rootChord + y * (p.tanTrailingEdge - p.tanLeadingEdge);
  const leAt = (y: number) => input.rootLeadingEdge + y * p.tanLeadingEdge;
  const teAt = (y: number) => leAt(y) + chordAt(y);
  const tipChord = chordAt(span);
  const sweep =
    (Math.atan(Math.max(Math.abs(p.tanLeadingEdge), Math.abs(p.tanTrailingEdge))) * 180) / Math.PI;
  if (sweep > MAX_SWEEP_DEG)
    throw new SectorRefusal(
      `the fin's edges are swept ${sweep.toFixed(1)} deg; above ${MAX_SWEEP_DEG} deg the grid's columns meet the body at less than the 50 deg its gates allow, and the layout that bends them (revision 3f) is not built yet`,
    );
  const xTipLE = leAt(span);
  // The start plane: a quarter root chord ahead, at least 0.25 R, on the cylinder 0.1 R behind the shoulder.
  const xs = input.rootLeadingEdge - Math.max(p.rootChord / 4, 0.25 * R);
  if (!planar && xs < input.shoulder + 0.1 * R)
    throw new SectorRefusal(
      'the start plane would lie less than 0.1 body radius behind the nose shoulder',
    );
  // The trailing edge at the base, or ahead of it on every row, or behind it on every row (cut at the base).
  const teRoot = teAt(0);
  const teTip = teAt(span);
  const eps = 1e-12 * p.rootChord;
  const aheadRoot = teRoot < input.base - eps;
  const aheadTip = teTip < input.base - eps;
  if (aheadRoot !== aheadTip)
    throw new SectorRefusal('the trailing edge crosses the base plane part way along the span');
  const aft = aheadRoot;
  // The section's thickest point at the tip sets the slab's width.
  const tipBps = section.breakpoints(tipChord);
  let tTipHalf = 0;
  for (const s of [...tipBps, tipChord / 2])
    tTipHalf = Math.max(tTipHalf, section.halfThickness(s, tipChord));
  const w = tTipHalf / N_S;
  // At most 13 w, generated at 0.95 of it so that cells next to the slab's w-wide cells stay below the aspect
  // gate's 13 in floating point.
  const cap = 0.95 * SIZE_CAP * w;
  const margin = 3 * cap;
  // Columns: above the tip the rows follow the envelope, sloped at tan(beta), so a cell's x edges are longer
  // than its column spacing by up to sqrt(1 + tan^2 beta): the columns are capped at the cap over that.
  const capX = cap / Math.hypot(1, input.tanTipShock);
  // The envelope: 2.4's r_tip + e(x - x_tip,LE) + 3 L0 cells, with two changes that only move it farther out
  // (outside the domain of influence is all it needs; 3.8's outer-row check still applies): the kink at the tip's
  // leading edge rounded off (a softplus of width half the tip chord: the x edges of the rows above the tip tilt
  // with it, and an abrupt tilt failed the size gate), and a floor of a quarter of the height at the base (the
  // rows above the tip are one count everywhere; where the envelope was only the margin high they were squeezed
  // flat, failing the aspect gate at low Mach numbers, whose tip shocks are steep).
  const rampWidth = Math.max(tipChord / 2, cap);
  const softplus = (z: number) => (z > 30 ? z : Math.log1p(Math.exp(z)));
  const ramp = (x: number) => input.tanTipShock * rampWidth * softplus((x - xTipLE) / rampWidth);
  const floor = (margin + ramp(input.base)) / 4;
  const rOut = (x: number) => rTip + margin + floor + ramp(x);
  if (input.bowShock) {
    for (let q = 0; q <= 100; q++) {
      const x = xs + ((input.base - xs) * q) / 100;
      if (rOut(x) > input.bowShock(x) - margin)
        throw new SectorRefusal(
          "the fins' disturbance reaches the bow shock before the base; Stage A does not refit the bow shock in 3D",
        );
    }
  }

  // Column segments of a row of span position y (the tip's for rows above it): breakpoints in x.
  const cut = (x: number) => Math.min(x, input.base);
  const rowBreaks = (y: number): number[] => {
    const le = leAt(y);
    const c = chordAt(y);
    const xs2 = [
      xs,
      le,
      ...section
        .breakpoints(c)
        .map((b) => le + b)
        .filter((x) => x < input.base - eps),
      cut(le + c),
    ];
    if (aft) xs2.push(input.base);
    return xs2;
  };
  const segCount = rowBreaks(0).length - 1;
  // The first cell at the edges and breakpoints: 1% of the shorter of the root and tip chords, the same on every
  // row, so that the columns next to an edge shear exactly with it (a first cell following the local chord made
  // them shear more than the edge, and the body wall angle fell below 50 deg at 40 deg of sweep).
  const chordFirst = () => 0.01 * Math.min(p.rootChord, chordAt(span));
  // Which segment ends are clustered: the edges and the breakpoints (both ends of chord segments).
  const clusterOf = (k: number): [boolean, boolean] => {
    if (k === 0) return [false, true];
    if (aft && k === segCount - 1) return [true, false];
    return [true, true];
  };
  // L0 counts from the longest segment over the rows (sampled at the root, the tip and between).
  const counts0: number[] = [];
  for (let k = 0; k < segCount; k++) {
    let n = 8;
    for (let q = 0; q <= 8; q++) {
      const y = (span * q) / 8;
      const b = rowBreaks(y);
      if (b.length - 1 !== segCount)
        throw new SectorRefusal('the section changes its breakpoints along the span');
      const [a, e] = clusterOf(k);
      n = Math.max(
        n,
        segmentCount(b[k + 1]! - b[k]!, a ? chordFirst() : null, e ? chordFirst() : null, capX),
      );
    }
    counts0.push(n);
  }
  const columnsAt = (y: number, lv = level): number[] => {
    const b = rowBreaks(y);
    const out = [b[0]!];
    // One spacing at each breakpoint, shared by the segments either side: 1% of the chord, or less where a
    // segment's mean cell is smaller (an over-resolved short segment), so that the cells match across it.
    const mean = (k: number) => (b[k + 1]! - b[k]!) / counts0[k]!;
    const at = (q: number) => {
      let h = chordFirst();
      if (q > 0) h = Math.min(h, mean(q - 1));
      if (q < segCount) h = Math.min(h, mean(q));
      return h;
    };
    for (let k = 0; k < segCount; k++) {
      const len = b[k + 1]! - b[k]!;
      const [a, e] = clusterOf(k);
      const nodes = atLevel(
        segmentNodes(len, counts0[k]!, a ? at(k) : null, e ? at(k + 1) : null),
        lv,
      );
      for (let q = 1; q < nodes.length; q++) out.push(b[k]! + nodes[q]!);
    }
    return out;
  };
  // The counts hold with the breakpoint spacings actually used (columnsAt's, which can be smaller than 1% of
  // the chord where a neighbouring segment is short): grown by 8 until every sampled row's cells are at most
  // the cap and grow by at most 1.2 (GROWTH).
  for (let pass = 0; pass < 50; pass++) {
    let grown = false;
    for (let q = 0; q <= 8; q++) {
      const y = (span * q) / 8;
      const b = rowBreaks(y);
      const xsRow = columnsAt(y, 0);
      let at = 0;
      for (let k = 0; k < segCount; k++) {
        const seg = xsRow.slice(at, at + counts0[k]! + 1);
        at += counts0[k]!;
        let bad = false;
        for (let m = 1; m < seg.length && !bad; m++) {
          const h1 = seg[m]! - seg[m - 1]!;
          if (h1 > capX * (1 + 1e-12)) bad = true;
          if (m > 1) {
            const h0 = seg[m - 1]! - seg[m - 2]!;
            if (Math.max(h0 / h1, h1 / h0) > 1.2 * (1 + 1e-9)) bad = true;
          }
        }
        if (bad && b.length > 0) {
          counts0[k] = counts0[k]! + 8;
          grown = true;
        }
      }
    }
    if (!grown) break;
  }
  // Rows.
  // The tip row's spacing is shared by the rows below and above it: 1% of the span, or less where the rows
  // above (whose height varies with x) are shorter on average.
  const hMax = rOut(input.base) - rTip;
  const hMin = rOut(xs) - rTip;
  const na0 = segmentCount(hMax, 0.01 * span, null, cap);
  const firstAbove = Math.min(0.01 * span, hMin / na0);
  // Below the tip the columns are sheared (by up to the edges' sweep), above it they are not (2.3), so the
  // radial edges just below the tip are longer than their row spacing by up to 1 / cos(sweep): the rows below
  // end at firstAbove sqrt(cos(sweep)), splitting that jump between the sheared and the unsheared columns.
  const sweepCos = Math.cos(
    Math.atan(Math.max(Math.abs(p.tanLeadingEdge), Math.abs(p.tanTrailingEdge))),
  );
  const lastBelow = firstAbove * Math.sqrt(sweepCos);
  const nb0 = segmentCount(span, 0.01 * span, lastBelow, cap);
  const rowsBelowAt = (lv: number) =>
    atLevel(segmentNodes(span, nb0, 0.01 * span, lastBelow), lv).map((d) => R + d);
  const rowsBelow = rowsBelowAt(level);
  const rowsAboveAt = (x: number, lv = level) =>
    atLevel(segmentNodes(rOut(x) - rTip, na0, firstAbove, null), lv).map((d) => rTip + d);
  const NB = rowsBelow.length - 1;
  const NA = Math.round(na0 * 1.5 ** level);
  const NJ = NB + NA;
  // Columns per row: rows up to the tip their own; above, the tip's.
  const tipColumns = columnsAt(span);
  const NI = tipColumns.length - 1;
  const iSeg = (k: number) => {
    let s = 0;
    for (let q = 0; q < k; q++) s += Math.round(counts0[q]! * 1.5 ** level);
    return s;
  };
  const iTipLE = iSeg(1);
  const iTE = iSeg(segCount - (aft ? 1 : 0));
  const iSlabEnd = section.bluntTrailingEdge && aft ? NI : iTE;
  // Half-thickness of the fin (or the fictitious plate, or the slab's top) at x on the row of span position y.
  const zAt = (x: number, y: number): number => {
    const le = leAt(y);
    const c = chordAt(y);
    if (x < le - eps) return 0;
    if (x <= le + c + eps) return section.halfThickness(Math.min(Math.max(x - le, 0), c), c);
    return section.bluntTrailingEdge ? section.halfThickness(c, c) : 0;
  };
  // Theta: the main block's first cell 1.3 w, growth at most 1.2, and every cell at most 13 times the smaller
  // of its line's x and r spacings (the aspect gate, which sets the count: 2.4); the count on L0 from the line
  // that needs most.
  const thetaFirst = 1.3 * w;
  // The main block's first cell is 1.3 w everywhere (2.4), over the slab too: where the slab thins over a
  // sharp tip's bevels the two then differ by more than the size gate allows, the cells revision 3f exempts.
  // (Grading it with the slab's local cell was tried: it moved the failures into the main block.)
  const nt0 = (() => {
    const nb = rowsBelowAt(0).length - 1;
    const rows0 = rowsBelowAt(0);
    const tip0 = columnsAt(span, 0);
    let need = 8;
    const nj0 = nb + na0;
    for (let j = 0; j <= nj0; j++) {
      const below = j <= nb;
      const cols = below ? columnsAt(rows0[j]! - R, 0) : tip0;
      for (let i = 0; i < cols.length; i++) {
        const x = cols[i]!;
        const rs = j < nb ? rows0 : [...rows0.slice(0, nb), ...rowsAboveAt(x, 0)];
        const r = rs[j]!;
        const dx = Math.min(
          i > 0 ? x - cols[i - 1]! : Infinity,
          i + 1 < cols.length ? cols[i + 1]! - x : Infinity,
        );
        const dr = Math.min(
          j > 0 ? r - rs[j - 1]! : Infinity,
          j + 1 < rs.length ? rs[j + 1]! - r : Infinity,
        );
        const arc = arcOf(r, 0);
        need = Math.max(
          need,
          countFor(
            arc,
            Math.min(thetaFirst, arc / 8),
            true,
            false,
            SIZE_CAP * 0.95 * Math.min(dx, dr),
          ),
        );
      }
    }
    return need;
  })();
  const NM = Math.round(nt0 * 1.5 ** level);
  const NK = N_S + NM;
  const n = (NI + 1) * (NJ + 1) * (NK + 1);
  const c0 = new Float64Array(n);
  const c1 = new Float64Array(n);
  const c2 = new Float64Array(n);
  const g = { ni: NI, nj: NJ };
  for (let j = 0; j <= NJ; j++) {
    const below = j <= NB;
    const cols = below ? columnsAt(rowsBelow[j]! - R) : tipColumns;
    for (let i = 0; i <= NI; i++) {
      const x = cols[i]!;
      const r = below ? rowsBelow[j]! : rowsAboveAt(x)[j - NB]!;
      const y = Math.min(r - R, span);
      const z = below || (i >= iTipLE && i <= iSlabEnd) ? zAt(x, y) : 0;
      if (!planar && z >= r) throw new SectorRefusal('the fin is thicker than its radius');
      if (planar && z >= zMax) throw new SectorRefusal('the fin reaches the mirror face');
      const theta0 = angleOf(z, r);
      const slab = !below || j === NB ? i >= iTipLE && i <= iSlabEnd : false;
      const arc = arcOf(r, theta0);
      const thetas = atLevel(
        clusteredNodes(arc, nt0, Math.min(thetaFirst, arc / nt0), true, false),
        level,
      );
      for (let k = 0; k <= NK; k++) {
        let th: number;
        if (k <= N_S) th = slab ? (theta0 * k) / N_S : theta0;
        else th = along(theta0, thetas[k - N_S]!, r);
        if (k === N_S) th = theta0;
        const q = nodeIndex3D(g, i, j, k);
        c0[q] = x;
        c1[q] = r;
        c2[q] = th;
      }
    }
  }
  const grid: StructuredGrid3D = { ni: NI, nj: NJ, nk: NK, c0, c1, c2 };
  const boxes: Box3D[] = [
    { i0: iTipLE, i1: iSlabEnd, j0: NB, j1: NJ, k0: 0, k1: N_S },
    { i0: 0, i1: NI, j0: 0, j1: NB, k0: N_S, k1: NK },
    { i0: 0, i1: iTipLE, j0: NB, j1: NJ, k0: N_S, k1: NK },
    { i0: iTipLE, i1: iSlabEnd, j0: NB, j1: NJ, k0: N_S, k1: NK },
  ];
  const names = ['slab', 'main below the tip', 'main ahead of the tip', 'main over the tip'];
  if (iSlabEnd < NI) {
    boxes.push({ i0: iSlabEnd, i1: NI, j0: NB, j1: NJ, k0: N_S, k1: NK });
    names.push('main behind the tip');
  }
  const onFin = (i: number, j: number) => {
    if (j > NB) return false;
    const y = rowsBelow[j]! - R;
    const x = columnsAt(y)[i]!;
    return x >= leAt(y) - eps && x <= cut(teAt(y)) + eps;
  };
  // The tip's bevels: from a sharp end of the tip chord to the nearest breakpoint.
  const tipLE = leAt(span);
  const leadBevelEnd = tipLE + tipBps[0]!;
  const trailBevelStart = section.bluntTrailingEdge ? Infinity : tipLE + tipBps[tipBps.length - 1]!;
  const nTip = Math.round(N_TIP * 1.5 ** level);
  const overTipBevel = (i: number) => {
    if (i < iTipLE || i >= iSlabEnd) return false;
    const xm = 0.5 * (tipColumns[i]! + tipColumns[i + 1]!);
    if (xm < leadBevelEnd && i - iTipLE < nTip) return true;
    return xm > trailBevelStart && iTE - 1 - i < nTip && i < iTE;
  };
  return {
    level,
    grid,
    overTipBevel,
    boxes,
    names,
    iTipLE,
    iSlabEnd,
    jTip: NB,
    onFin,
    w,
    counts: { columns: counts0, rowsBelow: nb0, rowsAbove: na0, theta: nt0 },
    startPlane: xs,
    geometry: planar ? 'planar' : 'cylindrical',
  };
}

/** The gates of 2.11 on a sector grid: walls are the body, the fin's faces and the tip face. */
export function sectorQuality(s: SectorGrid, onFail?: QualityOptions['onFail']): Quality3D {
  const inBox = (i: number, j: number, k: number) =>
    s.boxes.some((b) => i >= b.i0 && i < b.i1 && j >= b.j0 && j < b.j1 && k >= b.k0 && k < b.k1);
  const g = s.grid;
  const height = (i: number, j: number) => {
    const a = g.c2[nodeIndex3D(g, i, j, N_S)]! - g.c2[nodeIndex3D(g, i, j, 0)]!;
    return a;
  };
  return quality3D(g, s.geometry, {
    inDomain: inBox,
    walls: (i, j, k) => {
      const out: WallSide[] = [];
      if (j === 0 && k >= N_S) out.push('jMin');
      if (
        k === N_S &&
        j < s.jTip &&
        s.onFin(i, j) &&
        s.onFin(i + 1, j) &&
        s.onFin(i, j + 1) &&
        s.onFin(i + 1, j + 1)
      )
        out.push('kMin');
      if (j === s.jTip && k < N_S) out.push('jMin');
      return out;
    },
    angleExempt: (i, j, k) => k < N_S && (height(i, j) === 0 || height(i + 1, j) === 0),
    sizeExempt: (i, j, k) => k < N_S && j >= s.jTip && s.overTipBevel(i),
    ...(onFail ? { onFail } : {}),
  });
}
