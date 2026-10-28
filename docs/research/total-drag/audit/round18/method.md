# Method: NACA RM A52E01 fig. 8 (a), Mach 1.7 curves at low angles (reader D)

Blind fourth reading. I did not open the bowshock repository, any other scratchpad folder, any
other paper, or any page of the report other than those listed below.

## What I opened, in order

1. The brief, `te15d/reader-brief.md` (SHA-256 67fced6de07f8716a0b0fbbc3baf24a169624f9e9b53947d3e9e1af1c30556cb).
2. Downloaded the report into the empty folder `D/src/` from
   https://ntrs.nasa.gov/api/citations/19930087008/downloads/19930087008.pdf.
   SHA-256 3f090609fb3a170703523cc14f26aa9cab55e6afe4718b397b289bbcf33efe54, which matches the brief.
   35 pages, page size 614 x 733 pt.
3. `pdfinfo` (file metadata only, no page text).
4. PDF page 1, text layer only, piped through a filter that stops at any SUMMARY heading. Page 1
   is the cover (title, author, laboratory, date July 22, 1952); no summary text appeared.
5. PDF page 29 (printed page 28): image list (`pdfimages -list`), text layer of that page only, the
   page's 10 image strips (`pdfimages -png`), and a 60 dpi render for orientation. This page holds
   figure 8 (a), its caption and the legend.

No other page was opened. I did not need NOTATION, APPARATUS, MODELS, TESTS or CORRECTIONS: the
axis titles, caption and legend printed on the figure gave everything the reading needs. I looked
at the other panels of the same figure (M = 0.6, 0.8) only to see how the draftsman draws each line
style along a curve; no value from them is recorded.

## The figure as printed

- Caption: "Figure 8.- Comparison of wing base pressure coefficients for three types of
  trailing-edge bluntness. (a) Reynolds number, 1.5 million."
- Abscissa: "Pressure coefficient, (Pb - Po)/q", labels 0, -.2, -.4, -.6, -.8, grid every 0.1.
- Ordinate: "Nominal angle of attack, alpha, degrees", labels 0 to 14 every 2 (printed on the
  left panel of each row); the panel's top frame is the unlabelled line 16.
- Panel used: bottom right, titled "M=1.2, 1.4, 1.7". A "1.7" label with three arrows points at the
  three curves in the band Cp -0.13 to -0.29; the "1.4" and "1.2" labels point at curves further
  right (Cp -0.36 and beyond). No Mach 1.4 or 1.2 ink enters the Mach 1.7 band at low angles.
- Legend (in the M=0.925 panel): Wing 2, Wing 3, Wing 4, each with an airfoil sketch and a line sample.

## Image

The page is 10 one-bit CCITT strips, 2464 px wide, 240 ppi. Each strip is stored upside down; I
flipped each strip top to bottom and stacked them in their stored order (2464 x 2064 px,
`work/p29_fixed.png`). The result matches the 60 dpi render of the page. No resampling was done;
all measurements are on these native pixels. Grid lines run straight across strip joins.

## Calibration

`scripts/calib.py`. For each grid line of the panel I sampled the ink centroid along the line
wherever the line was clean (a single run of 5 px or less), fitted each line as a straight line,
then fitted an affine map by least squares:

- Cp = 2.632089 - 0.00162916 x - 0.00001031 y, from the 5 labelled vertical lines (0, -.2, -.4,
  -.6, -.8; 1680 sample points).
- alpha = 45.91955 + 0.00012251 x - 0.03166252 y, from the 8 labelled horizontal lines (0 to 14;
  3119 sample points).
- Scale 61.38 px per 0.1 Cp and 31.58 px per degree.
- Rotation: vertical lines lean dx/dy = -0.0058, horizontal lines dy/dx = +0.0038; the difference
  (about 0.002 rad) is skew. The affine map corrects both.
- Mean residual per line (fit minus true): Cp 0: -0.0015 (0.9 px), -0.2: +0.0006, -0.4: +0.0017
  (1.0 px), -0.6: +0.0009, -0.8: -0.0010; unlabelled checks -0.1, -0.3, -0.5, -0.7 all within
  0.0009. Alpha lines all within 0.019 deg (0.6 px); unlabelled line 16 at +0.025 deg.
- Calibration 2 sigma, from the scatter of the labelled lines' mean residuals: Cp 0.0027,
  alpha 0.025 deg. The grid itself is hand ruled to about 1 px, which this covers.

## Legend line styles (measured on the legend samples, px)

`scripts/legend.py`, picture in `overlays/legend_measured.png`.

| Wing | Elements | Gaps |
|---|---|---|
| 2 | dashes 31, 34, 32, 31 | 11, 11, 12 |
| 3 | dashes 15, 16, 15, 15, 17, 16, 13 | 10, 9, 11, 9, 9, 8 |
| 4 | long 31, short 13, long 31, short 13, long 33 | 10, 9, 10, 10 |

So wing 2 is a uniform long dash, wing 3 a uniform short dash, wing 4 long and short alternating
(long to short ratio 2.4).

## Wing calls for the three Mach 1.7 curves

Details and every element in `wing_calls.csv`. Lengths were read from raw pixel dumps
(`scripts/txt.py`) and component lists (`scripts/comps.py`), from about alpha 10 down to 0. Where a
stroke meets a grid line I checked the raw pixels on both sides: a stroke with ink on both sides of
a 3 px grid line was counted as one element running through it.

- **Curve A, wing 3, high confidence.** 13 consecutive elements: 17, 16, 19, 18, 13, 21, 16, 16, 17,
  19, 12, 14, then a 4 px last piece on the frame. Gaps 6 to 12 (one of 15 where another curve
  crosses, one of 3 just above the frame). Same form and same scale as the legend's wing 3. No long
  element anywhere, so wing 4 is ruled out.
- **Curve M, wing 4, high confidence.** Elements alternate long and short: L52, S23, L57, S21 to 27,
  L55, S20, L40 (the last runs into the frame). Long to short ratio 2.4, the same as the legend's
  wing 4, drawn about 1.75 times the legend's scale. Each short element has clean paper on both
  sides (gaps 5 to 10), so they are not broken long dashes. Alternative wing 2 rejected.
- **Curve R, wing 2, high confidence.** Six consecutive long dashes: 34 (upper end hidden at the
  alpha 10 line and an arrowhead tip), 49, 51, 52, 43, 43, then a 5 px end piece on the frame. Clean
  gaps of 8 or 9 px, too short to hold a short element plus two gaps, so no short element is
  hidden. Same form as the legend's wing 2, drawn about 1.5 times the legend's scale.

The draftsman did not keep the legend's scale on these two curves (wing 3's curve does keep it), so
the calls rest on form (uniform versus alternating, long versus short), not on absolute length. The
three curves show three different forms, one for each wing, which also supports the calls.

Above about alpha 10 the curves run into the "1.7" label's arrow lines and arrowheads. I did not
use that part for the calls or for any value.

## Readings

All in `readings/a52e01_fig8a_m17.csv`. Every value is the centre of visible ink in stated rows
and columns, converted with the calibration. Nothing is smoothed, fitted or interpolated along a
curve. Errors: calibration 2 sigma combined in quadrature with a reading bound (half the visible
stroke width, widened where part of a stroke is hidden in a grid line), or the half width of a box.
For values read on a grid line the alpha error is the calibration plus 1.5 px; for ends on the
frame it is the calibration plus the frame's half thickness (2.5 px).

| Curve (wing) | alpha 4 | alpha 2 | alpha 0 (lowest end) |
|---|---|---|---|
| A (3) | -0.1675 +- 0.0042 | -0.1767 +- 0.0049 (flag) | -0.1832 +- 0.0049 |
| M (4) | -0.2360 +- 0.0063 (flag) | -0.2877 +- 0.0042 | -0.2707 +- 0.0056 |
| R (2) | -0.2217 +- 0.0042 | -0.2089 +- 0.0086 (flag) | -0.1318 +- 0.0063 (flag) |

All three curves reach alpha 0 (the bottom frame). For R this depends on a small end piece; see
the flags.

## Where curves meet at low angles

- **M and R, alpha 4.8 to 5.1, Cp about -0.22 (box X_MR).** M comes in from the left (x 1734 to
  1741 px) heading down and right; R runs straight down at x 1743 to 1746. They meet in rows 1294
  to 1310. Below, one stroke continues straight down at x 1742 to 1745 and another leaves down and
  to the right. My call: they cross. Wing 2 (R) continues straight down: its last dash above ends
  at row 1294 and the straight stroke below starts at row 1303 (a gap of 8, like its other gaps),
  in the same column, and below the meeting the straight branch shows only long dashes (51, 43, 43).
  Wing 4 (M) continues on the diagonal: its long dash above ends at row 1297, the next element is a
  short one that leaves the straight stroke at rows 1305 to 1309, and the diagonal branch then
  alternates long and short (55, 20, 40). Both branches also keep the direction they had above.
  Alternative: they touch and swap (wing 4 straight down, wing 2 on the diagonal). I think this is
  unlikely because it would give wing 4 three long dashes in a row and wing 2 a short element.
- **R and A, alpha 1.0 to 1.4, Cp about -0.18 (box X_RA).** R's long diagonal dash (rows 1413 to
  1446, 43 px) runs from the Cp -0.2 grid line down and to the left across A's column of short
  dashes. My call: R continues down and left to about Cp -0.13 at alpha 0, and A continues straight
  down to Cp -0.183. The diagonal is one long element (wing 2 form). Below the crossing, A's column
  continues with short elements (14, 4) in the same line as above. Alternative: swap (A takes the
  diagonal, R takes the column). I think this is unlikely on both pattern and direction.
- **R at the Cp -0.2 grid line, alpha 1.4 to 1.8 (box H_R).** R's dash crosses the alpha 2 line at
  its crossing with the Cp -0.2 vertical line and fades into the vertical line at about row 1404.
  The diagonal dash starts 9 rows lower, just left of that line. The stroke in between is hidden in
  the grid line or is a gap.

## Flags (every uncertain call)

1. **R_a0 / R_end, wing 2 at alpha 0 (uncertain-end).** The lowest ink is a small piece, 4 rows by
   7 px, sitting on the frame at Cp -0.132. It lies about 7 px below and left of the tip of R's
   diagonal dash and in line with it. Along the whole bottom frame, every other mark is the end of
   a curve, so I read it as R's last piece, reaching alpha 0 at Cp -0.1318 +- 0.0063. Alternative
   (R_end_alt): the piece is not part of the curve, and R's lowest end is the diagonal's tip at
   alpha 0.34 +- 0.07, Cp -0.1469 +- 0.0063.
2. **R_a2, wing 2 at alpha 2 (merged-in-grid).** The stroke crosses the alpha 2 line exactly where
   it meets the Cp -0.2 vertical line, and its left edge may be inside the vertical line. Read as
   -0.2089 with the bound widened to +- 0.0086 (visible ink x 1733 to 1739 px, widened by 1.5 px).
3. **A_a2, wing 3 at alpha 2 (end-of-dash).** A short dash ends inside the alpha 2 line, and there
   is no ink below it until row 1406. The value -0.1767 is where that dash meets the line.
   Alternative: anywhere in pixel x 1713 to 1721 (Cp -0.173 to -0.186).
4. **M_a4, wing 4 at alpha 4 (merged-in-grid).** A short element ends inside the alpha 4 line. It
   leans right about 0.5 px per row, and I read it 2 to 5 rows above the line's centre, so the
   value may be about 0.0025 too small in magnitude. The bound (+- 0.0063) covers this.
5. **Crossing X_MR, wings 2 and 4 (crossing).** Crossing as described above. Alternative: swap.
6. **Crossing X_RA, wings 2 and 3 (crossing).** Crossing as described above. Alternative: swap.
7. **H_R (hidden).** Part of R's path between alpha 1.4 and 1.8 is not visible.
8. **Wing call scale.** On M and R the dashes are about 1.5 to 1.75 times the legend's length, so
   the calls rest on form. I give no alternative wing at high confidence, but the M and R calls
   depend on each other: if one were wrong, the two would swap.

## Files

- `src/a52e01.pdf`: the download.
- `scripts/`: `stack2.py` (strip flip and stack), `calib.py` (calibration), `gridmask.py`,
  `comps.py`, `panelcomps.py`, `txt.py`, `rawzoom.py`, `crop.py`, `grid.py`, `stack.py` (inspection;
  `stack.py` was the first, unflipped stack), `frametop.py` (marks resting on the bottom frame), `legend.py`,
  `readings.py` (readings CSV), `wingcalls.py` (wing_calls.csv), `overlay.py`, `legend_overlay.py`.
  All were run with `python3 -I` from `D/scripts/`, with paths as arguments.
- `readings/a52e01_fig8a_m17.csv`, `readings/calibration.json`.
- `wing_calls.csv`.
- `overlays/m17_panel_overlay.png` (whole panel, Mach 1.7 curves coloured by wing call from alpha 0
  to 10, every reading and box marked, with a key), `overlays/m17_lowalpha_zoom.png` (alpha 0 to
  5.6 at 6x, labelled), `overlays/legend_measured.png`.
- `work/`: intermediate images (stacked page, crops, masks).
