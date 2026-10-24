# W6 probe: do the C grids take tangent sphere caps?

A one-day probe for W6 (blunted nose tips, 0014 section 6), the tangent
caps only, as the advisor's coverage item 2 asks
(`claude/wip/handoff:advice/fable-2026-10-22.md`, section 1). Nothing here
is served and nothing here sets a band. The plan below was written and
committed before any case was run.

## The question

Does the C grid take a 5-caliber tangent ogive with a sphere cap of
r_n / R = 0.03 to 0.15 (0014 section 3: rounded tips in half the
population, r_n / R 0.03 to 0.15) at Mach 1.3, 2.0 and 3.0, on nj = 20, 40
and 80, passing its gates, with fits that converge and families that
converge at an order the procedure of 0005 would accept?

A 0.05 R cap on a 10 R nose is two length scales, the problem the
two-scale C grid of W5 (`claude/wip/haack-merge`, 0004 and 0006 there)
solved for Haack tips: the generator's lines average the body normal over
a window a quarter of the distance to the outer boundary, which on main
is placed at the body scale. 0006 ("Ellipsoids at low Mach numbers")
measured the same failure on a 6-caliber ellipsoid at Mach 1.2: the
window eight times the tip's radius of curvature, wall cells at 49.6 deg
against the gate's 50.

## Geometry

`cap.patch` (applied to `src/geometry/nose.ts` of each tree run, not to
this branch's code): an optional `tipRadius` on a sharp nose, a sphere of
that radius centred on the axis and tangent to the profile. The capped
nose keeps the length asked (5 calibers overall); the profile behind the
cap is the sharp tangent ogive of length 5 calibers plus the offset,
shifted forward by it (`cappedNose`). The slope is continuous at the
tangent point, the curvature jumps from 1 / r_n to the ogive's. The tip
is blunt (`noseTipSlope` Infinity), so the C grid is chosen. Cylinder: 2
calibers behind the nose, as the two-scale families of W5.

Cases: r_n / R = 0.03, 0.05, 0.10, 0.15 (grids); 0.03, 0.05, 0.15 (fits).

## Code

- **Main's C grid** (`claude/eloquent-dirac-ek9hcf` 36a4284 plus the cap
  patch): the generator's grids only (stage A). Its outer boundary sits at
  the body scale; this is the grid the question names.
- **The two-scale C grid** (`claude/wip/haack-merge` ee4b57a plus the cap
  patch): the generator's grids (stage A) and the fits (stage B), with
  its two-stage captured start (`secondCapture`) and its constants
  unchanged (DEFAULT_TUNING, BOUNDARY_MARGIN 0.5, BOUNDARY_CELLS 3,
  BOUNDARY_SMOOTHING 50). haack-merge is not yet merged or reviewed; the
  probe says whether its grid serves caps, not whether it is ready.

Runners: `runners/` (vitest files run from a tree with the patch
applied; `run.sh` gives the exact commands and the lanes).

## Stages

**A. Grids, no solve.** For every ratio (0.03, 0.05, 0.10, 0.15), Mach
number (1.3, 2, 3) and refinement (nj = 20, 40, 80), on both trees: the
cap's geometry, and the generator's grid with its quality against the
generated grids' gates (QUALITY_LIMITS) and the fitted grids' gates
(FITTED_QUALITY_LIMITS: cell angles 12 deg or more, wall cells 50 deg or
more, neighbouring cells within 1.3, aspect ratio 13 or less). On the
two-scale tree the generator's grid is only the first capture's; its
gates are recorded, not judged.

**B. Fits** on the two-scale tree, as the Haack families were run
(`claude/wip/haack-merge:docs/research/two-scale-noses/runners`): the
fit to round-off (shock speeds and residual below 1e-12) or the early
stop of those families (remaining iterative error of the drag below 1e-9
of it on two successive chunks, shock speeds below 1e-9), each finer
grid seeded from the converged coarser one, checkpointed every chunk.
In this order, as CPU allows:

1. r_n / R = 0.05, Mach 1.3, nj = 20, 40, 80.
2. 0.03 and 0.15 at Mach 1.3, nj = 20, 40, 80.
3. 0.05 at Mach 2 and 3, nj = 20, 40, 80.
4. 0.03 and 0.15 at Mach 2 and 3, nj = 20 and 40.

Recorded per grid: drag, iterations, convergence, the fitted grid's
quality and the page's checks (`fittedCaseFailure`: fitted gates, outflow
axial Mach number above 1, the end of the body asked for crossed
supersonically), stagnation pressure against the pitot value, the
standoff, the wall entropy against the normal shock's, and the drag of
the cap (ahead of the tangent point).

## What counts as "takes it"

A case is taken if:

1. every grid of nj = 20, 40, 80 passes the page's checks
   (`fittedCaseFailure`) with the shipped constants;
2. every fit converges (round-off or the early stop above) within
   40000 iterations times the refinement;
3. the three drags converge monotonically, at an observed order between
   1.5 and 2.5 (formal order 2 within the procedure's ORDER_TOLERANCE of
   0.5; 0005 needs a fourth grid to compare two orders, which is the
   build's, not the probe's);
4. the stagnation pressure lies within 0.01% of the pitot value on
   nj = 40 and its error falls with the grid (0006 measured +0.0074% to
   +0.00024% on the hemisphere).

Cases run only on nj = 20 and 40 count as consistent if 1, 2 and 4 hold
on both.

The C grid **takes these caps** if every case of stage B items 1 to 3 is
taken and every item 4 case is consistent. Then W6's tangent caps are
build work (a reference, the page input, an allowance), not grid work.

## Stop rule: when W6 is grid work of unknown length

Any one of these, on any case of items 1 to 3, ends that case and is
reported as grid work:

- a grid fails the fitted gates or the page's checks with the shipped
  constants, and the failure is in the grid's construction (where it
  fails, which gate, by how much). One diagnostic variation per failure
  is allowed to locate the cause (for example a longer cylinder where the
  outflow check fails, as `solvedBluntBody` would try); no tuning sweep;
- a fit that does not converge within 40000 iterations times the
  refinement, or converges to a state that depends on its start;
- drags that do not converge monotonically, or an observed order outside
  1 to 3.

If a single nj = 80 fit would take more than 12 hours on its core, it is
stopped at its checkpoint and the probe reports nj = 20 and 40 only, with
the estimate.

## What the probe does not do

No reference solution (the method of characteristics behind the sonic
line), no measured check (TR 1386 is not named in a dated 0014 10.7 entry
and is not opened), no band, no page change, nothing served.
