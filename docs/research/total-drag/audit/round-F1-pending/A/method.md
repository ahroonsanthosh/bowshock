# Blind reading A: NACA RM L55H09, figure 6

Reader A. I worked only from `/tmp/scratch/f1-readers/pdf/l55h09.pdf`, copied to this folder as `l55h09.pdf`.
SHA-256 as computed: `5b6897abf162dfdd8babdbb40ff4d46ff99ecc5a4eef126b5690c54750e2418b` (matches the brief; also in `sha256.txt`).
I did not open the repository or any other source of values.

## Where the figure is
Figure 6 is on PDF page 21 (of 29), one page holding three panels with a shared legend at the top:
top = total drag C_D_T, middle = base drag C_D_b, bottom = net drag C_D, each plotted against Mach number M.

## Quoted text (transcribed from the page images; the PDF's OCR text layer is garbled)

**Caption (PDF p. 21):** "Figure 6.- Zero-lift drag-coefficient variation with Mach number for a
fin-stabilized body of revolution as obtained from measurements in a slotted wind tunnel and in free flight."

**Axis labels (PDF p. 21):** x axis, all three panels: "Mach number, M" (labelled .80, .88, .96, 1.04, 1.12, 1.20, 1.28, 1.36, 1.44; gridlines every 0.02).
Top panel y axis: "Total drag coefficient, C_D_T" (0 to .28, labelled every .04, gridlines every .02).
Middle panel y axis: "Base drag coefficient, C_D_b" (-.04, 0, .04; gridlines every .02).
Bottom panel y axis: "Net drag coefficient, C_D" (0 to .28 as in the top panel).
(The scan of the labels is poor: the top label reads like "Total drag coefficient C_DT"; the subscripts are hard to read.)

**Legend (PDF p. 21), word for word as far as legible:**
- (solid line) circle: "Wind tunnel, fins off 13 x 10^6 < R < 14.6 x 10^6" (the "13" has a broken "3"; the first "<" is blotted)
- (long-dash line) square: "Wind tunnel, fins on 6.8 x 10^6 < R < 7.6 x 10^6"
- (short-dash line) diamond: "Free-flight, fins on 30 x 10^6 < R < 70 x 10^6 (refs. 1 and 2)"
- "Flagged symbols: Fixed transition"
- "Solid symbols: Data with fins on at fins-off R"

Line patterns measured in the legend: fins off = long solid stroke; fins on = dashes ~22 px long with ~8 px gaps; free flight = short dashes ~9 px with long gaps (300-dpi pixels).
In the panels the line styles are not cleanly applied (for example, the fairing through the squares in the top and bottom panels looks solid), so I did not use line style to assign symbols.

**Text about the figure:**
- PDF p. 8 (printed p. 7), Results and Discussion: "The drag data for the fin-stabilized body of revolution are presented in coefficient form in figure 6. Presented are total drag coefficient, base drag coefficient, and net drag coefficient as a function of the free-stream Mach number. The differences in drag coefficient due to placing the roughness band around the nose of the wind-tunnel model were small and generally within the scatter of test data."
- PDF p. 8 (printed p. 7): "For comparative purposes, the corresponding drag coefficients as obtained from free-flight tests (refs. 1 and 2) are also presented in figure 6. It should be pointed out that the free-flight base drag coefficients presented are not those actually measured on the present body shape. A comparison of base pressures measured on the present body shape in free flight with other free-flight base pressure measurements indicated that the present free-flight results were in error, probably due to the effect on the base pressure measurements of an unintentional burning of a residue of rocket propellant. Hence, the base pressure drag obtained from base pressures measured in free flight on another body having an identical afterbody and fin, and a different nose but with no apparent rocket propellant residue in the model (ref. 2) has been used in the present analysis. The difference in base drag measurements indicated in figure 6 between the wind-tunnel and free-flight tests is believed to be due primarily to the effect on the wind-tunnel results of the presence of the model support sting. This difference is not considered important, however, since its magnitude is generally small enough to be well within the combined accuracy of the two sets of measured results."
- PDF p. 9 (printed p. 8): "The Reynolds numbers for the free-flight tests, however, were much larger than for the wind-tunnel tests - 30 x 10^6 to 70 x 10^6 as compared with 6.8 x 10^6 to 7.6 x 10^6. Inasmuch as the flight Reynolds numbers were large enough to result in turbulent boundary-layer flow over the major part of the configuration and the transition strips insured turbulent flow over the wind-tunnel model, the difference in drag coefficient is attributed to the difference in turbulent skin friction between the two tests."
- PDF p. 9 (printed p. 8): "Based on the previous comparison of base pressure drags (fig. 6), however, it would appear that the base pressure differences could be neglected for the present afterbody shape ..."
- PDF p. 6 (printed p. 5), Apparatus: "Both the body of revolution and the airplane model were mounted to single-component internal strain-gage balances which were sting supported in the wind tunnel (figs. 1 and 3). The body of revolution was set at zero angle of attack by use of a sensitive inclinometer." "The base pressures for both models were measured by inserting an open end tube through the center of the sting into an open section of the balance."
- PDF p. 7 (printed p. 6), Tests: "... the model drag forces are affected by the intersection of wall-reflected model disturbances with the model in the Mach number range between about 1.04 and 1.13. Therefore, no drag data are presented for this Mach number range." "In order to avoid the effect on drag due to a possible variation in location of the boundary-layer transition point, both of the models were tested with transition fixed by roughness strips. These strips were constructed by blowing 0.001- to 0.002-inch-diameter carborundum particles on a strip of wet shellac. For the body of revolution, a 1/4-inch-wide roughness band was placed around the model 1 inch behind the nose of the body. Tests were also made with this model smooth to determine the effect of roughness on the drag level of the body."
- PDF p. 7-8 (printed p. 6-7): "The major portion of the tests of the fin-body combination was run at a reduced stagnation pressure of 25 psia in an effort to avoid excessive fin loads and thereby insure retainment of the fins for the duration of the tests. After testing was completed at 25-psia stagnation pressure, some additional check test points were obtained at 50-psia stagnation pressure. This higher stagnation pressure afforded better accuracy and a higher ultimate test Mach number. All the tests of the body without fins were made at 50-psia stagnation pressure." "The Reynolds number variation was between about 0.67 x 10^6 and 0.75 x 10^6 per inch for the 25-psia stagnation-pressure tests and between about 1.3 x 10^6 and 1.4 x 10^6 per inch for the 50-psia stagnation-pressure tests. The corresponding Mach number ranges were between 0.74 and 1.32 for the 25-psia stagnation pressure and between 0.8 and 1.4 for the 50-psia stagnation pressure." "The drag data measured at Mach numbers greater than about 1.13 were corrected for buoyancy effects resulting from longitudinal gradients in test section Mach number."
- PDF p. 8 (printed p. 7), error table: "Below is a table of the estimated maximum overall error in the faired curves for the indicated parameters: C_D for - Body of revolution ... ±0.010 ... M_o ... ±0.01 ... C_Db for - Body of revolution ... ±0.005".
- PDF p. 2, summary: the comparison is "at Mach numbers from 0.81 to 1.41".

(My reading of these together, for later users: solid squares = fins on at the fins-off R, i.e. presumably the 50-psia check points; open squares = 25 psia. This is an inference, not a statement in the report.)

## How I read

- **Image.** The page is one embedded 1-bit CCITT scan, 2544 x 2868 px at 300 ppi. I extracted it losslessly with `pdfimages` (`nat-000.png`) and did all measurement on that native-resolution image. No resampling was involved in the coordinates. For viewing I used 3x to 8x zooms, sometimes with a slight Gaussian blur, plus a copy with the gridlines removed (`degrid.png`).
- **Axis calibration (per panel, pixel scan).** I found every gridline from column and row sums of black pixels inside each panel's frame (subpixel centroid of each line, lines 3-4 px wide).
  - x: top panel 33 vertical gridlines from x=661.9 px (M=0.80) to 1973.0 px (M=1.44); middle panel 662.9 to 1973.0; bottom panel 662.0 to 1973.4. That is about 41.0 px per 0.02 in M.
  - y: top panel 15 gridlines from y=578.5 (0.28) to 1127.0 (0); middle panel 5 gridlines from 1362.0 (+0.04) to 1518.6 (-0.04); bottom panel 15 gridlines from 1792.4 (0.28) to 2338.9 (0). That is about 39.1 px per 0.02 in C_D.
  - Mapping is piecewise linear between neighbouring gridlines (every gridline used), so local scan distortion is absorbed. Skew was checked by scanning the top and bottom halves of a panel separately: under 0.5 px.
- **Symbol centres.** Each symbol centre is the centre of its outline (the midpoint of its left/right and top/bottom edges), from zoomed views with pixel rulers. Outline templates (square 22 px, circle 26 px, diamond 24 px) were overlaid on the image to check each centre, and chamfer template matching gave candidate diamond positions that I then checked one by one. Solid squares were measured from their pixel maps (single solid square = 21 x 20 px). Where two solid squares merge into one blot, I split them from the blot outline.
- **Errors.** `x_error` and `y_error` are 1-sigma reading errors in axis units. They come from a per-symbol pixel uncertainty (2 px for clean symbols, 3-4 px for overlapping or partly hidden ones, 5-6 px for fragmentary ones) times the local scale (about 0.00049 M/px and 0.00051 C_D/px), with a floor of 0.0005. The errors cover locating the plotted centre only. They do not include the report's own accuracy (±0.01 in M, ±0.010 in C_D, ±0.005 in C_Db per its error table).
- **Kinds.** `open` = open symbol. `solid` = filled. `flagged` = an open symbol that, as I judged it, carries a flag tick. Because the scan is degraded, flags are hard to tell apart from noise, fairing fragments and second outlines. Every such doubt is written in `alternatives`, and the row has `ambiguous` in `flags`. A symbol listed as `open` may still be flagged, and the reverse.

## Curves without symbols (rule 4)
- **Middle panel (base drag):** a dashed line with no symbols on it, which I take to be the free-flight base drag (the text says free-flight base drag is shown; there are no diamonds in this panel). It is visible from M ≈ 0.958 (x ≈ 988 px) to M ≈ 1.222 (x ≈ 1522 px). I read it at its two ends and at the 0.96-1.04 and 1.14-1.22 stations inside that span. Left of 0.958 it cannot be told apart from the zero gridline or the symbols, so I did not read it there. Between about M 1.17 and 1.20 it is hidden behind symbols; those values are linear interpolations between the visible dashes on each side, flagged `partly-hidden`. The configuration is inferred, so these rows are also flagged `ambiguous`; the alternative is that this is a wind-tunnel fairing.
- **Bottom panel (net drag):** a dashed line with no symbols on it (free flight). It is visible from M ≈ 0.960 (it leaves the 0.14 gridline near x ≈ 992 px) to M ≈ 1.400. I read it at both ends and at the 0.98-1.04 and 1.14-1.40 stations. Between about M 1.08 and 1.14 it runs along the 0.20 gridline and cannot be seen; the 1.14 station sits at the edge of that gap. Left of M 0.96 any part of it lying on the 0.14 gridline is invisible (the gridline shows no thickening there), so I did not read it.
- In the top panel all three curves carry symbols, so I read no curves there.

## Flags used
- `overlap`: the symbol touches or overlaps another symbol. Listed centres come from the visible parts of each outline.
- `ambiguous`: one of these: the number of symbols in a cluster is uncertain; the symbol might be a fairing fragment; the flag or open state is uncertain; or (for curves) the configuration is inferred. The `alternatives` column says which.
- `partly-hidden`: part of the outline is under a gridline, the frame, a fairing or another symbol, or is lost in the scan.
- `curve`: a station read on a curve that has no symbols (rule 4).
- No symbol was flagged `out-of-line`. No symbol was left empty as `illegible`: wherever I judged a mark to be a symbol I could place a centre, and the fragmentary ones carry large errors and the `partly-hidden;ambiguous` flags instead.

## Specific things a later user should know
1. **Scan quality.** The scan is low quality (1-bit, broken strokes). Free-flight diamonds in the top panel are drawn edge to edge in a long chain, and the dash-dot fairing runs through them. I read 54 diamonds, but in the transonic rise (M ≈ 0.99-1.02) the outlines break into dots, and the count there (I give 3 at M ≈ 0.98-0.99, C_D_T ≈ 0.143-0.150) could be 2 to 4. Diamonds whose only visible part is one edge (about M 0.81, 0.83, 0.85 near C_D_T 0.13-0.14; M 0.925 upper half; M 1.25 V-shape) may be fairing fragments rather than symbols.
2. **Doubled squares and circles.** Several "symbols" may be either two overlapping symbols or one symbol with a flag or second outline: the open squares at M ≈ 0.83 and M ≈ 0.89 (all three panels), the square pair at M ≈ 1.21, the square at M ≈ 1.025, and the circle pairs at M ≈ 0.91 and ≈ 0.84 (bottom). In each case I give the reading as two symbols and describe the single-symbol alternative in `alternatives`.
3. **Solid-square blots.** The solid squares at M ≈ 0.81 and M ≈ 1.32 are blots of two overlapping squares in the top and bottom panels. In the middle panel the M ≈ 0.81 blot is 27 px wide (a single square is 21 px), so I list it as two squares at the same C_D_b with the one-square alternative. The single solid square at M ≈ 1.40 in the middle panel has a diagonal tick that may be a flag.
4. **Middle-panel clusters.** In the middle panel, symbols near M 0.95-0.96 (two squares and a circle), M 1.00-1.03 (circles) and M 1.18-1.19 (squares and a circle) are drawn on top of each other. These decompositions are the least certain in the file. Two of the circles listed there (M ≈ 0.97 and M ≈ 1.01) may not be symbols at all.
5. **Hidden circles.** Circles hidden behind the solid squares at M ≈ 1.32 (middle panel) and M ≈ 1.40 (middle panel) are listed only where an arc is actually visible: at M ≈ 1.32 yes, at M ≈ 1.40 no (only a tick is visible, which I did not count as a symbol).
6. **Units and signs.** Values are as plotted, with the signs as plotted (base drag is negative at subsonic speeds in the middle panel). No buoyancy, Reynolds-number or other correction was applied.

## Files
- `fig6.csv`: the readings (one row per symbol or curve station).
- `method.md`: this note.
- `sha256.txt`: the PDF hash.
- Working material: `l55h09.pdf` (copy), `l55h09.txt` (OCR text layer), `nat-000.png` (native scan of p. 21), `degrid.png`, page renders `p21-21.png` and `p21small-21.png`, the `crops/` folder of zoom views, scripts `grid.py`, `crop*.py`, `ov.py`, `match.py`, `degrid.py`, candidate lists `p1.json`, `p2.json`, `p3.json`, `cand_d.json`, `cc.json`, and `work/build.py` (holds every pixel reading and the calibration, and regenerates `fig6.csv`).
