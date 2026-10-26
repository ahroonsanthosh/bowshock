"""Find dark line centres (local minima of grey with min < THR) down columns of figure 5.
usage: python3 -I trace5b.py M1 M2 ...  (prints Mach at column, y peaks, values)"""
import sys, json, numpy as np
from PIL import Image
W = "/tmp/claude-0/-home-user-bowshock/dd60fc51-836c-5183-86f3-15ab54467394/scratchpad/tr1386/B/work"
g = np.asarray(Image.open(f"{W}/p400-11.png").convert("L"), dtype=np.float32)
f = json.load(open("calib/fit_f5.json")); fx, fy = f["11|5||x"], f["11|5||y"]
THR = 95
for M in [float(s) for s in sys.argv[1:]]:
    x = int(round((M - fx["b"] * 1750 - fx["c"]) / fx["a"]))
    col = g[1600:2120, x - 1:x + 2].mean(axis=1)
    # smooth lightly
    k = np.array([1, 2, 1]) / 4
    cs = np.convolve(col, k, mode="same")
    pk = []
    for i in range(2, len(cs) - 2):
        if cs[i] < THR and cs[i] <= cs[i - 1] and cs[i] < cs[i + 1]:
            # parabolic sub-pixel
            a, b, c = cs[i - 1], cs[i], cs[i + 1]
            d = 0.5 * (a - c) / (a - 2 * b + c) if (a - 2 * b + c) != 0 else 0
            y = 1600 + i + d
            # width at half depth
            lvl = (cs[i] + 235) / 2
            j0 = i
            while j0 > 0 and cs[j0] < lvl: j0 -= 1
            j1 = i
            while j1 < len(cs) - 1 and cs[j1] < lvl: j1 += 1
            pk.append((y, int(cs[i]), j1 - j0))
    Mx = fx["a"] * x + fx["b"] * 1750 + fx["c"]
    print(f"M={M} x={x} Mcol={Mx:.3f}: " + "  ".join(f"y={y:.1f}(g{gv},w{w})->{fy['a']*x+fy['b']*y+fy['c']:.3f}" for y, gv, w in pk))
