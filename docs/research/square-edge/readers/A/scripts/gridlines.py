"""Find grid-line positions in a plot region of a scanned figure.

usage: python3 -I gridlines.py IMG AXIS X0 Y0 X1 Y1 [MINSEP]
AXIS is 'v' (vertical lines, positions along x) or 'h' (horizontal lines,
positions along y). The box X0..Y1 (native pixels) should hold grid only,
or mostly grid. Prints the sub-pixel centre of every line found: the
darkness profile across the box (mean over the other direction) is
high-passed with a running median, peaks are taken as lines and refined
by a 3-point parabola.
"""
import sys
import numpy as np
from PIL import Image

img, axis = sys.argv[1], sys.argv[2]
X0, Y0, X1, Y1 = (int(v) for v in sys.argv[3:7])
minsep = int(sys.argv[7]) if len(sys.argv) > 7 else 8
im = 255.0 - np.asarray(Image.open(img).convert("L")).astype(float)
sub = im[Y0:Y1, X0:X1]
# use a robust mean (median) so symbols and curves crossing do not dominate
prof = np.median(sub, axis=0) if axis == "v" else np.median(sub, axis=1)
prof2 = sub.mean(axis=0) if axis == "v" else sub.mean(axis=1)
off = X0 if axis == "v" else Y0
k = 9
base = np.array([np.median(prof[max(0, i - k):i + k + 1]) for i in range(len(prof))])
hp = prof - base
thr = max(3.0, np.percentile(hp, 90) * 0.5)
peaks = []
for i in range(1, len(hp) - 1):
    if hp[i] >= hp[i - 1] and hp[i] > hp[i + 1] and hp[i] > thr:
        if peaks and i - peaks[-1] < minsep:
            if hp[i] > hp[peaks[-1]]:
                peaks[-1] = i
            continue
        peaks.append(i)
out = []
for i in peaks:
    a, b, c = hp[i - 1], hp[i], hp[i + 1]
    den = a - 2 * b + c
    d = 0.5 * (a - c) / den if den != 0 else 0.0
    out.append((off + i + d, b))
print(f"{len(out)} lines; threshold {thr:.1f}")
for pos, h in out:
    print(f"{pos:9.2f} {h:6.1f}")
