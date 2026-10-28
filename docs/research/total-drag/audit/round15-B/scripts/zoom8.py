"""Zoom a fig. 8 panel region with 0.01 x ticks (top) and 0.25 deg alpha ticks (left), for reading by eye.
usage: python3 -I zoom8.py <render_dir> <cal_json> <panel> <x0> <x1> <a0> <a1> <scale> <out.png>"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
import trace
rdir, calp, panel = sys.argv[1:4]
x0, x1, a0, a1 = map(float, sys.argv[4:8]); sc = int(sys.argv[8]); outp = sys.argv[9]
C = json.load(open(calp))[panel]
im = Image.open(os.path.join(rdir, C['img'])).convert('RGB')
p = trace.inv(C['cx'], C['cy'], [x0, x1, x0, x1], [a0, a0, a1, a1])
L, R = int(min(p[0])), int(max(p[0])); T, B_ = int(min(p[1])), int(max(p[1]))
c = im.crop((L, T, R, B_)).resize(((R - L) * sc, (B_ - T) * sc), Image.NEAREST)
d = ImageDraw.Draw(c)
for xv in np.arange(round(x0, 2), x1 - 0.0001, -0.01 if x1 < x0 else 0.01):
    q = trace.inv(C['cx'], C['cy'], [xv], [a1]); u = (q[0][0] - L) * sc
    d.line((u, 0, u, 20 if abs(xv * 10 - round(xv * 10)) < 0.01 else 8), fill=(255, 0, 0), width=2)
for av in np.arange(a1, a0, -0.25):
    q = trace.inv(C['cx'], C['cy'], [x0], [av]); v = (q[1][0] - T) * sc
    d.line((0, v, 20 if abs(av - round(av)) < 0.01 else 8, v), fill=(255, 0, 0), width=2)
c.save(outp); print(outp, c.size)
