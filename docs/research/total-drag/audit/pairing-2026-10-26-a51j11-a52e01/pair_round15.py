"""Neutral pairing of the two blind readings of NACA RM A51J11 figs. 14 and 15 and NACA RM A52E01 fig. 8 (a), (b),
named band-setting by 0014 section 10.7 entry (ac), second part.

Usage (from the repository root): python3 -I docs/research/total-drag/audit/pairing-2026-10-26-a51j11-a52e01/pair_round15.py

Reads only the committed readings (commit 1182556 on claude/wip/lift-te-below-1.5):
  A: docs/research/total-drag/audit/round15-A/readings/{a51j11_fig14,a51j11_fig15,a52e01_fig8a,a52e01_fig8b}.csv
  B: docs/research/total-drag/audit/round15-B/readings/ (same four names)
and the two method.md files only for the quotations in section 5 below (hard-coded here, with their section numbers).
Writes, next to this script: pairs_<figure>.csv (every row of both readings, paired or not), identity_map.csv and
pairing.txt (what is printed).

The pairer read neither figure and does not settle anything from the page. Nothing is averaged, enveloped or moved
toward either reading; no winner is picked; every disagreement is listed and left open.

Rule. Both readers state every error as about 2 sigma or as a bound (box half-width). Two values agree when
|A - B| <= e_A + e_B, the two stated errors summed as written (a bound and a 2 sigma error are summed alike; nothing
is rescaled).

What is compared.
  * Stations. Each curve is read at fixed values of its independent variable: Mach number (fig. 14), 2y/b (fig. 15),
    alpha (fig. 8; the dependent value is the pressure coefficient on the x axis). Rows of kind curve and box at the
    same station (rounded to 0.001, 0.0001 for fig. 15) are paired; only the dependent value is tested (each reader set
    the station). Where one curve has several rows at one station (a hook read as branches, or a box beside a point),
    the rows are paired nearest first, each used once.
  * A station row with no partner at the same station is compared, when the other reader has a curve end whose
    abscissa lies within the two abscissa errors of the station (a reader that gives the end in place of the station),
    with that end's ordinate, and marked so.
  * Ends (curve_end): the ends of the two readings of one drawn curve are paired nearest first in the independent
    variable; both axes are tested.
  * Alpha 0 (curve_at_zero, fig. 8): both values tested when both give one; where only one reader gives a value, or
    one says the curve does not reach alpha 0, the call is listed as differing with both readers' statements.

Curve identity is decided from the values, not from the labels: in each panel (fig. 8) or h/t group (figs. 14, 15),
every curve of A is compared with every curve of B at their common stations; a curve's partner is the curve of the
other reading that agrees at the most stations (ties broken by the median |difference|). The map is "mapped" when the
partner agrees at half or more of at least 3 common stations and no other curve agrees as often; else "cannot be
mapped" with the counts. The values of a drawn curve are then paired with its partner, and the two readers' labels for
that drawn curve (roughness, Mach number, wing) are compared and every label difference listed. For every station of
every curve, the curves of the other reading that agree there are also listed (identity_map.csv, segments), which shows
where a line agrees with one curve below a meeting point and another above it.
"""
import collections
import csv
import os
import re
import statistics

ROOT = "docs/research/total-drag/audit/"
RA = ROOT + "round15-A/readings/"
RB = ROOT + "round15-B/readings/"
OUT = ROOT + "pairing-2026-10-26-a51j11-a52e01/"
TOL = 1e-9

out_lines = []
READ_ONCE = []  # items only one reader gives (a value at alpha 0, a wing, a whole curve): unpaired, never agreed
COVERAGE = []  # fig. 8 supersonic panels: per drawn line, wing named and value at alpha 0, by each reader
ORDER = {}  # (figure, group) -> print order


def say(s=""):
    out_lines.append(s)


def load(path):
    with open(path, newline="") as f:
        return list(csv.DictReader(l for l in f if not l.startswith("#")))


def num(s):
    s = (s or "").strip()
    return None if s == "" else float(s)


def p14(series):
    m = re.search(r"h/t[ ,=]*([0-9.]+)[,;]\s*(without|with)", series, re.I)
    return "h/t " + m.group(1), m.group(2).lower() + " surface roughness"


def p15(series):
    m = re.search(r"h/t[ ,=]*([0-9.]+)[,;]\s*M\s*=?\s*([0-9.]+)", series)
    return "h/t " + m.group(1), "M %.2f" % float(m.group(2))


def style_of(symbol):
    s = symbol.lower()
    if "pattern not resolved" in s:
        return "dashed, pattern not resolved"
    if "long-and-short" in s or "long and short" in s or "dash-dot" in s:
        return "long-and-short dash"
    if "short" in s:
        return "short dash"
    if "long" in s:
        return "long dash"
    if "solid" in s:
        return "solid"
    if "dash" in s:
        return "dashed"
    return s


def label8(series, symbol):
    m = re.search(r"M\s*=\s*([0-9.]+)", series)
    w = re.search(r"[Ww]ing (\d)", series)
    return {"mach": m.group(1) if m else None, "wing": w.group(1) if w else None, "style": style_of(symbol)}


FIGS = [
    {"key": "a51j11_fig14", "title": "RM A51J11 fig. 14 (P_b against Mach number at 2y/b 0.25, alpha 0)",
     "ind": "x", "dep": "y", "nd": 3, "ind_name": "M", "dep_name": "P_b", "grouping": "h/t panel"},
    {"key": "a51j11_fig15", "title": "RM A51J11 fig. 15 (P_b against 2y/b, alpha 0)",
     "ind": "x", "dep": "y", "nd": 4, "ind_name": "2y/b", "dep_name": "P_b", "grouping": "h/t panel"},
    {"key": "a52e01_fig8a", "title": "RM A52E01 fig. 8(a) (Re 1.5 million): (p_b - p_0)/q against nominal alpha",
     "ind": "y", "dep": "x", "nd": 3, "ind_name": "alpha", "dep_name": "Cp_b", "grouping": "panel"},
    {"key": "a52e01_fig8b", "title": "RM A52E01 fig. 8(b) (Re 3.8 million): (p_b - p_0)/q against nominal alpha",
     "ind": "y", "dep": "x", "nd": 3, "ind_name": "alpha", "dep_name": "Cp_b", "grouping": "panel"},
]


def read_fig(fig, reader):
    path = (RA if reader == "A" else RB) + fig["key"] + ".csv"
    rows = []
    for i, r in enumerate(load(path)):
        d = {"reader": reader, "order": i, "id": r["id"], "kind": r["kind"], "panel": r["panel"], "series": r["series"],
             "symbol": r["symbol"], "x": num(r["x"]), "ex": num(r["x_err"]), "y": num(r["y"]), "ey": num(r["y_err"]),
             "basis": r["err_basis"], "flag": r["flag"], "note": r["note"], "used": 0}
        if fig["key"] == "a51j11_fig14":
            d["group"], d["curve"] = p14(r["series"])
            d["label"] = {"key": d["curve"], "style": style_of(r["symbol"])}
        elif fig["key"] == "a51j11_fig15":
            d["group"], d["curve"] = p15(r["series"])
            d["label"] = {"key": d["curve"], "style": style_of(r["symbol"])}
        else:
            d["group"] = r["panel"]
            d["curve"] = r["series"]
            d["label"] = label8(r["series"], r["symbol"])
        d["ind"] = d[fig["ind"]]
        d["eind"] = d["e" + fig["ind"]]
        d["dep"] = d[fig["dep"]]
        d["edep"] = d["e" + fig["dep"]]
        d["st"] = round(d["ind"], fig["nd"]) if d["ind"] is not None else None
        rows.append(d)
    return rows


def agree(a, ea, b, eb):
    return abs(a - b) <= ea + eb + TOL


def fmt(v, n=4):
    return "" if v is None else ("%." + str(n) + "f") % v


def label_text(fig, lab):
    if fig["key"].startswith("a51j11"):
        return lab["key"]
    parts = []
    if lab["mach"]:
        parts.append("M " + lab["mach"])
    parts.append(("wing " + lab["wing"]) if lab["wing"] else "no wing given")
    parts.append(lab["style"])
    return ", ".join(parts)


def label_verdict(fig, la, lb):
    """Compare the two readers' labels for one drawn curve. Returns (status, text); status is "agree", "DIFFERS" or
    "read once" (an identity that only one reader gives: unpaired, never counted as agreed)."""
    if fig["key"].startswith("a51j11"):
        ok = la["key"] == lb["key"]
        return ("agree" if ok else "DIFFERS"), ("same label" if ok else "labels differ: A %s, B %s" % (la["key"], lb["key"]))
    out, differs, once = [], False, False
    if la["mach"] or lb["mach"]:
        if not (la["mach"] and lb["mach"]):
            once = True
            out.append("Mach group read once (A %s, B %s), unpaired" % (la["mach"], lb["mach"]))
        elif la["mach"] != lb["mach"]:
            differs = True
            out.append("Mach group differs (A %s, B %s)" % (la["mach"], lb["mach"]))
        else:
            out.append("same Mach group %s" % la["mach"])
    if la["wing"] and lb["wing"]:
        if la["wing"] != lb["wing"]:
            differs = True
            out.append("wing differs (A wing %s, B wing %s)" % (la["wing"], lb["wing"]))
        else:
            out.append("same wing %s" % la["wing"])
    elif la["wing"] or lb["wing"]:
        once = True
        out.append("wing read once, unpaired (%s)" % ("A only: wing " + la["wing"] if la["wing"] else "B only: wing " + lb["wing"]))
        sa, sb = la["style"], lb["style"]
        if "not resolved" in sa or "not resolved" in sb:
            out.append("line style read once (%s only: %s)" % ("B" if "not resolved" in sa else "A", sb if "not resolved" in sa else sa))
        elif sa == sb:
            out.append("line style the same in both (%s)" % sa)
        else:
            differs = True
            out.append("line style differs (A %s, B %s)" % (sa, sb))
    else:
        once = True
        out.append("neither reader names a wing")
    return ("DIFFERS" if differs else "read once" if once else "agree"), "; ".join(out)


def pair_lists(la, lb):
    """Pair rows at one station, nearest first, each used once. Returns [(ra, rb)], leftovers as (ra, None) or
    (None, rb)."""
    cand = sorted(((abs(a["dep"] - b["dep"]), i, j) for i, a in enumerate(la) for j, b in enumerate(lb)
                   if a["dep"] is not None and b["dep"] is not None))
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


def stations(rows):
    d = collections.defaultdict(list)
    for r in rows:
        if r["kind"] in ("curve", "box") and r["dep"] is not None:
            d[r["st"]].append(r)
    return d


def compare_curves(ra_rows, rb_rows):
    sa, sb = stations(ra_rows), stations(rb_rows)
    n_pairs = n_agree = 0
    diffs, common = [], sorted(set(sa) & set(sb))
    for s in common:
        for a, b in pair_lists(sa[s], sb[s]):
            if a is None or b is None:
                continue
            n_pairs += 1
            diffs.append(abs(a["dep"] - b["dep"]))
            if agree(a["dep"], a["edep"], b["dep"], b["edep"]):
                n_agree += 1
    med = statistics.median(diffs) if diffs else None
    return {"common": len(common), "pairs": n_pairs, "agree": n_agree, "median": med}


def curves_of(rows):
    d = collections.OrderedDict()
    for r in rows:
        d.setdefault((r["group"], r["curve"]), []).append(r)
    return d


def runs(seq):
    """seq: [(station, text)] in station order -> compressed 'from s1 to s2: text' runs."""
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


CSV_COLS = ["figure", "group", "category", "verdict", "A_series", "B_series", "label_check", "station",
            "A_id", "A_kind", "A_x", "A_x_err", "A_y", "A_y_err", "A_basis", "A_flag",
            "B_id", "B_kind", "B_x", "B_x_err", "B_y", "B_y_err", "B_basis", "B_flag",
            "tested", "diff_A_minus_B", "sum_of_errors", "diff_ind_A_minus_B", "sum_of_ind_errors",
            "also_agrees_with", "A_note", "B_note"]


def side(r, p):
    if r is None:
        return {p + k: "" for k in ("id", "kind", "x", "x_err", "y", "y_err", "basis", "flag", "note")}
    return {p + "id": r["id"], p + "kind": r["kind"], p + "x": fmt(r["x"]), p + "x_err": fmt(r["ex"]),
            p + "y": fmt(r["y"]), p + "y_err": fmt(r["ey"]), p + "basis": r["basis"], p + "flag": r["flag"],
            p + "note": r["note"]}


def run():
    say("Neutral pairing of round 15 (A) and round 15 (B): NACA RM A51J11 figs. 14, 15 and NACA RM A52E01 fig. 8 (a), (b)")
    say("Named by 0014 section 10.7 entry (ac), second part. Readings: docs/research/total-drag/audit/round15-A and round15-B")
    say("(commit 1182556). Rule: agree when |A - B| <= e_A + e_B, each reader's stated error (2 sigma or bound) as written.")
    say("Curve identity from the values (see the script's docstring); labels compared per drawn curve. Nothing resolved.")
    say("Station = the independent value each reader set (Mach number, 2y/b, alpha); only the dependent value is tested there.")
    say()
    all_disagree = []
    id_rows = []
    count_rows = []
    flag_text = []
    fig_results = {}
    for fig in FIGS:
        A, B = read_fig(fig, "A"), read_fig(fig, "B")
        ca, cb = curves_of(A), curves_of(B)
        groups = list(collections.OrderedDict.fromkeys([k[0] for k in ca] + [k[0] for k in cb]))
        for i, g in enumerate(groups):
            ORDER[(fig["key"], g)] = (len(ORDER), i)
        csv_rows = []
        partner = {}
        say("=" * 118)
        say("== " + fig["title"])
        say("   A: %d rows (%d flagged); B: %d rows (%d flagged)" % (
            len(A), sum(1 for r in A if r["flag"]), len(B), sum(1 for r in B if r["flag"])))
        for g in groups:
            a_keys = [k for k in ca if k[0] == g]
            b_keys = [k for k in cb if k[0] == g]
            stats = {(ka, kb): compare_curves(ca[ka], cb[kb]) for ka in a_keys for kb in b_keys}
            # partner of each A curve, and of each B curve (for the B-side view)
            for ka in a_keys:
                ranked = sorted(b_keys, key=lambda kb: (-stats[(ka, kb)]["agree"],
                                                        stats[(ka, kb)]["median"] if stats[(ka, kb)]["median"] is not None else 9))
                best = ranked[0] if ranked else None
                st = stats[(ka, best)] if best else None
                second = ranked[1] if len(ranked) > 1 else None
                st2 = stats[(ka, second)] if second else None
                status = "cannot be mapped"
                if st and st["common"] >= 3 and st["pairs"] and st["agree"] >= 0.5 * st["pairs"] and \
                        (st2 is None or st2["agree"] < st["agree"]):
                    status = "mapped"
                elif st and st["agree"] > 0 and st2 is not None and st2["agree"] == st["agree"]:
                    status = "cannot be mapped (tie)"
                partner[ka] = (best if status == "mapped" else None, status, st, second, st2, best)
            fig_results.setdefault(fig["key"], {})[g] = {"a": a_keys, "b": b_keys, "stats": stats}
        # B curves partnered by more than one A curve
        shared = collections.Counter(p[0] for p in partner.values() if p[0])
        # --- identity map, printed per group
        say()
        say("-- identity map (%s by %s; A curve -> its partner in B by the values; counts are station pairs agreeing)" % (
            fig["key"], fig["grouping"]))
        for g in groups:
            say("   [%s]" % g)
            for ka in [k for k in ca if k[0] == g]:
                best, status, st, second, st2, raw_best = partner[ka]
                la = ca[ka][0]["label"]
                if best:
                    lb = cb[best][0]["label"]
                    lstat, ltxt = label_verdict(fig, la, lb)
                    say("     A '%s' -> B '%s': %s, %d of %d station pairs agree (median |diff| %s); next best B '%s' %d of %d; label: %s (%s)%s" % (
                        ka[1], best[1], status, st["agree"], st["pairs"], fmt(st["median"]),
                        second[1] if second else "-", st2["agree"] if st2 else 0, st2["pairs"] if st2 else 0,
                        lstat.upper(), ltxt,
                        "; B curve is the partner of %d A curves" % shared[best] if shared[best] > 1 else ""))
                    if lstat == "DIFFERS":
                        all_disagree.append((fig["key"], g, "identity", "A '%s' and B '%s' are the same drawn curve by the values (%d of %d agree); %s" % (
                            ka[1], best[1], st["agree"], st["pairs"], ltxt)))
                    elif lstat == "read once":
                        READ_ONCE.append((fig["key"], g, "wing identity", "A '%s' = B '%s' by the values (%d of %d agree): %s" % (
                            ka[1], best[1], st["agree"], st["pairs"], ltxt)))
                    id_rows.append({"figure": fig["key"], "group": g, "A_series": ka[1], "B_partner": best[1],
                                    "status": status, "pairs": st["pairs"], "agree": st["agree"],
                                    "median_abs_diff": fmt(st["median"]), "next_best_B": second[1] if second else "",
                                    "next_best_agree": st2["agree"] if st2 else "", "next_best_pairs": st2["pairs"] if st2 else "",
                                    "A_label": label_text(fig, la), "B_label": label_text(fig, lb),
                                    "label_check": lstat + ": " + ltxt, "segments": ""})
                else:
                    say("     A '%s' -> %s: best B '%s' %d of %d agree, next B '%s' %d of %d" % (
                        ka[1], status.upper(), raw_best[1] if raw_best else "-", st["agree"] if st else 0, st["pairs"] if st else 0,
                        second[1] if second else "-", st2["agree"] if st2 else 0, st2["pairs"] if st2 else 0))
                    all_disagree.append((fig["key"], g, "identity", "A '%s' %s by the values (best B '%s' %d of %d, next '%s' %d of %d)" % (
                        ka[1], status, raw_best[1] if raw_best else "-", st["agree"] if st else 0, st["pairs"] if st else 0,
                        second[1] if second else "-", st2["agree"] if st2 else 0, st2["pairs"] if st2 else 0)))
                    READ_ONCE.append((fig["key"], g, "curve", "A '%s' has no partner in B by the values: every value of it is read once (A only)" % ka[1]))
                    id_rows.append({"figure": fig["key"], "group": g, "A_series": ka[1], "B_partner": "",
                                    "status": status, "pairs": st["pairs"] if st else 0, "agree": st["agree"] if st else 0,
                                    "median_abs_diff": fmt(st["median"]) if st else "", "next_best_B": second[1] if second else "",
                                    "next_best_agree": st2["agree"] if st2 else "", "next_best_pairs": st2["pairs"] if st2 else "",
                                    "A_label": label_text(fig, ca[ka][0]["label"]), "B_label": "",
                                    "label_check": "", "segments": ""})
            for kb in [k for k in cb if k[0] == g]:
                if kb not in shared:
                    all_disagree.append((fig["key"], g, "identity", "B '%s' is the partner of no A curve" % kb[1]))
                    READ_ONCE.append((fig["key"], g, "curve", "B '%s' has no partner in A by the values: every value of it%s is read once (B only)" % (
                        kb[1], ", and its wing" if fig["key"].startswith("a52e01") and cb[kb][0]["label"]["wing"] else "")))
                    say("     B '%s' -> partner of NO A curve" % kb[1])
                    id_rows.append({"figure": fig["key"], "group": g, "A_series": "", "B_partner": kb[1],
                                    "status": "B curve with no A partner", "pairs": "", "agree": "", "median_abs_diff": "",
                                    "next_best_B": "", "next_best_agree": "", "next_best_pairs": "", "A_label": "",
                                    "B_label": label_text(fig, cb[kb][0]["label"]), "label_check": "", "segments": ""})
                elif shared[kb] > 1:
                    all_disagree.append((fig["key"], g, "identity", "B '%s' is the partner of %d A curves (%s)" % (
                        kb[1], shared[kb], ", ".join("'" + k[1] + "'" for k, p in partner.items() if p[0] == kb))))
        # --- segments: for each curve, which curves of the other reading agree at each station
        seg_text = {}
        for (this, other, tag) in ((ca, cb, "A"), (cb, ca, "B")):
            for k, rows_k in this.items():
                so = {ko: stations(rows_o) for ko, rows_o in other.items() if ko[0] == k[0]}
                seq = []
                for s, lst in sorted(stations(rows_k).items()):
                    if not any(s in d for d in so.values()):
                        continue
                    hits = []
                    for ko, d in so.items():
                        if s in d and any(agree(r["dep"], r["edep"], o["dep"], o["edep"]) for r in lst for o in d[s]):
                            hits.append(ko[1])
                    seq.append((s, " + ".join("'" + h + "'" for h in hits) if hits else "none"))
                seg_text[(tag, k)] = runs(seq)
        for row in id_rows:
            if row["figure"] == fig["key"]:
                if row["A_series"]:
                    row["segments"] = " | ".join(seg_text.get(("A", (row["group"], row["A_series"])), []))
                else:
                    row["segments"] = " | ".join(seg_text.get(("B", (row["group"], row["B_partner"])), []))
        if fig["key"].startswith("a52e01"):
            say()
            say("-- segments (%s): at each station where the other reader has a row, the curves of the other reading that agree there" % fig["key"])
            for g in groups:
                say("   [%s]" % g)
                for k in [k for k in ca if k[0] == g]:
                    say("     A '%s': %s" % (k[1], " | ".join(seg_text[("A", k)]) or "(no common station)"))
                for k in [k for k in cb if k[0] == g]:
                    say("     B '%s': %s" % (k[1], " | ".join(seg_text[("B", k)]) or "(no common station)"))
        # --- pair the values of each drawn curve with its partner
        counts = collections.OrderedDict()

        def cnt(g, key):
            counts.setdefault(g, collections.Counter())[key] += 1

        a_by_partner = collections.defaultdict(list)
        for ka, p in partner.items():
            if p[0]:
                a_by_partner[p[0]].append(ka)
        for g in groups:
            for kb in [k for k in cb if k[0] == g]:
                a_list = a_by_partner.get(kb, [])
                b_rows = cb[kb]
                sb_all = stations(b_rows)
                b_ends = [r for r in b_rows if r["kind"] == "curve_end"]
                b_zero = [r for r in b_rows if r["kind"] == "curve_at_zero"]
                a_ends_all, a_zero_all = [], []
                for ka in a_list:
                    a_rows = ca[ka]
                    lstat, ltxt = label_verdict(fig, a_rows[0]["label"], b_rows[0]["label"])
                    lchk = lstat + ": " + ltxt
                    sa = stations(a_rows)
                    for s in sorted(set(sa) | set(sb_all)):
                        if s not in sa:
                            continue
                        for a, b in pair_lists(sa[s], sb_all.get(s, [])):
                            if a is None:
                                continue  # B leftovers handled below
                            rec = {"figure": fig["key"], "group": g, "A_series": ka[1], "B_series": kb[1],
                                   "label_check": lchk, "station": fmt(s, 4)}
                            rec.update(side(a, "A_"))
                            rec.update(side(b, "B_"))
                            if b is None:
                                rec["category"] = "station"
                                rec["verdict"] = "A only"
                                rec["tested"] = ""
                                cnt(g, "A only station")
                                if any(agree(a["dep"], a["edep"], o["dep"], o["edep"]) for o in sb_all.get(s, [])):
                                    rec["verdict"] = "A only (an extra row at this station; it agrees with a row of its partner here)"
                                others = [ko[1] for ko, rows_o in cb.items() if ko[0] == g and ko != kb and
                                          any(agree(a["dep"], a["edep"], o["dep"], o["edep"]) for o in stations(rows_o).get(s, []))]
                                rec["also_agrees_with"] = "; ".join("B '" + o + "'" for o in others)
                            else:
                                b["used"] += 1
                                d = a["dep"] - b["dep"]
                                e = a["edep"] + b["edep"]
                                ok = agree(a["dep"], a["edep"], b["dep"], b["edep"])
                                rec.update({"category": "station", "verdict": "agree" if ok else "DISAGREE",
                                            "tested": fig["dep_name"], "diff_A_minus_B": fmt(d), "sum_of_errors": fmt(e)})
                                cnt(g, "station pair agree" if ok else "station pair DISAGREE")
                                if not ok:
                                    others = [ko[1] for ko, rows_o in cb.items() if ko[0] == g and ko != kb and
                                              any(agree(a["dep"], a["edep"], o["dep"], o["edep"]) for o in stations(rows_o).get(s, []))]
                                    rec["also_agrees_with"] = "; ".join("B '" + o + "'" for o in others)
                            a["used"] += 1
                            csv_rows.append(rec)
                    a_ends_all += [r for r in a_rows if r["kind"] == "curve_end"]
                    a_zero_all += [(ka, r) for r in a_rows if r["kind"] == "curve_at_zero"]
                # B station rows not paired with any A row of a curve partnered to this B curve
                for s, lst in sorted(sb_all.items()):
                    for b in lst:
                        if b["used"]:
                            continue
                        rec = {"figure": fig["key"], "group": g, "A_series": " / ".join(k[1] for k in a_list),
                               "B_series": kb[1], "label_check": "", "station": fmt(s, 4), "category": "station",
                               "verdict": "B only" if a_list else "B only (curve has no A partner)", "tested": ""}
                        rec.update(side(None, "A_"))
                        rec.update(side(b, "B_"))
                        others = [ko[1] for ko, rows_o in ca.items() if ko[0] == g and ko not in a_list and
                                  any(agree(b["dep"], b["edep"], o["dep"], o["edep"]) for o in stations(rows_o).get(s, []))]
                        if any(agree(b["dep"], b["edep"], o["dep"], o["edep"]) for ka2 in a_list for o in stations(ca[ka2]).get(s, [])):
                            rec["verdict"] = "B only (an extra row at this station; it agrees with a row of its partner here)"
                        rec["also_agrees_with"] = "; ".join("A '" + o + "'" for o in others)
                        b["used"] += 1
                        csv_rows.append(rec)
                        cnt(g, "B only station")
                # ends: nearest first in the independent variable
                cand = sorted((abs(a["ind"] - b["ind"]), i, j) for i, a in enumerate(a_ends_all) for j, b in enumerate(b_ends))
                ua, ub = set(), set()
                for _, i, j in cand:
                    if i in ua or j in ub:
                        continue
                    ua.add(i)
                    ub.add(j)
                    a, b = a_ends_all[i], b_ends[j]
                    a["used"] += 1
                    b["used"] += 1
                    dd = a["dep"] - b["dep"]
                    ed = a["edep"] + b["edep"]
                    di = a["ind"] - b["ind"]
                    ei = a["eind"] + b["eind"]
                    ok_d = agree(a["dep"], a["edep"], b["dep"], b["edep"])
                    ok_i = agree(a["ind"], a["eind"], b["ind"], b["eind"])
                    ok = ok_d and ok_i
                    rec = {"figure": fig["key"], "group": g, "A_series": a["series"], "B_series": kb[1],
                           "label_check": "", "station": "", "category": "end",
                           "verdict": "agree" if ok else "DISAGREE (" + ", ".join(
                               ([fig["ind_name"]] if not ok_i else []) + ([fig["dep_name"]] if not ok_d else [])) + ")",
                           "tested": fig["ind_name"] + " and " + fig["dep_name"], "diff_A_minus_B": fmt(dd),
                           "sum_of_errors": fmt(ed), "diff_ind_A_minus_B": fmt(di), "sum_of_ind_errors": fmt(ei)}
                    rec.update(side(a, "A_"))
                    rec.update(side(b, "B_"))
                    csv_rows.append(rec)
                    cnt(g, "end pair agree" if ok else "end pair DISAGREE")
                for i, a in enumerate(a_ends_all):
                    if i not in ua:
                        rec = {"figure": fig["key"], "group": g, "A_series": a["series"], "B_series": kb[1], "category": "end",
                               "verdict": "A only", "station": "", "label_check": "", "tested": ""}
                        rec.update(side(a, "A_"))
                        rec.update(side(None, "B_"))
                        a["used"] += 1
                        csv_rows.append(rec)
                        cnt(g, "A only end")
                for j, b in enumerate(b_ends):
                    if j not in ub:
                        rec = {"figure": fig["key"], "group": g, "A_series": " / ".join(k[1] for k in a_list), "B_series": kb[1],
                               "category": "end", "verdict": "B only" if a_list else "B only (curve has no A partner)",
                               "station": "", "label_check": "", "tested": ""}
                        rec.update(side(None, "A_"))
                        rec.update(side(b, "B_"))
                        b["used"] += 1
                        csv_rows.append(rec)
                        cnt(g, "B only end")
                # alpha 0 (fig. 8)
                if fig["key"].startswith("a52e01") and a_list:
                    # the A curve of the partner set that reaches lowest in alpha
                    low_ka = min(a_list, key=lambda k: min(r["ind"] for r in ca[k] if r["ind"] is not None))
                    az = [r for k, r in a_zero_all if k == low_ka]
                    a0 = az[0] if az else None
                    b0 = b_zero[0] if b_zero else None
                    a_low = min((r for r in ca[low_ka] if r["kind"] == "curve_end"), key=lambda r: r["ind"], default=None)
                    rec = {"figure": fig["key"], "group": g, "A_series": low_ka[1], "B_series": kb[1], "category": "alpha 0",
                           "station": "0.0000", "label_check": "", "tested": ""}
                    rec.update(side(a0, "A_"))
                    rec.update(side(b0, "B_"))
                    a_has = a0 is not None and a0["dep"] is not None
                    b_has = b0 is not None and b0["dep"] is not None
                    if a_has and b_has:
                        ok = agree(a0["dep"], a0["edep"], b0["dep"], b0["edep"])
                        rec.update({"verdict": "agree" if ok else "DISAGREE", "tested": fig["dep_name"],
                                    "diff_A_minus_B": fmt(a0["dep"] - b0["dep"]), "sum_of_errors": fmt(a0["edep"] + b0["edep"])})
                        cnt(g, "alpha 0 agree" if ok else "alpha 0 DISAGREE")
                        if not ok:
                            oth = [ko[1] for ko, rows_o in cb.items() if ko[0] == g and ko != kb and any(
                                o["kind"] == "curve_at_zero" and o["dep"] is not None and
                                agree(a0["dep"], a0["edep"], o["dep"], o["edep"]) for o in rows_o)]
                            rec["also_agrees_with"] = "; ".join("B '" + o + "' (its alpha 0 value)" for o in oth)
                    elif not a_has and not b_has:
                        rec["verdict"] = "neither gives a value at alpha 0"
                        cnt(g, "alpha 0 neither")
                    else:
                        a_txt = ("A gives %s +-%s (%s)" % (fmt(a0["dep"]), fmt(a0["edep"]), a0["basis"])) if a_has else \
                            ("A gives no alpha 0 row; its lowest end is alpha %s at %s" % (fmt(a_low["ind"]), fmt(a_low["dep"])) if a_low else "A gives no alpha 0 row and no lower end")
                        b_txt = ("B gives %s +-%s (%s)%s" % (fmt(b0["dep"]), fmt(b0["edep"]), b0["basis"], ", flagged" if b0["flag"] else "")) if b_has else \
                            ("B: " + (b0["note"].split(";")[0] if b0 else "no alpha 0 row"))
                        rec["verdict"] = "READ ONCE (unpaired, not agreed): " + a_txt + "; " + b_txt
                        cnt(g, "alpha 0 read once")
                    if a0:
                        a0["used"] += 1
                    if b0:
                        b0["used"] += 1
                    csv_rows.append(rec)
                for b in b_zero:
                    if not b["used"]:
                        rec = {"figure": fig["key"], "group": g, "A_series": "", "B_series": kb[1], "category": "alpha 0",
                               "station": "0.0000", "verdict": "B only (curve has no A partner)", "label_check": "", "tested": ""}
                        rec.update(side(None, "A_"))
                        rec.update(side(b, "B_"))
                        b["used"] += 1
                        csv_rows.append(rec)
                        cnt(g, "B only alpha 0")
            # A curves with no partner
            for ka in [k for k in ca if k[0] == g]:
                if partner[ka][0]:
                    continue
                for a in ca[ka]:
                    rec = {"figure": fig["key"], "group": g, "A_series": ka[1], "B_series": "", "label_check": "",
                           "station": fmt(a["st"], 4) if a["kind"] in ("curve", "box") else "",
                           "category": {"curve_end": "end", "curve_at_zero": "alpha 0"}.get(a["kind"], "station"),
                           "verdict": "A only (curve has no B partner)", "tested": ""}
                    rec.update(side(a, "A_"))
                    rec.update(side(None, "B_"))
                    others = [ko[1] for ko, rows_o in cb.items() if ko[0] == g and a["kind"] in ("curve", "box") and
                              any(agree(a["dep"], a["edep"], o["dep"], o["edep"]) for o in stations(rows_o).get(a["st"], []))]
                    rec["also_agrees_with"] = "; ".join("B '" + o + "'" for o in others)
                    a["used"] += 1
                    csv_rows.append(rec)
                    cnt(g, "A only (curve unmapped)")
        # station rows of one reader against the other reader's end at that station
        for rec in csv_rows:
            if rec["category"] != "station" or not rec["verdict"].startswith(("A only", "B only")):
                continue
            mine = "A" if rec["verdict"].startswith("A") else "B"
            r = next(x for x in (A if mine == "A" else B) if x["id"] == rec[mine + "_id"])
            other_rows = B if mine == "A" else A
            other_series = rec["B_series"] if mine == "A" else rec["A_series"]
            ends = [o for o in other_rows if o["kind"] == "curve_end" and o["group"] == r["group"] and
                    o["curve"] in [s.strip() for s in other_series.split(" / ")] and
                    abs(o["ind"] - r["ind"]) <= (o["eind"] or 0) + (r["eind"] or 0) + TOL]
            if ends:
                o = ends[0]
                ok = agree(r["dep"], r["edep"], o["dep"], o["edep"])
                a, b = (r, o) if mine == "A" else (o, r)
                rec["verdict"] = ("%s only station; against the other reader's end %s at %s %s (%s +-%s): %s" % (
                    mine, o["id"], fig["ind_name"], fmt(o["ind"]), fmt(o["dep"]), fmt(o["edep"]), "agree" if ok else "DISAGREE"))
                rec["tested"] = fig["dep_name"] + " (station against end)"
                rec["diff_A_minus_B"] = fmt(a["dep"] - b["dep"])
                rec["sum_of_errors"] = fmt(a["edep"] + b["edep"])
                g = rec["group"]
                counts[g]["station against end " + ("agree" if ok else "DISAGREE")] += 1
                counts[g][mine + " only station"] -= 1
                if counts[g][mine + " only station"] == 0:
                    del counts[g][mine + " only station"]
        # every row used at least once?
        missing = [r["id"] for r in A + B if not r["used"]]
        assert not missing, missing
        # disagreements of this figure
        for rec in csv_rows:
            v = rec["verdict"]
            if "DISAGREE" in v or "DIFFERS" in v:
                if rec["category"] == "station":
                    txt = "%s %s: A '%s' %s +-%s (%s%s) vs B '%s' %s +-%s (%s%s); diff %s, errors summed %s%s" % (
                        fig["ind_name"], rec["station"], rec["A_series"], rec["A_" + fig["dep"]], rec["A_" + fig["dep"] + "_err"],
                        rec["A_basis"], ", flagged" if rec["A_flag"] else "", rec["B_series"], rec["B_" + fig["dep"]],
                        rec["B_" + fig["dep"] + "_err"], rec["B_basis"], ", flagged" if rec["B_flag"] else "",
                        rec["diff_A_minus_B"], rec["sum_of_errors"],
                        ("; A's value agrees instead with " + rec["also_agrees_with"]) if rec.get("also_agrees_with") else "")
                    if v.startswith(("A only", "B only")):
                        m = "A" if v.startswith("A") else "B"
                        txt = "%s %s, A '%s' / B '%s': %s; the station row %s %s +-%s (%s%s); diff A minus B %s, errors summed %s" % (
                            fig["ind_name"], rec["station"], rec["A_series"], rec["B_series"], v, rec[m + "_id"],
                            rec[m + "_" + fig["dep"]], rec[m + "_" + fig["dep"] + "_err"], rec[m + "_basis"],
                            ", flagged" if rec[m + "_flag"] else "", rec["diff_A_minus_B"], rec["sum_of_errors"])
                    all_disagree.append((fig["key"], rec["group"], "station", txt))
                elif rec["category"] == "end":
                    txt = "A '%s' (%s %s +-%s, %s %s +-%s, %s%s) vs B '%s' (%s %s +-%s, %s %s +-%s, %s%s); %s" % (
                        rec["A_series"], fig["ind_name"], rec["A_" + fig["ind"]], rec["A_" + fig["ind"] + "_err"],
                        fig["dep_name"], rec["A_" + fig["dep"]], rec["A_" + fig["dep"] + "_err"], rec["A_basis"],
                        ", flagged" if rec["A_flag"] else "", rec["B_series"], fig["ind_name"], rec["B_" + fig["ind"]],
                        rec["B_" + fig["ind"] + "_err"], fig["dep_name"], rec["B_" + fig["dep"]],
                        rec["B_" + fig["dep"] + "_err"], rec["B_basis"], ", flagged" if rec["B_flag"] else "", v)
                    all_disagree.append((fig["key"], rec["group"], "end", txt))
                else:
                    txt = "A '%s' %s +-%s (%s) vs B '%s' %s +-%s (%s); diff %s, errors summed %s%s" % (
                        rec["A_series"], rec["A_x"], rec["A_x_err"], rec["A_basis"], rec["B_series"], rec["B_x"],
                        rec["B_x_err"], rec["B_basis"], rec["diff_A_minus_B"], rec["sum_of_errors"],
                        ("; A's value agrees instead with " + rec["also_agrees_with"]) if rec.get("also_agrees_with") else "")
                    all_disagree.append((fig["key"], rec["group"], "alpha 0", txt))
            elif rec["category"] == "station" and v.startswith(("A only", "B only")) and "has no" not in v and \
                    not v.startswith(("A only station", "B only station")) and rec.get("also_agrees_with"):
                m = v[0]
                all_disagree.append((fig["key"], rec["group"], "continuation", "%s %s: %s '%s' %s +-%s (%s%s) is not paired with a row of its partner %s '%s' here (%s), and agrees with %s" % (
                    fig["ind_name"], rec["station"], m, rec[m + "_series"], rec[m + "_" + fig["dep"]],
                    rec[m + "_" + fig["dep"] + "_err"], rec[m + "_basis"], ", flagged" if rec[m + "_flag"] else "",
                    "B" if m == "A" else "A", rec["B_series"] if m == "A" else rec["A_series"],
                    "the partner has no row here" if v in ("A only", "B only") else "an extra row; it also agrees with a row of its partner here",
                    rec["also_agrees_with"])))
            elif rec["category"] == "alpha 0" and ("READ ONCE" in v or v.startswith(("A only", "B only"))):
                giver = "A" if rec["A_x"] else "B" if rec["B_x"] else None
                extra = ""
                if giver:
                    gv, ge = float(rec[giver + "_x"]), float(rec[giver + "_x_err"])
                    others = B if giver == "A" else A
                    oth = sorted({o["series"] for o in others if o["group"] == rec["group"] and o["kind"] == "curve_at_zero"
                                  and o["dep"] is not None and agree(gv, ge, o["dep"], o["edep"])})
                    if oth:
                        extra = "; that value agrees with the alpha 0 value the other reader gives for " + ", ".join("'" + o + "'" for o in oth)
                READ_ONCE.append((fig["key"], rec["group"], "value at alpha 0", "A '%s' / B '%s': %s%s" % (
                    rec["A_series"] or "(no A curve)", rec["B_series"] or "(no B curve)",
                    v if "READ ONCE" in v else v + ": B gives %s +-%s (%s)" % (rec["B_x"], rec["B_x_err"], rec["B_basis"])
                    if rec["B_x"] else v + ": A gives %s +-%s (%s)" % (rec["A_x"], rec["A_x_err"], rec["A_basis"])
                    if rec["A_x"] else v + ": no value", extra)))
        # supersonic panel coverage: per drawn line, does each reader name a wing and give a value at alpha 0
        for g in groups:
            if not fig["key"].startswith("a52e01") or not g.startswith("M=1.2"):
                continue
            entries = [(ka, partner[ka][0]) for ka in ca if ka[0] == g]
            entries += [(None, kb) for kb in cb if kb[0] == g and kb not in shared]

            def zero_of(rows):
                z = [r for r in rows if r["kind"] == "curve_at_zero"]
                return z[0] if z else None

            for ka, kb in entries:
                la = ca[ka][0]["label"] if ka else None
                lb = cb[kb][0]["label"] if kb else None
                aw = ("wing " + la["wing"]) if la and la["wing"] else None
                bw = ("wing " + lb["wing"]) if lb and lb["wing"] else None
                if aw and bw:
                    wing_item = "wing paired: " + ("agree" if aw == bw else "DIFFER") + " (A %s, B %s)" % (aw, bw)
                elif aw or bw:
                    wing_item = "wing READ ONCE (unpaired): " + ("A only, " + aw if aw else "B only, " + bw)
                else:
                    wing_item = "wing named by neither"
                az = zero_of(ca[ka]) if ka else None
                bz = zero_of(cb[kb]) if kb else None
                a_has = az is not None and az["dep"] is not None
                b_has = bz is not None and bz["dep"] is not None
                if ka:
                    a_low = min((r for r in ca[ka] if r["kind"] == "curve_end"), key=lambda r: r["ind"], default=None)
                    a_z = ("%s +-%s (%s)" % (fmt(az["dep"]), fmt(az["edep"]), az["basis"])) if a_has else \
                        ("no value (no alpha 0 row; lowest end alpha %s at %s)" % (fmt(a_low["ind"], 3), fmt(a_low["dep"])) if a_low
                         else "no value (no alpha 0 row, no lower end)")
                else:
                    a_z = "no A line"
                if kb:
                    b_z = ("%s +-%s (%s%s)" % (fmt(bz["dep"]), fmt(bz["edep"]), bz["basis"], ", flagged" if bz["flag"] else "")) if b_has else \
                        ("no value (" + (bz["note"].split(";")[0] if bz else "no alpha 0 row") + ")")
                else:
                    b_z = "no B curve"
                if a_has and b_has:
                    zero_item = "alpha 0 paired: " + ("agree" if agree(az["dep"], az["edep"], bz["dep"], bz["edep"]) else "DISAGREE")
                elif a_has or b_has:
                    zero_item = "alpha 0 READ ONCE (unpaired): " + ("A only" if a_has else "B only")
                else:
                    zero_item = "alpha 0 value given by neither"
                COVERAGE.append((fig["key"], g, ka[1] if ka else "(none)", kb[1] if kb else "(none)",
                                 "A: " + (label_text(fig, la) if la else "-") + "; B: " + (label_text(fig, lb) if lb else "-"),
                                 wing_item, "A " + a_z + "; B " + b_z, zero_item))
        # write the pairs CSV
        with open(OUT + "pairs_" + fig["key"] + ".csv", "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=CSV_COLS)
            w.writeheader()
            for rec in csv_rows:
                w.writerow({k: rec.get(k, "") for k in CSV_COLS})
        say()
        say("-- counts (%s), per %s" % (fig["key"], fig["grouping"]))
        tot = collections.Counter()
        for g, c in counts.items():
            tot.update(c)
            say("   [%s] %s" % (g, ", ".join("%s %d" % (k, v) for k, v in sorted(c.items()))))
        say("   [all] %s" % ", ".join("%s %d" % (k, v) for k, v in sorted(tot.items())))
        count_rows.append((fig["key"], tot))
        # flags
        for reader, rows in (("A", A), ("B", B)):
            byc = collections.OrderedDict()
            for r in rows:
                if r["flag"]:
                    for c in clauses(r["note"]):
                        byc.setdefault(r["series"], collections.OrderedDict()).setdefault(c, []).append(
                            (r["kind"], r["st"] if r["kind"] in ("curve", "box") else r["ind"]))
            flag_text.append("   %s, reader %s: %d flagged of %d rows" % (fig["key"], reader, sum(1 for r in rows if r["flag"]), len(rows)))
            for s, d in byc.items():
                flag_text.append("     %s" % s)
                for c, where in d.items():
                    w = ", ".join("%s %s" % ({"curve": "c", "box": "box", "curve_end": "end", "curve_at_zero": "zero"}[k], fmt(v, 3))
                                  for k, v in where)
                    flag_text.append("       [%s] %s" % (w, c))
    # ---- disagreements
    say()
    say("=" * 118)
    say("== Every disagreement (unresolved; no winner picked, nothing averaged or enveloped)")
    cur = None
    by_fig = collections.Counter()
    cat_order = {"identity": 0, "continuation": 1, "station": 2, "end": 3, "alpha 0": 4}
    all_disagree = sorted(all_disagree, key=lambda t: (ORDER[(t[0], t[1])], cat_order[t[2]]))
    for figk, g, cat, txt in all_disagree:
        by_fig[(figk, cat)] += 1
        if (figk, g) != cur:
            cur = (figk, g)
            say("   [%s, %s]" % (figk, g))
        say("     %s: %s" % (cat, txt))
    say("   totals: " + ", ".join("%s %s %d" % (f, c, n) for (f, c), n in sorted(by_fig.items())))
    say()
    say("=" * 118)
    say("== RM A52E01 fig. 8, supersonic panels (M = 1.2, 1.4, 1.7): for each drawn line (A's line and its partner in B by")
    say("   the values), whether each reader names a wing and gives a value at alpha 0. An item only one reader gives is")
    say("   READ ONCE (unpaired), never counted as agreed; no gap is filled from the other reader or from expectation.")
    for figk, g, ka, kb, labs, wing_item, zvals, zero_item in COVERAGE:
        say("   [%s] A '%s' / B '%s'" % (figk, ka, kb))
        say("       labels: %s" % labs)
        say("       %s" % wing_item)
        say("       %s: %s" % (zero_item, zvals))
    n_w = sum(1 for c in COVERAGE if "READ ONCE" in c[5])
    n_z = sum(1 for c in COVERAGE if "READ ONCE" in c[7])
    say("   supersonic lines listed %d; wing read once %d; wing paired %d; alpha 0 read once %d; alpha 0 paired %d; alpha 0 by neither %d" % (
        len(COVERAGE), n_w, sum(1 for c in COVERAGE if c[5].startswith("wing paired")), n_z,
        sum(1 for c in COVERAGE if c[7].startswith("alpha 0 paired")), sum(1 for c in COVERAGE if "neither" in c[7])))
    say()
    say("=" * 118)
    say("== Every item read once (unpaired, not agreed), all four figures: values at alpha 0, wing identities, whole curves")
    for figk, g, what, txt in READ_ONCE:
        say("   [%s, %s] %s: %s" % (figk, g, what, txt))
    say("   total read-once items: %d" % len(READ_ONCE))
    with open(OUT + "identity_map.csv", "w", newline="") as f:
        cols = ["figure", "group", "A_series", "B_partner", "status", "pairs", "agree", "median_abs_diff", "next_best_B",
                "next_best_agree", "next_best_pairs", "A_label", "B_label", "label_check", "segments"]
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for r in id_rows:
            w.writerow(r)
    # counts at a glance, inserted after the header
    glance = ["== At a glance (details below)"]
    for figk, tot in count_rows:
        glance.append("   %s: %s" % (figk, ", ".join("%s %d" % (k, v) for k, v in sorted(tot.items()))))
        glance.append("      disagreements listed: %s; read-once items: %d" % (
            ", ".join("%s %d" % (c, n) for (f, c), n in sorted(by_fig.items()) if f == figk) or "none",
            sum(1 for r in READ_ONCE if r[0] == figk)))
    glance.append("   label differences for one drawn curve (wing 2 against wing 4 in fig. 8): %d; curves that cannot be mapped: %d" % (
        sum(1 for r in id_rows if r["label_check"].startswith("DIFFERS")),
        sum(1 for r in id_rows if r["status"] != "mapped")))
    glance.append("")
    out_lines[6:6] = glance
    return flag_text, fig_results


QUOTES = """
== The calls the brief asked to check, in the readers' own words (from each method.md; section numbers given)

(a) RM A52E01 fig. 8, wing 2 against wing 4.
  A (method.md section 8, item 6): "Wing 2 and wing 4 were told apart only by dash pattern: wing 4 should show short
    dashes between its long dashes. The clearest case is fig. 8(a) M=0.7, where the curve that starts at Cp -0.49
    shows short pieces between long dashes, so I called it wing 4 and the hooked curve wing 2. [...] the hooked curves
    carry dashes of about 40 to 67 px with small gaps (6 to 14 px) and no clear short dashes; the far-right curves
    carry long dashes of 85 to 104 px with occasional short pieces of 10 to 36 px. I applied the same rule in every
    panel (hooked or medium-dash curve = wing 2; long dash with short pieces = wing 4). Only M=0.7 in fig. 8(a) is
    unflagged for this; every other wing 2 and wing 4 row is flagged with the alternative 'the other of the two'. In
    fig. 8(a) M=0.6 and M=0.9 and fig. 8(b) M=0.6 and M=0.9 only two curves are drawn; the second is labelled wing 2
    (alternative wing 4) and no wing 4 curve could be found."
  A (item 8): fig. 8(b) M=0.7 and M=0.8, "I gave the hook to wing 3 because its dashes are short; alternative: the hook
    belongs to wing 2 and wing 3 is the one hidden in the grid line. Fig. 8(b) M=0.6 is drawn the other way [...]
    there I gave the hook to wing 2."  (item 9): fig. 8(a) M=0.925, "the arc from there to the axis at -0.236 is given
    to wing 2 (hook return), alternative wing 3."
  B (method.md section 6): "Short uniform dashes (about 25 to 45 px) = wing 3; long uniform dashes (about 80 to 110 px
    on the curves, 64 px in the legend) = wing 2; long and short alternating (about 90 and 45 px) = wing 4."
  B (section 8, item 8): "Calls flagged as uncertain: 8a M=0.9 long-and-short-dash curve (strokes 65 38 145 68 42 97 px;
    alternative wing 2); 8b M=0.6 right curve read as wing 2 (dashes about 50 px then one long unbroken stroke, no
    short dashes; alternative wing 4); 8b M=0.9 hook curve read as wing 4 (only three strokes; alternative wing 2); 8b
    M=0.925 middle curve read as wing 4 (few strokes; alternative wing 2). Panels with only two curves: 8a M=0.6 (wings
    3 and 4), 8a M=0.9 (3 and 4), 8b M=0.6 (3 and 2, see above), 8b M=0.9 (3 and 4)."
  Legend dash lengths each measured (480 dpi render): A wing 2 dashes 62 to 68 px, gaps 20 to 24; wing 3 26 to 34;
    wing 4 62 to 66 and 26 to 28. B wing 2 about 64 and 22; wing 3 about 30 and 19; wing 4 about 62 and 26, gaps 20.
  Supersonic panels: A (item 11) names lines by Mach group and letter and gives no wing ("only the short-dash line in
    the M=1.7 group of fig. 8(a) can be given a line style"); B (section 8, item 15) assigns every line a wing "from dash
    pattern only", wing 2 at 8a M=1.4 and wing 4 at 8b M=1.7 "by elimination", and 8b M=1.2 "Wing 2 (the '(' curve,
    alternative wing 4)". Crossing call at 8a M=1.7: A "lines c and d meet at about alpha 4.5 and were taken as crossing
    (straight continuation); alternative: touching, with the parts above 4.5 swapped"; B "The wing 4 and wing 2 curves
    cross near alpha 4.4 (continuity call; alternative: they touch and swap lower parts)."

(b) RM A51J11 fig. 15 crossing or touching, and fig. 14's merged starts.
  A (section 8, item 4): "Top panel: the '.80' leader goes to the upper (more negative) start and the '1.06' leader to
    the lower; they meet near 2y/b = 0.30 and I took them as crossing [...]. Bottom panel, upper pair: the '0.98' leader
    goes to the upper start and '1.06' to the lower; they meet near 0.33 and I took them as touching (not crossing),
    because only then do both the leaders and the line styles (0.98 long dashes, 1.06 dash-dot) agree. Bottom panel,
    lower pair: '.60' leader to the upper start, '.80' to the lower; taken as crossing near 0.28, which again makes
    leaders and styles agree. The rows in these start regions are flagged with the alternative (the values swap)."
  B (section 8, items 5 to 7): "Bottom panel, curves M 0.98 and 1.06: the leader from '0.98' touches the upper start
    stub (P_b about -0.68), the one from '1.06' the lower stub (about -0.64); the two curves meet between 2y/b 0.30 and
    0.39. I read them as touching (not crossing) [...]. Alternative: they cross, and the right-hand parts swap (0.98
    would be the long-and-short-dash line ending at -0.37). [...] Bottom panel, curves M .60 and .80: [...] the curves
    meet near 2y/b 0.30. I read a crossing (stubs continue straight), which keeps leaders and styles in agreement;
    alternative: touching. [...] From 0.56 to 0.78 the two curves overlap within a stroke width (crossing again near
    0.71) [...]. Top panel: M .80 and 1.06 cross near 2y/b 0.29 to 0.31 [...]. Middle panel: 0.98 and 1.06 cross near
    0.75 (boxes); .80 and .60 cross near 0.55 and near 0.80 (boxes and flagged reads)."
  Fig. 14. A (section 8, items 1 to 3): "from 0.60 to 0.65 (1.0) and 0.60 to 0.80 (0.3) the dashed line lies on or just
    below the solid line; boxes. At h/t 0.3 the two rise together from 0.95 to 0.99 and are boxes there too. Where they
    can be told apart, the solid line is the more negative one in these stretches." "h/t 0.6: the curves cross at M 0.89
    to 0.90 (boxes)." B (section 8, items 1 to 3): "Top panel (h/t 1.0), M 0.60 to 0.645: the two curves start together
    and overlap; split by run edges (flagged). Crossing near M 0.975 [...]. Middle panel (h/t 0.6): crossings near M
    0.895 and 0.99; dashed curve at 0.90 is a box [...]. Bottom panel (h/t 0.3): from M 0.60 to 0.80 the two curves lie
    within one stroke width of each other (dashed about 0.005 nearer zero than solid); both read by run edges and
    dash-gap columns (flagged, bound). From M 0.95 to 0.99 the dashes lie on the right edge of the steep solid line
    [...]; dashed at 0.98 and 0.99 are boxes."

(c) Text either reader saw outside the sections the brief allows (each reader's own disclosure; the pairer opened
    neither report).
  A (method.md section 1): "To find the section boundaries I ran a grep for heading-like lines over the whole pdftotext
    output. That printed only heading lines, but for RM A52E01 it also printed a few short line fragments that lie
    inside RESULTS AND DISCUSSION and the reference list (for example 'Lift Characteristics', 'The aberrant variations',
    'Appreciable', 'Mach number in the neighborhood'). I did not read past those fragments and did not open SUMMARY,
    RESULTS AND DISCUSSION or CONCLUSIONS (CONCLUDING REMARKS) in either report. A 1/6-scale thumbnail of RM A52E01 PDF
    page 3 (too small to read) was viewed to find where NOTATION starts on that page." Also: "RM A51J11 has no NOTATION
    section; I did not open its INTRODUCTION, so P_b is recorded only as printed on the axis."
  B (method.md section 1): "Two keyword greps printed a few single lines from other sections: from A52E01 one line of
    the SUMMARY ('Results of the investigation show that employment of blunt trailing'), one of the INTRODUCTION, and two
    of RESULTS AND DISCUSSION ('trailing-edge thickness which the results', 'shown by figure 5, merit a brief
    discussion'); from A51J11 two lines of the INTRODUCTION ('slope increased at Mach numbers where the lift-curve slope
    decreased', 'airfoil was not one of the optimum sections derived in reference 1'). None of these lines carries a
    base pressure value and none was used." B also read "NOTATION (A51J11 pages 3 and 4 [...]; I looked at the A51J11
    P_b line [...] on low-resolution renders of PDF page 4", and its fig. 14 header gives "NOTATION P_b = (p_b - p)/q".
  The readers differ on whether RM A51J11 has a NOTATION section: A says it has none and records P_b only as printed on
    the axis; B read a P_b definition on PDF page 4 under NOTATION. Not settled here (the pairer did not open the report).
  Neither reader reports a base-pressure value seen in any text, and neither says it used one. A's whole-report
    pdftotext files (scratchpad te15/A/text/) and B's (te15/B/work/a51.txt, a52.txt) are not committed.
"""


def special_checks():
    """Fig. 15 meeting points and fig. 14 merged starts: both readers' values side by side, with the swap test."""
    say()
    say("=" * 118)
    say("== (b) detail: fig. 15 meeting points, each reader's values for both curves, and the test against the swap")
    f15 = FIGS[1]
    A, B = read_fig(f15, "A"), read_fig(f15, "B")

    def val(rows, g, c, s):
        return [r for r in rows if r["group"] == g and r["curve"] == c and r["kind"] in ("curve", "box") and r["st"] == s]

    def ends(rows, g, c):
        return sorted((r for r in rows if r["group"] == g and r["curve"] == c and r["kind"] == "curve_end"), key=lambda r: r["ind"])

    for g, c1, c2, upto in (("h/t 0.3", "M 0.98", "M 1.06", 0.45), ("h/t 0.3", "M 0.60", "M 0.80", 0.45),
                            ("h/t 1.0", "M 0.80", "M 1.06", 0.40), ("h/t 0.3", "M 0.60", "M 0.80", 0.80)):
        lo = 0.0 if upto < 0.5 else 0.55
        say("   [%s] %s and %s, 2y/b %.2f to %.2f" % (g, c1, c2, lo, upto))
        for c in (c1, c2):
            ea, eb = ends(A, g, c), ends(B, g, c)
            if lo == 0.0 and ea and eb:
                a, b = ea[0], eb[0]
                ok = agree(a["dep"], a["edep"], b["dep"], b["edep"]) and agree(a["ind"], a["eind"], b["ind"], b["eind"])
                say("     left end %s: A (%s, %s +-%s) B (%s, %s +-%s): %s" % (
                    c, fmt(a["ind"]), fmt(a["dep"]), fmt(a["edep"]), fmt(b["ind"]), fmt(b["dep"]), fmt(b["edep"]),
                    "agree" if ok else "DISAGREE"))
        stations_all = sorted({r["st"] for r in A + B if r["group"] == g and r["curve"] in (c1, c2) and
                               r["kind"] in ("curve", "box") and lo <= r["st"] <= upto})
        for s in stations_all:
            parts = []
            for c, co in ((c1, c2), (c2, c1)):
                for ra in val(A, g, c, s):
                    same = [rb for rb in val(B, g, c, s)]
                    swap = [rb for rb in val(B, g, co, s)]
                    t_same = ", ".join("%s +-%s %s" % (fmt(rb["dep"]), fmt(rb["edep"]), "agree" if agree(ra["dep"], ra["edep"], rb["dep"], rb["edep"]) else "DIFFER") for rb in same) or "no B row"
                    t_swap = ", ".join("%s %s" % (fmt(rb["dep"]), "agree" if agree(ra["dep"], ra["edep"], rb["dep"], rb["edep"]) else "differ") for rb in swap) or "no B row"
                    parts.append("A %s %s %s +-%s; B same label %s; B other curve %s" % (
                        c, ra["kind"], fmt(ra["dep"]), fmt(ra["edep"]), t_same, t_swap))
                if not val(A, g, c, s):
                    for rb in val(B, g, c, s):
                        parts.append("A %s no row; B %s %s +-%s" % (c, rb["kind"], fmt(rb["dep"]), fmt(rb["edep"])))
            say("     2y/b %s: %s" % (fmt(s, 3), " | ".join(parts)))
    say()
    say("== (b) detail: fig. 14 merged stretches, both curves, each reader (A's boxes carry, in their notes, the two edge")
    say("   values 'line on the more negative side about ..., other about ...'; A states no error for those edge values,")
    say("   so they are shown beside B's values with the difference only, no verdict)")
    f14 = FIGS[0]
    A, B = read_fig(f14, "A"), read_fig(f14, "B")
    for g, lo, hi in (("h/t 1.0", 0.60, 0.66), ("h/t 0.6", 0.88, 0.91), ("h/t 0.6", 0.98, 1.00), ("h/t 1.0", 0.97, 0.99),
                      ("h/t 0.3", 0.60, 0.81), ("h/t 0.3", 0.94, 1.00)):
        say("   [%s] M %.2f to %.2f" % (g, lo, hi))
        sts = sorted({r["st"] for r in A + B if r["group"] == g and r["kind"] in ("curve", "box", "curve_end")
                      and lo - 1e-6 <= round(r["ind"], 2) <= hi + 1e-6})
        for s in sts:
            line = []
            for c in ("without surface roughness", "with surface roughness"):
                ra = [r for r in A if r["group"] == g and r["curve"] == c and r["st"] == s and r["kind"] in ("curve", "box", "curve_end")]
                rb = [r for r in B if r["group"] == g and r["curve"] == c and r["st"] == s and r["kind"] in ("curve", "box", "curve_end")]
                ta = ", ".join("%s %s +-%s" % (r["kind"], fmt(r["dep"]), fmt(r["edep"])) for r in ra) or "-"
                tb = ", ".join("%s %s +-%s" % (r["kind"], fmt(r["dep"]), fmt(r["edep"])) for r in rb) or "-"
                verdict = ""
                if ra and rb:
                    verdict = " " + ("agree" if all(agree(a["dep"], a["edep"], b["dep"], b["edep"]) for a in ra for b in rb) else "DISAGREE")
                edge = ""
                for r in ra:
                    m = re.search(r"more negative side about (-?[0-9.]+), other about (-?[0-9.]+)", r["note"])
                    if m and rb:
                        mn, ot = float(m.group(1)), float(m.group(2))
                        edge = " [A edges: more negative %s, other %s; B minus more-negative edge %s, B minus other edge %s]" % (
                            fmt(mn), fmt(ot), fmt(rb[0]["dep"] - mn), fmt(rb[0]["dep"] - ot))
                line.append("%s: A %s | B %s%s%s" % ("solid" if c.startswith("without") else "dashed", ta, tb, verdict, edge))
            say("     M %s  %s" % (fmt(s, 3), "  ||  ".join(line)))


def main():
    flag_text, _ = run()
    special_checks()
    for l in QUOTES.strip("\n").split("\n"):
        say(l)
    say()
    say("=" * 118)
    say("== Every flag, both readers (flag = 'uncertain'). Each flagged row's note is split at '; ' into clauses (a clause")
    say("   that starts with 'alternative', 'which', 'so ', 'I read', 'taken as' or 'if it is' stays with the one before);")
    say("   each clause is quoted verbatim once per series with the rows that carry it (c curve, box, end, zero, at the")
    say("   station or the end's own abscissa). The full note of every row is in pairs_<figure>.csv (A_note, B_note).")
    for l in flag_text:
        say(l)
    with open(OUT + "pairing.txt", "w") as f:
        f.write("\n".join(out_lines) + "\n")
    print("\n".join(out_lines[:40]))
    print("... (%d lines written to %spairing.txt)" % (len(out_lines), OUT))


if __name__ == "__main__":
    if not os.path.isdir(RA):
        raise SystemExit("run from the repository root")
    main()
