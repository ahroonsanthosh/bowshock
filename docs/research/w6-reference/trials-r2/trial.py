"""
Revision 2's trials (README, "Revision 2: the trials for a fix"): each
candidate setting on the trial case T, the hemisphere-cylinder at Mach 2.5
on the registered C grid (no check runs at that Mach number and no fitted
value exists for it), and the trial rules applied to the runs, as written
down before any of them ran.

  trial.py run <candidate> <levels> <SU2_CFD> [threads]
      levels 0 to <levels> - 1 (3 for the screen, 4 for level 3); a level
      with a record is not run again (w6ref.run_case); W6REF_DEADLINE as in
      queue.sh (exit 3 when a level could not finish before it)
  trial.py judge
      the screen and the level-3 rule on every candidate run so far
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import judge  # noqa: E402
import w6ref  # noqa: E402

MACH = 2.5
RUNS = os.path.join(HERE, "runs")
STAGNATION = 0.03  # V2's test
CONVERGED = -11  # SU2's own stopping residual, reached (no rule for a level at the limit)

# Only the flux scheme, the limiter and the gradients change; grids, levels,
# iteration limits, CFL and the residual target are the registered ones.
CANDIDATES = {
    "S0": {},  # the control: the registered settings
    "S1": {"limiter": "VAN_ALBADA_EDGE"},
    "S2": {"grad": "GREEN_GAUSS"},
    "S3": {"limiter": "NISHIKAWA_R3"},
    "S4": {"limiterIter": 2000},  # Venkatakrishnan's limiter frozen after 2,000 iterations of each run
    "S5": {"scheme": "JST", "muscl": "NO"},  # central, its own scalar dissipation; no limiter (SU2 refuses MUSCL with it)
    "S6": {"scheme": "MSW"},  # modified Steger-Warming flux-vector splitting
}


def spec_for(name, widen=0):
    return dict(w6ref.capped_spec("hemisphere", 0.5, 1.0, MACH, widen), **CANDIDATES[name])


def run(name, levels, su2, threads):
    d = os.path.join(RUNS, name)
    os.makedirs(d, exist_ok=True)
    spec = spec_for(name)
    path = os.path.join(d, "spec.json")
    if os.path.exists(path) and json.load(open(path)) != json.loads(json.dumps(spec)):
        raise SystemExit(f"{path} holds another spec")
    json.dump(spec, open(path, "w"), indent=1)
    deadline = float(os.environ["W6REF_DEADLINE"]) if "W6REF_DEADLINE" in os.environ else None
    try:
        w6ref.run_case(dict(spec, levels=levels), d, su2, threads, deadline)
    except w6ref.Deadline as e:
        print(f"deadline: {e}", flush=True)
        sys.exit(3)
    recs = [json.load(open(os.path.join(d, f"L{k}", "record.json"))) for k in range(levels)]
    with open(os.path.join(d, "result.json.tmp"), "w") as f:
        json.dump({"spec": spec, "levels": recs}, f, indent=1)
    os.replace(os.path.join(d, "result.json.tmp"), os.path.join(d, "result.json"))


def stag_error(rec):
    return rec["cpStagnation"] / w6ref.pitot_cp(MACH) - 1


def level_failures(spec, k, rec, d):
    """Strict convergence on every level, and R3's other checks on levels 1 to 3."""
    bad = []
    if rec.get("exit") != 0 or "drag" not in rec:
        return ["SU2 failed"]
    if not rec.get("rms[Rho]", 0.0) <= CONVERGED + 1e-9:
        bad.append(f"level {k} not converged (residual 1e{rec.get('rms[Rho]'):.2f} at {rec.get('Inner_Iter'):.0f} iterations)")
    if k >= 1:
        other, _ = judge.level_checks(spec, k, rec, os.path.join(d, f"L{k}", "history.csv"))
        bad += [f"level {k}: {m}" for m in other if not m.startswith("not converged")]
    return bad


def screen(name):
    """Levels 0 to 2: all converged, stagnation within 3% and not growing, the vertex-level change falling."""
    d = os.path.join(RUNS, name)
    spec, recs = judge.run_record(d)
    if any(k not in recs for k in (0, 1, 2)):
        return {"pass": False, "why": ["levels 0 to 2 not all run"]}
    why = [m for k in (0, 1, 2) for m in level_failures(spec, k, recs[k], d)]
    e1, e2 = stag_error(recs[1]), stag_error(recs[2])
    if not abs(e2) <= STAGNATION:
        why.append(f"stagnation {e2:+.2%} on level 2")
    if not abs(e2) <= abs(e1):
        why.append(f"stagnation error grows ({e1:+.2%} on level 1, {e2:+.2%} on level 2)")
    v1, v2 = recs[1]["change"]["vertex"], recs[2]["change"]["vertex"]
    if not v2 < v1:
        why.append(f"vertex-level change grows ({v1:.3e} to {v2:.3e})")
    return {"pass": not why, "why": why, "stagnation": [stag_error(recs[k]) for k in (0, 1, 2)],
            "vertexRatio": v2 / v1, "drags": [recs[k]["drag"] for k in (0, 1, 2)],
            "iterations": [recs[k].get("Inner_Iter") for k in (0, 1, 2)]}


def level3(name):
    """Level 3 converged, stagnation within 3% and not growing, both of R4's ratios below 1; U_su2 without limits."""
    d = os.path.join(RUNS, name)
    spec, recs = judge.run_record(d)
    if 3 not in recs:
        return {"pass": False, "why": ["level 3 not run"]}
    why = level_failures(spec, 3, recs[3], d)
    e2, e3 = stag_error(recs[2]), stag_error(recs[3])
    if not abs(e3) <= STAGNATION:
        why.append(f"stagnation {e3:+.2%} on level 3")
    if not abs(e3) <= abs(e2):
        why.append(f"stagnation error grows ({e2:+.2%} on level 2, {e3:+.2%} on level 3)")
    est = judge.su2_case(d, [1, 2, 3], lambda w: spec_for(name, w))
    hard = {k: v for k, v in est["failures"].items() if k != "R4"}
    if hard:
        why.append(f"R4's hard checks: {hard}")
    for key, label in (("rho", "regional"), ("rhoVertex", "vertex-level")):
        if key in est and not est[key] < 1:
            why.append(f"the {label} ratio {est[key]:.2f}")
    return {"pass": not why, "why": why, "stagnation": e3, "value": est.get("value"), "u": est.get("u"),
            "uRelative": est.get("uRelative"), "rho": est.get("rho"), "rhoVertex": est.get("rhoVertex")}


def main():
    if sys.argv[1] == "run":
        run(sys.argv[2], int(sys.argv[3]), sys.argv[4], int(sys.argv[5]) if len(sys.argv) > 5 else 2)
        return
    out = {}
    for name in CANDIDATES:
        if not os.path.exists(os.path.join(RUNS, name, "result.json")):
            continue
        out[name] = {"settings": CANDIDATES[name], "screen": screen(name)}
        _, recs = judge.run_record(os.path.join(RUNS, name))
        if 3 in recs:
            out[name]["level3"] = level3(name)
    passed = {n: o["level3"]["u"] for n, o in out.items() if o.get("level3", {}).get("pass") and n != "S0"}
    out["control passes level 3"] = bool(out.get("S0", {}).get("level3", {}).get("pass"))
    out["chosen"] = None if out["control passes level 3"] or not passed else min(passed, key=passed.get)
    print(json.dumps(out, indent=1, default=str))


if __name__ == "__main__":
    main()
