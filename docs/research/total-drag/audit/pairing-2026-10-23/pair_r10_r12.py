"""Neutral pairing of the two blind readings of R&M 3427 figs. 9 and 10: round 10 (A) against round 12 (B).

Usage (from the repository root): python3 -I docs/research/total-drag/audit/pairing-2026-10-23/pair_r10_r12.py

Reads only the committed readings:
  A, round 10: docs/research/total-drag/audit/round10/readings/rm3427_fig9.csv, rm3427_fig10.csv
  B, round 12: docs/research/total-drag/audit/round12/readings/rm3427-fig9-points.csv, rm3427-fig9-powerlaw-line.csv,
               rm3427-fig9-summary.json, rm3427-fig10-points.csv, rm3427-fig10-flatplate-lines.csv
W7's first reading of these figures is not read here (not shown to be blind; not part of this pairing).
Writes, next to this script: pairs_rm3427_fig9.csv, pairs_rm3427_fig10.csv, line_rm3427_fig9_powerlaw.csv,
line_rm3427_fig10_flatplate.csv, line_ends.csv and pairing_output.txt (what is printed).

Symbols (as the 2026-10-22 pairing, pairing-2026-10-22/pair_figures.py):
  * Matched by position: centres within GATE_PX page pixels (6 px; the glyphs are 13 to 14 px across), the pixel
    converted to data units by the figure's scale. Same-type pairs first, nearest first; the rest matched across
    types, nearest first. Each symbol used once. Matching does not use the errors.
  * A same-type pair agrees when on each axis |A - B| <= e_A + e_B.
  * Reported, never resolved toward either reading: pairs outside errors, type disagreements, one-reading symbols.

Errors. Round 10 states its errors as about 2 sigma; round 12 states 1 sigma per value. Two tests are shown:
  (1) "as stated": e_A + e_B with each reading's number as written (mixes 2 sigma and 1 sigma; the looser
      reading's error dominates);
  (2) "common 2 sigma": e_A + 2 e_B, round 12's 1 sigma doubled so that both are about 2 sigma.
  No error is otherwise rescaled. Neither test is preferred here; both verdicts are written.

Lines:
  * Fig. 9, the "1/7 th power law" line. Round 10 gives u* at fixed y (every 0.005 in. where readable) with errors;
    round 12 gives a thinned centreline trace (u*, y) with no per-value error. Compared two ways:
      (a) u* at round 10's y: round 12's trace sorted by y, duplicate y averaged, linearly interpolated; the y gap
          of the round 12 trace around each point is reported (interpolation across a gap is flagged). Round 12's
          error for this comparison is NOT stated by round 12; the pairer takes it as round 12's own symbol rule
          (1 px centring with its stated calibration error: 0.0025 in u*, 0.00032 in. in y) with the y error
          carried through the local slope of round 12's trace: e_B = sqrt(0.0025^2 + (du/dy x 0.00032)^2). This is
          the pairer's construction, labelled as such.
      (b) page-pixel distance from each round 10 point to the nearest round 12 trace sample (no error involved).
    Power-law check: the same model as round 12, u* = min(1, (y/delta)^n), fitted by grid search minimising the
    unweighted rms u* residual, (i) n forced to 1/7 and (ii) n free; applied to round 10's line points (with and
    without its lower line end) and, as a check of the fit code, to round 12's committed thinned trace.
  * Fig. 10, the two dashed flat-plate lines. Both readings give delta/h on the same grid M = 0.20, 0.25, ...,
    1.15 (round 10 from its track fit, round 12 from its smoothed quartic); compared at equal M with both error
    tests. Round 12's dash centres are also compared with round 10's line linearly interpolated at the dash's M.
  * Line ends (fig. 9 both ends; fig. 10 four ends) compared in page pixels against the stated end errors; where
    round 12 states no end error, the pairer uses round 12's own per-value numbers, labelled.
"""
import csv
import json
import math

ROOT = "docs/research/total-drag/audit/"
R10 = ROOT + "round10/readings/"
R12 = ROOT + "round12/readings/"
OUT = ROOT + "pairing-2026-10-23/"
GATE_PX = 6.0
TYPES = {"circ": "circle", "circle": "circle", "sq": "square", "square": "square"}
SCALE = {"fig9": (0.00199, 0.000252), "fig10": (0.00199, 0.000503)}  # data units per page pixel (both readings agree)

lines = []


def say(s=""):
    lines.append(s)


def rows(path):
    with open(path, newline="") as f:
        return list(csv.DictReader(l for l in f if not l.startswith("#")))


def sym(rid, typ, series, x, ex, y, ey):
    return {"id": rid, "type": TYPES[typ], "series": series, "x": float(x), "ex": float(ex), "y": float(y),
            "ey": float(ey)}


def px_dist(p, q, sc):
    return math.hypot((p["x"] - q["x"]) / sc[0], (p["y"] - q["y"]) / sc[1])


def match(A, B, sc):
    pairs, ua, ub = [], set(), set()
    cands = sorted((px_dist(p, q, sc), i, j) for i, p in enumerate(A) for j, q in enumerate(B)
                   if px_dist(p, q, sc) <= GATE_PX)
    for same in (True, False):
        for d, i, j in cands:
            if i in ua or j in ub or (same and A[i]["type"] != B[j]["type"]):
                continue
            pairs.append((i, j, d))
            ua.add(i)
            ub.add(j)
    return pairs, [i for i in range(len(A)) if i not in ua], [j for j in range(len(B)) if j not in ub]


def nearest(p, others, sc):
    if not others:
        return "none"
    q = min(others, key=lambda q: px_dist(p, q, sc))
    return f"{q['id']} ({q['type']}, {q['series']}) at {px_dist(p, q, sc):.1f} px"


def verdict(p, q, kB):
    dx, dy = p["x"] - q["x"], p["y"] - q["y"]
    cx, cy = p["ex"] + kB * q["ex"], p["ey"] + kB * q["ey"]
    inside = abs(dx) <= cx + 1e-12 and abs(dy) <= cy + 1e-12
    if p["type"] != q["type"]:
        return "type disagreement" + (" (values within errors)" if inside else " (values outside errors too)"), cx, cy
    return ("agree" if inside else "outside errors"), cx, cy


FIELDS = ["figure", "verdict_as_stated", "verdict_common_2sigma", "A_id", "A_type", "A_series", "A_x", "A_x_err",
          "A_y", "A_y_err", "B_id", "B_type", "B_series", "B_x", "B_x_err_1sigma", "B_y", "B_y_err_1sigma",
          "dx_A_minus_B", "dy_A_minus_B", "comb_x_as_stated", "comb_y_as_stated", "comb_x_2sigma", "comb_y_2sigma",
          "ratio_x_2sigma", "ratio_y_2sigma", "distance_px", "note"]


def pair_symbols(key, title, axes, A, B):
    sc = SCALE[key]
    pairs, a_only, b_only = match(A, B, sc)
    table, counts = [], {}
    issues = {1: [], 2: []}
    for i, j, d in sorted(pairs, key=lambda t: (A[t[0]]["series"], A[t[0]]["y"], A[t[0]]["x"])):
        p, q = A[i], B[j]
        v1, c1x, c1y = verdict(p, q, 1)
        v2, c2x, c2y = verdict(p, q, 2)
        counts[(1, v1)] = counts.get((1, v1), 0) + 1
        counts[(2, v2)] = counts.get((2, v2), 0) + 1
        dx, dy = p["x"] - q["x"], p["y"] - q["y"]
        for k, v, cx, cy in ((1, v1, c1x, c1y), (2, v2, c2x, c2y)):
            if v != "agree":
                issues[k].append(f"{v}: A {p['id']} {p['type']} ({p['x']}, {p['y']}) / B {q['id']} {q['type']} "
                                 f"({q['x']}, {q['y']}); dx {dx:+.5f} (combined {cx:.5f}), dy {dy:+.5f} "
                                 f"(combined {cy:.5f})")
        table.append([key, v1, v2, p["id"], p["type"], p["series"], p["x"], p["ex"], p["y"], p["ey"], q["id"],
                      q["type"], q["series"], q["x"], q["ex"], q["y"], q["ey"], f"{dx:+.5f}", f"{dy:+.5f}",
                      f"{c1x:.5f}", f"{c1y:.5f}", f"{c2x:.5f}", f"{c2y:.5f}", f"{abs(dx) / c2x:.2f}",
                      f"{abs(dy) / c2y:.2f}", f"{d:.1f}", ""])
    for i in a_only:
        p = A[i]
        table.append([key, "round 10 only", "round 10 only", p["id"], p["type"], p["series"], p["x"], p["ex"], p["y"],
                      p["ey"]] + [""] * 16 + ["nearest in round 12: " + nearest(p, B, sc)])
    for j in b_only:
        q = B[j]
        table.append([key, "round 12 only", "round 12 only"] + [""] * 7 +
                     [q["id"], q["type"], q["series"], q["x"], q["ex"], q["y"], q["ey"]] + [""] * 9 +
                     ["nearest in round 10: " + nearest(q, A, sc)])
    with open(OUT + f"pairs_rm3427_{key}.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(FIELDS)
        w.writerows(table)

    def tally(S):
        t = {}
        for s in S:
            t[s["type"]] = t.get(s["type"], 0) + 1
        return ", ".join(f"{n} {k}" for k, n in t.items())

    say(f"=== {title}: symbols")
    say(f"  axes x = {axes[0]}, y = {axes[1]}; 1 px = {sc[0]} and {sc[1]}; gate {GATE_PX:.0f} px")
    say(f"  round 10: {len(A)} ({tally(A)}); round 12: {len(B)} ({tally(B)})")
    say(f"  matched pairs {len(pairs)}; round 10 only {len(a_only)}; round 12 only {len(b_only)}; "
        f"type disagreements {sum(1 for i, j, d in pairs if A[i]['type'] != B[j]['type'])}")
    say(f"  largest pair distance {max(d for i, j, d in pairs):.1f} px")
    for k, name in ((1, "as stated (e10 + e12)"), (2, "common 2 sigma (e10 + 2 x e12)")):
        ag = counts.get((k, "agree"), 0)
        oe = counts.get((k, "outside errors"), 0)
        say(f"  test {name}: same type and within errors {ag}; outside errors {oe}")
        rx = max(abs(A[i]["x"] - B[j]["x"]) / (A[i]["ex"] + k * B[j]["ex"]) for i, j, d in pairs)
        ry = max(abs(A[i]["y"] - B[j]["y"]) / (A[i]["ey"] + k * B[j]["ey"]) for i, j, d in pairs)
        say(f"    largest |difference| / combined error: x {rx:.2f}, y {ry:.2f}")
        for s in issues[k]:
            say(f"    {s}")
    for i in a_only:
        say(f"    ROUND 10 ONLY: {A[i]['id']} {A[i]['type']} at ({A[i]['x']}, {A[i]['y']}); nearest round 12: "
            f"{nearest(A[i], B, sc)}")
    for j in b_only:
        say(f"    ROUND 12 ONLY: {B[j]['id']} {B[j]['type']} at ({B[j]['x']}, {B[j]['y']}); nearest round 10: "
            f"{nearest(B[j], A, sc)}")
    say()
    return {"n10": len(A), "n12": len(B), "matched": len(pairs), "a_only": len(a_only), "b_only": len(b_only),
            "agree1": counts.get((1, "agree"), 0), "agree2": counts.get((2, "agree"), 0),
            "type": sum(1 for i, j, d in pairs if A[i]["type"] != B[j]["type"])}


# ---- fig. 9 symbols -------------------------------------------------------------------------------------------
r10f9 = rows(R10 + "rm3427_fig9.csv")
A9 = [sym(r["id"], r["symbol"], r["series"], r["u_star"], r["u_star_err"], r["y_in"], r["y_in_err"])
      for r in r10f9 if r["item"] == "symbol"]
B9 = [sym("r12-" + r["id"], r["symbol"], r["station"], r["u_star"], r["u_star_err"], r["y_in"], r["y_in_err"])
      for r in rows(R12 + "rm3427-fig9-points.csv")]
s9 = pair_symbols("fig9", "R&M 3427 fig. 9 (u*, y in.), round 10 against round 12", ("u*", "y_in"), A9, B9)

# ---- fig. 10 symbols ------------------------------------------------------------------------------------------
r10f10 = rows(R10 + "rm3427_fig10.csv")
A10 = [sym(r["id"], r["symbol"], r["series"], r["M_inf"], r["M_inf_err"], r["delta_over_h"], r["delta_over_h_err"])
       for r in r10f10 if r["item"] == "symbol"]
B10 = [sym("r12-" + r["id"], r["symbol"], r["station"], r["M_inf"], r["M_inf_err"], r["delta_over_h"],
           r["delta_over_h_err"]) for r in rows(R12 + "rm3427-fig10-points.csv")]
s10 = pair_symbols("fig10", "R&M 3427 fig. 10 (M_inf, delta/h), round 10 against round 12", ("M_inf", "delta_over_h"),
                   A10, B10)

# ---- fig. 9: the 1/7 power-law line ---------------------------------------------------------------------------
sc9 = SCALE["fig9"]
A_line = [(float(r["y_in"]), float(r["u_star"]), float(r["u_star_err"])) for r in r10f9
          if r["item"].startswith("curve")]
A_ends = [r for r in r10f9 if r["item"] == "line end"]
B_raw = [(float(r["y_in"]), float(r["u_star"])) for r in rows(R12 + "rm3427-fig9-powerlaw-line.csv")]
by_y = {}
for y, u in B_raw:
    by_y.setdefault(round(y, 6), []).append(u)
B_tr = sorted((y, sum(us) / len(us)) for y, us in by_y.items())
EU12, EY12 = math.hypot(0.00199, 0.0016), math.hypot(0.000252, 0.00019)  # pairer's construction (see docstring)


def interp_trace(tr, y):
    for (y0, u0), (y1, u1) in zip(tr, tr[1:]):
        if y0 <= y <= y1:
            t = (y - y0) / (y1 - y0) if y1 > y0 else 0.0
            slope = (u1 - u0) / (y1 - y0) if y1 > y0 else 0.0
            return u0 + t * (u1 - u0), slope, (y1 - y0) / sc9[1], y0, y1
    return None


say("=== R&M 3427 fig. 9: the line labelled \"1/7 th power law\", round 10 against round 12")
say(f"  round 10: {len(A_line)} values of u* at fixed y (about 2 sigma errors); round 12: {len(B_raw)} committed trace "
    f"samples ({len(B_tr)} distinct y), no per-value error stated")
say(f"  round 12 error used for this comparison (pairer's construction, not stated by round 12): "
    f"sqrt({EU12:.4f}^2 + (du/dy x {EY12:.5f})^2) in u*, du/dy from round 12's trace")
lrows = []
n_in = {1: 0, 2: 0}
for y, ua, ea in A_line:
    res = interp_trace(B_tr, y)
    near = min(B_raw, key=lambda t: math.hypot((t[1] - ua) / sc9[0], (t[0] - y) / sc9[1]))
    dpx = math.hypot((near[1] - ua) / sc9[0], (near[0] - y) / sc9[1])
    if res is None:
        say(f"  y {y:.3f}: round 10 u* {ua:.4f}; outside round 12's trace")
        continue
    ub, slope, gap_px, y0, y1 = res
    eb = math.hypot(EU12, slope * EY12)
    d = ua - ub
    v1 = "agree" if abs(d) <= ea + eb else "outside errors"
    v2 = "agree" if abs(d) <= ea + 2 * eb else "outside errors"
    n_in[1] += v1 == "agree"
    n_in[2] += v2 == "agree"
    flag = f"interpolated across a {gap_px:.0f} px gap in round 12's trace (y {y0:.5f} to {y1:.5f})" \
        if gap_px > 8 else ""
    lrows.append([f"{y:.3f}", f"{ua:.4f}", f"{ea:.4f}", f"{ub:.4f}", f"{eb:.4f}", f"{d:+.4f}", f"{ea + eb:.4f}",
                  f"{ea + 2 * eb:.4f}", v1, v2, f"{gap_px:.1f}", f"{dpx:.1f}", flag])
    say(f"  y {y:.3f}: round 10 u* {ua:.4f} +-{ea:.4f}; round 12 {ub:.4f} +-{eb:.4f} (1 sigma, pairer's); "
        f"difference {d:+.4f}; as stated {v1} (comb {ea + eb:.4f}), common 2 sigma {v2} (comb {ea + 2 * eb:.4f}); "
        f"nearest round 12 sample {dpx:.1f} px{'; ' + flag if flag else ''}")
say(f"  within errors: as stated {n_in[1]} of {len(lrows)}; common 2 sigma {n_in[2]} of {len(lrows)}")
dpxs = [float(r[11]) for r in lrows]
say(f"  page distance from each round 10 line point to the nearest round 12 trace sample: median "
    f"{sorted(dpxs)[len(dpxs) // 2]:.1f} px, largest {max(dpxs):.1f} px (round 12's thinned trace samples are 3 px "
    f"apart where it is dense)")
with open(OUT + "line_rm3427_fig9_powerlaw.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["y_in", "r10_u_star", "r10_err_2sigma", "r12_u_star_interp", "r12_err_1sigma_pairer", "diff_r10_minus_r12",
                "comb_as_stated", "comb_2sigma", "verdict_as_stated", "verdict_common_2sigma", "r12_trace_gap_px",
                "dist_to_nearest_r12_sample_px", "note"])
    w.writerows(lrows)

# Power-law fits, same model as round 12
def fit(pts, n_fixed=None):
    best = None
    ns = [n_fixed] if n_fixed else [0.08 + 0.0005 * k for k in range(441)]
    for n in ns:
        for kd in range(241):
            dl = 0.03 + 0.0005 * kd
            r = [u - min(1.0, (y / dl) ** n) for y, u in pts]
            rms = math.sqrt(sum(e * e for e in r) / len(r))
            if best is None or rms < best[0]:
                best = (rms, n, dl, r)
    return best


js = json.load(open(R12 + "rm3427-fig9-summary.json"))["powerlaw"]
say()
say("  power-law check: model u* = min(1, (y/delta)^n), grid search (n step 0.0005, delta step 0.0005 in.), "
    "unweighted rms u*")
lo = [r for r in A_ends if "lower" in r["notes"]][0]
sets = [("round 10 line points (11)", [(y, u) for y, u, e in A_line]),
        ("round 10 line points plus its lower line end (0.0007 in., 0.47)",
         [(y, u) for y, u, e in A_line] + [(float(lo["y_in"]), float(lo["u_star"]))]),
        ("round 10 line points below y 0.05 in. only (6; the near-wall part)", [(y, u) for y, u, e in A_line if y < 0.05]),
        (f"round 12 committed thinned trace ({len(B_raw)} rows; fit-code check)", [(y, u) for y, u in B_raw if y > 0]),
        ("round 12's trace interpolated at round 10's 11 y values (sampling check: same y as round 10, round 12's u*)",
         [(y, interp_trace(B_tr, y)[0]) for y, u, e in A_line])]
fitrows = []
for name, pts in sets:
    f7 = fit(pts, 1 / 7)
    ff = fit(pts)
    say(f"  {name}: n = 1/7 forced: delta {f7[2]:.4f} in., rms {f7[0]:.4f}, residuals "
        f"{' '.join(f'{e:+.3f}' for e in f7[3])}")
    say(f"      n free: n {ff[1]:.4f} (1/n {1 / ff[1]:.2f}), delta {ff[2]:.4f} in., rms {ff[0]:.4f}")
    fitrows.append((name, f7, ff))
    if name.startswith("round 10 line points (11)"):
        out = [(y, e, r) for (y, u, e), r in zip(A_line, f7[3]) if abs(r) > e]
        say(f"      forced 1/7 residual larger than round 10's own stated error (about 2 sigma) at {len(out)} of "
            f"{len(A_line)} points: " + "; ".join(f"y {y:.3f} residual {r:+.4f} vs +-{e:.4f}" for y, e, r in out))
say(f"  round 12's own figures (summary.json): forced 1/7 delta {js['delta_in_fit']:.3f} in., rms "
    f"{js['rms_u_residual']:.4f}; free n {js['joint_fit_n']:.4f}, delta {js['joint_fit_delta']:.4f}, rms "
    f"{js['joint_fit_rms_u']:.4f} (its json also lists 'free_exponent' {js['free_exponent']:.4f}: in its read9.py a "
    f"straight-line fit of log u* on log y over trace samples with u* < 0.99; its method.md quotes 0.1725)")


def loglog_slope(pts):
    xs = [math.log(y) for y, u in pts if u < 0.99 and y > 0]
    ys = [math.log(u) for y, u in pts if u < 0.99 and y > 0]
    mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
    return sum((a - mx) * (b - my) for a, b in zip(xs, ys)) / sum((a - mx) ** 2 for a in xs), len(xs)


for name, pts in (("round 10 line points", [(y, u) for y, u, e in A_line]),
                  ("round 10 line points plus its lower end", [(y, u) for y, u, e in A_line] +
                   [(float(lo["y_in"]), float(lo["u_star"]))]),
                  ("round 12 committed trace", [(y, u) for y, u in B_raw if y > 0])):
    n_ll, k = loglog_slope(pts)
    say(f"  log-log straight-line slope (round 12's 'free_exponent' recipe, u* < 0.99), {name}: n {n_ll:.4f} "
        f"from {k} points")
say()

# ---- fig. 10: the two flat-plate lines -------------------------------------------------------------------------
say("=== R&M 3427 fig. 10: the two dashed flat-plate lines, round 10 against round 12")
LNAME = {"turbulent": "turbulent from leading edge", "laminar": "laminar"}
r12l = rows(R12 + "rm3427-fig10-flatplate-lines.csv")
frows = []
for k10, k12 in LNAME.items():
    A = {round(float(r["M_inf"]), 3): (float(r["delta_over_h"]), float(r["delta_over_h_err"])) for r in r10f10
         if r["item"] == "curve" and r["id"] == k10}
    B = {round(float(r["M_inf"]), 3): (float(r["delta_over_h"]), float(r["delta_over_h_err"])) for r in r12l
         if r["line"] == k12 and r["kind"].startswith("smoothed")}
    ms = sorted(set(A) & set(B))
    c = {1: 0, 2: 0}
    worst = (0, None)
    for m in ms:
        (a, ea), (b, eb) = A[m], B[m]
        d = a - b
        v1 = "agree" if abs(d) <= ea + eb + 1e-12 else "outside errors"
        v2 = "agree" if abs(d) <= ea + 2 * eb + 1e-12 else "outside errors"
        c[1] += v1 == "agree"
        c[2] += v2 == "agree"
        if abs(d) > abs(worst[0]):
            worst = (d, m)
        frows.append([k10, "smoothed grid", f"{m:.2f}", f"{a:.5f}", f"{ea:.5f}", f"{b:.4f}", f"{eb:.4f}", f"{d:+.5f}",
                      f"{ea + eb:.5f}", f"{ea + 2 * eb:.5f}", v1, v2])
    say(f"  {k10}: {len(ms)} common M values ({ms[0]:.2f} to {ms[-1]:.2f}); round 10 only "
        f"{sorted(set(A) - set(B))}; round 12 only {sorted(set(B) - set(A))}")
    say(f"    within errors: as stated {c[1]} of {len(ms)}; common 2 sigma {c[2]} of {len(ms)}; largest |difference| "
        f"{abs(worst[0]):.5f} at M {worst[1]:.2f} ({worst[0]:+.5f}, round 10 minus round 12); mean difference "
        f"{sum(A[m][0] - B[m][0] for m in ms) / len(ms):+.5f}")
    for r in frows:
        if r[0] == k10 and r[1] == "smoothed grid" and (r[10] != "agree" or r[11] != "agree"):
            say(f"    M {r[2]}: round 10 {r[3]} +-{r[4]}, round 12 {r[5]} +-{r[6]}, difference {r[7]}: as stated "
                f"{r[10]}, common 2 sigma {r[11]}")
    # dash centres against round 10's line, interpolated
    pts = sorted((m, v[0], v[1]) for m, v in A.items())
    dd = []
    for r in r12l:
        if r["line"] != k12 or r["kind"] != "dash centre":
            continue
        m, b = float(r["M_inf"]), float(r["delta_over_h"])
        for (m0, a0, e0), (m1, a1, e1) in zip(pts, pts[1:]):
            if m0 <= m <= m1:
                t = (m - m0) / (m1 - m0)
                a, ea = a0 + t * (a1 - a0), max(e0, e1)
                d = a - b
                dd.append(d)
                frows.append([k10, "round 12 dash centre", f"{m:.4f}", f"{a:.5f}", f"{ea:.5f}", f"{b:.4f}", "0.0007",
                              f"{d:+.5f}", f"{ea + 0.0007:.5f}", f"{ea + 0.0014:.5f}",
                              "agree" if abs(d) <= ea + 0.0007 else "outside errors",
                              "agree" if abs(d) <= ea + 0.0014 else "outside errors"])
                break
    say(f"    round 12's dash centres inside round 10's M range: {len(dd)}; round 10 (interpolated) minus round 12: "
        f"mean {sum(dd) / len(dd):+.5f}, largest |difference| {max(abs(x) for x in dd):.5f} "
        f"({max(abs(x) for x in dd) / SCALE['fig10'][1]:.1f} px)")
with open(OUT + "line_rm3427_fig10_flatplate.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["line", "comparison", "M_inf", "r10_delta_over_h", "r10_err_2sigma", "r12_delta_over_h",
                "r12_err_1sigma", "diff_r10_minus_r12", "comb_as_stated", "comb_2sigma", "verdict_as_stated",
                "verdict_common_2sigma"])
    w.writerows(frows)
say()

# ---- line ends ------------------------------------------------------------------------------------------------
say("=== Line ends (page pixels; the end of a line is a judgement, so ends are compared, not paired as symbols)")
erows = []


def end_cmp(fig, name, a, ea_px, b, eb_px, note):
    sc = SCALE[fig]
    dxp, dyp = (a[0] - b[0]) / sc[0], (a[1] - b[1]) / sc[1]
    v1 = "agree" if abs(dxp) <= ea_px[0] + eb_px[0] and abs(dyp) <= ea_px[1] + eb_px[1] else "outside errors"
    v2 = "agree" if abs(dxp) <= ea_px[0] + 2 * eb_px[0] and abs(dyp) <= ea_px[1] + 2 * eb_px[1] else "outside errors"
    erows.append([fig, name, a[0], a[1], f"{ea_px[0]:.1f}", f"{ea_px[1]:.1f}", b[0], b[1], f"{eb_px[0]:.1f}",
                  f"{eb_px[1]:.1f}", f"{dxp:+.1f}", f"{dyp:+.1f}", v1, v2, note])
    say(f"  {fig} {name}: round 10 ({a[0]}, {a[1]}), round 12 ({b[0]:.4f}, {b[1]:.4f}); difference {dxp:+.1f} px "
        f"in x, {dyp:+.1f} px in y; errors px round 10 ({ea_px[0]:.1f}, {ea_px[1]:.1f}), round 12 ({eb_px[0]:.1f}, "
        f"{eb_px[1]:.1f}): as stated {v1}, common 2 sigma {v2}{'; ' + note if note else ''}")


up = [r for r in A_ends if "upper" in r["notes"]][0]
e12_9 = (EU12 / sc9[0], EY12 / sc9[1])
end_cmp("fig9", "lower end (meets the x axis)", (float(lo["u_star"]), float(lo["y_in"])),
        (float(lo["u_star_err"]) / sc9[0], float(lo["y_in_err"]) / sc9[1]),
        (js["axis_end"]["u"], js["axis_end"]["y"]), e12_9,
        "round 12 states no end error (pairer uses its 1 px plus calibration); both say the line merges with the axis "
        "there")
end_cmp("fig9", "upper end", (float(up["u_star"]), float(up["y_in"])),
        (float(up["u_star_err"]) / sc9[0], float(up["y_in_err"]) / sc9[1]),
        (js["top_end"]["u"], js["top_end"]["y"]), e12_9, "round 12 states no end error (pairer's, as above)")
for k10, k12 in LNAME.items():
    for side10, side12 in (("curve start", "drawn left end"), ("curve end", "drawn right end")):
        a = [r for r in r10f10 if r["item"] == side10 and r["id"] == k10][0]
        b = [r for r in r12l if r["line"] == k12 and r["kind"] == side12][0]
        end_cmp("fig10", f"{k10} {side12.replace('drawn ', '')}", (float(a["M_inf"]), float(a["delta_over_h"])),
                (5.0, 5.0), (float(b["M_inf"]), float(b["delta_over_h"])),
                (0.0028 / SCALE["fig10"][0], 0.0007 / SCALE["fig10"][1]),
                "round 10: 5 px each axis, 'where the tracked line ends'; round 12: 0.0007 in delta/h stated, M error "
                "not stated for ends (pairer uses its symbol M error 0.0028)")
with open(OUT + "line_ends.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["figure", "end", "r10_x", "r10_y", "r10_err_x_px", "r10_err_y_px", "r12_x", "r12_y",
                "r12_err_x_px", "r12_err_y_px", "dx_px_r10_minus_r12", "dy_px_r10_minus_r12", "verdict_as_stated",
                "verdict_common_2sigma", "note"])
    w.writerows(erows)
say()

say("=== Summary (symbols): figure, round 10, round 12, matched, type disagreements, within errors as stated, "
    "within errors common 2 sigma, round 10 only, round 12 only")
for k, s in (("fig9", s9), ("fig10", s10)):
    say(f"  rm3427_{k}, {s['n10']}, {s['n12']}, {s['matched']}, {s['type']}, {s['agree1']}, {s['agree2']}, "
        f"{s['a_only']}, {s['b_only']}")

say()
say("=== Blindness (checked by the pairer on 2026-10-23; recorded here as text, not recomputed)")
say("  round 10: figs. 9 and 10 committed in 5c7c746 (2026-10-22 09:21 UTC); its method.md says it did not open W7's")
say("    readings or scripts (w7-fins worktree, audit/w7-fins/, w7scripts/, w7img/, w7-review/). Round 12 was committed")
say("    13.5 hours later (9882f87 22:58 UTC, 84b0cc6 23:01 UTC) and no round 10 fig. 9 or 10 file changed after")
say("    5c7c746, so round 10 could not have seen round 12. Verdict: blind to round 12 (and, by its statement, to W7).")
say("  round 12: its method.md lists what it opened; it names audit/round10/, round11/, pairing-*/ and w7-fins/ as not")
say("    opened. Its scripts and readings contain no path or name of round 10, 11, the pairings or W7 (searched).")
say("    status/round10-reader.md on origin/claude/wip/handoff (68958d3) has 50 lines and three headings: the title,")
say("    'The fig. 30 against table 3 observation (for the pairing, not yet shown to W7)', 'Uncertain calls (full list")
say("    in round10/method.md)'; none carries a fig. 9 or 10 value. Verdict: blind to round 10 on the evidence available")
say("    (its own statement plus these checks; what an agent read cannot be proved from the repository alone).")
say("  W7's first reading of these figures is marked not shown to be blind and is not part of this pairing.")

text = "\n".join(lines) + "\n"
print(text, end="")
with open(OUT + "pairing_output.txt", "w") as f:
    f.write(text)
