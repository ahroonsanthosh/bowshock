import json, sys
B = sys.argv[1]
def vl(us): return [[u, round(1.0 + 0.5 * i, 1), i % 2 == 0] for i, u in enumerate(us)]
def hl(vs): return [[v, round(-0.24 + 0.04 * i, 2), True] for i, v in enumerate(vs)]
Ua = [684.8, 819, 955.5, 1091.8, 1227.8, 1364.3, 1500, 1635.8, 1771.8, 1907.9, 2043.3]
Ub = [679.6, 814.7, 950.6, 1087, 1223.2, 1359.7, 1494.7, 1631, 1767, 1903, 2039.9]
spec = {"name": "a52_f15", "image": B + "/render/a52/p44-000.jpg", "page": 44, "thr": 150, "panels": {
 "a": {"hlines": hl([328, 462, 598.4, 734.6, 870.6, 1006, 1141]), "vlines": vl(Ua), "uspan": [692, 2036], "vspan": [334, 1134], "nstrips": 20},
 "b": {"hlines": hl([1543.4, 1679.2, 1815, 1951.7, 2088.2, 2226, 2363.3]), "vlines": vl(Ub), "uspan": [688, 2032], "vspan": [1550, 2356], "nstrips": 20}}}
json.dump(spec, open(B + "/work/a15.json", "w"), indent=1)
