/**
 * Circular cylinders normal to a supersonic stream: A. F. Gowen and E. W.
 * Perkins, NACA TN 2960, 1953 (https://ntrs.nasa.gov/citations/19930084018),
 * as transcribed for docs/design/0008-total-drag.md
 * (`docs/research/total-drag/data/le_bluntness.md` and `.csv`,
 * `scripts/tn2960_fig5c.py`, `tn2960_fig7.py`). **First readings; the
 * second is pending.** A further reading is added as data and the band of
 * ./rounded-leading-edge.ts follows, as the envelope of all.
 *
 * A 1 in cylinder in the Ames 1 by 3 ft supersonic tunnels; supersonic
 * Reynolds numbers on the diameter "100,000 to 1,000,000", "No effects of
 * Reynolds number were found" (summary); the stagnation pressure agrees
 * with Rayleigh's pitot formula (p. 6); separation at 100 to 120 deg.
 */

/**
 * Fig. 5(c): the faired pressure coefficient P around the cylinder, theta
 * in degrees from the stagnation point, by eye (where the curve runs
 * between a +theta symbol and its flagged -theta twin, their mean).
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
      { theta: 45, p: 0.918 },
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

/** Fig. 7: total pressure drag on the diameter, symbol clusters (box centres). */
export const TN2960_FIG7: readonly { readonly mach: number; readonly cd: number }[] = [
  { mach: 1.483, cd: 1.487 },
  { mach: 1.951, cd: 1.424 },
  { mach: 2.897, cd: 1.346 },
];
