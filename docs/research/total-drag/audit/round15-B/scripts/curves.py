"""Dense ink tracing of faired curves and readings at fixed abscissae (or ordinates).

The panel is scanned along lines of constant 'step coordinate' s (X for fig. 14/15, alpha for
fig. 8) one image pixel apart. Along each scan line the ink is split into runs (trace.runs).
Each curve has a hand-made guide polyline (from my own run listings and zoomed views); at each
scan line the run nearest the guide, within a tolerance, is assigned to that curve. A run
claimed by two curves is marked shared (merged ink). Readings at a target s are then taken
from a straight-line (or, where a dash gap forces a wider window, quadratic) fit of the
curve's own run centres near the target; no centre from another curve or from a shared run
is used. Nothing is smoothed beyond that local fit through the ink of the drawn line.
"""
import numpy as np
import trace


def interp_guide(guide, s):
    gs = np.array([p[0] for p in guide])
    gv = np.array([p[1] for p in guide])
    order = np.argsort(gs)
    gs, gv = gs[order], gv[order]
    if s < gs[0] or s > gs[-1]:
        return None
    return float(np.interp(s, gs, gv))


def scan_panel(g, cal, P):
    """P: dict with fixed ('x' or 'y'), s_lo, s_hi, v_lo, v_hi, grid_s (list), grid_v (list),
    excl (list of (s0,s1,v0,v1)), thr, wthr, gmax, minlen_px, curves {name: {guide, tol}}"""
    cx, cy = cal['cx'], cal['cy']
    sx, sy = cal['stats']['sx'], cal['stats']['sy']
    fixed = P['fixed']
    s_px = sx if fixed == 'x' else sy      # px per unit along step coordinate
    v_px = sy if fixed == 'x' else sx      # px per unit along scan coordinate
    ds = 1.0 / s_px
    dv = 0.5 / v_px
    thr, wthr = P.get('thr', 110), P.get('wthr', 140)
    gmax = P.get('gmax', 92)
    minlen = int(round(P.get('minlen_px', 4) / 0.5))
    gap_px = P.get('grid_gap_px', 6)
    traces = {k: [] for k in P['curves']}
    s = P['s_lo']
    while s <= P['s_hi'] + 1e-12:
        if any(abs(s - gsv) * s_px < gap_px for gsv in P.get('grid_s', [])):
            s += ds
            continue
        v, prof, p = trace.sample(g, cx, cy, fixed, s, P['v_lo'], P['v_hi'], dv)
        rr = trace.runs(v, prof, thr, wthr, minlen=minlen)
        rr = [r for r in rr if r['gmin'] <= gmax]
        rr = [r for r in rr if not any(e[0] <= s <= e[1] and e[2] <= r['c'] <= e[3]
                                       for e in P.get('excl', []))]
        claims = {}
        guides = {k: interp_guide(c['guide'], s) for k, c in P['curves'].items()}
        for k, c in P['curves'].items():
            gv = guides[k]
            if gv is None or not rr:
                continue
            tol = c.get('tol', P.get('tol', 0.025))
            others = [abs(gv - guides[o]) for o in guides if o != k and guides[o] is not None]
            if others and c.get('adaptive', True):
                tol = min(tol, max(0.6 * min(others), P.get('tol_min', 0.006)))
            d = [abs(r['c'] - gv) if not (r['lo'] <= gv <= r['hi']) else 0.0 for r in rr]
            # distance from guide to the run (0 if guide inside run), tie broken by centre
            j = int(np.argmin([di + 1e-3 * abs(r['c'] - gv) for di, r in zip(d, rr)]))
            if d[j] <= tol:
                claims.setdefault(j, []).append(k)
        for j, ks in claims.items():
            r = rr[j]
            for k in ks:
                traces[k].append(dict(s=s, c=r['c'], lo=r['lo'], hi=r['hi'], gmin=r['gmin'],
                                      shared=[o for o in ks if o != k]))
        s += ds
    return traces


def read_at(tr, target, s_px, v_px, use=None):
    """Read one curve at target s from its own trace (unshared points only).

    1. Direct: if the curve's own ink lies within 1.5 px of the target, a straight-line fit
       through its centres within +-6 px (one or both sides).
    2. Bridged: otherwise the smallest window d in (8, 14, 22, 32, 45) px that has at least two
       centres on each side; straight line for d <= 8, quadratic beyond.
    Returns value, its standard error, residual scatter, slope, window, degree, gap.
    """
    S = np.array([t['s'] for t in tr])
    C = np.array([t['c'] for t in tr])
    W = np.array([t['hi'] - t['lo'] for t in tr])
    ok = np.array([len(t['shared']) == 0 for t in tr])
    if use is not None:
        ok &= use
    if ok.sum() == 0:
        return None
    dist = np.abs(S - target) * s_px
    trials = []
    if (ok & (dist <= 1.5)).any():
        trials.append((6, 1, False))
    trials += [(8, 1, True), (14, 2, True), (22, 2, True), (32, 2, True), (45, 2, True)]
    for d, deg, both in trials:
        m = ok & (dist <= d)
        left = m & (S <= target)
        right = m & (S >= target)
        if both and (left.sum() < 2 or right.sum() < 2):
            continue
        if m.sum() < deg + 3:
            continue
        ss = S[m] - target
        A = np.vander(ss, deg + 1)
        coef, *_ = np.linalg.lstsq(A, C[m], rcond=None)
        resid = C[m] - A @ coef
        dof = max(m.sum() - deg - 1, 1)
        sig = np.sqrt((resid ** 2).sum() / dof)
        cov = sig ** 2 * np.linalg.pinv(A.T @ A)
        se = np.sqrt(max(cov[-1, -1], 0))
        gl = (target - S[left].max()) * s_px if left.any() else 0.0
        gr = (S[right].min() - target) * s_px if right.any() else 0.0
        return dict(v=float(coef[-1]), se=float(se), sig=float(sig), slope=float(coef[-2]),
                    window_px=d, deg=deg, n=int(m.sum()), gap_px=float(max(gl, gr)) if both else 0.0,
                    width=float(np.median(W[m])), idx=np.where(m)[0].tolist())
    return None


def nearby_shared(tr, target, s_px, d=4):
    S = np.array([t['s'] for t in tr])
    sh = np.array([len(t['shared']) > 0 for t in tr])
    m = np.abs(S - target) * s_px <= d
    return bool((sh & m).any()), [tr[i] for i in np.where(m & sh)[0]]


def extent(tr):
    S = np.array([t['s'] for t in tr])
    return float(S.min()), float(S.max())
