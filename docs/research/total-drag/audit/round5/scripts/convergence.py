"""Round 5: numerical convergence of this audit's own implementation (body momentum integral steps,
Taylor-Maccoll steps, laminar similarity domain and steps), at the first and last gated shots."""
import math
import indep_lib as L
import bf_total_indep as B

for name, M, CX0, ReL, cl in (B.SHOTS[0], B.SHOTS[-1]):
    R = ReL / 10
    a = L.body_momentum_integral(R, M, B.T_AIR, B.TH_C, B.L_CONE, B.L_BODY, n_cone=6000, n_cyl=3000)["cd_axial"]
    b = L.body_momentum_integral(R, M, B.T_AIR, B.TH_C, B.L_CONE, B.L_BODY, n_cone=12000, n_cyl=6000)["cd_axial"]
    c = L.body_momentum_integral(R, M, B.T_AIR, B.TH_C, B.L_CONE, B.L_BODY, n_cone=6000, n_cyl=3000, Re_s0=10.0)["cd_axial"]
    print(f"{name} M {M}: body friction {a:.7f}, steps doubled {b:.7f} ({b / a - 1:+.1e}), start at Re_s 10 {c:.7f} ({c / a - 1:+.1e})")
    aT = L.body_momentum_integral(R, M, B.T_AIR, B.TH_C, B.L_CONE, B.L_BODY, ReT=3e6, n_cone=6000, n_cyl=3000)["cd_axial"]
    bT = L.body_momentum_integral(R, M, B.T_AIR, B.TH_C, B.L_CONE, B.L_BODY, ReT=3e6, n_cone=12000, n_cyl=6000)["cd_axial"]
    print(f"   with Re_T 3e6: {aT:.7f}, doubled {bT:.7f} ({bT / aT - 1:+.1e})")
    p1 = L.cone_cp(M, B.TH_C, nstep=4000)[0]
    p2 = L.cone_cp(M, B.TH_C, nstep=8000)[0]
    print(f"   cone Cp {p1:.8f}, steps doubled {p2:.8f} ({p2 / p1 - 1:+.1e})")
    k1 = L.laminar_k(M, B.T_AIR)[0]
    k2 = L.laminar_k(M, B.T_AIR, eta_max=20.0, n=8000)[0]
    print(f"   laminar k {k1:.8f}, domain 20 and steps x2.9 {k2:.8f} ({k2 / k1 - 1:+.1e})")
