import json, sys, importlib.util, math
spec = importlib.util.spec_from_file_location('w6ref', sys.argv[1]); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
cases = [
 {"shape": "cone", "L": 3.0, "rn": 0.0, "Lcyl": 2.0, "mach": 2.0, "ni0": 48, "nj0": 24, "bi": 1.5, "bj": 2.5, "a": 0.05, "Rout": 5.0},
 {"shape": "ogive", "L": 5.0, "rn": 0.015, "Lcyl": 2.0, "mach": 1.3, "ni0": 48, "nj0": 24, "bi": 4.4, "bj": 2.5, "a": 0.05, "Rout": 10.0},
 {"shape": "vk", "L": 3.0, "rn": 0.075, "Lcyl": 2.0, "mach": 3.0, "ni0": 48, "nj0": 24, "bi": 3.5, "bj": 2.5, "a": 0.06, "Rout": 3.5},
]
for c in cases:
    for level in range(5):
        nose, x, r = m.grid(c, level)
        a, sk = m.quality(x, r)
        # Spacing along the wall at the tip, and the first cell's height there.
        ds0 = math.hypot(x[1,0]-x[0,0], r[1,0]-r[0,0]); dn0 = math.hypot(x[0,1]-x[0,0], r[0,1]-r[0,0])
        print(c['shape'], c['L'], c['rn'], c['mach'], 'level', level, x.shape, f'minArea {a:.2e} maxSkewCos {sk:.3f} tip ds {ds0:.2e} dn {dn0:.2e}')
