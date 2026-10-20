/**
 * The circular cylinder in transonic cross flow: J. M. Macha, "A wind tunnel
 * investigation of circular and straked cylinders in transonic cross flow",
 * NASA CR-149372 (Texas A&M Research Foundation report 3318-76-01), 1976
 * (https://ntrs.nasa.gov/citations/19770008057), as transcribed for
 * docs/design/0016-fin-edges-of-flat-plates.md section 11
 * (`docs/research/total-drag/data/fin_edges_w34.md` section 9 and `.csv`,
 * `scripts/w34_fin_edges.py`): the first readings. The independent
 * reader's second readings are pending; the front-side ratios of
 * ./rounded-leading-edge.ts are to be the envelope of both.
 *
 * The tests: the Ames 2 by 2 ft transonic tunnel, solid side walls through
 * which the models' ends were mounted, slotted floor and ceiling; cylinders
 * of 1.91, 2.54, 3.81 and 5.08 cm (solid blockage 3.1% to 8.4%), nine
 * orifices rotated in 3 deg steps; M 0.6 to 1.2, Re_d 1e5 to 1e6. The
 * report states no accuracy.
 */

/**
 * How many readings of figs. 8b and 5 are held: one until the independent
 * reader's second readings are held beside these (0014 section 10.1, rule
 * 5); until then the term's label says it rests on one reading.
 */
export const MACHA_READINGS = 1 as number;

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
