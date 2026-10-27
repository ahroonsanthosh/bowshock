# Method note, reader A (boat-tail side and base pressures, 0014 10.7 (ae))

Reader A worked only from the brief (scratchpad/bt-readers/brief.md, SHA-256
8b5becda050d0e4519aac5abd8b05f6fe91ae748b3e97ba8874a6d7bd66d6f77) and the four
PDFs fetched from NTRS. Nothing in the bowshock repository, its website or any
other reader's folder was opened. NACA TN 3320 was not opened. In TN 3819, PDF
page 57 (figure 26) was never extracted, rendered, viewed or text-extracted;
every TN 3819 text search was limited to named pages (18 to 20, and 1 to 10 for
the symbol list).

## 1. Sources

| Report | Address fetched | Saved as | Bytes | SHA-256 |
| --- | --- | --- | --- | --- |
| NACA RM E51F26 | https://ntrs.nasa.gov/api/citations/19930086724/downloads/19930086724.pdf (citation page https://ntrs.nasa.gov/citations/19930086724) | src/19930086724.pdf | 31949777 | df0230ef9058010c7d700f2e402cfeb26cc517a3430f693d05e14a129eb559df |
| NACA TN 3819 | https://ntrs.nasa.gov/api/citations/19930084517/downloads/19930084517.pdf (citation page https://ntrs.nasa.gov/citations/19930084517) | src/19930084517.pdf | 31890253 | 9acd67dc393b26162f773602f477be6e9bf3b5e2823edb18df105a1159c9ce55 |
| NACA RM A52E20 | https://ntrs.nasa.gov/api/citations/19930087153/downloads/19930087153.pdf (citation page https://ntrs.nasa.gov/citations/19930087153) | src/19930087153.pdf | 24198134 | 2aa344c0b2c08e51f3625f060ccc1b1dc11d52d596213e597704cbe5ea5f85b7 |
| NACA TN 3372 | https://ntrs.nasa.gov/api/citations/19930084618/downloads/19930084618.pdf (citation page https://ntrs.nasa.gov/citations/19930084618) | src/19930084618.pdf | 9987330 | f4a0718433d73bd9db7c9b6bb71cd3e73e7793565380610da42c4823fe88bcdf |

Each file's byte size equals the server's Content-Length and its MD5 equals the
server's ETag (checked again after each of the two container restarts). Each
file as served starts with a 436-byte binary block before `%PDF`; that is how
NTRS serves them, and poppler reads them normally. Page counts: RM E51F26 60,
TN 3819 68, RM A52E20 50, TN 3372 22. Every page is one RGB JPEG scan at 300 dpi
(Acrobat Paper Capture, with an OCR text layer).

Resolution: the 300 dpi JPEG of each page was extracted unchanged
(`pdfimages -j`), so the measurement works on the scan's own pixels and nothing
is resampled. That is the highest resolution the scans support; rendering
higher would only interpolate. For looking at small symbols, crops were enlarged
by whole factors (2 to 18 times, nearest neighbour), but every coordinate below
is in native 300 dpi pixels of the page image. Landscape figures (TN 3819
figures 21, 23, 24 and 25) were read on the page image rotated 90 degrees
clockwise (PIL rotate 270 with expand), so their pixel coordinates refer to that
rotated image (3096 or 3092 px wide).

## 2. What was opened, in order (rule 9)

1. brief.md.
2. Downloaded the four PDFs (curl, the NTRS `api/citations/.../downloads/...pdf` addresses) into A/src.
3. `pdfinfo` on each PDF (metadata only).
4. `pdfimages -list` (image metadata only) for the brief's pages: RM E51F26 pp 5, 6, 7, 28, 29, 30, 48, 56, 57; TN 3819 pp 18, 19, 20, 50, 52, 54, 55, 56; RM A52E20 pp 6, 26, 44; TN 3372 pp 4, 9, 10, 19, 20.
5. Extracted those pages' scans (`pdfimages -j`) into A/render.
6. OCR text (`pdftotext`) of RM E51F26 pp 5 to 7.
7. RM E51F26 pp 6, 7 and 5: scans viewed.
8. RM E51F26 p 28 (figure 6): scan viewed, rotated, whole and in native crops.
9. RM E51F26 p 29 (figure 7): scan viewed whole and in crops.
10. Re-check of the PDFs after the first container restart (hashes, sizes, server ETag and Content-Length by HEAD request).
11. RM E51F26 p 30 (figure 8).
12. RM E51F26 p 48 (figure 24).
13. RM E51F26 p 4 (symbol list, report p. 3; outside the brief's list): OCR text and scan, to state what Cp, Cp,b, C'p,b, CD and the subscripts mean.
14. RM E51F26 pp 56 and 57 (figures 29 and 30).
15. RM E51F26 OCR text layer of all 60 pages searched with grep for "bleed" (only the matching lines were read).
16. RM E51F26 OCR text of p 3 (summary) and p 19 (drag discussion), to confirm that "base bleed" means small amounts of jet air.
17. RM E51F26 p 22 (reference list): OCR text and scan, for references 1 and 6.
18. TN 3819 OCR text of pp 18 to 20 only, then their scans.
19. TN 3819 p 50 (figure 19).
20. TN 3819 OCR text of pp 1 to 10 searched with grep for the symbol list; p 6 (symbols) OCR text and scan, for the definition of PB.
21. TN 3819 p 52 (figure 21).
22. TN 3819 p 54 (figure 23).
23. TN 3819 p 55 (figure 24).
24. TN 3819 p 56 (figure 25, both parts on one page; part (a) looked at for its labels only).
25. RM A52E20 p 6: OCR text and scan.
26. RM A52E20 p 26 (figure 1(c)).
27. RM A52E20 p 44 (figure 15).
28. RM A52E20 OCR text of pp 1 to 8 searched with grep for the symbol list; pp 4 and 5 (symbols) OCR text and scans, for the definition of Pb, Re and the subscript 0.
29. TN 3372 p 4: OCR text and scan; then pp 9 and 10 (figure 1).
30. TN 3372 pp 19 and 20 (figures 10 and 12).
31. TN 3372 OCR text of pp 1 to 8 searched with grep for the coefficient definition; pp 5 and 7 OCR text and scans (definition of delta p/q; discussion of configuration D).
32. Re-check of the PDF hashes after the second container restart.
33. RM E51F26 OCR text of pp 1 to 24 searched with grep for transition, boundary layer, wire, trip, Reynolds.
34. RM E51F26 OCR text of pp 8, 11, 15 and 19 (transition and boundary-layer passages) and the scan of p 11.
35. Further crops of pages already listed (figure 6 radii, figure 24 legend, figure 29 and 30 curves, page 7 test conditions) while writing the CSVs.

The OCR text layer was used only to find passages; every number taken from text
was checked on the scan.

## 3. How the figures were read (common method)

Scripts are in A/scripts (run with `python3 -I`, paths as arguments); the
per-figure inputs are the A/scripts/cfg/*.py files, which hold every hand-placed
start position, manual centre and judgement listed below. Outputs, overlays and
contact sheets used for checking are in A/work.

Axis calibration. Each grid or axis line was located on the scan by taking, row
by row (or column by column) along the line, the darkness-weighted centre of the
stroke, rejecting rows where a symbol, curve or text crosses it (stroke wider
than 7 px, 12 px for the heavy axes of RM A52E20 figure 15), and fitting a
straight line robustly through those centres. This follows any small rotation of
the scan. Each axis was then calibrated by one least-squares fit,
value = a + b*u + c*v (u, v the pixel coordinates), through the labelled lines
sampled at three stations along each line; at least three labelled lines per
axis were used everywhere. The unlabelled grid lines between labels, valued from
the regular spacing of the labels, were located the same way and used only as
checks. Every line's position and residual (labelled value minus fitted value,
converted to px) is in section 7. Where a panel prints no tick labels of its own
it shares its grid with a labelled neighbour (same rows or same columns); the
note column says so for those panels.

Symbol centres. Long horizontal and vertical straight lines (grid and axes) were
removed from a copy of the page by a morphological opening (runs of 61 px or
more), so that grid lines through a symbol do not pull the fit. Each symbol was
then matched by normalised cross-correlation with a drawn template of its own
shape (open circle, square, diamond, triangle), its size fitted on clean symbols
of the same figure (and, where symbols in one figure differ in size, chosen per
point within a range), searched within a few px of a hand-placed start, with
sub-pixel peak refinement. Every fit was checked by eye on a contact sheet with
the fitted outline drawn over the 8 times enlarged scan. The fit was repeated
four ways (grid lines kept in the image; template 0.5 px smaller; 0.5 px larger;
thinner stroke). Where symbols overlap and those variants move the centre by more
than 1 px, the variant reading is given in `alternatives` and the row is flagged
`ambiguous`. Where a symbol carries a printed centre dot and its outline is
crowded by neighbours (RM A52E20 figure 15, TN 3372 figure 10), the centre is the
dot's own centroid, and the outline-fit centre is given as an alternative when
the two differ by more than 2.5 px. Where a symbol is cut by others, very faint,
or merged with a grid line, its centre was placed from the pixel map (printed
character maps of the scan) and the note says which edges were used.

Triangles. The point a triangle marks is not defined by the drafting; the
template fit gives the centroid of the outline. For every triangle the centre of
its bounding box is given as an alternative (it lies a quarter of the half-height
lower for an upward triangle) and the row is flagged `ambiguous`.

Reading error (in each note). For each point: the root sum square of the
centre-finding uncertainty (0.7 px for clean symbols, 1 to 2.5 px for crowded,
faint or hand-placed ones, plus half the dot-to-outline offset where a dot was
used) and the axis's calibration rms over all its lines, converted to axis
units. It does not include any error of the original plotting.

Values. Nothing is rounded beyond the printed digits: x and y are given to about
one tenth of a pixel's worth (3 decimals in x, 4 in y for coefficients); no value
was smoothed, corrected or interpolated. Curves read by name are read at the
column where the stroke actually is, with no bridging of dash gaps.

Signs. On every figure here the coefficient axes are printed with their signs;
the calibrations use the printed signs, including the axes that increase
downward (TN 3372 figures 10 and 12, where values below the zero line are
positive) and those with negative values at the top (TN 3819 figures 19, 21, 23
to 25; RM A52E20 figure 15).

Mach column. Where the figure plots against Mach number (TN 3819 figure 21,
RM A52E20 figure 15, TN 3372 figures 10 and 12) the mach column repeats the x
reading. Where a figure gives one Mach number in its caption or panel title, that
number is entered. For RM E51F26, whose figures do not print a Mach number for
the data, 1.91 is the free-stream Mach number of the tests from the text
(PDF p. 7), and each note says so.

## 4. Figure by figure: what was read and the judgement calls

RM E51F26 figure 7 (PDF p. 29). Three panels, boattail angle 5.63, 7.03 and
9.33 deg, Db/Dm 0.506, alpha 0, no jet (caption). Symbols: circle theta 15 deg,
square 50, diamond 90 (legend). All 51 symbols read; the dashed lines are
fairings and were not read. Template sizes: circle radius 10 px, square half-side
10.5 px, diamond half-diagonal 14.5 px. Panels (a) and (b) carry no x labels;
their grid columns continue those of panel (c), labelled 9.0 to 12.0 in body
diameters. Overlaps: at several stations the circle is drawn inside the square
(same centre) or two symbols touch; each is read separately and noted. At
(a) x 11.67 the circle sits inside the square and its fit is pulled by the
square (variant spread 1.2 px): flagged with the variant reading. At (b) x 11.68
the square and circle coincide: flagged likewise. At (c) x 11.83 three symbols
overlap; the circle's start had to be moved 2.7 px to fit the visible arc; its
reading error is set to 1.5 px.

RM E51F26 figure 8 (PDF p. 30). Db/Dm 0.704, three panels as above, alpha 0, no
jet. Template sizes: circle 11.5 px, square 11.5 px, diamond 16 px. 37 symbols.
Panel (a) has no x labels (its columns continue panel (c)'s, 10.0 to 12.0);
panel (b) has neither x nor y labels of its own (y from panel (a)'s labels on the
same rows; x from the labels 10.0 to 12.0 printed under the lower right grid,
whose columns continue panel (b)'s). At (b) x 10.5 only a circle and a square are
plotted, and at (c) x 11.82 only a square and a diamond: no point is missing from
the reading. At (b) x 11.0 the three symbols overlap in a column (circle between
square and diamond); the circle's centre comes from its visible arcs. At (c)
x 10.80 a circle is drawn inside the diamond on the Cp = 0 line, and at (c)
x 11.30 a square and a diamond share one centre (an eight-pointed star). At (a)
x 10.18 the square overlaps the circle and diamond above and below it; its fit
moves 1.6 px between variants (flagged, variant given). Cross
check, not a correction: the x stations read in panels (a) and (c) agree within
0.01 body diameter with the orifice stations of figure 6 taken with Dm = 1.5 in;
in panel (b) the first three stations read about 0.03 to 0.04 diameter
downstream of those implied by figure 6 (10.47, 10.97, 11.40). The readings are
as plotted.

RM E51F26 figure 24 (PDF p. 48). The axis reads "Base pressure coefficients,
Cp,b and C'p,b". The legend gives: plain circle Db/Dm 0.506 Cp,b; flagged circle
0.506 C'p,b; plain square 0.704 Cp,b; flagged square 0.704 C'p,b; diamond 1 C'p,b;
right-triangle "Model from reference 6". The symbol list (PDF p. 4) defines
Cp = (p - p0)/q0 (free stream, subscript 0) and C'p,b = (pb - p1)/q1 (conditions
just upstream of the base); Cp,b is therefore the free-stream coefficient at the
base. Each row's y_quantity says which. The legend gives no Mach number for any
point: the labels M1 = 1.30, 1.91, 2.10 and 3.50 belong to the predicted C'p,b
curves (solid) and the dashed curves are predicted Cp,b; none was read. 14
points. At 7.03 deg the flagged circle and the flagged square touch, their left
walls merge with the 7 deg grid line and predicted curves cross them; x was set
to the midpoint of their left and right walls from the pixel map (1356 px), y from
the template fit, and the template-fit x is given as an alternative. The triangle
has no Mach number in the figure; its centre is the middle of its bounding box,
with the corner centroid as alternative. The 5.63 deg Db/Dm 0.704 points carry
the text's statement (PDF pp. 11, 15) on early transition.

RM E51F26 figure 29 (PDF p. 56). Db/Dm 0.506, alpha 0, no jet; CD = drag over
q0 pi Dm^2/4 (symbol list). Panel (a): "Experimental base drag" circles (4, one at
epsilon 0 on the axis) read; "Friction (Cf = 0.003)" is drawn only as a curve
and was read at 5.63, 7.03 and 9.33 deg (flag `curve`; it is an estimate with an
assumed friction coefficient, not a measurement); "Predicted base drag" is a
method's curve and was not read. At 5.63 deg the predicted curve runs 18 px below
the friction curve; the upper stroke, the one the label Friction leads to, was
read. Panel (b): "Experimental (0.83 characteristics)" circles read (3); the
linearized-theory, reference 4 and characteristics lines were not read. Panel (c):
"Pressure drag" circles read (3); "Experimental pressure drag plus friction drag"
is drawn only as a curve and was read at the three tested angles (flag `curve`).
Circle sizes differ between panels (radius 12.5 to 14.5 px) and were fitted per
panel.

RM E51F26 figure 30 (PDF p. 57). Db/Dm 0.704, alpha 0, no jet. Read as figure 29
(circles in (a), (b), (c); friction curve in (a); pressure plus friction curve in
(c)). Not read under rule 8: the square symbols "Experimental base drag with base
bleed" in (a) and "Pressure drag with base bleed" in (c). The text (PDF pp. 3,
19, 22) says base bleed is a small amount of jet air (jet pressure ratio 1 or
less), so these are jet-flow points. Not read under rule 7: "Predicted base drag"
in (a) and the theory lines in (b). The pressure-plus-friction curve in (c) ends
at about 9.2 deg where it meets its label, short of 9.33 deg; that value is left
empty and flagged `untraced` rather than extrapolated. The friction curve's last
reading (9.33 deg) is on the flat end where it runs into its label leader.

TN 3819 figure 19 (PDF p. 50). Cone-cylinders, sketch: 15 deg cone, 1 in
diameter, longest body 5 in. Three panels, M infinity 2.41, 1.93, 1.62. Circle and
square give two Reynolds numbers per inch per panel; the legend gives no source.
24 points. The solid line ("Present estimate") was not read. Panels (a) and (b)
carry no x labels; their 12 columns from 0 to 6 match panel (c)'s labels.
Overlaps: at L/D 2 in (a) and at L/D 3, 4 in (c) circle and square overlap; at
(b) L/D 4 the circle covers the lower half of the square and the square has no
visible bottom edge, so its centre comes from its top edge, side walls and the
end of its right wall; the alternative assumes its hidden bottom coincides with
the circle's bottom (flagged). At (a) L/D 5 the square's bottom edge lies on the
panel border; the variant fit moves 1.2 px (flagged).

TN 3819 figure 21 (PDF p. 52). "Effects of Mach number upon the base pressure of
10 deg cone-cylinders of fineness ratio 5"; legend: "All experimental points
taken from compilation of Ref. 2". The legend does not say what the symbol
shapes stand for (plain circles, circles with a tick at upper right, squares,
triangles, one diamond); series names the shape only. 40 rows. The Chapman
(ref. 2) curve and the present estimate curves were not read. Judgement calls:
in the cluster at M about 1.25 one circle is overlapped on three sides and its
centre comes from its free top arc and right side; at M about 1.81 a short second
arc lies 3 px outside a circle's lower left, read as a possible second circle
(flagged, alternative: not a separate point); at M about 1.89 a circle half
hidden inside its neighbour is centred from its right side and the arcs visible
inside the other circle; the diamond at M 2.92 is drawn taller than wide and its
centre is the middle of its bounding box. The four triangles carry the
bounding-box alternative.

TN 3819 figure 23 (PDF p. 54). M infinity about 2.9 (caption). Legend: triangle
Ames (sketch of a pointed-nose body with a long afterbody), circle NOL ref. 5
(conical nose, cylinder, conical boattail), square Ames (simple cone). The text
(p. 17) says negative boattailing means simple cones. 11 points: 3 squares,
5 circles, 3 triangles. Chapman, Cortright-Schroeder and present-estimate lines
not read. The triangle at 0 deg and at 8.8 deg are crossed by those lines; the
triangle at 15.3 deg has its left half hidden behind the circle at 15.0 deg.

TN 3819 figure 24 (PDF p. 55). M infinity 1.91 (caption); panel (a) h/D 0.506,
(b) h/D 0.704; circles "Exp. mean value, Cortright-Schroeder" (6). The estimate
and present-method lines were not read. Panel (b) has no y labels of its own; its
rows are valued from panel (a)'s labels on the same rows. The text (p. 17) says
the boundary layer of the experimental result at beta 5.63 deg was inadvertently
thickened; that note is on the (b) 5.63 deg row.

TN 3819 figure 25(b) (PDF p. 56). M infinity 3.24; circles "Exp. ref. 5" (5).
Part (a) is calculated and was not read; its axis label gives the model's body
diameter, 1.97 in. The present-method curves in (b) were not read. The circle at
0 deg sits on the beta = 0 axis line.

RM A52E20 figure 15 (PDF p. 44). "Comparison of base pressure coefficient with
and without boattailing (corrected for condensation)"; (a) laminar boundary layer,
Re = 3.0 x 10^6; (b) turbulent boundary layer, Re = 5.0 x 10^6 (Re based on model
length, symbol list). Pb = (pb - p0)/q0, free-stream (symbol list, PDF p. 4).
Plotted symbols: circles "From Ref. 4" (ogive-cylinder l/d 7, no boattail),
squares "From Ref. 10" (a) or "From Ref. 11" (b), and in (b) a flagged square
"From unpublished data NACA Ames 1- by 3-foot SSWT" (ogive-cylinder with
boattail, l/d 7). 8 symbols, all at M about 1.5, 2.0 and 2.9, outside the present
tests' range. The present tests themselves (model 3 without and model 8 with the
boattail, M about 2.6 to 4.7) appear only as a solid and a dashed line: the brief
does not name these curves, so under rule 7 they were not read; each has an
`untraced` row so that the omission is visible. The vacuum-limit curve is theory
and was not read. Each symbol has a centre dot, used as the centre.

TN 3372 figure 10 (PDF p. 19). Configuration D (caption). Squares edge orifice,
circles center orifice (legend); one model of configuration D was flown (text).
delta p/q = (base pressure - free-stream static pressure)/free-stream dynamic
pressure (text, PDF p. 5); the axis is printed with -.08 at the top and .16 at
the bottom. 47 rows (23 squares, 24 circles). Every symbol has a centre dot,
taken as its centre; where the dot is missing or merged with a stroke the outline
fit is used. Between M about 1.05 and 1.09 the scan is very faint: the squares at
M 1.060 and 1.089 were centred from their visible edges; the square at M 1.080
from its faint dot (alternative: midway between its faint edges); at M 1.070 only
fragments of a square (parts of two side walls, a corner and perhaps a dot) are
visible, read as a square and flagged with the alternative that there is no
symbol there. The circles at M 1.079 and 1.089 are faint but have dots. The
center-orifice circle at M 0.970 has its dot on the 0.12 grid line; its centroid
was taken from the pixel map.

TN 3372 figure 12 (PDF p. 20). Configuration D appears only as two dashed curves
("Config. D edge orifice", "Config. D center orifice"); all its rows are flagged
`curve`. The curves were traced along hand-placed guides: at each 1 px step the
dark stroke nearest the guide was found across the guide (ink centre, within
7 px); dash gaps give no point. Points were kept at the first and last stroke
found, at every local extreme in y (the cusps at M about 0.967 and 0.972) and
otherwise whenever the trace had moved 20.6 px in x (0.01 in M) or 25.8 px in y
(0.01 in delta p/q) from the last kept point. 35 points on the edge curve, 34 on
the center curve. The A, B, C curves on the same figure were not read.

## 5. Geometry (geometry.csv)

Values are as printed. Derived quantities (body diameter 1.5 in for RM E51F26,
model 8's base diameter and length for RM A52E20) are marked as derived in the
note and never replace a printed value. Judgement calls: in RM E51F26 figure 6 the
labels "0.75 r", "0.46 r", "0.56 r", "0.66 r", "0.528 r", "0.45 r" and "0.38 r"
are read as radii in inches (drafting "r" = radius): 0.75 in is the body radius
(Dm 1.5 in from 18 in and fineness ratio 12), 0.528 in and 0.38 in are 0.704 and
0.506 times it, and the three base-orifice rings of figure 6(a) measured on the
drawing lie at 0.63, 0.74 and 0.87 of the body radius, matching 0.46, 0.56 and
0.66 in. Orifice stations are given as distances ahead of the base, summed from
the dimension chains. RM A52E20 figure 1(c) is a photograph: the text gives
d = 1.25 in and base diameter 0.604 d, the photo label l/d = 7.0; the boattail
length and profile are not given anywhere read, and the photograph's inch scale
is not consistent with those numbers (overall length about 9.2 in and a length to
diameter ratio near 9 when measured on the print), so no dimension was taken
from the photograph. TN 3372 figure 1's end-view diameters 2.9 and 1.5 in are not
named in the sketch.

## 6. Flagged points

Every row whose flag is not `ok` is listed here with what was seen (the full
note is in the CSV).

rme51f26_fig7.csv:

- fig. 7(a), theta 15 deg (circle), x 11.671, y -0.0182: ambiguous. Seen: circle drawn inside the square. Alternatives: y -0.0179 (x 11.671) if the centre comes from a variant fit (template 0.5 px smaller) that the overlapping strokes pull 1.2 px away.
- fig. 7(b), theta 50 deg (square), x 11.676, y -0.0369: ambiguous. Seen: circle drawn inside the square. Alternatives: y -0.0372 (x 11.676) if the centre comes from a variant fit (grid lines kept in the image) that the overlapping strokes pull 1.2 px away.

rme51f26_fig8.csv:

- fig. 8(a), theta 50 deg (square), x 10.176, y 0.0032: ambiguous. Seen: symbols overlap at this station. Alternatives: y 0.0028 (x 10.176) if the centre comes from a variant fit (grid lines kept in the image) that the overlapping strokes pull 1.6 px away.

rme51f26_fig24.csv:

- fig. 24, flagged circle, Db/Dm 0.506, C'p,b, x 7.073, y -0.0323: ambiguous. Seen: flag at lower left; symbol touches the flagged square below it and is crossed by the predicted C'p,b lines; its left wall merges with the 7 deg grid line, so x is taken from the pixel map as the midpoint of the left and right walls (1356 px) and y from the template fit. Alternatives: y -0.0323 (x 7.082) if x is taken from the template fit, which the merged grid line and curves pull to 1357.2 px.
- fig. 24, flagged square, Db/Dm 0.704, C'p,b, x 7.074, y -0.0354: ambiguous. Seen: flag at lower left; square touches the flagged circle above it, its left side lies on the 7 deg grid line and predicted C'p,b lines cross it; x is taken from the pixel map as the midpoint of the left and right walls (1356 px) and y from the template fit. Alternatives: y -0.0354 (x 7.064) if x is taken from the template fit, which the merged grid line pulls to 1354.7 px.
- fig. 24, triangle, model from reference 6, x 4.499, y -0.0697: ambiguous. Seen: right-triangle symbol as in the legend (right angle at lower right: vertical side on the right, horizontal side at the bottom, hypotenuse rising to the right); point taken at the centre of the symbol's bounding box (x 1011..1037, y 1730..1755 px); the alternative takes the area centroid of the three vertices (1028.3, 1746.7 px); Mach number not given in the figure for this model; the reference list (PDF p. 22) gives reference 6 as NACA RM E50D10, RM-10 missile at Mach numbers from 1.49 to 1.98. Alternatives: y -0.0704 (x 4.533) if the point is the centroid of the triangle's three corners rather than the centre of its bounding box.

rme51f26_fig29.csv:

- 6 rows flagged `curve` (experimental pressure drag plus friction drag (curve only, panel (c)); friction drag, Cf = 0.003 (curve only, panel (a))): values read on drawn curves, see section 4.

rme51f26_fig30.csv:

- fig. 30(c), experimental pressure drag plus friction drag (curve only, panel (c)), x 9.33, y (empty): untraced. Seen: the curve ends at about 9.2 deg (x about 1328 px, y about 1877 px) where it meets its label, short of 9.33 deg; not extrapolated, so no value; x is the stated value, not read from the axis (read 9.200).
- 5 rows flagged `curve` (experimental pressure drag plus friction drag (curve only, panel (c)); friction drag, Cf = 0.003 (curve only, panel (a))): values read on drawn curves, see section 4.

tn3819_fig19.csv:

- fig. 19(a), square, R/inch 1.00 x 10^6, x 5.009, y -0.1230: ambiguous. Seen: circle and square overlap at this station; the square's bottom edge lies on the panel's bottom border line (-0.12); legend gives no source for the data. Alternatives: y -0.1227 (x 5.009) if the centre comes from a variant fit (grid lines kept in the image) that the overlapping strokes pull 1.2 px away.
- fig. 19(b), square, R/inch 1.20 x 10^6, x 4.013, y -0.1642: ambiguous. Seen: circle and square overlap at this station; the circle covers the square's lower half and no bottom edge of the square is visible: centre taken from the top edge (1593.5 px), the side walls (1326.5 and 1347 px) and the end of the right wall (about 1612 px), from the pixel map; legend gives no source for the data. Alternatives: y -0.1635 (x 4.013) if the square's hidden bottom edge is taken to coincide with the circle's bottom.

tn3819_fig21.csv:

- fig. 21, triangle, x 1.535, y -0.1888: ambiguous. Seen: triangle centre taken at its centroid (template fit); overlaps neighbouring symbols. Alternatives: y -0.1896 (x 1.535) if the point is the centre of the triangle's bounding box rather than its centroid.
- fig. 21, triangle, x 1.502, y -0.1802: ambiguous. Seen: triangle centre taken at its centroid (template fit); the -0.18 grid line runs through the triangle. Alternatives: y -0.1810 (x 1.502) if the point is the centre of the triangle's bounding box rather than its centroid.
- fig. 21, triangle, x 1.501, y -0.1690: ambiguous. Seen: triangle centre taken at its centroid (template fit). Alternatives: y -0.1699 (x 1.501) if the point is the centre of the triangle's bounding box rather than its centroid.
- fig. 21, circle (possible second circle), x 1.809, y -0.1673: ambiguous. Seen: only a short arc, about 3 px outside the lower left of the circle at about M 1.81, shows here: it may be a second circle almost on top of the first or a redrawn outline; centre estimated by shifting the first circle 3 px along that direction. Alternatives: not a separate point: a redrawn outline of the circle at about M 1.81, PB -0.168.
- fig. 21, triangle, x 2.067, y -0.1280: ambiguous. Seen: triangle centre taken at its centroid (template fit). Alternatives: y -0.1288 (x 2.067) if the point is the centre of the triangle's bounding box rather than its centroid.

tn3819_fig23.csv:

- fig. 23, triangle, Ames, x 0.003, y -0.1011: ambiguous. Seen: triangle centre taken at its centroid (template fit); predicted curves cross the triangle and hide part of it. Alternatives: y -0.1019 (x 0.003) if the point is the centre of the triangle's bounding box rather than its centroid.
- fig. 23, triangle, Ames, x 8.825, y -0.0795: ambiguous. Seen: triangle centre taken at its centroid (template fit); the -0.08 grid line and predicted curves cross the triangle. Alternatives: y -0.0803 (x 8.826) if the point is the centre of the triangle's bounding box rather than its centroid.
- fig. 23, triangle, Ames, x 15.268, y -0.0636: ambiguous. Seen: triangle centre taken at its centroid (template fit); left half hidden behind the circle at about 15 deg. Alternatives: y -0.0644 (x 15.268) if the point is the centre of the triangle's bounding box rather than its centroid.

rma52e20_fig15.csv:

- fig. 15(b), square, From Ref. 11, x 2.904, y -0.0623: ambiguous. Seen: centre dot visible; the square sits on the dashed present-tests curve for model 8; turbulent boundary layer, Re = 5.0 x 10^6 (panel title). Alternatives: y -0.0617 (x 2.899) if the centre is taken from the outline fit instead of the centre dot.
- fig. 15(a), Present tests, Model 3 (solid line), x (none), y (empty): untraced. Seen: drawn only as a curve (a fairing of the present tests, no symbols); the brief does not name this curve, so under rule 7 it is not read; it spans about M0 2.6 to 4.7 (a second solid curve, the vacuum limit -2/(gamma M0^2), is theory) in this panel; laminar boundary layer, Re = 3.0 x 10^6 (panel title).
- fig. 15(a), Present tests, Model 8 (dashed line), x (none), y (empty): untraced. Seen: drawn only as a curve (a fairing of the present tests, no symbols); the brief does not name this curve, so under rule 7 it is not read; it spans about M0 3.1 to 4.7 in this panel; laminar boundary layer, Re = 3.0 x 10^6 (panel title).
- fig. 15(b), Present tests, Model 3 (solid line), x (none), y (empty): untraced. Seen: drawn only as a curve (a fairing of the present tests, no symbols); the brief does not name this curve, so under rule 7 it is not read; it spans about M0 2.6 to 4.7 (a second solid curve, the vacuum limit -2/(gamma M0^2), is theory) in this panel; turbulent boundary layer, Re = 5.0 x 10^6 (panel title).
- fig. 15(b), Present tests (dashed line, model 8 per the legend sketch), x (none), y (empty): untraced. Seen: drawn only as a curve (a fairing of the present tests, no symbols); the brief does not name this curve, so under rule 7 it is not read; it spans about M0 2.6 to 4.7 in this panel; turbulent boundary layer, Re = 5.0 x 10^6 (panel title).

tn3372_fig10.csv:

- fig. 10, square, Edge orifice, x 0.910, y 0.0454: ambiguous. Seen: overlaps its neighbours. Alternatives: y 0.0462 (x 0.909) if the centre is taken from the outline fit instead of the centre dot.
- fig. 10, square, Edge orifice, x 0.918, y 0.0520: ambiguous. Seen: overlaps its neighbours; no clean centre dot: centre taken midway between its edges (x 1216 to 1237, y 682 to 708 px) from the pixel map. Alternatives: y 0.0525 (x 0.920) if an irregular mark inside the square, 5 px right of the outline centre, is its centre dot.
- fig. 10, square, Edge orifice, x 0.930, y 0.0520: ambiguous. Seen: overlaps its neighbours. Alternatives: y 0.0519 (x 0.928) if the centre is taken from the outline fit instead of the centre dot.
- fig. 10, square, Edge orifice, x 0.965, y 0.0840: ambiguous. Seen: a clear symbol whose printed centre dot lies more than 2.5 px from the centre of its outline. Alternatives: y 0.0849 (x 0.964) if the centre is taken from the outline fit instead of the centre dot.
- fig. 10, square, Edge orifice, x 1.000, y 0.0086: ambiguous. Seen: overlaps its neighbours. Alternatives: y 0.0075 (x 0.998) if the centre is taken from the outline fit instead of the centre dot.
- fig. 10, square, Edge orifice, x 1.070, y -0.0277: ambiguous. Seen: barely visible on the scan: parts of a left edge (x about 1526 px, y 482 to 499), a right edge (x about 1552, y 486 to 505), a top corner (y about 479) and a possible centre dot (1541, 491.5); centre from the pixel map. Alternatives: no symbol at this place (the strokes could be scan residue of the neighbouring squares).
- fig. 10, square, Edge orifice, x 1.080, y -0.0329: ambiguous. Seen: faint on the scan: centre taken at the faint centre dot (1561.6, 478.3 px); left edge, bottom edge (about 491 px) and right edge partly visible. Alternatives: y -0.0328 (x 1.078) if the centre is taken midway between the faint left edge (x about 1546 px) and the right edge (about 1570 px) instead of at the faint centre dot.
- fig. 10, circle, Center orifice, x 1.079, y -0.0061: ambiguous. Seen: faint on the scan (outline partly missing); centre dot visible. Alternatives: y -0.0053 (x 1.078) if the centre is taken from the outline fit instead of the centre dot.
- fig. 10, circle, Center orifice, x 1.129, y -0.0193: ambiguous. Seen: overlaps its neighbours. Alternatives: y -0.0184 (x 1.128) if the centre is taken from the outline fit instead of the centre dot.
- fig. 10, circle, Center orifice, x 1.140, y -0.0219: ambiguous. Seen: overlaps its neighbours. Alternatives: y -0.0214 (x 1.138) if the centre is taken from the outline fit instead of the centre dot.
- fig. 10, circle, Center orifice, x 1.160, y -0.0260: ambiguous. Seen: a clear symbol whose printed centre dot lies more than 2.5 px from the centre of its outline. Alternatives: y -0.0269 (x 1.158) if the centre is taken from the outline fit instead of the centre dot.

tn3372_fig12.csv:

- 69 rows flagged `curve` (Config. D center orifice (dashed curve); Config. D edge orifice (dashed curve)): values read on drawn curves, see section 4.

No point in any figure was left illegible: every symbol found could be given a
value, with the doubts above carried in `alternatives`.

## 7. Axis calibration of every figure

All pixel positions are on the 300 dpi page scan (rotated 90 deg clockwise for
TN 3819 figures 21, 23, 24 and 25). "Band start, mid, end" are three stations
along the line (top, middle, bottom for a vertical line; left, middle, right for
a horizontal one), showing the scan's slight rotation. The residual is the line's
value minus the fitted value, in px. Unlabelled grid lines are summarised by
count and largest residual; they were valued from the regular spacing of the
labels and not used in the fit. The rms includes them, and enters every point's
reading error. The largest residuals (up to about 3 px, RM E51F26 figure 24 and
TN 3372 figure 10) come from unevenly ruled grids, not from the line finder (the
scatter of each line's own fit is 0.1 to 0.5 px).

RM E51F26 fig. 7, PDF p. 29, panel a (plot box [513, 334, 1934, 919] px; scan 300 dpi):

| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |
| --- | --- | --- | --- | --- |
| x fit | 7.45553 + 0.00299184*u + 3.87689e-06*v  (u=x px, v=y px) | | | |
| x | 9 | yes | 515.3, 514.6, 513.9 | +0.52, +0.82, +1.11 |
| x | 9.5 | yes | 682.9, 682.6, 682.2 | -0.02, -0.05, -0.07 |
| x | 10 | yes | 850.1, 849.8, 849.6 | -0.06, -0.18, -0.29 |
| x | 10.5 | yes | 1018.0, 1017.6, 1017.2 | -0.88, -0.86, -0.84 |
| x | 11 | yes | 1185.0, 1184.6, 1184.1 | -0.73, -0.65, -0.57 |
| x | 11.5 | yes | 1351.4, 1351.1, 1350.8 | -0.03, -0.09, -0.15 |
| x | 12 | yes | 1517.3, 1517.1, 1517.0 | +1.20, +1.01, +0.81 |
| x | 6 unlabelled grid lines | no | | largest residual 0.97 px |
| y fit | 0.100806 + -4.99479e-07*u + -0.000239509*v  (u=x px, v=y px) | | | |
| y | 0 | yes | 418.8, 418.2, 417.6 | +1.00, +0.58, +0.16 |
| y | -0.04 | yes | 587.1, 586.2, 585.3 | -0.33, -0.44, -0.55 |
| y | -0.08 | yes | 754.9, 753.7, 752.4 | -1.12, -0.88, -0.63 |
| y | -0.12 | yes | 920.4, 919.1, 917.8 | +0.45, +0.74, +1.02 |
| y | 4 unlabelled grid lines | no | | largest residual 1.49 px |

Residual rms over all lines, labelled and unlabelled: x 0.59 px, y 0.80 px.

RM E51F26 fig. 7, PDF p. 29, panel b (plot box [513, 1000, 1934, 1750] px; scan 300 dpi):

| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |
| --- | --- | --- | --- | --- |
| x fit | 7.46118 + 0.00298923*u + 8.58164e-07*v  (u=x px, v=y px) | | | |
| x | 9 | yes | 513.8, 513.2, 512.7 | +0.72, +1.17, +1.61 |
| x | 9.5 | yes | 682.2, 682.1, 682.0 | -0.45, -0.44, -0.44 |
| x | 10 | yes | 849.2, 849.1, 849.0 | -0.17, -0.19, -0.21 |
| x | 10.5 | yes | 1017.2, 1017.1, 1017.1 | -0.86, -0.92, -0.98 |
| x | 11 | yes | 1184.1, 1184.0, 1184.0 | -0.55, -0.59, -0.63 |
| x | 11.5 | yes | 1350.7, 1350.8, 1350.9 | +0.09, -0.12, -0.33 |
| x | 12 | yes | 1516.9, 1516.9, 1516.9 | +1.21, +1.09, +0.98 |
| x | 6 unlabelled grid lines | no | | largest residual 1.03 px |
| y fit | 0.261861 + -9.70426e-07*u + -0.000240289*v  (u=x px, v=y px) | | | |
| y | 0 | yes | 1087.4, 1085.6, 1083.8 | +0.29, +0.11, -0.06 |
| y | -0.04 | yes | 1254.4, 1252.3, 1250.2 | -0.29, -0.16, -0.03 |
| y | -0.08 | yes | 1420.4, 1418.4, 1416.5 | +0.26, +0.19, +0.13 |
| y | -0.12 | yes | 1587.5, 1585.5, 1583.4 | -0.44, -0.36, -0.29 |
| y | -0.16 | yes | 1753.4, 1751.3, 1749.3 | +0.18, +0.22, +0.25 |
| y | 5 unlabelled grid lines | no | | largest residual 1.10 px |

Residual rms over all lines, labelled and unlabelled: x 0.70 px, y 0.32 px.

RM E51F26 fig. 7, PDF p. 29, panel c (plot box [513, 1831, 1934, 2580] px; scan 300 dpi):

| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |
| --- | --- | --- | --- | --- |
| x fit | 7.47395 + 0.00298796*u + -5.1985e-06*v  (u=x px, v=y px) | | | |
| x | 9 | yes | 512.7, 513.2, 513.7 | +1.20, +1.34, +1.47 |
| x | 9.5 | yes | 681.7, 682.3, 682.9 | -0.47, -0.43, -0.39 |
| x | 10 | yes | 849.0, 849.7, 850.3 | -0.37, -0.40, -0.44 |
| x | 10.5 | yes | 1016.7, 1017.5, 1018.2 | -0.80, -0.89, -0.97 |
| x | 11 | yes | 1183.9, 1184.6, 1185.3 | -0.59, -0.65, -0.72 |
| x | 11.5 | yes | 1350.9, 1351.6, 1352.3 | -0.26, -0.32, -0.37 |
| x | 12 | yes | 1516.7, 1517.2, 1517.8 | +1.29, +1.36, +1.42 |
| x | 6 unlabelled grid lines | no | | largest residual 1.01 px |
| y fit | 0.461891 + -1.34593e-06*u + -0.000240242*v  (u=x px, v=y px) | | | |
| y | 0 | yes | 1919.6, 1916.8, 1913.9 | +0.05, +0.17, +0.29 |
| y | -0.04 | yes | 2086.5, 2083.9, 2081.3 | -0.26, -0.42, -0.59 |
| y | -0.08 | yes | 2252.5, 2249.7, 2247.0 | +0.24, +0.21, +0.18 |
| y | -0.12 | yes | 2419.1, 2416.3, 2413.5 | +0.06, +0.14, +0.22 |
| y | -0.16 | yes | 2585.8, 2583.1, 2580.3 | -0.10, -0.11, -0.11 |
| y | 5 unlabelled grid lines | no | | largest residual 0.54 px |

Residual rms over all lines, labelled and unlabelled: x 0.78 px, y 0.34 px.

RM E51F26 fig. 8, PDF p. 30, panel a (plot box [401, 368, 1163, 1507] px; scan 300 dpi):

| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |
| --- | --- | --- | --- | --- |
| x fit | 8.93724 + 0.00263054*u + 4.22661e-06*v  (u=x px, v=y px) | | | |
| x | 10 | yes | 403.2, 401.8, 400.5 | +0.19, +0.66, +1.12 |
| x | 10.5 | yes | 594.3, 593.3, 592.3 | -0.78, -0.70, -0.62 |
| x | 11 | yes | 783.6, 782.8, 782.1 | -0.08, -0.19, -0.31 |
| x | 11.5 | yes | 973.5, 972.9, 972.2 | +0.08, -0.15, -0.39 |
| x | 12 | yes | 1163.1, 1162.4, 1161.7 | +0.58, +0.39, +0.19 |
| x | 4 unlabelled grid lines | no | | largest residual 0.93 px |
| y fit | 0.197974 + -1.32961e-06*u + -0.000210537*v  (u=x px, v=y px) | | | |
| y | 0.04 | yes | 748.0, 745.9, 743.8 | -0.24, -0.49, -0.75 |
| y | 0 | yes | 937.4, 934.9, 932.4 | +0.39, +0.49, +0.59 |
| y | -0.04 | yes | 1127.4, 1125.1, 1122.7 | +0.37, +0.33, +0.28 |
| y | -0.08 | yes | 1318.0, 1315.5, 1313.0 | -0.28, -0.15, -0.02 |
| y | -0.12 | yes | 1508.0, 1505.5, 1503.1 | -0.23, -0.17, -0.11 |
| y | 8 unlabelled grid lines | no | | largest residual 3.30 px |

Residual rms over all lines, labelled and unlabelled: x 0.52 px, y 1.28 px.

RM E51F26 fig. 8, PDF p. 30, panel b (plot box [1257, 363, 2016, 1502] px; scan 300 dpi):

| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |
| --- | --- | --- | --- | --- |
| x fit | 6.68447 + 0.00263616*u + 2.93794e-06*v  (u=x px, v=y px) | | | |
| x | 10 | yes | 1257.5, 1256.9, 1256.3 | -0.23, -0.24, -0.25 |
| x | 10.5 | yes | 1447.2, 1446.4, 1445.7 | -0.23, -0.09, +0.04 |
| x | 11 | yes | 1636.2, 1635.6, 1634.9 | +0.42, +0.45, +0.48 |
| x | 11.5 | yes | 1825.8, 1825.3, 1824.8 | +0.47, +0.36, +0.24 |
| x | 12 | yes | 2016.4, 2015.8, 2015.2 | -0.43, -0.47, -0.51 |
| x | 4 unlabelled grid lines | no | | largest residual 0.76 px |
| y fit | 0.197987 + -1.12372e-06*u + -0.000210737*v  (u=x px, v=y px) | | | |
| y | 0.04 | yes | 743.3, 741.3, 739.3 | -0.31, -0.31, -0.31 |
| y | 0 | yes | 932.7, 930.9, 929.0 | +0.05, -0.09, -0.24 |
| y | -0.04 | yes | 1122.1, 1120.0, 1117.8 | +0.49, +0.63, +0.77 |
| y | -0.08 | yes | 1312.3, 1310.1, 1308.0 | +0.13, +0.24, +0.36 |
| y | -0.12 | yes | 1502.6, 1500.7, 1498.8 | -0.36, -0.47, -0.59 |
| y | 8 unlabelled grid lines | no | | largest residual 2.30 px |

Residual rms over all lines, labelled and unlabelled: x 0.35 px, y 1.09 px.

RM E51F26 fig. 8, PDF p. 30, panel c (plot box [399, 1599, 1162, 2549] px; scan 300 dpi):

| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |
| --- | --- | --- | --- | --- |
| x fit | 8.93754 + 0.00262758*u + 5.29802e-06*v  (u=x px, v=y px) | | | |
| x | 10 | yes | 400.5, 399.4, 398.3 | +0.63, +0.76, +0.89 |
| x | 10.5 | yes | 592.3, 591.2, 590.1 | -0.87, -0.75, -0.63 |
| x | 11 | yes | 782.0, 781.0, 780.1 | -0.26, -0.28, -0.29 |
| x | 11.5 | yes | 972.1, 971.3, 970.4 | -0.16, -0.25, -0.34 |
| x | 12 | yes | 1161.6, 1160.8, 1160.0 | +0.66, +0.52, +0.37 |
| x | 4 unlabelled grid lines | no | | largest residual 1.19 px |
| y fit | 0.377642 + -1.44831e-06*u + -0.000210439*v  (u=x px, v=y px) | | | |
| y | 0.04 | yes | 1602.1, 1599.8, 1597.4 | -0.44, -0.68, -0.92 |
| y | 0 | yes | 1791.5, 1788.7, 1785.8 | +0.22, +0.50, +0.78 |
| y | -0.04 | yes | 1981.8, 1979.1, 1976.5 | +0.10, +0.12, +0.15 |
| y | -0.08 | yes | 2171.3, 2168.7, 2166.1 | +0.62, +0.62, +0.63 |
| y | -0.12 | yes | 2362.1, 2359.6, 2357.2 | -0.12, -0.22, -0.33 |
| y | -0.16 | yes | 2552.5, 2549.8, 2547.2 | -0.38, -0.34, -0.31 |
| y | 5 unlabelled grid lines | no | | largest residual 1.04 px |

Residual rms over all lines, labelled and unlabelled: x 0.63 px, y 0.53 px.

RM E51F26 fig. 24, PDF p. 48, panel p (plot box [443, 402, 1990, 2576] px; scan 300 dpi):

| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |
| --- | --- | --- | --- | --- |
| x fit | -3.5368 + 0.00778029*u + 3.97043e-05*v  (u=x px, v=y px) | | | |
| x | 0 | yes | 453.0, 447.0, 441.1 | -0.49, -0.05, +0.39 |
| x | 2 | yes | 710.0, 704.2, 698.5 | -0.47, -0.19, +0.10 |
| x | 4 | yes | 966.5, 960.9, 955.3 | +0.15, +0.21, +0.28 |
| x | 6 | yes | 1223.5, 1217.9, 1212.3 | +0.15, +0.27, +0.38 |
| x | 8 | yes | 1480.8, 1475.4, 1470.0 | -0.07, -0.18, -0.29 |
| x | 10 | yes | 1737.1, 1732.4, 1727.7 | +0.73, -0.06, -0.86 |
| x | 6 unlabelled grid lines | no | | largest residual 1.03 px |
| y fit | 0.203052 + -2.80277e-07*u + -0.000156383*v  (u=x px, v=y px) | | | |
| y | 0.12 | yes | 530.3, 529.7, 529.0 | -0.06, -0.77, -1.47 |
| y | 0.08 | yes | 787.3, 785.6, 783.8 | -1.27, -0.88, -0.50 |
| y | 0.04 | yes | 1040.6, 1038.7, 1036.7 | +1.19, +1.78, +2.36 |
| y | 0 | yes | 1297.1, 1295.4, 1293.8 | +0.55, +0.81, +1.08 |
| y | -0.04 | yes | 1553.7, 1552.7, 1551.8 | -0.27, -0.69, -1.11 |
| y | -0.08 | yes | 1809.0, 1807.5, 1806.1 | +0.16, +0.26, +0.36 |
| y | -0.12 | yes | 2065.1, 2063.8, 2062.5 | -0.15, -0.21, -0.27 |
| y | -0.16 | yes | 2320.6, 2319.4, 2318.2 | +0.10, -0.04, -0.17 |
| y | -0.2 | yes | 2576.8, 2575.4, 2574.1 | -0.25, -0.27, -0.28 |
| y | 9 unlabelled grid lines | no | | largest residual 2.88 px |

Residual rms over all lines, labelled and unlabelled: x 0.36 px, y 1.11 px.

RM E51F26 fig. 29, PDF p. 56, panel a (plot box [371, 360, 1936, 888] px; scan 300 dpi):

| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |
| --- | --- | --- | --- | --- |
| x fit | -3.5369 + 0.00958471*u + -3.12269e-05*v  (u=x px, v=y px) | | | |
| x | 0 | yes | 370.3, 370.8, 371.3 | -0.01, +0.27, +0.56 |
| x | 2 | yes | 579.1, 580.0, 580.9 | -0.13, -0.27, -0.41 |
| x | 4 | yes | 787.4, 788.3, 789.2 | +0.19, +0.07, -0.05 |
| x | 6 | yes | 996.3, 997.2, 998.1 | -0.09, -0.18, -0.27 |
| x | 8 | yes | 1205.0, 1205.8, 1206.7 | -0.05, -0.12, -0.19 |
| x | 10 | yes | 1413.5, 1414.1, 1414.8 | +0.09, +0.23, +0.37 |
| x | 10 unlabelled grid lines | no | | largest residual 1.03 px |
| y fit | 0.0865159 + -9.65285e-07*u + -9.68373e-05*v  (u=x px, v=y px) | | | |
| y | 0.04 | yes | 476.6, 468.7, 460.7 | -0.04, +0.17, +0.38 |
| y | 0.02 | yes | 683.5, 675.7, 667.9 | -0.40, -0.34, -0.29 |
| y | 0 | yes | 889.2, 881.7, 874.3 | +0.44, +0.17, -0.10 |
| y | 3 unlabelled grid lines | no | | largest residual 2.81 px |

Residual rms over all lines, labelled and unlabelled: x 0.52 px, y 1.07 px.

RM E51F26 fig. 29, PDF p. 56, panel b (plot box [373, 985, 1938, 1825] px; scan 300 dpi):

| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |
| --- | --- | --- | --- | --- |
| x fit | -3.53278 + 0.00958351*u + -3.55749e-05*v  (u=x px, v=y px) | | | |
| x | 0 | yes | 371.7, 373.0, 374.4 | +0.68, +0.80, +0.91 |
| x | 2 | yes | 581.6, 583.2, 584.8 | -0.52, -0.63, -0.74 |
| x | 4 | yes | 789.8, 791.3, 792.9 | -0.07, -0.11, -0.15 |
| x | 6 | yes | 999.3, 1000.5, 1001.6 | -0.92, -0.57, -0.21 |
| x | 8 | yes | 1207.0, 1208.6, 1210.3 | +0.09, -0.02, -0.14 |
| x | 10 | yes | 1415.1, 1416.8, 1418.5 | +0.74, +0.53, +0.32 |
| x | 10 unlabelled grid lines | no | | largest residual 1.37 px |
| y fit | 0.195995 + -1.05164e-06*u + -9.61285e-05*v  (u=x px, v=y px) | | | |
| y | 0.1 | yes | 993.9, 985.8, 977.6 | +0.51, +0.20, -0.11 |
| y | 0.08 | yes | 1202.3, 1194.1, 1185.9 | +0.20, -0.07, -0.34 |
| y | 0.06 | yes | 1410.9, 1402.3, 1393.7 | -0.36, -0.25, -0.13 |
| y | 0.04 | yes | 1619.0, 1610.3, 1601.5 | -0.35, -0.12, +0.11 |
| y | 0.02 | yes | 1826.7, 1818.0, 1809.2 | -0.01, +0.23, +0.47 |
| y | 4 unlabelled grid lines | no | | largest residual 1.16 px |

Residual rms over all lines, labelled and unlabelled: x 0.79 px, y 0.40 px.

RM E51F26 fig. 29, PDF p. 56, panel c (plot box [376, 1920, 1941, 2552] px; scan 300 dpi):

| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |
| --- | --- | --- | --- | --- |
| x fit | -3.52703 + 0.0095812*u + -3.87293e-05*v  (u=x px, v=y px) | | | |
| x | 0 | yes | 375.2, 376.3, 377.4 | +0.78, +0.87, +0.97 |
| x | 2 | yes | 585.6, 586.7, 587.7 | -0.96, -0.76, -0.56 |
| x | 4 | yes | 793.6, 794.8, 796.0 | -0.14, -0.13, -0.11 |
| x | 6 | yes | 1002.6, 1003.9, 1005.1 | -0.44, -0.48, -0.51 |
| x | 8 | yes | 1210.8, 1212.1, 1213.4 | +0.12, +0.01, -0.10 |
| x | 10 | yes | 1419.0, 1420.4, 1421.8 | +0.64, +0.48, +0.32 |
| x | 10 unlabelled grid lines | no | | largest residual 1.73 px |
| y fit | 0.29537 + -1.03141e-06*u + -9.58545e-05*v  (u=x px, v=y px) | | | |
| y | 0.11 | yes | 1929.4, 1920.9, 1912.5 | +0.40, +0.49, +0.57 |
| y | 0.09 | yes | 2139.0, 2130.6, 2122.2 | -0.53, -0.51, -0.48 |
| y | 0.07 | yes | 2347.4, 2339.2, 2331.0 | -0.35, -0.46, -0.56 |
| y | 0.05 | yes | 2555.2, 2546.9, 2538.6 | +0.48, +0.48, +0.47 |
| y | 3 unlabelled grid lines | no | | largest residual 1.81 px |

Residual rms over all lines, labelled and unlabelled: x 0.97 px, y 0.81 px.

RM E51F26 fig. 30, PDF p. 57, panel a (plot box [513, 345, 2000, 1135] px; scan 300 dpi):

| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |
| --- | --- | --- | --- | --- |
| x fit | -5.8293 + 0.0114509*u + -8.95049e-05*v  (u=x px, v=y px) | | | |
| x | 0 | yes | 511.8, 514.6, 517.3 | +0.08, +0.31, +0.54 |
| x | 2 | yes | 686.9, 689.7, 692.4 | -0.35, -0.13, +0.10 |
| x | 4 | yes | 861.5, 864.4, 867.3 | -0.30, -0.21, -0.12 |
| x | 6 | yes | 1035.9, 1038.9, 1041.8 | -0.07, -0.01, +0.05 |
| x | 8 | yes | 1210.7, 1213.9, 1217.1 | -0.17, -0.38, -0.59 |
| x | 10 | yes | 1384.4, 1387.7, 1391.1 | +0.82, +0.43, +0.03 |
| x | 12 unlabelled grid lines | no | | largest residual 1.53 px |
| y fit | 0.130741 + -9.65393e-07*u + -0.000114618*v  (u=x px, v=y px) | | | |
| y | 0.08 | yes | 438.2, 431.7, 425.2 | -0.00, +0.35, +0.70 |
| y | 0.06 | yes | 612.9, 606.4, 599.9 | -0.13, +0.17, +0.48 |
| y | 0.04 | yes | 787.6, 782.1, 776.6 | -0.35, -1.06, -1.76 |
| y | 0.02 | yes | 961.5, 955.3, 949.1 | +0.21, +0.20, +0.18 |
| y | 0 | yes | 1135.9, 1129.7, 1123.4 | +0.28, +0.34, +0.40 |
| y | 5 unlabelled grid lines | no | | largest residual 2.23 px |

Residual rms over all lines, labelled and unlabelled: x 0.59 px, y 0.71 px.

RM E51F26 fig. 30, PDF p. 57, panel b (plot box [519, 1215, 2006, 1745] px; scan 300 dpi):

| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |
| --- | --- | --- | --- | --- |
| x fit | -5.82173 + 0.011436*u + -9.27214e-05*v  (u=x px, v=y px) | | | |
| x | 0 | yes | 518.9, 520.8, 522.6 | +0.13, +0.31, +0.49 |
| x | 2 | yes | 694.2, 696.3, 698.5 | -0.27, -0.36, -0.44 |
| x | 4 | yes | 868.9, 870.8, 872.6 | -0.11, +0.08, +0.27 |
| x | 6 | yes | 1043.8, 1045.7, 1047.6 | -0.13, +0.02, +0.16 |
| x | 8 | yes | 1218.8, 1221.0, 1223.2 | -0.28, -0.41, -0.55 |
| x | 10 | yes | 1392.8, 1395.1, 1397.5 | +0.65, +0.36, +0.08 |
| x | 12 unlabelled grid lines | no | | largest residual 1.21 px |
| y fit | 0.23069 + -1.02879e-06*u + -0.000114553*v  (u=x px, v=y px) | | | |
| y | 0.09 | yes | 1222.6, 1216.2, 1209.7 | +0.82, +0.64, +0.46 |
| y | 0.07 | yes | 1398.2, 1391.6, 1385.1 | -0.19, -0.23, -0.27 |
| y | 0.05 | yes | 1574.1, 1567.5, 1560.9 | -1.50, -1.49, -1.47 |
| y | 0.03 | yes | 1746.3, 1739.5, 1732.7 | +0.86, +1.07, +1.28 |
| y | 3 unlabelled grid lines | no | | largest residual 1.79 px |

Residual rms over all lines, labelled and unlabelled: x 0.48 px, y 0.92 px.

RM E51F26 fig. 30, PDF p. 57, panel c (plot box [523, 1825, 2009, 2535] px; scan 300 dpi):

| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |
| --- | --- | --- | --- | --- |
| x fit | -5.83387 + 0.0114317*u + -7.88249e-05*v  (u=x px, v=y px) | | | |
| x | 0 | yes | 522.7, 525.2, 527.7 | +0.30, +0.19, +0.07 |
| x | 2 | yes | 698.5, 700.6, 702.8 | -0.54, -0.33, -0.13 |
| x | 4 | yes | 872.9, 875.0, 877.2 | +0.01, +0.24, +0.47 |
| x | 6 | yes | 1047.5, 1050.2, 1052.9 | +0.30, +0.02, -0.27 |
| x | 8 | yes | 1223.2, 1225.5, 1227.8 | -0.44, -0.36, -0.29 |
| x | 10 | yes | 1397.4, 1399.9, 1402.4 | +0.37, +0.25, +0.13 |
| x | 12 unlabelled grid lines | no | | largest residual 1.27 px |
| y fit | 0.330683 + -1.0001e-06*u + -0.000114632*v  (u=x px, v=y px) | | | |
| y | 0.12 | yes | 1833.4, 1827.2, 1821.1 | -0.10, -0.37, -0.64 |
| y | 0.1 | yes | 2007.5, 2001.2, 1994.9 | +0.24, +0.13, +0.02 |
| y | 0.08 | yes | 2182.0, 2175.7, 2169.3 | +0.25, +0.16, +0.07 |
| y | 0.06 | yes | 2356.0, 2349.6, 2343.1 | +0.74, +0.74, +0.73 |
| y | 0.04 | yes | 2532.3, 2525.4, 2518.5 | -1.14, -0.67, -0.19 |
| y | 4 unlabelled grid lines | no | | largest residual 1.29 px |

Residual rms over all lines, labelled and unlabelled: x 0.40 px, y 0.58 px.

TN 3819 fig. 19, PDF p. 50, panel a (plot box [612, 731, 1674, 1086] px; scan 300 dpi):

| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |
| --- | --- | --- | --- | --- |
| x fit | -3.43318 + 0.0056522*u + -3.45951e-05*v  (u=x px, v=y px) | | | |
| x | 0 | yes | 611.8, 613.0, 614.3 | +0.18, -0.04, -0.27 |
| x | 1 | yes | 788.7, 790.0, 791.3 | +0.20, -0.10, -0.40 |
| x | 2 | yes | 965.4, 966.7, 968.0 | +0.42, +0.12, -0.19 |
| x | 3 | yes | 1142.1, 1143.5, 1144.8 | +0.56, +0.26, -0.04 |
| x | 4 | yes | 1319.2, 1320.5, 1321.7 | +0.38, +0.20, +0.01 |
| x | 5 | yes | 1499.1, 1498.5, 1497.9 | -2.51, -0.89, +0.73 |
| x | 6 | yes | 1672.7, 1674.0, 1675.4 | +0.75, +0.46, +0.17 |
| x | 6 unlabelled grid lines | no | | largest residual 4.37 px |
| y fit | -0.368359 + 1.64889e-06*u + 0.000227309*v  (u=x px, v=y px) | | | |
| y | -0.2 | yes | 736.1, 732.5, 728.8 | +0.02, -0.08, -0.18 |
| y | -0.16 | yes | 912.1, 908.2, 904.3 | +0.02, +0.16, +0.29 |
| y | -0.12 | yes | 1088.2, 1084.4, 1080.6 | -0.04, -0.08, -0.11 |
| y | 2 unlabelled grid lines | no | | largest residual 0.86 px |

Residual rms over all lines, labelled and unlabelled: x 0.99 px, y 0.40 px.

TN 3819 fig. 19, PDF p. 50, panel b (plot box [625, 1268, 1688, 1799] px; scan 300 dpi):

| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |
| --- | --- | --- | --- | --- |
| x fit | -3.47428 + 0.00565149*u + -4.22221e-05*v  (u=x px, v=y px) | | | |
| x | 0 | yes | 623.9, 626.2, 628.6 | +0.40, -0.01, -0.41 |
| x | 1 | yes | 801.0, 803.3, 805.5 | +0.25, -0.09, -0.43 |
| x | 2 | yes | 977.6, 979.9, 982.3 | +0.56, +0.17, -0.22 |
| x | 3 | yes | 1154.6, 1157.0, 1159.3 | +0.49, +0.07, -0.35 |
| x | 4 | yes | 1331.4, 1333.7, 1336.0 | +0.65, +0.28, -0.08 |
| x | 5 | yes | 1512.4, 1511.9, 1511.5 | -3.33, -0.98, +1.38 |
| x | 6 | yes | 1685.0, 1687.3, 1689.7 | +0.99, +0.55, +0.11 |
| x | 6 unlabelled grid lines | no | | largest residual 2.78 px |
| y fit | -0.530187 + 1.82505e-06*u + 0.000226734*v  (u=x px, v=y px) | | | |
| y | -0.24 | yes | 1274.4, 1269.9, 1265.4 | +0.41, +0.66, +0.92 |
| y | -0.2 | yes | 1451.8, 1447.6, 1443.4 | -0.66, -0.64, -0.62 |
| y | -0.16 | yes | 1628.3, 1624.1, 1619.9 | -0.73, -0.72, -0.71 |
| y | -0.12 | yes | 1803.0, 1799.1, 1795.2 | +0.98, +0.70, +0.41 |
| y | 3 unlabelled grid lines | no | | largest residual 0.68 px |

Residual rms over all lines, labelled and unlabelled: x 0.93 px, y 0.60 px.

TN 3819 fig. 19, PDF p. 50, panel c (plot box [640, 2013, 1704, 2545] px; scan 300 dpi):

| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |
| --- | --- | --- | --- | --- |
| x fit | -3.47873 + 0.00565722*u + -6.75995e-05*v  (u=x px, v=y px) | | | |
| x | 0 | yes | 639.0, 642.0, 645.0 | +0.04, +0.15, +0.25 |
| x | 1 | yes | 816.0, 819.0, 822.0 | -0.11, -0.03, +0.05 |
| x | 2 | yes | 992.8, 995.7, 998.7 | -0.16, -0.06, +0.04 |
| x | 3 | yes | 1169.8, 1172.7, 1175.7 | -0.39, -0.25, -0.12 |
| x | 4 | yes | 1346.3, 1349.2, 1352.1 | -0.17, +0.03, +0.23 |
| x | 5 | yes | 1521.9, 1525.8, 1529.7 | +1.01, +0.17, -0.67 |
| x | 6 | yes | 1699.9, 1702.8, 1705.6 | -0.22, -0.01, +0.20 |
| x | 6 unlabelled grid lines | no | | largest residual 0.83 px |
| y fit | -0.738941 + 1.32802e-06*u + 0.000227078*v  (u=x px, v=y px) | | | |
| y | -0.28 | yes | 2016.8, 2014.1, 2011.4 | +0.45, +0.09, -0.26 |
| y | -0.24 | yes | 2193.4, 2190.4, 2187.4 | -0.00, -0.06, -0.12 |
| y | -0.2 | yes | 2369.9, 2366.7, 2363.5 | -0.31, -0.16, -0.01 |
| y | -0.16 | yes | 2545.9, 2542.5, 2539.2 | -0.14, +0.13, +0.39 |
| y | 3 unlabelled grid lines | no | | largest residual 0.60 px |

Residual rms over all lines, labelled and unlabelled: x 0.41 px, y 0.32 px.

TN 3819 fig. 21, PDF p. 52 (page rotated 90 deg clockwise for reading), panel p (plot box [667, 328, 2427, 1742] px; scan 300 dpi):

| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |
| --- | --- | --- | --- | --- |
| x fit | -0.135483 + 0.00170492*u + -3.75653e-06*v  (u=x px, v=y px) | | | |
| x | 1 | yes | 665.9, 668.4, 670.8 | +0.85, -0.08, -1.01 |
| x | 2 | yes | 1253.5, 1254.8, 1256.0 | -0.25, +0.04, +0.32 |
| x | 3 | yes | 1839.9, 1841.2, 1842.5 | -0.09, +0.18, +0.45 |
| x | 4 | yes | 2426.9, 2428.0, 2429.2 | -0.50, -0.13, +0.24 |
| x | 12 unlabelled grid lines | no | | largest residual 1.60 px |
| y fit | -0.296518 + 6.8162e-07*u + 0.000169815*v  (u=x px, v=y px) | | | |
| y | -0.24 | yes | 330.0, 326.6, 323.3 | +0.13, -0.02, -0.16 |
| y | -0.2 | yes | 565.1, 562.4, 559.6 | +0.53, -0.20, -0.92 |
| y | -0.16 | yes | 801.3, 797.7, 794.1 | -0.07, +0.04, +0.15 |
| y | -0.12 | yes | 1036.7, 1032.9, 1029.2 | +0.07, +0.31, +0.55 |
| y | -0.08 | yes | 1272.5, 1268.8, 1265.1 | -0.16, +0.02, +0.19 |
| y | -0.04 | yes | 1508.1, 1504.4, 1500.7 | -0.20, -0.04, +0.11 |
| y | 0 | yes | 1743.7, 1740.0, 1736.3 | -0.30, -0.11, +0.08 |
| y | 6 unlabelled grid lines | no | | largest residual 1.05 px |

Residual rms over all lines, labelled and unlabelled: x 0.65 px, y 0.49 px.

TN 3819 fig. 23, PDF p. 54 (rotated 90 deg clockwise), panel p (plot box [515, 588, 2034, 1610] px; scan 300 dpi):

| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |
| --- | --- | --- | --- | --- |
| x fit | -28.0828 + 0.0237188*u + -0.000115326*v  (u=x px, v=y px) | | | |
| x | -16 | yes | 512.4, 515.3, 518.2 | -0.05, -0.51, -0.98 |
| x | -12 | yes | 680.8, 683.4, 685.9 | +0.20, +0.05, -0.10 |
| x | -8 | yes | 849.7, 852.1, 854.5 | -0.03, -0.03, -0.02 |
| x | -4 | yes | 1019.1, 1021.2, 1023.4 | -0.87, -0.56, -0.24 |
| x | 0 | yes | 1186.5, 1188.7, 1190.8 | +0.40, +0.68, +0.96 |
| x | 4 | yes | 1355.2, 1357.4, 1359.6 | +0.32, +0.59, +0.86 |
| x | 8 | yes | 1523.6, 1525.9, 1528.2 | +0.55, +0.70, +0.85 |
| x | 12 | yes | 1692.2, 1694.9, 1697.7 | +0.62, +0.33, +0.03 |
| x | 16 | yes | 1862.4, 1864.7, 1867.1 | -0.92, -0.82, -0.72 |
| x | 20 | yes | 2030.3, 2033.0, 2035.6 | -0.22, -0.43, -0.64 |
| x | 9 unlabelled grid lines | no | | largest residual 1.20 px |
| y fit | -0.381625 + 1.63142e-06*u + 0.000236152*v  (u=x px, v=y px) | | | |
| y | -0.24 | yes | 596.0, 590.9, 585.8 | +0.17, +0.06, -0.05 |
| y | -0.2 | yes | 765.4, 760.3, 755.2 | +0.14, +0.03, -0.09 |
| y | -0.16 | yes | 935.0, 929.8, 924.6 | -0.12, -0.10, -0.08 |
| y | -0.12 | yes | 1104.4, 1099.0, 1093.7 | -0.08, +0.03, +0.14 |
| y | -0.08 | yes | 1273.8, 1268.5, 1263.2 | -0.16, -0.08, -0.01 |
| y | -0.04 | yes | 1443.1, 1437.9, 1432.6 | -0.06, -0.04, -0.02 |
| y | 0 | yes | 1612.3, 1607.1, 1601.9 | +0.10, +0.10, +0.10 |
| y | 6 unlabelled grid lines | no | | largest residual 0.61 px |

Residual rms over all lines, labelled and unlabelled: x 0.57 px, y 0.29 px.

TN 3819 fig. 24, PDF p. 55 (rotated 90 deg clockwise), panel a (plot box [446, 756, 1433, 1550] px; scan 300 dpi):

| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |
| --- | --- | --- | --- | --- |
| x fit | -4.49502 + 0.0101324*u + -2.70754e-05*v  (u=x px, v=y px) | | | |
| x | 0 | yes | 444.9, 446.2, 447.6 | +0.77, +0.47, +0.17 |
| x | 2 | yes | 643.4, 644.5, 645.7 | -0.34, -0.45, -0.55 |
| x | 4 | yes | 839.8, 840.8, 841.8 | +0.61, +0.67, +0.73 |
| x | 6 | yes | 1039.4, 1040.4, 1041.3 | -1.62, -1.53, -1.44 |
| x | 8 | yes | 1235.0, 1235.8, 1236.6 | +0.22, +0.45, +0.69 |
| x | 10 | yes | 1432.2, 1433.3, 1434.3 | +0.36, +0.38, +0.40 |
| x | 5 unlabelled grid lines | no | | largest residual 0.75 px |
| y fit | -0.312124 + -4.06346e-07*u + 0.000201634*v  (u=x px, v=y px) | | | |
| y | -0.16 | yes | 755.4, 756.4, 757.4 | -0.00, -0.05, -0.09 |
| y | -0.12 | yes | 953.8, 954.7, 955.7 | -0.09, -0.02, +0.05 |
| y | -0.08 | yes | 1152.0, 1153.0, 1154.0 | +0.10, +0.08, +0.06 |
| y | -0.04 | yes | 1350.4, 1351.4, 1352.5 | +0.14, +0.07, +0.01 |
| y | 0 | yes | 1549.0, 1550.0, 1550.9 | -0.15, -0.09, -0.04 |
| y | 4 unlabelled grid lines | no | | largest residual 0.71 px |

Residual rms over all lines, labelled and unlabelled: x 0.66 px, y 0.32 px.

TN 3819 fig. 24, PDF p. 55 (rotated 90 deg clockwise), panel b (plot box [1630, 759, 2617, 1553] px; scan 300 dpi):

| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |
| --- | --- | --- | --- | --- |
| x fit | -16.5346 + 0.0101384*u + 1.92373e-07*v  (u=x px, v=y px) | | | |
| x | 0 | yes | 1629.9, 1630.4, 1631.0 | +0.99, +0.42, -0.16 |
| x | 2 | yes | 1827.3, 1827.8, 1828.4 | +0.81, +0.28, -0.25 |
| x | 4 | yes | 2026.7, 2026.7, 2026.8 | -1.27, -1.32, -1.37 |
| x | 6 | yes | 2222.4, 2222.1, 2221.8 | +0.30, +0.57, +0.83 |
| x | 8 | yes | 2420.7, 2420.3, 2420.0 | -0.72, -0.41, -0.10 |
| x | 10 | yes | 2617.3, 2616.7, 2616.2 | -0.12, +0.46, +1.04 |
| x | 5 unlabelled grid lines | no | | largest residual 1.39 px |
| y fit | -0.311584 + -8.12439e-07*u + 0.000201699*v  (u=x px, v=y px) | | | |
| y | -0.16 | yes | 758.1, 760.2, 762.4 | +0.05, -0.15, -0.35 |
| y | -0.12 | yes | 956.3, 958.3, 960.3 | +0.12, +0.12, +0.11 |
| y | -0.08 | yes | 1154.7, 1156.6, 1158.5 | +0.06, +0.11, +0.16 |
| y | -0.04 | yes | 1353.1, 1355.0, 1356.9 | -0.02, +0.05, +0.11 |
| y | 0 | yes | 1551.6, 1553.5, 1555.3 | -0.21, -0.12, -0.03 |
| y | 4 unlabelled grid lines | no | | largest residual 0.80 px |

Residual rms over all lines, labelled and unlabelled: x 0.68 px, y 0.34 px.

TN 3819 fig. 25(b), PDF p. 56 (rotated 90 deg clockwise), panel p (plot box [1676, 293, 2531, 1665] px; scan 300 dpi):

| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |
| --- | --- | --- | --- | --- |
| x fit | -39.0816 + 0.0234152*u + -0.000180396*v  (u=x px, v=y px) | | | |
| x | 0 | yes | 1670.8, 1676.3, 1681.7 | +0.60, +0.34, +0.09 |
| x | 4 | yes | 1843.3, 1848.4, 1853.4 | -1.10, -0.94, -0.78 |
| x | 8 | yes | 2012.5, 2017.6, 2022.8 | +0.57, +0.62, +0.68 |
| x | 12 | yes | 2183.8, 2189.0, 2194.2 | +0.09, +0.10, +0.11 |
| x | 16 | yes | 2354.7, 2359.9, 2365.2 | -0.05, -0.03, -0.02 |
| x | 20 | yes | 2525.6, 2530.8, 2536.0 | -0.11, -0.09, -0.08 |
| x | 5 unlabelled grid lines | no | | largest residual 0.94 px |
| y fit | -0.394145 + 2.60852e-06*u + 0.000233414*v  (u=x px, v=y px) | | | |
| y | -0.16 | yes | 983.9, 979.4, 974.8 | +0.37, +0.28, +0.19 |
| y | -0.12 | yes | 1155.8, 1151.1, 1146.5 | -0.11, -0.12, -0.13 |
| y | -0.08 | yes | 1327.7, 1323.0, 1318.2 | -0.62, -0.58, -0.53 |
| y | -0.04 | yes | 1498.1, 1493.4, 1488.7 | +0.36, +0.38, +0.41 |
| y | 0 | yes | 1669.8, 1665.1, 1660.4 | +0.00, +0.03, +0.06 |
| y | 12 unlabelled grid lines | no | | largest residual 1.63 px |

Residual rms over all lines, labelled and unlabelled: x 0.53 px, y 0.60 px.

RM A52E20 fig. 15, PDF p. 44, panel a (plot box [685, 328, 2044, 1140] px; scan 300 dpi):

| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |
| --- | --- | --- | --- | --- |
| x fit | -1.52735 + 0.00367636*u + 1.57472e-05*v  (u=x px, v=y px) | | | |
| x | 1 | yes | 684.7, 684.0, 683.4 | -0.45, -0.61, -0.77 |
| x | 2 | yes | 955.4, 954.8, 954.2 | +0.84, +0.65, +0.46 |
| x | 3 | yes | 1227.7, 1226.8, 1226.0 | +0.59, +0.62, +0.64 |
| x | 4 | yes | 1500.9, 1500.0, 1499.2 | -0.57, -0.57, -0.56 |
| x | 5 | yes | 1772.6, 1771.8, 1770.9 | -0.31, -0.29, -0.27 |
| x | 6 | yes | 2044.4, 2043.3, 2042.2 | -0.11, +0.19, +0.50 |
| x | 5 unlabelled grid lines | no | | largest residual 1.67 px |
| y fit | -0.337298 + 8.05973e-07*u + 0.000294761*v  (u=x px, v=y px) | | | |
| y | -0.24 | yes | 329.1, 328.0, 327.0 | -0.85, -0.70, -0.55 |
| y | -0.2 | yes | 463.1, 462.0, 461.0 | +0.80, +0.98, +1.15 |
| y | -0.16 | yes | 599.1, 598.4, 597.7 | +0.49, +0.30, +0.12 |
| y | -0.12 | yes | 735.5, 734.7, 733.8 | -0.19, -0.23, -0.27 |
| y | -0.08 | yes | 871.5, 870.6, 869.7 | -0.51, -0.51, -0.51 |
| y | -0.04 | yes | 1006.9, 1006.0, 1005.2 | -0.15, -0.19, -0.22 |
| y | 0 | yes | 1142.0, 1141.2, 1140.4 | +0.42, +0.35, +0.27 |

Residual rms over all lines, labelled and unlabelled: x 0.62 px, y 0.54 px.

RM A52E20 fig. 15, PDF p. 44, panel b (plot box [681, 1543, 2039, 2362] px; scan 300 dpi):

| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |
| --- | --- | --- | --- | --- |
| x fit | -1.53011 + 0.00367386*u + 1.81629e-05*v  (u=x px, v=y px) | | | |
| x | 1 | yes | 679.6, 678.4, 677.3 | -0.61, -0.44, -0.27 |
| x | 2 | yes | 950.5, 949.5, 948.6 | +0.66, +0.66, +0.65 |
| x | 3 | yes | 1223.1, 1222.3, 1221.6 | +0.27, +0.07, -0.13 |
| x | 4 | yes | 1495.7, 1494.8, 1493.9 | -0.18, -0.22, -0.26 |
| x | 5 | yes | 1768.0, 1767.0, 1766.0 | -0.21, -0.21, -0.21 |
| x | 6 | yes | 2039.9, 2038.8, 2037.8 | +0.07, +0.14, +0.21 |
| x | 5 unlabelled grid lines | no | | largest residual 0.58 px |
| y fit | -0.692047 + 6.08463e-07*u + 0.000292669*v  (u=x px, v=y px) | | | |
| y | -0.24 | yes | 1544.3, 1543.3, 1542.4 | -1.16, -0.89, -0.62 |
| y | -0.2 | yes | 1679.9, 1679.3, 1678.7 | -0.08, -0.16, -0.23 |
| y | -0.16 | yes | 1815.6, 1815.2, 1814.7 | +0.85, +0.62, +0.39 |
| y | -0.12 | yes | 1952.4, 1951.8, 1951.1 | +0.73, +0.70, +0.67 |
| y | -0.08 | yes | 2088.9, 2088.3, 2087.7 | +0.89, +0.85, +0.81 |
| y | -0.04 | yes | 2226.9, 2226.0, 2225.1 | -0.42, -0.21, +0.00 |
| y | 0 | yes | 2364.0, 2363.4, 2362.9 | -0.81, -0.92, -1.03 |

Residual rms over all lines, labelled and unlabelled: x 0.34 px, y 0.70 px.

TN 3372 fig. 10, PDF p. 19, panel p (plot box [571, 356, 1808, 971] px; scan 300 dpi):

| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |
| --- | --- | --- | --- | --- |
| x fit | 0.319169 + 0.000486125*u + 3.02587e-06*v  (u=x px, v=y px) | | | |
| x | 0.6 | yes | 575.3, 572.4, 569.5 | +0.10, +1.17, +2.24 |
| x | 0.7 | yes | 783.3, 780.6, 778.0 | -2.16, -1.35, -0.54 |
| x | 0.8 | yes | 987.5, 985.5, 983.6 | -0.65, -0.55, -0.46 |
| x | 0.9 | yes | 1192.3, 1190.4, 1188.6 | +0.28, +0.28, +0.27 |
| x | 1 | yes | 1396.4, 1396.0, 1395.5 | +1.83, +0.43, -0.97 |
| x | 1.1 | yes | 1603.6, 1601.9, 1600.2 | +0.37, +0.21, +0.04 |
| x | 1.2 | yes | 1809.4, 1808.0, 1806.6 | +0.22, -0.18, -0.59 |
| x | 6 unlabelled grid lines | no | | largest residual 1.79 px |
| y fit | -0.21847 + -7.08325e-07*u + 0.000390359*v  (u=x px, v=y px) | | | |
| y | -0.08 | yes | 356.2, 356.2, 356.2 | -0.41, +0.68, +1.78 |
| y | 0 | yes | 560.7, 562.0, 563.3 | +0.03, -0.17, -0.37 |
| y | 0.08 | yes | 766.6, 768.5, 770.4 | -0.96, -1.75, -2.54 |
| y | 0.16 | yes | 969.3, 970.5, 971.7 | +1.34, +1.23, +1.12 |
| y | 3 unlabelled grid lines | no | | largest residual 2.74 px |

Residual rms over all lines, labelled and unlabelled: x 0.90 px, y 1.40 px.

TN 3372 fig. 12, PDF p. 20, panel p (plot box [546, 722, 1782, 1958] px; scan 300 dpi):

| axis | line value | labelled | line centre px (band start, mid, end) | residual px (start, mid, end) |
| --- | --- | --- | --- | --- |
| x fit | 0.341007 + 0.00048538*u + -3.91851e-06*v  (u=x px, v=y px) | | | |
| x | 0.6 | yes | 543.0, 545.5, 548.1 | +1.42, +1.34, +1.27 |
| x | 0.7 | yes | 750.7, 753.1, 755.5 | -0.28, -0.21, -0.15 |
| x | 0.8 | yes | 958.0, 960.4, 962.8 | -1.48, -1.43, -1.38 |
| x | 0.9 | yes | 1162.9, 1165.5, 1168.1 | -0.41, -0.54, -0.66 |
| x | 1 | yes | 1368.7, 1370.8, 1373.0 | -0.17, +0.15, +0.47 |
| x | 1.1 | yes | 1574.2, 1577.0, 1579.8 | +0.37, -0.01, -0.38 |
| x | 1.2 | yes | 1780.0, 1782.3, 1784.6 | +0.55, +0.69, +0.83 |
| x | 6 unlabelled grid lines | no | | largest residual 2.03 px |
| y fit | -0.601144 + 8.64832e-07*u + 0.000387924*v  (u=x px, v=y px) | | | |
| y | -0.32 | yes | 721.8, 721.6, 721.4 | +0.27, -0.17, -0.60 |
| y | -0.24 | yes | 928.9, 928.0, 927.2 | -0.52, -0.36, -0.19 |
| y | -0.16 | yes | 1134.2, 1133.4, 1132.6 | +0.33, +0.49, +0.65 |
| y | -0.08 | yes | 1340.2, 1339.4, 1338.6 | +0.54, +0.71, +0.87 |
| y | 0 | yes | 1548.2, 1546.9, 1545.7 | -1.21, -0.59, +0.02 |
| y | 0.08 | yes | 1752.9, 1752.7, 1752.5 | +0.37, -0.09, -0.56 |
| y | 0.16 | yes | 1959.2, 1958.8, 1958.3 | +0.23, +0.02, -0.19 |
| y | 6 unlabelled grid lines | no | | largest residual 1.67 px |

Residual rms over all lines, labelled and unlabelled: x 0.94 px, y 0.67 px.

## 8. Where the brief and the PDFs differ

Page numbers: every PDF page number in the brief matched the figure or text it
names (RM E51F26 text pp 5 to 7, figure 6 p 28, figures 7 and 8 pp 29 and 30,
figure 24 p 48, figures 29 and 30 pp 56 and 57; TN 3819 figures 19, 21, 23, 24,
25 on pp 50, 52, 54, 55, 56 and report pp 16 to 18 on PDF pp 18 to 20; RM A52E20
text p 6, figure 1(c) p 26, figure 15 p 44; TN 3372 text p 4, figure 1 pp 9 and
10, figures 10 and 12 pp 19 and 20). TN 3819 figure 25 parts (a) and (b) share
PDF p 56.

Contents:

1. RM E51F26 figure 24 gives no Mach number for the plotted points. Its M1 labels
   (1.30, 1.91, 2.10, 3.50) belong to the predicted C'p,b curves; M1 is the Mach
   number just upstream of the base. The text (PDF p 15) says M1 varied from 1.91
   to 2.1 among the boattails. The free-stream Mach number 1.91 comes from the
   text. The axis carries two coefficients, Cp,b (free-stream reference) and
   C'p,b (conditions just upstream of the base), told apart by flagged symbols.
2. RM E51F26 figure 30 (Db/Dm 0.704) also plots base-bleed points (squares in
   (a) and (c)). Base bleed is jet air at jet pressure ratios of 1 or less, so
   these were not read (rule 8). Figure 29 has no such points.
3. RM E51F26 figures 29 and 30: the components named in the legends are, for
   (a) base pressure drag and friction drag, (b) side pressure drag and (c) total
   drags. Friction drag (Cf = 0.003) and "experimental pressure drag plus friction
   drag" are drawn only as curves and were read at the tested angles (flag
   `curve`); friction drag is an estimate with an assumed friction coefficient.
   In figure 30(c) that curve stops at about 9.2 deg, so its 9.33 deg value is
   `untraced`.
4. RM E51F26 text: besides the trip-wire sentence on PDF p 7, the boundary-layer
   statements the brief asks about are on PDF pp 8, 11, 15 and 19 (outside the
   listed pages): turbulent boundary layers ahead of the base, and inadvertent
   early transition on the 5.63 deg, Db/Dm 0.704 boattail (0.20 in thick) that
   the report calls the cause of an inconsistent base-pressure point. The figures
   read here do not say which points, if any, were taken with the trip wire.
5. TN 3819 figure 21: the legend says only that all experimental points come from
   the compilation of ref. 2; it does not explain the symbol shapes, so the
   configuration of each point is only what the caption gives (10 deg
   cone-cylinders, fineness ratio 5). Figure 19's legend gives Reynolds numbers
   per inch but no source.
6. RM A52E20 figure 15: the plotted symbols are all from other sources (refs. 4,
   10, 11 and unpublished Ames 1- by 3-foot tunnel data) at M about 1.5 to 2.9.
   The report's own data for model 8 (boattailed) and model 3 (not boattailed)
   appear only as a dashed and a solid fairing over M about 2.6 to 4.7, with no
   symbols. The brief does not name these curves, so they were not read; they are
   listed as `untraced` rows. Figure 15 gives Reynolds numbers 3.0 x 10^6
   (laminar) and 5.0 x 10^6 (turbulent), based on model length; the legend gives
   no transition-fixed case.
7. RM A52E20: neither the model description (PDF p 6) nor figure 1(c) gives the
   boattail's length or profile; figure 1(c) is a photograph.
8. TN 3372 figure 12 shows configuration D only as curves, as the brief allowed.
   TN 3372 figure 10's coefficient axis increases downward.

## 9. Files

Delivered at the top of this folder: method.md, geometry.csv and the 13 figure
CSVs named in the brief. Working material, not part of the reading: src (the
four PDFs), render (extracted page scans), scripts (all code, with cfg holding
the per-figure inputs), work (calibration logs, overlays, contact sheets,
traces) and view (crops looked at).
