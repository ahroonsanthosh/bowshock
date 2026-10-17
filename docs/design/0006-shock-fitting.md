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

After G. Moretti and M. J. Abbett, AIAA J. 4 (1966) 2136, in a finite-volume
form (M. D. Salas, AIAA J. 14 (1976) 583):

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

At convergence W = 0 on every face (here to 1e-12 of the free-stream
sound speed) and the motion terms vanish, so the steady state does not
depend on the path to it.

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
edge of the captured shock, smoothed. **Sharp noses** start just behind
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
Mach 2), the error is over a thousand times smaller and changes smoothly
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
3e-6 of its value or less. Extrapolated from the three grids the drag is
0.09880317, 2.4e-6 of its value below the exact one, and the error band
of the finest grid (GCI, 0005) is 0.021%, against an actual error of
0.016%. The captured shock's values converge to 4.4e-4 below the exact
value: fitting removes the floor that capture leaves, to within the
method of characteristics' own accuracy. On the GPU, on grids with fixed
fractions (the drag page's solver, `verifiedFittedDragGpu`), the drags
0.0990735, 0.0988682, 0.0988189 fall by 4.16 (order 2.06) and
extrapolate to 0.09880337, 3e-7 below the exact value; the finest band,
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
- At each check (every 500 steps on the base grid) the drag is evaluated
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

On the GPU too, a bare 20 degree cone at Mach 3 on nj = 20, 40 and 80
(`verifiedFittedDragGpu`, before the domain was extended past the base):
+2.52e-4, +6.22e-5, +1.53e-5 of the exact drag, falling by 4.05 (order
2.02) and extrapolating to within 5.7e-8 at that order, 3.2e-7 at second
order; the finest band, 2.0e-5, contains the actual error.

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

## The floor for fitted drag

Measured by audit agents on grids with fixed fractions (CPU, nj = 20,
40 and 80), forebody drag against exact values. Cones on 4 calibers of
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
exact values. Every finest-grid band measured, on cones and ogives,
contains its error.

The procedure's band extrapolates at second order at most, so the error
it can miss is that of its own extrapolation, at an order capped at 2.
On the families that have settled it lies at most 3.4e-5 of the value
from the exact one (the 5-caliber ogive, whose order settles at 2.11),
against 4.6e-4 with the shock captured. The floor for fitted drag
(`FITTED_DRAG_FLOOR`) is set at 7e-5, about twice that. The cone at Mach
1.3, 5 deg, whose order had not settled on nj = 80, settles on nj = 160:
+0.00784% there, the finest triple at order 1.98, extrapolated within
7.2e-6 of the exact value, and its band (8.9e-5) contains its error; the
orders of its two triples (2.39 and 1.98) agree within the procedure's
0.5, so it would be given a band. Grids that fail the quality gates (wall cells at under 60 deg on
steep tips, aspect ratios above 10 on long bodies) and slender noses at
low Mach numbers are being measured before the gates are reconsidered.

**The domain extends at least one caliber past the nose.** With the
zero-gradient outflow at the base of a bare nose, the cells next to it
are perturbed: the drag of a bare 10 degree cone at Mach 2 (nj = 20)
moves by 6.6e-5 of its value, and bare secant-ogive and parabolic noses
at Mach 2.5 by 1.0e-4, against 1.2e-7 between one and four calibers of
cylinder. Where the flow leaves the end of the body asked for
supersonically (axial Mach number above 1 in the column of cells ahead
of it), nothing behind it reaches the body, and a cylinder adds no
pressure drag, so the fit always solves at least one caliber of cylinder
(`sharpFitProblem`, `bluntFitProblem`) and checks that column
(`baseMach`); where the flow there is subsonic the case is refused.

**The flow behind the tip must be supersonic.** The inflow plane at x0
imposes all four states of the tip cone's conical flow, which holds only
where the flow crosses it supersonically. A robustness scan of the
page's inputs found tips where it does not: on a 3-caliber tangent ogive
at Mach 1.2 (18.9 deg) the conical surface flow is at Mach 0.85, and on
a 26.6 deg cone at Mach 1.5 at 0.96, where the drag with 2 calibers of
cylinder came out 3.3% below the Taylor-Maccoll value of an endless
cone, the shoulder reaching upstream. Such tips are now refused
(`sharpFitProblem`), as the method of characteristics refuses them. On
the convex noses of the page the flow speeds up along the body, so the
check at the end of the body is a guard behind this one.

## Open

- The floor on grids the quality gates refuse (steep tips, long bodies)
  and on slender noses at low Mach numbers, to set the gates for fitted
  grids on evidence (in progress); cones at Mach 5 on nj = 80.
- Noses whose bow shock is attached at the tip but detaches downstream,
  and the fitted shock past the base.
- Blunt noses on the drag page: a captured start on the GPU, and grids
  for Von Karman (Haack) and power-series noses.
