"""Round 5 extras: (1) the fin tip faces, wetted and not represented; (2) 0010 section 4.1's drawn-cone
interpretation (half-angle atan(0.5/2.84) lowers the cone's drag by 0.24% to 0.25%); (3) the laminar band's
high end as a base pressure."""
import json
import math
import sys
import indep_lib as L
import bf_total_indep as B

res = json.load(open(sys.argv[1]))
d = B.face_angle()
n = 200000
xt, yt = B.R_LE * (1 - math.sin(d)), B.R_LE * math.cos(d)
area = 0.0
for i in range(n):
    x = (i + 0.5) / n
    yy = math.sqrt(max(B.R_LE ** 2 - (x - B.R_LE) ** 2, 0.0)) if x < xt else yt + (x - xt) * math.tan(d)
    area += 2 * yy / n
print(f"=== 1. fin tip faces: 4 x {area:.5f} cal^2, parallel to the stream, no friction counted")
for o in res:
    Rec = o["ReL"] / 10
    CF = L.flat_plate_CF(Rec, o["M"], B.T_AIR)
    tip = CF * B.N_FIN * area / B.A_REF
    b9 = L.body_momentum_integral(Rec, o["M"], B.T_AIR, B.TH_C, B.L_CONE, 9.0, n_cone=2000, n_cyl=1000)
    b10 = L.body_momentum_integral(Rec, o["M"], B.T_AIR, B.TH_C, B.L_CONE, 10.0, n_cone=2000, n_cyl=1000)
    root = 4 * (b10["psi_end"] - b9["psi_end"]) * B.N_FIN * area / B.A_REF
    print(f"  {o['shot']} M {o['M']:.3f}: tip faces +{tip:.5f}, root footprint -{root:.5f}, net {tip - root:+.5f} "
          f"({100 * (tip - root) / o['total']:+.3f}% of the total)")

print("=== 2. the drawn cone, half-angle atan(0.5/2.84)")
for M in (1.799, 2.97):
    a = L.cone_cp(M, B.TH_C)[0]
    b = L.cone_cp(M, math.atan(0.5 / 2.84))[0]
    print(f"  M {M}: 10 deg {a:.5f}, {math.degrees(math.atan(0.5 / 2.84)):.3f} deg {b:.5f}: {100 * (b / a - 1):+.2f}%, {b - a:+.2e}")

print("=== 3. the trailing-edge laminar band's high end as a base pressure (p_b / p_inf = 1 - ratio (1 - nominal))")
for o in res:
    M = o["M"]
    pbp = 1 + o["PB_te"] * L.G * M * M / 2
    hi = 1 + o["te_lam_rel"][1]
    print(f"  {o['shot']} M {M:.3f}: nominal {pbp:.3f}; at the laminar high end {1 - hi * (1 - pbp):+.3f}; "
          f"with the model-form high too {1 - (hi + 0.21) * (1 - pbp):+.3f}")
