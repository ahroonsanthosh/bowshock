"""Set-up trial: levels 0..L-1 of a case on OpenFOAM, each seeded from the one below (mapFields)."""
import json, os, subprocess, sys
sys.path.insert(0, "/home/user/bowshock/docs/research/w6-reference")
import w6ref, ofref

GRAD = "cellLimited<Venkatakrishnan> Gauss linear 1"

def schemes(case, grad):
    fs = open(f"{case}/system/fvSchemes").read()
    fs = fs.replace("reconstruct(rho) vanLeer;", "reconstruct(rho) linearUpwind grad(rho);").replace("reconstruct(U)  vanLeerV;", "reconstruct(U)  linearUpwindV grad(U);").replace("reconstruct(T)  vanLeer;", "reconstruct(T)  linearUpwind grad(T);")
    fs = fs.replace("    default         Gauss linear;\n}", f"    default         {grad};\n}}", 1)
    if os.environ.get("LADDER_UPLAIN"):
        assert "reconstruct(U)  linearUpwindV grad(U);" in fs
        fs = fs.replace("reconstruct(U)  linearUpwindV grad(U);", "reconstruct(U)  linearUpwind grad(U);")
    open(f"{case}/system/fvSchemes", "w").write(fs)

import re, time

DEADLINE = float(os.environ.get("LADDER_DEADLINE", "inf"))  # seconds since the epoch: save and stop before it


TARGET = float(os.environ["LADDER_TARGET"]) if "LADDER_TARGET" in os.environ else None  # log10 of the monitor's residual


def converged(case):
    """The monitor's last 5 rows (50 iterations) all at or below TARGET."""
    import math
    d = os.path.join(case, "postProcessing", "resid")
    if not os.path.isdir(d) or not os.listdir(d):
        return False
    last = max(os.listdir(d), key=float)
    try:
        rows = [l.split() for l in open(os.path.join(d, last, "volFieldValue.dat")) if l.strip() and not l.startswith("#")]
    except OSError:
        return False
    vals = []
    for r in rows[-5:]:
        try:
            vals.append(0.5 * math.log10(max(float(r[1]), 1e-300)) - math.log10(1.4))
        except (ValueError, IndexError):
            return False
    return len(vals) == 5 and max(vals) <= TARGET


def set_control(case, key, value):
    path = f"{case}/system/controlDict"
    cd = open(path).read()
    cd = re.sub(rf"^{key}\s+[^;]*;", f"{key} {value};", cd, count=1, flags=re.M)
    open(path, "w").write(cd)


def foam(cmd, case, log, solver=False):
    """Run an OpenFOAM command; a solver run is told to save and stop (writeNow) 5 minutes before DEADLINE."""
    with open(os.path.join(case, log), "w") as f:
        proc = subprocess.Popen(["bash", "-c", "source /opt/openfoam13/etc/bashrc; " + cmd], cwd=case, stdout=f, stderr=subprocess.STDOUT)
        if not solver:
            return proc.wait()
        stopped = False
        while proc.poll() is None:
            if TARGET is not None and not stopped and converged(case):
                set_control(case, "stopAt", "writeNow")
                stopped = True
                print(f"converged: {case} (residual at or below 1e{TARGET})", flush=True)
            if time.time() > DEADLINE - 300:
                set_control(case, "stopAt", "writeNow")
                try:
                    proc.wait(timeout=240)
                except subprocess.TimeoutExpired:
                    proc.terminate()
                    proc.wait()
                set_control(case, "stopAt", "endTime")
                print(f"window closing: {case} saved and stopped", flush=True)
                sys.exit(3)
            time.sleep(10)
        return proc.returncode

def run(root, spec, levels, iters, np_, grad=GRAD, maxco=0.5, outer=1):
    out = []
    for lv in range(levels):
        case = os.path.join(root, f"L{lv}")
        nose, x, r, marks = w6ref.grid(spec, lv)
        ni, nj = x.shape[0] - 1, x.shape[1] - 1
        if not os.path.exists(os.path.join(case, "done.json")):
            fresh = not os.path.exists(os.path.join(case, "system", "controlDict"))
            if fresh:
                os.makedirs(case, exist_ok=True)
                ofref.write_polymesh(case, x, r, marks)
                ofref.write_case(case, spec, dict(ofref.SETTINGS, maxCo=maxco), iters[lv])
                schemes(case, grad)
                if outer > 1:
                    fv = open(f"{case}/system/fvSolution").read().replace("PIMPLE\n{\n", f"PIMPLE\n{{\n    nOuterCorrectors {outer};\n")
                    open(f"{case}/system/fvSolution", "w").write(fv)
                cd = open(f"{case}/system/controlDict").read().replace(f"writeInterval   {iters[lv]};", "writeInterval   5000;").replace("startFrom       startTime;", "startFrom       latestTime;")
                open(f"{case}/system/controlDict", "w").write(cd)
                if lv > 0:
                    c = foam(f"mapFields ../L{lv-1} -consistent -sourceTime latestTime", case, "log.map")
                    assert c == 0, "mapFields failed"
                if np_[lv] > 1:
                    open(f"{case}/system/decomposeParDict", "w").write(ofref.HEADER.format(cls="dictionary", loc="system", obj="decomposeParDict") + f"numberOfSubdomains {np_[lv]};\ndecomposer scotch;\n")
                    assert foam("decomposePar -force", case, "log.decompose") == 0
            k = len([f for f in os.listdir(case) if f.startswith("log.run")])
            if np_[lv] > 1:
                set_control(case, "runTimeModifiable", "true")
                set_control(case, "stopAt", "endTime")
                c = foam(f"mpirun --allow-run-as-root -np {np_[lv]} foamRun -parallel", case, f"log.run{k}", solver=True)
                assert c == 0, f"run failed {c}"
                assert foam("reconstructPar -latestTime", case, "log.reconstruct") == 0
            else:
                set_control(case, "runTimeModifiable", "true")
                set_control(case, "stopAt", "endTime")
                c = foam("foamRun", case, f"log.run{k}", solver=True)
                assert c == 0, f"run failed {c}"
            m = ofref.read_monitor(case, spec["mach"])
            q = m[-len(m)//4:, 2]
            last = max(int(t) for t in os.listdir(case) if t.isdigit())
            st = ofref.stagnation(os.path.join(case, str(last)), ni, nj, spec["mach"]) if spec["rn"] > 0 else {"cpWallFirstCell": float("nan"), "pitotCp": w6ref.pitot_cp(spec["mach"]), "axisTotalPressure": [float("nan")]}
            rec = {"level": lv, "iters": int(m[-1, 0]), "logRes": float(m[-1, 1]), "drag": float(m[-1, 2]), "dragRangeLastQuarter": float(q.max() - q.min()),
                   "cpWallFirstCell": st["cpWallFirstCell"], "pitotCp": st["pitotCp"], "axisP0": st["axisTotalPressure"]}
            json.dump(rec, open(os.path.join(case, "done.json"), "w"))
        rec = json.load(open(os.path.join(case, "done.json")))
        out.append(rec)
        ax = rec["axisP0"]
        print(f"L{lv}: drag {rec['drag']:.7f} range {rec['dragRangeLastQuarter']:.1e} logRes {rec['logRes']:.2f} wall cell Cp {rec['cpWallFirstCell']:.4f} ({rec['cpWallFirstCell']/rec['pitotCp']-1:+.2%}) axis p0/pitot near wall {ax[0]:.4f}, mid {ax[len(ax)//2]:.4f}", flush=True)
    return out

if __name__ == "__main__":
    root, mach, shape, cal, ratio = sys.argv[1], float(sys.argv[2]), sys.argv[3], float(sys.argv[4]), float(sys.argv[5])
    levels = int(sys.argv[6]); iters = [int(v) for v in sys.argv[7].split(",")]; np_ = [int(v) for v in sys.argv[8].split(",")]
    spec = w6ref.capped_spec(shape, cal, ratio, mach) if ratio > 0 else w6ref.sharp_spec(shape, cal, mach)
    outer = int(sys.argv[9]) if len(sys.argv) > 9 else 1
    maxco = float(sys.argv[10]) if len(sys.argv) > 10 else 0.5
    run(root, spec, levels, iters, np_, outer=outer, maxco=maxco)
