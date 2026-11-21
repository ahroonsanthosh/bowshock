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
   1.6353 (exact 1.6573). Level 3 is to show whether these keep falling.

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

## Registration (2026-11-21, before any check below and any W6 case runs on SU2)

Made after the set-up trials above, which ran on a sharp cone and on one
capped tangent ogive off W6's case list, and before anything below runs.
Anything changed after this, the review's changes included, is added as
a dated note saying what changed and whether any result had been seen.
`judge.py` computes the verdict exactly as written here; the settings
are `SETTINGS`, `capped_spec` and `sharp_spec` in `w6ref.py`, both as
committed with this registration.

**R1. The quantity.** The nose's pressure drag coefficient on the base
area (cap included; the cylinder adds none), gamma 1.4, inviscid, zero
incidence. W6's geometry (its section 1; this tool's within 2e-14 of
it), with two calibers of cylinder behind, as W6's lanes.

**R2. The cases.** W6 section 3's, unchanged: for the tangent ogive and
for the Von Karman nose, the eight corners of 3 and 5 calibers, r_n/R
0.03 and 0.15, Mach 1.3 and 3, and the four interior points (5, 0.05,
2), (3, 0.15, 2), (5, 0.05, 1.3), (5, 0.05, 3): 24 cases.

**R3. SU2's runs.** For every run: HLLC, MUSCL with Venkatakrishnan's
limiter (coefficient 0.05), implicit Euler stepping, CFL 1 adapting up
to 10, each level to an RMS density residual of 1e-11 (a level that
reaches its iteration limit without it fails). Four nested levels: level
0 (64 x 32 cells on a C grid) first order from the free stream, then
second order; levels 1, 2 and 3 (512 x 256) each started from the level
below (trial 6). C grids for capped noses: along the wall the first cell
of level 0 a quarter of the tip radius (about five cells on the cap
there, forty on level 3); the outer boundary at a + k s from the wall,
a = 4 times Billig's standoff (0.143 r_n exp(3.24 / M^2)), k = 1.5 /
sqrt(M^2 - 1). H grids for the sharp noses of the checks (`sharp_spec`).
On each of levels 1 to 3: |Cp| on the outer boundary at most 1e-6; the
bow shock's reach (the outermost vertex with |Cp| above 1e-3, as a
fraction of its grid line) at most 0.9; the least Mach number on the
outlet above 1. A case that fails one of these is run again in full
with a and k (H grid: the outer line's rise) times 1.25, at most twice;
after that it gives no reference.

**R4. SU2's value and uncertainty.** The value D is the drag on level 3.
From the drags D1, D2, D3 on levels 1 to 3 and the distribution's
changes V12 and V23 (trial 7):
- from the total: e12 = D2 - D1, e23 = D3 - D2; if they have the same sign
  and |e23| < |e12|, p = log2(e12 / e23) and U_total = 1.25 |e23| /
  (2^min(p, 2) - 1); otherwise U_total = 3 max(|e12|, |e23|);
- from the distribution: rho = V23 / V12; if rho < 1, U_dist = V23 r /
  (1 - r) with r = max(rho, 0.5) (the rest of a geometric series, never
  taken faster than first order); otherwise no reference;
- U_su2 = max(U_total, U_dist).
A case gives a reference if every level converges and passes R3's checks,
V2 holds on its level 3, rho < 1 and U_su2 is at most 0.5% of D. If it
fails only on rho or on the 0.5%, level 4 (1024 x 512) is run once, and
R4 is applied to levels 2 to 4.

**R5. The checks with exact answers,** before any W6 case runs. If one
fails, no W6 case runs and the route goes back to the owner.
- V1, sharp cones (H grid), 3 calibers (9.46 deg), Mach 1.3 and 3: (a) on
  level 3, the wall's Cp at every vertex from x = L/3 to 0.8 L within 0.1%
  of the Taylor-Maccoll value (the tip's region and the corner's smearing,
  trial 3, outside that); (b) the drag up to the last vertex of level 1 at
  or ahead of 0.8 L (a vertex of every level), with R4 applied to it,
  within its U_su2 of the exact value (Taylor-Maccoll's Cp times r^2 /
  R^2 there), and U_su2 at most 0.5% of it.
- V2, the stagnation point: on level 3 of every capped run, the
  stagnation vertex's Cp within 3% of the Rayleigh pitot value (a check of
  the bow shock's strength; trial 4's failure was 7%); run before the W6
  cases on the off-list capped ogive (4 calibers, r_n/R 0.08) at Mach 1.3,
  2 and 3, and on every W6 case as part of R4.
- V3, the tangent ogive of NACA TN 3716 (3 calibers, sharp, H grid), Mach
  1.98: the drag within its U_su2 (R4) of the method of characteristics'
  0.0988034 (0006, converged to 1e-7), and U_su2 at most 0.5% of it.
V1(b) and V3 test R4's uncertainty itself against exact values.

**R6. The fitted solver's side.** W6 section 3 unchanged, as W6's
`analysis/references.mjs` computes it: the drags on nj = 20, 40 and 80;
p from the three, capped at 2 (not finite: 2); D_proc = T80 - (T40 -
T80) / (2^p - 1), U_proc = 1.25 |T40 - T80| / (2^p - 1); every grid
converged and passing the page's checks. Added: a family whose order is
finite and not above 0 gives no reference. The eleven families W6 left
without nj = 80 are fitted by W6's own runners on the lanes' frozen
source (`fitted/lane.sh`), started on 2026-11-21 before this
registration under W6 section 3's own (2026-10-26), which fixes how they
run; they see nothing of SU2. Their nj = 20 fits so far reproduce the
lanes' to every digit (0.091072746574589664 and 0.072716489695764344).
**One departure, proposed for the review to accept or refuse:** the
3-caliber ogive at 0.15, Mach 1.3, whose nj = 80 fit oscillated within
0.100929446 to 0.100929543 (about 1e-6 of its drag) from 6,000 to
28,000 iterations (W6 section 4), is counted with that whole range added
to U_proc. By W6 section 3 as written it gives no reference, and the
ogive's served region would lose that corner.

**R7. The comparison and the allowance.** For each case with both:
delta = D_proc - D_su2.
- Agreement, reported for every case: |delta| <= U_proc + U_su2.
- The miss, against the far end of SU2's interval: m = (|delta| + U_su2)
  / D_su2.
- The allowance (W6 section 3's rule): A = twice the largest m over every
  case of both shapes, rounded up at two significant figures, and for each
  shape at least that shape's allowance for its sharp nose (7e-5 for the
  ogive, 8e-4 for the Von Karman nose). It applies to capped noses only.
- Every case's band, D_proc +- (U_proc + A D_proc), must contain SU2's
  interval D_su2 +- U_su2; a case where it does not is reported, and A is
  not lowered to fit.
- Rounded tips are served only if A is at most 2% of the drag. Above
  that, the two solvers disagree by more than any band the fitted solver
  carries elsewhere (8e-4 at most), and serving on the allowance alone is
  the owner's call (W6 section 11 (c)), made with the numbers.

**R8. The served region.** W6 section 3 and 0014 (an): for each shape,
the outline (convex hull) in calibers, r_n/R and Mach of the cases that
give a reference on both sides (the whole box if all eight corners do); a
hull with no extent in one of the three serves nothing; tips below r_n/R
0.03 stay refused. Outside it a capped nose is refused with the reason.
The model's own error (inviscid against measured) is not in this band,
as for every nose without a measured box, and the label says so.

**R9. The order.** (1) This registration, `w6ref.py` and `judge.py`
reviewed independently, by a reviewer given the code and this text;
(2) V1 to V3; (3) the 24 cases on SU2, and the eleven fitted families;
(4) `judge.py`'s verdict, recorded with every case, then reviewed; (5)
only if it serves: W6's geometry and capped families brought to the
main line, the page's tip-radius input (0014 P4), the refusal lifted
inside the outline, the refusal audit run again, each reviewed.

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
