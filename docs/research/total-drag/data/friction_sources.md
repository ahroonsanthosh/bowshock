# Skin friction: measured data and computations used in 0007 (draft)

## 1. Chapman and Kester, NACA TN 3097 (1954), cylinders in axial flow

Source: D. R. Chapman and R. H. Kester, _Turbulent Boundary-Layer and
Skin-Friction Measurements in Axial Flow Along Cylinders at Mach Numbers
Between 0.5 and 3.6_, NACA TN 3097, March 1954. NTRS 19930083801 (opened).

Set-up (pp. 1, 7): average friction on the cylindrical part of cone-cylinders
(1 in diameter, 20 deg included cone) of overall fineness 10, 15, 25
(cylinder fineness about 8, 13, 23), by direct force measurement
(difference of two lengths), tripped, zero heat transfer; Re 4 to 32 million.
Friction was 20 to 50% of the body drag, measured to 4 to 2% (p. 7).

Table III (report p. 33, PDF p. 34), CF / (CF_i)exp, independent of L/D:

| M | (a) from fig. 17(a) | (b) from fig. 17(b) |
| --- | --- | --- |
| 0.51 | 0.985 | 0.994 |
| 0.81 | 0.929 | 0.924 |
| 1.99 | 0.745 | 0.757 |
| 2.49 | 0.671 | 0.672 |
| 2.95 | 0.623 | 0.630 |
| 3.36 | 0.578 | 0.571 |
| 3.60 | 0.551 | 0.552 |

(CF_i)exp is the measured incompressible value for each cylinder; it is 2.5,
0.2, -0.6% (fig. 17(a)) and 2.2, 0.2, -1.4% (fig. 17(b)) below Karman-Schoenherr
for L/D 8, 13, 23 (p. 18). Mean deviation from faired curves about 1%.

Statements used: "no significant effect on average skin-friction coefficient
of small changes in pressure gradient" (summary; M 2, tunnel walls distorted);
L/D from 8 to 23 raises CF by about 4% subsonically, against 1.5% and 15%
predicted by two kinds of transverse-curvature analysis (pp. 17 to 18); the
agreement of cylinder and flat-plate ratios is certain only "of the order of
+-5 percent" (p. 20); proposed incompressible laws differ by "the order of +-5
percent from a mean" (p. 25).

Computation (scripts/ck_compare.py, output ck below): van Driest II (vd2.py,
Karman-Schoenherr law, Sutherland viscosity, recovery factor 0.88 and 0.89,
adiabatic wall) ratio CF/CF_i(K-S) at Re 4e6, 1e7, 3e7 and tunnel stagnation
temperatures 290 K and 330 K (the report's T0 was not found), against the
table:

| M | measured (a), (b) | VDII ratio range | VDII above measured |
| --- | --- | --- | --- |
| 1.99 | 0.745, 0.757 | 0.7840 to 0.8027 | +3.6% to +7.7% |
| 2.49 | 0.671, 0.672 | 0.7120 to 0.7366 | +5.9% to +9.8% |
| 2.95 | 0.623, 0.630 | 0.6520 to 0.6816 | +3.5% to +9.4% |
| 3.36 | 0.578, 0.571 | 0.6045 to 0.6380 | +4.6% to +11.7% |
| 3.60 | 0.551, 0.552 | 0.5792 to 0.6147 | +4.9% to +11.6% |

The range comes mostly from the Reynolds numbers assumed; a per-point
comparison needs the data of fig. 17 (not digitised).

## 2. Loposer and Rumsey, NACA RM L54G14 (1954), RM-10 in flight

Source: J. D. Loposer and C. B. Rumsey, _Flight Measurements of Average
Skin-Friction Coefficients on a Parabolic Body of Revolution (NACA RM-10) at
Mach Numbers from 1.0 to 3.7_, NACA RM L54G14. NTRS 20030068110 (opened; no
text layer, pages read as images).

Model (pp. 3 to 4): full scale RM-10, parabolic body, 146.5 in long, 12 in
maximum diameter, fineness 12.2 (cut from 15), four untapered 60 deg swept
fins with 10% circular-arc sections. Contour within 0.25% of local diameter;
roughness "less than 60 microinches from peak to valley" except joints, where
discontinuities of about 0.005 in remained. Average friction ahead of a
boundary-layer rake (station 125 on five models, 85 on one), Re 40e6 to 170e6
on length to the station, M 1.0 to 3.7, wall from strong heating to strong
cooling.

Results (pp. 7, 9 to 11; summary): measured values are "approximately 7
percent higher" than Van Driest's flat-plate theory (his North American
Aviation report AL-997, 1950). "The band drawn +-5 percent about the faired
line includes 66 percent of the points"; the variation is between models, not
random within one (p. 7). A laminar run to station 20 would lower the average
by only 1.5% (p. 7). Data of the two earliest flight models (ref. 1) lie up to
25% above the faired line, unexplained (p. 10). Against tunnel data on RM-10
models: within 8% for fixed transition at the lower tunnel Reynolds numbers,
within 4% (Lewis 8 x 6 ft), 5 to 13% below (Langley 9 in) (p. 9); conclusion 2
says within 13% for Re 8e6 to 25e6 with transition fixed.

Not checked: whether AL-997 is the method now called van Driest II (Hopkins TN
D-6945 identifies VD II with Van Driest's 1956 paper).

## 3. Monta and Allen, NASA TN D-2896 (1965), flat plate M 2.5 to 4.5

Source: NTRS 19650018215 (opened). Local friction on a 10 ft flat plate at
local M 2.46, 2.91, 3.47, 4.44, Re 5e6 to 69e6. Average level 0 to 5% above
the Sommer and Short T' method (summary); balances differ from their average
by +-2 to 3% (p. 6); against T' the data range from 3% below to 8% above at Re
50e6 (p. 6). On the data of others: "The differences among the various data
amount to 15 percent between references 2 and 3, even though each of these two
are internally consistent and repeatable to much smaller increments" (p. 1).

## 4. Hopkins, NASA TN D-6945 (1972)

Source: NTRS 19730001588 (opened). States that Hopkins and Inouye (AIAA J. 9,
1971) found van Driest II "gave the most satisfactory agreement" among methods
for M 1.5 to 9 (p. 1); the numerical scatter is not given in TN D-6945. Effects
of the recovery factor (0.88 against 1.0) and of the viscosity law (Keyes
against power law) "were less than 6 percent" except at extreme conditions
such as M 10, Tw/Taw 0.2 (p. 3, table 2).

Hopkins and Inouye (1971) itself: NTRS record 19710049171 has no PDF; only its
one-line abstract was read. Not verified.

## 5. Turbulence Modeling Resource, M 2 flat plate (computation)

Files: tmbwg.github.io/turbmodels/ZPGflatplateSS_validation/cf_vandriestII.dat
and highmach_cfl3d_cf_sa.dat (downloaded 2026-10-18). The page's "data" are
van Driest II (theory), with the warning that the correlations are imperfect;
no measured scatter is given.

- vd2.py reproduces the TMR van Driest II file (M 2, Tw/Tinf 1.712, Tinf 300 K)
  within 2.4e-7 relative for 1e3 < Re_theta < 2e4 (vd2_check_vs_tmr_output.txt).
- CFL3D SA against van Driest II at M 2, adiabatic: ratio 0.980 to 1.003 over
  4000 < Re_theta < 13000, mean 0.9925 (tmr_sa_vs_vd2_output.txt). At M 5,
  Tw/Taw 0.2 the ratio is 0.898 to 0.924.

## 6. Correlations used by the hobby tools (documents opened)

- OpenRocket technical documentation, "For OpenRocket version 13.05"
  (openrocket.sourceforge.net/techdoc.pdf, opened): fully turbulent assumed
  (p. 43); smooth Cf = 1/(1.50 ln R - 5.6)^2 (eq. 3.78); roughness-limited Cf =
  0.032 (Rs/L)^0.2 above Rcrit = 51 (Rs/L)^-1.039 (eqs. 3.79, 3.80); supersonic
  corrections Cf/(1 + 0.15 M^2)^0.58 and Cf/(1 + 0.18 M^2) (eqs. 3.83, 3.84);
  body wetted area times (1 + 1/(2 fB)), fins times (1 + 2t/c) (eq. 3.85);
  roughness heights table 3.2 from Hoerner (e.g. optimum paint-sprayed 5 um,
  aircraft mass-production paint 20 um). The URL's document describes 13.05,
  not the current release; the current code was not checked.
- RASAero II Users Manual (rasaero.com, opened): default laminar, transition,
  turbulent with "the flat plate value of 500,000" for the transition
  Reynolds number, all-turbulent option (p. 55); equivalent sand roughness
  table (p. 52): polished 0.00005 in, sheet metal 0.00016, smooth paint
  0.00025, camouflage paint 0.0004, rough camouflage 0.0012, galvanised 0.006,
  cast iron 0.01. The friction law itself is not described in the manual.

## 7. Friction sensitivity computation (scripts/friction_study.py)

Rockets of length 25 d (d = 54, 98, 152 mm), ISA at 3 and 10 km, M 1.2, 2, 3,
adiabatic flat plate. Full table: friction_study_output.txt. Summary:

| Effect | Range over the 18 cases |
| --- | --- |
| OpenRocket smooth correlation / VDII | 0.956 to 0.989 |
| Transition at Re_T = 5e5 (RASAero default), CF / fully turbulent | 0.979 to 0.999 |
| Transition at Re_T = 1.6e6 (observed in RM A53D02) | 0.922 to 0.995 |
| Transition at Re_T = 3e6 | 0.845 to 0.990 |
| OpenRocket roughness model, 5 um | 1.000 (no effect) |
| OpenRocket roughness model, 20 um | 1.000 to 1.251 |
| OpenRocket roughness model, 60 um | 1.061 to 1.558 |

Transition model: laminar Blasius 1.328/sqrt(Re) up to Re_T (TN 3708 summary:
"the simple Blasius incompressible theory gives a satisfactory prediction" of
laminar friction at M 1.62 to 2.41), then turbulent VDII from a virtual origin
with the same momentum thickness (the procedure described in RM A53D02, p. 8).
The roughness numbers are OpenRocket's correlation, not a validated model.
