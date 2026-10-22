"""Write readings/brl934_graph1.csv from brl_sym.json (transcription only).

usage: python3 -I brl_csv.py brl_sym.json OUT.csv
"""
import csv
import json
import sys

GROUPS = {
    "A": "M about 0.975: one vertical line runs from C_D 0.90 (A1) through A2 down to A4. The dark marks just left "
         "of it (M 0.955 to 0.965, C_D 0.79 to 0.84) are read as the lower end of the faired curve (broken "
         "strokes), not as symbols; a symbol hidden in them cannot be excluded.",
    "B": "Peak of the faired curve: plus-like marks on or beside the curve, not joined by lines.",
    "C": "On the descending faired curve: C1 above C2.",
    "D": "One vertical line joins D1, D2 and D3.",
    "E": "A vertical line runs from E1 down to E2b (beside the M 1.40 ruling); E2a sits just left of E2b.",
    "F": "A vertical line joins F1 and F2.",
    "G": "Alone, on the faired curve.",
    "H": "A vertical line joins H1 and H2.",
    "I": "I1 alone at M 2.03; I2 and I3 joined by a vertical line along the M 2.05 ruling.",
    "J": "J1 stands on J2 (vertical stroke).",
    "K": "Alone, just right of the end of the faired curve.",
}


def main():
    src, out = sys.argv[1:3]
    rows = []
    for r in json.load(open(src)):
        sc = r["template_scores"]
        rows.append(dict(
            graph="BRL 934 Graph I", id=r["id"], group=r["group"], symbol=r["symbol"],
            legend_text=r["legend_text"], M=round(r["M"], 4), M_err=round(r["err_M"], 4),
            CD=round(r["CD"], 4), CD_err=round(r["err_CD"], 4), call_confidence=r["confidence"],
            centre_x_px=r["centre_px"][0], centre_y_px=r["centre_px"][1],
            centre_err_px="%g,%g" % tuple(r["centre_err_px"]),
            value_from="midpoint of the mark's outer extents read from the pixel map",
            shape_features=r["features"],
            score_crossed_circle=sc["crossed circle"], score_plus=sc["plus"], score_dot=sc["dot"],
            score_open_circle=sc["open circle"], best_template=r["best_template"],
            group_note=GROUPS[r["group"]],
            axes="x: M (Mach number); y: C_D (drag coefficient); rulings every 0.05 in M and 0.025 in C_D"))
    with open(out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        for r in rows:
            w.writerow(r)
    print(out, len(rows))


if __name__ == "__main__":
    main()
