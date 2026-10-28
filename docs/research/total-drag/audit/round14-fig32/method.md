# TN 3819 fig. 32: blind reading of the Langley 9-inch Mach 2.41 symbols and faired curve

Reader: blind second reader, working only in `scratchpad/fig32/` (this folder). Date 2026-10-26.

## What I opened and what I did not

Opened: the reader brief `scratchpad/lift-near-base/reader-brief-tn3819-fig32.md`, the shared brief
`scratchpad/agent-brief.md` (as the reader brief asks), the PDF I fetched myself, and my own files in this folder.

Not opened: anything in the bowshock repository (the coordinator told me not to open it at all, so I also did
not open `docs/research/total-drag/audit/round13/method.md`, which the brief offered as a format example; this
record follows the brief's list of contents instead). Not opened: `decisions.md`, any `status/*.md`, any
`round6` or `pairing-*` folder, `docs/research/total-drag/data/`, `docs/design/`, `src/base/`, `tests/base/`,
`docs/research/refusals/`, any branch, any other worktree, any other scratchpad folder. Nothing was opened by
mistake. No other reading of this figure was seen. Nothing was committed.

From the report I read only the text pages the brief names (printed pp. 19 to 23), the symbol list (printed
pp. 3 to 5), and fig. 32 itself. I looked at no other figure's values. I did not open figs. 28 to 31, 33 or 35.

## Source

- URL: https://ntrs.nasa.gov/api/citations/19930084517/downloads/19930084517.pdf
- Downloaded file `src/tn3819.pdf`: 31,890,253 bytes, SHA-256
  `9acd67dc393b26162f773602f477be6e9bf3b5e2823edb18df105a1159c9ce55`. It does not start with `%PDF-`.
- The first `%PDF-` is at byte offset 436 (zero based; 436 bytes of wrapper, which carry the name
  `19930084517.pdf`). Cut file `src/tn3819_cut.pdf`: 31,889,817 bytes, SHA-256
  `c0c3a964d17c93c0133202ed512bbc10018ce7b228ad5f4edc079f73b32693af`. 68 pages, Acrobat Paper Capture.
- Fig. 32 is on PDF page 64 (printed page 62). Confirmed by its caption: "Figure 32.- Measurements and
  estimations of the effects of fin location upon base pressure at several Mach numbers."
- Pixels: I did not render. I extracted the page's native scan losslessly (`pdfimages -j`, the embedded JPEG
  stream as stored): `src/pages/p64-000.jpg`, 2258 x 3092 px RGB, 300 ppi, SHA-256
  `c3ea56ee79ac39d780b36b93563ea4ba7542c37db771f09703a6d44f46fa6fd0`. All pixel coordinates in this record
  and the CSV are in that image, pixel index = pixel centre, x to the right, y down.

## What to establish (answers, with where I took each)

Page and line references are PDF page (printed page) and line counted from the first text line under the
running head. I checked the quoted lines against the page image, not only the OCR layer.

1. **Model of the Mach 2.41 measurements.**
   - Tunnel: Langley 9-inch supersonic tunnel. Legend of fig. 32: "Measured P_B, M = 2.41, Langley 9" SST".
     Text PDF p. 22 (printed 20) lines 3 to 5: "Additional unpublished data for a similar configuration have
     recently been obtained in the Langley 9-inch supersonic tunnel and are presented herein."
   - Body and fins, same page lines 5 to 10: "The basic configuration consists of a cylindrical body equipped
     with an ogival nose and four equally spaced 10-percent-thick fins having symmetrical circular-arc sections
     and rectangular plan forms. The ratio of fin span to body diameter is 3.5, the ratio of fin thickness to
     body diameter is 0.15, and the trailing edges of the fins are coincident with the base."
     So: 4 fins, symmetrical circular-arc section, t/c = 0.10, rectangular planform, span/diameter 3.5,
     t/diameter 0.15. Whether "span" includes the body is not said.
   - Chord: not stated in words. From t/c = 0.10 and t/D = 0.15 it follows c = 1.5 D (my arithmetic, not a
     quoted number).
   - For the 9-inch model, lines 13 to 19: "For the tests in the Langley 9-inch supersonic wind tunnel the nose
     of the body was conical but was far enough ahead of the fins to have negligible effect on the base pressure
     from nose shape. In addition, the body extended one fin chord behind the fin trailing edge. Measurements
     were made of the pressure field on the body surface created by the presence of the fins. Less extensive
     direct measurements were made of the effects of fin location on base pressure." The text does not say how
     fin location was changed for the base-pressure runs; the "one fin chord" sentence reads as describing the
     model for the body-surface pressure field.
   - Support: NOT stated for this model in the pages I read. The only mention of stings near this section is
     PDF p. 20 (printed 18) lines 24 to 27, about angle-of-attack work: sting supports built to existing
     standards "may be expected to have equally small effect at angles of attack up to about 60 degrees". I do
     not infer a sting for the fin model from that.
   - Reynolds numbers: legend R = 2.8 x 10^6 and R = 11.3 x 10^6 (basis length not given in the legend or the
     symbol list, PDF p. 7 (printed 5): "R Reynolds number"). Text PDF p. 22 lines 21 to 26 (about the
     body-surface pressures of fig. 28, same tunnel and Mach numbers): "Reynolds numbers of approximately
     3 x 10^6 and 12 x 10^6. For the lower Reynolds number laminar flow existed ahead of the fin-body juncture
     which caused turbulent flow in the manner described in reference 15. At the higher Reynolds number natural
     transition occurred considerably ahead of the fin-body juncture."
2. **x/c and its sign.** Symbol list PDF p. 6 (printed 4), entry "x": "distance from trailing edge of fin to base
   of body (positive when trailing edge is ahead of base) measured parallel to body center line"; "c fin chord".
   PDF p. 22 lines 34 to 36: "The values of x/c define the location with respect to the base of the trailing edge
   of the fin in terms of fin chord and agree with the convention used in reference 26." PDF p. 23 (printed 21)
   line 1: "at negative x/c the base of the fins protruded into the dead-air region behind the base".
   So positive x/c = fin trailing edge ahead of the base; negative = behind it. On the figure the abscissa runs
   from +1.0 at the LEFT frame to -1.5 at the right frame (labels 1.0, .8, ..., -1.4; the right frame line is
   unlabelled and one grid step past -1.4). "Shifted to right" in the legend therefore means toward negative
   x/c, which the text calls downstream (PDF p. 23 lines 10 to 12 and 17 to 19).
3. **Ordinate.** "Base pressure coefficient, P_B" (axis title). Symbol list PDF p. 6: P_B = (p_B - p_inf)/q_inf.
   Tick labels read -.40 at the top, then -.36, -.32, ..., -.04, 0, .04, .08 at the bottom, so UP IS MORE
   NEGATIVE. I know this from the printed labels, each checked against its gridline (see calibration).
4. **Legend entries** (legend box inside the frame, about x 590 to 1170, y 1640 to 1980 px):
   - open circle: "M = 1.93. Values from fig. 30 shifted to right 0.5 x/c". Calculated (fig. 30 values are
     "computed by utilizing the present method", PDF p. 22 lines 36 to 37). Not a measurement.
   - open square: "M = 2.41. Values from fig. 30 shifted to right 0.6 x/c". Calculated. Not a measurement.
   - open triangle: "Measured P_B, M = 2.41, Langley 9" SST, R = 2.8 x 10^6". Measurement.
   - triangle with a flag (a short stroke leaving the apex up and to the right at about 59 degrees):
     same, R = 11.3 x 10^6. Measurement.
   - short dashes: "Prandtl-Meyer calculation, M = 2.00, shifted to right 0.5 x/c". Calculation.
   - Two curves are labelled on the plot itself, not in the box: "M = 1.50, ref. 26, measured P_B" and
     "M = 2.00, ref. 26, measured P_B", each with a leader. The text (PDF p. 23 lines 6 to 8) says the ref. 26
     results "are shown as the short-dash--long-dash curves". Measurements (ref. 26, wind tunnel), Reynolds
     number not given on the figure.
   - Unlabelled: a solid curve through the triangles (the faired curve of the 9-inch data), solid curves through
     the circles and through the squares.
5. **Any value without fins?** None. There is no line, symbol or note for a body without fins on fig. 32. The
   long level dashed line at about P_B = -0.145 from x/c 1.0 to about 0.45 is the Prandtl-Meyer calculation
   (dashes of the same kind continue into its rising branch; the text, PDF p. 24 lines 24 to 28, says its
   "values for x/c > 0 are unsatisfactory"). It is not a no-fin value.

## Calibration

Script `scripts/calib.py`, output `work/calib_out.txt` and `work/calib.json`.

- Every gridline was used: 26 vertical lines (x/c +1.0 = left frame, then every 0.1 to -1.5 = right frame) and
  25 horizontal lines (P_B -0.40 = top frame, then every 0.02 to +0.08 = bottom frame). Labels sit on every
  second vertical line and every second horizontal line.
- Each line was sampled along its whole length: in every row (vertical lines) or column (horizontal lines) the
  ink-weighted centre of the line profile, kept only where no other ink is within 5 to 7 px and away from
  crossing lines. 771 to 1,319 samples per line. Straight-line fits leave 0.24 to 0.52 px rms; quadratic fits
  0.09 to 0.42 px rms. The printed lines wander along their length in steps of about 0.3 to 0.5 px (for
  example the x/c 0.8 line sits at x 537.5 near y 900, 537.95 near y 1490 and 536.6 near y 2000), so a single
  curve per line is not good enough at the symbols.
- Mapping actually used (`scripts/mapping.py`): for a point, each line's position is a straight-line fit to that
  line's own samples within +-60 px (along the line) of the point, widened to +-120 px if fewer than 15
  samples; the value is interpolated linearly between the two lines that bracket the point. This follows
  rotation, stretch and the local wander.
- Least-squares check across the labelled ticks: a plane value = c0 + c1 px + c2 py through all samples of the
  13 labelled vertical lines (1.0, .8, ..., -1.4) and, separately, the 13 labelled horizontal lines (-.40,
  -.36, ..., .08). x/c per px = -0.0015661 (63.85 px per 0.1); P_B per px = +0.00031540 (63.41 px per 0.02);
  cross terms tiny (rotation about 0.05 to 0.1 degrees). Mean offset of each labelled line from the plane, px:
  x/c 1.0 +0.51, .8 +0.06, .6 -0.08, .4 -0.35, .2 -0.55, 0 +0.08, -.2 +0.10, -.4 -0.08, -.6 -0.35, -.8 -0.22,
  -1.0 +0.34, -1.2 +0.29, -1.4 +0.02; P_B -.40 +0.18, -.36 +0.31, -.32 -0.50, -.28 -0.20, -.24 -0.27,
  -.20 -0.10, -.16 +0.15, -.12 -0.01, -.08 +0.31, -.04 +0.51, 0 +0.11, .04 -0.43, .08 +0.07.
  Over all my readings the local mapping and this plane differ by at most 0.93 px in x (0.0015 x/c) and 0.70 px
  in y (0.0002 P_B); each row's notes give the plane's value too.
- Labels against lines (`scripts/labelcheck.py`): all 13 x labels and all 13 y labels lie beside the line of
  their own value (x label centres 0.2 to 9 px left of the line, the minus signs pulling them left; the "1.0"
  label sits just right of the frame; y label centres within 4.1 px of their line). Line spacing confirms the
  unlabelled frames are x/c -1.5 (right) and that the left frame is +1.0.

## Symbols: what I found and how I centred them

All twelve data triangles sit on the vertical gridlines of x/c 1.0, 0.8, 0.6, 0.4, 0.2 and 0.0, two at each
station, on or beside the solid faired curve. I found no triangle at any other station, at negative x/c, or
outside the frame (checked by eye on four native-resolution tiles of the whole plot, `work/t1.png` to
`t4.png`; a correlation scan was tried and was not selective enough to rely on).

Centres: the triangle centre is its centroid, one third of the height above the base.
- Template fit (`scripts/trifit.py`): an outline of three Gaussian strokes, size taken from the clean legend key
  (vertex to vertex 18.95 x 15.91 px, stroke sigma 0.91 px), fitted by robust least squares with gridline
  pixels (within 1.6 px of a line) left out and flags masked; overlapping pairs fitted together. A free-size
  version (`scripts/trifit2.py`) was used as a cross-check.
- Vertex reading (`scripts/sidefit.py`): each side's ink centre row by row, straight lines fitted, apex where
  they meet, base row from column profiles, centroid = mean of the three vertices. On the legend key it agrees
  with the template fit to 0.3 px.
- Every adopted centre was checked by eye on an 8x crop with a pixel ruler and with the outline drawn on it
  (`overlays/fig32_overlay_stations.png`). Where the estimates disagree, the error covers the spread; which
  estimate I adopted and why is in the CSV `how` column.
- Flags: I decided which triangle carries a flag from the stroke itself and from where the flag's line meets
  the symbol axis. On the legend key and at the clear stations (0.6, 0.4, 0.2) the flag line meets the axis
  0 to 4 px below the apex of the triangle it belongs to.

Counts per station (data symbols): x/c 1.0: 2; 0.8: 2 (or 1, see flags); 0.6: 2; 0.4: 2; 0.2: 2;
0.0: 2 (or 1, see flags). Total 12 (or 10). Outside 0 to 1.0: none.

### Data or legend key, mark by mark

| Mark | Where | Decision | Why |
|---|---|---|---|
| S01, S02 | x/c 1.0, P_B about -0.075 and -0.061 | data | inside the frame on the left frame line (S01 drawn about 2 px right of it), on the faired curve, legend size, no text beside them |
| S03 to S12 | x/c 0.8, 0.6, 0.4, 0.2, 0.0 | data | inside the frame, centred on gridlines, on the faired curve, far from any text |
| K01 | x 985, y 1839 | legend key | inside the legend box, directly left of "R=2.8 x 10^6" |
| K02 | x 985, y 1879 | legend key | inside the legend box, directly left of "R=11.3 x 10^6" |

No mark had to be called `label` or `unsure`. The circles and squares are other legend entries, not read.

### Overlaps and how each pair was read

- x/c 1.0: S01 and S02 are 44 px apart, no overlap. The faired curve runs through S01's right half.
- x/c 0.8 (low confidence): the cluster is 19 to 20 px tall, taller than one symbol (15 to 16 px), and its sides
  bend, so I read two outlines offset by about 6 px. The upper (S03) shows its apex, upper sides and a clear
  flag; its base would lie on the -0.16 gridline and the faired curve and cannot be seen. The lower (S04) shows
  its base and lower sides; its apex is inside S03 and the gridline. Each was read from its own parts; S03's
  error carries 2 px centring and 1.5 px overlap.
- x/c 0.6: S05's base lies on the -0.16 gridline and touches S06's apex. Read separately, no real overlap.
- x/c 0.4: outlines overlap by about 4 px. S07's base coincides with the faired curve. S08's flag crosses S07's
  right side. Read separately with a joint fit.
- x/c 0.2: outlines overlap by about 5 px. The left half of S09's base merges with the faired curve, so its base
  row was taken from its right half; the joint template fit was pulled 1.9 px down by the curve and was not
  adopted.
- x/c 0.0 (low confidence): centres about 5 px apart. S12 has a full outline. S11's sides and base corners are
  clear but the middle of its base, which would lie inside S12, is missing (only faint grey along row 1494).

## Faired curve

A solid curve is drawn through the Mach 2.41 triangles from x/c 1.0 to x/c 0. I traced its ink centre
(`scripts/trace.py`): by rows on the steep part (y 1792 to 1535) and by columns elsewhere, leaving out pixels
on gridlines, under symbols and where a Prandtl-Meyer dash crosses it (x 925 to 962). At each station
(`scripts/curve_stations.py`) a quadratic through the traced centres within 12 px (up to 30 px across a symbol)
is intersected with the local gridline.
- Stations 0.9, 0.7, 0.5, 0.3 and 0.1 are clean readings (gaps under 3 px).
- Stations 0.8, 0.6, 0.4 and 0.2 are hidden behind the symbols there, so the curve is bridged across 10 to
  22 px. At 0.6 and 0.8 it also runs into the -0.16 gridline (0.6 was read by hand from column profiles where
  curve and gridline overlap: its centre sits 0.3 to 0.7 px above the gridline's). A bridge term of 1 to 1.5 px
  is in the error.
- Left end (C00): the curve comes down through S01 and joins the frame line at y about 1801 to 1806; I enter
  1803 +- 3 px. It may continue hidden inside the frame line to the apex of S02 (y 1811.6, P_B about -0.0636).
- Right end (C11): the curve stops at the left side of the x/c 0 cluster, at x/c about 0.012, P_B -0.1648.
  C10 at x/c 0 is the curve level carried 7 px to the station (the curve is flat there); it is not ink at the
  station.
No smoothing: every value is the printed ink at or next to the station. The bridged stations are marked.

## Calibration check: reference 26 curves (sets nothing)

The Mach 1.50 and Mach 2.00 ref. 26 curves were identified by their leaders. Read at x/c 0, 0.2, ..., 1.0
the same way (R01 to R12). Hard spots: Mach 1.50 at 0.4 lies on the -0.22 gridline (straight line between
centres at x 772 and 805); Mach 1.50 at 0.2 is steep and on the -0.26 gridline crossing; Mach 2.00 at 0.4 is
merged with the Mach 1.93 circles curve from x 785 to 808 (centre of the merged band); Mach 2.00 at 1.0 is faint;
Mach 2.00 at 0 runs into the -0.20 gridline.

## Errors

Per value, in px, then times the local scale (about 0.00157 x/c and 0.000316 P_B per px), components added
linearly: centring (spread of the estimates, at least 0.5 px), one scan pixel, calibration
(sqrt(local line-fit term^2 + 0.3^2) px, 0.3 px being how well a printed line centre is defined), overlap where
stated, and for curve readings a bridge term plus slope times the x error. Typical: symbols x/c +-0.0028 to
0.0036, P_B +-0.0006 to 0.0015; curve x/c +-0.0020, P_B +-0.0005 to 0.0015. These are reading errors of the
printed ink only.

## Judgement calls and flags (all in the CSV notes)

1. x/c 0.8, S03/S04: read as two symbols. Alternative: one tall symbol at (538.0, 1516.0) px, x/c 0.800,
   P_B -0.158, carrying the flag (R = 11.3 x 10^6). If two, S04's Reynolds number rests only on S03 having the
   flag.
2. x/c 0.0, S11/S12: read as two symbols, S11 (upper, base not visible in the middle) flagged and S12 open.
   Alternatives: (a) the flag belongs to S12 and S11 is open (the flag line meets the axis at y about 1486,
   between the two apexes, nearer S12's apex by the template fit and 3 to 4.5 px below S11's apex by the vertex
   reading; I followed the legend geometry); (b) only S12 is a symbol, carrying the flag.
3. x/c 1.0, S02: its flag is a faint short tick about 3 px above the apex, where the faired curve meets the frame
   line. Read as flagged (R = 11.3 x 10^6). Alternative: open (R = 2.8 x 10^6).
4. S01 is drawn about 2 px right of the x/c 1.0 frame line; read as printed, x/c 0.997.
5. S09: adopted the vertex reading (P_B -0.1682) over the joint template fit (1.9 px lower on the page,
   P_B about -0.1676) because the template was pulled by the faired curve along its base.
6. Faired curve left end: the curve's last separate ink is at y 1801 to 1806 on the frame; possible hidden
   continuation to S02's apex.
7. Faired curve at 0.8, 0.6, 0.4, 0.2 is bridged behind symbols; at 0 it is carried 7 px from its end.
8. Support of the model (sting or not) and the Reynolds number's length basis are not stated in the text read.

## Confidence

High: calibration; S01, S02 positions; S05 to S10 positions and flags at 0.6, 0.4, 0.2; curve at 0.9, 0.7,
0.5, 0.3, 0.1. Medium: S02's Reynolds assignment; curve at 0.8, 0.6, 0.4, 0.2 and its two ends. Low: the
number of symbols and their Reynolds assignment at x/c 0.8 and 0.0 (S03, S04, S11, S12), though the P_B of
whatever is there is known to within about 0.002 in every alternative.

## Files

- `readings/tn3819_fig32.csv`: 12 data symbols (S01 to S12), 2 legend keys (K01, K02), 12 faired-curve points
  (C00 to C11), 12 check points (R01 to R12).
- `overlays/fig32_overlay_full.png` (whole plot, 2x, every point numbered as in the CSV) and
  `overlays/fig32_overlay_stations.png` (each station 8x with the adopted outlines).
- `scripts/`: every script I ran (crop, ruler, dump, smoothzoom, projections, calib, labelcheck, mapping,
  trifit, trifit2, sidefit, tricheck, flagline, scan_triangles, trace, curve_stations, build, overlay).
- `src/`: the download, the cut PDF and the extracted page images. `work/`: crops, traces, fits and notes.
