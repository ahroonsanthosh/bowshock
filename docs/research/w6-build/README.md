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

The second review (Opus, of ae794e4 to 3e31f5e) checked the geometry
against a 50-digit reference (parent length, offset and tangent point to
1e-13, the radius behind the cap to 3e-16 R) and asked for tests that pin
the Von Karman series (now: radius and slope behind the cap from theta =
0.01 to 1 against the full Taylor series, which catches the three faults
it planted), a test of the refusal near R with its true reason, every
reason given together, the cone by all its names, and the cap's radius
as sqrt(x (2 r_n - x)) in place of sqrt(r_n^2 - (x - r_n)^2), which
cancels near the tip. **The lanes keep the old cap formula** (their frozen
trees are ae794e4's and are not restarted): against the geometry after
these fixes, the radius sampled at 20001 points per nose (x = L k^3 /
20000^3, so densest at the tip) differs by at most 4.3e-12 R, at the
samples within 1e-12 of the tip; closer to it the difference grows,
to 3.6e-11 R near x = 1e-14 and 1.8e-9 R near x = 1e-18 (the third
review), though no grid samples there. The grids evaluate the profile
only above about x = 1e-8, where the two differ by at most 2.2e-14 R
(the third review's check of the lanes' points). `results/geometry-compare-after-review2.json` holds the comparison as measured now.

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
`runners/jobs-vk.txt`. The committed runners run from the repository
root (or with ROOT set to it); the frozen copies the lanes run hold this
worktree's absolute paths. Every case on nj = 20 first, then 40, then 80 and
its marches, so a case that fails is seen early. Results land in
`tests/tmp-w6b/out` and are copied to `results/` as they finish.

**A fit that stalls** (added 2026-10-26, before its march): the
3-caliber ogive with r_n/R 0.15 at Mach 1.3 on nj = 80 did not reach the
early stop: from 6000 to 24000 iterations its drag oscillated within
0.100929446 to 0.100929543 (about 5e-7 of it) with the residual at 1e-6
to 3e-6 and the shock speeds near 1e-8, never settling. Its process was
stopped and the grid finished by `runners/finish.sh` at 28000 iterations
(7000 per refinement), saved as not converged with that oscillation; its
march then ran (`jobs-extra.txt`). The analysis marks it ("checks
false": not converged), and its iterative error, about 5e-7 of the drag,
is stated wherever it is used. From 16:20 UTC on 2026-10-26 every fit
the lanes start stops at 7000 iterations per refinement in the same way
(`fit.test.ts`'s default, 40000 before): the families settle within
14000 on nj = 80, and a fit that has not by 28000 there is oscillating.

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

## 8. The TR 1386 check: decisions before anything is computed (2026-10-26)

Under 0014 10.7 (x), its addendum and the coordinator's decision, with
the readings and their neutral pairing on this branch
(`docs/research/tr1386/`). Written after reading only the models'
geometry (`readings/*/reader*_geometry.csv`) and figure 4's panels,
models, Mach numbers and stations, not its pressures.

- **What is compared.** Figure 4's surface pressures of the pressure
  models 4p and 5p, hemisphere-cones of 3 calibers overall with d/D =
  0.3 and 0.5 (r_n/R 0.3 and 0.5), at the Mach numbers printed on their
  curves: 4p at 1.50, 1.97 and 3.10; 5p at 1.54, 1.97 and 3.06. The
  geometry is read as W6's capped cone of 3 calibers overall: it gives
  cone half-angles of 6 deg 58.75 min and 5 deg 10.40 min against the
  printed 6 deg 59 min and 5 deg 10 min (`results/tr1386/geometry-check.txt`,
  a check of the reading of the geometry, not of any pressure).
- **6p is not compared.** It is a hemisphere-cylinder (d/D 1.0, cone
  half-angle 0). (x) names for comparison every model "whose shape the
  W6 solver takes"; W6's shapes take a tip radius below the base radius
  only (`validateNose`), and a hemisphere-cylinder is the ellipsoid of
  one radius, which main's own ellipsoid path (0006) solves, not W6's.
  So figure 4(c), with its disputed Mach number (3.80 against the text's
  3.7), is outside this check. A check of main's ellipsoid path against
  it would need an entry of its own.
- **Where.** Only ahead of the corner where the cone meets the cylinder,
  and only where the computed surface flow is supersonic ahead of it: a
  case is compared at the stations ahead of the corner if the computed
  surface Mach number is above 1 from the end of the cap's subsonic
  region to the corner, so that nothing behind the corner reaches them;
  otherwise the case is reported as not comparable. Each station's X/L
  is the reading pair's envelope; the computed value is taken over that
  envelope of X/L.
- **The computed value.** The fitted solution on the two-scale C grid
  (W6's capped cone, 2 calibers of cylinder behind it, as the
  references), on nj = 20, 40 and 80 started as W6's families are. At
  each station the wall pressure coefficient on nj = 80 (the wall faces'
  pressures, linear in x between face centres), with a numerical band of
  1.25 |Cp(80) - Cp(40)| / 3 if the three grids change monotonically
  there (second order assumed; the order is not measured at a station),
  or the range of the three grids if not.
- **Agreement.** At a station: the computed value with its band overlaps
  the reading pair's envelope widened by the report's stated uncertainty
  in P, 0.004. Reported per station and per case: agreement, or the
  difference (computed minus the nearer edge of the widened envelope)
  with its sign and its size, and against the envelope without the
  0.004 too. No cause is claimed unless one is shown. A difference
  beyond both envelopes goes to 0022 (w) as evidence under its rules. No
  drag series of TR 1386 (figure 8's wave drag included) is set against
  any W6 value.
- **Label.** "A check of the cap and the flow just behind it, on
  hemisphere-cones the page does not serve (r_n/R 0.3 and 0.5, outside
  W6's 0.03 to 0.15; capped cones refused)." It serves no shape and sets
  nothing.
- **When.** After the Mach 2 and 3 families, or alongside them once the
  machine has a core free (at 17:00 UTC its load was 15 to 17 on 4
  cores, from other lanes).

## 9. The third march: characteristics fitting the embedded shock (registered 2026-10-26, before any code or run)

The coordinator's decision of 2026-10-26: build the open route of section 7
now. Everything below is fixed before the code exists; nothing is changed
after its numbers are seen except to fix a demonstrated bug, recorded as
such.

**The method.** `characteristicsFrom`'s march (C- lines from the bow shock
to the wall, each from the one before), with one addition: an embedded
shock of the C+ family, fitted as a discontinuity on each C- line.

- _Formation._ Where two C+ characteristics of the march would cross
  (the points of a new C- line out of order along it), a shock of zero
  strength starts between them, at the crossing.
- _The shock point._ On each new C- line, the shock point is where that
  line meets the shock continued from its point on the line before at
  the mean of the two lines' shock angles. Its upstream state comes from
  the march on the outer side (the C- line from the bow shock and the
  C+ from the old line's last point upstream of the shock); its
  downstream state from the oblique-shock relations at the shock's angle
  relative to the upstream flow, with the angle fixed (secant, as the bow
  shock's) by the compatibility relation along the C+ arriving from the
  old line's first point downstream of the shock. The C- line continues
  to the wall from the downstream state; streamlines crossing the shock
  take the entropy jump, carried into K(psi) behind it.
- _Merging._ Where the embedded shock reaches the bow shock, the march
  continues with the bow shock alone (its angle from the usual
  compatibility relation); the weak reflected wave of the interaction
  is neglected and the neglect is stated.
- _Data._ The starting lines, the lines chosen and the drag downstream
  are those of the first march (section 3, `MOC_LINES=auto` on nj = 20),
  so the three marches are compared line for line.

**Verification, in this order, each passing before the next runs:**

- **V0, the unit process.** With uniform upstream and downstream states
  of an exact oblique shock (Mach 2 and 3; deflections 2, 5 and 10 deg),
  the embedded-shock point returns the exact shock angle and downstream
  pressure, density and flow angle to 1e-10 relative.
- **V1, a compression turn in the planar limit**, the exact solution
  available: a body far from the axis (a cylinder of radius 1e4 times the
  turn's length; the axisymmetric terms then change pressures by about
  1e-4) at Mach 2, turning the flow by 5 deg along a circular concave arc
  and straight after it. (The test body is given to the march as a
  profile function, a verification-only option; no served body has a
  concave profile.) Pass, on march resolutions n and 2n (n chosen so that
  the turn spans at least 20 C+ lines on the coarser):
  (a) the wall pressure behind the turn equals the isentropic
  Prandtl-Meyer value for 5 deg to within 5e-4 of it;
  (b) the shock forms where the planar simple-wave solution's first C+
  characteristics cross (the envelope's start, computed in the test from
  the arc), within 5% of the turn's length on the finer resolution;
  (c) the errors of (a) and of (b) fall with the resolution at an
  observed order between 0.8 and 3.
- **V2, the capped noses' own lines.** On the families of sections 3 and
  7 (first the 5-caliber ogive, r_n/R 0.03, Mach 1.3), from the same
  lines as the first march, on nj = 20, 40 and 80, and 640, 1280, 2560
  intervals: W5's line criterion unchanged (mass balance on 2560
  intervals and its change from 1280 below 3.5e-5 of the nose's drag,
  every grid); the control of section 6 item 2 against the first march
  on the lines behind the merge where both pass (within the larger of
  their changes from 1280 to 2560 intervals plus 1e-5 of the drag); and
  the coverage rule of section 6 item 3 (two or more lines carrying half
  the drag or more pass, and on each the fitted drag downstream minus
  the march falls by a factor of 2 or more per grid). Failing V2 on a
  case leaves its forward region unreferenced, as section 6 item 4 says.
- **Its own resolution.** On every line used, the march at 2560 and 5120
  intervals as well: the change from 2560 to 5120 below 3.5e-5 of the
  drag, the observed order over 1280, 2560 and 5120 between 0.8 and 3.

**What it then sets.** Where V2 passes, the references and misses of
those lines enter the allowance as section 3 says (twice the largest
miss over the references and the lines next to the ones used), and the
served region follows the coverage rule. Nothing is served before the
whole build's independent review.

**Cost.** Code and V0 to V1: little CPU (seconds to minutes per march).
V2: as the first march, about ten minutes per family on a shared core.
The lanes keep running.

(The heading's date was first written 2026-10-27 in error; the
registration's commit, 0fc0f8f, is of 2026-10-26 22:31 UTC, before any of
the march's code.)

### 9.1 V0 and V1 results (2026-10-26)

**V0** passes (tests/validation/characteristics-shocked.test.ts): the
unit process returns the exact oblique shock's angle and downstream state
to 1e-10 at Mach 2 and 3, deflections 2, 5 and 10 deg.

**Two bugs found while running V1, fixed before its verdict and recorded
here:**

1. _The test's construction._ As first written the body ended 5 turn
   lengths behind the turn's start and the starting line was 5 high. The
   C- line through the envelope's start (x 4.10, 1.79 above the wall)
   reaches the wall near x 8.4, so the march ended before any line
   reached it and no shock could form; lengthening the body to x 13 makes
   the march leave the starting data's triangle, where the bow "shock" (a
   Mach wave, of zero strength) sent the bow shock's secant below the
   Mach angle and the normal-shock relations threw. The body now ends at
   x 13 and the starting line is 10 high, so the whole test lies inside
   the triangle of the starting data's dependence; at the same density of
   lines the registered n becomes 800 (24 C+ lines on the turn), the
   n = 400 first chosen for the 5-high line.
2. _The march (characteristics-shocked.ts)._ The embedded shock's secant
   on its wave angle could step past the weak branch's sonic point, where
   the downstream state is subsonic and the characteristics' coefficients
   throw (it did at n = 1600). The secant is now kept inside the bracket
   its residuals give (the residual grows with the wave angle), bisecting
   when a step leaves it, a downstream state past the sonic point
   counting as too steep; below the upstream Mach angle the shock has no
   strength and a positive residual there leaves it a Mach wave.

**V1 as registered** (runner `runners/v1.test.ts`, results
`results/v1.json`), n = 800 and 1600 on the cylinder of radius 1e4:

| | n = 800 | n = 1600 | limit | |
|---|---|---|---|---|
| (a) wall pressure 0.5 behind the turn, error | 1.12e-5 | 8.40e-6 | 5e-4 | pass |
| (b) formation, distance from the envelope's start | 0.0399 | 0.0285 | 0.05 | pass |
| (c) observed order of (a) | | 0.42 | 0.8 to 3 | **fail** |
| (c) observed order of (b) | | 0.49 | 0.8 to 3 | **fail** |

So **V1 fails as registered, on (c)**, and V2 has not run. The
diagnostics in the same runner (n = 3200, and the planar network):

| | n = 800 | 1600 | 3200 |
|---|---|---|---|
| (a) on the cylinder | 1.12e-5 | 8.40e-6 | 7.68e-6 |
| (a) planar network | 3.2e-6 | 4.2e-7 | 2.5e-6 |
| (b) on the cylinder | 0.0399 | 0.0285 | 0.0140 |
| (b) planar network | 0.0398 | 0.0283 | 0.0138 |

- (a)'s error at these resolutions is below two floors of the test, not
  of the march: on the cylinder it tends to about 7.5e-6, the
  axisymmetric terms the registration itself expected (it estimated 1e-4;
  they are smaller); on the planar network it scatters by about 3e-6
  without a trend, which is the network's slope, a central difference of
  the radius over 1e-6 of the length: the radius is 1e4, so its rounding
  (2e-12) gives slopes to about 1e-6 radians, and pressures to about
  3e-6. The registered resolution (20 or more lines on the turn) already
  puts the march's own error below both, so (c) for (a) measures the
  floors.
- (b)'s error is about one spacing of the wall points (0.80, 1.14 and
  1.12 spacings at the three resolutions): the shock forms between two
  discrete C+ lines, and where the wall points fall against the arc's
  start (a fraction of a spacing) sets the remainder. Its order over one
  doubling scatters with that fraction (0.49 from 800 to 1600, 1.03 from
  1600 to 3200), though the error is first order in the spacing.
- The march on the cylinder and on the planar network agree on (b) to
  2e-4, and at its last point (x 7.41, n = 3200) the shock's wave angle
  is 34.300 deg on the cylinder and 34.301 on the planar network, against
  34.302 for the exact oblique shock of 5 deg at Mach 2 (not a registered
  check: the last compression waves are still reaching it there).

This needs the coordinator's ruling before anything else of the third
march runs: whether V1's (c) may be judged on a construction that can
measure an order (for example the planar network with the wall nearer the
axis's origin, so the slope has no rounding floor, and the order over
three doublings), registered anew before it runs; or whether the third
march stops here.

**The coordinator's ruling (2026-10-26):** V1 stays failed as registered;
its criterion (c) is not reworded and V1 is not marked passed. One new
test, V1b, is registered below as a separate entry before any run of it.
This is the one re-test after a test-construction failure.

### 9.2 V1b, the one re-test after V1's failure (registered 2026-10-26, before any run of it)

**Why it exists.** V1 failed as registered, on (c): its construction could
not measure an observed order. On the cylinder of radius 1e4 the march's
wall-pressure error was already below two floors of the test at the
registered resolution (the axisymmetric terms, about 7.5e-6, and the
slope's rounding, about 1e-6 radians), and the formation error's order
over a single doubling depended on where the wall points fell against the
arc's start (section 9.1). V1b removes those three causes and nothing
else: the limits and the order range are V1's. It is designed knowing
V1's numbers, including its diagnostic runs on the planar network
(section 9.1's tables), and says so here.

**If V1b fails, the third march stops.** There is no V1c; the forward
region of the capped noses (ahead of the merge, where the first march
fails W5's line criterion) stays unreferenced, and that is reported
plainly. A crash of the march, or a resolution on which no shock forms,
is a failure.

**The setup, in full.**

- The network: `characteristicNetwork` with its verification option
  `planar: true` (the axisymmetric source terms of both compatibility
  relations left out). Mach 2, gamma 1.4, the free stream p = rho = 1.
  (The stream function stays per radian, as the option's comment says;
  V1b judges no mass balance.)
- The wall, given to the march as a profile function: y = 1 for x <= x0
  = 1; a circular concave arc of radius r_c = 1/turn, turn = 5 deg (the
  arc's length 1), from x0 to x0 + x_arc, x_arc = r_c sin(turn), written
  without cancellation as y = 1 + d^2 / (r_c + sqrt(r_c^2 - d^2)), d = x -
  x0; then straight at the turn's slope, y = 1 + 2 r_c sin^2(turn/2) + (x
  - x0 - x_arc) tan(turn), to the profile's end x = 13. Breakpoints x0 and
  x0 + x_arc, scale 1. With the wall at y = 1 the radius's rounding
  (2.2e-16) gives slopes (central differences over 1e-6) to about 1e-10
  radians, against 1e-6 on V1's cylinder.
- The starting line: vertical, in the free stream (u = 2 sqrt(1.4), v =
  0), from the wall (y = 1) to y = 11, 41 given points equally spaced, its
  top a Mach wave (shock angle asin(1/2), zero strength). Its position
  depends on the resolution, which is how (b)'s wall phase is handled:
  in the free stream the march's wall points fall at x_s + j Delta, Delta
  = 10 cot(mu_0) / m = 20 sqrt(3) / n (m = n/2 points on the line), so
  with x_s = x0 - (K + 1/2) Delta, K = floor(0.5 / Delta), the arc's start
  lies halfway between two wall points at every resolution (x_s is
  0.502, 0.491, 0.497 and 0.499). The free stream ahead of the arc makes
  the exact solution the same for every x_s. The C- line from the line's
  top reaches the wall near x 17.8 in the free stream (later behind the
  turn), so the whole test lies in the triangle of the starting data's
  dependence and the bow shock's own march never runs.
- The resolutions: n = 800, 1600, 3200 and 6400 (three doublings; Delta
  = 0.0433 down to 0.00541; 23 wall points on the turn on the coarsest).

**The measures.**

- (a) The wall pressure at x0 + x_arc + 0.5, linear between the two wall
  points either side (the exact flow is uniform there: the turn's waves
  have passed and the embedded shock's reflections reach the wall only
  beyond x 8), against the isentropic Prandtl-Meyer pressure for 5 deg
  (nu(2) - 5 deg inverted by `machFromPrandtlMeyer`, to 1e-14): the error
  |p / p_PM - 1|.
- (b) The march's formation point (`formed`) against the envelope's start
  in closed form: the first C+ characteristic of the planar simple wave
  (from x0, at the Mach angle mu_0) meets its neighbours at distance t_0 =
  r_c sin(mu_0) / (1 + (1 + (gamma-1)/2 M^2) / (M^2 - 1)) = 3.58099 from
  x0, at (4.10123, 1 + 1.79049); along the turn the crossings move
  downstream (V1's sampled crossings, x 4.101 to 4.804 over the turn), so
  this is where the shock starts. (V1 sampled the crossings in 2000 steps
  and took the least x, which sits a half step, about 2e-4, downstream of
  the closed form: 4% of (b) on the finest resolution here, so V1b uses
  the closed form.) The error is the distance between the two points.

**Pass, all of:**

1. the march completes on all four resolutions and forms a shock on each;
2. (a) below 5e-4 on the finest resolution (V1's limit);
3. (b) below 0.05, 5% of the turn's length, on the finest resolution
   (V1's limit);
4. for each of (a) and (b), the observed order, the least-squares slope
   of ln(error) against ln(Delta) over all four resolutions, between 0.8
   and 3 (V1's range).

The runner is `runners/v1b.test.ts`, run once; it writes every
resolution's numbers and the verdict by these four conditions to
`results/v1b.json`, and asserts nothing itself. The result goes into
section 9.3 as it comes, pass or fail. V2 waits for V1b's pass.

### 9.3 V1b's result (2026-10-27): passes

Run once, at 03:12 UTC, from the runner committed before it (e36498f;
the registration 47dca21 pushed before that); `results/v1b.json`. The
march completed and formed a shock on all four resolutions; the arc's
start lay halfway between two wall points on each (0.5000 of a spacing
before it, 0.4996 to 0.49995 after: the first wall point on the arc is
reached by a C- line the first C+ wave has bent).

| n | Delta | (a) pressure error | (b) formation error | (b) / Delta |
|---|---|---|---|---|
| 800 | 0.04330 | 3.78e-6 | 0.04203 | 0.971 |
| 1600 | 0.02165 | 9.54e-7 | 0.02105 | 0.972 |
| 3200 | 0.01083 | 2.41e-7 | 0.01054 | 0.973 |
| 6400 | 0.00541 | 6.02e-8 | 0.00527 | 0.974 |

1. Complete, a shock on each: pass.
2. (a) on the finest, 6.0e-8 against 5e-4: pass.
3. (b) on the finest, 0.0053 against 0.05: pass.
4. Observed orders (least squares over the four): (a) 1.99, (b) 1.00,
   both within 0.8 to 3: pass.

**V1b passes**, so V2 may run (section 9). V1 itself stays failed as
registered (section 9.1).

### 9.4 V2 on its first family: fails (2026-10-27)

The 5-caliber tangent ogive, r_n/R 0.03, Mach 1.3. `runners/moc3.sh` ran
from 03:19 UTC out of a frozen tree of 8266e3a (`tests/tmp-w6b/tree4`:
that commit's src and runners, extracted from its archive). The lines
chosen on nj = 20 are the first march's: 22, 27, 34, 42, 52, 63 and 74.
The run was stopped at 03:42 (its own process group), during nj = 40,
when the first bug below was seen. Its partial output is kept in
`results/v2/moc3-ogive5rn0.03M1.3-stopped.*`, but its mass balances are
on the wrong scale and are not used.

**Two bugs, demonstrated and fixed (01d5e3d):**

1. _The mass balance's scale._ The third march divided every wall
   point's stream-function error by the starting line's mass flux.
   `characteristicsFrom`, whose definition W5's criterion uses, divides
   by the line's own flux once the march leaves the starting data's
   triangle. Shown on lines 52 and 63, where no embedded shock forms:
   their drags agree with the first march's to 1e-11 of the drag at every
   interval count, but their mass balances were 8 to 10 times the first
   march's (line 52, nj = 20, 2560 intervals: 5.55e-6 against 6.96e-7).
2. _Where a shock forms._ The crossing of two C+ characteristics was
   taken from the straight lines through the two old points at their own
   angles. When those lines are nearly parallel, the crossing can fall
   anywhere. On line 22 (nj = 20, 640 intervals), after the bow shock had
   merged, a second shock "formed" next to the wall at (-15.05, -24.48)
   (`results/v2/formation-off-the-strip.jsonl`), and the march then
   failed. Now the crossing is that of the C+ chords from the two old
   points to the new line, which lies between the two lines as the
   section 9 method requires.

V0 and V1b were run again after both fixes. Neither result changed: V1b's
numbers match to 1e-12 (`results/v1b-after-fixes.json`).

**After the fixes, the forward lines on nj = 20** (`runners/sweep.test.ts`
from the same tree with the fixed march;
`results/v2/sweep-ogive5rn0.03M1.3-nj20-after-fixes.txt`):

| line (share of the drag) | intervals | mass balance | fitted - march | fewest points on a line |
|---|---|---|---|---|
| 22 (98.8%) | 640 / 1280 / 2560 | 4.4e-4 / 9.1e-4 / 6.0e-5 | 6.2e-3 / 3.7e-4 / 1.1e-2 | 86 / 169 / 345 |
| 27 (98.6%) | 640 / 1280 / 2560 | fails / 1.6e-4 / fails | - / 9.7e-3 / - | 4 / 209 / 6 |
| 34 (97.2%) | 640 / 1280 / 2560 | 2.5e-4 / 3.3e-4 / 2.3e-4 | 7.0e-3 / 7.6e-3 / 7.9e-3 | 66 / 124 / 250 |
| 42 (92.4%) | 640 / 1280 / 2560 | 5.0e-5 / 8.5e-5 / 1.9e-4 | 1.05e-2 / 1.03e-2 / 9.6e-3 | 522 / 1017 / 2006 |

("fails": the state at the shock went subsonic, or a shock's normal Mach
number fell below 1.) Lines 52, 63 and 74 form no embedded shock, and
their march is the first march's. Line 52 (73.6% of the drag) fails the
criterion on nj = 20 just as the first march does: its change from 1280
to 2560 intervals is 4.5e-5.

**Verdict: V2 fails on this family.** No line carrying half the drag or
more meets W5's criterion on nj = 20. Because the criterion must hold on
every grid, none can pass overall, so coverage fails. The family's
forward region stays unreferenced (section 6 item 4). The nj = 40 and 80
marches would not change this and have not been rerun.

**The cause, as far as it has been seen: the method itself; no further
bug has been demonstrated.** The embedded shock absorbs C+
characteristics from both sides, and the registered method drops them.
So each C- line carries fewer points as the march goes on: from n + 1 at
the start down to 345 on line 22 at 2560 intervals, and to 4 to 6 on
line 27. The coarse lines then pass points beneath the body (up to 0.44
of the starting line's width), their mass balances do not fall with the
intervals, and on two of the twelve marches the state at the shock
fails.

V1b did not exercise this. Its domain ends before the shock reaches the
bow shock, and it judges no mass balance.

A remedy would be new points on the lines where the absorbed ones were,
as fitted-shock characteristics codes do. That is a change of method,
not a bug fix, so it is not made here. It would need its own registration
and verification, and that is the coordinator's decision. The other
families of V2 have not been run.

**The coordinator's ruling on V2 (2026-10-27):** V2 stays failed as run
(above). The defect is in the method, not in the test: the registered
march drops the C+ characteristics the embedded shock absorbs. One remedy
is justified, registered below as a new method, the fourth march. Option
(c), completing V2 on nj = 40 and 80 for the record, is not needed and
has not been run.

## 10. The fourth march: the third with its lines re-seeded (registered 2026-10-27, before any of its code runs)

**Why.** Section 9.4: the third march keeps no more points on a C- line
than survive the embedded shock's absorption. Its lines thin out, from n
+ 1 points to as few as 4, and the coarse lines then fail. The fourth
march is the third march (section 9, with the two fixes of 01d5e3d),
changed in one respect: each line is re-seeded to the first march's
number of points.

**If the fourth march fails anything below (V0, V1b, V3 or V2), the
marches stop.** The capped noses' forward regions stay unreferenced,
which is reported plainly, and the matter goes to the coordinator for
the owner. There is no fifth march.

**The re-seeding rule.** When a new C- line is complete, from its top
(the starting line's point in the triangle of the data's dependence, the
bow shock's point after it) to the body:

1. Count its points, the embedded shock's two sides counted as one. The
   target is the number the first march's line has at the same step:
   2(m - a) + 1 for the line from the starting line's point a (m = n/2
   points on that line, a = 0 at its top), and n + 1 in the march after
   it.
2. While the count is below the target, take the longest gap between
   neighbouring points of the line (straight distance), never the zero
   gap between the shock's two sides; ties go to the gap nearest the
   line's top. Insert a point at the gap's middle in the line's chord
   length.
3. The new point's x, y, flow angle, pressure and stream function come
   from cubic Lagrange interpolation in chord length. The interpolation
   runs through the gap's two points and their outer neighbours, on the
   same side of the embedded shock. Where that side has fewer than four
   points it is linear, through the gap's two points. The new point's
   entropy is the march's entropy table at its stream function (the
   table used for every point, with the jumps behind the embedded shock).
4. Indices after the point, the shock's included, move up by one.

The inserted points are ordinary points of the line: the next line
meets the C+ characteristics from them as from any other.

**Verification, in this order, each passing before the next runs:**

- **V0 and V1b, unchanged.** The same tests with the same criteria
  (sections 9 and 9.2), the march with re-seeding in place of the third.
  V0 is the unit process, which the rule does not touch. V1b's runner
  takes the fourth march by a switch; nothing in its setup or criteria
  changes.
- **V3, past the merge (new).** The axisymmetric network, with no
  verification option. At Mach 2 (gamma 1.4), the body is given to the
  march as a profile function:
  - a sharp cone of 10 deg half-angle from the tip to x = 1;
  - then a concave circular arc, tangent at both ends, turning the
    surface from 10 deg to 15 deg over an arc length of 0.05 (radius
    0.05 / (5 deg) = 0.5730, ending at x = 1.0488, r = 0.18715);
  - then a 15 deg cone to x = 6.
  Breakpoints at the arc's two ends, scale 1. The starting line is
  vertical at x = 0.5, from the cone's surface to its Taylor-Maccoll
  shock, 401 points of the Taylor-Maccoll field (as
  `tests/validation/characteristics.test.ts`'s `coneLine` builds them).
  The march runs on n = 640, 1280, 2560 and 5120 intervals. The concave
  arc's compression steepens into an embedded shock that reaches the bow
  shock well before x = 6, so the march runs past the merge, where V1b's
  test ends. It passes if all of:
  1. on every resolution the march completes to the body's end (its last
     wall point beyond x = 5.5), an embedded shock forms and merges with
     the bow shock, and no line has fewer points than the re-seeding
     target (the rule's own check);
  2. the mass balance (`characteristicsFrom`'s definition, W5's
     criterion's quantity) is below 3.5e-5 on 2560 and on 5120
     intervals;
  3. the mass balance's observed order, the least-squares slope of
     ln(mass balance) against ln(1/n) over the four resolutions, is
     between 0.8 and 3;
  4. the pressure drag of the wall from the starting line's foot to the
     body's end changes by less than 3.5e-5 of itself from 2560 to 5120
     intervals, at an observed order over 1280, 2560 and 5120 between 0.8
     and 3. This is V2's own-resolution requirement. The drag is the
     trapezoid of (p - 1) over r^2 between wall points, over the dynamic
     pressure and the end's r^2.
  The runner is `runners/v3.test.ts`, run once; it writes every
  resolution's numbers and the verdict to `results/v3.json` and asserts
  nothing itself.
- **V2, as registered (section 9), its criteria unchanged:** the families
  of sections 3 and 7, first the 5-caliber ogive with r_n/R 0.03 at Mach
  1.3, from the first march's lines, on nj = 20, 40 and 80, with 640,
  1280, 2560 and 5120 intervals, judged by `analysis/v2.mjs` as committed
  (9526d6c).

**Order of work.** This registration is committed alone and pushed. Then
come the code (the rule as an option of `characteristicsFromShocked`,
off by default so the third march stays as recorded) and the runners, in
small commits. Then the runs, in the order above, each recorded as it
comes, pass or fail.
