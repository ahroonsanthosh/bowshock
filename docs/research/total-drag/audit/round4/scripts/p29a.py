import os
from grid import Grid
PAGE = os.path.join(os.path.dirname(__file__), "..", "work", "f29-19.png")
top = [341.0, 439.5, 532.6, 625.5, 720.5, 813.0, 906.0, 1000.0, 1093.5, 1187.6, 1281.0]
bot = [340.0, 438.5, 531.5, 624.5, 719.0, 812.0, 905.5, 999.5, 1092.5, 1187.5, 1280.5]
V = [(0.5 * i, t, b) for i, (t, b) in enumerate(zip(top, bot))]
L = [775.5, 868.6, 961.5, 1058.0, 1151.5, 1243.0]; R = [779.4, 872.0, 964.6, 1062.5, 1155.4, 1247.0]
H = [(round(1.0 - 0.2 * i, 1), l, r) for i, (l, r) in enumerate(zip(L, R))]
xband = (365, 1200)
g = Grid(V, 825, 1205, H, xband[0], xband[1])
y0, y1, thr = 760, 1245, 180
