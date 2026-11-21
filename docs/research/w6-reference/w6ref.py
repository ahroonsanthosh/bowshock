"""
W6's independent reference: SU2 (an external code, v8.1.0) solving the
axisymmetric Euler equations around capped (and sharp) noses on grids made
here, with its own shock capturing through the bow shock and any embedded
shock, and the forebody pressure drag integrated here from SU2's surface
pressures. Nothing in this file uses bowshock's solver, grids or geometry.

  python3 -I docs/research/w6-reference/w6ref.py geometry-check <out.json>
  python3 -I docs/research/w6-reference/w6ref.py case <spec.json> <run dir>
  python3 -I docs/research/w6-reference/w6ref.py drag <run dir>

Lengths are in body diameters (calibers): base radius R = 0.5, the nose's
tip at x = 0, the axis along x. The drag coefficient is the pressure drag
of the nose on the base area pi R^2 (the cylinder behind carries none).
"""

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
    # The parent, densest at its start (x - x0 = (L - x0) u^3).
    m = n
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
    The structured C grid of `spec` at `level` (0 the coarsest; each level
    halves every spacing of the one before, by sampling the same mappings):
    i along the wall from the tip (i = 0 on the axis ahead of the tip), j
    from the wall to the outer boundary, a parabola x = -a + (X - (-a))
    (r / Rout)^2 meeting the axis at x = -a at right angles. Each grid line
    i is straight from its wall point to its outer point.
    """
    nose = capped(spec["shape"], spec["L"], spec["rn"])
    xs, rs, ss = wall_table(nose, spec["Lcyl"])
    S = ss[-1]
    ni = spec["ni0"] * 2**level
    nj = spec["nj0"] * 2**level
    ui = mapping(spec["bi"])(np.linspace(0, 1, ni + 1))
    uj = mapping(spec["bj"])(np.linspace(0, 1, nj + 1))
    sw = ui * S
    xw = np.interp(sw, ss, xs)
    rw = np.interp(sw, ss, rs)
    # The outer boundary, parametrised by r from 0 to Rout with the same fractions as the wall's s.
    a, X, Rout = spec["a"], spec["L"] + spec["Lcyl"], spec["Rout"]
    ro = ui * Rout
    xo = -a + (X + a) * (ro / Rout) ** 2
    x = xw[:, None] + (xo - xw)[:, None] * uj[None, :]
    r = rw[:, None] + (ro - rw)[:, None] * uj[None, :]
    return nose, x, r


def write_su2(path, x, r):
    """The grid in SU2's native format: quads, and markers wall, axis, farfield, outlet."""
    ni, nj = x.shape[0] - 1, x.shape[1] - 1
    idx = lambda i, j: i * (nj + 1) + j
    with open(path, "w") as f:
        f.write("NDIME= 2\n")
        f.write(f"NELEM= {ni * nj}\n")
        e = 0
        for i in range(ni):
            for j in range(nj):
                # Counter-clockwise in (x, r): wall-side edge first along increasing i.
                f.write(f"9 {idx(i, j)} {idx(i + 1, j)} {idx(i + 1, j + 1)} {idx(i, j + 1)} {e}\n")
                e += 1
        f.write(f"NPOIN= {(ni + 1) * (nj + 1)}\n")
        k = 0
        for i in range(ni + 1):
            for j in range(nj + 1):
                f.write(f"{x[i, j]:.17e} {r[i, j]:.17e} {k}\n")
                k += 1
        f.write("NMARK= 4\n")
        f.write("MARKER_TAG= wall\n")
        f.write(f"MARKER_ELEMS= {ni}\n")
        for i in range(ni):
            f.write(f"3 {idx(i, 0)} {idx(i + 1, 0)}\n")
        f.write("MARKER_TAG= axis\n")
        f.write(f"MARKER_ELEMS= {nj}\n")
        for j in range(nj):
            f.write(f"3 {idx(0, j)} {idx(0, j + 1)}\n")
        f.write("MARKER_TAG= farfield\n")
        f.write(f"MARKER_ELEMS= {ni}\n")
        for i in range(ni):
            f.write(f"3 {idx(i, nj)} {idx(i + 1, nj)}\n")
        f.write("MARKER_TAG= outlet\n")
        f.write(f"MARKER_ELEMS= {nj}\n")
        for j in range(nj):
            f.write(f"3 {idx(ni, j)} {idx(ni, j + 1)}\n")


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
CFL_ADAPT= YES
CFL_ADAPT_PARAM= ( 0.5, 1.2, {cfl}, {cflmax} )
ITER= {iters}
LINEAR_SOLVER= FGMRES
LINEAR_SOLVER_PREC= ILU
LINEAR_SOLVER_ERROR= 1E-6
LINEAR_SOLVER_ITER= 10
CONV_NUM_METHOD_FLOW= {scheme}
MUSCL_FLOW= YES
SLOPE_LIMITER_FLOW= VENKATAKRISHNAN
VENKAT_LIMITER_COEFF= {venkat}
TIME_DISCRE_FLOW= EULER_IMPLICIT
CONV_FIELD= RMS_DENSITY
CONV_RESIDUAL_MINVAL= {minres}
CONV_STARTITER= 10
MESH_FILENAME= mesh.su2
MESH_FORMAT= SU2
SOLUTION_FILENAME= restart_flow.dat
RESTART_FILENAME= restart_flow.dat
OUTPUT_FILES= ( RESTART, SURFACE_CSV )
SURFACE_FILENAME= surface_flow
SCREEN_OUTPUT= ( INNER_ITER, RMS_DENSITY, RMS_ENERGY, DRAG )
HISTORY_OUTPUT= ( ITER, RMS_RES, AERO_COEFF )
CONV_FILENAME= history
OUTPUT_WRT_FREQ= 1000
SCREEN_WRT_FREQ_INNER= 100
"""


def write_cfg(path, spec, restart=False):
    with open(path, "w") as f:
        f.write(
            CFG.format(
                mach=spec["mach"],
                restart="YES" if restart else "NO",
                cfl=spec.get("cfl", 1.0),
                cflmax=spec.get("cflmax", 50.0),
                iters=spec.get("iters", 20000),
                scheme=spec.get("scheme", "ROE"),
                venkat=spec.get("venkat", 0.05),
                minres=spec.get("minres", -12),
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


def nose_drag(x, r, cp, L):
    order = np.argsort(x)
    x, r, cp = x[order], r[order], cp[order]
    keep = x <= L + 1e-12
    # Include the first cylinder vertex past L only through r = R exactly (it adds nothing).
    x, r, cp = x[keep], r[keep], cp[keep]
    r2 = r * r
    return float(np.sum(0.5 * (cp[1:] + cp[:-1]) * np.diff(r2)) / (R * R))


# -------------------------------------------------------------- running


def run_case(spec, run_dir, su2, threads=4):
    """Every level of a case, coarsest first, each to convergence, the drag and the record of each."""
    os.makedirs(run_dir, exist_ok=True)
    out = []
    for level in range(spec["levels"]):
        d = os.path.join(run_dir, f"L{level}")
        os.makedirs(d, exist_ok=True)
        nose, x, r = grid(spec, level)
        amin, skew = quality(x, r)
        write_su2(os.path.join(d, "mesh.su2"), x, r)
        write_cfg(os.path.join(d, "case.cfg"), spec)
        t0 = time.time()
        with open(os.path.join(d, "log.txt"), "w") as log:
            code = subprocess.call([su2, "-t", str(threads), "case.cfg"], cwd=d, stdout=log, stderr=subprocess.STDOUT)
        seconds = time.time() - t0
        rec = {"level": level, "ni": x.shape[0] - 1, "nj": x.shape[1] - 1, "minArea": amin, "maxSkewCos": skew,
               "exit": code, "seconds": seconds}
        surf = os.path.join(d, "surface_flow.csv")
        if code == 0 and os.path.exists(surf):
            xs, rs, cps = read_surface(surf)
            rec["drag"] = nose_drag(xs, rs, cps, spec["L"])
            rec["cpTip"] = float(cps[np.argmin(xs)])
        rec.update(history_summary(os.path.join(d, "history.csv")))
        out.append(rec)
        print(json.dumps(rec), flush=True)
    return out


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
    # The drag over the last 10% of the iterations: its spread, a measure of the iterative error.
    if "CD" in col:
        n = max(2, len(rows) // 10)
        cds = [float(rw[col["CD"]]) for rw in rows[-n:]]
        res["cdSpreadLast10pct"] = max(cds) - min(cds)
    return res


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "case":
        spec = json.load(open(sys.argv[2]))
        su2 = os.environ["SU2_CFD"]
        res = run_case(spec, sys.argv[3], su2, int(os.environ.get("THREADS", "4")))
        json.dump({"spec": spec, "levels": res}, open(os.path.join(sys.argv[3], "result.json"), "w"), indent=1)
    elif cmd == "drag":
        d = sys.argv[2]
        spec = json.load(open(os.path.join(d, "..", "spec.json")))
        xs, rs, cps = read_surface(os.path.join(d, "surface_flow.csv"))
        print(nose_drag(xs, rs, cps, spec["L"]))
    else:
        raise SystemExit(f"unknown command {cmd}")
