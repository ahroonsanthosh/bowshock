# Round 12 blind reading: R&M 3427 figs. 9 and 10

Reader: a fresh agent, round 12, 2026-10-22. Blind: no other reading of these figures was opened (see
"What I opened" and "What I did not open" below).

## Source

- R&M 3427 (Nash, Quincey and Callinan, "Experiments on two-dimensional base flow at subsonic and
  transonic speeds"), Cranfield AERADE archive, handle 1826.2/4011, file `arc-rm-3427.pdf`, fetched
  with curl from
  `https://reports.aerade.cranfield.ac.uk/bitstream/handle/1826.2/4011/arc-rm-3427.pdf?sequence=1&isAllowed=y`
  into a new empty folder `scratchpad/round12-pdfs/rm3427/`.
- SHA-256 `0e8b4d6629eed639e87dca2ed99eb8bf715f24ca5d5bf01c6a165249ea3c5319` (matches the brief).
- 64 pages. Figs. 9, 10 and 11 share PDF page 36 (printed page 35). The page holds one 1-bit CCITT
  image, 3217 x 2332 px at 300 ppi, extracted unchanged with `pdfimages -png` (no resampling). All
  pixel coordinates below are in that image. Figs. 9 and 10 are upright in it.
- Text (section 3.1): fig. 9 shows typical boundary-layer velocity profiles from pitot traverses at
  M = 0.8; fig. 10 shows the variation of boundary-layer thickness with Mach number; the measuring
  station is 1 in. upstream of the trailing edge.

## Method (both figures)

All tools are in `scripts/`, written for this round; nothing was reused from other rounds.

1. Axis lines: `axisline.py` samples the centre of each axis line along its length. The scan is
   rotated by about 0.006 to 0.010 rad and the two axes are not exactly perpendicular, so each axis is
   fitted as a straight line in pixel space.
2. Ticks: `axisline.py tick` takes the ink centroid of each tick stub 4 to 10 px off the axis line.
   Each data point is projected parallel to the other axis onto the axis (oblique frame from the two
   fitted axis lines), then converted with a least-squares straight line through the ticks.
3. Symbols: `detect.py` matches the legend glyphs (ink +1, hole -1) over the plot, merges peaks, and
   gives each glyph's score at every candidate. Every candidate was then looked at by eye in enlarged
   crops (`zoom.py`, `marks.py`); text letters, tick marks and empty-space hits were rejected by eye,
   and the symbol type was chosen by eye with the template scores as a second opinion. The centre is
   the chosen glyph's template peak (bounding-box centre).
4. Errors (1 sigma, per value): centring sigma in px (1.0 clean, 1.5 where a line or a neighbour
   overlaps the outline, 2.0 where the outline is broken or merged) times the scale, combined in
   quadrature with the calibration error (rms tick residual plus half a pixel).
5. Overlay check: every read value is mapped back to pixels through the inverse of the calibration
   and drawn over the scan (`overlays/`). This checks the whole chain, not just the centring.

## Fig. 9: boundary-layer profiles on basic model, M = 0.8

Axes: u* (0 to 1.0, ticks every 0.2, ticks point up from the axis); y in inches (0, 0.05, 0.10, ticks
point right from the axis; 0 is the x axis line).

Calibration: u* = 0.0019883 per px; tick residuals all within 0.0009. y = 0.00025198 in per px; tick
residuals within 0.00009 in. Calibration error used: 0.0016 in u*, 0.00019 in y.

Legend: open circle = station at trailing edge; open square = 1 in. upstream of trailing edge.

Counts: 33 symbols, 22 circles and 11 squares. Values: `readings/rm3427-fig9-points.csv` (u* error
0.0025 to 0.0043, y error 0.0003 to 0.0005 in). Point 33 (circle) sits on the axis line and reads
y = 0.0000; point 31 (square) is the isolated square below the line near u* = 0.71, y = 0.0033.

The 1/7 power-law line: traced along 227 centreline samples (`readings/rm3427-fig9-powerlaw-line.csv`,
thinned to about 60 rows), skipping 9 px round every symbol, guided by 19 eye-placed points. It leaves
the x axis at u* = 0.477 (y about 0.0009 in, where it merges with the axis line) and runs up to
y = 0.121 in at u* = 0.996. It reaches u* >= 0.995 first at y = 0.0765 in; above that it is vertical.
Fits (`readings/rm3427-fig9-summary.json`):
- forced exponent 1/7, u* = min(1, (y/delta)^(1/7)): delta = 0.092 in, rms u* residual 0.024, with a
  clear pattern (line below the law by 0.026 near the wall, above it by 0.016 to 0.026 for y = 0.01 to
  0.06 in). The drawn line is NOT a good 1/7 law in these axes.
- free exponent: n = 0.1725 (1/n = 5.8), delta = 0.0675 in, rms 0.009.
I report this as measured and do not resolve it (it may be drawn for a different variable, or by
hand). The overlay shows the 1/7 fit in magenta against the drawn line.

Uncertain calls, fig. 9:
1. Point 2 (y = 0.106): outline is boxy and merged with square 3 below; read as a circle (template
   prefers circle by 0.35).
2. Point 7 (y = 0.085): flat top and left side; read as a circle, template margin only 0.05.
3. Point 11 (y = 0.073): read as a square; top edge merged with the line and circle 12; template
   margin 0.02. Centring sigma 2 px.
4. Points 17, 23, 29 (squares) have template margins 0.04 to 0.05 because the line runs through them;
   the corners are clear by eye.
5. Hidden symbols: circles are at about 0.005 in steps and squares at about 0.010 in steps, but there
   is no circle at about y = 0.095 and 0.110 in. Enlarged crops show only the line there, so I read no
   symbol; a symbol fully hidden under a square cannot be ruled out.
6. Small marks on the x axis between u* = 0.7 and 0.8 and a short stub at u* = 0.7 (page x 1323) are
   not ticks (there is no matching stub at 0.1, 0.3, 0.5 or 0.9); ignored.
7. The power-law line trace near the arrow tip (u* about 0.66) may include a few arrow pixels; the
   effect on the fits is below the rms quoted.

## What I opened

- The shared brief (scratchpad `agent-brief.md`) and the owner's decisions file (scratchpad
  `decisions.md`); `HANDOFF.md` sections 2, 5 and 6 on `origin/claude/wip/handoff` (section headings
  listed to find them).
- `status/round10-reader.md` on the handoff branch: I printed only its line count and its headings
  (title, "The fig. 30 against table 3 observation", "Uncertain calls"), then did NOT read it, because
  it is another reader's status.
- `ls docs/research/total-drag/audit/` once on this branch, which printed folder names only (including
  round10, round11, pairing-2026-10-22, w7-fins, readings, overlays); I opened none of them.
- AERADE search page `reports.aerade.cranfield.ac.uk/discover?query="R&M 3427"` (to find the handle)
  and the PDF above. One web search for the report's AERADE page (results were index pages only).
- The PDF: full text via `pdftotext -layout` (to find the figure page and the text on figs. 9 and 10),
  page 36's image via `pdfimages`, and a 60 dpi render of page 36 to see the layout.
- Files I wrote, in `scripts/`, `readings/`, `overlays/` here, and in my own new scratchpad folders
  `round12-pdfs/` and `round12-work/`.

## What I did not open

audit/round10/, round11/, pairing-*/, w7-fins/ (any branch); `origin/claude/wip/w7-fins`'s
docs/research/total-drag/; anything else in the scratchpad; any other worktree; design-record text
about R&M 3427 figs. 9 and 10; the top-level audit/readings/ and audit/overlays/ folders.
