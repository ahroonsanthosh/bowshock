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
