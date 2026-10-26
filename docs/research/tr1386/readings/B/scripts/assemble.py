"""Assemble reader B CSV files from fitted symbol centres and axis calibrations.

usage: python3 -I assemble.py
Reads calib/fit_*.json and calib/pts_*.csv; writes readerB_pressures.csv, readerB_drag.csv,
readerB_geometry.csv, readerB_calibration.csv in the B folder.
All pixel coordinates are in the 400 dpi page renders (work/p400-XX.png).
"""
import csv
import json
import math
import os

B = "/tmp/claude-0/-home-user-bowshock/dd60fc51-836c-5183-86f3-15ab54467394/scratchpad/tr1386/B"
R = "B"
DPI = 400

FITS = {}
for fn in os.listdir(f"{B}/calib"):
    if fn.startswith("fit_") and fn.endswith(".json"):
        FITS.update(json.load(open(f"{B}/calib/{fn}")))

RE_BASIS = ("model length (p. 6 symbol list: 'free-stream Reynolds number based on body length'; "
            "p. 8: 'average Reynolds number (based on model length)')")


def half_ext(shape, s):
    r3 = math.sqrt(3)
    if shape in ("triangle", "dtriangle"):
        return r3 * s, 1.5 * s
    if shape in ("rtriangle", "ltriangle"):
        return 1.5 * s, r3 * s
    return s, s


def conv(key, x, y):
    f = FITS[key]
    return f["a"] * x + f["b"] * y + f["c"]


def unc(key, ux, uy):
    f = FITS[key]
    return math.sqrt((f["a"] * ux) ** 2 + (f["b"] * uy) ** 2 + f["rms"] ** 2)


def sym_unc(key, shape, s, k=1.0, extra_px=0.0):
    hx, hy = half_ext(shape, s)
    return unc(key, k * hx + extra_px, k * hy + extra_px)


def r4(v):
    return f"{v:.4f}"


def r3(v):
    return f"{v:.3f}"


SHAPE_WORD = {"circle": "circle", "square": "square", "diamond": "diamond", "triangle": "triangle (apex up)",
              "rtriangle": "triangle (apex right)", "rtri_br": "right triangle", "rtri_tl": "right triangle",
              "qround": "square with one rounded corner", "dshape": "D shape", "octagon": "octagon"}

# --------------------------------------------------------------------------------------------
# FIGURE 4 (pressures)
# --------------------------------------------------------------------------------------------


def read_fit(path):
    return {r["id"]: r for r in csv.DictReader(open(f"{B}/digit/{path}"))}


def fig4_rows():
    rows = []
    panels = {
        "a": dict(model="4p", dD="0.30", files=["f4a_nose_fit.csv", "f4a_body_fit.csv"],
                  series={"D": ("diamond", "3.10"), "S": ("square", "1.97"), "C": ("circle", "1.50")},
                  st_label="(not printed on panel a; panel b prints: Distance from the nose, X/L)",
                  ykey=lambda M: f"10|4|a|y (M={M} scale)", xkey="10|4|a|x"),
        "b": dict(model="5p", dD="0.50", files=["f4b_fit.csv"],
                  series={"D": ("diamond", "3.06"), "S": ("square", "1.97"), "C": ("circle", "1.54")},
                  st_label="Distance from the nose, X/L",
                  ykey=lambda M: f"10|4|b|y (M={M} scale)", xkey="10|4|b|x"),
        "c": dict(model="6p", dD="1.00", files=["f4c_fit.csv"],
                  series={"D": ("diamond", "3.80"), "S": ("square", "3.04"), "C": ("circle", "1.97")},
                  st_label="Distance from the nose, X/D",
                  ykey=lambda M: "10|4|c|y", xkey="10|4|c|x"),
    }
    # corrections and judgement calls made after visual checks
    corrections = {("a", "D02"): (625.0, 707.5, 11.75)}
    for pan, P in panels.items():
        pts = {}
        for fn in P["files"]:
            pts.update(read_fit(fn))
        # all symbol centres in the panel for overlap detection
        allp = []
        for pid, r in pts.items():
            x, y, s = float(r["xfit"]), float(r["yfit"]), float(r["size"])
            if (pan, pid) in corrections:
                x, y, s = corrections[(pan, pid)]
            allp.append((pid, r["shape"], x, y, s, float(r["score"])))
        for pid, shape, x, y, s, score in sorted(allp, key=lambda t: (t[0][0], t[2])):
            sym, M = P["series"][pid[0]]
            ykey = P["ykey"](M)
            flags, notes = [], []
            # overlap with any other symbol in the same panel (outlines touching or crossing)
            close = []
            for q in allp:
                if q[0] == pid:
                    continue
                hx1, hy1 = half_ext(shape, s)
                hx2, hy2 = half_ext(q[1], q[4])
                if abs(q[2] - x) < (hx1 + hx2) * 0.95 and abs(q[3] - y) < (hy1 + hy2) * 0.95:
                    close.append(q[0])
            k = 1.0
            if close:
                flags.append("OVERLAP")
                k = 2.0
                notes.append("outline touches or overlaps symbol(s) " + "/".join(close) +
                             " of this panel (ids are reader B working ids); centre fixed by template fit")
            if score < 0.75:
                notes.append(f"template match score {score:.2f} (curve lines cross the symbol)")
            if pan == "a":
                flags.append("AXIS")
                notes.append("panel (a) prints no x tick labels or x axis title; x scale taken from the "
                             "labelled ticks of panel (b) directly below (same grid spacing)")
            if pan == "c" and M == "3.80":
                flags.append("DISAGREE")
                notes.append("figure 4(c) prints M=3.80; text p. 8 says the pressure-distribution tests were made "
                             "'at Mach numbers of 1.5, 2, 3, and 3.7'; text p. 10 says 'between 1.5 and 3.8'")
            xs = conv(P["xkey"], x, y)
            cp = conv(ykey, x, y)
            xu = sym_unc(P["xkey"], shape, s, k)
            cu = sym_unc(ykey, shape, s, k)
            zero_note = ""
            if pan in ("a", "b"):
                zero_note = (f"read against the M={M} scale (one of three side-by-side y scales; its zero is the "
                             f"'0' in the label column marked M={M} at the foot, on a drawn grid line)")
            note = "; ".join(([zero_note] if zero_note else []) + notes +
                             [f"pixel centre ({x:.1f},{y:.1f}) at 400 dpi, id {pid}"])
            rows.append([R, "4", pan, P["model"], P["dD"], M, "4000000", RE_BASIS,
                         f"{SHAPE_WORD[shape]}, M={M}", P["st_label"], r4(xs), r4(xu), r4(cp), r4(cu),
                         "symbol", ";".join(flags),
                         "Reynolds number not printed on figure 4; text p. 8: 'at an average Reynolds number of "
                         "about 4x10^6'; " + note])
    return rows


# --------------------------------------------------------------------------------------------
# DRAG rows
# --------------------------------------------------------------------------------------------
DRAG = []


def drow(part, fig, panel, model, dD, key_text, moe, qlabel, q, qu, xlabel, x, xu, mach, re, basis, kind, flags,
         note):
    DRAG.append([R, part, fig, panel, model, dD, key_text, moe, qlabel, q, qu, xlabel, x, xu, mach, re, basis,
                 kind, ";".join(f for f in flags if f), note])


def sym_point(part, fig, panel, model, dD, key_text, moe, qlabel, xlabel, xkey, ykey, shape, px, py, s, mach, re,
              basis, flags, note, k=1.0, xfmt=r4):
    q = conv(ykey, px, py)
    x = conv(xkey, px, py)
    qu = sym_unc(ykey, shape, s, k)
    xu = sym_unc(xkey, shape, s, k)
    note = (note + "; " if note else "") + f"pixel centre ({px:.1f},{py:.1f}) at 400 dpi"
    drow(part, fig, panel, model, dD, key_text, moe, qlabel, r4(q), r4(qu), xlabel, xfmt(x), xfmt(xu), mach, re,
         basis, "symbol", flags, note)


MODEL_NOTE = {
    "0.075": "model number not printed on this figure; figure 1(a) table gives model 2 (wind tunnel) and 2f (free flight) for d/D=.075",
    "0.15": "model number not printed on this figure; figure 1(a) table gives model 3 (wind tunnel) and 3f (free flight) for d/D=.150",
    "0.30": "model number not printed on this figure; figure 1(a) table gives model 4 (wind tunnel), 4f (free flight) and 4p (pressure) for d/D=.300",
    "0.50": "model number not printed on this figure; figure 1(a) table gives model 5 (wind tunnel), 5f (free flight) and 5p (pressure) for d/D=.500",
}
MODEL_NOTE_B = {
    "0.075": "model number not printed on figure 10; figure 1(b) table gives model 7 for d/D=.075 (L/D 2.81)",
    "0.15": "model number not printed on figure 10; figure 1(b) table gives model 8 for d/D=.150 (L/D 2.62)",
    "0.30": "model number not printed on figure 10; figure 1(b) table gives model 9 for d/D=.300 (L/D 2.24)",
}

# ---------------- Figure 8 ----------------
F8_PANELS = {
    "1.24": dict(re="2420000", rekey="M=1.24"),
    "1.44": dict(re="", rekey="M=1.44"),
    "1.96": dict(re="4140000", rekey="M=1.96"),
    "3.06": dict(re="4000000", rekey="M=3.06"),
    "3.67": dict(re="3450000", rekey="M=3.67"),
}
F8Q = "Foredrag coefficient, C_DF"
F8X = "Bluntness, d/D"


def f8keys(M):
    return f"14|8||x (M={M} panel)", f"14|8||y (M={M} panel)"


def fig8_rows():
    # Part A: squares, key 'Wave drag (press. distr. models)'
    sq = [
        ("1.96", 2381.5, 1473.5, 8.25, "0.30", ["OVERLAP", "DISAGREE"],
         "square lies almost on top of the foredrag circle at d/D=.3 (circle centre 2384.5,1473.0); joint fit "
         "of both outlines used; alternative if the circle is drawn over the square: square centre (2385.0,1472.0); "
         "figure 4(a) gives the model 4p pressure test at M=1.97, this panel prints M=1.96", 2.0),
        ("1.96", 2625.5, 1369.5, 8.25, "0.50", ["DISAGREE"],
         "square just below the foredrag circle at d/D=.5, outlines touch; figure 4(b) gives the model 5p pressure "
         "test at M=1.97, this panel prints M=1.96", 1.5),
        ("3.06", 3180.5, 1112.5, 8.25, "0.30", ["OVERLAP", "DISAGREE"],
         "square partly hidden under the foredrag circle at d/D=.3 (circle 3183.5,1103.0); joint occlusion fit; "
         "alternative stacking (square on top) gives square centre (3180.5,1112.5) and circle (3184.0,1102.5), "
         "same value; figure 4(a) gives the model 4p pressure test at M=3.10, this panel prints M=3.06", 2.0),
        ("3.06", 3426.5, 978.5, 8.25, "0.50", ["OVERLAP"],
         "square just below the foredrag circle at d/D=.5 (circle 3428.0,963.0), outlines overlap and a curve "
         "crosses; joint fit; both stacking orders give the same centres", 2.0),
    ]
    for M, px, py, s, dD, flags, note, k in sq:
        xk, yk = f8keys(M)
        model_note = ("model number not printed; figure 1(a) and the figure 8 key ('press. distr. models') point to "
                      + ("model 4p (d/D=.300)" if dD == "0.30" else "model 5p (d/D=.500)"))
        sym_point("A", "8", "", "", dD, "Wave drag (press. distr. models)", "measured", F8Q, F8X, xk, yk,
                  "square", px, py, s, M, F8_PANELS[M]["re"], RE_BASIS, flags + ["OTHER"],
                  note + "; " + model_note + "; Reynolds number as printed on the panel (text p. 8 gives about "
                  "4x10^6 for the pressure tests); d_over_D column is the nominal d/D of the bluntness station, the "
                  "x column is the read position", k)
    # Part B: circles 'Foredrag', d/D > 0
    circ = [
        ("1.24", "0.075", 2105.0, 740.0, 8.5, [], "", 1.0, None),
        ("1.24", "0.15", 2194.5, 735.5, 8.75, [], "", 1.0, None),
        ("1.24", "0.30", 2380.5, 715.5, 8.5, [], "", 1.0, None),
        ("1.24", "0.50", 2625.0, 642.0, 8.5, [], "", 1.0, None),
        ("1.44", "0.075", 2105.0, 1115.0, 8.5, [], "flagged symbol (short tick at upper right), so Re=1.17x10^6 by the "
         "key; only one circle is visible at this d/D, a 3.14x10^6 point may coincide with it or is not plotted",
         1.0, "1170000"),
        ("1.44", "0.15", 2197.0, 1114.0, 8.75, ["OVERLAP"], "flagged symbol (tick at upper right), so Re=1.17x10^6; "
         "joint fit suggests a second circle almost on top, see next row", 2.0, "1170000"),
        ("1.44", "0.15", 2193.5, 1115.5, 8.75, ["OVERLAP", "SERIES"], "possible second circle hidden under the "
         "flagged one (joint two-circle fit scores better than one circle); if real it is presumably the "
         "Re=3.14x10^6 point; alternative: no second point", 2.0, ""),
        ("1.44", "0.30", 2382.5, 1092.5, 8.75, ["OVERLAP", "SERIES"], "upper of two touching circles; cannot tell "
         "which of the two carries the flag tick, so Re is 1.17x10^6 or 3.14x10^6", 2.0, ""),
        ("1.44", "0.30", 2381.5, 1101.5, 8.75, ["OVERLAP", "SERIES"], "lower of two touching circles (joint fit); "
         "cannot tell which carries the flag tick, so Re is 1.17x10^6 or 3.14x10^6", 2.0, ""),
        ("1.44", "0.50", 2626.5, 1000.5, 8.5, ["OVERLAP"], "upper of two touching circles, no flag, so "
         "Re=3.14x10^6", 1.5, "3140000"),
        ("1.44", "0.50", 2626.5, 1019.0, 8.75, ["OVERLAP"], "lower of two touching circles, carries the flag tick, "
         "so Re=1.17x10^6", 1.5, "1170000"),
        ("1.96", "0.075", 2106.5, 1513.0, 8.75, [], "", 1.0, None),
        ("1.96", "0.15", 2199.5, 1504.5, 8.75, [], "", 1.0, None),
        ("1.96", "0.30", 2384.5, 1473.0, 8.75, ["OVERLAP"], "the wave drag square (Part A) lies almost on top; joint "
         "fit", 2.0, None),
        ("1.96", "0.50", 2628.0, 1356.0, 8.5, [], "wave drag square touches from below", 1.0, None),
        ("3.06", "0.075", 2903.5, 1153.5, 8.75, ["OVERLAP"], "two circles almost coincide at this d/D (joint fit); "
         "this is the upper one; alternative: a single circle at (2903.5,1154.0)", 2.0, None),
        ("3.06", "0.075", 2905.0, 1157.5, 8.75, ["OVERLAP"], "lower of two almost coincident circles (joint fit); "
         "alternative: a single circle at (2903.5,1154.0)", 2.0, None),
        ("3.06", "0.15", 2997.0, 1151.0, 9.5, [], "outline slightly wider than one circle; a second almost "
         "coincident circle at about (2997.5,1148.5) is possible but not clear", 1.5, None),
        ("3.06", "0.30", 3183.5, 1103.0, 8.75, ["OVERLAP"], "wave drag square partly under it; joint fit", 1.5, None),
        ("3.06", "0.50", 3428.0, 963.0, 8.5, ["OVERLAP"], "wave drag square touches from below and curves cross; "
         "joint fit", 1.5, None),
        ("3.67", "0.075", 2905.5, 1527.0, 8.75, [], "", 1.0, None),
        ("3.67", "0.15", 2998.5, 1525.5, 8.75, [], "", 1.0, None),
        ("3.67", "0.30", 3184.0, 1480.0, 8.5, [], "", 1.0, None),
        ("3.67", "0.50", 3427.5, 1336.5, 8.75, [], "circle reaches close to the top frame of the panel; curves "
         "cross it", 1.0, None),
    ]
    for M, dD, px, py, s, flags, note, k, re in circ:
        xk, yk = f8keys(M)
        if re is None:
            re = F8_PANELS[M]["re"]
        nn = [note] if note else []
        if M == "1.44":
            nn.append("panel prints 'Re=1.17x10^6 & 3.14x10^6'; key: 'Flagged symbols denote Re=1.17x10^6'")
        nn.append(MODEL_NOTE[dD])
        nn.append("d_over_D column is the nominal bluntness station; x column is the read position")
        fl = list(flags) + ["OTHER"]
        if M == "1.44" and re == "":
            pass
        sym_point("B", "8", "", "", dD, "Foredrag", "measured", F8Q, F8X, xk, yk, "circle", px, py, s, M, re,
                  RE_BASIS, fl, "; ".join(nn), k)


# ---------------- Figure 7 ----------------
F7A_M = [(1.24, "2420000"), (1.44, "3140000"), (1.96, "4140000"), (3.06, "4000000"), (3.67, "3450000")]


def nominal(Mread):
    return min(F7A_M, key=lambda t: abs(t[0] - Mread))


def fig7_rows():
    xk = "14|7|a|x"
    sers = {
        "0.50": ("rtri_br", "y (d/D=.50 scale)", "d/D=.500 (right-triangle symbol)"),
        "0.30": ("triangle", "y (d/D=.30 scale)", "d/D=.300 (triangle symbol)"),
        "0.15": ("diamond", "y (d/D=.15 scale)", "d/D=.150 (diamond symbol)"),
        "0.075": ("square", "y (d/D=.075 scale)", "d/D=.075 (square symbol)"),
    }
    pts = [
        ("0.50", 691.0, 695.0, 8.5, [], "", 1.0),
        ("0.50", 774.0, 683.0, 8.5, [], "", 1.0),
        ("0.50", 985.0, 663.0, 8.25, ["OVERLAP"], "two overlapping symbols at this Mach number; this is the lower "
         "one in the better joint fit; alternative stacking gives (985.5,663.5)", 2.0),
        ("0.50", 982.0, 657.0, 8.25, ["OVERLAP"], "upper of two overlapping symbols; alternative stacking gives "
         "(983.0,656.0)", 2.0),
        ("0.50", 1433.5, 627.5, 8.0, [], "", 1.0),
        ("0.50", 1682.5, 633.5, 8.0, [], "", 1.0),
        ("0.30", 695.5, 871.0, 5.5, [], "triangle centre taken as the centroid of the outline", 1.0),
        ("0.30", 778.0, 886.0, 5.75, [], "triangle centre taken as the centroid of the outline", 1.0),
        ("0.30", 991.5, 898.0, 5.5, [], "triangle centre taken as the centroid of the outline", 1.0),
        ("0.30", 1438.5, 908.0, 5.75, [], "triangle centre taken as the centroid of the outline", 1.0),
        ("0.30", 1687.5, 907.0, 5.5, [], "triangle centre taken as the centroid of the outline", 1.0),
        ("0.15", 695.0, 976.0, 11.75, ["OVERLAP"], "outline looks doubled; joint fit gives two diamonds 3.5 px apart, "
         "this is the upper; alternative: a single diamond at (695,976)", 2.0),
        ("0.15", 695.0, 979.5, 11.75, ["OVERLAP"], "lower of two nearly coincident diamonds; alternative: no "
         "second symbol", 2.0),
        ("0.15", 777.0, 992.5, 12.0, [], "", 1.0),
        ("0.15", 992.0, 1021.5, 12.0, [], "", 1.0),
        ("0.15", 1440.5, 1039.5, 11.75, ["OVERLAP"], "upper of two overlapping diamonds (joint fit)", 2.0),
        ("0.15", 1440.5, 1046.5, 11.75, ["OVERLAP"], "lower of two overlapping diamonds (joint fit)", 2.0),
        ("0.15", 1688.0, 1049.0, 11.5, [], "", 1.0),
        ("0.075", 697.0, 1066.0, 8.5, [], "", 1.0),
        ("0.075", 779.0, 1077.5, 8.25, [], "", 1.0),
        ("0.075", 992.0, 1113.5, 8.25, [], "", 1.0),
        ("0.075", 1440.0, 1125.0, 8.5, [], "", 1.0),
        ("0.075", 1688.0, 1133.0, 8.5, [], "", 1.0),
    ]
    for dD, px, py, s, flags, note, k in pts:
        shape, ys, key = sers[dD]
        yk = f"14|7|a|{ys}"
        Mread = conv(xk, px, py)
        Mn, re = nominal(Mread)
        nn = [note] if note else []
        nn.append(f"read against the {ys[3:-1]}; each d/D curve has its own y scale and its zero is the '0' in "
                  "that curve's label column, on a drawn grid line")
        nn.append(f"Mach number {Mn} is the nominal test value (text table p. 8); Re as printed at the top of "
                  "panel (a) for that Mach number")
        nn.append(MODEL_NOTE[dD])
        sym_point("B", "7", "a", "", dD, key, "measured", "Foredrag coefficient, C_DF", "Mach number, M", xk, yk,
                  shape, px, py, s, f"{Mn:.2f}", re, RE_BASIS, list(flags) + ["OTHER"], "; ".join(nn), k,
                  xfmt=r3)

    # ---- 7(b) free flight
    xk = "14|7|b|x"
    KEY = {"circle": ("Re=0.8M x 10^6, air off", ""), "diamond": ("Re=3.0 x 10^6, air on", "3000000"),
           "square": ("Re=4.0 x 10^6, air on", "4000000"), "triangle": ("Re=7.5 x 10^6, air on", "7500000")}
    f7b = []

    def add(dD, shape, px, py, s, flags=(), note="", k=1.0):
        f7b.append((dD, shape, px, py, s, list(flags), note, k))

    ov = "outlines of neighbouring air-off circles overlap; centres from a joint fit of all circles in the cluster"
    # d/D = .50 air off
    add("0.50", "circle", 747.5, 1653.0, 8.5, ["OVERLAP"], ov + "; alternative: the first three circles could be "
        "two symbols only", 2.0)
    add("0.50", "circle", 757.5, 1655.0, 8.5, ["OVERLAP"], ov, 2.0)
    add("0.50", "circle", 766.0, 1655.0, 8.5, ["OVERLAP"], ov, 2.0)
    add("0.50", "circle", 818.0, 1672.5, 8.5, ["OVERLAP"], ov, 2.0)
    add("0.50", "circle", 830.5, 1671.5, 8.5, ["OVERLAP"], ov + "; this one and the next are the least certain "
        "of the cluster", 2.0)
    add("0.50", "circle", 827.5, 1678.5, 8.5, ["OVERLAP"], ov + "; weak own outline, could be part of the "
        "neighbours", 2.0)
    add("0.50", "circle", 859.0, 1689.0, 8.5, ["OVERLAP"], ov, 2.0)
    add("0.50", "circle", 855.0, 1693.0, 8.5, ["OVERLAP"], ov, 2.0)
    add("0.50", "circle", 876.5, 1698.0, 8.5, [], "", 1.0)
    add("0.50", "circle", 896.5, 1722.5, 8.5, [], "", 1.0)
    add("0.50", "circle", 1016.0, 1790.5, 8.75, [], "outline slightly thick; one circle assumed", 1.0)
    # d/D = .50 air on
    add("0.50", "square", 1241.0, 1842.0, 8.5)
    add("0.50", "square", 1282.0, 1846.5, 8.25)
    add("0.50", "diamond", 1454.0, 1882.5, 11.75, ["OVERLAP"], "diamond, square and triangle touch in a row near "
        "M=6; joint fit", 1.5)
    add("0.50", "square", 1471.0, 1882.0, 8.5, ["OVERLAP"], "touches the diamond and triangle; joint fit", 1.5)
    add("0.50", "triangle", 1490.5, 1882.0, 5.75, ["OVERLAP"], "touches the square; triangle centre = centroid", 1.5)
    add("0.50", "square", 1595.0, 1891.5, 8.75)
    # d/D = .30 air off
    for (x, y, s) in [(768.5, 1819.5, 8.25), (799.0, 1868.0, 8.5), (821.0, 1898.0, 8.5), (877.0, 1964.0, 8.5),
                      (914.5, 2005.5, 8.25)]:
        add("0.30", "circle", x, y, s)
    add("0.30", "circle", 1032.0, 2091.0, 8.5, [], "outline is slightly irregular; one circle assumed", 1.0)
    add("0.30", "circle", 1202.5, 2156.5, 8.5, ["OVERLAP"], "overlaps the first air-on square (joint fit)", 2.0)
    # d/D = .30 air on
    add("0.30", "square", 1214.0, 2152.0, 8.5, ["OVERLAP"], "overlaps the last air-off circle (joint fit)", 2.0)
    add("0.30", "square", 1331.5, 2176.0, 8.75)
    add("0.30", "square", 1378.0, 2187.5, 8.25)
    add("0.30", "diamond", 1472.0, 2196.5, 12.0)
    add("0.30", "square", 1502.0, 2202.0, 8.5)
    # d/D = .15 air off
    add("0.15", "circle", 772.0, 1954.0, 8.5)
    add("0.15", "circle", 815.5, 2052.5, 8.5, ["OVERLAP"], "two circles overlap (joint fit)", 2.0)
    add("0.15", "circle", 826.0, 2062.0, 8.5, ["OVERLAP"], "two circles overlap (joint fit)", 2.0)
    add("0.15", "circle", 878.5, 2134.5, 8.5, ["OVERLAP"], "two circles touch (joint fit)", 1.5)
    add("0.15", "circle", 888.5, 2150.5, 8.5, ["OVERLAP"], "two circles touch (joint fit)", 1.5)
    add("0.15", "circle", 1024.0, 2277.0, 8.5, ["OVERLAP"], "two circles overlap on a grid crossing (joint fit); "
        "alternative: one circle near (1028,2280)", 2.0)
    add("0.15", "circle", 1033.0, 2283.5, 8.5, ["OVERLAP"], "second of the overlapping pair; alternative: one "
        "circle near (1028,2280)", 2.0)
    add("0.15", "circle", 1098.0, 2314.5, 8.25)
    # d/D = .15 air on
    add("0.15", "square", 1228.5, 2343.0, 8.25, ["OVERLAP"], "touches the next square", 1.5)
    add("0.15", "square", 1258.0, 2359.0, 8.5, ["OVERLAP"], "touches the previous square", 1.5)
    add("0.15", "square", 1469.0, 2404.0, 8.5, ["OVERLAP"], "three squares in a touching row near M=6 (joint fit)", 1.5)
    add("0.15", "square", 1486.0, 2399.0, 8.5, ["OVERLAP"], "middle of three touching squares (joint fit)", 1.5)
    add("0.15", "square", 1504.0, 2397.0, 8.5, ["OVERLAP"], "three touching squares (joint fit)", 1.5)
    # d/D = .075 air off
    add("0.075", "circle", 762.5, 2043.5, 8.25)
    add("0.075", "circle", 792.0, 2124.0, 8.5)
    add("0.075", "circle", 819.0, 2186.0, 8.5)
    add("0.075", "circle", 899.0, 2293.0, 8.5, [], "a curve passes through the circle; single circle fits best", 1.0)
    add("0.075", "circle", 1029.5, 2411.5, 8.5, ["OVERLAP"], "two circles overlap (joint fit)", 2.0)
    add("0.075", "circle", 1034.5, 2423.5, 8.5, ["OVERLAP"], "two circles overlap (joint fit)", 2.0)
    add("0.075", "circle", 1163.5, 2485.5, 8.25)
    # d/D = .075 air on
    add("0.075", "square", 1280.5, 2513.0, 8.25)
    add("0.075", "square", 1483.5, 2543.5, 8.75, [], "outline slightly tall; tested as two coincident squares, "
        "no evidence of a second one", 1.0)
    add("0.075", "square", 1652.0, 2556.0, 8.5)
    for dD, shape, px, py, s, flags, note, k in f7b:
        sc = {"0.50": ".50", "0.30": ".30", "0.15": ".15", "0.075": ".075"}[dD]
        yk = f"14|7|b|y (d/D={sc} scale)"
        key, re = KEY[shape]
        Mread = conv(xk, px, py)
        nn = [note] if note else []
        nn.append(f"read against the d/D={sc} scale; each d/D curve has its own y scale and its zero is the '0' "
                  "in that curve's label column, on a drawn grid line")
        nn.append("mach column is the x value read (free flight, no printed Mach number per point)")
        fl = list(flags)
        if shape == "circle":
            nn.append("key gives Re=0.8M x 10^6 for air off, so no single Reynolds number is printed; text p. 8: "
                      "'Reynolds number varied linearly with Mach number from 1.0x10^6 to 3.3x10^6'")
            fl.append("OTHER")
        mn = MODEL_NOTE[dD].replace("on this figure", "on figure 7")
        nn.append(mn + " (free-flight panel, so presumably the f model)")
        fl.append("OTHER")
        sym_point("B", "7", "b", "", dD, key, "measured", "Total drag coefficient, C_D", "Mach number, M", xk, yk,
                  shape, px, py, s, r3(Mread), re, RE_BASIS, sorted(set(fl), key=fl.index), "; ".join(nn), k,
                  xfmt=r3)


# ---------------- Figure 10 ----------------
def fig10_rows():
    pts = [("1.44", "3140000", "0.075", 2227.0, 2652.0, 8.25), ("1.44", "3140000", "0.15", 2418.5, 2615.5, 8.25),
           ("1.44", "3140000", "0.30", 2811.5, 2540.0, 8.0),
           ("1.99", "2010000", "0.075", 2231.5, 3735.5, 8.0), ("1.99", "2010000", "0.15", 2427.5, 3714.5, 8.25),
           ("1.99", "2010000", "0.30", 2815.5, 3603.5, 8.25)]
    for M, re, dD, px, py, s in pts:
        xk, yk = f"15|10||x (M={M} panel)", f"15|10||y (M={M} panel)"
        note = (MODEL_NOTE_B[dD] + "; figure 10 has no key: the circles are the experiment and the two curves are "
                "the estimates (text p. 15); d_over_D column is the nominal bluntness station")
        sym_point("B", "10", "", "", dD, "circle (no key on figure; text p. 15: experimental foredrag)", "measured",
                  "Foredrag coefficient, C_DF", "Bluntness, d/D", xk, yk, "circle", px, py, s, M, re, RE_BASIS,
                  ["OTHER"], note, 1.0)


# ---------------- Figure 16 ----------------
F16_M = {"124": ("1.24", "2420000"), "144": ("1.44", "3140000"), "196": ("1.96", "4140000"),
         "199": ("1.99", "2010000"), "306": ("3.06", "4000000"), "367": ("3.67", "3450000")}
F16_KEY = {"2": ("square", "0.075", "2 Hemisphere-Cone, .075, L/D 3.00"),
           "3": ("diamond", "0.15", "3 Hemisphere-Cone, 150 (decimal point not visible), L/D 3.00"),
           "4": ("rtriangle", "0.30", "4 Hemisphere-Cone, 300 (decimal point not visible), L/D 3.00"),
           "5": ("rtri_tl", "0.50", "5 Hemisphere-Cone, .500, L/D 3.00"),
           "7": ("qround", "0.075", "7 Hemisphere-Cone, .075, L/D 2.81"),
           "8": ("dshape", "0.15", "8 Hemisphere-Cone, 150 (decimal point not clear), L/D 2.62"),
           "9": ("octagon", "0.30", "9 Hemisphere-Cone 300 (decimal point not visible), L/D 2.24")}


def fig16_rows():
    fits = read_fit("f16/fit.csv")
    corr = {"m5_144": (1103.0, 1567.0, 8.5), "m5_196": (1583.5, 1456.5, 8.0), "m3_196": (1586.0, 2538.5, 11.75),
            "m2_367": (3151.5, 2725.5, 8.0)}
    extra = {
        "m3_196": (["OVERLAP", "SERIES"], "pile-up of several symbols and curves; an open-diamond outline is seen "
                   "with its lower right half clear, its left half is lost in a dark band of half-filled symbols, so "
                   "it could also be model 14 (half-filled diamond); alternative centre for an open diamond about "
                   "(1584,2523) if the visible outline is model 14", 2.0),
        "m2_367": (["OVERLAP"], "square under the model 3 diamond and above a filled square; partly hidden", 2.0),
        "m3_367": (["OVERLAP"], "overlaps the model 2 square below and a half-filled symbol above", 1.5),
        "m2_306": (["OVERLAP"], "touches the model 3 diamond above", 1.5),
        "m3_306": (["OVERLAP"], "touches the model 2 square below and the model 1 circle above", 1.5),
        "m7_144": (["OVERLAP"], "overlaps the model 1 circle (not transcribed) just below", 1.5),
        "m7_199": (["OVERLAP"], "a half-filled symbol touches it from above", 1.5),
        "m4_306": ([], "top edge of the triangle merges with a curve", 1.0),
        "m4_196": ([], "a curve runs through the lower edge", 1.0),
        "m5_144": ([], "a curve runs through the symbol", 1.0),
        "m5_196": ([], "a curve runs through the symbol", 1.0),
    }
    for pid, r in fits.items():
        mdl = pid[1]
        cond = pid.split("_")[1]
        shape, dD, keytxt = F16_KEY[mdl]
        x, y, s = float(r["xfit"]), float(r["yfit"]), float(r["size"])
        if pid in corr:
            x, y, s = corr[pid]
        flags, note, k = extra.get(pid, ([], "", 1.0))
        M, re = F16_M[cond]
        nn = [note] if note else []
        nn.append(f"Mach number {M} is the nominal test value (text table p. 8); Re as printed at the top of the "
                  "figure for that Mach number column")
        if shape in ("rtriangle",):
            nn.append("triangle centre taken as the centroid of the outline")
        sym_point("B", "16", "", mdl, dD, "symbol for model " + keytxt, "measured", "Foredrag coefficient, C_DF",
                  "Mach number, M", "20|16||x", "20|16||y", shape, x, y, s, M, re, RE_BASIS, flags, "; ".join(nn), k,
                  xfmt=r3)


# ---------------- Figure 5 ----------------
def fig5_rows():
    xk, yk = "11|5||x", "11|5||y"
    pts = [("4p", "0.30", "circle", "Model 4p", 2244.0, 1841.5, 8.5, "1.50", [], "", 1.0),
           ("4p", "0.30", "circle", "Model 4p", 2313.0, 1755.0, 8.5, "1.97", ["OVERLAP"],
            "circle drawn inside the outline of the model 6p square at the same Mach number; joint fit, circle on "
            "top; alternative (square on top) gives circle (2315.0,1755.0)", 2.0),
           ("4p", "0.30", "circle", "Model 4p", 2494.0, 1692.0, 8.75, "3.10", ["OVERLAP"],
            "touches the model 6p square just below", 1.5),
           ("6p", "1.00", "square", "Model 6p", 2316.0, 1755.0, 8.5, "1.97", ["OVERLAP"],
            "square outline around the model 4p circle; joint fit; alternative (square on top) gives "
            "(2317.5,1756.5)", 2.0),
           ("6p", "1.00", "square", "Model 6p", 2490.0, 1712.0, 8.25, "3.04", ["OVERLAP"],
            "touches the model 4p circle just above", 1.5),
           ("6p", "1.00", "square", "Model 6p", 2616.0, 1673.0, 8.25, "3.80", [], "a curve runs along its lower edge",
            1.0)]
    for mdl, dD, shape, key, px, py, s, Mn, flags, note, k in pts:
        nn = [note] if note else []
        nn.append(f"Mach number not printed on figure 5; {Mn} is the figure 4 test Mach number for model {mdl} "
                  "nearest the read x (figure 4, PDF p. 10); text p. 8 gives the pressure tests at about Re=4x10^6")
        sym_point("B", "5", "", mdl, dD, key, "measured", "Wave drag coefficient, C_DW", "Mach number, M", xk, yk,
                  shape, px, py, s, Mn, "4000000", RE_BASIS, list(flags), "; ".join(nn), k, xfmt=r3)
    # curves (no symbols): line centres found by column scans (scripts/trace5b.py), as (x, y) page pixels.
    # Low M: dashed line lies above the solid one; 2.2 < M < 5.0 the two lines coincide; high M solid above.
    G = "line crosses a horizontal grid line here; centre less certain"
    solid = [(2166, 2085.6, "near the lower end of the line (end at about pixel 2163,2088)"), (2176, 2035.1, ""),
             (2181, 2016.3, ""), (2191, 1981.1, G), (2195, 1965.1, ""), (2200, 1948.5, ""), (2204, 1935.1, ""),
             (2207, 1926.6, ""), (2212, 1910.1, ""), (2217, 1898.5, G), (2224, 1883.3, ""), (2229, 1872.7, ""),
             (2234, 1864.7, "line then hidden behind the model 4p circle (M about 1.5)"), (2250, 1833.9, ""),
             (2257, 1824.9, ""), (2262, 1817.2, G), (2267, 1813.6, ""), (2270, 1808.0, ""), (2273, 1804.6, ""),
             (2278, 1798.2, ""), (2283, 1793.3, ""), (2286, 1789.9, ""), (2290, 1786.4, ""), (2295, 1782.0, ""),
             (2300, 1777.8, ""), (2303, 1775.8, "line then passes under the model 4p and 6p symbols near M=2"),
             (2336, 1754.5, "solid and dashed lines just touching (3.8 px apart)")]
    dashed = [(2164, 1950.7, "lower end of the dashed line (end at about pixel 2161,1952)"), (2166, 1949.1, ""),
              (2171, 1939.2, ""), (2176, 1927.0, ""), (2179, 1923.1, ""), (2181, 1917.5, ""), (2187, 1900.6, G),
              (2195, 1890.5, ""), (2207, 1870.1, ""), (2212, 1862.8, ""), (2220, 1850.0, ""), (2224, 1845.4, ""),
              (2229, 1838.4, ""), (2234, 1833.3, "line then hidden behind the model 4p circle"), (2250, 1814.0, G),
              (2257, 1803.0, ""), (2262, 1798.6, ""), (2267, 1793.9, ""), (2270, 1791.3, ""), (2283, 1780.4, ""),
              (2286, 1778.3, ""), (2290, 1775.6, ""), (2295, 1772.8, ""),
              (2303, 1767.4, "line then passes under the model 4p and 6p symbols near M=2"),
              (2336, 1750.7, "solid and dashed lines just touching (3.8 px apart)")]
    merged = [(2344, 1749.6), (2353, 1743.9), (2361, 1739.6), (2369, 1736.2), (2386, 1730.4), (2419, 1719.5),
              (2435, 1715.5), (2452, 1710.5), (2502, 1697.4), (2518, 1695.7), (2535, 1692.8), (2551, 1690.3),
              (2584, 1685.7), (2601, 1683.6), (2634, 1680.3), (2667, 1676.4), (2684, 1674.4), (2700, 1673.9),
              (2717, 1671.8), (2750, 1669.4), (2766, 1669.5), (2783, 1667.5), (2799, 1665.9)]
    pairs = [(2832, 1663.4, 1665.5), (2849, 1661.7, 1665.5), (2866, 1661.5, 1664.5), (2882, 1660.5, 1663.7),
             (2915, 1657.6, 1664.0), (2932, 1656.9, 1663.2), (2948, 1654.7, 1661.4), (2965, 1654.0, 1661.0),
             (2998, 1652.6, 1659.7), (3014, 1652.0, 1659.0), (3048, 1650.9, 1658.2), (3081, 1650.5, 1657.5),
             (3114, 1648.7, 1655.6), (3180, 1648.0, 1655.4), (3213, 1648.0, 1655.5), (3246, 1646.7, 1654.0),
             (3279, 1647.1, 1653.8), (3304, 1647.4, 1653.6)]
    solid_only_hi = [3031, 3097, 3130, 3163, 3263]
    solid_only_y = {3031: 1651.5, 3097: 1649.0, 3130: 1648.5, 3163: 1648.1, 3263: 1646.9}
    fx = FITS[xk]
    fy = FITS[yk]

    def curve(key, moe, x, y, note, upx, flags=("CURVE", "NOSOURCE")):
        M = conv(xk, x, y)
        v = conv(yk, x, y)
        vu = math.hypot(fy["b"] * upx, fy["rms"])
        mu = math.hypot(fx["a"] * 2.0, fx["rms"])
        nn = [note] if note else []
        drow("B", "5", "", "", "", key, moe, "Wave drag coefficient, C_DW", r4(v), r4(vu), "Mach number, M",
             r3(M), r3(mu), "", "", "", "curve", list(flags),
             "; ".join(nn) + ("; " if nn else "") + "curve, not a measurement of this report; no Mach or Reynolds "
             "number applies (the curve is a function of M); read at the centre of the drawn line at an even "
             f"column step; pixel centre ({x:.1f},{y:.1f}) at 400 dpi")

    sk = "Estimated from experiment, ref. 16 and 17 (solid line)"
    dk = "Empirical formula, C_DW = (2P_t - 1)/3 (dashed line)"
    for x, y, n in solid:
        curve(sk, "estimate", x, y, n, 3.0)
    for x, y, n in dashed:
        curve(dk, "estimate", x, y, n, 3.0)
    for x, y in merged:
        n = ("solid and dashed lines coincide within the line width (they cross somewhere in M about 2.2 to 5); "
             "the same reading is given for both")
        curve(sk, "estimate", x, y, n, 5.0, ("CURVE", "NOSOURCE", "OVERLAP"))
        curve(dk, "estimate", x, y, n, 5.0, ("CURVE", "NOSOURCE", "OVERLAP"))
    for x, ys, yd in pairs:
        n = "two lines separate again here, solid above dashed" + ("; lines still touching" if yd - ys < 4.5 else "")
        fl = ("CURVE", "NOSOURCE", "OVERLAP") if yd - ys < 4.5 else ("CURVE", "NOSOURCE")
        curve(sk, "estimate", x, ys, n, 3.0, fl)
        curve(dk, "estimate", x, yd, n, 3.0, fl)
    for x in solid_only_hi:
        curve(sk, "estimate", x, solid_only_y[x], "solid line, upper of the two lines at high M (dashed line has a "
              "gap in this column)", 3.0)


# --------------------------------------------------------------------------------------------
def geometry_rows():
    g = []
    A = "figure 1(a) table, p. 7; caption '(a) Hemisphere-cone series for constant L/D=3', so L/D=3 but L not printed"
    for m, dD, w, D, role in [("2", ".075", "8°52'", "1.75", "force"), ("2f", ".075", "8°52'", "0.45", "free-flight"),
                              ("3", ".150", "8°15'", "1.75", "force"), ("3f", ".150", "8°15'", "0.45", "free-flight"),
                              ("4", ".300", "6°59'", "1.75", "force"), ("4f", ".300", "6°59'", "0.45", "free-flight"),
                              ("4p", ".300", "6°59'", "2.00", "pressure"), ("5", ".500", "5°10'", "1.75", "force"),
                              ("5f", ".500", "5°10'", "0.45", "free-flight"), ("5p", ".500", "5°10'", "2.00", "pressure"),
                              ("6p", "1.000", "0", "4.00", "pressure")]:
        note = A
        if role == "force":
            note += ("; figure 1 does not name these force models, role inferred: not in the figure 1 note's "
                     "pressure or free-flight lists, and figure 16 ('all the force models tested') lists them")
        if m == "6p":
            note += "; hemisphere-cylinder (text p. 7)"
        g.append([R, m, dD, w, D, "", role, note])
    for m, dD, LD in [("7", ".075", "2.81"), ("8", ".150", "2.62"), ("9", ".300", "2.24")]:
        g.append([R, m, dD, "9°28'", "1.75", "", "force",
                  f"figure 1(b) table, p. 7 (columns: model, d/D, L/D); L/D printed as {LD}, L itself not printed; "
                  "cone angle printed as omega=9°28' and 'D=1.75' are printed on the figure 1(b) drawing, which also prints "
                  "5.25 as the length of the parent sharp cone; figure 1(b) table prints d/D for model 8 as '.150' with the point set low, like a comma; "
                  "role inferred as for models 2 to 5; figure 10 caption gives 'constant cone angle=18°56'' "
                  "(the full angle, twice 9°28')"])
    return g


def calibration_rows():
    out = []
    for fn in sorted(os.listdir(f"{B}/calib")):
        if not (fn.startswith("pts_") and fn.endswith(".csv")):
            continue
        for r in csv.DictReader(open(f"{B}/calib/{fn}")):
            out.append([R, r["figure"], r["panel"], r["axis"], r["tick_label"], r["pixel_x"], r["pixel_y"], DPI])
    return out


def main():
    prs = fig4_rows()
    with open(f"{B}/readerB_pressures.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow("reader_id,figure,panel,model,d_over_D,mach,reynolds,reynolds_basis,series,station_label,"
                   "station,station_unc,cp,cp_unc,source_kind,flag,note".split(","))
        w.writerows(prs)
    fig8_rows()
    fig7_rows()
    fig10_rows()
    fig16_rows()
    fig5_rows()
    with open(f"{B}/readerB_drag.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow("reader_id,part,figure,panel,model,d_over_D,series_key_text,measured_or_estimate,quantity_label,"
                   "quantity,quantity_unc,x_label,x,x_unc,mach,reynolds,reynolds_basis,source_kind,flag,note"
                   .split(","))
        w.writerows(DRAG)
    with open(f"{B}/readerB_geometry.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow("reader_id,model,d_over_D,cone_half_angle_as_printed,D_in,L_in,role,note".split(","))
        w.writerows(geometry_rows())
    with open(f"{B}/readerB_calibration.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow("reader_id,figure,panel,axis,tick_label,pixel_x,pixel_y,render_dpi".split(","))
        w.writerows(calibration_rows())
    print("pressures", len(prs), "drag", len(DRAG))


if __name__ == "__main__":
    main()
