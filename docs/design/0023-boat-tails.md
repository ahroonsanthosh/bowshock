# 0023: Boat-tails

- **Status:** In progress on `claude/wip/boat-tails`. Nothing is served:
  every boat-tail is still refused (`base: boat-tail`, 0014 B2). Part 1,
  the boat-tail's own pressure drag from the fitted solve, is built on the
  CPU for sharp noses and is being measured against the method of
  characteristics (section 2). Part 2, the base behind a boat-tail, and
  the viscous allowance on part 1 wait for their figures, named in 0014
  10.7 (ae) before anyone reads them, to be read twice, the second time
  blind (sections 3 to 5).
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

Thirteen cases (`docs/research/boat-tails/cases.ts`): a 3-caliber tangent
ogive (and on one case a 3-caliber cone) with 3 or 5 calibers of
cylinder; boat-tails of 4, 6, 8, 12 and 16 deg, 0.5 to 2 calibers long;
Mach 1.5, 2 and 3. For each, the march on 640, 1280 and 2560 intervals
(order 1.89 to 2.09; the extrapolated value's distance from the finest
at most 3.1e-5 of it), linearised theory, and the fitted family, each
grid's boat-tail drag against the march's extrapolation (being run: the
lane solves every case on nj = 20 and 40, four on nj = 80 and 160, the
rest on nj = 80; `table.py` writes this table from the results):

| Case                 | Characteristics | Linearised | nj = 20 | nj = 40 | nj = 80 | nj = 160 |
| -------------------- | --------------- | ---------- | ------- | ------- | ------- | -------- |
| `c3-c5-bt8-l1-m2`    | 0.0538782       | +9.7%      | +0.377% |         |         |          |
| `o3-c3-bt6-l1-m2`    | 0.0345663       | +1.3%      | +0.813% |         |         |          |
| `o3-c5-bt12-l1.5-m3` | 0.0732364       | +48.5%     | +1.086% |         |         |          |
| `o3-c5-bt16-l1-m1.5` | 0.2174419       | +28.3%     | -0.724% |         |         |          |
| `o3-c5-bt16-l1-m2`   | 0.1507984       | +41.9%     | +0.206% |         |         |          |
| `o3-c5-bt16-l1-m3`   | 0.0885470       | +70.4%     | +0.310% |         |         |          |
| `o3-c5-bt4-l1-m2`    | 0.0162227       | -10.1%     | +0.807% |         |         |          |
| `o3-c5-bt4-l2-m1.5`  | 0.0310000       | +6.0%      | +1.064% |         |         |          |
| `o3-c5-bt8-l0.5-m2`  | 0.0324917       | -79.6%     | +0.119% |         |         |          |
| `o3-c5-bt8-l1-m1.5`  | 0.0750218       | +13.5%     | +0.041% |         |         |          |
| `o3-c5-bt8-l1-m2`    | 0.0534472       | +9.6%      | +0.796% |         |         |          |
| `o3-c5-bt8-l1-m3`    | 0.0335828       | -63.8%     | +0.993% |         |         |          |
| `o3-c5-bt8-l2-m2`    | 0.0700987       | +15.0%     | +1.736% |         |         |          |

Every grid so far meets the fitted grids' gates. The served range is
decided from the finished families in section 2.5.

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

(To be decided from section 2.3.)

### 2.6 Not yet

- **Blunt noses** (the Von Karman and other two-scale noses, ellipsoids):
  their C grids end in a cylinder (`bluntBodyGrid`), and a boat-tail
  behind one is refused (`solvedBluntSteps`). The C grid's lines are
  vertical along the cylinder away from the nose, so the same continuation
  is a change of its surface beyond the nose, measured as here before it
  is served.
- **The GPU** (the page's engine) needs the same step limit in
  `src/engine-gpu/shaders/line-grid.wgsl`; until then the page cannot
  solve a boat-tail.
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

(The population's boat-tails are a boolean, 15.8% of rockets; their
angle, length and base ratio are to be drawn in a separate seeded stream
so that the rest of the population is unchanged; the run before and
after is recorded when anything is served.)

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
