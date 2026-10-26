"""Three-way neutral pairing of the blind readings of NACA RM A52E01 fig. 8 (a) and (b): round 15-A (A), round 15-B (B)
and round 17 (C, the third blind reading). Named band-setting by 0014 section 10.7 entry (ac), second part.

Usage (from the repository root): python3 -I docs/research/total-drag/audit/pairing-2026-10-26-a52e01-three/pair_three.py

Reads only committed readings on claude/wip/lift-te-below-1.5:
  A: docs/research/total-drag/audit/round15-A/readings/a52e01_fig8{a,b}.csv   (commit 1182556)
  B: docs/research/total-drag/audit/round15-B/readings/a52e01_fig8{a,b}.csv   (commit 1182556)
  C: docs/research/total-drag/audit/round17/readings/a52e01_fig8{a,b}.csv and round17/wing_calls.csv (commit 8a55ee4)
Writes, next to this script: pairs_a52e01_fig8a.csv, pairs_a52e01_fig8b.csv, identity_map.csv, pairing.txt.

The same method and rules as the two-way pairing (pairing-2026-10-26-a51j11-a52e01/pair_round15.py, commit cccd251),
applied to each of the three pairs of readers (A-B, A-C, B-C). The pairer read neither page and settles nothing; no
winner is picked, nothing is averaged or enveloped, nothing is decided by majority.

Rule. Every reader states each error as about 2 sigma or as a bound (box half-width). Two values agree when
|X - Y| <= e_X + e_Y, the two stated errors summed as written.

Curve identity from the values. For each ordered pair of readers (X, Y) and each curve of X, its partner in Y is the
curve of Y in the same panel that agrees at the most common stations (ties broken by the median |difference|); it is
"mapped" when it agrees at half or more of at least 3 common stations and no other curve agrees as often (all as in
cccd251). Two curves are linked when each direction maps one to the other, or one direction maps them and the other
direction maps that curve to no curve; a one-way map that the other direction contests (maps to a different curve) is
not a link and is listed. A drawn curve is a set of curves joined by links (connected components). Within a drawn curve
every pair of readers present is compared station by station; where two readers' curves are joined only through the
third reader's curve, the identity table says so. A curve that the station rule cannot link (too few common stations)
gets a supplementary check against its best candidate (common stations, ends, alpha 0), labelled as the pairer's
check; it is not used to join drawn curves or to pair values.

C's curve is the stem of its row id (a06-outer-001 -> a06-outer); C's wing is the first wing in its series column, the
others are its alternatives, its confidence comes from wing_calls.csv.

What is compared, for each pair of readers, within a drawn curve:
  * Stations: rows of kind curve and box at the same alpha (rounded to 0.001); only the pressure coefficient is
    tested. Several rows at one alpha (hook branches) are paired nearest first, each used once. C reads in a dash gap
    at the nearest ink at its own alpha and on flat parts at fixed x, so many of C's alphas are not on a 0.5 deg step;
    such rows have no station partner (they are listed as one-reader rows; nothing is interpolated).
  * A station row with no partner at that alpha is compared, when the other reader has an end of the same drawn curve
    whose alpha lies within the two alpha errors of the station, with that end's value, and marked so (as in cccd251).
    These "station vs end" results are listed apart from station pairs: on a nearly level hook stroke near an end, a
    row a few tenths of a degree from the end's alpha can differ from the end's value by construction.
  * Ends (curve_end): each reader's ends are put on the lower or upper side of its curve (two ends: lower and upper
    alpha; one end: by the curve's middle alpha), and the ends on one side are compared; both axes are tested.
  * Alpha 0 (curve_at_zero): a value is a row at alpha 0 with a pressure coefficient (C: y = 0; C's flagged rows at
    their own alpha say the curve does not visibly reach alpha 0 and are not values). Both values tested where both
    readers give one; where one gives a value and the other does not, the item is READ ONCE (unpaired, not agreed).

Wing calls per drawn curve: each reader's wing and whether that reader flagged its wing call uncertain:
  A: uncertain when its notes carry "wing 2 / wing 4 told apart by dash pattern only ... alternative: the other of
     the two"; A names no wing in the supersonic panels.
  B: uncertain when its flagged notes carry a "curve identity:" clause (the four subsonic curves it flags, and every
     supersonic curve, flagged with "wing from dash lengths only").
  C: uncertain when its confidence is medium or low (its rows then carry every possible wing).
  Category (not a decision; no majority): "two agree, neither uncertain" when at least two readers name the same wing
  and at least two of those do not flag it; "two agree, one or both uncertain" when two or more name the same wing but
  fewer than two of them are unflagged; "disputed" when two or more readers name a wing and no two name the same;
  "read once (one wing call)" when only one reader in the drawn curve names a wing; "no wing call" when none does. The
  third reader's call is always given beside the category. A's segment calls in its method.md (section 8, items 8 and
  9: which curve a hook belongs to) are segment identities, not the curve's wing call; they appear among the
  continuation items and in the quotations.
"""
import collections
import csv
import os
import re
import statistics

ROOT = "docs/research/total-drag/audit/"
SRC = {"A": ROOT + "round15-A/readings/", "B": ROOT + "round15-B/readings/", "C": ROOT + "round17/readings/"}
CWING = ROOT + "round17/wing_calls.csv"
OUT = ROOT + "pairing-2026-10-26-a52e01-three/"
TOL = 1e-9
READERS = ("A", "B", "C")
PAIRS = (("A", "B"), ("A", "C"), ("B", "C"))
FIGS = [
    {"key": "a52e01_fig8a", "title": "RM A52E01 fig. 8(a) (Re 1.5 million): (p_b - p_0)/q against nominal alpha", "cfig": "8(a)"},
    {"key": "a52e01_fig8b", "title": "RM A52E01 fig. 8(b) (Re 3.8 million): (p_b - p_0)/q against nominal alpha", "cfig": "8(b)"},
]
IND, DEP = "alpha", "Cp_b"

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


def c_wing_calls():
    d = {}
    for r in load(CWING):
        m = re.search(r"curve (\S+?);", r["note"] + ";")
        d[(r["figure"], m.group(1))] = r
    return d


CW = c_wing_calls()


def read(fig, reader):
    rows = []
    for i, r in enumerate(load(SRC[reader] + fig["key"] + ".csv")):
        d = {"reader": reader, "order": i, "id": r["id"], "kind": r["kind"], "panel": r["panel"], "series": r["series"],
             "symbol": r["symbol"], "x": num(r["x"]), "ex": num(r["x_err"]), "y": num(r["y"]), "ey": num(r["y_err"]),
             "basis": r["err_basis"], "flag": r["flag"], "note": r["note"], "used": 0, "group": r["panel"]}
        if reader == "C":
            d["curve"] = r["id"].rsplit("-", 1)[0]
        else:
            d["curve"] = r["series"]
        d["ind"], d["eind"], d["dep"], d["edep"] = d["y"], d["ey"], d["x"], d["ex"]
        if reader == "C" and d["kind"] == "curve_at_zero" and (d["y"] is None or abs(d["y"]) > 1e-9):
            d["dep_zero"] = None  # C: lowest ink at its own alpha, the curve does not visibly reach alpha 0
        elif d["kind"] == "curve_at_zero":
            d["dep_zero"] = d["dep"]
        d["st"] = round(d["ind"], 3) if d["ind"] is not None else None
        rows.append(d)
    return rows


def curve_label(fig, reader, rows):
    """wing, mach, uncertain flag, alternatives text, confidence, style."""
    r0 = rows[0]
    notes = " ; ".join(r["note"] for r in rows)
    lab = {"wing": None, "mach": None, "uncertain": False, "alt": "", "conf": "", "style": ""}
    if reader == "A":
        m = re.search(r"M=([0-9.]+) line", r0["series"])
        lab["mach"] = m.group(1) if m else None
        w = re.search(r"wing (\d)", r0["series"])
        lab["wing"] = w.group(1) if w else None
        s = r0["symbol"]
        lab["style"] = "" if "not resolved" in s else s
        if "wing 2 / wing 4 told apart by dash pattern only" in notes:
            lab["uncertain"] = True
            lab["alt"] = "the other of wing 2 and wing 4"
    elif reader == "B":
        m = re.search(r"M = ([0-9.]+);", r0["series"])
        lab["mach"] = m.group(1) if m else None
        lab["wing"] = re.search(r"Wing (\d)", r0["series"]).group(1)
        idc = sorted({c for r in rows if r["flag"] for c in r["note"].split("; ") if "alternative wing" in c or "by elimination" in c})
        if any("curve identity:" in r["note"] for r in rows if r["flag"]):
            lab["uncertain"] = True
            lab["alt"] = "; ".join(idc) if idc else "flagged 'curve identity: ... wing from dash lengths only', no alternative named"
    else:
        cw = CW[(fig["cfig"], r0["curve"])]
        wings = [w.strip() for w in r0["series"].split(";")]
        lab["wing"] = re.search(r"(\d)", wings[0]).group(1)
        lab["alt"] = ", ".join(wings[1:])
        lab["conf"] = cw["confidence"]
        lab["uncertain"] = cw["confidence"] != "high"
        m = re.search(r"([0-9.]+) \(arrow\)", cw["printed_label"])
        lab["mach"] = m.group(1) if m else None
    return lab


def label_text(reader, lab):
    t = []
    if lab["mach"]:
        t.append("M " + lab["mach"])
    t.append(("wing " + lab["wing"]) if lab["wing"] else "no wing named")
    if reader == "C":
        t.append("confidence " + lab["conf"] + ((", alternatives " + lab["alt"]) if lab["alt"] else ""))
    elif lab["uncertain"]:
        t.append("flagged uncertain (" + lab["alt"] + ")")
    if reader == "A" and lab["style"]:
        t.append("line style " + lab["style"])
    return ", ".join(t)


def stations(rows):
    d = collections.defaultdict(list)
    for r in rows:
        if r["kind"] in ("curve", "box") and r["dep"] is not None:
            d[r["st"]].append(r)
    return d


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


def compare_curves(r1, r2):
    s1, s2 = stations(r1), stations(r2)
    n_pairs = n_agree = 0
    diffs, common = [], sorted(set(s1) & set(s2))
    for s in common:
        for a, b in pair_lists(s1[s], s2[s]):
            if a is None or b is None:
                continue
            n_pairs += 1
            diffs.append(abs(a["dep"] - b["dep"]))
            if agree(a["dep"], a["edep"], b["dep"], b["edep"]):
                n_agree += 1
    return {"common": len(common), "pairs": n_pairs, "agree": n_agree,
            "median": statistics.median(diffs) if diffs else None}


def runs(seq):
    out = []
    for s, t in seq:
        if out and out[-1][2] == t:
            out[-1][1] = s
        else:
            out.append([s, s, t])
    return ["%s%s: %s" % (fmt(a, 3), "" if a == b else " to " + fmt(b, 3), t) for a, b, t in out]


JOIN = re.compile(r"^(alternative|which|so |I read|taken as|if it is|values swap|the values)", re.I)


def clauses(note):
    out = []
    for c in note.split("; "):
        if out and JOIN.match(c):
            out[-1] += "; " + c
        else:
            out.append(c)
    return out


BASE_COLS = ["figure", "group", "category", "verdict", "A_series", "B_series", "label_check", "station",
             "A_id", "A_kind", "A_x", "A_x_err", "A_y", "A_y_err", "A_basis", "A_flag",
             "B_id", "B_kind", "B_x", "B_x_err", "B_y", "B_y_err", "B_basis", "B_flag",
             "tested", "diff_A_minus_B", "sum_of_errors", "diff_ind_A_minus_B", "sum_of_ind_errors",
             "also_agrees_with", "A_note", "B_note"]
NEW_COLS = ["drawn_curve", "readers", "C_series", "C_id", "C_kind", "C_x", "C_x_err", "C_y", "C_y_err", "C_basis",
            "C_flag", "verdict_A_C", "diff_A_minus_C", "sum_of_errors_A_C", "diff_ind_A_minus_C",
            "sum_of_ind_errors_A_C", "verdict_B_C", "diff_B_minus_C", "sum_of_errors_B_C", "diff_ind_B_minus_C",
            "sum_of_ind_errors_B_C", "C_note"]
CSV_COLS = BASE_COLS + NEW_COLS


def side_cols(r, p):
    if r is None:
        return {p + k: "" for k in ("id", "kind", "x", "x_err", "y", "y_err", "basis", "flag", "note")}
    return {p + "id": r["id"], p + "kind": r["kind"], p + "x": fmt(r["x"]), p + "x_err": fmt(r["ex"]),
            p + "y": fmt(r["y"]), p + "y_err": fmt(r["ey"]), p + "basis": r["basis"], p + "flag": r["flag"],
            p + "note": r["note"]}


def pair_cols(X, Y):
    if (X, Y) == ("A", "B"):
        return "verdict", "diff_A_minus_B", "sum_of_errors", "diff_ind_A_minus_B", "sum_of_ind_errors"
    return ("verdict_%s_%s" % (X, Y), "diff_%s_minus_%s" % (X, Y), "sum_of_errors_%s_%s" % (X, Y),
            "diff_ind_%s_minus_%s" % (X, Y), "sum_of_ind_errors_%s_%s" % (X, Y))


class UF:
    def __init__(self):
        self.p = {}

    def find(self, a):
        self.p.setdefault(a, a)
        while self.p[a] != a:
            self.p[a] = self.p[self.p[a]]
            a = self.p[a]
        return a

    def union(self, a, b):
        self.p[self.find(a)] = self.find(b)


def run():
    say("Three-way neutral pairing: NACA RM A52E01 fig. 8 (a) and (b), readings A (round 15-A), B (round 15-B), C (round 17)")
    say("Named by 0014 section 10.7 entry (ac), second part. Readings committed in 1182556 (A, B) and 8a55ee4 (C).")
    say("Rule: two values agree when |X - Y| <= e_X + e_Y, each reader's stated error (2 sigma or bound) as written. Same")
    say("method as the two-way pairing (pairing-2026-10-26-a51j11-a52e01, cccd251), applied to the pairs A-B, A-C and B-C.")
    say("Curve identity from the values; drawn curves are the curves joined by value links. Nothing decided by majority,")
    say("nothing averaged, enveloped or resolved toward any reading. Items only one reader gives are READ ONCE.")
    say()
    say("Format of pairs_<figure>.csv: the columns of cccd251's pairs files come first, unchanged in name, order and")
    say("meaning (verdict, diff_A_minus_B and sum_of_errors are the A-B comparison exactly as before; also_agrees_with now")
    say("names, for each reader's row, the curves of the other readings outside this drawn curve that agree with it, as")
    say("'A row agrees with B ...'). label_check now gives the three readers' wing calls for the drawn curve. New columns are")
    say("appended after B_note: drawn_curve, readers (which readers have a row), C's row (C_series ... C_flag), the A-C and")
    say("B-C comparisons (verdict_A_C, diff_A_minus_C, sum_of_errors_A_C, and the alpha terms for ends; the same for B-C)")
    say("C_note, and last summary (on alpha 0 rows: the drawn curve's alpha 0 status). Rows are one per drawn curve and station")
    say("(or end side, or alpha 0) per match group: at one station the")
    say("A and B rows are paired nearest first as before, then C's rows are attached nearest first to those groups;")
    say("leftover rows stand alone. category is station, end or alpha 0 as before. identity_map.csv is now one row per")
    say("drawn curve with the three readers' curves, links, wing calls and alpha 0 values (its columns are new; it replaces")
    say("the A -> B partner rows of cccd251's identity_map.csv for this figure).")
    say()
    say("Links (new for three readings): two curves are joined when both directions map them to each other, or one maps")
    say("them and the other direction maps that curve to no curve; a contested one-way map is not a link and is listed.")
    say("Curves the station rule cannot link get a supplementary check (common stations, ends, alpha 0) against their best")
    say("candidate, labelled as the pairer's check and not used for drawn curves or pairs. 'station vs end' items (a row")
    say("compared with the other reader's end, the cccd251 rule) are listed apart from station pairs.")
    say()
    say("A-B against cccd251: the A-B comparisons are those of cccd251, except in 8(a) M = 1.2, 1.4, 1.7, where A's 'M=1.4")
    say("line c' and B's 'M = 1.4; Wing 2' (a tie in cccd251, so not paired there) are now one drawn curve through C's")
    say("'a14-K' and are compared (8 of 10 stations agree, 1 end pair); the counts below include them.")
    say()
    say("C's file as written: six box rows of 8(a) M=0.9 (a09-Ld-001, -003, -004 and a09-Rr-002, -004, -005, alpha 5.5 to")
    say("6.0, the X crossing) give x = -1.7905 or -1.7906, outside the axis (0 to -0.8). They are paired as written and")
    say("produce the station disagreements listed at alpha 5.5 and 5.75 to 6.0 in that panel; they look like a slip in C's")
    say("file, which only C can correct. No other row of any reading lies outside the axes.")
    say()
    all_dis = []
    read_once = []
    glance = []
    id_rows = []
    flag_text = []
    alpha0_rows = []
    wing_rows = []
    for fig in FIGS:
        R = {X: read(fig, X) for X in READERS}
        curves = {X: collections.OrderedDict() for X in READERS}
        for X in READERS:
            for r in R[X]:
                curves[X].setdefault((r["group"], r["curve"]), []).append(r)
        labels = {(X, k): curve_label(fig, X, rows) for X in READERS for k, rows in curves[X].items()}
        groups = list(collections.OrderedDict.fromkeys(k[0] for X in READERS for k in curves[X]))
        # ---- pairwise partners (both directions) and links
        partner = {}
        links = collections.defaultdict(dict)
        stats_all = {}
        for X, Y in [(a, b) for a in READERS for b in READERS if a != b]:
            for g in groups:
                kx_list = [k for k in curves[X] if k[0] == g]
                ky_list = [k for k in curves[Y] if k[0] == g]
                for kx in kx_list:
                    st = {ky: compare_curves(curves[X][kx], curves[Y][ky]) for ky in ky_list}
                    for ky in ky_list:
                        stats_all[(X, kx, Y, ky)] = st[ky]
                    ranked = sorted(ky_list, key=lambda ky: (-st[ky]["agree"], st[ky]["median"] if st[ky]["median"] is not None else 9))
                    best = ranked[0] if ranked else None
                    second = ranked[1] if len(ranked) > 1 else None
                    s1 = st[best] if best else None
                    s2 = st[second] if second else None
                    status = "cannot be mapped"
                    if s1 and s1["common"] >= 3 and s1["pairs"] and s1["agree"] >= 0.5 * s1["pairs"] and (s2 is None or s2["agree"] < s1["agree"]):
                        status = "mapped"
                    elif s1 and s1["agree"] > 0 and s2 is not None and s2["agree"] == s1["agree"]:
                        status = "cannot be mapped (tie)"
                    partner[(X, kx, Y)] = (best if status == "mapped" else None, status, best, s1, second, s2)
        uf = UF()
        for X in READERS:
            for k in curves[X]:
                uf.find((X, k))
        contested = []
        for (X, kx, Y), p in partner.items():
            if not p[0]:
                continue
            ky = p[0]
            back = partner[(Y, ky, X)][0]
            key = tuple(sorted([(X, kx), (Y, ky)]))
            links[key][X + "->" + Y] = True
            if back is None or back == kx:
                uf.union((X, kx), (Y, ky))
            else:
                contested.append((X, kx, Y, ky, back))
                links[key]["contested"] = "%s->%s maps %s '%s' to '%s', but %s->%s maps '%s' to %s '%s'" % (
                    X, Y, X, kx[1], ky[1], Y, X, ky[1], X, back[1])
        comps = collections.OrderedDict()
        for X in READERS:
            for k in curves[X]:
                comps.setdefault(uf.find((X, k)), []).append((X, k))
        drawn = []
        for g in groups:
            n = 0
            for root, mem in comps.items():
                if mem[0][1][0] != g:
                    continue
                n += 1
                d = {"name": "%s #%d" % (g, n), "group": g, "members": {X: [k for (Y, k) in mem if Y == X] for X in READERS}}
                drawn.append(d)
        dc_of = {}
        for d in drawn:
            for X in READERS:
                for k in d["members"][X]:
                    dc_of[(X, k)] = d

        def link_text(d, X, Y):
            out = []
            for kx in d["members"][X]:
                for ky in d["members"][Y]:
                    st = stats_all[(X, kx, Y, ky)]
                    key = tuple(sorted([(X, kx), (Y, ky)]))
                    dirs = links.get(key, {})
                    arrows = [k for k in dirs if "->" in k]
                    if "contested" in dirs:
                        how = "joined only through the third reading (" + dirs["contested"] + ")"
                    elif len(arrows) == 2:
                        how = "mapped both ways"
                    elif arrows:
                        how = "mapped " + arrows[0] + " (the other direction maps it to no curve)"
                    else:
                        how = "joined only through the third reading"
                    out.append("%s, %d of %d station pairs agree" % (how, st["agree"], st["pairs"]))
            return "; ".join(out) if out else "-"

        # ---- segments: for each curve, which curves of each other reading agree at each station
        seg = {}
        for X in READERS:
            for k, rows_k in curves[X].items():
                parts = []
                for Y in READERS:
                    if Y == X:
                        continue
                    so = {ky: stations(rows_y) for ky, rows_y in curves[Y].items() if ky[0] == k[0]}
                    seq = []
                    for s, lst in sorted(stations(rows_k).items()):
                        if not any(s in dd for dd in so.values()):
                            continue
                        hits = [ky[1] for ky, dd in so.items() if s in dd and any(
                            agree(r["dep"], r["edep"], o["dep"], o["edep"]) for r in lst for o in dd[s])]
                        seq.append((s, " + ".join("'" + h + "'" for h in hits) if hits else "none"))
                    parts.append(Y + ": " + (" | ".join(runs(seq)) or "(no common station)"))
                seg[(X, k)] = parts
        say("=" * 118)
        say("== " + fig["title"])
        say("   rows: A %d (%d flagged), B %d (%d flagged), C %d (%d flagged); curves: A %d, B %d, C %d; drawn curves %d" % (
            len(R["A"]), sum(1 for r in R["A"] if r["flag"]), len(R["B"]), sum(1 for r in R["B"] if r["flag"]),
            len(R["C"]), sum(1 for r in R["C"] if r["flag"]), len(curves["A"]), len(curves["B"]), len(curves["C"]), len(drawn)))
        on_step = sum(1 for r in R["C"] if r["kind"] in ("curve", "box") and abs(r["st"] * 2 - round(r["st"] * 2)) < 1e-6)
        say("   C's station rows (curve, box) on a 0.5 deg step: %d of %d; the rest are read at their own alpha (dash gaps, fixed x" % (
            on_step, sum(1 for r in R["C"] if r["kind"] in ("curve", "box"))))
        say("   on flat parts, turning points, boxes) and can only be paired where another reader has a row at the same alpha.")
        # ---- identity table
        say()
        say("-- drawn curves and wing calls (%s)" % fig["key"])
        for d in drawn:
            mem = d["members"]
            say("   [%s]" % d["name"])
            for X in READERS:
                for k in mem[X]:
                    say("     %s '%s': %s" % (X, k[1], label_text(X, labels[(X, k)])))
                if not mem[X]:
                    say("     %s: no curve of this reading joins this drawn curve" % X)
            for X, Y in PAIRS:
                say("     link %s-%s: %s" % (X, Y, link_text(d, X, Y)))
            for X in READERS:
                for k in mem[X]:
                    for Y in READERS:
                        if Y == X or (mem[Y] and partner[(X, k, Y)][0] in mem[Y]):
                            continue
                        mapped, status, raw, s1, second, s2 = partner[(X, k, Y)]
                        txt = "%s '%s' -> %s: %s; best %s '%s' %d of %d agree (common stations %d), next '%s' %d of %d" % (
                            X, k[1], Y, status if not mapped else "mapped to '%s', which is not in this drawn curve" % mapped[1],
                            Y, raw[1] if raw else "-", s1["agree"] if s1 else 0, s1["pairs"] if s1 else 0,
                            s1["common"] if s1 else 0, second[1] if second else "-", s2["agree"] if s2 else 0,
                            s2["pairs"] if s2 else 0)
                        say("     not linked: " + txt)
                        if not mem[Y]:
                            all_dis.append((fig["key"], d["group"], "identity", "%s: %s" % (d["name"], txt)))
            # supplementary check for a reading missing from this drawn curve (pairer's check, not used for the map)
            d["supp"] = []
            for X in READERS:
                for k in mem[X]:
                    for Y in READERS:
                        if Y == X or mem[Y]:
                            continue
                        raw = partner[(X, k, Y)][2]
                        if raw is None:
                            continue
                        s1 = partner[(X, k, Y)][3]
                        parts = ["common stations %d, %d of %d agree" % (s1["common"], s1["agree"], s1["pairs"])]

                        def ends_of_curve(rows):
                            es = sorted((r for r in rows if r["kind"] == "curve_end"), key=lambda r: r["ind"])
                            return {"lower": es[0], "upper": es[-1]} if len(es) >= 2 else ({"lower": es[0]} if es else {})

                        ex, ey = ends_of_curve(curves[X][k]), ends_of_curve(curves[Y][raw])
                        for sd in ("lower", "upper"):
                            if sd in ex and sd in ey:
                                a, b = ex[sd], ey[sd]
                                ok = agree(a["dep"], a["edep"], b["dep"], b["edep"]) and agree(a["ind"], a["eind"], b["ind"], b["eind"])
                                parts.append("%s end %s (alpha %s, %s against alpha %s, %s)" % (
                                    sd, "agrees" if ok else "differs", fmt(a["ind"], 3), fmt(a["dep"]), fmt(b["ind"], 3), fmt(b["dep"])))
                        za = [r for r in curves[X][k] if r["kind"] == "curve_at_zero" and r.get("dep_zero") is not None]
                        zb = [r for r in curves[Y][raw] if r["kind"] == "curve_at_zero" and r.get("dep_zero") is not None]
                        if za and zb:
                            ok = agree(za[0]["dep"], za[0]["edep"], zb[0]["dep"], zb[0]["edep"])
                            parts.append("alpha 0 %s (%s +-%s against %s +-%s)" % ("agrees" if ok else "differs", fmt(za[0]["dep"]), fmt(za[0]["edep"]), fmt(zb[0]["dep"]), fmt(zb[0]["edep"])))
                        lb = labels[(Y, raw)]
                        txt = "%s '%s' against its best candidate %s '%s' (%s, in drawn curve %s): %s" % (
                            X, k[1], Y, raw[1], label_text(Y, lb), dc_of[(Y, raw)]["name"] if (Y, raw) in dc_of else "-", "; ".join(parts))
                        d["supp"].append((Y, raw, txt))
                        say("     supplementary (pairer's check of an unlinked curve, not used for the map or the pairs): " + txt)
            conflicts = [X for X in READERS if len(mem[X]) > 1]
            if conflicts:
                say("     NOTE: more than one curve of reading %s joins this drawn curve" % ", ".join(conflicts))
                all_dis.append((fig["key"], d["group"], "identity", "%s: more than one curve of reading %s joins it (%s)" % (
                    d["name"], ", ".join(conflicts), "; ".join("%s '%s'" % (X, k[1]) for X in conflicts for k in mem[X]))))
            # wing category
            calls = []
            for X in READERS:
                for k in mem[X]:
                    lab = labels[(X, k)]
                    calls.append((X, lab["wing"], lab["uncertain"]))
            named = [(X, w, u) for X, w, u in calls if w]
            by_w = collections.defaultdict(list)
            for X, w, u in named:
                by_w[w].append((X, u))
            cat, detail = "disputed", ""
            best = None
            for w, lst in sorted(by_w.items(), key=lambda t: (-sum(1 for _, u in t[1] if not u), -len(t[1]))):
                if len(lst) >= 2:
                    best = (w, lst)
                    break
            if best:
                w, lst = best
                n_un = sum(1 for _, u in lst if not u)
                cat = "two agree, neither uncertain" if n_un >= 2 else "two agree, one or both uncertain"
                others = [(X, ww, u) for X, ww, u in calls if ww != w]
                detail = "wing %s named by %s; %s" % (w, ", ".join(X + (" (uncertain)" if u else "") for X, u in lst),
                                                      ("; ".join("%s names %s%s" % (X, ("wing " + ww) if ww else "no wing", " (uncertain)" if u and ww else "") for X, ww, u in others)) or "no other call")
            else:
                detail = "; ".join("%s names %s%s" % (X, ("wing " + w) if w else "no wing", " (uncertain)" if u and w else "") for X, w, u in calls)
                if len(named) == 1:
                    cat = "read once (one wing call)"
                elif not named:
                    cat = "no wing call"
            cands = []
            for Y, raw, _ in d["supp"]:
                lb = labels[(Y, raw)]
                c = "%s '%s' %s" % (Y, raw[1], ("wing " + lb["wing"] + (" (uncertain)" if lb["uncertain"] else "")) if lb["wing"] else "no wing")
                if c not in cands:
                    cands.append(c)
            if cands:
                detail += " [not linked by the station rule, best candidates: %s; see the supplementary check]" % "; ".join(cands)
            d["wing_cat"], d["wing_detail"] = cat, detail
            d["calls_text"] = " | ".join("%s '%s': %s" % (X, k[1], label_text(X, labels[(X, k)])) for X in READERS for k in mem[X])
            say("     wing calls: %s: %s" % (cat.upper(), detail))
            # Mach group check (supersonic)
            machs = {X: labels[(X, mem[X][0])]["mach"] for X in READERS if mem[X]}
            if any(machs.values()):
                vals = {v for v in machs.values() if v}
                mtxt = ("same Mach group %s in %s" % (list(vals)[0], ", ".join(X for X in machs if machs[X]))) if len(vals) == 1 else \
                    "MACH GROUP DIFFERS: " + ", ".join("%s %s" % (X, machs[X]) for X in machs)
                d["mach"] = mtxt
                say("     Mach group: %s" % mtxt)
                if len(vals) > 1:
                    all_dis.append((fig["key"], d["group"], "identity", "%s: %s" % (d["name"], mtxt)))
            else:
                d["mach"] = ""
            for X in READERS:
                for k in mem[X]:
                    say("     segments of %s '%s': %s" % (X, k[1], " || ".join(seg[(X, k)])))
        # ---- rows: stations, ends, alpha 0, per drawn curve
        csv_rows = []
        counts = collections.OrderedDict()

        def cnt(g, key):
            counts.setdefault(g, collections.Counter())[key] += 1

        def label_check(d):
            return "; ".join("%s %s" % (X, label_text(X, labels[(X, k)])) for X in READERS for k in d["members"][X])

        for d in drawn:
            g = d["group"]
            mem = d["members"]
            rows_of = {X: [r for k in mem[X] for r in curves[X][k]] for X in READERS}
            st_of = {X: stations(rows_of[X]) for X in READERS}
            ends_of = {X: [r for r in rows_of[X] if r["kind"] == "curve_end"] for X in READERS}
            series = {X: " / ".join(k[1] for k in mem[X]) for X in READERS}
            lchk = label_check(d)
            # stations
            for s in sorted(set().union(*[set(st_of[X]) for X in READERS])):
                la, lb, lc = st_of["A"].get(s, []), st_of["B"].get(s, []), st_of["C"].get(s, [])
                grp = [[a, b, None] for a, b in pair_lists(la, lb)]
                refs = [(i, (gg[0] or gg[1])) for i, gg in enumerate(grp)]
                cand = sorted((abs(c["dep"] - ref["dep"]), i, j) for i, ref in refs for j, c in enumerate(lc))
                ui, uj = set(), set()
                for _, i, j in cand:
                    if i in ui or j in uj:
                        continue
                    ui.add(i)
                    uj.add(j)
                    grp[i][2] = lc[j]
                grp += [[None, None, c] for j, c in enumerate(lc) if j not in uj]
                for a, b, c in grp:
                    rowd = {"A": a, "B": b, "C": c}
                    rec = {"figure": fig["key"], "group": g, "category": "station", "A_series": series["A"],
                           "B_series": series["B"], "C_series": series["C"], "label_check": lchk, "station": fmt(s, 4),
                           "drawn_curve": d["name"], "readers": ",".join(X for X in READERS if rowd[X])}
                    for X in READERS:
                        rec.update(side_cols(rowd[X], X + "_"))
                        if rowd[X]:
                            rowd[X]["used"] += 1
                    tested = []
                    for X, Y in PAIRS:
                        vcol, dcol, ecol, _, _ = pair_cols(X, Y)
                        x, y = rowd[X], rowd[Y]
                        if x and y:
                            ok = agree(x["dep"], x["edep"], y["dep"], y["edep"])
                            rec[vcol] = "agree" if ok else "DISAGREE"
                            rec[dcol] = fmt(x["dep"] - y["dep"])
                            rec[ecol] = fmt(x["edep"] + y["edep"])
                            tested.append(X + "-" + Y)
                            cnt(g, "%s-%s station pair %s" % (X, Y, "agree" if ok else "DISAGREE"))
                        elif x or y:
                            m, o = (X, Y) if x else (Y, X)
                            r = rowd[m]
                            ends = [e for e in ends_of[o] if abs(e["ind"] - r["ind"]) <= (e["eind"] or 0) + (r["eind"] or 0) + TOL]
                            if ends:
                                e = ends[0]
                                ok = agree(r["dep"], r["edep"], e["dep"], e["edep"])
                                rec[vcol] = "%s only station; against the other reader's end %s at alpha %s (%s +-%s): %s" % (
                                    m, e["id"], fmt(e["ind"]), fmt(e["dep"]), fmt(e["edep"]), "agree" if ok else "DISAGREE")
                                xx, yy = (r, e) if m == X else (e, r)
                                rec[dcol] = fmt(xx["dep"] - yy["dep"])
                                rec[ecol] = fmt(xx["edep"] + yy["edep"])
                                cnt(g, "%s-%s station against end %s" % (X, Y, "agree" if ok else "DISAGREE"))
                            else:
                                rec[vcol] = m + " only"
                                cnt(g, "%s-%s %s only station" % (X, Y, m))
                        else:
                            rec[vcol] = ""
                    if not (a or b):
                        rec["verdict"] = "C only"
                    rec["tested"] = (DEP + " (" + ", ".join(tested) + ")") if tested else ""
                    # rows that agree with a curve of another drawn curve (no row of their own drawn curve's partner here)
                    also = []
                    for X in READERS:
                        r = rowd[X]
                        if not r:
                            continue
                        for Y in READERS:
                            if Y == X or rowd[Y]:
                                continue
                            hits = [ky[1] for ky, rows_y in curves[Y].items() if ky[0] == g and ky not in mem[Y] and any(
                                agree(r["dep"], r["edep"], o["dep"], o["edep"]) for o in stations(rows_y).get(s, []))]
                            if hits:
                                also.append("%s row agrees with %s %s" % (X, Y, ", ".join("'" + h + "'" for h in hits)))
                                all_dis.append((fig["key"], g, "continuation", "%s, alpha %s: %s '%s' %s +-%s (%s%s) has no %s row of this drawn curve here, and agrees with %s %s" % (
                                    d["name"], fmt(s, 3), X, r["curve"], fmt(r["dep"]), fmt(r["edep"]), r["basis"],
                                    ", flagged" if r["flag"] else "", Y, Y, ", ".join("'" + h + "'" for h in hits))))
                    # disagreements (pairs with both rows that disagree, or a station against an end that disagrees)
                    for X, Y in PAIRS:
                        vcol = pair_cols(X, Y)[0]
                        v = rec.get(vcol, "")
                        if "DISAGREE" in v:
                            x, y = rowd[X], rowd[Y]
                            if x and y:
                                others = [ky[1] for ky, rows_y in curves[Y].items() if ky[0] == g and ky not in mem[Y] and any(
                                    agree(x["dep"], x["edep"], o["dep"], o["edep"]) for o in stations(rows_y).get(s, []))]
                                all_dis.append((fig["key"], g, "station", "%s, alpha %s, %s-%s: %s '%s' %s +-%s (%s%s) vs %s '%s' %s +-%s (%s%s); diff %s, errors summed %s%s" % (
                                    d["name"], fmt(s, 3), X, Y, X, x["curve"], fmt(x["dep"]), fmt(x["edep"]), x["basis"],
                                    ", flagged" if x["flag"] else "", Y, y["curve"], fmt(y["dep"]), fmt(y["edep"]), y["basis"],
                                    ", flagged" if y["flag"] else "", fmt(x["dep"] - y["dep"]), fmt(x["edep"] + y["edep"]),
                                    ("; %s's value agrees instead with %s %s" % (X, Y, ", ".join("'" + o + "'" for o in others))) if others else "")))
                            else:
                                all_dis.append((fig["key"], g, "station vs end", "%s, alpha %s, %s-%s: %s" % (d["name"], fmt(s, 3), X, Y, v)))
                    rec["also_agrees_with"] = "; ".join(also)
                    csv_rows.append(rec)
            # ends: lower and upper side per reader curve
            sides = {X: {"lower": [], "upper": []} for X in READERS}
            for X in READERS:
                for k in mem[X]:
                    es = sorted((r for r in curves[X][k] if r["kind"] == "curve_end"), key=lambda r: r["ind"])
                    sts = [r["ind"] for r in curves[X][k] if r["kind"] in ("curve", "box") and r["ind"] is not None]
                    mid = statistics.median(sts) if sts else 0
                    if len(es) >= 2:
                        sides[X]["lower"].append(es[0])
                        sides[X]["upper"].append(es[-1])
                        for e in es[1:-1]:
                            sides[X]["lower" if e["ind"] <= mid else "upper"].append(e)
                    for e in es[:1] if len(es) == 1 else []:
                        sides[X]["lower" if e["ind"] <= mid else "upper"].append(e)
            for sd in ("lower", "upper"):
                la, lb, lc = sides["A"][sd], sides["B"][sd], sides["C"][sd]
                grp = [[a, b, None] for a, b in pair_lists(la, lb, key="ind")]
                cand = sorted((abs(c["ind"] - (gg[0] or gg[1])["ind"]), i, j) for i, gg in enumerate(grp) for j, c in enumerate(lc))
                ui, uj = set(), set()
                for _, i, j in cand:
                    if i in ui or j in uj:
                        continue
                    ui.add(i)
                    uj.add(j)
                    grp[i][2] = lc[j]
                grp += [[None, None, c] for j, c in enumerate(lc) if j not in uj]
                for a, b, c in grp:
                    rowd = {"A": a, "B": b, "C": c}
                    rec = {"figure": fig["key"], "group": g, "category": "end", "A_series": series["A"], "B_series": series["B"],
                           "C_series": series["C"], "label_check": lchk, "station": "", "drawn_curve": d["name"],
                           "readers": ",".join(X for X in READERS if rowd[X]), "tested": IND + " and " + DEP + " (" + sd + " end)"}
                    for X in READERS:
                        rec.update(side_cols(rowd[X], X + "_"))
                        if rowd[X]:
                            rowd[X]["used"] += 1
                    for X, Y in PAIRS:
                        vcol, dcol, ecol, dicol, eicol = pair_cols(X, Y)
                        x, y = rowd[X], rowd[Y]
                        if x and y:
                            okd = agree(x["dep"], x["edep"], y["dep"], y["edep"])
                            oki = agree(x["ind"], x["eind"], y["ind"], y["eind"])
                            v = "agree" if okd and oki else "DISAGREE (" + ", ".join(([IND] if not oki else []) + ([DEP] if not okd else [])) + ")"
                            rec.update({vcol: v, dcol: fmt(x["dep"] - y["dep"]), ecol: fmt(x["edep"] + y["edep"]),
                                        dicol: fmt(x["ind"] - y["ind"]), eicol: fmt(x["eind"] + y["eind"])})
                            cnt(g, "%s-%s end pair %s" % (X, Y, "agree" if v == "agree" else "DISAGREE"))
                            if v != "agree":
                                all_dis.append((fig["key"], g, "end", "%s, %s end, %s-%s: %s '%s' (alpha %s +-%s, %s +-%s, %s%s) vs %s '%s' (alpha %s +-%s, %s +-%s, %s%s); %s" % (
                                    d["name"], sd, X, Y, X, x["curve"], fmt(x["ind"]), fmt(x["eind"]), fmt(x["dep"]), fmt(x["edep"]), x["basis"],
                                    ", flagged" if x["flag"] else "", Y, y["curve"], fmt(y["ind"]), fmt(y["eind"]), fmt(y["dep"]),
                                    fmt(y["edep"]), y["basis"], ", flagged" if y["flag"] else "", v)))
                        elif x or y:
                            rec[vcol] = (X if x else Y) + " only"
                            cnt(g, "%s-%s %s only end" % (X, Y, X if x else Y))
                        else:
                            rec[vcol] = ""
                    if not (a or b):
                        rec["verdict"] = "C only"
                    csv_rows.append(rec)
            # alpha 0
            z = {}
            for X in READERS:
                zs = [r for k in mem[X] for r in curves[X][k] if r["kind"] == "curve_at_zero"]
                vals = [r for r in zs if r.get("dep_zero") is not None]
                z[X] = (vals[0] if vals else None, zs[0] if zs else None)
            rec = {"figure": fig["key"], "group": g, "category": "alpha 0", "A_series": series["A"], "B_series": series["B"],
                   "C_series": series["C"], "label_check": lchk, "station": "0.0000", "drawn_curve": d["name"],
                   "readers": ",".join(X for X in READERS if z[X][1]), "tested": ""}
            for X in READERS:
                rec.update(side_cols(z[X][1], X + "_"))
                if z[X][1]:
                    z[X][1]["used"] += 1
            pair_v = {}
            for X, Y in PAIRS:
                vcol, dcol, ecol, _, _ = pair_cols(X, Y)
                x, y = z[X][0], z[Y][0]
                if x and y:
                    ok = agree(x["dep"], x["edep"], y["dep"], y["edep"])
                    rec.update({vcol: "agree" if ok else "DISAGREE", dcol: fmt(x["dep"] - y["dep"]), ecol: fmt(x["edep"] + y["edep"])})
                    pair_v[X + "-" + Y] = "agree" if ok else "DISAGREE"
                    cnt(g, "%s-%s alpha 0 %s" % (X, Y, "agree" if ok else "DISAGREE"))
                    if not ok:
                        all_dis.append((fig["key"], g, "alpha 0", "%s, %s-%s: %s '%s' %s +-%s (%s) vs %s '%s' %s +-%s (%s); diff %s, errors summed %s" % (
                            d["name"], X, Y, X, x["curve"], fmt(x["dep"]), fmt(x["edep"]), x["basis"], Y, y["curve"],
                            fmt(y["dep"]), fmt(y["edep"]), y["basis"], fmt(x["dep"] - y["dep"]), fmt(x["edep"] + y["edep"]))))
                elif x or y:
                    rec[vcol] = "READ ONCE (unpaired, not agreed): %s gives a value, %s does not" % ((X, Y) if x else (Y, X))
                    pair_v[X + "-" + Y] = "read once"
                else:
                    rec[vcol] = "neither gives a value at alpha 0"
                    pair_v[X + "-" + Y] = "neither"
            givers = [X for X in READERS if z[X][0]]
            agreeing = [p for p, v in pair_v.items() if v == "agree"]
            if agreeing:
                status = "TWO OR MORE AGREEING READINGS (%s)" % ", ".join(agreeing)
            elif len(givers) >= 2:
                status = "values from %s, no pair agrees" % ", ".join(givers)
            elif len(givers) == 1:
                status = "READ ONCE (%s only)" % givers[0]
            else:
                status = "NOT READ (no reader gives a value)"
            rec["summary"] = status
            csv_rows.append(rec)

            def ztxt(X):
                v, row = z[X]
                if not mem[X]:
                    return "no curve"
                if v:
                    return "%s +-%s (%s%s)" % (fmt(v["dep"]), fmt(v["edep"]), v["basis"], ", flagged" if v["flag"] else "")
                if row and row["reader"] == "C":
                    return "no value (lowest ink alpha %s at %s)" % (fmt(row["ind"], 3), fmt(row["dep"]))
                if row and row["reader"] == "B":
                    return "no value (" + row["note"].split(";")[0] + ")"
                lows = [r for k in mem[X] for r in curves[X][k] if r["kind"] == "curve_end"]
                lo = min(lows, key=lambda r: r["ind"]) if lows else None
                return "no value (no alpha 0 row%s)" % ("; lowest end alpha %s at %s" % (fmt(lo["ind"], 3), fmt(lo["dep"])) if lo else "")

            d["alpha0"] = {X: ztxt(X) for X in READERS}
            d["alpha0_pairs"] = pair_v
            d["alpha0_status"] = status
            alpha0_rows.append((fig["key"], d))
            if not agreeing:
                read_once.append((fig["key"], g, d["name"], status, "; ".join("%s: %s" % (X, d["alpha0"][X]) for X in READERS)))
        missing = [r["id"] for X in READERS for r in R[X] if not r["used"]]
        assert not missing, missing
        # write pairs csv
        with open(OUT + "pairs_" + fig["key"] + ".csv", "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=CSV_COLS + ["summary"])
            w.writeheader()
            for rec in csv_rows:
                w.writerow({k: rec.get(k, "") for k in CSV_COLS + ["summary"]})
        # identity rows
        for d in drawn:
            mem = d["members"]
            row = {"figure": fig["key"], "group": d["group"], "drawn_curve": d["name"]}
            for X in READERS:
                row[X + "_curve"] = " / ".join(k[1] for k in mem[X])
                labs = [labels[(X, k)] for k in mem[X]]
                row[X + "_wing"] = " / ".join(l["wing"] or "none" for l in labs)
                row[X + "_wing_uncertain"] = " / ".join(("yes" if l["uncertain"] else "no") if l["wing"] else "-" for l in labs)
                row[X + "_alternative"] = " / ".join(l["alt"] for l in labs)
                row[X + "_mach"] = " / ".join(l["mach"] or "" for l in labs)
            row["C_confidence"] = " / ".join(labels[("C", k)]["conf"] for k in mem["C"])
            for X, Y in PAIRS:
                row["link_%s_%s" % (X, Y)] = link_text(d, X, Y)
            row["wing_category"] = d["wing_cat"]
            row["wing_detail"] = d["wing_detail"]
            row["mach_check"] = d["mach"]
            for X in READERS:
                row["alpha0_" + X] = d["alpha0"][X]
            for p in ("A-B", "A-C", "B-C"):
                row["alpha0_" + p.replace("-", "_")] = d["alpha0_pairs"][p]
            row["alpha0_status"] = d["alpha0_status"]
            for X in READERS:
                row["segments_" + X] = " || ".join(" || ".join(seg[(X, k)]) for k in mem[X])
            id_rows.append(row)
        # counts
        say()
        say("-- counts (%s), per panel" % fig["key"])
        tot = collections.Counter()
        for g in groups:
            c = counts.get(g, collections.Counter())
            tot.update(c)
            say("   [%s] %s" % (g, ", ".join("%s %d" % (k, v) for k, v in sorted(c.items()))))
        say("   [all] %s" % ", ".join("%s %d" % (k, v) for k, v in sorted(tot.items())))
        glance.append((fig["key"], tot, collections.Counter(d["wing_cat"] for d in drawn),
                       collections.Counter(d["alpha0_status"].split(" (")[0] for d in drawn), len(drawn)))
        # flags of all three readers
        for X in READERS:
            byc = collections.OrderedDict()
            for r in R[X]:
                if r["flag"]:
                    for cl in clauses(r["note"]):
                        byc.setdefault(r["series"] if X != "C" else r["curve"] + " (" + r["series"] + ")", collections.OrderedDict()).setdefault(cl, []).append(
                            (r["kind"], r["st"] if r["kind"] in ("curve", "box") else r["ind"]))
            flag_text.append("   %s, reader %s: %d flagged of %d rows" % (fig["key"], X, sum(1 for r in R[X] if r["flag"]), len(R[X])))
            for s, dd in byc.items():
                flag_text.append("     %s" % s)
                for cl, where in dd.items():
                    ww = ", ".join("%s %s" % ({"curve": "c", "box": "box", "curve_end": "end", "curve_at_zero": "zero"}[k], fmt(v, 3)) for k, v in where)
                    flag_text.append("       [%s] %s" % (ww, cl))
    # ---- wing category table and alpha 0 table
    say()
    say("=" * 118)
    say("== Wing calls per drawn curve (A, B, C; C's confidence), and the category. No majority is taken. Categories: two agree,\n   neither uncertain; two agree, one or both uncertain; disputed (two or more readers name different wings, no two the\n   same); read once (one wing call); no wing call. The third reader's call is always given.")
    for figk, d in alpha0_rows:
        mem = d["members"]
        say("   [%s] %s: %s | %s" % (figk, d["name"], d["wing_cat"].upper(), d["wing_detail"]))
        say("       calls: %s" % d["calls_text"])
    say()
    say("== Alpha 0 per drawn curve: each reader's value, and each pair")
    for figk, d in alpha0_rows:
        say("   [%s] %s: %s" % (figk, d["name"], d["alpha0_status"]))
        say("       A %s | B %s | C %s" % (d["alpha0"]["A"], d["alpha0"]["B"], d["alpha0"]["C"]))
        say("       A-B %s; A-C %s; B-C %s" % (d["alpha0_pairs"]["A-B"], d["alpha0_pairs"]["A-C"], d["alpha0_pairs"]["B-C"]))
    say()
    say("== Alpha 0 items with no agreeing pair (read once, not read, or values that disagree)")
    for figk, g, name, status, txt in read_once:
        say("   [%s] %s: %s; %s" % (figk, name, status, txt))
    say("   total: %d" % len(read_once))
    # ---- disagreements
    say()
    say("=" * 118)
    say("== Every disagreement (unresolved; no winner picked, nothing averaged, enveloped or decided by majority)")
    cat_order = {"identity": 0, "continuation": 1, "station": 2, "station vs end": 3, "end": 4, "alpha 0": 5}
    seen = set()
    cur = None
    by = collections.Counter()
    for figk, g, cat, txt in sorted(all_dis, key=lambda t: (t[0], [d["group"] for _, d in alpha0_rows if _ == t[0]].index(t[1]) if t[1] in [d["group"] for _, d in alpha0_rows if _ == t[0]] else 0, cat_order[t[2]])):
        if (figk, cat, txt) in seen:
            continue
        seen.add((figk, cat, txt))
        by[(figk, cat)] += 1
        if (figk, g) != cur:
            cur = (figk, g)
            say("   [%s, %s]" % (figk, g))
        say("     %s: %s" % (cat, txt))
    say("   totals: " + ", ".join("%s %s %d" % (f, c, n) for (f, c), n in sorted(by.items())))
    with open(OUT + "identity_map.csv", "w", newline="") as f:
        cols = list(id_rows[0].keys())
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for r in id_rows:
            w.writerow(r)
    # at a glance, after the header
    gl = ["== At a glance (details below)"]
    for figk, tot, wc, zc, nd in glance:
        gl.append("   %s: %d drawn curves" % (figk, nd))
        gl.append("      wing calls: %s" % ", ".join("%s %d" % (k, v) for k, v in sorted(wc.items())))
        gl.append("      alpha 0: %s" % ", ".join("%s %d" % (k, v) for k, v in sorted(zc.items())))
        for X, Y in PAIRS:
            pre = "%s-%s " % (X, Y)
            gl.append("      %s: %s" % (pre.strip(), ", ".join("%s %d" % (k[len(pre):], v) for k, v in sorted(tot.items()) if k.startswith(pre))))
        gl.append("      disagreements listed: %s" % (", ".join("%s %d" % (c, n) for (f, c), n in sorted(by.items()) if f == figk) or "none"))
    gl.append("")
    pos = next(i for i, l in enumerate(out_lines) if l.startswith("=" * 20))
    out_lines[pos:pos] = gl
    return flag_text


QUOTES = """
== Where curves meet: each reader's calls, in its own words (method.md section numbers given)
  A (round15-A/method.md section 8): item 7 "Fig. 8(a) M=0.7 and M=0.6: the wing 2 curve ends by running into the wing 3
    curve at about alpha 10.1, and wing 3 continues up to alpha 12 (it has short dashes above the join). Fig. 8(b) M=0.7:
    the curve with long dashes ends where it meets the short-dash curve at alpha 7.6 and the short-dash curve continues to
    (-0.29, 10.3)." Item 8 "Fig. 8(b) M=0.7 and M=0.8: near the bottom one curve runs down the -0.2 grid line to the axis
    and the other leaves the grid line in a short-dash hook to Cp about -0.31 near alpha 0.2. I gave the hook to wing 3
    because its dashes are short; alternative: the hook belongs to wing 2 and wing 3 is the one hidden in the grid line.
    Fig. 8(b) M=0.6 is drawn the other way (the medium-dash curve ends in the hook and the short-dash curve stops on the
    -0.2 line at alpha 1.2); there I gave the hook to wing 2." Item 9 "Fig. 8(a) M=0.925: the wing 3 curve and the wing 2
    hook stroke cross at about (-0.27, 0.6); the arc from there to the axis at -0.236 is given to wing 2 (hook return),
    alternative wing 3." Item 10 "Fig. 8(a) M=0.9: the two curves meet in an X on the alpha = 6 grid line; both tops are
    taken at alpha 6.0." Item 11 "In fig. 8(a) the M=1.7 lines c and d meet at about alpha 4.5 and were taken as crossing
    (straight continuation); alternative: touching, with the parts above 4.5 swapped."
  B (round15-B/method.md section 8): item 9 "8a M=0.7: the wing 4 curve ends at alpha about 9.6 where it meets the wing 3
    curve (shared piece, flagged)." Item 10 "8a M=0.9: the two curves meet in an X at the top (alpha about 5.9)". Item 11
    "8a M=0.925: the wing 3 and wing 4 curves cross in a '+' near x -0.27, alpha 0.6 to 1.0 (shared, flagged); the small
    stroke near x -0.27, alpha 0.15 to 0.21 is taken as the end of the wing 3 curve". Item 12 "8b M=0.6: below alpha 2.1
    the wing 3 curve runs down the left edge of the x = -0.2 grid line to the frame, and from alpha 1.3 to 3.8 the other
    curve runs on that grid line; all rows there are boxes." Item 15 (8a M = 1.7) "The wing 4 and wing 2 curves cross
    near alpha 4.4 (continuity call; alternative: they touch and swap lower parts)."
  C (round17/method.md, "Where curves meet"): "a07-Q and a07-R, 8(a) M=0.7, alpha 9.5 to 9.8. R's top touches one of Q's
    dashes. Q continues; R starts there." "a09-Ld and a09-Rr, 8(a) M=0.9, alpha 5.4 to 5.9. An X crossing. Each curve
    continues straight" "a0925-A and a0925-B, 8(a) M=0.925, alpha 0.7 to 1.0. A right-angle crossing. A stays vertical
    and B stays near-horizontal on both sides. Other way: they swap below the crossing." "a17-c3 and a17-cX, 8(a)
    supersonic, alpha 4.4 to 4.9. [...] so they cross. Other way: they touch and turn back." "b06-Left and b06-Right,
    8(b) M=0.6, alpha 1.1 to 2.0. Merged with each other and the -0.2 grid line. Right had been riding the line's left
    edge and leaves from it to the right as the hook; Left keeps its short dashes and ends against the line. Other way:
    they swap below alpha 1.1." "b07-Vp and b07-Up junction, 8(b) M=0.7, alpha 7.8 to 8.1. The long-dash upper part
    continues into the alternating branch (Vp), and the short-dash branch (Up) starts at the junction. [...] Other way:
    the upper part continues into Up." "b07-Up crossing b07-Vp and the -0.2 grid line, alpha 1.3 to 2.4. Up keeps its
    steady down-right slope into the hook, and Vp stays vertical on the line. Other way: swapped." "b08-LL and b08-MM,
    8(b) M=0.8, alpha 1.1 to 1.6. A crossing, decided by LL's steady down-right slope and MM staying vertical. Other way:
    swapped."
"""


def main():
    flag_text = run()
    for l in QUOTES.strip("\n").split("\n"):
        say(l)
    say()
    say("=" * 118)
    say("== Every flag, all three readers (flag = 'uncertain'). Each flagged row's note is split at '; ' into clauses (a clause")
    say("   that starts with 'alternative', 'which', 'so ', 'I read', 'taken as' or 'if it is' stays with the one before);")
    say("   each clause is quoted verbatim once per curve with the rows that carry it (c curve, box, end, zero, at the")
    say("   station or the row's own alpha). The full note of every row is in pairs_<figure>.csv (A_note, B_note, C_note).")
    for l in flag_text:
        say(l)
    with open(OUT + "pairing.txt", "w") as f:
        f.write("\n".join(out_lines) + "\n")
    print("\n".join(out_lines[:60]))
    print("... (%d lines written to %spairing.txt)" % (len(out_lines), OUT))


if __name__ == "__main__":
    if not os.path.isdir(SRC["C"]):
        raise SystemExit("run from the repository root")
    main()
