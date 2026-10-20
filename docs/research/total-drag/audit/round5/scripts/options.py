"""Round 5: the record-level ambiguities, each measured. Blind: written before src/, tests/ and the gate outputs
were opened. Prints (1) the fins-on-base rows against 0010 section 1.3's table, (2) the curvature bound,
(3) every option's effect on each shot's total, base and band ends."""
import math
import bf_total_indep as B

print("=== 1. fins-on-base rows, direct evaluation, against 0010 section 1.3")
TAB = {1.80: (1.236, 1.537), 2.00: (1.140, 1.387), 2.20: (1.101, 1.378), 2.40: (1.120, 1.371), 2.50: (1.127, 1.411),
       2.60: (1.133, 1.425), 2.80: (1.144, 1.448), 2.90: (1.148, 1.457), 2.97: (1.146, 1.463), 3.00: (1.147, 1.465)}
print(f"  tunnel excess (largest over readings): {B.tunnel_excess(0.002):.4f}")
for e in (0.002, 0.003):
    print(f"  round-3 reading error at M 2.97 and 3.00: +-{e}")
    for M, (lo, hi) in TAB.items():
        a, b, c = B.fins_on_base_band(M, e)
        flag = "" if (abs(a - lo) < 6e-4 and abs(b - hi) < 6e-4) else "   <-- differs"
        print(f"    M {M:.2f}: {a:.4f} to {b:.4f}, half-width {100 * (b - c) / c:.1f}%   (0010: {lo} to {hi}){flag}")
# without the first reading's extrapolation to 2.97 / 3.00
FF1_full = list(B.FF1)
B.FF1 = [r for r in FF1_full if r[0] <= 2.85]
a, b, c = B.fins_on_base_band(2.90, 0.002)
print(f"  without the first reading's extrapolation: M 2.90 {a:.4f} to {b:.4f} (0010: 1.148 to 1.457)")
B.FF1 = FF1_full

print("=== 2. curvature bound from the twice-read nodes (0010 section 1.1: 0.0634)")
# twice-read less negative nodes: 0008's robust-fit confirmations and round 3
less2 = [(1.5, -0.1733), (1.63, -0.1667), (1.935, -0.1486), (2.0, -0.1447), (2.414, -0.1216), (2.5, -0.1172),
         (2.681, -0.1088), (3.0, -0.0964), (3.243, -0.0881), (3.497, -0.0803)]
more2 = [(1.5, -0.1775), (1.63, -0.1717), (1.935, -0.1539), (2.0, -0.1496), (2.414, -0.1243), (2.5, -0.1196),
         (2.681, -0.1107), (3.0, -0.0978), (3.243, -0.0885), (3.497, -0.0803)]
for name, t in (("less negative", less2), ("more negative", more2)):
    best = 0
    for (x0, y0), (x1, y1), (x2, y2) in zip(t, t[1:], t[2:]):
        dd = ((y2 - y1) / (x2 - x1) - (y1 - y0) / (x1 - x0)) / (x2 - x0)
        best = max(best, abs(2 * dd))
    print(f"  {name}: largest 2 x second divided difference {best:.4f}")
print("  bound at the shots: " + ", ".join(f"{s[1]}: {B.interp_bound(s[1]):.2e}" for s in B.SHOTS))

print("=== 3. options (each against the default)")
base = {o["shot"]: o for o in B.run(B.DEFAULT)}
OPTS = [("F band from rows 1.80, 1.90, ..., 2.41, ..., 3.00, then linear in M", dict(F_mode="rows")),
        ("round-3 error +-0.003 at M 2.97 and 3.00 (factor35.py)", dict(r3_err_end=0.003)),
        ("interpolation bound not times F", dict(interp_times_F=False)),
        ("laminar band: readings not crossed", dict(lam_crossed=False)),
        ("transition Re_T on the axial distance", dict(transition_on="x")),
        ("cone friction: surface shear, not its axial component", dict(axial=False))]
for label, ch in OPTS:
    opt = dict(B.DEFAULT); opt.update(ch)
    res = B.run(opt)
    print(f"  {label}")
    for o in res:
        r = base[o["shot"]]
        d = {k: o[k] - r[k] for k in ("total", "base", "body_friction", "band_lo", "band_hi", "transition_lo",
                                      "te_lam_lo", "te_lam_hi", "tol_lo", "tol_hi")}
        if max(abs(v) for v in d.values()) < 5e-6:
            continue
        print(f"    {o['shot']} M {o['M']:.3f}: total {d['total']:+.5f} ({100 * d['total'] / r['total']:+.2f}%), "
              f"base {d['base']:+.5f}, body friction {d['body_friction']:+.5f}, band {d['band_lo']:+.5f} / "
              f"{d['band_hi']:+.5f}, transition {d['transition_lo']:+.5f}, TE lam {d['te_lam_lo']:+.5f} / "
              f"{d['te_lam_hi']:+.5f}, tolerance {100 * d['tol_lo']:+.2f} / {100 * d['tol_hi']:+.2f} points")
