"""Second reading of NACA TN 3320 fig. 9 (base-pressure coefficient against M, RM-10 with fins, flight),
PDF p. 21 of NTRS 19930084086 rendered at 300 dpi.  Centre dots found by specks.py, symbol
shapes classified on labelled zoom views (work/v3320_o1..o3.png)."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
from grid import Grid
# vertical lines (M) measured at y bands 1600 and 2250
top = [568.4, 693.1, 819.1, 944.5, 1070.5, 1196.5, 1319.5, 1446.0, 1571.0, 1696.0, 1821.0, 1947.5, 2071.5]
bot = [570.0, 694.1, 821.0, 945.0, 1070.0, 1195.0, 1320.5, 1446.0, 1570.0, 1696.0, 1821.0, 1947.5, 2072.0]
V = [(round(0.8 + 0.2 * i, 1), t, b) for i, (t, b) in enumerate(zip(top, bot))]
# horizontal lines (P_B) at x bands 610 and 2030; left band missing -0.2..-0.3 lines (filled with the -4 px tilt)
R = [2395.0, 2268.9, 2143.0, 2017.0, 1892.0, 1764.6, 1639.5]
L = [2399.0, 2272.0, 2146.5, 2022.0, 1896.0, 1768.6, 1643.5]
H = [(round(-0.05 * i, 2), l, r) for i, (l, r) in enumerate(zip(L, R))]
g = Grid(V, 1600, 2250, H, 610, 2030)
pts = [l.split() for l in open(os.path.join(os.path.dirname(__file__), "..", "work", "specks3320.txt"))]
pts = [(float(a), float(b)) for a, b, _ in pts]
cls = {}
for k in (0, 1, 2, 3, 4, 6, 9, 12, 15, 18, 22, 25, 31, 34, 39, 43, 45, 46, 48, 51, 56, 59, 62, 65, 66, 69): cls[k] = "circle Model 1 full scale"
for k in (5, 10, 14, 16, 20, 21, 24, 27, 30, 35): cls[k] = "square Model A half scale"
for k in (7, 13, 17, 19, 23, 26, 29, 33, 36, 38, 40, 42, 44, 47, 49, 52, 55, 58, 60, 61, 63, 67, 71, 75): cls[k] = "pentagon Model E half scale"
for k in (70, 72, 78): cls[k] = "quarter-round Model D half scale"
cls[68] = "triangle Model C half scale"
print("# id,M,P_B,symbol (err about +-0.008 M, +-0.002 P_B; hand-drawn symbols, centre dots)")
for k, (x, y) in enumerate(pts):
    if k in cls:
        M, P = g.value(x, y)
        print(f"{k},{M:.3f},{P:.4f},{cls[k]}")
