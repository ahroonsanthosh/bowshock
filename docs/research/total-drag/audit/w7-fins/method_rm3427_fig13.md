# ARC R&M 3427 fig. 13: base pressure of the 10% blunt section, first reading (method)

**Source.** J. F. Nash, V. G. Quincey and J. Callinan, "Experiments on
two-dimensional base flow at subsonic and transonic speeds", ARC R&M 3427,
January 1963, published 1966 (N.P.L. Aero. Report 1070, A.R.C. 25 070).
AERADE 1826.2/4011, 64 PDF pages, sha256
0e8b4d6629eed639e87dca2ed99eb8bf715f24ca5d5bf01c6a165249ea3c5319. Fig. 13,
"Pressures on basic model. (Zero incidence.)", PDF p. 37 (printed p. 36).
Named band-setting by 0014 section 10.7 (k) before this reading. Read for
design record 0019 (F4: square trailing edges below Mach 1.5).

**The model** (section 2, figs. 2 and 3). Two-dimensional, spanning the 14
in width of the N.P.L. 18 in by 14 in tunnel: chord 6 in, a single-wedge
forebody of about 8.6 deg included angle, 4 in long, then a parallel
afterbody 2 in long and 0.6 in thick, so h / c = 0.10 and the base is
square. Slotted walls of one-eleventh open area; solid blockage about 3.5%;
"no corrections have been made for boundary interference and the values of
free-stream Mach number (M_inf) quoted may therefore be subject to slight
inaccuracies" (section 2.1). Re on the chord 0.8e6 at M 0.2 to 2.7e6 at
1.12 (section 3.1, fig. 1); transition free, the layers turbulent at the
trailing edge from M 0.4 (oil flow). Pressures by a mercury manometer bank
from M 0.4, by a gauge read to 0.1 in of water from M 0.2 to 0.4 (section
2.3).

**What the figure holds.** Above, the base-pressure coefficient at three
holes across the base; below, the surface pressure at four holes on the
afterbody (x/h -0.167, -0.330, -0.667, -1.667). Only the base holes are
read here: 10.7 (k) names fig. 13 for the base pressure, and the surface
holes are named in a dated entry before any is read (they give the local
conditions ahead of the base).

**Which symbol is which hole.** Fig. 3 (PDF p. 33) puts holes 5, 6 and 7
across the base, 0.1 in apart, hole 6 on the centre-line; the report
compares tests by hole 6 (section 3.3). Fig. 16(a) (M 0.8, zero
incidence) has the peak suction at y/h = 0, the hole at y/h +0.17 next and
the one at -0.17 least. Fig. 13 at M 0.8 has the circles most negative,
the squares next and the triangles least, and label 6's arrow ends on the
circles' line. So: circle hole 6, square hole 5, triangle hole 7. Label
5's arrow ends just above the circles' line near M 0.7, so the arrows alone
would not settle it. Fig. 16 is read separately; this identification uses
only its ordering.

**Method.** The page rendered at 300 dpi (`pdftoppm -r 300`, the scan's own
300 ppi, 1 bit) and cropped at page pixels (473, 1386), 1491 by 1258.

- _Grid._ Each grid line traced along its length in 60 px bands
  (`scripts/gridtrace.py`, and the same trace in `scripts/calib.py`): the
  lines are not square to the pixels. The vertical lines drift by up to 3.4
  px over the plot's height (M 1.0: 1189.0 to 1192.4), the horizontal ones
  rise by 3 to 6 px over its width (Cp -0.6: 461.6 to 466.1). A point's
  value is interpolated between the two lines either side of it, at those
  lines' positions where they pass the point; above the Cp -0.8 line it is
  extrapolated from the -0.6 and -0.8 lines. Scales: 990 to 1002 px per
  unit of M, 980 to 990 px per unit of Cp. The frame's top edge, at y 169.0
  near M 0.97, comes out at Cp -0.9004: the frame is the -0.9 line, and
  the extrapolation holds to 0.0004.
- _Symbols._ Rough centres placed by eye on zoomed views with pixel rulers
  (`scripts/zoom.py`), kept in `rm3427_fig13_rough.csv`; then each fitted
  by an outline template (`scripts/symfit.py`): circle, square, or a
  triangle pointing up with its centroid as centre, the size free, the
  centre searched over 3 px either side in 0.25 px steps, maximising the
  ink on the outline less the ink inside. Restarted from four rough centres
  displaced by 1.5 px diagonally, every fit returns to the same centre
  except o13 (0.5 px in y), t2 (1.25 px) and t3 (0.5 px). An overlay of
  the fitted outlines on the scan, checked by eye in the dense region (M
  0.85 to 0.98), sits on every symbol.
- _Not plotted._ Hole 5 (squares) has no symbols at M 0.2 to 0.6, 0.90 to
  0.93, nor from 0.977; hole 7 (triangles) none at 0.2 and from 0.977. A
  square fitted at the circles' centres there finds no corners outside
  the circles. From M 0.977 one symbol stands for all three holes: "the
  collapse of the base-pressure readings recorded at different points on
  the base to a single curve" (section 3.3).

**Errors (reading only).** Fit 0.5 px; start dependence where found
(above); the triangle's centre 1.5 px in y (centroid against the middle
of its height); grid tracing 0.3 px; combined in quadrature, 0.0006 for
circles and squares, 0.0016 to 0.0024 in Cp for triangles. 1 px is 0.00101
in M and 0.00102 in Cp. The draughtsman's placing is not known; the
report's text gives two checks: "reaching a minimum of -0.90" (read:
-0.8951 at M 0.9647, the circles' curve then drawn to the frame, -0.900,
at M 0.977) and "a rise in the base pressure coefficient from -0.9 to
-0.825" (read: -0.8236 at M 0.9773, the drawn jump at M 0.9772). So the
reading agrees with the text to 0.005 at the minimum and 0.0014 after the
jump.

**Results** (`rm3427_fig13_first.csv`). Hole 6: -0.610 at M 0.20, -0.627
at 0.40, -0.657 at 0.60, -0.747 at 0.80, -0.753 at 0.85, then the rise at
0.88 to 0.90 (-0.718, -0.717) that section 3.3 ties to the shock on the
afterbody, -0.755 at 0.93, -0.875 at 0.95, -0.895 at 0.965; after the jump
-0.824 at 0.977, -0.782 at 1.00, -0.693 at 1.05, -0.602 at 1.12. Holes 5
and 7 lie on the less negative side of hole 6 wherever plotted below the
jump: hole 5 by 0.009 to 0.038, hole 7 by 0.012 to 0.050, both largest at
M 0.95 (against hole 6's point nearest in M, at most 0.002 away).

**Points to watch when the band is formed.**

- One section, h / c = 0.10, with a wedge forebody and a parallel
  afterbody: the flow ahead of the base is the afterbody's, supersonic
  from the shoulder above about M 0.9 (section 3.2), so the local Mach
  number and pressure ahead of the base differ from M_inf and p_inf. A
  comparison with RM A51J25 fig. 7 (on M', p') needs hole 4's surface
  pressure (x/h -0.167), named before it is read.
- The vortex street sets the base pressure below M 0.975 (section 3.3):
  the transition and its Mach number depend on the section, so this
  section's jump at M 0.977 is not a general one. R&M 3348's unswept wedge
  (table 3, read twice, h / c 0.14) and R&M 3323 are the comparisons.
- The Mach numbers are uncorrected for blockage (section 2.1). The report
  states no accuracy for them or for the pressures; the band carries the
  difference between sources, which will exceed this reading's error.
- Hole 6 (the centre-line) is the most negative in the subsonic range; a
  base drag uses the mean across the base. Section 3.3: "it was not
  possible to estimate the mean base pressure reliably" from three holes.
  The spread of the three holes is part of the band.

**Status.** First reading, by the 0019 reader, 2026-10-22. Read once: the
blind second reading is to be arranged by the coordinator. Not yet used
for anything.
