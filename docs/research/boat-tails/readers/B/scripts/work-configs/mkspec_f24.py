import json, sys
B = sys.argv[1]
V = [447.3, 575.6, 704.3, 832.8, 960.9, 1089.3, 1217.9, 1346.8, 1475.4, 1603.7, 1732.4, 1860.2, 1990.4]
vl = [[u, float(i), i in (0, 2, 4, 6, 8, 10)] for i, u in enumerate(V)]
H = [402, 529, 656.7, 784, 908.8, 1037, 1169, 1294, 1423.7, 1552, 1679, 1806.5, 1934, 2063, 2192, 2318.6, 2447, 2575]
labs = {0.12, 0.08, 0.04, 0.0, -0.04, -0.08, -0.12, -0.16, -0.20}
hl = []
for i, v in enumerate(H):
    y = round(0.14 - 0.02 * i, 2)
    hl.append([v, y, y in labs])
spec = {"name": "e51_f24", "image": B + "/render/e51/p48-000.jpg", "page": 48, "thr": 150, "panels": {
  "main": {"hlines": hl, "vlines": vl, "uspan": [455, 1985], "vspan": [410, 2568], "nstrips": 24}}}
json.dump(spec, open(B + "/work/f24.json", "w"), indent=1)
