"""Write readings/cr149372_fig8a.csv from the symbol and curve JSON files.

usage: python3 -I cr8a_csv.py SYMS.json READS.json CALIB.json OUT.csv

Values come from the local grid (bilinear between the measured gridline
intersections). Because the grid is hand drawn with unequal spacing (212 to
229 px per 30 deg), the global affine fit of the same intersections is given
beside each value as an alternative (theta_affine_deg, Cp_affine). A curve
reading whose position lies within a symbol (where the drawn line is
hidden) is flagged. The curves start and end at their first
and last symbols (theta 0 and 180 deg), so no separate end points are given.
"""
import csv
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import curvelists  # noqa: E402

COND = ('caption: "Figure 8a. Circular cylinder pressure distributions; Mach number = 0.6 to 0.9."; '
        'legend: Reynolds no. .19x10^6 at each Mach number; diameter = 1.91 cm')
SERIES = {"circ": "Mach 0.6", "sq": "Mach 0.7", "tri": "Mach 0.8", "hex": "Mach 0.9"}
CURVE_TYPE = {"M0.6": "circ", "M0.7": "sq", "M0.8": "tri", "M0.9": "hex"}
EDGE = {"m6-01": "first point: centre 6 px right of the theta = 0 gridline",
        "m7-01": "first point: centre 4.5 px right of the theta = 0 gridline",
        "m8-01": "first point: centre 5.5 px right of the theta = 0 gridline",
        "m9-01": "first point: centre 6 px right of the theta = 0 gridline",
        "m6-28": "last point: centre 0.6 deg past the theta = 180 gridline",
        "m7-24": "last point: centre 1.0 deg past the theta = 180 gridline",
        "m8-21": "last point: centre on the theta = 180 gridline within 0.4 deg",
        "m9-22": "last point: centre 0.4 deg past the theta = 180 gridline"}
TRI = ("triangle centre = bounding-box centre of the glyph; the triangle's centroid is 5.3 px lower "
       "(Cp lower by 0.007)")


def main():
    symf, rdf, calf, out = sys.argv[1:5]
    syms = json.load(open(symf))
    cal = json.load(open(calf))["global"]
    ax, ay = cal["affine_x"], cal["affine_y"]
    mask_r = curvelists.FIGS["cr8a"]["mask_r"]

    def aff(x, y):
        return ax[0] + ax[1] * x + ax[2] * y, ay[0] + ay[1] * x + ay[2] * y

    rows = []
    for s in syms:
        x, y = s["centre_px"]
        ta, ca = aff(x, y)
        tc = s.get("type_check", {})
        note = [n for n in (EDGE.get(s["id"], ""), s.get("note", ""), TRI if s["type"] == "tri" else "") if n]
        rows.append({"figure": "NASA CR-149372 fig. 8a", "item": "symbol", "id": s["id"],
                     "series": SERIES[s["type"]], "symbol": s["type"], "theta_deg": round(s["x"], 2),
                     "theta_err_deg": round(s["err_x"], 2), "Cp": round(s["y"], 4), "Cp_err": round(s["err_y"], 4),
                     "theta_affine_deg": round(ta, 2), "Cp_affine": round(ca, 4),
                     "page_x": round(x, 1), "page_y": round(y, 1), "centre_from": s["centre_from"],
                     "centre_score": s["score"],
                     "type_check": " ".join("%s %.2f" % kv for kv in tc.items()),
                     "conditions": COND, "notes": "; ".join(note)})
    for r in json.load(open(rdf)):
        kind = r.get("kind", "at abscissa")
        if r.get("value") is None or kind != "at abscissa":
            continue
        ta, ca = aff(r["px"], r["py"])
        typ = CURVE_TYPE[r["curve"]]
        note = ""
        near = [s for s in syms if
                (s["centre_px"][0] - r["px"]) ** 2 + (s["centre_px"][1] - r["py"]) ** 2 <= mask_r[s["type"]] ** 2]
        if near:
            note = "inside symbol %s, where the drawn line is hidden: value interpolated across it" % near[0]["id"]
        rows.append({"figure": "NASA CR-149372 fig. 8a", "item": "curve", "id": r["curve"],
                     "series": "faired curve, %s" % SERIES[typ], "symbol": "",
                     "theta_deg": round(r["x"], 2), "theta_err_deg": "",
                     "Cp": round(r["value"], 4), "Cp_err": round(r["err"], 4),
                     "theta_affine_deg": round(ta, 2), "Cp_affine": round(ca, 4),
                     "page_x": round(r["px"], 1), "page_y": round(r["py"], 1),
                     "centre_from": "track fit",
                     "centre_score": "", "type_check": "", "conditions": COND, "notes": note})
    with open(out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        for r in rows:
            w.writerow(r)
    print(out, len(rows))


if __name__ == "__main__":
    main()
