"""A cone run's level: error against Taylor-Maccoll (L/3 to 0.8 L) at each saved time, and the change between the last two."""
import math, os, sys
import numpy as np
sys.path.insert(0, "/home/user/bowshock/docs/research/w6-reference")
import w6ref, ofref
case, lv = sys.argv[1], int(sys.argv[2])
spec = w6ref.sharp_spec("cone", 3, 2.0); L = spec["L"]
tm, _ = w6ref.cone_cp(2.0, math.atan(w6ref.R / L))
nose, x, r, marks = w6ref.grid(spec, lv)
ts = sorted(int(t) for t in os.listdir(case) if t.isdigit() and t != "0")
prev = None
for t in ts[-3:]:
    w = ofref.wall_faces(f"{case}/{t}", x, r, marks, 2.0)
    xm = 0.5 * (w[:, 0] + w[:, 2]); k = (xm >= L / 3) & (xm <= 0.8 * L)
    e = w[k, 4] / tm - 1
    s = f"  it {t}: worst {np.abs(e).max():.2e} mean {e.mean():+.2e} drag {ofref.faces_drag(w):.7f}"
    if prev is not None:
        s += f" | max change since last write {np.abs(e - prev).max():.2e}"
    prev = e
    print(s)
m = ofref.read_monitor(case, 2.0)
q = m[-len(m) // 4:, 2]
print(f"  logRes {m[-1,1]:.2f}, drag range last quarter {q.max()-q.min():.1e}")
