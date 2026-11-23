"""Where OpenFOAM's limiter acts (psi < 1) and where it switches between two saves (T level 3)."""
import re, sys, numpy as np
sys.path.insert(0, "/home/user/bowshock/docs/research/w6-reference")
import w6ref
def rd(p):
    t = open(p).read()
    m = re.search(r"internalField\s+nonuniform\s+List<\w+>\s*\n?(\d+)\s*\(", t)
    n = int(m.group(1)); body = t[m.end():]
    rows = re.findall(r"\(([^()]*)\)", body[: body.find("\n)\n")])
    a = np.array([[float(v) for v in r.split()] for r in rows]); assert len(a) == n
    return a
base = sys.argv[1]
spec = w6ref.capped_spec("hemisphere", 0.5, 1.0, 2.5)
nose, x, r, marks = w6ref.grid(spec, 3); ni, nj = x.shape[0]-1, x.shape[1]-1
def psi(t, f):
    gl, gu = rd(f"{base}/lim/{t}/{f}"), rd(f"{base}/un/{t}/{f}")
    if gl.shape[1] == 3:  # scalar field: psi * grad
        den = (gu**2).sum(1)
        return np.where(den > 0, (gl*gu).sum(1)/np.where(den > 0, den, 1), 1.0).reshape(ni, nj)[..., None]
    # vector field: row k of the tensor scaled per component (cmptMultiply(limiter, g.x())...) -> components of the limiter
    gl = gl.reshape(-1, 3, 3); gu = gu.reshape(-1, 3, 3)
    out = []
    for c in range(2):  # Ux, Uy (Uz ~ 0 on the wedge)
        num = (gl[:, :, c]*gu[:, :, c]).sum(1); den = (gu[:, :, c]**2).sum(1)
        out.append(np.where(den > 0, num/np.where(den > 0, den, 1), 1.0))
    return np.stack(out, 1).reshape(ni, nj, 2)
for f in ("grad(rho)", "grad(T)", "grad(U)"):
    a, b = psi("4866", f), psi("5000", f)
    act = (b < 0.999).any(-1)
    sw = (np.abs(b - a) > 0.05).any(-1)
    print(f"{f}: limited (psi<0.999) in {act.mean():.1%} of cells; changed by >0.05 between saves in {sw.sum()} cells")
    # by region: i bands and j relative to the shock (j ~ 131 at i 20-60)
    for (i0, i1) in ((0, 30), (30, 64), (64, 128), (128, 512)):
        for (j0, j1, name) in ((0, 8, "wall 0-7"), (8, 120, "layer 8-119"), (120, 145, "shock 120-144"), (145, 256, "outside")):
            s = sw[i0:i1, j0:j1].sum(); ac = act[i0:i1, j0:j1].mean()
            if s or ac > 0.05:
                print(f"   i {i0}-{i1} j {name}: limited {ac:.0%}, switched {s}")
