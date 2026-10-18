# Fin wave drag: computations used in 0007 (draft)

All numbers here are computations run for this draft; scripts in
`../scripts/`, raw outputs in this directory.

## 1. Linear 3D theory against strip theory (scripts/finwave.py, fin_cases.py)

Method: linearised supersonic thickness problem (source sheet, zero lift,
symmetric section) for one fin on a plane wall (the root plane is a
reflection plane, image fin included). The chordwise integral of each
constant-slope segment is done analytically; the spanwise integral is split
wherever a breakpoint line meets the Mach cone and uses a sin^2 substitution
with Gauss-Legendre points. Drag (both faces) is integrated over the fin with
clustered Gauss points. "Strip" means 2D Ackeret, 4 <lambda^2> / beta, applied
to streamwise strips of the same fin.

Validation (fin_validation_output.txt, and runs logged in the session):

| Check | Result |
| --- | --- |
| Unswept, span 50 chords, section at mid span, against 4 (t/c)^2/beta, M 1.2 to 3 | ratio 1.000000 |
| Infinite swept wing with supersonic edges against 4 (t/c)^2 cos L / sqrt(M^2 cos^2 L - 1): (M 2, 30 deg), (M 3, 45 deg), (M 1.5, 20 deg) | ratio 1.000000 |
| Infinite swept wing with subsonic edges (M 1.5, 60 deg; M 2, 70 deg), far from the root: zero wave drag expected | 0.00000 to -0.00001 of the 2D value |
| Tip Mach cone of an unswept constant-slope sheet: Cp/Cp_2D = 1/2 + asin(beta (s - y)/x)/pi (derived for this check), 12 points at M 1.5, 2, 3 | agreement to 6 digits |
| Integrated drag, 16 to 40 points per direction, subsonic and near-sonic leading edges | changes of 0.2% or less |

Results, CD_3D / CD_strip, double wedge (ridge at mid chord unless stated),
t/c-independent in linear theory. In brackets: beta cot(LE sweep); above 1 the
leading edge is supersonic.

| Fin | M 1.2 | M 1.5 | M 2.0 | M 2.5 | M 3.0 |
| --- | --- | --- | --- | --- | --- |
| A, ARCAS fin (TN D-4014 fig. 1(b)): root 3.38, span 2.103, LE 30 deg, TE unswept, ridge 0.536 c | 1.024 (1.15) | 1.056 (1.94) | 1.031 (3.00) | 1.018 (3.97) | 1.012 (4.90) |
| B, clipped delta: root 1, span 0.5, LE 45 deg, TE unswept, taper 0.5 | 0.933 (0.66) | 1.096 (1.12) | 1.082 (1.73) | 1.049 (2.29) | 1.033 (2.83) |
| C, trapezoid: root 1, span 1, LE 26.6 deg, TE unswept, taper 0.5 | 1.100 (1.33) | 1.051 (2.24) | 1.022 (3.46) | 1.013 (4.58) | 1.009 (5.66) |
| C-hex, same planform, hexagonal section with 15% chord bevels | 1.156 (1.33) | 1.059 (2.24) | 1.023 (3.46) | 1.015 (4.58) | 1.008 (5.66) |
| D, rectangle: chord 1, span 1 | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| E, swept trailing edge: root 1, span 0.75, LE 45 deg, TE 16.7 deg, taper 0.475 | 1.020 (0.66) | 1.195 (1.12) | 1.102 (1.73) | 1.056 (2.29) | 1.036 (2.83) |
| F, RM A53D02 planform (root 0.75, span 0.125, LE 71.6 deg) with a symmetric double wedge (not its real section) | 0.421 (0.22) | 0.625 (0.37) | 0.894 (0.58) | 0.973 (0.76) | 1.042 (0.94) |
| G, clipped delta: root 1, span 1, LE 36.9 deg, TE unswept, taper 0.25 | 1.103 (0.88) | 1.103 (1.49) | 1.044 (2.31) | 1.025 (3.06) | 1.017 (3.77) |

Rectangle at smaller spans (same code): span/chord 0.5 gives 0.975 at M 1.2
and 1.000 at M 2; 0.2 gives 0.653 and 0.981; 0.05 gives 0.252 and 0.499. For
the unit-span rectangle the tip effect integrates to zero to 4 digits; the
local section drag is not 2D (1.016 at mid span, 1.124 at 0.75 span, 0.58 at
0.99 span, M 2).

## 2. Exact 2D (shock-expansion) against Ackeret (scripts/section2d.py)

Symmetric double wedge, ridge at mid chord; weak oblique shock, then a
Prandtl-Meyer expansion of twice the face angle. For a symmetric double wedge
the second-order (Busemann) terms cancel in the drag, so Busemann gives the
Ackeret value; the difference below is third order and beyond.

| t/c | M 1.2 | M 1.3 | M 1.5 | M 2.0 | M 2.5 | M 3.0 |
| --- | --- | --- | --- | --- | --- | --- |
| 0.03 | 1.017 | 1.005 | 1.001 | 1.000 | 1.001 | 1.001 |
| 0.05 | 1.061 | 1.015 | 1.004 | 1.001 | 1.002 | 1.003 |
| 0.08 | shock detached | 1.048 | 1.010 | 1.003 | 1.004 | 1.007 |

## 3. Square leading edge: upper bound (scripts/blunt_le.py)

Face pressure cannot exceed the pitot pressure behind a normal shock, so the
drag of a square leading edge is at most Cp_pitot t/c on the chord. Against a
sharp double wedge of the same thickness the bound is 4.6 to 7.7 times larger
at M 1.2, 8.6 to 14.3 at M 1.5, 14.4 to 23.9 at M 2, 24.8 to 41.4 at M 3 (t/c
0.05 and 0.03; blunt_le_output.txt). The true face pressure is lower than the
pitot value; by how much was not established from a source.

Measured counterpart: RM A53D02, blunt leading edge, total CD up by about
0.02, about 100% of its fin wave drag (p. 15).

## 4. ARCAS fin increment: fins' own drag against the measured increment (scripts/arcas_fin_check.py)

Four ARCAS fins (geometry above, t/c 0.0444, planform 5.831 in^2 each), on
the reference area 3.976 in^2: linear-3D wave drag plus van Driest II friction
(fully turbulent from the leading edge, mean geometric chord, Re 9.84e6 per m,
T0 339 K, both faces). Fin anchors, fin-body interference and base effects not
included.

| M | Fin wave | Fin friction | Sum | Measured increment (config 1, 2) | Sum / measured |
| --- | --- | --- | --- | --- | --- |
| 1.50 | 0.044 | 0.049 | 0.093 | 0.188 | 0.49 |
| 1.80 | 0.032 | 0.047 | 0.079 | 0.137, 0.136 | 0.58 |
| 2.30 | 0.023 | 0.043 | 0.066 | 0.092, 0.085 | 0.72 to 0.78 |
| 2.96 | 0.017 | 0.039 | 0.056 | 0.066, 0.066 | 0.85 |

The fin trailing edges end 0.27 in ahead of the base, the position where
Spahr and Dickey (TN 2360) found the largest fin-induced base drag; TN D-4014
(p. 6) reports that the fins change the chamber force at M 1.50 and 1.80. The
shortfall falls with Mach number as their increments do (70% at M 1.5, 35% at
M 2.0 of base drag for their fins). This comparison is a plausibility check,
not a validation: fin anchors and the fins-off slot treatment are unknown
contributions.
