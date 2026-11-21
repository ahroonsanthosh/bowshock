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

## The tool's set-up trials (2026-11-21, before any registration)

Made to choose the settings, on a sharp cone (exact by Taylor-Maccoll)
and on one capped tangent ogive deliberately off W6's case list (4
calibers, r_n/R 0.08, Mach 2), whose fitted value nobody has computed, so
that no comparison with W6's solver was seen. Kept in the session's
scratchpad, summarised here:

1. Roe's scheme, adaptive CFL up to 100, on the first C grid (lines
   straight to a far parabola): diverged. Fixed CFL 1, first order:
   converged. The grid's lines near the cap were skewed (corner cosine up
   to 0.97 inside the shock layer).
2. The C grid rebuilt with lines along the wall's normals to an outer
   boundary at a + k s (polar about the cap): skew cosine 0.24 or less
   around the cap and in the shock layer. Sharp noses moved to an H grid.
   Each level now solved first order from the free stream, then second
   order restarted: converges to 1e-11 in 600 to 1,200 iterations.
3. The sharp cone at Mach 2 (9.46 deg; exact Cp 0.0955290, the tool's
   Taylor-Maccoll agreeing with the project's to 1.2e-10): the surface
   pressure converges pointwise (within 0.03% of exact from x = 1 back on
   the third level), but the integrated drag converges at about first
   order and lies 1.4% low there, nearly all of it in the last cells before
   the cone-cylinder corner, where the expansion smears upstream. A corner
   artefact: W6's noses meet the cylinder tangentially. Neither a larger
   limiter coefficient (1 for 0.05) nor clustering at the tip helped (the
   latter made it worse). The sharp cone is therefore a pointwise check,
   not a drag check.
4. Roe's scheme on the capped ogive: the stagnation region's pressure
   converged to about 1.55, 7% below the exact pitot value (1.6573) at
   Mach 2, on every level: a known failure of some flux schemes behind a
   strong, grid-aligned bow shock. HLLC on the same grid: 1.6545 (0.17%
   low) on the second level, its drag within 2.6e-6 of Roe's. AUSM+-up2
   and SLAU2 did not converge in 17,000 iterations. HLLC is the scheme.
5. HLLC on the capped ogive, levels 0 to 2 (64 x 32 to 256 x 128 cells;
   13 s, 85 s, 388 s on 4 threads; residuals to 1e-11; bow shock inside
   the domain, |Cp| on the outer boundary 2e-6 or less; outlet Mach 1.94
   or more): drag 0.0586772, 0.0587251, 0.0586856. The changes (+4.8e-5,
   -3.9e-5, about 0.08%) change sign, so the drag is not yet in the
   range where Richardson's estimate applies. The wall streamline carries
   a numerical error that shrinks slowly: its total pressure 2.4% below
   the pitot value and its total enthalpy 2% high on level 2 (2.5% to 3%
   and 2% to 2.5% on level 1), where in the exact flow both are the pitot
   values all along the wall. The stagnation vertex's Cp: 1.7177, 1.6545,
   1.6353 (exact 1.6573). Level 3 is to show whether these keep falling.

## State (2026-11-21)

- Done: the tool, the geometry check, the grids, the set-up trials above
  (the owner allowed SU2 to run; `.claude/settings.json`).
- Running: the off-list capped ogive with HLLC on four levels, to see how
  its drag converges and how long each level takes.
- Next, in order: register the W6 reference (the tool's checks with exact
  answers and their criteria; the cases, levels, the quantity, SU2's
  uncertainty, the agreement rule, the allowance, the served hull) with
  an independent review, before any W6 case runs; then the tool's checks;
  then the W6 cases, and the fitted solver's third grid where W6's lanes
  have only two.
