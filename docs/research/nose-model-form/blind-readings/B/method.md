# Reader B: method note

Blind reading of four NACA reports for the brief `nose-readers/brief.md`.
Nothing under the repository, no other reader's folder and no web page other
than the four NTRS PDF downloads was opened. No git was run. No drag was
computed and nothing was compared with a model.

All page numbers below and in the CSVs are PDF page numbers (1-based) of the
file named; the printed page number is given in notes where it differs.

## 1. Sources

| Report | NTRS citation | Fetched from | SHA-256 | Bytes | Pages |
| --- | --- | --- | --- | --- | --- |
| TN 3716 | 19930084497 | https://ntrs.nasa.gov/api/citations/19930084497/downloads/19930084497.pdf | 0b5f1da7945b5203be19d65900270622b03ff25d7b2e591f645943c136f16f97 | 2148283 | 51 |
| RM A53E01 | 19930087544 | https://ntrs.nasa.gov/api/citations/19930087544/downloads/19930087544.pdf | 24983fa022fced0de61bfa6f4e8c2813f868db2c9997d50cef23ef049a9aa8d1 | 22695843 | 41 |
| TN 4233 | 19930085182 | https://ntrs.nasa.gov/api/citations/19930085182/downloads/19930085182.pdf | ab5d001895ba72462c8ecb028ed581710dc7f81c90bbfb3e79a94feef7354173 | 25053005 | 48 |
| RM E51H17 | 19930086899 | https://ntrs.nasa.gov/api/citations/19930086899/downloads/19930086899.pdf | dfc06a390f8bb73d7a33a54b7ecdb57f273264802b259d685ea8ee15df48132f | 11154898 | 26 |

Each PDF sits alone in `B/pdfs/<ntrs id>/`. Scripts are in `B/scripts/`
(run with `python3 -I`), rendered images in `B/img/`, text layers in `B/text/`.

Native scan resolution (from `pdfimages -list`): TN 3716 text pages 300 ppi
bilevel, its table and figure pages 240 ppi bilevel (CCITT); the other three
reports are 300 ppi JPEG page images (Acrobat Paper Capture, with an OCR text
layer).

Tools: curl, pdfinfo, pdfimages, pdftotext, pdftoppm (poppler), Python 3 with
PIL and numpy. Images were viewed as PNG crops; the dpi given is the
pdftoppm render resolution, and crops were sometimes enlarged further
(factor given below).

## 2. What I opened, in order

1. `nose-readers/brief.md`.
2. Downloaded the four PDFs; ran pdfinfo and sha256sum on each.
3. `pdftotext -layout` of all four PDFs into `B/text/`. The OCR text was used
   only to find pages and to read prose; every number taken from prose was
   checked on the page image except where noted.
4. TN 3716: text-layer page list; p. 21 and p. 22 at 100 dpi (whole page);
   p. 21 at 600 dpi, crops of table I(a) at 1x and 2x; extracted the native
   240 ppi image of p. 21 (stored mirrored, not used further); a crop of the
   table I(b) station column on p. 21 (looked at, not used); p. 26 (fig. 1)
   and p. 28 (fig. 3) at 100 dpi; p. 28 at 300 dpi (gridline detection, a 1.2x
   crop of the left half of the plot, then automatic symbol detection);
   text layer of pp. 4 to 8; pp. 6 and 7 at 150 dpi (crops); p. 26 at 240 dpi
   (crops of drawing and orifice table); pp. 2 and 5 at 110 dpi (crops).
5. RM A53E01: text-layer page list; pp. 20 to 22 at 80 dpi (p. 22 viewed);
   p. 22 at 300 dpi, crops of the table II(a) heading and the station and
   theta = 0 deg columns at 1x and 2x; text layer of pp. 2, 5, 6, 7, then
   keyword search for tip/shape words over pp. 1 to 19, text layer of pp. 8, 9;
   p. 6 at 150 dpi (crop); p. 26 (fig. 1) at 100 dpi; pp. 8, 9 at 150 dpi
   (p. 9 crop viewed); pp. 5 and 2 at 110 dpi (crops).
6. TN 4233: text-layer page list and first lines of pp. 23 to 35; p. 23 at
   300 dpi (whole page at 0.3x, then ten 1x crops covering table I(a) and
   I(b)); p. 35 (fig. 1) at 300 dpi (0.33x whole page, 0.75x crop of the
   circular model); text layer of pp. 3, 6, 7, 8, 11; keyword search for
   blockage/14-foot/Reynolds; text of p. 18; pp. 7, 8, 18, 6 at 100 dpi (crops).
7. RM E51H17: text-layer page list; p. 18 (fig. 4(a)) at 300 dpi (0.33x whole
   page, gridline detection, 1x crops of both halves of the data region,
   4x and 5x crops of overlapping symbols); text layer of pp. 3 to 7;
   pp. 3, 4 at 110 dpi (crops); p. 16 (fig. 2) at 200 dpi (0.55x); keyword
   search for accuracy/uncertainty words in RM E51H17 and RM A53E01 text.

No other page of any report was opened as an image.

## 3. How each item was read

### 3.1 TN 3716 table I(a) (PDF p. 21, printed p. 20) -> `tn3716_table1a.csv`

The table is a two-row strip: x/d over Cp, 15 columns, alpha = 0 deg,
Re = 0.39x10^6 per inch, M0 = 1.98. Read from a 600 dpi render of the 240 ppi
bilevel scan, enlarged 2x. The scan is coarse and digits are blobby: the 2
prints like "e", the 4 like "h", 17 like "IT". Values were typed as printed
(Cp to three decimals with leading 0; station 2.5 printed with one decimal).
The table gives no orifice numbers, so `orifice` is empty; the note gives the
fig. 1 orifice number of the matching station (orifices 12, 14, 16, 18, 20 to 23
are not in table I(a)). Cp reading error: +-0.0005 (last printed digit);
stated uncertainty +-0.005 (p. 7).

Uncertain cells:
- x/d 0.22, Cp 0.260: the middle digit is a closed blob; 0.280 possible.
- x/d 0.89, Cp 0.165: last digit partly broken; 0.163 possible.
- station 1.22: digits after the point are a blob (1.28 or 1.23 possible);
  fig. 1 prints 1.22 for orifice 4.
- x/d 2.06, Cp 0.026: last digit partly filled; 0.028 possible.
- station 2.95: last digit broken (2.93, 2.97 possible); fig. 1 prints 2.95.
  Cp -0.036 there: last digit broken; -0.038 or -0.035 possible.
- station 3.62: blotted (3.68 or 3.82 possible); fig. 1 prints 3.62.
No cell was illegible.

### 3.2 TN 3716 fig. 3 (PDF p. 28, printed p. 27) -> `tn3716_fig3.csv`

Read from the plot alone, by script (`scripts/digitize.py`, config
`scripts/tn3716_fig3.json`), not from the table.

Axis calibration, 300 dpi render of p. 28 (pixel = column or row of the
gridline centre, found from dark-pixel profiles in `scripts/lines.py`):
- x (x/d): 0 at px 867.5, 1 at 1057.5, 2 at 1247.5, 5 at 1815.5, 8 at 2387,
  10 at 2769 (20 gridlines at 0.5 spacing used); linear fit
  x/d = 0.00526313 px - 4.56193, max residual 0.012.
- y (Cp): -0.08 at row 1921, 0 at 1729.5, 0.08 at 1540, 0.16 at 1352.5,
  0.24 at 1161, 0.28 at 1066.5 (gridlines every 0.04; 0.20 and 0.32 hidden by
  the legend box); Cp = -0.00042184 px + 0.729944, max residual 0.0006.

Point centres: the experimental symbol is an open circle with a centre dot
(legend: Experiment, Re = 0.39x10^6 per inch). A ring template (radius 7 to 13 px,
ring minus inner-ring darkness, plus centre dot) was scanned over the plot;
the 16 maxima with score above 1.19 were the 15 data circles and the legend
circle (legend dropped). Each centre was refined on a 0.25 px grid and taken
as the mean of positions within 0.03 of the best score (plateau 2 to 4 px wide).
Error: +-0.02 x/d and +-0.003 Cp (plateau width, line thickness, drafting).
15 points; none hidden, none ambiguous. Theory curves were not read.

### 3.3 RM A53E01 table II(a) (PDF p. 22, printed p. 21) -> `rma53e01_table2a.csv`

Title of report (p. 2): "Comparison of the experimental and theoretical
distributions of lift on a slender inclined body of revolution at M = 2".
Table II is model 2 (the model with nose orifices), M0 = 1.98,
Re0 = 0.5x10^6/inch; part (a) is alpha = 0 deg. It has 29 stations (x/d) and
19 columns of radial angle theta = 0 to 270 deg. Fig. 1 (p. 26) says model 2
has a single longitudinal orifice row at theta = 0, and the text (p. 5) says
circumferential distributions were obtained by rotating the model in 15 deg
steps. The theta columns are therefore roll positions, and under rule 7 only
the theta = 0 deg (zero roll) column was read. The other 18 columns at
alpha = 0 were not read. If the coordinator meant every theta column, they
are on the same page and easy to read (typewritten, clear).

Typewritten and clear at 300 dpi, 2x crop. Stations are printed as in the table
(".89" without leading zero, others with). Cp reading error +-0.0005; stated
uncertainty +-0.004 in the plane of symmetry (p. 6). No ambiguous or illegible
cell. Only remark: a faint speck above the first 0 of ".002" at x/d 9.78; not a
digit.

### 3.4 TN 4233 tables I(a) and I(b) (PDF p. 23, printed p. 21) -> `tn4233_table1a.csv`, `tn4233_table1b.csv`

Part (a): circular cone-cylinder, 0.25-percent blockage, alpha = 0 deg, 23 rows
of indicated Mach number (0.601 to 1.400). Part (b): circular cone-cylinder,
0.005-percent blockage, alpha = 0 deg, 15 rows (.600 to 1.100). The table
headings do not name the tunnel; the text names the 2- by 2-foot tunnel with
0.25 percent blockage (p. 6) and the 14-foot tunnel with 0.005 percent
(appendix, p. 18), and that is what the `tunnel` column records.

Orifices read: 1 to 11 (on the cone: fig. 1, p. 35, gives x/l = .082 to .994,
all less than 1; orifice 12 is at 1.043 on the cylinder) and the check orifices
16 and 17 (opposite surface, x/l .385 and .688), flagged `check`. Orifices 12
to 15 were not read. The table prints no stations, so `station` is the fig. 1
x/l. Mach numbers kept as printed (first row with leading 0, others without).

Read from a 300 dpi render, 1x crops, each crop overlapping the next by one
row so every row was seen twice. Typewritten, clear; 494 cells, none ambiguous
or illegible. The Mach value 1.040 in part (a) has a raised speck after the 0.
Cp reading error +-0.0005; stated random uncertainty +-0.002 (p. 8).

### 3.5 RM E51H17 fig. 4(a) (PDF p. 18, printed p. 16) -> `rme51h17_fig4a.csv`

Title (p. 3): "Aerodynamic characteristics of a slender cone-cylinder body of
revolution at a Mach number of 3.85". Fig. 4(a): zero angle of attack,
pressure coefficient against axial station x (in.). Legend: open circle =
meridian angle theta 0 deg, open square = theta 90 deg, and three theory
lines (equation 2, equation 3, exact conical value), which were not read.
Both symbol kinds are explained by the legend and are measured points at
alpha = 0, so both were read; theta is in the note. No marks the legend does
not explain were found in the data area, so nothing is `untraced`.

Axis calibration, 300 dpi render of p. 18 (page is landscape, 3092 x 2350 px;
threshold grey < 180 for gridlines):
- x (in.): 0 at px 378.5, 5 at 604, 20 at 1281, 45 at 2408 (19 gridlines at
  2.5 in. used); x = 0.0221672 px - 8.39005, max residual 0.025 in.
- y (Cp): 0.04 at row 1109.5, 0.02 at 1336.5, 0 at 1564, -0.02 at 1789
  (7 gridlines at 0.01); Cp = -8.8244e-5 px + 0.13791, max residual 0.0001.

Point centres: approximate positions picked by eye on 1x crops; then refined
by script (`scripts/symfit.py`, configs `scripts/e51_fig4a.json` and
`scripts/e51_fig4a_half.json`, results in `scripts/e51_fit*.json`): circle ring
template radius 11 to 14 px, square perimeter template half-side 9.5 to 12.5 px,
0.5 px grid, centre = mean of positions within 0.03 of the best score.
Read error: +-0.07 in. in station, +-0.0005 in Cp for clear symbols.

24 circles and 24 squares were found. Fig. 2 (p. 16) lists 25 orifice stations,
including both 19 and 19.5 in.; the figure shows one symbol pair near 19.5
(read 19.53 to 19.56) and nothing at 19.0, so one listed station has no plotted
point (or it is hidden); I did not infer which.

Ambiguous (overlapping symbols, error +-0.001 in Cp): at x about 6, 9, 11, 12,
15, 18, 19.5, 29, 33 and 37 in. the circle and square touch or overlap. For
these I also fitted only the half of each symbol away from the other one. Where
the half fit differs from the full fit by 0.0003 or more, the other value is in
`alternatives`: circle at 6.03 (0.0339, alt 0.0334), circle at 19.56 (0.0298,
alt 0.0295), circle at 29.00 (cp -0.0077 from the half fit and a manual edge
reading at 5x, alt -0.0080 from the full fit, which was pulled by the square's
edge). At 15.02 in. circle and square are drawn on top of each other and both
read 0.0316.

## 4. Geometry and conditions (`geometry.csv`)

Every row gives its page. Each value was checked on the page image except the
TN 3716 tunnel name, nose shape (checked, p. 5) and RM E51H17 Cp uncertainty
(none found; I searched the text layer for accuracy, uncertainty, precision,
error and +- and read pp. 3 to 7, so a statement elsewhere that the OCR missed
cannot be ruled out). Points to note:
- RM A53E01: the summary (p. 2) says Reynolds number approximately 0.5x10^6
  based on body diameter; the Tests text (p. 5) and the table II heading say
  0.5x10^6 per inch. Both recorded.
- RM A53E01, model shape (p. 9): slope deviation from the theoretical contour
  about 0.25 deg at x = 2.7d and 0.12 deg at x = 1.4d (contour projector); the
  text says the model nose angle is slightly smaller than assumed in theory,
  explaining low Cp for x/d < 1. No tip radius or bluntness is given.
- TN 3716: the summary calls the nose a circular-arc ogive, the Model text a
  tangent ogive; fig. 1 gives ogive radius 9.25d and l_n = 3d.
- TN 4233: Reynolds number 2.4x10^6 on the 5.50 in. cone length is stated for
  "the test" (p. 7); the text does not give a separate value for the 14-foot run.
- RM E51H17: Reynolds number 3.85x10^6 (summary, basis not stated) and
  1.1x10^6 per foot (p. 4); cone length 21 in. from fig. 2.

## 5. Summary of uncertain calls

| Set | Values read | Ambiguous | Illegible |
| --- | --- | --- | --- |
| TN 3716 table I(a) | 15 stations | 6 cells flagged (stations 1.22, 2.95, 3.62; Cp at 0.22, 0.89, 2.06, 2.95) | 0 |
| TN 3716 fig. 3 | 15 points | 0 | 0 |
| RM A53E01 table II(a), theta 0 | 29 stations | 0 | 0 |
| TN 4233 table I(a) | 23 Mach rows x 13 orifices = 299 | 0 | 0 |
| TN 4233 table I(b) | 15 Mach rows x 13 orifices = 195 | 0 | 0 |
| RM E51H17 fig. 4(a) | 24 circles + 24 squares | 20 points (overlaps), 3 with alternatives | 0 |
