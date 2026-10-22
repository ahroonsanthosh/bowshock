"""W1's zero member (0015 sections 3.5, 7): can it be re-derived from RM L52J21a fig. 8 (finned) minus figs. 31 to
33 panel (d) (unfinned), cylindrical base, R = 8.06e6, as the report forms fig. 38 (p. 17), instead of resting on
fig. 38(c), which is read once?

Usage (from the repository root): python3 -I docs/research/total-drag/scripts/w1/zero_member_check.py

Reads the first readings (data/w1_l52j21a_fig8_output.txt, data/w1_l52j21a_fig31_33d_output.txt) and the second
(data/fins_at_base_w1_second.csv, round 6's fig. 8 rows). Fig. 8's symbols: circle conical, square ogive, diamond
radome; figs. 31 to 33: square conical, triangle ogive, circle radome. Unfinned values: the symbols nearest R 8.06e6
of each nose (within 0.6e6). Prints the nose-paired Delta P_B with the first reading's shape calls, the bound that
needs no nose calls (least negative finned minus most negative unfinned, each with its error), and fig. 38(c)'s
range (data/fins_at_base_w1.csv)."""
import csv
import re

D = "docs/research/total-drag/data/"
fig8 = {}  # (M, nose) -> P_B, cylindrical base, first reading
noses8 = {"circle": "conical", "square": "ogive", "diamond": "radome"}
for line in open(D + "w1_l52j21a_fig8_output.txt"):
    if line.startswith("conical base"):
        break
    m = re.match(r"(\w+)\s+M ([\d.]+)\s+P_B (-[\d.]+)", line)
    if m:
        fig8[(round(float(m.group(2)), 1), noses8[m.group(1)])] = float(m.group(3))
unf = {}  # M -> [(nose, R, P_B)]
M = None
for line in open(D + "w1_l52j21a_fig31_33d_output.txt"):
    h = re.match(r"fig\. 3\d\(d\), M ([\d.]+)", line)
    if h:
        M = float(h.group(1))
        unf[M] = []
    m = re.match(r"\s+\w+\s+(\w+)\s+R ([\d.]+)\s+P_B (-[\d.]+)", line)
    if m:
        unf[M].append((m.group(1), float(m.group(2)), float(m.group(3))))


def load(path):
    with open(path, newline="") as f:
        return [r for r in csv.DictReader(l for l in f if not l.startswith("#"))]


second = [r for r in load(D + "fins_at_base_w1_second.csv") if r["figure"] == "8" and r["series"].startswith("cylindrical")]
first = load(D + "fins_at_base_w1.csv")
f38 = {}
for r in first:
    if r["figure"] == "38(c)":
        f38.setdefault(float(r["M"]), []).append(float(r["value"]))

E8, E31, E8b = 0.002, 0.002, 0.0007
print("Cylindrical base, R = 8.06e6. Delta P_B = finned (fig. 8) minus unfinned (figs. 31 to 33 (d)).")
for m8, mu in ((1.6, 1.62), (1.9, 1.93), (2.4, 2.41)):
    print(f"=== M {mu}")
    near = {}
    for nose, R, p in unf[mu]:
        if abs(R - 8.06) <= 0.6 and (nose not in near or abs(R - 8.06) < abs(near[nose][0] - 8.06)):
            near[nose] = (R, p)
    for nose in ("conical", "ogive", "radome"):
        fin = fig8[(m8, nose)]
        R, p = near[nose]
        print(f"  {nose:8s} finned {fin:+.4f}  unfinned {p:+.4f} (R {R:.2f})  Delta P_B {fin - p:+.4f} (+-{E8 + E31:.4f}), first reading's shape calls")
    fins2 = [float(r["value"]) for r in second if abs(float(r["M"]) - mu) < 0.02]
    least_f = max([fig8[(m8, n)] for n in ("conical", "ogive", "radome")] + fins2)
    most_u = min(p for _, R, p in unf[mu] if 7.0 <= R <= 9.5)
    print(f"  no nose calls: least negative finned {least_f:+.4f} (both readings), most negative unfinned {most_u:+.4f}:"
          f" Delta P_B at most {least_f - most_u + E8b + E31:+.4f}, F at least {(abs(least_f) - E8b) / (abs(least_f) - E8b + max(0, least_f - most_u + E8b + E31)):.3f}")
    lo, hi = min(f38[mu]), max(f38[mu])
    print(f"  fig. 38(c), both bases, read once: {lo:+.4f} to {hi:+.4f} (+-0.002)")
