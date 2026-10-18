"""Linearised supersonic thickness (zero-lift wave) drag of a thin fin on a reflection plane.

Source-sheet formulation (linear theory, symmetric section, zero lift):
  phi(x,y) = -(1/pi) * Int Int lambda(xi,eta) / sqrt((x-xi)^2 - beta^2 (y-eta)^2) dxi deta
  over the forward Mach cone, lambda = dh/dx (surface slope). Cp = -2 dphi/dx on the surface.
The xi-integral of a segment with constant slope is done analytically, so
  u(x,y) = -(1/pi) Int deta Sum_k lambda_k(eta) [K(x - x_k(eta)) - K(x - x_{k+1}(eta))],
  K(d) = 1/sqrt(d^2 - B^2) for d > B, B = beta |y - eta|, else 0.
The eta integral is split at every point where a breakpoint line meets the Mach cone
(inverse-square-root endpoints) and at eta = y, 0, +-s; each piece uses the substitution
eta = a + (b - a) sin^2(t) with Gauss-Legendre in t.

The fin occupies 0 <= y <= s with its image in -s <= y < 0 (body wall as a plane wall).
Drag coefficient of one fin (both faces), on its planform area S:
  CD = (2 / S) Int Int Cp * lambda dx dy.
Strip (2D Ackeret) reference on the same planform: CD_strip = (4 / (beta S)) Int Int lambda^2 dx dy.
"""
import math
import numpy as np


class Fin:
    """Planform: x_le(y) = y tan(le), chord c(y) = cr + y (tan(te) - tan(le)) for 0 <= y <= s.
    Section given by breakpoints (f_k, g_k): x_k = x_le + f_k c, half-thickness h_k = g_k c
    (constant thickness ratio), with f_0 = 0, f_last = 1."""

    def __init__(self, cr, s, tan_le, tan_te, f, g):
        self.cr, self.s, self.tl, self.tt = cr, s, tan_le, tan_te
        self.f = np.asarray(f, float)
        self.g = np.asarray(g, float)
        self.slope = np.diff(self.g) / np.diff(self.f)  # lambda per segment (dimensionless)
        # breakpoint line k: x_k(y) = a_k + b_k * |y|
        c_slope = tan_te - tan_le
        self.a = self.f * cr
        self.b = tan_le + self.f * c_slope

    def chord(self, y):
        return self.cr + abs(y) * (self.tt - self.tl)

    def area(self):
        return self.s * (self.cr + self.chord(self.s)) / 2

    def xk(self, k, eta):
        return self.a[k] + self.b[k] * np.abs(eta)


_GL_CACHE = {}


def gl(n):
    if n not in _GL_CACHE:
        _GL_CACHE[n] = np.polynomial.legendre.leggauss(n)
    return _GL_CACHE[n]


def u_at(fin, beta, x, y, n=24):
    """Perturbation velocity u (per unit free-stream speed) on the fin surface at (x, y)."""
    s = fin.s
    br = {-s, 0.0, s, y}
    nk = len(fin.f)
    for k in range(nk):
        a, b = fin.a[k], fin.b[k]
        for sgn in (1.0, -1.0):  # sgn = +1: eta >= 0 side, -1: image side, x_k = a + b*sgn*eta
            bb = b * sgn
            # x - a - bb*eta = beta*(y - eta)  (eta < y)
            den = bb - beta
            if abs(den) > 1e-14:
                br.add((x - a - beta * y) / den)
            den = bb + beta
            if abs(den) > 1e-14:
                br.add((x - a + beta * y) / den)
    pts = sorted(p for p in br if -s - 1e-15 <= p <= s + 1e-15)
    t, w = gl(n)
    tt = (t + 1) * math.pi / 4  # t in [0, pi/2]
    ww = w * math.pi / 4
    s2 = np.sin(tt) ** 2
    jac = 2 * np.sin(tt) * np.cos(tt)
    total = 0.0
    for lo, hi in zip(pts[:-1], pts[1:]):
        if hi - lo < 1e-14:
            continue
        eta = lo + (hi - lo) * s2
        dj = (hi - lo) * jac * ww
        B = beta * np.abs(y - eta)
        acc = np.zeros_like(eta)
        for k in range(nk - 1):
            lam = fin.slope[k]
            for kk, sign in ((k, 1.0), (k + 1, -1.0)):
                d = x - fin.xk(kk, eta)
                arg = d * d - B * B
                m = (d > B) & (arg > 0)
                val = np.zeros_like(eta)
                val[m] = 1.0 / np.sqrt(arg[m])
                acc += sign * lam * val
        total += float(np.sum(acc * dj))
    return -total / math.pi


def drag(fin, M, ny=24, nx=20, neta=24, y_range=None):
    """Returns (CD_linear_3D, CD_strip_2D) for one fin, both faces, on its planform area.
    Also returns spanwise section drag ratio arrays."""
    beta = math.sqrt(M * M - 1)
    s = fin.s
    t, w = gl(ny)
    # cluster near root and tip
    th = (t + 1) * math.pi / 4
    yy = s * np.sin(th) ** 2
    wy = s * 2 * np.sin(th) * np.cos(th) * w * math.pi / 4
    tx, wx = gl(nx)
    thx = (tx + 1) * math.pi / 4
    sx = np.sin(thx) ** 2
    jx = 2 * np.sin(thx) * np.cos(thx) * wx * math.pi / 4
    D3 = 0.0
    D2 = 0.0
    sec = []
    for y, wyy in zip(yy, wy):
        c = fin.chord(y)
        sec3 = 0.0
        sec2 = 0.0
        for k in range(len(fin.f) - 1):
            lam = fin.slope[k]
            x0 = fin.xk(k, y)
            x1 = fin.xk(k + 1, y)
            if lam == 0.0:
                continue
            xs = x0 + (x1 - x0) * sx
            for xv, wv in zip(xs, jx * (x1 - x0)):
                cp = -2.0 * u_at(fin, beta, xv, y, neta)
                sec3 += cp * lam * wv
            sec2 += 2 * lam * lam / beta * (x1 - x0)
        sec.append((y / s, sec3 / sec2 if sec2 else float('nan')))
        D3 += 2 * sec3 * wyy
        D2 += 2 * sec2 * wyy
    S = fin.area()
    return D3 / S, D2 / S, sec


def section_drag(fin, M, y, nx=24, neta=24):
    """Section drag coefficient (both faces, on local chord) at span station y."""
    beta = math.sqrt(M * M - 1)
    tx, wx = gl(nx)
    thx = (tx + 1) * math.pi / 4
    sx = np.sin(thx) ** 2
    jx = 2 * np.sin(thx) * np.cos(thx) * wx * math.pi / 4
    c = fin.chord(y)
    tot = 0.0
    for k in range(len(fin.f) - 1):
        lam = fin.slope[k]
        x0 = fin.xk(k, y)
        x1 = fin.xk(k + 1, y)
        xs = x0 + (x1 - x0) * sx
        for xv, wv in zip(xs, jx * (x1 - x0)):
            tot += -2.0 * u_at(fin, beta, xv, y, neta) * lam * wv
    return 2 * tot / c


def double_wedge(tc, ridge=0.5):
    return [0.0, ridge, 1.0], [0.0, tc / 2, 0.0]
