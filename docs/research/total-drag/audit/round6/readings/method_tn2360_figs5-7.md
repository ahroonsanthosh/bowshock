# TN 2360 figs. 5 to 7: second reading, method

Spahr and Dickey, NACA TN 2360 (1951), NTRS 19930083086, the PDF from
`https://ntrs.nasa.gov/api/citations/19930083086/downloads/19930083086.pdf`
(26 pages, 300 ppi scans). Fig. 5(a) is PDF p. 22, 5(b) p. 23, 6(a) p. 24,
6(b) p. 25, fig. 7 p. 26. Read blind. Toolkit and error model as in
`method_tn3819_figs32-35.md`; specs in `../scripts/specs/tn2360_*.json`.

## What is special here: centre dots

Every plotted symbol has a centre dot (the plotting template's pin). The
dots are read (centroid of the dot blob) and the series named by matching
the outline around the dot against the legend's own glyphs
(`scripts/dots.py`; the plotted symbols are drawn up to 1.16 times the
legend size on p. 23, so scales are searched). The reported value is not
the dot but 0008's centroid: the dot plus the offset, measured on the
legend glyph, from the dot to the bounding-box centre (circles, squares,
diamonds, and the two shapes the rule does not name: the quarter-round of
x/c -1.0 and the dome of "tail off") or to the point one third of the
height above the base (triangles, and the right triangle of x/c -0.6).
`scripts/legendcheck.py` prints these offsets: within 1.5 px of the
bounding-box centre for circles, squares and diamonds; the triangle dots
sit 3 to 5 px (0.0006 to 0.0008 in P_B on fig. 5) above the one-third point;
the dome's and quarter-round's 4.5 to 7.5 px below their box centres. The
dot's own position is given in `how` as well, so either convention can be
compared.

Where a dot could not be separated (merged with a faired line or a
gridline, or the symbol partly hidden), the legend glyph itself was used as
the template at a position named by eye (`glyph_at` in the spec, "legend-
glyph template" in `how`), with an extra error where symbols overlap.

## Fig. 5(a), (b): P_B against R, cruciform tail, t/c 0.10, M 1.5 and 2.0

Axes: R 0 to 5 (x 10^6, as printed; 11 lines, 0.5 apart); P_B 0 to -0.40
(fig. 5(a)) and 0 to -0.35 (5(b)), lines 0.05 apart. Curves were not read:
the faired lines join the symbols, which are the data. 5(a): all 28
symbols (7 series, 4 stations at R about 0.6, 1.95, 3.25, 4.43); the dot of
the x/c -1.0 symbol at R 1.95 merges with its faired line, the tail-off
symbol at R 0.76 is half hidden behind the circle and square (extra
0.003). 5(b): the symbols overlap heavily at R 0.6 and 1.87; every one of
the 28 was named by eye from 1.4x zooms and centred with the glyph template
(extra 0.001 to 0.002 where partly hidden; the tail-off dome at R 1.85
sits on the -0.15 gridline and matched weakly, 0.47).

## Fig. 6(a), (b): Delta P_B against x/c, plane and cruciform tails

Four panels, each its own csv. Axes: x/c +1.0 (left) to -1.0, lines 0.2
apart (one or two lines whose fit was doubled, near x/c 0 and -0.2 or -0.6,
left out of the calibration and interpolated across); Delta P_B -0.15 to
+0.15 (6(a) cruciform: -0.20 to +0.20), lines 0.05 apart. Symbols: circles
t/c 0.05, squares t/c 0.10, many stations carrying two or three
overlapping squares (repeat points), each read where its dot shows.
Fig. 6(b)'s legend glyphs have no dots; they were centred on their outline
boxes. The simplified-analysis lines (calculations) were not read; nor the
faired curves, which pass through the symbols. In the 6(b) cruciform
panel the circle/square naming is marked "LOW MARGIN" for most symbols:
the two glyphs differ little at this size and the symbols stack two or
three deep at x/c 0.2 and 0. The naming there is not certain (the symbol at
x/c 0, -0.050 may be a circle); compare by position as well as by name.

## Fig. 7: P_B against M, with and without tail

Axes: M 1.0 to 3.6 (14 lines, 0.2 apart), P_B 0 to -0.40 (lines 0.05 apart;
the -0.35 line, crossed by the legend, is left out and interpolated
across). Read: the four symbols (present tests, M 1.5 and 2.0, with the 10%
cruciform tail at x/c 0 and without tail), the ref. 4 dashed curve (M 1.0 to
2.52, with tail) and the solid average of refs. 1, 2, 3 (M 1.25 to 3.45,
without tail). The solid curve passes through the M 2.0 circle; it is read
at 1.95 and 2.05 instead. Dashed-curve readings that fall in a gap between
dashes are left blank ("not traced"), not interpolated.

## Not read or not reachable

Nothing out of reach. Fig. 1 (a compilation) is not band-setting and was
not read.
