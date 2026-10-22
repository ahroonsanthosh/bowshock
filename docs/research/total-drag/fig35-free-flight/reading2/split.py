"""Split the reading csv into one csv per curve, and copy the free-flight
values of commit 8c28afe (audit/round6/readings/tn3819_fig35.csv) with a
per-row note on nearby lines and the confidence in the line's identity.

Usage: python3 -I split.py <reading csv> <round 6 fig. 35 csv> <out dir>
"""
import csv
import os
import sys

FF_END = ("2.563", "-0.1317", "0.0004", "right-hand end of the line: last ink column x 3545 px; M err 0.002 (half a stroke)")


def near(m):
    m = float(m)
    if m < 1.5:
        return "alone (no other with-fins line drawn below M 1.5); identity certain"
    if m < 1.64:
        return "estimate B above (0.005 to 0.03 more negative) and A below; identity certain"
    if m <= 1.76:
        return "merged with estimate B within the line width (the knee); value shared; identity certain"
    if m < 2.0:
        return "B and A below it (less negative) by 0.005 to 0.02; identity certain by dash style"
    if m <= 2.25:
        return ("B and A within 0.002 to 0.005; it crosses A near M 2.15 to 2.25; identity by dash style, "
                "medium confidence")
    return "below A (less negative) by 0.004 to 0.006; identity certain by dash style (single short dash)"


def main():
    src, ff_src, out = sys.argv[1], sys.argv[2], sys.argv[3]
    rows = list(csv.DictReader(open(src)))
    groups = {"estimate A": "estimate_A.csv", "estimate B": "estimate_B.csv",
              "no-fin (body alone; fig. 18 curve)": "no_fin_curve.csv"}
    for ser, fn in groups.items():
        with open(os.path.join(out, fn), "w") as fh:
            fh.write("M,P_B,err,how\n")
            for r in rows:
                if r["series"] == ser and r["y"]:
                    fh.write(f"{r['x']},{r['y']},{r['err_y']},{r['how']}\n")
    ff = [r for r in csv.DictReader(open(ff_src)) if r["series"] == "free_flight" and r["y"]]
    with open(os.path.join(out, "free_flight_8c28afe.csv"), "w") as fh:
        fh.write("M,P_B,err,how,nearby lines and identity\n")
        for r in ff:
            fh.write(f"{r['x']},{r['y']},{r['err_y']},{r['how']},{near(r['x'])}\n")
        fh.write(",".join(FF_END) + "," + near(FF_END[0]) + "\n")


if __name__ == "__main__":
    main()
