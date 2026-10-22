"""Write readings/cr149372_fig8b.csv from cr_readings.json and cr_tracks.json.

usage: python3 -I cr_csv.py WORKDIR OUT.csv
For each triangle the faired line's Cp at the triangle's theta is also
given (median of the M1.2 track points, flagged or not, within 0.6 deg),
to show where the line passes relative to the symbol.
"""
import csv
import json
import os
import sys
import numpy as np


def main():
    w, out = sys.argv[1:3]
    rd = json.load(open(os.path.join(w, "cr_readings.json")))
    trk = json.load(open(os.path.join(w, "cr_tracks.json")))["M1.2"]
    T = np.array([p["theta"] for p in trk])
    C = np.array([p["Cp"] for p in trk])
    rows = []
    for r in rd:
        if r["kind"] == "curve":
            th = r["theta"]
            note = r.get("note", "")
            if 22 <= th <= 65 and not note:
                note = "three faired lines run close here; M1.2 is the right-most (largest theta at given Cp), " \
                       "35 to 70 px from the M1.1 line along a row (2.3 to 4.7 deg in theta at the same Cp) and more than 86 px (5.8 deg) from M1.0; the track never came within 22 px of another line"
            rows.append(dict(item="M 1.2 faired curve", theta_deg=round(th, 2), theta_err_deg=0.0,
                             Cp=round(r["Cp"], 4), Cp_err=round(r["err"], 4),
                             affine_map_theta_deg=round(r["affine_theta"], 2),
                             affine_map_Cp=round(r["affine_Cp"], 4), line_Cp_at_symbol="", notes=note))
        else:
            th = r["theta"]
            sel = np.abs(T - th) <= 0.6
            lc = float(np.median(C[sel])) if sel.any() else None
            note = "beyond 100 deg (read for completeness)" if th > 100.5 else ""
            if lc is not None and abs(lc - r["Cp"]) > 0.008:
                note = (note + "; " if note else "") + "faired line passes %.3f %s the centroid" % (
                    abs(lc - r["Cp"]), "above" if lc > r["Cp"] else "below")
            rows.append(dict(item="M 1.2 triangle (centroid)", theta_deg=round(th, 2),
                             theta_err_deg=round(r["err_theta"], 2), Cp=round(r["Cp"], 4), Cp_err=round(r["err"], 4),
                             affine_map_theta_deg=round(r["affine_theta"], 2),
                             affine_map_Cp=round(r["affine_Cp"], 4),
                             line_Cp_at_symbol=round(lc, 4) if lc is not None else "", notes=note))
    with open(out, "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        wr.writeheader()
        for r in rows:
            wr.writerow(r)
    print(out, len(rows))


if __name__ == "__main__":
    main()
