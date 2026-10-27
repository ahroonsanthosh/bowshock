import json, sys
B = sys.argv[1]
U = [1679.7, 1765.7, 1851.5, 1936.9, 2020.8, 2106.8, 2192.2, 2278.2, 2363.3, 2448.9, 2534.0]
vl = [[u, float(2 * i), (2 * i) % 4 == 0] for i, u in enumerate(U)]
V = [639.3, 724.2, 810.7, 896.2, 982.3, 1067.9, 1154.3, 1239.9, 1326.0, 1411.4, 1496.4, 1582.9, 1668.5]
labs = [-0.16, -0.12, -0.08, -0.04, 0.0]
hl = [[v, round(-0.24 + 0.02 * i, 2), any(abs(round(-0.24 + 0.02 * i, 2) - l) < 1e-9 for l in labs)] for i, v in enumerate(V)]
spec = {"name": "t3819_f25b", "image": B + "/render/tn3819/p56r.png", "page": 56, "thr": 150, "panels": {
 "b": {"hlines": hl, "vlines": vl, "uspan": [1690, 2524], "vspan": [645, 1660], "nstrips": 20}}}
json.dump(spec, open(B + "/work/t25.json", "w"), indent=1)
