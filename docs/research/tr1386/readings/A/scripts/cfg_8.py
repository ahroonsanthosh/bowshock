import json, sys
outL, outR = sys.argv[1], sys.argv[2]
# left column
xa = [3018.3, 3109.2, 3201.4, 3294.9, 3386.1, 3478.7, 3570.8, 3663.3, 3755.8, 3848.4, 3938.4]
xb = [3021.1, 3115.4, 3207.4, 3299.9, 3391.2, 3484.9, 3577.7, 3668.6, 3761.7, 3853.2, 3942.5]
vL = [dict(val=round(0.05 * i, 3), x=[a, b], y=[1255, 2385]) for i, (a, b) in enumerate(zip(xa, xb))]
def H(key, ys):
    return [dict(y=[a, b], x=[3440, 3720], vals={key: round(0.25 - 0.05 * i, 3)}) for i, (a, b) in enumerate(ys)]
hL = (H("M1.24", [(872, 871), (962.5, 962.2), (1055, 1055.5), (1148.6, 1147), (1239.5, 1238.5), (1329.2, 1328.1)]) +
      H("M1.44", [(1423.7, 1422.8), (1513, 1512.9), (1602.5, 1602.3), (1697.1, 1695.7), (1790, 1789.2), (1884.2, 1883.4)]) +
      H("M1.96", [(1976.3, 1975.4), (2067.5, 2067.1), (2159.9, 2159), (2252.1, 2250.2), (2344.7, 2343.5), (2435.2, 2434.5)]))
hL[-3]["xr"] = [3600, 3935]
hL[-3]["slope"] = -0.0045
P = []
def add(i, sc, sh, xy, dd, fixed=False, win=8, ser="Foredrag"):
    P.append(dict(id=i, series=ser, shape=sh, scale=sc, xy=list(xy), fixed=fixed, win=win, dd=dd))
add("124_075", "M1.24", "circle", (3158, 1109), 0.075)
add("124_15", "M1.24", "circle", (3296, 1102), 0.15)
add("124_3", "M1.24", "circle", (3570, 1074), 0.3)
add("124_5", "M1.24", "circle", (3935, 965), 0.5)
add("144_075f", "M1.44", "circle", (3158, 1673), 0.075)
add("144_15f", "M1.44", "circle", (3293, 1673), 0.15, win=5)
add("144_3u", "M1.44", "circle", (3572, 1640), 0.3, win=5)
add("144_3lf", "M1.44", "circle", (3572, 1657), 0.3, win=5)
add("144_5u", "M1.44", "circle", (3937, 1501), 0.5, win=5)
add("144_5lf", "M1.44", "circle", (3940, 1527), 0.5, win=5)
add("196_075", "M1.96", "circle", (3158, 2269), 0.075)
add("196_15", "M1.96", "circle", (3296, 2254), 0.15)
add("196_3", "M1.96", "circle", (3577, 2210), 0.3, win=5)
add("196_5", "M1.96", "circle", (3942, 2034), 0.5, win=5)
add("196_3sq", "M1.96", "square", (3574, 2208.5), 0.3, fixed=True, ser="Wave drag (press. distr. models)")
add("196_5sq", "M1.96", "square", (3939.6, 2052.7), 0.5, fixed=True, ser="Wave drag (press. distr. models)")
json.dump(dict(page="work/p600-14.png", vlines=vL, vtrack=[880, 2430, 20], hlines=hL, htrack=[3035, 3930, 20],
               shapes={"circle": [30, 4], "square": [28, 4]}, points=P), open(outL, "w"), indent=1)
# right column
xa = [4220.6, 4312.9, 4405.3, 4496.7, 4590.0, 4682.6, 4773.8, 4866.4, 4959.4, 5051.6, 5141.4]
xb = [4221.5, 4314.6, 4403.8, 4497.8, 4591.4, 4682.8, 4775.5, 4867.0, 4960.8, 5051.3, 5142.3]
vR = [dict(val=round(0.05 * i, 3), x=[a, b], y=[1815, 2385]) for i, (a, b) in enumerate(zip(xa, xb))]
def H2(key, ys):
    return [dict(y=[a, b], x=[4440, 4920], vals={key: round(0.25 - 0.05 * i, 3)}) for i, (a, b) in enumerate(ys)]
hR = (H2("M3.06", [(1419.2, 1419.7), (1511.5, 1511.5), (1602.2, 1602), (1694.6, 1694.9), (1786.8, 1787.6), (1880.0, 1880.2)]) +
      H2("M3.67", [(1972.1, 1973.1), (2066.7, 2066.7), (2157.5, 2157.5), (2249.2, 2248.5), (2342.1, 2342.5), (2433.4, 2432.6)]))
P = []
add("306_075", "M3.06", "circle", (4352, 1730), 0.075, win=5)
add("306_075h", "M3.06", "circle", (4355, 1736.6), 0.075, fixed=True)
add("306_15", "M3.06", "circle", (4497, 1728), 0.15, win=6)
add("306_3", "M3.06", "circle", (4775, 1655), 0.3, win=6)
add("306_5", "M3.06", "circle", (5140, 1441), 0.5, win=6)
add("306_3sq", "M3.06", "square", (4771.6, 1667.3), 0.3, fixed=True, ser="Wave drag (press. distr. models)")
add("306_5sq", "M3.06", "square", (5140, 1466.0), 0.5, fixed=True, ser="Wave drag (press. distr. models)")
add("367_075", "M3.67", "circle", (4352, 2289), 0.075)
add("367_15", "M3.67", "circle", (4495, 2287), 0.15)
add("367_3", "M3.67", "circle", (4776, 2220), 0.3)
add("367_5", "M3.67", "circle", (5140, 2003), 0.5)
json.dump(dict(page="work/p600-14.png", vlines=vR, vtrack=[1430, 2430, 20], hlines=hR, htrack=[4235, 5135, 20],
               shapes={"circle": [30, 4], "square": [28, 4]}, points=P), open(outR, "w"), indent=1)
