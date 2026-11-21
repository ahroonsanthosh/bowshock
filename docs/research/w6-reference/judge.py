"""
The verdict of W6's independent reference, computed as the registration
(README, "Registration") states it, from the committed records only:

- SU2's runs: runs/<name>/result.json and runs/<name>/L<k>/wall.csv (the
  wall's x, r and Cp on each level, written by w6ref.py);
- the fitted solver's families: fitted/lanes-results.jsonl (W6's lanes,
  copied unchanged from claude/wip/w6-build bf3c739,
  docs/research/w6-build/results/lanes/results.jsonl) and
  fitted/results.jsonl (this route's runs of W6's runners).

  python3 -I docs/research/w6-reference/judge.py <reference dir> [--checks-only]

prints the tables and writes <reference dir>/verdict.json. Nothing here is
tuned to the results: every number below is the registration's.
"""

import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import w6ref  # noqa: E402

R = w6ref.R

# The registration's numbers.
MAX_RELATIVE_U = 5e-3  # R4: U_su2 at most 0.5% of the drag for a reference
CONE_POINTWISE = 1e-3  # R5 V1(a)
STAGNATION = 0.03  # R5 V2
OUTER_CP = 1e-6  # R3
SHOCK_REACH = 0.9  # R3
CEILING = 0.02  # R7: an allowance above 2% of the drag goes to the owner
FITTED_DRAG_FLOOR = 7e-5  # src/analysis/verified-drag.ts
TWO_SCALE_DRAG_FLOOR = 8e-4  # src/analysis/verified-drag.ts
TN3716_MOC = 0.0988034  # docs/design/0006-shock-fitting.md
# R6's departure, if the review accepts it: the nj = 80 fit of this case
# oscillated within this range of drag (W6 README section 4) and is counted
# with the whole range added to its band.
OSCILLATING = {"ogive3rn0.15M1.3": (0.100929446, 0.100929543)}

SHAPES = ("ogive", "vk")


def tag(shape, cal, ratio, M):
    return f"{shape}{cal:g}rn{ratio:g}M{M:g}"


def cases():
    out = []
    for shape in SHAPES:
        for cal in (3, 5):
            for ratio in (0.03, 0.15):
                for M in (1.3, 3):
                    out.append((shape, cal, ratio, M, "corner"))
        for cal, ratio, M in ((5, 0.05, 2), (3, 0.15, 2), (5, 0.05, 1.3), (5, 0.05, 3)):
            out.append((shape, cal, ratio, M, "interior"))
    return out


# ------------------------------------------------------------- SU2's side


def levels_used(run):
    """L1 to L3, or L2 to L4 where the registered fallback ran L4."""
    have = sorted(int(n[1:]) for n in os.listdir(run) if n.startswith("L") and n[1:].isdigit())
    top = 4 if 4 in have and os.path.exists(os.path.join(run, "L4", "wall.csv")) else 3
    return [top - 2, top - 1, top]


def su2_estimate(D, V):
    """R4: the value on the finest level and its uncertainty, from the drags D and the distribution changes V."""
    e12, e23 = D[1] - D[0], D[2] - D[1]
    if e12 * e23 > 0 and abs(e23) < abs(e12):
        p = math.log2(e12 / e23)
        u_total = 1.25 * abs(e23) / (2 ** min(p, 2) - 1)
        kind = f"monotone, order {p:.2f}"
    else:
        p = None
        u_total = 3 * max(abs(e12), abs(e23))
        kind = "not monotone"
    rho = V[1] / V[0] if V[0] > 0 else math.inf
    u_dist = V[1] * max(rho, 0.5) / (1 - max(rho, 0.5)) if rho < 1 else math.inf
    return {"value": D[2], "drags": D, "distChanges": V, "order": p, "kind": kind, "uTotal": u_total,
            "rho": rho, "uDist": u_dist, "u": max(u_total, u_dist)}


def run_record(run):
    with open(os.path.join(run, "result.json")) as f:
        res = json.load(f)
    return res["spec"], {rec["level"]: rec for rec in res["levels"]}


def level_checks(spec, rec, capped):
    """R3's checks on one level, and V2 on a capped nose; the list of failures."""
    bad = []
    if rec.get("exit") != 0 or "drag" not in rec:
        bad.append("SU2 failed")
        return bad
    if not (rec.get("rms[Rho]", 0) <= -11 + 1e-9 and rec.get("Inner_Iter", math.inf) < spec["iters"] - 1):
        bad.append(f"not converged (residual {rec.get('rms[Rho]')}, {rec.get('Inner_Iter')} iterations)")
    if not rec.get("outerMaxAbsCp", math.inf) <= OUTER_CP:
        bad.append(f"|Cp| {rec.get('outerMaxAbsCp'):.1e} on the outer boundary")
    if not rec.get("shockReach", math.inf) <= SHOCK_REACH:
        bad.append(f"the shock reaches {rec.get('shockReach'):.2f} of a line")
    if not rec.get("outletMinMach", 0) > 1:
        bad.append(f"outlet Mach {rec.get('outletMinMach')}")
    return bad


def su2_case(run, x_end=None):
    """A run's value and uncertainty by R4 (to x_end, a vertex of every level used, if given) and its checks."""
    spec, recs = run_record(run)
    used = levels_used(run)
    capped = spec["rn"] > 0
    failures = {}
    for k in used:
        if k not in recs:
            failures[k] = ["not run"]
            continue
        bad = level_checks(spec, recs[k], capped)
        if bad:
            failures[k] = bad
    L = spec["L"] if x_end is None else x_end
    walls = [os.path.join(run, f"L{k}", "wall.csv") for k in used]
    if not all(os.path.exists(w) for w in walls):
        return {"spec": spec, "levels": used, "failures": failures or {"-": ["no wall files"]}}
    D = [w6ref.nose_drag(*w6ref.read_surface(w), L) for w in walls]
    V = [w6ref.dist_change(walls[0], walls[1], L), w6ref.dist_change(walls[1], walls[2], L)]
    est = su2_estimate(D, V)
    out = {"spec": spec, "levels": used, "failures": failures, **est}
    if capped:
        cp0 = recs[used[-1]].get("cpStagnation", math.nan)
        exact = w6ref.pitot_cp(spec["mach"])
        out["stagnation"] = {"cp": cp0, "pitot": exact, "relative": cp0 / exact - 1}
        if not abs(cp0 / exact - 1) <= STAGNATION:
            failures.setdefault(used[-1], []).append(f"V2: stagnation Cp {cp0:.4f} against pitot {exact:.4f}")
    rel = out["u"] / abs(out["value"])
    out["uRelative"] = rel
    out["reference"] = not failures and rel <= MAX_RELATIVE_U and out["rho"] < 1
    return out


# --------------------------------------------------------- the checks


def check_v1(run):
    spec, _ = run_record(run)
    used = levels_used(run)
    L, M = spec["L"], spec["mach"]
    half = math.atan(R / L)
    cp_exact, _ = w6ref.cone_cp(M, half)
    xs, rs, cps = w6ref.read_surface(os.path.join(run, f"L{used[-1]}", "wall.csv"))
    window = [(x, c) for x, c in zip(xs, cps) if L / 3 <= x <= 0.8 * L]
    worst = max(abs(c / cp_exact - 1) for _, c in window)
    # (b) the drag up to the last vertex of the coarsest level used at or ahead of 0.8 L
    x1, r1, _ = w6ref.read_surface(os.path.join(run, f"L{used[0]}", "wall.csv"))
    k = max(i for i in range(len(x1)) if x1[i] <= 0.8 * L)
    x_end, r_end = float(x1[k]), float(r1[k])
    est = su2_case(run, x_end)
    exact = cp_exact * r_end**2 / R**2
    err = est["value"] - exact
    ok_a = worst <= CONE_POINTWISE
    ok_b = abs(err) <= est["u"] and est["uRelative"] <= MAX_RELATIVE_U and not est["failures"]
    return {"name": "V1", "mach": M, "coneCp": cp_exact, "pointwiseWorst": worst, "vertices": len(window),
            "xEnd": x_end, "exact": exact, "error": err, **{k2: est[k2] for k2 in ("value", "u", "uRelative", "uTotal",
            "uDist", "rho", "kind", "drags", "distChanges", "failures")}, "pass": ok_a and ok_b, "passA": ok_a,
            "passB": ok_b}


def check_v3(run):
    est = su2_case(run)
    err = est["value"] - TN3716_MOC
    ok = abs(err) <= est["u"] and est["uRelative"] <= MAX_RELATIVE_U and not est["failures"]
    return {"name": "V3", "exact": TN3716_MOC, "error": err, **{k: est[k] for k in ("value", "u", "uRelative",
            "uTotal", "uDist", "rho", "kind", "drags", "distChanges", "failures")}, "pass": ok}


def check_v2(run):
    est = su2_case(run)
    st = est.get("stagnation", {})
    ok = abs(st.get("relative", math.inf)) <= STAGNATION and not est["failures"]
    return {"name": "V2", "mach": est["spec"]["mach"], **st, "failures": est["failures"], "pass": ok}


# ------------------------------------------------------- the fitted side


def read_jsonl(path):
    with open(path) as f:
        return [json.loads(line) for line in f if line.strip()]


def fitted_families(ref_dir):
    """Per case and grid (nj), the last record; the lanes' first, this route's over them where both exist."""
    fam = {}
    agree = []
    for source in ("lanes-results.jsonl", "results.jsonl"):
        path = os.path.join(ref_dir, "fitted", source)
        if not os.path.exists(path):
            continue
        for r in read_jsonl(path):
            if r.get("kind") != "fit":
                continue
            old = fam.get((r["tag"], r["nj"]))
            if old is not None and old.get("_source") != source:
                agree.append((r["tag"], r["nj"], old["drag"], r["drag"]))
            fam[(r["tag"], r["nj"])] = dict(r, _source=source)
    return fam, agree


def procedure(fam, t, oscillating_accepted):
    """W6 section 3 (analysis/references.mjs there): three grids, order capped at 2."""
    g = [fam.get((t, nj)) for nj in (20, 40, 80)]
    if any(x is None for x in g):
        return {"reference": False, "why": "fewer than three grids"}
    extra = 0.0
    why = []
    for x in g:
        if x.get("caseFailure"):
            why.append(f"nj {x['nj']}: {x['caseFailure']}")
        if not x.get("converged"):
            if t in OSCILLATING and x["nj"] == 80 and oscillating_accepted:
                lo, hi = OSCILLATING[t]
                extra = hi - lo
            else:
                why.append(f"nj {x['nj']} not converged")
    T = [x["drag"] for x in g]
    q = (T[0] - T[1]) / (T[1] - T[2]) if T[1] != T[2] else math.inf
    p = math.log2(q) if q > 0 else math.nan
    if math.isfinite(p) and p <= 0:
        why.append(f"observed order {p:.2f}: not converging")
    pc = min(p, 2) if math.isfinite(p) else 2
    ext = T[2] - (T[1] - T[2]) / (2**pc - 1) if pc > 0 else math.nan
    band = 1.25 * abs(T[1] - T[2]) / (2**pc - 1) + extra if pc > 0 else math.nan
    return {"reference": not why, "why": "; ".join(why), "drags": T, "order": p, "value": ext, "u": band,
            "oscillation": extra}


# --------------------------------------------------------------- verdict


def round_up(a):
    e = math.floor(math.log10(a))
    step = 10 ** (e - 1)
    return math.ceil(a / step - 1e-9) * step


def hull_extent(points):
    """The dimension of the points' affine span (3 for a hull with extent in calibers, r_n/R and Mach)."""
    if len(points) < 2:
        return 0
    import numpy as np

    P = np.array(points, dtype=float)
    P = (P - P.min(axis=0)) / np.where(np.ptp(P, axis=0) > 0, np.ptp(P, axis=0), 1)
    return int(np.linalg.matrix_rank(P[1:] - P[0], tol=1e-9))


def main():
    ref_dir = sys.argv[1]
    runs = os.path.join(ref_dir, "runs")
    checks_only = "--checks-only" in sys.argv
    oscillating_accepted = "--oscillating-accepted" in sys.argv
    verdict = {"checks": [], "cases": [], "oscillatingAccepted": oscillating_accepted}

    for name in sorted(os.listdir(runs)) if os.path.isdir(runs) else []:
        run = os.path.join(runs, name)
        if not os.path.exists(os.path.join(run, "result.json")):
            continue
        if name.startswith("V1-"):
            verdict["checks"].append(dict(check_v1(run), run=name))
        elif name.startswith("V3-"):
            verdict["checks"].append(dict(check_v3(run), run=name))
        elif name.startswith("V2-"):
            verdict["checks"].append(dict(check_v2(run), run=name))
    for c in verdict["checks"]:
        print(json.dumps(c, default=str))
    checks_pass = bool(verdict["checks"]) and all(c["pass"] for c in verdict["checks"])
    names = {c["run"].split("-")[0] for c in verdict["checks"]}
    verdict["checksPass"] = checks_pass and {"V1", "V2", "V3"} <= names
    print("checks:", "PASS" if verdict["checksPass"] else "NOT PASSED")
    if checks_only:
        json.dump(verdict, open(os.path.join(ref_dir, "verdict.json"), "w"), indent=1, default=str)
        return

    fam, agree = fitted_families(ref_dir)
    verdict["refitAgreement"] = [{"tag": t, "nj": nj, "lanes": a, "here": b, "difference": b - a} for t, nj, a, b in agree]
    rows = []
    for shape, cal, ratio, M, where in cases():
        t = tag(shape, cal, ratio, M)
        row = {"tag": t, "shape": shape, "calibers": cal, "ratio": ratio, "mach": M, "where": where}
        run = os.path.join(runs, t)
        row["su2"] = su2_case(run) if os.path.exists(os.path.join(run, "result.json")) else {"reference": False}
        row["su2"].pop("spec", None)
        row["fitted"] = procedure(fam, t, oscillating_accepted)
        both = row["su2"].get("reference") and row["fitted"]["reference"]
        row["both"] = bool(both)
        if both:
            s, f = row["su2"], row["fitted"]
            delta = f["value"] - s["value"]
            row["delta"] = delta
            row["agree"] = abs(delta) <= f["u"] + s["u"]
            row["miss"] = (abs(delta) + s["u"]) / s["value"]
        rows.append(row)
    verdict["cases"] = rows
    misses = [r["miss"] for r in rows if r["both"]]
    if misses:
        A = round_up(2 * max(misses))
        allow = {"ogive": max(A, FITTED_DRAG_FLOOR), "vk": max(A, TWO_SCALE_DRAG_FLOOR)}
        verdict["allowance"] = {"twiceLargestMiss": 2 * max(misses), "rounded": A, **allow}
        for r in rows:
            if r["both"]:
                s, f = r["su2"], r["fitted"]
                half = f["u"] + allow[r["shape"]] * f["value"]
                r["contains"] = f["value"] - half <= s["value"] - s["u"] and s["value"] + s["u"] <= f["value"] + half
        verdict["withinCeiling"] = A <= CEILING
    for shape in SHAPES:
        good = [r for r in rows if r["shape"] == shape and r["both"]]
        corners = [r for r in rows if r["shape"] == shape and r["where"] == "corner"]
        pts = [(r["calibers"], r["ratio"], r["mach"]) for r in good]
        verdict[f"hull_{shape}"] = {
            "cases": [r["tag"] for r in good],
            "allCorners": all(r["both"] for r in corners),
            "extent": hull_extent(pts),
            "serves": hull_extent(pts) == 3,
        }
    for r in rows:
        s, f = r["su2"], r["fitted"]
        line = f"{r['tag']:<18} {r['where']:<8} "
        line += f"SU2 {s['value']:.7f} +-{s['u']:.1e} ({s['uRelative']:.2%}) " if "value" in s else "SU2 -  "
        line += f"fitted {f['value']:.7f} +-{f['u']:.1e} " if f.get("value") is not None and f["reference"] else f"fitted - ({f.get('why')}) "
        if r["both"]:
            line += f"delta {r['delta'] / s['value']:+.3%} {'agree' if r['agree'] else 'DISAGREE'} miss {r['miss']:.2e}"
            if "contains" in r:
                line += "" if r["contains"] else " NOT CONTAINED"
        elif "value" in s and not s.get("reference"):
            line += f"SU2 not a reference: {s.get('failures')} rho {s.get('rho'):.2f}"
        print(line)
    for k in ("allowance", "withinCeiling", "hull_ogive", "hull_vk"):
        if k in verdict:
            print(k, json.dumps(verdict[k]))
    json.dump(verdict, open(os.path.join(ref_dir, "verdict.json"), "w"), indent=1, default=str)


if __name__ == "__main__":
    main()
