# 0007: Transonic forebody drag, Mach 1 to 1.2

- **Status:** Prototype on the CPU engine (`src/analysis/transonic-flow.ts`,
  `src/grid/transonic-grid.ts`, the far-field boundary and the implicit
  steps of `src/engine-cpu/euler2d.ts`), measured below; not on the drag
  page, and not on the GPU engine.
- **Date:** 2026-10-18
- **Inputs:** [0002](0002-architecture.md) section 11 (the range to serve
  is Mach 1 to 3), the measurements below, and the references in
  [docs/validation/sources.md](../validation/sources.md).

## Why the supersonic solvers stop near Mach 1.2

The fitted-shock solver (0006) starts just behind a sharp tip with the
tip's conical flow and ends one caliber past the nose, where the flow must
leave supersonically. Below about Mach 1.2 each of its assumptions fails
in turn, on the noses rockets carry:

- the tip's conical flow turns subsonic at the surface, or its axial
  component does (the fitted solver's tests, `sharpFitProblem`: a 15 deg
  cone and a 3-caliber tangent ogive's 18.9 deg tip are refused at Mach
  1.2, a 5-caliber ogive's 11.4 deg tip at Mach 1.15, the 7 deg cone at
  Mach 1.06), so the shoulder reaches the tip through the subsonic
  layer and Taylor-Maccoll is no longer the flow there;
- the bow shock detaches (the 3-caliber ogive below Mach 1.15) and stands
  ahead of the tip, further as the Mach number falls; at Mach 1 it is at
  infinity, so it cannot be the grid's boundary;
- the flow over the body is partly subsonic, so what lies behind the nose
  reaches it, and the outflow is not supersonic.

## What the drag is

As in the supersonic solvers: the pressure drag coefficient of the body
ahead of the end of the body asked for, on its cross-section,
C = 2 / (q R^2) sum over the wall faces of (p - p_inf) n_x A (forces.ts).
A cylinder's wall is parallel to the axis and adds nothing, so this is the
nose's pressure drag with the body continuing behind it. In the supersonic
solvers that continuation is irrelevant where the flow leaves the end of
the body supersonically, since nothing behind can reach the nose; that is
where they serve a case (`baseMach`). Below Mach 1.2 it is not irrelevant,
and the body is continued by a long cylinder of its own diameter, as a
wind-tunnel sting continues a model: inviscid flow cannot represent the
separated flow behind a base, which the total-drag work will model
separately. The transonic result is therefore the nose's wave drag on a
semi-infinite cylinder: independent of the length of the cylinder asked
for, and the same quantity as the supersonic one wherever both apply (at
Mach 1.2 for slender noses, measured below). The cylinder solved behind
the nose is finite, and its length is a measured error, as is the far
boundaries' distance.

## The domain and the grid (`src/grid/transonic-grid.ts`)

One structured block, an H grid as for the captured-shock sharp noses
(0004): lines of constant i vertical near the body, jMin the axis ahead
of the tip and the body behind it, the tip and the shoulder on grid lines.
Unlike there, every other side is a far boundary: iMin a plane upstream,
jMax a line at a constant radius, iMax a plane ending the cylinder
downstream. The far radius and the upstream distance are equal, set by
`farField` (in body radii, rounded up to a whole number of base cells),
and the cylinder solved behind the nose by `cylinder` (in calibers).

- **Spacing** (`TRANSONIC_SPACING`, in body radii, on the base grid):
  cells 0.05 high at the wall, each next one e^0.2 = 1.22 times higher, so
  that 30 cells reach 100 radii and each doubling of the domain costs
  about 3.5 more (19 of the 30 lie within 10 radii of the body). Along
  the axis the columns are 0.05 apart at the tip and 0.02 at the
  shoulder, grow by e^0.1 per column along the nose up to 0.2 apart, and
  by e^0.2 per column upstream of the tip and along the cylinder. A
  refined grid divides every base cell into 2 x 2, 4 x 4, ... cells, so a
  family nests (tested to 1e-9), and the near-body grid is the same
  whatever the far boundaries' distance.
- **Leaning lines.** With vertical lines all the way out, the columns,
  dense along the body, made the cells far above it up to 350 times
  taller than wide; each line now leans, by f^2 of the way out (f the
  fraction of its height), to a point spaced evenly along the far
  boundary, while near the body (f small) the lines stay vertical and the
  wall cells keep corners of 83 deg or more (on the 7 deg cone). The
  aspect ratio is still large in three places (base grid of the 7 deg
  cone, 100 radii): next to the axis far upstream (330, where the columns
  are 20 radii wide and the flow is close to the free stream), above the
  shoulder at about 14 radii (67, where the columns are clustered for the
  shoulder and the cells 2 to 3 radii high) and along the end of the
  cylinder (65). The aspect-ratio gate of the near-body grids (10) is not
  applied to these grids; their accuracy is measured instead.
- **Where the grid's error comes from**, measured on the base grid of a
  7 deg cone at Mach 1.05 (drag 0.1065105 with the spacings above), each
  spacing changed alone (change of the drag coefficient): the column
  spacing at the shoulder (0.05 instead of 0.02: -1.82e-4, all of it from
  the last tenth of the cone; 0.01: +6.9e-5), the growth away from the
  body (0.15 instead of 0.2: +2.16e-4) and the wall spacing (0.03:
  -1.32e-4) matter; the column spacing at the tip (0.02: +2e-7) and along
  the nose (0.1: +1.0e-5) do not. The tip's pressure overshoot spreads
  over the first few columns, where the cone is thinner than a wall cell,
  so the wall spacing, not the columns', sets it. The errors are of both
  signs, so the base grid's value benefits from cancellation that finer
  grids lose; the families below show it.

## Far-field boundaries

`farField` (`farFieldState` in `src/engine-cpu/euler2d.ts`): the state
outside each face from the one-dimensional characteristics normal to it,
the Riemann invariants u_n +- 2 a / (gamma - 1), the entropy and the
tangential velocity, each taken from the cell inside where its speed
(u_n - a, u_n + a, u_n of the inside state) points out of the domain and
from the free stream where it points in. It fills the ghost cells, and
the face flux is the HLLC flux between the reconstructed inside state and
it. A supersonic inflow gets the free stream exactly, a supersonic
outflow the inside state, and a free stream inside gives the free stream
back to round-off (tested on a distorted grid at Mach 0.8, 1 and 1.5).
Unlike the fixed free stream that the captured-shock grids impose on
their outer boundary, which is right only where the bow shock stays
inside it, this lets the bow shock and the disturbances of a subsonic
region leave the domain; it is still exact only at infinite distance, so
the error of the far boundaries' distance is measured. The GPU engine
refuses the kind for now.

## The shock captured, not fitted

At Mach 1 the bow shock is at infinity; between Mach 1 and the attached
limit it stands ahead of the tip at a distance that grows without bound as
the Mach number falls, and near Mach 1 it is too weak to matter for its
own sake (a normal shock at Mach 1.05 loses 1e-4 of the total pressure).
Fitting it would need a grid whose outer boundary follows a shock that
leaves every finite domain as Mach 1 is approached, and a second
treatment for Mach 1 itself. So the bow shock is captured, with the
shocks that end the supersonic regions behind the shoulder, and the
far boundaries are characteristic. The cost is the accuracy of capturing,
whose error is first order behind a shock whose strength varies (0004,
0006); it is measured below on nested grids. At Mach 1.2, where the
fitted solver serves the same bodies, the two are compared.

## Solving to a steady state

The explicit steps of the engine (SSPRK2, local time steps, CFL 0.8)
converge, but slowly on these grids: on the base grid of the 7 deg cone
at Mach 1.05 (3180 cells) the drag still moved by 4e-4 per 500 steps
after 4000 steps, and the residual fell by 0.65 per 500 steps, 11,500
steps (224 s) reaching 2.7e-8. Three things were added, none of which
changes the steady state, only the path to it (each is tested to reach
the explicit scheme's drag within 1e-12 on a Mach 2 cone,
`tests/engine-cpu/implicit.test.ts`):

- **Implicit steps** (`Euler2D.iterateImplicit`): the LU-SGS scheme of
  S. Yoon and A. Jameson (AIAA J. 26, 1988): the implicit Euler step
  with the residual of the configured second-order scheme and the
  Jacobian of a first-order flux with scalar dissipation (the spectral
  radius |u_n| + a times omega = 1.5), solved by one forward and one
  backward sweep without forming a matrix, at CFL numbers ramped from 1
  to 1000. In axisymmetric geometry the cells next to the axis need one
  more term: their faces' areas do not close, and the self-coupling the
  scalar diagonal leaves out (the pressure source's Jacobian less half
  the radial flux's) is as large as the rest there. Without it the axis
  cells upstream of the tip diverged at CFL 100; with A_p (|v| + a)
  added to their diagonal every CFL number tried (up to 1000) is stable.
  With omega = 1 the same cells diverged on the final grids. Each cell's
  change is halved until its density and pressure stay within a factor
  of two, which acts only in the first steps.
- **Anderson acceleration** (`src/solver/anderson.ts`; D. G. Anderson
  1965, in the form of H. F. Walker and P. Ni 2011) of the LU-SGS
  fixed-point iteration, from its last 8 corrections: on a linear
  iteration it is GMRES on the residuals. On the base grid of the cone
  at Mach 1.05 the plain steps converge at 0.9972 per step late in the
  iteration (the slow mode lies above the shoulder and in the far field
  above the cylinder, where the flow is near sonic: 93% of the change of
  density between two late iterates, weighted by volume, is there), the
  accelerated ones about twice as fast (residual 1e-7 after 2000 steps
  against 1.7e-6).
- **Each grid starts from the coarser one's converged state** (each cell
  taking the state of the coarse cell it lies in), and stops when the
  drag has settled (`SettlingValue`, noise 1e-7 of the value: the change
  over a check and what the measured rate of convergence predicts for the
  steps not taken both below 1e-7 of the drag, on two checks running;
  checks every 50 steps times the refinement).

What was tried and did not help is listed at the end.

## Measurements

CPU engine, HLLC, unit-invariant shared reconstruction (as the supersonic
solvers), each grid converged to a drag settled within 1e-7 of its value.
Wall times are of one job on a 4-core machine shared with other long
runs: until 14:53 UTC with the cores oversubscribed two to three times,
after it with a core to itself (about three times faster); they are given
as measured, as a guide to cost only.

Bodies, in body radii R = 1: the cone of NACA TN 4233 (6 deg 59 min,
nose length 8.169) and a 5-caliber tangent ogive (nose length 10, tip
11.4 deg), each followed by the solved cylinder; far boundaries at 100.6
radii and 10 calibers of cylinder unless stated. Refinement r = 1, 2, 4,
8 has 30 r cells across and 118 r (cone) columns.

### Mach 1.2: against Taylor-Maccoll and the fitted solver

At Mach 1.2 the 7 deg cone's conical surface flow is supersonic (Mach
1.137), so the shoulder cannot reach the cone and the drag of the
cone-cylinder is exactly the cone's Taylor-Maccoll pressure coefficient,
0.0830113.

| r | Cells   | Drag      | vs Taylor-Maccoll | Steps | Wall time |
| - | ------- | --------- | ----------------- | ----- | --------- |
| 1 | 3,540   | 0.0832184 | +2.49e-3          | 700   | 11 s      |
| 2 | 14,160  | 0.0830547 | +5.23e-4          | 700   | 48 s      |
| 4 | 56,640  | 0.0830206 | +1.12e-4          | 1,400 | 500 s     |
| 8 | 226,560 | 0.0830132 | +2.3e-5           | 2,800 | 3,500 s   |

(errors relative). The changes fall by 4.80 and 4.62 (observed orders
2.26 and 2.21, agreeing within the procedure's 0.5); extrapolated at
second order the drag is 0.0830108, 6e-6 of its value below the exact
one, and the procedure's band on the finest grid (before any allowance),
3.1e-6 (3.7e-5 of the value), contains the finest grid's error (1.9e-6).
With the shock captured and the far boundaries characteristic, the
transonic domain does here what the fitted solver does for supersonic
cones.

The fitted solver (0006, CPU, nj = 20, 40, 80, with 2 calibers of
cylinder) on the same cone: 0.0831060, 0.0830076, 0.0830154 (+1.14e-3,
-4.4e-5, +4.9e-5): oscillatory, the band of the three (the range,
9.8e-5) containing its error. The two solvers' finest values agree within
2.2e-6 (2.7e-5 of the value), inside both bands.

### Mach 1.1: against Taylor-Maccoll; the fitted solver struggles

At Mach 1.1 the cone's conical surface flow is still supersonic (Mach
1.037, axial 1.029), so its drag is again exactly Taylor-Maccoll's,
0.0944976, and the fitted solver accepts the case.

| r | Cells  | Drag      | vs Taylor-Maccoll | Steps | Wall time |
| - | ------ | --------- | ----------------- | ----- | --------- |
| 1 | 3,540  | 0.0944683 | -3.10e-4          | 950   | 17 s      |
| 2 | 14,160 | 0.0944644 | -3.51e-4          | 1,600 | 120 s     |
| 4 | 56,640 | 0.0944821 | -1.64e-4          | 3,200 | 1,163 s   |

The changes (-3.9e-6, +1.77e-5) change sign: oscillatory, all three
within 3.5e-4 of the exact value. (r = 8: see below.)

The fitted solver on the same cone: 0.0938653 (nj = 20) and 0.0940974
(nj = 40), -6.69e-3 and -4.24e-3 of the exact value, ten to twenty times
the transonic domain's errors, and falling at less than first order
(nj = 80: see below). Near the sonic limit of its starting plane (axial
Mach number 1.029 at the tip cone's surface) its error is far larger
than on the supersonic families of 0006.

### Mach 1.0: the far boundaries' distance dominates

At Mach 1 the bow shock is at infinity and the subsonic region ahead of
the sonic line from the shoulder reaches the far boundaries, so their
distance changes the cone's pressure everywhere (by a nearly uniform
amount, as a change of the free-stream Mach number would; within a finite
domain a sonic surface stands upstream, at 57 radii on the 100-radius
domain). Base grid, 10 calibers of cylinder, plain LU-SGS steps:

| Far radius | Cells across | Drag      | Change    | Steps  | Wall time |
| ---------- | ------------ | --------- | --------- | ------ | --------- |
| 55.1       | 27           | 0.0898342 |           | 12,750 | 89 s      |
| 100.6      | 30           | 0.0917153 | +1.881e-3 | 17,850 | 192 s     |
| 224.2      | 34           | 0.0927916 | +1.076e-3 | 32,250 | 268 s     |
| 408.7      | 37           | 0.0930989 | +3.07e-4  | 46,700 | 654 s     |

A power law C(D) = C_inf - k D^-q through each three successive radii
gives q = 1.23 and 1.35 and C_inf = 0.093434 and 0.093346 (within 8.8e-5
of each other): the drag on 100.6 radii is about 1.7e-3 (1.8% of it)
below its value for boundaries at infinity, and on 408.7 radii 2.5e-4 to
3.4e-4. At 800 radii the implicit steps went unstable (the residual rose
from 1e-5 to 2 between steps 5,000 and 8,000, with cells 160 radii
across at the far boundaries) and the case was dropped. The cylinder's
length matters far less: 40 calibers instead of 10 changes the drag by
+1.28e-5 (0.0917281, 100.6 radii).

## References and how close the solver gets

(to be completed)

## What accuracy the evidence supports

(to be completed)

## What did not work

Measured on the 7 deg cone at Mach 1.05 (and 1.0 where stated), base
grid unless stated:

- **Explicit steps alone**: see above; on the finest grids they would
  need weeks of CPU time.
- **LU-SGS with omega = 1**, or without the axis term: the cells next to
  the axis upstream of the tip diverged (residual from 4e-4 to 4e-2 at
  CFL 100 without the term; to 1.5 with omega = 1).
- **Block LU-SGS with Steger-Warming split Jacobians**
  (`Euler2D.iterateBlockImplicit`, kept for later work): on the Mach 2
  cone of the tests it converges to 4e-13 in 80 steps. Here the flat
  cells next to the axis far upstream (aspect ratios near 300), whose
  entropy and shear waves get almost no damping from the small faces
  along the axis, diverged whether the pressure source's Jacobian was in
  the diagonal block or not; with A_p (|v| + a) added the residual
  oscillated near 0.5; with a quarter of the scalar dissipation added as
  well it is stable but converges at 0.996 per step against the scalar
  scheme's 0.9972, at 1.8 times the cost of a step. No gain.
- **Multigrid** (`src/solver/multigrid.ts`, FAS with LU-SGS smoothing on
  the family's own coarser grids): with piecewise-constant prolongation of
  the corrections it made convergence worse; with bilinear prolongation
  and V(1,2) cycles it converges at 0.989 per cycle on two levels (r = 2
  over r = 1), no faster per unit of work than single-grid steps. The
  slow mode is as slow on the base grid, the coarsest the family has, so
  the coarse level cannot remove it.
- **Anderson acceleration at Mach 1**: the accelerated iteration wandered
  (the drag between 0.0897 and 0.0954 over 20,000 steps, the residual
  stuck near 2e-5) where plain LU-SGS steps converged in 17,850 steps to
  0.0917153; the accelerated result, settled later on a longer cylinder,
  agreed with it within 1.4e-5. Mach 1 runs use plain steps.
- **Two earlier grids**: vertical lines all the way out (cells up to 350
  times taller than wide above the body) and a wall spacing growing
  upstream along the axis (each line's own stretching, which skewed the
  far cells: neighbours 7.5 times different in width).
- **The 3-caliber ogive data of NASA TN D-3516** were not digitised (see
  sources.md), so the ogive has no wind-tunnel comparison here.

## Open

(to be completed)
