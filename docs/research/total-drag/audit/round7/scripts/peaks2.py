"""List ink peaks along rows or columns of a 3 x 3 box-blurred page (exploratory).

usage: python3 -I peaks2.py PAGE.png row|col A0 A1 P [P ...]
For each row (or column) P, prints the centroid, peak darkness and width of
each ink run between A0 and A1 (averaged over P-1..P+1).
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

Image.MAX_IMAGE_PIXELS = None
d = 255.0 - np.asarray(Image.open(sys.argv[1]).convert("L").filter(ImageFilter.BoxBlur(1))).astype(float)
mode = sys.argv[2]
a0, a1 = int(sys.argv[3]), int(sys.argv[4])
for ps in sys.argv[5:]:
    p = int(ps)
    prof = d[p - 1:p + 2, a0:a1].mean(axis=0) if mode == "row" else d[a0:a1, p - 1:p + 2].mean(axis=1)
    runs = []
    i = 0
    while i < len(prof):
        if prof[i] > 60:
            j = i
            while j < len(prof) and prof[j] > 60:
                j += 1
            seg = prof[i:j]
            c = (np.arange(i, j) * seg).sum() / seg.sum() + a0
            runs.append("%.1f(%d,w%d)" % (c, seg.max(), j - i))
            i = j
        else:
            i += 1
    print("%s=%d:" % (mode, p), " ".join(runs))
