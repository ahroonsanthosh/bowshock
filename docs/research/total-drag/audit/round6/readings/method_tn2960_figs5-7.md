# TN 2960 figs. 5(a) to 5(e), 6, 7: second reading, method

Gowen and Perkins, NACA TN 2960 (1953), NTRS 19930084018, the PDF from
`https://ntrs.nasa.gov/api/citations/19930084018/downloads/19930084018.pdf`
(27 pages, 300 ppi). Fig. 5(a) to 5(e) are PDF pp. 18 to 22, fig. 6 p. 23,
fig. 7 p. 24 (both landscape). Read blind: the round 4 readings of figs.
5(c) and 7 were not opened. Toolkit and error model as in
`method_tn3819_figs32-35.md`; specs `../scripts/specs/tn2960_*.json`.

## Symbols

Open symbols with centre dots, read by `scripts/symscan.py`: outline-
template correlation per shape at the legend glyph's size (measured on the
legend: circles about 54 to 69 px across, squares 48 to 60, diamonds 64 to
67 tip to tip, triangles about 56), kept only with a centre dot and an
empty interior. The reading is the template centre: the bounding-box
centre, and for triangles the point one third of the height above the
base. Flagged symbols (-theta side) are named "flagged" where ink lies in a
short sector outside the outline to the upper right (at least 35 percent
of the sector); the flag test is reliable for isolated symbols, less so
where symbols touch. The legend and text regions are left out of the scan;
specks and words found as symbols are excluded by position (`exclude`).
Coverage was checked on each overlay; a few symbols merged with a
neighbour are missing, and a few duplicates (one symbol found twice within
about 15 px) remain; compare by position. In fig. 5(b) the circle/square
naming is unreliable (the two glyphs are close in size); the positions are
good.

## Faired curves

Read by guided column reads (`scripts/mkguide.py` builds the path through
the symbols already read, `read.py` reads the curve's ink nearest the path,
+-18 px, avoiding gridline columns). Read between symbol stations (every
10 deg at 5, 15, ... in figs. 5(a), 5(d); at 5, 10, 20, 25, ... in 5(c)).
Where the path passes a symbol the reading can catch the symbol's outline;
fig. 5(d) carries an extra 0.01 at theta 100 to 180 for that. Blank values
are dash gaps or crowding. Theory curves were not read.

## Per figure

- 5(a) (M 0.05 and 0.06 to 0.07, 12 in. cylinder): P axis 1.6 to -3.2 (lines
  0.4 apart; the 0.8 and -0.4 lines, hidden by the legend and a curve, are
  interpolated across), theta 0 to 180 (lines 20 apart; the 160 line, under
  a curve, interpolated). 58 symbols, both faired curves (partial).
- 5(b) (M 0.7, 0.6, 0.5, 0.3; 0.3 and 0.5 in. cylinders): each Mach number
  has its own zero line, 0.4 apart (the arrows mark them). The axis labels
  1.6 and 0.8 belong to the top zero (M 0.7) and -0.8, -1.6 to the bottom
  zero (M 0.3): every value is read in the top zero's frame and shifted by
  0, 0.4, 0.8, 1.2 for M 0.7, 0.6, 0.5, 0.3 (`scripts/assign.py`; `how`
  gives the axis value and the shift). Each symbol is given to the curve
  whose hand path passes nearest it (within 40 px). 127 symbols, four
  curves at 18 angles each.
- 5(c) (M 1.49, 1.98, 2.90; 1 in.): P 2.4 to -1.6 (the 1.6 and 1.2 lines
  under the legend interpolated across). 50 or so symbols, three curves.
- 5(d) (M 1.98; R 13.2e5, 5.5e5, 1.3e5): one faired curve for all three.
- 5(e) (comparison with theory; the experimental curves at M 2.90, 1.49,
  0.70 and 0.06 with their symbols): 76 symbols (shape ranges restricted by
  P so that crowded triangles are not taken for squares).
- 6 (C_D against R, log axis): the ten "present tests" symbols (1 by 3 ft
  tunnel, M 1.49 circles and M 1.98 squares) placed by eye and centred by
  template; the log axis calibrated on every gridline (2e4 to 2e6; the
  decade lines 1e5, 1e6 identified from the spacing pattern and the
  labels). The other references' curves were not read. x error in `how`.
- 7 (C_D against M): the symbols of the 0.5 in. (circles) and 0.3 in.
  (squares) cylinders below M 0.9, the 1 in. supersonic-tunnel diamonds at
  M 1.49, 1.98, 2.90, and the ref. 15 triangles (two of them, behind the
  diamonds at M 1.5 and 2.0, placed by eye then template, "touch" error).
  The curves (other references) were not read.

## Not read or not reachable

Theory curves; the other references' curves of figs. 6 and 7. Nothing out
of reach.
