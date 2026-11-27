"""
V4's two tests applied to the level 4 trial (the off-list ogive, r_n/R 0.10,
Mach 1.3), recorded whatever they give (the registration, O3). The trial is
not a registered run: its levels 0 to 3 were made before the review's change
6 (records tied to their files, builds and processes, and the axis's first
cell), and its level 3 ran under a limit of 40,000 (registered: 60,000; it
converged at 38,540, so the limit did not bind). This script fills only what
those older records lack, from the files themselves, and prints every item it
filled or waived; nothing else of ofjudge's V4 is changed.

    python3 -I trialv4.py <trial folder>
"""
import copy, json, os, sys

REF = "/home/user/bowshock/docs/research/w6-reference"
sys.path.insert(0, REF)
import numpy as np
import ofjudge, ofref, w6ref

run = sys.argv[1]
build = lambda w: w6ref.capped_spec("ogive", 4.0, 0.10, 1.3, w)
notes = []

_levels_of = ofjudge.levels_of


def levels_of(r):
    recs = copy.deepcopy(_levels_of(r))
    for k, rec in recs.items():
        d = os.path.join(r, f"L{k}")
        filled = []
        for key, f in (("monitorSha256", "monitor.csv"), ("wallSha256", "wall.csv")):
            if key not in rec:
                rec[key] = ofref.file_hash(os.path.join(d, f))
                filled.append(f"{key} from its {f}")
        if "processes" not in rec:
            rec["processes"] = ofref.PROCESSES[k]
            filled.append(f"processes {ofref.PROCESSES[k]} (the trial's, as registered)")
        if not rec.get("builds"):
            rec["builds"] = [{key: ok[0] for key, ok in ofref.REGISTERED_BUILD.items()}]
            filled.append("builds (not recorded; the trial ran on this machine's one build)")
        if "convergedAt" not in rec and rec.get("exit") == 0:
            # The registered rule (O3): five monitor rows in a row at or below the target;
            # the first row that ends such a run, if any.
            m = np.loadtxt(os.path.join(d, "monitor.csv"), delimiter=",", skiprows=1, ndmin=2)
            m = m[m[:, 0] >= (rec.get("stage2From") or 0)]
            ok = m[:, 1] <= ofref.REGISTERED["target"]
            c = next((int(m[i, 0]) for i in range(4, len(m)) if ok[i - 4:i + 1].all()), None)
            rec["convergedAt"] = c
            filled.append(f"convergedAt {c} from its monitor (five rows in a row at or below 1e-10)")
        if "wallCellTotalPressure" not in rec and rec.get("exit") == 0:
            tdir = os.path.join(d, str(rec["time"]))
            s = ofref.stagnation(tdir, rec["ni"], rec["nj"], 1.3)
            rec["wallCellTotalPressure"] = s["wallCellTotalPressure"]
            filled.append(f"wallCellTotalPressure {s['wallCellTotalPressure']:.6f} from its save {rec['time']}")
        if filled and (k, tuple(filled)) not in [(n[0], tuple(n[1])) for n in notes]:
            notes.append((k, filled))
    return recs


ofjudge.levels_of = levels_of
_spec_problem = ofjudge.spec_problem


def spec_problem(r, recs, b):
    p = _spec_problem(r, recs, b)
    waived = "level 3's iteration limit 40000 (registered 60000)"
    if p == waived and recs[3].get("converged") and recs[3]["iterations"] < 40000:
        if ("-", [f"waived: {waived}; level 3 converged at {recs[3]['iterations']}"]) not in notes:
            notes.append(("-", [f"waived: {waived}; level 3 converged at {recs[3]['iterations']}"]))
        return ""
    return p


ofjudge.spec_problem = spec_problem

out = ofjudge.check_v4(run, build)
for k, items in notes:
    print(f"L{k}:" if k != "-" else "spec:", "; ".join(items))


def show(name, c):
    print(f"--- {name}: pass {c['pass']}")
    for side in ("levels1to3", "levels2to4"):
        e = c.get(side, {})
        keys = ("value", "u", "uRegistered", "uGrid", "uGridRegistered", "uTotal", "uDist", "uCap", "uIter", "r",
                "rho", "rhoVertex", "order", "failures")
        print(f"  {side}:", json.dumps({x: e.get(x) for x in keys if x in e}, default=str))
    for x in ("D3", "D4", "step", "allowedStep", "insideRegistered", "insideAmended", "inside", "why"):
        if x in c:
            print(f"  {x}: {c[x]}")


show("charged", out)
show("without the charge", out["withoutCharge"])
print("V4 on the trial:", "PASS" if out["pass"] else "FAIL")
