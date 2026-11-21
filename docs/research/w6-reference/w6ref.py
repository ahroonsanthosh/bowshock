"""
W6's independent reference: SU2 (an external code, v8.1.0) solving the
axisymmetric Euler equations around capped (and sharp) noses on grids made
here, with its own shock capturing through the bow shock and any embedded
shock, and the forebody pressure drag integrated here from SU2's surface
pressures. Nothing in this file uses bowshock's solver, grids or geometry.

  python3 -I docs/research/w6-reference/w6ref.py geometry-check <out.json>
  python3 -I docs/research/w6-reference/w6ref.py case <spec.json> <run dir> <SU2_CFD> [threads]
  python3 -I docs/research/w6-reference/w6ref.py level4 <run dir> <SU2_CFD> [threads]
  python3 -I docs/research/w6-reference/w6ref.py drag <run dir>
  python3 -I docs/research/w6-reference/w6ref.py spec capped <shape> <calibers> <tip ratio> <M> <out.json> [widen]
  python3 -I docs/research/w6-reference/w6ref.py spec sharp <shape> <calibers> <M> <out.json> [widen]

Lengths are in body diameters (calibers): base radius R = 0.5, the nose's
tip at x = 0, the axis along x. The drag coefficient is the pressure drag
of the nose on the base area pi R^2 (the cylinder behind carries none).
"""

import fcntl
import hashlib
import json
import math
import os
import subprocess
import sys
import time

import numpy as np

R = 0.5


# ----------------------------------------------------------------- geometry
#
# A parent nose, pointed, of length Lp and base radius R; the capped nose
# is a sphere of radius rn centred on the axis and tangent to the parent at
# xi_t, then the parent behind the tangent point, the whole shifted so that
# the cap's front is at x = 0 and the nose keeps its overall length L. So
# Lp = L + offset, offset = xi_c - rn, xi_c = xi_t + y y'(xi_t), and the
# tangent point is where y sqrt(1 + y'^2) = rn.


def ogive(Lp):
    """The tangent ogive of length Lp: y(xi), y'(xi)."""
    rho = (R * R + Lp * Lp) / (2 * R)

    def y(xi):
        return math.sqrt(rho * rho - (Lp - xi) ** 2) + R - rho

    def dy(xi):
        return (Lp - xi) / math.sqrt(rho * rho - (Lp - xi) ** 2)

    return y, dy


def _haack_area(theta):
    # theta - sin(2 theta)/2, by its series where the formula cancels.
    if theta < 0.1:
        t2 = theta * theta
        return theta**3 * (4 / 3 - t2 * (4 / 15 - t2 * (8 / 315 - t2 * (4 / 2835))))
    return theta - math.sin(2 * theta) / 2


def von_karman(Lp):
    """The LD-Haack (Von Karman) nose of length Lp: y(xi), y'(xi)."""

    def theta_of(xi):
        # theta = acos(1 - 2 t) = 2 asin(sqrt(t)), precise near the tip.
        t = min(max(xi / Lp, 0.0), 1.0)
        return 2 * math.asin(math.sqrt(t))

    def y(xi):
        return R / math.sqrt(math.pi) * math.sqrt(_haack_area(theta_of(xi)))

    def dy(xi):
        th = theta_of(xi)
        a = _haack_area(th)
        # d(area)/d(theta) = 1 - cos(2 theta) = 2 sin^2 theta; d theta/d xi = 2 / (Lp sin theta).
        if a <= 0:
            return math.inf
        dadxi = 2 * math.sin(th) ** 2 * 2 / (Lp * math.sin(th))
        return R / math.sqrt(math.pi) * dadxi / (2 * math.sqrt(a))

    return y, dy


def cone(Lp):
    def y(xi):
        return R * xi / Lp

    def dy(xi):
        return R / Lp

    return y, dy


PARENTS = {"ogive": ogive, "vk": von_karman, "cone": cone}


def _bisect(f, lo, hi, tol=1e-15, it=400):
    flo = f(lo)
    for _ in range(it):
        mid = 0.5 * (lo + hi)
        fm = f(mid)
        if (fm > 0) == (flo > 0):
            lo, flo = mid, fm
        else:
            hi = mid
        if hi - lo <= tol * max(1.0, abs(hi)):
            break
    return 0.5 * (lo + hi)


def capped(shape, L, rn):
    """The capped nose: a function r(x) on [0, L], and its parts, or the pointed nose if rn == 0."""
    if shape == "hemisphere":
        # The whole nose a cap of the base radius (check V5 only).
        if not (L == R and rn == R):
            raise ValueError("a hemisphere has length and tip radius equal to the base radius")
        return {"L": L, "Lp": L, "offset": 0.0, "xt": L, "xc": L, "rn": rn, "y": None, "dy": None}
    make = PARENTS[shape]
    if rn == 0:
        y, dy = make(L)
        return {"L": L, "Lp": L, "offset": 0.0, "xt": 0.0, "xc": 0.0, "rn": 0.0, "y": y, "dy": dy}

    def parts(Lp):
        y, dy = make(Lp)
        # Tangent point: y sqrt(1 + y'^2) = rn, increasing from 0 at the tip.
        g = lambda xi: y(xi) * math.sqrt(1 + dy(xi) ** 2) - rn
        xi_t = _bisect(g, 1e-14 * Lp, Lp * (1 - 1e-12))
        xi_c = xi_t + y(xi_t) * dy(xi_t)
        return y, dy, xi_t, xi_c, xi_c - rn

    def h(Lp):
        return Lp - parts(Lp)[4] - L

    Lp = _bisect(h, L, 4 * L)
    y, dy, xi_t, xi_c, off = parts(Lp)
    if abs(h(Lp)) > 1e-12:
        raise ValueError("the parent's length did not converge")
    return {"L": L, "Lp": Lp, "offset": off, "xt": xi_t - off, "xc": xi_c - off, "rn": rn,
            "y": y, "dy": dy}


def radius(nose, x):
    """r(x) of the capped nose at x in [0, L] (capped coordinates)."""
    rn = nose["rn"]
    if rn > 0 and x <= nose["xt"]:
        # The cap: sqrt(x (2 rn - x)), which does not cancel near the tip.
        return math.sqrt(max(0.0, x * (2 * rn - x)))
    return nose["y"](x + nose["offset"])


# ---------------------------------------------------------------- the body
#
# The wall from the tip, along the nose, then the cylinder to x = L + Lcyl.
# Arc length s along the wall; the wall is sampled finely once and every
# grid point is interpolated from that table (cubic in s).


def wall_table(nose, Lcyl, n=200001):
    """The wall as (x, r, s), finely sampled: the cap by angle, the parent and the cylinder by x."""
    rn = nose["rn"]
    pts = []
    if rn > 0:
        # The cap: x = rn (1 - cos phi), r = rn sin phi, phi from 0 to the tangent point's.
        phit = math.acos(max(-1.0, min(1.0, (rn - nose["xt"]) / rn)))
        m = 20001
        for k in range(m):
            phi = phit * k / (m - 1)
            pts.append((rn * (1 - math.cos(phi)), rn * math.sin(phi)))
        x0 = nose["xt"]
    else:
        x0 = 0.0
    L = nose["L"]
    # The parent, densest at its start (x - x0 = (L - x0) u^3); none behind a hemisphere.
    m = n if x0 < L else 1
    for k in range(1, m):
        u = k / (m - 1)
        x = x0 + (L - x0) * u**3
        pts.append((x, radius(nose, x)))
    if rn == 0:
        pts.insert(0, (0.0, 0.0))
    # The cylinder.
    m2 = 2001
    for k in range(1, m2):
        pts.append((L + Lcyl * k / (m2 - 1), R))
    a = np.array(pts)
    ds = np.hypot(np.diff(a[:, 0]), np.diff(a[:, 1]))
    s = np.concatenate([[0.0], np.cumsum(ds)])
    return a[:, 0], a[:, 1], s


def mapping(b):
    """The stretching u(xi) = (exp(b xi) - 1) / (exp(b) - 1), b > 0 (b = 0: uniform)."""
    if b == 0:
        return lambda xi: xi
    return lambda xi: (np.exp(b * xi) - 1) / math.expm1(b)


def grid(spec, level):
    """
    The structured grid of `spec` at `level` (0 the coarsest; each level
    halves every spacing of the one before, by sampling the same mappings),
    and its boundary edges. A sharp nose takes an H grid (`h_grid`), a capped
    nose a C grid whose lines leave the wall along its normals (`c_grid`).
    """
    nose = capped(spec["shape"], spec["L"], spec["rn"])
    if spec["rn"] == 0:
        x, r, marks = h_grid(spec, nose, level)
    else:
        x, r, marks = c_grid(spec, nose, level)
    return nose, x, r, marks


def _edges_i(i, nj, idx):
    return [(idx(i, j), idx(i, j + 1)) for j in range(nj)]


def _edges_j(j, ni, idx):
    return [(idx(i, j), idx(i + 1, j)) for i in range(ni)]


def h_grid(spec, nose, level):
    """
    Sharp noses: lines of constant x from x = -a (the inflow) to the end of
    the cylinder, each from the axis (ahead of the tip) or the wall to a
    straight outer line from (-a, Rin) to (X, Rout); the tip is a grid
    point. ni_up cells ahead of the tip and ni_body along the body, each
    clustered toward the tip by its own mapping.
    """
    a, X = spec["a"], spec["L"] + spec["Lcyl"]
    up = spec["ni0_up"] * 2**level
    body = spec["ni0"] * 2**level
    nj = spec["nj0"] * 2**level
    # Ahead of the tip: x from -a to 0, densest at 0.
    u_up = mapping(spec["bi_up"])(np.linspace(0, 1, up + 1))
    x_up = -a * u_up[::-1]
    u_b = mapping(spec["bi"])(np.linspace(0, 1, body + 1))
    x_b = X * u_b
    xs = np.concatenate([x_up, x_b[1:]])
    low = np.array([0.0 if xv <= 0 else (radius(nose, xv) if xv <= nose["L"] else R) for xv in xs])
    rin, rout = spec["Rin"], spec["Rout"]
    high = rin + (rout - rin) * (xs + a) / (X + a)
    uj = mapping(spec["bj"])(np.linspace(0, 1, nj + 1))
    x = np.repeat(xs[:, None], nj + 1, axis=1)
    r = low[:, None] + (high - low)[:, None] * uj[None, :]
    ni = len(xs) - 1
    idx = lambda i, j: i * (nj + 1) + j
    lower = _edges_j(0, ni, idx)
    axis = [e for k, e in enumerate(lower) if xs[k + 1] <= 0]
    wall = [e for k, e in enumerate(lower) if xs[k] >= 0]
    marks = {
        "wall": wall,
        "axis": axis,
        "farfield": _edges_i(0, nj, idx) + _edges_j(nj, ni, idx),
        "outlet": _edges_i(ni, nj, idx),
    }
    return x, r, marks


def c_grid(spec, nose, level):
    """
    Capped noses: i along the wall from the stagnation point (i = 0 the
    axis ahead of it), j along the wall's outward normal to the outer
    boundary at the distance d(s) = a + k s from the wall (s the arc length
    from the stagnation point). Around the spherical cap the grid is then
    polar about the sphere's centre, so nearly orthogonal; a and k are
    chosen so that the bow shock lies inside (checked after each solve).
    """
    xs, rs, ss = wall_table(nose, spec["Lcyl"])
    S = ss[-1]
    ni = spec["ni0"] * 2**level
    nj = spec["nj0"] * 2**level
    sw = mapping(spec["bi"])(np.linspace(0, 1, ni + 1)) * S
    xw = np.interp(sw, ss, xs)
    rw = np.interp(sw, ss, rs)
    h = 1e-7 * S
    nx = np.empty(ni + 1)
    nr = np.empty(ni + 1)
    for i in range(ni + 1):
        if i == 0:
            nx[i], nr[i] = -1.0, 0.0
            continue
        s1, s2 = max(0.0, sw[i] - h), min(S, sw[i] + h)
        dx = np.interp(s2, ss, xs) - np.interp(s1, ss, xs)
        dr = np.interp(s2, ss, rs) - np.interp(s1, ss, rs)
        n = math.hypot(dx, dr)
        nx[i], nr[i] = -dr / n, dx / n
    d = spec["a"] + spec["k"] * sw
    xo = xw + d * nx
    ro = rw + d * nr
    ro[0] = 0.0
    uj = mapping(spec["bj"])(np.linspace(0, 1, nj + 1))
    x = xw[:, None] + (xo - xw)[:, None] * uj[None, :]
    r = rw[:, None] + (ro - rw)[:, None] * uj[None, :]
    idx = lambda i, j: i * (nj + 1) + j
    marks = {
        "wall": _edges_j(0, ni, idx),
        "axis": _edges_i(0, nj, idx),
        "farfield": _edges_j(nj, ni, idx),
        "outlet": _edges_i(ni, nj, idx),
    }
    return x, r, marks


def write_su2(path, x, r, marks):
    """The grid in SU2's native format: quads, and the markers given as edges (pairs of point indices)."""
    ni, nj = x.shape[0] - 1, x.shape[1] - 1
    idx = lambda i, j: i * (nj + 1) + j
    with open(path, "w") as f:
        f.write("NDIME= 2\n")
        f.write(f"NELEM= {ni * nj}\n")
        e = 0
        for i in range(ni):
            for j in range(nj):
                f.write(f"9 {idx(i, j)} {idx(i + 1, j)} {idx(i + 1, j + 1)} {idx(i, j + 1)} {e}\n")
                e += 1
        f.write(f"NPOIN= {(ni + 1) * (nj + 1)}\n")
        k = 0
        for i in range(ni + 1):
            for j in range(nj + 1):
                f.write(f"{x[i, j]:.17e} {r[i, j]:.17e} {k}\n")
                k += 1
        f.write(f"NMARK= {len(marks)}\n")
        for name, edges in marks.items():
            f.write(f"MARKER_TAG= {name}\n")
            f.write(f"MARKER_ELEMS= {len(edges)}\n")
            for p, q in edges:
                f.write(f"3 {p} {q}\n")


def quality(x, r):
    """The smallest cell area (signed) and the largest skew (cosine of the corner angle) of the grid."""
    p0 = np.stack([x[:-1, :-1], r[:-1, :-1]], -1)
    p1 = np.stack([x[1:, :-1], r[1:, :-1]], -1)
    p2 = np.stack([x[1:, 1:], r[1:, 1:]], -1)
    p3 = np.stack([x[:-1, 1:], r[:-1, 1:]], -1)
    cross = lambda u, v: u[..., 0] * v[..., 1] - u[..., 1] * v[..., 0]
    area = 0.5 * (cross(p1 - p0, p3 - p0) + cross(p3 - p2, p1 - p2))
    e1 = p1 - p0
    e2 = p3 - p0
    cosang = np.abs((e1 * e2).sum(-1)) / (np.linalg.norm(e1, axis=-1) * np.linalg.norm(e2, axis=-1))
    return float(area.min()), float(cosang.max())


CFG = """SOLVER= EULER
MATH_PROBLEM= DIRECT
AXISYMMETRIC= YES
RESTART_SOL= {restart}
MACH_NUMBER= {mach}
AOA= 0.0
SIDESLIP_ANGLE= 0.0
FREESTREAM_PRESSURE= 101325.0
FREESTREAM_TEMPERATURE= 288.15
GAMMA_VALUE= 1.4
GAS_CONSTANT= 287.058
REF_DIMENSIONALIZATION= FREESTREAM_PRESS_EQ_ONE
REF_ORIGIN_MOMENT_X= 0.0
REF_ORIGIN_MOMENT_Y= 0.0
REF_ORIGIN_MOMENT_Z= 0.0
REF_LENGTH= 1.0
REF_AREA= 1.0
MARKER_EULER= ( wall )
MARKER_SYM= ( axis )
MARKER_FAR= ( farfield, outlet )
MARKER_PLOTTING= ( wall )
MARKER_MONITORING= ( wall )
NUM_METHOD_GRAD= WEIGHTED_LEAST_SQUARES
CFL_NUMBER= {cfl}
CFL_ADAPT= {cfladapt}
CFL_ADAPT_PARAM= ( 0.5, 1.2, {cfl}, {cflmax} )
ITER= {iters}
LINEAR_SOLVER= FGMRES
LINEAR_SOLVER_PREC= ILU
LINEAR_SOLVER_ERROR= 1E-6
LINEAR_SOLVER_ITER= 10
CONV_NUM_METHOD_FLOW= {scheme}
MUSCL_FLOW= {muscl}
SLOPE_LIMITER_FLOW= {limiter}
VENKAT_LIMITER_COEFF= {venkat}
TIME_DISCRE_FLOW= EULER_IMPLICIT
CONV_FIELD= RMS_DENSITY
CONV_RESIDUAL_MINVAL= {minres}
CONV_STARTITER= 10
MESH_FILENAME= mesh.su2
MESH_FORMAT= SU2
SOLUTION_FILENAME= {solution}
READ_BINARY_RESTART= {binary}
RESTART_FILENAME= restart_flow.dat
OUTPUT_FILES= ( RESTART, RESTART_ASCII, SURFACE_CSV )
SURFACE_FILENAME= surface_flow
SCREEN_OUTPUT= ( INNER_ITER, RMS_DENSITY, RMS_ENERGY, DRAG )
HISTORY_OUTPUT= ( ITER, RMS_RES, AERO_COEFF )
CONV_FILENAME= history
OUTPUT_WRT_FREQ= 1000
SCREEN_WRT_FREQ_INNER= 100
"""


def write_cfg(path, spec, restart=False, seed=False):
    """SU2's configuration; a restart reads the stage before's binary file, or with `seed` the ASCII seed."""
    with open(path, "w") as f:
        f.write(
            CFG.format(
                mach=spec["mach"],
                restart="YES" if restart or seed else "NO",
                solution="seed.csv" if seed else "restart_flow.dat",
                binary="NO" if seed else "YES",
                cfl=spec["cfl"],
                cflmax=spec["cflmax"],
                iters=spec["iters"],
                scheme=spec["scheme"],
                venkat=spec["venkat"],
                limiter=spec["limiter"],
                minres=spec["minres"],
                cfladapt=spec["cfladapt"],
                muscl=spec["muscl"],
            )
        )


# ------------------------------------------------------------ the drag
#
# From SU2's surface file: the wall's vertices with x, y (= r) and the
# pressure coefficient. The nose's pressure drag on pi R^2 is
# integral of Cp d(r^2) / R^2 over the nose (r rising from 0 to R), the
# trapezoid rule in r^2 between vertices; the cylinder adds nothing.


def read_surface(path):
    with open(path) as f:
        head = [h.strip().strip('"') for h in f.readline().split(",")]
        rows = [list(map(float, line.split(","))) for line in f if line.strip()]
    a = np.array(rows)
    col = {h: k for k, h in enumerate(head)}
    return a[:, col["x"]], a[:, col["y"]], a[:, col["Pressure_Coefficient"]]


def write_wall(path, x, r, cp):
    """The wall's vertices from SU2's surface file, x, r and Cp at full precision (what the verdict reads)."""
    order = np.argsort(x, kind="stable")
    with open(path, "w") as f:
        f.write('"x","y","Pressure_Coefficient"\n')
        for k in order:
            f.write(f"{x[k]:.17e},{r[k]:.17e},{cp[k]:.17e}\n")


def wall_to(x, r, cp, L, r_end=None):
    """
    The wall's vertices from the tip to x = L, in order. Where no vertex lies
    at L (within 1e-12), a point is added there: Cp linear in x between the
    vertices either side, r = r_end (R at the nose's end, where the nose meets
    the cylinder) or, if not given, linear in x too. So the integral reaches
    L, at the nose's end the whole base area.
    """
    order = np.argsort(x, kind="stable")
    x, r, cp = x[order], r[order], cp[order]
    keep = x <= L + 1e-12
    xk, rk, ck = x[keep], r[keep], cp[keep]
    if L - xk[-1] > 1e-12:
        nxt = np.argmax(x > L)
        if not x[nxt] > L:
            raise ValueError("the wall does not reach the end asked")
        t = (L - xk[-1]) / (x[nxt] - xk[-1])
        c_end = ck[-1] + t * (cp[nxt] - ck[-1])
        r_at = rk[-1] + t * (r[nxt] - rk[-1]) if r_end is None else r_end
        xk, rk, ck = np.append(xk, L), np.append(rk, r_at), np.append(ck, c_end)
    return xk, rk, ck


def nose_drag(x, r, cp, L, r_end=None):
    """The integral of Cp d(r^2) / R^2 from the tip to x = L (trapezoid rule in r^2), closed at L (`wall_to`)."""
    x, r, cp = wall_to(x, r, cp, L, r_end)
    r2 = r * r
    return float(np.sum(0.5 * (cp[1:] + cp[:-1]) * np.diff(r2)) / (R * R))


# ------------------------------------------------------- exact checks
#
# The tool's own exact references, for its verification: the sharp cone's
# surface pressure by the Taylor-Maccoll equation (integrated here, RK4,
# from the shock inward), and the stagnation pressure behind a normal shock
# (Rayleigh's pitot formula).

GAMMA = 1.4


def regions(L, x0):
    """
    The regions of the regional change (registration R4): [0, x0], then each
    next region twice the length of all before it (its end twice the last
    end) but at most half a caliber long, to L. x0 is the cap's tangent point
    on a capped nose, L / 128 on a sharp one.
    """
    edges = [0.0, x0]
    while edges[-1] < L - 1e-12:
        edges.append(min(2 * edges[-1], edges[-1] + 0.5, L))
    return edges


def changes(coarse_surface, fine_surface, L, x0, r_end=None):
    """
    The change of the drag's distribution between two levels, both closed at
    L (`wall_to`), the coarser level's Cp taken linearly in r^2 at the finer
    level's vertices, the integrand's change on each of the finer level's
    segments by the trapezoid rule in r^2:
    - "vertex": the sum of the segments' |change| (no cancellation at all);
    - "regions": the sum over `regions` of |the change summed over the
      region's segments| (a segment belongs to the region holding its
      midpoint in x): cancellation inside a region, none between regions.
    Each bounds the change of the total drag between the two levels.
    """
    (xc, rc, cc), (xf, rf, cf) = (wall_to(*read_surface(p), L, r_end) for p in (coarse_surface, fine_surface))
    d = cf - np.interp(rf**2, rc**2, cc)
    q = rf**2 / R**2
    seg = 0.5 * (d[1:] + d[:-1]) * np.diff(q)
    segabs = 0.5 * (np.abs(d[1:]) + np.abs(d[:-1])) * np.diff(q)
    mid = 0.5 * (xf[1:] + xf[:-1])
    edges = regions(L, x0)
    idx = np.clip(np.searchsorted(edges, mid, side="right") - 1, 0, len(edges) - 2)
    by = np.zeros(len(edges) - 1)
    np.add.at(by, idx, seg)
    return {"vertex": float(np.sum(segabs)), "regions": float(np.sum(np.abs(by))), "signed": float(np.sum(seg)),
            "count": len(edges) - 1}


def _oblique(M, beta):
    """Mach number, deflection and pressure ratio behind an oblique shock of wave angle beta."""
    g = GAMMA
    mn = M * math.sin(beta)
    theta = math.atan(2 / math.tan(beta) * (mn * mn - 1) / (M * M * (g + math.cos(2 * beta)) + 2))
    mn2 = math.sqrt((1 + (g - 1) / 2 * mn * mn) / (g * mn * mn - (g - 1) / 2))
    M2 = mn2 / math.sin(beta - theta)
    p2 = 1 + 2 * g / (g + 1) * (mn * mn - 1)
    return M2, theta, p2


def _tm_cone_angle(M, beta, steps=20000):
    """Integrate Taylor-Maccoll inward from a shock of angle beta; the cone angle and its surface Mach number."""
    g = GAMMA
    M2, theta, _ = _oblique(M, beta)
    # Non-dimensional speed V' = V / V_max behind the shock.
    V2 = (2 / ((g - 1) * M2 * M2) + 1) ** -0.5
    vr = V2 * math.cos(beta - theta)
    vt = -V2 * math.sin(beta - theta)

    def f(th, y):
        vr, vt = y
        a = (g - 1) / 2 * (1 - vr * vr - vt * vt)
        dvt = (vr * vt * vt - a * (2 * vr + vt / math.tan(th))) / (a - vt * vt)
        return (vt, dvt)

    th = beta
    h = -beta / steps
    y = (vr, vt)
    for _ in range(steps):
        if y[1] >= 0:
            break
        k1 = f(th, y)
        k2 = f(th + h / 2, (y[0] + h / 2 * k1[0], y[1] + h / 2 * k1[1]))
        k3 = f(th + h / 2, (y[0] + h / 2 * k2[0], y[1] + h / 2 * k2[1]))
        k4 = f(th + h, (y[0] + h * k3[0], y[1] + h * k3[1]))
        ynew = (y[0] + h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
                y[1] + h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]))
        if ynew[1] >= 0:
            # Linear in vt to vt = 0 within the step.
            frac = -y[1] / (ynew[1] - y[1])
            return th + frac * h, y[0] + frac * (ynew[0] - y[0]), (y, ynew, frac)
        y, th = ynew, th + h
    return th, y[0], None


def cone_cp(M, half_angle):
    """The exact surface pressure coefficient of a sharp cone (Taylor-Maccoll), by bisection on the shock angle."""
    g = GAMMA
    lo = math.asin(1 / M) + 1e-9
    hi = math.radians(89.0)
    for _ in range(100):
        mid = 0.5 * (lo + hi)
        th, _, _ = _tm_cone_angle(M, mid)
        if th < half_angle:
            lo = mid
        else:
            hi = mid
    beta = 0.5 * (lo + hi)
    th, vr, _ = _tm_cone_angle(M, beta)
    M2, theta, p2 = _oblique(M, beta)
    V2 = (2 / ((g - 1) * M2 * M2) + 1) ** -0.5
    # Isentropic from just behind the shock to the surface: p / p02 = (1 - V'^2)^(g/(g-1)).
    p_surface_over_p2 = ((1 - vr * vr) / (1 - V2 * V2)) ** (g / (g - 1))
    p = p2 * p_surface_over_p2
    return (p - 1) / (g / 2 * M * M), math.degrees(beta)


def pitot_cp(M):
    """The stagnation point's pressure coefficient behind a normal shock (Rayleigh)."""
    g = GAMMA
    p0 = ((g + 1) ** 2 * M * M / (4 * g * M * M - 2 * (g - 1))) ** (g / (g - 1)) * (1 - g + 2 * g * M * M) / (g + 1)
    return (p0 - 1) / (g / 2 * M * M)


# -------------------------------------------------------------- running


def region_start(spec):
    """The first region's end: the cap's tangent point on a capped nose, L / 128 on a sharp one."""
    if spec["rn"] > 0:
        return capped(spec["shape"], spec["L"], spec["rn"])["xt"]
    return spec["L"] / 128


# The longest a level may take, in seconds, for the session's two-hour
# background windows: a level is not started unless this much time is left
# before W6REF_DEADLINE (seconds since the epoch). Only a start condition,
# not a limit: level 3 at 8,000 iterations took about 6,000 s on 2 threads
# beside the fitted lanes; a level cut off has no record and runs again.
LEVEL_BUDGET = {0: 600, 1: 900, 2: 2400, 3: 7000, 4: 7000}
# What SU2 and the tool write in a level's folder; cleared before a level
# that was cut off runs again from its start.
LEVEL_OUTPUTS = ("history.csv", "surface_flow.csv", "restart_flow.csv", "restart_flow.dat", "wall.csv",
                 "seed.csv", "log0.txt", "log1.txt", "record.json")


class Deadline(Exception):
    pass


def spec_hash(spec):
    """The case's spec, less which levels a call runs (the level4 command's), as a SHA-256."""
    keep = {k: v for k, v in spec.items() if k not in ("first_level", "levels")}
    return hashlib.sha256(json.dumps(keep, sort_keys=True).encode()).hexdigest()


def file_hash(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def run_case(spec, run_dir, su2, threads=4, deadline=None):
    """
    Every level of a case, coarsest first, each to convergence, the drag and
    the record of each. A level that finished keeps its record in its folder
    (record.json, with the spec's hash and its solution file's) and is not
    run again: a case stopped between levels goes on from the first level
    without one, which starts from the level below as it would have, after
    checking that the level below was made with this spec and that its
    solution on disk is the one it finished with. One process at a time:
    the case's lock is held by the tool and by SU2 while it runs.
    """
    os.makedirs(run_dir, exist_ok=True)
    lock = os.open(os.path.join(run_dir, ".lock"), os.O_CREAT | os.O_RDWR)
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        raise SystemExit(f"{run_dir} is being run by another process")
    sh = spec_hash(spec)
    out = []
    for level in range(spec.get("first_level", 0), spec["levels"]):
        d = os.path.join(run_dir, f"L{level}")
        done = os.path.join(d, "record.json")
        if os.path.exists(done):
            rec = json.load(open(done))
            if rec.get("specHash") != sh:
                raise SystemExit(f"{done} was made with another spec")
            out.append(rec)
            print(json.dumps(rec), flush=True)
            continue
        if deadline is not None and time.time() + LEVEL_BUDGET[level] > deadline:
            raise Deadline(f"level {level} of {run_dir} needs up to {LEVEL_BUDGET[level]} s; not started")
        os.makedirs(d, exist_ok=True)
        for name in LEVEL_OUTPUTS:
            if os.path.exists(os.path.join(d, name)):
                os.remove(os.path.join(d, name))
        nose, x, r, marks = grid(spec, level)
        amin, skew = quality(x, r)
        write_su2(os.path.join(d, "mesh.su2"), x, r, marks)
        t0 = time.time()
        code = 0
        prev = os.path.join(run_dir, f"L{level - 1}", "restart_flow.csv")
        seeded = bool(spec["seed"]) and level > 0
        if seeded and not os.path.exists(prev):
            raise FileNotFoundError(f"level {level} is to start from level {level - 1}, whose solution is missing")
        below = os.path.join(run_dir, f"L{level - 1}", "record.json")
        if seeded and os.path.exists(below) and json.load(open(below)).get("restartSha256") != file_hash(prev):
            raise SystemExit(f"level {level - 1}'s solution on disk is not the one its record finished with")
        if seeded:
            # The finer grid started from the converged coarser one; the converged
            # solution does not depend on its start, only the iterations do.
            seed_restart(prev, x, r, os.path.join(d, "seed.csv"))
            stages = [dict(spec)]
        else:
            stages = [dict(spec, muscl="NO", cfladapt="NO", cflmax=spec["cfl"], iters=spec["iters1"])]
            if spec["muscl"] == "YES":
                stages.append(dict(spec))
        for k, st in enumerate(stages):
            write_cfg(os.path.join(d, "case.cfg"), st, restart=k > 0, seed=seeded and k == 0)
            with open(os.path.join(d, f"log{k}.txt"), "w") as log:
                code = subprocess.call([su2, "-t", str(threads), "case.cfg"], cwd=d, stdout=log, stderr=subprocess.STDOUT,
                                       pass_fds=(lock,))
            if code != 0:
                break
        if code < 0:
            # Killed (out of memory, or the window closing): no record, so the
            # level runs again from its start next time.
            raise SystemExit(f"SU2 on level {level} was killed by signal {-code}")
        seconds = time.time() - t0
        rec = {"level": level, "ni": x.shape[0] - 1, "nj": x.shape[1] - 1, "minArea": amin, "maxSkewCos": skew,
               "exit": code, "seconds": seconds, "seeded": seeded}
        surf = os.path.join(d, "surface_flow.csv")
        if code == 0 and os.path.exists(surf):
            xs, rs, cps = read_surface(surf)
            write_wall(os.path.join(d, "wall.csv"), xs, rs, cps)
            rec["drag"] = nose_drag(xs, rs, cps, spec["L"], R)
            rec["cpTip"] = float(cps[np.argmin(xs)])
            coarser = os.path.join(run_dir, f"L{level - 1}", "wall.csv")
            if level > 0 and os.path.exists(coarser):
                rec["change"] = changes(coarser, os.path.join(d, "wall.csv"), spec["L"], region_start(spec), R)
        if code == 0:
            rec.update(history_summary(os.path.join(d, "history.csv")))
            rec.update(boundary_check(d, rec["ni"], rec["nj"], spec["mach"]))
            if "CD" in rec and "drag" in rec:
                # SU2's own axisymmetric force on REF_AREA = 1, as a drag on the
                # base area: a check of the tool's integral (quadratures differ).
                rec["su2Drag"] = rec["CD"] / (math.pi * R * R)
        rec["specHash"] = sh
        if os.path.exists(os.path.join(d, "restart_flow.csv")):
            rec["restartSha256"] = file_hash(os.path.join(d, "restart_flow.csv"))
        with open(done + ".tmp", "w") as f:
            json.dump(rec, f)
        os.replace(done + ".tmp", done)
        out.append(rec)
        print(json.dumps(rec), flush=True)
    return out


def seed_restart(coarse_csv, x, r, out_path):
    """
    A starting solution for the grid (x, r) from the converged solution on the
    grid of half its cells (SU2's ASCII restart, vertices numbered i (nj + 1) +
    j). The grids nest: fine vertex (2i, 2j) is coarse vertex (i, j); a fine
    vertex between two coarse ones takes their mean, one amid four their mean.
    """
    ni, nj = x.shape[0] - 1, x.shape[1] - 1
    nic, njc = ni // 2, nj // 2
    with open(coarse_csv) as f:
        head = [h.strip().strip('"') for h in f.readline().split(",")]
        col = {h: k for k, h in enumerate(head)}
        rows = [line.split(",") for line in f if line.strip()]
    names = ["Density", "Momentum_x", "Momentum_y", "Energy"]
    pid = np.array([int(float(rw[col["PointID"]])) for rw in rows])
    if len(pid) != (nic + 1) * (njc + 1):
        raise ValueError("the coarse solution is not of the grid of half the cells")
    cx = np.array([float(rw[col["x"]]) for rw in rows])
    cr = np.array([float(rw[col["y"]]) for rw in rows])
    cu = np.array([[float(rw[col[n]]) for n in names] for rw in rows])
    order = np.argsort(pid)
    cx, cr, cu = cx[order].reshape(nic + 1, njc + 1), cr[order].reshape(nic + 1, njc + 1), cu[order].reshape(nic + 1, njc + 1, 4)
    gap = max(np.max(np.abs(cx - x[::2, ::2])), np.max(np.abs(cr - r[::2, ::2])))
    if gap > 1e-9:
        raise ValueError(f"the grids do not nest (vertices {gap:.1e} apart)")
    u = np.empty((ni + 1, nj + 1, 4))
    u[::2, ::2] = cu
    u[1::2, ::2] = 0.5 * (cu[:-1] + cu[1:])
    u[::2, 1::2] = 0.5 * (cu[:, :-1] + cu[:, 1:])
    u[1::2, 1::2] = 0.25 * (cu[:-1, :-1] + cu[1:, :-1] + cu[:-1, 1:] + cu[1:, 1:])
    with open(out_path, "w") as f:
        f.write('"PointID","x","y","Density","Momentum_x","Momentum_y","Energy"\n')
        k = 0
        for i in range(ni + 1):
            for j in range(nj + 1):
                q = u[i, j]
                f.write(f"{k}, {x[i, j]:.17e}, {r[i, j]:.17e}, {q[0]:.17e}, {q[1]:.17e}, {q[2]:.17e}, {q[3]:.17e}\n")
                k += 1


def boundary_check(level_dir, ni, nj, mach):
    """
    From SU2's whole-field output: the largest |Cp| on the outer boundary
    (zero if the bow shock lies inside the domain), the least Mach number on
    the outlet (above 1 for the supersonic outlet to be right), and the
    stagnation point's Cp (the vertex at i = 0, j = 0).
    """
    path = os.path.join(level_dir, "restart_flow.csv")
    if not os.path.exists(path):
        return {}
    with open(path) as f:
        head = [h.strip().strip('"') for h in f.readline().split(",")]
        col = {h: k for k, h in enumerate(head)}
        rows = [line.split(",") for line in f if line.strip()]
    cp = np.array([float(rw[col["Pressure_Coefficient"]]) for rw in rows])
    ma = np.array([float(rw[col["Mach"]]) for rw in rows])
    pid = np.array([int(float(rw[col["PointID"]])) for rw in rows])
    xs = np.array([float(rw[col["x"]]) for rw in rows])
    ys = np.array([float(rw[col["y"]]) for rw in rows])
    order = np.argsort(pid)
    cp, ma, xs, ys = cp[order], ma[order], xs[order], ys[order]
    idx = lambda i, j: i * (nj + 1) + j
    outer = [idx(i, nj) for i in range(ni + 1)]
    outlet = [idx(ni, j) for j in range(nj + 1)]
    # The bow shock's reach: on each line from the wall, the distance to the
    # outermost vertex whose |Cp| exceeds 1e-3, over the line's length; the
    # largest over the lines (1 would put the shock on the outer boundary).
    reach = 0.0
    for i in range(ni + 1):
        line = [idx(i, j) for j in range(nj + 1)]
        hit = [j for j in range(nj + 1) if abs(cp[line[j]]) > 1e-3]
        if hit:
            k = max(hit)
            length = math.hypot(xs[line[-1]] - xs[line[0]], ys[line[-1]] - ys[line[0]])
            reach = max(reach, math.hypot(xs[line[k]] - xs[line[0]], ys[line[k]] - ys[line[0]]) / length)
    return {"outerMaxAbsCp": float(np.max(np.abs(cp[outer]))), "outletMinMach": float(np.min(ma[outlet])),
            "cpStagnation": float(cp[idx(0, 0)]), "shockReach": reach}


def history_summary(path):
    if not os.path.exists(path):
        return {}
    with open(path) as f:
        head = [h.strip().strip('"') for h in f.readline().split(",")]
        rows = [line.split(",") for line in f if line.strip()]
    if not rows:
        return {}
    last = rows[-1]
    col = {h: k for k, h in enumerate(head)}
    res = {}
    for name in ("Inner_Iter", "rms[Rho]", "rms[RhoE]", "CD"):
        if name in col:
            res[name] = float(last[col[name]])
    # The drag over the last quarter of the iterations (SU2's force on the
    # base area): its range, the level's iterative error where it did not
    # reach the residual asked (registration R3).
    if "CD" in col:
        n = max(2, len(rows) // 4)
        cds = [float(rw[col["CD"]]) / (math.pi * R * R) for rw in rows[-n:]]
        res["dragRangeLastQuarter"] = max(cds) - min(cds)
        # The means of the last eighth and of the eighth before it: a drift
        # (still converging) rather than a cycle shows as their difference.
        h = max(1, n // 2)
        res["dragMeanLastEighth"] = sum(cds[-h:]) / h
        res["dragMeanEighthBefore"] = sum(cds[-2 * h:-h]) / h
    return res


# ------------------------------------------------------------ the registered specs
#
# Every run of the registration (README, "Registration") takes its settings
# from these two functions; nothing is tuned per case.

SETTINGS = {"scheme": "HLLC", "limiter": "VENKATAKRISHNAN", "venkat": 0.05, "cfl": 1.0, "cflmax": 10.0,
            "cfladapt": "YES", "muscl": "YES", "minres": -11, "iters1": 4000, "iters": 8000, "levels": 4,
            "seed": True, "Lcyl": 2.0}


def billig_standoff(M, rn):
    """F. S. Billig's correlation for a sphere's shock standoff (J. Spacecraft Rockets 4, 1967): 0.143 rn exp(3.24 / M^2)."""
    return 0.143 * rn * math.exp(3.24 / M**2)


def capped_spec(shape, calibers, ratio, M, widen=0):
    """
    A capped nose's run (the C grid): 64 x 32 cells on level 0 (512 x 256 on
    level 3); along the wall the first cell a quarter of the tip radius on
    level 0 (b solved for it), so the cap has about five cells there and forty
    on level 3; the outer boundary at a + k s from the wall, a four times
    Billig's standoff and k = 1.5 / sqrt(M^2 - 1) (one and a half times the
    slope of the Mach lines), each times 1.25^widen (the registered widening
    after a failed boundary check).
    """
    rn = R * ratio
    nose = capped(shape, calibers, rn)
    _, _, ss = wall_table(nose, SETTINGS["Lcyl"])
    S, ni0, target = ss[-1], 64, rn / 4
    lo, hi = 1e-3, 30.0
    for _ in range(200):
        mid = 0.5 * (lo + hi)
        if S * mid / math.expm1(mid) / ni0 > target:
            lo = mid
        else:
            hi = mid
    grow = 1.25**widen
    return dict(SETTINGS, shape=shape, L=float(calibers), rn=rn, mach=M, ni0=ni0, nj0=32, bi=lo, bj=2.5,
                a=4 * billig_standoff(M, rn) * grow, k=1.5 / math.sqrt(M * M - 1) * grow, widen=widen)


def sharp_spec(shape, calibers, M, widen=0):
    """
    A sharp nose's run (the H grid, for the checks with exact answers): 8 + 48
    cells along x and 32 across on level 0, clustered to the tip; the outer
    line from (-0.5, 0.6) to the end of the cylinder at 1.5 times the reach
    of the tip's attached conical shock there (times 1.25^widen).
    """
    L = float(calibers)
    tip = math.atan(R / L) if shape == "cone" else 2 * math.atan(R / L)
    _, beta = cone_cp(M, tip)
    a, X, rin = 0.5, L + SETTINGS["Lcyl"], 0.6
    rout = rin + 1.5 * (X + a) * math.tan(math.radians(beta)) * 1.25**widen
    return dict(SETTINGS, shape=shape, L=L, rn=0.0, mach=M, ni0_up=8, ni0=48, nj0=32, bi_up=4.0, bi=4.0, bj=2.5,
                a=a, Rin=rin, Rout=rout, widen=widen)


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "case":
        # case <spec.json> <run dir> <path to SU2_CFD> [threads]: levels 0 to 3 (a widened or
        # rerun case goes to a fresh folder; the earlier one is kept, renamed)
        spec = json.load(open(sys.argv[2]))
        su2 = sys.argv[4]
        threads = int(sys.argv[5]) if len(sys.argv) > 5 else 4
        out = os.path.join(sys.argv[3], "result.json")
        if os.path.exists(out):
            raise SystemExit(f"{out} exists: a run is never overwritten")
        deadline = float(os.environ["W6REF_DEADLINE"]) if "W6REF_DEADLINE" in os.environ else None
        try:
            res = run_case(spec, sys.argv[3], su2, threads, deadline)
        except Deadline as e:
            print(f"deadline: {e}", flush=True)
            sys.exit(3)
        json.dump({"spec": spec, "levels": res}, open(out, "w"), indent=1)
    elif cmd == "level4":
        # level4 <run dir> <path to SU2_CFD> [threads]: level 4 started from level 3 (R4's
        # fallback, and check V4), its record added to the run's; the spec is unchanged.
        out = os.path.join(sys.argv[2], "result.json")
        res = json.load(open(out))
        if any(r["level"] == 4 for r in res["levels"]):
            raise SystemExit("level 4 has run already")
        deadline = float(os.environ["W6REF_DEADLINE"]) if "W6REF_DEADLINE" in os.environ else None
        try:
            recs = run_case(dict(res["spec"], first_level=4, levels=5), sys.argv[2], sys.argv[3],
                            int(sys.argv[4]) if len(sys.argv) > 4 else 4, deadline)
        except Deadline as e:
            print(f"deadline: {e}", flush=True)
            sys.exit(3)
        res["levels"] = res["levels"] + recs
        json.dump(res, open(out, "w"), indent=1)
    elif cmd == "exact":
        M, half = float(sys.argv[2]), math.radians(float(sys.argv[3]))
        cp, beta = cone_cp(M, half)
        print(json.dumps({"mach": M, "halfAngleDeg": float(sys.argv[3]), "coneCp": cp, "shockAngleDeg": beta,
                          "pitotCp": pitot_cp(M)}))
    elif cmd == "spec":
        # spec capped <shape> <calibers> <tip ratio> <M> <out.json> [widen]
        # spec sharp <shape> <calibers> <M> <out.json> [widen]
        if sys.argv[2] == "capped":
            sp = capped_spec(sys.argv[3], float(sys.argv[4]), float(sys.argv[5]), float(sys.argv[6]),
                             int(sys.argv[8]) if len(sys.argv) > 8 else 0)
            out = sys.argv[7]
        else:
            sp = sharp_spec(sys.argv[3], float(sys.argv[4]), float(sys.argv[5]), int(sys.argv[7]) if len(sys.argv) > 7 else 0)
            out = sys.argv[6]
        os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
        json.dump(sp, open(out, "w"), indent=1)
        print(json.dumps(sp))
    elif cmd == "drag":
        d = sys.argv[2]
        spec = json.load(open(os.path.join(d, "..", "spec.json")))
        xs, rs, cps = read_surface(os.path.join(d, "surface_flow.csv"))
        print(nose_drag(xs, rs, cps, spec["L"]))
    else:
        raise SystemExit(f"unknown command {cmd}")
