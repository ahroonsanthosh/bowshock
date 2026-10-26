import json, sys
out = sys.argv[1]
xa = [900.1, 1024.0, 1146.9, 1266.6, 1389.9, 1512.9, 1633.7, 1756.9, 1878.8, 2000.2, 2123.7, 2246.4, 2367.6, 2489.2, 2611.2]
xb = [897.7, 1019.7, 1140.9, 1262.1, 1386.6, 1510.2, 1630.1, 1753.5, 1875.1, 1997.0, 2120.2, 2242.4, 2364.4, 2486.3, 2608.1]
vl = [dict(val=round(1.0 + 0.2 * i, 2), x=[a, b], y=[1865, 1200]) for i, (a, b) in enumerate(zip(xa, xb))]
hy = [(785.5, 782.1), (913.6, 910), (1036.9, 1033.0), (1158.5, 1155.4), (1282.1, 1278.5), (1403.8, 1400.0),
      (1527, 1524), (1650.5, 1647), (1773.5, 1771.6), (1898.2, 1896.6), (2020.6, 2019.7)]
zero = {"dD.50": 6, "dD.30": 7, "dD.15": 8, "dD.075": 9, "dD0": 10}
hl = [dict(y=[a, b], x=[1320, 2270], vals={k: round((z - i) * 0.05, 3) for k, z in zero.items()}) for i, (a, b) in enumerate(hy)]
P = []
def add(i, sc, sh, xy, fixed=True, win=12, note=""):
    P.append(dict(id=i, series=sc, shape=sh, scale=sc, xy=list(xy), fixed=fixed, win=win, note=note))
# d/D .50 right triangles, bbox centres from ASCII reading (fixed)
add("r124", "dD.50", "rtri", (1039, 1044.3))
add("r144", "dD.50", "rtri", (1161, 1025.0))
add("r196u", "dD.50", "rtri", (1476, 986.3))
add("r196l", "dD.50", "rtri", (1479.5, 996.8))
add("r306", "dD.50", "rtri", (2150.5, 942.3))
add("r367", "dD.50", "rtri", (2524.5, 951.8))
# d/D .30 triangles
add("t124", "dD.30", "tri", (1037, 1303.8))
add("t144", "dD.30", "tri", (1163, 1326.5))
add("t196", "dD.30", "tri", (1486, 1344.3))
add("t306", "dD.30", "tri", (2155.5, 1358.0))
add("t367", "dD.30", "tri", (2529, 1358.3))
# d/D .15 diamonds
add("d124u", "dD.15", "diamond", (1042, 1465))
add("d124l", "dD.15", "diamond", (1042, 1472))
add("d144", "dD.15", "diamond", (1160, 1490), fixed=False)
add("d196", "dD.15", "diamond", (1480, 1527), fixed=False)
add("d306u", "dD.15", "diamond", (2160, 1563))
add("d306l", "dD.15", "diamond", (2160, 1570))
add("d367", "dD.15", "diamond", (2525, 1572), fixed=False)
# d/D .075 squares
for i, xy in (("s124", (1040, 1597)), ("s144", (1160, 1615)), ("s196", (1480, 1670)), ("s306", (2155, 1690)), ("s367", (2525, 1690))):
    add(i, "dD.075", "square", xy, fixed=False)
json.dump(dict(page="work/p600-14.png", vlines=vl, vtrack=[800, 2010, 20], hlines=hl, htrack=[915, 2600, 25],
               shapes={"diamond": [40, 4], "square": [28, 4], "rtri": {"poly": [[11.5, -11], [-11.5, 11], [11.5, 11]]}, "tri": {"poly": [[0, -11], [-13.5, 11], [13.5, 11]]}}, points=P), open(out, "w"), indent=1)
