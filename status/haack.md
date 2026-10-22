# Haack / Von Karman noses: status at handoff (2026-10-22)

Branches: `haack-merge` (pushed as `claude/wip/haack-merge`, head `299f786`, clean; main b86c308 merged
at 235286d) and `haack-grid` (pushed as `claude/wip/haack-grid`, head `a076072`, an ancestor of
haack-merge: the lanes' code). Lane data (tests/tmp-haack, tests/tmp-haackmoc) on `claude/wip/results`
under `haack/`. Not merged to main. Not yet reviewed.

## What haack-merge adds, each claim with its evidence

a) Von Karman (LD-Haack, C = 0) noses on the drag page: option von-karman maps to haack 0; a two-scale
   grid (tip scale where the profile crosses r = x); a two-pass captured start (secondCapture); the
   allowance TWO_SCALE_DRAG_FLOOR = 5e-4 via fittedDragFloor, each solve stating its own allowance
   (allowanceText). Tests: tests/grid/blunt-grid.test.ts; tests/analysis/fitted-flow.test.ts (families
   nest at r 2, 4, 8; outline; refusals); tests/analysis/two-scale-fit.test.ts (chunked start equals
   whole start; 1-caliber nose at Mach 2, nj 20 and 40, within 1e-9 of recorded values);
   tests/gpu/fitted-flow-gpu.test.ts (the VK page path within GPU noise of the CPU; power series
   refused); tests/app/total-drag.test.ts (allowance text).
b) Ellipsoid grids unchanged from main: 48 ellipsoid grids bit-identical (merged tree against main
   b86c308); 24 two-scale grids identical to a076072 (docs/research/two-scale-noses/grids, dump.test.ts,
   compare.mjs; the dumps themselves were scratch, not kept).
c) Six families on nj 20/40/80 (observed orders 1.49 to 2.28): 1 caliber at Mach 1.5, 2, 3; 3 calibers
   at 2 and 3; 5 calibers at 1.5. Values in 0006's table; evidence in
   docs/research/two-scale-noses/fits (results.jsonl, saved/*.json).
d) References from the method of characteristics: the procedure's extrapolation misses by -1.24e-4 to
   +2.44e-4; the largest +2.44e-4 on 5 calibers at Mach 1.5 (order 2.28, capped at 2)
   (marches/moc.jsonl, analysis/moc3.mjs).
e) Allowance 5e-4 = twice 2.44e-4 rounded up: every band contains its error against the lowest bound
   of the marches (5 cal M 1.5: 1.56 times; 3 cal M 2: 1.78 times, correcting 0006's "2 or more";
   others 2.6 times or more).
f) Served only inside the convex hull of the referenced (calibers, Mach) points: corners (1, 1.5), (5,
   1.5), (3, 3), (1, 3); up to 4.3 calibers at Mach 2. Refused with the reason: outside the hull,
   LV-Haack, the power series, detached sharp tips.
g) GPU page path: passed on 235286d. The quoted +4.2e-8 (0.42909808121884696) predates main's GPU
   solver changes: re-measure before quoting, or say "within the GPU noise of 2e-6".
h) Corrections in f86bce5: detached tips are refused (not solved via the removed usesBluntFamily);
   bluntness quoted as 0.16 of the nose length at 1 caliber, 2.2e-3 at 3, 2.9e-4 at 5 (README, page,
   0004, comments); the wip diff removed; records in docs/research/two-scale-noses with a README.

## Left before the independent review

1. Final-code CPU tests not finished (the machine was overloaded): run tests/grid/blunt-grid.test.ts,
   tests/analysis/fitted-flow.test.ts, tests/analysis/two-scale-fit.test.ts (about an hour on one free
   core), tests/app, verified-drag, forces; full `npx tsc --noEmit -p .` and `npx eslint .`.
2. Re-read the GPU value (VK test with CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome)
   and update or replace +4.2e-8 in 0006, README, test comment.
3. The design-narrative boundary ratios ("a tenth at the tip and 0.42 along the nose" in fitted-flow.ts,
   0004, 0006; "8 times / 2.4 times" in 0006) come from old runs; only the tip value (0.126) is kept.
   Run haack-merge/tests/tmp-ratio/ratio.test.ts (cheap) and fix the numbers, or drop them.
4. The page's four-grid run to nj 160 is unchecked on Von Karman noses (if the two finest orders
   disagree, the page shows "not verified": fail-safe but unmeasured).
5. Merge main's later commits (f003330 fixed the drag-page GPU test reasons; 7d8221c).
Then: independent review (fresh agent, given the code), fixes, merge. Agreed plan: merge with the
current outline, widen it after the corner runs.

## Lanes (in the results branch; restart from a checkout of claude/wip/haack-grid with tests/ restored)

- lane6: `tests/tmp-haack/lane6.sh`, last line `family.sh L5c2M3 5 2 3 tests/tmp-haack/queue.log`, the
  5-caliber nose at Mach 3, nj 80 (checkpoint tests/tmp-haackmoc/ckpt-L5c2M3r4.{json,bin} at 4000
  iterations, maxSpeed 5.4e-7, far from done).
- lanex: FINISHED at 10:31 UTC ("done L5c2M2r4", "lanex corners finished"): 5 calibers at Mach 2,
  nj 80, saved as tests/tmp-haackmoc/L5c2M2r4.{json,bin} (in claude/wip/results from cde6af4). Its
  march and the (5, 2) reference check can start; lanex needs no restart.
- Restart, one copy each (edit the hard-coded `cd` in the scripts if the path differs):
  `echo "$(date -u +%FT%TZ) lane6 restarted" >> tests/tmp-haack/queue.log && setsid nohup nice -n 10 bash tests/tmp-haack/lane6.sh >/dev/null 2>&1 </dev/null &`
  `echo "$(date -u +%FT%TZ) lanex restarted" >> tests/tmp-haackmoc/lanex.log && setsid nohup nice -n 10 bash tests/tmp-haackmoc/lanex.sh >/dev/null 2>&1 </dev/null &`
  They skip finished runs (lane6 checks run-*.out for "done" and "Tests 1 passed"; family.sh skips when
  the save .json exists); fits resume from ckpt-*.
- After they finish: run the marches with moc.test.ts (env as in marches.sh: MOC_R=1,2,4, MOC_FILES of
  r1/r2/r4, MOC_LINES from a scan, MOC_RUN=640,1280,2560); apply the line criterion (mass balance and
  the change from 1280 intervals each below 3.5e-5 of the drag on every grid); run moc3.mjs; add (5, 2)
  and (5, 3) to VON_KARMAN_REFERENCES if they pass; recompute the allowance (twice the largest miss,
  rounded up); update ranges in 0006, README, page, tests in a separate commit.

## Must not repeat / pitfalls

The nj 20/40/80 families (done); lane5 and lane6's earlier runs; a second copy of either lane;
rebasing (merge only); any kill by pattern. The 5-caliber Mach 1.5 nj 80 run needs UNGATED=1 in the
throwaway runner; the MOC loader needs gated: false; vitest 5 hides console output, so measurements go
to files.

## Open questions

1. Re-measure and keep +4.2e-8, or quote only "within 2e-6"? (Coordinator's view: quote only what is
   re-measured on the merged code.)
2. Serve Von Karman with the page's four-grid run before one case is checked at nj 160? (Coordinator's
   view: check one case at nj 160 first.)
3. Re-measure the boundary-ratio numbers or remove them? (Either; never keep unmeasured numbers.)
4. Merge with the current outline and widen after the corners? (The agreed plan: yes.)
