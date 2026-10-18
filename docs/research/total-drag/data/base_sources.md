# Base pressure: measured data and readings used in 0007 (draft)

P_B = (p_b - p_inf)/q_inf. Base drag coefficient on base area = -P_B.

## 1. Love, NACA TN 3819 (1957), fig. 18: cylindrical afterbodies, no fins, turbulent

Source: E. S. Love, _Base Pressure at Supersonic Speeds on Two-Dimensional
Airfoils and on Bodies of Revolution with and without Fins Having Turbulent
Boundary Layers_, NACA TN 3819. NTRS 19930084517 (opened).

Figure 18 (PDF p. 49, report p. 47) compiles tunnel data from ten sources
(R from 2e6 to 22.3e6), free-flight data (Langley, R 30 to 35e6), "Compilation
by Chapman" and Love's "basic curve" (all for M0 about Minf, cylindrical
afterbodies, no fins).

Digitising: 300 dpi greyscale render. Mach: x = 397 + 298.4 (M - 1) px (0.2 M
gridlines, M 5 line at x = 1590.5 checks). P_B: gridlines every 0.02 at 60.16
px, zero at y = 1804.6 px (fit to the gridlines; the drawn frame line lies at
1801 to 1803). Check against the dashed vacuum-limit curve -2/(gamma M^2):
read -0.1153 to -0.1166 at M 3.5 (exact -0.1166), -0.0895 to -0.0908 at M 4.0
(exact -0.0893): calibration good to about +-0.0015. Symbols read by eye on a
ruler overlay, the two at M 1.52 from pixel printouts; reading uncertainty
+-0.003. Symbol-to-reference assignment was not attempted.

| M | Tunnel data, P_B | Curves (Chapman, Love), P_B |
| --- | --- | --- |
| 1.52 | -0.178, -0.152 | -0.173 to -0.177 (at 1.5) |
| 1.63 | -0.165, -0.152 | |
| 1.94 | -0.150, -0.143 | |
| 2.00 | -0.139 | -0.139 to -0.145 |
| 2.42 | -0.118, -0.115 | |
| 2.50 | | -0.116 to -0.118 |
| 2.68 | -0.102 | |
| 3.00 | | -0.096 to -0.101 |
| 3.26 | -0.095 | |
| 3.51 | -0.083 | |

Curves read by pixel columns at the data Mach numbers (+-0.002): -0.170 to
-0.177 at M 1.52, -0.162 to -0.170 at 1.63, -0.142 to -0.145 at 1.94, -0.117
to -0.123 at 2.42, -0.108 to -0.112 at 2.68, -0.088 to -0.091 at 3.26, -0.082
to -0.085 at 3.51. Data over curve, as a ratio of base drag: 0.86 to 1.05 at
M 1.52 to 1.63 (the low end from one point at each Mach number), 0.935 to
1.056 at M 1.94 to 2.42, 0.91 to 1.09 at M 2.68 to 3.51.

Free-flight points near M 1.0 to 1.2 read about -0.19 to -0.20 (visual only).

Statements used (text): artificial transition "has been shown in several
investigations to cause the base pressure to be 5 to 10 percent higher than
that for natural transition" (p. 15); L/h is "by far the predominant factor" for
bodies whose Mach number and pressure ahead of the base vary with afterbody
length, so Chapman's (L/h) R^(-1/5) correlation is questionable there (p. 15);
"All the wind-tunnel base pressures for the body with fins are lower than the
free-flight results" (p. 23); fin effects are "significant" and need more
experiments (pp. 14, 24).

## 2. Chapman, NACA TR 1051 (1951), appendix B: support interference

Source: NTRS 19930090963 (opened; poor OCR, pages read as images).

- Fig. 22 (PDF p. 20): with support diameter ratio d/h = 0.3, no change in base
  pressure when the support length exceeds about 3 base diameters.
- Fig. 23(b) (PDF p. 21), turbulent boundary layer: base pressure falls as d/h
  grows. Visual reading of the faired curves (+-0.01): from d/h about 0.35 to
  0.85 the base pressure coefficient goes from about -0.185 to -0.235 at M 1.5,
  -0.145 to -0.19 at M 2.0, and about -0.125 to -0.145 at M 2.9. Chapman: for
  turbulent flow "Definite quantitative statements about the possible effects
  of support interference ... cannot be made at present" (p. 19).

The ARCAS sting of TN D-4013 has d/h = 0.68 (computed in arcas file).

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

## 4. Herrin and Dutton (1994) case, as reported by Tucker (NASA MSFC, 1993)

Original paper (AIAA J. 32(1), 1994) not opened. Source used: P. K. Tucker,
_Validation of a Computational Fluid Dynamics (CFD) Code for Supersonic
Axisymmetric Base Flow_, NTRS 19950017232 (opened; conference slides). Slide
p. 900 (PDF p. 22) plots p_b/p_inf against r/R at M 2.46 for the data and two
k-epsilon variants (FDNS code). Visual reading (+-0.01): data 0.553 to 0.575,
nearly flat (mean about 0.56); standard k-epsilon 0.46 at the axis falling to
about 0.38 (area mean about 0.39); extended k-epsilon with compressibility
correction 0.61 at the axis to 0.48 (area mean about 0.50).

Computed base drag on base area (base_conversions_output.txt): data 0.100 to
0.106; standard k-epsilon 0.144 (+39%); extended k-epsilon 0.118 (+14%). Love's
curve at M 2.46 corresponds to p_b/p_inf about 0.50, i.e. about 12 to 18% more
base drag than this sting-free experiment.

Secondary review (joast.org, J. Aerospace Sci. Technol. 75(3), 2023, read via
web search extract) gives r_b = 31.75 mm and 576 m/s, but quotes two different
free-stream temperatures (294 K in text, 249 K in its table): conditions must
be taken from the original, which was not opened.

## 5. RM-10 with fins, flight against tunnels (Evans, NACA TR 1160)

Source: NTRS 19930092188 (opened). Body-alone data agree well across tunnels;
"unexplained differences" between tunnel data with fins and flight, and a
"consistent discrepancy" between two flight model sizes (pp. 119 to 121).
Fig. 13 (PDF p. 12), visual reading (+-0.005): at M 1.2 to 1.6 the 146.5 in
models give CD_T about 0.255 to 0.27 and the 73.25 in models about 0.235 to
0.25 (a difference of about 0.02 to 0.03, 8 to 12%), mostly in base drag (about
0.045 to 0.05 against 0.025 to 0.03). The report: "The base drag for the
smaller flight models appears to be low for some as yet unknown reason."

## 6. OpenRocket base drag (computation)

OpenRocket 13.05 documentation eq. 3.94: CD_base = 0.25/M for M > 1 (citing
Fleeman). Against Love's fig. 18 curves (base_conversions_output.txt): -3.7 to
-5.8% at M 1.5, -10 to -14% at M 2, -14 to -15% at M 2.5, -13 to -18% at M 3.
