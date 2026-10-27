import json, sys
B = sys.argv[1]
U = [669, 785.9, 903.9, 1020.4, 1138.6, 1255, 1373, 1488, 1606.6, 1724, 1841, 1959, 2076, 2193.6, 2310, 2428]
vl = [[u, round(1.0 + 0.2 * i, 1), i % 5 == 0] for i, u in enumerate(U)]
V = [327.5, 445.1, 562.3, 680.8, 798.0, 915.2, 1033.4, 1150.6, 1269.2, 1386.3, 1504.8, 1621.7, 1739.5]
labs = [-0.24, -0.20, -0.16, -0.12, -0.08, -0.04, 0.0]
hl = [[v, round(-0.24 + 0.02 * i, 2), any(abs(round(-0.24 + 0.02 * i, 2) - l) < 1e-9 for l in labs)] for i, v in enumerate(V)]
spec = {"name": "t3819_f21", "image": B + "/render/tn3819/p52r.png", "page": 52, "thr": 150, "panels": {
 "main": {"hlines": hl, "vlines": vl, "uspan": [676, 2420], "vspan": [334, 1733], "nstrips": 24}}}
json.dump(spec, open(B + "/work/t21.json", "w"), indent=1)
