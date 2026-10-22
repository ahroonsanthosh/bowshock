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
