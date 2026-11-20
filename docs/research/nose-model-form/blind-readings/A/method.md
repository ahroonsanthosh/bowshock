# Reader A: method note

Blind first reading of the four sets in the readers' brief (0014 10.7 (w)).
Reader A opened nothing under the repository, ran no git, did no web search, and
opened no other reader's folder. Everything was read from the original NTRS PDFs.
"Page" in every CSV means the PDF page number (1-based). The printed page number
is given in notes where it helps.

## 1. Sources

All four were fetched with curl from
`https://ntrs.nasa.gov/api/citations/<id>/downloads/<id>.pdf` (the download link
behind the citation addresses in the brief), each into its own new empty folder.

| Report | NTRS id | Local file | Bytes | SHA-256 | Pages | Scan |
| --- | --- | --- | --- | --- | --- | --- |
| TN 3716 | 19930084497 | pdfs/19930084497/19930084497.pdf | 2148283 | 0b5f1da7945b5203be19d65900270622b03ff25d7b2e591f645943c136f16f97 | 51 | bilevel CCITT, 240 ppi (some pages 300) |
| RM A53E01 | 19930087544 | pdfs/19930087544/19930087544.pdf | 22695843 | 24983fa022fced0de61bfa6f4e8c2813f868db2c9997d50cef23ef049a9aa8d1 | 41 | RGB JPEG, 300 ppi |
| TN 4233 | 19930085182 | pdfs/19930085182/19930085182.pdf | 25053005 | ab5d001895ba72462c8ecb028ed581710dc7f81c90bbfb3e79a94feef7354173 | 48 | RGB JPEG, 300 ppi |
| RM E51H17 | 19930086899 | pdfs/19930086899/19930086899.pdf | 11154898 | dfc06a390f8bb73d7a33a54b7ecdb57f273264802b259d685ea8ee15df48132f | 26 | RGB JPEG, 300 ppi |

Tools: poppler (pdfinfo, pdfimages -list, pdftotext, pdftoppm) and Python 3 run
with `-I`, with numpy and PIL. Scripts are in `scripts/`; renders in `renders/`;
the pdftotext text layers (OCR of the scans, used only to find pages and
keywords, never for values) in `text/`.

## 2. Files and pages opened, in order

1. `nose-readers/brief.md`.
2. Downloaded the four PDFs; ran `pdfinfo` and `pdfimages -list` on them (native
   scan resolution), and `pdftotext` on each whole PDF into `text/`. Listed the
   figure and table captions per page from the text layer.
3. TN 3716: text layer PDF p1-8 (layout text) to orient. Rendered PDF p1, 4, 5,
   6, 7, 21-26, 28 at 150 dpi. Viewed the images of p21 (table I), then table I(a)
   crops of p21 at 600 dpi (lanczos x1.6) and at the native 240 dpi (nearest x3),
   p26 (figure 1), p28 (figure 3) at 150 dpi, then p28 at 240 dpi (crop of the
   first data points, x3), text layer p5-7, and images of p6 and p7. p1, p4, p5,
   p22-25 were rendered but their images not viewed.
4. RM A53E01: rendered PDF p1, 3-8, 22-26 at 100 dpi. Viewed p22 (table II(a),
   (b)), p1 (cover/title), p5, p6. Text-layer keyword search over p1-21. Rendered
   and viewed p8, p9, p10 at 110 dpi, p26 (figure 1) at 200 dpi. p22 at 300 dpi:
   crops of the x/d and first three theta columns, the last rows, and the caption
   header.
5. TN 4233: rendered PDF p22-36 at 50 dpi as two contact sheets (viewed, to find
   table I(a)/(b) on p23 and figure 1 on p35). p23 at 300 dpi: header crop,
   whole-table overview at 150 dpi equivalent, row strips of the Mach column plus
   orifice columns 1-11 and 16-17 for (a) and (b), and two 2.5x row zooms
   (rows 1.031 and 1.299/1.400 of (a)). p35 at 300 dpi crop (circular model,
   figure 1). Text-layer keyword search p1-12 and p12-22. Viewed p6, p7, p8 and p18
   at 110 dpi. (p11 rendered, image not viewed; its text layer was read in the
   keyword search.)
6. RM E51H17: rendered PDF p1, 3-7, 15, 18, 19 at 100 dpi. Viewed p18 (figure 4(a)),
   p3, p4, p15 (figure 1, photograph), p16 at 150 dpi (figure 2, dimensions and
   orifice table), p5, p6, p7. Text-layer keyword search p1-14. p18 at 300 dpi gray
   for digitising, with tick-labelled 3x-4x crops around every symbol group.
   p1 and p19 rendered, images not viewed.
7. One tool status file of a background job I had started and stopped (my own
   slow circle-fit script; it held only "[killed]").

## 3. How each item was read

### TN 3716 table I(a) (PDF p21, printed 20)

A one-row table: 15 x/d stations and Cp, "alpha=0, Re=0.39x10^6 per inch",
M0=1.98. The scan is bilevel at 240 ppi with heavy character bleed; digits 2
print like "e" and 4 like "h" in this typeface (seen in 0.22, 4.06). Read cell by
cell at 600 dpi and at native resolution. The table prints no orifice numbers;
its 15 stations match orifices 1-11, 13, 15, 17, 19 of the figure 1 list, noted
per row but `orifice` left empty. Leading zeros and signs were printed (0.260,
-0.014); kept as printed.

Uncertain cells (all kept, alternatives in CSV):

- x/d 1.61: Cp 0.074; last glyph "h"-shaped, read as 4 (typeface), alt 0.076.
- x/d 2.06: Cp 0.026; the two middle digits are fused in the scan; alts 0.036, 0.028.
- x/d 2.95: Cp -0.036; last digit blotted, 6 or 8; alt -0.038.
- x/d 4.50: Cp -0.012; last digit "e"-shaped (2 in this typeface) but could be 8; alt -0.018.
- Stations 1.22, 6.28, 7.17 print as "1.ee", "6.e8", "7.1T"-like glyphs; read with
  the typeface rules and agree with the figure 1 list (not flagged, noted).
- Station 2.5 is printed with one decimal; copied as 2.5.

No illegible cells. Uncertain cells: 4 (ambiguous).

### TN 3716 figure 3 (PDF p28, printed 27)

Read separately from the table by pixel measurement, not by comparing with the
table. Rendered at 240 dpi (native). Grid lines found from row/column darkness
profiles (`scripts/grid.py`):

- x axis: 21 vertical lines every 0.5 x/d; labelled ticks x/d=0 at px 694.0,
  x/d=5 at 1452.5, x/d=10 at 2215.5. Linear fit over all 21: 0.006576 x/d per px,
  max residual 0.011 x/d.
- y axis: 12 horizontal lines every 0.04; labelled Cp .32 at py 779.0, 0 at
  1383.0, -.08 at 1533.5 (also .24, .16, .08 lines). Fit max residual 0.0006.
- Values were taken by piecewise-linear interpolation between neighbouring grid
  lines (the linear-fit values differ by at most 0.004 x/d and 0.0005 Cp).

Symbols are open circles with a centre dot ("Experiment, Re=0.39x10^6 per inch").
15 were found. Centres: a ring-fit gave a first position, then the enclosed white
interior of each circle was flood-filled and its filled centroid taken
(`scripts/holecentre.py`); all 15 enclosed with similar areas (128-158 px). The
four theory curves (lines) were not read. Read error: about +-0.02 x/d and
+-0.001 Cp (1 px = 0.0066 x/d, 0.00053 Cp; plus calibration residuals and
drafting). No ambiguous points.

### RM A53E01 table II(a) (PDF p22, printed 21)

Title from the cover (PDF p1): "Comparison of the experimental and theoretical
distributions of lift on a slender inclined body of revolution at M = 2".
Table II is model 2 (M0=1.98, Re0=0.5x10^6/inch); (a) alpha=0 has 29 x/d rows and
19 radial-angle columns 0 to 270 deg. Figure 1 states model 2 has a single
longitudinal orifice row at theta=0, and the text (PDF p5) says other angles were
obtained by rotating the model, so the theta columns are roll positions. Under
rule 7 (zero roll) only the theta=0 column was read; the other 18 columns were not
read. The typescript is clean at 300 dpi; every cell was legible. Values printed
without leading zero (.072) are written 0.072; signs kept. Station "7.55" copied
as printed; ".89" printed without leading zero.

Uncertain cells: 0.

### TN 4233 tables I(a) and I(b) (PDF p23, printed 21)

(a) "Circular cone-cylinder, 0.25-percent blockage; alpha=0": 23 indicated Mach
rows, 0.601 to 1.400. (b) "Circular cone-cylinder, 0.005-percent blockage;
alpha=0": 15 rows, .600 to 1.100. Tunnel names come from the text: 0.25 percent
is the Ames 2- by 2-foot transonic wind tunnel (PDF p6), 0.005 percent the Ames
14-foot transonic wind tunnel (appendix PDF p18). The elliptic model tables
(PDF p24 onward) were not read.

Cone orifices: per figure 1 (PDF p35) orifices 1-11 lie at x/l .082 to .994, the
shoulder is at x/l=1 (l=5.50 in.), orifices 12-15 are on the cylinder and were not
read. Orifices 16* (.385) and 17* (.688) are marked "*" in the circular-model
orifice table; the elliptic table's footnote reads "* Opposite surface" and the
text (PDF p6) says check orifices were provided on the opposite side of both
models, so 16 and 17 are flagged `check`. Stations are the figure 1 x/l values.
The first row of (a) prints leading zeros (0.090), later rows do not (.096);
all written as 0.096 style with sign kept. Read at 300 dpi from strips.

Uncertain cells:

- (a) M 1.031, orifice 3: printed .120 with a malformed middle digit; alt 0.130 (ambiguous).
- (a) M 1.400, orifice 4: .079 against .072 on both neighbours in the row; copied as printed, flagged `typo?`.
- (a) M 1.031 shows .120 at orifices 1-5; legible, no flag.

Rows: (a) 23 rows x 13 cells = 299 cells (11 cone + 2 check); (b) 15 x 13 = 195.
No illegible cells.

### RM E51H17 figure 4(a) (PDF p18, printed 16)

Title from PDF p3: "Aerodynamic characteristics of a slender cone-cylinder body of
revolution at a Mach number of 3.85". Figure 4(a) "Zero angle of attack": legend
explains open circle = meridian angle 0 deg, open square = 90 deg, plus three
theory lines (equations (2), (3), exact conical value), which were not read. No
marks the legend does not explain were found among the data (so no `untraced`
rows). Figure 4(a) prints no Mach number; the `mach` column carries 3.85 from the
text.

Calibration at 300 dpi, page slightly rotated, so an affine map was fitted
(`scripts/f4a_convert.py`) to grid lines measured in three bands each:
vertical lines every 2.5 in. (x=0 at px 378.0 near py 1270 and 375.0 near py 315;
x=20 at 1281.0; x=45 at 2408.0), horizontal lines every 0.01 Cp (Cp .04 at py
1108.0 near px 430 and 1111.5 near px 2650; Cp 0 at 1561.5 and 1565.5; Cp -.02
at 1794.0 near px 2650). Max fit residual 0.04 in. and 0.00014 Cp. Scale about
45.1 px per inch and 11 360 px per unit Cp.

Point centres: an automatic search for enclosed symbol interiors
(`scripts/holes.py`, `scripts/cluster.py`) located the symbols, but grid lines and
overlapping circle/square pairs split many of them, so every centre was then
taken by eye from tick-labelled 4x crops as the midpoint of the outer edges of
each symbol (circle about 27 px, square about 25 px across). Where the partner
symbol hides part of an outline, the centre was taken from the visible edges and
the symbol size; those rows are noted, with a larger error.

48 points read: 24 stations x 2 symbols. Figure 2 lists an orifice at x=19 in.
but no symbol is plotted there in figure 4(a). Read error: +-0.05 in.,
+-0.0003 Cp for clear symbols; +-0.08 in., +-0.0006 Cp for partly hidden ones.

Uncertain points: x about 15.0 in. (both symbols), where the circle and the square
nearly coincide and either centre could belong to either symbol (2 rows flagged
ambiguous). 22 more rows are partly hidden (noted, flag ok).

## 4. Summary of uncertain calls

| Set | Stations/points read | Ambiguous | typo? | Illegible |
| --- | --- | --- | --- | --- |
| TN 3716 table I(a) | 15 | 4 | 0 | 0 |
| TN 3716 fig. 3 | 15 | 0 | 0 | 0 |
| RM A53E01 table II(a) | 29 | 0 | 0 | 0 |
| TN 4233 table I(a) | 23 Mach rows x 11 cone orifices + 2 check | 1 | 1 | 0 |
| TN 4233 table I(b) | 15 Mach rows x 11 cone orifices + 2 check | 0 | 0 | 0 |
| RM E51H17 fig. 4(a) | 48 (24 stations x 2 meridians) | 2 | 0 | 0 |

No drag was computed and nothing was compared with any model.
