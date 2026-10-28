"""Measure dash and gap lengths of a horizontal legend line sample.

usage: python3 -I legend_runs.py PAGE.npy X0 X1 YC HALF
Takes columns X0..X1, rows YC-HALF..YC+HALF, marks a column as ink if any
pixel in the band is ink, and prints the run lengths (dashes) and the gaps.
Isolated runs of 1 px gap inside a dash (scan dropout) are reported as is.
"""
import sys
import numpy as np

ink = np.load(sys.argv[1])
x0, x1, yc, h = map(int, sys.argv[2:6])
band = ink[yc - h:yc + h + 1, x0:x1 + 1]
col = band.any(axis=0).astype(np.int8)
# per-column thickness for info
thick = band.sum(axis=0)
d = np.diff(np.concatenate(([0], col, [0])))
s = np.where(d == 1)[0]
e = np.where(d == -1)[0]
print('dashes (start_x, length, mean thickness):')
for a, b in zip(s, e):
    print(f'  x={x0 + a:5d}  len={b - a:3d}  thick={thick[a:b].mean():.1f}')
print('gaps:', [int(s[i + 1] - e[i]) for i in range(len(s) - 1)])
print('dash lengths:', [int(b - a) for a, b in zip(s, e)])
