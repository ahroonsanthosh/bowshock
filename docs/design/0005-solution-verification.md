# 0005: Every result carries its measured discretisation error

- **Status:** Implemented (`src/verification/grid-convergence.ts`,
  `src/analysis/verified-drag.ts`) and used by the nose wave drag page
  (`demos/nose-drag.html`) for sharp-nosed bodies.
- **Date:** 2026-10-16
- **Inputs:** the measurements below; the procedures of Celik et al. and
  Stern et al. (sources in `docs/validation/sources.md`).

## Why

No fixed grid is fine enough everywhere. At Mach 2 to 5 the default grid
of 20 cells across gives cone pressures within 0.3% of the exact value,
but on a 24 deg cone at Mach 1.41, whose conical flow is just subsonic at
the surface, the pressure ahead of the shoulder differs from the conical
value by several percent on the default grid, by an amount that only
halves with each refinement (0004). So results are not
taken from one grid: each is computed on a nested family of grids and
reported with the error measured from it, or not reported as verified.

## Method

Values on grids refined by 2 (nj = 20, 40, 80, ...), coarsest first:

- **Monotone convergence:** the grid convergence index of Celik et al.
  (steps 3 to 5, ratio 2), with two cautious additions of ours. The
  observed order is capped at the formal order, 2. And since a
  shock-capturing scheme has no single formal order to compare with, the
  observed orders of the two finest triples of grids must agree within
  0.5, which needs four grids.
- **Oscillatory convergence** (the finest triple changes direction): the
  range of the three finest values, twice the half-range of Stern et al.
- **Otherwise** (changes growing, too small to measure, orders that
  disagree, fewer than four grids): no error band; refine further.

Neither estimate can see an error that does not shrink with the grid. On
the cone families below the pressure settles up to 1.2e-4 from the exact
value on the grids measured (up to nj = 160). Whether that is an offset
that never vanishes or convergence too slow to show is not established;
the reference is converged to 1e-13 but agrees with NASA SP-3004 only to
3e-5 in Cp. Each band therefore adds a floor measured for the quantity
against exact solutions: 2e-4 of the value for surface pressure.

A result is **verified** when its total band, estimate plus floor, is
known and within the tolerance asked for; the driver refines until it is
or the finest grid allowed has been solved.

## Measurements

Surface pressure measured with the unscaled shared reconstruction,
before the unit-invariant one became the default (0003); the drag families
below use the default.

Mean cone surface pressure over 0.5 to 0.95 of the cone length, on
cone-cylinders, against Taylor-Maccoll; error of each grid relative to the
exact value:

| Case           | nj = 20 | nj = 40 | nj = 80  | nj = 160 | Outcome                           |
| -------------- | ------- | ------- | -------- | -------- | --------------------------------- |
| M 3, 20 deg    | -0.265% | -0.157% | -0.083%  | -0.044%  | monotone, orders 0.56 and 0.90    |
| M 2, 15 deg    | +0.029% | -0.008% | -0.010%  | -0.006%  | oscillatory                       |
| M 1.3, 10 deg  | +0.039% | +0.006% | +0.0002% | -0.0005% | unresolved: orders 2.44 and 3.18  |
| M 1.41, 24 deg | -3.34%  | -1.16%  | -0.85%   | -0.43%   | unresolved: changes do not shrink |

- M 3, 20 deg: band 1.6e-3 (estimate) plus 5.6e-4 (floor) against a true
  error of 1.2e-3; the extrapolated value is within 0.0013% of exact.
- M 2, 15 deg: band 5.2e-5 plus 3.1e-4 against 1.0e-4. Without the floor
  the band would miss: the error here is the floor.
- M 1.3, 10 deg: no band. Taken alone, the finest triple would give 3.2e-6
  against a true error of 5.6e-6; the order check catches it.
- M 1.41, 24 deg: no band; this case needs finer grids.

The order tolerance of 0.5 is the value that separates the first and third
cases, and the floor was set from the same families, so the test that keeps
them is a regression check, not independent evidence; more families are
being measured to test both. Note also that a rising order (0.56 then 0.90
on the first case) passes the check while the grids are clearly not yet
asymptotic. These four are kept in
`tests/verification/grid-convergence.test.ts`, which checks that a band is
given only where it contains the true error.

### Forebody drag

Measured with the unit-invariant shared reconstruction (the default).
Forebody pressure drag coefficient, error of each grid against the exact
value (Taylor-Maccoll for the cones, the method of characteristics for the
ogive of NACA TN 3716, 3 calibers at Mach 1.98):

| Case            | nj = 20 | nj = 40 | nj = 80 | nj = 160 | Outcome                        |
| --------------- | ------- | ------- | ------- | -------- | ------------------------------ |
| M 2, 15 deg     | +0.186% | +0.003% | -0.023% | -0.018%  | oscillatory, band 5.3e-5       |
| M 3, 20 deg     | -0.395% | -0.259% | -0.151% | -0.081%  | monotone, orders 0.33 and 0.63 |
| M 1.98, TN 3716 | +1.210% | +0.174% | -0.025% | -0.042%  | unresolved: orders 2.38, 3.58  |

The cone bands contain the true errors (5.3e-5 against 3.7e-5, 4.5e-4
against 2.3e-4). The ogive's values converge fast, but to a limit about
4.4e-4 below the exact one, and on the Mach 3 cone the extrapolated value
is 4.6e-4 off: drag too has an error that does not shrink with the grid,
larger than for surface pressure. The drag floor is set at twice that,
1e-3 of the value (`DRAG_FLOOR`); three families are thin evidence for
it, and it is kept as a regression check that every band, floor
included, contains the true error
(`tests/verification/grid-convergence.test.ts`).

## Precision

Each value carries an uncertainty from iterative convergence and
arithmetic, and a change between grids gives an order only when it is ten
times that. For the CPU engine, converged to residuals of 1e-13, it is
about 1e-12 of the value. The GPU engine computes in 32-bit and converges
only to about 1e-5 of the initial residual, yet its forebody drag on cones
(Mach 1.3 to 3, nj = 20 and 40, wall fluxes evaluated from its state in
double precision) is within 1.1e-6 of the CPU's; its noise is taken as
1e-6. With every value of the four families perturbed by up to 1.1e-6, in
fifty patterns each, bands are still given only where they contain the
true error (`tests/verification/grid-convergence.test.ts`).

## Forebody drag (`src/analysis/verified-drag.ts`)

For a rocket body the quantity is the forebody pressure drag coefficient.
Each grid of the family is solved until the drag itself stops changing
by more than the engine's noise over a batch of steps; a grid that never
settles is reported as not converged, never as a value. After it settles
the flow at the outflow plane must leave supersonic, where the
zero-gradient outflow condition holds, and the cells along the outer
boundary must still hold the free stream it imposes (density, pressure and
velocity within 1e-5): on the validated sharp-nose cases they differ from
it by 3.5e-6 or less on the coarsest grids, by 1e-7 or less on the next,
while a bow shock reaching the boundary disturbs them by order one.
Otherwise the case is reported as invalid, with the reason. The nose wave
drag page asks for no tolerance: every run refines to the finest grid
allowed and reports the value with its measured band, or says that no
band could be measured. The same procedure runs on the CPU
engine and on the GPU engine, whose wall fluxes are evaluated from its
32-bit state in double precision; on a cone each grid's drag agrees with
the CPU engine's within 2e-6.

## Open

- The origin of the floors: up to 1.2e-4 in cone surface pressure, up to
  4.6e-4 in forebody drag.
- More measured families for the order tolerance and the floor, including
  integrated forces once they are computed.
