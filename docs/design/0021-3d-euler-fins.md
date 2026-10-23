# 0021: Fins in the airflow: 3D Euler on a body-fitted sector (Stage A)

- **Status:** Proposed, revision 2 (2026-10-23). A design record only: no
  solver code exists for it. Revision 1 (commit 9415d8d, the same day)
  served only sharp symmetric sections; the owner then decided that Stage
  A must cover hobby fins first (flat plates with rounded, square or
  bevelled edges) before anything is built, and an independent review of
  revision 1 found six blocking issues. This revision answers both.
  Section 12 keeps the history: every decision of revision 1 that changed,
  quoted, with what replaced it and why. Every number below is quoted from
  a committed record (cited), measured for this record on the refusal
  population (section 6.4, `docs/research/refusals/out/stage-a-scope.out`),
  or an estimate, and says which.
- **Date:** 2026-10-23
- **Inputs:** [0002](0002-architecture.md) sections 4, 6, 10 (milestone
  M10) and 12; [0003](0003-2d-solver.md) (the 2D scheme and its
  axisymmetric source); [0004](0004-grids.md) (grids, quality gates, and
  the captured stagnation-line error); [0005](0005-solution-verification.md)
  (the band procedure, the noise, the floors);
  [0006](0006-shock-fitting.md) (the fitted bow shock, blunt noses, the
  method of characteristics from a starting line, the GPU's limits);
  [0008](0008-total-drag.md) sections 4 and 6.1;
  [0009](0009-fin-wave-drag.md) (the product rule, its section 2.4 planar
  Euler check, section 6, section 7); [0010](0010-base-drag-and-total.md)
  sections 3 and 5; [0013](0013-transonic.md) (two-float, the red-black
  relaxation, the fitted-window settling rule);
  [0014](0014-refusals.md) sections 3, 4 and 10 (the population, the
  registration, amendments (a) to (t));
  [0015](0015-fins-at-the-base.md) (the fins-on-base factor);
  [0016](0016-fin-edges-of-flat-plates.md) (the edge terms of flat plates
  served today, and why square leading edges and rounded trailing edges
  are refused); [0017](0017-rocketeer-interface.md) section 6.2 (the 3D
  view's rules); [0019](0019-fins-near-mach-1.md);
  [0020](0020-brl934-range-a.md); the owner's decisions of 2026-10-22 and
  2026-10-23 (rounded leading edges below normal Mach 1.0 refused until
  NASA TM X-653 is named and read, 0014 10.7 (o); hobby fins first); the
  advisor's recommendation (Cartesian cut cells, LES and lattice
  Boltzmann rejected; RANS later; the label "fins solved, inviscid; base
  estimated").

## Summary of the decisions

1. **What is solved.** The steady inviscid (Euler) flow around N
   identical, equally spaced, uncanted fins on the cylinder of a
   nose-cylinder body at zero incidence, in one sector of 360/(2N)
   degrees, from a start plane just ahead of the fins to the base plane.
   The nose is not solved again: its 2D fitted solution (0006) gives the
   flow entering the sector and on the sector's outer boundary. The
   quantity is the pressure drag of the fins' surfaces ahead of the base
   plane: faces, bevels, and blunt leading edges.
2. **Hobby fins are in scope.** Flat plates with a full-round leading
   edge, flat plates with a square (blunt) leading edge, bevelled edges,
   and sharp sections; square trailing edges at the base or ahead of it.
   A blunt leading edge carries a detached bow shock. It is never
   captured on its stagnation line: a leading-edge block (block L) wraps
   the edge from root to tip, and its outer surface is that bow shock,
   **fitted in 3D** by 0006's method generalised to a surface (section
   3.4). The only captured near-normal shock left is the short piece above
   the fin tip, whose streamlines pass over the tip face and reach no
   surface that carries axial force (section 2.5).
3. **What is refused, plainly.** Rounded and square leading edges below a
   normal Mach number of 1.3 (between 1.0 and 1.3 the measured terms of
   0016 stay; below 1.0 everything stays refused, as the owner decided);
   sharp sections whose leading-edge shock detaches; the drag of rounded
   trailing edges (the fins' other terms are solved, the total stays
   refused as now); one-sided bevels and other asymmetric sections; fins
   on a boat-tail. Each with its reason in section 2.7.
4. **The grid.** A main block (the body-to-envelope space revolved
   through the sector, its first circumferential face displaced onto the
   fin), block L around a blunt leading edge, and a slab above the tip.
   The outer boundary is no longer the bow shock: it is a surface just
   above the fins' wave envelope, where the undisturbed 2D field is
   imposed, exact in supersonic flow outside the fins' domain of
   influence. That shortens the slab, and the main block is clustered at
   the fin so that every cell meets the gates (section 2.4).
5. **The scheme.** A finite volume in cylindrical coordinates with
   geometric sources, its face vectors exact integrals of r times the
   normal over each face, so that a revolved 2D state is the 2D scheme's
   state and the free stream is kept to round-off (section 3.1). The 2D
   kernels are reused (HLLC, the shared van Albada reconstruction, SSPRK2
   with local time steps), with a two-layer face-state boundary at the
   start plane.
6. **The band.** Four grids at a refinement ratio of 1.5, provided the
   rerun of 0005's captured families at ratio 1.5 (rung b0) shows 0005's
   order rule still separates them. Added in full: A1 (the 2D data), A2
   (the start plane), A3 (the outflow, with a buffer past the base). The
   floor includes the 3D tip, root-junction and subsonic-leading-edge
   errors, set on named floor families and tested on other, named test
   families.
7. **The ladder, registered now:** code checks; (a) the finless sector
   reproduces the 2D solution, criteria restated cell by cell; (b)
   planar sections against exact shock-expansion values, with (b3) a pass
   gate for short-bevel hexagons against a planar characteristics
   solution; (c) thin fins on a plane wall against linear theory, plus an
   exact nonlinear 3D check; (e) blunt leading edges, with two exact
   identities and offline references; (d) twenty 3D families on bodies,
   ten of them hobby fins, with offline finer families as independent
   references. "No band" is a failure for (b2), (c) and the exact cases of
   (e). Kill criteria are fixed now (section 4.9).
8. **Compute.** Rungs 4.0, (a), (b), (e0) to (e2), and L0 (and L1 on the
   reference families) of every GPU family run on this container's CPU:
   about a week of one shared core. Rungs (c), (d), (e3) to (e5) at L3 and
   the offline references need a hardware GPU: one command, `npm run ladder:3d`, or the page `demos/ladder-3d.html`, runs them on the
   owner's GPU, records the device, checkpoints after every level, and
   writes one results file to commit (section 5). Before those results
   are committed and judged, nothing is served.
9. **What it gains, honestly.** On the refusal population (an upper
   bound; section 6.4): the fins are solved in 5.3% of all cases (12.0%
   at Mach 1.8 to 3.0), 8.3% once (b3) passes; flat plates with rounded or
   square edges are 3.3% of all cases. Totals rise from 1.9% to 2.3%, or
   2.6% if square leading edges are allowed into totals (an owner
   decision). The nose solve (Haack noses, blunted tips) and low normal
   Mach numbers block most hobby rockets before the fins matter.

## 1. Scope

**Solved:** the inviscid steady flow between the start plane and the base
plane (or the trailing-edge rounding, 2.8), around the fins and the
cylinder, inside the fins' wave envelope, at free-stream Mach numbers
where the page serves the nose's fitted 2D solve (0006) and up to 3.0.
Zero incidence, power off, no roll, no cant.

**Configurations:**

- a body of a nose and a cylinder to a flat base (the body model of 0004
  and 0010; no boat-tail or transition);
- N fins, N from 3 to 8, identical and equally spaced, each wholly on the
  cylinder, their trailing edges at the base or ahead of it;
- planforms as `src/fins/planform.ts` defines them (trapezoidal with any
  trailing-edge sweep, clipped deltas; leading edges swept forward
  refused, as there), tip chord parallel to the axis, a square tip face
  (the tip of sheet stock as cut);
- sections symmetric about the fin's midplane, of the classes of section
  2.7: sharp sections (`SymmetricSection`), flat plates (`FlatPlate`,
  thickness the same everywhere) with rounded or square leading edges,
  and bevelled plates (bevel to a sharp edge, or bevel ending in a radius
  that the user gives).

**Not solved, and why:**

- the nose (its 2D solve is reused, 2.1);
- the flow behind the base, and behind a blunt trailing edge (inviscid
  base flow is physically wrong, 0001 section 1; the bases stay the base
  models', 0010, 0015, 0016);
- boundary layers, friction and anything viscous, including the body's
  boundary layer where the fin root meets it (Euler; section 6.5 says
  what that leaves out);
- incidence, roll, cant, unequal fins, launch lugs, rail buttons, fillets;
- Mach numbers below 1.2 (the nose's 2D solve below 1.2 is the transonic
  engine's, 0013; a 3D transonic sector is not part of Stage A).

## 2. The grid

### 2.1 The domain: start plane to base plane

The sector does not repeat the nose. It begins at a start plane normal to
the axis on the cylinder, a margin ahead of the fins' root leading edge
(ahead of its bow shock, for a blunt edge), and ends at the base plane.

**Why** (aerodynamic reasoning, the same as 0006's for its outflow): where
the flow is supersonic, nothing downstream reaches upstream except through
subsonic regions. Ahead of the fins' disturbance the flow is the
axisymmetric 2D flow, exactly, so solving the nose again in 3D would
reproduce what the 2D fitted solve gives, at many times the cost.

**Conditions** (each a refusal with its reason if it fails):

- the start plane lies on the cylinder, at least 0.1 body radius behind
  the nose's shoulder;
- the margin from the start plane to the root leading edge (to the root's
  bow-shock vertex for a blunt edge, from the 2D strip of 3.4) is a
  quarter of the root chord, and at least 0.25 body radius;
- the 2D flow crosses the start plane axially supersonically from the
  body to the bow shock (axial Mach number above 1 in every 2D cell column
  there), as 0006 requires of its own inflow plane;
- the 2D fitted solve reaches the base plane: the page's 2D solve is
  extended from "the end of the body asked for" (0006) to the base
  wherever Stage A runs (cylinder columns added to the 2D grid only).

**The start plane's ghost cells.** The start plane is an inflow face with
two ghost layers. Each ghost cell takes the 2D field interpolated (cubic,
in the 2D grid's parameters) at the ghost cell's own centroid, the ghost
cells being the first two 3D columns mirrored across the start plane. The
2D kernel's FACE_STATES boundary puts one state in both ghost layers
(`euler2d.wgsl`, the FACE_STATES branch near line 219); that is not used
here, since one state in both layers changes the second-order
reconstruction at the face. The 3D kernel gets a two-layer face-state
boundary. In rung (a) the start plane is a column face of the 2D grid, so
the two ghost layers hold the 2D solution's own two upstream cells,
exactly (4.1).

**The outer boundary** is section 2.4's envelope surface, below the 2D
bow shock; where the envelope would reach the bow shock, the case is
refused (2.4).

**The base plane** is the outflow: zero-gradient extrapolation, valid only
where the flow leaves axially supersonic. Every cell column next to it is
checked after the solve (axial Mach number above 1); otherwise refused.
Its sensitivity is measured as allowance A3 (2.8, 4.6).

### 2.2 The sector

Coordinates (x, r, theta): x along the axis, r the radius, theta the
angle from the plane through the middle of one fin (theta = 0) to the
plane midway between it and the next (theta = pi / N). Both planes are
planes of mirror symmetry of the configuration at zero incidence, so one
sector holds the whole solution: the other 2N - 1 sectors are its mirror
images, exactly, under the assumptions of section 1. This is why
asymmetric sections are refused (2.7).

Indices: i along x, j along r (j = 0 the body), k along theta. Every node
of the main block and the slab lies on a circle of its row's radius at its
own angle. The body is the surface r = R, exact in these coordinates.

### 2.3 The fin's faces: a displacement of the symmetry face

The fin is a plate of half-thickness z(x, r) about the plane theta = 0,
measured normal to it. Behind block L (2.5), or along the whole chord for
a sharp section, the main block's first circumferential face (k = 0) is
displaced onto the fin's face: at the node (x, r) of that face the angle is

    theta_0(x, r) = asin(z(x, r) / r),

with z the face's half-thickness inside the planform, the slab's top above
the tip (2.4), block L's outer surface where block L is (2.5), and 0
elsewhere. One kind of boundary serves the symmetry plane and the fin: the
k = 0 face is a slip wall (velocity mirrored about the face, 0003).

The other nodes of each (i, j) line run from theta_0 to pi / N, clustered
at theta_0 (2.10). Between nodes the cell faces are bilinear in (x, r,
theta); the nodes lie on the true surface, and the face departs from it
between nodes by a second-order amount that falls with the grid. On a flat
plate z is constant, so theta_0 depends on r only and the face's x
component is zero exactly: a plate's faces carry no axial force in the
discrete problem either, as in the real one.

**Columns follow the planform.** Inside the fin's span the columns are
sheared so that the leading edge (or block L's root-to-tip outer edge) and
the trailing edge each lie on one column line at every row. Above the tip
the columns keep the tip's positions. Near block L's bow-shock vertex the
columns bend to meet block L's outer surface at no less than 50 deg (the
gates of 2.11); this is where the spike of 2.11 looks first.

### 2.4 The tip and the outer region (review finding 1)

**What was wrong.** Revision 1 bounded the sector by the frozen 2D bow
shock, so the slab (the fluid above the fin tip, between theta = 0 and
the tip's half-thickness) ran from the tip to the bow shock, several
calibers out, while being only half a fin thickness wide. Its cells had
aspect ratios of about 60 to 120 against the gate of 13; neighbouring
cells across the slab-to-main interface differed in size by 2 to 3
against the gate of 1.3; and the main block's first theta cell was about
8 times the slab's. The record failed its own gates.

**The outer boundary, redesigned: the envelope surface.** In supersonic
flow a disturbance from the fins travels no faster outward than the
strongest wave they make: the leading edge's shock, steeper than the Mach
cone. Outside the fins' domain of influence the flow is the undisturbed
axisymmetric 2D flow, exactly (aerodynamic reasoning, the same as the
start plane's). So the sector's outer boundary is placed just outside
that domain:

    r_out(x) = r_tip + e(x - x_tip,LE) + 3 L0 cells,

with e the outward reach of the tip's leading-edge shock at a distance
behind the tip's leading edge: for a sharp section, (x - x_tip,LE) tan
beta, beta the 2D oblique-shock angle of the tip section's leading wedge
in the local 2D flow; for a blunt edge, the lateral height of the 2D
strip's fitted shock (3.4) at that distance, which bounds the tip's
detached shock from outside (aerodynamic reasoning: the 3D cap around the
tip is relieved sideways and spreads less than the planar shock of the
infinite edge). The margin is fixed in physical length (3 cells of L0), so
the domain is the same on every level. Above the envelope, on two ghost
layers, the 2D field is imposed (interpolated at the ghost centroids).
Imposing it is exact wherever the boundary lies outside the domain of
influence, whatever the direction of the characteristics there; whether
it does is checked after every solve (3.8: the outer rows are
axisymmetric within the measured noise). Where r_out would come within 3
L0 cells of the 2D bow shock, the case is refused: "the fins'
disturbance reaches the bow shock before the base; Stage A does not refit
the bow shock in 3D".

**What that does to the slab.** The slab now runs from the tip row to
r_out, so its height is about the margin at the tip's leading edge and
about chord times tan(beta) at its trailing edge (for a sharp tip at Mach
2, about 0.6 of the tip chord), not the bow shock's several calibers.

**The gates met by construction** (on L0; each level scales every count by
1.5, so ratios are kept):

- **Across the slab:** n_s cells of width w = (t_tip / 2) / n_s, n_s = 4
  on L0.
- **The main block's first theta cell** is at most 1.3 w, growing by at
  most 1.2 a cell to the mirror plane: on a 54 mm body with 3 mm plates
  and three fins, from 0.375 mm to the sector's width at the tip (about
  63 mm on an 80 mm span) in about 20 cells.
- **Every cell next to the fin, the slab or block L** is at most 13 w long
  in x and in r. That fixes the L0 counts: on a 120 mm root chord and an
  80 mm span with 3 mm plates, at least 25 cells along the chord and 16
  along the span, more where the spacing is clustered; on 1.6 mm plates
  (the thinnest stock in the population) about twice that.
- **The slab's top** is point-matched to the main block's k = 0 face, so
  the two blocks' cells there have the same x and r sizes and theta sizes
  within 1.3.

**What any exemption costs.** One exemption is kept: for a sharp tip
section, the slab's ends at the tip's leading and trailing edges have zero
height, so their cells are wedges with an included angle of the section's
half-angle over n_s (a few degrees), below the 12 deg gate. For a flat
plate the slab has constant height and no such cells. On rung (c) the
exemption's cost is carried, not assumed: the exact nonlinear check (c-x,
4.3) is made only outside the tip's zone of influence, so it cannot see
these cells; the thin-limit families (c1 to c9) and the tip-cone pressure
comparison do, and both are reported with their bands. If a thin-limit
family gives no band, the exemption is the first suspect and rung (c)
fails (4.9). The slab's edge wedges are never exempted from the positive
volume or the size-ratio gates.

**No tip vortex** is drawn or expected: a symmetric section at zero
incidence carries no lift (aerodynamic reasoning). The flow over the tip
is the spillage of the thickness problem, which the slab resolves.

**Rejected tip treatments** (as in revision 1): a sloped tip cap (a
first-order geometric error), the thin-fin transfer of the boundary
condition to theta = 0 (an error of order t/c in the face pressures),
and blanked cells (a third of the cells wasted).

### 2.5 Block L: the blunt leading edge and its fitted bow shock

**The problem it solves.** A rounded or square leading edge in supersonic
flow carries a detached bow shock with a stagnation line along the edge.
0004 measured what a captured shock does there: on the hemisphere-cylinder
at Mach 2 the stagnation pressure, against the exact pitot value, swung
between +9.7% and -0.56% on grids of 20 to 23 cells across with HLLC,
and no flux cured it (HLL changed sign from grid to grid; Rusanov was
smooth but 0.9% off). The error is set by where the shock falls in its
cell and is carried to the wall along the stagnation streamline. 0006
removed it for noses by fitting the bow shock: 50 to 1300 times smaller,
smooth with the grid, second order. A fin's edge has the same problem
along its whole span.

**The decision.** Block L wraps the edge from the root (on the body) to
the tip row. Its inner surface is the edge; its outer surface is the
edge's bow shock, fitted (3.4): a moving surface whose nodes slide on
fixed lines, carrying the exact Rankine-Hugoniot jump. So every
streamline that reaches the fin's edge crosses a fitted shock, never a
captured one, anywhere on the span, root included.

**Options considered:**

1. _Captured, with a finer grid or another flux._ 0004's measurement
   rules it out: the error does not converge.
2. _A 2D (strip) model for the edge and 3D for the rest._ Each span
   station's edge solved by the 2D fitted solver in planar geometry at
   its normal Mach number (the independence principle, exact for an
   inviscid infinite swept edge). Exact in the middle of a long edge; wrong
   at the root, where the body stops the spanwise flow of a swept edge,
   and at the tip, where the flow spills around the end; no exact or
   measured reference exists for either end, so its end error could be
   neither bounded nor measured. Rejected as the method; kept as the
   start of block L's shock and as an exact reference in the middle of
   the span (rungs e1 and e2) and on every served case (3.8).
3. _A local 3D fitted shock (block L)._ **Chosen.** The ends are in the
   3D solution; the stagnation line is fitted along all of it; the strip
   becomes its check.

**Block L's grid, by edge:**

- _Rounded (full round, radius t/2):_ the 2D blunt-nose C grid of 0004
  (lines from the body to the shock, `gridOnLines`), in the plane normal
  to the edge, at every span row: the edge in planar section is a
  cylinder followed by the plate, the planar twin of the
  hemisphere-cylinder that 0006 fitted. The lines run from the stagnation
  line (on the plane theta = 0) around the nose to a line normal to the
  face one plate thickness behind the shoulder, on which the flow in the
  normal plane is supersonic from the face to the shock (checked, as
  0006's starting line for the method of characteristics); behind that
  line the main block takes over across a point-matched interface.
- _Square (a flat face normal to the plate, sharp corners):_ two
  sub-blocks per row: a front block between the flat face and the shock
  (lines parallel to the stream, from the face upstream), and a corner
  block, its lines fanning from the corner between the stream direction
  and the plate's normal, to the shock. The corner is a line of nodes
  where the fan's lines meet: faces of zero area there, as at the axis of
  the 2D grids (0003). The expansion around the corner is centred at it,
  so a polar grid there resolves it; the expansion is captured, which is
  not 0004's problem (that is a shock on a stagnation line).
- _A bevel ending in a radius (a rounded wedge):_ as the rounded edge,
  with the wedge's faces behind the nose; the bevel's faces behind the
  supersonic line belong to the main block.

**The root.** Block L's root row lies on the body; the fitted shock's
root edge slides on the body's surface. The body is a slip wall for both
blocks.

**The tip.** Block L ends at the tip row; above it is the slab. The fitted
shock's edge there is free: above the tip the shock is captured, in the
slab and the main block. That captured piece is near normal for about a
standoff above the tip and then oblique. No stagnation streamline crosses
it: the streamlines through it pass over the tip face, which carries no
axial force (its normal is radial). Its error reaches the edge's pressure
near the tip only through the subsonic pocket, as a pressure disturbance,
not as the wrong entropy 0004 measured on a stagnation streamline; it is
measured, not assumed, by rung (e3) and the tip-region families (4.5,
4.7). This is the one place where Stage A keeps a captured near-normal
shock, and section 8 lists it as a risk.

**Interference with block L.** A neighbouring fin's captured oblique
shock may reach a swept edge further out on the span. It then crosses
block L's fitted shock, whose upstream state jumps across a few cells;
the fit takes the upstream state of the main block's cell next to each
face (3.4), so the fitted jump follows. Measured on the families where it
happens (4.5: d5, h10), reported as found.

### 2.6 The root junction

The fin's root lies on the cylinder along the body row; its face meets the
body at a right angle and the corner cells are orthogonal there. No
fillet, gap, anchor or slot is represented. In inviscid flow the fin's
shock meets the body without a separation; a weak reflection from the
cylinder's curvature is captured. Ahead of a blunt edge's root, the edge's
bow shock meets the body (fitted down to the wall, 2.5). The real
junction flow (the body's boundary layer separating ahead of the root
shock, the horseshoe vortex, and the low-speed part of that layer meeting
the edge) is absent, and the labels say so (6.3). On hobby rockets that
layer is of the order of the fin thickness or thicker at the fins
(aerodynamic reasoning), so this is the largest physical effect Stage A
leaves out at the edge (6.5).

### 2.7 Classes: served, and refused with reasons

| Class (`src/fins/section.ts`; population share, 0014 section 3)              | Stage A                                                                                                                               | Why                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flat plate, rounded leading edge, square trailing edge (28.4%)               | served from normal Mach number 1.3 (block L, rounded)                                                                                 | the edge's stagnation line is inside block L, its shock fitted (2.5)                                                                                                                                                                                                                                                                                                                                          |
| Flat plate, both edges rounded (15.5%)                                       | leading edge and faces solved from normal Mach 1.3; the domain ends where the trailing-edge rounding begins; **total refused** as now | the rounding is an aft-facing curved surface whose real flow separates; an inviscid pressure there is not physical. Its drag is the trailing-edge term, still "bounded, not measured" without its ordering (0016 section 6, W11)                                                                                                                                                                              |
| Flat plate, both edges square (15.3%)                                        | served from normal Mach number 1.3 (block L, square); in a total only if the owner decides so (section 10, question 3)                | the front face's pressure is set by the subsonic pocket ahead of the sonic corners, which inviscid flow gives; see "Square leading edges" below for what it cannot claim. No measurement of a square fin edge is among the band-setting sources                                                                                                                                                               |
| Bevel to a sharp edge both ends (hexagon, 20.6%)                             | served where the leading-edge shock attaches; short bevels (a reflected wave reaches the surface) only after rung (b3) passes         | captured oblique shocks with supersonic flow on both sides (0009 2.4 converged at order 1.25); the short-bevel hexagon did not converge to a band there, so it waits for an independent reference (4.2)                                                                                                                                                                                                       |
| Bevel to a sharp leading edge, square trailing edge (9.1%)                   | as the hexagon                                                                                                                        | as above; the square trailing edge as in 2.8                                                                                                                                                                                                                                                                                                                                                                  |
| Bevel ending in a radius the user gives                                      | served from normal Mach number 1.3 (block L, rounded wedge)                                                                           | as the rounded edge. The population draws bevels as sharp; real bevels end in a land or radius (assumption, unmeasured), which the page will ask for                                                                                                                                                                                                                                                          |
| Sharp double wedge, symmetric (11.3%)                                        | served where the leading-edge shock attaches                                                                                          | as revision 1                                                                                                                                                                                                                                                                                                                                                                                                 |
| Any blunt leading edge at normal Mach number 1.0 to 1.3                      | not by Stage A; 0016's terms stay (W4(e) for rounded edges; square edges refused)                                                     | the planar bow shock of a blunt edge stands about 10 radii off at normal Mach 1.2 (F. S. Billig's correlation for cylinders, as 0004 uses for spheres; aerodynamic reasoning), so block L would be wider than most fins' spans and the root and tip would interact through the subsonic pocket. Whether 1.3 holds is decided by rung (e) (4.4); if its families fail at 1.3 and pass at 1.5, the floor is 1.5 |
| Any blunt leading edge below normal Mach number 1.0                          | refused                                                                                                                               | the owner's decision (rounded edges refused below normal Mach 1.0 until NASA TM X-653, named in 0014 10.7 (o), is read). Inviscid flow would attach around the edge, but the real pressures there are set by separation and transition (0016 section 6); Euler cannot claim them                                                                                                                              |
| Sharp section with a detached leading-edge shock, or subsonic flow behind it | refused                                                                                                                               | a detached shock at a sharp apex has a stagnation line too; block L could hold it with a corner-type fan at the apex, but no exact or measured reference for it is registered here. A later option                                                                                                                                                                                                            |
| Asymmetric sections (one-sided bevels, cambered airfoils)                    | refused                                                                                                                               | the plane theta = 0 is a mirror plane only for symmetric sections. A sector of 360/N degrees with periodic faces would serve them at twice the cost: a later option                                                                                                                                                                                                                                           |
| Fins on a boat-tail or a transition                                          | refused                                                                                                                               | the body under the fins is not a cylinder (1)                                                                                                                                                                                                                                                                                                                                                                 |

**Square leading edges: what inviscid Euler can and cannot claim.** In
reality the flow ahead of a square edge is a detached shock, a subsonic
pocket over the flat front face, sonic flow at the two corners, and then a
separation at each corner: the flow leaves the corner, a bubble forms on
the face a few thicknesses long, and the flow reattaches (aerodynamic
reasoning; no source in the repository measures a square fin edge).

- _Euler can claim_ the front face's pressure at normal Mach numbers where
  the shock is detached with a subsonic pocket: the pocket ends at the
  sonic corners, and nothing behind the sonic line reaches upstream, so
  the separation behind the corners cannot change the front face's
  pressure, except through the thin subsonic part of the front face's
  boundary layer (small; unmeasured). The front face carries the whole of
  the edge's axial force; the faces behind the corners carry none (their
  normals are normal to the stream).
- _Euler cannot claim_ the pressures on the faces just behind the
  corners: it expands the flow around a sharp corner into a fan where the
  real flow separates. On a plate they carry no axial force, so the drag
  does not depend on them, but the view must not present them as real
  (section 8). Nor can it claim a real edge's corners: cut sheet has a
  small, unknown corner radius, which moves the sonic point onto the
  rounding and changes the front face's pressure near the corners. The
  label says "edges taken as perfectly square".
- _0014 10.2's bounds_ (the rounded edge of the same thickness below,
  pitot pressure on the whole face above) become a check of the solved
  value, not its band: a solved square edge outside them stops the class
  (4.9).

**Rounded trailing edges and square trailing edges at the base:** section
2.8.

A sharp swept leading edge whose normal Mach number is subsonic is served
(as revision 1): its flow is locally subsonic without a shock, and these
planforms are where linear theory errs most (0009 section 4). A blunt
edge at a subsonic normal Mach number is not (above).

### 2.8 Trailing edges, the base plane, and the outflow allowance A3

- **Sharp trailing edges** lie on column lines, clustered.
- **A square trailing edge at the base:** the faces are solved to the base
  plane; the edge's base face is the outflow plane, outside the domain.
  Its drag stays 0010 section 5.1's trailing-edge term as extended by 0016
  (thick layers, varying chord); the body base and the fins-on-base factor
  stay 0010 and 0015. In supersonic flow the faces do not feel the base.
- **A rounded trailing edge at the base:** the domain ends at the plane
  where the rounding begins, x_base - t/2; the fin's faces are solved up
  to it, and the body's last t/2 of cylinder carries no axial force. The
  rounding's drag stays the trailing-edge term of 0016 W11, refused in a
  total until its ordering is shown (0014 10.2). The fins' other terms
  are shown as a component.
- **A trailing edge ahead of the base** (sharp, square, or rounded): the
  fin's drag is summed to its trailing edge (to the rounding's start for a
  rounded edge). Behind a blunt trailing edge, the domain continues to the
  base with the fin continued as a fictitious plate of the same thickness
  (slip walls) to the base plane, so that no inviscid dead-air wake is
  computed. In supersonic flow nothing behind the trailing edge reaches
  the faces; the fictitious plate changes only flow that no summed face
  sees and the cylinder, which carries no axial force. The view does not
  draw the region behind such an edge as computed (8). The edge's base
  term stays 0010's and 0016's.
- **A3, the outflow allowance.** On L0 and L1 of every family the solve
  is repeated with a buffer behind the outflow plane: the domain extended
  by half a body radius, at least 6 L0 cells, the body continued as a
  fictitious cylinder and the fins (or the fictitious plates) continued
  at their thickness, all slip walls; the fin drag is summed only ahead
  of the real outflow plane. A3 is the larger change in the fin drag over
  L0 and L1, added to the band in full. It is expected at the noise; a
  larger value is a finding that the outflow condition reaches upstream
  through the scheme, and it is reported.
- **Nothing behind the base is computed or drawn as computed.**

### 2.9 Symmetry faces

- theta = pi / N: a slip wall (mirror), exact, the plane being a plane of
  the coordinates.
- theta = 0 outside the planform and under the slab: the same.
- The fin's faces, block L's edge surface, the tip face: slip walls with
  the face's own normal (0003's wall).

The neighbouring fins are represented exactly: their shocks meet the
mid-plane as each other's mirror images. Fin-fin and fin-body interference
on the fins' surfaces are therefore in the solution.

### 2.10 Spacing, clustering and families

Every count is per segment between breakpoints, on the coarsest level L0;
each level multiplies every segment's count by exactly 1.5 (counts on L0
multiples of 8, so L1 to L3 are whole).

- **Along x:** [start plane, leading edge], [leading edge, trailing edge]
  and, for fins ahead of the base, [trailing edge, base]; clustered at
  both edges, the first cell 1% of the local chord on L0, growth at most
  1.2.
- **Along r:** [body, tip] and [tip, r_out]; clustered at the root and
  the tip.
- **Along theta:** the main block clustered at its k = 0 face, the first
  cell at most 1.3 times the slab's (2.4), growth at most 1.2; the slab
  uniform.
- **Block L:** on L0, 16 cells around a rounded nose's half-circle (from
  the stagnation line to the shoulder) and 8 more to the interface line;
  for a square edge, 8 across the half front face and 12 in the corner's
  fan; 12 from the edge to the fitted shock; the span rows are the main
  block's.

**Reference layouts** (estimates of cell counts for memory and time; the
spike of 2.11 measures the real ones before any solve):

| Layout                                                                                                                      | L0 cells (estimate) | L3 cells (38.4 x L0) |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------------------- |
| Sharp: revision 1's (planform C, double wedge t/c 0.05), with the main block clustered at the fin for the slab's gate       | 40,000              | 1.5 million          |
| Hobby: 54 mm body, three clipped-delta plates, root 120, tip 48, span 80 mm, 3 mm thick, rounded leading edge, fins at base | 100,000             | 3.9 million          |
| Plane-wall fin (rungs c and e): one fin, the wall, the mirror plane and the envelope                                        | 30,000 to 60,000    | 1.2 to 2.3 million   |

(For comparison, 0009 section 2.4's planar Euler check of a double wedge
used 40, 80 and 160 cells over the chord.)

**The grids of a family do not nest** (a ratio of 1.5 cannot split cells
into whole parts). They are systematic: the same mapping functions,
evaluated at finer spacing of their parameters, with every edge, the
root, the tip, the start plane, the base, block L's interface line and the
envelope on grid lines at every level. Each level starts from the
converged level before it, interpolated in the mapping's parameters (3.7).

### 2.11 Quality gates, and the spike before any solver code

The fitted grids' gates of 0006, applied to every cell of every block, in
every direction: positive volumes; neighbouring cells within 1.3 in size,
across block interfaces too; aspect ratio at most 13; cell angles at least
12 deg, and at least 50 deg at the walls (the fin's faces, block L's edge
surface, the body, the tip face). One exemption: the zero-height ends of
the slab for sharp tip sections (2.4), from the angle gate only. Block L's
corner fan (square edges) and its outer surface are not walls; its cells
there meet the 12 deg gate. A grid that fails is refused with the reason,
never solved.

**The spike** (0002 section 10's early test), before the solver is
written: the generator is run on 50 fin and body combinations drawn from
the refusal population (`docs/research/refusals/population.ts`), at
least 30 of them flat plates (rounded and square leading edges, both
thickness extremes), at Mach 1.5, 2 and 3, with block L's shock taken from
the 2D strip (3.4) as it would start. The gates' outcomes, the cell counts
and the worst cells are recorded. If more than a fifth fail, the layout is
revised and the revision recorded before any solve. The places expected
to bind are named now: the main block's columns at block L's shock
vertex; the slab's front end at a blunt tip's leading edge; the corner
fan of a square edge; the thinnest plates on the longest chords.

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

- **Face vectors, exact.** Each face's physical area vector, in the
  cylindrical components, is S_f = (the integral over the face of r n_x
  dA, of r n_r dA, of n_theta dA), n the face's unit normal and dA its
  area element in the coordinate space (x, r, theta). It is computed by
  exact quadrature of the bilinear face (2 x 2 Gauss points: each
  integrand is a polynomial of degree at most 3 in each face parameter),
  in double on the CPU, and stored once per face, so the two cells that
  share it use the same vector. A closed cell's faces then satisfy, to
  round-off, by the divergence theorem in the coordinate space: the sum
  of the x components is zero (r does not depend on x), the sum of the
  theta components is zero, and the sum of the r components equals the
  integral of dr/dr over the cell, its coordinate volume, which is the
  volume the pressure source is integrated over. The flux of a uniform
  state through a closed cell is therefore zero in mass, x momentum and
  energy, and in r momentum it is balanced exactly by the pressure
  source. A uniform stream along x is kept to round-off on any grid,
  displaced, fitted and fictitious faces included. Revision 1 asked for
  the discrete source volume to equal the sum over the faces; that holds
  only if the face vectors are exact integrals, which this states.
- Each face's flux is the physical normal flux (the 2D kernels' flux in
  the frame of S_f's direction) times the magnitude of S_f.
- The cell's momentum is held in the cylindrical components at its
  centroid.

**Why cylindrical and not Cartesian.** On a revolved grid with an
axisymmetric state (w = 0, nothing depending on theta), every
circumferential face sees the same state on both sides and carries
pressure only, the i- and j-faces carry the 2D faces' fluxes times the
sector's angle, and the radial source is the 2D source times the angle.
So the 3D residual of a revolved 2D state is the 2D residual times the
angle, to round-off, and rung (a) can demand identity, not only
convergence. The cylindrical form also makes the body (r = R) and the
mirror plane theta = pi / N exact surfaces of the grid. Its price: a
uniform cross-flow is not preserved exactly (the basis turns from cell to
cell); at zero incidence there is none, and the manufactured solution of
4.0 checks the order where w is not zero. There is no axis in the domain.

**Planar mode** (rungs b, c, e): the same kernels with r replaced by 1 and
the source by zero, in Cartesian (x, y, z).

### 3.2 Reused and new

| Part                      | From the 2D engine                                                                                        | New for 3D                                                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Flux                      | HLLC in the face's normal frame, Einfeldt speeds with the tangential kinetic energy (0003)                | a second tangential velocity, carried with the contact as the first is                                                             |
| Reconstruction            | MUSCL on primitives, the shared scaled van Albada factor (0003)                                           | a fifth difference (dw / a) in the factor; a third direction                                                                       |
| Time stepping             | SSPRK2, local time steps (0003)                                                                           | the time step's sum over three directions                                                                                          |
| Implicit option           | the red-black relaxation, 2 sweeps (0013; 4 sweeps fell into a limit cycle)                               | the third direction's spectral radius in the diagonal; red-black by the parity of i + j + k                                        |
| Two-float arithmetic      | `two-float.wgsl` and its self-test (0013)                                                                 | used only if the switch of 3.5 fires                                                                                               |
| Shock fitting             | 0006: nodes on fixed lines, the u_n + a compatibility relation, node motion, line-grid rebuild on the GPU | a fitted surface (block L), its free tip edge and its root edge on the body (3.4)                                                  |
| Settling and verification | `SettlingValue`, `dampedOscillationBound`, `refineUntilVerified`'s procedure (0005, 0006, 0013)           | the procedure at ratio 1.5 (4.6)                                                                                                   |
| GPU safety                | step counting, dispatch limits, allocation errors caught, adapter limits requested (0006)                 | 3D dispatch (two-dimensional workgroup grids), buffers split by direction (3.10)                                                   |
| Metrics                   | computed once in double on the CPU, stored in 32 bits (0002 section 6)                                    | hexahedra with bilinear faces; r-weighted face vectors by exact quadrature (3.1)                                                   |
| Boundaries                | slip wall, fixed state, periodic, zero-gradient outflow (0003); the fitted face's flux (0006)             | two-layer face states (start plane, envelope); the multiblock interfaces; the fitted surface; the fictitious buffer surfaces (2.8) |
| Drag                      | wall-face pressures read back and integrated in double on the CPU (0005)                                  | the fins' wall faces only, block L's included (3.9)                                                                                |

A CPU engine in double precision implements the same scheme, as the 2D
one does: the tests' oracle and the engine of the CPU rungs (section 5).

### 3.3 Boundaries

| Face                                    | Condition                                                                                                                                       |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Start plane (i = 0)                     | two ghost layers, each cell the finest 2D grid's solution interpolated (cubic, in the 2D grid's parameters) at its own centroid; w = 0 (2.1)    |
| Envelope surface (outer)                | two ghost layers from the 2D solution, the same way (2.4)                                                                                       |
| Base plane, or the rounding's start     | zero-gradient outflow; checked supersonic; A3 measures it (2.8)                                                                                 |
| Body (j = 0)                            | slip wall                                                                                                                                       |
| theta = 0 outside the fin, theta = pi/N | slip wall (mirror)                                                                                                                              |
| Fin faces, tip face, block L's edge     | slip wall                                                                                                                                       |
| Block L's outer surface                 | the fitted bow shock (3.4): the main block's side is a supersonic outflow into the shock; block L's side carries the post-shock flux and ghosts |
| Main block, slab, block L interfaces    | point-matched; each face's flux computed once and used by both blocks                                                                           |
| The slab's zero-height ends (sharp)     | faces of zero area                                                                                                                              |
| Buffer surfaces (A3, fins ahead)        | slip walls on fictitious surfaces; no force summed on them                                                                                      |

Every 3D level takes its 2D data from the same, finest 2D grid of the
nose's family, so the 2D data's error is a fixed input to the 3D family;
its effect is the allowance A1 (4.6).

### 3.4 The fitted leading-edge shock

0006's method (G. Moretti and M. J. Abbett; M. D. Salas: the citations
confirmed, the papers not read, `docs/validation/sources.md`), generalised
from a curve to a surface:

- **Nodes.** The shock is a surface of nodes, each on a fixed straight
  line of block L (2.5) in the plane normal to the edge at its span row,
  at a distance h along it.
- **Face speed.** On each shock face (a quadrilateral of four nodes,
  outward unit normal n in 3D), the shock's speed W along n follows from
  the one characteristic that reaches it from behind, the u_n + a wave:
  p_s(W) + rho a u_n,s(W) = p_c + rho a u_n,c, with the cell's pressure
  and normal velocity extrapolated to the face from the two cells below
  it, and the upstream state that of the main block's cell across the
  face (not the free stream: the incoming flow is the body's 2D flow, or a
  neighbour's disturbed flow). The root is unique, as in 0006.
- **Flux.** The face carries the physical flux of the post-shock state,
  which also fills block L's ghost cells there; the main block sees the
  face as a supersonic outflow (upstream of a shock the normal Mach number
  exceeds 1), its ghosts extrapolated.
- **Motion.** Each node moves along its line by W dt / (n . line), W the
  mean of the faces next to it on the stagnation-line side in the normal
  plane (0006's "axis side"; along the shock, information travels away
  from the stagnation line). The stagnation-line node keeps the shock
  normal to the plane theta = 0 (the mirror), as 0006's axis node keeps
  it normal to the axis. The root row's nodes slide on the body; the tip
  row's nodes take the tip row's faces only (a free edge). After each move
  block L's lines and the main block's columns next to it are rebuilt from
  their fixed fractions (0006's `withFixedFractions`) and the flow
  interpolated along them.
- **Start.** From the 2D strip: at every span row, the 2D fitted solver
  in planar geometry, at the row's normal Mach number and the local state
  of the body's 2D flow at the edge (the independence principle), gives
  the shock's position on each line and the flow in block L. The strip is
  the exact inviscid solution of an infinite swept edge; on a finite fin
  it is the start and, in the middle of the span, the check (3.8).
- **Convergence.** W = 0 on every face, to 1e-12 of the free-stream sound
  speed on the CPU and 3e-5 on the GPU (0006's figures, to be confirmed
  in 3D by rung e1), with the fin drag settled (3.8).

New, and so tested from the bottom (4.4): the free tip edge; the root edge
on a curved wall; spanwise coupling through the mean of adjacent faces.

### 3.5 Precision: 32 bits, with a registered switch to two-float

The state is held in 32 bits, as in the page's fitted 2D engine, whose
drag agrees with the CPU's within 2e-6 (0005, 0006). Registered rule, as
revision 1: the fin drag's noise is measured on rung (b) and on L0 and L1
of the rung (d) families (the largest wander between converged checks and
the largest difference from the CPU engine on the same grid, twice the
larger, at least 2e-6 of the fin drag). If it exceeds 1e-4 of the fin drag
(a tenth of the floor), the state, residual and metrics go to two-float as
in 0013 before anything is served, and the memory figures double.

The cell-level noise eps_cell (the largest difference of any cell's state
from the CPU engine's, relative to the free stream's density, pressure and
sound speed) is measured on rung (a) (4.1) and sets the tolerance of the
checks of 3.8.

### 3.6 The iteration

SSPRK2 with local time steps, the default. The red-black relaxation with 2
sweeps (0013) is built as an option, tested on the CPU to reach the
explicit scheme's fin drag within 1e-12, and adopted only if on L0 to L2
of three rung (d) families it settles the fin drag with less work. Block
L's small cells and the slab's thin ones make the grid stiff; local time
steps keep the explicit iteration's steps per cell the measure of its
cost.

### 3.7 Starts

- L0 starts from the 2D solution revolved (every cell, every block, the
  2D flow at its centroid's (x, r), w = 0), with block L and its shock
  from the 2D strip (3.4). The fins are then switched on at once.
- Each finer level starts from the converged level before it,
  interpolated in the mapping's parameters (0006's `startedFrom`, without
  nesting), block L's shock from the level before.
- Each level takes the rate of convergence measured on the level before
  it (0006), scaled per check.

### 3.8 Convergence, and the checks on every level

A level is settled when all of these hold:

1. `SettlingValue` on the fin drag, with the noise of 3.5;
2. the fitted-window rule of 0013 (its finding S1 and the re-review of
   dd6c423): `dampedOscillationBound` has fitted at least one window,
   every fitted window decays, and its bound is within the noise;
3. the residual has fallen to half the largest seen on the level and is
   still changing; a residual 100 times its first value stops the level
   as diverging (0013);
4. the fitted shock's speeds are within 3.4's tolerance;
5. the GPU's step count equals the steps asked for (0006).

Checks every 250 steps on L0, times 1.5^l on level l.

After it settles, each level must pass, or the case is refused with the
reason:

- **outflow:** axial Mach number above 1 in every cell next to the
  outflow plane;
- **outer rows undisturbed:** in the two outermost rows, every cell's
  pressure and density within max(1e-5, 5 eps_cell) of the mean of its
  ring (the fins' disturbance has not reached the envelope);
- **start plane undisturbed:** in the first two columns, the same test;
- **mass balance:** the net mass flux over the whole domain's boundary
  (start plane, envelope, outflow plane; walls and mirrors carry none by
  construction) within 1e-6 of the mass flux through the start plane
  (GPU) or 1e-11 (CPU); and on every block interface, the flux the two
  blocks used is the same stored flux (asserted, not measured);
- **the strip check** (blunt edges): at every span row farther than 8
  standoffs from both the root and the tip, the edge's drag per unit span
  equals the 2D strip's at that row within the family's band (reported on
  every level; a failure on the finest two levels refuses the case: the
  3D edge disagrees with the exact infinite-edge solution where they
  should agree);
- the quality gates (2.11), on the grid before the solve and on the
  final fitted grid.

### 3.9 The quantity: the fins' pressure drag

The sector holds one side of one fin. With p the wall-face pressure from
the wall flux (0003), A_x the x component of each fin wall face's physical
area vector (positive facing upstream), q the free stream's dynamic
pressure and R the body radius:

    C_D,fin pressure = 2 N sum over the fin's wall faces of (p - p_inf) A_x / (q pi R^2)

on the body's cross-section, as every component of 0010's total. The fin's
wall faces are the main block's displaced faces over the planform and
block L's edge surface; the tip face and the body have no x component.
The sum stops at the outflow plane (2.8). For a flat plate the faces'
A_x is zero exactly (2.3), so the sum is the edge's drag alone. Wall
pressures are read back from the GPU and summed in double on the CPU. The
sum is also reported split into the edge (block L) and the faces, so that
each can be set beside the term it replaces (6.1).

### 3.10 GPU memory layout and limits

Per cell, in 32 bits (from `euler2d-gpu.ts`, five variables and three
directions): state, three copies for SSPRK2's stages, 60 bytes; face
fluxes, 60; geometry (three r-weighted face vectors, cell and source
volumes, centroid), 80; implicit option, 40; scratch, limiter factors,
masks, 8: **about 250 bytes** (210 without the implicit option); about
500 in two-float. Block L's line-grid data (its lines' fixed fractions and
nodes) add about 10%. Fluxes and geometry are split into one buffer per
direction, so that no binding exceeds the device's limit at page sizes
(WebGPU's default is 128 MiB a binding; the page requests the adapter's
own limits) and no kernel binds more than eight storage buffers.
Workgroups are dispatched over two dimensions (one dimension stops at
65,535 workgroups, 0006).

## 4. Verification ladder: registered before any number exists

Every criterion here is fixed by this record, before any code or result.
A rung that fails stops the ladder: its finding is recorded and a new
record decides what follows. Nothing in a later rung's numbers may change
an earlier rung's criterion. "No band" (0005's procedure ending without a
band: orders that disagree, changes that do not shrink, fewer than four
grids) is a failure wherever this section says "a band contains".

### 4.0 Code checks (CPU and GPU)

- Free stream along x kept to round-off (CPU 1e-13, GPU 1e-6 relative)
  on sector grids with randomly perturbed nodes, the fin displaced, the
  slab and block L present (block L's shock frozen), in cylindrical and
  planar mode; and the exact closure sums of 3.1 asserted cell by cell.
- A manufactured solution in cylindrical coordinates with w not zero and
  theta dependence (0003's construction), on grids with displaced faces:
  L1 error falling at an observed order of 1.8 or more over four grids.
- The 3D flux equals the 2D flux to round-off when w = 0, and is
  invariant under rotation of the face frame.
- A sector solved with mirror faces equals the same flow solved on twice
  the sector with the mirror plane inside it, to round-off (CPU).
- The two-layer face-state boundary: a 2D solution's own cells placed in
  the ghosts reproduce the 2D interior face fluxes to round-off.
- The fitted surface: a planar oblique shock of known angle, placed at
  its exact position on a 3D grid with lines oblique to it, stays there
  (W within 1e-13 of zero, CPU), and a displaced start returns to it.
- GPU kernels against the CPU's at a few units in the last place.
- Mutation checks: planted errors in the face vectors, the source, each
  boundary, each interface and the fitted surface's motion are caught.

### 4.1 Rung (a): the finless sector reproduces the 2D fitted solution (review finding 2)

On the revolved 2D grid (the 2D fitted grid's columns from a start column
face to the base, its rows, K layers across the sector), no fin, the
start plane at a 2D column face and the outer boundary the 2D fitted
shock's faces, frozen, with the 2D post-shock states (rung (a) keeps
revision 1's frozen-shock boundary because it is what the 2D solution
has; the envelope surface is tested on the finned rungs):

- **Cases:** a 3-caliber tangent ogive at Mach 2 (sharp, H grid), the 3:1
  ellipsoid at Mach 2 (blunt, C grid), the 5 deg cone at Mach 1.3 (0006's
  floor table); each with K = 1, 4 and 16, and with a non-uniform theta
  spacing.
- **The 2D reference** is the 2D CPU engine's solution on that grid,
  converged until its density residual is below 1e-13 of its first value
  and its drag changes by less than 1e-13 between checks (round-off).
- **The ghost cells:** both layers at the start plane hold the 2D
  solution's own two upstream cells (the 2D cells i - 1 and i - 2 of the
  start column), exactly, not one state in both (2.1).
- **(a0) The 2D engine's own cell-level noise.** The 2D GPU engine on the
  same three grids, against the 2D CPU reference: eps_2D, the largest cell
  difference relative to the free stream's density, pressure and sound
  speed, measured. If eps_2D exceeds 1e-5, the ladder stops for a record
  (the 2D page engine would then be noisier than 0005 measured).
- **Pass, CPU, identity of residuals:** the 3D residual of the revolved
  2D reference, before any step, within 1e-13 (relative to the 2D
  residual's scale at the start of the 2D solve) of the 2D residual times
  the angle, cell by cell. This is the sharp test, and it does not depend
  on the time step.
- **Pass, CPU, the converged state:** the 3D solve, started from the
  revolved reference and converged to round-off in the same way, has
  every cell within 1e-12 of the 2D reference (relative to the free
  stream's values) and |w| within 1e-12 of the free-stream sound speed.
  The 3D local time step differs from the 2D one (a third direction in
  its sum), so the transients differ; only converged states are compared,
  never a state after a set number of steps.
- **Pass, GPU, cell level:** the 3D GPU solve, converged by 3.8's rules,
  has every cell within eps_3D = 2 eps_2D (and at most 2e-5) of the 2D CPU
  reference, and the integrated pressure force on the body faces within
  2e-6 of the 2D CPU engine's. The measured eps_3D is eps_cell of 3.5.
- **(a')** On a fin layout (sheared columns, the tip row inserted, block
  L's lines present with zero thickness), the solution stays independent
  of theta to 1e-13 (CPU).

### 4.2 Rung (b): planar sections against exact values

The 3D engine in planar mode, the section extruded across a span bounded
by two mirror faces (two layers), the domain of 0009 section 2.4 (x / c
from -0.3 to 1.2, 1.4 chords high).

- **(b0) The order rule at ratio 1.5 (before b2).** 0005's captured
  families (the four cone surface-pressure families, the three forebody
  drag families, and the audit's seven), rerun on the 2D CPU engine at a
  ratio of 1.5 (nj = 32, 48, 72, 108), against their exact values. Pass:
  every band the procedure gives at ratio 1.5, floor included, contains
  its true error. Reported: which families get a band at ratio 1.5
  against at ratio 2. If a band misses, or the tolerance of 0.5 between
  the two triples' orders no longer separates the families as at ratio 2,
  a new rule is recorded before (b2) runs. Until (b0) passes, the claim
  that 0005's rule holds unchanged at ratio 1.5 is not made.
- **(b1) identity:** the double wedge of t/c 0.08 at Mach 1.5 on 0009's
  60 x 28 grid equals the 2D planar engine on that grid, CPU within 1e-12
  and GPU within 2 eps_2D.
- **(b2) convergence**, four-grid families at ratio 1.5 (L0 32 cells over
  the chord) and, being cheap in planar mode, to L5 (every segment's count
  on L0 a multiple of 32), each against `exactSectionDrag` (0009):

  | Case | Section                                  | Mach |
  | ---- | ---------------------------------------- | ---- |
  | b2.1 | double wedge, t/c 0.05                   | 1.5  |
  | b2.2 | double wedge, t/c 0.05                   | 2.0  |
  | b2.3 | double wedge, t/c 0.05                   | 3.0  |
  | b2.4 | double wedge, t/c 0.08                   | 1.5  |
  | b2.5 | hexagon, 30% bevels, t/c 0.05            | 2.0  |
  | b2.6 | single wedge, trailing edge 0.08 (faces) | 2.0  |
  | b2.7 | double wedge, t/c 0.03                   | 1.25 |

  (b2.7 is added for the families below Mach 1.5; its shock attaches,
  0009 section 2.1's test.) **Pass:** on every case the band from L0 to
  L3 (4.6, with the provisional floor of 1e-3) exists and contains the
  exact value. No band is a failure. The band without the floor, the
  observed orders and the L0 to L5 values are recorded whatever they are.

- **(b3) short-bevel hexagons, a pass gate (review finding 3).** 0009
  section 2.4 found the 15% hexagon at t/c 0.08, Mach 2, not asymptotic
  even at 480 x 224 (orders 1.63 then 0.67), so revision 1's
  "measurement, not a pass" left those sections served without a
  reference. Now: no section with a wave reflected onto its surface is
  served until (b3) passes. **The reference:** a planar method of
  characteristics with the leading-edge shock fitted, the extension of
  `src/validation/characteristics.ts` to planar flow that 0009 section 7
  names. It is verified before use: on the double wedge it must reproduce
  shock-expansion theory (exact there) within 1e-7 of the drag, and its
  own refinement (320 to 2560 intervals, as 0006's march) must converge
  at an observed order between 1.5 and 2.5, its extrapolation then the
  reference. **The cases:** hexagons of t/c 0.08 with 15% bevels at Mach
  2 (0009's case), t/c 0.05 with 10% and 15% bevels at Mach 1.5 and 2.0,
  and t/c 0.03 with 5% bevels at Mach 2.0 (bevels of hobby stock's
  proportions). **Pass:** for every case, the Euler family to L5 gives a
  band (L2 to L5, the floor included) that contains the characteristics
  reference. A failure leaves the reflected-wave sections refused.

### 4.3 Rung (c): fins on a plane wall (review findings 4 and 6)

The 3D engine in planar mode: a plane wall (the body) at y = 0, one fin
normal to it in the mirror plane z = 0, the envelope above (2.4), a mirror
face at z = z_max beyond the envelope. This is the configuration of
`src/fins/linear-wave-drag.ts`, the fin with its image in the wall.

- **(c-x) An exact nonlinear 3D check.** Planform D (rectangle, span
  equal to the chord), double wedge with its ridge at mid-chord, t/c 0.04,
  0.06 and 0.08, Mach 2: three families. The wall is a mirror plane, so
  wherever the tip's influence has not arrived the flow is exactly the
  planar 2D flow of the section, and for these sections shock-expansion
  theory is exact (0009 section 2.1). The tip's influence is bounded by
  the characteristic cone from the tip's leading edge, taken at the
  lowest local Mach number on the face (behind the leading-edge shock),
  which gives the widest cone; the region compared is the face below that
  cone with a margin of 3 L0 cells. **The quantity:** the face's drag
  integrated over that region. **The reference:** the exact 2D
  shock-expansion pressures integrated over the same region (computed in
  double, the region's boundary the same on every level). **Pass:** each
  family's band from L0 to L3, with the floor, exists and contains the
  exact value; no band is a failure. Reported: the largest cell-level
  pressure difference in the region on every level.
- **(c1 to c9) Thin fins against linear theory.** Planforms D and C
  (trapezoid, LE 26.6 deg, taper 0.5) at Mach 2, and F (0009's RM A53D02
  planform, LE 71.6 deg, a subsonic leading edge) at Mach 1.5; each with
  a double wedge of t/c 0.04, 0.02 and 0.01. The ratio R(t/c) = (Euler
  drag) / (linear drag), the linear drag from `linearWaveDrag` with its
  quadrature error. **Pass, each planform:** all three families give a
  band (no band is a failure); the first-order extrapolation to zero
  thickness, R* = 2 R(0.01) - R(0.02), lies within 1 plus or minus (2
  B(0.01) + B(0.02) + the quadrature error), B a family's relative band;
  and |R - 1| does not grow as t/c falls.
- **Reported, not a pass:** on D, the 3D Euler drag over the planar
  Euler drag of rung (b) at the same t/c; on a single-wedge rectangle at
  t/c 0.01, the face pressure inside the tip's Mach cone at mid-chord
  against linear theory's tip-cone law, Cp / Cp_2D = 1/2 + asin(beta (s -
  y) / x) / pi (0009 section 3.2), which looks at the slab's region.

This is 0002's gate for M10.

### 4.4 Rung (e): blunt leading edges

- **(e0) The 2D strip, planar fitted families** (the 2D engine, CPU): the
  rounded edge (a cylinder followed by the plate) and the square edge at
  normal Mach numbers 1.3, 1.5, 2.0 and 3.0, and a rounded wedge (15 deg
  half-angle, radius a tenth of the thickness) at 2.0: nine families, the
  front side's drag per unit span on L0 to L3 at ratio 1.5, and an
  offline ratio-2 family to 8 L0 (cheap in 2D) as each one's reference.
  **Pass:** each family's band exists and contains its 8 L0 reference's
  extrapolation. **Checks that set nothing:** the rounded edge's front
  side against TN 2960 figs. 5(c) and 5(e), both readings, at Mach 1.49,
  1.98 and 2.90 (measured over solved, reported; the front half of a
  cylinder and of a plate's round edge see the same inviscid flow up to
  the shoulder at a supersonic normal Mach number, 0016 section 4); the
  standoff against Billig's correlation for cylinders; the square edge
  against 0014 10.2's bounds (above the rounded edge's front side, below
  pitot pressure on the face).
- **(e1) Identity, unswept, root and span.** A rounded-edge plate,
  unswept, on a plane wall, its span ended by a second mirror face (an
  infinite edge), Mach 2: the wall and the far face are mirror planes of
  the planar edge flow, so the 3D solution, block L fitted, must be the
  (e0) solution at every row. **Pass:** CPU, every cell within 1e-11 of
  the 2D solution on the same lines; GPU, within 2 eps_cell; the fitted
  shock's position within 1e-11 (CPU) of the 2D fit's on every line. The
  same for the square edge (e1s).
- **(e2) Identity, swept.** A rounded-edge plate swept 45 deg at Mach
  2.83 (normal Mach 2.0), the grid an extrusion of the 2D grid along the
  edge, the span periodic: by the independence principle the 3D solution
  is the (e0) solution at normal Mach 2.0 with the spanwise velocity
  carried passively (HLLC carries tangential velocities with the
  contact). **Pass:** as (e1). The same for the square edge (e2s).
- **(e3) The tip.** A rounded-edge plate, unswept rectangle, square tip,
  span 25 thicknesses, on the plane wall, Mach 2. A floor family (4.7):
  its offline reference sets the floor's tip term. Reported: the edge's
  drag per span against the row's strip value, as a function of the
  distance from the tip.
- **(e4) The root junction of a swept edge.** Rounded-edge trapezoids on
  the plane wall, leading edges swept 30 and 45 deg, Mach 2.0 and 2.5
  (normal Mach 1.73 and 1.77): the 30 deg family a floor family, the 45
  deg one a test family (4.7).
- **(e5) A square edge, finite.** The (e3) geometry with a square edge at
  Mach 2.0: a test family (4.7).
- **Pass, (e3) to (e5):** each family's band exists and contains its
  offline reference's extrapolation, and the strip check of 3.8 holds.
  If any family at normal Mach 1.3 to 1.5 fails while those above pass,
  the served floor becomes 1.5 (2.7) and the failure is recorded.

### 4.5 Rung (d): twenty registered 3D families on bodies

A 3-caliber tangent ogive (served by the fitted solver) on a cylinder,
the fins' root leading edge at least 5 calibers behind the shoulder, the
fins at the base unless stated; fin dimensions in body calibers.

**Sharp sections** (revision 1's ten, unchanged; planforms of 0009 section
4 scaled to a root chord of one caliber):

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

**Hobby fins** (new). The hobby planform H: a clipped delta of root 2.2,
tip 0.9 and span 1.5 calibers (leading edge swept 41 deg), the 54 mm
rocket of 0016 section 2 in calibers; plates of thickness 0.06 caliber
(3.2 mm on 54 mm; t/c 0.027 at the root, the population's median is
0.024):

| Family | Fins                                                                                  | N   | Mach | Normal Mach | Notes                                                            |
| ------ | ------------------------------------------------------------------------------------- | --- | ---- | ----------- | ---------------------------------------------------------------- |
| h1     | H, plate, rounded leading edge, square trailing edge                                  | 3   | 2.0  | 1.51        | a test family (4.7)                                              |
| h2     | as h1                                                                                 | 3   | 3.0  | 2.26        |                                                                  |
| h3     | as h1                                                                                 | 3   | 1.75 | 1.32        | at the floor                                                     |
| h4     | H, plate, square edges                                                                | 3   | 2.0  | 1.51        | a test family (4.7)                                              |
| h5     | H, plate, both edges rounded                                                          | 3   | 2.0  | 1.51        | the domain ends at the rounding (2.8); component only            |
| h6     | H, hexagon, bevel half-angle 15 deg (bevels 5% of the root chord)                     | 3   | 2.0  | -           | a reflected wave: run only once (b3) passes                      |
| h7     | H, bevel to a sharp leading edge, square trailing edge, one root chord ahead of base  | 4   | 2.0  | -           | the fictitious plate and A3 (2.8)                                |
| h8     | rectangle, chord 1.5, span 1, plate, rounded leading edge, square trailing edge       | 4   | 1.35 | 1.35        | below Mach 1.5: a component only (amendment (f))                 |
| h9     | C, double wedge t/c 0.03                                                              | 4   | 1.25 | -           | sharp, below Mach 1.5: a component only                          |
| h10    | rectangle, chord 1, span 0.1 (a body 10 spans in radius), plate, rounded leading edge | 8   | 2.0  | 2.0         | the large-body limit: set beside (e3)'s plane-wall value, scaled |

(h10 approaches the plane wall: with the body's radius ten times the span,
its fin's drag per unit span should approach the plane-wall fin's of the
same section at the local state, by an amount of order span over radius;
the difference is reported with both bands and with that estimate, a
check, not a pass. h10's eight fins keep the sector small.)

Each family: L0 to L3 on the GPU; L0 also on the CPU (L1 too for the
reference families).

**Pass, each family:** every level passes 3.8's checks; the GPU agrees
with the CPU on L0 (and L1 where run) within the noise of 3.5; a band
exists; and for the test families (4.7) the band contains the offline
reference's extrapolation.

**Reported for each, whatever it is:** the band or the reason for none;
the observed orders; the allowances A1 to A3; the edge's and the faces'
shares; beside it the value of today's method (the product rule, 0009,
for sharp sections; 0016's edge terms for plates), which measures their
inviscid errors for the first time; the strip check's profile along the
span.

### 4.6 The cost problem, and how the band is formed

Four grids at ratio 1.5 (L0 to L3; 1 + 3.375 + 11.4 + 38.4 = 54 units of
L0's cells) against four at ratio 2 (585 units, 12.6 million cells on the
finest of revision 1's sharp layout, 3 GB): ratio 1.5 keeps 0005's
four-grid rule (two triples, orders capped at 2, agreeing within 0.5),
**subject to rung (b0)**, which tests that rule at ratio 1.5 before it is
relied on. Three grids (no band by 0005) and refining one direction at a
time (an assumption about captured oblique shocks) are rejected, as in
revision 1. The costs of ratio 1.5: the grids do not nest; the finest is
coarser than ratio 2's; the band's factor 1.25 |e21| / (1.5^p - 1) is 2.5
|e21| at p = 1 against 1.25 |e21| at ratio 2; every change used for an
order must be ten times the noise (0005).

**The band, registered:** 0005's procedure at ratio 1.5 on L0 to L3, plus
in full:

- the floor (4.7);
- **A1, the 2D data:** the change in the fin drag on L0 and L1 when the
  start plane's and the envelope's data come from the next coarser 2D
  grid; the larger change;
- **A2, the start plane:** the change on L0 and L1 when the margin to the
  leading edge (or its bow-shock vertex) is doubled; the larger change;
- **A3, the outflow:** 2.8.

**A device that cannot hold L3** gets no band. It may run L0 to L2 as a
preview, "a preview on three grids; no band", and the fins keep today's
method and labels.

### 4.7 The floor, registered (with the 3D errors)

0005's floor is measured against exact solutions for the quantity it
covers. The fin drag has three kinds of error that do not shrink with the
grid, or not visibly over four grids: the captured fin shocks' (planar),
the 3D ones at the tip, the root junction and subsonic leading edges, and
the blunt edges' (fitted, but new in 3D). Each gets a term, set on named
families, and the bands are tested on other named families.

    FIN_DRAG_FLOOR = max(1e-3,
                         2 max |extrapolated - exact| / exact over (b2) (L3 to L5) and (c-x),
                         2 max |extrapolated - exact| / exact over (e0) against its 8 L0 references,
                         2 max |page extrapolation - offline extrapolation| / value over the floor families)

- **Floor families** (offline references set the 3D term): (e3) the tip,
  (e4) at 30 deg the swept root junction, d7 the subsonic leading edge.
- **Test families** (offline references test the bands, set nothing):
  d1 (sharp, on a body), h1 (rounded plate), h4 (square plate), and (e5)
  and (e4) at 45 deg.
- **Offline references** (review finding 4): each a family at ratio 2 of
  four grids from L0 to 8 L0, the same mapping as the page's, run once on
  hardware that holds the finest grid, extrapolated by 0005's procedure.
  Its finest grid is 2.4 times finer in each direction than the page's
  L3. Where the device cannot hold 8 L0, the finest it holds is used if
  it is at least 6 L0 (1.8 times L3), and the record says which; below
  that there is no reference, and the class that family belongs to is not
  served. Estimated memory at 8 L0: about 3 GB on revision 1's sharp
  layout (12.6 million cells), about 5 GB with the clustering 2.4 needs
  (20 million), about 13 GB for the hobby layout (51 million cells) and 4
  to 8 GB for the plane-wall families (estimates, section 7). So h1 and h4's references are taken at 6 L0 (about 22
  million cells, 5.4 GB) unless the device holds more.

Rung (c)'s thin-limit ratios set nothing (their reference, the thin
limit, is itself an extrapolation); the strip check sets nothing.

### 4.8 Where the ladder runs

Section 5.

### 4.9 Kill criteria, registered

Stage A, or the class named, is not served, today's methods stay, and a
new record decides what follows, if:

- rung (a), (a0), (a') or (b1) fails: all of Stage A;
- (b0) fails and no new rule is recorded: all of Stage A;
- any (b2) case gives no band, or its band misses the exact value: all of
  Stage A;
- (b3) fails: the reflected-wave sections (h6 is not run);
- (c-x) or any thin-limit planform of rung (c) fails (no band included):
  all of Stage A;
- (e1), (e1s), (e2) or (e2s) fails: the blunt edges (rounded and square);
- an (e0) or (e3) to (e5) family fails at normal Mach 1.5 or above: the
  edge class it belongs to;
- a solved square edge lies outside 0014 10.2's bounds: square edges;
- in rung (d), fewer than 7 of the 10 sharp families give a band, or any
  test family's band misses its offline reference: sharp sections; fewer
  than two thirds of the hobby families run (h6 only after b3) give a
  band, or h1's or h4's band misses its reference: the class of the family that
  failed (h1: rounded edges; h4: square edges; others: their own class);
- the noise of 3.5 exceeds 1e-4 of the fin drag even in two-float: all.

## 5. Compute: what runs where, and the owner's one command

### 5.1 The problem

This container has no hardware GPU (0013): GPU code runs on SwiftShader,
at an estimated 1e4 to 5e4 cell-steps a second for the 3D step, and the
CPU engine at about 5e-6 s a cell-step on one unloaded core (estimated
from 0013's 2.7e-6 for the 2D explicit step). A page family on the hobby
layout at L3 is about 4e10 cell-steps (3.9 million cells, about 10,000
steps, estimates): about 2.3 days on one core, weeks on SwiftShader. The
ladder has about 36 GPU families and 8 offline references. On four shared
cores that is months. So the ladder is split.

### 5.2 On this container's CPU (niced, one process at a time)

| Work                                                      | Sizes (estimate)                                              | Time on one core (estimate) |
| --------------------------------------------------------- | ------------------------------------------------------------- | --------------------------- |
| 4.0 code checks                                           | grids of 10^3 to 10^4 cells                                   | under an hour               |
| (a0), (a), (a'): nine cases and three eps_2D measurements | revolved 2D grids, up to 16 layers, about 2.5e4 cells         | 6 to 10 hours               |
| (b0): 14 captured 2D families at ratio 1.5                | nj 32 to 108                                                  | about 28 hours              |
| (b1), (b2): seven families to L5                          | planar, two layers, up to about 8e4 cells                     | about 15 hours              |
| (b3): five hexagons to L5, and the planar MOC             | as (b2); the MOC to 2560 intervals                            | about 12 hours              |
| (e0): nine 2D strip families and their 8 L0 references    | 2D fitted, up to 8 L0 in 2D                                   | about 6 hours               |
| (e1), (e2), square versions: identities                   | planar 3D, a few rows of span, 2e4 to 5e4 cells, to round-off | about 8 hours               |
| L0 of every GPU family (about 36), CPU against GPU        | 3e4 to 1e5 cells, about 3,000 steps                           | about 18 hours              |
| L1 of the eight reference families                        | 1e5 to 3.4e5 cells                                            | about 18 hours              |
| The spike (2.11)                                          | grid generation only                                          | minutes                     |

About 110 core-hours: about a week of one niced core on the shared
machine, run in pieces that each commit their results (the container
restarts every few hours). SwiftShader runs only the GPU code checks
(4.0) and the GPU sides of (a0), (a), (b1) and (e1) on their small grids.

### 5.3 On a hardware GPU: the owner's one command

Rungs (c), (d), (e3) to (e5) at L0 to L3, and the eight offline references,
run on the owner's GPU (or any machine the owner chooses), in one
command:

    npm run ladder:3d

**What it does** (`scripts/ladder-3d.mjs`, with the runner in
`src/solver3d/ladder/`, both written with the solver):

1. Launches the installed Chrome (Playwright's `chrome` channel, headed,
   so that the operating system's GPU is used; the GPU tests' SwiftShader
   flags are not passed) on a page served by Vite, `demos/ladder-3d.html`.
2. Requests the high-performance adapter and records the device:
   `adapter.info` (vendor, architecture, device, description), the
   adapter's limits, `isFallbackAdapter`, the browser's version and the
   operating system. If the adapter is a fallback or software adapter
   (SwiftShader, WARP, llvmpipe), it stops and says so: those results
   would take weeks and are not wanted.
3. Reads the registered manifest, `docs/research/solver3d/ladder-manifest.json`
   (every case of section 4 that needs a GPU: its geometry, Mach number,
   levels, and for references the finest level), committed with this
   record's code before any run, and its SHA-256.
4. Runs a calibration (L0 of d1, about a minute, estimated), prints the
   measured cell-steps a second and the estimated time for the whole
   manifest and for the references, and asks before going on (`--yes`
   skips the question).
5. Runs the cases, smallest first, the references last. After every
   level it appends one JSON line to the results file and saves a
   checkpoint, so that an interrupted run resumes at the next unfinished
   level (`npm run ladder:3d -- --resume`). A level that fails a check is
   recorded with its reason and the family stops; the run goes on to the
   next family.
6. Writes `docs/research/solver3d/results/ladder-<date>-<device>.jsonl`:
   a header line (the device record, the commit hash, the manifest's
   SHA-256, the start time), then one line a level (case, level, cells,
   steps, the fin drag and its split, the noise, every check of 3.8 with
   its value, the wall pressures' summary, the time taken), and a footer
   (the end time, the cases not run and why).

**The page alternative.** On Windows and macOS, where a headed Playwright
Chrome may not get the GPU, the owner opens `demos/ladder-3d.html` in
their own Chrome (served by `npm run dev`, or on the live site), presses
"Run the 3D ladder", and gets the same file as a download. The page and
the script share the runner.

**It decides nothing.** The results file is committed (by the owner, or
sent to the coordinator to commit) and judged by a separate CPU script,
`npm run ladder:3d:judge`, which applies section 4's criteria as written
in code committed before the run, compares the GPU's L0 and L1 with the
CPU values committed from 5.2, and writes the verdict file beside the
results. A results file whose manifest hash is not the committed
manifest's is not judged.

**How long** (estimates; nothing is measured): on a mid-range GPU (150 to
300 GB/s, 0013's assumption), about 1.2e8 to 2.5e8 cell-steps a second
for the 3D step: the page families about 3 to 7 minutes each, about 2 to
4 hours for the 36; the references about 1 to 2 hours each at 6 to 8 L0,
8 to 16 hours for the eight. About a night and a day, in all. **Memory:** the page
families need about 1 GB at L3 on the hobby layout in 32 bits; the
references 3 to 10 GB, so a GPU of at least 8 GB is needed for them to be
taken at 6 L0 or finer (4.7). The adapter's buffer limits are checked
before each family, which is refused if they do not allow it.

### 5.4 What is served before the GPU rungs are judged

**Nothing.** The page keeps today's fin methods (0009, 0016) and their
labels; the 3D view keeps "The axisymmetric solution, revolved; fins are
not in the airflow". No 3D value is shown, even as a preview, until the
ladder's verdict is committed and the coordinator has merged it after an
independent review.

## 6. What it replaces, the total, and what it gains

### 6.1 Replaces and does not

| Term (0010 section 3)                           | With Stage A                                                                                                          |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Fin wave drag (sharp sections, bevels)          | **replaced** where Stage A serves: the faces' share of 3.9's sum, with its numerical band                             |
| Fin leading-edge term (rounded plates, 0016 W4) | **replaced** where Stage A serves (normal Mach 1.3 and above): the edge's share of 3.9's sum, with its numerical band |
| Square leading edge (refused today, 0016 W11)   | **solved** (the edge's share); in a total only by the owner's decision (section 10)                                   |
| Nose wave drag                                  | unchanged (0006)                                                                                                      |
| Body and fin friction                           | unchanged (0007, 0010)                                                                                                |
| Fin trailing-edge base (square edges)           | unchanged (0010 section 5.1, 0016 W3)                                                                                 |
| Rounded trailing edges                          | unchanged: refused in a total (0016 W11)                                                                              |
| Body base, fins-on-base factor                  | unchanged (0010, 0015): the base is outside the domain                                                                |

Where Stage A refuses a case, the device cannot hold L3, or the ladder has
not passed, the fins keep today's methods and labels. A Mach number of the
curve gets the 3D value only if it has its own 3D family: values are never
interpolated between solved Mach numbers.

### 6.2 The model-form bands

- **Sharp sections:** the fins' own-drag band (measured over modelled,
  1.01 to 1.59; 0008 section 4.3), formed on the ARCAS increments (TN
  D-4014) at Mach 1.5 to 2.96, stays and is formed again with Stage A's
  nominal by 0008 section 4.3's arithmetic (the ARCAS fins solved on a
  cylinder behind a sharp tangent ogive of the ARCAS nose's length, as
  revision 1 set out). Band-setting from data already used for it; it
  tests nothing. Amendment (f) stands: below Mach 1.5 it bounds nothing,
  and Stage A's values there are a component only.
- **Rounded leading edges:** today's band on the term (TN 2960 fig. 5(c),
  both readings, 0.99 to 1.06, with 0016's sweep allowance) is formed on
  modified Newtonian theory, not on an Euler solution. It is formed again
  on the Euler strip (e0): measured (TN 2960 figs. 5(c) and 5(e), both
  readings, at their Mach numbers) over solved (the rounded strip at the
  same normal Mach number), its envelope rounded outward, times 0016's
  sweep allowance for swept edges as now. Band-setting from figures 10.1
  already names (TN 2960 figs. 5(a) to 5(e)); it tests nothing. It covers
  what a cylinder in a tunnel shares with a fin's edge (its boundary layer
  at the stagnation line, the measured Reynolds numbers); it does not
  cover the root's boundary layer or the real tip (6.5). 0016's Reynolds
  domain for the term is kept.
- **Square leading edges:** no band-setting measurement exists in the
  sources 10.1 names. RM A53D02 fig. 17 (a square-edge increment, read
  once, not blind) may check, not set. So a square edge has a numerical
  band and no model-form band: it is "solved, inviscid, unvalidated" and
  enters a total only if the owner decides that is acceptable (section 10,
  question 3), labelled so. The alternative is to name a flat-faced
  edge's measurement in 10.7 before it is read, and form its band.

### 6.3 Labels (proposed)

- The component, sharp: "Fin wave drag: solved, 3D inviscid flow around N
  fins and the body at zero incidence; numerical band from four grids".
- The component, a rounded plate: "Fins' leading edges solved: 3D
  inviscid flow, bow shock fitted, zero incidence; numerical band from
  four grids, and the edge band of TN 2960. Not included: the body's
  boundary layer at the fin root."
- A square edge adds "edges taken as perfectly square; no measurement of
  a square fin edge checks it".
- Rounded trailing edges: "the fins' other terms solved; the rounded
  trailing edge is refused in a total (bounded, not measured)".
- The total, where it uses Stage A: "an estimate, not validated: fins
  solved, inviscid; friction and base estimated". (Friction is named
  because it is 40% to 60% of a typical total, 0002 section 1, and is a
  correlation.)
- Inside the Basic Finner's class and its validated sub-class (0014 10.7
  (q)): the tested product rule is served, with today's labels (0014
  10.3; 0008 section 6.1). The 3D value may be shown in the details as
  "fins solved: a different model from the one tested", with no residual
  against any BRL or DREV value.

### 6.4 What Stage A gains for hobby rockets now

Measured on the refusal population (2000 rockets, one condition in each
Mach band; `docs/research/refusals/stage-a-scope.test.ts`, output
`out/stage-a-scope.out`), with Stage A's scope rules of sections 1 and
2.7 and the blunt-edge floor at normal Mach 1.3. These are upper bounds:
the grid gates, the envelope check, families without a band and device
memory are not modelled.

| Share of cases                                      | All bands | M 1.0 to 1.2 | 1.2 to 1.5 | 1.5 to 1.8 | 1.8 to 3.0 |
| --------------------------------------------------- | --------- | ------------ | ---------- | ---------- | ---------- |
| Fins solved, before (b3) passes                     | 5.3%      | 0%           | 2.8%       | 6.5%       | 12.0%      |
| Fins solved, once (b3) passes                       | 8.3%      | 0%           | 3.7%       | 11.8%      | 17.8%      |
| of which plates with rounded or square edges        | 3.3%      | 0%           | 0.4%       | 3.7%       | 9.2%       |
| Totals today                                        | 1.9%      | 0%           | 0%         | 2.5%       | 5.2%       |
| Totals with Stage A ((b3) passed), square edges out | 2.3%      | 0%           | 0%         | 3.0%       | 6.1%       |
| Totals with Stage A ((b3) passed), square edges in  | 2.6%      | 0%           | 0%         | 3.1%       | 7.5%       |

With the floor at 1.5 instead, fins are solved in 4.2% (7.2% after b3),
plates in 2.2%, and totals are the same to 0.2%. What blocks Stage A, as a
share of all cases (several can apply): the nose is not served (Haack and
power-series noses, blunted tips; 56.6%), a blunt edge's normal Mach
number below 1.3 (42.0%), Mach below 1.2 (25.0%), a sharp section's
detached shock (16.2%), a boat-tail (15.8%), a reflected wave until (b3)
(14.7%).

Said plainly:

- Flat plates with rounded or square edges are 59% of the population;
  Stage A solves them in 3.3% of all cases, 15% of the plates at Mach 1.8
  to 3.0 and almost none below Mach 1.5. Most hobby edges run at a normal
  Mach number below 1.3 (swept edges, 0014 section 5.3), and most hobby
  noses are not yet served.
- For a rounded plate, Stage A's value is expected to differ from 0016's
  edge term by a few percent (aerodynamic reasoning: the same front-side
  physics, plus the ends, the body's flow and the neighbours, which 0016
  leaves out); it measures those, and it is not expected to narrow the
  edge's band below TN 2960's.
- Its largest gains in totals are the square edges, if the owner allows
  them into totals (0.76% of cases had the square edge as their only
  blocker, 0014's audit), and the short-bevel hexagons once (b3) passes.
- It does not narrow the total's band much: the fins' own-drag band and
  the base band dominate, and Stage A measures neither (revision 1's
  finding, unchanged).
- For most users its visible gain is the 3D view of their own fins in the
  airflow where the case is served, and the measured error of the
  product rule and of 0016's edge terms.

### 6.5 What stays estimated, or unmodelled

- Friction (0007), the fin trailing-edge base (0010 section 5.1, 0016
  W3), the body base and the fins-on-base factor (0010, 0015): estimated
  on component data, as now.
- The body's boundary layer where the fin root meets it: on hobby rockets
  it is about as thick as the fin or thicker at the fins (aerodynamic
  reasoning), so it slows the flow the edge's lowest part meets and
  separates ahead of the root. Euler leaves it out; no source in the
  repository measures it; the label names it. It is the largest physical
  effect on the edge drag that Stage A leaves out, and its sign (lower
  drag over the layer's height, higher where the separation's shock
  meets the edge) is not known here.
- Real edge shapes: a cut edge is not perfectly square, a sanded round is
  not a perfect half-circle, a bevel ends in a land. Labels say what was
  taken.
- The tip's captured shock piece (2.5): measured by (e3), within the band.

### 6.6 Which held-back tests Stage A can face (review finding 5)

The rules (0014 10.1 to 10.7): each held-back set's ranges are fixed
(10.5); each range is run once, when the methods its cases need are
committed, never again, and never delayed or redrawn (10.1 rule 3, 10.5);
its result is recorded whatever it is; a figure sets nothing until a
dated 10.7 entry names it. Revision 1 refused the PARD body's fins
(flat plates, rounded leading edges, square trailing edges) and the
Eglin set's (flat plates of t/c 0.025); with plates in scope:

- **The PARD standard body, range A (Mach 1.2 and above, data to 2.1).**
  Its fins are rounded-edge plates swept 45 deg (0019 section 4), leading
  edge radius 0.045 in (TN 3372), at the base. Their normal Mach number is
  M cos 45 deg: below 1.3 below Mach 1.84. So Stage A could face only the
  range's points at Mach 1.84 to 2.1, and only if: the body's nose is
  served (10.5: solved from its coordinate table, or refused); the body
  under the fins is a cylinder, decided from the registered geometry (RM
  L52E06 fig. 1 and table I, TN 3697 figs. 1 and 2) without any drag
  value; and Stage A and its band are committed before the range is run.
  With the floor at 1.5 it can face none of it (Mach 2.12 and above).
  Its fin-drag increments (RM L52E06 figs. 9 to 12) stay held back.
- **The Eglin "4-Fin Circular" set, range A (shots at 2.25 to 2.34).**
  Flat plates of t/c 0.025 at the base, four fins. Their edges and sweep
  are not drawn in its fig. 4; 10.5 requires them decided from evidence
  without its drag and registered before the run. If that evidence makes
  them rounded or square with M cos(sweep) of at least 1.3 (any sweep up
  to 54 deg at Mach 2.25), and the nose is served and Stage A committed
  before the run, Stage A can face it. If the edges cannot be decided, it
  cannot.
- **Eglin range B (1.42 to 1.47):** below Mach 1.5 no total serves a fin
  term (amendment (f)): none. **Range C (above 3.0):** outside Stage A:
  none.
- **BRL Report 934:** range A was run once (0020) and cannot be run
  again; range B (Mach 1.2 to 1.5) only once amendment (f) is lifted, and
  inside the Basic Finner's class the product rule is kept anyway;
  range C lies below Mach 1.2: none.
- **TN 3320 (the RM-10):** its fins sit on a boat-tailed body, outside
  Stage A: none.

**Where none, plainly:** Stage A has no held-back test unless the PARD
body's range A or the Eglin set's range A is run after Stage A is
committed. Both wait today only for W1 to W4 (10.5), so on the present
order they may well run first, and then Stage A will never have a
held-back test from them. Whether to amend 10.5 now, before either is
run, so that those two ranges wait for Stage A, is the owner's decision
(section 10, question 4). Revision 1's (u) text said "a range is not
delayed for Stage A"; that stays the default until the owner decides.

**ARCAS and RM A53D02 cannot be tests** (revision 1's finding, unchanged):
TN D-4014's increments set the fins' own-drag band and are used again in
6.2; TN D-4013 is read, the same models, and at Mach 1.2 refused by (f);
RM A53D02 is read and records no finless body. Each may be reported as a
check that sets nothing. A further fins-on minus fins-off free-flight
increment at Mach 1.5 to 3 on a cylindrical afterbody, with plate fins,
would be a test if named in 10.7 before it is opened; none is named here.

### 6.7 Proposed 0014 10.7 entry (u), for the coordinator

Not written into 0014; the coordinator decides, and dates it.

> **(u): Stage A of the 3D fin solve (0021, revision 2), registered
> before any 3D number exists.**
>
> - _The ladder._ 0021 section 4's cases and pass criteria (4.0 to 4.5),
>   its band procedure (4.6: four grids at ratio 1.5 subject to rung
>   (b0), allowances A1 to A3 in full), its floor and its floor and test
>   families (4.7), its kill criteria (4.9) and its manifest of GPU cases
>   (5.3) are fixed as written at the commit that adds this entry. "No
>   band" is a failure where 0021 says so. None changes after a rung's
>   numbers are seen; a failure is recorded and a new record decides.
> - _The noise and the precision._ 0021 section 3.5.
> - _The model-form bands._ The fins' own-drag band is formed again with
>   Stage A's nominal on the same ARCAS increments (0021 6.2); the
>   rounded edge's band is formed again on the Euler strip from TN 2960
>   figs. 5(c) and 5(e), both readings (0021 6.2). Band-setting, not
>   tests. Amendment (f) is unchanged. Square edges have no model-form
>   band; whether they enter totals is the owner's decision, recorded
>   here when made.
> - _The Basic Finner._ Inside the class and the validated sub-class of
>   (q) the product rule is served (10.3). BRL Report 934's range A is
>   not run again, and no record computes the 3D fin model at its rounds
>   for comparison with their drag.
> - _The tests._ When the PARD body's range A or the Eglin set's range A
>   is run, and Stage A with its band is committed by then, the run
>   reports the total with today's fin methods and with the fins solved,
>   each with its verdict by rule 4, at the points where Stage A serves
>   (0021 6.6). If Stage A is not committed by then, the range runs as
>   registered and Stage A has no hold-out from it. [The owner's decision
>   on delaying these two ranges for Stage A, if made, replaces this
>   sentence.]
> - _Not tests._ ARCAS (TN D-4014: band-setting; TN D-4013: read, the
>   same models), RM A53D02 (read; no finless body recorded) and RM
>   A53D02 fig. 17 for square edges (read once, not blind) set nothing
>   for Stage A and test nothing; each may be reported as a check.
> - _Labels._ As 0021 section 6.3.

## 7. Memory and time

**Bytes a cell:** about 250 in 32 bits, 500 in two-float (3.10), plus
about 10% for block L's line data.

**Peak memory of a family** (the level being solved plus the previous
level's state), estimates:

| Family                                 | Finest cells     | 32 bits   | Two-float  |
| -------------------------------------- | ---------------- | --------- | ---------- |
| Sharp layout, L0 to L3 (the page)      | 1.5 million      | 0.4 GB    | 0.8 GB     |
| Hobby layout, L0 to L3 (the page)      | 3.9 million      | 1.0 GB    | 2.0 GB     |
| Sharp layout, 8 L0 (offline reference) | 20 million       | 5 GB      | 10 GB      |
| Hobby layout, 6 L0 (offline reference) | 22 million       | 5.4 GB    | 11 GB      |
| Plane-wall fin, 8 L0 (offline)         | 15 to 31 million | 4 to 8 GB | 8 to 16 GB |

(Revision 1's sharp layout without the clustering at the fin had 12.6
million cells at 8 L0, 3.1 GB; the clustering that 2.4's gates need
raises it, by the estimate above.)

**What fits.** The browser does not report a GPU's memory; WebGPU reports
its buffer limits. Allowing half the device's memory to one tab (an
assumption): a 2 GB GPU holds about 4 million cells in 32 bits, a 4 GB
GPU about 8 million. The page's hobby family fits a 2 GB GPU only just,
and a 4 GB GPU in both precisions. The references need 8 GB or more.

**Time per Mach number on the page** (estimates): steps assumed 3,000 on
L0, times 1.5 a level; block L's fitting may need more (0006's fitted
families converged in a similar number of steps to the captured ones,
which is the assumption). On the hobby layout: about 4e10 cell-steps for
L0 to L3, 80% on L3; on a mid-range GPU, **3 to 7 minutes a Mach number**
(two-float 2 to 3 times that); a curve of ten Mach numbers 30 to 70
minutes. On SwiftShader, weeks: not offered. The page measures its own
device's rate on L0 and corrects the estimate before L1; a run longer
than 30 minutes asks first.

**What the page says before a run** (proposed):

> Fins in the airflow: this solves the flow around your N fins in 3D, on
> four grids of about C0 to C3 cells, about G GB of GPU memory.
> Estimated time on this GPU: about M minutes for each Mach number
> (measured on this device: R million cell updates a second). It solves
> the inviscid flow only: friction and the base are still estimated.
> [Run] [Use the section methods instead]

And where it cannot: "This GPU's limits hold at most L2; a band needs the
fourth grid. The fins use the section methods, as before. You may run
three grids as a preview, without a band." and "Software rendering (no
hardware GPU) would take weeks for each Mach number. The fins use the
section methods."

## 8. The 3D view

What Stage A lets the view draw, where a Mach number has a 3D family with
a band (0017 section 6.2's rules otherwise unchanged):

- **The solved field, mirrored and rotated to the full circle,** between
  the start plane and the outflow plane; ahead of the start plane and
  outside the envelope, the 2D solution revolved, which is what the 3D
  solve would give there.
- **The fins' shocks**, from the computed field, as captured (smeared over
  two or three cells), and a blunt edge's bow shock as the fitted surface
  it is; never sharpened beyond what was computed.
- **Fin-body interference:** the body between the fins coloured by its
  computed pressure; the fins' faces and edges by theirs.
- **Streamlines and particles** from the 3D velocity.

Not to be drawn as computed: anything behind the base; the region behind a
blunt trailing edge ahead of the base (the fictitious plate, 2.8), and the
buffer of A3; boundary layers, separation, and tip or corner vortices.
Where a square edge's faces meet its corners, the view marks the corner
band (a few thicknesses behind each corner): "inviscid here: the real flow
separates at the corner and reattaches". The iterations are not physical
time and are not animated as such.

**The legend's honesty line**, where the field is 3D:

> Fins solved in the airflow: inviscid, zero incidence. No boundary
> layer; the friction and the base are estimated; behind the base not
> simulated.

Where the fins use the section methods, the present line stays. A preview
adds: "a preview grid, not a result".

## 9. Risks, and the fallback

The fallback is the same for each: today's methods (0009, 0016) stay,
with their labels, wherever Stage A does not serve; a failure is recorded.

1. **Captured fin shocks may not converge at a steady order** (0005: one
   cone family in seven got a band with the shock captured; 0009 2.4's
   double wedge at order 1.25). With "no band" a failure for (b2) and (c),
   one stubborn family stops Stage A. What would follow: aligning or
   fitting the fin's attached shocks, in a Stage B.
2. **The 3D fitted surface is new.** Its free tip edge and its root edge
   on a curved wall have no precedent in the repository. Rungs (e1) and
   (e2) test it where the answer is exact; the tip and the root are
   tested only against offline references. If (e1) or (e2) fail, the
   blunt edges are not served.
3. **The captured shock piece above the tip** (2.5) is the one
   near-normal captured shock left. If (e3) gives no band, the blunt edges
   at that normal Mach number are not served.
4. **The grid.** The spike (2.11) may find that block L's vertex, the
   square corner's fan or the slab's front end fail the gates; the layout
   is revised before any solve.
5. **A formulation error** shows as a failure of rung (a). Stop and find
   it.
6. **Cost and memory.** Unmeasured. The hobby layout's L3 needs about 1
   GB; a 2 GB GPU only just holds it. The references need a GPU of 8 GB or
   more; without one, the reference families' classes are not served.
7. **The owner's GPU run** is a single point of failure for every rung
   above (b) and (e2). If no hardware GPU run happens, nothing is served.
8. **The 32-bit noise** may exceed the threshold; two-float then doubles
   memory and roughly the time.
9. **The model-form gap does not close.** The body's boundary layer at
   the root, real edge shapes and the shock-boundary-layer interaction
   are unmeasured; the bands of 6.2 carry what their sources share with
   the fins, no more.
10. **Coverage.** Most hobby rockets are blocked by the nose solve or by
    normal Mach numbers below 1.3 before the fins matter (6.4).

## 10. Open questions for the owner

1. **Your GPU.** Can you run `npm run ladder:3d` (or the page) on a
   machine with a hardware GPU, overnight, and commit or send the results
   file? How much memory does its GPU have? The references need about 8 GB
   or more (5.3, 4.7); with less, the classes whose reference cannot be
   run are not served.
2. **The floor for blunt edges.** Normal Mach 1.3 is proposed (rung (e)
   decides between 1.3 and 1.5). Between 1.0 and the floor, 0016's
   measured terms stay for rounded edges; square edges stay refused there.
   Accept?
3. **Square leading edges in totals.** They can be solved, with a
   numerical band, but no measurement of a square fin edge exists among
   the band-setting sources. Allow them into totals labelled "solved,
   inviscid, unvalidated" (totals 2.3% to 2.6% of cases), or keep them as
   a component until a flat-faced edge measurement is named in 10.7, read
   twice, and sets their band?
4. **Held-back tests.** Stage A has no held-back test unless the PARD
   body's range A (its points at Mach 1.84 to 2.1) or the Eglin set's
   range A runs after Stage A is committed. Amend 0014 10.5 now, before
   either is run, so that they wait for Stage A? Or run them when W1 to
   W4 are ready, as registered, and accept that Stage A may have no
   held-back test?
5. **The label.** "fins solved, inviscid; friction and base estimated"
   (6.3), against the advisor's "fins solved, inviscid; base estimated".
6. **The Basic Finner.** The product rule stays inside its class and
   sub-class (6.3). Should the page show the 3D value there at all, even
   in the details?
7. **Registration.** The proposed 10.7 (u) (6.7).

## 11. Sources

No new source was read for this record. Named only, not opened:

- F. S. Billig's standoff correlation (1967), for cylinders as 0004 uses
  it for spheres: a check of (e0), sets nothing;
- a published inviscid 3D solution of a finned body of revolution at zero
  incidence, and slender-body and linear theories of zero-lift fin-body
  interference: checks, to be registered if used;
- a measurement of a flat-faced (square) edge's front-face pressure in
  supersonic flow: to be found and named in 10.7 before it is opened, if
  the owner chooses that route for square edges (10, question 3);
- a fins-on minus fins-off free-flight increment at Mach 1.5 to 3 on a
  cylindrical afterbody, with plate fins: to be found and registered
  before it is opened.

## 12. Revision history

### Revision 1, 2026-10-23 (commit 9415d8d)

The first proposal, written for an independent review before any code.
Its full text is kept in the repository's history:
`git show 9415d8d:docs/design/0021-3d-euler-fins.md`. Its scope was sharp
symmetric sections only.

### Revision 2, 2026-10-23 (this text)

**Why.** The owner decided that Stage A must cover hobby fins first, flat
plates with rounded, square or bevelled edges, before anything is built;
and the independent review of revision 1 found six blocking issues and
several smaller ones. Each change below quotes what revision 1 said.

**Scope (the owner's decision).**

- Revision 1, section 2.6: "Rounded or square-cut leading edges (flat
  plates included): refused. The same reason: each puts a detached,
  captured shock on the edge's stagnation line." Also: "Flat plates:
  refused. Their faces carry no axial force ... Stage A would add nothing
  to them", and: "the common hobby fin, a flat plate with a rounded or
  square edge, gets nothing from Stage A." **Now:** rounded and square
  edges are served from normal Mach 1.3, the stagnation line inside block
  L with its bow shock fitted in 3D (2.5, 3.4, 2.7); flat plates are
  served, their edge drag being what Stage A adds.
- Revision 1: "Rounded trailing edges: refused". **Now:** the fin's other
  terms are solved, the domain ending at the rounding; the rounding's
  drag stays refused in a total (2.8).
- Revision 1, 2.7: "A blunt trailing edge ahead of the base is refused".
  **Now:** served, with the fin continued as a fictitious plate to the
  base, its drag summed only to the trailing edge (2.8).

**The six blocking findings.**

1. _The slab failed the record's own gates_ (aspect ratios about 60 to
   120 against 13; neighbour ratios 2 to 3 against 1.3; the main block's
   first theta cell about 8 times the slab's). Revision 1: "The outer
   boundary is the 2D fitted bow shock, frozen", and the slab ran "from
   the tip row to the outer boundary". **Now:** the outer boundary is the
   envelope surface just outside the fins' domain of influence, where the
   undisturbed 2D field is imposed (exact in supersonic flow, checked
   after every solve); the slab runs only to it; the main block is
   clustered at the fin so its first cell is within 1.3 of the slab's;
   the remaining exemption (the zero-height ends of a sharp tip's slab)
   and its cost on rung (c) are stated (2.4).
2. _Rung (a) identity._ Revision 1: "after 2,000 steps every cell's state
   within 1e-12 ... Pass, GPU (32 bits): the same within 2e-6, the 2D
   engine's noise". The 2D kernel's FACE_STATES puts one state in both
   ghost layers; the 2D reference was not required converged to
   round-off; the 3D local time step differs from the 2D one; and 2e-6
   is a drag-level figure, not a cell-level one. **Now:** both ghost
   layers hold the 2D solution's own two upstream cells; the 2D reference
   is converged to round-off; identity is demanded of the residual of the
   revolved state and of converged states only; the GPU criterion is
   cell-level, twice the 2D engine's own cell-level noise measured first
   by (a0), at most 2e-5 (4.1). Production solves take two interpolated
   ghost layers (2.1).
3. _Hexagons with short bevels served without a reference._ Revision 1,
   (b3): "a measurement, not a pass", and section 5.3: "it serves
   hexagonal sections with short bevels, which 0009 refuses". **Now:**
   (b3) is a pass gate against a planar characteristics solution with the
   leading-edge shock fitted, on five cases; until it passes those
   sections stay refused and h6 is not run (4.2).
4. _Rung (d) had no independent reference._ Revision 1: "where an offline
   finer family of the same mapping exists ... on hardware that can hold
   them". **Now:** offline ratio-2 references to 8 L0 (at least 6 L0) are
   required on eight named families, three of them setting the floor's
   3D term and five testing bands (4.7); and rung (c) gains
   an exact nonlinear 3D check, the rectangle on a mirror-plane wall
   outside the tip's influence against shock-expansion theory (c-x,
   4.3).
5. _Registered tests._ Revision 1, 5.4, decided its tests while refusing
   the PARD and Eglin fins. **Now:** section 6.6 says which held-back
   ranges Stage A can face with plates in scope (at most PARD range A at
   Mach 1.84 to 2.1, and Eglin range A if its edges are decided and
   qualify), under which rules, and plainly that there is none unless
   those ranges run after Stage A is committed; the (u) text is revised
   (6.7) and the owner is asked (10, question 4).
6. _"No band" must be a failure._ Revision 1 required a band to contain
   the exact value but did not say that no band fails. **Now:** no band is
   a failure for (b2), (c) and the exact cases of (e) (4 preamble, 4.9).

**The smaller items.**

- Free-stream preservation: the r-weighted face vectors are now exact
  integrals of r times the normal (3.1), which revision 1's "discrete
  volume defined as the sum over the cell's faces" needed but did not
  state.
- Ratio 1.5: revision 1 said the four-grid rule holds "unchanged" at
  ratio 1.5; (b0) now reruns 0005's captured families at ratio 1.5
  before that is claimed (4.2).
- The outflow: allowance A3, with a buffer past the base (2.8).
- The floor now includes the 3D tip, root-junction and
  subsonic-leading-edge errors, on named floor families (4.7); revision
  1's floor was planar only.
- Families below Mach 1.5 (h8, h9, b2.7), since Mach 1.2 to 1.5 is served
  as a component.
- A large-body-radius family approaching the plane wall (h10).
- A mass-balance check over the boundaries and the interfaces (3.8).
- Compute: revision 1 left "rungs (c) and (d) need either a hardware GPU
  ... or the owner's agreement to weeks of CPU lanes" as an open
  question; section 5 now splits the ladder between this container's CPU
  and one command on the owner's GPU, and states that nothing is served
  before the GPU results are judged.
- The cost estimates rose: the hobby layout and the clustering at the
  fin raise the page family to about 3.9 million cells at L3 and 3 to 7
  minutes a Mach number (estimates), from revision 1's 0.94 million and 1
  to 3 minutes (7).
