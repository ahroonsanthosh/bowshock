# Transonic, Mach 1.0 to 1.2 (0013): status at handoff (2026-10-22, 09:35 UTC)

Branch `transonic-mach1`, pushed as `claude/wip/transonic-mach1`. Record: `docs/design/0013-transonic.md`
on the branch (main has an older 0013). Not merged: blocked on the review findings (see
`transonic-review.md`).

What it is: captured-shock Euler with the body followed past its base and far-field boundaries; an
implicit (red-black) GPU solver in two-float (double-single) arithmetic; `verifiedTransonicDrag`
(src/analysis/transonic-drag.ts), which solves the family r = 1, 2, 4, 8 (16 on request), applies the
gridConvergence procedure with each grid's measured noise, and adds nested-domain far-field and
cylinder allowances and the 7e-5 floor; routing at [1.0, 1.2) to it and 1.2 up to the fitted solver
(`solveNoseDrag`, `solverFor`, `gpuNoseDragSolvers`).

## Commits since aed95b0 (the reviewed commit), oldest first

- `0e668c9` 0013 steps 4b and 5 (already an ancestor; S7's last point is done).
- `61100c9` step 6, the routing.
- The interface agent's seven type changes: `55de905` reason codes, `17a7424` levels on
  not-converged, `eef1ea5` the nose term (band a half-width, as VerifiedDrag.uncertainty), `fc062b0`
  typed progress, `943d6be` expected work on `finer`, `df544c9` onLive with a FlowSource, `4aef318` the
  range error pinned.
- `62e621d` 0013 records step 6 and those changes.
- `e18f7cc` B1 fixed: refused below Mach 1.05 (`NEAR_SONIC_LIMIT`, reason 'near-sonic'), pinned at
  1.0, 1.001, 1.0499, 1.05; 0013 serving rule 8.
- `85d20f2` S4 fixed: far field max(100 radii, 10 nose lengths), nested at half and twice; every base
  grid and the finest grid checked before any solve ('domain', 'device-memory'); a memory error
  mid-solve refused with the grids before it; the router catches GpuMemoryLimitError; allowances
  solved right after the base grid; r = 16 offered only where the device can hold it.
- `90b59be` S1 (WIP): dampedOscillationBound must decay and sit within 1e-7 before a grid counts as
  settled, and enters the noise; Infinity remaining means not settled; rates passed between grids;
  residual must fall to half its largest and still change; 100 times its first value stops as
  'diverging'; the reviewer's A4 adopted as a test. Not done: the GPU engine's residual() on
  SwiftShader. On A4 the noise comes out 3.3e-6 (conservative).
- `ad0e20e` (WIP) the GPU sweeps fix (GPU_TRANSONIC_SWEEPS = 2) and 0013 entries for S1 and sweeps.

API changes the interface must follow: 'mach-1' is now 'near-sonic' and allowMach1 is allowNearSonic;
new refusal codes 'domain', 'device-memory'; new not-converged code 'diverging'; TransonicEngine is a
callable interface with optional refuses(cells); TransonicGridSolver requires residual();
FAR_FIELD_DOMAINS replaced by FAR_FIELD_SCALES and transonicDomains(body).

## Remaining review findings (in order)

S2/S3 (rule proposal below, owner decision first), S5 (once-per-solve GPU-vs-CPU residual check
refusing 'device-precision'; test of the self-test's refusal path; the G3 test pinning
gpuNoseDragSolvers' sweeps), S6 (Taylor-Maccoll computed in the driver for the label; wording for
far-field-dominated bands, the reviewer's A6), S7 (0013 numbers and stale lines), minor (floor
comment units; Dekker 1971 and Knuth in sources.md; a reason code for Haack and power-law noses).
Owed: the before-and-after table of every served and recorded number. Then a re-review by a fresh
agent, then merge.

## The GPU sweeps finding (fixed in ad0e20e; its S5 test owed)

4 red-black sweeps fall into a limit cycle (drag 0.067 to 0.164, period about 4,700 steps, r = 1 and
2, Mach 1.1; tests/tmp-transonic/df-settle-rb4.txt). The CPU twin without Anderson does the same, so
it is the method: for the near-sonic acoustic wave the relaxation does not contract. Cone base grid,
Mach 1.1, steps to settle: 1 sweep 2,350; 2 sweeps 1,200; 3 sweeps 800; 4 never; Jacobi 2 sweeps
2,500. 2 sweeps converge everywhere measured (CPU cone 1.2: 650, 1.1: 1,200 (r = 2: 2,100), 1.05:
7,400; ogive5 1.1: 1,100; ogive3 1.2: 650; SwiftShader cone 1.1 r = 1: 1,200 steps, 4.9e-8 from the
CPU; r = 2: 2,100; 1.2: 650, -4.9e-10). Margin on r = 4, 8 and other bodies not measured.

Final SwiftShader settle measurement (09:34 UTC, `tests/tmp-transonic/df-settle2.txt`), two-float
from the free stream, every case within 1e-7 of the CPU's drag:

| Mach | Sweeps | Grid | Steps to settle | Time per step | Drag vs CPU |
|---|---|---|---|---|---|
| 1.1 | 2 | r = 1 | 1,200 | 120 ms | +4.9e-8 |
| 1.1 | 2 | r = 2 | 2,100 | 562 ms | (no CPU value at r = 2) |
| 1.2 | 2 | r = 1 | 650 | 110 ms | -4.9e-10 |
| 1.05 | 2 | r = 1 | 7,400 | 116 ms | -8.7e-8 |
| 1.1 | 3 | r = 1 | 1,050 | 87 ms | -3.3e-8 |

The GPU's step counts with 2 sweeps equal the CPU twin's (1,200, 650, 7,400). Not yet measured: 2
sweeps on r = 4 and 8 and on other bodies.

## Timing

SwiftShader: 34 to 40 microseconds per cell-step (110 to 120 ms per step on r = 1, 3,540 cells; 560 ms
on r = 2). r = 8 (226,560 cells) about 9 s per step: 15 to 37 hours for r = 8 alone. SwiftShader is
not usable for page solves. Mid-range GPU (estimate, not measured): 1.5e7 to 4e7 cell-steps per
second, so a typical r = 8 solve with allowances about 1 to 5 minutes, within a factor of 3. Measure on
real GPUs before launch.

## Mach 1.0 (test (b), nested far boundaries 55.1, 100.6, 224.2, 408.7 radii)

| Body | c1 | c2 | c3 | c2/c1 | c3/c2 | Rule (limit 0.6) | power-law exponents |
|---|---|---|---|---|---|---|---|
| Cone | +1.927e-3 | +1.213e-3 | +3.60e-4 | 0.63 | 0.30 | refused | 1.09, 1.30 |
| 5-caliber ogive | +1.639e-3 | +1.236e-3 | +4.61e-4 | 0.75 | 0.37 | refused | 0.82, 0.99 |

## The agent's S2/S3 rule proposal (to write into 0013 before any code; owner decision)

Four nested domains (adding 4 times the family's far field and a 40-caliber cylinder), no "negligible
against the band" shortcut, so the allowance is decided right after the base-grid allowances.
Measurability m = 2 x noise x value added to every allowance. Monotone case (c1, c2, c3 measurable,
one sign): power-law exponents q12, q23 from the actual distances, both positive and within 0.5 of each
other; allowance = |c2 + c3| + |c3| / ((D3/D2)^q - 1) + m, q the smaller. Sign change: refuse if c3 >
m, else allowance = |c2| + |c3| + K max(|c2|, |c3|) + m with K = 2.86 (a pre-registered slowest
exponent 0.5). Would give: cone Mach 1.0 allowance 1.96e-3 (2.1%); ogive5 Mach 1.0 2.42e-3 (14%);
cone 1.01 to 1.02 refused; cone 1.05 about 5e-7; ogive5 1.05 about 9.3e-6; the reviewer's A1 refused.
Its test needs a fifth nested domain (about 800 radii); whether the nested one converges is open (the
regridded 800-radius run diverged).

The advisor (Fable) instead recommends keeping DECAY_LIMIT 0.6 and moving the family's own domain to
224.2 radii with 100.6 and 408.7 as nested neighbours (the step 0013 pre-registers); and not building
the Guderley sonic far field now (its sources unread; the field does not reach similarity within 40
radii). Reconcile the two before writing the rule; the owner decides (HANDOFF section 7).

## Case A cross-check for the subtip work (3-caliber tangent ogive, Mach 1.2)

Queue `queue-ogive3.txt`. Nested base grids all within 3e-8 of each other (own 0.10952301; far 50 and
200 radii; cylinder 5, 20 and 2 calibers), so the nose value depends neither on the domain nor on what
is behind the base. Family: r = 1 0.1095230, r = 2 0.1089110, r = 4 0.1088724; r = 8 running (a few
hours at nice 10). No value or band until r = 8 lands. The transonic agent has not seen subtip's
value (about 0.10893 +- 6e-5); keep it that way until it reports, then compare.

## Compute queues (results in tests/tmp-transonic/results/<tag>.jsonl, progress/, states/)

| Queue | nice | Running at handoff | Progress | Results |
|---|---|---|---|---|
| queue-ogive10.txt | 5 | ogive10 Mach 1.1, r = 1 to 16, CHECK=100 | r = 16 at 2,200 steps, checkpointed | ogive10-m1.1-f100-c10.jsonl |
| queue-s12.txt | 10 | ogive5 Mach 1.1, r = 1 to 16, CHECK=100 | r = 16 at 800 steps, checkpointed | ogive5-m1.1-f100-c10.jsonl |
| queue-ogive3.txt | 10 | case A family | r = 8 running | ogive3-m1.2-f100-c10.jsonl, n-ogive3-m1.2-*.jsonl |
| queue-relax.txt, queue-nest.txt | | finished | | x-*-d0.jsonl, n-*.jsonl |

Restart (from the worktree root; first edit the hard-coded `cd` in tests/tmp-transonic/run-queue.sh
to the new path; finished jobs skip in seconds only if their results lines AND states/*.bin exist):
- `setsid nohup nice -n 5 sh tests/tmp-transonic/run-queue.sh tests/tmp-transonic/queue-ogive10.txt > /dev/null 2>&1 < /dev/null &`
- `setsid nohup nice -n 10 sh tests/tmp-transonic/run-queue.sh tests/tmp-transonic/queue-s12.txt > /dev/null 2>&1 < /dev/null &`
- `setsid nohup nice -n 10 sh tests/tmp-transonic/run-queue.sh tests/tmp-transonic/queue-ogive3.txt > /dev/null 2>&1 < /dev/null &`
The GPU settle measurement: `CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome ONLY=tests/tmp-transonic/gpu-df-settle.test.ts npx vitest run --config tests/tmp-transonic/vitest.gpu.config.ts`.

tests/tmp-transonic (gitignored on the branch) is in `claude/wip/results` under `transonic/`; its
`states/` (217 MB of checkpoints) is on `claude/wip/results-states` (the owner approved pushing it;
delete that branch once the runs are done). Copy both back into the worktree's tests/tmp-transonic.

## A new session must not

- set the sweeps above 3 (use 2); rerun RB4 or the old gpu-df-converge measurement;
- use regridded domain comparisons (their changes are grid noise; use nested domains);
- rerun the regridded 800-radius far field (it diverges);
- loosen the Mach 1.0 rule before the owner decides S2/S3;
- build the sonic far-field condition before the owner decides.

## Open questions for the owner (from the agent)

1. Approve the S2/S3 rule (with the fifth-domain test)? If it passes, Mach 1.0 would be served with
   about a 2% band on the cone and 14% on the 5-caliber ogive.
2. The asymptotic sonic far field (Guderley and Barish, Klunker): not proposed; sources unverified.
3. Accept 2 sweeps on the measured evidence, or build a relaxation that contracts by construction
   (for example LU-SGS by diagonals on the GPU)?
