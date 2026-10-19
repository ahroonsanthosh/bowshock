/**
 * Two-dimensional base pressure of blunt trailing edges at Mach 1.1 to 4,
 * as data: the transcriptions behind docs/design/0008-total-drag.md
 * section 3.4 (`docs/research/total-drag/data/blunt_te_2d_base.md` and
 * `.csv`, `scripts/blunt_te_2d.py`), the first readings, and beside them
 * the independent reader's second readings (round 4 of the drag audit:
 * `readings/tr1109_fig29.csv`, `tr1109_fig8_symbols.csv`,
 * `rm_a51j25_fig7.csv`, `rm_a51j25_fig7_symbols.csv`,
 * `tn-d-1056_table2.csv` and `scripts/compare_round4.py`). The bands of
 * ./fin-trailing-edge.ts are the envelope of both readings
 * (docs/design/0010-base-drag-and-total.md section 5.1).
 *
 * The second readings were made before the first was opened, except the
 * values marked "not blind": RM A51J25 fig. 7's symbols, and its curve at
 * M' 1.50 to 1.60 (re-read after the comparison).
 *
 * Sources (each opened for 0008):
 *
 * - NACA RM A51J25 (Chapman 1951; NTRS 20030067332) fig. 7: base pressure
 *   over the pressure just ahead of the base, p_b / p', against the Mach
 *   number there, M', for airfoils with thin turbulent layers, five
 *   facilities (Langley PARD free flight among them), the mean curve and
 *   symbols. For flat-sided sections M' = M_inf and p' = p_inf.
 * - NACA TR 1109 (Chapman, Wimbrow and Kester 1952; NTRS 19930090968):
 *   fig. 29, faired turbulent curves against c / [h Re^(1/5)] and laminar
 *   curves against c / [h Re^(1/2)] at M 1.5, 2.0 and 3.1 (Re on the chord,
 *   c chord, h trailing-edge thickness), p_b / p_inf; fig. 8, the turbulent
 *   symbols about their faired curves (by eye); and fig. 29(a) against
 *   fig. 8's curves (fig. 29(a) averages two orifice positions).
 * - NASA TN D-1056 (Saltzman 1961; NTRS 19980227195) table II: the X-15's
 *   upper movable vertical fin in flight, a 10 deg single wedge with a
 *   blunt trailing edge, power off, speed brakes closed, base pressure
 *   coefficient (the mean of the orifices recorded; Cp +-0.02, M +-0.02 to
 *   +-0.03). Retyped in full for round 4: equal to this typing in every
 *   row used. 18 of its rows lie at M 1.52 to 3.24 (the data note says 19).
 */

/** RM A51J25 fig. 7, mean curve: M' and p_b / p'. */
export const RM_A51J25_FIG7_CURVE: readonly { readonly mach: number; readonly ratio: number }[] = [
  { mach: 1.167, ratio: 0.588 },
  { mach: 1.295, ratio: 0.545 },
  { mach: 1.4, ratio: 0.517 },
  { mach: 1.5, ratio: 0.474 },
  { mach: 1.6, ratio: 0.446 },
  { mach: 1.7, ratio: 0.42 },
  { mach: 1.83, ratio: 0.399 },
  { mach: 2.0, ratio: 0.359 },
  { mach: 2.1, ratio: 0.337 },
  { mach: 2.25, ratio: 0.311 },
  { mach: 2.5, ratio: 0.275 },
  { mach: 2.75, ratio: 0.249 },
  { mach: 2.9, ratio: 0.236 },
  { mach: 3.0, ratio: 0.228 },
  { mach: 3.1, ratio: 0.22 },
  { mach: 3.25, ratio: 0.214 },
  { mach: 3.5, ratio: 0.206 },
  { mach: 3.75, ratio: 0.2 },
  { mach: 3.9, ratio: 0.199 },
  { mach: 4.0, ratio: 0.199 },
];

/** RM A51J25 fig. 7 symbols (by eye): source, M', p_b / p'. */
export const RM_A51J25_FIG7_SYMBOLS: readonly {
  readonly source: string;
  readonly mach: number;
  readonly ratio: number;
}[] = [
  { source: 'Langley 9 by 12 in, delta (tagged square)', mach: 1.23, ratio: 0.498 },
  { source: 'Ames 1 by 3 ft (triangle-like)', mach: 1.385, ratio: 0.532 },
  { source: 'Langley 9 by 12 in, rectangular (diamond)', mach: 1.4, ratio: 0.464 },
  { source: 'Ames 1 by 3 ft (square)', mach: 1.475, ratio: 0.505 },
  { source: 'tagged', mach: 1.6, ratio: 0.464 },
  { source: 'Langley 9 by 12 in, rectangular (diamond)', mach: 1.6, ratio: 0.424 },
  { source: 'NPL two-dimensional', mach: 1.83, ratio: 0.407 },
  { source: 'Ames 1 by 3 ft (square)', mach: 1.98, ratio: 0.374 },
  { source: 'Langley 9 by 12 in, rectangular (diamond)', mach: 1.94, ratio: 0.331 },
  { source: 'tagged', mach: 1.94, ratio: 0.346 },
  { source: 'Ames 1 by 3 ft (square)', mach: 2.47, ratio: 0.276 },
  { source: 'Ames 1 by 3 ft (inverted triangle)', mach: 2.88, ratio: 0.253 },
  { source: 'Ames 1 by 3 ft (square)', mach: 3.1, ratio: 0.232 },
  { source: 'Ames 1 by 3 ft (inverted triangle)', mach: 3.1, ratio: 0.204 },
  { source: 'Langley 9 in two-dimensional', mach: 4.0, ratio: 0.222 },
  { source: 'Langley 9 in two-dimensional', mach: 4.0, ratio: 0.191 },
];

/** A faired curve of TR 1109 fig. 29 at one Mach number: abscissa and p_b / p_inf. */
export interface Tr1109Curve {
  readonly mach: number;
  readonly points: readonly { readonly x: number; readonly ratio: number }[];
}

/** TR 1109 fig. 29(a), turbulent, against c / [h Re^(1/5)] (M 2.0 at 2.5 lies on a grid line). */
export const TR1109_FIG29A_TURBULENT: readonly Tr1109Curve[] = [
  {
    mach: 1.5,
    points: [
      { x: 0.5, ratio: 0.492 },
      { x: 0.75, ratio: 0.492 },
      { x: 1.0, ratio: 0.494 },
      { x: 1.5, ratio: 0.498 },
      { x: 2.0, ratio: 0.503 },
      { x: 2.5, ratio: 0.508 },
      { x: 3.0, ratio: 0.515 },
      { x: 3.5, ratio: 0.528 },
      { x: 4.0, ratio: 0.539 },
      { x: 4.5, ratio: 0.552 },
    ],
  },
  {
    mach: 2.0,
    points: [
      { x: 0.5, ratio: 0.358 },
      { x: 0.75, ratio: 0.362 },
      { x: 1.0, ratio: 0.367 },
      { x: 1.5, ratio: 0.379 },
      { x: 2.0, ratio: 0.391 },
      { x: 3.0, ratio: 0.416 },
      { x: 3.5, ratio: 0.43 },
      { x: 4.0, ratio: 0.442 },
      { x: 4.5, ratio: 0.454 },
    ],
  },
  {
    mach: 3.1,
    points: [
      { x: 0.75, ratio: 0.209 },
      { x: 1.0, ratio: 0.223 },
      { x: 1.5, ratio: 0.255 },
      { x: 2.0, ratio: 0.286 },
      { x: 2.5, ratio: 0.317 },
      { x: 3.0, ratio: 0.347 },
      { x: 3.5, ratio: 0.38 },
      { x: 4.0, ratio: 0.411 },
      { x: 4.5, ratio: 0.441 },
    ],
  },
];

/**
 * TR 1109 fig. 29(b), laminar (smooth wings), against c / [h Re^(1/2)]. At
 * 0.050 and 0.060 the M 1.5 and 2.0 curves merge in one run, and the value
 * is given to both; 0.016 to 0.022 are not used (merged or on a grid
 * line). The report: at M 3.1 the curves "may be partially in the
 * transition region" (p. 16).
 */
export const TR1109_FIG29B_LAMINAR: readonly Tr1109Curve[] = [
  {
    mach: 1.5,
    points: [
      { x: 0.01, ratio: 0.358 },
      { x: 0.014, ratio: 0.46 },
      { x: 0.026, ratio: 0.636 },
      { x: 0.03, ratio: 0.664 },
      { x: 0.034, ratio: 0.688 },
      { x: 0.038, ratio: 0.706 },
      { x: 0.044, ratio: 0.727 },
      { x: 0.05, ratio: 0.74 },
      { x: 0.06, ratio: 0.764 },
      { x: 0.075, ratio: 0.792 },
      { x: 0.092, ratio: 0.811 },
      { x: 0.104, ratio: 0.822 },
      { x: 0.124, ratio: 0.834 },
      { x: 0.15, ratio: 0.844 },
      { x: 0.175, ratio: 0.847 },
      { x: 0.185, ratio: 0.847 },
    ],
  },
  {
    mach: 2.0,
    points: [
      { x: 0.01, ratio: 0.442 },
      { x: 0.014, ratio: 0.49 },
      { x: 0.026, ratio: 0.615 },
      { x: 0.03, ratio: 0.644 },
      { x: 0.034, ratio: 0.672 },
      { x: 0.038, ratio: 0.693 },
      { x: 0.044, ratio: 0.717 },
      { x: 0.05, ratio: 0.74 },
      { x: 0.06, ratio: 0.764 },
      { x: 0.075, ratio: 0.782 },
      { x: 0.092, ratio: 0.794 },
      { x: 0.124, ratio: 0.807 },
      { x: 0.15, ratio: 0.816 },
      { x: 0.175, ratio: 0.818 },
      { x: 0.19, ratio: 0.817 },
    ],
  },
  {
    mach: 3.1,
    points: [
      { x: 0.006, ratio: 0.19 },
      { x: 0.01, ratio: 0.253 },
      { x: 0.014, ratio: 0.307 },
      { x: 0.018, ratio: 0.356 },
      { x: 0.026, ratio: 0.437 },
      { x: 0.03, ratio: 0.474 },
      { x: 0.034, ratio: 0.506 },
      { x: 0.038, ratio: 0.539 },
      { x: 0.044, ratio: 0.586 },
      { x: 0.05, ratio: 0.628 },
      { x: 0.058, ratio: 0.683 },
      { x: 0.062, ratio: 0.709 },
    ],
  },
];

/**
 * TR 1109 fig. 8: turbulent symbols (12 wings; M 1.5 and 2.0 at Re 1.7e6,
 * M 3.1 at 2.6e6), by eye: abscissa c / [h Re^(1/5)], the symbol's
 * p_b / p_inf and fig. 8's faired curve at the same abscissa. The first
 * reading's point at M 3.1, X 2.0, p_b / p_inf 0.275 (curve 0.280) is
 * dropped: it does not exist (the second reader's zoom shows a filled
 * square at 0.291 and a circle at 0.300, both above the curve).
 */
export const TR1109_FIG8_SYMBOLS: readonly {
  readonly mach: number;
  readonly x: number;
  readonly ratio: number;
  readonly curve: number;
}[] = [
  { mach: 1.5, x: 0.55, ratio: 0.507, curve: 0.497 },
  { mach: 1.5, x: 0.75, ratio: 0.505, curve: 0.496 },
  { mach: 1.5, x: 0.75, ratio: 0.485, curve: 0.496 },
  { mach: 1.5, x: 1.0, ratio: 0.506, curve: 0.494 },
  { mach: 1.5, x: 1.12, ratio: 0.495, curve: 0.493 },
  { mach: 1.5, x: 1.12, ratio: 0.47, curve: 0.493 },
  { mach: 1.5, x: 1.5, ratio: 0.503, curve: 0.492 },
  { mach: 1.5, x: 1.5, ratio: 0.485, curve: 0.492 },
  { mach: 1.5, x: 2.25, ratio: 0.506, curve: 0.49 },
  { mach: 1.5, x: 2.25, ratio: 0.468, curve: 0.49 },
  { mach: 1.5, x: 3.0, ratio: 0.49, curve: 0.487 },
  { mach: 1.5, x: 4.5, ratio: 0.535, curve: 0.52 },
  { mach: 2.0, x: 0.55, ratio: 0.338, curve: 0.357 },
  { mach: 2.0, x: 0.75, ratio: 0.379, curve: 0.36 },
  { mach: 2.0, x: 0.75, ratio: 0.342, curve: 0.36 },
  { mach: 2.0, x: 1.0, ratio: 0.36, curve: 0.362 },
  { mach: 2.0, x: 1.15, ratio: 0.383, curve: 0.366 },
  { mach: 2.0, x: 1.15, ratio: 0.327, curve: 0.366 },
  { mach: 2.0, x: 1.5, ratio: 0.359, curve: 0.373 },
  { mach: 2.0, x: 2.25, ratio: 0.381, curve: 0.393 },
  { mach: 2.0, x: 2.25, ratio: 0.343, curve: 0.393 },
  { mach: 2.0, x: 2.25, ratio: 0.362, curve: 0.393 },
  { mach: 2.0, x: 3.0, ratio: 0.415, curve: 0.41 },
  { mach: 2.0, x: 4.5, ratio: 0.445, curve: 0.445 },
  { mach: 3.1, x: 0.55, ratio: 0.183, curve: 0.188 },
  { mach: 3.1, x: 0.7, ratio: 0.198, curve: 0.196 },
  { mach: 3.1, x: 0.9, ratio: 0.227, curve: 0.209 },
  { mach: 3.1, x: 1.05, ratio: 0.205, curve: 0.218 },
  { mach: 3.1, x: 1.4, ratio: 0.24, curve: 0.239 },
  { mach: 3.1, x: 2.05, ratio: 0.29, curve: 0.283 },
  { mach: 3.1, x: 2.75, ratio: 0.325, curve: 0.322 },
  { mach: 3.1, x: 4.2, ratio: 0.41, curve: 0.41 },
];

/**
 * Fig. 29(a) against fig. 8's faired curves at the same abscissa (fig.
 * 29(a) averages two orifice positions, fig. 8 does not): p_b / p_inf on
 * each (fig. 29(a) at M 3.1 and 4.2 interpolated).
 */
export const TR1109_FIG29A_AGAINST_FIG8: readonly {
  readonly mach: number;
  readonly x: number;
  readonly fig8: number;
  readonly fig29a: number;
}[] = [
  { mach: 1.5, x: 0.55, fig8: 0.497, fig29a: 0.492 },
  { mach: 1.5, x: 4.5, fig8: 0.52, fig29a: 0.552 },
  { mach: 2.0, x: 0.55, fig8: 0.357, fig29a: 0.358 },
  { mach: 2.0, x: 4.5, fig8: 0.445, fig29a: 0.454 },
  { mach: 3.1, x: 0.75, fig8: 0.196, fig29a: 0.209 },
  { mach: 3.1, x: 4.2, fig8: 0.41, fig29a: 0.423 },
];

/**
 * TN D-1056 table II, power off, speed brakes closed: flight, time (s),
 * Mach number, and the base pressure coefficient on free-stream conditions
 * (flight A: orifice 2; flight B: the mean of orifices 1 to 3).
 */
export const TN_D1056_TABLE_II: readonly {
  readonly flight: 'A' | 'B';
  readonly time: number;
  readonly mach: number;
  readonly cp: number;
}[] = [
  { flight: 'A', time: 366.0, mach: 3.24, cp: -0.12 },
  { flight: 'A', time: 369.0, mach: 3.16, cp: -0.127 },
  { flight: 'A', time: 371.0, mach: 3.11, cp: -0.134 },
  { flight: 'A', time: 380.5, mach: 2.8, cp: -0.15 },
  { flight: 'A', time: 401.5, mach: 2.45, cp: -0.173 },
  { flight: 'A', time: 409.5, mach: 2.15, cp: -0.201 },
  { flight: 'A', time: 435.5, mach: 1.8, cp: -0.247 },
  { flight: 'A', time: 435.9, mach: 1.8, cp: -0.251 },
  { flight: 'A', time: 436.2, mach: 1.79, cp: -0.249 },
  { flight: 'A', time: 456.5, mach: 1.68, cp: -0.289 },
  { flight: 'A', time: 465.0, mach: 1.52, cp: -0.307 },
  { flight: 'A', time: 474.0, mach: 1.35, cp: -0.324 },
  { flight: 'A', time: 479.6, mach: 1.23, cp: -0.406 },
  { flight: 'A', time: 483.0, mach: 1.15, cp: -0.443 },
  { flight: 'B', time: 404.0, mach: 3.17, cp: (-0.136 - 0.129 - 0.136) / 3 },
  { flight: 'B', time: 418.5, mach: 2.95, cp: (-0.156 - 0.149 - 0.138) / 3 },
  { flight: 'B', time: 441.0, mach: 2.66, cp: (-0.183 - 0.169 - 0.17) / 3 },
  { flight: 'B', time: 448.0, mach: 2.56, cp: (-0.19 - 0.179 - 0.166) / 3 },
  { flight: 'B', time: 467.2, mach: 2.3, cp: (-0.191 - 0.189 - 0.187) / 3 },
  { flight: 'B', time: 483.0, mach: 1.97, cp: (-0.248 - 0.228 - 0.253) / 3 },
  { flight: 'B', time: 508.0, mach: 1.52, cp: (-0.347 - 0.322 - 0.353) / 3 },
  { flight: 'B', time: 522.4, mach: 1.31, cp: (-0.333 - 0.378 - 0.396) / 3 },
  { flight: 'B', time: 533.0, mach: 1.09, cp: (-0.353 - 0.437 - 0.429) / 3 },
];

/*
 * The second readings (round 4). Reading errors as the reader gives them:
 * fig. 29 +-0.004 (+-0.006 on gridlines or labels); fig. 8 symbols +-0.02
 * in X and +-0.006 in p_b / p_inf, curves +-0.004; RM A51J25 fig. 7 curve
 * +-0.004 where clear, +-0.010 under symbols, symbols +-0.005.
 */

/**
 * RM A51J25 fig. 7, mean curve, second reading: M' and p_b / p'. Below M'
 * 1.50 the line runs under the PARD symbols and was not read. The values
 * at 1.50 to 1.60 were re-read after the comparison with the first
 * reading, so they are not blind.
 */
export const RM_A51J25_FIG7_CURVE_SECOND: readonly {
  readonly mach: number;
  readonly ratio: number;
  readonly blind: boolean;
}[] = [
  { mach: 1.5, ratio: 0.474, blind: false },
  { mach: 1.55, ratio: 0.463, blind: false },
  { mach: 1.6, ratio: 0.447, blind: false },
  { mach: 1.7, ratio: 0.425, blind: true },
  { mach: 1.8, ratio: 0.403, blind: true },
  { mach: 1.9, ratio: 0.38, blind: true },
  { mach: 2.0, ratio: 0.36, blind: true },
  { mach: 2.1, ratio: 0.341, blind: true },
  { mach: 2.2, ratio: 0.324, blind: true },
  { mach: 2.3, ratio: 0.307, blind: true },
  { mach: 2.4, ratio: 0.291, blind: true },
  { mach: 2.5, ratio: 0.277, blind: true },
  { mach: 2.6, ratio: 0.266, blind: true },
  { mach: 2.7, ratio: 0.255, blind: true },
  { mach: 2.8, ratio: 0.247, blind: true },
  { mach: 2.9, ratio: 0.239, blind: true },
  { mach: 3.0, ratio: 0.23, blind: true },
  { mach: 3.2, ratio: 0.217, blind: true },
  { mach: 3.3, ratio: 0.214, blind: true },
  { mach: 3.4, ratio: 0.209, blind: true },
  { mach: 3.5, ratio: 0.208, blind: true },
  { mach: 3.6, ratio: 0.205, blind: true },
  { mach: 3.7, ratio: 0.203, blind: true },
  { mach: 3.8, ratio: 0.2015, blind: true },
  { mach: 3.9, ratio: 0.2, blind: true },
  { mach: 4.0, ratio: 0.199, blind: true },
];

/** RM A51J25 fig. 7 symbols, second reading (all not blind): source, M', p_b / p'. */
export const RM_A51J25_FIG7_SYMBOLS_SECOND: readonly {
  readonly source: string;
  readonly mach: number;
  readonly ratio: number;
}[] = [
  { source: 'Langley 9 by 12 in, delta (tagged square)', mach: 1.24, ratio: 0.501 },
  { source: 'Ames 1 by 3 ft (triangle, flagged)', mach: 1.41, ratio: 0.533 },
  { source: 'Langley 9 by 12 in, rectangular (diamond)', mach: 1.403, ratio: 0.464 },
  { source: 'Ames 1 by 3 ft (square)', mach: 1.492, ratio: 0.508 },
  { source: 'tagged square', mach: 1.617, ratio: 0.466 },
  { source: 'Langley 9 by 12 in, rectangular (diamond)', mach: 1.606, ratio: 0.4235 },
  { source: 'NPL two-dimensional', mach: 1.843, ratio: 0.41 },
  { source: 'Ames 1 by 3 ft (square, cluster centre)', mach: 1.998, ratio: 0.374 },
  { source: 'Langley 9 by 12 in, rectangular (diamond)', mach: 1.961, ratio: 0.332 },
  { source: 'tagged', mach: 1.954, ratio: 0.351 },
  { source: 'Ames 1 by 3 ft (square)', mach: 2.49, ratio: 0.282 },
  { source: 'Ames 1 by 3 ft (inverted triangle)', mach: 2.891, ratio: 0.257 },
  { source: 'Ames 1 by 3 ft (square)', mach: 3.113, ratio: 0.233 },
  { source: 'Ames 1 by 3 ft (inverted triangle)', mach: 3.113, ratio: 0.209 },
  { source: 'Langley 9 in two-dimensional', mach: 4.0, ratio: 0.223 },
  { source: 'Langley 9 in two-dimensional', mach: 4.0, ratio: 0.19 },
];

/**
 * TR 1109 fig. 29(a), turbulent, second reading (the comparison set of
 * `compare_round4.py`, which holds every value of `tr1109_fig29.csv` and
 * the dense-scan values between them). The curves start near X 0.43.
 */
export const TR1109_FIG29A_TURBULENT_SECOND: readonly Tr1109Curve[] = [
  {
    mach: 1.5,
    points: [
      { x: 0.45, ratio: 0.492 },
      { x: 0.55, ratio: 0.492 },
      { x: 0.7, ratio: 0.492 },
      { x: 0.95, ratio: 0.493 },
      { x: 1.0, ratio: 0.4928 },
      { x: 1.5, ratio: 0.497 },
      { x: 2.0, ratio: 0.502 },
      { x: 2.5, ratio: 0.507 },
      { x: 3.0, ratio: 0.514 },
      { x: 3.5, ratio: 0.526 },
      { x: 4.0, ratio: 0.537 },
      { x: 4.5, ratio: 0.55 },
    ],
  },
  {
    mach: 2.0,
    points: [
      { x: 0.45, ratio: 0.356 },
      { x: 0.55, ratio: 0.356 },
      { x: 0.7, ratio: 0.359 },
      { x: 0.75, ratio: 0.3606 },
      { x: 0.95, ratio: 0.365 },
      { x: 1.0, ratio: 0.3656 },
      { x: 1.5, ratio: 0.376 },
      { x: 2.0, ratio: 0.389 },
      { x: 2.5, ratio: 0.401 },
      { x: 3.0, ratio: 0.414 },
      { x: 3.5, ratio: 0.428 },
      { x: 4.0, ratio: 0.44 },
      { x: 4.5, ratio: 0.453 },
    ],
  },
  {
    mach: 3.1,
    points: [
      { x: 0.45, ratio: 0.187 },
      { x: 0.55, ratio: 0.195 },
      { x: 0.7, ratio: 0.2 },
      { x: 0.75, ratio: 0.2045 },
      { x: 0.8, ratio: 0.2076 },
      { x: 0.95, ratio: 0.217 },
      { x: 1.0, ratio: 0.2195 },
      { x: 1.5, ratio: 0.251 },
      { x: 2.0, ratio: 0.282 },
      { x: 2.5, ratio: 0.313 },
      { x: 3.0, ratio: 0.344 },
      { x: 3.5, ratio: 0.377 },
      { x: 4.0, ratio: 0.408 },
      { x: 4.5, ratio: 0.438 },
    ],
  },
];

/**
 * TR 1109 fig. 29(b), laminar, second reading: the comparison set of
 * `compare_round4.py`, whose agreement with the first reading (within
 * -0.002 to +0.004) the report states. The csv's further points on the
 * M 1.5 and 2.0 pair at 0.060 to 0.185 are not taken: the csv leaves the
 * pair's identity uncertain left of X 0.045, and its 0.786 at 0.080 on
 * the upper curve lies on the first reading's M 2.0 curve, 0.012 below
 * its M 1.5 curve. The fins' abscissae are 0.0089 to 0.0115. The report
 * puts the M 1.5 curve's start near X 0.0095.
 */
export const TR1109_FIG29B_LAMINAR_SECOND: readonly Tr1109Curve[] = [
  {
    mach: 1.5,
    points: [
      { x: 0.01, ratio: 0.3576 },
      { x: 0.0115, ratio: 0.395 },
      { x: 0.012, ratio: 0.4068 },
      { x: 0.03, ratio: 0.665 },
      { x: 0.038, ratio: 0.7054 },
      { x: 0.04, ratio: 0.713 },
      { x: 0.05, ratio: 0.74 },
      { x: 0.1, ratio: 0.82 },
      { x: 0.102, ratio: 0.8213 },
      { x: 0.124, ratio: 0.836 },
      { x: 0.15, ratio: 0.8453 },
      { x: 0.175, ratio: 0.849 },
    ],
  },
  {
    mach: 2.0,
    points: [
      { x: 0.01, ratio: 0.4389 },
      { x: 0.0115, ratio: 0.459 },
      { x: 0.012, ratio: 0.4639 },
      { x: 0.03, ratio: 0.645 },
      { x: 0.038, ratio: 0.6916 },
      { x: 0.04, ratio: 0.7 },
      { x: 0.124, ratio: 0.807 },
      { x: 0.15, ratio: 0.8164 },
      { x: 0.175, ratio: 0.8192 },
    ],
  },
  {
    mach: 3.1,
    points: [
      { x: 0.006, ratio: 0.1917 },
      { x: 0.009, ratio: 0.2362 },
      { x: 0.01, ratio: 0.2486 },
      { x: 0.0115, ratio: 0.2731 },
      { x: 0.012, ratio: 0.2792 },
      { x: 0.022, ratio: 0.399 },
      { x: 0.03, ratio: 0.472 },
      { x: 0.038, ratio: 0.5378 },
      { x: 0.04, ratio: 0.553 },
      { x: 0.05, ratio: 0.627 },
      { x: 0.06, ratio: 0.696 },
      { x: 0.062, ratio: 0.7089 },
    ],
  },
];

/** TR 1109 fig. 8, faired curves, second reading (column scans; `compare_round4.py`, C8). */
export const TR1109_FIG8_CURVES_SECOND: readonly Tr1109Curve[] = [
  {
    mach: 1.5,
    points: [
      [0.547, 0.4977],
      [0.6, 0.4973],
      [0.65, 0.4969],
      [0.8, 0.4951],
      [0.9, 0.4946],
      [1.1, 0.4937],
      [1.3, 0.4918],
      [1.45, 0.4923],
      [1.7, 0.4909],
      [1.9, 0.4896],
      [2.1, 0.4879],
      [2.2, 0.4869],
      [2.35, 0.4857],
      [2.6, 0.4882],
      [2.8, 0.49],
      [2.95, 0.4908],
      [3.2, 0.4945],
      [3.8, 0.5071],
      [4.15, 0.514],
      [4.3, 0.5182],
      [4.45, 0.5226],
      [4.6, 0.527],
    ].map(([x, ratio]) => ({ x: x!, ratio: ratio! })),
  },
  {
    mach: 2.0,
    points: [
      [0.48, 0.3562],
      [0.52, 0.3564],
      [0.6, 0.358],
      [0.65, 0.3585],
      [0.72, 0.3595],
      [0.9, 0.3626],
      [1.2, 0.3683],
      [1.3, 0.3697],
      [1.45, 0.3749],
      [1.7, 0.3796],
      [1.9, 0.3839],
      [2.1, 0.3883],
      [2.8, 0.4099],
      [2.95, 0.4149],
      [3.2, 0.4216],
      [3.8, 0.437],
      [4.15, 0.4453],
      [4.3, 0.4481],
      [4.45, 0.4519],
      [4.6, 0.4554],
    ].map(([x, ratio]) => ({ x: x!, ratio: ratio! })),
  },
  {
    mach: 3.1,
    points: [
      [0.52, 0.195],
      [0.8, 0.2088],
      [1.1, 0.227],
      [1.2, 0.2334],
      [1.3, 0.2395],
      [1.45, 0.2498],
      [1.55, 0.257],
      [1.7, 0.2654],
      [1.9, 0.2776],
      [2.2, 0.2955],
      [2.35, 0.3046],
      [2.6, 0.3208],
      [2.95, 0.3424],
      [3.05, 0.3478],
      [3.2, 0.3573],
      [3.8, 0.3977],
      [4.15, 0.4186],
      [4.3, 0.4258],
    ].map(([x, ratio]) => ({ x: x!, ratio: ratio! })),
  },
];

/** TR 1109 fig. 8, symbols, second reading: M, X = c / [h Re^(1/5)], p_b / p_inf. */
export const TR1109_FIG8_SYMBOLS_SECOND: readonly {
  readonly mach: number;
  readonly x: number;
  readonly ratio: number;
}[] = [
  [1.5, 0.547, 0.508],
  [1.5, 0.755, 0.517],
  [1.5, 0.752, 0.492],
  [1.5, 1.006, 0.518],
  [1.5, 1.179, 0.5],
  [1.5, 1.144, 0.471],
  [1.5, 1.518, 0.51],
  [1.5, 1.523, 0.488],
  [1.5, 2.293, 0.509],
  [1.5, 2.257, 0.477],
  [1.5, 3.033, 0.508],
  [1.5, 4.517, 0.542],
  [2.0, 0.569, 0.334],
  [2.0, 0.767, 0.382],
  [2.0, 0.777, 0.34],
  [2.0, 1.001, 0.365],
  [2.0, 1.144, 0.385],
  [2.0, 1.153, 0.322],
  [2.0, 1.513, 0.361],
  [2.0, 2.263, 0.382],
  [2.0, 2.265, 0.354],
  [2.0, 3.038, 0.425],
  [2.0, 4.538, 0.445],
  [3.1, 0.524, 0.184],
  [3.1, 0.694, 0.204],
  [3.1, 0.918, 0.229],
  [3.1, 1.04, 0.212],
  [3.1, 1.401, 0.252],
  [3.1, 2.042, 0.29],
  [3.1, 2.082, 0.299],
  [3.1, 2.764, 0.332],
  [3.1, 4.194, 0.42],
].map(([mach, x, ratio]) => ({ mach: mach!, x: x!, ratio: ratio! }));
