"""
The verdict of W6's independent reference on OpenFOAM, computed as
"OpenFOAM's registration" (README) states it, from the committed records
only: per run, runs-of/<name>/L<k>/record.json, wall.csv and monitor.csv
(written by `ofref.run_case`), and the fitted solver's families as
`judge.py` reads them.

  python3 -I docs/research/w6-reference/ofjudge.py <reference dir> [--checks-only]

prints the tables and writes <reference dir>/verdict-of.json. Every number
and decision is the registration's; what is unchanged from the SU2
registration (R4's estimate, R6's fitted procedure, R7's allowance, R8's
outline) is `judge.py`'s own code, called here.
"""

import json
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import judge  # noqa: E402
import ofref  # noqa: E402
import w6ref  # noqa: E402
from judge import (CEILING, CHECK_RUNS, CONE_POINTWISE, DRIFT, FITTED_DRAG_FLOOR, GRID_LIMIT, HEMISPHERE,  # noqa: E402
                   HOLDOUT, ITERATIVE, LEVEL4_TEST, SETTLED, SETTLED_EIGHTHS, SHAPES, STAGNATION, TN3716_MOC,
                   TOTAL_LIMIT, TWO_SCALE_DRAG_FLOOR, WIDEN_ALLOWED)

R = w6ref.R
FORCE = 1e-9  # O3: the faces' drag and OpenFOAM's force within 1e-9 of the drag
SETTLED_RESIDUAL = -9  # Amendment 1 on OpenFOAM: the residual within a decade of its target, 1e-10
REPRODUCE = 1e-12  # O5: V5's levels against the trials', of the drag at least (else the sum of the levels' iterative ranges)
# Amendment 3 (README, "OpenFOAM's registration"): a factor of safety of 3 on both
# terms of R4's grid part in every OpenFOAM estimate (the checks, the W6 cases and
# the hold-out): U_dist (registered with none) times 3, and U_total's monotone
# branch with 3 in place of 1.25 (its other branch is already 3 times the change).
FS = 3.0
FS_MONOTONE_REGISTERED = 1.25  # `judge.su2_estimate`'s factor on a monotone total
# Amendment 3's blind checks: the forebody pressure drag of each sharp tangent
# ogive by the method of characteristics (0006; `moc-references.test.ts`): the
# second-order extrapolation from 640 and 1280 intervals, to 1e-9 (the change
# from 640 to 1280 intervals is at most 8.6e-8).
BLIND_MOC = {"B-ogive3M1.35": 0.107660028, "B-ogive3M3": 0.089916561, "B-ogive5M1.3": 0.042818100,
             "B-ogive5M2": 0.039655554, "B-ogive5M3": 0.036659195}
# V5's levels in the set-up trials (README, trials items 16 and 17), with these
# settings, by (Mach number, widening): (drag, its range over the last quarter)
# as their records hold them. The registered runs' drags on the same levels and
# domain are reported against them (O5).
TRIAL_V5 = {(2.0, 0): ((0.7900539375719124, 6.463942714418636e-10), (0.788296134974655, 7.18230697138722e-10),
                       (0.7881798049493066, 2.452591463253384e-10)),
            (3.0, 0): ((0.8472381671453886, 1.3554779521030014e-10), (0.8467179435487362, 2.234828988534332e-10),
                       (0.8478176313521926, 6.475264768823763e-11)),
            (3.0, 1): ((0.8477513697406405, 6.167011346036588e-11), (0.8467341970061649, 1.398875459912574e-10))}


# ------------------------------------------------------------- a run's records


def levels_of(run):
    recs = {}
    for k in range(5):
        f = os.path.join(run, f"L{k}", "record.json")
        if os.path.exists(f):
            with open(f) as fh:
                recs[k] = json.load(fh)
    return recs


def have(run):
    return os.path.exists(os.path.join(run, "L0", "record.json"))


def widen_of(recs, build):
    """The widening whose registered spec and settings give every record's hash; None if none does."""
    hashes = {rec.get("settingsHash") for rec in recs.values()}
    for w in WIDEN_ALLOWED:
        if hashes == {ofref.settings_hash(build(w), ofref.REGISTERED)}:
            return w
    return None


def spec_problem(run, recs, build):
    """'' if every record is the registered spec's and settings' (some widening) and the earlier attempts are as R3 asks."""
    w = widen_of(recs, build)
    if w is None:
        return "not made with the registered spec and settings"
    if w != ofref.attempts(run):
        return f"widen {w} with {ofref.attempts(run)} earlier attempts beside it"
    for t in range(1, w + 1):
        old = f"{run}.try{t}"
        orecs = levels_of(old)
        if widen_of(orecs, build) != t - 1:
            return f"{os.path.basename(old)} is not the registered attempt with widen {t - 1}"
        if not any(ofref.boundary_failures(orecs[k]) for k in (1, 2, 3) if k in orecs):
            return f"{os.path.basename(old)} did not fail R3's shock or boundary checks on a level 1 to 3"
    for k, rec in recs.items():
        if rec.get("limit") != ofref.REGISTERED["iters"][k]:
            return f"level {k}'s iteration limit {rec.get('limit')} (registered {ofref.REGISTERED['iters'][k]})"
    return ""


def eighth_means(monitor, rec):
    """
    The drag's means over the last three eighths, an eighth being half the
    last quarter as the runner takes it, from the level's committed
    monitor.csv (from the record's stage2From on): oldest first.
    """
    m = np.loadtxt(monitor, delimiter=",", skiprows=1, ndmin=2)
    m = m[m[:, 0] >= (rec.get("stage2From") or 0)]
    n = max(2, len(m) // 4)
    h = max(1, n // 2)
    if len(m) < 3 * h:
        return None
    q = m[:, 2]
    return [float(q[-3 * h:-2 * h].mean()), float(q[-2 * h:-h].mean()), float(q[-h:].mean())]


def settled(rec, monitor, swing, drift):
    """Amendment 1, on OpenFOAM's records (the residual within a decade of 1e-10)."""
    D = abs(rec["drag"])
    if not (swing <= SETTLED * D and drift <= SETTLED * D and rec.get("logRes", math.inf) <= SETTLED_RESIDUAL):
        return False
    if not os.path.exists(monitor):
        return False
    m = eighth_means(monitor, rec)
    tol = 1e-14 * D
    if m is None or abs(m[2] - rec["dragMeanLastEighth"]) > tol or abs(m[1] - rec["dragMeanEighthBefore"]) > tol:
        return False
    return abs(m[2] - m[1]) <= abs(m[1] - m[0])


def stall_held(rec, monitor):
    """
    O3's stall rule, checked again: the record's stalledAt is a save (a
    multiple of the registered checkpoint) and the rule holds on the
    level's committed monitor.csv (from its stage2From) up to it.
    """
    s = rec.get("stalledAt")
    if s is None or s % ofref.REGISTERED["checkpoint"] != 0 or not os.path.exists(monitor):
        return False
    m = np.loadtxt(monitor, delimiter=",", skiprows=1, ndmin=2)
    m = m[(m[:, 0] >= (rec.get("stage2From") or 0)) & (m[:, 0] <= s)]
    return bool(len(m)) and m[-1, 0] == s and rec.get("iterations", -1) >= s and ofref.stall_test(m, rec["limit"])


def converged_held(rec, m):
    """
    O3's convergence, from the monitor (m: its rows from the record's
    stage2From): five rows in a row at or below the target ending at the
    record's convergedAt, which the level ran to.
    """
    c = rec.get("convergedAt")
    if c is None:
        return False
    i = np.nonzero(m[:, 0] == c)[0]
    return (len(i) == 1 and i[0] >= 4 and bool(np.all(m[i[0] - 4:i[0] + 1, 1] <= ofref.REGISTERED["target"]))
            and rec.get("iterations", -1) >= c)


def level_checks(k, rec, monitor, charge=True):
    """O3's checks on level k, used: the failures and the level's iterative error."""
    if rec.get("exit") != 0 or "drag" not in rec:
        return ["OpenFOAM failed"], 0.0
    wall = os.path.join(os.path.dirname(monitor), "wall.csv")
    if not os.path.exists(monitor) or ofref.file_hash(monitor) != rec.get("monitorSha256"):
        return ["monitor.csv is not the one its record was made with"], 0.0
    if not os.path.exists(wall) or ofref.file_hash(wall) != rec.get("wallSha256"):
        return ["wall.csv is not the one its record was made with"], 0.0
    bad = []
    builds = rec.get("builds") or []
    if not builds or any(b.get(key) not in ok for b in builds for key, ok in ofref.REGISTERED_BUILD.items()):
        bad.append(f"not made with the registered build: {builds}")
    if rec.get("processes") != ofref.PROCESSES[k]:
        bad.append(f"run on {rec.get('processes')} processes, not {ofref.PROCESSES[k]}")
    # The iterative measures from the monitor (as the runner takes them), checked against the record's.
    m = np.loadtxt(monitor, delimiter=",", skiprows=1, ndmin=2)
    m = m[m[:, 0] >= (rec.get("stage2From") or 0)]
    D = abs(rec["drag"])
    n = max(2, len(m) // 4)
    q = m[-n:, 2]
    h = max(1, n // 2)
    swing, last, before = float(q.max() - q.min()), float(q[-h:].mean()), float(q[-2 * h:-h].mean())
    drift = abs(last - before)
    if (int(m[-1, 0]) != rec.get("iterations") or not abs(swing - rec.get("dragRangeLastQuarter", math.inf)) <= 1e-14 * D
            or not abs(last - rec.get("dragMeanLastEighth", math.inf)) <= 1e-14 * D
            or not abs(before - rec.get("dragMeanEighthBefore", math.inf)) <= 1e-14 * D):
        bad.append("the record's iterative measures are not its monitor's")
    u_it = 0.0
    if not converged_held(rec, m):
        at_limit = bool(rec.get("atLimit")) and m[-1, 0] >= rec["limit"]
        stalled = stall_held(rec, monitor)
        stopped = at_limit or stalled  # at its limit, or by the stall rule
        if stopped and swing <= ITERATIVE * D and drift <= DRIFT * swing:
            u_it = swing
        elif stopped and settled(rec, monitor, swing, drift):
            u_it = swing + (SETTLED_EIGHTHS * drift if charge else 0.0)
        elif stalled and swing <= SETTLED * D and drift <= SETTLED * D:
            # O3: a level the stall rule stopped that fails R3's drift test takes
            # Amendment 1's charge without its test that the drift is not growing.
            u_it = swing + (SETTLED_EIGHTHS * drift if charge else 0.0)
        else:
            bad.append(f"not converged (residual 1e{rec.get('logRes')}, {rec.get('iterations')} iterations, "
                       f"drag range {swing}, drift {drift})")
    bad += ofref.boundary_failures(rec)
    if not rec.get("meshOK"):
        bad.append("checkMesh did not pass")
    if k >= 1 and not rec.get("seeded"):
        bad.append("not started from the level below")
    if not abs(rec.get("forceDrag", math.inf) - rec["drag"]) <= FORCE * abs(rec["drag"]):
        bad.append(f"the faces' drag {rec['drag']} against OpenFOAM's force {rec.get('forceDrag')}")
    return bad, u_it


# ---------------------------------------------------------- O4: value and U


def cap_terms(faces, p0, spec):
    """
    O4's cap term on one level: the sum over the cap's wall faces (centre at
    x <= x_t) of |p0 / pitot - 1| p / q_inf (r1^2 - r0^2) / R^2; and V2's
    worst cap face.
    """
    nose = w6ref.capped(spec["shape"], spec["L"], spec["rn"])
    xt = nose["xt"]
    qinv = 1 / (0.7 * spec["mach"] ** 2)
    cap = 0.5 * (faces[:, 0] + faces[:, 2]) <= xt
    f, e = faces[cap], p0[cap] - 1
    E = float(np.sum(np.abs(e) * (f[:, 4] + qinv) * (f[:, 3] ** 2 - f[:, 1] ** 2)) / R**2)
    drag = float(np.sum(f[:, 4] * (f[:, 3] ** 2 - f[:, 1] ** 2)) / R**2)
    worst = float(e[np.argmax(np.abs(e))])
    return {"E": E, "capDrag": drag, "worstFace": worst, "worstFaceCp": worst * cp_factor(spec["mach"]),
            "faces": int(cap.sum())}


def cp_factor(mach):
    """
    O5's V2 in R5's units: a total pressure's error over pitot's total
    pressure, times this, is the same error over pitot's Cp (p0_pitot over
    p0_pitot - p_inf: 1.58 at Mach 1.3, 1.21 at Mach 2, 1.09 at Mach 3).
    """
    cp = w6ref.pitot_cp(mach)
    return (cp + 1 / (0.7 * mach**2)) / cp


def read_wall_p0(path):
    a = np.loadtxt(path, delimiter=",", skiprows=1, ndmin=2)
    return a[:, :5], a[:, 5]


def of_case(run, levels, build, x_end=None, charge=True):
    """
    A run's value and uncertainty by O4 on the given levels (to x_end, a
    vertex of every level used, if given; else the whole wall), with its
    checks. `reference` says whether it gives one; `needsLevel4` whether it
    failed only where R4's fallback applies.
    """
    recs = levels_of(run)
    out = {"levels": levels}
    hard = {}
    problem = spec_problem(run, recs, build)
    if problem:
        hard["spec"] = [problem]
    out["widen"] = widen_of(recs, build)
    spec = build(out["widen"] or 0)
    swings, u_iter = [], 0.0
    for k in levels:
        if k not in recs:
            hard[k] = ["not run"]
            continue
        bad, u_it = level_checks(k, recs[k], os.path.join(run, f"L{k}", "monitor.csv"), charge)
        if k >= 1 and recs[k].get("seedSha256") != recs.get(k - 1, {}).get("solutionSha256"):
            bad = bad + ["not started from the level below's recorded solution"]
        u_iter += u_it
        swings.append(u_it)
        if bad:
            hard[k] = bad
    walls = [os.path.join(run, f"L{k}", "wall.csv") for k in levels]
    if hard or not all(os.path.exists(w) for w in walls):
        return dict(out, failures=hard or {"-": ["no wall files"]}, reference=False, needsLevel4=False)
    L = spec["L"]
    data = [read_wall_p0(w) for w in walls]
    faces = [d[0] for d in data]
    if x_end is not None:
        for k, f in zip(levels, faces):
            if not np.any(np.abs(f[:, 2] - x_end) <= 1e-12):
                return dict(out, failures={k: [f"no vertex at x = {x_end}"]}, reference=False, needsLevel4=False)
    x0 = w6ref.region_start(spec) if x_end is None else L / 128
    D = [ofref.faces_drag(f, x_end) for f in faces]
    try:
        ch = [ofref.faces_changes(faces[i], faces[i + 1], L, x0, x_end) for i in (0, 1)]
    except ValueError as e:  # the wall faces do not nest (O4)
        return dict(out, failures={"-": [str(e)]}, reference=False, needsLevel4=False)
    est = judge.su2_estimate(D, [c["regions"] for c in ch], [c["vertex"] for c in ch], swings)
    # Amendment 3: U_dist times FS (U_dist is infinite where the regional change does not
    # fall, and stays so); a monotone total's U_total with FS in place of 1.25.
    est["uDistRegistered"] = est["uDist"]
    est["uTotalRegistered"] = est["uTotal"]
    est["uGridRegistered"] = est["uGrid"]
    est["uDist"] = FS * est["uDist"]
    if est["order"] is not None:
        est["uTotal"] = FS / FS_MONOTONE_REGISTERED * est["uTotal"]
    est["uGrid"] = max(est["uTotal"], est["uDist"])
    out.update(est)
    u_cap = 0.0
    if spec["rn"] > 0:
        top, before = cap_terms(faces[2], data[2][1], spec), cap_terms(faces[1], data[1][1], spec)
        u_cap = max(top["E"], before["E"])
        axis = recs[levels[-1]].get("wallCellTotalPressure", math.nan) - 1
        axis_cp = axis * cp_factor(spec["mach"])
        out["cap"] = {"finest": top, "levelBefore": before, "axisFirstCell": axis, "axisFirstCellCp": axis_cp}
        # V2, on the finest level used (a hard check of every capped run, R4), in Cp
        # over pitot's Cp as R5 states it.
        v2 = []
        if not abs(axis_cp) <= STAGNATION:
            v2.append(f"V2: the axis's first cell's total pressure {axis_cp:+.2%} of pitot's Cp from pitot")
        if not abs(top["worstFaceCp"]) <= STAGNATION:
            v2.append(f"V2: a cap face's total pressure {top['worstFaceCp']:+.2%} of pitot's Cp from pitot")
        if v2:
            hard[levels[-1]] = v2
    out["uCap"] = u_cap
    out["uIter"] = u_iter
    out["u"] = est["uGrid"] + u_cap + u_iter
    out["uRegistered"] = est["uGridRegistered"] + u_cap + u_iter  # before Amendment 3 (V4 keeps it)
    D3 = abs(est["value"])
    soft = []
    if not est["rhoVertex"] < 1:
        soft.append(f"the face-level change does not fall (ratio {est['rhoVertex']:.2f})")
    if not est["rho"] < 1:
        soft.append(f"the regional change does not fall (ratio {est['rho']:.2f})")
    if not est["uGrid"] <= GRID_LIMIT * D3:
        soft.append(f"grid part {est['uGrid'] / D3:.2%} of the drag, above {GRID_LIMIT:.1%}")
    if not out["u"] <= TOTAL_LIMIT * D3:
        soft.append(f"U {out['u'] / D3:.2%} of the drag, above {TOTAL_LIMIT:.0%}")
    out["failures"] = dict(hard, **({"R4": soft} if soft else {}))
    out["uRelative"] = out["u"] / D3
    out["reference"] = not hard and not soft
    out["needsLevel4"] = not hard and bool(soft) and levels == [1, 2, 3]
    return out


def of_reference(run, build):
    """O4 with R4's fallback: levels 1 to 3, or 2 to 4 only where 1 to 3 failed only on R4 and level 4 ran."""
    first = of_case(run, [1, 2, 3], build)
    if not first["needsLevel4"]:
        return first
    if 4 not in levels_of(run):
        return dict(first, failures=dict(first["failures"], level4=["owed"]))
    return dict(of_case(run, [2, 3, 4], build), fallbackFrom=first)


# --------------------------------------------------------- the checks (O5)


def both_ways(check, run, build):
    """Amendment 1's change 3: a check passes only with and without the amendment's charge."""
    full = check(run, build, True)
    bare = check(run, build, False)
    return dict(full, passCharged=full["pass"], withoutCharge=bare, **{"pass": full["pass"] and bare["pass"]})


def guarded(fn):
    def call(run, build):
        try:
            return fn(run, build)
        except (OSError, ValueError, KeyError, IndexError) as e:
            return {"pass": False, "why": f"{type(e).__name__}: {e}"}
    return call


def _check_v1(run, build, charge):
    recs = levels_of(run)
    spec = build(widen_of(recs, build) or 0)
    L, M = spec["L"], spec["mach"]
    cp_exact, _ = w6ref.cone_cp(M, math.atan(R / L))
    f3, _ = read_wall_p0(os.path.join(run, "L3", "wall.csv"))
    xm = 0.5 * (f3[:, 0] + f3[:, 2])
    window = f3[(xm >= L / 3) & (xm <= 0.8 * L)]
    worst = float(np.max(np.abs(window[:, 4] / cp_exact - 1)))
    f1, _ = read_wall_p0(os.path.join(run, "L1", "wall.csv"))
    ends = f1[f1[:, 2] <= 0.8 * L]
    k = int(np.argmax(ends[:, 2]))
    x_end, r_end = float(ends[k, 2]), float(ends[k, 3])
    est = of_case(run, [1, 2, 3], build, x_end, charge)
    out = {"name": "V1", "mach": M, "coneCp": cp_exact, "pointwiseWorst": worst, "faces": len(window),
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


@guarded
def check_v1(run, build):
    return both_ways(_check_v1, run, build)


@guarded
def check_v2(run, build):
    est = of_case(run, [1, 2, 3], build)
    hard = {k: v for k, v in est["failures"].items() if k != "R4"}
    return {"name": "V2", "cap": est.get("cap"), "failures": hard, "pass": not hard and "cap" in est}


def _check_v3(run, build, charge):
    est = of_case(run, [1, 2, 3], build, charge=charge)
    out = {"name": "V3", "exact": TN3716_MOC, "estimate": est}
    out["error"] = est["value"] - TN3716_MOC if "value" in est else None
    out["pass"] = bool(est["reference"]) and abs(out["error"]) <= est["u"]
    return out


@guarded
def check_v3(run, build):
    return both_ways(_check_v3, run, build)


def _check_blind(run, build, charge, exact):
    est = of_case(run, [1, 2, 3], build, charge=charge)
    out = {"name": "B", "exact": exact, "estimate": est}
    out["error"] = est["value"] - exact if "value" in est else None
    out["pass"] = bool(est["reference"]) and abs(out["error"]) <= est["u"]
    if out["error"] is not None and "u" in est:
        # Amendment 3: reported over the amended U and, for information, over the registered U.
        out["errorOverU"] = abs(out["error"]) / est["u"]
        out["errorOverURegistered"] = abs(out["error"]) / est["uRegistered"]
    return out


def check_blind(name):
    """Amendment 3's blind checks: as V3, against the method of characteristics' drag."""
    @guarded
    def check(run, build):
        return both_ways(lambda r, b, c: _check_blind(r, b, c, BLIND_MOC[name]), run, build)
    return check


def _check_v4(run, build, charge):
    a = of_case(run, [1, 2, 3], build, charge=charge)
    b = of_case(run, [2, 3, 4], build, charge=charge)
    out = {"name": "V4", "levels1to3": a, "levels2to4": b}
    if "value" not in a or "value" not in b or a["failures"].keys() - {"R4"} or b["failures"].keys() - {"R4"}:
        out["pass"] = False
        return out
    D3, D4 = a["value"], b["value"]
    step = abs(D4 - D3)
    # Amendment 3: the step keeps the registered grid part (the factor would only
    # loosen it); the containment must hold with the registered U and with the
    # amended U, so V4 is never looser than registered and also tests the amended
    # intervals that a level-4 fallback is served with.
    allowed = (1 - a["r"]) * a["uGridRegistered"]
    out.update(D3=D3, D4=D4, step=step, allowedStep=allowed)
    def inside(ua, ub):
        return D3 - ua <= D4 - ub and D4 + ub <= D3 + ua
    out["insideRegistered"] = inside(a["uRegistered"], b["uRegistered"])
    out["insideAmended"] = inside(a["u"], b["u"])
    out["inside"] = out["insideRegistered"] and out["insideAmended"]
    out["pass"] = step <= allowed and out["inside"]
    return out


@guarded
def check_v4(run, build):
    return both_ways(_check_v4, run, build)


def _check_v5(run, build, charge):
    recs = levels_of(run)
    spec = build(widen_of(recs, build) or 0)
    value, band = HEMISPHERE[spec["mach"]]
    est = of_case(run, [1, 2, 3], build, charge=charge)
    out = {"name": "V5", "fitted": value, "fittedBand": band * value, "estimate": est}
    # O5: each attempt's levels against the trials' on the same domain (the
    # attempt with widening t < the run's is kept as <run>.try<t+1>).
    out["againstTrials"] = {}
    for t in range(spec["widen"] + 1):
        if (spec["mach"], t) in TRIAL_V5:
            r = recs if t == spec["widen"] else levels_of(f"{run}.try{t + 1}")
            # per level: (the difference, what it may be: the sum of the two
            # levels' drag ranges over their last quarters, or 1e-12 of the drag if larger)
            out["againstTrials"][f"widen {t}"] = [
                (r[k]["drag"] - v, max(REPRODUCE * abs(v), w + r[k].get("dragRangeLastQuarter", 0.0)))
                if k in r and "drag" in r[k] else None for k, (v, w) in enumerate(TRIAL_V5[(spec["mach"], t)])]
    hard = {k: v for k, v in est["failures"].items() if k != "R4"}
    # O5: every level a trial ran on the same domain gives the trial's drag (same code, same inputs).
    out["reproduced"] = all(abs(x[0]) <= x[1] for xs in out["againstTrials"].values() for x in xs if x is not None)
    if "value" in est and "u" in est and not hard:
        d = est["value"] - value
        out.update(difference=d, againstGridPart=abs(d) / (est["uGrid"] + band * value))
        out["pass"] = (est["rho"] < 1 and est["rhoVertex"] < 1 and math.isfinite(est["u"]) and abs(d) <= est["u"] + band * value
                       and out["reproduced"])
    else:
        out["pass"] = False
    return out


@guarded
def check_v5(run, build):
    return both_ways(_check_v5, run, build)


# --------------------------------------------------------------- verdict


def main():
    ref_dir = sys.argv[1]
    runs = os.path.join(ref_dir, "runs-of")
    checks_only = "--checks-only" in sys.argv
    verdict = {"solver": "OpenFOAM", "checks": {}, "cases": []}

    def run_of(name):
        return os.path.join(runs, name)

    for name in CHECK_RUNS:
        if not have(run_of(name)):
            verdict["checks"][name] = {"pass": False, "why": "not run"}
            continue
        fn = {"V1": check_v1, "V2": check_v2, "V3": check_v3, "V5": check_v5}[name.split("-")[0]]
        verdict["checks"][name] = fn(run_of(name), ofref.registered_build(name))
    for name in ofref.BLIND:
        verdict["checks"][name] = (check_blind(name)(run_of(name), ofref.registered_build(name)) if have(run_of(name))
                                   else {"pass": False, "why": "not run"})
    for name in LEVEL4_TEST:
        key = "V4-" + name[3:]
        verdict["checks"][key] = (check_v4(run_of(name), ofref.registered_build(name)) if have(run_of(name))
                                  else {"pass": False, "why": "not run"})
    for k, c in verdict["checks"].items():
        print(k, "PASS" if c["pass"] else "FAIL",
              json.dumps({x: c[x] for x in c if x not in ("estimate", "levels1to3", "levels2to4", "withoutCharge")}, default=str))
    verdict["checksPass"] = all(c["pass"] for c in verdict["checks"].values())
    print("checks:", "PASS" if verdict["checksPass"] else "NOT PASSED")
    if checks_only or not verdict["checksPass"]:
        verdict["decision"] = {s: "refused: the checks have not passed" for s in SHAPES}
        with open(os.path.join(ref_dir, "verdict-of.json"), "w") as f:
            json.dump(verdict, f, indent=1, default=str)
        return

    fam, refits = judge.fitted_families(ref_dir)
    verdict["refits"] = {f"{t} nj{nj}": v for (t, nj), v in sorted(refits.items())}
    rows = []
    for shape, cal, ratio, M, where in judge.cases():
        t = judge.tag(shape, cal, ratio, M)
        row = {"tag": t, "shape": shape, "point": (cal, ratio, M), "where": where}
        run = run_of(t)
        row["of"] = (of_reference(run, judge.registered(t, shape, cal, ratio, M)) if have(run)
                     else {"reference": False, "failures": {"-": ["not run"]}})
        row["fitted"] = judge.procedure(fam, refits, t)
        row["both"] = bool(row["of"]["reference"] and row["fitted"]["reference"])
        if row["both"]:
            s, f = row["of"], row["fitted"]
            row["delta"] = f["value"] - s["value"]
            row["agree"] = abs(row["delta"]) <= f["u"] + s["u"]
            row["miss"] = (abs(row["delta"]) + s["u"] + f["oscillation"]) / s["value"]
        rows.append(row)
    verdict["cases"] = rows
    both = [r for r in rows if r["both"]]
    decision = {}
    if both:
        worst = max(both, key=lambda r: r["miss"])
        A = judge.round_up(2 * worst["miss"])
        allow = {"ogive": max(A, FITTED_DRAG_FLOOR), "vk": max(A, TWO_SCALE_DRAG_FLOOR)}
        verdict["allowance"] = {"twiceLargestMiss": 2 * worst["miss"], "setBy": worst["tag"], "rounded": A, **allow}
        osc_tags = [r["tag"] for r in both if r["fitted"]["oscillation"] > 0]
        if osc_tags and (worst["tag"] in osc_tags or any(not r["agree"] for r in both if r["tag"] in osc_tags)):
            rest = [r for r in both if r["tag"] not in osc_tags]
            verdict["allowanceWithoutOscillating"] = judge.round_up(2 * max(r["miss"] for r in rest)) if rest else None
        for r in both:
            s, f = r["of"], r["fitted"]
            half = f["u"] + allow[r["shape"]] * f["value"]
            r["consistent"] = f["value"] - half <= s["value"] - s["u"] and s["value"] + s["u"] <= f["value"] + half
        verdict["withinCeiling"] = A <= CEILING
        hold = []
        for shape, cal, ratio, M, name in HOLDOUT:
            t = judge.tag(shape, cal, ratio, M)
            h = {"tag": t, "of": of_reference(run_of(name), ofref.registered_build(name)) if have(run_of(name))
                 else {"reference": False}}
            h["fitted"] = judge.procedure(fam, refits, t)
            if h["of"]["reference"] and h["fitted"]["reference"]:
                s, f = h["of"], h["fitted"]
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
        ext = judge.hull_extent(good)
        inside = [r["tag"] for r in failed if ext == 3 and judge.inside_hull(good, r["point"])]
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
            why.append("a hold-out band does not contain OpenFOAM's interval: the owner's call")
        decision[shape] = "served inside the outline" if not why else "refused: " + "; ".join(why)
    verdict["decision"] = decision
    for r in rows:
        s, f = r["of"], r["fitted"]
        line = f"{r['tag']:<18} {r['where']:<8} "
        line += f"OpenFOAM {s['value']:.7f} +-{s['u']:.1e} ({s['uRelative']:.2%}) " if "value" in s and "uRelative" in s else "OpenFOAM - "
        line += f"fitted {f['value']:.7f} +-{f['u']:.1e} " if f.get("value") is not None and f["reference"] else f"fitted - ({f.get('why')}) "
        if r["both"]:
            line += f"delta {r['delta'] / s['value']:+.3%} {'agree' if r['agree'] else 'DISAGREE'} miss {r['miss']:.2e}"
        elif not s.get("reference"):
            line += f"OpenFOAM: {s.get('failures')}"
        print(line)
    for k in ("allowance", "allowanceWithoutOscillating", "withinCeiling", "hull_ogive", "hull_vk", "decision"):
        if k in verdict:
            print(k, json.dumps(verdict[k], default=str))
    for h in verdict.get("holdout", []):
        print("hold-out", h["tag"], "contains" if h["contains"] else "DOES NOT CONTAIN")
    with open(os.path.join(ref_dir, "verdict-of.json"), "w") as f:
        json.dump(verdict, f, indent=1, default=str)


if __name__ == "__main__":
    main()
