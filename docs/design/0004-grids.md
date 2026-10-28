# 0004: Grids generated from body profiles

- **Status:** Implemented for sharp noses (H grid) and for smooth blunt
  noses meeting the body tangentially (C grid, `src/grid/blunt-grid.ts`).
  The scheme near the stagnation point of blunt noses is not yet accurate
  enough for results on them; see the end.
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
disturbance is 4e-6 or less on the coarsest grids, and so it is on seven
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
it, and on such grids, down to 12.3 deg, the cone pressure stays accurate
(the low-Mach table below). That is not a general property of skewed
cells. On a manufactured solution in a uniformly sheared channel (L1
error at 16 to 128 cells, axisymmetric) square cells converge at order
2.03, cells of 30 deg at 1.84, and cells of 12 deg at about 1 (orders
0.90, 1.02, 0.66), with 13 times the error of square cells at 128 cells.
So skewed cells are tolerable where they are on these grids, near the
outer boundary, but cost accuracy where the flow varies; results are
verified on nested grids (0005), which measures that cost. Cells in the undisturbed free stream cannot
add error whatever their shape: the solver keeps a uniform flow uniform to
round-off on such grids, down to Mach 1.1 (tested in
`tests/engine-cpu/body-validation.test.ts`). With the strongest
stretching, the size-ratio gate needs about 18 cells across; 20 is the
smallest grid used. Since vertical grid lines meet the nose at 90 deg minus
the tip half-angle, tips steeper than 30 deg are refused with that reason
(on the grids of the fitted shock, measured separately, the limit is
50 deg and tips up to about 40 deg are served: 0006).

## Topology (v2): C grid for blunt noses

A blunt nose has a stagnation point and a bow shock standing off ahead of
it, which vertical grid lines cannot follow. Grid lines of constant i
leave the body close to normal: they fan out from the nose and are
vertical along the cylinder. The lower boundary is the body from the tip
to its end, the upper the outer boundary, iMin the axis ahead of the tip
(the stagnation streamline, a line of symmetry treated as a wall) and iMax
the vertical outflow plane at the end of the body. Wall nodes lie exactly
on the profile (to 1e-12).

**Line directions.** Exact normals fan out abruptly where the curvature
jumps (the shoulder of a hemisphere-cylinder, from 1/R to 0), and there
neighbouring outer cells would differ in width by sqrt(1 + kappa h): 1.84
at Mach 1.5. So each line follows the normal averaged over a window along
the body of half-width a quarter of its distance to the outer boundary.
The window is symmetric about the tip, keeping the first line on the
axis, and closes at the end of the body, keeping the last one vertical.
Its half-width may change by at most half the distance moved along the
body, so both ends of the window only move downstream and the averaged
angle, like the normal's on a convex body, only increases: without that
limit, at Mach 1.5 the window grew faster than the columns advanced and
the lines turned back towards each other. The lines then meet the wall at
82 deg or more on the grids tested.

**Outer boundary.** An arc of radius twice the nose's length scale (its
radius of curvature at the tip, and at least the body radius), two
standoffs ahead of the tip by the correlation of F. S. Billig (1967),
continued by a straight line at its tangent, halfway between the normal
shock and the Mach angle. Both choices are measured, not derived. The bow
shock of a blunt nose stays far above the Mach angle for many body radii
(on a hemisphere-cylinder at Mach 3, still 14 deg above it 8 radii behind
the tip), so a boundary at the Mach angle plus 6 deg was crossed by the
shock just behind the nose at every Mach number; and the shock flattens
away from the nose, so an arc concentric with it came within one or two
cells. Nothing in the generator proves the shock lies inside: every
verified result checks that the cells along the outer boundary are still
the free stream (0005), and is reported invalid otherwise.

Measured on the hemisphere-cylinder (4 calibers of cylinder, HLLC,
unit-invariant shared reconstruction), coarsest grid (nj = 20) and the
next:

| Mach | Grid   | Residual | Outer row, deviation | Free cells above the shock | Standoff / R (Billig) |
| ---- | ------ | -------- | -------------------- | -------------------------- | --------------------- |
| 1.5  | 54x20  | 2e-15    | 1.8e-6               | 3                          | 0.613 (0.604)         |
| 2    | 79x20  | 3e-15    | 5.1e-8               | 4                          | 0.349 (0.321)         |
| 3    | 103x20 | 8e-15    | 1.0e-7               | 5                          | 0.216 (0.205)         |
| 5    | 120x20 | 6e-15    | 7.6e-11              | 7                          | 0.160 (0.163)         |
| 1.5  | 108x40 | 2e-14    | 3.8e-9               | 7                          | 0.613                 |
| 3    | 206x40 | 5e-15    | 1.6e-11              | 11                         | 0.217                 |
| 5    | 240x40 | 3e-14    | 1.1e-14              | 14                         | 0.159                 |

The margin doubles with each refinement, as it should for a shock fixed in
space. The standoffs agree with Billig's correlation within 1.5 to 8.5%;
it is a fit to experiments, used here only to place the boundary.

**Spacing and gates.** Across: as on the H grid, along each line. Along
the body: the wall cells are as long as the geometric mean of their height
and of the outer cells' height, allowing for the lines spreading by
1 + h d(angle)/ds. The same quality gates apply. Served and tested
(`tests/grid/blunt-grid.test.ts`): hemispheres and prolate ellipsoids
(length 1 to 3 radii) with 2 to 15 calibers of cylinder, Mach 1.5 to 5.
Refused, with the reason: noses meeting the body at more than 15 deg
(power series of exponent 1/2 shorter than two radii); nearly flat tips
(radius of curvature above 10 body radii); and, by the gates, bodies too
short for the lines to turn vertical by their end at low Mach numbers (a
hemisphere with less than 2 calibers of cylinder at Mach 1.5, a sharp
tip with less than 5 at Mach 1.2).

**Two-scale noses (Haack and power series).** The Haack series leaves
the tip as r = c x^(3/4): vertical, with unbounded curvature, and blunt
only within the length l = c^4 at which the profile crosses the line
r = x from the tip (the radius of a sphere, 0.6 of the base radius on a
3:1 ellipsoid): 2.88 (1 + 1.5 C)^2 R^4 / L^3, which for R = 0.5 is
6.7e-3 at L = 3 and 1.4e-3 at L = 5 (2.2e-3 and 2.9e-4 of the nose's
length; the crossing itself, which the grid uses, is 0.16 at L = 1,
where the asymptote gives 0.18). The captured shock stands 0.1 l ahead
of the tip at Mach 2 (0.03 l at Mach 3, 0.4 l at Mach 1.5), a third of
a sphere's of radius l. With
the boundary at the body scale, the window averaged the normal over the
whole region in which its angle rises past 80 deg, so the lines left the
wall at 43 to 52 deg, and the tip fell inside one cell. The boundary's
length scale is now the larger of the tip radius and the smaller of the
base radius and two tip scales (`tipScaleFactor`): the tip scale on
Haack noses. Ellipsoids keep the base radius at every length, and the
rest of the grid their families were measured on (0006): the window's
half-width tabulated at 1024 equal steps, the density of lines evaluated
exactly, the spacing's slope limited (`maxSpacingSlope`, 0.15). By the
tip-scale rule a 3-caliber ellipsoid (tip scale 0.16) would have two
scales, and the clustered tables below moved the lines of the shorter
ones by up to 2.4e-6; with ellipsoids on their own path the generator's lines are bit-identical
to those of the measured ellipsoid families (16 ellipsoids of 0.5 to 6
calibers at Mach 1.2 to 3, refinements 1, 2 and 4, compared with main at
0d69e69). The two-scale grids take the density of lines as tabulated,
without the slope limit, as their families were measured. The window
follows it, and near the cusp turns the lines into a fan, their angle
rising linearly with s at a few radians per layer height, which keeps
the outer cells of equal width at the price of wall angles below the
right angle over the first cells: 72 to 80 deg on the Haack noses
measured (3 and 5 calibers, Mach 1.5 to 3), 78 deg on the fit's grid of
the 3-caliber nose at Mach 2. The spacing along the body follows the
layer height, so the tip region of that nose (5 l) holds 53 of the 240
lines of the family's base grid.
The generator's boundary is generous at the body scale, where it keeps
the angle blunt bodies need (on the 3-caliber nose at Mach 2, nj = 20,
the first captured shock lies at 0.126 of the boundary's height at the
tip and at 0.40 to 0.54 of it past the first percent of the nose, 0.42
at its middle: `docs/research/two-scale-noses/ratio`), so the fitted
solver builds
the grid it starts on from the shock captured on this one (0006). The
half-width and density tables are clustered at the tip (s proportional
to the square of the sample index), the density of lines tabulated so
that `columnPositions`, which samples it millions of times on a dense
tip, stays cheap. Noses meeting the cylinder at an angle (the power
series) are accepted up to 15 deg: the window averages the jump in the
normal as it averages jumps in the curvature, and a 3-caliber nose of
exponent 3/4 (7 deg) passes the gates with the same margins as the
Haack noses.

**Sharp tips whose bow shock detaches** (at Mach 1.2, 19 of 40 noses of
1 to 3 calibers) are the limit of a two-scale nose: the normal jumps at
the tip instead of turning over a blunt part, and only a grid wrapped
round the tip, with the detached shock fitted from a captured start
(0006), can serve them. The generator accepts them: their blunt part
has no scale, so its own boundary is at the body scale, and the
family's grid is built on the captured shock. The window would spread
the jump into a fan linear in s and end it where it stops straddling
the tip, where the outer cells jumped in width by 1.9 to 2.5; so the
jump is taken out of the normal before the window averages it, and the
lines fan through it as jump (1 - exp(-s / scale)), decaying by
`fanRatio` (1.25) per wall cell at the tip. No fan within the
size-ratio gate can put more than 0.23 of the jump into the first cell
(its outer width can only shrink by 1.3 per cell), so the first wall
cell meets the wall at 90 deg less 0.77 of the jump: a tip of
half-angle delta gives about 21 + 0.77 delta deg on the base grid, 50
deg (the fitted gate) at 38 deg. The fan's scale is set on the base
grid, as nesting requires, so on each refinement the first cell takes a
smaller part of the jump and its angle falls towards the tip's
half-angle: a 45 deg tip gives 52.4 deg on nj = 20 and 49.8 on nj = 40.
Under the 50 deg gate the C grid therefore serves detached tips of 50
deg or more at every refinement, and of 38 deg or more on the base
grid only. Measured on the family's grids (nj = 20, the grid the shock
settled on): a 1-caliber tangent ogive (53 deg tip) at Mach 1.5, wall
cells at 58.6 deg (56.1 on nj = 40), size ratio 1.16, aspect 3.8; a
1-caliber parabolic nose (45 deg) at Mach 1.2, 52.4 deg, 1.24, 7.9; a
1.5-caliber tangent ogive (37 deg) at Mach 1.2, 45.4 deg and 1.30,
refused by the fitted gates. At Mach 1.2 the shock stands 7 to 10
radii out along the cylinder, and the window, which closes at the end of the body, turns
the lines vertical over the last two or three cells of a 2-caliber
cylinder, where the wall widths jump by 1.6 to 1.7: those cases need 5
calibers of cylinder, over which the turn is resolved (the same limit
as the hemisphere's 2 calibers at Mach 1.5, further out).

## Measurements

Measured with the unscaled shared reconstruction, before the
unit-invariant one became the default (0003); being re-measured.

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
- Against an independent inviscid reference solution, a method of
  characteristics (`src/validation/characteristics.ts`, checked on cones
  against Taylor-Maccoll, converging at second order, converged here to
  2e-5 in Cp):
  within 3e-4 at every station on the 40-cell grid; on the 80-cell grid
  within 4e-4 at x/d = 0.22, nearest the tip, and 1e-4 elsewhere. The
  solver is accurate on this ogive.

  | x/d                | 0.22   | 0.89   | 1.61   | 2.95    | 4.06    | 6.28    | 8.06    |
  | ------------------ | ------ | ------ | ------ | ------- | ------- | ------- | ------- |
  | Characteristics    | 0.2595 | 0.1555 | 0.0646 | -0.0575 | -0.0320 | -0.0112 | -0.0059 |
  | Euler, nj = 80     | 0.2591 | 0.1555 | 0.0647 | -0.0576 | -0.0320 | -0.0111 | -0.0059 |
  | Measured (TN 3716) | 0.26   | 0.165  | 0.074  | -0.036  | -0.017  | -0.001  | 0.006   |

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

- **First-order surface pressure on cones: the captured bow shock.** On
  cones the surface pressure converges at about first order, and the
  measurements point to the bow shock. A captured shock's position is
  uncertain by a fraction of a cell, and where the flow behind it varies
  that error is carried downstream at first order whatever the design
  order of the scheme: M. H. Carpenter and J. H. Casper, "Accuracy of
  shock capturing in two spatial dimensions", AIAA J. 37 (1999) 1072-1079,
  and N. K. Yamaleev and M. H. Carpenter, NASA/TM-2002-211415 (2002), who
  also find that for a second-order scheme adapting the grid to the shock
  does not improve the accuracy. It fits every case here: the wedge, whose
  flow behind its straight shock is uniform, converges to round-off; the
  cones, whose flow behind the conical shock varies, at about first order;
  weak shocks on slender low-Mach cones faster. The causes ruled out by
  measurement (M 3, 20 deg cone, nj = 20 and 40, mean over 0.5 to 0.95 L):

  | Reconstruction | Wall-cell entropy at x/L = 0.95 | Wall-cell p vs exact at centroid | Wall p from the wall flux |
  | -------------- | ------------------------------- | -------------------------------- | ------------------------- |
  | Shared         | +1.7% / +1.0%                   | -0.66% / -0.33%                  | -0.28% / -0.16%           |
  | Per-variable   | +0.62% / +0.52%                 | -0.50% / -0.23%                  | -0.40% / -0.20%           |

  The spurious wall entropy is real but not the driver (per-variable
  reconstruction removes two thirds of it, the pressure error stays); the
  wall flux is not (the wall cells' own pressure is off); nor is grid
  stretching (a manufactured solution on the body grid's strongest
  grading, cells growing 100 times across, still converges at order 2.02).
  Accuracy therefore comes from refinement and extrapolation on verified
  nested grids (0005), as in published cone verification with a
  first-order scheme. Fitting the bow shock as the outer boundary would
  remove the error at its source; it is a larger change, since done
  (0006).

- **Blunt noses: the stagnation region.** The C grid above is in place,
  and the unit-invariant shared reconstruction (0003) converges on it to
  round-off where the unscaled one stalled at 2e-2. But the stagnation
  pressure, against the exact value behind a normal shock (Rayleigh
  pitot), depends on where the captured bow shock sits in its cell. On the
  hemisphere-cylinder at Mach 2, grids of nj = 20, 21, 22 and 23 give:

  | Flux                    | nj = 20 | nj = 21 | nj = 22 | nj = 23 | Residual |
  | ----------------------- | ------- | ------- | ------- | ------- | -------- |
  | HLLC                    | +9.7%   | -0.56%  | +4.1%   | -0.25%  | 1e-14    |
  | Rotated HLL/HLLC hybrid | +0.47%  | -0.57%  | -0.18%  | -0.25%  | 2e-3     |
  | HLL                     | +0.56%  | -0.55%  | -0.05%  | -0.23%  | 1e-14    |
  | Rusanov                 | -0.97%  | -0.93%  | -0.90%  | -0.86%  | 1e-14    |

  With HLLC the entropy behind the shock on the stagnation line jumps to
  a wrong, sometimes sub-normal-shock, constant that depends on the
  shock's position in its cell, and is carried to the wall unchanged.
  The rotated hybrid of Nishikawa and Kitamura (`rotatedHybrid` in
  `src/scheme/flux.ts`) removes most of it but does not converge: its
  split direction, taken from small velocity jumps near the stagnation
  point, keeps switching. HLL converges and is smaller but still changes
  sign from grid to grid; only Rusanov changes smoothly, with the largest
  error. So no flux choice makes these results verifiable: the error of a
  captured shock on the stagnation line has to be removed at its source,
  by fitting the bow shock (or aligning a grid face with it), which is the
  next step (since done: 0006, which brings the stagnation pressure within
  0.008% of the pitot value on nj = 20). Blunt bodies are not yet offered
  on the drag page, and the sharp-nose generator refuses them.

- **Haack-series and other noses with unbounded tip curvature**: the
  two-scale grids above, measured with the fitted shock in 0006; the
  stagnation pressure on them converges at first order only (the
  curvature is singular at the tip), the drag at observed orders of 1.49
  to 2.30 on nj = 20, 40 and 80 (2.30 on the 6-caliber nose at Mach 1.5,
  measured 2026-10-27), with an allowance of its own (0006, "Two-scale
  noses").
- **Low supersonic Mach numbers.** Near Mach 1 the outer boundary meets
  the vertical grid lines at ever smaller angles; slender cones pass the
  12 deg gate down to Mach 1.1 (the table above: 12.3 and 17.3 deg), but
  blunter bodies are refused there. Grid lines that lean to meet it were
  tried and set aside:
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
