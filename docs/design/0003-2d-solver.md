# 0003: Two-dimensional solver on structured grids

- **Status:** Accepted for implementation (milestone M3). It follows from
  [0002](0002-architecture.md) and is needed by every physics option there.
- **Date:** 2026-10-14

## Scope

Compressible Euler equations on a single structured, curvilinear grid
block, in planar or axisymmetric geometry, on the CPU (reference) and the
GPU. Multiblock grids, local time stepping for steady problems, and the
viscous terms build on this.

## Grid and metrics

A block has `ni x nj` cells between `(ni + 1) x (nj + 1)` nodes. Metrics
are computed once, in double precision, from the node coordinates:

- **i-faces** join nodes `(i, j)` and `(i, j + 1)`; their normal points
  towards increasing i. **j-faces** join `(i, j)` and `(i + 1, j)`; their
  normal points towards increasing j. Each face stores its unit normal and
  its area (length in planar geometry).
- **Cell volume** is the polygon area (shoelace formula) in planar
  geometry.
- **Axisymmetric geometry** (x along the axis, y the radius) uses the same
  equations per radian of revolution: face areas are multiplied by the
  radius of the face midpoint, and cell volumes by the radius of the cell
  centroid. The geometric source term `p * A` (A the cell's planar area)
  in the radial momentum equation balances the pressure on the faces
  exactly for a uniform state, because the closed contour integral of
  `r n_r ds` equals the planar area `A` (divergence theorem) and the
  midpoint rule integrates r exactly on straight faces. So uniform flow is
  preserved to round-off, which the tests check.

## Discretisation

- **State:** conserved `(rho, rho u, rho v, E)`, which also fits one
  `vec4f` per cell on the GPU.
- **Flux:** the 1D fluxes, applied in the face-normal frame. The normal
  velocity takes the role of the 1D velocity; the tangential velocity is
  carried with the contact wave (HLLC) or by the Rusanov average. The
  Roe-averaged sound speed in the Einfeldt estimate includes the
  tangential kinetic energy.
- **Reconstruction:** MUSCL on primitive variables, dimension by dimension
  along grid lines, with index-based slopes. This is second order on smooth
  grids, the standard choice for structured codes.
- **Boundary conditions** through two layers of ghost cells: fixed
  (supersonic inflow) state, extrapolation (supersonic outflow), slip wall
  (velocity mirrored about the boundary face), and periodic. A symmetry
  plane is a slip wall. In axisymmetric geometry, the axis is a slip wall
  whose faces have zero area.
- **Time stepping:** SSP Runge-Kutta. The time step of each cell is
  `CFL * V / (sum over the cell's two directions of (|u_n| + a) * S)`,
  using the mean face area of each direction. Time-accurate runs use the
  smallest of these globally; steady runs may use each cell's own value
  (local time stepping), which converges faster but has no physical time.
- **Wall pressure** is taken from the momentum flux through the wall face
  (the mass flux there is zero), the same quantity that will be integrated
  for drag.

## Verification (gates for M3)

| Test                                                                           | Checks                                                                   |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Uniform flow on a randomly perturbed grid, planar and axisymmetric             | Metrics and source term: preserved to round-off                          |
| Isentropic vortex advected on a periodic, sinusoidally distorted grid          | Second-order accuracy on curvilinear grids (exact solution: translation) |
| Flux rotational invariance; 2D flux reduces to 1D for zero tangential velocity | Flux in the normal frame                                                 |
| Oblique shock from a wedge                                                     | Shock angle and post-shock state against the theta-beta-Mach relation    |
| Prandtl-Meyer expansion at a convex corner                                     | Downstream Mach number against the Prandtl-Meyer function                |
| Mutation checks                                                                | Tests catch planted bugs in metrics, boundaries and fluxes               |

The oblique-shock and Prandtl-Meyer reference values are computed from the
analytic relations (in `src/validation`), which are themselves tested
against consistency conditions, so no tabulated numbers need to be copied.

## Results (M3a, CPU engine)

Measured when the tests were written, with per-variable reconstruction
(the steady cases were rerun with the shared reconstruction; see below):

- Uniform flow is preserved to round-off on randomly distorted grids, in
  planar and axisymmetric geometry.
- The isentropic vortex converges at second order on a sinusoidally
  distorted periodic grid.
- Wedge (M = 2.5, 10 deg): wall pressure within 0.04% of the oblique-shock
  value on 60 x 30 cells and 0.02% on 120 x 60; shock angle within 0.1 deg.
- Expansion corner (M = 2, 10 deg): wall pressure within 0.07% (60 x 30)
  and 0.01% (120 x 60).
- The first cell layer along the walls carries a numerical entropy layer
  from the corner (entropy error about 2e-2, falling to 1e-3 two cells out),
  about one cell thick at any resolution. Pressure is unaffected; the Mach
  number is within 0.2% away from the wall. This is a known behaviour of
  inviscid wall boundaries and does not affect integrated pressure forces.

Limiter choice: a TVD version of van Albada (zero at extrema) stalled the
steady residual at about 2e-3; the original smooth form with
`VAN_ALBADA_EPSILON = 1e-6` converges the expansion case to round-off.

**Steady convergence with captured shocks.** With HLLC and per-variable
van Albada limiting, the wedge residual stalls at 7e-3 to 2e-2 on several
grid alignments: the cells inside the captured shock fall into a limit
cycle in which each variable's limiter switches separately. The integrated
ramp force then fluctuates by 4e-5 to 4e-4 relative: for a rocket with a
drag coefficient of about 0.4, up to 1.6 drag counts, above the 1-count
convergence target. Larger limiter
smoothing, other flux functions and wave-speed estimates, characteristic
reconstruction and sensor-blended fluxes did not cure it reliably.

The remedy is a shared reconstruction (`reconstruction: 'shared'`, in
`src/scheme/reconstruction.ts`): the van Albada limiter applied to the
state as a vector. With A and B the backward and forward differences of
(rho, u, v, p) across a cell, one factor
`f = max(0, 2 (A.B + eps) / (|A|^2 + |B|^2 + 2 eps))` scales the central
slope of every variable, so the variables cannot cycle between limiter
states one by one. Every configuration states its choice: steady runs (the
ramp demo, the steady validation) use `'shared'`, time-accurate tests
`'perVariable'`.

Measured on the CPU engine, 60 x 30 cells (120 x 60 in brackets):

| Case                                     | Per-variable                      | Shared                              |
| ---------------------------------------- | --------------------------------- | ----------------------------------- |
| Wedge M 2.5, 10 deg: residual            | 7e-3 (2e-2), stalled              | 2e-14 (3e-14)                       |
| Wedge: wall pressure error               | +0.039% (-0.017%)                 | +0.015% (+0.007%)                   |
| Wedge: spread along the plateau          | 0.39% (0.058%)                    | 0.004% (0.0004%)                    |
| Wedge: shock angle error                 | -0.07 to +0.13 deg (0.00 to 0.09) | +0.07 to +0.24 deg (+0.03 to +0.13) |
| Same wedge, domain height 1.0            | stalled at 2e-2 (3e-2)            | 2e-14 (3e-14)                       |
| Strong wedge M 5, 20 deg                 | stalled at 2e-2, overshoot 22%    | 2e-14, overshoot 0.28%, wall +0.24% |
| Expansion M 2, 10 deg: wall pressure     | +0.036% (+0.021%)                 | +0.0015% (-0.0001%)                 |
| Expansion: residual                      | 2e-14 (3e-14)                     | 2e-14 (3e-14)                       |
| Isentropic vortex: L1 order (van Albada) | 2.04, 2.31 (32 to 128 cells)      | 2.45, 2.39                          |

The shared reconstruction converges and is the more accurate of the two on
every measure except the shock angle, where its captured shock is slightly
thicker. On smooth flow it loses nothing: limiting fades as the vortex is
resolved, and on 128 cells its error is within 17% of unlimited slopes.

The price is in what a single factor can promise. Each variable's face
value is no longer confined to its own neighbour range: a variable with a
small extremum, riding on larger monotone changes of the others, can pass
its neighbours by up to a quarter of its own differences across the cell
(`tests/scheme/reconstruction.test.ts` states the bound). At shocks and
contacts the variables jump together, the difference vectors oppose, and
the factor falls to zero as it should. The factor also weights the
variables by their nondimensional differences, as `eps` does, so it assumes
variables of order one; a dimensional code would weight them.

Two other forms were measured and rejected. The smallest of the four
per-variable factors cured the wedge, but cut the vortex order to 1.13,
stalled next to cone surfaces in axisymmetric flow (residual 5e-2, surface
pressure off by 0.8%), and in 32-bit floats amplified round-off where a
variable with tiny slopes owned the minimum (its factor was then about 700
times as sensitive to that variable as to the others). A product of the
four factors converged but doubled the shock-angle error. Limiter freezing
(fixing the factors once the residual has fallen by several orders)
converges anything but makes the answer depend on when it is frozen, by up
to 7e-5 relative; it remains a possible safety net, not the remedy.

On the GPU, in 32-bit floats, the wedge (60 x 30 and 120 x 60) and the
expansion converge to the f32 floor, a residual of about 1e-5 of its
initial value.

## Results: axisymmetric flow over cones

A ramp grid in axisymmetric geometry is a sharp cone at zero angle of
attack: the lower boundary is the axis upstream of the apex (faces of zero
area) and the cone surface after it. The Taylor-Maccoll solution
(`src/validation/taylor-maccoll.ts`) is the reference. The flow is conical,
so the exact surface pressure is uniform; the computed one approaches it
downstream of the apex, where the grid resolves the shock layer.

Shared reconstruction, 60 x 30 cells, 2000 iterations
(`tests/engine-cpu/euler2d-cone.test.ts`):

| Cone                | Residual | Surface pressure, x = 1.0 to 1.4 | Shock position     |
| ------------------- | -------- | -------------------------------- | ------------------ |
| M 2.35, 10 deg half | 2e-14    | +0.03%                           | 0.14 to 0.24 cells |
| M 2, 15 deg half    | 1e-14    | -0.03%                           | 0.08 to 0.15 cells |
| M 3, 20 deg half    | 1e-14    | -0.25%                           | 0.10 to 0.19 cells |

The M 3, 20 deg cone has the thinnest shock layer (shock at 29.6 deg) and
converges with the grid at about first order, as the under-resolved apex
region is carried along the surface. Surface pressure error at x = 1.3:

| Grid      | Iterations | Error   |
| --------- | ---------- | ------- |
| 60 x 30   | 3000       | -0.22%  |
| 120 x 60  | 6000       | -0.12%  |
| 240 x 120 | 12000      | -0.061% |

Each run converged to a residual of 1e-14 to 3e-14. Taking Taylor-Maccoll
as exact, the error halves at order 0.91 from the coarse pair and 0.94 from
the fine pair; without that assumption the three grids give order 0.87. The
asymptotic range is therefore not firmly established, and Richardson
extrapolation with orders from 0.87 to 1 gives -0.005% to +0.006%: the
solver converges to the Taylor-Maccoll solution to within about 0.01%. Grids that cluster cells
at the nose, planned for the M4 grid generator, are the remedy on coarse
grids.

The per-smallest-factor form of the shared reconstruction, tried first,
stalled on all three cones (residual 5e-2). Per-variable reconstruction is
about as accurate as shared on the cones and converges on the two milder
ones, but on the M 3, 20 deg cone its residual was still 5e-7 after 3000
iterations.

## Results (M3b, GPU engine and rendering)

- The GPU engine runs the same scheme in f32 with buffers packed to fit
  WebGPU's default limit of 8 storage buffers per shader stage. It matches
  the CPU engine on the vortex and on the converged expansion, iteration by
  iteration under local time stepping on uneven cells, and the exact
  solutions as the CPU engine does. In the live demo the ramp pressure is
  within about 0.1% of exact theory at 120 x 60 cells.
- Display fields (schlieren, Mach number, pressure, density) are computed
  on grid nodes on the GPU, matching a TypeScript reference to 1e-5, and
  drawn as smoothly shaded triangles straight from the solver's buffers.
  Schlieren uses exp(-k |grad rho| / max |grad rho|) with k = 12; colours
  use bowshock's own colour map, interpolated in Oklab.
- Graceful degradation: if presenting WebGPU frames to a canvas loses the
  device, the page continues on a fresh device, rendering offscreen and
  copying frames to a 2D canvas; if that also fails, it continues on the
  CPU engine at reduced resolution. Each step is reported on the page.
  Headless Chromium on software WebGPU (as in CI) is one such environment:
  compute works, canvas presentation does not.
