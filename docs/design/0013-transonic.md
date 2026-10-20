# 0013: Transonic forebody drag, Mach 1 to 1.2

- **Status:** Prototype on the CPU engine (`src/analysis/transonic-flow.ts`,
  `src/grid/transonic-grid.ts` with H grids for sharp noses and C grids
  for blunt ones, the far-field boundary and the implicit steps of
  `src/engine-cpu/euler2d.ts`, Anderson acceleration in
  `src/solver/anderson.ts`), measured below; not on the drag page, and
  not on the GPU engine.
- **Date:** 2026-10-18 and 19
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
- **Blunt noses** (ellipsoids and other noses leaving the axis
  vertically and meeting the cylinder tangentially) get a C grid on the
  same spacings and far boundaries: jMin the body from the stagnation
  point to the end of the cylinder (columns by arc length, 0.05 at the
  stagnation point), iMin the axis ahead of it, jMax one far boundary (a
  quarter circle of the far radius about the stagnation point, then the
  line at the far radius) and iMax the plane ending the cylinder. Each
  line leaves its body point P along the body normal and bends towards
  its point Q on the far boundary, the points spaced evenly along it:
  node = P + d (f (1 - f) n + f^2 u), d = |Q - P|, u = (Q - P) / d. With
  the exact normals the lines fan out from the nose and stay parallel
  along the cylinder, and the cells at the shoulder jumped in width by
  4.7 times (hemisphere); at a distance h from the wall n is therefore
  the normal averaged over the body within 0.25 h of the line's foot (as
  the supersonic blunt grids, 0004), the window closing smoothly towards
  the end of the body so the last line stays vertical. Measured on
  ellipsoids of 1:1 to 3:1 (tested): wall cells at 85 deg or more, corners
  at 51 deg or more, neighbours within 1.92 in size on the hemisphere and
  1.43 on the others, the largest jumps in the far field above the start
  of the cylinder; the families nest. These are the bodies the
  supersonic C grid serves poorly near Mach 1.2: its lines end on the bow
  shock, 7 to 10 radii out there, and turn vertical over the last cells
  at the end of a short cylinder (found in the supersonic work); measured
  here, its size-ratio gate (`bluntBodyGrid`, nj = 20) refuses the
  hemisphere with 2 calibers of cylinder below Mach 1.4 (1.72 at Mach
  1.2, limit 1.3) and the 2:1 ellipsoid with 2 calibers below 1.5, and
  accepts the 2:1 ellipsoid with 4 calibers at 1.2. Their base can also be
  subsonic there. On the transonic C grid the body continues to the
  sting's end and the lines need not turn.

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
  checks every 50 steps times the refinement), or, for the runs from
  2026-10-19 on, once the drag's remaining change estimated
  geometrically from its last three values is below 1e-9 of it on two
  checks running (the rule allowed for the reference fits; the test that
  stopped and the estimate are recorded). A run saves its state every 10
  minutes and resumes from it after a restart.

What was tried and did not help is listed at the end.

## Measurements

CPU engine, HLLC, unit-invariant shared reconstruction (as the supersonic
solvers), each grid converged to a drag settled within 1e-7 of its value.
Wall times are of one job on a 4-core machine shared with other long
runs, the cores oversubscribed one to three times; they are given as
measured, as a guide to cost only, and CPU times (of the job's process)
where they were recorded.

Bodies, in body radii R = 1: the cone of NACA TN 4233 (6 deg 59 min,
nose length 8.169), a 5-caliber tangent ogive (nose length 10, tip 11.4
deg), a hemisphere and a 2:1 ellipsoid (nose lengths 1 and 2), each
followed by the solved cylinder; far boundaries at 100.6 radii and 10
calibers of cylinder unless stated. Refinement r = 1, 2, 4, 8 has 30 r
cells across and 118 r columns (cone; ogive 127 r, hemisphere 53 r, 2:1
ellipsoid 59 r).

### Mach 1.2: against Taylor-Maccoll and the fitted solver

At Mach 1.2 the 7 deg cone's conical surface flow is supersonic (Mach
1.137), so the shoulder cannot reach the cone and the drag of the
cone-cylinder is exactly the cone's Taylor-Maccoll pressure coefficient,
0.0830113.

| r   | Cells   | Drag      | vs Taylor-Maccoll | Steps | Wall time |
| --- | ------- | --------- | ----------------- | ----- | --------- |
| 1   | 3,540   | 0.0832184 | +2.49e-3          | 700   | 11 s      |
| 2   | 14,160  | 0.0830547 | +5.23e-4          | 700   | 48 s      |
| 4   | 56,640  | 0.0830206 | +1.12e-4          | 1,400 | 500 s     |
| 8   | 226,560 | 0.0830132 | +2.3e-5           | 2,800 | 3,500 s   |

(errors relative). The changes fall by 4.80 and 4.62 (observed orders
2.26 and 2.21, agreeing within the procedure's 0.5); extrapolated at
second order the drag is 0.0830108, 6e-6 of its value below the exact
one, and the procedure's band on the finest grid (before any allowance),
3.1e-6 (3.7e-5 of the value), contains the finest grid's error (1.9e-6).
With the shock captured and the far boundaries characteristic, the
transonic domain does here what the fitted solver does for supersonic
cones.

The fitted solver (0006, CPU, nj = 20, 40, 80, with 1 caliber of
cylinder) on the same cone: 0.0831060, 0.0830076, 0.0830154 (+1.14e-3,
-4.4e-5, +4.9e-5): oscillatory, the band of the three (the range,
9.8e-5) containing its error. The two solvers' finest values agree within
2.2e-6 (2.7e-5 of the value), inside both bands.

### Mach 1.1: against Taylor-Maccoll; the fitted solver struggles

At Mach 1.1 the cone's conical surface flow is still supersonic (Mach
1.037, axial 1.029), so its drag is again exactly Taylor-Maccoll's,
0.0944976, and the fitted solver accepts the case.

| r   | Cells   | Drag      | vs Taylor-Maccoll | Steps | Time           |
| --- | ------- | --------- | ----------------- | ----- | -------------- |
| 1   | 3,540   | 0.0944683 | -3.10e-4          | 950   | 17 s           |
| 2   | 14,160  | 0.0944644 | -3.51e-4          | 1,600 | 120 s          |
| 4   | 56,640  | 0.0944821 | -1.64e-4          | 3,200 | 1,163 s        |
| 8   | 226,560 | 0.0944913 | -6.7e-5           | 5,600 | 4,110 s of CPU |

The changes (-3.9e-6, +1.77e-5, +9.1e-6) change sign at the first step
and then fall at first order (0.95 on the finest triple, extrapolated
0.0945010, 3.6e-5 of the value above the exact one). The procedure
(`gridConvergence`, four grids) returns no band here: its coarser
triple oscillates ("unresolved"). So at Mach 1.1 the four grids are
within 3.5e-4 of the exact value and r = 8 within 6.7e-5, but the
procedure as it stands refuses the case; a band would need a fifth grid
(r = 16, 900,000 cells), so that both triples are the monotone ones.

The fitted solver on the same cone: 0.0938653 (nj = 20) and 0.0940974
(nj = 40), -6.69e-3 and -4.24e-3 of the exact value, ten to twenty times
the transonic domain's errors, and falling at less than first order
(nj = 80: see below). Near the sonic limit of its starting plane (axial
Mach number 1.029 at the tip cone's surface) its error is far larger
than on the supersonic families of 0006.

### Mach 1.05: first order, from the level of the whole cone's pressure

At Mach 1.05 the cone's conical flow would be subsonic at the surface
(Taylor-Maccoll's surface Mach number is 0.998 already at 1.064), the
shoulder reaches the whole cone, and there is no exact solution; the
fitted solver refuses the case.

| r   | Cells  | Drag      | Change    | Steps  | Wall time |
| --- | ------ | --------- | --------- | ------ | --------- |
| 1   | 3,540  | 0.1065105 |           | 5,050  | 81 s      |
| 2   | 14,160 | 0.1068662 | +3.557e-4 | 8,300  | 735 s     |
| 4   | 56,640 | 0.1070376 | +1.714e-4 | 14,200 | 4,309 s   |

The changes fall by 2.08: observed order 1.05, first order. Extrapolated
at that order the drag is 0.107197 (at order 1, 0.107209), 1.6e-4 (1.5e-3
of the value) above the finest grid; the procedure needs a fourth grid to
confirm the order before it gives a band (r = 8: see Open). The change
from r = 2 to 4 is not local: integrated along the cone it is a nearly
uniform rise of the pressure coefficient by 1.6e-4 to 2.1e-4 from x / l =
0.2 to 0.99 (1.73e-4 of the 1.71e-4 change), with -2.9e-5 from the tip's
first 20% and +2.3e-5 from the last 1% before the shoulder. A uniform
shift is what a change in the flow's global, subsonic adjustment does
(as the far boundaries' distance does at Mach 1, below). The subsonic
region lies between the bow shock, captured far ahead where the cells
are large, and the sonic line from the shoulder; behind the shoulder the
flow expands to Mach 1.31 and decelerates without a shock to 1.05 along
the cylinder (r = 2). First order is consistent with the captured bow
shock setting the level, though this was not isolated.

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

The grid, on 100.6 radii: r = 1, 2, 4 give 0.0917153, 0.0916001 and
0.0915486 (17,850, 51,700 and 89,200 plain steps; 1,475 s of CPU on r =
2, 6,000 s on r = 4 up to its checkpoint at 83,200). r = 4 had not
settled when a container restart stopped it: the drag was in a damped
oscillation (period 22,600 steps, decay time 25,400 steps, amplitude 6.7e-6
at the end), and its converged value is the oscillation's centre fitted
to the history from step 50,000, 0.0915486 (the fit's rms misfit 3e-8;
from step 30,000 the same centre to 1e-9). The same fit on r = 2's
history up to step 30,000 only gave 0.0915982 against the settled
0.0916001, within 1.9e-6, with a misfit 400 times larger. The changes
(-1.152e-4, -5.15e-5) fall by 2.24: observed order 1.16, first order as
at Mach 1.05. Extrapolated at that order the drag on 100.6 radii is
0.091507 (0.091497 at order 1), 4e-5 to 5e-5 below r = 4; three grids
give no band from the procedure. With the far boundaries' correction
(+1.63e-3 to +1.72e-3 for boundaries at infinity, below), the drag at
Mach 1 is 0.09314 to 0.09323: **0.0932 within about 1e-4 (0.1%)**. On
the 100.6-radius domain alone, without the correction, the error is
1.8%.

The correction holds on the finer grid. On 408.7 radii r = 2 ran to its
limit of 120,000 steps (4,940 s of CPU) without the settling test
passing: the drag oscillates slowly (a period of about 30,000 steps)
with a falling amplitude, 0.092990 within 1.5e-6 over the last 18,000
steps (residual 2.9e-9). From 100.6 to 408.7 radii the drag rises by
1.3899e-3 on r = 2 against 1.3836e-3 on r = 1: the far boundaries'
effect is the same on both grids within 6e-6, 0.5% of itself, so the
correction measured on the base grid applies to r = 2. (The Mach 1 runs
all converge this way, in damped oscillations: the settled values on
100.6 radii lie within about 1e-6 of the oscillation's centre.)

### Far boundaries and cylinder length at every Mach number

Base grid of the 7 deg cone, drag on far boundaries at 55.1, 100.6 and
224.2 radii (10 calibers of cylinder) and on 5, 10 and 20 calibers of
cylinder (100.6 radii):

| Mach | 55.1      | 100.6     | 224.2     | 5 cal     | 10 cal    | 20 cal              |
| ---- | --------- | --------- | --------- | --------- | --------- | ------------------- |
| 1.2  | 0.0832146 | 0.0832184 | 0.0832239 | 0.0832174 | 0.0832184 | 0.0832215           |
| 1.1  | 0.0944590 | 0.0944683 | 0.0944881 | 0.0944648 | 0.0944683 | 0.0944797           |
| 1.05 | 0.1064669 | 0.1065105 | 0.1065235 | 0.1065138 | 0.1065105 | 0.1065171           |
| 1.0  | 0.0898342 | 0.0917153 | 0.0927916 |           | 0.0917153 | (40 cal: 0.0917281) |

At Mach 1.2 and 1.1 the cone's drag is physically independent of both
(its surface flow is supersonic, so it is Taylor-Maccoll's whatever lies
behind or around), and the changes measured there, 6e-6 at Mach 1.2 and
up to 2e-5 at Mach 1.1, are the grid's: the grids differ with the
domain (the far boundary's share of the stretching changes the first
rows by a few percent, and the leaning lines move), on base grids whose
own error is 2.5e-3 and 3.1e-4. They are the noise floor of this test.
At Mach 1.05 the far boundaries matter above it from 55 to 100 radii
(+4.4e-5) and at it beyond (+1.3e-5 from 100.6 to 224.2), so on 100.6
radii the domain error is no more than about 2e-5 (2e-4 of the value),
not separable from the noise; the cylinder's length is within the noise
(changes of -3e-6 and +7e-6). At Mach 1 the far boundaries dominate
everything (above).

### The 5-caliber ogive at Mach 1.2: against characteristics and the fitted solver

The tangent ogive's 11.4 deg tip has supersonic conical flow at Mach 1.2
(the fitted solver accepts it; it refuses it at 1.15), and the flow over
it stays supersonic, so the method of characteristics
(`src/validation/characteristics.ts`, tested on ogives down to Mach 1.5)
gives the inviscid drag: 0.0433392, 0.0433372, 0.0433367 and 0.0433365 on
160, 320, 640 and 1280 intervals, and 0.0433367 and 0.0433366 with its
starting line at 5e-4 and 2e-3 of the nose length instead of 1e-3 (640
intervals): 0.0433365, converged to about 2e-7.

| r   | Cells   | Drag      | vs characteristics | Steps  | CPU time |
| --- | ------- | --------- | ------------------ | ------ | -------- |
| 1   | 3,810   | 0.0437833 | +1.03e-2           | 750    | 9 s      |
| 2   | 15,240  | 0.0433724 | +8.3e-4            | 1,300  | 64 s     |
| 4   | 60,960  | 0.0433244 | -2.8e-4            | 2,200  | 480 s    |
| 8   | 243,840 | 0.0433268 | -2.2e-4            | 13,600 | 9,390 s  |

The changes (-4.11e-4, -4.80e-5, +2.32e-6) change sign at the last
step: oscillatory, the procedure's band the largest of the last changes,
4.8e-5 (1.1e-3 of the value), which contains the finest grid's error
(9.7e-6). The finest grid lies 2.2e-4 of the value below the reference.
(r = 8 took 13,600 steps because the settling test, after a transient
whose changes grew before they fell, waited with a rate near 1 while the
drag stayed fixed to 1e-12 for 8,000 steps; the driver now also stops on
the geometric estimate, see "Solving to a steady state".)

The fitted solver on the same ogive (1 caliber of cylinder): 0.0439700,
0.0434608 and 0.0433612 on nj = 20, 40 and 80 (+1.46e-2, +2.87e-3 and
+5.7e-4 of the reference; 12,826 iterations and 2,481 s of CPU on nj =
80), changes falling by 5.1 (order 2.35), extrapolated at second order
0.0433280, 2.0e-4 below the reference. The transonic r = 8 and the
fitted nj = 80 differ by 3.4e-5 (7.9e-4 of the value); the transonic r =
8 and the fitted extrapolation by 1.2e-6 (3e-5), and both lie about 2e-4
of the value below the characteristics' value. Either that reference is
high by about 2e-4 at this Mach number (its tests reach down to Mach 1.5
only), or both families still carry about that much; the evidence does
not separate the two. At the meeting point the solvers agree on the
ogive to 3e-5 (transonic finest against fitted extrapolation) to 8e-4
(finest grids).

### Blunt noses: against the fitted solver and the pitot pressure

The C grid above, same far boundaries (100.6 radii) and 10 calibers of
cylinder. Two references: the supersonic fitted solver (0006, CPU,
`bluntFittedFlow`) where its grid accepts the body, the 2:1 ellipsoid at
Mach 1.2 with 4 calibers of cylinder and the hemisphere at Mach 1.5 with
2; and the total pressure on the stagnation streamline, which must be the
normal shock's (the pitot pressure at the stagnation point).

| Body, Mach         | r = 1     | r = 2     | r = 4     | Extrapolated | Fitted nj = 20 | nj = 40   | nj = 80   |
| ------------------ | --------- | --------- | --------- | ------------ | -------------- | --------- | --------- |
| 2:1 ellipsoid, 1.2 | 0.3482049 | 0.3433539 | 0.3425969 | 0.3423446    | 0.3472957      | 0.3437625 | 0.3429002 |
| hemisphere, 1.5    | 0.6994860 | 0.6885561 | 0.6863477 | 0.6856117    | 0.6904222      | 0.6872292 |           |
| hemisphere, 1.2    | 0.5546180 | 0.5431759 | 0.5404303 | 0.5395151    | refused        |           |           |

(transonic extrapolated at second order from r = 2 and 4; observed orders
2.68, 2.31 and 2.06). The transonic families converge at about second
order from above, as the fitted ones do (on the ellipsoid at order 2.03,
nj = 80 stopped with the drag settled, its remaining iterative change
estimated at 2.8e-10, and the outflow supersonic, axial Mach number 1.14
or more). Extrapolated at second order the fitted families give 0.3426128
(ellipsoid, from nj = 40 and 80) and 0.6861649 (hemisphere, from nj = 20
and 40): 2.7e-4 (7.8e-4 of the value) and 5.5e-4 (8.1e-4) above the
transonic extrapolations, while the finest grids differ by 3.0e-4
(8.8e-4) on the ellipsoid. The two solvers thus agree on blunt noses to
about 8e-4 of the value, the transonic domain's value the lower, and on
the ellipsoid the gap between the extrapolations does not close from the
finest grids to the extrapolations; its cause is not known (the
stagnation line below would push the transonic drag up, not down). The
drags of r = 4 lie 2.5e-4 and 7.4e-4 above the transonic extrapolations
(7e-4 and 1.1e-3 of the value), and 9.2e-4 (1.7e-3) on the hemisphere at
Mach 1.2.

The stagnation streamline: total pressure of the cells along the axis
behind the bow shock, over the free stream's, against the normal shock's
(0.99280 at Mach 1.2, 0.92979 at 1.5), on r = 1, 2, 4. Hemisphere at Mach
1.5: 0.94610, 0.93195, 0.92856 (losses 5.39%, 6.81%, 7.14% against
7.02%). At Mach 1.2, hemisphere: 0.99506, 0.99531, 0.99524 (losses 0.49%,
0.47%, 0.48% against 0.72%); 2:1 ellipsoid: 0.99226, 0.99502, 0.99542
(0.77%, 0.50%, 0.46%): not converging to the normal shock's loss. At
Mach 1, with no shock, the axis cells keep the free stream's total
pressure within 5e-4 (hemisphere, r = 1). The pressure on the first wall
face is no measure of this: the wall's Riemann flux adds the cell's
inflow into the wall, 0.23% above the total pressure at Mach 1 (r = 1).

**The cause, measured: the captured shock's pointwise error.** Along the
bow shock (shock radius below 1.5), the total pressure two cells behind
the captured shock against the exact oblique-shock value for the local
angle of a smooth fit of the shock (x = a + b r^2 + c r^4):

| Body, Mach         | Grid | Mean (weighted by r) | rms   | Range           | Axis   |
| ------------------ | ---- | -------------------- | ----- | --------------- | ------ |
| hemisphere, 1.2    | 1    | +0.41%               | 0.36% | +0.17 to +0.55% | +0.19% |
| hemisphere, 1.2    | 2    | +0.17%               | 0.28% | -0.22 to +0.39% | +0.23% |
| hemisphere, 1.2    | 4    | +0.05%               | 0.19% | -0.30 to +0.44% | +0.24% |
| 2:1 ellipsoid, 1.2 | 1    | +0.36%               | 0.34% | +0.07 to +0.52% | +0.33% |
| 2:1 ellipsoid, 1.2 | 2    | +0.14%               | 0.26% | -0.20 to +0.43% | +0.32% |
| 2:1 ellipsoid, 1.2 | 4    | +0.03%               | 0.17% | -0.24 to +0.39% | +0.28% |
| hemisphere, 1.5    | 1    | -0.13%               | 1.11% | -1.35 to +1.53% | +1.53% |
| hemisphere, 1.5    | 2    | -0.27%               | 0.61% | -1.12 to +1.38% | +0.17% |
| hemisphere, 1.5    | 4    | -0.16%               | 0.56% | -1.24 to +1.28% | -0.17% |

The average along the shock converges (at Mach 1.2 by 2.4 to 4.1 per
halving of the cells); the pointwise error does not: its range stays
+-0.3 to 0.4% at Mach 1.2 and +-1.2 to 1.4% at 1.5 on every grid, and it
correlates (coefficients +0.14 to +0.47) with where the shock lies within
its cell. The axis is one sample of it. At Mach 1.2 the shock near the
axis runs along a row of cells over several lines and the sample sits
near +0.25% on every grid; at Mach 1.5 it happened to fall near zero on
r = 2 and 4, which looked like convergence and is not. So the stagnation
line's total pressure carries the captured shock's pointwise error, of
the size of that scatter on every grid, not a discretization error that
refinement removes; only a shock fitted (or aligned with the cells) on
the axis would remove it.

**The 2:1 ellipsoid's gap to the fitted solver, localized.** The drag
accumulated from the stagnation point, C(r^2) = sum of Cp times the
faces' change of r^2, extrapolated pointwise at second order from r = 2
and 4 (transonic) and nj = 40 and 80 (fitted; their sums reproduce the
drags exactly): transonic minus fitted is +1.9e-4 by r^2 = 0.05 to 0.1,
back to +1e-5 to +4e-5 by r^2 = 0.3 to 0.5, then falls to -2.3e-4 by r^2
= 0.8 and ends at -2.7e-4. Pointwise, the extrapolated wall pressure
coefficients differ by +0.0063 at x = 0.002 and +0.0038 at x = 0.02 (the
stagnation region: the axis's +0.28% total-pressure error predicts
+0.006), and by -0.0004 to -0.0010 everywhere from x = 0.1 to 1.4, in
the subsonic part ahead of the sonic point (x about 0.55) and in the
supersonic part behind it alike: a nearly uniform deficit of 0.04% to
0.07% of the local pressure over the rest of the nose. Its cause is not
found. Measured and excluded: the far boundaries (r = 1 drag on 55,
100.6, 224 and 408.7 radii within 2.1e-5), the cylinder (4 and 10
calibers extrapolate to 0.3423540 and 0.3423446, and behind the shoulder
the flow is supersonic everywhere), and the mean total pressure just
behind the shock (+0.03% on r = 4 below a shock radius of 1.5, which
would raise the pressure). Along the shock layer the total pressure
carries the captured shock's scatter (0.9926 to 0.9971 of the free
stream's across the layer at x = 0.1 on r = 4), and the wall cells lose
total pressure along the body at first order (0.25% by x = 1 on r = 4,
0.55% on r = 2); either could set a level of this size, neither was
isolated. Using the observed order (2.68) instead of 2 for the transonic
extrapolation moves it by +1.1e-4, so the gap is 1.5e-4 to 2.7e-4, of
the size of the families' own remaining change; r = 8 is queued.

### The ogive and the hemisphere from Mach 1.1 to 1

No reference below Mach 1.2 for these; drag on r = 1 and 2 (100.6
radii, 10 calibers) and, at Mach 1, on 408.7 radii:

| Body       | Mach | r = 1     | r = 2     | Change    | 408.7 radii, r = 1 |
| ---------- | ---- | --------- | --------- | --------- | ------------------ |
| ogive      | 1.2  | 0.0437833 | 0.0433724 | -4.11e-4  |                    |
| ogive      | 1.1  | 0.0435202 | 0.0433484 | -1.72e-4  |                    |
| ogive      | 1.05 | 0.0418288 | 0.0417434 | -8.5e-5   |                    |
| ogive      | 1.0  | 0.0171707 |           |           | 0.0186725          |
| hemisphere | 1.2  | 0.5546180 | 0.5431759 | -1.144e-2 |                    |
| hemisphere | 1.1  | 0.4704390 | 0.4610574 | -9.38e-3  |                    |
| hemisphere | 1.05 | 0.4181985 | 0.4092866 | -8.91e-3  |                    |
| hemisphere | 1.0  | 0.3595713 |           |           | 0.3594575          |

The base grid's error, judged from the change to r = 2, falls with the
Mach number on the ogive (from 9.4e-3 of the value at 1.2 to 2.0e-3 at
1.05) and stays near 2% on the hemisphere, whose families converge at
about second order where measured (Mach 1.2 and 1.5, above). At Mach 1
the far boundaries' distance acts on the ogive as on the cone, by about
the same amount (+1.50e-3 from 100.6 to 408.7 radii, against the cone's
+1.38e-3), which is 8.7% of the ogive's much smaller drag; on the
hemisphere it is -1.1e-4, 3e-4 of its drag. With the ogive on a third
distance (0.0182824 on 224.2 radii), the power law gives q = 1.06 and,
for boundaries at infinity, 0.019109 (with the cone's q = 1.35 instead,
0.018985): on 100.6 radii the ogive's drag is about 10% low, on 408.7
radii 1.7% to 2.3% low, and on the base grid its Mach 1 drag is 0.0190
within about 0.7%; its grid error at Mach 1 is not measured (r = 2: see
Open).

### Near Mach 1: the slope of the drag

On 408.7 radii (base grid) the cone's drag is 0.0930989, 0.1049432 and
0.1097163 at Mach 1, 1.01 and 1.02 (on 100.6 radii: 0.0917153, 0.1026103,
0.1098008; at Mach 1.01 the far boundaries' distance moves the drag by
+2.3e-3, more than at Mach 1, and at 1.02 by -8e-5). The secant slope
from Mach 1 to 1.01 is 1.18 per unit Mach number, the one-sided
three-point estimate at Mach 1 1.54 (1.49 with Mach 1 corrected to
boundaries at infinity). Slender-body theory gives dCD/dM = 4 / (gamma +

1. - 2 tau^2 = 1.64 at Mach 1 (Spreiter and Alksne's eq. 80); the drag
     curve bends over within a few hundredths of Mach 1 (its maximum, at
     least 0.1097, lies between Mach 1.01 and 1.05), so differences over 0.01
     underestimate the
     slope at Mach 1, and the three-point estimate lies within 6 to 9% of
     the theory.

### Mach 1 without the extrapolation: what would serve it

What the far boundary does at Mach 1, measured on the cone (base grid):

- **Near the body it shifts the pressure level.** From 224.2 to 408.7
  radii the pressure coefficient of the cells between 5 and 80 radii from
  the axis rises by +0.0006 to +0.0007 on average, rms 0.0008: a nearly
  uniform shift, as the drag's change suggested.
- **The far field decays slowly.** On 408.7 radii, the pressure
  coefficient on the line above the shoulder is 0.0178, 0.0150, 0.0120,
  0.0091 and 0.0060 at 6, 19, 34, 62 and 112 radii: local decay exponents
  0.39 to 0.47 between 19 and 62 radii. A free-stream condition at a
  distance D is wrong by a perturbation of that order, and the drag's
  error falls as D^-1.06 (ogive) to D^-1.35 (cone).

Three routes, with what the evidence says about each:

- **A far-field condition carrying the sonic far field** (as transonic
  small-disturbance codes do). In that theory the far field at Mach 1 is
  a similarity solution, potential r^n F(x / r^m) with n = 3m - 2 from the
  equation's scaling (derived here); m is fixed by what the body sheds:
  2/3 for a drag-carrying far field (perturbation velocity ~ r^-2/3), 1/2
  for the mass displaced by the sting (~ r^-1), and the closed-body
  eigen-solution of R. Barish and K. G. Guderley (1953, not read; see
  sources.md) otherwise. Against it, so far: the decay measured between
  19 and 62 radii (exponents 0.39 to 0.47) is slower than any of these,
  and the computed field between 5 and 40 radii does not collapse onto
  r^(n - m) F(x / r^m) for any m from 0.4 to 1 (binned scatter 0.51 to
  0.61 of the rms, no minimum), so the asymptotic regime is not reached
  within 40 radii and such a condition would have to sit beyond about 100
  radii, in a form to be verified against the sources first. Not tried.
- **A larger domain**, where the measured power law makes the error
  small (about 5e-5 at 1,600 radii) at little cost in cells (3.5 more
  across per doubling) but more steps (17,850, 32,250 and 46,700 on 100.6,
  224.2 and 408.7 radii). Blocked at present: on 800 radii the implicit
  steps diverge after about 5,000 steps. Measured: it is not the CFL
  number (100 and 1000 diverge at the same step, the drag at 0.0935
  rising), nor the far-field boundary's sharp switch where the normal
  velocity is sonic (blending it smoothly over 5% of the sound speed,
  `docs/design/patches/0013-farfield-blend.diff`, changes nothing). The
  growing change lies in the cells next to the axis upstream of the tip
  and along the cone's first radius (Mach 0.91 to 0.998, x from -6.6 to
  +0.9 radii), cells 0.05 radii high whose columns, far upstream on this
  domain, grow to 160 radii long. Their length alone is not the cause:
  with the upstream columns capped at 20 radii (more, shorter cells
  there) the steps diverged sooner, after about 2,000. Making the
  near-sonic axis cells hold in the implicit steps is the first step of
  this route; how is open.
- **The extrapolation in the distance**, as now, made part of the
  procedure: three domains on each grid, and the test, running, that the
  correction measured on the base grid holds on r = 2 (408.7 radii).

## References and how close the solver gets

**Exact inviscid solutions** test the solver's own error, and are used
above: Taylor-Maccoll for the cone at Mach 1.2 and 1.1, the method of
characteristics (`src/validation/characteristics.ts`) for the ogive at
Mach 1.2. Below Mach 1.1 there is none; the measurements there rest on
grid, domain and cylinder studies.

**NACA TN 4233** (W. A. Page, 1958; sources.md,
`src/validation/cone-cylinder-tn4233.ts`): surface pressures on the same
7 deg cone-cylinder, sting-mounted, in two ventilated tunnels. Where the
inviscid cone pressure is exact (Taylor-Maccoll, indicated Mach 1.078 and
above), the mean of the ten cone orifices ahead of x / l = 0.95 lies
below it by 0.0030 (14-foot tunnel, 1.078), 0.0007 (14-foot, 1.100),
0.0004 (2-foot, 1.100), 0.0017 (2-foot, 1.151) and 0.0028 (2-foot,
1.200), with a scatter along the cone of up to 0.005 (the stated
uncertainty is 0.002). The data therefore test the computed pressures to
about 0.003 to 0.005, 3 to 5% of the cone's pressure coefficient: they
check the model (inviscid flow, the sting in place of the base), not the
solver's numerical error, which the exact solutions and the grid studies
measure far more finely. The orifice at x / l = 0.994, 0.6% of the cone
length ahead of the shoulder, has already fallen into the shoulder's
expansion (below the computed pressure by 0.04 at Mach 1.2, 0.08 at 1.1
and 0.09 to 0.11 at 1.05 and 1), which the boundary
layer carries upstream and inviscid flow cannot (at Mach 1.1 and 1.2 the
cone's flow is supersonic); it is left out.

Computed wall pressure coefficients at the orifices against the data
(measured minus computed; cone: orifices 1 to 10, x / l 0.08 to 0.94;
cylinder: orifices 12 to 15, 0.18 to 1.63 calibers behind the
shoulder):

| Computed (grid)               | Data (tunnel, indicated Mach) | Cone: mean | Cone: largest | Cylinder: largest |
| ----------------------------- | ----------------------------- | ---------- | ------------- | ----------------- |
| Mach 1.2 (r = 4)              | 2-foot, 1.200                 | -0.0028    | 0.0050        | 0.0040            |
| Mach 1.1 (r = 4)              | 14-foot, 1.100                | -0.0007    | 0.0045        | 0.0061            |
| Mach 1.1 (r = 4)              | 2-foot, 1.100                 | -0.0004    | 0.0055        | 0.0081            |
| Mach 1.05 (r = 4)             | 14-foot, 1.050                | -0.0043    | 0.0163        | 0.0139            |
| Mach 1.05 (r = 4)             | 14-foot, 1.041                | -0.0023    | 0.0163        | 0.0064            |
| Mach 1.0 (r = 1, 408.7 radii) | 14-foot, 1.001                | -0.0003    | 0.0122        | 0.0184            |
| Mach 1.0 (r = 1, 408.7 radii) | 14-foot, 1.008                | +0.0100    | 0.0139        | 0.0344            |

At Mach 1.2 and 1.1 the computed pressures, cone and cylinder (the
shoulder's expansion and the recompression behind it), agree with both
tunnels within 0.0045 to 0.0081 at the worst orifice and 0.0004 to
0.0028 on the cone's mean, as closely as the data agree with the exact
cone pressure. At Mach 1.05 and 1 the largest cone differences are at x / l
= 0.89 and 0.94, where the measured pressure falls 0.012 to 0.016 below
the computed one: the shoulder's expansion reaches further upstream in
the tunnel than in inviscid flow, as at 0.994. Ahead of x / l = 0.8 the
computed Mach 1.05 pressures agree with the 14-foot row at indicated
1.041 within 0.003 (and differ from the row at 1.050 by up to 0.008, of
both signs), and
the computed Mach 1 pressures with the row at indicated 1.001 within
0.003 (0.008 to 0.014 below the row at 1.008). Page's appendix finds
wall interference in both tunnels between indicated Mach 0.99 and 1.05
and puts free air at Mach 1 at indicated 1.0066 in the 14-foot tunnel;
the stated Mach uncertainty there is 0.004, and the measured cone
pressure rises by 0.007 to 0.013 between indicated 1.001 and 1.008. So
near Mach 1 the data cannot test the computed pressures to better than
about 0.01 (10%), and within that they agree; whether free-air Mach 1
corresponds to indicated 1.001 or 1.0066 is beyond what they settle.

**Transonic slender-body theory at Mach 1** (J. R. Spreiter and A. Y.
Alksne, NASA TR R-2, 1959; sources.md): for a cone-cylinder of tau =
tan(semiapex angle), here 0.1225, CD = -tau^2 (C + 4 ln tau), with C =
1.08965 from their local linearization (eq. 81: 0.1097), 1.55 from H.
Yoshihara's relaxation solution of the small-disturbance equation
carried over by the similarity rule (eq. 82: 0.1028) and 0.091 after
Miles (eq. 83: 0.1246); their figure 20 shows Page's 14-foot tunnel at
about 0.089 as measured and 0.099 corrected for wall interference (read
from the plot). The computed 0.0932 corresponds to C = 2.19: 9% below
Yoshihara's value, 15% below eq. 81 and 6% below Page's corrected
point. The theories are first order in the slenderness and differ among
themselves by more than that (C from 0.09 to 1.55); the computation lies
outside their spread, below it, and between the measured (0.089) and
corrected (0.099) tunnel values, where eq. 82 lies above both. This is the
weakest comparison of the set: neither the theory nor the corrected
measurement is accurate to better than several percent, so it confirms
the level, not the solver's 0.2%.

## What accuracy the evidence supports

For the nose's pressure (wave) drag with the body continued as a sting,
on the CPU engine:

- **Mach 1.2.** Cone: verified against the exact value, 1.1e-4 of it on
  r = 4 (57,000 cells, 500 s) and 2.3e-5 on r = 8, the procedure's band
  containing the error. Ogive: r = 8 within 2.2e-4 of the method of
  characteristics, the family oscillatory, its band (1.1e-3) containing
  the error, and the fitted solver within 7.9e-4 (finest grids): about
  2e-4 on r = 8 and 3e-4 on r = 4. 2:1 ellipsoid: r = 4 within 7e-4 of its extrapolation,
  which lies 7.8e-4 below the fitted solver's (nj = 20 to 80): about
  1e-3. Hemisphere: second-order convergence but no reference, and the
  stagnation line's open error. Far boundaries and cylinder: below 1e-4. The transonic
  domain and the supersonic fitted solver agree where both apply, within
  2.7e-5 on the cone and 1e-3 on the ogive and the ellipsoid: the two
  definitions meet at Mach 1.2.
- **Mach 1.1.** Cone: four grids within 3.5e-4 of the exact value, r =
  8 within 6.7e-5; the procedure refuses a band (its coarser triple
  oscillates); the fitted solver is 4e-3 to 7e-3 off here. Ogive and hemisphere: r = 1 and 2 only
  (changes of 4e-3 and 2% of the value): not established.
- **Mach 1.05.** Cone: no exact value; first order, r = 4 within about
  1.5e-3 of its extrapolation, far boundaries at most 2e-4, cylinder
  within the noise: about 2e-3 on r = 4, if the first order holds (the
  band needs r = 8). Ogive and hemisphere: r = 1 and 2 only.
- **Mach 1.0.** Cone: 0.0932 within about 0.1%: three grids converging
  at first order (1.16), extrapolated, plus the far boundaries'
  correction (measured on the base grid, holding on r = 2 within 6e-6);
  on 100.6 radii alone 1.8% low, on 408.7 radii about 0.3% low; no band
  from the procedure, which needs a fourth grid (at Mach 1 the steps
  grew 2.9 times from r = 1 to 2 and r = 4 had not settled after 1.7
  times r = 2's, each grid with 4 times the cells). Ogive: on the base grid
  0.0190 within about 0.7% after the same extrapolation (10% low on
  100.6 radii, 2% on 408.7), its grid error not measured. Hemisphere: far
  boundaries 3e-4, grid error not measured at Mach 1. The wind tunnel and
  slender-body theory confirm the cone's level to 5 to 10%, no better.

So the evidence supports the transonic domain at Mach 1.2 to the
supersonic solvers' standard on cones and on the ogive (four grids, the
procedure's band containing the error against exact references), and to
about 1e-3 on blunt noses (three grids each, against the fitted solver).
Below Mach 1.2 the procedure gives no band yet: at Mach 1.1 it refuses
the cone's four grids (the coarser triple oscillates) although r = 8 is
within 6.7e-5 of the exact value; at Mach 1.05 the cone's r = 8 is
running (r = 4 is about 1.5e-3 from its extrapolation); at Mach 1 there
are three grids and the far-boundary extrapolation (0.0932 within about
0.1%). Nothing below Mach 1.2 can be served under the standard yet.

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
- **Multigrid** (FAS with LU-SGS smoothing on the family's own coarser
  grids; removed, kept as `docs/design/patches/0013-fas-multigrid.diff`):
  with piecewise-constant prolongation of the corrections it made
  convergence worse; with bilinear prolongation and V(1,2) cycles it
  converges at 0.989 per cycle on two levels (r = 2 over r = 1), no
  faster per unit of work than single-grid steps. The slow mode is as
  slow on the base grid, the coarsest the family has, so the coarse level
  cannot remove it.
- **Anderson acceleration at Mach 1**: the accelerated iteration wandered
  (the drag between 0.0897 and 0.0954 over 20,000 steps, the residual
  stuck near 2e-5) where plain LU-SGS steps converged in 17,850 steps to
  0.0917153. On 40 calibers of cylinder the accelerated steps did settle,
  after 25,450 steps (492 s) against the plain steps' 14,650 (191 s), at
  0.0917288, within 7e-7 of the plain steps' 0.0917281: the same steady
  state, reached more slowly. Mach 1 runs use plain steps.
- **800 radii at Mach 1**: the implicit steps diverge after about 5,000
  steps with the CFL number capped at 1000 or at 100, and with the
  far-field boundary's characteristic switch blended smoothly
  (`docs/design/patches/0013-farfield-blend.diff`), and sooner (about
  2,000 steps) with the upstream columns capped at 20 radii; the growing
  change lies in the near-sonic cells next to the axis upstream of the
  tip (see "Mach 1 without the extrapolation").
- **Two earlier grids**: vertical lines all the way out (cells up to 350
  times taller than wide above the body) and a wall spacing growing
  upstream along the axis (each line's own stretching, which skewed the
  far cells: neighbours 7.5 times different in width).
- **The 3-caliber ogive data of NASA TN D-3516** were not digitised (see
  sources.md), so the ogive has no wind-tunnel comparison here.

## Open

- **Runs queued, not yet done** (in this order): the cone's r = 8 at
  Mach 1.05; the ogive at Mach 1 on r = 2; the fitted
  solver's nj = 80 on the hemisphere at Mach 1.5 and the cone at Mach
  1.1; the ogive's r = 4 at Mach 1.1 and 1.05; the 2:1 ellipsoid's r = 8
  at Mach 1.2. The job scripts save their state every 10 minutes and
  resume from it, so each survives the container's restarts.
- **The stagnation line on blunt noses**: the captured shock's
  pointwise total-pressure error (above); removing it needs the shock
  fitted or aligned with the cells on the axis.
- **The far boundaries at Mach 1**: see "Mach 1 without the
  extrapolation": the large-domain route needs the near-sonic axis cells
  upstream of the tip to hold at 800 radii; the far-field-condition route
  needs the sonic far field's form verified and a domain beyond about 100
  radii.
- **First order at Mach 1.05** on the cone: consistent with the captured
  bow shock setting the pressure level, not isolated.
- **GPU**: the far-field boundary kind, and so the transonic domain, is on
  the CPU engine only.
- **Blunt noses meeting the cylinder at an angle** (blunted cones) are
  refused by the C grid; the sharp H grid takes cones and ogives.
- **The base**: the sting stands for whatever lies behind the nose; a
  subsonic base (blunt noses with short cylinders near Mach 1.2) belongs
  to the total-drag work, and the quantity here does not depend on it.
- **Serving**: not on the drag page. It needs the procedure's band at
  every Mach number served (four grids each), the far-boundary
  extrapolation at Mach 1 made part of the procedure, the stagnation-line
  error resolved or bounded for blunt noses, and a cost the page can
  afford (Mach 1 needs 17,850 plain steps on the base grid and 51,700 on
  r = 2).
