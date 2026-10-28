"""TN 3861 figs. 15 and 16, both readings (0016 section 16: the first re-mapped through its affine
calibration, the second blind, read for 0016 section 16 and named in 0014 10.7 before), as section
16's script holds them, written to figs15-16.json for apply.test.ts. Run from the repository root:

    python3 -I docs/research/tn3861-fig17/rule/export_figs15_16.py
"""
import importlib.util
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, '..', '..', 'total-drag', 'scripts', 'w34_fin_edges.py')
spec = importlib.util.spec_from_file_location('w34_fin_edges', SCRIPT)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)  # defines the data; main() runs only as a script
rows = []
for f, name, _mach, mc, v, _err in m.TN3861:
    if f in ('15', '16'):
        rows.append({'figure': f, 'set': name, 'reading': 'first (re-mapped)', 'mc': mc, 'value': v})
for f, name, mc, v, _emc, _ev in m.TN3861_SECOND:
    rows.append({'figure': f, 'set': name, 'reading': 'second (blind)', 'mc': mc, 'value': v})
with open(os.path.join(HERE, 'figs15-16.json'), 'w') as fh:
    json.dump(rows, fh, indent=1)
    fh.write('\n')
print(len(rows), 'rows')
