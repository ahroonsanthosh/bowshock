# 0013: Transonic forebody drag, Mach 1 to 1.2

- **Status:** Built on the CPU engine (`src/analysis/transonic-flow.ts`,
  `src/grid/transonic-grid.ts` with H grids for sharp noses and C grids
  for blunt ones, the far-field boundary and the implicit steps of
  `src/engine-cpu/euler2d.ts`, Anderson acceleration in
  `src/solver/anderson.ts`) and on the GPU engine in two-float
  arithmetic (`src/engine-gpu/euler2d-two-float.ts`), with the page's
  driver (`src/analysis/transonic-drag.ts`) and the router
  (`src/analysis/nose-drag-solve.ts`); not yet wired into the drag page
  (the interface's work), and nothing below Mach 1.05 is served (B1).
  The owner decided on 2026-10-21 that results below Mach 1.2 are served
  wherever they are accurate, each with its measured band. The serving
  rules and the plan for the page follow "What accuracy the evidence
  supports". Every certified number below is from offline CPU families;
  the cone at Mach 1.2 is a validation case only (the driver serves
  below 1.2, and the fitted solver from 1.2).
- **Date:** 2026-10-18 to 21
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
the error of the far boundaries' distance is measured. The GPU engines
have the same boundary kind (G1, "Build progress").

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

| r   | Cells   | Drag      | vs Taylor-Maccoll | Steps | Time            |
| --- | ------- | --------- | ----------------- | ----- | --------------- |
| 1   | 3,540   | 0.0944683 | -3.10e-4          | 950   | 17 s            |
| 2   | 14,160  | 0.0944644 | -3.51e-4          | 1,600 | 120 s           |
| 4   | 56,640  | 0.0944821 | -1.64e-4          | 3,200 | 1,163 s         |
| 8   | 226,560 | 0.0944913 | -6.7e-5           | 5,600 | 4,110 s of CPU  |
| 16  | 906,240 | 0.0944950 | -2.8e-5           | 7,300 | 17,126 s of CPU |

On r = 1 to 8 the changes (-3.9e-6, +1.77e-5, +9.1e-6) change sign at
the first step, and the procedure (`gridConvergence`, the four finest
grids) refused them: its coarser triple oscillates ("unresolved"). As
the certification plan (below) set out before the run, r = 16 was added
so that the four finest grids are r = 2 to 16.

**Mach 1.1 certified (2026-10-21).** With r = 16 the changes are
+1.770e-5, +9.14e-6 and +3.69e-6: observed orders 0.95 (r = 2, 4, 8) and
1.31 (r = 4, 8, 16), within the procedure's 0.5 of each other, so it
returns a monotone band. On the finest triple, order 1.31, the
extrapolated drag is 0.0944975 and the procedure's band (its grid
convergence index: 1.25 times the last change over 2^1.31 - 1) is 3.13e-6,
3.3e-5 of the value. The exact value, 0.0944976, lies 2.6e-6 above r =
16 (2.8e-5 of it): inside the band, at 0.83 of it; the extrapolation is
within 1e-7 of it. The iteration error is small against all this: r = 16
stopped on the settling test 300 steps after resuming from its
checkpoint, with the drag still rising by 8e-9 per 100 steps and falling
by about 0.93 each time; the geometric estimate of its remaining change
is 1.0e-7 to 1.5e-7 (the recorded one 1.5e-7), 4 to 5% of the band and
of the last grid change. Counting it in (r = 16 at 0.0944951) gives
order 1.26 and a band of 3.45e-6, which still contains the error
(2.47e-6). On r = 8 the estimate is 5e-10; r = 1 to 4 settled to 1e-7 of
the drag. As the plan requires, the far boundaries' and the cylinder's
largest measured change on the base grid at Mach 1.1 (+1.98e-5, 55.1 to
224.2 radii and 5 to 20 calibers, though at this Mach number the cone's
drag cannot depend on them: it is the grid's change with the domain) is
above a quarter of the band and is added once: the band at Mach 1.1 was
2.29e-5 (2.4e-4 of the value) about 0.0944950, containing the exact
error by a factor of 9. **Superseded (review of `aed95b0`, S7):** those
changes were the regridded domains' noise. On nested domains (test (a))
the cone's far-boundary and cylinder changes at Mach 1.1 are below
1.1e-8, and the band on r = 2 to 16 is **9.757e-6** (the procedure
3.129e-6 at order 1.31, the floor 6.615e-6, the allowances 1.4e-8) by
the allowance rule as reviewed, **9.836e-6** by the corrected rule
(allowances 9.3e-8, below the measurability level). The exact error,
-2.61e-6, lies inside both. On r = 1 to 8 the procedure refuses (the
values oscillate). Cost: r = 16 took 17,126 s of CPU (1.9
s per step, 1.1 to 1.6 GB), about 10 h of wall time on this machine.

The fitted solver on the same cone: 0.0938653 (nj = 20), 0.0940974
(nj = 40) and 0.0943618 (nj = 80), -6.69e-3, -4.24e-3 and -1.44e-3 of
the exact value. Its changes grow (+2.32e-4, then +2.64e-4) while its
errors fall by 1.6 and then 2.9: the family is not yet in its
asymptotic range, and the procedure would give it no band. nj = 80
stopped with the drag settled (remaining change estimated at 7.7e-11,
outflow axial Mach number 1.07; 10,600 iterations, 1,080 s of CPU), so
this is the discretisation, not the iteration. Its finest error is
about 50 times the transonic r = 16's (2.8e-5). Near the sonic limit of
its starting plane (axial Mach number 1.029 at the tip cone's surface)
its error is far larger than on the supersonic families of 0006.

### Mach 1.05: first order, from the level of the whole cone's pressure

At Mach 1.05 the cone's conical flow would be subsonic at the surface
(Taylor-Maccoll's surface Mach number is 0.998 already at 1.064), the
shoulder reaches the whole cone, and there is no exact solution; the
fitted solver refuses the case.

| r   | Cells   | Drag      | Change    | Steps  | Time           |
| --- | ------- | --------- | --------- | ------ | -------------- |
| 1   | 3,540   | 0.1065105 |           | 5,050  | 81 s           |
| 2   | 14,160  | 0.1068662 | +3.557e-4 | 8,300  | 735 s          |
| 4   | 56,640  | 0.1070376 | +1.714e-4 | 14,200 | 4,309 s        |
| 8   | 226,560 | 0.1071116 | +7.41e-5  | 18,000 | 9,918 s of CPU |

**Mach 1.05 certified by the procedure (2026-10-21)** (r = 8 settled by the fitted-window rule after 12,000 more steps, 5.8e-8 higher: 0.1071117 with a band of 9.808e-5 by the corrected rule; see the re-review of `dd6c423`). The changes fall
by 2.08 and 2.31: observed orders 1.05 (r = 1, 2, 4) and 1.21 (r = 2, 4,
8), within 0.5 of each other, so `gridConvergence` returns a monotone
band on r = 1 to 8: extrapolated (order 1.21) 0.1071680, band 7.04e-5
(6.6e-4 of the value) about r = 8. r = 16 is not needed for a band, as
it was at Mach 1.1 (there the coarser triple oscillated; here both are
monotone). There is no exact value to test the band against at this Mach
number: Taylor-Maccoll's conical solution exists (0.1082676, with the
surface subsonic, Mach 0.982), but the shoulder reaches the cone and
lowers the drag, by 1.0% on the extrapolation; it is context, not a
reference. The iteration error: r = 8 stopped on the settling test with
the drag still rising by 1e-8 per 400 steps and falling by about 0.89
each time, so about 1e-7 remained (0.14% of the band); r = 1 to 4 ended
with changes of 1e-9 per check (a remaining change near 1e-8). The far
boundaries and the cylinder: the plan's Mach 1.05 entry names the change
from 100.6 to 224.2 radii (+1.3e-5) and the cylinder's (up to 7e-6),
both below a quarter of the band (1.76e-5), so the band stays 7.04e-5;
read by its general rule (the largest change from 55.1 to 224.2 radii),
the 55.1 to 100.6 change (+4.36e-5) would be added, giving 1.14e-4
(1.07e-3 of the value). The more conservative reading was certified
then: 0.1071116 with a band of 1.14e-4. **Superseded (review of
`aed95b0`, S7):** the 55.1 to 100.6 change was a regridded one. On
nested domains it is +6.41e-6, then -1.2e-7 to 224.2 radii, and the band
is **8.435e-5** by the rule as reviewed (the procedure 7.044e-5, the
floor 7.50e-6, the far boundaries 6.41e-6, the cylinder 6e-9) and
**9.793e-5** by the corrected rule, whose turning bound gives the far
boundaries 1.995e-5 (the change turns sign between 100.6 and 224.2
radii). (The narrative of the first three grids follows.) The change
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
settled when a container restart stopped it, and its value here is a
fitted estimate, not a settled solve: the drag was in a damped
oscillation (period 22,600 steps, decay time 25,400 steps, amplitude
6.7e-6 at the end), and 0.0915486 is the oscillation's centre fitted to
the history from step 50,000 (the fit's rms misfit 3e-8; from step
30,000 the same centre to 1e-9). The method's check: the same fit on r =
2's history up to step 30,000 only gave 0.0915982 against the settled
0.0916001, within 1.9e-6, with a misfit 400 times larger. The checkpoint
at step 83,200 is kept, to settle it later. The changes
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

| Body, Mach         | r = 1     | r = 2     | r = 4     | r = 8     | Extrapolated | Fitted nj = 20 | nj = 40   | nj = 80   | Extrapolated |
| ------------------ | --------- | --------- | --------- | --------- | ------------ | -------------- | --------- | --------- | ------------ |
| 2:1 ellipsoid, 1.2 | 0.3482049 | 0.3433539 | 0.3425968 | 0.3425233 | 0.3424988    | 0.3472957      | 0.3437625 | 0.3429002 | 0.3426128    |
| hemisphere, 1.5    | 0.6994860 | 0.6885561 | 0.6863477 |           | 0.6856116    | 0.6904222      | 0.6872292 | 0.6863779 | 0.6860941    |
| hemisphere, 1.2    | 0.5546180 | 0.5431759 | 0.5404303 |           | 0.5395151    | refused        |           |           |              |

(each family extrapolated at second order from its two finest grids:
r = 4 and 8 on the ellipsoid, r = 2 and 4 on the hemispheres, nj = 40
and 80 for the fitted solver). Observed orders: transonic 2.68 and then
3.36 on the ellipsoid, 2.31 (hemisphere, 1.5) and 2.06 (hemisphere,
1.2); fitted 2.03 (ellipsoid) and 1.91 (hemisphere). Both solvers
converge from above at about second order or faster. The fitted nj = 80
grids stopped with the drag settled: remaining iterative change
estimated at 2.8e-10 (ellipsoid) and 5.6e-10 (hemisphere), and the
outflow supersonic (axial Mach number 1.14 or more on the ellipsoid,
1.33 on the hemisphere). The transonic r = 8 on the ellipsoid stopped
on the settling test after 3,200 steps (1,076 s of CPU), its remaining
change estimated at 7e-11.

**The 2:1 ellipsoid with r = 8 (2026-10-21).** On r = 1 to 8 the
procedure refuses the family: the observed orders of its two triples,
2.68 and 3.36, differ by more than its 0.5 ("unresolved"). r = 8
changed the drag by -7.4e-5, where the order of r = 1 to 4 predicted
-1.2e-4; the extrapolation from r = 2 and 4 (0.3423445) had overshot,
and the one from r = 4 and 8 is 1.5e-4 higher. Against the fitted
solver:

- r = 8 lies 8.9e-5 (2.6e-4 of the value) below the fitted
  extrapolation;
- the transonic extrapolation lies 1.14e-4 (3.3e-4) below it at second
  order, and 1.06e-4 (3.1e-4) at the observed orders;
- with r = 2 and 4 alone that gap was 2.7e-4 (7.8e-4).

So r = 8 closed more than half of the gap. Most of the earlier gap was
the transonic family still approaching its asymptotic range, not a
difference between the two solvers. What remains is smaller than the
fitted family's own extrapolation (2.9e-4) and 1.5 times the transonic
family's last change (7.4e-5). The finest grids still differ by 3.8e-4
(1.1e-3), because the fitted nj = 80 is further from its limit than the
transonic r = 8.

**The hemisphere at Mach 1.5 with the fitted nj = 80.** The finest grids
agree within 3.0e-5 (4.4e-5 of the value). The transonic family
converges faster (order 2.31 against 1.91), so its extrapolation lies
below the fitted one: by 4.8e-4 (7.0e-4) at second order, and by 2.8e-4
(4.1e-4) at the observed orders. From nj = 20 and 40 the gap was 5.5e-4
(8.1e-4). Whether r = 8 closes it as on the ellipsoid is not measured;
it is queued (see the certification plan's additions).

The two solvers thus agree on blunt noses to about 3e-4 of the value
on the ellipsoid (with r = 8) and 4e-4 to 7e-4 on the hemisphere (r = 2
and 4), with the transonic domain's value the lower. The stagnation line
below would push the transonic drag up, not down. The ellipsoid's r = 4
lies 9.8e-5 (2.9e-4 of the value) above its extrapolation from the two
finest grids; the extrapolation from r = 2 and 4 had put r = 4 2.6 times
further from its limit. The hemispheres' r = 4 lie 7.4e-4 (1.1e-3, Mach
1.5) and 9.2e-4 (1.7e-3, Mach 1.2) above their extrapolations from r = 2
and 4.

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
the size of the families' own remaining change.

The same comparison with r = 8 (2026-10-21), extrapolated pointwise from
r = 4 and 8, gives transonic minus fitted:

- +3.3e-5 to +4.0e-5 from r^2 = 0.05 to 0.2 (it was +1.9e-4);
- +2.8e-5 at r^2 = 0.4;
- falling to -1.0e-4 by r^2 = 0.9;
- ending at -1.1e-4 (it was -2.7e-4).

Both parts shrank: the stagnation region's excess by about 80%, and the
deficit over the rest of the nose (from r^2 = 0.4 on, -1.4e-4 against
-2.9e-4) by half. What is left, 1.1e-4 (3.3e-4 of the value), lies
within the families' own remaining change (above). It is no longer a gap
that refinement leaves open, so it needs no cause of its own. Most of
the earlier stagnation excess and deficit came from extrapolating r = 2
and 4, which were not yet in the asymptotic range.

### The ogive and the hemisphere from Mach 1.1 to 1

No reference below Mach 1.2 for these: the characteristics refuse the
5-caliber ogive below 1.2, and the fitted solver refuses the hemisphere
there. Drag on r = 1, 2 and, where run, 4 (100.6 radii, 10 calibers),
and at Mach 1 on 408.7 radii:

| Body       | Mach | r = 1     | r = 2     | r = 4     | Changes             | 408.7 radii, r = 1 |
| ---------- | ---- | --------- | --------- | --------- | ------------------- | ------------------ |
| ogive      | 1.2  | 0.0437833 | 0.0433724 | 0.0433244 | -4.11e-4, -4.80e-5  |                    |
| ogive      | 1.1  | 0.0435202 | 0.0433484 | 0.0434044 | -1.72e-4, +5.60e-5  |                    |
| ogive      | 1.05 | 0.0418288 | 0.0417434 | 0.0418273 | -8.54e-5, +8.39e-5  |                    |
| ogive      | 1.0  | 0.0171707 | 0.0170016 |           | -1.69e-4            | 0.0186725          |
| hemisphere | 1.2  | 0.5546180 | 0.5431759 | 0.5404303 | -1.144e-2, -2.75e-3 |                    |
| hemisphere | 1.1  | 0.4704390 | 0.4610574 |           | -9.38e-3            |                    |
| hemisphere | 1.05 | 0.4181985 | 0.4092866 |           | -8.91e-3            |                    |
| hemisphere | 1.0  | 0.3595713 |           |           |                     | 0.3594575          |

The base grid's error, judged from the change to r = 2, falls with the
Mach number on the ogive (from 9.4e-3 of the value at 1.2 to 2.0e-3 at
1.05) and stays near 2% on the hemisphere, whose families converge at
about second order where measured (Mach 1.2 and 1.5, above).

**The ogive's r = 4 at Mach 1.1 and 1.05 (2026-10-21).** Both
oscillate: the drag falls from r = 1 to 2 and rises from r = 2 to 4, as
the cone's did at Mach 1.1.

- At Mach 1.1 the second change is 3.1 times smaller than the first.
- At Mach 1.05 it is as large as the first (ratio 1.02), and r = 4 is
  back within 1.5e-6 of r = 1. So these three grids give no evidence of
  convergence at Mach 1.05.

The procedure needs four grids in any case. Both runs stopped on the
settling test with small remaining changes:

- Mach 1.1: 3,400 steps, 644 s of CPU, remaining change estimated at
  3e-11.
- Mach 1.05: 8,800 steps, 1,620 s of CPU, remaining change estimated
  at 1.3e-9.

r = 8 at both Mach numbers was queued as an addition to the
certification plan (below).

**The ogive's r = 8 at Mach 1.1 (2026-10-21):** 0.0434468, after 5,600
steps and 3,842 s of CPU, with a remaining change estimated at 1e-10.

- The changes are -1.72e-4, +5.6e-5 and +4.2e-5. The procedure refuses
  r = 1 to 8 (`unresolved`): its coarser triple oscillates, as the
  cone's did at this Mach number.
- The finer triple is monotone but converges slowly: its last two
  changes fall only by 1.32, an observed order of 0.40.
- As the plan's addition provides, r = 16 is queued (975,360 cells).
  If its order agrees with 0.40 within 0.5, the band is 3.9 times its
  last change, some 3e-3 of the value. If not, the case stays refused.

**The ogive's far boundaries and cylinder at Mach 1.1 and 1.05**, on the
base grid (domains regridded, as for the cone above):

| Mach | 55.1      | 100.6     | 224.2     | 5 cal     | 10 cal    | 20 cal    |
| ---- | --------- | --------- | --------- | --------- | --------- | --------- |
| 1.1  | 0.0435633 | 0.0435202 | 0.0435012 | 0.0435230 | 0.0435202 | 0.0435144 |
| 1.05 | 0.0419510 | 0.0418288 | 0.0417219 | 0.0418430 | 0.0418288 | 0.0417823 |

At Mach 1.1 the far boundaries' changes fall by 0.44 per step
(-4.3e-5, then -1.9e-5), and the cylinder's are a few 1e-6. At Mach
1.05 they hardly fall: -1.22e-4, then -1.07e-4 (2.6e-3 of the value
each). The cylinder's grow: -1.4e-5 from 5 to 10 calibers, then -4.7e-5
from 10 to 20. The bow shock stands far ahead of this blunter tip (the
characteristics refuse it: the tip flow is subsonic), so at Mach 1.05
the ogive feels the domain much more than the cone does. A rule that
adds the largest change once would not bound this.

**The ogive's r = 2 at Mach 1 (2026-10-21).** On 100.6 radii the drag is
0.0170016. The change from r = 1 is -1.69e-4, 1.0% of the drag; the
cone's at Mach 1 was -1.15e-4, 0.13% of its drag. The run took 33,700
plain steps (r = 1: 13,300; the cone's r = 2: 51,700) and 767 s of CPU.
Its drag history is a damped oscillation:

- period about 10,000 steps, each swing 0.24 times the one before;
- the settling test stopped it 500 steps after a crest, about 8.5e-8
  above the oscillation's limit (5e-6 of the drag), which is negligible
  here.

At Mach 1 the far boundaries' distance acts on the ogive as on the
cone, by about the same amount (+1.50e-3 from 100.6 to 408.7 radii,
against the cone's +1.38e-3), which is 8.7% of the ogive's much smaller
drag; on the hemisphere it is -1.1e-4, 3e-4 of its drag. With the ogive
on a third distance (0.0182824 on 224.2 radii), the power law gives q =
1.06 and, for boundaries at infinity, 0.019109 (with the cone's q = 1.35
instead, 0.018985). So on 100.6 radii the ogive's drag is about 10% low,
on 408.7 radii 1.7% to 2.3% low, and on the base grid its Mach 1 drag
is 0.0190 within about 0.7%. The base grid's correction added to r = 2
gives 0.01882 to 0.01894, 0.9% below the base grid's value. The grid
error beyond r = 2 is not measured. This is an estimate only, since the
far-boundary rule failed its test (see the certification plan).

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
  2e-4 on r = 8 and 3e-4 on r = 4. 2:1 ellipsoid: the procedure refuses
  r = 1 to 8 (orders 2.68 and 3.36). r = 8 is 2.6e-4 of the value below
  the fitted solver's extrapolation, and its own extrapolation 3.3e-4
  below it (with r = 2 and 4 only, 7.8e-4). Hemisphere: second-order
  convergence but no reference, and the stagnation line's open error.
  Far boundaries and cylinder: below 1e-4. The transonic domain and the
  supersonic fitted solver agree where both apply, within 2.7e-5 on the
  cone, 1e-3 on the ogive and 3e-4 to 1e-3 on the ellipsoid: the two
  definitions meet at Mach 1.2.
- **Mach 1.1.** Cone: certified by the procedure on r = 2 to 16 (a
  monotone band of 3.13e-6 containing the exact error, 2.6e-6). With the
  floor and the nested domains' allowances the band is 9.757e-6 by the
  rule as reviewed and 9.836e-6 by the corrected rule (the 2.29e-5 once
  recorded here added the regridded domains' noise; S7 of the review). Curved noses: the
  10-caliber ogive's family against the characteristics is running. The
  5-caliber ogive has r = 1 to 4, oscillatory, with r = 8 queued; the
  hemisphere has r = 1 and 2. The fitted solver is 1.4e-3 off on nj = 80
  and not yet converging.
- **Mach 1.05.** Cone: certified by the procedure on r = 1 to 8
  (r = 8 settled by the fitted-window rule after 12,000 more steps, 5.8e-8 higher: 0.1071117 with a band of 9.808e-5 by the corrected rule; see the re-review of `dd6c423`) (monotone, orders 1.05 and 1.21): 0.1071116 with a band of 8.435e-5 on
  nested domains by the rule as reviewed, 9.793e-5 by the corrected rule
  (the 1.14e-4 once recorded here added a regridded change; S7 of the
  review); no exact value exists to test it. 5-caliber ogive: r = 1 to 4 oscillate with equal
  steps (-8.5e-5, +8.4e-5), which shows no convergence yet; r = 8 is
  queued. Hemisphere: r = 1 and 2 only.
- **Mach 1.0.** (An estimate from regridded domains and an
  extrapolation in the distance that the record has since refuted as a
  correction; no band. On the family moved to 224.2 radii the far
  boundaries now have a bound, "Mach 1.0: the family moved to 224.2
  radii", but no four-grid family exists.) Cone: 0.0932 within about
  0.1%: three grids converging at first order (1.16), extrapolated, plus
  the far boundaries' correction (measured on the base grid, holding on r = 2 within 6e-6);
  on 100.6 radii alone 1.8% low, on 408.7 radii about 0.3% low; no band
  from the procedure, which needs a fourth grid (at Mach 1 the steps
  grew 2.9 times from r = 1 to 2 and r = 4 had not settled after 1.7
  times r = 2's, each grid with 4 times the cells). Ogive: on the base grid
  0.0190 within about 0.7% after the same extrapolation (10% low on
  100.6 radii, 2% on 408.7). On r = 2 it is 0.0188 to 0.0189 (r = 1 to 2
  changed it by 1.0%); its grid error beyond r = 2 is not measured.
  Hemisphere: far boundaries 3e-4, grid error not measured at Mach 1.
  The wind tunnel and slender-body theory confirm the cone's level to 5
  to 10%, no better.

So the evidence supports the transonic domain at Mach 1.2 to the
supersonic solvers' standard on cones and on the ogive (four grids, the
procedure's band containing the error against exact references), and at
Mach 1.1 on the cone (r = 2 to 16, band 9.8e-6 on nested domains containing the exact
error). Blunt noses reach about 1e-3 at Mach 1.2 on r = 4 and 3e-4 on
the ellipsoid's r = 8, against the fitted solver. The procedure gives
them no band (it refuses the ellipsoid's r = 1 to 8), so they do not
meet the standard and stay unserved below Mach 1.5. Curved noses at
Mach 1.1 wait on the 10-caliber ogive's family, and at 1.1 and 1.05 on
the 5-caliber ogive's r = 8. At Mach 1.05 the cone is certified by the
procedure (r = 8 settled by the fitted-window rule after 12,000 more steps, 5.8e-8 higher: 0.1071117 with a band of 9.808e-5 by the corrected rule; see the re-review of `dd6c423`) (band 9.8e-5 by the corrected rule, 9.1e-4 of the value; no exact reference
exists there). At Mach 1 there are three grids, and the far-boundary
rule written for it failed its test at Mach 1.2, so Mach 1 stays refused
(0.0932 within about 0.1% is an estimate, not a certification). These
are CPU measurements. Since the owner's decision of 2026-10-21 (next
section), what the page shows below Mach 1.2 is decided by each
request's own band.

## Serving below Mach 1.2: the owner's decision (2026-10-21)

The owner's decision, 2026-10-21: results below Mach 1.2 are served,
and they must be accurate. Every number carries its measured band, and
a case is refused only when no accurate band can be given, with the
reason. This replaces "nothing below Mach 1.2 is shown until certified"
(the certification plan below), whose runs now serve as the procedure's
validation. In particular, a curved nose at Mach 1.05 that the
procedure certifies (grid convergence plus the domain's allowances) is
served with that band. It is labelled plainly as verified by grid
convergence with no exact reference at that Mach number; the procedure
itself was validated against Taylor-Maccoll on the cone at 1.1.

The serving rules, which the page's transonic solve follows:

1. **The band is the solve's own.** The solve that produces a number
   also measures its band:
   - the procedure (`gridConvergence` on the four finest grids it
     solved, the engine's noise, observed orders within 0.5);
   - the floor (below);
   - the far boundaries' and the cylinder's allowances, from base-grid
     solves made by the same request.

   Nothing is borrowed from the offline runs. The procedure's noise is
   the one measured for that case on that device (the drag's wander once
   it has settled, rule of 2026-10-21), never an assumed value, so a
   solve that wanders gets a wide band or a refusal rather than too
   narrow a band.

2. **The offline runs validate the procedure; they do not certify the
   page's numbers.** Where an exact value exists, the procedure's band
   contained the exact error. That holds for the cone at Mach 1.2 and
   1.1 against Taylor-Maccoll and for the 5-caliber ogive at 1.2
   against the characteristics; the 10-caliber ogive at 1.1 is running.
   They also set the floor.
3. **The floor** is an allowance for errors that a captured shock's
   family cannot show. It is 7e-5 of the value, the fitted solver's
   (`FITTED_DRAG_FLOOR`), until the transonic validation cases give a
   reason for another. Against exact values, the procedure's own
   extrapolation missed by 6.8e-6 of the value (5.6e-7 absolute; cone,
   1.2) and 1.1e-6 of it (1.0e-7 absolute; cone, 1.1, r = 2 to 16), and
   the ogive's oscillatory band contained its error. (Units corrected
   2026-10-22: the first figure was relative, the second absolute.)
4. **A refusal says why.** The reasons are:
   - the procedure's own (`unresolved`: the triples' orders differ,
     the values oscillate, or the changes do not shrink), when no finer
     grid can be added;
   - a far-boundary or cylinder effect that does not decay fast enough
     to bound (the allowance rule below);
   - a body the grids cannot take (blunt noses meeting the cylinder at
     an angle);
   - a grid that did not converge;
   - the device's memory.

   A slow device is not a reason to refuse. The page states the
   expected time before it starts.

5. **The label.** Every transonic number is "verified by grid
   convergence". The label also says whether an exact solution exists
   for that nose at that Mach number, with the same tests as the
   references:
   - for a cone, Taylor-Maccoll's surface flow is supersonic (for the
     7 deg cone, down to about Mach 1.064);
   - for a tangent ogive, the characteristics accept the tip.

   Where none exists, the label says "no exact reference at this Mach
   number; the procedure was validated against exact solutions on the
   cone at Mach 1.1 and 1.2 and the ogive at 1.2". The exact values
   never enter the band.

6. **Blunt noses** follow the same rules; the earlier rule (unserved
   below Mach 1.5) is withdrawn. Their measured families give no band
   today: the 2:1 ellipsoid's r = 1 to 8 at Mach 1.2 are `unresolved`.
   So the page refuses them with the procedure's reason, unless a
   solve's own family gives a band.
7. **Where each solver serves.** At Mach 1.2 and above the fitted
   solver serves as now. Below 1.2 the transonic solve serves. At 1.2
   the two agree within 2.7e-5 of the value on the cone and 1e-3 on the
   ogive.
8. **Mach 1.0** is refused with its reason until the work below is
   done. The far boundaries' effect there (1.8% of the cone's drag on
   100.6 radii, 10% of the ogive's) has no tested bound, and no family
   of four grids has converged. (Decision of 2026-10-21, after the plan:
   if the allowance rule passes its test, Mach 1.0 is served with the
   wide band the rule gives, labelled plainly, rather than refused while
   the 800-radius divergence is fixed; narrowing it comes later. Its
   fourth grid's cost, about 300,000 steps, is stated on the page with
   the measured time, and the user chooses to run it, as for any point.)

   **Amended 2026-10-22 (review of `aed95b0`, B1):** the solve refused
   only Mach 1 itself (below 1 + 1e-9), so a cone at Mach 1.001 or 1.005
   was served as "verified" on a rule never tested there. It now
   refuses everything below Mach 1.05 (`NEAR_SONIC_LIMIT`, reason
   'near-sonic'), the lowest Mach number where a case is certified with
   a negligible far-field allowance (the cone). The limit stays until
   the corrected allowance rule (S2 and S3 of the review, below) passes
   its pre-registered test lower down. The nested runs show why: on the
   cone at Mach 1.01 to 1.02 the far boundaries' effect changes sign as
   the domain grows, which the rule as tested does not bound.

## The path to the page (plan, written 2026-10-21, before its build)

### What a page solve does

For a body and a Mach number between 1 and 1.2 (the fitted solver
serves from 1.2), one request does the following:

1. **The allowances, first.** It solves the base grid (r = 1, 1,600 to
   5,300 cells) on nested far boundaries at 55.1, 100.6 and 224.2 radii
   (10 calibers), and on 5 and 20 calibers of cylinder (100.6 radii). It
   applies the allowance rule below. If the rule refuses, the request
   stops there with the reason, which costs seconds.
2. **The family on 100.6 radii**, r = 1, 2, 4, 8. Each grid starts from
   the coarser one's solution and stops when its drag settles to the
   GPU's noise (2e-6 of it), with the wall fluxes evaluated in double
   precision from the state read back (`gpuEngine`, as now).
3. **The procedure** on the four finest grids, with the GPU's noise and
   orders within 0.5. It can return `unresolved` because the coarser
   triple oscillates while the finer one is monotone (the cone at Mach
   1.1). Then the solve adds r = 16 (906,240 cells for the cone) if the
   device's memory allows, after stating the expected time; otherwise it
   refuses with the procedure's reason.
4. **The band** is the procedure's band, plus the floor times the value,
   plus the far-boundary allowance, plus the cylinder allowance.
5. **It returns** the value, the band and each of its parts, the grids'
   values, observed orders, steps and times, the label (rule 5 above)
   and, if refused, the reason. The interface takes this as it takes the
   fitted solve's result.

The offline runs (r = 16 on the CPU) are not used by it: they validated
the procedure.

### The allowance rule (written before its test)

The far boundaries' and the cylinder's changes measured so far come from
grids that differ with the domain. At Mach 1.2, where the cone's drag
cannot depend on the domain, those regridded domains moved it by 6e-6,
and at 1.1 by 2e-5. That noise is why the Mach 1 far-boundary rule
failed its test (above). So first:

- **Nested domains.** A grid option whose nodes inside the smallest
  domain are the same, node for node, on every larger one. The rows
  continue the same geometric growth outward, and the lines' lean is
  fixed by the smallest domain. Its tests:
  - node identity inside 55.1 radii;
  - the cone's drag at Mach 1.2 and 1.1 on 55.1, 100.6 and 224.2
    radii equal within 10 times the settling noise.

Then, on the base grid, with C(D) the drag on far boundaries at D:

- c1 = C(100.6) - C(55.1) and c2 = C(224.2) - C(100.6).
- If the larger of |c1| and |c2| is at most a quarter of the
  procedure's band, or below the measurable level (10 times the noise
  times the drag), the effect is negligible. The allowance is then that
  larger change, added whatever its sign.
- Otherwise, if c1 and c2 have the same sign and rho = |c2| / |c1| is at
  most 0.6, the effect is taken to keep falling at least geometrically
  beyond 224.2 radii. The allowance for the family's 100.6 radii is then
  |c2| / (1 - rho): c2 plus every later change, each at most rho times
  the one before. (The change from 55.1 to 100.6 radii is not part of
  the error at 100.6. The certification plan added it, which was
  cautious but not a bound.)
- Otherwise the rule refuses, with both changes as the reason: the
  effect does not decay fast enough to bound from these distances.
  (Moving the family to 224.2 radii, with 408.7 as the third distance,
  is the next step if refusals here matter. It costs about 1.2 times
  the cells.)
- The cylinder: the same rule on 5, 10 and 20 calibers, with the
  columns along the cylinder nested in the same way.
- On the regridded domains measured so far, for orientation only:
  - cone at Mach 1.05: far boundaries +4.4e-5 and +1.3e-5 (rho = 0.30),
    allowance 1.9e-5; cylinder -3.3e-6 and +6.6e-6, negligible,
    allowance 6.6e-6;
  - 5-caliber ogive at Mach 1.1: far boundaries -4.3e-5 and -1.9e-5
    (rho = 0.44), allowance 3.4e-5.

**Its test** uses runs made after this commit, on the base grid with
nested domains:

- (a) At Mach 1.2 and 1.1 on the cone, both allowances must be below
  1e-6 of the drag (the drag cannot depend on the domain there).
- (b) Where the domain matters, the bound from 55.1, 100.6 and 224.2
  radii must contain C(408.7) - C(100.6). The cases are the cone at
  Mach 1.05, 1.02, 1.01 and 1.0 and the 5-caliber ogive at 1.1, 1.05 and
  1.0.

If any case fails, the rule is withdrawn. The page then refuses wherever
the far boundaries' change exceeds a quarter of the band. Measured so
far on the regridded domains (not nested), for orientation only: the
5-caliber ogive at Mach 1.05 has c1 = -1.22e-4 and c2 = -1.07e-4 (rho =
0.87), and its cylinder changes -1.4e-5 and then -4.7e-5. That case
would be refused on 100.6 radii.

### The GPU solve

- **G1. The far-field boundary** as a boundary kind of `euler2d.wgsl`:
  the state outside each face from the Riemann invariants, as
  `farFieldState` does on the CPU. Test: GPU against CPU on the cone's
  base grid at Mach 1.1 after the same explicit steps, states within
  1e-5 and the drag within the GPU's noise.
- **G2. The iteration.** The CPU's LU-SGS sweeps are sequential: each
  cell waits for its lower neighbours. A GPU needs one of two
  data-parallel forms of the same implicit system, the same scalar
  diagonal with the axis term and the same CFL ramp:
  - Jacobi sweeps, a few per step: the data-parallel lower-upper
    relaxation, "Data-parallel lower-upper relaxation method for the
    Navier-Stokes equations", AIAA J. 34(7), 1996, 1371-1377 (found,
    not read; its authors to be confirmed when it is read and entered
    in sources.md);
  - a red-black ordering of the Gauss-Seidel sweeps.

  Both are built first on the CPU engine, opt-in, and tested like
  LU-SGS (the explicit scheme's drag within 1e-12 on the Mach 2 cone).
  Their steps are measured on the cone at Mach 1.2, 1.1 and 1.05, r = 1
  to 4, against LU-SGS and the explicit steps. The cheaper one per unit
  of work goes to WGSL; if neither is, the explicit steps (already on
  the GPU) stay. Anderson acceleration needs reductions on the GPU and
  comes only if the measured counts show it pays.

- **G3. The driver**, `verifiedTransonicDrag`, engine-agnostic as
  `verifiedDrag` is, so one code runs on the CPU (tests) and the GPU
  (the page). Tested on the CPU on small grids, and on SwiftShader on
  the cone's r = 1 and 2 against the CPU.
- **G4. The page:** Mach numbers below 1.2 go to it, and its result
  type goes to the interface agent; Mach 1.0 is refused with the reason
  (rule 8 above).

### The band at page sizes (measured, CPU families)

The procedure with the GPU's noise (2e-6) on the four finest grids up
to r = 8 (r = 16 where solved). The GPU reproduces the CPU's drag within
its noise on cones and ogives at Mach 1.3 to 5 (0005); on these grids
that is G1's and G3's test.

| Case               | Grids    | Procedure (GPU noise)        | Band, of the value | Against exact      |
| ------------------ | -------- | ---------------------------- | ------------------ | ------------------ |
| cone 7 deg, 1.2    | r = 1-8  | monotone                     | 3.7e-5             | 1.9e-6 inside      |
| cone 7 deg, 1.1    | r = 1-8  | unresolved (oscillates)      |                    |                    |
| cone 7 deg, 1.1    | r = 2-16 | monotone                     | 3.3e-5             | 2.6e-6 inside      |
| cone 7 deg, 1.05   | r = 1-8  | monotone                     | 6.6e-4             | no exact value     |
| 5-cal. ogive, 1.2  | r = 1-8  | oscillatory                  | 1.1e-3             | inside             |
| 5-cal. ogive, 1.1  | r = 1-8  | unresolved (oscillates)      | r = 16 queued      | none               |
| 5-cal. ogive, 1.05 | r = 1-8  | unresolved (oscillates)      | r = 16 needed      | none               |
| 10-cal. ogive, 1.1 | r = 1-8  | r = 16 paused at 2,200 steps |                    | r = 8: +2e-7       |
| 2:1 ellipsoid, 1.2 | r = 1-8  | unresolved (orders differ)   |                    | fitted: about 3e-4 |
| hemisphere, 1.2    | r = 1-4  | three grids                  |                    | none               |
| cone 7 deg, 1.0    | r = 1-4  | r = 4 not settled            |                    | none               |

To these the floor (7e-5) and the allowances add. On the regridded
domains the allowances were 6e-6 (cone, 1.2), 2.0e-5 (1.1) and 4.4e-5
(1.05), to be measured again on nested domains.

### Time per Mach number

Measured here, on one shared machine (4 cores, load average 10 to 29
during these runs). CPU rates are in process CPU seconds; SwiftShader
rates are in wall seconds.

- **Steps per grid** (CPU, LU-SGS with Anderson) are as in the tables
  above. In cells times steps, the families are:
  - cone at Mach 1.2: 7.8e8;
  - cone at 1.1, to r = 16: 8.2e9;
  - cone at 1.05: 5.1e9;
  - 5-caliber ogive at 1.2: 3.5e9 (its r = 8 stalled after a
    transient, 13,600 steps).
- **The explicit steps** (SSPRK2, CFL 0.8: the GPU engine's iteration
  now) need more steps to settle the drag to the GPU's noise. On the
  cone at Mach 1.2 they took 1,550 and 2,600 steps on r = 1 and 2,
  against LU-SGS's 700 and 700 (`tests/tmp-transonic`, measuring;
  Mach 1.1 and 1.05 are running). They reach the same drags (within
  2e-8).
- **Cost per cell and step, one CPU core:**
  - explicit step: 2.7e-6 s;
  - plain LU-SGS step: 1.5e-6 s;
  - LU-SGS with Anderson and the drag checks, as the families ran: 2.5
    to 3.6e-6 s.

  A family on the CPU therefore takes 0.6 hours (cone, 1.2) to 6.5 hours
  (cone, 1.1 with r = 16). The CPU is not a page engine for these.

- **SwiftShader** (software WebGPU, the GPU engine's explicit step on
  these grids, `tests/tmp-transonic/gpu-rate.test.ts`): 5.7e4, 2.8e4,
  4.2e4 and 5.2e4 cell-steps a second on r = 1, 2, 4 and 8, under a load
  average of 27. 0012 measured 1.3e5 for the page's fitted solver. A
  family would take hours to days, so software WebGPU is not a page
  engine for this either. The page states the expected time, and the
  user decides.
- **A mid-range GPU: estimated, not measured.** There is no hardware GPU
  here. The explicit step reads and writes about 0.7 kB per cell (two
  stages, each reading neighbouring states and face geometry and
  writing fluxes and states). A mid-range discrete GPU sustains about
  150 to 300 GB/s, which gives 1e8 to 3e8 cell-steps a second on grids
  of 50,000 cells or more. Small grids are bound by the dispatches
  instead, at about 5,000 to 10,000 steps a second. A Jacobi or
  red-black implicit step moves about twice the data, so 5e7 to 1.5e8.
  The page shows its own rate (0012's throughput readout), and step 7
  of the build replaces this estimate with a hardware measurement.

| Case                      | Cells times steps | One CPU core | Mid-range GPU, estimated |
| ------------------------- | ----------------- | ------------ | ------------------------ |
| cone, Mach 1.2 (r = 1-8)  | 7.8e8             | 0.6 h        | 5 to 16 s                |
| cone, Mach 1.1 (r = 1-16) | 8.2e9             | 6.5 h        | 1 to 3 min               |
| cone, Mach 1.05 (r = 1-8) | 5.1e9             | 4.0 h        | 0.5 to 2 min             |
| ogive, Mach 1.2 (r = 1-8) | 3.5e9             | 2.8 h        | 0.4 to 1.2 min           |
| allowances (5 base grids) | 5e7               | 2 min        | a few seconds            |

The GPU column assumes the GPU's implicit step needs as many steps as
LU-SGS with Anderson. G2 measures that. Explicit steps instead would
take 2 to 4 times the steps at a rate about twice as high. Memory is
not the limit: r = 16 needs about 50 MB of geometry and 15 MB per state
copy, within WebGPU's default 128 MiB per buffer.

### What each body and Mach number would get

Measured on the CPU families. On the GPU each request measures its own
band, and these are what the same grids gave. Each band is the
procedure's band plus the floor (7e-5) and the allowances, all as
fractions of the value.

- **Cones** (the 7 deg cone measured; other angles get their own
  request's band):
  - Mach 1.2: about 1.1e-4, from r = 1 to 8. An exact solution exists
    there.
  - Mach 1.1: about 1.0e-4, if the nested domains remove the
    regridding noise as test (a) requires. It needs r = 16, since r = 1
    to 8 are `unresolved`. The request says so and offers r = 16, as
    the fitted page offers 320 cells across. An exact solution exists.
  - Mach 1.05: about 1.0e-3 (6.6e-4 from the family, the rest the
    floor and the allowances, 1.9e-5 and 6.6e-6 on the regridded
    domains). Labelled with no exact reference.
- **The 5-caliber ogive:**
  - Mach 1.2: about 1.2e-3 (oscillatory).
  - Mach 1.1: refused on r = 1 to 8, as the cone was (r = 8 finished
    2026-10-21: 0.0434468). The coarser triple oscillates, and the
    finer one is monotone at order 0.40 (changes +5.6e-5 and then
    +4.2e-5). So r = 16 is needed, and it is queued. If r = 16's order
    agrees with 0.40 within 0.5, the band will be about 1.25 / (2^0.4 -
    1), or 3.9 times its last change: some 3e-3 of the value. If not, it
    stays refused (r = 32 would be 3.9 million cells).
  - Mach 1.05: refused on r = 1 to 8, as at 1.1 (r = 8 finished:
    0.0418747; changes -8.54e-5, +8.39e-5, +4.75e-5, the coarser triple
    oscillating, the finer monotone at order 0.82), so r = 16 would be
    offered. On nested domains its far boundaries are not the obstacle
    (3.1e-6, "Build progress").
- **The 10-caliber ogive at Mach 1.1:** r = 8 (0.0114532) is within
  about 2e-7 of the characteristics' 0.011453; r = 16 was paused at
  2,200 steps by the container restart of 2026-10-22.
- **Other sharp noses the H grid takes** (secant ogives, power-law and
  parabolic noses): whatever their own families give.
- **Blunt noses:** refused today by the procedure's own result (the
  2:1 ellipsoid's orders differ at Mach 1.2). Each request decides on
  its own family.
- **Mach 1.0 to 1.05:** each request's allowance rule decides. At Mach
  1.01 the cone's far boundaries moved its drag by +2.3e-3 from 100.6 to
  408.7 radii, and at 1.02 by -8e-5. Mach 1.0 itself is refused (below).

### Mach 1.0 itself

Two things are missing, and both are measured.

**A bound on the far boundaries.**

- On 100.6 radii the far boundaries move the cone's drag by 1.8% and
  the ogive's by about 10%.
- The extrapolation rule written for this failed its test at Mach 1.2.
  The regridded domains carried grid noise, and the rule read that
  noise as a correction.
- The allowance rule above is the remedy. It uses nested domains, so
  the changes carry no grid noise, and it bounds the effect instead of
  correcting for it.
- On the regridded base grids of the cone at Mach 1 the changes are
  c1 = +1.88e-3 and c2 = +1.08e-3 (rho = 0.57). The rule gives an
  allowance of 2.5e-3 (2.7% of the drag) on 100.6 radii, and the
  408.7-radius solve (+1.38e-3 from 100.6) lies inside it.
- A band of that width would be accurate but wide. Narrowing it needs
  the family on a larger domain, with the third distance at 800 radii
  or more, where the implicit steps diverge at present (the near-sonic
  axis cells upstream of the tip, above).
- Time: the nested grids and the rule's test take about two days of
  work and a day of base-grid runs (step 1 of the build). The
  800-radius divergence is open, with no estimate.

**A fourth grid that converges.**

- At Mach 1 the iteration's slow mode is a damped oscillation of the
  whole near-sonic region, with a period of 22,600 steps on r = 4. r = 4
  did not settle in 89,200 LU-SGS steps; its value is a fitted
  estimate.
- r = 8 would need several hundred thousand steps: 6.8e10 cell-steps at
  300,000 steps. At the 2.0e-6 s per cell and step that r = 2's plain
  steps took, that is about 40 hours on one CPU core here, and on a
  mid-range GPU some 8 to 25 minutes at the rates estimated above.
- A Newton-Krylov iteration (GMRES on the steady residual, with LU-SGS
  as its preconditioner) would converge that mode without stepping
  through it. It is untried here: about a week to build and measure on
  the CPU, with no guarantee.

Until both are done the page refuses Mach 1.0, and gives this reason.
(Superseded in part by the decision recorded under rule 8: once the
allowance rule passes its test, the wide band is served, and the fourth
grid's cost is the user's choice.)

### Order of the build

Each step comes with its tests and is committed on this branch. The
lanes keep running at their nice levels, and the build's tests run
briefly at nice 0.

1. The nested-domain grids, the allowance rule and its test runs (base
   grid, CPU).
2. The data-parallel implicit steps on the CPU, and their step counts.
3. G1, the far-field boundary on the GPU, with its test against the CPU.
4. G2, the chosen iteration on the GPU, with its test against the CPU
   twin.
5. G3, the driver, with CPU tests and a SwiftShader test.
6. G4, the page's routing and result type, with the interface agent.
7. The record: the GPU measurements (SwiftShader here; a hardware GPU's
   rate from the benchmark in `tests/gpu`, run by whoever has one) and
   the GPU families against Taylor-Maccoll at page sizes.

### Build progress

**Step 1, done (2026-10-21; `cbc5e6a`).** `transonicGrid`'s `nested`
option and `domainAllowance` (`src/verification/domain-allowance.ts`).

- Cut back, the grid keeps its own lines. Continued, the columns
  upstream and downstream are vertical lines with the grid's own
  geometric spacing, and the rows beyond the far radius are horizontal,
  with the axis's growth.
- Tested: every shared node is bit for bit the same, the domain asked
  for is reached in whole base cells, and the families still nest.
- The continuation leaves neighbouring cells up to 20 times different
  in size at the old grid's upstream top corner. The grid's leaning
  lines squeeze its top-left cells to 1.1 radii there, beside new
  columns 20 radii wide. Test (a) below shows this does not reach the
  drag.

The rule's pre-registered test, on the base grid (runs of 2026-10-21,
`tests/tmp-transonic/queue-nest.txt`):

- **(a) passes.** On the cone at Mach 1.2 and 1.1 every change is
  below 1.1e-7 of the drag: -3.5e-9 and +8.7e-9 (1.2), -3.4e-9 and
  -1.8e-9 (1.1); the cylinder's are below 1.1e-8. On regridded domains
  the same changes were 6e-6 and 2e-5. The nested grids remove the
  grid's noise from the test, as intended.
- **(b), the cases run so far** (far boundaries; allowance against
  C(408.7) - C(100.6)):

| Case                | c1 (55.1 to 100.6) | c2 (100.6 to 224.2) | Rule                     | C(408.7) - C(100.6) |
| ------------------- | ------------------ | ------------------- | ------------------------ | ------------------- |
| cone, 1.05          | +6.4e-6            | -1.2e-7             | negligible, 6.4e-6       | -1.2e-7, inside     |
| ogive, 1.1          | -5.9e-11           | -4.1e-9             | negligible, 4.1e-9       | +2.6e-9, inside     |
| ogive, 1.05         | +1.10e-5           | +2.41e-6            | rho 0.22, 3.09e-6        | +2.41e-6, inside    |
| cone, 1.02          | +7.69e-4           | -1.03e-4            | refused (sign change)    | -1.01e-4            |
| cone, 1.01          | +2.86e-3           | +9.03e-4            | rho 0.32, 1.32e-3 (1.3%) | +8.63e-4, inside    |
| cone and ogive, 1.0 | running            |                     |                          |                     |

Every bound the rule gave contains the larger domain's change. At
Mach 1.02 it refuses: the effect overshoots (up from 55.1 to 100.6
radii, down beyond), and a sign change gives it nothing to bound
with. Measured there, the drag moves by 2e-6 between 224.2 and 408.7
radii.

- **What the regridded domains had hidden.** On nested domains the
  5-caliber ogive at Mach 1.05 is not domain-limited: 3.1e-6 (7.4e-5 of
  its drag), where the regridded domains had shown -1.22e-4 and then
  -1.07e-4, which were the grid's noise. On the cone at 1.05 the
  effect beyond 100.6 radii is 1.2e-7. At Mach 1.01 the change from
  100.6 to 408.7 radii is +8.6e-4, not the +2.3e-3 of the regridded
  domains. The cylinder's changes are below 1e-8 everywhere measured.
  (The far-boundary rule refuted earlier read the regridded noise as a
  correction; these numbers show how large that noise was.)

**Step 2, built (2026-10-21; `35f7e3a`); counts running.** Jacobi and
red-black relaxations of the implicit system (`ImplicitRelaxation`).

- The default stays bit for bit LU-SGS: 300 steps with and without
  Anderson give identical states against the previous commit.
- Both reach the explicit scheme's drag within 1e-12 on the Mach 2
  cone.
- Steps on the 7 deg cone with Anderson (depth 8), against LU-SGS's:
  - Mach 1.2: Jacobi with 4 sweeps 850 and 900 on r = 1 and 2, red-black
    with 2 sweeps 900 and 1,000, against LU-SGS's 700 and 700;
  - Mach 1.1: Jacobi 1,000 on r = 1, against 950.

  They reach the same drags within 7e-9. CPU cost per cell and step is
  2.5e-6 s (Jacobi) and 2.0e-6 s (red-black), against LU-SGS's 1.5e-6
  without Anderson. The rest (1.1, 1.05, and without Anderson) is
  running.

- A third data-parallel form needs no new iteration: LU-SGS's own
  sweeps run by diagonals. Cell (i, j) of the forward sweep waits only
  for (i - 1, j) and (i, j - 1), so every cell with the same i + j can
  be solved at once. That is the same iteration as on the CPU, at
  ni + nj dispatches per sweep (2,370 per step on r = 8), each with at
  most nj cells, which is a dispatch-bound cost to measure on hardware.

**Step 3 (G1), done (2026-10-21).** The far-field boundary in
`euler2d.wgsl`, `tests/gpu/transonic-gpu.test.ts`. On SwiftShader, on
the cone's base grid at Mach 1.1:

- From the free stream, after 100 explicit steps, the GPU's pressures
  are within 4.9e-6 of the CPU's.
- From the CPU's converged solution, the GPU's drag wanders about the
  CPU's: +1.5e-6, -6.2e-6, -2.9e-6, +3.3e-6 and +4.8e-6 of it after
  100, 500, 1,500, 3,000 and 5,000 explicit steps. Its density
  residual stays near 3e-6 throughout.

**What the wander means for the page.** It is three times the GPU's
noise on supersonic flows (2e-6, 0005). It comes from the 32-bit
residual, not the 32-bit state: on the CPU, rounding the state to 32
bits after every step (the residual still in double) freezes the drag
within 4e-8 of its converged value, with explicit, LU-SGS and Jacobi
steps alike (`tests/tmp-transonic/f32-wander.test.ts`).

The procedure with a noise of 1e-5 refuses cases it certifies at 2e-6.
The cone at Mach 1.1 on r = 2 to 16 becomes `unresolved`, its changes
too small to measure against that noise, and so does the 5-caliber
ogive at 1.2. So the page cannot serve those with the 32-bit residual
as it is.

The next steps, in order:

- measure the wander under the GPU's implicit steps (step 4), which
  damp the slow modes the noise excites far faster than explicit
  steps;
- if it stays above about 2e-6, evaluate the residual on the GPU in
  two-float (double-single) arithmetic, at several times the cost of a
  step, or finish each grid's last steps on the CPU in double.

This is the plan's main open risk.

**Step 4 (G2), the red-black implicit step on the GPU, built
(2026-10-21).** `GpuEuler2D.iterateImplicit` and `setImplicitCfl`, in
`src/engine-gpu/shaders/euler2d-implicit.wgsl`, the twin of the CPU's
red-black relaxation. On SwiftShader, on the cone's base grid:

- From the free stream, after 30 steps with the CFL number ramped from
  1, the GPU's pressures are within 2.8e-6 (Mach 1.1) and 3.3e-6 (1.05)
  of the CPU twin's.
- One step with two sweeps takes 22 to 26 ms on these 3,540 cells, under
  the shared machine's load.

**The wander under the implicit steps is larger, not smaller.** From
the CPU's converged solution, sampled every 250 steps over 3,000:

| Mach | Implicit (CFL 1000) | Explicit     |
| ---- | ------------------- | ------------ |
| 1.1  | up to 7.1e-5        | up to 1.7e-5 |
| 1.05 | up to 7.6e-5        | up to 6.0e-5 |

The implicit step turns the 32-bit residual's noise into changes of the
state far larger than the explicit step's small local steps do. Under
the rule of 2026-10-21 (above), a wander above about 2e-6 means the
two-float residual. So the 32-bit transonic solve is not used for the
page.

**Next, step 4b: the two-float path.**

- The state is held in two-float (a high and a low 32-bit part).
- The residual, with the reconstruction, HLLC, the far-field and wall
  states and the axisymmetric source, is evaluated in two-float
  arithmetic. Its fixed point is then that of a residual accurate to
  about 1e-14.
- The implicit operator can stay in 32 bits, since it changes only the
  path.
- Cost measured on a small kernel of the flux's operations (add,
  multiply, divide, square root; `tests/tmp-transonic/gpu-df-cost.test.ts`):
  5.5 times the 32-bit arithmetic on SwiftShader, before the doubled
  memory traffic. The page's times above grow by about that factor.
- Its test: the GPU's two-float residual against the CPU's double one
  on the same state, to about 1e-12.

**Step 4b, done (2026-10-22; `6ee3849`).** `GpuEuler2DTwoFloat`
(`src/engine-gpu/euler2d-two-float.ts`, `two-float.wgsl`,
`euler2d-two-float.wgsl`). Measured on SwiftShader, the cone's base
grid:

- **The residual.** On a rough state (60 explicit steps from the free
  stream), the GPU's residual is the CPU's double one within 1.4e-10
  at Mach 1.1 and 1.0e-10 at 1.05. That is 2e-9 of the largest
  residual, about 1e-13 of the face fluxes times areas, which reach
  1e3 on the far cells: two-float precision.
- **No wander.** From the CPU's converged solution, the GPU's drag
  stays between -4.5e-12 and -9.5e-12 of the CPU's at Mach 1.1, and
  between -6.3e-12 and -9.5e-12 at 1.05, sampled every 250 steps over
  3,000. The 32-bit engine wandered by up to 7.6e-5 there.
- **Two things had to change on the way.**
  - SwiftShader does not fuse `fma`, and a two-float product came out
    3.4e-9 off. Products now use Dekker's splitting. A self-test, run
    once per device, refuses a GPU whose compiler loses the low parts.
  - With the neighbours' terms of the 32-bit implicit operator as the
    CPU's difference of fluxes, F(Q + dQ) - F(Q), the drag still
    wandered by 1e-5. That difference carries a 32-bit noise of the
    size of the flux, which does not shrink as dQ does. As the flux
    Jacobian applied to dQ, which is linear, the noise shrinks with dQ,
    and the wander went with it. The path then differs from the CPU
    twin's at second order in dQ: 1.3e-4 of the pressure after 30
    steps from the free stream, at the same fixed point.
- **Cost.** 89 to 96 ms per step on 3,540 cells, 3.7 times the 32-bit
  implicit step, under the shared machine's load.

**Step 5, done (2026-10-22; `aed95b0`).** `verifiedTransonicDrag`
(`src/analysis/transonic-drag.ts`) does what "What a page solve does"
describes, with `gpuTransonicEngine` (`src/analysis/gpu-transonic.ts`)
on the page.

- **Each grid's noise** is the largest of the settling test's noise
  (1e-7), its remaining change estimated geometrically, and the drag's
  spread over 4 checks after settling. The procedure uses the largest
  noise of the four grids.
- **The label** names Taylor-Maccoll for cones whose conical surface
  flow is supersonic. Otherwise it says "no exact reference at this
  Mach number" and names the validation cases.
- **Refusals** carry their reason: an unresolved family, with r = 16
  offered where the coarser triple oscillates and the finer one is
  monotone; far boundaries or a cylinder whose effect does not fall
  fast enough to bound; Mach 1.0 until the rule passes its test there;
  blunt noses, which have no nested domains yet; a grid that does not
  settle.
- **Tests:** on a synthetic engine (`tests/analysis/transonic-drag.test.ts`).

**Step 6, done (2026-10-22; `61100c9`).** The routing, outside the page
files: `solveNoseDrag` (`src/analysis/nose-drag-solve.ts`) picks the
transonic solve from Mach 1 to below 1.2 and the fitted solver from 1.2
(`solverFor`), and returns one shape for both (`NoseDragOutcome`: the
status, the value and its band, the text, the grids, a finer grid
offered, the solver's own result). Below Mach 1 it refuses. A fitted
solver's refusal by throwing becomes a refusal; a failed GPU is thrown.
`gpuNoseDragSolvers(device)` gives the page both solvers on its device.
The choice is pinned at Mach 0.999, 1, 1.1999, 1.2 and 1.2001.

**The interface's review of the result type (2026-10-22), one commit
each.**

1. Refusals and non-convergence carry a code (`reason`: 'mach-1',
   'blunt-nose', 'no-band', 'far-field', 'cylinder'; 'not-settled',
   'not-finite') and the sentence apart (`message`) (`55de905`).
2. `transonicNoseTerm` gives the total drag the transonic nose in the
   shape the fitted one has ({ value, uncertainty, grids }), so the
   page never combines bands itself. `band` is a half-width, as
   VerifiedDrag's `uncertainty` (`eef1ea5`).
3. A grid that does not converge comes back with the grids solved
   before it (`17a7424`).
4. The offered r = 16 grid carries its expected work, for the page to
   divide by its own measured rate: its steps (r = 8's times their
   growth from r = 4, which on the cone at Mach 1.1 gives 9,800 against
   the 7,300 measured), its cell updates, and the cell updates of the
   solve so far, which a solve to r = 16 repeats (`943d6be`).
5. Each grid, of the family and of the allowances, is given to
   `onLive` to draw as it converges, and null just before its buffers
   are released. The source is a 32-bit view of the two-float state
   (its high parts), refreshed after each batch of steps, on the
   grid's nodes, for drawing only. The fitted solver's fits come
   through the same hook (`df544c9`).
6. Progress is typed: a grid of the family, or an allowance's base grid
   with which allowance and which domain (`fc062b0`).
7. The range error's text and type are pinned, and the transonic
   solve's range is the router's (`4aef318`).

**The independent review of `aed95b0` (2026-10-22).** It verified the
two-float formulas, that no 32-bit quantity lies on the path to the
fixed point, that the implicit parts change only the path, that the GPU
equals the CPU, that the nested grids share their nodes, and that no
number is given without a settled grid. Its findings, one commit each:

- **B1**, Mach numbers just above 1 served on an untested rule: the
  solve refuses below Mach 1.05 (serving rule 8, amended).
- **S4**, long noses failing after the whole family was solved: the
  nested 50 radii lay inside the four nose lengths the grid needs for
  any nose 12.5 to 25 radii long, the 10-caliber ogive among them.
  - The far boundaries now lie at the larger of 100 radii and 10 nose
    lengths (`transonicDomains`), and the nested ones at half and twice
    that. This is unchanged for every body validated here: the cone,
    and the 3- and 5-caliber ogives, are at 100 radii. The 10-caliber
    ogive's family is at 200 radii, with its allowances at 100 and 400.
  - Every base grid is built, and the finest grid's size is checked
    against the engine's device, before any solve. A body the domains
    do not fit is refused ('domain'), and so is a device too small
    ('device-memory', also when a grid runs out of memory mid-solve).
    Neither throws, and the router turns any remaining
    `GpuMemoryLimitError` into a refusal too.
  - The allowances are solved right after the base grid, as the plan
    said, before the finer grids.
  - r = 16 is offered only where the device can hold it.
- **S1**, settling that a slow oscillation could pass. The settling
  test passed at the oscillation's turning points with the drag still
  3e-6 to 4e-6 from its limit, on the nested cone runs at Mach 1.0 and
  1.02 (periods of about 6,000 steps).
  - A damped-oscillation fit to the last third and the last quarter of
    each grid's history (`dampedOscillationBound`) must now decay and
    lie within 1e-7 before the grid counts as settled, and its bound
    enters the grid's noise.
  - Growing changes are not settling.
  - Each family grid passes its rate on to the next.
  - The residual must have fallen to half the largest seen on the
    grid, and still be changing. A residual 100 times its first value
    stops the grid as 'diverging'.
  - (WIP: the GPU engine's residual is not yet run on SwiftShader.)
- **The GPU's sweeps (found while measuring, 2026-10-22).** The page
  engine's red-black relaxation with 4 sweeps does not converge.
  - From the free stream at Mach 1.1 the drag came within 1.4e-5 of the
    CPU's by step 500, then fell into a limit cycle between 0.067 and
    0.164, with a period of about 4,700 steps on r = 1. The same
    happened on r = 2 (`tests/tmp-transonic/df-settle-rb4.txt`).
  - The CPU twin (red-black, no Anderson) behaves the same way, so the
    method fails, not the GPU. On the cone's base grid at Mach 1.1:
    1 sweep converged in 2,350 steps, 2 in 1,200, 3 in 800, and 4
    never did (residual near 1.5 after 8,000 steps). Jacobi with 2
    sweeps took 2,500.
  - Why: for the near-sonic acoustic wave the scalar operator's
    neighbour terms sum to the diagonal (both about 1.5 times the wave
    speed), so the relaxation's own iteration is not contracting there.
    Each extra sweep amplifies that wave, and between 3 and 4 sweeps the
    outer iteration fails.
  - With 2 sweeps, measured on the CPU twin: the cone at Mach 1.2
    (650 steps), 1.1 (1,200; r = 2: 2,100) and 1.05 (7,400), the
    5-caliber ogive at 1.1 (1,100) and the 3-caliber ogive at 1.2 (650).
    On SwiftShader: the cone at 1.1 settles in 1,200 steps (r = 1,
    4.9e-8 from the CPU) and 2,100 (r = 2), and at 1.2 in 650 (-4.9e-10
    from the CPU), at 110 to 120 ms per step on r = 1 and 560 ms on r =
    2 (`tests/tmp-transonic/df-settle2.txt`). The setting must become 2.
    Its margin on finer grids and other bodies is not yet measured.

**Mach 1.0: the family moved to 224.2 radii (owner's decision 7.3,
2026-10-22).** The allowance rule's own pre-registered next step ("The
allowance rule", above: "Moving the family to 224.2 radii, with 408.7 as
the third distance, is the next step if refusals here matter"), taken as
the advisor recommended (`advice/fable-2026-10-22.md` section 2 on the
handoff branch). DECAY_LIMIT stays 0.6. Below Mach 1.05 the family's own
grid is now the 100.6-radius grid continued, node for node, to 224.2
radii (`transonicDomains(body, mach)`; the base grid's `nested` far
field at twice the family's), and its far-boundary neighbours are the
100.6-radius grid itself and the same grid continued to 408.7 radii. The
cylinder's neighbours are 5 and 20 calibers on the moved grid. From Mach
1.05 nothing changes. Nothing below 1.05 is served yet (B1): the moved
family only changes what the offline solve (`allowNearSonic`) gives.

The evidence, in the order the advisor lists it. All on the base grid,
nested domains, plain LU-SGS steps, from `tests/tmp-transonic/results/
n-*.jsonl` (runs of 2026-10-22, settled by the test before S1, which
can leave a value up to about 4e-6 from its limit at these Mach numbers;
every change below is at least 25 times that, except where said).

1. **The nested changes and their ratios.** Drag at 55.1, 100.6, 224.2
   and 408.7 radii; c1, c2, c3 the three successive changes:

   | Case       | 55.1      | 100.6     | 224.2     | 408.7     | c1        | c2        | c3       | c2/c1 | c3/c2  |
   | ---------- | --------- | --------- | --------- | --------- | --------- | --------- | -------- | ----- | ------ |
   | cone, 1.0  | 0.0897885 | 0.0917153 | 0.0929283 | 0.0932884 | +1.927e-3 | +1.213e-3 | +3.60e-4 | 0.630 | 0.297  |
   | ogive, 1.0 | 0.0155313 | 0.0171707 | 0.0184068 | 0.0188677 | +1.639e-3 | +1.236e-3 | +4.61e-4 | 0.754 | 0.373  |
   | cone, 1.01 | 0.0997535 | 0.1026103 | 0.1035135 | 0.1034732 | +2.857e-3 | +9.03e-4  | -4.02e-5 | 0.316 | -0.045 |

   At Mach 1.0 the ratios fall outward (0.63 then 0.30 on the cone, 0.75
   then 0.37 on the ogive), as a power law with an exponent above about 1
   and these distance ratios implies: the exponents through three
   successive radii are 1.09 and 1.29 (cone) and 0.82 and 0.98 (ogive).
   With the family on 224.2 radii the rule's two changes are c2 and c3,
   of one sign, rho = 0.297 (cone) and 0.373 (ogive), both within 0.6:
   **the rule as written gives the cone at Mach 1.0 an allowance of
   |c3| / (1 - rho) = 5.12e-4 (0.55% of its 224.2-radius base-grid drag,
   0.0929283) and the ogive 7.35e-4 (4.0% of 0.0184068).** On 100.6
   radii the rule refused both (rho 0.63 and 0.75). **These two are not
   bounds** (re-review of `dd6c423`, below): on these uneven distance
   ratios the geometric remainder understates every pure power law.

   **At Mach 1.01 the moved family is worse, not better.** On 100.6
   radii the rule gave 1.32e-3 (rho 0.32), and C(408.7) - C(100.6) =
   +8.63e-4 lay inside it (test (b)). On 224.2 radii the rule's changes
   are +9.03e-4 and then -4.02e-5: the effect turns between 224.2 and
   408.7 radii, and the rule as written refuses a sign change. That is
   the sign-reversal case of the review's S2, which the next entry's
   rule handles.

2. **A consistency check, not the registered test.** The registered
   test (b) for the moved family would need a fourth distance beyond
   408.7 radii (about 800), where the implicit steps diverge ("Mach 1
   without the extrapolation"), so it cannot be run as written. Instead:
   the geometric bound from 55.1, 100.6 and 224.2 radii, computed with
   the measured rho although the rule refuses it there, must contain
   C(408.7) - C(100.6). Cone: |c2| / (1 - 0.630) = 3.27e-3 against
   +1.573e-3, contained. Ogive: |c2| / (1 - 0.754) = 5.03e-3 against
   +1.697e-3, contained. So the decay's form that the rule rests on
   holds one domain further out. This is a consistency check, and it is
   labelled so wherever it is quoted: it is not the rule's registered
   test, and it does not lift the near-sonic refusal (B1).

3. **Why the decay continues beyond 408.7 radii (the ordering).** A
   free-stream condition at a distance D is wrong by the perturbation
   there, which falls at least as fast as the measured local exponents
   (0.39 to 0.47 between 19 and 62 radii on 408.7 radii) and, in the
   far field's asymptotic forms, faster ("Mach 1 without the
   extrapolation"). The drag's own error falls faster still over these
   four distances (the exponents above, 0.8 to 1.3). That is the reason
   the remainder beyond the family's domain is taken to keep falling.

4. **The grid band.** Mach 1.0 needs four grids (r = 1 to 8) on the
   moved family for the procedure's band, and none of them beyond the
   base grid has been solved on 224.2 radii. r = 8 at Mach 1 is about
   300,000 steps ("Mach 1.0 itself"). Until a four-grid family exists a
   Mach 1.0 point has no band and is refused ('no-band' offline,
   'near-sonic' on the page), as rule 8 of "Serving below Mach 1.2"
   says. The cost would be stated on the page and the user would choose.

5. **Two cheap checks, not bands.**
   - Bryson's stationarity (TR 1094 eq. 43, as 0019 section 3.2 uses
     it) gives a forebody's drag a positive slope through Mach 1, so
     C_D(1.00) must lie below C_D(1.01). On every nested domain it does:
     0.0897885 < 0.0997535 (55.1 radii), 0.0917153 < 0.1026103 (100.6),
     0.0929283 < 0.1035135 (224.2), 0.0932884 < 0.1034732 (408.7).
   - Slender-body theory's slope at Mach 1, 1.64 (Spreiter and
     Alksne's eq. 80, "Near Mach 1"), against the one-sided three-point
     estimate from Mach 1.00, 1.01 and 1.02 on the nested domains: 1.28
     (224.2 radii) and 1.22 (408.7 radii), 22 to 26% below the theory.
     The secant from 1.00 to 1.01 is 1.06 and 1.02. The earlier figure
     of 1.49 to 1.54 ("Near Mach 1") came from the regridded domains,
     whose 408.7-radius grid put the drag at Mach 1.01 1.5e-3 higher
     than the nested one does. Since the drag curve bends over within a
     few hundredths of Mach 1, differences over 0.01 underestimate the
     slope at Mach 1, so the check says the sign and the order of
     magnitude agree, no more.

**Outcome.** rho is 0.30 and 0.37 at Mach 1.0 on the moved family,
within the limit of 0.6, so the rule as written no longer refuses Mach
1.0 offline; but its allowances there are not bounds (re-review of
`dd6c423`, below), and Mach 1.0 is still refused on the page (B1, and no
four-grid family). Mach 1.01 on the moved family is refused by the rule as written
(sign change) until the corrected rule below.

**The allowance rule corrected for sign reversal (review S2 and S3;
written 2026-10-22, before its code and before the runs of its test).**
The rule above has three faults the review found:

- S2: a change that reverses sign beyond the family's domain is not
  bounded. On the cone at Mach 1.01 to 1.02 the effect rises, peaks and
  falls back as the domain grows. The reviewer's synthetic A1 (c1 =
  +1.5e-3, c2 = +2e-6, and the true remainder -6e-5) passes as
  "decaying" with an allowance of 2e-6, 30 times too small: a tiny c2
  after a large c1 is the effect turning, not decaying.
- S3 (a): the negligible branch (the larger change within a quarter of
  the band) gives the larger change alone, which does not cover a slow
  decay beyond the largest domain.
- S3 (b): through the noise, more noise can turn a refusal into a pass.

The corrected rule, for three nested domains D0 < D1 < D2 (the family's
own is D1), with drags C0, C1, C2:

- **Inputs.** a = C1 - C0 and b = C2 - C1. The distances are the grids'
  own (their far radii; for the cylinder, its length in calibers), not
  the sizes asked for. The noise nu is the largest of the three grids'
  measured noises (relative).
- **The measurability level** m = 2 nu max(|C0|, |C1|, |C2|). It is
  added to every allowance, so no allowance is below it, and more noise
  only ever widens an allowance.
- **The slowest decay admitted**, Q_SLOW = 0.35: below every exponent
  measured here, the drag's (0.8 to 1.35 over four distances) and the
  far field's local pressure decay (0.39 to 0.47, "Mach 1 without the
  extrapolation"). A part of the effect that decays as D^-q with q at
  least Q_SLOW leaves, beyond D2, at most T times its change from D1 to
  D2, with T = 1 / ((D2 / D1)^Q_SLOW - 1): 3.09 for 100.6 and 224.2
  radii, 4.28 for 224.2 and 408.7, 3.64 for 10 and 20 calibers.
- **The fastest decay admitted**, Q_FAST = 3: a disturbance of a closed
  body in a subsonic stream falls off as a doublet's, the velocity as
  D^-3, and nothing that acts on the drag from far away falls faster.
  rho_fast is the ratio of successive changes that a single power law of
  exponent 3 gives over these distances: 0.179 for 55.1, 100.6 and
  224.2 radii, 0.083 for 100.6, 224.2 and 408.7, 0.125 for 5, 10 and 20
  calibers. A change falling faster than that is two parts of opposite
  sign cancelling, which is the effect turning.
- **The turning bound** U = |b| + T max(|a|, |b|) + m: the change to D2,
  plus a remainder beyond D2 that decays no slower than Q_SLOW from a
  size no larger than the larger measured change.

The branches, in order:

1. **Unmeasurable**: max(|a|, |b|) <= m. The allowance is U.
2. **Refused**: a = 0, or rho = |b| / |a| > DECAY_LIMIT (0.6) whatever
   the signs. The effect does not fall fast enough to bound.
3. **Decaying**: a and b of one sign and rho_fast <= rho <= 0.6. The
   allowance is |b| / (1 - rho) + m, the registered geometric bound
   plus the measurability level.
4. **Turning**: every other case, that is b opposite in sign to a with
   |b| <= 0.6 |a|, or one sign with rho below rho_fast. The allowance is
   U.

The negligible branch against a quarter of the band is withdrawn: the
allowance no longer depends on the family's band, so it is decided
right after the base grids and a refusal costs seconds. What the
turning bound assumes, said plainly: that the part of the effect still
to come after the turn changes, from D1 to D2, by no more than the
larger change measured, and decays no slower than D^-0.35 beyond. It is
an assumption about the far field's form, as the geometric bound is,
and the test below is what checks it.

**On the cases already seen (construction checks, not the test).** On
the reviewer's table, family on 100.6 radii (55.1, 100.6 and 224.2):
the cone at Mach 1.01 is decaying (rho 0.316), 1.32e-3 + m, against
C(408.7) - C(100.6) = +8.63e-4; 1.017, 1.019 and 1.02 are turning, U =
|b| + 3.09 |a| + m = 5.07e-3, 3.32e-3 and 2.48e-3, against -5.96e-5,
-1.01e-4 and -1.01e-4. All contain it (1.015 has no 55.1-radius run).
On the family moved to 224.2 radii (no larger domain to check against):
Mach 1.0 decaying, 5.12e-4 + m (cone) and 7.35e-4 + m (ogive); 1.01
turning, 4.02e-5 + 4.28 x 9.03e-4 + m = 3.90e-3 (3.8% of the drag);
1.015, 1.017, 1.019 and 1.02 turning, 3.0e-4, 2.6e-4, 4.4e-4 and
4.4e-4. Synthetic A1 (55.1, 100.6, 224.2): rho = 0.0013, below
rho_fast, so turning, U = 2e-6 + 3.09 x 1.5e-3 + m = 4.6e-3, against
the true -6e-5. The turning bound is wide: up to 5% of the drag at
Mach 1.017 on 100.6 radii, where the registered rule refused.

**Its test (pre-registered; the runs are made after this commit,
`tests/tmp-transonic/queue-s2test.txt`).** Six cases not run before, on
the base grid with nested far boundaries at 55.1, 100.6, 224.2 and
408.7 radii (10 calibers): the 7 deg cone at Mach 1.005, 1.0125 and
1.025, and the 5-caliber ogive at Mach 1.01, 1.02 and 1.03.

- For each, the rule applied to 55.1, 100.6 and 224.2 radii, with
  nu max|C| = 3.5e-6 (so m = 7e-6: the largest distance from its limit
  that S1 found on the nested runs settled by the old test, 3.4e-6,
  rounded up), must contain C(408.7) - C(100.6) wherever it gives an
  allowance. A refusal is not a failure; it is reported.
- If any case fails, the correction is withdrawn: sign changes and
  changes falling faster than rho_fast are refused, as the registered
  rule refuses sign changes, and B1 stays.
- If every case passes, B1 still stays on this branch. The evidence goes
  to the owner, through the re-review, with the proposal to lower
  NEAR_SONIC_LIMIT; a Mach number below 1.05 also needs its four-grid
  family, which the page's own request solves.
- The family moved to 224.2 radii has no test of this kind (it needs a
  domain near 800 radii, where the steps diverge). Its allowances are
  the rule's, with the consistency check of the previous entry.

**The corrected rule, coded (after the entry above was committed in
`20ab07a`).** `domainAllowance(values, distances, noise)`
(`src/verification/domain-allowance.ts`), with kinds 'unmeasurable',
'decaying', 'turning' and 'refused'; the driver passes the grids' own
far radii and cylinder lengths, and stops with the refusal right after
the base grids. Its tests (`tests/verification/domain-allowance.test.ts`,
`tests/analysis/transonic-drag.test.ts`) pin the constants, the
reviewer's table on both families as listed above, A1 directly and
through the driver, and that an allowance never narrows as the noise
grows. One limit of S3 (b) remains, said plainly: more noise can still
move a case whose changes do not fall from 'refused' to
'unmeasurable', once both changes are below the measurability level.
Its allowance is then the turning bound, at least (1 + T) times the
larger change plus m, which holds any remainder decaying no slower than
D^-0.35 from changes of that size; it is not refused.

**S5, the device's precision, and the sweeps pinned (owner's decision
7.4: 2 sweeps).**

- **Once per solve**, after the first batch of steps on the family's
  base grid, the engine's residual on the GPU is compared with the CPU's
  double one on the same state read back (`checkPrecision`,
  `residualPrecision` in `src/analysis/gpu-transonic.ts`). A difference
  above 1e-6 of the largest residual refuses the solve,
  'device-precision', with the measured figure in the message.
  Two-float arithmetic measured 2.2e-9 of it on SwiftShader (step 4b);
  32-bit face fluxes of order 1e3 would lose about 1e-4 against residuals
  of order 0.1, some 1e-3 of it. The per-device self-test now throws
  the same kind of error (`GpuPrecisionError`), so a GPU whose compiler
  loses the low parts is also a 'device-precision' refusal, in the
  driver and in the router, and never an exception.
- **The refusal paths are tested without a GPU**
  (`tests/engine-gpu/two-float-checks.test.ts`): the self-test's
  verdict on results with each low part dropped, or a NaN; the residual
  check on two-float and 32-bit sized differences.
  `tests/analysis/transonic-drag.test.ts` checks that the driver calls
  the check exactly once per solve and refuses on it, and on a self-test
  failing at creation; `tests/analysis/nose-drag-solve.test.ts` the
  router.
- **G3** (`tests/gpu/transonic-gpu.test.ts`): `gpuNoseDragSolvers` on
  SwiftShader, the cone at Mach 1.1, stopped after r = 2. Its r = 1 and
  r = 2 drags must be the CPU driver's within 3e-7, each settled in fewer
  than 6,000 steps (4,000 before the fitted-window rule of the re-review
  of `dd6c423`) under a cap of 8,000 a grid, which a limit cycle
  (4 sweeps) cannot meet. It pins `GPU_TRANSONIC_SWEEPS` at 2 by
  behaviour, not only by value. Also on SwiftShader: the precision check
  passes on a rough state of the cone.
- **Measured on SwiftShader (2026-10-22, 10:56 to 11:26 UTC):**
  `tests/gpu/transonic-gpu.test.ts`, 8 of 8 pass, among them the
  precision check and G3. 2 sweeps on r = 4 and 8 are not measured on
  the GPU: r = 4 is about 2 s a step there, some hours for a settled
  grid on this shared machine, and was not run. On the CPU twin the
  margin on r = 4 and 8 is not measured either.

**The corrected rule's pre-registered test: passed (runs of 2026-10-22,
10:41 to 11:59 UTC, `tests/tmp-transonic/results/t-*.jsonl`, evaluated
by `tests/tmp-transonic/s2test-eval.test.ts`).** The rule on 55.1, 100.6
and 224.2 radii with m = 7e-6, against C(408.7) - C(100.6):

| Case         | a         | b         | Rule                                     | Allowance | C(408.7) - C(100.6) | Verdict                |
| ------------ | --------- | --------- | ---------------------------------------- | --------- | ------------------- | ---------------------- |
| cone, 1.005  | +2.648e-3 | +1.819e-3 | refused (rho 0.69)                       |           | +2.152e-3           | refused, not a failure |
| cone, 1.0125 | +2.625e-3 | +3.942e-4 | turning (rho 0.15, below rho_fast 0.179) | 8.51e-3   | +3.731e-4           | contained              |
| cone, 1.025  | -6.655e-5 | -3.909e-5 | decaying                                 | 1.018e-4  | -3.877e-5           | contained              |
| ogive, 1.01  | +2.038e-3 | +5.723e-4 | decaying                                 | 8.028e-4  | +5.367e-4           | contained              |
| ogive, 1.02  | +8.586e-4 | -8.778e-5 | turning                                  | 2.747e-3  | -8.674e-5           | contained              |
| ogive, 1.03  | -1.914e-4 | -3.523e-5 | decaying                                 | 5.018e-5  | -3.497e-5           | contained              |

Every allowance given contains the larger domain's change, so the rule
stands. Said plainly:

- the runs were settled by the test before S1, which can leave a value
  some 3e-6 from its limit; every containment above has a margin larger
  than that (the smallest, the ogive at 1.03, is 1.5e-5);
- the turning bounds are wide (8.5e-3 is 8% of the cone's drag at Mach
  1.0125, where the change actually was 3.7e-4): the bound is honest, not
  tight;
- the family moved to 224.2 radii, which the driver uses below Mach
  1.05, is not tested by this (it needs about 800 radii); there the rule
  gives, for these cases, 4.1e-4 (cone 1.005, decaying), 1.7e-3, 1.7e-4,
  2.5e-3, 3.8e-4 and 1.6e-4 (turning).

As registered, B1 stays on this branch: lowering NEAR_SONIC_LIMIT is a
proposal for the owner after the re-review, and any Mach number below
1.05 would still need its own four-grid family.

**The moved family's cylinder (base grid, 5, 10 and 20 calibers on 224.2
radii):** cone at Mach 1.0: changes -3.8e-10 and +1e-12; ogive 1.0:
+2.7e-12 and -2.7e-12; cone 1.01: below 1.2e-12. All below the
measurability level.

**S6, the labels (2026-10-22).**

- The driver now computes Taylor-Maccoll's drag itself for a cone whose
  conical surface flow is supersonic (`exactDrag`), and the label names
  the exact solution only with that check: "checked here against the
  exact solution (Taylor-Maccoll's, surface Mach number ...): exact ...,
  the solve's error ..., inside the band" (`reference.check`). A band
  that does not contain that error is refused ('no-band', with both
  figures). The exact value never enters the band.
- Where the domain's allowances are larger than the procedure's band
  and the floor together, the label adds: "most of the band (X of Y) is
  the allowance for the truncated domain, which assumes its effect keeps
  decaying beyond the largest domain solved and is checked against no
  reference" (the reviewer's A6 case and the near-sonic cases).
- Where no exact solution exists, the validation cases are named as
  measured: Taylor-Maccoll's exact solution on the 7 deg cone at Mach
  1.1 and 1.2, and the method of characteristics (not an exact
  solution) on the 5-caliber ogive at 1.2.

**Minor items (2026-10-22).** The floor's comment and serving rule 3
now give units (6.8e-6 of the value at Mach 1.2, 1.0e-7 absolute at
1.1); Dekker (1971) and Knuth are in `docs/validation/sources.md`; Haack
noses and power-law noses below exponent 1 are refused with their own
reason, 'vertical-tip', not 'blunt-nose'.

**Before and after: every certified and recorded number**
(`tests/tmp-transonic/before-after.test.ts`; offline CPU families,
nested base grids, noise 1e-7; "before" is the rule as reviewed, which
the reviewer's recomputation matches, "after" the corrected rule):

| Case                                 | Value                | Grids    | Floor    | Far, before | Far, after         | Cylinder, before | Cylinder, after | Band, before | Band, after              | Exact                             |
| ------------------------------------ | -------------------- | -------- | -------- | ----------- | ------------------ | ---------------- | --------------- | ------------ | ------------------------ | --------------------------------- |
| cone, 1.2 (r = 1-8; validation only) | 0.0830132            | 3.076e-6 | 5.811e-6 | 8.7e-9      | 5.2e-8             | 7.8e-9           | 4.9e-8          | 8.903e-6     | 8.988e-6                 | 0.0830113, error +1.90e-6, inside |
| cone, 1.1 (r = 2-16)                 | 0.0944950            | 3.129e-6 | 6.615e-6 | 3.4e-9      | 3.1e-8             | 1.0e-8           | 6.2e-8          | 9.757e-6     | 9.836e-6                 | 0.0944976, error -2.61e-6, inside |
| cone, 1.1 (r = 1-8)                  | refused (oscillates) |          |          |             |                    |                  |                 | refused      | refused (r = 16 offered) |                                   |
| cone, 1.05 (r = 1-8)                 | 0.1071116            | 7.044e-5 | 7.498e-6 | 6.41e-6     | 1.995e-5 (turning) | 6.0e-9           | 4.1e-8          | 8.435e-5     | 9.793e-5                 | none                              |

Far boundaries alone (base grids): the ogive at 1.1, 4.1e-9 before and
2.5e-8 after; the ogive at 1.05, 3.09e-6 and 3.10e-6; the cone at 1.02
on 100.6 radii, refused before and 2.48e-3 (turning) after; the cone at
1.01 on 100.6 radii 1.32e-3 both; on the moved family at Mach 1.0, the
cone 5.12e-4 and the ogive 7.35e-4 both, and at 1.01 refused before and
3.90e-3 (turning) after. The page serves none of these yet; below 1.05
all stay refused (B1).

**Case A, the subtip cross-check: the 3-caliber tangent ogive at Mach
1.2 (r = 8 landed 2026-10-22, 11:37 UTC).** r = 1 to 8: 0.1095230,
0.1089110, 0.1088724, 0.1088983 (4,400 steps on r = 8). The procedure:
oscillatory (changes -6.12e-4, -3.86e-5, +2.59e-5), band 3.86e-5; the
floor 7.6e-6; the far boundaries 1.4e-7 and the cylinder 9.3e-8 (nested
base grids, corrected rule). **0.1088983 +- 4.65e-5, confirmed** (r = 8 settled by the fitted-window rule after 12,000 more steps, within 4e-11; see the re-review of `dd6c423`). This is a
validation-style offline number (the driver serves below 1.2); it was
computed without seeing the subtip work's value.

**The re-review of `dd6c423` (2026-10-22): merge after fixes.** Its
findings and what was done, one by one.

1. **S1 was half fixed (blocking).** `dampedOscillationBound` fits
   only windows of at least 10 thinned values (the last third and
   quarter of the history), so a history shorter than about 30 checks
   fitted nothing and counted as decaying with a bound of 0. The finer
   grids, started from the coarser solution, settle in a few checks, so
   the check was skipped on the grids that set the band. Fixed: a grid
   is not settled until at least one window is fitted (`fitted` in
   `OscillationBound`); the solve keeps iterating until one is. The test
   (`tests/analysis/transonic-drag.test.ts`, after the reviewer's case):
   the 10-caliber ogive at Mach 1.1, r = 2, 4 and 8 starting paused and
   then moving away by up to 1e-3. Before the fix the family was served
   (measured); now r = 2 does not settle. The reviewer's own stub (the
   drag v (1 + 1e-3 cos(2 pi (check - 6) / 1200)) on r = 2, 4 and 8) was
   served on `dd6c423` (0.1001125 +- 2.27e-5, 1e-3 from its limit) and
   is not converged on `0613b3f`, by the re-reviewer's check. (A note of
   mine outside this record said that stub did not settle even before the
   fix; that was wrong: my version of it differed.)

   **The certified offline numbers against this rule.** They come from
   `family.test.ts` (not the driver), whose grids stopped on the
   settling test. Their recorded histories (`tests/tmp-transonic/
s1-recheck.md`) have fewer than 30 checks on every grid of the cone
   at Mach 1.2 and 1.1 and of case A, and 3 on the cone's r = 8 at 1.05
   (resumed from a checkpoint); only the cone's r = 1 to 4 at 1.05 have
   fitted windows (bounds 6e-8 to 9e-8 of the drag, decaying). So under
   the fixed rule these grids are unverified, not refuted. The cone at
   Mach 1.2 and 1.1 is checked independently: Taylor-Maccoll's exact
   value lies inside its band (errors +1.90e-6 and -2.61e-6), which a
   grid stopped 1e-3 from its limit would not give. The cone at 1.05 (r = 8) and case A have no such check: their values stand as recorded but
   their grids' settling is not confirmed by the fitted-window rule.
   **Continued since (2026-10-22, 22:36 to 23:47 UTC,
   `tests/tmp-transonic/continue.test.ts`, results on
   `claude/wip/results`):** each r = 8 was run on from its saved state
   (plain LU-SGS, CFL 1000) until a fitted window existed, decaying,
   within 1e-7 of the drag (31 checks, 12,000 steps). Case A moved by
   3.9e-11 (bound 2.4e-14): **0.1088983 +- 4.65e-5 is confirmed.** The
   cone at Mach 1.05 moved by +5.75e-8 (bound 4.4e-9) to 0.10711168:
   **0.1071117 with a band of 9.808e-5** by the corrected rule (procedure
   7.059e-5 at order 1.21, floor 7.50e-6, far boundaries 1.995e-5,
   cylinder 4e-8), against 0.1071116 and 9.793e-5 before; the change is
   0.06% of the band.
   Continuing each from its saved state for 30 checks would settle it
   (some hours each on one core); not done.

2. **The "decaying" branch is not a bound on the moved family.** With
   the uneven distance ratios of 100.6, 224.2 and 408.7 radii (2.23 then
   1.82), |b| / (1 - rho) understates every pure power law of exponent
   0.35 to 2: the allowance over the true remainder is 0.46 at exponent
   0.35, 0.66 at 0.8, 0.71 at 1, 0.78 at 1.35 and 0.85 at 2, and the rule
   never refuses there. **So the moved family's Mach 1.0 allowances
   (5.12e-4 on the cone, 7.35e-4 on the ogive) are not bounds;** on the
   cone's measured exponent near 1.3 the remainder would be about 6.6e-4,
   not 5.1e-4. Said where the numbers appear above. On the served family
   (55.1, 100.6 and 224.2 radii, ratios 1.83 then 2.23) the branch holds:
   wherever rho is at most 0.6 (exponents from about 1.2) the allowance is
   1.2 to 1.4 times the true remainder. The cylinder (5, 10, 20
   calibers, ratios 2 and 2) is exact for a pure power law at m = 0: a
   ratio of 1.00, with no margin. **Pre-registered next step (written
   2026-10-22, before any code for it):** the decaying branch is used
   only where D2 / D1 >= D1 / D0; elsewhere the case is bounded as
   turning or refused. Its test, before any proposal to serve below Mach
   1.05: the pure power laws of exponent 0.35 to 3 on every distance set
   the driver uses, each allowance at least the true remainder, and the
   six cases of the test above re-evaluated. No code yet.

3. **What the turning bound really assumes.** Its T uses D^-0.35, but
   that alone does not make it a bound: two parts of opposite sign
   decaying as D^-0.5 and D^-1 break it (allowance over truth 0.94, 0.74
   and 0.60 for b = -0.1 a, -0.3 a and -0.55 a), and one-signed D^-0.5 +
   D^-2 gives 0.96 to 0.97 in the decaying branch. With exponents at or
   above the measured 0.8 it held in every mix the reviewer tried. The
   assumption, stated now in the constants' comments, here and in the
   label: **both parts of the effect decay as D^-0.8 or faster, or what
   remains beyond the largest domain is no larger than the largest
   change measured.** The label carries it for every turning allowance
   (the cone at Mach 1.05, whose far boundaries are turning, 1.995e-5),
   and for the others where they are most of the band; "assumes its
   effect keeps decaying" is gone.

4. **The pre-registered test's data, in this record** (base grid,
   nested domains; m = 7e-6; runs `t-*` on `claude/wip/results` at
   `e703a02`, evaluated by `s2test-eval.test.ts` there):

   | Case         | C(55.1)   | C(100.6)  | C(224.2)  | C(408.7)  | a         | b         | Rule     | Allowance | C(408.7) - C(100.6) | Margin  |
   | ------------ | --------- | --------- | --------- | --------- | --------- | --------- | -------- | --------- | ------------------- | ------- |
   | cone, 1.005  | 0.0945430 | 0.0971910 | 0.0990099 | 0.0993428 | +2.648e-3 | +1.819e-3 | refused  |           | +2.152e-3           |         |
   | cone, 1.0125 | 0.1025498 | 0.1051750 | 0.1055692 | 0.1055481 | +2.625e-3 | +3.942e-4 | turning  | 8.509e-3  | +3.731e-4           | 8.14e-3 |
   | cone, 1.025  | 0.1103603 | 0.1102938 | 0.1102547 | 0.1102550 | -6.655e-5 | -3.909e-5 | decaying | 1.018e-4  | -3.877e-5           | 6.30e-5 |
   | ogive, 1.01  | 0.0246432 | 0.0266810 | 0.0272533 | 0.0272177 | +2.038e-3 | +5.723e-4 | decaying | 8.028e-4  | +5.367e-4           | 2.66e-4 |
   | ogive, 1.02  | 0.0354020 | 0.0362606 | 0.0361728 | 0.0361739 | +8.586e-4 | -8.778e-5 | turning  | 2.747e-3  | -8.674e-5           | 2.66e-3 |
   | ogive, 1.03  | 0.0393246 | 0.0391332 | 0.0390980 | 0.0390983 | -1.914e-4 | -3.523e-5 | decaying | 5.018e-5  | -3.497e-5           | 1.52e-5 |

   The smallest margin, 1.5e-5 (the ogive at 1.03), survives a likely
   settling error of these runs (about 3e-6 on each of the four values),
   but not a strict worst case (about 1.7e-5, the errors all adding up).

5. **allowNearSonic** is off the page-facing request (`NoseDragRequest`):
   only the driver's own options carry it, for offline tests.
6. **Smaller.** `RESIDUAL_PRECISION` is 1e-8 (two-float measured 2.2e-9,
   a margin of 4.5; 32-bit some 1e-3); `checkPrecision` is required of
   every engine (the CPU's passes at once); only the grids' own refusals
   are 'domain' refusals, and any other RangeError is thrown. The
   reviewer's finding that more noise can turn a refusal into
   'unmeasurable' stays as disclosed above.

No served number changes (nothing is served below Mach 1.2 yet). The
recorded numbers that change in meaning, not value: the moved family's
Mach 1.0 allowances, now stated not to be bounds; and the cone at 1.05
and case A, whose grids are unconfirmed by the fitted-window rule.

## Certification plan below Mach 1.2 (written 2026-10-20, before its runs)

(Superseded as a serving rule by the owner's decision of 2026-10-21,
above. Its runs now validate the procedure, and its rule that the
procedure is not changed after seeing results still holds.)

The owner's decision: nothing below Mach 1.2 is shown until the
procedure as it stands (`gridConvergence`, the supersonic page's rule)
certifies a band there, or until a change to the procedure is written
down and justified before the runs that would test it. Blunt noses stay
unserved below Mach 1.5 (the stagnation line's pointwise error, above).
This section is that plan; the runs it names are made after it is
committed, and their results are judged by it as written.

**What certifies a case.** The procedure applied to the four finest
grids of a family (it uses only those) returns a band (`monotone` or
`oscillatory`); at a Mach number with an exact reference the band must
also contain the finest grid's error against it, on every reference
case run. The far boundaries' and the cylinder's errors are not in the
band: they must be measured at that Mach number (base grid, 55.1 to
224.2 radii, 5 to 20 calibers) and be below a quarter of the band, or
else be added to it (their largest measured change, once). An
`unresolved` result is a refusal, and the case stays unserved.

**Mach 1.1.**

- The 7 deg cone, reference Taylor-Maccoll (0.0944976): r = 16 (906,240
  cells), so that the four finest grids are r = 2, 4, 8, 16. If the
  procedure returns `unresolved` again, Mach 1.1 stays refused.
- A curved nose: the 5-caliber ogive has no reference here (the method
  of characteristics refuses it at Mach 1.1: the flow at its 11.4 deg tip
  is not supersonic). A 10-caliber tangent ogive (5.7 deg tip) has one:
  0.0114666, 0.0114565, 0.0114541 and 0.0114534 on 160 to 1280 intervals,
  converging at second order to 0.011453 (start line at 1e-3). Its family
  r = 1 to 16 at Mach 1.1, certified as the cone. (The characteristics
  refuse it at Mach 1.05.)
- First the cost of r = 16 is measured on its first steps (time per step
  and memory) and reported before the runs are committed. (Measured: 1.1
  to 1.6 GB, 1.9 s of CPU per step; the cone's r = 16 certified Mach 1.1,
  above.)

**Mach 1.05.** The cone's r = 8 and r = 16, certified by the procedure
(r = 8 settled by the fitted-window rule after 12,000 more steps, 5.8e-8 higher: 0.1071117 with a band of 9.808e-5 by the corrected rule; see the re-review of `dd6c423`) alone (no exact reference exists for any nose here: Taylor-Maccoll's
conical flow is subsonic at the cone's surface, and the characteristics
refuse the ogives). The far boundaries' change from 100.6 to 224.2
radii on the base grid (+1.3e-5) and the cylinder's (up to 7e-6) are
added to the band if above a quarter of it. (Result: r = 1 to 8 already
give a monotone band, so r = 16 was not needed; certified, above.)

**Mach 1.** Two parts, both needed:

- _The far boundaries, as a written rule._ On the base grid, the drag on
  far boundaries at D1 = 100.6, D2 = 224.2 and D3 = 408.7 radii; the
  power law C(D) = C_inf - k D^-q through the three (q solved); the
  correction C_inf - C(D1) is added to the grid family's value at D1,
  with an uncertainty equal to C_inf - C(D3) (all of the extrapolation
  beyond the largest domain solved). The rule holds only if the
  correction from D1 to D3 on r = 2 agrees with the base grid's within a
  tenth of that uncertainty (measured: 6e-6 against 2.5e-4 to 3.4e-4, so
  it holds for the cone). Its test where the answer is known: the same
  rule applied at Mach 1.2 to the cone and the 5-caliber ogive (D1 to D3
  on the base grid) must leave their certified bands containing their
  errors against Taylor-Maccoll and the characteristics. That test only
  shows the rule does no harm where the far boundaries hardly matter;
  no case with a known answer has a large far-boundary effect.
  **Result of the test (run after this plan was committed): the rule
  fails it.** At Mach 1.2 on the base grid the drag on 100.6, 224.2 and
  408.7 radii is 0.0832184, 0.0832239 and 0.0832267 (cone) and 0.0437833,
  0.0437719 and 0.0437681 (ogive). The rule reads these changes, which
  are the grid's (the grid changes with the domain, and at Mach 1.2 the
  cone's drag cannot depend on it), as a correction: +1.54e-5 with an
  uncertainty of 7.1e-6 on the cone, -1.93e-5 with 4.1e-6 on the ogive.
  Added to the r = 8 values, the cone's error against Taylor-Maccoll
  grows from +1.9e-6 to +1.73e-5, outside the combined band (1.01e-5);
  the ogive's from -9.7e-6 to -2.9e-5, inside its wider band (5.2e-5).
  So the rule as written is refuted, and Mach 1 cannot be certified with
  it. A replacement would have to separate the domain's physical effect
  from the grid noise that comes with changing the domain (for example
  a grid whose near-body part is identical node for node whatever the
  far distance), be written down first, and be tested again.
- _The grid, at D1._ The procedure needs a fourth grid, r = 8 at Mach 1.
  r = 4 had not settled after 89,200 steps (its value is a fitted
  estimate); the steps grow about 2 to 3 times per refinement, on 4 times
  the cells, so r = 8 would need several hundred thousand steps of about
  2 s each on this machine: weeks. It is not run unless the Mach 1
  iteration is made faster first (its slow mode is a damped oscillation
  of period about 22,600 steps on r = 4); until then Mach 1 stays
  refused. Option B (a domain large enough to need no rule) waits on the
  divergence near the axis at 800 radii.

**Additions (written 2026-10-21, before their runs).** The procedure and
the rules above are unchanged. These runs only give it more cases.

- _The 5-caliber ogive at Mach 1.1 and 1.05._ r = 8 at both, so that
  each family has four grids (r = 1 to 8). They are judged by the
  procedure as it stands. Neither Mach number has a reference for this
  ogive, since the characteristics refuse it below 1.2. At Mach 1.1 the
  10-caliber ogive (running) is the curved nose with a reference, and at
  Mach 1.05 no nose has one, as for the cone. On the base grid at each
  Mach number, the far boundaries (55.1 and 224.2 radii) and the
  cylinder (5 and 20 calibers) are measured. Their largest change is
  added to the band if it exceeds a quarter of it. If the procedure
  returns `unresolved`, the case stays refused; r = 16 would be
  considered only as at Mach 1.1 on the cone, that is if the finer
  triple is monotone. (2026-10-21: at Mach 1.1 it is, at order 0.40, so
  r = 16 is queued.)
- _The hemisphere at Mach 1.5._ r = 8, to see whether the gap between
  its extrapolation and the fitted solver's (7.0e-4 of the value at
  second order) closes as the ellipsoid's did with r = 8. This is not a
  certification: blunt noses stay unserved below Mach 1.5, and at 1.5
  the fitted solver serves them.

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

## Below Mach 1: registered, not run (2026-10-24)

Nothing below Mach 1 has been solved or recorded here. 0014 10.7 (y)
registers, before any such value exists, the verification of this solver
at Mach 0.6 to 0.99 on TN 4233's cone-cylinder and the bound of the far
boundaries' effect for the rows at Mach 1.001 to 1.041 (the 800-radius
test of the moved family): the rungs, the exact references (zero nose
drag of a nose on a semi-infinite cylinder in shock-free subsonic flow;
total pressure conserved on the cone wall), the level checks, the
independent code (SU2, the owner's machine), the absolute scale S below
Mach 1, the absolute floor, the tolerances and what a fail means. Its
rules are `src/validation/subsonic-verification.ts`; its evaluation
`docs/research/nose-model-form/verify-subsonic.test.ts`; its results,
when they exist, are recorded here as a dated section in the form of the
Mach 1.2 and 1.1 sections above. Coded with it: the decaying branch of
the allowance rule is used only where the distance ratios do not shrink
outward (the re-review of `dd6c423`, item 2), so on the moved family
every allowance is the turning bound or refused; the Mach 1.0
allowances once quoted as 5.12e-4 and 7.35e-4 become 5.55e-3 and
5.75e-3. This does change served bands (the review of 84474a6..69711ee,
finding 1; `a608828`'s message "nothing served changes" was wrong): the
served family's far boundary is 10 nose lengths for noses longer than 5
calibers (`transonicDomains`), whose grids' own radii then shrink in
ratio outward too (5.5 calibers: 55.1, 122.9, 224.2; 8: 82.3, 183.5,
334.6; 10: 100.6, 224.2, 408.7), so a decaying far-field effect on such
a nose now takes the wider turning bound (a 5.5-caliber nose at Mach 1.1
with changes 1e-3 and 4e-4: 4.7e-3 instead of 6.7e-4). Wider, never
narrower; the page's bands for long noses change by it, and that change
needs its own review before it reaches main. The cone and the 3- and
5-caliber ogives (far boundary 100 radii) are unchanged.

## Below Mach 1: results (2026-10-25, after the independent results review)

0014 10.7 (y)'s runs on this machine's CPU (lanes A, B and C of
2026-10-24 and 25; the solve files in
`docs/research/nose-model-form/out/blind-run-3/solves/` and
`out/far-800/`, the evaluation's report and record
`out/verify-subsonic.out` and `.json`, written by the committed
`verify-subsonic.test.ts` at `cfc79da` on the solves as committed) and
the independent results review of `e412609`, which recomputed every
verdict by hand and confirmed them. The owner's GPU runs of the Mach
0.901, 0.960 and 0.991 rungs and the SU2 runs (R5) have not been made;
nothing below Mach 1.05 is released by this section, and
`Y_RESULTS_REVIEWED` is not set.

**The Mach 0.600 rung: FAIL** on (b) and (e); no floor set. The family
on the served domain (far boundary 224.2 radii, outlet 10 calibers):
CD 2.9475608e-3, 1.4963883e-3, 8.9194560e-4, 5.9908648e-4 at r = 1, 2,
4, 8 (35,450, 10,700, 19,600 and 37,600 implicit steps), monotone, order
1.05, extrapolated 3.238266e-4; the procedure's band 3.441e-4. The band
8.129e-4 = grids 3.441e-4 + floor 0 + far field 1.566e-4 (turning:
2.982816e-3, 2.947561e-3, 2.941692e-3 at 100.6, 224.2 and 408.7 radii)

- cylinder 3.122e-4 (decaying: 3.332803e-3, 2.947561e-3, 2.775102e-3 at
  5.5, 10 and 22 calibers). (a) pass; (b) fail, the procedure's band
  3.44e-4 above the cap 2e-4, so a pass could not show the drag is zero
  to the tolerance; (c) pass, CD + band 1.41e-3 at or above 0, and the
  ordering across rungs pass; (d) reported, largest station band 7.60e-4
  above 5e-4, "verified, band too wide for the use"; (e) fail, the wall's
  total-pressure loss ahead of the shoulder 1.11e-3 of p0 on r = 8
  against the limit 1.23e-4, falling at orders 0.33 (r = 1, 2, 4) and
  0.55 (2, 4, 8) where 0.8 is needed; (f) pass; (g) reported, R3's largest
  station difference 2.49e-2 with 2 stations outside the gross-error
  check (sets nothing); R5 not run. Station bands at r = 2, 4, 8 all
  monotone: 1.03e-4, 3.16e-5, 1.67e-5, 9.55e-6, 6.44e-6, 3.77e-6,
  3.99e-6, 4.33e-6, 7.92e-5, 1.45e-4 (first to tenth station).

What the review found behind the two fails, from the records, as
record not rule: the station Cp converge at order 0.6 to 0.77 at the
two shoulder stations (the ninth and tenth) and at 1.6 to 2 at
mid-cone, so the shoulder corner, not the cone, sets the drag's order
(1.05) and the band; the wall loss is largest at the first station (the
tip) and is still 1.9e-4 of p0 at x/l 0.9 on r = 8, so it is not a
tip-cell artefact alone; (g)'s miss at Mach 0.6 is near the shoulder,
where the linearised solution has its logarithmic singularity, and
sets nothing. The implicit steps (LU-SGS at CFL 1000) have an unstable
mode on the 408.7-radius far-field base grid at both Mach 0.6 and 0.8
(the residual grew a hundredfold, at step 32,400 at Mach 0.8; the same
signature as the 800-radius grid at Mach 1, "What did not work"); item
18's explicit path converged those grids (24,150 and 42,500 steps) and
every other grid went by the implicit path.

**The Mach 0.800 rung: not judged** (no floor, since the 0.600 rung
did not pass). Its family, for the record: CD 8.7001196e-3,
8.6037919e-3, 8.7609440e-3, 8.8745535e-3 at r = 1 to 8 (the r = 8 grid
100,800 implicit steps), not monotone; a supersonic pocket on the wall
on every grid, growing with refinement (largest wall Mach 1.226, 1.270,
1.292, 1.305; 4, 7, 15, 30 supersonic wall cells); wall loss ahead
2.99e-3 down to 1.49e-3 of p0. Far field turning 9.69e-5 (8.722177e-3,
8.700120e-3, 8.697552e-3; the 408.7 grid by the explicit path), cylinder
decaying 2.87e-4. Once a floor exists and it is judged, (y) item 6 (a)
would ask for r = 16 (the unresolved case with the finer triple
monotone).

**The 800-radius test (addendum item 4): PASS** at all three, by the
explicit path on the 910-radius grid (own radius; 129 x 41 cells).
Mach 1.001: turning allowance 6.410e-3 (m = 2.46e-7) against C(800) -
C(224.2) = 7.885e-4, contained. Mach 1.020: 4.423e-4 (m = 3.96e-7)
against 2.012e-6, contained. Mach 1.041: 1.405e-5 (m = 2.17e-8) against
-5.622e-9, contained. The moved family's allowance stands for the rows
at Mach 1.001 to 1.041 as far as this test goes; those rows are still
kept out, below.

**The served family's rows, 1.050, 1.062, 1.064** (lane C, on the
current code with the records of (y)): per-row results, each monotone
with the far-field effect turning: CD_r8 1.07112e-1, band 9.805e-5,
largest station band 8.45e-5; 1.03464e-1, 5.371e-5, 4.52e-5;
1.02849e-1, 4.823e-5, 4.57e-5. These rows are the served family's and
enter 0022 as 4.3 item 2 allows, with u_num from these station bands.

**Rows kept out** ((y) item 6, boxes of 0.05 Mach): every TN 4233 row
from 0.600 to 1.041. 0.600 and 0.601 by the 0.600 rung's fail; 0.797,
0.800 and 0.850 by the 0.800 rung not judged; 0.899 to 0.939 by the
0.901 rung not run; 0.960 to 1.008 by the 0.960 rung not run; 1.011 to
1.041 by the 0.991 rung not run. The row at 0.701 is covered by no
rung's box and is refused by that alone ((y) item 16, clarified
2026-10-25). The rows at 1.001 to 1.041: the review found (y) item 8
(they wait for the 800-radius test and the review only) and item 6
with revision 15 (an unrun rung's box keeps its rows out) in conflict;
the owner decided on 2026-10-25 that the stricter reading holds, so
they stay out until the 0.960 and 0.991 rungs pass.

Record, not rule (the review's notes): the r = 1 grids of the 0.600
and 0.800 families and the "own" allowance grids carry no `path` field
(solved before item 18 added it; the logs show the implicit path with
no divergence on them); the solve files carry no fingerprint of the
numerics, and item 19 changed `subsonic-verification.ts`, which the
kept-grid fingerprint hashes, so a re-run on the same machine will
refuse the kept allowance base grids and solve them again (the solves
themselves are unaffected, the fingerprint is the store's);
`y-runs/lanes.log` does not record the container restarts at about
18:49, 20:17 and 20:51:33 on 2026-10-24, nor lane A's resume at
19:12:45 on bookkeeping code not yet reviewed at that time (the
transcript and the vitest logs do); `far-800.test.ts` line 163 takes the
noise over the 800-radius grid too, which the registered rule did not
ask for and which changed nothing here (the allowance is the base
grids' and the 800 grid's noise was not the largest).

## Open

- **Runs queued or running** (each saves its state every 10 minutes and
  resumes from it, so it survives the container's restarts):
  - paused at the container restart of 2026-10-22 (checkpointed, to be
    restarted when the machine is otherwise idle): the 10-caliber
    ogive's r = 16 at Mach 1.1 (2,200 steps) and the 5-caliber ogive's
    r = 16 at 1.1 (800 steps);
  - running: the 3-caliber ogive's r = 8 at Mach 1.2 (the cross-check
    of the subtip work's case A), and the corrected allowance rule's
    pre-registered test (`queue-s2test.txt`);
  - the hemisphere's r = 8 at Mach 1.5 (the plan's additions, above).
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
- **GPU**: the transonic domain runs on the GPU in two-float arithmetic
  (steps 3 to 5), with 2 red-black sweeps; only SwiftShader has run it,
  and its margin beyond r = 2 is not measured on the GPU.
- **Blunt noses meeting the cylinder at an angle** (blunted cones) are
  refused by the C grid; the sharp H grid takes cones and ogives.
- **The base**: the sting stands for whatever lies behind the nose; a
  subsonic base (blunt noses with short cylinders near Mach 1.2) belongs
  to the total-drag work, and the quantity here does not depend on it.
- **Serving**: the driver and the router are built ("The path to the
  page", steps 5 and 6); the page's wiring is the interface's. Below
  Mach 1.05 nothing is served (B1) until the corrected allowance rule
  passes its test and the owner decides; Mach 1 also needs a four-grid
  family on the moved domain (about 300,000 steps on r = 8). Blunt noses
  wait on nested domains for the C grid and on the stagnation line's
  error.
