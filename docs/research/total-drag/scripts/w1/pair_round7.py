"""The round-7 blind readings paired with the readings W1 and W2 hold (0015 sections 7 and 11.3; 0014 section 10.1,
rule 5): TN 3819 fig. 18's two compiled curves and its free-flight curve, and RM L52J21a figs. 31 to 33 panel (d)
near R = 8e6, and what that pairing allows for the zero member (0015 section 3.5).

Usage (from the repository root): python3 -I docs/research/total-drag/scripts/w1/pair_round7.py

Reads round 7 (data/round7/, verbatim copies of docs/research/total-drag/audit/round7/readings/ on branch
worktree-agent-a5296b84a65b1ae85, commit 92fb693, method in its method.md there); round 1's fig. 18 table
(audit/readings/tn3819_fig18.csv, the adopted rows of src/base/tn3819-fig18.ts, error +-0.001); 0008's free-flight
values (scripts/love18_ff.py, the values its ratios use; no error stated there, taken as the same grid model's
+-0.001); the two readings of fig. 35's no-fin curve (fig35-free-flight/, 0010 section 11.3); this work's first
reading of figs. 31 to 33 (d) (data/w1_l52j21a_fig31_33d_output.txt, +-0.002) and the fig. 8 readings
(data/w1_l52j21a_fig8_output.txt, +-0.002; round 6's in data/fins_at_base_w1_second.csv).

Two readings disagree where they differ by more than the sum of their errors."""
import csv
import re

D = "docs/research/total-drag/data/"
A = "docs/research/total-drag/audit/readings/"
F35 = "docs/research/total-drag/fig35-free-flight/"


def table(path):
    with open(path, newline="") as f:
        return list(csv.DictReader(l for l in f if not l.startswith("#")))


r7 = table(D + "round7/tn3819_fig18.csv")
basic7 = {float(r["M"]): (float(r["P_B"]), float(r["P_B_err"])) for r in r7 if r["curve"].startswith("Love") and r["kind"] == "at M"}
chap7 = {float(r["M"]): (float(r["P_B"]), float(r["P_B_err"])) for r in r7 if r["curve"].startswith("Chapman") and r["kind"] == "at M"}
ff7 = [(float(r["M"]), float(r["P_B"]), float(r["P_B_err"])) for r in r7 if r["curve"].startswith("free") and r["kind"] in ("at M", "extremum", "end point")]
ff7.sort()

r1 = {}
section = None
for line in open(A + "tn3819_fig18.csv"):
    if line.startswith("# curves"):
        section = "curves"
        continue
    if line.startswith("#"):
        section = None
        continue
    if section == "curves":
        m, more, less = line.split(",")[:3]
        r1[float(m)] = (float(more), float(less))
E1 = 0.001

print("=== TN 3819 fig. 18, the compiled curves: round 1 (adopted, +-0.001) against round 7")
beyond = []
for m in sorted(set(r1) & set(basic7)):
    for name, i, r7v in (("basic (Love)", 1, basic7), ("Chapman", 0, chap7)):
        if m not in r7v:
            continue
        v1, (v7, e7) = r1[m][i], r7v[m]
        flag = "" if abs(v1 - v7) <= E1 + e7 + 1e-9 else "  BEYOND"
        if flag:
            beyond.append((m, name))
        print(f"  M {m:.1f} {name:13s} round 1 {v1:+.4f}  round 7 {v7:+.4f} +-{e7:.4f}  difference {v1 - v7:+.4f}"
              f" (combined {E1 + e7:.4f}){flag}")
print("  rows read by round 7 only (round 1 has no row there; its linear interpolation beside):")
for m in sorted(set(basic7) - set(r1)):
    lo = max(k for k in r1 if k < m)
    hi = min(k for k in r1 if k > m)
    t = (m - lo) / (hi - lo)
    li = r1[lo][1] + t * (r1[hi][1] - r1[lo][1])
    print(f"  M {m:.1f} basic (Love)  round 7 {basic7[m][0]:+.4f}  round 1 interpolated {li:+.4f} (rows {lo}, {hi})")

nf2 = {float(r["M"]): float(r["P_B"]) for r in table(F35 + "reading2/no_fin_curve.csv")}
print("  The third evidence at M 1.4: fig. 35's no-fin curve, which reproduces the basic curve within 0.001 (0008")
print("  section 3.4): first reading -0.1774 (column runs; fig35-free-flight/README.md), second "
      f"{nf2[1.4]:+.4f} (reading2/no_fin_curve.csv).")
s = lambda m, d: d[m][0]
print("  Chapman minus basic, round 1 and round 7: " + ", ".join(
    f"M {m}: {r1[m][0] - r1[m][1]:+.4f}, {s(m, chap7) - s(m, basic7):+.4f}" for m in (1.0, 1.2, 1.4, 1.5) if m in r1))
print("  Disagreements beyond the combined errors: " + (", ".join(f"M {m} {n}" for m, n in beyond) or "none"))

print()
print("=== TN 3819 fig. 18, the free-flight curve: 0008 (+-0.001 taken) against round 7 (interpolated between its")
print("    rows, extremes and end points)")
f0008 = ((1.057, -0.2070), (1.149, -0.1928), (1.159, -0.1934), (1.214, -0.1976))


def at7(m):
    for (ma, pa, ea), (mb, pb, eb) in zip(ff7, ff7[1:]):
        if ma <= m <= mb:
            t = (m - ma) / (mb - ma)
            return pa + t * (pb - pa), max(ea, eb)
    return None


for m, p in f0008:
    v7, e7 = at7(m)
    flag = "" if abs(p - v7) <= 0.001 + e7 else "  BEYOND"
    print(f"  M {m:.3f}  0008 {p:+.4f}  round 7 {v7:+.4f} +-{e7:.4f}  difference {p - v7:+.4f} (combined {0.001 + e7:.4f}){flag}")
print("  round 7's extremes: " + ", ".join(f"M {m:.4f} {p:+.4f}" for m, p, e in ff7 if m not in (1.05, 1.1, 1.15, 1.2, 1.25)))

print()
print("=== RM L52J21a figs. 31 to 33 (d), R 7e6 to 9.5e6: this work's first reading (+-0.002, shape calls by")
print("    template) against round 7 (shapes on zoomed crops, its errors), paired by nose and R within 0.15e6")
first = {}
M = None
for line in open(D + "w1_l52j21a_fig31_33d_output.txt"):
    h = re.match(r"fig\. 3\d\(d\), M ([\d.]+)", line)
    if h:
        M = float(h.group(1))
        first[M] = []
    m = re.match(r"\s+(\w+)\s+(\w+)\s+R ([\d.]+)\s+P_B (-[\d.]+)\s+\(score ([\d.]+)", line)
    if m:
        first[M].append((m.group(2), float(m.group(3)), float(m.group(4)), float(m.group(5))))
seven = {}
for r in table(D + "round7/rml52j21a_figs31-33d.csv"):
    if r["shape"] == "stack":
        continue
    seven.setdefault(float(r["M"]), []).append((r["nose"].split()[0], float(r["R_e6"]), float(r["P_B"]), float(r["P_B_err"]), r["symbol_id"]))
E31 = 0.002
paired = {}  # the first reading's symbols that round 7 confirms (a symbol of the same nose within 0.15e6)
for mach in sorted(first):
    print(f"  M {mach}")
    used = set()
    for nose, R, p, score in sorted(first[mach], key=lambda x: (x[0], x[1])):
        paired.setdefault(mach, [])
        cands = [s for s in seven[mach] if s[0] == nose and abs(s[1] - R) <= 0.15]
        if not cands:
            other = [s for s in seven[mach] if abs(s[1] - R) <= 0.15]
            note = "; ".join(f"round 7 has {s[0]} {s[4]} at R {s[1]:.2f}, {s[2]:+.4f}" for s in other) or "nothing near"
            print(f"    {nose:8s} R {R:.2f} {p:+.4f} (score {score:.2f}): no {nose} symbol in round 7 within 0.15e6 ({note})")
            continue
        s = min(cands, key=lambda c: abs(c[1] - R))
        used.add(s[4])
        paired[mach].append((nose, R, p, score))
        flag = "" if abs(p - s[2]) <= E31 + s[3] else "  BEYOND"
        print(f"    {nose:8s} R {R:.2f} {p:+.4f} (score {score:.2f})  round 7 {s[4]} R {s[1]:.2f} {s[2]:+.4f} +-{s[3]:.4f}"
              f"  difference {p - s[2]:+.4f} (combined {E31 + s[3]:.4f}){flag}")
    for s in seven[mach]:
        if s[4] not in used:
            print(f"    round 7 only: {s[0]} {s[4]} R {s[1]:.2f} {s[2]:+.4f} +-{s[3]:.4f}")

print()
print("=== The zero member re-derived (fig. 8 finned minus figs. 31 to 33 (d) unfinned, cylindrical base, R 8.06e6)?")
noses8 = {"circle": "conical", "square": "ogive", "diamond": "radome"}
fig8 = {}
for line in open(D + "w1_l52j21a_fig8_output.txt"):
    if line.startswith("conical base"):
        break
    m = re.match(r"(\w+)\s+M ([\d.]+)\s+P_B (-[\d.]+)\s+\(score ([\d.]+)", line)
    if m:
        fig8.setdefault(round(float(m.group(2)), 1), []).append((noses8[m.group(1)], float(m.group(3)), float(m.group(4))))
r6 = [r for r in table(D + "fins_at_base_w1_second.csv") if r["figure"] == "8" and r["series"].startswith("cylindrical base:")]
f38 = {}
for r in table(D + "fins_at_base_w1.csv"):
    if r["figure"] == "38(c)":
        f38.setdefault(float(r["M"]), []).append(float(r["value"]))
E8, E6 = 0.002, 0.0002
print("  Unfinned: both readings within 0.6e6 of R 8.06e6, the first reading's only where round 7 confirms the symbol.")
print("  F = finned over unfinned, each moved by its error toward more relief; the zero member is the least F over")
print("  the three Mach numbers (0015 section 3.5: 0.9504, fig. 38(c) at M 1.93 over fig. 8).")
for m8, mu in ((1.6, 1.62), (1.9, 1.93), (2.4, 2.41)):
    named6 = [(r["series"].split(": ")[1].split()[0], float(r["value"])) for r in r6
              if abs(float(r["M"]) - mu) < 0.02 and r["series"].endswith("nose")]
    ends6 = [float(r["value"]) for r in r6 if abs(float(r["M"]) - mu) < 0.02 and "stack" in r["series"] and r["note"] == ""]
    print(f"  M {mu}: fig. 8, first reading's calls (template scores): " +
          ", ".join(f"{n} {p:+.4f} ({s:.2f})" for n, p, s in fig8[m8]) +
          "; round 6's: " + (", ".join(f"{n} {p:+.4f}" for n, p in named6) or "none") +
          "; round 6's stack ends: " + ", ".join(f"{p:+.4f}" for p in ends6))
    unf = {n: [(p, E31) for n2, R, p, sc in paired[mu] if n2 == n and abs(R - 8.06) <= 0.6] +
              [(s[2], s[3]) for s in seven[mu] if s[0] == n and abs(s[1] - 8.06) <= 0.6] for n in ("conical", "ogive", "radome")}
    for nose in ("conical", "ogive", "radome"):
        u = unf[nose]
        parts = []
        for who, calls, e in (("first's call", [p for n, p, s in fig8[m8] if n == nose], E8), ("round 6's call", [p for n, p in named6 if n == nose], E6)):
            for f in calls:
                d_hi = max(f - q for q, _ in u)
                fmin = min((abs(f) - e) / (abs(q) + eq) for q, eq in u)
                parts.append(f"{who} {f:+.4f}: Delta P_B up to {d_hi:+.4f}, F down to {fmin:.3f}")
        print(f"    {nose:8s} unfinned {', '.join(f'{q:+.4f}' for q, _ in u)}; " + ("; ".join(parts) or "no call"))
    allf = [(p, E8) for n, p, s in fig8[m8]] + [(p, E6) for n, p in named6] + [(p, 0.0007) for p in ends6]
    fl, el = max(allf, key=lambda x: x[0])
    qn, en = min(((q, eq) for n in unf for q, eq in unf[n] if n != "radome"), key=lambda x: x[0])
    print(f"    without calls: least negative finned {fl:+.4f} over most negative unfinned {qn:+.4f} (R within 0.6e6):"
          f" F down to {(abs(fl) - el) / (abs(qn) + en):.3f}")
    print(f"    fig. 38(c), read once: Delta P_B {min(f38[mu]):+.4f} to {max(f38[mu]):+.4f} (+-0.002)")
