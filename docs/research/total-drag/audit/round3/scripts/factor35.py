"""Fins-on-base factor of 0008 section 3.4 recomputed from the auditor's fig. 35 reading.
F = P_B(free flight, finned) / P_B(no fins), no-fin = the less negative fig. 18 curve (round 1 reading,
round 3 confirmed), as in 0008. Band for the Basic Finner, 0008's rule: low = 1 + (F_ff - 1)/2 minus half the
reading error of F; high = max(F_ff + error, tunnel factor interpolated in M, tunnel only to M 2.41).
Also: F with the more negative (Chapman) curve as the no-fin reference, and F from fig. 35's own body-alone line."""
import numpy as np
ff = {1.8: -0.2361, 1.9: -0.2107, 2.0: -0.1903, 2.1: -0.1745, 2.2: -0.1652, 2.3: -0.1587, 2.4: -0.1539,
      2.5: -0.1490, 2.6: -0.1443, 2.7: -0.1399, 2.8: -0.1358, 2.9: -0.1319, 2.97: -0.1290, 3.0: -0.1278}
err = {M: (0.004 if 1.75 <= M <= 2.35 else 0.002) for M in ff}
err[2.97] = 0.003; err[3.0] = 0.003   # end of the traced line (2.99), short extrapolation
# fig. 18 compiled curves (round 1 reading; round 3 confirms 1.935/2.0/3.0): less negative, more negative
less = {1.8: -0.1569, 1.9: -0.1508, 2.0: -0.1447, 2.1: -0.1389, 2.2: -0.1331, 2.3: -0.1278, 2.4: -0.1224,
        2.5: -0.1172, 2.6: -0.1124, 2.7: -0.1080, 2.8: -0.1039, 2.9: -0.1001, 2.97: -0.0974, 3.0: -0.0964}
more = {1.8: -0.1625, 1.9: -0.1561, 2.0: -0.1496, 2.1: -0.1431, 2.2: -0.1367, 2.3: -0.1307, 2.4: -0.1250,
        2.5: -0.1196, 2.6: -0.1144, 2.7: -0.1100, 2.8: -0.1055, 2.9: -0.1016, 2.97: -0.0987, 3.0: -0.0978}
tun = [(1.502, 0.3251 / 0.1941), (2.003, 0.2077 / 0.1500), (2.405, 0.1648 / 0.1202)]
tM = np.array([t[0] for t in tun]); tF = np.array([t[1] for t in tun])
print("tunnel factors (auditor's symbols):", ", ".join(f"M {m:.3f} {f:.3f}" for m, f in tun))
print("M     F_ff   +-     F_ff(Chapman ref)  F_tunnel  low    high   half-width/mid")
for M in sorted(ff):
    F = ff[M] / less[M]; eF = err[M] / abs(less[M]); Fc = ff[M] / more[M]
    Ft = float(np.interp(M, tM, tF)) if M <= 2.41 else float("nan")
    low = 1 + (F - 1) / 2 - eF / 2
    high = max(F + eF, Ft) if M <= 2.41 else F + eF
    mid = (low + high) / 2
    print(f"{M:.2f}  {F:.3f}  {eF:.3f}  {Fc:.3f}              {Ft if Ft == Ft else float('nan'):.3f}     {low:.3f}  {high:.3f}  +-{100 * (high - mid) / mid:.1f}%")
