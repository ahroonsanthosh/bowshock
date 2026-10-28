# Reader B: NACA TN 2360, figures 5 and 7, method note

## 1. Inputs and checks

- Brief: SHA-256 `9d2097a1fb52e032bc78af00f491799ec09747dbbbdcb095a1c3f8e3a5fb582e`, checked, matches.
- PDF: copied from `f5-readers/pdf/tn2360.pdf` into this folder as `tn2360.pdf`. SHA-256 computed on both
  the source and the copy: `95937173fa78bdd41e24a3caded6d06779df885263b66c23f13225a18d742a59`, matches the
  brief (also in `sha256.txt`).
- Nothing outside this folder and the pdf folder was opened. No other source of these figures' values
  was consulted.
- Tools: poppler `pdfimages`/`pdftotext`, Python 3 (always run with `-I`) with numpy, Pillow, scipy.
  Scripts are in `scripts/`, working images in `render/`.

## 2. Where the figures are

The PDF is a 26-page scan. PDF page N carries report page N-1.

| Item | Report page | PDF page |
|---|---|---|
| Figure 5(a), M = 1.5 | 21 | 22 |
| Figure 5(b), M = 2.0 | 22 | 23 |
| Figure 7 (printed landscape, one panel) | 25 | 26 |

Figure 5 has two panels, (a) and (b). Figure 7 has one panel. All three have measured symbols.

## 3. Render resolution

Each PDF page is a single embedded JPEG scan at 300 ppi. I extracted the scans unchanged with
`pdfimages -j` (page 22: 2360 x 3116 px, page 23: 2360 x 3116 px, page 26: 2366 x 3118 px) and did all
measurement on these native 300 ppi pixels, with no resampling. The figure 7 page was turned upright by a
90 degree clockwise rotation, which is a lossless pixel transpose (3118 x 2366 px). Enlarged views
(6x to 13x, nearest-neighbour, bicubic or Lanczos) were made only for looking at symbols; no coordinate
was taken from a resampled image.

Scale at 300 ppi: figure 5, 1 px = 0.00333 x 10^6 in R and 0.000335 in Pb; figure 7, 1 px = 0.00134 in M
and 0.000333 in Pb.

## 4. Axis calibration

All six axes are **linear**. None is logarithmic: in every case the labelled gridlines are equally spaced
in pixels (a straight-line fit of value against gridline position leaves at most 2.2 px residual, which is
drafting and paper irregularity, handled below by local interpolation).

Gridlines and labels used:

- Figure 5(a): x axis "Reynolds number, R", tick labels 0, 1, 2, 3, 4 x 10^6 on every second vertical
  line; 11 vertical lines from the left frame (R = 0) to the right frame (R = 5.0 x 10^6), one every
  0.5 x 10^6, spacing 147 to 151 px. y axis "Base-pressure coefficient, Pb", labels -.4, -.3, -.2, -.1, 0;
  9 horizontal lines from the top frame (-0.40) to the bottom frame (0), one every 0.05, spacing 147 to
  152 px.
- Figure 5(b): same x axis (11 lines, 0 to 5.0 x 10^6, spacing 148 to 152 px). y labels -.3, -.2, -.1, 0;
  8 horizontal lines from the top frame (unlabelled, -0.35 by the 0.05 spacing) to 0, spacing 148 to 151 px.
- Figure 7 (upright): x axis "Mach number, M", labels 1.0, 1.4, 1.8, 2.2, 2.6, 3.0, 3.4 on every second
  vertical line; 14 vertical lines from the left frame (1.0) to the right frame (3.6), one every 0.2,
  spacing 147 to 151 px. y axis "Base-pressure coefficient, Pb", labels -.4, -.3, -.2, -.1, 0; 9 horizontal
  lines from -0.40 (top frame) to 0 (bottom frame), every 0.05. The legend box blanks the -0.35 and -0.30
  lines right of M = 1.8, so those two lines were tracked over M = 1.0 to 1.8 only.

Method (pixel scan): each gridline was tracked in 30 px bands along its length. In each band the darkness
profile across the line is the median along the band (which suppresses symbols and lettering), and the line
centre is the darkness-weighted centroid of the peak nearest the prediction. A robust straight-line fit
(across = a + b * along, 3-sigma clipping) gives each line; per-line rms residuals are 0.1 to 0.6 px for
interior lines and up to about 1 px for the thick frame lines (full table in the appendix).

Two gridlines have a fairing running almost along them (figure 5(a) Pb = -0.20, figure 5(b) Pb = -0.15).
On the first pass the tracker jumped onto the fairing (rms 3.3 and 3.8 px). I re-tracked those two lines
with the prediction fixed to the mean of the two neighbouring gridlines and a +-3 px search window; the
true gridline then fits with rms 0.99 and 0.82 px, and its spacing to its neighbours becomes regular.

The scans are slightly rotated and sheared (line tilts: figure 5(a) about 0.5 to 0.8 degrees, figure 5(b)
about 0.1 to 0.3 degrees, figure 7 up to about 0.4 degrees), so no single pixel row or column is a
gridline. A symbol at pixel (px, py) is converted by evaluating every fitted vertical line at py and every
fitted horizontal line at px, then interpolating linearly between the two bracketing lines on each axis.
This uses at least two labelled or
label-derived gridlines on each axis for every point, and absorbs both the rotation and the small
unevenness of gridline spacing.

## 5. Reading the symbols

Every data symbol in both figures carries a small centre dot, also shown in the legends. I took the
**centre dot** as the plotted point.

1. Inventory. Every panel was inspected at full resolution column by column, and each symbol was
   identified by shape against its legend. Figure 5(a) and 5(b) each show 7 symbol types (x/c = 1.0, 0.6,
   0.2, -0.2, -0.6, -1.0 and Tail off) at 4 Reynolds-number stations, one of each type per station.
   Figure 7 shows 4 data symbols (2 squares, 2 circles) plus one square and one circle in the legend, which
   are keys and were not read.
2. Dot centre. An automatic finder located isolated dark blobs (22 of 28 in 5(a), plus one paper speck that
   was discarded; 21 of 28 in 5(b); 4 of 4 in figure 7); the rest, whose dots touch an outline or line,
   were located by eye on enlarged crops. Each position was then refined as the darkness-weighted
   centroid in a +-3 px window (background = local median), iterated three times.
3. Verification. Every refined position was drawn as a gapped crosshair on 7x crops (`render/verify_*.png`,
   `render/verify_7.png`, `render/over_*.png`) and checked by eye. One refinement (5(a), x/c = -0.6 at
   R about 3.26) had landed in a white gap because the starting guess was 4 px off; it was restarted from a
   corrected guess and re-verified. A full-panel overlay of all final readings (`render/overlay_*.png`)
   confirms one reading per symbol and no unread symbol.
4. Cross-check of dot against outline. For the 8 circles in figure 5, a least-squares circle fitted to the
   outline (rays every 4 degrees) has its centre 0.3 to 2.4 px from the dot (rms about 1.1 px in x, 0.9 px
   in y). The dot and the outline centre are therefore not exactly the same point on these hand-drawn
   symbols; this spread is the main part of my reading error.
5. Symbols whose dot is merged with another outline or hidden were resolved one by one on pixel maps
   (section 8), with an independent estimate from symbol templates measured on clean symbols of the same
   type in the same figure.

Lines are not data and were not read: the fairings through the figure 5 symbols, and the "Reference 4"
(dashed) and "Average of references 1,2 and 3" (solid) curves in figure 7.

## 6. Units, signs and columns in f5f7.csv

- Figure 5 x values are in units of 10^6, as the axis gives them (tick labels 0 to 4 with "x 10^6");
  `x_quantity` is "Reynolds number, R (x 10^6)". So 0.770 means R = 0.770 x 10^6.
- Figure 7 x values are Mach number as read from the plot. y values are Pb as plotted (all negative here;
  the axes run negative upward).
- `mach` is the test Mach number: from the panel title for figure 5; for figure 7 the nominal test Mach
  number (1.5 or 2.0) nearest the plotted position, while `x` holds the value read off the axis.
- `panel` is a or b for figure 5 and "single" for figure 7.
- `x_error`, `y_error`: my reading error, **one standard deviation**, in axis units. Clean symbols with a
  visible dot: 1.5 px on each axis (dot-versus-outline spread about 1.1 px rms, gridline fit and dot
  centroid about 0.3 px each), giving 0.005 x 10^6 and 0.0005 in figure 5, 0.002 in M and 0.0005 in figure 7.
  The five symbols whose dot is merged with another outline or hidden (5(a) Tail off at station 1; 5(b)
  x/c = -0.6 at stations 1 and 2; 5(b) x/c = -0.2 at stations 3 and 4): 3 px (0.010 x 10^6 and 0.0010),
  and 4 px in x (0.013 x 10^6) for the 5(b) x/c = -0.2 symbol at R about 3.31. The sixth partly-hidden
  symbol (5(b) Tail off at station 1) has a clear dot and keeps the 1.5 px error.
  These are reading errors only; the report's own stated measurement uncertainty is +-0.003 in Pb.
- `alternatives`: for each partly-hidden symbol, template-based positions in the same axis units.
  No symbol's configuration identity has a plausible alternative (see section 8), so no reading is flagged
  `ambiguous`. No symbol is illegible and none looks out of line.

## 7. Captions, legends, axis labels and text, word for word

Typewriter dashes in the report are given here as hyphens. "Pb" stands for P with subscript b.

**Figure 5, report page 21 (PDF page 22)**

- Legend heading: "Tail location, x/c". Entries: [circle with centre dot] "1.0"; [square with centre dot]
  "0.6"; [diamond with centre dot] "0.2"; [triangle, apex up, with centre dot] "-0.2"; [right triangle,
  vertical right side, straight hypotenuse rising to the right, with centre dot] "-0.6"; [quarter-round:
  vertical right side, flat bottom, curved upper-left side, with centre dot] "-1.0"; [round-topped,
  flat-bottomed symbol with centre dot] "Tail off".
- y axis: "Base-pressure coefficient, Pb"; tick labels "-.4", "-.3", "-.2", "-.1", "0".
- x axis: "Reynolds number, R"; tick labels "0", "1", "2", "3", "4 x 10^6".
- Panel title: "(a) M = 1.5".
- Caption: "Figure 5.- Variation of base-pressure coefficient with Reynolds number; cruciform tail,
  t/c = 0.10, roughness added to body."

**Figure 5 concluded, report page 22 (PDF page 23)**

- Same legend heading and entries as on page 21 ("Tail location, x/c"; 1.0, 0.6, 0.2, -0.2, -0.6, -1.0,
  Tail off).
- y axis: "Base-pressure coefficient, Pb"; tick labels "-.3", "-.2", "-.1", "0" (top frame unlabelled).
- x axis: "Reynolds number, R"; tick labels "0", "1", "2", "3", "4 x 10^6".
- Panel title: "(b) M = 2.0". Caption: "Figure 5.- Concluded."

**Figure 7, report page 25 (PDF page 26), printed landscape**

- Legend, left block, underlined heading: "With 10% thick cruci- form tail surfaces, x/c=0" (x/c set as a
  fraction). Entries: [square with centre dot] "Present tests"; [long-dashed line] "Reference 4".
- Legend, right block, underlined heading: "Without tail surface". Entries: [circle with centre dot]
  "Present tests"; [solid line] "Average of refer- ences 1,2 and 3".
- y axis: "Base-pressure coefficient, Pb"; tick labels "-.4", "-.3", "-.2", "-.1", "0".
- x axis: "Mach number, M"; tick labels "1.0", "1.4", "1.8", "2.2", "2.6", "3.0", "3.4".
- Caption: "Figure 7.- Comparison of present base-pressure data with previous results."

**Text about what the figures show, Reynolds numbers, support and boundary layer**

- Report page 1 (PDF 2), Summary: "Wind-tunnel tests were performed at Mach numbers of 1.5 and 2.0 to
  investigate the influence of tail surfaces on the base drag of a body of revolution without boattailing
  and having a turbulent boundary layer."
- Report page 2 (PDF 3), Notation: "c tail chord"; "l body length". Report page 3 (PDF 4): "M Mach number";
  "Pb base-pressure coefficient ((pb - po)/qo)"; "R Reynolds number (Vo l/v)" [v is the Greek nu,
  kinematic viscosity]; "t maximum tail thickness"; "x distance of tail trailing edge forward of base
  (See fig. 2(a).)".
- Report page 4 (PDF 5), Model and Support: "The model was attached to the balance by means of a
  1/2-inch-diameter, 5-inch-long support sting which was an integral part of the body. The ratio of the
  support to body diameter was 0.4 and the support length was four times the body diameter. This design
  was selected on the basis of the results of references 1 and 6 which indicate that, with this support
  configuration, the effects of support interference on the base pressure of the body are small."
- Report page 4 (PDF 5): "Four 0.03-inch-diameter pressure orifices were located 1/32 inch behind the
  body base. These orifice holes were drilled radially into the sting at 45° from the planes of the tail
  fins and were connected to a common base-pressure line."
- Report pages 4 to 5 (PDF 5 to 6): "For the short model length, which was used in all the tests for which
  data are presented herein, the intersection with the dead-air region of the reflected bow wave at a Mach
  number of 1.5 occurred at approximately 2.6 diameters downstream of the base."
- Report page 5 (PDF 6), Tests: "Tests at zero angle of attack were conducted with the body alone and with
  both plane- and cruciform-tail configurations mounted on the body at various longitudinal positions. The
  body-tail combinations were tested with both 5- and 10-percent-thick tail sections. In general, the
  configurations tested employed the short body (7.656 in. long) with a 1/4-inch-wide salt band placed on
  the ogival nose to insure local transition to a turbulent boundary layer. However, several runs were made
  with the long body (9.562 in. long) at M=2.0 (where no effects of shock-wave reflections exist) to
  determine whether or not the effect of the body-nose pressure field on the base-pressure was
  appreciable. Additional tests with the body nose smooth were made to investigate the effect of the type
  of boundary layer approaching the base."
- Report page 5 (PDF 6): "Base-pressure measurements were made by means of the orifices in the sting at
  tunnel total pressures corresponding to a Reynolds number range of 0.5 x 10^6 to 4.5 x 10^6 at Mach
  numbers of 1.5 and 2.0."
- Report page 5 (PDF 6): "The results of these pressure-distribution tests indicate that the average
  deviation from the mean base-pressure coefficient was ± 0.003, which, as shown later, is equal to the
  uncertainty in the base-pressure measurements. All base-pressure coefficients have been corrected for
  the effect of axial static-pressure variation in the wind-tunnel stream." And: "It is estimated that the
  total uncertainty in the measured base-pressure coefficient is ± 0.003."
- Report page 7 (PDF 8), Results and Discussion: "The principal results of the investigation are
  presented in figures 5 and 6. Figure 5 shows the variation of base-pressure coefficient with Reynolds
  number for various selected tail locations." And: "The experimental base-pressure increments given in
  figure 6 correspond to the maximum Reynolds number of the tests, 4.5 million."
- Report page 8 (PDF 9), Effects of Reynolds Number: "Limited tests of the model with smooth surfaces
  showed that the base pressure of the body alone decreased continuously with increasing Reynolds number,
  indicating a laminar boundary layer approaching the base. For the body in combination with the tail
  surfaces, the base-pressure coefficient was essentially independent of Reynolds number but was larger in
  absolute magnitude by about 0.03 than the corresponding values for roughness added near the nose of the
  body. From the indications of these results, it is believed that the tail surfaces induced partial
  transition of the body boundary layer, as expected."
- Report page 8 (PDF 9): "The condition of most practical interest is one in which the flow approaching
  the base has a fully developed turbulent boundary layer. The results given in figure 5 show that with
  roughness added to the body near the nose to achieve this condition the base-pressure coefficient was
  essentially independent of Reynolds number above about 2 million for the body alone and in combination
  with the tail surfaces." And: "The comparison given in figure 7 shows that for the body alone the results
  of the present tests are in close agreement with previous results obtained at Reynolds numbers from about
  2 to 16 million. On the basis of this comparison and of the results of figure 5, it appears that the
  base-pressure results of the present investigation may be applicable to bodies with turbulent boundary
  layers at Reynolds numbers greater than those tested."
- Report page 11 (PDF 12): "A comparison of the results of the present investigation with those from
  previous tests is shown in figure 7 for the body without tail surfaces and with the cruciform tail
  located at x/c = 0. The body-tail configuration investigated in references 4 and 7 was essentially the
  same as that of the present tests. Figure 7 shows that the present base-pressure results are in
  essential agreement with previous results for the body alone at both Mach numbers investigated and for
  the body with tail surfaces at M=2.0. At M=1.5, however, the base-pressure coefficient measured in the
  present tests was more negative than the corresponding result from reference 4."
- Report page 12 (PDF 13), Conclusions: "3. The increment in base drag due to the presence of tail
  surfaces was essentially independent of Reynolds number from a value of 2 million to 6 million based on
  the body length."

## 8. Every flag explained (what I saw)

Pixel coordinates below are in the native scan (figure 5) or the upright scan (figure 7).

**Figure 5(a), M = 1.5**

1. x/c = 0.6 square, R about 0.775: the x/c = 1.0 circle is drawn over the square's lower edge. Dot clear.
   Flag overlap.
2. x/c = 1.0 circle, R about 0.770: overlaps the square above and the Tail-off symbol below. Dot clear.
   Flag overlap.
3. Tail off, R about 0.764 (flags partly-hidden, overlap): its rounded top is hidden behind the x/c = 1.0
   circle. Visible: two straight vertical sides (centrelines x about 796.0 and 824.7 px), flat bottom
   (centreline y about 1484.3 px). A short dark nub, dot-sized, hangs from the circle's lower arc at
   (810.7, 1471.0) px, centred between the sides; I read it as this symbol's centre dot, merged with the
   circle's outline. Identity: the visible part fits only the Tail-off or the square shape; the square of
   this station is separately visible just above, every other station in both panels carries exactly one of
   each of the seven symbols, and the fairing leaving this symbol runs to the Tail-off symbol at the next
   station (traced from y about 1476 px at x = 840 px to y about 1491 px at x = 1120 px, entering the
   station-2 Tail-off at y about 1494 px). Template check: on the three clean Tail-off symbols of 5(a)
   the dot is 12.1 to 12.5 px above the bottom-edge centreline, predicting y = 1472.0 px, 1 px from the
   nub; given as the alternative.
4. x/c = 0.6 square, R about 1.972, and Tail off, R about 1.951: the square's bottom edge touches the top
   of the Tail-off dome. Both dots clear. Flag overlap on both.

**Figure 5(b), M = 2.0**

5. Station 1 (R about 0.47 to 0.66): the Tail-off (R about 0.475), the x/c = -0.6 right triangle
   (R about 0.550) and the x/c = -0.2 triangle (R about 0.559) form one cluster on the Pb = -0.15
   gridline, crossed by the R = 0.5 gridline.
   - x/c = -0.2 triangle: complete, dot clear; its base sits on the dark junction over the -0.6 symbol's
     top and next to the Tail-off dome. Flag overlap.
   - Tail off (flags partly-hidden, overlap): the straight hypotenuse of the -0.6 symbol is drawn across its
     right part, so its right side is not visible. Dome, left side, bottom and dot are visible; the dot is
     clear and was used.
   - x/c = -0.6 (flags partly-hidden, overlap): overlaps the Tail-off on its left; its upper corner is lost
     in the dark junction under the -0.2 triangle's base. Its dot is visible at (679.0, 1701.4) px with a
     short pen tail running up and left into the junction; I took the centroid of the dot core without the
     tail (the automatic centroid including the tail sat 0.75 px up-left of it). Template estimate from its
     right
     side (x about 689.8 px) and bottom (y about 1713.9 px): (677.7, 1703.7) px; given as alternative.
6. Station 2:
   - x/c = 0.6 square, R about 1.876: drawn over the upper part of the hidden -0.6 symbol. Dot clear.
     Flag overlap.
   - x/c = -0.6, R about 1.843 (flags partly-hidden, overlap): mostly hidden between the square above and
     the -0.2 triangle below. Visible: a straight 45 degree hypotenuse from about (1059.5, 1570) to
     (1050.5, 1579) px, the bottom edge (centreline y about 1584.3 px) with a fairing entering at the
     bottom-left corner, and a dot-sized blob hanging from the square's bottom edge at (1067.8, 1573.5) px.
     I read the blob as this symbol's dot. Identity: the straight 45 degree side matches the -0.6 symbol
     (the -1.0 quarter-round has a curved, nearly vertical lower side; the -1.0 of this station is
     separately visible near Pb = -0.10). Two fairings leave the station-1 pair (x/c = -0.2 and -0.6),
     run close together, then split: one ends on the station-2 -0.2 triangle, the other at this symbol's
     bottom-left corner, which fits it being the -0.6 symbol. Template estimate from the hypotenuse and
     bottom-edge corner (on clean 5(a) -0.6 symbols the dot is 22.6 to 23.6 px right of that corner and 8.8
     to 11.1 px above the bottom): (1068.45, 1573.9) px, 0.7 px from
     the blob; given as alternative.
   - x/c = -0.2 triangle, R about 1.873: complete, dot clear; its apex runs into the dark junction under the
     square and beside the hidden -0.6. Flag overlap.
7. Station 3:
   - x/c = 0.2 diamond, R about 3.361, and x/c = -0.6, R about 3.316: the diamond's lower vertex touches
     the -0.6 symbol's top corner. Both dots clear (the -0.6 dot lies about 10 px inside its hypotenuse).
     Flag overlap on both.
   - x/c = 0.6 square, R about 3.369: its top-left corner merges with the -0.6 symbol's bottom edge, and it
     covers the right part of the -0.2 triangle. Dot clear. Flag overlap.
   - x/c = -0.2 triangle, R about 3.311 (flags partly-hidden, overlap): apex hidden in the dark mass under
     the -0.6 symbol's bottom edge, right part hidden behind the square. Visible: the left side (its inner
     edge slopes dx/dy = -0.54, as on the -0.2 triangles, not 45 degrees as on a -0.6 hypotenuse; the -0.6
     of this station is visible above), the base (centreline about 1601.6 px) and white interior. No free
     dot. Left of the square's left side a dot-sized bulge protrudes about 3.7 px over pixel rows 1586 to
     1592; I read it as the triangle's dot, mostly hidden under the square's side stroke, centred at the
     bulge's left edge (x about 1505.7 px) plus a dot radius (about 2.6 px): (1508.3, 1589.0) px. Template
     estimate from the left base corner and the base (on the clean 5(b) triangles the dot is 15.9 to 16.0 px
     right of the left base corner and 10.6 to 10.8 px above the base): (1506.95, 1590.9) px; given as
     alternative. x error set to 4 px.
8. Station 4:
   - x/c = 0.2 diamond, R about 4.417, and x/c = -0.6, R about 4.470: the -0.6 symbol's top corner touches
     the diamond's lower-right side; the two run parallel and close. Both dots clear. Flag overlap on both.
   - x/c = -0.2 triangle, R about 4.449 (flags partly-hidden, overlap): its lower right part is behind the
     x/c = 0.6 square. Apex, both upper sides and the left part of the base are visible; no free dot. A
     bulge of about 2.1 px protrudes left of the square's left side over rows 1587 to 1591, just under the
     square's top-left corner; read as the triangle's dot: (1852.5, 1589.0) px. Template estimates: from the
     left base corner and base (1849.25, 1586.8) px; from the apex (apex at about (1851.7, 1568.3) px, dot
     19.7 to 21.2 px below it on clean 5(b) triangles) (1851.7, 1588.8) px; both given as alternatives.
   - x/c = 0.6 square, R about 4.507: overlaps the -0.2 triangle. Dot clear. Flag overlap.
   - x/c = 1.0 circle, R about 4.431, and Tail off, R about 4.429: the circle's bottom touches the Tail-off
     dome. Both dots clear. Flag overlap on both.

**Figure 7**: no flags. Gridlines and the two previous-results curves touch or cross the outlines of the
square at M = 2.0 and of both circles, but none reaches a dot or hides a part needed for the reading.

## 9. Notes for a later user

- Counts: figure 5(a) 28 symbols, 4 for each of 7 configurations (x/c = 1.0, 0.6, 0.2, -0.2, -0.6, -1.0,
  Tail off), all M = 1.5. Figure 5(b) 28 symbols, the same 7 x 4, all M = 2.0. Figure 7: 4 symbols,
  one square (x/c = 0 cruciform tail) and one circle (body alone) at each of M = 1.5 and M = 2.0. Total 60.
- Figure 5 is for the cruciform tail with t/c = 0.10 only, roughness added to the body (caption). The
  report says all data presented are for the short body.
- Reynolds numbers are not identical across configurations at one station; for example in 5(a) the
  x/c = -0.2 symbols sit at R about 0.557 and 4.534 while the others at those stations are at about 0.77 to
  0.81 and 4.42 to 4.46, and in 5(b) station 1 spans R about 0.475 to 0.655. Each was read where plotted.
  The 5(b) Tail-off point at R about 0.475 lies just left of the R = 0.5 gridline, slightly below the
  report's stated lower limit of 0.5 x 10^6.
- Two figure 5(b) circles (x/c = 1.0 at R about 0.645 and 4.431) have dash-shaped dots; I used the
  centroid of the dash. Their fitted outline centres differ from it by 1.2 and 2.4 px (at most 0.007 x 10^6
  in R and 0.0005 in Pb), within the stated error.
- The report does not state the Reynolds number of the figure 7 points. Figure 7's tail position x/c = 0
  does not appear among the figure 5 tail positions. For the body alone, the figure 7 circles (Pb about
  -0.195 at M = 1.5 and -0.151 at M = 2.0) lie within about 0.002 of the two highest-Reynolds-number
  Tail-off points of figure 5(a) and 5(b) respectively.
- The conclusions (page 12) speak of Reynolds numbers "from a value of 2 million to 6 million", while the
  Tests section (page 5) gives a range of 0.5 x 10^6 to 4.5 x 10^6, the results section gives 4.5 million
  as the maximum, and the figure 5 axis ends at 5 x 10^6 with the highest plotted symbol at about
  4.53 x 10^6.
- `render/final_px.json` lists the pixel position used for every row of `f5f7.csv`; `render/calib_table.md`
  holds the gridline fits reproduced below. `tn2360.txt` is the PDF's own OCR text layer, used only to find
  pages; all quotations above were checked against the page images.

## Appendix A. Gridline fits

**Figure 5(a)**, vertical gridlines (x = a + b*y, pixels):

| R (x 10^6) | a | b | rms px | bands |
|---|---|---|---|---|
| 0.0 | 600.90 | -0.01428 | 0.98 | 39 |
| 0.5 | 750.70 | -0.01322 | 0.19 | 39 |
| 1.0 | 900.10 | -0.01239 | 0.17 | 39 |
| 1.5 | 1050.53 | -0.01261 | 0.19 | 39 |
| 2.0 | 1199.54 | -0.01205 | 0.27 | 36 |
| 2.5 | 1349.58 | -0.01112 | 0.13 | 39 |
| 3.0 | 1496.44 | -0.00926 | 0.22 | 38 |
| 3.5 | 1649.49 | -0.01243 | 0.14 | 38 |
| 4.0 | 1798.35 | -0.01155 | 0.22 | 38 |
| 4.5 | 1948.44 | -0.01112 | 0.30 | 34 |
| 5.0 | 2095.45 | -0.01098 | 0.20 | 38 |

**Figure 5(a)**, horizontal gridlines (y = a + b*x, pixels):

| Pb | a | b | rms px | bands |
|---|---|---|---|---|
| -0.40 | 872.62 | 0.00986 | 0.40 | 49 |
| -0.35 | 1020.29 | 0.00966 | 0.27 | 49 |
| -0.30 | 1172.74 | 0.00846 | 0.32 | 49 |
| -0.25 | 1318.17 | 0.01100 | 0.58 | 49 |
| -0.20 | 1470.47 | 0.01052 | 0.99 | 46 |
| -0.15 | 1622.30 | 0.00842 | 0.15 | 49 |
| -0.10 | 1769.19 | 0.00972 | 0.16 | 49 |
| -0.05 | 1916.88 | 0.01049 | 0.14 | 49 |
| 0.00 | 2064.99 | 0.01043 | 1.09 | 49 |

**Figure 5(b)**, vertical gridlines (x = a + b*y, pixels):

| R (x 10^6) | a | b | rms px | bands |
|---|---|---|---|---|
| 0.0 | 517.12 | -0.00250 | 0.67 | 34 |
| 0.5 | 668.77 | -0.00280 | 0.25 | 34 |
| 1.0 | 816.79 | -0.00198 | 0.11 | 34 |
| 1.5 | 967.59 | -0.00165 | 0.15 | 34 |
| 2.0 | 1118.67 | -0.00242 | 0.16 | 34 |
| 2.5 | 1271.11 | -0.00488 | 0.12 | 34 |
| 3.0 | 1422.47 | -0.00489 | 0.15 | 34 |
| 3.5 | 1571.89 | -0.00419 | 0.12 | 34 |
| 4.0 | 1724.04 | -0.00514 | 0.24 | 34 |
| 4.5 | 1873.25 | -0.00327 | 0.35 | 29 |
| 5.0 | 2025.42 | -0.00419 | 0.13 | 34 |

**Figure 5(b)**, horizontal gridlines (y = a + b*x, pixels):

| Pb | a | b | rms px | bands |
|---|---|---|---|---|
| -0.35 | 1095.58 | 0.00134 | 0.32 | 49 |
| -0.30 | 1246.59 | 0.00109 | 0.23 | 49 |
| -0.25 | 1395.30 | 0.00289 | 0.19 | 49 |
| -0.20 | 1545.43 | 0.00248 | 0.32 | 45 |
| -0.15 | 1695.32 | 0.00288 | 0.82 | 47 |
| -0.10 | 1844.73 | 0.00245 | 0.56 | 45 |
| -0.05 | 1994.01 | 0.00251 | 0.29 | 49 |
| 0.00 | 2143.44 | 0.00135 | 0.83 | 49 |

**Figure 7 (rotated)**, vertical gridlines (x = a + b*y, pixels):

| M | a | b | rms px | bands |
|---|---|---|---|---|
| 1.0 | 713.67 | -0.00067 | 0.21 | 22 |
| 1.2 | 865.26 | -0.00210 | 0.29 | 22 |
| 1.4 | 1016.02 | -0.00393 | 0.32 | 22 |
| 1.6 | 1163.63 | -0.00247 | 0.25 | 22 |
| 1.8 | 1314.41 | -0.00256 | 0.29 | 22 |
| 2.0 | 1466.05 | -0.00617 | 0.36 | 21 |
| 2.2 | 1613.01 | -0.00527 | 0.22 | 22 |
| 2.4 | 1761.94 | -0.00387 | 0.20 | 22 |
| 2.6 | 1917.53 | -0.00820 | 0.20 | 22 |
| 2.8 | 2063.25 | -0.00481 | 0.24 | 22 |
| 3.0 | 2213.69 | -0.00553 | 0.20 | 22 |
| 3.2 | 2364.06 | -0.00778 | 0.36 | 22 |
| 3.4 | 2511.52 | -0.00702 | 0.50 | 19 |
| 3.6 | 2659.61 | -0.00523 | 0.27 | 22 |

**Figure 7 (rotated)**, horizontal gridlines (y = a + b*x, pixels):

| Pb | a | b | rms px | bands |
|---|---|---|---|---|
| -0.40 | 415.85 | 0.00666 | 0.29 | 63 |
| -0.35 | 566.47 | 0.00539 | 0.33 | 19 |
| -0.30 | 717.29 | 0.00498 | 0.35 | 19 |
| -0.25 | 865.18 | 0.00702 | 0.28 | 63 |
| -0.20 | 1015.35 | 0.00708 | 0.49 | 62 |
| -0.15 | 1165.79 | 0.00704 | 0.45 | 62 |
| -0.10 | 1316.73 | 0.00703 | 0.42 | 62 |
| -0.05 | 1467.87 | 0.00622 | 0.47 | 63 |
| 0.00 | 1616.64 | 0.00719 | 1.01 | 63 |


## Appendix B. Pixel position used for each reading

Figure 5: native page scans (PDF pages 22 and 23). Figure 7: upright (transposed) page 26 scan.

| figure | panel | configuration | px x | px y | x | y |
|---|---|---|---|---|---|---|
| 5 | a | cruciform tail t/c=0.10, x/c=1.0; roughness added to body | 812.7 | 1453.6 | 0.770 | -0.2084 |
| 5 | a | cruciform tail t/c=0.10, x/c=1.0; roughness added to body | 1174.0 | 1536.8 | 1.977 | -0.1819 |
| 5 | a | cruciform tail t/c=0.10, x/c=1.0; roughness added to body | 1553.6 | 1546.2 | 3.241 | -0.1800 |
| 5 | a | cruciform tail t/c=0.10, x/c=1.0; roughness added to body | 1910.5 | 1544.1 | 4.431 | -0.1819 |
| 5 | a | cruciform tail t/c=0.10, x/c=0.6; roughness added to body | 814.5 | 1433.8 | 0.775 | -0.2149 |
| 5 | a | cruciform tail t/c=0.10, x/c=0.6; roughness added to body | 1173.5 | 1463.5 | 1.972 | -0.2064 |
| 5 | a | cruciform tail t/c=0.10, x/c=0.6; roughness added to body | 1537.2 | 1465.4 | 3.183 | -0.2070 |
| 5 | a | cruciform tail t/c=0.10, x/c=0.6; roughness added to body | 1913.0 | 1463.5 | 4.437 | -0.2090 |
| 5 | a | cruciform tail t/c=0.10, x/c=0.2; roughness added to body | 819.4 | 1274.0 | 0.784 | -0.2680 |
| 5 | a | cruciform tail t/c=0.10, x/c=0.2; roughness added to body | 1172.6 | 1320.2 | 1.963 | -0.2537 |
| 5 | a | cruciform tail t/c=0.10, x/c=0.2; roughness added to body | 1558.2 | 1312.5 | 3.248 | -0.2576 |
| 5 | a | cruciform tail t/c=0.10, x/c=0.2; roughness added to body | 1911.5 | 1303.7 | 4.426 | -0.2618 |
| 5 | a | cruciform tail t/c=0.10, x/c=-0.2; roughness added to body | 753.5 | 1088.0 | 0.557 | -0.3301 |
| 5 | a | cruciform tail t/c=0.10, x/c=-0.2; roughness added to body | 1168.1 | 1087.5 | 1.939 | -0.3315 |
| 5 | a | cruciform tail t/c=0.10, x/c=-0.2; roughness added to body | 1560.8 | 1079.1 | 3.248 | -0.3355 |
| 5 | a | cruciform tail t/c=0.10, x/c=-0.2; roughness added to body | 1946.5 | 1073.8 | 4.534 | -0.3384 |
| 5 | a | cruciform tail t/c=0.10, x/c=-0.6; roughness added to body | 816.1 | 1220.5 | 0.771 | -0.2862 |
| 5 | a | cruciform tail t/c=0.10, x/c=-0.6; roughness added to body | 1171.8 | 1224.1 | 1.957 | -0.2860 |
| 5 | a | cruciform tail t/c=0.10, x/c=-0.6; roughness added to body | 1563.8 | 1224.1 | 3.264 | -0.2873 |
| 5 | a | cruciform tail t/c=0.10, x/c=-0.6; roughness added to body | 1911.6 | 1224.7 | 4.423 | -0.2881 |
| 5 | a | cruciform tail t/c=0.10, x/c=-1.0; roughness added to body | 818.4 | 1837.4 | 0.805 | -0.0797 |
| 5 | a | cruciform tail t/c=0.10, x/c=-1.0; roughness added to body | 1181.3 | 1846.1 | 2.013 | -0.0780 |
| 5 | a | cruciform tail t/c=0.10, x/c=-1.0; roughness added to body | 1562.0 | 1843.4 | 3.281 | -0.0802 |
| 5 | a | cruciform tail t/c=0.10, x/c=-1.0; roughness added to body | 1916.8 | 1846.1 | 4.463 | -0.0805 |
| 5 | a | tail off (body alone); roughness added to body | 810.7 | 1471.0 | 0.764 | -0.2026 |
| 5 | a | tail off (body alone); roughness added to body | 1167.0 | 1494.4 | 1.951 | -0.1961 |
| 5 | a | tail off (body alone); roughness added to body | 1560.3 | 1500.7 | 3.262 | -0.1953 |
| 5 | a | tail off (body alone); roughness added to body | 1906.2 | 1500.0 | 4.415 | -0.1968 |
| 5 | b | cruciform tail t/c=0.10, x/c=1.0; roughness added to body | 707.6 | 1583.8 | 0.645 | -0.1878 |
| 5 | b | cruciform tail t/c=0.10, x/c=1.0; roughness added to body | 1079.2 | 1641.1 | 1.882 | -0.1691 |
| 5 | b | cruciform tail t/c=0.10, x/c=1.0; roughness added to body | 1507.5 | 1663.6 | 3.310 | -0.1620 |
| 5 | b | cruciform tail t/c=0.10, x/c=1.0; roughness added to body | 1846.8 | 1665.7 | 4.431 | -0.1616 |
| 5 | b | cruciform tail t/c=0.10, x/c=0.6; roughness added to body | 689.5 | 1637.1 | 0.585 | -0.1700 |
| 5 | b | cruciform tail t/c=0.10, x/c=0.6; roughness added to body | 1077.7 | 1558.0 | 1.876 | -0.1967 |
| 5 | b | cruciform tail t/c=0.10, x/c=0.6; roughness added to body | 1525.9 | 1586.6 | 3.369 | -0.1876 |
| 5 | b | cruciform tail t/c=0.10, x/c=0.6; roughness added to body | 1870.2 | 1600.2 | 4.507 | -0.1833 |
| 5 | b | cruciform tail t/c=0.10, x/c=0.2; roughness added to body | 703.7 | 1534.8 | 0.631 | -0.2041 |
| 5 | b | cruciform tail t/c=0.10, x/c=0.2; roughness added to body | 1074.2 | 1518.8 | 1.864 | -0.2098 |
| 5 | b | cruciform tail t/c=0.10, x/c=0.2; roughness added to body | 1523.7 | 1522.8 | 3.361 | -0.2088 |
| 5 | b | cruciform tail t/c=0.10, x/c=0.2; roughness added to body | 1843.1 | 1521.3 | 4.417 | -0.2096 |
| 5 | b | cruciform tail t/c=0.10, x/c=-0.2; roughness added to body | 681.7 | 1678.9 | 0.559 | -0.1561 |
| 5 | b | cruciform tail t/c=0.10, x/c=-0.2; roughness added to body | 1076.8 | 1593.5 | 1.873 | -0.1849 |
| 5 | b | cruciform tail t/c=0.10, x/c=-0.2; roughness added to body | 1508.3 | 1589.0 | 3.311 | -0.1868 |
| 5 | b | cruciform tail t/c=0.10, x/c=-0.2; roughness added to body | 1852.5 | 1589.0 | 4.449 | -0.1871 |
| 5 | b | cruciform tail t/c=0.10, x/c=-0.6; roughness added to body | 679.0 | 1701.4 | 0.550 | -0.1486 |
| 5 | b | cruciform tail t/c=0.10, x/c=-0.6; roughness added to body | 1067.8 | 1573.5 | 1.843 | -0.1915 |
| 5 | b | cruciform tail t/c=0.10, x/c=-0.6; roughness added to body | 1509.9 | 1560.3 | 3.316 | -0.1963 |
| 5 | b | cruciform tail t/c=0.10, x/c=-0.6; roughness added to body | 1859.2 | 1547.0 | 4.470 | -0.2010 |
| 5 | b | cruciform tail t/c=0.10, x/c=-1.0; roughness added to body | 710.0 | 1852.9 | 0.655 | -0.0979 |
| 5 | b | cruciform tail t/c=0.10, x/c=-1.0; roughness added to body | 1069.6 | 1854.4 | 1.851 | -0.0976 |
| 5 | b | cruciform tail t/c=0.10, x/c=-1.0; roughness added to body | 1513.1 | 1849.8 | 3.331 | -0.0995 |
| 5 | b | cruciform tail t/c=0.10, x/c=-1.0; roughness added to body | 1841.6 | 1845.8 | 4.416 | -0.1012 |
| 5 | b | tail off (body alone); roughness added to body | 656.4 | 1701.2 | 0.475 | -0.1487 |
| 5 | b | tail off (body alone); roughness added to body | 1064.4 | 1706.4 | 1.833 | -0.1473 |
| 5 | b | tail off (body alone); roughness added to body | 1507.0 | 1701.7 | 3.308 | -0.1493 |
| 5 | b | tail off (body alone); roughness added to body | 1846.2 | 1695.8 | 4.429 | -0.1516 |
| 7 | single | body with 10-percent-thick cruciform tail surfaces, x/c=0; present tests | 1088.2 | 627.6 | 1.501 | -0.3316 |
| 7 | single | body with 10-percent-thick cruciform tail surfaces, x/c=0; present tests | 1460.5 | 1021.7 | 2.001 | -0.2013 |
| 7 | single | body without tail surface (body alone); present tests | 1086.0 | 1038.4 | 1.499 | -0.1949 |
| 7 | single | body without tail surface (body alone); present tests | 1460.0 | 1172.7 | 2.002 | -0.1511 |
