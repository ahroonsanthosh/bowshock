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
  Euler solves as its check; not yet run.) (2026-10-30, later: run as
  registered; the Euler check failed, and nothing is served; section 9.12.)
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
are section 2.4's drags of E1 and the estimates from A2's review script
that 9.4 and 9.7 quote (`flat_state.py`, and `w9_plateau.py` built on
it). Noted in 0014 section 10.7 (aj). Nothing in this section is
reworded after results; changes are dated notes below it.

Revised on 2026-10-30, still before any code or run, after Fable's
review of the first text (0f1a69f, PASS with changes) and the
coordinator's rulings on it; 0014 10.7 (aj) lists what changed. The text
below is the registration as revised.

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
reflected wave arrives (9.3, T1 and T2). Where reflected waves are, the
discretisation error is carried by the averaged coefficient C, the
positions, psi integrated by the trapezoid rule and so K(psi), the shock
point's averaged coefficients, and the interpolation of the step's flow
onto the rear corner's C+ characteristic. K at a point is taken from the
stream function, as in `characteristics.ts`: the free stream crossing
the shock below height y carries psi = rho_inf V_inf y, so the shock's
history gives K(psi), and psi is integrated along each C- line from the
shock. psi at the wall, which should vanish, is the mass balance (9.5).

**The unit processes** are those of `characteristics.ts` in planar form,
with the relations above: an interior point where a C- line and a C+
line meet; a shock point, where a C+ line meets the shock, its wave
angle found so that the oblique-shock state (`gas-dynamics.ts`)
satisfies the C+ relation; a wall point, where a C- line meets the wall,
with the wall's angle and entropy. Each averages its coefficients and directions over its segments
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
as below; from points along it, C- lines are marched across the rear
corner's centred fan and the reflections from the bevel down to the
bevel. The bevel is continued past the trailing edge as a straight wall
so that the last C- line lands past it, which in supersonic flow changes
nothing ahead of the trailing edge.

**How the two parts meet, fixed now.**

- _The rear corner's state._ The step's wall state at x = 1 - b: the
  uniform state behind the front corner's fan if no C- line of the step
  has landed ahead of it; otherwise nu interpolated linearly in x between
  the two wall points of the step that bracket it, with theta = 0, the
  wall's K and psi = 0.
- _The trace._ From the rear corner the C+ characteristic is followed
  from one C- line of the step to the next. Each crossing is where a
  straight step from the last crossing, along the direction theta + mu
  averaged between its two ends (iterated as the unit processes are),
  meets the straight segment between the two points of that C- line that
  bracket it; at the crossing nu, theta and psi are interpolated linearly
  in the fraction along that segment, and K is taken from K(psi). Below
  the C- line from P the trace lies in uniform flow: it is straight, with
  that flow's state.
- _The data points_ lie b / N apart in arc length along the traced
  characteristic, from the corner; at each, the position, nu, theta and
  psi are interpolated linearly in arc length between the two crossings
  that bracket it, and K is taken from K(psi).
- _Why linear._ It is second order, as the rest of the method, and it
  cannot overshoot at the kinks where the reflected wave trains begin and
  end. It is not changed later.
- _How far the step is computed._ The rear region's march continues until
  one of its C- lines lands on the bevel's continuation past the trailing
  edge, and whenever the trace needs a C- line of the step not yet
  computed, the step's march is continued: the step is computed as far as
  the rear region needs, on demand. Marching the step only until its own
  wall points pass x = 1 would not do: the hexagon's C- line through the
  trailing edge is steeper than the step's and starts higher on the rear
  corner's C+ characteristic.

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
check the implementation; T2 also checks section 2.1's bound. The four
(theta, M) pairs below are (8 deg, 1.6), (12 deg, 2.2), (15 deg, 3.0)
and (14 deg, 1.6), the last next to the attachment limit (Mach 1.023
behind the shock).

T1 and T2 test bookkeeping, the corner states, the quadrature's geometry
and where the first reflected characteristic lands, not accuracy: in
Prandtl-Meyer form nu -+ theta is conserved to round-off whatever else is
wrong, and T1's flat carries no drag. Accuracy is tested by T3 to T5, by
the convergence of 9.5 and by the check of 9.7.

- **T1.** A wedge over 0.1 of the chord followed by a flat to a square
  trailing edge (section 8's section), at the four pairs, by the step
  part of the method: at every level its drag equals the front wedge's
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
  256 at most a sixth of its value at N = 32 (first order gives an
  eighth), or below 1e-10 at every N, at the four pairs. At 14 deg and
  Mach 1.6 R is -0.143, negative and about ten times larger than at any
  node beside it (`docs/research/refusals/out/w9-plateau.out`). This
  checks the shock point against the relations it is built from, not
  against other physics.
- **T4. The rotational terms.** The rear region's solver with the
  corner's turn set to zero (a flat wall throughout), started from data
  on a C+ characteristic of a parallel shear flow: p = 1 and theta = 0
  everywhere, the total enthalpy of the free stream at Mach 2 (the free
  stream's p and rho 1), and ln K rising linearly with psi from 0 at the
  wall to 0.044 at the top of the data (the largest ln K behind the
  straight shock at the family's nodes, `w9-plateau.out`). The data line
  runs from the wall to a height of 0.1, with b = 0.1 (its data points
  0.1 / N apart in arc length), its shape, states and psi from the shear
  flow by quadratures to 1e-12, and K(psi) is the given function. That
  flow is an exact steady solution, which the method keeps only to its
  discretisation error, since C is averaged. Pass: the
  largest |p - 1|, the largest |theta| and the mass balance (|psi| at the
  wall over the psi at the top of the data) each decrease at each
  doubling of N from 32 to 256, and at N = 256 are at most a ninth of
  their values at N = 64 (an order of 1.58 or more), or are below 1e-11
  at every N. Each of four planted errors must fail it: the entropy term
  left out; its sign flipped; K looked up at the wrong psi (psi measured
  from the top of the data instead of from the wall); and each new point
  given the K of the point before it on its C- line instead of K(psi).
  Why this matters: ln K behind the straight shock runs from 0.0006 to
  0.044 over the family's nodes, and a C- line leaving the shock after it
  has weakened by 3 deg crosses a change of ln K of about 0.009 at 15 deg
  and Mach 1.8 to 2.0, which the entropy term turns into 0.42 to 0.47 deg
  of nu, about 2.2% of the pressure (`w9-plateau.out`): several times the
  effect being measured (9.4). T1 and T2 cannot see that term.
- **T5. Positions.** The landing on the flat of the C- line from P,
  against its exact place: across the front corner's fan that line
  satisfies d(ln r) / d(phi) = -cot(2 mu) about the corner, phi the polar
  angle of the ray and mu that ray's Mach angle (known on each ray from
  the Prandtl-Meyer relation), then runs straight at the uniform flow's
  Mach angle down to the flat; a one-dimensional quadrature across the
  fan, to 1e-12, gives the landing. At the four pairs, with a bevel of 0.1
  of the chord, the method's landing must approach it at second order:
  the error decreasing at each doubling of N from 32 to 256, and at N =
  256 at most a twelfth of its value at N = 64 (an order of 1.79 or more).
  With it, a unit test of the rear bevel's quadrature: a planted pressure
  linear in x at irregular wall points, the last beyond the trailing edge,
  must give the exact integral over the bevel's rise, the last interval
  cut at the trailing edge, within 1e-14 relative.

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

**Near-sonic corners (the coordinator's ruling of 2026-10-30).** No cell
with a corner whose Mach number behind the straight leading-edge shock
is below 1.1 is served: 11 deg at Mach 1.5 (1.055), 13 deg at Mach 1.6
(1.094) and 14 deg at Mach 1.6 (1.023). These three (theta, M) pairs are
computed all the same, at every b, and reported, but they serve nothing.
The reasons: near the sonic limit R turns negative, and large at 14 deg
and Mach 1.6 (-0.044, -0.005 and -0.143 at the straight shock at those
three; -0.004 at 10 deg and Mach 1.5; positive at the other nodes beside
them, `w9-plateau.out`);
the net is most delicate where the flow behind the shock is nearly
sonic; and their large-b cells hold no population case (its bevels reach
0.150 of the chord).

**Nodes the library calls exact today.** A computed node whose hexagon
`exactSectionDrag` calls exact (its bevel at or beyond the shortest exact
bevel at its (theta, M), tabled in `w9-family.out`) must give |eps| <=
1e-12 at every level. The library serves those hexagons as exact now: a
violation stops the runs and is recorded as a finding against section
2.1's bound, for the owner.

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
0.49 is refused; so 0.4525 reaches past it at every node but that one,
which the ruling above excludes. Of the 762, 698 lie in cells whose
eight corners all have an attached shock with supersonic flow behind it;
the other 64 lie in cells next to the attachment limit (11 to 15 deg at
Mach 1.50 to 1.70, Mach 1.01 to 1.17 behind the shock). The ruling takes
58 more out (Mach 1.08 to 1.23 behind the shock, none a sole blocker),
leaving 640, which bounds from above what this registration can serve.
All 38 sole blockers lie among the 640, and 83 of the 86 cases where the
reflected wave is the only reason left with the nose assumed served.
Below Mach 1.5 (49 hexagons) the fins' own-drag band refuses the total
anyway (0014 section 10.7 (f)), and the family does not go there.

**The size to expect** (`docs/research/refusals/scripts/w9_plateau.py`,
`out/w9-plateau.out`, written with this registration on the functions of
A2's review script `flat_state.py`). Carrying the flat's fully developed
change (`flat_state.py`'s first reflections, integrated over the whole
front fan) whole onto the rear bevel gives |eps| at most 0.25% at the
family's nodes (15 deg, Mach 1.7), a median of 0.05%, and 0.01% to
0.16% between the tenth and ninetieth percentiles, its sign turning from
positive to negative between Mach 2.4 and 2.6. It is an estimate of
scale, not a bound: it takes the change as fully developed at the rear
corner and neglects the later reflections and the waves that cross the
rear fan. So the margin of 9.6 (5e-4, then rounding outward to 1e-3) is
comparable to the effect itself, and the served band will often span
zero.

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
  log2(d_128 / d_256) lies in 0.8 to 3.0, and |d_256| <= 1e-4;

and, in both, |d_64| >= |d_128| >= |d_256| (unless all three are below
1e-12, which is round-off, as at the hexagons the library calls exact).
The order from d_32, d_64 and d_128 is recorded beside the one used.

Its value is eps_256 and its uncertainty U = 2 |d_256| + 1e-6. For an
order of 0.8 or more the error left at N = 256, as Richardson's
extrapolation estimates it, is at most 1.35 |d_256|, which U covers. The
expected order is 2; the window starts at 0.8 because the heads and tails
of the reflected wave trains are weak discontinuities (kinks in the
flow's derivatives), which can lower the observed order where they cross
a net.

### 9.6 The rule: values, bands and failures

**Served cells.** A cell is a candidate when its eight corner nodes are
computed, pass 9.5 and have a Mach number of 1.1 or more behind the
straight shock (9.4's ruling); it is served when, in addition, no check
point in it fails 9.5 (below). A node that fails removes the cells it
bounds; it is recorded with its reason.

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
cannot show between them; the check points test it. The band is a
computed band, of convergence and interpolation: it says how well the
method's solution is resolved and how far eps can move between a cell's
corners, within the inviscid two-dimensional problem. No independent
check reaches its width: the captured Euler check of 9.7 confirms the
method only to a few tenths of a percent of cd. What the section method
does not represent otherwise (viscous effects, the product with the
linear 3D ratio, section 6) stays under the fins' own-drag band as now.

**Check points**, held out: computed only after every node has run and
the candidate cells are fixed. (i) Every hexagon of the population that
the reflected-wave rule refuses at Mach 1.5 and above and that lies in a
candidate cell (at most 640). (ii) 200 points, each in a candidate cell
drawn at random with equal weight among the candidate cells (in the
order of their theta, b and M indices), placed uniformly in theta, ln b
and M within it (mulberry32 with seed 20261030; for each point the cell,
then theta, ln b and M, in that order). (iii) The centre, in theta, ln b
and M, of every candidate cell (at most 1,012: 92 cells in theta and M
can be candidates, times 11 in b). Each is computed at the five levels
and judged against its cell's eps_lo to eps_hi, computed from the
corners, whether or not another check point removes the cell.

**Failure.** Two kinds of failure of a check point are kept apart. One
that passes 9.5 but whose eps - U to eps + U does not lie within its
cell's eps_lo to eps_hi refuses everything. One that fails 9.5 removes
its cell from the served cells and is counted; if more than 2% of all
check points fail 9.5, nothing is served. If any check of 9.7 fails, or
T1 to T5 cannot be passed, nothing is served either. When nothing is
served the hexagons stay refused as now, the failure is recorded with
every number, and the owner rules. No criterion, margin, grid, case or
check point changes after a result is seen. A defect found in the code
after the runs start is fixed, recorded in a dated note with what it
changed, and every run of 9.5 to 9.7 is repeated from the start with the
fixed code.

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
  3: if they converge monotonically ((D_2 - D_1)(D_3 - D_2) > 0), it
  must also hold that |D_3 - D_2| < |D_2 - D_1|, and the method's drag,
  cd_SE (1 + eps), must lie between D_3 and
  D_3 + (D_3 - D_2) / (sqrt(2) - 1), the Euler's drag extrapolated at
  any order of 0.5 or more; otherwise it must lie within
  D_3 +- 2.5 |D_3 - D_2|; in either case the interval is widened at each
  end by cd_SE U. On section 2.4's drags of E1 the differences shrink
  (0.72% then 0.45% of the shock-expansion value) and that interval runs
  from 0.53% below to 0.57% above the shock-expansion value: this
  criterion catches only an error of the method larger than the Euler's
  own uncertainty.
- **(E-b) The wall pressure where the reflected waves act**, in two
  windows taken apart: the flat window, the wall faces whose centres lie
  on the flat from the library's first-reflection bound x_1 (section
  2.1) to 0.2 b ahead of the rear corner; and the bevel window, those on
  the rear bevel from 0.2 b behind its corner to 0.2 b ahead of the
  trailing edge. In each window, e_k is the root mean square, weighted by
  face length, of the Euler's wall pressure at level k minus the
  method's at N = 256 (interpolated linearly at the face's centre), over
  the free stream's pressure, and s_k is the same against
  shock-expansion's pressure (constant on each face). In each window it
  must hold that e_3 < e_2 and e_3 <= s_3 / 2: the Euler moves toward
  the method's pressures where the reflected waves change them, and at
  its finest grid lies at least twice as close to them as to the
  pressures with the reflections neglected. Both windows must pass. The
  four numbers (e_k and s_k in each window) are recorded at every level,
  0 to 3. The Euler's own error in these windows on a hexagon is not
  measured anywhere; it is read from e_2 against e_3.

The check passes when both hold in all three cases.

### 9.8 What may be served, and what stays refused

Only if 9.3 and 9.5 to 9.7 pass, `src/fins` serves the hexagons that lie
in served cells, as 9.6 says; hexagons the library calls exact today are
unchanged, and so is `neglectReflectedWaves`. Everything else the
reflected-wave rule refuses stays refused as now, the words saying why:
unequal bevels; a half-angle outside 5 to 15 deg; a bevel outside 0.01 to
0.4525 of the chord; a Mach number outside 1.5 to 3.0; a cell with a
corner where the shock is detached, the flow behind it subsonic or below
Mach 1.1 (9.4's ruling), or where the method failed; a cell removed by a
check point (9.6); double wedges (none of the population's at Mach
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
  and the quadrature error, and says that band is computed, of
  convergence and interpolation, and that the independent Euler check
  confirms the method to a few tenths of a percent of the section drag,
  not to the band's width. The total's claim and word do not change: an
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
run, dated. The most it can add (`w9-family.out`, with 9.4's ruling):
38 totals (235 to 273 of 8,000), and 83 with the nose assumed served
(622 to 705), if every cell that holds one of those cases is served.

### 9.11 Order and records

1. The method and T1 to T5, passed and committed; every line of every
   run below records the commit it ran on.
2. The nodes, each at its five levels, one solve at a time,
   single-threaded, at normal priority:
   `docs/research/fin-wave-drag/w9/nodes.jsonl`, one line per node as it
   finishes; a restarted run skips the nodes already recorded. A node the
   library calls exact with |eps| above 1e-12 at any level stops the
   runs (9.4).
3. E1 to E3 at levels 0 to 3, one solve at a time: `w9/euler.jsonl`, one
   line per level as it finishes, the wall pressures beside it;
   resumable the same way.
4. The candidate cells from `nodes.jsonl` by 9.6, then the check points
   (i) to (iii): `w9/checks.jsonl`, resumable.
5. The verdict by 9.5 to 9.7, recorded below this registration with every
   failure. If it passes: the code of 9.8 to 9.10, its tests with planted
   errors, and the population run; then the reviews.

### 9.12 Notes, dated

**2026-10-30: the code written and its checks run; the family not run;
two points put to the owner.** The method is
`src/validation/planar-characteristics.ts`, its checks
`tests/validation/planar-characteristics.test.ts` (on
`tests/support/planar-characteristics-checks.ts`), their numbers
`docs/research/fin-wave-drag/w9/code-checks.out` (commit 2cacc90). No
node, check point or Euler case of 9.4 to 9.7 has been run.

- _A defect found and fixed while writing the code._ The first form of
  the step's net started its march from the line from P with only the
  fan's rays and that line's landing on the flat. The C+ characteristics
  leaving the flat between the front corner and the landing, in the
  uniform flow, were not in the net, so a strip of it of fixed width never
  refined as N grew, against 9.2's "every spacing of the net scales as 1
  / N". It showed, in a scratch run of that first form, as a mass balance
  that stopped falling (1.65e-4, 1.63e-4 and 1.63e-4 at N = 64, 128 and
  256 on a bevel of 0.01 at 5 deg and Mach 3). Fixed by putting N - 1
  points of the uniform flow, equally
  spaced, on the line from P between the fan's tail ray and the flat;
  the mass balance then falls at about order 2 (6.1e-5, 1.4e-5, 3.6e-6).
  The registered method is unchanged; the code now does what 9.2 says.
- _The checks._ T1 holds within 4.6e-15 and T2 within 3.3e-14 at every
  level. T4 holds as written (|p - 1| 6.3e-10, 1.6e-10, 4.0e-11 and
  9.95e-12 at N = 32 to 256, |theta| and the mass balance at order 2 as
  well), and each of its four planted errors fails it. T5 holds at the
  four pairs (the landing's error at N = 256 between 1.4e-8 and 7.5e-6),
  falling at order 2 at three of them and approaching it at the fourth,
  (14 deg, 1.6), where it falls by 2.45, 3.0, 3.5 and 3.8 per doubling,
  meeting the registered twelfth but not yet at order 2 (corrected after
  the quick look below, which found "falling at order 2" said of all
  four); the bevel's quadrature holds within 2.3e-16. T3
  holds at (8 deg, 1.6), (12 deg, 2.2) and (15 deg, 3.0), and does not at
  (14 deg, 1.6): |R_N - R| is 9.66e-2, 7.41e-2, 5.12e-2, 3.20e-2 and
  1.84e-2 at N = 16 to 256, falling at every doubling, but at N = 256 a
  quarter of its value at N = 32 against the sixth registered. Taken
  further for this note (outside the registered levels), it is 9.95e-3,
  5.20e-3, 2.66e-3, 1.34e-3 and 6.76e-4 at N = 512 to 8192, falling by
  0.54, 0.52, 0.51, 0.51 and 0.50 per doubling: R_N approaches R =
  -0.1434 at first order, from about N = 512. Behind a shock at Mach
  1.023 the fan's first step (14 deg over 256) moves the Mach number by
  about a quarter of its distance from 1, so the first reflection is not
  yet in its asymptotic range at the registered levels. No defect of the
  code was found. By 9.3 and 9.6 the runs do not start while a check
  fails; the owner rules. (The node at 14 deg and Mach 1.6 serves nothing
  under 9.4's ruling, but T3 tests the code there, as registered.) The
  committed test marks that one case as an expected failure, so that the
  suite stays usable and the failure stays visible.
- _A weakness of the registered interpolation, found while testing the
  code._ Along the rear corner's C+ characteristic nu has a kink where it
  crosses the streamline through P, since K(psi) has one there.
  Interpolated linearly in nu across a cell of the step that straddles
  that streamline, with K taken from K(psi), the data near the wall get a
  nu that belongs to another entropy. On short bevels the step's cells
  near the rear corner are larger than the bevel (about 0.03 of the chord
  at N = 256, against a bevel of 0.01), and eps then moves by up to about
  7% of itself between levels before it settles (this said 5% until the
  quick look below), so that such nodes would
  fail 9.5 (`w9/interpolation.out`: 12 deg, b 0.01, Mach 1.6, eps
  1.659e-3, 1.677e-3, 1.760e-3, 1.637e-3, 1.559e-3 at N = 16 to 256 and
  1.559e-3 at 512). Interpolating the pressure instead, which has no kink
  there, with nu then taken from the pressure and K(psi), converges
  smoothly to the same values (1.5575e-3, 1.5583e-3, 1.5585e-3,
  1.5586e-3, 1.5586e-3 and 1.5586e-3). On the six cases compared the two
  agree within 2.2e-9 in eps from N = 64 on in four, and from N = 256 on
  in the two short bevels where nu jumps: once a crossing lies between
  the rear region and the kink they coincide. 9.2 fixed nu and
  said it would not be changed later; whether to interpolate the pressure
  instead before the runs is put to the owner. Nothing else in the method
  would change.

**2026-10-30, later: the coordinator's rulings on those two points,
made after the code-check numbers above were seen; still before any run
of the family.** The registered text above is not reworded; these rulings
are added to it.

- _The defect in the step's net_ (the missing C+ characteristics from
  the stretch of flat before the first landing, which held the mass
  balance near 1.6e-4) is recorded as a defect found and fixed before
  any run of the family, as the first item of this note says.
- _T3 at 14 deg and Mach 1.6 is recorded as failed at the registered
  levels._ The threshold of a sixth is not loosened. The sequence found
  beyond them (|R_N - R| 9.95e-3, 5.20e-3, 2.66e-3, 1.34e-3 and 6.76e-4
  at N = 512 to 8192) and the explanation (Mach 1.023 behind the shock;
  the fan's first step at N = 256 moves the Mach number by about a quarter
  of its distance from 1) are recorded as found. The failure stays on
  record as a finding about convergence near the sonic limit. It is
  consistent with 9.4's exclusion of cells with a corner below Mach 1.1
  behind the shock, which was ruled before it.
- _One re-test, T3R, registered here before it runs_ (as the precedent of
  V1b: one re-test, registered after a failure and before it runs). T3R
  is T3 at 11 deg and Mach 1.5, the other node below Mach 1.1 behind the
  shock (1.055), whose first reflection has not been computed, at N = 16,
  32, 64, ..., 8192 (ten levels). It passes if |R_N - R| decreases at
  every doubling from N = 64 on, and each of the last three doublings
  (1024 to 2048, 2048 to 4096, 4096 to 8192) reduces it by a factor of
  at least 1.7 (first order gives 2). It is run only after this note is
  pushed.
- _The gate for running the family_ is now: T1, T2, T4 with its four
  planted errors, T5 and the bevel quadrature pass; T3 passes at its
  three pairs inside the served family, (8 deg, 1.6), (12 deg, 2.2) and
  (15 deg, 3.0); and T3R passes. If T3R fails, nothing is served: that is
  recorded and the work stops.
- _The trace's interpolation is switched_ from nu to the pressure and
  theta (with psi), K taken from K(psi) and nu derived from the pressure
  and K. The reason is physical: the pressure and theta are continuous
  across the streamline through P, where the entropy history has a kink,
  and nu is not. It was decided after the comparison on six cases above
  (`w9/interpolation.out`). The rear corner's wall state is unchanged
  (nu linear in x between the step's wall points): along the wall the
  entropy is constant, so there is no kink there.
- _nu kept as a diagnostic._ Every node is also run with nu interpolated,
  beside the registered run, which now interpolates the pressure. Where
  both converge by 9.5 they must agree within the larger of their two U;
  any disagreement beyond that stops the runs for a report. A node is
  judged, and serves, by the registered run alone.

**2026-10-30, later: T3R run, after the note above was pushed (eb39a49);
the code then switched to the pressure (e09cf7e).** T3R passes
(`w9/code-checks.out`, commit e09cf7e): R = -0.0436 at 11 deg and Mach
1.5; |R_N - R| is 2.05e-2, 1.32e-2, 7.74e-3, 4.23e-3, 2.22e-3, 1.14e-3,
5.77e-4, 2.90e-4, 1.46e-4 and 7.29e-5 at N = 16 to 8192, falling at every
doubling, by 1.987, 1.993 and 1.997 over the last three. The checks rerun
on that commit give the same numbers as before for T1, T4 with its four
planted errors, T5, the quadrature and T3, and for T2 values that differ
only in round-off (all within 3.3e-14, as before), so the gate as ruled
passes. The family has not been run: it waits for the quick look of this
note.

**2026-10-30, after Fable's quick look of 43b8ab3..78e953b (PASS: the
family may run), before any run of the family.** Two statements above
are corrected in place, each saying so: eps on short bevels with nu
interpolated moves by up to about 7% of itself between levels, not 5%
(1.760e-3 to 1.637e-3 is 7.0%; 2.433e-3 to 2.295e-3 at 15 deg, b 0.01,
Mach 1.7, is 5.7%); and T5 converges at order 2 at three pairs and only
approaches it at (14 deg, 1.6). Recorded besides:

- _The nu diagnostic is a partial safeguard._ It can check a node only
  where its nu run converges by 9.5. Where the nu run fails 9.5 (on short
  bevels, by the comparison above, it may well), the node is judged by
  its pressure run with no second run to check it.
- _Two diagnostics adopted, with no gate:_ R_N at 10 deg and Mach 1.5,
  the served corner with the lowest Mach number behind the shock (1.114),
  is recorded over the five levels beside the node runs
  (`w9/diagnostic-r.out`); and every line of `w9/nodes.jsonl` records
  whether the node's nu run converged by 9.5 and, where both converged,
  whether the two agreed within the larger of their U, so that the
  safeguard's coverage is on record when the results are judged.

**2026-10-30, later: the runs and the verdict, as registered. The Euler
check fails, so nothing is served; the refusal stands as it was.** The
nodes ran on commit 023abba (`w9/nodes.jsonl`, `w9/diagnostic-r.out`);
the Euler solves (`w9/euler.jsonl`, the wall faces in `w9/euler-walls/`),
the method at E1 to E3 (`w9/ecases.jsonl`) and the check points
(`w9/checks.jsonl`) on 98d9011, which differs from 023abba only in the
records and in runners outside `src`. The verdict is generated from those
records by `w9/judge.test.ts` into `w9/verdict.out`, with every failure
listed there. Nothing stopped the runs: the 447 nodes the library calls
exact gave |eps| at most 1e-12 at every level, and the nu diagnostic
agreed within the larger U at all 1,278 nodes where both runs converged
(at 114 the nu run did not converge; at 105 of those the pressure run
passes, with no second run to check it).

- _The nodes (9.5)._ 1,383 of 1,392 pass, 1,381 by (a) and 2 by (b);
  eps over them runs from -0.305% to +0.310%, U at most 3.6e-6. Nine
  fail. Five fail because the changes from N = 64 to 256 do not shrink,
  each change below 7e-8 (6 deg, b 0.113, Mach 1.5; 7 deg, b 0.08,
  Mach 2.0; 8 deg, b 0.08, Mach 2.4 and 2.8; 12 deg, b 0.16, Mach 1.8).
  Four fail because a shock point did not converge at N = 256 (12 deg,
  b 0.0141, Mach 1.6; 14 deg, b 0.0141, 0.0283 and 0.0566, Mach 2.4).
  Each removes its cells, as registered. R_N at 10 deg and Mach 1.5 (no
  gate) approaches R at about first order, |R_N - R| 1.85e-3 at N = 16
  to 1.61e-4 at N = 256.
- _Cells and check points (9.6)._ 950 candidate cells; 1,727 check
  points: 577 of the population's refused hexagons, 200 drawn at random
  and the 950 centres. Nine fail 9.5 (0.52%, under the 2% cap), seven
  because a shock point did not converge at N = 128 or 256 and two
  because the changes do not shrink; each removes its cell. None that
  converged lies outside its cell's band; the closest comes within
  5.5e-4 of eps of an edge. The bands are 0.2% to 0.4% of the
  shock-expansion value wide. 941 cells would have been served had the
  Euler check passed.
- _The Euler check (9.7) fails, on (E-b), in all three cases._ All
  twelve Euler solves met both stopping tests below the cap, and the
  method passes 9.5 at E1 to E3, with eps +0.022%, +0.131% and +0.043%.
  (E-a) passes in all three: the drags at levels 1 to 3 converge
  monotonically with shrinking differences, and the intervals, 0.53%
  below to 0.57% above, 0.46% below to 0.81% above, and 1.48% below to
  0.32% above the shock-expansion value, hold the method's drag. (E-b)
  passes in one window of six, E2's flat (e_3 1.20e-4 against s_3
  2.12e-3). On every bevel window e_3 is above s_3 (E1 4.46e-3 against
  4.16e-3, E2 2.75e-3 against 1.10e-3, E3 2.83e-2 against 2.73e-2), and
  on E1's and E3's flats e_3 is above s_3 / 2 (2.66e-4 against 2.66e-4,
  and 2.62e-3 against 3.02e-3). By 9.7 and 9.8 nothing is served:
  `src/fins`, the page's words and 0017's rows are unchanged, and
  `served-cells.json` is not written.

What the failure says, read after the results (these readings change
nothing above and set nothing):

- _E1's flat window holds no reflected wave by the method._ It starts at
  the library's bound x_1 = 0.698, but the method's flat pressure first
  changes between x = 0.8275 and 0.8342, past the window's end at 0.82.
  There the method's pressure is shock-expansion's (they differ by
  2e-15), e_k equals s_k at every level, and e_3 <= s_3 / 2 could not
  hold whatever the Euler gave. This is a flaw of the registration, seen
  only now: the window should have started where the method's first
  reflection lands, not at the library's bound.
- _Elsewhere the Euler's own error at level 3 is larger than what it
  was to resolve._ The root mean square of the method's pressure minus
  shock-expansion's is 4.0e-4 of the free stream's pressure on E1's
  bevel, 2.25e-3 on E2's, 6.55e-4 on E3's flat and 1.09e-3 on E3's bevel;
  the Euler's wall pressure moved between levels 2 and 3 by 4.8e-3,
  6.2e-3, 1.5e-3 and 2.0e-2 there (root mean squares too). On E3's bevel, 0.2 b behind the
  corner, the level-3 Euler stands about 19% above both (0.333 against
  0.280 and 0.281), and falls along the window toward them, as if the
  rear corner's expansion were smeared into it.
  On E3's flat it falls from 1.0159 to 1.0077 of the free stream's
  pressure across the window, away from the method (1.0111 to 1.0135)
  and from shock-expansion (1.0132). On E2's flat, where the Euler moved
  by only 1.75e-4 between levels 2 and 3, it lies 18 times closer to the
  method than to shock-expansion.
- _So, at the registered resolution, the check confirms the method's
  flat pressures in E2 and neither confirms nor refutes it elsewhere._
  On E2's bevel the level-3 Euler lies closer to shock-expansion than to
  the method, but the Euler's change from level 2 to 3 there is nearly
  three times the gap between the two, so this does not show the method
  wrong.
- _The shock point's iteration failed_ at four nodes and seven check
  points, at 11.5 to 14.4 deg and N = 128 or 256. That is a weakness of
  the code, recorded as found and not changed: after the results nothing
  in the method or the criteria changes without a ruling.
