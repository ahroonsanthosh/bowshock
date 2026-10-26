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
