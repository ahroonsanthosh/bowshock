# Round 13: blind readings of R&M 3323 fig. 4, Johnston figs. 10(a) to 10(c) and RM L8B13 fig. 4(e)

This is a blind reading. Another reader (W7) has read these figures first; I
never opened that reading.

## What I opened, and what I did not

Opened:
* The shared agent brief (scratchpad `agent-brief.md`), `HANDOFF.md` and
  `status/round10-reader.md` on `claude/wip/handoff`, and the owner's
  decisions file (scratchpad `decisions.md`). The decisions file names the
  amendments (r), (s) and (t) in one line each (for example "RM L8B13
  limited to 4(c), 4(e)", "Johnston figs 4-9, 11, 12 removed"); it gives no
  values.
* On this branch (`claude/wip/round10-w7-figures`), round 10's and round
  11's `method.md` (round 11's read in part, its first 200 lines) and a
  listing of their `scripts/` folders, with round 11's `sym_refine.py` read
  to copy the method. I did not open their readings, overlays or CSVs. I
  wrote my own scripts (below); none is a copy.
* On main (`claude/eloquent-dirac-ek9hcf`): `docs/validation/sources.md`,
  only through a `grep` for "johnston", "3323" and "L8B13" (no line
  matched); and `docs/design/0014-refusals.md`, saved to the scratchpad and
  searched for its section headings and its 10.7 entry letters, then read
  only at entry (k) (lines 1210 to 1264: the registration table and the
  three decisions). That entry gives Johnston as NASA Memo 4-30-59L, NTRS
  19980228287, R&M 3323 as AERADE 1826.2/3903 and RM L8B13 as NTRS
  19930085324. The heading lines of the other 10.7 entries were printed
  (90 characters each) by the search for entry (k).
* The three PDFs, fetched by me (below), their pages extracted, and their
  text layers (`pdftotext`), searched for the figures' captions.

Not opened, listed, grepped or read: anything under
`docs/research/total-drag/audit/w7-fins/` on any branch (the folder is
present on this branch since the merge fe964ea; my searches and listings
never entered it); any file of the `w7-fins` branch; docs/design/0019; the
pairing folders (`pairing-2026-10-22`, `pairing-2026-10-23`) and the other
rounds' folders (round 2 to 9, round 12, and round 10's and round 11's
readings and overlays); the scratchpad apart from the brief, the decisions
file and my own new folders `round13-pdfs/`, `round13-img/` and
`round13-work/`; any worktree other than my own.

RM L8B13: figs. 4(a) to 4(e) are all on one page (PDF p. 15). I located
4(e) from the text layer's word positions (`pdftotext -bbox`): the panel
labels (a) to (e) at page rows 854, 1329, 1852, 2282 and 2640. I then
viewed only rows 2280 and below (and the legend, rows 2330 to 2560). The
first crop's top edge (row 2300) showed the caption of the panel above
(4(d), which reads as printed "(d) 45 deg sweptback cylinder", not a
wedge); none of 4(c) or 4(d)'s plotted data was viewed. The text layer of
the whole page was printed once (OCR noise, including the labels of all
panels); it holds no values that can be read. Reference 5's theory marks
(the "X" in 4(e)) were not read.

Johnston: the figure pages were found from the text layer and a contact
sheet of PDF pp. 32 to 34 only (400 px wide). R&M 3323: fig. 4 was found from
the text layer (PDF p. 23) and a 0.35 scale view of that page.

## Sources

Each PDF was fetched by me into its own new, empty folder under
`scratchpad/round13-pdfs/<report>/` and hashed (SHA-256). All three match the
expected prefixes.

| Report | URL | SHA-256 |
|---|---|---|
| Nash, ARC R&M 3323 | https://reports.aerade.cranfield.ac.uk/bitstream/handle/1826.2/3903/arc-rm-3323.pdf | `2f1976e99c2cf610d2a57624a666343eb6b6ff7123b75447614cd55638933c3a` |
| Johnston, NASA Memo 4-30-59L | https://ntrs.nasa.gov/api/citations/19980228287/downloads/19980228287.pdf | `f6af115c456c630e3808578810334ef66e90946fb7acf2714e2d20ce497054c3` |
| Sawyer and Daum, NACA RM L8B13 | https://ntrs.nasa.gov/api/citations/19930085324/downloads/19930085324.pdf | `9104583c592195e52275e1b81b0f315b793366519552867b802313fa7679d824` |

Pages were extracted losslessly with `pdfimages -png -p` into
`scratchpad/round13-img/<report>/`. Every pixel position below is a pixel of
those native 300 dpi images: R&M 3323 and Johnston are bilevel (CCITT)
scans, RM L8B13 is a colour JPEG (read as grey).

## Common method

My scripts are in `scripts/` (run with `python3 -I`):
* `crop.py`, `sheet.py`, `thumbs.py`: crops with a pixel ruler, sheets of
  zoomed tiles for typing symbols by eye, contact sheets.
* **Calibration** (`gridcal.py`, configurations in `calconfigs.json`). Every
  labelled gridline (or tick drawn as a full line) is followed along its
  length: in every row (column) the ink run nearest the line's estimate is
  taken and its centre found, and a straight line is fitted with samples
  more than 1.5 px off rejected (symbols and lettering crossing it). A
  point's value (`calmap.py`) is interpolated linearly between the two
  fitted lines that bracket it, at its own row (column). Check: each line is
  dropped in turn and its position predicted from its two neighbours; the
  rms of those misses (leave-one-out, px) is the calibration error used for
  the symbols. Line rms, sample counts and tilts are in each
  `readings/*_calib.json`.
* **Symbols** (`glyph.py`, `symread.py`; lists in `syms_*.json`). Every
  symbol was typed by eye on zoomed tiles and pixel maps against the
  figure's legend, and its approximate centre noted. Its centre is then
  fitted: an ideal outline of the legend glyph (circle, square, diamond,
  triangle; filled where the glyph is filled), drawn as soft ink of the
  measured stroke width, is moved over +-4 px in 0.25 px steps and the
  position of best normalised correlation with the page's ink is taken,
  pixels within 2 px of a calibrated gridline given zero weight. Glyph
  sizes were measured on isolated glyphs (`sizescan.py`). Glyphs that
  overlap but can still be told apart are fitted jointly (the model is the
  union of both outlines), and every fit is repeated with the neighbouring
  glyphs (within 30 or 40 px) held fixed in the model.
* **Merged ink.** Where two or more glyphs merge into ink I cannot separate,
  no point is read. The row says so and gives instead the box in which every
  centre of the merged glyphs must lie: the merged ink's bounding box
  (8-connected ink blobs within 10 px of the cluster, gridline pixels left
  out; or a box read from a pixel map where a gridline crosses the ink),
  shrunk on each side by 6 px, which is less than any glyph's outer half
  size (so the box is wider than the truth, never narrower).
* **Errors** (about 2 sigma, per axis): sqrt((2 c)^2 + (2 loo)^2) px times
  the local value-per-px, with c = 0.8 px for a fit alone with a score of 0.6
  or more, 1.5 px for a joint fit or a lower score, or the stated sigma of a
  centre read from a pixel map; loo = the calibration's leave-one-out rms on
  that axis.
* **Overlays** (`overlay.py`, in `overlays/`): cyan crosses at the
  calibration's gridline intersections, each read symbol's fitted outline
  in magenta with its id, orange boxes round merged ink.
* **CSV** (`readings/*.csv`): one row a symbol: id, series, symbol type,
  conditions, value and error on each axis, pixel centre, how centred, fit
  score, for merged ink the extents instead of values, the ink box, notes.

## NACA RM L8B13 fig. 4(e) (PDF p. 15, printed p. 13)

**As printed.** Caption of the page: "Figure 4. Variation of pressure
ratio p/p0 with Mach number M for the several cylinders and wedge tested."
Panel label "(e) Wedge." Abscissa M, labelled .7, .8, .9, 1.0, 1.1, 1.2,
gridlines every 0.05. Ordinate labelled 1.0 (bottom axis) and 1.4, with
gridlines every 86 px; the unlabelled gridline midway is 1.2. The top
gridline's label prints as "0" (where a uniform scale gives 1.6); it was not
used. Legend sketch: the wedge, 2 1/2 in long, with the free stream from
the left; a circle with a centre dot whose leader arrow points down onto
the upper face, and a square with a centre dot whose arrow points up onto
the lower face, both at 1 1/4 in from the leading edge, each followed by
"4" (the page heading: "Arrowheads from symbols indicate position of
orifices"; column "Orifice height, inches"). "X reference 5": one X at the
right edge (M about 1.2); not read, as instructed.

**Calibration** (`readings/rml8b13_fig4e_calib.json`, entry `l8b13f4e`).
Eleven vertical lines (M 0.70 to 1.20) and three horizontal (1.0, 1.2,
1.4), followed over rows 2325 to 2570 and columns 485 to 1345, ink = grey
below 140. Line rms 0.18 to 0.33 px. Tilts -0.06 to -0.38 deg (vertical
lines), 0.05 to 0.12 deg (horizontal). Leave-one-out 0.54 px in M and
0.34 px in p/p0. 1779 px per unit M and 428 px per unit p/p0, so 1 px =
0.00056 in M and 0.0023 in p/p0. The 1.2 line lies 0.2 px from midway
between 1.0 and 1.4.

**Glyphs.** Square half side 6.75 px and circle radius 7.5 px (to the
stroke centre), stroke half width 2.0 px, measured on the isolated squares
at M 0.93, 1.07, 1.08 and 1.03 and the circles at M 1.11. Changing them to
7.0 and 8.25 moves no fitted centre by more than 0.75 px (y, e-13c).

**What was read** (`readings/rml8b13_fig4e.csv`): 20 stations, 28 rows.
* 17 symbols read as points: circles e-03c, e-08c, e-13c and e-16c to
  e-20c (8), squares e-03s, e-08s, e-09s, e-13s and e-16s to e-20s (9).
  * Circles: M 0.759, 0.877, 1.042, 1.108, 1.118, 1.143, 1.151, 1.170;
    p/p0 1.066, 1.068, 1.219, 1.279, 1.292, 1.306, 1.311, 1.314.
  * Squares: M 0.759, 0.876, 0.933, 1.042, 1.107, 1.118, 1.142, 1.153,
    1.170; p/p0 1.058, 1.057, 1.097, 1.209, 1.318, 1.331, 1.331, 1.334,
    1.339.
  * Errors +-0.0011 to 0.0018 in M and +-0.0040 to 0.0072 in p/p0.
* 11 stations of merged ink, not separated (no point read): e-01, e-02,
  e-04 to e-07, e-10 to e-12, e-14, e-15. Each is a circle and a square
  superposed; the row gives where both centres must lie, for example e-01
  M 0.7187 to 0.7215, p/p0 1.048 to 1.067.

**Uncertain calls.**
* The 11 merged stations. Two kinds: (1) e-02, e-05, e-07, e-10, e-12,
  e-14, e-15: a square outline whose inner field is round and whose
  corners are thick, which a lone square (e-09s, thin stroke, square inner
  field) does not show; read as a circle of about the square's size inside
  it, concentric within about 1 px. (2) e-01, e-04, e-06, e-11: a dome-shaped
  top over a square bottom; the circle sits about 2 to 3 px above the
  square, but no edge of either is clear enough to fit them apart. I typed
  e-10 (M about 0.966, no dot visible, a rounded outline) as both symbols by
  its thick lower stroke and round inner field; it could be a single glyph.
* e-03, e-08, e-13: the circle's top arc shows above the square's top edge
  (a bar inside the circle), so they were fitted jointly (scores 0.81 to
  0.92). The circle lies above the square by 3.3, 4.75 and 4.25 px (p/p0
  0.008, 0.011, 0.010).
* e-09s (M 0.933): a single square; no circle found at this Mach number.
* e-16 to e-20 (M 1.11 to 1.17): squares above circles, overlapping,
  fitted jointly with the neighbouring pairs held fixed (scores 0.76 to
  0.84). e-19 is crossed by the M 1.15 gridline and touches e-18; its
  square and circle centres differ by 3 px in x.
* The dots inside the glyphs are often not at the glyph's centre (e-12,
  e-14, e-15 by 2 to 3 px); centres are of the outlines, not the dots.
