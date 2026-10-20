# TN 3819 figs. 32 to 35: second reading, method

Love, NACA TN 3819 (1957), NTRS 19930084517, the PDF from
`https://ntrs.nasa.gov/api/citations/19930084517/downloads/19930084517.pdf`
(68 pages, scans at 300 ppi). Fig. 32 is PDF p. 64, figs. 33 and 34 p. 65,
fig. 35 p. 66. Read blind: no earlier reading of these figures, and no
value derived from them, was opened.

## Method (all four figures)

- Each page rendered with pdftoppm at 600 dpi, grey (one scan pixel is two
  render pixels).
- Calibration from every gridline of the panel, not only two: lines found as
  long dark runs after a skew search (the scans are rotated by about 0.6 deg
  on p. 66), each fitted as a straight line along its length. A point's
  value is interpolated between the two lines that bracket it, each taken at
  the point's position along it, so rotation and uneven paper stretch are
  followed. Each line's value is counted from the printed labels (at least
  two labels per axis are on gridlines; the counts were checked against
  every label).
- Gridlines are cleared from the mask only where the dark run across them
  is no longer than the line's own width, so curves and symbols crossing
  them survive.
- Curves: column scans (`dig.track`), row scans for steep parts, or a 2-D
  stroke tracer (`stroke.trace2d`) for curves with sharp turns; seeds and
  segment limits are in `../scripts/specs/<figure>.json`. A value at an
  abscissa is a local straight-line fit to the traced ink centres within
  +-8 to +-15 render px. Where a curve meets the frame or a crossing breaks
  the trace, a single-column read of the ink run (`colreads` in the spec).
- Symbols: outline-template correlation (circle, square, diamond,
  triangle), half-sizes tried over +-7 px, the centre taken at the
  template's sub-pixel peak. For these outlines that is the bounding-box
  centre (circles, squares, diamonds), and for the triangle template the
  point one third of the height above the base, as 0008's rule asks.
  Flags on flagged symbols are not part of the template.
- Error (column `err_y`, data units): the quadrature sum of the trace's
  scatter about its local fit, a floor of one scan pixel for judging the
  ink's centre, the calibration (0.5 px plus the line-fit rms, on both axes,
  the x part through the curve's slope), and an extra term where curves
  merge or cross (stated in `how`). Symbols: one scan pixel plus the
  calibration on each axis (`x err` in `how`). The error is the reading
  error of the printed ink; it does not include the drawn line's own width
  (about +-0.0003 in P_B) or any drafting error.
- Run: `python3 -I read.py specs/tn3819_fig3N.json ../readings/tn3819_fig3N.csv`
  from `../scripts`; `_cal.txt` beside each csv holds its calibration
  numbers.

## Fig. 35 (P_B against M, t/c 0.10, x/c 0, zero sweep)

Axes: M 1.0 to 3.4 (25 lines, 0.1 apart), P_B 0 to -0.36 (19 lines, 0.02
apart). Calibration: 6.3e-4 in M and 1.27e-4 in P_B per render px;
straight-line residual of the gridlines 0.0011 in M (rms), 9e-5 in P_B.

Which line is the free-flight one. The legend draws it long dash, short
dash. Below M 1.65 only one such line exists (from M 1.0 at P_B -0.300).
At M 1.65 to 1.75 it merges with the dashed line coming down from M 1.52
(read as estimate B, which the text, p. 24, says is the better estimate at
the lower Mach numbers). Below the knee three lines descend; their dash
patterns were measured (`scripts/dashes.py`): the line with the largest
-P_B at a given M (long solid stretches, then a short dash) continues the
free-flight line; the middle one is evenly dashed (estimate B); the lowest
(estimate A) ends at M 2.56. They cross near M 2.2; above M 2.4 the
free-flight line is the middle of the three (long-short pattern: 231 px
ink, 20 to 27 px dashes, 456 px ink), the evenly dashed line lies above it
(dashes 53 to 80 px, gaps 16 to 38 px) and ends at M 3.0, and the free-flight
line ends at M 3.0 at -0.118. This assignment agrees with the text (p. 24):
estimate A closer to experiment at the higher Mach numbers, B at the
lower.

Read: the free-flight line at M 1.0 to 2.0 every 0.05 and 2.0 to 3.0
every 0.1; the no-fins estimate (the fig. 18 curve) at 1.0 to 3.4; the six
tunnel symbols. Extra error 0.002 at M 1.64 to 1.76 (the merge with
estimate B) and 0.003 at M 2.04 to 2.4 (three lines within 0.002 to 0.005
of each other). Estimates A and B were not read (calculations, not data).

## Fig. 32 (P_B against fin location x/c, several Mach numbers)

Axes: x/c +1.0 (left) to -1.5 (26 lines, 0.1 apart), P_B +0.08 to -0.40
(25 lines, 0.02 apart). Read: the measured curves of ref. 26 at M 1.50 and
2.00 (the long-short dashed curves; the text, p. 22, says they extend over
x/c = +-1, so they are read from +1 to -1 only) and the Langley 9-in. M 2.41
measurements (triangles, plain R = 2.8e6 and flagged R = 11.3e6, which
overlap at most stations and are read as one symbol each where they do;
the faired curve through them read at x/c 0 to 1). The calculated curves
(circles and squares from fig. 30, the Prandtl-Meyer line) were not read.
M 2.00 from x/c -0.55 to -1.0 runs within about 0.002 of the dashed
Prandtl-Meyer line: extra error 0.002 there; at x/c -0.1 it crosses that
line (column read, extra 0.002). M 1.50 between x/c 0.3 and 0.05 and
beyond -0.45 is steep (0.04 to 0.05 in P_B per 0.1 in x/c): its error is
mostly the x calibration through the slope.

## Fig. 33 (P_B against t/c, x/c 0)

Axes: t/c 0 to 12 percent (7 lines, 2 apart), P_B -0.12 to -0.36 (13 lines).
Read: the eight symbols (M 1.50 circles and M 2.00 squares at t/c 0, 5, 10;
M 2.41 diamonds at 0 and 10; the diamond at t/c 0 sits on the frame corner)
and the faired curves between them at t/c 1 to 4 and 6 to 9 (curve values
at the symbols themselves are the symbols').

## Fig. 34 (RM-10, P_B against M, t/c 0.10, 60 deg sweep)

Axes: M 1.4 to 2.2 (9 lines), P_B 0 to -0.24 (13 lines). Read: the four
circles (with fins) and four squares (without fins) of ref. 36, and the
faired curves between them.

## Not read or not reachable

Nothing in these four figures was out of reach. Not read by choice:
estimates A and B (fig. 35) and the calculated curves of fig. 32, which
are not measurements.
