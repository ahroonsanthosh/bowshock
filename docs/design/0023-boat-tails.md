# 0023: Boat-tails

- **Status:** In progress on `claude/wip/boat-tails`. Nothing is served:
  every boat-tail is still refused (`base: boat-tail`, 0014 B2). Part 1,
  the boat-tail's own pressure drag from the fitted solve, is built on the
  CPU for sharp noses and is being measured against the method of
  characteristics (section 2). Part 2, the base behind a boat-tail, and
  the viscous allowance on part 1 wait for their figures, named in 0014
  10.7 (aa) before anyone reads them, to be read twice, the second time
  blind (sections 3 to 5).
- **Date:** 2026-10-26
- **Inputs:** [0006](0006-shock-fitting.md) (the fitted solve, its
  verification and its references), [0008](0008-total-drag.md) section 3.2
  (boat-tails not quantified by any opened source), [0010](0010-base-drag-and-total.md)
  (the base), [0014](0014-refusals.md) sections 5.6 and W10 and 10.7 (aa).

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
  continued past the base by one body radius, or half its remaining run
  to the axis if that is shorter (`boatTailContinuation`), instead of the
  cylinder being lengthened as on bodies without one. The base is then a
  grid line inside the domain, not the outflow plane, so its last cells
  are not perturbed by the outflow condition (0006, "The domain extends
  at least one caliber past the nose"). Where the flow at the base is
  axially supersonic (`baseMach`, already checked at the end of the body
  asked for), nothing behind the base reaches the body ahead of it, and
  the pressure on the boat-tail is that of the body asked for. The real
  base flow (a separated wake) differs from the continued cone; it reaches
  the boat-tail only through the boundary layer, which part 3 covers.
- **The shoulder** is an expansion corner, as the cone-cylinder junction
  is (0006, "Why the order dips at low Mach numbers on cone-cylinders").
- **Columns.** The usual layout sizes columns to the shock layer: far
  along a long body they are a body radius long or more, a few over the
  whole boat-tail. Over the boat-tail and its continuation the columns
  are 2 min(l, R) / nj long, growing ahead of the shoulder by 3 / nj per
  unit length until the usual layout's are shorter (`boatTailColumns`);
  the nose's columns are the usual ones. The shoulder and the base are
  grid lines.
- **The shock's step.** Under these narrow columns the far shock's outer
  cells are tall and thin (aspect ratios of 10 to 20 at the shock), and
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
above the march's.

### 2.3 Measurements

(Being measured: families on nj = 20 to 160 against the march, over
boat-tail angle, length and Mach number. The served range is decided
from them in section 2.5.)

### 2.4 The shoulder's pressure

(Being measured.)

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

To be set from RM E51F26's measured side pressures and side pressure
drags with no jet (figures named in 0014 10.7 (aa)), against the
inviscid side pressure drag this solver gives for the same model (a
6-caliber contoured nose, 6 calibers of cylinder with the boat-tails, at
Mach 1.91; boat-tail angles 5.63, 7.03 and 9.33 deg to bases of 0.506 and
0.704 diameters). How the band is set is registered in (aa), before
either reading.

## 4. Part 2: the base behind a boat-tail (Love's method)

Love's method for boat-tails (TN 3819 pp. 14 to 18): the base pressure of
a cylindrical afterbody depends on the Mach number M_0 and pressure p_0
just ahead of the base through an effective two-dimensional expansion
angle delta_e(M_0), 0.85 of the measured wake convergence (his fig. 14),
which the cylinder's base curve (fig. 18, already read twice and served,
`src/base/tn3819-fig18.ts`) defines; a boat-tail of angle beta reduces it
to delta_e - K beta, K linear in the base-to-body diameter ratio h / D from
0.85 at 0 to 1 at 1. M_0 and p_0 come from part 1 (the flow in the column
of cells just ahead of the base, integrated across the boundary layer's
thickness as Love's "integrated average", or the wall value; which is
registered in (aa)). Its band is set on measured base pressures behind
boat-tails, named in (aa).

## 5. Readings

Named in 0014 10.7 (aa) with how each sets the band, before anyone reads
them; each read twice, the second time blind, by readers the coordinator
arranges, from briefs prepared on this branch.

## 6. Coverage

(The population's boat-tails are a boolean, 15.8% of rockets; their
angle, length and base ratio are drawn in a separate seeded stream so that
the rest of the population is unchanged; the run before and after is
recorded when anything is served.)

## 7. Open

- Whether the friction model of 0007 holds on the boat-tail's cone (an
  adverse pressure gradient after the expansion).
- TN 3819 fig. 26 is the RM-10 body (tunnel data, no fins), whose flight
  totals with fins (TN 3320) are the hold-out for W10: (aa) proposes it
  sets nothing.
