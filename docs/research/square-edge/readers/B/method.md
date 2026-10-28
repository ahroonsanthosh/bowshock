# Reader B: method note

Blind second reading for the brief `sq-readers/brief.md` (SHA-256
2c6d4d6b5db5559997f468670ca44b1f31932b8fef3927bb470d095985e9d67b, 9401 bytes).
I did not open the bowshock repository, any worktree, git, GitHub or the
website, nor any other folder of the scratchpad than `brief.md` and my own
`sq-readers/B/`. I did not open NASA TR R-274 or any other source than the
four PDFs below. No values from any other place were used.

## 1. Sources

All four files were fetched by me, into the new empty folder `B/src/`. The
brief gives the NTRS citation pages; I asked the NTRS citation API for each
record (`https://ntrs.nasa.gov/api/citations/<id>`), which names the PDF, and
downloaded the PDF from the address it gives.

| Report | Fetched from | SHA-256 | Bytes | Pages |
| --- | --- | --- | --- | --- |
| NACA TN 4300 | https://ntrs.nasa.gov/api/citations/19930085034/downloads/19930085034.pdf | e9a7f54a97e984a23d6355cdefdda7ea21c128b51bc39bbe46c3e1219abd7ea4 | 20584298 | 40 |
| NACA RM L57C18 | https://ntrs.nasa.gov/api/citations/19930089669/downloads/19930089669.pdf | a063cd07ad62a932a4b82e50c9619e90d8182c33a34481c9a65a3d170ac60d21 | 15366543 | 28 |
| NASA TM X-19 | https://ntrs.nasa.gov/api/citations/19980223601/downloads/19980223601.pdf | da9598ecb9cc5e886b4cf1134b6af84e08d2a04064fb0bdcfe3083f828071afd | 19192481 | 25 |
| NASA TN D-5392 | https://ntrs.nasa.gov/api/citations/19690025922/downloads/19690025922.pdf | 21320775533870bc42c4d00ec2706c02e547acebce0b0ba223b579babdae3b3a | 4352126 | 88 |

Every page of every file is one scanned image at 300 ppi (checked with
`pdfimages -list`): colour JPEG for TN 4300 and RM L57C18, 1-bit CCITT or
8-bit grey for TM X-19, 1-bit CCITT for the TN D-5392 tables and colour JPEG
for its figure 1. 300 dpi is therefore the highest resolution the scans
support. I worked on the native page images, extracted without resampling
(`scripts/extract.py`; pages that carry a /Rotate of 90 were turned by the same
lossless pixel rotation the viewer applies). All pixel coordinates below are
native 300-dpi pixels of those images. For viewing I enlarged crops 2 to 16
times (nearest-neighbour or Lanczos); enlargement was for the eye only,
calibrations and centres were computed on native pixels with sub-pixel fits.
The TM X-19 figure 5 page holds a landscape figure; I rotated that page image a
further 90 deg clockwise to read it, and its pixel coordinates refer to the
rotated image (3051 x 2208).

The session container restarted part way through (the coordinator's notice
said about 03:08 UTC). My files were kept; I re-hashed the four PDFs after the
restart and the hashes were unchanged.

## 2. What I opened, in order (rule 10)

1. `sq-readers/brief.md`.
2. NTRS citation API records for 19930085034, 19930089669, 19980223601,
   19690025922 (title and download link only), then the four PDFs.
3. `pdfinfo` and `pdfimages -list` of all four PDFs (page sizes, rotation,
   image resolution).
4. Text layers (`pdftotext`) of all four PDFs, written to `B/text/` and used
   only to find pages and to read running text; every number I report was
   checked on the page image (see 4.4 for the tables).
5. TN 4300: first lines of the text layer of pages 1 to 40; 50-dpi overview
   renders of all 40 pages, of which I looked at contact sheets of pages 24 to
   31 and 32 to 40; text layer of pages 3 to 9 in full and pages 10 to 23 by
   keyword search.
6. TN 4300 page images (300 dpi): 24 (table I), 27 (figure 3), 31 (figure 7),
   40 (figure 16), 29 (figure 5) extracted; 24, 27, 31, 40 viewed in crops.
7. RM L57C18: text layer of pages 1 to 14 in full, page 15 (table I) and page
   16 (table II); 40-dpi overview renders of pages 13 to 28 (contact sheet);
   page images 15, 16, 17, 18, 22, 23, 24, 25, 26, 27 extracted; 15, 16, 17,
   18, 23, 24, 25, 27 viewed in crops (22 and 26 only in the contact sheet);
   caption lines of pages 22 to 27 from the text layer.
8. TM X-19: text layer of pages 1 to 14; 40-dpi overview renders of all 25
   pages (contact sheet of 3 to 25); page images 5, 15, 20 extracted and viewed.
9. TN D-5392: first lines of the text layer of all 88 pages; text layer of
   pages 3 to 10; page images 6, 67, 68 extracted (67 viewed, 68 not viewed);
   page image 13 and its text layer; page images 31 and 49.
10. After the restart: TN 4300 pages 24, 27, 31, 40 again, then 28 (figure 4),
    26 (figure 2), 29 (figure 5), 11 (text crop); TN D-5392 pages 13, 31, 49,
    6, 67 again; TM X-19 pages 20, 15, 4, 5; RM L57C18 pages 23, 24, 25, 27,
    17, 18, 16, 15, 3, 7.

Pages read for each report (300 dpi in all cases): TN 4300 pages 3 to 23
(text), 24, 26 to 29, 31, 40; RM L57C18 pages 3 to 12 (text), 15 to 18, 22 to
27; TM X-19 pages 3 to 13 (text), 4, 5, 15, 20; TN D-5392 pages 3 to 10
(text), 13, 31, 49, 67.

Disclosure: while reading RM L57C18 for its conditions I saw the text layer of
its table II (page 16), which also tabulates C_p at alpha 0 for every station.
That was before I measured figure 5. The figure 5 values were then found by
template fitting on the image (section 4.3) and were not compared with or
adjusted to table II. I used table II only for the printed station positions
s (checked on the page image), which I quote in the notes.

## 3. Axis calibration (every figure)

Method (`scripts/gridfit.py`): every labelled grid line was tracked along its
length in 30 or 40 px segments; in each segment the median darkness profile
across the line gave a sub-pixel centre (3-point parabola); a straight line was
fitted to the segment centres (outliers over 2 px dropped). Track rms per line
was 0.03 to 0.9 px. The intersections of all labelled vertical lines with all
labelled horizontal lines were fitted with one least-squares affine map, whose
residuals show the scan's distortion. Values were then converted with the
local calibration: linear interpolation between the two fitted labelled lines
that bracket the point, each line evaluated at the point itself
(`scripts/pxmap.py`). The global affine conversion is kept in `work/*_vals.csv`
for comparison; it differs from the local one by up to 0.0007 in fig. 7 and
0.004 in s in RM L57C18 fig. 5.

The table lists, for each labelled tick, its fitted pixel position at the
middle of the plot and the affine residual (mean / max over all intersections,
px).

**TN 4300 fig. 7, page 31, 300 dpi.** Lines tracked y 760 to 2320, x 520 to
2080. Affine rms 0.35 px (x), 1.34 px (y), max 3.0 px.
- x/r: 0: 502.9 (-0.80/0.91); 0.1: 662.8 (0.14/0.26); 0.2: 821.9 (0.25/0.45); 0.3: 981.0 (0.40/0.55); 0.4: 1140.0 (0.42/0.49); 0.5: 1298.8 (0.24/0.50); 0.6: 1457.3 (-0.26/0.53); 0.7: 1616.3 (-0.16/0.25); 0.8: 1775.4 (-0.10/0.16); 0.9: 1934.5 (0.05/0.17); 1.0: 2093.2 (-0.17/0.25).
- p_l/p_o (right axis): 0.50: 2334.7 (-0.82/1.67); 0.55: 2175.5 (-0.74/1.63); 0.60: 2015.3 (-1.62/2.36); 0.65: 1859.1 (1.55/1.63); 0.70: 1700.6 (2.29/2.60); 0.75: 1540.1 (1.09/1.19); 0.80: 1379.6 (-0.06/0.23); 0.85: 1221.0 (0.65/0.65); 0.90: 1060.0 (-0.97/1.16); 0.95: 899.7 (-1.95/3.02); 1.00: 742.9 (0.58/1.33).
- The y residuals show the paper is not uniformly ruled (up to 3 px); this is
  why the local bracketing calibration is used.

**TN 4300 fig. 16(a), page 40.** Affine rms 0.74 / 0.54 px, max 1.37 / 1.47.
- x/r: 0: 712.8 (1.18/1.37); 0.2: 901.5 (-0.65/0.83); 0.4: 1091.7 (-0.96/1.11); 0.6: 1283.0 (-0.22/0.24); 0.8: 1473.8 (-0.01/0.13); 1.0: 1665.0 (0.65/0.74). (Ticks are labelled 0, .2, .4, .6, 8 and 1.0; the "8" is printed without its point.)
- p_l/p_o: 0.5: 1410.0 (-0.10/0.56); 0.6: 1220.7 (-0.10/0.36); 0.7: 1031.5 (0.01/0.19); 0.8: 843.1 (0.83/0.93); 0.9: 652.2 (-0.79/1.47); 1.0: 463.8 (0.15/0.48).

**TN 4300 fig. 16(b), page 40.** Affine rms 0.24 / 0.39 px, max 0.53 / 0.83.
- station: 1: 721.7 (0.31/0.53); 2: 911.9 (-0.29/0.32); 3: 1102.7 (-0.21/0.27); 4: 1293.8 (0.05/0.09); 5: 1484.6 (0.14/0.31).
- p_l/p_o: 0.92: 2507.6 (0.03/0.43); 0.94: 2317.8 (-0.23/0.48); 0.96: 2129.0 (0.46/0.50); 0.98: 1938.7 (-0.35/0.39); 1.00: 1749.7 (0.09/0.83).

**RM L57C18 fig. 5(b), page 23 (rotated page).** Affine rms 1.07 / 0.41 px, max 2.39 / 1.27.
- s, inches: 0: 584.3; 1: 872.5; 2: 1160.6; 3: 1447.8; 4: 1735.1; 5: 2024.1; 6: 2309.0; 7: 2597.4 (residuals -0.69/2.39, -0.04/1.79, 0.47/1.10, 0.23/0.58, 0.00/0.59, 1.48/2.29, -1.14/2.33, -0.30/1.44).
- C_p: -0.5: 1686.3 (-0.24/1.27); 0: 1397.9 (0.07/0.36); 0.5: 1109.5 (0.29/1.00); 1.0: 820.6 (0.03/0.45); 1.5: 531.9 (0.01/0.38); 2.0: 243.1 (-0.15/0.32).

**RM L57C18 fig. 5(c), page 24.** Affine rms 0.32 / 0.66 px, max 0.66 / 1.92.
- s: 0: 550.9; 1: 838.2; 2: 1126.2; 3: 1413.2; 4: 1701.6; 5: 1989.3; 6: 2276.4; 7: 2564.7 (residual max 0.43, 0.23, 0.22, 0.64, 0.31, 0.28, 0.51, 0.66).
- C_p: -0.5: 1774.2 (max 1.92); 0: 1487.8 (0.84); 0.5: 1199.3 (0.81); 1.0: 911.1 (0.89); 1.5: 622.9 (0.43); 2.0: 334.3 (0.87).

**RM L57C18 fig. 5(d), page 25.** Affine rms 0.99 / 0.45 px, max 2.49 / 0.98.
- s: 0: 512.5; 1: 798.4; 2: 1087.1; 3: 1375.1; 4: 1661.7; 5: 1950.2; 6: 2235.6; 7: 2523.4 (residual max 1.76, 2.49, 0.86, 0.81, 0.42, 2.02, 2.01, 1.38).
- C_p: -0.5: 1702.7 (0.98); 0: 1416.2 (0.84); 0.5: 1128.4 (0.70); 1.0: 840.7 (0.80); 1.5: 553.8 (0.45); 2.0: 266.2 (0.67).

**RM L57C18 fig. 5(f), page 27.** Affine rms 0.90 / 0.51 px, max 2.15 / 1.14.
- s: 0: 504.2; 1: 791.8; 2: 1077.8; 3: 1366.3; 4: 1653.8; 5: 1941.1; 6: 2227.7; 7: 2513.5 (residual max 1.32, 1.57, 1.55, 0.41, 0.94, 1.68, 1.27, 2.15).
- C_p: -0.5: 1726.8 (1.10); 0: 1440.6 (1.14); 0.5: 1152.4 (0.53); 1.0: 864.7 (0.99); 1.5: 577.8 (0.43); 2.0: 290.0 (0.49).

**TM X-19 fig. 5, page 20 (page image rotated 90 deg clockwise).** Horizontal
lines were tracked only outside the legend inset (x 1270 to 2140 skipped).
Affine rms 1.18 / 1.65 px, max 2.89 / 4.90.
- x/r (1.0 at the left, Leeward; -1.0 at the right, Windward): 1.0: 464.6 (-0.84/2.89); 0.8: 669.7 (0.84/2.15); 0.6: 873.5 (1.34/2.34); 0.4: 1076.2 (0.70/1.95); 0.2: 1277.4 (-1.51/2.02); 0: 1481.9 (-0.34/0.78); -0.2: 1685.0 (-0.60/1.35); -0.4: 1888.7 (-0.31/1.87); -0.6: 2092.2 (-0.13/1.28); -0.8: 2295.2 (-0.49/1.37); -1.0: 2500.4 (1.34/2.70).
- p_l/p_t,2: 0.4: 1631.2 (-0.12/1.30); 0.5: 1426.4 (-0.62/2.18); 0.6: 1221.2 (-1.45/3.18); 0.7: 1019.1 (0.74/2.19); 0.8: 816.2 (2.21/4.90); 0.9: 611.3 (1.58/3.59); 1.0: 404.4 (-0.97/1.53); 1.1: 199.7 (-1.38/2.45).
- The heavy lines of this paper are slightly bowed; the local calibration
  uses the fitted heavy lines either side of each point.

## 4. How points were read

### 4.1 Centres of symbols

1. Graph-paper lines were suppressed (`scripts/degrid.py`): the darkness
   minus the larger of a running column median and a running row median
   (window 25 to 60 px). Long straight rulings vanish, symbol strokes and
   curves stay.
2. Open symbols (circles, squares, diamonds) were located by normalised
   cross-correlation of the residual with a synthetic outline of the symbol's
   measured legend size, refined to sub-pixel with a parabola
   (`scripts/tmatch.py`). The centre is the template's geometric centre, so it
   comes from the symbol's own strokes, not from a fill or a curve.
3. Solid circles: centroid of the connected dark blob below grey 105
   (`scripts/disc.py`); bounding-box mid-points agree within 0.5 px.
4. Overlapping open symbols (TN 4300 fig. 16): iterative template fitting and
   subtraction (`scripts/clean.py`), every found outline drawn back on the page
   and checked by eye.
5. Triangles (fig. 16): the centre is the centre of the triangle's bounding
   box (the same convention as for the other symbols); the vertex-centroid
   reading is given in `alternatives`.
6. Symbols partly hidden by another symbol: centre from the visible strokes
   (for example the top of an arc plus one symbol radius); noted per point.
7. Every centre was looked at in an enlarged overlay.
8. Reading error per point (in px, converted to axis units in the note) was
   set from the visibility of the strokes: 0.5 px for clear solid symbols, 0.7
   to 1.5 px for clear open symbols, 1.5 to 4 px for overlapped or partly
   hidden ones.

A completeness scan (`scripts/scan.py`) correlated every template over the
whole plot area; every peak was either a read symbol, a legend or label
character, or an arrowhead of a "Theory" leader line.

### 4.2 TN 4300

- Table I (page 24) holds test characteristics only (no pressures), so there
  is no `tn4300_table1.csv`.
- Figure 3 (page 27) has no dimensions. Orifice dots of models D and A were
  located (blob centroids) and scaled against a least-squares circle fitted to
  each model's outline; results in `geometry.csv`. The sketch shows 21 dots for
  D and 15 for A, matching table I.
- Figure 7 (page 31): the figure overlays two quantities on one grid: the
  pressure ratio p_l/p_o (right axis, 0.50 to 1.00) falling with x/r, and the
  velocity ratio U_l/a_o (left axis, 0 to 1.00) rising with x/r. Only the
  pressure branch was read (34 symbols). Near x/r 0.94 to 0.96 the branches
  cross; I assigned symbols there by following the drawn fairings through
  them (section 5).
- Legend: solid and open circles, 4-in. model, present tests, M = 2.00;
  plain square and square with a tail, 4-in. model, Unitary tunnel, M = 2.49;
  diamond, 3-in. model, ref. 3 figure 4, M = 2.01. The text says the present
  tests' pressures are from model D (4-in.) in the 27- by 27-in. jet, and that
  solid symbols were measured by low-range differential cells on one side of
  the main ray, open symbols by higher-range instruments on the other side.
  I could not tell plain from tailed squares in the plot.
- Figure 16 (page 40): (a) p_l/p_o against x/r on the main ray of the 12-in.
  model A, runs 1 (circle), 2 (diamond), 3 (triangle); 18 marks read. (b)
  p_l/p_o at five azimuthal stations on the 75-percent radius, same symbols;
  15 points read. The faired line labelled "4'' Data" is not data and was not
  read.
- Zero incidence: TN 4300 tests are all with the face normal to the stream
  (text), so all points are alpha = 0.

### 4.3 RM L57C18

- Figure 1 (pages 17 and 18): six cone-frustum models (14.5 deg, 6.000-in.
  base, 4.115 in. long). A has a 2.5-in. radius hemispherical nose; B, C, D
  have flat faces with corner radii 1.0, 0.4, 0.1 in.; E is B with a 2.0-in.
  radius dimple; F is D with the face recessed 0.200 in. behind a 0.1-in.
  radius lip. The flat-face diameters are not printed; I scaled them from the
  drawings (rough, `geometry.csv`).
- Figure 5 (pages 22 to 27; captions checked: (a) A, (b) B, (c) C, (d) D,
  (e) E, (f) F). Read: B, C, D, F. Legend (pages 23 to 25): triangle alpha 5
  windward, circle alpha 0, square alpha 5 leeward; only the circles were
  read. Figure 5(f) has no legend and only circles; table I (page 15) says
  model F was tested at alpha 0 only, so its circles are alpha 0.
- The dashed and dash-dot lines (modified Newtonian and cone theory) were not
  read.
- Orifice locations come from the inset sketch on each figure 5 page, where
  the orifices are drawn as short double ticks on the body outline (section 5).

### 4.4 TN D-5392 tables

- Figure 1 (page 67): model 1 is the flat-face cylinder (rn/d infinity,
  rc/d 0, s1/d = s2/d = 0.500). Model 6 also has rc/d = 0 but rn/d = 1.933
  (a spherical cap), so it was not read.
- Tables I(a), II(a), III(a) (pages 13, 31, 49) are model 1 at M = 2.49,
  4.06, 4.63. Only the column headed 0 deg under "p_l/p_t,2 at alpha of" was
  read; all 74 orifices have a value in it (the 1-psi gage orifices, marked
  *, have values only at 0 deg).
- The text layer of these pages is badly garbled (for example ".?e50" for a
  value), so I did not use it for any value. Every value, orifice label,
  meridian and s/d was typed from the page image, using enlarged strips at
  3.4 to 8 times, read digit by digit.
- The line-printer digits are degraded. As a check I cut every digit of the
  three 0 deg columns at the measured character pitch (14.0 to 14.5 px) and
  clustered the 888 cells (`scripts/digcut.py`, `scripts/clsum.py`); the
  odd clusters pointed me to the cells to examine at 7 to 8 times.
- Location: s/d below 0.500 is the face, s/d above 0.500 the cylindrical
  afterbody (s2/d = 0.500 is the sharp corner; no orifice is on it).

### 4.5 TM X-19

- Figure 2 (page 15): 4.00-in. diameter, 6.50 in. long, square corner;
  orifice table typed from the image (left and right halves checked).
- Figure 5 is on page 20 (printed page 19), caption "Effect of angle of attack
  on the ratio of local pressures across the front face to the local pressure
  at the stagnation point for an angle of attack of 0 deg. M = 2.49;
  R = 0.90 x 10^6." Legend: circle 0 deg, square 7.5 deg, diamond 15 deg.
  Only the 15 circles were read. Positive x/r is labelled Leeward, negative
  Windward; at alpha 0 the sides are only labels.

## 5. Judgement calls

1. **S-shaped digits in the TN D-5392 tables.** Many digits print as an "S"
   (rounded top, open upper right). In the same columns clean 5s have a flat
   top bar with a sharp corner and clean 9s a closed loop. The S keeps the 9's
   rounded top, so I read it as 9 and give 5 as the alternative, flagged
   `ambiguous`. In 46 of 52 S cells the shape correlates better with the mean 9
   than the mean 5. One flat-topped digit (table II(a), orifice 65, first
   digit) I read as 5 (.5844) with 9 as the alternative, because its top is
   flat like the clean 5s.
2. **Other degraded digits** (tables I(a), II(a), III(a)): an A-shaped glyph
   (closed top loop, two legs) is read 8, alternative 9; a 9 with a short
   extra left stroke is read 9, alternative 8; a C-shaped glyph read 0,
   alternative 6; a glyph with a rounded top and no bottom bar read 2,
   alternative 7, and with a flat top read 7, alternative 2; a partial 3 read 3,
   alternative 7; a question-mark glyph (table II(a), orifice 48) read 9,
   alternatives 2 and 7. Open-bottomed or half 0s (several in table II(a)) are
   read 0 without a flag where no other digit fits. Each row's note names the
   digit and the reason.
3. **Printed oddities kept as printed.** Table II(a) orifice 62 has s/d .0833
   where tables I(a) and III(a) have .0800. Orifice 11 carries an asterisk in
   table III(a) only. Orifice 55 is printed at phi 90, s/d .0267, the same
   place as orifice 39, in all three tables. The label of row 28 prints with a
   broken second digit in tables I(a) and II(a) (looks like 29* or 2A*); it is
   taken as 28 from its position (table III(a) prints 28* clearly).
4. **TN 4300 fig. 7, the two solid circles at x/r 0.96** (p-scale 0.7900 and
   0.7802) sit where the rising velocity fairing crosses the falling pressure
   fairing. Following the drawn lines, the lower one continues the pressure
   curve to the solid point at x/r 0.98 (0.6922) and the upper one lies on the
   velocity curve between 0.94 (velocity point at p-scale 0.7634) and 0.98. I
   report 0.7802 as the pressure point and 0.7900 as its alternative.
5. **TN 4300 fig. 7 x/r 0.5 cluster:** a solid circle covers most of an open
   circle (only its top arc visible) and a square (only its sides and flat
   bottom visible). Their centres were placed one symbol radius from the
   visible edges; template fits give 0.9790 and 0.9757, kept as alternatives.
6. **TN 4300 fig. 7 x/r 0.75 open symbol** above the solid circle: its
   outline is between a circle and a diamond (equal template scores). Read as
   an open circle (model D, other side of the ray), alternative a ref. 3
   diamond.
7. **TN 4300 fig. 7 mark at the origin** (x/r 0, 1.00): a small closed loop in
   the plot corner, half hidden by the axes and smaller than the legend
   symbols. Read as plotted with model `unclear`, flag `untraced` (I use
   `untraced` for a mark I could not attribute to a legend entry).
8. **TN 4300 fig. 16(a) small square** near x/r 0.26 on the top frame: the
   legend has no square; read as plotted, model `unclear`, flag `untraced`.
9. **TN 4300 fig. 16(a) clusters.** At x/r about 0.75 six outlines overlap
   (two circles, two triangles, one clear diamond and a weaker diamond-like
   residue 6 px lower that may be a second diamond or a triangle's edges; its
   reading 0.9661 is an alternative). At x/r about 0.98 the symbols are
   crushed against the right frame and cannot be separated with confidence; I
   give a triangle, a tentative diamond and a circle, all flagged, with a
   second triangle-like outline (0.7387) as an alternative. The triangles at
   x/r 0.55 and 0.78 sit about 0.05 to the right of their circles and
   diamonds; read as plotted.
10. **TN 4300 fig. 16(b) position** is the station number printed on the axis
    (1 to 5); the measured x (1.01 to 5.06, triangles offset to the right) is
    in the note. The caption puts all of them at the 75-percent station.
11. **TN 4300 figure 3 positions** are scaled from a sketch and do not match
    the stations plotted in fig. 7; both are reported, the figure positions in
    the CSV, the sketch positions in `geometry.csv`.
12. **TN 4300 conditions** (total pressure about 106 lb/sq in., total
    temperature about 945 deg R) are readings of figure 5 at the marked data
    time, since neither table I nor the text gives numbers; the text says the
    conditions stayed within 1 percent of figure 5.
13. **RM L57C18 model F** is included as flat-faced: its face is flat but
    recessed 0.200 in. behind a 0.1-in. radius lip. Drop it if a recessed face
    does not count. Model E (dimple) was not read.
14. **RM L57C18 locations.** From the inset sketches: the first two ticks of B,
    C, D and F are on the straight face (the second just below the start of the
    corner arc); B's third tick and D's third tick are on the corner arc, F's
    third on the lip; the next tick of B, C, D and F is drawn exactly where the
    arc ends and the cone begins, so its location is `unclear`; the rest are on
    the cone. The "afterbody" of these models is a 14.5 deg cone, not a
    cylinder.
15. **Brief's "flat-face cylinder" in RM L57C18:** none of the six models is a
    cylinder; all are cone frusta.

## 6. Flags (summary; every row's note gives the detail)

- `tn4300_fig7.csv` (34): 23 ok, 10 ambiguous (two stacked squares at
  x/r 0.127; open circle hidden behind the solid at 0.25; open circle and
  square hidden behind the solid at 0.5; circle-or-diamond at 0.75; square
  behind the solid at 0.87; pressure-or-velocity solid at 0.96; open circle
  and square touching the solid at 0.98), 1 untraced (origin mark).
- `tn4300_fig16.csv` (33): 15 ok, 17 ambiguous (overlaps at x/r 0.5, 0.75,
  0.86, 0.94, 0.98 in (a); triangle and diamond overlapping at station 2 in
  (b)), 1 untraced (small square).
- `rml57c18_fig5.csv` (34): 30 ok, 4 ambiguous (B at s 2.36 and 2.86, circle
  on the leeward square; C at 0.75 and D at 0.87, circle squeezed between the
  windward triangle and the leeward square).
- `tmx19_fig5.csv` (15): 11 ok, 4 ambiguous (x/r 0.125, 0, -0.125, -0.25,
  circles overlapping the alpha 7.5 and 15 deg symbols near 1.0). The circle
  at x/r 0.975 (0.5648) is printed faint but is legible.
- `tnd5392_table1.csv` (74): 20 ambiguous, all S-shaped 9/5 or 8/9 glyphs.
- `tnd5392_table2.csv` (74): 42 ambiguous; this table's print is the most
  degraded.
- `tnd5392_table3.csv` (74): 3 ambiguous (orifices 10, 42, 55).
- No point was left `illegible`.

## 7. Where the brief and the PDFs differ

- TN 4300 table I (page 24) holds no Mach number, total pressure,
  temperature, Reynolds number or pressures; it lists model, diameter,
  material, run, jet size, measurements, remarks and area ratio. Conditions are
  in the text (Mach 2, sea level, Reynolds number per foot on page 11) and in
  figure 5 (page 29). TN 4300 figure 3 has no dimensions.
- TN 4300 page numbers match: table I 24, figure 3 27, figure 7 31, figure 16
  40.
- RM L57C18 table I (page 15) is the sequence of tests, not the test
  conditions; the conditions are in the text (pages 3 to 7). Figure 1 shows no
  orifices and does not give the flat-face diameters; orifice positions are in
  table II (page 16) and the figure 5 insets. Table II also tabulates C_p at
  alpha 0 and 5 deg for all six models.
- RM L57C18 flat-faced models: B, C, D (and F with a recessed face); the
  models are cone frusta, not cylinders. Figure 1 is on pages 17 and 18,
  figure 5 on pages 22 to 27 as the brief says.
- TM X-19 figure 5 is on page 20 (printed 19); figure 2 on page 15 as stated.
  No numerical pressure accuracy is stated.
- TN D-5392: figure 1 on page 67 (printed 65), tables on 13 to 30, 31 to 48,
  49 to 66, model 1 is the flat-face cylinder, all as the brief says.

## 8. Files

- `geometry.csv`, `tn4300_fig7.csv`, `tn4300_fig16.csv`, `rml57c18_fig5.csv`,
  `tmx19_fig5.csv`, `tnd5392_table1.csv`, `tnd5392_table2.csv`,
  `tnd5392_table3.csv`, this note.
- `scripts/` holds every script used (run with `python3 -I`, paths passed as
  arguments); `work/` holds the calibrations (`*_grid.json`, `*_map.json`),
  the centre lists (`*_pts.csv`, `*_tm.csv`) and their conversions
  (`*_vals.csv`); `render/` the page images; `src/` the PDFs; `text/` the text
  layers.
