# Johnston, NASA Memo 4-30-59L, figs. 4 to 12: first reading (method)

**Source.** Johnston, "Transonic aerodynamic characteristics of two wedge
airfoil sections including unsteady flow studies", NASA Memo 4-30-59L
(June 1959; NTRS 19980228287), downloaded on 2026-10-23 from
`ntrs.nasa.gov/api/citations/19980228287/downloads/19980228287.pdf` into
a new empty directory outside the repository: 48 PDF pages, 1999058
bytes, sha256
f6af115c456c630e3808578810334ef66e90946fb7acf2714e2d20ce497054c3 (checked
again before this note was written). Named band-setting by 0014 section
10.7 (k): "figs. 4 to 12 (the sharp single wedge: forces from pressures,
base pressure and drag)".

**The model and tests** (the report's text, PDF pp. 4 to 6). A 20% thick
single wedge (leading-edge semi-angle 5.7 deg), chord 2 in, spanning the
4 in width of the Langley airfoil test apparatus (a transonic blowdown
tunnel, 4 by 19 in); 18 orifices on the surfaces and one on the base, on
the chord line. Stagnation pressure 26 psia, Reynolds number 1.2e6 to
1.4e6 on the chord; alpha 0 to 8 deg in 2 deg steps; data reduced at Mach
increments of about 0.025 to 0.05, M 0.70 to about 1.25. Forces are
integrated pressures (pressure drag only). The base is h/c 0.20 and h/s
0.10 (base height over tunnel width); the report says nothing about the
layer state at the base. The free-stream M and the free-stream dynamic
pressure define C_p,b, as 0019 section 3.4 now requires.

**Blindness.** No other reading of this report is known to exist in the
repository; I opened no file under `audit/round10/`, `round11/`,
`round12/` or any `pairing-*` folder.

**What the figures are.** Figs. 4 (c_n against M), 7 (c_m,le against M)
and 10(a) to (c) (c_d,f, C_p,b and c_d,t against M) carry symbols, one per
reduced test point, with faired curves. Figs. 5, 6, 8, 9, 11 and 12 are
faired curves only, cross-plots of the same points (c_n against alpha,
its slope, c_m and x_cp against c_n, drag and n/d against c_n).

## Fig. 10(b): base pressure coefficient (PDF p. 33)

**Method.** The page at 300 dpi (`pdftoppm -r 300 -f 33 -l 33`, 2542 by
3300 px).
Grid lines every 0.1 in M (0.6 to 1.3) and in C_p,b (-1.3 to -0.3),
found from profiles (`scripts/gridfind.py`) and listed in
`johnston_fig10b_grid.json`; `scripts/calib.py` traces each along its
length. The symbols are about 24 px across, drawn with thin, often broken
outlines, many with a centre dot: circle (alpha 0), square (2), diamond
(4), triangle (6), right triangle with its right angle at the lower right
(8). An automatic search for them (`scripts/symdetect.py`) gave too many
false matches on the faired curves to use, so every symbol was placed by
eye on views at 2x to 6x with a pixel ruler (`johnston_fig10b_rough.csv`),
assigned to its incidence by its shape and by the faired curve through
it. Circles, squares and diamonds were then refined by an outline fit
(`scripts/symrefine.py`: the centre over +-4 px, the size over +-2 px);
every fit was checked on the overlay and, in the clusters above M 1.0, at
6x. Fourteen symbols whose fit scored low or fitted a neighbour were
placed by eye at 6x instead (kind "eye", with their own errors). The
triangles are placed by eye at the centre of their bounding box.
`scripts/johnston_fig10b_run.py` reproduces the CSV from these files.

**Errors** (per row, in quadrature): the placement (1 to 2.5 px; 3 px for
the two faint triangles), 0.5 px of grid trace, and for triangles 4 px in
C_p,b (bounding box against centroid) and for the right triangles 4 px in
M (likewise). At 2085 px per unit M and 2094 px per unit C_p,b: M 0.0005 to
0.0015, C_p,b 0.0005 to 0.0024.

**Reading** (`johnston_fig10b_first.csv`): 98 symbols: alpha 0, 20 (M
0.689 to 1.233); alpha 2, 21 (0.679 to 1.233); alpha 4, 20 (0.684 to
1.233); alpha 6, 18 plus two faint triangles near M 1.21 and 1.22 whose
kind (6 or 8) is uncertain; alpha 8, 18 (0.682 to 1.207). At alpha 0
C_p,b falls from -0.73 at M 0.69 to its least, -1.00, at M 0.94 to 0.96,
and rises to -0.90 at 1.01 and -0.53 at 1.23; above M 1.0 the alpha 0, 2
and 4 symbols lie within about 0.02 of each other.

**Uncertain calls.**
- Above M 1.0 the circle, square and diamond of each Mach number are
  drawn over one another; each was told apart at 6x (the diamond's apex
  usually stands above the other two), but at M 1.01 the three were
  placed at one centre with 2.5 px.
- At M about 0.985 only a square (alpha 2) and a triangle (alpha 6) are
  seen; no circle (alpha 0) or diamond (alpha 4) outline shows around
  the square, so none is placed: either the report reduced no point
  there or the symbols lie exactly under the square. Likewise no alpha 8
  symbol is seen at M 0.96 to 0.985 (one may lie under the alpha 6
  triangle at 0.96).
- Two faint triangles at M 1.21 and 1.22 (a6_19, a6_20), broken to
  fragments in the scan: their kind is uncertain (flagged "6?").
- A small mark at M 0.915, C_p,b -0.79 (an arrow-like stroke) is not a
  symbol and is not read.

Read once (fig. 10(b)).
