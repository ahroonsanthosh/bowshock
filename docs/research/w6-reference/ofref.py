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
import math
import os

import numpy as np

import w6ref

HALF = 2.5  # degrees each side of the x-y plane

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
    if np.any(r[0, :] != 0.0) or np.any(r[1:, :] <= 0.0):
        raise ValueError("expected the line i = 0 on the axis and every other vertex off it")
    a = math.radians(HALF)
    front = np.empty((ni + 1, nj + 1), dtype=np.int64)
    back = np.empty((ni + 1, nj + 1), dtype=np.int64)
    front[0, :] = back[0, :] = np.arange(nj + 1)
    n_off = ni * (nj + 1)
    front[1:, :] = (nj + 1) + np.arange(n_off).reshape(ni, nj + 1)
    back[1:, :] = (nj + 1) + n_off + np.arange(n_off).reshape(ni, nj + 1)
    pts = np.zeros(((nj + 1) + 2 * n_off, 3))
    pts[: nj + 1, 0] = x[0, :]
    xo, ro = x[1:, :].ravel(), r[1:, :].ravel()
    pts[nj + 1 : nj + 1 + n_off] = np.stack([xo, ro * math.cos(a), ro * math.sin(a)], 1)
    pts[nj + 1 + n_off :] = np.stack([xo, ro * math.cos(a), -ro * math.sin(a)], 1)
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


def write_polymesh(case, x, r):
    """constant/polyMesh of the wedge: patches wall, farfield, outlet (as the C grid's markers), front, back."""
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
        ref = towards - centre[own]
        return face if np.dot(s, ref) > 0 else face[::-1]

    faces, owner, neigh = [], [], []
    # Internal faces in upper-triangular order: per cell, its north then its east neighbour.
    for i in range(ni):
        for j in range(nj):
            c = cell(i, j)
            if j < nj - 1:
                f = [F[i, j + 1], F[i + 1, j + 1], B[i + 1, j + 1], B[i, j + 1]]
                faces.append(oriented(f, c, centre[cell(i, j + 1)]))
                owner.append(c)
                neigh.append(cell(i, j + 1))
            if i < ni - 1:
                f = [F[i + 1, j], F[i + 1, j + 1], B[i + 1, j + 1], B[i + 1, j]]
                faces.append(oriented(f, c, centre[cell(i + 1, j)]))
                owner.append(c)
                neigh.append(cell(i + 1, j))
    n_internal = len(faces)
    patches = []

    def patch(name, kind, items):
        start = len(faces)
        for f, c in items:
            s, fc = _area_vector(pts, _dedup(f))
            faces.append(oriented(f, c, fc + 2 * (fc - centre[c])))
            owner.append(c)
        patches.append((name, kind, len(faces) - start, start))

    patch("wall", "wall", [([F[i, 0], F[i + 1, 0], B[i + 1, 0], B[i, 0]], cell(i, 0)) for i in range(ni)])
    patch("farfield", "patch", [([F[i, nj], F[i + 1, nj], B[i + 1, nj], B[i, nj]], cell(i, nj - 1)) for i in range(ni)])
    patch("outlet", "patch", [([F[ni, j], F[ni, j + 1], B[ni, j + 1], B[ni, j]], cell(ni - 1, j)) for j in range(nj)])
    patch("front", "wedge", [([F[i, j], F[i + 1, j], F[i + 1, j + 1], F[i, j + 1]], cell(i, j)) for i in range(ni) for j in range(nj)])
    patch("back", "wedge", [([B[i, j], B[i + 1, j], B[i + 1, j + 1], B[i, j + 1]], cell(i, j)) for i in range(ni) for j in range(nj)])

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

# Per iteration, from OpenFOAM's own function objects (no compiled code:
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
        writeControl    writeTime;
    }
    sqDdtRho
    {
        type            magSqr;
        libs            ("libfieldFunctionObjects.so");
        field           ddt(rho);
        executeControl  timeStep;
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
        writeControl    timeStep;
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
        writeControl    writeTime;
    }
    pGauge
    {
        type            subtract;
        libs            ("libfieldFunctionObjects.so");
        fields          (p pFree);
        result          pGauge;
        executeControl  timeStep;
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
        writeControl    writeTime;
    }
    pX
    {
        type            multiply;
        libs            ("libfieldFunctionObjects.so");
        fields          (pGauge ex);
        result          pX;
        executeControl  timeStep;
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
        writeControl    timeStep;
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
    with open(os.path.join(case, "system", "controlDict"), "w") as f:
        f.write(HEADER.format(cls="dictionary", loc="system", obj="controlDict"))
        f.write(f"""solver          shockFluid;
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
        f.write(f"""fluxScheme      {settings["flux"]};

ddtSchemes
{{
    default         localEuler;
}}

gradSchemes
{{
    default         Gauss linear;
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
    reconstruct(rho) {rc};
    reconstruct(U)  {rc}V;
    reconstruct(T)  {rc};
}}

snGradSchemes
{{
    default         corrected;
}}
""")
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
    maxCo           {settings["maxCo"]};
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


def read_monitor(case, mach):
    """Per iteration: the iteration, log10 of the RMS of d rho / dt (on rho_inf), and the drag on pi R^2."""
    res = _table(os.path.join(case, "postProcessing", "resid", "0", "volFieldValue.dat"))
    frc = _table(os.path.join(case, "postProcessing", "wallForce", "0", "surfaceFieldValue.dat"))
    n = min(len(res), len(frc))
    it = res[:n, 0]
    rms = 0.5 * np.log10(np.maximum(res[:n, 1], 1e-300)) - math.log10(1.4)
    # surfaceFieldValue.dat: time, the force along x on the wedge, which holds 2 HALF degrees.
    cd = frc[:n, 1] * (360.0 / (2 * HALF)) / (0.7 * mach * mach * math.pi * w6ref.R**2)
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
