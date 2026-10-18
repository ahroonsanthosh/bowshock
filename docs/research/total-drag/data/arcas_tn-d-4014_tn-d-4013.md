# ARCAS sounding rocket, half-scale wind-tunnel models (NASA TN D-4014 and TN D-4013)

Draft transcription for review. Values marked "digitised" were read from scanned
plots by the procedure given below; everything else is copied from the text or
tables named.

## Sources

- C. D. Babb and D. E. Fuller, _Static Stability Investigation of a
  Sounding-Rocket Vehicle at Mach Numbers from 1.50 to 4.63_, NASA TN D-4014,
  June 1967. NTRS 19670020031 (PDF opened, 79 pages, 300 dpi bilevel scan).
- J. C. Ferris, _Static Stability Investigation of a Single-Stage Sounding
  Rocket at Mach Numbers from 0.60 to 1.20_, NASA TN D-4013, June 1967. NTRS
  19670020050 (PDF opened, 64 pages).

## Geometry (TN D-4014 fig. 1, PDF p. 10; TN D-4013 uses the same two models, fig. 1 dimensions in calibers of d = 5.72 cm)

All dimensions in inches (cm), as printed.

| Item | Configuration 1 | Configuration 2 |
| --- | --- | --- |
| Body diameter d | 2.250 (printed "(5.815)"; 2.250 in is 5.715 cm) | same |
| Nose length (tip to x where r = d/2 is reached per table) | 10.600 (26.924) | same |
| Station of cylinder end / boat-tail region start, as dimensioned | 37.300 (94.742) | 49.850 (126.619) |
| Total length | 40.950 (104.013) | 53.500 (printed "(195.890)"; 53.5 in is 135.89 cm) |
| L/d (TN D-4014 p. 4) | 18.20 | 23.77 |
| Moment centre | 63.37% L | 66.36% L |

Nose: tip radius 0.062 (0.157). Ogive ordinates (x, r), inches: (0, 0),
(2.375, 0.414), (3.375, 0.554), (4.375, 0.688), (5.375, 0.804),
(6.375, 0.908), (7.375, 0.988), (8.375, 1.062), (9.375, 1.125),
(10.600, 1.125). The nose reaches the body radius at x = 9.375.

Afterbody: the last 3.650 in (37.300 to 40.950 for configuration 1) are
dimensioned as 1.840 (4.674) then 1.810 (4.597); the drawing shows the
cylinder continuing over the first part and a boat-tail ending in a reflexed
lip (detail A): base outer diameter 1.470 (3.734), lip radius 0.060 (0.152),
0.030 (0.076) radius, 15 deg and 90 deg angles, 0.031 (0.079), 0.053 (0.135)
reference, 0.654 (1.661) radius reference. Rear view shows a 1.250 (3.175)
diameter. The exact boat-tail profile needs a second reading of detail A
before it is modelled (not done).

Fins (fig. 1(b)), four, trapezoidal, double wedge:

| Item | Value |
| --- | --- |
| Root chord | 3.380 (8.585) |
| Tip chord | 2.165 (5.499) |
| Span (exposed, as dimensioned) | 2.103 (5.342) |
| Leading-edge sweep | 30 deg (drawn); consistent with (3.380 - 2.165)/2.103 = tan 30.0 deg, trailing edge unswept |
| Ridge (maximum-thickness) line | swept 15 deg; at the root 1.568 (3.983) ahead of the trailing edge, i.e. 0.536 c from the leading edge |
| Thickness | 0.150 (0.381) at root, 0.096 (0.244) at tip: t/c = 0.0444 at both |
| Wedge angle | 2.72 deg "typ, normal to 15 deg line"; 1.47 deg shown on the tip view |
| Fin anchors | fairing blocks 2.165 (5.499) long, 0.500 (1.270) wide, 0.035 (0.089) edges, 15 deg ramps (fin anchor detail) |
| Root leading edge station | 37.300 (configuration 1); root trailing edge therefore at 40.680, 0.27 in ahead of the base |

Not stated in TN D-4014: how the fin slots were treated with fins off. TN
D-4013 (p. 3): for the short model the fin anchors were left on to plug the
slots, for the long model the slots were plugged with balsa and faired flush.

## Test conditions

TN D-4014 (p. 4, table "Test Conditions", PDF p. 6): Langley Unitary Plan
wind tunnel.

| M | T0, K | p0, N/m^2 | Re per m |
| --- | --- | --- | --- |
| 1.50 | 339 | 79 841.29 | 9.84e6 |
| 1.80 | 339 | 87 701.31 | 9.84e6 |
| 2.30 | 339 | 109 833.48 | 9.84e6 |
| 2.96 | 339 | 155 132.03 | 9.84e6 |
| 3.96 | 352 | 276 548.71 | 9.84e6 |
| 4.63 | 352 | 377 419.00 | 9.84e6 |

Transition: tripped. "a 1/16-in-wide (0.159 cm) strip of No. 60 carborundum
grains were affixed around the model 3/4 in. (1.91 cm) rearward of the nose and
1/2 in. (1.27 cm) rearward of the leading edge of each fin" (p. 4).

TN D-4013 (pp. 3 to 4): Langley 8-foot transonic pressure tunnel, Re 9.8e6 per
m, T0 = 322 K; trip No. 120 carborundum, 0.25 cm wide, 3.17 cm aft of the nose
and 1.27 cm aft of each fin leading edge. Sting 2.54 cm diameter, extending
29.21 cm aft of the base, then a 19.2 deg half-angle flare. Ratio of sting to
base diameter: 2.54/3.734 = 0.68 (computed).

## Stated uncertainty

- TN D-4014 (p. 5): CA +-0.004; alpha +-0.1 deg; Mach +-0.015 (M 1.5 to
  2.96), +-0.050 (M 3.96 to 4.63).
- TN D-4013 (p. 4): CA +-0.004; Cp,b +-0.01; M +-0.003.

## Quantity measured

TN D-4014: CA is axial force on the maximum cross-sectional area, "not
corrected to free-stream conditions at the model base" (p. 4): it is the total
axial force including the base and balance-chamber pressure. The chamber
axial-force coefficient is in fig. 4 (not digitised, see below). At alpha = 0,
CA is the drag coefficient of the model on its sting.

TN D-4013: summary figures 11 (short) and 12 (long) give, at alpha about 0 and
roll 0, CA,corr (axial force corrected for base axial force, i.e. forebody
including fins) and CA,b (base axial force), as faired curves.

## Digitised CA at alpha = 0, TN D-4014 figs. 5(a), 5(b), 6(a), 6(b)

Procedure: PDF pages rendered at the scan's native 300 dpi. Axes calibrated on
two printed major gridlines bracketing the data (page 25: CA 0.4 at y = 1304
px and 0.1 at 1724 px, 1400 px per unit, alpha 0 at x = 787 px; page 28: 0.5 at
1216, 0.2 at 1642.5, 1421.7 px per unit, alpha 0 at x = 914; page 34: 0.4 at
1457.6, 0.1 at 1803, 1151.3 px per unit, alpha 0 at x = 938.7; page 37: 0.5 at
1331, 0.2 at 1669, 1126.7 px per unit, alpha 0 at x = 847.8). Grid lines
removed (pixels in straight runs of 18 to 22 px or longer) and each symbol's
outer top and bottom rows read from a printout of the cleaned pixels; the
value is the centre of the symbol's bounding box. Symbols lie at alpha from
-0.5 to +1.1 deg (flow-angularity corrections); where two symbols bracket
alpha = 0 they agree within 0.0025. Reading uncertainty: +-0.002 for circles,
squares and diamonds; +-0.003 for triangles (M 2.96), whose bounding-box
centre and centroid differ by 0.002 and whose apex is partly hidden by grid
remnants on page 34. Add the report's +-0.004.

| Config | Fins | M | CA (alpha ~ 0) | Read at alpha, deg | Figure, PDF page |
| --- | --- | --- | --- | --- | --- |
| 1 | off | 1.50 | 0.3475 | +0.10 | 5(a), p. 25 |
| 1 | off | 1.80 | 0.3334 | +0.10 | 5(a), p. 25 |
| 1 | off | 2.30 | 0.2900 | 0.0 | 5(a), p. 25 |
| 1 | off | 2.96 | 0.242 | -0.3 and +0.9 | 5(a), p. 25 |
| 1 | on, 0 deg cant | 1.50 | 0.5355 | -0.28 and +0.86 | 5(b), p. 28 |
| 1 | on, 0 deg cant | 1.80 | 0.4707 | -0.1 and +1.1 | 5(b), p. 28 |
| 1 | on, 0 deg cant | 2.30 | 0.382 | -0.2 and +0.9 | 5(b), p. 28 |
| 1 | on, 0 deg cant | 2.96 | 0.308 | -0.47 and +0.70 | 5(b), p. 28 |
| 2 | off | 1.80 | 0.369 (0.3701 at -1.0, 0.3677 at +0.66, interpolated) | | 6(a), p. 34 |
| 2 | off | 2.30 | 0.3245 | -0.06 | 6(a), p. 34 |
| 2 | off | 2.96 | 0.269 (0.268 to 0.270) | | 6(a), p. 34 |
| 2 | on, 0 deg cant | 1.80 | 0.505 (0.5051 at -0.13, 0.5075 at +1.0) | | 6(b), p. 37 |
| 2 | on, 0 deg cant | 2.30 | 0.4097 | -0.17 and +0.9 | 6(b), p. 37 |
| 2 | on, 0 deg cant | 2.96 | 0.335 | -0.4 and +1.1 | 6(b), p. 37 |

Configuration 2 has no M 1.50 data in figs. 6(a) and 6(b). M 3.96 and 4.63
were not read (outside the range served).

Measured fin increment (fins on minus fins off, computed from the table):

| M | Config 1 | Config 2 |
| --- | --- | --- |
| 1.50 | 0.188 | |
| 1.80 | 0.137 | 0.136 |
| 2.30 | 0.092 | 0.085 |
| 2.96 | 0.066 | 0.066 |

The report notes (p. 6) that the chamber axial force of configuration 1 is low
at M 1.50 and 1.80 near alpha = 0, "particularly for the fin-off condition",
attributed to the reflexed lip, whose effect is masked "when separation occurs
over the afterbody boattail at the higher Mach numbers or the boundary layer is
thickened by the addition of the fins". So part of the fin increment is a
change of base force.

Not digitised: fig. 4 (chamber axial-force coefficient). Its symbols overlap
heavily on a 0 to 0.12 scale with 0.04 labels; a reading better than about
+-0.005 on values of 0.01 to 0.05 was not achieved in the time available.

## Digitised TN D-4013 summary curves (alpha about 0, roll 0)

Procedure: 300 dpi renders. Mach gridlines every 0.05 (labels checked: page
62, M 1.0 at x = 1348, M 1.2 at x = 1642.5; page 63, M 1.0 at x = 1290, 1.2 at
1571.5). Page 62 is sheared: its zero lines rise 9 px from left to right while
vertical gridlines stay vertical, so values use the local zero line at each
Mach number (the left-hand tick calibration gives values 0.005 higher; that
difference is part of the stated reading uncertainty of +-0.005). Only the test
Mach numbers 1.00 and 1.20 are listed: between them the curves are fairings.
At M 1.00 the fins-off curve is on a steep rise (0.415 to 0.428 over M 0.994 to
1.005 on fig. 11).

| Model | Fins | M | CA,corr | CA,b | Total CA,corr + CA,b |
| --- | --- | --- | --- | --- | --- |
| short (L/d 18.2), fig. 11 | 0 deg cant | 1.00 | 0.685 | +0.015 | 0.700 |
| short | off (anchors on) | 1.00 | 0.421 | -0.023 | 0.398 |
| short | 0 deg cant | 1.20 | 0.592 | +0.043 | 0.635 |
| short | off (anchors on) | 1.20 | 0.430 | +0.026 | 0.456 |
| long (L/d 23.8), fig. 12 | 0 deg cant | 1.00 | 0.728 | +0.012 | 0.740 |
| long | off (slots faired) | 1.00 | 0.372 | -0.029 | 0.343 |
| long | 0 deg cant | 1.20 | 0.624 | +0.026 | 0.650 |
| long | off (slots faired) | 1.20 | 0.422 | -0.043 | 0.379 |

CA,b < 0 means base pressure above free-stream pressure. The report (pp. 4 to 5)
associates the base force trends with the boat-tailed afterbody and with sting
diameter and flare angle; the base data here are sting-affected (sting/base
diameter 0.68).

Machine-readable copy: `arcas_ca_alpha0.csv`.
