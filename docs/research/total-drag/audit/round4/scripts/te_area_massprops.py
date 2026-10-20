"""Basic Finner (DREV TM 9703) fin trailing-edge base area from the report's own geometry and mass
properties, no drag values used.  Fig. 2: body 10 cal, d = 1 cal = 30 mm, 10 deg cone nose 2.84 cal,
four fins, chord 1.0 cal ending at the base, span 1.0 cal outboard of the body, chordwise wedge from a
sharp leading edge (R 0.004) to 0.08 cal at the base.  Two readings of the spanwise section:
  A: constant thickness along the span -> base area per fin 0.08 x 1.0, total 0.32 cal^2
  B: thickness tapering linearly to zero at the tip -> 0.04 per fin, total 0.16 cal^2
Model: solid steel body and fins (7.85 g/cc), nose cone density solved so the mass is the measured 1.58 kg.
Compare Ix (axial) and Iy (transverse, about the CG) and CG with table I (Ix 1.92, Iy 97.85 kg cm^2,
CG 5.50 cal) and table II (Ix 0.191e-3 to 0.193e-3 kg m^2 = 1.91 to 1.93 kg cm^2, Iy 0.977e-2 to 0.982e-2
kg m^2 = 97.7 to 98.2 kg cm^2, CG 5.50 to 5.54 cal)."""
import math
d = 3.0; r = d / 2; cal = d                       # cm
Ln, Lb = 2.84 * cal, 10.0 * cal                   # nose length, body length (cm)
Lc = Lb - Ln                                      # cylinder length
c, s, tTE = 1.0 * cal, 1.0 * cal, 0.08 * cal       # fin chord, span, trailing-edge thickness
rho_s, M_meas = 7.85, 1580.0                      # g/cc, g
def props(taper, rho_body=rho_s, rho_fin=rho_s):
    A = math.pi * r * r
    Vc, Vn = A * Lc, A * Ln / 3
    mc = rho_body * Vc
    # one fin: thickness t(x, y) = tTE * (x - x_LE)/c * w(y), w = 1 (A) or 1 - y/s (B), y from root
    wbar = 0.5 if taper else 1.0
    Vf = 0.5 * tTE * c * s * wbar
    mf = rho_fin * Vf
    mn = M_meas - mc - 4 * mf
    rho_n = mn / Vn
    # axial: CG positions from the nose
    xn = 0.75 * Ln; xc = Ln + Lc / 2; xf = Lb - c / 3   # wedge centroid 2/3 chord aft of the LE
    xcg = (mn * xn + mc * xc + 4 * mf * xf) / M_meas
    # radial second moment of a fin, r from r to r+s, weight w(y)
    if taper:
        num = sum(((r + (i + 0.5) * s / 2000) ** 2) * (1 - (i + 0.5) / 2000) for i in range(2000))
        den = sum((1 - (i + 0.5) / 2000) for i in range(2000))
    else:
        num = sum((r + (i + 0.5) * s / 2000) ** 2 for i in range(2000)); den = 2000
    r2f = num / den
    Ix = mc * r * r / 2 + 0.3 * mn * r * r + 4 * mf * r2f
    # transverse about CG
    Iy_c = mc * (3 * r * r + Lc * Lc) / 12 + mc * (xc - xcg) ** 2
    Iy_n = mn * (3 * r * r / 20 + 3 * Ln * Ln / 80) + mn * (xn - xcg) ** 2
    x2f = c * c / 18                               # variance of x for a linear wedge (density ~ x over a chord c)
    Iy_f = 4 * mf * (x2f + (xf - xcg) ** 2) + 2 * mf * r2f
    Iy = Iy_c + Iy_n + Iy_f
    return dict(rho_nose=rho_n, m_fins=4 * mf, xcg_cal=xcg / cal, Ix=Ix / 1000, Iy=Iy / 1000, base_cal2=4 * tTE * s * wbar / cal ** 2)
for name, taper in (("A constant spanwise thickness", False), ("B tapered to zero at the tip", True)):
    p = props(taper)
    print(f"{name}: TE base {p['base_cal2']:.2f} cal^2, fins {p['m_fins']:.1f} g, nose density {p['rho_nose']:.2f} g/cc, "
          f"CG {p['xcg_cal']:.3f} cal, Ix {p['Ix']:.3f} kg cm^2, Iy {p['Iy']:.2f} kg cm^2")
print("measured: Ix 1.92 (table I), 1.91 to 1.93 (table II); Iy 97.85 (table I), 97.7 to 98.2 (table II); CG 5.50 (I), 5.50 to 5.54 (II)")
# Bound for B: whatever the (solid, axisymmetric) body materials, Ix of nose+cylinder <= (all body mass at the
# cylinder's r^2/2 per unit mass) = (M - fins) * r^2 / 2, i.e. a weightless nose.
for name, taper in (("A", False), ("B", True)):
    p = props(taper)
    mfins = p['m_fins']
    if taper:
        r2f = (sum(((r + (i + 0.5) * s / 2000) ** 2) * (1 - (i + 0.5) / 2000) for i in range(2000)) / sum((1 - (i + 0.5) / 2000) for i in range(2000)))
    else:
        r2f = sum((r + (i + 0.5) * s / 2000) ** 2 for i in range(2000)) / 2000
    bound = ((M_meas - mfins) * r * r / 2 + mfins * r2f) / 1000
    print(f"{name}: upper bound on Ix for any solid body of uniform-in-radius density (steel fins): {bound:.3f} kg cm^2")
# sensitivity: brass body, or tungsten fins with taper
for lab, kw, taper in (("A brass body", dict(rho_body=8.5), False), ("B brass body", dict(rho_body=8.5), True),
                       ("B tungsten fins (19.3)", dict(rho_fin=19.3), True), ("A aluminium fins (2.8)", dict(rho_fin=2.8), False)):
    p = props(taper, **kw)
    print(f"sensitivity {lab}: nose {p['rho_nose']:.2f} g/cc, CG {p['xcg_cal']:.3f}, Ix {p['Ix']:.3f}, Iy {p['Iy']:.2f}")
