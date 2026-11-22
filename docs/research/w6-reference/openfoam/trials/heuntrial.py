"""Set-up trial: levels of a case with shockFluidHeun (Heun's step: two passes, the fluxes averaged), from a given level 0.
heuntrial.py <root> <maxCo> <levels> <iters,...> <np,...> [<copy L0 from>] [sharp cone 3 Mach 2 | capped <shape> <cal> <ratio> <mach>]"""
import os, shutil, sys
sys.path.insert(0, "/home/user/bowshock/docs/research/w6-reference")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import w6ref, ofref, ladder
root, maxco, levels = sys.argv[1], float(sys.argv[2]), int(sys.argv[3])
iters = [int(v) for v in sys.argv[4].split(",")]; np_ = [int(v) for v in sys.argv[5].split(",")]
src = sys.argv[6] if len(sys.argv) > 6 and sys.argv[6] != "-" else None
kind = sys.argv[7:] or ["sharp", "cone", "3", "2.0"]
if kind[0] == "sharp":
    spec = w6ref.sharp_spec(kind[1], float(kind[2]), float(kind[3]))
else:
    spec = w6ref.capped_spec(kind[1], float(kind[2]), float(kind[3]), float(kind[4]))
orig = ofref.write_case
def write_case(case, *a, **k):
    orig(case, *a, **k)
    path = f"{case}/system/controlDict"
    s = open(path).read()
    assert "solver          shockFluid;" in s
    open(path, "w").write(s.replace("solver          shockFluid;", "solver          shockFluidHeun;"))
ofref.write_case = write_case
if os.environ.get("HEUN_FIRST"):
    orig_s = ladder.schemes
    def first_order(case, grad):
        orig_s(case, grad)
        fs = open(f"{case}/system/fvSchemes").read()
        for a in ("linearUpwind grad(rho)", "linearUpwindV grad(U)", "linearUpwind grad(T)"):
            assert a in fs
            fs = fs.replace(a, "upwind")
        open(f"{case}/system/fvSchemes", "w").write(fs)
    ladder.schemes = first_order
if os.environ.get("HEUN_FLUX"):
    orig_s2 = ladder.schemes
    def flux(case, grad):
        orig_s2(case, grad)
        fs = open(f"{case}/system/fvSchemes").read()
        import re
        fs, n = re.subn(r"fluxScheme\s+Kurganov;", "fluxScheme " + os.environ["HEUN_FLUX"] + ";", fs)
        assert n == 1
        open(f"{case}/system/fvSchemes", "w").write(fs)
    ladder.schemes = flux
if src and not os.path.exists(f"{root}/L0"):
    shutil.copytree(src, f"{root}/L0")
ladder.run(root, spec, levels, iters, np_, grad=os.environ.get("HEUN_GRAD", ladder.GRAD), maxco=maxco, outer=2)
