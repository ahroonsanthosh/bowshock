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
    "tn3548f6": dict(figure="NACA TN 3548 fig. 6", x="M", y="Cp_b",
                     conditions='caption: "Base pressure coefficient for slab wing, a body of revolution, and '
                                'limiting base pressure coefficient (vacuum) plotted against Mach number."; legend '
                                '"Outboard slit" (circle), "Inboard slit" (square)',
                     curves={}, notes={}, tri_note=""),
    "r3427f15": dict(figure="R&M 3427 fig. 15", x="spanwise_in", y="Cp_b",
                     conditions='caption: "Spanwise uniformity of base pressure."; abscissa "Spanwise distance '
                                'from centre-line, inches"; legend for M_inf = 0.8: pressure tappings (circle), '
                                'pitot traverse (cross)',
                     curves={}, notes={}, tri_note=""),
    "r3427f16a": dict(figure="R&M 3427 fig. 16a", x="y_over_h", y="Cp_b",
                      conditions='caption: "Variation of pressure across base."; panel a), alpha = 0',
                      curves={}, notes={}, tri_note=""),
    "r3427f16b": dict(figure="R&M 3427 fig. 16b", x="y_over_h", y="Cp_b",
                      conditions='caption: "Variation of pressure across base."; panel b), alpha = 2 deg; arrow '
                                 '"Upper surface" pointing to positive y/h',
                      curves={}, notes={}, tri_note=""),
    "a51j25f7": dict(figure="NACA RM A51J25 fig. 7 (below M' 1.5)", x="M_prime", y="pb_over_pprime",
                     conditions='"AIRFOILS / BASE PRESSURE VERSUS MACH NUMBER"; profiles, data sources and '
                                'planforms as in the legend (series column)',
                     curves={}, notes={}, tri_note="triangle centre = bounding-box centre",
                     band=dict(id="pard-band", series="Langley, PARD filled circles and the faired line, "
                                                      "merged into one band of ink",
                               err_x=0.017, err_y=0.0034,
                               hidden_top=[(772, 790, "upper edge hidden under delta-1 (masked): the true upper "
                                                      "edge is at or above this value"),
                                           (794, 814, "upper edge hidden under sq-2 and tri-2 (masked): the true "
                                                      "upper edge is at or above this value")])),
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
    # round 11: an optional 5th argument, a band_edges.py JSON (merged ink read as its upper and lower edges)
    if len(sys.argv) > 5:
        bm = m["band"]
        for r in json.load(open(sys.argv[5])):
            note = [r["kind"]] + [t for (lo, hi, t) in bm["hidden_top"] if lo <= r["x_px"] <= hi]
            for edge, xk, yk in (("upper", "x_top", "y_top"), ("lower", "x_bottom", "y_bottom")):
                rows.append({"figure": m["figure"], "item": "band %s edge" % edge, "id": bm["id"],
                             "series": bm["series"], "symbol": "", m["x"]: round(r[xk], 4),
                             m["x"] + "_err": bm["err_x"], m["y"]: round(r[yk], 4), m["y"] + "_err": bm["err_y"],
                             "centre_from": "outer edge of the ink (column %d, row %.1f)" % (
                                 r["x_px"], r["top_px" if edge == "upper" else "bottom_px"]),
                             "glyph_score": "", "conditions": m["conditions"],
                             "notes": "; ".join(note if edge == "upper" else [r["kind"]])})
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
