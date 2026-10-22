# ARC R&M 3348 fig. 30 (a) and (b): first reading (method)

**Source.** Rogers, Berry and Quincey, ARC R&M 3348 (AERADE 1826.2/3929),
downloaded on 2026-10-22 into a new empty directory: 107 PDF pages,
sha256 d2f35d8a07f34916a386ae0cf379e947ff5d06248c5555dbbfc313eab383e158,
the same as round 8's copy (`../round8/method.md`). Fig. 30, "Effect of
wing sweep on base pressures measured on single-wedge wing (eta = 0.59;
alpha = 0 deg)", PDF p. 68 (printed p. 67): (a) p_b/p_0 against the
stream Mach number M_0, (b) against M_0 cos(phi). Named band-setting by
0014 section 10.7 (k) before this reading.

**Blindness.** Round 10 has read this figure; none of its files, nor any
pairing file, was opened. The figure was read as drawn: table 3 (whose
values are typed in this folder) was not opened or consulted while
reading, and no value was moved toward it. Panel (b) was not filled from
panel (a) either: each panel's symbols are what that panel shows.

**Method** (both panels). The page rendered at 300 dpi (`pdftoppm -r
300`), page pixels.

- _Grid._ Lines every 0.1 in both variables, found from column and row
  profiles (`scripts/gridfind.py`) and traced along their length by
  `scripts/calib.py` on each panel's own crop (page (180, 880) to (850,
  1800) for (a), (860, 880) to (1900, 1800) for (b); `scripts/shift.py`
  moves points and grid into the crop and back), because on the full page
  a trace picks up the other panel's lines, 6 to 7 px away. Grid files
  `rm3348_fig30a_grid.json`, `rm3348_fig30b_grid.json` (page
  coordinates). About 1170 to 1185 px per unit on both axes; the lines
  lean by up to 5 px over the panel.
- _Symbols._ Rough centres placed by eye on zoomed views with pixel
  rulers (`scripts/zoom.py`, 2 to 5 times), written by
  `scripts/f30a_rough.py` and `scripts/f30b_rough.py`
  (`rm3348_fig30a_rough.csv`, `rm3348_fig30b_rough.csv`); refined by
  `scripts/symfit.py` (circle, square, triangle, diamond, cross), every
  fit checked on its overlay. `scripts/merge_fit.py`: a fit that moved
  more than 3 px is not used (the hand centre kept, +-2.5 px); the plus,
  the right-pointing triangle and the ellipse have no template (hand,
  +-1.5 px); a fit used carries +-1 px. Errors (`scripts/emit_reading.py`):
  the placement and 0.5 px of grid trace in quadrature, over the local
  scale, 0.0009 to 0.0022 in each variable.

**Panel (a)**, `rm3348_fig30a_first.csv`: 50 symbols. phi 0 deg 13
(circles), 15 deg 10 (crosses), 30 deg 9 (triangles), 45 deg 9 (pluses),
60 deg 9 (squares), at M_0 0.70 to 1.20. Hand-placed after the fit moved
(more than 3 px): o06, x03, x08, t02, t05, t08, s01.

**Panel (b)**, `rm3348_fig30b_first.csv`: 56 symbols. Present results 48:
phi 0 deg 13, 15 deg 10, 30 deg 8, 45 deg 9, 60 deg 8 (the 60 deg point
at M_0 0.70 would lie at M_0 cos(phi) 0.35, off the axis, which starts
at 0.4). Goin's results 8: t/c 3% squares, 4.5% diamonds, 6%
right-pointing triangles, 10% ellipses, each at M_0 cos(phi) 1.00 and
1.15. The dashed mean curve of Cleary and Stevens is not read.

**Uncertain calls, for the pairing.**

1. Panel (b) shows 8 triangles for phi 30 deg against 9 in panel (a). No
   triangle is visible in (b) where (a)'s M_0 1.0 point (p_b/p_0 0.567)
   would fall (M_0 cos(phi) 0.87); the circle at 0.86 (0.564), the plus
   at 0.85 (0.566) and the cross at 0.865 (0.574) lie there, and a
   triangle may be hidden among them. Recorded as drawn: absent.
2. In (a), t05 (M_0 1.003, 0.567) sits on its own line and on the M 1.0
   grid line; t02 (0.802, 0.719) touches the grid line M 0.8: both
   hand-placed, +-2.5 px.
3. In (b), the cluster at M_0 cos(phi) 1.0 (circle o10, Goin's four
   symbols, the 15 deg cross x08 and the 30 deg triangle t07) is
   crowded; t07, t08, gs01, gs02, gd01, gd02 are hand-placed.
4. In (a) the two 30 deg triangles at M_0 1.16 and 1.18 (0.456, 0.458)
   are two symbols, not one drawn twice.

Read once. A blind second reading exists (round 10's); the pairing is a
neutral party's.
