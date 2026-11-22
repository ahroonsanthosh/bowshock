"""The cone's wall Cp against Taylor-Maccoll, from L/3 to 0.8 L, on each finished level."""
import os, sys
import numpy as np
sys.path.insert(0, "/home/user/bowshock/docs/research/w6-reference")
import w6ref, ofref
root, mach, cal = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
spec = w6ref.sharp_spec("cone", cal, mach)
L = spec["L"]
import math
tm, beta = w6ref.cone_cp(mach, math.atan(w6ref.R / L))
for lv in range(4):
    case = os.path.join(root, f"L{lv}")
    if not os.path.exists(os.path.join(case, "done.json")):
        continue
    nose, x, r, marks = w6ref.grid(spec, lv)
    last = max(int(t) for t in os.listdir(case) if t.isdigit())
    w = ofref.wall_faces(os.path.join(case, str(last)), x, r, marks, mach)
    xm = 0.5 * (w[:, 0] + w[:, 2])
    k = (xm >= L / 3) & (xm <= 0.8 * L)
    e = w[k, 4] - tm
    print(f"L{lv} (iteration {last}): faces {k.sum()}, worst {np.abs(e).max():.2e}, mean {e.mean():+.2e}, drag of the faces {ofref.faces_drag(w):.7f}")
print(f"Taylor-Maccoll Cp {tm:.7f}, shock angle {beta:.3f}")
