# The fin edges of flat plates: first readings (0014 W3, W4, W11)

Transcriptions for design record 0016 (blunt trailing edges of thin and
tapered fins; rounded leading edges on flat, tapered and swept fins; the
"bounded, not measured" edges of 0014 section 10.2). **First readings; the
independent reader's blind second readings are pending** (they are made
without this file, and this file was made without theirs). Every band is
to be the envelope of both readings.

No held-back set was opened or used (0014 section 10.1): not the PARD body's
totals (TN 3697 fig. 5, TN 3650 fig. 4, RM L52E06 figs. 9 to 12), not BRL
Report 934, not the Eglin set, not TN 3320. No drag value of any total-drag
set was used for anything here.

Values, readings and computations:

- `fin_edges_w34.csv` (every value read, with its figure, method and reading
  error) and `fin_edges_w34_output.txt`, both from
  `scripts/w34_fin_edges.py`;
- the digitising tools, `scripts/w34_grid.py` (grid lines from darkness
  profiles), `w34_deskew.py` (rotation from one long grid line),
  `w34_colscan.py` and `w34_guided.py` (column scans of faired curves; the
  guided scan takes, in each column within +-0.6 deg of the abscissa, the
  dark run nearest a guess and reports the median), `w34_ruler.py` and
  `w34_strips.py` (ruler overlays for reading by eye), `w34_polar.py` and
  `w34_polar_pts.py` (a polar ruler for TN 3861 fig. 5).

Page images: `pdfimages` at the scans' 300 ppi, in the research
scratchpad (`w34/img/`), each download in its own directory
(`w34/dl-<NTRS id>/`). PDF pages below count the cover as page 1.

## 1. Sources opened

| Source | NTRS | Figures read | Status |
| --- | --- | --- | --- |
| Gowen and Perkins, NACA TN 2960, 1953 | 19930084018 | 5(a) p. 18, 5(b) p. 19, 5(d) p. 21, 5(e) p. 22 | Read (section 2). 5(c) and 7 were read twice for 0010; figs. 6 (p. 23) and 7 (p. 24) viewed, not digitised: used for no number |
| Goodwin, Creager and Winkler, NACA RM A55H31, 1956 | 19930088843 | 11 p. 40, 12 p. 41; table II p. 27 typed | Read (section 3). Figs. 9 (p. 38) and 10 (p. 39) viewed, not digitised |
| Penland, NACA TN 3861, 1957 | 19930084664 | 5(a) p. 20 calibrated | Not used for a number (section 4). Figs. 15, 16 viewed |
| Goin, NACA RM L52D21, 1952 | 19930087183 | 11 p. 46 (alpha 0, h/t 1.0) | Read (section 5). Fig. 12 p. 47 viewed; fig. 1 p. 22 text layer |
| Morrow and Katz, NACA TN 3548, 1955 | 19930084307 | none | Opened, text read (section 6); fig. 6 not read |

## 2. TN 2960: the cylinder's front side at subsonic Mach numbers, and checks

**What the report says** (pp. 3 to 8). Fig. 5(a): the Ames 7 by 10 ft
tunnel, a 12 in cylinder at M 0.05 (R 3.14e5) and 0.06 to 0.07 (R 4.26e5),
"typical of the distributions ... below and above the critical range of
Reynolds numbers". Fig. 5(b): the Ames 1 by 3-1/2 ft tunnel, 0.3 and 0.5 in
cylinders at M 0.3 to 0.7, R 0.5e5 to 1.6e5; above M 0.625 the wake
oscillates, so the rear pressures are averages. Fig. 5(d): M 1.98 at R
1.3e5, 5.5e5 and 13.2e5, "no effect of Reynolds number on the pressure
distribution at supersonic Mach numbers". Fig. 5(e): faired distributions at
M 0.06 (R above critical), 0.70, 1.49 and 2.90 with incompressible potential
and Newtonian theory. Fig. 7: no two-dimensional data between about M 0.8
and 1.4; the free-flight points there (ref. 12) are a fineness-60 cylinder
whose magnitudes below Mach 1 "are not the same as would be obtained for
two-dimensional flow" (p. 8). So TN 2960 has **no front-side pressure
distribution between M 0.7 and 1.49**.

**Calibration.** Grid lines found from darkness profiles (`w34_grid.py`).
Figs. 5(a), 5(d) and 5(e) were deskewed by -0.380, +0.685 and +0.389 deg
(the scans' tilt across one long horizontal line; after it, every grid line
is a single run). Fig. 5(b) tilts 0.04 deg and was not deskewed.

| Figure | theta = 0 / 180 deg (x px) | P (y px) | Notes |
| --- | --- | --- | --- |
| 5(a) | 605 / 1962 | 0 at 993, -3.2 at 2197 | 7.54 px/deg, 376.3 px per unit |
| 5(b) | 506.5 / 1949 | 0 (M 0.7's zero) at 1057.5, -2.8 at 2180 | four curves, each offset by 0.4 (zeros at 1057.5, 1217, 1377.5, 1538 for M 0.7, 0.6, 0.5, 0.3); offsets removed |
| 5(d) | 437.75 / 1992.5 | 0 at 1420, 2.4 at 385.5 | the 0 deg line extrapolated from the 20 deg line |
| 5(e) | 523.5 / 1934 | 3 at 350, -3 at 2233.5 | the zero line lies 2 px off the linear fit (0.007) |

**Method.** Faired curves: guided column scans (`w34_guided.py`, the dark
run nearest a guess in each column within +-0.6 deg, median), checked on
ruler crops (`w34_ruler.py`); at symbol positions a scan can catch a symbol's
edge, so fig. 5(e)'s supersonic curves were read between the symbols; fig.
5(a) by eye on its ruler crop (the two curves cross near 30 deg, where a
scan cannot tell them apart). Fig. 5(d) also symbol by symbol, by eye on 2x
crops, each Reynolds number apart. theta = 0 at a symbol set's start is
Rayleigh's (or the isentropic) stagnation coefficient where the axis line
covers the curve. **Reading error:** +-0.02 in P for the scans (+-0.04 at
5(b)'s 55 to 90 deg, where symbols crowd), +-0.03 by eye on 5(a), +-0.01
for 5(d)'s symbols.

**Front side over modified Newtonian** (trapezoid rule, 0 to 90 deg, on
the diameter; (2/3) Cp_0 with Cp_0 Rayleigh's pitot coefficient above Mach
1 and the isentropic stagnation coefficient below; `fin_edges_w34_output.txt`):

| Figure, case | Front side | (2/3) Cp_0 | Ratio |
| --- | --- | --- | --- |
| 5(a) M 0.05, R 3.14e5 (below the critical range) | +0.068 | 0.667 | +0.10 |
| 5(a) M 0.065, R 4.26e5 (above it) | -0.290 | 0.667 | -0.43 |
| 5(e) M 0.06, R above critical | -0.267 | 0.667 | -0.40 |
| 5(b) M 0.3 | +0.104 | 0.682 | +0.15 |
| 5(b) M 0.5 | +0.130 | 0.709 | +0.18 |
| 5(b) M 0.6 | +0.204 | 0.729 | +0.28 |
| 5(b) M 0.7 | +0.297 | 0.752 | +0.40 |
| 5(e) M 0.70 | +0.295 | 0.752 | +0.39 |
| 5(e) M 1.49 (check of 5(c)) | +1.013 | 1.019 | 0.994 |
| 5(d) M 1.98, faired curve | +1.146 | 1.103 | 1.040 |
| 5(d) M 1.98, R 13.2e5 symbols | +1.141 | 1.103 | 1.035 |
| 5(d) M 1.98, R 5.5e5 symbols | +1.141 | 1.103 | 1.035 |
| 5(d) M 1.98, R 1.3e5 symbols | +1.165 | 1.103 | 1.056 |
| 5(e) M 2.90 (check of 5(c)) | +1.224 | 1.167 | 1.049 |

What these show:

- **At supersonic Mach numbers the band stands.** Fig. 5(e)'s M 1.49 and
  2.90 curves (0.994, 1.049) and fig. 5(d)'s three Reynolds numbers at M
  1.98 (1.035 to 1.056; the coarse 15 deg symbol spacing included) all lie
  inside 0.99 to 1.06 (0010 section 5.2's envelope 0.995 to 1.056), and
  fig. 5(d) shows no Reynolds-number trend over R 1.3e5 to 13.2e5.
- **At subsonic Mach numbers the front side is not a stagnation-region
  quantity.** It is 0.10 to 0.40 of the modified-Newtonian value at M 0.05 to
  0.70 below the critical Reynolds number, and changes sign above it (-0.40,
  -0.43: a thrust on the front half, near potential flow's -1/3 on D). The
  front half's pressures from about 50 deg on are set by where the layer
  separates and by the wake, which a fin's edge, followed by the plate's
  faces, does not have. No source opened measures a rounded nose followed by
  flat faces at subsonic speeds.
- **Between M 0.7 and 1.49** TN 2960 has no pressure distribution, and the
  measured-over-modelled ratios either side (0.4 at 0.7; 0.99 at 1.49) do
  not agree, so 0014's condition for bridging the gap fails.

## 3. RM A55H31: the yawed cylinder (the independence principle)

**What the report says** (pp. 9 to 15). Ames 8 in low-density tunnel,
nominal M 3.9, 1 in cylinder in a 3 in usable stream, R 2.1e3 to 6.7e3
(table I: 3.6 in at 320 microns, 3.0 in at 180 and 110). Pressures at yaw 0,
30, 45 and 60 deg. Fig. 10: the pressure-ratio distribution p/p_x=0 "is not
changed for yaw angle of 0 to 30 deg in the present tests and 0 to 60 deg in
the tests of reference 1"; at 45 and 60 deg the present tests depart beyond
about 45 deg of azimuth, "suspected ... three-dimensional due to the
1-inch-diameter model in the 3-inch-diameter stream" (p. 14). Reference 1 is
Penland's M 6.86 data (RM L54A14, superseded by TN 3861). Table II
tabulates the present tests at yaw 0 (M 3.94, R 6.7e3), 30 (M 3.90, 6.7e3)
and 45 (M 3.8, **2.1e3**, below the 6.7e3 of p. 13's statement).

**Calibration.** Both figures are printed rotated. Fig. 11 deskewed
-0.322 deg: yaw on the page's vertical (0 deg at y 2439, 90 at 431; 22.3 px
per deg), the ratio on its horizontal (1.0 at x 595.5, 0 at 1723.5). Fig. 12
deskewed +0.212 deg: yaw 0 at y 2436, 90 at 306 (23.67 px per deg); ratio
0.8 at x 612, 0 at 1564.

**Method.** Symbol centres by eye on 2x ruler crops (`w34_ruler.py`).
**Reading error** +-0.004 in the ratio, +-0.2 deg in yaw (the yaw read
agrees with the legend's 14.3, 29.6, 45.1, 59.8 within 0.4 deg).

| Fig. 12 (front-side drag, yawed over unyawed) | Yaw, deg | Ratio |
| --- | --- | --- |
| present tests, M 3.9 | 30.1 / 45.1 / 60.1 | 0.700 / 0.410 / 0.170 |
| ref. 1, M 6.9 | 14.4 / 29.6 / 45.2 / 59.9 / 75.5 | 0.907 / 0.665 / 0.367 / 0.131 / 0.023 |

| Fig. 11 (p_x=0 / p_t2) | Yaw, deg | Ratio |
| --- | --- | --- |
| present tests, M 3.9 | 30 / 45 / 60 | 0.769 / 0.530 / 0.295 |
| ref. 1, M 6.9 | 14.3 / 29.6 / 45.1 / 59.8 / 75.2 | 0.972 / 0.750 / 0.500 / 0.246 / 0.046 |

**Basis of fig. 12.** Eq. (14), (C_D)_L / (C_D)_0 = (p_x=0 / p_t2) cos L,
holds exactly only for a drag computed from absolute pressures with the
shape p/p_x=0 unchanged. Table II integrated both ways gives 0.677 and
0.404 at 30 and 45 deg on absolute pressures and 0.662 and 0.378 on gauge
pressures (each run on its own dynamic pressure), against fig. 12's 0.700
and 0.410: the figure is on the absolute basis (the remaining 1.5% to 3.4%
is not explained; it may be the figure's finer azimuth spacing). A fin's
nose drag is the gauge integral, so each point is converted: gauge = ratio
x [1 - 1 / (S I_g)] / [1 - 1 / (S_0 I_g)], with S = (p_x=0 / p_t2)(p_t2 /
p_inf) from fig. 11 and Rayleigh, S_0 = p_t2 / p_inf, and I_g = 0.721, the
unyawed shape integral of table II at yaw 0 (the data of fig. 9's
present-test symbols). The conversion moves each ratio by 0% to 2% below
60 deg of yaw.

**The independence model.** On the normal component, per unit length of the
cylinder: cos^3(L) Cp_pitot(M cos L) / Cp_pitot(M), the modified-Newtonian
front side at the normal Mach number on the normal dynamic pressure,
projected. r is the measured (gauge) ratio over it:

| Source, yaw | M_n | r | Flag |
| --- | --- | --- | --- |
| present, 30.1 deg | 3.37 | 1.067 | (table II directly: 1.029) |
| present, 45.1 deg | 2.75 | 1.120 | R 2.1e3, below the domain; three-dimensional flow suspected by the report |
| present, 60.1 deg | 1.94 | 1.226 | three-dimensional flow suspected by the report |
| ref. 1, 14.4 deg | 6.64 | 0.998 | |
| ref. 1, 29.6 deg | 5.96 | 1.007 | |
| ref. 1, 45.2 deg | 4.83 | 1.034 | |
| ref. 1, 59.9 deg | 3.44 | 0.990 | |
| ref. 1, 75.5 deg | 1.72 | 0.866 | end effects (TN 3861 p. 10: the shock not parallel to the body at alpha 15 deg) |

Fig. 11 against Rayleigh's pitot formula on the normal Mach number:
present tests 1.019, 1.039, 1.104 of it at 30, 45, 60 deg; ref. 1 0.956 to
1.036 to 60 deg, 0.653 at 75 deg (the same end effect). Table II's
stagnation pressures are 1.047 and 1.075 of Rayleigh's at 30 and 45 deg.

## 4. TN 3861 (Penland): not used for a number

Fig. 5(a) (p. 20) is a polar plot of dP/q on the free stream's dynamic
pressure. Calibrated: centre (1199, 1552.5); dP/q = (r - 220) / 441 (the
printed arcs at 0, 0.5, 1.0, 1.5, 2.0 cross the axes at radii 220, 443.5,
663.5, 882, 1102 vertically and 221, 444, 665.5 horizontally: circles).
Near the axis the reading resolves +-0.007 in dP/q, which is +-0.03 on the
crossflow dynamic pressure at alpha 30.2 deg and +-0.11 at alpha 14.9 deg (q_c
/ q = 0.066): too coarse to integrate the low-incidence front sides, the
only ones at normal Mach numbers inside TN 2960's range. Its integrated
front-side ratios enter through RM A55H31 fig. 12 (reference 1). One
caveat: TN 3861 corrects its alpha = 90 deg data for a local Mach-number
variation of the all-steel nozzle (p. 7); RM A55H31's reference-1 ratios
were formed on RM L54A14, before that correction, so their unyawed
denominator may differ from TN 3861's by its size, which neither report
states.

## 5. RM L52D21: swept blunt trailing edges

**What the report says.** Langley 9 by 12 in tunnel, semispan wings of
aspect ratio 2.7 on a half-body, unswept and 45 deg swept (untapered, so
the trailing edge is swept 45 deg too), t/c 0.03 to 0.10, h/t 0.375 to 1.0,
fixed transition, R 1.3e6 to 1.6e6 on the mean chord, M 1.41, 1.62 and
1.96. Average base pressures integrated along the span over faired curves
through four orifices (20, 45, 70 and 95% of the exposed semispan); for
swept wings "the spanwise variations were very large" (summary). The
normal Mach number correlates the swept and unswept wings at M 1.41 and
1.62, but "at a Mach number of 1.96 ... the Mach number component normal to
the wing trailing edge appeared to be of greater importance" (p. 13). Fig. 1
(table): the h/t = 1.0 wings are t/c 0.100, 0.060, 0.045 and 0.030 unswept
and 0.060, 0.045 (and 0.100) swept, so c / [h R^(1/5)] about 0.6 to 1.9.

**Calibration.** Fig. 11 rotated upright (the page prints it rotated 90
deg). Panels at alpha 0: P_b'/P_bv 0.8 at y 409.5 (M 1.41), 407.5 (1.62),
404.5 (1.96), 0.2 at 812.5, 810.5, 808.5; h/t 0.2 at x 496.5, 1167.5, 1840
and 1.0 at 1035.5, 1705, 2377.

**Method.** Column scans at h/t 0.95 to 0.99 (`w34_colscan.py`); the solid
(0 deg) and dashed (45 deg) curves told apart by continuity and dash.
**Reading error** +-0.005.

| M | Sweep 0 | Sweep 45 | Thin-layer curve, 1 - p_b/p_inf | 0 over curve | 45 over curve |
| --- | --- | --- | --- | --- | --- |
| 1.41 | 0.534 | 0.488 | 0.487 | 1.096 | 1.001 |
| 1.62 | 0.570 | 0.548 | 0.559 | 1.019 | 0.980 |
| 1.96 | 0.663 | 0.575 | 0.632 | 1.050 | 0.910 |

(P_b' / P_bv = 1 - p_b / p_inf, so the last two columns are base drag
measured over the unswept thin-layer curve, RM A51J25 fig. 7's first reading
at the free-stream Mach number.) At 45 deg the independence principle on the
normal Mach number (1.00, 1.15, 1.39) would put p_b / p_inf at about 0.59 and
0.52 at the two upper points, base drag 0.41 and 0.48 of vacuum, far below
the measured 0.548 and 0.575: it does not hold for the base.

## 6. TN 3548: base pressure on a blunt trailing edge in flight, M 0.6 to 1.7

One rocket-powered model (Wallops, 1950) with a rectangular 6% slab wing
of aspect ratio 2.7, a 40%-chord bevelled leading edge, two base-pressure
slits 0.02 by 2.5 in in the central part of the base; base pressure
coefficient +-0.02 at M 0.8 and +-0.005 at 1.4 (p. 4); R 2.8e6 to 9.8e6 on
the 9.58 in chord. Its rectangular aspect-ratio-2.7 PARD wing appears to
be the "Langley PARD free flight" set of RM A51J25 fig. 7 (RM L50E19a,
which TN 3548 supersedes, is RM L52D21's ref. 3), so it would not be
independent of the curve there. Fig. 6 was not read: it matters only below
Mach 1.5, where no total is served until the body base is (0014 W2).

## 7. A check of the "bounded" rounded trailing edge, from 0010's first readings

TN 2960 fig. 5(c)'s rear side (0010 section 5.2's integration: 0.454,
0.269, 0.093 on D at M 1.49, 1.98, 2.90) against a square base of the
same height at the thin-layer curve (0.336, 0.232, 0.130): 1.35, 1.16 and
0.72 of it. A rounded rear surface in supersonic flow can carry more base
drag than a square base of the same height (the flow expands along the
curve before it separates). The cylinder's rear is not a rounded trailing
edge (its flow arrives already expanded, P = -0.29 at 90 deg at M 1.49),
but the ordering 0014 section 10.2 asks to be shown for rounded trailing
edges (no more than the square edge's base drag) is contradicted by the
nearest measurement in hand at M 1.5 to 2.

## 8. Second readings

Pending, by the independent reader. To be held beside these in the code,
and every band to be the envelope of both.
