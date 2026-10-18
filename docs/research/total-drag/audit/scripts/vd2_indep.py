"""Independent van Driest II implementation for the audit.
Fc from numerical quadrature of the Crocco-Busemann density profile,
  Fc = 1 / [ integral_0^1 sqrt(rho/rho_e) d(u/u_e) ]^2,
  T/Te = Tw/Te + (Taw - Tw)/Te * U - r (g-1)/2 M^2 U^2,
(not the closed arcsin form), F_theta = mu_e/mu_w (Sutherland), F_x = F_theta/Fc.
Karman-Schoenherr average law solved by bisection; local law in Re_theta as the
TMR fit 1/(17.08 L^2 + 25.11 L + 6.012), L = log10 Re_theta.
usage: vd2_indep.py cf_vdII.dat"""
import math, sys


def Fc_quad(M, Te, Tw, r=0.89, g=1.4, n=4000):
    m = r * (g - 1) / 2 * M * M
    Taw = Te * (1 + m)
    s = 0.0
    for i in range(n):  # midpoint rule
        U = (i + 0.5) / n
        T = Tw / Te + (Taw - Tw) / Te * U - m * U * U
        s += 1 / math.sqrt(T)
    I = s / n
    return 1 / (I * I), Taw


def mu(T):
    return 1.458e-6 * T ** 1.5 / (T + 110.4)


def ks_avg(Re):
    lo, hi = 1e-4, 1e-1
    for _ in range(200):
        c = math.sqrt(lo * hi)
        f = 0.242 / math.sqrt(c) - math.log10(Re * c)
        if f > 0: lo = c
        else: hi = c
    return math.sqrt(lo * hi)


def cf_local(Ret, M, Te, Tw, r=0.89):
    Fc, _ = Fc_quad(M, Te, Tw, r)
    Ft = mu(Te) / mu(Tw)
    L = math.log10(Ft * Ret)
    return 1 / (17.08 * L * L + 25.11 * L + 6.012) / Fc


def CF_avg(Re, M, Te, Tw=None, r=0.89):
    if Tw is None:
        Tw = Te * (1 + r * 0.2 * M * M)
    Fc, _ = Fc_quad(M, Te, Tw, r)
    Fx = mu(Te) / mu(Tw) / Fc
    return ks_avg(Fx * Re) / Fc


if __name__ == "__main__":
    zones = {}; cur = None
    for line in open(sys.argv[1]):
        s = line.strip()
        if s.startswith("ZONE"): cur = s; zones[cur] = []; continue
        if cur and s and not s.startswith("#") and not s.startswith("VAR"):
            a, b = map(float, s.split()); zones[cur].append((a, b))
    for z, rows in zones.items():
        M = float(z.split("M=")[1].split(",")[0]); twr = float(z.split("Tw/Tini=")[1].split(",")[0])
        Te = 300.0  # the TMR file depends on Tw/Te only through mu ratio: Te enters Sutherland
        errs = []
        for Ret, cf in rows[::25]:
            if 1000 <= Ret <= 20000:
                errs.append(cf_local(Ret, M, Te, twr * Te) / cf - 1)
        print(f"{z}: n={len(errs)} max|rel diff| = {max(abs(e) for e in errs):.2e}")
    print("TN 3097 table III comparison (VDII CF/CFi at same Re; T0 290..330 K; Re 4e6..3e7; r 0.88..0.89)")
    tab = [(1.99, 0.745, 0.757), (2.49, 0.671, 0.672), (2.95, 0.623, 0.630), (3.36, 0.578, 0.571), (3.60, 0.551, 0.552)]
    for M, a, b in tab:
        vals = []
        for T0 in (290.0, 330.0):
            Te = T0 / (1 + 0.2 * M * M)
            for Re in (4e6, 1e7, 3e7):
                for r in (0.88, 0.89):
                    vals.append(CF_avg(Re, M, Te, None, r) / ks_avg(Re))
        d = [v / mm - 1 for v in vals for mm in (a, b)]
        print(f"  M {M}: VDII ratio {min(vals):.4f}..{max(vals):.4f}; meas {a},{b}; VDII/meas-1 {100*min(d):+.1f}%..{100*max(d):+.1f}%; meas/VDII {min(mm / v for v in vals for mm in (a, b)):.3f}..{max(mm / v for v in vals for mm in (a, b)):.3f}")
