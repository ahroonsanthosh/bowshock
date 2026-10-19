# Base pressure: measured data and readings used in 0008 (draft)

P_B = (p_b - p_inf)/q_inf. Base drag coefficient on base area = -P_B.
Ratios are data over compiled curve, as a ratio of base drag, unless stated.

## 1. Love, NACA TN 3819 (1957), fig. 18: cylindrical afterbodies, no fins, turbulent

Source: E. S. Love, _Base Pressure at Supersonic Speeds on Two-Dimensional
Airfoils and on Bodies of Revolution with and without Fins Having Turbulent
Boundary Layers_, NACA TN 3819. NTRS 19930084517 (opened).

Figure 18 (PDF p. 49, report p. 47) compiles tunnel data (R from 2e6 to
22.3e6), free-flight data (Langley, R 30e6 to 35e6), "Compilation by Chapman"
and Love's "basic curve", for M0 about Minf, cylindrical afterbodies, no
fins. The legend has eleven tunnel entries; the twelve tunnel points at M
1.5 to 3.5 carry about seven of them (assignment by symbol shape,
provisional; the audit's assignment, `love_tn3819_fig18.csv`).

Readings (revised): `love_tn3819_fig18.csv`.

- Symbols: two independent readings agree within 0.003 in P_B at all twelve
  points; Mach numbers from the audit's shear-corrected grid, +-0.02.
- Curves: the first reading was wrong at M 1.63, 1.94, 2.0, 2.42, 3.0 and 3.5
  (symbol outlines and Gabeaud's line, by 0.004 to 0.009). The audit's curve
  table is adopted: -0.1733 to -0.1775 at M 1.5, -0.1447 to -0.1496 at 2.0,
  -0.1172 to -0.1196 at 2.5, -0.0964 to -0.0978 at 3.0 (Gabeaud -0.1002).
  The second reading (grid model and robust local fits) confirms 13 of the
  20 curve values at the ten ratio Mach numbers within 0.0004: the less
  negative curve at M 1.5 to 3.0 and both curves at M 1.63 and 2.41 to 2.68.
  The more negative curve at M 1.5, 1.94, 2.0 and 3.0 and both at M 3.24 to
  3.50 rest on one reading (`love18_twice_output.txt`).
- Free-flight curve: peak -0.207 at M 1.06, -0.193 at M 1.15, -0.198 at M
  1.21 (`love18_ff_output.txt`).

Data over curve (`base_ratios_v3_output.txt`; envelope of both readings
against both curves):

| M | Tunnel points | Data over curve |
| --- | --- | --- |
| 1.50 to 1.63 | 4 | 0.856 to 1.043 (-14% to +4%) |
| 1.94 to 2.42 | 5 | 0.913 to 1.009 (-9% to +1%) |
| 2.68 to 3.50 | 3 | 0.913 to 1.078 (-9% to +8%) |
| 1.06 to 1.21 | free-flight curve | 1.027 to 1.122 (+3% to +12%) |

Statements used (text): artificial transition "has been shown in several
investigations to cause the base pressure to be 5 to 10 percent higher than
that for natural transition" (p. 15); L/h is "by far the predominant factor"
for bodies whose Mach number and pressure ahead of the base vary with
afterbody length, so Chapman's (L/h) R^(-1/5) correlation is questionable
there (p. 15); "All the wind-tunnel base pressures for the body with fins are
lower than the free-flight results" (p. 23); fin effects are "significant"
and need more experiments (pp. 14, 24).

## 2. Chapman, NACA TR 1051 (1951), appendix B: support interference

Source: NTRS 19930090963 (opened; poor OCR, pages read as images).

- Fig. 22 (PDF p. 20): with support diameter ratio d/h = 0.3, no change in base
  pressure when the support length exceeds about 3 base diameters (p. 19).
- Fig. 23(b) (PDF p. 21), turbulent boundary layer: base pressure falls as d/h
  grows. Two readings of the faired curves from d/h 0.35 to 0.85:

| M | First reading (revised, `scripts/chap23b_read.py`, local grid) | Audit | Change used |
| --- | --- | --- | --- |
| 1.5 | -0.174 to -0.238 (0.064) | -0.176 to -0.237 (0.061) | 0.064 |
| 2.0 | -0.141 to -0.190 (0.049) | -0.147 to -0.189 (0.042) | 0.049 |
| 2.9 | -0.115 to -0.142 (0.027) | -0.118 to -0.143 (0.025) | 0.027 |

The first reading's earlier -0.185 at the M 1.5 start was wrong; the local
grid re-reading gives -0.174, with the audit's -0.176. At M 2.0, d/h 0.35, the two readings differ by
0.006 (-0.141 crop-verified against -0.147), about the combined reading
error; both are recorded and the larger change is used. Chapman: for
turbulent flow "Definite quantitative statements about the possible effects
of support interference ... cannot be made at present" (p. 19).

Relative to the base pressure at d/h 0.35 the change to d/h 0.85 is 37% at M
1.5 (0.064/0.174), 35% at M 2.0 and 23% at M 2.9 (computed from the first
reading). The ARCAS sting of TN D-4013 has d/h = 0.68 (computed in the ARCAS
file); TN D-4014's sting is not described.

## 3. Spahr and Dickey, NACA TN 2360 (1951): tail surfaces and base drag

Source: NTRS 19930083086 (opened). Body: 10-caliber-radius tangent ogive nose,
cylinder 1.250 in diameter, fineness 6.12 or 7.65, turbulent; sting d/h 0.4,
length 4 diameters (p. 4). Fins rectangular, aspect ratio 2.33, circular-arc
sections 5 and 10% thick, movable from one chord ahead of the base to one
chord behind it. Base-pressure uncertainty +-0.003; average deviation of the
pressure over the base +-0.003 (p. 5).

Results (summary, p. 1): with trailing edges at or near the base, a cruciform
10%-thick tail raised the base-drag coefficient by about 70% at M 1.5 and 35%
at M 2.0; one chord fore or aft reduced the increment to nearly zero;
increments for 10%-thick fins about twice those for 5%; a cruciform tail less
than twice a plane tail. The superposition estimate predicted trends but
"quantitative agreement at most tail locations was poor".

## 3a. Love, TN 3819 fig. 35: fins at the base, M 1.5 to 3.0 (first reading)

Fig. 35 (PDF p. 66) gives, for the cylindrical body with four 10%-thick
circular-arc rectangular fins whose trailing edges are at the base, the
free-flight base pressure (ref. 12, R 10e6 to 120e6) against Mach number,
tunnel pairs with and without fins (ref. 26 at M 1.50 and 2.00, Langley 9 in
at 2.41), Love's two estimates and the no-fin estimate, which reproduces the
fig. 18 basic curve within 0.001. Readings: `love_fig35_tn3819.csv`; factor:
`love_fig35_factor.csv`.

Fins-on-base factor F = P_B with fins over P_B without (computed):
free flight 1.51 at M 1.8, 1.32 at 2.0, 1.24 at 2.2, 1.26 at 2.4, 1.28 at
2.6, 1.31 at 2.8 (1.32 at 2.97 extrapolated); tunnel pairs 1.68 at M 1.50,
1.39 at 2.00, 1.37 at 2.41. TN 3819: "All the wind-tunnel base pressures for
the body with fins are lower than the free-flight results" and the fin
effects decrease as Mach number increases (p. 23). Thickness: TN 2360's
5%-thick fins gave about half the increments of 10% (summary); fig. 33
(not transcribed) plots P_B against fin thickness at M 1.50, 2.00 and 2.41.

## 4. Herrin and Dutton (1994) case, as reported by Tucker (NASA MSFC, 1993)

Original paper (AIAA J. 32(1), 1994) not opened. Source used: P. K. Tucker,
_Validation of a Computational Fluid Dynamics (CFD) Code for Supersonic
Axisymmetric Base Flow_, NTRS 19950017232 (opened; conference slides). Slide
p. 900 (PDF p. 22) plots p_b/p_inf against r/R at M 2.46 for the data and two
k-epsilon variants (FDNS code). Visual reading (+-0.01): data 0.553 to 0.575,
nearly flat; standard k-epsilon 0.46 at the axis falling to about 0.38;
extended k-epsilon with compressibility correction 0.61 at the axis to 0.48.

Computed (`base_conversions_output.txt`, `base_ratios_v2_output.txt`): data
base drag on base area 0.100 to 0.106; standard k-epsilon +39%, extended +14%
more base drag than the data. The compiled curves at M 2.46 give p_b/p_inf
0.484 to 0.495 and 13% to 21% more base drag than the data (data over curve
0.824 to 0.885).

The draft has treated this experiment as sting-free (no support behind the
base). That is **[not verified]**: Tucker's slides do not describe the
support (text layer searched for sting, support, strut, upstream) and the
original was not opened. If it holds, this is the one sting-free point on a
cylindrical afterbody at M 1.5 to 3 among the sources opened. Its conditions
must also be taken from the original.

## 5. RM-10 with fins: TR 1160 and TN 3320

TR 1160 (Evans, NTRS 19930092188, opened): body-alone data agree well across
tunnels; "unexplained differences" between tunnel data with fins and flight,
and a "consistent discrepancy" between two flight model sizes (pp. 119 to
121). Fig. 13 (PDF p. 12), visual reading (+-0.005): at M 1.2 to 1.6 the 146.5
in models give CD_T about 0.255 to 0.27 and the 73.25 in models about 0.235
to 0.25, mostly in base drag (about 0.045 to 0.05 against 0.025 to 0.03). "The
base drag for the smaller flight models appears to be low for some as yet
unknown reason."

TN 3320 (Jackson, Rumsey and Chauvin, NTRS 19930084086, opened) is the
flight report behind those curves: base pressure measured in flight
(sting-free), full-scale model 1, -0.104 to -0.112 at M 1.36 to 2.56 (first
reading of fig. 9, `validation_candidates.md`); accuracy of the base-drag
coefficient +-0.003 at M 2.5 (p. 6). The body is a boat-tailed parabola with
fins at the base and a nozzle in the base, so it does not test the cylinder
correlation.

## 6. OpenRocket base drag (computation)

OpenRocket 13.05 documentation eq. 3.94: CD_base = 0.25/M for M > 1 (citing
Fleeman). Against the corrected compiled curves (`base_ratios_v2_output.txt`):
-3.8% to -6.1% at M 1.5, -13.6% to -16.4% at M 2, -14.7% to -16.4% at M 2.5,
-13.6% to -14.8% at M 3.
