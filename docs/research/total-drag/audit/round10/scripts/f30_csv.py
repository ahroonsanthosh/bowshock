"""Write readings/rm3348_fig30a.csv and rm3348_fig30b.csv.

usage: python3 -I f30_csv.py WORKDIR OUTDIR TABLE3.csv
WORKDIR holds f30a_sym.json, f30a_read.json, f30b_sym.json, f30b_read.json.
TABLE3.csv is the round 8 typing of table 3 (same report); the hole 4
(eta = 0.59), alpha = 0 values at the tabulated Mach numbers are put beside
the matching fig. 30a symbols as a check of the plot, not as part of the
reading.
"""
import csv
import json
import os
import sys

COND = "caption: single-wedge wing, eta = 0.59, alpha = 0 deg"
PHI = {"circ": 0, "cross": 15, "tri": 30, "plus": 45, "sq": 60}
NOTES = {
    "a30-9": "isolated triangle, on no drawn line",
    "a60-6": "square below the 60 deg curve, which passes it by",
    "b60-2": "drawn on the M_0 cos(phi) = 0.4 frame line; the phi = 60 deg point at M_0 0.70 (0.35) is not drawn",
    "b30-9": "counterpart of a30-9; its abscissa is 0.0075 above a30-9's M_0 times cos 30 deg",
}
TRI = ("triangle centre = bounding-box centre of the glyph; its centroid would be 2.7 px lower "
       "(+0.0023 in p_b/p_0)")


def table3(path):
    out = {}
    for r in csv.DictReader(open(path)):
        if r["hole"] == "4" and r["alpha_deg"] == "0":
            out[(int(r["phi_deg"]), float(r["M0"]))] = float(r["p_b_over_p0"])
    return out


def main():
    w, outdir, t3 = sys.argv[1:4]
    tab = table3(t3)
    for panel, xname in (("a", "M0"), ("b", "M0_cos_phi")):
        rows = []
        for s in json.load(open(os.path.join(w, "f30%s_sym.json" % panel))):
            note = [n for n in (NOTES.get(s["id"], ""), TRI if s["type"] == "tri" else "", s.get("note", "")) if n]
            check = ""
            if panel == "a" and s["type"] in PHI:
                for (phi, m), v in tab.items():
                    if phi == PHI[s["type"]] and abs(m - s["x"]) < 0.012:
                        check = "%.3f (M0 %.2f)" % (v, m)
            rows.append({"figure": "R&M 3348 fig. 30" + panel, "item": "symbol", "id": s["id"],
                         "series": s["series"], "symbol": s["type"], xname: round(s["x"], 4),
                         xname + "_err": round(s["err_x"], 4), "pb_p0": round(s["y"], 4),
                         "pb_p0_err": round(s["err_y"], 4), "centre_from": s["centre_from"],
                         "glyph_score": s["score"], "table3_hole4_alpha0": check,
                         "conditions": COND if s["type"] in PHI else "Goin, ref. 29: phi = 45 deg, aspect ratio 2.7",
                         "notes": "; ".join(note)})
        for r in json.load(open(os.path.join(w, "f30%s_read.json" % panel))):
            if r.get("value") is None:
                continue
            kind = r.get("kind", "at abscissa")
            name = r["curve"]
            series = ("present, phi = %s deg, faired curve" % name[3:]) if name.startswith("phi") else \
                "mean curve of Cleary and Stevens (ref. 28) for a biconvex aerofoil with blunt base (dashed)"
            rows.append({"figure": "R&M 3348 fig. 30" + panel, "item": "curve" if kind == "at abscissa" else
                         "curve " + kind, "id": name, "series": series, "symbol": "",
                         xname: round(r["x"], 4), xname + "_err": "" if kind == "at abscissa" else 0.004,
                         "pb_p0": round(r["value"], 4),
                         "pb_p0_err": round(r["err"], 4) if r.get("err") is not None else 0.004,
                         "centre_from": "track fit" if kind == "at abscissa" else "last or first tracked ink",
                         "glyph_score": "", "table3_hole4_alpha0": "", "conditions": COND if panel == "a" else "",
                         "notes": "" if kind == "at abscissa" else "where the drawn line ends (+-5 px)"})
        out = os.path.join(outdir, "rm3348_fig30%s.csv" % panel)
        with open(out, "w", newline="") as f:
            wr = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            wr.writeheader()
            for r in rows:
                wr.writerow(r)
        print(out, len(rows))


if __name__ == "__main__":
    main()
