# NACA RM A51J25 fig. 7 below M' 1.5: first reading for W7 (method)

**Source.** Chapman, NACA RM A51J25 (1951), NTRS 20030067332, downloaded
from NTRS on 2026-10-22 into a new empty directory: 18 PDF pages, sha256
97fa733be7b7f6291219a15031bd5fc9af0ceacda1395034d35713eef5e0b9bf. No hash
was recorded before (`docs/validation/sources.md` does not list it);
this one is the reference for later readings. Fig. 7, "Airfoils, base
pressure versus Mach number", PDF p. 14 (printed p. 26): p_b/p' against
the local Mach number M' ahead of the base, from five facilities, with a
faired curve. Named band-setting by 0014 section 10.7 (k), "below M' 1.5
too", before this reading. Read blind to round 4's reading of this figure
and to round 10: neither was opened. Only M' 1.5 and below is read here.

**What lies below M' 1.5.** The faired curve begins at M' about 1.16
(p_b/p' about 0.59) and falls to about 0.48 at 1.5. The Langley PARD
symbols (filled circles; rectangular wing, aspect ratio 2.7) are drawn on
it from its upper end, so densely that with the curve's stroke they form
one solid band of ink, 15 to 32 px high (0.023 to 0.049 in p_b/p'), in
which no single filled circle can be told from another except the
uppermost (f1). Four open symbols stand apart (s1 to s4).

**Method.** The page rendered at 300 dpi (`pdftoppm -r 300 -f 14 -l 14`;
the scan is 1 bit, 300 ppi), page pixels. No grid.

- _Axes and ticks_ (`scripts/ticks.py`): the vertical axis is M' 1, its
  course x 668 at y 620 to 671 at y 1190 (dx/dy 0.0057), 669.8 at y 1252;
  M' 2, 3, 4 at x 942.85, 1215.85, 1488.97 on the horizontal axis
  (residuals of the straight line through all four within 0.0002 in M').
  p_b/p' 1.0, .8, .6, .4, .2 at y 598.5, 732.0, 862.46, 994.5, 1126.42 (to
  the right of the vertical axis), and 0 on the horizontal axis at x 680,
  y 1255.5, which rises to the right (dy/dx -0.008); residuals within
  0.002. A point is moved along the axes' tilts to the tick row or column
  first (`scripts/a51_read.py`): 273.1 px per unit M', 657.2 per unit
  p_b/p'.
- _The band_ (`scripts/a51_read.py`, `scripts/a51_emit.py`): at M' 1.20 to
  1.50 by 0.05 the column of the page through that M' (at the band's
  height) is cut into ink runs; the run that holds the curve is taken (the
  others are the open symbols', checked on zoomed views, `scripts/zoom.py`
  5 to 7 times). Its top and bottom are given in p_b/p' with the
  midpoint, and err is half the band plus 1.5 px of calibration. At M'
  1.50 the run touches the outline of s4, so its top carries 3 px more.
  The midpoint is not the faired curve's centre: the circles sit on both
  sides of the line unevenly, so the band, not its midpoint, is what was
  read.
- _Symbols:_ centres placed by hand on the zoomed views; err 2 to 3 px of
  placement plus 1.5 px of calibration. s1 and s4 are squares with a
  triangle inside: the legend's Langley 9 x 12 in delta symbol (drawn
  that way in the legend) or an Ames square over an Ames triangle; which,
  the scan does not settle. s2 is the legend's half-filled triangle
  (Langley 9 in, two-dimensional); s3 the diamond (Langley 9 x 12 in,
  rectangular).

**Reading** (`rma51j25_fig7_below15_first.csv`). The band, top to bottom
in p_b/p': 0.596 to 0.547 at M' 1.20, 0.561 to 0.524 at 1.25, 0.545 to
0.522 at 1.30, 0.536 to 0.510 at 1.35, 0.521 to 0.496 at 1.40, 0.508 to
0.484 at 1.45, 0.488 to 0.470 at 1.50. The uppermost filled circle f1:
0.586 at M' 1.19. Open symbols: s1 0.498 at 1.257, s2 0.531 at 1.414, s3
0.463 at 1.423, s4 0.505 at 1.502.

Read once for W7. A blind second reading of the same region, and the
pairing, are the coordinator's to arrange; the earlier reading of the
curve below M' 1.5 (audit round 4, as 0008's source table records) is the
other one in hand, and was not opened for this one.
