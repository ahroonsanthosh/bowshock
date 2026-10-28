# NACA TN 2360, figures 5 and 7: blind reading, reader A

## 1. Source and integrity

- File read: `f5-readers/pdf/tn2360.pdf`, copied into this folder as `tn2360.pdf`.
- SHA-256 computed here: `95937173fa78bdd41e24a3caded6d06779df885263b66c23f13225a18d742a59`
  (matches the brief; also in `sha256.txt`). The brief itself was checked against its stated SHA-256 before starting.
- Nothing else was consulted: no repository, no other report, no web page, no other folder of the scratchpad
  except this one and the `pdf` folder.
- Report: NACA TN 2360, "Effect of tail surfaces on the base drag of a body of revolution at Mach numbers of
  1.5 and 2.0", J. Richard Spahr and Robert R. Dickey (Ames, dated March 7, 1951). The PDF is a 26-page scan
  (Adobe Paper Capture); every page is a single 300 ppi JPEG.

## 2. Where the figures are

| Figure | PDF page | Printed page | Orientation |
|---|---|---|---|
| 5(a), M = 1.5 | 22 | 21 | portrait |
| 5(b), M = 2.0 ("Figure 5.- Concluded.") | 23 | 22 | portrait |
| 7 | 26 | 25 | landscape (printed sideways on the page) |

## 3. Images and resolution

- The embedded page images were extracted unresampled with `pdfimages -j` (poppler): 2360 x 3116 px for
  PDF pages 22 and 23, 2366 x 3118 px for PDF page 26, all 300 ppi. All measurement was done on these
  native pixels (no rendering or resampling). The figure 7 page image was rotated 90 degrees clockwise
  (lossless transpose) to 3118 x 2366 px so that the figure reads upright; its pixel coordinates below refer
  to the rotated image. Pixel origin is the top-left corner, x to the right, y downward.
- Text pages were rendered with `pdftoppm -r 120 -gray` only for reading the wording; the OCR text layer of
  the PDF was used only to locate pages and was not trusted for quotations.
- Tools: Python 3 run with `-I`, Pillow, NumPy, SciPy (`ndimage`). Scripts are in `scripts/`.

## 4. Figure titles, captions, axis labels and legends (word for word)

Line-break hyphenation in the drafted lettering is joined; subscripts are written with `_`.

Figure 5(a) (PDF p. 22, printed p. 21)
- Caption: "Figure 5.- Variation of base-pressure coefficient with Reynolds number; cruciform tail, t/c = 0.10, roughness added to body."
- Panel label: "(a) M = 1.5"
- Vertical axis: "Base-pressure coefficient, P_b"; tick labels 0, -.1, -.2, -.3, -.4 (top frame).
- Horizontal axis: "Reynolds number, R"; tick labels 0, 1, 2, 3, "4 x 10^6".
- Legend heading "Tail location, x/c", entries:
  - circle with centre dot: "1.0"
  - square with centre dot: "0.6"
  - diamond with centre dot: "0.2"
  - triangle (apex up) with centre dot: "-0.2"
  - right triangle (vertical side on the right, hypotenuse rising to the right) with centre dot: "-0.6"
  - quarter-round (vertical right side, flat bottom, curved upper left) with centre dot: "-1.0"
  - arch (flat bottom, vertical sides, rounded top) with centre dot: "Tail off"

Figure 5(b) (PDF p. 23, printed p. 22)
- Caption: "Figure 5.- Concluded."
- Panel label: "(b) M = 2.0"
- Axes and legend identical in wording and symbols to 5(a). Vertical axis tick labels 0, -.1, -.2, -.3;
  the top frame is -0.35 (unlabelled, fixed by the regular 0.05 grid spacing). Horizontal tick labels 0, 1, 2,
  3, "4 x 10^6".

Figure 7 (PDF p. 26, printed p. 25)
- Caption: "Figure 7.- Comparison of present base-pressure data with previous results."
- Vertical axis: "Base-pressure coefficient, P_b"; tick labels 0, -.1, -.2, -.3, -.4.
- Horizontal axis: "Mach number, M"; tick labels 1.0, 1.4, 1.8, 2.2, 2.6, 3.0, 3.4 (gridlines every 0.2,
  right frame at 3.6).
- Legend (boxed, upper right):
  - heading "With 10% thick cruciform tail surfaces, x/c=0" (printed as "With 10% thick cruci- / form tail surfaces, x/c=0", with x/c as a stacked fraction):
    - square with centre dot: "Present tests"
    - long dashed line: "Reference 4"
  - heading "Without tail surface":
    - circle with centre dot: "Present tests"
    - solid line: "Average of references 1,2 and 3" (printed "Average of refer- / ences 1,2 and 3")

## 5. Text that says what the figures show, Reynolds numbers, support and boundary layer (word for word)

Printed page numbers, with PDF page in brackets.

- p. 1 [PDF 2], Summary: "Wind-tunnel tests were performed at Mach numbers of 1.5 and 2.0 to investigate the influence of tail surfaces on the base drag of a body of revolution without boattailing and having a turbulent boundary layer."
- p. 2 [PDF 3], Notation: "c tail chord"; "l body length".
- p. 3 [PDF 4], Notation: "P_b base-pressure coefficient ((p_b - p_o)/q_o)"; "R Reynolds number (V_o l / v)" (v is the Greek nu, kinematic viscosity); "t maximum tail thickness"; "x distance of tail trailing edge forward of base (See fig. 2(a).)".
- p. 4 [PDF 5], Model and Support: "The model was attached to the balance by means of a 1/2-inch-diameter, 5-inch-long support sting which was an integral part of the body. The ratio of the support to body diameter was 0.4 and the support length was four times the body diameter. This design was selected on the basis of the results of references 1 and 6 which indicate that, with this support configuration, the effects of support interference on the base pressure of the body are small."
- p. 4 [PDF 5]: "Four 0.03-inch-diameter pressure orifices were located 1/32 inch behind the body base. These orifice holes were drilled radially into the sting at 45° from the planes of the tail fins and were connected to a common base-pressure line."
- p. 4 to 5 [PDF 5 to 6]: "For the short model length, which was used in all the tests for which data are presented herein, the intersection with the dead-air region of the reflected bow wave at a Mach number of 1.5 occurred at approximately 2.6 diameters downstream of the base. According to the results of reference 1, this intersection is sufficiently far downstream that the base-pressure results presented should not be significantly affected."
- p. 5 [PDF 6], Tests: "Tests at zero angle of attack were conducted with the body alone and with both plane- and cruciform-tail configurations mounted on the body at various longitudinal positions. The body-tail combinations were tested with both 5- and 10-percent-thick tail sections. In general, the configurations tested employed the short body (7.656 in. long) with a 1/4-inch-wide salt band placed on the ogival nose to insure local transition to a turbulent boundary layer. However, several runs were made with the long body (9.562 in. long) at M=2.0 (where no effects of shock-wave reflections exist) to determine whether or not the effect of the body-nose pressure field on the base-pressure was appreciable. Additional tests with the body nose smooth were made to investigate the effect of the type of boundary layer approaching the base."
- p. 5 [PDF 6]: "Base-pressure measurements were made by means of the orifices in the sting at tunnel total pressures corresponding to a Reynolds number range of 0.5 x 10^6 to 4.5 x 10^6 at Mach numbers of 1.5 and 2.0."
- p. 5 [PDF 6]: "The results of these pressure-distribution tests indicate that the average deviation from the mean base-pressure coefficient was ± 0.003, which, as shown later, is equal to the uncertainty in the base-pressure measurements. All base-pressure coefficients have been corrected for the effect of axial static-pressure variation in the wind-tunnel stream."
- p. 5 [PDF 6]: "It is estimated that the total uncertainty in the measured base-pressure coefficient is ± 0.003."
- p. 7 [PDF 8], Results and Discussion: "The principal results of the investigation are presented in figures 5 and 6. Figure 5 shows the variation of base-pressure coefficient with Reynolds number for various selected tail locations." and "The experimental base-pressure increments given in figure 6 correspond to the maximum Reynolds number of the tests, 4.5 million." and "The drag coefficients C_D_b corresponding to the base-pressure coefficients P_b presented in figures 5 and 6 can be obtained from the relationship C_D_b = -P_b".
- p. 8 [PDF 9], Effects of Reynolds Number: "Limited tests of the model with smooth surfaces showed that the base pressure of the body alone decreased continuously with increasing Reynolds number, indicating a laminar boundary layer approaching the base. For the body in combination with the tail surfaces, the base-pressure coefficient was essentially independent of Reynolds number but was larger in absolute magnitude by about 0.03 than the corresponding values for roughness added near the nose of the body."
- p. 8 [PDF 9]: "The condition of most practical interest is one in which the flow approaching the base has a fully developed turbulent boundary layer. The results given in figure 5 show that with roughness added to the body near the nose to achieve this condition the base-pressure coefficient was essentially independent of Reynolds number above about 2 million for the body alone and in combination with the tail surfaces."
- p. 8 [PDF 9]: "The comparison given in figure 7 shows that for the body alone the results of the present tests are in close agreement with previous results obtained at Reynolds numbers from about 2 to 16 million. On the basis of this comparison and of the results of figure 5, it appears that the base-pressure results of the present investigation may be applicable to bodies with turbulent boundary layers at Reynolds numbers greater than those tested."
- p. 9 [PDF 10]: "The results of tests made at a Mach number of 2.0 with the cylindrical portion of the body extended about 1.6 diameters (long body) showed the same changes in base pressure at all tail locations as was shown for the original (short) body."
- p. 11 [PDF 12]: "A comparison of the results of the present investigation with those from previous tests is shown in figure 7 for the body without tail surfaces and with the cruciform tail located at x/c = 0. The body-tail configuration investigated in references 4 and 7 was essentially the same as that of the present tests. Figure 7 shows that the present base-pressure results are in essential agreement with previous results for the body alone at both Mach numbers investigated and for the body with tail surfaces at M=2.0. At M=1.5, however, the base-pressure coefficient measured in the present tests was more negative than the corresponding result from reference 4."
- p. 12 [PDF 13], Conclusions: "Wind-tunnel tests were performed at Mach numbers of 1.5 and 2.0 to investigate the effect of tail surfaces on the base pressure of an unboattailed body of revolution having a turbulent boundary layer." and conclusion 3: "The increment in base drag due to the presence of tail surfaces was essentially independent of Reynolds number from a value of 2 million to 6 million based on the body length."

## 6. Axis calibration

All six axes are linear. None is logarithmic (the Reynolds-number axes of figure 5 are linear, 0 to 5 x 10^6
with gridlines every 0.5 x 10^6; checked by the equal 150 px spacing of all eleven vertical gridlines).

Method (pixel scan, not by eye):
1. Every gridline of each panel was located by a darkness profile across the whole plot, assigned to its value
   from the printed tick labels (each labelled tick was checked in a crop to sit on the gridline it names), and
   the intermediate unlabelled lines were assigned by the regular spacing.
2. Each gridline was then traced along its length in narrow windows (half width 5 px, every 4 px), keeping only
   narrow, isolated peaks (width at half maximum at most 5 px, so places where a fairing or symbol merges with
   the gridline are dropped), cleaned against a 60 px running median (tolerance 1 px), and stored as a
   median-smoothed lookup table (30 px window). The heavy frame lines (too wide for the narrow trace) were fitted
   with a straight line from a wider window.
3. A symbol's value is linear interpolation between the two gridlines that bracket it, evaluated at the symbol's
   own row (for x) and column (for y). This absorbs the scan's rotation, shear and slight bowing locally.
4. Cross-check: an independent global fit (quadratic per gridline for figure 5, straight line for figure 7) gives
   values that differ from the piecewise result by at most 0.003 x 10^6 in R, 0.0018 in P_b (the largest where a
   fairing lies almost on the -0.15 gridline of 5(b), which spoiled the global fit there) and 0.0006 in M.

Labelled gridlines used (all lines, labelled and unlabelled, were used in step 3):
- 5(a): x labels 0, 1, 2, 3, 4 (x 10^6) and y labels 0, -0.1, -0.2, -0.3, -0.4. Scale about 300 px per 10^6 and
  about 2965 to 2987 px per unit P_b. Scan rotation about 0.55 to 0.75 degrees (vertical gridlines lean about 10 to 16 px
  over the plot height; horizontal lines drop about 12 to 15 px across the width), so not a pure rotation.
- 5(b): x labels 0, 1, 2, 3, 4 (x 10^6) and y labels 0, -0.1, -0.2, -0.3 (top frame -0.35). About 301 px per
  10^6 and 2990 to 3000 px per unit P_b. Rotation about 0.1 to 0.3 degrees.
- 7: x labels 1.0, 1.4, 1.8, 2.2, 2.6, 3.0, 3.4 and y labels 0, -0.1, -0.2, -0.3, -0.4. About 747 px per unit M
  and 3004 to 3008 px per unit P_b. The legend box covers the grid above P_b = -0.25 for M > 1.8; the gridlines
  there were traced only where visible.

Reference gridline positions (piecewise model), for anyone repeating the calibration on the same images:
- 5(a) vertical, x px at y = 1000 / 1950: 0: 586.3/573.6; 0.5: 737.2/724.9; 1: 887.9/876.0; 1.5: 1038.1/1026.0;
  2: 1187.5/1175.9; 2.5: 1338.2/1327.9; 3: 1487.1/1478.9; 3.5: 1637.0/1625.1; 4: 1787.0/1775.9; 4.5: 1937.0/1926.3; 5: 2084.5/2074.1.
  Horizontal, y px at x = 650 / 2000: -0.40: 878.4/891.7; -0.35: 1026.5/1039.1; -0.30: 1177.5/1189.1; -0.25: 1325.5/1339.9;
  -0.20: 1476.5/1490.0; -0.15: 1627.5/1639.1; -0.10: 1775.1/1788.5; -0.05: 1923.5/1937.9; 0: 2071.9/2086.0.
- 5(b) vertical, x px at y = 1150 / 2100: 0: 514.2/511.9; 0.5: 665.5/663.1; 1: 814.8/812.5; 1.5: 965.9/964.0; 2: 1115.9/1113.1;
  2.5: 1265.9/1261.0; 3: 1417.0/1412.0; 3.5: 1567.0/1562.9; 4: 1718.0/1712.9; 4.5: 1869.0/1866.2; 5: 2020.6/2016.6.
  Horizontal, y px at x = 560 / 1990: -0.35: 1096.3/1098.3; -0.30: 1247.4/1249.2; -0.25: 1397.1/1401.0; -0.20: 1547.0/1550.8;
  -0.15: 1696.2/1699.5; -0.10: 1846.0/1849.5; -0.05: 1995.9/1999.5; 0: 2144.4/2146.7.
- 7 (rotated image) vertical, x px at y = 900 / 1600: 1.0: 713.8/712.1; 1.2: 864.0/861.9; 1.4: 1013.0/1009.5; 1.6: 1162.0/1159.9;
  1.8: 1312.5/1310.1; 2.0: 1460.1/1456.1; 2.2: 1608.1/1604.9; 2.4: 1758.5/1756.0; 2.6: 1909.9/1904.9; 2.8: 2058.5/2055.9;
  3.0: 2208.5/2204.9; 3.2: 2356.3/2352.0; 3.4: 2504.1/2500.5; 3.6: 2654.9/2651.2.
  Horizontal, y px at x = 750 / 1300: -0.40: 420.7/424.3; -0.35: 570.0/573.1; -0.30: 720.5/723.5; -0.25: 870.0/874.9;
  -0.20: 1020.1/1025.0; -0.15: 1170.7/1175.1; -0.10: 1321.1/1326.0; -0.05: 1471.1/1476.2; 0: 1621.9/1626.0.

Grid irregularities found (a later reader should know these):
- 5(a): the P_b = -0.25 and -0.20 gridlines each step down by about 2.5 to 3 px between x = 1160 and 1190 px,
  exactly at the R = 2 x 10^6 symbol column, while the -0.30 and -0.15 lines are smooth there. It is a local
  distortion of the drawing or scan. Its effect on the symbols in that column (judged by evaluating the bracketing
  gridlines just left and just right of the step) is at most 0.0005 in P_b; that amount is added in quadrature to
  their y errors.
- 5(b): the P_b = -0.15 gridline steps by about 1.5 px near x = 1030 to 1100 px. The piecewise model follows it.
  The tail-off fairing lies almost on this gridline for most of its length and the x/c = -1.0 fairing lies on the
  -0.10 gridline; those stretches were excluded from the trace by hand (listed in `cfg5b.json`).

## 7. How the symbols were read

- Every symbol in these figures carries a small centre dot (also in the legends). The dot is taken as the plotted
  point. Its position is the darkness-weighted centroid of the dot blob (local background removed). Each detected
  dot was checked visually on an 8x enlargement with a cross drawn at the measured point (`img/sheet5a.png`,
  `img/sheet5b.png`, `img/sheet7.png`).
- Cross-check of the dot against the outline: for circles, squares and diamonds, the midpoint of the outline
  edges agrees with the dot to within about 1 to 2 px (RMS about 1.1 px), the larger differences being where a
  fairing or a neighbouring symbol merges with an edge.
- Lines drawn through or near the symbols (the fairings in figure 5; the dashed "Reference 4" and solid
  "Average of references 1,2 and 3" curves in figure 7) were not read. Legend symbols were not read.
- Symbol identity was taken from shape. Where a shape was partly hidden, fairing continuity was used only as a
  supporting check.
- Hidden or fused dots (see flags): the dot position was estimated from the visible edges of the same symbol,
  using offsets between dot and edges measured on clean symbols of the same type:
  - upright triangle (5(b)): dot is 10.2 to 10.8 px above the base edge line (three clean instances in 5(b)
    including the legend) and 10.9 to 12.4 px right of the left side line at the dot's row; apex-to-base height
    about 31 px.
  - right triangle, x/c = -0.6: dot is (-11.2, -10.2) px from the right-angle corner (right side, bottom edge),
    spread about 1 px, and (+21.3, -10.2) px from the lower-left vertex; six clean instances in 5(a), 5(b) and the
    5(b) legend. The hypotenuse is at about 45 degrees.
  - arch (tail off, 5(a)): dot is 12.0 to 12.6 px above the bottom edge (three clean instances in 5(a)).
  Where a fused dot fragment and the geometric estimate both exist, the reading is the fragment or a mean of the
  two, and the other estimates are given in `alternatives`.
- Matching the legend symbols as templates (chamfer matching) was tried and rejected: in the legends the dot sits
  differently inside the quarter-round and arch symbols (2 to 4 px) than in the plotted symbols.
- Symbols per panel: every configuration has four symbols in each panel of figure 5, at four Reynolds-number
  columns (roughly 0.5 to 0.8, 1.8 to 2.0, 3.2 to 3.4 and 4.4 to 4.5 x 10^6). Figure 7 has four data symbols.
  No symbol was illegible.

## 8. Reading errors

`x_error` and `y_error` are one standard deviation of my reading, in axis units, from these pixel terms
(converted with the local gridline spacing):
- dot centroid: 0.5 px; symbol-centre definition (dot versus outline): 1.0 px; calibration (gridline position
  and interpolation): 0.5 px. Combined 1.2 px for a clean symbol.
- 1.5 px where the dot is clear but the outline is partly hidden or merged with a neighbour.
- 2.0 px where the dot is fused to another outline or inferred from edges with the estimates agreeing within
  about 2 px; 2.5 px where the estimates differ by about 2.7 px (5(b), x/c = -0.6, lowest R).
- 5(a) symbols in the R = 2 column also carry the grid-step term described in section 6.
In axis units 1.2 px is about 0.004 x 10^6 in R, 0.0016 in M and 0.0004 in P_b. These are reading errors only;
they do not include the report's stated measurement uncertainty of ± 0.003 in P_b.

## 9. Flags explained

Figure 5(a), M = 1.5
- x/c = 0.6 (square), lowest R: `partly-hidden;overlap`. The circle (x/c = 1.0) is drawn over the square's lower
  edge; the square's dot is clear.
- x/c = 1.0 (circle), lowest R: `overlap`. Drawn on top of the square above and the arch below; fully visible.
- Tail off (arch), lowest R: `partly-hidden;overlap;ambiguous`. Its rounded top is hidden under the circle; only
  the flat bottom and vertical sides show, and its dot touches the circle's lower outline. Reading is approximately the mean of
  the fused dot blob and the bottom-edge estimate (they differ by 1.5 px vertically); both are in `alternatives`.
  Identity: the visible part is equally consistent with a square, but the x/c = 0.6 square at this Reynolds
  number is already the symbol directly above, and the tail-off fairing starts at this symbol, so it is read as
  tail off. I judged the square identity implausible and did not list it as an alternative.
- x/c = 0.6 (square) and tail off (arch), R about 2 x 10^6: `overlap`. The square's lower edge touches the
  arch's top; nothing hidden.

Figure 5(b), M = 2.0
- Lowest-R cluster (R about 0.47 to 0.59): the triangle x/c = -0.2 (`overlap`) sits with its base on the arch
  (tail off) and the right triangle x/c = -0.6. The right triangle is drawn over the lower right of the arch
  (arch: `partly-hidden;overlap`, its dot clear). The right triangle's top is hidden by the triangle's base and its
  only dot-like mark is a blob joined to a short diagonal stroke; the blob lies about 2.7 px above the position
  predicted from its right side and bottom edge (`partly-hidden;overlap;ambiguous`; geometric estimate in
  `alternatives`).
- R about 1.84 to 1.88 cluster: square x/c = 0.6 (`overlap`) on top; triangle x/c = -0.2 (`overlap`, dot clear)
  overlaps the right triangle x/c = -0.6, whose right side and top are hidden behind the square and the triangle
  (`partly-hidden;overlap`). Its dot is a short mark fused to the square's lower edge; the geometric estimate from
  its hypotenuse and base agrees within 0.5 px (in `alternatives`).
- R about 3.31 to 3.37 cluster: diamond x/c = 0.2 (`overlap`) touches the top of the right triangle x/c = -0.6
  (`overlap`, dot clear). The square x/c = 0.6 (`overlap`) is drawn over the triangle x/c = -0.2, whose apex
  and right half are hidden (`partly-hidden;overlap;ambiguous`); its dot shows only as a fragment fused to the
  square's left edge. Reading is the mean of that fragment and the estimate from the left side and base (2.2 px
  apart); both in `alternatives`.
- R about 4.41 to 4.51 cluster: diamond x/c = 0.2 and right triangle x/c = -0.6 touch along the triangle's
  hypotenuse (both `overlap`, dots clear). The square x/c = 0.6 (`overlap`) covers the lower right of the
  triangle x/c = -0.2 (`partly-hidden;overlap`); the triangle's dot is fused to the square's upper-left corner,
  and the estimate from the triangle's apex and base agrees within about 1 px (both in `alternatives`). The circle
  x/c = 1.0 and the arch (tail off) touch (both `overlap`).

Figure 7
- No flags. The circle at M about 2.0 sits on the solid reference curve and on two gridlines, the square at
  M about 2.0 touches the dashed curve, and the circle at M about 1.5 touches the P_b = -0.2 gridline; all four
  outlines and dots are fully visible.

No symbol was flagged `out-of-line`: every symbol lies on or very close to the fairing drawn for its
configuration. No symbol was `illegible`.

## 10. Notes for later users

- x values in figure 5 are in units of 10^6, as the axis is labelled (0 to "4 x 10^6"). R is based on body
  length l (notation, p. 3; conclusion 3, p. 12); per p. 4 to 5 all presented data are for the short body
  (7.656 in.). The leftmost tail-off symbol of 5(b) is plotted at R a little below 0.5 x 10^6 and the rightmost
  symbols of both panels at about 4.41 to 4.54 x 10^6; the text gives the range as 0.5 x 10^6 to 4.5 x 10^6.
- Conclusion 3 (p. 12) says "from a value of 2 million to 6 million", while the tested range stated on p. 5 and
  p. 7 ends at 4.5 million and figure 5 shows nothing above about 4.5 x 10^6. Quoted as printed.
- Figure 5 is for the cruciform tail, t/c = 0.10, with roughness on the body (a 1/4-inch salt band on the ogival
  nose, p. 5), that is, a turbulent boundary layer by intent. The smooth-body tests described on p. 8 are not
  plotted in figure 5.
- The x/c sign convention: x is the distance of the tail trailing edge forward of the base (p. 3), so negative
  x/c means the trailing edge is behind the base.
- Figure 7's tail-on symbols are labelled x/c = 0, a tail location that is not among figure 5's legend entries.
  Figure 7 does not state the Reynolds number of the present-test symbols, and the text does not either; the
  "2 to 16 million" on p. 8 refers to the previous results. The `mach` column for figure 7 gives the nominal test
  Mach number (1.5 or 2.0, p. 5); the read Mach number is in `x`.
- Figure 7's curves ("Reference 4", "Average of references 1,2 and 3") are lines, not data, and were not read.
- Symbol support: the 1/2-inch-diameter, 5-inch-long sting (support to body diameter 0.4, length four body
  diameters), with base pressure measured by four orifices in the sting 1/32 inch behind the base (p. 4).

## 11. Files

- `f5f7.csv`: one row per measured symbol (60 rows: 28 in 5(a), 28 in 5(b), 4 in figure 7).
- `method.md`: this note. `sha256.txt`: the PDF checksum.
- Working files: `tn2360.pdf` (copy), `img/` (extracted page images, crops and check sheets), `scripts/`
  (gridline tracing, symbol finding, assembly), `cal*.json`, `cfg*.json`, `pw*.pkl` (calibrations), `pts*.json`,
  `alts*.json`, `vals*.json` and `rows_with_pixels.json` (pixel positions and intermediate values).

## Appendix: pixel position of every symbol read

Image frames as in section 3 (5(a): PDF page 22 image; 5(b): PDF page 23 image; 7: PDF page 26 image rotated
90 degrees clockwise). sigma is the 1-standard-deviation pixel reading error used.

| figure | panel | configuration | x (read) | px | py | sigma px | flags |
|---|---|---|---|---|---|---|---|
| 5 | a | cruciform tail t/c=0.10, tail location x/c=-0.2 | 0.557 | 753.6 | 1088.1 | 1.2 | - |
| 5 | a | cruciform tail t/c=0.10, tail location x/c=-0.2 | 1.939 | 1168.1 | 1087.4 | 1.2 | - |
| 5 | a | cruciform tail t/c=0.10, tail location x/c=-0.2 | 3.250 | 1560.9 | 1079.0 | 1.2 | - |
| 5 | a | cruciform tail t/c=0.10, tail location x/c=-0.2 | 4.535 | 1946.5 | 1073.9 | 1.2 | - |
| 5 | a | cruciform tail t/c=0.10, tail location x/c=-0.6 | 0.771 | 816.1 | 1220.5 | 1.2 | - |
| 5 | a | cruciform tail t/c=0.10, tail location x/c=-0.6 | 1.957 | 1171.9 | 1224.3 | 1.2 | - |
| 5 | a | cruciform tail t/c=0.10, tail location x/c=-0.6 | 3.264 | 1563.8 | 1224.0 | 1.2 | - |
| 5 | a | cruciform tail t/c=0.10, tail location x/c=-0.6 | 4.423 | 1911.8 | 1224.7 | 1.2 | - |
| 5 | a | cruciform tail t/c=0.10, tail location x/c=-1.0 | 0.805 | 818.4 | 1837.3 | 1.2 | - |
| 5 | a | cruciform tail t/c=0.10, tail location x/c=-1.0 | 2.013 | 1181.3 | 1846.2 | 1.2 | - |
| 5 | a | cruciform tail t/c=0.10, tail location x/c=-1.0 | 3.282 | 1562.1 | 1843.4 | 1.2 | - |
| 5 | a | cruciform tail t/c=0.10, tail location x/c=-1.0 | 4.465 | 1916.7 | 1846.1 | 1.2 | - |
| 5 | a | cruciform tail t/c=0.10, tail location x/c=0.2 | 0.783 | 819.3 | 1274.1 | 1.2 | - |
| 5 | a | cruciform tail t/c=0.10, tail location x/c=0.2 | 1.964 | 1172.5 | 1320.2 | 1.2 | - |
| 5 | a | cruciform tail t/c=0.10, tail location x/c=0.2 | 3.249 | 1558.2 | 1312.5 | 1.2 | - |
| 5 | a | cruciform tail t/c=0.10, tail location x/c=0.2 | 4.426 | 1911.5 | 1303.6 | 1.2 | - |
| 5 | a | cruciform tail t/c=0.10, tail location x/c=0.6 | 0.776 | 814.5 | 1433.7 | 1.5 | partly-hidden;overlap |
| 5 | a | cruciform tail t/c=0.10, tail location x/c=0.6 | 1.970 | 1173.5 | 1463.5 | 1.2 | overlap |
| 5 | a | cruciform tail t/c=0.10, tail location x/c=0.6 | 3.182 | 1537.2 | 1465.4 | 1.2 | - |
| 5 | a | cruciform tail t/c=0.10, tail location x/c=0.6 | 4.434 | 1913.0 | 1463.4 | 1.2 | - |
| 5 | a | cruciform tail t/c=0.10, tail location x/c=1.0 | 0.770 | 812.5 | 1453.7 | 1.2 | overlap |
| 5 | a | cruciform tail t/c=0.10, tail location x/c=1.0 | 1.978 | 1174.0 | 1536.8 | 1.2 | - |
| 5 | a | cruciform tail t/c=0.10, tail location x/c=1.0 | 3.242 | 1553.6 | 1546.2 | 1.2 | - |
| 5 | a | cruciform tail t/c=0.10, tail location x/c=1.0 | 4.430 | 1910.4 | 1544.2 | 1.2 | - |
| 5 | a | tail off (body alone) | 0.765 | 810.6 | 1471.2 | 2.0 | partly-hidden;overlap;ambiguous |
| 5 | a | tail off (body alone) | 1.954 | 1166.9 | 1494.4 | 1.2 | overlap |
| 5 | a | tail off (body alone) | 3.263 | 1560.4 | 1500.7 | 1.2 | - |
| 5 | a | tail off (body alone) | 4.414 | 1906.1 | 1500.0 | 1.2 | - |
| 5 | b | cruciform tail t/c=0.10, tail location x/c=-0.2 | 0.559 | 681.7 | 1678.8 | 1.5 | overlap |
| 5 | b | cruciform tail t/c=0.10, tail location x/c=-0.2 | 1.872 | 1076.7 | 1593.5 | 1.5 | overlap |
| 5 | b | cruciform tail t/c=0.10, tail location x/c=-0.2 | 3.311 | 1508.4 | 1590.1 | 2.0 | partly-hidden;overlap;ambiguous |
| 5 | b | cruciform tail t/c=0.10, tail location x/c=-0.2 | 4.449 | 1852.5 | 1587.8 | 2.0 | partly-hidden;overlap |
| 5 | b | cruciform tail t/c=0.10, tail location x/c=-0.6 | 0.552 | 679.6 | 1701.7 | 2.5 | partly-hidden;overlap;ambiguous |
| 5 | b | cruciform tail t/c=0.10, tail location x/c=-0.6 | 1.844 | 1068.3 | 1574.0 | 2.0 | partly-hidden;overlap |
| 5 | b | cruciform tail t/c=0.10, tail location x/c=-0.6 | 3.316 | 1510.2 | 1560.6 | 1.5 | overlap |
| 5 | b | cruciform tail t/c=0.10, tail location x/c=-0.6 | 4.468 | 1859.1 | 1547.0 | 1.2 | overlap |
| 5 | b | cruciform tail t/c=0.10, tail location x/c=-1.0 | 0.657 | 710.0 | 1852.9 | 1.2 | - |
| 5 | b | cruciform tail t/c=0.10, tail location x/c=-1.0 | 1.850 | 1069.5 | 1854.4 | 1.2 | - |
| 5 | b | cruciform tail t/c=0.10, tail location x/c=-1.0 | 3.331 | 1513.1 | 1849.8 | 1.2 | - |
| 5 | b | cruciform tail t/c=0.10, tail location x/c=-1.0 | 4.417 | 1841.7 | 1845.8 | 1.2 | - |
| 5 | b | cruciform tail t/c=0.10, tail location x/c=0.2 | 0.630 | 703.6 | 1534.7 | 1.2 | - |
| 5 | b | cruciform tail t/c=0.10, tail location x/c=0.2 | 1.863 | 1074.1 | 1518.8 | 1.2 | - |
| 5 | b | cruciform tail t/c=0.10, tail location x/c=0.2 | 3.360 | 1523.7 | 1522.8 | 1.2 | overlap |
| 5 | b | cruciform tail t/c=0.10, tail location x/c=0.2 | 4.415 | 1843.1 | 1521.2 | 1.2 | overlap |
| 5 | b | cruciform tail t/c=0.10, tail location x/c=0.6 | 0.584 | 689.4 | 1637.0 | 1.2 | - |
| 5 | b | cruciform tail t/c=0.10, tail location x/c=0.6 | 1.876 | 1077.8 | 1558.0 | 1.5 | overlap |
| 5 | b | cruciform tail t/c=0.10, tail location x/c=0.6 | 3.369 | 1525.8 | 1586.6 | 1.2 | overlap |
| 5 | b | cruciform tail t/c=0.10, tail location x/c=0.6 | 4.508 | 1870.2 | 1600.3 | 1.5 | overlap |
| 5 | b | cruciform tail t/c=0.10, tail location x/c=1.0 | 0.645 | 707.7 | 1584.0 | 1.2 | - |
| 5 | b | cruciform tail t/c=0.10, tail location x/c=1.0 | 1.881 | 1079.3 | 1641.1 | 1.2 | - |
| 5 | b | cruciform tail t/c=0.10, tail location x/c=1.0 | 3.309 | 1507.6 | 1663.5 | 1.2 | - |
| 5 | b | cruciform tail t/c=0.10, tail location x/c=1.0 | 4.433 | 1846.8 | 1665.7 | 1.2 | overlap |
| 5 | b | tail off (body alone) | 0.475 | 656.3 | 1701.1 | 1.5 | partly-hidden;overlap |
| 5 | b | tail off (body alone) | 1.832 | 1064.4 | 1706.4 | 1.2 | - |
| 5 | b | tail off (body alone) | 3.308 | 1507.0 | 1701.8 | 1.2 | - |
| 5 | b | tail off (body alone) | 4.431 | 1846.2 | 1695.8 | 1.2 | overlap |
| 7 | single | with 10% thick cruciform tail surfaces, x/c=0; present tests | 1.500 | 1088.3 | 627.7 | 1.2 | - |
| 7 | single | with 10% thick cruciform tail surfaces, x/c=0; present tests | 2.001 | 1460.5 | 1021.7 | 1.2 | - |
| 7 | single | without tail surface; present tests | 1.500 | 1086.0 | 1038.4 | 1.2 | - |
| 7 | single | without tail surface; present tests | 2.002 | 1460.0 | 1172.6 | 1.2 | - |
