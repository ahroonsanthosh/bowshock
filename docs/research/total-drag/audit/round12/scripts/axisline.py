"""Round 12: measure an axis line's centre along its length (for tilt), and tick centres.

Usage:
  python3 -I axisline.py PAGE_PNG h Y_GUESS X_FROM X_TO STEP     horizontal axis: centre row at each x
  python3 -I axisline.py PAGE_PNG v X_GUESS Y_FROM Y_TO STEP     vertical axis: centre column at each y
  python3 -I axisline.py PAGE_PNG tick h AXIS_Y SIDE X1,X2,..     tick centres on a horizontal axis:
        mean x of ink in rows AXIS_Y+SIDE*(4..10), within 5 px of each guess
  python3 -I axisline.py PAGE_PNG tick v AXIS_X SIDE Y1,Y2,..     same for a vertical axis
Only ink within 6 px of the guess is used; prints the centre and run length.
"""
import sys
import numpy as np
from PIL import Image

a = np.array(Image.open(sys.argv[1]).convert('L')) < 128
if sys.argv[2] == 'tick':
    o, ax, side = sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
    for g in map(float, sys.argv[6].split(',')):
        gi = int(round(g))
        pts = []
        for off in range(4, 11):
            if o == 'h':
                r = ax + side * off
                xs = np.where(a[r, gi - 5:gi + 6])[0] + gi - 5
                pts += list(xs)
            else:
                c = ax + side * off
                ys = np.where(a[gi - 5:gi + 6, c])[0] + gi - 5
                pts += list(ys)
        print(f'guess {g}: centre {np.mean(pts):.2f} (n={len(pts)}, sd={np.std(pts):.2f})' if pts else f'guess {g}: none')
else:
    o, g, lo, hi, st = sys.argv[2], *map(int, sys.argv[3:7])
    for p in range(lo, hi, st):
        if o == 'h':
            v = np.where(a[g - 6:g + 7, p])[0] + g - 6
        else:
            v = np.where(a[p, g - 6:g + 7])[0] + g - 6
        print(p, f'{v.mean():.2f}' if len(v) else '-', len(v))
