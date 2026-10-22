# ARC R&M 3427 fig. 13, hole 4: first reading (method)

**Source.** ARC R&M 3427, the copy and sha256 of `method_rm3427_fig39.md`
(the same file as `method_rm3427_fig13.md`'s). Fig. 13, PDF p. 37, the
lower panel ("On surface upstream of base"): surface pressure against
M_inf at holes 1 to 4. Hole 4, x/h -0.167 (fig. 3; "x/h = -0.167 (4)" on
the figure), plus symbols. Named band-setting by 0014 section 10.7 (m)
before this reading; holes 1 to 3 are not named and were not read. Read
blind to round 10.

**Method.** The page and crop of `method_rm3427_fig13.md` (300 dpi, page
pixels (473, 1386), 1491 by 1258) and its grid file
`rm3427_fig13_grid.json`, with `scripts/calib.py` (each grid line traced
along its length, a point interpolated between the lines either side of
it). The plus symbol has no template in `scripts/symfit.py`, so each
centre was placed by hand on zoomed views with pixel rulers
(`scripts/zoom.py`, 3 to 6 times), at the crossing of the arms:
`rm3427_fig13_hole4_rough.csv`.

- Hole 4's symbols were followed along its own line: level from M 0.4 to
  0.8 (the plus at 0.4, 0.6 and 0.8 sits on the grid line, its vertical
  arm hidden in it), a dip at M 0.85 and 0.875, the peak at 0.9 where the
  four holes' curves cross (h4_07, among hole 1's crosses), then the
  uppermost of the four falling lines to M 1.05.
- The Mach numbers read (0.401, 0.600, 0.701, 0.801, 0.851, 0.874, 0.900,
  0.926, 0.949, 0.975, 1.050) fall on the tunnel's evident set points
  within 0.002; they are given as read.
- Errors: +-0.002 in both M and Cp (placement +-1.5 px at about 985 to
  1000 px per unit, and the grid trace); +-0.003 for h4_06 and h4_07,
  where other lines and symbols touch.

**Reading** (`rm3427_fig13_hole4_first.csv`): Cp -0.408, -0.421, -0.428,
-0.429 at M 0.40, 0.60, 0.70, 0.80; -0.383, -0.353 at 0.85, 0.875; -0.468,
-0.426, -0.385, -0.345 at 0.90, 0.925, 0.95, 0.975; -0.227 at 1.05.

Read once; a blind second reading is to be arranged by the coordinator.
