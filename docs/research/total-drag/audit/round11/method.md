# Round 11: blind readings of R&M 3427, NASA TN 3548 and NACA RM A51J25 figures

This is a blind reading. Another reader has read these figures first; I
never opened that reading.

## What I opened, and what I did not

Opened:
* The shared agent brief, the handoff file (`HANDOFF.md`, `status/round10-reader.md`
  on `claude/wip/handoff`) and the owner's decisions file.
* On this branch, round 10's `method.md` and its scripts
  (`docs/research/total-drag/audit/round10/`), to copy their method and
  tools. They are a different reader's blind work on other figures (and on
  fig. 13's base holes 5 to 7 and fig. 15's calibration only). I did not
  open round 10's readings, overlays or CSVs.
* On main (`claude/eloquent-dirac-ek9hcf`), `docs/validation/sources.md`
  and a `git grep` of `docs/` for the reports' names and NTRS ids, which
  matched lines in design records 0008, 0010 and 0014 (they cite RM
  A51J25's NTRS id 20030067332 and TN 3548's 19930084307). The grep left
  out `docs/research/total-drag/`. R&M 3427 is not in `sources.md`; I found
  its URL by a web search (the Cranfield AERADE catalogue).
* The three PDFs, fetched by me into new empty folders (below).

Not opened, listed, grepped or read: anything on `claude/wip/w7-fins`; the
folder `docs/research/total-drag/audit/w7-fins/` on any branch; any file
whose name mentions a figure I read; the scratchpad folders `w7-f4-pdfs/`,
`rr0019/`, `w7-review/`, `round10/` or any other agent's scratch folder;
any worktree other than my own. TN 3548 figs. 7 to 10 (held back) were not
opened as images: I extracted the report's page images in one pass and
found fig. 6's page (PDF p. 17) from the PDF's text layer (`pdftotext`). A
`grep` for "fig" in that text printed, besides fig. 6's, the captions of
figs. 7 to 10 and two or three lines of the text naming them ("The total
drag coefficient is presented in figure 7", and similar); no values. No
image of PDF pp. 18 to 21 was viewed. For R&M 3427 I found the figure pages
from contact sheets of page thumbnails (`scripts/thumbs.py`, PDF pp. 36 to
64, about 360 px per page).

## Sources

Each PDF was fetched into its own new, empty folder under
`scratchpad/round11-pdfs/<report>/` and hashed (SHA-256):

| Report | URL | SHA-256 |
|---|---|---|
| R&M 3427 (Nash, Quincey and Callinan, 1963) | https://reports.aerade.cranfield.ac.uk/bitstream/handle/1826.2/4011/arc-rm-3427.pdf | `0e8b4d6629eed639e87dca2ed99eb8bf715f24ca5d5bf01c6a165249ea3c5319` |
| NASA (NACA) TN 3548 (Morrow and Katz) | https://ntrs.nasa.gov/api/citations/19930084307/downloads/19930084307.pdf | `5a6e1b5bffedbf9f9d36503915e3aa609dcc2b8dea1462e5f9c26b67b066acd6` |
| NACA RM A51J25 (Chapman) | https://ntrs.nasa.gov/api/citations/20030067332/downloads/20030067332.pdf | `97fa733be7b7f6291219a15031bd5fc9af0ceacda1395034d35713eef5e0b9bf` |

All three match the expected prefixes (and suffixes, where given). Pages
were extracted losslessly with `pdfimages -png -p` into
`scratchpad/round11-img/`; every pixel position below is a pixel of those
native 300 dpi images.

## Common method (as round 10)

The scripts in `scripts/` are copies of round 10's, with round 11
configurations in place of round 10's and the additions named here.
* **Calibration.** Plots with a grid: `grid_calib.py` (every gridline
  followed and sampled, intersections from local straight-line fits, a point
  converted by bilinear interpolation inside its grid cell). Plots with tick
  marks only: `tick_calib.py` (each axis fitted as a straight line, each
  tick located by the centroid of its mark, a straight line of value against
  position per axis). Quality is reported per figure as leave-one-out.
* **Symbols** (`sym_refine.py`, lists in `symlists.py`).
  * Every symbol was identified by eye on zoomed crops (`crop.py`) and pixel
    maps (`pixmap.py`), against the figure's legend, or where there is none,
    against the labelled lines, and its approximate centre noted.
  * The glyphs are small (10 to 16 px) and most have lines through them, so
    most are centred by fitting an ideal outline of the measured size
    (`outline_centre`): the point, in 0.25 px steps within +-3 or 4 px, that
    maximises the ink on the outline stroke minus the ink inside. Gridline
    and axis pixels are left out. Round 11 added outline shapes for a
    rectangle ("square" drawn wider than tall), a diagonal cross, an upright
    plus and a diamond (`outline_offsets`).
  * Error, about 2 sigma: (2 x 0.8 px) for the centre combined with twice
    the calibration's leave-one-out rms, times the local scale; 1.5 px in
    place of 0.8 px where the outline score is below 0.45, and larger where
    stated.
* **Faired lines are not read in this round** (the task was the symbols).
  Where a line matters to telling symbols apart, it is described.
* **Overlays** (`overlays/`, `overlay.py`): cyan squares are the
  calibration's (virtual or measured) intersections, magenta boxes the
  symbol centres read, with their ids.
* **CSV** (`fig_csv.py`): one row per symbol: id, series, symbol type,
  value and error on each axis, how it was centred, the outline score, the
  conditions as printed and notes.

## R&M 3427 fig. 39 (PDF p. 56, printed p. 55)

**As printed.** Caption: "Effect of base conditions on surface pressures
upstream of base." In the plot: "M_inf = 0.8". Abscissa x/h, ticks at -2,
-1 and 0; ordinate Cp with an arrow showing Cp increasing downwards, ticks
every 0.2 from 0 to -1.0. The Cp axis stands at x/h = 0. Three labelled
lines, no legend:
* "Basic model": solid line through circles;
* "Model with 1 x h splitter plate": dashed line through diagonal crosses;
* "Backward-facing step": solid line through squares (drawn 14 to 16 px
  wide by 12 to 13 px tall, fitted as rectangles).

This page is a grey JPEG, not a bilevel scan, so edges are soft.

**Calibration** (`readings/rm3427_fig39_calib.json`, `tick_calib.py` entry
`r3427f39`).
* The Cp ticks are the 10 px marks left of the Cp axis. The dashes right of
  the axis, beside each label, are the labels' minus signs (offset by up to
  3 px from the ticks); they were not used.
* Axes: tilt 0.10 deg (x axis) and 0.01 deg (Cp axis), rms 0.21 and 0.51 px.
* x/h: three points, the ticks at -2 (x 2075.3) and -1 (2324.5) and the
  Cp axis at 0 (2574.8), so intervals of 249.2 and 250.3 px; 249.8 px per
  unit, leave-one-out 1.02 px.
* Cp: six points (0 at the x axis, then every 0.2), 1011 px per unit,
  residual 0.48 px, leave-one-out 0.60 px.
* So 1 px = 0.0040 in x/h and 0.0010 in Cp.

**What was read** (`readings/rm3427_fig39.csv`): 15 symbols.
* 5 circles (basic model) at x/h -1.662, -0.681, -0.323, -0.155 and 0.002;
  Cp -0.225, -0.277, -0.348, -0.427 and -0.742.
* 5 crosses (splitter plate) at x/h -1.668, -0.684, -0.327, -0.166 and
  -0.005; Cp -0.232, -0.285, -0.336, -0.367 and -0.431.
* 5 squares (step) at x/h -1.670, -0.681, -0.323, -0.160 and -0.007; Cp
  -0.197, -0.210, -0.232, -0.253 and -0.242.
* Errors +-0.010 to 0.018 in x/h and +-0.0020 to 0.0032 in Cp.

**Uncertain calls.**
* The crosses sp-1, sp-2 and sp-3 touch the circles of the same station
  (sp-1 and sp-2 above them, sp-3 below). Their centres carry 2 px (errors
  +-0.018 in x/h, +-0.004 in Cp).
* The squares all have the solid line running through them, so their
  outline scores are low (-0.01 to 0.34) and their errors are raised to the
  1.5 px level. The overlay shows each box on its square.
* bm-5, sp-5 and st-5 sit on the Cp axis (x/h = 0), which hides their
  middles. bm-5's outline score is 0.28.
* The five stations are the same for the three models within 0.012 in x/h.

## R&M 3427 fig. 13, surface hole 4 only (PDF p. 37, printed p. 36)

**Scope.** Only hole 4 of the lower set ("On surface upstream of base") is
read. Round 10 read the base holes 5 to 7; I did not open its reading. Holes
1 to 3 were looked at only to tell their symbols from hole 4's, and are not
read.

**As printed.** Caption: "Pressures on basic model. (Zero incidence.)"
Abscissa M_inf, 0 to 1.2 by 0.2; ordinate Cp, increasing downwards. The
lower set's lines are labelled x/h = -0.167 (circled 4), -0.330 (3),
-0.667 (2) and -1.667 (1). Their symbols: hole 4 upright plus, hole 3
inverted triangle, hole 2 diamond, hole 1 diagonal cross. The label
"x/h = -0.167" with the circled 4 sits on the line of pluses at M 0.4 to
0.8.

**Calibration** (`readings/rm3427_fig13_calib.json`). Run by me with round
10's `grid_calib.py` configuration `r3427f13` (the gridline positions and
lettering boxes), which I reused unchanged. 34 of 35 intersections
measured; the missing one, (0, -0.8), is under the lettering box, far from
hole 4. Leave-one-out 0.37 px in x and 0.64 px in y; one affine map leaves
0.0009 in M and 0.0018 in Cp. 1 px = 0.0010 in each.

**Which symbol is hole 4.** The plus and the diagonal cross are the same
size (13 px arms), so each was typed on pixel maps by whether its strokes
are upright or diagonal. After the jump at M 0.85 to 0.88 three lines
descend to M 1.05 (ink runs along rows y 2120 to 2140 cross exactly three
lines plus the M 1.0 gridline): the upper one through pluses, the middle
one through diagonal crosses, the lower one through diamonds.

**What was read** (`readings/rm3427_fig13_hole4.csv`): 11 pluses, at M
0.401, 0.599, 0.701, 0.800, 0.850, 0.874, 0.901, 0.925, 0.949, 0.975 and
1.050; Cp -0.407, -0.421, -0.428, -0.429, -0.383, -0.353, -0.468, -0.426,
-0.385, -0.345 and -0.226. Errors +-0.0018 in M and +-0.0021 in Cp, larger
for h4-02 and h4-07 (below).

**Where hole 4 has no symbol.** None at M 0.2 or 0.5 (the line starts at
M 0.4). None at M 1.0: the plus line crosses the M 1.0 gridline at Cp
about -0.30 (pixel map, x 1663, y 2137 to 2146) with no horizontal arm,
while holes 1 and 2 do have symbols on that gridline.

**Uncertain calls.**
* h4-01, h4-02 and h4-04 sit on the M 0.4, 0.6 and 0.8 gridlines, which
  hide their vertical arms; x comes from the horizontal arm. For h4-02 the
  outline fit went 1.3 px left of the arm's middle (the line touches the
  arm), so its centre is from the pixel map (arm x 1259 to 1268, rows 2025
  and 2026), with a 1 px error.
* h4-07 (M 0.901, Cp -0.468), at the end of the second loop, lies on a
  vertical stroke that drops from the hole 1 cross at the top of the top
  loop. I typed it a plus because its horizontal arm runs 3 px right of
  that stroke, which a bare junction of lines would not do. Error 1.5 px.
  If it were not a symbol, hole 4 would have no point between M 0.874 and
  0.925.
* h4-06 (the bottom of the dip, M 0.874) has two rising lines within 6 px;
  its outline score is 0.47.

## NACA TN 3548 fig. 6 (PDF p. 17, printed p. 15)

**The page.** A 300 dpi colour JPEG with the figure printed sideways. It was
turned upright, losslessly, with `scripts/rotate.py` (grey, 90 deg
clockwise, an exact pixel transpose); all pixel positions in this section
and in `readings/tn3548_fig6_*.json` are of the turned page (3086 x 2344).
The symbols are drawn in a light line (grey 150 to 200 on paper of about
229), so ink for the symbols is grey < 200 (`ink` option of
`sym_refine.py`).

**As printed.** Caption: "Base pressure coefficient for slab wing, a body
of revolution, and limiting base pressure coefficient (vacuum) plotted
against Mach number." Abscissa M, 0.6 to 1.8, gridlines every 0.05;
ordinate Cp_b, 0 to -0.9, gridlines every 0.05. Legend: a dash-dot line
"Limiting base pressure coefficient (reference 1)"; a circle "Outboard
slit"; a square "Inboard slit" (with a sketch of the two slits); a dashed
line "Body of revolution (reference 2)". Both symbol glyphs have a centre
dot. A solid faired line runs through the symbols.

**Calibration** (`readings/tn3548_fig6_calib.json`, `grid_calib.py` entry
`tn3548f6`). 442 of 475 intersections measured; the 33 missing are under
the legend (M 1.65 to 1.8 at Cp_b -0.9 to -0.6, and the -0.9 line at M 1.4
to 1.6), where the gridlines stop; no symbol is near them. Leave-one-out
0.27 px in x and 0.16 px in y (rms); one affine map leaves 0.0007 in M and
0.0004 in Cp_b (rms). Scale 1110 px per unit on both axes, so 1 px =
0.0009.

**Finding the symbols.** I listed every symbol by eye on contrast-stretched
zooms at 3x to 8x with a page-pixel grid (`scripts/zoom.py`), following
the faired line from M 0.62 to 1.61 and searching the whole plot area. An
automatic dot finder was tried and dropped: the centre dots are too faint
to stand out from the outline and the paper texture.

**Typing.** Circle or square by the outline on the zooms: round sides and
top against straight sides, corners and a flat top. The isolated glyphs
measure 10.5 to 12 px between stroke centres for the circles, and 9 to 10
px tall by 9 to 10 px wide for the squares, so the squares are a little
smaller. An outline-fit score for each shape at each symbol was computed as
a check and did not separate the two (the smaller square fits inside a
circle's ring), so it was not used.

**Centring.** Isolated glyphs by an outline fit (circle of radius 5.75 px,
rectangle of half sides 4.75 and 4.5 px) within +-2 px of the eye centre.
Eight pairs of glyphs drawn 2 to 10 px apart, one above
the other, overlap (seven a circle and a square at the same Mach number,
one two glyphs at M 0.846). For each, the stroke rows of the
pair's top and bottom edges were found on a 5 px wide strip
(`scripts/colprofile.py`); the square's centre is half its height below its
flat top edge and the circle's half its height above its round bottom edge
(or the reverse where the circle is the upper one). Those centres carry
2 px (+-0.0037 in M and Cp_b).

**What was read** (`readings/tn3548_fig6.csv`): 78 symbols.
* 38 circles (outboard slit), ob-01 to ob-38, from M 0.624 (Cp_b -0.556) to
  1.608 (-0.308).
* 40 squares (inboard slit), ib-01 to ib-40, from M 0.624 (-0.562) to 1.608
  (-0.293).
* The peak: both slits rise almost vertically at M 0.97 to 0.99. The
  highest symbols are a square (ib-23, M 0.984, Cp_b -0.831) and a circle
  (ob-21, M 0.984, -0.826), overlapping, at the top of the vertical stack.
* Errors: +-0.0015 in M and Cp_b where the outline score is 0.45 or more,
  +-0.0028 below that, +-0.0037 for the overlapping pairs.

**Uncertain calls.**
* The pair at M 0.775 (ob-07 and ib-06, page x 1042) is drawn almost on
  top of itself: one ink blob, rows 886 to 900. Its darkest row (887.5) is
  read as the top of the square and the bottom row (899) as the bottom of
  the circle, giving Cp_b -0.572 and -0.570. The two centres could be
  swapped or both could lie anywhere in -0.566 to -0.578.
* At M 0.846 (x 1120) two glyphs overlap (rows 873 to 888). Both show a flat
  top edge, so I typed both squares (ib-10, ib-11), which leaves no circle at
  that Mach number. Their heights (9.5 and 10 px between stroke centres) sit
  between the square and circle sizes, so either could be a circle.
* ib-07 (M 0.788) and ib-09 (M 0.831) have rounded corners; I typed them
  squares by their straight sides. There is no circle at M 0.788 or 0.831,
  and no square at M 0.732 or 0.817 (ob-05, ob-09), so a mistyping would
  move a point from one slit to the other.
* ob-01 at M 0.624 touches the Cp_b -0.55 gridline at its bottom edge.
* The faired line, the body of revolution's dashed line and the limiting
  pressure's dash-dot line were not read.

## NACA RM A51J25 fig. 7, below M' 1.5 (PDF p. 14, printed p. 26)

**Scope.** Only the part of the plot at M' below 1.5. The PDF has no text
layer; I found the page from a contact sheet of all 18 page thumbnails and
read no text page.

**As printed.** "AIRFOILS / BASE PRESSURE VERSUS MACH NUMBER", "Figure 7".
Abscissa M' with ticks at 2, 3 and 4 (the axis starts at M' = 1 on the
ordinate axis); ordinate p_b/p' with ticks every 0.2 to 1.0. Legend
(columns PROFILE, DATA SOURCE, PLANFORM): filled circle "LANGLEY, PARD",
rect., AR 2.7; triangle, square and inverted triangle "AMES 1 x 3-FT",
rect., AR 3, one per profile; diamond and a glyph with a slanted flag at its
top left "LANGLEY, 9 x 12 IN", rect. AR 2.7 and delta AR 4; right triangle
"LANGLEY, 9 IN", two-dimensional; a square with a rounded top "NPL ENGLAND
(HALF-MODEL)", two-dimensional. One solid faired line.

**Calibration** (`readings/rma51j25_fig7_calib.json`, `tick_calib.py` entry
`a51j25f7`). The page is tilted by 0.45 deg (both axes fitted; rms 0.25 and
0.31 px). x: the axes' crossing (M' 1 at x 672.7) and the ticks at 2, 3 and
4 (942.6, 1215.8, 1489.2), 272.3 px per unit. The three ticks are evenly
spaced (273.2 and 273.3 px), but extrapolated back they put M' 1 at 669.4,
3.3 px left of the crossing. That sets the leave-one-out, 2.24 px rms, and
the error in M' below 1.5 (+-0.017 to 0.022) is dominated by it. y: six
points, 658.3 px per unit, leave-one-out 0.99 px. 1 px = 0.0037 in M' and
0.0015 in p_b/p'.

**What is there below M' 1.5.** The filled PARD circles (16 px across, the
legend's size) and the faired line run together as one solid band of ink
from M' 1.156 to past 1.5. Individual circles cannot be separated inside
it, so, as asked, the band is read as its upper and lower edges, not as
points. Over and beside the band lie six open symbols.

**What was read** (`readings/rma51j25_fig7.csv`).
* **The band** (`readings/rma51j25_fig7_band.json`, `scripts/band_edges.py`):
  the 8-connected ink component through the first circle, with the open
  symbols touching it blanked; its top and bottom ink rows per column,
  moved half a pixel outwards, at M' 1.18 to 1.46 every 0.02, plus its
  first column (M' 1.156, p_b/p' 0.580 to 0.587). Upper edge from 0.596
  (M' 1.18 to 1.20) to 0.512 (1.44); lower edge from 0.563 (1.18) to 0.488
  (1.44). Errors +-0.017 in M' and +-0.0034 in p_b/p'.
  * At M' 1.38 to 1.44 the upper edge is hidden under the flagged glyph
    delta-1, and at 1.46 under sq-2 and tri-2: the values given are the
    glyphs' lower edges, so the true upper edge is at or above them. The
    CSV says so on those rows.
  * Past M' 1.46 the band runs into sq-2 and tri-2 and, below them, a
    filled circle at about M' 1.54, so 1.48 and 1.50 are not read.
* **pard-1**, the first filled circle, at the band's top left end: its top
  and left outline is free, 16 px across. Centre M' 1.184, p_b/p' 0.585
  (2 px error).
* **sq-1 and tri-1** (M' 1.247 and 1.251; p_b/p' 0.505 and 0.493): a square
  with a triangle inside it, read as an Ames square and an Ames triangle
  drawn over each other. The box (x 729 to 746, rows 916 to 941) is 25 px
  tall, too tall for one glyph (the legend's square is 19 px), and the
  triangle (apex row 924, base rows 938 to 941, 20 px wide) matches the
  legend's triangle. The square's centre is 9 px below its flat top; its
  bottom edge is hidden by the triangle. 2 px errors.
* **delta-1** (M' 1.410, p_b/p' 0.534): the flagged glyph of the Langley
  9 x 12 in delta wing, identified by its slanted stroke at the top left,
  which no other legend glyph has. Bounding-box centre; its bottom edge
  merges with the band. 2 px error.
* **dia-1** (M' 1.419, p_b/p' 0.464): an isolated diamond, Langley
  9 x 12 in rect., centred by correlation with the legend's diamond (score
  0.97).
* **sq-2 and tri-2** (M' 1.496 and 1.509; p_b/p' 0.504 and 0.497): at the
  limit of this reading, a second square-with-triangle like sq-1 and tri-1,
  sitting on the band's end. 2 and 2.5 px errors.
* No inverted triangle, right triangle or NPL glyph was found below M' 1.5.

**Uncertain calls.**
* sq-1/tri-1 and sq-2/tri-2 could instead each be one glyph not in the
  legend; I read them as two overlapping Ames symbols because each box
  holds a whole legend triangle and is 5 to 6 px taller than one square.
  The box tops are flat (rows 916 and 914 run 12 to 17 px), unlike the
  NPL glyph's rounded top.
* Open symbols or further circles may be hidden inside the band. The band
  edges bound everything there, including the faired line, which cannot
  be seen apart from the circles below M' 1.5.

## R&M 3427 fig. 15 (PDF p. 39, printed p. 38)

**As printed.** Caption: "Spanwise uniformity of base pressure." Abscissa
"Spanwise distance from (centre-line), inches", -4 (at the Cp_b axis) to
3; ordinate Cp_b, 0 to -1.0. Three lines labelled M_inf = 1.0, 0.8 and
0.4, and a scale bar marked h. Legend: "M_inf = 0.8:- Pressure tappings
-> o; Pitot traverse -> x". The M_inf = 1.0 line carries diamonds and the
0.4 line squares, at the three tapping stations; the legend does not name
them.

**Calibration** (`readings/rm3427_fig15_calib.json`). Round 10's
`tick_calib.py` entry `r3427f15`, run by me unchanged: x ticks 99.25 px per
inch, residual 0.81 px, leave-one-out 1.10 px; Cp_b 498.3 px per unit,
residual 0.46 px, leave-one-out 0.81 px. 1 px = 0.010 in. and 0.0020 in
Cp_b.

**What was read** (`readings/rm3427_fig15.csv`): 30 symbols, centred by
outline fits of the measured sizes (diamond 14 px across its diagonals,
circle 11 to 12 px, square 13 by 11 px, cross 11 by 9 px).
* M_inf 1.0, diamonds: -2.505, -1.006 and -0.015 in.; Cp_b -0.782 at all
  three.
* M_inf 0.8, pressure-tapping circles: -2.502, -0.978 and -0.005 in.; Cp_b
  -0.703, -0.734 and -0.745. Each circle hangs just below the line, which
  runs along its top.
* M_inf 0.4, squares: -2.499, -0.998 and -0.015 in.; Cp_b -0.605, -0.609
  and -0.626.
* M_inf 0.8, pitot-traverse crosses: 21, from -2.988 in. (Cp_b -0.695) to
  3.001 (-0.688), the highest -0.747 at -0.50 in. They are spaced about
  0.25 in., with none drawn at -1.75 in. or at the three tapping stations
  (-2.5, -1.0 and 0), and with p08-15 and p08-16 at 1.555 and 1.768 in.
* Errors +-0.027 to 0.030 in. and +-0.0046 to 0.0052 in Cp_b (+-0.038 and
  0.0069 where the outline score is below 0.45: t04-3 and p08-08).

**Uncertain calls.**
* t08-2, the circle at -1.0 in., reads -0.978, 2.3 px right of the diamond
  and square at that station. Its sides are clear on the pixel map (stroke
  centres x 1218 and 1228) and its top is merged with the line.
* p08-21, the last cross: the outline fit stopped at the edge of its
  +-3 px search, so its centre is from the pixel map (1 px error).
* The faired lines were not read.
