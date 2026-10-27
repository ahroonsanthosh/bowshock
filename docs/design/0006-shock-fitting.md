# 0006: The bow shock fitted, not captured

- **Status:** Implemented on the CPU engine (`src/solver/shock-fitting.ts`)
  and the GPU engine (`src/engine-gpu/shock-fitting-gpu.ts`), measured on
  blunt and sharp noses; the drag page's solver for sharp noses.
- **Date:** 2026-10-17
- **Inputs:** the measurements below; the method of Moretti and Abbett
  and of Salas (sources in `docs/validation/sources.md`).

## Why

A captured shock is smeared over two or three cells, and the state behind
it depends on where it falls within a cell. Two consequences were
measured:

- On blunt noses, the stagnation pressure on the hemisphere-cylinder at
  Mach 2 swung between +9.7% and -0.56% of the exact pitot value on grids
  of 20 to 23 cells across with HLLC; no flux tried removed it (0004,
  Open).
- On sharp noses, the surface pressure and drag of cones converge at
  about first order, the error of the captured shock carried downstream
  (M. H. Carpenter and J. H. Casper, AIAA J. 37 (1999) 1072), which sets
  the width of the error bands and part of the floor for drag (0005).

With the shock as the outer boundary of the grid, the jump across it is
the exact Rankine-Hugoniot jump for the shock's shape, and the flow
inside is smooth.

## Method

After the shock-fitting method of G. Moretti and M. J. Abbett, AIAA J. 4
(1966) 2136, and M. D. Salas, AIAA J. 14 (1976) 583 (the citations
confirmed, the papers not read: docs/validation/sources.md), here in a
finite-volume form:

- The shock is a curve of nodes, each on a fixed straight grid line from
  the body (`gridOnLines`, `src/grid/blunt-grid.ts`).
- On each shock face the shock's speed W along its outward normal follows
  from the one characteristic that reaches it from behind, the u_n + a
  wave: p_s(W) + rho a u_n,s(W) = p_c + rho a u_n,c, with the cell's
  pressure and normal velocity extrapolated to the face. Both terms on the
  left increase with W, so the root is unique.
- The face carries the physical flux of that post-shock state, which also
  fills the ghost cells.
- Each node moves along its line by W dt / (n . line), taking W from the
  face on its axis side, since along the shock information travels away
  from the axis. Ahead of a blunt nose the first node keeps the shock
  normal to the axis; behind a sharp tip it stays where the inflow puts
  it. After each move the grid is rebuilt and the flow interpolated
  along the lines.

At convergence W = 0 on every face (to 1e-12 of the free-stream sound
speed on the CPU; on the GPU, whose arithmetic is 32-bit, to 3e-5, with
the drag settled to the GPU's noise) and the motion terms vanish, so the
steady state does not depend on the path to it.

Three errors in the first implementation, each found by measurement and
review, are worth recording:

- Using the pressure alone to set W, instead of the compatibility
  relation, left the normal velocity unconstrained: no steady state.
- Adding the moving-face term -W U to the boundary flux counted the
  motion twice, since the remap already moves the content: the flow
  itself diverged.
- Taking the first node's speed from its neighbour's face left the
  standoff free: it depended on the relaxation.

**Blunt noses** start from a captured solution: on each line the outer
edge of the captured shock, smoothed. On a two-scale nose (Haack and
power series, `BluntGrid.twoScale` in 0004) the capture runs twice: the
shock captured on the generator's own base grid, pushed out by half its
height along each line and at least three base cells, is the outer
boundary of the family's grids at every refinement, and the shock
captured on the base grid built on it is the start (`secondCapture`).
The generator's boundary is generous: on the 3-caliber nose at Mach 2
(nj = 20) it lies 7.9 times as far from the body as the first captured
shock at the tip and 1.8 to 2.5 times as far past the first percent of
the nose (`docs/research/two-scale-noses/ratio`), and the lines' spacing
and node fractions are sized from it. That boundary continues its last segment to the last line
(the captured shock's last height is its last column's) and is
smoothed by 50 passes of 1-2-1, which the start is not: at Mach 1.2 a
captured shock 7 to 10 radii out is stepped enough after the start's 20
passes to jump the outer cells by 1.4. A sharp tip whose bow shock
detaches at the Mach number asked for is refused (by `sharpFitProblem`):
the sharp problem's inflow plane cannot serve it, and the blunt family
on the same grids (0004), measured in "Two-scale noses" below, has no
reference. **Sharp noses** start just behind
the tip, at x0 = 1e-3 of the nose length, with the conical flow of the
tip's half-angle (Taylor-Maccoll) as the inflow there and the tip's
conical shock as the first guess; the part ahead of x0 adds the tip
cone's pressure drag, Cp (r(x0) / R)^2, which is exact for a cone.

## Measurements

Hemisphere-cylinder (4 calibers), stagnation pressure against the exact
pitot value, every grid converged to round-off:

| Mach | nj = 20  | nj = 21  | nj = 22  | nj = 23  | nj = 40  |
| ---- | -------- | -------- | -------- | -------- | -------- |
| 2    | +0.0074% | +0.0063% | +0.0058% | +0.0050% | +0.0013% |
| 3    | +0.0044% |          |          |          | +0.0008% |

Against capture on the same grids (+9.7%, -0.56%, +4.1%, -0.25% at
Mach 2), the error is 50 to 1300 times smaller and changes smoothly
with the grid: the dependence on the shock's position in its cell is
gone. The standoff converges with it: 0.34955 and 0.34937 body radii at
Mach 2 (nj = 20 and 40), 0.21504 and 0.21495 at Mach 3.

Cone-cylinder, Mach 3, 20 deg, forebody pressure drag against
Taylor-Maccoll (the exact value, Cp = 0.284270):

| Shock    | nj = 20  | nj = 40  | nj = 80   | nj = 160 |
| -------- | -------- | -------- | --------- | -------- |
| Captured | -0.395%  | -0.259%  | -0.151%   | -0.081%  |
| Fitted   | +0.0248% | +0.0062% | +0.00154% |          |

The fitted error falls by 4.0 per refinement (observed order 1.998),
second order where capture gave about first; on 40 cells across it is
already 13 times smaller than capture on 160. Extrapolated from the
three grids the drag is 1.2e-7 of its value below the exact one, and the
band of the finest grid (1.9e-5) contains its actual error (1.5e-5).

Tangent ogive of NACA TN 3716 (3 calibers, 7 calibers of cylinder),
Mach 1.98, forebody pressure drag against the method of characteristics
(Cd = 0.0988034: 0.09880328 and 0.09880338 on 640 and 1280 intervals,
converging at second order):

| Shock               | nj = 20  | nj = 40  | nj = 80  | nj = 160 |
| ------------------- | -------- | -------- | -------- | -------- |
| Captured            | +1.210%  | +0.174%  | -0.025%  | -0.042%  |
| Fitted, x0 = 1e-3 L | +0.2818% | +0.0680% | +0.0163% |          |
| Fitted, x0 = 1e-4 L | +0.2815% | +0.0680% |          |          |
| Fitted on the GPU   | +0.2733% | +0.0656% | +0.0157% |          |

The fitted drags (0.0990818, 0.0988706, 0.0988195) fall by 4.13 per
refinement, an observed order of 2.05; the start x0 changes the drag by
3e-6 of its value or less. Extrapolated from the three grids at the
observed order the drag is 0.09880317, 2.4e-6 of its value below the
reference (at second order, 9.4e-6 below), and the error band of the
finest grid (GCI, 0005) is 0.021%, against an actual error of 0.016%.
The captured shock's values converge to 4.4e-4 below the reference
value: fitting removes the floor that capture leaves, to within the
method of characteristics' own accuracy. On the GPU, on grids with fixed
fractions (the drag page's solver, `verifiedFittedDragGpu`), the drags
0.0990735, 0.0988682, 0.0988189 fall by 4.16 (order 2.06) and
extrapolate at that order to 0.09880337, 3e-7 below the reference value
(at second order, 9.4e-6 below); the finest band,
2.1e-4, contains the actual error, 1.6e-4.

Hemisphere-cylinder at Mach 2, fitted, forebody pressure drag on nj = 20,
40 and 80: 0.7909688, 0.7894762, 0.7890787, falling by 3.75 per
refinement (order 1.91), extrapolated 0.788934 with a band of 0.023% on
the finest grid. The standoff (0.349552, 0.349374, 0.349330 body radii)
converges at order 2.02 and the stagnation pressure's error (+0.0074%,
+0.0013%, +0.00024%) by 5.5 per refinement.

Hemisphere-cylinder at Mach 3: 0.8502328, 0.8495647, 0.8493855 on nj =
20, 40 and 80 (order 1.90, extrapolated 0.849320, band 0.010%); the
standoff (0.215038, 0.214954, 0.214934 body radii) at order 2.07, the
stagnation pressure's error +0.0044%, +0.00084%, +0.00016%.

These grids moved each node's fraction of its line with the line's
height; the drivers now keep each line's starting fractions
(withFixedFractions), as the GPU fit must, which changes the grids
slightly: the values above are being measured again on those grids.

## On the GPU

The fit runs entirely on the GPU (`src/engine-gpu/shock-fitting-gpu.ts`),
in 32-bit, with the shock moved every step:

- The shock must move one step's worth (W dt) at a time: moving it every
  20 flow steps by one step's worth converges to the same state to all ten
  digits printed (Mach 2 hemisphere, nj = 20), but moving it by the 5 or
  20 steps' sum diverges even with the boundary updated every step. So
  the moves number in the thousands, too many to rebuild the geometry on
  the CPU or to read the shock back for each.
- Each line keeps the fractions of its height at which its nodes lie,
  set once in double precision (`withFixedFractions`), so every
  difference the metrics need (along a line, between neighbouring lines)
  is a sum of differences computed once in double precision and of
  heights and their differences, without the cancellation of
  single-precision absolute coordinates (`src/engine-gpu/line-grid.ts`).
  Measured against the CPU's double-precision metrics of the same grids:
  normals within 1.3e-7, areas 2.6e-7, volumes 4.5e-7.
- Each line's height is a base from the CPU in double precision plus a
  32-bit displacement, the sum of its moves since. Adding moves to the
  height itself would round away every move below half its last bit, and
  the relaxation would stall about 200 times that far from its fixed
  point (the shock's speed decays by about 0.5% a step: from 1e-2 to
  4e-5 of the sound speed over 1000 steps on the hemisphere); the
  displacement stays small, so its rounding does too. At each convergence
  check the heights are read back and become the new base.
- After each move the flow is interpolated along the columns as on the
  CPU (`remapAlongLines`), within 2.0e-7 of the CPU's remap.
- At each check (every 250 steps on the base grid, times the
  refinement; the measurements below used 500) the drag is evaluated
  from the flow in double precision; the fit has converged when the drag
  has settled to the GPU's noise (2e-6) and no face of the shock moves
  faster than 3e-5 of the sound speed.

Measured against the CPU's fit of the same problem on the same grids
(nj = 20), iterated on to 8000 steps or more past convergence:

| Case                        | Drag wanders from the CPU's by | Shock speeds settle at |
| --------------------------- | ------------------------------ | ---------------------- |
| Hemisphere-cylinder, Mach 2 | 2.4e-7 at most                 | 4e-7 to 1.2e-6         |
| 20 degree cone, Mach 5      | 1.8e-7 at most                 | 3.6e-6 to 4.8e-6       |
| TN 3716 ogive, Mach 1.98    | 7.8e-7 at most                 | 7e-7 to 1.0e-6         |

(shock speeds over the free stream's sound speed), well within the 2e-6
assumed for the GPU's noise. The hemisphere-cylinder's fit converges
after 2500 steps, the CPU's needing 4747 to reach 1e-12.

Where the page's fit stops (its test settles the drag to within the
noise), on the ellipsoids at low Mach numbers below (nj = 20, the page's
path on the GPU against the CPU fully converged on the same problem):
-1.8e-7 (1 caliber, Mach 1.5), -2.6e-7 (0.5 caliber, Mach 1.3), +2.8e-6
and -3.8e-6 (1.5 and 3 calibers, Mach 1.2). The two at Mach 1.2 exceed
the 2e-6 assumed for the noise by up to 1.9 times; how much of that is
where the fit stops and how much the 32-bit arithmetic was not
separated. Both are a twentieth of the floor of 7e-5 and far below these
cases' bands (about 1e-3), so they change no result; a test holds the
1.5-caliber case to 5e-6.

On the GPU too, a bare 20 degree cone at Mach 3 on nj = 20, 40 and 80
(`verifiedFittedDragGpu`, before the domain was extended past the base):
+2.52e-4, +6.22e-5, +1.53e-5 of the exact drag, falling by 4.05 (order
2.02) and extrapolating to within 5.7e-8 at that order, 3.2e-7 at second
order; the finest band, 2.0e-5, contains the actual error. Re-measured on
the CPU with the domain past the base (review of 2026-10-18, commit
e2ec73f): +2.510e-4 and +6.222e-5 on nj = 20 and 40, the same to three
figures, falling by 4.03.

**Each grid starts from the one before** (`startedFrom` in
`src/analysis/gpu-fitted-flow.ts`). The sharp-nose grids are nested:
every coarser line and node fraction is one of the finer grid's, so each
finer cell lies inside one coarser cell, whose converged state it takes,
and the shock's heights are interpolated along the body. The drag is
checked every 250 steps on the base grid (times the refinement). On the
TN 3716 ogive at Mach 1.98 on the GPU, the grids of 20 and 40 cells
across converge after 1750 and 2000 steps, against 2500 and 4000 started
afresh and checked every 500, and the drag of the finer grid is within
3.9e-7 of the fresh start's, inside the GPU's noise.

The grids of a blunt nose nest the same way (`bluntFitFamily` in
`src/analysis/fitted-flow.ts`): every grid of the family starts from one
captured solution on the base grid, and each line takes the node
fractions of that solution's shock height, interpolated along the body
between the base grid's lines. Taking each grid's fractions from its
own captured solution, as before, gave fractions that differ from grid
to grid, so the grids did not nest and each needed a captured start of
its own, 3000 steps times the refinement on the CPU. The page's solver
(`verifiedFittedDragGpu`) computes the one captured start on the CPU in
double precision, in chunks that return to the browser
(`bluntStartInChunks`, the same start however it is chunked), so its
problems are exactly the CPU's.

The captured grid reaches well beyond the shock, to an outer boundary
at twice Billig's standoff, and the fitted grid only to the shock. So
each cell of a fitted grid starts from the captured solution at the same
fraction of the shock layer, on the base grid's column
(`shockLayerStart`), not from the captured cell of the same index, which
lies 1.5 to 1.7 times farther out and left the outer 6 of 20 rows in the
free stream (found by an independent review). The converged flow does
not depend on the start, only the steps to reach it: on three
ellipsoids at nj = 20 (the hemisphere at Mach 3, the 1.5- and 3-caliber
noses at Mach 2) the fit converges in 4736, 4760 and 4948 steps against
5515, 5573 and 5823 from the cells of the same index, to the same drag
to ten figures. The captured grid
is only a start, so it is not gated: the generated grids' gates refused
every ellipsoid with a caliber of cylinder at Mach 1.2 on the start
grid alone (the review, on 50 inputs). The grid each value is solved on
is gated once its shock has settled (`fittedCaseFailure`, the same
checks on the CPU's `verifiedFittedDrag` as on the page).

A grid started from the converged one before may begin so close to its
limit that its drag never changes by ten times the noise, and so shows
no rate of convergence of its own; the stopping test (`SettlingValue`,
`src/verification/iterative-convergence.ts`) then tested the change
alone, and a review simulated a start 100 times the GPU's noise away,
converging at 0.97 per check, being accepted 45 times the noise from its
limit, biased towards the coarser grid's value. Each grid now takes the
rate measured on the grids before it (the checks scale with the grid, so
the rate per check carries over); the rate is measured as the slope of a
least-squares line through the logarithms of the last eight changes of
ten times the noise or more, which averages the noise of single pairs
of changes and forgets an early transient (a second review found that
keeping the largest rate of any pair let a start that drifts before it
converges stop the fit from ever settling); and what remains is
estimated from the change over the checks in which the error halves.
Simulated with the real stopping test, fresh starts at rates from 0.1 to
0.9 per check settle within 1.6 times the noise of their limits within
100 checks, and a warm start 100 times the noise away at 0.95 per check
within 1.7; slower ones do not settle within the 120 checks. Replayed
on four recorded drag histories of the fitted solver (the page's
default ogive and a hemisphere-cylinder at Mach 2, cones at Mach 1.5 and
5; rates of 0.05 to 0.26 per check, or too fast to measure), it settles
at the same checks as the earlier test, with the same errors, and at
most one check later with the GPU's noise added.

Two failures of the GPU raise no exception in WebGPU: a dispatch of more
workgroups than the device allows in one dimension (65535 for most; at
64 cells or faces each, grids of more than 4.19 million faces, which
the 320-cell setting reaches on long bodies at Mach 5), and a buffer the
device cannot allocate. In both none of the work runs, and the flow read
back is the one uploaded: unchanged between checks, so it would read as
converged. Grids too large for one dispatch are now refused before any
work, with the advice to choose a coarser finest grid; allocation errors
are caught as the engines are created; and every batch of steps is
checked to have run (the GPU counts its steps), so any work the GPU did
not do stops the run. A finer grid that is too large for the GPU, or
whose fit does not converge, leaves the result of the grids before it,
with the reason shown: the result a coarser finest grid would have
given. A case refused on any grid (the quality gates, a subsonic
outflow or base) stays refused, since it puts the coarser grids in doubt
too.

## The floor for fitted drag

Measured by audit agents on grids with fixed fractions (CPU, nj = 20,
40 and 80), forebody drag against exact values (Taylor-Maccoll) or
converged reference values (the method of characteristics). Cones on 4
calibers of
cylinder, against Taylor-Maccoll:

| Case          | nj = 20  | nj = 40  | nj = 80  | Order | Extrapolated (2nd order) |
| ------------- | -------- | -------- | -------- | ----- | ------------------------ |
| M 2, 10 deg   | +0.1399% | +0.0347% | +0.0086% | 2.01  | -1.2e-6                  |
| M 1.5, 10 deg | +0.1938% | +0.0514% | +0.0139% | 1.92  | +1.3e-5                  |
| M 1.5, 20 deg | +0.0449% | +0.0150% | +0.0053% | 1.63  | +2.0e-5                  |
| M 1.3, 5 deg  | +0.5398% | +0.1106% | +0.0287% | 2.39  | +1.4e-5 (see below)      |

Further cones on three grids: Mach 2, 20 deg, +0.0529%, +0.0135%,
+0.0034% (order 1.97, capped extrapolation 3.1e-7 off) and Mach 3, 30
deg, +0.0174%, +0.0043%, +0.0011% (order 2.00, 1.6e-7); on two grids the
cones at Mach 3 and 5 fall by 4.03 to 4.07 per refinement and
extrapolate to within 1.5e-6.

Ogives on 1 caliber of cylinder (the secant ogive and the parabolic nose
meet it at a corner), against the method of characteristics on 1280
intervals:

| Case                           | nj = 20  | nj = 40  | nj = 80  | Order | Extrapolated (capped) |
| ------------------------------ | -------- | -------- | -------- | ----- | --------------------- |
| Tangent, 3 calibers, M 1.5     | +0.415%  | +0.0975% | +0.0229% | 2.09  | -2.0e-5               |
| Tangent, 3 calibers, M 2       | +0.269%  | +0.0646% | +0.0154% | 2.05  | -9.7e-6               |
| Tangent, 3 calibers, M 3       | +0.128%  | +0.0316% | +0.0076% | 2.02  | -3.3e-6               |
| Tangent, 3 calibers, M 4       | +0.0733% | +0.0181% | +0.0044% | 2.01  | -1.2e-6               |
| Tangent, 5 calibers, M 2       | +0.541%  | +0.125%  | +0.0287% | 2.11  | -3.4e-5               |
| Secant (0.5), 3 cal., M 2.5    | +0.212%  | +0.0525% | +0.0127% | 2.01  | -5.9e-6               |
| Parabolic (0.5), 3 cal., M 2.5 | +0.210%  | +0.0519% | +0.0126% | 2.01  | -5.7e-6               |

At their observed orders all seven extrapolate to within 5.3e-6 of the
reference values. Every finest-grid band measured, on cones and ogives,
contains its error.

The procedure's band extrapolates at second order at most, so the error
it can miss is that of its own extrapolation, at an order capped at 2.
On the families that have settled it lies at most 3.4e-5 of the value
from the exact or reference one (the 5-caliber ogive, whose order
settles at 2.11),
against 4.6e-4 with the shock captured. The floor for fitted drag
(`FITTED_DRAG_FLOOR`) is set at 7e-5, about twice that. The cone at Mach
1.3, 5 deg, whose order had not settled on nj = 80, settles on nj = 160:
+0.00784% there, the finest triple at order 1.98, extrapolated within
7.2e-6 of the exact value, and its band (8.9e-5) contains its error; the
orders of its two triples (2.39 and 1.98) agree within the procedure's
0.5, so it would be given a band. Grids that fail the generated grids'
quality gates, and slender noses at low Mach numbers, are measured in
the next section.

## The quality gates on fitted grids

The page refuses a fitted grid that fails its quality gates
(`FITTED_QUALITY_LIMITS`, `src/grid/quality.ts`). The gates of the
generated grids (0004: wall cells at 60 deg or more, aspect ratios of 10
or less) were set for captured shocks; on fitted grids they were
measured by an audit agent on families the old gates refuse, against
exact or converged reference drags (CPU, nj = 20, 40 and 80; MOC on 1280
intervals, its own error 2e-7 to 1e-5):

| Family                                 | Wall angle | Aspect    | nj = 20  | nj = 40  | nj = 80  | Order |
| -------------------------------------- | ---------- | --------- | -------- | -------- | -------- | ----- |
| Secant ogive (0.5), 1 cal., M 3        | 53.4-53.8  | 8.8-9.3   | +4.85e-4 | +1.26e-4 | +3.20e-5 | 1.93  |
| Parabolic (1), 1 cal., M 5             | 44.5-44.9  | 16.3-17.4 | -7.2e-5  | -2.3e-7  | +1.8e-6  | none  |
| Cone (26.6 deg), 10 cal. cylinder, M 3 | 62.9-63.3  | 11.4-12.1 | +1.88e-4 | +4.69e-5 | +1.16e-5 | 2.00  |
| Tangent ogive, 10 cal., M 1.2          | 80.4-83.3  | 10.6-11.6 | +3.74e-2 | +7.03e-3 | +1.31e-3 | 2.41  |

The secant ogive converges cleanly with its wall cells at 53.4 deg: its
extrapolation is 1.6e-6 off and its band contains its error. The
parabolic nose, at 44.5 deg and aspect ratios of 17, is within 2.3e-6 of
its reference on the finer grids, but its error crosses zero, so no
order is measured and only the allowance of 7e-5 covers it (the page,
with the GPU's noise, would find its last change too small to measure,
and give no band). The aspect ratios of 10.6 to 11.9 show no effect: the
10-caliber ogive at Mach 1.2 converges as the same nose at Mach 1.5, at
aspect ratios below 9, does, and the cone with 10 calibers of cylinder,
at 11.4 to 12.1, converges at order 2.003 and extrapolates within 1.5e-7
of its exact drag, its band containing its error. A grid's aspect ratio
grows slowly with refinement (the cone's by 0.5 and then 0.25) towards
the limit its generator's spacing sets. So on fitted grids the wall cells
must be at 50 deg or more, between the two noses, which serves tips up
to about 40 deg (the wall cell's angle is about 90 deg less the tip's
half-angle), and the aspect ratio at most 13, above the largest measured
at a steady order and below the parabolic nose's 17.

**Slender noses at low Mach numbers.** The 10-caliber noses at Mach 1.2
and 1.5 (a tangent ogive and a cone) are 1.2% to 3.7% off on nj = 20,
five to ten times the errors of the shorter noses above, and converge
faster than second order (orders 2.32 to 2.41 through nj = 80). The
procedure's extrapolation, capped at second order, then misses the
reference by 1.3e-4 to 6.0e-4, two to nine times the allowance; but the
band is placed on the finest grid's value, and with the order above 2 it
overestimates that value's error: on nj = 80 every band contains its
error, by 1.56 to 1.82 times, before the allowance is added. On the
cone at Mach 1.5 the page's procedure, on four grids to nj = 160
(+1.15e-4 there; the two triples at orders 2.32 and 2.27, agreeing),
gives a band of 2.35e-4 of the value, which contains the error by 2.05
times. The 160-cell grids of the two ogives are running.

**Why the order dips at low Mach numbers on cone-cylinders** (found by
an audit agent on Mach 1.5, 20 deg). The error is two errors of opposite
sign: the regular one, spread over the cone and falling by 4.1 per
refinement (+9.1e-4, +2.2e-4 of the drag on nj = 20 and 40 up to 0.86 of
the cone's length), and one in the last cells before the corner with
the cylinder (-4.6e-4, -7.1e-5), falling faster than second order. The
flux there is fully upwind, but the reconstruction of the last cone cell
reaches across the corner into the expansion, and the nearly sonic
axial flow at the wall (Mach 1.085 at this case) amplifies the face's
error. As the corner part shrinks faster it cancels less, and the
total's ratio falls (3.00, then 2.85). Neither the start x0, the
cylinder's length, the flux (HLL as HLLC) nor the shock's boundary
changes it. Reconstructing the cells beside the corner from their own
side only gives clean second order (4.07, then 4.05; extrapolated within
1.2e-6), but removes the cancellation, so the finest-grid errors of
every cone grow (by 1.97 times at this case, 1.04 at Mach 2, 10 deg) and
the bands with them. The present scheme is kept: on every family
measured its bands contain the error, and with the floor the margin on
this case is 2.4 times. The patch (`docs/design/patches/0006-corner-one-sided.diff`) is kept for a later
choice between narrower bands and cleaner convergence; on the GPU it
would need the same change in euler2d.wgsl.

**The domain extends at least one caliber past the nose.** With the
zero-gradient outflow at the base of a bare nose, the cells next to it
are perturbed: the drag of a bare 10 degree cone at Mach 2 (nj = 20)
moves by 6.6e-5 of its value, and bare secant-ogive and parabolic noses
at Mach 2.5 by 1.0e-4, against 1.2e-7 between one and four calibers of
cylinder. Where the flow leaves the end of the body asked for
supersonically (axial Mach number above 1 there), nothing behind it
reaches the body, and a cylinder adds no pressure drag, so the fit
always solves at least one caliber of cylinder (`sharpFitProblem`,
`bluntFitProblem`) and checks the flow at that end (`baseMach`: in the
column of cells just ahead of it where the end is a grid line, as at the
base of a bare nose, and otherwise interpolated between the columns
either side of it); where the flow there is subsonic the case is
refused. A blunt nose's fit may solve a longer cylinder still
(`solvedBluntBody`; see "Ellipsoids at low Mach numbers" below).

**The flow behind the tip must cross the starting plane supersonically.**
The inflow plane at x0, normal to the axis, imposes all four states of
the tip cone's conical flow, which holds only where the flow crosses it
supersonically: where its axial Mach number exceeds 1. A robustness scan
of the page's inputs found tips where it does not: on a 3-caliber
tangent ogive at Mach 1.2 (18.9 deg) the conical surface flow is at Mach
0.85, and on a 26.6 deg cone at Mach 1.5 at 0.96, where the drag with 2
calibers of cylinder came out 3.3% below the Taylor-Maccoll value of an
endless cone on nj = 20 (2.4% on nj = 40, 1.7% on nj = 80, still
changing), the shoulder reaching upstream. Such tips are refused
(`sharpFitProblem`), with the axial Mach number tested on the tip cone's
surface, where it is least, so that the test does not depend on the
grid (it was first tested at the inflow faces' midpoints, which let a
cone whose surface value is 0.999 through on the coarser grids and
refused it on the finest). The test also refuses tips whose surface
flow is supersonic but whose axial component is not, such as a 24 deg
cone at Mach 1.5 (surface Mach 1.04, axial 0.95); the message says
which. The method of characteristics refuses only the subset whose
surface flow is subsonic. On the convex noses of the page the flow
speeds up along the body, so the check at the end of the body is a
guard behind this one.

**What serving these tips would need** (measured by an agent with the
refusal removed in a copy of the code; CPU, x0 = 1e-3 of the nose's
length unless stated, 2 calibers of cylinder, fits to 1e-12). The
inflow plane is not the obstacle: moved from 1e-4 to 1e-2 of the nose's
length with the columns behind 1e-2 held fixed, the drag at x0 = 1e-3
differs from that at 1e-4 by at most 1.3e-6 (a 3-caliber tangent ogive
at Mach 1.2) and 1e-8 (cones), falling as x0 squared or faster; the
conical state imposed there, about 1% off the true flow on that ogive,
is forgotten within ten x0. Moving x0 without holding the columns moves
the whole column layout, which changed the drag by up to 3.2e-4 on the
cones: the grid, not the inflow plane. The shoulder is the obstacle. On
cone-cylinders the drag converges at observed orders of 0.35 to 0.39 on
nj = 20, 40 and 80, whether the surface flow is subsonic (26.6 deg at
Mach 1.5, 18 deg at Mach 1.2) or supersonic with a subsonic axial
component (26.6 deg at Mach 1.6, whose forebody drag is exactly
Taylor-Maccoll's: errors -0.64%, -0.41%, -0.24%). There the wall
pressure converges at second order to within 5e-6 of Taylor-Maccoll up
to 0.8 of the cone's length, and the whole change lies in the last tenth
before the corner; the one-sided corner patch above reduces the error by
a quarter without restoring the order. On tangent ogives, which meet the
cylinder without a corner, the drag converges at orders 2.69 (3
calibers, Mach 1.2) and 2.15 (Mach 1.35), and the extrapolations lie
inside the captured-shock solver's bands on nj = 20 to 160; but those
bands, 2.9e-3 and 2.3e-3 of the value with its floor of 1e-3, are no
reference at the fitted solver's precision. So cone-cylinders with such
tips stay refused, and tangent ogives need a fourth grid (nj = 160) and
a check at their own precision (for example a second, differently laid
out family converging to the same value) before they are served. The
fits are slow here: 4149 to 9867 steps on nj = 20, against a median of
2300, doubling with each refinement.

**Served: a tangent nose whose tip flow is supersonic but axially
subsonic.** A 3-caliber tangent ogive at Mach 1.35 (18.9 deg tip, conical
surface flow at Mach 1.037, its axial component 0.981; 2 calibers of
cylinder), on the page's family (CPU, x0 = 1e-3), each grid started from
the converged one before (`startedFrom`) and stopped once the drag's
remaining iterative error, estimated geometrically from its changes as
`SettlingValue` does, was below 1e-9 of it on two successive checks with
the shock's speeds below 1e-9 (on nj = 40 this gives the fit converged
to 1e-12 from a cold start within 1.2e-10, the estimate 1.16e-11 against
an actual 1.25e-11):

| nj  | Drag         | Steps | Remaining (estimated) |
| --- | ------------ | ----- | --------------------- |
| 20  | 0.1081856017 | 3100  | 8.0e-11               |
| 40  | 0.1077785038 | 5800  | 1.1e-10               |
| 80  | 0.1076868609 | 10400 | 1.0e-10               |
| 160 | 0.1076656809 | 17600 | 1.4e-10               |

The two triples converge at orders 2.15 and 2.11 (agreeing within the
procedure's 0.5), so `refineUntilVerified` gives a band: extrapolated
0.1076586209, band 8.8e-6, 1.6e-5 with the floor. Every grid passes the
fitted grids' gates and the flow leaves the body supersonically. A
second family, its columns laid out at 1.5 times the density along the
whole body (105 columns against 70 on nj = 20, where only the start,
the shoulder and the end coincide), gives 0.1083420499, 0.1078209882
and 0.1076979934 on nj = 20, 40 and 80, order 2.08,
extrapolated to 0.1076569950: 1.5e-5 of the value from the first
family's extrapolation, within the floor of 7e-5 at the solver's own
precision. The captured-shock solver's result, 0.1075742 with its band
of 2.5e-4, contains both. Moving the inflow plane changes the drag by
2.4e-5 or less on nj = 20 and 6.4e-6 or less on nj = 40, the columns
moving with it. The page's fit on the GPU gives the CPU's value on
nj = 20 to within the GPU's
noise (`tests/gpu/fitted-flow-gpu.test.ts`). So `sharpFitProblem` now
serves a tip whose axial surface Mach number is 1 or less where its
surface flow is supersonic and the nose meets the body without a corner
(`noseBaseSlope` 0: the tangent ogive and the parabola of parameter 1
among sharp noses), with x0 = 1e-3 as elsewhere; it still refuses such
tips at a corner, and every tip whose surface flow is subsonic, for
which no reference of this kind has been measured yet (a 3-caliber
tangent ogive at Mach 1.2 and a parabolic nose at Mach 1.25 are being
measured; on the first, the default family's grids on nj = 40 and 80
fail the aspect-ratio gate, 13.7 and 14.1 against 13, in the wall cells
at the end of the solved cylinder, where those at 1.5 times the column
density reach 8.5).

**A second reference of that class: a 2-caliber tangent ogive at Mach
1.6** (28.07 deg tip; conical surface flow at Mach 1.0036, near the
least Mach number at which this nose is served, its axial component
0.886, the least of the cases measured; 2 calibers of cylinder),
measured the same way (on the code of d5bb13a with the exception above,
whose sharp grids are the same as those served, bit for bit):

| nj  | Usual family | 1.5 times the columns |
| --- | ------------ | --------------------- |
| 20  | 0.2053948862 | 0.2056332765          |
| 40  | 0.2051904733 | 0.2052482207          |
| 80  | 0.2051381165 | 0.2051522947          |
| 160 | 0.2051250814 |                       |

The usual family's triples converge at orders 1.97 and 2.01,
extrapolated 0.2051207363 (band 5.4e-6, 2.0e-5 with the floor); the
second family converges at order 2.01 to 0.2051203194, 2.0e-6 of the
value from the first. Every grid passes the fitted grids' gates and the
flow leaves the body supersonically. Unlike on the first reference,
the captured-shock solver gives no cross-check here: on nj = 20 to 160
its values, 0.2056606, 0.2045075, 0.2045979 and 0.2048066 (its own grid
gate bypassed on the two coarsest grids, whose neighbouring cells differ
in size by 1.35 and 1.30 against 1.3), change by amounts that do not
shrink, so the procedure gives no band; its finest value lies 1.5e-3
below the fitted extrapolation and still rises, and even a first-order
extrapolation of its last two grids (0.2050152) stays 1.05e-4 short. So
this reference rests on the fitted method's own verification, its two
differently laid out families, not on an independent method. A third,
a parabola of parameter 1 of 2 calibers at Mach 1.6 (the tip and Mach
number of the 26.6 deg cone above, without its corner), is being
measured.

**Where the usual grids fail the gates: the family again with more
columns.** A sharp nose's family whose grid fails only the fitted grids'
quality gates (`fittedGridFailure`) is solved again from its coarsest
grid with 1.5 times the columns along the body
(`FALLBACK_COLUMN_DENSITY`), on the page (`verifiedFittedDragGpu`) and on
the CPU (`verifiedFittedDrag`), and served only if every grid of that
family passes and the procedure verifies it; the reason the first family
was refused is shown with the result. The fallback runs only where the
usual family is refused, so every case served before it is solved as
before, to the last bit (tested on the 3-caliber tangent ogive at Mach
1.35, whose base grid gives 0.1081856016981207 either way). Its basis:
the two families of that ogive agree to 1.5e-5 (above). On a 3-caliber
tangent ogive with 30 calibers of cylinder at Mach 1.5 the usual grid of
20 cells across reaches an aspect ratio of 18.0 in the wall cells at the
end of the cylinder, under a far shock, and is refused; the grid with
1.5 times the columns passes, and gives 0.1058349120 (the GPU within its
noise of it). On the 3-caliber tangent ogive at Mach 1.2, whose surface
flow is subsonic and which is still refused for that, the usual family
gives 0.1094433219, 0.1090150597 and 0.1089485314 on nj = 20, 40 and 80
(its grids on nj = 40 and 80 failing the aspect-ratio gate, 13.7 and
14.1), and the family with 1.5 times the columns 0.1097464924,
0.1091136911 and 0.1089778395 (every grid passing, 8.5 at most); the
first three extrapolate to 0.1089263550 (order 2.69, capped at 2) and
the second to 0.1089325560 (order 2.22), 5.7e-5 apart; the usual
family's grid on nj = 160 is running.

## Blunt noses against the method of characteristics

Behind the sonic line of a blunt nose the flow is supersonic, and from
the flow on a line from the body to the shock the method of
characteristics determines the rest of the shock layer, the shock and
the surface pressure to the end of the body, independently of the
finite-volume discretization (`characteristicsFrom`,
`src/validation/characteristics.ts`). Started from the fitted solution
on a grid line where the Mach number exceeds 1 along all of it, it gives
a reference for the drag downstream of that line (the wall faces' drag
from that line's body point on, on the base area) whose only input from
the fitted solver is the flow on the line.

**The march from given data.** The data are interpolated (cubic in arc
length) onto m + 1 points of the line; on the body the flow is turned to
the body's slope, and on the shock it is the oblique-shock state at the
shock's angle there. Their entropy gives K(psi) inside the line's shock
point, the shock history outside it. The C- lines from the line's
points, each meeting the C+ lines from the points below it and those
reflected from the body, fill the triangle of the data's dependence and
reach the body one after another; the last, from the shock point, has
2m intervals and starts the march of `characteristics`, whose unit
processes are shared (its results are bit-identical to those before).
Checked against the march from the tip:

- Mach 3, 20 deg cone, from Taylor-Maccoll data on lines at 0.3 of its
  length (vertical, normal to the surface, and at 70 deg): wall pressure
  and shock angle within 4.4e-7 to 7.4e-7 on 160 intervals, falling by
  4.0 per refinement; the drag downstream of the line within 5.1e-8,
  1.3e-8, 3.5e-9 and 8e-10 of the exact Cp (1 - (r0 / R)^2) on 320 to
  2560 intervals. From the march from the tip's own flow on the line,
  within 4.5e-9 of that march's drag downstream on 320 intervals, 2.9e-10
  on 1280.
- TN 3716 ogive (3 calibers, Mach 1.98), from the march from the tip on
  1280 intervals, its flow sampled on the line (cubic along each C- line
  that crosses it), the drag downstream of the line:

| Line          | From the tip, extrapolated | From the data on 320, 640, 1280, 2560 | Order      | Extrapolated, difference |
| ------------- | -------------------------- | ------------------------------------- | ---------- | ------------------------ |
| x = 0.1 L     | 0.0888497213               | -4.41e-6, -1.23e-6, -2.93e-7, -5.1e-8 | 1.77, 1.95 | -3.1e-9                  |
| x = L / 3     | 0.0371585371               | -3.61e-6, -8.64e-7, -1.89e-7, -2.2e-8 | 2.02, 2.01 | -1.9e-9                  |
| L / 3, normal | 0.0371585371               | -3.21e-6, -7.66e-7, -1.68e-7, -1.6e-8 | 2.03, 1.98 | -1.2e-9                  |
| x = 2 L / 3   | -0.0016540873              | -1.44e-7, -3.0e-9, +3.09e-8, +3.92e-8 | 2.06, 2.02 | +8e-10                   |

(differences from the march from the tip on 1280 intervals, whose own
order is 1.97 to 1.98 and whose value there lies 3.3e-8 to 4.1e-8 from
its extrapolation; the last column against that extrapolation). At equal
intervals the march from data carries about five times the error of the
march from the tip; both converge at second order, and their
extrapolations agree within 3.2e-9, 3.2e-8 of the nose's drag.

**From the fitted solution.** The flow on grid line i: on each row of
cells, cubic interpolation across the line through the centroids of the
four nearest cells (in their signed distance from it); the row next to
the wall left out, the wall pressure that of the wall faces (cubic in
x), the wall entropy extrapolated (cubic) from the next four rows; the
shock node, its angle from the three nodes about it, the state behind
it the oblique-shock state at that angle. The march runs at the solver's
Mach number, its free-stream speed being rounded to 32 bits (2.00000003
for 2). The row next to the wall carries the scheme's wall error: on the
3:1 ellipsoid at Mach 2 (nj = 20, x = 0.31) its pressure lies 0.9% below
the profile of the rows above, whose gradient it exceeds 1.7 times. Kept,
with the wall state extrapolated from it, the march from the line at x =
0.10, where the Mach number falls to 1.13, folds (mesh points inside the
body, the mass balance 6e-4 and not falling, as on the 2:1 ellipsoid at
Mach 1.14): the data's compression near the wall steepens into a shock
the method does not fit. Left out, every line measured converges at
second order. Where both run, they extrapolate over the grids to the
same value: on the 3:1 ellipsoid within 1.1e-6 of the drag downstream
of the lines from x = 0.117 to 0.309 (the table below), 4.7e-6 at 0.44,
the row kept giving the larger error on each grid (5.9e-5 against
4.7e-5 at x = 0.133 on nj = 80).

**Calibration on a sharp nose**, where the exact drag downstream of a
line is known: the TN 3716 ogive fitted on nj = 20 and 40 (at 1189e0b;
the sharp problem is the same at 68701d2 but for its refusal of subsonic
tips), the march from its vertical
grid lines, against the march from the tip (extrapolated), relative to
the drag downstream of the line:

| Line      | Share | Fitted, nj = 20 | nj = 40  | From the fitted data, nj = 20 | nj = 40 |
| --------- | ----- | --------------- | -------- | ----------------------------- | ------- |
| x = 0.099 | 98.7% | +2.76e-3        | +6.62e-4 | -6.7e-6                       | -1.6e-6 |
| x = 0.30  | 89.9% | +2.94e-3        | +7.07e-4 | -6.5e-5                       | -1.9e-5 |
| x = 0.49  | 77.3% | +3.26e-3        | +7.82e-4 | -1.62e-4                      | -4.1e-5 |
| x = 0.96  | 40.7% | +4.86e-3        | +1.15e-3 | -7.5e-4                       | -1.9e-4 |

The march from the fitted flow is 6 to 400 times more accurate than the
fitted solver's own drag downstream on the same grid: the line's flow
carries the solver's error only up to the line, while the solver's drag
carries what it accumulates along the body. The fitted errors fall by
4.2 per refinement, those of the march from its data by 3.4 to 4.2. On
a blunt nose, then, the difference between the two measures the fitted
solver's error downstream of the line, within a part of it that falls
with the grid, and both extrapolate to the same value.

**Blunt noses**, fitted on the CPU (bluntFitFamily at d50c2b3,
unchanged at 68701d2; each finer grid started from the converged
coarser one, which on the 3:1 ellipsoid at nj = 40, before the families
nested, changed the drag by 8e-13), the march from each grid's data on
640 and 1280 intervals extrapolated (second order; with 2560 the
extrapolation moves by 1e-8 at most). The reference is the
march extrapolated over the data's grids (nj = 40 and 80, second order);
the other columns are relative to it.

3:1 ellipsoid (length 3, 2 calibers of cylinder), Mach 2; its fitted
drag 0.1528860, 0.1526254, 0.1525630 on nj = 20, 40, 80 (order 2.06),
extrapolated 0.1525421; sonic on the body near x = 0.07:

| x     | Min M | Share | Reference   | Fitted: 20, 40, 80           | Fitted, ext. | Order | March from 20, 40, 80        | Order |
| ----- | ----- | ----- | ----------- | ---------------------------- | ------------ | ----- | ---------------------------- | ----- |
| 0.103 | 1.12  | 59.7% | 0.09112939  | +2.69e-3, +6.41e-4, +1.49e-4 | -1.53e-5     | 2.06  | -6.03e-4, -1.51e-4, -3.78e-5 | 1.99  |
| 0.117 | 1.16  | 56.5% | 0.08621360  | +2.75e-3, +6.55e-4, +1.52e-4 | -1.59e-5     | 2.06  | -6.71e-4, -1.68e-4, -4.21e-5 | 1.99  |
| 0.133 | 1.20  | 53.3% | 0.08133494  | +2.82e-3, +6.71e-4, +1.55e-4 | -1.67e-5     | 2.06  | -7.39e-4, -1.86e-4, -4.65e-5 | 1.99  |
| 0.209 | 1.34  | 41.0% | 0.06247283  | +3.21e-3, +7.57e-4, +1.73e-4 | -2.15e-5     | 2.07  | -1.04e-3, -2.59e-4, -6.47e-5 | 2.01  |
| 0.309 | 1.44  | 29.6% | 0.04519750  | +3.80e-3, +8.93e-4, +2.01e-4 | -3.00e-5     | 2.07  | -1.46e-3, -3.54e-4, -8.84e-5 | 2.06  |
| 0.440 | 1.53  | 19.7% | 0.02998849  | +4.72e-3, +1.10e-3, +2.39e-4 | -4.67e-5     | 2.08  | -2.21e-3, -5.18e-4, -1.29e-4 | 2.13  |
| 0.710 | 1.64  | 7.7%  | 0.01180024  | +7.67e-3, +1.73e-3, +3.37e-4 | -1.26e-4     | 2.10  | -5.54e-3, -1.23e-3, -3.08e-4 | 2.22  |
| 1.023 | 1.71  | 1.1%  | 0.001661317 | +2.81e-2, +5.85e-3, +8.04e-4 | -8.77e-4     | 2.14  | -3.37e-2, -7.24e-3, -1.81e-3 | 2.28  |

(x of the line's body point; Min M the least Mach number on the line, nj
= 80; Share the fitted drag downstream of the line over the nose's.)
The fitted drag downstream and the march from the fitted flow approach
each other from either side, their difference falling by 4.15 to 4.72
and then 4.25 to 5.01 per refinement. On each grid the march's error is
3.3 to 4.5 times smaller than the fitted solver's own from the lines
nearest the sonic line (x = 0.10 to 0.13), 1.8 to 2.6 times at x = 0.31
to 0.44, and from x = 0.71 on of the same size or larger, the fitted
flow on the line having accumulated its error along the body. At
second order the extrapolations differ by 1.3e-6 to 1.5e-6 on every
line, the same absolute amount (9e-6 of the nose's drag) whatever the
line's position, as orders of 2.06 to 2.28 rather than 2 leave; at the
observed orders they differ by 3.5e-7 to 6.6e-7 (2.3e-6 to 4.3e-6 of
the nose's drag). From the line at x = 0.103, 60% of the drag, the
reference agrees with the fitted family's extrapolation to 1.5e-5 of
the part it covers.

2:1 ellipsoid (length 1, 2 calibers of cylinder), Mach 2; its fitted
drag 0.4979858, 0.4973716, 0.4972173 (order 1.99), extrapolated
0.4971658; sonic on the body near x = 0.17, so the lines with a margin
cover a fifth of the drag:

| x     | Min M | Share | Reference  | Fitted: 20, 40, 80           | Fitted, ext. | Order | March from 20, 40, 80        | Order |
| ----- | ----- | ----- | ---------- | ---------------------------- | ------------ | ----- | ---------------------------- | ----- |
| 0.230 | 1.14  | 23.4% | 0.1161524  | +1.75e-3, +4.28e-4, +1.05e-4 | -2.55e-6     | 2.04  | -1.19e-3, -3.07e-4, -7.67e-5 | 1.95  |
| 0.248 | 1.17  | 20.8% | 0.1033690  | +1.68e-3, +4.09e-4, +1.00e-4 | -2.97e-6     | 2.04  | -1.22e-3, -3.14e-4, -7.85e-5 | 1.95  |
| 0.286 | 1.22  | 16.0% | 0.07962349 | +1.51e-3, +3.62e-4, +8.77e-5 | -3.74e-6     | 2.06  | -1.25e-3, -3.21e-4, -8.03e-5 | 1.95  |
| 0.350 | 1.29  | 9.9%  | 0.04902338 | +1.07e-3, +2.47e-4, +5.86e-5 | -4.07e-6     | 2.12  | -1.13e-3, -2.92e-4, -7.30e-5 | 1.94  |
| 0.455 | 1.37  | 3.8%  | 0.01877311 | -8.23e-4, -2.43e-4, -6.82e-5 | -9.82e-6     | 1.73  | +5.69e-4, +1.25e-4, +3.14e-5 | 2.24  |

Their difference falls by 4.01 to 4.08 and then 4.04 to 4.09 per
refinement (3.77 and 3.70 on the last line), and here the two errors
are of a size, the fitted solver's 0.8 to 1.5 times the march's (2.2 on
the last line). The extrapolations differ by 1.8e-7 to 3.1e-7 at
second order, 2.9e-8 to 3.2e-7 at the observed orders: within 6.2e-7 of
the nose's drag.

3:1 ellipsoid, Mach 3; its fitted drag 0.1524657, 0.1523882,
0.1523715 (order 2.21), extrapolated 0.1523659; sonic on the body near
x = 0.05:

| x     | Min M | Share | Reference  | Fitted: 20, 40, 80           | Fitted, ext. | Order | March from 20, 40, 80        | Order |
| ----- | ----- | ----- | ---------- | ---------------------------- | ------------ | ----- | ---------------------------- | ----- |
| 0.074 | 1.17  | 67.0% | 0.1020757  | +5.48e-4, +1.09e-4, +2.24e-5 | -6.64e-6     | 2.33  | -2.22e-4, -5.59e-5, -1.40e-5 | 1.99  |
| 0.094 | 1.26  | 61.7% | 0.09406130 | +5.37e-4, +1.05e-4, +2.10e-5 | -7.01e-6     | 2.36  | -2.56e-4, -6.45e-5, -1.61e-5 | 1.98  |
| 0.144 | 1.43  | 51.5% | 0.07839488 | +5.39e-4, +1.02e-4, +1.94e-5 | -8.14e-6     | 2.41  | -3.10e-4, -7.81e-5, -1.95e-5 | 1.99  |
| 0.247 | 1.63  | 37.4% | 0.05699656 | +5.83e-4, +1.05e-4, +1.80e-5 | -1.10e-5     | 2.46  | -3.97e-4, -9.62e-5, -2.40e-5 | 2.06  |
| 0.388 | 1.80  | 25.4% | 0.03868481 | +6.40e-4, +1.06e-4, +1.43e-5 | -1.60e-5     | 2.55  | -5.36e-4, -1.19e-4, -2.98e-5 | 2.22  |
| 0.655 | 1.97  | 12.5% | 0.01912186 | +5.94e-4, +5.63e-5, -1.22e-5 | -3.50e-5     | 2.97  | -1.07e-3, -1.98e-4, -4.95e-5 | 2.56  |

Here the fitted drag downstream converges faster than second order
(orders 2.33 to 2.97), the march from its data at 1.98 to 2.56, their
difference falling by 4.55 to 6.81 per refinement. At second order the
extrapolations differ by 6.2e-7 to 6.8e-7, again the same on every
line (4.5e-6 of the nose's drag); at the observed orders by 7e-8 at
most (4.4e-7 of it). The fitted solver's error is 1.6 to 2.5 times the
march's on the line nearest the sonic line (x = 0.074), and from 1.7
down to 0.2 times it further downstream.

LD-Haack nose (length 1, 2 calibers of cylinder), Mach 2: only nj = 20
can be measured on these families, the grid of nj = 40 being refused
by the generator's gates (neighbouring cells differ in size by 1.30,
the limit). Its fitted drag 0.4288960; the flow on the body is sonic
near x = 0.19, a fifth of the nose (the tip region of a Haack nose
scales as R^4 / L^3), and the fitted wall entropy lies 1.3% to 2.6%
below the normal-shock value on the lines below (on the 3:1 ellipsoid
at Mach 2 and nj = 20, 0.15% at x = 0.31 and 1.0% at 0.71). The march,
on 640, 1280 and 2560 intervals (its body's shoulder, where the slope
falls as the square root of the distance, is no corner), extrapolated
from the two finest:

| x     | Min M | Share | Fitted, nj = 20 | March from it | Interval ratio | Fitted - march |
| ----- | ----- | ----- | --------------- | ------------- | -------------- | -------------- |
| 0.298 | 1.13  | 54.2% | 0.2325814       | 0.2323133     | 3.89           | +1.15e-3       |
| 0.321 | 1.16  | 50.6% | 0.2170300       | 0.2167801     | 3.93           | +1.15e-3       |
| 0.371 | 1.20  | 43.2% | 0.1853037       | 0.1850954     | 4.10           | +1.13e-3       |
| 0.424 | 1.25  | 35.7% | 0.1532130       | 0.1530559     | 3.98           | +1.03e-3       |
| 0.513 | 1.33  | 24.7% | 0.1059399       | 0.1058816     | 1.65           | +5.51e-4       |
| 0.613 | 1.41  | 14.6% | 0.06257544      | 0.06265270    | 4.04           | -1.23e-3       |

(Interval ratio: the change from 640 to 1280 intervals over that from
1280 to 2560.) The difference, 1.1e-3 of the drag downstream on the
lines carrying 36% to 54% of it, is smaller than on the ellipsoids at
the same grid (2.2e-3 to 7e-3 at Mach 2), but with one grid it cannot be
split into the fitted solver's error and the data's. The march's mass
balance falls only by 2.4 to 3.1 per refinement on this nose (2e-6 to
1.2e-5 on 2560 intervals), against 3.1 to 4.1 on the ellipsoids.

## Ellipsoids at low Mach numbers

At Mach 1.2 every ellipsoid with a caliber of cylinder was refused by
the fitted grids' size-ratio gate (neighbouring cells may differ in size
by at most 1.3). Measured on the start grids (CPU, nj = 20, the captured
grid, whose lines and wall cells the fitted grid keeps), at main 6185a47
with cf9297b:

| Nose (calibers) | Wall cells, largest ratio | The spacing's own ratio over a cell | Cylinder's cells, rounded |
| --------------- | ------------------------- | ----------------------------------- | ------------------------- |
| 0.5             | 1.805                     | 1.902, on the cylinder              | 5.96 to 6                 |
| 1               | 1.528                     | 1.551, on the cylinder              | 3.86 to 4                 |
| 1.5             | 1.492                     | 1.368, past the shoulder            | 3.08 to 3                 |
| 3               | 1.342                     | 1.310, past the shoulder            | 2.13 to 2                 |
| 6               | 1.695                     | 1.238, near the tip                 | 1.43 to 1                 |

**The spacing along the body.** Where the lines fan out, the C grid's
spacing along the body is divided by sqrt(1 + h d(angle)/ds) (h the
distance to the outer boundary, the angle the line's, s the arc length),
so the outer cells keep the wall cells' aspect ratio. At low Mach
numbers the outer boundary lies far out (on the 1.5-caliber nose at Mach
1.2, h = 8.3 at the shoulder), and where the lines stop turning, past
the shoulder, the spacing itself grows by up to 1.9 times over one cell
(the third column: the spacing at one cell's length on over the spacing
here). On the 1.5-caliber nose the cells grow from 0.238 to 0.355
between the first two of the cylinder, while its cylinder's 3.08 cells
are rounded to 3, a rescaling of 2.8%. The rounding of each interval
between breakpoints to a whole number of cells is the main cause only on
the shortest cylinder, the 6-caliber nose's, whose 1.43 cells become 1.

So `columnPositions` (`src/grid/spacing.ts`) can limit the spacing's
slope (`maxSpacingSlope`, opt-in, 0.15 on the blunt grids): the spacing
is replaced by the largest function below it whose slope is at most
0.15, across the breakpoints, so that a base grid's cells grow by at
most e^0.15 = 1.16 from one to the next, apart from the rounding (on
finer grids by less). It is applied to the base grid's spacing, the
density divided by the refinement (exact for a power of 2), so every
grid of a family gets the same limited spacing, scaled, and the families
nest exactly (tested at refinements 2, 4 and 8, node for node). Where
the spacing already changes more slowly the density is left exactly as
given: on the measured families of this record (the 3:1 and 2:1
ellipsoids at Mach 2, the 3:1 at Mach 3, the hemisphere at Mach 2 and 3,
the 1.5-caliber nose at Mach 2) the spacing's slope is at most 0.1252,
and their lines and nodes are bit-identical to those before at
refinements 1, 2, 4 and 8; refitted at nj = 20 they give the recorded
drags to ten figures (0.1528860052, 0.4979858367, 0.1524656811). The H
grids of sharp noses do not take the option, and their positions come
from the same arithmetic as before. With the slope limited, the wall
cells of the five noses above differ by at most 1.169, 1.233, 1.161,
1.350 and 1.709; those of the 1-, 3- and 6-caliber noses at the
shoulder, where the nose's and the cylinder's cells are rounded to whole
numbers apart (the 6-caliber nose's cylinder is one cell, 1.71 times the
nose's last).

**The end of a short cylinder.** The lines average the body normal over
a window that closes at the end of the body, keeping the outflow plane
vertical. On a short cylinder at low Mach numbers they turn vertical
over its last cells, and the outer cells there fan out. The start grids
at Mach 1.2, the slope limited, by the length of cylinder:

| Nose | 1 caliber | 2    | 3    | 4    | 5    | 6    | 8    |
| ---- | --------- | ---- | ---- | ---- | ---- | ---- | ---- |
| 0.5  | 2.06      | 2.20 | 1.49 | 1.23 | 1.21 | 1.22 | 1.23 |
| 1    | 1.71      | 1.63 | 1.45 | 1.20 | 1.21 | 1.22 | 1.23 |
| 1.5  | 1.35      | 1.38 | 1.24 | 1.24 | 1.22 | 1.22 | 1.24 |
| 3    | 1.35      | 1.24 | 1.23 | 1.26 | 1.23 | 1.23 | 1.24 |
| 6    | 1.71      | 1.23 | 1.23 | 1.24 | 1.24 | 1.25 | 1.26 |

(the largest size ratio of neighbouring cells; on one and two calibers
of the 0.5- to 1.5-caliber noses in the outer row near the end, on one
caliber of the 3- and 6-caliber noses at the shoulder). So a blunt
nose's fit solves a longer cylinder where it needs one
(`solvedBluntBody`, `src/analysis/fitted-flow.ts`): solvedBody's,
lengthened a caliber at a time, by at most 7, until the start grid meets
the size-ratio gate; if no length does, the shortest is solved and the
fitted grid's gates decide. As before, the drag is that of the body
asked for wherever the flow leaves its end supersonically (`baseMach`).
The measured families keep their cylinders. On the page the lengths are
tried between returns to the browser (`bluntStartInChunks`).

**Which cases pass**, on the CPU at nj = 20, with the page's checks
(`fittedCaseFailure`, run on every grid the page solves) at the end of
the body asked for; each entry the cylinder solved (calibers), the
fitted grid's largest size ratio, and the axial Mach number at the end
asked for (end: the end of the grid, where the outflow check holds;
the 5-caliber column was fitted on the cylinder given, which
`solvedBluntBody` keeps, its start grids passing):

| Mach | Nose | 1 caliber                                       | 2 calibers                                    | 5 calibers                                    |
| ---- | ---- | ----------------------------------------------- | --------------------------------------------- | --------------------------------------------- |
| 1.2  | 0.5  | 4; 1.19; 1.090                                  | 4; 1.19; 1.115                                | 5; 1.16; end                                  |
| 1.2  | 1    | 4; 1.16; 1.108                                  | 4; 1.16; 1.128                                | 5; 1.17; end                                  |
| 1.2  | 1.5  | 3; 1.20; 1.125                                  | 3; 1.20; 1.140                                | 5; 1.19; end                                  |
| 1.2  | 3    | 2; 1.19; 1.156                                  | 2; 1.19; end                                  | 5; 1.18; end                                  |
| 1.2  | 6    | 2; 1.20; 1.181; refused: wall cells at 49.6 deg | 2; 1.20; end; refused: wall cells at 49.6 deg | 5; 1.20; end; refused: wall cells at 49.5 deg |
| 1.3  | 0.5  | 3; 1.16; 1.152                                  | 3; 1.16; 1.188                                | 5; 1.16; end                                  |
| 1.3  | 1    | 3; 1.19; 1.181                                  | 3; 1.19; 1.208                                | 5; 1.17; end                                  |
| 1.3  | 1.5  | 1; 1.23; end                                    | 3; 1.15; 1.224                                | 5; 1.16; end                                  |
| 1.3  | 3    | 1; 1.14; end                                    | 2; 1.15; end                                  | 5; 1.17; end                                  |
| 1.3  | 6    | 1; 1.16; end                                    | 2; 1.20; end                                  | 5; 1.19; end                                  |
| 1.5  | 0.5  | 2; 1.17; 1.287                                  | 2; 1.17; end                                  | 5; 1.16; end                                  |
| 1.5  | 1    | 1; 1.20; end                                    | 2; 1.16; end                                  | 5; 1.14; end                                  |
| 1.5  | 1.5  | 1; 1.18; end                                    | 2; 1.17; end                                  | 5; 1.14; end                                  |
| 1.5  | 3    | 1; 1.23; end                                    | 2; 1.13; end                                  | 5; 1.15; end                                  |
| 1.5  | 6    | 1; 1.15; end                                    | 2; 1.15; end                                  | 5; 1.16; end                                  |

Every fit converged (shock speeds below 1e-12 of the sound speed,
residual below 1e-12). Before (at main, on the start grids, the fitted
gates), 16 of these 45 failed the size-ratio gate: at Mach 1.2 the 0.5-
to 1.5-caliber noses with one and two calibers, the hemisphere with
five, and the 3- and 6-caliber noses with one; at Mach 1.3 the 0.5- to
1.5-caliber noses with one and two; at Mach 1.5 the hemisphere with one.
Now all pass it; no base is subsonic at these lengths (the least axial
Mach number at an end asked for is 1.090, the hemisphere with a caliber
at Mach 1.2). One case is still refused: the 6-caliber nose at Mach 1.2,
whose wall cells near the tip are at 49.6 deg (gate 50). There, at x =
0.046, the line leaves the body at 16.5 deg to the axis where the body's
normal is at 56 deg: the window over which the lines average the normal
(of half-width 0.34 there, a quarter of the distance to the outer
boundary) is eight times the tip's radius of curvature (R^2 / L =
0.042), a limit of the generator's lines, not of the spacing. At Mach
1.3 the same nose's wall cells are at 54.9 deg.

**Families** of cases the page now serves, on nj = 20, 40 and 80 (CPU,
each finer grid started from the converged coarser one; on nj = 80 the
fit stopped once the drag's remaining iterative error, estimated
geometrically from its changes over 500 steps, was below 1e-9 of the
drag on two successive checks, the estimate in the last column):

| Nose, Mach        | Solved | nj = 20      | nj = 40      | nj = 80      | Order | Extrapolated | nj = 80 off it | Band    | Iterative, nj = 80 |
| ----------------- | ------ | ------------ | ------------ | ------------ | ----- | ------------ | -------------- | ------- | ------------------ |
| 1.5 calibers, 1.2 | 3      | 0.2474069016 | 0.2449467960 | 0.2443610023 | 2.07  | 0.2441657    | +8.0e-4        | 1.07e-3 | 3.4e-10            |
| 3 calibers, 1.2   | 2      | 0.1189100808 | 0.1177205505 | 0.1174564675 | 2.17  | 0.1173684    | +7.5e-4        | 1.01e-3 | 3.7e-10            |
| 0.5 caliber, 1.3  | 3      | 0.6075667281 | 0.6026884945 | 0.6013882165 | 1.91  | 0.6009157    | +7.9e-4        | 1.05e-3 | 2.7e-10            |
| 1 caliber, 1.5    | 1      | 0.4450351473 | 0.4435658209 | 0.4431993851 | 2.00  | 0.4430772    | +2.8e-4        | 4.1e-4  | 3.5e-10            |

(Each with a caliber of cylinder asked; Solved: the cylinder solved,
calibers; nj = 80 off it: the finest value against the extrapolation,
relative; Band: the page's band from the finest triple, 1.25 |e21| /
(2^p - 1) with the observed order p capped at 2, plus the floor of 7e-5
of the value, relative to it; the page itself needs a fourth grid to
confirm the order. Iterative: the remaining iterative error estimated at
the stop, relative; on nj = 20 and 40 the fits converged to the usual
tests, shock speeds and residual below 1e-12.) Every grid passes the
gates (neighbouring cells within 1.04 to 1.21, wall cells at 61.4 deg or
more, aspect ratios 8.1 or less), and the end asked for is crossed at
axial Mach numbers of 1.122 to 1.156 (on the 1-caliber nose at Mach 1.5
it is the end of the grid). Their nj = 20 values lie 0.44% to 1.33%
above their extrapolations, more than at Mach 2 and 3 (0.23% on the 3:1
ellipsoid at Mach 2).

**Behind the sonic line.** At these Mach numbers the sonic line reaches
the shock far back: on the nj = 20 grids the lines are supersonic across
from x = 0.62 on the 1.5-caliber nose at Mach 1.2, from x = 0.50 on the
3-caliber one, from x = 0.31 on the 1-caliber nose at Mach 1.5, and only
from x = 0.44 on the hemisphere at Mach 1.3, whose nose ends at 0.5, so
that it has no line to march from. The flow behind the sonic line is
barely supersonic (least Mach numbers 1.02 to 1.22 on the lines marched
from), and much of the nose behind it pulls forward. The march from each
grid's flow (as above: 640 and 1280 intervals extrapolated, the
reference extrapolated over nj = 40 and 80, the row next to the wall
left out), with the differences here relative to the nose's drag
(extrapolated at second order), since the drag behind the lines is small
and of either sign:

1.5-caliber nose, Mach 1.2 (nose's drag 0.2441657):

| x     | Min M | Share  | Reference    | Fitted: 20, 40, 80           | Fitted, ext. | March from 20, 40, 80        | Mass   | Fold   |
| ----- | ----- | ------ | ------------ | ---------------------------- | ------------ | ---------------------------- | ------ | ------ |
| 0.700 | 1.02  | -11.1% | -0.02721215  | +6.39e-4, +7.03e-5, +5.64e-6 | -1.59e-5     | -1.52e-3, -4.41e-4, -1.10e-4 | 2.6e-5 | 1.0e-3 |
| 0.792 | 1.04  | -10.5% | -0.02568975  | +2.27e-4, -2.59e-5, -1.88e-5 | -1.64e-5     | -6.72e-4, -1.79e-4, -4.47e-5 | 3.5e-7 | none   |
| 1.018 | 1.06  | -6.7%  | -0.01627658  | -2.24e-4, -1.18e-4, -3.69e-5 | -1.00e-5     | +5.17e-5, -4.16e-6, -1.04e-6 | 2.4e-7 | none   |
| 1.156 | 1.07  | -3.9%  | -0.009464562 | -2.33e-4, -1.07e-4, -3.32e-5 | -8.65e-6     | +2.75e-5, +1.25e-5, +3.12e-6 | 2.6e-7 | none   |
| 1.316 | 1.08  | -1.3%  | -0.003079773 | +6.85e-5, -5.56e-5, -2.08e-5 | -9.24e-6     | +1.31e-4, +2.10e-6, +5.24e-7 | 2.9e-7 | none   |

3-caliber nose, Mach 1.2 (0.1173684):

| x     | Min M | Share  | Reference    | Fitted: 20, 40, 80           | Fitted, ext. | March from 20, 40, 80        | Mass   | Fold   |
| ----- | ----- | ------ | ------------ | ---------------------------- | ------------ | ---------------------------- | ------ | ------ |
| 0.563 | 1.03  | -2.8%  | -0.003372618 | +4.37e-3, +1.23e-3, +5.68e-4 | +3.47e-4     | -7.15e-3, -2.47e-3, -6.18e-4 | 4.2e-5 | 1.6e-3 |
| 0.839 | 1.07  | -11.3% | -0.01326091  | +2.54e-3, +4.85e-4, +7.39e-5 | -6.32e-5     | -2.93e-3, -7.20e-4, -1.80e-4 | 4.5e-7 | none   |
| 1.265 | 1.10  | -13.5% | -0.01589123  | +1.25e-3, +2.07e-4, +2.11e-5 | -4.08e-5     | -1.86e-3, -4.66e-4, -1.17e-4 | 6.1e-7 | none   |
| 1.862 | 1.12  | -8.5%  | -0.009947763 | +4.05e-4, +3.78e-5, -1.04e-6 | -1.40e-5     | -3.75e-4, -7.34e-5, -1.83e-5 | 3.1e-7 | none   |
| 2.666 | 1.14  | -1.0%  | -0.001126085 | +4.60e-4, +1.61e-5, -8.03e-6 | -1.61e-5     | +1.88e-4, -2.04e-5, -5.10e-6 | 9.5e-9 | none   |

1-caliber nose, Mach 1.5 (0.4430772):

| x     | Min M | Share | Reference    | Fitted: 20, 40, 80           | Fitted, ext. | March from 20, 40, 80        | Mass   | Fold   |
| ----- | ----- | ----- | ------------ | ---------------------------- | ------------ | ---------------------------- | ------ | ------ |
| 0.337 | 1.03  | 6.5%  | 0.02894345   | +6.67e-4, +1.73e-4, +6.10e-5 | +2.37e-5     | -1.21e-3, -3.84e-4, -9.60e-5 | 5.7e-5 | 1.0e-3 |
| 0.408 | 1.08  | 1.9%  | 0.008423769  | +2.98e-4, +6.25e-5, +1.32e-5 | -3.20e-6     | -4.19e-4, -1.10e-4, -2.74e-5 | 2.6e-7 | none   |
| 0.535 | 1.13  | -1.9% | -0.008574967 | -7.21e-5, -2.46e-5, -7.32e-6 | -1.57e-6     | -8.54e-6, -5.59e-6, -1.40e-6 | 3.2e-8 | none   |
| 0.697 | 1.19  | -2.2% | -0.009724871 | -2.29e-4, -5.99e-5, -1.53e-5 | -4.89e-7     | +9.74e-5, +2.28e-5, +5.70e-6 | 5.8e-8 | none   |
| 0.835 | 1.22  | -0.9% | -0.004161943 | -1.80e-4, -4.50e-5, -1.12e-5 | +6.94e-8     | +5.48e-5, +1.43e-5, +3.57e-6 | 1.1e-7 | none   |

(Share: the fitted drag downstream of the line over the nose's, nj = 80;
Mass: the march's mass balance on 1280 intervals from nj = 80; Fold: the
march's largest penetration of the body, where it folds.) From the line
nearest the sonic line on each nose (least Mach number 1.02 to 1.03) the
march folds, its mass balance not falling with the intervals, as from
near-sonic data at Mach 2 (above). From the others its mass balance
falls by 2.4 to 5.2 times per doubling of the intervals.

- At Mach 1.5 the two converge as at Mach 2 and 3 (the fitted drag
  downstream at orders 1.92 to 2.26, the march at 1.91 to 2.13, but on
  the line at x = 0.53), and their second-order extrapolations differ by
  7e-8 to 3.2e-6 of the nose's drag.
- On the 3-caliber nose at Mach 1.2 the march converges at second order
  (2.03, 2.00, 2.46) and the fitted drag downstream faster (2.32 to
  4.20), as on the slender noses at low Mach numbers (above); at second
  order the extrapolations differ by 1.4e-5 to 6.3e-5 of the nose's
  drag, at the observed orders by 4e-7 to 2.4e-5 (x = 0.84 to 1.86).
- On the 1.5-caliber nose at Mach 1.2, behind whose lines lies -10.5% to
  -1.3% of its drag, neither converges at a steady order on these grids
  (the fitted part's error changes sign at x = 0.79 and 1.32), and the
  second-order extrapolations differ by 0.9e-5 to 1.6e-5 of the nose's
  drag.

Every difference lies well inside the bands (4.1e-4 to 1.1e-3 of the
values on nj = 80), but at Mach 1.2 the check is weaker than at Mach 2
and 3: the data it starts from are within a few percent of sonic. Ahead
of the sonic line, as at higher Mach numbers, the drag rests on the
family's own convergence.

## Two-scale noses: Haack, power series, detached tips

Measured on the grids of 0004's two-scale design (the family's
boundary on the first captured shock, smoothed; the fit from a second
capture), on the CPU at haack-grid a076072 (the merged code gives the
same grids, bit for bit, and converged drags within the fits' iterative
errors: 2.5e-12 on the 3-caliber nose at Mach 2, nj = 20). The fits stop
once the drag's remaining iterative error, estimated geometrically from
its changes per chunk of iterations (as SettlingValue, noise 1e-10
relative), is below 1e-9 of the drag on two successive chunks and every
shock face moves slower than 1e-9 of the sound speed; the estimates lie
between 0 (no rate measurable, the changes per 1000 steps below 1e-11 of
the drag) and 3.9e-11. The finer grids of the families measured last
started from the saved fit on the grid before (each fine cell the
state of its coarse cell; the converged fit does not depend on its
start). The records, the runners and the script that derives the
tables below are in `docs/research/two-scale-noses/`. LD-Haack (Von
Karman) noses, with the cylinder given:

| Nose, Mach      | nj = 20      | nj = 40      | nj = 80      | Order | Extrapolated, off nj = 80 | Band (no allowance) |
| --------------- | ------------ | ------------ | ------------ | ----- | ------------------------- | ------------------- |
| 1 cal. (1), 1.5 | 0.4350451014 | 0.4343207458 | 0.4341295777 | 1.92  | -1.58e-4                  | 1.97e-4             |
| 1 cal. (1), 2   | 0.4290980633 | 0.4286965393 | 0.4285845399 | 1.84  | -1.01e-4                  | 1.26e-4             |
| 1 cal. (1), 3   | 0.4018128674 | 0.4016558343 | 0.4016159860 | 1.98  | -3.37e-5                  | 4.22e-5             |
| 3 cal. (2), 2   | 0.0806584338 | 0.0804716502 | 0.0804049623 | 1.49  | -4.61e-4                  | 5.76e-4             |
| 3 cal. (2), 3   | 0.0730333563 | 0.0729189392 | 0.0728864162 | 1.81  | -1.77e-4                  | 2.22e-4             |
| 5 cal. (2), 1.5 | 0.0346246642 | 0.0344608100 | 0.0344269903 | 2.28  | -3.27e-4                  | 4.09e-4             |
| 5 cal. (2), 2   | 0.0327803301 | 0.0326755691 | 0.0326452038 | 1.79  | -3.80e-4                  | 4.75e-4             |

(In parentheses the calibers of cylinder; the extrapolation and the
band are the procedure's from the three grids, the order capped at 2,
relative to the finest value, before the allowance.) Every grid passes
the fitted grids' gates: wall cells at 71.8 deg or more (the 5-caliber
nose at Mach 1.5), neighbouring cells within 1.23, aspect ratios 5.5 or
less. The stagnation pressure converges at first order (on the 3-caliber
nose at Mach 2: -0.123%, -0.056%, -0.0215% of the pitot value): the
curvature is singular at the cusp. On that nose the tip region ahead of
5 tip scales carries 0.22% of the drag (1.74991e-4, 1.74912e-4,
1.74888e-4 on the three grids), so the order is set along the body, not
at the tip. The wall cells' entropy falls below the normal-shock value
along the body, by 11% at the end of the cylinder at Mach 2 and 32% at
Mach 3, on every grid: the entropy layer from the strong part of the
shock is thinner than any cell.

Other two-scale noses, on two grids only (3 calibers, 2 of cylinder,
Mach 2): the LV-Haack (C = 1/3) 0.0967893487, 0.0965432435 (-2.54e-3);
the power series of exponent 3/4 0.0767148567, 0.0766043922 (-1.44e-3),
whose shoulder meets the cylinder at 7 deg. With no reference they are
not served.

**Against the method of characteristics.** Each family's fitted flow on
nj = 20, 40 and 80, marched from grid lines behind the sonic line as in
"Blunt noses against the method of characteristics" (the row next to the
wall left out; 640, 1280 and 2560 intervals, the finest used). A line is
used where, on every grid, the march's mass balance on 2560 intervals is
below 3.5e-5 and its change from 1280 intervals below 3.5e-5 of the
nose's drag. Lines nearer the tip, where the entropy gradient at the
wall is steepest, fail it (mass balance 4.7e-5 to 3e-4 on the 3-caliber
noses; on the 5-caliber nose at Mach 1.5, changes with the intervals of
6.5e-5 to 3.2e-4 of the drag); on the 1-caliber noses, whose layer is
thicker, lines down to a least Mach number of 1.06 pass. The fitted drag
downstream of each line falls with the grid, the march from its data
rises, and the reference for the nose is the march extrapolated over the
grids plus the fitted drag ahead of the line, extrapolated (each at its
observed order and at second order; both differences are given):

| Nose, Mach  | Lines (x)    | Share of drag | Fitted, order | March, order | Extrapolation minus reference | nj = 80 minus reference |
| ----------- | ------------ | ------------- | ------------- | ------------ | ----------------------------- | ----------------------- |
| 1 cal., 1.5 | 0.50 to 0.73 | 24% to 4%     | 1.88 to 2.05  | 1.92 to 2.59 | +5e-7 to +6.8e-6              | 1.58e-4 to 1.65e-4      |
| 1 cal., 2   | 0.26 to 0.58 | 60% to 18%    | 1.65 to 1.89  | 1.76 to 1.86 | -4.9e-6 to +2.1e-6            | 9.6e-5 to 1.03e-4       |
| 1 cal., 3   | 0.13 to 0.41 | 82% to 38%    | 1.89 to 1.97  | 1.78 to 2.01 | -2.7e-6 to +1.6e-6            | 3.1e-5 to 3.5e-5        |
| 3 cal., 2   | 0.09 to 1.02 | 95% to 40%    | 1.49 to 1.74  | 1.16 to 1.31 | -1.24e-4 to +8.8e-5           | 3.4e-4 to 5.5e-4        |
| 3 cal., 3   | 0.32 to 1.05 | 81% to 41%    | 1.82 to 1.91  | 1.44 to 1.49 | -1.4e-5 to +4.5e-5            | 1.63e-4 to 2.22e-4      |
| 5 cal., 1.5 | 0.16 to 0.32 | 93% to 86%    | 2.29 to 2.30  | 1.52 to 1.58 | +2.20e-4 to +2.44e-4          | 5.5e-4 to 5.7e-4        |
| 5 cal., 2   | 0.41         | 84%           | 1.86          | 1.17         | +3.03e-4 to +3.33e-4          | 6.8e-4 to 7.1e-4        |

(relative to the nose's drag). On the 1-caliber noses the two agree
within 7e-6 of the drag and both converge at close to second order. On
the 3-caliber nose at Mach 2 the fitted drag converges at 1.49 and the
march from its data at 1.16 to 1.31 from the other side: the data carry
a slowly converging error, the unresolved entropy layer the likely
source. The tightest bracket (the line at x = 0.092, 95% of the drag,
whose upstream part changes by 1.6e-6 between the two finest grids) puts
the true drag between 0.0803759 and the nj = 80 value if both sequences
stay monotone: an error of at most 3.6e-4 on nj = 80, inside the band of
5.76e-4. On the 5-caliber nose at Mach 1.5 the order on these grids,
2.28, is above 2, but the fitted minus march difference falls by 4.06
and then by 2.76: the convergence slows, and the procedure's
extrapolation, its order capped at 2, lies 2.20e-4 to 2.44e-4 above the
references. There the finest grid lies 5.5e-4 to 5.8e-4 above them and
their lowest bound, which the band alone (4.09e-4) does not contain, nor
with the allowance of 7e-5 (4.8e-4). On the 5-caliber nose at Mach 2
(measured 2026-10-22: the fit on nj = 80 settled at 14000 iterations)
one line passes the criterion, at x = 0.41 (84% of the drag): the lines
nearer the tip fail it on nj = 80 (mass balance 4.3e-5 to 4.6e-5), and
those further back change by 3.5e-5 to 9.5e-5 of the drag from 1280
intervals. There the fitted drag converges at 1.86 and the march from
its data at 1.17, as on the 3-caliber nose at Mach 2, and the
procedure's extrapolation (order 1.79) lies 3.03e-4 to 3.33e-4 above
the reference, the finest grid 6.8e-4 to 7.1e-4 and 7.35e-4 above the
lowest bound. That reference rests on this one line: no second passing
line guards it. The lines next to it, at x = 0.18 and 0.27, fail the
criterion only on nj = 80's mass balance (4.6e-5 against 3.5e-5) and
give misses of +3.45e-4 to +3.64e-4 and +3.56e-4 to +3.57e-4; over the
seven lines marched (x = 0.08 to 1.0) the march's orders scatter from
0.53 to 1.92 and the references spread over 2.2e-4 of the drag
(`marches/moc-L5c2M2.txt`, `analysis/moc3.mjs`).

What the line criterion checks, and what it does not. It checks the
march's own convergence with the intervals and its mass balance, not
the error in the fitted solution's data on the start line, which is the
larger error here: the march from each grid's data converges over the
grids at its own order, and that error is extrapolated away, not
bounded. The lowest bound includes an extrapolated part too, the fitted
drag upstream of the line (on the 5-caliber nose at Mach 2, line 216,
that part moves the bound by -9.8e-5 of the drag from the nj = 80
value).

**The allowance and the served region.** So the allowance for two-scale
noses (`TWO_SCALE_DRAG_FLOOR`) is twice the largest miss of the
procedure's extrapolation over these references, and over the lines
next to the one the 5-caliber nose at Mach 2 rests on, rounded up:
8e-4, twice the 3.64e-4 of the line at x = 0.18 on that nose (the
passing line's 3.33e-4 alone would give 7e-4; the 2.44e-4 of the
5-caliber nose at Mach 1.5, before that reference, gave 5e-4), in place
of `FITTED_DRAG_FLOOR` on any start with its own outer boundary
(`fittedDragFloor`). With it every band above contains its error,
against the lowest bound of the marches (the finest grid's march plus
the upstream part extrapolated): the 5-caliber nose's at Mach 2 by 1.73
times (7.35e-4 below the nj = 80 value; 1.69 times against the lowest
bound of all seven lines marched, 7.55e-4), at Mach 1.5 by 2.08 times
(5.81e-4) and the 3-caliber nose's at Mach 2 by 2.27 times (6.06e-4),
the others' by more (2.6 times or more with the earlier 5e-4).

These are bands of three grids (nj = 20, 40 and 80). The page gives a
band only from four (to nj = 160), when the orders of the two finest
triples agree (0005), so its band on these noses is checked on four
grids as follows. The first such check (2026-10-24, the 1-caliber nose
at Mach 2, `runners/tmp-haackmoc/lane160.sh` and `check160.test.ts`,
`fits/check160-L1c1M2.json`): the fit on nj = 160 settled at 21000
iterations (gates passed: wall cells at 77.8 deg, neighbours within
1.18, aspect 3.0), and the four drags 0.42909806, 0.42869654,
0.42858454 and 0.42855449 give orders of 1.84 and 1.90 on the two
triples, so the page verifies it: the value 0.42855449, extrapolated to
0.42854347 (within 3.5e-7 of the references, 0.42854045 to 0.42854332),
with a band of 1.38e-5 from the grids and 3.57e-4 (8.32e-4 of the
value) with the allowance. Its error against the lowest bound of the
marches is 5.06e-5 of the value: the band contains it 16 times, but the
grids' part alone (3.2e-5 of the value) would not. The second check
(2026-10-25, `lane160b.sh`, `fits/check160-L3M2.json`), on the
3-caliber nose at Mach 2, whose fitted drag converges at 1.49 and its
march at 1.16 to 1.31: the fit on nj = 160 settled at 23000 iterations
(gates passed: wall cells at 77.6 deg, neighbours within 1.17, aspect
3.9), and the four drags 0.08065843, 0.08047165, 0.08040496 and
0.08038366 give orders of 1.49 and 1.65, so the page verifies it: the
value 0.08038366, extrapolated to 0.08037366 (inside the references,
0.08036084 to 0.08037794), with a band of 1.25e-5 from the grids and
7.68e-5 (9.55e-4 of the value) with the allowance. Its error against
the lowest bound of the marches is 3.41e-4 of the value: the band
contains it 2.8 times, but the grids' part alone (1.55e-4 of the value)
would cover less than half of it. On both noses checked the allowance,
not the grids' estimate, carries the band. The page's option of 320
cells across gives a band of five grids, which has not been checked on
any Von Karman nose: the result says so (`bandCaveat`), and is not
refused.

Only the
Von Karman nose is served (`bluntNoseRefusal`), and only inside the
outline of the (calibers, Mach) points referenced
(`VON_KARMAN_REFERENCES`, `insideOutline`): (1, 1.5), (1, 2), (1, 3),
(3, 2), (3, 3), (5, 1.5), (5, 2), whose outline has the corners
(1, 1.5), (5, 1.5), (5, 2), (3, 3) and (1, 3); a case outside is
refused with the reason, as are the other Haack noses and the power
series. The body's length is not a dimension of the outline: the
references have 1 or 2 calibers of body, the page accepts 0 to 30.
Measured on the 3-caliber nose at Mach 2 (2026-10-22,
`runners/tmp-haackmoc/lanecyl.sh`), against 2 calibers of body: with
none (solved with 1, the shortest the fit solves) the drag moves by
+6.5e-5 on nj = 20 and +2.1e-5 on nj = 40, with 30 by -2.8e-5 and
-8.7e-6, falling by about 3 per grid as the grid error does, so towards
the same value, and far inside the allowance: the body length is not
restricted. With 30 calibers of body the fitted grids fail the
aspect-ratio gate (14.0 and 14.7, against 13), so the page refuses that
case on that ground, with the reason. A reference at the open corner (5
calibers at Mach 3) is not done: its fit on nj = 80 stopped at 4000
iterations and was not resumed. If one passes, it extends the outline
and resets the allowance. On the GPU the page's path gives the 1-caliber nose at Mach 2
within 4.2e-8 of the CPU's value on nj = 20 (0.42909808121884696
against 0.42909806331220435; measured again on the merged code on
2026-10-22, SwiftShader, `tests/gpu/fitted-flow-gpu.test.ts`).

**Widening the outline: registration (2026-10-27, before any run).**
About half of the Von Karman noses of the refusal audit's population
(4 to 6 calibers, `docs/research/refusals`) lie outside the outline
above: 5 to 6 calibers at every Mach number, more than about 4 at Mach 2
to 3. New references are run for them (branch `claude/wip/vk-outline`)
and judged by the criteria above, unchanged:

- Cases: the Von Karman nose with 2 calibers of cylinder, as the 3- and
  5-caliber references, at 6 calibers and Mach 1.5, 2 and 3, and at 5
  calibers and Mach 3. At 4 calibers and Mach 3 only if neither case at
  Mach 3 passes (the outline then needs it). Nothing below Mach 1.5: the
  criteria were set at Mach 1.5 to 3, and on capped noses at Mach 1.3
  the march fails ahead of an embedded shock it cannot carry
  (`claude/wip/w6-build`, its README section 7); that a sharp Von Karman
  nose there is free of one has not been shown, and showing it would be a
  new test, not these criteria.
- Code: main at 5ba98ff, frozen for the runs. Every checkpoint and saved
  fit carries a fingerprint (the case, the runner's settings, a sha256 of
  the source files the fit and the march run on); a checkpoint with
  another is not resumed. The 5-caliber nose at Mach 3 starts again from
  nj = 20 (W5's nj = 80 checkpoint, on haack-grid's code, is not used);
  its nj = 20 and 40 drags are compared with W5's saved ones, for
  information.
- Fits, as above: nj = 20, 40 and 80, each finer one started from the
  coarser saved fit, with W5's runner (`fitsave.test.ts`) and early stop,
  at most 40000 iterations times the refinement. They pass if every fit
  settles within that, every fitted grid passes the fitted gates
  (`FITTED_QUALITY_LIMITS`), and the three drags converge monotonically.
- Lines: chosen on the nj = 20 fit before any march, by a rule fixed here
  (W5 chose its lines by hand from that fit's scan): the nose's lines
  behind the last one whose least Mach number is below 1.05 and ahead of
  the first whose fitted drag downstream is below 40% of the nose's (W5's
  lines on its 3- and 5-caliber noses carried 97% to 40%); seven targets
  spaced evenly in log x over that range, each taking the nearest line.
  Each grid's fitted flow is marched from them on 640, 1280 and 2560
  intervals (`moc.test.ts`, `fitdata.ts`, unchanged).
- The line criterion, unchanged: on every grid, the march's mass balance
  on 2560 intervals below 3.5e-5, and its change from 1280 intervals
  below 3.5e-5 of the nose's drag. A line whose march or upstream part
  does not converge monotonically over the three grids gives no
  reference and fails.
- References, lowest bound and miss as above (`moc3.mjs`); the allowance
  by the same rule: twice the largest miss over every reference, W5's and
  the new, and, for a case resting on one passing line, over the marched
  lines next to it, rounded up to one significant figure. If that is
  above 8e-4, `TWO_SCALE_DRAG_FLOOR` rises to it for every Von Karman
  nose, and the report says so before merge.
- A case passes when its fits pass, at least one line passes, and its
  band (three grids, with the allowance) contains its error against the
  lowest bound of every passing line. It then joins
  `VON_KARMAN_REFERENCES`, and the outline is their convex hull as before.
- A case that fails is not added and the outline is not extended there;
  the failure and its numbers are recorded here and in
  `docs/research/two-scale-noses/outline`. It is not re-run with other
  lines or settings under this registration. If a failed case would lie
  inside the hull of the passing ones, nothing is added until the owner
  decides.
- Not criteria, as for W5: a four-grid run to nj = 160 (the page keeps
  naming the two noses so checked), and the body length (W5's
  measurement on the 3-caliber nose stands).

**Sharp tips whose bow shock detaches** stay refused (the sharp
problem's message). On the same grids (0004), with 5 calibers of
cylinder at Mach 1.2:

| Case                                    | nj = 20      | nj = 40      | Change  | First face p vs pitot | Standoff           | First wall cell |
| --------------------------------------- | ------------ | ------------ | ------- | --------------------- | ------------------ | --------------- |
| Tangent ogive, 1 cal. (53 deg), M 1.5   | 0.4772137012 | 0.4759762450 | -2.6e-3 | -0.40%, -0.49%        | 0.087618, 0.087569 | 58.6, 56.1 deg  |
| Parabolic, 1 cal. (45 deg), M 1.2       | 0.4045023927 | 0.4021745254 | -5.8e-3 | -1.56%, -1.63%        | 0.292412, 0.292267 | 52.4, 49.0 deg  |
| Tangent ogive, 1.5 cal. (37 deg), M 1.2 | 0.2771170110 | 0.2757099379 | -5.1e-3 | -5.0%, -4.8%          | 0.141297, 0.141242 | 45.4, 41.4 deg  |

The first face's pressure sits below the pitot value and does not move
towards it: the flow at a sharp corner is singular, and the pressure on
the first face is its average over the cell, not the stagnation value.
The drags change by 2.6e-3 to 5.8e-3 of their values between the two
grids, with no third grid and no reference; the parabolic nose on nj =
40 and the 37 deg ogive on both grids fail the 50 deg wall-cell gate
(measured ungated), as 0004 predicts.

## Open

- One-sided reconstruction at a nose's corner with the cylinder: cleaner
  second order on cone-cylinders at low Mach numbers, at the cost of
  wider bands (see above).
- The finer grids of the gate and slender-nose families (in progress);
  cones at Mach 5 on nj = 80.
- Noses whose bow shock is attached at the tip but detaches downstream,
  and the fitted shock past the base.
- Blunt noses on the drag page: the part of the drag ahead of the lines
  the march can start from (40% of the 3:1 ellipsoid's at Mach 2, 76% of
  the 1-caliber Von Karman nose's at Mach 1.5) still has only the fitted
  family's own convergence, and the stagnation-point checks. Two-scale noses: the
  outline's corner at 5 calibers and Mach 3 (not done); the other
  Haack noses and the power series (no reference); sharp tips whose
  shock detaches (no third grid, no reference).
- The blunt grid's lines near a slender tip at low Mach numbers: on the
  6-caliber ellipsoid at Mach 1.2 they leave the body 40 deg off its
  normal near the tip, and the wall cells there fail the 50 deg gate
  (see "Ellipsoids at low Mach numbers").
