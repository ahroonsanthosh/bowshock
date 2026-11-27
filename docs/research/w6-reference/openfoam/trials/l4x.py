"""
Level 4 cycle trials: copy the level 4 trial's 100,000 save (or another case's latest save) into a new case,
change only the named settings, run a set number of iterations on four
processes, and print the residual and drag every 100 iterations.

    python3 -I l4x.py <name> <iterations> [key=value ...]

keys: maxCo, smooth (rDeltaTSmoothingCoeff), outer (nOuterCorrectors), K
(the limiter's), from (another trial's folder to start from, its latest save),
every (the save interval, 200 by default).
"""
import os, re, shutil, subprocess, sys

S = "/tmp/claude-0/-home-user-bowshock/328f6bc6-7d2a-543f-a832-b5d31d25c169/scratchpad/of"
SRC = f"{S}/O13K10/L4"
name, n = sys.argv[1], int(sys.argv[2])
opts = dict(a.split("=", 1) for a in sys.argv[3:])
src = opts.pop("from", SRC)
dst = f"{S}/L4x/{name}"
if os.path.exists(dst):
    sys.exit(f"{dst} exists")
os.makedirs(dst)


def latest(d):
    ts = [x for x in os.listdir(d) if re.fullmatch(r"\d+", x)]
    return max(ts, key=int)


t0 = latest(f"{src}/processor0")
NP = len([x for x in os.listdir(src) if re.fullmatch(r"processor\d+", x)])  # as the source was decomposed
for x in ("0", "constant", "system"):
    shutil.copytree(f"{src}/{x}", f"{dst}/{x}")
for p in range(NP):
    os.makedirs(f"{dst}/processor{p}")
    shutil.copytree(f"{src}/processor{p}/constant", f"{dst}/processor{p}/constant")
    shutil.copytree(f"{src}/processor{p}/{t0}", f"{dst}/processor{p}/{t0}")


def sub(path, pat, rep):
    t = open(path).read()
    t2, k = re.subn(pat, rep, t)
    if k != 1:
        sys.exit(f"{path}: {pat} matched {k} times")
    open(path, "w").write(t2)


sub(f"{dst}/system/controlDict", r"endTime\s+\d+;", f"endTime         {int(t0) + n};")
# OpenFOAM counts the save interval from iteration 0: save every 200 (or every=)
# iterations, so the end is saved if it is a multiple of that.
every = int(opts.pop("every", "200"))
if (int(t0) + n) % every:
    sys.exit(f"the end (start plus iterations) must be a multiple of {every}")
sub(f"{dst}/system/controlDict", r"writeInterval \d+;", f"writeInterval {every};")
if "maxCo" in opts:
    sub(f"{dst}/system/fvSolution", r"maxCo\s+[\d.e-]+;", f"maxCo           {opts['maxCo']};")
if "smooth" in opts:
    sub(f"{dst}/system/fvSolution", r"rDeltaTSmoothingCoeff\s+[\d.e-]+;", f"rDeltaTSmoothingCoeff {opts['smooth']};")
if "outer" in opts:
    sub(f"{dst}/system/fvSolution", r"nOuterCorrectors\s+\d+;", f"nOuterCorrectors {opts['outer']};")
if "K" in opts:
    sub(f"{dst}/system/fvSchemes", r"cellVenkatakrishnan Gauss linear [\d.e-]+;",
        f"cellVenkatakrishnan Gauss linear {opts['K']};")
for p in range(NP):
    for f in ("controlDict", "fvSolution", "fvSchemes"):
        d = f"{dst}/processor{p}/system"
        if os.path.isdir(d):
            shutil.copy(f"{dst}/system/{f}", d)
print(f"{dst}: from {src} at {t0}, {n} iterations on {NP} processes, {opts}", flush=True)
cmd = f"source /opt/openfoam13/etc/bashrc; mpirun --allow-run-as-root --bind-to none -np {NP} foamRun -parallel"
with open(f"{dst}/log.run", "w") as log:
    rc = subprocess.call(["bash", "-c", cmd], cwd=dst, stdout=log, stderr=subprocess.STDOUT)
print("exit", rc, flush=True)
