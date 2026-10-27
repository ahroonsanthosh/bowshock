import json, sys
W = sys.argv[1]
FIX = {  # id: (x, y, sig, note)
 "top_square_M1.20": (1233.5, 865.5, 2.0, "open square partly hidden by the filled (slender-body) square below it; centre from its top edge and sides"),
 "top_circle_M1.20": (1237.5, 919.0, 2.5, "open circle partly hidden by the filled (slender-body) circle; centre from its top arc"),
 "top_square_M1.30": (1302.5, 874.5, 1.5, "open square fully outlined above the filled square"),
 "top_circle_M1.30": (1305.5, 922.5, 2.5, "open circle partly hidden by the filled circle; centre from its top arc"),
 "top_diamond_M1.30": (1305.5, 699.5, 3.0, "open diamond partly hidden by the filled (slender-body) diamond; centre from its apex and upper edges"),
 "top_square_M1.83": (1675.5, 909.5, 2.5, "open square merged with filled symbols below; centre from its top edge and sides"),
 "top_circle_M1.83": (1676.0, 932.0, 4.0, "open circle merged with filled symbols and curves; centre from a small visible interior; weak"),
 "top_diamond_M1.83": (1675.5, 804.5, 3.0, "open diamond above the filled diamond; centre from its apex and interior"),
 "mid_circle_M1.30": (1305.0, 1579.0, 2.5, "open circle partly hidden by the filled circle; centre from its top arc"),
 "mid_square_M1.30": (1305.0, 1525.0, 2.5, "open square partly hidden by the filled square; centre from its top edge"),
 "mid_diamond_M1.83": (1675.5, 1433.0, 4.0, "open diamond under the filled diamond; centre from a small visible part; weak"),
 "bot_circle_M1.20": (1234.5, 2360.0, 2.5, "open circle partly hidden by the filled circle; centre from its top arc"),
 "bot_circle_M1.30": (1305.5, 2368.0, 2.5, "open circle partly hidden by the filled circle; centre from its top arc"),
 "bot_square_M1.83": (1676.0, 2353.0, 2.5, "open square merged with filled symbols; centre from its top edge and sides"),
 "bot_circle_M1.83": (1676.0, 2396.0, 3.0, "open circle merged with a filled circle; centre from its top arc"),
 "bot_diamond_M1.83": (1675.5, 2188.0, 3.0, "open diamond above the filled diamond"),
}
HIDDEN = {  # open symbol not visible: assumed under the filled slender-body symbol
 "mid_square_M1.20": (1234.5, 1504.0), "mid_circle_M1.20": (1233.5, 1569.0),
 "bot_square_M1.20": (1234.0, 2285.5), "bot_square_M1.30": (1306.0, 2300.0),
}
WEAK = ["top_circle_M2.20", "top_square_M2.20", "top_diamond_M2.20", "mid_circle_M1.83", "mid_square_M1.83", "mid_circle_M2.20", "mid_square_M2.20", "mid_diamond_M2.20",
        "bot_circle_M2.20", "bot_square_M2.20", "bot_diamond_M2.20"]
meta_all = {}
for pn in ("top", "mid", "bot"):
    sp = json.load(open(W + "spec/f12_%s.json" % pn))
    ids = [p["id"] for p in sp["points"]]
    for h in HIDDEN:
        if h.startswith(pn) and h not in ids:
            sh = h.split("_")[1]
            sp["points"].append({"id": h, "series": sh, "approx": list(HIDDEN[h]), "shape": sh, "size": 10, "fixed": True})
    meta = {}
    for p in sp["points"]:
        pid = p["id"]
        if pid in FIX:
            x, y, s, n = FIX[pid]
            p.update({"approx": [x, y], "fixed": True})
            meta[pid] = {"flag": "ambiguous", "sig": s, "note": n}
        elif pid in HIDDEN:
            p.update({"approx": list(HIDDEN[pid]), "fixed": True})
            meta[pid] = {"flag": "ambiguous", "sig": 4.0, "note": "the open (measured) symbol is not visible here; it is taken as hidden under the filled slender-body symbol at the same Mach number and read at that symbol's centre",
                         "alternatives": "measured point not plotted at this Mach number"}
        elif pid in WEAK:
            meta[pid] = {"flag": "ambiguous", "sig": 4.0, "note": "open symbol merged with filled slender-body symbols, the theory curves and the right frame; centre from the visible parts; weak"}
        else:
            m = float(pid.split("_M")[1])
            meta[pid] = {"flag": "ok", "sig": 1.5, "note": ""}
            if m in (1.2, 1.3, 1.83, 2.2):
                meta[pid]["note"] = "a filled slender-body symbol is nearby but separate"
        sh = pid.split("_")[1]; m = pid.split("_M")[1]
        beta = {"circle": "3", "square": "5", "diamond": "10"}[sh]
        meta[pid].update({"series": "Measured data (open %s)" % sh, "configuration": "beta = %s deg; l/dm = %s" % (beta, {"top": "0.6", "mid": "0.8", "bot": "1.0"}[pn]),
                          "x_override": m})
        src = "M 1.3 and below from ref. 1 (TM X-1960) per the text p. 11; " if float(m) <= 1.3 else ""
        meta[pid]["note"] = "jet off (caption); " + src + meta[pid]["note"]
    json.dump(sp, open(W + "spec/f12_%s.json" % pn, "w"), indent=1)
    md = {"xdec": 2, "ydec": 4,
          "common": {"source": "TN D-6789", "item": "fig. 12, l/dm = %s panel" % {"top": "0.6", "mid": "0.8", "bot": "1.0"}[pn], "meridian": "",
                     "x_quantity": "M, free-stream Mach number (symbol placed at the tested Mach number; x is the Mach number as given, not read)",
                     "y_quantity": "C_D,beta, boattail pressure-drag coefficient (boattail external pressure drag on projected area Am to Ab, based on maximum cross-section Am; phi = 0 orifices; text p. 8)",
                     "page": "35"},
          "points": meta}
    for k, v in md["points"].items():
        v["mach"] = v["x_override"]
    json.dump(md, open(W + "meta/f12_%s.json" % pn, "w"), indent=1)
print("ok")
