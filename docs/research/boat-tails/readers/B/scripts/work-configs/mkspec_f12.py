import json, sys
B = sys.argv[1]
U = [546.5, 648.9, 753.7, 856.9, 960.9, 1063.5, 1166.2, 1270.0, 1371.5, 1475.4, 1577.6, 1680.0, 1783.2]
vl = [[u, round(0.6 + 0.05 * i, 2), i % 2 == 0] for i, u in enumerate(U)]
V = [722.0, 824.6, 927.7, 1029.3, 1133.0, 1235.7, 1339.0, 1441.8, 1546.3, 1649.3, 1752.6, 1855.9, 1958.2]
hl = [[v, round(-0.32 + 0.04 * i, 2), i % 2 == 0] for i, v in enumerate(V)]
spec = {"name": "t3372_f12", "image": B + "/render/tn3372/p20-000.jpg", "page": 20, "thr": 150, "panels": {
 "main": {"hlines": hl, "vlines": vl, "uspan": [556, 1774], "vspan": [730, 1950], "nstrips": 24}}}
json.dump(spec, open(B + "/work/f12.json", "w"), indent=1)
