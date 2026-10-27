import json, sys
B = sys.argv[1]
U = [514.6, 598.2, 682.7, 766.6, 851.5, 936, 1020.8, 1104.6, 1188.1, 1272.9, 1356.9, 1441.6, 1525.4, 1609.6, 1694.2, 1780.2, 1864.2, 1948.1, 2032.4]
vl = [[u, float(-16 + 2 * i), (-16 + 2 * i) % 4 == 0] for i, u in enumerate(U)]
V = [592.3, 676.6, 761.0, 846.3, 930.6, 1014.9, 1099.8, 1184.3, 1269.3, 1353.5, 1438.6, 1522.9, 1607.3]
labs = [-0.24, -0.20, -0.16, -0.12, -0.08, -0.04, 0.0]
hl = [[v, round(-0.24 + 0.02 * i, 2), any(abs(round(-0.24 + 0.02 * i, 2) - l) < 1e-9 for l in labs)] for i, v in enumerate(V)]
spec = {"name": "t3819_f23", "image": B + "/render/tn3819/p54r.png", "page": 54, "thr": 150, "panels": {
 "main": {"hlines": hl, "vlines": vl, "uspan": [522, 2026], "vspan": [598, 1600], "nstrips": 24}}}
json.dump(spec, open(B + "/work/t23.json", "w"), indent=1)
