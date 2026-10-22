# NASA CR-149372 fig. 8a: first reading (method)

**Source.** Macha, NASA CR-149372 (1976), NTRS 19770008057, downloaded
from NTRS on 2026-10-22 into a new empty directory: sha256
339f24fc82ecc0409c7bb93c83219c32caf5223241f0d452d9e4d9145ea59c18, the
same as round 7's copy (`../round7/method.md`, item 3, fig. 8b). Fig. 8a,
"Circular cylinder pressure distributions; Mach number = 0.6 to 0.9",
PDF p. 25 (report p. 24): Cp against theta (deg), Re 0.19e6, diameter
1.91 cm. Named by 0014 section 10.7 (k) as a check of 0019's ordering for
rounded edges; it sets no band.

**Blindness.** Round 10 has read this figure; none of its files, nor any
pairing file, was opened. The reviewer's first look at fig. 8a (four
integrated front-side values, 0019 section 3.2, and the script
`review-0019/scripts/fs8a.py` on `claude/wip/results`, which I ran for
the re-review's N5) was seen before this reading. That script holds the
reviewer's rough pixel positions at 220 ppi. They were not used to place
any symbol, and the reading was not compared with them.

**The scan.** A halftone, about 2 px dots; the symbols (circle M 0.6,
square 0.7, triangle 0.8, hexagon 0.9, each with a centre dot) touch
their faired curves and each other at theta 0 to 15 deg and 60 to 180
deg.

**Method.** The page rendered at 300 dpi; copies blurred with a Gaussian
of 0.8 and 1.5 px for viewing. Symbols identified and centred by hand on
zoomed views (`scripts/zoom.py`, 3 to 6 times), checked on numbered
overlays (`scripts/mark.py`), written by `scripts/f8a_rough.py`
(`cr149372_fig8a_rough.csv`). `scripts/symfit.py` was tried and not used:
its templates reached the edge of their search on almost every symbol of
this halftone. Enclosed-hole detection (`scripts/holes.py`) was tried as
an aid and not used either. Grid every 30 deg and 0.4 in Cp, traced on
the 1.5 px blurred copy (`scripts/calib.py`, `cr149372_fig8a_grid.json`,
page pixels). The drawn grid is uneven in theta: 227, 215, 228, 221, 225
and 212 px per 30 deg. The local interpolation follows it. Errors:
+-2.5 px placement and 0.5 px trace, 0.34 deg in theta and 0.0035 in Cp;
+-4 px for the three flagged below.

**Reading** (`cr149372_fig8a_first.csv`): 95 symbols. M 0.6 27 circles,
M 0.7 24 squares, M 0.8 22 triangles, M 0.9 21 hexagons. A check, not a
target: at theta 0 the four read 1.092, 1.132, 1.161 and 1.213. The
isentropic stagnation values are 1.093, 1.129, 1.170 and 1.219 (from the
Mach numbers, not from any reading).

**Uncertain calls, for the pairing.**

1. h12, theta 88.9 deg: a second hexagon overlapping h11 (theta 83.5);
   no centre dot is visible, so it is centred on its outline (+-4 px).
2. t12, theta 74.2 deg (-1.017): a triangle outline between t11 and
   t13, among crossing lines; it may be the gap between two curves
   (+-4 px).
3. s22, theta 177.0 deg (-1.349): a square-like shape between c27 and
   s23 at the right edge; it may be part of s23 (+-4 px).
4. Circle against square on the plateau at theta 90 to 100 deg (c17,
   c18 round; s15 square): told apart by corners at 6x on the 0.8 px
   copy. The two series cross there.
5. s24 at theta 181.2 deg is read a little past the 180 deg line, as
   drawn.

Read once. Round 10's blind reading exists; the pairing is a neutral
party's.
