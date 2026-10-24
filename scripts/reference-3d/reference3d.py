#!/usr/bin/env python3
"""
The independent reference of design record 0021 section 4.4 (0014 10.7 (u)):
SU2 8.1.0 on meshes from Gmsh 4.13.1, both run as separate programs on the
owner's machine. Nothing of SU2 or Gmsh is copied into bowshock; this script
downloads the pinned releases into .reference-3d/ (not committed), writes the
registered geometry, meshes and settings, runs SU2_CFD, and collects the
results with the versions, archive hashes and machine into
docs/research/solver3d/reference/.

Usage (from the repository root; Python 3.9 or newer):

    python3 scripts/reference-3d/reference3d.py all            # install, mesh, run, collect every case
    python3 scripts/reference-3d/reference3d.py all --cases e3,h1 --threads 8
    python3 scripts/reference-3d/reference3d.py list           # the cases and their roles
    python3 scripts/reference-3d/reference3d.py smoke          # a small unregistered case, to check the setup

A level already collected is skipped, so an interrupted run resumes where it
stopped. Commit docs/research/solver3d/reference/ when it finishes (every run
file, interrupted ones included).
"""

import argparse
import hashlib
import json
import math
import os
import platform
import shutil
import subprocess
import sys
import time
import urllib.request
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
WORK = ROOT / '.reference-3d'
RESULTS = ROOT / 'docs' / 'research' / 'solver3d' / 'reference'

SU2_VERSION = '8.1.0'
GMSH_VERSION = '4.13.1'
# SHA-256 of the release archives, recorded on 2026-10-23 from the project's GitHub releases.
SU2_ARCHIVES = {
    'linux': ('SU2-v8.1.0-linux64.zip', '45589fdeb8185f1ccc4eebfa22dfbe00d5cb422ccfa2360e97647c1ae1b7d302'),
    'darwin': ('SU2-v8.1.0-macos64.zip', 'aeb4f6306ea5543913b07937147661dd58ddf881ac15cda2d492bd42f65fe980'),
    'windows': ('SU2-v8.1.0-win64.zip', '1319279f7b9f95d9faebeefcea6368a5c96bbe7f72388579a62aa146da63e2b4'),
}
SU2_URL = 'https://' + 'github.com/su2code/SU2/releases/download/v8.1.0/'


# ----------------------------------------------------------------------------- install

def system_key():
    s = platform.system().lower()
    if s.startswith('win'):
        return 'windows'
    if s == 'darwin':
        return 'darwin'
    return 'linux'


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def venv_python():
    return WORK / 'venv' / ('Scripts/python.exe' if system_key() == 'windows' else 'bin/python')


def su2_binary():
    name = 'SU2_CFD.exe' if system_key() == 'windows' else 'SU2_CFD'
    for p in (WORK / 'su2').rglob(name):
        return p
    raise SystemExit('SU2_CFD not found; run the install step')


def install():
    WORK.mkdir(exist_ok=True)
    info = {}
    # Gmsh, from its published Python wheel, in a virtual environment of its own.
    if not venv_python().exists():
        subprocess.run([sys.executable, '-m', 'venv', str(WORK / 'venv')], check=True)
    subprocess.run([str(venv_python()), '-m', 'pip', 'install', '-q', f'gmsh=={GMSH_VERSION}'], check=True)
    v = subprocess.run([str(venv_python()), '-I', '-c', 'import gmsh; print(gmsh.__version__)'],
                       check=True, capture_output=True, text=True).stdout.strip()
    if v != GMSH_VERSION:
        raise SystemExit(f'gmsh {v} installed, {GMSH_VERSION} needed')
    info['gmsh'] = v
    # SU2, the pinned release archive, its hash checked.
    name, digest = SU2_ARCHIVES[system_key()]
    archive = WORK / name
    if not archive.exists():
        print(f'downloading {name}')
        urllib.request.urlretrieve(SU2_URL + name, archive)
    got = sha256(archive)
    if got != digest:
        archive.unlink()
        raise SystemExit(f'{name}: SHA-256 {got}, expected {digest}; deleted, not used')
    if not (WORK / 'su2').exists():
        with zipfile.ZipFile(archive) as z:
            z.extractall(WORK / 'su2')
    exe = su2_binary()
    if system_key() != 'windows':
        exe.chmod(0o755)
    head = subprocess.run([str(exe), '--help'], capture_output=True, text=True).stdout.splitlines()[0]
    if f'v{SU2_VERSION}' not in head:
        raise SystemExit(f'SU2_CFD reports "{head}", v{SU2_VERSION} needed')
    info.update({'su2': head, 'su2_archive': name, 'su2_sha256': got})
    if system_key() == 'darwin' and platform.machine() == 'arm64':
        info['note'] = 'macos64 build (x86_64) run under Rosetta on Apple silicon'
    (WORK / 'install.json').write_text(json.dumps(info, indent=2))
    return info


# ----------------------------------------------------------------------------- the flow

def freestream(cases, mach):
    f = cases['freestream']
    a = math.sqrt(f['gamma'] * f['gas_constant'] * f['temperature'])
    rho = f['pressure'] / (f['gas_constant'] * f['temperature'])
    v = mach * a
    return {'p': f['pressure'], 't': f['temperature'], 'v': v, 'q': 0.5 * rho * v * v}


def billig(mn):
    """Billig's correlation for cylinders (standoff, shock radius at the vertex), over the edge's radius."""
    return 0.386 * math.exp(4.67 / mn ** 2), 1.386 * math.exp(1.8 / (mn - 1) ** 0.75)


# ----------------------------------------------------------------------------- meshing (run inside the venv)

def mesh_case(case, level, ratio, out):
    """Builds the case's geometry with Gmsh's OpenCASCADE kernel and writes out/mesh.su2 and out/mesh.json."""
    import gmsh  # noqa: E402 (only in the venv)

    f = ratio ** (-level)
    gmsh.initialize()
    gmsh.option.setNumber('General.Terminal', 0)
    gmsh.option.setNumber('General.NumThreads', os.cpu_count() or 1)
    occ = gmsh.model.occ
    kind = case['kind']
    t = case.get('thickness', 1.0)
    r = t / 2
    mn = case['mach'] * math.cos(math.radians(case.get('sweepDeg', 0.0)))
    delta, _ = billig(max(mn, 1.05))
    standoff = delta * r
    dim = 2 if kind in ('planar-edge', 'planar-section') else 3

    def fin_solid(x0, y0, root, tip, span, sweep):
        """The fin: a plate of thickness t about z = 0, its leading edge at x0 where y = y0 (the root), its
        trailing edge unswept at x0 + root, its tip face the plane y = y0 + span. The root is extended 2 t into
        the body (or below the wall), so that the cut leaves a clean junction."""
        tan = math.tan(math.radians(sweep))
        y1 = y0 + span
        yb = y0 - 2 * t
        le = lambda y: x0 + (y - y0) * tan  # the leading edge (its foremost line)
        if case['edge'] == 'square':
            pts = [(le(yb), yb), (x0 + root, yb), (x0 + root, y1), (le(y1), y1)]
            tags = [occ.addPoint(px, py, -r) for px, py in pts]
            lines = [occ.addLine(tags[k], tags[(k + 1) % 4]) for k in range(4)]
            face = occ.addPlaneSurface([occ.addCurveLoop(lines)])
            ext = occ.extrude([(2, face)], 0, 0, t)
            return [e for e in ext if e[0] == 3][0][1]
        # Rounded: the edge's centre line lies r behind the leading edge, measured normal to it, so r / cos(sweep)
        # behind it along x. The plate runs from that line back; a cylinder of radius r lies along it.
        cos = math.cos(math.radians(sweep))
        d = r / cos
        pts = [(le(yb) + d, yb), (x0 + root, yb), (x0 + root, y1), (le(y1) + d, y1)]
        tags = [occ.addPoint(px, py, -r) for px, py in pts]
        lines = [occ.addLine(tags[k], tags[(k + 1) % 4]) for k in range(4)]
        face = occ.addPlaneSurface([occ.addCurveLoop(lines)])
        ext = occ.extrude([(2, face)], 0, 0, t)
        plate = [e for e in ext if e[0] == 3][0][1]
        length = (span + 4 * t) / cos
        sx, sy = math.sin(math.radians(sweep)), cos
        cyl = occ.addCylinder(le(yb) + d, yb, 0.0, sx * length, sy * length, 0.0, r)
        big = 10 * (root + span + 10 * t)
        clip = occ.addBox(x0 - big, y1, -big, 2 * big, big, 2 * big)
        cyl_cut = occ.cut([(3, cyl)], [(3, clip)])[0]
        fused = occ.fuse([(3, plate)], cyl_cut)[0]
        return fused[0][1]

    sizes = {}
    if kind == 'planar-edge':
        r = 0.5
        t = 1.0
        x_up = r + 1.6 * standoff + 2.0
        y_top = max(10.0, 6.0 * standoff + 6.0)
        x_out = 10.0
        occ.addRectangle(-x_up, 0, 0, x_up + x_out, y_top, 100)
        if case['edge'] == 'rounded':
            body = occ.addDisk(r, 0, 0, r, r, 200)
            plate = occ.addRectangle(r, -r, 0, x_out + 5, 2 * r, 201)
            body = occ.fuse([(2, body)], [(2, plate)])[0]
        else:
            body = [(2, occ.addRectangle(0, -r, 0, x_out + 5, 2 * r, 200))]
        fluid = occ.cut([(2, 100)], body)[0]
        occ.synchronize()
        h_edge, h_far = 0.03 * f, 0.5 * f
        sizes = {'edge': h_edge, 'far': h_far}
        lim = {'x_in': -x_up, 'x_out': x_out, 'top': y_top}
    elif kind == 'planar-section':
        # Rung (b3) (0021 4.2, revision 3e): the upper half of a symmetric hexagon of chord 1 (lengths in chords),
        # sharp edges, in 0009 section 2.4's domain: x from -0.3 to 1.2, 1.4 chords high; the plane y = 0 ahead
        # of and behind the section a symmetry plane.
        b, h = case['bevel'], case['thicknessRatio'] / 2
        pts = [(-0.3, 0.0), (0.0, 0.0), (b, h), (1.0 - b, h), (1.0, 0.0), (1.2, 0.0), (1.2, 1.4), (-0.3, 1.4)]
        tags = [occ.addPoint(px, py, 0) for px, py in pts]
        lines = [occ.addLine(tags[k], tags[(k + 1) % len(tags)]) for k in range(len(tags))]
        occ.addPlaneSurface([occ.addCurveLoop(lines)])
        occ.synchronize()
        sizes = {'edge': 0.002 * f, 'far': 0.01 * f, 'distMin': 0.02, 'distMax': 0.2}
        lim = {'x_in': -0.3, 'x_out': 1.2, 'top': 1.4}
    elif kind in ('plane-wall-fin', 'cylinder-fin'):
        c, ct, s, sw = case['rootChord'], case['tipChord'], case['span'], case['sweepDeg']
        x_up = r + 1.6 * standoff + 2.0
        env = 0.7 * c + 4.0
        if kind == 'plane-wall-fin':
            occ.addBox(-x_up, 0, 0, x_up + c, s + env, env, 100)
            fin = fin_solid(0.0, 0.0, c, ct, s, sw)
            fluid = occ.cut([(3, 100)], [(3, fin)])[0]
            lim = {'x_in': -x_up, 'x_out': c, 'top': s + env, 'side': env}
        else:
            rb = case['bodyRadius']
            r_out = rb + s + env
            outer = occ.addCylinder(-x_up, 0, 0, x_up + c, 0, 0, r_out)
            inner = occ.addCylinder(-x_up - 1, 0, 0, x_up + c + 2, 0, 0, rb)
            half = occ.addBox(-x_up - 5, -r_out - 5, -r_out - 5, x_up + c + 10, 2 * r_out + 10, r_out + 5)
            shell = occ.cut([(3, outer)], [(3, inner), (3, half)])[0]
            fin = fin_solid(0.0, rb, c, ct, s, sw)
            fluid = occ.cut(shell, [(3, fin)])[0]
            lim = {'x_in': -x_up, 'x_out': c, 'r_out': r_out, 'r_body': rb}
        occ.synchronize()
        sizes = {'edge': t / 8 * f, 'fin': t / 3 * f, 'far': 2.0 * f}
    elif kind == 'body-fins':
        n, ln, lb = case['fins'], case['noseLength'], case['bodyLength']
        rb = 0.5
        c, ct, s = case['rootChord'], case['tipChord'], case['span']
        sw = math.degrees(math.atan((c - ct) / s))
        case = dict(case, sweepDeg=sw)
        rho = (rb ** 2 + ln ** 2) / (2 * rb)
        prof = [(x, math.sqrt(max(rho ** 2 - (ln - x) ** 2, 0.0)) - (rho - rb)) for x in [ln * (k / 60) ** 1.5 for k in range(61)]]
        x_in, r_out = -1.0, 7.0
        p_in = occ.addPoint(x_in, 0, 0)
        p_tip = occ.addPoint(0, 0, 0)
        p_shoulder = occ.addPoint(ln, rb, 0)
        p_base = occ.addPoint(lb, rb, 0)
        p_base_out = occ.addPoint(lb, r_out, 0)
        p_in_out = occ.addPoint(x_in, r_out, 0)
        spline = occ.addBSpline([p_tip] + [occ.addPoint(x, y, 0) for x, y in prof[1:-1]] + [p_shoulder])
        loop = occ.addCurveLoop([
            occ.addLine(p_in, p_tip),
            spline,
            occ.addLine(p_shoulder, p_base),
            occ.addLine(p_base, p_base_out),
            occ.addLine(p_base_out, p_in_out),
            occ.addLine(p_in_out, p_in),
        ])
        face = occ.addPlaneSurface([loop])
        sector = occ.revolve([(2, face)], 0, 0, 0, 1, 0, 0, math.pi / n)
        vol = [e for e in sector if e[0] == 3][0][1]
        fin = fin_solid(lb - c, rb, c, ct, s, sw)
        fluid = occ.cut([(3, vol)], [(3, fin)])[0]
        occ.removeAllDuplicates()
        occ.synchronize()
        sizes = {'edge': t / 8 * f, 'fin': t / 3 * f, 'body': 0.03 * f, 'far': 0.4 * f}
        lim = {'x_in': x_in, 'x_out': lb, 'r_out': r_out, 'r_body': rb, 'sector': math.pi / n}
    else:
        raise SystemExit(f'unknown kind {kind}')

    # classify the boundary into markers
    vols = gmsh.model.getEntities(dim)
    bnd = gmsh.model.getBoundary(vols, oriented=False, combined=True)
    markers = {}
    tol = 1e-4 * max(1.0, abs(lim['x_out']) + abs(lim['x_in']))
    for (d, tag) in bnd:
        x0, y0, z0, x1, y1, z1 = gmsh.model.getBoundingBox(d, tag)
        cx, cy, cz = (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2
        if abs(x1 - x0) < tol and abs(x0 - lim['x_in']) < 1e-3:
            name = 'inlet'
        elif abs(x1 - x0) < tol and abs(x0 - lim['x_out']) < 1e-3:
            name = 'outlet'
        elif dim == 2:
            if abs(y1 - y0) < tol and abs(y0) < 1e-5:
                name = 'sym'
            elif abs(y1 - y0) < tol and abs(y0 - lim['top']) < 1e-3:
                name = 'far'
            else:
                name = 'fin'
        elif kind == 'plane-wall-fin':
            if abs(z1 - z0) < tol and abs(z0) < 1e-5:
                name = 'sym'
            elif abs(y1 - y0) < tol and abs(y0) < 1e-5:
                name = 'wall'
            elif (abs(y1 - y0) < tol and abs(y0 - lim['top']) < 1e-3) or (abs(z1 - z0) < tol and abs(z0 - lim['side']) < 1e-3):
                name = 'far'
            else:
                name = 'fin'
        else:
            if abs(z1 - z0) < tol and abs(z0) < 1e-5:
                name = 'sym'
            else:
                u = gmsh.model.getParametrizationBounds(d, tag)
                mid = [(u[0][i] + u[1][i]) / 2 for i in range(len(u[0]))]
                px, py, pz = gmsh.model.getValue(d, tag, mid)
                nx, ny, nz = gmsh.model.getNormal(tag, mid)
                rr = math.hypot(py, pz)
                sec = lim.get('sector')
                if sec is not None and abs(abs(-math.sin(sec) * ny + math.cos(sec) * nz) - 1) < 1e-6 and abs(math.atan2(pz, py) - sec) < 1e-4:
                    name = 'sym'
                elif abs(rr - lim['r_out']) < 1e-3 * lim['r_out']:
                    name = 'far'
                elif abs(rr - lim['r_body']) < 1e-4 or (kind == 'body-fins' and px < case['noseLength'] + 1e-6 and rr <= lim['r_body'] + 1e-6):
                    name = 'wall'
                else:
                    name = 'fin'
        markers.setdefault(name, []).append(tag)
    for name, tags in markers.items():
        gmsh.model.addPhysicalGroup(dim - 1, tags, name=name)
    gmsh.model.addPhysicalGroup(dim, [v[1] for v in vols], name='fluid')

    # sizes: fine at the fin's surfaces and edge, coarse far away
    fin_tags = markers.get('fin', [])
    fd = gmsh.model.mesh.field
    dist = fd.add('Distance')
    fd.setNumbers(dist, 'SurfacesList' if dim == 3 else 'CurvesList', fin_tags)
    fd.setNumber(dist, 'Sampling', 60)
    thr = fd.add('Threshold')
    fd.setNumber(thr, 'InField', dist)
    fd.setNumber(thr, 'SizeMin', sizes['edge'])
    fd.setNumber(thr, 'SizeMax', sizes['far'])
    fd.setNumber(thr, 'DistMin', sizes.get('distMin', max(standoff, 0.5 * t) * 1.5))
    fd.setNumber(thr, 'DistMax', sizes.get('distMax', max(standoff, 0.5 * t) * 1.5 + 30 * sizes['far']))
    fields = [thr]
    if 'wall' in markers and 'body' in sizes:
        d2 = fd.add('Distance')
        fd.setNumbers(d2, 'SurfacesList', markers['wall'])
        t2 = fd.add('Threshold')
        fd.setNumber(t2, 'InField', d2)
        fd.setNumber(t2, 'SizeMin', sizes['body'])
        fd.setNumber(t2, 'SizeMax', sizes['far'])
        fd.setNumber(t2, 'DistMin', 0.05)
        fd.setNumber(t2, 'DistMax', 2.0)
        fields.append(t2)
    mn_f = fd.add('Min')
    fd.setNumbers(mn_f, 'FieldsList', fields)
    fd.setAsBackgroundMesh(mn_f)
    gmsh.option.setNumber('Mesh.MeshSizeExtendFromBoundary', 0)
    gmsh.option.setNumber('Mesh.MeshSizeFromPoints', 0)
    gmsh.option.setNumber('Mesh.MeshSizeFromCurvature', 0)
    gmsh.option.setNumber('Mesh.Algorithm', 6)
    gmsh.option.setNumber('Mesh.Algorithm3D', 10)
    gmsh.model.mesh.generate(dim)
    gmsh.option.setNumber('Mesh.SaveAll', 0)
    out.mkdir(parents=True, exist_ok=True)
    gmsh.write(str(out / 'mesh.su2'))
    types, tags_el, _ = gmsh.model.mesh.getElements(dim)
    cells = sum(len(x) for x in tags_el)
    nodes = len(gmsh.model.mesh.getNodes()[0])
    gmsh.finalize()
    meta = {'cells': cells, 'nodes': nodes, 'markers': sorted(markers), 'sizes': sizes, 'limits': lim,
            'standoff_estimate': standoff, 'sweepDeg': case.get('sweepDeg', 0.0)}
    (out / 'mesh.json').write_text(json.dumps(meta, indent=2))
    return meta


# ----------------------------------------------------------------------------- SU2 settings

def write_config(cases, case, out, meta):
    fs = freestream(cases, case['mach'])
    markers = meta['markers']
    euler = [m for m in ('fin', 'wall') if m in markers]
    sym = [m for m in ('sym',) if m in markers]
    lines = {
        'SOLVER': 'EULER',
        'MATH_PROBLEM': 'DIRECT',
        'RESTART_SOL': 'NO',
        'MACH_NUMBER': f"{case['mach']}",
        'AOA': '0.0',
        'SIDESLIP_ANGLE': '0.0',
        'FREESTREAM_PRESSURE': f"{fs['p']}",
        'FREESTREAM_TEMPERATURE': f"{fs['t']}",
        'GAMMA_VALUE': f"{cases['freestream']['gamma']}",
        'GAS_CONSTANT': f"{cases['freestream']['gas_constant']}",
        'REF_DIMENSIONALIZATION': 'DIMENSIONAL',
        'REF_ORIGIN_MOMENT_X': '0.0',
        'REF_ORIGIN_MOMENT_Y': '0.0',
        'REF_ORIGIN_MOMENT_Z': '0.0',
        'REF_LENGTH': '1.0',
        'REF_AREA': '1.0',
        'MARKER_EULER': '( ' + ', '.join(euler) + ' )',
        'MARKER_SUPERSONIC_INLET': f"( inlet, {fs['t']}, {fs['p']}, {fs['v']}, 0.0, 0.0 )",
        'MARKER_SUPERSONIC_OUTLET': '( outlet )',
        'MARKER_MONITORING': '( fin )',
        'MARKER_PLOTTING': '( fin )',
        'NUM_METHOD_GRAD': 'WEIGHTED_LEAST_SQUARES',
        'CFL_NUMBER': '1.0',
        'CFL_ADAPT': 'YES',
        'CFL_ADAPT_PARAM': '( 0.5, 1.5, 1.0, 50.0 )',
        'CONV_NUM_METHOD_FLOW': 'HLLC',
        'MUSCL_FLOW': 'YES',
        'SLOPE_LIMITER_FLOW': 'VENKATAKRISHNAN',
        'VENKAT_LIMITER_COEFF': '0.05',
        'TIME_DISCRE_FLOW': 'EULER_IMPLICIT',
        'LINEAR_SOLVER': 'FGMRES',
        'LINEAR_SOLVER_PREC': 'ILU',
        'LINEAR_SOLVER_ERROR': '1e-6',
        'LINEAR_SOLVER_ITER': '10',
        'ITER': '40000',
        # Converged on the fin's drag (Cauchy: its mean relative change over 300 iterations below 1e-9): with
        # a limiter at captured shocks the residual stalls near a cycle (the smoke case: rms[Rho] stayed at
        # -2.66 while CD held its first six digits), so a residual criterion would never be met.
        'CONV_FIELD': 'DRAG',
        'CONV_CAUCHY_ELEMS': '300',
        'CONV_CAUCHY_EPS': '1e-9',
        'CONV_STARTITER': '500',
        'MESH_FILENAME': 'mesh.su2',
        'MESH_FORMAT': 'SU2',
        'OUTPUT_FILES': '( RESTART_ASCII, SURFACE_CSV )',
        'HISTORY_OUTPUT': '( ITER, RMS_RES, AERO_COEFF, AERO_COEFF_SURF )',
        'SCREEN_OUTPUT': '( INNER_ITER, RMS_DENSITY, DRAG )',
        'OUTPUT_WRT_FREQ': '1000',
        'CONV_FILENAME': 'history',
        'SURFACE_FILENAME': 'surface_flow',
        'RESTART_FILENAME': 'restart_flow.dat',
    }
    if sym:
        lines['MARKER_SYM'] = '( ' + ', '.join(sym) + ' )'
    if 'far' in markers:
        lines['MARKER_FAR'] = '( far )'
    text = '% SU2 settings written by scripts/reference-3d/reference3d.py (0021 4.4)\n'
    text += ''.join(f'{k}= {v}\n' for k, v in lines.items())
    (out / 'config.cfg').write_text(text)
    return fs


# ----------------------------------------------------------------------------- run and collect

def machine():
    return {'system': platform.platform(), 'processor': platform.processor() or platform.machine(),
            'cores': os.cpu_count(), 'python': platform.python_version()}


def run_level(cases, case, level, threads, base, results):
    dest = results / case['id'] / f'L{level}'
    if (dest / 'result.json').exists():
        print(f"{case['id']} L{level}: collected before, skipped")
        return
    work = base / case['id'] / f'L{level}'
    work.mkdir(parents=True, exist_ok=True)
    if not (work / 'mesh.json').exists():
        print(f"{case['id']} L{level}: meshing")
        subprocess.run([str(venv_python()), '-I', str(Path(__file__).resolve()), 'mesh-one', case['id'], str(level), str(work)],
                       check=True)
    meta = json.loads((work / 'mesh.json').read_text())
    fs = write_config(cases, case, work, meta)
    print(f"{case['id']} L{level}: {meta['cells']} cells, SU2 running")
    t0 = time.time()
    with open(work / 'su2.log', 'w') as log:
        rc = subprocess.run([str(su2_binary()), '-t', str(threads), 'config.cfg'], cwd=work, stdout=log, stderr=subprocess.STDOUT).returncode
    seconds = time.time() - t0
    dest.mkdir(parents=True, exist_ok=True)
    for name in ('config.cfg', 'mesh.json', 'history.csv', 'surface_flow.csv'):
        if (work / name).exists():
            shutil.copy(work / name, dest / name)
    log_lines = (work / 'su2.log').read_text(errors='replace').splitlines()
    (dest / 'su2-log-head-tail.txt').write_text('\n'.join(log_lines[:60] + ['...'] + log_lines[-40:]) + '\n')
    hist = (work / 'history.csv').read_text().splitlines() if (work / 'history.csv').exists() else []
    last = {}
    if len(hist) > 1:
        head = [h.strip().strip('"') for h in hist[0].split(',')]
        vals = [v.strip() for v in hist[-1].split(',')]
        last = dict(zip(head, vals))
    result = {
        'case': case, 'level': level, 'returncode': rc, 'seconds': round(seconds, 1),
        'mesh_sha256': sha256(work / 'mesh.su2'), 'cells': meta['cells'],
        'freestream': fs, 'last_history_row': last,
        'install': json.loads((WORK / 'install.json').read_text()), 'machine': machine(),
        'note': 'SU2 forces with REF_AREA 1 m2: the CD columns are drag over q in m2, of the half fin in the domain',
    }
    (dest / 'result.json').write_text(json.dumps(result, indent=2))
    print(f"{case['id']} L{level}: return code {rc}, {seconds:.0f} s")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('step', choices=['all', 'install', 'list', 'smoke', 'mesh-one'])
    ap.add_argument('rest', nargs='*')
    ap.add_argument('--cases', default='')
    ap.add_argument('--threads', type=int, default=max(1, (os.cpu_count() or 2) - 1))
    ap.add_argument('--levels', default='0,1,2,3')
    a = ap.parse_args()
    cases = json.loads((HERE / 'cases.json').read_text())
    by_id = {c['id']: c for c in cases['cases']}
    if a.step == 'mesh-one':
        cid, level, out = a.rest
        case = by_id[cid] if cid in by_id else json.loads((Path(out) / 'case.json').read_text())
        mesh_case(case, int(level), cases['levels']['ratio'], Path(out))
        return
    if a.step == 'list':
        for c in cases['cases']:
            print(f"{c['id']:18s} {c['kind']:15s} M {c['mach']}  {c['role']}")
        return
    if a.step == 'install':
        print(json.dumps(install(), indent=2))
        return
    install()
    if a.step == 'smoke':
        # An unregistered case: a rounded planar edge at Mach 2.5, coarsest level only, nothing committed.
        case = {'id': 'smoke', 'kind': 'planar-edge', 'edge': 'rounded', 'mach': 2.5}
        work = WORK / 'runs-smoke' / 'smoke' / 'L0'
        work.mkdir(parents=True, exist_ok=True)
        (work / 'case.json').write_text(json.dumps(case))
        run_level(cases, case, 0, a.threads, WORK / 'runs-smoke', WORK / 'smoke-results')
        return
    chosen = [by_id[c] for c in a.cases.split(',')] if a.cases else cases['cases']
    levels = [int(x) for x in a.levels.split(',')]
    stamp = time.strftime('%Y-%m-%dT%H-%M-%S')
    RESULTS.mkdir(parents=True, exist_ok=True)
    (RESULTS / f'run-{stamp}.json').write_text(json.dumps({'started': stamp, 'cases': [c['id'] for c in chosen],
                                                           'levels': levels, 'machine': machine()}, indent=2))
    for c in chosen:
        for lv in levels:
            run_level(cases, c, lv, a.threads, WORK / 'runs', RESULTS)
    (RESULTS / f'run-{stamp}.json').write_text(json.dumps({'started': stamp, 'finished': time.strftime('%Y-%m-%dT%H-%M-%S'),
                                                           'cases': [c['id'] for c in chosen], 'levels': levels,
                                                           'machine': machine()}, indent=2))


if __name__ == '__main__':
    main()
