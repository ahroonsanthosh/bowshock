# Reader A: NACA TR 1051, figure 23(b), method note

## 1. Source and rules followed

- PDF: `f23b-readers/pdf/tr1051.pdf`, copied to `f23b-readers/A/tr1051.pdf`.
  SHA-256 computed on both copies:
  `7f1ef2febdb72a404ea698b0c77d91246cf03302fd4b7ef2f125040929f5b6d4`
  (matches the brief; also in `sha256.txt`). The brief's own SHA-256 was also
  checked and matched (`87a2c839...7fbc67`).
- Figure 23(b) is on PDF page 21 of 25, printed report page 1205 (page stamp
  "1205", handwritten folio "-19-"), lower half of the left column. Panel (a)
  is above it on the same page.
- I did not open the repository or any other folder of the scratchpad; I used
  only this folder and `f23b-readers/pdf`. I used no other source for values.

## 2. Render resolution

- The page is a single embedded JPEG scan. I extracted it unresampled with
  `pdfimages -png` (2544 x 3292 px, 300 ppi, the scan's native resolution) and
  made every measurement on that image (`native-000.png`). A `pdftoppm -r 300`
  render (2546 x 3296 px) was made as a cross-check only.
- Visual inspection used crops at 1x, 2x, 3x, 4x, 8x and 10x (nearest-neighbour
  for the symbol close-ups, Lanczos for the overviews). Text pages were rendered
  at 200 dpi (pdftoppm) and read from the images, not from the OCR text layer,
  which is badly garbled.

## 3. Axis calibration

- Labelled gridlines used: all six vertical lines, d/h = 0, .2, .4, .6, .8, 1.0
  (the outer two are the frame), and all five horizontal lines, P_b = 0, -.08,
  -.16, -.24, -.32 (0 is the bottom axis, -.32 the top frame). Labels are
  printed at each line; I checked them at 1x.
- Method: pixel scan. For every second column (horizontal lines) or row
  (vertical lines) across the full plot I took the darkness-weighted centre of
  the ink within +/-14 px of the line, and fitted a straight line with
  iterative 2.5-sigma outlier rejection (to drop curve, symbol and lettering
  crossings). Fit rms 0.17 to 0.80 px per line (0.2 to 0.4 px for most).
  `overlay_grid.png` shows the fitted lines drawn on the scan; they sit on the
  printed lines everywhere.
- The scan is rotated by about 0.6 degrees (horizontal-line slope about +0.0098,
  vertical-line slopes -0.0103 to -0.0148), and the printed grid spacing is not
  uniform: 197.4 to 202.7 px per 0.2 of d/h, and 194.2 to 197.1 px per 0.08 of
  P_b (the top cell, -.24 to -.32, is the tallest). One pixel is therefore about
  0.0010 in d/h and about 0.00041 in P_b.
- Because of the uneven spacing I used a cell-local mapping, not one global
  transform. d/h is interpolated linearly between the two neighbouring vertical
  gridlines, using the symbol's signed horizontal distances to each fitted line
  at the symbol's own row. P_b is interpolated the same way between the two
  neighbouring horizontal gridlines at the symbol's own column. A global affine
  fit to the 30 gridline intersections leaves residuals up to 0.0024 in d/h and
  0.0004 in P_b. Readings from it differ from the cell-local ones by at most
  0.0016 in d/h (at d/h = 1.0) and 0.0003 in P_b.
- Final check: each reading was mapped back to pixels from the 30 intersections
  and drawn on the scan (`check_overlay.png`). Every cross lands on its symbol.

## 4. Locating each symbol

- I located the symbols by eye on 2x quadrant zooms covering the whole plot
  field (`zoom_q1.png` to `zoom_q4.png`), then checked each at 8x
  (`sheet0.png` to `sheet3.png`). There are 15 plotted symbols: 7 open circles,
  4 open triangles and 4 open squares. The legend symbols below the -.08 line
  are not data. No symbol is hidden under a curve label or the legend header.
- Centre of each symbol: I least-squares fitted an anti-aliased outline model
  to the local darkness image (window 31 x 31 px). The models were an ellipse
  for circles, a rectangle for squares, and an apex-up isosceles triangle for
  triangles, each with free centre, size and stroke width. Pixels within 1.8 px
  of a fitted gridline were masked out, as was ink belonging to the fairing
  outside the outline. The masks were updated over 4 iterations. Restarting
  from 8 perturbed starting points (0.7 px sd) gave centre scatter of at most
  0.14 px (standard deviation; largest for the squares, 0.04 px or less for the
  circles and triangles).
  Fitted outlines are drawn on 10x zooms in `fitsheet0.png` to
  `fitsheet2.png`; all sit on the printed strokes.
- Independent check for circles and squares: I measured the clean white
  interior along horizontal and vertical chords, using sub-pixel 50% edges and
  taking chord midpoints. It agrees with the outline fit within 0.16 px for
  six circles, 0.32 px for the d/h = 1.0 circle, and 0.55 px for squares.
  Sensitivity test: changing the gridline mask (1.4 or 2.4 px) and window
  (27 or 35 px) moved centres by at most 0.3 px in x and 0.72 px in y (s4).
- Triangle point convention: I give the triangle's centroid (one third of the
  height above the base), which for an equilateral template symbol is also its
  circumcentre. If the plotted point were instead the middle of the triangle's
  bounding box, P_b would be about 0.0007 more negative. The table below gives
  that value, and the difference is included in the triangle error.
- Each fitted centre was converted with the cell-local mapping of section 3.
  Values are given to 4 decimals as read. 0.0001 is a fraction of a pixel, so
  the 4th decimal is resolution, not accuracy.

### Per-symbol table (pixel coordinates in the native 2544 x 3292 image)

| id | symbol | pixel x | pixel y | fitted size (px) | stroke (px) | d/h | P_b | P_b if bounding-box middle |
|---|---|---|---|---|---|---|---|---|
| c1 | circle | 563.87 | 2512.37 | radius 5.9 x 6.0 | 2.8 | 0.3467 | -0.1722 | |
| c2 | circle | 712.79 | 2489.92 | radius 6.0 x 5.9 | 2.7 | 0.4963 | -0.1820 | |
| c3 | circle | 814.24 | 2455.16 | radius 5.9 x 6.3 | 2.6 | 0.5979 | -0.1967 | |
| c4 | circle | 914.73 | 2409.02 | radius 6.0 x 5.8 | 2.8 | 0.6973 | -0.2161 | |
| c5 | circle | 1015.01 | 2376.37 | radius 5.8 x 6.0 | 2.7 | 0.7967 | -0.2299 | |
| c6 | circle | 1114.72 | 2375.56 | radius 6.1 x 6.2 | 2.8 | 0.8973 | -0.2306 | |
| c7 | circle | 1207.01 | 2920.50 | radius 5.7 x 6.1 | 3.0 | 0.9986 | -0.0070 | |
| t1 | triangle | 514.18 | 2595.10 | base 13.3, height 10.1 | 3.1 | 0.2977 | -0.1380 | -0.1387 |
| t2 | triangle | 605.73 | 2592.77 | base 12.7, height 11.1 | 3.0 | 0.3900 | -0.1393 | -0.1401 |
| t3 | triangle | 812.87 | 2556.03 | base 13.5, height 10.3 | 2.9 | 0.5979 | -0.1553 | -0.1560 |
| t4 | triangle | 1113.65 | 2470.21 | base 12.0, height 10.4 | 2.9 | 0.8976 | -0.1918 | -0.1925 |
| s1 | square | 511.76 | 2656.91 | half-side 5.8 x 5.6 | 2.7 | 0.2961 | -0.1126 | |
| s2 | square | 612.30 | 2650.17 | half-side 5.8 x 5.8 | 2.6 | 0.3974 | -0.1157 | |
| s3 | square | 813.32 | 2622.95 | half-side 5.6 x 5.2 | 2.2 | 0.5992 | -0.1278 | |
| s4 | square | 1114.00 | 2589.46 | half-side 5.6 x 6.0 | 2.9 | 0.8996 | -0.1428 | |

(Sizes are of the stroke centreline; the outer extent is larger by half the
stroke.)

## 5. Error standard

`d_over_h_error` and `p_b_error` are one standard deviation (1 sigma) of my
reading. Each combines in quadrature:

1. Symbol-centre uncertainty per axis: the largest of 0.3 px, the sensitivity-test
   shift, and (circles, squares) the outline-fit versus chord-method
   difference. For triangles it also includes half the centroid versus
   bounding-box difference (about 0.85 px) in y. For t2 it adds a further
   0.5 px in y, because its apex is partly under the fairing.
2. Calibration uncertainty of 0.5 px per axis (gridline fit scatter plus any
   unevenness within a cell).

The result was converted with the local cell size and rounded up to the next
0.0001. It does not include how accurately the original draftsman placed the
symbols, nor any error in the underlying measurements. Those are unknown and
probably larger than the reading error.

## 6. Quoted figure text (PDF page 21, printed page 1205)

Typographic notes: "FIGURE" is printed in small capitals. The printed dash
after "23." is a long dash, which I write as [long dash]. In the curve labels,
"∞" is a subscript on M. In the legend header, "-6" is a superscript.

- Figure title (printed under panel (a)): "FIGURE 23.[long dash]Effect of support diameter on base pressure."
- Panel (a) caption: "(a) Laminar." (a speck after "Laminar" makes the full
  stop look like a semicolon in the scan.)
- Panel (b) caption: "(b) Turbulent."
- Under panel (b): "FIGURE 23.[long dash]Concluded."
- Panel letter inside the plot: "(b)".
- y axis: "Base pressure coefficient, P_b". The subscript b is smudged but
  readable at 5x. Tick labels: "-.32", "-.24", "-.16", "-.08", "0".
- x axis: "Ratio of support diameter to base diameter, d/h". Tick labels: "0",
  ".2", ".4", ".6", ".8", "1.0".
- Curve labels: "M∞=1.5" (upper curve), "M∞=2.0" (middle curve, label sits on
  the -.16 gridline), "M∞=2.9" (lower curve).
- Legend, a header row "Re x10^-6   L/h", then three rows. Each row has a
  symbol, a body sketch, Re x 10^-6 and L/h:
  - open circle, ogive-cylinder sketch (long curved nose), "4.0", "7.0"
  - open triangle, cone-cylinder sketch, "4.0", "5.0"
  - open square, cone-cylinder sketch, "7.5", "5.0"
  The legend gives no Mach number per symbol. The Mach numbers come from the
  curve labels: each symbol type lies on one labelled curve (circle on
  M∞=1.5, triangle on M∞=2.0, square on M∞=2.9).

## 7. Quoted report text

Line-end hyphens that only split a word are joined. Genuine hyphens
(boundary-layer, support-diameter, wind-tunnel, turbulent-flow, free-flight)
are kept. Italics are not marked.

What figure 23(b) shows (printed page 1205, PDF page 21, left column, between
the panels):

> "The corresponding results for turbulent boundary-layer flow are shown in figure 23 (b). At Mach numbers of 1.5 and 2.0 these data show the same trends as for laminar boundary-layer flow, but at a Mach number of 2.9 the trend is not the same. At Mach numbers near 3, and possibly higher, it appears that the relative importance of the two above-mentioned effects of increasing d/h depends on the condition of the boundary-layer flow."

The "two above-mentioned effects" (printed page 1204, PDF page 20, appendix B,
left column):

> "For a fixed Mach and Reynolds number, an increase in the support diameter brings about two different effects. First, the wake thickness is increased, thereby making it possible for lower base pressures to exist. (See fig. 6.) A second effect resulting from an increase in support diameter is that the appropriate dimensionless boundary-layer thickness δ/(h-d) is increased, thereby tending to increase the base pressure. The two effects, therefore, oppose each other. For values of d/h near unity the second effect must predominate; whereas for small values of d/h the first effect would (on the basis of fig. 6) be expected to predominate, especially at low supersonic Mach numbers."

How the models were supported (printed page 1204, PDF page 20, appendix B,
opening paragraph):

> "When a body of revolution is tested in a wind tunnel it is usually supported from the rear by a cylindrical rod. As a result the measured values of base pressure may be considerably affected, for one thing, by the presence of the support. Support interference on base pressure is a complicated function of the diameter of support rod, the unobstructed length of support rod, the Mach number, and the Reynolds number. If, as is the case for the experiments referred to herein, the support length is much greater than the base diameter, then the only appreciable interference must arise from the "diameter effect" of the rod."

Printed page 1204, PDF page 20, right column. The first sentence is about the
support-length tests of figure 22; the second covers all later tests:

> "In these experiments the model was located at a fixed position in the test section so as to eliminate possible effects of axial pressure gradients along the test section."

> "Since support lengths of over 4 body diameters have been used in all subsequent tests, it is concluded that any interference in the wind-tunnel measurements of base pressure at M=2.0 and 2.9 is not attributable to effects of support length."

Printed page 1205, PDF page 21, right column. This is in the paragraph on
figure 23(a), but it explains the d/h used elsewhere at M=2.0 and 2.9:

> "At all the other Mach numbers, where special interference measurements were not made, the base pressure was measured with a constant value of 0.4 for the ratio d/h."

Support interference in turbulent flow (printed page 1205, PDF page 21, right
column):

> "Unfortunately, an investigation of support interference for turbulent boundary-layer flow has not been made using a side support. Definite quantitative statements about the possible effects of support interference in the turbulent-flow data (figs. 14, 15, 18, 19, and 20) cannot be made at present. Evidence that the combined effects of support and wall interference are not large, however, is given by the good agreement obtained at all Mach numbers between the free-flight firings of reference 5 and the various wind-tunnel measurements (figs. 14, 15, 18, and 20)."

Support in the main body (printed pages 1195 to 1196, PDF pages 11 to 12; the
passage runs from the foot of the right column of 1195 to the top of the left
column of 1196):

> "Most of these data have been obtained from wind-tunnel measurements on bodies of revolution mounted from the rear by a cylindrical support. Accordingly, a knowledge of the possible support and wall interference effects is necessary for a satisfactory interpretation of the wind-tunnel measurements. Some experimental data on support interference and reflected bow-wave interference are presented in appendix B. It will suffice for the present purposes to state that the wind-tunnel measurements were taken with a support sting of sufficient unobstructed length so that no interference effect of support length is present in the data. Likewise, no appreciable interference resulting from the reflected bow wave is present in the data. As regards the effects of support diameter, it is known from a relatively complete set of interference measurements made by Perkins (reference 11), part of which is presented later, that the data taken at M=1.5 are essentially free of support interference. At the higher Mach numbers, however, a complete set of support-diameter interference measurements was not made. Consequently, some effect may be present in the data taken at M=2.0 and M=2.9. For consistency, these data which may be affected to a small extent by support-diameter interference have been taken with a fixed value of 0.4 for the ratio of support diameter to base diameter."

Model shapes (printed page 1196, PDF page 12, left column). These match the
legend sketches:

> "All bodies of revolution used in the present experiments consisted of either a cone-cylinder (10° semiangle of cone) or an ogive-cylinder (10-caliber ogival radius) combination."

How the turbulent models were tripped (printed page 1196, PDF page 12, right
column):

> "The experiments representing the case of laminar boundary-layer flow were conducted on bodies of revolution with polished surfaces, and those representing turbulent flow were conducted on the same models with artificial roughness added in the form of a narrow transition strip. (See reference 12.) Although for simplicity the data are referred to simply as representing either laminar or turbulent flow, in a few cases the actual boundary layer may be in the transition state. It is to be noted that with smooth models transition (insofar as it affects base pressure) probably begins at Reynolds numbers of the order of 4 million. Likewise, with roughness added in order to obtain turbulent flow, the artificial roughness may not bring about complete transition ahead of the base at Reynolds numbers less than about 2 million."

Context only, not stated for figure 23(b) (printed page 1201, PDF page 17).
The figure 20 legend lists, for other "Present tests" at M = 1.50 or 1.53,
d/h = 0.40, the remarks "Salt band attached" and ".005 in. wire attached".
The right column says:

> "second, the measurements of support interference as described in appendix B indicate that for the support dimensions used (d/h=0.25 and d/h=0.40 in fig. 20) these effects are an order of magnitude smaller than the observed discrepancies."

The left column says:

> "At a Reynolds number of 2×10^6, where turbulent flow is attained on the models by using artificial roughness, the base pressure coefficient does not differ by more than 3 or 4 percent from the value at a Reynolds numberof 1×10^7, where turbulent flow is attained without such an artifice."

("numberof" is printed run together.)

What the text does not say: which trip (strip, salt band or wire) was used on
the figure 23(b) models specifically, who made the figure 23(b) measurements
(the text credits Perkins, reference 11, only for the M = 1.5 laminar data of
panel (a)), or the support length used for figure 23(b) beyond "over 4 body
diameters ... in all subsequent tests".

## 8. Flags

- c7 (circle at d/h 0.9986, P_b -0.0070): `ambiguous`. It is an open circle,
  the M∞=1.5 legend symbol, so the primary reading is M = 1.5. But it is the
  single common end point of all three fairings. On the descending branches,
  the M∞=2.0 fairing merges into the M∞=1.5 fairing and the M∞=2.9 fairing
  joins lower down. The merged line becomes tangent to the d/h = 1.0 frame
  line in the lowest grid cell and runs down the frame to the top of this
  circle. No triangle or square is drawn at or near it: a coincident triangle
  or square of the same size would show corners outside the circle, and none
  do. So it may represent M = 2.0 and M = 2.9 as well, or be a limiting point
  (support as large as the base) rather than a measurement. The circle sits
  on the frame line, and its centre is about 17 px (0.007 in P_b) above the
  zero axis, clear of it. It is read as plotted, not as 0. All alternatives
  are in the CSV.
- No symbol is `illegible`: all 15 are sharp and clear at 8x.
- No symbol is flagged `out-of-line`. Every symbol touches its own fairing.
  Measured offsets of the symbol centre from the fairing (fairing traced
  outside the symbol and fitted, then evaluated at the symbol's x):
  - c1 +0.3 px, c2 +2.1, c3 +1.6, c4 -5.0, c5 +5.0, c6 -4.8 (fairing passes
    through its lower-left edge, on the falling branch)
  - t1 +1.2, t2 +7.5, t3 +0.6, t4 -4.3
  - s1 +1.2, s2 +5.1, s3 -3.5, s4 -2.4

  Positive means the symbol is below (less negative P_b than) the fairing.
  1 px is about 0.0004 in P_b. The largest, t2, has the fairing running along
  its apex, so the symbol hangs just below the line. It is within the symbol
  outline, so I did not flag it, but a later user should know it.
- No symbol-on-symbol `overlap`. Gridlines cross several symbols (c3, c5 and
  s3 on vertical lines; t2 has the 0.4 vertical line through its right side;
  t3 has the 0.6 vertical line through it and the -.16 horizontal line
  about 1 to 2 px above its apex tip; s2 on the 0.4 line). These were masked in the fits and do
  not change the attribution.

## 9. Notes for later users

- Counts: M = 1.5, 7 circles (6 plus the ambiguous d/h = 1.0 circle); M = 2.0,
  4 triangles; M = 2.9, 4 squares; 15 symbols in all.
- Thinnest sting with a measured symbol: M = 1.5 at d/h 0.3467 (circle c1);
  M = 2.0 at d/h 0.2977 (triangle t1); M = 2.9 at d/h 0.2961 (square s1). No
  symbol is plotted below d/h of about 0.29 at any Mach number.
- Thickest sting: d/h about 0.90 for all three Mach numbers (c6, t4, s4). The
  only symbol beyond that is c7 at d/h 1.0.
- Sting stations as plotted: circles near 0.35, 0.50, 0.60, 0.70, 0.80, 0.90
  (plus 1.0). Triangles near 0.30, 0.39, 0.60, 0.90. Squares near 0.30, 0.40,
  0.60, 0.90. The second triangle (t2) is centred about 10 px left of the 0.4
  gridline, at d/h 0.390, while the square at the same nominal station is at
  0.397. It is read as plotted and not moved to 0.4.
- The fairings start left of the first symbols: the M∞=1.5 fairing at about
  d/h 0.30, M∞=2.0 at about 0.27, M∞=2.9 at about 0.25. These line ends, the
  peak of the M∞=1.5 fairing (at about d/h 0.85, between c5 and c6), and the
  steep fall to d/h = 1.0 are fairings, not data. Nothing was read from them.
- Sign: P_b is negative throughout, as printed, with -.32 at the top of the
  axis.

## 10. Files in this folder

- `f23b.csv`: the readings (deliverable).
- `method.md`: this note (deliverable).
- `sha256.txt`: SHA-256 of the PDF (deliverable).
- `tr1051.pdf`: working copy of the PDF. `tr1051.txt`: its OCR text layer
  (pdftotext), used only to find pages.
- `native-000.png`: the extracted native page-21 scan. `r300-21.png`: the
  300 dpi render. `ov-20.png`, `ov-21.png`: 100 dpi overviews. `txt-*.png`,
  `txt*_*.png`, `q*.png`: text and caption crops used for the quotations.
- `panelb_native.png`, `zoom_*.png`, `sheet*.png`, `fitsheet*.png`,
  `overlay_grid.png`, `check_overlay.png`: inspection and check images.
- `gridfit.json`, `gridpts.npy`: the gridline fits and their intersections.
  `centres_fit.json`, `centres_inner.json`, `sens_*.json`: symbol centres from
  the outline fit, the chord method and the sensitivity runs.
  `readings_fit.json`: final readings with pixel centres. `fitmask_*.npy`:
  fit inputs per symbol.
- `scripts/`: all code used (profile, grid, intersect, overlay, sheet, measure,
  fit, fit_sens, fitsheet, todata, fairing, build_csv).
