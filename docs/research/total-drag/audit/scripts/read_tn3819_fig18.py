"""Second reading of NACA TN 3819 fig. 18 (base pressure, cylindrical
afterbodies, no fins), PDF page 49 of NTRS 19930084517 rendered at 300 dpi.
Grid lines measured with lines2.py in two bands per axis (scan is sheared:
vertical lines lean ~15 px over the plot height, horizontal ~5 px over width).
Symbol centres from zoom views (view.py); curve traces from scan18.py."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from grid import Grid

top = [385.9, 445.1, 505.8, 565.0, 624.9, 685.0, 744.0, 804.0, 863.1, 924.0, 984.9, 1045.0, 1105.0,
       1164.1, 1223.9, 1282.9, 1343.1, 1403.0, 1463.0, 1523.0, 1582.1, 1641.2, 1701.1, 1761.0, 1820.2,
       1881.0, 1940.9, 2002.0, 2062.0, 2122.0, 2181.0, 2239.0, 2299.0, 2360.0, 2420.0, 2479.0, 2539.5,
       2598.9, 2658.1]
bot = [401.1, 460.9, 520.9, 579.9, 639.1, 699.9, 759.0, 819.0, None, 939.0, None, 1059.1, 1118.1,
       1177.8, 1237.0, 1295.8, 1356.0, 1415.5, 1475.8, 1535.0, 1594.1, 1653.1, 1712.9, 1772.1, 1831.9,
       1892.2, 1952.0, 2012.0, 2071.0, 2131.0, 2190.0, 2248.0, 2308.0, 2368.0, 2428.0, 2487.0, 2547.0,
       2606.0, 2666.0]
for i, b in enumerate(bot):
    if b is None:
        bot[i] = 0.5 * (bot[i - 1] + bot[i + 1])
V = [(round(1.0 + 0.2 * i, 1), t, b) for i, (t, b) in enumerate(zip(top, bot))]
L = [1805.9, 1746.0, 1685.1, 1625.1, None, 1505.1, 1444.9, 1385.2, 1325.2, 1265.1, 1205.1, 1144.1,
     1084.9, 1024.2, 964.2, 904.0, 844.0, 784.2, 724.0, 664.2, 604.0, 543.9, 483.1, 423.1, 362.5]
R = [1800.9, 1740.7, 1680.0, 1620.5, 1559.9, 1499.9, 1439.9, 1380.0, 1320.0, 1259.9, 1199.9, 1139.6,
     1079.9, 1019.0, 959.5, 898.9, 838.9, 779.0, 718.9, 658.9, 598.9, 538.9, 478.0, 418.0, 357.4]
L[4] = 0.5 * (L[3] + L[5])
H = [(round(-0.02 * i, 2), l, r) for i, (l, r) in enumerate(zip(L, R))]
g = Grid(V, 345, 1715, H, 660, 2510)

# symbols: (id, legend-shape guess, x, y, est px error)
sym = [
    ("s01", "circle (Ref 9)", 546.4, 1263.4, 1.5),
    ("s02", "D (Langley 9in SST, unpubl.)", 584.4, 1316.3, 2.5),
    ("s03", "teardrop (Ref 2)", 546.3, 1349.0, 2.0),
    ("s04", "arch (Ref 15)", 584.9, 1347.5, 2.5),
    ("s05", "arch (Ref 15), possibly two overlapped", 676.4, 1357.5, 3.0),
    ("s06", "D (Langley 9in SST)", 677.8, 1382.2, 3.0),
    ("s07", "teardrop (Ref 2), partly hidden", 699.0, 1391.0, 3.5),
    ("s08", "D or arch, overlapped with s09", 821.4, 1453.8, 4.0),
    ("s09", "arch/box, overlapped with s08", 820.5, 1464.0, 4.0),
    ("s10", "thin diamond (Ref 23)", 901.0, 1501.0, 2.5),
    ("s11", "triangle with tick (Ref 5?)", 1070.0, 1526.0, 3.0),
    ("s12", "diamond (Ref 24), doubled outline", 1145.5, 1558.0, 2.5),
    ("s13", "thin diamond (Ref 23)", 1295.6, 1605.0, 2.5),
    ("s14", "flagged right triangle (M=4 blowdown), centre dot", 1307.5, 1606.9, 2.0),
    ("s15", "thin diamond (Ref 23)", 1440.6, 1637.5, 2.0),
    ("s16", "square (Ref 12)", 1595.0, 1652.0, 2.5),
    ("s17", "diamond (Ref 24)", 1623.8, 1666.7, 2.0),
    ("s18", "triangle (Langley 11in HST), upper of a joined pair", 2160.0, 1721.3, 2.5),
    ("s19", "triangle (Langley 11in HST), lower of a joined pair", 2160.5, 1778.3, 2.5),
]
print("# symbols: id,M,P_B,err_M,err_PB,shape")
for sid, shape, x, y, e in sym:
    M, P = g.value(x, y)
    print(f"{sid},{M:.3f},{P:.4f},{(e + 1) / 298.5:.3f},{(e + 1) / 3004:.4f},{shape}")

# curve traces (x: [y of lines]); U/L = the two near-coincident faired curves
# (Chapman compilation and Love's basic curve), G = Gabeaud, below M ~3.3 G
# is separate; above, C (lowest, lightest line) is taken to be Gabeaud.
pair = {404: (1236.9, 1251.1), 428: (1239.2, 1251.5), 452: (1243.9, 1254.2), 476: (1249.1, 1259.5),
        500: (1256.9, 1256.9), 548: (1273.9, 1286.9), 572: (1284.5, 1298.8), 596: (1296.0, 1311.5),
        632: (1316.0, 1332.7), 656: (1330.5, 1347.4), 692: (1353.6, 1368.6), 704: (1361.6, 1375.7),
        728: (1377.9, 1390.4), 752: (1392.7, 1403.5), 776: (1407.0, 1416.4), 800: (1421.0, 1429.4),
        860: (1453.0, 1459.9), 884: (1465.0, 1470.9), 908: (1475.5, 1480.9), 932: (1486.0, 1490.9),
        956: (1496.1, 1500.0), 984: (1505.0, 1509.5), 1020: (1521.0, 1525.0),
        1092: (1546.0, 1546.0), 1104: (1550.3, 1550.3), 1188: (1575.5, 1575.5),
        1224: (1585.5, 1585.5), 1272: (1597.9, 1597.9), 1332: (1610.0, 1614.6),
        1404: (1630.5, 1630.5), 1452: (1634.9, 1640.4), 1488: (1641.2, 1646.9), 1520: (1647.0, 1652.4),
        1560: (1654.5, 1658.9), 1660: (1668.9, 1672.9), 1800: (1689.1, 1689.1), 1900: (1700.5, 1700.5),
        2000: (1709.0, 1709.0), 2100: (1715.9, 1715.9), 2200: (1723.0, 1723.0), 2300: (1730.0, 1730.0),
        2400: (1736.4, 1736.4), 2500: (1743.2, 1743.2), 2600: (1747.7, 1747.7)}
gab = {824: 1394.0, 884: 1437.2, 932: 1467.6, 980: 1494.9, 1032: 1521.3, 1188: 1582.7,
       1248: 1601.0, 1284: 1611.3, 1392: 1637.0, 1452: 1649.5, 1488: 1656.4, 1540: 1665.2,
       1800: 1699.1, 1900: 1709.4, 2100: 1724.5, 2200: 1730.4, 2300: 1736.1}
xs = sorted(pair)
curve_pts = []
for x in xs:
    y1, y2 = pair[x]
    M1, P1 = g.value(x, y1); M2, P2 = g.value(x, y2)
    curve_pts.append((0.5 * (M1 + M2), P1, P2))
cm = np.array([c[0] for c in curve_pts]); c1 = np.array([c[1] for c in curve_pts]); c2 = np.array([c[2] for c in curve_pts])
gx = sorted(gab); gm = []; gp = []
for x in gx:
    M, P = g.value(x, gab[x]); gm.append(M); gp.append(P)
print("# curves at round M and at symbol M: M,pair_more_negative,pair_less_negative,gabeaud")
want = [1.0, 1.2, 1.4, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.5, 2.6, 2.8, 3.0, 3.2, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0,
        6.5, 7.0, 7.5, 8.0, 8.5]
for sid, shape, x, y, e in sym:
    want.append(round(g.value(x, y)[0], 3))
for M in sorted(set(want)):
    a = np.interp(M, cm, c1); b = np.interp(M, cm, c2)
    gg = np.interp(M, gm, gp) if gm[0] <= M <= gm[-1] else float("nan")
    print(f"{M:.3f},{min(a, b):.4f},{max(a, b):.4f},{gg:.4f}")
