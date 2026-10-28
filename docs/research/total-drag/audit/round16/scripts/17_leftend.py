# Left end of the faired curve at x/c 1.0: excess ink right of the frame line after the
# frame's own profile is subtracted (array from 16_curve.py), rows 1784-1812.
# For each row: summed excess darkness in columns 410-415 and its x centroid.
import sys
import numpy as np
W = np.load(sys.argv[1]); X0, Y0 = 395, 1430
paper = float(np.median(W))
for y in range(1784, 1813):
    row = W[y - Y0, 410 - X0: 416 - X0] - paper
    w = np.clip(row - 15, 0, None)
    s = w.sum()
    xc = 410 + (np.arange(len(w)) * w).sum() / s if s > 0 else float('nan')
    print('%d  excess %6.0f  centroid %6.2f  %s' % (y, s, xc, ' '.join('%4.0f' % v for v in row)))
