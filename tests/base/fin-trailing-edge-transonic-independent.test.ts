/**
 * The square trailing edge's term below Mach 1.5 checked from outside the method (design record
 * 0019 section 3.4.1, the review's F3, adapted from the independent reviewer's script): every
 * band-setting point through the served term itself over its whole Mach interval, at its own h/c
 * and layer parameter, for every wing it may be; and the nodes and the served term recomputed
 * here from the record's rule, without the library's builder.
 */

import { describe, expect, it } from 'vitest';
import {
  layerParameterRange,
  TRANSONIC_TE_EVIDENCE,
  TRANSONIC_TE_NODES,
  type TransonicEvidencePoint,
} from '../../src/base/fin-te-transonic';
import {
  bandLowAbove,
  FIN_TRAILING_EDGE_BAND,
  finTrailingEdgeBaseDrag,
  thickLayerFactor,
  thinLayerBasePressure,
  transonicTrailingEdge,
} from '../../src/base/fin-trailing-edge';
import { BaseRefusal } from '../../src/base/refusal';
import { readFileSync } from 'node:fs';

const linspace = (a: number, b: number, n: number) =>
  n <= 1 || b === a ? [a] : Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));

type Served =
  | { readonly cd: number; readonly low: number; readonly high: number; readonly x: number }
  | { readonly refused: string };

/** The term served on a unit base (its drag coefficient on the base's own area) at M, h/c and X. */
function serve(mach: number, hc: number, x: number): Served {
  const c = 0.1;
  const h = hc * c;
  const reC = (1 / (hc * x)) ** 5;
  try {
    const r = finTrailingEdgeBaseDrag({
      mach,
      count: 1,
      thickness: h,
      span: 1,
      chord: c,
      tanSweep: 0,
      inBasePlane: false,
      layer: 'turbulent',
      reynoldsPerLength: reC / c,
      referenceArea: h,
    });
    return { cd: r.cd, low: r.low, high: r.high, x: r.thinLayerParameter };
  } catch (e) {
    if (e instanceof BaseRefusal) return { refused: e.reason };
    throw e;
  }
}

/**
 * Every (h/c, layer parameters) a point may be at: a set's own; RM A51J11 without roughness and
 * RM A52E01 (layer state not stated) from a thin layer to the turbulent value; RM A52E01's line
 * of any wing as wing 2 and as wing 3 or 4; RM A51J25's symbols (no section stated) thin, at
 * TN 3548's h/c.
 */
function variants(p: TransonicEvidencePoint): { label: string; hc: number; xs: number[] }[] {
  const pr = p.properties;
  if (p.set.startsWith('RM A52E01')) {
    const re = p.set.endsWith('(a)') ? 1.5e6 : 3.8e6;
    const wings = p.series === 'any wing' ? [0.03, 0.015] : [p.series === 'wing 2' ? 0.03 : 0.015];
    return wings.map((hc) => ({
      label: `h/c ${hc}`,
      hc,
      xs: linspace(0.5, layerParameterRange(hc, re, re)[1], 9),
    }));
  }
  if (pr.layer !== undefined) {
    return [{ label: 'own layer', hc: pr.hOverC!, xs: linspace(pr.layer[0], pr.layer[1], 5) }];
  }
  if (pr.ratioLayer !== undefined) {
    return [{ label: 'layer unknown', hc: pr.hOverC!, xs: linspace(0.5, pr.ratioLayer[1], 9) }];
  }
  return [{ label: 'thin', hc: pr.hOverC ?? 0.06, xs: [0.5, 0.66] }];
}

describe('every band-setting point against the term served at its own conditions', () => {
  it('lies inside the served band, or the term is refused there, over its whole Mach interval', () => {
    let points = 0;
    let served = 0;
    const outside: string[] = [];
    for (const p of TRANSONIC_TE_EVIDENCE) {
      const m0 = Math.max(p.machLow, 1.0);
      const m1 = Math.min(p.machHigh, 1.5 - 1e-12);
      if (!(m1 >= m0)) continue;
      points++;
      const machs = [
        ...new Set([
          ...linspace(m0, m1, 9),
          ...TRANSONIC_TE_NODES.filter((m) => m > m0 && m < m1),
          ...(p.mach >= m0 && p.mach <= m1 ? [p.mach] : []),
        ]),
      ];
      for (const v of variants(p)) {
        for (const m of machs) {
          for (const x of v.xs) {
            const s = serve(m, v.hc, x);
            if ('refused' in s) continue;
            served++;
            expect(s.x).toBeCloseTo(x, 9);
            // Measured base drag, -Cp_b, on the same unit base.
            const [dLo, dHi] = [-p.cpHigh, -p.cpLow];
            if (dLo < s.low * (1 - 1e-12) || dHi > s.high * (1 + 1e-12)) {
              outside.push(`${p.set} ${p.reading} ${p.id} ${v.label} M ${m} X ${x}`);
            }
          }
        }
      }
    }
    expect(points).toBeGreaterThan(500);
    expect(served).toBeGreaterThan(10_000);
    expect(outside).toEqual([]);
  });
});

describe('the nodes and the served term, recomputed from the record (item 3 to 7)', () => {
  // The nominal: each node the mean of TN 3548 and R&M 3427, each the mean over its readings and
  // series of its points linear in M; the curve at 1.5.
  const interp = (pts: { m: number; cp: number }[], m: number) => {
    const s = [...pts].sort((a, b) => a.m - b.m);
    for (let i = 0; i + 1 < s.length; i++) {
      const [a, b] = [s[i]!, s[i + 1]!];
      if (m >= a.m && m <= b.m && b.m > a.m)
        return a.cp + ((m - a.m) / (b.m - a.m)) * (b.cp - a.cp);
    }
    return undefined;
  };
  const setAt = (set: string, m: number) => {
    const groups = new Map<string, { m: number; cp: number }[]>();
    for (const p of TRANSONIC_TE_EVIDENCE.filter((q) => q.set === set)) {
      const k = `${p.reading}|${p.series}`;
      groups.set(k, [...(groups.get(k) ?? []), { m: p.mach, cp: (p.cpLow + p.cpHigh) / 2 }]);
    }
    const v = [...groups.values()].map((g) => interp(g, m)).filter((x) => x !== undefined);
    return v.length > 0 ? v.reduce((a, b) => a + b, 0) / v.length : undefined;
  };
  const nodeCp = TRANSONIC_TE_NODES.map((m) => {
    if (m === 1.5) return thinLayerBasePressure(1.5);
    const v = ['TN 3548 fig. 6', 'R&M 3427 fig. 13']
      .map((s) => setAt(s, m))
      .filter((x) => x !== undefined);
    return v.reduce((a, b) => a + b, 0) / v.length;
  });
  const between = (m: number) => {
    let k = 0;
    while (k + 2 < TRANSONIC_TE_NODES.length && m > TRANSONIC_TE_NODES[k + 1]!) k++;
    const [a, b] = [TRANSONIC_TE_NODES[k]!, TRANSONIC_TE_NODES[k + 1]!];
    return { k, t: (m - a) / (b - a) };
  };
  const nominal = (m: number) => {
    const { k, t } = between(m);
    return nodeCp[k]! + t * (nodeCp[k + 1]! - nodeCp[k]!);
  };
  // The shape allowance: R&M 3348 over R&M 3427's hole 6 in the NPL tunnel, the largest less one.
  let sNpl = -Infinity;
  const plate = new Map<string, { m: number; cp: number }[]>();
  for (const p of TRANSONIC_TE_EVIDENCE.filter(
    (q) => q.set === 'R&M 3427 fig. 13' && q.series === 'hole 6',
  )) {
    plate.set(p.reading, [...(plate.get(p.reading) ?? []), { m: p.mach, cp: p.cpLow }]);
  }
  for (const w of TRANSONIC_TE_EVIDENCE.filter(
    (p) => p.set.startsWith('R&M 3348') && p.mach >= 1,
  )) {
    for (const g of plate.values()) {
      const v = interp(g, w.mach);
      if (v !== undefined) sNpl = Math.max(sNpl, w.cpLow / v - 1, w.cpHigh / v - 1);
    }
  }
  // K at Mach 1.5 over each set's layer range, sampled finely; every ratio over the point's Mach
  // interval; inclined sets widened both ways (the ordering is contradicted, item 6).
  const kOf = (x: number) => (x <= 1 ? 1 : thickLayerFactor(1.5, Math.min(x, 4.5)).nominal);
  const ratios = TRANSONIC_TE_EVIDENCE.flatMap((p) => {
    const m0 = Math.max(p.machLow, 1);
    const m1 = Math.min(p.machHigh, 1.5);
    if (!(m1 >= m0)) return [];
    const range = p.properties.ratioLayer ?? p.properties.layer;
    const ks = range === undefined ? [1] : linspace(range[0], range[1], 400).map(kOf);
    const ms = [...linspace(m0, m1, 50), ...TRANSONIC_TE_NODES.filter((m) => m > m0 && m < m1)];
    const r = ms.flatMap((m) =>
      [p.cpLow, p.cpHigh].flatMap((cp) =>
        [Math.min(...ks), Math.max(...ks)].map((k) => cp / (nominal(m) * k)),
      ),
    );
    const s = (sNpl * p.properties.faceAngleDeg) / 4;
    const inclined = p.properties.shape !== 'flat';
    return [
      {
        p,
        low: Math.min(...r) * (inclined ? 1 - s : 1),
        high: Math.max(...r) * (inclined ? 1 + s : 1),
      },
    ];
  });
  const nodes = TRANSONIC_TE_NODES.map((m, k) => {
    const a = TRANSONIC_TE_NODES[Math.max(0, k - 1)]!;
    const b = TRANSONIC_TE_NODES[Math.min(TRANSONIC_TE_NODES.length - 1, k + 1)]!;
    const w = ratios.filter((r) => r.p.machHigh >= a && r.p.machLow <= b);
    return {
      mach: m,
      low: Math.min(...w.map((r) => r.low)),
      high: Math.max(...w.map((r) => r.high)),
      reach: Math.max(...w.map((r) => r.p.properties.layer?.[0] ?? -Infinity)),
      count: w.length,
    };
  });

  it("gives the library's nodes: nominal, band ends, layer reach and the points in each window", () => {
    const t = transonicTrailingEdge();
    expect(t.shapeAllowance).toBeCloseTo(sNpl, 12);
    for (const [k, n] of nodes.entries()) {
      const lib = t.nodes[k]!;
      expect(lib.mach).toBe(n.mach);
      expect(lib.cp, `cp at ${n.mach}`).toBeCloseTo(nodeCp[k]!, 12);
      expect(lib.low, `low at ${n.mach}`).toBeCloseTo(n.low, 9);
      expect(lib.high, `high at ${n.mach}`).toBeCloseTo(n.high, 9);
      expect(lib.layerReached, `reach at ${n.mach}`).toBeCloseTo(n.reach, 12);
      expect(lib.count, `points at ${n.mach}`).toBe(n.count);
    }
  });

  it("gives the term served: the nominal times K at Mach 1.5, the band times K's ends over K", () => {
    for (const m of [1.0, 1.02, 1.07, 1.13, 1.15, 1.22, 1.3, 1.37, 1.44, 1.49]) {
      const { k, t } = between(m);
      const envLow = nodes[k]!.low + t * (nodes[k + 1]!.low - nodes[k]!.low);
      const envHigh = nodes[k]!.high + t * (nodes[k + 1]!.high - nodes[k]!.high);
      const reach = Math.min(nodes[k]!.reach, nodes[k + 1]!.reach, 4.5);
      for (const [hc, x] of [
        [0.06, 0.6],
        [0.1, 0.9],
        [0.03, 1.7],
        [0.03, 1.9],
        [0.012, 4.4],
      ] as const) {
        const s = serve(m, hc, x);
        if (x > reach) {
          expect(s, `M ${m} X ${x}`).toEqual({ refused: 'thick-layer' });
          continue;
        }
        if ('refused' in s) throw new Error(`refused at M ${m} X ${x}: ${s.refused}`);
        const kk = x <= 1 ? { nominal: 1, low: 1, high: 1 } : thickLayerFactor(1.5, x);
        const cd = -nominal(m) * kk.nominal;
        expect(s.cd, `cd at M ${m} X ${x}`).toBeCloseTo(cd, 12);
        expect(s.low).toBeCloseTo(
          Math.min(FIN_TRAILING_EDGE_BAND.low, envLow) * cd * (kk.low / kk.nominal),
          9,
        );
        expect(s.high).toBeCloseTo(
          Math.max(FIN_TRAILING_EDGE_BAND.high, envHigh) * cd * (kk.high / kk.nominal),
          9,
        );
      }
    }
  });
});

describe('the band above Mach 1.5 near 1.7, recomputed from the four-way pairing (F4)', () => {
  const dir = '../../docs/research/total-drag/audit/pairing-2026-10-27-a52e01-m17-four';
  const text = (f: string) => readFileSync(new URL(`${dir}/${f}`, import.meta.url), 'utf8');
  const rows = text('identity_map.csv').trim().split('\n');
  // The CSV's quoted fields hold commas: take each curve's alpha 0 cells by their pattern.
  const valuesOf = (curve: string) => {
    const row = rows.find((r) => r.includes(`"M=1.2, 1.4, 1.7 ${curve}"`))!;
    const cells = [...row.matchAll(/"?(-0\.\d+) \+-(0\.\d+) \(([^)]*)\)"?/g)];
    return cells.flatMap((c) => {
      const [v, e] = [Number(c[1]), Number(c[2])];
      return c[3]!.includes('bound') ? [v - e, v + e] : [v];
    });
  };
  // #10, wing 2 as F4 takes it: C, D and D's alternative end as a value; K from 1.
  const alt = /lowest end at alpha 0\.343 \+-0\.068, (-0\.\d+) \+-/.exec(text('pairing.txt'))!;
  const ten = [...valuesOf('#10'), Number(alt[1])];
  // #7, any wing: C and D; the shape allowance at 6.88 deg.
  const seven = valuesOf('#7');
  const s = (transonicTrailingEdge().shapeAllowance * 6.88) / 4;
  const least = (values: number[], widening: number) => {
    let r = Infinity;
    for (let i = 0; i <= 200; i++) {
      const m = 1.69 + (0.02 * i) / 200;
      r = Math.min(r, Math.min(...values.map((v) => v / thinLayerBasePressure(m))));
    }
    return Math.floor(r * (1 - widening) * 100 + 1e-9) / 100;
  };

  it("gives the library's low end at every Mach number from 1.5 to 1.9", () => {
    expect(ten.length).toBe(4);
    expect(seven.length).toBe(3);
    const r10 = least(ten, 0);
    const r7 = least(seven, s);
    expect([r10, r7]).toEqual([0.41, 0.51]);
    // Item 5's windows: the nodes 1.65, 1.70 and 1.75 take the least ratio, 0.93 elsewhere.
    const node = (m: number) =>
      m >= 1.65 - 1e-9 && m <= 1.75 + 1e-9 ? Math.min(0.93, r10, r7) : 0.93;
    for (let i = 0; i <= 80; i++) {
      const m = 1.5 + (0.4 * i) / 80;
      const k = Math.floor((m - 1.5) / 0.05 + 1e-9);
      const [a, b] = [1.5 + 0.05 * k, 1.5 + 0.05 * (k + 1)];
      const expected = node(a) + ((m - a) / (b - a)) * (node(b) - node(a));
      expect(bandLowAbove(m), `M ${m}`).toBeCloseTo(expected, 9);
    }
  });
});
