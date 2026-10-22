# Re-review of 0019 sections 3.2 and 3.3: what to read

For the coordinator, to brief a fresh reviewer. This lists what to read
and nothing of the author's view of whether the findings are met. Branch
`claude/wip/w7-fins`; the first review was made at `87145fc`.

## Context the reviewer needs

- The owner's decision of 2026-10-22: rounded leading edges of flat
  plates below normal Mach 1.0 are refused until NASA TM X-653 is named in
  0014 section 10.7 and read; the bounded term is kept as a recorded
  candidate, not wired; the rest of the rewrite is kept. Recorded in
  `docs/design/0014-refusals.md` section 10.7, amendment (o) (with (p), the
  F1 candidates, and a note on (k) item 3).
- The rules for "bounded, not measured": 0014 section 10.2.
- The first review's own scripts: branch `claude/wip/results`,
  `review-0019/scripts/sink.py`, `fs8a.py`, `fs.py`.

## Record sections (`docs/design/0019-fins-near-mach-1.md`)

| Section | Lines at this commit | Why |
| --- | --- | --- |
| Status, Date, Result paragraph | 1 to 73 | the decision and the coverage quoted |
| 1.2 Their size | 116 to 134 | corrected after the review |
| 2.3 (TM X-653, RM L9I30, RM L51F29 entries) | 213 to 264 | what is named, not opened |
| 3.2, all of it | 332 to 605 | findings A to H |
| 3.3, all of it | 606 to 705 | the seven changes |
| 4, the variants table | 801 to 841 | coverage G, H, I, J |
| 5, items 2 and 3 | 842 to 888 | the decisions as recorded |
| 6, item 6 | 889 to 936 | what remains for F2 |

To see what changed since the first review:
`git diff 87145fc HEAD -- docs/design/0019-fins-near-mach-1.md src/fins tests/fins/rounded-edge-bounded.test.ts tests/total/fins-own-drag-guard.test.ts docs/research/refusals/w7-fins.test.ts`
(the merges of main bring unrelated files; the paths keep them out).

## Findings A to H on 3.2, and where each is answered

| Finding (the review's subject) | Record | Code | Tests |
| --- | --- | --- | --- |
| A: the lower bound's chord (streamwise against normal-plane) | 3.2 (L4) | `src/fins/rounded-edge-bounded.ts`, `trailingEdgeSinkShift` | `tests/fins/rounded-edge-bounded.test.ts`, "the trailing edge's line sink (L4)", case A |
| B: the trailing edge's own sweep and normal Mach number | 3.2 (L4) | `trailingEdgeSinkShift`, `boundedRoundedEdge` (span's mean of t/c; zero for a supersonic trailing edge) | same block, B1, B2, C; "the cases of the review" B1, B2, "a supersonic trailing edge" |
| C: no argument near free-stream Mach 1.0 | 3.2 (L5) | `FREE_STREAM_FLOOR`, `TRANSONIC_XI_MIN`, `trailingEdgeXi` | "the transonic rule on the trailing edge (L5)"; cases C, D, the hobby fin |
| D: a linearised estimate is not a bound without a margin | 3.2 (L5) | `LOWER_BOUND_MARGIN` | case A ("the low end twice the line sink") |
| E: (U2) and TR 1094's evidence | 3.2 (U2) | `stationaritySlope` | "Bryson's stationarity" |
| F: (U3) is not an ordering | 3.2 (U3), (U4) | `NORMAL_MACH_CAP` | "refuses below Mach 1.06, above M_n 0.8, ..." |
| G: the Reynolds allowance | 3.2, the upper bound | `boundedRoundedEdge` (`reynoldsAllowance`) | "the high end (U1) to (U4), with the Reynolds-number allowance" |
| H: Barrowman's curve | 3.2 (U5) | none | "Barrowman's leading-edge curve" |

Also: the refusal now carried by the wired term,
`src/fins/rounded-leading-edge.ts`, `roundedLeadingEdgeDrag` (the M_n
below 1.0 refusal and the header comment), and the tests in
`tests/fins/rounded-edge-bounded.test.ts` under "refused, the owner's
decision of 2026-10-22", and `tests/fins/rounded-leading-edge-transonic.test.ts`
"refusals".

## The seven changes to 3.3, and where each is

| Item (the review's subject) | Record, 3.3 |
| --- | --- |
| 1: R&M 3348 fig. 32 measures Bryson's gap | "Measured: the nominal and its band", "And across his gap" |
| 2: Vincenti's bars | "What remains bounded", its upper bound |
| 3: the gap's lower end, xi -0.35 | "The gap's lower end" |
| 4: the ordering on fig. 32 and eq. 43 | "What remains bounded", its lower bound |
| 5: the sweep allowance additive and two-sided | "The sweep allowance: additive and two-sided" |
| 6: the similarity variables converted | "The similarity variables" |
| 7: below M_n 0.6, 3.2's lower bound | "Low normal Mach numbers" |

Added by the author beyond the seven: "The trailing edge" in 3.3.
Code for 3.3: none yet; its one test is
`tests/total/fins-own-drag-guard.test.ts`, "the review's bevel case".

## Coverage

`docs/research/refusals/w7-fins.test.ts` (variants G to J, the F2
conditions taken from `boundedRoundedEdge` itself) and its output
`docs/research/refusals/out/w7-plan.out`. Re-run:
`ONLY=./w7-fins.test.ts npx vitest run --config docs/research/refusals/vitest.config.ts`.
