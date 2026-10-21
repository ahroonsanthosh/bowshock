# The fin edges of flat plates: first readings (0014 W3, W4, W11)

Transcriptions for design record 0016 (blunt trailing edges of thin and
tapered fins; rounded leading edges on flat, tapered and swept fins; the
"bounded, not measured" edges of 0014 section 10.2). **First readings.**
The independent reader's blind second readings (made without this file,
as this file was made without theirs) are paired in section 8 and 0016
sections 13, 14 and 16; every band is the envelope of both readings. TN
3861 figs. 15 and 16 are read twice and fig. 17 once (section 4): a check,
not a band.

No held-back set was opened or used (0014 section 10.1): not the PARD body's
totals (TN 3697 fig. 5, TN 3650 fig. 4, RM L52E06 figs. 9 to 12), not BRL
Report 934, not the Eglin set, not TN 3320. No drag value of any total-drag
set was used for anything here.

Values, readings and computations:

- `fin_edges_w34.csv` (every value read, with its figure, method and reading
  error) and `fin_edges_w34_output.txt`, both from
  `scripts/w34_fin_edges.py`;
- the digitising tools, `scripts/w34_pwruler.py` and `w34_pwscan.py`
  (ruler crops and column scans placed between a figure's own grid lines,
  piecewise linear, for scans whose grid spacing is uneven; section 9),
  `scripts/w34_grid.py` (grid lines from darkness
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
| Penland, NACA TN 3861, 1957 | 19930084664 | 5(a) p. 20 calibrated; figs. 15 to 17 (pp. 31 to 33); figs. 15 and 16 read twice, fig. 17 once | Not used for a number (section 4): a check on the sweep allowance |
| Goin, NACA RM L52D21, 1952 | 19930087183 | 11 p. 46 (alpha 0, h/t 1.0) | Read (section 5). Fig. 12 p. 47 viewed; fig. 1 p. 22 text layer |
| Morrow and Katz, NACA TN 3548, 1955 | 19930084307 | none | Opened, text read (section 6); fig. 6 not read |
| Macha, NASA CR-149372 (Texas A&M report 3318-76-01), 1976 | 19770008057 | 8b p. 26, 5 p. 22 | Read (section 9). Figs. 8a (p. 25), 10 (p. 30), 11 (p. 31), 12 (p. 32) viewed, not digitised |

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
| 5(b) M 0.7 | +0.297 | 0.752 | +0.39 |
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
  quantity.** It is 0.10 to 0.39 of the modified-Newtonian value at M 0.05 to
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
nose drag is the gauge integral, so each point is converted, exactly (0016
section 16): with P = p_t2 / p_inf (Rayleigh) and I_g = 0.721, the unyawed
shape integral of table II at yaw 0 (the data of fig. 9's present-test
symbols), the unyawed absolute integral on p_inf is P I_g and the gauge
ratio is (R P I_g - cos L) / (P I_g - 1). Applied to table II's own
absolute ratio it returns table II's gauge ratio (a test holds it). It
lowers the unflagged ratios by 0.2% to 6.6%, the most at 59.9 deg of yaw,
where the stagnation pressure is lowest against the free stream's. (The
first conversion, through fig. 11's stagnation pressure, was approximate:
it lowered them by 0.1% to 7.1%.)

**The independence model.** On the normal component, per unit length of the
cylinder: cos^3(L) Cp_pitot(M cos L) / Cp_pitot(M), the modified-Newtonian
front side at the normal Mach number on the normal dynamic pressure,
projected. r is the measured (gauge) ratio over it:

| Source, yaw | M_n | r | Flag |
| --- | --- | --- | --- |
| present, 30.1 deg | 3.37 | 1.072 | (table II directly: 1.029) |
| present, 45.1 deg | 2.75 | 1.134 | R 2.1e3, below the domain; three-dimensional flow suspected by the report; yaw misread (below) |
| present, 60.1 deg | 1.94 | 1.277 | three-dimensional flow suspected by the report; yaw misread (below) |
| ref. 1, 14.4 deg | 6.64 | 0.997 | |
| ref. 1, 29.6 deg | 5.96 | 1.007 | |
| ref. 1, 45.2 deg | 4.83 | 1.036 | |
| ref. 1, 59.9 deg | 3.44 | 0.996 | |
| ref. 1, 75.5 deg | 1.72 | 1.287 | end effects (TN 3861 p. 10: the shock not parallel to the body at alpha 15 deg) |

**Third look at the present tests' rings (0016 section 16).** The second
reading put the 45 and 60 deg rings 0.35 and 0.32 deg lower in yaw, beyond
the combined error, and the 60 deg one 0.006 lower in the ratio. Each ring
was fitted by a circle on the deskewed scan (72 rays from a trial centre,
the mid-line of the dark run on each, rays off the median radius by 1.5 px
or crossing a line dropped, a least-squares circle, three passes; radius
14.4 to 14.6 px, centre to +-0.5 px): 29.91 deg, 0.702; 44.76 deg, 0.410;
59.83 deg, 0.165, against the second reading's 29.91, 0.702; 44.75, 0.410;
59.78, 0.164. The first reading's 45 and 60 deg points are misread (its
yaws run 0.2 to 0.4 deg high, section 14 of 0016) and set aside; r at the
third look is 1.113 and 1.195.

**At the stated yaws (0016 section 18).** The reports state each test's
yaw: the present tests 30, 45 and 60 deg (p. 10, fig. 10's legend),
reference 1's 14.3, 29.6, 45.1 and 59.8 deg (fig. 10's legend) and 75.1 deg
(TN 3861 fig. 5, alpha 14.9 deg). Fig. 12 draws its symbols below them
(0.15 to 0.25 deg on the second reading, 0.09 and 0.04 at 30 and 75 deg),
and fig. 11 draws the same tests at 60.0 and 60.04 deg, so the third looks
measured where a symbol is drawn, not the test's yaw. r is evaluated at the
stated yaw (`w34_fin_edges.py`, `A55_STATED_YAW`): the first reading 1.0685,
1.1278, 1.2633; 0.9958, 1.0073, 1.0303, 0.9869; 1.1698; the second 1.0720,
1.1287, 1.2101; 0.9950, 1.0117, 1.0335, 1.0100; 1.0130; the third looks
1.1278 and 1.2167. At 60 deg r moves 0.126 per degree of yaw.

Fig. 11 against Rayleigh's pitot formula on the normal Mach number:
present tests 1.019, 1.039, 1.104 of it at 30, 45, 60 deg; ref. 1 0.956 to
1.036 to 60 deg, 0.653 at 75 deg (the same end effect). Table II's
stagnation pressures are 1.047 and 1.075 of Rayleigh's at 30 and 45 deg.

## 4. TN 3861 (Penland): a check, not used for a number

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

**Figs. 15 to 17, first reading, and the pair (0016 section 16, review
item 1(b)).** PDF pp. 31 to 33 at 300 ppi, upright. Symbol centres by eye
on crops with a calibrated grid drawn every 0.05 to 0.1 in M_c and 0.02 to
0.05 in the coefficient, +-0.02 in M_c and +-0.01 in the coefficient
(+-0.02 where two symbols overlap: fig. 17 near M_c 1.98, Lord and Ulmann
over TN 2960). The crops' calibrations were flat, pixel to value linear
between printed grid lines and axis-aligned: fig. 15 x (M_c 0 to 7) at 545,
781, 1015, 1251.5, 1488, 1725, 1960.5, 2197.5, y 2.5 at 528 and 0 at 1720;
fig. 16 x at 780, 1009.5, 1239.5, 1468.5, 1698, 1928.5, 2159.5, 2388.5, y
0.2 at 561, 0 at 791, -0.2 at 1024, -0.4 at 1255.5; fig. 17 x at 482,
725.5, 973, 1218.5, 1464, 1708.5, 1953.5, 2198.5, y 2.75 at 408, 1.5 at
1022, 1.25 at 1146.5, 0 at 1761.

**The rotation, found at the pairing.** Paired with the blind second
reading (audit round 7, commit e45e0d6, `tn3861_figs15-16.csv`), fig. 15's
ordinates as read ran 0.012 to 0.025 high. The scans are rotated or sheared
by 0.4 to 0.8 deg (fig. 15's zero line falls from y 1713.6 at x 600 to 1693
at x 2120), which the flat calibrations ignore. Every grid line was
detected in three to six windows across each figure (a row or column more
than 60% dark over the window, its weighted centre), the value of each
line from the flat calibration rounded to the grid step, and an affine
calibration, value = a + b x + c y, fitted to them (29 to 57 points a
direction after dropping detections more than 4 px off a first fit, the
faired curves and symbols beside a line; worst residual 0.0014 to 0.009).
Each first-reading value is re-mapped through the pixel the flat
calibration put it at (`w34_fin_edges.py`, `TN3861_AS_READ` to `TN3861`;
the CSV gives both).

**The pair** (re-mapped first, second; combined error the first's +-0.02
and +-0.01 plus the reader's own): all 13 ordinates agree, the largest
difference 0.0097 (fig. 15, Lord and Ulmann near M_c 2.0, against 0.0134).
Six abscissae differ by 0.025 to 0.050, beyond the combined 0.025 to 0.027.
Where the report states the condition, the second reading is the closer:
Penland's alpha 30.2 deg is M_c 3.451 (second 3.458, first 3.424), Lord
and Ulmann's 15 deg is M_c 1.04 (p. 11; second 1.044, first 1.009), TN
2960's last is M 2.90 (second 2.896, first 2.846); the first reading's
abscissae there are misread. Lord and Ulmann's other two points have no
stated angle, and the two readings put them 0.025 and 0.027 to 0.042 apart
(each reader also places the same point differently on figs. 15 and 16);
M_c enters only through Cp_pitot(M_c), which moves by under 0.3% over 0.04
at M_c 2, so both readings are carried.

What the figures are: fig. 15 the stagnation pressure coefficient on the
crossflow dynamic pressure, fig. 16 the downstream-side pressure
coefficient, fig. 17 the drag coefficient. A crossed symbol is a yawed
cylinder reduced by crossflow theory. Below M_c 3.37 the crossed symbols are
Penland's alpha 14.9 deg point (M_c 1.76, sweep 75 deg), which TN 3861
p. 10 flags itself (the shock not parallel to the body: "an end effect"),
and Lord and Ulmann's unpublished M 4.04 points at alpha about 10, 15, 20 and
30 deg (sweeps 80, 75, 70 and 60 deg; the M_c 1.04 point is flagged high by
TN 3861 p. 11 too; the 10 deg one is on fig. 17 only). Penland's alpha 30.2
deg point is at M_c 3.45, sweep 60 deg: RM A55H31's reference-1 point at
59.9 deg, the same test. The circles and plain triangles at M_c 1.49 to 2.9
are TN 2960 (reference 8), cylinders normal to the stream.

None of the three is the front-side drag. An estimate is F = C_D + (p_down -
p_inf)/q_c, the front side if the downstream pressure held over the rear
half (fig. 17 read once). On TN 2960's own points, as replotted, F over
modified Newtonian is 1.005, 1.126, 1.069 at M_c 1.49, 1.98, 2.87 (1.006,
1.124, 1.067 on fig. 16's second reading), where TN 2960's integrated front
sides give 0.994, 1.040, 1.049: the estimate is off by up to 0.086, as large
as the allowance it would set. The crossflow points (`w34_fin_edges.py`
output; first reading / second reading of figs. 15 and 16):

| Set, M_c | Sweep, deg | F/MN | F/MN over TN 2960 integrated | Stagnation over Rayleigh | Flag |
| --- | --- | --- | --- | --- | --- |
| Lord and Ulmann, 1.98 to 2.03 | 60 to 61 | 1.121 / 1.122 | 1.078 / 1.079 (0.995 / 0.998 over TN 2960's own F at 1.98) | 1.095 / 1.086 | one point, unpublished |
| Lord and Ulmann, 1.38 to 1.41 | 70 | 1.053 / 1.048 | (below TN 2960's 1.49) | 1.067 / 1.066 | sweep beyond 60 |
| Lord and Ulmann, 1.04 | 75 | 1.445 / 1.445 | | 1.528 / 1.497 | flagged high by the report; sweep beyond 60 |
| Penland, 1.73 to 1.76 | 75 | 1.166 / 1.165 | 1.147 / 1.146 | 1.171 / 1.172 | end effect (p. 10); sweep beyond 60 |
| Penland, 3.43 to 3.46 | 60 | 1.057 / 1.055 | (beyond 2.9) | 0.988 / 0.991 | M_n above 3.37: RM A55H31 ref. 1 |

So below M_n 3.37 at a served sweep (60 deg or less, to 0.5 deg) these
figures hold one point, Lord and Ulmann's at about 60 deg and M_c about
2.0, unpublished, whose front side is an estimate good to about 0.09:
0.995 to 1.079 of the unyawed. They check the allowance and cannot set it
alone; every value at a served sweep lies inside the allowance served
(0.95 to 1.21, 0016 section 16). Below M_n 1.96 no yawed point lies at a
served sweep: the only ones (sweeps 70 and 75 deg) give 1.05 to 1.17 of
modified Newtonian, and 1.45 where the report flags the point.

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

- **TN 2960 figs. 5(a), 5(b), 5(d), 5(e):** the independent reader's
  blind second readings (audit round 6, commit 402c412), paired by
  `scripts/w34_pair_tn2960.py` (run with the round-6 readings directory
  as its argument); the comparison table, the method and what changes are
  in 0016 section 13. The second readings' front sides are held in
  `src/fins/tn2960.ts` (`TN2960_FRONT_SIDES_SECOND`).
- **RM A55H31 figs. 11, 12 and NASA CR-149372 figs. 8b, 5:** the
  independent reader's blind second readings (audit round 6, commits
  6e6d9be and fc66a2f), paired by `scripts/w34_pair_round6.py` (run with the
  round-6 readings directory as its argument), with third looks at the
  scans for the pairs that set a band and disagree (0016 section 14). Held
  in `src/fins/rm-a55h31.ts` (`RM_A55H31_FIG12_SECOND`,
  `RM_A55H31_FIG11_SECOND`) and `src/fins/macha.ts` (`MACHA_FIG8B_SECOND`,
  `MACHA_FIG5_SECOND`).
- **CR-149372 fig. 8b, M 1.2, 0 to 95 deg:** a blind re-read (audit round
  7, commit 47f32ec), paired by `scripts/w34_pair_round6.py` with the
  round-7 readings directory as its second argument: 12 of 12 points
  within the combined error over 22 to 65 deg, kappa 0.8990 against the
  first's 0.8967 (0016 section 16). Held in `src/fins/macha.ts`
  (`MACHA_FIG8B_M12_ROUND7`).
- **TN 3861 figs. 15 and 16:** a blind second reading (audit round 7,
  commit e45e0d6), paired in section 4 after re-mapping the first reading
  for the scans' rotation; held in `scripts/w34_fin_edges.py`
  (`TN3861_SECOND`). Fig. 17 is read once.
- **RM A55H31 fig. 12, the present tests' 45 and 60 deg rings:** third
  looks by a circle fit (section 3), siding with the second reading; held
  as `RM_A55H31_FIG12_THIRD_LOOK` (0016 section 16).

## 9. NASA CR-149372 (Macha): the cylinder's front side at M 1.0 to 1.2

Added for 0016 section 11 (W4(e), approved by the coordinator on
2026-10-20). Not a held-back set; no total drag in it was used.

**What the report says** (pp. 1 to 7). The Ames 2 by 2 ft transonic
tunnel, closed return, variable density, with the slotted side walls
replaced by solid ones through whose windows the models' ends were mounted;
floor and ceiling slotted. Cylinders of 1.91, 2.54, 3.81 and 5.08 cm
(solid blockage 3.1%, 4.2%, 6.2% and 8.4%), stainless steel, roughness
1.6e-4 cm; nine orifices 40 deg apart, staggered over the centre four
inches, the model rotated in 3 deg steps; transducers, digitised. M 0.6 to
1.2, Re_d 1e5 to 1e6. Blockage: no effect to M 0.6, the measured drag too
high from 0.6 to 0.9, "extreme" at M 1.0 and moderate above, where it
lowers the drag; fig. 5 shows that at M 1.0 it moves the separation and
the aft pressures. Roughness (0.005 cm spheres, fig. 12): "At Mach 1.0 and
higher the pressure distributions are unaffected." Reynolds number (fig.
11): at M 1.2, 1.2e5 and 2.5e5 give the same aft pressures. The report
states no accuracy.

**Fig. 8b** (PDF p. 26, 300 ppi; tilt 0.035 deg from the -0.8 grid line,
under a pixel over the plot, not corrected). Cp against theta, M 1.0, 1.1
and 1.2 on the 1.91 cm cylinder at Re_d 1.9e5. Calibration: the grid
lines' own positions, which are unevenly spaced on the scan (221.5 to 229
px per 30 deg, 292 to 298.5 px per 0.4), piecewise linear between them:
x 825.5, 1049.0, 1278.0, 1499.5, 1718.5, 1939.0, 2166.5 px at 0 to 180
deg; y 892, 1190.5, 1482.5, 1775, 2072.5, 2366, 2661.5, 2953.5 px at Cp
1.6 to -1.2 (`w34_grid.py`). Method: symbol centres by eye on 2x ruler
crops with lines every 2 deg and 0.02 placed between the grid lines
(`w34_pwruler.py`), +-0.003 in Cp and +-0.3 deg; the faired curves by
column scans every 1.5 deg (`w34_pwscan.py`: the dark run nearest a guess
interpolated from the symbols, within 0.035, in each column within +-0.3
deg, the median), kept where at least 2 deg from a symbol (3 deg from the
triangles, which are wider), +-0.005. The stagnation symbols are drawn up
to 1 deg left of the 0 deg line; read as 0 deg.

| M | Cp at 0 deg | Rayleigh | Front side on D | kappa = front / ((2/3) Cp_pitot) | Symbols alone |
| --- | --- | --- | --- | --- | --- |
| 1.0 | 1.283 | 1.2756 (+0.6%) | 0.6483 | **0.762** | 0.772 |
| 1.1 | 1.329 | 1.3375 (-0.6%) | 0.7406 | **0.831** | 0.837 |
| 1.2 | 1.387 | 1.3963 (-0.7%) | 0.8347 | **0.897** | 0.907 |

The front side is the trapezoid rule over symbols and curve together, 0
to 90 deg, interpolated at 90 deg. The symbols alone, 6 to 12 deg apart,
read 0.8% to 1.3% higher: the curve is concave between them where the
flow expands, so they are not used alone. Kappa rises with M at every pair
of nodes and onward to TN 2960's 0.994 to 1.002 at 1.49, 1.035 to 1.056 at
1.98 and 1.049 to 1.056 at 2.90 (section 2; 0010).

**Fig. 5** (PDF p. 22, 300 ppi). Cp against theta at M 1.0 on all four
cylinders (Re_d 2.8e5 on the 1.91 cm, 3.3e5 on the others); the plot
starts at Cp 0.4, about 44 deg. Calibration as fig. 8b, from its own grid
lines: x 900.0, 1121.0, 1343.0, 1566.0, 1785.5, 2004.5, 2228.0 px at 0 to
180 deg; y 1462.5, 1761.5, 2053, 2348 px at Cp 0.4 to -0.8. Legend: circle
1.91 cm, square 2.54, octagonal circle 3.81, triangle 5.08. The four share
one faired curve to about 78 deg (column scans, and the symbols on it by
eye, +-0.01 and +-0.5 deg); there they part, the 5.08 cm levelling at about
-0.65 from 81 deg, the 3.81 cm at about -0.78 to -0.82 from 82 deg, the
1.91 and 2.54 cm continuing to -1.0 at 90 deg (column scans).

Each cylinder's front side, fig. 8b's M 1.0 points below 44 deg and fig.
5's from there, against fig. 8b's own (0.6483):

| Fig. 5 | Front side on D | Against fig. 8b |
| --- | --- | --- |
| 1.91 and 2.54 cm (one curve) | 0.6447 | -0.56% |
| 3.81 cm | 0.6456 | -0.43% |
| 5.08 cm | 0.6476 | -0.12% |

Fig. 5's shared curve lies 0.01 to 0.03 below fig. 8b's between 45 and 62
deg (another run of the same 1.91 cm model at Re_d 2.8e5 against 1.9e5),
and the larger blockages raise the last 10 deg a little; together, -0.56%
to 0% of the front side. Fig. 5 is clipped above Cp 0.4, so its
stagnation region is not seen; fig. 8b's stagnation values agree with
Rayleigh's to 0.7%.

**The nodes** (0016 section 11): kappa at each Mach number, its range the
reading's widened by a 1% reading error (the calibration's +-1 px, 0.13
deg and 0.0014 in Cp, moves the front side by 0.5% and 0.2%; the scans'
scatter averages out; rounded up) and by fig. 5's spread, applied at all
three (the report says blockage effects lessen above M 1.0):

| M | kappa | Range |
| --- | --- | --- |
| 1.0 | 0.7624 | 0.7506 to 0.7700 |
| 1.1 | 0.8306 | 0.8177 to 0.8389 |
| 1.2 | 0.8967 | 0.8828 to 0.9057 |
| 1.49 | 1 (the term above) | 0.99 to 1.06 (TN 2960's band) |

Second readings: figs. 8b and 5 were read blind in round 6 and fig. 8b's
M 1.2 curve again in round 7 (section 8); the nodes now take the mean of
the readings (0016 sections 14 and 16), and no label says "read once".
