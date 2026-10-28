"""Pair reading A with reading B of the flat-face pressure sets (0014 10.7 (af)).

Run from anywhere with:  python3 -I pair.py [readers_dir] [out_dir]
readers_dir defaults to the folder above this script (it holds A/ and B/);
out_dir defaults to this script's folder.

The pairing compares the two readings with each other only. It never
averages, rounds or settles a value; where the readers differ it records
both values and their envelope.

Rules (also written to pairing.txt):

Figures. Points are matched on the plotted mark. Both readers give each
symbol's centre in native 300 dpi pixels of the same page image (TM X-19
page 20 turned 90 deg clockwise by both), so a point of A and a point of B
are the same mark when their centres lie within MATCH_PX of each other
(closest pairs first, each point used once, same figure part). A row with
no value (illegible) is then matched to a still unmatched row of the other
reader of the same series within ILLEGIBLE_PX (or, without pixel centres,
within ILLEGIBLE_POS in position units). Everything left is read once.
Model (series) and location labels of a matched pair are compared and
every difference is listed; a label difference does not unmatch a pair.
Two figure values agree when, on each coordinate, the difference is at
most the sum of the two readers' stated reading errors on that coordinate
(position and value). TN 4300 fig. 16(b) positions are station numbers
and must be equal. Alternatives do not make figure values agree; where an
alternative of one reader lies within the summed errors of a value or
alternative of the other, the pair says so (alt_overlap).

Tables (TN D-5392). Rows are matched on the orifice number. Two values
agree when the printed digits are identical, or when the readers' sets of
readings (primary value and every alternative) share a value; the second
case is marked "agree (alternatives)". The orifice label (with its
asterisk), the meridian phi, s/d and the location are compared as labels.
"""

import csv
import os
import re
import sys
from decimal import Decimal

MATCH_PX = 8.0
ILLEGIBLE_PX = 12.0
ILLEGIBLE_POS = Decimal("0.02")

HERE = os.path.dirname(os.path.abspath(__file__))
READERS = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(HERE)
OUT = sys.argv[2] if len(sys.argv) > 2 else HERE

FIGS = ["tn4300_fig7", "tn4300_fig16", "rml57c18_fig5", "tmx19_fig5"]
TABLES = ["tnd5392_table1", "tnd5392_table2", "tnd5392_table3"]


def load(reader, name):
    with open(os.path.join(READERS, reader, name + ".csv"), newline="") as f:
        rows = list(csv.DictReader(f))
    for i, r in enumerate(rows, 1):
        r["_row"] = i
        r["_reader"] = reader
    return rows


def dec(s):
    s = (s or "").strip()
    if not s:
        return None
    try:
        return Decimal(s)
    except Exception:
        return None


def num_alts(s):
    """Numeric alternatives (the leading number of each ';' item)."""
    out = []
    for part in (s or "").split(";"):
        m = re.match(r"\s*(-?\d*\.\d+|-?\d+)", part)
        if m:
            out.append(Decimal(m.group(1)))
    return out


# ---------------------------------------------------------------- figures

VALUE_Q = ("p_l/p_t,2", "p_l/p_o", "C_p", "Cp", "p")
POS_Q = ("x/r", "s")
ERR_RE = re.compile(r"\+-(\d*\.\d+) in (p_l/p_t,2|p_l/p_o|C_p|Cp|x/r|s|p)(?=[,;)\s]|$)")

# Reader A's fig. 16(a) grid scale (method.md 4.3): 0.01 x/r per 9.55 px,
# 0.005 p per 9.47 px. Used only where A states an error in pixels.
A_F16A_PX = (Decimal("0.01") / Decimal("9.55"), Decimal("0.005") / Decimal("9.47"))


def errors(row, name):
    """(position error, value error, how) from the row's note."""
    pe = ve = None
    for m in ERR_RE.finditer(row["note"]):
        q = m.group(2)
        v = Decimal(m.group(1))
        if q in POS_Q and pe is None:
            pe = v
        elif q in VALUE_Q and ve is None:
            ve = v
    how = "stated"
    if ve is None and row["_reader"] == "A" and name == "tn4300_fig16":
        m = re.search(r"\(\+-(\d+(?:\.\d+)?) px", row["note"])
        if m and row["value"]:
            px = Decimal(m.group(1))
            pe = (px * A_F16A_PX[0]).quantize(Decimal("0.0001"))
            ve = (px * A_F16A_PX[1]).quantize(Decimal("0.0001"))
            how = "A states +-%s px; converted with A's stated grid scale" % m.group(1)
    return pe, ve, how


def pixel(row):
    n = row["note"]
    pats = [r"centre \((-?[\d.]+), (-?[\d.]+)\) px set by eye",
            r"centre px \((-?[\d.]+), (-?[\d.]+)\)",
            r"centre \((-?[\d.]+), (-?[\d.]+)\) px",
            r"near \((-?[\d.]+), (-?[\d.]+)\) px"]
    for p in pats:
        m = re.search(p, n)
        if m:
            return (float(m.group(1)), float(m.group(2)))
    return None


def series(name, row):
    m, n, r = row["model"], row["note"], row["_reader"]
    if name == "tn4300_fig7":
        if m.strip() == "unclear":
            return "unclear"
        if "Unitary" in m:
            return "4-in. Unitary tunnel, square"
        if "ref. 3" in m:
            return "3-in. ref. 3, diamond"
        if "model D" in m:
            if n.startswith("solid circle"):
                return "4-in. model D, solid circle"
            if n.startswith("open circle") or "no open circle" in n:
                return "4-in. model D, open circle"
        return "?"
    if name == "tn4300_fig16":
        if "run 1" in m:
            return "model A run 1, circle"
        if "run 2" in m:
            return "model A run 2, diamond"
        if "run 3" in m:
            return "model A run 3, triangle"
        if "not in the legend" in m:
            return "model A, symbol not in the legend"
        if m.strip() == "unclear":
            return "unclear"
        if not row["value"]:
            if "diamond" in n:
                return "model A run 2, diamond"
            if "circle" in n:
                return "model A run 1, circle"
            return "model A, symbol not identified"
        return "?"
    if name == "rml57c18_fig5":
        return {"fig. 5(b)": "model B", "fig. 5(c)": "model C",
                "fig. 5(d)": "model D", "fig. 5(f)": "model F"}.get(row["item"], "?")
    if name == "tmx19_fig5":
        return "4-in. flat-face cylinder, circle"
    return "?"


def part(name, row):
    if name == "tn4300_fig16":
        return row["item"]
    return "all"


def fig_pairs(name):
    A, B = load("A", name), load("B", name)
    for rows in (A, B):
        for r in rows:
            r["_px"] = pixel(r)
            r["_ser"] = series(name, r)
            r["_pe"], r["_ve"], r["_errhow"] = errors(r, name)
            r["_val"] = dec(r["value"])
            r["_pos"] = dec(r["position"])
    pairs, usedA, usedB = [], set(), set()
    cand = []
    for a in A:
        for b in B:
            if a["_val"] is None or b["_val"] is None:
                continue
            if part(name, a) != part(name, b) or a["_px"] is None or b["_px"] is None:
                continue
            d = ((a["_px"][0] - b["_px"][0]) ** 2 + (a["_px"][1] - b["_px"][1]) ** 2) ** 0.5
            if d <= MATCH_PX:
                cand.append((d, a["_row"], b["_row"], a, b))
    for d, _, _, a, b in sorted(cand, key=lambda t: (t[0], t[1], t[2])):
        if a["_row"] in usedA or b["_row"] in usedB:
            continue
        usedA.add(a["_row"]); usedB.add(b["_row"])
        pairs.append((a, b, d, "same mark (pixel centres)"))
    # illegible rows against unmatched rows of the other reader, same series
    for x, others, usedX, usedO, xa in ((A, B, usedA, usedB, True), (B, A, usedB, usedA, False)):
        for r in x:
            if r["_row"] in usedX or r["_val"] is not None:
                continue
            best = None
            for o in others:
                if o["_row"] in usedO or part(name, o) != part(name, r) or o["_ser"] != r["_ser"]:
                    continue
                if r["_px"] and o["_px"]:
                    d = ((r["_px"][0] - o["_px"][0]) ** 2 + (r["_px"][1] - o["_px"][1]) ** 2) ** 0.5
                    if d <= ILLEGIBLE_PX and (best is None or d < best[0]):
                        best = (d, o, "illegible row matched by series and pixel position")
                elif r["_pos"] is not None and o["_pos"] is not None:
                    dp = abs(r["_pos"] - o["_pos"])
                    if dp <= ILLEGIBLE_POS and (best is None or float(dp) < best[0]):
                        best = (float(dp), o, "illegible row matched by series and position")
            if best:
                usedX.add(r["_row"]); usedO.add(best[1]["_row"])
                a, b = (r, best[1]) if xa else (best[1], r)
                d = best[0] if "pixel" in best[2] else None
                pairs.append((a, b, d, best[2]))
    for a in A:
        if a["_row"] not in usedA:
            pairs.append((a, None, None, "no row of B on this mark"))
    for b in B:
        if b["_row"] not in usedB:
            pairs.append((None, b, None, "no row of A on this mark"))

    def key(p):
        r = p[0] or p[1]
        return (part(name, r), r["_ser"] if name == "rml57c18_fig5" else "",
                float(r["_pos"]) if r["_pos"] is not None else 99.0,
                -(float(r["_val"]) if r["_val"] is not None else -99.0))
    pairs.sort(key=key)
    return A, B, pairs


def loc_key(a, b):
    if a and b:
        return a["location"] if a["location"] == b["location"] else "%s (A) / %s (B)" % (a["location"], b["location"])
    return (a or b)["location"]


def fig_rows(name, pairs):
    out = []
    for i, (a, b, d, how) in enumerate(pairs, 1):
        rec = {"pair": "%s-%02d" % (name, i), "match": how}
        for tag, r in (("A", a), ("B", b)):
            rec["row_" + tag] = r["_row"] if r else ""
            rec["item_" + tag] = r["item"] if r else ""
            rec["model_" + tag] = r["model"] if r else ""
            rec["series_" + tag] = r["_ser"] if r else ""
            rec["location_" + tag] = r["location"] if r else ""
            rec["mach_" + tag] = r["mach"] if r else ""
            rec["reynolds_" + tag] = r["reynolds"] if r else ""
            rec["position_" + tag] = r["position"] if r else ""
            rec["pos_err_" + tag] = str(r["_pe"]) if r and r["_pe"] is not None else ""
            rec["value_" + tag] = r["value"] if r else ""
            rec["val_err_" + tag] = str(r["_ve"]) if r and r["_ve"] is not None else ""
            rec["err_source_" + tag] = r["_errhow"] if r else ""
            rec["alternatives_" + tag] = r["alternatives"] if r else ""
            rec["flag_" + tag] = r["flag"] if r else ""
            rec["px_" + tag] = "%.2f, %.2f" % r["_px"] if r and r["_px"] else ""
            rec["page_" + tag] = r["page"] if r else ""
        rec["px_distance"] = "%.2f" % d if d is not None else ""
        rec["location"] = loc_key(a, b)
        rec["model_label"] = ""
        rec["location_label"] = ""
        rec["d_position"] = rec["pos_tol"] = rec["d_value"] = rec["val_tol"] = ""
        rec["envelope_low"] = rec["envelope_high"] = ""
        rec["envelope_all_low"] = rec["envelope_all_high"] = ""
        rec["alt_overlap"] = ""
        if a and b:
            rec["model_label"] = "same" if a["_ser"] == b["_ser"] else "differs"
            rec["location_label"] = "same" if a["location"] == b["location"] else "differs"
        if a and b and a["_val"] is not None and b["_val"] is not None:
            dv = abs(a["_val"] - b["_val"])
            vt = (a["_ve"] or 0) + (b["_ve"] or 0)
            if name == "tn4300_fig16" and a["item"] == "fig. 16(b)":
                pos_ok = a["_pos"] == b["_pos"]
                rec["d_position"] = str(abs(a["_pos"] - b["_pos"]))
                rec["pos_tol"] = "station numbers must be equal"
            else:
                dp = abs(a["_pos"] - b["_pos"])
                pt = (a["_pe"] or 0) + (b["_pe"] or 0)
                pos_ok = dp <= pt
                rec["d_position"], rec["pos_tol"] = str(dp), str(pt)
            val_ok = dv <= vt
            rec["d_value"], rec["val_tol"] = str(dv), str(vt)
            if a["_ve"] is None or b["_ve"] is None:
                rec["val_tol"] += " (an error is not stated)"
            if pos_ok and val_ok:
                st = "agree"
            elif not val_ok and not pos_ok:
                st = "disagree (value and position)"
            elif not val_ok:
                st = "disagree (value)"
            else:
                st = "disagree (position)"
            rec["status"] = st
            lo, hi = min(a["_val"], b["_val"]), max(a["_val"], b["_val"])
            rec["envelope_low"], rec["envelope_high"] = str(lo), str(hi)
            sa = [a["_val"]] + num_alts(a["alternatives"])
            sb = [b["_val"]] + num_alts(b["alternatives"])
            allv = sa + sb
            rec["envelope_all_low"], rec["envelope_all_high"] = str(min(allv)), str(max(allv))
            if st != "agree":
                hits = []
                for x in sa:
                    for y in sb:
                        if (x, y) != (a["_val"], b["_val"]) and abs(x - y) <= vt:
                            hits.append("A %s ~ B %s" % (x, y))
                rec["alt_overlap"] = "; ".join(hits) if hits else "none"
        elif a and b:
            who = "A" if a["_val"] is None else "B"
            if a["_val"] is None and b["_val"] is None:
                who = "A and B"
            rec["status"] = "illegible (%s)" % who
        elif a:
            rec["status"] = "illegible (A, no row of B)" if a["_val"] is None else "read once (A)"
        else:
            rec["status"] = "illegible (B, no row of A)" if b["_val"] is None else "read once (B)"
        out.append(rec)
    return out


FIG_COLS = ["pair", "status", "location", "model_label", "location_label",
            "item_A", "item_B", "series_A", "series_B", "model_A", "model_B",
            "location_A", "location_B", "mach_A", "mach_B", "reynolds_A", "reynolds_B",
            "position_A", "position_B", "pos_err_A", "pos_err_B", "d_position", "pos_tol",
            "value_A", "value_B", "val_err_A", "val_err_B", "d_value", "val_tol",
            "envelope_low", "envelope_high", "envelope_all_low", "envelope_all_high",
            "alternatives_A", "alternatives_B", "alt_overlap", "flag_A", "flag_B",
            "err_source_A", "err_source_B", "px_A", "px_B", "px_distance", "match",
            "page_A", "page_B", "row_A", "row_B"]

# ----------------------------------------------------------------- tables

ORIF_RE = re.compile(r"orifice (\d+)(\*?)(?= \(|;|,|$)")


def orifice(row):
    m = ORIF_RE.search(row["note"])
    return (int(m.group(1)), m.group(2)) if m else (None, "")


def phi(row):
    m = re.search(r"phi = (\d+)", row["position_quantity"])
    return m.group(1) if m else ""


def table_rows(name):
    A, B = load("A", name), load("B", name)
    ia = {orifice(r)[0]: r for r in A}
    ib = {orifice(r)[0]: r for r in B}
    out = []
    keys = sorted(set(ia) | set(ib), key=lambda k: (k is None, k))
    for k in keys:
        a, b = ia.get(k), ib.get(k)
        rec = {"pair": "%s-%02d" % (name, k), "orifice": k}
        for tag, r in (("A", a), ("B", b)):
            o = orifice(r) if r else (None, "")
            rec["orifice_label_" + tag] = ("%d%s" % o) if r else ""
            rec["phi_" + tag] = phi(r) if r else ""
            rec["s_d_" + tag] = r["position"] if r else ""
            rec["location_" + tag] = r["location"] if r else ""
            rec["mach_" + tag] = r["mach"] if r else ""
            rec["value_" + tag] = r["value"] if r else ""
            rec["alternatives_" + tag] = r["alternatives"] if r else ""
            rec["flag_" + tag] = r["flag"] if r else ""
            rec["page_" + tag] = r["page"] if r else ""
            rec["row_" + tag] = r["_row"] if r else ""
        rec["labels"] = ""
        rec["envelope_low"] = rec["envelope_high"] = ""
        rec["envelope_all_low"] = rec["envelope_all_high"] = ""
        if a and b:
            diffs = []
            if rec["orifice_label_A"] != rec["orifice_label_B"]:
                diffs.append("orifice label")
            if rec["phi_A"] != rec["phi_B"]:
                diffs.append("phi")
            if rec["s_d_A"] != rec["s_d_B"]:
                diffs.append("s/d")
            if rec["location_A"] != rec["location_B"]:
                diffs.append("location")
            if rec["mach_A"] != rec["mach_B"]:
                diffs.append("mach")
            rec["labels"] = "same" if not diffs else "differ: " + ", ".join(diffs)
            rec["location"] = loc_key(a, b)
            va, vb = a["value"].strip(), b["value"].strip()
            if not va or not vb:
                rec["status"] = "illegible (%s)" % ("A" if not va else "B")
            else:
                sa = [va] + [x.strip() for x in a["alternatives"].split(";") if x.strip()]
                sb = [vb] + [x.strip() for x in b["alternatives"].split(";") if x.strip()]
                if va == vb:
                    rec["status"] = "agree"
                elif set(sa) & set(sb):
                    rec["status"] = "agree (alternatives)"
                else:
                    rec["status"] = "disagree"
                pv = [Decimal(va), Decimal(vb)]
                av = [Decimal(x) for x in sa + sb]
                rec["envelope_low"], rec["envelope_high"] = str(min(pv)), str(max(pv))
                rec["envelope_all_low"], rec["envelope_all_high"] = str(min(av)), str(max(av))
        else:
            r = a or b
            rec["location"] = r["location"]
            who = "A" if a else "B"
            rec["status"] = ("illegible (%s, no row of the other)" % who) if not r["value"].strip() else "read once (%s)" % who
        out.append(rec)
    return A, B, out


TAB_COLS = ["pair", "orifice", "status", "location", "labels",
            "orifice_label_A", "orifice_label_B", "phi_A", "phi_B", "s_d_A", "s_d_B",
            "location_A", "location_B", "mach_A", "mach_B", "value_A", "value_B",
            "envelope_low", "envelope_high", "envelope_all_low", "envelope_all_high",
            "alternatives_A", "alternatives_B", "flag_A", "flag_B",
            "page_A", "page_B", "row_A", "row_B"]

# --------------------------------------------------------------- geometry


def geo_load(reader):
    with open(os.path.join(READERS, reader, "geometry.csv"), newline="") as f:
        rows = list(csv.DictReader(f))
    for i, r in enumerate(rows, 1):
        r["_row"] = i
    return rows


GA, GB = geo_load("A"), geo_load("B")


def gfind(rows, source, quantity):
    for r in rows:
        if r["source"] == source and r["quantity"] == quantity:
            return r
    raise KeyError((source, quantity))


def require(text, numbers):
    """Check that every hand-copied number really is in the source text."""
    for n in numbers:
        if n not in text:
            raise ValueError("number %s not found in %r" % (n, text[:80]))


def cmp_lists(la, lb, tol):
    la, lb = sorted(Decimal(x) for x in la), sorted(Decimal(x) for x in lb)
    if len(la) != len(lb):
        return "differ", "A %d values, B %d values" % (len(la), len(lb))
    d = [abs(x - y) for x, y in zip(la, lb)]
    worst = max(d) if d else Decimal(0)
    bad = ["A %s / B %s" % (x, y) for x, y, e in zip(la, lb, d) if e > tol]
    if bad:
        return "differ", "differences over %s: %s (largest %s)" % (tol, "; ".join(bad), worst)
    return "agree", "all within %s (largest difference %s)" % (tol, worst)


def geometry_pairs():
    out = []
    usedA, usedB = set(), set()

    def add(source, topic, qa, qb, verdict, detail):
        ra = [gfind(GA, source, q) for q in qa]
        rb = [gfind(GB, source, q) for q in qb]
        for r in ra:
            usedA.add(r["_row"])
        for r in rb:
            usedB.add(r["_row"])
        out.append({
            "source": source, "topic": topic, "comparison": verdict, "detail": detail,
            "quantity_A": " | ".join(r["quantity"] for r in ra),
            "value_A": " | ".join(r["value"] for r in ra),
            "unit_A": " | ".join(r["unit"] for r in ra),
            "page_A": " | ".join(r["page"] for r in ra),
            "note_A": " | ".join(r["note"] for r in ra),
            "quantity_B": " | ".join(r["quantity"] for r in rb),
            "value_B": " | ".join(r["value"] for r in rb),
            "unit_B": " | ".join(r["unit"] for r in rb),
            "page_B": " | ".join(r["page"] for r in rb),
            "note_B": " | ".join(r["note"] for r in rb),
            "rows_A": " ".join(str(r["_row"]) for r in ra),
            "rows_B": " ".join(str(r["_row"]) for r in rb),
        })

    T, R, X, D = "TN 4300", "RM L57C18", "TM X-19", "TN D-5392"
    # ---- TN 4300
    add(T, "models tested", ["models tested (table I)"],
        ["model D (pressure model of fig. 7) diameter", "model A (pressure model of fig. 16) diameter",
         "model B diameter", "model C diameter"],
        "agree", "both: models A, B, C, D of table I; A in one row, B in one row per model")
    add(T, "diameter, model D", ["diameter, model D (pressure model of fig. 7)"],
        ["model D (pressure model of fig. 7) diameter"], "agree", "4 in. both")
    add(T, "diameter, model A", ["diameter, model A (pressure model of fig. 16)"],
        ["model A (pressure model of fig. 16) diameter"], "agree", "12 in. both")
    add(T, "diameters, models B and C", ["models tested (table I)"], ["model B diameter", "model C diameter"],
        "agree", "B 12 in., C 4 in. both (A in the note of its models row)")
    add(T, "model area / jet area, model D", ["model area / jet area, model D"],
        ["model D (pressure model of fig. 7) diameter"], "agree", "0.017 both (B in the note)")
    add(T, "model area / jet area, model A", ["model area / jet area, model A"],
        ["model A (pressure model of fig. 16) diameter"], "agree", "0.155 both (B in the note)")
    add(T, "corner", ["corner"], ["corner of the flat face"], "agree",
        "sharp, no radius given, both (A: 'sharp (no radius shown)', p. 28; B: 'sharp (square edge)', pp. 27, 28)")
    # model D sketch positions (fig. 3, schematic); hand-copied, checked against the text
    a = gfind(GA, T, "pressure orifice positions, model D")["note"]
    b = gfind(GB, T, "model D orifice positions (fig. 3, scaled)")["value"]
    aD = {"left": ["0.249", "0.457", "0.747", "0.824", "0.887", "0.948", "0.948"],
          "right": ["0.227", "0.514", "0.730", "0.859", "0.925", "0.969", "0.974"],
          "up": ["0.240", "0.767", "0.949"], "down": ["0.294", "0.601", "0.942"]}
    bD = {"left": ["0.947", "0.947", "0.888", "0.824", "0.748", "0.456", "0.249"],
          "right": ["0.227", "0.514", "0.729", "0.859", "0.926", "0.982", "0.986"],
          "up": ["0.242", "0.767", "0.949"], "down": ["0.294", "0.602", "0.942"]}
    for g in aD:
        require(a, aD[g]); require(b, bD[g])
    require(a, ["centre 0.025"]); require(b, ["r/R = 0 (centre)"])
    tolD = ((Decimal("0.9") + Decimal("1.0")) / Decimal("212.9")).quantize(Decimal("0.0001"))
    parts, worst = [], "agree"
    for g in aD:
        v, d = cmp_lists(aD[g], bD[g], tolD)
        parts.append("%s: %s, %s" % (g, v, d))
        if v != "agree":
            worst = "differ"
    parts.append("centre: A 0.025 (scaled; dot merged with a centre tick), B 'r/R = 0 (centre)' (not scaled): differ")
    worst = "differ"
    add(T, "orifice positions on the fig. 3 sketch, model D (r/R, scaled; the sketch is schematic)",
        ["pressure orifice positions, model D"], ["model D orifice positions (fig. 3, scaled)"], worst,
        "21 dots both. Tolerance: the two readers' outline-fit rms summed, (0.9 + 1.0) px / 212.9 px = %s in r/R. " % tolD
        + "; ".join(parts))
    a = gfind(GA, T, "pressure orifice positions, model A")["note"]
    b = gfind(GB, T, "model A orifice positions (fig. 3, scaled)")["value"]
    aA = {"centre": ["0.048"], "right": ["0.515", "0.745", "0.832", "0.902", "0.949", "0.987"],
          "left": ["0.747", "0.820", "0.876", "0.923", "0.978"],
          "45 deg": ["0.725"], "88 deg": ["0.801"], "129 deg": ["0.699"]}
    bA = {"centre": ["0.048"], "right": ["0.515", "0.745", "0.833", "0.903", "0.950", "0.989"],
          "left": ["0.978", "0.923", "0.876", "0.820", "0.747"],
          "45 deg": ["0.726"], "88 deg": ["0.801"], "129 deg": ["0.698"]}
    for g in aA:
        require(a, aA[g]); require(b, bA[g])
    tolA = ((Decimal("0.9") + Decimal("1.1")) / Decimal("338.9")).quantize(Decimal("0.0001"))
    parts, worst = [], "agree"
    for g in aA:
        v, d = cmp_lists(aA[g], bA[g], tolA)
        parts.append("%s: %s, %s" % (g, v, d))
        if v != "agree":
            worst = "differ"
    add(T, "orifice positions on the fig. 3 sketch, model A (r/R, scaled)",
        ["pressure orifice positions, model A"], ["model A orifice positions (fig. 3, scaled)"], worst,
        "15 dots both. Tolerance: (0.9 + 1.1) px / 338.9 px = %s in r/R. " % tolA + "; ".join(parts))
    add(T, "Mach number", ["Mach number"], ["Mach number (jet)"], "agree", "2 both (fig. 7 legend M = 2.00 for the present tests, both)")
    add(T, "jet total pressure at the data time", ["jet total pressure at the data time"],
        ["jet total pressure at the data time"], "agree", "A 'about 106', B 106 lb/sq in., both read from fig. 5(a), not printed")
    add(T, "jet total temperature at the data time", ["jet total temperature at the data time"],
        ["jet total temperature at the data time"], "agree",
        "A about 946, B 945 deg R, both read from fig. 5(b); difference 1 deg R, within B's stated +-2 deg R (A states no error)")
    add(T, "Reynolds number", ["Reynolds number"], ["Reynolds number"], "agree",
        "14 x 10^6 per ft both, text p. 11, stated there for the heat-transfer data of fig. 10. A adds: no Reynolds number is given for the pressure data of figs. 7 and 16 beyond 'sea-level'. Neither gives it on the diameter")
    add(T, "Reynolds number, Unitary tunnel 4-in. model", ["Reynolds number, Unitary tunnel 4-in. model"],
        ["Reynolds number"], "agree", "2.7 x 10^6 per ft both (B in the note of its Reynolds row)")
    add(T, "stated pressure accuracy", ["stated pressure accuracy"], ["stated accuracy of the pressures"],
        "agree", "not stated as a number, both; both quote p. 8 on the solid symbols being more reliable")
    add(T, "pressure normalisation", ["pressure normalisation"], ["pressure normalisation"], "agree",
        "p_l/p_o, o the stagnation point, 'the total pressure behind the shock', both (see normalisation.txt)")
    add(T, "comparison models in fig. 7", ["comparison models in fig. 7"], [], "A only",
        "B names the same two comparison series in its method.md 4.2 and fig. 7 CSV, not in geometry.csv")
    add(T, "position of the models in the jet", [], ["position of the models in the jet"], "B only", "")
    add(T, "table I content", [], ["table I content"], "B only",
        "A states the same in method.md section 7 (no pressures in table I, no tn4300_table1.csv)")
    # ---- RM L57C18
    add(R, "flat-faced models", ["flat-faced models"], ["flat-faced models"], "agree",
        "B, C, D, F both; A hemisphere and E dimpled not read, both")
    add(R, "corner radius, model B", ["corner radius, model B"], ["model B corner radius"], "agree", "1.0 in. both")
    add(R, "corner radius, model C", ["corner radius, model C"], ["model C corner radius"], "agree", "0.4 in. both")
    add(R, "corner radius, model D", ["corner radius, model D"], ["model D corner radius"], "agree", "0.1 in. both")
    add(R, "model F lip radius and face recess", ["corner radius, model F", "depression depth, model F"],
        ["model F lip radius and face recess"], "agree", "0.1 in. radius and 0.200 in. deep both")
    add(R, "body (base diameter, length, cone half-angle)",
        ["base diameter (all models)", "length, face to base", "cone half-angle of afterbody"],
        ["body shape (all models)"], "agree", "6.000 in., 4.115 in., 14.5 deg both; afterbody a cone, not a cylinder, both")
    add(R, "flat-face diameter, model B", ["face diameter, model B"], ["model B flat-face diameter (scaled)"], "differ",
        "not printed (both). A 2.323 in. derived from printed dimensions assuming a tangent corner arc; B about 2.7 in. scaled from the drawing ('drawing may not be to scale')")
    add(R, "flat-face diameter, model C", ["face diameter, model C"], ["model C flat-face diameter (scaled)"], "agree",
        "not printed (both). A 3.252 derived, B about 3.3 scaled: equal to B's one decimal")
    add(R, "flat-face diameter, model D", ["face diameter, model D"], ["model D flat-face diameter (scaled)"], "agree",
        "not printed (both). A 3.717 derived, B about 3.7 scaled: equal to B's one decimal")
    add(R, "flat-face diameter, model F", ["face diameter, model F"], ["model F recessed flat-face diameter (scaled)"],
        "A gives no value", "A: not printed, no value; B: about 2.6 in. scaled")
    add(R, "orifice positions and inset ticks",
        ["orifice positions"],
        ["model B orifice positions s", "model C orifice positions s", "model D orifice positions s",
         "model F orifice positions s"], "differ (C, D)",
        "A gives no s list in geometry.csv (it points to the plotted s in its fig. 5 CSV); B lists the s printed in table II (p. 16). "
        "Inset tick counts: model B agree (2 face, 1 corner arc, 1 at the arc-cone junction, 4 cone); "
        "model C differ (A: 2 face, 6 cone; B: 2 face, 1 at the end of the corner arc, 5 cone); "
        "model D differ (A: 1 face, a crowded group at the corner, 6 cone; B: 2 face, 1 corner arc, 1 at the arc end, 5 cone); "
        "model F agree on face and cone (A: 2 face, marks on the lip, 6 cone; B: 2 face, 1 lip, 6 cone)")
    add(R, "orifice plane", ["orifice positions"], ["orifice plane"], "agree",
        "same meridian plane as the thermocouples, opposite side, both (A in the note of its orifice row)")
    add(R, "Mach number", ["Mach number"], ["Mach number"], "agree", "2 both")
    add(R, "Reynolds number", ["Reynolds number"], ["Reynolds number"], "agree",
        "about 14 x 10^6 per ft (free stream) both; neither gives it on a diameter")
    add(R, "total pressure", ["total pressure"], ["total pressure"], "agree", "115 lb/sq in. abs. both")
    add(R, "stagnation temperature", ["stagnation temperature"], ["stagnation temperature"], "agree", "935 deg R both")
    add(R, "angles of attack and table I", ["angles of attack (table I)"], ["table I content"], "agree",
        "alpha 0 and 5 deg; table I is the sequence of tests and holds no conditions, both; B adds E and F at 0 deg only, A lists the alpha-0 tests")
    add(R, "stated pressure accuracy", ["stated pressure accuracy"], ["stated accuracy of the pressures"], "agree",
        "not stated, both; the 15 percent is for the heat-transfer data, both")
    add(R, "pressure normalisation", ["pressure normalisation"], ["pressure normalisation"], "agree",
        "C_p = (p_l - p_inf)/q_inf both")
    add(R, "model position in jet", [], ["model position in jet"], "B only", "")
    # ---- TM X-19
    add(X, "diameter", ["diameter"], ["model diameter"], "agree", "4.00 in. both")
    add(X, "length", ["length of model drawn"], ["model length"], "agree", "6.50 in. both")
    add(X, "corner", ["corner"], ["corner"], "agree", "sharp, no radius given, both")
    add(X, "orifices", ["orifices"], ["face orifice positions (orifices 1-15, y = 0 line)"], "agree",
        "0.050 in. i.d., at the thermocouple positions, both; A 43 orifices, B lists orifices 1 to 43")
    # per-orifice locations, parsed
    bq = gfind(GB, X, "face orifice positions (orifices 1-15, y = 0 line)")["value"]
    items = [s.strip() for s in bq.replace("x = ", "", 1).split(",")]
    bxy = {}
    for k, s in enumerate(items, 1):
        m = re.match(r"(-?[\d.]+)(?: \(y (-?[\d.]+)\))?$", s)
        bxy[k] = (Decimal(m.group(2) or "0.00"), Decimal(m.group(1)))
    bo = gfind(GB, X, "other face orifices (16-25)")["value"]
    for m in re.finditer(r"(\d+) \((-?[\d.]+), (-?[\d.]+)\)", bo):
        bxy[int(m.group(1))] = (Decimal(m.group(2)), Decimal(m.group(3)))
    bz = [Decimal(x) for x in re.findall(r"\d+\.\d+", gfind(GB, X, "afterbody orifices (26-43)")["value"])]
    face_diff, z_diff = [], []
    qa_face, qa_z = [], []
    for k in range(1, 26):
        q = "orifice %d location (y, x) on the face" % k
        qa_face.append(q)
        y, x = [Decimal(v) for v in gfind(GA, X, q)["value"].split(",")]
        if bxy.get(k) != (y, x):
            face_diff.append("orifice %d: A (%s, %s), B %s" % (k, y, x, bxy.get(k)))
    for k in range(26, 44):
        q = "orifice %d location z" % k
        qa_z.append(q)
        z = Decimal(gfind(GA, X, q)["value"])
        if bz[(k - 26) % 9] != z:
            z_diff.append("orifice %d: A %s, B %s" % (k, z, bz[(k - 26) % 9]))
    add(X, "face orifice locations 1 to 25 (y, x), in.", qa_face,
        ["face orifice positions (orifices 1-15, y = 0 line)", "other face orifices (16-25)"],
        "agree" if not face_diff else "differ",
        "all 25 (y, x) pairs equal" if not face_diff else "; ".join(face_diff))
    add(X, "afterbody orifice locations 26 to 43 (z), in.", qa_z, ["afterbody orifices (26-43)"],
        "agree" if not z_diff else "differ",
        "all 18 z values equal (0.25 to 5.00, twice)" if not z_diff else "; ".join(z_diff))
    add(X, "Mach numbers of the pressure tests", ["Mach numbers of pressure tests"], ["Mach number of figure 5"],
        "agree", "A lists 2.49, 3.51, 4.44 (text and p. 4 table); B gives fig. 5's 2.49 and the same p. 4 variation table for 2.49, 3.51, 4.44")
    add(X, "Mach number of fig. 5", ["Mach number, fig. 5"], ["Mach number of figure 5"], "agree", "2.49 both (caption)")
    add(X, "Reynolds number of fig. 5", ["Reynolds number, fig. 5"], ["Reynolds number of figure 5"], "agree",
        "0.90 x 10^6 based on model diameter, both; both note the text's 1.4 x 10^6 with no noticeable effect")
    add(X, "stated pressure accuracy", ["stated pressure accuracy"], ["stated accuracy of the pressures"], "agree",
        "not stated as a number, both")
    add(X, "pressure normalisation", ["pressure normalisation"], ["pressure normalisation"], "agree",
        "p_l/p_t,2 with p_t,2 measured at the face-centre orifice at alpha 0, both")
    # ---- TN D-5392
    add(D, "flat-face cylinder", ["flat-face cylinder"], ["flat-face cylinder"], "agree",
        "model 1 (rn/d infinite, rc/d 0, s1/d = s2/d = 0.500) both")
    add(D, "afterbody diameter", ["afterbody diameter d"], ["afterbody diameter d"], "agree", "7.5 in. (191 mm) both")
    add(D, "afterbody length", ["afterbody length"], ["afterbody diameter d"], "agree", "4.00 in. (102 mm) both (B in the note)")
    add(D, "corner, model 1", ["corner, model 1"], ["flat-face cylinder"], "agree", "rc/d = 0 both")
    add(D, "face extent", ["face extent"], ["orifice positions"], "agree",
        "face s/d 0 to 0.500 (s2/d = 0.500 the sharp corner), both")
    add(D, "orifices", ["orifices"], ["orifice positions"], "agree",
        "74 orifices in the model 1 tables, 0.050 in. i.d., both")
    add(D, "Mach numbers", ["Mach numbers"], ["Mach numbers"], "agree",
        "2.49, 4.06, 4.63 with test-section deviations +-0.018, +-0.061, +-0.045, both")
    add(D, "stagnation temperature", ["stagnation temperature"], ["stagnation temperature"], "agree",
        "610 deg R (339 K) at 2.49; 635 (353 K) at 4.06 and 4.63, both")
    add(D, "Reynolds number", ["Reynolds number"], ["Reynolds number"], "agree",
        "1.88 x 10^6 based on afterbody diameter, same at all Mach numbers, both")
    add(D, "angles of attack", ["angles of attack"], [], "A only", "")
    add(D, "stated pressure accuracy", ["stated pressure accuracy"], ["stated accuracy of the pressures"], "agree",
        "1 percent of full scale: 1.44 psf (1-psi gage) and 14.4 psf (10-psi gage); manometers 0.5 psf, both")
    add(D, "pressure normalisation", ["pressure normalisation"], ["pressure normalisation"], "agree on the heading",
        "p_l/p_t,2 and its symbols-list definition, both; A adds 'text PDF p. 8 implies p_t,2 is computed', B draws no conclusion (see normalisation.txt)")
    missA = [r for r in GA if r["_row"] not in usedA]
    missB = [r for r in GB if r["_row"] not in usedB]
    if missA or missB:
        raise SystemExit("geometry rows not covered: A %s B %s" % (
            [r["quantity"] for r in missA], [r["quantity"] for r in missB]))
    return out


GEO_COLS = ["source", "topic", "comparison", "detail", "quantity_A", "value_A", "unit_A", "page_A",
            "quantity_B", "value_B", "unit_B", "page_B", "note_A", "note_B", "rows_A", "rows_B"]

# ------------------------------------------------------------------ write


def write_csv(path, cols, rows):
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore", lineterminator="\n")
        w.writeheader()
        for r in rows:
            w.writerow(r)


def main():
    lines = []
    P = lines.append
    allA, allB, results = {}, {}, {}
    for name in FIGS:
        A, B, pairs = fig_pairs(name)
        recs = fig_rows(name, pairs)
        write_csv(os.path.join(OUT, name + "_pairs.csv"), FIG_COLS, recs)
        allA[name], allB[name], results[name] = A, B, recs
    for name in TABLES:
        A, B, recs = table_rows(name)
        write_csv(os.path.join(OUT, name + "_pairs.csv"), TAB_COLS, recs)
        allA[name], allB[name], results[name] = A, B, recs
    geo = geometry_pairs()
    write_csv(os.path.join(OUT, "geometry_pairs.csv"), GEO_COLS, geo)

    # flags.csv: every row of both readers whose flag is not ok
    pair_of = {}
    for name, recs in results.items():
        for r in recs:
            for tag in "AB":
                if r.get("row_" + tag) != "":
                    pair_of[(tag, name, r["row_" + tag])] = r["pair"]
    flags = []
    for name in FIGS + TABLES:
        for tag, rows in (("A", allA[name]), ("B", allB[name])):
            for r in rows:
                if r["flag"] != "ok":
                    flags.append({"reader": tag, "file": name + ".csv", "row": r["_row"],
                                  "pair": pair_of.get((tag, name, r["_row"]), ""),
                                  "item": r["item"], "model": r["model"], "position": r["position"],
                                  "location": r["location"], "value": r["value"],
                                  "alternatives": r["alternatives"], "flag": r["flag"],
                                  "page": r["page"], "note": r["note"]})
    write_csv(os.path.join(OUT, "flags.csv"),
              ["reader", "file", "row", "pair", "item", "model", "position", "location", "value",
               "alternatives", "flag", "page", "note"], flags)

    # ---- counts
    def cat(st):
        if st.startswith("agree"):
            return "agree"
        if st.startswith("disagree"):
            return "disagree"
        if st.startswith("read once"):
            return "read once"
        return "illegible"

    P("COUNTS (agree / disagree / read once / illegible), per file and location")
    P("")
    P("A location written 'x (A) / y (B)' is a pair whose readers give different")
    P("location labels. 'agree' for tables includes 'agree (alternatives)'.")
    P("")
    tot = {}
    for name in FIGS + TABLES:
        recs = results[name]
        P("%s.csv  (A %d rows, B %d rows, %d pairs or single items)" % (
            name, len(allA[name]), len(allB[name]), len(recs)))
        by = {}
        for r in recs:
            by.setdefault(r["location"], {"agree": 0, "disagree": 0, "read once": 0, "illegible": 0})
            by[r["location"]][cat(r["status"])] += 1
        t = {"agree": 0, "disagree": 0, "read once": 0, "illegible": 0}
        for loc in sorted(by):
            c = by[loc]
            for k in t:
                t[k] += c[k]
            P("    %-34s agree %3d   disagree %3d   read once %3d   illegible %3d" % (
                loc, c["agree"], c["disagree"], c["read once"], c["illegible"]))
        P("    %-34s agree %3d   disagree %3d   read once %3d   illegible %3d" % (
            "all", t["agree"], t["disagree"], t["read once"], t["illegible"]))
        if name in TABLES:
            n_alt = sum(1 for r in recs if r["status"] == "agree (alternatives)")
            P("    of the agreements, %d by alternatives only (primary digits differ)" % n_alt)
            n_lab = sum(1 for r in recs if r.get("labels", "").startswith("differ"))
            P("    label differences (orifice, phi, s/d, location, Mach): %d" % n_lab)
        else:
            n_mod = sum(1 for r in recs if r["model_label"] == "differs")
            n_loc = sum(1 for r in recs if r["location_label"] == "differs")
            P("    label differences: model/series %d, location %d" % (n_mod, n_loc))
        tot[name] = t
        P("")
    COUNTS = list(lines)
    lines.clear()

    # ---- disagreements and singles
    def fmt_fig(r):
        s = ["  %s  [%s]  location %s" % (r["pair"], r["status"], r["location"])]
        for tag in "AB":
            if r["row_" + tag] == "":
                s.append("    %s: no row" % tag)
                continue
            if r["item_" + tag] == "fig. 16(b)":
                perr = "station"
            elif r["pos_err_" + tag]:
                perr = "+-" + r["pos_err_" + tag]
            else:
                perr = "no error stated"
            verr = ("+-" + r["val_err_" + tag]) if r["val_err_" + tag] else "no error stated"
            s.append("    %s row %s: %s | %s | %s | position %s (%s) | value %s (%s) | alternatives: %s | flag %s | page %s | px (%s)" % (
                tag, r["row_" + tag], r["item_" + tag], r["series_" + tag], r["location_" + tag],
                r["position_" + tag], perr, r["value_" + tag] or "(empty)",
                verr, r["alternatives_" + tag] or "(none)", r["flag_" + tag],
                r["page_" + tag], r["px_" + tag] or "none"))
        if r["d_value"]:
            s.append("    difference: value %s (summed errors %s); position %s (%s)" % (
                r["d_value"], r["val_tol"], r["d_position"], r["pos_tol"]))
            s.append("    envelope of the two values: %s to %s; with every numeric alternative: %s to %s" % (
                r["envelope_low"], r["envelope_high"], r["envelope_all_low"], r["envelope_all_high"]))
            if r["alt_overlap"]:
                s.append("    alternatives within the summed value errors: %s" % r["alt_overlap"])
        if r["px_distance"]:
            s.append("    pixel centres %s px apart (%s)" % (r["px_distance"], r["match"]))
        return s

    notes = {}
    for name in FIGS + TABLES:
        for tag, rows in (("A", allA[name]), ("B", allB[name])):
            for r in rows:
                notes[(tag, name, r["_row"])] = r["note"]

    def verbatim(name, r):
        s = []
        for tag in "AB":
            if r.get("row_" + tag, "") != "":
                s.append("    %s note (verbatim): %s" % (tag, notes[(tag, name, r["row_" + tag])]))
        return s

    P("DISAGREEMENTS (every one; both values and the envelope; nothing settled)")
    P("")
    nd = 0
    for name in FIGS:
        for r in results[name]:
            if r["status"].startswith("disagree"):
                nd += 1
                lines.extend(fmt_fig(r)); lines.extend(verbatim(name, r)); P("")
    for name in TABLES:
        for r in results[name]:
            if r["status"] == "disagree":
                nd += 1
                P("  %s  [disagree]  orifice %s, phi %s, s/d %s, %s" % (
                    r["pair"], r["orifice_label_A"], r["phi_A"], r["s_d_A"], r["location"]))
                P("    A %s (alternatives: %s; flag %s)   B %s (alternatives: %s; flag %s)" % (
                    r["value_A"], r["alternatives_A"] or "none", r["flag_A"],
                    r["value_B"], r["alternatives_B"] or "none", r["flag_B"]))
                P("    envelope %s to %s" % (r["envelope_low"], r["envelope_high"]))
                lines.extend(verbatim(name, r)); P("")
    P("  (%d disagreements in all)" % nd)
    P("")
    P("TABLE VALUES THAT AGREE BY ALTERNATIVES ONLY (primary digits differ)")
    P("")
    for name in TABLES:
        for r in results[name]:
            if r["status"] == "agree (alternatives)":
                P("  %s  orifice %s, phi %s, s/d %s, %s: A %s (alternatives %s), B %s (alternatives %s); envelope of primaries %s to %s, with alternatives %s to %s" % (
                    r["pair"], r["orifice_label_A"], r["phi_A"], r["s_d_A"], r["location"],
                    r["value_A"], r["alternatives_A"] or "none", r["value_B"], r["alternatives_B"] or "none",
                    r["envelope_low"], r["envelope_high"], r["envelope_all_low"], r["envelope_all_high"]))
                lines.extend(verbatim(name, r))
    P("")
    DIS = list(lines)
    lines.clear()

    P("LABEL DIFFERENCES (every one)")
    P("")
    nl = 0
    for name in FIGS:
        for r in results[name]:
            if r["model_label"] == "differs":
                nl += 1
                P("  %s  model/series: A '%s' (model column: %s), B '%s' (model column: %s); position A %s, B %s; value A %s, B %s; pixel centres %s px apart" % (
                    r["pair"], r["series_A"], r["model_A"], r["series_B"], r["model_B"],
                    r["position_A"], r["position_B"], r["value_A"], r["value_B"], r["px_distance"]))
                if r["alternatives_A"] or r["alternatives_B"]:
                    P("    alternatives: A '%s', B '%s'" % (r["alternatives_A"], r["alternatives_B"]))
            if r["location_label"] == "differs":
                nl += 1
                P("  %s  location: A '%s', B '%s'; %s, position A %s, B %s" % (
                    r["pair"], r["location_A"], r["location_B"], r["series_A"], r["position_A"], r["position_B"]))
                lines.extend(verbatim(name, r))
    for name in TABLES:
        for r in results[name]:
            if r["labels"].startswith("differ"):
                nl += 1
                P("  %s  %s: A orifice %s phi %s s/d %s %s; B orifice %s phi %s s/d %s %s" % (
                    r["pair"], r["labels"], r["orifice_label_A"], r["phi_A"], r["s_d_A"], r["location_A"],
                    r["orifice_label_B"], r["phi_B"], r["s_d_B"], r["location_B"]))
    P("  (%d label differences in all)" % nl)
    P("")
    P("  Mach and Reynolds columns of paired figure rows:")
    for name in FIGS:
        dm = [r for r in results[name] if r["row_A"] != "" and r["row_B"] != "" and r["mach_A"] != r["mach_B"]]
        dr = [r for r in results[name] if r["row_A"] != "" and r["row_B"] != "" and r["reynolds_A"] != r["reynolds_B"]]
        P("    %s: mach differs on %d pairs; reynolds column differs on %d pairs%s" % (
            name, len(dm), len(dr),
            (" (" + "; ".join(sorted({"A '%s' / B '%s'" % (r["reynolds_A"], r["reynolds_B"]) for r in dr})) + ")") if dr else ""))
    for name in TABLES:
        dm = [r for r in results[name] if r["mach_A"] != r["mach_B"]]
        P("    %s: mach differs on %d rows" % (name, len(dm)))
    P("")
    LAB = list(lines)
    lines.clear()

    P("READ ONCE AND ILLEGIBLE ITEMS (every one)")
    P("")
    for name in FIGS:
        for r in results[name]:
            if r["status"].startswith("read once") or r["status"].startswith("illegible"):
                lines.extend(fmt_fig(r)); lines.extend(verbatim(name, r)); P("")
    for name in TABLES:
        for r in results[name]:
            if r["status"].startswith("read once") or r["status"].startswith("illegible"):
                P("  %s  [%s]" % (r["pair"], r["status"]))
                lines.extend(verbatim(name, r))
    SINGLE = list(lines)
    lines.clear()

    P("FLAGS (every row flagged other than ok; full rows with notes and alternatives verbatim in flags.csv)")
    P("")
    for name in FIGS + TABLES:
        for tag in "AB":
            c = {}
            for f in flags:
                if f["reader"] == tag and f["file"] == name + ".csv":
                    c[f["flag"]] = c.get(f["flag"], 0) + 1
            P("  %s %-22s %s" % (tag, name + ".csv", ", ".join("%s %d" % kv for kv in sorted(c.items())) or "none"))
    P("")
    P("  Pairs whose two flags differ:")
    for name in FIGS + TABLES:
        n = sum(1 for r in results[name] if r.get("row_A", "") != "" and r.get("row_B", "") != ""
                and r["flag_A"] != r["flag_B"])
        P("    %s: %d" % (name, n))
    P("")
    FLG = list(lines)
    lines.clear()

    P("GEOMETRY (geometry_pairs.csv, every row of both files covered)")
    P("")
    for g in geo:
        if g["comparison"] != "agree":
            P("  %s, %s: %s. %s" % (g["source"], g["topic"], g["comparison"], g["detail"]))
    P("  All other topics: agree (%d of %d topics)." % (
        sum(1 for g in geo if g["comparison"] == "agree"), len(geo)))
    P("")
    GEO = list(lines)

    write_csv(os.path.join(OUT, "reynolds_mach.csv"), RM_COLS, RM_ROWS)
    body = "\n".join(COUNTS + DIS + LAB + SINGLE + FLG + GEO)
    with open(os.path.join(OUT, "pairing.txt"), "w") as f:
        f.write(HEAD.strip("\n") + "\n\n" + body.rstrip("\n") + "\n\n" + TAIL.strip("\n") + "\n")


# ------------------------------------------------- Reynolds and Mach (step 3)
# As both readers give them (geometry.csv and the CSV mach/reynolds columns).

RM_COLS = ["set", "model", "mach_A", "mach_B", "mach_agree", "reynolds_A", "reynolds_B",
           "reynolds_basis_A", "reynolds_basis_B", "on_diameter", "reynolds_agree", "note"]
RM_ROWS = [
    {"set": "TN 4300 fig. 7", "model": "4-in. model D, present tests (27- by 27-in. jet)",
     "mach_A": "2.00 (legend); 2 (text)", "mach_B": "2.00 (legend); 2 (text)", "mach_agree": "yes",
     "reynolds_A": "14 x 10^6 per ft (geometry.csv); CSV column empty",
     "reynolds_B": "14 x 10^6 per ft (geometry.csv); CSV column '14 x 10^6'",
     "reynolds_basis_A": "per foot; text p. 11, stated for the heat-transfer data ('the other data in figure 10'); 'no Reynolds number is given for the pressure data of figs. 7 and 16 beyond sea-level'",
     "reynolds_basis_B": "per foot; text p. 11 'for the other data in figure 10' (the preflight-jet tests); 'not from the figure'",
     "on_diameter": "given by neither", "reynolds_agree": "same per-foot figure; they differ on whether it belongs to the pressure data (A: none given for it; B: written against the fig. 7 points)",
     "note": "neither reader gives a Reynolds number on the 4-in. diameter"},
    {"set": "TN 4300 fig. 7", "model": "4-in. model, Langley Unitary Plan wind tunnel (comparison series)",
     "mach_A": "2.49", "mach_B": "2.49", "mach_agree": "yes",
     "reynolds_A": "2.7 x 10^6 per ft (geometry.csv); CSV column empty",
     "reynolds_B": "2.7 x 10^6 per ft (geometry.csv note); CSV column '2.7 x 10^6'",
     "reynolds_basis_A": "per foot; 'stated for the heat-transfer test, M = 2.49'",
     "reynolds_basis_B": "per foot; text p. 11, 'not from the figure'",
     "on_diameter": "given by neither", "reynolds_agree": "same per-foot figure", "note": ""},
    {"set": "TN 4300 fig. 7", "model": "3-in. model, ref. 3 figure 4 (comparison series)",
     "mach_A": "2.01", "mach_B": "2.01", "mach_agree": "yes", "reynolds_A": "none", "reynolds_B": "none",
     "reynolds_basis_A": "", "reynolds_basis_B": "", "on_diameter": "given by neither",
     "reynolds_agree": "neither gives one", "note": ""},
    {"set": "TN 4300 fig. 16", "model": "12-in. model A (27- by 27-in. jet)",
     "mach_A": "2", "mach_B": "2 ('from the text, not the figure')", "mach_agree": "yes",
     "reynolds_A": "none for the pressure data; CSV column empty", "reynolds_B": "CSV column empty",
     "reynolds_basis_A": "", "reynolds_basis_B": "", "on_diameter": "given by neither",
     "reynolds_agree": "neither gives one for fig. 16", "note": "the 14 x 10^6 per ft of geometry.csv is the only Reynolds number either gives for TN 4300's 27- by 27-in. jet"},
    {"set": "RM L57C18 fig. 5", "model": "models B, C, D, F",
     "mach_A": "2", "mach_B": "2", "mach_agree": "yes",
     "reynolds_A": "about 14 x 10^6 per ft", "reynolds_B": "about 14 x 10^6 per ft ('14 x 10^6', per foot, approximate)",
     "reynolds_basis_A": "free stream, per foot (text pp. 3-4)", "reynolds_basis_B": "free stream, per foot (summary and introduction)",
     "on_diameter": "given by neither (face diameters not printed, both)", "reynolds_agree": "yes", "note": ""},
    {"set": "TM X-19 fig. 5", "model": "4.00-in. flat-face cylinder",
     "mach_A": "2.49", "mach_B": "2.49", "mach_agree": "yes",
     "reynolds_A": "0.90 x 10^6", "reynolds_B": "0.90 x 10^6",
     "reynolds_basis_A": "model diameter (symbols list)", "reynolds_basis_B": "model diameter (symbols list)",
     "on_diameter": "yes, both", "reynolds_agree": "yes",
     "note": "both: the text says 1.4 x 10^6 showed no noticeable effect; fig. 5 is at 0.90 x 10^6"},
    {"set": "TN D-5392 tables I, II, III", "model": "model 1, 7.5-in. flat-face cylinder",
     "mach_A": "2.49, 4.06, 4.63", "mach_B": "2.49, 4.06, 4.63", "mach_agree": "yes",
     "reynolds_A": "1.88 x 10^6", "reynolds_B": "1.88 x 10^6",
     "reynolds_basis_A": "afterbody diameter, same at all Mach numbers (text p. 6)",
     "reynolds_basis_B": "afterbody diameter, same for all Mach numbers (text)",
     "on_diameter": "yes, both (the face spans the whole diameter, s/d 0 to 0.500, both)", "reynolds_agree": "yes", "note": ""},
]

# ------------------------------------------------------- fixed text of pairing.txt

HEAD = """
PAIRING OF THE TWO BLIND READINGS OF THE FLAT-FACE PRESSURE SETS
0014 10.7 (af); readers' brief docs/research/square-edge/readers/brief.md
(SHA-256 2c6d4d6b5db5559997f468670ca44b1f31932b8fef3927bb470d095985e9d67b,
the hash both readers record)
Made 2026-10-27 by a neutral pairing party, from the readings committed
in 370c1c441ec73be7935018ac8e6e7262a9352574 (readers/A and readers/B).

WHAT THE PAIRING SAW AND DID NOT SEE

The pairing party opened the brief, the two readers' folders (their
method notes, CSVs, scripts, A's working log, and file listings of their
src, text and work folders), and in the repository the 0014 entry (af)
and its addendum of 2026-10-27. It opened no other design record or
research file, no solve, no summary and no test, and no PDF page.
Disclosure: to read (af) the pairing party printed lines 1900 to 2160 of
0014. That printout also showed the paragraph just before (af), the
record of (aa)'s computed check, which says in words that where the
solutions settled the computed face stayed above p* by 0.11 to 0.12 of
p02 and that at Mach 3.0 it fell below p*; and the (ab) addendum of
2026-10-27, which lies between (af) and (af)'s addendum. No reading was
compared with it: the rules below are fixed and applied by pair.py to
the two readings only.
The pairing compares the two readings with each other only. No value is
averaged, rounded or settled; where the readers differ, both values and
their envelope are recorded.

NORMALISATION (step 2, written before any value was compared; detail and
quotes in normalisation.txt)

  RM L57C18: C_p = (p_l - p_inf)/q_inf, a free-stream reference. It does
    not normalise by its own measured stagnation pressure: it TESTS P1.
  TM X-19: p_l/p_t,2 with p_t,2 measured by the face-centre orifice at
    alpha 0. It normalises by its own measured stagnation pressure: it
    DOES NOT TEST P1.
  TN 4300: p_l/p_o, o the stagnation point, "the total pressure behind
    the shock"; whether p_o is measured or from the Mach number is not
    recorded: NOT ESTABLISHED.
  TN D-5392: p_l/p_t,2, p_t,2 "stagnation pressure behind a normal shock
    at the free-stream Mach number"; A says the text "implies" it is
    computed, B draws no conclusion and records a measured stagnation-point
    pressure: NOT ESTABLISHED.

RULES

Figures (tn4300_fig7, tn4300_fig16, rml57c18_fig5, tmx19_fig5).
  Matching: both readers give each symbol's centre in native 300 dpi
  pixels of the same page image (TM X-19 page 20 turned 90 deg clockwise
  by both; the many pairs whose centres agree within 1 px show the frames
  are the same). A point of A and a point of B are the same plotted mark
  when their centres lie within 8 px (closest first, each point used
  once, same figure part). A row with no value (illegible) is then
  matched to an unmatched row of the other reader of the same series
  within 12 px (or 0.02 in position where no pixel centre is given).
  Everything left is read once. A's centre is the first "centre (x, y)
  px" of its note, or the one "set by eye" where given, or "near (x, y)
  px" for its illegible rows; B's is "centre px (x, y)".
  Labels: the model or series (from the model column and the symbol in
  the note) and the location of every matched pair are compared and every
  difference is listed. A label difference does not unmatch a pair, and
  a pair can agree in value while its labels differ.
  Agreement: two values agree when, on each coordinate (position and
  value), their difference is at most the sum of the two readers' stated
  reading errors on that coordinate. Errors are those stated in each
  row's note ("reading error +-x in ..."). One row (A, TN 4300 fig. 16(a),
  the rectangle not in the legend) states its error as +-4 px; it is
  converted with A's own stated grid scale (0.01 x/r per 9.55 px, 0.005
  p per 9.47 px). TN 4300 fig. 16(b) positions are station numbers and
  must be equal. Alternatives do not make figure values agree; each
  non-agreeing pair says whether an alternative of one reader lies within
  the summed value errors of a value or alternative of the other
  (alt_overlap).
  Envelope: the lower and higher of the two values; also the range over
  both values and every numeric alternative.

Tables (tnd5392_table1 to 3, model 1, alpha 0 column).
  Matching on the orifice number. Agreement is exact equality of the
  printed digits, or the two readers' sets of readings (value and every
  alternative) sharing a value; the second is counted as agreement and
  marked "agree (alternatives)", and every such row is listed below with
  both primaries. The orifice label (with its asterisk), phi, s/d,
  location and Mach number are compared as labels.

Counting: agree (including agree by alternatives for tables), disagree,
read once (a value from one reader, no row from the other), illegible
(a row with no value: one reader illegible against the other's value,
or an illegible row with no counterpart). Per location, a pair whose
readers give different locations is counted under "x (A) / y (B)".
"""

TAIL = """
NOTES ON THE DISAGREEMENTS (descriptions of the readers' own records; nothing settled)

- RM L57C18 fig. 5(f), model F: all 9 points disagree (8 on value, 2 on
  position, one on both), while the two readers' symbol centres agree
  within 0.25 px on every one. The difference is in the axis calibration,
  not in the centring: the labelled C_p ticks of fig. 5(f) in the method
  notes lie 4 to 8 px apart (A: 2.0 at 284.9, 0 at 1435.1, -0.5 at 1719.8
  to 1722.8 px; B: 2.0 at 290.0, 0 at 1440.6, -0.5 at 1726.8 px), about
  one minor division of the grid (0.01 in C_p per 5.77 px); the two s
  readings at the first two points differ by about 0.02 in., one minor
  division in s. On figs. 5(b), 5(c) and 5(d) the two readers' tick
  positions agree within about 3 px (A gives each tick in several bands
  across the plot, B at the middle) and every point agrees. Which
  calibration of fig. 5(f) is right is not decided here.
- TM X-19 fig. 5: the two points at x/r -0.92 and -0.87 differ by 0.0021
  in p_l/p_t,2 against summed errors of 0.0011; centres agree within
  0.6 px.
- TN 4300 fig. 16(a): the clusters at x/r 0.75, 0.86, 0.93 to 0.95 and
  0.98 are separated differently by the two readers (both say so and flag
  every point there ambiguous). At 0.86 A reads two triangles, B one; B's
  triangle centre lies between A's two (5.0 and 8.9 px) and is paired with
  the nearer. At 0.93 to 0.95 A reads two triangles and a circle (plus
  circle arcs it could not separate), B a triangle, a diamond and a
  circle; A's second triangle (0.9277, 0.8447) and B's diamond (0.9353,
  0.8501) lie 13 px apart and are not paired. At 0.75 B's alternative
  0.9661 is a weaker outline 6 px below B's diamond, near A's diamond
  (0.9665); A lists strokes of a second diamond near (1432, 522) px, 11 px
  from B's diamond, as illegible.
- TN 4300 fig. 7, x/r 0.5 and 0.75: three marks are given different
  symbols (see the label differences). At x/r 0.5 the mark above the
  solid circle is A's ref. 3 diamond and B's model D open circle, and the
  mark below it is A's model D open circle and B's Unitary square; at
  x/r 0.75 the open mark is A's ref. 3 diamond and B's model D open
  circle (B gives the diamond as its alternative). Values agree on all
  three. The Mach column differs on these three pairs only because of the
  series (2.00, 2.01, 2.49).
- TN D-5392 table II, orifice 55 (phi 90, s/d .0267, face): A .9928, B
  .9978, neither flagged, no alternatives. It is the only table value on
  which the readings disagree.
- Reynolds column: on TN 4300 fig. 7 B writes the per-foot Reynolds
  numbers of the text against the model D and Unitary points and A leaves
  the column empty; on RM L57C18 the two write the same per-foot figure
  in different words. Where both give a Reynolds number, it is the same.

REYNOLDS AND MACH NUMBERS (step 3; also reynolds_mach.csv)

  TN 4300 fig. 7, 4-in. model D (present tests)
      Mach: A 2.00, B 2.00 (agree).
      Reynolds: A 14 x 10^6 per ft, B 14 x 10^6 per ft (*). On the
      diameter: given by neither.
  TN 4300 fig. 7, 4-in. model, Unitary Plan tunnel (comparison series)
      Mach: A 2.49, B 2.49 (agree).
      Reynolds: A 2.7 x 10^6 per ft, B 2.7 x 10^6 per ft (agree). On the
      diameter: given by neither.
  TN 4300 fig. 7, 3-in. model, ref. 3 (comparison series)
      Mach: A 2.01, B 2.01 (agree). Reynolds: given by neither.
  TN 4300 fig. 16, 12-in. model A
      Mach: A 2, B 2 (agree). Reynolds: A none for the pressure data,
      B none in the fig. 16 rows. On the diameter: given by neither.
  RM L57C18 fig. 5, models B, C, D, F
      Mach: A 2, B 2 (agree).
      Reynolds: about 14 x 10^6 per ft, free stream, both (agree). On a
      diameter: given by neither (face diameters not printed, both).
  TM X-19 fig. 5
      Mach: A 2.49, B 2.49 (agree).
      Reynolds: A 0.90 x 10^6, B 0.90 x 10^6, on the model diameter
      (4.00 in.), both (agree).
  TN D-5392 tables I, II, III, model 1
      Mach: A 2.49, 4.06, 4.63; B 2.49, 4.06, 4.63 (agree).
      Reynolds: A 1.88 x 10^6, B 1.88 x 10^6, on the afterbody diameter
      (7.5 in.; the face spans the whole diameter), the same at all three
      Mach numbers, both (agree).

  (*) A: the 14 x 10^6 per ft of text p. 11 is stated for the heat-transfer
  data ("the other data in figure 10"); "no Reynolds number is given for
  the pressure data of figs. 7 and 16 beyond 'sea-level'". B: the same
  sentence, read as the preflight-jet tests, and written against the
  fig. 7 points of model D. Neither reader gives a Reynolds number on the
  diameter for TN 4300 or RM L57C18; the pairing does not convert one.

RM L57C18 TABLE II (step 4)

  Reader A disclosed (method.md section 6) that the text layer of RM
  L57C18 table II (page 16), which tabulates C_p at every orifice of every
  model at alpha 0 and 5 deg, was on A's screen before A read fig. 5. A
  says it did not use those numbers (values from fitted centres and the
  grid only) and that A's fig. 5 reading "is therefore not blind to table
  II". A did not view the page 16 image.

  Reader B also saw table II before reading fig. 5: B's method note says
  it saw the text layer of table II while reading for the conditions,
  "before I measured figure 5", and lists the page 16 image as viewed in
  crops (before and after the restart). B used table II "only for the
  printed station positions s", which B quotes in the note of every fig.
  5 row ("table II (p. 16) prints s = ... in. for this station"), and says
  the fig. 5 values "were not compared with or adjusted to table II". B's
  fig. 5 reading is therefore not blind to table II either.

  Agreement of the two fig. 5 readings: 25 of 34 points agree (every
  point of models B, C and D; 6 face, 2 corner, 14 cone and 3 with
  different location labels); all 9 points of model F disagree (see the
  notes above). Both readings having seen table II, their agreement is
  not evidence of independence from it. Table II itself was not asked for
  by the brief and was read by neither; A suggests the coordinator may
  want it read.

PAGES OPENED OUTSIDE THE BRIEF'S LIST (step 5, from the method notes)

  The brief lists, per report, the text, and: TN 4300 table I (p. 24),
  fig. 3 (p. 27), fig. 7 (p. 31), fig. 16 (p. 40); RM L57C18 fig. 1
  (pp. 17, 18), table I (p. 15), fig. 5 (pp. 22 to 27, flat-faced models);
  TM X-19 fig. 2 (p. 15), fig. 5 (p. 20); TN D-5392 fig. 1 (p. 67) and
  tables I to III (pp. 13 to 66, model 1 only).

  Reader A:
  - TN 4300 page 29 (fig. 5, jet total pressure and temperature, read from
    the curves) and page 28 (fig. 4, model construction), page images.
    Pages 24 to 40 were rendered to files; A says it looked only at the
    pages it names.
  - RM L57C18 text layer of pages 1 to 28 printed to the terminal, which
    includes page 16 (table II) and the text layers of figure pages the
    brief does not list (pp. 19 to 21 and 28). Pages 21, 22 and 26 were
    rendered but not viewed.
  - TM X-19 text layer of all 25 pages (including figure pages other than
    15 and 20) and a thumbnail sheet of pages 15 to 22 (schlieren and
    shadowgraph figures and figs. 6 and 7 seen as thumbnails).
  - TN D-5392 text layer of pages 1 to 14; page 14 lies in the brief's
    table range but is not model 1.
  - A's working log says text layers of all four reports were made
    (work/text holds them in full); the method note lists the pages
    printed to the screen.
  - A process listing (ps) once showed a command line with a path under
    sq-readers/B/; A says it opened nothing there.

  Reader B:
  - The NTRS citation API record of each report (title and download link
    only), to find the PDF address.
  - TN 4300: 50-dpi overview renders of all 40 pages, with contact sheets
    of pages 24 to 31 and 32 to 40 viewed (figure pages not in the brief
    seen as thumbnails); the first lines of the text layer of all 40
    pages; page images 26 (fig. 2), 28 (fig. 4) and 29 (fig. 5) viewed
    after the restart.
  - RM L57C18: the text layer and the page image of page 16 (table II),
    the image viewed in crops before and after the restart; a 40-dpi
    contact sheet of pages 13 to 28 (pages 19 to 21 and 28, and 22 and 26,
    seen as thumbnails).
  - TM X-19: 40-dpi overview renders of all 25 pages, contact sheet of
    pages 3 to 25 (every figure page seen as a thumbnail).
  - TN D-5392: the first lines of the text layer of all 88 pages
    (including other models' table pages and the figure pages after 67);
    page 68 extracted but not viewed.
  - B wrote the text layers of all four reports to B/text/.

  NASA TR R-274: both readers state they did not open it. Each reader's
  src/ folder holds exactly the four NTRS PDFs of the brief, with the same
  SHA-256 in both; no file named for TR R-274 is in either folder; the
  only "R-274" strings in their folders are TN D-5392's own reference
  list (in the text layers) and the readers' statements.
  The other reader's folder: both state they did not open it; neither
  reader's scripts refer to the other's folder; A discloses the process
  listing above.

FILES

  pair.py                     this pairing (python3 -I pair.py)
  normalisation.txt           step 2, written before any value was compared
  tn4300_fig7_pairs.csv, tn4300_fig16_pairs.csv, rml57c18_fig5_pairs.csv,
  tmx19_fig5_pairs.csv        figure pairs
  tnd5392_table1_pairs.csv, tnd5392_table2_pairs.csv,
  tnd5392_table3_pairs.csv    table pairs
  geometry_pairs.csv          geometry.csv compared row by row (every row
                              of both files appears)
  flags.csv                   every row of both readers flagged other than
                              ok, with note and alternatives verbatim
  reynolds_mach.csv           step 3
"""


if __name__ == "__main__":
    main()
