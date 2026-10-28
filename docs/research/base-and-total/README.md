# Base drag and the total: measurements behind 0010

The runners and outputs of the measurements quoted in
[0010](../../design/0010-base-drag-and-total.md) that are not committed
tests. The libraries are `src/base/`, `src/total/` and the fin-edge terms
in `src/fins/`; their tests are
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
  The first run's table (0010 section 6).
- `second-readings.test.ts`: the round-4 second-reading tables of
  `src/base/blunt-te-2d.ts` and `src/fins/tn2960.ts` against the
  independent reader's own files (`readings/*.csv` and the comparison set
  of `scripts/compare_round4.py`), value by value, including the "not
  blind" flags. The reader's folder is given by `ROUND4` (default
  `docs/research/total-drag/audit/round4/`, beside rounds 2 and 3); the
  recorded output was made on the reader's files as delivered, before they
  were committed.
- `laminar-band.test.ts`: the trailing-edge laminar input band at each
  gated Basic Finner shot, from the shot's Reynolds number alone (no drag
  value), on both readings, made before the second gate run (0010 section
  5.1).
- `gate-second-run.test.ts`: the second Basic Finner gate run, made once
  (0010 section 4.2), after the fin-edge choices and the reader's report
  were committed (f4791ad): per shot the components and their bands, the
  input bands, the residual, the tolerance with and without the wall
  input, pass or fail, the leading-edge regime and the trailing-edge
  laminar band's label; the clusters' statistics; the refusals at the five
  shots below Mach 1.4. `gate-second-run.out` is the output as it came out
  (run as `gate2.test.ts`, written as `gate2.out` and `gate2.json`, copied
  here unchanged); `gate-second-run.json` is the per-shot record from
  which `tests/validation/basic-finner.test.ts` held its values until
  round 5, and still holds the components and residuals.
- `gate-round5.test.ts`: the second run's configuration re-run
  (2026-10-20) after the round 5 audit changed the band arithmetic (0010
  section 10): the transition input as states of the boundary layer and
  the vacuum bound. Per shot the same columns as the second run, plus the
  tolerance's high end under the second run's arithmetic (which
  reproduces `gate-second-run.out`; also with the vacuum bound alone), the
  states that set the transition input's ends, the trailing edges' high
  end against the vacuum bound and their laminar band beside the term,
  and the tolerance under the flagged nearest-Mach alternative of 0010
  section 10.2. `gate-round5.out` is the output as it came out (run in
  `tests/tmp-total/` under the same name, copied here unchanged);
  `gate-round5.json` is the per-shot record from which
  `tests/validation/basic-finner.test.ts` holds the re-derived input bands
  and tolerances. The second run's files are kept unchanged beside it.
- `gate-corrected.test.ts`: the gate re-run (2026-10-21) with the
  fins-on-base factor corrected to TN 3819 fig. 35's free-flight curve as
  identified (0010 section 11), a recorded correction made on the
  figure's evidence after the residuals were known, not a validation; the
  configuration and the arithmetic are round 5's. It prints first the two
  readings of the curve paired, the identity-swap allowance from both
  readings' estimates A and B, the tunnel excesses, the corrected rows,
  the bounded factor above M 2.56 with Love's estimates against it and the
  increment-carried alternative, and the superseded factor beside the
  corrected one at each shot; then per shot the components, the input
  bands, the residual, the tolerance and the body base's label, and the
  clusters. `gate-corrected.out` and `.json` are the output as it came out
  (run in `tests/tmp-total/` under the same name, copied here unchanged);
  `tests/validation/basic-finner.test.ts` holds the corrected values from
  the `.json` beside round 5's. `base-rows.test.ts` and its output are the
  superseded factor's, kept as they came out.
- `brl934-range-a.out` and `.json`: BRL Report 934's range A (Mach 1.5 to
  2.47), run once on 2026-10-22 at the pre-run commit 1af3786, as
  registered in 0014 section 10 and its amendment 10.7 (n). The runner is
  the committed test `tests/validation/brl934-range-a.test.ts` itself,
  run with `BRL934_RUN_OUT` naming a folder, which writes both files
  there; they are copied here unchanged. They list the rounds of range A
  with each one's admission, then per model (the present factor at the
  seven rounds at M 1.798 and above; the rebuilt factor at all ten
  admitted) and round: CD0, the Reynolds number, the cluster spread, the
  total with its components and input bands, the residual and the
  tolerance, or the refusals; the library's own routing; the registered
  sensitivities and the two reading alternatives of 10.7 (n). The test
  holds the recorded values. The result:
  [0020](../../design/0020-brl934-range-a.md).
- `2026-10-27-ah-checks.out`: the checks of the compiled curve's band
  correction (0014 section 10.7 (ah)): the new tests of
  `tests/base/compiled-curve.test.ts` failing on the code before it (TN
  2360 at M 1.5, RM L52J21a's radome nose at M 1.62, TR 1051 at M 2.9),
  and seven errors planted one at a time in the corrected code, each
  caught by the tests named; after the review, five more; on 2026-10-28,
  with round 19 applied (the third addendum to (ah), band 0.77 to 1.13),
  all of them again and five new ones, each caught; after the merge with
  A5, `tests/base/tn2360-served.test.ts` on the merged head and the errors
  planted for it.
