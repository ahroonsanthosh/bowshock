# 0009: Fin wave drag

- **Status:** Draft. A library with tests (`src/fins/`); on the drag page
  only as part of the total drag ([0011](0011-total-drag-on-the-page.md)).
  (0008 is reserved for the total-drag record.)
- **Date:** 2026-10-19 (section 8 added 2026-10-26)
- **Inputs:** section 4 and step B4 of the total-drag research draft, its fin
  computations and scripts (`docs/research/total-drag/`: `draft.md`,
  `data/fin_computations.md`, `scripts/finwave.py`, `section2d.py`,
  `fin_cases.py` and the scripts around them) and the independent audit of
  it (`audit/audit.md`, `audit/scripts/hayes_fin.py`, `dw_exact_indep.py`);
  [0002](0002-architecture.md) sections 1 to 3 and 12. The draft is under
  revision, so its claims were treated as claims to check.

Every number below is produced by a test named with it, or by a measurement
whose runner and output are in `docs/research/fin-wave-drag/`. Every
research script used here was re-run first: `section2d.py`,
`fin_validate.py`, `fin_cases.py` (its JSON byte for byte),
`arcas_fin_check.py` and `blunt_le.py` reproduce their archived outputs; the
output the audit found unsaved (its L4: tests 3 and 4, `fin_validate2.py`)
is saved there with `fin_rect.py`'s, and the tip-cone check it found without
a script is a test now. Differences are relative unless stated.

## 1. What is implemented

- `section.ts`: sharp sections at zero incidence, as two polylines from the
  leading edge (0, 0) to the trailing edge (1, 0), or symmetric ones by
  their half-thickness at chordwise breakpoints; the double wedge (any ridge
  position) and the wedge-flat-wedge (hexagonal) section with any bevels.
  Added for [0010](0010-base-drag-and-total.md) (its section 2): a section
  may declare a blunt trailing edge (the single wedge), whose faces' wave
  drag alone is computed by both methods.
- `section-drag.ts`: the exact inviscid 2D wave drag of a sharp convex
  section by shock-expansion theory (oblique shock or Prandtl-Meyer
  expansion at the leading edge, Prandtl-Meyer at each corner), built on
  the relations of `src/validation/gas-dynamics.ts`; Ackeret's linear and
  Busemann's second-order theories. What it refuses: section 2.1.
- `planform.ts`: one exposed fin panel, trapezoidal with any trailing-edge
  sweep (forward or aft) or a clipped delta by its taper ratio; leading
  edges swept forward are refused.
- `linear-wave-drag.ts`: linear supersonic thickness drag of the panel by
  the source-sheet method of the research's `finwave.py`, ported with its
  formulation and quadrature. **The body is a plane wall, represented by
  the fin's image in it** (the fin occupies 0 <= y <= s, its mirror image
  -s <= y < 0), as in `finwave.py`. Two changes, both measured in section
  3: the chordwise and spanwise integrals are split where the Mach cones of
  the planform's vertices cross them, and each result carries an estimate
  of its quadrature error.
- `fin-wave-drag.ts`: the ratio of linear 3D to strip-theory drag, with
  the limits of strip theory measured in section 4 stated in its docstring,
  and the plan's product: the exact section drag times that ratio.
- `quadrature.ts` (Gauss-Legendre, and the sin^2 substitution of
  `finwave.py`), `refusal.ts` (the refusal error, with a reason).
- `tests/fins/support/area-rule.ts`: an independent computation of the
  same linear drag by the supersonic area rule (Hayes; Lomax and Heaslet),
  as in the audit's `hayes_fin.py` but with each oblique cut's von Karman
  drag integrated exactly, used only by the tests.

## 2. The section in two dimensions

### 2.1 When shock-expansion theory is exact

On a convex polygon the theory gives the pressure on each straight face
exactly until a wave reflected from the leading-edge shock reaches the
surface (and the drag exactly until one reaches a face with slope,
section 8). Such waves arise where a corner's expansion fan overtakes the
shock. The research and the audit call the theory exact without this
condition; it matters for hexagonal sections with short bevels. The library
bounds where the first reflected wave can land: the head of the first
corner's fan meets the straight shock at P; a reflected wave descends along
a characteristic at mu - theta below the stream; across the fans nu + theta
is constant, so mu - theta depends on the Mach number alone and is
unimodal in it (minimum at M^2 = 4 / (3 - gamma)), so its largest value
over the surface's states is at a face state; the line from P at that
steepest angle is intersected with the surface. The bound neglects the
change the reflected waves themselves make to the states they cross.

`exactSectionDrag` refuses, with a message and a reason:

- a detached leading-edge shock;
- an attached shock with subsonic flow behind it;
- a compression corner after the leading edge (its shock would overtake the
  fans ahead of it near the surface; not modelled);
- expansion beyond the Prandtl-Meyer limit, and subsonic free streams;
- a reflected wave that can land ahead of the trailing edge (since
  2026-10-26, ahead of the end of the last face with slope: a wave that
  lands only on faces parallel to the chord changes no drag, section 8),
  unless the caller asks for the value with the reflections neglected,
  which is then labelled `exact: false`.

Exact drag over Ackeret's, or the refusal (det: detached; sub: subsonic
behind the shock; R x: a reflected wave can land at x/c = x, value with the
reflections neglected in brackets), measured with the library
(`runs/exactness.test.ts`):

| Section                 | t/c  | M 1.2  | M 1.3  | M 1.5           | M 2.0           | M 2.5           | M 3.0           | M 4.0           |
| ----------------------- | ---- | ------ | ------ | --------------- | --------------- | --------------- | --------------- | --------------- |
| Double wedge            | 0.03 | 1.0175 | 1.0052 | 1.0013          | 1.0004          | 1.0006          | 1.0011          | 1.0022          |
| Double wedge            | 0.05 | 1.0609 | 1.0155 | 1.0036          | 1.0011          | 1.0017          | 1.0029          | 1.0060          |
| Double wedge            | 0.08 | det    | 1.0480 | 1.0096          | 1.0028          | 1.0043          | 1.0071          | 1.0148          |
| Double wedge            | 0.12 | det    | det    | 1.0242          | 1.0063          | 1.0092          | 1.0152          | 1.0316          |
| Double wedge, ridge 0.3 | 0.05 | det    | 1.1436 | 1.0705          | 1.0626          | 1.0750          | 1.0906          | 1.1248          |
| Double wedge, ridge 0.3 | 0.12 | det    | det    | R 0.60 (1.2986) | 1.1556          | 1.1840          | 1.2253          | 1.3202          |
| Hexagon, 30% bevels     | 0.05 | det    | 1.0537 | 1.0105          | 1.0031          | 1.0046          | 1.0077          | 1.0159          |
| Hexagon, 15% bevels     | 0.02 | sub    | 1.0301 | 1.0065          | 1.0020          | 1.0030          | 1.0050          | 1.0104          |
| Hexagon, 15% bevels     | 0.05 | det    | det    | R 0.60 (1.0595) | 1.0122          | 1.0170          | 1.0278          | R 0.89 (1.0575) |
| Hexagon, 15% bevels     | 0.08 | det    | det    | det             | R 0.70 (1.0339) | R 0.73 (1.0401) | R 0.70 (1.0637) | R 0.62 (1.1299) |
| Hexagon, 5% bevels      | 0.02 | det    | det    | R 0.10 (1.1247) | R 0.31 (1.0178) | R 0.31 (1.0238) | R 0.29 (1.0385) | R 0.25 (1.0796) |

The double wedges of the research's table are all exact (the first
reflected wave can land no nearer than x/c = 1.32, at t/c 0.05 and Mach
1.2; t/c 0.08 at Mach 1.2 is detached, as the research found;
`runs/claims.test.ts`). Hexagons with short bevels are mostly refused: the
bevel angle, not t/c, sets the leading-edge shock. The size of the
neglected reflections was looked at on one case in section 2.4 (under about
half a percent there if the grid convergence is monotone; sign unresolved).

### 2.2 Verification

| Check                                                                                                              | Measured                                                                       | Test                   |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ---------------------- |
| Double wedges (3 cases) against the oblique-shock and Prandtl-Meyer relations of `gas-dynamics.ts`, by hand        | below 5e-16 in cd                                                              | `section-drag.test.ts` |
| Busemann's C2 against the shock and the expansion of `gas-dynamics.ts`, deflection 1e-3 and 2e-3, Mach 1.3, 2, 3.5 | 6.4e-4 to 3.4e-3 at 1e-3, doubling at 2e-3 (the third-order term)              | `section-drag.test.ts` |
| A collinear vertex added, the section mirrored, the surfaces one at a time                                         | below 5e-17 in cd                                                              | `section-drag.test.ts` |
| Thin limit, symmetric double wedge and equal-bevel hexagon, against Ackeret (Busemann identical)                   | order 1.991 to 2.002 (t/c 0.005 to 0.0025)                                     | `section-drag.test.ts` |
| Thin limit, ridge at 0.3 and bevels 0.3 and 0.15, against Ackeret                                                  | order 0.981 to 1.009; limit within 0.2% to 1.3% of Busemann's coefficient      | `section-drag.test.ts` |
| The same, against Busemann                                                                                         | order 1.978 to 2.014                                                           | `section-drag.test.ts` |
| The research's `section2d.py`, 17 double wedges (t/c 0.03, 0.05, 0.08; Mach 1.2 to 3), full precision              | 4.9e-14; its printed ratios to 3 decimals identical; its detached case refused | `section-drag.test.ts` |
| The audit's `dw_exact_indep.py` (weak root of the shock cubic, Newton on Prandtl-Meyer), same 17                   | 5.0e-14                                                                        | `runs/claims.test.ts`  |
| Refusals: detached, subsonic behind the shock, compression corner, Prandtl-Meyer limit, reflected wave             | each refused with its reason                                                   | `section-drag.test.ts` |

The research's statements of 4.1 hold (to rounding: 0.52% and 1.55% at
Mach 1.3 for t/c 0.03 and 0.05, as the audit noted). Its Busemann
statement is right but incomplete: the second-order term cancels for any
section whose faces are fore-and-aft symmetric (the sum of delta^3 dx is
zero), the equal-bevel hexagon included; it differs from Ackeret for
asymmetric sections, by +6% to +32% for the ridge at 0.3 in the table
above.

### 2.3 The thin limit

(exact / Ackeret - 1) / (t/c)^2 at t/c 0.0025 for the symmetric sections,
and (exact / Ackeret - 1) / (t/c) against Busemann's coefficient
C2 sum(delta^3 dx) / (C1 sum(delta^2 dx)) for the others
(`runs/section.test.ts`):

| Section                                 | M 1.5            | M 2.0            | M 3.0            |
| --------------------------------------- | ---------------- | ---------------- | ---------------- |
| Double wedge                            | 1.377            | 0.474            | 1.234            |
| Hexagon, 30% bevels                     | 3.827            | 1.315            | 3.418            |
| Ridge at 0.3: measured, Busemann        | 1.2254, 1.2181   | 1.2122, 1.2097   | 1.7153, 1.7088   |
| Bevels 0.3 and 0.15: measured, Busemann | -2.1036, -2.1317 | -2.1070, -2.1170 | -2.9646, -2.9905 |

### 2.4 A planar Euler check

The planar mode of the 2D engine (`src/engine-cpu/euler2d.ts`; HLLC, van
Albada, the shared scaled reconstruction, as verified on wedges and
expansions in [0003](0003-2d-solver.md)) solved half of each section above
its symmetry plane: x/c from -0.3 to 1.2 and 1.4 chords high, which holds
the surface's domain of dependence; supersonic inflow, outflow downstream
and on top, a slip wall along the section and the symmetry plane. Vertical
grid lines put every corner on a line, uniform within each segment (0.025
of the chord at level 0), with 28 rows; each level halves both spacings.
Every solve ran until the density residual was below 1e-11 of its start
and the drag changed by less than 1e-11 between checks; one solve at a
time (`runs/euler.test.ts`, summary by `compare.py`).

| Section                                                                 | 60 x 28 | 120 x 56 | 240 x 112 | 480 x 224 | Extrapolated from the last three: observed order, order 1, order 2 |
| ----------------------------------------------------------------------- | ------- | -------- | --------- | --------- | ------------------------------------------------------------------ |
| Double wedge, t/c 0.08, Mach 1.5 (exact; Ackeret -0.950%)               | -0.768% | -0.337%  | -0.156%   | not run   | -0.025% (1.25), +0.025%, -0.095%                                   |
| Hexagon, 15% bevels, t/c 0.08, Mach 2 (refused, R 0.70; Ackeret -3.28%) | -3.934% | -1.704%  | -0.983%   | -0.528%   | +0.245% (0.67), -0.074%, -0.377%                                   |

Differences are from the shock-expansion value (for the hexagon, with the
reflections neglected). On the double wedge the Euler drag converges to
shock-expansion theory, within 0.1% whatever order is assumed and 0.95%
away from Ackeret's: the engine and the section method agree where the
method claims to be exact. On the hexagon the observed order falls from
1.63 (the first three grids) to 0.67 (the last three): the solutions are
not yet in their asymptotic range, the finest is still changing by 0.45%
per halving, and the extrapolations span 0.38% below to 0.25% above the
shock-expansion value. So on this section the neglected reflections
change the drag by less than about half a percent if the convergence is
monotone at orders between 0.67 and 2, and their sign is not resolved. That
is not a band; the hexagons stay refused. (The double wedge's fourth grid
was not run: under the machine's load the hexagon's took 28 minutes.)

## 3. The planform in three dimensions

### 3.1 Method

As `finwave.py` (formulation in the module comment of
`linear-wave-drag.ts`): a source sheet of the fin and its image, the
chordwise integral of each constant-slope segment done analytically, the
remaining integral split at the inverse-square-root points with the sin^2
substitution and Gauss-Legendre. The section keeps its shape and thickness
ratio along the span; the ratio of 3D to strip drag then depends on the
planform, the section's shape and beta, not on t/c (tested).

The surface pressure has kinks along the Mach cones of the planform's
vertices (the root, where the image bends each breakpoint line, and the
tips). `finwave.py` integrates across them with one Gauss rule per segment
and station, which converges slowly and erratically (section 3.3). The
library splits the chordwise integral where those cones cross each station
and the spanwise integral where they cross a breakpoint line; with
`splitAtMachCones: false` it is `finwave.py`'s integration.

### 3.2 Verification

| Check                                                                                                        | Measured                                                                                          | Test                       |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | -------------------------- |
| 2D limit: unswept, span 50 chords, mid span; double wedge, ridge 0.3, hexagon; Mach 1.2, 1.5, 2, 3           | 4.1e-9                                                                                            | `linear-wave-drag.test.ts` |
| Infinite swept wing, supersonic edges (Mach 2 and 30 deg, 3 and 45, 1.5 and 20), same sections               | 5.0e-10                                                                                           | `linear-wave-drag.test.ts` |
| Infinite swept wing, subsonic edges (Mach 1.5 and 60 deg, 2 and 70), section drag over 2D, n = 48            | -8.3e-6 and -1.6e-6 at 20 chords from the root; 1.0e-7 and 2.0e-7 at 80; 2.3e-7 and 2.4e-7 at 320 | `linear-wave-drag.test.ts` |
| Tip cone of a constant-slope sheet, Cp / Cp_2D = 1/2 + asin(beta (s - y) / x) / pi, 36 points, Mach 1.5 to 3 | 1.9e-11                                                                                           | `linear-wave-drag.test.ts` |
| The port with `finwave.py`'s integration (n = 24) against `fin_cases.py`'s 40 ratios                         | 9.1e-14                                                                                           | `linear-wave-drag.test.ts` |
| Area rule: long unswept wing and unit rectangle (2D exactly); level 4 against 5 of its rule                  | 1 - 1e-8 (it drops the last 1e-9 of each piece); below 1e-8                                       | `linear-wave-drag.test.ts` |
| Area rule: its log-kernel form against von Karman's Fourier series (a tent-shaped S')                        | 4.3e-12 (the series' truncation)                                                                  | `linear-wave-drag.test.ts` |
| Source sheet against the area rule: 10 planforms, Mach 1.2 to 3 (50 cases), default resolution               | 3.4e-6 at worst (RM A53D02 planform, Mach 1.5); inside the result's own error estimate in all 50  | `fin-wave-drag.test.ts`    |
| The audit's area-rule values (11, to 3 decimals, extrapolated from two resolutions)                          | within 0.49% (the ARCAS fin at Mach 3)                                                            | `linear-wave-drag.test.ts` |

The research's four checks stand, and the audit's L4 is closed (the
tip-cone and subsonic-edge checks are tests now). The swept-wing checks run
on a long swept fin with its image, whose root is a kink in the wing: the
station lies outside the root's Mach cone for supersonic edges, and far
from the root for subsonic ones, where the root's influence decays (8.3e-6
of the 2D drag at 20 chords, 1e-7 at 80).

The audit's `hayes_fin.py` converges at first order from below toward the
area-rule values here: run with its three resolution parameters scaled
together by m = 1, 2, 4 on its 32 cases, it differs from them by -3.9% to
+0.28%, -1.95% to +0.21% and -0.98% to -0.01% (mean magnitude 0.90%, 0.44%,
0.22%; `hayes_study.py`, `compare.py`). So the two area-rule codes
agree in the limit, and the audit's "within 0.5%" was set by its own
resolution.

### 3.3 Quadrature convergence

Largest error of the 3D-to-strip ratio against the area rule over 52
cases (the 50 of section 4 and two near-sonic leading edges, beta cot(LE)
= 0.95 and 1.05 at Mach 2), with n Gauss points per piece in each direction
(`runs/convergence.test.ts`):

| n                                 | 8      | 12     | 16     | 24     | 32     | 48     | 64     | 96     | 128    |
| --------------------------------- | ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| Split at the Mach cones (default) | 2.4e-4 | 5.2e-5 | 1.7e-5 | 3.4e-6 | 1.1e-6 | 2.3e-7 |        |        |        |
| `finwave.py`'s integration        |        |        | 3.1e-3 | 2.2e-3 | 7.5e-4 | 3.4e-4 | 1.3e-4 | 7.1e-5 | 5.5e-5 |

With the split, supersonic leading edges (42 of the cases) are within
1.8e-7 at n = 24 and 2.0e-8 at n = 32, near the area rule's own 1e-8;
subsonic ones (10) converge at about fourth order (3.4e-6, 1.1e-6, 2.3e-7 at
n = 24, 32, 48 at worst, the RM A53D02 planform at Mach 1.5) and set the
worst case (`compare.py`). The research ran
n = 24 without the split, so its ratios carry errors up to 0.22%; its
"changes of 0.2% or less" between 16 and 40 points described that. The
default is n = 24.

Each result carries `quadratureError`: the difference from the same
integral with two thirds of the points per piece, or 2e-7 of the ratio if
larger. It exceeded the measured error on all 52 cases; without the floor
it fell short on six, all with both below 2e-7, where the area rule's own
1e-8 bias and the oscillation of the converged quadrature dominate
(`compare.py`). The test asserts it on the 50 of section 4
(`fin-wave-drag.test.ts`).

## 4. Strip theory against linear 3D theory

Ratio of the linear 3D drag of one fin on a plane wall to strip theory
(2D Ackeret at every station) on the same planform, double wedge t/c 0.05
(ridge at mid chord unless stated; the ratio does not depend on t/c);
beta cot(LE sweep) in brackets, above 1 a supersonic leading edge
(`fin-wave-drag.test.ts`, values from `runs/table.test.ts`; each within
3.4e-6 of the area rule):

| Fin                                                                   | M 1.2         | M 1.5         | M 2.0         | M 2.5         | M 3.0         |
| --------------------------------------------------------------------- | ------------- | ------------- | ------------- | ------------- | ------------- |
| A: ARCAS fin, root 3.38, span 2.103, LE 30 deg, ridge at 0.536        | 1.0245 (1.15) | 1.0562 (1.94) | 1.0308 (3.00) | 1.0181 (3.97) | 1.0121 (4.90) |
| B: clipped delta, root 1, span 0.5, LE 45 deg, taper 0.5              | 0.9326 (0.66) | 1.0949 (1.12) | 1.0823 (1.73) | 1.0488 (2.29) | 1.0324 (2.83) |
| C: trapezoid, root 1, span 1, LE 26.6 deg, taper 0.5                  | 1.1005 (1.33) | 1.0512 (2.24) | 1.0219 (3.46) | 1.0128 (4.58) | 1.0085 (5.66) |
| C-hex: the same, hexagonal section with 15% bevels                    | 1.1557 (1.33) | 1.0589 (2.24) | 1.0241 (3.46) | 1.0138 (4.58) | 1.0091 (5.66) |
| D: rectangle, chord 1, span 1                                         | 1.0000        | 1.0000        | 1.0000        | 1.0000        | 1.0000        |
| E: root 1, span 0.75, LE 45 deg, TE swept back 16.7 deg, taper 0.475  | 1.0202 (0.66) | 1.1962 (1.12) | 1.1021 (1.73) | 1.0560 (2.29) | 1.0362 (2.83) |
| F: RM A53D02 planform, root 0.75, span 0.125, LE 71.6 deg             | 0.4205 (0.22) | 0.6235 (0.37) | 0.8931 (0.58) | 0.9730 (0.76) | 1.0418 (0.94) |
| G: clipped delta, root 1, span 1, LE 36.9 deg, taper 0.25             | 1.1014 (0.88) | 1.1034 (1.49) | 1.0433 (2.31) | 1.0251 (3.06) | 1.0167 (3.77) |
| R02: rectangle, chord 1, span 0.2                                     | 0.6538        | 0.8647        | 0.9808        | 0.9995        | 1.0000        |
| H: root 1, span 0.6, LE 45 deg, TE swept forward 16.7 deg, taper 0.22 | 0.9914 (0.66) | 1.1283 (1.12) | 1.0660 (1.73) | 1.0403 (2.29) | 1.0276 (2.83) |

Measured, on these planforms (each statement asserted by
`fin-wave-drag.test.ts`; the ratio minus one is the 3D drag's difference
from strip theory's):

- beta cot(LE) above 2, span at least half the root chord (25 cases):
  within 6% (ratios 1.0000 to 1.0589).
- Between 1 and 2 (11 cases): up to 20%, the 3D drag always the higher
  (1.0245 to 1.1962).
- Subsonic leading edges (9 cases): from 58% below to 10% above (0.4205
  to 1.1014); for the RM A53D02 planform at Mach 1.2 strip theory gives
  2.38 times the 3D drag.
- The research's rule needs its span condition: the rectangle of span 0.2
  chords has beta cot(LE) infinite and ratios 0.654, 0.865 and 0.981 at
  Mach 1.2, 1.5 and 2. The tip's Mach cone covers much of a short panel.
- The rectangle of span equal to its chord gives 1 at every Mach number to
  1e-7: the tip effects cancel in the total (not station by station: 1.016
  at mid span, 0.58 at 0.99 span, Mach 2, `fin_rect.out`). The area rule
  gives 1 to 1e-8 there and on a span of 20 chords.

The research's table (`fin_computations.md`, n = 24 without the split)
changes in the third decimal at 12 of its 40 entries, by 0.22% at most
(`runs/note.test.ts`; for example B at Mach 1.5, 1.0961 to 1.0949, and F at
1.5, 0.6249 to 0.6235). Its summary statements (6%, 20%, -58% to +10%,
factor 2.4) hold with these values. The audit's independent area-rule
values agree within 0.49% (section 3.2).

## 5. The ARCAS fin check, restated

The research's `arcas_fin_check.py` re-run gives its archived output. Redone
with the library (`runs/arcas.test.ts`): the exact section drag (the ridge
at 0.536 makes it 0.9945 to 0.9909 times Ackeret's at Mach 1.5 to 2.96, no
reflected wave reaching the surface) times the 3D ratio, plus the
fully turbulent van Driest II friction of `src/friction` on both faces at
the mean geometric chord (2.773 in; Re 9.84e6 per m, T0 339 K), four fins
on the body cross-section, over the measured fins-on increment of TN
D-4014:

| M    | Fins' own drag | Over the research's readings | Over the audit's readings |
| ---- | -------------- | ---------------------------- | ------------------------- |
| 1.50 | 0.0925         | 0.492                        | 0.492                     |
| 1.80 | 0.0787         | 0.573, 0.579                 | 0.574, 0.560              |
| 2.30 | 0.0659         | 0.716, 0.773                 | 0.733, 0.756              |
| 2.96 | 0.0557         | 0.845, 0.844                 | 0.855, 0.840              |

So the fins' own wave drag and friction are 49% to 85.5% of the measured
increments, whichever reading. Nothing measured here says what the rest is.
The research draft attributed it to the base; the audit found that not
supported (its rough reading of TN D-4014 fig. 4, not digitised, puts the
fins' change of the chamber force at about a third of the shortfall at
Mach 1.5), and listed other unquantified contributions: the trip strips on
the fins, the leading-edge radius (not given), the fin anchors and the root
gaps. The friction is an upper estimate (fully turbulent from the leading
edge, while the trip is 0.5 in aft), which makes the shortfall a lower
bound.

## 6. What is not covered

- **Linear theory's own error in 3D**, and the plan's product (exact 2D
  section drag times the linear ratio, which assumes the nonlinear section
  correction carries over to 3D): neither has been measured against data or
  a 3D solution. The verification above is of the implementation of linear
  theory, not of linear theory.
- **Fin-body interference.** The body is a plane wall; a round body is not
  (the ARCAS body radius, 1.125 in, is about half its fin span). Each fin
  sees only its image: neighbouring fins and the body's own flow (its
  boundary layer and pressure field at the root) are not represented. No
  zero-lift fin-body interference data were opened by the research.
- **The fins' effect on the base**: only what section 5 measures, that the
  fins' own drag leaves 14.5% to 51% of the ARCAS increments unexplained.
- **Rounded or blunt edges** are refused (sharp leading and trailing edges
  only; a blunt trailing edge declared by the section is accepted for its
  faces' drag, the base left to a base-pressure model, 0010). For scale,
  measured elsewhere: a blunt leading edge raised the
  total CD of the RM A53D02 model by about 0.02 below Mach 5, about its fin wave drag
  (RM A53D02 p. 15, as read by the research and checked by the audit); the
  pitot-pressure bound on a square leading edge is 4.6 to 41 times the sharp
  double wedge's drag at t/c 0.05 and 0.03, Mach 1.2 to 3
  (`blunt_le.py`, re-run identical).
- **Transonic Mach numbers, below about 1.2.** Detached and subsonic-behind
  shocks are refused (a double wedge of t/c 0.08 is detached at Mach 1.2,
  section 2.1); linear theory's accuracy as beta goes to 0 has not been
  measured, and strip theory errs most there (section 4).
- **Sections the shock-expansion method refuses**: hexagons with short
  bevels (section 2.1), concave sections. The neglected reflections were
  looked at on one case only, without resolving them (section 2.4).
- **Friction.** `src/friction` gives flat-plate friction (van Driest II,
  laminar, transition); applying it to fins (as plates of local chord, with
  the trip and the root's boundary layer) is not done here.
- Incidence, roll and fin cant; thickness ratio or section shape varying
  along the span; leading edges swept forward; real-gas effects (gamma =
  1.4 throughout).

## 7. Open

- A check of the linear 3D ratio, and of the product, against a 3D
  inviscid solution of a fin on a wall (the plan's 3D sector, M10 and M11)
  or against fin data with the base effects separated.
- The size of the reflected waves for the refused hexagons over the range
  of bevels and Mach numbers, by planar Euler on grids finer than 480 x 224
  (four did not reach the asymptotic range on 15% bevels) or a
  characteristics solution, before any of them is served.
- TN D-4014 fig. 4 (the ARCAS chamber force), to be digitised, as the audit
  asked, before the ARCAS increments are used to set a fin band.

## 8. Reflected waves that reach no inclined face (2026-10-26)

Written before the code (A2 of the refusal plan, noted under 0014
section 10.7 (z); no data enter and no band moves, so no letter of its
own). Section 2.1 refuses a section whenever a wave reflected
from the leading-edge shock can land on the surface ahead of the trailing
edge. That is stricter than exactness needs. The drag is the sum over
faces of Cp times the face's rise (section 2.2's definition): a face
parallel to the chord contributes nothing whatever its pressure. So the
shock-expansion value is exact for the inviscid flow as long as no
reflected wave reaches a face with slope; waves that land only on flat
faces, and whatever they do after, change pressures that carry no drag.

**The argument.** In steady supersonic flow nothing travels upstream
along the surface: a face's pressure is fixed by the states ahead of it
(the shock, the corners before it) and by the waves that land on it, and
a wave that lands on the surface at x can change only what lies at and
behind x. Section 2.1's bound gives the earliest point x_1 at which any
wave reflected from the leading-edge shock can land, the head of the
first corner's fan meeting the straight shock at P and descending at the
steepest angle the surface's states allow; everything the fan reflects
lands at x_1 or behind it, and every later reflection (off the surface,
off the shock again) lands further behind. If every face from x_1 to the
trailing edge is flat (its rise zero), the faces with slope all lie
ahead of x_1, their pressures are shock-expansion's exactly, and the
drag is exact. The bound's own caveat stands as in section 2.1: it
neglects the change the reflected waves make to the states they cross;
so does the exactness it already claimed for the double wedges. For the
wedge followed by a flat (below) the verdict does not use the bound at
all: its one face with slope ends at its one corner, and every reflected
wave starts in that corner's fan, so it lands behind the corner wherever
the bound puts x_1; the bound, and its caveat, decide only sections with
a face with slope behind the first corner, hexagons and double wedges.

**What this reaches.** A wedge followed by a flat to a square trailing
edge (the plate bevelled at the leading edge only, `bevel-le-square-te`
in 0014's population): its one corner's fan reflects onto the flat, and
nothing with slope lies behind. Its faces' drag is the front wedge's
alone, exact. Its base is a separate term at the free-stream Mach number
(0010 section 5.1), which does not use the state on the flat ahead of
the edge. That state is not the stream's: behind the bevel's shock and
the shoulder's expansion the flat carries a Mach number a little lower
and a pressure up to 1.3% higher, which on the term's own
two-dimensional base-pressure curve gives a base term 0.2% to 2.1%
smaller (less base drag), and the reflected waves change it by at most
0.7% of its value (back toward the free stream's value at M 1.5 to 2.0,
further below it at 3.0), so the term at the free-stream Mach number is
at most 2.1% above the local one, inside its band of 0.93 to 1.21
(bevels of 8 to 15 deg, M 1.5 to 3.0; A2's review of 2026-10-27,
`docs/research/refusals/scripts/flat_state.py`, by shock-expansion
theory with the reflected waves' turning integrated along the shock, on
RM A51J25 fig. 7's curve as `src/base/blunt-te-2d.ts` holds it; the
largest change from the reflected waves, 0.67%, is at M 1.8 with a 15
deg bevel, 0.9831 to 0.9898). A hexagon is not reached by this section:
its rear bevel has slope and lies behind x_1, and whether the fan's
later waves, or the second landing after a reflection off the flat,
reach it is not bounded here (section 7 keeps it open; the earlier Euler
check of section 2.4 is not a band). A double wedge is reached only
where the bound already clears the chord. Sections with a compression
corner stay refused as before.

**In the code.** `solveSurface` records the end of the last face with
slope (`lastSlopedFaceEnd`); `exactSectionDrag` takes a surface as exact
when `firstReflection` is at or beyond that end, and refuses, as before,
when a reflected wave can land ahead of it (the message now says the
wave reaches a face with slope). `exact` keeps its meaning: cd is exact
for the inviscid flow. The `neglectReflectedWaves` option is unchanged.
`fin-wave-drag.ts` and `src/total` are untouched: the label "exact
section drag times the linear 3D ratio" stays true. Tests
(`tests/fins/section-drag.test.ts`): a wedge-flat section with a square
trailing edge whose first reflection lands on the flat at x/c about 0.6
is served, `exact` true, its cd equal to the value with reflections
neglected and to the front wedge's oblique-shock face drag by hand; the
same front wedge with a rear bevel added (a hexagon) is refused with the
reason; the reflection bound's by-hand case is unchanged; a wedge-flat
section whose bound lands on the front wedge itself cannot occur (the
landing lies behind the first corner), asserted. Since the check of
2026-10-26 (A2's, before its review), each surface is held to its own
verdict: a section flat to the edge above and closing over its last 20%
below is refused for the lower surface, and its mirror for the upper (a
check of the upper surface alone, planted, passed every other test of
`tests/fins` and `tests/total`).

**Coverage** (0014's population at 400 rockets, 1,600 cases, the run of
0015 section 12 as the "before",
`docs/research/refusals/out/2026-10-26-a1-plates-any-sweep/after/`, and
`out/2026-10-26-a2-reflected-flat/after/` after this section, both made
with `N_ROCKETS=400 CROSS_CHECK=100`, so the cross-check against
`src/total` covers the first 100 rockets' 400 cases, and agrees on all
400 in each). The reflected-wave refusal falls from 13.9% of cases to
8.7%, 223 to 139 (Mach 1.5 to 1.8: 24.8% to 15.5%; 1.8 to 3.0: 27.3% to
17.5%): every plate bevelled at the leading edge only is now served by
the library (84 cases), the hexagons stay refused. Totals served on the
page do not move (2.9% of all bands; 144 of 1,600 with the nose assumed
served), because the page does not offer the wedge-flat section with a
square trailing edge (0014 W12, `pageSection` in the audit); with that
one input added, and the nose assumed served, they would go from 145 to
193 of the 1,600 (each run's table "Totals with the nose assumed
served", printed since A1's review of 2026-10-26). What still refuses
(`out/2026-10-26-a2-reflected-flat/after/reflected-split.out`, from
`reflected-split.test.ts`, which re-solves the audit's own cases and
agrees with its verdict on all 648 sharp sections; that agreement checks
the audit's bookkeeping, not A2, since `evaluate.ts` calls the same
`exactSectionDrag`): of the 139, 133 are hexagons whose first reflection
lands on the flat ahead of the rear bevel, 5 hexagons whose first
reflection lands on the rear bevel itself, and one double wedge below
Mach 1.2. (This record said "127 of the 206 reflected-wave cases of the
plan's count" before the check of 2026-10-26; neither number is on these
cases.) The hexagons wait on a bound for the fan's later waves and the
second landing, or on the planar Euler or characteristics measurement of
section 7. At the audit's default size (2,000 rockets, 8,000 cases,
`out/impact.out` and `out/reflected-split.out`): the reflected-wave
refusal 14.6% to 10.2% of cases (Mach 1.5 to 1.8: 25.9% to 18.0%; 1.8 to
3.0: 29.0% to 20.1%), 1,172 to 815 (357 wedge-flat plates served; 802
hexagons landing on the flat, 9 on the rear bevel, 4 double wedges below
Mach 1.2 still refused); totals unchanged at 190 (2.4%), 743 with the
nose assumed served; with the page's section offered too, 748 to 966;
the cross-check agreeing on all 1,200 cases checked.
