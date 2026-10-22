# BRL 934 range A: the registered run, done (2026-10-22)

Branch `brl934-range-a` (pushed as `claude/wip/brl934-range-a`). Not merged to main.

- Pre-run commit `1af3786`: the harness, the admitted-rounds rule and list, every input with its 0014
  10.6 item, and 0014 10.7 amendment (n), dated 2026-10-22. No BRL model value existed before it.
- Result commit `d8479a3`: "BRL 934 range A, run once as registered". Run once at `1af3786`, 08:50 UTC,
  by a neutral agent that built none of the model. Re-running the test files afterwards only checked
  the recorded expectations (no source changed); that output was not used.
- Record: `docs/design/0020-brl934-range-a.md`; amendment (n) in `docs/design/0014-refusals.md`;
  code `src/validation/brl934.ts`, `src/validation/hold-out-run.ts`; tests
  `tests/validation/brl934-range-a.test.ts`, `hold-out-run.test.ts` (reproduces the DREV gate's 11
  shots exactly), `brl934-readings.test.ts` (round 9 pairing: 0 differences, 27 rounds); outputs
  `docs/research/base-and-total/runs/brl934-range-a.out` and `.json`.

## Admitted rounds (by 10.6 item 5, no drag value used)

In (10): 3254 (M 1.506), 2595 (1.784), 2599 (1.788), 2591 (1.801), 2588 (1.802), 2590 (1.803),
2596 (1.814), 2589 (1.827), 3263 (2.423), 3264 (2.468). Out (6): 2593, 2594, 2598, 3256 (yaw 53.4,
36.2, 5.6, 6.6 deg^2); 3255 (no yaw printed); 3249 (laminar in both readings).

## Present model (the Basic Finner's claimed model): PASS by rule 4, all seven rounds it serves

| Round | M | CD0 | Modelled C_D (band) | Residual | Tolerance |
|---|---|---|---|---|---|
| 2591 | 1.801 | 0.6033 | 0.5804 (0.4980 to 0.6974) | +3.9% | -27.1% to +27.0% |
| 2588 | 1.802 | 0.6145 | 0.5800 (0.4977 to 0.6968) | +6.0% | -27.1% to +27.0% |
| 2590 | 1.803 | 0.6436 | 0.5796 (0.4974 to 0.6963) | +11.0% | -27.1% to +27.0% |
| 2596 | 1.814 | 0.6236 | 0.5752 (0.4942 to 0.6907) | +8.4% | -27.0% to +27.0% |
| 2589 | 1.827 | 0.6115 | 0.5700 (0.4904 to 0.6840) | +7.3% | -26.8% to +27.0% |
| 3263 | 2.423 | 0.4698 | 0.4314 (0.3725 to 0.5188) | +8.9% | -24.9% to +27.9% |
| 3264 | 2.468 | 0.4484 | 0.4240 (0.3663 to 0.5097) | +5.8% | -24.8% to +28.0% |

Mean residual +7.3%, the same in both clusters; smallest margin 16.0 points (2590, high side). Every
residual positive, each inside the model-form band alone. The library itself serves no total at 3254,
2595, 2599 (the present factor starts at M 1.798).

## Rebuilt factor (W1): refused at all ten rounds, so no residual and NO PASS

Reason: "fin-trailing-edge", the Basic Finner's wedges diverge to a blunt trailing edge at the base,
which no band-setting source measures (0015 sections 1, 4, 6, 9; stated before the run in (n)). W2
applies to none (all at M 1.506 or above). By rule 3, range A is not run again: W1 has no hold-out of
its own from BRL 934.

## Sensitivities (beside the verdict, not the verdict)

Rounded C_D': CD0 moves at most 0.0004, residuals at most 0.1 point. DREV's 0.004 cal edge: refused at
M 1.80 to 1.83 (edge Reynolds 6417 to 6684, below 6700); where served it adds about 0.044 (3263 to
-1.1%, 3264 to -4.2%), inside. Trailing-edge term halved: residuals +14.5% to +22.3%, inside.

## Ambiguities, decided in (n) before the run

1. 3263 admitted on the readings as recorded (round 7's third look found a dot); 3264 also reported
   with 3263 out: +5.8%, inside -22.5% to +25.7%.
2. "Neither reading marks laminar" and "out if both mark it" give the same set (only 3249).
3. Cluster spread from the five rounds the present model is run at (-2.6% to +3.9%), the stricter
   reading; the seven-round spread reported beside, every round still inside.
4. Diameter and air nominals at midpoints (0.80 in, 293 K), band over all four corners; air 288 to
   298 K as registered; Graph II the mean of its two readings; the text's C_D' continued past M 2.4;
   "halved" applied to the trailing-edge term's nominal, band ends, laminar states and corners.

## What remains (owner decision first)

- The registered consequence (0014 10.7 (b)): on a pass, "the class is validated over what that range
  supports". Range A supports, inside the class (Mach 1.799 to 2.15, Re 1.19e7 to 2.0e7), only Mach
  1.80 to 1.83, at Reynolds numbers 0.80e7 to 1.20e7 (below the class floor), with sharp edges (no
  leading-edge term tested). Nothing at 1.83 to 2.42; 2.42 to 2.47 is above the class. The owner must
  decide what label to restore and where (section 7 of HANDOFF.md).
- Then: merge `brl934-range-a` to main (check committer emails first), and update 0010 section 11.7,
  0008 section 6.4 and 0014 amendment (b), which still say "Not run", plus the README and the page's
  class text.
