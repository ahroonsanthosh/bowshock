"""Four-way neutral pairing of NACA RM A52E01 fig. 8(a), supersonic panel, the Mach 1.7 curves at alpha 0 to 4:
readings A (round 15-A), B (round 15-B), C (round 17) and D (round 18, a targeted fourth blind reading of these
curves at low angles). Named band-setting by 0014 section 10.7 entry (ac), second part.

Usage (from the repository root): python3 -I docs/research/total-drag/audit/pairing-2026-10-27-a52e01-m17-four/pair_m17_four.py

Reads only committed files on claude/wip/lift-te-below-1.5:
  A, B: round15-A/readings/a52e01_fig8a.csv, round15-B/readings/a52e01_fig8a.csv   (commit 1182556)
  C:    round17/readings/a52e01_fig8a.csv, round17/wing_calls.csv                    (commit 8a55ee4)
  D:    round18/readings/a52e01_fig8a_m17.csv, round18/wing_calls.csv                (commit 29512c9)
  the drawn curves of the three-way pairing: pairing-2026-10-26-a52e01-three/identity_map.csv (commit 9f84cf4)
Writes, next to this script: pairs_a52e01_fig8a_m17.csv, identity_map.csv, pairing.txt.

Same method and rules as the two-way (cccd251) and three-way (9f84cf4) pairings. The pairer read no page and settles
nothing: no winner, no average, no envelope, no majority. An item only one reader gives is READ ONCE.

Rule. Two values agree when |X - Y| <= e_X + e_Y, each reader's stated error as written. D states each error as its
calibration 2 sigma combined in quadrature with a reading bound (its err_basis column says how), or as a box half-width;
the number is used as written, like every other reader's.

Drawn curves. A, B and C's curves keep the drawn curves of the three-way identity map (8(a) supersonic #1 to #10; the
Mach 1.7 ones are #7, #8, #9, #10). D read only alpha 0, 2 and 4 and the lower ends, so the station rule (at least 3
common stations) cannot hold for any D curve by construction. D's curves are therefore mapped by all of D's values:
its stations at alpha 2 and 4, its alpha 0 value and its lower end, each compared with every curve of A, B and C in
every drawn curve of the panel. A D curve's drawn curve is the one with the most agreeing comparisons, when it has more
than any other and half or more of its comparisons agree; the counts for every candidate are printed. D's alternative
lower end (R_end_alt, flagged "alternative") is compared separately and is not used for the map.

What is compared, for the Mach 1.7 drawn curves, at alpha 0 to 4, for all six pairs of readers (A-B, A-C, A-D, B-C,
B-D, C-D):
  * stations: rows of kind curve and box at the same alpha (rounded to 0.001); only Cp is tested; several rows at one
    alpha are paired nearest first. C reads in dash gaps at its own alpha and D's boxes sit at their own alpha, so such
    rows have no station partner; nothing is interpolated.
  * station vs end (the cccd251 rule): a one-reader station row is compared with the other reader's end of the same
    drawn curve when the end's alpha lies within the two alpha errors; listed apart.
  * lower ends: both axes tested.
  * alpha 0: a value is a curve_at_zero row at alpha 0 with a Cp (C: y = 0); otherwise the reader gives none.
Every row of every reader at alpha 0 to 4 for these drawn curves is listed in pairing.txt and in the pairs file.
"""
import collections
import csv
import os
import re
import statistics

ROOT = "docs/research/total-drag/audit/"
SRC = {"A": ROOT + "round15-A/readings/a52e01_fig8a.csv", "B": ROOT + "round15-B/readings/a52e01_fig8a.csv",
       "C": ROOT + "round17/readings/a52e01_fig8a.csv", "D": ROOT + "round18/readings/a52e01_fig8a_m17.csv"}
CWING = ROOT + "round17/wing_calls.csv"
DWING = ROOT + "round18/wing_calls.csv"
IDMAP = ROOT + "pairing-2026-10-26-a52e01-three/identity_map.csv"
OUT = ROOT + "pairing-2026-10-27-a52e01-m17-four/"
PANEL = "M=1.2, 1.4, 1.7"
M17 = ["M=1.2, 1.4, 1.7 #7", "M=1.2, 1.4, 1.7 #8", "M=1.2, 1.4, 1.7 #9", "M=1.2, 1.4, 1.7 #10"]
READERS = ("A", "B", "C", "D")
PAIRS = [(a, b) for i, a in enumerate(READERS) for b in READERS[i + 1:]]
AMAX = 4.0
TOL = 1e-9
D_WING_CURVE = {"2": "R", "3": "A", "4": "M"}

out_lines = []


def say(s=""):
    out_lines.append(s)


def load(path):
    with open(path, newline="") as f:
        return list(csv.DictReader(l for l in f if not l.startswith("#")))


def num(s):
    s = (s or "").strip()
    return None if s == "" else float(s)


def fmt(v, n=4):
    return "" if v is None else ("%." + str(n) + "f") % v


def agree(a, ea, b, eb):
    return abs(a - b) <= ea + eb + TOL


def read(X):
    rows = []
    for r in load(SRC[X]):
        if X != "D" and r["panel"] != PANEL:
            continue
        d = {"reader": X, "id": r["id"], "kind": r["kind"], "series": r["series"], "x": num(r["x"]), "ex": num(r["x_err"]),
             "y": num(r["y"]), "ey": num(r["y_err"]), "basis": r["err_basis"], "flag": r["flag"], "note": r["note"], "used": 0}
        if X == "C":
            d["curves"] = [r["id"].rsplit("-", 1)[0]]
        elif X == "D":
            ws = [w.strip() for w in r["series"].split(";")]
            d["curves"] = ["D-" + D_WING_CURVE[w] for w in ws]
        else:
            d["curves"] = [r["series"]]
        d["ind"], d["eind"], d["dep"], d["edep"] = d["y"], d["ey"], d["x"], d["ex"]
        d["st"] = round(d["y"], 3) if d["y"] is not None else None
        d["zero"] = d["dep"] if (d["kind"] == "curve_at_zero" and d["y"] is not None and abs(d["y"]) < 1e-9 and d["dep"] is not None) else None
        d["alt"] = X == "D" and d["flag"] == "alternative"
        rows.append(d)
    return rows


R = {X: read(X) for X in READERS}
curves = {X: collections.OrderedDict() for X in READERS}
for X in READERS:
    for r in R[X]:
        for c in r["curves"]:
            curves[X].setdefault(c, []).append(r)

# drawn curves of the three-way pairing (A, B, C members)
drawn = collections.OrderedDict()
for r in load(IDMAP):
    if r["figure"] == "a52e01_fig8a" and r["group"] == PANEL:
        drawn[r["drawn_curve"]] = {X: [c for c in r[X + "_curve"].split(" / ") if c] for X in ("A", "B", "C")}
        drawn[r["drawn_curve"]]["D"] = []


def stations(rows):
    d = collections.defaultdict(list)
    for r in rows:
        if r["kind"] in ("curve", "box") and r["dep"] is not None:
            d[r["st"]].append(r)
    return d


def lower_end(rows, alt=False):
    es = [r for r in rows if r["kind"] == "curve_end" and r["alt"] == alt]
    return min(es, key=lambda r: r["ind"]) if es else None


def pair_lists(la, lb, key="dep"):
    cand = sorted((abs(a[key] - b[key]), i, j) for i, a in enumerate(la) for j, b in enumerate(lb))
    ua, ub, out = set(), set(), []
    for _, i, j in cand:
        if i in ua or j in ub:
            continue
        ua.add(i)
        ub.add(j)
        out.append((la[i], lb[j]))
    out += [(a, None) for i, a in enumerate(la) if i not in ua]
    out += [(None, b) for j, b in enumerate(lb) if j not in ub]
    return out


# ---- wing calls and flags
CW = {}
for r in load(CWING):
    m = re.search(r"curve (\S+?);", r["note"] + ";")
    if r["figure"] == "8(a)":
        CW[m.group(1)] = r
DW = {r["curve"]: r for r in load(DWING)}


def wing_call(X, c):
    rows = curves[X][c]
    if X == "A":
        st = rows[0].get("series")
        sym = "short dash" if "short dashes" in c else "no line style"
        return {"wing": None, "flagged": None, "text": "names no wing (%s; A's supersonic lines carry no wing)" % sym}
    if X == "B":
        w = re.search(r"Wing (\d)", c).group(1)
        alts = sorted({cl for r in rows if r["flag"] for cl in r["note"].split("; ") if "alternative wing" in cl or "by elimination" in cl})
        fl = any("curve identity:" in r["note"] for r in rows if r["flag"])
        return {"wing": w, "flagged": fl, "text": "wing %s%s" % (w, ", flagged uncertain ('curve identity: ... wing from dash lengths only'%s)" % (
            "; " + "; ".join(alts) if alts else "") if fl else "")}
    if X == "C":
        cw = CW[c]
        w = re.search(r"(\d)", cw["wing"]).group(1)
        return {"wing": w, "flagged": cw["confidence"] != "high",
                "text": "wing %s, confidence %s%s" % (w, cw["confidence"], (", alternative " + cw["alternatives"]) if cw["alternatives"] else "")}
    dw = DW[c[2:]]
    return {"wing": dw["wing_call"], "flagged": dw["confidence"] != "high",
            "text": "wing %s, confidence %s, alternative: %s" % (dw["wing_call"], dw["confidence"], dw["alternative"])}


# ---- map D's curves to drawn curves by all of D's values
say("Four-way neutral pairing: NACA RM A52E01 fig. 8(a), supersonic panel, Mach 1.7 curves at alpha 0 to 4")
say("Readings A (round 15-A), B (round 15-B), C (round 17), D (round 18, targeted). Rule: agree when |X - Y| <= e_X + e_Y,")
say("each reader's stated error as written. Same method as cccd251 and 9f84cf4; nothing averaged, enveloped, settled or")
say("decided by majority; an item only one reader gives is READ ONCE.")
say()
say("D's errors: calibration 2 sigma combined in quadrature with a reading bound, or a box half-width (D's err_basis column")
say("says which); used as written. D's flags are its own words (end-of-dash, merged-in-grid, uncertain-end, alternative,")
say("crossing, hidden); every one is listed below.")
say()
say("Format: pairs_a52e01_fig8a_m17.csv has the three-way pairing's columns (9f84cf4) unchanged, with D's row (D_id ... D_flag)")
say("and the A-D, B-D and C-D comparisons appended before summary, and D_note last. identity_map.csv is one row per Mach 1.7")
say("drawn curve with all four readers' curves, wing calls, flags and alpha 0 values.")
say()
say("== Mapping D's curves to the drawn curves of the three-way identity map (by D's values at alpha 2, 4, 0 and its lower end)")
say("   D read only alpha 0, 2 and 4, so the station rule (3 common stations) cannot hold; each comparison below is one of D's")
say("   values against one reader's curve in that drawn curve (stations at the same alpha, alpha 0 values, lower ends on both axes).")
dmap = {}
for dc_name in curves["D"]:
    drows = curves["D"][dc_name]
    dst = stations([r for r in drows if r["kind"] == "curve"])
    dz = [r for r in drows if r["zero"] is not None]
    dend = lower_end(drows)
    scores = []
    for name, mem in drawn.items():
        n_ok = n = 0
        parts = []
        for X in ("A", "B", "C"):
            for c in mem[X]:
                xs = stations(curves[X][c])
                for s, lst in dst.items():
                    for a, b in pair_lists(lst, xs.get(s, [])):
                        if a and b:
                            n += 1
                            ok = agree(a["dep"], a["edep"], b["dep"], b["edep"])
                            n_ok += ok
                            parts.append("%s alpha %s %s" % (X, fmt(s, 1), "ok" if ok else "no"))
                xz = [r for r in curves[X][c] if r["zero"] is not None]
                if dz and xz:
                    n += 1
                    ok = agree(dz[0]["zero"], dz[0]["edep"], xz[0]["zero"], xz[0]["edep"])
                    n_ok += ok
                    parts.append("%s alpha 0 %s" % (X, "ok" if ok else "no"))
                xe = lower_end(curves[X][c])
                if dend and xe:
                    n += 1
                    ok = agree(dend["dep"], dend["edep"], xe["dep"], xe["edep"]) and agree(dend["ind"], dend["eind"], xe["ind"], xe["eind"])
                    n_ok += ok
                    parts.append("%s lower end %s" % (X, "ok" if ok else "no"))
        if n:
            scores.append((n_ok, n, name, parts))
    scores.sort(key=lambda t: (-t[0], t[1]))
    best = scores[0]
    second = scores[1] if len(scores) > 1 else (0, 0, "-", [])
    mapped = best[0] > second[0] and best[0] >= 0.5 * best[1]
    if mapped:
        dmap[dc_name] = best[2]
        drawn[best[2]]["D"].append(dc_name)
    say("   D '%s' (%s): %s %s, %d of %d comparisons agree (%s); next %s %d of %d" % (
        dc_name, wing_call("D", dc_name)["text"].split(",")[0], "MAPPED to" if mapped else "NOT MAPPED, best", best[2],
        best[0], best[1], ", ".join(best[3]), second[2], second[0], second[1]))
    for n_ok, n, name, parts in scores[2:]:
        say("       also: %s %d of %d (%s)" % (name, n_ok, n, ", ".join(parts)))
# D's alternative lower end against the drawn curves' lower ends
say()
say("   D's alternative lower end (R_end_alt), not used for the map, against every Mach 1.7 curve's lower end:")
alt = [r for r in R["D"] if r["alt"]]
for a in alt:
    for name in M17:
        for X in ("A", "B", "C"):
            for c in drawn[name][X]:
                xe = lower_end(curves[X][c])
                if xe:
                    ok = agree(a["dep"], a["edep"], xe["dep"], xe["edep"]) and agree(a["ind"], a["eind"], xe["ind"], xe["eind"])
                    say("     %s against %s %s '%s' lower end (alpha %s +-%s, %s +-%s): %s" % (
                        a["id"], name, X, c, fmt(xe["ind"], 3), fmt(xe["eind"], 3), fmt(xe["dep"]), fmt(xe["edep"]), "agrees" if ok else "differs"))
say()

# ---- identity table and wing calls
say("== Wing calls for each Mach 1.7 drawn curve, all four readers, with their flags (no majority taken)")
id_rows = []
for name in M17:
    mem = drawn[name]
    calls = []
    say("   [%s]" % name)
    for X in READERS:
        if not mem[X]:
            say("     %s: no curve of this reading in this drawn curve" % X)
        for c in mem[X]:
            wc = wing_call(X, c)
            calls.append((X, c, wc))
            say("     %s '%s': %s" % (X, c, wc["text"]))
    named = [(X, wc["wing"], wc["flagged"]) for X, c, wc in calls if wc["wing"]]
    by_w = collections.defaultdict(list)
    for X, w, f in named:
        by_w[w].append((X, f))
    best = None
    for w, lst in sorted(by_w.items(), key=lambda t: (-sum(1 for _, f in t[1] if not f), -len(t[1]))):
        if len(lst) >= 2:
            best = (w, lst)
            break
    if best:
        w, lst = best
        cat = "two agree, neither uncertain" if sum(1 for _, f in lst if not f) >= 2 else "two agree, one or both uncertain"
        others = [(X, ww, f) for X, ww, f in named if ww != w]
        detail = "wing %s named by %s%s" % (w, ", ".join(X + (" (flagged or not high)" if f else "") for X, f in lst),
                                             ("; " + "; ".join("%s names wing %s" % (X, ww) for X, ww, f in others)) if others else "; no reader names another wing")
    elif len(named) == 1:
        cat, detail = "read once (one wing call)", "%s names wing %s" % (named[0][0], named[0][1])
    elif named:
        cat, detail = "disputed", "; ".join("%s names wing %s" % (X, w) for X, w, f in named)
    else:
        cat, detail = "no wing call", "no reader names a wing"
    say("     wing calls: %s: %s" % (cat.upper(), detail))
    if name in ("M=1.2, 1.4, 1.7 #9", "M=1.2, 1.4, 1.7 #10"):
        say("     D's own caveat (method.md flag 8): 'the M and R calls depend on each other: if one were wrong, the two would")
        say("       swap' (D gives no alternative wing at high confidence and does not flag the rows).")
    mem["cat"], mem["detail"], mem["calls"] = cat, detail, calls

# ---- alpha 0
say()
say("== Alpha 0, each Mach 1.7 drawn curve: which readers give a value, and each pair (errors summed)")
alpha0 = {}
for name in M17:
    mem = drawn[name]
    z = {}
    txt = {}
    for X in READERS:
        vals = [r for c in mem[X] for r in curves[X][c] if r["zero"] is not None]
        z[X] = vals[0] if vals else None
        if not mem[X]:
            txt[X] = "no curve"
        elif z[X]:
            txt[X] = "%s +-%s (%s%s)" % (fmt(z[X]["zero"]), fmt(z[X]["edep"]), z[X]["basis"] if X != "D" else "D's error",
                                       (", flag " + z[X]["flag"]) if z[X]["flag"] else "")
        else:
            zr = [r for c in mem[X] for r in curves[X][c] if r["kind"] == "curve_at_zero"]
            lo = min((r for c in mem[X] for r in curves[X][c] if r["kind"] == "curve_end" and not r["alt"]), key=lambda r: r["ind"], default=None)
            if zr and X == "B":
                txt[X] = "no value (" + zr[0]["note"].split(";")[0] + ")"
            else:
                txt[X] = "no value (lowest end alpha %s at %s)" % (fmt(lo["ind"], 3), fmt(lo["dep"])) if lo else "no value"
    pv = {}
    for X, Y in PAIRS:
        if z[X] and z[Y]:
            ok = agree(z[X]["zero"], z[X]["edep"], z[Y]["zero"], z[Y]["edep"])
            pv[X + "-" + Y] = ("agree" if ok else "DISAGREE") + " (diff %s, errors summed %s)" % (
                fmt(z[X]["zero"] - z[Y]["zero"]), fmt(z[X]["edep"] + z[Y]["edep"]))
        elif z[X] or z[Y]:
            pv[X + "-" + Y] = "read once (%s only)" % (X if z[X] else Y)
        else:
            pv[X + "-" + Y] = "neither"
    agreeing = [p for p, v in pv.items() if v.startswith("agree")]
    givers = [X for X in READERS if z[X]]
    status = ("TWO OR MORE AGREEING READINGS (%s)" % ", ".join(agreeing)) if agreeing else \
        ("values from %s, no pair agrees" % ", ".join(givers) if len(givers) > 1 else
         ("READ ONCE (%s only)" % givers[0] if givers else "NOT READ (no reader gives a value)"))
    alpha0[name] = (z, txt, pv, status)
    say("   [%s] %s" % (name, status))
    say("       " + " | ".join("%s %s" % (X, txt[X]) for X in READERS))
    say("       " + "; ".join("%s %s" % (p, v) for p, v in pv.items()))
say()
say("== Wing 2 (#10) at alpha 0, C and D, with both of D's alternatives (as the coordinator asked)")
c0 = [r for r in curves["C"]["a17-c3"] if r["zero"] is not None][0]
d0 = [r for r in curves["D"]["D-R"] if r["zero"] is not None][0]
dalt = alt[0]
say("   C a17-c3: %s +-%s at alpha 0 (%s, flagged %s; C's wing call: wing 2, confidence medium, alternative wing 4)" % (
    fmt(c0["zero"]), fmt(c0["edep"]), c0["basis"], c0["flag"] or "no"))
ok = agree(c0["zero"], c0["edep"], d0["zero"], d0["edep"])
say("   D's first reading (R_a0, the end piece on the frame): %s +-%s at alpha 0, flag %s; against C: %s (diff %s, errors summed %s)" % (
    fmt(d0["zero"]), fmt(d0["edep"]), d0["flag"], "agree" if ok else "DISAGREE", fmt(c0["zero"] - d0["zero"]), fmt(c0["edep"] + d0["edep"])))
say("   D's alternative (R_end_alt, the piece is not part of the curve): no value at alpha 0; lowest end at alpha %s +-%s, %s +-%s." % (
    fmt(dalt["ind"], 3), fmt(dalt["eind"], 3), fmt(dalt["dep"]), fmt(dalt["edep"])))
for X, c in (("C", "a17-c3"), ("B", "M = 1.7; Wing 2 (long-dash line)"), ("A", "M=1.7 line b (diagonal stroke at bottom)"), ("A", "M=1.7 line d")):
    xe = lower_end(curves[X][c])
    oki = agree(dalt["ind"], dalt["eind"], xe["ind"], xe["eind"])
    okd = agree(dalt["dep"], dalt["edep"], xe["dep"], xe["edep"])
    say("     against %s '%s' lower end (alpha %s +-%s, %s +-%s): alpha %s, Cp %s" % (
        X, c, fmt(xe["ind"], 3), fmt(xe["eind"], 3), fmt(xe["dep"]), fmt(xe["edep"]), "agrees" if oki else "differs", "agrees" if okd else "differs"))
say("   Under D's alternative, C's value at alpha 0 is read once (C only) for this curve; under D's first reading, C and D agree.")
say("   B gives no value (its wing 2 'does not reach alpha = 0', lowest drawn alpha 0.37); A gives no value for line d or line b.")
say()

# ---- every row at alpha 0 to 4, pairwise comparisons
BASE_COLS = ["figure", "group", "category", "verdict", "A_series", "B_series", "label_check", "station",
             "A_id", "A_kind", "A_x", "A_x_err", "A_y", "A_y_err", "A_basis", "A_flag",
             "B_id", "B_kind", "B_x", "B_x_err", "B_y", "B_y_err", "B_basis", "B_flag",
             "tested", "diff_A_minus_B", "sum_of_errors", "diff_ind_A_minus_B", "sum_of_ind_errors",
             "also_agrees_with", "A_note", "B_note"]
C_COLS = ["drawn_curve", "readers", "C_series", "C_id", "C_kind", "C_x", "C_x_err", "C_y", "C_y_err", "C_basis",
          "C_flag", "verdict_A_C", "diff_A_minus_C", "sum_of_errors_A_C", "diff_ind_A_minus_C",
          "sum_of_ind_errors_A_C", "verdict_B_C", "diff_B_minus_C", "sum_of_errors_B_C", "diff_ind_B_minus_C",
          "sum_of_ind_errors_B_C", "C_note"]
D_COLS = ["D_series", "D_id", "D_kind", "D_x", "D_x_err", "D_y", "D_y_err", "D_basis", "D_flag"]
for X, Y in (("A", "D"), ("B", "D"), ("C", "D")):
    D_COLS += ["verdict_%s_%s" % (X, Y), "diff_%s_minus_%s" % (X, Y), "sum_of_errors_%s_%s" % (X, Y),
               "diff_ind_%s_minus_%s" % (X, Y), "sum_of_ind_errors_%s_%s" % (X, Y)]
COLS = BASE_COLS + C_COLS + D_COLS + ["summary", "D_note"]


def pcols(X, Y):
    if (X, Y) == ("A", "B"):
        return "verdict", "diff_A_minus_B", "sum_of_errors", "diff_ind_A_minus_B", "sum_of_ind_errors"
    return ("verdict_%s_%s" % (X, Y), "diff_%s_minus_%s" % (X, Y), "sum_of_errors_%s_%s" % (X, Y),
            "diff_ind_%s_minus_%s" % (X, Y), "sum_of_ind_errors_%s_%s" % (X, Y))


def side(r, p):
    if r is None:
        return {p + k: "" for k in ("id", "kind", "x", "x_err", "y", "y_err", "basis", "flag", "note")}
    return {p + "id": r["id"], p + "kind": r["kind"], p + "x": fmt(r["x"]), p + "x_err": fmt(r["ex"]),
            p + "y": fmt(r["y"], 3), p + "y_err": fmt(r["ey"], 3), p + "basis": r["basis"], p + "flag": r["flag"],
            p + "note": r["note"]}


csv_rows = []
dis = []
listing = []
counts = collections.Counter()
for name in M17:
    mem = drawn[name]
    rows_of = {X: [r for c in mem[X] for r in curves[X][c]] for X in READERS}
    in_win = {X: [r for r in rows_of[X] if r["ind"] is not None and r["ind"] <= AMAX + 1e-9
                  or (r["kind"] == "box" and r["ind"] is not None and r["ind"] - (r["eind"] or 0) <= AMAX)] for X in READERS}
    series = {X: " / ".join(mem[X]) for X in READERS}
    lchk = "; ".join("%s '%s': %s" % (X, c, wc["text"]) for X, c, wc in mem["calls"])
    listing.append("   [%s]" % name)
    for X in READERS:
        for r in sorted(in_win[X], key=lambda r: (r["ind"], r["kind"])):
            listing.append("     %s %-28s %-13s alpha %6s +-%-6s  Cp %8s +-%-7s %s%s" % (
                X, r["id"][-28:], r["kind"], fmt(r["ind"], 3), fmt(r["eind"], 3), fmt(r["dep"]), fmt(r["edep"]),
                (r["basis"] if X != "D" else "D's error"), (", flag " + r["flag"]) if r["flag"] else ""))
    st_of = {X: stations([r for r in in_win[X] if r["ind"] <= AMAX + 1e-9]) for X in READERS}
    ends_of = {X: [r for r in rows_of[X] if r["kind"] == "curve_end" and not r["alt"]] for X in READERS}
    for s in sorted(set().union(*[set(st_of[X]) for X in READERS])):
        grp = [[a, b, None, None] for a, b in pair_lists(st_of["A"].get(s, []), st_of["B"].get(s, []))]
        for k, X in ((2, "C"), (3, "D")):
            lst = st_of[X].get(s, [])
            cand = sorted((abs(c["dep"] - next(g for g in gg if g)["dep"]), i, j) for i, gg in enumerate(grp) for j, c in enumerate(lst))
            ui, uj = set(), set()
            for _, i, j in cand:
                if i in ui or j in uj:
                    continue
                ui.add(i)
                uj.add(j)
                grp[i][k] = lst[j]
            for j, c in enumerate(lst):
                if j not in uj:
                    g = [None, None, None, None]
                    g[k] = c
                    grp.append(g)
        for g in grp:
            rowd = dict(zip(READERS, g))
            rec = {"figure": "a52e01_fig8a", "group": PANEL, "category": "station", "station": fmt(s, 4), "drawn_curve": name,
                   "A_series": series["A"], "B_series": series["B"], "C_series": series["C"], "D_series": series["D"],
                   "label_check": lchk, "readers": ",".join(X for X in READERS if rowd[X]), "tested": "Cp_b"}
            for X in READERS:
                rec.update(side(rowd[X], X + "_"))
                if rowd[X]:
                    rowd[X]["used"] += 1
            for X, Y in PAIRS:
                v, dcol, ecol, _, _ = pcols(X, Y)
                x, y = rowd[X], rowd[Y]
                if x and y:
                    ok = agree(x["dep"], x["edep"], y["dep"], y["edep"])
                    rec[v], rec[dcol], rec[ecol] = ("agree" if ok else "DISAGREE"), fmt(x["dep"] - y["dep"]), fmt(x["edep"] + y["edep"])
                    counts["%s-%s station pair %s" % (X, Y, "agree" if ok else "DISAGREE")] += 1
                    if not ok:
                        dis.append((name, "station", "alpha %s, %s-%s: %s '%s' %s +-%s vs %s '%s' %s +-%s; diff %s, errors summed %s" % (
                            fmt(s, 3), X, Y, X, x["id"], fmt(x["dep"]), fmt(x["edep"]), Y, y["id"], fmt(y["dep"]), fmt(y["edep"]),
                            fmt(x["dep"] - y["dep"]), fmt(x["edep"] + y["edep"]))))
                elif x or y:
                    m = X if x else Y
                    o = Y if x else X
                    r = rowd[m]
                    es = [e for e in ends_of[o] if abs(e["ind"] - r["ind"]) <= (e["eind"] or 0) + (r["eind"] or 0) + TOL]
                    if es:
                        e = es[0]
                        ok = agree(r["dep"], r["edep"], e["dep"], e["edep"])
                        rec[v] = "%s only station; against the other reader's end %s at alpha %s (%s +-%s): %s" % (
                            m, e["id"], fmt(e["ind"], 3), fmt(e["dep"]), fmt(e["edep"]), "agree" if ok else "DISAGREE")
                        xx, yy = (r, e) if m == X else (e, r)
                        rec[dcol], rec[ecol] = fmt(xx["dep"] - yy["dep"]), fmt(xx["edep"] + yy["edep"])
                        counts["%s-%s station vs end %s" % (X, Y, "agree" if ok else "DISAGREE")] += 1
                        if not ok:
                            dis.append((name, "station vs end", "alpha %s, %s-%s: %s row %s (%s +-%s) against %s's end %s at alpha %s (%s +-%s)" % (
                                fmt(s, 3), X, Y, m, r["id"], fmt(r["dep"]), fmt(r["edep"]), o, e["id"], fmt(e["ind"], 3), fmt(e["dep"]), fmt(e["edep"]))))
                    else:
                        rec[v] = m + " only"
                        counts["%s-%s %s only station" % (X, Y, m)] += 1
                else:
                    rec[v] = ""
            if not (rowd["A"] or rowd["B"]):
                rec["verdict"] = "no A or B row"
            csv_rows.append(rec)
    # lower ends (and D's alternative end as its own row)
    ends = {X: lower_end(rows_of[X]) for X in READERS}
    for variant in ("main", "alternative"):
        if variant == "alternative" and not any(r["alt"] for r in rows_of["D"]):
            continue
        e4 = dict(ends)
        if variant == "alternative":
            e4["D"] = lower_end(rows_of["D"], alt=True)
        rec = {"figure": "a52e01_fig8a", "group": PANEL, "category": "end", "station": "", "drawn_curve": name,
               "A_series": series["A"], "B_series": series["B"], "C_series": series["C"], "D_series": series["D"],
               "label_check": lchk, "readers": ",".join(X for X in READERS if e4[X]),
               "tested": "alpha and Cp_b (lower end%s)" % (", D's alternative end" if variant == "alternative" else "")}
        for X in READERS:
            rec.update(side(e4[X], X + "_"))
            if e4[X]:
                e4[X]["used"] += 1
        for X, Y in PAIRS:
            if variant == "alternative" and "D" not in (X, Y):
                continue
            v, dcol, ecol, dicol, eicol = pcols(X, Y)
            x, y = e4[X], e4[Y]
            if x and y:
                okd = agree(x["dep"], x["edep"], y["dep"], y["edep"])
                oki = agree(x["ind"], x["eind"], y["ind"], y["eind"])
                vv = "agree" if okd and oki else "DISAGREE (" + ", ".join((["alpha"] if not oki else []) + (["Cp_b"] if not okd else [])) + ")"
                rec.update({v: vv, dcol: fmt(x["dep"] - y["dep"]), ecol: fmt(x["edep"] + y["edep"]),
                            dicol: fmt(x["ind"] - y["ind"], 3), eicol: fmt(x["eind"] + y["eind"], 3)})
                counts["%s-%s lower end %s%s" % (X, Y, "agree" if vv == "agree" else "DISAGREE", " (D alternative)" if variant == "alternative" else "")] += 1
                if vv != "agree":
                    dis.append((name, "end", "lower end%s, %s-%s: %s %s (alpha %s +-%s, %s +-%s) vs %s %s (alpha %s +-%s, %s +-%s); %s" % (
                        " (D's alternative)" if variant == "alternative" else "", X, Y, X, x["id"], fmt(x["ind"], 3), fmt(x["eind"], 3),
                        fmt(x["dep"]), fmt(x["edep"]), Y, y["id"], fmt(y["ind"], 3), fmt(y["eind"], 3), fmt(y["dep"]), fmt(y["edep"]), vv)))
            elif x or y:
                rec[v] = (X if x else Y) + " only"
        csv_rows.append(rec)
    # alpha 0 row
    z, txt, pv, status = alpha0[name]
    rec = {"figure": "a52e01_fig8a", "group": PANEL, "category": "alpha 0", "station": "0.0000", "drawn_curve": name,
           "A_series": series["A"], "B_series": series["B"], "C_series": series["C"], "D_series": series["D"],
           "label_check": lchk, "readers": ",".join(X for X in READERS if z[X]), "summary": status, "tested": "Cp_b"}
    for X in READERS:
        zr = [r for r in rows_of[X] if r["kind"] == "curve_at_zero"]
        rec.update(side(zr[0] if zr else None, X + "_"))
        for r in zr:
            r["used"] += 1
    for X, Y in PAIRS:
        v, dcol, ecol, _, _ = pcols(X, Y)
        rec[v] = pv[X + "-" + Y]
        if z[X] and z[Y]:
            rec[dcol], rec[ecol] = fmt(z[X]["zero"] - z[Y]["zero"]), fmt(z[X]["edep"] + z[Y]["edep"])
            if pv[X + "-" + Y].startswith("DISAGREE"):
                dis.append((name, "alpha 0", "%s-%s: %s" % (X, Y, pv[X + "-" + Y])))
    csv_rows.append(rec)
# D rows not yet used (boxes outside the station grid of others are used as stations; crossing box above alpha 4)
for r in R["D"]:
    if not r["used"]:
        rec = {"figure": "a52e01_fig8a", "group": PANEL, "category": "station" if r["kind"] == "box" else r["kind"],
               "station": fmt(r["st"], 4), "drawn_curve": " / ".join(dmap.get(c, "?") for c in r["curves"]),
               "readers": "D", "verdict": "D only (outside alpha 0 to 4, or not on a common station)"}
        rec.update(side(r, "D_"))
        csv_rows.append(rec)
        r["used"] += 1

with open(OUT + "pairs_a52e01_fig8a_m17.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=COLS)
    w.writeheader()
    for rec in csv_rows:
        w.writerow({k: rec.get(k, "") for k in COLS})

say("== Counts (Mach 1.7 drawn curves #7 to #10, alpha 0 to 4)")
for k, v in sorted(counts.items()):
    say("   %s %d" % (k, v))
say()
say("== Every disagreement (unresolved; no winner, no average, no envelope, no majority)")
for name in M17:
    items = [(c, t) for n, c, t in dis if n == name]
    if items:
        say("   [%s]" % name)
        for c, t in items:
            say("     %s: %s" % (c, t))
say("   total: %d (%s)" % (len(dis), ", ".join("%s %d" % (k, v) for k, v in sorted(collections.Counter(c for _, c, _ in dis).items()))))
say()
say("== Where the curves meet at low angles, each reader's call (quoted from each method.md; see those files for the full text)")
say("   M 1.7 wing 4 and wing 2 near alpha 4.4 to 5.1, all four readers call a crossing:")
say("     A (section 8 item 11): 'the M=1.7 lines c and d meet at about alpha 4.5 and were taken as crossing (straight")
say("       continuation); alternative: touching, with the parts above 4.5 swapped.'")
say("     B (section 8 item 15): 'The wing 4 and wing 2 curves cross near alpha 4.4 (continuity call; alternative: they")
say("       touch and swap lower parts).'")
say("     C ('Where curves meet'): 'a17-c3 and a17-cX, 8(a) supersonic, alpha 4.4 to 4.9. [...] so they cross. Other way:")
say("       they touch and turn back.'")
say("     D ('Where curves meet', flag 5): 'My call: they cross. Wing 2 (R) continues straight down [...] Wing 4 (M)")
say("       continues on the diagonal [...] Alternative: they touch and swap (wing 4 straight down, wing 2 on the diagonal).'")
say("   M 1.7 wing 2's diagonal across wing 3 near alpha 1.0 to 1.6:")
say("     C: 'a17-c1 and a17-c3, 8(a) supersonic, alpha 1.1 to 1.6. A crossing. c1 stays vertical and c3's diagonal")
say("       continues down-left. Other way: they swap below the crossing.'")
say("     D (flag 6): 'R continues down and left to about Cp -0.13 at alpha 0, and A continues straight down to Cp -0.183.")
say("       [...] Alternative: swap (A takes the diagonal, R takes the column).'")
say("     B (section 8 item 15): wing 2 runs 'down to x -0.20 at alpha 2, then a \"/\" stroke to x -0.145 at alpha 0.37, not")
say("       reaching alpha 0'.")
say("     A: gives the diagonal as a separate line, 'M=1.7 line b (diagonal stroke at bottom)' (lower end alpha 0.43), and")
say("       continues 'M=1.7 line d' down the -0.2 grid line as boxes at -0.200 to its lower end at alpha 1.82.")
say()
say("== Every row of every reader at alpha 0 to 4 for these drawn curves (stations, boxes, ends, alpha 0 rows)")
for l in listing:
    say(l)
say("   D's box X_MR (the wing 4 / wing 2 crossing, alpha %s +-%s, Cp %s +-%s, flag crossing) lies above alpha 4; it is in the" % tuple(
    fmt(v, n) for v, n in ((next(r for r in R["D"] if r["id"] == "X_MR")["ind"], 3), (next(r for r in R["D"] if r["id"] == "X_MR")["eind"], 3),
                           (next(r for r in R["D"] if r["id"] == "X_MR")["dep"], 4), (next(r for r in R["D"] if r["id"] == "X_MR")["edep"], 4))))
say("   pairs file as a D-only row.")
say()
say("== Every flag of the four readers on these rows (flag column; notes are in the pairs file)")
for name in M17:
    mem = drawn[name]
    for X in READERS:
        for c in mem[X]:
            fl = collections.OrderedDict()
            for r in curves[X][c]:
                if r["flag"] and (r["ind"] is None or r["ind"] - (r["eind"] or 0) <= AMAX + 1e-9):
                    for cl in r["note"].split("; "):
                        fl.setdefault(cl, []).append(r["id"])
            if fl:
                say("   [%s] %s '%s'" % (name, X, c))
                for cl, ids in fl.items():
                    say("       [%s] %s" % (", ".join(i[-14:] for i in ids), cl))
# identity_map.csv
for name in M17:
    mem = drawn[name]
    z, txt, pv, status = alpha0[name]
    row = {"figure": "a52e01_fig8a", "group": PANEL, "drawn_curve": name}
    for X in READERS:
        row[X + "_curve"] = " / ".join(mem[X])
        row[X + "_wing_call"] = " / ".join(wc["text"] for Y, c, wc in mem["calls"] if Y == X)
        row["alpha0_" + X] = txt[X]
    row["wing_category"] = mem["cat"]
    row["wing_detail"] = mem["detail"]
    for X, Y in PAIRS:
        row["alpha0_%s_%s" % (X, Y)] = pv[X + "-" + Y]
    row["alpha0_status"] = status
    id_rows.append(row)
with open(OUT + "identity_map.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(id_rows[0].keys()))
    w.writeheader()
    for r in id_rows:
        w.writerow(r)
missing = [r["id"] for r in R["D"] if not r["used"]]
assert not missing, missing
with open(OUT + "pairing.txt", "w") as f:
    f.write("\n".join(out_lines) + "\n")
print("\n".join(out_lines))

if __name__ == "__main__" and not os.path.isdir(OUT):
    raise SystemExit("run from the repository root")
