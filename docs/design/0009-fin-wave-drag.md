# 0009: Fin wave drag

- **Status:** Draft. A library with tests (`src/fins/`); on the drag page
  only as part of the total drag ([0011](0011-total-drag-on-the-page.md)).
  (0008 is reserved for the total-drag record.)
- **Date:** 2026-10-19 (section 8 added 2026-10-26; section 9, a
  registration, 2026-10-30)
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
  characteristics solution, before any of them is served. (2026-10-30:
  registered as section 9, by a characteristics solution with the planar
  Euler solves as its check; not yet run.)
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
`tests/fins` and `tests/total`). Since the review of 2026-10-28, which
found that taking any face with slope under 1 deg as flat passed every
test, a hexagon with a long, shallow rear bevel is held refused: the
same 3% plate's 10 deg front wedge with a rear bevel of 0.95 deg
(closing to a sharp edge over 0.9 of the chord) and one of 0.61 deg
(closing half the thickness over 0.7, to a blunt edge), at Mach 1.5, 2
and 2.5; that mutation, planted, now fails it.

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
Mach 1.2 still refused); totals unchanged by this section. As re-made on
2026-10-28, after main's A5 (f88ecbe) and A1's narrowing below Mach 1.62
(0014 10.7 (z)'s note), the default run serves 179 totals of 8,000
(2.2%), 614 with the nose assumed served, and with the page's section
offered too 619 without this section and 797 with it (on 2026-10-26,
before A5 and the narrowing, these read 190, 743, and 748 to 966); the
reflected-wave figures above hold; the cross-check agreeing on all 1,200
cases checked. Later on 2026-10-28, after main's A3 and A4 (3e026a8, the
leading edges), the run on this branch serves 184 totals of 8,000, 628
with the nose assumed served, and with the page's section offered too
633 without this section and 811 with it; the reflected-wave figures
above still hold. After main's B1 and the body base band (cdd26e6 and
0b2def5, also 2026-10-28) the counts are unchanged: 184, 628, 633 and
811; the reflected-wave figures still hold, and the cross-check agrees
on all 1,200 cases checked. After the rulings of 2026-10-28 on flat
plates at the base (0015 section 12: beyond 60 deg where M cos L is
below 1, and a forward-swept trailing edge, refused), 184 and 628 are
unchanged and the count with the page's section offered is 809 (811
before): two plates bevelled at the leading edge only, which this
section serves, swept beyond 60 deg with the edge subsonic; the
reflected-wave figures still hold. The strict reading the same day (a
swept trailing edge on a plate refused either way, 0015 section 12)
leaves 184, 628 and 809 as they are.

## 9. Reflected waves on hexagonal sections: the registration (W9(a), 2026-10-30)

Registered on 2026-10-30, before the code it describes exists and before
any computed value of its runs: no characteristics solution and no Euler
solve named below has been run. The only values that exist for its cases
are section 2.4's drags of E1 and the estimates of A2's review script
that 9.7 quotes to choose E2 and E3. Noted in 0014 section 10.7 (its
entry of 2026-10-30). Nothing in this section is reworded after results;
changes are dated notes below it.

### 9.1 The question, and why another method

Section 2.1 refuses a section on which a wave reflected from the
leading-edge shock can reach a face with slope (section 8): on the page,
hexagons whose first reflection can land ahead of the end of the rear
bevel. In the refusal audit (0014; 2,000 rockets at four Mach bands,
8,000 cases, `docs/research/refusals/out/impact.out`) the reason applies
to 10.2% of cases (815: 811 hexagons, every one a plate bevelled at both
edges, and 4 double wedges below Mach 1.2) and is the only reason
refusing the total in 0.47% (38 cases), so that lifting it alone would
raise the totals served from 235 to 273. Of the 811 hexagons, 762 are at
Mach 1.5 and above (`out/reflected-split.out`, `out/w9-family.out`).

Section 2.4's captured planar Euler solve of one such hexagon did not
converge cleanly: its observed order fell from 1.63 to 0.67, its finest
grid still moved 0.45% per halving, and its extrapolations spanned 0.38%
below to 0.25% above the shock-expansion value with the reflections
neglected. A captured shock and captured corner fans are locally first
order, which is the likely reason (not shown), and the effect to be
measured is a few tenths of a percent. So the measurement is made by
another method, and the captured solve becomes its independent check.

**The method of characteristics, planar, with the shock fitted.** For
steady inviscid flow over a convex polygon with an attached leading-edge
shock and supersonic flow everywhere behind it, the equations between the
shock and the surface are hyperbolic. The method of characteristics,
with the oblique-shock relations at every shock point and centred
Prandtl-Meyer fans at the corners, solves them exactly up to its
discretisation error: every reflected wave (from the shock, from the
wall, from the shock again) is carried by the net itself, and there is no
numerical dissipation, no captured shock and no limiter. Its unit
processes are second order, as those of `src/validation/characteristics.ts`
(the axisymmetric method that checks noses, converged to about 1e-6 in
drag and tested on cones against Taylor-Maccoll), so it should converge
at order 2; 9.5 requires every case served to show its convergence. The
captured planar Euler solver of section 2.4 is the independent check
(9.7): a different discretisation of the same equations (conservative
finite volumes, a captured shock, HLLC), sharing no code with the
method. It sets nothing.

### 9.2 The method

**What is computed.** A symmetric hexagon at zero incidence, gamma 1.4: a
front bevel of half-angle theta over a fraction b of the chord, a flat,
and a rear bevel of the same angle and length. One surface is solved;
the other is its mirror image, and in supersonic flow the two meet only
behind the trailing edge. The result is the drag over shock-expansion
theory's, eps = cd / cd_SE - 1, where cd_SE is `exactSectionDrag`'s with
`neglectReflectedWaves`. Nothing reaches the front bevel (its pressure
is the straight shock's in both) and the flat carries no drag, so eps
comes from the rear bevel's pressures alone.

**The equations.** Along the characteristics dy/dx = tan(theta +- mu),
planar rotational flow with the total enthalpy constant gives Q dp +-
d(theta) = 0, Q = cot(mu) / (rho V^2) (TN D-2970's equations (10) to
(13), as `characteristics.ts` uses them, without the axisymmetric term),
and the entropy, K = p / rho^gamma, is constant along streamlines. They
are used in Prandtl-Meyer form, with nu the Prandtl-Meyer function:

    d(nu) -+ d(theta) + C d(ln K) = 0 along C+-,  C = sqrt(M^2 - 1) / (gamma (gamma - 1) M^2),

where d(ln K) is the change between the streamlines the characteristic
crosses. Where the flow is homentropic (behind the straight shock, in the
fans' simple regions, and in the layer along the wall, whose entropy is
that of the straight shock) these are exact (nu -+ theta constant), so
the method reproduces shock-expansion theory to round-off wherever no
reflected wave arrives (9.3, T1 and T2), and only the averaged
coefficient C and the positions carry the discretisation error. K at a
point is taken from the stream function, as in `characteristics.ts`: the
free stream crossing the shock below height y carries psi = rho_inf
V_inf y, so the shock's history gives K(psi), and psi is integrated along
each C- line from the shock. psi at the wall, which should vanish, is the
mass balance (9.5).

**The unit processes** are those of `characteristics.ts` in planar form,
with the relations above: an interior point where a C- line and a C+
line meet; a shock point,
where a C+ line meets the shock, its wave angle found so that the
oblique-shock state (`gas-dynamics.ts`) satisfies the C+ relation; a wall
point, where a C- line meets the wall, with the wall's angle and
entropy. Each averages its coefficients and directions over its segments
and iterates to convergence (second order). Lines are held as
directions, not slopes, so that a characteristic steeper than 90 deg
(near-sonic flow behind the shock) is taken as it is.

**The flow, in two parts.** (1) The step: the front bevel followed by a
flat without end. In supersonic flow the rear corner influences nothing
ahead of the C+ characteristic through it, so up to that characteristic
the hexagon's flow is the step's. It is uniform behind the straight shock
up to the head of the front corner's fan, which meets the shock at P
(section 2.1); the fan is a simple wave, its rays carrying the exact
Prandtl-Meyer states, up to the C- characteristic from P, which carries
the first reflected wave; beyond it the net is marched along C- lines
from the shock to the wall, each line starting where the next C+ line
reaches the shock (a ray of the fan, then the reflections from the
wall), as `characteristics.ts` marches. (2) The rear corner: the region
bounded by the C+ characteristic through the rear corner, the rear bevel
and the C- characteristic through the trailing edge. Its data are the
step's flow along that C+ characteristic, traced through the step's net
with the states interpolated along the step's C- lines; from points along
it, C- lines are marched across the rear corner's centred fan and the
reflections from the bevel down to the bevel. The bevel is continued past
the trailing edge as a straight wall so that the last C- line lands past
it, which in supersonic flow changes nothing ahead of the trailing edge.

**Resolution.** One parameter, N: each fan turns through theta in N
equal steps (N + 1 rays); the data points along the rear corner's C+
characteristic are b / N apart in arc length; the step's lines are one
per ray and per reflection; so every spacing of the net scales as 1 / N.
Levels N = 16, 32, 64, 128 and 256.

**The drag.** The rear bevel's pressure at its wall points (the rear
fan's last state at the corner, then each landing), integrated over the
bevel's rise by the trapezoid rule, the last interval cut at the trailing
edge by linear interpolation; the front bevel's is the straight shock's.

**Where the method stops.** A case fails at a level if a point is not
supersonic, if the net folds (two lines of one family crossing: a shock
forming), if the rear corner's region reaches the shock, or if a unit
process does not converge in 50 iterations to 1e-13 (as
`characteristics.ts`).

**Code.** `src/validation/planar-characteristics.ts` (a reference beside
`characteristics.ts`; nothing on the page calls it), its tests in
`tests/validation/` (9.3), the runs in `docs/research/fin-wave-drag/w9/`.

### 9.3 Checks of the code, before any case is run

Committed tests, all passed before the runs of 9.5 to 9.7 start. They
check the implementation; T2 also checks section 2.1's bound.

- **T1.** A wedge followed by a flat to a square trailing edge (section
  8's): at every level the method's drag equals the front wedge's
  oblique-shock drag, and its wall pressure on the flat ahead of the
  landing of the C- line from P equals shock-expansion's, within 1e-12
  relative.
- **T2.** Hexagons the library calls exact (the first reflection at or
  beyond the trailing edge): 15% bevels at t/c 0.05 at Mach 2, 2.5 and 3,
  and 30% bevels at t/c 0.05 at Mach 1.5, 2 and 3 (section 2.1's table):
  eps within 1e-12 of zero at every level. The first reflected
  characteristic crosses no reflected wave, so section 2.1's bound holds
  for it exactly; a non-zero eps here would mean the code is wrong or the
  bound is not one.
- **T3.** The first reflection against its analytic coefficient. A weak
  wave of the fan reaching the shock from behind turns the shock and
  sends back a reflected wave; from the oblique-shock relations and the
  compatibility relations above, the reflected wave's pressure change
  over the incident wave's is R = (Q - sigma) / (Q + sigma), with sigma =
  d(theta_s) / d(p_s) the slope of the shock polar at the shock's wave
  angle (the upstream state fixed) and Q behind the shock (R vanishes for
  a Mach wave, where sigma = Q). The method's first reflection, R_N = (p
  at the first shock point after P - p on the fan's first ray after its
  head) / (p on that ray - p behind the straight shock), must approach R:
  |R_N - R| decreasing at each doubling of N from 32 to 256 and at N =
  256 at most a quarter of its value at N = 32 (or below 1e-10 at every
  N), at (theta, M) = (8 deg, 1.6), (12 deg, 2.2) and (15 deg, 3.0). This
  checks the shock point against the relations it is built from, not
  against other physics.

### 9.4 The family and its grid

**The sections.** The page's hexagon (`hexagonal`, `src/fins/section.ts`)
with equal bevels: four breakpoints, the two middle ones at the same
half-thickness, the bevels' lengths equal within 1e-9 of the chord; both
edges sharp; zero incidence. A case is (theta, b, M): theta = atan(t / (2
b c)) the bevels' half-angle, b the bevel's length over the chord, M the
free-stream Mach number. It lies in the family when 5 <= theta <= 15 deg,
0.01 <= b <= 0.4525 and 1.5 <= M <= 3.0.

**The grid.** Nodes at theta = 5, 6, ..., 15 deg (11); b = 0.01 times
2^(k/2), k = 0 to 11 (0.0100, 0.0141, 0.0200, 0.0283, 0.0400, 0.0566,
0.0800, 0.1131, 0.1600, 0.2263, 0.3200, 0.4525); M = 1.5, 1.6, 1.7,
1.8, 1.9, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0 (11). A node is computed where
shock-expansion theory has a solution at its (theta, M): an attached
shock with supersonic flow behind it. That excludes five (theta, M)
pairs (12 to 15 deg at Mach 1.5, 15 deg at 1.6), so 1,392 of the 1,452
nodes are computed. The cell of a case is, in each coordinate, the
interval between consecutive nodes that holds it, the lower node
included and the last interval holding its upper node too.

**Why these ranges** (`docs/research/refusals/out/w9-family.out`, from
`w9-family.test.ts`, which uses only the shock-expansion code as it
stands). The 762 hexagons the reflected-wave rule refuses at Mach 1.5
and above have half-angles 8.0 to 15.0 deg, bevels 0.018 to 0.150 of the
chord, t/c 0.009 to 0.061, Mach 1.50 to 3.00 and Mach 1.01 to 2.53
behind the leading-edge shock. The half-angles 5 to 7 deg and the bevels
beyond 0.15 are added for the page: at the grid's nodes the shortest
bevel at which a hexagon is exact today (section 2.1's bound) runs from
0.0736 of the chord (5 deg, Mach 2.0) to 0.4034 (11 deg, Mach 1.5),
except at 14 deg and Mach 1.6, next to the attachment limit, where even
0.49 is refused; so 0.4525 reaches past it at every node but that one.
Of the 762, 698 lie in cells whose eight corners all have an attached
shock with supersonic flow behind it, which bounds from above what this
registration can serve; the other 64 lie in cells next to the attachment
limit (11 to 15 deg at Mach 1.50 to 1.70, Mach 1.01 to 1.17 behind the
shock). All 38 sole blockers and all 86 cases where the reflected wave
is the only reason left with the nose assumed served lie inside. Below
Mach 1.5 (49 hexagons) the fins' own-drag band refuses the total anyway
(0014 section 10.7 (f)), and the family does not go there.

### 9.5 Convergence, and when a case passes

For each node, and each check point and Euler case below, eps_N at the
five levels, and d_N = eps_N - eps_(N/2). A case passes when every level
runs (none stops as 9.2 says), the mass balance converges (the largest
|psi| at the wall over every line, over rho_inf V_inf y_P with y_P the
height of P, is at N = 256 at most half its value at N = 128, or below
1e-9 at both), and either

- (a) |d_256| <= 1e-6 and |d_128| <= 4e-6 (converged to well below what
  matters, whatever the order), or
- (b) d_128 and d_256 have the same sign, the observed order p =
  log2(d_128 / d_256) lies in 0.8 to 3.0, and |d_256| <= 1e-4.

Its value is eps_256 and its uncertainty U = 2 |d_256| + 1e-6. For an
order of 0.8 or more the error left at N = 256, as Richardson's
extrapolation estimates it, is at most 1.35 |d_256|, which U covers. The
expected order is 2; the window starts at 0.8 because the heads and tails
of the reflected wave trains are weak discontinuities (kinks in the
flow's derivatives), which can lower the observed order where they cross
a net.

### 9.6 The rule: values, bands and failures

**Served cells.** A cell is served when its eight corner nodes are
computed and pass 9.5. A node that fails removes the cells it bounds; it
is recorded with its reason.

**The value and band** of a case in a served cell, with eps and U of the
corners:

- eps_lo = the least of (eps - U) over the eight corners, minus 5e-4,
  rounded down to a multiple of 1e-3; eps_hi = the greatest of (eps + U),
  plus 5e-4, rounded up to a multiple of 1e-3;
- the section drag served is cd_SE (1 + (eps_lo + eps_hi) / 2), cd_SE
  being the case's own, its band cd_SE (1 + eps_lo) to cd_SE (1 +
  eps_hi), labelled not exact, the method and band named;
- in the total (`src/total`) the fin wave drag is that value times the
  linear 3D ratio on the planform, as now; its band's low end is 1.01
  times the low end above and its high end 1.59 times the high end (the
  fins' own-drag band, 0008 section 4.3), each widened by the quadrature
  error as now.

The 5e-4 and the outward rounding are a margin for what eight corners
cannot show between them; the check points test it. The band is that of
the inviscid two-dimensional reflected waves alone: what the section
method does not represent otherwise (viscous effects, the product with
the linear 3D ratio, section 6) stays under the fins' own-drag band as
now.

**Check points**, held out: computed only after every node has run and
the served cells are fixed. (i) Every hexagon of the population that the
reflected-wave rule refuses at Mach 1.5 and above and that lies in a
served cell (at most 698). (ii) 200 points, each in a served cell drawn
at random with equal weight among the served cells (in the order of
their theta, b and M indices), placed uniformly in theta, ln b and M
within it (mulberry32 with seed 20261030; for each point the cell, then
theta, ln b and M, in that order). Each is computed at the five levels
and must pass 9.5, and its eps - U to eps + U must lie within its cell's
eps_lo to eps_hi.

**Failure.** If any check point fails, any check of 9.7 fails, or T1 to
T3 cannot be passed, nothing is served: the hexagons stay refused as
now, the failure is recorded with every number, and the owner rules. No
criterion, margin, grid, case or check point changes after a result is
seen. A defect found in the code after the runs start is fixed, recorded
in a dated note with what it changed, and every run of 9.5 to 9.7 is
repeated from the start with the fixed code.

### 9.7 The independent check: captured planar Euler

**Cases.** E1 is section 2.4's. E2 and E3 are chosen where the
reflected waves change the flat's pressure most, so that the effect
stands furthest above the Euler's own error, and with opposite signs:
A2's review script, `docs/research/refusals/scripts/flat_state.py`
(re-run on 2026-10-30, unchanged), integrates the first reflections over
the whole front fan and finds the flat's pressure, once they have all
arrived, changed by -0.77% at 15 deg and Mach 1.8 (1.0105 to 1.0028 of
the free stream's), -0.53% at Mach 2.0 and +0.57% at Mach 3.0 (1.0132 to
1.0190), and almost none at Mach 2.5, where its reflection coefficient
changes sign. Its coefficient, R = (s - k) / (s + k) in its notation, is
the R of 9.3's T3.

- E1: t/c 0.08, bevels 0.15 of the chord (theta 14.93 deg), Mach 2.0.
- E2: theta 15 deg, b 0.12 (t/c 0.06431), Mach 1.8.
- E3: theta 15 deg, b 0.10 (t/c 0.05359), Mach 3.0.

All three are refused today and lie in the family. **Set-up:** section
2.4's (`runs/euler.test.ts`: x/c from -0.3 to 1.2 and 1.4 chords high,
every corner on a vertical grid line, 0.025 of the chord at level 0 and
28 rows, each level halving both spacings; HLLC, van Albada, the shared
scaled reconstruction; each solve run until the density residual is
below 1e-11 of its start and the drag changes by less than 1e-11), levels
0 to 3, recording also the pressure on every wall face. A solve that
reaches `runs/euler.test.ts`'s iteration cap (40,000 times 2^level)
without meeting both is recorded as such, and the check fails. E1's
earlier drags stay as recorded; its re-run records them again beside
them, and the criteria below use the re-run. The method's values for E1
to E3 are computed at its five levels and must pass 9.5.

**Criteria, in each case:**

- **(E-a) The drag.** With D_1, D_2, D_3 the Euler drags at levels 1 to
  3: if they converge monotonically ((D_2 - D_1)(D_3 - D_2) > 0), the
  method's drag, cd_SE (1 + eps), must lie between D_3 and D_3 + (D_3 -
  D_2) / (sqrt(2) - 1), the Euler's drag extrapolated at any order of
  0.5 or more; otherwise within D_3 +- 2.5 |D_3 - D_2|; in either case
  the interval widened at each end by cd_SE U. On section 2.4's drags of
  E1 that interval runs from 0.53% below to 0.57% above the
  shock-expansion value: this criterion catches only an error of the
  method larger than the Euler's own uncertainty.
- **(E-b) The wall pressure where the reflected waves act.** Over the
  wall faces whose centres lie on the flat from the library's
  first-reflection bound x_1 (section 2.1) to 0.2 b ahead of the rear
  corner, and on the rear bevel from 0.2 b behind its corner to 0.2 b
  ahead of the trailing edge: e_k is the root mean square, weighted by
  face length, of the Euler's wall pressure at level k minus the
  method's at N = 256 (interpolated linearly at the face's centre), over
  the free stream's pressure; s_k is the same against shock-expansion's
  pressure (constant on each face). It must hold that e_3 < e_2 and e_3
  <= s_3 / 2: the Euler moves toward the method's pressures where the
  reflected waves change them, and at its finest grid lies at least twice
  as close to them as to the pressures with the reflections neglected.
  (The engine's wall pressure is within 0.04% of the oblique-shock value
  on a wedge and 0.07% of Prandtl-Meyer's at an expansion corner on 60 x
  30 cells, 0003; `flat_state.py`'s estimates of the reflected waves'
  change of the flat's pressure are above.)

The check passes when both hold in all three cases.

### 9.8 What may be served, and what stays refused

Only if 9.3 and 9.5 to 9.7 pass, `src/fins` serves the hexagons that lie
in served cells, as 9.6 says; hexagons the library calls exact today are
unchanged, and so is `neglectReflectedWaves`. Everything else the
reflected-wave rule refuses stays refused as now, the words saying why:
unequal bevels; a half-angle outside 5 to 15 deg; a bevel outside 0.01 to
0.4525 of the chord; a Mach number outside 1.5 to 3.0; a cell with a
corner where the shock is detached or the flow behind it subsonic, or
where the method failed; double wedges (none of the population's at Mach
1.2 and above; its 4 below Mach 1.2 are refused by the fins' own-drag
band too) and any other section. Detached bevel shocks and subsonic flow
behind them (W9(b)) are not in scope and stay refused.

### 9.9 The page's words

- **Served.** The fin wave drag's label names the method and the band,
  for example "shock-expansion section drag, with the waves reflected
  from the leading-edge shock taken from the planar method of
  characteristics (+0.1% to +0.4% of it, 0009 section 9), times the
  linear 3D ratio (0009)" (the numbers there only show the form); its
  band text names the reflected waves' band beside the fins' own band
  and the quadrature error. The total's claim and word do not change: an
  estimate, not validated.
- **Refused.** The reflected-wave words keep that a wave from the leading
  edge's shock could land on the fin's rear bevel, and say what has been
  computed: equal bevels at both edges, 5 to 15 degrees, at Mach 1.5 to
  3.0, away from the speed at which the shock stands off the edge. The
  change advised names what brings the fin inside where that helps
  (equal bevels; a bevel angle within 5 to 15 degrees), and otherwise
  stays "a longer bevel or a thinner fin". 0017's rows say the same. The
  exact words are written with the code, after the results are judged.

### 9.10 How the population run counts it

`evaluate.ts` asks `exactSectionDrag` itself, so `impact.test.ts` counts
the reflected-wave reason only where the rule still refuses;
`reflected-split.test.ts` gains rows for the hexagons served by this
section and for those still refused, by why (outside the family, or in a
cell not served). After the code: `impact.out`, the advice replay
(`ONLY=./advice-replay.test.ts`, a guard) and the reflected split
(`ONLY=./reflected-split.test.ts`), each with `--config
docs/research/refusals/vitest.config.ts`, the cross-check against
`src/total` required to agree; the README's count line set from that
run, dated. The most it can add (`w9-family.out`): 38 totals (235 to
273 of 8,000), and 86 with the nose assumed served (622 to 708), if
every cell that holds one of those cases is served.

### 9.11 Order and records

1. The method and T1 to T3, passed and committed; every line of every
   run below records the commit it ran on.
2. The nodes, each at its five levels, one solve at a time,
   single-threaded, at normal priority:
   `docs/research/fin-wave-drag/w9/nodes.jsonl`, one line per node as it
   finishes; a restarted run skips the nodes already recorded.
3. E1 to E3 at levels 0 to 3, one solve at a time: `w9/euler.jsonl`, one
   line per level as it finishes, the wall pressures beside it;
   resumable the same way.
4. The served cells from `nodes.jsonl` by 9.6, then the check points:
   `w9/checks.jsonl`, resumable.
5. The verdict by 9.5 to 9.7, recorded below this registration with every
   failure. If it passes: the code of 9.8 to 9.10, its tests with planted
   errors, and the population run; then the reviews.
