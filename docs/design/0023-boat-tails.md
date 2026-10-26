# 0023: Boat-tails

- **Status:** In progress on `claude/wip/boat-tails`. Nothing is served:
  every boat-tail is still refused (`base: boat-tail`, 0014 B2). Part 1,
  the boat-tail's own pressure drag from the fitted solve, is built on the
  CPU and the GPU for sharp noses, and solved but not yet checked behind
  blunt ones; it is being measured against the method of characteristics
  (section 2), and the rule that will set its served range is written
  down ahead of the results (section 2.5). Part 2, the base behind a
  boat-tail, and the viscous allowance on part 1 wait for their figures,
  named in 0014 10.7 (ae) before anyone reads them, to be read twice, the
  second time blind (sections 3 to 5).
- **Date:** 2026-10-26
- **Inputs:** [0006](0006-shock-fitting.md) (the fitted solve, its
  verification and its references), [0008](0008-total-drag.md) section 3.2
  (boat-tails not quantified by any opened source), [0010](0010-base-drag-and-total.md)
  (the base), [0014](0014-refusals.md) sections 5.6 and W10 and 10.7 (ae).

## 1. What a boat-tail changes, and the plan

A boat-tail here is a straight cone behind the cylinder, narrowing from
the body's radius R to a base of radius r_b over a length l, its
half-angle theta = atan((R - r_b) / l) (`BoatTail`, `src/geometry/body.ts`).
OpenRocket's transitions that narrow aft are of this kind when their
shape is conical; curved ones and flares are not represented. Against the
same body ending in a flat base of radius R, a boat-tail changes four
terms of the total:

1. **Its own pressure drag.** At the shoulder the flow turns through
   theta in a Prandtl-Meyer expansion and then recompresses along the
   converging cone; the pressure on the aft-facing surface is below the
   free stream's, a drag. Inviscid and attached in the cases served: the
   fitted solve continued over it (section 2).
2. **The base.** A smaller base, at a lower local Mach number and a
   different pressure than the free stream's: Love's method (TN 3819 pp.
   16 to 18), which takes the cylinder's base curve at the Mach number and
   pressure just ahead of the base, both from part 1 (section 4).
3. **Viscous effects on part 1.** The boundary layer thickens the
   effective body and softens the shoulder: RM E51F26 measured side
   pressures above the method of characteristics, which overpredicted the
   side pressure drag by about 20% (its summary; 0014 section 5.6). A
   measured allowance (section 3).
4. **Friction** over the cone's wetted area (`src/friction/body-friction.ts`
   takes the profile, so the area is right; whether its model holds on a
   boat-tail is an open question, section 7) and **fins** ending ahead of
   the boat-tail (W1's x/c, 0015).

The order of work: part 1 needs no reading and is done first; parts 2 and
3 need figures read twice, which others arrange.

## 2. Part 1: the boat-tail's own pressure drag

### 2.1 The solve

The fitted solve of 0006 for sharp noses, continued over the boat-tail
(`sharpFitProblem`, `src/analysis/fitted-flow.ts`), on the same vertical
grid lines from the body to the fitted bow shock:

- **The body solved.** The boat-tail stays where it is; its cone is
  continued past the base by four columns of the base grid (below), or
  nine tenths of its remaining run to the axis if that is shorter,
  instead of the cylinder being lengthened as on bodies without one
  (`boatTailColumns`). The base is then a grid line inside the domain,
  not the outflow plane, so its last cells are not perturbed by the
  outflow condition (0006, "The domain extends at least one caliber past
  the nose"). Where the flow at the base is axially supersonic
  (`baseMach`, already checked at the end of the body asked for), nothing
  behind the base reaches the body ahead of it, and the pressure on the
  boat-tail is that of the body asked for. Continued by eight columns
  instead of four, the first case's boat-tail drag (section 2.3) moves by
  2.5e-8 on nj = 20 (7e-7 of its value). The real base flow (a separated
  wake) differs from the continued cone; it reaches the boat-tail only
  through the boundary layer, which part 3 covers.
- **The shoulder** is an expansion corner, as the cone-cylinder junction
  is (0006, "Why the order dips at low Mach numbers on cone-cylinders").
- **Columns** (`boatTailColumns`). The usual layout sizes columns to the
  shock layer: far along a long body they are a body radius long or
  more, a few over the whole boat-tail. Over the boat-tail the columns
  are 2 min(l, R) / nj long, growing ahead of the shoulder by 3 / nj per
  unit length until the usual layout's are shorter; but never narrower
  than the base grid's outer cell on the first guess of the shock over
  10, over the refinement, and never wider than l / 4 over the
  refinement; past the base they keep the base's width. The first
  layout, without the lower limit, put the outer cells over a long
  body's boat-tail at aspect ratios of 13.3 to 23.1 at Mach 1.5 and 2
  (nj = 20), above the fitted grids' gate of 13 (0006), on 8 of the 13
  cases of section 2.3 (`docs/research/boat-tails/out-first-layout/`);
  with it every case's grid lies at 7.3 to 8.3. The first guess (the
  tip's conical shock line) lies above the converged shock, so the
  converged outer cells are smaller than it supposes. Every width scales
  with the refinement exactly and the continuation does not depend on
  it, so the grids nest, and every case is held to the fitted grids'
  gates unchanged. The nose's columns are the usual ones; the shoulder
  and the base are grid lines.
- **The shock's step.** Under these narrow columns the far shock's outer
  cells are tall and thin (aspect ratios of 8 to 10 at the shock), and
  the shock nodes' pseudo-time step of half the outer cell's height per
  signal speed lets a node move by several columns' worth: on the first
  case tried (a 3-caliber tangent ogive, 3 calibers of cylinder, a
  1-caliber 6 deg boat-tail at Mach 2, nj = 20) the shock saw-toothed and
  the fit stopped with a negative height. On bodies with a boat-tail each
  node's step is limited to two widths of its face (`stepAspect`,
  `src/solver/shock-fitting.ts`); the case then converges to 1e-12 in
  2232 steps. The converged state does not depend on the step (the shock
  stops moving there). Bodies without a boat-tail are solved as before,
  bit for bit.
- **The terms.** The drag of the wall faces from the tip to the shoulder
  is the forebody's, as before (`drag`); that of the faces from the
  shoulder to the base, on the body's cross-section pi R^2, is the
  boat-tail's (`boatTailDrag`). The faces of the continuation count in
  neither.

### 2.2 The references

**The method of characteristics with the shoulder's fan.** The march of
0006 (`src/validation/characteristics.ts`) refused corners. It now takes
an expansion corner: the first C- line that passes the corner takes the
flow at the corner by the inverse method (the C- line through the corner
from the C+ segment behind the last wall point, the state linear along
that segment), then the corner's centred Prandtl-Meyer fan, exact at the
wall's entropy and the free stream's total enthalpy, in rays of equal
angle (2 per interval of the starting line and radian of the turn), and
crosses every ray before it meets the wall behind the corner; every later
line crosses the rays in the same way, so the lines grow by the fan's
rays. Compression corners are refused. The march is otherwise unchanged:
bodies without a corner give the same numbers as before. Its boat-tail
drag is the profile's, integrated from the shoulder (the fan's last
state) to the base by the trapezoidal rule in r^2 (`pressureDragFromProfile`'s
rule), the pressure at the base interpolated between the wall points
either side.

On the first case (above), the march's boat-tail drag on 640, 1280 and
2560 intervals is 0.03456621834, 0.03456631504 and 0.03456633780: order
2.09, extrapolated 0.0345663454, its last value 2e-8 (7e-7 of the value)
from that. Its mass balance falls with the intervals (1.2e-6, 5.8e-7,
2.9e-7) and no mesh point falls inside the body.

**Prandtl-Meyer at the shoulder.** At the corner itself the flow turns
through theta isentropically along the wall streamline: the wall
pressure just behind the shoulder is the Prandtl-Meyer value from the
state just ahead of it. The march builds this in; on the fitted grids the
wall pressure in the cells behind the shoulder must tend to it as the
cells shrink (section 2.4).

**Linearised theory, a sanity check.** Sources on the axis of strength U
R R' (von Karman and Moore), the axial perturbation velocity on the
surface, and slender-body theory's Cp = -2 u / U - R'^2
(`src/validation/linear-body.ts`). At the shoulder the source strength
jumps, and the jump's contribution, -df / sqrt((x - x_s)^2 - beta^2 r^2),
is an integrable singularity a distance beta R behind the shoulder, where
the Mach cone of the shoulder's axial source meets the surface: the
expansion is misplaced by beta R, and the check is one of size and trend
only. Slender-body theory proper, the limit of this near the axis, puts u
of order 1 / (x - x_s) just behind the shoulder and gives an unbounded
boat-tail drag, so it cannot be used as it stands. On the first case the
linearised drag is 0.0350158 (the integrals converged to 1e-7), 1.3%
above the march's. Over the thirteen cases of section 2.3 it is a poor
check: within 1.3% to 15% of the march on the seven cases with an angle
of 8 deg or less and a boat-tail at least 1.8 beta R long (where the
misplaced expansion still falls well on the boat-tail); 28% to 70% high at 12
and 16 deg, where the expansion is far from small; and 64% and 80% low
where the boat-tail is 1.4 beta R long or shorter (8 deg at Mach 3, a
half-caliber boat-tail at Mach 2), where the expansion lands at or past
the base. It confirms the size and the trends with angle and length on
small, long boat-tails and nothing else; the references are the march's.

### 2.3 Measurements

Two sets (`docs/research/boat-tails/cases.ts`). The first, thirteen cases
(`CASES`): a 3-caliber tangent ogive (and on one case a 3-caliber cone)
with 3 or 5 calibers of cylinder; boat-tails of 4, 6, 8, 12 and 16 deg,
0.5 to 2 calibers long; Mach 1.5, 2 and 3. The second, twelve cases
(`RM_E51F26`, names `e51f26-...`): RM E51F26's six boat-tails (5.63, 7.03
and 9.33 deg to bases of 0.506 and 0.704 of the diameter, 0.9 to 2.5
calibers long) behind a 6-caliber tangent ogive and a 6-caliber cone, the
cylinder making the body 12 calibers long, at Mach 1.91; their march is the
inviscid value section 3 divides by. For each, the march on 640, 1280 and
2560 intervals (order 1.65 to 2.09; the extrapolated value's distance
from the finest at most 3.1e-5 of it), linearised theory, and the fitted
family, each grid's boat-tail drag against the march's extrapolation. The
lane solves every case on nj = 20 and 40; four of the first set
(`FOUR_GRIDS`) on nj = 80 and 160, the rest of the first set on nj = 80
(being run; `table.py` writes this table from the results):

| Case                      | Characteristics | Linearised | nj = 20 | nj = 40 | nj = 80 | nj = 160 |
| ------------------------- | --------------- | ---------- | ------- | ------- | ------- | -------- |
| `c3-c5-bt8-l1-m2`         | 0.0538782       | +9.7%      | +0.377% | -0.014% |         |          |
| `e51f26-c6-bt5.63-r0.506` | 0.0476537       | +8.8%      | +2.032% | +0.780% |         |          |
| `e51f26-c6-bt5.63-r0.704` | 0.0394498       | +11.4%     | +1.292% | +0.490% |         |          |
| `e51f26-c6-bt7.03-r0.506` | 0.0621091       | +12.4%     | +1.796% | +0.651% |         |          |
| `e51f26-c6-bt7.03-r0.704` | 0.0505508       | +12.8%     | +1.022% | +0.358% |         |          |
| `e51f26-c6-bt9.33-r0.506` | 0.0864471       | +18.8%     | +1.345% | +0.428% |         |          |
| `e51f26-c6-bt9.33-r0.704` | 0.0681492       | +10.9%     | +0.545% | +0.117% |         |          |
| `e51f26-o6-bt5.63-r0.506` | 0.0461394       | +8.7%      | +1.961% | +0.657% |         |          |
| `e51f26-o6-bt5.63-r0.704` | 0.0387179       | +11.4%     | +1.300% | +0.453% |         |          |
| `e51f26-o6-bt7.03-r0.506` | 0.0608520       | +12.4%     | +1.828% | +0.622% |         |          |
| `e51f26-o6-bt7.03-r0.704` | 0.0499057       | +12.7%     | +1.075% | +0.381% |         |          |
| `e51f26-o6-bt9.33-r0.506` | 0.0854299       | +18.8%     | +1.444% | +0.483% |         |          |
| `e51f26-o6-bt9.33-r0.704` | 0.0676022       | +10.7%     | +0.733% | +0.226% |         |          |
| `o3-c3-bt6-l1-m2`         | 0.0345663       | +1.3%      | +0.813% | +0.311% | +0.110% |          |
| `o3-c5-bt12-l1.5-m3`      | 0.0732364       | +48.5%     | +1.086% | +0.364% |         |          |
| `o3-c5-bt16-l1-m1.5`      | 0.2174419       | +28.3%     | -0.724% | -0.578% |         |          |
| `o3-c5-bt16-l1-m2`        | 0.1507984       | +41.9%     | +0.206% | -0.135% |         |          |
| `o3-c5-bt16-l1-m3`        | 0.0885470       | +70.4%     | +0.310% | -0.182% |         |          |
| `o3-c5-bt4-l1-m2`         | 0.0162227       | -10.1%     | +0.807% | +0.319% |         |          |
| `o3-c5-bt4-l2-m1.5`       | 0.0310000       | +6.0%      | +1.064% | +0.434% |         |          |
| `o3-c5-bt8-l0.5-m2`       | 0.0324917       | -79.6%     | +0.119% | +0.060% |         |          |
| `o3-c5-bt8-l1-m1.5`       | 0.0750218       | +13.5%     | +0.041% | +0.003% |         |          |
| `o3-c5-bt8-l1-m2`         | 0.0534472       | +9.6%      | +0.796% | +0.297% |         |          |
| `o3-c5-bt8-l1-m3`         | 0.0335828       | -63.8%     | +0.993% | +0.417% |         |          |
| `o3-c5-bt8-l2-m2`         | 0.0700987       | +15.0%     | +1.736% | +0.629% | +0.228% |          |

Every grid so far converged and meets the fitted grids' gates (aspect
ratio at most 9.4, neighbouring sizes within 1.17, wall angles at least
69 deg). From nj = 20 to 40 the error falls by 2.4 to 3.3 times on 18 of
the 25 cases (observed orders 1.25 to 1.7, the shoulder's, section 2.4),
and by 2.0 on the half-caliber boat-tail. On three it falls to 0.12% or
less, passing near zero (the cone at Mach 2, 8 deg at Mach 1.5, and the
shortest of RM E51F26's behind the cone). It does not fall steadily on
the three 16 deg cases, where it changes sign at Mach 2 and 3 and falls
by 1.25 times only at Mach 1.5: two errors of opposite sign still
compete there, which only the four-grid families show resolved or not.
On the two cases solved on nj = 80 so far, both at Mach 2, the order from
the three grids is 1.32 (`o3-c3-bt6-l1-m2`) and 1.47
(`o3-c5-bt8-l2-m2`); the band the procedure would put on the finest grid
(5.8e-5 and 2.0e-4, 0.17% and 0.28% of the value) contains the error
(3.8e-5 and 1.6e-4), and the extrapolation misses the march by -0.025%
and +0.001%. The procedure needs the fourth grid to agree on the order
before it calls a band verified; the served range is decided from the
finished families in section 2.5.

### 2.4 The shoulder's pressure

Just behind the shoulder the flow has turned through the boat-tail's
angle in a centred Prandtl-Meyer fan, and the wall pressure there is the
Prandtl-Meyer value from the state just ahead (the march builds it in,
exactly). On the fitted grids the wall pressure in the first cell behind
the shoulder does not tend to it: on four cases at Mach 2 (6, 4, 8 and 16
deg; `docs/research/boat-tails/shoulder.test.ts`, `out/shoulder.txt`) the
first face's pressure coefficient lies 7.0e-3 to 1.0e-2 above the
Prandtl-Meyer value on nj = 20 and 40 alike (7% to 10% of the expansion's
fall in pressure coefficient, 4% at 16 deg), and 6.3e-3 to 8.3e-3 above the
march's at the same station; the largest difference from the march stays
a few cells behind the shoulder at the same size (1.2e-2 to 1.3e-2 at
16 deg), while halfway along the boat-tail it falls by about 3 per
refinement (for example -1.30e-3 to -4.07e-4). The cells beside the corner
straddle the fan's centre, whatever their size: an error of fixed size
over a length of a few cells, whose part of the drag falls in proportion
to the cells. This is why the boat-tail's drag converges at observed
orders of 1.3 to 1.5 (section 2.3) and not 2, as the forebody's does on
the same grids. The check confirms the expansion's size (the fitted
pressure two to four cells behind the shoulder is within 1.3e-2 of the
march's on every case) and shows where the band's order comes from; it is
not a sharper test of the drag than the march's profile itself.

### 2.5 The served range

Not decided yet. The rule that decides it, written on 2026-10-26 before
any grid of nj = 160 and before nj = 80 on all but two cases
(`o3-c3-bt6-l1-m2` and `o3-c5-bt8-l2-m2`, section 2.3):

- **Mach number:** 1.8 to 2.0, where the viscous allowance is measured
  (section 3, `BOAT_TAIL_MACH_RANGE` in `src/analysis/boat-tail.ts`);
  widening it is the owner's question (section 7).
- **The floor** (`BOAT_TAIL_DRAG_FLOOR`, a provisional 1e-3 until then):
  about twice the largest distance, relative to the value, between the
  procedure's extrapolation (order capped at 2) and the march over the
  four-grid families, as 0006 set the forebody's; and at least enough
  that every one of their bands, placed on the finest grid's value,
  contains the march.
- **Angles and lengths:** from the smallest to the largest angle, and from
  the shortest to the longest boat-tail, among the first set's cases in
  that Mach range whose band, with the floor, contains the march: the
  procedure's band on the four-grid cases, and on the rest the band from
  nj = 20, 40 and 80 (the order of that triple, capped at 2). A case with
  no such band (its errors not falling steadily) or whose band misses
  sets no end of the range, and the range stops short of it. The second
  set (nj = 20 and 40 only) sets nothing: its configurations are served
  where they fall inside the range.
- **Noses:** sharp ones only, until the blunt noses have their references
  (section 2.6).

The procedure on the page still calls a band verified only when its four
grids' orders agree, so a rocket inside the range whose family has not
settled gets no verified band there, as for the forebody (0006).

### 2.6 Not yet

- **Blunt noses** (the Von Karman and other two-scale noses, ellipsoids)
  are solved but not served. Their C grid goes on over the boat-tail's
  cone with its lines kept vertical, as along the cylinder, the columns
  there those of section 2.1 along the body (`bluntBodyGrid`,
  `boatTailBase`), and the cone is continued past the base by four of the
  base's columns, sized on a first grid of the same outer boundary
  (`solvedBluntSteps`); no cylinder is added. Grids without a boat-tail
  are unchanged (every node of 18 grids, three noses at Mach 1.5, 2 and 3
  and two refinements, compared bit for bit), and
  `tests/grid/blunt-boat-tail.test.ts` checks the shoulder and the base
  on grid lines, the continuation, the gates and the nesting. At nj = 20,
  Mach 2, an 8 deg boat-tail one caliber long behind 3 calibers of
  cylinder converges with every gate passed: behind a 2:1 ellipsoid its
  term is 0.0549845, behind a 3-caliber Von Karman nose 0.0558872. No
  reference checks them yet: the method of characteristics needs a data
  line from the fitted flow behind the subsonic nose region (as for the
  two-scale noses in 0006), measured as in section 2.3 before the term is
  served there; until then they are refused with that reason.
- **The GPU** carries the step limit (`step_aspect` in
  `src/engine-gpu/shaders/line-grid.wgsl`) and the boat-tail term's levels
  and band (`verifiedFittedDragGpu`); `tests/gpu/boat-tail-gpu.test.ts`
  checks it against the CPU path on a sharp nose. Blunt noses with a
  boat-tail are not run on it yet.
- **The page and the total** take the boat-tail term only with parts 2
  and 3.

## 3. The viscous allowance on part 1 (RM E51F26)

RM E51F26 measured the side pressures of six conical boat-tails (5.63,
7.03 and 9.33 deg, to bases of 0.506 and 0.704 of the diameter) at Mach
1.91 with no jet flow, behind a 6-caliber contoured nose and 6 calibers
of cylinder (18 in long, Reynolds number 3.24e6 per foot). Its summary
says its method of characteristics overestimated the side pressure drag
by about 20%. The allowance is set as 0014 10.7 (ae) item 1 registers,
before either reading: for each configuration, figure route (figs. 7 and
8 integrated, figs. 29 and 30 read) and reading, the ratio S of the
measured side pressure drag to part 1's inviscid value for that
configuration; the boat-tail term is served between S_min and
max(S_max, 1) times the inviscid value, widened by part 1's own band.
Measured at Mach 1.91 only: outside Mach 1.8 to 2.0 the term stays
refused until data at other Mach numbers are named (section 7).

## 4. Part 2: the base behind a boat-tail (Love's method)

Love's method (TN 3819 pp. 14 to 18): a cylindrical afterbody's base
pressure depends on the Mach number M_0 and pressure p_0 just ahead of the
base through an effective two-dimensional expansion angle delta_e(M_0),
0.85 of the measured wake convergence (his fig. 14), which defines his
basic curve (fig. 18, already read twice and served, 0010); a boat-tail of
angle beta reduces it to delta_e - K beta, K linear in the base-to-body
diameter ratio h/D from 0.85 at 0 to 1 at 1, and the base pressure is the
Prandtl-Meyer expansion of the flow at M_0 and p_0 through that angle.
M_0 and p_0 are the inviscid wall values at the base from part 1, as Love
took them from the method of characteristics. Its band is set as 0014
10.7 (ae) item 2 registers: the envelope, over both readings, of the
measured base pressure coefficients over Love's for each model, on
cone-cylinders with short afterbodies (TN 3819 figs. 19 and 21) and on
boat-tails (TN 3819 figs. 23, 24 and 25(b); RM E51F26 fig. 24 and the
base components of figs. 29 and 30; RM A52E20 fig. 15 once part 1
computes its ogival boat-tail; TN 3372 configuration D at Mach 1.2 and
above), enveloped with the cylinder's band of 0010 at M_0, and served only
within the angles, base ratios and Mach numbers the boat-tailed points
span.

## 5. Readings

Named in 0014 10.7 (ae), with how each sets its band, before anyone reads
them. The readers' brief is `docs/research/boat-tails/readers/brief.md`
(the coordinator hands it to readers, who do not open the repository);
each figure is read twice, the second time blind, and a neutral party
pairs the readings. This workstream computes part 1 and does not read
them.

## 6. Coverage

Registered 2026-10-26, before the served range exists (section 2.5) and
before the readings (section 5), and not changed by them:

- **The shapes.** The population's boat-tails (15.8% of its 2000
  rockets) get a shape from a generator of their own for each rocket
  (`boatTailShape`, `docs/research/refusals/population.ts`; seed
  20261026, keyed on the rocket's id), so the rest of the population is
  unchanged: the run checks population(2000)'s SHA-256 against its value
  before the stream was added, and `evaluate.ts` is untouched, so the
  impact run's tables cannot move. The length is the population's own (the
  boat-tail runs from the fins' trailing edges, 0.3 to 0.9 root chords
  ahead of the base, to the base: 0.32 to 2.17 calibers); the base is a
  motor retainer 6 mm wider than the motor, the largest standard motor
  that fits inside the body in two thirds of rockets and the next size
  down in one third (0.53 to 0.92 of the diameter); the half-angle
  follows (1.2 to 25.8 deg, median 6.3). These are assumptions, stated in
  the population's README; no opened source gives amateur boat-tail
  shapes.
- **The count** (`docs/research/refusals/boat-tail-coverage.test.ts`,
  `out/boat-tail-coverage.out`). At the impact run's conditions (each
  rocket in each Mach band, seed 7), for each boat-tailed case: the nose
  solve's refusals (`noseReasons`, as the impact run) and the boat-tail
  term's own, from the library (`boatTailReasons`: blunt nose, Mach
  number, angle, length, allowance). Reported by Mach band and over the
  Mach numbers served: the cases whose nose and term are both served,
  each reason's count, each reason's count as the sole blocker, and the
  same with every base at the largest motor that fits and at the next size
  down.
- **Then.** When section 2.5 sets the angles and lengths, the run is
  repeated with them. When the readings set the base's band (section 4),
  its span of angles, base ratios and Mach numbers is added as one more
  reason, and only then does `evaluate.ts`'s single refusal
  (`base: boat-tail`) give way to these reasons, with the impact run
  recorded before and after.

As run on 2026-10-26, with the provisional angles (4 to 16 deg) and
lengths (0.5 to 2 calibers) and nothing served: no boat-tailed case has
its term served, since the allowance waits for its readings. If it were
set, 6 of the 1264 boat-tailed cases (0.5%; 6 of the 43 between Mach 1.8
and 2.0) would have nose and term served; 5 and 10 in the two variants.
The term is refused by the Mach range on 96.6% of cases, behind a blunt
nose (Haack, power-series and ellipsoid) on 50.9%, by angle on 32.0% (under
4 deg or over 16 deg) and by length on 6.6%; the nose
solve itself is served on 21.5%.

## 7. Open

- **The viscous allowance away from Mach 1.91.** RM E51F26 is the only
  named source of boat-tail side pressures, at Mach 1.91. Serving the
  boat-tail term at other Mach numbers needs side pressures measured
  there (named in a further dated entry before they are read), or the
  owner's decision to carry the Mach 1.91 allowance to other Mach numbers
  with a label saying where it was measured. Until then the term is
  refused outside Mach 1.8 to 2.0.
- **RM E51F26's nose.** Its 6-caliber nose is defined by equation (14) of
  its reference 1, not yet opened; failing that, the allowance carries
  the spread between a tangent ogive and a cone of that length (0014 10.7
  (ae) item 1).
- **Whether the friction model of 0007 holds on the boat-tail's cone** (an
  adverse pressure gradient behind the expansion).
- **TN 3819 fig. 26** is the RM-10 body (tunnel data, no fins), whose
  flight totals with fins (TN 3320) are the hold-out for W10: (ae) decides
  it sets nothing and is not read, narrowing 10.1's "figs. 19 to 26".
