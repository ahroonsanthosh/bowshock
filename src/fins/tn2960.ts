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

/**
 * The front side (0 to 90 deg) of TN 2960's other distributions, first
 * readings for docs/design/0016-fin-edges-of-flat-plates.md
 * (`docs/research/total-drag/data/fin_edges_w34.md` section 2 and `.csv`):
 * fig. 5(a) by eye (+-0.03), figs. 5(b), 5(d) and 5(e) by guided column
 * scans (+-0.02), fig. 5(d)'s symbols by eye (+-0.01). theta = 0 is the
 * stagnation coefficient (Rayleigh's, or isentropic below Mach 1) where a
 * set has no value there (`stagnation: true`). The second readings are
 * held as front sides in `TN2960_FRONT_SIDES_SECOND`. Used for the refusal
 * of normal Mach numbers below 1.0 (below 1.49 before 0016 section 11) and
 * as checks of the band, not to set it.
 */
export const TN2960_FRONT_SIDES: readonly {
  readonly figure: '5(a)' | '5(b)' | '5(d)' | '5(e)';
  readonly item: string;
  readonly mach: number;
  readonly stagnation: boolean;
  readonly points: readonly { readonly theta: number; readonly p: number }[];
}[] = (
  [
    [
      '5(a)',
      'circles, R 3.14e5, below the critical range',
      0.05,
      false,
      [
        [0, 1.0],
        [5, 0.97],
        [10, 0.9],
        [15, 0.8],
        [20, 0.65],
        [25, 0.45],
        [30, 0.2],
        [35, -0.03],
        [40, -0.27],
        [45, -0.55],
        [50, -0.8],
        [55, -0.97],
        [60, -1.06],
        [65, -1.1],
        [70, -1.07],
        [75, -0.97],
        [80, -0.91],
        [85, -0.9],
        [90, -0.89],
      ],
    ],
    [
      '5(a)',
      'squares, R 4.26e5, above the critical range',
      0.065,
      false,
      [
        [0, 1.0],
        [5, 0.95],
        [10, 0.88],
        [15, 0.72],
        [20, 0.52],
        [25, 0.27],
        [30, 0.0],
        [35, -0.3],
        [40, -0.62],
        [45, -0.95],
        [50, -1.3],
        [55, -1.62],
        [60, -1.88],
        [65, -2.12],
        [70, -2.3],
        [75, -2.42],
        [80, -2.5],
        [85, -2.52],
        [90, -2.51],
      ],
    ],
    [
      '5(b)',
      'M 0.7',
      0.7,
      false,
      [
        [0, 1.12],
        [5, 1.103],
        [15, 0.959],
        [25, 0.706],
        [35, 0.337],
        [45, -0.12],
        [55, -0.649],
        [65, -0.967],
        [75, -1.17],
        [85, -1.159],
        [90, -1.18],
      ],
    ],
    [
      '5(b)',
      'M 0.6',
      0.6,
      false,
      [
        [0, 1.1],
        [5, 1.064],
        [15, 0.915],
        [25, 0.639],
        [35, 0.235],
        [45, -0.273],
        [50, -0.549],
        [55, -0.827],
        [60, -0.996],
        [65, -1.128],
        [70, -1.176],
        [80, -1.226],
        [85, -1.185],
        [90, -1.139],
      ],
    ],
    [
      '5(b)',
      'M 0.5',
      0.5,
      false,
      [
        [0, 1.06],
        [5, 1.03],
        [15, 0.872],
        [25, 0.528],
        [35, 0.104],
        [40, -0.142],
        [45, -0.385],
        [50, -0.653],
        [55, -0.919],
        [60, -1.013],
        [65, -1.148],
        [70, -1.171],
        [80, -1.216],
        [85, -1.22],
        [90, -1.13],
      ],
    ],
    [
      '5(b)',
      'M 0.3',
      0.3,
      false,
      [
        [0, 1.03],
        [5, 0.994],
        [15, 0.84],
        [25, 0.474],
        [35, 0.043],
        [40, -0.218],
        [45, -0.443],
        [50, -0.666],
        [60, -1.019],
        [70, -1.17],
        [80, -1.17],
        [90, -1.05],
      ],
    ],
    [
      '5(e)',
      'M 0.06, R above critical',
      0.06,
      false,
      [
        [0, 1.0],
        [5, 0.939],
        [15, 0.686],
        [25, 0.275],
        [30, 0.029],
        [35, -0.265],
        [45, -0.923],
        [55, -1.535],
        [65, -2.038],
        [75, -2.409],
        [85, -2.534],
        [90, -2.532],
      ],
    ],
    [
      '5(e)',
      'M 0.70',
      0.7,
      false,
      [
        [0, 1.15],
        [5, 1.119],
        [15, 0.971],
        [25, 0.7],
        [35, 0.326],
        [45, -0.144],
        [55, -0.641],
        [65, -0.995],
        [75, -1.178],
        [85, -1.214],
        [90, -1.21],
      ],
    ],
    [
      '5(e)',
      'M 1.49, between the symbols',
      1.49,
      true,
      [
        [3, 1.525],
        [9, 1.488],
        [11, 1.473],
        [20, 1.363],
        [22, 1.329],
        [24, 1.295],
        [26, 1.259],
        [34, 1.087],
        [36, 1.039],
        [38, 0.987],
        [40, 0.926],
        [49, 0.676],
        [51, 0.612],
        [53, 0.544],
        [56, 0.437],
        [64, 0.213],
        [66, 0.162],
        [68, 0.114],
        [70, 0.066],
        [79, -0.131],
        [81, -0.171],
        [83, -0.209],
        [86, -0.26],
        [90, -0.3],
      ],
    ],
    [
      '5(e)',
      'M 2.90, between the symbols',
      2.9,
      true,
      [
        [3, 1.746],
        [6, 1.718],
        [9, 1.686],
        [11, 1.664],
        [20, 1.559],
        [22, 1.526],
        [24, 1.484],
        [26, 1.452],
        [34, 1.286],
        [36, 1.24],
        [38, 1.197],
        [40, 1.144],
        [49, 0.879],
        [51, 0.808],
        [53, 0.767],
        [56, 0.683],
        [64, 0.437],
        [66, 0.393],
        [68, 0.35],
        [70, 0.308],
        [79, 0.154],
        [81, 0.128],
        [83, 0.103],
        [86, 0.074],
        [90, 0.03],
      ],
    ],
    [
      '5(d)',
      'M 1.98, faired curve',
      1.98,
      false,
      [
        [0, 1.67],
        [5, 1.646],
        [10, 1.63],
        [15, 1.6],
        [20, 1.484],
        [25, 1.391],
        [30, 1.284],
        [35, 1.17],
        [40, 1.008],
        [45, 0.86],
        [50, 0.766],
        [55, 0.638],
        [60, 0.483],
        [65, 0.387],
        [70, 0.284],
        [75, 0.146],
        [80, 0.077],
        [85, -0.068],
        [90, -0.101],
      ],
    ],
    [
      '5(d)',
      'M 1.98, R 13.2e5 (circles)',
      1.98,
      true,
      [
        [2, 1.67],
        [11, 1.61],
        [17, 1.52],
        [26, 1.38],
        [32, 1.21],
        [41, 1.0],
        [47, 0.8],
        [57, 0.64],
        [62, 0.41],
        [72, 0.24],
        [78, 0.08],
        [87, -0.03],
        [92, -0.16],
      ],
    ],
    [
      '5(d)',
      'M 1.98, R 5.5e5 (squares)',
      1.98,
      true,
      [
        [14, 1.57],
        [29, 1.33],
        [44, 0.95],
        [59, 0.46],
        [74, 0.12],
        [89, -0.11],
        [92, -0.13],
      ],
    ],
    [
      '5(d)',
      'M 1.98, R 1.3e5 (diamonds)',
      1.98,
      true,
      [
        [15, 1.58],
        [29, 1.35],
        [44, 0.92],
        [59, 0.56],
        [75, 0.18],
        [89, -0.12],
        [92, -0.14],
      ],
    ],
  ] as const
).map(([figure, item, mach, stagnation, pts]) => ({
  figure,
  item,
  mach,
  stagnation,
  points: pts.map(([theta, p]) => ({ theta, p })),
}));

/**
 * The independent reader's blind second readings of the same sets (audit
 * round 6, commit 402c412: `docs/research/total-drag/audit/round6/readings/
 * tn2960_fig5{a,b,d,e}.csv`), as front sides over (2/3) Cp_0, paired by
 * `docs/research/total-drag/scripts/w34_pair_tn2960.py` (0016 section 13):
 * like against like (the second's faired-curve points where the first read
 * a curve, its symbols where the first read symbols or where it read only
 * symbols, fig. 5(e)); the first reading's front side plus the integral of
 * the difference, interpolated between the second's points, so that its
 * gaps take the first's curvature. `covers` is the span of the second
 * reading's points. Fig. 5(d)'s diamonds (R 1.3e5) were not read.
 */
export const TN2960_FRONT_SIDES_SECOND: readonly {
  readonly figure: '5(a)' | '5(b)' | '5(d)' | '5(e)';
  readonly item: string;
  readonly ratio: number;
  readonly covers: readonly [number, number];
}[] = [
  {
    figure: '5(a)',
    item: 'circles, R 3.14e5, below the critical range',
    ratio: 0.1,
    covers: [5, 65],
  },
  {
    figure: '5(a)',
    item: 'squares, R 4.26e5, above the critical range',
    ratio: -0.402,
    covers: [65, 85],
  },
  { figure: '5(b)', item: 'M 0.7', ratio: 0.41, covers: [5, 85] },
  { figure: '5(b)', item: 'M 0.6', ratio: 0.29, covers: [5, 85] },
  { figure: '5(b)', item: 'M 0.5', ratio: 0.194, covers: [5, 85] },
  { figure: '5(b)', item: 'M 0.3', ratio: 0.133, covers: [5, 85] },
  { figure: '5(e)', item: 'M 0.06, R above critical', ratio: -0.398, covers: [0, 90] },
  { figure: '5(e)', item: 'M 0.70', ratio: 0.391, covers: [0, 90] },
  { figure: '5(e)', item: 'M 1.49, between the symbols', ratio: 0.982, covers: [0, 90] },
  { figure: '5(e)', item: 'M 2.90, between the symbols', ratio: 1.037, covers: [0, 90] },
  { figure: '5(d)', item: 'M 1.98, faired curve', ratio: 1.033, covers: [5, 85] },
  { figure: '5(d)', item: 'M 1.98, R 13.2e5 (circles)', ratio: 1.042, covers: [3, 87] },
  { figure: '5(d)', item: 'M 1.98, R 5.5e5 (squares)', ratio: 1.035, covers: [8, 90] },
];
