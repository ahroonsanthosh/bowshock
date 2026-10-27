import json, sys
B = sys.argv[1]
def vl(u0, sp=88.35, labelled=True):
    return [[u0 + sp * i, 0.5 * i, labelled and (i % 2 == 0)] for i in range(13)]
def hl(v0, ytop, n, labs, sp=88.2):
    out = []
    for i in range(n):
        y = round(ytop + 0.02 * i, 2)
        out.append([v0 + sp * i, y, any(abs(y - l) < 1e-9 for l in labs)])
    return out
spec = {"name": "t3819_f19", "image": B + "/render/tn3819/p50-000.jpg", "page": 50, "thr": 150, "panels": {
 "a": {"hlines": hl(733.25, -0.20, 5, [-0.20, -0.16, -0.12]), "vlines": vl(613.75), "uspan": [620, 1668], "vspan": [738, 1080], "nstrips": 20},
 "b": {"hlines": hl(1270.9, -0.24, 7, [-0.24, -0.20, -0.16, -0.12]), "vlines": vl(627.4), "uspan": [634, 1682], "vspan": [1275, 1795], "nstrips": 20},
 "c": {"hlines": hl(2014.7, -0.28, 7, [-0.28, -0.24, -0.20, -0.16]), "vlines": vl(642.0), "uspan": [648, 1698], "vspan": [2018, 2538], "nstrips": 20}}}
json.dump(spec, open(B + "/work/t19.json", "w"), indent=1)
