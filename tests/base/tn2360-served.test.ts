/**
 * Every TN 2360 base pressure the library holds, against the body base term the library serves at that
 * configuration's own geometry (made permanent from the independent review of 2026-10-27 of 0014 section
 * 10.7 (ah)): TN 2360's body alone at Mach 1.5 and 2.0 (TN 3819 fig. 33 at t/c 0, two readings; fig. 35's
 * no-fin tunnel symbol, three), its four fins at the base (fig. 33 at t/c 0.05 and 0.10; fig. 35's finned
 * tunnel symbol, t/c 0.10), and every run of its fig. 6 (two and four fins, t/c 0.05 and 0.10, the trailing
 * edges 0 to 1 chord ahead of the base), each fig. 6 increment added to each reading of the body alone in
 * the same tunnel; and, since round 20, its figs. 5 and 7's body alone at every tripped station, every
 * reading (0014 section 10.7 (ah), the fourth addendum and its correction). The fins are TN 2360's: rectangular, unswept, circular-arc sections, the root chord 1.5
 * body diameters (the chord rule of 0015 section 3.3).
 *
 * Each value, as read, must lie inside the band served: the served band is meant to contain a valid
 * measurement of a configuration it claims. A reading's own error is not added (0008's reading rule).
 * It checks the code that serves the bands against these data, not the data: a misread of them moves
 * the bands built on them too, and the tests that hold the data (compiled-curve.test.ts,
 * fins-on-base-w1.test.ts) catch it.
 */

import { describe, expect, it } from 'vitest';
import { bodyBaseDrag } from '../../src/base/base-drag';
import {
  TN2360_FIG6,
  TN3819_FIG33,
  TN3819_FIG35_TUNNEL_W1,
} from '../../src/base/fins-on-base-w1-data';
import { TN2360_FIG5_FIG7_BODY_ALONE } from '../../src/base/tn3819-fig18';
import { TN3819_FIG35_TUNNEL } from '../../src/base/tn3819-fig35';

const xs = Array.from({ length: 41 }, (_, k) => k / 40);
/** A symmetric circular arc of thickness ratio t, as TN 2360's tails. */
const arc = (t: number) => ({ x: xs, halfThickness: xs.map((s) => 2 * t * s * (1 - s)) });
const finsOf = (count: number, t: number, xc: number) => ({
  count,
  thicknessRatio: t,
  section: 'circular-arc' as const,
  tanLeadingEdge: 0,
  tanTrailingEdge: 0,
  trailingEdgeAheadOfBase: xc,
  rootChordOverDiameter: 1.5,
  nearBase: {
    section: arc(t),
    sectionFamily: 'circular-arc' as const,
    tanLeadingEdgeSweep: 0,
    tanTrailingEdgeSweep: 0,
  },
});

interface Case {
  readonly mach: number;
  readonly what: string;
  /** The measured base pressure coefficient. */
  readonly pB: number;
  /** Fins, or none for the body alone. */
  readonly fins?: ReturnType<typeof finsOf>;
}

/** Every TN 2360 base pressure the library holds, at Mach 1.5 and 2.0. */
function tn2360Cases(): Case[] {
  const cases: Case[] = [];
  for (const mach of [1.5, 2.0]) {
    const at = (m: number) => Math.abs(m - mach) < 0.01;
    const bodies = [
      ...TN3819_FIG33.filter((p) => p.thicknessRatio === 0 && at(p.mach)).map((p) => ({
        src: `fig. 33 ${p.reading}`,
        pB: p.pB,
      })),
      ...[...TN3819_FIG35_TUNNEL, ...TN3819_FIG35_TUNNEL_W1]
        .filter((p) => p.source === 'ref. 26' && at(p.mach))
        .map((p) => ({ src: `fig. 35 ${p.reading}`, pB: p.withoutFins })),
    ];
    for (const b of bodies) cases.push({ mach, what: `body alone, ${b.src}`, pB: b.pB });
    for (const p of TN3819_FIG33.filter((q) => q.thicknessRatio > 0 && at(q.mach))) {
      cases.push({
        mach,
        what: `four fins t/c ${p.thicknessRatio} at the base, fig. 33 ${p.reading}`,
        pB: p.pB,
        fins: finsOf(4, p.thicknessRatio, 0),
      });
    }
    for (const p of [...TN3819_FIG35_TUNNEL, ...TN3819_FIG35_TUNNEL_W1].filter(
      (q) => q.source === 'ref. 26' && at(q.mach),
    )) {
      cases.push({
        mach,
        what: `four fins t/c 0.1 at the base, fig. 35 ${p.reading}`,
        pB: p.withFins,
        fins: finsOf(4, 0.1, 0),
      });
    }
    for (const d of TN2360_FIG6.filter((q) => q.mach === mach)) {
      for (const b of bodies) {
        cases.push({
          mach,
          what:
            `${d.count} fins t/c ${d.thicknessRatio} at x/c ${d.xc}, fig. 6 ${d.reading}` +
            `${d.singleReader === true ? ' (one reader)' : ''} ${d.dPb} on ${b.src}`,
          pB: b.pB + d.dPb,
          fins: finsOf(d.count, d.thicknessRatio, d.xc),
        });
      }
    }
  }
  // Figs. 5 and 7's body alone (round 20), every reading of both readers, Mach 1.5 and 2.0.
  for (const p of TN2360_FIG5_FIG7_BODY_ALONE) {
    const at = `fig. ${p.figure}${p.reynolds === undefined ? '' : `, R ${p.reynolds[0] / 1e6}e6`}`;
    for (const pB of [...p.readingsA, ...p.readingsB]) {
      cases.push({ mach: p.mach, what: `body alone, ${at}, round 20`, pB });
    }
  }
  return cases;
}

describe('every TN 2360 base pressure the library holds lies inside the body base band served for it', () => {
  const cases = tn2360Cases();

  it("the cases: 5 readings of the body alone, 7 of the fins at the base, every fig. 6 run on each body reading, and figs. 5 and 7's body alone", () => {
    const body = (m: number) =>
      cases.filter((c) => c.mach === m && c.fins === undefined && !c.what.endsWith('round 20'));
    expect(body(1.5)).toHaveLength(5);
    expect(body(2.0)).toHaveLength(5);
    expect(cases.filter((c) => c.what.includes('at the base, fig. 3'))).toHaveLength(14);
    expect(TN2360_FIG6.length).toBeGreaterThan(70);
    // Round 20: ten symbols, 23 readings (the partly hidden one at R 0.765e6 carries five).
    expect(cases.filter((c) => c.what.endsWith('round 20'))).toHaveLength(23);
    expect(cases).toHaveLength(10 + 14 + 5 * TN2360_FIG6.length + 23);
  });

  it('each one, as read, inside the served band at its own geometry, none refused', () => {
    const outside: string[] = [];
    for (const c of cases) {
      const r = bodyBaseDrag({
        mach: c.mach,
        afterbody: 'cylinder',
        boundaryLayerAtBase: 'turbulent',
        baseAreaRatio: 1,
        ...(c.fins === undefined ? {} : { fins: c.fins }),
      });
      const v = -c.pB;
      if (v > r.high + 1e-12 || v < r.low - 1e-12) {
        outside.push(
          `M ${c.mach}, ${c.what}: ${v.toFixed(4)} against ${r.low.toFixed(4)} to ${r.high.toFixed(4)}`,
        );
      }
    }
    expect(outside).toEqual([]);
  });
});
