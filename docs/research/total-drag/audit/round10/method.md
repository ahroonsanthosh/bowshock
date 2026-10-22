# Round 10: blind second readings of the figures W7 registered (0014 10.7 (k))

This is a second reading. I did not open W7's readings or scripts: the
w7-fins worktree, `docs/research/total-drag/audit/w7-fins/`, and the
scratch folders `w7scripts/`, `w7img/` and `w7-review/`.

## Common method

* **Sources.** Each PDF was copied into its own new folder under
  `scratchpad/round10/` and hashed. The pages are 300 dpi CCITT bilevel
  scans. They were extracted losslessly (`pdfimages -png`), and every pixel
  position below is a pixel of those native images.
* **Calibration** (`scripts/grid_calib.py`, `scripts/localgrid.py`,
  `scripts/rm_calib.py`).
  * Every gridline of the plot is followed and sampled along its length.
  * Each intersection is found from local straight-line fits.
  * A point is converted to data by bilinear interpolation inside the grid
    cell that contains it, which corrects rotation and skew cell by cell.
  * Quality is reported per figure: per-line rms, a single affine map, and
    leave-one-out of each intersection from its four neighbours.
* **Symbols** (`scripts/sym_refine.py`, lists in `scripts/symlists.py`).
  * Every symbol was identified by eye on zoomed crops (`scripts/crop.py`)
    against the figure's own legend, and its approximate centre noted.
  * The centre is then found by correlating the legend glyph of its type
    with the page within +-6 px. Gridline pixels are given zero weight,
    since gridlines cross many symbols.
  * The glyph's reference point is its bounding-box centre, measured on a
    pixel map (for a plus, the crossing of its strokes).
  * Error, about 2 sigma: (2 x 0.8 px) for the centre combined with twice
    the calibration's leave-one-out rms, times the local scale; 1.5 px
    instead of 0.8 px where the correlation score is below 0.6.
* **Faired curves** (`scripts/curve_read.py`, chains in
  `scripts/curvelists.py`).
  * Each curve is a chain of nodes: its symbols, plus page points read by
    eye where the line has no symbol.
  * Between nodes, the ink ridge is sampled across the chord every 1.5 px
    and centroided. Symbols (10 px discs) and gridlines are masked, and
    points touching the mask are left out.
  * The curve is read at fixed abscissae by local line and parabola fits.
    Error, about 2 sigma = 2 sqrt(se^2 + (0.8 px)^2 + (slope x 0.8 px)^2) +
    spread/2.
  * Abscissae inside a symbol, or with track on one side only, are not
    read. The symbol gives the value there.
* **Overlays** (`overlays/`, `scripts/overlay.py`). Cyan squares are the
  measured intersections, magenta boxes the symbol centres read, coloured
  dots the curve tracks (hollow where masked), and crosses the curve
  readings.

## R&M 3348 (Rogers, Berry and Quincey), fig. 30

File `report.pdf`, SHA-256
`d2f35d8a07f34916a386ae0cf379e947ff5d06248c5555dbbfc313eab383e158`; fig. 30
is on PDF p. 68 (printed p. 67).

**Caption, as printed:** "Effect of wing sweep on base pressures measured on
single-wedge wing (eta = 0.59; alpha = 0 deg)". The panels are "(a) plotted
against stream Mach number" (M_0) and "(b) plotted against component of
stream Mach number normal to the leading edge" (M_0 cos phi). The ordinate
is p_b/p_0, increasing downwards from 0.3 to 1.0.

**Legend** (panel b), symbols identified against it:
* Present results: phi = 0 deg circle, 15 deg cross, 30 deg triangle,
  45 deg plus, 60 deg square.
* Goin's results (ref. 29), phi = 45 deg, aspect ratio 2.7: t/c = 3 %
  large square, 4.5 % diamond, 6 % right-pointing triangle, 10 % oval with
  a bar.
* Panel (a) has no legend of its own. Its curves are labelled 0, 15, 30,
  45 and 60 deg, and their symbols are the same as panel (b)'s present
  results.
* In (b), Goin's symbols are told apart from the present results by their
  size (21 to 26 px against 14 to 17 px) and shape. The phi = 60 deg
  present squares (14 px) lie at M_0 cos phi 0.40 to 0.60; Goin's 3 %
  squares (21 x 18 px) lie at 1.00 and 1.15.

**Calibration.**
* (a): gridlines every 0.1 in M_0 (0.7 to 1.2) and every 0.1 in p_b/p_0. All
  48 intersections measured. Leave-one-out rms 0.24 px in x and 0.38 px in
  y; one affine map leaves residuals of 0.0005 in M_0 and 0.0008 in
  p_b/p_0.
* (b): 62 of 72 intersections measured; the others are under the legend and
  the text box. Leave-one-out rms 0.62 px and 0.47 px.
  * The intersection (0.5, 0.5) lies under the legend and is extrapolated
    14 px off. No point is read in the cells around it.
* Scale: about 1175 px per unit on both axes, so 1 px = 0.00085.

**What was read** (`readings/rm3348_fig30a.csv`, `readings/rm3348_fig30b.csv`):

* **(a) symbols:** 13 circles, 10 crosses, 9 triangles, 9 pluses and 9
  squares.
  * Errors are +-0.0014 in M_0 and +-0.0015 in p_b/p_0; one plus has
    +-0.0026.
  * Two symbols are not on their curve: the square a60-6 (M_0 1.049) lies
    below the 60 deg line, which passes it by; the triangle a30-9 (M_0
    1.183) is on no line.
* **(a) curves:** each sweep's faired curve, read every 0.02 in M_0 between
  its symbols, plus the M_0 where each drawn line ends.
  * The 15 deg curve is dashed.
  * The 30 deg line loops above 0.38 between M_0 1.05 and 1.11. Five points
    on the arc were added as nodes.
  * Past M_0 1.05 the 0 and 15 deg lines run 8 to 12 px apart, so the search
    there was cut to +-5 px. A first pass at +-15 px had put the 15 deg
    track onto the 0 deg line.
  * Errors are +-0.0014 to 0.0025 where the line is flat, and up to +-0.010
    on the steep rises near M_0 0.88 to 0.90 (0 deg), 0.88 to 0.94 (15 deg)
    and 0.98 to 1.04 (30 deg).
  * The 0 deg line continues past its last circle to M_0 1.179. I gave the
    short stroke there to the 0 deg line: it lies 6 px from that line's
    extension and 29 px from the 15 deg line's.
* **(b) symbols:** 13 circles, 10 crosses, 8 triangles, 9 pluses and 8
  squares (present), plus Goin's points: two each of the 3 %, 4.5 %, 6 %
  and 10 % symbols, at M_0 cos phi 1.00 and 1.15.
  * The 4.5 % diamond at 1.00 overlaps a cross; its correlation score is
    0.53 and its error is raised to +-0.0026.
* **(b) curve:** the dashed mean curve of Cleary and Stevens (ref. 28), from
  M_0 cos phi 0.603 (p_b/p_0 0.887) to its end at 1.062 (0.477).
  * Read every 0.02 except 1.00 to 1.04, where it runs through the cluster
    of Goin's and the present symbols.
  * The text box's leader, which ends on the curve near 0.86, was masked.
  * Errors are +-0.0015 to 0.008; the large ones are on the steep part
    (0.78 to 0.90).

**Uncertain or not found.**
* Each present point of (a) reappears in (b) at M_0 cos phi, the same
  p_b/p_0 within 0.002, with two exceptions:
  * The phi = 60 deg point at M_0 0.70 (0.35) is off the (b) scale. The
    square on the 0.40 frame line is the M_0 0.80 point.
  * No triangle was found in (b) for the phi = 30 deg point at M_0 1.005
    (0.870, 0.569). The search covered a zoom of that spot and a
    triangle-glyph correlation over the whole panel. It would lie 6 px from
    the phi = 0 circle b0-6, and no triangle outline shows there.
* b30-9's abscissa is 0.0075 above a30-9's M_0 times cos 30 deg.
* Triangles are centred on their bounding box. Their centroid would be
  2.7 px lower (+0.0023 in p_b/p_0); the CSV says so on every triangle row.

**Check against table 3** (my round 8 typing, hole 4 = eta 0.59, alpha 0;
column `table3_hole4_alpha0`). This is a check of the plot, not part of the
reading.
* At M_0 0.70 to 1.00, the plotted symbols agree with the table within
  0.002, apart from:
  * a30-1 (-0.004, -0.002 with the triangle centroid);
  * a30-5 (+0.008 at M_0 1.00, phi 30).
* At M_0 1.11 to 1.20, every plotted point lies below the tabulated value
  (more suction), by 0.003 to 0.010. At phi 45 and 60 at M_0 1.20 the gap
  is 0.017 and 0.022.
* So above M_0 1.1 the figure does not plot the table's hole-4, alpha 0
  numbers. The report does not say why.

## R&M 3348, fig. 31b

PDF p. 69 (printed p. 68). **Caption, as printed:** "Correlation of reduced
chordwise pressure-force coefficients for single-wedge profile at zero
incidence (coefficients determined for front half of 7 % thick double-wedge
section)". The abscissa is M_0 cos phi (0.4 to 1.2) and the ordinate
C_cf sec^2 phi (-0.02 to 0.03).

**Legend**, against which every symbol was identified:
* phi = 0 deg: a circle drawn on a line. The only line in the plot runs
  through the circles, so it is read as the 0 deg curve.
* 30 deg cross, 45 deg triangle, 60 deg plus.
* The short solid pieces between the pluses at the far left (0.40 to 0.56)
  are the C_cf sec^2 phi = -0.01 gridline running between the symbols, not
  a curve. The gridline continues through the plot at that level, and the
  legend box blanks the gridlines above it.

**Calibration.**
* Gridlines every 0.1 and every 0.01; 53 of 54 intersections measured. The
  missing one is under the legend; the 0.5 line starts only below the
  legend.
* Leave-one-out rms 0.65 px in x and 0.38 px in y; one affine map leaves
  residuals of 0.0007 and 0.00006.
* Scale: 1700 px per unit of M_0 cos phi and 11460 px per unit of the
  ordinate, so 1 px = 0.00059 and 0.000087.

**What was read** (`readings/rm3348_fig31b.csv`):
* 10 circles, 8 crosses, 10 triangles and 8 pluses. Errors are +-0.0012 in
  x and +-0.0002 in y.
  * Circles c0-8 to c0-10 and two crosses score below 0.6 against their
    glyph, because the legend circle has the line through it horizontally.
    Their errors are raised to +-0.0019 and +-0.0003, and their centres
    were checked on the overlay.
* The 0 deg line, every 0.02 from 0.62 to 1.18, with errors of +-0.0001 to
  0.0002. It starts at its first circle (0.607, -0.0059) and ends at
  (1.182, 0.0256), past the last circle. 0.82 and 0.84 are not read: the
  circles at 0.80 and 0.85 mask the line there.
* Triangles are centred on their bounding box; the centroid would be
  0.0002 lower.

## R&M 3348, fig. 32

PDF p. 70 (printed p. 69).
* **Caption, as printed:** "Variation of chordwise pressure-force
  coefficient with Mach number for phi = 0 deg plotted in transonic
  similarity form. (Single-wedge models.)"
* **Abscissa:** xi_0 = (M_0^2 - 1)/[(gamma+1) M_0^2 (t/c)]^(2/3), from -5 to
  2. A top axis is marked in M_0, with ticks at 0.60, 0.70, 0.80, 0.85,
  0.90, 0.95, 1.00, 1.05, 1.10 and 1.15.
* **Ordinate:** C~_cf = [(gamma+1) M_0^2]^(1/3) C_cf/(t/c)^(5/3), from -0.5
  to 3.0.
* **Labels** (each identified by its leader):
  * "Theory (Ref 30)", whose leader ends on the dashed line;
  * "Two-dimensional Expt. (Ref. 19)", whose leader ends on the solid line,
    with a sketch of a wedge with a parallel afterbody beside it;
  * "Present tests of single-wedge wing at phi = 0 deg shown thus O".

**Calibration.**
* Gridlines every 1 in xi_0 and every 0.5 in C~_cf; all 64 intersections
  measured.
* The rulings are not evenly spaced in y: 112 px per 0.5 at the bottom,
  117.7 px at the top. So one affine map leaves 0.035 in y, while
  leave-one-out within cells is 0.28 px in x and 0.63 px in y (max 2.5 px,
  at an intersection under the text box).
* The 0.5 gridline stops at xi_0 0.3, so its intersections at xi_0 1 and 2
  are extrapolated. No point or curve lies in the cells around them.
* Scale: 173 px per unit of xi_0 and 228 px per unit of C~_cf, so 1 px =
  0.0058 and 0.0044.
* The M_0 ticks of the top axis were located on the frame and converted:
  0.60 at xi_0 -4.141, 0.70 -2.718, 0.80 -1.595, 0.85 -1.119, 0.90 -0.719,
  0.95 -0.340, 1.00 -0.001, 1.05 0.326, 1.10 0.609, 1.15 0.860.

**What was read** (`readings/rm3348_fig32.csv`):
* **Nine circles.**
  * The template is the isolated plotted circle d-2. The legend's circle is
    set in the text and is larger (19 px against 15 px).
  * Errors are +-0.010 in xi_0 and +-0.009 in C~_cf.
  * Each circle sits at an M_0 tick (0.60 to 1.05) within 4 px. The last
    lies between the 1.10 and 1.15 ticks, at M_0 about 1.11. The CSV notes
    give each.
* **Knechtel's curve** (ref. 19, solid), every 0.1 from xi_0 -1.0 to 0.3.
  * It runs on the C~_cf = 0 gridline from about -1.6 and cannot be
    separated from it there. The first separable point is
    (-1.325, 0.024); xi_0 -1.5 to -1.1 are not read.
  * It ends at (0.394, 2.200).
* **The theory curve** (ref. 30, dashed), from its start (-1.565, 0.050) to
  its end (-0.050, 1.595). -1.2 to -1.0 are not read (dash gaps beside
  circle d-4); 0.0 is past its end.
* **Telling the two curves apart.**
  * Below xi_0 -0.6 the two run 3 to 12 px apart and touch near -0.55. They
    were told apart from ink runs read column by column (the dashed line is
    the upper one at the left and the left-hand one above), and tracked with
    the search cut to +-4 to 6 px.
  * The overlay `overlays/rm3348_fig32.png` shows the two tracks separate
    throughout.
  * Curve errors are +-0.008 to 0.027 in C~_cf. They are dominated by the
    steep slope times the x reading error.
