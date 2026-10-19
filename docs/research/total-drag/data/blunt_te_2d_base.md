# Two-dimensional base pressure of blunt trailing edges, Mach 1.5 to 3

Transcriptions for 0008 step B1 (the fins' trailing-edge base, 0010 section
1.5). **First readings; every figure's second reading is pending.** The
Basic Finner's drag was not used for anything here: it stays the hold-out.
Scripts are in `scripts/`, outputs in `data/`. The values, converted, are in
`blunt_te_2d_base.csv` and `blunt_te_2d_output.txt` (from `blunt_te_2d.py`).

P_B = (p_b - p_inf)/q_inf = (p_b/p_inf - 1) 2/(gamma M^2), with gamma 1.4.
"Base drag over curve" is a ratio of -P_B, which is the convention of 0008
section 3.

## 1. Sources opened

| Source | What it gives | Status |
| --- | --- | --- |
| NACA TR 1109, Chapman, Wimbrow and Kester 1952 (NTRS 19930090968) | Measured base pressure on 29 blunt-trailing-edge wings at M 1.25, 1.5, 2.0 and 3.1, turbulent and laminar, with correlations against boundary-layer thickness | Opened. Text pp. 1, 7, 8, 16 (PDF pp. 4, 10, 11, 19). Figs. 7, 8, 9 (PDF p. 11) and fig. 29 (PDF p. 19) read |
| NACA RM A51J25 (part), Chapman 1951, "Base pressure on wings and bodies with turbulent boundary layers" (NTRS 20030067332) | Airfoil base pressure against the local Mach number from five facilities, free flight included, with thin turbulent layers | Opened. Text pp. 13 to 17 (PDF pp. 1 to 5) read; fig. 7 (PDF p. 14) read |
| NACA TN 3819, Love 1957 (NTRS 19930084517) | Fig. 5: two-dimensional base pressures, which are Chapman's and ref. 25's compilations and Love's two estimates | Opened. Text pp. 5 to 7 read; fig. 5 (PDF p. 36) read |
| NASA TN D-1056, Saltzman 1961, X-15 base pressures (NTRS 19980227195) | Flight base pressure on the upper movable vertical fin, a 10 deg single wedge with a blunt trailing edge, at M 1.1 to 3.2 | Opened. Text pp. 1 to 10 read; table II (PDF p. 15) typed from the page image; figs. 5 and 6(a) (PDF pp. 20, 21) viewed |
| NACA RM L52D21, Goin 1952 (blunt-trailing-edge wings at M 1.41, 1.62, 1.96; TN 3819 ref. 25) | Plan form, sweep and section effects | **Not opened**: known only through RM A51J25 p. 17 and TN D-1056 p. 9 |
| Hoerner, _Fluid-Dynamic Drag_ (1958), ch. XVI; Korst 1956 (J. Appl. Mech. 23) | The compilation and the theory that TN D-1056 compares against | **Not opened** |

## 2. TR 1109: the primary measurements

**Models and conditions** (pp. 1, 2 and 7):

- 55 steel wings with a rectangular plan form, 9 in span and 3 in chord
  (aspect ratio 3.0). Data are given for 29 of them.
- Thickness ratio 0.05 to 0.10; boattail angle -2.9 to 20 deg;
  trailing-edge thickness over airfoil thickness, h/t, 0.2 to 1.0.
- Ames 1 by 3 ft supersonic tunnels No. 1 and 2, at M 1.25, 1.5, 2.0 and
  3.1. Reynolds number 0.2e6 to 3.5e6 on the chord. The wings were mounted on
  a sting or on a 0.75 in support body ahead of them.
- The orifice was placed at the centre of the exposed semispan (p. 7).
- Turbulent data use a 0.005 in wire trip. Laminar data come from the smooth
  wings.

**Statements** (summary, p. 1):

- For turbulent flow there were "only small effects on base pressure of
  variations in Reynolds number, airfoil profile shape, boattail angle, and
  angle of attack. The principal variable ... was the Mach number." At
  M 3.1 the ratio of boundary-layer thickness to trailing-edge thickness
  "also affected the base pressure significantly."
- With laminar flow, "the effect of Reynolds number on base pressure was
  large."
- The turbulent correlation parameter c/[h Re^(1/5)] "is approximately
  proportional to the ratio of turbulent boundary-layer thickness to
  trailing-edge thickness" (p. 7).
- Fig. 29(a) "represents average values for the two orifice positions
  tested". The laminar curves at M 3.1 "may be partially in the transition
  region", so their base pressure "may be a little too low" (p. 16).

**Fig. 29(a), turbulent faired curves** (`tr1109_fig29.py`,
`tr1109_fig29_runs_output.txt`):

- Grid lines were fitted from darkness profiles.
- Each curve is read in the column 8 px right of each abscissa.
- Assignment comes from the printed labels, checked on
  `img/tr1109/f29a_zoom.png`.

| c/[h Re^(1/5)] | M 1.5: p_b/p_inf | P_B | M 2.0: p_b/p_inf | P_B | M 3.1: p_b/p_inf | P_B |
| --- | --- | --- | --- | --- | --- | --- |
| 0.50 | 0.492 | -0.3225 | 0.358 | -0.2293 | (line starts) | |
| 0.75 | 0.492 | -0.3225 | 0.362 | -0.2279 | 0.209 | -0.1176 |
| 1.00 | 0.494 | -0.3213 | 0.367 | -0.2261 | 0.223 | -0.1155 |
| 1.50 | 0.498 | -0.3187 | 0.379 | -0.2218 | 0.255 | -0.1107 |
| 2.00 | 0.503 | -0.3156 | 0.391 | -0.2175 | 0.286 | -0.1061 |
| 2.50 | 0.508 | -0.3124 | (on a grid line) | | 0.317 | -0.1015 |
| 3.00 | 0.515 | -0.3079 | 0.416 | -0.2086 | 0.347 | -0.0971 |
| 3.50 | 0.528 | -0.2997 | 0.430 | -0.2036 | 0.380 | -0.0922 |
| 4.00 | 0.539 | -0.2927 | 0.442 | -0.1993 | 0.411 | -0.0876 |
| 4.50 | 0.552 | -0.2844 | 0.454 | -0.1950 | 0.441 | -0.0831 |

Across the range of the abscissa, the base drag falls by 12% at M 1.5, by
15% at M 2.0 and by 29% at M 3.1 (computed).

**Fig. 29(b), laminar faired curves** (`tr1109_fig29b_cols.py`,
`tr1109_fig29b_cols_output.txt`):

- Runs in dense columns were linked by continuity.
- M 1.5 and M 2.0 cross near 0.016 to 0.022, and they merge in one run at
  0.048 to 0.07.
- M 3.1 ends near 0.065.

| c/[h Re^(1/2)] | M 1.5 | M 2.0 | M 3.1 |
| --- | --- | --- | --- |
| 0.010 | 0.358 | 0.442 | 0.253 |
| 0.014 | 0.460 | 0.490 | 0.307 |
| 0.026 | 0.636 | 0.615 | 0.437 |
| 0.030 | 0.664 | 0.644 | 0.474 |
| 0.038 | 0.706 | 0.693 | 0.539 |
| 0.050 | 0.740 (merged) | 0.740 (merged) | 0.628 |
| 0.062 | | | 0.709 |
| 0.075 | 0.792 | 0.782 | |
| 0.104 | 0.822 | (on a grid line) | |
| 0.124 | 0.834 | 0.807 | |
| 0.150 | 0.844 | 0.816 | |
| 0.175 | 0.847 | 0.818 | |

(The values are p_b/p_inf. Further rows and P_B are in the csv and the
output.)

**Fig. 8, scatter of the turbulent data** (12 wings; M 1.5 and 2.0 at
Re 1.7e6 in tunnel No. 1, M 3.1 at 2.6e6 in tunnel No. 2):

- Symbol centres and the faired curve were read by eye on ruler zooms
  (`tr1109_fig8_zoom.py`; `img/tr1109/f8a_z1.png`, `f8b_z1.png`,
  `f8b_z2.png`, `f8c_z1.png`).
- Legend (`img/tr1109/f8_legend.png`): t/c 10%, 7.5% and 5% (5% filled),
  and h/t 0.25, 0.50, 0.75 and 1.00 by symbol shape.

| M | Symbols | Delta p_b/p_inf about the curve | Base drag over curve |
| --- | --- | --- | --- |
| 1.5 | 12 | -0.023 to +0.016 | 0.969 to 1.045 |
| 2.0 | 12 | -0.050 to +0.019 | 0.970 to 1.082 |
| 3.1 | 9 | -0.013 to +0.018 | 0.977 to 1.017 |

At M 2.0 the low points are the 5% thick wings (filled triangle at 1.15,
filled squares at 2.25).

Fig. 8's curves are not quite fig. 29(a)'s, because fig. 29(a) averages two
orifice positions. Base drag of fig. 29(a) over fig. 8 is 0.933 to 1.010
(computed at six abscissae). The largest gap is at M 1.5 near 4.5.

**Fig. 7, spanwise variation**, read by eye at M 1.5 (Re 1.5e6) and M 2.0
(Re 1.7e6), wings 10-0.25 and 10-1.00:

- **Near the tip.** Within about 0.1 of the exposed semispan from the tip,
  p_b/p_inf runs from 1.15 or 0.90 at the tip down to 0.37 (M 1.5), and from
  0.97 or 0.77 down to 0.21 (M 2.0). The text gives "a large variation ...
  in the vicinity of the tip", attributed to two tip vortices.
- **Inboard of 0.25 semispan.** Within about +-0.05 of the midspan value,
  rising toward the root on 10-0.25.
- The text: for these wings "the average pressure acting over the base is
  closely approximated by the pressure at the midspan", but "spanwise
  variation of base pressure for low-aspect-ratio wings would preclude an
  accurate estimate of the base drag from measurements ... at one spanwise
  station" (p. 7).

**Fig. 9 and text, tunnels and trips** (p. 8). The correlation curves from
tests "with a trip at Re = 1.7 x 10^6 also apply at least up to the highest
Reynolds numbers of the present test" (3.0e6 at M 1.5, 3.5e6 at M 2.0). At
M 2.0 the curve "applies with fair accuracy to the data obtained without a
trip at a Reynolds number of 3.5 x 10^6". Not digitised.

## 3. RM A51J25 fig. 7: five facilities against one curve

Fig. 7 (PDF p. 14) plots p_b/p' against M'. These are the inviscid
pressure and Mach number just ahead of the base, so M' = M_inf for
flat-sided sections. Its legend:

| Data source | Planform |
| --- | --- |
| Langley PARD free flight (filled) | rectangular, AR 2.7 |
| Ames 1 by 3 ft, three profiles | rectangular, AR 3 |
| Langley 9 by 12 in | rectangular, AR 2.7, and delta, AR 4 (tagged) |
| Langley 9 in | two-dimensional |
| NPL | two-dimensional half-model |

Statements:

- "the values shown represent an average over the span of the trailing
  edge" (p. 16).
- "All these data for airfoils were obtained with the trailing edge normal
  to the stream direction"; the base pressure for the two plan forms "is
  nearly the same" (p. 16).
- A constant-chord wing with the trailing edge swept 45 deg (Langley,
  unpublished) gave base pressures "nearly the same as for unswept wings at
  1.62 Mach number, but ... about 20- to 50-percent higher at Mach numbers
  of 1.41 and 1.96" (p. 17).
- All data are for a turbulent layer "thin relative to the base dimension";
  a thick layer gives "somewhat higher" base pressure. Base pressure also
  rises with surface temperature (Kurzweg, cited p. 17).

**Reading** (`a51j25_fig7.py`):

- Calibration is by the axis ticks (residuals under 1 px).
- The mean curve comes from column runs where they are clean
  (`a51j25_fig7_curve_output.txt`). Elsewhere it was read by eye on the
  ruler zoom `img/n2003/f7_ruler.png`, which is also where the symbols were
  read.

| M' | 1.17 | 1.29 | 1.40 | 1.50 | 1.60 | 1.70 | 1.83 | 2.00 | 2.10 | 2.25 | 2.50 | 2.75 | 2.90 | 3.00 | 3.10 | 3.25 | 3.50 | 4.00 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| p_b/p' | 0.588 | 0.545 | 0.517 | 0.474 | 0.446 | 0.420 | 0.399 | 0.359 | 0.337 | 0.311 | 0.275 | 0.249 | 0.236 | 0.228 | 0.220 | 0.214 | 0.206 | 0.199 |

**Symbols about the curve** (by eye, 16 symbols plus the PARD cluster):

- The Langley PARD free-flight points (M' 1.17 to 1.55) lie on the curve
  within about +-0.01.
- At M' 1.23 to 1.40, the Langley 9 by 12 in symbols lie 0.053 to 0.069
  below the curve, which is 11% to 16% more base drag.
- At M' 1.45 to 3.2, eleven symbols give base drag over curve
  **0.961 to 1.067**.
- The Langley 9 in two-dimensional points at M' 4.0 lie -0.008 to +0.023
  about the curve.
- One isolated mark at M' 1.70, p_b/p' 0.27, is smaller than the symbols
  and is taken as a speck. That identification is uncertain.

## 4. TN 3819 fig. 5

Fig. 5 (PDF p. 36; legend on `img/love2d/p36_fig.png`) shows six curves.
Two are the limits: vacuum, and the limiting nonviscous curve. Two are the
"experimental compilations", Chapman's (dash-dot) and ref. 25's (hatched).
Two are Love's "present estimates", from P_r (solid) and from P_r + 0.06
(dashed). The text (p. 6) says the estimate from P_r is "slightly higher
than experiment" in base pressure.

**Reading** (`love5_cal.py`, `love5_cols.py`,
`love_fig5_cols_output.txt`):

- Single-column runs were linked by continuity across columns 0.01 apart in
  M.
- They were checked on the ruler zooms `img/love2d/z15.png`, `z20.png`,
  `z25.png` and `z30.png`.
- In the data region there are three lines:
  - **A**: continuous, carrying the hatch ticks;
  - **B**: dashed, 0.003 to 0.009 less negative than A;
  - **solid**: the least negative.

| M | A | B (dashed) | Solid (Love, from P_r) |
| --- | --- | --- | --- |
| 1.5 | -0.340 | -0.335 | -0.307 |
| 2.0 | -0.229 | -0.226 | -0.208 |
| 2.5 | -0.164 | -0.156 | -0.148 |
| 3.0 | -0.121 | -0.112 | -0.107 |

Line A is Chapman's compilation. It is RM A51J25 fig. 7's curve at M' = M
within 0.987 to 1.018 (computed at the four Mach numbers). The hatch of ref.
25 lies on A and between A and B, and B matches the legend's dashed style
(from P_r + 0.06). That identification of B is by line style only. Love's
solid estimate gives 8% to 13% less base drag than line A.

**This revises the first visual assignment** made before this note: the
solid line at M 1.5 is -0.307, not -0.324. The earlier value was a hatch
tick at M 1.52.

The two compilations are not independent of TR 1109. Chapman's includes
the Ames 1 by 3 ft data (RM A51J25 fig. 7's legend), and ref. 25's sources
were not opened.

## 5. TN D-1056: the X-15 upper movable vertical fin in flight

**Geometry and conditions** (table I, p. 5, text p. 6):

- The fin is a "10 deg single wedge" with a blunt trailing edge.
- Mean chord 8.46 ft, mean trailing-edge thickness 1.55 ft, so c/h 5.5 and
  b/2h 3.2; base area 4.7 sq ft. The leading edge is swept 30 deg.
- Two flights, A and B, at M 1.1 to 3.2 and 39,000 to 80,000 ft; Reynolds
  number 0.8e6 to 2.6e6 per ft, 6.8e6 to 22.0e6 on the fin's chord.
- Turbulent. "less than 1 foot of laminar flow" at midsemispan near M 3
  (p. 7).
- Accuracy (p. 6): "The maximum error in base pressure coefficient is
  considered to be within +-0.02"; Mach number +-0.02 at M 1 to 2 and +-0.03
  at 2 to 3.
- Cp = (p_b - p)/q, on free-stream conditions (symbols, p. 3).

**Orifices** (fig. 5, PDF p. 20):

- Orifices 1, 2 and 3 are on the upper movable fin, and 4 on the fixed part
  inboard. Flight A recorded orifice 2 only; flight B recorded 1, 2 and 3.
- The mean is checked against fig. 6(a): flight A at M 1.15 gives -0.443;
  flight B at M 1.09 gives a mean of -0.406. Fig. 6(a) reads -0.44 and
  -0.41 by eye.
- Speed-brake rows (delta_j 35 deg) are excluded: the report says extended
  brakes make the fin's coefficient more negative (p. 7).

**Power-off rows, typed from table II:**

| Flight | Time, s | M | Re per ft x 1e-6 | alpha, deg | Cp1 | Cp2 | Cp3 | Mean |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A | 366.0 | 3.24 | 1.93 | 4.1 | | -0.120 | | -0.120 |
| A | 369.0 | 3.16 | 2.02 | 7.2 | | -0.127 | | -0.127 |
| A | 371.0 | 3.11 | 2.05 | 10.5 | | -0.134 | | -0.134 |
| A | 380.5 | 2.80 | 1.99 | 3.5 | | -0.150 | | -0.150 |
| A | 401.5 | 2.45 | 1.96 | 10.0 | | -0.173 | | -0.173 |
| A | 409.5 | 2.15 | 1.63 | 7.1 | | -0.201 | | -0.201 |
| A | 435.5 | 1.80 | 1.66 | 4.8 | | -0.247 | | -0.247 |
| A | 435.9 | 1.80 | 1.66 | 3.1 | | -0.251 | | -0.251 |
| A | 436.2 | 1.79 | 1.66 | 1.2 | | -0.249 | | -0.249 |
| A | 456.5 | 1.68 | 2.36 | 2.0 | | -0.289 | | -0.289 |
| A | 465.0 | 1.52 | 2.51 | 3.3 | | -0.307 | | -0.307 |
| A | 474.0 | 1.35 | 2.63 | 5.4 | | -0.324 | | -0.324 |
| A | 479.6 | 1.23 | 2.58 | 7.8 | | -0.406 | | -0.406 |
| A | 483.0 | 1.15 | 2.53 | 8.5 | | -0.443 | | -0.443 |
| B | 404.0 | 3.17 | 1.10 | 8.7 | -0.136 | -0.129 | -0.136 | -0.134 |
| B | 418.5 | 2.95 | 1.10 | 2.2 | -0.156 | -0.149 | -0.138 | -0.148 |
| B | 441.0 | 2.66 | 1.25 | 3.0 | -0.183 | -0.169 | -0.170 | -0.174 |
| B | 448.0 | 2.56 | 1.25 | 1.1 | -0.190 | -0.179 | -0.166 | -0.178 |
| B | 467.2 | 2.30 | 1.52 | 8.3 | -0.191 | -0.189 | -0.187 | -0.189 |
| B | 483.0 | 1.97 | 1.49 | 4.4 | -0.248 | -0.228 | -0.253 | -0.243 |
| B | 508.0 | 1.52 | 1.60 | 5.2 | -0.347 | -0.322 | -0.353 | -0.341 |
| B | 522.4 | 1.31 | 1.74 | 8.5 | -0.333 | -0.378 | -0.396 | -0.369 |
| B | 533.0 | 1.09 | 1.58 | 10.2 | -0.353 | -0.437 | -0.429 | -0.406 |

**Statements:**

- The fin data are "in general agreement with all of the two-dimensional
  comparison data, although some divergence is apparent at Mach numbers
  above 2.5" (fig. 14, p. 9). That divergence "may be related to a shock
  environment originating upstream of the entire fin".
- The leading-edge sweep "was not an important factor". Free-stream Mach
  number, or its component normal to the trailing edge, correlates better
  than the component normal to the leading edge (p. 9).

**Computed** (`blunt_te_2d.py`, section F), base drag measured over
modelled, M 1.52 to 3.24, 19 points:

- **Flat-sided (M' = M).** Against RM A51J25's curve at the free-stream
  Mach number, p_b/p_inf = (p_b/p')(M), the ratio is **0.934 to 1.201**.
  It is 0.934 to 1.04 below M 2.5 and 1.09 to 1.20 above.
- **Chapman's local-condition use.** Taking p' and M' behind the 5 deg face
  shock (oblique shock, computed), the ratio is 1.27 to 1.72. So on this
  fin, in this airplane's flow field, the curve used at the free-stream Mach
  number fits and the local-condition use does not. That result is from one
  fin and is not explained.
- The stated Cp error, +-0.02, is 6% to 17% of |Cp| over these points.

## 6. The band each source would support

These ratios are of the base drag of a turbulent, unswept blunt trailing
edge, measured over a model that uses the thin-layer two-dimensional curve
(Chapman's, RM A51J25 fig. 7 or TN 3819 fig. 5 line A) or TR 1109 fig. 29(a)
at the free-stream Mach number.

| Source | Supports | Limits |
| --- | --- | --- |
| TR 1109 fig. 8 (one facility, 12 wings, 33 symbols) | 0.969 to 1.082 about its own faired curves at M 1.5, 2.0, 3.1; fig. 29(a) against fig. 8 adds 0.933 to 1.010 (orifice position) | AR 3, midspan orifice, wings on a support body; turbulent by trip; c/[h Re^(1/5)] 0.5 to 4.5 |
| RM A51J25 fig. 7 (five facilities, free flight included) | 0.961 to 1.067 at M' 1.45 to 3.2; 1.11 to 1.16 at M' 1.23 to 1.40 (Langley 9 by 12 in), below the range | Thin layers only; span-averaged; unswept trailing edges |
| TN 3819 fig. 5 | No band: line A reproduces Chapman's curve (a reading check); Love's solid estimate lies 8% to 13% low in base drag | Compilations, not independent of TR 1109 |
| TN D-1056, X-15 fin in flight | 0.934 to 1.201 at M 1.52 to 3.24 (flat-sided use) | One fin in an airplane's flow field; Cp +-0.02 (6% to 17%); c/[h Re^(1/5)] about 0.2, below TR 1109's range |
| Together | About **0.93 to 1.20** on the term at M 1.5 to 3.2 (0.93 to 1.08 below M 2.5), as estimation on all of these sets, none left to gate it | Every condition below |

What none of them covers (each a refusal or a separate band, not a widening):

- **A trailing edge in the body's base plane.** On fins whose blunt edge ends
  at the body base, the edge's wake and the body's base flow interact, and
  no opened source measures that. TR 1109's and RM A51J25's wings have free
  trailing edges. Where the X-15 fin's base lies relative to the fuselage
  base is shown in TN D-1056 fig. 4, which was not read.
- **Fin aspect ratio and tip region.** TR 1109 fig. 7 shows the tip's large
  variation and the text warns about low aspect ratio. The span averages of
  RM A51J25 cover AR 2.7 to 4. Only the X-15 fin, with b/2h 3.2, lies at a
  low ratio.
- **Laminar or transitional layers at the trailing edge.** Here base
  pressure depends strongly on Reynolds number. At c/h 12.5 and Re_c 1.2e6
  to 2.0e6, laminar against turbulent base drag is 1.26 at M 1.5, 0.87 at
  2.0 and 0.94 at 3.1, from fig. 29 (`blunt_te_2d.py` G). That is a
  transition input of -13% to +26% on the term, not model error.
- **Swept trailing edges.** Base pressure is 20% to 50% higher at M 1.41 and
  1.96 (RM A51J25 p. 17).
- **Thick boundary layers.** A thick layer relative to h needs fig. 29(a)'s
  parameter (12% to 29% less base drag across 0.5 to 4.5).

Where a fin of c/h 12.5 at Re_c 1.19e6 to 1.98e6 sits on these correlations
(`blunt_te_2d.py` G):

- c/[h Re^(1/5)] is 0.69 to 0.76, inside TR 1109's turbulent range.
- c/[h Re^(1/2)] is 0.0089 to 0.0115, at the low end of the laminar range.
- These are geometry and Reynolds number only, the Basic Finner's as 0010
  sections 4.1 and 4.3 state them; no drag data were used.

## 7. Second readings (round 4)

Every item this note lists was read a second time by an independent reader
(`../audit/round4/audit_round4.md`, readings in `../audit/round4/readings/`):
TR 1109 figs. 29(a) and (b) and 8, RM A51J25 fig. 7, TN 3819 fig. 5 and TN
D-1056 table II (retyped in full). This note's first readings are kept as
read. What the second readings change (0010 section 8.3, and
`src/base/blunt-te-2d.ts`, which holds both):

- the fig. 8 point at M 3.1, X 2.0, 0.275 does not exist (a filled square
  at 0.291 and a circle at 0.300, both above the curve); it set no band end;
- the first reading of fig. 8's M 3.1 panel is about 0.007 low, symbols and
  curve alike, so the band hardly moves;
- two RM A51J25 fig. 7 symbol abscissas were read low: the diamond near M'
  1.95 is at 1.961, the Ames square at 1.492; the curve below M' 1.50 lies
  under the PARD symbols and cannot be checked;
- the X-15 set of section 5 has 18 power-off rows at M 1.52 to 3.24, not 19;
- section 6's band: the envelope of both readings is 0.933 to 1.204, and
  the band adopted is **0.93 to 1.21**, rounded outward (0.94 to 1.07 below
  M 2.5 on the second reading);
- TR 1109 fig. 29(a) at M 3.1 lies within 4.0% of its lowest-abscissa
  value up to X 1.0 when read from X 0.45, where its curves start (1.8%
  from X 0.75 on the first reading).
