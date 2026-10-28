/**
 * Rounded leading edges swept beyond 60 deg, bounded, not measured
 * (src/fins/rounded-leading-edge.ts; docs/design/0016-fin-edges-of-flat-plates.md
 * sections 21.2, 21.7 and 21.8; 0014 section 10.7 (ab) and its addenda):
 * the lower bound is the term at the sweep at its band's low end, the
 * upper the term at 60 deg at its band's high end, the midpoint served; the
 * ordering's ingredients (the term falls with sweep; fig. 12's per-span
 * drag falls with yaw) and the domain. Served from 60 to 75.1 deg again
 * since TN 3861 fig. 17 was read twice and 21.2's rule held on it;
 * refused beyond 75.1 deg at any Mach number.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FinRefusal } from '../../src/fins/refusal';
import { RM_A55H31_FIG12, RM_A55H31_FIG12_SECOND } from '../../src/fins/rm-a55h31';
import {
  LARGEST_CHECKED_SWEEP_DEGREES,
  pitotPressureCoefficient,
  roundedLeadingEdgeDrag,
  ROUNDED_EDGE_BAND,
  roundedEdgeBandLow,
  sweepChecks,
  TN3861_RULE_MARGINS,
  transonicFrontSide,
} from '../../src/fins/rounded-leading-edge';

const deg = Math.PI / 180;
const radius = 0.0015;

const input = (mach: number, sweepDeg: number, re: number) => ({
  mach,
  radius,
  faceAngle: 0,
  tanLeadingEdgeSweep: Math.tan(sweepDeg * deg),
  reynoldsOnDiameter: re,
});
/** The served term: bounded from 60 to 75.1 deg. */
const at = (mach: number, sweepDeg: number, re = 2e5) =>
  roundedLeadingEdgeDrag(input(mach, sweepDeg, re));

function failure(f: () => unknown): FinRefusal {
  try {
    f();
  } catch (e) {
    if (e instanceof FinRefusal) return e;
    throw e;
  }
  throw new Error('expected a refusal');
}

/**
 * The term at sweep S beyond 60 deg, unbounded, from the served function at
 * 45 deg: at the same normal Mach and Reynolds numbers it has the same band
 * (the allowance is flat from 14.3 deg), and the term scales with cos^2(S).
 */
function termBeyond(mach: number, sweepDeg: number, re: number) {
  const c = Math.cos(sweepDeg * deg);
  const c45 = Math.cos(45 * deg);
  const t = at((mach * c) / c45, 45, (re * c) / c45);
  return {
    dragPerSpan: t.dragPerSpan * ((c * c) / (c45 * c45)),
    band: t.band,
    normalMach: t.normalMach,
  };
}

describe('the bounds', () => {
  it('Mach 3.0 at 62 deg: the term at 62 deg at its low end, the term at 60 deg at its high end', () => {
    const e = at(3.0, 62);
    const lower = termBeyond(3.0, 62, 2e5);
    const upper = at(3.0, 60);
    expect(upper.bounded).toBeUndefined();
    expect(lower.normalMach).toBeCloseTo(3 * Math.cos(62 * deg), 12);
    const low = lower.dragPerSpan * lower.band.low;
    const high = upper.dragPerSpan * upper.band.high;
    expect(e.bounded!.low).toBeCloseTo(low, 14);
    expect(e.bounded!.high).toBeCloseTo(high, 14);
    expect(e.dragPerSpan).toBeCloseTo(0.5 * (low + high), 14);
    expect(e.band.low * e.dragPerSpan).toBeCloseTo(low, 14);
    expect(e.band.high * e.dragPerSpan).toBeCloseTo(high, 14);
    expect(e.normalMach).toBeCloseTo(lower.normalMach, 12);
    expect(e.bounded!.upperNormalMach).toBeCloseTo(1.5, 12);
    expect(e.sweepDegrees).toBeCloseTo(62, 9);
    // The gap is wide: the upper end is more than twice the lower.
    expect(high / low).toBeGreaterThan(1.5);
  });

  it("the label says bounded, and carries each bound's source, band and qualifiers, shortened", () => {
    const e = at(2.8, 63);
    const { lower, upper } = e.bounded!;
    expect(e.label.startsWith('bounded, not measured: swept 63.0 deg, past the 60 deg')).toBe(true);
    expect(e.label).toMatch(
      /the band the whole gap between two terms, each a cylinder's front side carried to a fin edge, an analogy tested only in the total\. /,
    );
    expect(e.label).toContain(
      `Lower: the term at 63.0 deg (M_n ${lower.normalMach.toFixed(3)}) at its band's low end, ` +
        `${lower.band.low.toFixed(3)} of it: the `,
    );
    expect(e.label).toContain(
      `Upper: the term at 60 deg (M_n ${upper.normalMach.toFixed(3)}) at its band's high end, ` +
        `${upper.band.high.toFixed(3)} of it: the `,
    );
    // Each term's band and source.
    expect(e.label).toContain(
      `its band ${lower.band.low.toFixed(3)} to ${lower.band.high.toFixed(3)} with`,
    );
    expect(e.label).toContain(
      `its band ${upper.band.low.toFixed(3)} to ${upper.band.high.toFixed(3)} with`,
    );
    expect(e.label).toMatch(/NASA CR-149372/);
    // The lower term's sweep clause: the allowance carried past where it is checked, and no
    // "no yawed datum ... at a served sweep" (the re-review of 2026-10-27).
    const lowerPart = e.label.slice(e.label.indexOf('Lower:'), e.label.indexOf('Upper:'));
    expect(lowerPart).toMatch(
      /the sweep allowance 0\.950 to 1\.220 carried past 60 deg, where its yawed-cylinder checks end\. $/,
    );
    expect(lowerPart).not.toMatch(/no yawed datum/);
    expect(e.label).not.toMatch(/at a served sweep/);
    const upperPart = e.label.slice(e.label.indexOf('Upper:'), e.label.indexOf('The ordering:'));
    expect(upperPart).toMatch(
      /extrapolated in normal Mach number \(checked at M_n 3\.38 to 6\.65; no yawed datum below M_n 1\.95 at 60 deg of sweep or less\)\. $/,
    );
    // The ordering names figs. 15 to 17, each read twice; what each point holds it over, the
    // unflagged 70 deg point to 70 deg only, the two flagged points from 70 to 75.1 deg; the
    // flags; and fig. 11's stagnation pressure for the 75.1 deg test (Fable's review and its
    // quick look, 2026-10-28).
    expect(e.label).toMatch(
      /rests on the principle and on TN 3861's crossflow points \(figs\. 15 to 17, each read twice\), all above the principle: /,
    );
    expect(e.label).toContain(
      `the unflagged 70 deg point holds it to 70 deg, by ${TN3861_RULE_MARGINS.at70.toFixed(3)}; ` +
        'from 70 to 75.1 deg it rests on the two flagged points too, by ' +
        `${TN3861_RULE_MARGINS.at75.toFixed(3)} and ${TN3861_RULE_MARGINS.at751.toFixed(3)} (`,
    );
    expect(e.label).toMatch(
      /the unflagged 70 deg point holds it to 70 deg, by 0\.173; from 70 to 75\.1 deg it rests on the two flagged points too, by 0\.677 and 0\.176 \(/,
    );
    expect(e.label).toMatch(
      /\(the 75 deg one flagged high, p\. 11; the 75\.1 deg one for an end effect, p\. 10, its stagnation pressure 0\.63 to 0\.74 of Rayleigh's on RM A55H31 fig\. 11\) \(0016 section 21\.2\)$/,
    );
    // Not that the 70 deg point alone holds the ordering to 75.1 deg.
    expect(e.label).not.toMatch(/alone holds/);
    expect(e.label).not.toMatch(/largest sweep checked on yawed cylinders|principle alone/);
    // Shorter than the about 2,800 characters the re-review found.
    expect(e.label.length).toBeLessThan(1800);
    expect(at(2.2, 60.1).label.length).toBeLessThan(1800);
    // The longest on a grid of Mach 1.2 to 8, sweeps 60.1 to 75.1 deg and four Reynolds numbers
    // (0016 section 21.10): 1,790 characters.
    expect(at(2.45, 60.1, 2e4).label.length).toBeLessThan(1800);
  });

  it("beyond 75.1 deg, the largest sweep at which a yawed cylinder's front side is estimated: refused at any Mach number", () => {
    expect(LARGEST_CHECKED_SWEEP_DEGREES).toBe(75.1);
    // M 5.0 at 78 deg was served from 0.869 of the term before the re-review.
    for (const [m, sw] of [
      [5.0, 78],
      [4.0, 75.2],
      [6.0, 80],
    ] as const) {
      const e = failure(() => at(m, sw));
      expect(e.reason).toBe('swept-leading-edge');
      expect(e.message).toMatch(/is refused at any Mach number: beyond 75\.1 deg/);
      expect(e.message).toMatch(/the principle alone not sufficing \(0016 section 21\.2\)$/);
    }
    expect(at(5.0, 75).bounded).toBeDefined();
  });

  it("21.2's rule's three margins, pinned to the committed verdict: 70 deg +0.1734, 75 deg +0.6771, 75.1 deg +0.1756", () => {
    // docs/research/tn3861-fig17/rule/out/verdict.txt, written by rule/apply.test.ts, which
    // checks it against a fresh run (Fable's review, 2026-10-28).
    const verdict = readFileSync(
      new URL('../../docs/research/tn3861-fig17/rule/out/verdict.txt', import.meta.url),
      'utf8',
    );
    const margins = [...verdict.matchAll(/least margin (\d\.\d{4}): holds/g)].map((m) => m[1]);
    expect(margins).toEqual(['0.1734', '0.6771', '0.1756']);
    expect(verdict).toMatch(
      /Lord and Ulmann's 70 deg point: P03[\s\S]*least margin 0\.1734: holds/,
    );
    expect(verdict).toMatch(/VERDICT: the rule HOLDS at all three points\n?$/);
    expect(TN3861_RULE_MARGINS).toEqual({ at70: 0.1734, at75: 0.6771, at751: 0.1756 });
    for (const v of Object.values(TN3861_RULE_MARGINS)) expect(v).toBeGreaterThan(0);
  });

  it("the review's case either side of 60 deg: M 2.2, a 3 mm plate, Re_D 2e5", () => {
    const below = at(2.2, 59.9);
    const beyond = at(2.2, 60.1);
    // Every qualifier the 59.9 deg term carries, the 60.1 deg bounded term carries too.
    for (const q of [
      'extrapolated in Reynolds number',
      'no yawed datum below M_n 1.95',
      'NASA CR-149372',
      'extrapolated in normal Mach number',
    ]) {
      expect(below.label).toContain(q);
      expect(beyond.label).toContain(q);
    }
    // At 59.9 deg the served term's own words; past 60 deg, the datum clause only for the 60 deg
    // term. Since 60 to 75.1 deg is served, the clause names 60 deg or less, not "a served sweep"
    // (Fable's review, 2026-10-28).
    expect(below.label).toContain('no yawed datum below M_n 1.95 at 60 deg of sweep or less');
    expect(below.label).not.toMatch(/at a served sweep/);
    expect(beyond.label).toContain('no yawed datum below M_n 1.95 at 60 deg of sweep or less');
    expect(beyond.bounded!.lower.regime).toBe('extrapolated in Reynolds number');
    expect(beyond.bounded!.upper.regime).toBe('extrapolated in Reynolds number');
    expect(beyond.bounded!.upper.transonic).toBeDefined();
    expect(beyond.bounded!.lower.transonic).toBeDefined();
  });

  it('at 60 deg itself nothing changes: the measured term, not bounded', () => {
    const e = at(3.0, 60);
    expect(e.bounded).toBeUndefined();
    expect(e.label.startsWith('an analogy')).toBe(true);
  });

  it('just beyond 60 deg the band grows from the 60 deg one without a gap below it', () => {
    // Re 3e5 on the diameter: the normal component stays above TN 2960's 1e5 at both sweeps.
    const e60 = at(3.0, 60, 3e5);
    const e = at(3.0, 60.01, 3e5);
    expect(e.bounded!.high).toBeCloseTo(e60.dragPerSpan * e60.band.high, 14);
    expect(e.bounded!.low).toBeLessThan(e60.dragPerSpan * e60.band.low * 1.0001);
    expect(e.bounded!.low).toBeGreaterThan(e60.dragPerSpan * e60.band.low * 0.99);
  });
});

describe('the ordering', () => {
  it('kappa Cp_pitot rises with the normal Mach number, so the term falls with sweep', () => {
    const f = (mn: number) =>
      (mn < 1.49 ? transonicFrontSide(mn).nominal : 1) * pitotPressureCoefficient(mn);
    let prev = -Infinity;
    for (let k = 0; k <= 2000; k++) {
      const mn = 1 + k * 0.001;
      const v = f(mn);
      expect(v).toBeGreaterThan(prev);
      prev = v;
    }
    // So the lower bound falls with sweep and stays below the upper, at Mach 3 to 70.5 deg.
    let last = Infinity;
    for (let s = 60.5; s <= 70.5; s += 0.5) {
      const e = at(3.0, s, 2e5);
      expect(e.bounded!.low).toBeLessThan(last);
      expect(e.bounded!.low).toBeLessThan(e.bounded!.high);
      last = e.bounded!.low;
    }
  });

  it("fig. 12's front side per unit span falls with yaw on every series, both readings", () => {
    for (const reading of [RM_A55H31_FIG12, RM_A55H31_FIG12_SECOND]) {
      for (const source of ['present tests', 'reference 1'] as const) {
        const series = sweepChecks(reading)
          .filter((c) => c.source === source)
          .map((c) => ({ yaw: c.yaw, perSpan: c.gauge / Math.cos(c.yaw * deg) }))
          .sort((a, b) => a.yaw - b.yaw);
        let prev = 1;
        for (const p of series) {
          expect(p.perSpan).toBeLessThan(prev);
          prev = p.perSpan;
        }
      }
    }
  });

  it("the record's numbers: Penland's per-span drag 0.243 to 0.249 at 59.8 deg, 0.059 to 0.068 at 75.1", () => {
    const perSpan = (reading: typeof RM_A55H31_FIG12, yaw: number) => {
      const c = sweepChecks(reading).find((x) => x.source === 'reference 1' && x.yaw === yaw)!;
      return {
        perSpan: c.gauge / Math.cos(c.yaw * deg),
        r: c.r,
        model: c.model / Math.cos(c.yaw * deg),
      };
    };
    const a = perSpan(RM_A55H31_FIG12, 59.8);
    const b = perSpan(RM_A55H31_FIG12_SECOND, 59.8);
    const c = perSpan(RM_A55H31_FIG12, 75.1);
    const d = perSpan(RM_A55H31_FIG12_SECOND, 75.1);
    expect(a.perSpan).toBeCloseTo(0.2432, 3);
    expect(b.perSpan).toBeCloseTo(0.2489, 3);
    expect(c.perSpan).toBeCloseTo(0.0683, 3);
    expect(d.perSpan).toBeCloseTo(0.0591, 3);
    // r at 75.1 deg on both readings: above the allowance's low end as read.
    expect(c.r).toBeCloseTo(1.17, 2);
    expect(d.r).toBeCloseTo(1.013, 3);
    // The check that sets nothing: the bounds at the point's own conditions (M 6.86, M_n 1.76).
    const m = 6.86;
    const model60 =
      (Math.cos(60 * deg) ** 2 * pitotPressureCoefficient(m * Math.cos(60 * deg))) /
      pitotPressureCoefficient(m);
    expect(model60).toBeCloseTo(0.2434, 4);
    const lowEnd = c.model * roundedEdgeBandLow(m * Math.cos(75.1 * deg)) * 0.95;
    const highEnd = model60 * ROUNDED_EDGE_BAND.high * 1.22;
    expect(lowEnd).toBeCloseTo(0.0549, 3);
    expect(highEnd).toBeCloseTo(0.315, 3);
    for (const p of [c.perSpan, d.perSpan]) {
      expect(p).toBeGreaterThan(lowEnd);
      expect(p).toBeLessThan(highEnd);
    }
    // In units of the principle at 75.1 deg the band is 0.94 to 5.4.
    expect(lowEnd / c.model).toBeCloseTo(0.9405, 3);
    expect(highEnd / c.model).toBeCloseTo(5.39, 2);
  });

  it('r at 75.1 deg moves 0.068 per 0.001 of fig. 12, so the one point cannot show r >= 0.95', () => {
    const rAt = (value: number) =>
      sweepChecks(
        RM_A55H31_FIG12_SECOND.map((p) =>
          p.source === 'reference 1' && p.statedYaw === 75.1 ? { ...p, value } : p,
        ),
      ).find((x) => x.source === 'reference 1' && x.yaw === 75.1)!.r;
    const read = RM_A55H31_FIG12_SECOND.find(
      (p) => p.source === 'reference 1' && p.statedYaw === 75.1,
    )!.value;
    expect((rAt(read + 0.001) - rAt(read)) / 0.001).toBeCloseTo(68.2, 0);
    // Within the second reading's stated error, 0.002: 0.877 to 1.149.
    expect(rAt(read - 0.002)).toBeCloseTo(0.877, 3);
    expect(rAt(read + 0.002)).toBeCloseTo(1.149, 3);
    expect(rAt(read - 0.002)).toBeLessThan(0.95);
  });

  it("TN 3861's crossflow points at 70 and 75 deg (a check that sets nothing): above the principle, inside the band", () => {
    // docs/research/total-drag/data/fin_edges_w34.md section 4: the front
    // side estimated as F = C_D + Cp_down (fig. 17 read once, figs. 15 and 16
    // twice), over modified Newtonian at the crossflow Mach number; the
    // stagnation pressure over Rayleigh's (fig. 15, read twice).
    const points = [
      {
        name: 'Lord and Ulmann, 70 deg',
        mach: 4.04,
        sweep: 70,
        f: [1.053, 1.048],
        stag: [1.067, 1.066],
      },
      {
        name: 'Lord and Ulmann, 75 deg (flagged high)',
        mach: 4.04,
        sweep: 75,
        f: [1.445, 1.445],
        stag: [1.528, 1.497],
      },
    ];
    for (const p of points) {
      for (const s of p.stag) expect(s).toBeGreaterThan(1);
      const c = Math.cos(p.sweep * deg);
      const newtonian = (pitotPressureCoefficient(p.mach * c) * c * c * radius * 4) / 3;
      // Reynolds numbers unstated: the bands of every regime served.
      for (const re of [3e4, 1e5, 3e5, 1e6]) {
        const e = at(p.mach, p.sweep, re);
        const b = e.bounded!;
        for (const f of p.f) {
          // Above the term itself (kappa below M_n 1.49), so above its low end.
          expect(f * newtonian).toBeGreaterThan(b.lower.dragPerSpan);
          expect(f * newtonian).toBeGreaterThan(b.low);
          expect(f * newtonian).toBeLessThan(b.high);
          // F is off by up to 0.086 of modified Newtonian on TN 2960's own cylinders.
          expect((f - 0.086) * newtonian).toBeGreaterThan(b.low);
        }
      }
    }
    // Penland's 75 deg point, M_c 1.73 to 1.76 (kappa 1): F 1.166 and 1.165,
    // above the band's low end in units of the principle, 0.9405, with 0.086 off.
    for (const f of [1.166, 1.165]) expect(f - 0.086).toBeGreaterThan(0.9405);
  });
});

describe('the domain: both terms must be served', () => {
  it('Mach 2.0 at 62 deg: the normal Mach number at the sweep below 1.0, refused with the reasons', () => {
    const e = failure(() => at(2.0, 62));
    expect(e.reason).toBe('leading-edge-range');
    expect(e.message).toMatch(/^a rounded leading edge swept 62\.0 deg, beyond the 60 deg/);
    expect(e.message).toMatch(
      /is served only bounded, between the term at its sweep and the term at 60 deg/,
    );
    expect(e.message).toMatch(
      /at 62\.0 deg, the Mach number normal to the edge, M cos\(sweep\), 0\.9389 is below 1\.0/,
    );
    expect(e.message).not.toMatch(/(\): |; and )at 60 deg,/);
  });

  it('Mach 3.0 beyond 70.5 deg: refused', () => {
    expect(failure(() => at(3.0, 71)).reason).toBe('leading-edge-range');
    expect(at(3.0, 70.5).bounded).toBeDefined();
  });

  it("the Reynolds number's normal component at the sweep below 6.7e3, at 60 deg above it", () => {
    // 1.4e4 on the diameter: 6573 at 62 deg, 7000 at 60.
    const e = failure(() => at(3.0, 62, 1.4e4));
    expect(e.message).toMatch(
      /at 62\.0 deg, Reynolds number 657\d on the edge's diameter \(normal component\) is below 6700/,
    );
    expect(e.message).not.toMatch(/(\): |; and )at 60 deg,/);
  });

  it('both terms refused: both reasons', () => {
    // Re 1.2e4: 6000 at 60 deg, 5634 at 62 deg.
    const e = failure(() => at(3.0, 62, 1.2e4));
    expect(e.message).toMatch(/at 62\.0 deg, Reynolds number/);
    expect(e.message).toMatch(/; and at 60 deg, Reynolds number/);
  });
});

describe('served from 60 to 75.1 deg again (0016 section 21.8); refused beyond', () => {
  it('66.4 deg at M 2.8 and 75.0 deg at M 4.04: bounded; 75.2 deg at M 4.0: refused at any Mach number', () => {
    expect(at(2.8, 66.4).bounded).toBeDefined();
    expect(at(4.04, 75).bounded).toBeDefined();
    const e = failure(() => at(4.0, 75.2));
    expect(e.reason).toBe('swept-leading-edge');
    expect(e.message).toMatch(
      /^a rounded leading edge swept 75\.2 deg is refused at any Mach number: beyond 75\.1 deg, the largest sweep at which a yawed cylinder's front side is estimated and the bounds' ordering checked \(TN 3861 figs\. 15 to 17; fig\. 17's one point beyond it, Lord and Ulmann's at 80\.1 deg, has no downstream pressure on fig\. 16 to estimate a front side from\)/,
    );
  });

  it('M 6.0 at 60 deg: M cos(sweep) 3.0000000000000004 is the top of the range, not above it', () => {
    expect(6.0 * Math.cos(Math.atan(Math.tan(60 * deg)))).toBeGreaterThan(3.0);
    expect(at(6.0, 60).normalMach).toBeCloseTo(3.0, 12);
    // And the bounded term's upper bound at M 6.0 (its lower at 75 deg, M_n 1.55).
    expect(at(6.0, 75).bounded!.upperNormalMach).toBeCloseTo(3.0, 12);
    // Clearly above 3.0 is still refused.
    expect(failure(() => at(3.0001, 0)).reason).toBe('leading-edge-range');
  });
});
