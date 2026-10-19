import os
from grid import Grid
PAGE = os.path.join(os.path.dirname(__file__), "..", "work", "f29-19.png")
top = [340.0, 437.5, 531.5, 624.5, 719.0, 812.5, 905.5, 1000.5, 1093.5, 1186.8, 1280.5]
bot = [339.5, 437.1, 530.5, 623.5, 718.5, 811.5, 905.5, 999.6, 1093.1, 1186.5, 1279.9]
V = [(round(0.02 * i, 2), t, b) for i, (t, b) in enumerate(zip(top, bot))]
L = [1433.0, 1526.0, 1620.5, 1713.5, 1807.5, 1900.5]; R = [1436.5, 1529.5, 1624.0, 1717.5, 1810.5, 1904.0]
H = [(round(1.0 - 0.2 * i, 1), l, r) for i, (l, r) in enumerate(zip(L, R))]
xband = (365, 1200)
g = Grid(V, 1445, 1730, H, xband[0], xband[1])
y0, y1, thr = 1420, 1900, 180
