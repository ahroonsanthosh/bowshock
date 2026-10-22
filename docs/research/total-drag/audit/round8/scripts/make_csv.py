"""Write the round 8 CSVs of R&M 3348 tables 2(b) and 3 from the typed text.

usage: python3 -I make_csv.py TYPED.txt GLYPHCHECK.json OUTDIR

TYPED.txt is the typing (readings/rm3348_table3_typed.txt): one block per
sub-table, "sub pdf_page M0 phi alphas" then rows "hole v1 v2 ...".
GLYPHCHECK.json is glyphcheck.py's output; its unchecked cells (values the
segmentation could not isolate) were looked at on a 3x contact sheet and
are noted as such.
"""
import csv
import json
import os
import sys

# Table 2(b), PDF p. 32 (printed p. 31): hole, eta_b as printed (subscript 5 = half
# unit in the last place), value
TABLE2B = [(1, "0·10", 0.10), (2, "0·26", 0.26), (3, "0·42 with subscript 5", 0.425),
           (4, "0·59", 0.59), (5, "0·75", 0.75), (6, "0·91 with subscript 5", 0.915)]
ETA_A = {"6": "0·91 with subscript 5", "5": "0·75", "4": "0·59", "3": "0·42 with subscript 5", "2": "0·26",
         "1": "0·10"}
# sub-tables that print column headings; the others are typed under the nearest headed one above them
HEADED = {"a", "f", "g", "k", "p", "u", "z"}
SPECK = "scan speck next to the value (dust); read on a 3x crop: certain"


def main():
    typed, chk, outdir = sys.argv[1:4]
    unchecked = {(u["sub"], u["hole"], u["col"]) for u in json.load(open(chk))["unchecked"]}
    blocks = []
    for line in open(typed):
        if line.startswith("#") or not line.strip():
            continue
        f = line.split()
        if f[0].isalpha():
            blocks.append(dict(sub=f[0], page=int(f[1]), M=f[2], phi=f[3], alphas=f[4].split(","), rows=[]))
        else:
            blocks[-1]["rows"].append((f[0], f[1:]))
    rows = []
    for b in blocks:
        ncol = len(b["alphas"])
        blank = "6,8" if ncol == 3 and b["sub"] != "f" else ("8" if ncol == 4 else "")
        for hole, vals in b["rows"]:
            for k, (a, v) in enumerate(zip(b["alphas"], vals)):
                note = []
                if b["sub"] not in HEADED:
                    note.append("no column headings printed in this sub-table; incidence from the column position "
                                "under the nearest headed sub-table above it on the same page")
                if blank:
                    note.append("columns for alpha %s deg printed empty" % blank)
                if b["sub"] == "f":
                    note.append("this sub-table's own headings: alpha = 0, 2, 3 deg")
                if (b["sub"], hole, k) in unchecked:
                    note.append(SPECK)
                rows.append(dict(table="3", sub_table=b["sub"], pdf_page=b["page"], printed_page=b["page"] - 1,
                                 M0=b["M"], phi_deg=b["phi"], alpha_deg=a, hole=int(hole),
                                 eta_printed=ETA_A[hole] if b["sub"] == "a" else "",
                                 p_b_over_p0=v, legibility="certain", note="; ".join(note)))
    with open(os.path.join(outdir, "rm3348_table3.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        for r in rows:
            w.writerow(r)
    with open(os.path.join(outdir, "rm3348_table2b.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["table", "pdf_page", "printed_page", "hole", "eta_b_printed", "eta_b", "legibility"])
        for h, p, v in TABLE2B:
            w.writerow(["2(b)", 32, 31, h, p, v, "certain"])
    print(len(rows), "table 3 values;", len(TABLE2B), "table 2(b) rows;", sum(1 for r in rows if SPECK in r["note"]),
          "speck notes")


if __name__ == "__main__":
    main()
