"""Build reader A CSV files from the per-panel result files.

usage: build_outputs.py <A folder>
Reads work/res_*.json and work/fig5_curves.txt, writes readerA_pressures.csv,
readerA_drag.csv, readerA_geometry.csv, readerA_calibration.csv.
"""
import sys, os, json, csv, math

A = sys.argv[1]
W = os.path.join(A, "work")
RID = "A"
DPI = 600


def res(name):
    return json.load(open(os.path.join(W, f"res_{name}.json")))


def fmt(v, nd):
    s = f"{v:.{nd}f}"
    if s.startswith("-0.") and float(s) == 0:
        s = s[1:]
    return s


def unc(v):
    # uncertainty rounded up to 2 significant figures
    if v <= 0:
        return "0"
    e = math.floor(math.log10(v)) - 1
    q = math.ceil(v / 10 ** e) * 10 ** e
    nd = max(0, -e)
    return f"{q:.{nd}f}"


def overlaps(points, dist=30.0):
    out = {}
    for p in points:
        nb = [q["id"] for q in points if q is not p and math.hypot(q["px"] - p["px"], q["py"] - p["py"]) < dist]
        out[p["id"]] = nb
    return out


LEN_BASIS = "model length (p8 text: average Reynolds number (based on model length); p6 symbols: Re based on body length)"

# ---------------------------------------------------------------- pressures
pres_rows = []
HALF = {"diamond": 21, "square": 15, "circle": 15}
fig4 = {
    "a": dict(res="4a", model="4p", dD="0.30", series={"M=3.10": ("open diamond", "3.10"), "M=1.97": ("open square", "1.97"), "M=1.50": ("open circle", "1.50")},
              xlabel="not printed (panel a has no x label and no x tick numbers)", half=HALF),
    "b": dict(res="4b", model="5p", dD="0.50", series={"M=3.06": ("open diamond", "3.06"), "M=1.97": ("open square", "1.97"), "M=1.54": ("open circle", "1.54")},
              xlabel="Distance from the nose, X/L", half=HALF),
    "c": dict(res="4c", model="6p", dD="1.00", series={"M=3.80": ("open diamond", "3.80"), "M=3.04": ("open square", "3.04"), "M=1.97": ("open circle", "1.97")},
              xlabel="Distance from the nose, X/D", half={"diamond": 20, "square": 15, "circle": 15}),
}
extra4 = {  # id -> (extra px, flags, note)
}
for pan, m in fig4.items():
    r = res(m["res"])
    ov = overlaps(r["points"])
    for p in r["points"]:
        sym, mach = m["series"][p["series"]]
        flags, notes = [], []
        h = m["half"][p["shape"]] + 0.0
        if ov[p["id"]]:
            flags.append("OVERLAP")
            notes.append("touches or overlaps " + "/".join(ov[p["id"]]))
            h += 3
        if pan == "a":
            flags.append("AXIS")
            notes.append("x axis of panel a is unlabelled; grid assumed to run 0 to 1.0 in 0.1 steps like panel b")
        if pan == "c" and mach == "3.80":
            flags.append("DISAGREE")
            notes.append("panel prints M=3.80 and p10 text says Mach numbers between 1.5 and 3.8, but p8 text says pressure tests at Mach numbers of 1.5, 2, 3, and 3.7")
        if pan in "ab":
            notes.append(f"cp read on the {p['series']} label column (each Mach has its own column of P labels left of the panel with its Mach printed at the foot; this curve's zero is the grid line labelled 0 in that column)")
        else:
            notes.append("single P scale for all three curves")
        notes.append("Re not printed on panel; p8 text: pressure-distribution tests at an average Reynolds number of about 4x10^6")
        notes.append(f"symbol centre px=({p['px']:.1f},{p['py']:.1f}) on 600 dpi render of PDF p10")
        pres_rows.append([RID, "4", pan, m["model"], m["dD"], mach, "4000000", LEN_BASIS,
                          f"{sym}, curve labelled M={mach}", m["xlabel"],
                          fmt(p["X"], 4), unc(p["dXdpx"] * h), fmt(p["Y"], 3), unc(p["dYdpx"] * h),
                          "symbol", ";".join(dict.fromkeys(flags)), "; ".join(notes)])

with open(os.path.join(A, "readerA_pressures.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow("reader_id,figure,panel,model,d_over_D,mach,reynolds,reynolds_basis,series,station_label,station,station_unc,cp,cp_unc,source_kind,flag,note".split(","))
    w.writerows(pres_rows)

# ---------------------------------------------------------------- drag
drag = []
H = ["reader_id", "part", "figure", "panel", "model", "d_over_D", "series_key_text", "measured_or_estimate", "quantity_label",
     "quantity", "quantity_unc", "x_label", "x", "x_unc", "mach", "reynolds", "reynolds_basis", "source_kind", "flag", "note"]


def row(**k):
    drag.append([k.get(c, "") for c in H])


def sym_unc(p, half, extra=0.0):
    h = half + extra
    return unc(p["dYdpx"] * h), unc(p["dXdpx"] * h)


# ---- figure 8 (part A squares, part B circles)
F8_RE = {"124": "2420000", "144": "", "196": "4140000", "306": "4000000", "367": "3450000"}
F8_M = {"124": "1.24", "144": "1.44", "196": "1.96", "306": "3.06", "367": "3.67"}
DDN = {0.075: "0.075", 0.15: "0.15", 0.3: "0.30", 0.5: "0.50"}
for nm in ("8L", "8R"):
    r = res(nm)
    ov = overlaps(r["points"])
    for p in r["points"]:
        key = p["id"].split("_")[0]
        is_sq = p["shape"] == "square"
        flags, notes = [], []
        extra = 0.0
        if ov[p["id"]]:
            flags.append("OVERLAP")
            notes.append("overlaps " + "/".join(ov[p["id"]]))
            extra = 3.0
        if p.get("fixed"):
            extra = 6.0
            notes.append("centre placed from the visible edges of a partly hidden symbol (template match not usable)")
        if p["id"] == "306_075h":
            flags += ["OVERLAP", "OTHER"]
            notes.append("possible second circle: a second bottom arc is visible 7 px below the first circle's; its top arc is not visible; may be a doubled repeat point or a drawing artefact")
        if key == "144":
            flags.append("SERIES")
            notes.append("panel prints M=1.44 Re=1.17x10^6 & 3.14x10^6; the report does not say which symbols belong to which Reynolds number")
            if p["id"] == "144_075f":
                notes.append("this circle carries a short diagonal tick at upper right (meaning not given in key or text)")
        notes.append("model number not printed on figure 8; d_over_D is the figure 1 value nearest the x reading")
        if is_sq:
            notes.append("figure 1 note lists 4p (d/D .300) and 5p (d/D .500) as the pressure distribution models")
            notes.append("reynolds is the value printed for this Mach panel; p8 text says the pressure-distribution tests were at an average Reynolds number of about 4x10^6")
            if p["id"] == "306_3sq":
                flags.append("DISAGREE")
                notes.append("plotted in the M=3.06 panel, but figure 4(a) prints M=3.10 for model 4p (d/D=0.30)")
            elif p["id"] == "306_5sq":
                notes.append("figure 4(b) prints M=3.06 for model 5p")
            else:
                notes.append("plotted in the M=1.96 panel; figure 4(a) and 4(b) print M=1.97 for models 4p and 5p")
        notes.append(f"px=({p['px']:.1f},{p['py']:.1f}) on 600 dpi render of PDF p14")
        qu, xu = sym_unc(p, 14 if is_sq else 15, extra)
        row(reader_id=RID, part="A" if is_sq else "B", figure="8", panel="", model="",
            d_over_D=DDN[p["dd"]],
            series_key_text="Wave drag (press. distr. models)" if is_sq else "Foredrag",
            measured_or_estimate="measured",
            quantity_label="Foredrag coefficient, C_DF", quantity=fmt(p["Y"], 4), quantity_unc=qu,
            x_label="Bluntness, d/D", x=fmt(p["X"], 4), x_unc=xu,
            mach=F8_M[key], reynolds=F8_RE[key], reynolds_basis=LEN_BASIS, source_kind="symbol",
            flag=";".join(dict.fromkeys(["OTHER"] + flags)) if True else "", note="; ".join(notes))

# ---- figure 7(a)
F7_RE = {"124": "2420000", "144": "3140000", "196": "4140000", "306": "4000000", "367": "3450000"}
F7_M = {"124": "1.24", "144": "1.44", "196": "1.96", "306": "3.06", "367": "3.67"}
r = res("7a")
ov = overlaps(r["points"], 25)
S7A = {"dD.50": ("d/D=.500 (curve label); symbol: right triangle", "0.50", 12, "2"),
       "dD.30": ("d/D=.30 (curve label); symbol: triangle", "0.30", 14, "4"),
       "dD.15": ("d/D=.15 (curve label); symbol: diamond", "0.15", 20, "3"),
       "dD.075": ("d/D=.075 (curve label); symbol: square", "0.075", 14, "2")}
CAND = {"0.50": "5", "0.30": "4", "0.15": "3", "0.075": "2"}
for p in r["points"]:
    txt, dd, half, _ = S7A[p["series"]]
    key = "".join(c for c in p["id"] if c.isdigit())
    flags, notes = ["OTHER"], []
    extra = 0.0
    if p["id"][-1] in "ul" and p["id"][-2].isdigit():
        flags.append("OVERLAP")
        notes.append("two symbols drawn almost on top of each other (doubled point); both transcribed")
        extra = 4.0
    elif ov[p["id"]]:
        flags.append("OVERLAP"); extra = 3.0
    if p.get("fixed"):
        extra = max(extra, 3.0)
        notes.append("centre from the symbol outline (bounding box) because a template match was poor")
    notes.append(f"model number not printed; text p13 says models 1 through 5; by figure 1 d/D {dd} is model {CAND[dd]}")
    notes.append(f"Mach column tied by leader line to printed Re={int(F7_RE[key])/1e6:.2f}x10^6 at top of panel; mach is the p8 table value for that condition; x is the Mach read from the axis")
    notes.append("C_DF read on this curve's own label column (labels .2 .1 0 printed left of panel next to the d/D label; zero is the grid line labelled 0 in that column)")
    notes.append(f"px=({p['px']:.1f},{p['py']:.1f}) on 600 dpi render of PDF p14")
    qu, xu = sym_unc(p, half, extra)
    row(reader_id=RID, part="B", figure="7", panel="a", model="", d_over_D=dd, series_key_text=txt,
        measured_or_estimate="measured", quantity_label="Foredrag coefficient, C_DF", quantity=fmt(p["Y"], 4), quantity_unc=qu,
        x_label="Mach number, M", x=fmt(p["X"], 3), x_unc=xu, mach=F7_M[key], reynolds=F7_RE[key],
        reynolds_basis=LEN_BASIS, source_kind="symbol", flag=";".join(dict.fromkeys(flags)), note="; ".join(notes))

# ---- figure 7(b)
r = res("7b")
ov = overlaps(r["points"], 24)
S7B = {"circle": ("o Re=0.8M x10^6, air off", "", 14), "square": ("[square] Re=4.0 x10^6, air on", "4000000", 13),
       "diamond": ("<> Re=3.0 x10^6, air on", "3000000", 20), "triangle": ("triangle Re=7.5 x10^6, air on", "7500000", 13)}
DD7B = {"dD.50": "0.50", "dD.30": "0.30", "dD.15": "0.15", "dD.075": "0.075"}
for p in r["points"]:
    txt, re_, half = S7B[p["shape"]]
    dd = DD7B[p["series"]]
    flags, notes = ["OTHER"], []
    extra = 3.0  # all positions were placed from zoomed outlines
    if ov[p["id"]]:
        flags.append("OVERLAP")
        notes.append("overlaps " + "/".join(ov[p["id"]]))
        extra = 6.0
    if p["id"] in ("Don2", "Don3"):
        flags.append("OVERLAP")
        notes.append("two squares drawn almost on top of each other (doubled point); both transcribed")
    if p["id"] in ("Aon4", "Aon5"):
        flags.append("OTHER")
        notes.append("an unexplained short vertical stroke lies between this symbol and its neighbour")
    if p["shape"] == "circle" and p["X"] < 1.18:
        flags.append("DISAGREE")
        notes.append("read Mach is below 1.2 but text p8 says air-off Mach numbers varied from 1.2 to 4.2")
    notes.append(f"free-flight model; model number not printed; figure 1 note says models 1f through 5f are free-flight models; by d/D {dd} this is model {CAND[dd]}f")
    if p["shape"] == "circle":
        notes.append("key gives Re=0.8M x10^6 (air off), so Re depends on the point's Mach; text p8: Reynolds number varied linearly with Mach number from 1.0x10^6 to 3.3x10^6")
    notes.append("mach is the Mach read from the x axis (no separate value printed)")
    notes.append("C_D read on this curve's own label column (labels 0 .1 .2 .3 printed left of panel; zero is the grid line labelled 0 in the column under this d/D label)")
    notes.append(f"px=({p['px']:.1f},{p['py']:.1f}) on 600 dpi render of PDF p14")
    qu, xu = sym_unc(p, half, extra)
    row(reader_id=RID, part="B", figure="7", panel="b", model="", d_over_D=dd, series_key_text=txt + f"; curve label d/D={dd}",
        measured_or_estimate="measured", quantity_label="Total drag coefficient, C_D", quantity=fmt(p["Y"], 4), quantity_unc=qu,
        x_label="Mach number, M", x=fmt(p["X"], 3), x_unc=xu, mach=fmt(p["X"], 2), reynolds=re_,
        reynolds_basis="body length (p6 symbols: Re free-stream Reynolds number based on body length); not restated for free flight",
        source_kind="symbol", flag=";".join(dict.fromkeys(flags)), note="; ".join(notes))

# ---- figure 10
for nm, M, RE in (("10a", "1.44", "3140000"), ("10b", "1.99", "2010000")):
    r = res(nm)
    for p in r["points"]:
        dd = {"1": "0.075", "2": "0.15", "3": "0.30"}[p["id"][1]]
        mod = {"0.075": "7", "0.15": "8", "0.30": "9"}[dd]
        notes = [f"model number not printed on figure 10; by figure 1(b) table d/D {dd} is model {mod}; d_over_D is the figure 1 value nearest the x reading",
                 f"px=({p['px']:.1f},{p['py']:.1f}) on 600 dpi render of PDF p15"]
        qu, xu = sym_unc(p, 14)
        row(reader_id=RID, part="B", figure="10", panel="", model="", d_over_D=dd, series_key_text="Foredrag",
            measured_or_estimate="measured", quantity_label="Foredrag coefficient, C_DF", quantity=fmt(p["Y"], 4), quantity_unc=qu,
            x_label="Bluntness, d/D", x=fmt(p["X"], 4), x_unc=xu, mach=M, reynolds=RE, reynolds_basis=LEN_BASIS,
            source_kind="symbol", flag="OTHER", note="; ".join(notes))

# ---- figure 16
r = res("16")
ov = overlaps(r["points"], 30)
K16 = {"2": ("[square] 2 Hemisphere-Cone .075 3.00", "0.075", 15), "3": ("<> 3 Hemisphere-Cone 150 3.00", "0.150", 20),
       "4": ("right-pointing triangle 4 Hemisphere-Cone 300 3.00", "0.300", 13), "5": ("skewed triangle 5 Hemisphere-Cone .500 3.00", "0.500", 13),
       "7": ("D-shaped symbol 7 Hemisphere-Cone .075 2.81", "0.075", 14), "8": ("D-shaped symbol 8 Hemisphere-Cone 150 2.62", "0.150", 14),
       "9": ("small circle 9 Hemisphere-Cone 300 2.24", "0.300", 14)}
M16 = {"124": ("1.24", "2420000"), "144": ("1.44", "3140000"), "196": ("1.96", "4140000"), "199": ("1.99", "2010000"),
       "306": ("3.06", "4000000"), "367": ("3.67", "3450000")}
for p in r["points"]:
    mod = p["model"]
    txt, dd, half = K16[mod]
    key = p["id"].split("_")[1][:3]
    M, RE = M16[key]
    flags, notes = [], []
    extra = 0.0
    if p["id"].endswith(("u", "l")) and "196" in p["id"]:
        flags.append("OVERLAP")
        notes.append("two diamonds drawn almost on top of each other (doubled point); both transcribed")
        extra = 4.0
    elif ov[p["id"]]:
        flags.append("OVERLAP")
        notes.append("overlaps " + "/".join(ov[p["id"]]))
        extra = 4.0
    if p.get("fixed"):
        extra = max(extra, 3.0)
        notes.append("centre from the symbol outline (bounding box) because a template match was poor or symbols overlap")
    notes.append(f"Mach column tied by leader line to printed Re={int(RE)/1e6:.2f}x10^6 at top of figure; mach is the p8 table value for that condition")
    notes.append("key prints d/D for models 3, 4, 8, 9 without the decimal point (150, 300)")
    notes.append(f"px=({p['px']:.1f},{p['py']:.1f}) on 600 dpi render of PDF p20")
    qu, xu = sym_unc(p, half, extra)
    row(reader_id=RID, part="B", figure="16", panel="", model=mod, d_over_D=dd, series_key_text=txt,
        measured_or_estimate="measured", quantity_label="Foredrag coefficient, C_DF (a small mark by the C may be a prime)",
        quantity=fmt(p["Y"], 4), quantity_unc=qu, x_label="Mach number, M", x=fmt(p["X"], 3), x_unc=xu, mach=M, reynolds=RE,
        reynolds_basis=LEN_BASIS, source_kind="symbol", flag=";".join(dict.fromkeys(flags)), note="; ".join(notes))

# ---- figure 5 symbols
r = res("5")
for p in r["points"]:
    is4 = p["id"].startswith("C4p")
    flags, notes = [], []
    extra = 0.0
    if p["id"] in ("C4p_b", "S6p_a"):
        flags.append("OVERLAP")
        notes.append("circle C4p_b and square S6p_a are drawn on top of each other near M=2; the square's centre was placed from its visible corners")
        extra = 5.0
    notes.append("figure 4 prints M=" + ("1.50, 1.97, 3.10 for model 4p" if is4 else "1.97, 3.04, 3.80 for model 6p") + "; x here is the Mach read from the figure 5 axis")
    notes.append("Re not printed; p8 text: pressure tests at an average Reynolds number of about 4x10^6")
    notes.append(f"px=({p['px']:.1f},{p['py']:.1f}) on 600 dpi render of PDF p11")
    qu, xu = sym_unc(p, 15, extra)
    row(reader_id=RID, part="B", figure="5", panel="", model="4p" if is4 else "6p", d_over_D="0.300" if is4 else "1.000",
        series_key_text="o Model 4p" if is4 else "[square] Model 6p", measured_or_estimate="measured",
        quantity_label="Wave drag coefficient, C_DW", quantity=fmt(p["Y"], 4), quantity_unc=qu,
        x_label="Mach number, M", x=fmt(p["X"], 3), x_unc=xu, mach=fmt(p["X"], 2), reynolds="4000000",
        reynolds_basis=LEN_BASIS, source_kind="symbol", flag=";".join(flags), note="; ".join(notes))

# ---- figure 5 curves
r5 = res("5")
dy = abs((r5["hfits"][0]["c0"] - r5["hfits"][-1]["c0"])) / 1.0  # px per 1.0 CDW
dydpx = 1.0 / dy
dxdpx = 0.5 / 124.0
for line in open(os.path.join(W, "fig5_curves.txt")):
    if line.startswith("#") or not line.strip():
        continue
    parts = line.split(None, 3)
    X, E, S = parts[0], parts[1], parts[2]
    rest = parts[3].strip() if len(parts) > 3 else ""
    merged = "merged" in rest or "single line" in rest or rest.startswith("w")
    for code, val in (("E", E), ("S", S)):
        if val == "-":
            continue
        flags = ["CURVE"]
        notes = []
        if merged:
            flags.append("OVERLAP")
            notes.append("solid and dashed curves coincide here within line width; same value given to both")
            u = dydpx * 9
        else:
            u = dydpx * 5
        if rest:
            notes.append(rest)
        notes.append("curve read at single-pixel columns; value is the centre of the line")
        row(reader_id=RID, part="B", figure="5", panel="", model="",
            d_over_D="",
            series_key_text=("---- Empirical formula, C_DW=(2P_t-1)/3" if code == "E" else "____ Estimated from experiment, ref. 16 and 17"),
            measured_or_estimate="estimate", quantity_label="Wave drag coefficient, C_DW", quantity=val, quantity_unc=unc(u),
            x_label="Mach number, M", x=X, x_unc=unc(dxdpx * 3), mach=X, reynolds="", reynolds_basis="",
            source_kind="curve", flag=";".join(flags), note="; ".join(notes))

with open(os.path.join(A, "readerA_drag.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(H)
    w.writerows(drag)

# ---------------------------------------------------------------- geometry
G = ["reader_id", "model", "d_over_D", "cone_half_angle_as_printed", "D_in", "L_in", "role", "note"]
NOTE_A = "figure 1(a) table (p7); L not printed as a number, caption (a) says constant L/D=3"
geo = [
    ["2", ".075", "8° 52'", "1.75", "", "force", NOTE_A],
    ["3", ".150", "8° 15'", "1.75", "", "force", NOTE_A],
    ["4", ".300", "6° 59'", "1.75", "", "force", NOTE_A],
    ["5", ".500", "5° 10'", "1.75", "", "force", NOTE_A],
    ["2f", ".075", "8° 52'", "0.45", "", "free-flight", NOTE_A + "; figure 1 note: Models 1f through 5f are free-flight models"],
    ["3f", ".150", "8° 15'", "0.45", "", "free-flight", NOTE_A + "; figure 1 note: Models 1f through 5f are free-flight models"],
    ["4f", ".300", "6° 59'", "0.45", "", "free-flight", NOTE_A + "; figure 1 note: Models 1f through 5f are free-flight models"],
    ["5f", ".500", "5° 10'", "0.45", "", "free-flight", NOTE_A + "; figure 1 note: Models 1f through 5f are free-flight models"],
    ["4p", ".300", "6° 59'", "2.00", "", "pressure", NOTE_A + "; figure 1 note: 4p, 5p, and 6p are pressure distribution models"],
    ["5p", ".500", "5° 10'", "2.00", "", "pressure", NOTE_A + "; figure 1 note: 4p, 5p, and 6p are pressure distribution models"],
    ["6p", "1.000", "0", "4.00", "", "pressure", "figure 1(a) table (p7); hemisphere-cylinder (sketch in figure 4(c)); L not printed; figure 1 note: 4p, 5p, and 6p are pressure distribution models"],
    ["7", ".075", "9° 28' (sketch, series value)", "1.75", "", "force", "figure 1(b) (p7): table gives d/D .075 and L/D 2.81; sketch prints omega=9°28', D=1.75 and 5.25 (virtual-apex length); L not printed; figure 10 caption says constant cone angle=18°56' (twice 9°28'), see DISAGREE note in notes file"],
    ["8", ".150", "9° 28' (sketch, series value)", "1.75", "", "force", "figure 1(b) (p7): table gives d/D .150 (printed with a stray mark) and L/D 2.62; sketch prints omega=9°28', D=1.75 and 5.25 (virtual-apex length); L not printed; figure 10 caption says constant cone angle=18°56'"],
    ["9", ".300", "9° 28' (sketch, series value)", "1.75", "", "force", "figure 1(b) (p7): table gives d/D .300 and L/D 2.24; sketch prints omega=9°28', D=1.75 and 5.25 (virtual-apex length); L not printed; figure 10 caption says constant cone angle=18°56'"],
]
with open(os.path.join(A, "readerA_geometry.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(G)
    for g in geo:
        w.writerow([RID] + g)

# ---------------------------------------------------------------- calibration
C = ["reader_id", "figure", "panel", "axis", "tick_label", "pixel_x", "pixel_y", "render_dpi"]
cal = []


def lab(v, style):
    if style == "int":
        return str(int(round(v)))
    if abs(v) < 1e-9:
        return "0"
    s = f"{v:.{style}f}"
    if abs(v) < 1:
        s = s.replace("0.", ".", 1)
    return s


def cal_x(fig, pan, r, vals, style, yref, axis="x"):
    for f_ in r["vfits"]:
        if any(abs(f_["val"] - v) < 1e-6 for v in vals):
            cal.append([RID, fig, pan, axis, lab(f_["val"], style), f"{f_['c0'] + f_['c1'] * yref:.1f}", f"{yref:.1f}", DPI])


def cal_y(fig, pan, r, scale, vals, style, xref, axis):
    for f_ in r["hfits"]:
        if scale in f_["vals"] and any(abs(f_["vals"][scale] - v) < 1e-6 for v in vals):
            cal.append([RID, fig, pan, axis, lab(f_["vals"][scale], style), f"{xref:.1f}", f"{f_['c0'] + f_['c1'] * xref:.1f}", DPI])


r = res("4a")
for f_ in r["vfits"]:
    if f_["val"] in (0.0, 0.5, 1.0):
        cal.append([RID, "4", "a", "x (unlabelled grid; value assumed)", lab(f_["val"], 1), f"{f_['c0'] + f_['c1'] * 3073:.1f}", "3073.0", DPI])
for sc in ("M=3.10", "M=1.97", "M=1.50"):
    cal_y("4", "a", r, sc, [2.0, 1.6, 1.2, 0.8, 0.4, 0.0, -0.4], 1, 935, f"y ({sc} label column)")
r = res("4b")
cal_x("4", "b", r, [0, .2, .4, .6, .8, 1.0], 1, 5880)
for sc in ("M=3.06", "M=1.97", "M=1.54"):
    cal_y("4", "b", r, sc, [2.0, 1.6, 1.2, 0.8, 0.4, 0.0, -0.4], 1, 955, f"y ({sc} label column)")
r = res("4c")
cal_x("4", "c", r, [0, .2, .4, .6, .8, 1.0], 1, 3266)
cal_y("4", "c", r, "P", [2.0, 1.6, 1.2, 0.8, 0.4, 0.0, -0.4], 1, 3168, "y")
r = res("5")
cal_x("5", "", r, [0, 1, 2, 3, 4, 5, 6, 7, 8], "int", 3600)
cal_y("5", "", r, "CDW", [0.2, 0.4, 0.6, 0.8, 1.0], 1, 2990, "y")
r = res("7a")
cal_x("7", "a", r, [1.0, 1.4, 1.8, 2.2, 2.6, 3.0, 3.4, 3.8], 1, 2022)
for sc in ("dD.50", "dD.30", "dD.15", "dD.075"):
    cal_y("7", "a", r, sc, [0.0, 0.1, 0.2], 1, 897, f"y (d/D={sc[2:]} label column)")
r = res("7b")
cal_x("7", "b", r, [0, 1, 2, 3, 4, 5, 6, 7, 8], "int", 4247)
for sc in ("dD.50", "dD.30", "dD.15", "dD.075"):
    cal_y("7", "b", r, sc, [0.0, 0.1, 0.2, 0.3], 1, 898, f"y (d/D={sc[2:]} label column)")
r = res("8L")
cal_x("8", "", r, [0, .1, .2, .3, .4, .5], 1, 2436, "x (left column, M=1.96 panel bottom)")
for sc in ("M1.24", "M1.44", "M1.96"):
    cal_y("8", "", r, sc, [0.0, 0.1, 0.2], 1, 3020, f"y ({sc[0]}={sc[1:]} panel)")
r = res("8R")
cal_x("8", "", r, [0, .1, .2, .3, .4, .5], 1, 2433, "x (right column, M=3.67 panel bottom)")
for sc in ("M3.06", "M3.67"):
    cal_y("8", "", r, sc, [0.0, 0.1, 0.2], 1, 4222, f"y ({sc[0]}={sc[1:]} panel)")
r = res("10a")
cal_x("10", "", r, [0, .1, .2, .3, .4, .5], 1, 4450, "x (M=1.44 panel bottom)")
cal_y("10", "", r, "M1.44", [0.0, 0.1, 0.2, 0.3], 1, 3045, "y (M=1.44 panel)")
r = res("10b")
cal_x("10", "", r, [0, .1, .2, .3, .4, .5], 1, 6010, "x (M=1.99 panel bottom)")
cal_y("10", "", r, "M1.99", [0.0, 0.1, 0.2, 0.3], 1, 3055, "y (M=1.99 panel)")
r = res("16")
cal_x("16", "", r, [1.0, 1.4, 1.8, 2.2, 2.6, 3.0, 3.4, 3.8], 1, 5130)
cal_y("16", "", r, "C", [0.0, 0.04, 0.08, 0.12, 0.16, 0.20, 0.24], 2, 1050, "y")
with open(os.path.join(A, "readerA_calibration.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(C)
    w.writerows(cal)

print(len(pres_rows), "pressure rows;", len(drag), "drag rows;", len(geo), "geometry rows;", len(cal), "calibration rows")
