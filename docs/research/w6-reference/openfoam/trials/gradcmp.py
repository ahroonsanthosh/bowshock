import re, sys, numpy as np
def rd(p):
    t = open(p).read()
    m = re.search(r"internalField\s+nonuniform\s+List<\w+>\s*\n?(\d+)\s*\(", t)
    n = int(m.group(1)); body = t[m.end():]
    rows = re.findall(r"\(([^()]*)\)", body[: body.find("\n)\n")])
    a = np.array([[float(v) for v in r.split()] for r in rows]); assert len(a) == n
    return a
base = sys.argv[1]
for f in ("grad(rho)", "grad(U)", "grad(T)"):
    a = rd(f"{base}/a/{sys.argv[2]}/{f}")
    scale = np.abs(a).max()
    for v in sys.argv[3:]:
        b = rd(f"{base}/{v}/{sys.argv[2]}/{f}")
        d = np.abs(b - a)
        rel = d.max() / scale
        changed = int((d.max(1) > 1e-12 * scale).sum())
        print(f"{f} {v}: max |diff| / max |grad| = {rel:.2e}; cells changed beyond 1e-12: {changed} of {len(a)}")
