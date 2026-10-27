# Reader A: method note

Blind first reading for the brief "Readers' brief: boat-tail side pressures at more Mach numbers (0014 10.7 (ag))".

## 1. Instructions received

- Brief: `ag-readers/brief.md`, SHA-256 7b050ff70754052ac95bd83f2de3cb35d05ab0db7cbdf5e3b2bcb87fa33b7969, opened 2026-10-26T23:03:57Z.
- Addendum: `ag-readers/brief-addendum.md`, SHA-256 4876c73a96d799b8622dde58b1733cd2b63beff5fbb8c16af1993c07c80d1f84. Received by a coordinator message and opened at 2026-10-27T03:16:15Z (after RM L54C16 figure 5 had been read and while RM L54I22 figure 2 was being read). Everything from RM L54I22 onward was read with the addendum in hand; the RM L54C16 geometry rows were written after it, so they include the addendum items.
- The container restarted three times (about 03:08, 08:08 and 13:22 UTC on 2026-10-27, per the coordinator). Each time I re-checked all five PDFs (byte size against the server's Content-Length, SHA-256, `%%EOF` at the end, page count) and that every render still loaded. Nothing had changed.
- I did not open the bowshock repository, git, GitHub, the website, any other folder of the scratchpad, any other reader's files, NACA TN 3320, or any source other than the five PDFs.

## 2. The PDFs

All five were fetched with curl from `https://ntrs.nasa.gov/api/citations/<id>/downloads/<id>.pdf` (the download link of each citation page the brief names), each into its own new folder under `A/src/<id>/`.

| Report | NTRS citation | SHA-256 | Bytes | Pages | Scan |
|---|---|---|---|---|---|
| RM L54C16 | https://ntrs.nasa.gov/citations/19930088187 | 0e5692101af2c78196723f706ce1e4aa7c6ff7e8801d07f1ef0a7b4c659bfe52 | 13347082 | 33 | 300 ppi colour JPEG |
| RM L54I22 | https://ntrs.nasa.gov/citations/19930093718 | d3c4c096f44b258ef41341c698dc2c8eed9bb7163967f03a925d6980066cce89 | 20057086 | 42 | 300 ppi colour JPEG |
| RM E57E06 | https://ntrs.nasa.gov/citations/19930089763 | ad79cc256b3d222b76f1f56f59d84d343c43999331ad004cb0e9fd856d11a8e5 | 49956892 | 115 | 300 ppi colour JPEG |
| TN D-6789 | https://ntrs.nasa.gov/citations/19720019347 | e6ea63b0ab46967eab7a1bca4ac1bd5adc0794c57ac752c128c2e6bdb740f08b | 3037158 | 52 | 300 ppi bilevel (CCITT) |
| TM X-1960 | https://ntrs.nasa.gov/citations/19700013329 | 86f80d3d50b4f41f9d3031de6d2350bc180bd374beef033617092fb05e3b57a7 | 9914890 | 109 | 300 ppi (JPEG and JBIG2) |

The three NACA RM files start with a 436-byte block before `%PDF-1.6` (an NTRS wrapper, I assume). Poppler reads them normally. The hashes are of the files exactly as downloaded.

Resolution: `pdfimages -list` shows every page is a single scanned image at 300 ppi. So I rendered every page I used with `pdftoppm -r 300` (the native resolution; a higher dpi only interpolates). All measurements are in the pixel frame of those 300 dpi renders. To look at small symbols I viewed crops enlarged 2 to 16 times (Lanczos or nearest neighbour, sometimes with the contrast stretched); the enlargement was for viewing only. Pages whose figure is printed sideways (`/Rotate` or a sideways scan) were read as rendered with the page rotation applied; TM X-1960 PDF pages 38 to 41, 46 and 48 are scanned sideways without a rotate flag, so I turned the render 90 degrees clockwise (a lossless pixel transpose) and measured on that image.

## 3. What I opened, in order

The full log with times is `A/work/opened.log`. In order:

1. brief.md; then pdfinfo and pdfimages listings of the five PDFs.
2. RM L54C16: text layer of PDF pages 4 to 6; renders of pages 4, 5, 6, 18, 19, 20, 21, 22 (page 18 is figure 1, photographs; 19 figure 2; 20 figure 3; 21 figure 4, photograph; 22 figure 5). The OCR text was checked against the page images for every number used.
3. brief-addendum.md.
4. RM L54I22: text layer of pages 4 to 6; renders of pages 4, 5, 6, 15 (figure 1), 16 (figure 2), 21 to 23 (figure 7), 32 to 34 (figure 14), 36 to 38 (figure 16).
5. RM E57E06: text layer of pages 7 to 10 (page 10 because the boundary-layer paragraph, which the addendum asks for, runs on from page 9); a string search of the whole text layer for "E51F26" and for "reference 10", which printed only the matching lines (pages 9, 34 and 35; pages 34 and 35 are the reference list); renders of pages 7, 8, 9, 10, 41 (figure 1), 42 (figure 2), 47 and 48 (figure 5), 49 (figure 6), 50 and 51 (figure 7), 52 (figure 8), 60 (figure 14); a string search of pages 1 to 33 for "figure 14" and "bevel", and the text of the one paragraph on page 16 that discusses figure 14 (it says which data figure 14 shows); later the text layer of pages 49 to 52 and 60 for the captions.
6. TN D-6789: text layer of pages 6 to 9; renders of pages 6, 7, 8, 9, 16 (tables I and II), 17 to 20 (figures 1 to 4), 21 (figure 5), 23 to 28 (figure 7), 35 (figure 12), 46 (figure 17), 47 (figure 18), 49 (figure 20); text layer of pages 21 and 23 to 28 for captions and panel labels.
7. TM X-1960: text layer of pages 8 to 12 and 19 to 22; a caption search over the text layer of pages 28 to 109 (only lines starting "Figure N.-" were printed) to locate figures 7, 9 and 11 and check the brief's page numbers; renders of pages 28 to 49, 82 and 83; text layer of pages 32 to 37, 42 to 45 and 83 for captions. Tables I and II of TM X-1960 are outside the pages the brief names and were not opened.

The two string searches over whole text layers were the only use of pages outside the brief's lists, and only matching lines were printed.

## 4. How the figures were read (all figures)

1. Calibration. For each plot panel I traced each labelled major gridline along its whole length in the 300 dpi render (darkness-weighted centre of the line in 10-pixel bands, straight-line fit with outlier rejection), intersected every traced vertical line with every traced horizontal line, and fitted the data coordinates as an affine function of the pixel position (X = a + b px + c py, and the same for Y) by least squares over all intersections. This takes out rotation and skew of the scan. Every panel has at least three labelled lines per axis; the table in section 9 gives, for each, the labelled values, where each line crosses the panel's bottom (x) or left (y) edge in pixels, the one-dimensional residual of each tick, and the rms residual of the two-dimensional fit. Where a labelled line could not be traced (broken lines, a heavy zero line, a legend box) I dropped it from the fit and say so below. On two panels (TN D-6789 figure 12, and the bottom panel of TN D-6789 figure 7(f)) the horizontal gridlines are too broken to trace, and I measured their crossings by grey-level profiles at fixed columns and fitted the y map to those points (listed in the table).
2. Locating the symbols' centres from their own strokes. Each symbol type has a fixed size on a given plot. I fitted the symbol's outline (the centre line of its stroke: circle, square, diamond, triangle, quarter circle or right triangle, at the size measured on a clean instance or in the legend) to the page darkness around the symbol, searching on a 0.25 pixel grid for the centre (and the size within about 10 percent) that puts the most dark pixels under the outline. "Coverage" is the fraction of outline samples that fall on dark pixels; a clean isolated symbol gives 1.00. Where gridlines run along a symbol's edges I masked long straight strokes before fitting. For filled symbols I fitted the filled shape (inside dark, ring outside light). For RM L54C16 and RM L54I22, whose symbols carry a pin-prick centre dot, I checked the fitted centre against the dot. For right triangles and quarter circles the centre given is the centre of the symbol's bounding square; the triangle's centroid is given as an alternative.
3. Overlaps. Where symbols overlap I fitted each legend shape separately within the cluster, and reported how far the best centre can move while keeping nearly the same coverage ("spread"). A symbol is read when its outline is found with coverage at least 0.95 (0.90 on clean plots) and a spread of 4 pixels or less; it is then flagged `ambiguous` when other symbols overlap it. Otherwise it is `illegible`, the value is left empty, and `x` holds the nominal station or Mach number (said so in the note). I checked every fit by eye on enlarged overlays.
4. Reading error. Each note gives the pixel centre and a one-sigma reading error in data units, combining the centre uncertainty (0.7 to 1 pixel for a clean full fit, 1.5 to 2.5 pixels for partial or overlapped symbols, more where stated) with the rms residual of the calibration.
5. Nothing was rounded, smoothed or interpolated. Values are given to four decimals because the calibration supports about that; the error in each note says how many are meaningful. Signs are as read against the axis labels (checked one by one: most pressure coefficients here are negative, some are positive, as plotted).
6. Lines are not read. Theory lines (method of characteristics, Van Dyke, slender body, reference 9) and fairings are skipped. No value in any file is read from a curve.

Scripts are in `A/scripts/` (all Python run with `-I`, paths passed as arguments): `calib.py` (gridline trace and affine fit), `gridspec.py` (start positions for the traces from three frame corners), `ycal.py` (y map from hand-measured gridline crossings), `refine.py` (outline fit), `fitcluster.py` (per-shape fits inside a cluster, with spread), `match.py` (template match, RM L54C16), `fig7.py`, `fig7b.py`, `f7emit.py` (TN D-6789 figure 7 stacks), `emit.py` and `emitfit.py` (CSV rows), plus small viewing helpers. Calibrations are in `A/work/cal/`, fitted centres in `A/work/pts/`, page renders in `A/work/render/`, viewing crops in `A/work/view/` (the scripts were run from `A/` with the working folders at `A/`; they now sit under `A/work/`). The deliverables are `A/method.md`, `A/geometry.csv` and the figure CSVs at the top of `A/` (copies of `A/work/out/`).

## 5. Report by report

### 5.1 RM L54C16 (Mach 1.59)

- Figure 5 (PDF page 22, caption "Power-off boattail pressure distributions and drag coefficients"): every point is power off. 5(a) Cp against x/L; 5(b) boattail drag coefficient against boattail angle. The symbols are template-matched (a clean instance of each symbol as template, normalised cross-correlation, sub-pixel peak) and checked against their centre dots.
- 10 points in 5(a): model 1 (circle) 2, model 2 (triangle) 5 including one filled triangle, model 3 (diamond) 3. 2 points in 5(b) (beta 5 and 10 deg; there is no symbol at beta 0).
- Judgement calls: the filled triangle at x/L about 0.996 is the station 0.997 point that the text (PDF page 6) says was measured on an identical model at the same Mach number; it has no centre dot, so its centre is the centroid of its outer vertices, with the bounding-box centre and a pinhole inside the fill as alternatives (flag `ambiguous`). The model 1 circle at x/L about 0.995, the model 2 triangle at 0.990 and the model 3 diamond at 0.992 are drawn across the right frame line; they are read from their visible strokes (`ok`, larger error). The figure 5(b) circle at beta 10 also sits on the frame.
- The x axis is x/L with L = 18.90 in; fig. 2 lists each orifice's x/L and I give the nearest listed orifice in each note. The model 1 circle near 0.9949 corresponds to orifice 3 at x/L 0.992 (fig. 2).
- Brief mismatch: the brief asks for the boattail drag "if the figure also gives" it: figure 5(b) does, and both circles are read (x_quantity says beta, y_quantity says C_D,bt on Smax).

### 5.2 RM L54I22 (Mach 1.62, 1.93, 2.41)

- Figure 2 (PDF page 16): legend "No primary or secondary flow" brackets both shroud symbols (circle shroud 1, d/DB 0.82; square shroud 2, d/DB 0.73), so every symbol is jet off. 58 points: 18 at M 1.62, 21 at M 1.93, 19 at M 2.41.
- x axis: the ten evenly spaced gridlines are labelled .80, .82, .86, .88, .90, ... 1.00 (no .84). The labels .80 and .82 cannot both be right on an even scale. I calibrated on the eight labels .86 to 1.00, which are consistent with each other and put the symbols on the fig. 1 orifice stations (Z = 1.06 ... 0.06 in from the base give x/L 0.8715 ... 0.9927). If instead .80 and .82 were right, every x would be 0.0200 lower; this is said in every row's note.
- Overlaps: at each station the circles and squares sit in vertical stacks, drawn so that the rear symbol is partly hidden. I counted a separate point wherever a rear symbol shows its own arc or edge (separated by a light gap) or its own centre dot, and flagged each such point `ambiguous` with the alternative "no separate point". 15 points are so flagged; each note says what was seen. A thick or doubled outline alone was not counted as a second point (noted on the row). Places where two touching circles form an X were checked with profiles: only the two circles' arcs are there.
- Figures 7, 14 and 16 (PDF pages 21 to 23, 32 to 34, 36 to 38): every panel is labelled with a primary jet pressure ratio pj/ps (jet on), and the panels carry faired curves only, no symbols. No jet-off point exists in these figures, so `rml54i22_fig7.csv`, `rml54i22_fig14.csv` and `rml54i22_fig16.csv` contain only the header.
- Support: two wing struts from the tunnel sidewalls. Fig. 1 is a plan sketch without a dimension along the body for the struts; scaled from it, they meet the body from about 1.4 to 3.8 in from the nose, about 2.9 in ahead of the boat-tail start. The text (page 5) says only that the struts had no apparent effect on the base pressure.

### 5.3 RM E57E06 (Mach 1.91 and 3.12)

- Figure 6 (PDF page 49), "Effect of struts on boattail and base pressures. Boattail angle 5.63 deg; M 1.91." Neither the caption, the legend nor the text discussing it (page 9) says the jet is off. 6(b) has jet pressure ratio Pj/P0 as its abscissa (0.77 to 17), so it is jet-on data except possibly its lowest point. The brief and the addendum (item 4) ask for every point of this support comparison, so I read all of them and flagged every row `ambiguous` with the jet state explained. 6(a): 4 double-strut circles, 4 single-strut squares (taps in line with strut), 3 reference 10 triangles (data of another report, kept and labelled). 6(b): 5 double-strut circles and 5 single-strut squares (base pressure). 21 points. At two stations the circle is drawn inside the square at the same place; both are read.
- Figure 7 (PDF pages 50 and 51), "Effect of struts on body pressure. Cylindrical afterbody; M 1.91; no jet flow." 7(a): 4 points behind the strut (circles) and 4 at 90 deg from it (squares), body station in inches. 7(b) on page 51 is a schlieren photograph (no data). 8 points.
- Figure 8 (PDF page 52, added by the addendum), boundary-layer velocity profiles at the end of the cylindrical afterbody, no jet flow: 8(a) M 1.91 16 points, 8(b) M 3.12 12 points (behind strut and 90 deg from strut). At the last station of 8(a) the circle and square overlap; both are read.
- Figure 14 (PDF page 60), caption "Jet off; boattail angle, 5.63 deg". Legend: circle db/dj 1.11, square 1.40, diamond 1.67, triangle (apex up) 2.00, triangle (apex down) 1.67 with 45 deg bevel; "Open symbols denote data taken behind struts; solid symbols denote data taken 90 deg from struts". Panels: (a) M 1.91 behind strut (open), (b) M 1.91 90 deg from strut (solid), (c) M 3.12 (both). 119 points (38, 35, 46).
- Which model: the legend does not say. The text (page 16) says these jet-off data are shown "for all the 5.63 deg boattails tested"; the basic model, the rocket model (5.63 deg was its only instrumented boattail) and the tail interference model all had 5.63 deg boattails (page 8). So no point can be assigned to a model; every row says so.
- Overlaps in fig. 14: open squares in 14(a) stack two or three deep at x about 0.33 and 0.58 (centres from edge pairs, `ambiguous`); in 14(b) solid squares merge into tall solid blocks at four stations, so the number of squares in each block is uncertain (centres set from the block's ends and edge steps, `ambiguous`, with the count uncertainty in `alternatives`). In 14(c) several open symbols are partly hidden by solid ones and one solid blob at x about 0.70 is taller than one circle (two circles possible). 25 rows flagged; each note says what was seen.
- RM E51F26: it is reference 10 (reference list, page 34). The text cites it only for comparison data (the splitter-plate model of reference 10, fig. 6); it does not say the models or the tunnel are the same.

### 5.4 TN D-6789 (Mach 1.83 and 2.20)

- Figure 5 (PDF page 21), caption "... Jet off; beta = 10 deg; l/dm = 1.0". Legend: phi 0 circle, 45 square, 90 diamond, 135 triangle, 157.5 right triangle, 180 quarter circle. At each station the six symbols are drawn on top of one another into one blob. I fitted each shape in each cluster (section 4, item 3). 68 rows: 19 read (`ambiguous`, mainly phi 0 and 90 where a circle's centre dot or a diamond's corners stand out) and 49 `illegible`. At x/dm -0.02 table I lists a phi 90 orifice but no diamond is visible.
- Figure 7 (PDF pages 23 to 28), six parts (beta about 3, 5, 10 at M 1.83 and 2.2), each with three panels (l/dm 0.6, 0.8, 1.0). The legend's first entry is an open circle "Jet off"; the other symbols are jet pressure ratios. At every station the jet-off circle is buried in a stack of up to six overlapping symbols. Judgement call: the jet-off circle is the lowest symbol at every station that I could check (the faired jet-off line through the lowest symbols; jet-on points move up toward the base), so I took the lowest symbol stack at each station (rows dark across the station column, gridline columns excluded) and required the circle (13 px outer half-height) to lie wholly inside it. Where that leaves 8 px (about 0.005 in Cp) or less, I give the midpoint, flag `ambiguous` and give both ends as alternatives (89 rows); where it leaves more, the value is empty and `illegible` (37 rows), with the stack's extent in the note. 126 rows (7 stations x 18 panels).
- Figure 12 (PDF page 35), boattail pressure-drag coefficient against Mach number, jet off, three panels l/dm 0.6, 0.8, 1.0; open symbols measured (circle beta 3, square 5, diamond 10), filled symbols slender-body theory (not read). In each Mach column the three open symbols lie in a vertical order (diamond above square above circle) at every subsonic and transonic Mach number, checked by outline shape; at M 1.2 to 2.2 the open symbols overlap the filled theory symbols and were placed by hand from their visible outlines. 153 rows: 121 `ok`, 27 `ambiguous`, 5 `illegible` (an open symbol completely hidden by a filled theory symbol). At M 1.05 in the l/dm 0.6 panel the lower symbol has a squarish outline: a circle and a square probably coincide; both are read and flagged.
- Figure 18 (PDF page 47), reference nozzle, jet off, M 1.83 and 2.20: phi 0 circle, 90 square, 180 diamond. 56 rows (28 per Mach): 11 `ok`, 39 `ambiguous`, 6 `illegible` (diamonds at the forward stations, overlapped by circle and square).
- Figure 20 (PDF page 49), reference nozzle drag against Mach number, jet off; the caption says flagged symbols are repeat data. 27 points; 12 carry a flag tail (series "flagged: repeat data"). At M 0.6, 0.9 and 1.2 two circles nearly coincide and the offset cannot be resolved (both read, `ambiguous`). At M 2.2 the two circles sit on the right frame and no flag tail can be seen.
- Text: only the top row (phi 0) pressures were integrated into drag (page 9). The strut's meridian is not stated in the pages read.

### 5.5 TM X-1960 (points at M 1.15 and above only)

- Figure 5 (PDF pages 32 to 34), "beta = 10 deg; l/dm = 1.0; jet off": only part (c), M 1.30, is above 1.15. Six meridian symbols overlap as in TN D-6789 figure 5. 34 rows: 21 `ambiguous`, 13 `illegible`.
- Figure 6 (PDF pages 35 to 37), "l/dm = 0.6; jet off": only part (c), M 1.30. Legend: circle 3, square 5, diamond 10, triangle 15, right triangle 20 deg. 35 rows. At the cylinder station (x/dm about -0.02) circle, triangle, right triangle and diamond overlap; no square can be found there (row `illegible`).
- Figure 7 (PDF pages 38 to 41, sideways), boattail axial-force coefficient against Mach number, jet off: points at M 1.20, 1.25, 1.30 for (a) l/dm 1.0, (b) 0.8, (c) 0.6 (with the 7.5 deg right triangle and 20 deg quarter circle) and (d) configuration 21. 45 rows. The M 1.30 symbols are drawn across the right frame line, so their centres were read by hand from their visible strokes (`ambiguous`, outline-fit centre as alternative).
- Figure 8 (PDF pages 42 to 45): curves only (lines for M 0.40 to 1.30 against l/dm), no symbols. `tmx1960_fig8.csv` has only the header; the lines were not read.
- Figure 9 (PDF page 46) is against boattail angle and has lines only; figure 10 (PDF page 47) is against Mach number but has lines only ("Measured" solid and method of characteristics dashed): neither has points, so no file was written for them.
- Figure 11 (PDF page 48), "Comparison of pressure and force measurements. beta = 10 deg; l/dm = 1.0; jet off" (flagged symbols are data taken as Mach number was decreased): 7 points at M 1.2 to 1.3, written to `tmx1960_fig11.csv`. These coefficients include the base (computed from all rows plus base axial force; balance), so they are not boattail-only. At M 1.2 a flagged square overlaps the circle and a possible second square.
- Figure 18 (PDF page 83), reference nozzle, jet off, panels M 0.40, 0.80, 1.20: only the M 1.20 panel is read. 29 rows including the solid triangle (legend "Solid symbols indicate base pressures"), which is a base pressure, not a boattail orifice. Squares are hard to fit because their edges lie on the gridlines; five were placed by hand from their visible sides, three are drawn on the circle (alternative "no separate point"), and one plus two diamonds are `illegible`.
- Support comparisons in TM X-1960 (appendix B figures 34 to 38, strut against sting) are outside the figures the brief names; I did not open them (see section 8).

## 6. Points per file and flags

| File | Rows | ok | ambiguous | illegible |
|---|---|---|---|---|
| rml54c16_fig5.csv | 12 | 11 | 1 | 0 |
| rml54i22_fig2.csv | 58 | 43 | 15 | 0 |
| rml54i22_fig7.csv, fig14.csv, fig16.csv | 0 each | | | |
| rme57e06_fig6.csv | 21 | 0 | 21 | 0 |
| rme57e06_fig7.csv | 8 | 8 | 0 | 0 |
| rme57e06_fig8.csv | 28 | 28 | 0 | 0 |
| rme57e06_fig14.csv | 119 | 94 | 25 | 0 |
| tnd6789_fig5.csv | 68 | 0 | 19 | 49 |
| tnd6789_fig7.csv | 126 | 0 | 89 | 37 |
| tnd6789_fig12.csv | 153 | 121 | 27 | 5 |
| tnd6789_fig18.csv | 56 | 11 | 39 | 6 |
| tnd6789_fig20.csv | 27 | 7 | 20 | 0 |
| tmx1960_fig5.csv | 34 | 0 | 21 | 13 |
| tmx1960_fig6.csv | 35 | 22 | 12 | 1 |
| tmx1960_fig7.csv | 45 | 26 | 19 | 0 |
| tmx1960_fig8.csv | 0 | | | |
| tmx1960_fig11.csv | 7 | 0 | 7 | 0 |
| tmx1960_fig18.csv | 29 | 2 | 24 | 3 |

No row is flagged `curve` or `untraced`. Every `ambiguous` and `illegible` row says in its `note` what was seen (overlap, partly hidden outline, symbol on the frame line, merged block, count uncertain, jet state not stated) and gives the other readings in `alternatives` where there are any.

## 7. How each figure marks jet off (rule 8)

| Figure | Marking |
|---|---|
| RM L54C16 fig. 5 | caption "Power-off ...": all points |
| RM L54I22 fig. 2 | legend "No primary or secondary flow" brackets both symbols: all points |
| RM L54I22 figs. 7, 14, 16 | every panel labelled with a jet pressure ratio (jet on); no symbols; nothing read |
| RM E57E06 fig. 6 | not stated; 6(b) is plotted against jet pressure ratio. Read anyway because the brief and addendum item 4 ask for every point of this strut comparison; every row flagged |
| RM E57E06 fig. 7 | caption "no jet flow" |
| RM E57E06 fig. 8 | caption "no jet flow" (velocity profiles) |
| RM E57E06 fig. 14 | caption "Jet off" |
| TN D-6789 figs. 5, 18, 20 | caption "Jet off" |
| TN D-6789 fig. 7 | legend: open circle "Jet off" (the other symbols are jet pressure ratios) |
| TN D-6789 fig. 12 | caption "jet-off" |
| TM X-1960 figs. 5, 6, 7, 8, 9, 10, 11, 18 | caption "jet off" |

## 8. Things in the brief that did not match the PDFs

1. RM L54C16: the brief says figure 1 is "the page before figure 2, if it is there": it is (PDF page 18, photographs). Page numbers 19, 20, 22 match.
2. RM L54I22: page numbers match. Figures 7, 14 and 16 contain no jet-off points (all jet on, curves only); figure 2's x axis labels are inconsistent (.80 and .82 on the first two of ten even lines, no .84). The text calls the boattails circular-arc, not conical.
3. RM E57E06: figure 6 does not say the jet is off and 6(b) is against jet pressure ratio; figure 7 continues on page 51 as a schlieren photograph only. Figure 14's legend does not identify the model (rocket, tail interference or basic). The text gives Reynolds number per foot only.
4. TN D-6789: page numbers match. The brief asks "whether the boattails are bodies of revolution or made of flaps": the text describes fixed conical afterbodies that simulate variable-flap nozzle positions; no flaps are described.
5. TM X-1960: the brief's page ranges match (figure 5 on 32 to 34, figure 6 on 35 to 37, figure 7 on 38 to 41, figure 8 on 42 to 45, figure 9 on 46, figure 10 on 47, figure 11 on 48, figure 17 on 82, figure 18 on 83). Figure 8 has curves only (no points). Figure 10 is against Mach number but has curves only. Figure 11's coefficients include the base. Tables I and II (orifice stations) are not in the brief's page list and were not opened. Appendix B figures 34 to 38 compare strut and sting supports; addendum item 4 asks for every point of any support comparison, but the brief does not name these figures, so I did not open them. If they are wanted, they need adding to the list.
6. TM X-1960 and TN D-6789 give the same reference nozzle drawing (fig. 17) with different Ae/Ab (0.980 in TM X-1960, 0.962 in TN D-6789).
7. Addendum item on Reynolds number basis: TM X-1960 states no Reynolds number in the pages read.

## 9. Axis calibration of every panel

All at 300 dpi on the PDF page render (TM X-1960 figures 7 and 11 on the render turned 90 degrees clockwise). "value@px" is where the traced labelled gridline crosses the panel's bottom edge (x) or left edge (y); the residual in brackets is that tick's departure from a straight-line fit through all ticks, in data units. The last column is the rms residual of the two-dimensional affine fit over all gridline intersections. Lines left out: RM E57E06 fig. 8(a) y = 0.4 (crosses the legend); TN D-6789 fig. 7(b) x = 0 (heavy zero line could not be traced) in the l/dm 0.6 and 0.8 panels; TM X-1960 fig. 7(b) y = 0.28 (legend). TN D-6789 fig. 12 (all three panels) and fig. 7(f) bottom panel: y from hand-measured crossings at the columns given.

| figure | PDF page | x ticks: value @ px (1-D residual) | y ticks: value @ px (1-D residual) | 2-D fit rms (x; y, data units) |
|---|---|---|---|---|
| RM L54C16 fig. 5(a) | 22 | 0@674.4 (+0.0001); 0.2@934.6 (-0.0006); 0.4@1192.8 (+0.0003); 0.6@1451.7 (+0.0006); 0.8@1712.1 (-0.0002); 1@1971.4 (-0.0002) | 0.16@323.1 (-2e-06); 0.08@583.5 (+0.0002); 0@842.9 (+7e-05); -0.08@1100.5 (-0.0006); -0.16@1363.1 (+0.0003); -0.24@1622.2 (+7e-05) | 0.00047; 0.00021 |
| RM L54C16 fig. 5(b) | 22 | 0@669.4 (-0.001); 2@928.5 (-0.002); 4@1187.0 (+0.0002); 6@1444.6 (+0.009); 8@1705.1 (-0.003); 10@1963.9 (-0.003) | 0.2@1938.5 (-0.0002); 0.1@2200.0 (+0.0004); 0@2458.7 (-0.0002) | 0.0063; 0.00032 |
| RM L54I22 fig. 2(a) | 16 | 0.86@1077.0 (+4e-05); 0.88@1150.6 (-6e-06); 0.9@1224.3 (-5e-05); 0.92@1297.7 (-2e-05); 0.94@1371.0 (+3e-05); 0.96@1444.6 (-7e-06); 0.98@1518.0 (+4e-05); 1@1591.7 (-2e-05) | 0@645.7 (+0.0005); -0.04@718.0 (+0.0003); -0.08@789.5 (-0.0003); -0.12@862.1 (-0.0003); -0.16@933.8 (-0.0008); -0.2@1007.5 (-0.0001); -0.24@1080.2 (-5e-05); -0.28@1154.2 (+0.0007) | 2.9e-05; 0.00044 |
| RM L54I22 fig. 2(b) | 16 | 0.86@1072.7 (+3e-05); 0.88@1146.3 (+5e-06); 0.9@1219.9 (-4e-05); 0.92@1293.4 (-5e-05); 0.94@1366.6 (+4e-05); 0.96@1440.3 (-2e-05); 0.98@1513.5 (+4e-05); 1@1587.2 (-1e-05) | 0.04@1372.3 (-0.0004); 0@1445.6 (-0.0001); -0.04@1519.4 (+0.0005); -0.08@1591.9 (+0.0003); -0.12@1664.5 (+0.0003); -0.16@1736.4 (-0.0002); -0.2@1809.1 (-0.0002); -0.24@1882.2 (-5e-05) | 2.8e-05; 0.00028 |
| RM L54I22 fig. 2(c) | 16 | 0.86@1068.7 (+2e-05); 0.88@1142.2 (-2e-05); 0.9@1215.6 (-2e-05); 0.92@1289.0 (-3e-05); 0.94@1362.0 (+7e-05); 0.96@1435.8 (-3e-05); 0.98@1508.9 (+3e-05); 1@1582.5 (-2e-05) | 0.04@2102.2 (-9e-05); 0@2175.4 (-5e-05); -0.04@2249.0 (+0.0002); -0.08@2321.9 (+7e-05); -0.12@2394.8 (-5e-05); -0.16@2467.9 (-8e-05); -0.2@2541.2 (+1e-05) | 3.7e-05; 0.00011 |
| RM E57E06 fig. 6(a) | 49 | 0@606.1 (-0.0006); 0.2@852.8 (-0.0004); 0.4@1098.7 (+0.0003); 0.6@1344.0 (+0.002); 0.8@1592.4 (+0.0003); 1@1841.2 (-0.001) | 0.05@359.4 (+7e-05); 0@604.9 (-0.0001); -0.05@851.9 (+8e-06); -0.1@1098.3 (+4e-06); -0.15@1344.8 (+2e-05) | 0.00077; 9.1e-05 |
| RM E57E06 fig. 6(b) | 49 | 0@612.4 (-0.02); 4@857.8 (+0.008); 8@1104.8 (+0.009); 12@1351.1 (+0.02); 16@1600.2 (-0.009); 20@1847.5 (-0.01) | 0.1@1840.7 (-0.0005); 0@2090.8 (+0.0007); -0.1@2336.1 (-7e-05); -0.2@2582.9 (-0.0002) | 0.011; 0.00034 |
| RM E57E06 fig. 7(a) | 50 | 17@547.9 (+0.003); 17.5@848.3 (+4e-05); 18@1146.8 (+0.0006); 18.5@1447.2 (-0.002); 19@1745.9 (-0.002); 19.5@2045.9 (-0.004); 20@2341.9 (+0.0005); 20.5@2638.3 (+0.004) | 0.04@690.6 (+6e-05); 0@989.1 (-8e-05); -0.04@1289.3 (-3e-06); -0.08@1589.1 (+3e-05) | 0.0028; 7e-05 |
| RM E57E06 fig. 8(a) | 52 | 0@715.1 (-0.0001); 0.04@896.3 (+0.0001); 0.08@1079.0 (+0.0001); 0.12@1262.4 (-0.0001); 0.16@1444.3 (+2e-05); 0.2@1626.7 (+5e-05); 0.24@1809.7 (-6e-05) | 1.2@332.4 (-0.001); 1@518.2 (+0.002); 0.8@698.5 (-0.0002); 0.6@879.8 (-0.002); 0.2@1247.7 (+0.001); 0@1429.3 (-0.0002) | 0.0001; 0.0012 |
| RM E57E06 fig. 8(b) | 52 | 0@703.2 (-0.0001); 0.04@884.4 (+0.0001); 0.08@1067.0 (+4e-05); 0.12@1249.6 (-4e-05); 0.16@1431.5 (+9e-06); 0.2@1613.6 (+5e-05); 0.24@1796.2 (-6e-05) | 1.2@1519.7 (-0.0006); 1@1702.6 (-0.0006); 0.8@1886.6 (+0.0005); 0.6@2068.4 (-0.0007); 0.4@2254.2 (+0.002); 0.2@2436.7 (+0.002); 0@2615.1 (-0.003) | 9e-05; 0.0015 |
| RM E57E06 fig. 14(a) | 60 | 0@436.5 (-0.0006); 0.2@650.3 (+0.0008); 0.4@866.3 (+2e-05); 0.6@1081.6 (-2e-05); 0.8@1297.0 (-0.0002); 1@1512.0 (+1e-05) | 0.08@920.6 (+0.0004); 0@1133.5 (-0.0008); -0.08@1352.7 (+0.0004); -0.16@1567.7 (+1e-06) | 0.00034; 0.00038 |
| RM E57E06 fig. 14(b) | 60 | 0@428.6 (-0.0003); 0.2@643.0 (+0.0005); 0.4@858.7 (-3e-05); 0.6@1073.9 (-8e-05); 0.8@1289.2 (-0.0002); 1@1504.0 (+0.0001) | 0.08@1671.0 (-0.0002); 0@1887.7 (+0.0003); -0.08@2101.9 (-8e-05); -0.16@2317.3 (-6e-05) | 0.00029; 0.00013 |
| RM E57E06 fig. 14(c) | 60 | 0@426.6 (-0.0003); 0.2@640.6 (+0.0005); 0.4@855.8 (+0.0001); 0.6@1071.1 (-0.0003); 0.8@1285.7 (-0.0001); 1@1500.2 (+0.0001) | 0@2426.5 (+9e-05); -0.04@2532.4 (-0.0002); -0.08@2639.7 (+9e-05) | 0.00037; 9.4e-05 |
| TN D-6789 fig. 5, M 1.83 | 21 | -0.2@584.5 (-0.0004); 0@810.5 (+0.0008); 0.2@1038.9 (-0.0001); 0.4@1265.9 (+0.0001); 0.6@1493.7 (-0.0003); 0.8@1721.7 (-0.0008); 1@1947.1 (+0.0008) | 0@821.9 (-0.0001); -0.05@931.0 (+4e-05); -0.1@1039.6 (-9e-05); -0.15@1149.9 (+0.0006); -0.2@1256.5 (-0.0004) | 0.00059; 0.00025 |
| TN D-6789 fig. 5, M 2.20 | 21 | -0.2@586.5 (+3e-05); 0@813.4 (+0.0005); 0.2@1042.0 (-0.0004); 0.4@1269.0 (-9e-05); 0.6@1496.5 (-0.0001); 0.8@1724.6 (-0.0007); 1@1950.4 (+0.0007) | 0@1476.7 (+0.0002); -0.05@1584.8 (-0.0003); -0.1@1694.7 (-2e-05); -0.15@1804.7 (+0.0003); -0.2@1913.0 (-0.0002) | 0.00058; 0.00016 |
| TN D-6789 fig. 12, l/dm 0.6 | 35 | 0.2@541.2 (+0.0005); 0.6@819.6 (-0.0001); 1@1097.7 (-0.0005); 1.4@1375.1 (+0.0002); 1.8@1653.7 (-0.0008); 2.2@1930.5 (+0.0007) | 0.2@(1700,430.0) (+1e-05); 0.15@(1700,562.0) (-0.0001); 0.1@(1700,695.0) (+0.0001); 0.05@(1700,827.5) (+0.0002); 0@(1700,959.0) (-0.0002); 0.2@(1925,431.0) (+1e-05); 0.15@(1925,563.0) (-0.0001); 0.1@(1925,696.0) (+0.0001); 0.05@(1925,828.0) (-2e-05); 0@(1500,958.5) (-1e-05) | 0.00067; 0.00011 |
| TN D-6789 fig. 12, l/dm 0.8 | 35 | 0.2@539.4 (+0.0006); 0.6@818.0 (-0.0002); 1@1096.2 (-0.0005); 1.4@1373.7 (+0.0003); 1.8@1652.5 (-0.0009); 2.2@1929.3 (+0.0008) | 0.15@(1700,1224.5) (+0.0002); 0.1@(1700,1357.0) (+0.0001); 0.05@(1700,1489.5) (+6e-05); 0@(1700,1622.0) (-2e-05); 0.2@(1925,1093.0) (+1e-05); 0.15@(1925,1225.5) (-6e-05); 0.1@(1925,1358.0) (-0.0001); 0@(1500,1620.5) (-2e-05); 0.15@(1500,1222.0) (-0.0002) | 0.00071; 0.00011 |
| TN D-6789 fig. 12, l/dm 1.0 | 35 | 0.2@540.7 (+0.0004); 0.6@819.4 (-0.0002); 1@1097.7 (-0.0003); 1.4@1375.5 (+0.0003); 1.8@1654.7 (-0.001); 2.2@1931.7 (+0.0008) | 0.25@(1700,1753.5) (-3e-05); 0.2@(1700,1886.0) (+6e-06); 0.15@(1700,2018.5) (+4e-05); 0.1@(1700,2150.5) (-0.0001); 0.05@(1700,2283.5) (+0.0001); 0@(1700,2415.5) (-3e-05); 0.25@(1925,1754.0) (+3e-05); 0.2@(1925,1886.0) (-0.0001); 0.15@(1925,2019.0) (+0.0001); 0.1@(1925,2151.0) (-4e-05); 0.05@(1925,2284.0) (+0.0002); 0@(1925,2415.5) (-0.0002) | 0.00061; 9.9e-05 |
| TN D-6789 fig. 18, M 1.83 | 47 | 0@965.6 (+1e-05); 0.4@1401.7 (+0.0002); 0.6@1620.1 (-4e-05); 0.8@1838.7 (-0.0004); 1@2056.6 (-0.0001); 1.2@2274.2 (+0.0003); 1.4@2492.8 (-3e-05) | 0.1@495.6 (-0.0001); 0@723.6 (+0.0002); -0.1@950.7 (+2e-05); -0.2@1177.9 (-7e-05) | 0.00036; 0.00014 |
| TN D-6789 fig. 18, M 2.20 | 47 | 0@964.8 (+0.0009); 0.2@1185.3 (-0.0009); 0.4@1402.5 (+0.0001); 0.6@1621.4 (-0.0003); 0.8@1839.5 (-9e-05); 1@2057.9 (-4e-05); 1.2@2276.1 (+0.0001); 1.4@2494.3 (+0.0002) | 0@1403.3 (-0.0001); -0.1@1630.9 (+0.0002); -0.2@1856.8 (-0.0001) | 0.0007; 0.00019 |
| TN D-6789 fig. 20 | 49 | 0.2@547.0 (-0.0001); 0.4@765.7 (+0.0002); 0.6@984.3 (+0.0007); 0.8@1203.7 (+0.0003); 1@1423.3 (-0.0001); 1.2@1643.0 (-0.0007); 1.4@1862.1 (-0.0008); 1.6@2080.6 (-0.0003); 1.8@2299.4 (-2e-05); 2@2518.3 (+6e-05); 2.2@2736.6 (+0.0008) | 0.3@533.5 (-0.0001); 0.25@760.1 (+5e-06); 0.2@986.8 (+0.0001); 0.15@1212.1 (-5e-05); 0.1@1438.9 (+0.0001); 0.05@1665.0 (+0.0001); 0@1889.8 (-0.0002) | 0.00047; 9.2e-05 |
| TM X-1960 fig. 5(c) | 34 | -0.1@692.4 (-0.0009); 0@790.3 (+0.001); 0.1@892.0 (-0.0002); 0.2@991.4 (+0.0005); 0.3@1092.7 (-0.0006); 0.4@1192.3 (-0.0001); 0.5@1292.8 (-0.0004); 0.6@1392.2 (+0.0003); 0.7@1492.3 (+0.0003); 0.8@1592.7 (+0.0001); 0.9@1693.2 (-0.0002) | -0.05@1148.5 (+7e-05); -0.1@1248.6 (-8e-05); -0.15@1349.3 (+6e-05); -0.2@1449.4 (-0.0001); -0.25@1550.3 (+0.0001); -0.3@1650.4 (-6e-05); -0.35@1751.0 (+5e-05) | 0.00044; 0.00011 |
| TM X-1960 fig. 6(c) | 37 | 0@877.0 (+0.0003); 0.1@1052.6 (-0.0004); 0.2@1226.6 (-8e-05); 0.3@1400.7 (+0.0002); 0.4@1575.6 (-8e-05); 0.5@1749.9 (+4e-05) | -0.1@1222.4 (+0.0002); -0.2@1397.2 (-0.0002); -0.3@1572.7 (-8e-05); -0.4@1748.1 (-8e-05); -0.5@1923.9 (+0.0001) | 0.00024; 0.00011 |
| TM X-1960 fig. 7(a) (page rotated 90 deg cw) | 38 | 0.2@845.5 (-0.0003); 0.3@1033.4 (+0.0002); 0.4@1222.2 (+0.0002); 0.5@1411.4 (-0.0001); 0.6@1600.0 (-5e-05); 0.7@1788.3 (+0.0002); 0.8@1977.2 (+7e-05); 0.9@2166.1 (+2e-05); 1@2354.9 (-2e-05); 1.1@2543.8 (-0.0001); 1.2@2732.6 (-0.0002); 1.3@2920.7 (+0.0001) | 0@1735.2 (+0.0003); 0.04@1544.7 (-0.0002); 0.08@1356.5 (-0.0002); 0.12@1168.9 (+2e-05); 0.16@980.5 (+2e-05); 0.2@792.1 (+4e-05); 0.24@603.4 (-4e-05); 0.28@415.1 (-5e-06); 0.32@227.0 (+5e-05) | 0.00014; 0.00014 |
| TM X-1960 fig. 7(b) (rotated) | 39 | 0.3@1097.5 (+0.0001); 0.4@1286.7 (+3e-06); 0.5@1476.2 (-0.0002); 0.6@1665.1 (-0.0001); 0.7@1853.5 (+0.0002); 0.8@2042.8 (+7e-05); 0.9@2231.8 (+7e-05); 1@2421.0 (+2e-06); 1.1@2610.2 (-6e-05); 1.2@2799.1 (-2e-05) | 0.04@1726.4 (+2e-05); 0.08@1538.2 (+4e-05); 0.12@1349.2 (-0.0001); 0.16@1161.1 (-6e-05); 0.2@973.9 (+0.0002); 0.24@784.4 (-8e-05) | 0.0001; 0.00011 |
| TM X-1960 fig. 7(c) (rotated) | 40 | 0.3@1014.9 (+3e-05); 0.4@1203.7 (+2e-05); 0.5@1392.9 (-0.0002); 0.6@1581.4 (-4e-05); 0.7@1769.8 (+0.0002); 0.8@1958.7 (+8e-05); 0.9@2147.5 (+5e-05); 1@2336.4 (+8e-06); 1.1@2525.2 (-6e-05); 1.2@2714.0 (-5e-05) | 0.04@1545.9 (-8e-07); 0.08@1357.3 (-8e-05); 0.12@1169.4 (+5e-07); 0.16@981.6 (+7e-05); 0.2@793.9 (+0.0002); 0.24@604.0 (-0.0002) | 9.1e-05; 0.00012 |
| TM X-1960 fig. 7(d) (rotated) | 41 | 0.3@1070.8 (+0.0001); 0.4@1259.9 (+8e-05); 0.5@1449.3 (-0.0002); 0.6@1638.2 (-0.0001); 0.7@1827.0 (+2e-05); 0.8@2016.1 (-5e-05); 0.9@2204.9 (+6e-05); 1@2393.9 (+5e-05); 1.1@2583.1 (-6e-05); 1.2@2771.8 (+5e-05) | 0.04@1599.2 (-8e-05); 0.08@1411.8 (+7e-05); 0.12@1223.6 (+5e-05); 0.16@1034.9 (-7e-05); 0.2@847.8 (+0.0001); 0.24@658.5 (-0.0001) | 9.1e-05; 0.00011 |
| TM X-1960 fig. 11 (rotated) | 48 | 0.4@957.8 (+0.0002); 0.5@1180.8 (-4e-05); 0.6@1403.4 (-0.0002); 0.7@1625.6 (-9e-05); 0.8@1847.7 (+2e-05); 0.9@2070.3 (-0.0001); 1@2292.7 (-0.0001); 1.1@2514.3 (+0.0002); 1.2@2737.0 (+4e-05) | 0.04@1439.4 (-1e-06); 0.08@1218.2 (-3e-05); 0.12@997.8 (+7e-05); 0.16@776.1 (-4e-05) | 0.0001; 5.8e-05 |
| TM X-1960 fig. 18, M 1.20 panel | 83 | 0@862.5 (+0.0003); 0.2@1015.3 (+0.0002); 0.4@1168.0 (+0.0002); 0.6@1321.2 (-0.0005); 0.8@1474.0 (-0.0007); 1@1626.7 (-0.0007); 1.2@1778.0 (+0.001) | -0.1@2114.6 (+2e-05); -0.2@2267.9 (-4e-05); -0.3@2421.4 (+2e-05) | 0.0006; 4e-05 |
| TN D-6789 fig. 7(a), l/dm 0.6 | 23 | -0.2@499.6 (-0.0006); 0@678.1 (+0.001); 1@1579.5 (-0.0003); 0.2@859.0 (+0.0001); 0.4@1040.0 (-0.001); 0.6@1219.1 (+9e-05); 0.8@1398.6 (+0.0006) | 0.1@615.1 (-0.0001); 0@787.9 (+0.0002); -0.1@959.7 (-0.0001) | 0.00059; 0.00021 |
| TN D-6789 fig. 7(a), l/dm 0.8 | 23 | -0.2@501.2 (-0.0003); 0@680.5 (+0.0005); 1@1581.1 (-0.0005); 0.2@861.0 (-0.0002); 0.4@1041.2 (-0.0004); 0.6@1220.5 (+0.0003); 0.8@1400.2 (+0.0006) | 0.1@1132.9 (+0.0002); 0@1306.3 (-0.0003); -0.1@1481.4 (+0.0002) | 0.00044; 0.00035 |
| TN D-6789 fig. 7(a), l/dm 1.0 | 23 | -0.2@500.4 (+7e-06); 0@680.6 (+0.0002); 1@1583.0 (-0.0006); 0.2@861.3 (-0.0002); 0.4@1041.9 (-0.0005); 0.6@1221.7 (+0.0001); 0.8@1401.3 (+0.0009) | 0.1@1656.1 (+1e-05); 0@1829.5 (-3e-05); -0.1@2003.1 (+1e-05) | 0.00052; 3.6e-05 |
| TN D-6789 fig. 7(b), l/dm 0.6 | 24 | -0.2@574.4 (-0.0001); 1@1655.2 (+0.0001); 0.2@934.5 (+0.0001); 0.4@1114.5 (+0.0004); 0.6@1295.2 (-0.0003); 0.8@1475.3 (-0.0002) | 0.1@612.5 (+0.0001); 0@788.2 (-0.0002); -0.1@965.2 (+0.0001) | 0.0002; 0.00034 |
| TN D-6789 fig. 7(b), l/dm 0.8 | 24 | -0.2@573.2 (-0.0003); 1@1651.6 (-0.0003); 0.2@932.3 (+0.0002); 0.4@1111.8 (+0.0004); 0.6@1292.1 (-0.0002); 0.8@1471.4 (+0.0002) | 0.1@1141.9 (-0.0001); 0@1320.7 (+0.0003); -0.1@1498.2 (-0.0001) | 0.00035; 0.00029 |
| TN D-6789 fig. 7(b), l/dm 1.0 | 24 | -0.2@567.5 (+6e-05); 0@747.6 (-0.0002); 1@1646.7 (+0.0002); 0.2@927.2 (+0.0001); 0.4@1106.9 (+0.0004); 0.6@1287.4 (-0.0003); 0.8@1467.3 (-0.0003) | 0.1@1676.2 (+6e-05); 0@1852.8 (-0.0001); -0.1@2030.1 (+6e-05) | 0.00024; 0.00035 |
| TN D-6789 fig. 7(c), l/dm 0.6 | 25 | -0.2@488.3 (+0.0001); 0@668.7 (+0.0004); 1@1571.3 (+0.0006); 0.2@849.5 (+2e-05); 0.4@1030.7 (-0.0006); 0.6@1210.9 (-0.0002); 0.8@1391.5 (-0.0002) | 0.1@691.9 (+0.0003); 0@862.2 (-0.0007); -0.1@1036.0 (+0.0003) | 0.00041; 0.00032 |
| TN D-6789 fig. 7(c), l/dm 0.8 | 25 | -0.2@489.5 (+0.0002); 0@669.7 (+0.0003); 1@1571.4 (+0.0004); 0.2@850.6 (-0.0003); 0.4@1030.9 (-0.0002); 0.6@1211.5 (-0.0005); 0.8@1391.2 (+0.0002) | 0.1@1209.8 (+0.0001); 0@1382.5 (-0.0003); -0.1@1556.5 (+0.0001) | 0.00044; 0.0003 |
| TN D-6789 fig. 7(c), l/dm 1.0 | 25 | -0.2@487.8 (+0.0005); 0@668.8 (+7e-05); 1@1571.4 (+0.001); 0.2@849.6 (-3e-05); 0.4@1030.7 (-0.0005); 0.6@1211.6 (-0.0007); 0.8@1392.0 (-0.0004) | 0.1@1732.3 (+3e-06); 0@1903.4 (-7e-06); -0.1@2074.6 (+3e-06) | 0.00056; 0.00057 |
| TN D-6789 fig. 7(d), l/dm 0.6 | 26 | -0.2@576.6 (-0.0005); 0@757.0 (+0.0003); 1@1663.1 (-0.0005); 0.2@938.5 (-0.0002); 0.4@1119.1 (+0.0003); 0.6@1299.7 (+0.0009); 0.8@1481.8 (-0.0002) | 0.2@405.4 (+0.0002); 0.1@580.7 (-0.0001); 0@756.3 (-0.0003); -0.1@933.3 (+0.0003) | 0.00049; 0.00045 |
| TN D-6789 fig. 7(d), l/dm 0.8 | 26 | -0.2@566.5 (-0.0002); 0@747.1 (+6e-05); 1@1651.9 (-0.0005); 0.2@928.2 (-0.0002); 0.4@1108.8 (+3e-05); 0.6@1289.0 (+0.0008); 0.8@1470.5 (+8e-05) | 0.2@1110.5 (-0.0001); 0.1@1287.8 (-0.0001); 0@1466.3 (+0.0006); -0.1@1642.1 (-0.0003) | 0.00049; 0.00034 |
| TN D-6789 fig. 7(d), l/dm 1.0 | 26 | -0.2@556.4 (-0.0005); 0@736.2 (+0.0006); 1@1640.8 (-0.0001) | 0.2@1818.6 (+7e-05); 0.1@1995.2 (-6e-05); 0@2172.0 (-9e-05); -0.1@2349.1 (+8e-05) | 0.00046; 0.0001 |
| TN D-6789 fig. 7(e), l/dm 0.6 | 27 | -0.2@511.8 (+0.0002); 0@691.8 (+0.0007); 1@1594.7 (+0.0004); 0.2@873.5 (-0.0005); 0.4@1054.2 (-0.0008); 0.6@1234.4 (-0.0004); 0.8@1414.3 (+0.0003) | 0.1@351.8 (+9e-05); 0@523.9 (+1e-05); -0.1@695.6 (-0.0003); -0.2@868.7 (+0.0002) | 0.00055; 0.00016 |
| TN D-6789 fig. 7(e), l/dm 0.8 | 27 | -0.2@513.0 (+0.0002); 0@693.0 (+0.0008); 1@1596.0 (+0.0004); 0.2@874.8 (-0.0006); 0.4@1055.7 (-0.001); 0.6@1235.6 (-0.0003); 0.8@1415.4 (+0.0005) | 0.1@1041.0 (-0.0002); 0@1215.5 (+0.0003); -0.1@1388.5 (-2e-05); -0.2@1561.9 (-0.0001) | 0.00058; 0.00013 |
| TN D-6789 fig. 7(e), l/dm 1.0 | 27 | -0.2@512.1 (+0.0002); 0@692.9 (+0.0001); 1@1596.3 (-1e-06); 0.2@873.7 (-0.0001); 0.4@1054.8 (-0.0006); 0.6@1235.1 (-0.0001); 0.8@1415.2 (+0.0005) | 0.2@1735.7 (-7e-05); 0@2080.6 (-5e-05); -0.1@2253.8 (+0.0004); -0.2@2425.2 (-0.0003) | 0.00032; 0.00021 |
| TN D-6789 fig. 7(f), l/dm 0.6 | 28 | -0.2@555.8 (-0.001); 0@734.5 (+0.0008); 1@1639.2 (-0.0009); 0.2@915.6 (+0.0002); 0.4@1095.9 (+0.0007); 0.6@1276.4 (+0.0008); 0.8@1458.0 (-0.0002) | 0.1@472.6 (-0.0003); 0@650.4 (+0.0005); -0.1@825.5 (-0.0001); -0.2@1001.8 (-0.0001) | 0.00085; 0.00072 |
| TN D-6789 fig. 7(f), l/dm 0.8 | 28 | -0.2@544.7 (-0.0003); 0@725.2 (+1e-05); 1@1629.4 (-0.0005); 0.2@906.2 (-0.0002); 0.4@1086.2 (+0.0006); 0.6@1267.0 (+0.0005); 0.8@1448.3 (-0.0001) | 0.1@1178.6 (-0.0004); 0@1357.6 (+0.0005); -0.1@1534.4 (+0.0002); -0.2@1710.8 (-0.0003) | 0.00039; 0.00042 |
| TN D-6789 fig. 7(f), l/dm 1.0 | 28 | -0.2@535.9 (-0.0005); 0@716.0 (+0.0002); 1@1620.6 (-0.0006); 0.2@897.1 (-0.0002); 0.4@1077.2 (+0.0006); 0.6@1258.0 (+0.0006); 0.8@1439.4 (-0.0001) | 0.1@None; 0@None; -0.1@(560,2242.5),(700,2244.4); -0.2@(560,2419.4),(700,2421.0) | 0.00042; 0.00026 |

## 10. Judgement calls, collected

1. Resolution: native 300 ppi scans rendered at 300 dpi; enlargement only for viewing.
2. Calibration by traced gridlines and an affine fit over all intersections, not by tick labels alone; lines that could not be traced were dropped (section 9).
3. RM L54I22 fig. 2 x axis calibrated on .86 to 1.00, ignoring the inconsistent .80/.82 labels; shift of -0.0200 given as the alternative in every note.
4. RM L54I22 fig. 2: a partly hidden rear symbol counts as a point only when its own arc or centre dot shows; thick outlines alone do not.
5. RM L54C16 fig. 5(a): the filled triangle is read at its vertex centroid; bounding-box centre and an inner pinhole are alternatives.
6. Symbols drawn across a frame line are read from their visible strokes (RM L54C16, TN D-6789 fig. 20 at M 2.2, TM X-1960 fig. 7 at M 1.30).
7. Clusters of six meridian symbols (TN D-6789 fig. 5, TM X-1960 fig. 5(c)): a symbol is read only when its own outline is found (coverage 0.95 or more and centre spread 4 px or less); the rest are `illegible`.
8. TN D-6789 fig. 7: the jet-off circle is taken to lie in the lowest symbol stack at each station; its centre range is the stack shortened by the circle's half-height; 8 px or less gives a midpoint (`ambiguous`, ends as alternatives), more gives `illegible`.
9. TN D-6789 fig. 12: symbols assigned to beta by vertical order in each Mach column, checked by shape.
10. RM E57E06 fig. 6: read although no point is marked jet off, because the brief and addendum item 4 ask for every point of the strut comparison; every row flagged with the jet state.
11. RM E57E06 fig. 14: open symbols = behind struts, solid = 90 deg from struts (legend); the model is not identified (text says all 5.63 deg boattails tested).
12. Right-triangle and quarter-circle symbols: centre of the bounding square, centroid as alternative.
13. TM X-1960 fig. 18: squares whose edges lie on gridlines were placed by hand from their visible sides; error 3 px.
14. TM X-1960 fig. 11 is read as a further figure against Mach number (its coefficients include the base, said in y_quantity); figures 8, 9 and 10 have no points.
15. Geometry: values are as printed; derived numbers (lengths by subtraction, x/L from Z) are marked "derived" or "computed" in the note. Where the report does not say whether a cone angle is a half-angle (RM L54I22 "20 deg conical nose", RM E57E06 "8 deg cone"), I give the printed value and my inference from the drawing, marked as inference.
16. Strut positions not dimensioned in the text (RM L54I22 wing struts) were scaled from the sketch and marked as scaled.
