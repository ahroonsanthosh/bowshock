"""Write one readings CSV from a figure's symbol and curve JSON files.

usage: python3 -I fig_csv.py KEY SYMS.json|none READS.json|none OUT.csv
KEY selects the figure's metadata below (names of the axes, conditions as
printed, curve descriptions, per-symbol notes).
"""
import csv
import json
import sys

META = {
    # round 11 entries only (round 10's are in round10/scripts/fig_csv.py)
    "r3427f39": dict(figure="R&M 3427 fig. 39", x="x_over_h", y="Cp",
                     conditions='caption: "Effect of base conditions on surface pressures upstream of base."; '
                                'M_inf = 0.8 (printed in the plot)',
                     curves={}, notes={}, tri_note=""),
    "r3427f13h4": dict(figure="R&M 3427 fig. 13 (lower set: surface hole 4 only)", x="M_inf", y="Cp",
                       conditions='caption: "Pressures on basic model. (Zero incidence.)"; set labelled "On surface '
                                  'upstream of base"; line labelled "x/h = -0.167" (4)',
                       curves={}, notes={}, tri_note=""),
}


def main():
    key, symf, rdf, out = sys.argv[1:5]
    m = META[key]
    rows = []
    if symf != "none":
        for s in json.load(open(symf)):
            note = [n for n in (m["notes"].get(s["id"], ""), m["tri_note"] if s["type"] == "tri" else "",
                                s.get("note", "")) if n]
            rows.append({"figure": m["figure"], "item": "symbol", "id": s["id"], "series": s["series"],
                         "symbol": s["type"], m["x"]: round(s["x"], 4), m["x"] + "_err": round(s["err_x"], 4),
                         m["y"]: round(s["y"], 5), m["y"] + "_err": round(s["err_y"], 5),
                         "centre_from": s["centre_from"], "glyph_score": s["score"], "conditions": m["conditions"],
                         "notes": "; ".join(note)})
    if rdf != "none":
        for r in json.load(open(rdf)):
            if r.get("value") is None:
                continue
            kind = r.get("kind", "at abscissa")
            if kind in m.get("skip_kinds", ()):
                continue
            if r.get("by") == "y":  # abscissa read at a fixed ordinate
                rows.append({"figure": m["figure"], "item": "curve (x at fixed y)", "id": r["curve"],
                             "series": m["curves"][r["curve"]], "symbol": "",
                             m["x"]: round(r["value"], 4), m["x"] + "_err": round(r["err"], 4),
                             m["y"]: round(r["x"], 5), m["y"] + "_err": "",
                             "centre_from": "track fit", "glyph_score": "", "conditions": m["conditions"],
                             "notes": ""})
                continue
            rows.append({"figure": m["figure"], "item": "curve" if kind == "at abscissa" else "curve " + kind,
                         "id": r["curve"], "series": m["curves"][r["curve"]], "symbol": "",
                         m["x"]: round(r["x"], 4), m["x"] + "_err": "" if kind == "at abscissa" else "5 px",
                         m["y"]: round(r["value"], 5),
                         m["y"] + "_err": round(r["err"], 5) if r.get("err") is not None else "5 px",
                         "centre_from": "track fit" if kind == "at abscissa" else "first or last tracked ink",
                         "glyph_score": "", "conditions": m["conditions"],
                         "notes": "" if kind == "at abscissa" else "where the tracked line ends"})
    for e in m.get("extra", []):
        rows.append({"figure": m["figure"], "item": e["item"], "id": e["id"], "series": e["series"], "symbol": "",
                     m["x"]: e["x"], m["x"] + "_err": e["x_err"], m["y"]: e["y"], m["y"] + "_err": e["y_err"],
                     "centre_from": "pixel map", "glyph_score": "", "conditions": m["conditions"],
                     "notes": e["notes"]})
    with open(out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        for r in rows:
            w.writerow(r)
    print(out, len(rows))


if __name__ == "__main__":
    main()
