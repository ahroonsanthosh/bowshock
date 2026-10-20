"""BRL Report 934 (Basic Finner, BRL range): computations behind data/basic_finner_brl934.md.

No drag model is run here. The script:
  1. compares the two readings of Graph II (yaw drag coefficient C_D' per rad^2);
  2. corrects each round's CD to zero yaw with each reading, CD0 = CD - C_D'(M) dbar2 (dbar2 in rad^2),
     as the report's Graph I does ("value corrected for yaw");
  3. estimates Reynolds numbers, which the report does not give, over the registered ranges of the
     unknowns (range air 288 to 298 K at 1 atm; model diameter 0.78 to 0.82 in, data/basic_finner_brl934.md);
  4. lists, per round, the domain checks of src/base and src/fins that depend only on Mach and Reynolds
     numbers (compiled curve M 1.5 to 3.0; fins-on-base factor M 1.798 to 3.0; trailing-edge base
     M 1.5 to 3.2 and c/[h Re_c^(1/5)] <= 1; rounded leading edge, if one is assumed, M 1.49 to 3.0
     and Re_D >= 6.7e3, with TN 2960's Re_D >= 1e5 and RM A55H31's M >= 2.48 deciding the label).

usage: python3 -I brl934.py data/basic_finner_brl934.csv data/basic_finner_brl934_graph2.csv
"""
import csv
import math
import sys


def rows(path):
    with open(path, newline="") as f:
        return list(csv.DictReader(line for line in f if not line.startswith("#")))


rounds = rows(sys.argv[1])
g2 = rows(sys.argv[2])
read = {1: [], 2: []}
for r in g2:
    read[int(r["reading"])].append((float(r["M"]), float(r["CDprime_per_rad2"])))
for k in read:
    read[k].sort()


def interp(pts, m):
    if m < pts[0][0] or m > pts[-1][0]:
        return None
    for (m0, v0), (m1, v1) in zip(pts, pts[1:]):
        if m0 <= m <= m1:
            return v0 + (v1 - v0) * (m - m0) / (m1 - m0)
    return pts[-1][1]


print("1. Graph II, reading 1 interpolated at reading 2's Mach numbers")
print("   M     reading2  reading1  r1-r2")
diffs = []
for m, v2 in read[2]:
    v1 = interp(read[1], m)
    if v1 is None:
        print("  %.2f   %.2f      (outside reading 1)" % (m, v2))
        continue
    diffs.append(v1 - v2)
    print("  %.2f   %.2f     %.2f     %+.2f" % (m, v2, v1, v1 - v2))
print("   largest |r1-r2| = %.2f per rad^2; mean %+.3f" % (max(abs(d) for d in diffs), sum(diffs) / len(diffs)))
print("   text (p. 8): 15.0 at M 1.4, 8.9 at M 2.4; curve: r1 %.2f / r2 %.2f at 1.40, r1 %.2f / r2 %.2f at 2.40"
      % (interp(read[1], 1.40), interp(read[2], 1.40), interp(read[1], 2.40), interp(read[2], 2.40)))

DEG2 = (math.pi / 180) ** 2
print()
print("2. Zero-yaw CD per round, CD0 = CD - C_D' dbar2 (C_D' from each reading; '-' outside Graph II's range)")
print("   round  M      dbar2  CD     C_D'(r1) C_D'(r2)  CD0(r1)  CD0(r2)  correction  flags")
for r in rounds:
    m = float(r["M_T3"])
    cd = float(r["CD"])
    d2 = r["dbar2_deg2"].strip()
    if d2 == "":
        print("   %s   %.3f  -      %.3f  (no dbar2 printed)                                 %s" % (r["round"], m, cd, r["flags"]))
        continue
    d2r = float(d2) * DEG2
    c1, c2 = interp(read[1], m), interp(read[2], m)
    if c1 is None or c2 is None:
        print("   %s   %.3f  %-5s  %.3f  -        -         -        -        -           %s" % (r["round"], m, d2, cd, r["flags"]))
        continue
    a, b = cd - c1 * d2r, cd - c2 * d2r
    print("   %s   %.3f  %-5s  %.3f  %6.2f   %6.2f    %.4f   %.4f   %.4f      %s"
          % (r["round"], m, d2, cd, c1, c2, a, b, cd - 0.5 * (a + b), r["flags"]))

print()
print("3. Reynolds number estimates (not in the report): range air at 1 atm, model diameter d")
R, GAMMA, P = 287.05, 1.4, 101325.0


def air(t):
    mu = 1.458e-6 * t ** 1.5 / (t + 110.4)
    rho = P / (R * t)
    a = math.sqrt(GAMMA * R * t)
    return a, mu / rho


cases = [(t, d) for t in (288.15, 298.15) for d in (0.78, 0.80, 0.82)]
print("   T K     d in   a m/s   nu m2/s")
for t, d in cases:
    a, nu = air(t)
    print("   %.2f  %.2f   %.1f   %.4e" % (t, d, a, nu))
print("   round  M      Re_d (min..max)        Re_L=10d (min..max)    Re_D(LE r=0.004 cal) (min..max)  c/[h Re_c^0.2]  c/[h Re_c^0.5]")
CH = 1.0 / 0.08  # chord over full trailing-edge thickness (8% thick wedge, 1 cal chord)
for r in rounds:
    m = float(r["M_T3"])
    red = []
    for t, d in cases:
        a, nu = air(t)
        red.append(m * a * d * 0.0254 / nu)
    lo, hi = min(red), max(red)
    thin = (CH / hi ** 0.2, CH / lo ** 0.2)
    lam = (CH / hi ** 0.5, CH / lo ** 0.5)
    print("   %s   %.3f  %.3e..%.3e    %.3e..%.3e    %.0f..%.0f                     %.3f..%.3f     %.4f..%.4f"
          % (r["round"], m, lo, hi, 10 * lo, 10 * hi, 0.008 * lo, 0.008 * hi, thin[0], thin[1], lam[0], lam[1]))

print()
print("4. Domain checks that depend only on M and Re (each library's own limits, src/base and src/fins)")
print("   round  M      base curve  fins-on-base  TE base  rounded LE (if r = 0.004 cal assumed)")
for r in rounds:
    m = float(r["M_T3"])
    red = [m * air(t)[0] * d * 0.0254 / air(t)[1] for t, d in cases]
    re_d = (0.008 * min(red), 0.008 * max(red))
    base = "ok" if 1.5 <= m <= 3.0 else "refused"
    fob = "ok" if 1.798 <= m <= 3.0 else "refused"
    if fob == "ok" and m < 1.80:
        fob = "ok (1.80 row, flagged)"
    te = "ok" if 1.5 <= m <= 3.2 else "refused"
    if not (1.49 <= m <= 3.0):
        le = "refused (Mach)"
    elif re_d[1] < 6.7e3:
        le = "refused (Re_D %.0f..%.0f < 6.7e3)" % re_d
    elif re_d[0] < 6.7e3:
        le = "refused at the low end of the Re range (Re_D %.0f..%.0f)" % re_d
    else:
        le = "covered by RM A55H31" if m >= 2.48 else "extrapolated in Reynolds number"
        le += " (Re_D %.0f..%.0f)" % re_d
    print("   %s   %.3f  %-10s  %-22s  %-7s  %s" % (r["round"], m, base, fob, te, le))
