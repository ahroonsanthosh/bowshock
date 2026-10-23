# 0021: Fins in the airflow: 3D Euler on a body-fitted sector (Stage A)

- **Status:** Proposed. A design record only: no solver code exists for
  it. Written for an independent review before any code, as the owner
  asked when approving Stage A (2026-10-23). Every number in it is either
  quoted from a committed record (cited) or an estimate, and says so;
  nothing below was measured for this record.
- **Date:** 2026-10-23
- **Inputs:** [0002](0002-architecture.md) sections 4, 6, 10 (milestone
  M10) and 12; [0003](0003-2d-solver.md) (the 2D scheme and its
  axisymmetric source); [0004](0004-grids.md) (grids and quality gates);
  [0005](0005-solution-verification.md) (the band procedure, the noise,
  the floors); [0006](0006-shock-fitting.md) (the fitted bow shock, the
  GPU's limits and the starts); [0008](0008-total-drag.md) sections 4 and
  6.1; [0009](0009-fin-wave-drag.md) (the product rule this replaces, and
  its section 6, what it does not cover); [0010](0010-base-drag-and-total.md)
  section 3 (the total); [0013](0013-transonic.md) (the two-float engine,
  the red-black relaxation and the fitted-window settling rule);
  [0014](0014-refusals.md) section 10 (the registration and its
  amendments); 0017 section 6.2 (the 3D view's rules, on the interface
  branch); the advisor's recommendation to the owner (Cartesian cut
  cells, LES and lattice Boltzmann rejected; RANS later; the label
  "fins solved, inviscid; base estimated").

## Summary of the decisions

1. **What is solved.** The steady inviscid (Euler) flow around N identical,
   equally spaced, uncanted fins on the cylinder of a nose-cylinder body at
   zero incidence, in one sector of 360/(2N) degrees, from a start plane
   just ahead of the fins to the base plane. The nose is not solved again:
   its 2D fitted solution (0006) gives the flow entering the sector and
   the outer boundary, which is the 2D fitted bow shock, frozen. The fin
   shocks are captured inside it. The quantity is the pressure drag of the
   fin faces.
2. **The grid.** The sector's main block is the body-to-shock space
   revolved through the sector, with its first circumferential face
   displaced onto the fin's face over the planform (0002 section 4). The
   fin tip's thickness is represented exactly by a second, thin block
   above the tip (the slab), point-matched to the first. Sections served:
   sharp and symmetric about the fin's midplane (single wedge, double
   wedge, hexagonal). Rounded or square leading edges, flat plates and
   asymmetric sections are refused, with reasons (section 2.6).
3. **The scheme.** A finite volume in cylindrical coordinates with
   geometric source terms, chosen so that an axisymmetric state on a
   revolved grid is exactly the 2D axisymmetric scheme's state. The 2D
   kernels are reused: HLLC with one more tangential velocity, the shared
   scaled van Albada reconstruction with one more difference, SSPRK2 with
   local time steps, the red-black relaxation with 2 sweeps as an option,
   the settling and fitted-window rules. State in 32 bits, with a
   registered switch to two-float (0013) if the measured noise is too
   large.
4. **The band.** Four grids at a refinement ratio of 1.5, not three at 2:
   they cost less (54 against 73 base-grid units of cells) and keep 0005's
   rule that a band needs two triples whose orders agree. The drag floor
   is measured anew for this quantity, from planar cases with exact
   references, and is at least 0005's captured-shock floor of 1e-3.
5. **The ladder, registered now:** code checks; (a) the finless sector
   reproduces the 2D solution; (b) planar Euler on fin sections against
   shock-expansion theory; (c) thin fins on a plane wall against linear
   theory in the thin limit; (d) ten registered 3D families. Kill
   criteria are fixed now (section 4.8).
6. **What it replaces.** Only the fin wave drag's nominal (0009's product
   of the exact section drag and the linear 3D ratio). Not fin friction,
   not the edge terms, not the base or the fins-on-base factor. The fins'
   own-drag model-form band is re-formed on the same ARCAS increments with
   the new nominal. Inside the Basic Finner's class and its validated
   sub-class the tested product rule stays. BRL 934 range A is not run
   again. ARCAS and RM A53D02 cannot be tests (section 5.4); the tests are
   held-back ranges not yet run. Proposed 0014 10.7 (u) text is in
   section 5.5.
7. **Cost.** About 250 bytes a cell in 32 bits; the page's four grids
   peak near 0.95 million cells, about 0.25 GB. Estimated 1 to 3 minutes
   a Mach number on a mid-range GPU (unmeasured), days on SwiftShader,
   where it is not offered.
8. **The view.** Where a 3D family has a band, the 3D view draws the
   solved field, mirrored to 360 degrees (exact under the symmetry), with
   the legend "Fins solved in the airflow: inviscid, zero incidence. No
   boundary layer; the friction and the base are estimated; behind the
   base not simulated."

## 1. Scope

**Solved:** the inviscid steady flow between the start plane and the base
plane, around the fins and the cylinder, inside the 2D fitted bow shock,
at free-stream Mach numbers where the page serves the nose's fitted 2D
solve (0006: sharp noses and the measured blunt noses, Mach 1.2 and
above) and up to 3.0, the range the total serves. Zero incidence, power
off, no roll, no cant.

**Configurations:**

- a body of a nose and a cylinder to a flat base (the body model of 0004
  and 0010; no boat-tail or transition);
- N fins, N from 3 to 8, identical and equally spaced, each wholly on the
  cylinder, their trailing edges at the base or ahead of it;
- planforms as `src/fins/planform.ts` defines them (trapezoidal with any
  trailing-edge sweep, clipped deltas; leading edges swept forward
  refused, as there), tip chord parallel to the axis;
- sections as in section 2.6.

**Not solved, and why:**

- the nose (its 2D solve is reused, section 2.1);
- the flow behind the base (inviscid base flow is physically wrong, 0001
  section 1; the base stays the base model's, 0010 and 0015);
- boundary layers, friction and anything viscous (Euler);
- incidence, roll, cant, unequal fins, launch lugs, rail buttons;
- Mach numbers below 1.2, where the bow shock is captured and the far
  field is the domain's problem (0013); a 3D transonic sector is not part
  of Stage A.

## 2. The grid

### 2.1 The domain: start plane to base plane

The sector does not repeat the nose. It begins at a start plane normal to
the axis on the cylinder, a margin ahead of the fins' root leading edge,
and ends at the base plane.

**Why** (aerodynamic reasoning, the same as 0006's for its outflow): where
the flow is supersonic, nothing downstream reaches upstream except through
subsonic regions. Ahead of the fins' leading edge the flow is the
axisymmetric 2D flow, exactly, so solving the nose again in 3D would
reproduce what the 2D fitted solve already gives, at many times the cost:
the nose needs the finest cells (0006), and in 3D each refinement costs
eight times the cells. Starting at the plane makes the 3D cells serve the
fins only.

**Conditions** (each a refusal with its reason if it fails):

- the start plane lies on the cylinder, at least 0.1 body radius behind
  the nose's shoulder;
- the margin from the start plane to the root leading edge is a quarter
  of the root chord, and at least 0.25 body radius;
- the 2D flow crosses the start plane axially supersonically from the
  body to the shock (axial Mach number above 1 in every 2D cell column
  there), as 0006 requires of its own inflow plane, so that imposing all
  five states there is valid;
- the 2D fitted solve reaches the base plane: the page's 2D solve is
  extended from "the end of the body asked for" (0006) to the base
  wherever Stage A runs. That adds cylinder columns to the 2D grid only.

**The outer boundary is the 2D fitted bow shock, frozen.** On each 3D
column its height is interpolated (cubic in x) from the finest 2D grid of
the nose's family, and the face there carries the flux of the
oblique-shock state at the interpolated shock angle, which also fills the
ghost cells (as 0006's fitted faces do, but without moving). The shock is
not refitted in 3D. This is exact wherever the fins' influence does not
reach the shock (aerodynamic reasoning: upstream of that, the flow is the
2D flow), and that is checked twice:

- before the solve, geometrically: a line from the fin tip's leading edge,
  outward at the 2D oblique-shock angle of the tip section's leading
  wedge in the local 2D flow (steeper than the Mach angle), must stay at
  least three L0 cells below the shock until the base plane;
- after the solve, on the flow: the cells of the outermost two rows must
  be axisymmetric, every cell's pressure and density within 1e-5 of the
  mean over its ring of cells (section 3.7). A fin disturbance that
  reached the shock would make them vary around the ring.

A case failing either is refused: "the fins' disturbance reaches the bow
shock before the base; Stage A does not refit the shock in 3D".

For scale (aerodynamic reasoning, not measured): at Mach 2 on a
10-caliber body the bow shock lies several calibers from the axis at the
fins, while the tip of a fin of one caliber's span lies at 1.5 calibers
and its disturbance spreads outward by about the Mach angle (30 deg); the
check is expected to bind on short bodies, large fins and low Mach
numbers, and its cost in coverage is measured by the refusals audit
(section 5.3).

**The base plane** is the outflow: zero-gradient extrapolation, valid
only where the flow leaves axially supersonic. Every cell column next to
it is checked after the solve (axial Mach number above 1), as 0006's
`baseMach` is; otherwise refused.

### 2.2 The sector

Coordinates (x, r, theta): x along the axis, r the radius, theta the
angle from the plane through the middle of one fin (theta = 0) to the
plane midway between it and the next (theta = pi / N). Both planes are
planes of mirror symmetry of the configuration at zero incidence, so one
sector holds the whole solution: the other 2N - 1 sectors are its mirror
images, exactly, under the assumptions of section 1.

Indices: i along x, j along r (j = 0 the body), k along theta. Every node
lies on a circle of its row's radius at its own angle: a row is a radius,
not a fraction of an oblique line. The body is the surface r = R, exact
in these coordinates (section 3.1).

### 2.3 The fin as a displacement of the symmetry face

The fin is a plate of thickness t(x, r) (its section scaled by the local
chord, the same section along the span, as `src/fins/section.ts`) centred
on the plane theta = 0. Its face lies at the distance z = t / 2 from that
plane, measured normal to it. The main block's first circumferential face (k = 0) is
displaced onto it: at the node (x, r) of that face the angle is

    theta_0(x, r) = asin(z(x, r) / r),
    z = t(x, r) / 2   inside the planform (the fin's face),
    z = t_tip(x) / 2  above the tip, inside the tip chord (the slab's top, 2.4),
    z = 0             everywhere else (the symmetry plane).

So one kind of boundary serves both: the k = 0 face is a slip wall
(velocity mirrored about the face, 0003), which on the plane theta = 0 is
the symmetry condition and on the fin's face is the fin. Where the
section is sharp, z falls to zero at the leading and trailing edges, so
the face is continuous; where it is not (a blunt trailing edge), the edge
must lie on the base plane (2.7).

The other nodes of each (i, j) line run from theta_0 to pi / N, clustered
at theta_0 (2.9). Between nodes the cell faces are bilinear in (x, r,
theta), so the computed fin face departs from the true surface by a
second-order amount that falls with the grid (theta_0 is not linear in
r); the nodes themselves lie on it exactly.

**Columns follow the planform.** Inside the fin's span the columns are
sheared so that the leading edge and the trailing edge each lie on one
column line at every row (the edges are straight). Above the tip the
columns keep the tip's positions. The fin's root lies on the body row
(j = 0) and its tip on one row (j = j_tip, r = r_tip) at every level.

### 2.4 The tip: the slab block

A fin of constant section has a flat tip face of the tip section's shape,
parallel to the stream. Above it, between the plane theta = 0 and the
surface z = t_tip(x) / 2, lies fluid that the main block cannot hold: its
k = 0 face above the tip is that surface, so that the
main block's grid is continuous across the tip row.

That fluid is a second block, the slab: inside the tip chord's x range,
from the tip row to the outer boundary, between the plane theta = 0
(symmetry, its k = 0 face) and the main block's k = 0 face (z = t_tip / 2,
its top). Its bottom face (r = r_tip) is the tip face, a slip wall. Its
ends at the tip's leading and trailing edges have zero height for a sharp
section: faces of zero area, which carry no flux, as the axis faces of
the 2D axisymmetric grids do (0003). The two blocks are point-matched on
the slab's top: the slab's nodes there are the main block's. The face
fluxes on that interface are computed once (by the main block's kernel,
with the slab's cells as its ghost cells) and used by both, so the
interface conserves exactly.

**Why a slab, and what was rejected:**

- _A tip cap_ (letting the main block's displacement fall to zero over a
  few rows above the tip, with nothing below it) changes the geometry: the
  cap is a sloped surface, so it carries wave drag of its own, of a size
  that shrinks only as fast as its height, at first order. It would add a
  first-order error to a quantity whose band rests on the order of its
  convergence. Rejected.
- _Transferring the fin's boundary condition to the plane theta = 0_ (a
  zero-thickness fin with the face slope applied as the wall's normal)
  makes the grid simply the revolved 2D grid, but it is a thin-fin
  approximation with an error of order the thickness ratio in the face
  pressures (aerodynamic reasoning), the very nonlinear section effects
  0009 computes exactly in 2D. Rejected for Stage A; it stays a possible
  cheap preview.
- _Blanked cells in one block_ (giving the whole sector the slab's extra
  layers and masking those inside the fin) is the same grid stored
  wastefully: at the reference layout (2.9) a third of the sector's
  cells would be masked or of zero volume. Rejected for memory.

**The slab's edge cells** are wedges whose included angle at the tip's
leading and trailing edges is the section's half-angle over the slab's
layer count: a few degrees or less. They are exempt from the angle gate
(2.10), and their effect is measured, not assumed: the tip-cone check of
rung (c) (section 4.3) and the families of rung (d) carry it.

**No tip vortex is drawn or expected:** a symmetric section at zero
incidence carries no lift, so the tip sheds no vortex (aerodynamic
reasoning). The flow over the tip is the spillage of the thickness
problem, which the slab resolves.

### 2.5 The root junction

The fin's root lies on the cylinder, along the body row, and its face
meets the body at a right angle; the corner cells are orthogonal there.
No fillet, no gap, no anchor and no slot are represented: the fin is the
geometry `src/fins` describes, on a smooth cylinder. The fin's shock meets
the body along the root at a right angle; in inviscid flow the flow behind
it is parallel to both surfaces, so no reflected shock is required there
(aerodynamic reasoning); on a cylinder its curvature makes a weak one,
which the grid captures. The viscous junction flow (the boundary layer's
separation ahead of the root shock, the corner vortex) is absent, and
says so in the labels (section 5.3).

### 2.6 Sections: served and refused

| Section (`src/fins/section.ts`)                                                                                                         | Stage A                                              | Why                                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Double wedge, any ridge, symmetric                                                                                                      | served                                               | sharp edges, attached shock where 0009's 2D test says so                                                                                                                                              |
| Hexagonal (wedge-flat-wedge), any bevels, symmetric                                                                                     | served                                               | the same; the reflected waves that make 0009 refuse short bevels are part of the Euler solution                                                                                                       |
| Single wedge with a blunt trailing edge                                                                                                 | served only with the trailing edge on the base plane | the base face is then the domain's end, not inside it (2.7); its base pressure stays 0010 section 5.1's term                                                                                          |
| Any section whose 2D leading-edge shock is detached, or has subsonic flow behind it, at the local normal Mach number (0009 2.1's tests) | refused                                              | a detached shock captured on a stagnation line is the error 0004 measured (stagnation pressure swinging by +9.7% to -0.56% from grid to grid with HLLC); no flux cured it there                       |
| Rounded or square-cut leading edges (flat plates included)                                                                              | refused                                              | the same reason: each puts a detached, captured shock on the edge's stagnation line. They keep today's path (0010 section 5.2, 0016)                                                                  |
| Flat plates                                                                                                                             | refused                                              | their faces carry no axial force (their normals are normal to the stream), so the solve's only drag would be the edges', which are refused above; Stage A would add nothing to them                   |
| Rounded trailing edges                                                                                                                  | refused                                              | the aft-facing curved surface would carry an inviscid pressure on what is in reality separated flow                                                                                                   |
| Asymmetric sections (the general `Section`, with different upper and lower surfaces)                                                    | refused                                              | the sector's plane theta = 0 is a mirror plane only for sections symmetric about the fin's midplane. A sector of 360/N degrees with periodic faces would serve them at twice the cost: a later option |

A sharp swept leading edge whose normal Mach number is subsonic is served:
its flow is locally subsonic without a shock (aerodynamic reasoning), and
these planforms are where linear theory errs most (0009 section 4, strip
over linear down to 0.42). Rung (c) and family d7 measure them.

The cost in coverage, stated plainly: the common hobby fin, a flat plate
with a rounded or square edge, gets nothing from Stage A. Stage A serves
the sharp, sectioned fins.

### 2.7 Edges and the base plane

- **Sharp leading and trailing edges** lie on column lines (2.3), with
  columns clustered at them (2.9).
- **A blunt trailing edge on the base plane:** the faces' drag is solved;
  the base of the edge is the outflow plane, outside the domain, and its
  drag is 0010 section 5.1's trailing-edge base term, as now. In
  supersonic flow the faces do not feel the base (the same statement as
  `section.ts` makes for the 2D section).
- **A blunt trailing edge ahead of the base** is refused: its inviscid
  wake (an expansion into a dead-air region the scheme fills by numerical
  dissipation) is not a physical flow, and it would reach the outflow
  plane subsonically.
- **The solve ends at the base plane**, as every solve does now. Nothing
  behind it is computed or drawn as computed.

### 2.8 Symmetry faces

- theta = pi / N (the main block's last circumferential face): a slip
  wall, the circumferential velocity mirrored. Exact, the plane being a
  plane of the coordinates.
- theta = 0 outside the planform and under the slab: the same.
- The fin's face and the tip face: slip walls with the face's own normal
  (0003's wall).

The neighbouring fins are thereby represented exactly: their shocks meet
the mid-plane as each other's mirror images, a symmetric interaction the
captured solution resolves (aerodynamic reasoning). Fin-fin and fin-body
interference on the fins' faces are therefore in the solution.

### 2.9 Spacing, clustering and families

Every count below is per segment between breakpoints, on the coarsest
level L0; each level multiplies every segment's count by exactly 1.5, so
the counts on L0 are multiples of 8 and L1 to L3 are whole (L3 = 3.375
times L0 in each direction).

- **Along x:** segments [start plane, leading edge], [leading edge,
  trailing edge] and, for fins ahead of the base, [trailing edge, base].
  Geometric spacing clustered at both edges, the first cell 1% of the
  local chord on L0 and the growth at most 1.2 per cell.
- **Along r:** segments [body, tip] and [tip, shock]. The first
  clustered at both ends (root and tip); the second at the tip, then
  graded to the shock by 0004's exponential rule.
- **Along theta:** the main block clustered at its k = 0 face (the fin's
  face), growth at most 1.2; the slab uniform across its thickness.

**Reference layout** (fins at the base; the counts the memory and time
estimates of section 6 use):

| Level | Ratio to L0 | Main block (x, r, theta)       | Slab (x, r, theta) | Cells   |
| ----- | ----------- | ------------------------------ | ------------------ | ------- |
| L0    | 1           | 40 x 32 x 16 (8 + 32; 16 + 16) | 32 x 16 x 8        | 24,576  |
| L1    | 1.5         | 60 x 48 x 24                   | 48 x 24 x 12       | 82,944  |
| L2    | 2.25        | 90 x 72 x 36                   | 72 x 36 x 18       | 279,936 |
| L3    | 3.375       | 135 x 108 x 54                 | 108 x 54 x 27      | 944,784 |

(32 cells over the root chord on L0, 108 on L3. For comparison, 0009
section 2.4's planar Euler check of a double wedge used 40, 80 and 160
cells over the chord, with errors of -0.768%, -0.337% and -0.156% of the
exact drag.)

**Why ratio 1.5.** Section 4.5.

**The grids of a family do not nest** (a ratio of 1.5 cannot divide cells
into whole parts). They are systematic: the same mapping functions,
evaluated at finer spacing of their parameters, with every edge, the
root, the tip, the start plane and the base on grid lines at every level.
Each level starts from the converged level before it, interpolated in the
mapping's parameters (section 3.6).

### 2.10 Quality gates

The fitted grids' gates of 0006, applied to every cell of both blocks,
in every direction: positive volumes; neighbouring cells within 1.3 in
size; aspect ratio at most 13; cell angles at least 12 deg, and at least
50 deg at the walls (the fin's face, the body, the tip face). One
exemption: the slab's edge cells (2.4), whose small angle is the
geometry's. A grid that fails is refused with the reason, never solved.

Before the solver is written, the generator is run on 50 fin and body
combinations drawn from the refusal audit's population
(`docs/research/refusals/population.ts`) at Mach 1.5, 2 and 3, and the
gates' outcomes are recorded: the early spike 0002 section 10 asked for.
If more than a fifth fail, the layout is revised and that revision is
recorded before any solve.

## 3. The solver

### 3.1 The formulation: cylindrical coordinates with geometric sources

The Euler equations in cylindrical coordinates, velocity (u, v, w) along
(x, r, theta):

    d(r U)/dt + d(r F)/dx + d(r G)/dr + d(H)/dtheta = S

    U = (rho, rho u, rho v, rho w, E)
    F = (rho u, rho u^2 + p, rho u v, rho u w, u (E + p))
    G = (rho v, rho u v, rho v^2 + p, rho v w, v (E + p))
    H = (rho w, rho u w, rho v w, rho w^2 + p, w (E + p))
    S = (0, 0, rho w^2 + p, -rho v w, 0)

discretised as a finite volume in the coordinate space (x, r, theta):

- each cell's physical volume is the integral of r over its coordinate
  volume; each face's flux is the physical normal flux (the 2D kernels'
  flux in the face's normal frame) times the face's physical area,
  both from the coordinate-space face vector and the radius at the face;
- the pressure in the radial source is integrated over a discrete volume
  defined as the sum, over the cell's faces, of the radius times the
  radial component of the face vector. As in 0003, where the closed
  contour integral of r n_r ds equals the planar area, this makes a
  uniform pressure balance exactly, so the free stream (along x) is kept
  to round-off on any grid, displaced faces included;
- the cell's momentum is held in the cylindrical components at its
  centroid.

**Why this and not Cartesian components.** On a revolved grid with an
axisymmetric state (w = 0, nothing depending on theta), every
circumferential face sees the same state on both sides and carries
pressure only, the i- and j-faces carry the 2D faces' fluxes times the
sector's angle, and the radial source is the 2D source p A times the
angle. So the 3D residual of a revolved 2D solution is the 2D residual
times the angle, to round-off: rung (a) can then demand the 2D solution
to the GPU's noise, a sharp test of the metrics, the fluxes and the
boundaries. A Cartesian 3D finite volume does not have this property:
the reconstructed velocities across a circumferential face differ in
direction by the cell's angle, and the axisymmetric state is not its
discrete steady state, so rung (a) could test only convergence, not
identity. The cylindrical form also makes the body (r = R) and the mirror
plane theta = pi / N exact surfaces of the grid. Its price: a uniform
cross-flow is not preserved exactly (the basis turns from cell to cell);
at zero incidence there is none, and the manufactured solution of 4.0
checks the order where w is not zero.

There is no axis in the domain (it begins on the cylinder), so the
cylindrical coordinates have no singular line here.

### 3.2 Reused and new

| Part                      | From the 2D engine                                                                                                       | New for 3D                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Flux                      | HLLC in the face's normal frame, Einfeldt speeds with the tangential kinetic energy (0003)                               | a second tangential velocity, carried with the contact as the first is                                                 |
| Reconstruction            | MUSCL on primitives, the shared scaled van Albada factor, one per cell and direction (0003)                              | a fifth difference (dw / a) in the factor; a third direction                                                           |
| Time stepping             | SSPRK2, local time steps (0003)                                                                                          | the time step's sum over three directions                                                                              |
| Implicit option           | the red-black relaxation of the scalar implicit system, 2 sweeps (0013: 4 sweeps fell into a limit cycle)                | the third direction's spectral radius in the diagonal; red-black by the parity of i + j + k                            |
| Two-float arithmetic      | `two-float.wgsl` and its self-test (0013)                                                                                | used only if the switch of 3.4 fires                                                                                   |
| Settling and verification | `SettlingValue`, `dampedOscillationBound`, `refineUntilVerified`'s procedure (0005, 0006, 0013)                          | the procedure at ratio 1.5 (4.5)                                                                                       |
| GPU safety                | step counting, refusal of dispatches over the device's limits, allocation errors caught, adapter limits requested (0006) | 3D dispatch (two-dimensional workgroup grids), buffers split by direction (3.9)                                        |
| Metrics                   | computed once in double on the CPU, stored in 32 bits (0002 section 6)                                                   | hexahedra with bilinear faces in coordinate space; face vectors from diagonals' cross products, so cells close         |
| Boundaries                | slip wall, fixed state, zero-gradient outflow (0003); the fitted face's flux (0006)                                      | the start plane from the 2D solution; the frozen shock; the multiblock interface; the outer-row and start-plane checks |
| Drag                      | wall-face pressures read back and integrated in double on the CPU (0005)                                                 | the fin faces only (3.8)                                                                                               |

A CPU engine in double precision implements the same scheme, as the 2D
one does: the tests' oracle, and the engine of the cheap rungs.

### 3.3 Boundaries

| Face                                | Condition                                                                                                                         |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Start plane (i = 0)                 | all five states fixed, from the finest 2D grid's solution interpolated (cubic, in the 2D grid's parameters) at each 3D row; w = 0 |
| Base plane (i = last)               | zero-gradient outflow; checked supersonic                                                                                         |
| Body (j = 0)                        | slip wall                                                                                                                         |
| Outer boundary                      | the frozen 2D shock: the oblique-shock state at its angle, its flux on the face, its ghost cells                                  |
| theta = 0 (outside the fin), pi / N | slip wall (mirror)                                                                                                                |
| Fin face, tip face                  | slip wall                                                                                                                         |
| Main block and slab                 | point-matched interface, its fluxes computed once                                                                                 |
| The slab's zero-height ends         | faces of zero area                                                                                                                |

Every 3D level takes its 2D data from the same, finest 2D grid of the
nose's family, so the 2D data's own error is a fixed input to the 3D
family, not part of its convergence; its effect is the allowance A1 of
section 4.5.

### 3.4 Precision: 32 bits, with a registered switch to two-float

The state is held in 32 bits, as in the page's fitted 2D engine, whose
drag agrees with the CPU's within 2e-6 (0005, 0006). Two-float was built
for the transonic engine because near Mach 1 the 32-bit residual let the
drag wander by up to 7e-5 of its value (0013); Stage A is supersonic.

The fin drag is a smaller quantity than the nose's on the same reference
area, so its relative noise may be larger. An estimate (aerodynamic
reasoning, to be measured): a fin face's pressure coefficient is of order
0.01 to 0.1, like a slender nose's, so the 32-bit noise in the fin drag
should be of order 1e-5 of it, a hundredth of the floor (4.6).

**Registered rule.** The fin drag's noise is measured on rung (b)'s
cases and on L0 and L1 of the rung (d) families: the largest wander
between converged checks and the largest difference from the CPU engine
on the same grid; the noise is twice the larger, and at least 2e-6 of
the fin drag. If it exceeds 1e-4 of the fin drag (a tenth of the floor),
the state, residual and metrics go to two-float as in 0013 before
anything is served, and the memory figures of section 6 double.

### 3.5 The iteration

SSPRK2 with local time steps, as the page's fitted 2D engine, is the
default. The red-black relaxation with 2 sweeps (0013) is built as an
option, tested on the CPU to reach the explicit scheme's fin drag within
1e-12 (as 0013 tested its implicit steps), and adopted for the page only
if, on L0 to L2 of three rung (d) families, it settles the fin drag with
less work (cell-steps times the measured cost per cell-step) than the
explicit steps. The slab's thin cells and the edge clustering make the
grid stiff; local time steps keep the explicit iteration's steps per
cell, not its physical time, the measure of its cost.

### 3.6 Starts

- L0 starts from the 2D solution revolved: every cell, in both blocks,
  takes the 2D flow interpolated at its centroid's (x, r), with w = 0.
  The fin is then switched on at once; the transient is local to the
  fins and is carried downstream (aerodynamic reasoning).
- Each finer level starts from the converged level before it,
  interpolated trilinearly in the mapping's parameters (0006's
  `startedFrom`, without nesting).
- Each level takes the rate of convergence measured on the level before
  it (0006), scaled per check.

### 3.7 Convergence, and the checks on every level

A level is settled when all of these hold:

1. `SettlingValue` on the fin drag, with the noise of 3.4;
2. the fitted-window rule of 0013 (its finding S1 and the re-review of
   dd6c423): `dampedOscillationBound` has fitted at least one window,
   every fitted window decays, and its bound is within the noise; its
   bound enters the level's noise;
3. the residual has fallen to half the largest seen on the level and is
   still changing; a residual 100 times its first value stops the level
   as diverging (0013);
4. the GPU's step count equals the steps asked for (0006).

Checks every 250 steps on L0, times 1.5^l on level l (0006's practice,
scaled to the ratio).

After it settles, each level must pass, or the case is refused with the
reason:

- **outflow:** axial Mach number above 1 in every cell next to the base
  plane;
- **outer rows axisymmetric:** in the two outermost rows, every cell's
  pressure and density within 1e-5 of the mean of its ring (the fins have
  not reached the frozen shock);
- **start plane undisturbed:** in the first two columns, the same test
  (nothing has reached upstream; in supersonic flow nothing should);
- the quality gates (2.10), run on the grid before the solve.

### 3.8 The quantity: the fins' wave drag

The sector holds one face of one fin. With p the wall-face pressure from
the wall flux (0003), A_x the x component of each fin wall face's
physical area vector (positive facing upstream), q the free stream's
dynamic pressure and R the body radius:

    C_D,fin waves = 2 N sum over the fin's wall faces of (p - p_inf) A_x / (q pi R^2)

on the body's cross-section, as every component of 0010's total. Wall
pressures are read back from the GPU and summed in double on the CPU, as
the 2D drag is (0005).

Nothing else in the sector carries axial force: the cylinder's faces and
the tip face have normals with no x component, and the base is outside
the domain. So the fins' pressure on the body (fin-body interference on
the body) carries no drag on a cylinder (geometry), and the interference
that does matter, on the fins' own faces, is in the sum.

### 3.9 GPU memory layout and limits

Per cell, in 32 bits (from the 2D engine's buffers, `euler2d-gpu.ts`, with
five variables and three directions):

| Buffer                                                                       | Bytes a cell                                    |
| ---------------------------------------------------------------------------- | ----------------------------------------------- |
| State: three copies for SSPRK2's stages, 5 floats                            | 60                                              |
| Face fluxes: three directions, 5 floats                                      | 60                                              |
| Geometry: three face vectors with area, cell volume, source volume, centroid | 80                                              |
| Implicit option: residual and increment                                      | 40                                              |
| Scratch, limiter factors, masks                                              | 8                                               |
| **Total**                                                                    | **about 250** (210 without the implicit option) |

In two-float, about 500. Wall pressures, the outer rows and the start
columns are read back, not the state, so the readback buffers are small.

The state is held as one vec4f (rho, rho u, rho v, rho w) and one f32 (E)
array, so five variables cost 20 bytes, not 32. Fluxes and geometry are
split into one buffer per direction, so that no single buffer exceeds the
device's binding limit at page sizes (WebGPU's default is 128 MiB per
binding; the page requests the adapter's own limits, as the 2D page does)
and no kernel binds more than WebGPU's default of eight storage buffers.
Workgroups are dispatched over two dimensions, since one dimension stops
at 65,535 workgroups (4.19 million cells at 64 a workgroup; 0006).

## 4. Verification ladder: registered before any number exists

Every criterion in this section is fixed by this record, before any code
or result. A rung that fails stops the ladder: its finding is recorded,
and a new record decides what follows. Nothing in a later rung's numbers
may change an earlier rung's criterion.

### 4.0 Code checks (CPU and GPU)

- Free stream along x kept to round-off (CPU 1e-13, GPU 1e-6 relative)
  on sector grids with randomly perturbed nodes, with the fin displaced
  and the slab present, in cylindrical and planar mode.
- A manufactured solution in cylindrical coordinates with w not zero and
  theta dependence (0003's construction: smooth fields, sources
  integrated face by face), on grids with displaced faces: L1 error
  falling at an observed order of 1.8 or more over four grids.
- The 3D flux equals the 2D flux to round-off when w = 0, and is
  invariant under rotation of the face frame.
- A sector solved with mirror faces equals the same flow solved on twice
  the sector with the mirror plane inside it, to round-off (CPU).
- GPU kernels against the CPU's at a few units in the last place (0002
  section 9).
- Mutation checks: planted errors in the metrics, the source, each
  boundary and the interface are caught.

### 4.1 Rung (a): the finless sector reproduces the 2D fitted solution

On the revolved 2D grid (the 2D fitted grid's columns from the start
plane to the base, its rows, K layers across the sector), no fin, the
start plane and the shock from that same 2D solution, started from it:

- **Cases:** a 3-caliber tangent ogive at Mach 2 (sharp, H grid), the 3:1
  ellipsoid at Mach 2 (blunt, C grid), the 5 deg cone at Mach 1.3 (0006's
  floor table); each
  with K = 1, 4 and 16, and with a non-uniform theta spacing.
- **Pass, CPU:** the 3D residual at the start within 1e-13 of the 2D
  residual times the angle; after 2,000 steps every cell's state within
  1e-12 (relative) of the 2D solution, and |w| within 1e-12 of the sound
  speed.
- **Pass, GPU (32 bits):** the same within 2e-6, the 2D engine's noise
  (0005).
- **(a')** On a fin layout (sheared columns, the tip row inserted) with
  zero thickness, the solution stays independent of theta to 1e-13 (CPU):
  the grid's own layout keeps an axisymmetric flow axisymmetric.

### 4.2 Rung (b): planar Euler on fin sections against shock-expansion theory

The 3D engine in planar mode (Cartesian x, y, z; the same kernels), the
section extruded across a span bounded by two mirror faces (two layers),
the domain of 0009 section 2.4 (x / c from -0.3 to 1.2, 1.4 chords high).

- **(b1) identity:** the double wedge of t/c 0.08 at Mach 1.5 on 0009's
  60 x 28 grid equals the 2D planar engine on that grid, CPU within 1e-12
  and GPU within 2e-6.
- **(b2) convergence**, four-grid families at ratio 1.5 (L0 32 cells over
  the chord) and, being cheap in planar mode, to L5 (7.6 times L0; every
  segment's count on L0 a multiple of 32, so that L4 and L5 are whole),
  each against the exact shock-expansion value (`exactSectionDrag`, 0009):

  | Case | Section                                  | Mach |
  | ---- | ---------------------------------------- | ---- |
  | b2.1 | double wedge, t/c 0.05                   | 1.5  |
  | b2.2 | double wedge, t/c 0.05                   | 2.0  |
  | b2.3 | double wedge, t/c 0.05                   | 3.0  |
  | b2.4 | double wedge, t/c 0.08                   | 1.5  |
  | b2.5 | hexagon, 30% bevels, t/c 0.05            | 2.0  |
  | b2.6 | single wedge, trailing edge 0.08 (faces) | 2.0  |

  0009 section 2.1's table shows the five symmetric cases exact (no
  reflected wave can reach the surface). The single wedge's faces are
  straight from the leading edge to the base, with no corner, so the
  flow on them is the uniform state behind the leading-edge shock and
  shock-expansion theory is exact there too (gas dynamics; the faces do
  not feel the base, `section.ts`).

  **Pass:** on every case the page's band from L0 to L3 (section 4.5,
  with the provisional floor of 1e-3) contains the exact value. The band
  without the floor, the observed orders, and the L0 to L5 values are
  recorded whatever they are.

- **(b3) a measurement, not a pass:** the hexagon of 15% bevels, t/c
  0.08, Mach 2 (refused by 0009, a reflected wave landing at x/c 0.70;
  0009 section 2.4's open item), to L5. If its family gives a band, the
  reflected waves' size is measured; if not, it is reported unresolved.

### 4.3 Rung (c): a thin fin on a plane wall against linear theory

The 3D engine in planar mode: a plane wall (the body) at y = 0, one fin
normal to it in the mirror plane z = 0, the far faces in y and z holding
the free stream (checked undisturbed, as the outer rows of 3.7). This is
the configuration of `src/fins/linear-wave-drag.ts`, the fin with its
image in the wall (0009 section 1).

- **Cases:** planforms D (rectangle, span equal to the chord) and C
  (trapezoid, LE 26.6 deg, taper 0.5) at Mach 2, and F (0009's RM A53D02
  planform, LE 71.6 deg, a subsonic leading edge) at Mach 1.5; each with
  a double wedge (ridge at mid-chord) of t/c 0.04, 0.02 and 0.01: nine
  families.
- **The ratio** R(t/c) = (Euler drag) / (linear drag), the linear drag
  from `linearWaveDrag` with its quadrature error.
- **Pass, each planform:** the first-order extrapolation to zero
  thickness, R* = 2 R(0.01) - R(0.02), lies within 1 plus or minus
  (2 B(0.01) + B(0.02) + the quadrature error), where B is a family's
  relative band (4.5). And |R - 1| does not grow as t/c falls.
- **Reported, not a pass:** on D, the Euler 3D drag over the planar
  Euler drag of rung (b) at the same t/c (linear theory makes them equal:
  0009 section 4); and on a single-wedge rectangle at t/c 0.01, the face
  pressure inside the tip's Mach cone at mid-chord against linear
  theory's tip-cone law, Cp / Cp_2D = 1/2 + asin(beta (s - y) / x) / pi
  (tested in 0009 section 3.2), which looks at the slab's region
  directly.

This is 0002's gate for M10 ("fin wave drag against supersonic
thin-airfoil theory").

### 4.4 Rung (d): ten registered 3D families

A 3-caliber tangent ogive (served by the fitted solver) on a cylinder,
the fins' root leading edge at least 5 calibers behind the shoulder, the
fins at the base unless stated; fin dimensions in body calibers;
planforms as 0009 section 4 defines them, scaled to a root chord of one
caliber:

| Family | Fins                                                                     | N   | Mach | Nose                  |
| ------ | ------------------------------------------------------------------------ | --- | ---- | --------------------- |
| d1     | C (span 1, LE 26.6 deg, taper 0.5), double wedge t/c 0.05                | 4   | 2.0  | tangent ogive         |
| d2     | as d1                                                                    | 4   | 1.5  | tangent ogive         |
| d3     | as d1                                                                    | 4   | 3.0  | tangent ogive         |
| d4     | as d1                                                                    | 3   | 2.0  | tangent ogive         |
| d5     | as d1                                                                    | 6   | 2.0  | tangent ogive         |
| d6     | G (clipped delta, LE 36.9 deg, taper 0.25), hexagon 15% bevels, t/c 0.05 | 4   | 1.5  | tangent ogive         |
| d7     | F's shape (root 3, semispan 0.5, LE 71.6 deg), double wedge t/c 0.04     | 4   | 1.5  | tangent ogive         |
| d8     | as d1                                                                    | 4   | 2.0  | 3:1 ellipsoid (blunt) |
| d9     | C, single wedge with a trailing edge 0.06 of the chord                   | 4   | 2.0  | tangent ogive         |
| d10    | as d1, trailing edges one caliber ahead of the base                      | 4   | 2.0  | tangent ogive         |

(d6 is a section 0009 refuses at Mach 1.5, a reflected wave landing at
x/c 0.60; d7 has subsonic leading edges. The Basic Finner's geometry is
deliberately not among them, section 5.4.)

Each family: L0 to L3 on the GPU, L0 and L1 also on the CPU.

**Pass, each family:** every level passes 3.7's checks; the GPU agrees
with the CPU on L0 and L1 within the noise of 3.4; and, where an offline
finer family of the same mapping exists (levels at ratio 2 from L0 up to
8 L0, on hardware that can hold them), the page's band contains that
family's extrapolation.

**Reported for each, whatever it is:** the band or the reason for none;
the observed orders; the product rule's value (0009) beside the 3D value,
which measures the product rule's inviscid error for the first time (0009
section 6 says it was never measured); the allowances of 4.5; the
start-plane sensitivity.

### 4.5 The cost problem, and how the band is formed

**The problem.** Each halving of the cell size costs eight times the
cells in 3D. 0005's procedure needs four grids (two triples whose orders
agree within 0.5); at ratio 2 from the reference L0 that is 24,576 times
1, 8, 64 and 512: 12.6 million cells on the finest, about 3 GB in 32
bits (section 6). That does not fit a 2 GB GPU, and it would take hours
on a mid-range one.

**Options considered:**

1. _Three grids at ratio 2_ (L0, 2 L0, 4 L0; 73 units of L0's cells in
   all). 0005 gives no band from fewer than four grids. A three-grid rule
   (an order assumed, or a corridor of orders calibrated offline) would
   be a new rule with less evidence than the old. Rejected as the
   default.
2. _Four grids at ratio 1.5_ (L0 to L3; 1 + 3.375 + 11.4 + 38.4 = 54
   units). Cheaper than option 1, and it keeps 0005's four-grid rule
   unchanged: two triples, orders capped at 2, agreeing within 0.5.
   Celik's procedure (0005's source) is written for any constant ratio.
   **Chosen.**
3. _Refining one direction at a time_ and adding the errors: assumes the
   error is a sum of separate directional errors, which captured shocks
   oblique to the grid do not obviously obey. Rejected for Stage A.

**Costs of the choice.** The grids do not nest (2.9); the finest is 1.19
times coarser in each direction than option 1's would be; and the change
between levels is smaller (at first order a third of the error, against
half), so the band's factor is larger: 1.25 |e21| / (1.5^p - 1) is 2.5
|e21| at p = 1, against 1.25 |e21| at ratio 2. Every change used for an
order must still be ten times the noise (0005).

**The band, registered:** the procedure of 0005 at ratio 1.5 on L0 to
L3, with these terms added in full:

- the floor (4.6);
- **A1, the 2D data:** the change in the fin drag on L0 and L1 when the
  start plane's and the shock's data come from the next coarser 2D grid
  instead of the finest; the larger change;
- **A2, the start plane:** the change on L0 and L1 when the margin to the
  leading edge is doubled; the larger change (expected at the noise:
  nothing travels upstream in supersonic flow).

**A device that cannot hold L3** gets no band (0005: fewer than four
grids). It may run L0 to L2 as a preview, labelled "a preview on three
grids; no band" (0002 section 12), and the fin wave drag in the total
stays the product rule's, with its label.

**Whether the floor must be measured again: yes.** 0006's floor for
fitted drag (7e-5) was measured on smooth flows inside a fitted shock;
the fin drag rests on captured fin shocks, the case of 0005's floor
(1e-3, from captured cone families that settled up to 4.6e-4 from exact
values). A floor is measured for its quantity against exact solutions
(0005), so the fin drag gets its own (4.6).

### 4.6 The floor, registered

FIN_DRAG_FLOOR = the larger of 1e-3 of the value (0005's captured-shock
floor) and twice the largest |extrapolated - exact| / exact over rung
(b2)'s six families, each extrapolated from its L3 to L5 values by the
procedure. Rung (c)'s ratios are not used to set it (their reference,
the thin limit, is itself an extrapolation); they test the 3D effects.

### 4.7 Where the ladder can run

- **This container** has no hardware GPU (0013). Rungs 4.0, (a) and (b)
  run on the CPU and on SwiftShader in hours: rung (b) in planar mode
  costs what a 2D solve costs.
- **Rungs (c) and (d)** at L3 do not: a family is about 1.2e10
  cell-steps (section 6), about 17 hours of one unloaded CPU core
  (estimated at 5e-6 s a cell-step, 0013's 2.7e-6 for the 2D explicit
  step scaled for the third direction and fifth variable), or days on
  SwiftShader. Nineteen families are weeks of CPU on the shared machine.
- So rungs (c) and (d) need either a hardware GPU (minutes a family,
  estimated) or the owner's agreement to weeks of CPU lanes. This is an
  open question (section 9).

### 4.8 Kill criteria, registered

Stage A is not served, the product rule stays everywhere, and a new
record decides what follows, if any of these happens:

- rung (a), (a') or (b1) fails;
- any rung (b2) band fails to contain its exact value, the floor
  included;
- any rung (c) planform fails;
- fewer than 6 of the 10 rung (d) families give a band;
- any rung (d) band fails to contain an offline finer family's
  extrapolation;
- the noise of 3.4 exceeds 1e-4 of the fin drag even in two-float.

## 5. What it replaces, and the total

### 5.1 Replaces and does not

| Term (0010 section 3)          | With Stage A                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------- |
| Fin wave drag                  | **replaced** where Stage A serves: the 3D fin-face drag, with its measured numerical band |
| Nose wave drag                 | unchanged (0006)                                                                          |
| Body and fin friction          | unchanged (0007, 0010)                                                                    |
| Fin leading-edge terms         | unchanged; Stage A refuses fins that need them (2.6)                                      |
| Fin trailing-edge base         | unchanged (0010 section 5.1)                                                              |
| Body base, fins-on-base factor | unchanged (0010, 0015): the base is outside the domain                                    |

Where Stage A refuses a case (2.1, 2.6, 2.10, 3.7) or the device cannot
hold L3, the fin wave drag is the product rule's, labelled as now. A Mach
number of the curve gets the 3D value only if it has its own 3D family:
values are never interpolated between solved Mach numbers (0002 section
6 proposed interpolating a fin increment; its error is unmeasured, so
Stage A does not).

### 5.2 The model-form band: re-formed, not removed

The fins' own-drag band (measured over modelled, 1.01 to 1.59; 0008
section 4.3) is a model-form band formed on the ARCAS increments (TN
D-4014) at Mach 1.5 to 2.96, on the old nominal. It covers everything the
model leaves out there: the trip grit, the leading-edge radius, the
anchors, interference, viscous effects. Stage A changes the nominal and
measures none of those, so the band stays, and is formed again with the
new nominal by 0008 section 4.3's arithmetic: the same readings, the same
chamber-force removal, the same widening rule. The ARCAS fins (planform
A, double wedge t/c 0.044, ridge at 0.536, four fins) are solved on a
cylinder of the ARCAS diameter behind a sharp tangent ogive of the ARCAS
nose's length (4.71 calibers); the ARCAS nose's ordinates and tip
radius, and the boat-tail under the fins' rear part, are not represented,
as the plane wall of the present model did not represent them. This is
band-setting, from data already used to set this band; it tests nothing.

Amendment (f) (0014 10.7) stands: the band was measured at Mach 1.5 to
2.96 only, so below Mach 1.5 the fins' own drag stays refused in a total.
Stage A's fin values at Mach 1.2 to 1.5 may be shown as a component, not
in a total.

### 5.3 How the total and its labels change

The total stays 0010's linear sum. Where Stage A serves, the fin wave
drag term is the 3D value, its band the numerical band of 4.5, and the
fins' own-drag band (re-formed) applies to fin friction and fin wave drag
together, as now.

What Stage A brings, said plainly:

- it removes an unmeasured error (the product rule's, 0009 section 6) and
  measures it on rung (d)'s cases;
- it puts fin-body and fin-fin interference on the fins' faces into the
  solution;
- it serves hexagonal sections with short bevels, which 0009 refuses for
  their reflected waves;
- it does **not** narrow the total's band much (aerodynamic reasoning on
  0008's record): the fins' own-drag band (+1% to +59%) and the base band
  dominate, and Stage A measures neither.

**Labels** (proposed):

- the component: "Fin wave drag: solved, 3D inviscid flow around N fins
  and the body at zero incidence; numerical band from four grids";
- the total, where it uses it: "an estimate, not validated: fins solved,
  inviscid; friction and base estimated". The advisor's wording was
  "fins solved, inviscid; base estimated"; friction is added because it
  is 40% to 60% of a typical total (0002 section 1) and is a correlation,
  and a label that named only the base would read as if the rest were
  solved;
- inside the Basic Finner's class and its validated sub-class (0014 10.7
  (q)): the tested product rule is served, with today's labels, as 0014
  10.3 keeps the present factor inside the class even where the rebuilt
  one would cover it. A changed term is not validated by a test of the
  old one (0008 section 6.1). The 3D value may be shown in the details as
  "fins solved: a different model from the one tested", with no residual
  against any BRL or DREV value.

**Coverage.** The refusal audit (`docs/research/refusals/`) is re-run
before and after Stage A, as for every work package; its result is
recorded, whatever it is.

### 5.4 Which held-back tests Stage A can face

**BRL Report 934, range A** was run once, on 2026-10-22 (0020). By rule
3 of 0014 10.1, "no range is run again for the same cases". It cannot be
re-run as a test of the 3D fins, and it will not be: no record computes
the 3D fin model at its rounds and sets it beside their drag. Computing
it and calling it a sensitivity would be a second run in all but name.

**What a new test would be:** a held-back range not yet run, run once
when Stage A and its band are committed, reporting the total with the
product rule and with fins solved beside each other, each with its
verdict by rule 4:

- **the PARD standard body, range A (Mach 1.2 and above, data to 2.1):**
  its fin-drag increments (RM L52E06 figs. 9 to 12, held back) are the
  most direct test of a fin model in the registration. Whether its fins
  are sections Stage A serves is decided from the geometry the
  registration already allows (RM L52E06 fig. 1 and table I, TN 3697
  figs. 1 and 2), without any drag value. Below Mach 1.5 the total is
  refused by amendment (f), so the test covers Mach 1.5 to 2.1 unless (f)
  is lifted first;
- **the Eglin "4-Fin Circular" set, range A (shots at 2.25 to 2.34):** if
  its fins' edges, decided from evidence without its drag (0014 10.5),
  are sections Stage A serves;
- **BRL 934, range B (Mach 1.2 to 1.5):** only once amendment (f) is
  lifted; until then no total is served there to test. Its range C (Mach
  0.98 to 1.2) lies below Stage A.

TN 3320 (the RM-10) cannot test Stage A: its fins sit on a boat-tailed
body, outside Stage A's cylinder.

**ARCAS and RM A53D02, proposed as tests in the plan, and why they cannot be:**

- **ARCAS, TN D-4014:** its increments (figs. 4 to 6, read twice) set the
  fins' own-drag band (0008 section 4.3) and are used again in 5.2. Data
  that set a band cannot test it.
- **ARCAS, TN D-4013:** figs. 11 and 12 are read twice (16 values at
  Mach 1.00 and 1.20,
  `docs/research/total-drag/audit/readings/tn-d-4013_figs11-12.csv`), on the
  same models, trip grit and hardware whose confounders shaped the band;
  and at Mach 1.2 the fins' own drag is refused (f). It sets nothing and
  tests nothing; it may be reported as a check.
- **RM A53D02:** opened, its text, table I and figs. 1, 11 and 17 read
  (fig. 11 twice; 0008 section 8). Its transcription lists three finned
  variants (the basic asymmetric wedge leading edge, a symmetric bevel, a
  blunt edge) and no finless body, so the repository records no fins-on
  minus fins-off increment in it; its basic fin is asymmetric, which
  Stage A refuses (2.6). It is not held back and cannot be made so by
  naming it now, after its figures were read. It may be reported as a
  check that sets nothing, on the symmetric-bevel variant, with its
  confounders (laminar friction, subsonic leading edges, a base hole).

A further fins-on minus fins-off free-flight increment at Mach 1.5 to 3
on a cylindrical afterbody, not yet opened, could become a test: it is
named in 10.7 before it is opened, with the figure and the range. None
is named here; finding one is a search, to be registered.

### 5.5 Proposed 0014 10.7 entry (u), for the coordinator

Not written into 0014; the coordinator decides, and dates it.

> **(u): Stage A of the 3D fin solve (0021), registered before any 3D
> number exists.**
>
> - _The ladder._ 0021 section 4's cases and pass criteria (4.0, 4.1 to
>   4.4), its band procedure (4.5: four grids at ratio 1.5, 0005's order
>   rule unchanged, allowances A1 and A2 added in full), its floor (4.6)
>   and its kill criteria (4.8) are fixed as written at the commit that
>   adds this entry. None changes after a rung's numbers are seen; a
>   failure is recorded and a new record decides.
> - _The noise and the precision._ 0021 section 3.4: the noise measured
>   as written there; two-float adopted if it exceeds 1e-4 of the fin
>   drag.
> - _The model-form band._ The fins' own-drag band is formed again with
>   Stage A's nominal on the same ARCAS increments by 0008 section 4.3's
>   arithmetic, as 0021 section 5.2 states; band-setting, not a test.
>   Amendment (f) is unchanged.
> - _The Basic Finner._ Inside the class and the validated sub-class of
>   (q) the product rule is served, as 10.3 keeps the present factor.
>   BRL Report 934's range A is not run again (rule 3), and no record
>   computes the 3D fin model at its rounds for comparison with their
>   drag.
> - _The tests._ When the PARD body's range A, the Eglin set's range A,
>   or BRL Report 934's range B is run, and Stage A with its band
>   is committed by then, the run reports the total with the product rule
>   and with the fins solved, each with its verdict by rule 4; if Stage A
>   is not committed, the range runs as registered and Stage A has no
>   hold-out from it. A range is not delayed for Stage A.
> - _Not tests._ ARCAS (TN D-4014: band-setting; TN D-4013: read, the
>   same models) and RM A53D02 (read; no finless body recorded) set
>   nothing for Stage A and test nothing; each may be reported as a
>   check.
> - _Labels._ As 0021 section 5.3.

## 6. Memory and time

**Bytes a cell:** about 250 in 32 bits, 500 in two-float (3.9).

**Peak memory of a family** (the level being solved, plus the previous
level's state for its start), on the reference layout:

| Family                        | Finest cells | 32 bits | Two-float |
| ----------------------------- | ------------ | ------- | --------- |
| L0 to L3 (the page)           | 0.94 million | 0.24 GB | 0.48 GB   |
| L4 (offline only)             | 3.2 million  | 0.8 GB  | 1.6 GB    |
| 8 times L0 (ratio 2, offline) | 12.6 million | 3.1 GB  | 6.3 GB    |

**What fits.** The browser does not report a GPU's memory; WebGPU reports
only its buffer limits. Allowing half the device's memory to one tab (an
assumption): a 2 GB GPU holds about 4 million cells in 32 bits (2 million
in two-float), a 4 GB GPU about 8 million (4 million). The page's family
fits either in both precisions. L4 fits a 2 GB GPU in 32 bits only; 8
times L0 fits neither. Fins ahead of the base, longer chords or more
columns raise these in proportion to the cells.

**Time per Mach number** (estimates; nothing is measured):

- **Steps:** assumed 3,000 on L0, times 1.5 per level (0006's fitted
  families doubled their steps per halving): 4,500, 6,750 and 10,125.
  In cells times steps: 7.4e7, 3.7e8, 1.9e9 and 9.6e9, about 1.2e10 in
  all, 80% of it on L3.
- **Mid-range GPU:** 0013 estimates the 2D explicit step at about 0.7 kB
  moved per cell and a mid-range GPU at 150 to 300 GB/s. The 3D step,
  with a third direction and a fifth variable, about 1.2 kB (estimate):
  1.2e8 to 2.5e8 cell-steps a second, so **1 to 3 minutes a Mach
  number** with the checks; two-float 2 to 3 times that. A curve of ten
  Mach numbers: 10 to 30 minutes.
- **SwiftShader:** 0013 measured the 2D explicit step at 2.8e4 to 5.7e4
  cell-steps a second under load, and 0012 1.3e5 for the fitted solver;
  the 3D step at an estimated 1e4 to 5e4: **3 to 14 days a Mach
  number**. Not offered. L0 alone takes about 25 minutes to 2 hours.
- **CPU (offline):** about 17 hours a family on one unloaded core (4.7).

The first GPU test of the build measures the SwiftShader rate; the page
measures its own device's rate (0012's throughput readout) on L0's first
batches and corrects the estimate before L1.

**What the page says before a run** (proposed text):

> Fins in the airflow: this solves the flow around your N fins in 3D, on
> four grids of 25,000 to 945,000 cells, about 0.24 GB of GPU memory.
> Estimated time on this GPU: about M minutes for each Mach number
> (measured on this device: R million cell updates a second). It solves
> the inviscid flow only: friction and the base are still estimated.
> [Run] [Use the 2D section method instead]

And where it cannot:

> This GPU's limits hold at most L2 (280,000 cells); a band needs the
> fourth grid. The fins use the 2D section method (0009), as before. You
> may run three grids as a preview, without a band.

> Software rendering (no hardware GPU) would take days for each Mach
> number. The fins use the 2D section method (0009).

A run longer than 30 minutes asks before it starts (the user decides, as
0013 has it for transonic families).

## 7. The 3D view

What Stage A lets the view draw honestly, where a Mach number has a 3D
family with a band (0017 section 6.2's rules otherwise unchanged):

- **The solved field, mirrored and rotated to the full circle.** Exact
  under the configuration's symmetry, not an approximation, between the
  start plane and the base plane; ahead of the start plane, the 2D
  solution revolved, which is what the 3D solve would give there.
- **The fins' shocks**, from the computed field (numerical schlieren,
  isosurfaces), as captured: smeared over two or three cells, never
  sharpened beyond what was computed.
- **Fin-body interference:** the body's surface between the fins coloured
  by its computed pressure, which now varies around the body; the fins'
  faces coloured by theirs.
- **Streamlines and particles** from the 3D velocity, which turn around
  the fins.
- **The bow shock** as the 2D fitted surface, which the solve checked the
  fins did not reach.

Not to be drawn: anything behind the base (still "not simulated"),
boundary layers, separation, and tip or corner vortices (none at zero
incidence in inviscid flow over symmetric fins, aerodynamic reasoning).
The iterations are not physical time and are not animated as such.

**The legend's honesty line**, where the field is 3D:

> Fins solved in the airflow: inviscid, zero incidence. No boundary
> layer; the friction and the base are estimated; behind the base not
> simulated.

Where the fins use the 2D section method, the present line stays: "The
axisymmetric solution, revolved; fins are not in the airflow". A preview
(fewer than four grids) adds: "a preview grid, not a result". The PNG
export and the first-run note carry the same line as the legend.

## 8. Risks, what would make Stage A fail, and the fallback

The fallback is the same for each: the product rule (0009) stays, with
its labels, wherever Stage A does not serve; a failure is recorded.

1. **Captured fin shocks may not converge at a steady order.** With the
   bow shock captured, only one of seven cone families got a band (0005).
   The fin shock is captured, and the planar double wedge converged at
   order 1.25 (0009 section 2.4). If most rung (d) families give no band,
   Stage A serves almost nothing (kill criterion: fewer than 6 of 10).
   What would follow: aligning the grid with the fin's leading-edge shock,
   or fitting it, in a Stage B.
2. **The tip's slab.** Its wedge-shaped edge cells may carry errors that
   do not converge, or fail gates beyond the exemption. Measured by the
   spike (2.10) and rungs (c) and (d). If it fails, no tip treatment that
   changes the geometry is adopted (2.4); Stage A stops.
3. **A formulation error** shows as a failure of rung (a), which the
   cylindrical form makes exact. Stop and find it.
4. **Cost.** The time estimates are unmeasured, and no hardware GPU is
   available here. If L3 takes far longer than estimated on real devices,
   few users will run it; the page says so before a run, and the product
   rule remains.
5. **The ladder's own cost** (4.7): without a hardware GPU or weeks of
   CPU, rungs (c) and (d) cannot finish, and nothing is served.
6. **The 32-bit noise** may exceed the threshold; two-float then doubles
   memory and roughly the time (3.4).
7. **The explicit iteration may be slow** on the stiff thin cells; the
   red-black option (3.5).
8. **Fin disturbances reaching the frozen shock** refuse short bodies with
   large fins at low Mach numbers; their share is measured by the refusal
   audit. Refitting the shock in 3D is a Stage B item.
9. **The model-form gap does not close.** Euler omits the boundary layer,
   the root junction's separation and the shock-boundary-layer
   interaction; their size on fin drag is not measured anywhere in the
   repository. The re-formed ARCAS band carries them, as it does now.
   Stage A's numbers will be more exact solutions of a model whose own
   error is still only bounded by that band.
10. **Coverage.** Flat plates and rounded or square edges, the common
    hobby fins, are refused (2.6). Stage A's value to most users is the
    view and the product rule's measured error, not their totals.

## 9. Open questions for the owner

1. **Where the ladder runs.** Rungs (c) and (d) need about 19 families at
   L3: minutes each on a hardware GPU, weeks of CPU here. Can the owner
   run a test command on a GPU, or accept weeks of CPU lanes, or reduce
   the ladder (and so what Stage A may claim)?
2. **The sections.** Stage A serves sharp symmetric sections only; flat
   plates with rounded or square edges get nothing from it (2.6). Accept,
   or ask for a Stage B on blunt edges (a fitted or aligned edge shock)
   first?
3. **The label.** "fins solved, inviscid; friction and base estimated"
   (5.3), against the advisor's "fins solved, inviscid; base estimated".
4. **The Basic Finner.** The product rule stays inside its class and
   sub-class (5.3). Should the page show the 3D value there at all, even
   in the details?
5. **Registration.** The proposed 10.7 (u) (5.5), and the finding that
   ARCAS and RM A53D02 cannot be tests (5.4), so Stage A's only tests are
   the PARD, Eglin and BRL ranges not yet run.
6. **Mach sweeps.** Each solved Mach number needs its own family (1 to 3
   minutes, estimated), with no interpolation between them (5.1).

## 10. Sources

No new source was read for this record. To be registered, if a later
step needs them (named only, not opened):

- a published inviscid 3D solution of a finned body of revolution at zero
  incidence, as an independent check of rung (d): to be found and
  registered;
- slender-body and linear theories of zero-lift fin-body interference, as
  a check of the sign and size of the interference: to be registered;
- a fins-on minus fins-off free-flight increment at Mach 1.5 to 3 on a
  cylindrical afterbody, as a further test (5.4): to be found and
  registered before it is opened.
