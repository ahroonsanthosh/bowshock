"""Global bilinear (affine plus lean varying linearly across the plot) calibration of TN 3819 fig. 18 (PDF p. 49, 300 dpi), fitted by least
squares to every measured gridline crossing (a different method from round 1's piecewise
interpolation): x = a0 + a1*M + a2*y + a3*M*y ; y = b0 + b1*P + b2*x + b3*P*x."""
import numpy as np
top = [385.9, 445.1, 505.8, 565.0, 624.9, 685.0, 744.0, 804.0, 863.1, 924.0, 984.9, 1045.0, 1105.0, 1164.1, 1223.9,
       1282.9, 1343.1, 1403.0, 1463.0, 1523.0, 1582.1, 1641.2, 1701.1, 1761.0, 1820.2, 1881.0, 1940.9, 2002.0, 2062.0,
       2122.0, 2181.0, 2239.0, 2299.0, 2360.0, 2420.0, 2479.0, 2539.5, 2598.9, 2658.1]
bot = [401.1, 460.9, 520.9, 579.9, 639.1, 699.9, 759.0, 819.0, None, 939.0, None, 1059.1, 1118.1, 1177.8, 1237.0,
       1295.8, 1356.0, 1415.5, 1475.8, 1535.0, 1594.1, 1653.1, 1712.9, 1772.1, 1831.9, 1892.2, 1952.0, 2012.0, 2071.0,
       2131.0, 2190.0, 2248.0, 2308.0, 2368.0, 2428.0, 2487.0, 2547.0, 2606.0, 2666.0]
L = [1805.9, 1746.0, 1685.1, 1625.1, None, 1505.1, 1444.9, 1385.2, 1325.2, 1265.1, 1205.1, 1144.1, 1084.9, 1024.2,
     964.2, 904.0, 844.0, 784.2, 724.0, 664.2, 604.0, 543.9, 483.1, 423.1, 362.5]
R = [1800.9, 1740.7, 1680.0, 1620.5, 1559.9, 1499.9, 1439.9, 1380.0, 1320.0, 1259.9, 1199.9, 1139.6, 1079.9, 1019.0,
     959.5, 898.9, 838.9, 779.0, 718.9, 658.9, 598.9, 538.9, 478.0, 418.0, 357.4]
rows = []; rhs = []
for i, (t, b) in enumerate(zip(top, bot)):
    M = 1.0 + 0.2 * i
    rows.append([1, M, 345.0, M * 345.0]); rhs.append(t)
    if b is not None: rows.append([1, M, 1715.0, M * 1715.0]); rhs.append(b)
ax, res1, *_ = np.linalg.lstsq(np.array(rows), np.array(rhs), rcond=None)
rows = []; rhs = []
for i, (l, r) in enumerate(zip(L, R)):
    P = -0.02 * i
    if l is not None: rows.append([1, P, 660.0, P * 660.0]); rhs.append(l)
    rows.append([1, P, 2510.0, P * 2510.0]); rhs.append(r)
ay, res2, *_ = np.linalg.lstsq(np.array(rows), np.array(rhs), rcond=None)

def value(x, y):
    # solve x = a0 + a1 M + a2 y ; y = b0 + b1 P + b2 x
    M = (x - ax[0] - ax[2] * y) / (ax[1] + ax[3] * y)
    P = (y - ay[0] - ay[2] * x) / (ay[1] + ay[3] * x)
    return M, P

def xy(M, P):
    # inverse: iterate
    x, y = 1000.0, 1500.0
    for _ in range(20):
        x = ax[0] + ax[1] * M + ax[2] * y + ax[3] * M * y
        y = ay[0] + ay[1] * P + ay[2] * x + ay[3] * P * x
    return x, y

if __name__ == "__main__":
    r = np.array(rows); print("x fit:", ax, " rms residual px:", np.sqrt(res1 / 76))
    print("y fit:", ay, " rms residual px:", np.sqrt(res2 / 49))
    for M in (3.0, 3.5, 4.0, 5.0):
        # vacuum check at the curve: y of P=-1/(0.7M^2)
        pass
