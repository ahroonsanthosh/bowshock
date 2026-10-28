"""The flat's state behind a bevelled leading edge, and what it does to the fin trailing-edge base term.

A check made in the independent review of A2 (0009 section 8, 2026-10-27), kept here so it can be re-run.
For a plate bevelled at the leading edge only (a wedge, then a flat to a square trailing edge), at
Mach 1.5 to 3.0 and bevel half-angles 8 to 15 deg, it prints:
- the flat's Mach number and pressure behind the bevel's oblique shock and the shoulder's
  Prandtl-Meyer expansion (shock-expansion theory, gamma 1.4);
- the reflection coefficient R along the shock (from the shock's pressure-turning slope against the
  simple-wave value K = gamma M^2 / sqrt(M^2 - 1)), and the turning the reflected waves carry back to
  the flat, integrated as the shoulder's fan weakens the shock;
- the flat's pressure and Mach number with those reflected waves;
- the trailing-edge base term on the flat's state over the term at the free-stream Mach number (the
  model's, 0010 section 5.1), without and with the reflected waves: (1 - (p_b/p) p) / (1 - p_b/p
  at M_inf), with p_b/p from RM A51J25 fig. 7's curve (CURVE below, the values of
  src/base/blunt-te-2d.ts RM_A51J25_FIG7_CURVE).

Run: python3 -I docs/research/refusals/scripts/flat_state.py
"""

import math

G = 1.4


def pm(M):
    b = math.sqrt(M * M - 1)
    k = math.sqrt((G + 1) / (G - 1))
    return k * math.atan(b / k) - math.atan(b)


def pm_inv(nu):
    lo, hi = 1.0000001, 50.0
    for _ in range(200):
        mid = 0.5 * (lo + hi)
        if pm(mid) < nu:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)


def theta_of_beta(M, b):
    return math.atan(2 / math.tan(b) * (M * M * math.sin(b) ** 2 - 1) / (M * M * (G + math.cos(2 * b)) + 2))


_bmax = {}


def beta_max(M):
    if M not in _bmax:
        mu = math.asin(1 / M)
        lo, hi = mu, math.pi / 2
        for _ in range(200):
            m1 = lo + (hi - lo) / 3
            m2 = hi - (hi - lo) / 3
            if theta_of_beta(M, m1) < theta_of_beta(M, m2):
                lo = m1
            else:
                hi = m2
        _bmax[M] = 0.5 * (lo + hi)
    return _bmax[M]


def shock(M, th):
    mu = math.asin(1 / M)
    bm = beta_max(M)
    if th > theta_of_beta(M, bm):
        return None
    lo, hi = mu, bm
    for _ in range(200):
        mid = 0.5 * (lo + hi)
        if theta_of_beta(M, mid) < th:
            lo = mid
        else:
            hi = mid
    b = 0.5 * (lo + hi)
    Mn1 = M * math.sin(b)
    p = 1 + 2 * G / (G + 1) * (Mn1 ** 2 - 1)
    Mn2 = math.sqrt((1 + 0.5 * (G - 1) * Mn1 ** 2) / (G * Mn1 ** 2 - 0.5 * (G - 1)))
    M2 = Mn2 / math.sin(b - th)
    return b, p, M2


def iso(M):
    return (1 + 0.5 * (G - 1) * M * M) ** (-G / (G - 1))


CURVE = [(1.167, 0.588), (1.295, 0.545), (1.4, 0.517), (1.5, 0.474), (1.6, 0.446), (1.7, 0.42), (1.83, 0.399),
         (2.0, 0.359), (2.1, 0.337), (2.25, 0.311), (2.5, 0.275), (2.75, 0.249), (2.9, 0.236), (3.0, 0.228),
         (3.1, 0.22), (3.25, 0.214), (3.5, 0.206), (3.75, 0.2), (3.9, 0.199), (4.0, 0.199)]


def fcurve(M):
    for (a, ra), (b, rb) in zip(CURVE, CURVE[1:]):
        if a <= M <= b:
            return ra + (M - a) / (b - a) * (rb - ra)
    raise ValueError(M)


def K(M):
    return G * M * M / math.sqrt(M * M - 1)


def S(Minf, th):
    h = 1e-6
    a, b = max(th - h, 1e-9), th + h
    return (math.log(shock(Minf, b)[1]) - math.log(shock(Minf, a)[1])) / (b - a)


def run(Minf, thdeg, N=400):
    th = math.radians(thdeg)
    r = shock(Minf, th)
    if r is None:
        return None
    b, p1, M1 = r
    if M1 <= 1:
        return None
    M2 = pm_inv(pm(M1) + th)
    p2 = p1 * iso(M2) / iso(M1)
    ths = th
    dth = th / N
    sum_r = 0.0
    Rs = []
    for _ in range(N):
        _, _, Ms = shock(Minf, ths)
        k = K(Ms)
        s = S(Minf, ths)
        dths = 2 * k * dth / (k + s)
        R = (s - k) / (s + k)
        Rs.append(R)
        sum_r += R * dth
        ths = max(ths - dths, 1e-7)
    dlnp = -2 * K(M2) * sum_r
    p2r = p2 * math.exp(dlnp)
    p0 = p2 / iso(M2)
    lo, hi = 1.0001, 10.0
    for _ in range(200):
        mid = 0.5 * (lo + hi)
        if p0 * iso(mid) > p2r:
            lo = mid
        else:
            hi = mid
    M2r = 0.5 * (lo + hi)
    nom = 1 - fcurve(Minf)

    def ratio(Ml, pl):
        return (1 - fcurve(Ml) * pl) / nom

    return dict(M2=M2, p2=p2, Rmin=min(Rs), Rmax=max(Rs), sum_r_deg=math.degrees(sum_r), thfinal=math.degrees(ths),
                p2r=p2r, M2r=M2r, base_noref=ratio(M2, p2), base_ref=ratio(M2r, p2r))


print("M bevel | M_flat p_flat/pinf | R min max | reflected turning deg | with reflections: p/pinf M | base term local/free: no refl, refl")
for Minf in [1.5, 1.6, 1.8, 2.0, 2.5, 3.0]:
    for thd in [8, 10, 12, 15]:
        r = run(Minf, thd)
        if r is None:
            print(Minf, thd, "refused (detached or subsonic)")
            continue
        print(f"{Minf} {thd:2d} | {r['M2']:.4f} {r['p2']:.4f} | {r['Rmin']:+.4f} {r['Rmax']:+.4f} | "
              f"{r['sum_r_deg']:+.4f} (shock left {r['thfinal']:.3f}) | {r['p2r']:.4f} {r['M2r']:.4f} | "
              f"{r['base_noref']:.4f} {r['base_ref']:.4f}")
