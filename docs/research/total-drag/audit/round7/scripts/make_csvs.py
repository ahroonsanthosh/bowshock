"""Write the round-7 reading CSVs from the measurement JSON files.

usage: python3 -I make_csvs.py WORKDIR READINGS_DIR
WORKDIR holds tn_readings.json and rm31_sym.json, rm32_sym.json, rm33_sym.json.
All errors are reading errors of the drawn ink (about two standard
deviations), not uncertainties of the underlying experiments.
"""
import csv
import json
import os
import sys

TN_NOTES = {
    ("L", 1.0): "left border; extrapolated 0.010 in M from clean points at M 1.010 to 1.035; the curve starts "
                "inside a heavy vertical stroke on the border (P_B -0.188 to -0.182)",
    ("L", 1.1): "",
    ("L", 1.2): "on the M = 1.2 gridline; interpolated across it",
    ("L", 1.3): "L meets the P_B = -0.18 gridline at M 1.33; points right of M 1.305 overlap it and are not used",
    ("L", 1.4): "on the M = 1.4 gridline; interpolated across it",
    ("L", 1.5): "",
    ("L", 2.0): "on the M = 2.0 gridline; the stacked squares at M 1.9 cover L from M 1.90 to 1.97 (not used)",
    ("L", 2.5): "",
    ("L", 3.0): "on the M = 3.0 gridline; U joins L between M 2.97 and 3.0, so right of M 3.0 the ink is both "
                "curves superposed (heavy dashes); the Gabeaud curve passes 21 px (0.0035) above",
    ("U", 1.0): "left border; extrapolated 0.010 in M from clean points at M 1.010 to 1.033",
    ("U", 1.1): "",
    ("U", 1.2): "on the M = 1.2 gridline; interpolated across it",
    ("U", 1.3): "U turns dashed at M 1.31",
    ("U", 1.4): "U is dashed here; a dash ends on the M = 1.4 gridline and a faint dash (M 1.41 to 1.43) lies "
                "just above the P_B = -0.18 gridline; value from dashes on both sides",
    ("U", 1.5): "the Ref. 9 circle touches U from M 1.478 to 1.545 and U runs on the P_B = -0.18 gridline from "
                "M 1.43 to 1.47; interpolated across from M 1.47 and M 1.55 to 1.58",
    ("U", 2.0): "on the M = 2.0 gridline; U is dashed from about M 1.84 to 1.94",
    ("U", 2.5): "U is dashed from M 2.42 to 2.53 and crosses the P_B = -0.12 gridline here; interpolated "
                "between dashes at M 2.42 to 2.46 and 2.53 to 2.56",
    ("F", 1.05): "near the first peak",
    ("F", 1.1): "steep descending segment, crossing the P_B = -0.20 gridline at M 1.096; the leader arrowhead "
                "touches F at M 1.09 (points there not used)",
    ("F", 1.15): "near the trough",
    ("F", 1.2): "on the M = 1.2 gridline where F bends from rising to flat; 11 px gap interpolated",
    ("F", 1.25): "",
}
CURVE_NAME = {"L": "Love basic curve (lower, less negative compiled curve)",
              "U": "Chapman compilation (upper, more negative compiled curve)",
              "F": "free-flight curve (Langley, R = 30 to 35e6)"}
ERR_FLOOR = {("F", 1.2): 0.0004, ("F", 1.1): 0.0006, ("U", 1.4): 0.0005, ("U", 2.5): 0.0005}


def tn_rows(rd):
    rows = []
    for r in rd:
        c = r["curve"]
        if "label" in r:
            kind = "end point" if "end" in r["label"] else "extremum"
            rows.append(dict(curve=CURVE_NAME[c], kind=kind, M=round(r["M"], 4),
                             M_err=round(r.get("errM", 0.004 if kind == "extremum" else 0), 4),
                             P_B=round(r["value"], 4), P_B_err=round(max(r["err"], 0.0002), 4),
                             notes=r["label"] + ": " + r["note"]))
            continue
        mt = round(r["M"], 2)
        err = max(r["err"], ERR_FLOOR.get((c, mt), 0.0))
        rows.append(dict(curve=CURVE_NAME[c], kind="at M", M=mt, M_err=0.0, P_B=round(r["value"], 4),
                         P_B_err=round(err, 4), notes=TN_NOTES.get((c, mt), "")))
    rows.append(dict(curve=CURVE_NAME["U"], kind="at M", M=3.0, M_err=0.0, P_B=rows_value(rows, "L", 3.0),
                     P_B_err=0.0005, notes="U and L are superposed at M 3.0 (U joins L between M 2.97 and "
                                           "3.0); cannot be separated, value is that of the merged line"))
    rows.append(dict(curve=CURVE_NAME["F"], kind="not read", M=1.0, M_err=0.0, P_B="", P_B_err="",
                     notes="F does not reach M = 1.000 as a separate line: its dashed descent meets the border "
                           "at M 1.008, P_B -0.1875; a heavy vertical stroke on the border below it spans "
                           "P_B -0.188 to -0.182 and may or may not belong to F"))
    return rows


def rows_value(rows, curve, m):
    for r in rows:
        if r["curve"] == CURVE_NAME[curve] and r["M"] == m and r["kind"] == "at M":
            return r["P_B"]
    return ""


MACH = {31: 1.62, 32: 1.93, 33: 2.41}
STACKS = {
    "32-A (R 7.3)": "stack of the ogive triangle and two superposed square outlines; centres from P_B -0.1519 "
                    "(ogive, top) to -0.1494 (lower square outline, bottom); ink from -0.1565 to -0.1457; the "
                    "triangle is separable from its free apex; the two square outlines are separable from their "
                    "top and bottom sides but whether they are two conical points or one redrawn square cannot "
                    "be told",
    "32-B (R 8.0)": "square and triangle overlap; centres P_B -0.1517 (ogive, top) and -0.1506 (conical); ink "
                    "from -0.1562 to -0.1470; both separable (square sides all visible, triangle apex and base)",
    "32-C (R 9.0)": "square and triangle overlap; centres P_B -0.1508 (conical, top) and -0.1481 (ogive, "
                    "bottom); ink from -0.1544 to -0.1455; square separable, triangle apex hidden inside the "
                    "square (centroid from base and nominal height)",
    "33-A (R 8.2)": "triangle inside the square; centres P_B -0.1196 (ogive) and -0.1191 (conical), equal within "
                    "the reading error; ink from -0.1240 to -0.1156; separable from the free apex, the base line "
                    "inside the square and the square's sides",
}


def rm_rows(work):
    rows = []
    for fig in (31, 32, 33):
        for r in json.load(open(os.path.join(work, "rm%d_sym.json" % fig))):
            dot = r.get("dot_data")
            ce = r.get("centre_data")
            rows.append(dict(figure="%d(d)" % fig, M=MACH[fig], symbol_id=r["id"], shape=r["shape"],
                             nose=r["series"], id_confidence=r["conf"],
                             R_e6=round(r["value_data"][0], 3), R_err_e6=round(r["err_R"], 3),
                             P_B=round(r["value_data"][1], 4), P_B_err=round(r["err_P"], 4),
                             value_from=r["value_from"], outline_R_e6=round(ce[0], 3),
                             outline_P_B=round(ce[1], 4),
                             dot_R_e6=round(dot[0], 3) if dot else "", dot_P_B=round(dot[1], 4) if dot else "",
                             method=r["method"], stack=r.get("stack", ""), notes=r.get("note", "")))
    for name, txt in STACKS.items():
        fig = int(name[:2])
        rows.append(dict(figure="%d(d)" % fig, M=MACH[fig], symbol_id="stack " + name, shape="stack",
                         nose="", id_confidence="", R_e6="", R_err_e6="", P_B="", P_B_err="", value_from="",
                         outline_R_e6="", outline_P_B="", dot_R_e6="", dot_P_B="", method="", stack=name,
                         notes=txt))
    return rows


def write(path, rows):
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        for r in rows:
            w.writerow(r)
    print(path, len(rows), "rows")


def main():
    work, out = sys.argv[1:3]
    write(os.path.join(out, "tn3819_fig18.csv"), tn_rows(json.load(open(os.path.join(work, "tn_readings.json")))))
    write(os.path.join(out, "rml52j21a_figs31-33d.csv"), rm_rows(work))


if __name__ == "__main__":
    main()
