"""Second reading, NACA TN 2960 fig. 5(c) (PDF p. 20 of NTRS 19930084018, 300 dpi): pressure coefficient around a
circular cylinder normal to the flow, M 1.49, 1.98, 2.90.  Symbol centre dots (specks.py), plus two flagged
symbols read on zooms; theta from vertical gridlines (0 at x 552.5, 151.2 px per 20 deg), P from horizontal
gridlines (376 px per unit, 0 at y 1348.1).  Front-side drag integral against modified Newtonian."""
import math
import numpy as np
Hy = [(2.4, 446.5), (2.0, 595.5), (1.6, 747.1), (1.2, 898.0), (0.8, 1046.5), (0.4, 1199.0), (0.0, 1348.1),
      (-0.4, 1499.5), (-0.8, 1650.0), (-1.2, 1800.9), (-1.6, 1950.5)]
Vx = [(0, 552.5), (20, 703.1), (40, 854.1), (60, 1004.0), (80, 1155.9), (100, 1307.0), (120, 1458.9), (140, 1610.9),
      (160, 1762.0), (180, 1914.5)]
def P(y): return float(np.interp(y, [p for _, p in Hy], [v for v, _ in Hy]))
def T(x): return float(np.interp(x, [p for _, p in Vx], [v for v, _ in Vx]))
# (theta nominal, x, [diamond M2.90], [square M1.98], [circle M1.49]); several y = +-theta (flagged) symbols
data = [
 (0, 552.0, [689.8], [715.7], [778.9]),
 (15, 663.5, [721.6], [754.0], [807.0]),
 (30, 777.5, [828.9], [849.0], [904.6]),
 (45, 891.5, [989.1], [1013.5], [1045.9, 1068.8]),
 (60, 1004.5, [1149.0], [1172.5], [1197.7, 1230.0]),
 (75, 1119.5, [1256.8], [1300.0], [1334.1, 1360.5]),
 (90, 1232.8, [1319.9, 1354.3], [1392.8], [1444.7, 1462.3]),
 (105, 1345.5, [1367.3, 1389.5], [1441.8], [1517.5]),
 (120, 1458.0, [1381.4], [1450.2], [1515.7]),
 (135, 1574.0, [1387.0], [1456.0], [1516.5]),
 (150, 1687.0, [1388.3], [1451.0], [1517.6]),
 (165, 1800.0, [1391.8], [1448.0], [1518.7]),
 (180, 1914.0, [1382.2], [1441.7], [1516.7]),
]
names = ("M2.90 diamond", "M1.98 square", "M1.49 circle")
def pitot_cp(M, g=1.4):
    r = ((g + 1) ** 2 * M * M / (4 * g * M * M - 2 * (g - 1))) ** (g / (g - 1)) * (1 - g + 2 * g * M * M) / (g + 1)
    return (r - 1) / (g / 2 * M * M)
print("# theta_nominal,theta_read,series,P values (each symbol; flagged = -theta),P mean")
table = {k: [] for k in range(3)}
for th, x, *ys in data:
    for k in range(3):
        vals = [P(y) for y in ys[k]]
        table[k].append((th, float(np.mean(vals))))
        print(f"{th},{T(x):.1f},{names[k]},{' '.join(f'{v:.3f}' for v in vals)},{np.mean(vals):.3f}")
print("# front side: Cd_front = int_0^90 P cos(theta) dtheta (on diameter); modified Newtonian = (2/3) P(0)")
print("# rear side: int_90^180 P cos(theta) dtheta;  total = front + rear")
for k, M in ((2, 1.49), (1, 1.98), (0, 2.90)):
    th = np.array([t for t, _ in table[k]]); p = np.array([v for _, v in table[k]])
    f = p * np.cos(np.radians(th)); dt = math.radians(15)
    fr = slice(0, 7); rr = slice(6, 13)
    simp = lambda y: dt / 3 * (y[0] + y[-1] + 4 * y[1:-1:2].sum() + 2 * y[2:-1:2].sum())
    front_s = simp(f[fr]); rear_s = simp(f[rr]); front_t = np.trapezoid(f[fr], dx=dt); rear_t = np.trapezoid(f[rr], dx=dt)
    newt = 2 / 3 * p[0]; newt_pitot = 2 / 3 * pitot_cp(M)
    print(f"M {M}: P(0) {p[0]:.3f} (pitot {pitot_cp(M):.3f}); front Simpson {front_s:.3f} trapezoid {front_t:.3f}; "
          f"modified Newtonian (2/3)P(0) {newt:.3f}, with pitot P0 {newt_pitot:.3f}; front/Newtonian {front_s / newt:.3f} (pitot-based {front_s / newt_pitot:.3f}); "
          f"rear Simpson {rear_s:.3f}; total {front_s + rear_s:.3f}")
