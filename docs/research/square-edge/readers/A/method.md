# Reader A: method note

Blind reading of flat-face pressures for brief `sq-readers/brief.md`
(SHA-256 2c6d4d6b5db5559997f468670ca44b1f31932b8fef3927bb470d095985e9d67b).
All page numbers below are PDF page numbers of the NTRS files, counted from 1,
unless a note says "printed page".

## 1. Sources

| Report | Address used | File | Bytes | SHA-256 |
| --- | --- | --- | --- | --- |
| NACA TN 4300 | https://ntrs.nasa.gov/api/citations/19930085034/downloads/19930085034.pdf (NTRS record 19930085034) | src/19930085034.pdf | 20584298 | e9a7f54a97e984a23d6355cdefdda7ea21c128b51bc39bbe46c3e1219abd7ea4 |
| NACA RM L57C18 | https://ntrs.nasa.gov/api/citations/19930089669/downloads/19930089669.pdf | src/19930089669.pdf | 15366543 | a063cd07ad62a932a4b82e50c9619e90d8182c33a34481c9a65a3d170ac60d21 |
| NASA TM X-19 | https://ntrs.nasa.gov/api/citations/19980223601/downloads/19980223601.pdf | src/19980223601.pdf | 19192481 | da9598ecb9cc5e886b4cf1134b6af84e08d2a04064fb0bdcfe3083f828071afd |
| NASA TN D-5392 | https://ntrs.nasa.gov/api/citations/19690025922/downloads/19690025922.pdf | src/19690025922.pdf | 4352126 | 21320775533870bc42c4d00ec2706c02e547acebce0b0ba223b579babdae3b3a |

The brief gives the NTRS citation pages; I fetched the PDF of each record from the
download address of the same record (the citation page links to it). Fetched with
curl through the session proxy, HTTP 200, into the new empty folder `A/src/`.

Scan resolution (from `pdfimages -list`): every page of all four files is a single
scanned image at 300 dpi (RM L57C18 pages 3 to 10 report 299 x 300 dpi). TN 4300 and
RM L57C18 are 8-bit RGB JPEG scans; TM X-19 and TN D-5392 are 1-bit CCITT scans.
"Highest resolution the scan supports" is therefore the native 300 dpi image. I
extracted each page's native image losslessly (`pdfimages -j -tiff`, then rotated to
the page's display orientation by matching a `pdftoppm -r 300` render), and made all
measurements on native pixels. For looking I used nearest-neighbour enlargements
(2x to 12x) of native pixels; no measurement was taken on a resampled image.
All coordinates below are native pixels (x right, y down) of the page as displayed
(TM X-19 page 20 turned upright, see 4.4).

## 2. What I opened, in order (rule 10)

1. `sq-readers/brief.md` (hash checked).
2. Downloaded the four PDFs; ran `file`, `pdfinfo`, `pdfimages -list` on them.
3. Text layers (`pdftotext -layout`), printed to my terminal: TN 4300 pages 1 to 24;
   RM L57C18 pages 1 to 28 (this printout included table II on page 16, a table of
   C_p and h at every orifice; see section 6); TM X-19 all 25 pages; TN D-5392 pages
   1 to 14 (13 and 14 are the first table pages; the OCR there is garbled).
4. TN 4300 images: page 24 (table I), page 27 (fig. 3). (Pages 24 to 40 were rendered
   to files; I looked only at the pages named here.)
5. TN D-5392 images: page 67 (fig. 1), page 13 (table I(a)), page 31 (table II(a)),
   page 49 (table III(a)), pages 5, 6, 7 (test conditions and accuracy).
6. TN 4300 images: page 31 (fig. 7), page 40 (fig. 16), page 29 (fig. 5), page 11
   (Reynolds-number sentence).
7. (Session restart; files kept.) TN 4300 page 40 again (fig. 16).
8. RM L57C18 images: pages 17 and 18 (fig. 1), 23, 24, 25, 27 (fig. 5(b), (c), (d),
   (f)), 15 (table I), 7 (test conditions). Pages 21, 22 and 26 were rendered but not
   viewed (fig. 4, fig. 5(a) model A, fig. 5(e) model E: not flat-faced).
9. TM X-19 images: a thumbnail sheet of pages 15 to 22 (to find figs. 2 and 5;
   schlieren and shadowgraph figures and figs. 6 and 7 seen only as thumbnails),
   page 20 (fig. 5, turned upright), page 15 (fig. 2 and its table), page 4 (Mach
   variation table).
10. TN 4300 page 28 (fig. 4, construction).

Nothing else was opened: no repository, no other reader's folder, no other paper,
no NASA TR R-274. Once, a process listing (`ps`) that I ran to see why rendering was
slow showed a command line containing a path under `sq-readers/B/`; I opened nothing
there.

## 3. Tables (TN D-5392 tables I, II, III, model 1)

Model 1 is the flat-face cylinder: the fig. 1 table (page 67) gives rn/d infinite,
rc/d 0, s1/d = s2/d = 0.500, and it is the only row with both. Each table part (a)
is model 1, one page each: table I(a) page 13 (M = 2.49), table II(a) page 31
(M = 4.06), table III(a) page 49 (M = 4.63). I read the alpha = 0 deg column and the
orifice, phi and s/d columns for all 74 orifices.

How: the text layer of these pages is unusable (it reads 9 as "?", 0 as "a" and so on),
so I typed every value from the image. I cut the columns out (rules located from the
image), set them side by side at 2x, typed, then went over every row again at 4x and
looked at the pixel map of every glyph that was damaged. As a check on my typing I
ran a template comparison (`scripts/table_glyphs.py`): each digit cell of the column
is cut at fixed pitch from the decimal point and compared with the mean of all cells
I had typed with each digit; every cell where my digit was not the best match was
looked at again by eye. The s/d columns were checked the same way. Values are written
exactly as printed (leading point, four digits).

Judgement rules for damaged digits (the 1-bit scan drops thin strokes):
- A 9 whose loop is open on the right prints like an S. When the right side of the
  loop is missing for all rows between the top curl and the waist, I read 9 (the
  top is rounded and curls down, a waist bar closes the loop, the tail ends at mid
  width; this typeface's 5 has a flat top bar and a wide bottom bowl) but flag the
  value `ambiguous` with the 5 reading as the alternative.
- 8 against 9: if the lower-left stroke continues 3 or more pixel rows below the
  waist, I read 8 without a flag; if it stops within 2 rows (or there is only a
  stub and a bottom hook), the value is `ambiguous` with the other digit.
- A 0 that keeps its left side below mid-height is a 0; a 0 open at the lower left
  above mid-height (looks like ")") is `ambiguous` with 9; a "C" or "(" (right side
  missing) is `ambiguous` with 6.
- A 2 or 7 without its bottom bar: 2 if the top has a left curl; if the top has no
  curl, `ambiguous` with 7.
Each flagged row says which digit and what was seen. Rows read without doubt but with
broken glyphs say so in the note.

Positions: s/d as printed, phi as printed. Location: s/d < 0.5 face, s/d > 0.5
cylindrical afterbody (face ends at s/d = 0.5, rc = 0). Orifice numbers with * were
measured by the 1-psi differential gage (table footnote).

Things seen in the tables:
- Table II orifice 62: s/d printed .0833, where tables I and III print .0800 for the
  same orifice. Read as printed and flagged.
- Orifices 39* and 55 are both printed at phi 90, s/d .0267 in all three tables.
- Table III prints orifice 11 with *, tables I and II without.
- Orifice numbers 28 (table I) and 38 (table II) print with a broken 8; read from
  the sequence. Some phi entries print "9)" or ")" (broken 0); read 90 and 0.

## 4. Figures

### 4.1 Calibration and centring, common to all figures

Axes: least-squares fit `value = a + b*px + c*py` (one per axis; the cross term takes
up the small rotation of each scan) through the labelled ticks. A labelled tick is
taken as the printed grid line through that label, measured in two to four bands
across the plot: in each band the darkness profile across the band is median-filtered
along the band (so symbols and curves crossing do not count), high-passed, and each
line's centre found to sub-pixel by a 3-point parabola. Residuals of every labelled
sample are listed in 4.6.

These scans are not geometrically clean: TN 4300 page 31 has horizontal seams where
grid rows are dropped or shifted (the largest at y = 1945, about 4.7 px), and pages
are slightly rotated and stretched. So after the global fit I refine each value on
the printed minor grid next to the symbol (`figlib.local_value`): the minor grid
lines within about 30 to 48 px of the symbol are found (skipping the rows or columns
of the symbol itself), each is given the grid value nearest to the global fit, and a
straight line through them gives the value at the symbol centre. The minor lines are
graduations of the same axis, counted from the labelled ticks, so this is a local
calibration, not an interpolation of data. The values written are these local
values; the global-fit value of every point is kept in `work/cal/*_fit.csv`.
The largest local minus global difference is 0.0010 in p_l/p_o (TN 4300 fig. 7,
diamond at x/r 0.35, near the top where the global y residuals are largest).

Symbol centres: found from the symbol's own strokes (`figlib.symfit`). A template
of the symbol outline (circle, square, diamond, right triangle) or filled area
(solid circle) is moved over a 0.25 px lattice of centres and over sizes within
+-2 px of the symbol size measured on the page; the score is the mean darkness on
the template strokes minus the mean darkness on a guard band 2.5 to 3 px outside
(and inside) them, so grid lines crossing both cancel. The best centre is taken; the
reading error is the half-range of centres scoring within 10 percent of the best
plus the 0.25 px step, turned into value units with the local scale and combined
with the local grid-fit rms. Each point's error is in its `note`. Every fit was
checked on an overlay at 8x; where the fit was wrong I refitted with a wider search
or set the centre by eye from named strokes, and the note says so. Triangle centres:
I used the middle of the bounding box; the centroid (a sixth of the size up and
toward the right angle) is given in `alternatives`, since I do not know which point
the draftsman's template marked.

Values are written with 4 decimals in the axis units; that is finer than the reading
error, so nothing is rounded away. Reading errors per point are about 1 to 3 px.

### 4.2 TN 4300 fig. 7 (page 31): pressure distribution over the flat face

Axes: x/r 0 to 1.0 (labels every 0.1, grid 0.01, 15.9 px per 0.01); left scales
U_l/a_o and p_l/p_o share the grid (p_l/p_o 0.50 to 1.00, labels every 0.05, grid
0.005). Only the p_l/p_o points are read; the velocity points are not.

Telling pressure from velocity points: pressure points lie on the descending
fairings (p from 1.0 at the centre to about 0.69 at x/r 0.98); velocity points on
the rising fairings. Near x/r 0.96 the two families cross (see flags).

Series (legend): solid and open circle, 4-in. model D, present tests, M = 2.00
(solid: low-range cells, open: other side of the main ray, text page 8); plain and
flagged square, 4-in. model, Unitary tunnel, M = 2.49 (the flag cannot be resolved on
the plotted symbols, about 12 px); diamond, 3-in. model, ref. 3 figure 4, M = 2.01.
All points are on the face. The y-axis tick at p = 1.00 in the left band (x 560 to
700) is hidden under the curves and was left out of the fit.

Flags and what I saw:
- open circle x/r 0.25: only the lower half prints, the upper half would be above the
  top frame; centre fitted to the arc; alternative 0.9992 (centre one radius above the
  arc bottom).
- open circle x/r 0.50: upper half under the solid circle; error raised to 0.0007.
- solid circle x/r 0.50 prints square-topped; read as the solid circle (no solid
  square in the legend); not flagged.
- x/r 0.96: two solid circles at (2027.25, 1437.75) and (2029.25, 1406.00) px where
  the pressure and velocity fairings cross; one is the pressure point. I give the
  lower one (on the dashed pressure fairing, p 0.7799) and the upper one (0.7900) as
  the alternative.
- Unitary squares at x/r 0.127: the outline is 11 px wide but 17 px tall between the
  top frame line and the next grid line; read as two overlapping squares, centres set
  by eye at y 753.5 and 759.5 px (+-2.5 px); alternative 0.9964 (a single square
  centred between).
- Unitary square at x/r 0.257: partly hidden behind the solid circle to its left.
- Diamond at x/r 0.50: only its top corner shows above the solid circle; centre set
  8 px (half the diamond) below the corner, (1294.5, 809.5) px, +-2 px.
- Diamond at x/r 0.75: rounded; may hide an open circle.
- Illegible (no value): an open circle at x/r 0.75 and Unitary squares at x/r 0.5 and
  0.75. None is visible on the pressure curve; I list them only because the velocity
  distribution of the same figure shows these series at these x/r. If plotted they are
  under the solid circles.

### 4.3 TN 4300 fig. 16 (page 40): 12-in. model A

(a) p_l/p_o against x/r along the main ray, runs 1, 2, 3 (open circle, open
diamond, right triangle with the right angle at the upper right). Grid 0.01 in x/r
(9.55 px) and 0.005 in p (9.47 px). The solid line ("4-in. data") is a fairing and
was not read.

At x/r 0.75, 0.86, 0.94 and 0.98 the symbols of the three runs (up to two per run,
one from each side of the main ray) overlap into dark clusters. I looked at each
cluster on a view that keeps only the darkest pixels (symbol strokes are darker than
this page's grid), picked out each outline I could follow, and fitted its centre.
Every fig. 16(a) point is flagged `ambiguous` for this reason; another reader may
split the clusters differently. Identified: x/r 0.5: diamond, circle, triangle (a
light cluster); x/r 0.75: two triangles, two circles, one diamond; x/r 0.86: one
diamond, two triangles, one circle; x/r 0.93 to 0.95: two triangles, one circle;
x/r 0.985: one triangle. Illegible rows (no value) mark strokes of further symbols
that I could not separate: a second diamond at x/r 0.75, a small loop at 0.86, circle
arcs at 0.95, and a circle and a diamond at 0.98 (where the cluster is squeezed
against the frame and the 4-in. curve). The run-2 diamond at x/r 0.5 reads 1.0008,
just above the p = 1 line; read as plotted.

A symbol not in the legend: a small rectangle (about 26 x 17 px) hanging below the
top frame at x/r 0.26 with the curve through it. Read as plotted, flagged.

(b) p_l/p_o at the 75-percent station, stations 1 to 5, runs 1 to 3 (circle,
diamond, and a right triangle with the right angle at the upper left in this legend).
Station x scale: 0.05 station per minor line; p grid 0.001 (9.45 px). The position is
the station number; the plotted x of each symbol is in the note. Station 1 symbols sit
on the left frame line. The inset semicircle with dots is a sketch of the station
positions, not data. All 15 symbols fitted cleanly; triangles carry the centroid as an
alternative.

### 4.4 RM L57C18 fig. 5 (pages 23, 24, 25, 27)

Flat-faced models, from fig. 1 (pages 17, 18): B (1.0-in. corner radius), C (0.4),
D (0.1) and F (D with a 0.200-in. flat depression). A is a hemisphere nose and E has
a dimpled nose, so they were not read. Read: fig. 5(b) model B page 23, (c) C page 24,
(d) D page 25, (f) F page 27.

Axes: s in inches 0 to 7 (labels every 1, grid 0.02 in., 5.77 px); C_p -0.5 to 2.0
(labels every 0.5, grid 0.01, 5.77 px). Only open circles are read: the legend gives
the circle as alpha = 0 (triangle and square are alpha = 5 windward and leeward).
Fig. 5(f) has no legend; table I and the text say F was tested at alpha 0 only, and
all its symbols are circles. Theory lines (cone theory, modified Newtonian) not read.

Location: from the orifice ticks on each inset sketch, checked against the face and
corner extents derived from the printed dimensions (base diameter 6.000, length 4.115,
cone half-angle 14.5 deg, corner radius; corner arc assumed tangent to face and cone):
face edge at s = 1.161, 1.626, 1.858 in. and corner end at s = 2.479, 2.153, 1.990 in.
for B, C, D. The derived numbers are in geometry.csv marked "derived". Judgement
calls: B s 2.36 is "corner" (sketch tick at the arc-cone junction; inside the corner
by the derived extent); D s 1.75 is "face" (just inside the derived face edge); D s
1.95 is "corner"; D s 2.15 "afterbody"; F s 1.95 "corner" (on the lip of the
depression in the sketch); F s 2.25 "unclear" (lip or start of the cone). The
afterbody of these models is a 14.5 deg cone, not a cylinder; "afterbody" means the
cone.

Flags: model D s 0.88: the circle is sandwiched between the triangle above and the
square below; refitted with a wider search; `ambiguous`. Overlaps without doubt about
the circle are noted (B s 2.36 and 2.86 with squares, C s 0.75).

### 4.5 TM X-19 fig. 5 (page 20, printed page 19)

The figure is printed sideways; I turned the native page image 90 deg clockwise and
measured on that. Axes: x/r +1.0 (left, "Leeward") to -1.0 (right, "Windward"),
labels every 0.2, grid 0.01 (10.2 px); p_l/p_t,2 0.4 to 1.1, labels every 0.1, grid
0.005 (10.2 px). The grid's heavy lines (every 0.05 in x/r, every 0.025 in p) carry
the labels; I used only heavy lines for the labelled ticks (one sample, p = 0.8 in the
band x 2150 to 2250, was hit by a fairing and was left out). Only open circles
(alpha = 0, legend) are read; squares (7.5 deg) and diamonds (15 deg) and the three
fairings are not.

Position is x/r as plotted, positive toward "Leeward". The 15 read x/r values match
the 15 face orifices on the x axis of fig. 2 (|x| = 0, 0.25, 0.50, 1.00, 1.50, 1.75,
1.85, 1.95 in., r = 2.00 in.). The caption describes the ordinate as the ratio of local
pressure to the stagnation-point pressure at alpha 0; the axis says p_l/p_t,2; the text
(page 5) says p_t,2 was measured at the face-centre orifice at alpha 0.

Flags: the circle at x/r +0.975 (p 0.5648) is printed fainter than the others, lies
off the solid alpha-0 fairing (which ends at x/r 0.93, p 0.82) near the left frame,
and has a faint square and a faint diamond below it at the same x/r. Read as plotted,
`ambiguous`. Circles at x/r 0.126, -0.125 and -0.250 overlap squares; at -0.125 the two
symbols nearly coincide and print as a rounded square; read as the circle (noted).

### 4.6 Calibration record (labelled ticks, pixel positions, residuals)

Native 300 dpi. Each tick lists its pixel position along the axis in each band
measured (bands in `work/cal/*.json`).

- TN 4300 fig. 7, page 31. x: x/r = -0.310381 + 0.00062909 px - 0.00000423 py;
  44 samples, rms 0.47 px, max 1.15 px. Ticks: 0 at 498.7, 501.1, 503.4, 506.7; 0.1 at
  658.1, 661.0, 663.7, 667.0; 0.2 at 817.1, 820.1, 822.6, 826.2; 0.3 at 976.6, 979.1,
  981.7, 985.5; 0.4 at 1135.5, 1138.3, 1140.7, 1144.3; 0.5 at 1294.4, 1297.2, 1299.6,
  1302.8; 0.6 at 1452.2, 1455.9, 1458.2, 1461.0; 0.7 at 1611.2, 1615.1, 1617.3, 1620.1;
  0.8 at 1770.2, 1773.9, 1776.6, 1779.2; 0.9 at 1929.3, 1932.9, 1935.7, 1938.3; 1.0 at
  2087.9, 2091.6, 2094.3, 2097.1 (bands y 770-900, 1200-1400, 1500-1800, 2000-2300).
  y: p_l/p_o = 1.235132 - 0.00000248 px - 0.00031297 py; 23 samples, rms 1.04 px, max
  2.78 px. Ticks: 1.00 at 743.8, 738.7; 0.95 at 905.8, 900.5, 895.2; 0.90 at 1065.4,
  1060.9, 1056.2; 0.85 at 1225.9, 1222.0, 1217.0; 0.80 at 1384.6, 1380.5, 1373.3; 0.75
  at 1545.0, 1541.2, 1536.1; 0.70 at 1705.7, 1701.6, 1696.6; 0.65 at 1863.8, 1860.2,
  1855.4 (bands x 560-700, 1100-1290, 1700-1900). Ticks 0.60 to 0.50 lie below the
  y = 1945 seam and were not used (no pressure point lies there).
- TN 4300 fig. 16(a), page 40. x: x/r = -0.737463 + 0.00104910 px - 0.00000956 py;
  18 samples, rms 0.81 px, max 2.62 px. Ticks: 0 at 711.0, 713.9, 715.7; 0.2 at 898.3,
  904.0, 905.3; 0.4 at 1089.0, 1094.6, 1096.0; 0.6 at 1279.7, 1285.5, 1287.1; 0.8 at
  1470.5, 1476.5, 1478.0; 1.0 at 1661.6, 1668.0, 1669.5. y: p = 1.250064 - 0.00000423 px
  - 0.00052835 py; 17 samples, rms 0.41 px, max 0.88 px. Ticks: 1.0 at 466.4, 463.0,
  461.0; 0.9 at 656.2, 651.3, 649.8; 0.8 at 846.3, 839.8; 0.7 at 1035.0, 1030.6, 1028.2;
  0.6 at 1224.2, 1219.8, 1217.4; 0.5 at 1413.7, 1409.0, 1406.7.
- TN 4300 fig. 16(b), page 40. x: station = -2.668794 + 0.00524304 px - 0.00005338 py;
  14 samples, rms 0.27 px, max 0.42 px. Ticks: 1 at 721.4, 723.9, 725.3; 2 at 911.4,
  914.1, 915.4; 3 at 1102.2, 1104.8, 1106.1; 4 at 1293.4, 1295.9, 1297.0; 5 at 1484.4,
  1487.9 (the unlabelled right frame was left out). y: p = 1.185615 - 0.00000084 px -
  0.00010555 py; 13 samples, rms 0.57 px, max 1.06 px. Ticks: 1.00 at 1751.3, 1748.8,
  1746.8; 0.98 at 1937.5, 1935.0; 0.96 at 2131.2, 2128.0, 2125.0; 0.94 at 2320.1,
  2316.8; 0.92 at 2509.9, 2507.6, 2502.8.
- RM L57C18 fig. 5(b), page 23. x: s = -2.023045 + 0.00347395 px - 0.00000679 py; 23
  samples, rms 0.75 px, max 1.48 px. Ticks: 0 at 584.5, 585.0, 584.2; 1 at 872.7, 872.8,
  872.4; 2 at 1161.4, 1161.7, 1161.0; 3 at 1449.4, 1449.7, 1448.7; 4 at 1736.8, 1737.0,
  1736.1; 5 at 2026.0, 2026.2, 2025.2; 6 at 2311.3, 2311.8; 7 at 2599.6, 2600.0, 2598.6.
  y: C_p = 2.421622 + 0.00000018 px - 0.00173255 py; 17 samples, rms 0.50 px, max 1.46
  px. Ticks: 2.0 at 243.5, 243.1, 243.3; 1.5 at 532.2, 532.2; 1.0 at 820.8, 820.8, 820.1;
  0.5 at 1109.8, 1110.0, 1109.4; 0 at 1397.6, 1398.1, 1397.8; -0.5 at 1684.9, 1686.8,
  1686.9.
- RM L57C18 fig. 5(c), page 24. x: s = -1.920492 + 0.00347690 px + 0.00000612 py; 21
  samples, rms 0.28 px, max 0.51 px. Ticks: 0 at 549.7, 549.7, 551.5; 1 at 837.1, 836.9,
  839.0; 2 at 1124.9, 1124.7, 1127.0; 3 at 1412.0, 1411.7, 1414.0; 4 at 1700.5, 1700.0,
  1702.5; 5 at 1988.0, 1987.5; 6 at 2275.2, 2274.6; 7 at 2563.2, 2562.4. y: C_p =
  2.580978 + 0.00000011 px - 0.00173592 py; 16 samples, rms 0.65 px, max 1.70 px. Ticks:
  2.0 at 334.1, 333.9, 334.9; 1.5 at 623.1, 622.7; 1.0 at 911.6, 910.8, 910.9; 0.5 at
  1199.6, 1199.0, 1199.0; 0 at 1487.5, 1487.7; -0.5 at 1773.2, 1774.4, 1775.2.
- RM L57C18 fig. 5(d), page 25. x: s = -1.776450 + 0.00347742 px - 0.00000380 py; 21
  samples, rms 0.87 px, max 1.75 px. Ticks: 0 at 512.2, 512.8, 512.8; 1 at 798.3, 799.0,
  798.3; 2 at 1087.4, 1088.0, 1086.7; 3 at 1375.9, 1376.4, 1374.1; 4 at 1662.8, 1663.2,
  1660.2; 5 at 1951.5, 1952.0; 6 at 2237.1, 2237.6; 7 at 2525.0, 2525.3. y: C_p =
  2.460338 + 0.00000154 px - 0.00174011 py; 13 samples, rms 0.52 px, max 1.00 px. Ticks:
  2.0 at 264.3, 266.4; 1.5 at 552.2, 554.0; 1.0 at 839.9, 840.8, 840.9; 0.5 at 1127.8,
  1128.5, 1128.2; 0 at 1415.0; -0.5 at 1700.8, 1703.0.
- RM L57C18 fig. 5(f), page 27. x: s = -1.741611 + 0.00347831 px - 0.00000246 py; 21
  samples, rms 1.06 px, max 2.28 px. Ticks: 0 at 502.4, 501.5; 1 at 789.9, 789.2, 788.7;
  2 at 1076.4, 1075.6; 3 at 1365.2, 1364.4, 1362.1; 4 at 1653.0, 1652.0, 1648.9; 5 at
  1940.6, 1939.8; 6 at 2227.0, 2226.7, 2228.2; 7 at 2513.1, 2512.5, 2513.9. y: C_p =
  2.497304 - 0.00000225 px - 0.00173933 py; 11 samples, rms 1.04 px, max 1.85 px. Ticks:
  2.0 at 284.9; 1.5 at 573.0; 1.0 at 860.0, 856.8; 0.5 at 1147.8, 1148.0, 1144.3; 0 at
  1435.1; -0.5 at 1720.6, 1722.8, 1719.8.
- TM X-19 fig. 5, page 20 turned upright (3051 x 2208 px). x: x/r = 1.457382 -
  0.00098303 px - 0.00000006 py; 27 samples, rms 1.42 px, max 2.80 px. Ticks: 1.0 at
  463.5, 463.5, 466.5; 0.8 at 669.5, 668.5, 670.5; 0.6 at 873.5, 872.4, 874.5; 0.4 at
  1076.5, 1075.5, 1077.5; 0.2 at 1277.5, 1276.6, 1277.5; 0 at 1481.6; -0.2 at 1684.5;
  -0.4 at 1887.5; -0.6 at 2092.6, 2093.5, 2091.5; -0.8 at 2295.5, 2296.5, 2295.5; -1.0
  at 2501.1, 2502.5, 2500.5. y: p_l/p_t,2 = 1.195633 + 0.00000170 px - 0.00048905 py;
  24 samples, rms 1.03 px, max 2.72 px. Ticks: 1.1 at 197.5, 200.5, 201.5, 200.5; 1.0 at
  401.5, 405.5, 406.5; 0.9 at 606.5, 610.5, 612.5, 611.5; 0.8 at 810.5, 815.5, 817.5; 0.7
  at 1014.5, 1020.5; 0.6 at 1218.5, 1224.5; 0.5 at 1424.5, 1429.5; 0.4 at 1628.5, 1631.5,
  1634.5, 1633.6.

### 4.7 Sketches and other figures read for geometry

- TN 4300 fig. 3 (page 27): an undimensioned sketch. I fitted the circle outline by
  least squares (robust refit, outline rms 0.9 px) and took the centroid of every
  small dot inside it, giving r/R as drawn. Model D: 21 dots (the table I count);
  model A: 15 dots (the table I count). Thermocouple crosses and the wood-backed marks
  were excluded by size. The drawn spacing is schematic, so these numbers describe the
  sketch, not the orifices.
- TN 4300 fig. 5 (page 29): total pressure and temperature at the data time (2.0 s)
  read from the curves against their grid lines: about 106 lb/sq in. and 946 deg R. Not
  printed as numbers; marked as read from curves.
- TM X-19 fig. 2 table (page 15): typed from the image; then compared digit by digit
  with the text layer, which agrees for the location columns.

## 5. Judgement calls (summary)

1. NTRS download address used for each record (the brief names the citation page).
2. Native 300 dpi scan pixels used for all measurements; enlargements only for looking.
3. TN D-5392 values typed from the image, not the text layer.
4. Damaged-digit rules of section 3 (S-shaped 9s flagged with 5 as the alternative;
   8/9 by the lower-left stroke; 0/9 and 0/6 and 2/7 as stated).
5. Two-step calibration: least squares through labelled ticks, then local refinement
   on the minor grid around each symbol; the local value is reported.
6. Labelled samples left out of fits: TN 4300 fig. 7 p = 1.00 in the left band
   (hidden under curves) and ticks below the y = 1945 seam; fig. 16(b) right frame
   (unlabelled); TM X-19 p = 0.8 in one band (hit by a fairing).
7. Triangle centre = bounding-box middle; centroid given as alternative.
8. Overlapping clusters in TN 4300 fig. 16(a) separated by eye on a dark-stroke view;
   all points flagged; unseparated strokes listed as illegible rows.
9. Fig. 7 pressure against velocity point at x/r 0.96 decided by the dashed fairing.
10. Rows for hidden symbols (illegible, empty value) added where another part of the
    same figure shows the series at that x/r (TN 4300 fig. 7) or where strokes of
    further symbols are visible (fig. 16(a)).
11. RM L57C18 orifice locations from the inset sketches, checked against face and
    corner extents derived from printed dimensions; F included as flat-faced (flat
    recessed face; the text groups it with the flat-faced models).
12. TM X-19 page 20 turned upright before measuring; x/r sign kept as plotted.
13. Fig. 16(b) position written as the station number (the axis is categorical).

## 6. Disclosures that bear on blindness

- RM L57C18 table II (page 16) tabulates C_p at each orifice for every model at
  alpha 0 and 5. Its text-layer version was on my screen when I printed pages 1 to 16
  to find the test conditions, before I read fig. 5. I did not use those numbers: the
  fig. 5 values come only from fitted symbol centres and the grid. My fig. 5 reading
  is therefore not blind to table II. The brief does not ask for table II; the pairing
  party may want it read.
- TN D-5392 pages 13 and 14 text layer (garbled OCR) was seen before typing; values
  were typed from the image.
- Nothing from the repository, other readers or other sources was seen.

## 7. Where the PDFs differ from the brief

- TN 4300 table I (page 24) holds no pressures and no Mach number, total pressure,
  temperature, Reynolds number or accuracy: it lists model, diameter, material, run,
  jet size, measurements and model/jet area. Those conditions are in the text and
  fig. 5 (page 29). No `tn4300_table1.csv` is delivered. Fig. 3 page 27, fig. 7
  page 31, fig. 16 page 40: as the brief says. The models are thin disks on wood and
  steel backing with a square edge (fig. 4, page 28).
- RM L57C18 table I (page 15) is "Sequence of tests" (model, alpha, surface): it holds
  no Mach number, Reynolds number, pressure, temperature or accuracy; those are in the
  text (pages 3, 4, 7). The text (page 8) says "figures 5 and 6 as well as table I
  present the pressure coefficients", but the C_p table is table II (page 16). Fig. 1 is
  on pages 17 and 18 as stated; fig. 5(a) to (f) are pages 22 to 27 as stated, one model
  per page. Flat-faced models are B, C, D and F (F with a 0.200-in. flat depression);
  the afterbody is a 14.5 deg cone. No pressure accuracy is stated. Fig. 5(f) has no
  legend.
- TM X-19 fig. 2 is on page 15 as stated; fig. 5 is on page 20 (printed page 19),
  printed sideways. The fig. 5 caption calls the ordinate the ratio to the
  stagnation-point pressure at alpha 0; the axis label is p_l/p_t,2. The text says
  pressures were taken every 0.5 in Mach number from 2.49 to 4.44, but fig. 5 shows only
  M = 2.49, R = 0.90 x 10^6. No numeric pressure accuracy is stated. The model's corner
  is drawn sharp; no radius is given.
- TN D-5392 fig. 1 is page 67 (printed page 65) as stated; model 1 is the flat-face
  cylinder. The tables cover pages 13 to 30, 31 to 48 and 49 to 66 as stated, one page
  per model; model 1 is on pages 13, 31 and 49. The tables also have negative angles of
  attack (-5, -10, -15 deg), not mentioned in the brief's title of the report. Table II
  prints orifice 62 at s/d .0833 (.0800 in tables I and III).

## 8. Files

Deliverables in `sq-readers/A/`: method.md, geometry.csv, tn4300_fig7.csv,
tn4300_fig16.csv, rml57c18_fig5.csv, tmx19_fig5.csv, tnd5392_table1.csv,
tnd5392_table2.csv, tnd5392_table3.csv. Supporting: `src/` (the four PDFs),
`scripts/` (all code; `build_outputs.py` and `build_geometry.py` hold every
judgement call in code), `work/typed/` (typed table columns), `work/cal/`
(calibration configurations and results, per-point fits), `work/` (page images and
check views, about 300 MB, can be regenerated).
