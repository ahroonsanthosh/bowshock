# Reader A: NACA TN 3861 figure 17, method note

Blind reading of figure 17 (drag coefficient of a circular cylinder against crossflow Mach number) by reader A, following `f17-readers/brief.md` (SHA-256 f8606bb73f672e5e0b00fa675728f5faaad80b68d5bb8cf562309620e1409276).

Short version: 25 plotted symbols read, 13 flagged `ok`, 12 flagged `ambiguous`, none illegible. Readings are in `tn3861_fig17.csv`.

## 1. What I opened, in order (rule 10)

Nothing from the bowshock repository, its branches, website or issues was opened, listed or searched. In the scratchpad I opened only `f17-readers/brief.md` and my own folder `f17-readers/A/`. No other paper, compilation or web page was consulted for this figure.

1. `f17-readers/brief.md` (printed in full, hashed).
2. Created `A/src/`, `A/scripts/`, `A/work/`.
3. NTRS metadata, https://ntrs.nasa.gov/api/citations/19930084664, saved as `A/src/meta.json` (first 3000 bytes printed: title, author, abstract, download link).
4. The PDF, https://ntrs.nasa.gov/api/citations/19930084664/downloads/19930084664.pdf, saved as `A/src/19930084664.pdf`, response headers in `A/src/headers.txt`.
5. `pdfinfo` on the PDF (document information only).
6. `pdfimages -list` on the PDF (size and resolution of the one scan image on each of the 33 pages, no content looked at).
7. The PDF text layer (Acrobat OCR) of pages 30 to 33, filtered to lines containing "figure" or "fig.". Hits: page 30 (the first words of the figure 14 caption), page 32 (the single word "Figure"), page 33 ("Figure 17.-").
8. The full text layer of page 33 (OCR of the figure 17 page, garbled).
9. The scan image of page 33, extracted without re-encoding to `A/work/p33-000.jpg`, decoded to grey `A/work/p33_gray.png`, plus a one-third size overview `A/work/p33_small.png`. All later views were crops of this one page (files in `A/work/`, `A/work/z/`, `A/work/diag1/`, `A/work/diag2/`).
10. The text layer of all 33 pages filtered to lines containing "figure 17", "crossflow Mach", "cross-flow Mach" or "SYMBOLS". The hits printed one line each from pages 2, 3, 7, 11, 12, 13, 31, 32 and 33. Disclosure: two of the printed lines were from the discussion of figures 15 and 16 (page 11, a crossflow Mach number value said to apply to figure 15, and page 12, a crossflow Mach number value in the pressure-coefficient discussion), and the page 31 and 32 hits were parts of the captions of figures 15 and 16. I did not look at figures 15 or 16 and used none of this.
11. Text layer, page 12 lines 36 to 50 and page 13 lines 1 to 22 (the paragraph on figure 17, "Crossflow drag coefficient"), and page 3 lines 16 to 60 (the symbol list).
12. Text layer of pages 1 and 2 filtered for the author and date lines ("By Jim A. Penland", "January 1957", and one reference line on page 2).

The session was interrupted by a usage limit and resumed after a container restart at about 13:22 UTC. All files in `A/` were intact; the PDF hash was checked again and matched.

## 2. Source

| Item | Value |
| --- | --- |
| Report | NACA TN 3861, "Aerodynamic Characteristics of a Circular Cylinder at Mach Number 6.86 and Angles of Attack up to 90 Degrees", by Jim A. Penland, January 1957 |
| Address fetched | https://ntrs.nasa.gov/api/citations/19930084664/downloads/19930084664.pdf (linked from https://ntrs.nasa.gov/citations/19930084664) |
| Fetched | 2026-10-27 08:53:44 GMT (HTTP date), HTTP 200, last-modified Thu, 06 Aug 2020 20:18:58 GMT, ETag "fe030890773683be5409a9dee0078dfc" |
| File | `A/src/19930084664.pdf` |
| SHA-256 | 4b3884fdbd75781c8707748aa906af00974f5e1a995d056c550f64f6c41f5957 |
| Size | 16881241 bytes |
| PDF | 33 pages, 567 x 748 pt, "Adobe Acrobat 9.33 Paper Capture Plug-in", one RGB JPEG scan per page |
| Page read | PDF page 33 (printed page number 32), caption "Figure 17.- Variation with crossflow Mach number of the drag coefficient of a circular cylinder." The figure is printed turned 90 degrees on the page |
| Resolution | The embedded scan at its native resolution: 2364 x 3094 px, 300 ppi as `pdfimages` reports it. SHA-256 of the extracted JPEG 8bf489b3e1323ac76f85dbc97091faf45529a93048a01f25869ec6dbf6d64a55. All measurements are on these native pixels (decoded to grey), with no resampling. For looking, crops were turned upright (a lossless 90 degree turn) and enlarged 2 to 10 times with nearest-neighbour pixels |

The `px` column of the CSV is in this page image: origin at the top left, x to the right, y down, 300 dpi.

## 3. The figure and its legend as printed

Axes: abscissa "Crossflow Mach number", labelled 0, 1, 2, ..., 8, grid every 0.5, plot frame to 9. Ordinate "Drag coefficient, C_D" (C with subscript D), labelled 0, .5, 1.0, 1.5, 2.0, 2.5, grid every 0.25, plot frame to 2.75. The legend sits in a white box over the upper right of the plot (crossflow Mach number about 1.5 to 9, drag coefficient about 1.75 to 2.75).

Legend, line by line, as printed:

| Key | Text |
| --- | --- |
| line: long dash, short dash, long dash | Newtonian flow, ref. 1 |
| line: long dash, two short dashes, long dash | Grimminger's hypersonic approx., ref. 1 |
| line: long dash, several short dashes, long dash | Modified Newtonian flow |
| open circle | Present data from force tests M = 6.86 |
| open square | Present data from pressure distribution |
| open right triangle, right angle at lower right, slope from lower left to upper right | Gowen and Perkins, from pressure distribution, M = 1.49 to 2.9, ref. 8 |
| open quarter circle, square corner at lower right, arc on the upper left | Lord and Ulmann, from pressure distribution, M = 4.04 (unpublished) |
| dashed line | Welsh, C. J., from flight test data M = .5 to 1.3, ref. 11 |
| + | Cross indicates data obtained through crossflow study |
| D shape: flat bottom, straight sides, round top | Busemann, ref. 10 |
| open diamond | Walter and Lange, from pressure distribution M = 2.48 to 4.92 ref. 9 |

In the Lord and Ulmann line the sign between "M" and "4.04" is printed as a heavy blot rather than a clean "="; I transcribe it as "=". In the Walter and Lange line there is no comma before "M" or before "ref. 9", and "ref. 9" is darker type. The CSV `series` column uses these texts exactly.

Text about the figure (pages 12 and 13): the figure shows the present data with "an accumulation of available cylinder data (refs. 8 to 11)", data obtained by the crossflow method, and "the values of drag coefficient predicted by unmodified Newtonian flow, Grimminger's hypersonic approximation, and modified Newtonian flow for an infinite Mach number". This matches the three horizontal theory lines drawn at the right of the plot (crossflow Mach number 7.5 to 9). The symbol list defines crossflow Mach number as M sin(alpha).

What was not read (rule 8): the three theory lines at the right; the two solid curves faired through the present data (one through the crossed circles, one through the crossed squares and the diamonds); the Welsh dashed curve between crossflow Mach number 0.4 and 1.3, including its small rounded turns near 0.7 and 0.8, which are part of the dashed line and not symbols; the short solid line that runs from the Gowen and Perkins triangle near 1.48 up into the Busemann symbol; and several faint grey pencil lines. The Welsh series appears only as a line, so it has no rows.

## 4. Axis calibration

Method (script `A/scripts/calib2.py`, log `A/work/calib2.txt`, numbers `A/work/calib2.json`):

1. Every grid line of the plot was traced across the whole plot, not just the axis lines. Along each line, every 3 px, the darkness-weighted centre of a thin dark peak within 4 px of the line's predicted position was taken. Samples where the dark peak was wider than 6 px (symbols, lettering, crossings) or too faint (gaps, the legend box) were dropped.
2. A straight line was fitted to each line's samples with repeated 2.5-sigma rejection. The drag-coefficient lines 1.75, 2.0, 2.25 and 2.5 exist only beside the legend box (crossflow Mach number 0 to 1.5, about 360 px long), so they were given the median slope of the long lines and only their offset was fitted.
3. The fitted lines were intersected, keeping only crossings where both lines are really present in the scan (148 crossings).
4. A least-squares affine map from page pixels to figure values was fitted to the 40 crossings of labelled lines only (crossflow Mach number 0, 1, ..., 8 and drag coefficient 0, .5, 1.0, 1.5, 2.0, 2.5; the 2.0 and 2.5 lines cross only the Mach number lines 0 and 1). The 108 crossings that involve an unlabelled line (half-unit Mach lines, quarter-unit drag lines, the frame at 9 and 2.75) were kept as an independent check.

Fitted mapping (px, py in the page image):

- crossflow Mach number = 10.700318 - 0.000030699 px - 0.004084118 py
- drag coefficient = 3.560174 - 0.002038227 px + 0.000016549 py

That is 244.84 px per unit of crossflow Mach number (0.004084 per px) and 490.61 px per unit of drag coefficient (0.002038 per px).

Residuals:

| Crossings | rms, Mach number | max, Mach number | rms, drag coefficient | max, drag coefficient |
| --- | --- | --- | --- | --- |
| labelled (40, used in the fit) | 0.0024 | 0.0071 | 0.0007 | 0.0017 |
| unlabelled (108, check only) | 0.0032 | 0.0093 | 0.0010 | 0.0019 |

The largest residuals are on the heavy axis line at Mach number 0 (its ink centre sits 0.9 to 1.7 px off the uniform spacing) and on the frame line at 9 (about 2 px off, unlabelled, not used).

Rotation and skew. The scan is turned: the Mach number axis runs 0.465 degrees off the page vertical and the grid lines show it (Mach number lines at -0.36 to -0.51 degrees from the page horizontal, drag-coefficient lines at +0.45 to +0.49 degrees from the page vertical). The affine map takes this out. The two axes are 89.966 degrees apart, a shear of 0.035 degrees, also taken out. The Mach number lines are not quite parallel (their angle drifts by 0.15 degrees from Mach 0 to 8), a small bow or keystone of the scan. A quadratic map was tried as a check and only lowered the labelled rms from 0.0024 to 0.0021 in Mach number, so the affine map was kept. As a second check every reading was also computed by interpolating between the two nearest traced grid lines at the symbol's own position. That local reading differs from the affine one by at most 0.004 in Mach number (for the points below Mach 1.6) and 0.0011 in drag coefficient. This is inside the calibration term of the reading error (section 6).

Every grid line used (Mach number lines: page y = a + b x; drag-coefficient lines: page x = a + b y):

| Axis | Value | Labelled | Fitted line (page px) | Angle (deg) | Line sd (px) | Samples used | Traced span (px) | Position at mid-span (px) | Mean residual of the fit at this line |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Crossflow Mach number | 0 | yes | y = 2620.76 -0.00894 x | -0.512 | 0.60 | 431 of 438 | 422 to 1763 | y = 2610.99 at x = 1092 | -0.0035 in M (11 crossings) |
| Crossflow Mach number | 0.5 | no | y = 2498.69 -0.00802 x | -0.459 | 0.29 | 439 of 442 | 419 to 1763 | y = 2489.94 at x = 1091 | +0.0024 in M (12 crossings) |
| Crossflow Mach number | 1 | yes | y = 2376.29 -0.00777 x | -0.445 | 0.29 | 433 of 435 | 419 to 1763 | y = 2367.81 at x = 1091 | +0.0036 in M (12 crossings) |
| Crossflow Mach number | 1.5 | no | y = 2253.32 -0.00739 x | -0.423 | 0.31 | 416 of 419 | 419 to 1760 | y = 2245.27 at x = 1090 | +0.0031 in M (12 crossings) |
| Crossflow Mach number | 2 | yes | y = 2129.85 -0.00697 x | -0.400 | 0.28 | 269 of 271 | 917 to 1760 | y = 2120.52 at x = 1338 | +0.0013 in M (7 crossings) |
| Crossflow Mach number | 2.5 | no | y = 2007.12 -0.00692 x | -0.396 | 0.27 | 266 of 271 | 917 to 1760 | y = 1997.87 at x = 1338 | +0.0004 in M (7 crossings) |
| Crossflow Mach number | 3 | yes | y = 1884.81 -0.00693 x | -0.397 | 0.29 | 273 of 287 | 917 to 1757 | y = 1875.55 at x = 1337 | +0.0008 in M (7 crossings) |
| Crossflow Mach number | 3.5 | no | y = 1762.34 -0.00688 x | -0.394 | 0.28 | 269 of 307 | 701 to 1757 | y = 1753.88 at x = 1229 | +0.0009 in M (7 crossings) |
| Crossflow Mach number | 4 | yes | y = 1639.32 -0.00683 x | -0.392 | 0.30 | 282 of 303 | 614 to 1754 | y = 1631.23 at x = 1184 | -0.0012 in M (7 crossings) |
| Crossflow Mach number | 4.5 | no | y = 1517.09 -0.00678 x | -0.389 | 0.29 | 274 of 293 | 794 to 1754 | y = 1508.45 at x = 1274 | -0.0001 in M (6 crossings) |
| Crossflow Mach number | 5 | yes | y = 1394.72 -0.00687 x | -0.394 | 0.29 | 276 of 285 | 410 to 1754 | y = 1387.28 at x = 1082 | -0.0005 in M (7 crossings) |
| Crossflow Mach number | 5.5 | no | y = 1272.20 -0.00670 x | -0.384 | 0.28 | 284 of 297 | 410 to 1754 | y = 1264.95 at x = 1082 | +0.0003 in M (6 crossings) |
| Crossflow Mach number | 6 | yes | y = 1149.48 -0.00650 x | -0.372 | 0.28 | 263 of 286 | 410 to 1751 | y = 1142.46 at x = 1080 | +0.0002 in M (6 crossings) |
| Crossflow Mach number | 6.5 | no | y = 1026.93 -0.00656 x | -0.376 | 0.30 | 282 of 300 | 407 to 1751 | y = 1019.85 at x = 1079 | -0.0006 in M (6 crossings) |
| Crossflow Mach number | 7 | yes | y = 904.36 -0.00639 x | -0.366 | 0.30 | 281 of 286 | 752 to 1748 | y = 896.37 at x = 1250 | -0.0004 in M (7 crossings) |
| Crossflow Mach number | 7.5 | no | y = 781.94 -0.00636 x | -0.364 | 0.29 | 270 of 285 | 407 to 1748 | y = 775.09 at x = 1078 | -0.0002 in M (7 crossings) |
| Crossflow Mach number | 8 | yes | y = 659.42 -0.00626 x | -0.359 | 0.30 | 278 of 284 | 875 to 1748 | y = 651.21 at x = 1312 | -0.0001 in M (7 crossings) |
| Crossflow Mach number | 8.5 | no | y = 536.25 -0.00636 x | -0.364 | 0.31 | 279 of 284 | 908 to 1748 | y = 527.81 at x = 1328 | -0.0036 in M (7 crossings) |
| Crossflow Mach number | 9 | no | y = 413.96 -0.00743 x | -0.426 | 0.40 | 433 of 440 | 404 to 1754 | y = 405.94 at x = 1079 | -0.0092 in M (7 crossings) |
| Drag coefficient | 0 | yes | x = 1745.57 +0.00859 y | +0.492 | 0.55 | 696 of 712 | 404 to 2600 | x = 1758.48 at y = 1502 | -0.0008 in CD (19 crossings) |
| Drag coefficient | 0.25 | no | x = 1624.79 +0.00801 y | +0.459 | 0.30 | 722 of 723 | 404 to 2603 | x = 1636.83 at y = 1504 | +0.0012 in CD (19 crossings) |
| Drag coefficient | 0.5 | yes | x = 1502.08 +0.00801 y | +0.459 | 0.29 | 724 of 724 | 404 to 2603 | x = 1514.11 at y = 1504 | +0.0011 in CD (19 crossings) |
| Drag coefficient | 0.75 | no | x = 1378.73 +0.00792 y | +0.454 | 0.29 | 718 of 724 | 407 to 2588 | x = 1390.60 at y = 1498 | -0.0006 in CD (19 crossings) |
| Drag coefficient | 1 | yes | x = 1256.27 +0.00801 y | +0.459 | 0.28 | 719 of 725 | 407 to 2588 | x = 1268.27 at y = 1498 | +0.0001 in CD (19 crossings) |
| Drag coefficient | 1.25 | no | x = 1133.23 +0.00791 y | +0.453 | 0.30 | 477 of 567 | 407 to 2588 | x = 1145.07 at y = 1498 | -0.0011 in CD (15 crossings) |
| Drag coefficient | 1.5 | yes | x = 1010.93 +0.00794 y | +0.455 | 0.31 | 658 of 677 | 410 to 2588 | x = 1022.83 at y = 1499 | -0.0002 in CD (19 crossings) |
| Drag coefficient | 1.75 | no | x = 887.83 +0.00797 y (slope fixed) | +0.457 | 0.30 | 116 of 118 | 2249 to 2606 | x = 907.18 at y = 2428 | -0.0013 in CD (4 crossings) |
| Drag coefficient | 2 | yes | x = 765.75 +0.00797 y (slope fixed) | +0.457 | 0.27 | 118 of 119 | 2246 to 2609 | x = 785.10 at y = 2428 | -0.0001 in CD (4 crossings) |
| Drag coefficient | 2.25 | no | x = 642.59 +0.00797 y (slope fixed) | +0.457 | 0.28 | 119 of 121 | 2246 to 2606 | x = 661.93 at y = 2426 | -0.0012 in CD (4 crossings) |
| Drag coefficient | 2.5 | yes | x = 520.46 +0.00797 y (slope fixed) | +0.457 | 0.28 | 111 of 114 | 2252 to 2612 | x = 539.84 at y = 2432 | -0.0001 in CD (4 crossings) |
| Drag coefficient | 2.75 | no | x = 397.08 +0.00790 y | +0.453 | 0.37 | 676 of 733 | 452 to 2588 | x = 409.10 at y = 1520 | -0.0019 in CD (3 crossings) |

Residuals of the 40 labelled crossings used in the fit:

| M | CD | px | py | residual M | residual CD |
| --- | --- | --- | --- | --- | --- |
| 0 | 0.0 | 1767.96 | 2604.95 | -0.0071 | +0.0002 |
| 0 | 0.5 | 1522.95 | 2607.14 | -0.0057 | +0.0008 |
| 0 | 1.0 | 1277.18 | 2609.34 | -0.0043 | -0.0002 |
| 0 | 1.5 | 1031.66 | 2611.53 | -0.0028 | -0.0006 |
| 0 | 2.0 | 786.58 | 2613.73 | -0.0014 | -0.0002 |
| 0 | 2.5 | 541.31 | 2615.92 | +0.0000 | -0.0002 |
| 1 | 0.0 | 1765.88 | 2362.57 | +0.0029 | -0.0000 |
| 1 | 0.5 | 1521.01 | 2364.47 | +0.0032 | +0.0009 |
| 1 | 1.0 | 1275.23 | 2366.38 | +0.0034 | -0.0001 |
| 1 | 1.5 | 1029.73 | 2368.29 | +0.0037 | -0.0005 |
| 1 | 2.0 | 784.64 | 2370.19 | +0.0039 | -0.0001 |
| 1 | 2.5 | 539.36 | 2372.10 | +0.0042 | -0.0001 |
| 2 | 0.0 | 1763.77 | 2117.55 | +0.0022 | -0.0003 |
| 2 | 0.5 | 1519.04 | 2119.26 | +0.0016 | +0.0009 |
| 2 | 1.0 | 1273.26 | 2120.97 | +0.0011 | -0.0001 |
| 2 | 1.5 | 1027.78 | 2122.68 | +0.0005 | -0.0005 |
| 3 | 0.0 | 1761.67 | 1872.60 | +0.0017 | -0.0005 |
| 3 | 0.5 | 1517.08 | 1874.30 | +0.0011 | +0.0010 |
| 3 | 1.0 | 1271.30 | 1876.00 | +0.0005 | -0.0000 |
| 3 | 1.5 | 1025.83 | 1877.70 | -0.0001 | -0.0004 |
| 4 | 0.0 | 1759.56 | 1627.30 | -0.0002 | -0.0007 |
| 4 | 0.5 | 1515.12 | 1628.97 | -0.0009 | +0.0010 |
| 4 | 1.0 | 1269.34 | 1630.65 | -0.0016 | +0.0000 |
| 4 | 1.5 | 1023.89 | 1632.33 | -0.0023 | -0.0003 |
| 5 | 0.0 | 1757.46 | 1382.64 | +0.0005 | -0.0010 |
| 5 | 0.5 | 1513.16 | 1384.32 | -0.0001 | +0.0011 |
| 5 | 1.0 | 1267.38 | 1386.01 | -0.0008 | +0.0001 |
| 5 | 1.5 | 1021.95 | 1387.70 | -0.0014 | -0.0002 |
| 6 | 0.0 | 1755.35 | 1138.08 | +0.0016 | -0.0012 |
| 6 | 0.5 | 1511.20 | 1139.66 | +0.0006 | +0.0011 |
| 6 | 1.0 | 1265.42 | 1141.26 | -0.0004 | +0.0001 |
| 6 | 1.5 | 1020.00 | 1142.85 | -0.0015 | -0.0001 |
| 7 | 0.0 | 1753.25 | 893.16 | +0.0013 | -0.0014 |
| 7 | 0.5 | 1509.24 | 894.72 | +0.0001 | +0.0012 |
| 7 | 1.0 | 1263.45 | 896.29 | -0.0010 | +0.0002 |
| 7 | 1.5 | 1018.06 | 897.85 | -0.0021 | +0.0000 |
| 8 | 0.0 | 1751.15 | 648.46 | +0.0018 | -0.0017 |
| 8 | 0.5 | 1507.28 | 649.99 | +0.0006 | +0.0012 |
| 8 | 1.0 | 1261.49 | 651.52 | -0.0007 | +0.0003 |
| 8 | 1.5 | 1016.12 | 653.06 | -0.0019 | +0.0001 |

## 5. Symbol identity and centres

How the series were told apart:

- Circle against square: round outline against straight sides and corners. All circles have radius 16.0 to 16.6 px, all squares side about 29 px.
- Gowen and Perkins triangle against Lord and Ulmann quarter circle: both have a straight bottom and a straight right side, but the triangle's third side is straight and the quarter circle's is an arc. Checked on every one at 6 to 10 times enlargement, and by which outline model fitted the strokes.
- Busemann D: flat bottom, straight sides and a round top; only one on the figure.
- Diamond: four straight sides at 45 degrees, about 41.5 px corner to corner.
- Crossed against uncrossed: the cross is a pair of heavy strokes inside the symbol outline, one along each axis, meeting at the symbol's centre. Grid lines are thinner and run on through the symbol and beyond it, and only by chance pass near the centre. For every symbol with a grid line or a faired curve through it I checked, on a pixel map, for strokes through the centre in both directions. A symbol was read as crossed when a stroke of its own (ending at its outline, not continuing outside) was found; where one arm coincided with a grid line or curve this is said in the notes.
- Pressure against force: only the present data are split this way in the legend, circle for force tests and square for pressure distribution.

Centres (script `A/scripts/symfit.py`, logs `A/work/fit2.txt`, numbers `A/work/fit2.json`, check pictures `A/work/diag2/`):

1. Each symbol was given an outline model of its own shape: circle, square, diamond, right triangle (right angle at lower right), quarter circle (square corner at lower right, arc of radius equal to the side), or D. The model is set along the fitted figure axes, so the 0.47 degree scan rotation is included.
2. The model's position (and size, unless fixed) was chosen to put its outline on the darkest ink: the mean darkness of the lightly smoothed image (Gaussian, 0.8 px) sampled every 0.5 px along the outline was maximised, first on a 1 px grid of positions, then by a Nelder-Mead search to 0.01 px. Outline samples lying within 2.5 px of any grid line were ignored, so grid lines do not pull the fit.
3. Where another symbol covers part of an outline, only the free sides were used and the size was fixed at the size measured on clean symbols of the same kind (square side 29 px, diamond 41.6 px corner to corner). This applies to the diamonds at 2.838 and 4.925 and the squares at 3.454, 5.954, 6.648 and 6.848.
4. For crossed symbols the two cross strokes were located separately (darkness-weighted centre of the stroke across many profiles) and their crossing is given in the note. On circles and squares the cross meets within 1.5 px of the outline centre (0.6 to 1.5 px).
5. The reading is the area centroid of the fitted outline. For circles, squares and diamonds that is simply their centre. For the triangles, quarter circles and the D it is a judgement call, explained next.

The centre of a triangle or quarter circle. These shapes have no single obvious centre. The two candidates are the centre of the bounding square (which for the right triangle lies on its sloping side) and the area centroid (for the triangle one sixth of the side further toward the right-angle corner along each axis, about 5 px; for the quarter circle about 2.4 px along each axis). Evidence from the figure itself:

- On all three clearly visible crossed quarter circles (x 0.694, 1.049, 1.400) the cross meets 0.5 to 1.3 px from the area centroid and 2.8 to 4.8 px from the bounding-square centre.
- In the triangle at x 2.911 a faint pencil dot, presumably the plotted point, sits within 0.5 px of the area centroid.
- Inside the D, the solid line that runs up to it ends about 3 px below the centre of the round top, on the centroid side.

So the area centroid is used for these shapes. The bounding-square centre is given as an alternative reading for the three uncrossed triangles and for the quarter circle whose vertical cross arm is hidden (x 1.995), and these are flagged `ambiguous`. For the crossed quarter circles the cross settles it, so they are `ok` and the bounding-square centre is only quoted in the note. For the D the two centres differ by 1.4 px (0.003 in drag coefficient), inside the reading error, so it is `ok`.

## 6. Reading errors

Each point carries x_err and value_err = sqrt((d x k)^2 + c^2), rounded up to 0.001, where k is the axis scale (0.004084 Mach number per px, 0.002038 drag coefficient per px), c is the calibration term (0.004 in Mach number, 0.0012 in drag coefficient, covering the fit residuals and the affine against local-grid differences), and d is my centring uncertainty in px:

- d = 1.0 px: clean outline, and any cross agrees within about 1 px (errors 0.006 and 0.003);
- d = 1.5 px: a grid line or curve lies along part of the outline, a cross disagrees by about 1 px, or the centre convention for the D (0.008 and 0.004);
- d = 2.0 px: part of the outline covered by another symbol (0.010 and 0.005);
- d = 2.5 px: one side lost in a grid line and the size uncertain, triangle at 1.957 (0.011 and 0.006);
- d = 3.0 px: half of the outline hidden, diamond at 4.925 (0.013 and 0.007).

These are reading errors only. They do not include how accurately the draftsman plotted the points, and they do not cover the centre-convention alternatives, which are listed separately.

## 7. Ambiguous points and what I saw

The flag `ambiguous` is used when symbols overlap so that part of an outline is hidden or shared, when a mark is not explained by the legend, or when the centre convention gives a reading that differs by more than the reading error. Values below are crossflow Mach number, drag coefficient.

- 1.481, 1.491 (Gowen and Perkins, uncrossed). Centre convention only; bounding-square centre 1.459, 1.502. Two grid lines and the short solid line cross it; no stroke passes through its centre, so uncrossed.
- 1.957, 1.447 (Gowen and Perkins, uncrossed). Its top corner touches the crossed quarter circle above it; its right side lies on the Mach 2 grid line, so its size comes from the other two sides (29 px, smaller than the other triangles at 32 px). Alternatives: bounding-square centre 1.937, 1.456; centroid with the size forced to 32 px 1.965, 1.449. A faint pencil mark lies 4 px from the centroid (8.5 px from the bounding-square centre).
- 1.995, 1.510 (Lord and Ulmann, crossed). Overlaps the triangle below and is touched by the upper faired curve, which stops at its outline. A horizontal cross stroke is clear inside the outline, 1 px above the centroid; the vertical stroke cannot be separated from the Mach 2 grid line, 2 px right of the centroid. Alternative: bounding-square centre 1.985, 1.515.
- 2.484, 1.324 (Walter and Lange). The lower faired curve and the Mach 2.5 grid line run through it. A small dark bump on the curve near the centre may be a dot like those at 3.247 and 4.191, and a short stroke (about 4 px) sticks out below the bottom corner. Neither is in the legend.
- 2.838, 1.327 (Walter and Lange). Its upper right side is covered by the triangle at 2.911. Fixed-size fit to the three free sides; a free fit to all sides gives 2.837, 1.327.
- 2.911, 1.339 (Gowen and Perkins, uncrossed). Its lower left corner lies inside the diamond at 2.838. Pencil dot at the centroid. Alternative: bounding-square centre 2.889, 1.350.
- 3.247, 1.304 and 4.191, 1.287 (Walter and Lange). Each has a solid inked dot inside (1.2 px and 2.7 px from the outline centre). The legend diamond has no dot and the legend does not explain one. Read as Walter and Lange; the alternative is that the dotted diamond is a separate, unexplained series.
- 4.925, 1.251 (Walter and Lange). Left half hidden behind the crossed square at 4.856; only its top, right and bottom corners show. Fixed-size fit to the two right sides; a free fit gives 4.923, 1.251.
- 5.954, 1.249 (present pressure, crossed). Its top side is hidden inside the crossed circle above. Fixed-size fit to the bottom and the lower parts of the sides; a free fit gives 5.956, 1.248. Vertical cross stroke visible; the horizontal one would lie on the drag coefficient 1.25 grid line.
- 6.648, 1.233 (present pressure, crossed). Top hidden inside the crossed circle above. A heavy vertical stroke inside the square, its own (5 px from the circle's cross stroke), is read as its cross; it sits 1.9 px right of the outline centre, so the alternative x is 6.656. The horizontal stroke would lie on the lower faired curve.
- 6.848, 1.249 (present pressure, uncrossed). Overlaps the uncrossed circle above it. Inside the circle a horizontal stroke runs 4 px above the circle centre from edge to edge. It is either this square's top side (that makes the square 30 px tall against 29 px wide) or the end of the upper faired curve (which reaches the circle's left edge at the circle's centre height, 4 px lower, so I think it is the square's top). Both give the same centre within 0.5 px: fixed-size fit 6.848, 1.249; using the stroke as the top 6.851, 1.250.

Points read `ok` with something worth knowing (details in the CSV notes): the three crossed quarter circles at 0.694, 1.049 and 1.400 (crosses at the centroid); the Busemann D at 1.594, 1.653 (round-top centre 1.594, 1.656); the uncrossed circle at 6.854, 1.272 (the stroke inside it, see above, and a faint grey smudge near its centre); the crossed square at 4.856, drawn over the hidden diamond, with its own outline complete.

No point was illegible.

## 8. Judgement calls, in one list

1. Measured on the embedded 300 ppi scan, not on a re-rendered page.
2. Calibrated on the 40 crossings of labelled grid lines; unlabelled lines only checked it.
3. Affine map kept (quadratic barely better); rotation 0.465 degrees and shear 0.035 degrees corrected by it.
4. Short drag-coefficient lines beside the legend given the common slope.
5. Area centroid as the centre of triangles, quarter circles and the D (section 5).
6. Fixed symbol sizes for partly hidden outlines.
7. Crossed only when the symbol has strokes of its own through its centre.
8. Dotted diamonds read as Walter and Lange and flagged.
9. The stroke inside the uncrossed circle at 6.854 taken as the top of the square below it (it changes nothing in the reading).
10. Lines, the Welsh dashed curve and pencil marks not read.
11. Values given to 0.001; errors rounded up to 0.001.

## 9. What did not match the brief

- Author: the brief says "P. J. Penland". The title page (and NTRS) say "Jim A. Penland".
- Page: the brief says "about PDF page 33". Figure 17 is exactly PDF page 33; the printed page number on it is 32.
- Pressure or force: the brief asks for pressure-integrated or force-measured drag where the legend distinguishes them. The legend does so only for the present data (circle: force tests; square: pressure distribution). Gowen and Perkins, Lord and Ulmann and Walter and Lange are all "from pressure distribution"; Busemann, ref. 10 states no method; Welsh is "from flight test data" and is drawn only as a dashed line, so it has no rows.
- Symbols the legend does not explain: solid dots inside the diamonds at 3.247 and 4.191, a possible dot and a short tail on the diamond at 2.484, and a line ending inside the Busemann symbol. Read as plotted and flagged.
- Not a brief mismatch, only noted: the NTRS title says Mach number 6.86 while its abstract says 6.88; the legend says M = 6.86.

## 10. Files in this folder

- `tn3861_fig17.csv`: the readings, one row per plotted symbol, sorted by crossflow Mach number. The note of each row starts with my symbol id (S01 to S25).
- `method.md`: this note.
- `src/`: the PDF, NTRS metadata and response headers, as fetched.
- `scripts/`: `calib2.py` (final calibration; `calib.py` and `profiles.py` were first passes), `symfit.py` (outline fits), `build_csv.py` (decisions and CSV), `charmap.py`, `dots.py`, `trace_curve.py` (pixel checks), `crop.py`, `figcrop.py`, `degrid.py`, `overlay.py`, `sheet.py`, `calib_tables.py` (views and tables). All run with `python3 -I` and take paths as arguments.
- `work/`: the extracted page image, calibration and fit results (`calib2.json`, `fit1.json` first pass, `fit2.json` final, with logs), the inputs to the fits (`symbols_pass1.json`, `symbols_pass2.json`), and the crops and check pictures looked at (`overlay_all.png` shows every reading on the figure).
