# 0004: Grids generated from body profiles

- **Status:** Implemented for sharp noses (v1). Blunt noses and low
  supersonic Mach numbers are open; see the end.
- **Date:** 2026-10-15
- **Inputs:** an independent design study with experiments (topologies,
  outer boundaries, stretching, quality limits), and the measurements
  below.

## Profiles

A body is a nose followed by a cylinder (`src/geometry/body.ts`).
Transitions, boat-tails and the base come with the base-flow milestone.
The nose shapes and their parameters follow OpenRocket's definitions so
imported designs produce the same body (`src/geometry/nose.ts`); each shape
is tested by a defining property (circular arc, ellipse, parabola, the
Haack series' slender-body area distribution).

A nose is **sharp** if its profile has a finite slope at the tip and
**blunt** if it leaves the tip vertically: the ellipsoid, the Haack series,
the power series with exponent below 1, and tangent ogives no longer than
their radius (quarter circles). The grid topology is chosen from this
analytic property, not from the tip angle the grid resolves: on a von
Karman nose the resolved tip half-angle grows from 34 to 65 deg as the
first cell shrinks from 1e-2 to 1e-4 of the nose length, so a classification
by resolved angle would change under grid refinement.

## Topology (v1): H grid for sharp noses

Grid lines of constant i are vertical. The lower boundary is the axis
upstream of the tip (a wall with zero-area faces) and the body surface
after it; the upper boundary is the outer boundary; the inflow and outflow
planes close the domain at one body radius upstream of the tip and at the
end of the body. The tip and the shoulder lie on grid lines.

**Outer boundary.** A straight line inclined at 1.2 times the angle of the
conical shock the tip would carry (from the Taylor-Maccoll solution), half
a body radius above the axis at the inflow plane. Following the shock in
this way, rather than using a flat top, halved the force error on a cone
in the design study. Every validation case checks that the cells along the
outer boundary are undisturbed (pressure within 1e-5 of the free stream),
since the boundary imposes the free stream; on the cases below the
disturbance is 2e-6 or less on the coarsest grids.

**Spacing.** Along each vertical line of height h, the nodes are graded
towards the body by y = h (e^(b eta) - 1) / (e^b - 1), with
b = ln(1 + h / R) capped at ln 100 (R the body radius). The columns are
spaced at the geometric mean of the wall-cell and outer-cell heights, which
gives both the same aspect ratio, e^(b/2), at most 10. Everything depends
only on the geometry and the number of cells across, nj; doubling nj
doubles the cells in both directions and refines one fixed distribution, as
a grid-convergence study requires.

**Quality gates** (`src/grid/quality.ts`): positive cell areas; cell angles
of at least 30 deg, and 60 deg in the wall layer; neighbouring cells no
more than 1.3 times different in size; aspect ratio at most 10. A grid that
fails is refused with the reason, never returned. With the strongest
stretching, the size-ratio gate needs about 18 cells across; 20 is the
smallest grid used.

## Measurements

100 random rockets (tangent ogives and ogive family, cones and parabolic
noses of 2 to 8 calibers, cylinders of 0 or 1 to 25 calibers) pass every
gate at Mach 2 to 5 with nj = 20. Between Mach 1.5 and 2, one of 100 was
refused: its outer boundary met the vertical grid lines at 30 deg.

Cone-cylinders, cone surface pressure over 0.5 to 0.95 of the cone length
against Taylor-Maccoll, converged to a residual of 1e-13 or less:

| Case                | nj = 20 | nj = 40 | nj = 80 |
| ------------------- | ------- | ------- | ------- |
| M 3, 20 deg cone    | -0.28%  | -0.16%  | -0.085% |
| M 2, 15 deg cone    | +0.030% | -0.008% | -0.010% |
| M 3.12, 10 deg cone | +0.023% | -0.011% | -0.012% |

Ogive-cylinder of NACA TN 3716 (3-caliber tangent ogive, M 1.98), the
first comparison with measurements on a generated grid:

- Converged to round-off within 3000 iterations on 93 x 20, 187 x 40 and
  373 x 80 cells; the three grids agree within 0.0024 in Cp (0.0004 between
  the two finer ones), so the solution is grid-converged.
- Near the tip the surface pressure passes through the Taylor-Maccoll
  value for the tip cone (Cp 0.298); the first one or two faces overshoot,
  as at any sharp apex, over a region that shrinks with refinement.
- Against the measurements the computed pressure is lower everywhere
  downstream of x/d = 0.56, by up to 0.022 at the shoulder (x/d = 2.95)
  and about 0.01 along the cylinder. The report's own method-of-
  characteristics solution (its figure 3), also inviscid, lies below the
  measurements in the same way: the boundary layer of the model, absent
  from inviscid flow, thickens its effective shape. The comparison is
  therefore a check of consistency, with a tolerance of 0.025; it becomes
  a check of accuracy with the viscous solver.

## Open

- **Blunt noses.** They need a grid wrapped around the stagnation point
  (a C grid, with the axis upstream as the inflow-side boundary), which
  the design study built and checked. But on it the shared reconstruction
  stalls at a residual of 2e-2 to 4e-2 in the subsonic region behind the
  bow shock, where pressure is about 12 times the free stream: the shared
  factor assumes variables of order one. Per-variable minmod converges
  there and gives the stagnation pressure within 0.5% of the exact value.
  Until the steady scheme handles both shocks and stagnation regions,
  blunt noses are refused with that reason.
- **Low supersonic Mach numbers.** As the Mach number falls the shock
  steepens and so does the outer boundary; where it meets the vertical
  grid lines at under 30 deg the grid is refused. Grid lines that lean to
  meet a steep outer boundary are the next step; transonic flow needs a
  different domain altogether.
- **Base and wake**, boat-tails and transitions, and wall layers for the
  viscous solver: later milestones (0002).
