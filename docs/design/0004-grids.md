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

**Outer boundary.** A straight line half a body radius above the axis at
the inflow plane, inclined at 1.2 times the angle of the conical shock the
tip would carry (from the Taylor-Maccoll solution), or more where needed to
keep that shock line at least three cells of the base grid below it all
along the body, but never more than halfway from that angle to 90 deg.
Following the shock in this way, rather than using a flat top, halved the
force error on a cone in the design study. On the convex profiles served
here the bow shock weakens downstream and stays below the tip's shock
line. The margin is in cells because a captured shock spreads over two to
three: with the angle alone, far down a 12-caliber body only 2.1 cells
separated them and the boundary cells were disturbed by 1.75e-5; with 2.9
cells, by 1.2e-6. Every validation case checks that the cells along the
outer boundary are undisturbed (pressure within 1e-5 of the free stream),
since the boundary imposes the free stream; on the cases below the
disturbance is 2e-6 or less on the coarsest grids, and so it is on seven
bodies of 12 to 30 calibers at Mach 2 to 5.

**Spacing.** Along each vertical line of height h, the nodes are graded
towards the body by y = h (e^(b eta) - 1) / (e^b - 1), with
b = ln(1 + h / R) capped at ln 100 (R the body radius). The columns are
spaced at the geometric mean of the wall-cell and outer-cell heights, which
gives both the same aspect ratio, e^(b/2), at most 10. Everything depends
only on the geometry and the number of cells across. A grid-convergence
study uses a family: a base grid of nj cells across and its refinements by
2, 4, ...; the cell counts between breakpoints are rounded once, on the
base grid, so each refinement divides every base cell into exactly 2, 4,
... parts and reproduces every coarser node (checked to 1e-12 on random
rockets).

**Quality gates** (`src/grid/quality.ts`): positive cell areas; cell angles
of at least 12 deg, and 60 deg in the wall layer; neighbouring cells no
more than 1.3 times different in width (along i) or height (along j);
aspect ratio at most 10. A grid that fails is refused with the reason,
never returned. The cell-angle limit is set by measurement, not by rule of
thumb: at low Mach numbers the steep outer boundary skews the cells near
it, and on such grids, down to 12.3 deg, the solver keeps its accuracy
(the low-Mach table below). Cells in the undisturbed free stream cannot
add error whatever their shape: the solver keeps a uniform flow uniform to
round-off on such grids, down to Mach 1.1 (tested in
`tests/engine-cpu/body-validation.test.ts`). With the strongest
stretching, the size-ratio gate needs about 18 cells across; 20 is the
smallest grid used. Since vertical grid lines meet the nose at 90 deg minus
the tip half-angle, tips steeper than 30 deg are refused with that reason.

## Measurements

100 random rockets (tangent ogives and ogive family, cones and parabolic
noses of 2 to 8 calibers, cylinders of 0 or 1 to 25 calibers) pass every
gate at Mach 1.5 to 5 with nj = 20 (the property tests). Of a larger
sample, 200 rockets per range, these are refused: at Mach 2 to 5, 1; at
1.5 to 2, 3; at 1.2 to 1.5, 9, and 8 more whose tip shock detaches (blunt
body flow, open). All but one of the 13 are short noses with tips of 21
to 28 deg, whose cells either side of the tip differ in width by 1.30 to
1.45; the other has a cell angle of 11.3 deg at Mach 1.2. Where even the
steepest outer boundary would leave fewer than three cells above the
shock, the base grid gets more cells across instead.

Cone-cylinders, cone surface pressure over 0.5 to 0.95 of the cone length
against Taylor-Maccoll, converged to a residual of 1e-13 or less:

| Case                                  | nj = 20 | nj = 40  | nj = 80  |
| ------------------------------------- | ------- | -------- | -------- |
| M 3, 20 deg cone                      | -0.28%  | -0.16%   | -0.085%  |
| M 2, 15 deg cone                      | +0.030% | -0.008%  | -0.010%  |
| M 3.12, 10 deg cone                   | +0.023% | -0.011%  | -0.012%  |
| M 3, 10 deg cone, 15-caliber cylinder | +0.049% | -0.0044% | -0.0096% |

At low Mach numbers, where the outer boundary is steep and the cells near
it skewed (smallest cell angle in brackets), on 4-caliber cylinders:

| Case                      | nj = 20 | nj = 40 | nj = 80  |
| ------------------------- | ------- | ------- | -------- |
| M 1.5, 15 deg cone (35.8) | +0.028% | -0.004% | -0.006%  |
| M 1.3, 10 deg cone (28.1) | +0.043% | +0.007% | +0.0003% |
| M 1.25, 7 deg cone (24.9) | +0.053% | +0.010% | +0.002%  |
| M 1.2, 5 deg cone (21.1)  | +0.051% | +0.010% |          |
| M 1.2, 12 deg cone (19.8) | -0.16%  | -0.019% |          |
| M 1.15, 4 deg cone (17.3) | +0.049% | +0.010% |          |
| M 1.1, 3 deg cone (12.3)  | +0.017% | +0.010% |          |

On all of them the outer boundary cells stay within 4e-6 of the free
stream and the flow leaves through the outflow plane at an axial Mach
number of 1.09 or more.

Ogive-cylinder of NACA TN 3716 (3-caliber tangent ogive, M 1.98), the
first comparison with measurements on a generated grid:

- Converged to round-off within 3000 iterations on 84 x 20, 168 x 40 and
  336 x 80 cells (one nested family); the three grids agree within 0.0025
  in Cp (0.0002 between the two finer ones), so the solution is
  grid-converged.
- Near the tip the surface pressure passes through the Taylor-Maccoll
  value for the tip cone (Cp 0.298); the first few faces overshoot, as at
  any sharp apex (three faces on the 40-cell grid), over a region that
  shrinks with refinement. On a cone with the ogive's tip angle the solver
  holds the exact value within 0.0005 from x/d = 0.22 on, on all three
  grids, so the tip does not disturb the solution downstream.
- Against the exact inviscid solution, from an independent method of
  characteristics (`src/validation/characteristics.ts`, proven on cones
  against Taylor-Maccoll at second order, converged here to 2e-5 in Cp):
  within 3e-4 at every station on the 40-cell grid; on the 80-cell grid
  within 4e-4 at x/d = 0.22, nearest the tip, and 1e-4 elsewhere. The
  solver is accurate on this ogive.

  | x/d                    | 0.22   | 0.89   | 1.61   | 2.95    | 4.06    | 6.28    | 8.06    |
  | ---------------------- | ------ | ------ | ------ | ------- | ------- | ------- | ------- |
  | Characteristics, exact | 0.2595 | 0.1555 | 0.0646 | -0.0575 | -0.0320 | -0.0112 | -0.0059 |
  | Euler, nj = 80         | 0.2591 | 0.1555 | 0.0647 | -0.0576 | -0.0320 | -0.0111 | -0.0059 |
  | Measured (TN 3716)     | 0.26   | 0.165  | 0.074  | -0.036  | -0.017  | -0.001  | 0.006   |

- So the differences from the measurements (stated uncertainty 0.005),
  lower at every unambiguous station by 0.002 to 0.022 and largest at the
  shoulder, are not numerical errors of the inviscid solution: the exact
  solution has them too. Their physical cause is not established. The
  boundary layer alone is not a sufficient explanation (the report finds
  Reynolds-number effects negligible at zero incidence, and a laminar
  displacement thickness here is worth about 0.002 in Cp); a slightly
  blunted model tip and the tunnel's Mach-number tolerance are untested
  candidates. The report's own theory curve on the forward nose, about
  0.01 above the exact solution, comes from V. J. Rossow, NACA TN 2399
  (1951), whose method adds an approximate correction for rotation to
  characteristics solutions that ignored it: the exact solution shows that
  approximation, not this solver, to be the one that differs.

## Open

- **Entropy layer from the apex.** On cones the surface pressure converges
  at about first order. On the M 3, 20 deg cone the cells along the wall
  carry spurious entropy made at the sharp apex and carried down the wall
  streamline: 6.8% above the conical value near the tip, falling to 1.7%
  (nj = 20) and 1.0% (nj = 40) at the shoulder, and 0.4% (0.2%) in the
  second row. The wall cells' pressure is off by -0.66% (-0.33%) from the
  exact value at their centroids; the wall pressure taken from the wall
  flux, -0.28% (-0.16%), is better. So the first-order error is mostly in
  the state next to the wall, not in the wall flux, and the remedy belongs
  at the apex.

- **Blunt noses.** They need a grid wrapped around the stagnation point
  (a C grid, with the axis upstream as the inflow-side boundary), which
  the design study built and checked. But on it the shared reconstruction
  stalls at a residual of 2e-2 to 4e-2 in the subsonic region behind the
  bow shock, where pressure is about 12 times the free stream: the shared
  factor assumes variables of order one. Per-variable minmod converges
  there and gives the stagnation pressure within 0.5% of the exact value.
  Until the steady scheme handles both shocks and stagnation regions,
  blunt noses are refused with that reason.
- **Low supersonic Mach numbers.** Below Mach 1.2 the outer boundary
  meets the vertical grid lines at under 12 deg, the smallest angle
  validated. Grid lines that lean to meet it were tried and set aside:
  they tilt the outflow plane, across which the normal Mach number then
  falls to 0.98 or less, where the outflow condition no longer holds.
  Transonic flow needs a domain that follows the body past its base.
- **Subsonic cone surfaces.** Where the conical flow at the tip is
  subsonic at the surface, the shoulder can influence the cone pressure
  upstream through it, so Taylor-Maccoll is not by itself a reference.
  On a 26 deg cone at Mach 1.5 (conical surface Mach number 0.978) the
  computed cone pressure differs from it by -2.4% with nj = 20 and -0.75%
  with nj = 40: still changing with the grid, so the case is being
  measured further before any conclusion.
- **Size jump at steep tips.** On short noses with tips of 21 to 28 deg
  at Mach 1.2 to 1.5 the cells either side of the tip differ in width by
  up to 1.45. Being measured against cones with the same tips.
- **Base and wake**, boat-tails and transitions, and wall layers for the
  viscous solver: later milestones (0002).
