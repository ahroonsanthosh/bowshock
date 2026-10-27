# Builds the measure.py config for TN 3372 figure 12 (PDF page 20): configuration D curves only.
import json, sys
A = sys.argv[1]
SV = 0.007
XB = [1345, 1950]
xs = [545.7, 647.6, 753.0, 855.9, 959.8, 1062.6, 1165.0, 1269.2, 1370.7, 1474.5, 1576.5, 1679.3, 1782.0]
xv = [round(0.6 + 0.05 * k, 2) for k in range(13)]
ys = [721.7, 824.6, 927.9, 1029.6, 1133.4, 1236.1, 1339.4, 1442.5, 1547.0, 1649.4, 1752.6, 1856.1, 1958.3]
yv = [round(-0.32 + 0.04 * k, 2) for k in range(13)]
cfg = {
 "image": A + "/render/tn3372_p20-000.jpg", "rot": 0, "page": 20, "source": "TN 3372", "item": "fig. 12",
 "csv": "tn3372_fig12.csv", "nd_x": 3, "mach_from_x": True, "line_half": 8,
 "xq": "Mach number, M (flight Mach number, free stream)",
 "yq": "base pressure coefficient, delta p/q = (base pressure - free-stream static pressure)/free-stream dynamic pressure (text, PDF p. 5); axis increases downward, values below the zero line are positive",
 "symbols": {"cross": {"kind": "plus", "h": 6, "t": 1.0}},
 "panels": {"p": {"box": [546, 722, 1782, 1958], "xband": XB, "yband": [1180, 1770],
   "xlines": [[xs[k] + (XB[0] - 1647) * SV, xs[k] + (XB[1] - 1647) * SV, xv[k], 1 if k % 2 == 0 else 0] for k in range(13)],
   "ylines": [[ys[k], yv[k], 1 if k % 2 == 0 else 0] for k in range(13)],
   "mach": "", "configuration": "configuration D: convergent afterbody with dummy rocket chamber (legend sketch D); flight model, assumed at or near zero angle of attack (text, PDF p. 4)"}},
 "points": []
}
for key, series, extra in (("edge", "Config. D edge orifice (dashed curve)", {}), ("center", "Config. D center orifice (dashed curve)", {})):
    J = json.load(open(A + "/work/f12_%s.json" % key))
    em = J["emitted"]
    ys_ = [p[1] for p in em]
    for i, (x, y) in enumerate(em):
        note = "curve only (no symbols in figure 12); point traced on the drawn curve, x is the column actually read, no interpolation across dash gaps"
        if i == 0:
            note += "; left end of the drawn curve"
        if i == len(em) - 1:
            note += "; right end of the drawn curve"
        if y == max(ys_):
            note += "; lowest point of the curve on the page (largest positive delta p/q, the cusp)"
        if key == "edge" and 1340 < x < 1352 and 1600 < y < 1615:
            note += "; the arrowhead of the 'Config. D edge orifice' leader touches the curve here"
        if key == "center" and 1262 < x < 1272 and 1768 < y < 1782:
            note += "; the arrowhead of the 'Config. D center orifice' leader touches the curve here"
        if key == "edge" and 1570 < x < 1582:
            note += "; the curve crosses the 1.10 and -0.04 grid lines here"
        cfg["points"].append({"panel": "p", "sym": "cross", "x": x, "y": y, "nomatch": True, "flag": "curve",
                              "series": series, "sigma": 1.0, "note": note + "; the mach column repeats the x reading"})
json.dump(cfg, open(sys.argv[2], "w"), indent=1)
