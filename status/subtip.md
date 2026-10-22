# Subsonic-tip work (tangent tips on the fitted solver): status at handoff (2026-10-22)

Branch `subtip-tangent` (pushed as `claude/wip/subtip-tangent`). Its new content is ON MAIN: F's
record was cherry-picked as 7d8221c. Never merge the branch wholesale: it carries old duplicates of
commits main already has under other hashes, one with an unverified committer (255b6ff). Cherry-pick
its new commits only.

## What is served and measured

The exception (0006): tips whose flow behind the tip crosses the starting plane axially subsonic but is
supersonic on the surface, with no corner, are served. References:
- E: 3-caliber tangent ogive, Mach 1.35: two grid families within 1.5e-5; the captured-shock band
  contains both.
- F: 2-caliber tangent ogive, Mach 1.6 (surface Mach 1.0036, axial 0.886): default family nj 20 to 160
  0.2053948862, 0.2051904733, 0.2051381165, 0.2051250814 (orders 1.965, 2.006, extrapolated
  0.2051207363, band 2.0e-5 with floor); density-1.5 family 0.2056332765, 0.2052482207, 0.2051522947
  (order 2.005, extrapolated 0.2051203194); agreement 2.0e-6. The captured-shock cross-check is
  UNRESOLVED on F (0.2056606, 0.2045075, 0.2045979, 0.2048066: changes do not shrink, finest 1.5e-3
  below and rising, first-order extrapolation 1.05e-4 short), so F rests on the fitted method's own
  verification; 0006, README and page say so.

## In progress (compute lanes, scripts in the results branch)

- G: 2-caliber K = 1 parabola at Mach 1.6. Default family to nj 160 and density-1.5 family to nj 80
  (lane A). Roughly 12 to 18 h at this machine's load. Then compare against 7e-5 and commit G's record
  (cherry-pick to main) or narrow the rule with a test. G's captured check was also unresolved.
- A: 3-caliber tangent ogive at Mach 1.2, surface-SUBSONIC tip (tip-cone surface Mach 0.85), default
  family nj 160 (lane B, from a checkpoint at 13,600 iterations at 09:00 UTC). Default nj 20 to 80:
  0.1094433219, 0.1090150597, 0.1089485314 (order 2.69 capped at 2, extrapolated 0.1089263550; nj 40
  and 80 fail the page's aspect gate 13.7 and 14.1 against 13); density 1.5: 0.1097464924,
  0.1091136911, 0.1089778395 (order 2.22, extrapolated 0.1089325560, every grid passes); provisional
  value about 0.10893 +- 6e-5.
- P: 3-caliber K = 1 parabola at Mach 1.25, surface-subsonic: families agree within 2.4e-5 (default
  extrapolated 0.1085667648, density 1.5 0.1085641643).

## Decision in force (coordinator, 2026-10-22)

Surface-subsonic tips (A, P) are NOT admitted. Grid agreement shows convergence, not that the method
is right where the surface flow is subsonic. Required before admission: A's two-family comparison, and
an independent method's value for case A: the transonic solver is computing it offline (queue
`queue-ogive3.txt` on transonic-mach1; its body is the same ogive at scale 2, nose pressure drag only,
on pi R^2). The advisor (Fable) adds three more requirements: the start-plane sensitivities of 0006
("What serving these tips would need") measured on each admitted case, plus a deliberately perturbed
imposed state; an admission domain bounded by the measured cases; and if the two families differ by
more than half the 7e-5 floor, widen the band to their difference. Recommended to adopt all four.

## Lanes (die with the container; restart from checkpoints)

Lane script `lanef.sh` (results branch, `coordinator/subtip/`) runs from the main checkout with the
harness in `tests/tmp-subtip/` (gitignored there; a copy is in the results branch). Results:
`family3.jsonl`, `captured3.jsonl`; checkpoints `state3/` (each stores the last 32 check drags).
Commands as last run (from the repo root, with S pointing at the copied subtip folder; the script's
`S=` line must be edited to the new location):
- `setsid nohup nice -n 10 bash $S/lanef.sh laneA family:F:dense:1.5:4 family:G:default:1:8 family:G:dense:1.5:4`
- `setsid nohup nice -n 10 bash $S/lanef.sh laneB-family family:P:dense:1.5:4 family:A:default:1:8`
Finished jobs are skipped quickly (F and P dense end at once).
