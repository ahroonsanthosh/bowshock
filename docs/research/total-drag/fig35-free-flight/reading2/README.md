# TN 3819 fig. 35: reading 2 (estimates A and B, the no-fin curve, free-flight copy)

Second, blind reading by the round 6 independent reader. Source: Love, NACA
TN 3819 (1957), NTRS 19930084517, PDF p. 66, from
`https://ntrs.nasa.gov/api/citations/19930084517/downloads/19930084517.pdf`,
rendered at 600 dpi grey. No other reading of fig. 35, and no bowshock
value derived from it, was opened.

## Files

| File | What |
| --- | --- |
| `free_flight_8c28afe.csv` | the free-flight curve (ref. 12), copied from commit 8c28afe (`audit/round6/readings/tn3819_fig35.csv`), M 1.00 to 2.55 every 0.05 and the line's end (M 2.563, P_B -0.1317), with a per-row note on nearby lines and the confidence in the line's identity |
| `estimate_A.csv`, `estimate_B.csv` | Love's estimates A and B, M 1.5 to 3.0 every 0.1 |
| `no_fin_curve.csv` | the solid curve labelled "Present estimate, no fins, M_0 = M_inf" (the fig. 18 body-alone curve), M 1.0 to 3.2 every 0.1: the calibration check |
| `reading_all.csv`, `reading_all_cal.txt` | the same three curves in one file, and the calibration numbers |
| `spec_AB_nofin.json`, `make_spec.py` | the reading spec: the hand-linked paths of A and B (page px, turned into M by the calibration) and the no-fin track's seed |
| `split.py` | writes the per-curve csvs |
| `overlay_AB_nofin.png` | the readings marked on the scan (blue: A and B; red: no-fin) |

Run from this folder: `python3 -I make_spec.py spec_AB_nofin.json`, then
`python3 -I ../../audit/round6/scripts/read.py spec_AB_nofin.json reading_all.csv overlay_AB_nofin.png`,
then `python3 -I split.py reading_all.csv ../../audit/round6/readings/tn3819_fig35.csv .`
(the toolkit is in `audit/round6/scripts/`; downloads in the reader's
scratch directory, `R6_DL` to override).

## Calibration

Every gridline of the panel, not two: 25 vertical lines (M 1.0 to 3.4, 0.1
apart) and 19 horizontal (P_B 0 to -0.36, 0.02 apart), found as long dark
runs after a skew search (the scan is rotated by about 0.7 deg), each fitted
as a straight line along its length. A point's value is interpolated
between the two lines bracketing it, each evaluated at the point's
position along it, so rotation and paper stretch are followed. Scale 6.3e-4
in M and 1.27e-4 in P_B per render px; residual of a straight-line fit of
the line positions to their values 0.0011 in M (rms) and 9e-5 in P_B. Line
values were counted from the printed labels.

Check: the no-fin curve (a single solid line, read by column tracking) is
smooth to the reading's resolution and reads -0.1847 at M 1.0, -0.1447 at
2.0, -0.0965 at 3.0.

## Identity of the lines

By dash style along each line (dash profiles, method note
`audit/round6/readings/method_tn3819_figs32-35.md`): the free-flight line is
long dash, one short dash, long dash, ending at M 2.563 as the least
negative with-fins line; estimate A has a long dash then three short dashes
(labelled start at M 1.51, below the free-flight line; above M 2.25 the
middle line, to M 3.0); estimate B has regular medium dashes (labelled
start at M 1.51, above the free-flight line; merged with it through the
knee at M 1.68 to 1.75; above about M 2.2 the most negative line, to M 3.0).
In the bunch at M 2.0 to 2.3 the three lines run within 0.002 to 0.005 of
each other and cross (free-flight crosses A near M 2.15 to 2.25; B goes
from between the free-flight line and A to above both): there the paths
were linked by hand from column-run listings, by slope continuity and the
dash styles either side.

## Method and errors

A and B: guided column reads (the hand path only picks the ink run nearest
it, within +-7 px; the reading is the run's centre fitted over 7 columns);
in a dash gap the ink within +-40 px either side on the path is fitted and
evaluated at the abscissa ("dash gap bridged" in `how`). B's line starts
at M 1.51, so its M 1.5 value is extrapolated by 0.01 in M from the first
ink. No-fin curve: column tracking, local straight-line fit over +-8 px.

Reading error (`err`, P_B): one scan pixel (2 render px) for the ink
centre, the calibration (0.5 px plus the line-fit rms, both axes, the M part
through the slope), the scatter of the ink about its local fit, and an
extra term where lines merge or cross:

- no-fin curve: 0.0003 to 0.0004 throughout;
- estimate A: 0.0003, and 0.003 at M 2.0 to 2.3 (the bunch);
- estimate B: 0.0003, and 0.003 at M 1.7 to 1.8 (merged with the
  free-flight line) and 1.9 to 2.3 (the bunch);
- free-flight (8c28afe): 0.0003, 0.002 at M 1.65 to 1.76, 0.003 at M 2.0
  to 2.25; its end point M 2.563 +-0.002, P_B -0.1317 +-0.0004.

The extra terms are judgements of how far the identity of the run read
could be off in the bunch (three lines 15 to 40 px apart, 0.002 to 0.005 in
P_B); outside the bunch the identity is certain by dash style.
