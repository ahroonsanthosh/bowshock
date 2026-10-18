"""Locate open-circle plot symbols by ring-template matching (numpy FFT).
usage: circles.py in.png x0 y0 x1 y1 radius minscore [ring_halfwidth]
Score = fraction of the ring (radius +- halfwidth) that is dark, minus the
dark fraction of the inner disc (so filled blobs and line crossings score low).
Prints local maxima above minscore, in page-pixel coordinates, with a
sub-pixel centre from a 3x3 parabolic refinement.
"""
import sys
import numpy as np
from PIL import Image

src = sys.argv[1]
x0, y0, x1, y1 = map(int, sys.argv[2:6])
R = float(sys.argv[6]); minscore = float(sys.argv[7])
hw = float(sys.argv[8]) if len(sys.argv) > 8 else 2.0
IW = float(sys.argv[9]) if len(sys.argv) > 9 else 1.0
a = np.asarray(Image.open(src).convert("L"), dtype=float)[y0:y1, x0:x1]
dark = (a < 140).astype(float)
n = int(R + hw + 3)
yy, xx = np.mgrid[-n:n + 1, -n:n + 1]
rr = np.hypot(xx, yy)
ring = ((rr >= R - hw) & (rr <= R + hw)).astype(float)
inner = (rr <= R - hw - 3).astype(float)
k = ring / ring.sum() - IW * inner / max(inner.sum(), 1)
H, W = dark.shape
K = np.zeros_like(dark); K[:k.shape[0], :k.shape[1]] = k
K = np.roll(K, (-n, -n), axis=(0, 1))
S = np.real(np.fft.ifft2(np.fft.fft2(dark) * np.conj(np.fft.fft2(K))))
pk = []
m = int(R * 0.8)
for y in range(m, H - m):
    row = S[y]
    for x in np.where(row[m:W - m] > minscore)[0] + m:
        v = row[x]
        win = S[max(0, y - m):y + m + 1, max(0, x - m):x + m + 1]
        if v >= win.max():
            # parabolic refinement
            dx = 0.5 * (S[y, x - 1] - S[y, x + 1]) / (S[y, x - 1] - 2 * v + S[y, x + 1] + 1e-12)
            dy = 0.5 * (S[y - 1, x] - S[y + 1, x]) / (S[y - 1, x] - 2 * v + S[y + 1, x] + 1e-12)
            pk.append((x + dx + x0, y + dy + y0, v))
pk.sort()
for x, y, v in pk:
    print(f"{x:8.1f} {y:8.1f}  score={v:.2f}")
