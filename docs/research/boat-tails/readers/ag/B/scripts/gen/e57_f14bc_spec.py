import json, sys
base = sys.argv[1]
def mk(i, ser, shape, x, y, fill, fixed=False, **k):
    size = {"circle": 11, "square": 11, "diamond": 15.5, "tri_up": 14, "tri_dn": 14}[shape]
    if fill:
        size = {"circle": 12, "square": 12.5, "diamond": 17, "tri_up": 15.5, "tri_dn": 15.5}[shape]
    d = {"id": i, "series": ser, "approx": [x, y], "shape": shape, "size": size, "dsize": 1.5, "search": 4}
    if shape in ("diamond",): d["aspect"] = 0.94
    if shape in ("tri_up", "tri_dn"): d["aspect"] = 0.86
    if fill: d["fill"] = True
    if fixed: d["fixed"] = True
    d.update(k)
    return d
SER = {"circle": "1.11", "square": "1.40", "diamond": "1.67", "tri_dn": "1.67 (45 deg bevel)", "tri_up": "2.00"}
def F(i, shape, x, y, **k): return mk(i, SER[shape] + " solid", shape, x, y, True, **k)
def O(i, shape, x, y, **k): return mk(i, SER[shape] + " open", shape, x, y, False, **k)
Xb = [432.0, 539.6, 647.68, 755.71, 863.29, 970.98, 1078.9, 1186.36, 1293.88, 1401.39, 1509.23, 1617.41, 1724.86]
Yb = [1679.23, 1783.34, 1892.04, 2000.23, 2108.84, 2215.33, 2320.0]
ptsb = [F("b01","square",479,2175), F("b02","diamond",481,2209), F("b03","circle",481,2238),
        F("b04","square",482.5,2281.5,fixed=True), F("b05","square",483.5,2305.5,fixed=True),
        F("b06","tri_up",575,2105), F("b07","tri_up",675,2125), F("b08","circle",700,2128), F("b09","diamond",710,2153),
        F("b10","tri_up",772,2054), F("b11","square",799.5,2065,fixed=True), F("b12","square",799.5,2092,fixed=True),
        F("b13","tri_up",817,2018), F("b14","tri_up",862,1988), F("b15","tri_up",896,1998), F("b16","diamond",906,2072),
        F("b17","diamond",978,2000), F("b18","diamond",1017,1965),
        F("b19","square",1059.5,1976,fixed=True), F("b20","square",1053,1986,fixed=True), F("b21","square",1055,2020,fixed=True),
        F("b22","diamond",1090,1978),
        F("b23","square",1108.5,1915,fixed=True), F("b24","square",1122,1911.5,fixed=True), F("b25","square",1122.5,1935.5,fixed=True),
        F("b26","square",1155.5,1871.5,fixed=True), F("b27","square",1159,1882.5,fixed=True), F("b28","square",1159,1906.5,fixed=True),
        F("b29","square",1186,1848), F("b30","circle",1196,1958), F("b31","circle",1248,1903), F("b32","circle",1271,1875),
        F("b33","circle",1294,1857), F("b34","circle",1320,1797)]
specb = {"thr": 170, "frame": [432, 1679, 2049, 2320],
         "xgrid": [[round(0.1*i,1), p, "v", [1690, 2310], 6] for i, p in enumerate(Xb) if i > 0],
         "ygrid": [[round(0.08-0.04*i,2), p, "h", [450, 2040], 6] for i, p in enumerate(Yb)],
         "points": ptsb}
json.dump(specb, open(base + "e57_f14b.json", "w"), indent=1)
Xc = [425.0, 533.61, 641.47, 749.0, 856.95, 965.0, 1073.6, 1180.0, 1288.0, 1393.89, 1501.1, 1609.42, 1716.88, 1824.86, 1933.35, 2040.86]
Yc = [2430.76, 2538.77, 2644.37]
ptsc = [F("c01","circle",472,2512), O("c02","tri_up",475,2534,search=5), F("c03","tri_up",480,2568,search=5),
        F("c04","tri_up",577,2580), O("c05","tri_up",576,2543),
        O("c06","tri_up",667,2532), O("c07","circle",697,2497), O("c08","diamond",703,2522,search=5), F("c09","circle",698,2542),
        F("c10","tri_up",668,2575), F("c11","diamond",703,2600),
        O("c12","tri_up",761,2523), F("c13","tri_up",760,2565),
        O("c14","square",794.8,2522.8,fixed=True), O("c15","tri_up",806,2516), F("c16","tri_up",808,2562),
        O("c17","tri_up",846,2505), F("c18","tri_up",847,2550),
        O("c19","tri_up",888,2505), O("c20","diamond",898,2520), F("c21","tri_up",885,2552.7,fixed=True), F("c22","diamond",893.5,2570.5,fixed=True),
        O("c23","diamond",970,2512), F("c24","diamond",972,2547), O("c25","diamond",1010,2516), F("c26","diamond",1010,2540),
        O("c27","diamond",1043,2518), F("c28","diamond",1045,2535), O("c29","diamond",1075,2520), F("c30","diamond",1075,2540),
        O("c31","square",1047,2497),
        O("c32","square",1120,2502), O("c33","square",1143,2502), O("c34","square",1171.3,2499.2,fixed=True), F("c35","circle",1183.7,2508.0,fixed=True), O("c36","square",1201.5,2501.5,fixed=True),
        F("c37","circle",1238,2488), O("c38","circle",1240,2505), F("c39","circle",1271.5,2478.0,fixed=True), O("c40","circle",1270,2505),
        F("c41","circle",1296.0,2470.5,fixed=True), O("c42","circle",1293,2494), O("c43","circle",1316,2485), F("c44","circle",1318,2493)]
specc = {"thr": 170, "frame": [425, 2431, 2041, 2644],
         "xgrid": [[round(0.1*i,1), p, "v", [2440, 2635], 6] for i, p in enumerate(Xc) if i in (1,2,4,6,9,10,11,12,13,14,15)],
         "ygrid": [[round(-0.04*i,2), p, "h", [450, 2030], 6] for i, p in enumerate(Yc)],
         "points": ptsc}
json.dump(specc, open(base + "e57_f14c.json", "w"), indent=1)
print("ok")
