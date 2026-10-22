/**
 * The circular cylinder in transonic cross flow: J. M. Macha, "A wind tunnel
 * investigation of circular and straked cylinders in transonic cross flow",
 * NASA CR-149372 (Texas A&M Research Foundation report 3318-76-01), 1976
 * (https://ntrs.nasa.gov/citations/19770008057), as transcribed for
 * docs/design/0016-fin-edges-of-flat-plates.md section 11
 * (`docs/research/total-drag/data/fin_edges_w34.md` section 9 and `.csv`,
 * `scripts/w34_fin_edges.py`): the first readings, and beside them the
 * independent reader's blind second readings (audit round 6, commit
 * fc66a2f), paired in 0016 section 14 (`scripts/w34_pair_round6.py`); the
 * front-side ratios of ./rounded-leading-edge.ts are the envelope of both.
 *
 * The tests: the Ames 2 by 2 ft transonic tunnel, solid side walls through
 * which the models' ends were mounted, slotted floor and ceiling; cylinders
 * of 1.91, 2.54, 3.81 and 5.08 cm (solid blockage 3.1% to 8.4%), nine
 * orifices rotated in 3 deg steps; M 0.6 to 1.2, Re_d 1e5 to 1e6. The
 * report states no accuracy.
 */

/**
 * How many readings of figs. 8b and 5 are held: two since the independent
 * reader's blind second readings (0016 section 14); with one, the term's
 * label says it rests on one reading.
 */
export const MACHA_READINGS = 2 as number;

/** A point of a pressure distribution: azimuth from the stagnation line, deg, and Cp. */
export interface MachaPoint {
  readonly theta: number;
  readonly p: number;
  /** A symbol's centre read by eye, or the faired curve by column scan. */
  readonly kind: 'symbol' | 'curve';
}

const pts = (kind: MachaPoint['kind'], xs: readonly (readonly [number, number])[]) =>
  xs.map(([theta, p]) => ({ theta, p, kind }));

/**
 * Fig. 8b (PDF p. 26): M 1.0, 1.1 and 1.2 on the 1.91 cm cylinder (blockage
 * 3.1%), Re_d 1.9e5. Symbol centres by eye on 2x ruler crops placed between
 * the figure's own grid lines (+-0.003 in Cp, +-0.3 deg); the faired curves
 * by column scans at 1.5 deg steps (+-0.3 deg of columns, the median),
 * kept where at least 2 deg (3 deg for the triangles) from a symbol.
 */
export const MACHA_FIG8B: readonly {
  readonly mach: number;
  readonly points: readonly MachaPoint[];
}[] = [
  {
    mach: 1.0,
    points: [
      ...pts('symbol', [
        [0, 1.283],
        [2.9, 1.278],
        [9.5, 1.232],
        [19.0, 1.108],
        [27.9, 0.892],
        [37.2, 0.6],
        [49.2, 0.221],
        [61.7, -0.177],
        [73.1, -0.603],
        [80.0, -0.751],
        [86.3, -0.888],
        [95.4, -1.064],
      ]),
      ...pts('curve', [
        [6.0, 1.256],
        [7.5, 1.247],
        [12.0, 1.206],
        [13.5, 1.179],
        [15.0, 1.157],
        [16.5, 1.133],
        [21.0, 1.058],
        [22.5, 1.023],
        [24.0, 0.981],
        [25.5, 0.946],
        [30.0, 0.825],
        [31.5, 0.782],
        [33.0, 0.736],
        [34.5, 0.69],
        [40.5, 0.497],
        [42.0, 0.45],
        [43.5, 0.407],
        [45.0, 0.354],
        [46.5, 0.306],
        [52.5, 0.116],
        [54.0, 0.064],
        [55.5, 0.017],
        [57.0, -0.027],
        [58.5, -0.077],
        [64.5, -0.3],
        [66.0, -0.359],
        [67.5, -0.409],
        [69.0, -0.455],
        [70.5, -0.502],
        [76.5, -0.679],
        [78.0, -0.712],
        [82.5, -0.816],
        [84.0, -0.848],
        [88.5, -0.929],
        [90.0, -0.958],
        [91.5, -0.984],
      ]),
    ],
  },
  {
    mach: 1.1,
    points: [
      ...pts('symbol', [
        [0, 1.329],
        [6.7, 1.31],
        [15.3, 1.216],
        [24.8, 1.051],
        [36.1, 0.732],
        [46.7, 0.447],
        [55.1, 0.14],
        [67.1, -0.247],
        [77.0, -0.481],
        [86.1, -0.708],
        [92.0, -0.817],
        [95.9, -0.895],
      ]),
      ...pts('curve', [
        [3.0, 1.325],
        [4.5, 1.315],
        [9.0, 1.286],
        [10.5, 1.274],
        [12.0, 1.255],
        [18.0, 1.171],
        [19.5, 1.149],
        [21.0, 1.119],
        [22.5, 1.093],
        [27.0, 0.99],
        [28.5, 0.954],
        [30.0, 0.902],
        [31.5, 0.876],
        [33.0, 0.84],
        [39.0, 0.655],
        [40.5, 0.613],
        [42.0, 0.573],
        [43.5, 0.528],
        [49.5, 0.335],
        [51.0, 0.29],
        [52.5, 0.234],
        [58.5, 0.032],
        [60.0, -0.016],
        [61.5, -0.072],
        [63.0, -0.126],
        [64.5, -0.172],
        [70.5, -0.347],
        [72.0, -0.374],
        [73.5, -0.415],
        [75.0, -0.454],
        [79.5, -0.561],
        [81.0, -0.596],
        [82.5, -0.625],
        [84.0, -0.659],
        [88.5, -0.758],
        [90.0, -0.784],
      ]),
    ],
  },
  {
    mach: 1.2,
    points: [
      ...pts('symbol', [
        [0, 1.387],
        [6.9, 1.371],
        [13.1, 1.322],
        [21.9, 1.186],
        [34.0, 0.908],
        [43.1, 0.623],
        [55.1, 0.274],
        [69.7, -0.161],
        [83.4, -0.483],
        [89.7, -0.605],
        [95.9, -0.695],
      ]),
      ...pts('curve', [
        [16.5, 1.274],
        [18.0, 1.251],
        [25.5, 1.101],
        [27.0, 1.066],
        [28.5, 1.031],
        [30.0, 1.001],
        [37.5, 0.793],
        [39.0, 0.751],
        [46.5, 0.529],
        [48.0, 0.486],
        [49.5, 0.442],
        [51.0, 0.391],
        [58.5, 0.169],
        [60.0, 0.132],
        [61.5, 0.083],
        [63.0, 0.04],
        [64.5, -0.01],
        [66.0, -0.054],
        [73.5, -0.257],
        [75.0, -0.301],
        [76.5, -0.337],
        [78.0, -0.371],
        [79.5, -0.411],
      ]),
    ],
  },
];

/**
 * Fig. 5 (PDF p. 22): M 1.0 on all four cylinders (Re_d 2.8e5 on the 1.91
 * cm, 3.3e5 on the others); the plot starts at Cp 0.4 (about 44 deg).
 * `common` is the faired curve the four share to about 78 deg (column
 * scans, +-0.3 deg, and symbol centres); `branches` are each cylinder's
 * points where they part, symbol centres by eye (+-0.01 in Cp, +-0.5 deg),
 * the 1.91 and 2.54 cm cylinders' shared curve by column scans.
 */
export const MACHA_FIG5 = {
  mach: 1.0,
  common: [
    ...pts('curve', [
      [44.0, 0.373],
      [45.0, 0.343],
      [46.0, 0.309],
      [47.0, 0.268],
      [50.5, 0.167],
      [51.5, 0.135],
      [52.5, 0.097],
      [56.0, -0.007],
      [57.0, -0.043],
      [58.0, -0.09],
      [62.0, -0.212],
      [65.0, -0.306],
      [71.0, -0.502],
      [74.0, -0.597],
      [78.0, -0.723],
    ]),
    ...pts('symbol', [
      [48.8, 0.205],
      [54.0, 0.05],
      [58.8, -0.12],
      [60.5, -0.18],
      [63.5, -0.25],
      [66.2, -0.345],
      [67.3, -0.416],
      [69.9, -0.474],
      [72.3, -0.561],
      [75.3, -0.625],
      [77.2, -0.686],
    ]),
  ],
  branches: [
    {
      diameterCm: 1.91,
      blockage: 0.031,
      points: pts('curve', [
        [80.0, -0.783],
        [83.0, -0.82],
        [84.0, -0.87],
        [85.0, -0.895],
        [86.0, -0.914],
        [87.0, -0.939],
        [89.0, -0.982],
        [90.0, -0.998],
      ]),
    },
    {
      diameterCm: 3.81,
      blockage: 0.063,
      points: pts('symbol', [
        [82.0, -0.8],
        [87.0, -0.82],
        [91.3, -0.76],
      ]),
    },
    {
      diameterCm: 5.08,
      blockage: 0.084,
      points: pts('symbol', [
        [81.3, -0.69],
        [85.0, -0.655],
        [86.7, -0.645],
        [91.3, -0.64],
      ]),
    },
  ],
} as const;

/**
 * Fig. 8b, second reading (audit round 6, commit fc66a2f,
 * `docs/research/total-drag/audit/round6/readings/cr149372_fig8b.csv`): the
 * points used, the faired curves every 5 deg (`curve`) and the symbols
 * (`symbol`), 0 to 90 deg, including those outside the combined reading
 * error (M 1.0 at 54.2 deg; M 1.1 at 3.4, 39.1, 41.3, 50.0, 53.5 deg; 0016
 * section 16). Left out, as misreads shown by the scan: the "90" axis
 * label read as a circle (86.5 deg, Cp -0.084, at M 1.0) and the M 1.2
 * curve at 25 to 60 deg with the "triangle" at 30.7 deg, which run on the
 * M 1.1 line (a third look puts the triangle at 34 deg, 0.91, on the third
 * line). That stretch was read again blind in round 7
 * (`MACHA_FIG8B_M12_ROUND7`), which pairs with the first reading there.
 */
export const MACHA_FIG8B_SECOND: readonly {
  readonly mach: number;
  readonly points: readonly MachaPoint[];
}[] = (
  [
    [
      1.0,
      [
        [0, 1.2821, 'c'],
        [0.3992, 1.2819, 's'],
        [3.307, 1.2731, 's'],
        [5, 1.2631, 'c'],
        [9.708, 1.2292, 's'],
        [10, 1.2267, 'c'],
        [15, 1.1567, 'c'],
        [19.07, 1.104, 's'],
        [20, 1.0843, 'c'],
        [25, 0.9624, 'c'],
        [28.07, 0.8932, 's'],
        [30, 0.833, 'c'],
        [35, 0.6796, 'c'],
        [37.66, 0.6001, 's'],
        [40, 0.5212, 'c'],
        [45, 0.3589, 'c'],
        [49.15, 0.2202, 's'],
        [50, 0.2007, 'c'],
        [54.25, 0.1093, 's'],
        [60, -0.1248, 'c'],
        [61.36, -0.1796, 's'],
        [65, -0.3206, 'c'],
        [70, -0.4955, 'c'],
        [73.09, -0.6058, 's'],
        [75, -0.6433, 'c'],
        [80, -0.7527, 'c'],
        [80.21, -0.755, 's'],
        [85, -0.8602, 'c'],
        [86.53, -0.8901, 's'],
      ],
    ],
    [
      1.1,
      [
        [0.207, 1.331, 's'],
        [3.442, 1.3074, 's'],
        [5, 1.3094, 'c'],
        [6.947, 1.3114, 's'],
        [10, 1.2785, 'c'],
        [15, 1.2243, 'c'],
        [15.57, 1.213, 's'],
        [20, 1.1379, 'c'],
        [24.99, 1.0493, 's'],
        [25, 1.0479, 'c'],
        [30, 0.9084, 'c'],
        [35, 0.7703, 'c'],
        [36.55, 0.7286, 's'],
        [39.1, 0.6985, 's'],
        [41.26, 0.6315, 's'],
        [45, 0.4816, 'c'],
        [46.35, 0.444, 's'],
        [50, 0.2893, 'c'],
        [53.47, 0.1395, 's'],
        [54.98, 0.1395, 's'],
        [55, 0.1395, 'c'],
        [60, -0.0236, 'c'],
        [65, -0.1859, 'c'],
        [67.19, -0.2547, 's'],
        [70, -0.3224, 'c'],
        [75, -0.4483, 'c'],
        [76.82, -0.4812, 's'],
        [80, -0.5628, 'c'],
        [85, -0.6725, 'c'],
        [86.46, -0.7055, 's'],
      ],
    ],
    [
      1.2,
      [
        [0, 1.3859, 'c'],
        [0.2653, 1.3855, 's'],
        [5, 1.3805, 'c'],
        [7.083, 1.3713, 's'],
        [10, 1.3528, 'c'],
        [13.15, 1.3261, 's'],
        [15, 1.2977, 'c'],
        [20, 1.2158, 'c'],
        [21.9, 1.1837, 's'],
        [65, -0.0296, 'c'],
        [69.84, -0.164, 's'],
        [70, -0.1631, 'c'],
        [75, -0.2903, 'c'],
        [85, -0.5006, 'c'],
        [89.65, -0.6073, 's'],
      ],
    ],
  ] as const
).map(([mach, xs]) => ({
  mach,
  points: xs.map(([theta, p, k]) => ({
    theta,
    p,
    kind: k === 'c' ? ('curve' as const) : ('symbol' as const),
  })),
}));

/**
 * Fig. 5, second reading (commit fc66a2f, `cr149372_fig5.csv`): symbols
 * only. Below 88 deg the reader names them by shape, uncertain; used only
 * where the four curves coincide (44 to 78 deg, where the name does not
 * matter), not where they part (78 to 88 deg). Left out of the shared
 * curve, as misreads: the "60" axis label read as symbols (59.6, 59.8, 64.3
 * deg near Cp 0); kept, though outside the combined error, 69.7 deg (0016
 * section 16). Above 88 deg, named by
 * plateau: the 2.54 cm square at 89.1 deg (on the curve the 1.91 and 2.54 cm
 * share there) and the 3.81 cm circle at 89.7 deg; values below -0.8 are
 * extrapolated on the uniform grid spacing in both readings.
 */
export const MACHA_FIG5_SECOND = {
  mach: 1.0,
  common: pts('symbol', [
    [49.02, 0.1988],
    [54.23, 0.0477],
    [58.36, -0.1199],
    [60.52, -0.1797],
    [63.56, -0.2531],
    [66.13, -0.3472],
    [67.28, -0.3952],
    [67.55, -0.415],
    [69.71, -0.4339],
    [69.78, -0.4726],
    [72.49, -0.5641],
    [75.06, -0.6285],
    [77.36, -0.6922],
  ]),
  branches: [
    { diameterCm: 1.91, points: pts('symbol', [[89.14, -0.9749]]) },
    { diameterCm: 3.81, points: pts('symbol', [[89.65, -0.7951]]) },
    { diameterCm: 5.08, points: pts('symbol', []) },
  ],
} as const;

/**
 * Fig. 8b's M 1.2 curve, read again blind (audit round 7, commit 47f32ec,
 * `docs/research/total-drag/audit/round7/readings/cr149372_fig8b.csv`): the
 * faired line every 5 deg from 0 to 100 (local-grid values; the 0 deg value
 * extrapolated as a + b theta^2) and every triangle's centroid, the line
 * identified by its own symbols (right-most, 2.3 to 4.7 deg from the M 1.1
 * line over 17 to 65 deg). It pairs with the first reading over the
 * stretch the round-6 reading left out (0016 section 16).
 */
export const MACHA_FIG8B_M12_ROUND7: readonly MachaPoint[] = [
  ...pts('curve', [
    [0, 1.3944],
    [5, 1.3876],
    [10, 1.3566],
    [15, 1.3029],
    [20, 1.2207],
    [25, 1.1165],
    [30, 1.0003],
    [35, 0.8691],
    [40, 0.7188],
    [45, 0.5699],
    [50, 0.4252],
    [55, 0.2778],
    [60, 0.1238],
    [65, -0.0227],
    [70, -0.1693],
    [75, -0.3022],
    [80, -0.4228],
    [85, -0.5213],
    [90, -0.6191],
    [95, -0.6869],
  ]),
  ...pts('symbol', [
    [-0.24, 1.3855],
    [7.07, 1.372],
    [13.18, 1.3269],
    [21.9, 1.1836],
    [33.9, 0.9026],
    [43.42, 0.6256],
    [55.18, 0.2735],
    [69.86, -0.1638],
    [83.31, -0.4843],
    [89.68, -0.6066],
    [95.6, -0.6849],
  ]),
];
