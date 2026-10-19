"""Round 4: second readings against the first (0008 at 2b538da, data/blunt_te_2d_base.md, le_bluntness.md,
scripts blunt_te_2d.py), and the bands recomputed from the second readings.  Second-reading values are copied
from round4/readings/*.csv (and the fig. 8 curve scans of this script's header).  First-reading values are copied
from blunt_te_2d.py and le_bluntness.md at 2b538da."""
import math
G = 1.4
def PB(r, M): return (r - 1.0) * 2.0 / (G * M * M)
def interp(tab, x):
    xs = sorted(tab)
    if x < xs[0] - 1e-12 or x > xs[-1] + 1e-12: return None
    for a, b in zip(xs, xs[1:]):
        if a <= x <= b: return tab[a] + (tab[b] - tab[a]) * (x - a) / (b - a)
    return tab[xs[-1]]
def oblique(M, th_deg):
    th = math.radians(th_deg); lo = math.asin(1 / M) + 1e-9; hi = math.radians(89)
    f = lambda b: math.tan(th) - 2 / math.tan(b) * (M * M * math.sin(b) ** 2 - 1) / (M * M * (G + math.cos(2 * b)) + 2)
    n = 4000; pb, pf = lo, f(lo)
    for k in range(1, n + 1):
        b = lo + (hi - lo) * k / n; fb = f(b)
        if pf * fb <= 0:
            a, c = pb, b
            for _ in range(80):
                m = 0.5 * (a + c)
                if f(a) * f(m) <= 0: c = m
                else: a = m
            be = 0.5 * (a + c); Mn1 = M * math.sin(be)
            p21 = 1 + 2 * G / (G + 1) * (Mn1 ** 2 - 1)
            Mn2 = math.sqrt((1 + 0.5 * (G - 1) * Mn1 ** 2) / (G * Mn1 ** 2 - 0.5 * (G - 1)))
            return p21, Mn2 / math.sin(be - th)
        pb, pf = b, fb

print("=== 1a. TR 1109 fig. 29(a) turbulent: first minus second (p_b/p_inf); second error +-0.004 (+-0.006 on gridlines)")
S29 = {1.5: {0.45: .492, 0.55: .492, 0.70: .492, 0.95: .493, 1.0: .4928, 1.5: .497, 2.0: .502, 2.5: .507, 3.0: .514, 3.5: .526, 4.0: .537, 4.5: .550},
       2.0: {0.45: .356, 0.55: .356, 0.70: .359, 0.75: .3606, 0.95: .365, 1.0: .3656, 1.5: .376, 2.0: .389, 2.5: .401, 3.0: .414, 3.5: .428, 4.0: .440, 4.5: .453},
       3.1: {0.45: .187, 0.55: .195, 0.70: .200, 0.75: .2045, 0.8: .2076, 0.95: .217, 1.0: .2195, 1.5: .251, 2.0: .282, 2.5: .313, 3.0: .344, 3.5: .377, 4.0: .408, 4.5: .438}}
F29 = {1.5: {0.5: .492, 0.75: .492, 1.0: .494, 1.5: .498, 2.0: .503, 2.5: .508, 3.0: .515, 3.5: .528, 4.0: .539, 4.5: .552},
       2.0: {0.5: .358, 0.75: .362, 1.0: .367, 1.5: .379, 2.0: .391, 3.0: .416, 3.5: .430, 4.0: .442, 4.5: .454},
       3.1: {0.75: .209, 1.0: .223, 1.5: .255, 2.0: .286, 2.5: .317, 3.0: .347, 3.5: .380, 4.0: .411, 4.5: .441}}
for M in F29:
    d = [(u, F29[M][u] - interp(S29[M], u)) for u in sorted(F29[M])]
    print(f"  M {M}: " + " ".join(f"{u:g}:{v:+.3f}" for u, v in d) + f"  (max |d| {max(abs(v) for _, v in d):.3f})")

print("=== 1b. TR 1109 fig. 29(b) laminar: first minus second at common abscissae")
S29b = {1.5: {0.010: .3576, 0.0115: .395, 0.012: .4068, 0.030: .665, 0.038: .7054, 0.040: .713, 0.050: .740, 0.100: .820, 0.102: .8213, 0.124: .836, 0.150: .8453, 0.175: .849},
        2.0: {0.010: .4389, 0.0115: .459, 0.012: .4639, 0.030: .645, 0.038: .6916, 0.040: .700, 0.124: .807, 0.150: .8164, 0.175: .8192},
        3.1: {0.006: .1917, 0.009: .2362, 0.010: .2486, 0.0115: .2731, 0.012: .2792, 0.022: .399, 0.030: .472, 0.038: .5378, 0.040: .553, 0.050: .627, 0.060: .696, 0.062: .7089}}
F29b = {1.5: {0.010: .358, 0.030: .664, 0.038: .706, 0.050: .740, 0.104: .822, 0.124: .834, 0.150: .844, 0.175: .847},
        2.0: {0.010: .442, 0.030: .644, 0.038: .693, 0.124: .807, 0.150: .816, 0.175: .818},
        3.1: {0.006: .190, 0.010: .253, 0.030: .474, 0.038: .539, 0.050: .628, 0.062: .709}}
for M in F29b:
    d = [(u, F29b[M][u] - interp(S29b[M], u)) for u in sorted(F29b[M]) if interp(S29b[M], u) is not None]
    print(f"  M {M}: " + " ".join(f"{u:g}:{v:+.3f}" for u, v in d))

print("=== 1c. TR 1109 fig. 8: second-reading symbols about the second-reading faired curves (base drag over curve)")
C8 = {1.5: {0.547: .4977, 0.6: .4973, 0.65: .4969, 0.8: .4951, 0.9: .4946, 1.1: .4937, 1.3: .4918, 1.45: .4923, 1.7: .4909, 1.9: .4896, 2.1: .4879, 2.2: .4869, 2.35: .4857, 2.6: .4882, 2.8: .4900, 2.95: .4908, 3.2: .4945, 3.8: .5071, 4.15: .5140, 4.3: .5182, 4.45: .5226, 4.6: .5270},
      2.0: {0.48: .3562, 0.52: .3564, 0.6: .3580, 0.65: .3585, 0.72: .3595, 0.9: .3626, 1.2: .3683, 1.3: .3697, 1.45: .3749, 1.7: .3796, 1.9: .3839, 2.1: .3883, 2.8: .4099, 2.95: .4149, 3.2: .4216, 3.8: .4370, 4.15: .4453, 4.3: .4481, 4.45: .4519, 4.6: .4554},
      3.1: {0.52: .195, 0.8: .2088, 1.1: .2270, 1.2: .2334, 1.3: .2395, 1.45: .2498, 1.55: .2570, 1.7: .2654, 1.9: .2776, 2.2: .2955, 2.35: .3046, 2.6: .3208, 2.95: .3424, 3.05: .3478, 3.2: .3573, 3.8: .3977, 4.15: .4186, 4.3: .4258}}
sym = {}
for l in open("readings/tr1109_fig8_symbols.csv"):
    if l.startswith("#"): continue
    p = l.strip().split(","); M = float(p[1]); sym.setdefault(M, []).append((p[2], float(p[3]), float(p[4])))
allr = []
for M in (1.5, 2.0, 3.1):
    rr = []
    for name, X, r in sym[M]:
        c = interp(C8[M], X)
        if c is None: c = C8[M][min(C8[M])]
        rr.append(((1 - r) / (1 - c), name, X, r, c))
    allr += [x[0] for x in rr]
    lo = min(rr); hi = max(rr)
    print(f"  M {M}: {len(rr)} symbols, base drag over curve {lo[0]:.3f} ({lo[1]} at {lo[2]:.2f}) to {hi[0]:.3f} ({hi[1]} at {hi[2]:.2f})")
print(f"  all: {min(allr):.3f} to {max(allr):.3f}   (first reading: 0.969 to 1.082)")
print("  fig. 29(a) over fig. 8 (second readings), base drag:")
rat = []
for M, u in ((1.5, 0.55), (1.5, 4.5), (2.0, 0.55), (2.0, 4.5), (3.1, 0.75), (3.1, 4.2)):
    c8 = interp(C8[M], u) if interp(C8[M], u) is not None else C8[M][min(C8[M])]
    c29 = interp(S29[M], u); rat.append((1 - c29) / (1 - c8))
    print(f"    M {M} at {u}: fig 8 {c8:.3f}, fig 29 {c29:.3f}, ratio {(1 - c29) / (1 - c8):.3f}")
print(f"  range {min(rat):.3f} to {max(rat):.3f}   (first reading: 0.933 to 1.010)")
print("  first-reading fig. 8 symbols and curve against the second (same abscissa), M 3.1: symbols +0.000 to +0.012 lower in the first")

print("=== 2. RM A51J25 fig. 7 curve: first minus second (p_b/p'); second error +-0.004 clear, +-0.010 in symbols")
S7 = {1.50: .474, 1.55: .463, 1.60: .447, 1.70: .425, 1.80: .403, 1.90: .380, 2.00: .360, 2.10: .341, 2.20: .324, 2.30: .307,
      2.40: .291, 2.50: .277, 2.60: .266, 2.70: .255, 2.80: .247, 2.90: .239, 3.00: .230, 3.20: .217, 3.30: .214, 3.40: .209, 3.50: .208,
      3.60: .205, 3.70: .203, 3.80: .2015, 3.90: .200, 4.00: .199}
F7 = {1.167: .588, 1.295: .545, 1.40: .517, 1.50: .474, 1.60: .446, 1.70: .420, 1.83: .399, 2.00: .359, 2.10: .337, 2.25: .311, 2.50: .275,
      2.75: .249, 2.90: .236, 3.00: .228, 3.10: .220, 3.25: .214, 3.50: .206, 3.75: .200, 3.90: .199, 4.00: .199}
for M in sorted(F7):
    s = interp(S7, M)
    if s is None: print(f"  M' {M:.3f}: first {F7[M]:.3f}, second: under the PARD symbols (not read)"); continue
    print(f"  M' {M:.3f}: first {F7[M]:.3f}, second {s:.3f}, diff {F7[M] - s:+.3f}, base drag first/second {(1 - F7[M]) / (1 - s):.3f}")
SY7 = [("Ames square", 1.492, .508), ("tagged square", 1.617, .466), ("9x12 diamond", 1.606, .4235), ("NPL", 1.843, .410),
       ("Ames square (cluster centre)", 1.998, .374), ("9x12 diamond", 1.961, .332), ("tagged", 1.954, .351), ("Ames square", 2.490, .282),
       ("Ames inverted triangle", 2.891, .257), ("Ames square", 3.113, .233), ("Ames inverted triangle", 3.113, .209)]
rr = []
for n, M, r in SY7:
    c = interp(S7, M)
    if c is None: c = S7[1.50] + (S7[1.50] - S7[1.55]) / 0.05 * (1.50 - M)   # extrapolated below 1.50 (under the PARD band)
    rr.append((1 - r) / (1 - c))
    print(f"    {n:30s} M' {M:.3f}: {r:.3f} vs curve {c:.3f}: base drag over curve {(1 - r) / (1 - c):.3f}")
print(f"  11 symbols M' 1.45 to 3.2: {min(rr):.3f} to {max(rr):.3f}   (first reading: 0.961 to 1.067; symbols re-read after the first reading was opened)")
print("  Ames square at 1.492 against a curve at 1.475 to 1.50 of 0.474 to 0.485 (first reading's curve there): %.3f to %.3f" % ((1 - .508) / (1 - .474), (1 - .508) / (1 - .485)))
print("  the Ames square pair at M' 2.0 read separately (0.381 and 0.367): %.3f and %.3f" % ((1 - .381) / (1 - interp(S7, 1.998)), (1 - .367) / (1 - interp(S7, 1.998))))

print("=== 3. TN 3819 fig. 5 (P_B): first minus second; second error +-0.0015 solid, +-0.003 dashed and Chapman")
F5 = {1.5: (-0.340, -0.335, -0.307), 2.0: (-0.229, -0.226, -0.208), 2.5: (-0.164, -0.156, -0.148), 3.0: (-0.121, -0.112, -0.107)}
S5 = {1.5: (-0.3408, -0.3355, -0.3075), 2.0: (-0.234, -0.230, -0.2076), 2.5: (-0.1639, -0.1556, -0.1475), 3.0: (-0.1224, -0.1124, -0.1074)}
for M in F5:
    print(f"  M {M}: A {F5[M][0] - S5[M][0]:+.4f}, B {F5[M][1] - S5[M][1]:+.4f}, solid {F5[M][2] - S5[M][2]:+.4f}")
print("  (M 3.0 Chapman second value interpolated between 2.8 and 3.2; M 1.5 and 2.0 A/B order not resolved in the second reading)")
for M in F5:
    c = PB(interp(S7, M), M); A, B, S = S5[M]
    print(f"  M {M}: second line A over second fig. 7 curve {A / c:.3f}; solid over A {S / A:.3f} (base drag)")

print("=== 4. TN D-1056 table II: the retyping (readings/tn-d-1056_table2.csv) equals the first typing in every power-off row")
X15 = []
for l in open("readings/tn-d-1056_table2.csv"):
    if l.startswith("#") or l.startswith("flight"): continue
    p = l.strip().split(",")
    if p[2] != "0" or p[9] != "Closed": continue
    cps = [float(v) for v in p[12:15] if v != "-"]
    X15.append((p[0], float(p[1]), float(p[3]), sum(cps) / len(cps)))
rf, rw = [], []
for fl, t, M, cp in X15:
    if not (1.45 <= M <= 3.25): continue
    c = interp(S7, M); flat = PB(c, M); rf.append((cp / flat, M))
    p21, M2 = oblique(M, 5.0); cw = interp(S7, M2)
    if cw is not None: rw.append((cp / (PB(p21 * cw, M)), M))
print(f"  {len(rf)} power-off points M 1.52 to 3.24; flat-sided (M' = M) on the second fig. 7 curve: {min(rf)[0]:.3f} (M {min(rf)[1]}) to {max(rf)[0]:.3f} (M {max(rf)[1]})")
print("    below M 2.5: %.3f to %.3f; above: %.3f to %.3f" % (min(r for r, M in rf if M < 2.5), max(r for r, M in rf if M < 2.5), min(r for r, M in rf if M >= 2.5), max(r for r, M in rf if M >= 2.5)))
print(f"  local conditions behind the 5 deg face: {min(rw)[0]:.3f} to {max(rw)[0]:.3f}   (first: 0.934 to 1.201; 1.27 to 1.72)")
print("  with the first-reading fig. 7 curve the flat-sided range is (same table):",
      "%.3f to %.3f" % (min(cp / PB(interp(F7, M), M) for _, _, M, cp in X15 if 1.45 <= M <= 3.25), max(cp / PB(interp(F7, M), M) for _, _, M, cp in X15 if 1.45 <= M <= 3.25)))

print("=== 5. Laminar over turbulent base drag at the fin's correlation abscissae (turbulent 0.69 to 0.76, laminar 0.0089 to 0.0115)")
T075 = {1.5: .492, 2.0: .3606, 3.1: .2045}
for M in (1.5, 2.0, 3.1):
    vals = []
    for u in (0.010, 0.0115):
        vals.append((u, (1 - interp(S29b[M], u)) / (1 - T075[M])))
    print(f"  M {M}: laminar/turbulent " + ", ".join(f"at {u}: {v:.3f}" for u, v in vals))
# extrapolations to 0.0089 (M 1.5 starts near 0.0095)
ex15 = .3576 - (.395 - .3576) / 0.0015 * 0.0011; ex20 = .4389 - (.459 - .4389) / 0.0015 * 0.0011
print(f"  at 0.0089 (extrapolated, M 1.5 curve starts near 0.0095): M 1.5 {(1 - ex15) / (1 - T075[1.5]):.3f}, M 2.0 {(1 - ex20) / (1 - T075[2.0]):.3f}, M 3.1 {(1 - .2362) / (1 - T075[3.1]):.3f} (0.009 read)")

print("=== 6. TN 2960: front side over modified Newtonian (second reading, symbols), see readings/tn2960_fig5c.csv")
print("  M 1.49 1.000, M 1.98 1.046, M 2.90 1.053 on (2/3) Cp_pitot (Simpson, 15 deg); on (2/3) P(0) read: 1.008, 1.028, 1.052")
print("  first: 0.995, 1.049, 1.056. Faired curves at 45 deg (second, column scans at 42.0 and 48.6 deg, linear): M 2.90 0.974, M 1.98 0.884, M 1.49 0.767; first 0.979, 0.918, 0.769")
d = 0.034 * math.cos(math.radians(45)) * math.radians(15)
print(f"  effect of the M 1.98 45 deg value (0.918 vs 0.884) on the first front integral: -{d:.4f} -> ratio {1.156 / (2 / 3 * 1.654) - d / (2 / 3 * 1.654):.3f} (first 1.049)")

print("=== 7. TR 1109 fig. 8 point by point: first (by eye) minus second; second error +-0.02 in X, +-0.006 in p_b/p_inf")
F8 = {1.5: [(0.55, 0.507, 0.497), (0.75, 0.505, 0.496), (0.75, 0.485, 0.496), (1.0, 0.506, 0.494), (1.12, 0.495, 0.493),
            (1.12, 0.470, 0.493), (1.5, 0.503, 0.492), (1.5, 0.485, 0.492), (2.25, 0.506, 0.490), (2.25, 0.468, 0.490),
            (3.0, 0.490, 0.487), (4.5, 0.535, 0.520)],
      2.0: [(0.55, 0.338, 0.357), (0.75, 0.379, 0.360), (0.75, 0.342, 0.360), (1.0, 0.360, 0.362), (1.15, 0.383, 0.366),
            (1.15, 0.327, 0.366), (1.5, 0.359, 0.373), (2.25, 0.381, 0.393), (2.25, 0.343, 0.393), (2.25, 0.362, 0.393),
            (3.0, 0.415, 0.410), (4.5, 0.445, 0.445)],
      3.1: [(0.55, 0.183, 0.188), (0.7, 0.198, 0.196), (0.9, 0.227, 0.209), (1.05, 0.205, 0.218), (1.4, 0.240, 0.239),
            (2.05, 0.290, 0.283), (2.0, 0.275, 0.280), (2.75, 0.325, 0.322), (4.2, 0.410, 0.410)]}
for M in (1.5, 2.0, 3.1):
    mine = sorted(sym[M], key=lambda t: t[1]); used = set(); ds = []; dc = []
    for X, r, c in F8[M]:
        pool = [i for i in range(len(mine)) if i not in used] or list(range(len(mine)))
        best = min(pool, key=lambda i: (abs(mine[i][1] - X) / 0.05) ** 2 + (abs(mine[i][2] - r) / 0.01) ** 2)
        used.add(best); ds.append(r - mine[best][2])
        cm = interp(C8[M], X) if interp(C8[M], X) is not None else C8[M][min(C8[M])]
        dc.append(c - cm)
    print(f"  M {M}: symbols first minus second {min(ds):+.3f} to {max(ds):+.3f} (median {sorted(ds)[len(ds)//2]:+.3f}); faired curve first minus second {min(dc):+.3f} to {max(dc):+.3f}")
    rf = [(1 - r) / (1 - c) for X, r, c in F8[M]]
    print(f"         first reading's own band at this Mach number: {min(rf):.3f} to {max(rf):.3f}")
