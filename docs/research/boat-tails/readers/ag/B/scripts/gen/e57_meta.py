import json, sys
base = sys.argv[1]
def dump(name, meta): json.dump(meta, open(base + name + ".json", "w"), indent=1)
# fig 6(a)
J6 = "jet condition not stated by the figure, its legend, caption or the text (rule 8); read because the brief names fig. 6; compared in the figure with Van Dyke's theory (ref. 9); drop if rule 8 is applied strictly"
dump("e57_f6a", {"xdec": 4, "ydec": 4,
 "common": {"source": "RM E57E06", "item": "fig. 6(a)", "mach": "1.91", "x_quantity": "1 - (r/rB)^2 (boattail station; r local radius, rB body maximum radius)",
            "y_quantity": "Cp, boattail pressure coefficient", "page": "49", "flag": "ambiguous"},
 "series_defaults": {
   "Double": {"series": "Double strut (open circle)", "configuration": "boattail angle 5.63 deg; double struts; taps in line with strut", "meridian": "0 (in line with strut)"},
   "Single": {"series": "Single strut (open square)", "configuration": "boattail angle 5.63 deg; single strut; taps in line with strut", "meridian": "0 (in line with strut)"},
   "Ref. 10": {"series": "Ref. 10 (open triangle)", "configuration": "data of ref. 10 (text p. 9: splitter-plate model of reference 10), not this report's model"},
   "unexplained small circle": {"series": "small circle not in the legend", "configuration": "unknown"}},
 "points": {
   "d1": {"note": J6}, "d2": {"note": J6 + "; circle crossed by the Cp = -0.075 grid line"},
   "d3": {"note": J6 + "; circle drawn inside a square (double and single coincide)"},
   "d4": {"note": J6 + "; circle drawn inside a square (double and single coincide)"},
   "s1": {"note": J6}, "s2": {"note": J6},
   "s3": {"note": J6 + "; square drawn around a circle (double and single coincide)"},
   "s4": {"note": J6 + "; square drawn around a circle (double and single coincide)"},
   "r1": {"note": J6 + "; ref. 10 data; triangle base on the Cp = -0.10 grid line; centre = triangle centroid"},
   "r2": {"note": J6 + "; ref. 10 data; centre = triangle centroid"},
   "r3": {"note": J6 + "; ref. 10 data; next to the dashed 'end of boattail (ref. 10)' line; centre = triangle centroid"},
   "u1": {"sig": 1.5, "note": J6 + "; a small circle (radius about 4 px, half the legend circles) at the end of the ref. 10 points beside the dashed 'end of boattail (ref. 10)' line; not explained by the legend; read as plotted",
          "alternatives": "not a data point (a drafting mark at the end of the ref. 10 boattail)"}}})
J6b = "base pressure; the lowest jet pressure ratio plotted (about 0.77), probably the no-flow (jet off) point, but the figure, legend and text do not say so (rule 8); every other point of fig. 6(b) is at a higher jet pressure ratio (jet on) and was not read"
dump("e57_f6b", {"xdec": 3, "ydec": 4,
 "common": {"source": "RM E57E06", "item": "fig. 6(b)", "mach": "1.91", "x_quantity": "Pj/P0, jet pressure ratio (jet total pressure over free-stream static pressure)",
            "y_quantity": "Cp,b, base-pressure coefficient (average of two taps diametrically opposite in plane of struts)", "page": "49", "flag": "ambiguous"},
 "series_defaults": {
   "Double": {"series": "Double strut (open circle)", "configuration": "boattail angle 5.63 deg; double struts; ratio of base area to body area 0.276", "meridian": "in plane of struts (average of two taps)"},
   "Single": {"series": "Single strut (open square)", "configuration": "boattail angle 5.63 deg; single strut; ratio of base area to body area 0.276", "meridian": "in plane of struts (average of two taps)"}},
 "points": {"bd0": {"note": J6b}, "bs0": {"note": J6b}}})
J7 = "no jet flow (caption)"
dump("e57_f7a", {"xdec": 3, "ydec": 4,
 "common": {"source": "RM E57E06", "item": "fig. 7(a)", "mach": "1.91", "x_quantity": "body station, in.",
            "y_quantity": "Cp, pressure coefficient", "page": "50"},
 "series_defaults": {
   "Behind strut": {"series": "Behind strut (open circle)", "configuration": "cylindrical afterbody (no boattail); location of instrumentation behind strut", "meridian": "0 (behind strut)"},
   "90 deg from strut": {"series": "90 deg from strut (open square)", "configuration": "cylindrical afterbody (no boattail); location of instrumentation 90 deg from strut", "meridian": "90 (from strut)"}},
 "points": {k: {"note": J7 + extra} for k, extra in [("c1", ""), ("c2", "; circle crossed by the 18.00 grid line"), ("c3", ""), ("c4", "; circle on the faired curve near Cp = 0"),
                                                       ("s1", ""), ("s2", "; square crossed by the 18.00 grid line"), ("s3", "; square crossed by the Cp = -0.02 grid line"), ("s4", "")]}})
J8 = "no jet flow (caption); boundary-layer velocity profile at the end of the cylindrical afterbody"
for part, mach, pg in (("a", "1.91", "52"), ("b", "3.12", "52")):
    pts = {}
    dump("e57_f8" + part, {"xdec": 4, "ydec": 4,
     "common": {"source": "RM E57E06", "item": "fig. 8(%s)" % part, "mach": mach, "x_quantity": "y/dB, distance from surface over body diameter",
                "y_quantity": "V/V0, ratio of local velocity to local free-stream velocity", "page": pg, "note": J8},
     "series_defaults": {
       "Behind strut": {"series": "Behind strut (open circle)", "configuration": "cylindrical afterbody; pitot rake behind strut", "meridian": "0 (behind strut)"},
       "90 deg from strut": {"series": "90 deg from strut (open square)", "configuration": "cylindrical afterbody; pitot rake 90 deg from strut", "meridian": "90 (from strut)"}},
     "points": {}})
m = json.load(open(base + "e57_f8a.json"))
for k in ("ac6", "as6", "ac7", "as7"):
    m["points"][k] = {"flag": "ambiguous", "note": J8 + "; circle and square overlap here"}
json.dump(m, open(base + "e57_f8a.json", "w"), indent=1)
# fig 14
J14 = "jet off (caption); boattail angle 5.63 deg; the figure does not say which model (basic, rocket or tail-interference) each point comes from"
ser = {}
for code, name in (("1.11", "circle"), ("1.40", "square"), ("1.67", "diamond"), ("1.67 (45 deg bevel)", "inverted triangle"), ("2.00", "triangle")):
    for side, mer, desc in (("open", "0 (behind strut)", "open symbols: data taken behind struts"), ("solid", "90 (from strut)", "solid symbols: data taken 90 deg from struts")):
        ser[code + " " + side] = {"series": "db/dj = %s (%s %s)" % (code, side, name), "configuration": "boattail angle 5.63 deg; db/dj = %s; %s" % (code, desc), "meridian": mer}
ser["1.67 (45 deg bevel)"] = ser["1.67 (45 deg bevel) open"]
ser["1.11"] = ser["1.11 open"]; ser["1.40"] = ser["1.40 open"]; ser["1.67"] = ser["1.67 open"]; ser["2.00"] = ser["2.00 open"]
amb = lambda n, sig=1.5, alt=None: dict({"flag": "ambiguous", "sig": sig, "note": J14 + "; " + n}, **({"alternatives": alt} if alt else {}))
ok = lambda n="", sig=1.0: {"sig": sig, "note": J14 + (("; " + n) if n else "")}
TRI = "centre = triangle centroid"
pa = {
 "a01": amb("four symbols overlap at x about 0.05 (circle, diamond, triangle, inverted triangle)"), "a02": amb("four symbols overlap at x about 0.05"),
 "a03": amb("four symbols overlap at x about 0.05; base merged with the inverted triangle's top and the theory line; " + TRI, 2.0),
 "a04": amb("four symbols overlap at x about 0.05; top edge merged with the triangle's base; " + TRI, 2.0),
 "a05": ok(TRI), "a06": ok("touches the circle; " + TRI), "a07": ok("touches the triangle"), "a08": ok(TRI), "a09": ok(),
 "a10": ok(TRI), "a11": amb("stack of open squares: horizontal edges at about 1319, 1323, 1329, 1343, 1347 and 1353 px read as three squares (centre = mean of a top and a bottom edge 22 to 24 px apart)", 3.0, "two squares only"),
 "a12": amb("stack of open squares (see a11)", 3.0, "not a separate square"), "a13": amb("stack of open squares (see a11); bottom edge merged with the Cp = -0.08 grid line", 3.0),
 "a14": ok(TRI), "a15": amb("triangle overlapping an inverted triangle; " + TRI), "a16": amb("inverted triangle overlapping a triangle; " + TRI),
 "a17": amb("triangle overlapping a diamond; " + TRI), "a18": amb("diamond overlapping a triangle"), "a19": ok(TRI),
 "a20": amb("cluster of inverted triangles and a diamond; " + TRI), "a21": amb("cluster of inverted triangles and a diamond; " + TRI, 2.0),
 "a22": amb("partly hidden symbol in the cluster: top vertex and upper left edge read as a diamond; weak match", 3.0, "an open triangle; not a separate symbol"),
 "a23": ok("touches the cluster"), "a24": ok("crossed by grid line and the end-of-boattail line"),
 "a25": amb("two open squares overlapping 12 px apart (edges at 1252, 1264, 1276, 1287 px); centre = mid point of each square's top and bottom edge", 2.0),
 "a26": amb("two open squares overlapping (see a25)", 2.0), "a27": ok(),
 "a28": amb("cluster of open squares on the Cp = 0 line; centre from edges", 3.0), "a29": amb("cluster of open squares; centre from edges", 2.5),
 "a30": amb("cluster of open squares on the Cp = 0 line; walls doubled, a second square may hide here", 3.0), "a31": amb("cluster of open squares; walls doubled (two squares offset 3 to 4 px may be here)", 3.0, "two coincident squares"),
 "a32": amb("cluster of open squares on the Cp = 0 line; centre from edges", 3.0), "a33": amb("square at the edge of the cluster; centre from edges", 2.0),
 "a34": ok(), "a35": ok("crossed by the end-of-boattail line"), "a36": ok(), "a37": ok(), "a38": ok("crossed by the end-of-boattail line")}
BL = "filled squares merge into one blob; centre from the blob's outer edges (outer square size about 25 px); further squares may be hidden inside the blob"
pb = {
 "b01": ok("touches the diamond"), "b02": ok("touches square and circle"), "b03": ok(),
 "b04": amb("blob 50 px tall of filled squares read as two squares (top and bottom); " + BL, 3.0, "a third square between them"),
 "b05": amb("blob of filled squares (see b04); bottom just above the Cp = -0.16 frame line", 3.0),
 "b06": ok(TRI), "b07": ok("touches the circle; " + TRI), "b08": ok("touches triangle and diamond"), "b09": ok(), "b10": ok("touches the square blob; " + TRI),
 "b11": amb("blob 54 px tall of filled squares read as two squares; " + BL, 3.0, "a third square between them"), "b12": amb("blob of filled squares (see b11)", 3.0),
 "b13": ok(TRI), "b14": ok(TRI), "b15": ok(TRI), "b16": ok(), "b17": ok("crossed by grid lines"), "b18": ok(),
 "b19": amb("blob 71 px tall of filled squares: upper right square (from the column extent at the right edge); " + BL, 3.0),
 "b20": amb("same blob: left square (from the column extent at the left edge)", 3.0), "b21": amb("same blob: bottom square; a fourth square may be hidden between", 3.0),
 "b22": ok("touches the square blob"),
 "b23": amb("blob of filled squares at x about 0.63: left square; " + BL, 3.0), "b24": amb("same blob: upper right square", 3.0), "b25": amb("same blob: lower right square", 3.0),
 "b26": amb("blob of filled squares at x about 0.67: upper left square; " + BL, 3.0), "b27": amb("same blob: middle square (from the right column's top)", 3.0), "b28": amb("same blob: bottom square", 3.0),
 "b29": ok(), "b30": ok(), "b31": ok(), "b32": ok(), "b33": ok(), "b34": ok("highest point of the panel")}
pc = {
 "c01": amb("filled circle on top of an open triangle and a filled triangle"), "c02": amb("open triangle mostly hidden by the filled circle and the filled triangle; weak match; " + TRI, 3.0, "an open diamond"),
 "c03": amb("filled triangle under the open symbols, base near the theory line; " + TRI, 2.0),
 "c04": ok(TRI), "c05": ok(TRI), "c06": ok(TRI), "c07": ok("open circle touching the open diamond"),
 "c08": amb("open diamond, lower half hidden by the filled circle", 2.5), "c09": amb("filled circle over the open diamond's lower half"),
 "c10": ok(TRI), "c11": ok(), "c12": ok(TRI), "c13": ok(TRI),
 "c14": amb("open square overlapped by the open triangle; centre from its left side, top edge and right side; bottom on the Cp = -0.04 grid line", 2.0),
 "c15": amb("open triangle overlapping the open square; " + TRI), "c16": ok(TRI), "c17": ok(TRI), "c18": ok(TRI),
 "c19": amb("open triangle overlapping an open diamond; " + TRI), "c20": amb("open diamond overlapping an open triangle"),
 "c21": amb("filled triangle merged with a filled diamond; centre from apex (2534 px), base (about 2561 px) and base ends; " + TRI, 2.0),
 "c22": amb("filled diamond merged with the filled triangle; centre from its bottom and right vertices", 2.5),
 "c23": amb("row of open and filled diamonds overlapping"), "c24": amb("row of open and filled diamonds overlapping"),
 "c25": amb("row of open and filled diamonds overlapping"), "c26": amb("row of open and filled diamonds overlapping"),
 "c27": amb("open diamond mostly hidden by a filled diamond; weak match", 3.0), "c28": amb("filled diamond over an open diamond", 2.0),
 "c29": amb("row of open and filled diamonds overlapping"), "c30": amb("row of open and filled diamonds overlapping", 2.0),
 "c31": ok("open square above the diamonds"), "c32": ok("two open squares side by side"), "c33": ok("two open squares side by side"),
 "c34": amb("open square partly hidden by the filled circle; centre from left side, top and bottom edges", 2.0),
 "c35": amb("filled circle over two open squares; centre from its left, right and bottom edges", 2.0),
 "c36": amb("open square partly hidden by the filled circle; centre from right side, top and bottom edges", 1.5),
 "c37": amb("filled circle over an open circle"), "c38": amb("open circle, top hidden by the filled circle"),
 "c39": amb("two filled circles merged with each other and with open circles; centre from top, bottom and left edges", 2.5), "c40": amb("open circle under filled circles"),
 "c41": amb("filled circle merged with another; centre from its top arc and right edge", 2.5), "c42": amb("open circle under filled circles, crossed by the end-of-boattail line", 2.0),
 "c43": amb("open circle, lower part hidden by a filled circle", 2.0), "c44": amb("filled circle inside the open circle's lower part", 1.5)}
for part, mach, pts, item in (("a", "1.91", pa, "fig. 14(a)"), ("b", "1.91", pb, "fig. 14(b)"), ("c", "3.12", pc, "fig. 14(c)")):
    dump("e57_f14" + part, {"xdec": 4, "ydec": 4,
      "common": {"source": "RM E57E06", "item": item, "mach": mach, "x_quantity": "1 - (r/rB)^2 (boattail station; r local radius, rB body maximum radius)",
                 "y_quantity": "Cp,a, boattail pressure coefficient", "page": "60"},
      "series_defaults": ser, "points": pts})
print("ok")
