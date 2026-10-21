/**
 * The yawed circular cylinder: G. Goodwin, M. O. Creager and E. L. Winkler,
 * NACA RM A55H31, 1956 (https://ntrs.nasa.gov/citations/19930088843), as
 * transcribed for docs/design/0016-fin-edges-of-flat-plates.md
 * (`docs/research/total-drag/data/fin_edges_w34.md` section 3 and `.csv`,
 * `scripts/w34_fin_edges.py`): the first readings, and beside them the
 * independent reader's blind second readings (audit round 6, commit
 * 6e6d9be), paired in 0016 section 14; the sweep allowance of
 * ./rounded-leading-edge.ts is the envelope of both. The figures' theory
 * curves (eqs. 10c and 14) were read by neither and feed nothing.
 *
 * The present tests: the Ames 8 in low-density tunnel, nominal M 3.9, a 1 in
 * cylinder in a 3 in usable stream, free-stream Reynolds number 2.1e3 to
 * 6.7e3 on the diameter. Reference 1: Penland's tests at M 6.86 (RM
 * L54A14, superseded by TN 3861), R 1.29e5.
 */

/**
 * How many readings of figs. 11 and 12 are held: two since the independent
 * reader's blind second readings (0016 section 14); with one, the sweep
 * allowance's label says it rests on one reading.
 */
export const RM_A55H31_READINGS = 2 as number;

/** A point of fig. 11 or fig. 12: its source, free-stream Mach number, yaw in degrees and value. */
export interface YawPoint {
  readonly source: 'present tests' | 'reference 1';
  readonly mach: number;
  /** The yaw where the symbol is drawn, as read. */
  readonly yaw: number;
  /**
   * The test's yaw as the reports state it (0016 section 18): the present
   * tests 30, 45, 60 deg (p. 10; fig. 10's legend); reference 1 14.3, 29.6,
   * 45.1, 59.8 deg (fig. 10's legend) and 75.1 (TN 3861 fig. 5, alpha 14.9
   * deg). Fig. 12's symbols are drafted 0.2 to 0.25 deg below them.
   */
  readonly statedYaw?: number;
  readonly value: number;
  /** Why the report's own text sets the point apart, if it does. */
  readonly flag?: string;
}

const FLAG_3D =
  'the report suspects three-dimensional flow at 45 and 60 deg of yaw, the 1 in model in the 3 in ' +
  'stream (p. 14)';
const FLAG_REYNOLDS = 'at R 2.1e3 (table II), below the 6.7e3 of the statement on p. 13';
const FLAG_END =
  'TN 3861 p. 10: at an angle of attack of about 15 deg the shock is not parallel to the body ' +
  'near the orifices, an end effect';

/**
 * Fig. 12 (PDF p. 41): the pressure drag of the front side, yawed over
 * unyawed, on absolute pressures as eq. (14) is (0016 shows it on table
 * II). Symbol centres by eye on 2x ruler crops, +-0.004 in the ratio.
 */
export const RM_A55H31_FIG12: readonly YawPoint[] = [
  { source: 'present tests', mach: 3.9, yaw: 30.1, statedYaw: 30, value: 0.7 },
  {
    source: 'present tests',
    mach: 3.9,
    yaw: 45.1,
    statedYaw: 45,
    value: 0.41,
    flag: `${FLAG_3D}; ${FLAG_REYNOLDS}`,
  },
  { source: 'present tests', mach: 3.9, yaw: 60.1, statedYaw: 60, value: 0.17, flag: FLAG_3D },
  { source: 'reference 1', mach: 6.86, yaw: 14.4, statedYaw: 14.3, value: 0.907 },
  { source: 'reference 1', mach: 6.86, yaw: 29.6, statedYaw: 29.6, value: 0.665 },
  { source: 'reference 1', mach: 6.86, yaw: 45.2, statedYaw: 45.1, value: 0.367 },
  { source: 'reference 1', mach: 6.86, yaw: 59.9, statedYaw: 59.8, value: 0.131 },
  { source: 'reference 1', mach: 6.86, yaw: 75.5, statedYaw: 75.1, value: 0.023, flag: FLAG_END },
];

/**
 * Fig. 11 (PDF p. 40): the stagnation-line pressure over the stream's
 * impact pressure, p_x=0 / p_t2. Symbol centres by eye, +-0.004.
 */
export const RM_A55H31_FIG11: readonly YawPoint[] = [
  { source: 'present tests', mach: 3.9, yaw: 30, value: 0.769 },
  { source: 'present tests', mach: 3.9, yaw: 45, value: 0.53 },
  { source: 'present tests', mach: 3.9, yaw: 60, value: 0.295 },
  { source: 'reference 1', mach: 6.86, yaw: 14.3, value: 0.972 },
  { source: 'reference 1', mach: 6.86, yaw: 29.6, value: 0.75 },
  { source: 'reference 1', mach: 6.86, yaw: 45.1, value: 0.5 },
  { source: 'reference 1', mach: 6.86, yaw: 59.8, value: 0.246 },
  { source: 'reference 1', mach: 6.86, yaw: 75.2, value: 0.046 },
];

/**
 * Table II (PDF p. 27), typed: the present tests' pressures at azimuth 0 to
 * 90 deg in 15 deg steps, and the stream's static pressure, in mm Hg (the
 * column head says microns for p_inf; 0.319 is table I's 320 microns).
 */
export const RM_A55H31_TABLE2: readonly {
  readonly yaw: number;
  readonly mach: number;
  readonly pInf: number;
  readonly p: readonly number[];
}[] = [
  { yaw: 0, mach: 3.94, pInf: 0.319, p: [6.54, 6.18, 5.17, 3.8, 2.48, 1.43, 0.75] },
  { yaw: 30, mach: 3.9, pInf: 0.318, p: [5.05, 4.77, 3.97, 2.8, 1.85, 1.08, 0.6] },
  { yaw: 45, mach: 3.8, pInf: 0.1, p: [1.05, 1.0, 0.85, 0.66, 0.46, 0.29, 0.18] },
];

/**
 * Fig. 12, second reading (audit round 6, commit 6e6d9be,
 * `docs/research/total-drag/audit/round6/readings/rma55h31_fig12.csv`):
 * symbol centres by outline template, +-0.001 to 0.002 in the ratio and
 * 0.04 to 0.09 deg; the flags are the same points' (by source and yaw).
 */
export const RM_A55H31_FIG12_SECOND: readonly YawPoint[] = [
  { source: 'present tests', mach: 3.9, yaw: 29.9147, statedYaw: 30, value: 0.7021 },
  {
    source: 'present tests',
    mach: 3.9,
    yaw: 44.7498,
    statedYaw: 45,
    value: 0.4103,
    flag: `${FLAG_3D}; ${FLAG_REYNOLDS}`,
  },
  { source: 'present tests', mach: 3.9, yaw: 59.7835, statedYaw: 60, value: 0.1643, flag: FLAG_3D },
  { source: 'reference 1', mach: 6.86, yaw: 14.1452, statedYaw: 14.3, value: 0.9063 },
  { source: 'reference 1', mach: 6.86, yaw: 29.3753, statedYaw: 29.6, value: 0.6678 },
  { source: 'reference 1', mach: 6.86, yaw: 44.8872, statedYaw: 45.1, value: 0.3681 },
  { source: 'reference 1', mach: 6.86, yaw: 59.5617, statedYaw: 59.8, value: 0.1338 },
  {
    source: 'reference 1',
    mach: 6.86,
    yaw: 75.0617,
    statedYaw: 75.1,
    value: 0.0207,
    flag: FLAG_END,
  },
];

/**
 * Third looks at fig. 12 where the two readings disagree beyond their
 * combined error at a served sweep and normal Mach number (0014 section
 * 10; 0016 section 16): the present tests' rings at 45 and 60 deg, each
 * fitted by a circle on the deskewed scan (72 rays from the centre, the
 * ring's mid-line, a least-squares circle; centre to +-0.5 px, +-0.02 deg
 * and +-0.0005 in the ratio). Both side with the second reading; the first
 * put them 0.3 deg high in yaw, so there it is set aside as misread.
 */
export const RM_A55H31_FIG12_THIRD_LOOK: readonly YawPoint[] = [
  {
    source: 'present tests',
    mach: 3.9,
    yaw: 44.76,
    statedYaw: 45,
    value: 0.41,
    flag: `${FLAG_3D}; ${FLAG_REYNOLDS}`,
  },
  { source: 'present tests', mach: 3.9, yaw: 59.83, statedYaw: 60, value: 0.165, flag: FLAG_3D },
];

/** Fig. 11, second reading (commit 6e6d9be, `rma55h31_fig11.csv`), the yawed points. */
export const RM_A55H31_FIG11_SECOND: readonly YawPoint[] = [
  { source: 'present tests', mach: 3.9, yaw: 30.027, value: 0.7703 },
  { source: 'present tests', mach: 3.9, yaw: 44.8104, value: 0.534 },
  { source: 'present tests', mach: 3.9, yaw: 60.0388, value: 0.3026 },
  { source: 'reference 1', mach: 6.86, yaw: 14.4383, value: 0.9718 },
  { source: 'reference 1', mach: 6.86, yaw: 30.0505, value: 0.7562 },
  { source: 'reference 1', mach: 6.86, yaw: 44.8713, value: 0.5069 },
  { source: 'reference 1', mach: 6.86, yaw: 59.9993, value: 0.2516 },
  { source: 'reference 1', mach: 6.86, yaw: 74.7516, value: 0.0567 },
];
