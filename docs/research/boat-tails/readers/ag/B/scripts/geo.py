"""Assemble geometry.csv from pipe-separated text files.

Usage: python -I geo.py OUT.csv IN1.txt [IN2.txt ...]
Each non-blank line not starting with # is
source | quantity | value | unit | page | note
"""
import csv
import sys


def main():
    out = sys.argv[1]
    rows = []
    for p in sys.argv[2:]:
        for ln in open(p, encoding="utf-8"):
            ln = ln.rstrip("\n")
            if not ln.strip() or ln.lstrip().startswith("#"):
                continue
            parts = [s.strip() for s in ln.split("|")]
            if len(parts) != 6:
                raise SystemExit("bad line in %s: %s" % (p, ln))
            rows.append(parts)
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["source", "quantity", "value", "unit", "page", "note"])
        w.writerows(rows)
    print(out, len(rows), "rows")


if __name__ == "__main__":
    main()
