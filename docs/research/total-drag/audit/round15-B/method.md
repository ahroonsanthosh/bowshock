# Method: blind reading of RM A51J11 figs. 14 and 15 and RM A52E01 fig. 8 (a) and (b), reader B

Plain text notes. Everything here was done in the folder
`/tmp/claude-0/-home-user-bowshock/dd60fc51-836c-5183-86f3-15ab54467394/scratchpad/te15/B/`.
Nothing was committed or pushed anywhere (the coordinator told me not to commit).

## 1. What I opened

- The brief `te15/reader-brief.md`. Nothing else in the scratchpad, no repository file, no git branch, no other
  reader's folder (I never opened `te15/A/`).
- The two PDFs, downloaded from the brief's NTRS URLs into `src_a51/` and `src_a52/`. SHA-256 checked:
  - RM A51J11 (NTRS 19930087063, 44 pages): `e6b779125d8359e968ad6b4d2b2c43d651ef5024f42bdb5574a6f7b93a8fdf57`, matches.
  - RM A52E01 (NTRS 19930087008, 35 pages): `3f090609fb3a170703523cc14f26aa9cab55e6afe4718b397b289bbcf33efe54`, matches.
- Text I read in the reports: title pages; NOTATION (A51J11 pages 3 and 4, A52E01 pages 3 and 4; I looked at the
  A51J11 P_b line and the A52E01 notation list on low-resolution renders of PDF page 4 of each); APPARATUS AND MODELS,
  TESTS and CORRECTIONS of A51J11; APPARATUS, Models (with the dimension table on PDF page 6), TESTS AND PROCEDURE and
  Reduction of Data of A52E01 (PDF page 7 render for the wall correction formula); and the four figure pages with
  their captions and legends.
- Disclosure of incidental exposure. To find the section headings I ran pdftotext on each whole PDF (files
  `work/a51.txt`, `work/a52.txt`) and printed only heading lines and the allowed sections. Two keyword greps printed a
  few single lines from other sections: from A52E01 one line of the SUMMARY ("Results of the investigation show that
  employment of blunt trailing"), one of the INTRODUCTION, and two of RESULTS AND DISCUSSION ("trailing-edge
  thickness which the results", "shown by figure 5, merit a brief discussion"); from A51J11 two lines of the
  INTRODUCTION ("slope increased at Mach numbers where the lift-curve slope decreased", "airfoil was not one of the
  optimum sections derived in reference 1"). None of these lines carries a base pressure value and none was used.
  I did not read the SUMMARY, RESULTS AND DISCUSSION or CONCLUSIONS / CONCLUDING REMARKS sections.

## 2. Images read

- A51J11 PDF pages 36 (fig. 14) and 37 (fig. 15): each page holds one 2344 x 3096 px RGB JPEG scan at 300 dpi.
  Rendered with `pdftoppm -r 600` to 4692 x 6200 px PNG (exactly 2x the scan). All readings are on these renders.
- A52E01 PDF pages 29 (fig. 8 (a)) and 30 (fig. 8 (b)): each page is a stack of 1-bit CCITT strips at 240 dpi (the
  page is landscape; pdftoppm applies the rotation). Rendered with `pdftoppm -r 480` (2x the scan) to 4927 x 4134 px
  and 4880 x 4080 px. The strip boundaries show as one white render row every 424 rows; they split some dashes in two
  (I joined such pieces in the curve chains, see section 6).

## 3. Calibration (all panels)

Script `scripts/calib.py` (driven by `scripts/cal_a51.py` and `scripts/cal_a52.py`).

- For each panel I gave rough positions of every grid line (from a dark-pixel projection). Each line was then
  refined in short bands along its length (40 px bands on figs. 14 and 15, 30 px on fig. 8): in each band the
  centroid of the ink profile across the line; a straight line was fitted through the band centroids with
  iterative rejection of bands spoiled by curves or lettering. So each grid line has its own position and tilt.
- Every vertical line was intersected with every horizontal line, and an affine map (6 parameters) from render
  pixels to plot units was fitted to all intersections by least squares. The affine map takes out scan rotation,
  skew (non-orthogonal grid) and unequal x and y scales.
- Values of grid lines: fig. 14 Mach 0.5 to 1.2 every 0.05 (labels every 0.1), P_b 0 to -1.2 every 0.2 (labels
  0, -.4, -.8, -1.2); fig. 15 2y/b 0 to 1.0 every 0.1 (labels every 0.2), P_b as fig. 14; fig. 8 x 0 to -0.8 every
  0.1 (labels every 0.2), alpha 0 to 16 every 2 (labels 0 to 14, top frame 16). Unlabelled lines take their values
  from the even spacing between labelled lines; every panel has at least three labelled lines on each axis.
- Checks: per-line mean residual and a leave-one-line-out test (refit without one grid line, predict it). The CSV
  headers list every line's residual. Summary (scale, rotation, skew, rms residual x / y, worst leave-one-out x / y):

| panel | x per render px | y per render px | rotation deg | skew deg | rms x / y | worst LOO x / y |
| --- | --- | --- | --- | --- | --- | --- |
| f14 top (h/t 1.0) | 0.000279 M | 0.00113 P_b | -0.58 | -0.50 | 0.0004 / 0.0010 | 0.0021 / 0.0050 |
| f14 mid (h/t 0.6) | 0.000279 M | 0.00112 P_b | -0.41 | -0.29 | 0.0003 / 0.0013 | 0.0009 / 0.0054 |
| f14 bot (h/t 0.3) | 0.000280 M | 0.00112 P_b | -0.34 | -0.28 | 0.0003 / 0.0015 | 0.0011 / 0.0070 |
| f15 top | 0.000530 2y/b | 0.00106 P_b | -0.20 | +0.26 | 0.0005 / 0.0017 | 0.0014 / 0.0061 |
| f15 mid | 0.000530 2y/b | 0.00106 P_b | -0.21 | +0.08 | 0.0006 / 0.0017 | 0.0019 / 0.0039 |
| f15 bot | 0.000530 2y/b | 0.00107 P_b | -0.27 | +0.01 | 0.0006 / 0.0009 | 0.0021 / 0.0034 |
| 8a M=0.6 | 0.000815 | 0.0158 deg | -0.09 | +0.16 | 0.0013 / 0.016 | 0.0031 / 0.040 |
| 8a M=0.7 | 0.000821 | 0.0158 deg | -0.15 | +0.01 | 0.0014 / 0.015 | 0.0064 / 0.037 |
| 8a M=0.8 | 0.000814 | 0.0158 deg | -0.16 | +0.05 | 0.0009 / 0.019 | 0.0038 / 0.051 |
| 8a M=0.9 | 0.000817 | 0.0159 deg | -0.19 | -0.03 | 0.0014 / 0.011 | 0.0041 / 0.031 |
| 8a M=0.925 | 0.000824 | 0.0158 deg | -0.27 | -0.06 | 0.0017 / 0.030 | 0.0059 / 0.105 |
| 8a M=1.2, 1.4, 1.7 | 0.000816 | 0.0158 deg | -0.26 | -0.07 | 0.0009 / 0.020 | 0.0041 / 0.068 |
| 8b M=0.6 | 0.000813 | 0.0157 deg | -0.46 | +0.04 | 0.0014 / 0.013 | 0.0038 / 0.033 |
| 8b M=0.7 | 0.000811 | 0.0158 deg | -0.36 | +0.02 | 0.0009 / 0.020 | 0.0026 / 0.093 |
| 8b M=0.8 | 0.000810 | 0.0158 deg | -0.28 | -0.03 | 0.0013 / 0.026 | 0.0054 / 0.072 |
| 8b M=0.9 | 0.000810 | 0.0157 deg | -0.46 | +0.00 | 0.0014 / 0.022 | 0.0055 / 0.073 |
| 8b M=0.925 | 0.000810 | 0.0157 deg | -0.36 | -0.00 | 0.0013 / 0.039 | 0.0034 / 0.123 |
| 8b M=1.2, 1.4, 1.7 | 0.000809 | 0.0158 deg | -0.34 | -0.03 | 0.0011 / 0.034 | 0.0032 / 0.124 |

  The worst leave-one-out values are on frame lines (thicker, drawn slightly off the grid paper spacing) and on
  lines crossed by the M = 0.925 legend box. The fig. 14 grid is visibly non-orthogonal (skew up to 0.5 deg).

## 4. Legends and labels as printed

- RM A51J11 fig. 14: three panels labelled "h/t, 1.0", "h/t, 0.6", "h/t, 0.3". Legend in the top panel: solid line
  "Without surface roughness", dashed line "With surface roughness". Axes "Mach number, M" and "Base pressure
  coefficient, P_b"; NOTATION P_b = (p_b - p)/q. Caption: "The variation of base pressure coefficient with Mach number
  at semispan station 2y/b, 0.25. Angle of attack, 0 deg." No plotted symbols.
- RM A51J11 fig. 15: panels "h/t, 1.0", "h/t, 0.6", "h/t, 0.3"; in each, labels under "M": "0.98", ".80", "1.06",
  ".60" with leader lines to the curves. Line styles (top and middle panels): 0.98 long dash, .80 short dash, 1.06
  long-and-short dash, .60 solid. Axes "Semispan station, 2y/b" and "Base pressure coefficient, P_b". Caption: "The
  variation of base pressure coefficient with semispan station, 2y/b. Angle of attack, 0 deg." No symbols.
- RM A52E01 fig. 8: legend in the M=0.925 panel of each page: "Wing 2" long-dash line, "Wing 3" short-dash line,
  "Wing 4" long-and-short-dash line, each with a section sketch. Panels "M=0.6", "M=0.7", "M=0.8", "M=0.9",
  "M=0.925", "M=1.2, 1.4, 1.7" (in the last, labels "1.7", "1.4", "1.2" with arrows to the curves). Axes "Pressure
  coefficient, (P_b-P_0)/q" and "Nominal angle of attack, alpha, degrees". Captions "(a) Reynolds number, 1.5
  million." and "(b) Reynolds number, 3.8 million."; "Figure 8.- Comparison of wing base pressure coefficients for
  three types of trailing-edge bluntness." and on page 30 "Figure 8.- Concluded." No symbols.
- Stated uncertainty: none in the captions or in the sections I read. Model geometry and test conditions are copied
  into each CSV header.

## 5. Reading figs. 14 and 15 (curves only)

Scripts `scripts/trace.py`, `scripts/curves.py`, `scripts/run_trace.py`, `scripts/readx.py`, configs
`scripts/cfg_f14.py`, `scripts/cfg_f15.py`.

- Ink: gray value below 110 counts as ink, weight max(0, 140 - gray). Grid lines on these scans are lighter
  (cores about 100 to 135) than the drawn curves (cores about 35 to 80), so runs whose darkest pixel is above 92 (88
  on fig. 15) are dropped as grid ink; I also skip scan columns within 6 render px of a vertical grid line.
- Dense trace: along every render pixel column (line of constant Mach or 2y/b, using the affine map), the ink is
  split into runs and the weighted centroid of each run is the stroke centre. Each curve has a coarse guide polyline
  that I wrote from my own run listings (`scripts/listruns.py`); at each column the run nearest the guide (within a
  tolerance that shrinks where two guides are close) is given to that curve.
- Merged ink: a run claimed by two curves is shared. If it is no wider than 1.3 single stroke widths it is given to
  the continuous (solid) curve and marked as overlapped; inside zones where the two curves run parallel within a
  stroke width (fig. 14 top 0.59 to 0.65, bottom 0.59 to 0.815 and 0.925 to 0.993; fig. 15 bottom 2y/b 0.33 to 0.69
  and 0.725 to 0.79) a wider shared run is split by its edges: each curve's centre is the outer edge of the merged
  run less half a single stroke width (single width measured on nearby unshared runs). These rows are flagged,
  basis bound, with 0.3 stroke width added.
- Value at a target abscissa: straight-line fit through the curve's own stroke centres within +-6 px when it has ink
  within 1.5 px of the target; otherwise across the gap (dash gap or skipped grid column) with a straight line (8 px
  window) or a quadratic (14 to 45 px windows), needing at least two centres on each side.
- Targets: fig. 14 every 0.01 in Mach between the drawn ends, plus both ends. Fig. 15 the orifice stations 0.25,
  0.375, 0.625, 0.875 where drawn (rows noted "orifice station"), plus every 0.05 from 0.25 to 0.85 to show the
  faired shape, plus both ends. Where a curve stops just short of a station (by less than its end-cap error), that
  station has no row and the curve_end row stands for it.
- Ends: from the traced end, I step outward one column at a time without grid exclusion until no dark ink remains;
  the end is the centre of the round end cap, half a stroke width inside the outermost ink. Most fig. 14 curves
  start on the M = 0.60 grid line and most fig. 15 curves start near 2y/b 0.25 and end near 0.875.
- Errors (2 sigma): x_err = 2 x calibration rms in x. y_err = 2 x sqrt(calibration rms in y squared + standard
  error of the local fit squared + (1.5 render px placement)^2 + (0.1 x gap length in px)^2 for gap reads +
  (slope x x uncertainty)^2). Bounds (merged ink) add 0.3 stroke width; boxes give the merged run less 0.35 stroke
  width each side plus the 2 sigma terms.

## 6. Reading fig. 8 (curves only)

Scripts `scripts/comp8.py`, `scripts/dashes8.py`, `scripts/read8.py`, `scripts/zoom8.py`, config `scripts/cfg_f8.py`.

- Ink is gray below 128 (the scan is 1-bit). The fitted grid lines are masked (half width 5.5 render px inside the
  frame, 7.5 for the frame). The remaining ink is split into 8-connected pieces. For each panel I looked at a
  colour image of the pieces with their id numbers, at 1x to 5x zooms of the original with 0.01 and 0.25 deg tick
  marks, and assigned pieces to curves in order along each curve (chains). Grid slivers (pieces one pixel wide)
  and isolated specks were left out. Pieces cut by a masked grid line or a scan strip boundary are consecutive
  members of the same chain.
- Wing identity: by line style against the legend. `dashes8.py` joins consecutive pieces where the raw ink between
  them is continuous and lists stroke and gap lengths. Short uniform dashes (about 25 to 45 px) = wing 3; long
  uniform dashes (about 80 to 110 px on the curves, 64 px in the legend) = wing 2; long and short alternating
  (about 90 and 45 px) = wing 4. Calls I was unsure of are flagged on every row of that curve (section 8).
- Target alphas: every 1 deg where that gives at least 8 rows, else every 0.5 deg, between the curve's lowest and
  highest drawn alpha. At each target I sample the curve's own pieces along the line alpha = const (0.25 px steps,
  nearest pixel): each run of ink (runs closer than 3 px merged) gives one row at its centre. If the target falls in
  a gap between two consecutive pieces, x is read on the straight line joining the facing piece ends (end = centroid
  of the ink within 4 px of the piece's extreme pixel). A gap reading is dropped when the curve also has ink within
  30 px at that alpha. Where a curve folds back in alpha (hooks near alpha 0 to 1), each crossing is a row with a
  "branch k of n" note.
- Ends: outer end of the first and last piece. If it lies at a grid line or the frame the note says the ink may go
  on under that line, and the error becomes a bound covering the line.
- alpha = 0 (curve_at_zero): where the end of a curve lies within 11.5 px of the bottom frame centre, x is carried
  from the visible end to alpha 0 along the end piece's direction (bound includes the carry). Where the end stops
  12 to 15.5 px above the frame centre (a gap of only a few px to the frame edge) the row is given and flagged with
  that caveat. Otherwise the row has no x and says the curve does not reach alpha 0, giving its lowest alpha.
- Merged ink with grid lines, arrows or other curves: where a stroke edge touches a masked vertical grid line the
  row is flagged ("stroke partly under the grid line") with 4 px added (bound). Where a curve runs along a vertical
  grid line, or under a label arrow head, I give box rows: the raw ink run (grid line included) nearest a stated
  anchor x at that alpha, less 0.35 stroke width each side, as a bound; on an even alpha (a horizontal grid line) the
  run is taken 0.17 deg above and below and united. Each box anchor and alpha range is my call, listed in
  `scripts/cfg_f8.py` and in section 8.
- Errors: x_err (2 sigma) = 2 x sqrt(calibration rms x^2 + (2 render px = 1 scan px)^2 + (0.15 x gap px)^2 +
  (dx/dalpha x calibration rms in alpha)^2 + (dx/dalpha x 0.5 px)^2); bounds as above. y_err = 2 x calibration rms in
  alpha (alpha is set by me), except ends. Where dx/dalpha exceeds 0.05 per deg (curve nearly level) the row is
  flagged and x_err is large.

## 7. Counts (rows per series and panel)

File totals: `readings/a51j11_fig14.csv` 309 rows (74 flagged); `readings/a51j11_fig15.csv` 208 rows (61 flagged);
`readings/a52e01_fig8a.csv` 317 rows (191 flagged); `readings/a52e01_fig8b.csv` 276 rows (171 flagged). There are no
symbol rows (no symbols are plotted in any of the four panels).

Per series (kinds; then the flagged rows by abscissa for figs. 14 and 15, by alpha for fig. 8; suffix e = end,
b = box, z = alpha 0 row): see the list in `work/counts.txt`, copied here.

```
== a51j11_fig14.csv 309 rows, 74 flagged
  h/t, 1.0; Without surface roughness: curve_end 2, curve 50; flagged 7: 0.6001e 0.6 0.61 0.62 0.63 0.64 0.98
  h/t, 1.0; With surface roughness: curve_end 2, curve 51; flagged 7: 0.6001e 0.6 0.61 0.62 0.63 0.64 0.98
  h/t, 0.6; Without surface roughness: curve_end 2, curve 49; flagged 3: 0.89 0.9 0.99
  h/t, 0.6; With surface roughness: curve_end 2, curve 47, box 1; flagged 3: 0.89 0.9b 0.99
  h/t, 0.3; Without surface roughness: curve_end 2, curve 51; flagged 27: 0.6003e 0.6 0.61 0.62 0.63 0.64 0.65 0.66 0.67 0.68 0.69 0.7 0.71 0.72 0.73 0.74 0.75 0.76 0.77 0.78 0.79 0.8 0.95 0.96 0.97 0.98 0.99
  h/t, 0.3; With surface roughness: curve_end 2, curve 46, box 2; flagged 27: 0.6005e 0.6 0.61 0.62 0.63 0.64 0.65 0.66 0.67 0.68 0.69 0.7 0.71 0.72 0.73 0.74 0.75 0.76 0.77 0.78 0.79 0.8 0.95 0.96 0.97 0.98b 0.99b
== a51j11_fig15.csv 208 rows, 61 flagged
  h/t, 1.0; M 0.98: curve_end 2, curve 15; flagged 0
  h/t, 1.0; M .80: curve_end 2, curve 14, box 1; flagged 1: 0.3b
  h/t, 1.0; M 1.06: curve_end 2, curve 15; flagged 1: 0.3
  h/t, 1.0; M .60: curve_end 2, curve 15; flagged 0
  h/t, 0.6; M 0.98: curve_end 2, curve 15, box 1; flagged 1: 0.75b
  h/t, 0.6; M 1.06: curve_end 2, curve 15, box 1; flagged 1: 0.75b
  h/t, 0.6; M .80: curve_end 2, curve 14, box 2; flagged 2: 0.55b 0.8b
  h/t, 0.6; M .60: curve_end 2, curve 15; flagged 2: 0.55 0.8
  h/t, 0.3; M 0.98: curve_end 2, curve 13, box 1; flagged 16: 0.2533e 0.8722e 0.3 0.35b 0.375 0.4 0.45 0.5 0.55 0.6 0.625 0.65 0.7 0.75 0.8 0.85
  h/t, 0.3; M 1.06: curve_end 2, curve 13, box 2; flagged 17: 0.2444e 0.8726e 0.25 0.3 0.35b 0.375b 0.4 0.45 0.5 0.55 0.6 0.625 0.65 0.7 0.75 0.8 0.85
  h/t, 0.3; M .60: curve_end 2, curve 16; flagged 10: 0.2506e 0.25 0.3 0.35 0.375 0.6 0.625 0.65 0.7 0.75
  h/t, 0.3; M .80: curve_end 2, curve 14, box 2; flagged 10: 0.2514e 0.25 0.3b 0.35 0.375 0.6 0.625 0.65 0.7b 0.75
== a52e01_fig8a.csv 317 rows, 191 flagged
  M=0.6 | Wing 3 (short-dash line): curve_end 2, curve 11, curve_at_zero 1; flagged 3: 2 4 0z
  M=0.6 | Wing 4 (long-and-short-dash line): curve_end 2, curve 10, curve_at_zero 1; flagged 0
  M=0.7 | Wing 3 (short-dash line): curve_end 2, curve 10, box 1, curve_at_zero 1; flagged 2: 4b 6
  M=0.7 | Wing 4 (long-and-short-dash line): curve_end 2, curve 9, curve_at_zero 1; flagged 1: 1
  M=0.7 | Wing 2 (long-dash line): curve_end 2, curve 13, curve_at_zero 1; flagged 4: 1 5 11 12
  M=0.8 | Wing 3 (short-dash line): curve_end 2, curve 8, curve_at_zero 1; flagged 1: 2
  M=0.8 | Wing 4 (long-and-short-dash line): curve_end 2, curve 8, curve_at_zero 1; flagged 2: 1 8
  M=0.8 | Wing 2 (long-dash line): curve_end 2, curve 15, curve_at_zero 1; flagged 5: 1 8 11 11 0z
  M=0.9 | Wing 3 (short-dash line): curve_end 2, curve 11, curve_at_zero 1; flagged 1: 5.5
  M=0.9 | Wing 4 (long-and-short-dash line): curve_end 2, curve 15, curve_at_zero 1; flagged 18: 5.883e 0.143e 0.5 0.5 1 1 1 1 1.5 2 2.5 3 3.5 4 4.5 5 5.5 0z
  M=0.925 | Wing 3 (short-dash line): curve_end 2, curve 7, curve_at_zero 1; flagged 2: 0.5 1
  M=0.925 | Wing 4 (long-and-short-dash line): curve_end 2, curve 6, curve_at_zero 1; flagged 5: 0.5 0.5 1 1 1.5
  M=0.925 | Wing 2 (long-dash line): curve_end 2, curve 11, curve_at_zero 1; flagged 4: 1 4.5 4.5 5
  M=1.2, 1.4, 1.7 | M = 1.7; Wing 3 (short-dash line): curve_end 2, curve 9, curve_at_zero 1; flagged 12: 0.376e 9.665e 1 2 3 4 5 6 7 8 9 0z
  M=1.2, 1.4, 1.7 | M = 1.7; Wing 4 (long-and-short-dash line): curve_end 2, curve 8, box 1, curve_at_zero 1; flagged 12: 9.605e 0.176e 1 2 3 4 5 6 7b 8 9 0z
  M=1.2, 1.4, 1.7 | M = 1.7; Wing 2 (long-dash line): curve_end 2, curve 11, box 4, curve_at_zero 1; flagged 18: 0.372e 1 2 3 4 5 6 7 8 9 10 11 13.6e 12b 12.5b 13b 13.5b 0z
  M=1.2, 1.4, 1.7 | M = 1.4; Wing 3 (short-dash line): curve_end 2, curve 7, box 9, curve_at_zero 1; flagged 19: 12.455e 0.156e 6 7 8 9 10 11 12 1b 1.5b 2b 2.5b 3b 3.5b 4b 4.5b 5b 0z
  M=1.2, 1.4, 1.7 | M = 1.4; Wing 2 (long-dash line): curve_end 2, curve 9, box 7, curve_at_zero 1; flagged 19: 12.622e 0.175e 1 1 2 7 8 9 10 11 12 3b 3.5b 4b 4.5b 5b 5.5b 6b 0z
  M=1.2, 1.4, 1.7 | M = 1.4; Wing 4 (long-and-short-dash line): curve_end 1, curve 8, box 7, curve_at_zero 1; flagged 17: 0.175e 1 1 2 3 4 5 6 7b 8 9b 10b 10.5b 11b 11.5b 12b 0z
  M=1.2, 1.4, 1.7 | M = 1.2; Wing 2 (long-dash line): curve_end 2, curve 8, box 6, curve_at_zero 1; flagged 17: 0.146e 0.5 1 1.5 2 2.5 3 3.5 4 7.34e 4.5b 5b 5.5b 6b 6.5b 7b 0z
  M=1.2, 1.4, 1.7 | M = 1.2; Wing 3 (short-dash line): curve_end 1, curve 11, box 2, curve_at_zero 1; flagged 15: 0.873e 1 1.5 2 2.5 3 3.5 4 4.5 5 5.5 6 7b 7.5b 0z
  M=1.2, 1.4, 1.7 | M = 1.2; Wing 4 (long-and-short-dash line): curve_end 2, curve 5, box 6, curve_at_zero 1; flagged 14: 9.914e 0.144e 1 2 3 4 9 5b 5.5b 6b 6.5b 7b 7.5b 0z
== a52e01_fig8b.csv 276 rows, 171 flagged
  M=0.6 | Wing 3 (short-dash line): curve_end 1, curve 14, box 4, curve_at_zero 1; flagged 5: 0.5b 1b 1.5b 2b 0z
  M=0.6 | Wing 2 (long-dash line): curve_end 2, curve 7, box 5, curve_at_zero 1; flagged 15: 9.89e 0.153e 1 4 5 6 7 8 9 1.5b 2b 2.5b 3b 3.5b 0z
  M=0.7 | Wing 4 (long-and-short-dash line): curve_end 2, curve 10, curve_at_zero 1; flagged 3: 1 8 9
  M=0.7 | Wing 3 (short-dash line): curve_end 2, curve 15, curve_at_zero 1; flagged 4: 0.5 1.5 2 6
  M=0.7 | Wing 2 (long-dash line): curve_end 2, curve 13, curve_at_zero 1; flagged 9: 0.5 1 1 1.5 2.5 3 4.5 5 5.5
  M=0.8 | Wing 3 (short-dash line): curve_end 2, curve 11, curve_at_zero 1; flagged 3: 0.5 1 3.5
  M=0.8 | Wing 4 (long-and-short-dash line): curve_end 2, curve 12, curve_at_zero 1; flagged 3: 0.5 1 1.5
  M=0.8 | Wing 2 (long-dash line): curve_end 2, curve 10, curve_at_zero 1; flagged 4: 0.5 1 1.5 3
  M=0.9 | Wing 3 (short-dash line): curve_end 2, curve 10, curve_at_zero 1; flagged 3: 2 3 3.5
  M=0.9 | Wing 4 (long-and-short-dash line): curve_end 2, curve 4, curve_at_zero 1; flagged 7: 2.076e 0.177e 0.5 1 1.5 2 0z
  M=0.925 | Wing 3 (short-dash line): curve_end 2, curve 12, curve_at_zero 1; flagged 4: 1.5 4.5 5.5 6
  M=0.925 | Wing 4 (long-and-short-dash line): curve_end 2, curve 4, curve_at_zero 1; flagged 7: 2.274e 0.271e 0.5 1 1.5 2 0z
  M=0.925 | Wing 2 (long-dash line): curve_end 2, curve 8, curve_at_zero 1; flagged 5: 0.5 0.5 2.5 3 3.5
  M=1.2, 1.4, 1.7 | M = 1.7; Wing 3 (short-dash line): curve_end 2, curve 11, curve_at_zero 1; flagged 14: 5.857e 0.214e 0.5 1 1.5 2 2.5 3 3.5 4 4.5 5 5.5 0z
  M=1.2, 1.4, 1.7 | M = 1.7; Wing 2 (long-dash line): curve_end 2, curve 5, box 5, curve_at_zero 1; flagged 13: 8.347e 0.824e 1 2 4 5 6 7b 7.5b 8b 3b 3.5b 0z
  M=1.2, 1.4, 1.7 | M = 1.7; Wing 4 (long-and-short-dash line): curve_end 2, curve 4, curve_at_zero 1; flagged 7: 1.619e 0.222e 0.5 0.5 1 1.5 0z
  M=1.2, 1.4, 1.7 | M = 1.4; Wing 4 (long-and-short-dash line): curve_end 2, curve 11, curve_at_zero 1; flagged 14: 5.873e 0.232e 0.5 1 1.5 2 2.5 3 3.5 4 4.5 5 5.5 0z
  M=1.2, 1.4, 1.7 | M = 1.4; Wing 2 (long-dash line): curve_end 2, curve 10, curve_at_zero 1; flagged 13: 5.129e 0.225e 0.5 1 1.5 2 2.5 3 3.5 4 4.5 5 0z
  M=1.2, 1.4, 1.7 | M = 1.4; Wing 3 (short-dash line): curve_end 1, curve 9, box 2, curve_at_zero 1; flagged 13: 0.222e 0.5 1 1.5 2 2.5 3 3.5 4 4.5 5b 5.5b 0z
  M=1.2, 1.4, 1.7 | M = 1.2; Wing 2 (long-dash line): curve_end 2, curve 10, curve_at_zero 1; flagged 13: 5.058e 0.216e 0.5 1 1.5 2 2.5 3 3.5 4 4.5 5 0z
  M=1.2, 1.4, 1.7 | M = 1.2; Wing 3 (short-dash line): curve_end 1, curve 8, box 2, curve_at_zero 1; flagged 12: 0.216e 0.5 1 1.5 2 2.5 3 3.5 4 4.5b 5b 0z
```

## 8. Uncertain calls and judgement calls

Figure 14
1. Top panel (h/t 1.0), M 0.60 to 0.645: the two curves start together and overlap; split by run edges (flagged).
   Crossing near M 0.975: rows at 0.98 flagged (read from each curve's own ink either side).
2. Middle panel (h/t 0.6): crossings near M 0.895 and 0.99; dashed curve at 0.90 is a box (hidden in the crossing).
3. Bottom panel (h/t 0.3): from M 0.60 to 0.80 the two curves lie within one stroke width of each other (dashed
   about 0.005 nearer zero than solid); both read by run edges and dash-gap columns (flagged, bound). From M 0.95 to
   0.99 the dashes lie on the right edge of the steep solid line; values flagged, errors large (slope); dashed at
   0.98 and 0.99 are boxes.
4. End points: centre of the end cap; the outermost ink is in the note.

Figure 15
5. Bottom panel, curves M 0.98 and 1.06: the leader from "0.98" touches the upper start stub (P_b about -0.68), the
   one from "1.06" the lower stub (about -0.64); the two curves meet between 2y/b 0.30 and 0.39. I read them as
   touching (not crossing), so the upper stub joins the long-dash line, which agrees with both the leaders and the
   line styles of the other panels. Alternative: they cross, and the right-hand parts swap (0.98 would be the
   long-and-short-dash line ending at -0.37). Every row of both curves is flagged.
6. Bottom panel, curves M .60 and .80: leaders from ".60" and ".80" touch the upper and lower start stubs; the
   curves meet near 2y/b 0.30. I read a crossing (stubs continue straight), which keeps leaders and styles in
   agreement; alternative: touching. Rows below 2y/b 0.40 flagged. From 0.56 to 0.78 the two curves overlap within a
   stroke width (crossing again near 0.71); rows there are edge splits or boxes, flagged.
7. Top panel: M .80 and 1.06 cross near 2y/b 0.29 to 0.31 (box and gap read, flagged). Middle panel: 0.98 and 1.06
   cross near 0.75 (boxes); .80 and .60 cross near 0.55 and near 0.80 (boxes and flagged reads).

Figure 8 (a) and (b), panels M = 0.6 to 0.925
8. Wing identity by dash pattern (section 6). Calls flagged as uncertain: 8a M=0.9 long-and-short-dash curve
   (strokes 65 38 145 68 42 97 px; alternative wing 2); 8b M=0.6 right curve read as wing 2 (dashes about 50 px then
   one long unbroken stroke, no short dashes; alternative wing 4); 8b M=0.9 hook curve read as wing 4 (only three
   strokes; alternative wing 2); 8b M=0.925 middle curve read as wing 4 (few strokes; alternative wing 2). Panels
   with only two curves: 8a M=0.6 (wings 3 and 4), 8a M=0.9 (3 and 4), 8b M=0.6 (3 and 2, see above), 8b M=0.9
   (3 and 4).
9. 8a M=0.7: the wing 4 curve ends at alpha about 9.6 where it meets the wing 3 curve (shared piece, flagged).
10. 8a M=0.9: the two curves meet in an X at the top (alpha about 5.9); the wing 4 curve has a hook at alpha 0.5 to
    1.0 where the alpha lines run along nearly level strokes, giving several branch rows (flagged); a speck near
    x -0.43, alpha 0.56 was left out (not part of the curve).
11. 8a M=0.925: the wing 3 and wing 4 curves cross in a "+" near x -0.27, alpha 0.6 to 1.0 (shared, flagged); the
    small stroke near x -0.27, alpha 0.15 to 0.21 is taken as the end of the wing 3 curve (flagged by the shared
    piece); dots inside the wing 2 "C" were left out.
12. 8b M=0.6: below alpha 2.1 the wing 3 curve runs down the left edge of the x = -0.2 grid line to the frame, and
    from alpha 1.3 to 3.8 the other curve runs on that grid line; all rows there are boxes.
13. Curves running along vertical grid lines elsewhere (for example 8a M=0.7 wing 3 near x -0.108, 8a M=0.8 wing 2
    near x -0.39, 8b M=0.7 wings 4 and 2 near x -0.19 and -0.505) are flagged "partly under the grid line" or boxed.
14. Bottom ends near the frame: 8a M=0.6 wing 3 and 8a M=0.8 wing 2 stop about 0.2 deg above the frame centre, 8b
    M=0.925 wing 4 about 0.27 deg: alpha 0 rows given with the caveat and flagged. 8a M=0.8 wing 3 (0.36 deg) and
    8a M=0.925 wing 2 (0.41 deg) do not reach alpha 0.

Figure 8 (a) and (b), panel M = 1.2, 1.4, 1.7 (all rows flagged)
15. These panels hold nine (8a) and eight (8b) curves that overlap, run along the x = -0.2, -0.4 and -0.5 grid lines
    and are crossed by the label arrows. Mach number of each curve is from the arrows and from continuity; wing
    from dash pattern only. Every row carries the flag and the reason. My chains:
    - 8a M = 1.7: wing 3 (short dashes, x about -0.16 to -0.19, alpha 0.34 to 9.7; its top is under the first arrow
      head near alpha 10); wing 4 (top about alpha 9.6 at x -0.22, on the right edge of the x = -0.2 grid line from
      alpha 7.8 to 5.1, then out to x -0.29 and down to the frame at about -0.27); wing 2 (top read by eye at x
      -0.277, alpha 13.6 above the third arrow head; boxes at alpha 12 to 13.5 where it is merged with that arrow
      head; down to x -0.20 at alpha 2, then a "/" stroke to x -0.145 at alpha 0.37, not reaching alpha 0). The wing
      4 and wing 2 curves cross near alpha 4.4 (continuity call; alternative: they touch and swap lower parts).
    - 8a M = 1.4: wing 3 (short dashes from x -0.358 at alpha 12.5, then down the left edge of the x = -0.4 grid line
      from alpha 5.4 to 0.6, boxes, then a "/" stroke to the frame at x -0.373); wing 2 by elimination (mixed
      pattern; top at x -0.39, alpha 12.6, onto the x = -0.4 grid line near alpha 6.2, boxes, then the left arm of the
      "V" to the frame at about x -0.427); wing 4 (on the x = -0.4 grid line above alpha 9.2 under the arrow heads,
      boxes at alpha 9 to 12, top end not determinable; leaves the line at alpha 6, down at x -0.45, then the right
      arm of the "V" to the frame at about -0.427). The two V arms meet at the frame, so both curves have the same
      alpha 0 value.
    - 8a M = 1.2: wing 2 (from the frame at about x -0.563 up to x about -0.52 at alpha 1, x about -0.52 to alpha
      4.2, then merged with the x = -0.5 grid line, the wing 4
      curve and an arrow up to a vertical stroke whose top I read at alpha 7.34; boxes alpha 4.5 to 7); wing 3 (short
      dashes x about -0.545, top under the second arrow head, boxes at 7 and 7.5, lowest end alpha 0.87, not
      reaching alpha 0); wing 4 (top hook at alpha 9.9 to the first arrow; on the x = -0.5 grid line from alpha 8 to
      4.9, boxes; then x about -0.56 to -0.575 down to the frame). One short stroke near x -0.46 to -0.48, alpha 5.5
      to 5.9 (piece 108) is not assigned to any curve.
    - 8b M = 1.7: wing 3 (short dashes x -0.25 to -0.27, top alpha 5.9, crossed by the second arrow head near alpha
      4.6 to 5.1); wing 2 (long strokes at x about -0.285 from alpha 8.35 to 0.82, boxes where the first and third
      arrow heads cross it); wing 4 by elimination (one clear stroke from alpha 1.65 to the frame at x -0.28; above
      that merged with the wing 2 curve and the third arrow head).
    - 8b M = 1.4: wing 4 (left "(" curve, x -0.385 at alpha 5.9 to -0.37, to the frame); wing 2 (middle, x about
      -0.38 to -0.39, partly on the x = -0.4 grid line from alpha 2.7 to 3.6); wing 3 (right, short dashes from about
      x -0.46 at alpha 5 to -0.425 at the frame; top merged with an arrow head, boxes at 5 and 5.5).
    - 8b M = 1.2: only two curves and two arrows. Wing 2 (the "(" curve, alternative wing 4) and wing 3 (short
      dashes, top merged with an arrow head, boxes at 4.5 and 5); both meet at the frame near x -0.585.

General judgement calls
16. Stroke centre = ink-weighted centroid across the stroke (figs. 14, 15) or the mean position of the 1-bit ink
    run along the line alpha = const (fig. 8).
17. Curve ends = centre of the round end cap (figs. 14, 15) or centroid of the last 4 px of ink (fig. 8).
18. I never moved a reading toward an expected value, never smoothed a curve beyond the local fit through its own
    ink, and gave no value where no ink of the curve can be told apart (box rows instead).

## 9. Outputs

- `readings/a51j11_fig14.csv`, `readings/a51j11_fig15.csv`, `readings/a52e01_fig8a.csv`, `readings/a52e01_fig8b.csv`
- `overlays/a51j11_fig14_overlay.png`, `overlays/a51j11_fig15_overlay.png`, `overlays/a52e01_fig8a_overlay.png`,
  `overlays/a52e01_fig8b_overlay.png` (every row drawn on the render: circle = curve row, square = end, diamond =
  alpha 0, rectangle = box)
- `scripts/` (all code), `work/` (calibration json, traces, readings json, piece images `work/c8/`, zooms),
  `render/` (page renders), `src_a51/`, `src_a52/` (the two PDFs).
