# 0008: Total drag (draft)

- **Status:** Draft. Research only: nothing implemented. Follows from
  [0002](0002-architecture.md) sections 1 to 3 and 9 to 12, and uses
  [0007](0007-skin-friction.md) for skin friction. Revised after two rounds
  of independent audit ([round 1](../research/total-drag/audit/audit.md),
  [round 2](../research/total-drag/audit/round2/audit_round2.md)); see
  "Changes from the first draft" at the end.
- **Date:** 2026-10-19
- **Inputs:** the sources of section 8, each opened unless marked otherwise.
  Computations and transcriptions are in
  [`../research/total-drag/`](../research/total-drag/): scripts in
  `scripts/`, transcriptions and saved outputs in `data/`. File names in this
  record are relative to that folder (`data/...`; scripts and outputs by
  name, scripts in `scripts/`, outputs in `data/`).

**Evidence rule of this record.** Every number comes from a source opened
for this draft (page, table or figure given) or from a computation run for it
(script named, output saved). Figures read from scans say how they were
digitised. Anything not checked is marked **[not verified]**.

**Reading rule for plotted symbols.** Where the authors drew a faired curve
through the symbols, the value is read on the curve at the abscissa wanted.
Otherwise it is the symbol's centroid: the centre of the bounding box for
circles, squares and diamonds, one third of the height above the base for
triangles. Each figure used for a band or a gate is read twice
independently; where the two readings differ by more than their combined
reading error, both are recorded and the one that widens the band is used.

## 1. Starting point

Today bowshock computes the inviscid forebody wave drag of sharp and
ellipsoid noses, with the bow shock fitted, from nested grids, with measured
bands of order 1e-4 of the value (0005, 0006), and (0007) a skin-friction
library with a measured model-form band. By the 0002 scoping estimates the
nose wave drag is 3 to 10% of a supersonic rocket's Cd; friction is 40 to
60%, base 15 to 40%, fins 2 to 35%. The range to serve is Mach 1 to 3, power
off, zero incidence.

Three findings shape everything below:

1. **The data disagree with each other at the 5 to 20% level** for friction
   and base pressure. 0007 measured friction between 0.88 and 1.19 times van
   Driest II over 23 comparisons; individual tunnel points lie 14% below to
   8% above the compiled base-pressure curve, and the one candidate
   sting-free experiment lies 12% to 18% below it (section 3). No tool can
   demonstrate a component band tighter than that.
2. **A fin's drag increment is not the fin's own drag, and the base explains
   only part of the difference.** On the ARCAS models the fins' own wave drag
   and friction are 49% to 85% of the measured fins-on increment. The
   measured change of the balance-chamber force accounts for 29% to 50% of
   the shortfall at Mach 1.5 and 1.8 on the short model and 15% to 20% at
   Mach 1.8 on the long one; 21% to 37% of the increment at Mach 1.5 and 1.8
   remains unexplained (section 4.3).
3. **No validation case matches the configuration a rocket tool would most
   like to claim.** Among the sources opened there is no total-drag
   measurement at Mach 1 to 3 of a finned cylindrical-afterbody body with the
   fins clear of the base. The one matching free-flight set is the Basic
   Finner, whose fins end at the base and whose shots cover Mach 1.80 to
   2.97 (none between 1.38 and 1.80; section 5). The first release can claim
   only what that set tests, and the fins-on-base increment it needs is
   carried over from circular-arc fins by analogy (sections 3.4, 6.4).

## 2. Skin friction

### 2.1 Methods

| Method                                                     | What it is                                                                                                       | Evidence at Mach 1 to 3                                                                                                                                                                                            | Source                                                                      |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Van Driest II (VDII), flat plate, Karman-Schoenherr law    | Compressibility transformation of an incompressible law; adiabatic or set wall temperature                       | Implemented in `src/friction/` (0007): 2.4e-7 to 4.7e-7 from the TMR file on all four cases                                                                                                                        | 0007 section 2                                                              |
| VDII on a body: momentum integral or local Reynolds number | Axisymmetric momentum integral d(r theta)/ds = r cf/2, or flat plate at the local surface distance               | RM-10 flight: momentum integral 6.3% below the data on average (sd 5.4%), local Reynolds number 13.4% below (sd 5.1%)                                                                                              | 0007 section 3.2                                                            |
| Transverse-curvature (body) corrections                    | Cylinder versus plate                                                                                            | Measured: about +4% from L/D 8 to 23 (subsonic); two theories predict +1.5% and +15%                                                                                                                               | TN 3097 pp. 17 to 18                                                        |
| OpenRocket 13.05                                           | Smooth Cf = 1/(1.50 ln R - 5.6)^2 over (1 + 0.15 M^2)^0.58, body wetted area times 1 + 1/(2 fB), fully turbulent | Cf law 1.1% to 4.4% below VDII on representative rockets; with the wetted-area factor (fB = 25) the body friction is 2.5% below to 0.9% above flat-plate VDII (computed)                                           | techdoc eqs. 3.78 to 3.85; `friction_study.py`, `or_body_factor_output.txt` |
| RASAero II                                                 | Laminar, transition at flat-plate Re 5e5, turbulent; equivalent sand roughness input                             | Friction law not given in the manual; no Cd error statistics in the manual                                                                                                                                         | Users Manual pp. 52, 55                                                     |
| DATCOM, Missile DATCOM friction and form factors           |                                                                                                                  | **[not verified]**: not opened                                                                                                                                                                                     |                                                                             |
| SA RANS (M7 to M8)                                         |                                                                                                                  | CFL3D SA is 2.0% below to 0.3% above VDII at M 2, adiabatic, Re_theta 4000 to 13000 (computed from the TMR files): on flat plates RANS reproduces VDII, so it is not expected to beat it against data unless shown | `sa_vs_vd.py`                                                               |

### 2.2 Model-form band

The band is 0007's, recomputed there point by point: measured over modelled
turbulent friction lay between **0.88 and 1.19** (a band of -12% to +19%
about van Driest II) on all 23 comparisons, the 5 Mach numbers of TN 3097
table III in both columns (cylinders, tunnel, M 1.99 to 3.60) and 13 points of
RM L54G14 fig. 10 (RM-10 body in flight, M 1.04 to 2.90). The two sets lie on
opposite sides (cylinders below the model, RM-10 above), so no correction is
justified and the band cannot be stated as a coverage fraction. It holds for
smooth, adiabatic, turbulent layers from a known origin at Mach 1.0 to 3.6,
Re 6e6 to 16e6 (tunnel) and about 60e6 (flight) (0007 section 4). It replaces
the first draft's "at least +-11%", which compared against a 1950 theory of
uncertain identity and was narrower than the point-by-point evidence.

Other evidence, not used for the band:

| Data                                               | Result                                                                                                                                   | Source             |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Flat plates, M 2.5 to 4.5, Re to 69e6              | Different high-Reynolds data sets differ by up to 15% from each other while each is repeatable; balances of one test differ by +-2 to 3% | TN D-2896 pp. 1, 6 |
| Incompressible reference laws                      | Differ "of the order of +-5 percent from a mean"                                                                                         | TN 3097 p. 25      |
| Hopkins and Inouye (1971), the standard evaluation | TN D-6945 says it found VDII the most satisfactory for M 1.5 to 9; its scatter figures **[not verified]** (no PDF on NTRS)               | TN D-6945 p. 1     |
| TMR Mach 2 flat plate                              | Theory only (VDII); verifies an implementation, does not measure error                                                                   | TMR page           |

### 2.3 Transition and roughness: inputs, not model error

Measured facts:

- RM A53D02 (free flight, polished): natural transition at Re_T about 1.6e6,
  "low in comparison with usual wind tunnel and free-flight experience"
  (p. 13); from all laminar to all turbulent, body friction rises about
  fourfold at low Mach number (p. 8).
- RM-10 in flight: a laminar run back to station 20 would lower the average,
  measured ahead of the rake at station 125, by 1.5% (RM L54G14 p. 7); 0007
  computes -2.4% to -2.6% with the momentum integral (0007 section 3.3).
- Love: artificial transition raises base pressure by 5 to 10% (TN 3819
  p. 15), so transition also moves base drag.

Computed for rockets of length 25 d (d = 54, 98, 152 mm), 3 and 10 km, M 1.2
to 3 (`friction_study.py`):

| Input                                                 | Change in body friction against fully turbulent VDII |
| ----------------------------------------------------- | ---------------------------------------------------- |
| Transition at Re_T = 5e5 (RASAero default)            | -0.1% to -2.1%                                       |
| Re_T = 1.6e6 (observed in RM A53D02)                  | -0.5% to -7.8%                                       |
| Re_T = 3e6                                            | -1.0% to -15.5%                                      |
| Roughness 5 um (OpenRocket's "optimum paint-sprayed") | 0 (OpenRocket's model)                               |
| Roughness 20 um ("paint in aircraft mass production") | 0 to +25% (OpenRocket's model)                       |
| Roughness 60 um                                       | +6% to +56% (OpenRocket's model)                     |

The roughness rows use OpenRocket's correlation (eqs. 3.79, 3.80, 3.84,
citing Hoerner), which this draft did not validate; they show sensitivity, not
truth. No compressible roughness data were opened **[gap]**. Following 0002
section 3, transition and roughness are user inputs, reported as their own
bands beside the model-form band, never folded into it.

### 2.4 The boundary layer as a carrier for the other components

RM A53D02's local-Reynolds method agrees with the flat plate within 3%
(p. 10); TN 3097 found "no significant effect on average skin-friction
coefficient of small changes in pressure gradient" (summary). So driving
0007's momentum integral with the solved inviscid surface pressure is
expected (an inference, not a measurement) to move total friction by a few
percent, inside the -12% to +19% band. It is still worth doing, because it
supplies what the other components need: momentum and displacement thickness,
edge Mach number and pressure just ahead of the base (the inputs of the base
correlations, section 3.1), the boundary layer at the fin roots, and a place
to apply transition locally.

## 3. Base drag

Ratios in this section are measured over compiled curve, as a ratio of base
drag.

### 3.1 Methods and their scatter

| Method                                                                                                                      | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Source                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Compiled curve of P_B against Mach (Chapman's compilation, Love's "basic curve"; cylindrical afterbody, no fins, turbulent) | The two curves (the audit's reading adopted): -0.1733 to -0.1775 at M 1.5, -0.1447 to -0.1496 at 2.0, -0.1172 to -0.1196 at 2.5, -0.0964 to -0.0978 at 3.0. A second reading (robust fits) confirms 13 of the 20 values at the ten ratio Mach numbers within 0.0004: the less negative curve at M 1.5 to 3.0 and both curves at M 1.63 and 2.41 to 2.68; the more negative curve at M 1.5, 1.94, 2.0 and 3.0 and both curves at M 3.24 to 3.50 rest on one reading (`love18_twice_output.txt`), so the low ends of the ratios at M 1.5 to 2.0 do too. Twelve tunnel points from about seven sources (assignment by symbol shape, provisional), two readings agreeing within 0.003: 0.856 to 1.043 at M 1.50 to 1.63, 0.913 to 1.009 at 1.94 to 2.42, 0.913 to 1.078 at 2.68 to 3.50 | TN 3819 fig. 18 (report p. 47); `data/love_tn3819_fig18.csv`, `base_ratios_v3_output.txt` |
| Chapman's (L/h) R^(-1/5) correlation                                                                                        | Love: questionable where Mach and pressure ahead of the base vary with afterbody length; L/h is "by far the predominant factor"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | TN 3819 p. 15                                                                             |
| Love's method (Mach and pressure ahead of the base, wake angle)                                                             | "fair predictions"; boat-tail, fineness, fins estimated                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | TN 3819 summary, pp. 14 to 24                                                             |
| OpenRocket 13.05: CD_base = 0.25/M                                                                                          | 3.8% to 16.4% below the compiled curves at M 1.5 to 3 (computed)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | techdoc eq. 3.94; `base_ratios_v2_output.txt`                                             |
| DATCOM base method                                                                                                          | **[not verified]**: not opened                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |                                                                                           |
| RANS, Herrin and Dutton case (M 2.46)                                                                                       | Measured p_b/p_inf 0.553 to 0.575; k-epsilon gives 14% (with compressibility correction) to 39% (standard) more base drag than measured. SA results **[not verified]**: none opened. The original paper **[not verified]**: read through Tucker's slides                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Tucker 1993, slide p. 900 (visual reading); `base_conversions.py`                         |
| Herrin and Dutton against the compiled curves                                                                               | The curves give 13% to 21% more base drag (measured over curve 0.824 to 0.885); the curves' p_b/p_inf at M 2.46 is 0.484 to 0.495 (computed)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | as above; `base_ratios_v2_output.txt`                                                     |

### 3.2 What moves base pressure (measured)

| Effect                                           | Size                                                                                                                                                                                                                                                                                                                                   | Source                                                       |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Fins with trailing edges at the base             | 10%-thick cruciform tail: base drag +70% at M 1.5, +35% at M 2.0; nearly zero one chord fore or aft; 5% thick about half (sting-supported, d/h 0.4)                                                                                                                                                                                    | TN 2360 summary, p. 4                                        |
| Same, M 1.5 to 3.0, free flight and tunnel       | 10%-thick circular-arc rectangular fins at the base: P_B with fins over P_B without 1.51 at M 1.8, 1.32 at 2.0, 1.24 to 1.26 at 2.2 to 2.4, 1.28 at 2.6, 1.31 at 2.8 (free flight against the no-fin curve); 1.68, 1.39, 1.37 at M 1.50, 2.00, 2.41 (tunnel pairs) (section 3.4)                                                       | TN 3819 fig. 35, first reading; `data/love_fig35_tn3819.csv` |
| Fins, tunnel against flight                      | "All the wind-tunnel base pressures for the body with fins are lower than the free-flight results"                                                                                                                                                                                                                                     | TN 3819 p. 23                                                |
| Sting diameter                                   | Turbulent, d/h from 0.35 to 0.85, two readings: P_B -0.174 to -0.238 at M 1.5 (change 0.064; audit 0.061), -0.141 to -0.190 at M 2.0 (0.049; audit 0.042), -0.115 to -0.142 at M 2.9 (0.027; audit 0.025); the larger change is used. Length beyond 3 base diameters no effect at d/h 0.3. The ARCAS sting of TN D-4013 is at d/h 0.68 | TR 1051 figs. 22, 23(b); `chap23b_output.txt`                |
| Free flight against the compiled curves, no fins | Langley free-flight curve on fig. 18 (R 30e6 to 35e6): 1.027 to 1.122 at M 1.06 to 1.21                                                                                                                                                                                                                                                | TN 3819 fig. 18; `love18_ff_output.txt`                      |
| Transition                                       | Artificial transition +5 to 10% in base pressure; the 0.04 "bucket" in RM A53D02's CD near M 1.5 (0.446 to 0.494) attributed to transition across the base and fin shocks                                                                                                                                                              | TN 3819 p. 15; RM A53D02 pp. 11, 14                          |
| Same configuration, two flight model sizes       | RM-10 with fins: base drag about 0.045 to 0.05 against 0.025 to 0.03 at M 1.2 to 1.6, "low for some as yet unknown reason" (visual, +-0.005); the flight report puts half-scale base drag 25 to 50% below full scale and suspects afterburning of the half-scale sustainer                                                             | TR 1160 fig. 13, p. 120; TN 3320 pp. 1, 7                    |
| Boat-tails                                       | Not quantified: Love fig. 25 (M 3.24) not digitised; TN 3708 bodies are mostly laminar or transitional (Re 1e6 to 10e6) **[gap]**                                                                                                                                                                                                      |                                                              |
| Boundary-layer thickness at the base             | Not quantified from an opened source beyond Love's L/h remark **[gap]**                                                                                                                                                                                                                                                                |                                                              |

### 3.3 The band and its bias

For a cylindrical afterbody without fins near the base, turbulent, Mach 1.5
to 3.5, the evidence about the compiled curve is:

- tunnel points (all sting-supported, as compiled): 0.856 to 1.078;
- Herrin and Dutton at M 2.46: 0.824 to 0.885. The first draft called this
  experiment sting-free. That is **[not verified]**: Tucker's slides do not
  describe the support and the original was not opened;
- free flight without fins, below the range: 1.027 to 1.122 at M 1.06 to
  1.21;
- the sting effect itself (TR 1051): a thicker sting lowers the turbulent base
  pressure, by 37% of P_B at M 1.5 from d/h 0.35 to 0.85 (computed from the
  first reading, 0.064/0.174), 35% at M 2.0 and 23% at M 2.9.

So the sign of the curve's bias for a free-flying body is not established.
The tunnel points at M 1.9 to 2.7 lie at or below the curves, and the one
candidate sting-free point lies 12% to 18% below them, which points to too
much base drag at M 2 to 2.5. Free flight near M 1.1 lies above them, which
points the other way. The bias is likely Mach-dependent and is measured at
two Mach numbers only. The band therefore cannot be symmetric about the
curve. From the opened evidence, at Mach 1.5 to 3: **measured over curve
0.82 to 1.08**, the low end resting on one experiment whose support is not
verified.

Every base data set opened at these conditions is used to set this band, so
none is left to gate it: the base correlation is **band estimation**, and its
only test is through the total (section 6.2, B5).

Below Mach 1.5 the base data opened are the free-flight curve above, TN
D-4013 (sting-affected, boat-tailed) and TN 3372 (identical models disagree
by up to 0.06 in P_B at subsonic speeds, p. 3): not claimable.

### 3.4 Fins ending at the base: the increment and its band

With fins ending within a chord of the base no validated correlation exists
among the sources opened. What exists is a measured factor on the body's
base pressure, F = P_B with fins over P_B without, for one family of fins:
four rectangular, unswept, circular-arc fins whose trailing edges are at the
base. Love's fig. 35 (TN 3819, t/c 0.10, x/c 0; first reading, the second
pending; `data/love_fig35_tn3819.csv`, calibration and identification in
its header) gives it over Mach 1.5 to 3.0:

| M    | Free flight (ref. 12), finned, P_B     | No-fin curve, P_B | F, free flight | F, tunnel pairs                              |
| ---- | -------------------------------------- | ----------------- | -------------- | -------------------------------------------- |
| 1.50 |                                        |                   |                | 1.68 (ref. 26: -0.325 / -0.194)              |
| 1.80 | -0.2362 (+-0.005)                      | -0.1569           | 1.51           |                                              |
| 2.00 | -0.1905 (+-0.005)                      | -0.1447           | 1.32           | 1.39 (ref. 26: -0.208 / -0.150)              |
| 2.20 | -0.1649                                | -0.1331           | 1.24           |                                              |
| 2.40 | -0.1538                                | -0.1224           | 1.26           | 1.37 (Langley 9 in at 2.41: -0.164 / -0.120) |
| 2.60 | -0.1445                                | -0.1126           | 1.28           |                                              |
| 2.80 | -0.1359                                | -0.1039           | 1.31           |                                              |
| 2.97 | -0.1288 (extrapolated from 2.7 to 2.8) | -0.0975           | 1.32           |                                              |

The figure's no-fin curve reproduces the fig. 18 basic curve within 0.001,
a calibration check. The tunnel factors are larger than the free-flight ones
where both exist (TN 3819: "All the wind-tunnel base pressures for the body
with fins are lower than the free-flight results", p. 23).

The Basic Finner's fins differ: single wedges, thickest (t/c 0.08) at a blunt
trailing edge, not circular arcs with sharp trailing edges. No opened source
measures F for such fins, so carrying F over is an **analogy, not a
measurement**, and is labelled so. Its band for the Basic Finner
(`love35_factor.py`, `data/love_fig35_factor.csv`):

- low end: half the 10%-thick increment, since TN 2360's 5%-thick fins gave
  about half the increments of 10% (summary), with the reading error;
- high end: the larger of the free-flight factor and the tunnel factor (the
  tunnel pairs reach M 2.41 only), with the reading error.

That gives F = 1.24 to 1.54 at M 1.8, 1.14 to 1.39 at 2.0, 1.12 to 1.37 at
2.4, 1.13 to 1.30 at 2.6 and 1.15 to 1.34 at 2.97; relative to its midpoint
the band is at most +-11% of the body base term (`band_sum_output.txt`). The
blunt fin trailing edges are a separate base, 41% of the body base area (20%
if their thickness tapers spanwise; an interpretation of the report's text,
section 5), whose two-dimensional base pressure is not yet transcribed (B1).

## 4. Fins

### 4.1 The section: linear, second order, exact, real edges

| Comparison                                                    | Result                                                                                                                                                                                                               | Source                                                                |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Exact shock-expansion against Ackeret, symmetric double wedge | t/c 0.03: +1.7% at M 1.2, +0.5% at M 1.3, within 0.2% at M 1.5 to 3. t/c 0.05: +6.1% at M 1.2, +1.6% at M 1.3, within 0.4% at M 1.5 to 3. t/c 0.08: shock detached at M 1.2, +4.8% at M 1.3, within 1% at M 1.5 to 3 | `section2d.py`; audit's independent code (1.0052 and 1.0155 at M 1.3) |
| Busemann (second order)                                       | Equals Ackeret for a symmetric double wedge (the second-order terms of front and rear faces cancel in the drag); differs for wedge-flat-blunt and asymmetric sections                                                | derivation in `data/fin_computations.md`                              |
| Square leading edge, upper bound (pitot pressure on the face) | 4.6 to 7.7 times the sharp double-wedge wave drag at M 1.2, 14 to 24 at M 2, 25 to 41 at M 3 (t/c 0.05 and 0.03)                                                                                                     | `blunt_le.py`                                                         |
| Blunt fin leading edge, measured                              | RM A53D02: total CD up about 0.02 below M 5, about 100% of fin wave drag; symmetric bevel almost no change                                                                                                           | RM A53D02 p. 15                                                       |
| OpenRocket 13.05 fin pressure drag                            | Leading edge as a cylinder in cross flow times cos^2 of the sweep, trailing edge as base drag; no supersonic thickness wave drag for sharp sections                                                                  | techdoc pp. 49 to 50                                                  |

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
infinite swept wing with subsonic edges (within 1e-5 of the 2D value), and the
tip-cone pressure of a constant-slope sheet (5e-12, `fin_tipcone.py`);
integrated drag converges to 0.2% (`fin_validate2_output.txt`). An
independent implementation by the supersonic area rule agrees within 0.5%
on the cases below (audit section 3.3). Fins on a plane wall (image
included), double wedge unless stated. Ratio of 3D to strip drag; beta
cot(LE sweep) in brackets (above 1: supersonic leading edge):

| Fin                                                      | M 1.2        | M 1.5        | M 2.0        | M 3.0        |
| -------------------------------------------------------- | ------------ | ------------ | ------------ | ------------ |
| ARCAS fin: taper 0.64, LE 30 deg                         | 1.024 (1.15) | 1.056 (1.94) | 1.031 (3.00) | 1.012 (4.90) |
| Trapezoid: span = root, taper 0.5, LE 26.6 deg           | 1.100 (1.33) | 1.051 (2.24) | 1.022 (3.46) | 1.009 (5.66) |
| Same, hexagonal section, 15% bevels                      | 1.156        | 1.059        | 1.023        | 1.008        |
| Clipped delta: span = root, taper 0.25, LE 36.9 deg      | 1.103 (0.88) | 1.103 (1.49) | 1.044 (2.31) | 1.017 (3.77) |
| Clipped delta: span = root/2, taper 0.5, LE 45 deg       | 0.933 (0.66) | 1.096 (1.12) | 1.082 (1.73) | 1.033 (2.83) |
| Swept trailing edge: LE 45 deg, TE 16.7 deg, taper 0.475 | 1.020 (0.66) | 1.195 (1.12) | 1.102 (1.73) | 1.036 (2.83) |
| RM A53D02 planform, LE 71.6 deg                          | 0.421 (0.22) | 0.625 (0.37) | 0.894 (0.58) | 1.042 (0.94) |
| Rectangle, span = chord                                  | 1.000        | 1.000        | 1.000        | 1.000        |

(M 2.5 and the cases' full definitions: `data/fin_computations.md`.) Strip
theory is within 6% when beta cot(LE) exceeds 2, errs by up to 20% when it
lies between 1 and 2 (Mach 1.2 to 2 on common planforms), and by -58% to +10%
with subsonic leading edges (a factor of 2.4 for the 71.6 deg fin at Mach
1.2). For the unit-span rectangle the tip effects cancel in the total to 4
digits (not section by section); at span/chord 0.2 the ratio falls to 0.65 at
Mach 1.2. The plane wall is a coarse stand-in for a body: on ARCAS the body
radius is 1.125 in against a fin span of 2.103 in. A linear-theory 3D factor
per planform removes the strip error to the accuracy of linear theory itself,
which no opened source measures for fins **[gap]**.

### 4.3 Fin-body and fin-base interference: what the ARCAS increment contains

ARCAS models (TN D-4014), fins on (0 deg cant) minus fins off at alpha 0,
against the fins' own drag (linear 3D wave drag plus fully turbulent VDII
friction on both faces) and against the measured change of the
balance-chamber axial force (fig. 4; `arcas_fin_check_v2.py`, readings in
`data/d4014/`). All on the body cross-section. Reading errors: increment
+-0.003, chamber change +-0.004 to +-0.007. Fig. 4 was read twice (this
draft and the round-2 audit); the chamber changes agree within the combined
error (configuration 1: +0.028 / +0.030, +0.021 / +0.019, +0.002 / +0.005,
+0.0065 / +0.001 at M 1.5, 1.8, 2.3, 2.96; configuration 2: +0.009 / +0.010,
+0.0055 / +0.004, +0.0005 / +0.003). The table uses the first, which widens
the fin band at M 2.96 (`data/d4014/tn-d-4014_fig4_chamber.csv`).

| Config       | M    | Fins' own drag | Measured increment | Own / measured | Shortfall | Chamber change | (Own + chamber) / measured | Chamber / shortfall |
| ------------ | ---- | -------------- | ------------------ | -------------- | --------- | -------------- | -------------------------- | ------------------- |
| 1 (L/d 18.2) | 1.50 | 0.093          | 0.188              | 0.49           | 0.096     | +0.028         | 0.64 to 0.70               | 0.29 to 0.40        |
| 1            | 1.80 | 0.079          | 0.137              | 0.58           | 0.058     | +0.021         | 0.73 to 0.79               | 0.36 to 0.50        |
| 1            | 2.30 | 0.066          | 0.090              | 0.73           | 0.024     | +0.002         | 0.75 to 0.76               | 0.08 to 0.11        |
| 1            | 2.96 | 0.056          | 0.066              | 0.85           | 0.010     | +0.0065        | 0.95 to 0.99               | 0.65 to 0.91        |
| 2 (L/d 23.8) | 1.80 | 0.079          | 0.140              | 0.56           | 0.061     | +0.009         | 0.63 to 0.65               | 0.15 to 0.20        |
| 2            | 2.30 | 0.066          | 0.087              | 0.76           | 0.021     | +0.0055        | 0.82 to 0.85               | 0.26 to 0.36        |
| 2            | 2.96 | 0.056          | 0.067              | 0.83           | 0.011     | +0.0005        | 0.84                       | 0.04 to 0.06        |

The ranges in the last two columns span the chamber change applied to the
chamber area only (factor 1) and to the whole 1.470 in base (factor
(1.470/1.250)^2 = 1.38, if the 1.250 in rear-view diameter is the chamber;
the drawing does not label it).

What this shows:

- The base change is real but partial: about a third of the shortfall at
  Mach 1.5 on the short model, a third to a half at 1.8, a sixth to a fifth
  at 1.8 on the long model, little at 2.3. At Mach 2.96 the shortfall itself
  (0.010 to 0.011) is within about three reading errors of zero.
- The base change is model-specific, not Spahr and Dickey's trailing-edge
  mechanism: TN D-4014 attributes the low fins-off chamber force at M 1.50
  and 1.80 on configuration 1 to the reflexed lip, whose effect the fins'
  thicker boundary layer masks, and says it does not occur on configuration
  2 (p. 6). The two models have the same shortfall at Mach 1.8 (0.058 and
  0.061) with different chamber changes (0.021 and 0.009).
- Unexplained after the chamber change: 0.057 to 0.068 at Mach 1.5 and 0.029
  to 0.037 at Mach 1.8 (configuration 1), 0.049 to 0.052 at Mach 1.8
  (configuration 2), that is 21% to 37% of the increment.

Candidates for the rest, none quantified by an opened source:

- **The trip strip on each fin**, No. 60 carborundum, 1/16 in wide, 1/2 in
  aft of each fin leading edge (TN D-4014 p. 4). Grain size is not given in
  the report. A strip of grains of height k along the span of both faces of
  four fins adds 4.23 C k to CA (k in inches, C the grains' drag coefficient
  on free-stream q; 4.23 per inch = 4 x 2 x 2.103 in / 3.976 in^2,
  computed). C k of 0.007 to 0.016 in would explain 0.029 to 0.068. The
  round-2 audit puts No. 60 grit at about 0.25 mm (0.010 in) **[not
  verified against a grit standard]**; with C about 1 that is 0.042
  (computed), about the whole unexplained part.
- **The fin leading-edge radius**, not given in fig. 1 (audit). A blunt edge
  doubled fin wave drag on RM A53D02 (p. 15); the ARCAS fins' own wave drag
  is 0.044 at Mach 1.5 and 0.032 at 1.8 (`arcas_fin_check_output.txt`),
  the size of the unexplained part, and it falls with Mach number as the
  shortfall does.
- **Anchors, root gaps and the fins-off hardware**: TN D-4014 does not say
  how the slots were treated with fins off; TN D-4013, on the same models,
  left the anchors on the short model and faired the slots with balsa on the
  long one (p. 3), so the anchors may be in configuration 2's increment and
  not in configuration 1's. The fin root cut-out near the trailing edge
  (fig. 1, audit L8) is also in the increment.
- Fin-body interference on the fins' own pressures: no opened source
  quantifies it at zero lift **[gap]**; RM A53D02 neglected it (p. 8).

Consequences. Fins must be validated against measured increments or against
totals, never as isolated panels. ARCAS cannot separate fin drag from its
hardware and trip, so it can only bound the fin model, not validate it. The
fin band is therefore derived from these increments as an estimate
(section 6.2, B4). It applies to the **fins' own drag alone** (wave drag and
friction): the ARCAS chamber change is removed from the increment before the
band is formed, because the base effect of fins at the base is B3's
fins-on-base increment (section 3.4), so it is counted once. That band is
**measured over modelled 1.01 to 1.59** (computed, `arcas_fin_check_v2_output.txt`;
with the second reading of the M 2.96 chamber change the low end would be
1.12, and the band-widening rule keeps 1.01). Without removing the chamber
change it would be 1.18 to 2.03, which is not used, since that would count
the base effect twice when B3's increment is applied. The band is one-sided:
the model was never above the data. It is also conservative for an untripped
rocket, since the trip grit alone may be about 0.04 (above).

## 5. Validation data for the total

Matching means: finned, cylindrical afterbody, Mach 1 to 3, zero incidence,
power off; free flight preferred. Details and transcriptions:
`data/basic_finner_ada636861.md`, `data/validation_candidates.md`.

| Data set                                                                                                                             | Geometry                                                                                                                                                                                                                                                                                                                                                                                                     | Re, transition                                                               | Stated uncertainty                                                                                                                                                                       | Data, location                                                                                                                                                                                                                                                                      | Matches?                                                                                                 | Status                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Basic Finner, DREV range, free flight (DTIC ADA636861)                                                                               | 20 deg cone, cylinder, L/d 10.0, four rectangular fins 1 x 1 cal at the base, single wedge, sharp LE (radius 0.004 cal), blunt TE 0.08 cal (fig. 2, p. 3); the TE adds 41% to the base area if 0.08 cal thick across the span, 20% if it tapers spanwise (interpretation of "conical in shape", p. 3). Fin cant 0, 2 and 4 deg, so most models spin; the report finds no cant effect on CX0 (fig. 10, p. 12) | 0.70e7 to 2.0e7 on length at M 1.06 to 2.97 (Table V); transition not stated | CX0 probable error under 0.5% per shot (Table VIII); shots at nearly the same Mach number differ by -3.3% to +3.4% about their mean at M 1.8 and 2.4, -7.6% to +4.5% at M 2.7 (computed) | CX0 per shot, Tables VII and VIII, 16 shots with yaw under 5 deg^2: five at M 1.06 to 1.33, none from 1.38 to 1.80, eleven at M 1.80 to 2.97 in four clusters (1.80 to 1.85, 2.35 to 2.41, 2.66 to 2.75, 2.97)                                                                      | Yes, except that the fins end at the base                                                                | Transcribed from the page images; second reading (round-2 audit) agrees exactly on all 19 Table VIII rows and 8 Table IX groups; the hold-out set |
| RM L55G28a model 1, rocket free flight                                                                                               | 10 deg cone, cylinder, L/d 21.4, four fins at the base, root 18 in, tip 10 in, blunt LE (0.03 in radius) and blunt TE (fig. 1)                                                                                                                                                                                                                                                                               | 1.8e8 on length at M 2.75 (table I); hot wall                                | CD +-7% (p. 9)                                                                                                                                                                           | CD fig. 5 (telemeter circles), two readings within 0.005: 0.387 / 0.390 at M 2.46 to 2.50, 0.371 / 0.376 at 2.65, 0.368 / 0.368 at 2.75, 0.361 / 0.363 at 2.92 (first / round-2 audit); radar squares about 0.01 to 0.015 lower; the report's component estimate at M 2.75, table I | Partly: blunt fin leading edges (12% of its estimate), M 2.5 to 3 only                                   | Geometry and table I transcribed; reported, not a gate                                                                                            |
| ARCAS, TN D-4014, tunnel, M 1.5 to 4.63                                                                                              | Ogive (ordinates), L/d 18.20 and 23.77, d = 2.250 in, boat-tail with reflexed lip, four trapezoidal double-wedge fins t/c 0.044 ending 0.27 in ahead of the base, anchors (fig. 1)                                                                                                                                                                                                                           | 9.84e6 per m, tripped (No. 60 grit)                                          | CA +-0.004; M +-0.015                                                                                                                                                                    | CA vs alpha, figs. 5, 6 (axial force includes base); chamber force fig. 4                                                                                                                                                                                                           | No: boat-tail with lip, sting not described (TN D-4014 says only "sting support"), trip grit on the fins | 14 CA values re-read (three readings, resolved); fig. 4 read twice; used to estimate the fin band, so not a gate                                  |
| ARCAS, TN D-4013, tunnel, M 0.6 to 1.2                                                                                               | Same models; sting 2.54 cm, d/h 0.68                                                                                                                                                                                                                                                                                                                                                                         | 9.8e6 per m, tripped (No. 120)                                               | CA +-0.004; Cp,b +-0.01                                                                                                                                                                  | CA,corr and CA,b vs M, faired, figs. 11, 12                                                                                                                                                                                                                                         | No (as above; below M 1.5)                                                                               | 16 values at M 1.00 and 1.20, two readings agreeing                                                                                               |
| RM A53D02, free flight, M 0.6 to 10                                                                                                  | Tangent ogive 4 cal, cylinder, L/d 10, d = 0.25 in, four trapezoidal fins, 71.6 deg LE, wedge-flat-blunt section t/c 0.04, base hole                                                                                                                                                                                                                                                                         | R 1.5e6 to 4.9e6 at M 1 to 3.3, natural (R_T about 1.6e6)                    | Scatter < +-2% at M 2; systematic < 1%; alpha correction up to 2.5%                                                                                                                      | CD fig. 11; table I                                                                                                                                                                                                                                                                 | No: subsonic fin leading edges below M 3.16; friction mostly laminar, so it tests the transition input   | 13 values at M 1.04 to 3.3, two readings agreeing; reported                                                                                       |
| RM-10 in free flight (TN 3320; TR 1160)                                                                                              | Parabolic body fineness 12.2 cut at 81.25% (boat-tailed), four 60 deg swept fins at the base, nozzle in the base                                                                                                                                                                                                                                                                                             | 14e6 to 210e6 on length                                                      | CD mean curve +-0.005 supersonic; base drag +-0.003 at M 2.5 (pp. 5 to 6)                                                                                                                | CD figs. 7, 8, 10; base pressure fig. 9 (first reading)                                                                                                                                                                                                                             | No: no cylindrical afterbody                                                                             | Text and accuracy read; reported                                                                                                                  |
| TR R-100 (Stoney), cylindrical-afterbody configurations 1 to 8, 22, 78, 92, 98, 113 to 117                                           | Fins at the base                                                                                                                                                                                                                                                                                                                                                                                             | Helium-gun tests (p. 2)                                                      | CD +-0.01, M +-0.01 (pp. 2 to 3)                                                                                                                                                         | Per-configuration sheets                                                                                                                                                                                                                                                            | No: data end at M 1.3 to 1.4                                                                             | Surveyed on the page images                                                                                                                       |
| Component sets: TN 3097, RM L54G14 (friction); TN 3819 fig. 18, Herrin and Dutton (base); TN 3819 fig. 35 and TN 2360 (fins on base) |                                                                                                                                                                                                                                                                                                                                                                                                              |                                                                              |                                                                                                                                                                                          |                                                                                                                                                                                                                                                                                     | Components only                                                                                          | Used to set the bands (sections 2 to 4), so not gates                                                                                             |

No total-drag case with fins clear of the base was found. The fins-forward
measurements opened (TN 2360, TN 3819 figs. 28 to 32) are base or body
pressures only.

## 6. Plan for Phase B

### 6.1 Rules carried over from 0002 section 12, and two added

Solved quantities come from nested grids with measured bands (0005). The
fin method of B4 (2D Euler sections with a linear 3D factor) is the "not yet
available in 3D" case of 0002 section 12 and is labelled as such. Every
correlation is labelled on the page and in the export, with its band. Where
no measured band exists the component is refused with a message, not
estimated. RANS (M5 to M8) and the 3D sector (M10, M11) replace the
correlations where, and only where, their own validation shows a smaller
measured error.

Added by this record:

- **Hold-out rule.** A data set used to set or shape a band never gates it.
  A component band set on all the data available is labelled "band
  estimated on (sets)", and that component is tested only through a total
  that took no part in any band. Nothing is tuned on a gate. **A failed gate
  refuses the configuration**; it does not widen a band. If a band is later
  set or widened using a gate's data (for the first release, the Basic
  Finner), it is labelled "estimated on the Basic Finner, not validated", and
  the configuration has no hold-out until a new independent set is found.
- **Reading rule** (start of this record), for every figure behind a band or
  a gate.

### 6.2 Steps, in order

| Step        | Deliver                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Band estimated on                                                                                                                                                                                                                                                                  | Gate (independent data)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B1 Data     | Per-point transcriptions into `src/validation` with digitisation records: TN 3819 fig. 18 (the single-reading curve values of section 3.1 read again), TN 3819 fig. 35 (second reading), TN 2360 tables, TN D-4014 figs. 4 to 6 (read twice here), Basic Finner Tables V, VII, VIII and fig. 2 (read twice), RM L55G28a fig. 5 (read twice), TN D-2896 flat-plate data, RM L52H21 friction and base, Love's two-dimensional base pressures (TN 3819) for blunt fin trailing edges |                                                                                                                                                                                                                                                                                    | Each figure read twice independently; where the readings differ by more than their combined error, both are kept and the band-widening one used                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| B2 Friction | 0007's momentum integral driven by the solved surface pressure (nose and body), fins as plates of local chord; transition input (default fully turbulent, laminar run to a user Re_T); roughness input shown as a band only                                                                                                                                                                                                                                                       | 0007: TN 3097 table III and RM L54G14 fig. 10, measured over model 0.88 to 1.19                                                                                                                                                                                                    | TN D-2896 flat plates (M 2.5 to 4.5) and RM L52H21 (RM-10, M 1.62 to 2.41), once transcribed: every point inside the band. Verification: within 1e-6 of the TMR file                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| B3 Base     | Compiled-curve correlation fed by the solved Mach number and pressure ahead of the base and by B2's boundary layer, labelled "correlation"; fins ending within one chord of the base: the fins-on-base factor F of section 3.4 on the body base, labelled "measured on circular-arc fins; analogy for other sections"; blunt fin trailing edges: two-dimensional base pressure (Love), labelled; boat-tails refused                                                               | TN 3819 fig. 18 tunnel points and Herrin and Dutton: measured over curve 0.82 to 1.08 at M 1.5 to 3 (the fig. 18 free-flight curve, M 1.06 to 1.21, informs the bias only); fins on base: TN 3819 fig. 35 and TN 2360, F band of section 3.4 (at most +-11% of the body base term) | None left at the component level (all base data opened are used above): tested in B5 only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| B4 Fins     | Section drag from the planar Euler engine on nested grids (sharp sections first), times the linear 3D factor per planform (port of `finwave.py` with its five checks as tests); fin friction from B2; blunt leading edges refused until planar fitting exists. The band applies to the fins' own drag alone; the base effect of fins at the base is B3's                                                                                                                          | ARCAS increments with the measured chamber change removed (7 points): measured over model 1.01 to 1.59 (one-sided)                                                                                                                                                                 | None at the component level: tested in B5 only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| B5 Total    | Sum of nose wave drag (solved), body friction, base (with B3's fins-on-base factor where fins end at the base), fins; Cd with the model-form band (6.3) and, separately, the input bands (transition, roughness)                                                                                                                                                                                                                                                                  |                                                                                                                                                                                                                                                                                    | **Basic Finner, the 11 shots at M 1.80 to 2.97** (used for no band): every shot inside its tolerance, which is the model-form band (with the fins-on-base band) plus the input band for its unknown transition plus the shot-to-shot spread of its Mach cluster. Expected tolerance, at least -24% to +14% of CX0 before the fins' own-drag and fin trailing-edge terms are added (6.3). The report gives each shot's residual (measured over modelled) and their mean and spread per cluster, not only pass or fail; a failed shot refuses the configuration (6.1). The five shots at M 1.06 to 1.33 are reported, not gated. Reported with their confounders, not gates: RM L55G28a, ARCAS (TN D-4014, D-4013), RM A53D02 (with its observed transition as input), RM-10 (TN 3320) |

### 6.3 Combining the bands, and the width of the gate

Component model-form bands are added linearly, not in quadrature: the same
experiments constrain several components (on ARCAS the base and fin terms
come from one measurement), and independence has not been shown. The sum is
a **minimum**: each component band is the range seen on a few data sets,
not a coverage interval, so the true error can exceed it. Discretisation
bands of solved parts (0005) are added. Transition and roughness are shown
as separate bands. B4's band covers the fins' own drag only, and the base
effect of fins at the base enters once, through B3's fins-on-base factor.

As an illustration only (arithmetic on the 0002 scoping shares, friction
50%, base 30%, fins 15%, nose 5%, not a measurement; `band_sum.py`): with the
bands of sections 2 to 4 (friction 0.88 to 1.19, base 0.82 to 1.08, fins'
own drag 1.01 to 1.59, nose +-1e-3) the total is measured over modelled
**at least -11% to +21%**; for fins ending at the base, adding the
fins-on-base band (+-11% of the base term) gives **at least -14% to +24%**.

For the gate itself the shares can be sized on the Basic Finner without a
full model (`bf_gate_width.py`, `bf_gate_sum.py`; computed, CX0 used only as
the scale): flat-plate VDII friction is 19% to 22% of CX0 and the body base
term (compiled curve times the mid F) 29% to 37%; the transition input
(laminar run to Re_T 5e5 to 3e6 against the fully turbulent default) is
-0.9% to -6.4% of CX0; the fins-on-base band +-2.1% to +-4.0%. With the
shot-to-shot spread of each cluster, the expected tolerance is at least -23%
to +13% at M 1.80 to 1.85, -20% to +13% at 2.35 to 2.41, -24% to +14% at
2.66 to 2.75 and -17% to +10% at 2.97, before adding, on the high side, 0.59
times the fins' own-drag share and the fin trailing-edge base band (not yet
computed). A pass at a width of about 25% says little by itself, which is
why B5 reports per-shot residuals and their spread: a systematic offset
inside the tolerance is still a finding.

### 6.4 What the first release could and could not claim

Could claim, only if every gated shot passes:

- Total zero-incidence, power-off Cd at **Mach 1.8 to 3.0** for one class of
  configuration: a sharp-nosed cylindrical-afterbody body with four sharp,
  thin fins ending at the base, as the Basic Finner (L/d 10, rectangular
  fins of one calibre chord and span, single-wedge section with a blunt
  trailing edge, Reynolds number 1.2e7 to 2.0e7 on length, free flight),
  with the model-form band, the transition band shown separately, and the
  per-shot residuals published. The fins-on-base term is labelled "measured
  on circular-arc fins, applied by analogy" (section 3.4). Outside that class
  the band is an estimate and is labelled "not validated".
- A breakdown into nose wave drag (solved, band of order 1e-4), friction
  (0007's band, validated on component data), base and fins (bands estimated
  on component data, each labelled "estimated, tested only in the total").
- Agreement with the Basic Finner free-flight drag within that tolerance, a
  set that took no part in setting any band.

If any gated shot fails, the configuration is refused; no band is widened to
pass it (6.1).

Could not claim:

- Mach 1.5 to 1.8: the Basic Finner has no shot there (none between 1.38 and
  1.80); Mach 1 to 1.5 reported only.
- Fins clear of the base: no total-drag case found; the base and fin bands
  are unchecked for it.
- Fins at the base of other sections, thickness ratios or planforms than the
  Basic Finner's as validated: the fins-on-base factor is measured on
  circular-arc fins only and its transfer is untested elsewhere.
- Any other nose shape, fineness ratio or Reynolds number than the Basic
  Finner class as validated; the component bands may be shown there as
  estimates only.
- Agreement with ARCAS, RM A53D02, RM L55G28a or RM-10 as validation: they
  are reported with their confounders (sting, boat-tail and lip, trip grit,
  subsonic fin edges and laminar flow, blunt fin edges, boat-tailed body).
- Free-flight base drag in general: the sign of the compiled curve's bias is
  not established (section 3.3); the one candidate sting-free point is
  unverified.
- Better accuracy than RASAero II or OpenRocket: not shown until both are run
  on the Basic Finner (the 0002 spike).
- Boat-tails, highly swept fins with subsonic leading edges, blunt or rounded
  fin leading edges, predicted natural transition, roughness effects,
  power-on base flow, sting-mounted models.

## 7. Open questions

- Hopkins and Inouye (1971) and Herrin and Dutton (1994) originals, both
  copyrighted AIAA papers, not opened; the Herrin and Dutton support
  arrangement decides whether the base band's low end is a sting-free fact.
- The ARCAS unexplained increment: grain size of the trip, fin leading-edge
  radius and fins-off slot treatment (TN D-4014 silent on all three).
- A total-drag case with fins clear of the base, Mach 1.5 to 3, ideally in
  free flight. Not found in NTRS searches for PARD rocket-model reports; Love
  RM L53C02 (cited by RM L55G28a for fin base drag) and the Basic Finner's
  earlier range reports (its refs. 3 to 5) were not opened.
- Basic Finner transition state: not stated; bound it with the transition
  input.
- The fins-on-base factor for wedge fins with blunt trailing edges (the
  Basic Finner's): no data opened; section 3.4 carries the circular-arc
  factor over by analogy. Love's other fin figures (TN 3819 figs. 28 to 34)
  and his two-dimensional base pressures, needed for the fin trailing-edge
  base term, are not transcribed; fig. 35 has one reading.
- The audit's grain size for No. 60 grit (about 0.25 mm) against a grit
  standard.
- Boat-tail and boundary-layer-thickness effects on base pressure (Love
  figs. 19, 25; DATCOM).
- Linear-theory accuracy for 3D fin wave drag against data or 3D Euler (M10).
- RANS (SA) base-pressure error on Herrin and Dutton: not found in the
  opened sources; the M8 gate decides RANS or correlation for the base.

## 8. Sources consulted for this draft

| Source                                                                                                                                 | Status                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [0007](0007-skin-friction.md) (repository, commit a2cab11)                                                                             | Read; friction band and methods used                                                                                              |
| NASA TN D-4014 (NTRS 19670020031)                                                                                                      | Opened; figs. 1, 4, 5, 6 read and digitised; text pp. 3 to 6                                                                      |
| NASA TN D-4013 (NTRS 19670020050)                                                                                                      | Opened; text and figs. 11, 12                                                                                                     |
| Dupuis and Hathaway, DREV TM 9703 (1997), DTIC ADA636861, Basic Finner                                                                 | Opened from the Internet Archive mirror (DTIC blocked); text, fig. 2, Tables I, III, IV, V, VII, VIII, IX read on the page images |
| NACA RM L55G28a, Rumsey 1955 (NTRS 19930088905)                                                                                        | Opened; text, fig. 1, table I, fig. 5                                                                                             |
| NACA TN 3320, Jackson, Rumsey and Chauvin 1954 (NTRS 19930084086)                                                                      | Opened; text, fig. 9                                                                                                              |
| NACA TN 3372, Peck 1955 (NTRS 19930084618)                                                                                             | Opened; text pp. 1 to 4                                                                                                           |
| NACA RM L50I18, Purser et al.; NTRS 19930086750 (parabolic bodies, M 0.8 to 1.4)                                                       | Abstract or download only; not used                                                                                               |
| NACA RM A53D02 (NTRS 19930087740)                                                                                                      | Opened; text, table I, figs. 1, 11                                                                                                |
| NACA RM L54G14, Loposer and Rumsey 1954 (NTRS 20030068110)                                                                             | Opened (scanned pages read as images)                                                                                             |
| NACA TN 3097, Chapman and Kester 1954 (NTRS 19930083801)                                                                               | Opened; text and table III                                                                                                        |
| NACA TR 1160, Evans 1954 (NTRS 19930092188)                                                                                            | Opened; text and fig. 13                                                                                                          |
| NACA RM L52H21, Love, Coletti and Bromm 1952 (NTRS 19930087258)                                                                        | Summary read only                                                                                                                 |
| NACA TN 3708, Bromm and Goodwin 1956 (NTRS 19930084477)                                                                                | Summary read only                                                                                                                 |
| NASA TN D-6945, Hopkins 1972 (NTRS 19730001588)                                                                                        | Opened                                                                                                                            |
| Hopkins and Inouye, AIAA J. 9 (1971) (NTRS record 19710049171)                                                                         | Not opened: no PDF; abstract only                                                                                                 |
| NASA TN D-2896, Monta and Allen 1965 (NTRS 19650018215)                                                                                | Opened                                                                                                                            |
| NASA TN D-3588, Peterson and Monta 1966 (NTRS 19660027862)                                                                             | Opened; compares Sommer-Short and Spalding-Chi, not VDII; not used                                                                |
| NASA TN D-7507, Cary and Bertram 1974 (NTRS 19740020652)                                                                               | Abstract read; covers M 4 to 13, outside the range; not used                                                                      |
| NACA TN 3819, Love 1957 (NTRS 19930084517)                                                                                             | Opened; text (pp. 14 to 24), fig. 18 (read twice, section 3.1), fig. 35 (one reading), figs. 32 to 34 viewed                      |
| NACA TR 1051, Chapman 1951 (NTRS 19930090963)                                                                                          | Opened; appendix B, figs. 22, 23                                                                                                  |
| NACA TN 2360, Spahr and Dickey 1951 (NTRS 19930083086)                                                                                 | Opened                                                                                                                            |
| P. K. Tucker, MSFC 1993 (NTRS 19950017232)                                                                                             | Opened (slides)                                                                                                                   |
| Herrin and Dutton, AIAA J. 32(1) 1994                                                                                                  | Not opened                                                                                                                        |
| NACA TN 1448, Margolis 1947 (NTRS 19930082080); NACA TN 3418 (NTRS 19930084221)                                                        | Abstracts and summary read; TN 1448 scan unreadable by OCR; not used                                                              |
| NASA TR R-100, Stoney 1961 (NTRS 19630004995)                                                                                          | Opened; summary, accuracy, tables I and II, configuration sheets 1 to 8, 13, 22, 78, 92, 98, 113 to 117 viewed                    |
| TMR high-Mach flat plate pages and data files (tmbwg.github.io)                                                                        | Opened; files downloaded                                                                                                          |
| OpenRocket technical documentation (openrocket.sourceforge.net/techdoc.pdf)                                                            | Opened; it describes version 13.05, not 24.12 as `sources.md` implies                                                             |
| RASAero II Users Manual v1.0.2.0                                                                                                       | Opened                                                                                                                            |
| Audits of the drafts: [round 1](../research/total-drag/audit/audit.md), [round 2](../research/total-drag/audit/round2/audit_round2.md) | Read; their readings used as the second readings where stated                                                                     |

## Changes from the first draft

- Retitled 0008; friction band taken from 0007 (0.88 to 1.19) in place of
  "+-11%".
- TN 3819 fig. 18 curves re-read (the first reading had picked up symbol
  outlines and Gabeaud's line); base scatter, OpenRocket (3.8% to 16.4%) and
  Herrin and Dutton (13% to 21%) restated; "ten sources" corrected to about
  seven; Mach error +-0.02 stated.
- TN D-4014 readings resolved per point (page 37 calibration, triangle
  convention, one reading rule); configuration 2 increments now 0.140, 0.087,
  0.067; fig. 4 digitised; section 4.3 and finding 2 rewritten: the base
  explains part of the fin shortfall, not most of it.
- TR 1051 fig. 23(b) at M 1.5 corrected (change 0.064, not 0.04 to 0.05).
- Base band restated as asymmetric (0.82 to 1.08) with an unestablished bias;
  Herrin and Dutton's sting-free status marked unverified.
- Band combination stated as a minimum, with the fin band derived from the
  ARCAS increments; gates restricted to data used for no band.
- Validation set searched again: Basic Finner transcribed (the hold-out),
  RM L55G28a, TN 3320, TN 3372 and the R-100 cylindrical-afterbody sheets
  opened; claims of 6.4 rewritten to match.
- Small items: OpenRocket body friction with its wetted-area factor; RM
  L54G14 station 20 and rake; tip-cone and subsonic-edge checks saved as
  scripts with outputs; RM A53D02 Mach offset confirmed; rounding in 4.1;
  ARCAS fig. 1 items and fig. 6(c) caption noted in the transcription.

Changes after the second audit round:

- The Basic Finner claim and its B5 gate cover Mach 1.8 to 3.0, the range of
  its shots (11 gated shots in four clusters; none between 1.38 and 1.80).
- The fins-on-base increment the claim depends on is derived, with its band,
  from TN 3819 fig. 35 (free flight and tunnel, Mach 1.5 to 3.0; first
  reading) and TN 2360's thickness finding (section 3.4), and labelled an
  analogy for the Basic Finner's wedge fins. B4's band now covers the fins'
  own drag alone (1.01 to 1.59), so the chamber term is counted once, and the
  fins-on-base band is in the band sum (at least -14% to +24%).
- A failed gate refuses the configuration; a band set or widened with Basic
  Finner data is labelled "estimated on the Basic Finner, not validated".
- Section 3.1 says which fig. 18 curve values were read twice (13 of 20).
- The expected gate tolerance is stated per Mach cluster (at least -24% to
  +14% of CX0 before the fin terms), and B5 reports per-shot residuals.
- Links and file references point to docs/design and
  ../research/total-drag/.
- Small items: fin cant and its reported lack of effect; the +41% fin base
  area marked as an interpretation (20% if the edge tapers); both readings
  recorded of TN D-4014 fig. 4 and RM L55G28a fig. 5; the trip-grit caveat on
  the fin band.
