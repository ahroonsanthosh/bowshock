"""Set-up trial: level 1 of T at a wedge half-angle, points on z = +-y tan(a); one pass, Courant 0.2."""
import math, os, subprocess, sys
sys.path.insert(0, "/home/user/bowshock/docs/research/w6-reference")
sys.path.insert(0, "/tmp/claude-0/-home-user-bowshock/328f6bc6-7d2a-543f-a832-b5d31d25c169/scratchpad/of/tools")
import w6ref, ofref, ladder
half = float(sys.argv[1]); case = sys.argv[2]; iters = int(sys.argv[3])
ofref.HALF = half
ofref.WEDGE_TO_BODY = math.pi / math.tan(math.radians(half))
spec = w6ref.capped_spec("hemisphere", 0.5, 1.0, 2.5)
nose, x, r, marks = w6ref.grid(spec, 1)
os.makedirs(case, exist_ok=True)
ofref.write_polymesh(case, x, r, marks)
ofref.write_case(case, spec, dict(ofref.SETTINGS, maxCo=0.2), iters)
ladder.schemes(case, ladder.GRAD)
c = subprocess.call(["bash", "-c", "source /opt/openfoam13/etc/bashrc; foamRun > log.run 2>&1"], cwd=case)
m = ofref.read_monitor(case, 2.5)
q = m[-len(m)//4:, 2]
nose, x, r, marks = w6ref.grid(spec, 1)
w = ofref.wall_faces(os.path.join(case, str(iters)), x, r, marks, 2.5)
st = ofref.stagnation(os.path.join(case, str(iters)), 128, 64, 2.5)
print(f"half {half}: exit {c} monitor drag {m[-1,2]:.8f} faces drag {ofref.faces_drag(w):.8f} range {q.max()-q.min():.1e} wall cell Cp {st['cpWallFirstCell']:.5f} axis p0 near wall {st['axisTotalPressure'][0]:.5f}", flush=True)
