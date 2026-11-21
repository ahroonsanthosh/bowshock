#!/usr/bin/env python3
"""Pair two blind readings (A and B) of NACA RM L55H09 figure 6.

Applies the rule in README.md (written before this script). Reads only
../A/fig6.csv and ../B/fig6.csv; writes pairing.csv, summary.md and
sha256.txt next to this script. Run with: python3 -I pair_fig6.py

No value is averaged, rounded or corrected: all arithmetic is exact decimal
arithmetic on the strings as written. No drag model, ratio or band is formed.
"""

import csv
import hashlib
from collections import defaultdict
from decimal import Decimal
from pathlib import Path

HERE = Path(__file__).resolve().parent
BASE = HERE.parent
CSV = {"A": BASE / "A" / "fig6.csv", "B": BASE / "B" / "fig6.csv"}
PDF_SHA = "5b6897abf162dfdd8babdbb40ff4d46ff99ecc5a4eef126b5690c54750e2418b"
WINDOW_ADD = Decimal("0.01")
GAP_LO, GAP_HI, TOP = Decimal("1.04"), Decimal("1.13"), Decimal("1.41")
NEAR, SPAN = Decimal("0.01"), Decimal("0.05")
PANELS = ["top", "middle", "bottom"]
PANEL_NAME = {"top": "top (total drag)", "middle": "middle (base drag)",
              "bottom": "bottom (net drag)"}
GROUPS = ["FO", "FN", "FS", "FF-sym", "FF-curve"]
GROUP_NAME = {"FO": "wind tunnel, fins off", "FN": "wind tunnel, fins on (open or flagged)",
              "FS": "wind tunnel, fins on at fins-off R (solid)",
              "FF-sym": "free flight, symbols", "FF-curve": "free flight, curve stations"}


def panel_of(s):
    s = s.lower()
    for p in PANELS:
        if p in s:
            return p
    raise ValueError(s)


def group_of(r):
    c, k = r["configuration"].lower(), r["kind"].strip().lower()
    if "free" in c:
        return "FF-curve" if k == "curve" else "FF-sym"
    if "fins off" in c:
        return "FO"
    if "fins on" in c:
        if k == "solid" or "fins-off r" in c:
            return "FS"
        return "FN"
    raise ValueError(c)


def dec(s):
    s = s.strip()
    return Decimal(s) if s else None


def load(reader):
    rows = []
    with open(CSV[reader], newline="") as f:
        for i, r in enumerate(csv.DictReader(f), start=2):
            r = dict(r)
            r["reader"], r["line"] = reader, i
            r["P"], r["G"] = panel_of(r["panel"]), group_of(r)
            for k in ("x", "y", "x_error", "y_error"):
                r["_" + k] = dec(r[k])
            rows.append(r)
    return rows


def usable(r):
    return all(r["_" + k] is not None for k in ("x", "y", "x_error", "y_error"))


def match(a_rows, b_rows):
    cands = []
    for i, a in enumerate(a_rows):
        if not usable(a):
            continue
        for j, b in enumerate(b_rows):
            if not usable(b):
                continue
            dx = abs(a["_x"] - b["_x"])
            if dx <= max(a["_x_error"], b["_x_error"]) + WINDOW_ADD:
                cands.append((dx, abs(a["_y"] - b["_y"]), i, j))
    cands.sort()
    ua, ub, pairs = set(), set(), []
    for dx, dy, i, j in cands:
        if i in ua or j in ub:
            continue
        ua.add(i); ub.add(j)
        pairs.append((i, j))
    ncand_a = defaultdict(int); ncand_b = defaultdict(int)
    for _, _, i, j in cands:
        ncand_a[i] += 1; ncand_b[j] += 1
    return pairs, ua, ub, ncand_a, ncand_b


def side(xa, xb):
    if xa <= GAP_LO and xb <= GAP_LO:
        return "below"
    if GAP_HI <= xa <= TOP and GAP_HI <= xb <= TOP:
        return "above"
    return "straddles-or-outside"


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def main():
    data = {k: load(k) for k in CSV}
    out, agreed = [], defaultdict(list)
    counts = defaultdict(lambda: defaultdict(int))
    for P in PANELS:
        for G in GROUPS:
            A = [r for r in data["A"] if r["P"] == P and r["G"] == G]
            B = [r for r in data["B"] if r["P"] == P and r["G"] == G]
            pairs, ua, ub, nca, ncb = match(A, B)
            for i, j in sorted(pairs, key=lambda t: A[t[0]]["_x"]):
                a, b = A[i], B[j]
                dx, dy = a["_x"] - b["_x"], a["_y"] - b["_y"]
                ex, ey = a["_x_error"] + b["_x_error"], a["_y_error"] + b["_y_error"]
                okx, oky = abs(dx) <= ex, abs(dy) <= ey
                status = "agreed" if okx and oky else "disagreed"
                beyond = []
                if not okx:
                    beyond.append(f"x by {abs(dx) - ex}")
                if not oky:
                    beyond.append(f"y by {abs(dy) - ey}")
                kst = "same" if a["kind"].strip() == b["kind"].strip() else "kind-differs"
                contested = "yes" if nca[i] > 1 or ncb[j] > 1 else ""
                counts[(P, G)][status] += 1
                if status == "agreed" and kst == "kind-differs":
                    counts[(P, G)]["agreed_kind_differs"] += 1
                rec = dict(panel=PANEL_NAME[P], group=G, status=status, kind_status=kst,
                           a_line=a["line"], a_kind=a["kind"], a_symbol=a["legend_symbol"],
                           a_x=a["x"], a_y=a["y"], a_x_error=a["x_error"], a_y_error=a["y_error"],
                           b_line=b["line"], b_kind=b["kind"], b_symbol=b["legend_symbol"],
                           b_x=b["x"], b_y=b["y"], b_x_error=b["x_error"], b_y_error=b["y_error"],
                           dx_a_minus_b=str(dx), dy_a_minus_b=str(dy),
                           ex_sum=str(ex), ey_sum=str(ey), beyond="; ".join(beyond),
                           side=side(a["_x"], b["_x"]), contested=contested,
                           a_flags=a["flags"], a_alternatives=a["alternatives"],
                           b_flags=b["flags"], b_alternatives=b["alternatives"])
                out.append(rec)
                if status == "agreed":
                    agreed[(P, G)].append(rec)
            for lst, used, who in ((A, ua, "A"), (B, ub, "B")):
                for k, r in enumerate(lst):
                    if k in used:
                        continue
                    counts[(P, G)]["read_once_" + who] += 1
                    rec = {}
                    rec.update(panel=PANEL_NAME[P], group=G,
                               status="read once (" + who + ")" + ("" if usable(r) else ", illegible"))
                    pre = who.lower() + "_"
                    rec.update({pre + "line": r["line"], pre + "kind": r["kind"],
                                pre + "symbol": r["legend_symbol"], pre + "x": r["x"],
                                pre + "y": r["y"], pre + "x_error": r["x_error"],
                                pre + "y_error": r["y_error"], pre + "flags": r["flags"],
                                pre + "alternatives": r["alternatives"]})
                    out.append(rec)
    fields = ["panel", "group", "status", "kind_status",
              "a_line", "a_kind", "a_symbol", "a_x", "a_y", "a_x_error", "a_y_error",
              "b_line", "b_kind", "b_symbol", "b_x", "b_y", "b_x_error", "b_y_error",
              "dx_a_minus_b", "dy_a_minus_b", "ex_sum", "ey_sum", "beyond", "side", "contested",
              "a_flags", "a_alternatives", "b_flags", "b_alternatives"]
    with open(HERE / "pairing.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in out:
            w.writerow({k: r.get(k, "") for k in fields})

    L = ["# RM L55H09 fig. 6: pairing summary", "",
         "Produced by `pair_fig6.py` under the rule in `README.md` (written and",
         "committed before the comparison). Every pair and every row read once is",
         "in `pairing.csv`, both readings side by side. No value was averaged, and",
         "no drag model, ratio or band was computed.", "",
         f"Rows: A {len(data['A'])}, B {len(data['B'])}. Readers' PDF SHA-256: "
         f"A {Path(BASE / 'A' / 'sha256.txt').read_text().split()[0] == PDF_SHA and 'matches' or 'DIFFERS'}, "
         f"B {Path(BASE / 'B' / 'sha256.txt').read_text().split()[0] == PDF_SHA and 'matches' or 'DIFFERS'} "
         f"the brief's `{PDF_SHA}`.", "",
         "## Counts per panel and group", "",
         "\"Agreed (kind differs)\" is the part of \"agreed\" whose kinds are open in one",
         "reading and flagged in the other (rule 3).", "",
         "| Panel | Group | Agreed | of which kind differs | Disagreed | Read once (A) | Read once (B) |",
         "| --- | --- | ---: | ---: | ---: | ---: | ---: |"]
    tot = defaultdict(int)
    for P in PANELS:
        for G in GROUPS:
            c = counts[(P, G)]
            if not c:
                continue
            vals = [c["agreed"], c["agreed_kind_differs"], c["disagreed"], c["read_once_A"], c["read_once_B"]]
            for k, v in zip(("ag", "agk", "dis", "ra", "rb"), vals):
                tot[k] += v
            L.append(f"| {PANEL_NAME[P]} | {G}: {GROUP_NAME[G]} | " + " | ".join(map(str, vals)) + " |")
    L.append(f"| all | all | {tot['ag']} | {tot['agk']} | {tot['dis']} | {tot['ra']} | {tot['rb']} |")
    ncont = sum(1 for r in out if r.get("contested") == "yes")
    L += ["", f"Contested pairs: {ncont} of {tot['ag'] + tot['dis']}. A pair is marked `contested` in",
          "`pairing.csv` when either of its rows had more than one candidate within the",
          "matching window (rule 4), so the one-to-one nearest-in-Mach choice decided",
          "the partner. The pairing is as the rule makes it; the mark is for a later",
          "user who wants to see where the match itself was a choice."]
    L += ["", "## Item 6: agreed fins-off and solid fins-on pairs by side of the gap", "",
          "Side (rule 8): below when both readings' Mach are at or below 1.04; above",
          "when both are at or above 1.13 and at or below 1.41. Mach numbers are given",
          "as A / B. `(k)` marks a pair whose kinds differ (open against flagged).", ""]
    fo_ok = {}
    for P in ("bottom", "middle"):
        L.append(f"### {PANEL_NAME[P]}")
        L.append("")
        for G in ("FO", "FS"):
            L.append(f"- {G} ({GROUP_NAME[G]}):")
            for sd in ("below", "above", "straddles-or-outside"):
                rs = [r for r in agreed[(P, G)] if r["side"] == sd]
                txt = ", ".join(f"{r['a_x']} / {r['b_x']}" + (" (k)" if r["kind_status"] != "same" else "")
                                for r in rs) or "none"
                L.append(f"  - {sd}: {len(rs)}: {txt}")
        L.append("")
    # fins-off availability for agreed net-drag FS pairs (existence only)
    fo = agreed[("bottom", "FO")]
    L += ["### Net drag: can each agreed solid square take a fins-off value (item 7)?", "",
          "Existence only, per rule 8; no value is formed.", ""]
    q = defaultdict(list); q_strict = defaultdict(list)
    for r in agreed[("bottom", "FS")]:
        xa, xb = Decimal(r["a_x"]), Decimal(r["b_x"])
        sd = r["side"]
        near = [f for f in fo if abs(Decimal(f["a_x"]) - xa) <= NEAR and abs(Decimal(f["b_x"]) - xb) <= NEAR]
        how = []
        if near:
            how.append("within 0.01: " + ", ".join(f"{f['a_x']} / {f['b_x']}" for f in near))
        same = [f for f in fo if f["side"] == sd and sd != "straddles-or-outside"]
        brk = []
        for lo in same:
            for hi in same:
                if (Decimal(lo["a_x"]) <= xa <= Decimal(hi["a_x"]) and Decimal(lo["b_x"]) <= xb <= Decimal(hi["b_x"])
                        and Decimal(hi["a_x"]) - Decimal(lo["a_x"]) <= SPAN
                        and Decimal(hi["b_x"]) - Decimal(lo["b_x"]) <= SPAN and lo is not hi):
                    brk.append((lo, hi))
        if brk:
            how.append("bracketed: " + "; ".join(f"{lo['a_x']} / {lo['b_x']} and {hi['a_x']} / {hi['b_x']}" for lo, hi in brk))
        ok = bool(near or brk)
        if ok:
            q[sd].append(r)
            used = near + [f for p in brk for f in p]
            if r["kind_status"] == "same" and any(f["kind_status"] == "same" for f in near) or \
               r["kind_status"] == "same" and any(lo["kind_status"] == "same" and hi["kind_status"] == "same" for lo, hi in brk):
                q_strict[sd].append(r)
        L.append(f"- FS {r['a_x']} / {r['b_x']} ({sd}"
                 + (", kinds differ" if r["kind_status"] != "same" else "") + "): "
                 + ("yes; " + " | ".join(how) if ok else "no fins-off pair within 0.01 or bracketing within 0.05"))
    L += ["", "### Item 6 (v), as far as item 6 (ii) and item 7's fins-off rule reach", ""]
    for sd in ("below", "above"):
        n, ns = len(q[sd]), len(q_strict[sd])
        L.append(f"- {sd} the gap: {n} candidate qualifying point(s) (Mach A / B: "
                 + (", ".join(f"{r['a_x']} / {r['b_x']}" for r in q[sd]) or "none") + "); "
                 + ("fewer than two: item 6 (v)'s condition is MET, this side stays refused."
                    if n < 2 else "two or more: item 6 (v)'s condition is NOT met on this side.")
                 + f" Counting only pairs whose kinds agree (and fins-off partners whose kinds agree): {ns}.")
    L += ["", "Items 6 (iii) and (iv) (the model refused or not converged; total",
          "uncertainty above half the modelled own drag) need the model and are",
          "not applied here: they can only remove candidates.", "",
          "Also recorded, not decided here: item 4 says the band applies only within",
          "the span of a side's qualifying points and never below Mach 1.0. Every",
          "candidate listed below the gap lies below Mach 1.0 in both readings",
          "(their Mach numbers above), so whatever they qualify for, the span they",
          "give below the gap lies wholly below 1.0. Above the gap, the counts that",
          "drop to zero when kind disagreements are excluded do so because the",
          "fins-off partners within 0.01 are open in one reading and flagged in the",
          "other (rule 3 does not let a kind difference block agreement; the strict",
          "count is given for the coordinator). The legend keys the flag as fixed",
          "transition.", ""]
    (HERE / "summary.md").write_text("\n".join(L))

    with open(HERE / "sha256.txt", "w") as f:
        for p in (CSV["A"], CSV["B"], HERE / "README.md", HERE / "pair_fig6.py",
                  HERE / "pairing.csv", HERE / "summary.md"):
            f.write(f"{sha(p)}  {p.relative_to(BASE)}\n")


if __name__ == "__main__":
    main()
