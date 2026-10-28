"""Write the figure CSVs from the converted centre readings (work/*_vals.csv).

usage: python3 -I build_figs.py Bdir
Each figure row below names the reading id, then its classification.
Values are the local-calibration readings (loc_X, loc_Y) from pxmap.py,
given to 4 decimals; the reading error in px is converted in eX/eY and
written into the note.
"""
import csv
import os
import sys

B = sys.argv[1]
W = os.path.join(B, "work")


def load(name):
    d = {}
    for r in csv.DictReader(open(os.path.join(W, name + ".csv"))):
        d[r["id"]] = r
    return d


COLS = ["source", "item", "model", "mach", "reynolds", "position", "position_quantity", "location",
        "value", "value_quantity", "alternatives", "flag", "page", "note"]


def write(fname, rows):
    with open(os.path.join(B, fname), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=COLS)
        w.writeheader()
        w.writerows(rows)
    from collections import Counter
    print(fname, len(rows), "rows", dict(Counter(r["location"] for r in rows)),
          dict(Counter(r["flag"] for r in rows)))


def pt(v, rid):
    r = v[rid]
    return r["loc_X"], r["loc_Y"], r["eX"], r["eY"], r["px"], r["py"]


# ---------------- TN 4300 figure 7 ----------------
v = load("f7_vals")
v.update(load("f7_extra_vals"))
MD = "4-in. diameter flat face, model D (present tests, 27- by 27-in. jet)"
UN = "4-in. diameter flat face model, Langley Unitary Plan wind tunnel"
R3 = "3-in. diameter flat face, ref. 3 figure 4"
cls = {
    "solid": (MD, "2.00", "14 x 10^6", "solid circle: low-range differential cells, one side of the main ray (text)"),
    "open": (MD, "2.00", "14 x 10^6", "open circle: total-pressure instruments of higher range, other side of the main ray (text)"),
    "square": (UN, "2.49", "2.7 x 10^6", "square (legend shows a plain square and a square with a tail; tail not resolvable here)"),
    "diamond": (R3, "2.01", "", "diamond"),
    "unk": ("unclear", "", "", "mark not matched to a legend symbol"),
}
f7 = [
    ("c00", "unk", "untraced", "", "small closed loop in the top-left plot corner at x/r = 0, p_l/p_o = 1.00, half hidden by the axes; smaller than the legend symbols; may be a symbol (open circle?) or a drafting mark at the start of the fairing"),
    ("c01", "square", "ambiguous", "", "two squares overlap at x/r = 0.127 (upper of the pair); centre from the visible top and side strokes"),
    ("c02", "square", "ambiguous", "", "two squares overlap at x/r = 0.127 (lower of the pair); dashed fairing crosses it"),
    ("c03", "open", "ambiguous", "", "open circle partly hidden by the solid circle below and the top frame line; centre from its upper arc"),
    ("c04", "solid", "ok", "", ""),
    ("c05", "diamond", "ok", "", "touches the solid circle at x/r = 0.25"),
    ("c06", "diamond", "ok", "", ""),
    ("c07", "diamond", "ok", "", ""),
    ("c08", "diamond", "ok", "", ""),
    ("c09", "diamond", "ok", "", ""),
    ("c10", "solid", "ok", "", "an open circle (above) and a square (below) are partly covered by this solid symbol"),
    ("c11b", "open", "ambiguous", "0.9790", "open circle mostly covered by the solid circle; only its top arc is visible, centre taken one symbol radius below the arc top; template fit gave 0.9790"),
    ("c12b", "square", "ambiguous", "0.9757", "square mostly covered by the solid circle; only its sides and flat bottom are visible; centre taken half a symbol height above the bottom edge; template fit gave 0.9757"),
    ("c13", "diamond", "ok", "", ""),
    ("c14", "diamond", "ok", "", ""),
    ("c15", "diamond", "ok", "", "template scan scored it as a circle, but the strokes show left and right corners: diamond"),
    ("c16", "open", "ambiguous", "same value, other model: 3-in. ref. 3 diamond (M = 2.01)", "open symbol touching the solid circle at x/r = 0.75; outline between a circle and a diamond (template scores 0.42 ring, 0.40 diamond); alternative model: 3-in. ref. 3 (diamond, M = 2.01)"),
    ("c17", "solid", "ok", "", ""),
    ("c18", "diamond", "ok", "", ""),
    ("c19", "diamond", "ok", "", ""),
    ("c20", "open", "ok", "", ""),
    ("c21", "solid", "ok", "", ""),
    ("c22", "square", "ambiguous", "", "square partly covered by the solid circle above it"),
    ("c23", "square", "ok", "", ""),
    ("c24", "square", "ok", "", "upper of two squares at x/r = 0.924"),
    ("c25", "square", "ok", "", "lower of two squares at x/r = 0.924"),
    ("c26", "open", "ok", "", ""),
    ("c27", "solid", "ok", "", ""),
    ("c29", "solid", "ambiguous", "0.7900", "two solid circles at x/r = 0.96 (y = 0.7900 and 0.7802) lie where the rising velocity fairing crosses the falling pressure fairing; by following the drawn fairings the lower one (0.7802) is on the pressure curve and the upper one (0.7900) on the velocity curve (not read as pressure); alternative: the pressure point is the upper one, 0.7900"),
    ("c30", "open", "ambiguous", "", "open circle partly covered by the solid circle at x/r = 0.98"),
    ("c31", "solid", "ok", "", "overlaps the open circle above it"),
    ("c32", "square", "ambiguous", "", "square touching the solid circle above it and a fairing"),
    ("c33", "square", "ok", "", "a fairing runs along its right side"),
    ("c34", "square", "ok", "", "a fairing runs along its right side"),
]
rows = []
for rid, k, flag, alt, note in f7:
    x, y, ex, ey, px, py = pt(v, rid)
    model, mach, re_, sym = cls[k]
    n = [sym]
    if note:
        n.append(note)
    if re_:
        n.append("Reynolds number per foot from the text (p. 11), not from the figure")
    n.append("centre px (%s, %s) on the 300-dpi page; reading error +-%s in x/r, +-%s in p_l/p_o" % (px, py, ex, ey))
    if k in ("solid", "open"):
        n.append("model D was tested in the 27- by 27-in. jet (table I)")
    rows.append({"source": "TN 4300", "item": "fig. 7", "model": model, "mach": mach, "reynolds": re_,
                 "position": x, "position_quantity": "x/r (distance along the front face from the centre line over model radius), as the axis states",
                 "location": "face", "value": y,
                 "value_quantity": "p_l/p_o (right-hand axis; local static pressure over stagnation-point pressure; text calls it a fraction of the total pressure behind the shock)",
                 "alternatives": alt, "flag": flag, "page": 31, "note": "; ".join(n)})
write("tn4300_fig7.csv", rows)

# ---------------- TN 4300 figure 16 ----------------
va = load("f16a_vals")
va.update(load("f16a_extra_vals"))
vb = load("f16b_vals")
RUN = {"ring": ("run 1", "open circle"), "dia": ("run 2", "diamond"), "tri": ("run 3", "triangle")}
a = [
    ("a_box25", None, "untraced", "", "small square mark on the faired 4-in. data curve near the top frame; the legend has no square; read as plotted"),
    ("a050_dia", "dia", "ambiguous", "", "touches the top frame and overlaps the circle below"),
    ("a050_ring", "ring", "ambiguous", "", "overlaps the diamond above"),
    ("a050_tri", "tri", "ok", "0.9976 (vertex centroid)", "triangle plotted about 0.05 in x/r to the right of the circle and diamond"),
    ("a075_triA", "tri", "ambiguous", "0.9824 (vertex centroid)", "cluster of six overlapping outlines at x/r about 0.75; upper-left triangle"),
    ("a075_ringA", "ring", "ambiguous", "", "cluster at x/r 0.75; upper of two stacked circles"),
    ("a075_ringB", "ring", "ambiguous", "", "cluster at x/r 0.75; lower of two stacked circles"),
    ("a075_diaA", "dia", "ambiguous", "0.9661", "cluster at x/r 0.75; after removing this diamond a second, weaker diamond-like outline remained 6 px lower (0.9661); it may be a second diamond or the edges of the neighbouring triangle"),
    ("a075_triB", "tri", "ambiguous", "0.9545 (vertex centroid)", "cluster at x/r 0.75; lower-right triangle"),
    ("a086_dia", "dia", "ok", "", ""),
    ("a086_tri", "tri", "ambiguous", "0.9184 (vertex centroid)", "overlaps the circle below"),
    ("a086_ring", "ring", "ambiguous", "", "overlaps the triangle above"),
    ("a094_tri", "tri", "ambiguous", "0.8633 (vertex centroid)", "overlaps the diamond"),
    ("a094_dia", "dia", "ambiguous", "", "overlaps the triangle and the circle"),
    ("a094_ring", "ring", "ambiguous", "", "overlaps the diamond"),
    ("a098_tri", "tri", "ambiguous", "0.7509 (vertex centroid);0.7387 (second triangle-like outline lower down)", "tangle of outlines against the right frame at x/r about 0.98; the symbols cannot be separated with confidence"),
    ("a098_dia_tent", "dia", "ambiguous", "may not be a separate symbol", "tentative: a diamond outline is suggested between the triangle and the circle, against the right frame"),
    ("a098_ring", "ring", "ambiguous", "", "lower part of the tangle at x/r 0.98"),
]
rows = []
for rid, sym, flag, alt, note in a:
    x, y, ex, ey, px, py = pt(va, rid)
    if sym:
        run, sname = RUN[sym]
        model = "12-in. diameter flat face, model A, %s (%s)" % (run, sname)
        n = [sname + " = " + run + " (legend)"]
    else:
        model = "unclear"
        n = []
    if note:
        n.append(note)
    if sym == "tri":
        n.append("triangle centre taken as the centre of its bounding box; the vertex-centroid reading is given in alternatives")
    n.append("centre px (%s, %s); reading error +-%s in x/r, +-%s in p_l/p_o" % (px, py, ex, ey))
    n.append("27- by 27-in. jet (table I); Mach number from the text, not the figure")
    rows.append({"source": "TN 4300", "item": "fig. 16(a)", "model": model, "mach": "2", "reynolds": "",
                 "position": x, "position_quantity": "x/r along the main ray, as the axis states",
                 "location": "face", "value": y, "value_quantity": "p_l/p_o, as the axis states",
                 "alternatives": alt, "flag": flag, "page": 40, "note": "; ".join(n)})
b = []
for st in range(1, 6):
    for sym in ("ring", "dia", "tri"):
        b.append(("b%d_%s" % (st, sym), st, sym))
STN = {1: "station 1 (inset: on the horizontal diameter, left)", 2: "station 2 (inset: 45 deg up on the left)",
       3: "station 3 (inset: top)", 4: "station 4 (inset: 45 deg up on the right)", 5: "station 5 (inset: on the horizontal diameter, right)"}
for rid, st, sym in b:
    x, y, ex, ey, px, py = pt(vb, rid)
    run, sname = RUN[sym]
    flag, alt = "ok", ""
    n = [sname + " = " + run + " (legend)", STN[st], "x read on the station axis = %s" % x]
    if sym == "tri":
        alt = "%s (vertex centroid)" % vb[rid + "_vc"]["loc_Y"]
        n.append("triangle centre taken as the centre of its bounding box; vertex-centroid reading in alternatives")
    if st == 2 and sym in ("tri", "dia"):
        flag = "ambiguous"
        n.append("triangle and diamond overlap at station 2")
    n.append("centre px (%s, %s); reading error +-%s in p_l/p_o" % (px, py, ey))
    rows.append({"source": "TN 4300", "item": "fig. 16(b)", "model": "12-in. diameter flat face, model A, %s (%s)" % (run, sname),
                 "mach": "2", "reynolds": "", "position": str(st),
                 "position_quantity": "station number on the 75-percent radius circle (x/r = 0.75 by the caption), azimuth as the inset shows",
                 "location": "face", "value": y, "value_quantity": "p_l/p_o, as the axis states",
                 "alternatives": alt, "flag": flag, "page": 40, "note": "; ".join(n)})
write("tn4300_fig16.csv", rows)

# ---------------- RM L57C18 figure 5 ----------------
TS = {"B": [".56", "1.12", "1.78", "2.36", "2.86", "3.36", "4.36", "5.36"],
      "C": [".75", "1.50", "2.30", "2.80", "3.30", "3.80", "4.80", "5.80"],
      "D": [".87", "1.75", "1.95", "2.15", "2.65", "3.15", "3.65", "4.65", "5.65"],
      "F": [".81", "1.60", "1.95", "2.25", "2.75", "3.25", "3.75", "4.75", "5.75"]}
GEO = {"B": "model B (flat face, 1.0-in. corner radius, 6.000-in. base, 14.5 deg frustum)",
       "C": "model C (flat face, 0.4-in. corner radius, 6.000-in. base, 14.5 deg frustum)",
       "D": "model D (flat face, 0.1-in. corner radius, 6.000-in. base, 14.5 deg frustum)",
       "F": "model F (as D but the flat face recessed 0.200 in. behind a 0.1-in. radius lip)"}
LOC = {"B": ["face", "face", "corner", "unclear", "afterbody", "afterbody", "afterbody", "afterbody"],
       "C": ["face", "face", "unclear", "afterbody", "afterbody", "afterbody", "afterbody", "afterbody"],
       "D": ["face", "face", "corner", "unclear", "afterbody", "afterbody", "afterbody", "afterbody", "afterbody"],
       "F": ["face", "face", "corner", "unclear", "afterbody", "afterbody", "afterbody", "afterbody", "afterbody"]}
LOCNOTE = {("B", 1): "inset tick on the straight face just below the start of the corner arc",
           ("B", 3): "inset tick drawn at the end of the corner arc where the cone begins; corner or cone",
           ("C", 1): "inset tick on the straight face just below the start of the corner arc",
           ("C", 2): "inset tick drawn at the end of the corner arc where the cone begins; corner or cone",
           ("D", 1): "inset tick on the straight face just below the corner",
           ("D", 2): "inset tick drawn on the 0.1-in. corner arc",
           ("D", 3): "inset tick drawn at the end of the corner arc where the cone begins; corner or cone",
           ("F", 0): "on the recessed flat face",
           ("F", 1): "on the recessed flat face just inside the lip",
           ("F", 2): "inset tick drawn on the lip (0.1-in. radius)",
           ("F", 3): "inset tick drawn just behind the lip where the cone begins; lip or cone",
           ("B", 2): "inset tick on the corner arc"}
FLAG = {("B", 3): "circle overlaps the leeward (alpha = 5 deg) square",
        ("B", 4): "circle overlaps the leeward (alpha = 5 deg) square",
        ("C", 0): "circle sits between the windward triangle and the leeward square, outlines touching",
        ("D", 0): "circle sits between the windward triangle and the leeward square, outlines touching"}
PG = {"B": (23, "r023"), "C": (24, "r024"), "D": (25, "r025"), "F": (27, "r027")}
rows = []
for m in ("B", "C", "D", "F"):
    page, key = PG[m]
    vv = load(key + "_vals")
    ids = sorted(vv.keys(), key=lambda s: int(s[1:]))
    for i, rid in enumerate(ids):
        x, y, ex, ey, px, py = pt(vv, rid)
        loc = LOC[m][i]
        n = ["open circle = alpha 0 deg (legend)" if m != "F" else "open circle; figure 5(f) has no legend, model F was tested at alpha 0 deg only (table I)",
             "table II (p. 16) prints s = %s in. for this station" % TS[m][i]]
        if (m, i) in LOCNOTE:
            n.append(LOCNOTE[(m, i)])
        if loc == "afterbody":
            n.append("conical afterbody (14.5 deg frustum), not a cylinder")
        flag = "ok"
        if (m, i) in FLAG:
            flag = "ambiguous"
            n.append(FLAG[(m, i)])
        n.append("centre px (%s, %s); reading error +-%s in s, +-%s in Cp" % (px, py, ex, ey))
        n.append("Reynolds number per foot, approximate (text)")
        rows.append({"source": "RM L57C18", "item": "fig. 5(%s)" % {"B": "b", "C": "c", "D": "d", "F": "f"}[m],
                     "model": GEO[m], "mach": "2", "reynolds": "14 x 10^6",
                     "position": x, "position_quantity": "s, inches (distance along the surface from the centre line), as the axis states",
                     "location": loc, "value": y,
                     "value_quantity": "C_p, pressure coefficient (p_l - p_inf)/q_inf, as the axis states",
                     "alternatives": "", "flag": flag, "page": page, "note": "; ".join(n)})
write("rml57c18_fig5.csv", rows)

# ---------------- TM X-19 figure 5 ----------------
vt = load("t20_vals")
NOM = {"T01": "0.975", "T02": "0.925", "T03": "0.875", "T04": "0.75", "T05": "0.50", "T06": "0.25", "T07": "0.125", "T08": "0",
       "T09": "0.125", "T10": "0.25", "T11": "0.50", "T12": "0.75", "T13": "0.875", "T14": "0.925", "T15": "0.975"}
FL = {"T01": ("ok", "symbol printed faint (lighter than the rest)"),
      "T07": ("ambiguous", "circle overlaps the alpha = 7.5 deg square and the fairings near p = 1.0"),
      "T08": ("ambiguous", "circle overlaps the alpha = 7.5 deg and 15 deg symbols near p = 1.0"),
      "T09": ("ambiguous", "circle overlaps the alpha = 7.5 deg square near p = 1.0"),
      "T10": ("ambiguous", "circle overlaps the alpha = 7.5 deg square near p = 1.0")}
rows = []
for rid in sorted(vt.keys()):
    x, y, ex, ey, px, py = pt(vt, rid)
    flag, extra = FL.get(rid, ("ok", ""))
    n = ["open circle = alpha 0 deg (legend)", "positive x/r labelled Leeward, negative Windward on the axis",
         "figure 2 table gives orifices on the y = 0 line at |x| = %s x 2.00 in." % NOM[rid] if NOM[rid] != "0" else "figure 2 table: orifice 8 at x = 0, y = 0"]
    if extra:
        n.append(extra)
    n.append("centre px (%s, %s) on the page image rotated 90 deg clockwise; reading error +-%s in x/r, +-%s in p" % (px, py, ex, ey))
    n.append("R based on model diameter (symbols list); caption gives M and R")
    rows.append({"source": "TM X-19", "item": "fig. 5", "model": "4-in. diameter flat-face cylinder (steel pressure model)",
                 "mach": "2.49", "reynolds": "0.90 x 10^6",
                 "position": x, "position_quantity": "x/r across the front face (r = 2.00 in.), as the axis states",
                 "location": "face", "value": y,
                 "value_quantity": "p_l/p_t,2 (axis); caption: local pressure over the local pressure at the stagnation point at alpha 0; text: p_t,2 measured by the centre orifice at alpha 0",
                 "alternatives": "", "flag": flag, "page": 20, "note": "; ".join(n)})
write("tmx19_fig5.csv", rows)
