"""Concatenate per-panel CSVs (same header) into one.

usage: python3 -I concat_csv.py OUT.csv IN1.csv [IN2.csv ...]
"""
import csv
import sys

rows, keys = [], None
for p in sys.argv[2:]:
    with open(p, newline="") as f:
        r = csv.DictReader(f)
        keys = keys or r.fieldnames
        rows += list(r)
with open(sys.argv[1], "w", newline="") as f:
    w = csv.DictWriter(f, keys)
    w.writeheader()
    w.writerows(rows)
print(len(rows), "rows")
