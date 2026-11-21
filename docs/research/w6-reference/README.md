# W6's independent reference for capped noses (work in progress)

The route 0014 10.7 (an) names for rounded nose tips: an independent
Euler solver for the forward region of capped noses, where W6's fitted
solver captures an embedded recompression shock behind the cap and its
earlier reference (a march of characteristics, which has no internal
shock) lay 2.6% to 3.6% of the drag below it (W6 README section 7, on
`claude/wip/w6-build`). Nothing here is registered yet, nothing has run
on a W6 case, and nothing is served: every capped nose stays refused.

The chosen code is SU2 v8.1.0, an external open-source CFD code (official
release `SU2-v8.1.0-linux64.zip` from github.com/su2code/SU2, SHA-256
`45589fdeb8185f1ccc4eebfa22dfbe00d5cb422ccfa2360e97647c1ae1b7d302`): axisymmetric Euler,
shock capturing through the bow shock and any embedded shock, on grids
made here. It shares no code, grid or geometry with bowshock's solver.

## Files

| File | What it is |
| --- | --- |
| `w6ref.py` | The tool: the capped-nose geometry written here from its definition (W6 README section 1), the C grids (nested: each level halves every spacing by sampling the same mappings), SU2's mesh and configuration, and the nose's pressure drag integrated here from SU2's surface pressures (trapezoid rule in r^2, on the base area) |
| `geometry-check/` | This geometry against W6's own (`src/geometry/nose.ts` at `claude/wip/w6-build` bf3c739, SHA-256 `e738b187...`, run as it is by `w6geom.ts`): the tangent ogive and the Von Karman nose, 3, 4 and 5 calibers, r_n/R 0.03, 0.05, 0.10 and 0.15, 401 stations each. `compare.out`: the parent's length within 1.8e-14, the offset 5.7e-15, the tangent point 7.7e-16, the radius 4.0e-15 (calibers). `gridq.py`, `gridq.out`: every cell's area positive on five levels for three trial cases; the largest corner skew 0.90 to 0.99 in cosine, to be improved before any reference run |

## State (2026-11-21)

- Done: the tool, the geometry check, the grids' first check.
- Not done: running SU2. The session's permission check refused to run
  the downloaded SU2 binary on a case (it ran `--help` only). It needs
  the owner's permission. Until then nothing below can start.
- Next, in order: improve the grids' skew; run SU2 on the tool's own
  checks with exact answers (a sharp cone against the Taylor-Maccoll
  solution, the stagnation pressure of a capped tip against the normal
  shock and isentropic compression, a sharp ogive against 0006's method
  of characteristics); then register the W6 reference (cases, grid
  levels, the quantity, SU2's uncertainty, the agreement rule, the
  allowance, the served hull) with an independent review, before any W6
  case runs.
