"""Friction sensitivity study for representative rockets (L = 25 d), adiabatic wall, flat plate.
- VDII average CF with the Karman-Schoenherr law (vd2.py, checked against the TMR file).
- Transition: laminar run to Re_T with Blasius CF = 1.328/sqrt(Re) (TN 3708 found the incompressible
  Blasius value adequate for laminar friction at M 1.6-2.4); turbulent part from a virtual origin with the
  same momentum thickness at transition (the procedure of RM A53D02, p. 8): theta_T = 0.664 x_T / sqrt(Re_T).
  Momentum thickness at the end gives the total: CF_total = 2 Re_theta(L) / Re_L.
- OpenRocket 13.05 technical documentation, eqs. 3.78-3.84: smooth Cf = 1/(1.50 ln R - 5.6)^2,
  supersonic correction /(1+0.15 M^2)^0.58; roughness-limited Cf = 0.032 (Rs/L)^0.2, Rcrit = 51 (Rs/L)^-1.039,
  correction /(1 + 0.18 M^2), not used if below the smooth value.
Atmosphere: ISA troposphere T = 288.15 - 6.5 h[km] K, p = 101325 (T/288.15)^5.2559; above 11 km T = 216.65 K,
p = 22632 exp(-(h-11 km) g/(R T)); Sutherland viscosity mu = 1.458e-6 T^1.5/(T+110.4)."""
import math, sys
sys.path.insert(0, sys.argv[0].rsplit('/', 1)[0])
from vd2 import CF_avg, factors

def isa(hkm):
    if hkm <= 11:
        T = 288.15 - 6.5 * hkm; p = 101325 * (T / 288.15) ** 5.2559
    else:
        T = 216.65; p = 22632.06 * math.exp(-(hkm - 11) * 1000 * 9.80665 / (287.05 * T))
    rho = p / (287.05 * T); mu = 1.458e-6 * T ** 1.5 / (T + 110.4)
    return T, p, rho, mu

def vd_with_transition(ReL, ReT, M, Te):
    if ReT >= ReL:
        return 1.328 / math.sqrt(ReL)
    Ret_T = 0.664 * math.sqrt(ReT)
    # virtual turbulent length Re_v such that CF(Re_v) Re_v / 2 = Ret_T
    lo, hi = 1.0, ReT
    for _ in range(200):
        mid = math.sqrt(lo * hi)
        if CF_avg(mid, M, Te) * mid / 2 < Ret_T: lo = mid
        else: hi = mid
    Rev = math.sqrt(lo * hi)
    Reff = ReL - ReT + Rev
    Ret_L = CF_avg(Reff, M, Te) * Reff / 2
    return 2 * Ret_L / ReL

def or_smooth(Re, M):
    return 1 / (1.50 * math.log(Re) - 5.6) ** 2 / (1 + 0.15 * M * M) ** 0.58

def or_rough(Re, M, Rs, L):
    smooth = or_smooth(Re, M)
    Rcrit = 51 * (Rs / L) ** -1.039
    if Re <= Rcrit: return smooth
    r = 0.032 * (Rs / L) ** 0.2 / (1 + 0.18 * M * M)
    return max(r, smooth)

print('d[mm] L[m] h[km] M   Re_L      VDII_CF   OR/VDII | transition CF/CF_turb: ReT=5e5 1.6e6 3e6 | OR rough/smooth: 5um 20um 60um')
for d in (0.054, 0.098, 0.152):
    L = 25 * d
    for h in (3.0, 10.0):
        T, p, rho, mu = isa(h)
        a = math.sqrt(1.4 * 287.05 * T)
        for M in (1.2, 2.0, 3.0):
            Re = rho * M * a * L / mu
            cf = CF_avg(Re, M, T)
            tr = [vd_with_transition(Re, ReT, M, T) / cf for ReT in (5e5, 1.6e6, 3e6)]
            rough = [or_rough(Re, M, Rs, L) / or_smooth(Re, M) for Rs in (5e-6, 20e-6, 60e-6)]
            print('%4.0f %5.2f %4.0f %4.1f %9.3e %.5f  %.3f  |  %.3f %.3f %.3f  |  %.3f %.3f %.3f' % (
                d * 1000, L, h, M, Re, cf, or_smooth(Re, M) / cf, *tr, *rough))
