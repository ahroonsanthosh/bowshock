"""Upper bound for a square (flat-faced) fin leading edge: face pressure <= pitot pressure behind a normal
shock (Rayleigh pitot formula). cd_LE <= Cp_pitot * t/c on the chord, against sharp double-wedge wave drag
4 (t/c)^2 / beta (Ackeret; exact within 1% at M >= 1.5, section2d.py)."""
import math
g = 1.4
def cp_pitot(M):
    p02_p1 = ((g + 1) ** 2 * M * M / (4 * g * M * M - 2 * (g - 1))) ** (g / (g - 1)) * (1 - g + 2 * g * M * M) / (g + 1)
    return (p02_p1 - 1) / (g / 2 * M * M)
for M in (1.2, 1.5, 2.0, 2.5, 3.0):
    b = math.sqrt(M * M - 1)
    for tc in (0.03, 0.05):
        print('M=%.1f Cp_pitot=%.4f  t/c=%.2f: square-LE bound cd=%.4f, sharp double wedge cd=%.5f, ratio=%.1f' % (
            M, cp_pitot(M), tc, cp_pitot(M) * tc, 4 * tc * tc / b, cp_pitot(M) * tc / (4 * tc * tc / b)))
