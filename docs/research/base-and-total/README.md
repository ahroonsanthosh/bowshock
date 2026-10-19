# Base drag and the total: measurements behind 0010

The runners and outputs of the measurements quoted in
[0010](../../design/0010-base-drag-and-total.md) that are not committed
tests. The libraries are `src/base/` and `src/total/`; their tests are
`tests/base/`, `tests/total/` and `tests/validation/basic-finner.test.ts`,
which hold every number of 0010 that these outputs also print.

Throwaway vitest files in `runs/` wrote the outputs beside them. To re-run
one, copy it and `vitest.config.ts` into `tests/tmp-total/` (gitignored)
and run `ONLY=tests/tmp-total/<name>.test.ts npx vitest run --config
tests/tmp-total/vitest.config.ts` from the repository root; it writes its
`.out` there.

- `magnitudes.test.ts`: the first sizing of the Basic Finner's components
  (nose, friction adiabatic and with the wall at the air temperature,
  transition, the wedge fins' wave drag from the oblique shock and the
  tip-cone loss), before the library existed. Superseded by
  `gate-table`; kept because 0010 quotes its cold-wall percentages.
- `base-rows.test.ts`: the compiled curve's band evidence, its curvature
  bound, the deviation of every tabulated value from the line through its
  neighbours, the interpolation bound at the shots' Mach numbers, the
  tunnel excesses, the adopted fins-on-base rows, and 0008's rows
  reproduced from the first reading alone.
- `interpretations.test.ts`: the sizes of the Basic Finner interpretations
  (the drawn 2.84 cal nose length against the 10 deg half-angle, the 0.004
  cal meplat at pitot pressure, the fin roots' share of the body's wetted
  area) and the recovery temperatures.
- `gate-table.test.ts`: the Basic Finner partial sum per shot, for the
  speed of sound at 343.7, 343.4 and 344.0 m/s (Table V's range; no value
  changes at the fourth decimal), with each component, the bands, the
  residuals with the wall adiabatic and at the air temperature, the
  tolerance, the gap and the scales of the missing terms, the clusters'
  statistics, and the refusals at the five shots below Mach 1.4.
