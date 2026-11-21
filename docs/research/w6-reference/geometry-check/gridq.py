"""Every cell's area and the largest corner skew of the tool's grids, on five levels, for three trial cases."""
import importlib.util, math, sys
spec = importlib.util.spec_from_file_location('w6ref', sys.argv[1]); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
cases = [
 {"shape": "cone", "L": 3.0, "rn": 0.0, "Lcyl": 2.0, "mach": 2.0, "ni0_up": 8, "ni0": 48, "nj0": 32, "bi_up": 3.0, "bi": 1.5, "bj": 2.5, "a": 0.5, "Rin": 0.6, "Rout": 4.5},
 {"shape": "ogive", "L": 5.0, "rn": 0.015, "Lcyl": 2.0, "mach": 1.3, "ni0": 64, "nj0": 32, "bi": 4.4, "bj": 2.5, "a": 0.05, "k": 1.3},
 {"shape": "vk", "L": 3.0, "rn": 0.075, "Lcyl": 2.0, "mach": 3.0, "ni0": 64, "nj0": 32, "bi": 3.5, "bj": 2.5, "a": 0.06, "k": 0.5},
]
for c in cases:
    for level in range(5):
        nose, x, r, marks = m.grid(c, level)
        a, sk = m.quality(x, r)
        print(c['shape'], c['L'], c['rn'], c['mach'], 'level', level, x.shape, f'minArea {a:.2e} maxSkewCos {sk:.3f}', {k: len(v) for k, v in marks.items()})
