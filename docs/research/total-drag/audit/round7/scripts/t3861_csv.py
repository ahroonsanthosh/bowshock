"""Write readings/tn3861_figs15-16.csv from the symbol and curve JSON files.

usage: python3 -I t3861_csv.py WORKDIR OUT.csv
WORKDIR holds t15_sym.json, t16_sym.json, t15_curves.json, t16_curves.json.
"""
import csv
import json
import math
import os
import sys

AXES = {
    15: ("crossflow Mach number M_c = M sin(alpha)",
         "(p_c - p_inf)/q_c for data (stagnation-point pressure on the cylinder over crossflow dynamic "
         "pressure) and (p_3 - p_inf)/q_c for theory (p_3 = stagnation pressure behind the normal shock of "
         "the crossflow component)"),
    16: ("crossflow Mach number M_c = M sin(alpha)",
         "Delta p/q_c = (p_c - p_inf)/q_c on the downstream side of the cylinder (base pressure over crossflow "
         "dynamic pressure)"),
}
# present data: M = 6.86, alpha from the legend of fig. 5 (pressure tests)
ALPHAS = [14.9, 30.2, 44.9, 60.4, 75.7, 90.0]
CURVES = {
    (15, "A"): ("faired curve: solid from M_c 1.0, dashed beyond about 2.0; dash pattern long-long-short as the "
                "legend's 'Oblique shock values'"),
    (15, "B"): ("heavy long-short-long line from M_c 7.0 to the right edge (9.0), on the P = 2.0 gridline; dash "
                "pattern as the legend's 'Newtonian flow, Grimminger's hypersonic approx., ref. 1'"),
    (16, "C"): "dashed curve, legend 'Delta p/q_c for zero pressure'",
}


def text_mc(series, mc):
    if series.startswith("present"):
        best = min(ALPHAS, key=lambda a: abs(6.86 * math.sin(math.radians(a)) - mc))
        return "M 6.86, alpha %.1f deg (fig. 5 legend): M sin(alpha) = %.3f" % (
            best, 6.86 * math.sin(math.radians(best)))
    if series.startswith("Lord"):
        return "M 4.04 at angle of attack (text p. 11: M_c 1.04 is alpha 15 deg)"
    if series.startswith("Gowen"):
        return "cylinder normal to the flow, M 1.49 to 2.9 (ref. 8), so M_c = M"
    if series.startswith("Walter"):
        return "cylinder normal to the flow, M 2.48 to 4.92 (ref. 9), so M_c = M"
    return ""


def main():
    w, out = sys.argv[1:3]
    rows = []
    for fig in (15, 16):
        for r in json.load(open(os.path.join(w, "t%d_sym.json" % fig))):
            rows.append(dict(figure=fig, item="symbol", id=r["id"], legend_series=r["series"],
                             symbol=r["shape"] + (" with cross" if r["crossed"] else ""),
                             Mc=round(r["value"][0], 3), Mc_err=round(r["err_x"], 3),
                             value=round(r["value"][1], 4), value_err=round(r["err_y"], 4),
                             value_from=r["value_from"], series_conditions=text_mc(r["series"], r["value"][0]),
                             notes=r["note"], x_axis=AXES[fig][0], y_axis=AXES[fig][1]))
        for r in json.load(open(os.path.join(w, "t%d_curves.json" % fig))):
            note = CURVES[(fig, r["curve"])]
            if r["kind"] != "at Mc":
                note += "; %s point of the drawn line" % r["kind"]
            if (fig, r["curve"], r["kind"]) == (15, "B", "end"):
                note += " (line runs into the plot frame at M_c 9.0; the end reading is disturbed by the frame)"
            rows.append(dict(figure=fig, item="curve " + r["curve"], id="%d-%s" % (fig, r["curve"]),
                             legend_series="", symbol="", Mc=round(r["Mc"], 3),
                             Mc_err=round(r.get("errM", 0.0), 3), value=round(r["P"], 4),
                             value_err=round(r["err"], 4), value_from="track fit" if r["kind"] == "at Mc"
                             else "line end", series_conditions="", notes=note, x_axis=AXES[fig][0],
                             y_axis=AXES[fig][1]))
    with open(out, "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        wr.writeheader()
        for r in rows:
            wr.writerow(r)
    print(out, len(rows))


if __name__ == "__main__":
    main()
