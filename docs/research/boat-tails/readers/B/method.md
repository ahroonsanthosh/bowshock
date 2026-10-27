# Method note, reader B (blind second reading)

Brief: `bt-readers/brief.md`, SHA-256 8b5becda050d0e4519aac5abd8b05f6fe91ae748b3e97ba8874a6d7bd66d6f77 (9839 bytes).

I worked only from the brief and the four PDFs below, which I fetched myself into `B/src/`. I did not open the bowshock repository, its website or GitHub, any other reader's folder, NACA TN 3320, or PDF page 57 of TN 3819. I used no other paper, compilation or tool that quotes these figures. The work was interrupted twice by container restarts (usage-limit resets); all files in `B/` survived, the downloads were re-checked against the server sizes and hashes, and the reading continued from where it stopped.

## 1. The four PDFs

| Report | Address fetched | SHA-256 | Bytes | Pages |
| --- | --- | --- | --- | --- |
| RM E51F26 | https://ntrs.nasa.gov/api/citations/19930086724/downloads/19930086724.pdf (citation page https://ntrs.nasa.gov/citations/19930086724) | df0230ef9058010c7d700f2e402cfeb26cc517a3430f693d05e14a129eb559df | 31949777 | 60 |
| TN 3819 | https://ntrs.nasa.gov/api/citations/19930084517/downloads/19930084517.pdf (citation page https://ntrs.nasa.gov/citations/19930084517) | 9acd67dc393b26162f773602f477be6e9bf3b5e2823edb18df105a1159c9ce55 | 31890253 | 68 |
| RM A52E20 | https://ntrs.nasa.gov/api/citations/19930087153/downloads/19930087153.pdf (citation page https://ntrs.nasa.gov/citations/19930087153) | 2aa344c0b2c08e51f3625f060ccc1b1dc11d52d596213e597704cbe5ea5f85b7 | 24198134 | 50 |
| TN 3372 | https://ntrs.nasa.gov/api/citations/19930084618/downloads/19930084618.pdf (citation page https://ntrs.nasa.gov/citations/19930084618) | f4a0718433d73bd9db7c9b6bb71cd3e73e7793565380610da42c4823fe88bcdf | 9987330 | 22 |

Each PDF is an Adobe Paper Capture scan: one RGB JPEG image per page at 300 dpi (checked with `pdfimages -list` on every page I used), plus an OCR text layer. The highest resolution the scans support is therefore 300 dpi. I extracted the page images losslessly with `pdfimages -j` (no re-rendering, no resampling) and did all measurement on those native 300 dpi pixels. For viewing I enlarged crops 2 to 10 times with nearest-neighbour scaling, so no pixel was smoothed or invented. Landscape figures (TN 3819 PDF pages 52, 54, 55, 56 and RM E51F26 page 28) were turned upright by an exact 90-degree pixel transpose (clockwise) before measurement; their pixel coordinates below are in that upright frame.

## 2. What I opened, in order (rule 9)

1. All four PDFs: `pdfinfo` (page count, size). `pdfimages -list` only for the pages listed in the brief (metadata, no viewing): RM E51F26 pages 5, 6, 7, 28, 29, 30, 48, 56, 57; TN 3819 pages 18, 19, 20, 50, 52, 54, 55, 56; RM A52E20 pages 6, 26, 44; TN 3372 pages 4, 9, 10, 19, 20.
2. Native page images extracted for those same pages only.
3. RM E51F26 PDF pages 5 to 7: OCR text layer and the page images (Apparatus and procedure; symbols on page 5; test conditions and trip wire on page 7).
4. RM E51F26 PDF page 28 (figure 6), upright, with zoomed crops.
5. RM E51F26 PDF pages 15 to 24: text layer searched by script only for the word REFERENCES (found on page 22). Nothing else on those pages was read.
6. RM E51F26 PDF page 4: text layer and image (symbol list: C_p, C'_p,b definitions).
7. RM E51F26 PDF page 22 and 23: text layer, reference list (identity of reference 1, the nose equation source, and reference 6, the figure 24 triangle).
8. RM E51F26 PDF page 29 (figure 7), page 30 (figure 8), page 48 (figure 24), page 56 (figure 29), page 57 (figure 30).
9. TN 3819 PDF pages 18 to 20: text layer and images (report pp. 16 to 18).
10. TN 3819 PDF pages 50 (fig. 19), 52 (fig. 21), 54 (fig. 23), 55 (fig. 24), 56 (fig. 25).
11. RM A52E20 PDF page 6 (text layer and image), page 26 (figure 1(c)), page 44 (figure 15).
12. TN 3372 PDF page 4 (text layer and image), pages 9 and 10 (figure 1), page 19 (figure 10), page 20 (figure 12).
13. After the first restart: the same RM E51F26 and TN 3819 figure pages again, to re-check legends and captions (pages 28, 29, 30, 48, 56, 57; 50, 52, 54, 55, 56) and TN 3372 pages 9 and 10.
14. Text layer searched by script only for the word SYMBOLS or NOTATION: TN 3819 PDF pages 1 to 8, RM A52E20 pages 1 to 8, TN 3372 pages 1 to 6. Then opened, to get each base pressure coefficient's reference conditions: TN 3819 PDF page 5 (text and image; introduction end and symbol list start), TN 3819 PDF page 6 (text and image; P_B definition), RM A52E20 PDF page 4 (text layer; notation, P_b definition, Reynolds number basis), TN 3372 PDF page 3 (text layer; summary and introduction) and PDF page 5 (text layer; definition of delta p / q and Reynolds number basis). These pages are outside the brief's list; I opened them only for the coefficient definitions and say so here.
15. RM A52E20 PDF page 26 again (inch scale and model 8 in the photograph; see section 5.3: I decided not to report photo measurements).

16. After the second and third restarts, on the coordinator's targeted request: RM E51F26 PDF pages 7, 8, 11, 15 and 19 (report pp. 6, 7, 10, 14, 18), text layer and native page images, read in full for statements on boundary-layer transition, the trip wire, boundary-layer thickness and points called inconsistent or unreliable. Quotations are in `transition.md`. Pages 7 and 15 had been opened before; pages 8, 11 and 19 were new. Sentences that continue from PDF page 10 or onto PDF page 9 were not followed onto those pages.

TN 3819 PDF page 57 was never extracted, listed, rendered or text-searched (every TN 3819 command named its pages explicitly). TN 3320 was never fetched.

## 3. How the figures were read

**Axis calibration.** For every panel I located every grid line (not only the labelled ones) to sub-pixel precision: each line was sampled in 16 to 24 strips along its length, the darkness-weighted centroid of the line's cross-profile was taken in each strip, and a straight line (position and slope, robust Theil-Sen start then least squares with outlier rejection) was fitted, so page skew and small bowing are measured, not assumed. The intersections of all labelled x lines with all labelled y lines (between 18 and 70 per panel) were then fitted by least squares with a 2-D affine map (value = a + b u + c v for each axis), which absorbs skew and unequal scale. The residuals of every labelled line, from a 1-D fit along the middle of the panel, and the 2-D fit's rms and maximum residuals are listed in section 6. As a check, the map was also evaluated on the unlabelled grid lines; their residuals are listed too. Where a figure prints its x labels only under the bottom panel (RM E51F26 figs. 7, 29, 30; TN 3819 fig. 19), I carried those values up to the panels above along the same vertical grid lines, which are continuous or exactly aligned; this is a judgement call. In RM E51F26 fig. 8 the bottom axis has two label sets (10.0 to 12.0 twice); the left set belongs to panels (a) and (c), the right set to panel (b), and panel (b) shares the y labels printed beside panel (a).

**Symbol centres.** Each symbol's centre was found from its own strokes by template matching: a stroke-centreline template of the symbol's shape (circle, square, diamond, triangle, right triangle) with the size measured on that figure's own isolated symbols was shifted over a 0.25-pixel grid within a few pixels of the symbol, and scored by the mean darkness of the scan along the template (grid-line pixels masked out so that the grid does not pull the fit). The best-scoring position is the centre. The reading error per point is the half-width of the region where the score stays within 3 percent of its maximum, converted to data units, combined with the calibration rms; it is given in each row's note. Every fit was checked by eye on enlarged overlays of the template on the scan. Where the template could not separate a symbol from another one (strongly overlapping outlines, half-hidden symbols, very faint symbols), I placed the centre by hand from the visible strokes (character maps of the pixel darkness) or by a least-squares fit of the visible arc of the ring only, and said so in the note. Where a symbol has a printed centre dot (TN 3372 fig. 10, RM A52E20 fig. 15, TN 3819 figs. 23 and 25(b)), the primary value is still the outline centre; for TN 3372 fig. 10 the dot position is given as an alternative whenever it differs by at least 0.0005 in y or 0.002 in x.

**Curves.** Curves were read only where the brief names them (RM E51F26 figs. 29 and 30 components drawn only as curves; TN 3372 fig. 12 configuration D). A curve was followed column by column after subtracting a model of each grid line's darkness profile; at each requested abscissa the curve's row is the darkness-weighted centre of its stroke in that column (with a local straight-line fit over plus or minus 3 columns for the RM E51F26 curves). For the dashed TN 3372 curves, a station falling in a dash gap or on a vertical grid line was read at the nearest drawn column (shift given in the note), never interpolated, and the x actually read is reported. All curve values carry flag `curve`.

**No smoothing.** Values are given to the resolution of the reading (about 1/4 pixel), not rounded to nice numbers. Nothing was faired, corrected or interpolated.

**Overlap rule.** Whenever two symbol centres lie closer than the size of the larger symbol, both points are flagged `ambiguous`, the note names the other symbol and the centre distance, and the alternatives give the readings with the two identities swapped (for symbols of different shapes; for same-shape overlaps a swap changes nothing, so the note says how the centres were found).

## 4. Reference conditions of the coefficients

- RM E51F26 figs. 7 and 8: C_p = (p - p0)/q0, free-stream reference (symbol list, report p.3).
- RM E51F26 fig. 24: the axis is "Base pressure coefficients, C_p,b and C'_p,b". Open circles and open squares are C_p,b, base pressure on free-stream conditions; flagged circles, flagged squares and the diamond are C'_p,b = (pb - p1)/q1, referenced to conditions just upstream of the base (symbol list). The legend does not say which coefficient the reference 6 triangle shows.
- RM E51F26 figs. 29 and 30: drag coefficient C_D; the figure does not state the reference area.
- TN 3819 all figures: P_B = (pB - p_inf)/q_inf, free-stream reference (symbol list, report p.4).
- RM A52E20 fig. 15: P_b = (pb - p0)/q0, referred to free-stream conditions (notation, report p.3).
- TN 3372 figs. 10 and 12: delta p / q = (base pressure - free-stream static pressure) / free-stream dynamic pressure (report p.3). Both figures draw this axis with negative values upward (-.08 at the top of fig. 10, -.32 at the top of fig. 12); the signs in my CSVs follow the axis labels.

## 5. Figure by figure: what was read and the judgement calls

### 5.1 RM E51F26

**Geometry (text PDF pp. 5 to 7, figure 6 PDF p. 28).** Typed into `geometry.csv`. Judgement calls: the body diameter 1.5 in. and nose length 9 in. are derived (18 in. / 12, and "the first half of the body"); the nozzle exit diameter 0.75 in. is derived from the ratio 0.5. The nose equation is not in the report, only its source (reference 1, Erdmann, Peenemunde Archiv 66/105). The model is a half body on a splitter plate (half-body support system). The orifice stations are given as typed spacings, with the distances from the base added up in the note. The text says the trip wire (0.005-in. loop about 0.5 in. from the tip) was used "for selected settings" only and does not say where transition occurred without it.

**Figure 7 (PDF p. 29)**: completely boattailed, Db/Dm 0.506, alpha 0, no jet flow (caption). Panels (a) epsilon 5.63, (b) 7.03, (c) 9.33 deg. Legend: angular station theta 15 (open circle), 50 (open square), 90 (open diamond). 51 points: 6 stations x 3 symbols in (a) and (b), 5 x 3 in (c). The dashed lines are the authors' mean fairing and were not read. Many symbols overlap at the same station (flagged, section 7). In (b) the circle and square coincide at three stations (both outlines visible, centres within 1 px).

**Figure 8 (PDF p. 30)**: incompletely boattailed, Db/Dm 0.704. 37 points. Panel (a) 5 stations x 3 symbols. Panel (b): station 1 (x about 10.5) has only a circle and a square; I found no diamond there. Panel (c): station 1 has a square and, coinciding, a circle and a diamond; station 4 (x about 11.82) has a square and a diamond only; a character map of the pixel darkness showed no circle there, so no circle is reported.

**Figure 24 (PDF p. 48)**: 14 points. The flags on the circles and squares are short tails at the lower left, checked on enlarged crops of every symbol; the predicted C'_p,b lines that run close to several symbols were separated from the tails by their length and direction. Judgement call on Mach number: the legend gives no Mach number for the plotted points; the M1 values 1.30, 1.91, 2.10, 3.50 label only the predicted C'_p,b lines. I entered 1.91, the free-stream Mach number of the tests from the text (PDF p. 7), and said so in each note; this is not a figure value. The reference 6 triangle (right triangle with the vertical side on the right) is reference 6 of the report (RM E50D10, NACA RM-10 missile, Mach 1.49 to 1.98, fins removed); its Mach number is left empty and the point is flagged because its coefficient type is not given.

**Figures 29 and 30 (PDF pp. 56, 57)**: components of boattail drag coefficient against boattail angle, Db/Dm 0.506 (fig. 29) and 0.704 (fig. 30), alpha 0, no jet flow. Symbols read: (a) Experimental base drag (open circles, including epsilon 0, the cylindrical afterbody, plotted on the y axis line), (b) open circles on the curve labelled "Experimental (0.83 characteristics)" (fig. 29) or "(0.85 characteristics)" (fig. 30), (c) open circles labelled "Pressure drag". Components drawn only as curves and read at 5.63, 7.03 and 9.33 deg with flag `curve`: "Friction (C_f = 0.003)" in (a), a computed friction estimate, and "Experimental pressure drag plus friction drag" in (c). Not read: "Predicted base drag", "Linearized theory (reference 4)", "Reference 4 with C_p = -2v_x/V", "Characteristics" (theory or prediction, rule 7). Not read in fig. 30: the open squares "Experimental base drag with base bleed" in (a) and "Pressure drag with base bleed" in (c); base bleed is air flow from the base (jet flow), excluded by rule 8. In fig. 30(c) the total-drag curve ends at epsilon about 9.17, short of 9.33; that row is left empty (the end value 0.1141 is given as an alternative, not as a reading). In fig. 30(a) the friction curve runs into the horizontal leader of its label near epsilon 9; the 9.33 value may lie on the leader (noted). Observation only: the epsilon 0 base-drag circle is at 0.0334 in fig. 29 and 0.0651 in fig. 30.

### 5.2 TN 3819

**Text pp. 16 to 18 (PDF 18 to 20)**: the conditions it states for these figures are in `geometry.csv` (for example the inadvertently thickened boundary layer of the beta = 5.63 deg data of fig. 24, M_inf 3.24 and reference 5 for fig. 25(b), and simple cones as negative boattailing in fig. 23). The sketch of fig. 19 and the D = 1.97 in. of the fig. 25(a) axis label are also recorded.

**Figure 19 (PDF p. 50)**: 24 points, 15 deg semi-angle cone-cylinders, D = 1 in., abscissa L/D. Panels M_inf 2.41, 1.93, 1.62; open circles and open squares for two unit Reynolds numbers per panel as the legend gives them. The legend gives no data source. The solid "Present estimate" curve was not read. In (b) at L/D 4 the square is mostly hidden behind the circle.

**Figure 21 (PDF p. 52)**: 40 points, 10 deg cone-cylinders of fineness ratio 5. The legend says only "All experimental points taken from compilation of Ref. 2" and explains none of the five symbol shapes (open circle, circle with a short tick at upper right, open square, open triangle, tall open diamond). Following rule 4, every point is flagged `ambiguous` for that reason, with no alternative value unless there is also an overlap. Overlapping circles near M 1.25, 1.8 and 2.33 were placed by fitting the visible arc of each ring (radius fixed at the figure's circle size), excluding the other rings and grid lines. Near M 1.81 two circle outlines are almost concentric (centres 9 px apart); I read two points and give "no separate point" as the alternative for the second. The diamond at M 2.92, P_B -0.114, lies well above the neighbouring points; read as plotted. The Chapman curve and the two present-estimate curves were not read.

**Figure 23 (PDF p. 54)**: 11 points, M_inf about 2.9. Legend sketches: open triangle, Ames, ogive nose, cylinder, conical boattail; open circle, NOL ref. 5, cone nose, cylinder, conical boattail; open square, Ames, a simple cone (negative beta). The triangle at beta about 15 overlaps the circle there; its centre was placed from its apex and base line on a character map (the template fit, x 15.28, is the alternative). The x calibration of this figure has a larger rms (0.013 deg) because the vertical grid lines are unevenly drawn.

**Figure 24 (PDF p. 55)**: 6 points, "Exp. mean value" of Cortright and Schroeder, h/D 0.506 (a) and 0.704 (b), M_inf 1.91. The estimate curves were not read.

**Figure 25(b) (PDF p. 56)**: 5 points, "Exp. ref. 5", M_inf 3.24. Part (a) (calculated) was not read. The present-method curves were not read.

### 5.3 RM A52E20

**Model description (PDF p. 6) and figure 1(c) (PDF p. 26)**: model 8 is "one additional ogive-cylinder model with a boattailed afterbody", d = 1.25 in., base diameter 0.604 d; the photograph label gives l/d = 7.0. Nothing else is dimensioned: figure 1(c) is a photograph with an inch scale. I tried measuring the photograph against its scale but the result was not self-consistent (photo l/d about 7.8 against the printed 7.0, because of shading at the edges and perspective), so I report no photo measurements. Qualitatively the afterbody of model 8 tapers gradually along a long curved contour. The unboattailed body it is compared with in figure 15 is model 3 (ogive-cylinder l/d = 7, legend); the text describes models 1 to 4 as 10-caliber tangent ogive noses with 1-in. cylindrical afterbodies. Model 3's own drawing is in figure 1(a), which the brief does not list, and I did not open it.

**Figure 15 (PDF p. 44)**: the only plotted symbols are reference data: open circles "From Ref. 4" (ogive-cylinder l/d 7, no boattail), open squares "From Ref. 10" (panel a) and "From Ref. 11" (panel b), and a square with a tick at the upper right, "From unpublished data NACA Ames 1- by 3-foot SSWT" (panel b), the last three for the boattailed body. 8 points. Panel (a) is "Laminar boundary layer, Re = 3.0 x 10^6", panel (b) "Turbulent boundary layer, Re = 5.0 x 10^6" (Reynolds number based on body length, report p.3); the figure does not say whether these Re values also apply to the reference points, and I say so in each note. The present tests of model 3 (solid) and model 8 (dashed) are drawn only as curves. The brief asks for plotted points and names no curve for this figure, so I did not read them (rule 7); they are listed as four `untraced` rows with empty values. The vacuum-limit curve is theory, not read. A small dark speck near M 1.52, P_b -0.085 in panel (b) is not a symbol and was not read. The square near M 2.9 in panel (b) has its lower edge hidden under the dashed curve; its centre was placed from its two sides and top edge.

### 5.4 TN 3372

**Geometry (text PDF p. 4, figure 1 PDF pp. 9 and 10)**: in `geometry.csv`. The fin trailing edges of configuration D lie 6.9 in. ahead of the base (figure 1; = 0.7 + 6.2). The converging afterbody is not dimensioned beyond its 6.2 in. extra length and 3.3 in. base diameter; the sketch shows a curved contour starting at about the fin trailing-edge station. The base view also carries 2.9 in. and 1.5 in. diameters that the sketch does not name. The edge orifice is about 3/8 in. (.38 in.) from the base circumference; the center orifice is on the inside of the front bulkhead of the dummy rocket chamber, 13.5 in. ahead of the base.

**Figure 10 (PDF p. 19)**: configuration D, 22 squares (edge orifice) and 24 circles (center orifice), all with centre dots. Three squares near M 1.06 to 1.09 are very faint in the scan (outline partly erased); their centres were reconstructed from the fragments and they are flagged. Two circles near M 1.08 and 1.09 are also faint. One square near M 0.93 overlaps the squares on each side; its centre was set by hand from its top and bottom edges.

**Figure 12 (PDF p. 20)**: configuration D drawn only as two dashed curves, edge orifice (upper) and center orifice (lower), identified by the label arrows: the edge-orifice arrow ends on the upper curve near M 0.99 and the center-orifice arrow on the lower curve near M 0.95. Each curve was read at every 0.01 in Mach number over its drawn span (edge 0.90 to 1.17, center 0.92 to 1.17), plus its two ends and its cusp (lowest point). 60 values, all flagged `curve`. Near the cusps the curves are almost vertical, so a single column defines y poorly there (noted on those rows).

## 6. Axis calibration of every panel

Pixel coordinates u (column) and v (row) are native 300 dpi scan pixels of the PDF page image (upright frame for rotated pages). Each line lists the labelled grid lines used, their pixel positions along the middle of the panel and their residuals in data units from a 1-D least-squares fit, then the 2-D affine fit used for the readings.

**RM E51F26 fig. 7, panel a** (PDF page 29, 300 dpi, image as scanned):
- x labelled grid lines (1-D fit, along the panel's mid-height): 9 at u=514.60 (res +0.0024), 9.5 at u=682.57 (res -0.0001), 10 at u=849.81 (res -0.0005), 10.5 at u=1017.63 (res -0.0026), 11 at u=1184.53 (res -0.0019), 11.5 at u=1351.10 (res -0.0003), 12 at u=1517.13 (res +0.0030)
- y labelled grid lines (1-D fit, along the panel's mid-width): 0 at v=418.01 (res -0.00014), -0.04 at v=586.02 (res +0.00011), -0.08 at v=753.34 (res +0.00020), -0.12 at v=918.77 (res -0.00017)
- 2-D affine fit through 28 labelled-line intersections: rms residual x 0.0019 (max 0.0034), y 0.00017 (max 0.00027); scale dx/du 0.002992, dy/dv -0.000239 per pixel
- check on unlabelled grid lines: worst |residual| x 0.0067, y 0.00037

**RM E51F26 fig. 7, panel b** (PDF page 29, 300 dpi, image as scanned):
- x labelled grid lines (1-D fit, along the panel's mid-height): 9 at u=513.23 (res +0.0035), 9.5 at u=682.10 (res -0.0013), 10 at u=849.13 (res -0.0006), 10.5 at u=1017.16 (res -0.0029), 11 at u=1184.06 (res -0.0019), 11.5 at u=1350.71 (res -0.0000), 12 at u=1516.90 (res +0.0031)
- y labelled grid lines (1-D fit, along the panel's mid-width): 0 at v=1085.19 (res -0.00001), -0.04 at v=1251.71 (res +0.00001), -0.08 at v=1417.90 (res -0.00005), -0.12 at v=1584.84 (res +0.00008), -0.16 at v=1750.81 (res -0.00004)
- 2-D affine fit through 35 labelled-line intersections: rms residual x 0.0023 (max 0.0048), y 0.00005 (max 0.00010); scale dx/du 0.002989, dy/dv -0.000240 per pixel
- check on unlabelled grid lines: worst |residual| x 0.0076, y 0.00011

**RM E51F26 fig. 7, panel c** (PDF page 29, 300 dpi, image as scanned):
- x labelled grid lines (1-D fit, along the panel's mid-height): 9 at u=513.25 (res +0.0040), 9.5 at u=682.33 (res -0.0012), 10 at u=849.72 (res -0.0013), 10.5 at u=1017.50 (res -0.0027), 11 at u=1184.61 (res -0.0020), 11.5 at u=1351.60 (res -0.0009), 12 at u=1517.26 (res +0.0041)
- y labelled grid lines (1-D fit, along the panel's mid-width): 0 at v=1915.97 (res -0.00005), -0.04 at v=2083.07 (res +0.00011), -0.08 at v=2248.89 (res -0.00005), -0.12 at v=2415.37 (res -0.00004), -0.16 at v=2582.09 (res +0.00002)
- 2-D affine fit through 35 labelled-line intersections: rms residual x 0.0026 (max 0.0044), y 0.00007 (max 0.00014); scale dx/du 0.002988, dy/dv -0.000240 per pixel
- check on unlabelled grid lines: worst |residual| x 0.0081, y 0.00011

**RM E51F26 fig. 8, panel a** (PDF page 30, 300 dpi, image as scanned):
- x labelled grid lines (1-D fit, along the panel's mid-height): 10 at u=401.85 (res +0.0017), 10.5 at u=593.26 (res -0.0018), 11 at u=782.86 (res -0.0005), 11.5 at u=972.93 (res -0.0005), 12 at u=1162.38 (res +0.0011)
- y labelled grid lines (1-D fit, along the panel's mid-width): 0.04 at v=745.88 (res +0.00010), 0 at v=934.84 (res -0.00011), -0.04 at v=1125.13 (res -0.00004), -0.08 at v=1315.46 (res +0.00004), -0.12 at v=1505.36 (res +0.00002)
- 2-D affine fit through 25 labelled-line intersections: rms residual x 0.0014 (max 0.0027), y 0.00007 (max 0.00014); scale dx/du 0.002630, dy/dv -0.000211 per pixel
- check on unlabelled grid lines: worst |residual| x 0.0025, y 0.00063

**RM E51F26 fig. 8, panel b** (PDF page 30, 300 dpi, image as scanned):
- x labelled grid lines (1-D fit, along the panel's mid-height): 10 at u=1256.93 (res -0.0007), 10.5 at u=1446.41 (res -0.0002), 11 at u=1635.58 (res +0.0012), 11.5 at u=1825.32 (res +0.0010), 12 at u=2015.86 (res -0.0013)
- y labelled grid lines (1-D fit, along the panel's mid-width): 0.04 at v=741.27 (res +0.00006), 0 at v=930.88 (res +0.00002), -0.04 at v=1119.95 (res -0.00013), -0.08 at v=1310.14 (res -0.00005), -0.12 at v=1500.69 (res +0.00010)
- 2-D affine fit through 25 labelled-line intersections: rms residual x 0.0009 (max 0.0012), y 0.00009 (max 0.00016); scale dx/du 0.002636, dy/dv -0.000211 per pixel
- check on unlabelled grid lines: worst |residual| x 0.0012, y 0.00046

**RM E51F26 fig. 8, panel c** (PDF page 30, 300 dpi, image as scanned):
- x labelled grid lines (1-D fit, along the panel's mid-height): 10 at u=399.44 (res +0.0020), 10.5 at u=591.24 (res -0.0020), 11 at u=781.03 (res -0.0007), 11.5 at u=971.27 (res -0.0006), 12 at u=1160.81 (res +0.0013)
- y labelled grid lines (1-D fit, along the panel's mid-width): 0.04 at v=1599.70 (res +0.00014), 0 at v=1788.67 (res -0.00010), -0.04 at v=1979.12 (res -0.00002), -0.08 at v=2168.71 (res -0.00013), -0.12 at v=2359.61 (res +0.00004), -0.16 at v=2549.83 (res +0.00007)
- 2-D affine fit through 30 labelled-line intersections: rms residual x 0.0015 (max 0.0025), y 0.00010 (max 0.00021); scale dx/du 0.002628, dy/dv -0.000210 per pixel
- check on unlabelled grid lines: worst |residual| x 0.0029, y 0.00016

**RM E51F26 fig. 24, panel main** (PDF page 48, 300 dpi, image as scanned):
- x labelled grid lines (1-D fit, along the panel's mid-height): 0 at u=447.26 (res -0.0008), 2 at u=704.24 (res -0.0007), 4 at u=960.92 (res +0.0018), 6 at u=1217.96 (res +0.0015), 8 at u=1475.40 (res -0.0020), 10 at u=1732.14 (res +0.0001)
- y labelled grid lines (1-D fit, along the panel's mid-width): 0.12 at v=529.66 (res +0.00015), 0.08 at v=785.02 (res +0.00008), 0.04 at v=1038.68 (res -0.00026), 0 at v=1295.38 (res -0.00012), -0.04 at v=1552.70 (res +0.00012), -0.08 at v=1807.51 (res -0.00004), -0.12 at v=2063.74 (res +0.00003), -0.16 at v=2319.43 (res +0.00001), -0.2 at v=2575.40 (res +0.00004)
- 2-D affine fit through 54 labelled-line intersections: rms residual x 0.0019 (max 0.0049), y 0.00011 (max 0.00033); scale dx/du 0.007782, dy/dv -0.000156 per pixel
- check on unlabelled grid lines: worst |residual| x 0.0088, y 0.00039

**RM E51F26 fig. 29, panel a** (PDF page 56, 300 dpi, image as scanned):
- x labelled grid lines (1-D fit, along the panel's mid-height): 0 at u=370.78 (res +0.0027), 2 at u=579.99 (res -0.0026), 4 at u=788.32 (res +0.0006), 6 at u=997.23 (res -0.0018), 8 at u=1205.84 (res -0.0013), 10 at u=1414.11 (res +0.0024)
- y labelled grid lines (1-D fit, along the panel's mid-width): 0.04 at v=468.73 (res -0.00001), 0.02 at v=675.67 (res +0.00003), 0 at v=881.70 (res -0.00001)
- 2-D affine fit through 18 labelled-line intersections: rms residual x 0.0025 (max 0.0053), y 0.00002 (max 0.00003); scale dx/du 0.009585, dy/dv -0.000097 per pixel
- check on unlabelled grid lines: worst |residual| x 0.0090, y 0.00026

**RM E51F26 fig. 29, panel b** (PDF page 56, 300 dpi, image as scanned):
- x labelled grid lines (1-D fit, along the panel's mid-height): 0 at u=373.08 (res +0.0071), 2 at u=583.16 (res -0.0063), 4 at u=791.33 (res -0.0014), 6 at u=1000.14 (res -0.0026), 8 at u=1208.65 (res -0.0009), 10 at u=1416.81 (res +0.0041)
- y labelled grid lines (1-D fit, along the panel's mid-width): 0.1 at v=985.92 (res -0.00018), 0.08 at v=1198.38 (res +0.00029), 0.06 at v=1402.39 (res -0.00006), 0.04 at v=1610.29 (res -0.00003), 0.02 at v=1818.04 (res -0.00002)
- 2-D affine fit through 30 labelled-line intersections: rms residual x 0.0045 (max 0.0090), y 0.00015 (max 0.00051); scale dx/du 0.009584, dy/dv -0.000096 per pixel
- check on unlabelled grid lines: worst |residual| x 0.0117, y 0.00016

**RM E51F26 fig. 29, panel c** (PDF page 56, 300 dpi, image as scanned):
- x labelled grid lines (1-D fit, along the panel's mid-height): 0 at u=376.30 (res +0.0064), 2 at u=586.31 (res -0.0064), 4 at u=794.35 (res -0.0003), 6 at u=1003.38 (res -0.0038), 8 at u=1211.47 (res +0.0018), 10 at u=1420.11 (res +0.0022)
- y labelled grid lines (1-D fit, along the panel's mid-width): 0.11 at v=1920.97 (res -0.00005), 0.09 at v=2130.72 (res +0.00005), 0.07 at v=2339.40 (res +0.00005), 0.05 at v=2547.02 (res -0.00005)
- 2-D affine fit through 24 labelled-line intersections: rms residual x 0.0043 (max 0.0099), y 0.00005 (max 0.00006); scale dx/du 0.009584, dy/dv -0.000096 per pixel
- check on unlabelled grid lines: worst |residual| x 0.0101, y 0.00014

**RM E51F26 fig. 30, panel a** (PDF page 57, 300 dpi, image as scanned):
- x labelled grid lines (1-D fit, along the panel's mid-height): 0 at u=514.57 (res +0.0036), 2 at u=689.68 (res -0.0016), 4 at u=864.40 (res -0.0024), 6 at u=1038.84 (res -0.0000), 8 at u=1213.86 (res -0.0043), 10 at u=1387.72 (res +0.0047)
- y labelled grid lines (1-D fit, along the panel's mid-width): 0.08 at v=432.16 (res -0.00002), 0.06 at v=606.45 (res -0.00007), 0.04 at v=782.42 (res +0.00008), 0.02 at v=957.64 (res +0.00015), 0 at v=1129.87 (res -0.00013)
- 2-D affine fit through 30 labelled-line intersections: rms residual x 0.0035 (max 0.0085), y 0.00008 (max 0.00021); scale dx/du 0.011451, dy/dv -0.000115 per pixel
- check on unlabelled grid lines: worst |residual| x 0.0122, y 0.00011

**RM E51F26 fig. 30, panel b** (PDF page 57, 300 dpi, image as scanned):
- x labelled grid lines (1-D fit, along the panel's mid-height): 0 at u=520.81 (res +0.0036), 2 at u=696.35 (res -0.0040), 4 at u=870.80 (res +0.0009), 6 at u=1045.74 (res +0.0002), 8 at u=1221.06 (res -0.0049), 10 at u=1395.13 (res +0.0043)
- y labelled grid lines (1-D fit, along the panel's mid-width): 0.09 at v=1216.30 (res -0.00006), 0.07 at v=1391.56 (res +0.00001), 0.05 at v=1567.51 (res +0.00017), 0.03 at v=1739.58 (res -0.00012)
- 2-D affine fit through 24 labelled-line intersections: rms residual x 0.0039 (max 0.0083), y 0.00011 (max 0.00017); scale dx/du 0.011437, dy/dv -0.000115 per pixel
- check on unlabelled grid lines: worst |residual| x 0.0125, y 0.00014

**RM E51F26 fig. 30, panel c** (PDF page 57, 300 dpi, image as scanned):
- x labelled grid lines (1-D fit, along the panel's mid-height): 0 at u=525.20 (res +0.0020), 2 at u=700.65 (res -0.0038), 4 at u=874.99 (res +0.0030), 6 at u=1050.17 (res +0.0002), 8 at u=1225.50 (res -0.0042), 10 at u=1399.83 (res +0.0028)
- y labelled grid lines (1-D fit, along the panel's mid-width): 0.12 at v=1827.34 (res +0.00005), 0.1 at v=2001.32 (res -0.00001), 0.08 at v=2175.72 (res -0.00003), 0.06 at v=2349.70 (res -0.00009), 0.04 at v=2525.85 (res +0.00009)
- 2-D affine fit through 30 labelled-line intersections: rms residual x 0.0033 (max 0.0060), y 0.00006 (max 0.00010); scale dx/du 0.011433, dy/dv -0.000115 per pixel
- check on unlabelled grid lines: worst |residual| x 0.0110, y 0.00010

**TN 3819 fig. 19, panel a** (PDF page 50, 300 dpi, image as scanned):
- x labelled grid lines (1-D fit, along the panel's mid-height): 0 at u=613.02 (res -0.0001), 1 at u=789.96 (res -0.0004), 2 at u=966.72 (res +0.0004), 3 at u=1143.50 (res +0.0009), 4 at u=1320.45 (res +0.0005), 5 at u=1497.99 (res -0.0031), 6 at u=1674.02 (res +0.0017)
- y labelled grid lines (1-D fit, along the panel's mid-width): -0.2 at v=732.32 (res -0.00001), -0.16 at v=908.26 (res +0.00002), -0.12 at v=1084.43 (res -0.00001)
- 2-D affine fit through 21 labelled-line intersections: rms residual x 0.0023 (max 0.0083), y 0.00003 (max 0.00006); scale dx/du 0.005653, dy/dv 0.000227 per pixel
- check on unlabelled grid lines: worst |residual| x 0.0092, y 0.00019

**TN 3819 fig. 19, panel b** (PDF page 50, 300 dpi, image as scanned):
- x labelled grid lines (1-D fit, along the panel's mid-height): 0 at u=626.25 (res +0.0004), 1 at u=803.27 (res -0.0005), 2 at u=979.97 (res +0.0004), 3 at u=1156.95 (res -0.0003), 4 at u=1333.71 (res +0.0002), 5 at u=1510.74 (res -0.0008), 6 at u=1687.32 (res +0.0007)
- y labelled grid lines (1-D fit, along the panel's mid-width): -0.24 at v=1269.90 (res +0.00014), -0.2 at v=1447.56 (res -0.00014), -0.16 at v=1624.06 (res -0.00016), -0.12 at v=1799.11 (res +0.00015)
- 2-D affine fit through 28 labelled-line intersections: rms residual x 0.0006 (max 0.0012), y 0.00015 (max 0.00021); scale dx/du 0.005654, dy/dv 0.000227 per pixel
- check on unlabelled grid lines: worst |residual| x 0.0030, y 0.00012

**TN 3819 fig. 19, panel c** (PDF page 50, 300 dpi, image as scanned):
- x labelled grid lines (1-D fit, along the panel's mid-height): 0 at u=642.03 (res +0.0005), 1 at u=818.95 (res -0.0001), 2 at u=995.74 (res -0.0001), 3 at u=1172.69 (res -0.0010), 4 at u=1349.18 (res +0.0008), 5 at u=1526.28 (res -0.0009), 6 at u=1702.77 (res +0.0008)
- y labelled grid lines (1-D fit, along the panel's mid-width): -0.28 at v=2014.12 (res +0.00002), -0.24 at v=2190.43 (res -0.00002), -0.2 at v=2366.67 (res -0.00004), -0.16 at v=2542.52 (res +0.00003)
- 2-D affine fit through 28 labelled-line intersections: rms residual x 0.0008 (max 0.0021), y 0.00004 (max 0.00010); scale dx/du 0.005656, dy/dv 0.000227 per pixel
- check on unlabelled grid lines: worst |residual| x 0.0037, y 0.00012

**TN 3819 fig. 21, panel main** (PDF page 52, 300 dpi, image rotated 90 deg clockwise):
- x labelled grid lines (1-D fit, along the panel's mid-height): 1 at u=668.37 (res -0.0001), 2 at u=1254.78 (res +0.0001), 3 at u=1841.21 (res +0.0003), 4 at u=2428.04 (res -0.0002)
- y labelled grid lines (1-D fit, along the panel's mid-width): -0.24 at v=326.64 (res -0.00003), -0.2 at v=561.93 (res +0.00002), -0.16 at v=797.65 (res -0.00001), -0.12 at v=1032.95 (res +0.00004), -0.08 at v=1268.79 (res -0.00001), -0.04 at v=1504.41 (res -0.00001), 0 at v=1739.94 (res -0.00001)
- 2-D affine fit through 28 labelled-line intersections: rms residual x 0.0006 (max 0.0018), y 0.00003 (max 0.00006); scale dx/du 0.001705, dy/dv 0.000170 per pixel
- check on unlabelled grid lines: worst |residual| x 0.0025, y 0.00013

**TN 3819 fig. 23, panel main** (PDF page 54, 300 dpi, image rotated 90 deg clockwise):
- x labelled grid lines (1-D fit, along the panel's mid-height): -16 at u=515.29 (res -0.0123), -12 at u=683.34 (res +0.0015), -8 at u=852.08 (res -0.0007), -4 at u=1021.24 (res -0.0132), 0 at u=1188.65 (res +0.0161), 4 at u=1357.38 (res +0.0141), 8 at u=1525.91 (res +0.0167), 12 at u=1694.93 (res +0.0076), 16 at u=1864.71 (res -0.0194), 20 at u=2032.98 (res -0.0104)
- y labelled grid lines (1-D fit, along the panel's mid-width): -0.24 at v=590.99 (res +0.00001), -0.2 at v=760.33 (res +0.00002), -0.16 at v=929.92 (res -0.00004), -0.12 at v=1099.05 (res +0.00002), -0.08 at v=1268.58 (res -0.00002), -0.04 at v=1438.01 (res -0.00003), 0 at v=1607.06 (res +0.00004)
- 2-D affine fit through 70 labelled-line intersections: rms residual x 0.0134 (max 0.0241), y 0.00003 (max 0.00006); scale dx/du 0.023719, dy/dv 0.000236 per pixel
- check on unlabelled grid lines: worst |residual| x 0.0283, y 0.00011

**TN 3819 fig. 24, panel a** (PDF page 55, 300 dpi, image rotated 90 deg clockwise):
- x labelled grid lines (1-D fit, along the panel's mid-height): 0 at u=446.28 (res +0.0047), 2 at u=644.53 (res -0.0042), 4 at u=840.86 (res +0.0064), 6 at u=1040.34 (res -0.0149), 8 at u=1235.82 (res +0.0042), 10 at u=1433.23 (res +0.0039)
- y labelled grid lines (1-D fit, along the panel's mid-width): -0.16 at v=756.39 (res -0.00001), -0.12 at v=954.74 (res -0.00000), -0.08 at v=1153.01 (res +0.00002), -0.04 at v=1351.42 (res +0.00001), 0 at v=1549.93 (res -0.00002)
- 2-D affine fit through 30 labelled-line intersections: rms residual x 0.0076 (max 0.0157), y 0.00001 (max 0.00003); scale dx/du 0.010133, dy/dv 0.000202 per pixel
- check on unlabelled grid lines: worst |residual| x 0.0073, y 0.00014

**TN 3819 fig. 24, panel b** (PDF page 55, 300 dpi, image rotated 90 deg clockwise):
- x labelled grid lines (1-D fit, along the panel's mid-height): 0 at u=1630.35 (res +0.0048), 2 at u=1827.90 (res +0.0021), 4 at u=2026.69 (res -0.0132), 6 at u=2222.11 (res +0.0056), 8 at u=2420.34 (res -0.0040), 10 at u=2616.76 (res +0.0047)
- y labelled grid lines (1-D fit, along the panel's mid-width): -0.16 at v=760.25 (res -0.00003), -0.12 at v=958.27 (res +0.00003), -0.08 at v=1156.60 (res +0.00002), -0.04 at v=1354.98 (res +0.00001), 0 at v=1553.46 (res -0.00002)
- 2-D affine fit through 30 labelled-line intersections: rms residual x 0.0074 (max 0.0140), y 0.00003 (max 0.00007); scale dx/du 0.010138, dy/dv 0.000202 per pixel
- check on unlabelled grid lines: worst |residual| x 0.0070, y 0.00016

**TN 3819 fig. 25(b), panel b** (PDF page 56, 300 dpi, image rotated 90 deg clockwise):
- x labelled grid lines (1-D fit, along the panel's mid-height): 0 at u=1677.90 (res +0.0055), 4 at u=1849.77 (res -0.0193), 8 at u=2019.11 (res +0.0151), 12 at u=2190.45 (res +0.0025), 16 at u=2361.41 (res -0.0010), 20 at u=2532.29 (res -0.0029)
- y labelled grid lines (1-D fit, along the panel's mid-width): -0.16 at v=979.58 (res +0.00006), -0.12 at v=1151.35 (res -0.00003), -0.08 at v=1323.13 (res -0.00012), -0.04 at v=1493.63 (res +0.00010), 0 at v=1665.47 (res -0.00001)
- 2-D affine fit through 30 labelled-line intersections: rms residual x 0.0106 (max 0.0198), y 0.00008 (max 0.00017); scale dx/du 0.023418, dy/dv 0.000233 per pixel
- check on unlabelled grid lines: worst |residual| x 0.0209, y 0.00027

**RM A52E20 fig. 15, panel a** (PDF page 44, 300 dpi, image as scanned):
- x labelled grid lines (1-D fit, along the panel's mid-height): 1 at u=684.77 (res -0.0016), 2 at u=955.50 (res +0.0021), 3 at u=1227.82 (res -0.0000), 4 at u=1500.82 (res -0.0047), 5 at u=1768.88 (res +0.0089), 6 at u=2044.30 (res -0.0047)
- y labelled grid lines (1-D fit, along the panel's mid-width): -0.24 at v=327.01 (res -0.00019), -0.2 at v=460.89 (res +0.00038), -0.16 at v=597.78 (res +0.00005), -0.12 at v=734.49 (res -0.00022), -0.08 at v=870.02 (res -0.00014), -0.04 at v=1005.44 (res -0.00003), 0 at v=1140.65 (res +0.00014)
- 2-D affine fit through 42 labelled-line intersections: rms residual x 0.0058 (max 0.0205), y 0.00023 (max 0.00065); scale dx/du 0.003680, dy/dv 0.000295 per pixel
- check on unlabelled grid lines: worst |residual| x 0.0064, y 0.00000

**RM A52E20 fig. 15, panel b** (PDF page 44, 300 dpi, image as scanned):
- x labelled grid lines (1-D fit, along the panel's mid-height): 1 at u=679.65 (res -0.0021), 2 at u=950.58 (res +0.0024), 3 at u=1223.24 (res +0.0007), 4 at u=1495.60 (res -0.0000), 5 at u=1768.08 (res -0.0011), 6 at u=2039.92 (res +0.0001)
- y labelled grid lines (1-D fit, along the panel's mid-width): -0.24 at v=1542.70 (res -0.00042), -0.2 at v=1678.16 (res -0.00002), -0.16 at v=1813.19 (res +0.00052), -0.12 at v=1951.60 (res +0.00005), -0.08 at v=2087.96 (res +0.00019), -0.04 at v=2225.67 (res -0.00006), 0 at v=2363.25 (res -0.00028)
- 2-D affine fit through 42 labelled-line intersections: rms residual x 0.0015 (max 0.0027), y 0.00035 (max 0.00113); scale dx/du 0.003674, dy/dv 0.000292 per pixel
- check on unlabelled grid lines: worst |residual| x 0.0028, y 0.00000

**TN 3372 fig. 10, panel main** (PDF page 19, 300 dpi, image as scanned):
- x labelled grid lines (1-D fit, along the panel's mid-height): 0.6 at u=572.38 (res +0.0005), 0.7 at u=780.44 (res -0.0006), 0.8 at u=985.54 (res -0.0003), 0.9 at u=1190.40 (res +0.0001), 1 at u=1396.03 (res +0.0002), 1.1 at u=1601.92 (res +0.0001), 1.2 at u=1808.00 (res -0.0001)
- y labelled grid lines (1-D fit, along the panel's mid-width): -0.08 at v=356.24 (res +0.00025), 0 at v=561.96 (res -0.00006), 0.08 at v=768.43 (res -0.00066), 0.16 at v=970.48 (res +0.00046)
- 2-D affine fit through 28 labelled-line intersections: rms residual x 0.0004 (max 0.0010), y 0.00046 (max 0.00098); scale dx/du 0.000486, dy/dv 0.000390 per pixel
- check on unlabelled grid lines: worst |residual| x 0.0007, y 0.00097

**TN 3372 fig. 12, panel main** (PDF page 20, 300 dpi, image as scanned):
- x labelled grid lines (1-D fit, along the panel's mid-height): 0.6 at u=543.60 (res +0.0005), 0.7 at u=750.74 (res -0.0000), 0.8 at u=958.24 (res -0.0007), 0.9 at u=1163.00 (res -0.0001), 1 at u=1368.49 (res +0.0001), 1.1 at u=1574.74 (res -0.0000), 1.2 at u=1780.14 (res +0.0003)
- y labelled grid lines (1-D fit, along the panel's mid-width): -0.32 at v=722.21 (res +0.00002), -0.24 at v=928.96 (res -0.00019), -0.16 at v=1134.22 (res +0.00017), -0.08 at v=1340.37 (res +0.00020), 0 at v=1547.82 (res -0.00028), 0.08 at v=1753.04 (res +0.00009), 0.16 at v=1959.53 (res -0.00001)
- 2-D affine fit through 49 labelled-line intersections: rms residual x 0.0005 (max 0.0016), y 0.00019 (max 0.00039); scale dx/du 0.000485, dy/dv 0.000388 per pixel
- check on unlabelled grid lines: worst |residual| x 0.0010, y 0.00031


## 7. Every flagged row and what I saw

Counts per file, then each non-`ok` row (TN 3372 fig. 12 rows are all `curve` and are not repeated; their notes are in the CSV). Overlaps follow the rule in section 3.

- `rme51f26_fig7.csv`: 51 rows; flags: ambiguous 27, ok 24
  - fig. 7(a) open square: angular station theta 50 deg x 9.324 y -0.0100 [ambiguous] alt: y=-0.0070 x=9.322 (if identities of a1s and a1d are swapped) (overlaps theta 90 deg (open diamond) (a1d), centres 12.3 px apart)
  - fig. 7(a) open diamond: angular station theta 90 deg x 9.322 y -0.0070 [ambiguous] alt: y=-0.0100 x=9.324 (if identities of a1d and a1s are swapped) (overlaps theta 50 deg (open square) (a1s), centres 12.3 px apart)
  - fig. 7(a) open square: angular station theta 50 deg x 9.676 y -0.0878 [ambiguous] alt: y=-0.0893 x=9.674 (if identities of a2s and a2d are swapped) (overlaps theta 90 deg (open diamond) (a2d), centres 6.0 px apart)
  - fig. 7(a) open diamond: angular station theta 90 deg x 9.674 y -0.0893 [ambiguous] alt: y=-0.0878 x=9.676 (if identities of a2d and a2s are swapped) (overlaps theta 50 deg (open square) (a2s), centres 6.0 px apart)
  - fig. 7(a) open circle: angular station theta 15 deg x 10.170 y -0.0668 [ambiguous] alt: y=-0.0678 x=10.167 (if identities of a3c and a3d are swapped) (overlaps theta 90 deg (open diamond) (a3d), centres 4.4 px apart)
  - fig. 7(a) open square: angular station theta 50 deg x 10.172 y -0.0697 [ambiguous] alt: y=-0.0678 x=10.167 (if identities of a3s and a3d are swapped) (overlaps theta 90 deg (open diamond) (a3d), centres 7.9 px apart)
  - fig. 7(a) open diamond: angular station theta 90 deg x 10.167 y -0.0678 [ambiguous] alt: y=-0.0668 x=10.170 (if identities of a3d and a3c are swapped); y=-0.0697 x=10.172 (if identities of a3d and a3s are swapped) (overlaps theta 15 deg (open circle) (a3c), centres 4.4 px apart; overlaps theta 50 deg (open square) (a3s), centres 7.9 px apart)
  - fig. 7(a) open square: angular station theta 50 deg x 10.668 y -0.0463 [ambiguous] alt: y=-0.0486 x=10.671 (if identities of a4s and a4d are swapped) (overlaps theta 90 deg (open diamond) (a4d), centres 9.8 px apart)
  - fig. 7(a) open diamond: angular station theta 90 deg x 10.671 y -0.0486 [ambiguous] alt: y=-0.0463 x=10.668 (if identities of a4d and a4s are swapped) (overlaps theta 50 deg (open square) (a4s), centres 9.8 px apart)
  - fig. 7(a) open circle: angular station theta 15 deg x 11.671 y -0.0181 [ambiguous] alt: y=-0.0172 x=11.670 (if identities of a6c and a6s are swapped) (overlaps theta 50 deg (open square) (a6s), centres 3.8 px apart)
  - fig. 7(a) open square: angular station theta 50 deg x 11.670 y -0.0172 [ambiguous] alt: y=-0.0181 x=11.671 (if identities of a6s and a6c are swapped) (overlaps theta 15 deg (open circle) (a6c), centres 3.8 px apart)
  - fig. 7(b) open circle: angular station theta 15 deg x 10.166 y -0.1147 [ambiguous] alt: y=-0.1121 x=10.165 (if identities of b2c and b2d are swapped) (overlaps theta 90 deg (open diamond) (b2d), centres 10.5 px apart)
  - fig. 7(b) open square: angular station theta 50 deg x 10.165 y -0.1103 [ambiguous] alt: y=-0.1121 x=10.165 (if identities of b2s and b2d are swapped) (overlaps theta 90 deg (open diamond) (b2d), centres 7.8 px apart)
  - fig. 7(b) open diamond: angular station theta 90 deg x 10.165 y -0.1121 [ambiguous] alt: y=-0.1147 x=10.166 (if identities of b2d and b2c are swapped); y=-0.1103 x=10.165 (if identities of b2d and b2s are swapped) (overlaps theta 15 deg (open circle) (b2c), centres 10.5 px apart; overlaps theta 50 deg (open square) (b2s), centres 7.8 px apart)
  - fig. 7(b) open circle: angular station theta 15 deg x 10.543 y -0.0919 [ambiguous] alt: y=-0.0919 x=10.543 (if identities of b3c and b3s are swapped) (overlaps theta 50 deg (open square) (b3s), centres 0.2 px apart; the two symbols coincide)
  - fig. 7(b) open square: angular station theta 50 deg x 10.543 y -0.0919 [ambiguous] alt: y=-0.0919 x=10.543 (if identities of b3s and b3c are swapped) (overlaps theta 15 deg (open circle) (b3c), centres 0.2 px apart; the two symbols coincide)
  - fig. 7(b) open circle: angular station theta 15 deg x 10.929 y -0.0688 [ambiguous] alt: y=-0.0689 x=10.930 (if identities of b4c and b4s are swapped) (overlaps theta 50 deg (open square) (b4s), centres 0.6 px apart; the two symbols coincide)
  - fig. 7(b) open square: angular station theta 50 deg x 10.930 y -0.0689 [ambiguous] alt: y=-0.0688 x=10.929 (if identities of b4s and b4c are swapped) (overlaps theta 15 deg (open circle) (b4c), centres 0.6 px apart; the two symbols coincide)
  - fig. 7(b) open circle: angular station theta 15 deg x 11.675 y -0.0370 [ambiguous] alt: y=-0.0370 x=11.677 (if identities of b6c and b6s are swapped) (overlaps theta 50 deg (open square) (b6s), centres 0.8 px apart; the two symbols coincide)
  - fig. 7(b) open square: angular station theta 50 deg x 11.677 y -0.0370 [ambiguous] alt: y=-0.0370 x=11.675 (if identities of b6s and b6c are swapped) (overlaps theta 15 deg (open circle) (b6c), centres 0.8 px apart; the two symbols coincide)
  - fig. 7(c) open square: angular station theta 50 deg x 10.165 y -0.0090 [ambiguous] alt: y=-0.0057 x=10.169 (if identities of c1s and c1d are swapped) (overlaps theta 90 deg (open diamond) (c1d), centres 14.1 px apart)
  - fig. 7(c) open diamond: angular station theta 90 deg x 10.169 y -0.0057 [ambiguous] alt: y=-0.0090 x=10.165 (if identities of c1d and c1s are swapped) (overlaps theta 50 deg (open square) (c1s), centres 14.1 px apart)
  - fig. 7(c) open square: angular station theta 50 deg x 11.077 y -0.1096 [ambiguous] alt: y=-0.1119 x=11.081 (if identities of c3s and c3d are swapped) (overlaps theta 90 deg (open diamond) (c3d), centres 9.8 px apart)
  - fig. 7(c) open diamond: angular station theta 90 deg x 11.081 y -0.1119 [ambiguous] alt: y=-0.1096 x=11.077 (if identities of c3d and c3s are swapped) (overlaps theta 50 deg (open square) (c3s), centres 9.8 px apart)
  - fig. 7(c) open circle: angular station theta 15 deg x 11.832 y -0.0595 [ambiguous] alt: y=-0.0573 x=11.828 (if identities of c5c and c5d are swapped) (overlaps theta 90 deg (open diamond) (c5d), centres 9.1 px apart)
  - fig. 7(c) open square: angular station theta 50 deg x 11.825 y -0.0558 [ambiguous] alt: y=-0.0573 x=11.828 (if identities of c5s and c5d are swapped) (overlaps theta 90 deg (open diamond) (c5d), centres 6.3 px apart)
  - fig. 7(c) open diamond: angular station theta 90 deg x 11.828 y -0.0573 [ambiguous] alt: y=-0.0595 x=11.832 (if identities of c5d and c5c are swapped); y=-0.0558 x=11.825 (if identities of c5d and c5s are swapped) (overlaps theta 15 deg (open circle) (c5c), centres 9.1 px apart; overlaps theta 50 deg (open square) (c5s), centres 6.3 px apart)
- `rme51f26_fig8.csv`: 37 rows; flags: ambiguous 21, ok 16
  - fig. 8(a) open square: angular station theta 50 deg x 10.176 y 0.0030 [ambiguous] alt: y=0.0008 x=10.172 (if identities of a1s and a1d are swapped) (overlaps theta 90 deg (open diamond) (a1d), centres 10.4 px apart)
  - fig. 8(a) open diamond: angular station theta 90 deg x 10.172 y 0.0008 [ambiguous] alt: y=0.0030 x=10.176 (if identities of a1d and a1s are swapped) (overlaps theta 50 deg (open square) (a1s), centres 10.4 px apart)
  - fig. 8(a) open circle: angular station theta 15 deg x 11.080 y -0.0668 [ambiguous] alt: y=-0.0687 x=11.085 (if identities of a3c and a3s are swapped) (overlaps theta 50 deg (open square) (a3s), centres 9.5 px apart)
  - fig. 8(a) open square: angular station theta 50 deg x 11.085 y -0.0687 [ambiguous] alt: y=-0.0668 x=11.080 (if identities of a3s and a3c are swapped) (overlaps theta 15 deg (open circle) (a3c), centres 9.5 px apart)
  - fig. 8(a) open circle: angular station theta 15 deg x 11.498 y -0.0506 [ambiguous] alt: y=-0.0535 x=11.500 (if identities of a4c and a4d are swapped) (overlaps theta 90 deg (open diamond) (a4d), centres 13.8 px apart)
  - fig. 8(a) open square: angular station theta 50 deg x 11.500 y -0.0565 [ambiguous] alt: y=-0.0535 x=11.500 (if identities of a4s and a4d are swapped) (overlaps theta 90 deg (open diamond) (a4d), centres 14.3 px apart)
  - fig. 8(a) open diamond: angular station theta 90 deg x 11.500 y -0.0535 [ambiguous] alt: y=-0.0506 x=11.498 (if identities of a4d and a4c are swapped); y=-0.0565 x=11.500 (if identities of a4d and a4s are swapped) (overlaps theta 15 deg (open circle) (a4c), centres 13.8 px apart; overlaps theta 50 deg (open square) (a4s), centres 14.3 px apart)
  - fig. 8(a) open circle: angular station theta 15 deg x 11.826 y -0.0451 [ambiguous] alt: y=-0.0475 x=11.826 (if identities of a5c and a5d are swapped) (overlaps theta 90 deg (open diamond) (a5d), centres 11.8 px apart)
  - fig. 8(a) open diamond: angular station theta 90 deg x 11.826 y -0.0475 [ambiguous] alt: y=-0.0451 x=11.826 (if identities of a5d and a5c are swapped) (overlaps theta 15 deg (open circle) (a5c), centres 11.8 px apart)
  - fig. 8(b) open circle: angular station theta 15 deg x 11.000 y -0.1072 [ambiguous] alt: y=-0.1099 x=11.000 (if identities of b2c and b2d are swapped) (overlaps theta 90 deg (open diamond) (b2d), centres 13.0 px apart)
  - fig. 8(b) open diamond: angular station theta 90 deg x 11.000 y -0.1099 [ambiguous] alt: y=-0.1072 x=11.000 (if identities of b2d and b2c are swapped) (overlaps theta 15 deg (open circle) (b2c), centres 13.0 px apart)
  - fig. 8(b) open square: angular station theta 50 deg x 11.439 y -0.0893 [ambiguous] alt: y=-0.0882 x=11.438 (if identities of b3s and b3d are swapped) (overlaps theta 90 deg (open diamond) (b3d), centres 5.3 px apart)
  - fig. 8(b) open diamond: angular station theta 90 deg x 11.438 y -0.0882 [ambiguous] alt: y=-0.0893 x=11.439 (if identities of b3d and b3s are swapped) (overlaps theta 50 deg (open square) (b3s), centres 5.3 px apart)
  - fig. 8(b) open circle: angular station theta 15 deg x 11.830 y -0.0618 [ambiguous] alt: y=-0.0635 x=11.832 (if identities of b4c and b4s are swapped) (overlaps theta 50 deg (open square) (b4s), centres 8.0 px apart)
  - fig. 8(b) open square: angular station theta 50 deg x 11.832 y -0.0635 [ambiguous] alt: y=-0.0618 x=11.830 (if identities of b4s and b4c are swapped) (overlaps theta 15 deg (open circle) (b4c), centres 8.0 px apart)
  - fig. 8(c) open circle: angular station theta 15 deg x 10.798 y 0.0002 [ambiguous] alt: y=0.0001 x=10.798 (if identities of c1c and c1d are swapped) (overlaps theta 90 deg (open diamond) (c1d), centres 0.8 px apart; the two symbols coincide)
  - fig. 8(c) open diamond: angular station theta 90 deg x 10.798 y 0.0001 [ambiguous] alt: y=0.0002 x=10.798 (if identities of c1d and c1c are swapped) (overlaps theta 15 deg (open circle) (c1c), centres 0.8 px apart; the two symbols coincide)
  - fig. 8(c) open square: angular station theta 50 deg x 11.303 y -0.1401 [ambiguous] alt: y=-0.1402 x=11.302 (if identities of c2s and c2d are swapped) (overlaps theta 90 deg (open diamond) (c2d), centres 0.7 px apart; the two symbols coincide)
  - fig. 8(c) open diamond: angular station theta 90 deg x 11.302 y -0.1402 [ambiguous] alt: y=-0.1401 x=11.303 (if identities of c2d and c2s are swapped) (overlaps theta 50 deg (open square) (c2s), centres 0.7 px apart; the two symbols coincide)
  - fig. 8(c) open square: angular station theta 50 deg x 11.574 y -0.1249 [ambiguous] alt: y=-0.1234 x=11.571 (if identities of c3s and c3d are swapped) (overlaps theta 90 deg (open diamond) (c3d), centres 6.8 px apart)
  - fig. 8(c) open diamond: angular station theta 90 deg x 11.571 y -0.1234 [ambiguous] alt: y=-0.1249 x=11.574 (if identities of c3d and c3s are swapped) (overlaps theta 50 deg (open square) (c3s), centres 6.8 px apart)
- `rme51f26_fig24.csv`: 14 rows; flags: ambiguous 1, ok 13
  - fig. 24 right-triangle symbol: Model from reference 6 x 4.499 y -0.0698 [ambiguous] alt: C_p,b or C'_p,b (coefficient type unknown); value read y as given (Mach number not given for this point (reference 6 title: Mach numbers 1.49 to 1.98); coefficient type not stated by the legend)
- `rme51f26_fig29.csv`: 16 rows; flags: curve 6, ok 10
  - fig. 29(a) curve: Friction (C_f = 0.003) x 5.63 y 0.0244 [curve] (friction drag is drawn only as a curve labelled Friction (C_f = 0.003), a computed estimate rather than a measurement)
  - fig. 29(a) curve: Friction (C_f = 0.003) x 7.03 y 0.0196 [curve] (friction drag is drawn only as a curve labelled Friction (C_f = 0.003), a computed estimate rather than a measurement)
  - fig. 29(a) curve: Friction (C_f = 0.003) x 9.33 y 0.0167 [curve] (friction drag is drawn only as a curve labelled Friction (C_f = 0.003), a computed estimate rather than a measurement)
  - fig. 29(c) curve: Experimental pressure drag plus friction drag x 5.63 y 0.0858 [curve] (this component is drawn only as a curve, no symbols)
  - fig. 29(c) curve: Experimental pressure drag plus friction drag x 7.03 y 0.0899 [curve] (this component is drawn only as a curve, no symbols)
  - fig. 29(c) curve: Experimental pressure drag plus friction drag x 9.33 y 0.1021 [curve] (this component is drawn only as a curve, no symbols)
- `rme51f26_fig30.csv`: 16 rows; flags: curve 6, ok 10
  - fig. 30(a) curve: Friction (C_f = 0.003) x 5.63 y 0.0153 [curve] (friction drag is drawn only as a curve labelled Friction (C_f = 0.003), a computed estimate rather than a measurement)
  - fig. 30(a) curve: Friction (C_f = 0.003) x 7.03 y 0.0121 [curve] (friction drag is drawn only as a curve labelled Friction (C_f = 0.003), a computed estimate rather than a measurement)
  - fig. 30(a) curve: Friction (C_f = 0.003) x 9.33 y 0.0098 [curve] (friction drag is drawn only as a curve labelled Friction (C_f = 0.003), a computed estimate rather than a measurement; near its right end the friction curve runs into the horizontal leader line of its label; this value may be on the leader)
  - fig. 30(c) curve: Experimental pressure drag plus friction drag x 5.63 y 0.0937 [curve] (this component is drawn only as a curve, no symbols)
  - fig. 30(c) curve: Experimental pressure drag plus friction drag x 7.03 y 0.0991 [curve] (this component is drawn only as a curve, no symbols)
  - fig. 30(c) curve: Experimental pressure drag plus friction drag x 9.33 y (empty) [curve] alt: 0.1141 (value at the drawn right end of the curve, epsilon 9.17; reading at 9.33 would need extrapolation, not done) (the curve ends at epsilon about 9.17, short of the tested angle 9.33)
- `tn3819_fig19.csv`: 24 rows; flags: ambiguous 6, ok 18
  - fig. 19(b) open circle: R/inch .30 x 10^6 x 4.008 y -0.1631 [ambiguous] alt: y=-0.1641 x=4.009 (if identities of bL4c and bL4s are swapped) (overlaps open square (bL4s), centres 4.3 px apart)
  - fig. 19(b) open square: R/inch 1.20 x 10^6 x 4.009 y -0.1641 [ambiguous] alt: y=-0.1631 x=4.008 (if identities of bL4s and bL4c are swapped) (overlaps open circle (bL4c), centres 4.3 px apart; square largely hidden behind the circle at the same station)
  - fig. 19(c) open circle: R/inch .35 x 10^6 x 3.008 y -0.1967 [ambiguous] alt: y=-0.1951 x=3.007 (if identities of cL3c and cL3s are swapped) (overlaps open square (cL3s), centres 7.0 px apart)
  - fig. 19(c) open square: R/inch 1.40 x 10^6 x 3.007 y -0.1951 [ambiguous] alt: y=-0.1967 x=3.008 (if identities of cL3s and cL3c are swapped) (overlaps open circle (cL3c), centres 7.0 px apart)
  - fig. 19(c) open circle: R/inch .35 x 10^6 x 4.010 y -0.1757 [ambiguous] alt: y=-0.1740 x=4.008 (if identities of cL4c and cL4s are swapped) (overlaps open square (cL4s), centres 7.5 px apart)
  - fig. 19(c) open square: R/inch 1.40 x 10^6 x 4.008 y -0.1740 [ambiguous] alt: y=-0.1757 x=4.010 (if identities of cL4s and cL4c are swapped) (overlaps open circle (cL4c), centres 7.5 px apart)
- `tn3819_fig21.csv`: 40 rows; flags: ambiguous 40
  - fig. 21 open circle: source compilation of Ref. 2 (legend) x 1.215 y -0.2190 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 open circle: source compilation of Ref. 2 (legend) x 1.253 y -0.2185 [ambiguous] (centre set by hand: centre from least-squares fit of the visible arc of its ring (other rings and grid lines excluded), radius fixed at 15.25 px; overlaps open circle (p03), centres 15.1 px apart; the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) i)
  - fig. 21 open circle: source compilation of Ref. 2 (legend) x 1.245 y -0.2160 [ambiguous] (centre set by hand: centre from least-squares fit of the visible arc of its ring (other rings and grid lines excluded), radius fixed at 15.25 px; overlaps open circle (p02), centres 15.1 px apart; the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) i)
  - fig. 21 open circle: source compilation of Ref. 2 (legend) x 1.273 y -0.2118 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 open circle: source compilation of Ref. 2 (legend) x 1.392 y -0.1973 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 open triangle (apex up): source compilation of Ref. 2 (legen x 1.535 y -0.1888 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 open triangle (apex up): source compilation of Ref. 2 (legen x 1.502 y -0.1802 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 open triangle (apex up): source compilation of Ref. 2 (legen x 1.500 y -0.1690 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 open circle: source compilation of Ref. 2 (legend) x 1.553 y -0.1845 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 open circle: source compilation of Ref. 2 (legend) x 1.602 y -0.1827 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 open circle: source compilation of Ref. 2 (legend) x 1.543 y -0.1791 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 open circle: source compilation of Ref. 2 (legend) x 1.601 y -0.1779 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 open circle: source compilation of Ref. 2 (legend) x 1.580 y -0.1741 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 open circle: source compilation of Ref. 2 (legend) x 1.689 y -0.1800 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 open circle: source compilation of Ref. 2 (legend) x 1.786 y -0.1838 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 open circle: source compilation of Ref. 2 (legend) x 1.799 y -0.1771 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 open circle: source compilation of Ref. 2 (legend) x 1.814 y -0.1680 [ambiguous] (centre set by hand: centre from least-squares fit of the visible arc of its ring (other rings and grid lines excluded), radius fixed at 15.25 px; overlaps open circle (p18), centres 8.8 px apart; the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is)
  - fig. 21 open circle: source compilation of Ref. 2 (legend) x 1.807 y -0.1667 [ambiguous] alt: no separate point (if the second outline is a redrawing of p17) (centre set by hand: centre from least-squares fit of the visible arc of its ring (other rings and grid lines excluded), radius fixed at 15.25 px; overlaps open circle (p17), centres 8.8 px apart; the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is)
  - fig. 21 open circle: source compilation of Ref. 2 (legend) x 1.821 y -0.1602 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 open circle: source compilation of Ref. 2 (legend) x 1.879 y -0.1642 [ambiguous] (overlaps open circle (p21), centres 13.4 px apart; the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 open circle: source compilation of Ref. 2 (legend) x 1.892 y -0.1623 [ambiguous] (overlaps open circle (p20), centres 13.4 px apart; the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 open square: source compilation of Ref. 2 (legend) x 2.003 y -0.1508 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 flagged circle (short tick at upper right): source compilati x 1.999 y -0.1444 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 open square: source compilation of Ref. 2 (legend) x 2.005 y -0.1360 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 open circle: source compilation of Ref. 2 (legend) x 1.998 y -0.1313 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 open triangle (apex up): source compilation of Ref. 2 (legen x 2.067 y -0.1280 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 flagged circle (short tick at upper right): source compilati x 2.194 y -0.1420 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 open circle: source compilation of Ref. 2 (legend) x 2.332 y -0.1336 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 open circle: source compilation of Ref. 2 (legend) x 2.330 y -0.1284 [ambiguous] (centre set by hand: centre from least-squares fit of the visible arc of its ring (other rings and grid lines excluded), radius fixed at 15.25 px; the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 open circle: source compilation of Ref. 2 (legend) x 2.310 y -0.1261 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 flagged circle (short tick at upper right): source compilati x 2.729 y -0.1080 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 flagged circle (short tick at upper right): source compilati x 2.669 y -0.0994 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 open diamond (taller than wide): source compilation of Ref.  x 2.920 y -0.1143 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown; this diamond lies well above the other points near M 2.9 (out of line))
  - fig. 21 flagged circle (short tick at upper right): source compilati x 3.128 y -0.0980 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 flagged circle (short tick at upper right): source compilati x 3.149 y -0.0901 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 flagged circle (short tick at upper right): source compilati x 3.505 y -0.0776 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 flagged circle (short tick at upper right): source compilati x 3.604 y -0.0693 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 flagged circle (short tick at upper right): source compilati x 3.816 y -0.0762 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 flagged circle (short tick at upper right): source compilati x 3.856 y -0.0743 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
  - fig. 21 flagged circle (short tick at upper right): source compilati x 3.848 y -0.0636 [ambiguous] (the legend does not explain the different symbol shapes, so the symbol meaning (source within Ref. 2) is unknown)
- `tn3819_fig23.csv`: 11 rows; flags: ambiguous 1, ok 10
  - fig. 23 open triangle: Ames x 15.35 y -0.0636 [ambiguous] alt: x=15.28 y=-0.0636 (template fit, pulled toward the overlapping circle) (centre set by hand: centre from apex (1837.5,1321.5) and base line (v 1341) read on a character map; triangle overlaps the circle at beta about 15 (centres 14 px apart))
- `tn3819_fig24.csv`: 6 rows; flags: ok 6
- `tn3819_fig25b.csv`: 5 rows; flags: ok 5
- `rma52e20_fig15.csv`: 12 rows; flags: ok 8, untraced 4
  - fig. 15(a) solid curve: Present tests Model 3 (Ogive-cylinder l/d = 7) x  y (empty) [untraced] (the present-test results are drawn only as a curve without symbols (drawn from about M 2.6 to 4.7, approximate); the brief asks for plotted points only and names no curve here, so the curve was not read)
  - fig. 15(a) dashed curve: Present tests Model 8 (Ogive-cylinder with boa x  y (empty) [untraced] (the present-test results are drawn only as a curve without symbols (drawn from about M 3.1 to 4.7, approximate); the brief asks for plotted points only and names no curve here, so the curve was not read)
  - fig. 15(b) solid curve: Present tests Model 3 (Ogive-cylinder l/d = 7) x  y (empty) [untraced] (the present-test results are drawn only as a curve without symbols (drawn from about M 2.6 to 4.7, approximate); the brief asks for plotted points only and names no curve here, so the curve was not read)
  - fig. 15(b) dashed curve: Present tests (Ogive-cylinder with boattail l/ x  y (empty) [untraced] (the present-test results are drawn only as a curve without symbols (drawn from about M 2.6 to 4.7, approximate); the brief asks for plotted points only and names no curve here, so the curve was not read)
- `tn3372_fig10.csv`: 46 rows; flags: ambiguous 21, ok 25
  - fig. 10 square with centre dot: Edge orifice x 0.909 y 0.0461 [ambiguous] alt: y=0.0454 x=0.910 (from the symbol's centre dot instead of its outline)
  - fig. 10 square with centre dot: Edge orifice x 0.929 y 0.0519 [ambiguous] (centre set by hand: overlaps the squares on either side)
  - fig. 10 square with centre dot: Edge orifice x 0.944 y 0.0621 [ambiguous] alt: y=0.0613 x=0.944 (from the symbol's centre dot instead of its outline)
  - fig. 10 square with centre dot: Edge orifice x 0.964 y 0.0849 [ambiguous] alt: y=0.0840 x=0.965 (from the symbol's centre dot instead of its outline)
  - fig. 10 square with centre dot: Edge orifice x 0.979 y 0.0491 [ambiguous] alt: y=0.0486 x=0.980 (from the symbol's centre dot instead of its outline)
  - fig. 10 square with centre dot: Edge orifice x 0.995 y 0.0198 [ambiguous] alt: y=0.0204 x=0.995 (from the symbol's centre dot instead of its outline)
  - fig. 10 square with centre dot: Edge orifice x 0.999 y 0.0077 [ambiguous] alt: y=0.0086 x=1.000 (from the symbol's centre dot instead of its outline)
  - fig. 10 square with centre dot: Edge orifice x 1.019 y -0.0017 [ambiguous] alt: y=-0.0009 x=1.019 (from the symbol's centre dot instead of its outline)
  - fig. 10 square with centre dot: Edge orifice x 1.059 y -0.0226 [ambiguous] (centre set by hand: faint in the scan (outline partly erased); symbol very faint in the scan)
  - fig. 10 square with centre dot: Edge orifice x 1.079 y -0.0331 [ambiguous] (centre set by hand: faint in the scan (outline partly erased); symbol very faint in the scan)
  - fig. 10 square with centre dot: Edge orifice x 1.090 y -0.0388 [ambiguous] (centre set by hand: faint in the scan (outline partly erased); symbol very faint in the scan)
  - fig. 10 square with centre dot: Edge orifice x 1.109 y -0.0424 [ambiguous] alt: y=-0.0419 x=1.109 (from the symbol's centre dot instead of its outline)
  - fig. 10 circle with centre dot: Center orifice x 0.939 y 0.0810 [ambiguous] alt: y=0.0817 x=0.940 (from the symbol's centre dot instead of its outline)
  - fig. 10 circle with centre dot: Center orifice x 0.945 y 0.0882 [ambiguous] alt: y=0.0877 x=0.945 (from the symbol's centre dot instead of its outline)
  - fig. 10 circle with centre dot: Center orifice x 0.955 y 0.0954 [ambiguous] alt: y=0.0962 x=0.955 (from the symbol's centre dot instead of its outline)
  - fig. 10 circle with centre dot: Center orifice x 0.994 y 0.0414 [ambiguous] alt: y=0.0406 x=0.994 (from the symbol's centre dot instead of its outline)
  - fig. 10 circle with centre dot: Center orifice x 1.079 y -0.0053 [ambiguous] alt: y=-0.0061 x=1.079 (from the symbol's centre dot instead of its outline) (circle faint in the scan, part of its outline missing)
  - fig. 10 circle with centre dot: Center orifice x 1.089 y -0.0108 [ambiguous] alt: y=-0.0114 x=1.089 (from the symbol's centre dot instead of its outline) (circle faint in the scan, part of its outline missing)
  - fig. 10 circle with centre dot: Center orifice x 1.129 y -0.0185 [ambiguous] alt: y=-0.0194 x=1.130 (from the symbol's centre dot instead of its outline)
  - fig. 10 circle with centre dot: Center orifice x 1.158 y -0.0268 [ambiguous] alt: y=-0.0260 x=1.160 (from the symbol's centre dot instead of its outline)
  - fig. 10 circle with centre dot: Center orifice x 1.179 y -0.0305 [ambiguous] alt: y=-0.0296 x=1.179 (from the symbol's centre dot instead of its outline)
- `tn3372_fig12.csv`: 60 rows; flags: curve 60

## 8. Where the brief and the PDFs differ

- Page numbers: every PDF page named in the brief matched its caption (RM E51F26 pp. 5 to 7, 28, 29, 30, 48, 56, 57; TN 3819 pp. 18 to 20, 50, 52, 54, 55, 56; RM A52E20 pp. 6, 26, 44; TN 3372 pp. 4, 9, 10, 19, 20). Report page = PDF page minus 1 for RM E51F26, minus 2 for TN 3819, minus 1 for RM A52E20 and minus 2 for TN 3372.
- RM E51F26 fig. 24: the legend gives no Mach number for the plotted points; M1 (Mach number just ahead of the base) labels 1.30, 1.91, 2.10, 3.50 belong to the predicted C'_p,b lines only. I used the test free-stream Mach number 1.91 from the text and marked it as such.
- RM E51F26 fig. 24: the triangle "Model from reference 6" has no stated coefficient type or Mach number.
- RM E51F26 fig. 30 also plots base-bleed results (squares, jet flow); not read under rule 8. Its total-drag curve stops at epsilon about 9.17, before the tested 9.33.
- RM E51F26 figs. 29 and 30: besides the side, base and total components the brief names, panel (a) carries a friction-drag curve (C_f = 0.003) drawn only as a curve; I read it at the tested angles with flag `curve` because it is a drag component drawn only as a curve; it is a computed estimate, not a measurement.
- RM E51F26 text: it does not describe boundary-layer transition beyond the trip wire used "for selected settings".
- RM A52E20 fig. 1(c) is a photograph: it gives no dimension of model 8 except l/d = 7.0; the boattail profile, boattail length and nose of model 8 are not given on the listed pages.
- RM A52E20 fig. 15: the present-test results for model 8 (and for model 3) are drawn only as curves without symbols; the plotted points are all from other sources (refs. 4, 10, 11 and unpublished Ames data). The brief's "every plotted point, with and without the boat-tail" therefore yields only these reference points; the present-test curves are listed as `untraced`. The figure gives Re per panel, not per point.
- TN 3819 fig. 21: the legend does not explain the symbol shapes. TN 3819 fig. 19: the legend gives no data source.
- TN 3819: the base-to-body diameter ratio is written h/D in this report (Db/Dm in RM E51F26).

## 9. Files and scripts

Deliverables in `B/`: `method.md`, `geometry.csv`, the 13 figure CSVs and `transition.md` (targeted text reading). Working material: `B/src/` (the four PDFs), `B/render/` (extracted page images, OCR text, `opened.log`), `B/view/` (crops and check overlays), `B/work/` (per-figure specifications with every grid-line guess and symbol seed, fit results in `work/out/`), `B/scripts/` (all run with `python3 -I`, paths passed as arguments):

- `crop.py`, `rot.py`, `ruler.py`, `montage.py`: crops, exact 90-degree rotation, crops with a pixel ruler, tiling.
- `grid.py`: first detection of grid lines; `figlib.py`: grid-line fitting, affine calibration, symbol templates and fitting; `readfig.py`: per-figure calibration and symbol fits; `detect.py`, `sizefit.py`: seeding symbols and measuring symbol size on isolated symbols; `zoomcheck.py`: overlays for checking; `arcfit.py`: centre from the visible arc of an overlapped ring; `dotfind.py`, `dots.py`: centre dots.
- `trace.py`, `colruns.py`, `curveread.py`: curve reading.
- `calreport.py`, `assemble.py`, `geometry.py`: write section 6 and the CSV files.
