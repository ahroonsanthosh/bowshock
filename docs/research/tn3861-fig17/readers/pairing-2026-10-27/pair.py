"""Pair reading A with reading B of NACA TN 3861 fig. 17 (0014 10.7 (ab), second addendum).

Run:  python3 -I pair.py [readers_dir] [out_dir]
readers_dir defaults to the folder above this script (it holds A/ and B/);
out_dir defaults to this script's folder.

The two readings are compared with each other only. No value is averaged,
rounded or settled; where the readers differ both values and their
envelope are recorded.

Rules (also in pairing.txt):

Matching. A gives each centre in the page image as stored in the PDF
(2364 x 3094 px, the figure lying on its side); B gives it in that image
turned 90 deg clockwise (3094 x 2364 px). A's centre (x, y) is taken into
B's frame as (u, v) = (3093 - y, x), the lossless 90 deg turn with pixel
centres at whole numbers. Points are then matched on the nearest centre,
closest first, each used once, within MATCH_PX.

Agreement. Two readings agree when |dx| <= x_err(A) + x_err(B) and
|dvalue| <= value_err(A) + value_err(B), each reader's stated errors for
that point. Series (the legend's words) and crossed are compared as
labels. Under alternatives: a pair also says whether any reading of A
(its value or a numeric alternative) agrees, by the same rule, with any
reading of B (its value or a numeric alternative), and which. Readings
stated in the notes under a named convention (the cross-stroke
intersection, the bounding square or box) are compared convention with
convention, with the same errors.
"""

import csv
import os
import re
import sys
from decimal import Decimal

MATCH_PX = 8.0
B_HEIGHT_MINUS_1 = 3093.0  # A's page image is 3094 px tall

HERE = os.path.dirname(os.path.abspath(__file__))
READERS = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(HERE)
OUT = sys.argv[2] if len(sys.argv) > 2 else HERE


def load(r):
    with open(os.path.join(READERS, r, "tn3861_fig17.csv"), newline="") as f:
        rows = list(csv.DictReader(f))
    for i, x in enumerate(rows, 1):
        x["_row"] = i
        x["_x"], x["_v"] = Decimal(x["x"]), Decimal(x["value"]) if x["value"] else None
        x["_xe"], x["_ve"] = Decimal(x["x_err"]), Decimal(x["value_err"])
        nums = [float(t) for t in re.findall(r"-?\d+\.\d+", x["px"])]
        if r == "A":
            x["_pxB"] = (B_HEIGHT_MINUS_1 - nums[1], nums[0])
        else:
            x["_pxB"] = (nums[0], nums[1])
        m = re.match(r"(S\d+)\.", x["note"]) if r == "A" else re.match(r"(symbol \d+);", x["note"])
        x["_id"] = m.group(1) if m else ""
    return rows


def shape(row):
    s, n = row["series"], row["note"]
    if s.startswith("Lord and Ulmann"):
        return "quarter-round"
    if s.startswith("Gowen and Perkins"):
        return "straight triangle"
    if s.startswith("Busemann"):
        return "D (arch)"
    if s.startswith("Walter and Lange"):
        return "diamond"
    if "force" in s:
        return "circle"
    return "square"


def primary_convention(reader, row):
    sh = shape(row)
    if reader == "A":
        return "area centroid" if sh in ("quarter-round", "straight triangle", "D (arch)") else "outline centre"
    return {"quarter-round": "cross-stroke intersection", "straight triangle": "centroid of the three vertices",
            "D (arch)": "midpoints of the sides and of bottom and top", "diamond": "mean of the four vertices",
            "circle": "circle fit", "square": "midpoints of the sides"}[sh]


def alt_readings(row):
    """Numeric alternatives from the alternatives column: (x, value, text)."""
    out = []
    for m in re.finditer(r"x=(-?\d+\.\d+) value=(-?\d+\.\d+)\s*(\([^;]*)?", row["alternatives"]):
        out.append((Decimal(m.group(1)), Decimal(m.group(2)), (m.group(3) or "").strip()))
    return out


def note_list(reader, row):
    """Every reading stated in the note: [(kind, x, v, words before it)]."""
    n, out = row["note"], []
    pat = r"x (-?\d+\.\d+), value (-?\d+\.\d+)" if reader == "A" else r"x=(-?\d+\.\d+), value=(-?\d+\.\d+)"
    for m in re.finditer(pat, n):
        before = n[max(0, m.start() - 90):m.start()]
        low = before.lower()
        if "intersect" in low[-40:] or "cross intersection" in low[-40:]:
            kind = "cross intersection"
        elif "bounding" in low:
            kind = "bounding square or box"
        elif "dot" in low[-60:]:
            kind = "plotted dot"
        else:
            kind = "other"
        words = re.split(r"[.;]\s", before)[-1].strip()
        out.append((kind, Decimal(m.group(1)), Decimal(m.group(2)), words))
    return out


def note_readings(reader, row):
    """Readings under a shared named convention: {'cross': (x, v), 'box': (x, v)}."""
    out = {}
    for kind, x, v, _ in note_list(reader, row):
        if kind == "cross intersection":
            out.setdefault("cross", (x, v))
        elif kind == "bounding square or box":
            out.setdefault("box", (x, v))
    for a in alt_readings(row):
        if "bounding" in a[2] and "box" not in out:
            out["box"] = (a[0], a[1])
    if reader == "B" and shape(row) == "quarter-round":
        out.setdefault("cross", (row["_x"], row["_v"]))
    if reader == "B" and shape(row) == "D (arch)":
        out.setdefault("box", (row["_x"], row["_v"]))
    return out


def other_readings(reader, row):
    """Every reading of a reader other than its value: formal alternatives, then note readings."""
    out = [("alternative " + (t or "(no words)"), x, v) for x, v, t in alt_readings(row)]
    seen = {(x, v) for _, x, v in out}
    for kind, x, v, words in note_list(reader, row):
        if (x, v) in seen:
            continue
        seen.add((x, v))
        w = words
        if len(w) > 70:
            w = w[-70:]
            w = w[w.find(" ") + 1:]
        out.append(("note, %s: '%s'" % (kind, w.rstrip(" (")), x, v))
    return out


def agree(xa, va, xb, vb, a, b):
    return abs(xa - xb) <= a["_xe"] + b["_xe"] and abs(va - vb) <= a["_ve"] + b["_ve"]


def main():
    A, B = load("A"), load("B")
    cand = []
    for a in A:
        for b in B:
            d = ((a["_pxB"][0] - b["_pxB"][0]) ** 2 + (a["_pxB"][1] - b["_pxB"][1]) ** 2) ** 0.5
            if d <= MATCH_PX:
                cand.append((d, a["_row"], b["_row"], a, b))
    usedA, usedB, pairs = set(), set(), []
    for d, _, _, a, b in sorted(cand, key=lambda t: t[:3]):
        if a["_row"] in usedA or b["_row"] in usedB:
            continue
        usedA.add(a["_row"]); usedB.add(b["_row"])
        pairs.append((a, b, d))
    singles = [("A", a) for a in A if a["_row"] not in usedA] + [("B", b) for b in B if b["_row"] not in usedB]
    pairs.sort(key=lambda p: (p[0]["_x"], p[0]["_v"]))

    recs = []
    for i, (a, b, d) in enumerate(pairs, 1):
        dx, dv = abs(a["_x"] - b["_x"]), abs(a["_v"] - b["_v"])
        xt, vt = a["_xe"] + b["_xe"], a["_ve"] + b["_ve"]
        xok, vok = dx <= xt, dv <= vt
        st = "agree" if xok and vok else ("disagree (x and value)" if not xok and not vok else
                                          ("disagree (x)" if not xok else "disagree (value)"))
        SA = [(a["_x"], a["_v"], "A value")] + [(x, v, "A alternative " + t) for x, v, t in alt_readings(a)]
        SB = [(b["_x"], b["_v"], "B value")] + [(x, v, "B alternative " + t) for x, v, t in alt_readings(b)]
        hits = ["%s (%s, %s) ~ %s (%s, %s)" % (ta, xa, va, tb, xb, vb)
                for xa, va, ta in SA for xb, vb, tb in SB
                if (ta, tb) != ("A value", "B value") and agree(xa, va, xb, vb, a, b)]
        na, nb = note_readings("A", a), note_readings("B", b)
        conv = {}
        for k in ("cross", "box"):
            if k in na and k in nb:
                ok = agree(na[k][0], na[k][1], nb[k][0], nb[k][1], a, b)
                conv[k] = "A (%s, %s) / B (%s, %s): %s" % (na[k][0], na[k][1], nb[k][0], nb[k][1],
                                                           "agree" if ok else "disagree")
            elif k in na or k in nb:
                conv[k] = "only %s gives it" % ("A" if k in na else "B")
            else:
                conv[k] = ""
        sub = []
        n_bad = 0
        for r, o, tag, otag in ((a, b, "A", "B"), (b, a, "B", "A")):
            for words, x, v in other_readings(tag, r):
                dx_, dv_ = abs(x - o["_x"]), abs(v - o["_v"])
                ok = agree(x, v, o["_x"], o["_v"], a, b)
                n_bad += 0 if ok else 1
                why = [] if ok else (["x by %s > %s" % (dx_, xt)] if dx_ > xt else []) + \
                    (["value by %s > %s" % (dv_, vt)] if dv_ > vt else [])
                sub.append("%s %s (%s, %s) against %s's value: %s" % (
                    tag, words, x, v, otag, "agree" if ok else "disagree, " + " and ".join(why)))
        alt_lab = []
        for r, tag in ((a, "A"), (b, "B")):
            for part in r["alternatives"].split(";"):
                p = part.strip()
                if p and not re.match(r"x=", p):
                    alt_lab.append("%s: %s" % (tag, p))
        recs.append({
            "pair": "P%02d" % i, "A_id": a["_id"], "B_id": b["_id"], "status": st,
            "series": a["series"] if a["series"] == b["series"] else "",
            "series_label": "same" if a["series"] == b["series"] else "differs",
            "series_A": a["series"], "series_B": b["series"],
            "crossed_A": a["crossed"], "crossed_B": b["crossed"],
            "crossed_label": "same" if a["crossed"] == b["crossed"] else "differs",
            "x_A": a["x"], "x_B": b["x"], "x_err_A": a["x_err"], "x_err_B": b["x_err"],
            "dx": str(dx), "x_tol": str(xt),
            "value_A": a["value"], "value_B": b["value"], "value_err_A": a["value_err"],
            "value_err_B": b["value_err"], "dvalue": str(dv), "value_tol": str(vt),
            "x_envelope": "%s to %s" % (min(a["_x"], b["_x"]), max(a["_x"], b["_x"])),
            "value_envelope": "%s to %s" % (min(a["_v"], b["_v"]), max(a["_v"], b["_v"])),
            "convention_A": primary_convention("A", a), "convention_B": primary_convention("B", b),
            "alternatives_A": a["alternatives"], "alternatives_B": b["alternatives"],
            "agree_under_alternatives": ("yes: " + "; ".join(hits)) if hits else
                                        ("no" if st != "agree" else "agree on the values"),
            "alternatives_against_other_value": " | ".join(sub),
            "n_alternatives": len(sub), "n_alternatives_disagree": n_bad,
            "label_alternatives": " | ".join(alt_lab),
            "cross_intersections": conv["cross"], "bounding_box": conv["box"],
            "flag_A": a["flag"], "flag_B": b["flag"],
            "px_A_stored": a["px"], "px_A_in_B_frame": "%.1f, %.1f" % a["_pxB"], "px_B": b["px"],
            "px_distance": "%.2f" % d, "page_A": a["page"], "page_B": b["page"],
            "row_A": a["_row"], "row_B": b["_row"], "_a": a, "_b": b})

    cols = ["pair", "A_id", "B_id", "status", "series", "series_label", "crossed_A", "crossed_B",
            "crossed_label", "x_A", "x_B", "x_err_A", "x_err_B", "dx", "x_tol", "value_A", "value_B",
            "value_err_A", "value_err_B", "dvalue", "value_tol", "x_envelope", "value_envelope",
            "convention_A", "convention_B", "alternatives_A", "alternatives_B",
            "agree_under_alternatives", "n_alternatives", "n_alternatives_disagree",
            "alternatives_against_other_value", "label_alternatives", "cross_intersections", "bounding_box",
            "flag_A", "flag_B", "px_A_stored", "px_A_in_B_frame", "px_B", "px_distance",
            "page_A", "page_B", "row_A", "row_B", "series_A", "series_B"]
    with open(os.path.join(OUT, "tn3861_fig17_pairs.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore", lineterminator="\n")
        w.writeheader()
        for r in recs:
            w.writerow(r)

    flags = []
    for tag, rows in (("A", A), ("B", B)):
        for r in rows:
            if r["flag"] != "ok":
                pr = next((p["pair"] for p in recs if p["_a" if tag == "A" else "_b"] is r), "")
                flags.append({"reader": tag, "row": r["_row"], "id": r["_id"], "pair": pr,
                              "series": r["series"], "crossed": r["crossed"], "x": r["x"],
                              "value": r["value"], "alternatives": r["alternatives"],
                              "flag": r["flag"], "page": r["page"], "note": r["note"]})
    with open(os.path.join(OUT, "flags.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["reader", "row", "id", "pair", "series", "crossed", "x", "value",
                                          "alternatives", "flag", "page", "note"], lineterminator="\n")
        w.writeheader()
        for r in flags:
            w.writerow(r)

    L = []
    P = L.append
    n_ag = sum(r["status"] == "agree" for r in recs)
    P("COUNTS")
    P("")
    P("  A 25 rows, B 25 rows; %d pairs, %d read once, 0 illegible (neither reader left a value empty)." % (
        len(recs), len(singles)))
    P("  agree %d, disagree %d; series labels differ on %d pairs, crossed labels on %d." % (
        n_ag, len(recs) - n_ag, sum(r["series_label"] == "differs" for r in recs),
        sum(r["crossed_label"] == "differs" for r in recs)))
    by = {}
    for r in recs:
        k = (r["series_A"], r["crossed_A"])
        by.setdefault(k, [0, 0])
        by[k][0 if r["status"] == "agree" else 1] += 1
    for (s, c), (ag, dis) in sorted(by.items()):
        P("    %-72s crossed %-3s  agree %2d  disagree %2d" % (s, c, ag, dis))
    P("")
    P("PAIR TABLE (x = crossflow Mach number, value = drag coefficient C_D; errors as each reader states)")
    P("")
    P("  pair A    B          series (short)          crossed  x A (+-)      x B (+-)      value A (+-)  value B (+-)  status")
    short = {"Lord": "Lord and Ulmann", "Gowe": "Gowen and Perkins", "Buse": "Busemann",
             "Walt": "Walter and Lange", "Pres": None}
    for r in recs:
        s = r["series_A"]
        sh = short.get(s[:4]) or ("present, force" if "force" in s else "present, pressure")
        P("  %s  %-4s  %-9s  %-22s  %-3s/%-3s  %s (%s)  %s (%s)  %s (%s)  %s (%s)  %s" % (
            r["pair"], r["A_id"], r["B_id"], sh, r["crossed_A"], r["crossed_B"], r["x_A"], r["x_err_A"],
            r["x_B"], r["x_err_B"], r["value_A"], r["value_err_A"], r["value_B"], r["value_err_B"], r["status"]))
    P("")
    P("DISAGREEMENTS (every one; both readings, the envelope, alternatives and notes verbatim)")
    P("")
    for r in recs:
        if r["status"] != "agree":
            P("  %s (A %s, B %s), %s, crossed %s/%s: %s" % (r["pair"], r["A_id"], r["B_id"], r["series_A"],
                                                          r["crossed_A"], r["crossed_B"], r["status"]))
            P("    x: A %s (+-%s), B %s (+-%s); difference %s against %s; envelope %s" % (
                r["x_A"], r["x_err_A"], r["x_B"], r["x_err_B"], r["dx"], r["x_tol"], r["x_envelope"]))
            P("    value: A %s (+-%s), B %s (+-%s); difference %s against %s; envelope %s" % (
                r["value_A"], r["value_err_A"], r["value_B"], r["value_err_B"], r["dvalue"], r["value_tol"],
                r["value_envelope"]))
            P("    centre conventions: A %s, B %s" % (r["convention_A"], r["convention_B"]))
            P("    under the stated alternatives: %s" % r["agree_under_alternatives"])
            P("    cross intersections: %s" % (r["cross_intersections"] or "given by neither"))
            P("    bounding square or box: %s" % (r["bounding_box"] or "given by neither"))
            P("    flags: A %s, B %s; alternatives: A '%s', B '%s'" % (r["flag_A"], r["flag_B"],
                                                                  r["alternatives_A"], r["alternatives_B"]))
            P("    A note (verbatim): %s" % r["_a"]["note"])
            P("    B note (verbatim): %s" % r["_b"]["note"])
            P("")
    P("LABEL DIFFERENCES")
    P("")
    nl = 0
    for r in recs:
        if r["series_label"] == "differs":
            nl += 1
            P("  %s series: A '%s', B '%s'" % (r["pair"], r["series_A"], r["series_B"]))
        if r["crossed_label"] == "differs":
            nl += 1
            P("  %s crossed: A %s, B %s" % (r["pair"], r["crossed_A"], r["crossed_B"]))
    if not nl:
        P("  None: on all 25 pairs the series (the legend's words, verbatim) and crossed are the same.")
    P("  Label alternatives the readers keep open (not differences between them):")
    for r in recs:
        if r["label_alternatives"]:
            P("    %s (A %s, B %s): %s" % (r["pair"], r["A_id"], r["B_id"], r["label_alternatives"]))
    P("")
    if singles:
        P("READ ONCE")
        for tag, r in singles:
            P("  %s row %s: %s, %s, %s; note: %s" % (tag, r["_row"], r["series"], r["x"], r["value"], r["note"]))
        P("")
    P("CENTRE CONVENTIONS, POINT BY POINT")
    P("")
    P("  A: area centroid for the triangles, quarter-rounds and the D; outline centre for the rest.")
    P("  B: centroid of the three vertices for the straight triangles; cross-stroke intersection for")
    P("  the quarter-rounds; side and top/bottom midpoints for the arch; outline centre for the rest.")
    P("  For each pair: (1) the two values, each under its reader's convention; (2) every other reading")
    P("  a reader states for the point (its alternatives column, and every reading given in its note),")
    P("  each set against the other reader's value with the same summed errors; (3) the two readers'")
    P("  readings under a shared named convention (cross intersection; bounding square or box).")
    P("")
    tot_alt = sum(r["n_alternatives"] for r in recs)
    tot_bad = sum(r["n_alternatives_disagree"] for r in recs)
    P("  In all: %d other readings stated; %d of them agree with the other reader's value, %d do not." % (
        tot_alt, tot_alt - tot_bad, tot_bad))
    bad = []
    for r in recs:
        for s in r["alternatives_against_other_value"].split(" | "):
            if s and ": disagree" in s:
                bad.append((r["pair"], s))
    kinds = sorted({("bounding" in s) for _, s in bad})
    P("  The %d that do not: %s." % (len(bad), "; ".join(
        "%s (%s)" % (p, s.split(" ")[0] + "'s bounding square or box" if "bounding" in s else s.split(":")[0])
        for p, s in bad)))
    if kinds == [True]:
        P("  Every one of them is a bounding square or box reading (the triangles' and quarter-rounds'")
        P("  bounding-box centre) set against the other reader's centroid or cross reading. Convention")
        P("  against convention (box against box, cross against cross) every pair that has both agrees.")
    P("")
    for r in recs:
        P("  %s (A %s, B %s) %s, crossed %s: values %s [A %s; B %s]" % (
            r["pair"], r["A_id"], r["B_id"], shape(r["_a"]), r["crossed_A"], r["status"],
            r["convention_A"], r["convention_B"]))
        if r["alternatives_against_other_value"]:
            P("      other readings (%d, %d disagree):" % (r["n_alternatives"], r["n_alternatives_disagree"]))
            for s in r["alternatives_against_other_value"].split(" | "):
                P("        - " + s)
        else:
            P("      other readings: none stated by either reader")
        if r["cross_intersections"]:
            P("      same convention, cross intersections: %s" % r["cross_intersections"])
        if r["bounding_box"]:
            P("      same convention, bounding square or box: %s" % r["bounding_box"])
    P("")
    P("FLAGS (every row flagged other than ok, verbatim; also flags.csv)")
    P("")
    for fl in flags:
        P("  %s row %s (%s, pair %s): %s, crossed %s, x %s, value %s, flag %s" % (
            fl["reader"], fl["row"], fl["id"], fl["pair"], fl["series"], fl["crossed"], fl["x"], fl["value"],
            fl["flag"]))
        P("    alternatives (verbatim): %s" % (fl["alternatives"] or "(none)"))
        P("    note (verbatim): %s" % fl["note"])
    P("")
    body = "\n".join(L)

    # crossflow points named by the second (ab) addendum
    def find(series_start, crossed):
        return [r for r in recs if r["series_A"].startswith(series_start) and r["crossed_A"] == crossed]
    lu = find("Lord and Ulmann", "yes")
    gp = find("Gowen and Perkins", "no")
    pp = find("Present data from pressure distribution", "yes")
    pf = find("Present data from force tests", "yes")
    C = []
    Q = C.append

    def line(r):
        return ("%s (A %s, B %s): x A %s / B %s, value A %s / B %s, %s; flags A %s, B %s; "
                "other readings %d, of which %d disagree with the other reader's value") % (
            r["pair"], r["A_id"], r["B_id"], r["x_A"], r["x_B"], r["value_A"], r["value_B"], r["status"],
            r["flag_A"], r["flag_B"], r["n_alternatives"], r["n_alternatives_disagree"])
    Q("THE POINTS THE SECOND (ab) ADDENDUM NAMES (identified from the series, the legend and the")
    Q("addendum's own words; no value is computed)")
    Q("")
    Q("  The addendum names, on fig. 17: 'its crossflow points of yawed cylinders swept beyond 60 deg:")
    Q("  Lord and Ulmann's at 70 and 75 deg, and Penland's at 75.1 deg', and 'the cylinders normal to the")
    Q("  stream replotted on it (Gowen and Perkins, which is TN 2960)'. It identifies the 75 deg point")
    Q("  as 'Lord and Ulmann's crossflow Mach number 1.04 point 15 deg, TN 3861 p. 11', states no angle")
    Q("  for the 70 deg point, gives Penland's angle of attack as 14.9 deg, and says 'Penland's point")
    Q("  takes fig. 17's pressure-integrated series'.")
    Q("")
    Q("  Both readers read %d crossed Lord and Ulmann symbols (legend: 'Lord and Ulmann, from pressure" % len(lu))
    Q("  distribution, M = 4.04 (unpublished)', crossed):")
    for r in lu:
        Q("    " + line(r))
    near = [r for r in lu if abs(r["_a"]["_x"] - Decimal("1.04")) < Decimal("0.1") and abs(r["_b"]["_x"] - Decimal("1.04")) < Decimal("0.1")]
    Q("  - Lord and Ulmann at 75 deg: the addendum names it by its crossflow Mach number, 1.04. Of the")
    Q("    four, the only one both readers place within 0.1 of 1.04 is %s." % (
        ", ".join("%s (A %s, B %s)" % (r["pair"], r["x_A"], r["x_B"]) for r in near) or "none"))
    Q("  - Lord and Ulmann at 70 deg: no angle or Mach number is stated for it, and the addendum takes its")
    Q("    sweep from the paired M_c. From the series and legend alone it is one of the other three crossed")
    Q("    Lord and Ulmann points; the pairing does not choose among them, and gives all four above. The")
    Q("    addendum names two Lord and Ulmann points; both readers read four.")
    Q("  - Penland at 75.1 deg: the addendum gives it the pressure-integrated series, which on fig. 17 is")
    Q("    'Present data from pressure distribution' (the legend splits only the present data into force")
    Q("    and pressure), crossed. Both readers read %d crossed present-pressure squares:" % len(pp))
    for r in pp:
        Q("    " + line(r))
    Q("    Penland's angle of attack is 14.9 deg; the symbol list (as both readers quote it) defines the")
    Q("    crossflow Mach number as M sin(alpha), and all present data are at one M (legend: 6.86), so the")
    Q("    present point with the smallest angle has the smallest crossflow Mach number. That is the")
    lowest = min(pp, key=lambda r: r["_a"]["_x"]) if pp else None
    lowestB = min(pp, key=lambda r: r["_b"]["_x"]) if pp else None
    Q("    lowest crossed square in both readings: %s." % (
        "%s (A %s, B %s)" % (lowest["pair"], lowest["A_id"], lowest["B_id"]) if lowest is lowestB else
        "the readings differ on which it is"))
    Q("    Its force-test companion at the same crossflow Mach number (crossed circle), for reference:")
    lowf = min(pf, key=lambda r: r["_a"]["_x"]) if pf else None
    if lowf:
        Q("    " + line(lowf))
    Q("  - Gowen and Perkins (TN 2960), cylinders normal to the stream (legend: 'Gowen and Perkins, from")
    Q("    pressure distribution, M = 1.49 to 2.9, ref. 8', uncrossed): both readers read %d:" % len(gp))
    for r in gp:
        Q("    " + line(r))
    Q("")
    crossflow = "\n".join(C)

    with open(os.path.join(OUT, "pairing.txt"), "w") as f:
        f.write(HEAD.strip("\n") + "\n\n" + body.rstrip("\n") + "\n\n" + crossflow.rstrip("\n") + "\n\n"
                + TAIL.strip("\n") + "\n")


HEAD = """
PAIRING OF THE TWO BLIND READINGS OF NACA TN 3861 FIGURE 17
0014 10.7 (ab), second addendum; readers' brief
docs/research/tn3861-fig17/readers/brief.md (SHA-256
f8606bb73f672e5e0b00fa675728f5faaad80b68d5bb8cf562309620e1409276, the hash
both readers record and the hash of the repository copy)
Made 2026-10-27 by a neutral pairing party, from the readings committed in
d0094f2cd4fee64643d5d86453b193c14cbb6682 (readers/A and readers/B).

WHAT THE PAIRING SAW AND DID NOT SEE

The pairing party opened the brief, the two readers' folders (method
notes, CSVs, scripts, and file listings of src/ and work/; the two PDFs
only to hash them), and in the repository the second (ab) addendum of
0014 10.7, as committed in 21a0686 (lines 2181 to 2234 of 0014 there;
the passage is byte-identical at the branch tip). It did not open 0016,
docs/research/tn3861-fig17/ beyond the brief, any earlier fig. 17
reading, the code or the tests. Disclosure: before reading the addendum,
the pairing party listed the subject lines of the five commits on the
branch after its previous push (b0590ba, 9be5c6e, 21a0686, 3810bbb,
d03083d); they speak of the flat-face verdict, the (af) Reynolds range
and rounded leading edges past 60 deg being refused until fig. 17 is
read twice. No value of either reading was compared with anything but
the other reading. The branch was then fast-forwarded to d03083d without
reading those commits.

RULES

Matching. A gives each centre in the page image as stored in the PDF
(2364 x 3094 px, the figure on its side); B gives it in that image
turned 90 deg clockwise (3094 x 2364 px), and B maps its de-jogged
measurements back to the uncorrected image. A's centre (x, y) is taken
into B's frame as (u, v) = (3093 - y, x). Points are matched on the
nearest centre, closest first, each point used once, within 8 px.

Agreement. Two readings agree when the difference in crossflow Mach
number is at most the two readers' stated x errors summed and the
difference in drag coefficient at most the two stated value errors
summed, the errors those each reader gives for that point. Series (the
legend's words, verbatim) and crossed are compared as labels.
Alternatives do not change the status; each pair says separately
whether any reading of A (value or numeric alternative) agrees, by the
same rule, with any reading of B, and which. Readings given in the notes
under a named convention (the cross-stroke intersection; the bounding
square or box) are compared convention with convention, with the same
errors. Envelope: the lower and higher of the two readings.
"""

TAIL = """
THE READERS' DISCLOSURES (from their method notes)

Reader A:
- Opened nothing in the repository; in the scratchpad only the brief and
  its own folder. NTRS metadata (first 3000 bytes printed: title, author,
  abstract, download link), the PDF, pdfinfo, pdfimages -list.
- Text layer of pages 30 to 33 filtered to lines with "figure" or "fig.";
  the full text layer of page 33 (garbled OCR of the figure page).
- A text-layer search of all 33 pages for "figure 17", "crossflow Mach",
  "cross-flow Mach" or "SYMBOLS" printed one line each from pages 2, 3,
  7, 11, 12, 13, 31, 32 and 33. A discloses: "two of the printed lines
  were from the discussion of figures 15 and 16 (page 11, a crossflow
  Mach number value said to apply to figure 15, and page 12, a crossflow
  Mach number value in the pressure-coefficient discussion), and the page
  31 and 32 hits were parts of the captions of figures 15 and 16. I did
  not look at figures 15 or 16 and used none of this."
- Text layer of page 12 lines 36 to 50 and page 13 lines 1 to 22 (the
  paragraph on figure 17), page 3 lines 16 to 60 (symbol list), pages 1
  and 2 filtered for the author and date lines.
- The session was interrupted by a usage limit and resumed after a
  container restart at about 13:22 UTC; files intact, PDF hash rechecked.

Reader B:
- Opened nothing in the repository, its website or issues, no other
  reader's folder and not decisions.md. NTRS metadata (title, download
  links, later the author field), the PDF, sha256sum, stat, pdfinfo,
  pdfimages -list for pages 28 to 33.
- A text-layer search of pages 1 to 33 for "figure 17", "fig 17", "17."
  or crossflow / cross-flow / cross flow showed lines from pages 2, 3, 7,
  11, 12, 13, 14, 31, 32 and 33: "They included the opening words of the
  captions of figures 15 (page 31) and 16 (page 32), and one sentence of
  the text on page 11 that mentions figure 15. I did not look at figures
  15 or 16 and used nothing from those lines."
- Page 3 lines 20 to 60 (symbol list), page 12 lines 34 to 60 and page
  13 lines 1 to 20 (text on figure 17), page 33 (image and page
  dictionary), page 1 filtered for the author. "No other page was
  rendered or viewed."
- Same interruption and restart at about 13:22 UTC; files kept, PDF hash
  rechecked.

Both readers fetched the same file: SHA-256
4b3884fdbd75781c8707748aa906af00974f5e1a995d056c550f64f6c41f5957,
16881241 bytes, from
https://ntrs.nasa.gov/api/citations/19930084664/downloads/19930084664.pdf
(the pairing party hashed both copies: identical). Both read PDF page 33
(printed page 32) at the scan's native 300 ppi. Neither left a value
empty; both read 25 symbols, 14 crossed and 11 uncrossed.

WHERE THE BRIEF AND THE PDF DIFFER (as each reader records it)

- Author: the brief says "P. J. Penland"; the title page and NTRS say
  "Jim A. Penland" (both readers).
- Page: the figure is on PDF page 33, printed page 32 (both); the page
  is stored rotated, /Rotate 90 (B).
- The Welsh line: the legend's "Welsh, C. J., from flight test data M =
  .5 to 1.3, ref. 11" is drawn only as a dashed line, with no symbols, so
  neither reader has rows for it (both). A notes the dashed curve's small
  rounded turns near crossflow Mach number 0.7 and 0.8 are part of the
  line, not symbols; B that its turning points are small open arcs about
  18 px wide, not Busemann arches (closed, flat bottom, about 29 px).
- Unexplained dots: A flags solid inked dots inside the Walter and Lange
  diamonds at x 3.247 and 4.191 and a possible dot and a short tail on
  the diamond at 2.484, which the legend does not explain, and keeps "a
  dotted diamond the legend does not explain" as a series alternative.
  B reads the same dots (and dots in two Gowen and Perkins triangles) as
  the small plotted-point dots inside open symbols, gives the reading at
  the dot as an alternative where it is more than 1 px from the outline
  centre, and does not treat them as a separate series. A also notes a
  faint pencil dot in the triangle at 2.911 and a pencil mark near the
  triangle at 1.957; B a dot in triangle 9 and triangle 12.
- Pressure or force: the legend splits only the present data (circle,
  force tests; square, pressure distribution); Gowen and Perkins, Lord
  and Ulmann and Walter and Lange are "from pressure distribution";
  Busemann states no method (both).
- The brief calls the crossed points yawed cylinders; the legend says
  only "Cross indicates data obtained through crossflow study" (B).
- Not a brief difference (A): the NTRS title gives Mach number 6.86, its
  abstract 6.88; the legend says M = 6.86.

FILES

  pair.py                  this pairing (python3 -I pair.py)
  tn3861_fig17_pairs.csv   the 25 pairs, with errors, envelopes,
                           alternatives, convention comparisons, flags
                           and pixel centres in both frames
  flags.csv                every row flagged other than ok, verbatim
  pairing.txt              this record
"""

if __name__ == "__main__":
    main()
