# 0006: The bow shock fitted, not captured

- **Status:** Implemented on the CPU engine (`src/solver/shock-fitting.ts`)
  and the GPU engine (`src/engine-gpu/shock-fitting-gpu.ts`), measured on
  blunt and sharp noses; not yet used by the drag page.
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

## Open

- The families again on grids with fixed fractions, and more cases, to
  set the floor for fitted results (in progress).
- The drag page: the fitted solver on the GPU, families and their bands.
- Noses whose bow shock is attached at the tip but detaches downstream,
  and the fitted shock past the base.
