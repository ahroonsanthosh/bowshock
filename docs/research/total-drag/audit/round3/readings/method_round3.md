# Round 3 second readings: method notes

Both readings below were completed and saved before the first reading of fig. 35
(`data/love_fig35_*`) and section 3.4 of 0008 were opened.

## TN 3819 fig. 35 (PDF p. 66 of NTRS 19930084517, rendered at 300 dpi, native RGB scan)

Calibration (scripts/grid35.py): vertical gridlines every 0.1 in M (M 1.0 to 3.4, labels 1.0 to 3.4 every 0.2
checked), measured by column profiles in two bands (y 380-460 and 1600-1700; the lines lean 14 to 16 px over the
plot height); horizontal gridlines every 0.02 in P_B (0 to -0.36, labels -.04 to -.36 every 0.04 checked),
measured in two bands (x 560-640 and 2100-2200; the lines fall 15 px across the width; lines hidden by the legend
taken at the measured +15.1 px offset). 79 px per 0.1 M, 79 px per 0.02 P_B. Interpolation as in round 1 (grid.py).
Check: the body-alone line on fig. 35 (Love's curve from fig. 18) reads -0.1847, -0.1836, -0.1730, -0.1455,
-0.1224, -0.1169 at M 1.0, 1.2, 1.5, 2.0, 2.4, 2.5 against the less negative fig. 18 curve read in round 1
(-0.1849, -0.1836, -0.1733, -0.1447, -0.1224, -0.1172): within 0.001.

Symbols: centres from bounding boxes on 7x zooms (six symbols: circle, square, diamond with fins; the same
three flagged, without fins). Error +-1.5 px (+-0.0004 in P_B, +-0.002 in M); the flagged diamond's left vertex
is hidden by a curve (+-2.5 px).

Curves: identified from the text (TN 3819 pp. 22 to 23: estimates A and B were not computed below M 1.5; the
free-flight results "level off at the lower Mach numbers"; the body-alone curve is fig. 18's) and the leaders
(the "Estimate B" leader ends on the steep line that starts at M 1.5, P_B -0.295; the "Estimate A" leader on the
line that starts at M 1.5, P_B -0.256). The free-flight line (legend: long dashes) is the only one starting at
M 1.0; it is followed by continuity as the most negative of the with-fin lines at M 1.7 to 3.0, which it is
wherever the lines are separated (M 2.4 to 3.0, by 0.008 to 0.016). Run centres from column scans every 8 px
(scripts/raw35.py), assigned to curves by continuity, converted with the grid (scripts/read_fig35.py).
Reading error: +-0.002 in P_B where the free-flight line is separate (M 1.0 to 1.7, 2.4 to 3.0); +-0.004 at
M 1.75 to 2.35, where the free-flight line and estimate B run 0.003 to 0.005 apart and their identity could be
swapped. Estimate A and B values are given where traced; they are not needed for the factor.

## TN 3819 fig. 18, values read once in 0008

See the header of tn3819_fig18_round3.csv. Same reader as round 1, but a different calibration (global bilinear
least-squares fit to all gridline crossings) and new column scans, placed clear of symbols and gridlines.
