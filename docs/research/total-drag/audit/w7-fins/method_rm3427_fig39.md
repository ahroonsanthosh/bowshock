# ARC R&M 3427 fig. 39: surface pressures upstream of the base, first reading (method)

**Source.** Nash, Quincey and Callinan, ARC R&M 3427 (AERADE 1826.2/4011),
the copy of `method_rm3427_fig13.md`: downloaded again on 2026-10-22 into
a new empty directory, 64 PDF pages, sha256
0e8b4d6629eed639e87dca2ed99eb8bf715f24ca5d5bf01c6a165249ea3c5319 (the
same). Fig. 39, "Effect of base conditions on surface pressures upstream
of base", PDF p. 56 (printed p. 55), beside fig. 38's photograph. Named
band-setting by 0014 section 10.7 (l) before this reading. Read for 0019
(F4). Read blind to round 10: none of its files was opened.

**What the figure holds.** At M_inf 0.8, Cp (negative upward) against x/h
from -2 to 0, for three models: the basic model (circles, full line), the
model with a 1 x h splitter plate (crosses, dashed), and the
backward-facing step (squares, full line). Each has five symbols: at x/h
about 0 (on the vertical axis: the base, or the step's face) and at holes
4, 3, 2 and 1 (x/h -0.167, -0.330, -0.667, -1.667, fig. 3). The read x/h
values (-0.154 to -0.166, -0.323 to -0.329, -0.681 to -0.685, -1.664 to
-1.673) agree with those holes within 0.013.

**Method.** The page rendered at 300 dpi (`pdftoppm -r 300 -f 56 -l 56`),
page pixels throughout. No grid.

- _Axes._ The vertical axis is the line x 2575.2 to 2576.0 over its length
  (vertical; the photograph's top edge on the same page is level to 1 px
  over 780 px, so the page is not rotated). The horizontal axis falls by
  about 5 px from x/h 0 to -2 (1548.5 to 1552.7): drawn so, not the scan;
  its effect is carried in the error (below).
- _Cp ticks_ (they cross the vertical axis): centres from the dark-pixel
  profile left of the axis (right of it for -0.4, where the dashed curve
  crosses the left side), checked on a zoomed view: -1.0 537.5, -0.8 740.0,
  -0.6 940.5, -0.4 1145.0, -0.2 1347.3, and 0 at the horizontal axis where
  it meets the vertical one, 1548.5. A least-squares line: 1011.6 px per
  unit Cp, residuals 0.2, 0.4, -1.5, 0.7, 0.7, -0.5 px.
- _x/h ticks:_ -2 at 2076.7, -1 at 2325.0 (zoomed view), 0 at the vertical
  axis, 2575.7; piecewise linear between them (248.3 and 250.7 px per
  unit).
- _Symbols._ Rough centres placed by eye on zoomed views with pixel
  rulers (`scripts/zoom.py`), in `rm3427_fig39_rough.csv`; refined by
  `scripts/symfit.py` (circle, square and the x-shaped cross templates;
  shifts 0.25 to 1.5 px; every fit checked on its overlay). The cross at
  hole 2 (x2) is half hidden by the circle o2 below it and is placed on its
  upper arms.
- _Values:_ `scripts/fig39_calib.py` (the tick values are in it).
- _Errors_ (`cp_err`), in quadrature: the tick fit's largest residual (1.5
  px), the symbol's placement (its fit shift, at least 0.5 px), and the
  zero line's tilt (0.008 px per px left of the vertical axis, up to 3.3
  px at hole 1), divided by 1011.6 px. 0.0016 to 0.0037; x2 taken as
  0.003. x/h +-0.01.

**Reading** (`rm3427_fig39_first.csv`), Cp at x/h 0, holes 4, 3, 2, 1:

| Model | 0 | 4 | 3 | 2 | 1 |
| --- | --- | --- | --- | --- | --- |
| basic model | -0.742 | -0.427 | -0.348 | -0.277 | -0.224 |
| 1 x h splitter plate | -0.430 | -0.367 | -0.335 | -0.284 | -0.231 |
| backward-facing step | -0.242 | -0.254 | -0.232 | -0.210 | -0.197 |

Read once. A blind second reading is to be arranged by the coordinator;
no band is set until both are held and paired.
