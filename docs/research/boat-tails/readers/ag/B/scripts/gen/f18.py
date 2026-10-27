import json, sys
W = sys.argv[1]
# (station label, meridian, x, y, sig, note)
R = {
 "top": [("-0.17", 0, 785.0, 705.5, 2.5, "circle bottom merged with the Cp = 0 axis line"),
         ("0", 0, 966.5, 745.5, 3, "circle overlapping a square"), ("0", 90, 966.0, 740.0, 4, "square overlapping the circle; top edge merged with the axis line"),
         ("0.19", 0, 1168.5, 846.0, 3, "circle overlapping a square; pin dot at (1172, 845) px"), ("0.19", 90, 1168.0, 840.0, 4, "square overlapping the circle; centre from its top edge"),
         ("0.38", 0, 1374.0, 958.0, 3, "circle below an overlapping square"), ("0.38", 90, 1373.0, 940.0, 3, "square above the circle; top edge merged with a grid line"),
         ("0.56", 0, 1585.0, 1053.0, 3, "circle below an overlapping square"), ("0.56", 90, 1580.5, 1030.0, 3, "square above the circle"),
         ("0.75", 0, 1784.0, 1112.0, 4, "three symbols overlap; circle from its bottom arc"), ("0.75", 90, 1784.0, 1097.0, 4, "three symbols overlap; square from its sides"), ("0.75", 180, 1784.0, 1092.0, 4, "three symbols overlap; diamond from its apex"),
         ("0.93", 0, 1980.0, 1158.0, 4, "three symbols overlap; circle from its bottom arc"), ("0.93", 90, 1980.5, 1145.5, 4, "three symbols overlap; square from its sides"), ("0.93", 180, 1980.0, 1139.0, 4, "three symbols overlap; diamond from its apex"),
         ("1.11", 0, 2175.0, 1168.0, 5, "three symbols overlap at the bottom frame; circle"), ("1.11", 90, 2177.5, 1164.5, 4, "three symbols overlap; square"), ("1.11", 180, 2177.0, 1155.0, 5, "three symbols overlap; diamond from its apex"),
         ("1.19", 0, 2264.0, 863.0, 3, "circle above the square"), ("1.19", 90, 2263.0, 887.5, 3, "square below the circle"), ("1.19", 180, 2262.0, 1006.5, 2, "diamond clearly separate, pin dot"),
         ("1.27", 0, 2357.0, 822.0, 6, "three symbols merged into one dark blob; circle read in the lower part"), ("1.27", 90, 2355.0, 802.0, 5, "merged blob; square read in the upper part"), ("1.27", 180, 2355.0, 812.0, 8, "merged blob; diamond not separable, value is the blob centre")],
 "bot": [("-0.17", 0, 781.5, 1421.5, 2.5, "clean circle"),
         ("0", 0, 966.0, 1430.0, 3, "circle overlapping a square"), ("0", 90, 966.0, 1433.0, 5, "square sides visible behind the circle"), ("0", 180, 966.0, 1450.0, 4, "diamond below the circle"),
         ("0.19", 0, 1168.0, 1507.0, 3, "three coincident symbols"), ("0.19", 90, 1167.0, 1506.5, 3, "three coincident symbols"), ("0.19", 180, 1170.0, 1506.0, 3, "three coincident symbols"),
         ("0.38", 0, 1376.0, 1583.0, 4, "circle inside/below the square"), ("0.38", 90, 1373.0, 1575.0, 3, "square"),
         ("0.56", 0, 1581.5, 1643.0, 5, "circle not separately visible; taken as coincident with the square"), ("0.56", 90, 1581.5, 1641.0, 3, "square"), ("0.56", 180, 1577.0, 1593.0, 2, "diamond clearly separate, pin dot"),
         ("0.75", 0, 1783.5, 1704.0, 5, "three symbols overlap; circle from its bottom arc"), ("0.75", 90, 1783.5, 1687.5, 3, "three symbols overlap; square"), ("0.75", 180, 1783.5, 1665.0, 3, "diamond at the top of the stack"),
         ("0.93", 0, 1981.5, 1740.0, 4, "three symbols overlap; circle"), ("0.93", 90, 1980.5, 1732.5, 3, "three symbols overlap; square"), ("0.93", 180, 1981.5, 1712.0, 3, "diamond at the top of the stack"),
         ("1.11", 0, 2174.0, 1754.0, 4, "three symbols overlap; circle"), ("1.11", 90, 2172.0, 1754.5, 3, "three symbols overlap; square"), ("1.11", 180, 2178.0, 1740.0, 5, "diamond at the top of the stack"),
         ("1.19", 0, 2262.5, 1596.5, 2.5, "circle, pin dot"), ("1.19", 90, 2262.0, 1630.0, 5, "square below the circle, partly merged with the faired curve"), ("1.19", 180, 2266.0, 1734.0, 3, "diamond clearly separate"),
         ("1.27", 0, 2353.0, 1526.0, 4, "merged blob; circle in the lower part"), ("1.27", 90, 2354.5, 1504.5, 3, "merged blob; square in the upper part"), ("1.27", 180, 2354.0, 1515.0, 8, "merged blob; diamond not separable, value is the blob centre")],
}
SH = {0: "circle", 90: "square", 180: "diamond"}
SZ = {0: 13, 90: 11.5, 180: 15.5}
for pn, rows in R.items():
    cal = json.load(open(W + "gen/f18_cal_%s.json" % pn))
    pts, meta = [], {}
    for st, mer, x, y, sig, n in rows:
        pid = "%s_%s_%d" % (pn, st, mer)
        pts.append({"id": pid, "series": SH[mer], "approx": [x, y], "shape": SH[mer], "size": SZ[mer], "fixed": True})
        flag = "ok" if sig <= 2.5 else "ambiguous"
        meta[pid] = {"meridian": str(mer), "series": "phi = %d deg (%s)" % (mer, SH[mer]), "sig": sig, "flag": flag,
                     "note": "jet off (caption); centre estimated by eye on 4x zoomed tiles of the 300 dpi page (grid cells are the size of the symbols, so template fits fail); " + n}
    json.dump({"thr": 150, "frame": cal["frame"], "xgrid": cal["xgrid"], "ygrid": cal["ygrid"], "points": pts}, open(W + "spec/f18_%s.json" % pn, "w"), indent=1)
    json.dump({"xdec": 4, "ydec": 4, "common": {"source": "TN D-6789", "item": "fig. 18 (%s)" % ("upper, M = 1.83" if pn == "top" else "lower, M = 2.20"),
               "mach": "1.83" if pn == "top" else "2.20", "configuration": "reference (S.T.A.) nozzle, circular-arc boattail (fig. 17); jet off",
               "x_quantity": "x/dm, ratio of axial boattail distance to model diameter (x from Sta. 102.32, fig. 17)",
               "y_quantity": "Cp,beta, boattail pressure coefficient", "page": "47"}, "points": meta}, open(W + "meta/f18_%s.json" % pn, "w"), indent=1)
print("ok")
