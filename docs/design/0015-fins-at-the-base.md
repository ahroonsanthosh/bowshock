# 0015: Fins at the base, the factor rebuilt (W1) (draft)

- **Status:** Draft. Library and tests: `src/base/fins-on-base-w1.ts`
  and its data `src/base/fins-on-base-w1-data.ts`, routed in
  `src/base/base-drag.ts`; `tests/base/fins-on-base-w1.test.ts`,
  `tests/total/fins-on-base-routing.test.ts`. Work item W1 of
  [0014](0014-refusals.md), under its section 10's registration. **The
  band rests on first readings only**: the second, blind reading is
  pending (section 7), and the band becomes the envelope of both when it
  arrives. No hold-out has been run on it (section 9).
- **Date:** 2026-10-20
- **Inputs:** 0014 sections 5.1, 6.2 (W1) and 10; [0010](0010-base-drag-and-total.md)
  section 1.3 (the present factor, kept) and section 10; [0008](0008-total-drag.md)
  section 3.4; the first readings
  ([`fins_at_base_w1.md`](../research/total-drag/data/fins_at_base_w1.md),
  `.csv`, `../scripts/w1/`); the two readings of TN 3819 fig. 35 already
  held (`src/base/tn3819-fig35.ts`); 0014's population
  (`docs/research/refusals/`).

## 1. Summary

The present fins-on-base factor F (P_B with fins over P_B without, 0010
section 1.3) is measured on one family, four unswept 10%-thick
circular-arc fins at the base, and serves four fins 5% to 10% thick at
Mach 1.80 to 3.0. It refuses 96% of 0014's population. The rebuilt
factor serves what the band-setting data of 0014 section 10.1 cover:

- **Sharp trailing edges** of any section that lies inside the 10%
  circular arc near its edges, two to four fins, unswept or with the
  leading edge swept 45 to 60 deg, at the base, at Mach 1.5 to 3.0; and
  fins ending up to a chord ahead of the base at Mach 1.5 to 2.0.
- **Flat faces at a square trailing edge** (flat plates), the same
  counts, sweeps and positions: "bounded, not measured" (0014 section
  10.2), between the lowest relief measured with such fins and the
  circular-arc member at least as thick (section 4).
- **Refused:** other counts, rounded or diverging trailing edges (the
  Basic Finner's wedges among them), thicker sections, sweeps not
  measured (0 to 45 deg and above 60 deg), Mach numbers outside 1.5 to
  3.0, positions ahead of the base above Mach 2.0 (section 6).

**Routing (0014 section 10.3).** The present factor is kept wherever it
serves, so the Basic Finner's validated total is unchanged to 1e-12 at all
11 gated shots (`fins-on-base-routing.test.ts`); the rebuilt factor is
used only where the present one refuses, and says so in its label (section
5). This holds until the owner decides otherwise after BRL 934's run.

**Bands.** On F, from 0.95 up to 1.33 to 1.56 for thin sharp-edged fins
(+-17% to +-24% about the midpoint), from 0.84 up to 1.33 to 1.52 for
flat plates (+-23% to +-29%), +-7.4% to +-8.2% for circular arcs that are
members themselves (section 3.6). Wider than 0014's planning figure of +-10% to
+-20%: the data bracket hobby fins only between families, not on them.

**Coverage** (0014's population, section 8): totals at Mach 1.5 to 1.8
rise from 0.2% to 1.4% of cases, at Mach 1.8 to 3.0 from 0.3% to 1.4%
(all bands 0.1% to 0.7%). The rebuilt factor still refuses, of each band
from Mach 1.5: unmeasured sweeps 42%, rounded and diverging trailing
edges 15%, steep bevels 6%, fins within a chord above Mach 2.0 7% (Mach
1.8 to 3.0); with those lifted 0014's projection of 2.8% would be met.
Everything else stays blocked by the fin-edge terms (W3, W4, W11), the
noses (W5, W6) and the base below Mach 1.5 (W2).

## 2. What moves the factor, in the band-setting sources

- **The section near the trailing edge.** TN 2360 (pp. 6, 10) traces the
  increment to the fins' pressure field over the dead-air region, "the
  airfoil pressures are proportional to the local slopes of the surface";
  its fig. 6 and TN 3819 fig. 33 measure it on circular arcs 0, 5% and
  10% thick: at x/c = 0 the 5% fins carry 0.46 to 0.74 of the 10% fins'
  increment (section 3.2), a little more than half (0.58 on fig. 33's
  points), so the increment is not linear in thickness. Sections "having small
  trailing-edge angles, such as a double-wedge or a blunt-trailing-edge
  section, appear to be the most favorable" (p. 11).
- **Flat faces at a square trailing edge.** RM L52E06 fig. 7 (free
  flight, M 1.06 to 1.10): four 0.091 in plates with rounded leading and
  square trailing edges at the base lower the base suction, rim F 0.852
  to 0.882 and centre 0.982; Hart: "low pressures are confined to a small
  region just behind the blunt trailing edge", and the relief comes from
  "low-momentum air from the fin-body junctures" (p. 5).
- **Count.** TN 2360 fig. 6 (plane and cruciform tails): the increment
  grows with count, less than in proportion (p. 10).
- **Position.** TN 2360 fig. 6: largest at x/c = 0 to -0.4, falling to
  zero or a relief a chord ahead.
- **Mach number.** The increment falls with Mach number (TN 2360 p. 10;
  TN 3819 figs. 33, 35).
- **Sweep.** RM L52J21a (45 deg swept 8% fins, M 1.62 to 2.41): with a
  turbulent layer the fins' effect is small, "essentially viscous" (its
  fig. 38(c): -0.0157 to +0.0055 in P_B); TN 3819 fig. 34 (the RM-10, 60
  deg, t/c 0.10): F 1.14 to 1.23 at M 1.49 to 1.98, where the unswept 10%
  fins give 1.35 to 1.73 in the tunnels (3.1).

## 3. The method

### 3.1 The reference member: four fins t/c 0.10 at x/c = 0

At each Mach number of 1.5 to 3.0, over every reading of TN 3819 fig. 35's
free-flight line (0008's first reading from M 1.80, round 3's from 1.1,
and this work's from 1.40 to 1.80, not blind), each as a factor on Love's
basic curve with its reading error (at least +-0.005 in P_B at M 1.75 to
2.35, the identity-swap error of 0010 section 1.3):

- **low end:** the least of (line minus its error);
- **high end:** the greatest of (line plus its error) and the tunnel
  factor: TN 3819 fig. 35's pairs (two readings), fig. 33 (t/c 0.10 over 0) and TN 2360 fig. 6's three runs over fig. 33's body alone, each with
  its reading error toward a larger factor, the largest at each tunnel Mach
  number (1.50, 2.00, 2.41), linear between them; beyond M 2.41, the line
  plus the largest tunnel excess over the line, **0.193** (TN 2360's run
  at M 1.5 against the line), carried as 0010 section 1.3 carries its
  0.140 (its option b, the conservative one).

| M      | 1.5   | 1.65  | 1.8   | 2.0   | 2.2   | 2.41  | 2.5   | 2.8   | 3.0   |
| ------ | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| F low  | 1.523 | 1.572 | 1.473 | 1.281 | 1.201 | 1.242 | 1.254 | 1.288 | 1.295 |
| F high | 1.728 | 1.642 | 1.556 | 1.441 | 1.417 | 1.391 | 1.465 | 1.501 | 1.519 |

Below M 1.8 the line has round 3's reading and this work's (not blind);
at 1.80 three; to 2.85 two (0008's first and round 3); above, round 3's
alone to 2.99, with the first reading's extrapolation beside it; at 3.0
both are extrapolated (flagged, as in 0010). The present factor's own band for the
same fins is built differently (its low end is half the increment, so as
to cover 5% fins) and is not changed.

### 3.2 The ratio members: thickness, count and position

Every other measured family member (t/c 0.05 or 0.10, two or four fins,
x/c = 0 to 1.0 at TN 2360's stations) is measured only in TN 2360's tunnel
at M 1.5 and 2.0. Each is carried as the ratio of its increment to the
reference's in the same tunnel: the range over every run and reading of
the member (fig. 6; for four fins t/c 0.05 at x/c = 0 also fig. 33)
against every run and reading of the reference (fig. 6's three runs and
fig. 33), each end moved by its reading error. Its band at M is that
ratio range times the reference's increment band (3.1), so the tunnel
ratio is carried to free flight and the band holds both. Between M 1.5
and 2.0 the ratio range is the envelope of the two Mach numbers' ranges
(no assumption on how it varies); a member measured at one Mach number
only (two fins t/c 0.05, M 1.5) serves there only; outside 1.5 to 2.0 no
ratio member exists.

| Member, x/c = 0    | Ratio at M 1.5 | Ratio at M 2.0 | F at M 1.5    | F at M 1.8    | F at M 2.0    |
| ------------------ | -------------- | -------------- | ------------- | ------------- | ------------- |
| four fins t/c 0.05 | 0.512 to 0.649 | 0.456 to 0.744 | 1.268 - 1.472 | 1.216 - 1.414 | 1.128 - 1.328 |
| two fins t/c 0.10  | 0.471 to 0.592 | 0.573 to 0.855 | 1.247 - 1.431 | 1.223 - 1.475 | 1.161 - 1.377 |
| two fins t/c 0.05  | 0.225 to 0.300 | not measured   | M 1.5 only    |               |               |

### 3.3 Position

Fins ending x/c chords ahead of the base: each member at the two TN 2360
stations that bracket x/c (0, 0.2, ..., 1.0, where that member was
measured at the Mach number), the envelope of both. At M 1.5 the
cruciform t/c 0.10 relieves the base a chord ahead (dPb +0.0155, F below
1). Above M 2.0 no position ahead of the base is measured, and such fins
are refused. A chord or more ahead keeps 0010 section 1.4's plain curve,
labelled not validated with fins.

### 3.4 Sweep: only where measured

The band-setting data have swept fins at the base at two sweeps, both
with circular-arc sections: RM L52J21a's 45 deg (leading and trailing
edges) at M 1.62 to 2.41, and the RM-10's 60 deg at M 1.49 to 1.98. Both
lie inside the bracket from the zero member (3.5) to the unswept member
that bounds their thickness, at every Mach number measured (RM L52J21a's
fin effects over fig. 8's cylindrical-base P_B; `fins-on-base-w1.test.ts`):

| Set                               | M            | F measured     | Zero member | Unswept member (low end)                                                         |
| --------------------------------- | ------------ | -------------- | ----------- | -------------------------------------------------------------------------------- |
| RM L52J21a, 45 deg, 8%, R 8.06e6  | 1.62 to 2.41 | 0.964 to 1.118 | 0.951 to 1  | 1.568, 1.340, 1.242 at M 1.62, 1.93, 2.41 (the reference, which bounds 8% fins)  |
| RM-10, 60 deg, t/c 0.10 (fig. 34) | 1.49 to 1.98 | 1.137 to 1.229 | 0.951 to 1  | 1.523, 1.560, 1.491, 1.298 at M 1.5 (for 1.49), 1.59, 1.78, 1.98 (the reference) |

So swept fins are served with the leading edge swept 45 to 60 deg and the
trailing edge swept no more than the leading edge (as in both sets),
bracketed between the zero member and the unswept member that bounds the
section. **Sweeps between 0 and 45 deg are refused.** No measurement
covers them, and the ordering cannot be carried there: for supersonic
edges at a fixed streamwise section, linear theory gives surface
pressures that grow with sweep (Cp proportional to 1 / sqrt(M^2 -
sec^2(sweep))) until the edge turns sonic, so a lightly swept fin could
exceed the unswept member. TN 3819's remark that sweepback "would, in most
instances, decrease the fin effects" (p. 22) argues from "the thickness
ratio of the fin parallel to the body surface" being reduced, that is,
from fins swept at a fixed section normal to the edge, not at a fixed
streamwise section as hobby fins are given. Opening 0 to 45 deg needs a measurement.

### 3.5 The zero member

No fins, or fins whose pressure field vanishes: F from 1 down to the
largest relief measured at M 1.5 or above with fins near the base and a
turbulent layer, RM L52J21a fig. 38(c) at R = 8.06e6 (its most positive
dPb at each Mach number, over fig. 8's least negative cylindrical-base
P_B, both read toward more relief): 0.975, **0.951** and 0.965 at M 1.62,
1.93 and 2.41. The plain and flagged symbols of fig. 38 cannot be told
apart on the 1-bit scan, so the cylindrical base's relief is at most the
cluster's; its least relief factor, 0.951, is carried to every Mach
number served. It is the lower member of every bracket whose section
lies below t/c 0.05, of every swept fin, and of three or two fins where
two are not measured.

### 3.6 The bracket and the band

A case lies between a lower member it dominates and an upper member that
dominates it:

- **Section** (sharp trailing edges): with h(s) the half-thickness in
  chord units, tauLow = min h / (2 s (1 - s)) and tauEq = max of the same,
  the thickest parabolic arc the section dominates and the thinnest that
  dominates it at every station (`sectionBracket`). A double wedge t/c
  lies between t/c / 2 and t/c; a plate bevelled over a fraction b of the
  chord at each edge, between min(t/c, tan(bevel) / 2) and tan(bevel) /
  (2 (1 - b)). The lower
  member is the largest member thickness at most tauLow, the upper the
  smallest at least tauEq; tauEq above 0.10 is refused. Circular arcs
  (`sectionFamily: 'circular-arc'`) are their own members. The argument
  is TN 2360's (pp. 6, 10): the increment follows the section's surface
  near the trailing edge, so an arc that is everywhere thicker bounds it.
- **Count:** four fins, the four-fin members; three, between two and
  four; two, the two-fin members, or zero to four where two are not
  measured.
- **Position and sweep:** 3.3, 3.4.

Where a member is not measured at the Mach number the bracket widens
outward: t/c 0.05 above to 0.10, below to the zero member, two fins to
zero. The band is the envelope of the two members' bands; the nominal is
its midpoint (0008 section 6.3). Every row is asserted by
`fins-on-base-w1.test.ts`:

| M   | Case                                           | Lower, upper member                     | F low  | F nominal | F high | Half-width |
| --- | ---------------------------------------------- | --------------------------------------- | ------ | --------- | ------ | ---------- |
| 1.5 | double wedge 2.4%, three fins, 45 deg          | zero; four fins t/c 0.05                | 0.9507 | 1.2115    | 1.4723 | 21.5%      |
| 1.8 | the same                                       | zero; four fins t/c 0.05                | 0.9507 | 1.1822    | 1.4137 | 19.6%      |
| 2.0 | the same                                       | zero; four fins t/c 0.05                | 0.9507 | 1.1394    | 1.3282 | 16.6%      |
| 2.5 | the same                                       | zero; the reference                     | 0.9507 | 1.2076    | 1.4645 | 21.3%      |
| 3.0 | the same                                       | zero; the reference                     | 0.9507 | 1.2348    | 1.5189 | 23.0%      |
| 1.8 | double wedge 2.4%, four fins, unswept          | zero; four fins t/c 0.05                | 0.9507 | 1.1822    | 1.4137 | 19.6%      |
| 1.8 | bevelled plate 3% (bevel 0.085 chord), 45 deg  | zero; the reference                     | 0.9507 | 1.2532    | 1.5558 | 24.1%      |
| 1.8 | flat plate 2.4%, three fins, 45 deg (bounded)  | RM L52E06 relief; t/c 0.05              | 0.8379 | 1.1258    | 1.4137 | 25.6%      |
| 2.5 | the same (bounded)                             | RM L52E06 relief; the reference         | 0.8379 | 1.1512    | 1.4645 | 27.2%      |
| 1.8 | circular arc 10%, three fins, unswept          | two fins t/c 0.10; reference            | 1.2229 | 1.3893    | 1.5558 | 12.0%      |
| 1.8 | double wedge 2.4%, three fins, 45 deg, x/c 0.5 | zero; four fins t/c 0.05 at 0.4 and 1.0 | 0.9045 | 1.0892    | 1.2739 | 17.0%      |

A member served as itself (four unswept 5% arcs at M 1.5 to 2.0) carries
+-7.4% to +-8.2%. On the body base term these widths are the fins-on-base
part of the band; the curve's 0.82 to 1.08 and the interpolation bound
add to them as in 0010 section 1.4. At these Mach numbers the body base
is roughly 25% to 40% of a total (0014 section 6.2), so the factor's band
alone is about +-4% to +-12% of the total.

**Labels.** A member: "estimated on component data: the rebuilt
fins-on-base factor (0015), measured on ..., tested only in the total".
Otherwise: "estimated on component data: the rebuilt fins-on-base factor
(0015), between <lower> and <upper>; <why: the section bracketed, swept,
three fins, the position>; not measured on these fins, tested only in the
total". Every total containing it is "an estimate, not validated" (the
class rule of 0011 section 3, unchanged).

## 4. Fins with flat faces at a square trailing edge: bounded, not measured

The population's flat plates (square, rounded or bevelled leading edges,
square trailing edges: 53% of it, 68% with the rounded trailing edges,
which stay refused) have no band-setting measurement at the base above M
1.10. The coordinator ruled (2026-10-20) that the owner's allowance of
0014 section 10.2 covers them as a class, provided its condition is met:
the ordering is shown by band-setting evidence, not assumed. (Section
10.2's "Where" names square-cut leading edges and rounded trailing edges
only; this record applies it here on that ruling, and says so.)

**What the band-setting data show.**

- _Upper side._ At M 1.5 and 2.0 TN 2360 fig. 6 and TN 3819 fig. 33
  measure the increment falling with the circular arcs' thickness and
  trailing-edge slope, toward zero at t/c 0; TN 2360 traces it to the
  faces' pressures near the trailing edge, proportional to their slope
  (pp. 6, 10), zero on a flat face, and names "a blunt-trailing-edge
  section" among "the most favorable" (p. 11). The square edge's own low
  pressure is "confined to a small region just behind the blunt trailing
  edge" (RM L52E06 p. 5). And at M 1.06 to 1.10, the one place both are
  measured, flat plates lie below the circular arcs: F 0.85 to 0.98 (RM
  L52E06 fig. 7) where TN 3819 fig. 35's free-flight line gives 1.544 at M
  1.1 (round 3's reading over Love's basic curve; one reading). So the upper bound is the unswept
  circular-arc member at least as thick as the plate (t/c 0.05 or 0.10 by
  the plate's thickness, 0.10 above M 2.0), not a thinner one.
- _Lower side._ The relief is measured: RM L52E06 fig. 7's rim pressures
  give F 0.852, 0.866 and 0.882 at M 1.06, 1.08 and 1.10, weakening with
  Mach number, and at M 1.62 to 2.41 RM L52J21a measures at most 5% relief
  with turbulent layers (3.5). The lowest, at M 1.06 with the reading
  errors toward more relief, is **0.838** (`W1_FLAT_RELIEF_LOW`): below
  the zero member's 0.951, so RM L52E06's reduction is contained.

At M 1.5 and above no flat-faced fin is measured at the base. There the
ordering rests on what is measured: the increment's dependence on the
faces near the trailing edge (TN 2360 and fig. 33, on circular arcs at M
1.5 and 2.0), the ordering of the two families where both are measured (M
1.06 to 1.10), and the relief's weakening with Mach number (RM L52E06 to
M 1.10, RM L52J21a from 1.62). It is an ordering argued from those
measurements, not a measurement of these fins, which is what 0014 section
10.2's label says.

**What is served.** At M 1.5 to 3.0, with the counts, sweeps and
positions of section 3: the midpoint of 0.838 and the upper member's high
end, the band the whole gap, labelled "bounded, not measured: the rebuilt
fins-on-base factor (0015), between the lowest relief measured with
flat-faced fins at the base (F 0.838, RM L52E06 fig. 7 at M 1.06) and
<upper member>; ...", with the gap's size in C_D beside it
(`base-drag.ts`). A total containing it is at best "an estimate, not
validated" and names the component (0014 section 10.2).

**What it does not reach.** Rounded trailing edges (no section form;
refused as before); blunt edges whose faces diverge to them (the Basic
Finner's single wedges: their faces compress the flow near the base,
which TN 2360's argument says raises the base pressure by an amount no
source measures, so neither bound is shown) or converge to them.

## 5. Routing

`bodyBaseDrag` (`src/base/base-drag.ts`) with fins at the base first asks
the present factor. Where it serves, its result is used unchanged (labels
and numbers); where it refuses, and the fins' section and sweeps are
given (`BaseFins.nearBase`; `src/total/finned-body.ts` gives them), the
rebuilt factor is asked, and its label carries "the rebuilt factor is used
because the present factor (0010 section 1.3), which the Basic Finner's
validated total keeps, does not cover these fins (<the present
refusal>)". Where both refuse, the refusal is the rebuilt factor's, with
the present factor's message beside it. Fins within a chord ahead of the
base go to the rebuilt factor directly. `BodyBaseDrag.finsOnBaseSource`
says which factor was used.

Tests (`fins-on-base-routing.test.ts`): four fins 5% to 10% thick at M
1.799 to 3.0 give identical numbers and labels with and without the
section; the 11 gated Basic Finner shots give the same body base and total
(C_D, low and high) within 1e-12, the present factor used at each; three
fins, thin fins and M 1.6 go to the rebuilt factor with the routing label;
the refusals carry both reasons. Behaviour changes only where the present
factor refused: on the page the Basic Finner's form at M 1.6 or with three
fins is now refused for its trailing edge, by the rebuilt factor, with the
present factor's reason beside it (`tests/app/`).

## 6. What stays refused

| Refused                                                | Why                                                                   |
| ------------------------------------------------------ | --------------------------------------------------------------------- |
| fewer than two or more than four fins                  | TN 2360 has two and four                                              |
| sections outside the 10% arc (tauEq above 0.10)        | the thickest member; steep short bevels among them                    |
| rounded, diverging and converging blunt trailing edges | no measurement, no ordering (section 4)                               |
| leading-edge sweep between 0 and 45 deg, or above 60   | not measured; ordering not shown (3.4)                                |
| trailing edge swept more than the leading edge         | outside both swept sets                                               |
| Mach below 1.5 or above 3.0                            | the reference's range; the body base is refused below 1.5 anyway (W2) |
| fins ending ahead of the base above M 2.0              | TN 2360 measures positions at M 1.5 and 2.0 only                      |

## 7. Readings

First readings (this work): TN 2360 fig. 6 (every symbol at x/c = 1.0 to
0), TN 3819 figs. 33 and 34 (all symbols) and 35 (the free-flight line at
M 1.40 to 1.80, not blind), RM L52J21a figs. 38(c) and 8 (R = 8.06e6),
RM L52E06 fig. 7 (M 1.06 to 1.10): `fins_at_base_w1.md`, with every value
in `fins_at_base_w1.csv` and `fins-on-base-w1-data.ts`, held to each other
by `fins-on-base-w1.test.ts`. The band-setting figures 0014 lists that this
method does not use were not read (TN 2360 figs. 5 and 7, TN 3819 fig. 32,
RM L52J21a figs. 31 to 33 and 39, RM L52E06 figs. 6 and 8, TN 3372 figs. 7
to 12).

**Second readings: pending.** An independent reader is making blind
second readings of the same figures. When they arrive they are added to
`fins-on-base-w1-data.ts` beside the first, tagged 'w1 second'; every
member's band is already built as the envelope over all readings held, so
the band widens where the readings differ and the tests' tables are
re-derived. Until then `secondReadingPending` is true on every result,
and the bands above rest on one reading of each figure (two of fig. 35
above M 1.8, three to 2.85).

## 8. Coverage

0014's population (`docs/research/refusals/`, 2000 rockets, one
condition per Mach band), with `evaluate.ts` now asking the library
itself (`bodyBaseDrag` with the fins' section and sweeps) at M 1.5 to
3.0. Before: `out/impact-before-w1.out` (0014's run); after:
`out/impact.out`.

Totals (a number served for the whole rocket), share of the cases in each
band:

| Run                                                      | All bands    | M 1.0 to 1.2 | 1.2 to 1.5 | 1.5 to 1.8   | 1.8 to 3.0   |
| -------------------------------------------------------- | ------------ | ------------ | ---------- | ------------ | ------------ |
| Baseline population, before                              | 0.1%         | 0%           | 0%         | 0.2%         | 0.3%         |
| Baseline population, after                               | **0.7%**     | 0%           | 0%         | **1.4%**     | **1.4%**     |
| Blunted tips entered as sharp, before and after          | 0.1% to 1.2% | 0%           | 0%         | 0.2% to 2.4% | 0.3% to 2.3% |
| Every condition at 0 km, and at 20 km, before and after  | 0.1% to 0.7% | 0%           | 0%         | 0.2% to 1.4% | 0.3% to 1.4% |
| Variant: four-fin, sharp-edged fins, before and after    | 0.2% to 1.6% | 0%           | 0%         | 0.4% to 3.3% | 0.5% to 3.0% |
| Variant: fewer Haack noses and blunt tips, before, after | 0.2% to 1.4% | 0%           | 0%         | 0.3% to 2.9% | 0.3% to 2.8% |

Below Mach 1.5 nothing changes: the body base is refused there (W2).
The rebuilt factor's own refusals, as a share of each band's cases:

| Refusal (rebuilt factor)                                 | 1.5 to 1.8 | 1.8 to 3.0 |
| -------------------------------------------------------- | ---------- | ---------- |
| sweep not measured (0 to 45 deg, above 60, or TE beyond) | 42.4%      | 42.3%      |
| rounded or diverging blunt trailing edge                 | 14.8%      | 14.8%      |
| section outside the 10% arc (steep bevels)               | 5.6%       | 5.5%       |
| fins within a chord of the base, above M 2.0             | 0%         | 7.2%       |
| fewer than two or more than four fins                    | 0%         | 0%         |

The present factor's three refusals (count, thickness, Mach 1.5 to 1.8)
no longer arise at Mach 1.5 to 3.0. Lifting the rest would bring the
totals to 0014's projection for W1, 2.8% in each band from Mach 1.5;
lifted alone after W1 they give 1.4% of all cases. The decomposition
agrees with `src/total` on all 824 cases the library can represent
(`impact.out`, cross-check). The flat plates' bounded value changes no
total today: every flat plate is refused by its edge terms or the page
(F1 to F3, F12 of 0014's inventory).

## 9. Hold-outs

None has been run. 0014 section 10.5 fixes when: BRL 934's range A (M 1.5
to 2.47) once W1 is committed with its band, which needs the second
readings in (rule 5 of 10.1); its rounds are the Basic Finner's wedges,
which the rebuilt factor refuses, so range A tests the present factor
(10.3) and records the rebuilt one's refusal. The PARD standard body
(flat plates, 45 deg, at the base) needs W2, W3 and W4 besides W1's
bounded value; the Eglin set needs its fins' edges decided first; TN 3320
(the RM-10) needs W10. So W1 is "estimated on component data" with no
hold-out of its own yet.

## 10. Open

- The second readings (section 7).
- Sweeps of 0 to 45 deg: a measurement of moderately swept fins at the
  base (none among the opened sources).
- Rounded and diverging trailing edges at the base.
- Fins ahead of the base above M 2.0 (TN 3819 fig. 32's Langley symbols
  at M 2.41, x/c 0 to 1, are band-setting and not read here).
- Whether the rebuilt factor replaces the present one inside the Basic
  Finner's class: the owner's decision after BRL 934's run (0014 section
  10.3). It would not today: it refuses the Basic Finner's wedges.
