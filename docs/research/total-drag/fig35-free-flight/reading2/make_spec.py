"""Write the reading spec for TN 3819 fig. 35's estimates A and B and the
no-fin (body-alone, fig. 18) curve: paths of page points (600 dpi render of
NTRS 19930084517 p. 66) linked by hand from column-run listings
(`audit/round6/scripts/runs.py`) and the dash-style identification in
`audit/round6/readings/method_tn3819_figs32-35.md`; each point's page x is
turned into M by the figure's own gridline calibration.

Usage (from audit/round6/scripts): python3 -I make_spec.py <out.json>
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "audit", "round6", "scripts"))
from fig import from_spec  # noqa: E402

BASE = {"figure": "TN 3819 fig. 35", "ntrs": "19930084517", "page": 66,
        "box": [1040, 640, 4920, 3580], "thr": 0.7,
        "xsel": "all", "xvals": [round(1.0 + 0.1 * i, 1) for i in range(25)],
        "ysel": "all", "yvals": [round(-0.36 + 0.02 * i, 2) for i in range(19)]}

# estimate B: labelled start at M 1.52 (top), down to the knee where it runs
# with the free-flight line, then between the free-flight line and A to
# M 2.03, above both from about M 2.2 (regular dashes) to its end at M 3.0
B = [(1884, 1170), (1950, 1296), (2000, 1357), (2050, 1401), (2100, 1434), (2175, 1462), (2225, 1516),
     (2250, 1561), (2300, 1641), (2325, 1680), (2350, 1728), (2400, 1782), (2450, 1846), (2475, 1874),
     (2525, 1926), (2550, 1954), (2600, 1998), (2650, 2041), (2700, 2081), (2775, 2130), (2900, 2189),
     (3025, 2257), (3100, 2278), (3380, 2350), (3480, 2375), (3650, 2415), (3750, 2440), (3850, 2462),
     (3950, 2483), (4050, 2505), (4200, 2537), (4245, 2546)]
# estimate A: labelled start at M 1.51 (below the free-flight line), down
# through the bunch below the free-flight line to M 2.2, then (the
# free-flight line crossing below it) the middle line to its end at M 3.0
A = [(1880, 1508), (1900, 1518), (1950, 1542), (2000, 1564), (2050, 1586), (2100, 1604), (2150, 1624),
     (2200, 1645), (2225, 1660), (2250, 1685), (2275, 1720), (2300, 1760), (2325, 1791), (2350, 1818),
     (2375, 1844), (2400, 1872), (2475, 1940), (2500, 1958), (2525, 1980), (2550, 2000), (2575, 2020),
     (2600, 2038), (2625, 2056), (2650, 2074), (2675, 2090), (2700, 2106), (2800, 2159), (2900, 2212),
     (3025, 2277), (3100, 2310), (3150, 2332), (3200, 2353), (3250, 2372), (3300, 2390), (3350, 2406),
     (3380, 2416), (3480, 2444), (3650, 2492), (3750, 2516), (3850, 2539), (3950, 2559), (4050, 2581),
     (4200, 2614), (4245, 2622)]


def main():
    f = from_spec(dict(BASE))
    bx = BASE["box"]

    def path(P):
        return [[round(float(f.data(x - bx[0], y - bx[1])[0]), 4), y] for x, y in P]

    xs = [round(1.5 + 0.1 * i, 1) for i in range(16)]
    spec = dict(BASE)
    spec["guided"] = [
        {"series": "estimate B", "path": path(B), "xs": xs, "halfwin": 7, "max_run": 30, "bridge": 40,
         "extra": [[1.65, 1.8, 0.003], [1.9, 2.3, 0.003]]},
        {"series": "estimate A", "path": path(A), "xs": xs, "halfwin": 7, "max_run": 30, "bridge": 40,
         "extra": [[2.0, 2.3, 0.003]]}]
    spec["curves"] = [{"name": "no-fin (body alone; fig. 18 curve)",
                       "segs": [{"seed": [3650, 2672], "lo": 1084, "hi": 4880}],
                       "at": [round(1.0 + 0.1 * i, 1) for i in range(23)]}]
    spec["scale"] = 0.3
    json.dump(spec, open(sys.argv[1], "w"), indent=1)
    print("B M range", path(B)[0][0], path(B)[-1][0], "A M range", path(A)[0][0], path(A)[-1][0])


if __name__ == "__main__":
    main()
