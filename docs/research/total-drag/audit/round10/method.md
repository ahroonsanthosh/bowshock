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

## NASA CR-149372 (Macha), fig. 8a

File `19770008057.pdf`, SHA-256
`339f24fc82ecc0409c7bb93c83219c32caf5223241f0d452d9e4d9145ea59c18`; fig. 8a
is on PDF p. 25. Unlike the R&M pages, this page is a 300 dpi JBIG2 image of
a halftone (dithered) print, so ink is box-blurred by 2 px before any
correlation or line tracking, and by 1 px for dot finding.

**As printed.**
* Caption: "Figure 8a. Circular cylinder pressure distributions; Mach
  number = 0.6 to 0.9."
* Ordinate "PRESSURE COEFFICIENT ~ Cp", -1.6 to 1.2 by 0.4. Abscissa
  "CIRCUMFERENTIAL ANGLE ~ theta (DEGREES)", 0 to 180 by 30, labelled along
  the Cp = 0 line.
* Legend: "MACH NO." 0.6 circle, 0.7 square, 0.8 triangle, 0.9 hexagon;
  "REYNOLDS NO." .19x10^6 for all four; "DIAMETER = 1.91 cm". The circle,
  square and hexagon have a centre dot.

**Calibration** (`readings/cr149372_fig8a_calib.json`).
* 54 of 56 intersections measured; (120, 1.2) and (180, 0.8) are under the
  legend box. The legend box and the axis-label strip are left out.
* The grid is hand drawn and unevenly spaced: 213 to 228 px per 30 deg and
  287 to 300 px per 0.4 in Cp. Leave-one-out is therefore large, 3.0 px in x
  and 2.1 px in y (rms), and it sets most of the error below.
* One affine map of the same intersections leaves 0.48 deg rms (max 0.91)
  and 0.0034 rms in Cp (max 0.0070).
* Values in the CSV are from the local grid (bilinear inside each cell).
  The affine value is given beside each one (`theta_affine_deg`,
  `Cp_affine`). Over the symbols the two differ by up to 0.79 deg (rms 0.35)
  and 0.0054 in Cp (rms 0.0020).
* Scale: about 7.3 px per deg and 735 px per unit Cp, so 1 px = 0.14 deg
  and 0.0014.

**Symbols: identification.**
* Every symbol was listed by eye on gridded crops at 3.2x to 8x
  (`scripts/gridcrop.py`, 1 px blur). Each was typed by outline: round;
  square with corners; three-sided; or six-sided with left and right
  vertices and flat top and bottom. The centre dot was also used: the
  circle, square and hexagon have one, the triangle has none.
* Contact sheets of every symbol, with the legend glyph first, are in
  `overlays/cr149372_fig8a_sheet_{circ,sq,tri,hex}.png`.
* As a check, the masked correlation of each of the four legend glyphs was
  computed at each centre (`type_check` column).
  * Every triangle and every whole hexagon matches its own glyph best.
  * Circles against squares is a weak test, because the plotted circles
    (25 to 31 px) and squares (26 to 30 px) are close in size. Five circles
    (m6-02, m6-15, m6-16, m6-17, m6-20) score a little higher against the
    square. On the crops each has a round interior with no corners, so each
    is kept as a circle.
* The plotted hexagons (44 to 52 px wide) are smaller than the legend's
  (56 px), so correlation with the legend glyph is not used to centre them.
* m9-10 (theta 80.7 deg, Cp -0.978) sits below the M 0.9 plateau line, and
  no drawn line passes through it. It is read as a symbol and left out of
  the curve.

**Symbols: centring.**
* Circles, squares and hexagons are centred on their dot (`sym_refine.py`,
  `dot_types`). The dot is the point within +-6 px of the eye position where
  ink on a 2 px disc stands out most from the ring 4 to 7 px out (gridline
  pixels left out). The centre is the ink centroid within 4 px of that
  point.
* Triangles are centred by correlation with the legend triangle.
  * The reference is the glyph's bounding-box centre (1638.5, 1111.0). Its
    apex is at y 1095, its base at 1127, and its centroid 5.3 px below the
    box centre, so Cp at the centroid would be 0.007 lower.
  * A search for a dot inside the triangles found none consistently.
    Offsets scatter by +-6 px and contrast is 0.37 to 0.51 against 0.5 to
    0.75 for real dots; what it finds is the outline, or the line running
    through the triangle.
* Errors are about 2 sigma, as in the common method, with the 3.0 and
  2.1 px leave-one-out: +-0.81 to 0.88 deg and +-0.0061 to 0.0064 in Cp.
  Centres set by hand (below) carry 3 to 3.5 px: +-1.1 to 1.3 deg and
  +-0.010 to 0.011.

**What was read** (`readings/cr149372_fig8a.csv`).
* **95 symbols:** 28 circles (M 0.6), 24 squares (0.7), 21 triangles (0.8)
  and 22 hexagons (0.9).
  * Each series starts with a symbol 4.5 to 6 px right of the theta = 0
    gridline (theta 0.6 to 0.8 deg as read).
  * Each ends within 1 deg of the 180 gridline: 180.6, 181.0, 179.6 and
    180.4 deg.
  * Stagnation values as read: Cp 1.091 (M 0.6), 1.133 (0.7), 1.166 (0.8)
    and 1.209 (0.9).
* **Four faired curves,** one per Mach number, read every 2.5 deg to 90 deg
  and every 5 deg beyond. There are 147 readings.
  * The chains run through every symbol of the series except m9-10. Page
    points were added where a line bows away from the chord between two
    symbols; they are ink-run centres read along rows (`scripts/rowpeaks.py`)
    on the steep front side, or along columns past theta 150 deg.
  * Symbol masks are sized by type: radius 15, 16, 19 and 26 px.
  * Past theta 92.5 deg the curves are flat and the symbols hide much of
    each line, so the fit windows widen there from +-1.5 to 3 deg to +-4 to
    8 deg.
  * Errors are +-0.003 to 0.018 in Cp on the front side and +-0.002 to
    0.011 beyond.
  * 36 readings fall inside a symbol, where the drawn line is hidden; they
    are flagged in `notes`. The worst is M 0.9 at 37.5 deg (0.475 +- 0.016).
    There the line runs almost vertically through hexagon m9-05 (centre
    37.46 deg, 0.505), and a smooth fit cannot follow that.
* **Not read, because touching symbols hide the line** (the symbols give the
  values there):
  * every curve below 7.5 deg (M 0.8 below 10, M 0.9 below 12.5);
  * M 0.6 from 65 to 110 deg and from 165 deg;
  * M 0.7 from 67.5 to 100 deg and from 165 deg;
  * M 0.8 from 67.5 to 90 deg and at 180;
  * M 0.9 at 10, 17.5 and 27.5 deg (hexagon masks), 77.5 to 90, 160 to 170
    and 180 deg.

**Telling the M 0.6 and 0.7 lines apart past 150 deg.**
* From the cluster m6-24 and m7-21 two lines run 8 to 12 px apart. They
  touch in one ink band from x 1958 to 1978 (theta 155 to 158 deg) and then
  separate again.
* Column peaks before and after the band (x 1965: y 2590.5 and 2600.9;
  x 1980: 2601.4 and 2613.2) join only as upper to upper and lower to lower.
  Joined crosswise they would need slopes of 1.5 and 0.03 px/px, against
  0.6 to 1.0 everywhere else.
* The upper line reaches m6-25 and the lower one m7-22, and they are
  assigned to M 0.6 and 0.7 accordingly. Which symbol of the m6-24/m7-21
  cluster each leaves from cannot be seen, because the square hides it.
* A first pass without page points had put both tracks on the lower line;
  the overlay shows the corrected tracks.

**Uncertain calls.**
* m8-01 (the theta = 0 triangle): mostly hidden between m9-01 and m7-01;
  only a small triangular interior shows. Centred by correlation (score
  0.76), with a 3 px error.
* m9-12 and m9-13: two partly drawn hexagons overlapping m9-11 at Cp
  -0.919. All that shows of each is a right vertex, at x 1467 and 1488 (y
  2350), with parts of its top and bottom edges. No dot can be separated
  from the vertex strokes.
  * Each centre is set at the vertex minus a half-width of 24.5 px (the
    plotted hexagons measure 22 to 27), with a 3.5 px error.
  * This gives theta 85.8 and 88.5 deg, +-1.2. Both could instead be one
    hexagon drawn twice, or one off-curve symbol; I read them as two.
* m7-15 and m6-16 (theta 89 deg): partly drawn square and circle, sharing
  their left sides with m7-14 and m6-15.
  * The square cell has corners and the circle cell is round; neither has a
    clear dot.
  * Centres are from the outline, with a 3 px error.
* m6-27 (176.5 deg): a partly drawn circle above square m7-23, on the line
  from m6-26 to m6-28. Its outline shares m7-23's top edge and no dot
  separates. Centre from the outline, with a 3.5 px error.
* m9-22 (the 180 deg hexagon): the 180 gridline runs through its middle and
  hides the dot. Centre from its vertices and edges, with a 1.5 px error.
* m9-05: its dot is an elongated blob (14 by 8 px). The centre used
  (1086.7, 1300.9) is 2.7 px right of the outline centre (1084, 1300.5), or
  0.4 deg.

## R&M 3427 (Nash, Quincey and Callinan), fig. 13: base holes 5, 6 and 7 only

File `report.pdf`, SHA-256
`0e8b4d6629eed639e87dca2ed99eb8bf715f24ca5d5bf01c6a165249ea3c5319`; fig. 13
is on PDF p. 37 (printed p. 36), a 300 dpi CCITT page.

**Scope.** Only the upper set, labelled "Pressure tappings on base", is read.
The lower set ("On surface upstream of base", holes 1 to 4) is not registered
yet and is not read. No crop, track or symbol list was made of it; the
calibration uses the gridlines only. The overlay is cropped to the upper
set.

**As printed.**
* Caption: "Pressures on basic model. (Zero incidence.)"
* Abscissa M_inf, 0 to 1.2 by 0.2. Ordinate Cp, with an arrow showing Cp
  increasing downwards: 0 at the bottom, -0.8 at the top gridline, and the
  top frame at -0.90 (unlabelled).
* Note in the figure: "(The positions of the pressure tappings are given in
  Fig. 3)".

**Which symbol is which hole.** There is no legend. The set has three lines,
of circles (top, most negative), squares (middle) and triangles (bottom).
Circled numbers 5, 6 and 7 carry leaders, and I worked out the assignment as
follows.
* **Leader 6 ends on the circle line.** Its arrow tip is at (1437, 1710),
  where the circle line runs (pixel map); the square line is 14 px lower
  there.
* **Leader 7 ends on the triangle line,** from below, at about (1395, 1765).
* **Leader 5 does not settle it.** It comes from above and stops at
  (1383, 1731), 2 px above the circle line. To reach the square line, 10 px
  lower, it would have had to cross the circle line. Since leader 6 already
  names the circle line, 5 is the square line by elimination.
* **The report's text and other figures agree.**
  * Fig. 3 puts hole 6 at the centre of the base, hole 5 near the upper
    surface and hole 7 below the centre.
  * The text (section 3.3) says the subsonic peak suction is on the
    centre-line of the base, and uses hole 6 for comparisons. The most
    negative line is the circle line, which fits 6.
  * Fig. 16a at M 0.8 has the centre point most negative (about -0.745). The
    point on the positive y/h side is next (-0.73); fig. 16b marks positive
    y/h as towards the upper surface. The negative side is least negative
    (-0.70). Fig. 13 at M 0.8 reads circle -0.746, square -0.733 and
    triangle -0.706, the same order: square = hole 5 (upper side) and
    triangle = hole 7 (lower side).

**Calibration** (`readings/rm3427_fig13_calib.json`).
* Gridlines at M 0 to 1.2 and Cp 0 to -0.8; 34 of 35 intersections
  measured. The missing one, (0, -0.8), is under the lettering box; no data
  lie near it.
* Leave-one-out 0.37 px in x and 0.64 px in y; one affine map leaves 0.0009
  in M and 0.0018 in Cp.
* Scale: 995 px per unit M and 988 px per unit Cp, so 1 px = 0.0010 in
  each.
* Points above the -0.8 gridline are extrapolated from the cell below. The
  top frame then reads -0.901, which checks this.

**Symbols: centring** (`symlists.py`, entry `r3427f13`).
* The glyphs are small: circle 12 px, square 10 to 11 px, triangle 12 to
  14 px. Most have lines attached or a gridline through them.
* So each is centred by fitting an ideal outline of the measured size. The
  centre is the point, in 0.25 px steps within +-4 px, that maximises the
  ink on the outline stroke minus the ink inside (`outline_centre` in
  `sym_refine.py`, gridline pixels left out).
* The `glyph_score` column holds that outline score. Below 0.45 the error
  is raised, as for a low correlation score.
* h7-01 is centred by hand from its pixel map, because the M 0.4 gridline
  runs through it and its base touches the Cp -0.6 gridline.
* Errors are +-0.0018 in M and +-0.0021 in Cp (+-0.0031 and 0.0033 for low
  scores).
* Triangles are centred on their bounding box; the centroid would be about
  2 px lower, making Cp 0.002 less negative.

**What was read** (`readings/rm3427_fig13_base.csv`).
* **17 circles (hole 6),** at M 0.20, 0.40, 0.50, 0.60, 0.70, 0.80, 0.85,
  0.877, 0.90, 0.91, 0.926, 0.951, 0.965, 0.977, 1.001, 1.049 and 1.121.
* **6 squares (hole 5),** at M 0.70, 0.80, 0.85, 0.876, 0.951 and 0.967.
* **12 triangles (hole 7),** at M 0.40 to 0.965.
* **Where symbols are missing.** No square is drawn at M 0.2 to 0.6 or at
  0.90 and 0.91. There the hole 5 line is the hole 6 line: it leaves it at
  h6-04 (M 0.6), runs into it at h6-09, and leaves again below h5-05. No
  triangle is drawn at M 0.2.
* **The peak.** The three lines rise to the top frame (Cp -0.901) near
  M 0.97. A vertical line at M 0.977 +- 0.002 drops from there to circle
  h6-14 (bottom end Cp -0.830). From h6-14 one line, through circles only,
  runs to M 1.121. The text says the base readings "collapse ... to a
  single curve" there.
* **The faired lines** (hole 6, hole 5, hole 7 and the post-jump line), read
  every 0.02 in M. There are 86 readings, with errors +-0.0017 to 0.017; the
  largest are on the steep fall and rise from M 0.85 to 0.94.
  * M 0.96 is not read on the three base lines: they end between symbols
    there.
  * 0.98 and 1.12 are not read on the post-jump line: they lie inside its
    end symbols.

**Uncertain calls.**
* The hole 5 assignment rests on elimination, as above, with fig. 16a
  confirming it.
* The peak cluster (M 0.95 to 0.97). Six symbols lie within 30 px, three
  lines converge there, and the lines' last 10 px before the frame are not
  separable. h7-12 (score 0.43) carries the larger error.

## R&M 3427, figs. 9 and 10 (PDF p. 36, printed p. 35)

Both plots have axes with tick marks and no grid. They are calibrated by
`scripts/tick_calib.py`.
* Each axis line is sampled along its length and fitted with a straight
  line, which gives its tilt.
* Each tick is located by the ink centroid of its mark, and a straight line
  of value against position is fitted per axis.
* The result is written in the LocalGrid format: virtual lines through the
  ticks, parallel to the other axis. Only the two axes are listed as ink
  lines (`mask_lines`), so symbol and curve masks use only them.
* The error uses the ticks' leave-one-out. For the curves, `s_px` is
  sqrt(LOO^2 + 0.7^2) in place of 0.8 px.

**Fig. 9.** Caption: "Boundary-layer profiles on basic model, M_inf =
0.8." The abscissa is u* (0 to 1.0, ticks every 0.2) and the ordinate
"y (inches)" (0, 0.05, 0.10). Legend "Station :-": circle "At trailing
edge", square "1" upstream of trailing edge". The line is labelled "1/7 th
power law".
* **Calibration.** 503 px per unit u* and 3969 px per inch of y; the axes
  tilt by 0.39 and 0.58 deg. Tick residuals are 0.58 and 0.17 px rms, with
  leave-one-out 0.84 and 0.64 px.
* **Symbols** (`readings/rm3427_fig9.csv`): 22 circles (te-01 to te-22) and
  11 squares (up-01 to up-11), stacked almost vertically near u* = 1. Each
  is centred by an outline fit of its measured size (13 and 14 px outside),
  searched within +-3 px so that it cannot jump to a neighbour, and every
  centre was checked on a contact sheet. Errors are +-0.0046 in u* (squares
  scoring below 0.45: +-0.0068) and +-0.0005 in. in y (+-0.0008).
  * Five points read u* 1.000 to 1.003, past 1.0 by less than their error.
* **The power-law line,** read as u* at fixed y every 0.005 in., because it
  is near-vertical above y 0.03 in.
  * The symbol stack hides most of the line. Readable: y 0.005 to 0.020,
    0.040, 0.045, and 0.090 to 0.115.
  * It meets the x axis between u* 0.46 and 0.48 (merged with the axis
    there) and ends at the top at (0.996, 0.1207).
* **Uncertain calls.**
  * te-18 is typed as a circle by its round left side; its right side
    merges with the line.
  * te-21, between te-20 and the square up-11 in a stack, is typed as a
    circle: its top row is 10 px wide against 13 px for a square of its
    size.
  * Squares up-01, up-02, up-05, up-06 and up-08 are partly hidden (outline
    scores 0.41 to 0.44) and carry the larger error.

**Fig. 10.** Caption: "Variation of boundary-layer thickness with Mach
number." The ordinate is delta/h (ticks at 0.1 and 0.2) and the abscissa
M_inf (ticks at 0.5 and 1.0). The figure says "(Symbols as in Fig. 9)".
Dashed lines are labelled "Flat plate turbulent from leading edge" (upper)
and "Flat plate, laminar" (lower).
* **Calibration.** 504 px per unit M and 1987 px per unit delta/h. There
  are only three ticks per axis (with the origin), so leave-one-out is
  large: 1.77 px in x and 2.03 px in y. It sets the errors.
* **Symbols:** four squares at M 0.396, 0.800, 0.999 and 1.097 (delta/h
  0.121, 0.125, 0.116, 0.101), and one circle at M 0.797 (0.145). Errors are
  +-0.008 to 0.009 in M and +-0.0022 to 0.0025 in delta/h.
* **The two dashed lines,** every 0.05 from M 0.20 to 1.15, with errors
  +-0.0022 to 0.0029.
  * The turbulent line runs from (0.197, 0.250) to (1.183, 0.194).
  * The laminar line runs from (0.167, 0.060) to (1.179, 0.032).
  * Lettering and its two leaders are masked.

## Not read in this session

R&M 3427 fig. 15 has been calibrated (`tick_calib.py` entry `r3427f15`:
x ticks residual 0.81 px, leave-one-out 1.10 px; y 0.46 and 0.81 px), but
no symbol or line was read. Fig. 16 has not been started.
