"""Resolution study of the audit's area-rule fin drag (hayes_fin.py): ntheta,
nphi and nmodes scaled together by m, for the audit's eight cases at its four
Mach numbers. Run from this folder:
  python3 -I hayes_study.py 1 2 4 > hayes_study_124.jsonl"""
import importlib.util
import json
import math
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location(
    'hayes_fin', os.path.join(HERE, '..', 'total-drag', 'audit', 'scripts', 'hayes_fin.py'))
hf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hf)

tc = 0.05
dw = ([0.0, 0.5, 1.0], [0.0, tc / 2, 0.0])
cases = {
    'A': (3.38, 2.103, math.tan(math.radians(30)), 0.0, ([0, 0.536, 1], [0, tc / 2, 0])),
    'C': (1.0, 1.0, 0.5, 0.0, dw),
    'B': (1.0, 0.5, 1.0, 0.0, dw),
    'D': (1.0, 1.0, 0.0, 0.0, dw),
    'E': (1.0, 0.75, 1.0, 0.3, dw),
    'F': (0.75, 0.125, 3.0, 0.0, dw),
    'G': (1.0, 1.0, 0.75, 0.0, dw),
    'R02': (1.0, 0.2, 0.0, 0.0, dw),
}
ms = [int(a) for a in sys.argv[1:]] or [1, 2, 4]
for m in ms:
    for name, (cr, s, tl, tt, (f, g)) in cases.items():
        for M in (1.2, 1.5, 2.0, 3.0):
            t0 = time.time()
            cd3, cd2 = hf.wave_drag(cr, s, tl, tt, f, g, M,
                                    ntheta=96 * m, nphi=1200 * m, nmodes=400 * m)
            print(json.dumps({'m': m, 'case': name, 'mach': M, 'ratio': cd3 / cd2,
                              'seconds': round(time.time() - t0, 2)}), flush=True)
