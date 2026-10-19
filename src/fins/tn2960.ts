/**
 * Circular cylinders normal to a supersonic stream: A. F. Gowen and E. W.
 * Perkins, NACA TN 2960, 1953 (https://ntrs.nasa.gov/citations/19930084018),
 * as transcribed for docs/design/0008-total-drag.md
 * (`docs/research/total-drag/data/le_bluntness.md` and `.csv`,
 * `scripts/tn2960_fig5c.py`, `tn2960_fig7.py`), the first readings, and
 * beside them the independent reader's second readings (round 4 of the
 * drag audit: `readings/tn2960_fig5c.csv`, `tn2960_fig7.csv`). The band of
 * ./rounded-leading-edge.ts is the envelope of both readings
 * (docs/design/0010-base-drag-and-total.md section 5.2).
 *
 * A 1 in cylinder in the Ames 1 by 3 ft supersonic tunnels; supersonic
 * Reynolds numbers on the diameter "100,000 to 1,000,000", "No effects of
 * Reynolds number were found" (summary); the stagnation pressure agrees
 * with Rayleigh's pitot formula (p. 6); separation at 100 to 120 deg.
 */

/**
 * Fig. 5(c): the faired pressure coefficient P around the cylinder, theta
 * in degrees from the stagnation point, by eye (where the curve runs
 * between a +theta symbol and its flagged -theta twin, their mean), first
 * reading. One value is corrected: at M 1.98 and 45 deg the faired curve
 * is 0.884 (the second reader's column scans at 42.0 and 48.6 deg), not
 * the 0.918 first read; that check was made after the first reading was
 * opened, so 0.884 is not blind.
 */
export const TN2960_FIG5C: readonly {
  readonly mach: number;
  readonly reynolds: number;
  readonly points: readonly { readonly theta: number; readonly p: number }[];
}[] = [
  {
    mach: 1.49,
    reynolds: 5.8e5,
    points: [
      { theta: 0, p: 1.511 },
      { theta: 15, p: 1.431 },
      { theta: 30, p: 1.172 },
      { theta: 45, p: 0.769 },
      { theta: 60, p: 0.354 },
      { theta: 75, p: -0.002 },
      { theta: 90, p: -0.285 },
      { theta: 100, p: -0.39 },
      { theta: 105, p: -0.434 },
      { theta: 120, p: -0.457 },
      { theta: 135, p: -0.46 },
      { theta: 150, p: -0.46 },
      { theta: 165, p: -0.46 },
      { theta: 180, p: -0.46 },
    ],
  },
  {
    mach: 1.98,
    reynolds: 5.5e5,
    points: [
      { theta: 0, p: 1.67 },
      { theta: 15, p: 1.577 },
      { theta: 30, p: 1.322 },
      { theta: 45, p: 0.884 },
      { theta: 60, p: 0.464 },
      { theta: 75, p: 0.125 },
      { theta: 90, p: -0.134 },
      { theta: 100, p: -0.221 },
      { theta: 105, p: -0.246 },
      { theta: 120, p: -0.277 },
      { theta: 135, p: -0.274 },
      { theta: 150, p: -0.274 },
      { theta: 165, p: -0.274 },
      { theta: 180, p: -0.262 },
    ],
  },
  {
    mach: 2.9,
    reynolds: 7.2e5,
    points: [
      { theta: 0, p: 1.75 },
      { theta: 15, p: 1.664 },
      { theta: 30, p: 1.38 },
      { theta: 45, p: 0.979 },
      { theta: 60, p: 0.546 },
      { theta: 75, p: 0.241 },
      { theta: 90, p: 0.02 },
      { theta: 100, p: -0.056 },
      { theta: 105, p: -0.072 },
      { theta: 120, p: -0.096 },
      { theta: 135, p: -0.096 },
      { theta: 150, p: -0.096 },
      { theta: 165, p: -0.096 },
      { theta: 180, p: -0.096 },
    ],
  },
];

/** Fig. 7: total pressure drag on the diameter, symbol clusters (box centres), first reading. */
export const TN2960_FIG7: readonly { readonly mach: number; readonly cd: number }[] = [
  { mach: 1.483, cd: 1.487 },
  { mach: 1.951, cd: 1.424 },
  { mach: 2.897, cd: 1.346 },
];

/**
 * Fig. 5(c), second reading: the symbols (not the faired curves) at 15 deg
 * steps (read at the nominal angle within 0.3 deg), the mean where a
 * +theta symbol and its flagged -theta twin both appear. Error +-0.005 in
 * P for an isolated symbol, +-0.010 where symbols overlap.
 */
export const TN2960_FIG5C_SECOND: readonly {
  readonly mach: number;
  readonly reynolds: number;
  readonly points: readonly { readonly theta: number; readonly p: number }[];
}[] = (
  [
    [
      1.49,
      5.8e5,
      [
        1.516, 1.441, 1.182, 0.772, 0.36, 0.002, -0.278, -0.448, -0.443, -0.445, -0.448, -0.451,
        -0.446,
      ],
    ],
    [
      1.98,
      5.5e5,
      [
        1.683, 1.582, 1.33, 0.889, 0.47, 0.129, -0.118, -0.248, -0.27, -0.285, -0.272, -0.264,
        -0.247,
      ],
    ],
    [
      2.9,
      7.2e5,
      [
        1.751, 1.667, 1.383, 0.955, 0.531, 0.245, 0.03, -0.08, -0.088, -0.103, -0.106, -0.115,
        -0.09,
      ],
    ],
  ] as const
).map(([mach, reynolds, p]) => ({
  mach,
  reynolds,
  points: p.map((v, k) => ({ theta: 15 * k, p: v })),
}));

/**
 * Fig. 7, second reading: the diamonds (this report's 1 in cylinder) one
 * by one, on 5x zooms; error +-0.005 isolated (M 2.9), +-0.010 in the
 * overlapping groups.
 */
export const TN2960_FIG7_SECOND: readonly { readonly mach: number; readonly cd: number }[] = [
  { mach: 1.487, cd: 1.511 },
  { mach: 1.469, cd: 1.502 },
  { mach: 1.489, cd: 1.474 },
  { mach: 1.978, cd: 1.482 },
  { mach: 1.978, cd: 1.47 },
  { mach: 1.978, cd: 1.422 },
  { mach: 2.896, cd: 1.336 },
];
