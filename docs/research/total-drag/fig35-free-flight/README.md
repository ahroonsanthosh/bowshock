# TN 3819 fig. 35: the free-flight curve identified and read again

The record behind 0010 section 11. NACA TN 3819 (E. S. Love, 1957, NTRS
19930084517) fig. 35, printed page 64 (PDF page 66), "Fin effects upon
base pressure with varying Mach number", draws four curves: the faired
free-flight curve of ref. 12 (the long-short dash line, the only line
style in the legend), Love's two predictions, "estimate A" and "estimate
B" (both from M 1.5 to 3.0; "No calculations were made below M 1.5",
printed p. 23), and the solid body-alone curve of fig. 18 ("Present
estimate, no fins").

Until 2026-10-20 the fins-on-base factor (`src/base/fins-on-base.ts`)
rested on two readings (0008's first and round 3's) that took "the most
negative with-fin line wherever the lines separate" for the free-flight
line. Above about M 2.15 that line is estimate B, a prediction; and the
free-flight curve ends near M 2.56, so above it no free-flight data exist
in the figure at all.

## `identification/`

An independent identification of the four curves from the report alone
(the legend, the measured dash patterns, the text), made on 2026-10-20
before this reading. Its crops are of the 600 dpi render of PDF page 66
(`pdftoppm -r 600 -f 66 -l 66 -png`), its overlay of the rectified figure;
its scripts are kept as it wrote them (`scripts/`: `rectify.py` builds the
rectified image used below, 160 px per grid cell, M = 1 + (u - 320) / 1600,
P_B = (v - 320) / 8000 - 0.36; `evidence.py` the crops;
`overlay_final.py` the overlay; `dashprof.py` the dash profiles).

Its findings: the free-flight curve starts at M 1.0, levels off at M 1.2
to 1.7, falls steeply as the most negative with-fin line, crosses
estimate B near M 2.0 to 2.1 and estimate A near M 2.15, and ends at
about M 2.56 as the least negative with-fin line; estimate B is the most
negative line above about 2.15 and runs to 3.0; estimate A is the middle
line to 3.0. Its stated confidence: about 99% for the legend and the left
half, 95% for B along its length, 85% for which right-hand line is free
flight and which is A.

## `reading1/`: the first reading of the identified line

Made on 2026-10-20 following the identification, on its rectified image,
by the scripts in `reading1/scripts/` (Python 3, numpy and Pillow, run as
`python3 -I`):

- `peaks.py` lists the dark runs in columns (grid rows and columns
  masked), from which a guide polyline is drawn along each line;
- `track.py` follows a line along its guide: in each inked column, the
  darkness-weighted centre of the run nearest the guide, within +-8 or 9
  px (0.0011 in P_B); gaps between dashes are skipped, not filled;
- `evaluate.py` gives P_B at each Mach number from a local quadratic fit
  over +-0.02 in M (`evaluate_ff.out`); `separations.py` the free-flight
  line's distance from estimates A and B (`separations.out`);
- `nofin_check.py` is the calibration check: the solid no-fin curve,
  tracked the same way, against fig. 18's basic curve (the adopted table
  of `src/base/tn3819-fig18.ts`), which it reproduces within 0.001 (0008
  section 3.4). Measured here: within 0.0009 at the 13 Mach numbers
  tracked from M 1.0 to 3.2, within 0.0005 at 11 of them
  (`nofin_check.out`). The track missed M 1.4, where its guide (fig.
  18's row) lies 0.002 off the curve; the column runs there give -0.1774
  (see `reading2/` below).

The tracks are in `tracks/` (u, M, the guide, the centre found, its width
and darkness, P_B). The overlays (`ov_*.png`) draw the tracked centres
(free flight red, estimate B blue, estimate A green) on the rectified
figure: the whole, the knee at M 1.6 to 1.78, the steep part, the bunch
at M 2.0 to 2.3 where the free-flight line crosses B and then A, and the
right-hand end; `rect_r2.png` is the right-hand end without marks.

The reading is `tn3819_fig35_free_flight_reading1.csv`, M 1.00 to 2.56
at 0.05, with the end of the line at M 2.563 (its last inked column,
+-0.002). Reading error +-0.002 in P_B, +-0.003 where the line touches or
merges with another (estimate B at the knee, M 1.65 to 1.70, and in one
stroke with it at M 1.99 to 2.13; estimate A in one stroke at M 2.14 to
2.22). What was seen along the way, beside the identification:

- At M 1.1 to 1.6 and 1.8 to 2.1 the reading agrees with round 3's
  (`src/base/tn3819-fig35.ts`) within 0.0003, and with 0008's first
  within 0.0002 at 1.8 to 2.1: both earlier readings were on this line
  there. At M 1.70 it is 0.0034 more negative than round 3's -0.2588 (the
  knee, where P_B changes by 0.0034 in 0.015 of M).
- At M 2.2 to 2.6 the tracked estimate B agrees with round 3 within
  0.0004 and with 0008's first within 0.0002: both earlier readings were
  on estimate B there.
- On the right the free-flight line (the lowest with-fin line) shows a
  single short dash between long ones at M 2.31 to 2.33 and 2.405 to
  2.42, the legend's pattern (the independent review of 2026-10-21
  confirmed the dash at M 2.310 to 2.3235 on its own scan, but could not
  confirm the one at 2.405 to 2.42: both gaps that would bound it sit
  under gridline crossings); estimate A above it has a group of short
  dashes at M 2.56 to 2.58 and runs on to 3.0.
- The free-flight line's distance from the nearest other with-fin line:
  estimate B 0.0058 to 0.0063 less negative at M 1.75 to 1.85, 0.0021 at
  2.0, one stroke at 2.05 to 2.10; estimate A one stroke at 2.15, 0.0029
  more negative at 2.3, 0.0041 at 2.4, 0.0051 to 0.0053 at 2.5 to 2.56.

## `reading2/`: the second reading

By a separate reader (audit round 6, revised on 2026-10-20 and 21) who did
not see `reading1/`, on its own 600 dpi render with its own calibration
from every gridline (skew-fitted; residual 0.0011 in M and 9e-5 in P_B).
The files here are copied unchanged from the reader's branch
(`worktree-agent-adeeb9721ee747758`, commits 8c28afe and e1b70d3, where
its scripts, spec and full method are): its `README.md`,
`free_flight_8c28afe.csv` (M 1.00 to 2.55 every 0.05 and the end, M 2.563,
P_B -0.1317), `estimate_A.csv` and `estimate_B.csv` (M 1.5 to 3.0 every
0.1), `no_fin_curve.csv`, `reading_all_cal.txt` and `overlay_AB_nofin.png`.
Its M 1.0 to 1.70 are its blind first pass; from M 1.72 it read along the
line it identified by dash profile on its own scan, agreeing with the
identification (its first version had followed estimate A above about M
2.2; replaced).

**Paired with the first** (0014 section 10.1, rule 5; asserted in
`tests/base/fins-on-base.test.ts`, printed in
`docs/research/base-and-total/runs/gate-corrected.out`): at all 32 Mach
numbers both read, the two agree within their combined errors; the
largest differences are 0.0018 at M 2.15 and 0.0012 at 2.20 (the crossing
with estimate A), 0.0011 at 1.70 (the knee), 0.0007 at 1.80; elsewhere at
most 0.0006. Both end the line at M 2.563 +-0.002 (P_B -0.1318 and
-0.1317).

**The identity-swap allowance from both readings.** The distance from
the free-flight line to the nearer estimate at M 1.75 to 2.56, each
reading against its own A and B: at most 0.0064 in the first (B at M
1.80) and 0.0077 in the second (B at M 1.80); A is the nearer above M
2.15, 0.0024 to 0.0054. The larger, 0.0077, is the allowance
(`FIG35_IDENTITY_SWAP`).

**Its calibration check** (the no-fin curve against fig. 18's basic
curve, `src/base/tn3819-fig18.ts`): within 0.0008 at M 1.0 to 3.2 except
at M 1.4 (-0.1775 against -0.1796) and 2.4 (-0.1194 against -0.1224). At
2.4 the Langley no-fin diamond sits on the curve (the reader read it at M
2.4108, -0.1202); the first reading's track there gives -0.1223. At 1.4
the first reading's column runs give -0.1774 too: both put fig. 35's
curve 0.002 off fig. 18's adopted row at M 1.4, a row read once (0014
section 10.4). Nothing is served below M 1.5.
