"""Neutral pairing, second set: W7's first readings of R&M 3348 figs. 30a, 30b, 31b, 32 and NASA CR-149372 fig. 8a
against round 10's blind readings; and fig. 30a against R&M 3348 table 3 for both readings.

Usage (from the repository root): python3 -I docs/research/total-drag/audit/pairing-2026-10-22b/pair_figures_b.py
  (optional: pair_figures_b.py <gate scale factor> <other output folder>, a check of the gate)

Reads:
  first (A):  W7's CSVs at commit 7e58173 (claude/wip/w7-fins), docs/research/total-drag/audit/w7-fins/, by `git show`
              (the branch is not merged here)
  second (B): docs/research/total-drag/audit/round10/readings/ (symbols only; round 10's curves are listed, not paired)
  table 3:    docs/research/total-drag/audit/w7-fins/rm3348_table3_first.csv (on main; paired 852 of 852 identical with
              round 8's typing, tests/base/rm3348-table3-readings.test.ts), checked here against
              docs/research/total-drag/audit/round8/readings/rm3348_table3.csv at every entry used
Writes, next to this script: pairs_<figure>.csv, fig30a_against_table3.csv and pairing_output.txt (what is printed,
including the per-figure table, the disagreements and the blindness notes).

Method: as ../pairing-2026-10-22/pair_figures.py (the round 7 rule applied to symbols). Each W7 symbol is matched to a
round 10 symbol within a gate of page pixels (8 px on R&M 3348, where the two readers' triangle centre conventions
differ by about 2.7 px and two readings of one overlapped triangle lie 6.1 px apart; 12 px on CR-149372 fig. 8a, whose
glyphs are 25 to 52 px across and whose two calibrations differ by up to 5 px), same type first, nearest first, then across types. A pair agrees when
on each axis |A - B| <= err_A + err_B (stated errors, as stated). Disagreements are listed, never resolved.
"""
import csv
import io
import math
import subprocess
import sys

ROOT = "docs/research/total-drag/audit/"
W7_REF = "7e58173"
W7 = ROOT + "w7-fins/"
R10 = ROOT + "round10/readings/"
OUT = ROOT + "pairing-2026-10-22b/"
GATE_FACTOR = 1.0
if len(sys.argv) == 3:
    GATE_FACTOR, OUT = float(sys.argv[1]), sys.argv[2].rstrip("/") + "/"

TYPES = {
    "circle": "circle", "circ": "circle", "square": "square", "sq": "square", "triangle": "triangle",
    "tri": "triangle", "plus": "plus", "cross": "cross", "hexagon": "hexagon", "hex": "hexagon",
    "diamond": "diamond", "right-triangle": "right-pointing triangle", "ellipse": "oval",
    # round 10's names for Goin's glyphs in fig. 30b (its method: 3 % large square, 4.5 % diamond, 6 % right-pointing
    # triangle, 10 % oval with a bar)
    "g3": "square", "g45": "diamond", "g6": "right-pointing triangle", "g10": "oval",
}


def parse(text):
    return list(csv.DictReader(l for l in io.StringIO(text) if not l.startswith("#")))


def w7_rows(name):
    text = subprocess.run(["git", "show", f"{W7_REF}:{W7}{name}"], capture_output=True, text=True, check=True).stdout
    return parse(text)


def rows(path):
    with open(path, newline="") as f:
        return parse(f.read())


def sym(rid, typ, series, x, ex, y, ey, note=""):
    return {"id": rid, "type": TYPES[typ], "series": series, "x": float(x), "ex": float(ex), "y": float(y),
            "ey": float(ey), "note": note}


def series_key(s):
    """A common series name: the sweep, Goin's t/c, or the Mach number."""
    s = s.replace("=", "").replace("  ", " ")
    if "Goin" in s:
        for tc in ("4.5", "10", "3", "6"):
            if f"t/c {tc}" in s.replace("t/c  ", "t/c ") or f"t/c {tc} %" in s:
                return f"Goin t/c {tc}%"
    for k in ("phi 0 ", "phi 15", "phi 30", "phi 45", "phi 60"):
        if k in s.replace("phi  ", "phi "):
            return k.strip() + " deg"
    for m in ("0.6", "0.7", "0.8", "0.9"):
        if s.startswith(f"M {m}") or s.startswith(f"Mach {m}"):
            return f"M {m}"
    return s


FIGS = []
# Round 10's own statements (round10/method.md): its triangles are centred on the bounding box, and the centroid would
# read +0.0023 in p_b/p_0 on fig. 30 (2.7 px lower, p_b/p_0 increasing downwards) and 0.0002 lower on fig. 31b. W7's
# symfit.py centres triangles on the centroid. Used only to say what the convention explains; no verdict is changed.
CENTROID = {"rm3348_fig30a": 0.0023, "rm3348_fig30b": 0.0023, "rm3348_fig31b": -0.0002}


def b_symbols(name, xk, xek, yk, yek):
    out, others = [], []
    for r in rows(R10 + name):
        if r["item"] != "symbol":
            others.append(r)
            continue
        out.append(sym(r["id"], r["symbol"], series_key(r["series"]), r[xk], r[xek], r[yk], r[yek], r["notes"]))
    return out, others


def other_summary(others):
    kinds = {}
    for r in others:
        k = (r["item"], r["id"])
        kinds[k] = kinds.get(k, 0) + 1
    return [f"round 10 only: {n} x '{item}' {cid}" for (item, cid), n in kinds.items()]


def a_symbols(name, xk, xek, yk, yek):
    return [sym(r["id"], r["symbol"], series_key(r["series"]), r[xk], r[xek], r[yk], r[yek], r["source"])
            for r in w7_rows(name)]


for key, title, w7f, wx, wy, r10f, bx, bxe, by, bye, scale, gate, a_note in (
        ("rm3348_fig30a", "R&M 3348 fig. 30a (M_0, p_b/p_0)", "rm3348_fig30a_first.csv", "mach", "pb_over_p0",
         "rm3348_fig30a.csv", "M0", "M0_err", "pb_p0", "pb_p0_err", (0.00085, 0.00085), 8.0,
         "W7 did not read the faired sweep curves"),
        ("rm3348_fig30b", "R&M 3348 fig. 30b (M_0 cos phi, p_b/p_0)", "rm3348_fig30b_first.csv", "mach_normal",
         "pb_over_p0", "rm3348_fig30b.csv", "M0_cos_phi", "M0_cos_phi_err", "pb_p0", "pb_p0_err", (0.00085, 0.00085),
         8.0, "W7 did not read the dashed mean curve of Cleary and Stevens"),
        ("rm3348_fig31b", "R&M 3348 fig. 31b (M_0 cos phi, C_cf sec^2 phi)", "rm3348_fig31b_first.csv", "mach_normal",
         "ccf_sec2phi", "rm3348_fig31b.csv", "M0_cos_phi", "M0_cos_phi_err", "Ccf_sec2_phi", "Ccf_sec2_phi_err",
         (0.00059, 0.000087), 8.0, "W7 did not read the faired 0 deg curve"),
        ("rm3348_fig32", "R&M 3348 fig. 32 (xi_0, C~_cf)", "rm3348_fig32_first.csv", "xi0", "ccf_reduced",
         "rm3348_fig32.csv", "xi0", "xi0_err", "Ccf_tilde", "Ccf_tilde_err", (0.0058, 0.0044), 8.0,
         "W7 did not read Knechtel's curve (ref. 19) or the theory curve (ref. 30)"),
        ("cr149372_fig8a", "NASA CR-149372 fig. 8a (theta deg, Cp)", "cr149372_fig8a_first.csv", "theta_deg", "cp",
         "cr149372_fig8a.csv", "theta_deg", "theta_err_deg", "Cp", "Cp_err", (0.14, 0.0014), 12.0,
         "W7 did not read the four faired curves")):
    a = a_symbols(w7f, wx, wx + "_err", wy, wy + "_err")
    b, bo = b_symbols(r10f, bx, bxe, by, bye)
    FIGS.append({"key": key, "title": title + ", W7 against round 10", "scale": scale, "gate": gate * GATE_FACTOR,
                 "a": a, "b": b, "other": [a_note] + other_summary(bo)})


def px_dist(p, q, scale):
    return math.hypot((p["x"] - q["x"]) / scale[0], (p["y"] - q["y"]) / scale[1])


def match(A, B, scale, gate):
    pairs, used_a, used_b = [], set(), set()
    cands = sorted((px_dist(p, q, scale), i, j) for i, p in enumerate(A) for j, q in enumerate(B)
                   if px_dist(p, q, scale) <= gate)
    for same_type in (True, False):
        for d, i, j in cands:
            if i in used_a or j in used_b or (same_type and A[i]["type"] != B[j]["type"]):
                continue
            pairs.append((i, j, d))
            used_a.add(i)
            used_b.add(j)
    return pairs, [i for i in range(len(A)) if i not in used_a], [j for j in range(len(B)) if j not in used_b]


def nearest(p, others, scale):
    q = min(others, key=lambda q: px_dist(p, q, scale))
    return f"{q['id']} ({q['type']}, {q['series']}) at {px_dist(p, q, scale):.1f} px"


FIELDS = ["figure", "verdict", "A_id", "A_type", "A_series", "A_x", "A_x_err", "A_y", "A_y_err", "B_id", "B_type",
          "B_series", "B_x", "B_x_err", "B_y", "B_y_err", "dx_A_minus_B", "dy_A_minus_B", "combined_x_err",
          "combined_y_err", "distance_px", "note"]
lines, summary = [], []


def say(s=""):
    lines.append(s)


for F in FIGS:
    A, B, sc = F["a"], F["b"], F["scale"]
    pairs, a_only, b_only = match(A, B, sc, F["gate"])
    table, out_err, type_dis, series_dis, n_agree = [], [], [], [], 0
    for i, j, d in sorted(pairs, key=lambda t: (A[t[0]]["series"], A[t[0]]["x"])):
        p, q = A[i], B[j]
        dx, dy, cx, cy = p["x"] - q["x"], p["y"] - q["y"], p["ex"] + q["ex"], p["ey"] + q["ey"]
        inside = abs(dx) <= cx + 1e-12 and abs(dy) <= cy + 1e-12
        if p["type"] != q["type"] or p["series"] != q["series"]:
            what = "type" if p["type"] != q["type"] else "series"
            verdict = f"{what} disagreement" + (" (values within errors)" if inside else " (values outside errors)")
            type_dis.append((p, q, dx, dy, cx, cy, what))
        elif inside:
            verdict, n_agree = "agree", n_agree + 1
        else:
            verdict = "outside errors"
            out_err.append((p, q, dx, dy, cx, cy))
        table.append([F["key"], verdict, p["id"], p["type"], p["series"], p["x"], p["ex"], p["y"], p["ey"], q["id"],
                      q["type"], q["series"], q["x"], q["ex"], q["y"], q["ey"], f"{dx:+.5f}", f"{dy:+.5f}",
                      f"{cx:.5f}", f"{cy:.5f}", f"{d:.1f}", ""])
    for i in a_only:
        p = A[i]
        table.append([F["key"], "first reading (W7) only", p["id"], p["type"], p["series"], p["x"], p["ex"], p["y"],
                      p["ey"]] + [""] * 12 + ["nearest in round 10: " + nearest(p, B, sc)])
    for j in b_only:
        q = B[j]
        table.append([F["key"], "second reading (round 10) only"] + [""] * 7 +
                     [q["id"], q["type"], q["series"], q["x"], q["ex"], q["y"], q["ey"]] + [""] * 5 +
                     ["nearest in W7: " + nearest(q, A, sc)])
    def counts(S):
        c = {}
        for s in S:
            c[s["type"]] = c.get(s["type"], 0) + 1
        return ", ".join(f"{n} {t}" for t, n in c.items())

    say(f"=== {F['title']}")
    say(f"  1 px = {sc[0]} (x) and {sc[1]} (y); gate {F['gate']:.0f} px")
    say(f"  symbols: W7 {len(A)} ({counts(A)}); round 10 {len(B)} ({counts(B)})")
    say(f"  matched {len(pairs)}; same type and within errors {n_agree}; outside errors {len(out_err)}; "
        f"type or series disagreements {len(type_dis)}; W7 only {len(a_only)}; round 10 only {len(b_only)}")
    if pairs:
        rx = max(abs(A[i]["x"] - B[j]["x"]) / (A[i]["ex"] + B[j]["ex"]) for i, j, d in pairs)
        ry = max(abs(A[i]["y"] - B[j]["y"]) / (A[i]["ey"] + B[j]["ey"]) for i, j, d in pairs)
        say(f"  largest |difference| / combined error over the matched pairs: x {rx:.2f}, y {ry:.2f}")
    for p, q, dx, dy, cx, cy in out_err:
        say(f"    OUTSIDE ERRORS: W7 {p['id']} / round 10 {q['id']} ({p['type']}, {p['series']}): W7 ({p['x']}, "
            f"{p['y']}) round 10 ({q['x']}, {q['y']}); dx {dx:+.5f} (combined {cx:.5f}), dy {dy:+.5f} "
            f"(combined {cy:.5f})")
        if p["type"] == "triangle" and F["key"] in CENTROID:
            c = CENTROID[F["key"]]
            ok = abs(dy - c) <= cy
            say(f"      centre convention: W7 centres triangles on the centroid, round 10 on the bounding box and "
                f"states its centroid at {c:+.4f}; with that, dy {dy - c:+.5f} ({'within' if ok else 'outside'} "
                f"{cy:.5f}). Information only; the verdict above stands.")
            for row in table:
                if row[2] == p["id"] and row[9] == q["id"]:
                    row[-1] = (f"centre convention (W7 centroid, round 10 bounding box; round 10 states its centroid "
                               f"at {c:+.4f}): dy {dy - c:+.5f}, {'within' if ok else 'outside'} errors so")
    for p, q, dx, dy, cx, cy, what in type_dis:
        say(f"    {what.upper()}: W7 {p['id']} {p['type']} ({p['series']}) against round 10 {q['id']} {q['type']} "
            f"({q['series']}): W7 ({p['x']}, {p['y']}) round 10 ({q['x']}, {q['y']}); dx {dx:+.5f} (combined "
            f"{cx:.5f}), dy {dy:+.5f} (combined {cy:.5f})")
    for i in a_only:
        p = A[i]
        say(f"    W7 ONLY: {p['id']} {p['type']} ({p['series']}) at ({p['x']}, {p['y']}); nearest round 10: "
            f"{nearest(p, B, sc)}")
    for j in b_only:
        q = B[j]
        say(f"    ROUND 10 ONLY: {q['id']} {q['type']} ({q['series']}) at ({q['x']}, {q['y']}); nearest W7: "
            f"{nearest(q, A, sc)}")
    for s in F["other"]:
        say(f"    not a symbol, one reading only: {s}")
    say()
    with open(OUT + f"pairs_{F['key']}.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(FIELDS)
        w.writerows(table)
    summary.append((F["key"], len(A), len(B), len(pairs), n_agree, len(out_err), len(type_dis), len(a_only),
                    len(b_only)))

# ---- fig. 30a against table 3 (hole 4 = eta 0.59, alpha 0), both readings --------------------------------------
w7t = {(int(r["sweep_deg"]), r["mach"]): float(r["pb_over_p0"]) for r in rows(W7 + "rm3348_table3_first.csv")
       if r["hole"] == "4" and r["alpha_deg"] == "0"}
r8t = {(int(r["phi_deg"]), r["M0"]): float(r["p_b_over_p0"]) for r in rows(ROOT + "round8/readings/rm3348_table3.csv")
       if r["hole"] == "4" and r["alpha_deg"] == "0"}
SWEEP = {"phi 0 deg": 0, "phi 15 deg": 15, "phi 30 deg": 30, "phi 45 deg": 45, "phi 60 deg": 60}
F30 = FIGS[0]
say("=== R&M 3348 fig. 30a against table 3 (hole 4, eta 0.59, alpha 0): a source inconsistency, both kept")
say("  table 3 as typed twice (W7 and round 8, equal at every entry used here); a symbol is set against the table's")
say("  M_0 when its read M_0 lies within 0.015 of it; difference = plotted minus tabulated (negative: more suction")
say("  in the figure); the figure's reading error is shown, the table's is a printed three-decimal value")
tab_rows = []
for who, S in (("W7", F30["a"]), ("round 10", F30["b"])):
    for s in sorted(S, key=lambda s: (SWEEP[s["series"]], s["x"])):
        ph = SWEEP[s["series"]]
        hits = [(m, v) for (p, m), v in w7t.items() if p == ph and abs(float(m) - s["x"]) <= 0.015]
        if not hits:
            continue
        m, v = hits[0]
        assert r8t[(ph, m)] == v, (ph, m)
        tab_rows.append([who, s["id"], ph, f"{s['x']:.4f}", m, f"{s['y']:.4f}", f"{s['ey']:.4f}", f"{v:.3f}",
                         f"{s['y'] - v:+.4f}"])
with open(OUT + "fig30a_against_table3.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["reading", "symbol", "phi_deg", "M0_read", "M0_table", "pb_p0_read", "read_err", "pb_p0_table3",
                "read_minus_table"])
    w.writerows(tab_rows)
by = {}
for r in tab_rows:
    by.setdefault((r[2], r[4]), {})[r[0]] = (r[1], float(r[8]))
say(f"  {'phi':>4} {'M_0':>5}  {'table 3':>7}  {'W7 - table':>16}  {'round 10 - table':>20}")
for (ph, m) in sorted(by, key=lambda k: (k[0], float(k[1]))):
    d = by[(ph, m)]
    w = f"{d['W7'][1]:+.4f} ({d['W7'][0]})" if "W7" in d else "none"
    t = f"{d['round 10'][1]:+.4f} ({d['round 10'][0]})" if "round 10" in d else "none"
    say(f"  {ph:>4} {m:>5}  {w7t[(ph, m)]:>7.3f}  {w:>16}  {t:>20}")
for who in ("W7", "round 10"):
    lo = [abs(float(r[8])) for r in tab_rows if r[0] == who and float(r[4]) <= 1.0]
    hi = [float(r[8]) for r in tab_rows if r[0] == who and float(r[4]) > 1.05]
    say(f"  {who}: M_0 0.70 to 1.00, {len(lo)} points, |plotted - table| up to {max(lo):.4f}, "
        f"{sum(1 for x in lo if x <= 0.002)} within 0.002; M_0 1.11 to 1.20, {len(hi)} points, plotted - table "
        f"{min(hi):+.4f} to {max(hi):+.4f}, {sum(1 for x in hi if x < 0)} of {len(hi)} below the table")
say()

say("=== Summary (symbols): figure, W7, round 10, matched, agree, outside errors, type or series disagreements, "
    "W7 only, round 10 only")
for s in summary:
    say("  " + ", ".join(str(x) for x in s))

text = "\n".join(lines) + "\n"
with open(OUT + "notes.txt") as f:
    notes = f.read()
print(text + "\n" + notes, end="")
with open(OUT + "pairing_output.txt", "w") as f:
    f.write(text + "\n" + notes)
