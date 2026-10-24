#!/usr/bin/env python3
"""
R5 of 0014 10.7 (y): the independent inviscid code. SU2 8.1.0 (axisymmetric
Euler) on meshes from Gmsh 4.13.1, run by the owner on their own machine as
separate programs, exactly as scripts/reference-3d/reference3d.py (0021 4.4,
branch claude/wip/solver3d) does for the 3D fins: the pinned releases are
downloaded into .reference-su2/ (not committed; their SHA-256 checked), the
registered cases are meshed and run, and only inputs and results are
collected into docs/research/nose-model-form/su2/results/.

The cases (fixed by (y), not to be edited): TN 4233's 7 deg cone-cylinder
(semiapex 6 deg 59 min, nose 8.169 radii, base radius 1, 10 calibers of
cylinder to the outlet, far boundary 224.2 radii: the family's own domain
below Mach 1.05) at indicated Mach 0.901, 0.960 and 0.991, three mesh
levels refined by 2 near the body (L0 coarse to L2 fine).

What is collected per level: SU2's surface_flow.csv (the wall pressure), the
history, the settings; and from the wall pressure, computed here and not by
SU2's own force conventions, the nose pressure drag on the base area
(integral of Cp against r^2 over the cone) and Cp at the ten TN 4233
stations. Per rung: results/M<mach>.json with the finest level's drag, a
band from the three levels (Richardson's index at the observed order capped
at 2, as 0005; the range where the levels oscillate), the station values,
versions, hashes and the machine.

Usage (from the repository root; Python 3.9 or newer):

    python3 docs/research/nose-model-form/su2/su2_cone_cylinder.py smoke     # coarse level at Mach 0.6, nothing committed
    python3 docs/research/nose-model-form/su2/su2_cone_cylinder.py all       # the three rungs, three levels each
    python3 docs/research/nose-model-form/su2/su2_cone_cylinder.py all --machs 0.901 --threads 8

NOT RUN in the container that wrote it (no SU2 or Gmsh there): the smoke
step is the owner's first check. See README.txt.
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
ROOT = HERE.parent.parent.parent.parent
WORK = ROOT / '.reference-su2'
RESULTS = HERE / 'results'

SU2_VERSION = '8.1.0'
GMSH_VERSION = '4.13.1'
# SHA-256 of the release archives, as scripts/reference-3d/reference3d.py records them (2026-10-23).
SU2_ARCHIVES = {
    'linux': ('SU2-v8.1.0-linux64.zip', '45589fdeb8185f1ccc4eebfa22dfbe00d5cb422ccfa2360e97647c1ae1b7d302'),
    'darwin': ('SU2-v8.1.0-macos64.zip', 'aeb4f6306ea5543913b07937147661dd58ddf881ac15cda2d492bd42f65fe980'),
    'windows': ('SU2-v8.1.0-win64.zip', '1319279f7b9f95d9faebeefcea6368a5c96bbe7f72388579a62aa146da63e2b4'),
}
SU2_URL = 'https://' + 'github.com/su2code/SU2/releases/download/v8.1.0/'

# The registered case (0014 10.7 (y), R5): lengths in body radii.
TAU = math.tan(math.radians(6 + 59 / 60))
NOSE = 1 / TAU                   # 8.169 radii
CYLINDER = 20.0                  # 10 calibers
FAR = 224.2                      # the family's own far boundary below Mach 1.05
RUNGS = [0.901, 0.960, 0.991]
LEVELS = 3
STATIONS = [0.082, 0.183, 0.285, 0.385, 0.486, 0.589, 0.688, 0.79, 0.891, 0.942]  # x/l, TN 4233 orifices 1 to 10
FREESTREAM = {'pressure': 101325.0, 'temperature': 288.15, 'gamma': 1.4, 'gas_constant': 287.058}
ITER = 100000


# ----------------------------------------------------------------------------- install

def system_key():
    s = platform.system().lower()
    return 'windows' if s.startswith('win') else 'darwin' if s == 'darwin' else 'linux'


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
    if not venv_python().exists():
        subprocess.run([sys.executable, '-m', 'venv', str(WORK / 'venv')], check=True)
    subprocess.run([str(venv_python()), '-m', 'pip', 'install', '-q', f'gmsh=={GMSH_VERSION}'], check=True)
    v = subprocess.run([str(venv_python()), '-I', '-c', 'import gmsh; print(gmsh.__version__)'],
                       check=True, capture_output=True, text=True).stdout.strip()
    if v != GMSH_VERSION:
        raise SystemExit(f'gmsh {v} installed, {GMSH_VERSION} needed')
    info['gmsh'] = v
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
    (WORK / 'install.json').write_text(json.dumps(info, indent=2))
    return info


# ----------------------------------------------------------------------------- meshing (inside the venv)

def mesh_level(level, out):
    """The half-plane (x, r >= 0): inlet x = -FAR, far r = FAR, outlet x = NOSE + CYLINDER; the axis ahead of the tip,
    the cone, the cylinder to the outlet. Sizes near the wall as the bowshock base grid (0.05 radii, 0.02 at the
    shoulder), halved per level; the far field coarse."""
    import gmsh  # noqa: E402 (only in the venv)

    f = 2.0 ** (-level)
    gmsh.initialize()
    gmsh.option.setNumber('General.Terminal', 0)
    occ = gmsh.model.occ
    x_in, x_out = -FAR, NOSE + CYLINDER
    p = [occ.addPoint(x_in, 0, 0), occ.addPoint(0, 0, 0), occ.addPoint(NOSE, 1, 0), occ.addPoint(x_out, 1, 0),
         occ.addPoint(x_out, FAR, 0), occ.addPoint(x_in, FAR, 0)]
    axis = occ.addLine(p[0], p[1])
    cone = occ.addLine(p[1], p[2])
    cyl = occ.addLine(p[2], p[3])
    outlet = occ.addLine(p[3], p[4])
    top = occ.addLine(p[4], p[5])
    inlet = occ.addLine(p[5], p[0])
    face = occ.addPlaneSurface([occ.addCurveLoop([axis, cone, cyl, outlet, top, inlet])])
    occ.synchronize()
    gmsh.model.addPhysicalGroup(1, [axis], name='axis')
    gmsh.model.addPhysicalGroup(1, [cone, cyl], name='wall')
    gmsh.model.addPhysicalGroup(1, [inlet, top, outlet], name='far')
    gmsh.model.addPhysicalGroup(2, [face], name='fluid')
    fd = gmsh.model.mesh.field
    d_wall = fd.add('Distance')
    fd.setNumbers(d_wall, 'CurvesList', [cone, cyl])
    fd.setNumber(d_wall, 'Sampling', 400)
    t_wall = fd.add('Threshold')
    fd.setNumber(t_wall, 'InField', d_wall)
    fd.setNumber(t_wall, 'SizeMin', 0.05 * f)
    fd.setNumber(t_wall, 'SizeMax', 8.0 * f)
    fd.setNumber(t_wall, 'DistMin', 0.5)
    fd.setNumber(t_wall, 'DistMax', 60.0)
    d_sh = fd.add('Distance')
    fd.setNumbers(d_sh, 'PointsList', [p[2], p[1]])
    t_sh = fd.add('Threshold')
    fd.setNumber(t_sh, 'InField', d_sh)
    fd.setNumber(t_sh, 'SizeMin', 0.02 * f)
    fd.setNumber(t_sh, 'SizeMax', 8.0 * f)
    fd.setNumber(t_sh, 'DistMin', 0.3)
    fd.setNumber(t_sh, 'DistMax', 6.0)
    mn = fd.add('Min')
    fd.setNumbers(mn, 'FieldsList', [t_wall, t_sh])
    fd.setAsBackgroundMesh(mn)
    gmsh.option.setNumber('Mesh.MeshSizeExtendFromBoundary', 0)
    gmsh.option.setNumber('Mesh.MeshSizeFromPoints', 0)
    gmsh.option.setNumber('Mesh.MeshSizeFromCurvature', 0)
    gmsh.option.setNumber('Mesh.Algorithm', 6)
    gmsh.model.mesh.generate(2)
    gmsh.option.setNumber('Mesh.SaveAll', 0)
    out.mkdir(parents=True, exist_ok=True)
    gmsh.write(str(out / 'mesh.su2'))
    _, tags, _ = gmsh.model.mesh.getElements(2)
    meta = {'cells': int(sum(len(x) for x in tags)), 'nodes': len(gmsh.model.mesh.getNodes()[0]), 'level': level,
            'sizes': {'wall': 0.05 * f, 'shoulder': 0.02 * f, 'far': 8.0 * f}, 'domain': {'far': FAR, 'cylinder': CYLINDER}}
    gmsh.finalize()
    (out / 'mesh.json').write_text(json.dumps(meta, indent=2))
    return meta


# ----------------------------------------------------------------------------- SU2 settings

def freestream(mach):
    f = FREESTREAM
    a = math.sqrt(f['gamma'] * f['gas_constant'] * f['temperature'])
    rho = f['pressure'] / (f['gas_constant'] * f['temperature'])
    v = mach * a
    return {'p': f['pressure'], 't': f['temperature'], 'v': v, 'q': 0.5 * rho * v * v}


def write_config(mach, out):
    fs = freestream(mach)
    lines = {
        'SOLVER': 'EULER',
        'MATH_PROBLEM': 'DIRECT',
        'AXISYMMETRIC': 'YES',
        'RESTART_SOL': 'NO',
        'MACH_NUMBER': f'{mach}',
        'AOA': '0.0',
        'FREESTREAM_PRESSURE': f"{fs['p']}",
        'FREESTREAM_TEMPERATURE': f"{fs['t']}",
        'GAMMA_VALUE': f"{FREESTREAM['gamma']}",
        'GAS_CONSTANT': f"{FREESTREAM['gas_constant']}",
        'REF_DIMENSIONALIZATION': 'DIMENSIONAL',
        'REF_LENGTH': '1.0',
        'REF_AREA': '1.0',
        'MARKER_EULER': '( wall )',
        'MARKER_SYM': '( axis )',
        'MARKER_FAR': '( far )',
        'MARKER_MONITORING': '( wall )',
        'MARKER_PLOTTING': '( wall )',
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
        'ITER': f'{ITER}',
        'CONV_FIELD': 'DRAG',
        'CONV_CAUCHY_ELEMS': '500',
        'CONV_CAUCHY_EPS': '1e-9',
        'CONV_STARTITER': '1000',
        'MESH_FILENAME': 'mesh.su2',
        'MESH_FORMAT': 'SU2',
        'OUTPUT_FILES': '( RESTART_ASCII, SURFACE_CSV )',
        'HISTORY_OUTPUT': '( ITER, RMS_RES, AERO_COEFF )',
        'SCREEN_OUTPUT': '( INNER_ITER, RMS_DENSITY, DRAG )',
        'OUTPUT_WRT_FREQ': '1000',
        'CONV_FILENAME': 'history',
        'SURFACE_FILENAME': 'surface_flow',
        'RESTART_FILENAME': 'restart_flow.dat',
    }
    text = '% SU2 settings written by docs/research/nose-model-form/su2/su2_cone_cylinder.py (0014 10.7 (y), R5)\n'
    text += ''.join(f'{k}= {v}\n' for k, v in lines.items())
    (out / 'config.cfg').write_text(text)
    return fs


# ----------------------------------------------------------------------------- the quantities, from the wall pressure

def wall_pressure(csv_path, fs):
    """(x, r, Cp) on the wall from SU2's surface_flow.csv, sorted along x."""
    rows = csv_path.read_text().splitlines()
    head = [h.strip().strip('"') for h in rows[0].split(',')]
    ix = head.index('x')
    iy = head.index('y')
    ip = head.index('Pressure') if 'Pressure' in head else head.index('Pressure_Coefficient')
    use_cp = head[ip] == 'Pressure_Coefficient'
    pts = []
    for line in rows[1:]:
        if not line.strip():
            continue
        v = [float(s) for s in line.split(',')]
        cp = v[ip] if use_cp else (v[ip] - fs['p']) / fs['q']
        pts.append((v[ix], v[iy], cp))
    pts.sort()
    return pts


def nose_drag(pts):
    """Integral of Cp against r^2 over the cone (0 <= x <= NOSE), trapezoid between wall points, on the base area 1."""
    cone = [p for p in pts if -1e-9 <= p[0] <= NOSE + 1e-9]
    s = 0.0
    for a, b in zip(cone, cone[1:]):
        s += 0.5 * (a[2] + b[2]) * (b[1] ** 2 - a[1] ** 2)
    return s


def station_cp(pts):
    out = []
    for xl in STATIONS:
        x = xl * NOSE
        cone = [p for p in pts if -1e-9 <= p[0] <= NOSE + 1e-9]
        k = 0
        while k < len(cone) - 2 and cone[k + 1][0] < x:
            k += 1
        a, b = cone[k], cone[k + 1]
        out.append(a[2] + (b[2] - a[2]) * (x - a[0]) / (b[0] - a[0]))
    return out


def band_of(values):
    """0005's band from three levels coarse to fine: Richardson at the observed order capped at 2; the range if they oscillate."""
    c, m, f = values
    e21, e32 = m - f, c - m
    if e21 * e32 < 0:
        return {'kind': 'oscillatory', 'band': max(values) - min(values)}
    if abs(e21) < 1e-12 or abs(e32) <= abs(e21):
        # 0005: changes that do not shrink give no band.
        return {'kind': 'not-shrinking', 'band': None}
    p = min(2.0, math.log2(abs(e32 / e21)))
    return {'kind': 'monotone', 'order': p, 'band': 1.25 * abs(e21) / (2 ** p - 1)}


# ----------------------------------------------------------------------------- run and collect

def machine():
    return {'system': platform.platform(), 'processor': platform.processor() or platform.machine(),
            'cores': os.cpu_count(), 'python': platform.python_version()}


def converged_from_history(path, iters):
    """Whether SU2 stopped on its Cauchy criterion: the last inner iteration well short of ITER. None if unreadable."""
    if not path.exists():
        return None
    rows = path.read_text().splitlines()
    if len(rows) < 2:
        return None
    head = [h.strip().strip('"') for h in rows[0].split(',')]
    col = next((i for i, h in enumerate(head) if h in ('Inner_Iter', 'Iter', 'Time_Iter')), None)
    if col is None:
        return None
    last = int(float(rows[-1].split(',')[col]))
    return last < iters - 2


def run_level(mach, level, threads, base, results):
    tag = f'M{mach:.3f}'
    dest = results / tag / f'L{level}'
    if (dest / 'result.json').exists():
        print(f'{tag} L{level}: collected before, skipped')
        return json.loads((dest / 'result.json').read_text())
    work = base / tag / f'L{level}'
    work.mkdir(parents=True, exist_ok=True)
    if not (work / 'mesh.json').exists():
        print(f'{tag} L{level}: meshing')
        subprocess.run([str(venv_python()), '-I', str(Path(__file__).resolve()), 'mesh-one', str(level), str(work)], check=True)
    meta = json.loads((work / 'mesh.json').read_text())
    fs = write_config(mach, work)
    print(f"{tag} L{level}: {meta['cells']} cells, SU2 running")
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
    pts = wall_pressure(work / 'surface_flow.csv', fs) if (work / 'surface_flow.csv').exists() else []
    converged = converged_from_history(work / 'history.csv', ITER) if rc == 0 else False
    # A level that hit ITER, or whose convergence cannot be read, gives no value.
    usable = bool(pts) and converged is True
    result = {
        'mach': mach, 'level': level, 'returncode': rc, 'seconds': round(seconds, 1), 'cells': meta['cells'],
        'mesh_sha256': sha256(work / 'mesh.su2'), 'freestream': fs, 'converged': converged,
        'noseDrag': nose_drag(pts) if usable else None, 'stationCp': station_cp(pts) if usable else None,
        'install': json.loads((WORK / 'install.json').read_text()), 'machine': machine(),
        'note': 'noseDrag and stationCp are computed here from surface_flow.csv (Cp against r^2 over the cone, base area 1), not from SU2 force conventions',
    }
    (dest / 'result.json').write_text(json.dumps(result, indent=2))
    print(f'{tag} L{level}: return code {rc}, {seconds:.0f} s, converged {converged}, nose drag {result["noseDrag"]}')
    return result


def collect_rung(mach, levels, results):
    tag = f'M{mach:.3f}'
    drags = [lv['noseDrag'] for lv in levels]
    if any(d is None for d in drags) or len(drags) < LEVELS:
        out = {'mach': mach, 'code': f'SU2 {SU2_VERSION}, axisymmetric Euler', 'converged': False, 'drag': None, 'band': None,
               'levels': len(levels), 'drags': drags, 'note': 'a level did not converge or gave no wall pressure: no value'}
        (results / f'{tag}.json').write_text(json.dumps(out, indent=2))
        print(f'{tag}: a level did not converge: no value (recorded)')
        return
    band = band_of(drags)
    stations = []
    for j in range(len(STATIONS)):
        stations.append(band_of([lv['stationCp'][j] for lv in levels]))
    out = {
        'mach': mach, 'code': f'SU2 {SU2_VERSION}, axisymmetric Euler, HLLC, MUSCL, Venkatakrishnan limiter',
        'converged': True,
        'drag': drags[-1], 'band': band['band'], 'bandKind': band['kind'], 'levels': LEVELS, 'drags': drags,
        'cells': [lv['cells'] for lv in levels], 'stationCp': levels[-1]['stationCp'], 'stationBands': stations,
        'stations_x_over_l': STATIONS, 'domain': {'farRadii': FAR, 'cylinderCalibers': CYLINDER / 2},
        'install': levels[-1]['install'], 'machine': levels[-1]['machine'],
    }
    (results / f'{tag}.json').write_text(json.dumps(out, indent=2))
    print(f'{tag}: drag {drags[-1]:.6f}, band {band["band"]} ({band["kind"]})')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('step', choices=['all', 'install', 'smoke', 'mesh-one'])
    ap.add_argument('rest', nargs='*')
    ap.add_argument('--machs', default='')
    ap.add_argument('--threads', type=int, default=max(1, (os.cpu_count() or 2) - 1))
    a = ap.parse_args()
    if a.step == 'mesh-one':
        level, out = a.rest
        mesh_level(int(level), Path(out))
        return
    if a.step == 'install':
        print(json.dumps(install(), indent=2))
        return
    install()
    if a.step == 'smoke':
        # Unregistered: Mach 0.6, coarsest level, nothing committed. Its nose drag should be near zero (R1).
        run_level(0.6, 0, a.threads, WORK / 'runs-smoke', WORK / 'smoke-results')
        return
    machs = [float(m) for m in a.machs.split(',')] if a.machs else RUNGS
    for m in machs:
        if m not in RUNGS:
            raise SystemExit(f'Mach {m} is not a registered rung ({RUNGS})')
    RESULTS.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime('%Y-%m-%dT%H-%M-%S')
    (RESULTS / f'run-{stamp}.json').write_text(json.dumps({'started': stamp, 'machs': machs, 'machine': machine()}, indent=2))
    for m in machs:
        levels = [run_level(m, lv, a.threads, WORK / 'runs', RESULTS) for lv in range(LEVELS)]
        collect_rung(m, levels, RESULTS)
    (RESULTS / f'run-{stamp}.json').write_text(json.dumps({'started': stamp, 'finished': time.strftime('%Y-%m-%dT%H-%M-%S'),
                                                           'machs': machs, 'machine': machine()}, indent=2))


if __name__ == '__main__':
    main()
