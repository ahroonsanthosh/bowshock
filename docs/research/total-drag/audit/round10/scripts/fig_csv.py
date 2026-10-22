"""Write one readings CSV from a figure's symbol and curve JSON files.

usage: python3 -I fig_csv.py KEY SYMS.json|none READS.json|none OUT.csv
KEY selects the figure's metadata below (names of the axes, conditions as
printed, curve descriptions, per-symbol notes).
"""
import csv
import json
import sys

META = {
    "f31b": dict(figure="R&M 3348 fig. 31b", x="M0_cos_phi", y="Ccf_sec2_phi",
                 conditions="caption: single-wedge profile at zero incidence; coefficients determined for front half "
                            "of 7 % thick double-wedge section",
                 curves={"phi0": "line drawn through the phi = 0 deg circles (legend: circle on a line)"},
                 notes={}, tri_note="triangle centre = bounding-box centre; centroid 2.7 px lower (-0.0002)"),
    "f32": dict(figure="R&M 3348 fig. 32", x="xi0", y="Ccf_tilde",
                conditions="caption: phi = 0 deg, transonic similarity form, single-wedge models; "
                           "xi0 = (M0^2 - 1)/[(gamma+1) M0^2 (t/c)]^(2/3), "
                           "C~cf = [(gamma+1) M0^2]^(1/3) Ccf/(t/c)^(5/3)",
                curves={"ref19_expt": "Two-dimensional Expt. (Ref. 19), solid; wedge with afterbody sketched beside "
                                      "it; merges with the C~cf = 0 gridline at its start (about xi0 -1.6), so the "
                                      "start given is where it leaves the gridline",
                        "ref30_theory": "Theory (Ref 30), dashed"},
                notes={"d-1": "nearest top-axis M0 tick 0.60 (tick at xi0 -4.141)",
                       "d-2": "nearest top-axis M0 tick 0.70 (-2.718)",
                       "d-3": "nearest top-axis M0 tick 0.80 (-1.595)",
                       "d-4": "nearest top-axis M0 tick 0.85 (-1.119; the circle is 4 px left of it)",
                       "d-5": "nearest top-axis M0 tick 0.90 (-0.719)",
                       "d-6": "nearest top-axis M0 tick 0.95 (-0.340; the circle is 3 px left of it)",
                       "d-7": "nearest top-axis M0 tick 1.00 (-0.001)",
                       "d-8": "nearest top-axis M0 tick 1.05 (0.326)",
                       "d-9": "between the top-axis ticks 1.10 (0.609) and 1.15 (0.860): M0 about 1.11"},
                tri_note=""),
    "r3427f13": dict(figure="R&M 3427 fig. 13 (upper set: base holes 5, 6, 7)", x="M_inf", y="Cp",
                     conditions='caption: "Pressures on basic model. (Zero incidence.)"; set labelled "Pressure '
                                'tappings on base"; "(The positions of the pressure tappings are given in Fig. 3)"',
                     curves={"hole6": "hole 6 (circle line; labelled 6)",
                             "hole5": "hole 5 (square line; labelled 5); the same line as hole 6 below M 0.6 "
                                      "and from about M 0.88 to 0.93",
                             "hole7": "hole 7 (triangle line; labelled 7)",
                             "supersonic": "single line through circles after the jump at M 0.977"},
                     notes={"h6-01": "only symbol at M 0.2 (no square or triangle)",
                            "h6-02": "no square at M 0.4", "h6-03": "no square at M 0.5",
                            "h6-04": "hole 5 line leaves the hole 6 line here; no square at M 0.6",
                            "h6-09": "hole 5 line (from h5-04) joins here; no square at M 0.90 or 0.91",
                            "h6-13": "highest point, on the top frame (Cp -0.901)",
                            "h6-14": "first point after the vertical jump line (M 0.977); circles only from here",
                            "h6-17": "last point"},
                     skip_kinds=("start", "end"),
                     extra=[dict(item="line", id="jump", series="vertical line at the end of the three base lines",
                                 x=0.977, x_err=0.002, y=-0.901, y_err=0.002,
                                 notes="top end, on the top frame, where the three lines meet"),
                            dict(item="line", id="jump", series="vertical line at the end of the three base lines",
                                 x=0.977, x_err=0.002, y=-0.830, y_err=0.003,
                                 notes="bottom end, on the top of circle h6-14")],
                     tri_note="triangle centre = bounding-box centre; its centroid is 2 px lower (Cp 0.002 less "
                              "negative)"),
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
