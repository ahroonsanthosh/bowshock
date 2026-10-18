"""Independent check of finwave.py: linearised zero-lift wave drag of a thin fin
on a reflection plane by the supersonic area rule (Hayes; Lomax and Heaslet):
the fin plus its image is a symmetric planar wing of span 2s; its wave drag is the
average over roll angle theta of von Karman slender-body drags of the area
distributions cut by oblique Mach planes x' - beta*y*cos(theta) = x:
  D/q = (1/pi) int_0^pi Dvk(theta) dtheta / ... (average over theta in [0, pi])
  Dvk/q = (pi/4) sum n A_n^2,  S'(x(phi)) = sum A_n sin(n phi), x = x0 + L(1 - cos phi)/2.
S'(x) = sum_k 2 lambda_k * (spanwise measure of the cut line inside chord segment k),
computed exactly for straight segment-boundary lines.  The fin's drag is half the wing's.
Strip reference as in finwave.py: 4 <lambda^2>/beta per unit planform area.
Self-test: long unswept double-wedge wing against 4 (t/c)^2/beta."""
import math
import numpy as np


def measure_between(x, bc, a_lo, b_lo, a_hi, b_hi, side, s):
    """Measure of y in the half-span [0,s] (side=+1) or [-s,0] (side=-1) where
    a_lo + b_lo|y| <= x + bc*y < a_hi + b_hi|y|; x is an array."""
    # write in u = |y| in [0, s]: y = side*u, line: x + bc*side*u
    c = bc * side
    lo = np.zeros_like(x); hi = np.full_like(x, s)

    def clip_halfline(lo, hi, A, B):
        # require A + B*u >= 0 for u in [lo, hi]
        if abs(B) < 1e-15:
            return lo, np.where(A < 0, -1.0, hi)
        u0 = -A / B
        if B > 0:
            lo = np.maximum(lo, u0)
        else:
            hi = np.minimum(hi, u0)
        return lo, hi
    # x + c u - (a_lo + b_lo u) >= 0
    lo, hi = clip_halfline(lo, hi, x - a_lo, c - b_lo)
    # (a_hi + b_hi u) - (x + c u) > 0
    lo, hi = clip_halfline(lo, hi, a_hi - x, b_hi - c)
    return np.maximum(hi - lo, 0.0)


def wave_drag(cr, s, tan_le, tan_te, f, g, M, ntheta=96, nphi=1200, nmodes=400):
    beta = math.sqrt(M * M - 1)
    f = np.asarray(f, float); g = np.asarray(g, float)
    lam = np.diff(g) / np.diff(f)
    a = f * cr
    b = tan_le + f * (tan_te - tan_le)
    area_fin = s * (cr + cr + s * (tan_te - tan_le)) / 2
    th = (np.arange(ntheta) + 0.5) * (math.pi / ntheta)  # theta in (0, pi)
    phi = (np.arange(nphi) + 0.5) * (math.pi / nphi)
    n = np.arange(1, nmodes + 1)
    sinnphi = np.sin(np.outer(n, phi))
    D = 0.0
    for t in th:
        bc = beta * math.cos(t)
        # extent of x = x' - bc*y over the planform corners (wing: y in [-s, s])
        xs = []
        for yy in (-s, 0.0, s):
            for k in (0, len(f) - 1):
                xs.append(a[k] + b[k] * abs(yy) - bc * yy)
        x0, x1 = min(xs), max(xs)
        L = x1 - x0
        x = x0 + L * (1 - np.cos(phi)) / 2
        Sp = np.zeros_like(x)
        for k in range(len(f) - 1):
            if lam[k] == 0:
                continue
            for side in (1, -1):
                Sp += 2 * lam[k] * measure_between(x, bc, a[k], b[k], a[k + 1], b[k + 1], side, s)
        A = (2 / math.pi) * (sinnphi * Sp).sum(axis=1) * (math.pi / nphi)
        D += (math.pi / 4) * np.sum(n * A * A)
    D /= ntheta  # average over theta
    D_fin = D / 2
    # strip reference: 4/beta * int lambda^2 dA over the fin; chordwise mean of lambda^2 times area
    lam2 = np.sum(lam ** 2 * np.diff(f))
    D_strip = 4 / beta * lam2 * area_fin
    return D_fin / area_fin, D_strip / area_fin


if __name__ == "__main__":
    tc = 0.05
    dw = ([0.0, 0.5, 1.0], [0.0, tc / 2, 0.0])
    print("self-test, unswept double wedge, span/chord 20 (tip effects ~1/(beta*AR)):")
    for M in (1.5, 2.0):
        cd3, cd2 = wave_drag(1.0, 20.0, 0.0, 0.0, *dw, M)
        print(f"  M {M}: Hayes/strip = {cd3 / cd2:.4f}")
    cases = {
        "ARCAS cr3.38 s2.103 LE30 ridge0.536": (3.38, 2.103, math.tan(math.radians(30)), 0.0, ([0, 0.536, 1], [0, tc / 2, 0])),
        "C trapezoid cr1 s1 LE26.6 taper0.5": (1.0, 1.0, 0.5, 0.0, dw),
        "B clipped delta cr1 s0.5 LE45": (1.0, 0.5, 1.0, 0.0, dw),
        "D rectangle 1x1": (1.0, 1.0, 0.0, 0.0, dw),
        "E swept TE LE45 TE16.7": (1.0, 0.75, 1.0, 0.3, dw),
        "F A53D02 planform LE71.6": (0.75, 0.125, 3.0, 0.0, dw),
        "G clipped delta cr1 s1 LE36.9": (1.0, 1.0, 0.75, 0.0, dw),
        "rect span/chord 0.2": (1.0, 0.2, 0.0, 0.0, dw),
    }
    for name, (cr, s, tl, tt, (f, g)) in cases.items():
        out = []
        for M in (1.2, 1.5, 2.0, 3.0):
            cd3, cd2 = wave_drag(cr, s, tl, tt, f, g, M)
            out.append(f"M{M}: {cd3 / cd2:.3f}")
        print(name, " ".join(out), flush=True)
