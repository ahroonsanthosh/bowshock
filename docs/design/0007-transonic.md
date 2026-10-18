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

- the tip's conical flow turns subsonic at the surface (a 15 deg cone at
  Mach 1.2, a 3-caliber tangent ogive's 18.9 deg tip at Mach 1.2, a
  5-caliber one's 11.4 deg tip at Mach 1.15), so the shoulder reaches the
  tip through the subsonic layer and Taylor-Maccoll is no longer the flow
  there;
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

(to be completed)

## References and how close the solver gets

(to be completed)

## What accuracy the evidence supports

(to be completed)

## What did not work

(to be completed)

## Open

(to be completed)
