# Reader A: method for RM A51J11 figs. 14 and 15 and RM A52E01 fig. 8 (a) and (b)

Plain text. All paths are relative to this folder (scratchpad/te15/A/). Nothing here was committed or pushed (the coordinator said not to commit, which overrides the commit step in the brief).

## 1. What I opened

- The brief, scratchpad/te15/reader-brief.md.
- The two PDFs, downloaded by me into src_a51/ and src_a52/ (each its own new folder).
- RM A51J11: the title page (text lines before SUMMARY), the APPARATUS AND MODELS, TESTS and CORRECTIONS sections (as pdftotext output), and the figure pages 36 and 37 with their captions. RM A51J11 has no NOTATION section; I did not open its INTRODUCTION, so P_b is recorded only as printed on the axis ("Base pressure coefficient, P_b").
- RM A52E01: the title page, the NOTATION list (page image of PDF page 4 and the start of it on page 3), APPARATUS with Models, TESTS AND PROCEDURE with Reduction of Data and Support interference (text, plus an image crop of PDF page 7 to check one sentence), and the figure pages 29 and 30 with captions and legend.
- To find the section boundaries I ran a grep for heading-like lines over the whole pdftotext output. That printed only heading lines, but for RM A52E01 it also printed a few short line fragments that lie inside RESULTS AND DISCUSSION and the reference list (for example "Lift Characteristics", "The aberrant variations", "Appreciable", "Mach number in the neighborhood"). I did not read past those fragments and did not open SUMMARY, RESULTS AND DISCUSSION or CONCLUSIONS (CONCLUDING REMARKS) in either report. A 1/6-scale thumbnail of RM A52E01 PDF page 3 (too small to read) was viewed to find where NOTATION starts on that page.
- Nothing in the repository, no git branch, no other reader's folder (te15/B/ or any other), no decisions or status files, no design record.
- Environment: I installed scipy and opencv-python-headless with pip (only scipy was used). Python was run with -I. Scripts are in scripts/.

## 2. Sources and hashes

| Report | file | SHA-256 | matches brief |
| --- | --- | --- | --- |
| Cleary and Stevens, NACA RM A51J11, NTRS 19930087063 | src_a51/19930087063.pdf (44 pages) | e6b779125d8359e968ad6b4d2b2c43d651ef5024f42bdb5574a6f7b93a8fdf57 | yes |
| Dugan, NACA RM A52E01, NTRS 19930087008 | src_a52/19930087008.pdf (35 pages) | 3f090609fb3a170703523cc14f26aa9cab55e6afe4718b397b289bbcf33efe54 | yes |

## 3. Images read

- RM A51J11 fig. 14: PDF page 36; fig. 15: PDF page 37. Each page is one 2344 x 3096 px RGB JPEG at 300 dpi (pdfimages -list). I read renders made with pdftoppm -r 600 -gray: renders/a51-36.png and renders/a51-37.png, 4692 x 6200 px (a 2x upsample of the scan). Native images are also saved (renders/a51native-000.jpg, -001.jpg).
- RM A52E01 fig. 8(a): PDF page 29; fig. 8(b): PDF page 30. Each page is a stack of 1-bit CCITT strips at 240 dpi. I read pdftoppm -r 480 -gray renders: renders/a52-29.png (4927 x 4134 px) and renders/a52-30.png (4880 x 4080 px), a 2x upsample. Thin white horizontal lines in the renders are the joins between scan strips.
- Pixel numbers below are render pixels (600 dpi for RM A51J11, 480 dpi for RM A52E01).

## 4. What is plotted (axes, legend, panels, as printed)

RM A51J11 fig. 14. Caption: "Figure 14.-The variation of base pressure coefficient with Mach number at semispan station 2y/b, 0.25. Angle of attack, 0 deg." Three panels, labelled h/t, 1.0 (top), h/t, 0.6 (middle), h/t, 0.3 (bottom). x: "Mach number, M", labels .5 to 1.2, grid every 0.05. y (each panel): "Base pressure coefficient, P_b", labels 0, -.4, -.8, -1.2 (0 at the bottom, negative upward), grid every 0.2. Legend in the top panel: solid line "Without surface roughness", dashed line "With surface roughness". No symbols: faired curves only.

RM A51J11 fig. 15. Caption: "Figure 15.-The variation of base pressure coefficient with semispan station, 2y/b. Angle of attack, 0 deg." Three panels h/t, 1.0, 0.6, 0.3. x: "Semispan station, 2y/b", labels 0 to 1.0 every 0.2, grid every 0.1. y: as fig. 14. Curves are labelled by Mach number with leader lines: M 0.98 (long dashes), .80 (short dashes), 1.06 (long dash and dot), .60 (solid). No symbols.

RM A52E01 fig. 8. Caption: "Figure 8.- Comparison of wing base pressure coefficients for three types of trailing-edge bluntness. (a) Reynolds number, 1.5 million." and "(b) Reynolds number, 3.8 million. Figure 8.- Concluded." Six panels in each part, printed "M=0.6", "M=0.7", "M=0.8", "M=0.9", "M=0.925", "M=1.2, 1.4, 1.7". x: "Pressure coefficient, (p_b - p_0)/q", labels 0, -.2, -.4, -.6, -.8 (0 at the left), grid every 0.1. NOTATION: p_b "pressure at base of blunt trailing-edge wings, pounds per square foot"; p_0 "free-stream static pressure"; q "free-stream dynamic pressure"; (p_b - p_0)/q "wing base-pressure coefficient". y: "Nominal angle of attack, alpha, degrees", labels 0 to 14 every 2, top of frame 16; NOTATION: alpha "angle of attack of body axis, degrees". Legend (inside the M=0.925 panel, both parts): Wing 2, long dashes; Wing 3, short dashes; Wing 4, long dash then short dash. Measured in the legend at 480 dpi: wing 2 dashes 62 to 68 px with gaps 20 to 24 px; wing 3 dashes 26 to 34 px with gaps 14 to 22 px; wing 4 long dashes 62 to 66 px and short dashes 26 to 28 px with gaps 16 to 20 px. Each legend entry has a sketch of the wing section (wing 2 blunt with a square base; wings 3 and 4 tapered to a smaller base). In the supersonic panel the curves are grouped by Mach number with labels "1.7", "1.4" and "1.2" and arrows. No symbols: faired curves only.

## 5. Test conditions, model geometry and stated uncertainty (from the permitted sections)

RM A51J11 (Ames 16-foot high-speed wind tunnel, transonic bump technique). Rectangular wings of effective aspect ratio 4, steel, with end plates near the root. Section: 4-percent-thick symmetrical circular arc, with the trailing edge built up to thickness ratios h/t of 0, 0.3, 0.6 and 1.0 times the maximum thickness and faired to the original section by straight lines (fig. 3 of the report); one boattail variant (the 1.0 section chamfered to 0.6 thickness from 0.95 chord). Base pressures from one orifice at each of four spanwise stations in the blunt trailing edge, at 25, 37.5, 62.5 and 87.5 percent semispan, read on a mercury manometer. Surface roughness: No. 60 carborundum grains on the upper and lower surfaces from the leading edge to 0.10 chord. Mach number range 0.60 to 1.10; Reynolds number about 1.7 to 2.2 million (their fig. 4); angle of attack about -6 to +16 deg (figs. 14 and 15 are at 0 deg). Corrections: drag tare 0.0022; blockage and wall interference assumed negligible; Mach numbers are averages over the region occupied by the model from the bump calibration; corrected for flow inclination over the bump; flow curvature effects not investigated. No uncertainty is stated for the base pressure coefficient.

RM A52E01 (Ames 6- by 6-foot supersonic wind tunnel, sting-mounted wing-body model). Wings: aspect ratio 3.1, taper ratio 0.39, 3-percent-thick circular-arc biconvex section (streamwise), included nose angle 6.88 deg, mean aerodynamic chord 0.944 ft, total wing area 2.425 sq ft, no dihedral, camber or twist. Wing 1 is the basic sharp-edged wing (not in fig. 8). Wing 2: constant thickness from midchord to the trailing edge (boattail angle 0). Wing 3: constant thickness from midchord to 87.5 percent chord, then a constant slope to half the maximum thickness at the trailing edge (boattail angle 6.88 deg). Wing 4: the same trailing-edge thickness as wing 3 with a constant slope from the trailing edge to a tangent point on the biconvex surface (boattail angle 2.02 deg). Body maximum cross-section area 0.1235 sq ft (the fineness ratio is not legible in the text layer and I did not check it on the page image). Wing base pressure from one static orifice in the trailing edge of each modified wing at about 50 percent semispan of the right-hand panel. Mach numbers 0.6 to 0.925 and 1.2 to 1.7; Reynolds numbers 1.5 and 3.8 million based on the mean aerodynamic chord. Corrections: subsonic wall interference for lift; constriction correction computed at zero angle of attack and applied throughout (at M = 0.925 it raised the Mach number by 3 percent over the empty-tunnel calibration); at subsonic speeds a preliminary survey showed a longitudinal static-pressure variation of less than 2 percent of the dynamic pressure, not corrected for; no wall corrections needed at supersonic speeds; supersonic static-pressure variation corrected in drag only. No uncertainty is stated for the base pressure coefficient. The y axis is "Nominal angle of attack".

## 6. Calibration

For every panel I fitted every grid line separately. Each line was sampled in 40 px segments along its length; in each segment the darkness-weighted centroid across the line was taken; segments disturbed by curves or text were rejected (outlier and width tests); a straight line x = a + b*y (vertical grid lines) or y = c + e*x (horizontal) was fitted. The mean slopes b and e of a panel give its rotation and skew (they differ, so the scans are slightly skewed as well as rotated). The intercepts at the panel middle were then fitted linearly against the printed values, with residuals and a leave-one-out check. A point (px, py) is converted by u = (px - b*(py - ymid) - x0)/x1 and v = (py - e*(px - xmid) - y0)/y1. The labelled ticks used are the grid lines whose values follow from the printed labels (for fig. 14: .5 at the left frame and 1.2 at the right frame, 14 cells of 0.05; for fig. 15: 0 and 1.0, 10 cells of 0.1; for fig. 8: 0 and -.8, 8 cells of 0.1, and 0 to 16 in steps of 2). All grid lines were used, including the frames, so the fits rest on the two outermost labelled ticks and every line between them. I checked on fig. 14 that the label .6 sits under the third vertical line and .7 under the fifth.

Per panel (units per render pixel, slopes, largest residual and leave-one-out rms in plot units; full per-line residuals are in each CSV header):

    f14_top x/px 0.000279  y/px 0.001128  dx/dy -0.01378 dy/dx +0.00547  x resid max 0.00057 loo-rms 0.00030 | y resid max 0.00143 loo-rms 0.00144 | max resid 2.0 px | lines 15+6
    f14_mid x/px 0.000279  y/px 0.001122  dx/dy -0.00876 dy/dx +0.00446  x resid max 0.00072 loo-rms 0.00035 | y resid max 0.00213 loo-rms 0.00192 | max resid 2.6 px | lines 15+7
    f14_bot x/px 0.000280  y/px 0.001121  dx/dy -0.00786 dy/dx +0.00348  x resid max 0.00084 loo-rms 0.00042 | y resid max 0.00197 loo-rms 0.00183 | max resid 3.0 px | lines 15+7
    f15_top x/px 0.000530  y/px 0.001065  dx/dy -0.00076 dy/dx +0.00595  x resid max 0.00135 loo-rms 0.00085 | y resid max 0.00243 loo-rms 0.00240 | max resid 2.5 px | lines 11+7
    f15_mid x/px 0.000530  y/px 0.001065  dx/dy -0.00286 dy/dx +0.00494  x resid max 0.00106 loo-rms 0.00077 | y resid max 0.00285 loo-rms 0.00202 | max resid 2.7 px | lines 11+7
    f15_bot x/px 0.000530  y/px 0.001066  dx/dy -0.00437 dy/dx +0.00476  x resid max 0.00071 loo-rms 0.00065 | y resid max 0.00095 loo-rms 0.00062 | max resid 1.3 px | lines 11+7
    a_06    x/px -0.000815  y/px -0.015840  dx/dy -0.00007 dy/dx +0.00301  x resid max 0.00207 loo-rms 0.00161 | y resid max 0.01982 loo-rms 0.02096 | max resid 2.5 px | lines 9+9
    a_07    x/px -0.000821  y/px -0.015832  dx/dy -0.00247 dy/dx +0.00268  x resid max 0.00227 loo-rms 0.00169 | y resid max 0.02132 loo-rms 0.01809 | max resid 2.8 px | lines 9+9
    a_08    x/px -0.000814  y/px -0.015792  dx/dy -0.00215 dy/dx +0.00303  x resid max 0.00177 loo-rms 0.00126 | y resid max 0.03334 loo-rms 0.02549 | max resid 2.2 px | lines 9+9
    a_09    x/px -0.000817  y/px -0.015857  dx/dy -0.00340 dy/dx +0.00316  x resid max 0.00234 loo-rms 0.00175 | y resid max 0.01638 loo-rms 0.01298 | max resid 2.9 px | lines 9+9
    a_0925  x/px -0.000824  y/px -0.015816  dx/dy -0.00544 dy/dx +0.00290  x resid max 0.00307 loo-rms 0.00214 | y resid max 0.04473 loo-rms 0.02659 | max resid 3.7 px | lines 9+9
    a_sup   x/px -0.000816  y/px -0.015818  dx/dy -0.00493 dy/dx +0.00364  x resid max 0.00145 loo-rms 0.00113 | y resid max 0.02264 loo-rms 0.02190 | max resid 1.8 px | lines 9+9
    b_06    x/px -0.000813  y/px -0.015742  dx/dy -0.00733 dy/dx +0.00843  x resid max 0.00216 loo-rms 0.00154 | y resid max 0.02331 loo-rms 0.01599 | max resid 2.7 px | lines 9+9
    b_07    x/px -0.000811  y/px -0.015769  dx/dy -0.00607 dy/dx +0.00627  x resid max 0.00178 loo-rms 0.00103 | y resid max 0.03654 loo-rms 0.02582 | max resid 2.3 px | lines 9+9
    b_08    x/px -0.000810  y/px -0.015753  dx/dy -0.00502 dy/dx +0.00456  x resid max 0.00191 loo-rms 0.00149 | y resid max 0.04178 loo-rms 0.03402 | max resid 2.7 px | lines 9+9
    b_09    x/px -0.000810  y/px -0.015727  dx/dy -0.00818 dy/dx +0.00771  x resid max 0.00237 loo-rms 0.00191 | y resid max 0.04254 loo-rms 0.03003 | max resid 2.9 px | lines 9+9
    b_0925  x/px -0.000809  y/px -0.015707  dx/dy -0.00725 dy/dx +0.00666  x resid max 0.00187 loo-rms 0.00158 | y resid max 0.05377 loo-rms 0.04079 | max resid 3.4 px | lines 9+9
    b_sup   x/px -0.000809  y/px -0.015757  dx/dy -0.00607 dy/dx +0.00535  x resid max 0.00146 loo-rms 0.00121 | y resid max 0.07230 loo-rms 0.04796 | max resid 4.6 px | lines 9+9

Notes on calibration. In fig. 14 and fig. 8 the thick frame lines (the 0 line of P_b, the alpha = 0 line, the left frame) carry the largest residuals, 1.5 to 4.6 px, because their ink is thicker and drawn separately; I kept them in the fits. In fig. 8 the alpha scale is 63 px per degree and the y calibration error (2 x leave-one-out rms) is 0.03 to 0.10 deg; the Cp scale is about 1227 px per unit and its calibration error is 0.002 to 0.004.

## 7. How I read the curves

None of the four figures has plotted symbols; every panel is faired curves, so the curves were read as data.

Independent variable. Fig. 14: Mach number every 0.01 from 0.60 to 1.10 where the curve is drawn, plus both ends. Fig. 15: the four orifice stations 0.25, 0.375, 0.625, 0.875 (from the APPARATUS section), both ends, and, as extra readings, every 0.05 from 0.30 to 0.85 (marked only by their abscissa; they are kind "curve"). Fig. 8: the curves are Cp as a function of alpha, read at fixed alpha every 0.5 deg from 0.5 up to the top of each curve (every 0.25 deg in fig. 8(b) M=0.9 where the curves are short), plus both ends, plus a curve_at_zero row where the curve reaches the alpha = 0 axis line. A few extra points mark hook turning points (kind "curve", note "extra point").

Ink. RM A51J11: curve ink is darker than grid ink (curve cores about 50 to 70 grey, grid lines about 120), so curve ink was taken as grey < 110 (end walks < 100); grid ink mostly drops out. RM A52E01 is 1-bit, grid and curve ink are equally black, so every fitted grid line was blanked over a band of +-5 px (about 11 px wide) before labelling the curve ink (scripts/components_grid.py). Ink was labelled into connected pieces (dashes), and I looked at every panel in colour-coded piece maps and in 1.5x to 4x zooms.

Identification. For each curve I wrote a coarse guide line (a few points read off the zoomed image and the run listings) that says which ink belongs to which curve; the guide only chooses ink, it does not set values. scripts/track.py then steps one pixel at a time along the independent variable, samples the image along the iso-line of that variable (with the calibrated rotation and skew), finds runs of curve ink, and takes the run nearest the guide within a tolerance of 5 to 12 px as the curve. The value is the darkness-weighted centroid of that run (for a near-horizontal line in fig. 14 or 15 this is the centre across the line; for fig. 8 it is the centre along the iso-alpha line). Runs shorter than 4 px (dash tips clipped by the scan line) were dropped.

Gaps. Where the scan line falls in a dash gap, in a grid band (on a grid line of the independent variable, for example M = 0.70 or alpha = 2), or where the curve ink is cut by a fitted grid line (fig. 8 only), the value is bridged by a straight line fitted to the clean ink within 20 px on each side. Every bridged value says so in its note with the gap length; gaps over 40 px, and ink cut by a grid line, are flagged. Gaps over 70 px are not bridged and give no reading.

Merged ink. Where two curves share one run (crossings, overlapping starts) the row is kind "box": its centre and half-height are the merged run, err_basis "bound", flagged, and the note gives the two edge-based alternatives (run edge plus or minus half a single line width) when the run is wider than 1.4 single line widths, or says the lines coincide within a line width.

Lines hidden in a grid line. In fig. 8 several curves lie along a vertical grid line for a stretch (for example wing 3 along Cp = -0.1 at M=0.7 in (a), wing 2 along -0.2 in (b) at M=0.6, 0.7, 0.8, several supersonic lines along -0.2, -0.3, -0.4). There the reading is a box from the grid line centre to the outer edge of any sliver of curve ink showing beside the blanked band, or the band itself (+-0.0045) if nothing shows, widened by the calibration error; err_basis "bound", flagged.

Ends. From the last traced point the end walk steps outward following the ink (and through grid bands) until the ink stops; the end abscissa is the last ink less half the line width (the pen cap), and the end value comes from a straight line through the traced points within 20 px of the end. Ends that run into a grid line or merged ink were checked by eye and, where needed, replaced by hand readings (marked "read by hand").

Hooks near alpha = 0 (fig. 8). In most subsonic panels the wing 2 curve (as labelled, see section 8) turns near alpha 0.5 to 1 and comes back toward smaller -Cp in a nearly level stroke. There a fixed-alpha reading is not single-valued; I gave boxes covering all ink on that alpha line, an extra point at the turning point (from the extreme pixel of the ink piece, moved in by half a line width), and the lower end of the return stroke, all read from the labelled ink pieces (scripts/compext.py) and the zoomed image, all flagged.

alpha = 0. A curve_at_zero row is given where the ink reaches the top edge of the alpha = 0 axis line (within about 0.15 deg) or is hidden in a grid line that meets the axis; the value is where the ink enters the axis line or the grid line position, with a bound. Where the curve stops above the axis, no zero row is given; the list in section 11 says where each curve ends.

## 8. Judgement calls

1. Fig. 14 at M = 0.60: the curves start on the 0.60 grid line (centreline end at 0.6003 to 0.6008), so there is no separate 0.60 row; the curve_end row is the value there. The solid curve at h/t 1.0 ends on the 1.10 grid line at P_b -0.615, and the other right ends are at 1.08 to 1.10 as given.
2. Fig. 14 h/t 1.0 and 0.3: from 0.60 to 0.65 (1.0) and 0.60 to 0.80 (0.3) the dashed line lies on or just below the solid line; boxes. At h/t 0.3 the two rise together from 0.95 to 0.99 and are boxes there too. Where they can be told apart, the solid line is the more negative one in these stretches.
3. Fig. 14 h/t 0.6: the curves cross at M 0.89 to 0.90 (boxes).
4. Fig. 15 identities at the left ends, where two curves start together. Top panel: the ".80" leader goes to the upper (more negative) start and the "1.06" leader to the lower; they meet near 2y/b = 0.30 and I took them as crossing, because then the short-dash line belongs to 0.80 and the dash-dot line to 1.06 on both sides, which matches the line styles in the other panels. Bottom panel, upper pair: the "0.98" leader goes to the upper start and "1.06" to the lower; they meet near 0.33 and I took them as touching (not crossing), because only then do both the leaders and the line styles (0.98 long dashes, 1.06 dash-dot) agree. Bottom panel, lower pair: ".60" leader to the upper start, ".80" to the lower; taken as crossing near 0.28, which again makes leaders and styles agree. The rows in these start regions are flagged with the alternative (the values swap).
5. Fig. 15 h/t 0.6: M 0.80 runs just below the -0.2 grid line from 2y/b about 0.68 to 0.78, and just below the -0.4 grid line from 0.27 to 0.33; read from the ink beside the grid line. M 0.98 crosses M 1.06 near 0.75 and M 0.80 crosses M 0.60 near 0.56 and 0.80 (boxes).
6. Fig. 8 wing identity. Wing 3 (short dashes) is clear in every subsonic panel. Wing 2 and wing 4 were told apart only by dash pattern: wing 4 should show short dashes between its long dashes. The clearest case is fig. 8(a) M=0.7, where the curve that starts at Cp -0.49 shows short pieces between long dashes, so I called it wing 4 and the hooked curve wing 2. I measured clean dash lengths along each curve (scripts/dash2.py, dashstat.py): the hooked curves carry dashes of about 40 to 67 px with small gaps (6 to 14 px) and no clear short dashes; the far-right curves carry long dashes of 85 to 104 px with occasional short pieces of 10 to 36 px. I applied the same rule in every panel (hooked or medium-dash curve = wing 2; long dash with short pieces = wing 4). Only M=0.7 in fig. 8(a) is unflagged for this; every other wing 2 and wing 4 row is flagged with the alternative "the other of the two". In fig. 8(a) M=0.6 and M=0.9 and fig. 8(b) M=0.6 and M=0.9 only two curves are drawn; the second is labelled wing 2 (alternative wing 4) and no wing 4 curve could be found.
7. Fig. 8(a) M=0.7 and M=0.6: the wing 2 curve ends by running into the wing 3 curve at about alpha 10.1, and wing 3 continues up to alpha 12 (it has short dashes above the join). Fig. 8(b) M=0.7: the curve with long dashes ends where it meets the short-dash curve at alpha 7.6 and the short-dash curve continues to (-0.29, 10.3).
8. Fig. 8(b) M=0.7 and M=0.8: near the bottom one curve runs down the -0.2 grid line to the axis and the other leaves the grid line in a short-dash hook to Cp about -0.31 near alpha 0.2. I gave the hook to wing 3 because its dashes are short; alternative: the hook belongs to wing 2 and wing 3 is the one hidden in the grid line. Fig. 8(b) M=0.6 is drawn the other way (the medium-dash curve ends in the hook and the short-dash curve stops on the -0.2 line at alpha 1.2); there I gave the hook to wing 2.
9. Fig. 8(a) M=0.925: the wing 3 curve and the wing 2 hook stroke cross at about (-0.27, 0.6); the arc from there to the axis at -0.236 is given to wing 2 (hook return), alternative wing 3.
10. Fig. 8(a) M=0.9: the two curves meet in an X on the alpha = 6 grid line; both tops are taken at alpha 6.0.
11. Supersonic panels (M=1.2, 1.4, 1.7 in both parts). These panels hold up to nine curves with heavy overlap, label arrows across the curve tops, and several lines running inside grid lines. I traced the lines that can be followed and named them by Mach group and a letter (for example "M=1.7 line c"); the Mach group comes from position and the label arrows; only the short-dash line in the M=1.7 group of fig. 8(a) can be given a line style. Wing identity is not given for any supersonic line. Tops of the lines are not read where the label arrows cover them (the traces stop below the arrows, at about alpha 10 in (a) and alpha 3 to 6.5 in (b)). In fig. 8(a) the M=1.7 lines c and d meet at about alpha 4.5 and were taken as crossing (straight continuation); alternative: touching, with the parts above 4.5 swapped. In fig. 8(a) two M=1.4 lines run inside the -0.4 grid line between alpha 1 and 5 to 8.5 (boxes). Some stretches have no reading because the line could not be followed: fig. 8(a) M=1.7 line c between alpha 6.0 and 8.0, M=1.2 line e at 5.0 to 6.0; fig. 8(b) M=1.4 line e at 2.5 and 4.0. Every row in these two panels is flagged.
12. Stray marks not read as data: specks off the curves in fig. 8(a) M=0.7 (near -0.42, 1.56) and M=0.8 (near -0.55, 13.3 and -0.35, 7.5), and slivers of grid ink.

## 9. Errors

Every value has an error. For curve readings the error is about 2 sigma (err_basis 2sigma), formed in quadrature from: the calibration (2 x leave-one-out rms of that axis), the centring of the line (2 px for the 600 dpi RM A51J11 renders, 3 px for the 480 dpi RM A52E01 renders, which is about one native pixel and a half), the local slope of the curve times the calibration error of the independent axis, and, for bridged values, twice the rms of the bridging fit plus 1.5 px. x_err (or y_err for fig. 8) of a fixed-abscissa reading is the calibration error of that axis. Ends carry half a line width plus 2 px plus calibration on the abscissa. Boxes (merged ink, hidden lines, hand-read hook regions) are bounds. Line widths: about 8 to 12 px in the RM A51J11 renders (0.009 to 0.013 in P_b), about 10 px in the RM A52E01 renders (0.008 in Cp, 0.16 deg in alpha).

## 10. Files

- readings/a51j11_fig14.csv, readings/a51j11_fig15.csv, readings/a52e01_fig8a.csv, readings/a52e01_fig8b.csv (header lines start with #; columns id,kind,panel,series,symbol,filled,x,x_err,y,y_err,err_basis,flag,note; "symbol" holds the line style since there are no symbols; "filled" is empty). In fig. 8, x is the pressure coefficient and y the angle of attack, as the axes are printed.
- overlays/: one image per panel (6 for RM A51J11, one per sub-panel, and 12 for RM A52E01), every reading marked on the page: crosses for curve readings, squares for ends, rectangles for boxes, diamonds for zero rows, with a colour key at the top left.
- scripts/: calib.py (grid fits), components.py and components_grid.py (ink pieces), track.py (tracing and reading), overlay.py, compext.py, dash2.py and dashstat.py (dash patterns), listruns_u.py and listruns_v.py, profile_u.py, peaks.py, crop.py, readlib.py, assemble.py (writes the CSV files and overlays), flagsummary.py. work/ holds the per-panel configurations (guides), traces, hand-read items (*_post.json) and intermediate images.


## 11. Counts per panel and series

a51j11_fig14.csv: 304 rows, 60 flagged
    h/t = 1.0, with surface roughness: 52 (curve_end 2, box 4, curve 46)
    h/t = 1.0, without surface roughness: 51 (curve_end 2, box 3, curve 46)
    h/t = 0.6, with surface roughness: 50 (curve_end 2, curve 46, box 2)
    h/t = 0.6, without surface roughness: 50 (curve_end 2, curve 47, box 1)
    h/t = 0.3, with surface roughness: 50 (curve_end 2, box 25, curve 23)
    h/t = 0.3, without surface roughness: 51 (curve_end 2, box 25, curve 24)
a51j11_fig15.csv: 210 rows, 44 flagged
    h/t = 1.0, M = 0.60: 18 (curve 16, curve_end 2)
    h/t = 1.0, M = 0.80: 17 (curve 14, curve_end 2, box 1)
    h/t = 1.0, M = 0.98: 17 (curve_end 2, curve 15)
    h/t = 1.0, M = 1.06: 18 (curve_end 2, curve 15, box 1)
    h/t = 0.6, M = 0.60: 17 (curve_end 2, curve 13, box 2)
    h/t = 0.6, M = 0.80: 18 (curve_end 2, curve 14, box 2)
    h/t = 0.6, M = 0.98: 18 (curve_end 2, curve 15, box 1)
    h/t = 0.6, M = 1.06: 18 (curve_end 2, curve 15, box 1)
    h/t = 0.3, M = 0.60: 18 (curve 8, curve_end 2, box 8)
    h/t = 0.3, M = 0.80: 18 (curve 8, curve_end 2, box 8)
    h/t = 0.3, M = 0.98: 16 (curve_end 2, curve 12, box 2)
    h/t = 0.3, M = 1.06: 17 (curve_end 2, curve 13, box 2)
a52e01_fig8a.csv: 409 rows, 295 flagged
    M=0.6 / wing 2: 23 (curve_at_zero 1, curve_end 2, box 1, curve 19)
    M=0.6 / wing 3: 25 (curve_end 2, curve 23)
    M=0.7 / wing 2: 23 (curve_at_zero 1, curve_end 2, box 1, curve 19)
    M=0.7 / wing 3: 25 (curve_end 2, curve 14, box 9)
    M=0.7 / wing 4: 30 (curve_at_zero 1, curve_end 2, curve 27)
    M=0.8 / wing 2: 19 (curve_at_zero 1, curve_end 2, box 1, curve 15)
    M=0.8 / wing 3: 17 (curve_end 2, curve 15)
    M=0.8 / wing 4: 30 (curve_at_zero 1, curve_end 2, curve 27)
    M=0.9 / wing 2: 15 (curve_at_zero 1, curve_end 2, box 3, curve 9)
    M=0.9 / wing 3: 14 (curve_at_zero 1, curve_end 2, curve 10, box 1)
    M=0.925 / wing 2: 7 (curve_at_zero 1, curve_end 2, box 1, curve 3)
    M=0.925 / wing 3: 8 (curve_end 2, curve 6)
    M=0.925 / wing 4: 12 (curve_end 2, curve 10)
    M=1.2, 1.4, 1.7 / M=1.2 line e: 15 (curve_end 1, curve 14)
    M=1.2, 1.4, 1.7 / M=1.2 line f: 9 (curve_end 1, curve 8)
    M=1.2, 1.4, 1.7 / M=1.2 line g: 16 (curve_end 1, curve 15)
    M=1.2, 1.4, 1.7 / M=1.4 line a: 21 (curve_end 1, box 9, curve 11)
    M=1.2, 1.4, 1.7 / M=1.4 line c: 17 (curve_end 1, curve 1, box 15)
    M=1.2, 1.4, 1.7 / M=1.4 line d: 18 (curve_end 1, curve 17)
    M=1.2, 1.4, 1.7 / M=1.7 line a (short dashes): 20 (curve_end 1, curve 18, box 1)
    M=1.2, 1.4, 1.7 / M=1.7 line b (diagonal stroke at bottom): 3 (curve_end 1, curve 1, box 1)
    M=1.2, 1.4, 1.7 / M=1.7 line c: 15 (curve_end 1, curve 12, box 2)
    M=1.2, 1.4, 1.7 / M=1.7 line d: 27 (box 5, curve_end 2, curve 20)
a52e01_fig8b.csv: 262 rows, 189 flagged
    M=0.6 / wing 2: 21 (curve_end 2, box 6, curve 13)
    M=0.6 / wing 3: 17 (curve_end 2, curve 15)
    M=0.7 / wing 2: 18 (curve_at_zero 1, curve_end 2, box 5, curve 10)
    M=0.7 / wing 3: 22 (curve_end 2, curve 20)
    M=0.7 / wing 4: 15 (curve_at_zero 1, curve_end 2, box 1, curve 11)
    M=0.8 / wing 2: 15 (curve_at_zero 1, curve_end 2, box 2, curve 10)
    M=0.8 / wing 3: 13 (curve_end 2, curve 11)
    M=0.8 / wing 4: 12 (curve_end 2, curve 10)
    M=0.9 / wing 2: 10 (curve_at_zero 1, curve_end 2, box 1, curve 6)
    M=0.9 / wing 3: 17 (curve_at_zero 1, curve_end 2, curve 14)
    M=0.925 / wing 2: 6 (curve_end 2, box 1, curve 3)
    M=0.925 / wing 3: 14 (curve_at_zero 1, curve_end 2, curve 11)
    M=0.925 / wing 4: 11 (curve_at_zero 1, curve_end 2, box 1, curve 7)
    M=1.2, 1.4, 1.7 / M=1.2 line g: 10 (curve_end 1, curve 9)
    M=1.2, 1.4, 1.7 / M=1.2 line h: 4 (curve 4)
    M=1.2, 1.4, 1.7 / M=1.4 line d: 11 (curve_end 1, curve 10)
    M=1.2, 1.4, 1.7 / M=1.4 line e: 8 (curve_end 1, curve 5, box 2)
    M=1.2, 1.4, 1.7 / M=1.4 line f: 12 (curve_end 1, curve 11)
    M=1.2, 1.4, 1.7 / M=1.7 line a: 7 (curve_end 1, curve 6)
    M=1.2, 1.4, 1.7 / M=1.7 line b: 5 (curve_end 1, curve 4)
    M=1.2, 1.4, 1.7 / M=1.7 line c: 14 (curve_end 1, box 4, curve 9)

## 12. Where each fig. 8 curve ends at the bottom (alpha = 0)

    fig8a M=0.6 | wing 2 | zero row given: x -0.1810 +- 0.0090 (bound)
    fig8a M=0.6 | wing 3 | no zero row: lowest end at alpha 0.2624 (x -0.1549)
    fig8a M=0.7 | wing 2 | zero row given: x -0.1920 +- 0.0080 (bound)
    fig8a M=0.7 | wing 3 | no zero row: lowest end at alpha 0.3958 (x -0.1259)
    fig8a M=0.7 | wing 4 | zero row given: x -0.4980 +- 0.0080 (bound)
    fig8a M=0.8 | wing 2 | zero row given: x -0.2020 +- 0.0090 (bound)
    fig8a M=0.8 | wing 3 | no zero row: lowest end at alpha 0.4224 (x -0.1424)
    fig8a M=0.8 | wing 4 | zero row given: x -0.5130 +- 0.0080 (bound)
    fig8a M=0.9 | wing 2 | zero row given: x -0.2180 +- 0.0180 (bound)
    fig8a M=0.9 | wing 3 | zero row given: x -0.1650 +- 0.0050 (2sigma)
    fig8a M=0.925 | wing 2 | zero row given: x -0.2215 +- 0.0165 (bound)
    fig8a M=0.925 | wing 3 | no zero row: lowest end at alpha 0.6000 (x -0.2690)
    fig8a M=0.925 | wing 4 | no zero row: lowest end at alpha 0.4779 (x -0.6472)
    fig8a M=1.2, 1.4, 1.7 | M=1.2 line e | no zero row: lowest end at alpha 0.2424 (x -0.5590)
    fig8a M=1.2, 1.4, 1.7 | M=1.2 line f | no zero row: lowest end at alpha 0.2424 (x -0.5711)
    fig8a M=1.2, 1.4, 1.7 | M=1.2 line g | no zero row: lowest end at alpha 1.1163 (x -0.5229)
    fig8a M=1.2, 1.4, 1.7 | M=1.4 line a | no zero row: lowest end at alpha 0.2424 (x -0.3812)
    fig8a M=1.2, 1.4, 1.7 | M=1.4 line c | no zero row: lowest end at alpha 0.2147 (x -0.4206)
    fig8a M=1.2, 1.4, 1.7 | M=1.4 line d | no zero row: lowest end at alpha 0.2265 (x -0.4290)
    fig8a M=1.2, 1.4, 1.7 | M=1.7 line a (short dashes) | no zero row: lowest end at alpha 0.4164 (x -0.1812)
    fig8a M=1.2, 1.4, 1.7 | M=1.7 line b (diagonal stroke at bottom) | no zero row: lowest end at alpha 0.4322 (x -0.1484)
    fig8a M=1.2, 1.4, 1.7 | M=1.7 line c | no zero row: lowest end at alpha 0.2265 (x -0.2711)
    fig8a M=1.2, 1.4, 1.7 | M=1.7 line d | no zero row: lowest end at alpha 1.8202 (x -0.2061)
    fig8b M=0.6 | wing 2 | no zero row: lowest end at alpha 0.2259 (x -0.2934)
    fig8b M=0.6 | wing 3 | no zero row: lowest end at alpha 1.2177 (x -0.1924)
    fig8b M=0.7 | wing 2 | zero row given: x -0.2000 +- 0.0060 (bound)
    fig8b M=0.7 | wing 3 | no zero row: lowest end at alpha 0.2577 (x -0.3081)
    fig8b M=0.7 | wing 4 | zero row given: x -0.5020 +- 0.0060 (bound)
    fig8b M=0.8 | wing 2 | zero row given: x -0.2000 +- 0.0060 (bound)
    fig8b M=0.8 | wing 3 | no zero row: lowest end at alpha 0.2418 (x -0.3108)
    fig8b M=0.8 | wing 4 | no zero row: lowest end at alpha 0.2575 (x -0.5398)
    fig8b M=0.9 | wing 2 | zero row given: x -0.2550 +- 0.0100 (bound)
    fig8b M=0.9 | wing 3 | zero row given: x -0.1360 +- 0.0050 (2sigma)
    fig8b M=0.925 | wing 2 | no zero row: lowest end at alpha 0.3160 (x -0.3060)
    fig8b M=0.925 | wing 3 | zero row given: x -0.1300 +- 0.0060 (2sigma)
    fig8b M=0.925 | wing 4 | zero row given: x -0.6000 +- 0.0060 (bound)
    fig8b M=1.2, 1.4, 1.7 | M=1.2 line g | no zero row: lowest end at alpha 0.3233 (x -0.5746)
    fig8b M=1.2, 1.4, 1.7 | M=1.2 line h | no zero row, no lower end read
    fig8b M=1.2, 1.4, 1.7 | M=1.4 line d | no zero row: lowest end at alpha 0.2761 (x -0.3711)
    fig8b M=1.2, 1.4, 1.7 | M=1.4 line e | no zero row: lowest end at alpha 0.2839 (x -0.3926)
    fig8b M=1.2, 1.4, 1.7 | M=1.4 line f | no zero row: lowest end at alpha 0.2761 (x -0.4247)
    fig8b M=1.2, 1.4, 1.7 | M=1.7 line a | no zero row: lowest end at alpha 0.2603 (x -0.2605)
    fig8b M=1.2, 1.4, 1.7 | M=1.7 line b | no zero row: lowest end at alpha 0.2918 (x -0.2811)
    fig8b M=1.2, 1.4, 1.7 | M=1.7 line c | no zero row: lowest end at alpha 0.1000 (x -0.3000)

Curves without a zero row stop above the axis line; the lower curve_end row is the reading nearest alpha 0. Several supersonic lines stop 0.15 to 0.2 deg above zero, within about one line width of the axis line, and are given no zero row.

## 13. Every flagged (uncertain) reading

Grouped by figure, panel and series; each reason lists the rows it applies to by kind and abscissa (Mach number, 2y/b or alpha). c = curve, end = curve_end, box = box, zero = curve_at_zero. A row can appear under more than one reason. The note column of each CSV row gives the reason in full.

    a51j11_fig14.csv: 60 flagged of 304 rows
       h/t = 1.0, with surface roughness
        merged ink, box: box 0.6100, box 0.6200, box 0.6300, box 0.6400
       h/t = 1.0, without surface roughness
        merged ink, box: box 0.6100, box 0.6200, box 0.6300
       h/t = 0.6, with surface roughness
        merged ink, box: box 0.8900, box 0.9000
       h/t = 0.6, without surface roughness
        merged ink, box: box 0.8900
       h/t = 0.3, with surface roughness
        merged ink, box: box 0.6100, box 0.6200, box 0.6300, box 0.6400, box 0.6500, box 0.6600, box 0.6700, box 0.6800, box 0.6900, box 0.7000, box 0.7100, box 0.7200, box 0.7300, box 0.7400, box 0.7500, box 0.7600, box 0.7700, box 0.7800, box 0.7900, box 0.8000, box 0.9500, box 0.9600, box 0.9700, box 0.9800, box 0.9900
       h/t = 0.3, without surface roughness
        merged ink, box: box 0.6100, box 0.6200, box 0.6300, box 0.6400, box 0.6500, box 0.6600, box 0.6700, box 0.6800, box 0.6900, box 0.7000, box 0.7100, box 0.7200, box 0.7300, box 0.7400, box 0.7500, box 0.7600, box 0.7700, box 0.7800, box 0.7900, box 0.8000, box 0.9500, box 0.9600, box 0.9700, box 0.9800, box 0.9900
    a51j11_fig15.csv: 44 flagged of 210 rows
       h/t = 1.0, M = 0.80
        fig. 15 start: cross or touch identity: c 0.2500, end 0.2506, box 0.3000
        merged ink, box: box 0.3000
       h/t = 1.0, M = 0.98
        long dash gap bridged: c 0.3500
       h/t = 1.0, M = 1.06
        fig. 15 start: cross or touch identity: end 0.2496, c 0.2500, box 0.3000
        merged ink, box: box 0.3000
       h/t = 0.6, M = 0.60
        merged ink, box: box 0.5500, box 0.8000
       h/t = 0.6, M = 0.80
        merged ink, box: box 0.5500, box 0.8000
       h/t = 0.6, M = 0.98
        merged ink, box: box 0.7500
       h/t = 0.6, M = 1.06
        merged ink, box: box 0.7500
       h/t = 0.3, M = 0.60
        fig. 15 start: cross or touch identity: c 0.2500, end 0.2504, box 0.3000
        merged ink, box: box 0.3000, box 0.3500, box 0.3750, box 0.6000, box 0.6250, box 0.6500, box 0.7000, box 0.7500
       h/t = 0.3, M = 0.80
        fig. 15 start: cross or touch identity: c 0.2500, end 0.2512, box 0.3000
        merged ink, box: box 0.3000, box 0.3500, box 0.3750, box 0.6000, box 0.6250, box 0.6500, box 0.7000, box 0.7500
       h/t = 0.3, M = 0.98
        fig. 15 start: cross or touch identity: end 0.2533, c 0.3000, box 0.3500, box 0.3750, c 0.4000
        merged ink, box: box 0.3500, box 0.3750
       h/t = 0.3, M = 1.06
        fig. 15 start: cross or touch identity: end 0.2440, c 0.2500, c 0.3000, box 0.3500, box 0.3750, c 0.4000
        merged ink, box: box 0.3500, box 0.3750
    a52e01_fig8a.csv: 295 flagged of 409 rows
      M=0.6 wing 2
        end or zero at the axis line, read by hand: zero 0.0000, end 0.1700
        wing 2 or wing 4 identity by dash pattern: zero 0.0000, end 0.1700, box 0.5000, c 0.6800, c 1.0000, c 1.5000, c 2.0000, c 2.5000, c 3.0000, c 3.5000, c 4.0000, c 4.5000, c 5.0000, c 5.5000, c 6.0000, c 6.5000, c 7.0000, c 7.5000, c 8.0000, c 8.5000, c 9.0000, c 9.5000, end 10.0800
        hook or turning region, read by hand: end 0.1700, box 0.5000, c 0.6800
        merged ink, box: end 10.0800
      M=0.6 wing 3
        ink cut by a grid line, bridged: c 8.5000, c 9.0000, c 11.0000
      M=0.7 wing 2
        end or zero at the axis line, read by hand: zero 0.0000, end 0.2000
        hook or turning region, read by hand: end 0.2000, box 0.5000
        merged ink, box: end 10.1500
      M=0.7 wing 3
        hidden along a grid line, box: box 3.5000, box 4.0000, box 4.5000, box 5.0000, box 5.5000, box 6.0000, box 6.5000, box 7.0000, box 7.5000
        ink cut by a grid line, bridged: c 10.5000, c 11.5000
      M=0.7 wing 4
        merged ink, box: zero 0.0000, end 0.2000
        end or zero at the axis line, read by hand: zero 0.0000, end 0.2000
        ink cut by a grid line, bridged: c 1.5000, c 5.0000, c 10.5000
      M=0.8 wing 2
        end or zero at the axis line, read by hand: zero 0.0000
        wing 2 or wing 4 identity by dash pattern: zero 0.0000, end 0.2000, box 0.5000, c 0.5600, c 1.0000, c 1.5000, c 2.0000, c 2.5000, c 3.0000, c 3.5000, c 4.0000, c 4.5000, c 5.0000, c 5.5000, c 6.0000, c 6.5000, c 7.0000, c 7.5000, end 7.8015
        hook or turning region, read by hand: end 0.2000, box 0.5000, c 0.5600
        end on or near a grid line: end 7.8015
      M=0.8 wing 4
        end or zero at the axis line, read by hand: zero 0.0000
        wing 2 or wing 4 identity by dash pattern: zero 0.0000, end 0.2803, c 0.5000, c 1.0000, c 1.5000, c 2.0000, c 2.5000, c 3.0000, c 3.5000, c 4.0000, c 4.5000, c 5.0000, c 5.5000, c 6.0000, c 6.5000, c 7.0000, c 7.5000, c 8.0000, c 8.5000, c 9.0000, c 9.5000, c 10.0000, c 10.5000, c 11.0000, c 11.5000, c 12.0000, c 12.5000, c 13.0000, c 13.5000, end 13.8184
        ink cut by a grid line, bridged: c 2.5000
        large error (steep or curving): c 10.5000, c 11.0000, c 12.0000
        end on or near a grid line: end 13.8184
      M=0.9 wing 2
        end or zero at the axis line, read by hand: zero 0.0000, end 0.1300
        wing 2 or wing 4 identity by dash pattern: zero 0.0000, end 0.1300, box 0.5000, c 0.5900, box 1.0000, c 1.5000, c 2.0000, c 2.5000, c 3.0000, c 3.5000, c 4.0000, c 4.5000, c 5.0000, box 5.5000, end 6.0000
        hook or turning region, read by hand: end 0.1300, box 0.5000, c 0.5900, box 1.0000
        ink cut by a grid line, bridged: c 2.5000, c 3.0000
        merged ink, box: box 5.5000
      M=0.9 wing 3
        end or zero at the axis line, read by hand: zero 0.0000
        merged ink, box: box 5.5000
        other: top: the two curves meet in an X on the alpha 6 grid line; end hidden in the gri: end 6.0000
      M=0.925 wing 2
        end or zero at the axis line, read by hand: zero 0.0000, end 0.1500
        wing 2 or wing 4 identity by dash pattern: zero 0.0000, end 0.1500, box 0.5000, c 0.5200, c 1.0000, c 1.5000, end 1.6601
        hook or turning region, read by hand: end 0.1500, box 0.5000, c 0.5200
      M=0.925 wing 3
        hook or turning region, read by hand: end 0.6000
        end or zero at the axis line, read by hand: end 0.6000
        end on or near a grid line: end 4.0000
      M=0.925 wing 4
        wing 2 or wing 4 identity by dash pattern: end 0.4779, c 0.5000, c 1.0000, c 1.5000, c 2.0000, c 2.5000, c 3.0000, c 3.5000, c 4.0000, c 4.5000, c 5.0000, end 5.0000
        ink cut by a grid line, bridged: c 1.0000
      M=1.2, 1.4, 1.7 M=1.2 line e
        supersonic panel, wing not identified: end 0.2424, c 0.5000, c 1.0000, c 1.5000, c 2.0000, c 2.5000, c 3.0000, c 3.5000, c 4.0000, c 4.5000, c 6.5000, c 7.0000, c 7.5000, c 8.0000, c 8.5000
      M=1.2, 1.4, 1.7 M=1.2 line f
        supersonic panel, wing not identified: end 0.2424, c 0.5000, c 1.0000, c 1.5000, c 2.0000, c 2.5000, c 3.0000, c 3.5000, c 4.0000
      M=1.2, 1.4, 1.7 M=1.2 line g
        supersonic panel, wing not identified: end 1.1163, c 1.5000, c 2.0000, c 2.5000, c 3.0000, c 3.5000, c 4.0000, c 4.5000, c 5.0000, c 5.5000, c 6.0000, c 6.5000, c 7.0000, c 7.5000, c 8.0000, c 8.5000
        ink cut by a grid line, bridged: c 8.5000
      M=1.2, 1.4, 1.7 M=1.4 line a
        supersonic panel, wing not identified: end 0.2424, box 1.0000, box 1.5000, box 2.0000, box 2.5000, box 3.0000, box 3.5000, box 4.0000, box 4.5000, box 5.0000, c 5.5000, c 6.0000, c 6.5000, c 7.0000, c 7.5000, c 8.0000, c 8.5000, c 9.0000, c 9.5000, c 10.0000, c 10.5000
        hidden along a grid line, box: box 1.0000, box 1.5000, box 2.0000, box 2.5000, box 3.0000, box 3.5000, box 4.0000, box 4.5000, box 5.0000
        ink cut by a grid line, bridged: c 5.5000
      M=1.2, 1.4, 1.7 M=1.4 line c
        supersonic panel, wing not identified: end 0.2147, c 0.5000, box 1.5000, box 2.0000, box 2.5000, box 3.0000, box 3.5000, box 4.0000, box 4.5000, box 5.0000, box 5.5000, box 6.0000, box 6.5000, box 7.0000, box 7.5000, box 8.0000, box 8.5000
        hidden along a grid line, box: box 1.5000, box 2.0000, box 2.5000, box 3.0000, box 3.5000, box 4.0000, box 4.5000, box 5.0000, box 5.5000, box 6.0000, box 6.5000, box 7.0000, box 7.5000, box 8.0000, box 8.5000
      M=1.2, 1.4, 1.7 M=1.4 line d
        supersonic panel, wing not identified: end 0.2265, c 0.5000, c 1.0000, c 1.5000, c 2.0000, c 2.5000, c 3.0000, c 3.5000, c 4.0000, c 4.5000, c 5.0000, c 5.5000, c 6.0000, c 6.5000, c 7.0000, c 7.5000, c 8.0000, c 8.5000
      M=1.2, 1.4, 1.7 M=1.7 line a (short dashes)
        supersonic panel, wing not identified: end 0.4164, c 0.5000, box 1.0000, c 1.5000, c 2.0000, c 2.5000, c 3.0000, c 3.5000, c 4.0000, c 4.5000, c 5.0000, c 5.5000, c 6.0000, c 6.5000, c 7.0000, c 7.5000, c 8.0000, c 8.5000, c 9.0000, c 9.5000
        merged ink, box: box 1.0000
      M=1.2, 1.4, 1.7 M=1.7 line b (diagonal stroke at bottom)
        supersonic panel, wing not identified: end 0.4322, c 0.5000, box 1.0000
        merged ink, box: box 1.0000
      M=1.2, 1.4, 1.7 M=1.7 line c
        supersonic panel, wing not identified: end 0.2265, c 0.5000, c 1.0000, c 1.5000, c 2.0000, c 2.5000, c 3.0000, c 3.5000, c 4.0000, box 4.5000, box 5.0000, c 5.5000, c 8.5000, c 9.0000, c 9.5000
        merged ink, box: box 4.5000, box 5.0000
      M=1.2, 1.4, 1.7 M=1.7 line d
        hidden along a grid line, box: box 0.5000, box 1.0000, box 1.5000
        supersonic panel, wing not identified: box 0.5000, box 1.0000, box 1.5000, end 1.8202, c 2.5000, c 3.0000, c 3.5000, c 4.0000, box 4.5000, box 5.0000, c 5.5000, c 6.0000, c 6.5000, c 7.0000, c 7.5000, c 8.0000, c 8.5000, c 9.0000, c 9.5000, c 10.0000, c 10.5000, c 11.0000, c 11.5000, c 12.0000, c 12.5000, c 13.0000, end 13.5450
        end on or near a grid line: end 1.8202
        merged ink, box: box 4.5000, box 5.0000
    a52e01_fig8b.csv: 189 flagged of 262 rows
      M=0.6 wing 2
        wing 2 or wing 4 identity by dash pattern: end 0.2259, box 0.5000, c 1.0000, box 1.5000, box 2.0000, box 2.5000, box 3.0000, box 3.5000, c 4.0000, c 4.5000, c 5.0000, c 5.5000, c 6.0000, c 6.5000, c 7.0000, c 7.5000, c 8.0000, c 8.5000, c 9.0000, c 9.5000, end 9.8129
        hidden along a grid line, box: box 0.5000, box 1.5000, box 2.0000, box 2.5000, box 3.0000, box 3.5000
        ink cut by a grid line, bridged: c 9.0000
        end on or near a grid line: end 9.8129
      M=0.7 wing 2
        end or zero at the axis line, read by hand: zero 0.0000, end 0.1000
        wing 2 or wing 4 identity by dash pattern: zero 0.0000, end 0.1000, box 0.5000, box 1.0000, box 1.5000, box 2.0000, box 2.5000, c 3.0000, c 3.5000, c 4.0000, c 4.5000, c 5.0000, c 5.5000, c 6.0000, c 6.5000, c 7.0000, c 7.5000, end 7.5783
        hidden along a grid line, box: end 0.1000, box 0.5000, box 1.0000, box 1.5000, box 2.0000, box 2.5000
      M=0.7 wing 3
        ink cut by a grid line, bridged: c 0.5000, c 1.5000, c 8.5000
        large error (steep or curving): c 0.5000
      M=0.7 wing 4
        end or zero at the axis line, read by hand: zero 0.0000, end 0.1500
        wing 2 or wing 4 identity by dash pattern: zero 0.0000, end 0.1500, box 0.5000, c 1.0000, c 1.5000, c 2.0000, c 2.5000, c 3.0000, c 3.5000, c 4.0000, c 4.5000, c 5.0000, c 5.5000, c 6.0000, end 6.2655
        hidden along a grid line, box: end 0.1500, box 0.5000
        ink cut by a grid line, bridged: c 4.5000
      M=0.8 wing 2
        end or zero at the axis line, read by hand: zero 0.0000, end 0.1000
        wing 2 or wing 4 identity by dash pattern: zero 0.0000, end 0.1000, box 0.5000, box 1.0000, c 1.5000, c 2.0000, c 2.5000, c 3.0000, c 3.5000, c 4.0000, c 4.5000, c 5.0000, c 5.5000, c 6.0000, end 6.1926
        hidden along a grid line, box: end 0.1000, box 0.5000, box 1.0000
      M=0.8 wing 4
        wing 2 or wing 4 identity by dash pattern: end 0.2575, c 0.5000, c 1.0000, c 1.5000, c 2.0000, c 2.5000, c 3.0000, c 3.5000, c 4.0000, c 4.5000, end 4.9599, c 5.0000
      M=0.9 wing 2
        end or zero at the axis line, read by hand: zero 0.0000, end 0.1000
        wing 2 or wing 4 identity by dash pattern: zero 0.0000, end 0.1000, box 0.2500, c 0.4900, c 0.5000, c 0.7500, c 1.0000, c 1.2500, c 1.5000, end 1.9500
        hook or turning region, read by hand: box 0.2500, c 0.4900, c 0.5000
        end on or near a grid line: end 1.9500
      M=0.9 wing 3
        end or zero at the axis line, read by hand: zero 0.0000
        ink cut by a grid line, bridged: c 3.0000, c 3.5000
      M=0.925 wing 2
        wing 2 or wing 4 identity by dash pattern: end 0.3160, box 0.5000, c 1.0000, c 1.5000, c 2.0000, end 2.2205
        hidden along a grid line, box: box 0.5000
      M=0.925 wing 3
        end or zero at the axis line, read by hand: zero 0.0000
        ink cut by a grid line, bridged: c 1.5000, c 4.5000
        end on or near a grid line: end 5.9500
      M=0.925 wing 4
        end or zero at the axis line, read by hand: zero 0.0000, end 0.1000
        wing 2 or wing 4 identity by dash pattern: zero 0.0000, end 0.1000, box 0.5000, c 1.0000, c 1.5000, c 2.0000, c 2.5000, c 3.0000, c 3.5000, c 3.6200, end 3.8300
        hidden along a grid line, box: end 0.1000, box 0.5000
      M=1.2, 1.4, 1.7 M=1.2 line g
        supersonic panel, wing not identified: end 0.3233, c 0.5000, c 1.0000, c 1.5000, c 2.0000, c 2.5000, c 3.0000, c 3.5000, c 4.0000, c 4.5000
      M=1.2, 1.4, 1.7 M=1.2 line h
        supersonic panel, wing not identified: c 1.0000, c 1.5000, c 2.0000, c 2.5000
      M=1.2, 1.4, 1.7 M=1.4 line d
        supersonic panel, wing not identified: end 0.2761, c 0.5000, c 1.0000, c 1.5000, c 2.0000, c 2.5000, c 3.0000, c 3.5000, c 4.0000, c 4.5000, c 5.0000
      M=1.2, 1.4, 1.7 M=1.4 line e
        supersonic panel, wing not identified: end 0.2839, c 0.5000, c 1.0000, c 1.5000, c 2.0000, box 3.0000, box 3.5000, c 4.5000
        hidden along a grid line, box: box 3.0000, box 3.5000
      M=1.2, 1.4, 1.7 M=1.4 line f
        supersonic panel, wing not identified: end 0.2761, c 0.5000, c 1.0000, c 1.5000, c 2.0000, c 2.5000, c 3.0000, c 3.5000, c 4.0000, c 4.5000, c 5.0000, c 5.5000
      M=1.2, 1.4, 1.7 M=1.7 line a
        supersonic panel, wing not identified: end 0.2603, c 0.5000, c 1.0000, c 1.5000, c 2.0000, c 2.5000, c 3.0000
      M=1.2, 1.4, 1.7 M=1.7 line b
        supersonic panel, wing not identified: end 0.2918, c 0.5000, c 1.0000, c 1.5000, c 2.0000
      M=1.2, 1.4, 1.7 M=1.7 line c
        end or zero at the axis line, read by hand: end 0.1000
        supersonic panel, wing not identified: end 0.1000, box 0.5000, box 1.0000, box 1.5000, box 2.0000, c 2.5000, c 3.0000, c 3.5000, c 4.0000, c 4.5000, c 5.0000, c 5.5000, c 6.0000, c 6.5000
        hidden along a grid line, box: box 0.5000, box 1.0000, box 1.5000, box 2.0000
