"""Round 5: checks of indep_lib.py against closed forms and against numbers the records print
(0007 section 3.1's model column; 0010 section 5.2's face angle)."""
import math
import indep_lib as L

print("=== laminar similarity")
# incompressible limit: M -> 0 with C = 1 is Blasius (0.664115); M small with Sutherland gives C ~ 1
k, gw = L.laminar_k(1e-4, 293.95)
print(f"  M 1e-4, Te 293.95 adiabatic: k = {k:.6f} (Blasius 0.664115), g_w = {gw:.8f}")
for M in (1.8, 2.4, 3.0):
    k, gw = L.laminar_k(M, 293.95)
    r = (gw - 1) / ((L.G - 1) / 2 * M * M)
    print(f"  M {M}: k = {k:.5f}, Tw/Te = {gw:.5f}, recovery factor = {r:.5f}")

print("=== van Driest II against 0007 section 3.1's model column (Re 1e7, T0 280 K, adiabatic r = 0.89)")
for M, want in ((1.99, 0.7942), (2.49, 0.7256), (2.95, 0.6685), (3.36, 0.6231), (3.60, 0.5990)):
    Te = 280 / (1 + 0.2 * M * M)
    ratio = L.turb_CF(1e7, M, Te) / L.ks_CF(1e7)
    print(f"  M {M}: CF/CF_KS = {ratio:.4f} (0007: {want}), diff {ratio - want:+.4f}")

print("=== Karman-Schoenherr local form: cf = d(Re_x CF)/dRe_x, numerically")
for Rex in (1e6, 1e7):
    h = Rex * 1e-5
    num = ((Rex + h) * L.ks_CF(Rex + h) - (Rex - h) * L.ks_CF(Rex - h)) / (2 * h)
    ana = L.ks_cf_local_of_Rtheta(Rex * L.ks_CF(Rex) / 2)
    print(f"  Re_x {Rex:.0e}: numeric {num:.7e}, from Re_theta {ana:.7e}, rel {ana / num - 1:+.1e}")

print("=== body momentum integral: laminar cone gives Mangler sqrt(3) over the flat plate")
M, Te, R = 2.0, 293.95, 1e6
k, _ = L.laminar_k(M, Te)
res = L.body_momentum_integral(R, M, Te, math.radians(10), 2.0, 2.0 + 1e-9, ReT=1e12, n_cone=4000, n_cyl=2)
s = res["s_cone"]
theta = res["psi_cone"] / (math.sin(math.radians(10)) * s)
theta_fp = k * math.sqrt(s / R)
print(f"  theta_cone / theta_flat = {theta / theta_fp:.6f} (1/sqrt(3) = {1 / math.sqrt(3):.6f})")

print("=== turbulent flat plate: d(theta)/dx = cf(Re_theta)/2 integrated (RK4) equals Re_x CF / 2")
import numpy as np
M, Te = 2.0, 293.95
Rt = L.turb_Rex_of_Rtheta_inv(1e3, M, Te)
xs = np.geomspace(1e3, 1e7, 20001)
for x1, x2 in zip(xs[:-1], xs[1:]):
    h = x2 - x1
    f = lambda t: L.turb_cf_of_Rtheta(t, M, Te) / 2
    k1 = f(Rt); k2 = f(Rt + h / 2 * k1); k3 = f(Rt + h / 2 * k2); k4 = f(Rt + h * k3)
    Rt += h / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
print(f"  Re_x 1e7: integrated Re_theta {Rt:.3f}, closed form {1e7 * L.turb_CF(1e7, M, Te) / 2:.3f}")

print("=== Taylor-Maccoll: cone 10 deg")
for M in (1.5, 2.0, 3.0):
    cp, beta, Mc = L.cone_cp(M, math.radians(10))
    print(f"  M {M}: Cp {cp:.5f}, shock {math.degrees(beta):.3f} deg, M_cone {Mc:.4f}")

print("=== oblique shock, small deflection, against Busemann's second order")
for M in (1.8, 3.0):
    d = math.radians(2.07)
    cp, b = L.oblique_cp(M, d)
    be = math.sqrt(M * M - 1)
    c2 = ((L.G + 1) * M ** 4 - 4 * be * be) / (4 * be ** 4)
    print(f"  M {M}: exact {cp:.6f}, Busemann {2 * d / be + c2 * d * d:.6f}")

print("=== pitot coefficients (le_bluntness.md: 1.529, 1.654, 1.750 at M 1.49, 1.98, 2.90)")
print("  " + ", ".join(f"{L.cp_pitot(M):.4f}" for M in (1.49, 1.98, 2.90)))
