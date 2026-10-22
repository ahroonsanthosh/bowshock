"""W1: the first readings against the second (round 6), value by value, as the round-4 compare did.

Usage (from the repository root): python3 -I docs/research/total-drag/scripts/w1/compare_round6.py

Reads data/fins_at_base_w1.csv (first), data/fins_at_base_w1_second.csv (second), and for TN 3819 fig. 35's
free-flight line and tunnel pairs also the readings src/base/tn3819-fig35.ts holds (0008's first and round 3).
Each difference is first minus second, against the combined reading error (the sum of the two errors, as
tests/base/*.test.ts use it); a difference beyond it is flagged DISAGREE. Symbols are paired within a station
by nearest value; a symbol one reader found and the other did not is listed as unmatched."""
import csv
import re

D = "docs/research/total-drag/data/"


def load(path):
    with open(path, newline="") as f:
        return [r for r in csv.DictReader(l for l in f if not l.startswith("#"))]


first = load(D + "fins_at_base_w1.csv")
second = load(D + "fins_at_base_w1_second.csv")
flags = []


def line(label, a, ea, b, eb):
    d = a - b
    c = ea + eb
    bad = abs(d) > c + 1e-12
    if bad:
        flags.append(label)
    return f"  {label}: first {a:+.4f} (+-{ea:.4f}), second {b:+.4f} (+-{eb:.4f}), diff {d:+.4f}, combined {c:.4f}{'  DISAGREE' if bad else ''}"


def pair(fs, ss):
    """Pairs two lists of (value, error) by nearest value; returns pairs and the unmatched of each."""
    fs, ss = list(fs), list(ss)
    out = []
    while fs and ss:
        i, j = min(((i, j) for i in range(len(fs)) for j in range(len(ss))), key=lambda ij: abs(fs[ij[0]][0] - ss[ij[1]][0]))
        out.append((fs.pop(i), ss.pop(j)))
    return out, fs, ss


print("=== TN 2360 fig. 6: Delta P_b, first minus second, by panel, series and station (x/c 0 to 1.0)")
keys = sorted({(r["figure"], r["series"], r["M"], float(r["abscissa"])) for r in first + second if r["source"] == "TN 2360"})
for fig, series, m, st in keys:
    sel = lambda rows: [(float(r["value"]), float(r["error"])) for r in rows if r["source"] == "TN 2360" and r["figure"] == fig and r["series"] == series and r["M"] == m and abs(float(r["abscissa"]) - st) < 1e-9]
    pairs, uf, us = pair(sel(first), sel(second))
    for (a, ea), (b, eb) in sorted(pairs):
        print(line(f"{fig} {series} M {m} x/c {st:.1f}", a, ea, b, eb))
    for a, ea in uf:
        flags.append(f"{fig} {series} M {m} x/c {st:.1f}: first {a:+.4f} not found in the second reading")
        print(f"  {fig} {series} M {m} x/c {st:.1f}: first {a:+.4f} (+-{ea:.4f}) UNMATCHED: no second-reading symbol")
    for b, eb in us:
        flags.append(f"{fig} {series} M {m} x/c {st:.1f}: second {b:+.4f} not in the first reading")
        print(f"  {fig} {series} M {m} x/c {st:.1f}: second {b:+.4f} (+-{eb:.4f}) UNMATCHED: no first-reading symbol")

print("=== TN 3819 fig. 33: P_B at x/c 0 against t/c")
for r in [r for r in first if r["source"] == "TN 3819" and r["figure"] == "33"]:
    s = next(q for q in second if q["figure"] == "33" and q["series"] == r["series"] and q["abscissa"] == r["abscissa"])
    print(line(f"{r['series']} M {r['M']} t/c {r['abscissa']}%", float(r["value"]), float(r["error"]), float(s["value"]), float(s["error"])))

print("=== TN 3819 fig. 34: the RM-10, P_B with and without fins")
for series in ("RM-10 with fins", "RM-10 without fins"):
    fs = [r for r in first if r["figure"] == "34" and r["series"] == series]
    ss = [r for r in second if r["figure"] == "34" and r["series"] == series]
    for a, b in zip(fs, ss):
        dm = float(a["M"]) - float(b["M"])
        print(line(f"{series} M {a['M']} (second at {b['M']}, dM {dm:+.3f})", float(a["value"]), float(a["error"]), float(b["value"]), float(b["error"])))

# The readings src/base/tn3819-fig35.ts holds.
ts = open("src/base/tn3819-fig35.ts").read()
blocks = re.split(r"reading: '(first|round 3)',\s*points: \[", ts)
held = {}
for k in range(1, len(blocks), 2):
    pts = re.findall(r"\{ mach: ([\d.]+), pB: (-[\d.]+), error: ([\d.]+)(, extrapolated: true)? \}", blocks[k + 1].split("],")[0])
    held[blocks[k]] = [(float(m), float(p), float(e), bool(x)) for m, p, e, x in pts]
held["w1 first"] = [(float(r["M"]), float(r["value"]), float(r["error"]), False) for r in first if r["figure"] == "35"]
ff2 = {float(r["M"]): (float(r["value"]), float(r["error"])) for r in second if r["figure"] == "35" and r["series"].startswith("free-flight")}
swap = (1.75, 2.35, 0.005)  # FIG35_IDENTITY_SWAP: the error of every reading there is at least 0.005

print("=== TN 3819 fig. 35: the free-flight line, each earlier reading minus the second (round 6)")
print("    (errors as held; between M 1.75 and 2.35 every reading's error is at least 0.005, FIG35_IDENTITY_SWAP)")
for name in ("w1 first", "first", "round 3"):
    print(f"  -- {name}" + (" (0008's first reading)" if name == "first" else ""))
    for m, p, e, ext in held[name]:
        if ext or m not in ff2:
            continue
        b, eb = ff2[m]
        if swap[0] <= m <= swap[1]:
            e, eb = max(e, swap[2]), max(eb, swap[2])
        print(line(f"{name} M {m:.2f}", p, e, b, eb))

print("=== TN 3819 fig. 35: the tunnel pairs, each earlier reading minus the second")
pairs35 = re.findall(r"reading: '(first|round 3)',\s*source: '([^']+)',\s*mach: ([\d.]+),\s*withFins: (-[\d.]+),\s*withoutFins: (-[\d.]+)", ts)
for rd, srcn, m, wf, wo in pairs35:
    e = 0.001 if rd == "first" else 0.0009
    nominal = f"{float(m):.2f}"
    for which, v in (("with fins", wf), ("without fins", wo)):
        s = next(q for q in second if q["figure"] == "35" and q["series"] == f"tunnel {srcn} {which}" and q["M"] == nominal)
        print(line(f"{rd} {srcn} M {m} {which}", float(v), e, float(s["value"]), float(s["error"])))

print("=== RM L52E06 fig. 7: rim and centre P_B (second interpolated linearly between its read Mach numbers)")
def sec7(series, m):
    pts = sorted((float(r["M"]), float(r["value"]), float(r["error"])) for r in second if r["figure"] == "7" and r["series"] == series)
    for (m0, v0, e0), (m1, v1, e1) in zip(pts, pts[1:]):
        if m0 - 1e-9 <= m <= m1 + 1e-9:
            t = (m - m0) / (m1 - m0)
            return v0 + t * (v1 - v0), max(e0, e1)
    return None
for r in [r for r in first if r["source"] == "RM L52E06"]:
    m = float(r["M"])
    names = ["A (no fins) centre", "C (fins at the base) centre"] if "merged" in r["series"] else [r["series"]]
    for n in names:
        v = sec7(n, m)
        print(line(f"{r['series']} M {m:.2f}" + (f" against {n}" if len(names) > 1 else ""), float(r["value"]), float(r["error"]), *v))

print("=== RM L52J21a fig. 8, R = 8.06e6: each base's least negative P_B (what W1 uses: the cylindrical base)")
for base in ("cylindrical", "conical"):
    for m in ("1.62", "1.93", "2.41"):
        fs = [(float(r["value"]), float(r["error"])) for r in first if r["figure"] == "8" and f"{base} base: least" in r["series"] and r["M"] == m]
        ss = [(float(r["value"]), float(r["error"])) for r in second if r["figure"] == "8" and r["series"].startswith(base) and r["M"] == m and not r["note"].startswith("not a symbol")]
        if fs and ss:
            a, b = max(fs), max(ss)
            print(line(f"{base} base M {m} least negative" + ("" if base == "cylindrical" else " (recorded, not used)"), a[0], a[1], b[0], b[1]))
print("  not symbols (W1 inspection): " + "; ".join(f"{r['series']} M {r['M']} {r['value']}" for r in second if r["figure"] == "8" and r["note"].startswith("not a symbol")))

print("=== RM L52J21a figs. 31 to 33 (d), unfinned, cylindrical base, R 7 to 9.5 x 10^6: first (data/w1_l52j21a_fig31_33d_output.txt) minus second, same nose, nearest R within 0.15")
fr, Mc = [], None
for l in open(D + "w1_l52j21a_fig31_33d_output.txt"):
    h = re.match(r"fig\. (3\d)\(d\), M ([\d.]+)", l)
    if h:
        Mc = h.group(2)
    m = re.match(r"\s+\w+\s+(\w+)\s+R ([\d.]+)\s+P_B (-[\d.]+)", l)
    if m:
        fr.append((Mc, m.group(1), float(m.group(2)), float(m.group(3))))
sr = [(r["M"], r["series"].split(" ")[0], float(r["abscissa"]), float(r["value"]), float(r["error"])) for r in second if r["figure"] in ("31(d)", "32(d)", "33(d)")]
used = set()
for mc, nose, R, v in fr:
    cand = [(abs(R - q[2]), k) for k, q in enumerate(sr) if q[0] == mc and q[1] == nose and abs(R - q[2]) <= 0.15 and k not in used]
    if cand:
        k = min(cand)[1]
        used.add(k)
        print(line(f"M {mc} {nose} R {R:.2f} (second at {sr[k][2]:.2f})", v, 0.002, sr[k][3], sr[k][4]))
    else:
        print(f"  M {mc} {nose} R {R:.2f}: first {v:+.4f} (+-0.0020) UNMATCHED: no second-reading symbol")
for k, q in enumerate(sr):
    if k not in used and 7.0 <= q[2] <= 9.5:
        print(f"  M {q[0]} {q[1]} R {q[2]:.2f}: second {q[3]:+.4f} (+-{q[4]:.4f}) UNMATCHED: no first-reading symbol of that nose")

print("=== Flagged (beyond the combined error, or found by one reader only)")
for f in flags:
    print("  " + f)
print(f"  {len(flags)} flagged")
