"""Round 5: independent physics checks on the Basic Finner's fin-edge terms, base and friction (blind:
from the records and the data notes only)."""
import json
import math
import sys
import indep_lib as L
import bf_total_indep as B

res = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else B.run(B.DEFAULT)
G = L.G

print("=== 1. trailing-edge base against the vacuum bound, -P_B = 2/(gamma M^2), on 0.32 cal^2")
print("  shot        M      vacuum   nominal  model-form high (1.21)  + laminar high   excess over vacuum")
worst = 0
for o in res:
    M = o["M"]
    vac = 2 / (G * M * M) * B.A_TE / B.A_REF
    te = o["te"]
    hi_mf = 1.21 * te
    hi_all = hi_mf + o["te_lam_hi"]
    ex = hi_all - vac
    worst = max(worst, ex / o["total"])
    print(f"  {o['shot']} {M:.3f}  {vac:.4f}   {te:.4f}   {hi_mf:.4f}                  {hi_all:.4f}         "
          f"{ex:+.4f} ({100 * ex / o['total']:+.2f}% of the total)")
print(f"  p_b/p_inf at the nominal: " + ", ".join(f"{o['M']:.3f}: {1 + o['PB_te'] * G * o['M'] ** 2 / 2:.3f}" for o in res))
print("  the laminar band's high end comes from the M 1.5 ratio; on each shot's own Mach number the TR 1109")
print("  fig. 29 ratio is the following (nearest of 1.5, 2.0, 3.1 not interpolated):")
for o in res:
    print(f"    {o['shot']} M {o['M']:.3f}: band {100 * o['te_lam_rel'][0]:+.1f}% to {100 * o['te_lam_rel'][1]:+.1f}%, "
          f"flags {o['lam_flags']}")

print("=== 2. modified-Newtonian front side, numerically, against 2 r (cos d - cos^3 d / 3)")
d = B.face_angle()
num = B.le_newtonian_numeric(d)
ana = B.R_LE * 2 * (math.cos(d) - math.cos(d) ** 3 / 3)
print(f"  d = {math.degrees(d):.4f} deg; numeric {num:.9f}, closed form {ana:.9f}, (2/3)(2r) {2 / 3 * 2 * B.R_LE:.9f}, "
      f"closed/(2/3)(2r) - 1 = {ana / (2 / 3 * 2 * B.R_LE) - 1:+.2e}")

print("=== 3. tangent geometry")
c, h, r = B.CHORD, B.H_TE, B.R_LE
xt, yt = r - r * math.sin(d), r * math.cos(d)
print(f"  tangent point ({xt:.6f}, {yt:.6f}); distance from the circle centre to the face line "
      f"{abs(h * math.cos(d) - (c - r) * math.sin(d)):.9f} (r = {r}); face through (1, {h}): "
      f"slope check {(h - yt) / (c - xt):.6f} vs tan d {math.tan(d):.6f}")
print(f"  sharp wedge through the corners: {math.degrees(math.atan(h / c)):.4f} deg; face rise {h - yt:.6f}")
print("  faces' exact 2D drag, rounded over sharp (each on its own rise):")
for M in (1.8, 2.4, 3.0):
    fr, _, cpr, rr = B.fin_wave(M, d, rounded=True)
    fs, _, cps, rs = B.fin_wave(M, math.atan(h / c), rounded=False)
    beta = math.sqrt(M * M - 1)
    print(f"    M {M}: {fr / fs:.4f} (Ackeret slope squared x rise: {(math.tan(d) ** 2 * (c - xt)) / (h * h / c):.4f})")
print("  frontal height check: 2 x face rise + 2 r cos d = %.6f (= 2h = %.6f)" % (2 * (h - yt) + 2 * yt, 2 * h))

print("=== 4. wetted areas")
s_cone = B.L_CONE / math.cos(B.TH_C)
A_cone = math.pi * 0.5 * s_cone
A_cyl = math.pi * 1.0 * (B.L_BODY - B.L_CONE)
A_body = A_cone + A_cyl
# section area of a fin (the root footprint), tangent geometry: two faces from the tangent point to the
# trailing edge, the circular segment ahead of the tangent points
seg = r * r * (math.pi / 2 - d) + r * r * math.sin(math.pi / 2 - d) * math.cos(math.pi / 2 - d)  # sector + triangle
face = 2 * 0.5 * (yt + h) * (c - xt)
A_sec = face + (r * r * (math.pi - 2 * d)) / 2 + (xt - 0) * 0  # sector of angle pi - 2d, as below
# exact: region = polygon (centre-free) ... use numerical integration of the half-thickness
n = 200000
area = 0.0
for i in range(n):
    x = (i + 0.5) / n * c
    if x < xt:
        yy = math.sqrt(max(r * r - (x - r) ** 2, 0.0))
    else:
        yy = yt + (x - xt) * math.tan(d)
    area += 2 * yy * c / n
A_roots = B.N_FIN * area
A_fins = B.N_FIN * 2 * c * B.SPAN
print(f"  body: cone {A_cone:.4f} + cylinder {A_cyl:.4f} = {A_body:.4f} cal^2; fins (both faces, planform) {A_fins:.4f}")
print(f"  fin section area {area:.6f} cal^2 (sharp wedge 0.04); four roots {A_roots:.4f} cal^2 = "
      f"{100 * A_roots / A_body:.3f}% of the body's wetted area (sharp wedges: {100 * 0.16 / A_body:.3f}%)")
print("  friction on the root footprint (cf of the last calibre of the body, by the momentum integral):")
for o in res:
    M, Rcal = o["M"], o["ReL"] / 10
    b9 = L.body_momentum_integral(Rcal, M, B.T_AIR, B.TH_C, B.L_CONE, 9.0, n_cone=3000, n_cyl=1500)
    b10 = L.body_momentum_integral(Rcal, M, B.T_AIR, B.TH_C, B.L_CONE, 10.0, n_cone=3000, n_cyl=1500)
    cf_last = 4 * (b10["psi_end"] - b9["psi_end"]) / (math.pi * 2 * 0.5 * 1.0) * math.pi / 1.0 / math.pi
    # force/q on the last calibre = 4 pi dpsi; its area = 2 pi r_b * 1 = pi; mean cf = 4 dpsi
    cf_last = 4 * (b10["psi_end"] - b9["psi_end"])
    om = cf_last * A_roots / B.A_REF
    om_share = A_roots / A_body * o["body_friction"]
    print(f"    {o['shot']} M {o['M']:.3f}: cf {cf_last:.5f}, omission {om:.5f} in C_D ({100 * om / o['total']:.3f}% of "
          f"the total; the area-share estimate {om_share:.5f})")
    if o is res[0] or o is res[-1]:
        pass

print("=== 5. friction counted once; who carries which band (from the components)")
for o in res[:1] + res[-1:]:
    print(f"  {o['shot']}: body friction {o['body_friction']:.4f} under 0.88 to 1.19; fin friction {o['fin_friction']:.4f} "
          f"under 1.01 to 1.59; wall input body {o['wall_parts'][0]:+.4f}, fins {o['wall_parts'][1]:+.4f}")

print("=== 6. TN 2960 front side over modified Newtonian (0010 section 5.2's band 0.99 to 1.06)")
first = {1.49: [1.511, 1.431, 1.172, 0.769, 0.354, -0.002, -0.285], 1.98: [1.670, 1.577, 1.322, 0.918, 0.464, 0.125, -0.134],
         2.90: [1.750, 1.664, 1.380, 0.979, 0.546, 0.241, 0.020]}
second = {2.90: [1.751, 1.667, 1.383, 0.955, 0.531, 0.245, 0.030], 1.98: [1.683, 1.582, 1.330, 0.889, 0.470, 0.129, -0.118],
          1.49: [1.516, 1.441, 1.182, 0.772, 0.360, 0.002, -0.278]}
th = [math.radians(15 * i) for i in range(7)]
def trap(P):
    f = [p * math.cos(t) for p, t in zip(P, th)]
    hst = math.radians(15)
    return hst * (sum(f) - 0.5 * (f[0] + f[-1]))
def simpson(P):
    f = [p * math.cos(t) for p, t in zip(P, th)]
    hst = math.radians(15)
    return hst / 3 * (f[0] + 4 * (f[1] + f[3] + f[5]) + 2 * (f[2] + f[4]) + f[6])
for lab, rd in (("first", first), ("first, 45 deg at M 1.98 corrected to 0.884", {**first, 1.98: [1.670, 1.577, 1.322, 0.884, 0.464, 0.125, -0.134]}),
                ("second (symbol means)", second)):
    vals = []
    for M in (1.49, 1.98, 2.90):
        tr, si = trap(rd[M]), simpson(rd[M])
        ref = 2 / 3 * L.cp_pitot(M)
        vals.append(f"M {M}: trapezoid {tr:.3f} ({tr / ref:.3f}), Simpson {si:.3f} ({si / ref:.3f})")
    print(f"  {lab}: " + "; ".join(vals))

print("=== 7. X-15 fin (TN D-1056 table II, 18 power-off rows at M 1.52 to 3.24) over the fig. 7 curve at M' = M")
X15 = [(3.24, -0.120), (3.16, -0.127), (3.11, -0.134), (2.80, -0.150), (2.45, -0.173), (2.15, -0.201), (1.80, -0.247),
       (1.80, -0.251), (1.79, -0.249), (1.68, -0.289), (1.52, -0.307)]
# flight B: the mean of orifices 1, 2, 3 (not the table's rounded mean)
X15 += [(M, sum(c) / 3) for M, c in ((3.17, (-0.136, -0.129, -0.136)), (2.95, (-0.156, -0.149, -0.138)),
        (2.66, (-0.183, -0.169, -0.170)), (2.56, (-0.190, -0.179, -0.166)), (2.30, (-0.191, -0.189, -0.187)),
        (1.97, (-0.248, -0.228, -0.253)), (1.52, (-0.347, -0.322, -0.353)))]
S7 = [(1.50, .474), (1.55, .463), (1.60, .447), (1.70, .425), (1.80, .403), (1.90, .380), (2.00, .360), (2.10, .341),
      (2.20, .324), (2.30, .307), (2.40, .291), (2.50, .277), (2.60, .266), (2.70, .255), (2.80, .247), (2.90, .239),
      (3.00, .230), (3.20, .217), (3.30, .214), (3.40, .209), (3.50, .208), (3.60, .205), (3.70, .203), (3.80, .2015),
      (3.90, .200), (4.00, .199)]
for lab, tab in (("first", B.FIG7), ("second", S7)):
    rr = [cp / ((B.interp(tab, M) - 1) * 2 / (G * M * M)) for M, cp in X15]
    print(f"  {lab} curve: {len(rr)} rows, {min(rr):.3f} to {max(rr):.3f}")
