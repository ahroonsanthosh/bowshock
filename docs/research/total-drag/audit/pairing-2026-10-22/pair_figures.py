"""Neutral pairing of W7's first readings of figures with the blind second readings (rounds 10 and 11).

Usage (from the repository root): python3 -I docs/research/total-drag/audit/pairing-2026-10-22/pair_figures.py

Reads only the committed readings:
  first (A):  docs/research/total-drag/audit/w7-fins/*_first.csv (W7, design record 0019)
  second (B): docs/research/total-drag/audit/round10/readings/ (R&M 3427 figs. 9, 10, 13 holes 5 to 7)
              docs/research/total-drag/audit/round11/readings/ (R&M 3427 fig. 13 hole 4, figs. 15, 16a, 16b, 18,
              39; TN 3548 fig. 6; RM A51J25 fig. 7 below M' 1.5)
Writes, next to this script: pairs_<figure>.csv (one row per pair or unmatched symbol), a51j25_fig7_band_edges.csv
and pairing_output.txt (what is printed).

Method (as the round 7 pairing, docs/research/total-drag/scripts/w1/pair_round7.py, applied to symbols):
  * Each symbol of A is matched to a symbol of B by position: the two centres must lie within GATE_PX page pixels of
    each other (6 px; the glyphs are 10 to 16 px across), the pixel converted to data units by the figure's scale.
    Pairs of the same type are made first, nearest first; the symbols left over are then matched across types,
    nearest first. Each symbol is used once.
  * A pair of the same type agrees when on each axis |A - B| <= err_A + err_B (the stated errors, as stated; the
    readers state them differently: W7 mostly as a placement half range, rounds 10 and 11 as about 2 sigma; no error
    is rescaled here).
  * Reported, never resolved toward either reading: pairs outside their errors, type disagreements (matched by
    position, typed differently), and symbols in one reading only (with the nearest symbol of the other reading).
  * Lines and curves read by one reading only are counted and listed as one-reading items, not paired.
"""
import csv
import math
import sys

ROOT = "docs/research/total-drag/audit/"
W7 = ROOT + "w7-fins/"
R10 = ROOT + "round10/readings/"
R11 = ROOT + "round11/readings/"
OUT = ROOT + "pairing-2026-10-22/"
GATE_PX = 6.0
if len(sys.argv) == 3:  # a check of the gate: pair_figures.py <gate_px> <other output folder>
    GATE_PX, OUT = float(sys.argv[1]), sys.argv[2].rstrip("/") + "/"

TYPES = {
    "circle": "circle", "circ": "circle",
    "square": "square", "sq": "square",
    "triangle": "triangle", "tri": "triangle",
    "diamond": "diamond", "dia": "diamond",
    "plus": "plus", "cross": "cross",
    "pard": "filled circle", "filled circle": "filled circle",
    "delta": "flagged glyph (Langley 9 x 12 in delta)",
    "sqtri": "square with a triangle inside, one glyph",
    "halftri": "half-filled triangle (Langley 9 in)",
}


def rows(path):
    with open(path, newline="") as f:
        return list(csv.DictReader(l for l in f if not l.startswith("#")))


def sym(rid, typ, series, x, ex, y, ey, note=""):
    return {"id": rid, "type": TYPES[typ], "series": series, "x": float(x), "ex": float(ex), "y": float(y),
            "ey": float(ey), "note": note}


def b_symbols(path, xk, yk, series_of):
    out, others = [], []
    for r in rows(path):
        if r["item"] != "symbol":
            others.append(r)
            continue
        out.append(sym(r["id"], r["symbol"], series_of(r), r[xk], r[xk + "_err"], r[yk], r[yk + "_err"],
                       r.get("notes", "")))
    return out, others


# ---- the figures ---------------------------------------------------------------------------------------------
FIGS = []


def fig(key, title, axes, scale, a, b, a_other=None, b_other=None):
    FIGS.append({"key": key, "title": title, "axes": axes, "scale": scale, "a": a, "b": b,
                 "a_other": a_other or [], "b_other": b_other or []})


def other_summary(others, label):
    """One line per kind of non-symbol item (a curve, a line end), with its count."""
    kinds = {}
    for r in others:
        k = (r["item"], r["id"], r["series"])
        kinds[k] = kinds.get(k, 0) + 1
    return [f"{label}: {n} x '{item}' {cid} ({series})" for (item, cid, series), n in kinds.items()]


# R&M 3427 fig. 9 (u*, y in.)
a = [sym(f"row{i + 1:02d}", r["symbol"], r["station"], r["u_star"], r["u_star_err"], r["y_in"], r["y_err_in"])
     for i, r in enumerate(rows(W7 + "rm3427_fig9_first.csv"))]
b, bo = b_symbols(R10 + "rm3427_fig9.csv", "u_star", "y_in",
                  lambda r: "trailing edge" if r["id"].startswith("te") else "1 in upstream")
fig("rm3427_fig9", "R&M 3427 fig. 9 (u*, y in.), W7 against round 10", ("u*", "y_in"), (0.00199, 0.00025), a, b,
    ["W7 did not read the 1/7th power-law line"], other_summary(bo, "round 10 only"))

# R&M 3427 fig. 10 (M_inf, delta/h)
a = [sym(f"row{i + 1:02d}", r["symbol"], r["station"], r["mach"], r["mach_err"], r["delta_over_h"],
         r["delta_over_h_err"]) for i, r in enumerate(rows(W7 + "rm3427_fig10_first.csv"))]
b, bo = b_symbols(R10 + "rm3427_fig10.csv", "M_inf", "delta_over_h",
                  lambda r: "trailing edge" if r["series"].startswith("at trailing") else "1 in upstream")
fig("rm3427_fig10", "R&M 3427 fig. 10 (M_inf, delta/h), W7 against round 10", ("M_inf", "delta_over_h"),
    (0.00199, 0.00050), a, b, ["W7 did not read the two dashed flat-plate lines (estimates, its header says)"],
    other_summary(bo, "round 10 only"))

# R&M 3427 fig. 13, base holes 5, 6, 7 (M_inf, Cp)
a = [sym(f"row{i + 1:02d}", r["symbol"], "hole " + r["hole"], r["mach"], r["mach_err"], r["cp_b"], r["cp_b_err"],
         r["note"]) for i, r in enumerate(rows(W7 + "rm3427_fig13_first.csv"))]
b, bo = b_symbols(R10 + "rm3427_fig13_base.csv", "M_inf", "Cp", lambda r: "hole " + r["id"][1])
fig("rm3427_fig13_holes5to7", "R&M 3427 fig. 13 base holes 5, 6, 7 (M_inf, Cp_b), W7 against round 10",
    ("M_inf", "Cp_b"), (0.00101, 0.00102), a, b, ["W7 did not read the faired lines or the jump line"],
    other_summary(bo, "round 10 only"))

# R&M 3427 fig. 13, hole 4 (M_inf, Cp)
a = [sym(r["id"], "plus", "hole 4", r["mach"], r["mach_err"], r["cp"], r["cp_err"], r["note"])
     for r in rows(W7 + "rm3427_fig13_hole4_first.csv")]
b, bo = b_symbols(R11 + "rm3427_fig13_hole4.csv", "M_inf", "Cp", lambda r: "hole 4")
fig("rm3427_fig13_hole4", "R&M 3427 fig. 13 surface hole 4 (M_inf, Cp), W7 against round 11", ("M_inf", "Cp"),
    (0.00101, 0.00102), a, b)

# R&M 3427 fig. 15 (spanwise in., Cp_b)
a = [sym(f"row{i + 1:02d}", r["symbol"], f"M {r['mach']} {r['source']}", r["spanwise_in"], r["spanwise_err"],
         r["cp_b"], r["cp_b_err"]) for i, r in enumerate(rows(W7 + "rm3427_fig15_first.csv"))]
S15 = {"d10": "M 1.0 tapping", "t08": "M 0.8 tapping", "t04": "M 0.4 tapping", "p08": "M 0.8 pitot traverse"}
b, bo = b_symbols(R11 + "rm3427_fig15.csv", "spanwise_in", "Cp_b", lambda r: S15[r["id"][:3]])
fig("rm3427_fig15", "R&M 3427 fig. 15 (spanwise in., Cp_b), W7 against round 11", ("spanwise_in", "Cp_b"),
    (0.0101, 0.0020), a, b)

# R&M 3427 fig. 16a and 16b (y/h, Cp_b)
w16 = rows(W7 + "rm3427_fig16_first.csv")
for panel in ("a", "b"):
    a = [sym(f"row{i + 1:02d}", r["symbol"], f"M {r['mach']}", r["y_over_h"], r["y_over_h_err"], r["cp_b"],
             r["cp_b_err"]) for i, r in enumerate(w16) if r["panel"] == panel]
    b, bo = b_symbols(R11 + f"rm3427_fig16{panel}.csv", "y_over_h", "Cp_b",
                      lambda r: "M " + {"10": "1.0", "08": "0.8", "04": "0.4"}[r["id"][1:3]])
    fig(f"rm3427_fig16{panel}", f"R&M 3427 fig. 16{panel} (y/h, Cp_b), W7 against round 11", ("y_over_h", "Cp_b"),
        (0.0034, 0.0020), a, b)

# R&M 3427 fig. 18 (Re x 1e-6, Cp_b)
a = [sym(f"row{i + 1:02d}", "circle", "M 0.8", r["reynolds_e6"], r["reynolds_err_e6"], r["cp_b"], r["cp_b_err"])
     for i, r in enumerate(rows(W7 + "rm3427_fig18_first.csv"))]
b, bo = b_symbols(R11 + "rm3427_fig18.csv", "Re_x1e-6", "Cp_b", lambda r: "M 0.8")
fig("rm3427_fig18", "R&M 3427 fig. 18 (Re x 1e-6, Cp_b), W7 against round 11", ("Re_e6", "Cp_b"),
    (0.0101, 0.000201), a, b)

# R&M 3427 fig. 39 (x/h, Cp)
S39 = {"o": "basic model", "x": "splitter plate", "s": "backward-facing step"}
a = [sym(r["id"], r["symbol"], S39[r["id"][0]], r["x_over_h"], r["x_over_h_err"], r["cp"], r["cp_err"])
     for r in rows(W7 + "rm3427_fig39_first.csv")]
S39b = {"bm": "basic model", "sp": "splitter plate", "st": "backward-facing step"}
b, bo = b_symbols(R11 + "rm3427_fig39.csv", "x_over_h", "Cp", lambda r: S39b[r["id"][:2]])
fig("rm3427_fig39", "R&M 3427 fig. 39 (x/h, Cp), W7 against round 11", ("x_over_h", "Cp"), (0.0040, 0.0010), a, b)

# TN 3548 fig. 6 (M, Cp_b)
a = [sym(r["id"], r["symbol"], r["slit"], r["mach"], r["mach_err"], r["cp_b"], r["cp_b_err"], r["source"])
     for r in rows(W7 + "tn3548_fig6_first.csv")]
b, bo = b_symbols(R11 + "tn3548_fig6.csv", "M", "Cp_b", lambda r: "outboard" if r["id"].startswith("ob") else "inboard")
fig("tn3548_fig6", "NACA TN 3548 fig. 6 (M, Cp_b), W7 against round 11", ("M", "Cp_b"), (0.0009, 0.0009), a, b)

# RM A51J25 fig. 7 below M' 1.5: the symbols (the band edges are paired below)
A51_PX_P, A51_PX_M = 1 / 657.2, 1 / 273.1  # W7's calibration (method_rma51j25_fig7.md), per page pixel
A51_TYPE = {"f1": "filled circle", "s1": "sqtri", "s2": "halftri", "s3": "diamond", "s4": "sqtri"}
w7a51 = rows(W7 + "rma51j25_fig7_below15_first.csv")
a = [sym(r["id"], A51_TYPE[r["id"]], r["note"][:60], r["mach_prime"], float(r["p_err"]) / A51_PX_P * A51_PX_M,
         r["p_mid"], r["p_err"], r["note"]) for r in w7a51 if r["kind"] == "symbol"]
b, bo = b_symbols(R11 + "rma51j25_fig7.csv", "M_prime", "pb_over_pprime", lambda r: r["series"][:60])
fig("rma51j25_fig7_symbols", "NACA RM A51J25 fig. 7 below M' 1.5, symbols (M', p_b/p'), W7 against round 11",
    ("M_prime", "pb_over_pprime"), (0.0037, 0.0015), a, b,
    ["W7's M' error is not stated for its symbols; taken as its stated p_b/p' error in pixels (2 to 3 px placement "
     "plus 1.5 px calibration) converted at its own scales"])


# ---- matching ------------------------------------------------------------------------------------------------
def px_dist(p, q, scale):
    return math.hypot((p["x"] - q["x"]) / scale[0], (p["y"] - q["y"]) / scale[1])


def match(A, B, scale):
    pairs, used_a, used_b = [], set(), set()
    cands = sorted(((px_dist(p, q, scale), i, j) for i, p in enumerate(A) for j, q in enumerate(B)
                    if px_dist(p, q, scale) <= GATE_PX))
    for same_type in (True, False):
        for d, i, j in cands:
            if i in used_a or j in used_b:
                continue
            if same_type and A[i]["type"] != B[j]["type"]:
                continue
            pairs.append((i, j, d))
            used_a.add(i)
            used_b.add(j)
    return pairs, [i for i in range(len(A)) if i not in used_a], [j for j in range(len(B)) if j not in used_b]


def nearest(p, others, scale):
    if not others:
        return "none"
    q = min(others, key=lambda q: px_dist(p, q, scale))
    return f"{q['id']} ({q['type']}, {q['series']}) at {px_dist(p, q, scale):.1f} px"


FIELDS = ["figure", "verdict", "A_id", "A_type", "A_series", "A_x", "A_x_err", "A_y", "A_y_err", "B_id", "B_type",
          "B_series", "B_x", "B_x_err", "B_y", "B_y_err", "dx_A_minus_B", "dy_A_minus_B", "combined_x_err",
          "combined_y_err", "distance_px", "note"]
lines = []


def say(s=""):
    lines.append(s)


summary = []
for F in FIGS:
    A, B, sc = F["a"], F["b"], F["scale"]
    pairs, a_only, b_only = match(A, B, sc)
    table = []
    n_agree = 0
    out_err, type_dis = [], []
    for i, j, d in sorted(pairs, key=lambda t: (A[t[0]]["series"], A[t[0]]["x"], A[t[0]]["y"])):
        p, q = A[i], B[j]
        dx, dy = p["x"] - q["x"], p["y"] - q["y"]
        cx, cy = p["ex"] + q["ex"], p["ey"] + q["ey"]
        inside = abs(dx) <= cx + 1e-12 and abs(dy) <= cy + 1e-12
        if p["type"] != q["type"]:
            verdict = "type disagreement" + (" (values within errors)" if inside else " (values outside errors too)")
            type_dis.append((p, q, dx, dy, cx, cy))
        elif inside:
            verdict = "agree"
            n_agree += 1
        else:
            verdict = "outside errors"
            out_err.append((p, q, dx, dy, cx, cy))
        table.append([F["key"], verdict, p["id"], p["type"], p["series"], p["x"], p["ex"], p["y"], p["ey"], q["id"],
                      q["type"], q["series"], q["x"], q["ex"], q["y"], q["ey"], f"{dx:+.5f}", f"{dy:+.5f}",
                      f"{cx:.5f}", f"{cy:.5f}", f"{d:.1f}", ""])
    for i in a_only:
        p = A[i]
        table.append([F["key"], "first reading (W7) only", p["id"], p["type"], p["series"], p["x"], p["ex"], p["y"],
                      p["ey"], "", "", "", "", "", "", "", "", "", "", "", "",
                      "nearest in the second reading: " + nearest(p, B, sc)])
    for j in b_only:
        q = B[j]
        table.append([F["key"], "second reading only", "", "", "", "", "", "", "", q["id"], q["type"], q["series"],
                      q["x"], q["ex"], q["y"], q["ey"], "", "", "", "", "",
                      "nearest in the first reading: " + nearest(q, A, sc)])
    with open(OUT + f"pairs_{F['key']}.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(FIELDS)
        w.writerows(table)

    say(f"=== {F['title']}")
    say(f"  axes x = {F['axes'][0]}, y = {F['axes'][1]}; 1 px = {sc[0]} and {sc[1]}; gate {GATE_PX:.0f} px")
    tA = {}
    for p in A:
        tA[p["type"]] = tA.get(p["type"], 0) + 1
    tB = {}
    for q in B:
        tB[q["type"]] = tB.get(q["type"], 0) + 1
    say(f"  symbols: first (W7) {len(A)} ({', '.join(f'{n} {t}' for t, n in tA.items())}); "
        f"second {len(B)} ({', '.join(f'{n} {t}' for t, n in tB.items())})")
    say(f"  matched pairs {len(pairs)}; same type and within errors {n_agree}; outside errors {len(out_err)}; "
        f"type disagreements {len(type_dis)}; first only {len(a_only)}; second only {len(b_only)}")
    if pairs:
        rx = max(abs(A[i]["x"] - B[j]["x"]) / (A[i]["ex"] + B[j]["ex"]) for i, j, d in pairs)
        ry = max(abs(A[i]["y"] - B[j]["y"]) / (A[i]["ey"] + B[j]["ey"]) for i, j, d in pairs)
        say(f"  largest |difference| / combined error over the matched pairs: x {rx:.2f}, y {ry:.2f}")
    for p, q, dx, dy, cx, cy in out_err:
        say(f"    OUTSIDE ERRORS: {p['id']} / {q['id']} ({p['type']}, {p['series']}): A ({p['x']}, {p['y']}) "
            f"B ({q['x']}, {q['y']}); dx {dx:+.5f} (combined {cx:.5f}), dy {dy:+.5f} (combined {cy:.5f})")
    for p, q, dx, dy, cx, cy in type_dis:
        say(f"    TYPE: {p['id']} {p['type']} ({p['series']}) against {q['id']} {q['type']} ({q['series']}): "
            f"A ({p['x']}, {p['y']}) B ({q['x']}, {q['y']}); dx {dx:+.5f} (combined {cx:.5f}), "
            f"dy {dy:+.5f} (combined {cy:.5f})")
    for i in a_only:
        p = A[i]
        say(f"    FIRST ONLY: {p['id']} {p['type']} ({p['series']}) at ({p['x']}, {p['y']}); nearest second: "
            f"{nearest(p, B, sc)}")
    for j in b_only:
        q = B[j]
        say(f"    SECOND ONLY: {q['id']} {q['type']} ({q['series']}) at ({q['x']}, {q['y']}); nearest first: "
            f"{nearest(q, A, sc)}")
    for s in F["a_other"] + F["b_other"]:
        say(f"    not a symbol, one reading only: {s}")
    say()
    summary.append((F["key"], len(A), len(B), len(pairs), n_agree, len(out_err), len(type_dis), len(a_only),
                    len(b_only)))

# ---- RM A51J25 fig. 7: the band's edges ------------------------------------------------------------------------
# W7: band rows at M' 1.20 to 1.50 (top, bottom); its stated err is on the midpoint, "half the band plus 1.5 px of
# calibration", so each edge carries the 1.5 px (3 px more on the top at M' 1.50, its note). Its M' error: the tick
# line's residuals, within 0.0002. Round 11: upper and lower edge per column, +-0.017 in M' and +-0.0034 in p_b/p';
# at M' 1.38 to 1.46 its upper edge is a bound (true edge at or above, hidden under glyphs).
say("=== NACA RM A51J25 fig. 7 below M' 1.5, the band of the faired curve and the PARD circles: edges, W7 against "
    "round 11")
say("  W7 edge error 1.5 px = 0.0023 (4.5 px = 0.0068 on the top at M' 1.498); round 11 +-0.0034; M' errors 0.0002 "
    "(W7) and 0.017 (round 11)")
r11 = rows(R11 + "rma51j25_fig7.csv")
edges = {"upper": [], "lower": []}
for r in r11:
    if r["item"].startswith("band") and "last column" not in r["notes"]:
        side = "upper" if "upper" in r["item"] else "lower"
        edges[side].append((float(r["M_prime"]), float(r["pb_over_pprime"]), "hidden" in r["notes"]))
for k in edges:
    edges[k].sort()


def interp(pts, m):
    for (m0, p0, h0), (m1, p1, h1) in zip(pts, pts[1:]):
        if m0 <= m <= m1:
            t = (m - m0) / (m1 - m0) if m1 > m0 else 0
            return p0 + t * (p1 - p0), h0 or h1
    return None


def range_within(pts, m, dm):
    """Least and greatest of the round 11 edge over M' within m +- dm (linear between its columns)."""
    lo, hi = m - dm, m + dm
    vals = [p for mm, p, h in pts if lo <= mm <= hi]
    for e in (lo, hi):
        v = interp(pts, e)
        if v:
            vals.append(v[0])
    return (min(vals), max(vals)) if vals else None


band_rows = []
for r in w7a51:
    if r["kind"] != "band":
        continue
    m = float(r["mach_prime"])
    for side, key in (("upper", "p_top"), ("lower", "p_bottom")):
        pa = float(r[key])
        ea = 1.5 * A51_PX_P + (3 * A51_PX_P if (side == "upper" and "+-3 px more" in r["note"]) else 0)
        eb = 0.0034
        v = interp(edges[side], m)
        if v is None:
            band_rows.append([m, side, pa, f"{ea:.4f}", "", "", "", "", "", "first reading (W7) only",
                              "round 11 does not read this column (its band ends at M' 1.458; 1.48 and 1.50 not read)"])
            say(f"  M' {m:.3f} {side}: W7 {pa:.4f}; round 11 has no value here (W7 only)")
            continue
        pb, hidden = v
        rng = range_within(edges[side], m, 0.0002 + 0.017)
        strict = abs(pa - pb) <= ea + eb
        shifted = rng[0] - (ea + eb) <= pa <= rng[1] + (ea + eb)
        if strict:
            verdict = "agree at the same M'"
        elif shifted:
            verdict = "outside at the same M'; within errors when M' is moved within its combined error"
        else:
            verdict = "outside errors"
        note = ("round 11's upper edge here is a bound (true edge at or above, hidden under a glyph); "
                f"W7 is {'above' if pa > pb else 'below'} it") if hidden else ""
        band_rows.append([m, side, pa, f"{ea:.4f}", f"{pb:.4f}", f"{eb:.4f}", f"{pa - pb:+.4f}", f"{ea + eb:.4f}",
                          f"{rng[0]:.4f} to {rng[1]:.4f}", verdict, note])
        say(f"  M' {m:.3f} {side}: W7 {pa:.4f} +-{ea:.4f}, round 11 {pb:.4f} +-{eb:.4f} (interpolated), "
            f"difference {pa - pb:+.4f} (combined {ea + eb:.4f}); round 11 over M' +-0.0172: {rng[0]:.4f} to "
            f"{rng[1]:.4f}: {verdict}{'; ' + note if note else ''}")
say("  round 11 only: its first column (M' 1.156, 0.580 to 0.587) and the column at M' 1.18 (0.563 to 0.596), "
    "below W7's first row at M' 1.199")
say("  W7's midpoints (p_mid, +-half band plus calibration) have no counterpart in round 11 and are not paired")
with open(OUT + "a51j25_fig7_band_edges.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["W7_M_prime", "edge", "W7_p", "W7_err", "round11_p_interpolated", "round11_err", "difference",
                "combined_err", "round11_range_over_M_prime_err", "verdict", "note"])
    w.writerows(band_rows)
say()

say("=== Summary (symbols): figure, first, second, matched, agree, outside errors, type disagreements, "
    "first only, second only")
for s in summary:
    say("  " + ", ".join(str(x) for x in s))

text = "\n".join(lines) + "\n"
print(text, end="")
with open(OUT + "pairing_output.txt", "w") as f:
    f.write(text)
