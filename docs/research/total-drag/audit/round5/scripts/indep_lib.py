"""Round 5 audit: an independent implementation, from the design records only (0007 to 0010 and the data
notes they cite), of the physics bowshock's Basic Finner total uses. Written before src/ and tests/ were
opened. Python 3 and numpy only. gamma = 1.4 throughout.

Contents:
  gas dynamics: pitot pressure (Rayleigh), oblique shock (weak root), Taylor-Maccoll cone;
  friction: Sutherland, van Driest II (the TMR page's form), Karman-Schoenherr exact law and its local
  form, the compressible laminar similarity solution (shooting, RK4), the flat plate with transition at a
  virtual origin of equal momentum thickness, and the axisymmetric momentum integral on a body.
"""
import math
import numpy as np

G = 1.4
S_SUTH = 110.4          # K, 0007 section 1
PR = 0.72               # 0007 section 1
R_REC = 0.89            # turbulent recovery factor, 0007 section 1


# ---------------------------------------------------------------- gas dynamics
def pitot_ratio(M):
    """p02 / p1 behind a normal shock (Rayleigh's pitot formula), M > 1."""
    a = ((G + 1) / 2 * M * M) ** (G / (G - 1))
    b = (2 * G / (G + 1) * M * M - (G - 1) / (G + 1)) ** (1 / (G - 1))
    return a / b


def cp_pitot(M):
    return (pitot_ratio(M) - 1) / (G / 2 * M * M)


def theta_beta(M, beta):
    """flow deflection for shock angle beta (radians)."""
    return math.atan(2 / math.tan(beta) * (M * M * math.sin(beta) ** 2 - 1)
                     / (M * M * (G + math.cos(2 * beta)) + 2))


def oblique_weak(M, delta):
    """weak-shock angle for deflection delta (radians), by bisection between the Mach angle and the
    angle of maximum deflection."""
    mu = math.asin(1 / M)
    # angle of maximum deflection: scan then golden search
    bs = np.linspace(mu + 1e-9, math.pi / 2 - 1e-9, 4001)
    th = np.array([theta_beta(M, b) for b in bs])
    bmax = bs[int(np.argmax(th))]
    if th.max() < delta:
        raise ValueError("detached")
    lo, hi = mu + 1e-12, bmax
    for _ in range(200):
        mid = 0.5 * (lo + hi)
        if theta_beta(M, mid) < delta:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)


def oblique_cp(M, delta):
    b = oblique_weak(M, delta)
    p21 = 1 + 2 * G / (G + 1) * (M * M * math.sin(b) ** 2 - 1)
    return (p21 - 1) / (G / 2 * M * M), b


def normal_shock_pt_ratio(Mn):
    """p02/p01 across a normal shock at upstream normal Mach Mn."""
    a = ((G + 1) * Mn * Mn / ((G - 1) * Mn * Mn + 2)) ** (G / (G - 1))
    b = ((G + 1) / (2 * G * Mn * Mn - (G - 1))) ** (1 / (G - 1))
    return a * b


def _tm_rhs(th, y):
    u, v = y
    A = (G - 1) / 2 * (1 - u * u - v * v)
    dv = (u * v * v - A * (2 * u + v / math.tan(th))) / (A - v * v)
    return np.array([v, dv])


def _tm_zero(M, beta, nstep=4000):
    """integrate Taylor-Maccoll from the shock (theta = beta) inward; return the angle where v = 0 and
    the radial velocity there (V / Vmax)."""
    delta = theta_beta(M, beta)
    Mn1 = M * math.sin(beta)
    Mn2 = math.sqrt((1 + (G - 1) / 2 * Mn1 ** 2) / (G * Mn1 ** 2 - (G - 1) / 2))
    M2 = Mn2 / math.sin(beta - delta)
    V = (2 / ((G - 1) * M2 * M2) + 1) ** -0.5
    y = np.array([V * math.cos(beta - delta), -V * math.sin(beta - delta)])
    th = beta
    h = -beta / nstep
    for _ in range(nstep):
        k1 = _tm_rhs(th, y)
        k2 = _tm_rhs(th + h / 2, y + h / 2 * k1)
        k3 = _tm_rhs(th + h / 2, y + h / 2 * k2)
        k4 = _tm_rhs(th + h, y + h * k3)
        yn = y + h / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
        if yn[1] >= 0:   # v crossed zero: refine by linear interpolation of v on the step
            f = -y[1] / (yn[1] - y[1])
            return th + f * h, y[0] + f * (yn[0] - y[0]), Mn1
        y = yn
        th += h
    raise RuntimeError("no crossing")


def cone_cp(M, theta_c, nstep=4000):
    """surface pressure coefficient of a sharp cone of half-angle theta_c (radians), Taylor-Maccoll."""
    mu = math.asin(1 / M)
    lo, hi = mu + 1e-6, mu + 0.6
    # theta_star(beta) increases with beta on the attached weak branch
    for _ in range(80):
        mid = 0.5 * (lo + hi)
        ts, _, _ = _tm_zero(M, mid, nstep)
        if ts < theta_c:
            lo = mid
        else:
            hi = mid
    beta = 0.5 * (lo + hi)
    ts, u, Mn1 = _tm_zero(M, beta, nstep)
    Mc2 = 2 / (G - 1) * u * u / (1 - u * u)
    pc_pt2 = (1 + (G - 1) / 2 * Mc2) ** (-G / (G - 1))
    pt1_p = (1 + (G - 1) / 2 * M * M) ** (G / (G - 1))
    pc_p = pc_pt2 * normal_shock_pt_ratio(Mn1) * pt1_p
    return (pc_p - 1) / (G / 2 * M * M), beta, math.sqrt(Mc2)


# ---------------------------------------------------------------- friction
def mu_rel(T, Tref):
    """Sutherland viscosity ratio mu(T)/mu(Tref)."""
    return (T / Tref) ** 1.5 * (Tref + S_SUTH) / (T + S_SUTH)


def vd2_factors(M, Te, Tw=None, r=R_REC):
    """van Driest II, TMR form: returns (Fc, F_Rtheta, F_Rx). Tw None = adiabatic at recovery r."""
    m = (G - 1) / 2 * M * M
    Taw = Te * (1 + r * m)
    if Tw is None:
        Tw = Taw
    a = math.sqrt(r * m * Te / Tw)
    b = Taw / Tw - 1
    den = math.sqrt(b * b + 4 * a * a)
    A = (2 * a * a - b) / den
    B = b / den
    Fc = r * m / (math.asin(A) + math.asin(B)) ** 2
    FRt = mu_rel(Te, Tw)       # mu_e / mu_w
    return Fc, FRt, FRt / Fc


def ks_CF_of_Y(Y):
    """Karman-Schoenherr: 0.242/sqrt(CF) = log10(Y), Y = Re_x CF."""
    return (0.242 / math.log10(Y)) ** 2


def ks_CF(Rex):
    """mean CF at Re_x, exact Karman-Schoenherr: Y = Re_x CF solves Y = Re_x (0.242/log10 Y)^2; bisection
    in ln Y on (1, Re_x), then Newton polish."""
    lo, hi = 1e-12, math.log(Rex)
    for _ in range(200):
        mid = 0.5 * (lo + hi)
        Y = math.exp(mid)
        if Y - Rex * ks_CF_of_Y(Y) < 0:
            lo = mid
        else:
            hi = mid
    Y = math.exp(0.5 * (lo + hi))
    return Y / Rex


def ks_cf_local_of_Rtheta(Rt):
    """incompressible local cf as a function of Re_theta: Y = 2 Re_theta, cf = CF / (1 + 2/ln Y)."""
    Y = 2 * Rt
    CF = ks_CF_of_Y(Y)
    return CF / (1 + 2 / math.log(Y))


def turb_cf_of_Rtheta(Rt, M, Te, Tw=None):
    Fc, FRt, _ = vd2_factors(M, Te, Tw)
    return ks_cf_local_of_Rtheta(FRt * Rt) / Fc


def turb_CF(Rex, M, Te, Tw=None):
    Fc, FRt, FRx = vd2_factors(M, Te, Tw)
    return ks_CF(FRx * Rex) / Fc


def turb_Rex_of_Rtheta(Rt, M, Te, Tw=None):
    """turbulent flat plate from x = 0: the Re_x at which Re_theta = Rt."""
    Fc, FRt, FRx = vd2_factors(M, Te, Tw)
    Y = 2 * FRt * Rt
    return Y / ks_CF_of_Y(Y) / FRx


_lam_cache = {}


def laminar_k(M, Te, Tw=None, eta_max=14.0, n=2800):
    """compressible laminar similarity solution (Illingworth-Howarth variables, eta scaled so that the
    incompressible limit is f''' + f f'' = 0), constant Pr, Sutherland. Returns k with cf = k / sqrt(Re_x)
    (k = sqrt(2) C_w f''(0)) and the wall temperature ratio. Tw None = adiabatic."""
    key = (round(M, 6), round(Te, 6), Tw, eta_max, n)
    if key in _lam_cache:
        return _lam_cache[key]
    s = S_SUTH / Te
    msq = (G - 1) * M * M

    def C(g):
        return g ** 0.5 * (1 + s) / (g + s)

    def rhs(y):
        f, fp, p, g, q = y
        c = C(g)
        fpp = p / c
        gp = q * PR / c
        return np.array([fp, fpp, -f * fpp, gp, -f * gp - msq * c * fpp * fpp])

    def shoot(x):
        if Tw is None:
            y = np.array([0.0, 0.0, x[0], x[1], 0.0])
        else:
            y = np.array([0.0, 0.0, x[0], Tw / Te, x[1]])
        h = eta_max / n
        for _ in range(n):
            k1 = rhs(y); k2 = rhs(y + h / 2 * k1); k3 = rhs(y + h / 2 * k2); k4 = rhs(y + h * k3)
            y = y + h / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
        return np.array([y[1] - 1.0, y[3] - 1.0])

    gw0 = 1 + 0.85 * (G - 1) / 2 * M * M
    x = np.array([0.4696 * math.sqrt(C(gw0)), gw0]) if Tw is None else np.array([0.4696, 0.0])
    for _ in range(40):
        F = shoot(x)
        J = np.zeros((2, 2))
        for j in range(2):
            dx = np.zeros(2); dx[j] = 1e-7 * max(1.0, abs(x[j]))
            J[:, j] = (shoot(x + dx) - F) / dx[j]
        step = np.linalg.solve(J, -F)
        x = x + step
        if np.max(np.abs(step)) < 1e-13:
            break
    gw = x[1] if Tw is None else Tw / Te
    res = (math.sqrt(2) * x[0], gw)
    _lam_cache[key] = res
    return res


def lam_cf_of_Rtheta(Rt, k):
    return k * k / Rt


def flat_plate_CF(Rec, M, Te, ReT=None, Tw=None):
    """mean CF over a plate of length Re_c: laminar to Re_T (None: fully turbulent), then turbulent from a
    virtual origin with the same momentum thickness."""
    if ReT is None or ReT <= 0:
        return turb_CF(Rec, M, Te, Tw)
    k, _ = laminar_k(M, Te, Tw)
    if ReT >= Rec:
        return 2 * k / math.sqrt(Rec)
    RtT = k * math.sqrt(ReT)
    Rxv = turb_Rex_of_Rtheta(RtT, M, Te, Tw)
    Rx = Rxv + (Rec - ReT)
    Rt = Rx * turb_CF(Rx, M, Te, Tw) / 2
    return 2 * Rt / Rec


def body_momentum_integral(R, M, Te, theta_c, L_cone, L_total, ReT=None, Tw=None, n_cone=6000, n_cyl=3000,
                           Re_s0=100.0, transition_on="s"):
    """axisymmetric momentum integral d(r theta)/ds = r cf / 2 on a cone-cylinder at free-stream edge
    conditions. R = Reynolds number per unit length (per calibre). Returns dict with
      psi_cone, psi_end (r theta), and the friction C_D on the cross-section pi r_b^2, both the axial
      component (cone shear times cos theta_c) and the plain surface integral.
    transition_on: 's' = Re_T on the surface distance from the tip, 'x' = on the axial distance."""
    a = math.sin(theta_c)
    rb = L_cone * math.tan(theta_c)
    s_cone = L_cone / math.cos(theta_c)
    s_end = s_cone + (L_total - L_cone)
    if ReT is not None and ReT > 0:
        k, _ = laminar_k(M, Te, Tw)
        sT = ReT / R
        if transition_on == "x":
            sT = sT / math.cos(theta_c) if sT <= L_cone else s_cone + (sT - L_cone)
    else:
        k = None
        sT = 0.0

    def cf(s, psi):
        r = a * s if s < s_cone else rb
        Rt = R * psi / r
        if k is not None and s < sT:
            return lam_cf_of_Rtheta(Rt, k)
        return turb_cf_of_Rtheta(Rt, M, Te, Tw)

    def rad(s):
        return a * s if s < s_cone else rb

    def f(s, psi):
        return rad(s) * cf(s, psi) / 2

    s0 = Re_s0 / R
    # start: tiny s0 with the cone's own similarity value (laminar or turbulent); its error decays
    if k is not None and s0 < sT:
        th0 = k * math.sqrt(s0 / (3 * R))
    else:
        # turbulent: flat-plate theta at s0 divided by a power-law cone factor (immaterial at s0 -> 0)
        th0 = turb_Rex_of_Rtheta_inv(R * s0, M, Te, Tw) / R / 1.2
    psi = a * s0 * th0

    nodes = list(np.geomspace(s0, s_cone, n_cone + 1))
    nodes += list(np.linspace(s_cone, s_end, n_cyl + 1)[1:])
    if k is not None and s0 < sT < s_end:
        nodes.append(sT)
    nodes = sorted(set(nodes))
    psi_cone = None
    for s1, s2 in zip(nodes[:-1], nodes[1:]):
        h = s2 - s1
        # integrate each interval with the closure of its midpoint side (nodes include sT and s_cone)
        sm = 0.5 * (s1 + s2)

        def ff(s, p):
            rr = a * s if sm < s_cone else rb
            Rt = R * p / rr
            if k is not None and sm < sT:
                c = lam_cf_of_Rtheta(Rt, k)
            else:
                c = turb_cf_of_Rtheta(Rt, M, Te, Tw)
            return rr * c / 2
        k1 = ff(s1, psi); k2 = ff(s1 + h / 2, psi + h / 2 * k1); k3 = ff(s1 + h / 2, psi + h / 2 * k2)
        k4 = ff(s2, psi + h * k3)
        psi = psi + h / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
        if abs(s2 - s_cone) < 1e-12:
            psi_cone = psi
    Aref = math.pi * rb * rb
    cd_axial = 4 * math.pi * (math.cos(theta_c) * psi_cone + (psi - psi_cone)) / Aref
    cd_surface = 4 * math.pi * psi / Aref
    wetted = math.pi * rb * s_cone + 2 * math.pi * rb * (L_total - L_cone)
    return dict(psi_cone=psi_cone, psi_end=psi, cd_axial=cd_axial, cd_surface=cd_surface, wetted=wetted,
                s_cone=s_cone, s_end=s_end, sT=sT)


def turb_Rex_of_Rtheta_inv(Rex, M, Te, Tw=None):
    """turbulent flat-plate Re_theta at Re_x."""
    return Rex * turb_CF(Rex, M, Te, Tw) / 2


def turb_cf_local(Rex, M, Te, Tw=None):
    Rt = turb_Rex_of_Rtheta_inv(Rex, M, Te, Tw)
    return turb_cf_of_Rtheta(Rt, M, Te, Tw)
