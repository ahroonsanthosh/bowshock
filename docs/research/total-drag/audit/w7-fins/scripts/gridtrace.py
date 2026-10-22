"""Trace grid lines of a scanned plot along their length, to measure skew and
bow. Usage:
python3 -I gridtrace.py <image> v|h <approx> <from> <to> <step> [half] [dark]
For a vertical line (v) near x = <approx>, prints, for each band of rows
[y, y + step) from <from> to <to>, the darkness-weighted centre x of the
pixels within <half> px of <approx> whose column is dark over most of the
band (a grid line, not a symbol or a curve crossing it). For a horizontal
line (h) the same with rows and columns exchanged. Reads the image only."""
import sys
import numpy as np
from PIL import Image

im = 255 - np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
kind, approx, lo, hi, step = sys.argv[2], float(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6])
half = int(sys.argv[7]) if len(sys.argv) > 7 else 6
dark = float(sys.argv[8]) if len(sys.argv) > 8 else 100
a = int(round(approx))
for s in range(lo, hi, step):
    if kind == 'v':
        box = im[s:s + step, a - half:a + half + 1]
        prof_axis = 0
    else:
        box = im[a - half:a + half + 1, s:s + step].T
        prof_axis = 0
    # a grid line is dark in nearly every row of the band
    cover = (box > dark).mean(axis=prof_axis)
    w = box.mean(axis=prof_axis) * (cover > 0.8)
    if w.sum() == 0:
        print(s, 'none')
        continue
    pos = (w * np.arange(-half, half + 1)).sum() / w.sum() + a
    print(s, round(pos, 2), 'width', int((cover > 0.8).sum()))
