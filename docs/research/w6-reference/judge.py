"""
The verdict of W6's independent reference, computed as the registration
(README, "Registration", with the review's changes) states it, from the
committed records only:

- SU2's runs: runs/<name>/result.json and runs/<name>/L<k>/wall.csv (the
  wall's x, r and Cp on each level, written by w6ref.py);
- the fitted solver's families: fitted/lanes-results.jsonl (W6's lanes,
  copied unchanged from claude/wip/w6-build bf3c739,
  docs/research/w6-build/results/lanes/results.jsonl) and
  fitted/results.jsonl (this route's runs of W6's runners).

  python3 -I docs/research/w6-reference/judge.py <reference dir> [--checks-only]

prints the tables and writes <reference dir>/verdict.json. Every number and
decision below is the registration's; nothing is a run-time choice.
"""

import json
import math
import os
import sys
from itertools import combinations

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import w6ref  # noqa: E402

R = w6ref.R

# ---------------------------------------------------- the registration's numbers
GRID_LIMIT = 5e-3  # R4: max(U_total, U_dist) at most 0.5% of the drag
TOTAL_LIMIT = 1e-2  # R4: U_su2, the cap term included, at most 1%
CONE_POINTWISE = 1e-3  # R5 V1(a)
STAGNATION = 0.03  # R5 V2
OUTER_CP = 1e-6  # R3
SHOCK_REACH = 0.9  # R3
SU2_FORCE = 5e-3  # R3: the tool's drag within 0.5% of SU2's own force on level 1, a quarter of that per level after
ITERATIVE = 1e-3  # R3: a level stopped at its limit counts if its drag's range over its last quarter is at most 0.1%
DRIFT = 0.25  # R3: ... and the means of its last two eighths differ by at most a quarter of that range
CEILING = 0.02  # R7
REFIT = 1e-9  # R6: a refit of a lane's grid within 1e-9 of its drag (the fits' settling tolerance)
VENKAT_ALLOWED = (0.05,)  # R3: one coefficient; no reruns with another (the re-review's change 5)
WIDEN_ALLOWED = (0, 1, 2)  # R3
FITTED_DRAG_FLOOR = 7e-5  # src/analysis/verified-drag.ts
TWO_SCALE_DRAG_FLOOR = 8e-4  # src/analysis/verified-drag.ts
TN3716_MOC = 0.0988034  # docs/design/0006-shock-fitting.md
# V5: the hemisphere-cylinder's forebody drag fitted by bowshock's solver
# (0006, "Hemisphere-cylinder"): value and its band, relative. Blocking only.
HEMISPHERE = {2.0: (0.788934, 2.3e-4), 3.0: (0.849320, 1.0e-4)}
# R6's departure, accepted by the review on conditions: this lane record's
# nj = 80 fit oscillated within this range of drag (W6 README section 4);
# it is counted, with the whole range added to its band and to its miss.
OSCILLATING = {"ogive3rn0.15M1.3": (0.100929446, 0.100929543)}
# The check runs, all required (R5).
CHECK_RUNS = ("V1-cone3M1.3", "V1-cone3M3", "V2-ogive4rn0.08M1.3", "V2-ogive4rn0.08M2", "V2-ogive4rn0.08M3",
              "V3-ogive3M1.98", "V5-hemisphereM2", "V5-hemisphereM3")
LEVEL4_TEST = ("V2-ogive4rn0.08M1.3", "V2-ogive4rn0.08M2")  # R5 V4: these also run level 4
# The hold-out (R7): off W6's list, SU2 from the V2 runs and one more.
HOLDOUT = (("ogive", 4, 0.08, 1.3, "V2-ogive4rn0.08M1.3"), ("ogive", 4, 0.08, 2, "V2-ogive4rn0.08M2"),
           ("ogive", 4, 0.08, 3, "V2-ogive4rn0.08M3"), ("vk", 4, 0.08, 1.3, "H-vk4rn0.08M1.3"),
           ("vk", 4, 0.08, 2, "H-vk4rn0.08M2"))
BOX = {"calibers": (3, 5), "ratio": (0.03, 0.15), "mach": (1.3, 3)}

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


def registered(name, shape=None, cal=None, ratio=None, M=None):
    """The registered spec builder for a run's name (or a W6 case), as a function of widen."""
    if shape is not None:
        return lambda w: w6ref.capped_spec(shape, cal, ratio, M, w)
    mach = float(name.rsplit("M", 1)[1])
    if name.startswith("V1-"):
        return lambda w: w6ref.sharp_spec("cone", 3, mach, w)
    if name.startswith("V3-"):
        return lambda w: w6ref.sharp_spec("ogive", 3, mach, w)
    if name.startswith("V2-"):
        return lambda w: w6ref.capped_spec("ogive", 4, 0.08, mach, w)
    if name.startswith("V5-"):
        return lambda w: w6ref.capped_spec("hemisphere", 0.5, 1.0, mach, w)
    if name.startswith("H-vk"):
        return lambda w: w6ref.capped_spec("vk", 4, 0.08, mach, w)
    raise ValueError(f"no registered spec for {name}")


def spec_mismatch(spec, build):
    """'' if the run's spec is the registered one (widen 0 to 2, a registered limiter coefficient), else why not."""
    w = spec.get("widen")
    if w not in WIDEN_ALLOWED:
        return f"widen {w}"
    want = build(w)
    if spec.get("venkat") not in VENKAT_ALLOWED:
        return f"limiter coefficient {spec.get('venkat')}"
    want = dict(want, venkat=spec["venkat"])
    bad = [k for k in set(want) | set(spec) if not _same(want.get(k), spec.get(k))]
    return ", ".join(f"{k}: {spec.get(k)!r} (registered {want.get(k)!r})" for k in sorted(bad))


def _same(a, b):
    if isinstance(a, float) and isinstance(b, (int, float)):
        return abs(a - b) <= 1e-12 * max(1.0, abs(a))
    return a == b


# ------------------------------------------------------------- SU2's side

BOUNDARY = ("|Cp|", "the shock reaches", "outlet Mach")


def earlier_attempts(run, spec, build):
    """
    '' if a widened run's earlier attempts are kept (<run>.try1, .try2, ...,
    widen 0, 1, ...) and each failed R3's shock or boundary checks on a level
    1 to 3, as R3's trigger requires (the re-review's change 5(b)); else why not.
    """
    for t in range(1, spec["widen"] + 1):
        old = f"{run}.try{t}"
        if not os.path.exists(os.path.join(old, "result.json")):
            return f"widen {spec['widen']} without its earlier attempt {os.path.basename(old)}"
        ospec, orecs = run_record(old)
        if spec_mismatch(ospec, build) or ospec["widen"] != t - 1:
            return f"{os.path.basename(old)} is not the registered attempt with widen {t - 1}"
        msgs = [m for k in (1, 2, 3) if k in orecs for m in level_checks(ospec, k, orecs[k])[0]]
        if not any(m.startswith(BOUNDARY) for m in msgs):
            return f"{os.path.basename(old)} did not fail R3's shock or boundary checks"
    return ""



def run_record(run):
    with open(os.path.join(run, "result.json")) as f:
        res = json.load(f)
    return res["spec"], {rec["level"]: rec for rec in res["levels"]}


def level_checks(spec, k, rec):
    """R3's checks on level k, used; the list of failures and the level's iterative error."""
    bad = []
    if rec.get("exit") != 0 or "drag" not in rec:
        return ["SU2 failed"], 0.0
    u_it = 0.0
    if not rec.get("rms[Rho]", 0.0) <= -11 + 1e-9:
        swing = rec.get("dragRangeLastQuarter", math.inf)
        drift = abs(rec.get("dragMeanLastEighth", math.inf) - rec.get("dragMeanEighthBefore", -math.inf))
        if (rec.get("Inner_Iter", 0) >= spec["iters"] - 1 and swing <= ITERATIVE * abs(rec["drag"])
                and drift <= DRIFT * swing):
            u_it = swing
        else:
            bad.append(f"not converged (residual {rec.get('rms[Rho]')}, {rec.get('Inner_Iter')} iterations, "
                       f"drag range {swing}, drift {drift})")
    if not rec.get("outerMaxAbsCp", math.inf) <= OUTER_CP:
        bad.append(f"|Cp| {rec.get('outerMaxAbsCp')} on the outer boundary")
    if not rec.get("shockReach", math.inf) <= SHOCK_REACH:
        bad.append(f"the shock reaches {rec.get('shockReach')} of a line")
    if not rec.get("outletMinMach", 0.0) > 1:
        bad.append(f"outlet Mach {rec.get('outletMinMach')}")
    if not rec.get("minArea", 0.0) > 0:
        bad.append("a cell of no area")
    if not rec.get("seeded"):
        bad.append("not started from the level below")
    # Not on the sharp cone, which meets the cylinder at a corner where the two
    # quadratures differ on every level (the re-review); V1(b) tests the
    # integral there against the exact drag instead.
    if spec["shape"] != "cone" and not abs(rec.get("su2Drag", math.inf) - rec["drag"]) <= SU2_FORCE / 4 ** (k - 1) * abs(rec["drag"]):
        bad.append(f"the tool's drag {rec['drag']} against SU2's own {rec.get('su2Drag')}")
    return bad, u_it


def su2_estimate(D, Vreg, Vvert, swings=(0.0, 0.0, 0.0)):
    """
    R4's grid part: the value on the finest level used and max(U_total,
    U_dist). With the levels' iterative ranges s1, s2, s3 (zero where a level
    converged), every rate is taken at its least favourable: the coarser
    changes |e12|, V12 reduced by s1 + s2, the finer |e23|, V23 increased by
    s2 + s3 (the re-review's change 3(b)).
    """
    s1, s2, s3 = swings
    e12, e23 = D[1] - D[0], D[2] - D[1]
    a12, a23 = max(abs(e12) - s1 - s2, 0.0), abs(e23) + s2 + s3
    if e12 * e23 > 0 and a23 < a12:
        p = math.log2(a12 / a23)
        u_total = 1.25 * a23 / (2 ** min(p, 2) - 1)
        kind = f"monotone, order {p:.2f}"
    else:
        p = None
        u_total = 3 * max(abs(e12) + s1 + s2, a23)
        kind = "not monotone"
    v12, v23 = Vreg[0] - s1 - s2, Vreg[1] + s2 + s3
    w12, w23 = Vvert[0] - s1 - s2, Vvert[1] + s2 + s3
    rho = v23 / v12 if v12 > 0 else math.inf
    rho_vertex = w23 / w12 if w12 > 0 else math.inf
    r = max(rho, 0.5)
    u_dist = v23 * r / (1 - r) if rho < 1 else math.inf
    return {"value": D[2], "drags": D, "regionChanges": Vreg, "vertexChanges": Vvert, "order": p, "kind": kind,
            "uTotal": u_total, "rho": rho, "rhoVertex": rho_vertex, "r": r, "uDist": u_dist,
            "uGrid": max(u_total, u_dist)}


def su2_case(run, levels, build, x_end=None):
    """
    A run's value and uncertainty by R4 on the given levels (to x_end, a vertex
    of every level used, if given; else to the nose's end, closed at r = R),
    with its checks. `reference` says whether it gives one; `needsLevel4`
    whether it failed only where R4's fallback applies.
    """
    spec, recs = run_record(run)
    out = {"levels": levels}
    hard = {}
    mismatch = spec_mismatch(spec, build) or earlier_attempts(run, spec, build)
    if mismatch:
        hard["spec"] = [mismatch]
    u_iter = 0.0
    swings = []
    for k in levels:
        if k not in recs:
            hard[k] = ["not run"]
            continue
        bad, u_it = level_checks(spec, k, recs[k])
        u_iter += u_it
        swings.append(u_it)
        if bad:
            hard[k] = bad
    walls = [os.path.join(run, f"L{k}", "wall.csv") for k in levels]
    if hard or not all(os.path.exists(w) for w in walls):
        return dict(out, failures=hard or {"-": ["no wall files"]}, reference=False, needsLevel4=False)
    L = spec["L"]
    end, r_end = (L, R) if x_end is None else (x_end, None)
    x0 = w6ref.region_start(spec) if x_end is None else spec["L"] / 128
    D = [w6ref.nose_drag(*w6ref.read_surface(w), end, r_end) for w in walls]
    ch = [w6ref.changes(walls[i], walls[i + 1], end, x0, r_end) for i in (0, 1)]
    est = su2_estimate(D, [c["regions"] for c in ch], [c["vertex"] for c in ch], swings)
    out.update(est)
    u_cap = 0.0
    if spec["rn"] > 0:
        nose = w6ref.capped(spec["shape"], spec["L"], spec["rn"])
        top = recs[levels[-1]]
        exact = w6ref.pitot_cp(spec["mach"])
        rel = top["cpStagnation"] / exact - 1
        rel_before = recs[levels[-2]]["cpStagnation"] / exact - 1
        xt = nose["xt"]
        cap = w6ref.nose_drag(*w6ref.read_surface(walls[-1]), xt, w6ref.radius(nose, xt))
        # The larger stagnation error of the two finest levels used (the re-review's change 4).
        u_cap = max(abs(rel), abs(rel_before)) * abs(cap)
        out["stagnation"] = {"cp": top["cpStagnation"], "pitot": exact, "relative": rel,
                             "relativeLevelBefore": rel_before, "capDrag": cap}
    out["uCap"] = u_cap
    out["uIter"] = u_iter
    out["u"] = est["uGrid"] + u_cap + u_iter
    D3 = abs(est["value"])
    soft = []
    if not est["rhoVertex"] < 1:
        soft.append(f"the vertex-level change does not fall (ratio {est['rhoVertex']:.2f})")
    if not est["rho"] < 1:
        soft.append(f"the regional change does not fall (ratio {est['rho']:.2f})")
    if not est["uGrid"] <= GRID_LIMIT * D3:
        soft.append(f"grid part {est['uGrid'] / D3:.2%} of the drag, above {GRID_LIMIT:.1%}")
    if not out["u"] <= TOTAL_LIMIT * D3:
        soft.append(f"U_su2 {out['u'] / D3:.2%} of the drag, above {TOTAL_LIMIT:.0%}")
    stag_bad = "stagnation" in out and not abs(out["stagnation"]["relative"]) <= STAGNATION
    if stag_bad:
        hard[levels[-1]] = [f"V2: stagnation Cp {out['stagnation']['cp']:.4f}, pitot {out['stagnation']['pitot']:.4f}"]
    out["failures"] = dict(hard, **({"R4": soft} if soft else {}))
    out["uRelative"] = out["u"] / D3
    out["reference"] = not hard and not soft
    out["needsLevel4"] = not hard and bool(soft) and levels == [1, 2, 3]
    return out


def su2_reference(run, build):
    """R4 with its fallback: levels 1 to 3, or 2 to 4 only where 1 to 3 failed only on R4 and level 4 ran."""
    first = su2_case(run, [1, 2, 3], build)
    if not first["needsLevel4"]:
        return first
    _, recs = run_record(run)
    if 4 not in recs:
        return dict(first, failures=dict(first["failures"], level4=["owed"]))
    return dict(su2_case(run, [2, 3, 4], build), fallbackFrom=first)


# --------------------------------------------------------- the checks


def check_v1(run, build):
    try:
        return _check_v1(run, build)
    except (OSError, ValueError, KeyError) as e:
        return {"name": "V1", "pass": False, "why": f"{type(e).__name__}: {e}"}


def _check_v1(run, build):
    spec, _ = run_record(run)
    L, M = spec["L"], spec["mach"]
    cp_exact, _ = w6ref.cone_cp(M, math.atan(R / L))
    xs, rs, cps = w6ref.read_surface(os.path.join(run, "L3", "wall.csv"))
    window = [c for x, c in zip(xs, cps) if L / 3 <= x <= 0.8 * L]
    worst = max(abs(c / cp_exact - 1) for c in window)
    x1, r1, _ = w6ref.read_surface(os.path.join(run, "L1", "wall.csv"))
    k = max(i for i in range(len(x1)) if x1[i] <= 0.8 * L)
    x_end, r_end = float(x1[k]), float(r1[k])
    est = su2_case(run, [1, 2, 3], build, x_end)
    out = {"name": "V1", "mach": M, "coneCp": cp_exact, "pointwiseWorst": worst, "vertices": len(window),
           "xEnd": x_end, "estimate": est}
    if "value" in est:
        exact = cp_exact * r_end**2 / R**2
        out.update(exact=exact, error=est["value"] - exact)
        out["passB"] = est["reference"] and abs(est["value"] - exact) <= est["u"]
    else:
        out["passB"] = False
    out["passA"] = worst <= CONE_POINTWISE
    out["pass"] = out["passA"] and out["passB"]
    return out


def check_v2(run, build):
    est = su2_case(run, [1, 2, 3], build)
    st = est.get("stagnation", {})
    hard = {k: v for k, v in est["failures"].items() if k != "R4"}
    return {"name": "V2", "stagnation": st, "failures": hard,
            "pass": not hard and abs(st.get("relative", math.inf)) <= STAGNATION}


def check_v3(run, build):
    est = su2_case(run, [1, 2, 3], build)
    out = {"name": "V3", "exact": TN3716_MOC, "estimate": est}
    out["error"] = est["value"] - TN3716_MOC if "value" in est else None
    out["pass"] = est["reference"] and abs(out["error"]) <= est["u"]
    return out


def check_v4(run, build):
    """R5 V4: level 4 against R4's estimate from levels 1 to 3."""
    a = su2_case(run, [1, 2, 3], build)
    b = su2_case(run, [2, 3, 4], build)
    out = {"name": "V4", "levels1to3": a, "levels2to4": b}
    if "value" not in a or "value" not in b or a["failures"].keys() - {"R4"} or b["failures"].keys() - {"R4"}:
        out["pass"] = False
        return out
    D3, D4 = a["value"], b["value"]
    step = abs(D4 - D3)
    out.update(D3=D3, D4=D4, step=step, allowedStep=(1 - a["r"]) * a["uGrid"])
    inside = D3 - a["u"] <= D4 - b["u"] and D4 + b["u"] <= D3 + a["u"]
    out["inside"] = inside
    out["pass"] = step <= (1 - a["r"]) * a["uGrid"] and inside
    return out


def check_v5(run, build):
    """R5 V5: the hard checks, and the difference within U_su2 plus the fitted band (R4's limits not applied)."""
    spec, _ = run_record(run)
    value, band = HEMISPHERE[spec["mach"]]
    est = su2_case(run, [1, 2, 3], build)
    out = {"name": "V5", "fitted": value, "fittedBand": band * value, "estimate": est}
    hard = {k: v for k, v in est["failures"].items() if k != "R4"}
    if "value" in est and "u" in est and not hard:
        d = est["value"] - value
        out.update(difference=d, againstGridPart=abs(d) / (est["uGrid"] + band * value))
        # Both ratios below 1 (a finite U_su2), as R5 says; only R4's limits are not applied.
        out["pass"] = est["rho"] < 1 and est["rhoVertex"] < 1 and math.isfinite(est["u"]) and abs(d) <= est["u"] + band * value
    else:
        out["pass"] = False
    return out


# ------------------------------------------------------- the fitted side


def read_jsonl(path):
    with open(path) as f:
        return [json.loads(line) for line in f if line.strip()]


def fitted_families(ref_dir):
    """Per case and grid: the lanes' record where it exists, else this route's; refits compared (R6)."""
    lanes, here = {}, {}
    for source, into in (("lanes-results.jsonl", lanes), ("results.jsonl", here)):
        path = os.path.join(ref_dir, "fitted", source)
        if os.path.exists(path):
            for r in read_jsonl(path):
                if r.get("kind") == "fit":
                    into[(r["tag"], r["nj"])] = dict(r, _source=source)
    fam = dict(here)
    fam.update(lanes)
    refits = {}
    for key in lanes.keys() & here.keys():
        a, b = lanes[key]["drag"], here[key]["drag"]
        refits[key] = {"lanes": a, "here": b, "ok": abs(a - b) <= REFIT * abs(a)}
    return fam, refits


def procedure(fam, refits, t):
    """R6: W6 section 3 (analysis/references.mjs there), with the review's changes."""
    g = [fam.get((t, nj)) for nj in (20, 40, 80)]
    if any(x is None for x in g):
        return {"reference": False, "why": "fewer than three grids"}
    why = []
    osc = 0.0
    for x in g:
        if x.get("caseFailure"):
            why.append(f"nj {x['nj']}: {x['caseFailure']}")
        if not x.get("converged"):
            lo_hi = OSCILLATING.get(t)
            if lo_hi and x["nj"] == 80 and x["_source"] == "lanes-results.jsonl" and lo_hi[0] <= x["drag"] <= lo_hi[1]:
                osc = lo_hi[1] - lo_hi[0]
            else:
                why.append(f"nj {x['nj']} not converged")
        rf = refits.get((t, x["nj"]))
        if rf and not rf["ok"]:
            why.append(f"nj {x['nj']} refitted {rf['here']} against the lanes' {rf['lanes']}")
    T = [x["drag"] for x in g]
    q = (T[0] - T[1]) / (T[1] - T[2]) if T[1] != T[2] else math.inf
    if q == 0:
        why.append("nj = 20 and 40 give the same drag")
        return dict(reference=False, why="; ".join(why), drags=T, oscillation=osc, value=None, u=None)
    out = {"drags": T, "oscillation": osc}
    if q < 0:
        # Not monotone: the page's rule for oscillation, the range of the three.
        out.update(order=None, value=T[2], u=max(T) - min(T) + osc, rule="range")
    else:
        p = math.log2(q) if math.isfinite(q) else math.nan
        if math.isfinite(p) and p <= 0:
            why.append(f"observed order {p:.2f}: not converging")
            out.update(order=p, value=None, u=None)
        else:
            pc = min(p, 2) if math.isfinite(p) else 2
            out.update(order=p, value=T[2] - (T[1] - T[2]) / (2**pc - 1),
                       u=1.25 * abs(T[1] - T[2]) / (2**pc - 1) + osc, rule="order capped at 2")
    out["reference"] = not why
    out["why"] = "; ".join(why)
    return out


# --------------------------------------------------------------- hull


def _norm(p):
    return tuple((v - lo) / (hi - lo) for v, (lo, hi) in zip(p, BOX.values()))


def hull_extent(points):
    import numpy as np

    if len(points) < 2:
        return 0
    P = np.array([_norm(p) for p in points])
    return int(np.linalg.matrix_rank(P[1:] - P[0], tol=1e-9))


def inside_hull(points, p, tol=1e-9):
    """Whether p lies in the convex hull of points (boundary included); points with extent 3 (coordinates normalised to the box)."""
    import numpy as np

    P = [np.array(_norm(q)) for q in points]
    x = np.array(_norm(p))
    facets = 0
    for a, b, c in combinations(P, 3):
        n = np.cross(b - a, c - a)
        if np.linalg.norm(n) < 1e-12:
            continue
        side = [float(np.dot(n, q - a)) for q in P]
        if max(side) <= tol:
            pass
        elif min(side) >= -tol:
            n = -n
        else:
            continue
        facets += 1
        if np.dot(n, x - a) > tol:
            return False
    return facets > 0


def round_up(a):
    e = math.floor(math.log10(a))
    step = 10 ** (e - 1)
    return math.ceil(a / step - 1e-9) * step


# --------------------------------------------------------------- verdict


def main():
    ref_dir = sys.argv[1]
    runs = os.path.join(ref_dir, "runs")
    checks_only = "--checks-only" in sys.argv
    verdict = {"checks": {}, "cases": []}

    def have(name):
        return os.path.exists(os.path.join(runs, name, "result.json"))

    for name in CHECK_RUNS:
        if not have(name):
            verdict["checks"][name] = {"pass": False, "why": "not run"}
            continue
        run, build = os.path.join(runs, name), registered(name)
        kind = name.split("-")[0]
        fn = {"V1": check_v1, "V2": check_v2, "V3": check_v3, "V5": check_v5}[kind]
        verdict["checks"][name] = fn(run, build)
    for name in LEVEL4_TEST:
        key = "V4-" + name[3:]
        verdict["checks"][key] = check_v4(os.path.join(runs, name), registered(name)) if have(name) else {"pass": False}
    for k, c in verdict["checks"].items():
        print(k, "PASS" if c["pass"] else "FAIL", json.dumps({x: c[x] for x in c if x not in ("estimate", "levels1to3", "levels2to4")}, default=str))
    verdict["checksPass"] = all(c["pass"] for c in verdict["checks"].values())
    print("checks:", "PASS" if verdict["checksPass"] else "NOT PASSED")
    if checks_only or not verdict["checksPass"]:
        verdict["decision"] = {s: "refused: the checks have not passed" for s in SHAPES}
        json.dump(verdict, open(os.path.join(ref_dir, "verdict.json"), "w"), indent=1, default=str)
        return

    fam, refits = fitted_families(ref_dir)
    verdict["refits"] = {f"{t} nj{nj}": v for (t, nj), v in sorted(refits.items())}
    rows = []
    for shape, cal, ratio, M, where in cases():
        t = tag(shape, cal, ratio, M)
        row = {"tag": t, "shape": shape, "point": (cal, ratio, M), "where": where}
        run = os.path.join(runs, t)
        row["su2"] = su2_reference(run, registered(t, shape, cal, ratio, M)) if have(t) else {"reference": False, "failures": {"-": ["not run"]}}
        if have(t):
            sp, _ = run_record(run)
            row["settings"] = {"widen": sp.get("widen"), "venkat": sp.get("venkat")}
        row["fitted"] = procedure(fam, refits, t)
        row["both"] = bool(row["su2"]["reference"] and row["fitted"]["reference"])
        if row["both"]:
            s, f = row["su2"], row["fitted"]
            row["delta"] = f["value"] - s["value"]
            row["agree"] = abs(row["delta"]) <= f["u"] + s["u"]
            row["miss"] = (abs(row["delta"]) + s["u"] + f["oscillation"]) / s["value"]
        rows.append(row)
    verdict["cases"] = rows
    both = [r for r in rows if r["both"]]
    decision = {}
    if both:
        worst = max(both, key=lambda r: r["miss"])
        A = round_up(2 * worst["miss"])
        allow = {"ogive": max(A, FITTED_DRAG_FLOOR), "vk": max(A, TWO_SCALE_DRAG_FLOOR)}
        verdict["allowance"] = {"twiceLargestMiss": 2 * worst["miss"], "setBy": worst["tag"], "rounded": A, **allow}
        osc_tags = [r["tag"] for r in both if r["fitted"]["oscillation"] > 0]
        if osc_tags and (worst["tag"] in osc_tags or any(not r["agree"] for r in both if r["tag"] in osc_tags)):
            rest = [r for r in both if r["tag"] not in osc_tags]
            verdict["allowanceWithoutOscillating"] = round_up(2 * max(r["miss"] for r in rest)) if rest else None
        for r in both:
            s, f = r["su2"], r["fitted"]
            half = f["u"] + allow[r["shape"]] * f["value"]
            # Holds by construction unless D_proc < D_su2 / 2: a consistency check, not a test.
            r["consistent"] = f["value"] - half <= s["value"] - s["u"] and s["value"] + s["u"] <= f["value"] + half
        verdict["withinCeiling"] = A <= CEILING
        hold = []
        for shape, cal, ratio, M, name in HOLDOUT:
            t = tag(shape, cal, ratio, M)
            h = {"tag": t, "su2": su2_reference(os.path.join(runs, name), registered(name)) if have(name) else {"reference": False}}
            h["fitted"] = procedure(fam, refits, t)
            if h["su2"]["reference"] and h["fitted"]["reference"]:
                s, f = h["su2"], h["fitted"]
                half = f["u"] + allow[shape] * f["value"]
                h["contains"] = f["value"] - half <= s["value"] - s["u"] and s["value"] + s["u"] <= f["value"] + half
            else:
                h["contains"] = False
            hold.append(h)
        verdict["holdout"] = hold
    for shape in SHAPES:
        mine = [r for r in rows if r["shape"] == shape]
        good = [r["point"] for r in mine if r["both"]]
        failed = [r for r in mine if not r["both"]]
        ext = hull_extent(good)
        inside = [r["tag"] for r in failed if ext == 3 and inside_hull(good, r["point"])]
        verdict[f"hull_{shape}"] = {"passing": good, "extent": ext, "failedInside": inside,
                                    "allCorners": all(r["both"] for r in mine if r["where"] == "corner")}
        why = []
        if not both:
            why.append("no case gives a reference on both sides")
        elif not verdict["withinCeiling"]:
            why.append(f"the allowance {verdict['allowance']['rounded']:.2g} is above {CEILING:.0%}: the owner's call")
        if ext < 3:
            why.append(f"the outline has extent {ext}, not 3")
        if inside:
            why.append(f"failed cases inside the outline: {', '.join(inside)}")
        hold = [h for h in verdict.get("holdout", []) if h["tag"].startswith(shape)]
        if both and not all(h["contains"] for h in hold):
            why.append("a hold-out band does not contain SU2's interval: the owner's call")
        decision[shape] = "served inside the outline" if not why else "refused: " + "; ".join(why)
    verdict["decision"] = decision
    for r in rows:
        s, f = r["su2"], r["fitted"]
        line = f"{r['tag']:<18} {r['where']:<8} "
        line += f"SU2 {s['value']:.7f} +-{s['u']:.1e} ({s['uRelative']:.2%}) " if "value" in s and "uRelative" in s else "SU2 - "
        line += f"fitted {f['value']:.7f} +-{f['u']:.1e} " if f.get("value") is not None and f["reference"] else f"fitted - ({f.get('why')}) "
        if r["both"]:
            line += f"delta {r['delta'] / s['value']:+.3%} {'agree' if r['agree'] else 'DISAGREE'} miss {r['miss']:.2e}"
        else:
            line += f"SU2: {s.get('failures')}" if not s.get("reference") else ""
        print(line)
    for k in ("allowance", "allowanceWithoutOscillating", "withinCeiling", "hull_ogive", "hull_vk", "decision"):
        if k in verdict:
            print(k, json.dumps(verdict[k], default=str))
    for h in verdict.get("holdout", []):
        print("hold-out", h["tag"], "contains" if h["contains"] else "DOES NOT CONTAIN")
    json.dump(verdict, open(os.path.join(ref_dir, "verdict.json"), "w"), indent=1, default=str)


if __name__ == "__main__":
    main()
