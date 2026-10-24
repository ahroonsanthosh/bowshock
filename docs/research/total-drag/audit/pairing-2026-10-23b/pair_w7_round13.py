"""Neutral pairing of W7's first readings with round 13's blind readings (R&M 3323 fig. 4, Johnston figs. 10(a) to
10(c), RM L8B13 fig. 4(e)).

Usage (from the repository root): python3 -I docs/research/total-drag/audit/pairing-2026-10-23b/pair_w7_round13.py

Reads only committed readings:
  first (A), W7: read with `git show 59d3780:<path>` from origin/claude/wip/w7-fins (that branch is not merged here):
    docs/research/total-drag/audit/w7-fins/rm3323_fig4_first.csv (commit 375e8de)
    docs/research/total-drag/audit/w7-fins/johnston_fig10{a,b,c}_first.csv (c7c46cf for (b), b519c47 for (a), (c))
    docs/research/total-drag/audit/w7-fins/rml8b13_fig4e_first.csv (2acdd2a)
  second (B), round 13: docs/research/total-drag/audit/round13/readings/ on this branch (90db015, dc99784, 79caf7a).
Writes, next to this script: pairs_<figure>.csv (one row per pair, box, or unmatched symbol) and pairing_output.txt.

Method (as pairing-2026-10-22/pair_figures.py):
  * Symbols are matched by position within a gate of GATE_PX page pixels (6 px), the pixel converted to data units by
    the figure's scale; pairs of the same type first, nearest first, then across types, nearest first; each used once.
    R&M 3323 is matched within a panel (one Mach number) only.
  * A same-type pair agrees when on each axis |A - B| <= e_A + e_B.
  * Reported, never resolved toward either reading: pairs outside errors, type disagreements, symbols in one reading
    only (with the nearest symbol of the other).
  * Round 13's merged clusters are boxes in which every centre of the cluster must lie, not points. A W7 symbol is
    assigned to a box when it lies within the gate of the box's edge (distance 0 inside), up to the number of centres
    the box holds; the result is "inside" or "outside" (by how much), reported apart from the point pairs. A box
    member with no W7 symbol assigned is listed.

Errors. Round 13 states about 2 sigma per axis (its method.md: sqrt((2c)^2 + (2 loo)^2) px). W7 states a placement
error judged by eye (1 to 3 px) combined in quadrature with 0.5 px of grid trace (plus a centre-definition term for
triangles); it does not say whether that is 1 sigma or a bound; the 2026-10-22 pairing read it as a placement half
range. Three tests are shown, none preferred:
  (1) as stated: e_A + e_B;
  (2) common 2 sigma, W7 read as 1 sigma: 2 e_A + e_B;
  (3) common 2 sigma, W7 read as a half range of a uniform spread (sigma = e_A / sqrt 3): (2 / sqrt 3) e_A + e_B.
"""
import csv
import io
import math
import os
import subprocess

ROOT = "docs/research/total-drag/audit/"
W7_COMMIT = "59d3780"
W7 = ROOT + "w7-fins/"
R13 = ROOT + "round13/readings/"
OUT = ROOT + "pairing-2026-10-23b/"
GATE_PX = 6.0
K_HALF = 2 / math.sqrt(3)
BASES = (("as stated", 1.0), ("2 sigma, W7 as 1 sigma", 2.0), ("2 sigma, W7 as half range", K_HALF))


def git_rows(path):
    text = subprocess.run(["git", "show", f"{W7_COMMIT}:{path}"], capture_output=True, text=True, check=True).stdout
    return list(csv.DictReader(l for l in io.StringIO(text) if not l.startswith("#")))


def rows(path):
    with open(path, newline="") as f:
        return list(csv.DictReader(l for l in f if not l.startswith("#")))


def pt(rid, typ, series, group, x, ex, y, ey, cands=None, fill="", flag="", note=""):
    return {"id": rid, "type": typ, "cands": cands or {typ}, "series": series, "group": group, "x": float(x),
            "ex": float(ex), "y": float(y), "ey": float(ey), "fill": fill, "flag": flag, "note": note}


def rng(s):
    a, b = s.split("..")
    return float(a), float(b)


def r13_items(path, typ_of, series_of, group_of, box_members=None, attrs=None):
    """Round 13 rows: points, and merged-ink boxes (grouped by their extents)."""
    points, boxes = [], {}
    for r in rows(path):
        if r["x_val"] == "":
            key = (group_of(r), r["extent_x"], r["extent_y"])
            b = boxes.setdefault(key, {"ids": [], "members": [], "group": group_of(r), "x": rng(r["extent_x"]),
                                       "y": rng(r["extent_y"]), "note": r["notes"]})
            b["ids"].append(r["id"])
            b["members"] += box_members(r) if box_members else [typ_of(r)]
            continue
        fill, flag = attrs(r) if attrs else ("", "")
        points.append(pt(r["id"], typ_of(r), series_of(r), group_of(r), r["x_val"], r["x_err"], r["y_val"],
                         r["y_err"], fill=fill, flag=flag, note=r["notes"]))
    out = []
    for b in boxes.values():
        b["id"] = "+".join(b["ids"])
        b["remaining"] = list(b["members"])
        b["taken"] = []
        out.append(b)
    return points, out


FIGS = []

# ---- ARC R&M 3323 fig. 4 ------------------------------------------------------------------------------------------
W7_REF = {"35?": "35? (heavy glyph, W7: no legend entry, source not traced)"}


def ref_type(ref):
    return W7_REF.get(ref, "ref (" + ref + ")")


a = []
for r in git_rows(W7 + "rm3323_fig4_first.csv"):
    s = r["symbol"]
    fill = "filled" if s.endswith("filled") else ("partly filled" if s.endswith("heavy") else "open")
    flag = {"0": "no", "1": "yes", "?": "uncertain"}[r["flag"]]
    a.append(pt(r["id"], ref_type(r["ref"]), r["symbol"], r["mach"], r["h_over_c_pct"], r["h_over_c_err"], r["cpb"],
                r["cpb_err"], fill=fill, flag=flag, note=r["note"]))


def m3323(r):
    return r["conditions"].split("M = ")[1].split(",")[0]


b, bx = r13_items(R13 + "rm3323_fig4.csv", lambda r: "ref (" + r["symbol"].split("_")[0] + ")",
                  lambda r: r["symbol"], m3323,
                  attrs=lambda r: ("filled" if r["symbol"].endswith("_f") else "open",
                                   "yes" if "flagged" in r["series"] else "no"))
FIGS.append({"key": "rm3323_fig4", "title": "ARC R&M 3323 fig. 4 (h/c %, Cp_b), W7 against round 13",
             "axes": ("h_over_c_pct", "Cp_b"), "scale": (0.0342, 0.00172), "a": a, "b": b, "boxes": bx,
             "attrs": True})

# ---- Johnston figs. 10(a) to 10(c) --------------------------------------------------------------------------------
JT = {"rtriangle": "right triangle"}
for panel, yk, yname, ys in (("a", "cdf", "c_d,f", 0.0000954), ("b", "cpb", "C_p,b", 0.000478),
                             ("c", "cdt", "c_d,t", 0.0000954)):
    a = []
    for r in git_rows(W7 + f"johnston_fig10{panel}_first.csv"):
        if r["alpha_deg"] == "6?":
            a.append(pt(r["id"], "triangle or right triangle (W7: kind uncertain)", "alpha 6 or 8", "all", r["mach"],
                        r["mach_err"], r[yk], r[yk + "_err"], cands={"triangle", "right triangle"}, note=r["note"]))
        else:
            a.append(pt(r["id"], r["symbol"], "alpha " + r["alpha_deg"], "all", r["mach"], r["mach_err"], r[yk],
                        r[yk + "_err"], note=r["note"]))
    b, bx = r13_items(R13 + f"johnston_fig10{panel}.csv", lambda r: JT.get(r["symbol"], r["symbol"]),
                      lambda r: r["series"].replace(" deg", ""), lambda r: "all")
    FIGS.append({"key": f"johnston_fig10{panel}", "title": f"Johnston fig. 10({panel}) (M, {yname}), W7 against "
                 "round 13", "axes": ("M", yname), "scale": (0.000476, ys), "a": a, "b": b, "boxes": bx})

# ---- NACA RM L8B13 fig. 4(e) --------------------------------------------------------------------------------------
a = []
for r in git_rows(W7 + "rml8b13_fig4e_first.csv"):
    if r["shape_call"] == "uncertain":
        a.append(pt(r["id"], "circle or square (W7: uncertain)", "face uncertain", "all", r["mach"], r["mach_err"],
                    r["p_over_p0"], r["p_over_p0_err"], cands={"circle", "square"}, note=r["note"]))
    else:
        a.append(pt(r["id"], r["shape_call"], r["shape_call"], "all", r["mach"], r["mach_err"], r["p_over_p0"],
                    r["p_over_p0_err"], note=r["note"]))
b, bx = r13_items(R13 + "rml8b13_fig4e.csv", lambda r: r["symbol"].replace("_dot", ""),
                  lambda r: r["symbol"].replace("_dot", ""), lambda r: "all",
                  box_members=lambda r: ["circle", "square"])
FIGS.append({"key": "rml8b13_fig4e", "title": "NACA RM L8B13 fig. 4(e) (M, p/p0), W7 against round 13",
             "axes": ("M", "p_over_p0"), "scale": (0.000562, 0.00234), "a": a, "b": b, "boxes": bx})


# ---- matching -----------------------------------------------------------------------------------------------------
def d_point(p, q, sc):
    if p["group"] != q["group"]:
        return math.inf
    return math.hypot((p["x"] - q["x"]) / sc[0], (p["y"] - q["y"]) / sc[1])


def d_box(p, bo, sc):
    if p["group"] != bo["group"]:
        return math.inf
    dx = max(bo["x"][0] - p["x"], 0, p["x"] - bo["x"][1]) / sc[0]
    dy = max(bo["y"][0] - p["y"], 0, p["y"] - bo["y"][1]) / sc[1]
    return math.hypot(dx, dy)


def match(A, B, BX, sc):
    cands = []
    for i, p in enumerate(A):
        for j, q in enumerate(B):
            d = d_point(p, q, sc)
            if d <= GATE_PX:
                cands.append((d, i, "p", j))
        for j, bo in enumerate(BX):
            d = d_box(p, bo, sc)
            if d <= GATE_PX:
                cands.append((d, i, "b", j))
    cands.sort(key=lambda t: (t[0], t[1], t[2], t[3]))
    pairs, inbox, used_a, used_b = [], [], set(), set()
    for same in (True, False):
        for d, i, kind, j in cands:
            if i in used_a:
                continue
            p = A[i]
            if kind == "p":
                if j in used_b or (same and B[j]["type"] not in p["cands"]):
                    continue
                pairs.append((i, j, d))
                used_b.add(j)
            else:
                bo = BX[j]
                if not bo["remaining"]:
                    continue
                hit = [t for t in bo["remaining"] if t in p["cands"]]
                if same and not hit:
                    continue
                t = hit[0] if hit else bo["remaining"][0]
                bo["remaining"].remove(t)
                if len(set(hit)) > 1:  # W7 left the type open: either member could be the one W7 placed
                    bo["remaining"] = [r if r not in hit else " or ".join(sorted(set(hit))) + " (the other one)"
                                       for r in bo["remaining"]]
                    t = " or ".join(sorted(set(hit)))
                bo["taken"].append((i, t))
                inbox.append((i, j, d, t))
            used_a.add(i)
    return (pairs, inbox, [i for i in range(len(A)) if i not in used_a],
            [j for j in range(len(B)) if j not in used_b])


def nearest(p, others, boxes, sc):
    best = None
    for q in others:
        d = d_point(p, q, sc)
        if best is None or d < best[0]:
            best = (d, f"{q['id']} ({q['type']}, {q['series']})")
    for bo in boxes:
        d = d_box(p, bo, sc)
        if best is None or d < best[0]:
            best = (d, f"box {bo['id']}")
    if best is None or math.isinf(best[0]):
        return "none in the same panel"
    return f"{best[1]} at {best[0]:.1f} px"


def nearest_a(q, A, sc):
    best = min(A, key=lambda p: d_point(p, q, sc))
    d = d_point(best, q, sc)
    return "none in the same panel" if math.isinf(d) else f"{best['id']} ({best['type']}, {best['series']}) at {d:.1f} px"


def same_type_near(p, others, sc, a_side):
    """For a symbol left unmatched: the nearest symbol of the other reading of an allowed type within 15 px, and
    whether the values are within the stated errors (information only; not counted as a pair)."""
    best = None
    for q in others:
        ok_type = (q["type"] in p["cands"]) if a_side else (p["type"] in q["cands"])
        d = d_point(p, q, sc)
        if ok_type and d <= 15 and (best is None or d < best[0]):
            best = (d, q)
    if best is None:
        return ""
    d, q = best
    a, b = (p, q) if a_side else (q, p)
    dx, dy = a["x"] - b["x"], a["y"] - b["y"]
    ok = within(dx, dy, a, b, 1.0)
    return (f"; nearest of an allowed type (paired elsewhere or beyond the gate): {q['id']} at {d:.1f} px, values {'within' if ok else 'outside'} the "
            f"stated errors (dx {dx:+.5f}, comb {a['ex'] + b['ex']:.5f}; dy {dy:+.5f}, comb {a['ey'] + b['ey']:.5f})")


def within(dx, dy, p, q, k):
    return abs(dx) <= k * p["ex"] + q["ex"] + 1e-12 and abs(dy) <= k * p["ey"] + q["ey"] + 1e-12


FIELDS = ["figure", "kind", "verdict_as_stated", "verdict_2sigma_W7_as_1sigma", "verdict_2sigma_W7_as_half_range",
          "A_id", "A_type", "A_series", "A_group", "A_x", "A_x_err", "A_y", "A_y_err", "A_fill", "A_flag", "B_id",
          "B_type", "B_series", "B_x", "B_x_err_2sigma", "B_y", "B_y_err_2sigma", "B_fill", "B_flag", "dx_A_minus_B",
          "dy_A_minus_B", "comb_x_as_stated", "comb_y_as_stated", "distance_px", "note"]
lines = []


def say(s=""):
    lines.append(s)


say("Pairing of W7's first readings (A, origin/claude/wip/w7-fins at 59d3780) with round 13's blind readings (B),")
say("by a neutral party who made neither. Gate 6 px; same type first, then across types; nothing resolved.")
say("How each reader defines its errors:")
say("  W7: per row, a placement error judged by eye (1 to 3 px) and 0.5 px of grid trace in quadrature, plus 2 px (R&M")
say("    3323) or 4 px (Johnston) for a triangle's centre definition; not stated as 1 sigma or as a bound. The")
say("    2026-10-22 pairing took it as a placement half range.")
say("  Round 13: about 2 sigma per axis, sqrt((2 c)^2 + (2 loo)^2) px (c the centre sigma, loo the calibration's")
say("    leave-one-out rms). Its merged-ink boxes are bounds (ink box shrunk by 6 px, 10 px in Johnston 10(b)).")
say("Verdicts are given on three bases: as stated (e_A + e_B); common 2 sigma with W7 read as 1 sigma (2 e_A + e_B);")
say("common 2 sigma with W7 read as a uniform half range ((2 / sqrt 3) e_A + e_B).")
say()
summary = []
for F in FIGS:
    A, B, BX, sc = F["a"], F["b"], F["boxes"], F["scale"]
    pairs, inbox, a_only, b_only = match(A, B, BX, sc)
    table, out_err, type_dis, attr_dis = [], [], [], []
    n_in = {k: 0 for k, _ in BASES}
    ratios = []
    dy_by_type = {}
    for i, j, d in sorted(pairs, key=lambda t: (A[t[0]]["group"], A[t[0]]["series"], A[t[0]]["x"], A[t[0]]["y"])):
        p, q = A[i], B[j]
        dx, dy = p["x"] - q["x"], p["y"] - q["y"]
        same = q["type"] in p["cands"]
        verdicts = []
        for name, k in BASES:
            ok = within(dx, dy, p, q, k)
            if same:
                verdicts.append("agree" if ok else "outside errors")
                n_in[name] += ok
            else:
                verdicts.append("type disagreement (values " + ("within" if ok else "outside") + " errors)")
        uncertain = p["type"] != q["type"] and same
        if same:
            ratios.append((abs(dx) / (p["ex"] + q["ex"]), abs(dy) / (p["ey"] + q["ey"])))
            dy_by_type.setdefault(q["type"], []).append(dy / sc[1])
            if verdicts[0] != "agree":
                out_err.append((p, q, dx, dy, verdicts))
        else:
            type_dis.append((p, q, dx, dy, verdicts))
        note = "W7 left the type open; round 13 typed it" if uncertain else ""
        if F.get("attrs") and same and (p["fill"] != q["fill"] or (p["flag"] != q["flag"])):
            attr_dis.append((p, q))
            note = (note + "; " if note else "") + f"fill W7 {p['fill']} / R13 {q['fill']}; flag W7 {p['flag']} / R13 {q['flag']}"
        table.append([F["key"], "point pair", *verdicts, p["id"], p["type"], p["series"], p["group"], p["x"], p["ex"],
                      p["y"], p["ey"], p["fill"], p["flag"], q["id"], q["type"], q["series"], q["x"], q["ex"], q["y"],
                      q["ey"], q["fill"], q["flag"], f"{dx:+.5f}", f"{dy:+.5f}", f"{p['ex'] + q['ex']:.5f}",
                      f"{p['ey'] + q['ey']:.5f}", f"{d:.1f}", note])
    box_rows = []
    for i, j, d, t in sorted(inbox, key=lambda u: (BX[u[1]]["x"][0], A[u[0]]["y"])):
        p, bo = A[i], BX[j]
        ox = max(bo["x"][0] - p["x"], 0, p["x"] - bo["x"][1])
        oy = max(bo["y"][0] - p["y"], 0, p["y"] - bo["y"][1])
        v_in = "inside" if d == 0 else "outside"
        v_e = [("inside" if d == 0 else ("outside, within W7's error" if ox <= k * p["ex"] + 1e-12 and
                                         oy <= k * p["ey"] + 1e-12 else "outside, beyond W7's error"))
               for _, k in BASES]
        if " or " in t:
            tnote = "W7 left the type open; either box member"
        elif t in p["cands"]:
            tnote = ""
        else:
            tnote = f"type: W7 {p['type']} assigned to a box member typed {t}"
        box_rows.append((p, bo, d, ox, oy, v_e, tnote))
        table.append([F["key"], "W7 point against round 13 box", *v_e, p["id"], p["type"], p["series"], p["group"],
                      p["x"], p["ex"], p["y"], p["ey"], p["fill"], p["flag"], bo["id"], t, "merged ink (box)",
                      f"{bo['x'][0]}..{bo['x'][1]}", "", f"{bo['y'][0]}..{bo['y'][1]}", "", "", "",
                      f"{ox:.5f}" if ox else "0", f"{oy:.5f}" if oy else "0", "", "", f"{d:.1f}",
                      "dx, dy here: how far outside the box on each axis; " + tnote])
    empty_members = []
    for bo in BX:
        for t in bo["remaining"]:
            empty_members.append((bo, t))
            table.append([F["key"], "round 13 box member with no W7 symbol", "", "", "", "", "", "", "", "", "", "",
                          "", "", "", bo["id"], t, "merged ink (box)", f"{bo['x'][0]}..{bo['x'][1]}", "",
                          f"{bo['y'][0]}..{bo['y'][1]}", "", "", "", "", "", "", "", "", ""])
    for i in a_only:
        p = A[i]
        table.append([F["key"], "first reading (W7) only", "", "", "", p["id"], p["type"], p["series"], p["group"],
                      p["x"], p["ex"], p["y"], p["ey"], p["fill"], p["flag"], "", "", "", "", "", "", "", "", "", "",
                      "", "", "", "", "nearest in round 13: " + nearest(p, B, BX, sc)])
    for j in b_only:
        q = B[j]
        table.append([F["key"], "second reading (round 13) only", "", "", "", "", "", "", "", "", "", "", "", "", "",
                      q["id"], q["type"], q["series"], q["x"], q["ex"], q["y"], q["ey"], q["fill"], q["flag"], "",
                      "", "", "", "", "nearest in W7: " + nearest_a(q, A, sc)])
    with open(OUT + f"pairs_{F['key']}.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(FIELDS)
        w.writerows(table)

    say(f"=== {F['title']}")
    say(f"  axes x = {F['axes'][0]}, y = {F['axes'][1]}; 1 px = {sc[0]} and {sc[1]}; gate {GATE_PX:.0f} px")
    tA, tB = {}, {}
    for p in A:
        tA[p["type"]] = tA.get(p["type"], 0) + 1
    for q in B:
        tB[q["type"]] = tB.get(q["type"], 0) + 1
    nbm = sum(len(bo["members"]) for bo in BX)
    say(f"  W7: {len(A)} symbols ({', '.join(f'{n} {t}' for t, n in tA.items())})")
    say(f"  round 13: {len(B)} points ({', '.join(f'{n} {t}' for t, n in tB.items())})"
        + (f"; {len(BX)} boxes of merged ink holding {nbm} centres" if BX else ""))
    say(f"  point pairs {len(pairs)}; same type {len(pairs) - len(type_dis)}; type disagreements {len(type_dis)}; "
        f"W7 only {len(a_only)}; round 13 only {len(b_only)}")
    say("  same type and within errors: " + "; ".join(f"{name} {n_in[name]}" for name, _ in BASES)
        + f" (of {len(pairs) - len(type_dis)})")
    if ratios:
        say(f"  largest |difference| / combined error as stated, same-type pairs: x {max(r[0] for r in ratios):.2f}, "
            f"y {max(r[1] for r in ratios):.2f}")
    for t, v in sorted(dy_by_type.items()):
        v = sorted(v)
        say(f"    y offset W7 - round 13 in px, {t} ({len(v)}): median {v[len(v) // 2]:+.1f}, "
            f"range {v[0]:+.1f} to {v[-1]:+.1f}")
    for p, q, dx, dy, v in out_err:
        say(f"    OUTSIDE ERRORS (as stated): {p['id']} / {q['id']} ({q['type']}, {q['series']}, {p['group']}): "
            f"A ({p['x']}, {p['y']}) B ({q['x']}, {q['y']}); dx {dx:+.5f} (comb {p['ex'] + q['ex']:.5f}), "
            f"dy {dy:+.5f} (comb {p['ey'] + q['ey']:.5f}); W7 as 1 sigma: {v[1]}; W7 as half range: {v[2]}")
    for p, q, dx, dy, v in type_dis:
        say(f"    TYPE: {p['id']} {p['type']} ({p['series']}) against {q['id']} {q['type']} ({q['series']}), "
            f"{p['group']}: A ({p['x']}, {p['y']}) B ({q['x']}, {q['y']}); dx {dx:+.5f}, dy {dy:+.5f}; "
            f"values as stated: {v[0].split('(')[1].rstrip(')')}")
    for p, q in attr_dis:
        say(f"    ATTRIBUTE: {p['id']} / {q['id']} ({q['type']}, M {p['group']}): fill W7 {p['fill']}, round 13 "
            f"{q['fill']}; flag W7 {p['flag']}, round 13 {q['flag']}")
    if BX:
        n_inside = sum(1 for r in box_rows if r[2] == 0)
        say(f"  W7 points against round 13's boxes: {len(box_rows)} assigned; inside {n_inside}; outside "
            f"{len(box_rows) - n_inside}")
        for p, bo, d, ox, oy, v, tnote in box_rows:
            say(f"    BOX {bo['id']} (M {bo['x'][0]}..{bo['x'][1]}, y {bo['y'][0]}..{bo['y'][1]}): W7 {p['id']} "
                f"{p['type']} ({p['x']}, {p['y']}): {'inside' if d == 0 else f'outside by {d:.1f} px (x {ox:.5f}, y {oy:.5f})'}"
                + ("" if d == 0 else f"; with W7's error: {v[0]} (as stated), {v[1]} (x2)") + (f"; {tnote}" if tnote else ""))
        for bo, t in empty_members:
            say(f"    BOX MEMBER WITH NO W7 SYMBOL: {bo['id']} {t} (M {bo['x'][0]}..{bo['x'][1]})")
    for i in a_only:
        p = A[i]
        say(f"    W7 ONLY: {p['id']} {p['type']} ({p['series']}, {p['group']}) at ({p['x']}, {p['y']}); nearest "
            f"round 13: {nearest(p, B, BX, sc)}{same_type_near(p, B, sc, True)}")
    for j in b_only:
        q = B[j]
        say(f"    ROUND 13 ONLY: {q['id']} {q['type']} ({q['series']}, {q['group']}) at ({q['x']}, {q['y']}); "
            f"nearest W7: {nearest_a(q, A, sc)}{same_type_near(q, A, sc, False)}")
    say()
    summary.append((F["key"], len(A), len(B), len(BX), nbm, len(pairs), *(n_in[n] for n, _ in BASES),
                    len(type_dis), len(a_only), len(b_only), len(box_rows),
                    sum(1 for r in box_rows if r[2] == 0), len(empty_members)))

say("=== Summary: figure, W7 symbols, R13 points, R13 boxes, centres in boxes, point pairs, agree as stated, "
    "agree 2 sigma (W7 as 1 sigma), agree 2 sigma (W7 as half range), type disagreements, W7 only, R13 only, W7 "
    "points on boxes, inside, box members with no W7 symbol")
for s in summary:
    say("  " + ", ".join(str(x) for x in s))

say()
say("=== R&M 3323 fig. 4: the three heavy glyphs at h/c 0.14, a disagreement on identity (kept, not resolved)")
F = FIGS[0]
for p in F["a"]:
    if p["type"].startswith("35?"):
        q = min(F["b"], key=lambda q: d_point(p, q, F["scale"]))
        say(f"  M {p['group']}: W7 {p['id']} '{p['series']}', ref 35?, fill {p['fill']}, flag {p['flag']} "
            f"({p['note']}) at ({p['x']}, {p['y']}); round 13 {q['id']} {q['series']}, fill {q['fill']}, flag "
            f"{q['flag']} at ({q['x']}, {q['y']}); {d_point(p, q, F['scale']):.1f} px apart")
say("  W7 (375e8de): drawn partly filled, no legend entry matches; kept as '35?', source not traced, sets nothing. Its")
say("  later note (after opening RM L8B13, 2acdd2a) says they may be ref. 31's half circles drawn filled as a wing-flow")
say("  test: a possibility only, still 'source not traced'. Round 13 (dc99784): typed (31) filled (a round top, flat")
say("  bottom), with the caveat that a badly drawn filled glyph of another entry cannot be excluded; m12-09 flagged.")
say("  The positions agree within the stated errors; the identity (glyph and so the source) does not. Flags also")
say("  differ: W7 '?' on B02 and C10 (a mark at the upper right) against round 13 unflagged; both flag D06 / m12-09.")
say()
say("=== Notes on the readings (no resolution)")
say("  * W7's Johnston fig. 10(b) CSV holds 99 symbol rows (20, 21, 20, 18 + 2 uncertain, 18); its method text says 98.")
say("  * Centre conventions. R&M 3323: both readers take the middle of the glyph's bounding box, flags left out. Johnston:")
say("    round 13 centres triangles on the bounding box; W7 centres them on the centroid in figs. 10(a) and 10(c) (its")
say("    symrefine.py) and on the bounding box in 10(b). For a 21 px triangle the two differ by 3.5 px (W7 lower on the")
say("    page); the median triangle y offsets above (-3.1 px in 10(a), -2.1 px in 10(c), -1.3 px in 10(b)) show it. W7's")
say("    stated triangle errors include 4 px for this; all triangle pairs are within the stated errors.")
say("  * RM L8B13 fig. 4(e): at e-03, e-08 and e-13 round 13 fitted a circle and a square 3 to 5 px apart; W7 placed")
say("    one symbol (e08 'two outlines drawn over each other; placed as one'); the other symbol is round 13 only. At the")
say("    11 merged stations W7 placed one symbol each; round 13 holds two centres in each box.")
say("  * Johnston fig. 10(b): at M about 0.985 W7 places only a square (no circle or diamond seen) and round 13 lists")
say("    a circle, a square and a possible diamond in one box (d11 'may be absent'). Between M 0.914 and 1.007 round 13")
say("    finds no alpha 8 symbol; W7 places a8_09 at M 0.935 and types a8_07 at M 0.887 as alpha 8 where round 13 has")
say("    a triangle (alpha 6), t07.")
say()

# ---- blindness audit ------------------------------------------------------------------------------------------------
def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True).stdout.strip()


say("=== Blindness audit")
say("  Commit times (committer, UTC):")
for c, what in (("375e8de", "W7, R&M 3323 fig. 4"), ("c7c46cf", "W7, Johnston fig. 10(b)"),
                ("b519c47", "W7, Johnston figs. 10(a), 10(c)"), ("2acdd2a", "W7, RM L8B13 fig. 4(e)"),
                ("90db015", "round 13, RM L8B13 fig. 4(e)"), ("dc99784", "round 13, R&M 3323 fig. 4"),
                ("79caf7a", "round 13, Johnston figs. 10(a) to 10(c)")):
    say(f"    {c} {git('log', '-1', '--format=%ci', c)}  {what}")
say("  W7's commits are on origin/claude/wip/w7-fins only (git branch -r --contains: "
    + ", ".join(git("branch", "-r", "--contains", "375e8de").split()) + "); none is an ancestor of round 13's commits,")
say("  and no file of these three figures exists under audit/w7-fins/ on round 13's branch before 90db015 or at 79caf7a.")
say("  Main (origin/claude/eloquent-dirac-ek9hcf) was last committed at "
    + git("log", "-1", "--format=%ci", "origin/claude/eloquent-dirac-ek9hcf")
    + ", before W7's first reading of these figures; its 0014 section 10.7")
say("  runs to entry (q); the entries that name these figures, (k) and the headings, hold registrations, not readings.")
say("  (r), (s) and (t) are on w7-fins only. The handoff branch was last committed at "
    + git("log", "-1", "--format=%ci", "origin/claude/wip/handoff") + ".")
say("  Decisions file (scratchpad decisions.md), every line naming R&M 3323, Johnston or RM L8B13, as read on 2026-10-23:")
say("    27: W7 23 Oct: amendment (r) done (8e19865). Amendment (s) allocated: R&M 3323 fig 5 -> check; Johnston figs")
say("        4-9,11,12 removed; RM L8B13 limited to 4(c),4(e), untraced marks set nothing; hole 4 left open. Next free (t).")
say("    28: (s) done 12bdb52. (t) allocated: RM L8B13 fig 4(c) -> check. Next free (u). Round 13 blind reader started")
say("        for R&M 3323 fig 4, Johnston 10(a,b,c), RM L8B13 4(e).")
say("    No value, symbol count or symbol identity of any of these figures.")
say("  W7: its method files (method_rm3323_figs4_5.md, method_johnston_figs4_12.md) say no other reading was known and")
say("  that it opened nothing under round10/, round11/, round12/ or pairing-*; RM L8B13's method names no other reading.")
say("  Round 13 did not exist until 08:16, after all four W7 commits.")
say("  Round 13: its method.md lists what it opened (the brief, HANDOFF.md, its status file, the decisions file once,")
say("  rounds 10 and 11's method.md and scripts listing, sources.md by grep, 0014 at entry (k) and the 10.7 heading")
say("  lines on main, the three PDFs) and says it never entered audit/w7-fins/ or the w7-fins branch. Everything it")
say("  lists either predates W7's readings or holds no values of these figures (checked above).")
say("  Verdicts: W7's readings: blind (no other reading existed). Round 13's readings: blind as far as can be checked; nothing")
say("  it lists opening held W7's values, and W7's values were on no branch it worked from. Its own statement that it")
say("  did not open the w7-fins branch (reachable by fetch) cannot be checked from the repository. One observation, not")
say("  evidence either way: on the heavy glyphs round 13 reached the identity W7's later note offered only as a")
say("  possibility (ref. 31); round 13 gives its own reasons (round top, flat bottom), and W7's note was on w7-fins only.")

text = "\n".join(lines) + "\n"
print(text, end="")
with open(OUT + "pairing_output.txt", "w") as f:
    f.write(text)
