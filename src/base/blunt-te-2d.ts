/**
 * Two-dimensional base pressure of blunt trailing edges at Mach 1.1 to 4,
 * as data: the transcriptions behind docs/design/0008-total-drag.md
 * section 3.4 (`docs/research/total-drag/data/blunt_te_2d_base.md` and
 * `.csv`, `scripts/blunt_te_2d.py`). **Every value here has one reading**
 * (TN D-1056 table II typed once from the page image); the second
 * readings are pending. A second reading is added as a further table and
 * the band of ./fin-trailing-edge.ts follows, as the envelope of all.
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
 *   +-0.03).
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
 * p_b / p_inf and fig. 8's faired curve at the same abscissa.
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
  { mach: 3.1, x: 2.0, ratio: 0.275, curve: 0.28 },
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
