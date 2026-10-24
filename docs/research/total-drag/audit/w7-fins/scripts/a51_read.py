"""RM A51J25 fig. 7, below M' 1.5: calibrate the ticks and read the ink
band of the faired curve (with the PARD filled circles on it) at set M'
values, and the open symbols placed by hand. Usage:
python3 -I a51_read.py <page.png> <out.csv>
Axes (300 dpi page pixels): the x ticks M' 2, 3, 4 at 942.85, 1215.85,
1488.97 (found by ticks.py on the horizontal axis at y 1252) with M' 1 at
the vertical axis (x 669.8 at y 1252, its course 668 at y 620 to 671 at
y 1190, dx/dy 0.0057); the y ticks 1.0, .8, .6, .4, .2 at 598.5, 732.0,
862.46, 994.5, 1126.42 (ticks.py, right of the vertical axis) and 0 on
the horizontal axis at x 680 (1255.5; it rises to the right, dy/dx
-0.008). Values are least-squares lines through the ticks, a point moved
along the axes' tilts to the tick row or column first."""
import csv
import sys
import numpy as np
from PIL import Image

X_TICKS = [(1.0, 669.8), (2.0, 942.85), (3.0, 1215.85), (4.0, 1488.97)]
Y_TICKS = [(1.0, 598.5), (0.8, 732.0), (0.6, 862.46), (0.4, 994.5), (0.2, 1126.42), (0.0, 1255.5)]
X_AT, X_TILT = 1252.0, 0.0057  # x ticks measured at this row; dx/dy of constant-M' lines
Y_AT, Y_TILT = 680.0, -0.008  # y ticks measured at this column; dy/dx of constant-p lines

xt = np.array(X_TICKS)
yt = np.array(Y_TICKS)
ax, bx = np.polyfit(xt[:, 1], xt[:, 0], 1)
ay, by = np.polyfit(yt[:, 1], yt[:, 0], 1)
print('M per px', ax, 'residuals', np.round(xt[:, 0] - (ax * xt[:, 1] + bx), 4))
print('p per px', ay, 'residuals', np.round(yt[:, 0] - (ay * yt[:, 1] + by), 4))


def mval(x, y):
    return ax * (x - X_TILT * (y - X_AT)) + bx


def pval(x, y):
    return ay * (y - Y_TILT * (x - Y_AT)) + by


def col_for(m, y):
    return (m - bx) / ax + X_TILT * (y - X_AT)


ink = np.asarray(Image.open(sys.argv[1]).convert('L')) < 128
rows = []
for m in [1.15, 1.20, 1.25, 1.30, 1.35, 1.40, 1.45, 1.50]:
    x = col_for(m, 900)
    xi = int(round(x))
    col = ink[850:965, xi]
    idx = np.where(col)[0]
    # the band: the run that holds the curve (the uppermost long run; open symbols lie below or are short)
    runs, s = [], None
    for i in range(len(col) + 1):
        v = i < len(col) and col[i]
        if v and s is None:
            s = i
        if not v and s is not None:
            runs.append((850 + s, 850 + i - 1))
            s = None
    rows.append((m, xi, runs))
p_per_px = abs(ay)
with open(sys.argv[2], 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['kind', 'id', 'mach_prime', 'px_x', 'px_top', 'px_bottom', 'p_top', 'p_bottom', 'p_mid', 'err', 'note'])
    for m, xi, runs in rows:
        print(m, xi, runs)
        w.writerow(['band', f'b{m:.2f}', f'{mval(xi, 900):.3f}', xi, '', '', '', '', '', '', repr(runs)])
    # open symbols, centres by hand on zoomed views (zoom.py, 5x)
    sym = [('s1', 'square with a triangle inside', 738.0, 929.0),
           ('s2', 'half triangle (the legend\'s Langley 9 in, two-dimensional)', 781.0, 907.0),
           ('s3', 'diamond (Langley 9 x 12 in, rectangular)', 783.6, 952.0),
           ('s4', 'square with a triangle inside', 805.0, 924.0)]
    for i, name, x, y in sym:
        w.writerow(['symbol', i, f'{mval(x, y):.3f}', x, y, '', f'{pval(x, y):.4f}', '', '', f'{2.0 * p_per_px:.4f}', name])
