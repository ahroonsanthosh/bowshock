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
