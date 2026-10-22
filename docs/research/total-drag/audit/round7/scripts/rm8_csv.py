"""Write readings/rml52j21a_fig8_lr.csv from rm8_sym.json.

usage: python3 -I rm8_csv.py rm8_sym.json OUT.csv
"""
import csv
import json
import sys


def main():
    src, out = sys.argv[1:3]
    js = json.load(open(src))
    rows = []
    for r in js["symbols"]:
        rows.append(dict(
            figure="RM L52J21a fig. 8, lower right panel (finned body, R = 8.06e6)", id=r["id"],
            base=r["base"], mach_group=r["group"], symbol=r["symbol"], nose=r["nose"],
            call_confidence=r["confidence"], M=round(r["M"], 4), M_err=round(r["err_M"], 4),
            P_B=round(r["P_B"], 4), P_B_err=round(r["err_P_B"], 4),
            centre_x_px=r["centre_px"][0], centre_y_px=r["centre_px"][1], centre_err_px=r["centre_err_px"],
            centre_from=r["centre_from"], shape_features=r["features"],
            support_circle=r["support"]["circle"], support_square=r["support"]["square"],
            support_diamond=r["support"]["diamond"], keys_circle=r["keypoints"]["circle"],
            keys_square=r["keypoints"]["square"], keys_diamond=r["keypoints"]["diamond"]))
    for s in js["stacks"]:
        rows.append(dict(
            figure="RM L52J21a fig. 8, lower right panel (finned body, R = 8.06e6)", id="stack",
            base=s["stack"].split(",")[0], mach_group=s["stack"].split(", ")[1], symbol="stack ink extent",
            nose="", call_confidence="", M="", M_err="", P_B=round(s["P_B_top_edge"], 4), P_B_err=0.0004,
            centre_x_px=s["x_px"], centre_y_px="%g to %g" % (s["top_px"], s["bottom_px"]), centre_err_px=2,
            centre_from="outer ink edges of the stack", shape_features="top edge P_B %.4f, bottom edge P_B %.4f" % (
                s["P_B_top_edge"], s["P_B_bottom_edge"]),
            support_circle="", support_square="", support_diamond="", keys_circle="", keys_square="",
            keys_diamond=""))
    with open(out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        for r in rows:
            w.writerow(r)
    print(out, len(rows))


if __name__ == "__main__":
    main()
