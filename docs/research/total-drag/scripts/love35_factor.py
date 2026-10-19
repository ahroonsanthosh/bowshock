"""Fins-on-base factor F = P_B(fins at the base) / P_B(no fins) from NACA TN 3819 fig. 35 (t/c 0.10 circular-arc
rectangular fins, x/c 0, no sweep; first reading, second pending), and the band applied to the Basic Finner.
Inputs (all from saved outputs):
  free-flight finned curve (ref. 12, R 10e6 to 120e6): love35_track.py, upper fin line, M 1.8 to 2.8
      (data/love_fig35_track_output.txt); M 2.97 and 3.0 by linear extrapolation of 2.7 to 2.8 (labelled);
  no-fin curve: the figure's "present estimate, no fins", which reproduces the less negative compiled curve of
      fig. 18 within 0.001 (love_fig35_cols_output.txt against love_tn3819_fig18.csv); the adopted fig. 18 values
      are used, linear in M between table rows;
  tunnel pairs, same tunnel, with and without fins (love35_symbols reading on img/love_fins/f35_symbols.png):
      ref. 26 (TN 2360) M 1.50: -0.325 / -0.194; M 2.00: -0.208 / -0.150; Langley 9 in M 2.41: -0.164 / -0.120.
Reading error of the free-flight line: +-0.005 in P_B at M 1.8 to 2.1, where it runs within 0.005 of estimate B
and the two cannot be told apart (love_fig35_cols_output.txt: two lines 0.0047 to 0.0050 apart at M 1.85, 1.95),
+-0.002 elsewhere. Basic Finner band (fins of maximum t/c 0.08, at the base): F_low = 1 + 0.5 (F_ff,low - 1),
since TN 2360 found the increments of 5%-thick fins about half those of 10% (summary); F_high = the larger of
F_ff,high and the tunnel factor (tunnel pairs interpolated linearly in M, available to M 2.41 only)."""
ff = {1.8: -0.2362, 1.9: -0.2108, 2.0: -0.1905, 2.1: -0.1746, 2.2: -0.1649, 2.3: -0.1587, 2.4: -0.1538,
      2.5: -0.1490, 2.6: -0.1445, 2.7: -0.1401, 2.8: -0.1359}
ff[2.97] = ff[2.8] + (ff[2.8] - ff[2.7]) / 0.1 * 0.17
ff[3.0] = ff[2.8] + (ff[2.8] - ff[2.7]) / 0.1 * 0.2
nofin_tab = [(1.8, -0.1569), (1.935, -0.1486), (2.0, -0.1447), (2.2, -0.1331), (2.4, -0.1224), (2.5, -0.1172),
             (2.681, -0.1088), (2.8, -0.1039), (3.0, -0.0964)]
def nofin(M):
    for (m1, p1), (m2, p2) in zip(nofin_tab, nofin_tab[1:]):
        if m1 <= M <= m2:
            return p1 + (M - m1) / (m2 - m1) * (p2 - p1)
tun = [(1.5, 0.325 / 0.194), (2.0, 0.208 / 0.150), (2.41, 0.164 / 0.120)]
def ftun(M):
    for (m1, f1), (m2, f2) in zip(tun, tun[1:]):
        if m1 <= M <= m2:
            return f1 + (M - m1) / (m2 - m1) * (f2 - f1)
    return None
print('tunnel factors: ' + ', '.join('M %.2f %.3f' % t for t in tun))
print('M      P_B ff    P_B no fins  F_ff    F_tunnel  BasicFinner F_low  F_high')
out = []
for M in sorted(ff):
    F = ff[M] / nofin(M)
    e = (0.005 if M <= 2.1 else 0.002) / abs(nofin(M))
    ft = ftun(M)
    lo = 1 + 0.5 * (F - e - 1)
    hi = max(F + e, ft) if ft else F + e
    tag = ' (extrapolated)' if M > 2.8 else ''
    print('%.2f   %.4f    %.4f      %.3f   %s     %.3f        %.3f%s' % (M, ff[M], nofin(M), F, '%.3f' % ft if ft else ' n/a ', lo, hi, tag))
    out.append((M, ff[M], nofin(M), F, ft, lo, hi))
import csv
with open('data/love_fig35_factor.csv', 'w', newline='') as f:
    w = csv.writer(f)
    f.write('# Fins-on-base factor from NACA TN 3819 fig. 35 (scripts/love35_factor.py; inputs in its docstring)\n')
    w.writerow(['M', 'PB_free_flight_finned', 'PB_no_fins', 'F_free_flight', 'F_tunnel', 'F_low_basic_finner', 'F_high_basic_finner', 'note'])
    for M, p, q, F, ft, lo, hi in out:
        w.writerow(['%.2f' % M, '%.4f' % p, '%.4f' % q, '%.3f' % F, '%.3f' % ft if ft else '', '%.3f' % lo, '%.3f' % hi, 'extrapolated from M 2.7 to 2.8' if M > 2.8 else ''])
