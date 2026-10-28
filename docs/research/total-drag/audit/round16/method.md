# NACA TN 3819, fig. 32: blind third reading (fig32c)

Reader: blind reader working only from the PDF fetched here and from its own renders and scripts.
Date: 2026-10-26. Nothing in this folder is committed (the coordinator asked for no commits).

## 1. What I opened and what I did not

Opened:
- The reader brief `scratchpad/lift-near-base/reader-brief-tn3819-fig32.md`.
- The shared brief `scratchpad/agent-brief.md`, because the reader brief says to read it first.
- My own folder `scratchpad/fig32c/` and the PDF I downloaded into it.

Not opened, listed or searched:
- Nothing in the bowshock repository. The reader brief allows `docs/research/total-drag/audit/round13/method.md`
  for the format of a method record, but the coordinator's message said not to open the repository at all
  and nothing under `docs/`, so I did not open it. The layout of this file is my own.
- `scratchpad/decisions.md`, any `status/*.md`, `scratchpad/fig32/` (the other reader's work), and every other
  scratchpad folder. I ran no git command.
- No other figure of the report was read for values. I read only text, the symbols page and the captions of
  figs. 28 to 31 (caption text only).

Nothing was opened by mistake.

## 2. Source

- URL: https://ntrs.nasa.gov/api/citations/19930084517/downloads/19930084517.pdf
- Downloaded file: 31,890,253 bytes, SHA-256 `9acd67dc393b26162f773602f477be6e9bf3b5e2823edb18df105a1159c9ce55`.
  It does not start with `%PDF-`: a 436-byte NTRS wrapper comes first.
- Cut at the first `%PDF-` (byte offset 436): 31,889,817 bytes, SHA-256
  `c0c3a964d17c93c0133202ed512bbc10018ce7b228ad5f4edc079f73b32693af`, 68 pages, Adobe Paper Capture scan
  (`scripts/01_cut_wrapper.py`, output in `scripts/01_cut_wrapper.out`).
- Fig. 32 is on PDF page 64 (printed page 62). The caption confirms it: "Figure 32.- Measurements and estimations
  of the effects of fin location upon base pressure at several Mach numbers."
- Pixels: each page is one embedded RGB JPEG at 300 ppi. I extracted the page 64 image losslessly
  (`pdfimages -j`, the original JPEG stream, no re-encoding): 2258 x 3092 px, SHA-256
  `c3ea56ee79ac39d780b36b93563ea4ba7542c37db771f09703a6d44f46fa6fd0`
  (`renders/p64native-000.jpg`). I worked in these native pixels. A 600 dpi render would only resample the
  same 300 ppi scan, so I did not use one. All pixel coordinates below and in the CSV are native scan pixels,
  origin at the top left of the page image, x to the right, y down. The figure sits upright on the page.

## 3. What I established before reading values

Page and line numbers are of `pdftotext -layout` output per PDF page, counting the running header as line 1.

1. **Model and tunnel.** PDF page 22 (printed 20), lines 6 to 22: "Additional unpublished data for a similar
   configuration have recently been obtained in the Langley 9-inch supersonic tunnel and are presented herein.
   The basic configuration consists of a cylindrical body equipped with an ogival nose and four equally spaced
   10-percent-thick fins having symmetrical circular-arc sections and rectangular plan forms. The ratio of fin
   span to body diameter is 3.5, the ratio of fin thickness to body diameter is 0.15, and the trailing edges of
   the fins are coincident with the base." And: "For the tests in the Langley 9-inch supersonic wind tunnel the
   nose of the body was conical but was far enough ahead of the fins to have negligible effect on the base
   pressure from nose shape. In addition, the body extended one fin chord behind the fin trailing edge."
   The fig. 28 caption (PDF page 59) gives t/c = 0.10 and t/D = 0.15, so the chord is 1.5 body diameters
   (my arithmetic, not stated as such). No chord length is given in the text.
   Support: the text does not say how the finned model was held (sting or not). The only Langley 9-inch
   remark on stings (PDF page 20, printed 18, lines 29 to 33) concerns angle-of-attack tests in general.
   Reynolds numbers: text, PDF page 22 lines 26 to 27, "approximately 3 x 10^6 and 12 x 10^6"; legend 2.8 x 10^6 and
   11.3 x 10^6. The length the Reynolds number is based on is not stated for these tests. At the lower one
   "laminar flow existed ahead of the fin-body juncture which caused turbulent flow"; at the higher one
   "natural transition occurred considerably ahead of the fin-body juncture" (same page, lines 27 to 30).
2. **x/c and its sign.** Symbols list, PDF page 6 (printed 4), last entry: "x distance from trailing edge of fin
   to base of body (positive when trailing edge is ahead of base) measured parallel to body center line";
   c is fin chord. PDF page 22 lines 39 to 41: "The values of x/c define the location with respect to the base of the
   trailing edge of the fin in terms of fin chord and agree with the convention used in reference 26."
   PDF page 23 (printed 21) lines 4 to 5: "at negative x/c the base of the fins protruded into the dead-air region
   behind the base". So positive x/c is trailing edge ahead of the base, negative is behind it. On the figure
   the abscissa "Fin location, x/c" runs from 1.0 at the left frame to -1.4 (labelled) and -1.5 (right frame):
   trailing edge ahead of the base on the left.
3. **Ordinate.** Axis title "Base pressure coefficient, P_B". Symbols list, PDF page 6:
   P_B = (p_B - p_inf)/q_inf, p_B base pressure. The tick labels read on the scan run -.40 at the top frame
   to .08 at the bottom frame, so more negative (lower base pressure) is up. I know this from the labels
   (section 5).
4. **Legend and other line types.** Legend box (lower left of the plot, gridlines blanked inside it):
   - open circle: "M = 1.93. Values from fig. 30 shifted to right 0.5 x/c": calculation (fig. 30 values were
     computed by the report's method, PDF page 22 lines 41 to 43).
   - open square: "M = 2.41. Values from fig. 30 shifted to right 0.6 x/c": calculation.
   - "Measured P_B, M = 2.41, Langley 9" SST": open triangle "R = 2.8 x 10^6" and flagged triangle
     "R = 11.3 x 10^6": measurements. These are the symbols read here.
   - short dashes: "Prandtl-Meyer calculation, M = 2.00, shifted to right 0.5 x/c": calculation.
   Outside the legend, two labelled curves with leaders: "M = 1.50, ref. 26, measured P_B" and
   "M = 2.00, ref. 26, measured P_B": measurements of reference 26, drawn as short-dash long-dash curves
   (PDF page 23 lines 9 to 12). Solid lines are drawn through the circles, the squares and the triangles;
   they have no legend entry. The solid line through the triangles is the faired curve read in section 7.
   No Reynolds number is given for the circles, squares or reference 26 curves.
5. **Values without fins.** None. I looked over the whole frame and the legend (tiles `renders/t_*.png`,
   `renders/c_left.png`): there is no line, symbol or note for the body without fins on fig. 32.
   The text says (PDF page 23 lines 20 to 21) "At M = 2.41 the experimental measurements of P_B were
   confined to positive x/c".

## 4. Symbols found, data or key

Every triangle-like mark on the page (all checked on zoomed crops):

| mark | where | decision | why |
|---|---|---|---|
| 12 outlined triangles | x/c 1.0, 0.8, 0.6, 0.4, 0.2, 0.0, two at each | data | inside the frame, centred on the labelled and unlabelled vertical gridlines of those stations, joined by the solid faired curve |
| open triangle at (985, 1839) | legend box | legend key | inside the legend box where gridlines are blanked, beside "R=2.8x10^6" |
| flagged triangle at (985, 1879) | legend box | legend key | inside the legend box, beside "R=11.3x10^6" |
| two filled arrowheads, tips near (945, 1352) and (1408, 1049) | on the ref. 26 curves | part of labels | ends of the leader lines from the "ref. 26" labels; filled, no outline triangle |

No triangle exists at x/c outside 0 to 1.0, and none elsewhere in the frame (tiles of the whole frame
viewed at native resolution). Count per station: **2, 2, 2, 2, 2, 2** at x/c 1.0, 0.8, 0.6, 0.4, 0.2, 0.0;
12 data symbols in all.

## 5. Calibration

Gridlines (`scripts/04_gridfit.py`, `readings/gridfit.json`, `scripts/04_gridfit.out`): each of the 26
vertical lines (x/c 1.0 at the left frame to -1.5 at the right frame, 0.1 apart) and 25 horizontal lines
(-0.40 at the top frame to +0.08 at the bottom frame, 0.02 apart) was fitted along its whole length as a
straight line through the darkness centroids of every clean crossing scan line (800 to 1300 per line, 3-sigma
clipping). Residual rms 0.24 to 0.46 px per line. Vertical lines lean by -0.0004 to -0.0011 px per px and
horizontal lines by +0.0011 to +0.0021 px per px, so the scan is turned by about 0.06 to 0.1 degree with a
small shear; both are followed because each line is evaluated at the point's own row or column.

Labels against lines (`scripts/14_labelcheck.py`, `.out`): the 13 y labels sit beside every second horizontal
line, -.40 at the top frame line to .08 at the bottom frame line, label ink centres within 3.2 px of their
lines. The 13 x labels sit under every second vertical line, 1.0 at the left frame to -1.4; unsigned labels
are within 1.4 px of their lines, signed ones are pulled left by their minus signs, and "1.0" is printed
15 px right of the frame line (inside the frame). No label is nearer another line. Unlabelled lines take the
values implied by the uniform spacing of the labelled ones.

Primary calibration (`scripts/13_calib.py`, `.out`): a least-squares straight line through all 13 labelled
lines of each axis, each line evaluated at the point's row (x axis) or column (y axis).
- x: 63.85 px per 0.1 x/c; residuals of the 13 labelled lines rms 0.0004 to 0.0005, max 0.0009 x/c.
  The 13 unlabelled lines lie within 0.0012 of the fit.
- y: 63.40 px per 0.02 P_B (1 px = 0.000315); residuals rms 0.0001, max 0.0002 P_B.
  Unlabelled lines within 0.0002 of the fit.
Check: linear interpolation between the two gridlines that bracket the point. Calibration error per value is
the larger of the primary fit rms and |primary - check|; over all readings it is at most 0.0008 x/c and
0.00014 P_B.

## 6. The measured symbols

### Method

Native pixels, zoomed crops at 6 to 16 times (`renders/zs*.png`), raw grey dumps (`scripts/05_dump.py`), and
the same crops with every gridline's own cross profile subtracted (`scripts/09_degrid.py`,
`renders/dg_*.png`, a visual aid for strokes hidden under gridlines; values are always checked on the raw scan).
For each triangle (`scripts/08_linefit.py`, `scripts/15_triangles.py`, `readings/triangles.json`,
`scripts/15_triangles.out`): the centre line of each side was fitted on the scan rows where that side is
clean (darkness-weighted centroids in a window of +-1.2 to +-2 px), the base on clean columns. The apex is
the crossing of the two side lines, the base corners are the side lines at the base row, and the centre is
the mean of apex and corners, which is one third of the height above the base (the project's rule).
A Monte Carlo over the side fits and the base (2000 draws) gives the centring spread.
The drawn triangles are not all the same size (heights 10 to 17 px, widths 15 to 20 px), so I imposed no
template; each was measured from its own strokes. The fitted outlines are drawn in
`overlays/fig32_stations.png`.

### How the two Reynolds numbers were told apart

The legend's flagged key has a short stroke continuing from its apex up and to the right (6.4 px).
On the data symbols the flag is the same kind of stroke, 7.9 to 12.0 px long, going up and to the right at
40 to 55 degrees from the apex. For each flag I fitted its centre line and measured how far that line passes
from each nearby apex and how long it is from that apex to the tip (`scripts/15_triangles.out`, lines F..).
A symbol is called flagged only if a flag stroke starts at it; open only if the paper where its flag would be
is clean, or the only stroke there belongs to the other symbol.

### Per station (top and bottom are as printed: top is more negative P_B)

- **x/c 1.0: 2 symbols.** The left frame line runs through both.
  Upper (S01) **open**: the paper up-right of its apex (columns 411 to 415, rows 1764 to 1768) is clean
  apart from gridline -0.08, which crosses at row 1763; a flag there would show in its first 3 to 4 px,
  before it could reach the faired curve or the gridline. Lower (S02) **flagged**:
  flag from its apex to (413.7, 1805.0), 7.9 px, line 1.3 px from the apex. The right half of the lower
  symbol's base merges with gridline -0.06, so its base was read left of the frame (row 1828.31).
  The faired curve runs down through the right part of the upper symbol (section 7).
  Confidence: count high, identities high.
- **x/c 0.8: 2 symbols**, overlapping, with the faired curve and gridline -0.16 across them.
  Upper (S03) **flagged**: flag line passes 0.1 px from its apex (537.78, 1501.83), tip (544.8, 1497.0).
  Its two sides are clean on rows 1504 to 1508; its base is hidden under the curve and gridline but is seen
  on its right part (columns 541 to 545, row 1511.9) after gridline subtraction. Squat outline (h 10.1 px).
  Lower (S04) **open**: base clear (row 1521.14), sides clear on rows 1514 to 1520 only. Its apex is hidden.
  The two side lines meet at row 1503.7, but a lower symbol that tall would put left-side ink at columns
  536 to 537 on rows 1506 to 1508, and that paper is clean, so I did not use that apex. Its centre is
  taken as base minus h/3 with h = 14 +- 3 px (the measured symbols span 10 to 17 px), in the error.
  No flag can come from it: a flag from an apex hidden in the curve band would show at columns 543 to 547 on
  rows 1504 to 1506, which are clean.
  Two symbols rather than one: two separate bases (rows 1511.9 and 1521.1); on rows 1504 to 1508 the upper
  left side lies 2.4 to 4.1 px left of the lower symbol's left side extended, and the upper right side
  0.5 to 1.6 px right of its right side; and the flag starts at the upper apex.
  ALTERNATIVE (less likely): one tall flagged symbol only, centre P_B -0.1584 at x/c 0.798 (the extra strokes
  then have no explanation). Confidence: count medium-high, upper identity medium-high, lower position medium.
- **x/c 0.6: 2 symbols**, clearly separate. Upper (S05) **flagged**: flag line 1.8 px right of its apex,
  tip (673.9, 1490.0), 24.8 px from the lower apex. Its base lies in the band of the faired curve and
  gridline -0.16 (rows 1508 to 1511), taken 1509.5 +- 1.5. Lower (S06) **open**: complete outline, no flag.
  Confidence high.
- **x/c 0.4: 2 symbols.** Upper (S07) **open**: clean paper above and right of its apex (rows 1452 to 1459).
  Its base is hidden in the faired curve (taken 1474.5 +- 1.5) and its right side is visible only on rows
  1470 to 1472 because the lower symbol's flag crosses it. Lower (S08) **flagged**: flag line 1.2 px from its
  apex and 9.5 px from the upper apex; tip (801.5, 1464.0). Confidence high.
- **x/c 0.2: 2 symbols.** Upper (S09) **flagged**: flag line 1.1 px from its apex, 5.4 px from the lower
  apex, tip (929.2, 1471.0). Base hidden in the faired curve and the lower symbol (taken 1490.0 +- 1.5).
  Lower (S10) **open**, apex inside the upper symbol. Confidence high.
- **x/c 0.0: 2 symbols**, offset only 5.5 px vertically, so every side is doubled. The faired curve ends at
  the upper one's left base corner. **AMBIGUOUS IDENTITY.** There is one flag (tip (1055.3, 1480.0)).
  Its line passes 1.8 px right of the upper apex (7.7 px long from it) and 1.2 px left of the lower apex
  (11.8 px long from it); its lower part, where it would show which apex it starts from, lies under the
  vertical gridline and the upper symbol's apex. Both fit the flags at the other stations (7.9 to 12.0 px,
  0 to 1.8 px). I take the upper (S11) as **flagged** and the lower (S12) as **open**, because the flag
  meets the upper symbol just right of its apex, as the flags do at 0.6, 0.4 and 0.2.
  ALTERNATIVE: upper open (R = 2.8 x 10^6), lower flagged (R = 11.3 x 10^6). Positions are not affected.
  Confidence: count high, identities low.

### Values (CSV ids; x/c and P_B with reading errors)

| id | x/c station | symbol | R | x/c | P_B | flag |
|---|---|---|---|---|---|---|
| S01 | 1.0 | open | 2.8e6 | 0.9986 +- 0.0036 | -0.0751 +- 0.0008 | |
| S02 | 1.0 | flagged | 11.3e6 | 1.0005 +- 0.0036 | -0.0612 +- 0.0007 | |
| S03 | 0.8 | flagged | 11.3e6 | 0.8004 +- 0.0040 | -0.1604 +- 0.0010 | base hidden |
| S04 | 0.8 | open | 2.8e6 | 0.7988 +- 0.0040 | -0.1579 +- 0.0014 | apex hidden; one-symbol alternative |
| S05 | 0.6 | flagged | 11.3e6 | 0.6002 +- 0.0033 | -0.1614 +- 0.0012 | base hidden |
| S06 | 0.6 | open | 2.8e6 | 0.6007 +- 0.0033 | -0.1565 +- 0.0007 | |
| S07 | 0.4 | open | 2.8e6 | 0.3994 +- 0.0042 | -0.1730 +- 0.0014 | base hidden |
| S08 | 0.4 | flagged | 11.3e6 | 0.3994 +- 0.0034 | -0.1694 +- 0.0007 | |
| S09 | 0.2 | flagged | 11.3e6 | 0.1988 +- 0.0034 | -0.1679 +- 0.0012 | base hidden |
| S10 | 0.2 | open | 2.8e6 | 0.1981 +- 0.0034 | -0.1650 +- 0.0007 | |
| S11 | 0.0 | flagged (ambiguous) | 11.3e6 (alt 2.8e6) | -0.0010 +- 0.0033 | -0.1658 +- 0.0008 | identity ambiguous |
| S12 | 0.0 | open (ambiguous) | 2.8e6 (alt 11.3e6) | -0.0001 +- 0.0033 | -0.1640 +- 0.0007 | identity ambiguous |

## 7. The faired curve through the M = 2.41 measurements

One solid curve joins the triangles from x/c 1.0 to x/c 0. Method (`scripts/16_curve.py`,
`readings/curve_read.json`, trace in `readings/curve_read_trace.csv`): gridlines subtracted, curve centre
traced by rows on the steep part near x/c 1.0 and by columns elsewhere; scan lines inside a symbol box, on
the dashed Prandtl-Meyer line (rows 1558 to 1567 on the steep part, columns 936 to 960 near x/c 0.1) or
within 2.5 px of a gridline centre are not used. At each x/c the value is read from the traced ink on both
sides of the target column within +-10 px (a parabola through about 15 columns; the target column itself
lies on a gridline and is not used). At x/c 0.9 the curve is steep and crosses at a gridline intersection,
so it is read as x(y) over rows 1540 to 1600 and solved for the column of x/c 0.9.

At the symbol stations 0.8, 0.6, 0.4 and 0.2 the curve is hidden for 22 to 24 columns by the symbols; there
it is **bridged** from the ink on both sides (parabola, 21 to 25 columns) and flagged, with 1 px added. At 0.6
the curve also runs along gridline -0.16 between columns 617 and 709 and was read only after subtracting
that gridline. At 0.2 the right side is cut short by the dashed line (straight line through 13 left and 2
right columns; a wider parabola check over columns 869 to 972 gives 0.18 px further down, P_B 0.0001
less negative).

**Left end (x/c 1.0).** The curve comes down steeply, enters the upper (open) symbol near its apex and runs
through its right part (about 4 px right of its centre), shows again below that symbol's base (x 413.3 at
row 1786, 411.8 at 1794, 410.2 at 1800) and meets the frame line, its ink fading out by row 1803
(`scripts/17_leftend.py`, `.out`). Rows 1803 to 1804 are clean; below them is the lower symbol's flag.
So the curve does not end at either symbol: it ends on the frame line between them. End read at row
1801.5 +- 2: P_B -0.0679 +- 0.0010 (rows 1799.5 and 1803.5 give -0.0685 and -0.0673). For comparison
only, the mid point of the two symbol centres is -0.0682.

**Right end.** The curve is last seen at column 1040.5, row 1495.6 (x/c 0.012, P_B -0.1647), where it enters
the upper x/c 0 symbol at that symbol's left base corner. Columns 1058 to 1100 are clean: it does not go on
past x/c 0. Where inside the symbols it stops cannot be seen. The x/c 0 value is the last 15 columns of ink
extended 11 px (flagged).

| id | x/c | P_B | note |
|---|---|---|---|
| C01 | 1.0 | -0.0679 +- 0.0010 | left end, on the frame line between the two symbols |
| C02 | 0.9 | -0.1406 +- 0.0005 | steep part, read as x(y) |
| C03 | 0.8 | -0.1596 +- 0.0010 | bridged across the symbols |
| C04 | 0.7 | -0.1616 +- 0.0004 | |
| C05 | 0.6 | -0.1602 +- 0.0009 | bridged; on gridline -0.16 |
| C06 | 0.5 | -0.1628 +- 0.0004 | |
| C07 | 0.4 | -0.1712 +- 0.0011 | bridged across the peak |
| C08 | 0.3 | -0.1682 +- 0.0004 | |
| C09 | 0.2 | -0.1658 +- 0.0009 | bridged; right side short |
| C10 | 0.1 | -0.1646 +- 0.0004 | |
| C11 | 0.0 | -0.1649 +- 0.0009 | extended 11 px into the symbols |
| C12 | 0.012 | -0.1647 +- 0.0006 | right end, last visible ink |

## 8. Calibration check: reference 26 curves (sets nothing)

Identified by their leaders: the upper short-dash long-dash curve (rising to the -0.365 peak near x/c -0.4,
leader arrow from "M = 1.50" touching it near (1408, 1049)) is M = 1.50; the lower one (leader arrow from
"M = 2.00" touching it near (945, 1352)) is M = 2.00.
Read the same way as the faired curve (`scripts/19_ref26.py`, `readings/ref26_read.json`), dash gaps bridged.
M = 1.50 (R01 to R06), x/c 1.0, 0.8, 0.6, 0.4, 0.2, 0.0: -0.1803, -0.1959, -0.2150, -0.2195, -0.2593,
-0.3253. M = 2.00 (R07 to R12): -0.1642, -0.1696, -0.1826, -0.2085, -0.2107, -0.2007.
Notes: at x/c 1.0 the M = 1.50 curve meets the frame beside gridline -0.18, whose subtraction leaves noise;
two fits differ by 2.2 px and the mean is given (error 1.3 px). At x/c 0.4 the M = 1.50 curve lies on gridline
-0.22 and is read from its right side only. At x/c 0.4 the M = 2.00 curve crosses the solid M = 1.93 curve;
it is read from its own ink on both sides of the crossing (columns 758 to 780 and 815 to 836) and flagged.
At x/c 0.2 the M = 1.50 curve is steep and read as x(y).

## 9. Errors

Per value, in data units, the sum (not the quadrature sum) of:
- centring: twice the Monte Carlo standard deviation of the centre (at least 0.3 px) for symbols; for curve
  points the fit error (rms over the root of the degrees of freedom) plus a bridging term for hidden spans;
- 1 px for the ink centre;
- overlap or merge: 0.5 px for symbols crossed by a gridline, the curve or the other symbol, 1.0 px where a
  base or apex is hidden (S03, S04, S07) and for bridged curve points;
- calibration error (section 5).
x errors of symbols are about 0.0033 to 0.0042 x/c; P_B errors 0.0007 to 0.0014. The error is the reading
error of the printed ink, not the experiment's. Components per row are in the CSV notes.

## 10. Every judgement call, in one list

1. Worked in the native 300 ppi pixels, not a 600 dpi render.
2. Calibration primary = least squares through the 13 labelled lines of each axis (coordinator's rule);
   bracketing-line interpolation as the check and in the error.
3. Flag = stroke from an apex going up-right; identities decided only by strokes.
4. x/c 1.0 upper symbol called open because the clean paper where its flag would start shows nothing.
5. x/c 0.8 read as two symbols; lower symbol's apex not used; its centre from its base and h = 14 +- 3 px.
   One-symbol alternative named.
6. x/c 0.0 identities ambiguous; upper taken as flagged; swap named as the alternative.
7. Hidden bases (S03, S05, S07, S09) taken from the band they must lie in, with that band in the error.
8. Curve values at the symbol stations bridged across the hidden span and flagged; x/c 0 extended 11 px.
9. Faired curve's left end placed where its ink meets the frame line, between the two x/c 1.0 symbols.
10. Reference 26 curves identified by their leaders; read only as a check.
No value was smoothed or interpolated between symbols: each symbol is read alone, and each curve value is
read from that curve's own ink at that column, with the bridged ones marked.

## 11. Files

- `readings/tn3819_fig32.csv`: 38 rows (12 data symbols S01 to S12, 2 legend keys K01 and K02, 12 faired
  curve points C01 to C12, 12 reference 26 check points R01 to R12), columns as the brief asks.
- `overlays/fig32_overlay_full.png` (whole frame), `overlays/fig32_overlay_measured.png` (2x, region of the
  readings), `overlays/fig32_stations.png` (6x per station with fitted outlines; for S04 the thin outline
  shows the side lines as fitted, whose apex is not used). Red open triangle, blue flagged, green curve,
  orange reference 26, grey legend keys; numbered as in the CSV.
- `scripts/`: 01 cut wrapper; 02 crop; 03 profiles; 04 gridline fits; 05 grey dump; 06, 07 zooms; 08 stroke
  fit; 09 gridline subtraction aid; 10 dump of 09 output; 11 triangle search by template (dominated by text,
  not used for decisions; the search was done by eye on tiles); 12 first curve trace (superseded by 16);
  13 calibration; 14 label check; 15 triangles; 16 curve; 17 left end; 18 contact sheet; 19 reference 26;
  20 assemble CSV; 21 overlays; 22 alternative values; `degrid_lib.py` shared helper; `*.out` their output.
  All run with `python3 -I`.
- `specs/`: the stroke windows given to `08_linefit.py` during exploration (the final ones are inside
  `15_triangles.py`). `readings/curve_trace.csv` is the output of the superseded `12_trace.py`; the curve
  values come from `readings/curve_read.json` and `readings/curve_read_trace.csv`.
- `renders/`: crops and zooms used for the decisions. `src/`: the download and the cut PDF.
- `worknotes.txt`: raw notes kept against container restarts.
