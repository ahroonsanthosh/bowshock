"""Round 5: size of an assumption the total states only in 0007's docstrings: friction at free-stream edge
conditions. On the cone the edge is the Taylor-Maccoll surface state. Turbulent flat-plate van Driest II over
the cone's slant length, times Mangler-type geometry identical for both, so the ratio is
q_c CF(Re_c, M_c, T_c) / (q_inf CF(Re_inf, M_inf, T_inf))."""
import math
import indep_lib as L
import bf_total_indep as B

G = L.G
for name, M, CX0, ReL, cl in (B.SHOTS[0], B.SHOTS[5], B.SHOTS[-1]):
    cp, beta, Mc = L.cone_cp(M, B.TH_C)
    pc = 1 + cp * G / 2 * M * M
    T0 = B.T_AIR * (1 + 0.2 * M * M)
    Tc = T0 / (1 + 0.2 * Mc * Mc)
    rho_c = pc / (Tc / B.T_AIR)                      # rho_c / rho_inf
    u_c = Mc * math.sqrt(Tc / B.T_AIR) / M            # u_c / U_inf
    mu_c = L.mu_rel(Tc, B.T_AIR)
    q_ratio = rho_c * u_c ** 2
    re_ratio = rho_c * u_c / mu_c
    s = B.L_CONE / math.cos(B.TH_C)
    Re_inf = ReL / 10 * s
    cf_inf = L.turb_CF(Re_inf, M, B.T_AIR)
    cf_c = L.turb_CF(Re_inf * re_ratio, Mc, Tc)
    ratio = q_ratio * cf_c / cf_inf
    print(f"{name} M {M}: cone M_c {Mc:.3f}, q_c/q {q_ratio:.3f}, Re_c/Re {re_ratio:.3f}, friction ratio {ratio:.3f}")

print("cone share of the body friction (momentum integral, axial) and the implied change of the total")
for name, M, CX0, ReL, cl in B.SHOTS:
    R = ReL / 10
    b = L.body_momentum_integral(R, M, B.T_AIR, B.TH_C, B.L_CONE, B.L_BODY, n_cone=3000, n_cyl=1500)
    cone = 4 * math.pi * math.cos(B.TH_C) * b["psi_cone"] / B.A_REF
    cp, beta, Mc = L.cone_cp(M, B.TH_C)
    pc = 1 + cp * G / 2 * M * M
    T0 = B.T_AIR * (1 + 0.2 * M * M)
    Tc = T0 / (1 + 0.2 * Mc * Mc)
    rho_c = pc / (Tc / B.T_AIR)
    u_c = Mc * math.sqrt(Tc / B.T_AIR) / M
    mu_c = L.mu_rel(Tc, B.T_AIR)
    s = B.L_CONE / math.cos(B.TH_C)
    ratio = rho_c * u_c ** 2 * L.turb_CF(R * s * rho_c * u_c / mu_c, Mc, Tc) / L.turb_CF(R * s, M, B.T_AIR)
    print(f"  {name} M {M:.3f}: cone friction {cone:.4f} of {b['cd_axial']:.4f} ({100 * cone / b['cd_axial']:.0f}%); "
          f"at the cone's own edge state x {ratio:.3f}: {cone * (ratio - 1):+.4f} in C_D")
