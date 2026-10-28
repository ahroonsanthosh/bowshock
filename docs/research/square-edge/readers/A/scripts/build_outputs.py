"""Assemble reader A's deliverable CSVs from the typed tables, the symbol
fits and the judgement calls recorded below.

usage: python3 -I build_outputs.py WORKDIR OUTDIR
WORKDIR holds typed/, cal/ and the native page images; OUTDIR is A/.
Values from figures are the local (minor-grid) calibration of the fitted
symbol centre, written with 4 decimals; the reading error in the note is
the centre error times the local scale combined with the local grid-fit
rms. Nothing here smooths or adjusts a value.
"""
import sys, os, csv, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from figlib import load_grey, local_value

W, OUT = sys.argv[1], sys.argv[2]
COLS = ["source", "item", "model", "mach", "reynolds", "position", "position_quantity", "location",
        "value", "value_quantity", "alternatives", "flag", "page", "note"]


def write(name, rows):
    with open(os.path.join(OUT, name), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=COLS)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in COLS})
    print(f"{name}: {len(rows)} rows")


def readfit(name):
    with open(os.path.join(W, "cal", name)) as f:
        return {r["id"]: r for r in csv.DictReader(f)}


def f4(v):
    return f"{float(v):.4f}"


def err(r, axis):
    e = float(r[f"{axis}_err_value"]); s = float(r[f"{axis}_local_rms"] or 0)
    return math.sqrt(e * e + s * s)


def check(r, xtol, ytol, tag):
    dx = abs(float(r["x_local"]) - float(r["x_global"])); dy = abs(float(r["y_local"]) - float(r["y_global"]))
    if dx > xtol or dy > ytol:
        print(f"  check {tag} {r['id']}: local-global dx {dx:.5f} dy {dy:.5f}")


def fixed_point(img, cal, x, y, xstep, ystep, half=40, band=28, exclude=10):
    g = load_grey(img)
    cx, cy = cal["x"]["coef"], cal["y"]["coef"]
    fx = lambda px, py: cx[0] + cx[1] * px + cx[2] * py
    fy = lambda px, py: cy[0] + cy[1] * px + cy[2] * py
    lx = local_value(g, "x", x, y, fx, xstep, half=half, band=band, exclude=exclude)
    ly = local_value(g, "y", x, y, fy, ystep, half=half, band=band, exclude=exclude)
    return dict(x=lx["value"], y=ly["value"], xs=abs(lx["slope"]), ys=abs(ly["slope"]),
                xr=lx["rms"], yr=ly["rms"], xg=fx(x, y), yg=fy(x, y))


# ======================================================== TN D-5392 tables
def tnd():
    sd = {1: "sd_t1.txt", 2: "sd_t2.txt", 3: "sd_t3.txt"}
    vals = {1: "t1_a0.txt", 2: "t2_a0.txt", 3: "t3_a0.txt"}
    page = {1: 13, 2: 31, 3: 49}
    mach = {1: "2.49", 2: "4.06", 3: "4.63"}
    roman = {1: "I", 2: "II", 3: "III"}
    stars = set([2, 4, 6, 8, 10, 12, 14, 16] + list(range(25, 33)) + list(range(39, 49)) + [56, 57, 59] + list(range(60, 75)))
    phi = {}
    for o in range(1, 75):
        phi[o] = 0 if o <= 24 else 45 if o <= 38 else 90 if o <= 55 else 180 if o <= 59 else 270 if o <= 64 else 180 if o <= 69 else 270
    S9 = "digit {d} is a broken 9 printed like an S (loop open on the right); read 9 from the rounded, curled top, which this typeface's 5 lacks"
    flags = {
        1: {1: (".9570", S9.format(d=2)), 2: (".9574", S9.format(d=2)), 4: (".9564", S9.format(d=2) + "; digit 3 is a 6 open at the top (C shape), read 6"),
            5: (".9551", S9.format(d=2)), 6: (".9539", S9.format(d=2)),
            13: (".9599", "last digit 8 or 9: upper loop and waist clear, lower-left stroke only 2 px rows long and no bottom bar"),
            15: (".9379", "last digit 0 or 9: left side breaks off above mid-height and there is no waist bar; read 0"),
            25: (".9581", S9.format(d=2)), 27: (".9540", S9.format(d=2) + " (here even the top curl is faint)"),
            40: (".9568", S9.format(d=2) + "; digit 3 is a 6 open at the top"),
            41: (".9959", "last digit 8 or 9: lower-left stroke only 2 rows below a 2-row waist, bottom bar missing; read 8"),
            58: (".9538", S9.format(d=2)), 59: (".9520", S9.format(d=2)), 60: (".9572", S9.format(d=2)),
            61: (".9564", S9.format(d=2) + "; digit 3 is a 6 open at the top"), 62: (".9562", S9.format(d=2) + "; digit 3 is a 6 open at the top"),
            64: (".9529", S9.format(d=2)),
            69: (".9208", "last digit 9 or 8: one-row stub below the waist and a 9-like bottom hook; read 9"),
            74: (".9169", "last digit 0 or 9: lower-left of the 0 missing, no waist bar; read 0")},
        2: {5: (".5908;.9968", S9.format(d=1) + "; digit 3 is C shaped (0 with right side missing, or 6); read 0; digit 4 an 8 missing its bottom, read 8"),
            10: (".5782;.9792", S9.format(d=1) + "; digit 3 8 or 9 (lower-left stroke 2 rows only), read 8"),
            12: (".5664", S9.format(d=1)), 15: (".5319", S9.format(d=1)),
            20: (".9304", "digit 1 printed like ')': 0 with lower-left missing above mid-height; read 0, alternative 9"),
            21: (".9193;.0183", "digit 1 like ')' (0 or 9), read 0; digit 3 9 or 8 (one-row stub), read 9"),
            26: (".5950", S9.format(d=1)), 28: (".5866", S9.format(d=1)), 29: (".5792", S9.format(d=1)),
            31: (".5497;.9457", S9.format(d=1) + "; digit 3 also an S-shaped broken 9"),
            32: (".9705", "digit 2 has no bottom bar and no left curl at the top: 2 or 7; read 2; digit 3 is a 0 open at the bottom"),
            33: (".6547", "digit 1 shows only its left half with a waist bar and an arched top: 8 or 6; read 8"),
            35: (".9193;.0183", "digit 1 like ')' (0 or 9), read 0; digit 3 9 or 8, read 9"),
            36: (".6193;.0183", "digit 1 C shaped (0 or 6), read 0; digit 3 9 or 8, read 9"),
            38: (".6183", "digit 1 C shaped (0 or 6), read 0"),
            40: (".5960", S9.format(d=1)),
            42: (".9977", "digit 3 is a 2 without its bottom bar (one-row left curl at the top); 7 possible"),
            45: (".5773", S9.format(d=1)), 47: (".5497", S9.format(d=1) + " (only the upper left of the glyph prints)"),
            49: (".8577", "digit 3 has its arc and diagonal but no bottom bar and no left curl: 2 or 7; read 2"),
            53: (".0193", "digit 3 8 or 9: lower-left stroke only 2 rows; read 8"),
            54: (".6791", "digit 1 is the left half only ('('): 0 or 6; read 0"),
            56: (".5955", S9.format(d=1) + " (only the upper-left arc prints)"),
            59: (".9939;.9999", "digit 3 shows only its right side (')'): 0, 3 or 9; read 0"),
            65: (".5844", S9.format(d=1)), 68: (".5500", S9.format(d=1)), 70: (".5853", S9.format(d=1)),
            72: (".5652", S9.format(d=1) + " (no tail prints)"), 74: (".5134", S9.format(d=1)),
            62: ("", "value clear; the s/d of orifice 62 is printed .0833 here, where tables I and III print .0800 for the same orifice; read as printed")},
        3: {},
    }
    notes_ok = {
        1: {28: "the orifice number prints as '2R' (broken 8); read 28 from the sequence of the column",
            30: "digits 3 and 4 broken (a 9 with a gap and an 8 without its bottom); both read without doubt",
            55: "digit 3 is a 6 open at the top; read 6", 57: "digit 2 a 9 with a one-row gap; read 9", 63: "digit 2 a 9 with a gap; read 9",
            65: "digit 2 an 8 with gaps; read 8", 68: "the 1 has a tick; read 1"},
        2: {38: "the orifice number prints as '3A' (broken 8); read 38",
            16: "digit 3 a 0 open at the lower right; digit 4 an 8 with 3 rows of lower-left stroke; read 8",
            17: "digit 1 an 8 missing part of the top; read 8", 18: "digit 4 an 8 (4 rows of lower-left stroke); read 8",
            22: "digit 1 a 0 open at the lower right; digit 3 a 6 with a broken right side",
            23: "digit 3 an 8 (3 rows of lower-left stroke)", 24: "digit 3 a 0 open at the lower left (left side reaches row 9 of 12)",
            30: "digit 4 an 8 without its bottom bar (lower-left stroke present)", 37: "digit 3 an 8 (3 rows lower-left)",
            41: "", 48: "digit 3 a 9 whose loop is open at lower left (left side 3 rows); read 9",
            50: "digit 1 a 0 open at the lower right", 51: "digit 3 an 8 (3 rows lower-left)", 52: "digit 3 an 8 missing its lower right",
            57: "digit 4 a 3 without its bottom", 58: "", 67: "digit 4 an 8 (3 rows lower-left)", 69: "digit 3 a 0 open at the bottom",
            40: "", 74: ""},
        3: {42: "digit 4 an 8 without a full bottom bar (3 rows lower-left)", 55: "digit 4 an 8 without its bottom bar (4 rows lower-left)"},
    }
    for t in (1, 2, 3):
        v = [l.strip() for l in open(os.path.join(W, "typed", vals[t])) if l.strip()]
        s = [l.strip() for l in open(os.path.join(W, "typed", sd[t])) if l.strip()]
        rows = []
        for o in range(1, 75):
            sdv = float("0." + s[o - 1])
            loc = "face" if sdv < 0.5 else "afterbody"
            star = (o in stars) or (t == 3 and o == 11)
            alt, flag, note = "", "ok", []
            if o in flags[t]:
                a, n = flags[t][o]
                alt = a; flag = "ambiguous"; note.append(n)
            elif notes_ok[t].get(o):
                note.append(notes_ok[t][o])
            note.append(f"orifice {o}{'*' if star else ''}" + (" (measured by the 1-psi gage, table footnote)" if star else " (10-psi transducer, per text)"))
            note.append(f"phi = {phi[o]} deg as printed")
            if o in (39, 55):
                note.append("orifices 39* and 55 are both printed at phi 90, s/d .0267; read as printed")
            if t == 3 and o == 11:
                note.append("orifice 11 carries * in table III but not in tables I and II")
            note.append("alpha = 0 column; typed from the page image (text layer not used: it is unreliable here)")
            rows.append(dict(source="TN D-5392", item=f"table {roman[t]}(a)", model="model 1 (flat-face cylinder: rn/d infinite, rc/d 0, fig. 1)",
                             mach=mach[t], reynolds="1.88 x 10^6", position="." + s[o - 1],
                             position_quantity=f"s/d at phi = {phi[o]} deg (s: surface length from the axis of symmetry; d = 7.5 in. afterbody diameter)",
                             location=loc, value="." + v[o - 1], value_quantity="p_l/p_t,2 (table heading; p_t,2: stagnation pressure behind a normal shock at the free-stream Mach number)",
                             alternatives=alt, flag=flag, page=page[t],
                             note="; ".join(note) + "; Reynolds number based on afterbody diameter (text)"))
        write(f"tnd5392_table{t}.csv", rows)


# ======================================================== TN 4300 fig 7
def tn4300_fig7():
    fit = readfit("tn4300_fig7_fit.csv")
    cal = json.load(open(os.path.join(W, "cal", "tn4300_fig7_out.json")))
    img = os.path.join(W, "tn4300", "tn4300_p31_native.png")
    series = {"present": ("4-in.-diameter model D, present tests (legend: 4\" dia model, present tests)", "2.00"),
              "unitary": ("4-in.-diameter model, Unitary tunnel (legend)", "2.49"),
              "ref3": ("3-in.-diameter model, ref. 3 figure 4 (legend)", "2.01")}
    rows = []
    PQ = "x/r as plotted (x: distance along front surface from centre line; r: model radius)"
    VQ = "p_l/p_o as the axis states it (p_o: stagnation-point pressure, which the text calls the total pressure behind the shock)"

    def add(r, ser, flag="ok", alt="", note="", xv=None, yv=None, ex=None, ey=None):
        m, mach = series[ser]
        x = float(r["x_local"]) if xv is None else xv
        y = float(r["y_local"]) if yv is None else yv
        ex = err(r, "x") if ex is None else ex
        ey = err(r, "y") if ey is None else ey
        sym = {"disc": "solid circle", "ring": "open circle", "square": "open square", "diamond": "open diamond"}[r["type"]]
        n = f"{sym}; centre ({float(r['px']):.2f}, {float(r['py']):.2f}) px on the native 300 dpi page; reading error +-{ey:.4f} in p_l/p_o, +-{ex:.4f} in x/r"
        if ser == "present":
            n += "; 27- by 27-in. preflight jet (text); solid = low-range differential cells, open = other side of the main ray (text)"
        if note:
            n += "; " + note
        rows.append(dict(source="TN 4300", item="fig. 7", model=m, mach=mach, reynolds="", position=f4(x), position_quantity=PQ,
                         location="face", value=f4(y), value_quantity=VQ, alternatives=alt, flag=flag, page=31, note=n))

    for k in ["f025", "o025", "f050", "o050", "f075", "o0866", "f0866", "o0937", "f0937"]:
        r = fit[k]; check(r, 0.002, 0.001, "fig7")
        if k == "o025":
            add(r, "present", "ambiguous", "0.9992", "upper half of the circle is not printed (it would lie above the top frame line); centre fitted to the lower arc; alternative takes the centre one radius above the arc bottom")
        elif k == "f050":
            add(r, "present", note="the solid symbol prints square-topped and overlaps the open diamond above and the open circle below; read as the solid circle (the legend has no solid square)")
        elif k == "o050":
            add(r, "present", "ambiguous", "", "upper half hidden under the solid circle; centre from the sides and lower arc; error larger than the fit says (+-2 px, +-0.0006)", ey=0.0007)
        elif k == "f075":
            add(r, "present", note="a dashed fairing enters the symbol from the upper left")
        else:
            add(r, "present")
    lo, hi = fit["f096lo"], fit["f096hi"]
    add(lo, "present", "ambiguous", f4(hi["y_local"]),
        f"two solid circles at x/r 0.96 where the pressure and velocity fairings cross: one is the pressure point, the other the velocity point; this one (lower) lies on the dashed pressure fairing; alternative is the upper circle at ({float(hi['px']):.2f}, {float(hi['py']):.2f}) px, x/r {float(hi['x_local']):.4f}")
    add(fit["o0975"], "present", note="overlaps the solid circle just below")
    add(fit["f0975"], "present", note="overlaps the open circle just above")
    # Unitary
    u = fit["u0125"]
    for tag, yy in (("a", 753.5), ("b", 759.5)):
        fp = fixed_point(img, cal, 700.5, yy, 0.01, 0.005)
        add(u, "unitary", "ambiguous", "0.9964", f"outline 11 px wide but 17 px tall between the top frame line and the next grid line: read as two overlapping squares (plain and flagged?), this the {'upper' if tag == 'a' else 'lower'} one, centre (700.5, {yy}) px set by eye from the side strokes (+-2.5 px); alternative 0.9964 = one square centred between them",
            xv=fp["x"], yv=fp["y"], ex=0.0010, ey=0.0008)
    add(fit["u025"], "unitary", "ambiguous", "", "partly hidden behind the solid circle to its left; only the right side and top edge show; may be the flagged square of the legend")
    for k in ["u0866a", "u0866b", "u092a", "u092b", "u097a", "u097b", "u097c"]:
        check(fit[k], 0.002, 0.001, "fig7")
        add(fit[k], "unitary", note="legend has a plain and a flagged square for this model and does not say what the flag means; flag not resolvable at this size")
    for k in ["d025", "d030", "d035", "d040", "d045", "d050", "d055", "d060", "d065", "d075", "d080", "d085"]:
        r = fit[k]
        if k == "d050":
            fp = fixed_point(img, cal, 1294.5, 809.5, 0.01, 0.005)
            add(r, "ref3", "ambiguous", "", "only the top corner shows above the solid circle; centre taken 8 px (half the diamond) below the top corner at (1294.5, 801.5) px, +-2 px", xv=fp["x"], yv=fp["y"], ex=0.0013, ey=0.0007)
        elif k == "d075":
            add(r, "ref3", "ambiguous", "", "sits just above the solid circle at x/r 0.75 and looks rounded; could be a diamond with an open circle inside it")
        else:
            check(r, 0.002, 0.001, "fig7"); add(r, "ref3")
    for ser, xr, why in (("present", "0.75", "open circle"), ("unitary", "0.5", "square"), ("unitary", "0.75", "square")):
        m, mach = series[ser]
        rows.append(dict(source="TN 4300", item="fig. 7", model=m, mach=mach, position=xr, position_quantity=PQ + " (approximate)", location="face",
                         value="", value_quantity=VQ, flag="illegible", page=31,
                         note=f"no {why} is visible here on the pressure curve; listed because the velocity distribution in the same figure shows a {why} of this series at x/r about {xr}; if plotted it is hidden behind the solid circle"))
    write("tn4300_fig7.csv", rows)


# ======================================================== TN 4300 fig 16
def tn4300_fig16():
    rows = []
    VQ = "p_l/p_o as the axis states it"
    MOD = "12-in.-diameter model A"
    a = readfit("tn4300_fig16a_try.csv")
    cala = json.load(open(os.path.join(W, "cal", "tn4300_fig16a_out.json")))
    img = os.path.join(W, "tn4300", "tn4300_p40_native.png")
    runs = {"run1": "run 1 (open circle)", "run2": "run 2 (open diamond)", "run3": "run 3 (triangle)"}
    CL = "symbols of the three runs overlap heavily in this cluster; this outline was picked out by eye on a dark-stroke view and the centre fitted to it; other readers may separate the cluster differently"
    for k in ["c2d", "c2o", "c2t", "c3t1", "c3oA", "c3d", "c3oC", "c3t3", "c4d", "c4tb", "c4ta", "c4o", "c5t1", "c5t2", "c5o", "c6t"]:
        r = a[k]
        ex, ey = max(err(r, "x"), 0.0015), max(err(r, "y"), 0.0010)
        alt = ""
        note = f"{runs[r['series']]}; centre ({float(r['px']):.2f}, {float(r['py']):.2f}) px; reading error +-{ey:.4f} in p_l/p_o, +-{ex:.4f} in x/r (at least 1.5-2 px allowed for the overlap)"
        if r["type"] == "rtri":
            # centroid alternative: centroid is w/6 right and h/6 up of the bounding-box centre
            w = float(r["size"]) - 1.6; h = w * 25 / 29
            fp = fixed_point(img, cala, float(r["px"]) + w / 6, float(r["py"]) - h / 6, 0.01, 0.005)
            alt = f4(fp["y"])
            note += f"; triangle centre taken as the middle of its bounding box; alternative {alt} is its centroid (x/r {fp['x']:.4f})"
        if k.startswith("c2"):
            note += "; cluster at x/r 0.5 is light: three symbols, one per run"
        else:
            note += "; " + CL
        if k in ("c3oC", "c3t3"):
            note += "; fit stopped at the edge of its search box"
        rows.append(dict(source="TN 4300", item="fig. 16(a)", model=MOD + ", " + runs[r["series"]], mach="2", reynolds="",
                         position=f4(r["x_local"]), position_quantity="x/r as plotted (main ray)", location="face",
                         value=f4(r["y_local"]), value_quantity=VQ, alternatives=alt, flag="ambiguous", page=40,
                         note=note + "; 27- by 27-in. preflight jet (table I)"))
    fp = fixed_point(img, cala, 951.5, 473.5, 0.01, 0.005)
    rows.append(dict(source="TN 4300", item="fig. 16(a)", model=MOD + " (symbol not in the legend)", mach="2", position=f4(fp["x"]),
                     position_quantity="x/r as plotted (main ray)", location="face", value=f4(fp["y"]), value_quantity=VQ,
                     alternatives="", flag="ambiguous", page=40,
                     note="a small rectangle (about 26 x 17 px) hangs below the top frame line at x/r 0.26 with the 4-inch curve through it; the legend has no such symbol; read as plotted, centre (951.5, 473.5) px from its sides and bottom (+-4 px, top edge hidden by the frame line)"))
    ca = cala["x"]["coef"]
    for cx, cy, what in ((1432, 522, "a second diamond (run 2)"), (1531, 607, "another symbol (small loop of strokes)"),
                         (1622, 750, "further circle arcs"), (1650, 955, "a circle"), (1645, 945, "a diamond")):
        xr = ca[0] + ca[1] * cx + ca[2] * cy
        rows.append(dict(source="TN 4300", item="fig. 16(a)", model=MOD, mach="2", position=f"{xr:.3f}", position_quantity="x/r as plotted (approximate)",
                         location="face", value="", value_quantity=VQ, flag="illegible", page=40,
                         note=f"strokes of {what} near ({cx}, {cy}) px inside an overlapping cluster; outline not separable, so no value"))
    b = readfit("tn4300_fig16b_fit.csv")
    calb = json.load(open(os.path.join(W, "cal", "tn4300_fig16b_out.json")))
    imgb = img
    for k in ["s1o", "s1d", "s1t", "s2o", "s2d", "s2t", "s3o", "s3d", "s3t", "s4o", "s4d", "s4t", "s5o", "s5d", "s5t"]:
        r = dict(b[k])
        st = int(k[1])
        if k == "s5t":
            fp = fixed_point(imgb, calb, 1490.5, 2127.25, 0.05, 0.001, half=40, band=30, exclude=16)
            r.update(px="1490.50", py="2127.25", x_local=fp["x"], y_local=fp["y"])
            ey = math.sqrt((1.0 * fp["ys"]) ** 2 + fp["yr"] ** 2)
        else:
            ey = err(r, "y")
        alt = ""
        note = f"{runs[r['series']]}; centre ({float(r['px']):.2f}, {float(r['py']):.2f}) px, plotted at station {float(r['x_local']):.3f} on the axis scale; reading error +-{ey:.4f} in p_l/p_o"
        flag = "ok"
        if r["type"] == "ltri":
            w = float(r["size"]) - 1.6; h = w * 25 / 29
            fp = fixed_point(imgb, calb, float(r["px"]) - w / 6, float(r["py"]) - h / 6, 0.05, 0.001, half=40, band=30, exclude=16)
            alt = f4(fp["y"])
            note += f"; triangle centre taken as the middle of its bounding box; alternative {alt} is its centroid"
            flag = "ambiguous"
        if st == 1:
            note += "; station 1 lies on the left frame line; the symbol is drawn across the frame"
        if k == "s4t":
            note += "; top edge of the triangle lies on a grid line, so its height is less certain (+-3.5 px fit spread)"
        if k == "s2t":
            note += "; overlaps the diamond below"
        rows.append(dict(source="TN 4300", item="fig. 16(b)", model=MOD + ", " + runs[r["series"]], mach="2", reynolds="",
                         position=str(st), position_quantity="station number on the 75-percent station (x/r = 0.75); stations 1 to 5 at the azimuths of the inset sketch (1 and 5 on the horizontal diameter, 3 at the top)",
                         location="face", value=f4(r["y_local"]), value_quantity=VQ, alternatives=alt, flag=flag, page=40, note=note))
    write("tn4300_fig16.csv", rows)


# ======================================================== RM L57C18 fig 5
def rml57():
    rows = []
    pages = {"b": 23, "c": 24, "d": 25, "f": 27}
    names = {"b": "model B (flat face, 1.0-in. corner radius)", "c": "model C (flat face, 0.4-in. corner radius)",
             "d": "model D (flat face, 0.1-in. corner radius)", "f": "model F (as D with a 0.200-in. flat depression in the face)"}
    # location by inset sketch, checked against face/corner extents derived from the printed dimensions
    loc = {"b": ["face", "face", "corner", "corner", "afterbody", "afterbody", "afterbody", "afterbody"],
           "c": ["face", "face", "afterbody", "afterbody", "afterbody", "afterbody", "afterbody", "afterbody"],
           "d": ["face", "face", "corner", "afterbody", "afterbody", "afterbody", "afterbody", "afterbody", "afterbody"],
           "f": ["face", "face", "corner", "unclear", "afterbody", "afterbody", "afterbody", "afterbody", "afterbody"]}
    locnote = {("b", 3): "sketch tick on the corner arc", ("b", 4): "sketch tick where the corner arc meets the cone; the corner ends at s = 2.48 in. by the printed dimensions, so corner",
               ("c", 3): "first sketch tick on the cone, just past the corner (corner ends at s = 2.15 in. by the printed dimensions)",
               ("d", 2): "near the face edge (the face ends at s = 1.86 in. by the printed dimensions); the sketch crowds ticks at the corner",
               ("d", 3): "sketch shows ticks on the 0.1-in. corner; corner spans s = 1.86 to 1.99 in. by the printed dimensions",
               ("d", 4): "just past the corner by the printed dimensions; sketch crowds ticks here",
               ("f", 3): "on the lip of the depression (sketch)", ("f", 4): "lip or start of the cone: the sketch does not separate them"}
    for k in "bcdf":
        fit = readfit(f"rml57_fig5{k}_fit.csv")
        cal = json.load(open(os.path.join(W, "cal", f"rml57_fig5{k}_out.json")))
        img = os.path.join(W, "rml57", f"rml57_p{pages[k]:02d}_native.png")
        for i, (kk, r) in enumerate(sorted(fit.items(), key=lambda t: int(t[0][1:]))):
            n = i + 1
            if k == "d" and n == 1:
                fp = fixed_point(img, cal, 762.5, 494.25, 0.02, 0.01, half=32, band=22, exclude=11)
                x, y = fp["x"], fp["y"]; ex, ey = 0.006, 0.0035; px, py = 762.5, 494.25
                extra = "circle sandwiched between the triangle above and the square below; centre refitted with a wider search; +-1.5 px"
                flag = "ambiguous"
            else:
                check(r, 0.01, 0.006, "rm" + k)
                x, y = float(r["x_local"]), float(r["y_local"]); ex, ey = err(r, "x"), err(r, "y"); px, py = float(r["px"]), float(r["py"])
                extra = ""; flag = "ok"
                if (k, n) in (("b", 4), ("b", 5)):
                    extra = "open square (alpha 5 leeward) overlaps"
                if (k, n) == ("c", 1):
                    extra = "triangle and square (alpha 5) close above and below"
            note = f"open circle (alpha = 0 per legend; table I tests 4, 9, 10, 14); centre ({px:.2f}, {py:.2f}) px; reading error +-{ey:.4f} in C_p, +-{ex:.4f} in s"
            if k == "f":
                note += "; fig. 5(f) has no legend; model F was tested at alpha 0 only (table I, text)"
            if (k, n) in locnote:
                note += "; location: " + locnote[(k, n)]
            if extra:
                note += "; " + extra
            note += "; 12- by 12-in. preflight jet; conical afterbody (14.5 deg)"
            rows.append(dict(source="RM L57C18", item=f"fig. 5({k})", model=names[k], mach="2", reynolds="about 14 x 10^6 per ft",
                             position=f4(x), position_quantity="s, inches (distance along surface from center line, axis 'S, inches')",
                             location=loc[k][i], value=f4(y), value_quantity="C_p = (p_l - p_inf)/q_inf as the axis states it",
                             alternatives="", flag=flag, page=pages[k], note=note))
    write("rml57c18_fig5.csv", rows)


# ======================================================== TM X-19 fig 5
def tmx19():
    fit = readfit("tmx19_fig5_fit.csv")
    rows = []
    for k in sorted(fit):
        r = fit[k]; check(r, 0.003, 0.0015, "tmx")
        ex, ey = err(r, "x"), err(r, "y")
        note = f"open circle (alpha = 0 deg, legend); centre ({float(r['px']):.2f}, {float(r['py']):.2f}) px on the page turned upright; reading error +-{ey:.4f} in p_l/p_t,2, +-{ex:.4f} in x/r"
        flag, alt = "ok", ""
        if k == "t15":
            flag = "ambiguous"
            note += "; printed fainter than the other symbols, near the left frame and off the solid alpha-0 fairing (which ends at x/r 0.93, p 0.82); a faint square and a faint diamond sit below it at the same x/r; read as plotted"
        if k in ("t06", "t09"):
            note += "; an open square (alpha 7.5) overlaps"
        if k == "t08":
            note += "; open circle and open square (alpha 7.5) almost coincide and print as a rounded square; read as the circle"
        rows.append(dict(source="TM X-19", item="fig. 5", model="4-in.-diameter flat-face cylinder (pressure model)", mach="2.49",
                         reynolds="0.90 x 10^6", position=f4(r["x_local"]),
                         position_quantity="x/r as plotted; positive toward the side marked Leeward, negative Windward (r: model radius, 2.00 in.)",
                         location="face", value=f4(r["y_local"]),
                         value_quantity="p_l/p_t,2 as the axis states it; caption: ratio of local pressure to the pressure at the stagnation point at alpha 0 (text: p_t,2 measured by the orifice at the face centre at alpha 0)",
                         alternatives=alt, flag=flag, page=20, note=note + "; Reynolds number based on model diameter (symbols list)"))
    write("tmx19_fig5.csv", rows)


tnd(); tn4300_fig7(); tn4300_fig16(); rml57(); tmx19()
