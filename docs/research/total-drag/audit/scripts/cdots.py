"""Locate the small centre dots of open plot symbols (isolated dark specks),
and report the ring score around each (is there a symbol outline at radius R).
usage: cdots.py in.png x0 y0 x1 y1 R [dotthresh]
"""
import sys
import numpy as np
from PIL import Image

src = sys.argv[1]
x0, y0, x1, y1 = map(int, sys.argv[2:6])
R = float(sys.argv[6])
thr = float(sys.argv[7]) if len(sys.argv) > 7 else 0.5
a = np.asarray(Image.open(src).convert("L"), dtype=float)[y0:y1, x0:x1]
dark = (a < 170).astype(float)
H, W = dark.shape


def corr(k):
    n = k.shape[0] // 2
    K = np.zeros_like(dark); K[:k.shape[0], :k.shape[1]] = k
    K = np.roll(K, (-n, -n), axis=(0, 1))
    return np.real(np.fft.ifft2(np.fft.fft2(dark) * np.conj(np.fft.fft2(K))))


n = int(R + 5)
yy, xx = np.mgrid[-n:n + 1, -n:n + 1]
rr = np.hypot(xx, yy)
core = (rr <= 2.5).astype(float)
ann = ((rr >= 5) & (rr <= R - 5)).astype(float)
ring = ((rr >= R - 2.5) & (rr <= R + 2.5)).astype(float)
Sd = corr(core / core.sum() - ann / ann.sum())
Sr = corr(ring / ring.sum())
out = []
for y in range(8, H - 8):
    for x in np.where(Sd[y, 8:W - 8] > thr)[0] + 8:
        v = Sd[y, x]
        if v >= Sd[y - 6:y + 7, x - 6:x + 7].max():
            # dark-weighted centroid of the speck
            w = (255 - a[y - 3:y + 4, x - 3:x + 4]) * dark[y - 3:y + 4, x - 3:x + 4]
            gy, gx = np.mgrid[-3:4, -3:4]
            cx = x + (w * gx).sum() / w.sum(); cy = y + (w * gy).sum() / w.sum()
            out.append((cx + x0, cy + y0, v, Sr[y, x]))
out.sort()
for cx, cy, v, r in out:
    print(f"{cx:8.1f} {cy:8.1f}  dot={v:.2f} ring={r:.2f}")
