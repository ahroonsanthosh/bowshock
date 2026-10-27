# NACA TN 3861 figure 17: reader B, method note

Blind second reading of figure 17 (crossflow drag of a circular cylinder), made from the brief
`f17-readers/brief.md` (SHA-256 f8606bb73f672e5e0b00fa675728f5faaad80b68d5bb8cf562309620e1409276, checked
before starting) and one copy of the report PDF that I fetched myself. Nothing in the bowshock repository, its
website, its issues, any other reader's folder or `decisions.md` was opened. No other paper, compilation or tool
quoting the figure was used.

Deliverables in this folder:

- `tn3861_fig17.csv`: the 25 plotted symbols, sorted by x.
- `method.md`: this note.
- `src/19930084664.pdf`: the PDF as downloaded.
- `scripts/`: every script used (all run with `python3 -I`, paths passed as arguments).
- `work/`: intermediate files (NTRS metadata, page image, corrected page image, calibration and measurement
  JSON, zoomed crops used for inspection).

## 1. What I opened, in order (rule 10)

1. `f17-readers/brief.md` (read in full; hash checked).
2. NTRS metadata, `https://ntrs.nasa.gov/api/citations/19930084664`, saved as `work/citation.json`. I printed the
   title and the download links, and later the author field.
3. The PDF, downloaded from `https://ntrs.nasa.gov/api/citations/19930084664/downloads/19930084664.pdf` (the
   download linked from the citation page `https://ntrs.nasa.gov/citations/19930084664`) into the empty folder
   `src/`. Response headers saved as `work/headers.txt`. Then `sha256sum`, `stat` and `pdfinfo` on it.
4. `pdfimages -list` on the PDF, printing the image lines for pages 28 to 33 only (sizes and resolutions).
5. A text-layer search of every page (1 to 33) with `pdftotext`, printing only the lines matching
   `figure 17`, `fig 17`, `17.` or `crossflow` / `cross-flow` / `cross flow`. The lines shown came from pages 2, 3, 7,
   11, 12, 13, 14, 31, 32 and 33. They included the opening words of the captions of figures 15 (page 31) and 16
   (page 32), and one sentence of the text on page 11 that mentions figure 15. I did not look at figures 15 or 16
   and used nothing from those lines.
6. Page 3, text lines 20 to 60 (the symbol list).
7. Page 12, text lines 34 to 60, and page 13, text lines 1 to 20 (the text about figure 17).
8. Page 33: the embedded scan extracted with `pdfimages -j` (`work/p33/img-000.jpg`); the page dictionary and the
   first 600 bytes of its content stream read with pypdf (`scripts/placement.py`) to get the image placement and
   the page rotation.
9. Views of page 33 only: an overview at one third scale, the legend at native scale, and zoomed crops of every
   symbol (the PNG files in `work/p33/`).
10. After the container restart (see section 11): a listing of this folder and a new SHA-256 of the PDF.
11. Page 1: only the lines matching `penland`, `technical note` or `3861`, to check the author named in the brief.

No other page was rendered or viewed.

## 2. The source

| Item | Value |
| --- | --- |
| Address | https://ntrs.nasa.gov/api/citations/19930084664/downloads/19930084664.pdf |
| SHA-256 | 4b3884fdbd75781c8707748aa906af00974f5e1a995d056c550f64f6c41f5957 |
| Size | 16,881,241 bytes |
| Server Last-Modified | Thu, 06 Aug 2020 20:18:58 GMT |
| PDF | 33 pages, producer "Adobe Acrobat 9.33 Paper Capture Plug-in", created 2013-12-05 |
| Report | NACA Technical Note 3861, "Aerodynamic Characteristics of a Circular Cylinder at Mach Number 6.86 and Angles of Attack up to 90 Degrees", by Jim A. Penland, 1957 |

## 3. The page and how it was viewed

Figure 17 is on **PDF page 33** (the last page). Its printed page number is 32, with "NACA TN 3861" in the margin.
The caption reads: "Figure 17.- Variation with crossflow Mach number of the drag coefficient of a circular
cylinder."

The page carries one JPEG scan, 2364 x 3094 px, placed to fill the 568 x 743 pt page (299.7 x 299.8 ppi, so 300 ppi
nominal), and the page has `/Rotate 90`. I took the embedded image itself, without any re-rendering, converted it to
grey levels and turned it 90 degrees clockwise (a lossless pixel transpose) so that it reads as printed. This
**page image is 3094 x 2364 px at 300 ppi** and is the image all `px` values refer to: origin at the top left, x to
the right, y down, pixel centres at whole numbers. That is the highest resolution the scan holds. For inspection I
zoomed crops up to 14 times (nearest neighbour and Lanczos).

### Axes as printed

- x: "Crossflow Mach number". Labels 0 to 8 at every whole number; grid lines every 0.5; the frame ends at 9 (no
  label). The strip from 7.5 to 9 holds only the three theory lines.
- y: "Drag coefficient, C_D" (D printed as a subscript). Labels 0, .5, 1.0, 1.5, 2.0, 2.5; grid lines every 0.25; the
  frame top is at 2.75. Above 1.75 the grid is blank right of x = 1.5, where the legend sits.

### The legend as printed

The legend is typewritten; decimal points are printed as raised dots, written here as ".".

| Mark | Text |
| --- | --- |
| long dash, short dash, long dash | Newtonian flow, ref. 1 |
| long dash, two short dashes, long dash | Grimminger's hypersonic approx., ref. 1 |
| long dash, three short dashes, long dash | Modified Newtonian flow |
| circle | Present data from force tests M = 6.86 |
| square | Present data from pressure distribution |
| right triangle, straight hypotenuse (right angle at bottom right) | Gowen and Perkins, from pressure distribution, M = 1.49 to 2.9, ref. 8 |
| right triangle with a convex quarter-round hypotenuse (right angle at bottom right) | Lord and Ulmann, from pressure distribution, M = 4.04 (unpublished) |
| dashed line | Welsh, C. J., from flight test data M = .5 to 1.3, ref. 11 |
| + | Cross indicates data obtained through crossflow study |
| arch (flat bottom, straight sides, round top) | Busemann, ref. 10 |
| diamond | Walter and Lange, from pressure distribution M = 2.48 to 4.92 ref. 9 |

In the Lord and Ulmann entry the "=" before 4.04 is printed as one heavy bar; I wrote it as "=". In the `series`
column I give the legend words verbatim apart from that, and the words "crossed" or not go in their own column.

### What the text says about figure 17 (pages 12 and 13)

The figure shows the present crossflow data with an accumulation of cylinder data from references 8 to 11; data
of reference 12 were left out because their tabulated pressures do not integrate to the drag values plotted in that
report. The crossflow data "appear to fair reasonably well within the scatter of existing low-supersonic Mach
number data". The figure also includes the drag coefficients predicted by unmodified Newtonian flow, Grimminger's
hypersonic approximation and modified Newtonian flow for an infinite Mach number. The symbol list (page 3) defines
Mc, the crossflow Mach number, as M sin(alpha).

## 4. Axis calibration

### 4.1 Rotation, skew and scan jogs

All grid lines lean: vertical lines move right by 0.0060 to 0.0075 px per px down, horizontal lines rise by 0.0075
to 0.0079 px per px to the right. The scan content is therefore turned about 0.40 degrees counterclockwise as seen, with a
non-orthogonality (shear) of about 0.08 degrees between the two sets of lines. Both are carried by the affine fit below.

Fitting each grid line separately showed a second distortion: every 372 px the scan jumps by one pixel and drifts
back in between (a sawtooth). Vertical lines all shift right by about 1 px at display rows 727, 1100 and 1472;
horizontal lines all shift up by about 1 px at display columns 504, 876, 1250, 1621, 1992 and 2366. I modelled the
offset as a straight line within each segment between jumps, using the median over all grid lines of the per-row
(or per-column) residual from each line's straight fit (`scripts/dejog.py`, model in `work/dejog_model.json`):

- x offset Dx(row): jumps of +0.97, +0.99, +0.99 px at rows 727, 1100, 1472; segment lines
  (row range, intercept, slope): (415 to 727, -0.4315, -0.000954), (727 to 1100, 0.3397, -0.000720),
  (1100 to 1472, 3.2857, -0.002540), (1472 to 1752, 4.6667, -0.002825).
- y offset Dy(column): jumps of -1.01, -0.98, -1.01, -1.02, -0.98, -1.02 px; segment lines
  (492 to 504, 2.6937, -0.002798), (504 to 876, -0.7654, 0.001979), (876 to 1250, -2.1799, 0.002318),
  (1250 to 1621, -3.1861, 0.002297), (1621 to 1992, -3.7405, 0.002103), (1992 to 2366, -5.0915, 0.002311),
  (2366 to 2684, -6.7066, 0.002586).
- What the model leaves: 0.095 px rms in x, 0.060 px rms in y.

I resampled the page image (bilinear) as corrected(x, y) = original(x + Dx(y), y + Dy(x)), so the grid lines become
straight, and did all calibration and symbol measurement on this corrected image (`work/p33/page33_dejog.png`).
The `px` column of the CSV maps each centre back to the uncorrected page image (u + Dx(v), v + Dy(u)). The
correction moves points by at most about 1 px.

### 4.2 Grid lines used

Every grid line was sampled row by row (vertical lines) or column by column (horizontal lines): at each row or
column, the darkness-weighted centroid of the line's stroke within 3 px of its expected position. Each line got a
robust straight fit (3-sigma rejection drops samples where symbols, curves or text cross it). Then one affine map
from pixel (u, v) to (Mc, CD) was fitted to all kept samples of all lines, each line given equal weight
(`scripts/calib2.py`, `work/calib_final.json`). All 19 vertical lines (Mc 0 to 9) and all 12 horizontal lines
(CD 0 to 2.75) were used, so each axis rests on far more than three labelled ticks (9 labelled x lines, 6 labelled
y lines).

Positions are on the corrected image; "Mean residual" is the line's value minus the fitted map, averaged over its
samples.

| Axis | Line value | Labelled | Samples kept | Position (px) | at | Slope | Line rms (px) | Mean residual (value) | Mean residual (px) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| x (Mc) | 0 | yes (frame) | 1295 of 1323 | 482.76 | y=1080 | +0.00754 | 0.49 | -0.0072 | -1.76 |
| x (Mc) | 0.5 | no | 1293 of 1330 | 603.27 | y=1080 | +0.00718 | 0.09 | +0.0009 | +0.23 |
| x (Mc) | 1 | yes | 1308 of 1331 | 725.40 | y=1080 | +0.00690 | 0.10 | +0.0024 | +0.59 |
| x (Mc) | 1.5 | no | 1291 of 1328 | 847.94 | y=1080 | +0.00655 | 0.13 | +0.0022 | +0.55 |
| x (Mc) | 2 | yes | 762 of 840 | 970.70 | y=1080 | +0.00688 | 0.06 | +0.0005 | +0.13 |
| x (Mc) | 2.5 | no | 786 of 832 | 1093.48 | y=1080 | +0.00657 | 0.07 | -0.0003 | -0.07 |
| x (Mc) | 3 | yes | 818 of 834 | 1215.78 | y=1080 | +0.00666 | 0.06 | +0.0004 | +0.10 |
| x (Mc) | 3.5 | no | 785 of 892 | 1338.22 | y=1080 | +0.00657 | 0.06 | +0.0007 | +0.18 |
| x (Mc) | 4 | yes | 824 of 886 | 1461.17 | y=1080 | +0.00654 | 0.06 | -0.0011 | -0.27 |
| x (Mc) | 4.5 | no | 821 of 855 | 1583.36 | y=1080 | +0.00647 | 0.06 | +0.0002 | +0.05 |
| x (Mc) | 5 | yes | 811 of 862 | 1705.84 | y=1080 | +0.00655 | 0.06 | +0.0002 | +0.05 |
| x (Mc) | 5.5 | no | 824 of 870 | 1828.17 | y=1080 | +0.00634 | 0.06 | +0.0011 | +0.26 |
| x (Mc) | 6 | yes | 790 of 858 | 1950.72 | y=1080 | +0.00605 | 0.07 | +0.0011 | +0.28 |
| x (Mc) | 6.5 | no | 824 of 858 | 2073.32 | y=1080 | +0.00615 | 0.06 | +0.0006 | +0.14 |
| x (Mc) | 7 | yes | 831 of 880 | 2195.66 | y=1080 | +0.00606 | 0.07 | +0.0013 | +0.32 |
| x (Mc) | 7.5 | no | 814 of 866 | 2318.07 | y=1080 | +0.00596 | 0.06 | +0.0017 | +0.42 |
| x (Mc) | 8 | yes | 816 of 860 | 2440.47 | y=1080 | +0.00596 | 0.07 | +0.0021 | +0.52 |
| x (Mc) | 8.5 | no | 823 of 852 | 2563.72 | y=1080 | +0.00604 | 0.07 | -0.0011 | -0.26 |
| x (Mc) | 9 | no (frame) | 1280 of 1332 | 2687.36 | y=1080 | +0.00653 | 0.16 | -0.0061 | -1.48 |
| y (CD) | 0 | yes (frame) | 2117 of 2117 | 1758.14 | x=1588 | -0.00791 | 0.74 | -0.0014 | -0.71 |
| y (CD) | 0.25 | no | 2127 of 2185 | 1636.70 | x=1588 | -0.00768 | 0.08 | +0.0012 | +0.57 |
| y (CD) | 0.5 | yes | 2128 of 2179 | 1513.97 | x=1588 | -0.00769 | 0.08 | +0.0011 | +0.56 |
| y (CD) | 0.75 | no | 2139 of 2180 | 1390.52 | x=1588 | -0.00761 | 0.07 | -0.0004 | -0.19 |
| y (CD) | 1 | yes | 2136 of 2181 | 1268.19 | x=1588 | -0.00770 | 0.07 | +0.0004 | +0.19 |
| y (CD) | 1.25 | no | 1717 of 2131 | 1144.87 | x=1588 | -0.00762 | 0.08 | -0.0009 | -0.42 |
| y (CD) | 1.5 | yes | 2020 of 2172 | 1022.72 | x=1588 | -0.00760 | 0.09 | +0.0003 | +0.14 |
| y (CD) | 1.75 | no | 340 of 352 | 899.52 | x=1588 | -0.00765 | 0.08 | -0.0008 | -0.37 |
| y (CD) | 2 | yes | 278 of 282 | 777.47 | x=1588 | -0.00757 | 0.09 | +0.0004 | +0.21 |
| y (CD) | 2.25 | no | 351 of 352 | 654.17 | x=1588 | -0.00776 | 0.06 | -0.0004 | -0.20 |
| y (CD) | 2.5 | yes | 316 of 322 | 532.29 | x=1588 | -0.00746 | 0.06 | +0.0007 | +0.35 |
| y (CD) | 2.75 | no (frame) | 2118 of 2188 | 408.91 | x=1588 | -0.00748 | 0.32 | -0.0003 | -0.13 |

The lines from CD 1.75 to 2.5 exist only between x = 0 and 1.5 (columns 492 to 844); their positions at x = 1588 px
are extrapolations of their own fits.

### 4.3 The fitted mapping (used for every reading)

With (u, v) in pixels of the corrected page image:

- **Mc = -1.935504 + 0.00408188 u - 0.00002587 v** (244.99 px per unit of Mc)
- **CD = 3.608152 - 0.00001561 u - 0.00203735 v** (490.83 px per unit of CD)

Residuals: the per-line mean residuals above have an rms of 0.0025 in Mc and 0.0008 in CD over all lines. The two
frame lines of the x axis sit about 1.5 to 1.8 px right of where the printed grid puts them (residuals -0.0072 and
-0.0061); the interior lines are within 0.0024 (0.6 px). In CD every line is within 0.0014 (0.7 px).

Checks on the choice of fit (all within the quoted errors):

- labelled lines only: Mc = -1.937570 + 0.00408439 u - 0.00002713 v, CD = 3.609556 - 0.00001559 u - 0.00203838 v;
  readings change by at most 0.0019 in Mc and 0.0008 in CD.
- interior lines only (frame lines left out): Mc = -1.933026 + 0.00408181 u - 0.00002709 v,
  CD = 3.607631 - 0.00001565 u - 0.00203666 v; readings change by at most 0.0017 and 0.0002.
- local interpolation between the two grid lines bracketing each point (each line from its own fit): differs from
  the affine reading by at most 0.0031 in Mc (the two upper-left symbols, where the 0.5 and 1.0 lines sit 0.2 to
  0.6 px off the global fit) and 0.0009 in CD. This difference is added into each point's error.

## 5. Identifying the symbols

I fixed every symbol's identity from its strokes before converting any position to a value. The Mach ranges quoted
in the legend were not used to identify anything.

- Shape: circle, square, diamond and arch are distinct at the scan's resolution (symbols are 28 to 44 px across).
  The two right triangles were told apart by the hypotenuse: straight for Gowen and Perkins, a convex quarter circle
  for Lord and Ulmann, checked on 7x to 14x zooms of every triangle (symbols 1, 2, 3, 8 are curved; 4, 9, 12 are
  straight).
- Crossed or not: a cross is one vertical and one horizontal stroke inside the symbol, through its middle, ending at
  the outline (they overshoot by a pixel or two at most). Grid lines also cross some symbols; they were told apart
  because they continue outside the symbol and lie on the fitted grid positions. Where a stroke inside a symbol lay
  on a grid line, I compared that line's width, darkness and centroid inside the symbol with the same line just
  outside it: a cross stroke on top of a grid line adds ink and shifts the centroid (`scripts/m_overlap.py`,
  `scripts/gridload.py`, `scripts/strokeprof.py`).
- The solid faired lines are broken off at several symbol outlines (seen at symbols 8, 14 and 23), so a stroke
  inside those symbols is not a faired line passing through. Where a faired line does run across a symbol (diamond
  10), I followed it across on the zooms.
- Inventory: after masking the fitted grid lines I listed every remaining ink component in the plot
  (`scripts/inventory.py`). Apart from the 25 symbols there are only lines and legend text.

Not read, because they are lines and not plotted symbols (rule 8):

- The Welsh, C. J. flight-test data, which the legend gives as a dashed line, not as symbols. It runs between about
  Mc 0.5 and 1.3, with a small peak near Mc 0.68, a dip near 0.8 and a high peak near 0.95. Its turning
  points are drawn as small open arcs (no flat bottom, about 18 px wide), part of the dashes. They are not Busemann
  arches, which are closed with a flat bottom and about 29 px wide.
- The three theory lines (Newtonian, Grimminger, modified Newtonian), drawn as horizontal segments from Mc 7.5 to 9.
- The faired lines not named in the legend: an upper solid line joining circle 6, the crossed circles and circle
  24; a lower solid line from square 7 past the diamonds and squares to square 25; and a short solid line from the
  inside of the Busemann arch (symbol 5) down to the lower corner of triangle 4.
- Faint grey pencil lines and faint grey "+" tick marks left of Mc 1.5 (light grey, thin, on or near grid
  lines). They are not symbols, and not crosses either: the legend's cross is drawn inside a symbol.

## 6. How symbol centres were found

All on the corrected image, from each symbol's own strokes (`scripts/measure_lib.py`, `m_tri.py`, `m_round.py`,
`m_dia2.py`, `m_gp9.py`, `m_c20b.py`, `sides.py`):

- Circles: least-squares circle fit to ring points found on rays from the centre every 2 degrees (radial window
  13.5 to 19 px), leaving out the angular sectors where the cross, grid lines, faired lines or a neighbouring square
  touch the ring; 2.5-sigma rejection. Ring fit residuals 0.11 to 0.29 px; radii 16.1 to 16.8 px.
- Squares: the centre lines of the four sides (stroke centroids along rows or columns away from crossings), centre
  at the midpoints. Where a side lies on a grid line it was separated with the grid line's own profile measured just
  outside the symbol (squares 15 and 21). Where the top edge is not drawn (it would lie inside the circle above:
  squares 21 and 23), the centre is the bottom edge minus half the mean side, 29.4 px (from squares 7, 15, 18, 25:
  29.07, 29.10, 29.73, 29.78 px).
- Diamonds: straight-line fits to the four sides on segments clear of crossing lines; the vertices are their
  intersections and the centre is the mean of the four vertices. Diamond 19 shows only its right half: its centre
  is the x of the bottom vertex and the y of the right vertex.
- Gowen and Perkins triangles: the right side and bottom from their stroke centre lines, the hypotenuse from a line
  fit; the vertices are the intersections and the reading is the **centroid of the three vertices**. Reason: the two
  triangles with a visible plotted dot (9 and 12) have it at or near the vertex centroid (0.6 px for 12), not at the
  bounding-box centre (7 to 8 px away). For triangle 4, whose hypotenuse is covered by a faired line, the top and
  left vertices come from the outer ends of the right side and bottom (these ends lie within 0.6 px of the fitted
  vertices on triangle 12).
- Lord and Ulmann symbols (all four crossed): the **intersection of the cross strokes**. The cross sits 11.8 to 13.2
  px left of the right side and 12.9 to 14.7 px above the bottom; that is close to the area centroid of a quarter
  disc with 32 px legs (13.6 px from each straight side). The bounding-box centre reading is given in the note.
- Busemann arch: midpoints of the left and right sides and of the bottom and the top of the arch.
- Cross intersections of crossed circles and squares were measured as a check: they lie 0.5 to 1.8 px from the outline centres.

Centre dots: some open symbols show the small dot of the plotted point inside them. The brief asks for the
symbol's centre from its own strokes, so the reading is the outline centre. Where a clear dot is more than 1 px from
it, the dot gives the alternative reading and the point is flagged `ambiguous`. The dots seen (in pixels, dot minus
outline centre): triangle 9 (+0.9, -1.6), triangle 12 (-0.6, +0.6), diamond 13 (0.0, -1.0), diamond 16 (-1.1, -2.5),
and a possible dot on diamond 10 (about -1.1, -2.5, half hidden by the faired line). Four of these five dots sit
above the outline centres, by 1.0 to 2.5 px (up to 0.005 in CD): the template symbols seem to have been drawn a
little low of the plotted points.

## 7. Reading errors

For each point: x_err = sqrt((sx * 0.004082)^2 + 0.002^2 + d_x^2) and value_err = sqrt((sy * 0.002037)^2 +
0.001^2 + d_y^2), rounded up to 0.001. Here sx and sy are my uncertainties in the centre in pixels (0.3 px for clean
symbols up to 0.8 to 1.0 px where a stroke is hidden or the outline is irregular; listed per symbol in
`scripts/readout.py`), 0.002 and 0.001 cover the calibration (interior line residuals), and d_x and d_y are the
local-interpolation differences of section 4.3. The errors are reading errors only. They do not include the
placement scatter between a template symbol and its plotted dot (section 6), which is shown through the
alternatives instead.

## 8. The readings

25 symbols: 14 crossed and 11 uncrossed. No point is illegible. Values in the CSV are rounded to 0.001.

| Symbol | Series | Crossed | Mc | CD | Page px | Flag |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Lord and Ulmann | yes | 0.697 | 2.450 | (647.6, 563.8) | ok |
| 2 | Lord and Ulmann | yes | 1.052 | 2.051 | (736.4, 759.4) | ok |
| 3 | Lord and Ulmann | yes | 1.402 | 1.551 | (823.6, 1004.4) | ok |
| 4 | Gowen and Perkins | no | 1.481 | 1.493 | (843.2, 1032.8) | ok |
| 5 | Busemann | no | 1.593 | 1.655 | (870.2, 952.9) | ok |
| 6 | Present, force | yes | 1.757 | 1.552 | (910.5, 1002.2) | ok |
| 7 | Present, pressure | yes | 1.753 | 1.451 | (909.9, 1051.6) | ok |
| 8 | Lord and Ulmann | yes | 2.003 | 1.511 | (971.0, 1021.8) | ok |
| 9 | Gowen and Perkins | no | 1.964 | 1.447 | (961.6, 1053.5) | ambiguous |
| 10 | Walter and Lange | no | 2.482 | 1.324 | (1089.7, 1113.4) | ambiguous |
| 11 | Walter and Lange | no | 2.835 | 1.327 | (1176.3, 1111.1) | ok |
| 12 | Gowen and Perkins | no | 2.910 | 1.340 | (1194.5, 1104.8) | ok |
| 13 | Walter and Lange | no | 3.244 | 1.302 | (1276.5, 1121.7) | ok |
| 14 | Present, force | yes | 3.440 | 1.398 | (1323.4, 1074.4) | ok |
| 15 | Present, pressure | yes | 3.451 | 1.253 | (1327.4, 1145.8) | ok |
| 16 | Walter and Lange | no | 4.187 | 1.287 | (1507.5, 1128.0) | ambiguous |
| 17 | Present, force | yes | 4.848 | 1.325 | (1669.5, 1107.5) | ok |
| 18 | Present, pressure | yes | 4.852 | 1.256 | (1670.5, 1141.5) | ok |
| 19 | Walter and Lange | no | 4.919 | 1.250 | (1686.8, 1144.2) | ok |
| 20 | Present, force | yes | 5.954 | 1.294 | (1940.5, 1121.2) | ok |
| 21 | Present, pressure | yes | 5.952 | 1.250 | (1940.0, 1143.1) | ambiguous |
| 22 | Present, force | yes | 6.633 | 1.273 | (2106.8, 1129.9) | ok |
| 23 | Present, pressure | yes | 6.645 | 1.233 | (2109.7, 1149.5) | ok |
| 24 | Present, force | no | 6.851 | 1.272 | (2160.0, 1130.2) | ok |
| 25 | Present, pressure | no | 6.845 | 1.250 | (2158.8, 1141.0) | ok |

Errors are 0.003 to 0.005 in Mc and 0.002 in CD (per point in the CSV). The symbol numbers are mine (left to right
in clusters) and appear at the start of each `note`.

## 9. Ambiguous points and what I saw

- **9 (Gowen and Perkins, uncrossed)**: its right side lies on the Mc = 2.0 grid line (separated on profiles, 2.1
  px right of the line) and its top vertex is hidden behind the bottom edge of symbol 8. A plotted dot inside lies
  0.9 px right of and 1.6 px above the vertex centroid. Alternative: x = 1.968, value = 1.450 (the dot).
- **10 (Walter and Lange, uncrossed)**: the Mc = 2.5 grid line and the lower faired line cross it. The diamond is
  drawn slightly out of square (side directions 42.6, 140.7, 47.0 and 135.5 degrees; the two diagonals' midpoints
  differ by 1.8 px in x). A small bump on the upper edge of the faired line near the centre may be the plotted dot.
  Alternative: x = 2.478, value = 1.329 (the possible dot).
- **16 (Walter and Lange, uncrossed)**: clear dot 1.1 px left of and 2.5 px above the outline centre. Alternative:
  x = 4.183, value = 1.292.
- **21 (present pressure data, square)**: its top edge is not drawn (it would be inside circle 20). A vertical stroke
  through the middle of the square runs from circle 20 down to the square's bottom edge, continuous with the
  circle's cross. The horizontal arm would lie on the CD = 1.25 grid line, where only weak extra ink shows. I read
  it as crossed. The alternative is not crossed, with the same x and value: the circle's cross line carried
  through.

Points that overlap other symbols or lines but keep one reading (details in each CSV note):

- 8: crossed. The horizontal cross stroke is plain to see. The vertical one lies on the Mc = 2.0 grid line, which
  inside the symbol is wider, darker and 1.3 px off centre; that offset position is used.
- 4: no cross strokes. The lines through it have the width and darkness of the grid lines alone.
- 11 and 12 overlap: the triangle is drawn over the diamond's right vertex.
- 15: its vertical cross stroke is clear. The horizontal arm lies on the CD = 1.25 grid line with no extra ink, as if
  the grid line served for it; read as crossed.
- 18: crossed. Its vertical stroke is continuous with circle 17's, and its horizontal stroke is seen just above the
  grid line.
- 19: only the right half is drawn (the left half is behind square 18), and that half shows no cross.
- 20: heavily overlapped (grid line, faired line, square 21); centre from the clean sectors of the ring.
- 23: top edge hidden in circle 22. It has its own vertical cross stroke (joined to circle 22's cross line by a
  kink), and a light horizontal stroke at mid-height where the faired line is interrupted.
- 24 and 25: no crosses. The top edge of square 25 runs across the inside of circle 24.

## 10. Judgement calls

1. Read the embedded scan at its own 300 ppi rather than a re-rendered page, and gave `px` in that image turned to
   the printed orientation (3094 x 2364 px).
2. Removed the periodic one-pixel scan jogs before calibrating and measuring; effect at most about 1 px.
3. Calibrated with one affine map fitted to all 31 grid lines, frame lines included, each line weighted equally;
   checked against labelled-only, interior-only and local fits (section 4.3).
4. Centre conventions per shape as in section 6: vertex centroid for the straight triangles, cross intersection for
   the quarter-round triangles, outline centre for the rest. Bounding-box readings of the triangles are in the
   notes.
5. Outline centre rather than plotted dot as the reading; the dot as an alternative when more than 1 px away.
6. Strokes hidden under grid lines located from the excess ink over the grid line's own profile.
7. Squares with a hidden top edge placed with the mean side of the clean squares (29.4 px).
8. Crossed or not decided from strokes inside each symbol; the two unclear cases are 21 (flagged) and 15 (read
   as crossed, see section 9).
9. The Welsh flight-test curve is in the legend but drawn as a dashed line with no symbols, so it was not read.
10. The legend's "M (bar) 4.04" written as "M = 4.04".
11. `value_quantity` written as "Drag coefficient, C_D" (the D is a subscript on the page).
12. The CSV rows are sorted by x. The symbol numbers in the notes are my own labels.

## 11. Interruption

The work stopped part way when the usage limit was reached, and the container restarted at about 13:22 UTC.
The files in this folder were kept. On resuming I listed the folder, checked the PDF's SHA-256 again (unchanged)
and went on with the same files and rules.

## 12. Where the brief and the PDF differ

- Author: the brief names "P. J. Penland". The title page reads "By Jim A. Penland", and NTRS lists
  "Penland, Jim A".
- The figure is on PDF page 33 as the brief says ("about PDF page 33"); its printed page number is 32. The page is
  stored rotated (`/Rotate 90`).
- The brief asks for every plotted symbol, crossed and uncrossed. The legend also has a data series shown only as a
  dashed line (Welsh, C. J., flight test data M = .5 to 1.3, ref. 11), which has no symbols and was not read.
- The brief describes the crossed points as yawed cylinders. The legend says only "Cross indicates data obtained
  through crossflow study".
- The brief speaks of pressure-integrated or force-measured drag "where the legend distinguishes them". The legend
  says "force tests" for the present circles and "pressure distribution" for the present squares, Gowen and Perkins,
  Lord and Ulmann, and Walter and Lange. For Busemann it says neither.
- The infinite-Mach theory values are drawn as horizontal lines from Mc 7.5 to 9, beyond the last x label (8). The
  frame runs to 9.
