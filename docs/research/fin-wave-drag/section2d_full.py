"""Full-precision exact double-wedge cd from the research's section2d.py and
the audit's dw_exact_indep.py, for tests/fins/section-drag.test.ts.
Run from this folder: python3 -I section2d_full.py > section2d_full.json"""
import contextlib
import importlib.util
import io
import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    with contextlib.redirect_stdout(io.StringIO()):
        spec.loader.exec_module(mod)
    return mod


s2d = load('section2d', os.path.join(HERE, '..', 'total-drag', 'scripts', 'section2d.py'))
ind = load('dw_exact_indep', os.path.join(HERE, '..', 'total-drag', 'audit', 'scripts', 'dw_exact_indep.py'))
rows = []
for tc in (0.03, 0.05, 0.08):
    for M in (1.2, 1.3, 1.5, 2.0, 2.5, 3.0):
        rows.append({'tc': tc, 'mach': M, 'section2d': s2d.cd_exact(M, tc), 'indep': ind.cd(M, tc),
                     'ackeret': 4 * tc * tc / math.sqrt(M * M - 1)})
print(json.dumps(rows, indent=1))
