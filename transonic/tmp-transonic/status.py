"""status.py QUEUE_LOG: the queue's current job and its latest progress line."""
import json
import os
import re
import sys

log = sys.argv[1]
lines = [l.strip() for l in open(log) if l.strip()] if os.path.exists(log) else []
current = None
for l in lines:
    m = re.match(r"\S+ start (.*)", l)
    if m:
        current = m.group(1)
    elif " end " in l:
        current = None
print("ended:", sum(1 for l in lines if " end " in l), "| current:", current)
if current:
    env = dict(kv.split("=", 1) for kv in current.split())
    if "TAG" in env:
        tag = env["TAG"]
    else:
        mach = float(env.get("MACH", "1.05"))
        mtxt = str(int(mach)) if mach == int(mach) else str(mach)
        tag = f"{env.get('BODY')}-m{mtxt}-f{env.get('FAR', '100')}-c{env.get('CYL', '10')}"
    path = f"tests/tmp-transonic/progress/{tag}.jsonl"
    if os.path.exists(path):
        rows = [json.loads(l) for l in open(path) if l.strip()]
        rows = [r for r in rows if "steps" in r]
        if rows:
            r = rows[-1]
            print(f"  {tag} r={r['refinement']} steps={r['steps']} drag={r['drag']:.9f} residual={r['residual']:.2e} seconds={r['seconds']:.0f}")
