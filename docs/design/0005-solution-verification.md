# 0005: Every result carries its measured discretisation error

- **Status:** Estimator and refinement driver implemented
  (`src/verification/grid-convergence.ts`); not yet wired into the app.
- **Date:** 2026-10-16
- **Inputs:** the measurements below; the procedures of Celik et al. and
  Stern et al. (sources in `docs/validation/sources.md`).

## Why

No fixed grid is fine enough everywhere. At Mach 2 to 5 the default grid
of 20 cells across gives cone pressures within 0.3% of the exact value,
but on a 24 deg cone at Mach 1.41, whose conical flow is just subsonic at
the surface, the cells next to the shoulder carry errors of several
percent that only halve with each refinement (0004). So results are not
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

Neither estimate can see an error that does not shrink with the grid. The
cone families below converge to a small offset from the exact value, up to
1.2e-4 of the pressure, whose origin is not established (the reference is
converged to 1e-13). Each band therefore adds a floor measured for the
quantity against exact solutions: 2e-4 of the value for surface pressure.

A result is **verified** when its total band, estimate plus floor, is
known and within the tolerance asked for; the driver refines until it is
or the finest grid allowed has been solved.

## Measurements

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
cases; more families are being measured to test it. These four are kept in
`tests/verification/grid-convergence.test.ts`, which checks that a band is
given only where it contains the true error.

## Open

- Wire the driver into the app on the GPU engine, with progress shown as
  the grids are refined, and report the drag with its band once drag is
  validated.
- The origin of the floor of up to 1.2e-4 in cone surface pressure.
- More measured families for the order tolerance and the floor, including
  integrated forces once they are computed.
