# RM A53D02 fig. 11, CD at zero lift against M: second reading, method

Source: NTRS 19930087740.pdf, PDF page 33, rendered at 300 dpi (native resolution of the RGB JPEG scan). The point readings were finished before any of the first agent's files were opened; a header listing then accidentally showed the first agent's M column (not its CD values), see the audit.

Calibration: vertical lines M = 1 to 10 and horizontal lines CD = 0.1 to 0.6 measured in two bands each (scripts/lines.py); the scan is skewed by 1 to 3 px over the frame and is handled by interpolating each line between bands (scripts/grid.py). Axis lines (M = 0, CD = 0) were excluded because their thick strokes bias the centre by about 2 px. Linear-fit residuals of the labelled lines: under 1.2 px in M (224.4 px per unit) and under 0.6 px in CD (2240.6 px per unit).

Points: all 31 symbols. Centres from the centre dot of each circle (centroid on 3.5x to 7x zoom views) averaged with a ring-template fit of radius 21.5 px (scripts/circles3.py); for overlapped circles at M about 1.5, 4.6, 5.4, 7.2 and 10 the centre was fitted to the visible arcs. Curve: column scans of the faired curve stroke (width 8 to 12 px, against 2 to 4 px for grid lines).

Estimated error: +-0.011 to 0.018 in M and +-0.0009 to 0.0016 in CD per point (listed per point), larger for the overlapped clusters.
