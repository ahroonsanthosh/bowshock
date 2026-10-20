# Fin wave drag: measurements behind 0009

The runners and outputs of the measurements quoted in
[0009](../../design/0009-fin-wave-drag.md) that are not committed tests.
The library is `src/fins/`; its tests are `tests/fins/`.

## Python (run from this folder with `python3 -I`)

- `section2d_full.py` > `section2d_full.json`: the research's
  `section2d.py` and the audit's `dw_exact_indep.py` at full precision on
  17 double wedges (the values embedded in `tests/fins/section-drag.test.ts`).
- `arcas_rerun.py` > `arcas_rerun.out`: the research's
  `arcas_fin_check.py`, whose own path to its imports names a scratch folder
  of the session that wrote it; identical to
  `../total-drag/data/arcas_fin_check_output.txt`.
- `hayes_study.py 1 2 4` > `hayes_study.jsonl`: the audit's `hayes_fin.py`
  with its three resolution parameters scaled together by m.
- `gl_decimal.py` > `gl_decimal.out`: Gauss-Legendre nodes and weights in
  50-digit decimal arithmetic (the reference of `tests/fins/quadrature.test.ts`).
- `compare.py`: the summaries 0009 quotes from `hayes_study.jsonl` and
  `runs/`.
- `fin_validate2.out`, `fin_rect.out`, `fin_cases.out`: the research's
  scripts of those names, re-run (the first two had no saved output; the
  third's JSON is byte for byte the archived one).

## TypeScript (`runs/`)

Throwaway vitest files that wrote the outputs beside them. To re-run one,
copy it and `vitest.config.ts` into `tests/tmp-fins/` (gitignored) and run
`ONLY=tests/tmp-fins/<name>.test.ts npx vitest run --config
tests/tmp-fins/vitest.config.ts` from the repository root; each appends to
its output file there.

- `section.test.ts`: the thin limit (0009 section 2.3).
- `exactness.test.ts`: exact over Ackeret, or the refusal, for common
  sections (section 2.1).
- `claims.test.ts`: section2d.py and the audit's code against the library,
  the first reflected wave of the research's double wedges, the tent check,
  the audit's area-rule values.
- `analytic.test.ts`: the four analytic checks at n = 16, 24, 48.
- `port.test.ts`: the port against `fin_cases.py`.
- `convergence.test.ts`: quadrature convergence against the area rule
  (`convergence.jsonl`; with `SPLIT=0`, `finwave.py`'s integration,
  `convergence-unsplit.jsonl`).
- `table.test.ts`: the strip-theory table at the default resolution.
- `note.test.ts`: Busemann's C2 against the exact relations, the research
  table's changes, the ARCAS section and ratio.
- `arcas.test.ts`: the ARCAS fins' own drag over the measured increments.
- `euler.test.ts`: planar Euler solutions of two sections on nested grids
  (`euler.jsonl`; `CASE=dw` or `hex`, `LEVELS=0,1,2`), one solve at a time.
