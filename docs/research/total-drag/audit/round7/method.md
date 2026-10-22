# Round 7 blind figure readings: method note

Reader: a single blind reading, made without opening any earlier reading of
these figures. Everything below was measured on the scans; nothing was taken
from another source.

## Sources and rendering

| Report | File used | SHA-256 of the copy read | Page |
|---|---|---|---|
| NACA TN 3819 (Love 1957), NTRS 19930084517 | `19930084517.pdf` | `9acd67dc393b26162f773602f477be6e9bf3b5e2823edb18df105a1159c9ce55` | fig. 18, PDF p. 49 (report p. 47) |
| NACA RM L52J21a, NTRS 19930087533 | `19930087533.pdf` | `9392252bc0b9c2c60c178aa4bbb56616a247f1366890660f3eadaef960e25550` | figs. 31, 32, 33 on PDF pp. 58, 59, 60 (report pp. 57, 58, 59) |

Each PDF was copied into its own empty scratch directory and the pages were
rendered with `pdftoppm -r 600` (TN 3819 in colour, RM L52J21a with `-gray`).
The embedded scans are 300 dpi: a JPEG for TN 3819 p. 49, CCITT bilevel
images for the RM pages, so the 600 dpi renders resample them by two. All
pixel positions quoted here and in the scripts are pixels of those 600 dpi
renders. Python 3 with Pillow and NumPy, run with `python3 -I -B` under
`nice -n 19`.

## Axis calibration (both reports)

`scripts/localgrid.py`, driven by `scripts/tn3819_calib.py` and
`scripts/rm_calib.py`.

1. Every gridline is followed from a seed found on a darkness projection
   (`scripts/probe.py`, `scripts/rm_probe.py`) and sampled every 16 to 20 px
   along its length: in each strip the darkness profile across the line is
   taken and the darkness-weighted centroid of its peak is the line position.
   Label boxes, the legend and the NACA logo are excluded.
2. Each intersection of a vertical and a horizontal gridline is found from
   straight-line fits to each line's samples within +-150 to +-200 px of the
   crossing (the crossing itself excluded, iterative rejection of samples off
   by more than 1.2 px or 3 sigma). The window grows to 2 or 3 times where
   lettering hides a line.
3. A pixel is converted to data by inverse bilinear interpolation inside the
   grid cell that contains it, from that cell's four measured corners. This
   absorbs rotation, skew, bow and uneven cell size cell by cell.

Quality, reported per figure (`scripts/calib_report.py`):

* straight-line fit of each whole gridline (rms of samples);
* a single affine map, and a single projective map, through all measured
  intersections (shows how far the sheet is from a perfect grid);
* leave-one-out: each interior intersection predicted as the mean of its four
  neighbours (this bounds the interpolation error inside a cell).

| Figure | Intersections measured | Line fits rms (px) | Affine residual, x axis | Affine residual, P_B | Leave-one-out rms (max), px |
|---|---|---|---|---|---|
| TN 3819 fig. 18, whole plot (M 1.0 to 8.6, P_B 0 to -0.50) | 962 of 1014 | vertical 0.5 to 0.7; horizontal 0.7 to 1.3 (quadratic 0.6 to 0.7) | M rms 0.0037, max 0.0129 | rms 0.00021, max 0.00070 | x 0.52 (3.19), y 0.41 (1.82) |
| TN 3819 fig. 18, reading window (M 1.0 to 3.2, P_B -0.26 to -0.08) | 116 of 120 | as above | M rms 0.0021, max 0.0049 | rms 0.00013, max 0.00034 | x 0.42 (0.94), y 0.47 (1.75) |
| RM L52J21a fig. 31(d) | 130 of 132 | 0.24 to 0.44 | R rms 0.0053e6, max 0.0125e6 | rms 0.00007, max 0.00018 | x 0.40 (1.03), y 0.36 (0.69) |
| RM L52J21a fig. 32(d) | 141 of 144 | 0.30 to 0.76 | R rms 0.0074e6, max 0.0179e6 | rms 0.00011, max 0.00030 | x 0.47 (1.10), y 0.35 (0.67) |
| RM L52J21a fig. 33(d) | 131 of 132 | 0.23 to 0.79 | R rms 0.0068e6, max 0.0182e6 | rms 0.00009, max 0.00032 | x 0.48 (1.43), y 0.45 (2.34) |

Geometry seen: on TN 3819 p. 49 the horizontal gridlines slope -0.0029
(-0.17 deg) and bow by up to +-2 px over the plot width, the same shape on
every line (a scan distortion); the vertical gridlines lean by dx/dy = +0.011
at M = 1 falling to +0.005 at M = 8.6, so the axes are 89.66 deg apart in the
reading window (0.34 deg skew). Scale there: 598 px per unit M, 5999 px per
unit P_B (120 px per 0.02). On the RM pages the sheets are rotated by about
0.9 deg (fig. 31), 0.65 deg (fig. 32) and 0.6 deg (fig. 33), with a small
skew; scales are 133 to 137 px per 1e6 in R and 133 to 137 px per 0.02 in
P_B. The full calibrations (every intersection) are in
`readings/*_calib.json`.

## TN 3819 fig. 18

### Which line is which

* Two near-coincident solid compiled curves leave the M = 1.0 border at
  P_B -0.190 and -0.185 and stay 16 to 37 px apart (never crossing) up to
  M 2.4; they come within 8 px by M 2.9 and the upper one joins the lower one
  between M 2.97 and 3.0. Call them U (upper, more negative) and L (lower).
* Two labelled leaders end on them between M 2.23 and 2.35 (overlay
  `overlays/tn3819_f18_leaders.png`). Both arrowheads are drawn the same way:
  two barbs meet on the shaft and the shaft then runs on about 15 to 17 px
  to its point. The leader from the box "Basic curve of present analysis
  based upon wake measurements" has its barbs meeting below both curves at
  (1603, 2878) and its point on L at (1609, 2863). The leader from "Compilation
  by Chapman" has its barbs meeting on L at (1541, 2826) and its point
  continuing across L to touch U at (1549, 2811); it ends on U and nowhere
  else. So U = Chapman's compilation and L = Love's basic curve; the basic
  curve is the less negative one. Identity is carried to the other Mach
  numbers by following each line continuously (no crossing between M 1.0 and
  the merge at M 3.0).
* The free-flight curve F: the legend's first entry is a long-dash
  short-dash long-dash sample, "Free flight, Langley, R = 30 to 35 x 10^6".
  The only line of that style is the oscillating line at M 1.0 to 1.28 near
  P_B -0.19 to -0.21, which the "Free-flight data" label's leader touches at
  M 1.09. Its dashes and short dashes are visible on the descent to M 1.0 and
  on the falling and rising flanks.
* Not read: the Gabeaud curve (solid, with a dashed extension beyond M 3),
  the "Limiting base pressure (vacuum)" dashed curve, and the data symbols.

### Tracking

U and L (`scripts/tn3819_track.py`): measured in every pixel column. Anchor
points read by eye from zoomed crops and ink-peak lists (`scripts/peaks.py`,
`scripts/pixmap.py`) give a first prediction; in each column the ink peak
nearest the prediction (within 4 px) is centroided after the horizontal
gridlines have been subtracted (median gridline profile from the
neighbouring 300 px of the same gridline); the prediction is then replaced by
a running fit and the columns are measured again (three passes). Columns
within 5 px of a vertical gridline are skipped. Points within 4.5 px of a
horizontal gridline, under or touching a symbol or leader, or within 7 px of
the other compiled curve are flagged and left out of value fits (drawn
hollow on the overlays).

F: followed with a ridge follower (`scripts/ridge.py`) that walks along the
ink in 1 px steps, centroiding across the line direction, so its steep parts
are measured correctly; it coasts through dashes and masked gridlines.
Seeds: its first peak and its last hump.

### Reading

`scripts/tn3819_read.py`. At each target M the clean points within a window
|M - M_t| <= w are fitted by a straight line and by a parabola in (M - M_t)
for w = 0.025, 0.035, 0.05 (special windows where the line is dashed or
hidden, stated per row); the value is the central fit and the spread of the
six fits is a model term. Reading error (about 2 sigma):

err = 2 sqrt(se_fit^2 + (0.4 px)^2 + (0.5 px)^2 + (slope x 0.5 px of M)^2) + spread/2

with 0.4 px the calibration leave-one-out scatter and 0.5 px for the ink
centroid. Where a value relies on interpolation across a gap, the error was
raised by hand (stated in the CSV). The error is the reading error of the
drawn ink centre-line; the lines themselves are about 5 px (0.0008 in P_B)
wide.

### Results (`readings/tn3819_fig18.csv`)

| M | Basic (L) | Chapman (U) |
|---|---|---|
| 1.0 | -0.1851 +- 0.0003 | -0.1902 +- 0.0004 |
| 1.1 | -0.1851 +- 0.0002 | -0.1892 +- 0.0002 |
| 1.2 | -0.1839 +- 0.0003 | -0.1874 +- 0.0002 |
| 1.3 | -0.1813 +- 0.0002 | -0.1847 +- 0.0002 |
| 1.4 | -0.1776 +- 0.0002 | -0.1814 +- 0.0005 |
| 1.5 | -0.1734 +- 0.0003 | -0.1776 +- 0.0003 |
| 2.0 | -0.1448 +- 0.0002 | -0.1499 +- 0.0003 |
| 2.5 | -0.1172 +- 0.0002 | -0.1196 +- 0.0005 |
| 3.0 | -0.0965 +- 0.0003 | merged with L (-0.0965 +- 0.0005) |

Free-flight curve: drawn from M 1.008 (P_B -0.1875, where its dashed descent
meets the border) to M 1.279 (P_B -0.1955, end of stroke). M 1.05: -0.2066;
1.10: -0.1991 (+-0.0006, steep); 1.15: -0.1931; 1.20: -0.1975 (+-0.0004, on
a gridline at a bend); 1.25: -0.1970; first peak -0.2073 at M 1.061, trough
-0.1931 at M 1.145, second peak -0.1978 at M 1.219. At M 1.000 the curve
cannot be separated from the border: a heavy vertical stroke on the border
spans P_B -0.188 to -0.182 and may or may not be part of it.

Uncertain or not read: whether the heavy stroke on the M = 1.0 border belongs
to F; U and L cannot be told apart from M 2.97 on; U is drawn dashed over
M 1.31 to 1.40, about 1.84 to 1.94 and 2.42 to 2.53 (values there come from
the dashes); U runs on the P_B = -0.18 gridline from M 1.43 to 1.47 and under
the Ref. 9 circle from M 1.48 to 1.55 (interpolated across).

## RM L52J21a figs. 31 to 33, panel (d) (cylindrical base)

### Symbols and legend

Each figure's legend (`overlays/rml52j21a_f3Nd_legend.png`) shows a square
with a centre dot = conical nose, a triangle (with centre dot) = ogive nose,
a circle with a centre dot = radome nose. Every symbol read was identified by
its outline shape on zoomed crops and pixel maps; the shapes are unambiguous
where an outline is visible, so identification confidence is high except
where a stack leaves only part of an outline (stated per row).

### Measurement

`scripts/rm_symbols.py`. The binary scan is used with pixels within 4 px of a
gridline centre ignored.

* Squares: each side located as the darkness centroid of its column or row
  profile peak; centre = midpoint of opposite sides. In stacks the visible
  sides were read from pixel maps; a hidden side is replaced by the opposite
  side and the figure's square size measured on clean squares (43 px in
  fig. 32, 41 px in fig. 33).
* Circles: algebraic circle fit to the outline pixels with outlier
  rejection (the fairing line through the circle is rejected).
* Triangles: lines fitted to the two sides, base from its row profile
  (fig. 31), or vertices read from pixel maps (figs. 32, 33); value = centroid
  of the three vertices. Where the base or the apex is hidden it is placed
  from the figure's triangle height measured on clean triangles (41 px in
  fig. 32, 38.75 px in fig. 33).
* Centre dots: where a symbol's centre dot is visible and separate it is
  taken as the plotted point (the outline centre is also given). Dots and
  outline centres differ by up to about 4 px typically, 7.6 px at most (33-C2). On
  clean triangles (three measured) the dot sits 0.59 to 0.70 of the height below the apex,
  around the centroid (0.67).

Reading error (about 2 sigma) in each axis: 2 sqrt(s_meas^2 + (0.4 px)^2 +
s_t^2), with s_meas 0.5 to 1 px (more where a side is hidden), and, when no
dot is used, a template-centering term s_t = 1.8 px in R and 1.5 px in P_B
(2.5 px for triangle centroids), from the dot-to-outline scatter.

### Results (`readings/rml52j21a_figs31-33d.csv`)

Symbols between R = 7e6 and 9.5e6 (the nearest symbols outside are at R
about 6.3 to 6.6e6 and 9.7 to 9.9e6):

| Fig. (M) | Conical (squares) | Ogive (triangles) | Radome (circles) |
|---|---|---|---|
| 31 (1.62) | R 7.63: -0.1488; R 8.80: -0.1481 | R 7.22: -0.1488; R 8.02: -0.1479 | R 7.09: -0.1350; R 8.05: -0.1331; R 8.90: -0.1337 |
| 32 (1.93) | R 7.33: -0.1508 and -0.1494 (two superposed outlines); R 8.03: -0.1506; R 9.03: -0.1508 | R 7.23: -0.1519; R 8.17: -0.1517; R 8.93: -0.1481 | R 7.37: -0.1391; R 8.19: -0.1391; R 9.06: -0.1406 |
| 33 (2.41) | R 7.04: -0.1194; R 7.52: -0.1184; R 8.12: -0.1191 | R 7.11: -0.1230; R 7.46: -0.1219; R 8.16: -0.1196 | R 7.30: -0.1143; R 8.06: -0.1128 |

Errors per row are in the CSV: +-0.0002 in P_B where a centre dot is used,
+-0.0005 to 0.0008 for outline centres and triangle centroids.

Stacks: fig. 32 at R 7.2 to 7.4 (triangle plus two square outlines offset by
10 px: either two conical points or one redrawn square, which cannot be
told), R 8.0 to 8.2 and R 8.9 to 9.1 (square and triangle overlapping);
fig. 33 at R 8.1 to 8.2 (triangle inside the square), and partial overlaps at
R 7.0 to 7.1 and 7.5. The stack rows in the CSV give the top and bottom
centre values and ink extents and what could and could not be separated.

## Files

* `readings/tn3819_fig18.csv`, `readings/rml52j21a_figs31-33d.csv`: the
  readings.
* `readings/tn3819_fig18_calib.json`, `readings/rml52j21a_f3Nd_calib.json`:
  every measured gridline intersection and the fit statistics.
* `readings/tn3819_fig18_tracks.json`, `readings/tn3819_fig18_readings.json`,
  `readings/rml52j21a_f3Nd_symbols.json`: tracked points and symbol fits.
* `overlays/`: calibration (cyan squares on measured intersections), tracks
  and fitted symbol outlines drawn over the scan.
* `scripts/`: everything used, in the order calib, track or symbols, read,
  overlays, make_csvs.

## Item 3: NASA CR-149372 fig. 8b (Macha 1976, NTRS 19770008057)

File `19770008057.pdf`, SHA-256
`339f24fc82ecc0409c7bb93c83219c32caf5223241f0d452d9e4d9145ea59c18`, PDF p. 26
(report p. 25), "Figure 8b. As in Figure 8a except Mach number = 1.0 to 1.2":
Cp against circumferential angle theta (deg) on a circular cylinder in
crossflow. Legend: circle with dot = M 1.0, square with dot = M 1.1,
triangle = M 1.2, all at Reynolds number 0.19 x 10^6, diameter 1.91 cm.
The report text (p. 9) quotes "corrected" Cp values for this figure; what is
read here is what is plotted.

The embedded image is a 300 dpi JBIG2 halftone, so lines and symbols are
dithered: everything is measured on the page box-blurred with radius 2 (5 x 5
px at 600 dpi). The curves are about 15 px wide.

Calibration (`scripts/grid_calib.py`, configuration `cr8b`): the only
gridlines are every 30 deg and every 0.4 in Cp, drawn by hand and broken by
the draftsman where they meet the curves; lines are followed from several
seeds each. 53 of 56 intersections measured (the 3 missing are under the
legend). Gridline straightness rms 0.6 to 1.5 px. The grid is irregular:
vertical spacings 437 to 458 px for 30 deg. A single affine map through all
intersections leaves theta residuals rms 0.42 deg (max 0.96 deg) and Cp
residuals rms 0.0017 (max 0.0035); leave-one-out rms 3.0 px in x, 2.0 px in y.
Values are read with the local bilinear map (relative to the drawn grid);
the affine-map value is also given in the CSV for every row, so the effect of
the irregular grid can be seen (up to 0.6 deg in theta, 0.0025 in Cp).

Identification: each faired line passes through its own symbols. The M 1.2
line (`scripts/cr_track.py`, red on the overlays) passes through or touches
every triangle; the M 1.1 and M 1.0 lines were tracked over 17 to 65 deg
only to make sure the M 1.2 track never moved onto them. From 22 to 65 deg
the M 1.2 line is the right-most of the three (largest theta at a given Cp),
35 to 70 px (2.3 to 4.7 deg) from the M 1.1 line and more than 86 px from
the M 1.0 line; no M 1.2 point came within 22 px of another line. Columns
were measured where the line is flat and rows where it is steep. Points
within 30 px of a triangle centre or where the ink run is wider than 24 px
(a symbol) are left out of the fits, as are points on gridlines.

Triangles (`scripts/tri_match.py`): a synthetic outline drawn from a clean
symbol (centre-line apex to base 44 px, base 54 px, stroke 10 px) is
correlated with the blurred page; the template's reference point is the
centroid of its vertices. 22 triangles were found along the M 1.2 line (one
correlation peak at theta 77 deg had no symbol under it and was rejected by
eye). Error 2 px per axis for the template fit plus 1 px of calibration.

Faired curve (`scripts/cr_read.py`): at each 5 deg the clean points within
+-1.5, 2.5 and 4 deg are fitted by a line and a parabola. Error as in the
TN 3819 reading with 1.4 px per axis; in the steep part it is dominated by
the theta position times the slope (0.03 per deg), giving +-0.005 to 0.007.

Results (`readings/cr149372_fig8b.csv`): faired curve at theta 0 to 100 in
steps of 5: 1.394, 1.388, 1.357, 1.303, 1.221, 1.117, 1.000, 0.869, 0.719,
0.570, 0.425, 0.278, 0.124, -0.023, -0.169, -0.302, -0.423, -0.521, -0.619,
-0.687, -0.741 (errors +-0.002 to 0.007, +-0.012 at 100 deg).

Uncertain or not read: the faired line is hidden inside the theta = 0
triangle below 1.7 deg (the 0 deg value is extrapolated with zero slope at
0); from theta 93 to 112 the line runs through a cluster of overlapping
triangles, so 95 deg (+-0.006) and especially 100 deg (+-0.012) are read
from short visible pieces. Near the top (0 to 15 deg) and at 101 to 108 deg
the faired line runs through the upper part of the triangles, 0.012 to
0.018 above their centroids; in the steep part it passes through them.

## Item 4: NACA TN 3861 figs. 15 and 16 (Penland, NTRS 19930084664)

File `19930084664.pdf`, SHA-256
`4b3884fdbd75781c8707748aa906af00974f5e1a995d056c550f64f6c41f5957`; fig. 15
on PDF p. 31 (report p. 30), fig. 16 on PDF p. 32 (report p. 31), both
landscape, 300 dpi grayscale JPEG scans rendered at 600 dpi.

### What the axes are (from the report's text and symbol list)

* Abscissa of both: crossflow Mach number M_c = M sin(alpha) (symbol list,
  p. 2).
* Fig. 15 ordinate: "(p_c - p_inf)/q_c and (p_3 - p_inf)/q_c", the
  stagnation pressure coefficient based on the crossflow dynamic pressure
  q_c. p_c is the measured pressure on the cylinder (at the stagnation point
  for this figure), p_3 is "stagnation pressure behind shock of flow component
  normal to shock", p_inf the free-stream static pressure.
* Fig. 16 ordinate: Delta p/q_c = (p_c - p_inf)/q_c, the pressure coefficient
  "on the downstream side of a circular cylinder", based on q_c.
* Present data: M = 6.86, Reynolds number 129,000 on the 1/2-inch diameter.
  The pressure-model angles of attack in the legend of fig. 5 are 90.0, 75.7,
  60.4, 44.9, 30.2 and 14.9 deg, so M sin(alpha) = 6.860, 6.647, 5.965, 4.842,
  3.451 and 1.764. A cross on a symbol "indicates data obtained through
  crossflow study"; the uncrossed present-data symbol is the alpha = 90 deg
  case. The text (p. 10) singles out the present point at M_c = 1.74 as high
  because the shock was not parallel to the body at alpha about 15 deg.
* Lord and Ulmann (unpublished): M = 4.04, crossflow; the text (p. 11) says
  M_c = 1.04 is alpha = 15 deg. Gowen and Perkins (ref. 8) and Walter and
  Lange (ref. 9) are cylinders normal to the stream at M 1.49 to 2.9 and 2.48
  to 4.92, so for them M_c = M. Fig. 16 data span Reynolds numbers 0.4 x 10^5
  to 2.1 x 10^6 (text p. 11).

### Symbols (legends differ between the two figures)

* Fig. 15: square = present data, right triangle with straight hypotenuse =
  Gowen and Perkins, right triangle with a quarter-round hypotenuse = Lord and
  Ulmann, circle = Walter and Lange, cross added = crossflow-derived.
* Fig. 16: circle = Gowen and Perkins, square = Lord and Ulmann, diamond =
  present data, triangle = Walter and Lange, cross added = crossflow-derived.

Every symbol was identified by eye on contact sheets against the legend
(`scripts/symsheet.py`); 17 in each figure. The plotted point is taken as
the centre dot where one is visible, the crossing of the cross strokes for
crossed symbols, the fitted circle centre for circles whose dot is hidden,
and the centroid for right triangles (the visible dot of 15-06 sits at its
right-triangle centroid, 1 to 3 px off). Where a stroke or dot coincides
with a gridline or another symbol, the position was read by eye from a pixel
map; the CSV says which (`value_from`). Errors are about 2 sigma: 1 to 3 px
measurement and 0.6 px calibration, so +-0.0025 in fig. 15 ordinate units
(948 px per unit) and +-0.001 in fig. 16 (2313 px per unit), more for the
pixel-map and centroid cases.

### Curves

* Fig. 15 curve A: solid from M_c = 1.0 (where it ends in a blob on the
  M_c = 1 gridline at 1.281) to about 2.0, then dashed to M_c 8.48. Its dash
  pattern (long, long, short) is the legend's "Oblique shock values".
* Fig. 15 curve B: a heavier line from M_c 7.0 to the frame at 9.0, dash
  pattern long (240 px), short (48), long (232), short (51), long, which is
  the legend's "Newtonian flow, Grimminger's hypersonic approx., ref. 1"
  (long, short, long). It lies on the 2.0 gridline: read with the gridline
  subtracted, 2.003 and 2.004 at M_c 7.5 and 8.0.
* Fig. 16 curve C: the dashed "Delta p/q_c for zero pressure" line, from
  M_c 1.336 (-0.828) to 6.976 (-0.030). Its steep start was tracked row by
  row, the rest column by column (`scripts/t3861_track.py`).

Values at M_c steps are in `readings/tn3861_figs15-16.csv`
(`scripts/t3861_read.py`; error about 2 sigma as for the other curves).

### Calibration

Fig. 15: gridlines every 0.5 in M_c and every 0.25 in the ordinate; in the
data window (M_c 0 to 9, ordinate 0 to 2.25) 188 of 190 intersections were
measured (the legend box blanks the rows above 2.25). The page is rotated by
-0.78 deg. A single affine map leaves M_c residuals rms 0.0021 (max 0.009)
and ordinate residuals rms 0.0019 (max 0.010); leave-one-out rms 0.32 px in
x, 0.89 px in y. Fig. 16: gridlines every 0.5 and every 0.1; 218 of 238
intersections (the 20 missing are under the legend box); rotation +0.39 deg,
axes 89.68 deg apart; affine residuals M_c rms 0.0033 (max 0.0095), ordinate
rms 0.0005 (max 0.0023); leave-one-out 0.68 and 0.80 px rms.

Uncertain or not read: the cross centre of 16-06 (its upper half is under
the circle 16-05), the hidden dots of 15-03, 15-09, 15-14 and 16-14
(values from the outline geometry), and the last reading of curve B where it
runs into the frame.

## Item 5: BRL Report 934 Graph I (DTIC AD0068959), transcription only

File `DTIC_AD0068959.pdf`, SHA-256
`ecc596bf21b9b0a009ca0939b5af1213866c4da25626d34c5f43360f80bca02b`; Graph I
is on PDF p. 24 (the page carries "22" in its margin), a 300 dpi CCITT
bilevel scan, rendered at 600 dpi and turned clockwise so the graph reads
normally (`scripts/rotate.py`). This is a held-back flight set: the symbols
were transcribed and nothing else was done with them. No model value was
computed, run or looked at, and `docs/research/total-drag/data/basic_finner_brl934.md`
was not opened.

### What the graph shows

* Title "DRAG COEFFICIENT VS MACH NUMBER", caption "GRAPH I".
* Abscissa "M" (Mach number), labelled 1.0, 1.4, 1.8, 2.2, 2.6; ordinate
  "C_D" (drag coefficient), labelled 0.3 to 0.9 every 0.1. A heavy axis line
  is drawn on the C_D 0.3 ruling.
* Legend, transcribed as printed: crossed circle "CONSOLIDATION OF PHASE I
  ROUNDS"; plus "ROUND VALUE"; solid dot "VALUE CORRECTED FOR YAW"; open
  circle "CORRECTED FOR YAW AND FULL TURBLENT B.L." (sic).
* A faired curve rises from about M 0.96 to a peak near M 1.04 and falls to
  its end at about M 2.48. It was not read (not asked).

### Calibration

Graph paper: heavy rulings every 0.05 in M (each label sits on every 8th)
and every 0.025 in C_D (each label on every 4th), with fine dashed rulings
at fifths between the heavy horizontal ones. The 0.3 assignment was checked
by following the ruling under the drawn axis line across the page
(`scripts/brl_hprobe.py`): it is the ruling labelled 0.3 at the left. The
page is sheared, not just turned: vertical rulings lean by dx/dy = -0.010 to
-0.014 and horizontal rulings by dy/dx = +0.019 to +0.022, so the axes are
89.53 deg apart and the M axis runs 1.17 deg from the image horizontal. The
36 vertical (M 0.95 to 2.70) and 27 horizontal (C_D 0.300 to 0.950) heavy
rulings were each followed from several seeds (`scripts/grid_calib.py`,
config `brl934`) and every intersection taken from local straight fits;
values in between come from bilinear interpolation in each cell
(`localgrid.py`). 898 of 972 intersections were measured; the 74 missing lie
under the legend (C_D 0.70 to 0.80 at M 2.0 to 2.7, no data there). Per-line
rms about a straight line 0.4 to 1.5 px (1.7 px for the C_D 0.95 ruling
near the title). In the data window (M 0.95 to 2.5, C_D 0.45 to 0.925): one
affine map leaves M residuals rms 0.00076 (max 0.0056) and C_D residuals rms
0.00032 (max 0.0010); leave-one-out (each intersection from its four
neighbours) rms 0.93 px in x and 0.82 px in y. The one large leave-one-out
value (9.4 px) is at M 1.75, C_D 0.775, inside the legend. The M 1.25 ruling
is missing from the scan between C_D about 0.62 and 0.75, and the D symbols
touch it; its intersections there sat up to 4.8 px off the ruling's own
quadratic and were replaced by that quadratic (moving D1 to D3 by 0.0006 to
0.0014 in M). Scale: 1921 px per unit M, 3839 px per unit C_D, so 1 px is
0.00052 in M and 0.00026 in C_D.

### Identification

Every mark off the faired curve, and every mark on it, was looked at in
zoomed crops (`scripts/crop.py`, `scripts/brl_clean.py`, which greys the
vertical rulings) and pixel maps (`scripts/pixmap.py`). The four legend
symbols differ by: plus = two crossing strokes; solid dot = disc with no
hole; open circle = thick ring with one central hole; crossed circle = thick
ring with four small holes (the cross). The data symbols are drawn somewhat
smaller than the legend's (dots 30 to 48 px against 50 px). Each call and the
features it rests on are in the CSV (`shape_features`). As supporting
evidence the four legend symbols, cut from the page, were correlated with
each mark with the vertical rulings masked out (`scripts/brl_symbols.py`);
the scores are in the CSV, but on this bilevel scan they separate the types
poorly (the dot template scores well on any compact blob, including clear
pluses, and the crossed-circle template loses to the open circle at G1,
whose four holes and horizontal cross stroke match the legend's crossed
circle and no open circle), so no call rests on them. Where a call changes
the meaning, the confidence column says how firm it is.

The data come in groups at one Mach number, joined by thin vertical lines:
a plus at the top, then a dot, and in two groups an open circle between
them. In the legend's terms: the round value, the value corrected for yaw
and the value corrected for yaw and full turbulent boundary layer.

### Results (`readings/brl934_graph1.csv`)

Centres are the midpoints of each mark's outer extents read from the pixel
map; errors about 2 sigma (centre reading error set per mark, plus 2 px for
the calibration). The drafting error of the original plot is not included.

| id | symbol | M | C_D | call |
|---|---|---|---|---|
| A1 | plus | 0.9743 +- 0.0034 | 0.8967 +- 0.0031 | low |
| A2 | open circle | 0.9749 +- 0.0029 | 0.8347 +- 0.0014 | medium |
| A4 | dot | 0.9740 +- 0.0019 | 0.7896 +- 0.0009 | high |
| B1 | plus | 1.0193 +- 0.0027 | 0.8954 +- 0.0026 | low |
| B2 | plus | 1.0466 +- 0.0028 | 0.9001 +- 0.0026 | low |
| B3 | plus | 1.0468 +- 0.0028 | 0.8809 +- 0.0014 | medium |
| B4 | plus | 1.0836 +- 0.0019 | 0.8917 +- 0.0009 | high |
| C1 | plus | 1.1423 +- 0.0033 | 0.8231 +- 0.0017 | low |
| C2 | dot | 1.1419 +- 0.0023 | 0.8055 +- 0.0012 | medium |
| D1 | plus | 1.2650 +- 0.0019 | 0.7553 +- 0.0010 | high |
| D2 | open circle | 1.2656 +- 0.0019 | 0.7371 +- 0.0009 | high |
| D3 | dot | 1.2619 +- 0.0019 | 0.7173 +- 0.0012 | high |
| E1 | plus | 1.4007 +- 0.0023 | 0.7870 +- 0.0011 | medium |
| E2a | plus | 1.3882 +- 0.0028 | 0.7002 +- 0.0014 | medium |
| E2b | dot | 1.4017 +- 0.0028 | 0.7020 +- 0.0014 | medium |
| F1 | plus | 1.5100 +- 0.0029 | 0.7079 +- 0.0014 | medium |
| F2 | dot | 1.5090 +- 0.0024 | 0.6892 +- 0.0011 | high |
| G1 | crossed circle | 1.8013 +- 0.0023 | 0.6068 +- 0.0012 | high |
| H1 | plus | 1.9925 +- 0.0024 | 0.5825 +- 0.0011 | high |
| H2 | dot | 1.9881 +- 0.0029 | 0.5593 +- 0.0015 | medium |
| I1 | plus | 2.0323 +- 0.0018 | 0.5649 +- 0.0010 | medium |
| I2 | open circle | 2.0510 +- 0.0024 | 0.5482 +- 0.0011 | medium |
| I3 | dot | 2.0498 +- 0.0019 | 0.5171 +- 0.0009 | high |
| J1 | plus | 2.4214 +- 0.0027 | 0.4753 +- 0.0022 | low |
| J2 | open circle | 2.4191 +- 0.0032 | 0.4658 +- 0.0017 | low |
| K1 | plus | 2.4696 +- 0.0019 | 0.4741 +- 0.0009 | high |

Groups: A, one vertical line at M 0.975 from C_D 0.90 down through A2 to
A4; D, F and H, plus joined to the symbols below it; E, a line from E1 down
to E2b, with the plus E2a just left of E2b; I, the plus I1 alone at M 2.03
and I2 joined to I3 along the M 2.05 ruling; J1 stands on J2; B (four marks
at the curve's peak), C (two marks on the falling curve), G and K are not
joined to anything.

Uncertain or not read:

* A1, B1, B2, C1 and J1 show only one or two free arms; the rest of each
  mark lies inside the faired curve, a heavy ruling or a connecting line.
  They are called pluses because of those arms and because pluses head the
  other groups; any of them could be something else, and their C_D is
  uncertain by up to +-0.003.
* J2 is a blob on the curve with a small hole: called an open circle, could
  be a dot.
* The dark broken strokes just left of the A line (M 0.955 to 0.965, C_D
  0.79 to 0.84) are read as the lower end of the faired curve, not as
  symbols; a symbol hidden in them cannot be excluded.
* The faired curve was not read.

## Item 6: NACA RM L52J21a fig. 8, nose calls (finned body)

Same file as items 1 and 2 (`19930087533.pdf`, SHA-256
`9392252bc0b9c2c60c178aa4bbb56616a247f1366890660f3eadaef960e25550`). Fig. 8
("Effect of Mach number and Reynolds number upon the base pressure of the
finned body having variable nose and base shapes") is on PDF p. 28 (report
p. 27), a 300 dpi CCITT bilevel scan rendered at 600 dpi. It has six panels:
R = 2.91, 5.12 and 8.06 x 10^6 down the page, boattail and cusp bases on the
left, cylindrical and conical bases on the right; P_B against M at M 1.62,
1.93 and 2.41. Legend: circle = conical nose, square = ogive nose, diamond =
radome nose, "Flagged symbols denote fixed transition" (no flags in the
panel read). Only the lower right panel (cylindrical and conical bases,
R = 8.06 x 10^6) was read: it is the only panel at the Reynolds number of
the unfinned readings (item 2, R 7 to 9.5 x 10^6), and its cylindrical-base
stack at M 1.62 is the one near P_B = -0.1485. The other five panels were not
read.

### Calibration

Gridlines every 0.1 in M (1.5 to 2.7) and every 0.02 in P_B (0 to -0.20);
all 143 intersections measured (`scripts/grid_calib.py`, config `rm8br`;
the in-panel labels and the NACA wing were masked). The page is turned by
0.82 deg, axes 89.87 deg apart. One affine map leaves M residuals rms 0.0005
(max 0.0011) and P_B residuals rms 0.00008 (max 0.0002); leave-one-out rms
0.38 px in x and 0.40 px in y (max 1.1 px). Scale: 1231 px per unit M,
6186 px per unit P_B (1 px = 0.0008 in M, 0.00016 in P_B).

### How the noses were called

Sizes from isolated symbols of the same figure (lower left panel, M 1.62):
circle outer diameter 46 to 48 px, diamond 56 to 61 px vertex to vertex,
square side 43 px, stroke 4 to 5 px, centre dots. In each stack the
symbols overlap, so each was called from the parts of its outline that no
other symbol covers (`scripts/rm8_symbols.py`, pixel maps): a square from a
straight edge with right-angle corners, a diamond from pointed vertices
(the bottom vertex found as the crossing of the two straight lower edges),
a circle from round arcs and a vertical side where a diamond edge would be
diagonal. Two objective checks are in the CSV: the support of each shape's
centre line (fraction of outline points with ink within 1 px) and the key
points that only one shape inks (square corners, diamond vertices, circle
45-deg points). In a stack the support saturates for every shape (all the
ink is near every outline), so it does not separate the calls; the key
points do where they are free (for example, at CY241-di all four diamond
vertices are inked but the square's and circle's lower key points are
empty; at CY241-sq no diamond vertex is inked). Overlays draw each called
shape's centre line on the scan (`overlays/rml52j21a_f8_lr_*.png`).

### Results (`readings/rml52j21a_fig8_lr.csv`)

Errors about 2 sigma: centre reading error (1.5 to 6 px) and 0.8 px
calibration.

| stack | id | nose (symbol) | M | P_B | call |
|---|---|---|---|---|---|
| cylindrical base, M 2.41 | CY241-sq | ogive (square) | 2.408 | -0.1188 +- 0.0003 | high |
| | CY241-ci | conical (circle) | 2.409 | -0.1157 +- 0.0005 | high |
| | CY241-di | radome (diamond) | 2.409 | -0.1121 +- 0.0005 | high |
| conical base, M 2.41 | CO241-sq | ogive (square, centre dot) | 2.409 | -0.0680 +- 0.0003 | high |
| | CO241-ci | conical (circle) | 2.408 | -0.0619 +- 0.0010 | medium |
| | CO241-di | radome (diamond) | 2.409 | -0.0603 +- 0.0005 | high |
| cylindrical base, M 1.62 (lower) | CY162-ci | conical (circle) | 1.617 | -0.1488 +- 0.0005 | medium |
| | CY162-di | radome (diamond) | 1.617 | -0.1482 +- 0.0005 | high |

M errors are 0.0014 to 0.005. Stack extents (outer ink): cylindrical base
M 2.41 from -0.1224 (top edge of the square) to -0.1073 (bottom vertex of
the diamond); conical base M 2.41 from -0.0718 to -0.0554; cylindrical base
M 1.62 lower stack from -0.1529 to -0.1432. The ogive square at M 1.62 sits
apart above that stack, near -0.16; it was not asked for and not read.

Separation: in both M 2.41 stacks the three noses separate (order from the
top: ogive, conical, radome). At M 1.62 the stack near -0.1485 is two
symbols drawn almost on top of each other, a diamond (radome) and a circle
(conical): the diamond's pointed top, bottom and side vertices stand outside
the circle, and the circle shows as a flat wide top and bottom that pointed
vertices cannot give. Their centres differ by 4 px (0.0006 in P_B, less than
the reading error), so the two values cannot be told apart. One centre dot
serves both. The least certain call is CO241-ci: its arc is
partly inside the diamond and on the -0.06 gridline. It would change if the
round top arc proved to be part of the square's bottom edge and the
diamond's top vertex, which the vertical right side argues against.

## Item 7: O'Neal, NTRS 19980227361 (what it contains; no values read)

File `19980227361.pdf` (NTRS download), SHA-256
`2c1103128aadee9a9a85fcba62fbf1d4d54b9a41006f3d42662855e4d3dc7020`, 40 PDF
pages; it is NASA TM X-208 (O'Neal, March 1960), "Heat transfer to 36.75 deg
and 45 deg swept blunt leading edges in free flight at Mach numbers from 1.70
to 2.99 and from 2.50 to 4.05". Report page = PDF page - 2.

* What was measured: heat transfer (Stanton number) on four leading-edge
  segments, cylindrically blunted wedges (flats at 4.27 deg to the chord
  plane, 4 in span) on a rocket model: 45 deg sweep with D = 1/4, 1/2 and
  3/4 in, and 36.75 deg sweep with D = 1/2 in. M 1.78 to 2.99 (high Reynolds
  number, t = 2.0 to 3.2 s) and 2.50 to 4.05 (t = 52 to 56 s); summary and
  model, PDF pp. 3, 6 (report pp. 1, 4).
* Pressure: one orifice only, on the flat (wedge) surface of the 45 deg,
  D = 3/4 in segment, 1.42 in behind the leading edge (fig. 3(a), section
  B-B, PDF p. 19, report p. 17). Its C_p against time is fig. 8 (PDF p. 25,
  report p. 23); Mach number against time is fig. 6 (PDF p. 23, report
  p. 21). Text on it: PDF pp. 7, 9 and 10 (report pp. 5, 7, 8): negative
  C_p, overexpansion around the blunt edge, said to agree with the pressures
  of ref. 8 when correlated on normal Mach number.
* Nothing on the leading edge itself: no stagnation-line or cylinder
  pressures (local conditions there are computed from theory, ref. 4
  equations), and no drag. The 36.75 deg segment has no pressure orifice.
* So for a swept blunt edge at normal Mach 1.26 to 2.4 the report has no
  leading-edge or front-side pressure and no drag. The single after-flat
  C_p of the 45 deg segment covers normal Mach about 1.26 to 2.11 (M 1.78
  to 2.99) and 1.77 to 2.86 (M 2.50 to 4.05); it is a downstream surface
  pressure, not a front-side one. Leads named in its references (not opened):
  ref. 4, Goodwin, Creager and Winkler, NACA RM A55H31 (1956), local heat
  transfer and pressure drag of a yawed circular cylinder at supersonic
  speeds; ref. 8, O'Neal and Bond, NACA RM L58A13 (1958), 0 and 75 deg swept
  blunt leading edges in free flight, M 1.90 to 3.07, which the text says
  has pressure measurements.

## Item 5, paired with the first reading of Graph I

Opened after 22981ab was committed, as allowed: the Graph I part of section
7 and the Table III rows of `docs/research/total-drag/data/basic_finner_brl934.md`
(section 6) and the Table III columns of `basic_finner_brl934.csv`,
including its `graph1` column (the first reader's symbol per round). Nothing
else in those files, no model value, and nothing under
`docs/research/refusals/` was opened. Pairs, differences and resolutions:
`readings/brl934_graph1_pairing.csv`.

The first reading gives values for the consolidation symbol (M and C_D) and,
in C_D only, for the symbols of rounds 3256, 3255, 3249, 3263 and 3246 (its
calibration checks); it names the symbols of 3246 and 3254 without values
and did not read the rest below M 1.5. Errors taken for it: +-0.003 in C_D,
+-0.01 in M, as it states.

* Nine pairs have values on both sides: the consolidation symbol, 3256's plus
  and dot, 3255's plus, 3249's open circle and dot, 3263's plus, 3264's mark
  and 3246's plus. All agree within the combined errors: C_D differences
  -0.0009 to +0.0018 (combined error +-0.0031 to +-0.0037), and -0.0047 in M
  for the consolidation symbol (+-0.010).
* Calls differ at two:
  * 3263's lower symbol (my J2, called an open circle with low confidence;
    the first reading calls it a dot on the faired curve). Third look,
    resolved: it is a dot. The white "hole" is the wedge between the blob
    and the faired curve where the curve leaves it, not a hole inside the
    symbol; the blob is solid and dot sized. New centre M 2.4161 +- 0.0033,
    C_D 0.4652 +- 0.0017 (one reading of the value; the first gives none).
  * 3264's mark (my K1, a plus, high; the first reading, a filled dot).
    Third look, not resolved, so the call is left out and the position
    kept. It shows a thin top arm, a 55 px horizontal arm lying on the heavy
    C_D 0.475 ruling and a lower arm thickened into a blob 20 to 24 px wide:
    either a plus with a heavy lower arm or a small dot under a plus (dot
    centre C_D 0.4712). Both readings agree that this is the only mark at
    M 2.47, at C_D 0.471 to 0.474, and that nothing is plotted near Table
    III's 0.449 (the area was checked again and is empty), so the first
    reading's mismatch flag stands.
* The calls agree at 3263's plus (J1), my low call matched by the first
  reader's, and at the named-only symbols of 3246 (dot, my E2b) and 3254
  (plus and dot, my F1 and F2), whose values have one reading.
* No pair exists for A1 to A4, B1 to B4, C1, C2, D1 to D3 and E2a (all
  below M 1.5, not read by the first reader). A1, B1, B2 and C1, low calls
  with one reading, are left out. A third look at C1 found only a short
  vertical stroke with a right arm beside the curve, and no separate mark
  at round 3258's Table III point (M 1.139, C_D 0.850). The others are
  usable only after a second reading.
* Against Table III (not a pair, a check): the round-value pluses sit 0.0015
  to 0.003 below the table's C_D in both readings at M 1.4 to 2.42 (E1, F1,
  H1, I1, J1). Both readings calibrate differently, so this looks like the
  plot, not the reading. E2a (one reading, round 3257 by position) is 0.006
  below its table value.
