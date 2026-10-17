# 0006: The bow shock fitted, not captured

- **Status:** Implemented on the CPU engine (`src/solver/shock-fitting.ts`),
  measured on blunt and sharp noses; not yet used by the drag page or on
  the GPU.
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

| Shock    | nj = 20  | nj = 40  | nj = 80 | nj = 160 |
| -------- | -------- | -------- | ------- | -------- |
| Captured | -0.395%  | -0.259%  | -0.151% | -0.081%  |
| Fitted   | +0.0248% | +0.0062% |         |          |

The fitted error falls by 4.0 per refinement: second order, where
capture gave about first. On 40 cells across it is already 13 times
smaller than capture on 160.

Tangent ogive of NACA TN 3716 (3 calibers, 7 calibers of cylinder),
Mach 1.98, forebody pressure drag against the method of characteristics
(Cd = 0.0988034, converged to 1e-8 on 640 and 1280 intervals):

| Shock               | nj = 20  | nj = 40  | nj = 80 | nj = 160 |
| ------------------- | -------- | -------- | ------- | -------- |
| Captured            | +1.210%  | +0.174%  | -0.025% | -0.042%  |
| Fitted, x0 = 1e-3 L | +0.2822% | +0.0684% |         |          |
| Fitted, x0 = 1e-4 L | +0.2819% | +0.0684% |         |          |

Second order again (4.1 per refinement); the start x0 changes the drag by
3e-6 of its value or less. Extrapolated at second order from the two
grids the drag is 0.098800, 3e-5 below the exact value, where the
captured shock's values converge to 4.4e-4 below it.

## Open

- Third grids on the cone and the ogive, to confirm the order and set the
  floor for fitted results.
- The drag page: the fitted solver on the GPU, families and their bands.
  Measured so far for the design: the shock must move one step's worth
  (W dt) at a time. Moving it every 20 flow steps by one step's worth
  converges to the same state to all ten digits printed (Mach 2
  hemisphere, nj = 20: Cd 0.7909688137, 4205 moves in 84100 steps, against
  4791 steps moving every step), but moving it by the 5 or 20 steps' sum
  diverges even with the boundary updated every step. So the number of
  moves stays in the thousands, and rebuilding the double-precision
  geometry on the CPU at each one would cost too much on fine grids. The
  geometry will be rebuilt on the GPU, in single precision, from the
  heights: each line keeps the fractions of its height at which its nodes
  lie, set once in double precision, so that every difference the metrics
  need (along a line, between neighbouring lines) is a sum of differences
  computed once in double precision and of small changes in height,
  without the cancellation of single-precision absolute coordinates.
  Each cell then also keeps its fraction along its line, which makes the
  remap a short interpolation along each column.
- Noses whose bow shock is attached at the tip but detaches downstream,
  and the fitted shock past the base.
