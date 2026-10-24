# The nose's model-form allowance: script runs (0022)

The runs behind [0022](../../design/0022-nose-model-form.md), registered
as 0014 section 10.7 (w). The script itself is
`src/validation/nose-model-form.ts`, its tests
`tests/validation/nose-model-form.test.ts` (synthetic bodies only). It
must be independently reviewed before any fresh reading reaches it
(0022 section 4.3, "Fixed before any reading").

## Files

| File | What it is |
| --- | --- |
| `seen-runs.test.ts` | The script's first runs, **on seen data only**: the TN 3716 typing in `src/validation/ogive-cylinder-tn3716.ts` (with 5fcc92b's -0.038 at x/d 2.95 as an alternative, 0022 section 4.2) against the method of characteristics, and the TN 4233 typing in `src/validation/cone-cylinder-tn4233.ts` (rows at indicated Mach 1.078 and above, the orifices on the cone) against Taylor-Maccoll. No source was opened |
| `out/seen-runs.out`, `out/seen-runs.json` | Their results. Runs on seen data: a check of the script, not a reading, not a test; they set no band |
| `vitest.config.ts` | The runs' config (one file, one worker, no time limit) |

Run from the repository root:

```sh
npx vitest run --config docs/research/nose-model-form/vitest.config.ts
```
