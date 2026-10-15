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
of at least 30 deg, and 60 deg in the wall layer; neighbouring cells no
more than 1.3 times different in width (along i) or height (along j);
aspect ratio at most 10. A grid that
fails is refused with the reason, never returned. With the strongest
stretching, the size-ratio gate needs about 18 cells across; 20 is the
smallest grid used. Since vertical grid lines meet the nose at 90 deg minus
the tip half-angle, tips steeper than 30 deg are refused with that reason.

## Measurements

100 random rockets (tangent ogives and ogive family, cones and parabolic
noses of 2 to 8 calibers, cylinders of 0 or 1 to 25 calibers) pass every
gate at Mach 2 to 5 with nj = 20. Between Mach 1.5 and 2, 9 of 100 are
refused with nj = 20 and 1 with nj = 40: the outer boundary, steepened to
keep its margin over the shock, meets the vertical grid lines at under
30 deg.

Cone-cylinders, cone surface pressure over 0.5 to 0.95 of the cone length
against Taylor-Maccoll, converged to a residual of 1e-13 or less:

| Case                                  | nj = 20 | nj = 40  | nj = 80  |
| ------------------------------------- | ------- | -------- | -------- |
| M 3, 20 deg cone                      | -0.28%  | -0.16%   | -0.085%  |
| M 2, 15 deg cone                      | +0.030% | -0.008%  | -0.010%  |
| M 3.12, 10 deg cone                   | +0.023% | -0.011%  | -0.012%  |
| M 3, 10 deg cone, 15-caliber cylinder | +0.049% | -0.0044% | -0.0096% |

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
- Against the measurements (stated uncertainty 0.005 in Cp) the computed
  pressure is lower at every unambiguous station, by 0.002 to 0.022,
  largest at the shoulder. Aft of about x/d = 1.5 the report's own inviscid
  method of characteristics (its figure 3) lies close to our solution and
  below the measurements in the same way. On the forward nose it does not:
  there our solution is about 0.01 below both the measurements and the
  report's theories. That curve is not an exact solution: it comes from
  V. J. Rossow, NACA TN 2399 (1951), whose method adds an approximate
  correction for rotation to hand-computed characteristics solutions
  that ignored it, and agrees with a full solution "within the accuracy
  of a characteristic solution"; only plots are published. The cause of
  the difference is not established. The boundary layer is
  not a sufficient explanation (the report finds Reynolds-number effects
  negligible at zero incidence, and a laminar displacement thickness here
  is worth about 0.002 in Cp). The solver's discretisation of smooth
  axisymmetric flow is verified separately by a manufactured solution
  (0003); an exact inviscid reference for ogives is still needed before
  any accuracy claim on them, and the test keeps a 0.025 bound only to
  catch regressions.

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
