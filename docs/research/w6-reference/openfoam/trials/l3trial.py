"""Diagnostic: restart a saved state with another gradient scheme and run N iterations (set-up trial, not registered)."""
import os, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ladder, ofref
src, t0, dst, grad, np_, n = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], int(sys.argv[5]), int(sys.argv[6])
if not os.path.exists(f"{dst}/system/controlDict"):
    os.makedirs(dst, exist_ok=True)
    for d in ("constant", "system", t0):
        shutil.copytree(f"{src}/{d}", f"{dst}/{d}", dirs_exist_ok=True)
    fs = open(f"{dst}/system/fvSchemes").read()
    old = "    default         cellLimited<Venkatakrishnan> Gauss linear 1;\n"
    assert old in fs
    open(f"{dst}/system/fvSchemes", "w").write(fs.replace(old, f"    default         {grad};\n"))
    ladder.set_control(dst, "endTime", str(int(t0) + n))
    ladder.set_control(dst, "writeInterval", "1000")
    if np_ > 1:
        open(f"{dst}/system/decomposeParDict", "w").write(ofref.HEADER.format(cls="dictionary", loc="system", obj="decomposeParDict") + f"numberOfSubdomains {np_};\ndecomposer scotch;\n")
        assert ladder.foam("decomposePar -force", dst, "log.decompose") == 0
k = len([f for f in os.listdir(dst) if f.startswith("log.run")])
ladder.set_control(dst, "stopAt", "endTime")
cmd = f"mpirun --allow-run-as-root -np {np_} foamRun -parallel" if np_ > 1 else "foamRun"
c = ladder.foam(cmd, dst, f"log.run{k}", solver=True)
print("exit", c, flush=True)
if np_ > 1:
    ladder.foam("reconstructPar -latestTime", dst, "log.reconstruct")
