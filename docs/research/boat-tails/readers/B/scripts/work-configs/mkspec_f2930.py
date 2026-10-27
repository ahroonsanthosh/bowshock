import json, sys
B = sys.argv[1]
def hl(vs, ytop, labs, step=0.01):
    out = []
    for i, v in enumerate(vs):
        y = round(ytop - step * i, 3)
        out.append([v, y, any(abs(y - l) < 1e-9 for l in labs)])
    return out
# fig 29
u29 = [373.1 + 104.3 * i for i in range(16)]
vl29 = [[u, float(i), i in (0, 2, 4, 6, 8, 10)] for i, u in enumerate(u29)]
f29 = {"name": "e51_f29", "image": B + "/render/e51/p56-000.jpg", "page": 56, "thr": 150, "panels": {
 "a": {"hlines": hl([364, 470, 573, 677, 780, 883], 0.05, [0.0, 0.02, 0.04]), "vlines": vl29, "uspan": [385, 1935], "vspan": [368, 880], "nstrips": 20},
 "b": {"hlines": hl([987, 1090.5, 1194, 1300, 1403.6, 1507, 1611, 1715, 1819], 0.10, [0.02, 0.04, 0.06, 0.08, 0.10]), "vlines": vl29, "uspan": [385, 1935], "vspan": [992, 1815], "nstrips": 20},
 "c": {"hlines": hl([1922, 2026, 2132, 2237, 2340.5, 2443.6, 2548], 0.11, [0.05, 0.07, 0.09, 0.11]), "vlines": vl29, "uspan": [385, 1935], "vspan": [1926, 2544], "nstrips": 20}}}
json.dump(f29, open(B + "/work/f29.json", "w"), indent=1)
u30 = [520.9 + 87.7 * i for i in range(18)]
vl30 = [[u, float(i), i in (0, 2, 4, 6, 8, 10)] for i, u in enumerate(u30)]
f30 = {"name": "e51_f30", "image": B + "/render/e51/p57-000.jpg", "page": 57, "thr": 150, "panels": {
 "a": {"hlines": hl([347.2, 435.3, 523, 609.8, 697.5, 785, 871.7, 958.5, 1046.2, 1133], 0.09, [0.0, 0.02, 0.04, 0.06, 0.08]), "vlines": vl30, "uspan": [528, 2000], "vspan": [352, 1128], "nstrips": 20},
 "b": {"hlines": hl([1219.7, 1307.75, 1395, 1482.9, 1570.9, 1657.5, 1743.2], 0.09, [0.03, 0.05, 0.07, 0.09]), "vlines": vl30, "uspan": [528, 2000], "vspan": [1224, 1739], "nstrips": 20},
 "c": {"hlines": hl([1830.6, 1917.5, 2004.5, 2092, 2178.9, 2265.3, 2352.9, 2440.7, 2528.5], 0.12, [0.04, 0.06, 0.08, 0.10, 0.12]), "vlines": vl30, "uspan": [528, 2000], "vspan": [1835, 2524], "nstrips": 20}}}
json.dump(f30, open(B + "/work/f30.json", "w"), indent=1)
