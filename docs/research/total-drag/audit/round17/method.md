# Method: blind reading of NACA RM A52E01 fig. 8 (a) and (b), reader C

Third, independent reading. I did not see either earlier reading and was told no values from them.

## What I opened, in order

1. The brief, `te15c/reader-brief.md` (SHA-256 25d34bad9edabcd339e5d2d3fa5250e468e0f4cc4ee98268e49dec9237ca422d).
2. The report PDF, downloaded from https://ntrs.nasa.gov/api/citations/19930087008/downloads/19930087008.pdf into `C/src/`. SHA-256 3f090609fb3a170703523cc14f26aa9cab55e6afe4718b397b289bbcf33efe54, which matches the brief; 35 pages. I read the PDF metadata (`pdfinfo`) and the image lists (`pdfimages -list`) for PDF pages 29, 30 and 1.
3. PDF page 29 (fig. 8 (a)) and PDF page 30 (fig. 8 (b)): native image strips extracted, and renders at 100 dpi and 600 dpi, all viewed.
4. PDF page 1, the title page (cover), rendered at 70 dpi and viewed, to confirm the report.

That is all. I opened no other page of the report and ran no text extraction or search on it, so I never saw the SUMMARY, RESULTS AND DISCUSSION or CONCLUSIONS. I did not open the bowshock repository, any worktree, git, GitHub or the website. In the scratchpad I opened only the brief and my own folder `te15c/C/`; I never opened `te15/`, `decisions.md` or any pairing folder. I opened no other paper, compilation or web page.

The container restarted once during the work (about 22:08 UTC). My files in `te15c/C/` were kept, I rechecked the PDF hash after the restart, and I continued from where I was.

## Image read

Both figure pages are scanned 1-bit (CCITT) images at 240 ppi, stored as horizontal strips, each strip flipped top to bottom. I flipped and stacked the strips: page 29 gives 2464 x 2064 px from 10 strips, and page 30 gives 2432 x 2032 px from 14 strips. Both pages are landscape. These native images (`C/work/p29_native.png`, `C/work/p30_native.png`) are what I read. I checked them against poppler renders at 600 dpi (downsampled by 2.5, 98 to 99 percent ink overlap within 1 px). The 600 dpi render is only an interpolation of the same 240 ppi pixels, so the native image is the sharper source.

## Axes, panels, legend, captions (as printed)

- Ordinate, both pages: "Nominal angle of attack, α, degrees". Labels 0, 2, ..., 14 on grid lines every 2 degrees. The top grid line (16) is unlabelled.
- Abscissa, page 29: "Pressure coefficient, (P_b - P_0)/q". Page 30: "(p_b - p_0)/q" (lower case). Labels 0, -.2, -.4, -.6, -.8, with grid lines every 0.1. The pressure coefficient becomes more negative to the right.
- Captions. Page 29: "(a) Reynolds number, 1.5 million." and "Figure 8.- Comparison of wing base pressure coefficients for three types of trailing-edge bluntness." Page 30: "(b) Reynolds number, 3.8 million." and "Figure 8.- Concluded."
- Panels on each page: "M=0.6", "M=0.7", "M=0.8" (top row), and "M=0.9", "M=0.925", "M=1.2, 1.4, 1.7" (bottom row). In the supersonic panel each curve is tied to its Mach number by a printed number ("1.7", "1.4", "1.2") with arrows pointing at the curves. There are no letter labels and no plotted symbols in either figure; all curves are faired dashed lines.
- Legend, inside the M=0.925 panel on both pages: "Wing 2", "Wing 3" and "Wing 4", each with a section sketch and a line sample. The sketches differ in trailing-edge shape; wing 2's has the largest square base.

Legend line samples, measured in native pixels (a column counts as ink if any pixel within 5 rows of the line is ink):

| Wing | Page 29 dashes | Page 29 gaps | Page 30 dashes | Page 30 gaps | Pattern |
| --- | --- | --- | --- | --- | --- |
| wing 2 | 31 34 32 31 | 11 11 12 | 32 33 33 31 | 11 11 12 | uniform long dashes |
| wing 3 | 15 16 15 15 17 16 13 | 10 9 11 9 9 8 | 16 14 15 16 17 16 14 | 10 11 10 9 9 7 | uniform short dashes |
| wing 4 | 31 13 31 13 33 | 10 9 10 10 | 32 14 32 13 33 | 8 9 9 10 | long and short alternating |

Stroke thickness is about 3 px in the legend and 4 to 5 px on the curves.

## Calibration

For each panel separately:

1. Each of the 9 vertical and 9 horizontal grid lines was sampled along its length wherever the ink across it was a clean 1 to 7 px run. I fitted centre = a + b * position with outlier trimming, which keeps each line's tilt.
2. The fitted lines were intersected.
3. Least-squares affine maps were fitted, x = a0 + a1*X + a2*Y and alpha = b0 + b1*X + b2*Y (X, Y in native pixels), through the labelled lines only. For x those are 0, -.2, -.4, -.6 and -.8 (5 lines). For alpha they are 0 to 14 (8 lines), except in the M=0.925 panels, where the legend box hides the alpha 12 and 14 lines, leaving 6.
4. The affine form corrects rotation and skew. The scans are rotated by about 0.3 to 9 mrad, and more on page 30.
5. Checks: per-line residuals, a leave-one-line-out refit for each labelled line, and the unlabelled lines (odd tenths and alpha 16) as independent checks.

The full coefficients and every residual are in the header of each readings file. Summary:

| Fig | Panel | Lines x / alpha | x scale (units/px) | alpha scale (deg/px) | x RMS / max LOO | x max unlabelled | alpha RMS / max LOO (deg) | alpha max unlabelled |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| a | M=0.6 | 5 / 8 | 0.001628 | 0.03166 | 0.0014 / 0.0032 | 0.0016 | 0.016 / 0.040 | 0.015 |
| a | M=0.7 | 5 / 8 | 0.001639 | 0.03167 | 0.0011 / 0.0035 | 0.0023 | 0.014 / 0.030 | 0.017 |
| a | M=0.8 | 5 / 8 | 0.001627 | 0.03156 | 0.0009 / 0.0031 | 0.0016 | 0.016 / 0.045 | 0.015 |
| a | M=0.9 | 5 / 8 | 0.001634 | 0.03173 | 0.0017 / 0.0048 | 0.0009 | 0.009 / 0.023 | 0.013 |
| a | M=0.925 | 5 / 6 | 0.001645 | 0.03174 | 0.0015 / 0.0044 | 0.0035 | 0.008 / 0.015 | 0.026 |
| a | M=1.2, 1.4, 1.7 | 5 / 8 | 0.001630 | 0.03167 | 0.0011 / 0.0033 | 0.0009 | 0.012 / 0.030 | 0.028 |
| b | M=0.6 | 5 / 8 | 0.001625 | 0.03145 | 0.0012 / 0.0031 | 0.0027 | 0.008 / 0.021 | 0.007 |
| b | M=0.7 | 5 / 8 | 0.001623 | 0.03153 | 0.0011 / 0.0025 | 0.0008 | 0.016 / 0.055 | 0.024 |
| b | M=0.8 | 5 / 8 | 0.001618 | 0.03148 | 0.0012 / 0.0037 | 0.0016 | 0.023 / 0.070 | 0.003 |
| b | M=0.9 | 5 / 8 | 0.001617 | 0.03146 | 0.0011 / 0.0038 | 0.0029 | 0.024 / 0.068 | 0.006 |
| b | M=0.925 | 5 / 6 | 0.001619 | 0.03156 | 0.0011 / 0.0035 | 0.0017 | 0.025 / 0.077 | 0.043 |
| b | M=1.2, 1.4, 1.7 | 5 / 8 | 0.001616 | 0.03152 | 0.0009 / 0.0019 | 0.0019 | 0.036 / 0.122 | 0.025 |

The x residuals are about 1 px or less everywhere. The alpha residuals are worst at the alpha 0 line on page 30, where the 0 to 2 interval is up to 3 px shorter than the others: residual up to 0.07 degrees, leave-one-out 0.12 degrees in the supersonic panel. For that reason the values at alpha 0 are placed on the fitted alpha 0 line itself and given y = 0. All other values use the affine map, and the calibration RMS is part of every error.

## How I decided each curve's wing

For every curve I placed a guide polyline by eye from high-zoom views of the raw pixels. A script (`scripts/trace.py`) then:

1. masked the fitted grid lines (their measured width plus 1 px each side);
2. assigned every other ink pixel within 4 to 7 px of a guide to the nearest guide;
3. projected the pixels onto the guide and measured, in 1 px steps along the path, where the stroke has ink, where it is white, and where it is hidden under a grid line.

Dash lengths are along the path, so they compare directly with the horizontal legend samples. Where a dash meets a grid line, it counts as continuous through the line only when ink touches the line on both sides. Where two curves, a curve and an arrow, or a curve and a grid line merge, I looked at the raw pixel rows and decided by hand. I checked every assignment on an overlay. Only stroke lengths and patterns decided wings, never position or expectation.

Rules, read against the legend:

- **Wing 3:** uniform short dashes. On the curves these measured about 8 to 23 px (median about 15), with gaps of about 5 to 10.
- **Wing 2:** uniform long dashes, about 40 to 50 px on the curves, with no regular short dash.
- **Wing 4:** long dashes (about 40 to 55) alternating with short ones (about 18 to 27).

The curves' long dashes are longer than the legend's (about 32 px), and the short dashes of wing 4 are longer than the legend's 13 px. The distinction between wings 2 and 4 rests on whether short dashes appear between the long ones, and that is the weakest kind of call.

## Wing call per curve

| Figure | Panel | Curve id | Printed label | Wing call | Confidence | Alternative | Dashes measured (px, along the path) | Rows |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 8(a) | M=0.6 | a06-outer | none | wing 3 | high | none | 14 10 18 15 19 19 13 21 17 9 14 16 10 19 19 13 20 15 12 14 | 33 |
| 8(a) | M=0.6 | a06-inner | none | wing 4 | medium | wing 2 | 22 43 23 49 20 46 19 45 20 39 | 35 |
| 8(a) | M=0.7 | a07-P | none | wing 2 | high | none | 47 50(25+grid+14, 2 px break) 46 44 46 43 47 49 46 46 33 | 35 |
| 8(a) | M=0.7 | a07-Q | none | wing 3 | high | none | 13 15 18 14 10 20 13 17 16 15 15 17 12 13 15 13 13 14 12 13 | 26 |
| 8(a) | M=0.7 | a07-R | none | wing 4 | high | none | 51 20 44 20 46 20, then near the hook 20 21 21 42 18 27 | 40 |
| 8(a) | M=0.8 | a08-L | none | wing 3 | high | none | 9 14 13 11 18 16 13 17 18 8 14 14 | 19 |
| 8(a) | M=0.8 | a08-M | none | wing 4 | medium | wing 2 | 44 20 74(or 49+20 if a gap hides under the alpha 4 line) 48 23 59(round the hook) 39 | 32 |
| 8(a) | M=0.8 | a08-R | none | wing 2 | high | none | 52 47 43 46 38 40 47 43 45 48 43 22 | 42 |
| 8(a) | M=0.9 | a09-Ld | none | wing 3 | high | none | 19 12 14 14 20 18 15 18 13 | 17 |
| 8(a) | M=0.9 | a09-Rr | none | wing 4 | medium | wing 2 | 32 18 (hidden in the -0.2 line) 35 19, then the hook 7 63 39 | 31 |
| 8(a) | M=0.925 | a0925-A | none | wing 3 | high | none | 7 15 15 10 17 19 10 | 19 |
| 8(a) | M=0.925 | a0925-B | none | wing 4 | high | none | 21 43 18 42 16 37 | 27 |
| 8(a) | M=0.925 | a0925-Right | none | wing 2 | high | none | 50 43 54 35 36 | 28 |
| 8(a) | M=1.2, 1.4, 1.7 | a17-c1 | 1.7 (arrow) | wing 3 | high | none | 18 16 14 19 11 22 16 11 17 17 23 16 | 22 |
| 8(a) | M=1.2, 1.4, 1.7 | a17-c3 | 1.7 (arrow) | wing 2 | medium | wing 4 | 44, then 50-59 px dashes each crossing one grid line with ink touching both sides (98 through an arrowhead), 45 | 33 |
| 8(a) | M=1.2, 1.4, 1.7 | a17-cX | 1.7 (arrow) | wing 4 | medium | wing 2 | 52 23 57 27 55 20 40 | 23 |
| 8(a) | M=1.2, 1.4, 1.7 | a14-L1 | 1.4 (arrow) | wing 3 | medium | wing 4 | 14 32 (or one 50 through the alpha 12 line), 20, 13, then 16 14 20 19 11 21 | 27 |
| 8(a) | M=1.2, 1.4, 1.7 | a14-L2 | 1.4 (arrow) | wing 4 | high | none | 9 15 10 (top, among the arrows), 54 22 57 26 56 21 43 | 28 |
| 8(a) | M=1.2, 1.4, 1.7 | a14-K | 1.4 (arrow) | wing 2 | low | wing 4 or wing 3 | seen only as extra width on the -0.4 grid line: segments of about 33, 27 and 45 rows | 28 |
| 8(a) | M=1.2, 1.4, 1.7 | a12-P1 | 1.2 (arrow) | wing 2 | medium | wing 4 | 45 50 (92 through the arrowhead blob) 50 49 32 | 30 |
| 8(a) | M=1.2, 1.4, 1.7 | a12-D1 | 1.2 (arrow) | wing 4 | medium | wing 2 | 23 56 (through the blob) 24 42 22 44 | 17 |
| 8(a) | M=1.2, 1.4, 1.7 | a12-D2 | 1.2 (arrow) | wing 3 | high | none | 18 11 19 12 13 14 16 13 16 | 24 |
| 8(b) | M=0.6 | b06-Left | none | wing 3 | high | none | 23 21 14 22 17 15 16 14 14 23 17 15 | 21 |
| 8(b) | M=0.6 | b06-Right | none | wing 4 | low | wing 2 | 26 (or 57 with the next across a 1 px break) 24 27 49 59 36 17 25 23 26 | 33 |
| 8(b) | M=0.7 | b07-Vp | none | wing 4 | high | none | 25 52 25 48 22 50 26, then 21 18 19 along the grid line | 28 |
| 8(b) | M=0.7 | b07-Up | none | wing 3 | high | none | 19 20 9 21 17 13 17, then the hook 25 20 15 13 | 29 |
| 8(b) | M=0.7 | b07-W | none | wing 2 | high | none | 45 42 (20+16 across a 1 px break) 46 41 42 28 | 15 |
| 8(b) | M=0.8 | b08-LL | none | wing 3 | high | none | 21 19 11 19 16 17 14 17 20 34(two dashes across the -0.3 line) | 26 |
| 8(b) | M=0.8 | b08-MM | none | wing 4 | low | wing 3 | 25 22 45 22 30 10 15 | 16 |
| 8(b) | M=0.8 | b08-RR | none | wing 2 | high | none | 46 51 46 42 24 | 25 |
| 8(b) | M=0.9 | b09-A9 | none | wing 3 | high | none | 20 16 8 16 16 7 18 14 | 15 |
| 8(b) | M=0.9 | b09-B9 | none | wing 4 | low | wing 2 | 51 22 44 | 31 |
| 8(b) | M=0.925 | b0925-Lf | none | wing 3 | high | none | 26 18 15 20 18 14 15 17 9 17 | 19 |
| 8(b) | M=0.925 | b0925-Md | none | wing 4 | low | wing 3 | 46 (9 + grid intersection + 30, 1 px break) 21 29 (15 + 11 across the -0.3 line) | 26 |
| 8(b) | M=0.925 | b0925-Rt | none | wing 2 | high | none | 50 45 33 42 18 | 23 |
| 8(b) | M=1.2, 1.4, 1.7 | b17-Ca | 1.7 (arrow) | wing 2 | medium | wing 4 | 49 43 44, then 39 35 in the merged zone | 19 |
| 8(b) | M=1.2, 1.4, 1.7 | b17-Cb | 1.7 (arrow) | wing 3 | high | none | 16 18 11 16 16 13 17 16 | 15 |
| 8(b) | M=1.2, 1.4, 1.7 | b17-Cm | 1.7 (arrow) | wing 4 | low | wing 2 | 29 47 | 15 |
| 8(b) | M=1.2, 1.4, 1.7 | b14-K1 | 1.4 (arrow) | wing 4 | medium | wing 2 | 15 25 53 24 42 | 14 |
| 8(b) | M=1.2, 1.4, 1.7 | b14-K2 | 1.4 (arrow) | wing 2 | medium | wing 4 | 36 39 43 16 | 20 |
| 8(b) | M=1.2, 1.4, 1.7 | b14-K3 | 1.4 (arrow) | wing 3 | high | none | 13 16 19 12 12 17 16 | 20 |
| 8(b) | M=1.2, 1.4, 1.7 | b12-G1 | 1.2 (arrow) | wing 2 | medium | wing 4 | 43 45 36 26 | 22 |
| 8(b) | M=1.2, 1.4, 1.7 | b12-G2 | 1.2 (arrow) | wing 3 | high | none | 24 17 15 19 6 10 12 8 | 23 |

Each curve's measured gaps, pattern summary and notes are in `wing_calls.csv`.

## Counts

43 curves in all.

- **Page 29, fig. 8 (a): 22 curves, 616 rows.**
  - M=0.6: wing 3, wing 4 (no wing 2 curve drawn).
  - M=0.7, M=0.8 and M=0.925: wings 2, 3 and 4.
  - M=0.9: wing 3, wing 4 (no wing 2 curve drawn).
  - Supersonic panel: three curves each for 1.7, 1.4 and 1.2, one per wing.
- **Page 30, fig. 8 (b): 21 curves, 455 rows.**
  - M=0.6 and M=0.9: wing 3, wing 4 (no wing 2 curve drawn).
  - M=0.7, M=0.8 and M=0.925: wings 2, 3 and 4.
  - Supersonic panel: 1.7 and 1.4 have wings 2, 3 and 4; 1.2 has only two curves, called wing 2 and wing 3.

Rows per wing and panel:

| Fig | Panel | wing 2 | wing 3 | wing 4 |
| --- | --- | --- | --- | --- |
| a | M=0.6 | 0 | 33 | 35 |
| a | M=0.7 | 35 | 26 | 40 |
| a | M=0.8 | 42 | 19 | 32 |
| a | M=0.9 | 0 | 17 | 31 |
| a | M=0.925 | 28 | 19 | 27 |
| a | M=1.2, 1.4, 1.7 | 91 (c3, K, P1) | 73 (c1, L1, D2) | 68 (cX, L2, D1) |
| b | M=0.6 | 0 | 21 | 33 |
| b | M=0.7 | 15 | 29 | 28 |
| b | M=0.8 | 25 | 26 | 16 |
| b | M=0.9 | 0 | 15 | 31 |
| b | M=0.925 | 23 | 19 | 26 |
| b | M=1.2, 1.4, 1.7 | 61 (Ca, K2, G1) | 58 (Cb, K3, G2) | 29 (Cm, K1) |

Kinds of row:

| Fig | curve | curve_end | curve_at_zero | box | flagged uncertain |
| --- | --- | --- | --- | --- | --- |
| a | 491 | 44 | 22 | 59 | 296 |
| b | 363 | 42 | 21 | 29 | 219 |

Many rows are flagged because the whole curve's wing call is medium or low confidence. Those rows carry every possible wing in `series`, primary first.

## What was read on each curve

- **Fixed steps of alpha.** Every 0.5 degrees, or 0.25 or 0.2 for curves spanning under 5 or 2.5 degrees, plus every labelled grid line in the span. Each value is the centre of the stroke's ink in the pixel row of that alpha. Where that row falls in a dash gap, I give the nearest ink row at its own alpha and say so, with no bridging.
- **Labelled grid lines.** Where a stroke crosses a grid line with ink on both sides, the value spans the stroke centres just above and below the line (a bound). Seven labelled lines fall in a dash gap of the curve and have no ink on the line: a08-R at 8, b06-Left at 4, b09-A9 at 4, b17-Cb at 2, b14-K3 at 2, and b12-G1 and b12-G2 at 2. There the nearest ink is given at its own alpha.
- **Flat stretches.** Where a curve runs nearly flat (hooks, near-horizontal tops), I added readings at fixed x (one pixel column). The fixed-alpha rows there are kept but flagged, with a bound of half the ink run.
- **Turning points.** The leftmost or rightmost point of each bend and hook.
- **Ends.** Both ends of every curve (centre of the last 2.5 px of stroke).
- **Alpha 0.** Where the stroke runs into the alpha 0 line, the stroke centre in its lowest free row, given at y = 0. Where it does not visibly reach alpha 0, a flagged row gives the lowest ink at its own alpha, with no extrapolation.
- **Merged ink.** Where a curve rides on a grid line, the centre is the visible edge minus half the stroke width (2.25 px). Where it is hidden inside the line, or merged with another curve or an arrowhead, I give a box.

No value anywhere is smoothed, fitted or interpolated across a gap.

## Errors

Every value has an error.

- **Single-row and single-column readings: about 2 sigma.** The terms are stroke-centre placement (0.5 px), the stroke's slope times the row uncertainty, and the panel's calibration RMS. Typical 2-sigma errors are 0.003 in x and 0.03 to 0.05 degrees in alpha.
- **Everything else: bounds.** This covers grid crossings, merged ink and boxes, turning points, ends, and values at alpha 0. Each bound is built from the stated pixel half-width plus twice the calibration RMS.
- **Boxes.** For merged ink, x and y are the box centre, and x_err and y_err are its half-widths.

## Uncertain calls

### Wing calls

Medium or low confidence; the rows carry both wings.

- a06-inner (8(a) M=0.6): wing 4, medium confidence; alternative wing 2. Measured: 22 43 23 49 20 46 19 45 20 39. Long (39-49) and short (19-23) alternate; four of the long dashes pass through a grid line with ink touching both sides; if any of those hid a gap the alternation would break.
- a08-M (8(a) M=0.8): wing 4, medium confidence; alternative wing 2. Measured: 44 20 74(or 49+20 if a gap hides under the alpha 4 line) 48 23 59(round the hook) 39. Long dashes with clean short dashes (20, 23) between them.
- a09-Rr (8(a) M=0.9): wing 4, medium confidence; alternative wing 2. Measured: 32 18 (hidden in the -0.2 line) 35 19, then the hook 7 63 39. Long/short alternation where visible; hook irregular.
- a17-c3 (8(a) M=1.2, 1.4, 1.7): wing 2, medium confidence; alternative wing 4. Measured: 44, then 50-59 px dashes each crossing one grid line with ink touching both sides (98 through an arrowhead), 45. Long dashes; six grid crossings all continuous; if those crossings hid gaps the dashes would be about 25.
- a17-cX (8(a) M=1.2, 1.4, 1.7): wing 4, medium confidence; alternative wing 2. Measured: 52 23 57 27 55 20 40. Long/short alternation.
- a14-L1 (8(a) M=1.2, 1.4, 1.7): wing 3, medium confidence; alternative wing 4. Measured: 14 32 (or one 50 through the alpha 12 line), 20, 13, then 16 14 20 19 11 21. Short dashes in its free lower part; two longer strokes at the top where arrows crowd it.
- a14-K (8(a) M=1.2, 1.4, 1.7): wing 2, low confidence; alternative wing 4 or wing 3. Measured: seen only as extra width on the -0.4 grid line: segments of about 33, 27 and 45 rows. Long segments where visible; mostly hidden in the grid line.
- a12-P1 (8(a) M=1.2, 1.4, 1.7): wing 2, medium confidence; alternative wing 4. Measured: 45 50 (92 through the arrowhead blob) 50 49 32. Long dashes.
- a12-D1 (8(a) M=1.2, 1.4, 1.7): wing 4, medium confidence; alternative wing 2. Measured: 23 56 (through the blob) 24 42 22 44. Long/short alternation in its clean lower part.
- b06-Right (8(b) M=0.6): wing 4, low confidence; alternative wing 2. Measured: 26 (or 57 with the next across a 1 px break) 24 27 49 59 36 17 25 23 26. Short dashes (17-27) and long ones (49-59) both present but they do not alternate cleanly.
- b08-MM (8(b) M=0.8): wing 4, low confidence; alternative wing 3. Measured: 25 22 45 22 30 10 15. Mostly 22-30 px with one clear 45 px dash (continuous through the -0.2/alpha 4 grid intersection).
- b09-B9 (8(b) M=0.9): wing 4, low confidence; alternative wing 2. Measured: 51 22 44. Long, short, long; only three dashes; the 22 px dash ends 3 px short of the next piece beyond the -0.3 grid line.
- b0925-Md (8(b) M=0.925): wing 4, low confidence; alternative wing 3. Measured: 46 (9 + grid intersection + 30, 1 px break) 21 29 (15 + 11 across the -0.3 line). Long, short, long on very few dashes.
- b17-Ca (8(b) M=1.2, 1.4, 1.7): wing 2, medium confidence; alternative wing 4. Measured: 49 43 44, then 39 35 in the merged zone. Long dashes; the first two each cross a grid line with ink touching both sides.
- b17-Cm (8(b) M=1.2, 1.4, 1.7): wing 4, low confidence; alternative wing 2. Measured: 29 47. Only two strokes visible: one shorter, one long.
- b14-K1 (8(b) M=1.2, 1.4, 1.7): wing 4, medium confidence; alternative wing 2. Measured: 15 25 53 24 42. Long/short alternation (the 53 crosses the alpha 4 line with ink touching both sides).
- b14-K2 (8(b) M=1.2, 1.4, 1.7): wing 2, medium confidence; alternative wing 4. Measured: 36 39 43 16. Long dashes, partly along the -0.4 grid line.
- b12-G1 (8(b) M=1.2, 1.4, 1.7): wing 2, medium confidence; alternative wing 4. Measured: 43 45 36 26. Long dashes, only four.

### Where curves meet

Which continues where, how I told, and the other way.

- **a07-Q and a07-R, 8(a) M=0.7, alpha 9.5 to 9.8.** R's top touches one of Q's dashes. Q continues; R starts there. Told by stroke pattern: the strokes above and below-left of the junction are short, and the branch going down is long. Other way: R continues up into Q's upper dashes, and Q's lower part starts at the junction.
- **a09-Ld and a09-Rr, 8(a) M=0.9, alpha 5.4 to 5.9.** An X crossing. Each curve continues straight: the stroke centres on each side line up, and the merged part is 7 to 8 px wide against 4 to 5 for one stroke. Other way: they touch and turn back, swapping their top ends (x -0.145 and -0.166 on the alpha 6 line).
- **a0925-A and a0925-B, 8(a) M=0.925, alpha 0.7 to 1.0.** A right-angle crossing. A stays vertical and B stays near-horizontal on both sides. Other way: they swap below the crossing.
- **a17-c3 and a17-cX, 8(a) supersonic, alpha 4.4 to 4.9.** They share one stroke that splits into two legs. c3 is vertical above and continues as the vertical left leg; cX comes in from the left moving right and leaves as the right leg, so they cross. Other way: they touch and turn back.
- **a17-c1 and a17-c3, 8(a) supersonic, alpha 1.1 to 1.6.** A crossing. c1 stays vertical and c3's diagonal continues down-left. Other way: they swap below the crossing.
- **a14-L1, a14-L2 and a14-K on the -0.4 grid line, 8(a) supersonic.**
  - L2 crosses the line at alpha 6.1 to 6.3.
  - L1 merges onto the line's left edge at alpha about 5.3. The extra width drifts to the right edge by alpha about 1, so L1 is called the down-right branch at the bottom and K the down-left branch. Other way: swapped.
  - Above alpha 6, one dash at alpha 10.1 to 10.7 could belong to L1 or L2.
- **a12-P1, a12-D1 and a12-D2 in the "1.2" arrowhead blob, 8(a) supersonic, alpha 4.5 to 6.0.** P1 stays vertical. D2 crosses P1 at alpha 4.5 to 4.8 into the short-dash curve at x about -0.55. D1 passes through the blob into the curve at x about -0.57. Told by the slopes on each side and by stroke pattern: D2's upper dashes are short like the short-dash lower curve, and D1's are longer like the alternating one. Other way: D1 and D2 swap their lower parts.
- **a12-D2 and a12-P1 bottom, below alpha 0.9.** D2's last ink sits beside P1's bottom stroke. D2 may continue merged with it.
- **b06-Left and b06-Right, 8(b) M=0.6, alpha 1.1 to 2.0.** Merged with each other and the -0.2 grid line. Right had been riding the line's left edge and leaves from it to the right as the hook; Left keeps its short dashes and ends against the line. Other way: they swap below alpha 1.1.
- **b07-Vp and b07-Up junction, 8(b) M=0.7, alpha 7.8 to 8.1.** The long-dash upper part continues into the alternating branch (Vp), and the short-dash branch (Up) starts at the junction. Told by stroke pattern on each side; direction alone allows either. Other way: the upper part continues into Up.
- **b07-Up crossing b07-Vp and the -0.2 grid line, alpha 1.3 to 2.4.** Up keeps its steady down-right slope into the hook, and Vp stays vertical on the line. Other way: swapped.
- **b08-LL and b08-MM, 8(b) M=0.8, alpha 1.1 to 1.6.** A crossing, decided by LL's steady down-right slope and MM staying vertical. Other way: swapped.
- **b17-Ca and b17-Cm, 8(b) supersonic, alpha 2.5 to 3.6.** The vertical upper curve splits inside the "1.7" arrowhead blob. Ca continues straight down the -0.3 line; Cm bends down-left from the split. Other way: Cm continues the upper curve and Ca starts at the split. The two meet again at the alpha 0 line, where their ink merges.
- **b14-K1 and b14-K2 tops, 8(b) supersonic, alpha 5.4 to 5.9.** The top stroke continues smoothly into K1 (both slope down-left). Other way: it is K2's top.
- **b12-G1 and b12-G2, 8(b) supersonic.** They share an apex at alpha 5.0 and cross at alpha 0.3 to 0.6. Each continues straight through the crossing. Other way: swapped below the crossing.

### Ends

- a06-outer, lower end: last dash stops 2 px above the top edge of the alpha 0 line (rows 817-818 white); the curve does not touch alpha 0.
- a07-P, upper end: stroke ends exactly at the intersection of the -0.5 and alpha 14 grid lines; it could continue hidden.
- a07-P, lower end: stroke runs into the -0.5 grid line where it meets the alpha 0 line.
- a07-R, upper end: touches a dash of curve a07-Q (junction at x -0.165, alpha 9.7); decided as the start of this curve because the strokes above and below-left of the junction are short (Q) and the branch going down is long; alternative: this curve continues up into Q's dashes.
- a08-L, lower end: last dash stops 6 px above the alpha 0 line; does not touch alpha 0.
- a08-M, upper end: a 3 px dot lies 10 px above the alpha 8 line on the curve's line, then the first dash starts under the alpha 8 line; the end is either the dot (alpha 8.45) or the dash top (alpha 8.0).
- a08-R, lower end: last dash stops 2 px above the alpha 0 line; does not touch alpha 0.
- a09-Ld, upper end: on the alpha 6 line at x about -0.166 (the right arm of the X); decided by straight-line continuity through the crossing: bottom-left stroke centres 471, 472, 473.5 px rise to the right arm at 486.5-487 px; alternative: this curve ends at the left arm (x -0.145).
- a09-Rr, upper end: on the alpha 6 line at x about -0.145 (left arm of the X); alternative: right arm (x -0.166).
- a09-Rr, lower end: hook return stroke runs flat along the top of the alpha 0 line from x about -0.23 to -0.26.
- a0925-A, lower end: a short separate piece (x -0.26 to -0.27) touches the alpha 0 line 11 px below the last clear dash; assigned to this curve by position, could be a stray.
- a0925-Right, lower end: last dash stops 9 px above the alpha 0 line; does not touch alpha 0.
- a17-c1, upper end: first clear dash just below the arrowhead tip of the 1.7 label; a stroke under the arrowhead (alpha about 10.0 to 10.5) may be its continuation.
- a17-cX, upper end: x -0.229, alpha 9.6, just below the middle arrowhead tip of the 1.7 label; a separate 30 px stroke at x -0.204 to -0.217, alpha 12.1-13.05 joins nothing and might be its top (or c1's top, or a stray).
- a14-L1, upper end: x -0.358, alpha 12.45, beside the first arrowhead of the 1.4 label.
- a14-L1, lower end: called as the down-right branch at the bottom of the -0.4 grid line (x -0.42 at alpha 0); alternative: the down-left branch (x -0.38).
- a14-L2, upper end: x -0.382, alpha 12.1, among the arrowheads of the 1.4 label.
- a14-K, upper end: uncertain, at or above alpha 12.2 where arrowheads of the 1.4 label touch the grid line.
- a14-K, lower end: called as the down-left branch at the bottom of the -0.4 grid line (x -0.38 at alpha 0); alternative: the down-right branch.
- a12-D1, upper end: x -0.453, alpha 7.3, at the tip of an arrowhead of the 1.2 label.
- a12-D2, lower end: last ink at alpha 0.88 beside curve a12-P1's bottom stroke; it may continue merged with that stroke to the alpha 0 line.
- b06-Left, lower end: last visible ink at alpha 0.51 against the -0.2 grid line; below that the curve, if it continues, is hidden in the grid line, so whether it reaches alpha 0 cannot be seen.
- b07-Up, upper end: at the junction with curve b07-Vp on the alpha 8 grid line (see that curve's note).
- b09-B9, upper end: at the intersection of the -0.2 and alpha 2 grid lines; may continue hidden.
- b09-B9, lower end: hook return reaches the alpha 0 line at x about -0.26 at a shallow angle.
- b0925-Md, upper end: passes through the intersection of the -0.2 and alpha 2 grid lines from the upper left; top ink at alpha 2.24.
- b0925-Md, lower end: small hook reaches the alpha 0 line inside the -0.3 grid line.
- b0925-Rt, upper end: the top stroke runs along just under the alpha 4 line and its right part merges with that line, so the end may lie further right.
- b17-Ca, lower end: merged with curve b17-Cm where both reach the alpha 0 line.
- b17-Cb, upper end: just below the alpha 6 line; may continue upward hidden by the upper arrowhead of the 1.7 label.
- b17-Cm, upper end: hidden in the lower arrowhead blob of the 1.7 label, where it splits from curve b17-Ca (alpha about 2.5 to 3.3).
- b17-Cm, lower end: merged with curve b17-Ca where both reach the alpha 0 line.
- b14-K1, upper end: on the alpha 6 line, merged with the -0.4 grid line and the tip of the first arrowhead of the 1.4 label.
- b12-G1, upper end: apex shared with curve b12-G2 at alpha 5.0.
- b12-G2, upper end: apex shared with curve b12-G1 at alpha 5.0, touched by the tip of the first arrowhead of the 1.2 label.

### Other

- **Orphan stroke.** A 30 px stroke at x -0.204 to -0.217, alpha 12.1 to 13.05, in the 8(a) supersonic panel joins no curve. It might be the top of a17-cX or a17-c1, or a stray; it is not in the readings.
- **Stray marks** (not curves or symbols):
  - 8(a) M=0.7: x -0.41, alpha 1.5.
  - 8(a) M=0.8: x -0.346, alpha 7.5 and x -0.378, alpha 0.65.
  - 8(a) M=0.9: a plus-shaped mark at x -0.38, alpha 8.4, and a dot at x -0.43, alpha 0.55.
  - 8(a) M=0.925: a dot at x -0.535, alpha 2.85.
  - 8(b) M=0.925: a speck at x -0.21, alpha 2.25.
- **Rows inside boxes.** Rows of kind box mark merged ink. Their x is the centre of a range, not a reading of the curve.

## Files

- `readings/a52e01_fig8a.csv`, `readings/a52e01_fig8b.csv`: readings with headers (source, page, hash, image, axes, calibration and residuals).
- `wing_calls.csv`: one row per curve per panel.
- `overlays/fig8a_*.png`, `overlays/fig8b_*.png`: one image per panel at 3x native, raw ink grey, with every reading marked (+ reading, square box, circle end, triangle alpha 0). Colours: wing 2 red, wing 3 blue, wing 4 green. Each curve is labelled with its id and wing call, with "?" when not high confidence.
- `scripts/`: the scripts (stitch, find_lines, calibrate, components, crop, legend_runs, trace, check_overlay, show_readings, emit, validate, overlay) and the inputs I wrote by hand: `curve_meta.json` with the wing calls and notes, and `../specs/*.json` with the guide polylines and the boxes for merged ink.
- `work/`: intermediate files (stitched native images, calibration, traces, check images).
