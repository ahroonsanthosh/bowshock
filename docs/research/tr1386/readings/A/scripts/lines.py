"""Find grid lines in a strip of a page.

usage: lines.py scriptdir page.png h|v a0 a1 b0 b1 [thr]
 h: horizontal lines; strip is columns a0..a1, searched over rows b0..b1
 v: vertical lines; strip is rows a0..a1, searched over columns b0..b1
Prints line centres (darkness weighted) and peak darkness.
"""
import sys
sys.path.insert(0, sys.argv[1])
import numpy as np
import digi

page = digi.load(sys.argv[2])
mode = sys.argv[3]
a0, a1, b0, b1 = map(int, sys.argv[4:8])
thr = float(sys.argv[8]) if len(sys.argv) > 8 else 0.35
if mode == "h":
    prof = page[b0:b1, a0:a1].mean(axis=1)
else:
    prof = page[a0:a1, b0:b1].mean(axis=0)
base = np.median(prof)
i = 0
n = len(prof)
while i < n:
    if prof[i] - base > thr:
        j = i
        while j < n and prof[j] - base > thr * 0.3:
            j += 1
        k0 = max(0, i - 3)
        seg = prof[k0:j + 1] - base
        w = np.clip(seg, 0, None)
        c = (w * np.arange(k0, k0 + len(seg))).sum() / w.sum()
        print(f"{b0 + c:.1f}  peak={prof[i:j+1].max():.2f} width={j - i + 1}")
        i = j + 1
    else:
        i += 1
