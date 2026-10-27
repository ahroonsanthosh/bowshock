import json, sys
B = sys.argv[1]
U = [571.4, 675.2, 779.6, 882.8, 984.8, 1088, 1189.8, 1292.6, 1395.9, 1498.4, 1601.5, 1704.6, 1807.5]
vl = [[u, round(0.6 + 0.05 * i, 2), i % 2 == 0] for i, u in enumerate(U)]
V = [356.2, 458.9, 562.7, 665.0, 769.2, 872.3, 971.0]
hl = [[v, round(-0.08 + 0.04 * i, 2), i % 2 == 0] for i, v in enumerate(V)]
spec = {"name": "t3372_f10", "image": B + "/render/tn3372/p19-000.jpg", "page": 19, "thr": 150, "panels": {
 "main": {"hlines": hl, "vlines": vl, "uspan": [578, 1800], "vspan": [362, 965], "nstrips": 24}}}
json.dump(spec, open(B + "/work/f10.json", "w"), indent=1)
