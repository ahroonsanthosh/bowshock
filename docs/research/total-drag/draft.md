# 0007: Total drag (draft)

- **Status:** Draft for review. Research only: nothing implemented, nothing
  committed. Follows from [0002](0002-architecture.md) sections 1 to 3 and 9
  to 12.
- **Date:** 2026-10-18
- **Inputs:** the sources of section 8, each opened unless marked otherwise;
  computations and data transcriptions in the draft's working directory
  (`drag-research/scripts/`, `drag-research/data/`), named where used.

**Evidence rule of this record.** Every number comes from a source opened
for this draft (page, table or figure given) or from a computation run for it
(script named). Figures read from scans say how they were digitised. Anything
not checked is marked **[not verified]**.

## 1. Starting point

Today bowshock computes one component: the inviscid forebody wave drag of
sharp and ellipsoid noses, with the bow shock fitted, from nested grids, with
measured bands of order 1e-4 of the value (0005, 0006). By the 0002 scoping
estimates this is 3 to 10% of a supersonic rocket's Cd; friction is 40 to
60%, base 15 to 40%, fins 2 to 35%. The range to serve is Mach 1 to 3, power
off, zero incidence.

Two findings shape everything below:

1. **The data disagree with each other at the 5 to 20% level** for friction
   and base pressure, even between careful experiments (sections 2.2, 3.1,
   3.2). No tool can demonstrate a component band tighter than that.
2. **A fin's drag increment is not the fin's own drag.** On the ARCAS models
   the fins' wave drag and friction explain 49% of the measured fins-on
   increment at Mach 1.5 and 85% at Mach 2.96 (section 4.3). The rest is
   interference and hardware (fin anchors); the evidence points to the base.

## 2. Skin friction

### 2.1 Methods

| Method | What it is | Evidence at Mach 1 to 3 | Source |
| --- | --- | --- | --- |
| Van Driest II (VDII), flat plate, Karman-Schoenherr law | Compressibility transformation of an incompressible law; adiabatic or set wall temperature | Section 2.2. Implemented for this draft: matches the TMR tabulation within 2.4e-7 | `vd2.py`; TMR `cf_vandriestII.dat` |
| Same, applied to a body at free-stream Re | Common practice (RM A53D02, OpenRocket) | RM A53D02: a second method (laminar cone theory with local Re on the ogive, 2D elsewhere) agrees within 3% below M 7.2 | RM A53D02 p. 10, fig. 8 |
| Transverse-curvature (body) corrections | Cylinder versus plate | Measured: about +4% from L/D 8 to 23 (subsonic); two theories predict +1.5% and +15% | TN 3097 pp. 17 to 18 |
| OpenRocket 13.05 | Smooth Cf = 1/(1.50 ln R - 5.6)^2 over (1 + 0.15 M^2)^0.58, body wetted area times 1 + 1/(2 fB), fully turbulent | 1.1 to 4.4% below VDII on representative rockets (computed) | techdoc eqs. 3.78 to 3.85; `friction_study.py` |
| RASAero II | Laminar, transition at flat-plate Re 5e5, turbulent; equivalent sand roughness input | Friction law not given in the manual; no Cd error statistics in the manual | Users Manual pp. 52, 55 |
| DATCOM, Missile DATCOM friction and form factors | | **[not verified]**: not opened | |
| Mangler-type cone factor for turbulent flow | | **[not verified]**: no source opened | |
| SA RANS (M7 to M8) | | CFL3D SA is 2.0% below to 0.3% above VDII at M 2, adiabatic, Re_theta 4000 to 13000 (computed from the TMR files): on flat plates RANS reproduces VDII, so it is not expected to beat it against data unless shown | `sa_vs_vd.py` |

### 2.2 Measured scatter of the flat-plate method against data

| Data | Result | Source |
| --- | --- | --- |
| RM-10 body of revolution in flight, M 1.0 to 3.7, Re 40e6 to 170e6, surface under 60 microinches peak to valley except at joints | Measured average friction about 7% **above** Van Driest's flat-plate theory (his 1950 report AL-997); a +-5% band about the fairing holds 66% of points; the spread is between models, not within one; two earlier flight models up to 25% above the fairing, unexplained | RM L54G14 pp. 4, 7, 10 |
| Cylinders, M 1.99 to 3.60, direct force, adiabatic, tripped, Re 4e6 to 32e6 | VDII ratio CF/CF_i is 3.5 to 11.7% **above** the measured ratio (range from the Reynolds number and stagnation temperature assumed, the report's T0 not found) | TN 3097 table III (report p. 33); `ck_compare.py` |
| Flat plates, M 2.5 to 4.5, Re to 69e6 | Different high-Reynolds data sets differ by up to 15% from each other while each is repeatable; balances of one test differ by +-2 to 3% | TN D-2896 pp. 1, 6 |
| Incompressible reference laws | Differ "of the order of +-5 percent from a mean" | TN 3097 p. 25 |
| Hopkins and Inouye (1971), the standard evaluation | TN D-6945 says it found VDII the most satisfactory for M 1.5 to 9; its scatter figures **[not verified]** (no PDF on NTRS) | TN D-6945 p. 1 |
| TMR Mach 2 flat plate | Theory only (VDII), no measured data; useful to verify an implementation, not to measure error | TMR page |

Taken together (fairing level, not point by point): measured friction lies
between 0.895 and 1.07 times the flat-plate estimate on the two
body-of-revolution data sets (RM-10 against Van Driest's 1950 method, the
cylinders against VDII), with opposite signs on the two. The sign is not consistent, so there is no
correction to apply; there is a **model-form band of at least +-11%** to
attach to a flat-plate VDII estimate on a slender body. Point-by-point
transcription (TN 3097 fig. 17, RM L54G14 fig. 8) is needed before the band
can be stated as a coverage fraction.

### 2.3 Transition and roughness: inputs, not model error

Measured facts:

- RM A53D02 (free flight, polished): natural transition at Re_T about 1.6e6,
  "low in comparison with usual wind tunnel and free-flight experience"
  (p. 13); from all laminar to all turbulent, body friction rises about
  fourfold at low Mach number (p. 8).
- RM-10 in flight: a laminar run to station 20 of 146.5 would lower the
  average by 1.5% (RM L54G14 p. 7).
- Love: artificial transition raises base pressure by 5 to 10% (TN 3819
  p. 15), so transition also moves base drag.

Computed for rockets of length 25 d (d = 54, 98, 152 mm), 3 and 10 km, M 1.2
to 3 (`friction_study.py`):

| Input | Change in body friction against fully turbulent VDII |
| --- | --- |
| Transition at Re_T = 5e5 (RASAero default) | -0.1% to -2.1% |
| Re_T = 1.6e6 (observed in RM A53D02) | -0.5% to -7.8% |
| Re_T = 3e6 | -1.0% to -15.5% |
| Roughness 5 um (OpenRocket's "optimum paint-sprayed") | 0 (OpenRocket's model) |
| Roughness 20 um ("paint in aircraft mass production") | 0 to +25% (OpenRocket's model) |
| Roughness 60 um | +6% to +56% (OpenRocket's model) |

The roughness rows use OpenRocket's correlation (eqs. 3.79, 3.80, 3.84,
citing Hoerner), which this draft did not validate; they show sensitivity, not
truth. No compressible roughness data were opened **[gap]**. Following 0002
section 3, transition and roughness are user inputs, reported as their own
bands beside the model-form band, never folded into it.

### 2.4 A boundary-layer method on the solved pressure: what it buys

Evidence that pressure gradient matters little to the total: RM A53D02's
local-Reynolds method agrees with the flat plate within 3% (p. 10); TN 3097
found "no significant effect on average skin-friction coefficient of small
changes in pressure gradient" (summary). This suggests (an inference, not a
measurement of the method itself) that an integral method driven by the
solved inviscid surface pressure would change total friction by about 3% or
less, below the +-11% model-form band. It is still worth doing, because it
supplies what the other components need and correlations cannot: momentum
and displacement thickness, edge Mach number and pressure just ahead of the
base (the inputs of the base correlations, section 3.1), the boundary layer
at the fin roots, and a place to apply transition and roughness locally. It
is cheap, and its error can be measured on the same data (TN 3097, RM
L54G14).

## 3. Base drag

### 3.1 Methods and their scatter

| Method | Evidence | Source |
| --- | --- | --- |
| Compiled curve of P_B against Mach (Chapman's compilation, Love's "basic curve"; cylindrical afterbody, no fins, turbulent) | Digitised curves: -0.170 to -0.177 at M 1.52, -0.138 to -0.145 at M 2.0, -0.116 to -0.118 at M 2.5, -0.096 to -0.101 at M 3.0. Twelve tunnel points from ten sources, against the curves at the same Mach number, as a ratio of base drag: 0.86 to 1.05 at M 1.52 to 1.63, 0.935 to 1.056 at M 1.94 to 2.42, 0.91 to 1.09 at M 2.68 to 3.51 | TN 3819 fig. 18 (report p. 47); `data/love_tn3819_fig18.csv` |
| Chapman's (L/h) R^(-1/5) correlation | Love: questionable where Mach and pressure ahead of the base vary with afterbody length; L/h is "by far the predominant factor" | TN 3819 p. 15 |
| Love's method (Mach and pressure ahead of the base, wake angle) | "fair predictions"; boat-tail, fineness, fins estimated | TN 3819 summary, pp. 14 to 24 |
| OpenRocket 13.05: CD_base = 0.25/M | 3.7 to 17.5% below the compiled curve at M 1.5 to 3 (computed) | techdoc eq. 3.94; `base_conversions.py` |
| DATCOM base method | **[not verified]**: not opened | |
| RANS, Herrin and Dutton case (M 2.46, sting-free) | Measured p_b/p_inf 0.553 to 0.575; k-epsilon gives 14% (with compressibility correction) to 39% (standard) more base drag than measured. SA results **[not verified]**: none opened. The original paper **[not verified]**: read through Tucker's slides | Tucker 1993, slide p. 900 (visual reading); `base_conversions.py` |
| Herrin and Dutton against the compiled curve | The curve gives 12 to 18% more base drag than this sting-free experiment at M 2.46 (computed) | as above |

### 3.2 What moves base pressure (measured)

| Effect | Size | Source |
| --- | --- | --- |
| Fins with trailing edges at the base | 10%-thick cruciform tail: base drag +70% at M 1.5, +35% at M 2.0; nearly zero one chord fore or aft; 5% thick about half | TN 2360 summary |
| Fins, tunnel against flight | "All the wind-tunnel base pressures for the body with fins are lower than the free-flight results" | TN 3819 p. 23 |
| Sting diameter | Turbulent, d/h from 0.35 to 0.85: P_B about 0.04 to 0.05 more negative at M 1.5 and 2.0, about 0.02 at M 2.9 (visual, +-0.01); length beyond 3 base diameters no effect at d/h 0.3. The ARCAS sting of TN D-4013 is at d/h 0.68 | TR 1051 figs. 22, 23(b) |
| Transition | Artificial transition +5 to 10% in base pressure; the 0.04 "bucket" in RM A53D02's CD near M 1.5 (0.446 to 0.494) attributed to transition across the base and fin shocks | TN 3819 p. 15; RM A53D02 pp. 11, 14 |
| Same configuration, two flight model sizes | RM-10 with fins: base drag about 0.045 to 0.05 against 0.025 to 0.03 at M 1.2 to 1.6, "low for some as yet unknown reason" (visual, +-0.005) | TR 1160 fig. 13, p. 120 |
| Boat-tails | Not quantified here: Love fig. 25 (M 3.24) not digitised; TN 3708 bodies are mostly laminar or transitional (Re 1e6 to 10e6) **[gap]** | |
| Boundary-layer thickness at the base | Not quantified from an opened source beyond Love's L/h remark **[gap]** | |

### 3.3 Honest band

For a cylindrical afterbody without fins near the base, turbulent, Mach 1.5
to 3.5, the opened tunnel data scatter about the compiled curve from -14% to
+5% at Mach 1.5 to 1.6, -6.5% to +6% at Mach 1.9 to 2.4 and -9% to +9% at
Mach 2.7 to 3.5, and a sting-free experiment sits 12 to 18% below it at Mach
2.46: a correlation band of **+-15 to 20%** on base drag is what the evidence
supports. With fins ending
within a chord of the base, measured increments of 35 to 70% at Mach 1.5 to
2 have no validated correlation among the sources opened, so the band must
cover them or the configuration must be refused. Below Mach 1.5 no clean base
data were opened (TN D-4013 is sting-affected and boat-tailed): not claimable.

## 4. Fins

### 4.1 The section: linear, second order, exact, real edges

| Comparison | Result | Source |
| --- | --- | --- |
| Exact shock-expansion against Ackeret, symmetric double wedge | t/c 0.03: +1.7% at M 1.2, within 0.5% at M 1.3 to 3. t/c 0.05: +6.1% at M 1.2, +1.5% at M 1.3, within 0.4% at M 1.5 to 3. t/c 0.08: shock detached at M 1.2, +4.8% at M 1.3, within 1% at M 1.5 to 3 | `section2d.py` |
| Busemann (second order) | Equals Ackeret for a symmetric double wedge (the second-order terms of front and rear faces cancel in the drag); differs for wedge-flat-blunt and asymmetric sections | derivation in `data/fin_computations.md` |
| Square leading edge, upper bound (pitot pressure on the face) | 4.6 to 7.7 times the sharp double-wedge wave drag at M 1.2, 14 to 24 at M 2, 25 to 41 at M 3 (t/c 0.05 and 0.03) | `blunt_le.py` |
| Blunt fin leading edge, measured | RM A53D02: total CD up about 0.02 below M 5, about 100% of fin wave drag; symmetric bevel almost no change | RM A53D02 p. 15 |
| OpenRocket 13.05 fin pressure drag | Leading edge as a cylinder in cross flow times cos^2 of the sweep, trailing edge as base drag; no supersonic thickness wave drag for sharp sections | techdoc pp. 49 to 50 |

The planar mode of the 2D Euler engine is verified on wedges and expansions
(0003: wall pressure within 0.015% on 60 x 30 cells, with the shared
reconstruction), so it can solve sharp fin sections exactly in the inviscid
sense on nested grids. The fitted-shock driver is axisymmetric only
(`src/analysis/fitted-flow.ts` sets `geometry: 'axisymmetric'`), and the
blunt-body grid is axisymmetric (`src/grid/blunt-grid.ts`): blunt or rounded
leading edges need a planar blunt grid and planar shock fitting (new work).
For sharp symmetric sections at Mach 1.5 and above the exact 2D solve changes
the section drag by 1% or less from Ackeret; its value is at Mach 1 to 1.5,
for thick or asymmetric sections, and for real edges.

### 4.2 Strip theory against linear 3D theory

Computed with a linear supersonic source-sheet code written for this draft
(`finwave.py`), checked against four analytic results: the 2D limit and the
infinite swept wing with supersonic edges (both to 1e-6), zero wave drag of an
infinite swept wing with subsonic edges, and the tip-cone pressure of a
constant-slope sheet (6 digits); integrated drag converges to 0.2%. Fins on a
plane wall (image included), double wedge unless stated. Ratio of 3D to strip
drag; beta cot(LE sweep) in brackets (above 1: supersonic leading edge):

| Fin | M 1.2 | M 1.5 | M 2.0 | M 3.0 |
| --- | --- | --- | --- | --- |
| ARCAS fin: taper 0.64, LE 30 deg | 1.024 (1.15) | 1.056 (1.94) | 1.031 (3.00) | 1.012 (4.90) |
| Trapezoid: span = root, taper 0.5, LE 26.6 deg | 1.100 (1.33) | 1.051 (2.24) | 1.022 (3.46) | 1.009 (5.66) |
| Same, hexagonal section, 15% bevels | 1.156 | 1.059 | 1.023 | 1.008 |
| Clipped delta: span = root, taper 0.25, LE 36.9 deg | 1.103 (0.88) | 1.103 (1.49) | 1.044 (2.31) | 1.017 (3.77) |
| Clipped delta: span = root/2, taper 0.5, LE 45 deg | 0.933 (0.66) | 1.096 (1.12) | 1.082 (1.73) | 1.033 (2.83) |
| Swept trailing edge: LE 45 deg, TE 16.7 deg, taper 0.475 | 1.020 (0.66) | 1.195 (1.12) | 1.102 (1.73) | 1.036 (2.83) |
| RM A53D02 planform, LE 71.6 deg | 0.421 (0.22) | 0.625 (0.37) | 0.894 (0.58) | 1.042 (0.94) |
| Rectangle, span = chord | 1.000 | 1.000 | 1.000 | 1.000 |

(M 2.5 and the cases' full definitions: `data/fin_computations.md`.) Strip
theory is within 6% when beta cot(LE) exceeds 2, errs by up to 20% when it
lies between 1 and 2 (Mach 1.2 to 2 on common planforms), and by -58% to +10%
with subsonic leading edges (a factor of 2.4 for the 71.6 deg fin at Mach
1.2). For the unit-span rectangle the tip effects cancel in the total to 4
digits (not section by section); at span/chord 0.2 the ratio falls to 0.65 at
Mach 1.2. A linear-theory 3D factor per planform removes the strip error to
the accuracy of linear theory itself, which no opened source measures for
fins **[gap]**.

### 4.3 Fin-body and fin-base interference

ARCAS models, measured increment against the fins' own drag (linear 3D wave
drag plus fully turbulent VDII friction, `arcas_fin_check.py`):

| M | Fins' own drag (on body cross-section) | Measured increment | Own / measured |
| --- | --- | --- | --- |
| 1.50 | 0.093 | 0.188 | 0.49 |
| 1.80 | 0.079 | 0.137, 0.136 | 0.58 |
| 2.30 | 0.066 | 0.092, 0.085 | 0.72 to 0.78 |
| 2.96 | 0.056 | 0.066, 0.066 | 0.85 |

The ARCAS fin trailing edges end 0.27 in ahead of the base, the Spahr and
Dickey worst case, and TN D-4014 reports the fins changing the chamber force
at Mach 1.5 and 1.8 (p. 6); the shortfall falls with Mach number as their
base increments do. Fin anchors and the fins-off slot treatment are also in
the increment, so this is a plausibility check, not a validation. No opened
source quantifies zero-lift fin-body interference on the fin's own pressures
**[gap]**; RM A53D02 neglected it (p. 8). Consequence: fins must be validated
against measured increments (fins on minus fins off) or against totals, never
as isolated panels, and a 3D solve that includes the base is needed whenever
fins end near the base, at least at Mach 1.5 to 2.3 where the effect is
measured (below Mach 1.5 it was not measured in the sources opened).

## 5. Validation data for the total

| Data set | Geometry | Re, transition | Stated uncertainty | Data, location | Status |
| --- | --- | --- | --- | --- | --- |
| ARCAS, TN D-4014, M 1.5 to 4.63 | Ogive (table of ordinates), L/d 18.20 and 23.77, d = 2.250 in, boat-tail with reflexed lip, four trapezoidal double-wedge fins t/c 0.044 with anchors (fig. 1) | 9.84e6 per m, tripped (No. 60 grit) | CA +-0.004; M +-0.015 | CA vs alpha plotted, figs. 5, 6 (axial force includes base); chamber force fig. 4 | Geometry transcribed; 14 CA values at M 1.5 to 2.96 digitised (+-0.002 to 0.003); fig. 4 not digitised; boat-tail profile needs a second reading |
| ARCAS, TN D-4013, M 0.6 to 1.2 | Same models; sting 2.54 cm, d/h 0.68 | 9.8e6 per m, tripped (No. 120) | CA +-0.004; Cp,b +-0.01 | CA,corr and CA,b vs M, faired, figs. 11, 12 | 16 values at M 1.00 and 1.20 digitised (+-0.003 to 0.008) |
| RM A53D02, free flight, M 0.6 to 10 | Tangent ogive 4 cal, cylinder, L/d 10, d = 0.25 in, four trapezoidal fins, 71.6 deg LE, wedge-flat-blunt section t/c 0.04, base hole | R 1.5e6 to 4.9e6 at M 1 to 3.3, natural (R_T about 1.6e6) | Scatter < +-2% at M 2; systematic < 1%; alpha correction up to 2.5% | CD fig. 11; table I | 13 values at M 1.04 to 3.3 digitised (+-0.0005); geometry and table I transcribed; one aspect-ratio inconsistency (0.426 stated, 0.444 from drawing) |
| Basic Finner, Dupuis and Hathaway (DREV TM 9703, DTIC ADA636861), range, M 1.0 to 4.5 | "four rectangular fins on a cone-cylinder body", L/d 10.0 (abstract) | | | | **[not verified]**: DTIC returned "The request is blocked" to every URL; only the abstract read (via web search) |
| RM-10 (TR 1160, RM L54G14, RM L52H21), tunnels and flight, M 0.85 to 3.7 | Parabolic body fineness 12.2, with and without four 60 deg fins | 1e6 to 170e6, fixed and natural | Between facilities with fins: unexplained differences (TR 1160) | Total, base, friction, forebody pressure drag (figs.); L52H21 gives base, wave, friction vs Re at M 1.62 to 2.41 | Statements read; values not transcribed except visual readings of TR 1160 fig. 13 |
| Stoney, TR R-100, free flight, M 0.6 to 2.0 | 177 finned bodies of revolution on standard forms | 2e6 to 100e6 | CD +-0.01, M +-0.01 from repeat models (pp. 2 to 3) | Total CD per configuration (appendix) | Summary and accuracy read; candidates not yet selected |
| Component gates: TN 3097 (friction), RM L54G14 (friction), TN 3819 fig. 18 (base), TN 2360 (fins on base), Herrin and Dutton (base) | | | | | Transcribed or read as listed in sections 2 and 3 |

Transcriptions: `data/arcas_tn-d-4014_tn-d-4013.md` and
`arcas_ca_alpha0.csv`, `data/rm-a53d02.md` and `rm-a53d02_cd.csv`, plus the
component files listed in `data/README.md`.

## 6. Plan for Phase B

### 6.1 Rules carried over from 0002 section 12

Solved quantities come from nested grids with measured bands (0005). The
fin method of B4 (2D Euler sections with a linear 3D factor) is the "not yet
available in 3D" case of 0002 section 12 and is labelled as such. Every
correlation is labelled on the page and in the export, with a band measured
on validation data that were not used to tune it. Where no measured band
exists the component is refused with a message, not estimated. RANS (M5 to
M8) and the 3D sector (M10, M11) replace the correlations where, and only
where, their own validation shows a smaller measured error.

### 6.2 Steps, in order

| Step | Deliver | Band measured on | Gate (tolerance) |
| --- | --- | --- | --- |
| B1 Data | Per-point transcriptions into `src/validation` with digitisation records: TN 3097 fig. 17, RM L54G14 figs. 7 to 8, TN 3819 fig. 18 with references, TN 2360 tables, RM L52H21, the ARCAS and RM A53D02 sets above, ARCAS fig. 4 | | Each figure read twice independently; readings agree within the stated reading error |
| B2 Friction | VDII with a compressible momentum-integral boundary layer driven by the solved surface pressure (nose and body), fins as plates of local chord; transition input (default fully turbulent, laminar run to a user Re_T); roughness input shown as a band only until a compressible roughness model is validated | TN 3097 table III and fig. 17; RM L54G14 (flight); verification against the TMR VDII file | Implementation within 1e-6 of the TMR file; every gate point inside the stated model-form band (today about +-11%, to be restated after B1) |
| B3 Base | Compiled-curve correlation fed by the solved Mach number and pressure ahead of the base and by B2's boundary layer, labelled "correlation" | TN 3819 fig. 18 points; Herrin and Dutton (once the original is opened); TN 2360 body alone | Every gate point inside the band (today +-15 to 20%); fins ending within one chord of the base: TN 2360 increments carried as a labelled one-sided band, or refused; boat-tails refused until a boat-tail set is transcribed and gated |
| B4 Fins | Section drag from the planar Euler engine on nested grids (sharp sections first), times the linear 3D factor per planform (port of `finwave.py` with its four analytic checks as tests); fin friction from B2; blunt trailing edge from B3; blunt leading edges refused until planar fitting exists | Fin increments: ARCAS (7 points), Stoney sets with fins on and off where available | Every increment inside the band. Today the fins' own drag explains 49 to 85% of the ARCAS increments, so B4 must either include a labelled fin-on-base term measured on TN 2360 or carry the shortfall in its band |
| B5 Total | Sum of nose wave drag (solved), body friction, base, fins; Cd with model-form band and, separately, the input bands (transition, roughness) | Component bands only, never the totals | Hold-out: all 14 ARCAS TN D-4014 points within band plus +-0.004 (report) plus reading error; all 13 RM A53D02 points within band plus 2% scatter, 1% systematic, alpha correction and reading error. TN D-4013 (M 1.0, 1.2): reported, not a gate |

### 6.3 Combining the bands

Component model-form bands are added linearly, not in quadrature: the same
experiments constrain several components (a base-pressure error and a fin
increment error are not independent on ARCAS), and independence has not been
shown. Discretisation bands of solved parts (0005) are added. Transition and
roughness are shown as separate bands. As an illustration only, with the
0002 scoping shares (friction 50%, base 30%, fins 15%, nose 5%) and today's
bands (+-11%, +-15%, +-50% of the fin increment, 1e-3): the linear sum is
about +-18% of Cd. This is arithmetic on assumptions, not a measurement; the
gates of 6.2 decide.

### 6.4 What the first release could and could not claim

Could claim, if the gates pass:

- Total Cd at Mach 1.5 to 3 for slender, cylindrical-afterbody, finned
  rockets inside the envelope of the validation set (fineness, fin geometry,
  Reynolds number), with a measured model-form band of order +-15 to 20% and
  separate transition and roughness bands.
- A breakdown into nose wave drag (solved, band about 1e-4), friction, base
  and fins, each with its own band and label.
- Agreement with the ARCAS wind-tunnel and RM A53D02 free-flight totals
  within those bands, cases not used to set them.

Could not claim:

- Better accuracy than RASAero II or OpenRocket: not shown until both are run
  on the same validation set (the 0002 spike).
- Mach 1 to 1.5: drag rise, base and fin interactions unvalidated (TN D-4013
  shows the steep rise; the base data there are sting-affected).
- Boat-tails, highly swept fins with subsonic leading edges, blunt or rounded
  fin edges, fins ending near the base without the labelled increment.
- Predicted natural transition, roughness effects, power-on base flow.

## 7. Open questions

- Hopkins and Inouye (1971) and Herrin and Dutton (1994) originals, both
  copyrighted AIAA papers, not opened.
- The Basic Finner reports: DTIC blocked; a reachable copy is needed.
- The boat-tail and boundary-layer-thickness effects on base pressure (Love
  figs. 19, 25; DATCOM).
- Whether RM L54G14's "Van Driest's theory" (AL-997) is VDII.
- Linear-theory accuracy for 3D fin wave drag against data or 3D Euler (M10).
- RANS (SA) base-pressure error on Herrin and Dutton: not found in the
  opened sources; the M8 gate decides RANS or correlation for the base.

## 8. Sources consulted for this draft

| Source | Status |
| --- | --- |
| NASA TN D-4014 (NTRS 19670020031) | Opened; figs. 1, 5, 6 read and digitised; fig. 4 viewed, not digitised |
| NASA TN D-4013 (NTRS 19670020050) | Opened; text and figs. 11, 12 |
| NACA RM A53D02 (NTRS 19930087740) | Opened; text, table I, figs. 1, 11 |
| NACA RM L54G14, Loposer and Rumsey 1954 (NTRS 20030068110) | Opened (scanned pages read as images) |
| NACA TN 3097, Chapman and Kester 1954 (NTRS 19930083801) | Opened; text and table III |
| NACA TR 1160, Evans 1954 (NTRS 19930092188) | Opened; text and fig. 13 |
| NACA RM L52H21, Love, Coletti and Bromm 1952 (NTRS 19930087258) | Summary read only |
| NACA TN 3708, Bromm and Goodwin 1956 (NTRS 19930084477) | Summary read only |
| NASA TN D-6945, Hopkins 1972 (NTRS 19730001588) | Opened |
| Hopkins and Inouye, AIAA J. 9 (1971) (NTRS record 19710049171) | Not opened: no PDF; abstract only |
| NASA TN D-2896, Monta and Allen 1965 (NTRS 19650018215) | Opened |
| NASA TN D-3588, Peterson and Monta 1966 (NTRS 19660027862) | Opened; compares Sommer-Short and Spalding-Chi, not VDII; not used |
| NASA TN D-7507, Cary and Bertram 1974 (NTRS 19740020652) | Abstract read; covers M 4 to 13, outside the range; not used |
| NACA TN 3819, Love 1957 (NTRS 19930084517) | Opened; text and fig. 18 |
| NACA TR 1051, Chapman 1951 (NTRS 19930090963) | Opened; appendix B, figs. 22, 23 |
| NACA TN 2360, Spahr and Dickey 1951 (NTRS 19930083086) | Opened |
| P. K. Tucker, MSFC 1993 (NTRS 19950017232) | Opened (slides) |
| Herrin and Dutton, AIAA J. 32(1) 1994 | Not opened |
| NACA TN 1448, Margolis 1947 (NTRS 19930082080); NACA TN 3418 (NTRS 19930084221) | Abstracts and summary read; TN 1448 scan unreadable by OCR; not used |
| NASA TR R-100, Stoney 1961 (NTRS 19630004995) | Summary and accuracy read |
| Dupuis and Hathaway 1997, DTIC ADA636861 | Not opened (DTIC blocked); abstract via web search |
| TMR high-Mach flat plate pages and data files (tmbwg.github.io) | Opened; files downloaded |
| OpenRocket technical documentation (openrocket.sourceforge.net/techdoc.pdf) | Opened; it describes version 13.05, not 24.12 as `sources.md` implies |
| RASAero II Users Manual v1.0.2.0 | Opened |
