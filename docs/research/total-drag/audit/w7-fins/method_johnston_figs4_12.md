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
`scripts/johnston_fig10_run.py b` reproduces the CSV from these files.

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

## Figs. 10(a) and 10(c): forebody and total pressure drag (PDF pp. 32, 34)

**Method.** As fig. 10(b), with two changes. The pages lean (the grid
lines drift 4 to 6 px over the plot), which `calib.py`'s traced lines
follow. And the triangles of both incidences are refined too (the
outlines are clearer here): `symrefine.py`'s triangle is centred on its
centroid, its right triangle on its bounding box. Every fit was checked
on a contact sheet of all the symbols at 3x (each with its fitted outline);
where a fit scored low or took a neighbour, the symbol was placed by eye
at 5x to 6x (10 in fig. 10(a), 5 in fig. 10(c), kind "eye"). Fig.
10(a)'s rough placements were first taken from a half-scale view; in
fig. 10(c) that proved too coarse (several fell between symbols), so its
placements were redone on 3x to 6x views. `scripts/johnston_fig10_run.py
a` and `c` reproduce the CSVs. Fig. 10(a)'s grid line at c_d,f 0.10 is
too faint to trace and is left out (the calibration interpolates across
it, between 0.08 and 0.12).

**Errors**: as fig. 10(b); 2095 and 2093 px per unit M, 10475 and 10450
px per unit c_d. M 0.0005 to 0.0024; c_d,f 0.0001 to 0.0005; c_d,t 0.0001
to 0.0005.

**Reading.** Fig. 10(a) (`johnston_fig10a_first.csv`): 59 symbols, 12 at
alpha 0, 2, 4 and 6 each, 11 at alpha 8, M 0.68 to 1.23; at alpha 0
c_d,f rises from -0.008 at M 0.69 through 0.047 at 1.01 to 0.082 at 1.21.
Fig. 10(c) (`johnston_fig10c_first.csv`): 57 symbols, 11 at alpha 0, 12
at 2 and 4, 11 at 6 and 8; at alpha 0 c_d,t is 0.138 at M 0.69, 0.230 at
0.94 and 0.186 at 1.23.

**A check within the report** (not a test against other data): with
the base 0.20 of the chord, c_d,t should equal c_d,f - 0.20 C_p,b at the
same point. At alpha 0, M 1.01: 0.0471 + 0.20 x 0.9007 = 0.2272 against
0.2270 read; at M 0.69: 0.1386 against 0.1382. The three readings agree
to the reading's errors there.

**Uncertain calls and gaps.**
- Fig. 10(a): at M 1.01 the five symbols sit on the M 1.0 grid line;
  the right triangle (a8_07) is placed with 3 px, the triangle (a6_07)
  with 2.5 (faint, crossed by the faired curve).
- Fig. 10(c): no alpha 0 circle is seen at M 1.11 (the square, a2_09,
  stands where it would be); no alpha 6 triangle at M 0.91 (the right
  triangle a8_05 stands there); the alpha 8 right triangle at M 0.955
  (a8_06) is crossed by the alpha 6 triangle and two faired curves and is
  placed with 3 px.

## Figs. 4 to 9, 11 and 12: not yet read

Figs. 4 and 7 (normal force and pitching moment against M, symbols) and
the curve-only cross-plots (figs. 5, 6, 8, 9, 11, 12) have not been read.
The cross-plots are faired curves derived from the same pressure points
as figs. 4, 7 and 10, so they are not independent sets; whether they are
read at all, and whether F4 or F5 needs figs. 4 and 7 (lift and moment
are not in either term), is left to the coordinator.

Read once (figs. 10(a), (b) and (c)).
