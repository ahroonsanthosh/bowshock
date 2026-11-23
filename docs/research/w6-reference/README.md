# W6's independent reference for capped noses (work in progress)

The route 0014 10.7 (an) names for rounded nose tips: an independent
Euler solver for the forward region of capped noses, where W6's fitted
solver captures an embedded recompression shock behind the cap and its
earlier reference (a march of characteristics, which has no internal
shock) lay 2.6% to 3.6% of the drag below it (W6 README section 7, on
`claude/wip/w6-build`). Nothing has run on a W6 case, and nothing is
served: every capped nose stays refused.

The chosen code is SU2 v8.1.0, an external open-source CFD code (official
release `SU2-v8.1.0-linux64.zip` from github.com/su2code/SU2, SHA-256
`45589fdeb8185f1ccc4eebfa22dfbe00d5cb422ccfa2360e97647c1ae1b7d302`): axisymmetric Euler,
shock capturing through the bow shock and any embedded shock, on grids
made here. It shares no code, grid or geometry with bowshock's solver.

SU2's route ended at its checks (V5 at Mach 2 failed R5, below). The
owner then chose a second independent solver in SU2's place: OpenFOAM 13
(the OpenFOAM Foundation's package `openfoam13`, version 20260624), its
density-based solver `shockFluid` on wedge meshes of the same grids,
with a two-stage time step and a gradient limiter built here
(`openfoam/`). It shares no code with bowshock's solver either. Its
set-up trials and its registration are below.

## Files

| File | What it is |
| --- | --- |
| `w6ref.py` | The tool: the capped-nose geometry written here from its definition (W6 README section 1); H grids for sharp noses and C grids for capped ones, nested (each level halves every spacing by sampling the same mappings); SU2's mesh and configuration; the registered settings (`SETTINGS`, `capped_spec`, `sharp_spec`); each level after the first started from the level below (`seed_restart`); the nose's pressure drag integrated here from SU2's surface pressures (trapezoid rule in r^2, on the base area); the change of the drag's distribution between levels (`dist_change`); the boundary checks |
| `judge.py` | The verdict, as registered below, from the committed records only |
| `ofref.py` | The OpenFOAM runner: the tool's grids as wedge meshes (`write_polymesh`), the case files (`write_case`), the level loop (`run_case`: each level from the one below by `mapFields` after a hash check, resumed from its last save after a deadline, the stall rule), the drag from the wall's faces and its changes between levels (`faces_drag`, `faces_changes`), the boundary checks, and the registered settings and runs (`REGISTERED`, `run_registered`, `run_level4`) |
| `ofjudge.py` | OpenFOAM's verdict, as its registration below says, from the committed records only (it reuses `judge.py`'s estimate and checks) |
| `runs-of/` | OpenFOAM's registered runs, as they finish (none yet): per run and level `record.json`, `start.json`, `monitor.csv` (the residual and drag every tenth iteration) and `wall.csv` (the wall's faces, their Cp and total pressure); OpenFOAM's working files are not kept (`runs-of/.gitignore`) |
| `openfoam/` | The solver module `shockFluidHeun` (`shockFluid` with Heun's two-stage step) and the gradient scheme `cellVenkatakrishnanGrad` (Venkatakrishnan's limiter with its smoothing term), with their build steps; `trials/` holds the set-up trials' scripts |
| `queue.sh` | SU2's cases in order inside one two-hour background window; a case goes on from its first unfinished level (each finished level keeps its record, `L*/record.json`, with the hashes of the case's spec and of the level's solution file, both checked before the next level starts from it; a level whose SU2 was killed keeps none), one process per case (a lock the tool and SU2 hold), and no level starts that the window could not see finish (a start condition only) |
| `trials-r2/` | Revision 2's trials (below): `trial.py` runs each candidate setting on the trial case and applies the trial rules; `runs/` holds the records, as `runs/` does for the registered cases. `w6ref.py` takes two optional settings for them (`grad`, `limiterIter`); without them it writes SU2's file byte for byte as before |
| `fitted/lane.sh` | The fitted solver's families that W6 left without nj = 80, run with W6's own runners on the lanes' frozen source (ae794e4) |
| `fitted/lanes-results.jsonl` | W6's lane records, copied unchanged from `claude/wip/w6-build` bf3c739 (`docs/research/w6-build/results/lanes/results.jsonl`, git blob 3bf6e11, SHA-256 `e5f218a9...`) |
| `geometry-check/` | This geometry against W6's own (`src/geometry/nose.ts` at `claude/wip/w6-build` bf3c739, SHA-256 `e738b187...`, run as it is by `w6geom.ts`): the tangent ogive and the Von Karman nose, 3, 4 and 5 calibers, r_n/R 0.03, 0.05, 0.10 and 0.15, 401 stations each. `compare.out`: the parent's length within 1.8e-14, the offset 5.7e-15, the tangent point 7.7e-16, the radius 4.0e-15 (calibers). `gridq.py`, `gridq.out`: every cell's area positive on five levels for three trial cases (the first C grid, since replaced: trial 2 below) |

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
   1.6353 (exact 1.6573). Level 3: trial 8.

6. A level started from the converged level below (`seed_restart`: the
   grids nest, so each coarse vertex is a fine one and the vertices
   between take the means of their neighbours), second order from the
   start: level 1 of the capped ogive so gives the drag of level 1 from the
   free stream within 2.8e-12 (0.0587251015942 against 0.0587251015971),
   in about half the time. Every level after the first is so started.
7. The drag's parts on levels 0 to 2 of the same run: ahead of x = 0.3,
   0.0090072, 0.0091379, 0.0093128 (rising); behind it 0.0496700,
   0.0495872, 0.0493728 (falling). The total's small changes are partly
   these cancelling. The change of the wall's pressure integrated without
   cancellation (`dist_change`: the integral of |Cp_fine - Cp_coarse|
   d(r^2) / R^2 over the nose) is 5.8e-4 from level 0 to 1 and 3.1e-4
   from 1 to 2, about first order, spread along the nose (from 1 to 2:
   7.6e-5 on the cap, 3.8e-5 from its end to x = 0.1, 2.5e-5 to 0.3, 7.4e-5
   to 1, 3.5e-5 to 2, 4.7e-5 to 4). So an uncertainty taken from the
   total alone could be too small; the registration bounds it by this
   change as well.
8. Level 3 of the same run, started from level 2 (22 minutes on 2
   threads, residual 1e-11 in 1,708 iterations, the shock at 0.69 of the
   lines at most): drag 0.0586582, so 0.0587251, 0.0586856, 0.0586582 on
   levels 1 to 3, changes -3.9e-5 and -2.7e-5 (observed order 0.53). The
   stagnation vertex's Cp 1.6431 (0.86% below pitot; it turned back up).
   The distribution's change from level 2 to 3 is 1.95e-4 (ratio 0.64 to
   the one before): near the cap it fell fivefold (7.6e-5 to 1.5e-5), but
   from x = 0.6 to 2 the difference between levels 2 and 3 oscillates
   along the wall (wavelength about 0.25 to 0.3 calibers, amplitude up to
   8e-4 in Cp), waves between the bow shock and the wall that nearly cancel
   in the drag (their signed sum -1.9e-5) but count in full in the
   distribution's change. By R4 below this run's U_su2 is 3.4e-4, 0.58% of
   its drag (U_total alone would be 7.7e-5). Since a reference has to
   separate gaps of about 3% (the first march's) and the allowance below
   carries U_su2 in full, the limit for a reference is set at 1% of the
   drag, with level 4 as the fallback above it, rather than level 4 on
   every case (about eight times level 3's cost). (Superseded after the
   review: the regional measure, trial 9 and R4.) The drags of trials 5 to
   8 were integrated to the last vertex ahead of L, not to L (the bug the
   review found); on this grid that left out 1.6e-6 of the base area.
9. Mach 1.3 (an ogive of 4 calibers, r_n/R 0.10, off the list), levels 0
   to 2, the settings of the first form: the domain holds (the shock's
   reach 0.71, 0.71, 0.68; |Cp| on the outer boundary 5e-6, 1e-8, 2e-11;
   outlet Mach 1.27 to 1.25); drag 0.0619752, 0.0625085, 0.0624740; the
   vertex-level change 1.54e-3 and 9.67e-4 (ratio 0.63), spread along the
   whole nose, the aft part included (Cp at x = 3 moved from -0.02868 to
   -0.02975), while the signed change from level 1 to 2 is 3.4e-5; the
   stagnation vertex 6.3%, 2.4%, 1.0% above pitot. Summed over regions
   (doubling from the tangent point, then at most half a caliber: R4) the
   change is 1.10e-3 and 4.70e-4 (ratio 0.43), and on trial 8's Mach 2 run
   1.14e-4 and 5.94e-5 (ratio 0.52), so still counting trial 7's
   cancellation (its signed change 2.4e-7). Proposed to the reviewer, who
   accepted it on conditions (R4).
10. Mach 3 (the same nose): level 1 did not converge: 20,000 iterations,
   the residual between 1e-4.6 and 1e-6, the drag swinging by 6.3e-4 of
   its value over the last quarter (a limit cycle); level 2, started from
   it, converged to 1e-11 in 1,074 iterations.
11. The limiter on that level 1, restarted from level 0: Venkatakrishnan's
   coefficient 0.5 converges (3,038 iterations); Wang's variant (scaled by
   the solution's range) and coefficient 5 do not (the drag swinging by
   8.8e-4 and 2.4e-2 of its value).
12. Coefficient 0.5 on Mach 1.3, 2 and 3 (levels 0 to 2): every level 1 and
   2 converges (Mach 3's level 0 swings by 1.6e-4); the regional changes
   fall at ratios 0.41, 0.33, 0.30. The tool's integral, closed at L,
   against SU2's own axisymmetric force: 0.15% to 0.17% apart on level 1,
   a quarter of that on level 2, 7e-5 on trial 8's level 3 (the
   quadratures differ at second order). But the stagnation streamline:
   its total pressure, uniform along the axis between shock and wall, is
   at Mach 2 0.15% above pitot on level 1 and 2.5% below on level 2 (the
   stagnation vertex 3.1% below), growing with refinement; at Mach 3 1.4%
   below and at Mach 1.3 0.8% above on level 2. With coefficient 0.05
   (trial 8) it was 0.7% below on level 3. The deficit is confined near
   the axis: from r = 0.01 out the wall's Cp agrees within 0.4% between
   every setting and level (about 0.03% of the drag), and U_cap (R4)
   counts it about tenfold.
13. Coefficient 0.25 at Mach 2: levels 1 and 2 converge; the stagnation
   vertex 1.25% and 2.5% below pitot, also growing. So every coefficient
   tried leaves level 2's stagnation streamline 1.3% to 3.1% low, and 0.05
   the least, the only one seen to recover on level 3. The coefficient is
   0.05 (R3), most accurate at the stagnation point; its limit cycles
   (trial 10, 0.063% of the drag) are carried as an iterative error. At
   Mach 3, 0.25 stalls on level 1 too (the drag swinging by 4.7e-4 of its
   value), so another coefficient is no cure, and a case is never rerun
   with one (R3).

## Registration (2026-11-21, revised after its review the same day; before any check below and any W6 case runs on SU2)

Made after the set-up trials above, which ran on a sharp cone and on
capped tangent ogives off W6's case list, and before anything below
runs. Its first form (commit 65c8443a) was reviewed independently (the
review: next section) and revised to it, with the further set-up trials 9
to 13; the revision is re-reviewed before anything runs. Anything changed
after that is added as a dated note saying what changed and whether any
result had been seen. `judge.py` computes the verdict exactly as written
here; the settings are `SETTINGS`, `capped_spec` and `sharp_spec` in
`w6ref.py`, both as committed with this registration.

**R1. The quantity.** The nose's pressure drag coefficient on the base
area (cap included; the cylinder adds none), gamma 1.4, inviscid, zero
incidence: the integral of Cp d(r^2) / R^2 from the tip to the nose's
end, closed there at r = R (`wall_to`: Cp taken linearly in x between
the wall's vertices either side of x = L). W6's geometry (its section 1;
this tool's within 2e-14 of it), with two calibers of cylinder behind, as
W6's lanes.

**R2. The cases.** W6 section 3's, unchanged: for the tangent ogive and
for the Von Karman nose, the eight corners of 3 and 5 calibers, r_n/R
0.03 and 0.15, Mach 1.3 and 3, and the four interior points (5, 0.05,
2), (3, 0.15, 2), (5, 0.05, 1.3), (5, 0.05, 3): 24 cases.

**R3. SU2's runs.** For every run: HLLC, MUSCL with Venkatakrishnan's
limiter, coefficient 0.05 (trials 10 to 13), implicit Euler stepping, CFL
1 adapting up to 10, each level to an RMS density residual of 1e-11 in at
most 8,000 iterations (converged levels took 270 to 3,100). A level used
that stops at the limit instead counts only if its drag (SU2's force on
the base area) ranges over at most 0.1% of its value in its last quarter
of iterations and the means of its last two eighths differ by at most a
quarter of that range (a cycle, not a slow drift); that range is then its
iterative error, the levels' ranges are added to U_su2 and they make the
rates of R4 less favourable (Amendment 1, below, adds a second way for
such a level to count). Four
nested levels: level 0 (64 x 32 cells on a C grid) first order from the
free stream, then second order; levels 1, 2 and 3 (512 x 256) each
started from the level below (trial 6), and none otherwise (the tool
stops if the level below is missing). C grids for capped noses: along the
wall the first cell of level 0 a quarter of the tip radius (3 to 4 cells
on the cap there, 28 to 39 on level 3); the outer boundary at a + k s
from the wall, a = 4 times Billig's standoff (0.143 r_n exp(3.24 / M^2)),
k = 1.5 / sqrt(M^2 - 1). H grids for the sharp noses of the checks
(`sharp_spec`). The largest corner skew (cosine) is 0.86 to 0.87 on the
Mach 1.3 grids, 0.62 to 0.65 at Mach 2, 0.44 to 0.47 at Mach 3 (trial 2's
0.24 holds around the cap only). On each level used: |Cp| on the outer
boundary at most 1e-6; the bow shock's reach (the outermost vertex with
|Cp| above 1e-3, as a fraction of its grid line) at most 0.9; the least
Mach number on the outlet above 1; every cell's area positive; the tool's
drag within 0.5% of SU2's own axisymmetric force on the wall (CD on a
reference area of 1, over pi R^2) on level 1, a quarter of that on each
level after (the quadratures differ at second order, trial 12), except
on the sharp cone, which meets its cylinder at a corner where the two
differ on every level (V1(b) tests the integral there against the exact
drag). A case that fails the shock's or the
boundary's checks is run again in full with a and k (H grid: the outer
line's rise) times 1.25, at most twice, each rerun in the run's folder and
the earlier attempt kept beside it as `<run>.try1`, `.try2` (`judge.py`
accepts a widened run only with its earlier attempts, each failing those
checks); the tool never overwrites a run. Any other failure (a level used
that neither converges nor meets the iterative rule, the force check) has
no rerun: the case gives no reference.

**R4. SU2's value and uncertainty.** The value D is the drag on level 3.
From the drags D1, D2, D3 on levels 1 to 3, and the changes of the drag's
distribution between them (`changes`, on the finer level's segments, the
coarser level's Cp linear in r^2, both closed at x = L):
- from the total: e12 = D2 - D1, e23 = D3 - D2; with the levels'
  iterative ranges s1, s2, s3 (R3; zero where a level converged), a12 =
  |e12| - s1 - s2 and a23 = |e23| + s2 + s3; if e12 and e23 have the same
  sign and a23 < a12, p = log2(a12 / a23) and U_total = 1.25 a23 /
  (2^min(p, 2) - 1); otherwise U_total = 3 max(|e12| + s1 + s2, a23);
- from the distribution, by regions (trials 7 to 9; the review's
  conditions): the regions are [0, x0] with x0 the cap's tangent point (L
  / 128 on a sharp nose), then each next region's end twice the last end
  but at most half a caliber further, to L (`regions`); a segment belongs
  to the region holding its midpoint in x; V is the sum over regions of
  |the change of the drag integral in the region| (cancellation inside a
  region, none between regions; the cap is one region, so on it, and on
  the hemisphere of V5 whose whole nose is cap, only the vertex-level
  measure below sees cancellation). With V12 - s1 - s2 and V23 + s2 + s3,
  rho = their ratio; if rho < 1, U_dist = (V23 + s2 + s3) r / (1 - r)
  with r = max(rho, 0.5) (the rest of a geometric series, never taken
  faster than first order); otherwise no reference;
- the same change without any cancellation (the sum of every segment's
  |change|), taken the same way, must fall too: its ratio below 1, or no
  reference;
- the cap's term (the review's 1.3): U_cap = the larger of |Cp0 /
  Cp_pitot - 1| on the two finest levels used (it changes sign between
  levels, trial 8), times the cap's drag (the integral to the tangent
  point) on the finest, with Cp0 the stagnation vertex's;
- U_su2 = max(U_total, U_dist) + U_cap + the iterative errors of the
  levels used (R3; zero for a level that converged).
A case gives a reference if every level used converges and passes R3's
checks, V2 holds on its finest level used, both ratios are below 1, max(U_total,
U_dist) is at most 0.5% of D and U_su2 at most 1% of D. If it fails only
on the ratios or these limits, level 4 (1024 x 512, `w6ref.py level4`) is
run once from level 3 and R4 is applied to levels 2 to 4; level 4 is used
nowhere else (but in V4).

**R5. The checks,** before any W6 case runs. All must pass, or no W6 case
runs and the route goes back to the owner.
- V1, sharp cones (H grid), 3 calibers (9.46 deg), Mach 1.3 and 3: (a) on
  level 3, the wall's Cp at every vertex from x = L/3 to 0.8 L within 0.1%
  of the Taylor-Maccoll value (the tip's region and the corner's smearing,
  trial 3, outside that); (b) the drag up to the last vertex of level 1 at
  or ahead of 0.8 L (a vertex of every level), with R4 applied to it,
  within its U_su2 of the exact value (Taylor-Maccoll's Cp times r^2 /
  R^2 there), within R4's limits.
- V2, the stagnation point: on level 3 of every capped run, the
  stagnation vertex's Cp within 3% of the Rayleigh pitot value (a gross
  check of the bow shock's strength; its measured error is in U_su2
  through U_cap); run on the off-list capped ogive (4 calibers, r_n/R
  0.08) at Mach 1.3, 2 and 3, and on every W6 case as part of R4.
- V3, the tangent ogive of NACA TN 3716 (3 calibers, sharp, H grid), Mach
  1.98: the drag within its U_su2 (R4) of the method of characteristics'
  0.0988034 (0006, converged to 1e-7), within R4's limits.
- V4, R4 itself on capped noses (the review's condition (a)): level 4 of
  V2's runs at Mach 2 and 1.3. With D3, U(1 to 3), D4, U(2 to 4) and r the
  ratio R4 used on levels 1 to 3: |D4 - D3| at most (1 - r) times
  max(U_total, U_dist) from levels 1 to 3, and D4 +- U(2 to 4) inside D3
  +- U(1 to 3).
- V5, a blunt drag on the C grid (blocking only): the hemisphere-cylinder
  at Mach 2 and 3 against the project's fitted values (0006: 0.788934,
  band 0.023%; 0.849320, band 0.010%): R3's checks pass, both of R4's
  ratios are below 1, and the difference is within U_su2 plus that band;
  R4's 0.5% and 1% limits are not applied
  (on a hemisphere U_cap is the stagnation error times the whole drag).
  The difference against the grid part alone is reported too, a measure
  of how much U_cap over-counts. Agreement licenses nothing; a
  disagreement stops the route.
V1(b) and V3 test R4 on sharp flows on H grids; V4 and V5 on capped
flows on C grids. Both solvers capture the embedded shock with
finite-volume HLLC schemes: different codes, grids and limiters, a
similar method; the checks with exact answers above have no embedded
shock.

**R6. The fitted solver's side.** W6 section 3, as W6's
`analysis/references.mjs` computes it, with the review's changes: the
drags on nj = 20, 40 and 80, every grid converged and passing the page's
checks; if the three are monotone, p from them capped at 2 (not finite:
2), D_proc = T80 - (T40 - T80) / (2^p - 1), U_proc = 1.25 |T40 - T80| /
(2^p - 1); if not monotone, the page's rule for oscillation: D_proc =
T80, U_proc the range of the three; an order finite and not above 0 gives
no reference. The eleven families W6 left without nj = 80, and the
hold-out's four (R7), are fitted by W6's own runners on the lanes'
frozen source (`fitted/lane.sh`), started on 2026-11-21 under W6 section
3's own registration (2026-10-26), which fixes how they run; they see
nothing of SU2. Their nj = 20 and 40 refits must reproduce the lanes'
drags within 1e-9 of their value (so far they do to every digit:
0.091072746574589664, 0.090914484667827256, 0.072716489695764344,
0.072594667719958761). **The departure, accepted by the review:** the
3-caliber ogive at 0.15, Mach 1.3, whose nj = 80 fit oscillated within
0.100929446 to 0.100929543 (about 1e-6 of its drag) from 6,000 to 28,000
iterations (W6 section 4), is counted with that whole range added to its
U_proc and to its miss (R7), only from the lanes' own record and only if
that record's drag lies in the range; it is named in the verdict, and if
it sets the largest miss or disagrees the allowance is given without it
too. The page keeps refusing any fit that does not settle.

**R7. The comparison and the allowance.** For each case with both:
delta = D_proc - D_su2.
- Agreement, reported for every case: |delta| <= U_proc + U_su2. A case
  that disagrees counts like any other (its miss sets the allowance), and
  the label says how many disagree.
- The miss, against the far end of SU2's interval: m = (|delta| + U_su2 +
  the oscillation's range, R6) / D_su2.
- The allowance (W6 section 3's rule): A = twice the largest m over every
  case of both shapes, rounded up at two significant figures, and for each
  shape at least its sharp nose's allowance (7e-5 for the ogive, 8e-4 for
  the Von Karman nose). It applies to capped noses only. The factor 2 is
  a convention; the hold-out below measures it.
- Each case's band, D_proc +- (U_proc + A D_proc), contains SU2's
  interval by construction unless D_proc is under half of D_su2: reported
  as a consistency check, not a test.
- Rounded tips are served only if A is at most 2% of the drag; above that
  the owner decides, with the numbers (W6 section 11 (c)).
- The hold-out, after the verdict, off W6's list: the ogive of 4 calibers,
  r_n/R 0.08, at Mach 1.3, 2 and 3 (SU2 from V2's runs, R4 as for any
  case) and the Von Karman nose of 4 calibers, 0.08, at Mach 1.3 and 2
  (their own SU2 runs, `runs/H-vk4rn0.08M1.3` and `M2`); each fitted by
  R6. Each band with A must contain SU2's interval; if one does not, or a
  hold-out case gives no reference on either side, that shape goes to the
  owner.

**R8. The served region.** For each shape, the outline (convex hull) in
calibers, r_n/R and Mach of the cases that give a reference on both
sides; a hull with no extent in one of the three serves nothing; tips
below r_n/R 0.03 stay refused. If any of the shape's registered cases
that does not give a reference on both sides lies inside or on that
outline, the shape is not served (the hardest cases are the likeliest to
drop out). Outside it a capped nose is refused with the reason. The label
says: the model's own error (inviscid against measured) is not in the
band, as for every nose without a measured box; the allowance was set
from the fitted solver's three-grid extrapolations (nj = 20 to 80) while
the page serves four or five grids, whose bands on capped noses no
reference has checked (W6 section 3's nj = 160 families are not run
here); and how many cases disagree.

**R9. The order.** (1) This revision reviewed again, by the same
reviewer (done: the re-review below, its changes made); (2) V1 to V5; (3)
the 24 cases on SU2 and the hold-out's Von Karman runs; the fitted
families (running); (4) `judge.py`'s verdict,
recorded with every case and the hold-out, then reviewed; (5) only if it
serves: W6's geometry and capped families brought to the main line, the
page's tip-radius input (0014 P4), the refusal lifted inside the outline,
the label, the refusal audit run again, each reviewed.

### Amendment 1 (2026-11-21, after V5 at Mach 2's level 2; the owner's decision)

Made after a result, and said so. V5 at Mach 2's level 2 stopped at
8,000 iterations with an RMS density residual of 1.03e-11 against the
target 1e-11. Its drag ranged over 3.4e-9 of its value in the last
quarter, but the means of its last two eighths differ by 0.48 of that
range against R3's 0.25 (the checks, below). The drift is real, not
round-off: the means of its eight eighths change by 1.77e-8, 7.43e-9,
3.07e-9, 1.27e-9 over the last four, each 0.420, 0.413, 0.413 of the one
before, while the residual falls by 0.412 per 1,000 iterations. It is the slow drift
R3's test was written to catch, decaying with the residual, and the
geometric remainder puts the level within about 1e-9 of its drag of its
limit. R3's test is relative to the range with no floor, so it refuses a
drift this small. The owner chose to amend the rule, reviewed before use,
rather than stop the route or rerun the case. When it was made, V5 at
Mach 2's level 3 and V5 at Mach 3, V2, V4 and every W6 case had not run;
V3 and V1 had passed without it (every one of their levels converged on
its residual), and it changes neither.

The rule, applied to every level of every run: a level used that stops
at its limit and fails R3's rule also counts if
- its drag's range over its last quarter and the difference of the means
  of its last two eighths are each at most 1e-8 of its drag;
- its RMS density residual is at most 1e-10, a decade from the target;
- the drift is not growing: the difference of the last two eighths' means
  is at most that of the two eighths before them, read from the level's
  committed `history.csv` (whose last two eighths must be the record's).
Its iterative error is then the range plus 8,000 times that difference:
an eighth's drift (1,000 iterations) going on, undecayed, for a thousand
more runs of 8,000 iterations. It is a bound for a drift that does not
grow, which the third condition asks; at the floor it is at most 8e-5 of
the drag, a sixtieth of R4's 0.5%. On V5 at Mach 2's level 2 it is
1.29e-5 of the drag, against a geometric remainder (the drift's own
decay, 0.413 per eighth, summed) of 9e-10, 1.1e-9 of the drag. It stands
in R4's rates and in U_su2 as R3's range does (`judge.py`, `SETTLED`). A
level that meets R3's own rule keeps R3's error. Because a larger U_su2
makes a check easier to pass, every check that compares with U_su2 (V1,
V3, V4, V5) passes only if it passes both with the charge and with such
levels charged only their range, and both are reported (`both_ways`);
R7 keeps the full charge.

**Its review** (2026-11-21, independent, given the code and the data):
PASS WITH CHANGES. Required, all made: the residual condition; the
not-growing condition from the committed history; the checks not to pass
on the charge; the reason above corrected (the first form called the
drift round-off); each level's record tied to the case's spec (below).
Optional, made: no record for a level whose SU2 was killed by a signal;
a lock held by the tool and SU2 for the case's folder; the level below's
solution file checked against the hash in its record before seeding; the
charge stated as a bound for a non-growing drift, with the remainder
beside it; the level budget stated as a start condition only; V5 at Mach
2's stagnation deficit recorded before its level 3 finished (the checks,
below). Declined: scaling the floor by SU2's force rather than the tool's
drag (R3's own branch uses the tool's; the two differ by 2.3e-4 of the
drag on this level, which moves the floor by that fraction). The
review found the resumption itself sound, and the three recovered
records bit-identical with everything derivable from their files. The
changes went back to the same reviewer: **confirmed** (2026-11-21), every
required change doing what was asked, `judge.py --checks-only` reproducing
V1 and V3 exactly with and without the charge, and nothing in the main
path broken. Amendment 1 is in force from then.

## The review of the first form (2026-11-21)

An independent review (Fable, given the code and the text, not the
author's conclusions) of commit 65c8443a: **PASS WITH CHANGES**, nothing
to run until its required changes are in. What it found, and what was
done:

1. _The drag integral stopped short of the base_ (blocking, a bug):
   `nose_drag` and `dist_change` kept the wall's vertices up to x = L and
   so ended at the last one ahead of L; no vertex lies at L on the C grids
   (spaced in arc length), so up to 2.3% of the base area was left out on
   level 0, 0.46% on level 1 and 0.07% on level 3 of some registered
   grids (the trials' grids happened to leave out about 2e-6). It biased
   D and inflated e12, shrinking U_total. Fixed (`wall_to`), and the
   tool's drag is now checked against SU2's own force on every level.
2. _The cap's measured stagnation error was not in U_su2._ Added (U_cap).
3. _Nothing tested R4 on a capped flow._ Added V4 (level 4 on two capped
   runs) and V5 (the hemisphere-cylinder).
4. _The regional measure_ (proposed in an addendum after trial 9):
   accepted on conditions, all adopted: the vertex-level ratio stays a
   gate, the regions are fixed in the tool for sharp noses too, regions
   are at most half a caliber, the grid part's limit is 0.5% and U_su2's
   1%.
5. _A failed case inside the served outline was served._ R8 now stops the
   shape.
6. _judge.py_: it took one run of each check as all of them, judged the
   cases when the checks failed, gave no single decision, did not check
   each run's spec against the registered one, used level 4 whenever it
   existed, took R6's departure as a run-time switch and left the
   oscillation out of the miss. All fixed.
7. _A hold-out for the allowance's factor 2:_ added (R7).
8. _The three-grid caveat_ on the label: added (R8).
9. Smaller: the cap's cell counts and the skew at Mach 1.3 corrected;
   minArea and the seeded start checked; no silent defaults in the
   configuration; runs never overwritten; the refits' tolerance; the
   oscillatory rule for a non-monotone fitted triple; the containment
   check relabelled.

Not adopted: tightening V2 to 1.5% (its error now enters U_su2 in full
through U_cap, so V2 stays a gross check); W6's nj = 160 families (15 to
50 CPU hours each; the caveat stands on the label instead).

## The re-review of the revision (2026-11-21)

The same reviewer, of commit 3a93703d: **PASS WITH CHANGES**, five
required, all made before anything ran: (1) the force check exempts the
sharp cone (its corner); (2) V5 is judged as its text says, without R4's
limits; (3) the iterative rule gained the drift guard and the
least-favourable rates; (4) U_cap takes the larger stagnation error of the
two finest levels; (5) a rerun is accepted only with its earlier attempt
kept and failing the registered trigger, and reruns with another limiter
coefficient were removed altogether (V2, V4 and V5 never ran at one, and
trial 13 shows another coefficient does not cure the cycles). Optional,
done: the order's guard against equal coarse drags, V1's failures given
as failures, a Von Karman hold-out at Mach 1.3, each case's settings in
the verdict, R7's word on a hold-out without a reference, and R4's notes
on the cap as one region and on the finest level used.
Its confirmation of those changes found one more hole, fixed: with R4's
limits off for V5, a ratio of 1 or more made U_su2 infinite and V5 would
pass any difference; V5 now needs both ratios below 1. A level is now
taken as converged on its residual alone, before the iteration count.

## The checks (R5), as they finish

Judged by `judge.py`'s functions, exactly as registered:

| Check | Value | Exact | Error | U_su2 | Error / U | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| V3, TN 3716 ogive, Mach 1.98 | 0.0988785 | 0.0988034 | +7.5e-5 (+0.076%) | 2.5e-4 (0.25%) | 0.30 | pass |
| V1(b), cone to 0.8 L, Mach 1.3 | 0.0754283 | 0.0754683 | -4.0e-5 | 1.06e-4 (0.14%) | 0.38 | pass |
| V1(b), cone to 0.8 L, Mach 3 | 0.0474205 | 0.0474416 | -2.1e-5 | 3.5e-5 (0.07%) | 0.60 | pass |
| V5, hemisphere-cylinder, Mach 2 | 0.7896048 | 0.788934 (fitted) | +6.7e-4 (+0.085%) | 0.0513 (6.5%) | 0.013 | **fail**: the vertex-level change grows (ratio 1.81) |

V1(a): the worst wall vertex from L/3 to 0.8 L is 4.5e-4 (Mach 1.3) and
4.2e-4 (Mach 3) from Taylor-Maccoll, against 1e-3: pass. V3's drags on
levels 1 to 3 are 0.0988049, 0.0988886, 0.0988785 (not monotone, so
U_total = 3 times the larger change); the cones' converge at orders 1.75
and 1.43. Still to come: V5 (hemisphere, Mach 3), V2 (the capped
ogive, Mach 1.3, 2, 3) and V4 (level 4 of two of them). V5 at Mach 2
failed (below), so by R5 no W6 case runs.

V5 at Mach 2 fails R3 on level 2, before its level 3 has finished. Level 1
converged (residual 1e-11 in 4,427 iterations). Level 2 stopped at the
8,000-iteration limit with an RMS density residual of 1.03e-11 (the
registered target is 1e-11), so R3's iterative rule decides it: its drag
ranged over 2.7e-9 (3.4e-9 of its value) in the last quarter, well inside
0.1%, but the means of the last two eighths differ by 1.27e-9, 0.48 of the
range, against the registered 0.25. The level does not count, so V5 at
Mach 2 fails "R3's checks pass" and, by R5, no W6 case runs and the route
goes back to the owner. The drift is real and decaying with the
residual (0.413 per 1,000 iterations), about 1e-9 of the drag from its
limit, a millionth of R4's 0.5% grid limit; R3's test is relative to the
range with no floor. Under R3 as registered the route stops here; the
owner chose Amendment 1 (above), reviewed, which counts the level with an
iterative error of 1.29e-5 of its drag. The case's level 3 then runs on
from level 2 as it would have (levels 0 to 2 are not run again; their
records, printed when they finished, match their files on disk exactly).

Recorded before V5 at Mach 2's level 3 finished (the review's point 12):
its stagnation vertex's Cp is 1.6059, 1.5717 and 1.5583 on levels 0 to 2
against Rayleigh's pitot value 1.6573, that is 3.1%, 5.2% and 6.0% low,
growing with refinement; near the axis the wall sits at 1.54 to 1.56. V2's
3% test applies to every capped run on its finest level used and is one
of V5's hard checks (`su2_case`), so unless level 3 comes back to within
3% (Cp at least 1.6076), V5 at Mach 2 fails on it, whatever Amendment 1
says, and by R5 the route goes back to the owner. Were it to pass, U_cap
on the hemisphere (whose whole nose is cap) would be about 6% of the drag
and the agreement within U_su2 would say little; the difference against
the grid part alone is the informative number.

V5 at Mach 2's level 3 (512 x 256, 6,139 s) did not converge. Its RMS
density residual fell to about 1e-6 by iteration 1,500; from iteration
3,000 to the 8,000-iteration limit it cycled between 1e-6.5 and 1e-7.7
(the target is 1e-11). Its
drag ranged over 1.44e-4 (1.8e-4 of its value) in the last quarter, with
the means of the last two eighths 9.9e-7 apart, so R3 counts the level
and charges that range. Amendment 1 plays no part: only level 2 needed
it, and with or without its charge the verdict is the same. Near the
axis the wall's pressure moved by up to 0.10 in Cp from level 2 (r/R
below 0.2), and the stagnation vertex went from 6.0% below the pitot
value to 2.5% above it (1.6988 against 1.6573). In steady inviscid flow
that vertex sits at the pitot value exactly, so level 3's final state is
not a steady solution there. V2's 3% test passes on it, by overshooting.

R5 then decides V5 at Mach 2. The registered measure of the pointwise
change of the wall's drag distribution (no cancellation) was 5.21e-3 from
level 1 to 2 and 9.24e-3 from level 2 to 3: a ratio of 1.81, where both
of R4's ratios must be below 1. The regional ratio is 0.20. **V5 at Mach
2 fails, and by R5 no W6 case runs and the route goes back to the
owner.** Its drag, 0.789605, is 0.085% from the fitted solver's 0.788934:
the drag itself agrees, but the agreement licenses nothing (R5), and the
grid sequence does not show the convergence R4 needs to measure SU2's
error on a blunt cap. U_su2 would be 0.0513 (6.5% of the drag), almost
all of it U_cap (0.0472). Of the pointwise change from level 2 to 3, 26%
is at r/R below 0.2 and 35% at r/R 0.7 to 0.9. Level 3 ran under the
tool as it was before records carried hashes; its record matches the
case's result exactly, and its two hashes were added from its files, as
for levels 0 to 2.

## Revision 2: the trials for a fix (2026-11-21, after V5 at Mach 2 failed; the owner's decision)

Written down, and committed, before any of these runs. The owner chose to
look for a setting that removes the failure, rather than stop the route.
Nothing below changes a check, a limit or a rule: whatever setting is
chosen is registered as revision 2, reviewed independently, and then every
check (V1 to V5) runs again from the start under it, in a fresh folder,
the first runs kept as they are. No candidate runs on a check case or a W6
case, and no fitted value is looked at.

What failed. On V5 at Mach 2 the error starts at the bow shock on the
axis: the total pressure just behind it is 4.8% low on level 2 and 2.3%
high on level 3, and is carried unchanged along the axis to the nose (the
stagnation vertex reads it). Off the axis, in the subsonic region behind
the shock, total pressure below the pitot value (which no streamline
can have) reaches 6.2% low on level 2 and 2.4% on level 3. Trials 4 and 11 to 13 already
tried Roe's scheme (7% low), AUSM+-up2 and SLAU2 (no convergence) and
Venkatakrishnan's coefficients 0.25, 0.5 and 5 and Wang's variant; every
one left the stagnation streamline wrong and growing with refinement.

The trial case T: the hemisphere-cylinder of V5 at Mach 2.5, on the grids
the registration builds for it (`capped_spec`), levels and iteration
limits as registered. The candidates (`trials-r2/trial.py`), each
changing only the flux scheme, the limiter or the gradients:

| | Setting |
| --- | --- |
| S0 | the registered one (HLLC, Venkatakrishnan 0.05, weighted least-squares gradients): the control |
| S1 | HLLC, Van Albada's limiter (SU2's edge form) |
| S2 | HLLC, Venkatakrishnan 0.05, Green-Gauss gradients |
| S3 | HLLC, Nishikawa's R3 limiter (coefficient 0.05) |
| S4 | HLLC, Venkatakrishnan 0.05, the limiter frozen after 2,000 iterations of each run |
| S5 | JST (central, its own dissipation, no limiter) |
| S6 | modified Steger-Warming flux splitting, Venkatakrishnan 0.05 |

The screen, on levels 0 to 2 of every candidate: each level converges to
SU2's residual target (1e-11) within its limit, with no rule for a level
stopped at the limit; R3's other checks on levels 1 and 2; the stagnation
vertex within 3% of the pitot value on level 2 and its error no larger
than on level 1; the vertex-level change from level 1 to 2 smaller than
from 0 to 1.

Level 3 runs for the control if it passes the screen, and for at most two
other candidates that pass it, those with the smallest stagnation error
on level 2. Level 3 passes if it converges to 1e-11 within 8,000
iterations; R3's other checks hold; the stagnation vertex is within 3%
and its error no larger than on level 2; and both of R4's ratios on
levels 1 to 3 are below 1, with R4's hard checks passing (its 0.5% and 1%
limits not applied, as for V5).

The choice: of the candidates other than the control that pass level 3,
the one with the smallest U_su2 (R4 on levels 1 to 3). If none passes, or
the control passes level 3 too (so T could not tell a fix from the
registered setting), the route goes back to the owner.

### The trials, as they finish

Corrections, made before the candidate concerned had a result: S5 as
first written ran JST with MUSCL on, which SU2 refuses for a central
scheme (level 0's second stage stopped on that error at once). It is now
MUSCL off, and the tool gives a central scheme the same second stage on
level 0 as the others (`w6ref.CENTRAL`; nothing changes for any other
setting). The first attempt is kept as `trials-r2/runs/S5.try1`.

Every candidate so far fails R3's outer-boundary check on level 1 of T
(|Cp| there 3.8e-6 to 8.7e-5, against 1e-6; level 2 passes it): T's
domain at Mach 2.5, not the setting. R3's remedy is a rerun with the
outer boundary widened (a and k times 1.25), and that is applied here: a
candidate that fails the screen on nothing else is rerun so, as R3 says,
before it is judged.

| | Level 0, 1, 2 residual reached | Stagnation error, levels 0, 1, 2 | Vertex-level ratio | Screen |
| --- | --- | --- | --- | --- |
| S0 | 1e-4.6 (limit), 1e-11, 1e-10.5 (limit) | -3.0%, -4.5%, -5.4% | 0.58 | fail: levels 0 and 2 not converged; stagnation beyond 3% and growing |
| S1 | 1e-11, 1e-11, 1e-9.5 (limit) | -1.2%, +0.7%, -1.9% | 0.30 | fail: level 2 not converged; stagnation error growing |
| S3 | 1e-11, 1e-11, 1e-5.6 (limit) | -3.6%, -5.5%, -5.9% | 0.74 | fail: level 2 not converged; stagnation beyond 3% and growing |
| S2 | 1e-4.7 (limit), 1e-11, 1e-10.6 (limit) | -3.1%, -4.5%, -5.4% | 0.55 | fail: as the control (levels 0 and 2 not converged; stagnation beyond 3% and growing) |
| S5 | 1e-11, 1e-11, 1e-11 (38, 1,333 and 1,813 iterations) | +7.2%, +5.7%, +4.7% | 0.35 | fail: stagnation beyond 3% on level 2 (falling, by about a fifth a level); its wider shock also fails R3's boundary checks on levels 1 and 2 (it reaches the outer boundary: \|Cp\| 1.1e-3 and 2.4e-5 there) |
| S4 | 1e-11, 1e-11, 1e-10.95 (limit) | -3.1%, -4.5%, -5.4% | 0.59 | fail: level 2 not converged; stagnation beyond 3% and growing |
| S6 | SU2 diverged (NaN) in level 0's second stage | | | fail |

**No candidate passes the screen.** None runs level 3, nothing is chosen
(`trial.py judge`: `chosen` null), and by the rule above the route goes
back to the owner. With every upwind scheme and limiter tried, here and in
trials 4 and 11 to 13, SU2's axisymmetric solution leaves the total
pressure on the stagnation streamline wrong. With Venkatakrishnan-type
limiting (S0, S2, S3, S4) the error grows with refinement, to 5.4% low on
level 2. Van Albada's limiter (S1) keeps it within 2%, but its level 2
does not converge and the error still grows. JST (S5) converges on every
level, but its error is 4.7% high on level 2, falling by about a fifth a
level. The drag moves less: on level 2 the candidates lie between
0.827213 (S5) and 0.831601 (S1), 0.53% apart (0.27% without S5). That
spread between schemes on one grid is as large as R4's whole 0.5% grid
limit.

The control fails the screen, as V5 at Mach 2 failed: T shows the same
fault.

## The second solver: OpenFOAM's set-up trials (2026-11-22 and 23, before any registration)

OpenFOAM 13 (`openfoam13` 20260624), its density-based solver
`shockFluid` (the Kurganov-Tadmor central-upwind flux, local time
stepping), inviscid (viscosity 0), on wedge meshes of the tool's own
grids (`ofref.py`: the 2D grid turned by +-2.5 degrees about the axis,
the cells against the axis prisms with no face on it, so no source term
in 1/r; OpenFOAM's `checkMesh` passes the C and the H grids).
Non-dimensional as OpenFOAM's tutorials (p = 1, T = 1, speed of sound 1).
Per iteration, from OpenFOAM's own function objects (it refuses compiled
code when run as root): the RMS over cells of d(rho)/dt under the local
time step, and the drag (the wall's pressure force along x, from
(p - 1) x-hat against the wall's area vectors). Items 1 to 9 are on T,
the hemisphere at Mach 2.5, which is no check case; the later items name
their cases (the sharp cone at Mach 2, the capped ogive of 4 calibers at
r_n/R 0.10 at Mach 1.3 and 3, both on no list, and from item 16 V5's
hemisphere at Mach 2 and 3 on levels 0 to 2).

1. OpenFOAM's usual settings (van Leer reconstruction, Courant number
   0.5): level 0's drag settles within 1.9e-4 but its residual stops at
   1e-0.26. Run time-accurately (one global time step) the same: a
   periodic swing (period 0.085) in the supersonic flow behind the
   shoulder, density 1.5% to 3% there, the subsonic nose region still
   (3e-5). Not the outer boundary (widened 1.56 and 2.44 times: no
   change), not the step (Courant 0.2 and 0.1, van Albada's limiter, the
   Tadmor flux: no change). First-order reconstruction converges to
   1e-11.5 in 9,000 iterations. The cause: OpenFOAM's limited
   reconstructions blend to linear interpolation in smooth flow, where
   the face states then agree and the flux adds no dissipation; with the
   forward-Euler step that is unstable, and the limiter caps the growth.
2. Upwind-biased second order (`linearUpwind` from limited cell
   gradients: minmod, Venkatakrishnan, cubic): level 0's drag steadies to
   1e-6 to 3e-7; the residual still stops near 1e-0.9 (a slow, odd-even
   swing in the shock layer behind the hemisphere-cylinder junction; the
   wall barely moves). Two outer passes a step (a two-stage scheme,
   stable on the imaginary axis): no change on level 0. Unlimited
   gradients diverge at once.
3. Levels 0 to 2 (Venkatakrishnan's gradient limiter, each level started
   from the one below by `mapFields`): **the stagnation region converges
   as SU2's did not.** The wall's first cell (half a cell from the
   stagnation point) -0.38%, -0.02%, +0.17% from the pitot value; the
   total pressure along the axis next to the wall +0.70%, +0.28%,
   +0.22%, at mid-gap +1.16%, +0.75%, +0.47%, all falling with
   refinement (SU2's control on the same levels: -3.0%, -4.5%, -5.4%).
   The drag 0.8287583 and 0.8269291 on levels 0 and 1 (steady to 3e-7 and
   3e-8); level 2 is not steady: its drag wanders between 0.822 and 0.832,
   the motion almost all (97%) on the cylinder near the outlet (x 2.3 to
   2.4), density changing by order 1 an iteration there.
4. The drag's scale (found here, before any use): a wall face of the
   wedge is flat, so its area along x is (r2^2 - r1^2) sin(2a)/2 where the
   body's ring is pi (r2^2 - r1^2). The body's drag is the wedge's times
   2 pi / sin(2a) (72.0915 at a = 2.5 degrees), not 360 / 2a (72), which
   is 0.127% less; checked on the mesh (its wall faces' area along x so
   scaled is pi R^2 to 4e-16). The drags in item 3 were taken the old way;
   times 1.00127 they are 0.8298113 and 0.8279797.
5. Level 2's swing is the forward-Euler step's: two outer passes a step
   (each restarts from the step's start with the latest fluxes, so the
   update is y - dt R(y - dt R(y)), amplification 1 + z + z^2: stable on
   the imaginary axis for |z| < 1, but only down to z = -1 on the real
   axis, so the Courant number goes to 0.3; at 0.5 it failed in 12
   iterations). Level 2 so, from level 1: its drag steady to 6.8e-9 of
   its value from about iteration 6,000 (0.8285365), the residual still
   stopping at 1e-1.78 (a swing inside, not on the wall). The stagnation
   region as with one pass (+0.16%, +0.22%). Drags on levels 0 to 2:
   0.8298113, 0.8279797, 0.8285365 (changes -1.83e-3, +5.57e-4; levels 0
   and 1 with one pass at Courant 0.5).
6. The wall's measures on faces (`ofref.wall_faces`, `faces_drag`,
   `faces_changes`, `boundary_check`): the drag as the sum of each face's
   Cp times its d(r^2)/R^2 equals OpenFOAM's own force on level 2 to 8
   digits. On T's levels 0 to 2 the change of the drag's distribution is
   7.55e-3 then 1.63e-3 face by face (ratio 0.22) and 1.84e-3 then
   5.55e-4 by region (ratio 0.30); SU2's control on the same levels:
   0.58 face by face, with its stagnation point failing. |Cp| in the
   cells against the outer boundary 4e-10 or less, the shock's reach 0.88
   at most, the outlet's Mach number 2.14 or more.
7. Level 3 with the two-pass step, from level 2: it failed at iteration
   76 (negative temperature), the state at 75 showing it growing over a
   few iterations in cells on the hemisphere at about 51 degrees (x 0.17,
   r 0.39), just off the wall. The two-pass step is not a combination of
   forward-Euler steps, so it does not keep the states positive as one
   forward-Euler step with limited reconstruction does; started from a
   level 2 field interpolated onto level 3 it overshot. Next: one pass at
   a Courant number of 0.2 (the long-wave growth of item 1 scales with its
   square).
8. One pass at Courant 0.2, level 2 from level 1: its drag 0.82853652,
   steady to 5.7e-9, the same to 8 digits as with the two-pass step (the
   steady discrete solution does not depend on how it is reached); the
   residual stops near 1e-0.77, the swing inside again, not on the wall.
9. The wedge's angle: level 1 at half-angles 2.5 and 0.5 degrees (points
   at (r cos a, +-r sin a)): drags 0.82797962 and about 0.82841 (the
   second still settling, within 1e-5), 0.05% apart. The cause is
   geometric: each flat face then sits r (1 - cos a) inside its radius and
   tilts, an error of order a^2. With the points on the planes z = +-y tan a
   at y = r instead, every face's width is 2 tan a times its distance from
   the axis, so every area, volume and the sides' pressure force are
   exactly those of the axisymmetric finite volume for an angle of 2 tan a
   (the drag's factor pi / tan a; checked on the mesh to 1e-16). Item 4's
   factor is superseded. Level 1 so at 2.5 degrees (one pass, Courant
   0.2): 0.82841486, where the old placement gave 0.82797962 at 2.5 and
   about 0.82841 at 0.5 degrees. With the new placement at 0.5 degrees
   (90,000 iterations, the thinner wedge's smaller local step):
   0.82840698, settling by 1e-8 a 5,000 iterations. The two angles now
   differ by 9.5e-6 of the drag (from 5.3e-4 with the old placement), the
   stagnation cell the same to 5 digits (Cp 1.71799, axis total pressure
   1.00173 of pitot). The half-angle stays 2.5 degrees.
10. The sharp cone at Mach 2 on the H grid (the old placement): level 0
   converges to a residual of 1e-6.96, levels 1 and 2 stop near 1e-2.4 and
   1e-1.8 with their drags steady to 2.7e-6 and 1.1e-5 (from the wall's
   faces: 0.0947050, 0.0949138, 0.0949438; level 2's 0.0947632 first given
   here had been read with the corrected wedge's factor, cos^2 a too
   small). The wall's Cp from L/3 to 0.8 L against Taylor-Maccoll
   (0.0955290), as fractions of it: worst face 6.7e-4, 1.1e-3, 1.7e-3 on
   levels 0 to 2, mean +1.9e-4, -8.4e-4, -1.3e-3: growing, where V1 asks
   1e-3 on level 3 and SU2 gave 4.5e-4. The old placement's error is of
   order a^2 (2e-3), so the cone was run again on the corrected wedge:
   level 0 converges (residual 1e-6.94), level 1's drag steady to 2.6e-6;
   their worst faces 2.2e-3 and 8.1e-4 of the exact value, means +1.7e-3
   and +6.7e-4: now falling with refinement (ratio 0.37). Level 2 (40,000
   iterations, residual 1e-1.85, drag 0.0950884 within 1.1e-5 over its
   last quarter): worst face 9.9e-4, mean +2.5e-4. But level 2's wall is
   not steady: from one saved state to the next (5,000 iterations) a wave
   of about 1e-3 of Cp, some ten faces long, moves along the wall, where
   level 1's wall changes by 1e-4 between saves and level 0 converges.
   Its worst face is the wave's crest, so V1(a), 0.1% at every vertex of
   level 3, would be decided by the unsteadiness, not by the grid.
11. The capped ogive of 4 calibers, r_n/R 0.10, at Mach 1.3 (off every
   list; SU2's trial 9): level 0's drag not steady (range 1e-3 of it, the
   residual 1e-3.8), level 1 converged (residual 1e-7.35, drag 0.0625783
   steady to 7.7e-7). Its stagnation cell +1.28% and +0.77% from pitot on
   levels 0 and 1 (SU2: +6.3%, +2.4%, +1.0% on levels 0 to 2). Level 2:
   converged (residual 1e-4.1, drag 0.0623504 steady to 3.4e-8); the
   stagnation cell +0.43%; the axis's total pressure next to the wall
   +6.3%, +1.85%, +0.59% on levels 0 to 2, at mid-gap +2.8%, +2.2%, +1.4%:
   all falling. Drags on levels 1 and 2: 0.0625783, 0.0623504 (SU2's
   0.0625085, 0.0624740). (Its levels on the corrected wedge.)
12. T's level 3 (the old placement), single pass, Courant 0.2, from level
   2: no failure; after 9,949 iterations its drag still moves by about
   2e-5 (0.82906 to 0.82910), the residual near 1e0.3; about 70
   iterations a minute on 2 processes beside other runs, four times
   slower a cell than level 0. The monitors (eight function objects, six
   of them whole-field operations) now run every tenth iteration.
   At 19,000 iterations its drag (from the wall's faces) 0.82906, swinging
   within 8e-5 over the last 5,000; the residual still near 1e0.3. The
   stagnation region is still settling: the wall's first cell +0.61%,
   +0.29%, +0.23% from pitot at iterations 5,000, 10,000 and 15,000, the
   axis's total pressure next to the wall +0.56%, +0.28%, +0.22%. Level 2
   had settled by 20,000 (+0.162% and +0.218% from then to 30,000, to 3
   digits). Measured on the levels as they stand (level 3 at 15,000): the
   drag's change between levels 1 and 2 is +5.55e-4, between levels 2 and
   3 +5.20e-4, nearly all of the latter between 10 and 40 degrees from
   the axis, where level 3 is still settling; the regional ratio 0.94, the
   face-by-face ratio 0.46. Not judged until level 3 has settled. It did
   not settle: at iterations 20,000, 22,556, 25,000 and 30,000 the wall's
   first cell +0.190%, +0.192%, +0.290%, +0.265% from pitot, the drag
   0.829016, 0.829013, 0.829025, 0.829024; at 30,000 the changes between
   levels 2 and 3 +4.88e-4 by region (ratio 0.88 to levels 1 and 2) and
   7.11e-4 face by face (ratio 0.44). As on the cone's level 2, the finest
   level wanders instead of converging. Of the
   stagnation numbers, part is the old placement's: on level 1 the
   corrected wedge gives +0.173% on the axis where the old gave +0.280%.
13. Where the cone's flow moves: between saved states the pressure
   changes most (1e-3 of it) in the cells of the captured oblique shock,
   and from there across the shock layer to the wall. Other gradient
   limiters on the cone's level 1 (corrected wedge, from level 0, 30,000
   iterations, Courant 0.2), against Venkatakrishnan's (k = 1: residual
   1e-2.43, wall change between saves 1.1e-4 of Cp, mean error +6.7e-4,
   worst 8.1e-4): Venkatakrishnan's with k = 0.5 (bounds widened by the
   neighbours' range) 1e-2.07, 9.9e-5, +1.5e-3, 1.8e-3; k = 0.8 1e-2.07,
   9.3e-5, +1.5e-3, 1.8e-3; the cubic limiter (r_t 1.5) 1e-2.31, 1.0e-4,
   +1.4e-3, 1.5e-3. None settles the wall and each doubles the error.
   (OpenFOAM accepts the multi-directional limiter only with minmod.) The
   cause is the step, not the limiter: OpenFOAM's linearUpwind from the
   cell gradient is, in one dimension on a uniform grid, Fromm's scheme,
   and one forward-Euler step of it is unstable for long waves at any
   Courant number nu (its squared amplification 1 + nu^2 theta^2 - nu
   theta^4 / 4 to leading order in the wave number theta; at most 1.0048
   a step at nu = 0.2, 1.089 at 0.5, computed over all theta), so
   wherever the limiter is off the flow grows until the limiter acts, a
   limit cycle; the limiter's threshold of SU2's version would leave more
   of the flow unlimited, not less. A two-stage strong-stability-
   preserving step (Heun's) damps every wave of Fromm's scheme up to nu =
   0.9 at least (computed; 1.22 at nu = 1.1) and keeps a state positive
   whenever one forward-Euler step does. OpenFOAM's two passes
   (item 5) are not that step. `shockFluidHeun` (openfoam/, beside this
   file) is shockFluid with one change: with two outer passes, the second
   pass's mass, momentum and energy fluxes are the means of the first
   pass's and its own, which is Heun's step exactly, the local time step
   fixed through it and no intermediate state formed (the two-pass
   failure of item 7 was a negative temperature in such a state). With
   one pass it is shockFluid.
14. Heun's step on the cone's level 1 (as item 13): at Courant 0.2 the
   residual stops at 1e-2.48, at 0.5 at 1e-2.46, the wall changing by
   5e-5 to 9e-5 between saves, the errors as before; so the step was not
   the cause. With Heun's step at 0.5: unlimited gradients 1e-2.19,
   minmod 1e-2.27, Tadmor's flux 1e-2.97 (mean error +1.0e-3); first
   order converges (1e-11.17 by 12,000 iterations, mean error +1.7e-2).
   The multi-directional limiters (forward Euler): cell-based (minmod)
   1e-1.55, face-based 1e-1.95, means +1.6e-3 and +1.7e-3. In every case
   the flow moves most in the captured shock's cells. The cause:
   `linearUpwindV`, the reconstruction of the momentum, is not the
   gradient's extrapolation alone. It drops the correction when it points
   against the face's difference and cuts it to linear interpolation
   when it is longer (OpenFOAM's `linearUpwindVTemplates.C`), a switch
   on many faces even with unlimited gradients, and linear interpolation
   is item 1's unstable central value. With the plain `linearUpwind`
   (each component from its limited gradient, as for rho and T):
   Venkatakrishnan's limiter and Heun's step at Courant 0.5 reach
   1e-10.7 by 12,000 iterations; unlimited, 1e-10.5; Venkatakrishnan's
   with OpenFOAM's own one-pass step at Courant 0.2, 1e-8.3 at 19,500
   and falling (1e-10.4 at 30,000). The Venkatakrishnan runs give the
   same drag to 8 digits (0.09498568): one steady discrete solution,
   reached two ways. Its wall from L/3 to 0.8 L: worst face 3.2e-5 of
   the Taylor-Maccoll value, mean +1.1e-6 (with `linearUpwindV`, 8.1e-4
   and +6.7e-4); unlimited, 3.2e-4 and +3.1e-4. Heun's step costs 1.45
   times a pass and reaches 1e-8 in about 0.6 of the one-pass step's time.
15. That scheme (`linearUpwind` for rho, the momentum and T from
   Venkatakrishnan-limited gradients, Heun's step at 0.5, each level
   stopped once the residual has been at or below 1e-10 for 50
   iterations), the corrected wedge:
   - the cone at Mach 2, levels 0 to 2 (level 0 from the free stream):
     converged in 14,694, 9,906 and 5,183 iterations; drags 0.0947372,
     0.0949857, 0.0950441 (changes +2.49e-4, +5.84e-5, ratio 0.23); the
     wall from L/3 to 0.8 L against Taylor-Maccoll, worst face 4.5e-4,
     3.2e-5, 7.6e-5 of it, means +3.9e-4, +1.1e-6, -5.2e-5.
   - T, levels 0 to 2: converged in 7,110, 9,610 and 16,470 iterations;
     drags 0.8280565, 0.8272772, 0.8285204 (changes -7.79e-4,
     +1.243e-3); the wall's first cell -0.43%, -0.06%, +0.30% from
     pitot; the axis's total pressure next to the wall +0.66%, +0.24%,
     +0.35%. Along the axis from the wall to the shock the total pressure
     rises (level 2: +0.35% at the wall, +0.61% a third of the way out,
     +0.87% at 0.6, +2.65% in the cells just behind the shock; level 0
     +2.6%, level 1 +1.6% there), where the exact flow has pitot's value
     all along: the captured bow shock leaves too little entropy on the
     stagnation streamline, and the excess just behind it does not fall
     with refinement. The old scheme's profile is the same within 0.3%.
     Between levels 0 and 1 the drag's distribution changes by up to 1%
     of Cp (minus from 10 to 50 degrees, plus from 50 to 90, cancelling
     in the total), between levels 1 and 2 by up to 0.35% (plus almost
     everywhere). Level 3: item 16.
   - the capped ogive at Mach 1.3 (4 calibers, cap ratio 0.10), levels 0
     to 2: level 0 stopped at its 30,000-iteration limit at 1e-8.94
     (drag range over the last quarter 1.2e-8), levels 1 and 2 converged
     (20,193 and 20,805 iterations); drags 0.0626185, 0.0623083,
     0.0622263 (changes -3.08e-4, -8.31e-5); the regional changes 6.54e-4
     and 2.75e-4 (ratio 0.42), the vertex changes 9.83e-4 and 4.97e-4
     (ratio 0.51); the wall's first cell +1.24%, +0.80%, +0.49% from
     pitot; the axis's total pressure next to the wall +6.4%, +1.9%,
     +0.6%, halfway out +2.9%, +2.2%, +1.4%.
16. T's level 3 (512 x 256, from level 2 by mapFields) does not
   converge on that scheme. Its residual fell to 1e-1.64 by iteration
   4,000, rose to 1e-1.0 by 4,250, and from there to 8,000 cycled between
   1e-1.0 and 1e-1.3 with a period of about 250 iterations. The drag
   swung between 0.82897 and 0.82939 (range 4.8e-4 of it per 1,000
   iterations, mean 0.82922; from 3,000 to 4,000 the range was 4.8e-5).
   The motion fills the subsonic layer between the bow shock and the
   hemisphere from about 25 to 40 degrees from the axis: |d rho/dt| up
   to 3 (in rho_inf = 1.4 units) in the cells against the wall, the wall's
   pressure there changing by 0.15% between saves 134 iterations apart,
   and the shock moving by a cell at 20 degrees. The run was stopped at
   iteration 8,100.
   OpenFOAM's `Venkatakrishnan` gradient limiter is the bare function of
   r, (r^2 + 2r)/(r^2 + r + 2) (`VenkatakrishnanGradientLimiter.H`),
   without the smoothing term eps^2 = (K h)^3 of Venkatakrishnan's paper
   (J. Comput. Phys. 118, 1995). That term is there because without it
   the limiter acts in smooth flow and at smooth extrema and stalls or
   cycles a steady solver. `cellVenkatakrishnanGrad` (openfoam/, beside
   this file) is OpenFOAM's `cellLimitedGrad` with the full form: for
   each face, psi = (d1^2 + eps^2 + 2 d1 d2)/(d1^2 + 2 d2^2 + d1 d2 +
   eps^2), the least over the faces, capped at 1, per component, with h
   the square root of the cell's wedge-face area. With K = 0 its
   gradients equal `cellLimited<Venkatakrishnan> Gauss linear 1`'s to
   round-off on T's converged level 1 (largest difference 3.9e-16 of the
   largest gradient, for rho, U and T). With K = 5 they differ in 85% of
   the cells (by up to 0.8%, 1.4% and 2.0% of the largest gradient):
   OpenFOAM's limiter is active almost everywhere, not only at the shock.
   Restarts of level 3 from its oscillating save (iteration 5,000), one
   core each:
   - unlimited gradients: the residual falls steadily (1e-0.58 at 6,000,
     1e-1.53 at 8,000, 1e-2.03 at 9,500, about 0.4 decades per 1,000
     iterations). OpenFOAM's limiter with its coefficient 0.5 (bounds
     widened by the neighbours' whole range) is the same run to 10
     digits: at 0.5 the limiter almost never acts.
   - `cellVenkatakrishnan` at K = 3 and K = 10: still cycling between
     1e-0.9 and 1e-1.3 after 1,750 iterations (K = 10 resumed for longer;
     K = 30 running).
   Where OpenFOAM's limiter acts at the two saves 134 iterations apart
   (its gradients against unlimited ones, the same states): limited
   (psi < 0.999) in 90 to 100% of the cells from 25 to 40 degrees, but
   switching (psi changing by more than 0.05) in at most 1 of them below
   the shock, against 266 to 336 per field in the shock's band (j 120 to
   144) there; the many switches ahead of the shock are round-off in the
   uniform stream. The cycle is the shock and the limiter's switching
   together, which eps cannot reach (a shock's jump is far above eps).
   Unlimited gradients cannot start from the free stream: T and the
   hemisphere at Mach 3 both stop at iteration 7 on a negative
   temperature in the flux. But at level 3 the unlimited flow (residual
   1e-1.9, iteration 9,000) is much nearer the exact stagnation flow than
   the limited one (cycling, iteration 5,000): the axis's total pressure
   at the wall -0.15% from pitot against +0.31%, a third of the way out
   -0.14% against +0.39%; the wall's total pressure at 5, 10, 20, 30
   degrees -0.01%, +0.08%, +0.11%, +0.06% against +0.54%, +0.49%, +0.29%,
   +0.13%. The bare limiter clips the smooth extremum at the stagnation
   point (first order there), and that is most of item 15's excess on
   the axis; eps is meant to stop exactly that. The unlimited shock has
   wiggles (the axis's pressure 4.5% under the free stream just ahead of
   it, 2 to 3% over and under behind it).
   `cellVenkatakrishnan` at K = 10 starts from the free stream at Mach 3
   (the hemisphere, level 0, through the registered runner `run_case`):
   converged to 1e-10.8 in 7,830 iterations, drag 0.8472382, the axis's
   total pressure at the wall -0.06% from pitot. Its wall cell's Cp is
   1.13% under pitot: the cell's centre is off the stagnation point, a
   geometric offset of a cell-centred code, so the first cell's total
   pressure on the axis, not its Cp, is the measure of the stagnation
   error here.
   Longer restarts of level 3 (the drag's range over the last 1,000
   iterations, of the drag; the mean): OpenFOAM's limiter 4.8e-4,
   0.82922; K = 10, 3.7e-4 to 4.6e-4, 0.82924 (still cycling at 8,260);
   K = 10 at Courant 0.25, 3.7e-4 to 4.9e-4 (a smaller step does not
   damp it); K = 30, 1.3e-4 to 2.0e-4, 0.82931 (residual wandering from
   1e-1.2 to 1e-2.1); unlimited, converging (1e-2.53 at its 11,000-
   iteration limit, drift 3e-5), 0.83003. eps shrinks the cycle but does
   not remove it.
   Two stages (the limiter to form the shock, then unlimited gradients to
   convergence; `startGrad` in `run_case`): T's level 0 converges (K = 10
   to 1e-10, then unlimited from iteration 6,670 to 1e-10.38 at 24,370,
   drag 0.8280155, the axis's total pressure at the wall -0.18%), but the
   hemisphere at Mach 3 blows up (negative temperature) in the unlimited
   stage even from its converged limited level 0, and a finer level
   seeded from the one below blows up within 27 iterations unlimited at
   both Mach numbers. Unlimited gradients are not robust to Mach 3, and K
   large enough to switch the limiter off at a coarse level's shock
   (eps grows with h) would fail the same way. So the limiter stays; a
   level that cycles is taken by R3's iterative rule, its range added to
   the uncertainty. Which limiter is the more accurate is being measured
   on the hemisphere at Mach 3 and 2 (V5's fitted values), levels 0 to 2,
   OpenFOAM's (K = 0) and K = 10. T at K = 10 so far: levels 0 and 1
   converged, drags 0.8294371 and 0.8277655, the axis's total pressure at
   the wall +0.89% and +0.42% (OpenFOAM's limiter: +0.66%, +0.24%).
   The hemisphere, levels 0 to 2 (one core each; V5's fitted values were
   looked at here, so V5's levels 0 to 2 are no longer blind; its level
   3 has not run under OpenFOAM and does not before the registration):

   | | Mach 3, OpenFOAM's | Mach 3, K = 10 | Mach 2, OpenFOAM's | Mach 2, K = 10 |
   | --- | --- | --- | --- | --- |
   | level 0 | 0.8463366 | 0.8472382 | 0.7883133 | 0.7900539 |
   | level 1 | 0.8465908 | 0.8467179 | 0.7871743 | 0.7882961 |
   | level 2 | 0.8477898 | 0.8478176 | 0.7879624 (cycling) | 0.7881798 |
   | level 2 against the fitted value | -0.180% | -0.177% | -0.124% | -0.096% |

   Every level converged to 1e-10 but OpenFOAM's limiter's level 2 at
   Mach 2: its residual fell to 1e-3.8 by iteration 4,500 and from 5,500
   on cycles about 1e-2.2 (to 21,600 so far); its drag over the cycle
   ranges over 1.8e-5 (2.3e-5 of it), the mean above. That is T's level 3
   cycle, a level earlier. With K = 10 the shock is not monotone on the
   coarse levels: ahead of it, in the last column of cells (the outlet's
   corner, where the bow shock comes nearest the outer boundary), Cp is
   1e-4 to 6e-4 for a few cells on levels 1 and 2 (OpenFOAM's limiter:
   1e-14 one cell ahead of the shock), so R3's outer-boundary check
   (|Cp| at most 1e-6) fails at Mach 3 on levels 0 and 1 (3.9e-3, 1.0e-4;
   level 0's shock reach 0.96 against 0.9) and at Mach 2 on levels 0 and
   1 (2.0e-4, 1.3e-6); OpenFOAM's limiter gives about 1e-13 on every
   level. eps = (K h)^1.5 grows with the cell, and the outer cells are
   the largest. The wall's total pressure (pitot's value all along the
   wall in the exact flow), means over bands of angle from the axis (0-5,
   5-15, 15-30, 30-45, 45-60, 60-75, 75-90 degrees), level 2 at Mach 3:
   OpenFOAM's +0.41%, +0.27%, +0.05%, -0.24%, -0.19%, -0.32%, -0.90%;
   K = 10 +0.44%, +0.30%, +0.07%, -0.22%, -0.19%, -0.33%, -0.90%; at
   Mach 2, K = 10: +0.79%, +0.63%, +0.32%, -0.14%, -0.42%, -0.54%,
   -1.29%. In every band the error about halves from level 1 to 2 (first
   order), with either limiter.
   OpenFOAM's limiter's cycling level 2 at Mach 2, stopped at iteration
   47,610 (still cycling about 1e-2.2): over its last quarter the drag
   ranges over 1.8e-5 (2.3e-5 of it) and the means of its last two
   eighths differ by 7.7e-9 (4e-4 of the range): R3's iterative rule
   takes it, with an iterative error of 2.3e-5 of the drag.
   The capped ogive (4 calibers, r_n/R 0.10, off W6's list), K = 10:
   - Mach 1.3, levels 0 to 2: 0.0626688 (level 0 at its 30,000-iteration
     limit, residual 1e-9.03), 0.0623104, 0.0622429 (converged in 20,380
     and 15,650 iterations); OpenFOAM's limiter (item 15) 0.0626185,
     0.0623083, 0.0622263: they differ by 2.7e-4 of the drag on level
     2. The axis's total pressure at the wall +6.8%, +1.9%, +0.63% from
     pitot (OpenFOAM's limiter +6.4%, +1.9%, +0.6%). The outer boundary's
     |Cp| 6.4e-7, 2.2e-7, 6.8e-12 (within R3's 1e-6).
   - Mach 3, levels 0 and 1, both limiters: level 0 converged (14,200
     and 14,370 iterations), level 1 stopped at its 40,000-iteration
     limit at 1e-9.88 and 1e-9.91 (falling slowly, not cycling); drags
     0.0554738, 0.0554158 (K = 10) and 0.0554287, 0.0553667 (OpenFOAM's);
     the axis's total pressure at the wall +8.6%, +3.8% and +8.5%, +3.7%.
     The outer boundary's |Cp| at most 6.4e-7 with either.
   - Mach 3, level 2: OpenFOAM's limiter stalls, its residual about
     1e-3.2 from iteration 8,000 to 16,640 (stopped there; its drag over
     that stretch 0.0553863, ranging over 2.6e-7 of it, so the motion is
     away from the wall); K = 10 converges steadily (1e-5.5 at 14,000,
     about 0.35 decades per 1,000 iterations), then stalls (item 17).
   **The limiter chosen: `cellVenkatakrishnan` at K = 10.** It converges
   where OpenFOAM's limiter cycles or stalls (the hemisphere at Mach 2 and
   this ogive at Mach 3, both on level 2); the two give the same drags
   (within 2.8e-4 of the drag on every level 2 above) and the same wall
   total pressure. Its cost: the shock's wiggles on the hemisphere's
   coarse levels fail R3's outer-boundary check, which R3 answers with a
   wider domain; that remedy is being tried on the hemisphere at Mach 3.
   The runner (`ofref.run_case`) now leaves the iteration limits out of
   its hash: each level keeps its own limit in its `start.json` and
   record and is checked against it when resumed, so a case can be given
   more levels (`openfoam/trials/rehash.py` moved the trial cases made
   before this to the new hash, after checking each against the old one).
17. Level 3, the wider domain and a stall rule (2026-11-23, K = 10).
   - The ogive at Mach 3: level 2's residual fell to 1e-9.5 by iteration
     29,000 and then stayed between 1e-9.45 and 1e-9.6 (to 39,100 so
     far), its drag fixed to 1.2e-12 of itself over the last 10,000
     iterations; level 1 had stopped at its limit the same way (1e-9.88,
     drag range 3.6e-12 of it). A stall half a decade above the target,
     not a cycle: the drag does not move. Resumed under the stall rule
     (below), it stopped at the 45,000 save (the first save the resumed
     run passed), residual 1e-9.56, drag 0.0554166 ranging over 1.3e-12
     of itself in its last quarter; `ofjudge.level_checks` accepts it by
     R3's iterative rule. Level 3 started from it.
   - The hemisphere at Mach 3 on the domain widened once (a and k times
     1.25, as R3's remedy): level 1's outer |Cp| 4.3e-9 (1.0e-4 before),
     the shock's reach 0.72; level 0's 9.1e-6 (still above 1e-6; level 0
     is not a level used, and the runner widens only for levels 1 on).
     Widened, level 1 did not converge: its residual sits about 1e-6.8 to
     its 40,000-iteration limit while its drag ranges over 1.7e-10 of
     itself (R3's iterative rule takes it); unwidened it converged in
     11,970. Its drag 0.8467342 against 0.8467179 unwidened (1.9e-5 of
     it).
   - A stall rule, so that a stalled level stops before its limit
     (`ofref.stall_test`; `ofjudge.stall_held` checks it again from the
     committed history): from half its limit on, at each save, if every
     residual record of its last quarter is at most 1e-9 and its drag's
     range over that quarter and the difference of its last two eighths'
     means are each at most 1e-9 of its drag. On the histories above it
     would have stopped the ogive at Mach 3's level 2 at 35,000 of 60,000
     and level 1 at 20,000 of 40,000, and not the ogive at Mach 1.3's
     level 0 (its drag still moving by 2e-7 of itself at its limit). The
     judge's check, tried on level 2's history to 35,030, accepts the
     stop at 35,000 and refuses it recorded at 30,000 (where the rule
     does not hold yet: residuals above 1e-9 in its last quarter), at
     35,010 (not a save), with no save, or under a limit of 80,000 (35,000
     is then before half of it).
   - The ogive at Mach 1.3's level 3 (512 x 256, two processes, from
     level 2): its residual fell about a quarter of a decade per 1,000
     iterations (1e-5.47 at 12,340, 1e-8.34 at 23,760) to about 1e-10 by
     31,000, and then stayed between 1e-9.97 and 1e-10.02, at the target
     itself, its drag fixed to 1e-12 of itself. It met the target's five
     records in a row at 38,540 (converged): drag 0.0622265099. The stall
     rule would not have stopped it at the 35,000 save (its last quarter
     there still held residuals up to 1e-8.97); on its whole history to
     38,540 the rule holds (residuals at most 1e-9.60 over the last
     quarter, the drag's range 7.8e-12 of it).
     On levels 1 to 3 the estimate (O4, below) gives D = 0.0622265 and U =
     1.75e-4, 0.28% of D: the regional change 1.49e-4 then 5.6e-5 (ratio
     0.38, order 2.04, monotone), the face-level change 2.68e-4 then
     1.98e-4 (ratio 0.74), U_cap 1.19e-4 (level 2's E; level 3's 6.7e-5),
     no iterative error; V2's measures +0.58% (the axis's first cell) and
     +1.44% (the worst cap face). The case is on no list.
   - The ogive at Mach 3's level 3 (from level 2's stop at 45,000): its
     residual fell about 0.3 decades per 1,000 iterations (1e-5.26 at
     9,640, 1e-8.33 at 20,000) to a floor near 1e-9.24 by 24,000 (between
     1e-9.19 and 1e-9.28 after), its drag fixed to 1e-12 of itself. The
     stall rule, run by the runner under the trial's level 3 limit of
     40,000, stopped it at the 35,000 save (it ran to 35,010):
     `ofjudge.stall_held` accepts the stop from the committed history,
     and `level_checks` takes the level by R3's iterative rule, its range
     5.4e-14 (1e-12 of the drag). Drag 0.0554199320. On levels 1 to 3 the
     estimate gives D = 0.0554199 and U = 1.26e-4, 0.23% of D: the
     regional change 9.17e-5 then 4.64e-5 (ratio 0.51), the face-level
     change 2.37e-4 then 1.12e-4 (ratio 0.47); the drag's own change grew
     (+7.3e-7 then +3.4e-6, so U_total = 3 times the larger, 1.0e-5,
     below U_dist 4.7e-5); U_cap 7.9e-5 (level 2's E; level 3's 5.4e-5),
     the iterative error 3e-13; V2's measures +0.47% (the axis's first
     cell) and +1.76% (the worst cap face; level 2's +2.76%). The case is
     on no list.
   - The residual's floor rises about 0.3 decades a level on that case
     (1e-9.85, 1e-9.56 and 1e-9.24 on levels 1 to 3, the drag fixed on
     each), as round-off in d(rho)/dt does when the local time step
     halves with the cells; the ogive at Mach 1.3's level 3 sits at
     1e-10.0. So level 4 at Mach 3 may sit above 1e-9, where neither the
     stall rule nor Amendment 1's residual condition can hold (O3 below).
     On the trials' histories once the drag had stopped moving, R3's
     drift came to 0.005 to 0.29 of the range.
   - A level 4 trial on the ogive at Mach 1.3 (524,288 cells, four
     processes, from level 3, under the registered limit of 100,000) is
     running, for level 4's iteration limit.
   - The runner's two-process levels now start `mpirun --bind-to none`:
     by default each `mpirun` binds its ranks to cores 0 and 1, so two
     level 3s at once shared two cores at half speed each and left two
     idle (the trials' level 3s ran so from 06:30 to 09:55). Where a
     process runs does not change what it computes.
   - The monitor's start rows: a level, and each resumed run of it,
     writes a row at the iteration it starts from, before any step, where
     d(rho)/dt is 0 (1e-150 in the history). The runner kept those rows,
     and where a run resumed from a save at a multiple of 10 iterations
     its row replaced the one the run before had written there, so the
     stall rule's "every residual at most 1e-9" could have passed on a
     row whose residual was above it. `ofref._joined` now leaves each
     start's own row out. No trial resumed at a multiple of 10 (they
     resumed at 12,341, 15,225, 42,815 and the like), and the stall
     rule's results above are the same without those rows.

## OpenFOAM's registration (2026-11-23, before any check runs on OpenFOAM; in force once its independent review's changes are made and confirmed)

Made after OpenFOAM's set-up trials (the section above, items 1 to 17),
which ran on T (the hemisphere at Mach 2.5, no check case), the sharp cone
at Mach 2 (no check case: V1's cones are at Mach 1.3 and 3), the capped
tangent ogive of 4 calibers at r_n/R 0.10 (off every list) at Mach 1.3 and
3, and the hemisphere of V5 at Mach 2 and 3 on levels 0 to 2 (at Mach 3
also on the domain widened once, levels 0 and 1: item 17). V5's fitted
values were looked at there, the limiter was chosen with those runs in
view (item 16), and O4's cap term and V2's test of every cap face were
written after the hemisphere's wall total pressures and its drags'
differences from the fitted values had been seen. On its levels 1 and 2,
E (O4) came to 0.96% and 0.52% of the drag at Mach 2 and 0.50% and 0.24%
at Mach 3, against level 2's differences from the fitted values of
-0.096% and -0.177%; its worst cap face (the last one) was -3.57% and
-2.07% (Mach 2) and -2.43% and -1.39% (Mach 3) of pitot's Cp on levels 1
and 2. So V5 passing through U_cap was foreseeable, and V5's verdict
also reports its difference against its grid part alone
(`againstGridPart`). V5 widens at both Mach numbers (R3's outer check
fails on level 1 at Mach 2 too: |Cp| 1.28e-6 on H2K10's), so its judged
runs are on domains the trials ran only at Mach 3, levels 0 and 1
(H3K10w1): **at Mach 2 every level of V5's judged run is blind, at Mach 3
levels 2 and 3**. Nothing at or above level 3 has run on a check case,
and no W6 case has run on OpenFOAM. OpenFOAM replaces SU2 as the independent solver (the owner's
choice after SU2's revision 2 failed). Every rule of the registration above
(R1 to R9, with Amendment 1) holds unless this section changes it; where it
names SU2, read OpenFOAM. The SU2 runs are kept as they are and are used for
nothing below. This section is reviewed independently before any check
runs; anything changed after that is a dated note saying what changed and
whether any result had been seen. `ofjudge.py` computes the verdict exactly
as written here, from the records `ofref.run_case` writes; the code is
`ofref.py`, `w6ref.py` (the grids, unchanged), `openfoam/shockFluidHeun`
and `openfoam/cellVenkatakrishnanGrad`, all as committed with this
section.

**O1 (R1). The quantity**, from OpenFOAM's wall faces: the sum over the
wall's faces of the face's cell's Cp times (r1^2 - r0^2) / R^2
(`ofref.faces_drag`). The cylinder's faces add nothing (r constant); the
face across x = L (no grid has a vertex there) closes the integral at
r = R, as R1's closure does. That sum is OpenFOAM's own force on the wall
(its `wallForce` function object) on the base area, to round-off (item 6
of the trials: 1e-16).

**O3 (R3). OpenFOAM's runs.** For every run:
- OpenFOAM 13 (`openfoam13` 20260624), `foamRun` with the solver module
  `shockFluidHeun` (`shockFluid` with Heun's two-stage step:
  `nOuterCorrectors 2`); the Kurganov-Tadmor flux (`Kurganov`); local time
  stepping (`localEuler`, `maxCo 0.5`, `rDeltaTSmoothingCoeff 0.02`);
  `linearUpwind` reconstruction of rho, U and T from gradients
  `cellVenkatakrishnan Gauss linear 10` (Venkatakrishnan's limiter with
  eps^2 = (10 h)^3, trials item 16). Inviscid, a perfect gas with gamma
  1.4, non-dimensional (p = 1, T = 1, speed of sound 1, U = M along x),
  the free stream fixed on the outer boundary, zero gradient on the
  outlet, slip on the wall, wedge patches 2.5 degrees either side of the
  axis (`ofref.write_case`, `write_polymesh`).
- The grids are R3's (`capped_spec`, `sharp_spec`, unchanged), turned
  into wedges; every level's `checkMesh` must report "Mesh OK.".
- Level 0 from the free stream; levels 1, 2 and 3 (and 4) each from the
  level below by `mapFields`, after the runner checks the level below's
  solution on disk against the hash in its record. One process on levels
  0 to 2, two on level 3, four on level 4 (`scotch`).
- The residual: the root mean square over the cells of d(rho)/dt under
  the local time step, over rho_inf, recorded every tenth iteration (the
  row a run, or a resumed run, writes at the iteration it starts from,
  before any step, is no residual and is left out: `ofref._joined`). A
  level converges when five records in a row (50 iterations) of one run
  are at or below 1e-10, every record read (not only the last five at a
  poll); it is then saved and stopped, and its record keeps the fifth
  record's iteration (`convergedAt`). `ofjudge.py` takes a level as
  converged only if its committed `monitor.csv` holds those five records
  in a row ending at `convergedAt` (`converged_held`); a level whose
  record says so but whose monitor does not is judged as one that did not
  converge. Iteration limits: 30,000,
  40,000, 60,000, 60,000 and 100,000 on levels 0 to 4. In the trials
  (items 16 and 17) levels 0 to 2 converged within 7,500 to 20,400
  iterations or stalled (the rule stops the slowest, the ogive at Mach 3's
  level 2, at 35,000 of 60,000); the ogive's level 3 met the target at
  38,540 at Mach 1.3 and stalls from the 35,000 save at Mach 3. Level 4's
  allows level 3's doubled again, as level 3's were about level 2's
  doubled (15,650 to 38,540 at Mach 1.3). A level 4 trial on the ogive at
  Mach 1.3 (off every list) runs under it before any level 4 runs on a
  check case; if that trial has neither converged nor stalled by 100,000,
  no level 4 runs and the limit goes back to review. That trial is a
  near neighbour of V4's own case (r_n/R 0.10 against 0.08) and finishes
  before V4 runs: its result changes nothing in this section but this
  limit, and V4's two tests applied to it (levels 1 to 3 against 2 to 4)
  are recorded whatever they give.
- The stall rule: from half its limit on, at each save (every 5,000
  iterations), a level is also saved and stopped if, on its monitor up to
  that save, every residual record of its last quarter is at most 1e-9
  and its drag's range over that quarter and the difference of the means
  of its last two eighths are each at most 1e-9 of its drag, a tenth of
  Amendment 1's bound (`ofref.stall_test`). The record keeps the save
  (`stalledAt`), and `ofjudge.py` checks the rule again on the committed
  `monitor.csv` up to it. Such a level counts as one stopped at its
  limit, below, measured on its whole history (to the iteration it
  stopped at, a few past the save). The rule only saves time: a level
  whose drag has held to 1e-9 for a quarter of its run, with its residual
  within a decade of the target throughout, is charged by the rules below
  as it would be at its limit. One addition for such a level: if it fails
  both R3's drift test and Amendment 1's test that the drift is not
  growing (on a drag fixed to round-off, each a matter of chance), it
  still counts, with Amendment 1's charge (its range plus 8,000 times its
  drift; at most 8e-6 of its drag by the stall rule's bounds), provided
  its range and drift are within Amendment 1's 1e-8 of its drag.
- The residual's floor: once a level's drag has stopped moving, its
  residual stays at a floor that rises about 0.3 decades a level (the
  ogive at Mach 3: 1e-9.85, 1e-9.56 and 1e-9.24 on levels 1 to 3; at Mach
  1.3, 1e-10.0 on level 3), as it would if it were round-off in d(rho)/dt
  under a local time step that halves with the cells (not established:
  the review estimates round-off two decades lower, so it may be the
  limiter's chatter; either way the drag does not move). It was measured
  at r_n/R 0.10 only; W6's smaller caps (0.03) have smaller cells there and
  may sit higher. A level whose floor is above 1e-9 (level 4 at Mach 3 may
  be) meets neither the stall rule nor Amendment 1's residual condition:
  it runs to its limit and counts only by R3's iterative rule. On the
  trials' histories once their drag had stopped moving, that rule's drift
  came to 0.005 to 0.29 of the range, so such a level can be refused with
  its drag fixed to 1e-11 of itself. No rule is loosened for it.
- A level stopped at its limit counts by R3's iterative rule (the drag's
  range over its last quarter at most 0.1% of it, the means of its last
  two eighths within a quarter of that range; the range is its iterative
  error) or by Amendment 1 (with the residual within a decade of
  OpenFOAM's target: at most 1e-9; the history is the level's
  `monitor.csv`). The record's iterative measures are over the level's
  own iterations from its start; `ofjudge.py` computes them again from
  `monitor.csv` (refusing a record that differs from it), and takes a
  level as stopped at its limit only if `monitor.csv` reaches the limit.
  Amendment 1's factor of 8,000 eighths is kept as a number, though an
  eighth here is 4,000 to 7,500 iterations (more than SU2's: the charge
  errs large).
- The build and the records: each level's record keeps every run's build
  (OpenFOAM's build string, `13-18870c24d21c`, and the SHA-256 of the two
  libraries built here as installed: `ofref.REGISTERED_BUILD`), its
  number of processes, and the SHA-256 of its `monitor.csv` and
  `wall.csv`. `ofjudge.py` refuses a level made with another build or
  another number of processes, whose files are not the record's, or
  whose seed is not the level below's recorded solution. If this machine
  is lost, the libraries rebuilt from the committed sources are added to
  `REGISTERED_BUILD` by a dated note before they run anything. A solver
  stopped by a signal from outside leaves no record (the level goes on
  from its last save); the case's lock is passed to the solver, so a
  second runner cannot start on a case whose solver still runs.
- On each level used, R3's checks, measured on the cells: |Cp| at most
  1e-6 in every cell against the outer boundary; the bow shock's reach at
  most 0.9 (per grid line from the wall, the outermost cell with |Cp|
  above 1e-3, its centre's distance from the wall over the line's
  length); the least Mach number in the cells against the outlet above 1;
  "Mesh OK."; the face drag and OpenFOAM's force within 1e-9 of the drag
  (the same sum, in place of SU2's force check). A case that fails the
  shock's or the boundary's checks is rerun in full with a and k (H grid:
  the outer line's rise) times 1.25, at most twice, the earlier attempt
  kept beside it, as R3 says.

**O4 (R4). The value and uncertainty.** As R4, on faces
(`ofref.faces_changes`), to the nose's end closed at r = R as the drag
is. The regional change is the change of the drag integral in each
region exactly: the finer level's faces nest two to one in the coarser's
(checked; a run whose faces do not nest fails), so each coarser face's
change is its two finer faces' Cp d(r^2) / R^2 less its own, each
coarser face in the region holding its centre in x; summed over the
regions, the changes give the drag's change exactly, as R4's vertex form
does on nested grids. The face-level change (R4's vertex measure) stays
point by point: the coarser level's face Cp taken linearly in r^2 at the
finer level's face centres, the sum over the finer faces of |the change|
times d(r^2) / R^2 (taken against the coarser face's own value, it would
mostly measure the slope across a face, and its ratio would sit near
one half however the grid converged). The cap's
term is measured on the wall instead of at one point, since a
cell-centred code has no value at the stagnation point (trials item 16:
the stagnation cell's centre is off the axis): in the exact flow the
wall's streamline crosses the bow shock where it is normal, so the
wall's total pressure is the pitot value all along the cap; on level k,

    E_k = the sum over the cap's wall faces (centre at x <= x_t, the
          tangent point) of |p0 / p0_pitot - 1| times p / q_inf times
          (r1^2 - r0^2) / R^2,

with p0 the face's cell's total pressure and p its pressure: the drag the
cap would gain or lose if each face's pressure were off by its total
pressure's error. E is taken at cell centres, which lie off the wall's
streamline, where the exact total pressure is above pitot's by about
0.1% to 0.2% at the cap's end on levels 2 and 3 (the review's estimate):
that part of E errs large. U_cap = the larger of E on the two finest
levels used.
U = max(U_total, U_dist) + U_cap + the iterative errors, as R4; R4's
limits (0.5% and 1% of D) and level 4's fallback unchanged.

**O5 (R5). The checks**, before any W6 case runs; as R5, with:
- V1(a): on level 3, the Cp of every wall face whose centre is from x =
  L/3 to 0.8 L within 0.1% of the Taylor-Maccoll value. V1(b): the drag
  to the last face end of level 1 at or ahead of 0.8 L (a vertex of every
  level), with O4 applied to it.
- V2: on the finest level used of every capped run, in R5's terms (the
  error over pitot's Cp, 3%): the total pressure of the wall's cell on
  the axis, and of every cap face's cell, each within 3% of pitot's Cp
  of the pitot value, that is |p0 - p0_pitot| at most 0.03 (p0_pitot -
  p_inf) (`ofjudge.cp_factor`: a total pressure's relative error times
  1.58 at Mach 1.3, 1.21 at Mach 2, 1.09 at Mach 3).
- V3, V4: as R5 (V4's level 4 on four processes). As in `judge.py`, V4
  takes each estimate whatever its ratios, so it can pass with a ratio at
  or above 1 (R4's own gate still refuses such a case).
- V5: as R5 (and Amendment 1). Its levels run again in the registered
  folder (the trials' records are not used); each level the trials ran
  on the same domain is reported against the trial's drag (`ofjudge`'s
  `TRIAL_V5`: H2K10's levels 0 to 2 at Mach 2; at Mach 3 H3K10b's levels
  0 to 2 for the first attempt and H3K10w1's levels 0 and 1 for the
  widened one). The same build on the same inputs gives the same drag
  only to within the level's iterative range: where a converged level
  stops depends on when the runner's poll sees its five records, and a
  resumed run's path on the save it resumed from (the runner's own test,
  the ogive at Mach 3's level 0 resumed from its 5,000 save, ended 4.1e-12
  of the drag from its trial, within the two runs' ranges of 7.7e-12). A
  difference above the larger of the two levels' drag ranges over their
  last quarters and 1e-12 of the drag fails V5 (the code or its inputs
  are not the trials'). R3's boundary check sends V5
  to a wider domain at both Mach numbers (level 1's outer |Cp| is above
  1e-6 at Mach 2 and 3), and it is rerun so, as for any case: the first
  attempt keeps levels 0 and 1, and V5 is judged on the widened run.

**The gas's constants.** The molar mass 11640.3 (`ofref.write_case`, with OpenFOAM's
gas constant) gives gamma 1.399997 and a free-stream density of 1.400006
against 1.4, which moves Cp by about 4e-6 of itself: about 500 times
below the smallest U the trials give, so it is left as it is and stated
here.

**O6 to O8 (R6 to R8)**: unchanged (the fitted solver's side, the
comparison, the allowance, the hold-out, the served region, the label).

**O9 (R9). The order.** (1) This section, `ofref.py` and `ofjudge.py`
reviewed independently, the review's changes made and confirmed; (2) V1
to V5 on OpenFOAM (`python3 -I ofref.py case <reference dir> <name>`,
V4's level 4 by `ofref.py level4`), judged by `ofjudge.py --checks-only`;
if any fails, no W6 case runs and the route goes back to the owner;
(3) the 24 cases and the hold-out's Von Karman runs on OpenFOAM; (4)
`ofjudge.py`'s verdict, recorded with every case and the hold-out, then
reviewed; (5) only if it serves: R9's (5), unchanged.

## The review of OpenFOAM's registration (2026-11-23)

An independent review of the section above, `ofref.py`, `ofjudge.py` and
the OpenFOAM modules as committed at b7bee1d0, before any check ran. It
read the trials' records and tested the judge on them; it ran no
OpenFOAM. Verdict: **pass with changes**, nothing to run until they are
made and confirmed. Each change below is made in the section above and
the code, and goes back to the reviewer for confirmation.

Required:
1. Convergence was read from the monitor's last five rows at each poll,
   and the record's flag again from the last five rows when the solver
   stopped: the ogive at Mach 1.3's level 3 first had five rows in a row
   at or below 1e-10 at 34,170 and ran on, and a converged level could
   have been recorded as not converged (and refused). Now every row is
   read, the record keeps `convergedAt`, and the judge takes convergence
   only from five rows in a row in `monitor.csv` ending there; it also
   recomputes the iterative measures from `monitor.csv` for R3's rule
   (before, only Amendment 1's branch checked them) and checks a stop at
   the limit against it.
2. The regional change on faces took the coarser level's face values at
   the finer faces' centres, whose sum is not the drag's change, and it
   came out smaller than the exact change in places (the hemisphere at
   Mach 2, levels 1 to 2: 6.1e-5 against 1.16e-4). It is now the change
   of each region's drag integral, from the nested faces (O4). On the
   trial ogives the estimate becomes U = 1.72e-4 (0.277% of D; ratio
   0.35) at Mach 1.3 and 1.38e-4 (0.248%; ratio 0.54) at Mach 3, against
   item 17's 0.282% and 0.228%. The face-level change stays point by
   point (O4 says why). This moves V5's ratio gate on levels the trials
   have seen; V5's judged runs are now on widened domains (below).
3. V2 measured total pressure against pitot's total pressure, which is
   looser than R5's Cp against pitot's Cp by 1.58 at Mach 1.3, 1.21 at
   Mach 2 and 1.09 at Mach 3. It is now in R5's terms (O5). On the trial
   ogives' level 3: 0.91% and 2.29% (Mach 1.3), 0.51% and 1.92% (Mach 3)
   for the axis's wall cell and the worst cap face.
4. Blindness: the section now says that O4's cap term and V2's test of
   every cap face were written after the hemisphere's wall total
   pressures and its differences from the fitted values were seen (with
   the numbers), and that the level 4 trial changes nothing but level 4's
   limit, with V4's two tests on it recorded whatever they give.
5. `python3 -I ofref.py` did not find `w6ref` (the script's folder is off
   the path under -I); it now puts its own folder on the path.
6. Nothing tied a run to the libraries built: each record now keeps every
   run's build (OpenFOAM's build string and the two libraries' SHA-256)
   and its number of processes, and the judge requires the registered
   ones (O3). The installed libraries were checked against the committed
   sources by the review.

The runner's changes were tried on a live run before going back to the
reviewer (the ogive at Mach 3's level 0, off every list, in the
scratchpad): its solver killed by a signal left no record, and the level
resumed from its last save; the first try caught a fault in the new
convergence scan (it stopped reading after its first poll, and the level
ran on to a stall stop at 20,000 past a five-row run ending at 13,680),
fixed in 5b815d82; on the second, killed after its 5,000 save and
resumed, it converged with `convergedAt` 13,670, the record carrying its
build, processes and files' hashes, and `converged_held` accepting it.

Optional, taken: a level the stall rule stopped counts with Amendment 1's
charge if both drift tests fail on its round-off (O3); the seed's hash
against the level below's solution, and the SHA-256 of `monitor.csv` and
`wall.csv`, checked by the judge; a solver stopped by a signal from
outside leaves no record; the case's lock held by the solver; the
monitor's two tables paired by iteration; the wall's cell on the axis
recorded outright for V2; V5 widens at Mach 2 too (level 1's outer |Cp|
1.28e-6), so its judged run there is blind on every level; a V5 level
that does not give its trial's drag (to within the two runs' iterative
ranges, or 1e-12 of the drag) fails V5; the widening in
each verdict row; the notes on E at cell centres, Amendment 1's 8,000
eighths, the floor's cause (not established), the gas's constants (4e-6
in Cp), and V4 taking estimates whatever their ratios, as `judge.py`
does.

Optional, not taken: a trial of the residual's floor on a small cap
(0.03). A cap whose level 3 sits above 1e-9 runs to its limit and counts
only by R3's rule, which can refuse it but never accept a wrong value;
the section says so.

The review also found sound: the settings item by item against O3; Heun's
step and the limiter in the modules; O1 (the faces' drag and OpenFOAM's
force agree to 1.4e-12 or better on every trial level); item 17's
numbers, reproduced from the records; U_cap at 1.5 to 2 times R4's
form applied to the axis cell; the stall rule and its check; R3's rule
on OpenFOAM's histories (of 134 truncations it accepts, one charged a
range the later drag left, at iteration 2,000, none near the limits);
the widening and its kept attempts; `TRIAL_V5`; resumption after a
deadline; V1, V3 to V5, both ways, the hold-out and the verdict as
`judge.py` has them; and the blindness as disclosed (the trials' cases,
an empty `runs-of/`, SU2's records only for V1, V3 and V5).

## State (2026-11-23)

- SU2: the tool, the geometry check, the set-up trials 1 to 13, the
  registration, its review and the revision. V5 at Mach 2 failed R3 on
  level 2; the owner chose Amendment 1, which passed its review with
  changes, all made and confirmed. Its level 3 then did not converge (its
  residual cycling between 1e-6.5 and 1e-7.7) and its vertex-level change
  grew (ratio 1.81): **V5 at Mach 2 failed R5, and no W6 case ran on
  SU2.** The owner chose to look for a fix: revision 2's trials ran, and
  no candidate passed their screen. The checks' queue under the first
  settings is stopped (V5 at Mach 3 had levels 0 and 1).
- The fitted solver's side (R6) is complete (2026-11-22): the eleven
  families W6 left without nj = 80 and the hold-out's five, each on nj =
  20, 40 and 80, every grid converged (`fitted/results.jsonl`, 48
  records). Their nj = 20 and 40 refits reproduce the lanes' drags within
  R6's 1e-9 (eleven of the 22 to every digit, the rest within 6e-12 of
  the drag).
- The owner then chose a second independent solver in SU2's place,
  OpenFOAM 13. Its set-up trials (items 1 to 17 above) are done, and its
  registration (above) is written. Its independent review passed it with
  changes; the changes are made and go back to the reviewer for
  confirmation before any check runs. A level 4 trial on the off-list
  ogive at Mach 1.3 runs meanwhile (level 4's iteration limit, O3).
- Next: the review's confirmation; V1 to V5 on OpenFOAM (with V4's
  level 4); then the 24 W6 cases and the hold-out's Von Karman runs; then
  `ofjudge.py`'s verdict, reviewed. Nothing is served before that verdict
  serves it: every capped nose stays refused.
