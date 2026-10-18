# TN 3819 fig. 18, base pressure on bodies of revolution: second reading, method

Source: NTRS 19930084517.pdf, PDF page 49, rendered at 300 dpi. The first agent's CSV header line (which states its calibration constants and that it read the symbols and the Chapman/basic curve range) was seen before this reading; none of its values were.

Calibration: grid lines every 0.2 in M and 0.02 in P_B (light gray, threshold 215) measured in two bands per axis (scripts/lines2.py); labelled ticks M = 1 to 8 and P_B = 0, -.24 to -.48 identified on zoom views. The scan is sheared: vertical lines lean 15 px over the plot height, horizontal lines 5 px over the width; handled by scripts/grid.py. Check against the drawn vacuum curve P = -1/(0.7 M^2): residuals -0.0010 to +0.0004 over M 3.0 to 7.7.

Points: 19 symbols, centres from bounding boxes on 4x to 9x zoom views (hand-drawn symbols, several overlapped near M 1.9, 2.4 and 4.0); the legend shape of each is noted. Curves: column scans (scripts/scan18.py) traced as lines. Below M about 3 two near-coincident curves (the Chapman compilation and Love's basic curve) cross at M about 1.35; the Chapman leader arrow touches the more negative curve at M 2.3 and the basic-curve leader the less negative one. Gabeaud's line joins them at M about 3.1 and from M about 3.3 three lines run together; the lowest, lightest one is taken to be Gabeaud (it continues his steeper slope), the other two (Chapman and basic) differ by under 0.002 there. The CSV gives the two-curve envelope (more and less negative) and Gabeaud at round M and at each symbol M.

Estimated error: symbols +-0.008 to 0.017 in M and +-0.0008 to 0.0017 in P_B; curves +-0.001.
