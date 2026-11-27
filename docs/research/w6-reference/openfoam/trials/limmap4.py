"""
Where the limiter acts in the trial ogive's shock layer (4 calibers, r_n/R 0.10, Mach 1.3).

    python3 -I limmap4.py <tag> <case> <time> <level> <K> [<time2>]

Copies the case's mesh and the save's rho, U, T (reconstructing a decomposed
case), writes grad(rho), grad(U), grad(T) with cellVenkatakrishnan at K and
unlimited (Gauss linear), and prints, by band of the cap, the share of cells
where the limiter acts (psi < 0.999) and the mean of 1 - psi. psi is the
limited gradient over the unlimited one, per field and component. With a
second save, also counts the cells where psi changes by more than 0.05.
Runs on one core.
"""
import os, re, shutil, subprocess, sys
import numpy as np

S = "/tmp/claude-0/-home-user-bowshock/328f6bc6-7d2a-543f-a832-b5d31d25c169/scratchpad/of"
sys.path.insert(0, "/home/user/bowshock/docs/research/w6-reference")
import w6ref, ofref

tag, case, t0, lv, K = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), sys.argv[5]
times = [t0] + sys.argv[6:7]
base = f"{S}/lm/{tag}"
if os.path.exists(base):
    sys.exit(f"{base} exists")
OF = "source /opt/openfoam13/etc/bashrc; "


def sh(cmd, cwd, log):
    with open(f"{cwd}/{log}", "w") as f:
        rc = subprocess.call(["bash", "-c", OF + cmd], cwd=cwd, stdout=f, stderr=subprocess.STDOUT)
    if rc:
        sys.exit(f"{cwd}: {cmd} exit {rc}")


# a reconstructed copy holding rho, U, T (and p) at each time
src = f"{base}/src"
os.makedirs(src)
for x in ("constant", "system"):
    shutil.copytree(f"{case}/{x}", f"{src}/{x}")
if os.path.isdir(f"{case}/processor0"):
    n = len([d for d in os.listdir(case) if re.fullmatch(r"processor\d+", d)])
    for p in range(n):
        os.makedirs(f"{src}/processor{p}")
        shutil.copytree(f"{case}/processor{p}/constant", f"{src}/processor{p}/constant")
        for t in times:
            os.makedirs(f"{src}/processor{p}/{t}")
            for fld in ("rho", "U", "T", "p"):
                shutil.copy(f"{case}/processor{p}/{t}/{fld}", f"{src}/processor{p}/{t}/{fld}")
    sh(f"reconstructPar -time {','.join(times)} -fields '(rho U T p)'", src, "log.reconstruct")
else:
    for t in times:
        os.makedirs(f"{src}/{t}")
        for fld in ("rho", "U", "T", "p"):
            shutil.copy(f"{case}/{t}/{fld}", f"{src}/{t}/{fld}")

for v, scheme in (("lim", f"cellVenkatakrishnan Gauss linear {K};"), ("un", "Gauss linear;")):
    d = f"{base}/{v}"
    os.makedirs(d)
    shutil.copytree(f"{src}/constant", f"{d}/constant")
    shutil.copytree(f"{src}/system", f"{d}/system")
    for t in times:
        shutil.copytree(f"{src}/{t}", f"{d}/{t}")
    fs = open(f"{d}/system/fvSchemes").read()
    fs2, k = re.subn(r"(gradSchemes\s*\{\s*default\s+)[^;]*;", lambda m: m.group(1) + scheme, fs)
    assert k == 1
    open(f"{d}/system/fvSchemes", "w").write(fs2)
    # one save at a time, the other moved aside: with the case starting from its
    # latest save, foamPostProcess did not write the gradient at an earlier one
    for t in times:
        others = [u for u in times if u != t]
        for u in others:
            os.rename(f"{d}/{u}", f"{d}/hold.{u}")
        for fld in ("rho", "U", "T"):
            sh(f"foamPostProcess -time {t} -func 'grad({fld})'", d, f"pp.{fld}.{t}.log")
        for u in others:
            os.rename(f"{d}/hold.{u}", f"{d}/{u}")

spec = w6ref.capped_spec("ogive", 4.0, 0.10, 1.3)
nose, x, r, marks = w6ref.grid(spec, lv)
ni, nj = x.shape[0] - 1, x.shape[1] - 1


def rd(path):
    """Any internal field (scalar, vector or tensor) from an ASCII field file, one row per cell."""
    txt = open(path).read()
    m = re.search(r"internalField\s+nonuniform\s+List<(\w+)>\s*\n?(\d+)\s*\(", txt)
    n = int(m.group(2)); body = txt[m.end():]
    if m.group(1) == "scalar":
        a = np.array(body.split(")", 1)[0].split(), dtype=float)
    else:
        body = body.split("\n)\n", 1)[0]
        a = np.array([[float(v) for v in ln.strip("() ").split()] for ln in body.split("\n") if ln.strip()])
    assert len(a) == n
    return a


def psi(t, f):
    gl = rd(f"{base}/lim/{t}/{f}")
    gu = rd(f"{base}/un/{t}/{f}")
    if gl.shape[1] == 3:  # scalar field: grad scaled by psi
        den = (gu ** 2).sum(1)
        return np.where(den > 0, (gl * gu).sum(1) / np.where(den > 0, den, 1), 1.0).reshape(ni, nj)[..., None]
    # grad(U): column c (the derivatives of U's component c) scaled by that component's psi
    gl = gl.reshape(-1, 3, 3); gu = gu.reshape(-1, 3, 3)
    out = []
    for c in range(2):  # Ux, Uy (Uz is zero on the wedge)
        num = (gl[:, :, c] * gu[:, :, c]).sum(1); den = (gu[:, :, c] ** 2).sum(1)
        out.append(np.where(den > 0, num / np.where(den > 0, den, 1), 1.0))
    return np.stack(out, 1).reshape(ni, nj, 2)


p = rd(f"{base}/un/{t0}/p").reshape(ni, nj)
# the shock on each ray: the largest pressure jump outward
js = np.argmax(np.abs(np.diff(p, axis=1)), axis=1)
icap = ni // 16  # the cap's first sixteenth of the wall cells (where the cycle's residual is)
print(f"{tag}: level {lv} ({ni}x{nj}), time {t0}, K {K}; shock j on rays 0, {icap // 2}, {icap - 1}: "
      f"{js[0]}, {js[icap // 2]}, {js[icap - 1]}")
jj = np.arange(nj)[None, :]
bands = {
    "layer (wall+2 to shock-6)": (jj >= 2) & (jj <= js[:, None] - 6),
    "shock (shock-5 to shock+5)": (jj >= js[:, None] - 5) & (jj <= js[:, None] + 5),
    "ahead (shock+6 on)": jj >= js[:, None] + 6,
}
for f in ("grad(rho)", "grad(T)", "grad(U)"):
    a = psi(t0, f)
    act = (a < 0.999).any(-1)
    m1 = (1 - a).max(-1)
    line = []
    for name, mask in bands.items():
        mk = mask[:icap]
        line.append(f"{name}: acts in {act[:icap][mk].mean():.1%}, mean 1-psi {m1[:icap][mk].mean():.2e}")
    print(f"  {f}, cap (i < {icap}): " + "; ".join(line))
    if len(times) > 1:
        b = psi(times[1], f)
        sw = (np.abs(b - a) > 0.05).any(-1)
        print(f"    changes by > 0.05 from {t0} to {times[1]}: "
              + ", ".join(f"{name} {int(sw[:icap][mask[:icap]].sum())} of {int(mask[:icap].sum())}"
                          for name, mask in bands.items()))
