"""W1's second readings: the round-6 blind readings (docs/research/total-drag/audit/round6/readings/, made on
another branch) restated in the columns of data/fins_at_base_w1.csv, for the figures W1 uses.

Usage: python3 -I round6_second.py <round-6 readings dir> <output csv>

Nothing is re-read or adjusted: each value and its error are the round-6 file's. What is selected:
TN 2360 fig. 6, the symbols at x/c 0 to 1.0 (W1 uses no station behind the base), each placed at the nearest
station of 0.2; TN 3819 fig. 33's eight symbols; fig. 34's eight symbols; fig. 35's free-flight line and its six
tunnel symbols; RM L52E06 fig. 7's four curves at M 1.05 to 1.10 (the window of W1's first reading, M 1.06 to
1.10, and the read Mach number just below it, for the comparison)."""
import csv
import os
import sys

src, out = sys.argv[1], sys.argv[2]


def rows(name):
    with open(os.path.join(src, name), newline="") as f:
        return [r for r in csv.DictReader(f)]


def short(how):
    keep = [p.strip() for p in how.split(";") if any(k in p for k in ("LOW MARGIN", "legend-glyph", "overlap", "stacked", "frame", "gridline", "behind", "third", "extra", "flag"))]
    return "; ".join(keep)


lines = []
add = lambda *v: lines.append(list(v))

for name, fig, kind, mach in (
    ("tn2360_fig6a_plane.csv", "6(a)", "plane", "1.5"),
    ("tn2360_fig6a_cruciform.csv", "6(a)", "cruciform", "1.5"),
    ("tn2360_fig6b_plane.csv", "6(b)", "plane", "2.0"),
    ("tn2360_fig6b_cruciform.csv", "6(b)", "cruciform", "2.0"),
):
    for r in rows(name):
        x = float(r["x"])
        if x < -0.01 or x > 1.01:
            continue
        station = round(x / 0.2) * 0.2
        tc = "0.10" if "0.10" in r["series"] else "0.05"
        note = f"read at x/c {x:.4f}" + (f"; {short(r['how'])}" if short(r["how"]) else "")
        add("TN 2360", fig, f"{kind} t/c {tc}", mach, f"{station:.1f}", r["y"], "dPb", r["err_y"], note)

names33 = {"M1.50_circle": ("ref. 26 circle", "1.50"), "M2.00_square": ("ref. 26 square", "2.00"), "M2.41_diamond": ("Langley 9 in diamond", "2.41")}
for r in rows("tn3819_fig33.csv"):
    for key, (series, mach) in names33.items():
        if r["series"].startswith(key):
            tc = r["series"].split("_tc")[1]
            add("TN 3819", "33", series, mach, tc, r["y"], "PB", r["err_y"], f"read at t/c {float(r['x']):.3f}%" + (f"; {short(r['how'])}" if short(r["how"]) else ""))

for r in rows("tn3819_fig34.csv"):
    if "_curve" in r["series"]:
        continue
    series = "RM-10 with fins" if r["series"].startswith("with_fins") else "RM-10 without fins"
    m = float(r["x"])
    add("TN 3819", "34", series, f"{m:.3f}", f"{m:.3f}", r["y"], "PB", r["err_y"], "")

for r in rows("tn3819_fig35.csv"):
    s = r["series"]
    if s == "free_flight":
        m = float(r["x"])
        add("TN 3819", "35", "free-flight line (ref. 12)", f"{m:.2f}", f"{m:.2f}", r["y"], "PB", r["err_y"], "blind; " + r["how"])
    elif "circle" in s or "square" in s or "diamond" in s:
        m = float(r["x"])
        nominal = "1.50" if m < 1.75 else "2.00" if m < 2.2 else "2.41"
        src_name = "ref. 26" if "ref26" in s else "Langley 9 in"
        which = "with fins" if "with_fins" in s else "without fins"
        add("TN 3819", "35", f"tunnel {src_name} {which}", nominal, f"{m:.4f}", r["y"], "PB", r["err_y"], "")

series7 = {
    "A (no fins) rim": "A (no fins) rim",
    "A (no fins) centre": "A (no fins) centre",
    "C (fins) rim": "C (fins at the base) rim",
    "C (fins) centre": "C (fins at the base) centre",
}
for r in rows("rml52e06_fig7.csv"):
    m = float(r["x"])
    if m < 1.05 - 1e-9 or m > 1.10 + 1e-9:
        continue
    base = r["series"].split(":")[0]
    note = "below the first reading's window (M 1.06 to 1.10): for the comparison only" if m < 1.06 else ""
    add("RM L52E06", "7", series7[base], f"{m:.3f}", f"{m:.3f}", r["y"], "PB", r["err_y"], note)

with open(out, "w", newline="") as f:
    f.write(
        "# W1 (docs/design/0015-fins-at-the-base.md): SECOND READINGS, the round-6 blind readings restated in the\n"
        "# columns of fins_at_base_w1.csv by ../scripts/w1/round6_second.py. Source: docs/research/total-drag/audit/\n"
        "# round6/readings/ on branch worktree-agent-adeeb9721ee747758 (TN 3819 figs. 33 to 35: 1b57563, corrected in\n"
        "# 66ad83e; TN 2360 fig. 6: 66ad83e; RM L52E06 fig. 7: 5531c84), each file's method in its method_*.md there.\n"
        "# Values and errors are the round-6 files', unchanged; the comparison with the first reading is\n"
        "# w1_compare_round6_output.txt. RM L52J21a figs. 8 and 38(c) have no second reading here (0015 section 7).\n"
        "# Columns: source, figure, series, M, abscissa (x/c, t/c in percent, or M), value, quantity, error, note.\n"
    )
    w = csv.writer(f, lineterminator="\n")
    w.writerow(["source", "figure", "series", "M", "abscissa", "value", "quantity", "error", "note"])
    w.writerows(lines)
print(len(lines), "rows")
