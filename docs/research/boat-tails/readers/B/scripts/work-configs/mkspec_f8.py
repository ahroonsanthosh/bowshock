import json, sys
B = sys.argv[1]
xv = [10.0 + 0.25*i for i in range(9)]
labx = {10.0, 10.5, 11.0, 11.5, 12.0}
def vl(us): return [[u, x, x in labx] for u, x in zip(us, xv)]
def hl(v0, n, ytop, labs, sp=94.6):
    out = []
    for i in range(n):
        y = round(ytop - 0.02*i, 2)
        out.append([v0 + sp*i, y, y in labs])
    return out
A_u = [402.0, 498.4, 593.3, 688.1, 782.8, 878.2, 973.0, 1067.8, 1162.4]
B_u = [1257, 1352, 1446.4, 1540.9, 1635.6, 1730.6, 1825.3, 1920.5, 2015.8]
C_u = [399.5, 496.4, 591.2, 686.4, 781.1, 876, 971.3, 1066, 1160.8]
spec = {"name": "e51_f8", "image": B + "/render/e51/p30-000.jpg", "page": 30, "thr": 150, "panels": {
 "a": {"hlines": hl(367.1, 13, 0.12, {0.04, 0.0, -0.04, -0.08, -0.12}), "vlines": vl(A_u), "uspan": [410, 1155], "vspan": [372, 1497], "nstrips": 16},
 "b": {"hlines": hl(363.5, 13, 0.12, {0.04, 0.0, -0.04, -0.08, -0.12}), "vlines": vl(B_u), "uspan": [1263, 2010], "vspan": [370, 1494], "nstrips": 16},
 "c": {"hlines": hl(1597.5, 11, 0.04, {0.04, 0.0, -0.04, -0.08, -0.12, -0.16}, 95.05), "vlines": vl(C_u), "uspan": [405, 1155], "vspan": [1602, 2543], "nstrips": 16}}}
json.dump(spec, open(B + "/work/f8.json", "w"), indent=1)
