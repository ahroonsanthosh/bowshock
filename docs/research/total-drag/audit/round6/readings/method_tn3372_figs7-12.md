# TN 3372 figs. 7 to 12: second reading, method

Peck, NACA TN 3372 (1955), NTRS 19930084618, the PDF from
`https://ntrs.nasa.gov/api/citations/19930084618/downloads/19930084618.pdf`
(22 pages, 300 ppi). Figs. 7, 8, 9 are PDF pp. 16, 17, 18 (two panels each,
models 1 and 2); fig. 10 is the top of p. 19, fig. 11 its bottom; fig. 12 is
p. 20. Read blind. Toolkit and error model as in
`method_tn3819_figs32-35.md`, symbols as in `method_tn2360_figs5-7.md`
(centre dots); specs `../scripts/specs/tn3372_*.json`, the symbol-panel specs
written by `../scripts/mkspec3372.py`.

Quantity: Delta p / q (the base pressure coefficient, negative upward on
the axes: -0.32 at the top to 0, or -0.08 to +0.16 on fig. 10), against M
0.6 to 1.2. Axis values checked against the text layer's label positions
(`pdftotext -bbox`): every label sits on the line it was given.

## Figs. 7 to 10: the symbols (edge orifice, squares; centre orifice, circles)

Every symbol has a centre dot. Dots found automatically; named by matching
against the legend glyphs, and where the match margin is small by the ratio
of the outline's distance from the dot along the diagonals to that along
the axes (a square's corners lie sqrt(2) further out; a circle's ratio is
1), measured on the gridline-cleaned mask. In `how`, "match 1.00 (next
0.00)" means that ratio decided; "match 0.60 (next 0.55)" means it was
ambiguous and the template's choice stands. The value is the 0008 centroid
(the square's dot sits 4 px right of and 4 px above its box centre on the
legend glyph; the offset is applied). Overlapping pairs whose dots could
not be separated were placed with the legend glyph (`glyph_at`, extra
0.002 to 0.003); a few dot-like specks outside any symbol (and the "i"
dots of the legend text) were excluded by position (`exclude` in the
specs); one symbol was named by eye (`rename`, fig. 9 model 1, the upper
square at M 0.99).

Counts read: fig. 7 model 1, 48; model 2, 59; fig. 8 model 1, 52; model 2,
50; fig. 9 model 1, 47; model 2, 53; fig. 10, 48. Where a circle and a
square sit on each other at one Mach number, both are read only if both
dots show; a few such pairs may be read as one symbol.

Fig. 10 (configuration D): the print is faded at M 1.0 to 1.11 (symbols
grey and broken in the scan). Readings there carry an extra 0.003 and
"faded print" in `how`; their naming is unreliable and their scatter (edge
orifice -0.003 to -0.041 at M 1.05 to 1.11) larger than elsewhere. Fig. 12's
faired D curves are the better source for M 1.04 to 1.13.

## Fig. 11: average edge-orifice Delta p / q, configurations A, B, C (curves)

Axes as fig. 7. Which curve is which: the leaders cross each other near
M 1.0 and could not be followed with confidence, so the curves were named
from this reading's own symbols (averages of the squares of figs. 7 to 9 at
M 0.8 and 1.0: A -0.099, -0.208; B -0.124, -0.218; C -0.127, -0.243): A is
the solid curve (least suction at M 0.8), C the long-dash curve that rises
first and peaks highest, B the short-dash one. The bottom leader (labelled
C) ends on the long-dash curve, which agrees. Read by guided column reads
at M 0.70 to 1.125 (A to 1.15); B and C lie within 0.002 to 0.004 of each
other at M 0.74 to 0.96 (extra 0.002); C at M 0.975 and 1.025 falls in dash
gaps and is not read.

## Fig. 12: summary curves

Axes: M 0.6 to 1.2 (the 1.2 line not found; 0.6 to 1.15 used), Delta p / q
-0.32 to +0.16 (13 lines). Read where the curves are apart: the A, B and C
centre-orifice curves and the A-B-C average edge-orifice curve at M 0.65 to
0.875 (named by their order there, which matches the order of the circles
and squares of figs. 7 to 9), and the D edge and centre curves at M 1.05 to
1.125 (edge the more negative, as fig. 10's clear symbols at M 1.14 to 1.18
show). Not read: M 0.9 to 1.04, where six curves and five leaders cross
within a few hundredths, and the A, B, C curves above M 1.04, which run
within 0.01 of each other with long dash gaps; figs. 7 to 9 and 11 hold
those data.

## Not read or not reachable

Nothing out of reach; the parts of fig. 12 named above were not read.
