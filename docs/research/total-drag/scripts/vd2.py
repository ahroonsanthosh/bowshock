"""Van Driest II (flat plate) with the Karman-Schoenherr incompressible law.
Formulation as on the Turbulence Modeling Resource page ZPGflatplateSS_val.html and
Hopkins TN D-6945 (Fc, Ftheta = mu_e/mu_w, Fx = Ftheta/Fc). Sutherland viscosity, S = 110.4 K."""
import math

def sutherland(T, S=110.4):
    return T**1.5 / (T + S)

def factors(M, Te, Tw=None, r=0.89, g=1.4):
    Taw = Te * (1 + r * (g - 1) / 2 * M * M)
    if Tw is None: Tw = Taw
    m = (g - 1) / 2 * M * M
    a = math.sqrt(r * m * Te / Tw)
    b = Taw / Tw - 1
    den = math.sqrt(b * b + 4 * a * a)
    A = (2 * a * a - b) / den
    B = b / den
    Fc = (Taw / Te - 1) / (math.asin(A) + math.asin(B))**2 if M > 0 else 1.0
    Ft = sutherland(Te) / sutherland(Tw)
    return Fc, Ft, Ft / Fc, Taw

def ks_local_theta(Ret):  # incompressible local Cf vs Re_theta (K-S, TMR form)
    L = math.log10(Ret)
    return 1.0 / (17.08 * L * L + 25.11 * L + 6.012)

def ks_avg(Rex):  # solve 0.242/sqrt(CF) = log10(Rex*CF)
    CF = 0.003
    for _ in range(200):
        f = 0.242 / math.sqrt(CF) - math.log10(Rex * CF)
        df = -0.121 * CF**-1.5 - 1 / (CF * math.log(10))
        CF -= f / df
    return CF

def cf_local_theta(Ret, M, Te, Tw=None, r=0.89):
    Fc, Ft, Fx, _ = factors(M, Te, Tw, r)
    return ks_local_theta(Ft * Ret) / Fc

def CF_avg(Rex, M, Te, Tw=None, r=0.89):
    Fc, Ft, Fx, _ = factors(M, Te, Tw, r)
    return ks_avg(Fx * Rex) / Fc

if __name__ == '__main__':
    import sys
    # 1) check against the TMR file (M=2, Tw/Tinf = 1.712, Tinf = 300 K)
    rows = []
    zone = None
    for line in open(sys.argv[1]):
        s = line.strip()
        if s.startswith('ZONE'): zone = s; continue
        if zone and 'M=2.0' in zone and s and not s.startswith('#'):
            x, y = map(float, s.split()); rows.append((x, y))
    errs = []
    for Ret, cf in rows:
        if 1000 <= Ret <= 20000:
            mine = cf_local_theta(Ret, 2.0, 300.0, 1.712 * 300.0)
            errs.append(mine / cf - 1)
    print('check vs TMR M=2 file, 1e3<Re_theta<2e4: max |rel diff| = %.2e (n=%d)' % (max(abs(e) for e in errs), len(errs)))
