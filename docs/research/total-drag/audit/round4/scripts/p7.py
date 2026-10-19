import os
import numpy as np
PAGE = os.path.join(os.path.dirname(__file__), "..", "work", "a51p-14.png")
XT = [(1.0, 672.0), (2.0, 942.5), (3.0, 1217.0), (4.0, 1490.5)]
YT = [(1.0, 598.5), (0.8, 732.0), (0.6, 862.5), (0.4, 994.5), (0.2, 1126.5), (0.0, 1256.5)]
def M_of(x): return float(np.interp(x, [p for _, p in XT], [v for v, _ in XT]))
def x_of(M): return float(np.interp(M, [v for v, _ in XT], [p for _, p in XT]))
def P_of(y): return float(np.interp(y, [p for _, p in YT], [v for v, _ in YT]))
