"""
The second independent solver's side (README, "The second solver"): the
same grids as `w6ref.py` builds for SU2, written as OpenFOAM wedge meshes,
and OpenFOAM 13's density-based solver (shockFluid) set up on them.

A wedge mesh is the 2D grid turned by +-HALF degrees about the x axis: each
quad becomes a hexahedron, and the cells against the axis become prisms
(their axis edge collapses to a line, so there is no face, and no source
term, on the axis: the axisymmetric equations come from the 3D finite
volumes themselves, where SU2 adds a source term in 1/r).
"""
import fcntl
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import time

import numpy as np

import w6ref

HALF = 2.5  # degrees each side of the x-y plane
WEDGE_TO_BODY = math.pi / math.tan(math.radians(HALF))  # a wall face's area along x is tan(a) (r2^2 - r1^2)

HEADER = """FoamFile
{{
    format      ascii;
    class       {cls};
    location    "{loc}";
    object      {obj};
}}
"""


def _points(x, r):
    """The wedge's points and, per 2D vertex, its front and back point numbers (one point on the axis)."""
    ni, nj = x.shape[0] - 1, x.shape[1] - 1
    if np.any(r < 0.0):
        raise ValueError("a vertex below the axis")
    a = math.radians(HALF)
    on = r == 0.0
    front = np.empty((ni + 1, nj + 1), dtype=np.int64)
    back = np.empty((ni + 1, nj + 1), dtype=np.int64)
    n_on = int(on.sum())
    n_off = int((~on).sum())
    front[on] = back[on] = np.arange(n_on)
    front[~on] = n_on + np.arange(n_off)
    back[~on] = n_on + n_off + np.arange(n_off)
    pts = np.zeros((n_on + 2 * n_off, 3))
    pts[:n_on, 0] = x[on]
    xo, ro = x[~on], r[~on]
    # On the planes z = +-y tan(a), at y = r: every face's width is then
    # 2 tan(a) times its distance from the axis, so every area, volume and
    # the sides' pressure force are the axisymmetric finite volume's for an
    # angle of 2 tan(a), exactly; points at (r cos a, +-r sin a) would move
    # each flat face inward by r (1 - cos a) and tilt it, an error of order a^2
    # (0.05% in the drag at a = 2.5 degrees, trial 9).
    pts[n_on : n_on + n_off] = np.stack([xo, ro, ro * math.tan(a)], 1)
    pts[n_on + n_off :] = np.stack([xo, ro, -ro * math.tan(a)], 1)
    return pts, front, back


def _dedup(face):
    out = []
    for p in face:
        if p not in out:
            out.append(p)
    return out


def _area_vector(pts, face):
    p = pts[face]
    c = p.mean(0)
    s = np.zeros(3)
    for k in range(len(face)):
        s += np.cross(p[k] - c, p[(k + 1) % len(face)] - c)
    return 0.5 * s, c


PATCH_TYPES = {"wall": "wall", "farfield": "patch", "outlet": "patch"}


def write_polymesh(case, x, r, marks):
    """
    constant/polyMesh of the wedge. The patches are the 2D grid's markers
    (`w6ref.grid`): wall, farfield and outlet as given, the axis dropped
    (its faces collapse to lines), and front and back (the wedge's sides).
    """
    ni, nj = x.shape[0] - 1, x.shape[1] - 1
    pts, F, B = _points(x, r)
    cell = lambda i, j: i * nj + j
    centre = np.zeros((ni * nj, 3))
    for i in range(ni):
        for j in range(nj):
            ids = _dedup([F[i, j], F[i + 1, j], F[i + 1, j + 1], F[i, j + 1], B[i, j], B[i + 1, j], B[i + 1, j + 1], B[i, j + 1]])
            centre[cell(i, j)] = pts[ids].mean(0)

    def oriented(face, own, towards):
        face = _dedup(face)
        s, c = _area_vector(pts, face)
        return face if np.dot(s, towards - centre[own]) > 0 else face[::-1]

    def side(f, b, i0, j0, i1, j1):
        """The face over the 2D edge (i0, j0)-(i1, j1); None if the edge lies on the axis."""
        face = _dedup([f[i0, j0], f[i1, j1], b[i1, j1], b[i0, j0]])
        return face if len(face) >= 3 else None

    faces, owner, neigh = [], [], []
    # Internal faces in upper-triangular order: per cell, its north then its east neighbour.
    for i in range(ni):
        for j in range(nj):
            c = cell(i, j)
            if j < nj - 1:
                f = side(F, B, i, j + 1, i + 1, j + 1)
                if f is None:
                    raise ValueError("an internal edge on the axis")
                faces.append(oriented(f, c, centre[cell(i, j + 1)]))
                owner.append(c)
                neigh.append(cell(i, j + 1))
            if i < ni - 1:
                f = side(F, B, i + 1, j, i + 1, j + 1)
                if f is None:
                    raise ValueError("an internal edge on the axis")
                faces.append(oriented(f, c, centre[cell(i + 1, j)]))
                owner.append(c)
                neigh.append(cell(i + 1, j))
    n_internal = len(faces)
    patches = []
    idx = lambda k: divmod(k, nj + 1)

    def edge_cell(p, q):
        (i0, j0), (i1, j1) = idx(p), idx(q)
        if j0 == j1:  # along i
            return cell(min(i0, i1), j0 if j0 < nj else nj - 1)
        return cell(i0 if i0 < ni else ni - 1, min(j0, j1))

    for name, edges in marks.items():
        if name == "axis":
            for p, q in edges:
                if side(F, B, *idx(p), *idx(q)) is not None:
                    raise ValueError("an axis edge off the axis")
            continue
        start = len(faces)
        for p, q in edges:
            f = side(F, B, *idx(p), *idx(q))
            if f is None:
                raise ValueError(f"a {name} edge on the axis")
            c = edge_cell(p, q)
            _, fc = _area_vector(pts, f)
            faces.append(oriented(f, c, fc + (fc - centre[c])))
            owner.append(c)
        patches.append((name, PATCH_TYPES[name], len(faces) - start, start))
    for name, lay in (("front", F), ("back", B)):
        start = len(faces)
        for i in range(ni):
            for j in range(nj):
                f = _dedup([lay[i, j], lay[i + 1, j], lay[i + 1, j + 1], lay[i, j + 1]])
                c = cell(i, j)
                _, fc = _area_vector(pts, f)
                faces.append(oriented(f, c, fc + (fc - centre[c])))
                owner.append(c)
        patches.append((name, "wedge", len(faces) - start, start))

    d = os.path.join(case, "constant", "polyMesh")
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "points"), "w") as f:
        f.write(HEADER.format(cls="vectorField", loc="constant/polyMesh", obj="points"))
        f.write(f"{len(pts)}\n(\n")
        f.writelines(f"({p[0]:.17g} {p[1]:.17g} {p[2]:.17g})\n" for p in pts)
        f.write(")\n")
    with open(os.path.join(d, "faces"), "w") as f:
        f.write(HEADER.format(cls="faceList", loc="constant/polyMesh", obj="faces"))
        f.write(f"{len(faces)}\n(\n")
        f.writelines(f"{len(fc)}({' '.join(map(str, fc))})\n" for fc in faces)
        f.write(")\n")
    note = f"nPoints: {len(pts)} nCells: {ni * nj} nFaces: {len(faces)} nInternalFaces: {n_internal}"
    for name, vals in (("owner", owner), ("neighbour", neigh)):
        with open(os.path.join(d, name), "w") as f:
            f.write(HEADER.format(cls="labelList", loc="constant/polyMesh", obj=name).replace("}\n", f"    note        \"{note}\";\n}}\n", 1))
            f.write(f"{len(vals)}\n(\n")
            f.writelines(f"{v}\n" for v in vals)
            f.write(")\n")
    with open(os.path.join(d, "boundary"), "w") as f:
        f.write(HEADER.format(cls="polyBoundaryMesh", loc="constant/polyMesh", obj="boundary"))
        f.write(f"{len(patches)}\n(\n")
        for name, kind, n, start in patches:
            f.write(f"    {name}\n    {{\n        type            {kind};\n        nFaces          {n};\n        startFace       {start};\n    }}\n")
        f.write(")\n")
    return {"cells": ni * nj, "faces": len(faces), "internalFaces": n_internal}


# ------------------------------------------------------------ the case
#
# Non-dimensional as OpenFOAM's shockFluid tutorials: p = 1, T = 1 and the
# free stream's speed of sound 1 (molar mass 11640.3 with the universal gas
# constant gives R = 1/1.4; Cp 2.5 gives gamma 1.4), so U = M and rho = 1.4.
# Viscosity 0 makes shockFluid inviscid (no momentum transport model).

SETTINGS = {"flux": "Kurganov", "recon": "vanLeer", "maxCo": 0.5, "smoothing": 0.02, "iters": 20000}

PHYSICAL = """thermoType
{
    type            hePsiThermo;
    mixture         pureMixture;
    transport       const;
    thermo          hConst;
    equationOfState perfectGas;
    specie          specie;
    energy          sensibleInternalEnergy;
}

mixture
{
    specie
    {
        molWeight       11640.3;
    }
    thermodynamics
    {
        Cp              2.5;
        hf              0;
    }
    transport
    {
        mu              0;
        Pr              1;
    }
}
"""

FIELD = """dimensions      {dims};

internalField   uniform {free};

boundaryField
{{
    farfield
    {{
        type            fixedValue;
        value           uniform {free};
    }}
    outlet
    {{
        type            zeroGradient;
    }}
    wall
    {{
        type            {wall};
    }}
    front
    {{
        type            wedge;
    }}
    back
    {{
        type            wedge;
    }}
}}
"""

# Every tenth iteration (each a single iteration's change; the monitors cost
# about a fifth of a step), from OpenFOAM's own function objects (no compiled code:
# OpenFOAM refuses that when run as root): the mean over cells of
# (d rho / dt)^2 under the local time step (`resid`, a residual like
# SU2's), and the wall's pressure force along x less the free stream's
# (`wallForce`: (p - 1) x-hat integrated against the wall's area vectors,
# which point out of the fluid, so into the body).
FUNCTIONS = """    ddtRho
    {
        type            ddt;
        libs            ("libfieldFunctionObjects.so");
        field           rho;
        executeControl  timeStep;
        executeInterval 10;
        writeControl    writeTime;
    }
    sqDdtRho
    {
        type            magSqr;
        libs            ("libfieldFunctionObjects.so");
        field           ddt(rho);
        executeControl  timeStep;
        executeInterval 10;
        writeControl    writeTime;
    }
    resid
    {
        type            volFieldValue;
        libs            ("libfieldFunctionObjects.so");
        fields          (magSqr(ddt(rho)));
        cellZone        all;
        operation       average;
        writeFields     false;
        executeControl  timeStep;
        executeInterval 10;
        writeControl    timeStep;
        writeInterval   10;
        log             false;
    }
    pFree
    {
        type            uniform;
        libs            ("libfieldFunctionObjects.so");
        fieldType       volScalarField;
        field           pFree;
        dimensions      [1 -1 -2 0 0 0 0];
        value           1;
        executeControl  timeStep;
        executeInterval 10;
        writeControl    writeTime;
    }
    pGauge
    {
        type            subtract;
        libs            ("libfieldFunctionObjects.so");
        fields          (p pFree);
        result          pGauge;
        executeControl  timeStep;
        executeInterval 10;
        writeControl    writeTime;
    }
    ex
    {
        type            uniform;
        libs            ("libfieldFunctionObjects.so");
        fieldType       volVectorField;
        field           ex;
        dimensions      [0 0 0 0 0 0 0];
        value           (1 0 0);
        executeControl  timeStep;
        executeInterval 10;
        writeControl    writeTime;
    }
    pX
    {
        type            multiply;
        libs            ("libfieldFunctionObjects.so");
        fields          (pGauge ex);
        result          pX;
        executeControl  timeStep;
        executeInterval 10;
        writeControl    writeTime;
    }
    wallForce
    {
        type            surfaceFieldValue;
        libs            ("libfieldFunctionObjects.so");
        patch           wall;
        fields          (pX);
        operation       areaNormalIntegrate;
        writeFields     false;
        executeControl  timeStep;
        executeInterval 10;
        writeControl    timeStep;
        writeInterval   10;
        log             false;
    }
"""


def write_case(case, spec, settings, iters, start_from_latest=False):
    """0/, constant/ and system/ of one level (the mesh written separately)."""
    M = spec["mach"]
    for sub in ("0", "constant", "system"):
        os.makedirs(os.path.join(case, sub), exist_ok=True)
    fields = {
        "p": ("[1 -1 -2 0 0 0 0]", "1", "zeroGradient", "volScalarField"),
        "T": ("[0 0 0 1 0 0 0]", "1", "zeroGradient", "volScalarField"),
        "U": ("[0 1 -1 0 0 0 0]", f"({M!r} 0 0)", "slip", "volVectorField"),
    }
    for name, (dims, free, wall, cls) in fields.items():
        with open(os.path.join(case, "0", name), "w") as f:
            f.write(HEADER.format(cls=cls, loc="0", obj=name))
            f.write(FIELD.format(dims=dims, free=free, wall=wall))
    with open(os.path.join(case, "constant", "physicalProperties"), "w") as f:
        f.write(HEADER.format(cls="dictionary", loc="constant", obj="physicalProperties") + PHYSICAL)
    with open(os.path.join(case, "constant", "momentumTransport"), "w") as f:
        f.write(HEADER.format(cls="dictionary", loc="constant", obj="momentumTransport") + "simulationType  laminar;\n")
    libs = "".join(f'libs            ("{lib}");\n' for lib in settings.get("libs", ()))
    with open(os.path.join(case, "system", "controlDict"), "w") as f:
        f.write(HEADER.format(cls="dictionary", loc="system", obj="controlDict"))
        f.write(f"""{libs}solver          {settings.get("solver", "shockFluid")};
startFrom       {"latestTime" if start_from_latest else "startTime"};
startTime       0;
stopAt          endTime;
endTime         {iters};
deltaT          1;
writeControl    timeStep;
writeInterval   {iters};
writeFormat     ascii;
writePrecision  17;
timeFormat      general;
timePrecision   10;
runTimeModifiable false;

functions
{{
{FUNCTIONS}}}
""")
    with open(os.path.join(case, "system", "fvSchemes"), "w") as f:
        f.write(HEADER.format(cls="dictionary", loc="system", obj="fvSchemes"))
        rc = settings["recon"]
        rec = settings.get("reconstruct", {"rho": rc, "U": f"{rc}V", "T": rc})
        f.write(f"""fluxScheme      {settings["flux"]};

ddtSchemes
{{
    default         localEuler;
}}

gradSchemes
{{
    default         {settings.get("grad", "Gauss linear")};
}}

divSchemes
{{
    default         none;
}}

laplacianSchemes
{{
    default         Gauss linear corrected;
}}

interpolationSchemes
{{
    default         linear;
    reconstruct(rho) {rec["rho"]};
    reconstruct(U)  {rec["U"]};
    reconstruct(T)  {rec["T"]};
}}

snGradSchemes
{{
    default         corrected;
}}
""")
    outer = f"    nOuterCorrectors {settings['outer']};\n" if settings.get("outer", 1) != 1 else ""
    with open(os.path.join(case, "system", "fvSolution"), "w") as f:
        f.write(HEADER.format(cls="dictionary", loc="system", obj="fvSolution"))
        f.write(f"""solvers
{{
    "(rho|rhoU|rhoE).*"
    {{
        solver          diagonal;
    }}
    // Read but not solved when inviscid (as in OpenFOAM's tutorials)
    "U.*"
    {{
        solver          smoothSolver;
        smoother        GaussSeidel;
        nSweeps         2;
        tolerance       1e-09;
        relTol          0.01;
    }}
    "e.*"
    {{
        $U;
        relTol          0.1;
    }}
}}

PIMPLE
{{
{outer}    maxCo           {settings["maxCo"]};
    rDeltaTSmoothingCoeff {settings["smoothing"]};
}}
""")


def _table(path):
    rows = []
    with open(path) as f:
        for line in f:
            if line.strip() and not line.startswith("#"):
                rows.append([float(v) for v in line.replace("(", " ").replace(")", " ").split()])
    return np.array(rows)


def _joined(case, fo, name):
    """A function object's per-iteration table over every start (a resumed run writes a new folder)."""
    d = os.path.join(case, "postProcessing", fo)
    parts = sorted(os.listdir(d), key=float)
    rows = {}
    for t in parts:
        for row in _table(os.path.join(d, t, name)):
            rows[row[0]] = row  # a later start's row for the same iteration replaces the earlier
    return np.array([rows[k] for k in sorted(rows)])


def read_monitor(case, mach):
    """Per iteration: the iteration, log10 of the RMS of d rho / dt (on rho_inf), and the drag on pi R^2."""
    res = _joined(case, "resid", "volFieldValue.dat")
    frc = _joined(case, "wallForce", "surfaceFieldValue.dat")
    n = min(len(res), len(frc))
    it = res[:n, 0]
    rms = 0.5 * np.log10(np.maximum(res[:n, 1], 1e-300)) - math.log10(1.4)
    # surfaceFieldValue.dat: time, the force along x on the wedge. A wall face's
    # area along x is tan(a) (r2^2 - r1^2) where the body's ring is
    # pi (r2^2 - r1^2), so the body's force is the wedge's times pi / tan(a).
    cd = frc[:n, 1] * WEDGE_TO_BODY / (0.7 * mach * mach * math.pi * w6ref.R**2)
    return np.stack([it, rms, cd], 1)


def read_internal(path):
    """A volScalarField's or volVectorField's internal values from an ASCII field file."""
    import re

    txt = open(path).read()
    m = re.search(r"internalField\s+nonuniform\s+List<(scalar|vector)>\s*\n?(\d+)\s*\(", txt)
    if m is None:
        raise ValueError(f"{path}: no nonuniform internal field")
    n = int(m.group(2))
    body = txt[m.end():]
    if m.group(1) == "scalar":
        vals = np.array(body.split(")", 1)[0].split(), dtype=float)
    else:
        body = body.split("\n)\n", 1)[0]
        vals = np.array([[float(v) for v in ln.strip("() ").split()] for ln in body.split("\n") if ln.strip()])
    if len(vals) != n:
        raise ValueError(f"{path}: {len(vals)} values for {n}")
    return vals


def stagnation(time_dir, ni, nj, mach):
    """
    The stagnation region from the cells: the wall's first cell (against the
    axis and the wall), and the total pressure along the axis's cells
    behind the bow shock, both against Rayleigh's pitot value.
    """
    p = read_internal(os.path.join(time_dir, "p")).reshape(ni, nj)
    T = read_internal(os.path.join(time_dir, "T")).reshape(ni, nj)
    U = read_internal(os.path.join(time_dir, "U")).reshape(ni, nj, 3)
    M2 = (U**2).sum(-1) / T  # speed of sound sqrt(T) in these units
    p0 = p * (1 + 0.2 * M2) ** 3.5
    pitot = 1 + 0.7 * mach**2 * w6ref.pitot_cp(mach)
    sub = M2[0] < 1
    return {
        "cpWallFirstCell": (p[0, 0] - 1) / (0.7 * mach**2),
        "pitotCp": w6ref.pitot_cp(mach),
        "axisTotalPressure": (p0[0][sub] / pitot).tolist(),
    }


# ------------------------------------------------------------ the wall
#
# OpenFOAM's values are the cells'. On a slip wall the pressure on a face is
# its cell's (zeroGradient), so the wall's pressure is a value per face, from
# vertex (x0, r0) to (x1, r1) of the 2D grid. The drag is then the sum of
# Cp (r1^2 - r0^2) / R^2 over the faces: exactly OpenFOAM's own force on the
# wall (a cylinder face adds nothing), with no quadrature of the tool's.


def _cell_of_edge(p, q, ni, nj):
    (i0, j0), (i1, j1) = divmod(p, nj + 1), divmod(q, nj + 1)
    if j0 == j1:
        return min(i0, i1), (j0 if j0 < nj else nj - 1)
    return (i0 if i0 < ni else ni - 1), min(j0, j1)


def wall_faces(time_dir, x, r, marks, mach):
    """The wall's faces in order from the tip: x0, r0, x1, r1 and Cp."""
    ni, nj = x.shape[0] - 1, x.shape[1] - 1
    p = read_internal(os.path.join(time_dir, "p")).reshape(ni, nj)
    xv, rv = x.ravel(), r.ravel()
    rows = []
    for a, b in marks["wall"]:
        i, j = _cell_of_edge(a, b, ni, nj)
        p0, p1 = (a, b) if xv[a] <= xv[b] else (b, a)
        rows.append((xv[p0], rv[p0], xv[p1], rv[p1], (p[i, j] - 1) / (0.7 * mach * mach)))
    rows.sort(key=lambda t: (t[0], t[2]))
    return np.array(rows)


def write_wall(path, faces):
    with open(path, "w") as f:
        f.write('"x0","r0","x1","r1","Pressure_Coefficient"\n')
        for row in faces:
            f.write(",".join(f"{v:.17e}" for v in row) + "\n")


def read_wall(path):
    return np.loadtxt(path, delimiter=",", skiprows=1, ndmin=2)


def faces_drag(faces, x_end=None):
    """The sum of Cp (r1^2 - r0^2) / R^2 over the wall's faces (to x_end, a vertex, if given)."""
    keep = np.ones(len(faces), bool) if x_end is None else faces[:, 2] <= x_end + 1e-12
    f = faces[keep]
    return float(np.sum(f[:, 4] * (f[:, 3] ** 2 - f[:, 1] ** 2)) / w6ref.R**2)


def faces_changes(coarse, fine, L, x0, x_end=None):
    """
    The change of the drag's distribution between two levels, as
    `w6ref.changes` takes it, on faces: the coarser level's Cp, at its faces'
    centres, taken linearly in r^2 at the finer faces' centres; per finer
    face its change times its d(r^2) / R^2. "vertex": the sum of |those|;
    "regions": the sum over `w6ref.regions` (a face in the region holding its
    centre in x) of |the region's sum|; "signed": the plain sum.
    """
    end = L if x_end is None else x_end
    cut = lambda f: f[f[:, 2] <= end + 1e-12]
    c, f = cut(coarse), cut(fine)
    qc = 0.5 * (c[:, 1] ** 2 + c[:, 3] ** 2)
    qf = 0.5 * (f[:, 1] ** 2 + f[:, 3] ** 2)
    d = f[:, 4] - np.interp(qf, qc, c[:, 4])
    dq = (f[:, 3] ** 2 - f[:, 1] ** 2) / w6ref.R**2
    seg = d * dq
    mid = 0.5 * (f[:, 0] + f[:, 2])
    edges = w6ref.regions(end, x0)
    idx = np.clip(np.searchsorted(edges, mid, side="right") - 1, 0, len(edges) - 2)
    by = np.zeros(len(edges) - 1)
    np.add.at(by, idx, seg)
    return {"vertex": float(np.sum(np.abs(seg))), "regions": float(np.sum(np.abs(by))), "signed": float(np.sum(seg)),
            "count": len(edges) - 1}


def boundary_check(time_dir, x, r, marks, mach):
    """
    As `w6ref.boundary_check`, from the cells: the largest |Cp| in the
    cells against the outer boundary, the least Mach number in those
    against the outlet, the bow shock's reach (on each grid line from the
    wall, the outermost cell with |Cp| above 1e-3, its centre's distance
    from the wall over the line's length; the largest over the lines), and
    the stagnation point's Cp (the wall's first cell, against the axis).
    """
    ni, nj = x.shape[0] - 1, x.shape[1] - 1
    p = read_internal(os.path.join(time_dir, "p")).reshape(ni, nj)
    T = read_internal(os.path.join(time_dir, "T")).reshape(ni, nj)
    U = read_internal(os.path.join(time_dir, "U")).reshape(ni, nj, 3)
    cp = (p - 1) / (0.7 * mach * mach)
    ma = np.sqrt((U**2).sum(-1) / T)
    cells = lambda name: [_cell_of_edge(a, b, ni, nj) for a, b in marks[name]]
    outer = cells("farfield")
    outlet = cells("outlet")
    xc = 0.25 * (x[:-1, :-1] + x[1:, :-1] + x[1:, 1:] + x[:-1, 1:])
    rc = 0.25 * (r[:-1, :-1] + r[1:, :-1] + r[1:, 1:] + r[:-1, 1:])
    reach = 0.0
    for i in range(ni):
        hit = np.nonzero(np.abs(cp[i]) > 1e-3)[0]
        if len(hit):
            k = hit.max()
            xw, rw = 0.5 * (x[i, 0] + x[i + 1, 0]), 0.5 * (r[i, 0] + r[i + 1, 0])
            xo, ro = 0.5 * (x[i, nj] + x[i + 1, nj]), 0.5 * (r[i, nj] + r[i + 1, nj])
            reach = max(reach, math.hypot(xc[i, k] - xw, rc[i, k] - rw) / math.hypot(xo - xw, ro - rw))
    return {"outerMaxAbsCp": float(max(abs(cp[i, j]) for i, j in outer)),
            "outletMinMach": float(min(ma[i, j] for i, j in outlet)),
            "cpStagnation": float(cp[0, 0]), "shockReach": reach}


def wall_total_pressure(time_dir, x, r, marks, mach):
    """
    Per wall face, in wall_faces' order: the total pressure of the face's
    cell over Rayleigh's pitot value. In the exact flow the wall's
    streamline crosses the bow shock where it is normal, so this is 1 all
    along the wall; the excess is the entropy the scheme failed to make.
    """
    ni, nj = x.shape[0] - 1, x.shape[1] - 1
    p = read_internal(os.path.join(time_dir, "p")).reshape(ni, nj)
    T = read_internal(os.path.join(time_dir, "T")).reshape(ni, nj)
    U = read_internal(os.path.join(time_dir, "U")).reshape(ni, nj, 3)
    p0 = p * (1 + 0.2 * (U**2).sum(-1) / T) ** 3.5
    pitot = 1 + 0.7 * mach**2 * w6ref.pitot_cp(mach)
    xv = x.ravel()
    rows = []
    for a, b in marks["wall"]:
        i, j = _cell_of_edge(a, b, ni, nj)
        p0_, p1_ = (a, b) if xv[a] <= xv[b] else (b, a)
        rows.append((xv[p0_], xv[p1_], p0[i, j] / pitot))
    rows.sort(key=lambda t: (t[0], t[1]))
    return np.array([t[2] for t in rows])


# ------------------------------------------------------------ the registered runs
#
# As `w6ref.run_case` for SU2: every level of a case, coarsest first, each
# from the converged level below (mapFields), each to the residual asked or
# its iteration limit, with a record per level. The settings are passed in
# (README, the OpenFOAM registration); nothing is tuned per case.


class Deadline(Exception):
    pass


def _foam(cmd, cwd, log):
    with open(os.path.join(cwd, log), "w") as f:
        return subprocess.call(["bash", "-c", "source /opt/openfoam13/etc/bashrc; " + cmd], cwd=cwd,
                               stdout=f, stderr=subprocess.STDOUT)


def _set_control(case, key, value):
    path = os.path.join(case, "system", "controlDict")
    cd = open(path).read()
    cd, n = re.subn(rf"^{key}\s+[^;]*;", f"{key} {value};", cd, count=1, flags=re.M)
    assert n == 1, key
    open(path, "w").write(cd)


def _monitor_tail(case, n):
    """The monitor's last n rows (iteration, log10 residual), from the latest start's file."""
    d = os.path.join(case, "postProcessing", "resid")
    if not os.path.isdir(d) or not os.listdir(d):
        return []
    last = max(os.listdir(d), key=float)
    try:
        rows = [l.split() for l in open(os.path.join(d, last, "volFieldValue.dat")) if l.strip() and not l.startswith("#")]
        return [(float(r[0]), 0.5 * math.log10(max(float(r[1]), 1e-300)) - math.log10(1.4)) for r in rows[-n:]]
    except (OSError, ValueError, IndexError):
        return []


def solution_hash(time_dir):
    h = hashlib.sha256()
    for name in ("p", "T", "U"):
        h.update(open(os.path.join(time_dir, name), "rb").read())
    return h.hexdigest()


def settings_hash(spec, settings):
    keep = {k: v for k, v in spec.items() if k not in ("first_level", "levels")}
    return hashlib.sha256(json.dumps([keep, settings], sort_keys=True).encode()).hexdigest()


def _solve(case, np_, target, deadline):
    """
    foamRun on the case from its latest save. It is told to save and stop
    (writeNow) once the monitor's last 5 rows (50 iterations) are at or
    below 10^target, and 5 minutes before the deadline (then Deadline is
    raised: the level goes on from that save next time).
    """
    k = len([f for f in os.listdir(case) if f.startswith("log.run")])
    _set_control(case, "stopAt", "endTime")
    cmd = f"mpirun --allow-run-as-root -np {np_} foamRun -parallel" if np_ > 1 else "foamRun"
    with open(os.path.join(case, f"log.run{k}"), "w") as f:
        proc = subprocess.Popen(["bash", "-c", "source /opt/openfoam13/etc/bashrc; " + cmd], cwd=case,
                                stdout=f, stderr=subprocess.STDOUT)
        told = False
        while proc.poll() is None:
            tail = _monitor_tail(case, 5)
            if not told and len(tail) == 5 and max(v for _, v in tail) <= target:
                _set_control(case, "stopAt", "writeNow")
                told = True
            if deadline is not None and time.time() > deadline - 300:
                _set_control(case, "stopAt", "writeNow")
                try:
                    proc.wait(timeout=240)
                except subprocess.TimeoutExpired:
                    proc.terminate()
                    proc.wait()
                _set_control(case, "stopAt", "endTime")
                raise Deadline(f"{case} saved and stopped before the deadline")
            time.sleep(10)
    _set_control(case, "stopAt", "endTime")
    return proc.returncode


def run_case(spec, run_dir, settings, np_, deadline=None):
    """
    Every level of a case, coarsest first. settings: the registered
    OpenFOAM settings (solver, libs, flux, reconstruct, grad, outer, maxCo,
    smoothing), with "target" (log10 of the residual a level stops at),
    "iters" (each level's iteration limit) and "checkpoint" (iterations
    between saves). np_: processes per level. A level that finished keeps
    its record (record.json, with the spec's and settings' hash and its
    solution's) and is not run again; a level stopped by the deadline goes
    on from its last save. A finer level starts from the level below
    (mapFields), after checking the level below's solution on disk is the
    one its record finished with. One process at a time per case.
    """
    os.makedirs(run_dir, exist_ok=True)
    lock = os.open(os.path.join(run_dir, ".lock"), os.O_CREAT | os.O_RDWR)
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        raise SystemExit(f"{run_dir} is being run by another process")
    try:
        return _run_levels(spec, run_dir, settings, np_, deadline)
    finally:
        os.close(lock)


def _run_levels(spec, run_dir, settings, np_, deadline):
    sh = settings_hash(spec, settings)
    M = spec["mach"]
    out = []
    for level in range(spec.get("first_level", 0), spec["levels"]):
        d = os.path.join(run_dir, f"L{level}")
        done = os.path.join(d, "record.json")
        if os.path.exists(done):
            rec = json.load(open(done))
            if rec.get("settingsHash") != sh:
                raise SystemExit(f"{done} was made with another spec or settings")
            out.append(rec)
            print(json.dumps(rec), flush=True)
            continue
        nose, x, r, marks = w6ref.grid(spec, level)
        ni, nj = x.shape[0] - 1, x.shape[1] - 1
        seeded = bool(spec["seed"]) and level > 0
        start = os.path.join(d, "start.json")
        if not os.path.exists(start):
            # A fresh level (anything left from an unfinished set-up is replaced).
            if os.path.isdir(d):
                for sub in os.listdir(d):
                    path = os.path.join(d, sub)
                    if os.path.isdir(path):
                        shutil.rmtree(path)
                    else:
                        os.remove(path)
            os.makedirs(d, exist_ok=True)
            below = os.path.join(run_dir, f"L{level - 1}")
            if seeded:
                brec = json.load(open(os.path.join(below, "record.json")))
                if brec.get("settingsHash") != sh:
                    raise SystemExit(f"level {level - 1} was made with another spec or settings")
                if solution_hash(os.path.join(below, str(brec["time"]))) != brec.get("solutionSha256"):
                    raise SystemExit(f"level {level - 1}'s solution on disk is not the one its record finished with")
            write_polymesh(d, x, r, marks)
            write_case(d, spec, settings, settings["iters"][level], start_from_latest=True)
            _set_control(d, "writeInterval", str(settings["checkpoint"]))
            _set_control(d, "runTimeModifiable", "true")
            assert _foam("checkMesh", d, "log.checkMesh") == 0, "checkMesh failed to run"
            mesh_ok = "Mesh OK." in open(os.path.join(d, "log.checkMesh")).read()
            if seeded:
                assert _foam(f"mapFields ../L{level - 1} -consistent -sourceTime {brec['time']}", d, "log.map") == 0, "mapFields failed"
            if np_[level] > 1:
                with open(os.path.join(d, "system", "decomposeParDict"), "w") as f:
                    f.write(HEADER.format(cls="dictionary", loc="system", obj="decomposeParDict")
                            + f"numberOfSubdomains {np_[level]};\ndecomposer scotch;\n")
                assert _foam("decomposePar -force", d, "log.decompose") == 0, "decomposePar failed"
            json.dump({"seeded": seeded, "meshOK": mesh_ok, "settingsHash": sh,
                       "seedSha256": brec.get("solutionSha256") if seeded else None}, open(start, "w"))
        st = json.load(open(start))
        t0 = time.time()
        code = _solve(d, np_[level], settings["target"], deadline)
        if code == 0 and np_[level] > 1:
            code = _foam("reconstructPar -latestTime", d, "log.reconstruct")
        seconds = time.time() - t0
        rec = {"level": level, "ni": ni, "nj": nj, "exit": code, "seconds": seconds, "seeded": st["seeded"],
               "meshOK": st["meshOK"], "seedSha256": st["seedSha256"]}
        if code == 0:
            last = max(int(t) for t in os.listdir(d) if re.fullmatch(r"\d+", t))
            tdir = os.path.join(d, str(last))
            m = read_monitor(d, M)
            np.savetxt(os.path.join(d, "monitor.csv"), m, delimiter=",", header="iteration,log10_residual,drag", comments="")
            faces = wall_faces(tdir, x, r, marks, M)
            p0 = wall_total_pressure(tdir, x, r, marks, M)
            with open(os.path.join(d, "wall.csv"), "w") as f:
                f.write('"x0","r0","x1","r1","Pressure_Coefficient","p0_over_pitot"\n')
                for row, q in zip(faces, p0):
                    f.write(",".join(f"{v:.17e}" for v in (*row, q)) + "\n")
            n = max(2, len(m) // 4)
            q = m[-n:, 2]
            h = max(1, n // 2)
            rec.update({"time": last, "iterations": int(m[-1, 0]), "logRes": float(m[-1, 1]),
                        "converged": bool(len(_monitor_tail(d, 5)) == 5 and max(v for _, v in _monitor_tail(d, 5)) <= settings["target"]),
                        "atLimit": last >= settings["iters"][level],
                        "drag": faces_drag(faces), "forceDrag": float(m[-1, 2]),
                        "dragRangeLastQuarter": float(q.max() - q.min()),
                        "dragMeanLastEighth": float(q[-h:].mean()), "dragMeanEighthBefore": float(q[-2 * h:-h].mean()),
                        "solutionSha256": solution_hash(tdir)})
            rec.update(boundary_check(tdir, x, r, marks, M))
            if spec["rn"] > 0:
                s = stagnation(tdir, ni, nj, M)
                rec.update({"pitotCp": s["pitotCp"], "axisTotalPressure": s["axisTotalPressure"]})
            coarser = os.path.join(run_dir, f"L{level - 1}", "wall.csv")
            if level > 0 and os.path.exists(coarser):
                rec["change"] = faces_changes(read_wall(coarser), faces, spec["L"], w6ref.region_start(spec))
        rec["settingsHash"] = sh
        with open(done + ".tmp", "w") as f:
            json.dump(rec, f)
        os.replace(done + ".tmp", done)
        out.append(rec)
        print(json.dumps(rec), flush=True)
    return out
