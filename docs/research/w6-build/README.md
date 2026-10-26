# W6 build: rounded nose tips (tangent sphere caps)

The owner decided on 2026-10-26 to build W6 now (blunted tips refuse about
half of real noses; 0014 section 2.1, N3). This folder holds the plan, the
runners and the measurements of the build. The probe that preceded it is
on `claude/wip/w6-tangent-caps` (`docs/research/w6-probe`, last commit
5d28a34): main's C grid does not take capped noses; W5's two-scale C grid
(now on main, 33470fe) does, with every grid passing the page's checks;
on the 5-caliber tangent ogive the families converge at orders 2.23,
2.02, 1.79 at Mach 1.3 (r_n/R 0.03, 0.05, 0.15), 1.48 at Mach 2 and 1.86
at Mach 3 (0.05).

Nothing here is served until the references below exist, the allowance
is set from them, and an independent review has passed. Until then every
capped nose is refused (`bluntNoseRefusal`: "a rounded (blunted) tip has
not been checked against a reference yet").

## 1. Geometry (ae794e4; the review's fixes after it)

`Nose.tipRadius` (`src/geometry/nose.ts`): a sphere cap centred on the
axis and tangent to the shape's profile; the capped nose keeps its
overall length, cap included (the uncapped profile is that of length
`length + offset`, shifted forward). Offered on the tangent ogive longer
than its radius, the Von Karman nose, the parabola K = 1 (the noses W6
serves once referenced: they meet the cylinder without a corner) and the
cone (geometry only: a capped cone meets the cylinder at a corner, and
nothing serves it); refused on every other shape with that reason.

The independent review of ae794e4 (Fable, 2026-10-26) found the parent's
length came from a fixed-point iteration that stalls as r_n tends to R
(above r_n/R about 0.8 to 0.93 a flat stretch appeared inside the nose,
without a refusal), the slope from finite differences whose step exceeded
the tangent point of tiny caps on a Von Karman nose, the shapes wider than
stated, an untested class-check branch and a misleading message from the
march of characteristics. Fixed after it: the parent's length is bisected
on g(Lp) = Lp - offset(Lp) - length, which increases with Lp, and refused
unless g is met to 1e-12; the slopes are each shape's formula (the Haack
series with theta = 2 asin(sqrt(t)) and a series for its area function
below theta = 0.1, where noseRadius's formula cancels; the capped Von
Karman profile behind the cap is that precise one); the tests take r_n up
to 0.999 R and check the tangent ogive against its closed form (to 1e-12,
the review's case of r_n 0.499 on 3 calibers giving a parent of 55.926).

**The lanes stand.** The lanes run the geometry of ae794e4 (r_n/R 0.03 to
0.15, where its iteration converged). Against the fixed geometry at their
twelve shape, length and ratio points (`results/geometry-compare.json`,
`runners/geometry-compare.test.ts`): the radius along the nose differs
by at most 3.1e-15 of R, the offset by at most 1.2e-15, the parent's
length by 2e-14 (the tangent point's position, where radius and slope
are continuous, by up to 2.3e-11). Two of the lanes' grids fitted again
from the free stream with the fixed geometry (`runners/check2.sh`,
`results/check2.jsonl`): the Von Karman 5-caliber nose with r_n/R 0.03 at
Mach 1.3, 0.035384396445193748 against the lane's 0.035384396445192652
(3.1e-14), and the 3-caliber ogive with 0.15 at Mach 3,
0.091072746574589261 against 0.091072746574589664 (4.4e-15), on the same
grids in the same iterations.

Reproduced as well: the probe's first fit (5-caliber tangent ogive, 0.05
R, Mach 1.3, nj = 20) on main 3389a04 with ae794e4's geometry gives
0.042357534465754701 against the probe's 0.042357534465754756 on
haack-merge ee4b57a (1.3e-15), on the same 76 x 20 grid in the same 5000
iterations (`results/check.jsonl`).

## 2. The measured check: NACA TR 1386 (0014 10.7 (x))

Named in 0014 section 10.7 (x), dated 2026-10-26, before anyone working
on W6 has opened the report. The figure numbers are fixed by a neutral
party from the list of figures only; two blind readings; a check that
sets no band, no allowance and no range. The coordinator arranges the
neutral party and the readers. No W6 value is compared with it before
the readings are paired.

## 3. References

**Cases.** For each of the tangent ogive and the Von Karman nose, a box in
(calibers, r_n/R, Mach): calibers 3 to 5, r_n/R 0.03 to 0.15 (0014
section 3's population), Mach 1.3 to 3. Its eight corners, and four
interior points: (5, 0.05, 2), (3, 0.15, 2), (5, 0.05, 1.3), (5, 0.05, 3).
Two calibers of cylinder, as W5's references. The parabola K = 1 follows
with the same box once these two are done (4% of the population).

**Grids.** Each case on nj = 20, 40 and 80 (`runners/fit.test.ts`, the
probe's runner: chunks with checkpoints, the early stop of W5's families,
the page's checks on every grid), each finer grid started from the
converged coarser one; the probe's converged fits of the same 5-caliber
ogive cases start their grids where they exist (`runners/adopt.mjs`; the
converged fit does not depend on its start).

**Four grids.** One family per Mach number (1.3, 2, 3) and shape is solved
on nj = 160 too: the family with the lowest observed order at that Mach
number on nj = 20 to 80, or if none is below 1.5, the one with the
largest one-triple band; chosen from the nj = 80 results by that rule
before any nj = 160 fit starts, and its four-grid verdict given by the
page's procedure (0005), as W5's `check160`.

**The independent reference.** The method of characteristics behind the
sonic line (`characteristicsFrom`), from each grid's fitted flow on lines
chosen on nj = 20 before any march (`runners/moc.test.ts`, "auto": lines
behind the last one whose least Mach number is below 1.05, seven of them
spaced evenly in log x up to 0.8 of the nose's length), on 640, 1280 and
2560 intervals. W5's line criterion (0006, "Two-scale noses"): a line is
used where, on every grid, the march's mass balance on 2560 intervals and
its change from 1280 intervals are below 3.5e-5 of the nose's drag. The
reference is the march extrapolated over the grids plus the fitted drag
ahead of the line extrapolated, at the observed order and at second
order; the lowest bound is the finest grid's march plus that upstream
part.

**Allowance.** Twice the largest miss of the procedure's extrapolation
(three grids, order capped at 2) against these references, over every
W6 reference and the lines next to each line used, rounded up; never
below `FITTED_DRAG_FLOOR`. It applies to capped noses only. Every band
with it must contain its error against the lowest bound; a case where it
does not is reported, and the allowance is not lowered to fit.

**Served region.** Per shape, the box above if every corner gives a
reference (its three grids pass the page's checks, every fit converges,
at least one line passes the line criterion); otherwise the outline
(convex hull) of the cases that do, in (calibers, r_n/R, Mach). A capped
nose outside it is refused with the reason. Tip ratios below 0.03 are not
inside it: a smaller cap is refused, not served as sharp.

## 4. Lanes

Two lanes, one per shape, each a resumable job list run from a frozen
copy of the source (`tests/tmp-w6b/tree`, the src of the commit in its
`COMMIT` file, so later commits on the branch do not change a running
reference): `runners/lane.sh runners/jobs-ogive.txt` and
`runners/jobs-vk.txt`. Every case on nj = 20 first, then 40, then 80 and
its marches, so a case that fails is seen early. Results land in
`tests/tmp-w6b/out` and are copied to `results/` as they finish.

Estimated cost (the probe's times on a shared core): nj = 20 two to eight
minutes, nj = 40 8 to 42 minutes, nj = 80 1.4 to 7 hours, a family's
marches up to an hour; about 40 CPU-hours per shape for the twelve
families, and 15 to 50 hours for each nj = 160 fit.

## 5. Not in this step

The page's tip-radius input (0014 P4) and the OpenRocket import of it
(OpenRocket has no nose tip radius), the population re-run with capped
noses served, and the labels: after the references and the allowance.

## 6. The second march: streamline entropy from the fitted shock (registered 2026-10-26, before it runs)

**Why.** On the 5-caliber tangent ogive at Mach 1.3 (r_n/R 0.03 and
0.15), the first march (W5's) passes the line criterion only on the line
nearest the end of the nose (x 3.7 to 3.8, -9% to -10% of the drag); the
lines from x 0.02 to 0.6 (98% to 54% of the drag downstream) fail it
(mass balance 2.4e-4 to 7.9e-4, not falling with the intervals and
growing with the grid) and lie 2.6% to 3.0% of the drag below the fitted
drag downstream on nj = 20, 40 and 80 alike. On W5's Von Karman noses the
same comparison near the tip falls with the grid (for example 2.2e-3,
5.7e-4, 1.1e-4 of the drag on the 3-caliber nose at Mach 3, x = 0.018).
The lines that fail cross the cap's entropy layer, thin and steep on
these grids; the first march takes each streamline's entropy from the
line's interpolated cells.

**The method.** As the first march in every respect (`characteristicsFrom`,
the lines chosen on nj = 20 by `MOC_LINES=auto` before any march, 640,
1280 and 2560 intervals, the row next to the wall left out, the same
drag downstream), except each starting point's entropy: the stream
function at each point of the line from the line's own mass flux,
integrated from the wall (psi = integral of rho (V . n) r ds); the height
y_s at which that streamline crossed the fitted shock, from
psi = rho_inf U_inf y_s^2 / 2; and the entropy behind the fitted shock
there, from its angle (three-point differences of the shock's nodes,
interpolated in y). The wall point takes the normal shock's entropy (the
stagnation streamline). Each point keeps its pressure and flow direction;
its density follows from the pressure and the new entropy, its speed
from the total enthalpy. Entropy is constant along streamlines in steady
inviscid flow and is set at the shock, the best-resolved part of a
fitted solution; this march does not depend on how the cells resolve the
entropy layer, only on the shock and the mass flux.

**What it is judged by** (fixed now; nothing is changed after its numbers
are seen except to fix a demonstrated bug, recorded as such):

1. W5's line criterion, unchanged: on every grid, the march's mass
   balance on 2560 intervals, and its change from 1280 intervals, below
   3.5e-5 of the nose's drag.
2. A control: on lines where both marches pass the criterion, they agree
   within the larger of their changes from 1280 to 2560 intervals plus
   1e-5 of the drag; otherwise the second march is not used anywhere
   until the disagreement is explained.
3. The reference covers the forward region of a case if at least two
   lines carrying 50% or more of the drag downstream pass the criterion,
   and on each of them the fitted drag downstream minus the march falls
   with the grid (each of nj = 40 and 80 smaller in size than the grid
   before by a factor of 2 or more). Its references and misses then
   enter the allowance as section 3 says.
4. If it does not: the forward region stays unreferenced; W6 serves no
   capped nose whose referenced lines carry less than half its drag
   downstream; the disagreement is recorded as a finding. If the second
   march passes the criterion on the forward lines and converges with
   the grid to a value that differs from the fitted family's
   extrapolation by more than the family's band, the fitted solver is
   the suspect: that is reported at once, with the numbers, since it
   would bear on W5's Von Karman noses.

## 7. Findings at Mach 1.3, and the second march judged (2026-10-26)

**An embedded recompression shock.** On the 5-caliber tangent ogive at
Mach 1.3, the flow overexpands round the cap (wall Cp -0.02 at x =
0.023 with r_n/R 0.03) and recompresses (Cp +0.156 by x = 0.1), and the
compression coalesces into a shock inside the shock layer. Across grid
lines of the fitted flow (`runners/profile.test.ts`,
`results/diagnostics/profile-ogive5rn0.03M1.3.json`) the steepest
pressure gradient stays at the same place in the layer and doubles with
each refinement, as across a discontinuity: at x = 0.13, -2.9, -6.7 and
-13.6 (pressure over base radius) at 61% of the layer on nj = 20, 40, 80;
the pressure falls from 1.16 at the wall to 1.04 and jumps to 1.10
across it. It moves out through the layer with x (61% of the layer's
height at x = 0.13, 76% at 0.25, 90% at 0.6, 99% at 1.65) and meets the
bow shock near x = 1.6 to 2. Its entropy jump is small (about 1e-4 of
the free stream's).

**Why the march fails ahead of it.** The method of characteristics marched
here has no internal shock: every line ahead of the merge crosses the
embedded shock. Those lines fail W5's line criterion (mass balance 2.4e-4
to 8e-4, not falling with the intervals, growing with the grid), and
their drag downstream lies 2.6% to 3.0% below the fitted drag on every
grid. On nj = 80 from the line at x = 0.022
(`runners/wallp.test.ts`,
`results/diagnostics/wallp-ogive5rn0.03M1.3-r4-l22-cells.json`) the
march's wall pressure agrees with the fitted one to 3e-5 in Cp up to
x = 0.055, then falls to 4e-3 in Cp below it where the recompression
steepens, and the gap decays slowly downstream. Behind the merge (x =
1.65 on, 20% of the drag downstream) the march and the fitted drag
converge to each other at about second order (3.5e-4, 8e-5, -2e-6 of
the drag on nj = 20, 40, 80). The fitted solver captures the embedded
shock (it fits only the bow shock), so its error there may become first
order on finer grids (0004, "First-order surface pressure"); the nj = 160
runs are to show it. Nothing here points at W5's Von Karman noses: their
profile has no curvature jump at the tip and their near-tip gaps fall
with the grid (for example 2.2e-3, 5.7e-4, 1.1e-4 of the drag on the
3-caliber nose at Mach 3, x = 0.018).

**The second march, judged by section 6's rules** (both Mach 1.3 cases
done; `results/lanes/moc2-*.jsonl`):

- Rule 1: no line ahead of the merge passes (the same lines fail as for
  the first march, with mass balances of 2.6e-4 to 8.0e-4); the lines
  that pass are the same as the first march's (x = 3.79 and 3.72).
- Rule 2, the control, fails: on the lines where both marches pass, they
  differ by 8.2e-5, 4.1e-5 and 1.8e-5 of the drag on nj = 20, 40, 80
  (r_n/R 0.03, line at x = 3.79) and by 4.2e-5 on nj = 20 (0.15, x =
  3.72), against allowed differences of 1e-5 plus changes of 1e-6 or
  less. The likely cause, not shown: the stream function comes from the
  line's interpolated mass flux, which falls short of the shock's
  captured mass flow by 0.5% to 2.1% (the ratio rises to 0.995 on nj =
  80), so each point's entropy is taken from a slightly wrong place on
  the shock. By the rule, the second march is not used anywhere.
- Rule 3 fails (no forward line passes); so rule 4 holds: the forward
  region of these noses stays unreferenced, and W6 serves no capped nose
  whose referenced lines carry less than half its drag downstream. The
  cause of the first march's failure is now shown (the embedded shock),
  not the fitted solver's entropy layer: the entropies the second march
  imposes differ from the cells' by 4e-4 to 9e-3, and change the march's
  drag by at most 3.8e-4 of the nose's (on one nj = 40 line whose first
  march failed with a mass balance of 7.9e-3, by 4.8e-3), far less than
  the 2.7% gap.

**An open route, not taken now.** A march of characteristics that fits
the embedded shock as the fitted solver fits the bow shock (a shock-point
unit process started where same-family characteristics first cross,
marched with the oblique-shock relations on both sides, its entropy jump
carried into K(psi) behind it) would cover the forward region
independently of the finite-volume solution. Effort: about three to five
days of code and its own verification (a compression corner's exact
oblique shock; a cap-cone case on two march resolutions) before it is
run on W6's families. Decided after the Mach 2 and 3 families show where
the merge falls.
