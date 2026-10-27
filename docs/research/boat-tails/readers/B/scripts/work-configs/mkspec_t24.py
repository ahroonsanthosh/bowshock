import json, sys
B = sys.argv[1]
def vl(us): return [[u, float(i), i % 2 == 0] for i, u in enumerate(us)]
def hl(vs): 
    labs = [-0.16, -0.12, -0.08, -0.04, 0.0]
    return [[v, round(-0.16 + 0.02 * i, 2), any(abs(round(-0.16 + 0.02 * i, 2) - l) < 1e-9 for l in labs)] for i, v in enumerate(vs)]
Ua = [446, 545, 644.5, 742.5, 841, 939.5, 1040.3, 1137.8, 1236, 1334.4, 1433.2]
Ub = [1630.3, 1728.8, 1828, 1927, 2026.7, 2124.6, 2222, 2321, 2420.4, 2518.4, 2616.8]
Va = [756, 855.5, 954.7, 1053.3, 1153, 1252, 1351.4, 1450, 1549]
Vb = [760.7, 859.1, 958.2, 1056.7, 1156.6, 1255.5, 1354.9, 1453.6, 1552.5]
spec = {"name": "t3819_f24", "image": B + "/render/tn3819/p55r.png", "page": 55, "thr": 150, "panels": {
 "a": {"hlines": hl(Va), "vlines": vl(Ua), "uspan": [452, 1427], "vspan": [762, 1543], "nstrips": 20},
 "b": {"hlines": hl(Vb), "vlines": vl(Ub), "uspan": [1636, 2611], "vspan": [766, 1546], "nstrips": 20}}}
json.dump(spec, open(B + "/work/t24.json", "w"), indent=1)
