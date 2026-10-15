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

Measured when the tests were written:

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
ramp force then fluctuates by 4e-5 to 4e-4 relative, up to about 1.6 drag
counts on a rocket, above the 1-count convergence target. Larger limiter
smoothing, other flux functions and wave-speed estimates, characteristic
reconstruction and sensor-blended fluxes were tried and did not cure it
reliably.

The remedy is a shared reconstruction (`reconstruction: 'shared'`, in
`src/scheme/reconstruction.ts`): one smooth van Albada factor per cell and
direction, the smallest of the four variables' factors, applied to all of
them. Every configuration states its choice: steady runs (the ramp demo and
the steady validation) use `'shared'`, time-accurate tests use
`'perVariable'`. Measured on the CPU engine (60 x 30 cells; 120 x 60 in
brackets), against per-variable limiting:

| Case                               | Per-variable                      | Shared                              |
| ---------------------------------- | --------------------------------- | ----------------------------------- |
| Wedge M 2.5, 10 deg: residual      | 7e-3 (2e-2), stalled              | 2e-14 (3e-14)                       |
| Wedge: wall pressure error         | +0.039% (-0.017%)                 | +0.024% (+0.007%)                   |
| Wedge: spread along the plateau    | 0.39% (0.058%)                    | 0.025% (0.004%)                     |
| Wedge: shock angle error           | -0.07 to +0.13 deg (0.00 to 0.09) | +0.08 to +0.32 deg (+0.04 to +0.15) |
| Strong wedge M 5, 20 deg           | not measured                      | residual 3e-13, overshoot 0.37%     |
| Expansion M 2, 10 deg: wall press. | +0.036% (+0.021%)                 | -0.034% (-0.006%)                   |
| Isentropic vortex, order           | 2 (unlimited slopes)              | 1.13                                |

So the shared reconstruction converges and gives more accurate and more
uniform wall pressures, at the cost of a slightly thicker captured shock and
of smooth-flow order: wherever any variable has a smooth extremum, all
variables drop towards first order. Body pressures, which drag depends on,
lie in monotone regions; wakes and vortex cores will show the cost, and it
is to be re-measured with the viscous solver. Limiter freezing (fixing the
factors once the residual has fallen by several orders) converges anything
but makes the answer depend on when it is frozen, by up to 7e-5 relative;
it remains a possible safety net, not the remedy.

**Open issue: the shared reconstruction in 32-bit floats.** On the GPU the
wedge converges to the f32 floor (residual 1e-5 relative) on 60 x 30
cells, but on 120 x 60, the demo's default, the residual stalls at about
2e-2, although the ramp pressure is within 0.02% of exact. The expansion
corner does not settle even on 60 x 30: cells downstream of the fan keep
wandering by up to 2.5e-4 in density, and the pressure there differs from
the converged CPU solution by up to 4.5e-4 (wall pressure varies by about
1e-5). In f64 the expansion carries a residual of about 1e-11, and the CPU
results are unaffected. A product of the four factors instead of their
minimum converges in f32 and f64 alike on 60 x 30, but doubles the
shock-angle error and the expansion's wall-pressure error; a 4-norm of the
factor deficits behaves like the minimum, and a 2-norm stalls on the wedge
at 120 x 60. The root cause is being investigated; until it is settled, the
GPU expansion test uses per-variable reconstruction, and GPU convergence is
only claimed on the coarse grid.

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
