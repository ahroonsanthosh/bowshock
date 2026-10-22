"""Append the Mach 1 r = 4 estimate (damped-oscillation fit) to its results file."""
import json

line = {
    "body": "cone7",
    "mach": 1,
    "farField": 100,
    "farRadius": 100.6072,
    "cylinder": 10,
    "refinement": 4,
    "ni": 472,
    "nj": 120,
    "drag": 0.09154858,
    "converged": True,
    "steps": 89200,
    "stoppedBy": "damped-oscillation fit",
    "fit": {
        "centre": 0.09154858,
        "windows": {"from30000": 0.09154858, "from50000": 0.09154858, "from8000": 0.09154781},
        "misfitRms": 3.19e-8,
        "amplitudeNow": 6.66e-6,
        "periodSteps": 22639,
        "decaySteps": 25360,
    },
    "note": "stopped at 89,200 steps by a container restart; the value is the centre of a damped "
    "oscillation fitted to the drag history (steps 50,000 to 89,200); checkpoint kept as "
    "states/m1-plain-f100-c10-r4-ck.held.*",
}
with open("tests/tmp-transonic/results/m1-plain-f100-c10.jsonl", "a") as f:
    f.write(json.dumps(line) + "\n")
