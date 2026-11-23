"""Set-up trial through the registered runner (ofref.run_case): a capped case's levels with cellVenkatakrishnan at K."""
import os, sys, time
sys.path.insert(0, "/home/user/bowshock/docs/research/w6-reference")
import w6ref, ofref
root, K, shape, cal, ratio, mach = sys.argv[1], float(sys.argv[2]), sys.argv[3], float(sys.argv[4]), float(sys.argv[5]), float(sys.argv[6])
levels = int(sys.argv[7]); np_ = [int(v) for v in sys.argv[8].split(",")]; iters = [int(v) for v in sys.argv[9].split(",")]
spec = dict(w6ref.capped_spec(shape, cal, ratio, mach) if ratio > 0 else w6ref.sharp_spec(shape, cal, mach), levels=levels)
grad = os.environ.get("OF_GRAD", f"cellVenkatakrishnan Gauss linear {K:g}")
st = {"solver": "shockFluidHeun", "libs": ["libcellVenkatakrishnanGrad.so"], "flux": "Kurganov", "recon": "linearUpwind",
      "reconstruct": {"rho": "linearUpwind grad(rho)", "U": "linearUpwind grad(U)", "T": "linearUpwind grad(T)"},
      "grad": grad, "outer": 2, "maxCo": 0.5, "smoothing": 0.02,
      "target": -10, "iters": iters, "checkpoint": 5000}
if os.environ.get("OF_START_GRAD"):
    st.update(startGrad=os.environ["OF_START_GRAD"], startTarget=float(os.environ.get("OF_START_TARGET", "-10")))
deadline = float(os.environ["LADDER_DEADLINE"]) if "LADDER_DEADLINE" in os.environ else None
try:
    for rec in ofref.run_case(spec, root, st, np_, deadline=deadline):
        ax = rec.get("axisTotalPressure", [float("nan")])
        print(f"L{rec['level']}: exit {rec['exit']} it {rec.get('iterations')} logRes {rec.get('logRes', float('nan')):.2f} converged {rec.get('converged')} "
              f"stage2 from {rec.get('stage2From')} drag {rec.get('drag', float('nan')):.7f} range {rec.get('dragRangeLastQuarter', float('nan')):.1e} "
              f"stag cell {rec.get('cpStagnation', float('nan'))/rec.get('pitotCp', float('nan'))-1:+.3%} axis p0 at wall {ax[0]-1:+.3%}"
              + (f" | regions {rec['change']['regions']:.3e} vertex {rec['change']['vertex']:.3e} signed {rec['change']['signed']:+.3e}" if 'change' in rec else ""), flush=True)
except ofref.Deadline as e:
    print("window closing:", e, flush=True); sys.exit(3)
