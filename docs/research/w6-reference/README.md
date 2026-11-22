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
| `w6ref.py` | The tool: the capped-nose geometry written here from its definition (W6 README section 1); H grids for sharp noses and C grids for capped ones, nested (each level halves every spacing by sampling the same mappings); SU2's mesh and configuration; the registered settings (`SETTINGS`, `capped_spec`, `sharp_spec`); each level after the first started from the level below (`seed_restart`); the nose's pressure drag integrated here from SU2's surface pressures (trapezoid rule in r^2, on the base area); the change of the drag's distribution between levels (`dist_change`); the boundary checks |
| `judge.py` | The verdict, as registered below, from the committed records only |
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

## The second solver: OpenFOAM's set-up trials (2026-11-22, on the trial case T only, before any registration)

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
(p - 1) x-hat against the wall's area vectors). All on T, the hemisphere
at Mach 2.5, which is no check case.

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
10. The sharp cone at Mach 2 on the H grid: level 0 converges to a
   residual of 1e-6.96, level 1 to 1e-2.37 with its drag steady to
   2.7e-6 (0.0947050, 0.0949138; the old placement).

## State (2026-11-21)

- Done: the tool, the geometry check, the set-up trials 1 to 13, the
  registration, its review and the revision.
- V5 at Mach 2 failed R3 on level 2; the owner chose Amendment 1, which
  passed its review with changes, all made and confirmed. Its level 3
  then did not converge (its residual cycling between 1e-6.5 and 1e-7.7) and its vertex-level change
  grew (ratio 1.81): **V5 at Mach 2 fails R5, no W6 case runs, and the
  route is with the owner.** The owner chose to look for a fix:
  revision 2's trials (above) ran, and no candidate passed their screen,
  so the route is with the owner again. The checks' queue under the
  first settings is stopped (V5 at Mach 3 had levels 0 and 1).
- The owner then chose a second independent solver in place of SU2:
  OpenFOAM 13 (the OpenFOAM Foundation's package `openfoam13`, version
  20260624, from dl.openfoam.org for Ubuntu 24.04), its density-based
  solver `shockFluid` on wedge meshes of the same grids (`ofref.py`). Its
  set-up trials are under way, on the trial case T only, before any
  registration; they are summarised here as they finish.
- The fitted solver's side (R6) is complete (2026-11-22): the eleven
  families W6 left without nj = 80 and the hold-out's five, each on nj =
  20, 40 and 80, every grid converged (`fitted/results.jsonl`, 48
  records). Their nj = 20 and 40 refits reproduce the lanes' drags within
  R6's 1e-9 (eleven of the 22 to every digit, the rest within 6e-12 of
  the drag).
- Next: V1 to V5 (with V4's level 4), then the W6 cases and the hold-out's
  Von Karman runs on SU2.
