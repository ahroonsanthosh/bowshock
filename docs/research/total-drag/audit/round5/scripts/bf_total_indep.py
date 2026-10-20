"""Round 5 audit: the Basic Finner's total drag at the 11 gated shots, re-implemented from the design records
(0007 to 0010) and the data notes they cite, before src/ and tests/ were opened.

Every input is copied from a record or a data file named beside it. Where a record leaves a choice open the
choice is an option below, with the default being this auditor's reading of the record; the alternatives are
printed so that their size is known.

Run: python3 bf_total_indep.py [--json out.json]
"""
import json
import math
import sys
import indep_lib as L

G = L.G
T_AIR = 293.95                          # K, 0010 section 4.1 (343.7 m/s)
TH_C = math.radians(10.0)               # cone half-angle, 0010 section 4.1
L_CONE = 0.5 / math.tan(TH_C)           # 2.836 cal
L_BODY = 10.0
A_REF = math.pi / 4                     # cal^2, cylinder cross-section
N_FIN, CHORD, SPAN = 4, 1.0, 1.0
H_TE = 0.04                             # half-thickness at the trailing edge (0.08 cal thick)
R_LE = 0.004                            # leading-edge radius
A_TE = N_FIN * 2 * H_TE * SPAN          # 0.32 cal^2, 0010 section 4.1
RE_T = (5e5, 1.6e6, 3e6)                # transition inputs, 0010 section 4.1

# ---------------------------------------------------------------- shots (basic_finner_ada636861.csv)
SHOTS = [("DA95021318", 1.799, 0.594, 0.119e8, 1), ("DA95021529", 1.846, 0.598, 0.124e8, 1),
         ("DA95021308", 1.850, 0.567, 0.123e8, 1), ("DA95021328", 2.348, 0.500, 0.156e8, 2),
         ("DA95020907", 2.364, 0.478, 0.155e8, 2), ("DA95021317", 2.414, 0.473, 0.161e8, 2),
         ("DA95020927", 2.663, 0.446, 0.174e8, 3), ("DA95020906", 2.741, 0.400, 0.180e8, 3),
         ("DA95020916", 2.749, 0.452, 0.180e8, 3), ("DA95030603", 2.969, 0.385, 0.198e8, 4),
         ("DA95022205", 2.970, 0.376, 0.197e8, 4)]

# ---------------------------------------------------------------- TN 3819 fig. 18 (audit/readings/tn3819_fig18.csv)
FIG18 = [(1.000, -0.1896, -0.1849), (1.200, -0.1870, -0.1836), (1.400, -0.1810, -0.1796), (1.500, -0.1775, -0.1733),
         (1.503, -0.1774, -0.1732), (1.600, -0.1731, -0.1683), (1.630, -0.1717, -0.1667), (1.800, -0.1625, -0.1569),
         (1.935, -0.1539, -0.1486), (1.939, -0.1536, -0.1484), (2.000, -0.1496, -0.1447), (2.009, -0.1490, -0.1442),
         (2.200, -0.1367, -0.1331), (2.400, -0.1250, -0.1224), (2.414, -0.1243, -0.1216), (2.418, -0.1241, -0.1214),
         (2.500, -0.1196, -0.1172), (2.600, -0.1144, -0.1124), (2.681, -0.1107, -0.1088), (2.800, -0.1055, -0.1039),
         (3.000, -0.0978, -0.0964), (3.200, -0.0900, -0.0894), (3.243, -0.0885, -0.0881), (3.497, -0.0803, -0.0803),
         (3.500, -0.0802, -0.0802)]
CURV = 0.0634          # 0010 section 1.1: largest |P_B''| estimate (checked below)


def interp(tab, x):
    """tab: sorted list of (x, y); linear; None outside."""
    if x < tab[0][0] - 1e-12 or x > tab[-1][0] + 1e-12:
        return None
    for (a, ya), (b, yb) in zip(tab, tab[1:]):
        if a - 1e-12 <= x <= b + 1e-12:
            return ya + (yb - ya) * (x - a) / (b - a)
    return tab[-1][1]


def pb_less(M):
    return interp([(m, l) for m, _, l in FIG18], M)


def pb_more(M):
    return interp([(m, mo) for m, mo, _ in FIG18], M)


def interp_bound(M):
    xs = [m for m, _, _ in FIG18]
    for a, b in zip(xs, xs[1:]):
        if a <= M <= b:
            return (M - a) * (b - M) / 2 * CURV
    return 0.0


# ---------------------------------------------------------------- TN 3819 fig. 35, both readings
# first reading (data/love_fig35_tn3819.csv; 2.97 and 3.00 are 0008's extrapolation, love_fig35_factor.csv)
FF1 = [(1.80, -0.2362, .005), (1.90, -0.2108, .005), (2.00, -0.1905, .005), (2.10, -0.1746, .005),
       (2.20, -0.1649, .002), (2.30, -0.1587, .002), (2.40, -0.1538, .002), (2.50, -0.1490, .002),
       (2.60, -0.1445, .002), (2.70, -0.1401, .002), (2.80, -0.1359, .002), (2.85, -0.1338, .002),
       (2.97, -0.1288, .002), (3.00, -0.1275, .002)]
# round 3 (audit/round3/readings/tn3819_fig35.csv; error +-0.004 at M 1.75 to 2.35, +-0.002 elsewhere, method_round3.md)
_R3 = [(1.10, -0.2844), (1.20, -0.2751), (1.30, -0.2705), (1.40, -0.2678), (1.50, -0.2661), (1.60, -0.2655),
       (1.70, -0.2588), (1.80, -0.2361), (1.90, -0.2107), (2.00, -0.1903), (2.10, -0.1745), (2.20, -0.1652),
       (2.30, -0.1587), (2.40, -0.1539), (2.41, -0.1534), (2.50, -0.1490), (2.60, -0.1443), (2.70, -0.1399),
       (2.80, -0.1358), (2.90, -0.1319), (3.00, -0.1278)]
TUN1 = [(1.50, 0.325 / 0.194), (2.00, 0.208 / 0.150), (2.41, 0.164 / 0.120)]
TUN3 = [(1.502, 0.3251 / 0.1941), (2.003, 0.2077 / 0.1500), (2.405, 0.1648 / 0.1202)]


def r3_table(err_end=0.002):
    out = []
    for m, p in _R3:
        e = 0.004 if 1.75 <= m <= 2.35 else 0.002
        if m >= 2.965:
            e = err_end
        out.append((m, p, e))
    return out


def ff_at(tab, M):
    """free-flight finned P_B and its reading error at M (error: that of the bracketing nodes, larger)."""
    if M < tab[0][0] - 1e-12 or M > tab[-1][0] + 1e-12:
        return None
    for (a, pa, ea), (b, pb, eb) in zip(tab, tab[1:]):
        if a - 1e-12 <= M <= b + 1e-12:
            p = pa + (pb - pa) * (M - a) / (b - a)
            e = ea if abs(M - a) < 1e-12 else (eb if abs(M - b) < 1e-12 else max(ea, eb))
            return p, e
    return None


def swap_err(M, e):
    """0010 section 1.3 change 2: at M 1.75 to 2.35 the reading error is at least +-0.005."""
    return max(e, 0.005) if 1.75 - 1e-12 <= M <= 2.35 + 1e-12 else e


def tunnel_excess(r3_err_end):
    best = -1.0
    for tun in (TUN1, TUN3):
        for mt, ft in tun:
            for tab in (FF1, r3_table(r3_err_end)):
                v = ff_at(tab, mt)
                if v is None:
                    continue
                best = max(best, ft - v[0] / pb_less(mt))
    return best


def fins_on_base_band(M, r3_err_end=0.002, err_mode="bracket"):
    """F band at M, evaluated directly at M as the envelope over both readings (0010 section 1.3).
    err_mode 'bracket' = larger of the two bracketing nodes' errors; the swap rule applies at M itself."""
    nf = abs(pb_less(M))
    exc = tunnel_excess(r3_err_end)
    lows, highs = [], []
    for tab, tun in ((FF1, TUN1), (r3_table(r3_err_end), TUN3)):
        v = ff_at(tab, M)
        if v is None:
            continue
        p, e = v
        e = swap_err(M, e)
        F = abs(p) / nf
        eF = e / nf
        lows.append(1 + (F - eF - 1) / 2)
        if M <= 2.41 + 1e-12:
            highs.append(F + eF)
            ft = interp(tun, M)
            if ft is not None:
                highs.append(ft)
            for tun2 in (TUN1, TUN3):        # every tunnel reading, envelope
                ft2 = interp(tun2, M)
                if ft2 is not None:
                    highs.append(ft2)
        else:
            highs.append(F + exc)
    lo, hi = min(lows), max(highs)
    return lo, hi, 0.5 * (lo + hi)


def fins_on_base_rows_then_interp(M, r3_err_end=0.002):
    """alternative: the band at the rows 1.80, 1.90, ..., 3.00 (plus 2.41 and 2.97), then linear in M."""
    rows = [1.80, 1.90, 2.00, 2.10, 2.20, 2.30, 2.40, 2.41, 2.50, 2.60, 2.70, 2.80, 2.90, 2.97, 3.00]
    tab = [(m,) + fins_on_base_band(m, r3_err_end) for m in rows]
    for (a, la, ha, _), (b, lb, hb, _) in zip(tab, tab[1:]):
        if a <= M <= b:
            lo = la + (lb - la) * (M - a) / (b - a)
            hi = ha + (hb - ha) * (M - a) / (b - a)
            return lo, hi, 0.5 * (lo + hi)
    return None


# ---------------------------------------------------------------- blunt trailing edges
# RM A51J25 fig. 7 mean curve, first reading (data/blunt_te_2d_base.csv): p_b / p'
FIG7 = [(1.167, .588), (1.295, .545), (1.400, .517), (1.500, .474), (1.600, .446), (1.700, .420), (1.830, .399),
        (2.000, .359), (2.100, .337), (2.250, .311), (2.500, .275), (2.750, .249), (2.900, .236), (3.000, .228),
        (3.100, .220), (3.250, .214), (3.500, .206), (3.750, .200), (3.900, .199), (4.000, .199)]
# TR 1109 fig. 29: first reading (blunt_te_2d_base.csv) and second (compare_round4.py S29 / S29b)
T29_1 = {1.5: [(0.5, .492), (0.75, .492), (1.0, .494), (1.5, .498), (2.0, .503), (2.5, .508), (3.0, .515), (3.5, .528),
               (4.0, .539), (4.5, .552)],
         2.0: [(0.5, .358), (0.75, .362), (1.0, .367), (1.5, .379), (2.0, .391), (3.0, .416), (3.5, .430), (4.0, .442),
               (4.5, .454)],
         3.1: [(0.75, .209), (1.0, .223), (1.5, .255), (2.0, .286), (2.5, .317), (3.0, .347), (3.5, .380), (4.0, .411),
               (4.5, .441)]}
T29_2 = {1.5: sorted({0.45: .492, 0.55: .492, 0.70: .492, 0.95: .493, 1.0: .4928, 1.5: .497, 2.0: .502, 2.5: .507,
                      3.0: .514, 3.5: .526, 4.0: .537, 4.5: .550}.items()),
         2.0: sorted({0.45: .356, 0.55: .356, 0.70: .359, 0.75: .3606, 0.95: .365, 1.0: .3656, 1.5: .376, 2.0: .389,
                      2.5: .401, 3.0: .414, 3.5: .428, 4.0: .440, 4.5: .453}.items()),
         3.1: sorted({0.45: .187, 0.55: .195, 0.70: .200, 0.75: .2045, 0.8: .2076, 0.95: .217, 1.0: .2195, 1.5: .251,
                      2.0: .282, 2.5: .313, 3.0: .344, 3.5: .377, 4.0: .408, 4.5: .438}.items())}
L29_1 = {1.5: [(0.010, .358), (0.014, .460), (0.026, .636), (0.030, .664), (0.034, .688), (0.038, .706), (0.044, .727),
               (0.050, .740), (0.060, .764), (0.075, .792), (0.092, .811), (0.104, .822), (0.124, .834), (0.150, .844),
               (0.175, .847), (0.185, .847)],
         2.0: [(0.010, .442), (0.014, .490), (0.026, .615), (0.030, .644), (0.034, .672), (0.038, .693), (0.044, .717),
               (0.050, .740), (0.060, .764), (0.075, .782), (0.092, .794), (0.124, .807), (0.150, .816), (0.175, .818),
               (0.190, .817)],
         3.1: [(0.006, .190), (0.010, .253), (0.014, .307), (0.018, .356), (0.026, .437), (0.030, .474), (0.034, .506),
               (0.038, .539), (0.044, .586), (0.050, .628), (0.058, .683), (0.062, .709)]}
L29_2 = {1.5: sorted({0.010: .3576, 0.0115: .395, 0.012: .4068, 0.030: .665, 0.038: .7054, 0.040: .713, 0.050: .740,
                      0.100: .820, 0.102: .8213, 0.124: .836, 0.150: .8453, 0.175: .849}.items()),
         2.0: sorted({0.010: .4389, 0.0115: .459, 0.012: .4639, 0.030: .645, 0.038: .6916, 0.040: .700, 0.124: .807,
                      0.150: .8164, 0.175: .8192}.items()),
         3.1: sorted({0.006: .1917, 0.009: .2362, 0.010: .2486, 0.0115: .2731, 0.012: .2792, 0.022: .399, 0.030: .472,
                      0.038: .5378, 0.040: .553, 0.050: .627, 0.060: .696, 0.062: .7089}.items())}


def curve_value_with_extrap(tab, x):
    """value(s) of a read curve at x: inside, the linear interpolation (one value); beyond either end by at
    most one read interval, the pair (end value, end interval's linear extrapolation), flagged; else None."""
    v = interp(tab, x)
    if v is not None:
        return [v], False
    if x < tab[0][0]:
        (a, ya), (b, yb) = tab[0], tab[1]
        if tab[0][0] - x <= (b - a) + 1e-12:
            return [ya, ya + (yb - ya) * (x - a) / (b - a)], True
    else:
        (a, ya), (b, yb) = tab[-2], tab[-1]
        if x - b <= (b - a) + 1e-12:
            return [yb, yb + (yb - ya) * (x - b) / (b - a)], True
    return None, None


def te_laminar_band(Rec, crossed=True):
    """laminar over turbulent base drag (0010 section 5.1): envelope over M 1.5, 2.0, 3.1 and both readings.
    crossed True: every pairing of the laminar and turbulent readings; False: first with first, second with
    second."""
    ch = CHORD / (2 * H_TE)
    Xt = ch / Rec ** 0.2
    Xl = ch / Rec ** 0.5
    ratios, flags = [], []
    pairs = [(L29_1, T29_1), (L29_1, T29_2), (L29_2, T29_1), (L29_2, T29_2)] if crossed else \
        [(L29_1, T29_1), (L29_2, T29_2)]
    for M in (1.5, 2.0, 3.1):
        for lam, tur in pairs:
            vl, fl = curve_value_with_extrap(lam[M], Xl)
            vt, ft = curve_value_with_extrap(tur[M], Xt)
            if vl is None or vt is None:
                return None
            if fl:
                flags.append(f"lam M{M}")
            if ft:
                flags.append(f"turb M{M}")
            for a in vl:
                for b in vt:
                    ratios.append(((1 - a) / (1 - b), M))
    lo = min(ratios)
    hi = max(ratios)
    return lo[0] - 1, hi[0] - 1, Xt, Xl, sorted(set(flags)), lo[1], hi[1]


def te_base(M):
    r = interp(FIG7, M)
    PB = (r - 1) * 2 / (G * M * M)
    return -PB * A_TE / A_REF, PB, r


# ---------------------------------------------------------------- leading edges and faces
def face_angle():
    """tangent geometry (0010 section 5.2): h cos d - (c - r) sin d = r."""
    c, h, r = CHORD, H_TE, R_LE
    lo, hi = 0.0, math.atan(h / c)
    for _ in range(200):
        m = 0.5 * (lo + hi)
        if h * math.cos(m) - (c - r) * math.sin(m) > r:
            lo = m
        else:
            hi = m
    return 0.5 * (lo + hi)


def leading_edges(M, d):
    per_span = L.cp_pitot(M) * R_LE * 2 * (math.cos(d) - math.cos(d) ** 3 / 3)
    return N_FIN * SPAN * per_span / A_REF


def le_newtonian_numeric(d, n=200000):
    """check: integrate Cp/Cp_pitot = cos^2(phi) over the front arc up to the tangent points, projected."""
    phit = math.pi / 2 - d
    s = 0.0
    for i in range(n):
        ph = -phit + (i + 0.5) * 2 * phit / n
        s += math.cos(ph) ** 2 * math.cos(ph) * R_LE * (2 * phit / n)
    return s


def fin_wave(M, d, rounded=True):
    beta = math.sqrt(M * M - 1)
    ratio = 1 - CHORD / (2 * math.pi * beta * SPAN)       # 0010 section 2, beta s >= c
    if rounded:
        rise = H_TE - R_LE * math.cos(d)
    else:
        rise = H_TE
    cp, _ = L.oblique_cp(M, d)
    cd2d = 2 * cp * rise                                   # per unit span, both faces
    return N_FIN * SPAN * cd2d * ratio / A_REF, ratio, cp, rise


# ---------------------------------------------------------------- friction
def friction(M, Rcal, ReT=None, Tw=None, axial=True, transition_on="s", n_cone=6000, n_cyl=3000):
    body = L.body_momentum_integral(Rcal, M, T_AIR, TH_C, L_CONE, L_BODY, ReT=ReT, Tw=Tw, n_cone=n_cone,
                                    n_cyl=n_cyl, transition_on=transition_on)
    bf = body["cd_axial"] if axial else body["cd_surface"]
    Rec = Rcal * CHORD
    CF = L.flat_plate_CF(Rec, M, T_AIR, ReT=ReT, Tw=Tw)
    ff = CF * 2 * CHORD * SPAN * N_FIN / A_REF
    return bf, ff, body


# ---------------------------------------------------------------- the total
BANDS = dict(body_friction=(0.88, 1.19), fins_own=(1.01, 1.59), le=(0.99, 1.06), le_extra=0.03,
             base_curve=(0.82, 1.08), te=(0.93, 1.21), nose=7e-5)


def shot_total(shot, opt):
    name, M, CX0, ReL, cl = shot
    Rcal = ReL / 10.0
    Rec = Rcal * CHORD
    out = dict(shot=name, M=M, CX0=CX0, ReL=ReL)
    # nose
    cpn, _, _ = L.cone_cp(M, TH_C, nstep=opt.get("tm_steps", 4000))
    out["nose"] = cpn
    # friction
    bf, ff, body = friction(M, Rcal, axial=opt["axial"])
    out["body_friction"], out["fin_friction"] = bf, ff
    # fin edges and faces
    d = face_angle()
    out["delta_deg"] = math.degrees(d)
    out["le"] = leading_edges(M, d)
    ReD = Rcal * 2 * R_LE
    out["ReD"] = ReD
    out["le_extrapolated"] = (M < 2.48) and (ReD < 1e5)
    fw, ratio, cpf, rise = fin_wave(M, d)
    out["fin_wave"], out["ratio3d"], out["cp_face"], out["rise"] = fw, ratio, cpf, rise
    # body base
    Mf = 1.80 if 1.798 - 1e-12 <= M < 1.80 else M          # 0010 section 1.3: the 1.80 row within 0.002
    if opt["F_mode"] == "direct":
        Flo, Fhi, F = fins_on_base_band(Mf, opt["r3_err_end"])
    else:
        Flo, Fhi, F = fins_on_base_rows_then_interp(Mf, opt["r3_err_end"])
    pb = pb_less(M)
    out["PB_less"], out["F"], out["F_low"], out["F_high"] = pb, F, Flo, Fhi
    out["base"] = -pb * F
    out["interp_bound"] = interp_bound(M)
    # fins' trailing-edge base
    te, PBte, rte = te_base(M)
    out["te"], out["PB_te"] = te, PBte
    lam = te_laminar_band(Rec, crossed=opt["lam_crossed"])
    out["te_lam_lo"], out["te_lam_hi"] = lam[0] * te, lam[1] * te
    out["te_lam_rel"] = (lam[0], lam[1])
    out["Xt"], out["Xl"], out["lam_flags"] = lam[2], lam[3], lam[4]
    # bands (C_D, low and high deviations)
    b = {}
    b["nose"] = (-BANDS["nose"], BANDS["nose"])
    b["body_friction"] = ((BANDS["body_friction"][0] - 1) * bf, (BANDS["body_friction"][1] - 1) * bf)
    b["fin_friction"] = ((BANDS["fins_own"][0] - 1) * ff, (BANDS["fins_own"][1] - 1) * ff)
    le_lo, le_hi = BANDS["le"]
    if out["le_extrapolated"]:
        le_lo, le_hi = le_lo - BANDS["le_extra"], le_hi + BANDS["le_extra"]
    b["le"] = ((le_lo - 1) * out["le"], (le_hi - 1) * out["le"])
    b["fin_wave"] = ((BANDS["fins_own"][0] - 1) * fw, (BANDS["fins_own"][1] - 1) * fw)
    ib = out["interp_bound"] * (F if opt["interp_times_F"] else 1.0)
    b["base"] = ((BANDS["base_curve"][0] - 1) * out["base"] - ib + (Flo - F) * (-pb),
                 (BANDS["base_curve"][1] - 1) * out["base"] + ib + (Fhi - F) * (-pb))
    b["base_parts"] = dict(curve=((BANDS["base_curve"][0] - 1) * out["base"], (BANDS["base_curve"][1] - 1) * out["base"]),
                           interp=ib, F=((Flo - F) * (-pb), (Fhi - F) * (-pb)))
    b["te"] = ((BANDS["te"][0] - 1) * te, (BANDS["te"][1] - 1) * te)
    out["bands"] = b
    comps = ["nose", "body_friction", "fin_friction", "le", "fin_wave", "base", "te"]
    tot = sum(out[c] for c in comps)
    out["total"] = tot
    out["band_lo"] = sum(b[c][0] for c in comps)
    out["band_hi"] = sum(b[c][1] for c in comps)
    # input bands: transition (friction) and wall
    trans = []
    for ReT in RE_T:
        bfT, ffT, _ = friction(M, Rcal, ReT=ReT, axial=opt["axial"], transition_on=opt["transition_on"])
        trans.append((bfT + ffT) - (bf + ff))
    out["transition"] = trans
    out["transition_lo"] = min(trans)
    bfw, ffw, _ = friction(M, Rcal, Tw=T_AIR, axial=opt["axial"])
    out["wall"] = (bfw + ffw) - (bf + ff)
    out["wall_parts"] = (bfw - bf, ffw - ff)
    return out


def cluster_spread(shots):
    sp = {}
    for c in sorted(set(s[4] for s in shots)):
        v = [s[2] for s in shots if s[4] == c]
        m = sum(v) / len(v)
        sp[c] = (min(v) / m - 1, max(v) / m - 1)
    return sp


def run(opt):
    sp = cluster_spread(SHOTS)
    res = []
    for s in SHOTS:
        o = shot_total(s, opt)
        lo_s, hi_s = sp[s[4]]
        T = o["total"]
        o["residual"] = o["CX0"] / T - 1
        o["tol_lo"] = (o["band_lo"] + o["transition_lo"] + o["te_lam_lo"]) / T + lo_s
        o["tol_hi_nowall"] = (o["band_hi"] + o["te_lam_hi"]) / T + hi_s
        o["tol_hi"] = o["tol_hi_nowall"] + o["wall"] / T
        o["spread"] = (lo_s, hi_s)
        o["pass"] = o["tol_lo"] <= o["residual"] <= o["tol_hi"]
        res.append(o)
    return res


DEFAULT = dict(axial=True, F_mode="direct", r3_err_end=0.002, interp_times_F=True, lam_crossed=True,
               transition_on="s")


def report(res):
    print("Components (C_D on the cylinder cross-section)")
    print("shot        M      nose    bodyF   finF    LE      finW    base    TE      total")
    for o in res:
        print(f"{o['shot']} {o['M']:.3f}  {o['nose']:.4f}  {o['body_friction']:.4f}  {o['fin_friction']:.4f}  "
              f"{o['le']:.4f}  {o['fin_wave']:.4f}  {o['base']:.4f}  {o['te']:.4f}  {o['total']:.4f}")
    print("\nBands and tolerance")
    print("shot        M      total (model-form band)     F (band)                trans    wall     TE lam            resid    tolerance (no wall)          pass")
    for o in res:
        print(f"{o['shot']} {o['M']:.3f}  {o['total']:.4f} ({o['total'] + o['band_lo']:.4f} to {o['total'] + o['band_hi']:.4f})  "
              f"{o['F']:.4f} ({o['F_low']:.4f} to {o['F_high']:.4f})  {o['transition_lo']:+.4f}  {o['wall']:+.4f}  "
              f"{o['te_lam_lo']:+.4f} {o['te_lam_hi']:+.4f}  {100 * o['residual']:+.2f}%  "
              f"{100 * o['tol_lo']:+.2f}% to {100 * o['tol_hi']:+.2f}% ({100 * o['tol_hi_nowall']:+.2f}%)  {o['pass']}")


if __name__ == "__main__":
    res = run(DEFAULT)
    report(res)
    if "--json" in sys.argv:
        path = sys.argv[sys.argv.index("--json") + 1]
        json.dump(res, open(path, "w"), indent=1, default=str)
