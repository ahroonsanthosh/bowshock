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
| `out/seen-runs.out`, `out/seen-runs.json` | Their results, with u_meas over the area from the first orifice to the shoulder (after the review of 3e26e9a). Runs on seen data: a check of the script; the typings enter the final envelope only as 0022 4.2's earlier readings (so in practice they are lower limits on the final allowance); not a reading under (w), never a test. Beside TN 4233's rows, the disclosure that the trapezoid spreads the x/l 0.994 drop over far more area than the shoulder's expansion reaches, so the cone's r is probably overstated and must not be quoted as the cone's error |
| `out/3e26e9a/` | The first run (commit 3e26e9a), u_meas over the orifices' span only, kept as it was |
| `blind-run.test.ts` | The script on blind readings A and B (`blind-readings/`), each its own reading, with the earlier typings as 0022 4.2's earlier readings. Run: TN 3716 (table I(a) and fig. 3) and RM A53E01 (table II(a), theta = 0). Not run, stopped on a question: TN 4233 (check orifices) and RM E51H17 (no stated Cp uncertainty). Seen sets: widening only, never a test. Run with `ONLY=./blind-run.test.ts` |
| `out/blind-run.out`, `out/blind-run.json`, `out/blind-run-questions.txt` | Its results per reading and combination, the floors, the boxes, and the questions stopped on |
| `blind-run-2.test.ts` | The second blind run, after the owner's answers (0022 section 8 items 7 and 8): TN 4233 (rows at indicated Mach 1.078 and above, check orifices as alternatives) and RM E51H17 (both meridians as alternatives; e the largest stated among the other reports). Run with `ONLY=./blind-run-2.test.ts` |
| `out/blind-run-2.out`, `out/blind-run-2.json`, `out/blind-run-2-combinations.txt` | Its results, the cone boxes, the TN 4233 rows not run and the question about them; every combination in the .txt |
| `reader-brief.md` | The blind readers' brief for the fresh readings under (w): sources, what to read, the CSV form; readers work without the repository |
| `vitest.config.ts` | The runs' config (one file, one worker, no time limit) |

Run from the repository root:

```sh
npx vitest run --config docs/research/nose-model-form/vitest.config.ts
```
