"""Second reading, NACA TR 1109 fig. 8 (PDF p. 11 of NTRS 19930090968, 300 dpi):
p_b/p_inf against c/[h (Re)^(1/5)], thickness group, turbulent; panels (a) M 1.5, (b) 2.0, (c) 3.1.
Symbol bbox centres read on 4x to 8x zooms (work/s8*.png); grid from lines2.py."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
from grid import Grid
Va = [(0.5 * i, t, b) for i, (t, b) in enumerate(zip(
    [1560.2, 1656.5, 1749.1, 1843.0, 1936.6, 2031.6, 2125.5, 2219.0, 2314.5, 2408.6, 2502.6],
    [1562.0, 1657.5, 1750.5, 1843.6, 1937.5, 2032.5, 2126.5, 2220.0, 2315.0, 2409.5, 2503.5]))]
Vb = [(0.5 * i, t, b) for i, (t, b) in enumerate(zip(
    [1564.5, 1658.5, 1751.9, 1846.5, 1940.4, 2034.5, 2127.5, 2221.5, 2315.5, 2410.5, 2504.0],
    [1566.0, 1659.5, 1753.5, 1848.5, 1941.5, 2035.5, 2129.4, 2222.5, 2315.6, 2411.5, 2504.5]))]
Vc = [(0.5 * i, t, b) for i, (t, b) in enumerate(zip(
    [1568.0, 1660.5, 1754.5, 1847.5, 1942.5, 2035.6, 2129.5, 2222.5, 2316.0, 2410.5, 2503.0],
    [1569.5, 1660.5, 1754.5, 1847.5, 1942.0, 2035.5, 2129.0, 2222.5, 2315.5, 2410.1, 2503.0]))]
Ha = [(0.6, 384.0, 384.5), (0.4, 478.9, 479.9), (0.2, 573.5, 574.0), (0.0, 668.1, 668.0)]
Hb = [(0.8, 762.0, 762.5), (0.6, 855.4, 856.2), (0.4, 949.1, 950.0), (0.2, 1042.1, 1043.0), (0.0, 1136.0, 1137.0)]
Hc = [(0.8, 1232.1, 1232.1), (0.6, 1324.5, 1325.5), (0.4, 1418.5, 1419.5), (0.2, 1512.0, 1512.5), (0.0, 1604.1, 1604.0)]
ga = Grid(Va, 360, 620, Ha, 1650, 2400); gb = Grid(Vb, 800, 1100, Hb, 1650, 2400); gc = Grid(Vc, 1250, 1580, Hc, 1650, 2400)
pts = {
 "a": [("open triangle", 1665.5, 427.7), ("open diamond", 1704.0, 423.3), ("square under diamond (partly hidden)", 1703.5, 435.5),
       ("open diamond or circle", 1750.5, 423.0), ("open square", 1783.0, 431.5), ("filled triangle", 1776.5, 445.5),
       ("filled triangle", 1846.5, 427.0), ("half-filled square", 1847.5, 437.5), ("filled square", 1992.5, 427.5),
       ("open circle", 1985.8, 442.5), ("open circle", 2132.0, 428.0), ("filled circle", 2412.0, 412.0)],
 "b": [("open triangle", 1672.0, 979.9), ("open diamond", 1709.0, 957.5), ("half-filled triangle", 1711.0, 977.0),
       ("open diamond", 1753.0, 965.5), ("open square", 1780.0, 956.0), ("filled triangle", 1782.0, 985.3),
       ("half-filled square", 1850.0, 967.5), ("open circle", 1990.5, 958.0), ("filled square", 1990.8, 970.8),
       ("open circle", 2135.5, 937.8), ("filled circle", 2418.0, 929.0)],
 "c": [("open triangle", 1665.0, 1519.3), ("open diamond", 1697.0, 1510.0), ("half-filled triangle", 1739.0, 1498.5),
       ("filled triangle", 1762.0, 1506.5), ("open square", 1829.0, 1488.0), ("filled square", 1950.0, 1470.0),
       ("open circle", 1957.5, 1465.8), ("open circle", 2085.0, 1450.8), ("filled circle", 2352.5, 1410.0)],
}
G = {"a": (ga, 1.5), "b": (gb, 2.0), "c": (gc, 3.1)}
print("# panel,M,symbol,X=c/[h Re^0.2],pb/pinf  (triangles: centroid one third above the base; others bbox centre)")
print("# reading error +-0.02 in X, +-0.006 in pb/pinf (symbols overlap the faired curve and each other)")
for k, lst in pts.items():
    g, M = G[k]
    for name, x, y in lst:
        X, p = g.value(x, y)
        print(f"{k},{M},{name},{X:.3f},{p:.3f}")
