"""Independent exact (shock-expansion) drag of a symmetric double wedge, for the audit.
Weak oblique-shock angle from the cubic in sin^2(beta) (Thompson's form, weak root),
Prandtl-Meyer inverted by Newton, pressures referred to free stream.  Compared with
Ackeret 4 (t/c)^2 / sqrt(M^2 - 1)."""
import math
g = 1.4


def beta_weak(M, th):
    # cubic in x = sin^2(beta):  x^3 + b x^2 + c x + d = 0  (Anderson / NACA 1135 eq. 150)
    s = math.sin(th) ** 2
    b = -(M * M + 2) / (M * M) - g * s
    c = (2 * M * M + 1) / M ** 4 + ((g + 1) ** 2 / 4 + (g - 1) / (M * M)) * s
    d = -math.cos(th) ** 2 / M ** 4
    # trigonometric solution of the cubic; three real roots when attached
    p = c - b * b / 3
    q = 2 * b ** 3 / 27 - b * c / 3 + d
    disc = (q / 2) ** 2 + (p / 3) ** 3
    if disc > 0:
        return None  # detached
    r = 2 * math.sqrt(-p / 3)
    phi = math.acos(3 * q / (p * r))
    roots = sorted(r * math.cos((phi - 2 * math.pi * k) / 3) - b / 3 for k in range(3))
    # roots: one spurious (smallest, gives expansion), weak (middle), strong (largest)
    x = roots[1]
    return math.asin(math.sqrt(x))


def nu(M):
    a = math.sqrt((g + 1) / (g - 1))
    return a * math.atan(math.sqrt((M * M - 1) / (a * a))) - math.atan(math.sqrt(M * M - 1))


def M_of_nu(v, M0=2.0):
    M = M0
    for _ in range(60):
        dnu = math.sqrt(M * M - 1) / (1 + (g - 1) / 2 * M * M) / M
        M -= (nu(M) - v) / dnu
    return M


def cd(M, tc):
    th = math.atan(tc)
    b = beta_weak(M, th)
    if b is None:
        return None
    Mn = M * math.sin(b)
    p2 = 1 + 2 * g / (g + 1) * (Mn * Mn - 1)
    Mn2 = math.sqrt((1 + (g - 1) / 2 * Mn * Mn) / (g * Mn * Mn - (g - 1) / 2))
    M2 = Mn2 / math.sin(b - th)
    M3 = M_of_nu(nu(M2) + 2 * th, M2)
    p3 = p2 * ((1 + (g - 1) / 2 * M2 * M2) / (1 + (g - 1) / 2 * M3 * M3)) ** (g / (g - 1))
    q = g / 2 * M * M
    return ((p2 - 1) - (p3 - 1)) / q * tc


for tc in (0.03, 0.05, 0.08):
    row = []
    for M in (1.2, 1.3, 1.5, 2.0, 2.5, 3.0):
        e = cd(M, tc)
        row.append("M%.1f: %s" % (M, "detached" if e is None else "%.4f" % (e / (4 * tc * tc / math.sqrt(M * M - 1)))))
    print("t/c %.2f exact/Ackeret " % tc + "  ".join(row))
