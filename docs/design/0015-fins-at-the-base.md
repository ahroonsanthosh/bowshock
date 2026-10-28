# 0015: Fins at the base, the factor rebuilt (W1), and the base below Mach 1.5 (W2) (draft)

- **Status:** Draft. Library and tests: `src/base/fins-on-base-w1.ts`
  and its data `src/base/fins-on-base-w1-data.ts`, routed in
  `src/base/base-drag.ts`; `tests/base/fins-on-base-w1.test.ts`,
  `tests/total/fins-on-base-routing.test.ts`; since W1b and W2 also
  `src/base/base-w2.ts` and `tests/base/base-w2.test.ts`. Work items W1
  and W2 of [0014](0014-refusals.md), under its section 10's
  registration, with W1b (moderate sweeps, section 3.4) and W2 (section 11) as the coordinator decided on 2026-10-20. **Readings:** W1's are in
  twice (round 6's blind second reading, paired in section 7) except RM
  L52J21a fig. 38(c), which cannot be read a second time from the scan
  and no longer sets the zero member; NSWCDD/TR-92/509 Table 2 (W1b) has
  one reading, its blind second requested, and the code carries
  `secondReadingPending` and the labels say so. TN 3819 fig. 18's rows
  below Mach 1.5 and its free-flight curve (W2), RM L52J21a figs. 31 to 33
  (d) and fig. 8's nose calls are read twice since round 7 (2026-10-21,
  section 7): fig. 18's basic-curve row at M 1.4 was a misread and is
  corrected, and the zero member is re-derived from figs. 8 and 31 to 33
  by nose, 0.938 (section 3.5), the conical and radome noses at M 2.41
  called by one reader. Since 2026-10-21 also: fins at the base from Mach
  1.0 (the owner's decision, section 11.2), and swept fins at the base
  go to the rebuilt factor, the present one refusing them (section 5).
  Every band is the envelope of every reading. No hold-out has
  been run (sections 9, 11.4). Revised on 2026-10-21 for the
  identification of TN 3819 fig. 35's free-flight curve (0010 section
  11): the reference member rests on the identified curve to Mach 2.56
  and is bounded, not measured, above it (sections 3.1, 7). Revised again
  after the independent review of e254989 (2026-10-21): sharp sections
  with a swept trailing edge at the base refused (section 3.4); below M
  1.5 the factor stated on W2's body base, so the free-flight excess is
  not counted twice (section 11.2); the zero member RM L52E06's below M
  1.62 (section 3.5); the present factor kept for its measured families
  only, every flat-faced fin taking the rebuilt factor's flat-plate value
  (sections 4, 5; 0014 section 10.7, amendment i, superseding main's
  amendment e); the TN 2360 symbols one reader found flagged where they
  set a band's end (section 7). After the second review (2026-10-22):
  the band widths quoted as the code gives them and held to it by tests
  (sections 1, 4), the step at M 1.62 quantified (section 11.2), the
  swept-trailing-edge threshold at 0.9 root chords and forward sweeps
  refused (section 3.4), and the labels of members and swept plates
  corrected (section 3.6); no served number changed (section 8). On
  2026-10-26 (A5; 0014 section 10.7 (ad)): fins ending within a chord
  ahead of the base below Mach 1.5 were first served as "bounded, not
  measured", then narrowed to 0.4 root chords, and after the independent
  review withdrawn: every position ahead of the base is refused below
  Mach 1.5, and at Mach 1.5 to 2.0 positions are served only with TN
  2360's root chord of 1.5 body diameters (the chord rule, section 3.3);
  above Mach 2.0 still refused, TN 3819 fig. 32 read three times but no
  method using it written yet (section 10).
  Amended 2026-10-26 (section 12; 0014 section 10.7 (z)): flat-faced fins
  at the base served at every leading-edge sweep with the trailing edge
  unswept, on section 4's bounds unchanged; narrowed 2026-10-27 (the
  ruling after the review, (z)'s note): below Mach 1.62 not those swept
  more than 0 and under 45 deg, nor beyond 60 deg.
- **Date:** 2026-10-20 (revised 2026-10-21, 2026-10-22 and 2026-10-26; amended 2026-10-26 and 2026-10-27)
- **Inputs:** 0014 sections 5.1, 6.2 (W1) and 10; [0010](0010-base-drag-and-total.md)
  section 1.3 (the present factor, kept) and section 10; [0008](0008-total-drag.md)
  section 3.4; the first readings
  ([`fins_at_base_w1.md`](../research/total-drag/data/fins_at_base_w1.md),
  `.csv`, `../scripts/w1/`); the second
  (`fins_at_base_w1_second.csv`, from `audit/round6/`), and round 7's (`data/round7/`); the two readings of TN 3819 fig. 35's
  identified free-flight curve (0010 section 11, `src/base/tn3819-fig35.ts`); 0014's population
  (`docs/research/refusals/`).

## 1. Summary

The present fins-on-base factor F (P_B with fins over P_B without, 0010
section 1.3) is measured on one family, four unswept 10%-thick
circular-arc fins at the base, and serves four unswept fins of its own
families (wedge, circular-arc and hexagonal sections) 5% to 10% thick at
Mach 1.80 to 3.0 (below 5% extended, 0016 section 18). It refuses 96% of
0014's population. The rebuilt factor serves what the band-setting data
of 0014 section 10.1 cover:

- **Sharp trailing edges** of any section that lies inside the 10%
  circular arc near its edges, two to four fins, at Mach 1.5 to 3.0: at
  the base unswept or with the leading edge swept 45 to 60 deg and the
  trailing edge unswept, and with the leading edge swept up to 45 deg and
  the trailing edge unswept at Mach 2.0 to 3.0 (W1b, section 3.4); fins
  ending up to a chord ahead of the base at Mach 1.5 to 2.0 (since 2026-10-26 with a root chord of 1.5 body diameters only, section 3.3), the trailing
  edge swept aft, no more than the leading edge, from 0.9 root chords ahead
  (RM L52J21a's position); and, below Mach 1.5 (W2, section 11), unswept
  fins at the base at Mach 1.0 to 1.5 (from 1.0 since the owner's
  decision of 2026-10-21, section 11.2), the factor stated on W2's body
  base so that the free-flight excess is not counted twice (since the
  review of 2026-10-21).
- **Fins ending within a chord ahead of the base** are served at Mach 1.5
  to 2.0 only, and since 2026-10-26 only with TN 2360's root chord of 1.5
  body diameters (within 0.5%), the one geometry its positions are
  measured on; below Mach 1.5 they are refused (A5, section 3.3: a bound
  there was built and withdrawn after the independent review).
- **Flat faces at a square trailing edge** (flat plates, at every Mach
  number from 1.0, since 2026-10-21 also where the present factor would
  have served them; 0014 section 10.7, amendment i), the same counts and
  positions, swept also below Mach 1.5, and since 2026-10-26 at every
  leading-edge sweep when the trailing edge is unswept (section 12; with
  the trailing edge swept, the sweeps of section 3.4): "bounded, not
  measured" (0014 section 10.2), between the lowest relief measured with
  such fins and the circular-arc member at least as thick (section 4).
- **The body base below Mach 1.5** (W2, section 11): Love's curve
  continued to Mach 1.0 with a band of 0.77 to 1.31 (0.82 to 1.31 before
  0014 section 10.7 (ah)) set on free-flight data, the nominal at its
  midpoint.
- **Above Mach 2.56**, where the free-flight curve of TN 3819 fig. 35
  ends (0010 section 11), every case served is "bounded, not measured":
  the reference member there runs from the zero member's 0.938 to its
  high end at Mach 2.56 (section 3.1).
- **Refused:** other counts, rounded or diverging trailing edges (the
  Basic Finner's wedges among them), thicker sections, sweeps not
  measured (sharp sections with the trailing edge swept aft within 0.9
  root chords of the base, or swept forward anywhere; sharp sections 0 to 45 deg below Mach 2.0 or above 60 deg; swept sharp sections
  below 1.5; plates with a swept trailing edge outside 45 to 60 deg, section 12), fins at the base below
  Mach 1.0 or above 3.0, positions ahead of the base above Mach 2.0 or
  below 1.5, and at Mach 1.5 to 2.0 with a root chord other than 1.5 body
  diameters, and fins more than a chord ahead of the base at any Mach
  number (the plain curve withdrawn on 2026-10-27; section 6).

**Routing (0014 sections 10.3 and 10.7).** The present factor is kept for
the fin families it was measured on, so the Basic Finner's gated total is
unchanged to 1e-12 at all 11 gated shots (`fins-on-base-routing.test.ts`;
its validated claim is suspended by the owner's decision, 0008 section
6.1); the rebuilt factor is used where the present one refuses and for
flat-faced fins (plates), which the present one is not measured on (every
flat-faced fin at the base since the review of 2026-10-21, superseding
main's refusal of them; 0014 section 10.7, amendment i), and says so in
its label (section 5). Since 2026-10-21 the present factor
refuses fins swept at either edge (0014 section 10.7), so swept fins at
the base go to the rebuilt factor, which serves the sweeps it measures
(section 5). This holds until the owner decides otherwise after BRL 934's
run.

**Bands.** On F, over Love's curve (each figure held to the code by
`fins-on-base-w1.test.ts` and `base-w2.test.ts`): for sharp-edged fins up
to 5% thick, from 0.94 up to 1.33 to 1.49 at Mach 1.62 to 3.0 (+-17.2% to
+-22.8% about the midpoint), and from 0.84, where the zero member is RM
L52E06's (section 3.5), up to 1.47 at Mach 1.5 itself (+-27.5%) and 1.49
to 1.54 above it to 1.62 (+-28.0% to +-29.6%, the widest just above M
1.5, where the ratio range becomes the envelope of both tunnel Mach
numbers', section 3.2); for flat plates at most 5% thick at their
thickest station from 0.84 up to 1.33 to 1.54 at Mach 1.5 to 3.0
(+-22.6% to +-29.6%), and for thicker plates, whose upper member is the
10% arc, +-34.7% at 1.5, +-30.1% at 1.8, +-26.5% at 2.0 and +-24.4% to
+-24.5% at 2.5 to 3.0; below Mach 1.5, where every upper member is the
reference, on W2's body base +-31.7% to +-34.9% for both (+-32.8% to
+-35.9% since 2026-10-27, when 0014 section 10.7 (ah) moved W2's nominal
from 1.065 to 1.04); +-7.3% to
+-10.9% for the 5% circular arcs that are members themselves (section
3.6). Wider than 0014's planning figure of +-10% to +-20%: the data
bracket hobby fins only between families, not on them.

**Coverage** (0014's population, section 8): totals of all bands rise
from 0.1% before W1 to 0.7% after it and 1.0% after W1b and W2; with
main's fin edges of flat plates merged (0016), 2.1%; after the review of
2026-10-21, 2.0% (the ten cases lost are sharp sections with a swept
trailing edge at the base); and with main's fins' own-drag guard merged
(0014 section 10.7 (f): fin friction and the wave drag of sharp sections
refused below Mach 1.5), 1.9%: 0% at Mach 1.0 to 1.5, where W2 serves the
body base but every total waits for the fin terms, 2.5% at 1.5 to 1.8 and
5.2% at 1.8 to 3.0, against 0.2% for main with the present factor alone.
Of the 153 totals served, 80 carry the flat-plate value. The
rebuilt factor still refuses, of each band from Mach 1.5: unmeasured
sweeps 18% to 45%, rounded and diverging trailing edges 15%, steep bevels
6.5% to 13%, fins within a chord above Mach 2.0 11.5% (Mach 1.8 to 3.0).
Totals at Mach 1.0 to 1.5 stay 0% until W7: its nose solve below Mach 1.2
and its fin terms near Mach 1 (0019).

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

At each Mach number of 1.5 to 2.56, over every reading of TN 3819 fig.
35's free-flight curve as 0010 section 11 identifies it (the curve's two
readings, `TN3819_FIG35_FREE_FLIGHT`, to M 2.56, `FIG35_FREE_FLIGHT_END`,
the second reading's last point, M 2.563, left out; and this work's at M
1.40 to 1.80, not blind; all through one export, `W1_FIG35_LINE`), each
as a factor on Love's basic curve with its reading error (at least the
identity-swap error, 0.0077 in P_B at M 1.75 to 2.56,
`FIG35_IDENTITY_SWAP`, 0010 section 11).

- **low end:** the least of (line minus its error);
- **high end:** the greatest of (line plus its error) and the tunnel
  factor: TN 3819 fig. 35's pairs (three readings), fig. 33 (t/c 0.10 over 0, two) and TN 2360 fig. 6's runs (two readings) over fig. 33's body alone, each with
  its reading error toward a larger factor, the largest at each tunnel Mach
  number (1.50, 2.00, 2.41), linear between them; above M 2.41 and below
  1.5, the line plus the largest tunnel excess over the line, **0.2282**
  (round 3's reading of the Langley pair at M 2.41, 1.3909 with its
  error, against the identified curve's first reading there, 1.1628;
  0.1937 at M 1.5 and 0.1299 at 2.0 beside it), carried as 0010 section
  1.3 carries its excess (its option b, the conservative one).

**Above M 2.56** the figure has no free-flight data, and the reference
member is "bounded, not measured" (0014 section 10.2; the owner's
decision recorded in 0010 section 11.5, applied here as the coordinator
asked on 2026-10-21): from the zero member's low end, **0.9378** (section
3.5), to the member's high end at M 2.56, **1.3811**, its band the whole
gap and its nominal the midpoint, 1.1594. The ordering is 0010 section
11.5's: Love's "decrease in fin effects as Mach number increases", which
fig. 35 shows to M 2.56, and the increment's dependence on the slope of
the faces near the trailing edge. The lower bound is the rebuilt
factor's zero member, not the present factor's F = 1 (0010 section 11.5
says why each takes its own). Every result of the rebuilt factor above M
2.56 is bounded, not measured: its label says so with the gap in C_D
(`base-drag.ts`), and a total containing it names it in its claim
(`W1_BOUNDED_REASON`, `src/app/total-drag.ts`).

| M      | 1.5    | 1.65   | 1.8    | 2.0    | 2.15   | 2.3    | 2.41   | 2.5    | 2.56   | above 2.56 |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ | ---------- |
| F low  | 1.5228 | 1.5832 | 1.4563 | 1.2578 | 1.1750 | 1.1233 | 1.0996 | 1.0887 | 1.0855 | 0.9378     |
| F high | 1.7281 | 1.6419 | 1.5590 | 1.4409 | 1.4226 | 1.4043 | 1.3909 | 1.3826 | 1.3811 | 1.3811     |

(asserted by `fins-on-base-w1.test.ts`). To M 1.80 the line has three
readings, the identified curve's two and this work's, which agree with
them within 0.0001 at M 1.40 to 1.65 and 0.0023 at the knee (M 1.70 to
1.75), inside the combined errors; above 1.80, two. The readings used before (0008's first
and round 3's, which followed estimate B above about M 2.15, and round
6's first version, which followed estimate A above about 2.2; section 7)
are not used: against them the low end falls by 0.02 at M 2.2, 0.07 at
2.41 and 0.10 at 2.5, and the high end at 2.5 by 0.08 (1.466 to 1.383),
the larger carried excess not making up for the lower line. The present
factor's own band for the same fins is built differently (its low end is
half the increment, so as to cover 5% fins; 0010 section 11.4) and is not
changed here.

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
| four fins t/c 0.05 | 0.512 to 0.649 | 0.455 to 0.744 | 1.268 - 1.472 | 1.207 - 1.416 | 1.117 - 1.328 |
| two fins t/c 0.10  | 0.471 to 0.592 | 0.573 to 0.855 | 1.246 - 1.431 | 1.215 - 1.478 | 1.148 - 1.377 |
| two fins t/c 0.05  | 0.225 to 0.300 | not measured   | M 1.5 only    |               |               |

### 3.3 Position

Fins ending x/c chords ahead of the base: each member at the two TN 2360
stations that bracket x/c (0, 0.2, ..., 1.0, where that member was
measured at the Mach number), the envelope of both. At M 1.5 the
cruciform t/c 0.10 relieves the base a chord ahead (dPb +0.0155, F below
1). Above M 2.0 no position ahead of the base is measured, and such fins
are refused. A chord or more ahead keeps 0010 section 1.4's plain curve,
labelled not validated with fins.

**Below M 1.5: bounded, not measured (2026-10-26, A5; 0014 section 10.7
(ad)).** At M 1.0 to 1.5 no position ahead of the base is measured, and
until this date such fins were refused. They are now served as "bounded,
not measured" (0014 section 10.2): between the zero member there (RM
L52E06's relief, F 0.838; for flat-faced fins the same relief, section 4) and the same fins at the base, that is the upper member of their
bracket at x/c = 0, which below M 1.5 is always the reference (no ratio
member is measured there, section 11.2). The band is the whole gap, the
nominal its midpoint, and below M 1.5 it is stated on W2's term as every
factor there (section 11.2): the reference over 1.065 (over 1.04 since
0014 section 10.7 (ah), merged 2026-10-28), the zero member as it is. The label says "bounded, not measured", names both bounds and the
ordering, and gives the gap in C_D (`base-drag.ts`).

The ordering, shown on TN 2360 fig. 6 (read twice, section 7) with fig.
33's body alone, for every member measured ahead of the base at both of
its Mach numbers (`fins-on-base-w1.test.ts` holds each number):

- _Upper side._ The increment with the trailing edge x/c ahead (0 < x/c
  <= 1) is no larger than the same fins' at the base, within the reading
  errors. At M 1.5 every reading ahead, moved by its error toward more
  suction, lies 0.015 to 0.076 in dPb inside the at-base reading most
  suction-ward (two fins t/c 0.05 and 0.10, four fins t/c 0.05 and 0.10).
  At M 2.0, 0.005 and 0.010 inside for two 10% and four 5% fins; four 10%
  fins keep their at-base increment to x/c 0.4 (at 0.2, -0.0642 +-0.002,
  where the base reads -0.0644 +-0.0002 and -0.064 +-0.002: 0.0002 apart
  either way, equal within the errors), then fall. TN 2360 gives the
  mechanism and its direction in Mach number (pp. 7, 9 to 11): the fins'
  pressure field reaches the dead-air region along isobars inclined
  farther rearward as the Mach number rises, so the base "is influenced
  by the tail surfaces at tail positions farther forward than at lower
  Mach numbers", and with the tail well forward no effect is expected. The
  data agree: at x/c 0.4 the three members measured at both Mach numbers
  keep 6% to 63% of their largest at-base increment at M 1.5 and 64% to 98% at
  2.0. So below M 1.5 the same fins at the base bound the increment, with
  a margin that grows as the Mach number falls.
- _Lower side._ The most relief ahead of the base, as F with both errors
  toward more relief, is 0.910 at M 1.5 (four fins t/c 0.10 at x/c 1.0)
  and 0.944 at 2.0 (four fins t/c 0.05 at x/c 1.0): above the zero member
  at each, 0.838 below M 1.62 and 0.938 from it. The relief grows from
  M 2.0 to 1.5 (1 - F 0.056 to 0.090), which carried linearly to M 1.0
  is 0.124, inside the zero member's 0.162. This side rests on two tunnel
  Mach numbers of one model and on that carry: no measurement with fins
  ahead of the base below M 1.5 is known. TN 3819 fig. 32's Mach 2.41
  symbols (read once, not paired, used for nothing) are to be read a
  second time (section 10); if the pair finds a relief beyond the zero
  member a chord ahead at M 2.41, as a look by eye recorded in
  `w1b_w2_proposal.md` section 1.4 suggests, this side is re-examined
  first.

Above M 2.0 the direction runs the other way (the fins reach the base
from farther forward), so the bounded value is not carried up: fins
within a chord ahead stay refused above M 2.0 (`fins-near-base`), the
reason saying so in plain words, until TN 3819 fig. 32's symbols are read
twice (section 10). At M 1.5 to 2.0 nothing changes. Sweeps are checked
first, as before: below M 1.5 only flat-faced fins are served swept
(section 11.2), so the bounded position value reaches unswept fins of a
sharp section and flat-faced fins swept as section 4 allows.

**Narrowed to x/c 0.4 the same day (2026-10-26, the coordinator's
decision, before review; 0014 section 10.7 (ad)).** The lower side above
rests, beyond the stations where TN 2360 measures relief, on two tunnel
Mach numbers and a linear carry. So below M 1.5 the bounded value serves
only fins ending at most 0.4 root chords ahead of the base
(`W1_POSITION_BOUNDED_MAX`). Up to x/c 0.4 TN 2360 measures no relief at
all: every symbol at x/c 0.2 and 0.4, at M 1.5 and 2.0 and for every
member, moved by its reading error toward relief, still shows a suction
(dPb at most -0.0028, four 5% fins at x/c 0.4 and M 1.5; F at least
1.014), so the zero member's 0.838 lies 0.16 below anything measured
there. Relief appears from x/c 0.6 and grows toward a chord ahead and as
the Mach number falls, and nothing measured below M 1.5 says how far.
Fins ending more than 0.4 root chords ahead (0.4 < x/c < 1) stay refused
below M 1.5 (`fins-near-base`), in plain words. After TN 3819 fig. 32's
pairing both are revisited (0014 section 10.7 (ad)): the bound at x/c up
to 0.4 if the pair shows relief beyond the zero member that close at M
2.41, and positions beyond 0.4.

What it gives, up to x/c 0.4 (`fins-on-base-w1.test.ts`,
`base-w2.test.ts`; the numbers since the narrowing): on W2's term,
+-31.7% to +-34.9% on F at M 1.0 to 1.5, the same members as at the base
for sharp sections and plates, so the same widths; four 10% arcs, a
member at the base (about +-7% there, section 3.6), take the whole gap
ahead of it. At M 1.2, F 0.8379 to 1.6211, nominal 1.2295, on W2's term
(on Love's curve itself 0.8924 to 1.7265, nominal 1.3095: the zero member,
a ratio to the body without fins, is 0.8379 times 1.065 there; this
record said 0.8379 to 1.7265, mixing the two bases, until the review of
2026-10-26). The step at M 1.5, where
positions become measured, on the body base term (base area ratio 1):
just below, 0.2301 (band 0.1017 to 0.3585) for every case here; at M
1.5, 0.1629 (0.1159 to 0.1935) for three 2.4% double wedges at x/c 0.4
(-29%), 0.2262 (0.1698 to 0.2600) for four 10% arcs at x/c 0.2 (-1.7%)
and 0.1894 (0.1497 to 0.2101) at x/c 0.4 (-17.7%). In each the measured
band at M 1.5 lies inside the bounded band just below it, and every
measured position band of every member at M 1.5 up to x/c 0.4 lies inside
the bound carried below (160 checked on F). The steps are the method's (a
bound where nothing is measured, a measurement where it is), not
measurements; the labels name both sides. (As first built, to a chord
ahead, the record quoted the same steps at x/c 0.5: -29% and -18.5%.)

_Merged with 0014 section 10.7 (ah), 2026-10-28:_ W2's nominal is 1.04
(not 1.065) and the compiled curve's band 0.77 to 1.17 since round 20
(not 0.82 to 1.08). On W2's term the half-widths are +-32.8% to +-35.9%;
at M 1.2, F 0.8379 to 1.6601, nominal 1.2490 (on Love's curve 0.8714 to
1.7265, nominal 1.2990, the zero member 0.8379 times 1.04). At M 1.5 the
measured steps keep their values and widen their bands: 0.1629 (0.1078
to 0.2082), 0.2262 (0.1585 to 0.2804) and 0.1894 (0.1403 to 0.2271)
(`base-w2.test.ts`; high ends 0.2017, 0.2713 and 0.2195 with 0.77 to
1.13 before round 20). The numbers above are kept as written.

**Refused below M 1.5, and the chord rule (2026-10-26, after the
independent review of 3389a04..245a88e; 0014 section 10.7 (ad), its
dated narrowing, which quotes the finding).** The bounded value above is
withdrawn before it was merged: nothing below M 1.5 is served ahead of
the base, and the two paragraphs above stay as the record of what was
built and why it was withdrawn. The review found that TN 2360's own
direction in Mach number works against the narrowing to x/c 0.4: the
relief crossing of four 5% fins moves from x/c 0.88 at M 2.0 to 0.51 at
1.5, faster than beta, and carried down falls inside 0.4 below about M
1.35; and TN 2360 p. 7 says the airfoil pressures themselves grow as the
Mach number falls. So "no relief up to x/c 0.4" is measured at M 1.5 and
2.0 only. Every position ahead of the base (x/c > 0) is refused below M
1.5, the words naming what is missing, any measurement below M 1.5 with
fins ahead of the base; no carry is used, a reach scaled by beta
included. At M 1.5 to 2.0 the measured brackets above stay, inside the
chord rule; above M 2.0 fins ahead of the base stay refused (TN 3819 fig.
32's two readings disagreed on 3 of its 12 symbols; since then a third
reading and a three-way pairing are in, used as 0014 section 10.7 (ad)'s
note of the same day says, and no method uses fig. 32 yet).

The chord rule: TN 2360 measured positions with one geometry, a tail
chord of 1.875 in on a 1.250 in body, a root chord of 1.5 body diameters.
In its model the fins' field reaches the dead-air region along isobars
at the Mach angle, so how far ahead fins still reach the base depends on
the body radius times beta against the chord (the at-base bound holding
in the model only while the radius times beta stays under half the
chord, which TN 2360's own geometry passes at M 2.0, where the
measurement holds it). No measurement shows how positions carry to other
chords, so fins ending ahead of the base (0 < x/c < 1) are served only
with a root chord of 1.5 body diameters within 0.5% (`W1_POSITION_CHORD_OVER_DIAMETER`,
`W1_POSITION_CHORD_TOLERANCE`; the 0.5% is 0011 section 3's precedent for
the same geometry as measured, corrected 2026-10-28 below), the swept fins served from 0.9 root
chords ahead included; any other chord, or none given, is refused with
plain words. `bodyBaseDrag` takes the ratio from `BaseFins.rootChordOverDiameter`,
which `baseFinsOf` sets from the body's diameter. _Corrected 2026-10-28 (the review of
86bcf73, its item 4):_ 0011 section 3's 0.5% is a typing tolerance for the
Basic Finner's own inputs, "not for other rockets", so it is no precedent
here. The 0.5% stands on TN 2360's own resolution in position: a chord
0.5% off 1.5 diameters is off by 0.0075 diameters, and it moves a position
given in chords by at most 0.005 chords (at x/c 1.0), a fortieth of the 0.2
chords between TN 2360's stations, across which the bracket already
runs. Below about M 1.2 the
at-base upper bound would rest on its margin, not on TN 2360's mechanism
(the linear superposition loses meaning near M 1): moot now, recorded so
the record stays true.

**A chord or more ahead: the plain curve withdrawn (2026-10-27, the
re-review of A5; 0014 section 10.7 (ad), its amendment of that date).**
The first paragraph of this section kept 0010 section 1.4's plain curve
for fins a chord or more ahead. The re-review found its band missing
TN 2360's own measurement: four unswept 10% arcs with a root chord of 1.5
diameters, the trailing edge exactly one chord ahead, at M 2.0, were
served 0.1447 (band 0.1187 to 0.1563), where TN 2360's dPb of -0.0096 on
a body alone of -0.1507 gives 1.107 times the curve (at least 1.09 with
every error toward less suction). Fins ahead of the base are now served
only where TN 2360 measured them: a root chord of 1.5 body diameters
(within 0.5%), x/c 0 to 1.0 inclusive, M 1.5 to 2.0, through the members
of sections 3.2 and 3.3; a trailing edge exactly a chord ahead takes TN
2360's station at x/c 1.0. Every position beyond one chord ahead is
refused at any chord, nothing measuring it (`bodyBaseDrag`, reason
`fins-near-base`). TN 2360's fins are rectangular, of aspect ratio 2.33;
span and taper are not constrained by the chord rule, which is recorded
for the owner (0014 section 10.7 (ad)), not ruled on here.

### 3.4 Sweep: only where measured

The band-setting data have swept fins near the base at two sweeps, both
with circular-arc sections: RM L52J21a's 45 deg (leading and trailing
edges) at M 1.62 to 2.41, the root trailing edge about 0.9 in ahead of
the base on a streamwise chord of 0.75 in / cos 45 deg = 1.06 in, so 0.85
+-0.05 root chords ahead (0.8 in this record before the review of
2026-10-22, which divided by the wrong chord), the trailing edge swept
aft and crossing the base plane about a diameter out (its figs. 1 and 5,
read from the drawings to +-0.05 in), and the
RM-10's 60 deg leading edge at the base at M 1.49 to 1.98, whose
trailing-edge sweep TN 3819 does not state. Both lie inside the bracket
from the zero member (3.5) to the unswept member that bounds their
thickness, at every Mach number measured (RM L52J21a's fin effects over
fig. 8's cylindrical-base P_B; `fins-on-base-w1.test.ts`):

| Set                               | M            | F measured     | Zero member                                        | Unswept member (low end)                                                         |
| --------------------------------- | ------------ | -------------- | -------------------------------------------------- | -------------------------------------------------------------------------------- |
| RM L52J21a, 45 deg, 8%, R 8.06e6  | 1.62 to 2.41 | 0.963 to 1.119 | 0.938 to 1                                         | 1.568, 1.320, 1.100 at M 1.62, 1.93, 2.41 (the reference, which bounds 8% fins)  |
| RM-10, 60 deg, t/c 0.10 (fig. 34) | 1.49 to 1.98 | 1.137 to 1.229 | 0.838 to 1 below M 1.62 (3.5), 0.938 to 1 above it | 1.523, 1.560, 1.477, 1.275 at M 1.5 (for 1.49), 1.59, 1.78, 1.98 (the reference) |

So fins of a sharp section are served swept with the leading edge swept
45 to 60 deg: at the base with the trailing edge unswept, and with the
trailing edge swept aft, no more than the leading edge, only where RM
L52J21a's fins cover it, 0.9 to 1 root chord ahead of the base (the far
end of their position's uncertainty, `W1_SWEPT_TRAILING_EDGE_AHEAD`; at M
1.5 to 2.0, where positions ahead of the base are measured, 3.3); in both, bracketed
between the zero member and the unswept member that bounds the section.

_Note, 2026-10-28 (the review of 86bcf73, its items 1 and 2; 0014 section
10.7 (ad), its entry of that date):_ the code served more than this
paragraph names. A sharp section with the leading edge swept 45 to 60 deg
and the trailing edge unswept was served at every measured position ahead
of the base (for example 50 deg, x/c 0.5, M 1.8), and W1b's moderate
sweeps (the leading edge up to 45 deg, the trailing edge unswept), argued
at the base only on NSWCDD/TR-92/509's fins there, were served ahead of
it at exactly M 2.0, where W1b's Mach range meets that of the measured
positions. No measurement covers swept fins of a sharp section between
the base and RM L52J21a's 0.85 +-0.05 root chords, and no registered
argument carries the RM-10 or RM L52J21a there, so both are now refused
under 0014 section 10.2 (`fin-sweep`, its message naming the position):
a sharp section swept at the leading edge with the trailing edge unswept
is served ahead of the base only from 0.9 root chords (a trailing edge
"swept no more than the leading edge", unswept included, as RM L52J21a's
position covers it), and W1b's sweeps only at the base. Flat-faced fins
are not touched by this: their sweeps rest on section 4 and section 12.

**A swept trailing edge at the base** (the review of 2026-10-21). This
record said before that swept fins were served at the base with the
trailing edge swept no more than the leading edge, "as in both sets".
Neither set shows that at the base: RM L52J21a's fins end 0.85 +-0.05
root chords ahead of it, and the RM-10's trailing-edge sweep is not
stated.
And a swept trailing edge moves the pressures the increment rests on: in
linear theory the faces behind an edge swept L carry sqrt(M^2 - 1) /
sqrt(M^2 - sec^2 L) times the unswept fin's pressures, for 45 deg 2.24,
1.67, 1.34, 1.22, 1.11 and 1.07 times at M 1.5, 1.6, 1.8, 2.0, 2.5 and
3.0 (the edge subsonic below M 1.41). So such fins may act as thicker
fins than the bracket's upper member, and nothing measured at the base
says they do not. The code also took the trailing edge's sweep by its
magnitude, so a forward-swept edge was served as an aft-swept one. Fins
of a sharp section with the trailing edge swept aft closer to the base
than 0.9 root chords (`W1_SWEPT_TRAILING_EDGE_AHEAD`; the review of
2026-10-21 set 0.8, the second review of 2026-10-22 moved it to the far
end of RM L52J21a's 0.85 +-0.05), and with the trailing edge swept forward
anywhere (RM L52J21a's, the one swept set, is swept aft), are now refused
(`'fin-sweep'`), the message giving the reason and, for an aft sweep, the
linear-theory factor at the Mach number (`fins-on-base-w1.test.ts`, a
test for each, and `fins-on-base-routing.test.ts`). Flat plates
are unaffected: their faces carry no slope, and their band runs from RM
L52E06's relief to the arc at least as thick whatever the sweep (section
4). A bounded treatment is proposed in section 10, not shipped. The
RM-10's base pressures (fig. 34) check this bracket at M 1.49
to 1.98, and the RM-10's own totals (TN 3320) are held back for W10: the
overlap 0014 section 10.1 records for the PARD body applies wherever a
base term rests on the RM-10's base pressures, and TN 3320's run will say
so (decided by the coordinator, 2026-10-20).

**Moderate sweeps with an unswept trailing edge, at Mach 2.0 to 3.0 (W1b,
approved by the coordinator on 2026-10-20).** NSWCDD/TR-92/509 (registered
in 0014 section 10.1 for this use) measured four fins at the base with
the leading edge swept 43.9 deg and the trailing edge unswept, double
wedges t/c 0.05, 0.10 and 0.15, at M 2.0 to 4.5 in a strut-supported
tunnel model (no sting), C_DB to about +-5%
(`nswc_tr92_509_table2.csv`, first transcription; the research record
`w1b_w2_proposal.md`). Its factors, fins over body alone, each C_DB moved
by its +-5% toward the ends, against the bracket served (`nswcFactors`,
asserted in `fins-on-base-w1.test.ts`):

| M   | Double wedge | F (with +-5%)        | Bracket served                                     |
| --- | ------------ | -------------------- | -------------------------------------------------- |
| 2.0 | t/c 0.05     | 1.072 (0.970, 1.185) | 0.938 to 1.328 (four fins t/c 0.05)                |
| 2.0 | t/c 0.10     | 1.145 (1.036, 1.265) | 0.938 to 1.441 (the reference)                     |
| 2.5 | t/c 0.05     | 1.094 (0.990, 1.210) | 0.938 to 1.383 (the reference)                     |
| 2.5 | t/c 0.10     | 1.198 (1.084, 1.324) | 0.938 to 1.383                                     |
| 3.0 | t/c 0.05     | 1.111 (1.005, 1.228) | 0.938 to 1.381 (bounded, not measured: above 2.56) |
| 3.0 | t/c 0.10     | 1.200 (1.086, 1.326) | 0.938 to 1.381 (bounded)                           |

Every value lies inside the bracket with its +-5%, with at least 0.055
in F to the upper end (the 10% wedge at M 3.0; 0.18 at the nominal
values). At M 2.0 both nominal values lie below the low end of the
unswept member that bounds them (by 0.045 and 0.113); at M 2.5 both lie
inside the reference's band, 0.006 and 0.109 above its low end, 1.089;
at M 3.0 the bracket is bounded, not measured (3.1), and both lie inside
it. Matched on trailing-edge slope (a
double wedge t/c tau has the slope of the arc tau / 2), the 43.9 deg fins
sit at or a little below the unswept ones at M 2.0: the 10% wedge's
1.145 against the 5% arc member's 1.117 to 1.328. The 15% fins, which the
factor refuses, lie below or inside the reference.

The ordering between 0 and 43.9 deg, which no measurement covers, is
linear theory's, recorded as the coordinator asked: with the trailing
edge unswept, the geometry at the base does not change with the
leading-edge sweep; on a straight-tapered fin the line at fraction s of
the chord is swept at tan L(s) = (1 - s) tan L_LE, and the pressure on a
face behind it scales as sqrt(M^2 - 1) / sqrt(M^2 - sec^2 L(s)) over the
unswept fin's. At L_LE = 43.9 deg the ridge (s = 0.5) is swept 25.8 deg,
a factor 1.04 at M 2.0; at s = 0.75, 1.01; at the trailing edge, 1. So
the aft faces, whose slope TN 2360 ties the increment to, carry within 4%
of the unswept fin's pressures at M 2.0 and above, less at lighter
sweeps; with both ends measured inside the bracket and that margin, a fin
at an intermediate sweep lies inside it. Served: the leading edge swept
up to 45 deg with the trailing edge unswept, at M 2.0 to 3.0 (above M
2.56 bounded, not measured, as every case there, 3.1), with the swept
bracket above and a label that says so. Read once (Table 2's
second transcription is requested): `secondReadingPending` is true on
these results.

**Still refused, with their reasons** (the coordinator's decision of
2026-10-20): moderate sweeps at M 1.5 to 2.0 (sharp sections; flat-faced
fins with the trailing edge unswept: section 12), no such sharp fins
with an unswept trailing edge being measured there (the aft faces'
factor grows to 1.11 at M 1.5 and the forward faces' to 1.98, the 43.9
deg edge near sonic; the 45 and 60 deg sets there have other planforms,
which is suggestive but not the ordering), moderate sweeps with a swept
trailing edge at any Mach number (one 45/45 deg set, RM L52J21a: one
end, no ordering), and sharp sections with any swept trailing edge
closer to the base than 0.9 root chords, or swept forward (above).
Leading edges above 60 deg stay refused (sharp sections, and flat-faced
fins with a swept trailing edge; flat-faced fins with the trailing edge
unswept: section 12), beyond the RM-10's. Opening them needs base
pressures with and without fins of 20 to 45 deg at M 1.5 to 2.0, with
unswept and with swept trailing edges; Heyser, Maurer and Oberdorffer
(AGARD CP-10, 1966) is the one candidate known that might hold them.

### 3.5 The zero member

No fins, or fins whose pressure field vanishes: F from 1 down to the
most relief RM L52J21a allows at M 1.5 or above with fins near the base
and a turbulent layer (R = 8.06e6, cylindrical base), measured at M 1.62
to 2.41 and carried to 3.0: **0.9378** (0.938 where three decimals are
quoted; `W1_RELIEF_LOW`). It is the lesser of two derivations:

- **Fig. 8 over figs. 31 to 33 (d), by nose** (`noseCallReliefFactors`):
  fig. 8's finned symbol of each nose over the same nose's unfinned
  symbols within 0.6e6 of R 8.06e6 (sting-supported, figs. 31 to 33
  panel (d)), each moved by its error toward more relief, over every
  call and reading used. Fig. 8's noses are called by three readers and
  paired (section 7): two calls are left out, the rest agree. The least,
  0.9378, is the conical nose at M 1.93 (this work's -0.1468 +-0.002,
  called alike by round 6, over this work's unfinned -0.1524 +-0.002).
- **Fig. 38(c) over fig. 8** (`W1_RELIEF_LOW_FIG38C`): the report's own
  dPb, its most positive at each Mach number over fig. 8's least
  negative cylindrical-base P_B in either reading, both toward more
  relief: 0.9504 at M 1.93. Read once (the plain and flagged symbols of
  fig. 38 cannot be told apart on the 1-bit scan); it lies inside the
  first, so it no longer sets the member.

How it got here, on 2026-10-21: the member rested on fig. 38(c) (0.9504)
until round 7's reading of figs. 31 to 33 let the nose-paired difference
be formed; on this work's fig. 8 calls alone it reached 0.905 at M 2.41,
and the coordinator set the member there until a second reader called
fig. 8's noses (commit b7edf74). Round 7's blind call of the M 2.41 stack
showed this work's template had not separated the circle and the diamond
there (section 7); with that call the conical nose at M 2.41 gives F
down to 0.941, and the member is 0.938, set at M 1.93 on calls two
readers agree on. Against fig. 38(c)'s 0.9504 the member is 0.013 lower:
the difference of two plots carries both their reading errors, the
report's own difference one; the nominal values agree.

It is the lower member of every bracket whose section lies below t/c
0.05, of every swept fin, and of three or two fins where two are not
measured, and the reference's low end above M 2.56 (3.1). The conical and
radome noses at M 2.41 are called by round 7 alone (this work's calls
there are left out, section 7): a second reading of them could lower the
member, so every result that uses it from M 1.62 keeps
`secondReadingPending` (`W1_ZERO_MEMBER_PENDING`), whether as its lower
member or as the zero-fin member of two or three fins where two are not
measured (a member of count 0 of any thickness, which the code missed
before the review), and its label names them.

Below M 1.62, where RM L52J21a's measurements begin
(`W1_RELIEF_MEASURED_FROM`), the zero member runs from 1 down to
**0.838**, the lowest relief measured with fins at the base below it (RM
L52E06 fig. 7, flat plates, read at M 1.05 to 1.10 in two readings, the
points at 1.06 to 1.10 used), the flat plates' own lower bound, carried
down to M 1.0 and up to 1.62 (`zeroMember`). Before the review of
2026-10-21 the member was 0.938 from M 1.5, carried down from 1.62 over a
range where nothing is measured; RM L52E06's larger relief is the safe
side there, since the relief weakens with Mach number on both sets and no
measurement between M 1.10 and 1.62 says by how much. It widens the band
at M 1.5 to 1.62 (section 3.6), the term steps where it ends (+4.3% for
three 2.4% double wedges, section 11.2), and its label names both
carries.

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
- **A section that changes along the span** (a plate of one thickness on
  a tapered planform, whose t/c is largest at the tip and least at the
  root; `spanSections`): the bracket must hold at every spanwise station,
  since every measured fin is rectangular with one section and the data
  do not say which station sets the factor. So the upper member must
  dominate the thickest station (tauEq the largest over the stations,
  refused above 0.10) and the lower member must be dominated by the
  thinnest (tauLow the least). The thinnest station needs no thickness
  range of its own: the zero member lies below any section, so a root
  thinner than every member only moves the lower member down to it. With
  the tip alone a 10% double wedge whose root is 5% would take four fins
  t/c 0.05 as its lower member; with the root, the zero member
  (`fins-on-base-w1.test.ts`). For flat plates the lower bound is RM
  L52E06's relief whatever their thickness (section 4), so the root
  changes nothing. Every station must have the same trailing-edge shape.
  Decided 2026-10-21 for W34. Main's thin-plate rule for the present
  factor (0016 section 18: a station thinner than 5% gives the factor at
  5% with its low end F = 1) is not carried into the rebuilt factor: the
  present factor serves only unswept fins, for which every source shows
  F at least 1 (0010 section 11.5), while the rebuilt factor's members
  already run from the zero member, whose low end is relief measured
  below F = 1 (0.938 from M 1.62, 0.838 below it and with flat plates),
  to t/c 0.10, so a thinner station lies inside its data and the bracket takes
  it there; raising its low end to 1 would cut off measured relief.
  `bodyBaseDrag` passes a plate's thinnest station to the rebuilt factor
  as its section scaled to that t/c (`thinnest`, from `baseFinsOf` in
  `src/total/finned-body.ts`), and refuses above t/c 0.10 at the
  thickest station, as the present factor does.
- **Count:** four fins, the four-fin members; three, between two and
  four; two, the two-fin members, or zero to four where two are not
  measured.
- **Position and sweep:** 3.3, 3.4.

Where a member is not measured at the Mach number the bracket widens
outward: t/c 0.05 above to 0.10, below to the zero member, two fins to
zero. The band is the envelope of the two members' bands; the nominal is
its midpoint (0008 section 6.3). Every row is asserted by
`fins-on-base-w1.test.ts`:

| M   | Case                                                    | Lower, upper member                       | F low  | F nominal | F high | Half-width |
| --- | ------------------------------------------------------- | ----------------------------------------- | ------ | --------- | ------ | ---------- |
| 1.5 | double wedge 2.4%, three fins, 45 deg                   | zero (below M 1.62); four fins t/c 0.05   | 0.8379 | 1.1551    | 1.4723 | 27.5%      |
| 1.8 | the same                                                | zero; four fins t/c 0.05                  | 0.9378 | 1.1769    | 1.4161 | 20.3%      |
| 2.0 | the same                                                | zero; four fins t/c 0.05                  | 0.9378 | 1.1330    | 1.3282 | 17.2%      |
| 2.5 | the same                                                | zero; the reference                       | 0.9378 | 1.1602    | 1.3826 | 19.2%      |
| 3.0 | the same (bounded: above M 2.56)                        | zero; the reference, bounded above M 2.56 | 0.9378 | 1.1594    | 1.3811 | 19.1%      |
| 1.8 | double wedge 2.4%, four fins, unswept                   | zero; four fins t/c 0.05                  | 0.9378 | 1.1769    | 1.4161 | 20.3%      |
| 1.8 | bevelled plate 3% (bevel 0.085 chord), 45 deg           | zero; the reference                       | 0.9378 | 1.2484    | 1.5590 | 24.9%      |
| 1.8 | flat plate 2.4%, three fins, 45 deg (bounded)           | RM L52E06 relief; t/c 0.05                | 0.8379 | 1.1270    | 1.4161 | 25.7%      |
| 2.5 | the same (bounded)                                      | RM L52E06 relief; the reference           | 0.8379 | 1.1103    | 1.3826 | 24.5%      |
| 1.8 | circular arc 10%, three fins, unswept                   | two fins t/c 0.10; reference              | 1.2151 | 1.3870    | 1.5590 | 12.4%      |
| 1.8 | double wedge 2.4%, three fins, 45 deg, x/c 0.5          | zero; four fins t/c 0.05 at 0.4 and 1.0   | 0.9040 | 1.0897    | 1.2755 | 17.0%      |
| 2.0 | double wedge 2.4%, four fins, 30 deg, TE unswept (W1b)  | zero; four fins t/c 0.05                  | 0.9378 | 1.1330    | 1.3282 | 17.2%      |
| 2.5 | double wedge 2.4%, three fins, 30 deg, TE unswept (W1b) | zero; the reference                       | 0.9378 | 1.1602    | 1.3826 | 19.2%      |
| 1.2 | double wedge 2.4%, three fins, unswept (W2)             | zero below M 1.62; the reference          | 0.8379 | 1.2295    | 1.6211 | 31.9%      |
| 1.2 | flat plate 2.4%, three fins, 45 deg (W2, bounded)       | RM L52E06 relief; the reference           | 0.8379 | 1.2295    | 1.6211 | 31.9%      |
| 1.0 | double wedge 2.4%, three fins, unswept (W2, from M 1.0) | zero below M 1.62; the reference          | 0.8379 | 1.2873    | 1.7367 | 34.9%      |

The rows from M 1.5 are the rebuilt factor's F over Love's curve. The
last three, below M 1.5, are on W2's body base, 1.065 times the curve, as
`bodyBaseDrag` serves them: there the members built on fig. 35's
free-flight line are divided by 1.065 and the zero members, ratios to the
body without fins, are not (section 11.2). On Love's curve the same bands
are 0.8924 to 1.7265 (nominal 1.3095) at M 1.2 and 0.8924 to 1.8496
(1.3710) at M 1.0, with the same half-widths (merged with 0014 section
10.7 (ah), 2026-10-28: W2's nominal 1.04, so the three rows below M 1.5
are 0.8379, 1.2490, 1.6601, +-32.9%, at M 1.2 and 0.8379, 1.3082, 1.7784,
+-35.9%, at M 1.0, and on Love's curve 0.8714 to 1.7265 (1.2990) and
0.8714 to 1.8496 (1.3605); `base-w2.test.ts` holds
both bases). The factor function's own output below M 1.5, which
`fins-on-base-w1.test.ts` asserts, holds its two members on those two
bases (0.8379 to 1.7265 at M 1.2, 0.8379 to 1.8496 at M 1.0) and is not a
factor on one curve until `bodyBaseDrag` puts both on W2's term. Until
2026-10-26 this table quoted that mixed output as F over the curve
(nominal 1.2822 and 1.3437, +-34.7% and +-37.6%); corrected after the
review of A5, whose finding (4) found the same mixing in section 3.3. The first row's 27.5% (22.2% before
the review) is the zero member below M 1.62 (3.5); just above M 1.5 the
same fins reach 1.5420 (+-29.6%), where the ratio range becomes the
envelope of both tunnel Mach numbers' (3.2), and from 1.62 they give
0.9378 to 1.4907 (+-22.8%). **Corrected 2026-10-27 (0014 section 10.7
(ah)):** W2's body base is now 1.04 times the curve, so those members are
divided by 1.04: the double wedge at M 1.2 gives 0.8379 to 1.6601 on W2's
term (nominal 1.2490, +-32.9%), at M 1.0 0.8379 to 1.7784 (1.3082,
+-35.9%); the rows above, over Love's curve, do not change.

A member served as itself (four unswept 5% arcs at M 1.5 to 2.0) carries
+-7.3% to +-10.9%, the widest just above M 1.5, where its ratio range
becomes the envelope of both tunnel Mach numbers' (3.2); the reference
served as itself (four unswept 10% arcs) carries +-6.3% to +-7.5% at M
1.0 to 1.5, up to +-12.0% at M 2.56, and +-19.1% above it, where it is
bounded (3.1). On the body base term these widths are the fins-on-base
part of the band; the curve's 0.77 to 1.17 (0.82 to 1.08 before 0014
section 10.7 (ah), 0.77 to 1.18 before its third addendum, 0.77 to 1.13
before round 20) and the interpolation bound
add to them as in 0010 section 1.4. At these Mach numbers the body base
is roughly 25% to 40% of a total (0014 section 6.2), so the factor's band
alone is about +-4% to +-12% of the total.

**Labels.** A member: "estimated on component data: the rebuilt
fins-on-base factor (0015), measured on ..., tested only in the total".
Otherwise: "estimated on component data: the rebuilt fins-on-base factor
(0015), between <lower> and <upper>; <why: the section bracketed, swept,
three fins, the position>; not measured on these fins, tested only in the
total". Above M 2.56 (and for flat plates, section 4) the label begins
"bounded, not measured: the rebuilt fins-on-base factor (0015)", says
that the reference is bounded there "from the zero member's low end (F
0.9378) to its high end at M 2.56", and gives the gap in C_D. The zero
member's own name says what it rests on: "F 1 down to 0.938, the most
relief RM L52J21a allows: its fig. 8 over figs. 31 to 33 by nose, at M
1.93, each read twice; fig. 38(c) gives 0.950; the conical nose at M
2.41 and the radome nose at M 2.41 called by one reader, the second
pending"; below M 1.62, "F 1 down to 0.838, RM L52E06 fig. 7, measured
with flat plates at M 1.05 to 1.10 and carried to 1.0 and up to 1.62,
where RM L52J21a's measurements begin". Every carry is named: the
reference's tunnel excess measured at M 2.41 (0.2282) carried below M
1.5 and at 2.41 to 2.56, and a moderate sweep's ordering, read once. A
member's label names them too (four unswept 10% arcs below M 1.5 carry
the excess on their high end, 1.6211 on W2's term at M 1.2, 1.6601 since
0014 section 10.7 (ah) of 2026-10-27; since the
review of 2026-10-22), and a swept flat plate's names its lower bound,
RM L52E06's relief with swept plates at the base, not the zero member.
Where an end of the band rests on a TN 2360 symbol that one reader alone
found (section 7), the label says so and `secondReadingPending` is set.
Every total
containing it is "an estimate, not validated" (the class rule of 0011
section 3, unchanged), and one containing a bounded factor names it in
its claim.

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
  L52E06 fig. 7) where TN 3819 fig. 35's free-flight line gives 1.545 and
  1.541 at M 1.1 (the identified curve's two readings over Love's basic
  curve, 0010 section 11). So the upper bound is the unswept
  circular-arc member at least as thick as the plate (t/c 0.05 or 0.10 by
  the plate's thickness, 0.10 above M 2.0), not a thinner one.
- _Lower side._ The relief is measured: RM L52E06 fig. 7's rim pressures
  give F 0.852, 0.866 and 0.882 at M 1.06, 1.08 and 1.10, weakening with
  Mach number, and at M 1.62 to 2.41 RM L52J21a measures at most 5% relief
  with turbulent layers (3.5). The lowest, at M 1.06 with the reading
  errors toward more relief, is **0.838** (`W1_FLAT_RELIEF_LOW`): below
  the zero member's 0.938, so RM L52E06's reduction is contained.

At M 1.5 and above no flat-faced fin is measured at the base. There the
ordering rests on what is measured: the increment's dependence on the
faces near the trailing edge (TN 2360 and fig. 33, on circular arcs at M
1.5 and 2.0), the ordering of the two families where both are measured (M
1.06 to 1.10), and the relief's weakening with Mach number (RM L52E06 to
M 1.10, RM L52J21a from 1.62). It is an ordering argued from those
measurements, not a measurement of these fins, which is what 0014 section
10.2's label says.

**What is served.** At M 1.0 to 3.0 (below 1.5 W2's part, section
11.2), with the counts and positions of section 3 and the sweeps it
serves (a swept trailing edge among them: the faces carry no slope, so the
argument of section 3.4 does not reach them, and RM L52E06's plates are
swept 45 deg), and since 2026-10-26 at every leading-edge sweep when the
trailing edge is unswept (section 12; since 2026-10-27, below M 1.62, not
swept more than 0 and under 45 deg, nor beyond 60 deg): the midpoint of 0.838 and the upper member's high end, the
band the whole gap, labelled "bounded, not measured: the rebuilt
fins-on-base factor (0015), between the lowest relief measured with
flat-faced fins at the base (F 0.838, RM L52E06 fig. 7 at M 1.06) and
<upper member>; ...", with the gap's size in C_D beside it
(`base-drag.ts`). A total containing it is at best "an estimate, not
validated" and names the component (0014 section 10.2). The half-width
on F, over Love's curve, is +-22.6% to +-29.6% at M 1.5 to 3.0 for
plates at most 5% thick at their thickest station, whose upper member is
four fins t/c 0.05 to M 2.0 (the widest just above M 1.5, 1.54 at the high
end); for thicker plates, whose upper member is the 10% arc, +-34.7% at M
1.5, +-30.1% at 1.8, +-26.5% at 2.0 and +-24.4% to +-24.5% at 2.5 to 3.0;
below M 1.5 every plate's upper member is the reference, and on W2's body
base (section 11.2) the band is +-31.7% to +-34.9% (34.9% at M 1.0);
+-32.8% to +-35.9% (35.9% at M 1.0) since 2026-10-27, when 0014 section
10.7 (ah) moved W2's nominal from 1.065 to 1.04.

**Every flat-faced fin at the base takes this value** (the review of
2026-10-21; 0014 section 10.7, amendment i, which supersedes main's
amendment e). The present factor is measured on wedge, circular-arc and
hexagonal sections, the Basic Finner's family among them, and on no fin
with flat faces at the trailing edge; RM L52E06 fig. 7 measures such fins
relieving the base (F 0.85 to 0.88 at the rim), which the present
factor's band, from F = 1 up, cannot hold. Until the review the present
factor served four unswept plates 5% to 10% thick at M 1.8 to 3.0; main's
amendment e then refused them (`flat-plate-fins`, 0016 section 20), which
left a case refused that this band covers. Now `bodyBaseDrag` sends every
flat-faced fin at the base (`BaseFins.flatFaced`, set by `baseFinsOf` for
plates and for sections whose trailing edge is flat) to the rebuilt
factor, which bounds it from RM L52E06's relief, with the present
factor's `flat-plate-fins` reason beside it in the label; a plate whose
trailing edge is rounded, which the rebuilt factor does not take, is
refused for its trailing edge with both reasons
(`flat-plates.test.ts`, `fins-on-base-routing.test.ts`).

**Ahead of the base, stated (2026-10-28, the review of 86bcf73, its item
3).** "The counts and positions of section 3" above includes the measured
positions ahead of the base (x/c above 0 to 1.0, Mach 1.5 to 2.0, the
chord rule; x/c exactly 1.0 since 2026-10-27, TN 2360's station there),
and there flat-faced fins take the same bounds: the upper the unswept
circular-arc member at least as thick, at their position (TN 2360's), and
the lower the same 0.838, the relief measured at the base. That lower end
is taken by reference: no flat-faced fin is measured ahead of the base. It
rests on this section's argument, the registered one (0014 section 10.7,
amendment i): the relief arises at the fin-body junctures and the square
edge, and the relief measured with fins ahead of the base, RM L52J21a's
at 0.85 +-0.05 root chords, is at most 5% (M 1.62 to 2.41), inside it.
This record confirms that reading; it adds no case and moves no total.

**What it does not reach.** Rounded trailing edges: no circular arc
bounds a rounded edge (its half-thickness falls as the square root of the
distance to the edge), so neither bound is shown and nothing at the base
measures them; refused, also as the four unswept plates at Mach 1.8 to
3.0 the present factor served until main's amendment (e) (0014 section
10.7 (i); their edge term is refused anyway, W11); blunt edges whose faces diverge to them (the Basic
Finner's single wedges: their faces compress the flow near the base,
which TN 2360's argument says raises the base pressure by an amount no
source measures, so neither bound is shown) or converge to them.

## 5. Routing

`bodyBaseDrag` (`src/base/base-drag.ts`) with fins at the base first asks
the present factor, for the fin families it was measured on: unswept
wedge, circular-arc and hexagonal sections 5% to 10% thick, four fins, at
Mach 1.8 to 3.0, the Basic Finner's family among them, with main's
extension below 5% for those families (0016 section 18). Where it serves,
its result is used unchanged (labels and numbers). Where it refuses, and
the fins' section and sweeps are given (`BaseFins.nearBase`;
`src/total/finned-body.ts` gives them), the rebuilt factor is asked, and
its label carries "the rebuilt factor is used because the present factor
(0010 section 1.3), which the Basic Finner's gated total keeps, does not
cover these fins (<the present refusal>)" ("gated", not "validated",
since the owner suspended the Basic Finner's validated claim, 0008
section 6.1). Where both refuse, the refusal is the rebuilt factor's,
with the present factor's message beside it. Fins within a chord ahead
of the base go to the rebuilt factor directly. `BodyBaseDrag.finsOnBaseSource`
says which factor was used. The body base's fin input is built once,
`baseFinsOf` in `src/total/finned-body.ts`, for the total and for the
coverage run's `evaluate.ts`.

By family (the review of 2026-10-21; 0014 section 10.7, amendment i):

- **Flat-faced fins** (plates, and sections whose trailing edge is flat;
  `BaseFins.flatFaced`): the present factor refuses them
  (`flat-plate-fins`: it is not measured on them, and RM L52E06 measures
  them relieving the base), and the rebuilt factor bounds them from RM
  L52E06's relief (section 4), at every count, sweep and position it
  serves and from Mach 1.0. A plate with a rounded trailing edge has no
  section the rebuilt factor takes and is refused for its trailing edge,
  with both reasons.
- **Swept fins**, at either edge (any tapered planform among them): the
  present factor refuses them (RM L52J21a shows swept fins can relieve
  the base), and the rebuilt factor serves the sweeps it measures
  (section 3.4): the leading edge swept 45 to 60 deg with the trailing
  edge unswept at the base, the trailing edge swept aft, no more than
  the leading edge, from 0.9 root chords ahead, and at M 2.0 to 3.0 the
  leading edge up to 45 deg with the trailing edge unswept. A sharp
  section with the trailing edge swept aft closer to the base than 0.9
  root chords, or swept forward anywhere, is refused (`'fin-sweep'`), the
  message giving the reason (section 3.4). Before
  the review such fins were served when the trailing edge was swept no
  more than the leading edge, and a forward sweep was taken by its
  magnitude.
- **Fins thinner than 5% of the present factor's families**: the present
  factor serves four unswept fins thinner than its 5% data at some
  station, none thicker than 10%, at 5% with its low end F = 1 (0016
  section 18), and they reach the rebuilt factor only where the present
  factor refuses for another reason (count, sweep, Mach number), with the
  thinnest station carried (`thinnest`; the rebuilt factor brackets every
  station, section 3.6).
- **Below Mach 1.5** the rebuilt factor's members built on fig. 35's
  free-flight line (the reference and its ratio members) apply to Love's
  curve itself, not on top of W2's 1.065: `bodyBaseDrag` divides them by
  1.065 on W2's term (W2's nominal, 1.04 since 2026-10-27, 0014 section
  10.7 (ah)), and leaves the zero members (ratios to the body
  without fins) as they are (section 11.2).

Tests (`fins-on-base-routing.test.ts`): four fins of the present factor's
families 5% to 10% thick at M 1.799 to 3.0 give identical numbers and
labels with and without the section; the 11 gated Basic Finner shots give
the same body base and total (C_D, low and high) within 1e-12, the present
factor used at each; three fins, swept fins (the leading edge swept 45
deg, the trailing edge unswept) and M 1.6 go to the rebuilt factor with
the routing label, its term and band parts equal to W1's at M 1.8, 2.0,
2.4 and 2.8 (bounded at 2.8); a 45 deg trailing edge, aft or forward, at
the base is refused with "1.67 times" at M 1.6; through
`finnedBodyComponents` a tapered planform with the trailing edge unswept
takes the rebuilt factor with the present factor's `'fin-sweep'` beside
it, and one swept at both edges is refused (`total-drag.test.ts`); a 10%
double wedge with a 4% root at M 1.6 takes the zero member as its lower
member; a tapered plate at M 2.0 is bounded from RM L52E06's relief, its
tip's t/c setting the upper member; plates at the base, tapered or of
constant chord, take the rebuilt factor's flat-plate value with
`flat-plate-fins` recorded, and a rounded trailing edge is refused
(`flat-plates.test.ts`). On the page the Basic Finner's form at M 1.6, with
three fins, or swept is refused for its trailing edge by the rebuilt
factor, with the present factor's reason beside it (`tests/app/`).

The coverage run's cross-check (section 8: 1200 cases, refused or not
agreeing with `finnedBodyComponents`) is not independent for the base
term: `evaluate.ts` asks `bodyBaseDrag` itself, with `baseFinsOf`'s
input, so it checks the decomposition of the other components and the
fin input's construction, not the base factor's routing.

## 6. What stays refused

| Refused                                                                                                              | Why                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| fewer than two or more than four fins                                                                                | TN 2360 has two and four                                                                                                                                                    |
| sections outside the 10% arc (tauEq above 0.10)                                                                      | the thickest member; steep short bevels among them                                                                                                                          |
| rounded, diverging and converging blunt trailing edges                                                               | no measurement, no ordering (section 4)                                                                                                                                     |
| sharp sections: leading-edge sweep 0 to 45 deg with a swept trailing edge, or at M 1.5 to 2.0, or above 60           | not measured; ordering not shown (3.4). Flat-faced fins with the trailing edge unswept are served at every sweep (section 12), below M 1.62 only unswept or at 45 to 60 deg |
| flat-faced fins with the trailing edge unswept and the leading edge swept more than 0 and under 45 deg, below M 1.62 | the floor there is RM L52E06's 45 deg plates alone, and which way the juncture vortex moves F is not shown (section 12; 0014 10.7 (z), the note of 2026-10-27)              |
| flat-faced fins with the trailing edge unswept and the leading edge swept beyond 60 deg, below M 1.62                | past the last sweep measured, and which way the juncture vortex moves F is not shown (section 12; 0014 10.7 (z), the note of 2026-10-27)                                    |
| flat-faced fins with the trailing edge swept, outside 45 to 60 deg of leading edge, or beyond it                     | a swept trailing edge carries the square edge out of one plane parallel to the base, which section 12's argument rests on                                                   |
| swept fins with a sharp trailing edge below M 1.5                                                                    | no swept fins of such sections measured there (section 11)                                                                                                                  |
| trailing edge swept more than the leading edge                                                                       | outside both swept sets                                                                                                                                                     |
| a sharp section with the trailing edge swept aft within 0.9 root chords of the base, or forward anywhere             | not measured there (RM L52J21a's edge is swept aft, 0.85 +-0.05 chords ahead); linear theory raises the pressures behind the edge (3.4)                                     |
| Mach below 1.0 or above 3.0                                                                                          | fig. 35's free-flight curve starts at M 1.0; the body base below 1.0 (11)                                                                                                   |
| fins ending ahead of the base above M 2.0                                                                            | TN 2360 measures positions at M 1.5 and 2.0 only, and its fall with distance weakens as the Mach number rises; fig. 32's readings differ                                    |
| fins ending ahead of the base below M 1.5 (bounded on 2026-10-26, then withdrawn after review, 3.3)                  | no measurement with fins ahead of the base below M 1.5; TN 2360's relief moves toward the base as the Mach number falls (3.3)                                               |
| fins ending ahead of the base at M 1.5 to 2.0 with a root chord other than 1.5 body diameters                        | TN 2360 measures positions with that chord only; where fins still reach the base depends on the chord against the body (3.3)                                                |
| fins ending more than a root chord ahead of the base (the plain curve until 2026-10-27)                              | nothing measures them; the plain curve's band missed TN 2360's measurement a chord ahead (3.3)                                                                              |

## 7. Readings

First readings (this work): TN 2360 fig. 6 (every symbol at x/c = 1.0 to
0), TN 3819 figs. 33 and 34 (all symbols) and 35 (the free-flight line at
M 1.40 to 1.80, not blind), RM L52J21a figs. 38(c) and 8 (R = 8.06e6),
RM L52E06 fig. 7 (M 1.06 to 1.10): `fins_at_base_w1.md`, with every value
in `fins_at_base_w1.csv` and `fins-on-base-w1-data.ts`, held to each other
by `fins-on-base-w1.test.ts`. RM L52J21a figs. 31 to 33 panel (d) were
read later for the zero member (below), and RM L52E06 fig. 8 for W2
(section 11.3). The band-setting figures 0014 lists that this method does
not use were not read (TN 2360 figs. 5 and 7, TN 3819 fig. 32, RM L52J21a
fig. 39 and figs. 31 to 33 outside panel (d), RM L52E06 fig. 6, TN 3372
figs. 7 to 12); 0014 section 10.7 (h) gives the status of each. _Corrected
2026-10-28 (the review of 86bcf73, its item 7):_ TN 3819 fig. 32 has since
been read three times blind (round 6, round 14 and round 16) and paired
three ways (0014 section 10.7 (ad), its note of 2026-10-26); no method
uses it, so it still sets nothing (section 10).

**Second readings** (round 6, blind, made on another branch from its own
renders: `docs/research/total-drag/audit/round6/readings/`, method in its
`method_*.md` files). Restated in the first reading's columns in
`fins_at_base_w1_second.csv` (`../scripts/w1/round6_second.py`), held in
`fins-on-base-w1-data.ts` as 'w1 second' beside the first and to the csv
by `fins-on-base-w1.test.ts`. Paired: TN 2360 fig. 6(a) and (b) (every
symbol at x/c 0 to 1.0), TN 3819 figs. 33 and 34 (every symbol) and 35
(the six tunnel symbols; round 6's first version of the free-flight line
is dropped, below), RM L52E06 fig. 7 (M 1.075 and 1.10 inside the first
reading's window; 1.05 for the comparison), RM L52J21a fig. 8 at R =
8.06e6 (round 6's named symbols and stack ends, dde6cd0) and figs. 31 to
33 panel (d) near R = 8e6 (below), and RM L52E06 fig. 8 for W2 (section
11). Not paired: RM L52J21a fig. 38(c) (below).

**Round 7** (blind, 2026-10-21, made on another branch from its own
renders: `docs/research/total-drag/audit/round7/` there, commits 92fb693
and 1cc821d, method in its `method.md`; its reading files copied
unchanged in `data/round7/`): TN 3819 fig. 18's two compiled curves at M
1.0 to 1.5 every 0.1 and at 2.0, 2.5 and 3.0, and its free-flight curve
(W2, section 11.3); RM L52J21a figs. 31 to 33 panel (d) at R 7e6 to
9.5e6, every symbol by nose; and RM L52J21a fig. 8's lower right panel
(R 8.06e6), the noses of the M 2.41 stacks and of the M 1.62 stack near
-0.1485. Paired by `../scripts/w1/pair_round7.py` (output
`w1_round7_pairing_output.txt`) and held in the code by
`compiled-curve.test.ts`, `base-w2.test.ts` and `fins-on-base-w1.test.ts`.

**The comparison** (`../scripts/w1/compare_round6.py`, output
`w1_compare_round6_output.txt`): each value, first minus second, against
the combined reading error (the sum of the two); symbols paired by value
within a station.

| Figure                                      | Values paired                                                           | Largest difference                                            | Beyond the combined error                                                                                                                                                                                                                                                                                         |
| ------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TN 2360 fig. 6                              | 38 pairs                                                                | 0.0024                                                        | one: 6(b) cruciform t/c 0.05 at x/c 1.0, +0.0064 against +0.0040 (combined 0.0022)                                                                                                                                                                                                                                |
|                                             |                                                                         |                                                               | four symbols found by one reader: the second's +0.0094 (6(a) cruciform t/c 0.10, x/c 1.0) and -0.0644 (the same, x/c 0.2); the first's -0.0573 (6(b) cruciform t/c 0.10, x/c 0) and -0.0344 (the same, x/c 0.6). Round 6 marks the 6(b) cruciform naming LOW MARGIN (circles and squares stack two or three deep) |
| TN 3819 fig. 33                             | 8                                                                       | 0.0006                                                        | none                                                                                                                                                                                                                                                                                                              |
| TN 3819 fig. 34                             | 8                                                                       | 0.0002                                                        | none                                                                                                                                                                                                                                                                                                              |
| TN 3819 fig. 35, tunnel symbols             | 12 (against the first and round 3)                                      | 0.0007                                                        | none                                                                                                                                                                                                                                                                                                              |
| TN 3819 fig. 35, the identified line        | 32 (its two readings, 0010 section 11.3); 9 (this work's against them)  | 0.0018 (M 2.15); 0.0023 (this work's, M 1.75, combined 0.006) | none                                                                                                                                                                                                                                                                                                              |
| RM L52E06 fig. 7                            | 13                                                                      | 0.0014                                                        | none; at M 1.06 the first reading could not separate the two centre lines (merged, +-0.003), the second separates them by 0.0055                                                                                                                                                                                  |
| RM L52J21a fig. 8, cylindrical base         | 3 (each Mach number's least negative)                                   | -0.0022 (M 1.93, combined 0.0027)                             | none. Two of round 6's stacks at M 2.41 are the panel's label and the NACA logo, not symbols (W1's look at the scan); left out                                                                                                                                                                                    |
| RM L52J21a fig. 8, conical base (not used)  | 3                                                                       | +0.0065                                                       | one: M 1.62, -0.0322 against -0.0387 (combined 0.0037)                                                                                                                                                                                                                                                            |
| RM L52J21a figs. 31 to 33 (d), a check      | 8 (same nose, R within 0.15e6)                                          | 0.0011                                                        | none; 17 of the first reading's 25 symbols at R 7 to 9.5e6 have no second (round 6 found the radome nose's circles there, and the conical nose's squares at M 1.62 only), and 3 of the second's carry another nose than the first's at the same place                                                             |
| RM L52E06 fig. 8, A (W2)                    | 8                                                                       | 0.0008                                                        | none                                                                                                                                                                                                                                                                                                              |
| RM L52J21a fig. 8, nose calls, round 7      | 5 calls at M 1.62 and 2.41 against this work's                          | 0.0029 (M 2.41, conical, combined 0.0025)                     | **two calls**: this work's conical and radome at M 2.41 (its template did not separate them) and round 6's -0.1485 ogive at M 1.62 are left out (below)                                                                                                                                                           |
| RM L52J21a figs. 31 to 33 (d), round 7      | 24 (by nose, R within 0.15e6)                                           | 0.0022 (combined 0.0025)                                      | none; this work's "radome" at M 2.41, R 7.54e6 is round 7's conical square (a wrong template call), and round 7's second square outline at M 1.93, R 7.33e6 has no counterpart                                                                                                                                    |
| TN 3819 fig. 18, the compiled curves (W2)   | 14 (round 1's rows at M 1.0, 1.2, 1.4, 1.5, 2.0, 2.5, 3.0, both curves) | -0.0020 (M 1.4, basic curve, combined 0.0012)                 | **one**: the basic curve at M 1.4, round 1's -0.1796 against round 7's -0.1776; resolved below                                                                                                                                                                                                                    |
| TN 3819 fig. 18, the free-flight curve (W2) | 4 (0008's values against round 7's, interpolated)                       | 0.0005 (M 1.159, combined 0.0014)                             | none                                                                                                                                                                                                                                                                                                              |

**The symbols one reader alone found** (TN 2360 fig. 6, the first row
above) stay in the data with both readings' envelope, flagged
(`singleReader`), and the code tests whether each sets an end of a band
it uses (`memberEndOnSingleReader`: the member's ratio range with and
without them). Three do, all on the cruciform t/c 0.10 ahead of the base:
-0.0644 at 6(a) x/c 0.2 and +0.0094 at x/c 1.0 (M 1.5, round 6's), which
set the ends of the four-fin 10% member at x/c 0.1 to 0.3 and 0.9 to
1.0 at M 1.5, and -0.0344 at 6(b) x/c 0.6 (M 2.0, this work's), which
sets them at x/c 0.5 to 0.7 at M 1.8 to 2.0. The fourth, -0.0573 at 6(b)
x/c 0 (a reference run), sets no end. Every result whose band uses such
an end carries `secondReadingPending` and says so in its label (the
review of 2026-10-21; before it, nothing flagged them). A third reading
of fig. 6(a) and (b)'s cruciform t/c 0.10 at those stations would clear
or move them.

**Fig. 35's line above M 2.15: the identification resolved, and both
earlier lines were the wrong ones.** Round 6's first version read the
line 0.007 to 0.010 less negative than 0008's and round 3's at M 2.4 to
2.9, all 11 values beyond the combined errors: above the knee three lines
descend, and 0008's reading and round 3 took the most negative, round 6
the middle one; this work's look at a 300 dpi render agreed with round 6.
The identification of 0010 section 11.2, made from the report alone (the
legend, the dash patterns measured at 600 dpi, the text), finds the most
negative line above about M 2.15 to be estimate B, the middle line
estimate A, and the free-flight curve the least negative with-fin line,
ending at M 2.563; both readers of 0010 section 11.3 confirmed it on
their own scans. So the rebuilt factor now rests on the identified
curve's two readings and this work's at M 1.40 to 1.80, which lies on it
(3.1). Round 6's first version of the line is dropped (it stays in
`fins_at_base_w1_second.csv` as the record), and 0008's and round 3's
readings are superseded (`TN3819_FIG35_SUPERSEDED`, used by neither
factor). The present factor (0010 section 1.3, the Basic Finner's) was
corrected on the same readings (0010 section 11.4) and is bounded, not
measured, above M 2.56, between F = 1 and 1.3612 (0010 section 11.5);
the Basic Finner's validated class was narrowed to Mach 1.799 to 2.15
(68ae3ee).

**Fig. 18's basic curve at M 1.4: round 1's row is a misread.** Round
1 (the adopted table, +-0.001) reads -0.1796, round 7 -0.1776 +-0.0002:
0.0020 apart against a combined 0.0012, the only pair of fig. 18's 14
beyond its errors. The third evidence decides it: fig. 35's no-fin
curve, which reproduces the basic curve within 0.001 (0008 section 3.4),
reads -0.1774 and -0.1775 there in both readings of the identified curve
(0010 section 11.3), with round 7; and round 1 puts the two compiled
curves 0.0014 apart at M 1.4, where both readings put them 0.0034 to
0.0042 apart at M 1.2 and 1.5 and round 7 0.0038 at 1.4. So the row takes
round 7's value and round 1's is recorded as a misread
(`TN3819_FIG18_MISREADS`, `src/base/tn3819-fig18.ts`). The row is the
same on main; nothing served there uses it (main serves the compiled
curve from M 1.5, its curvature bound is set on twice-read nodes from
1.5, and the present factor's tunnel pairs are at 1.5, 2.0 and 2.41).
Here it enters the body base of W2 and the rebuilt factor's reference
at M 1.2 to 1.5 (section 11).

**The zero member re-derived from RM L52J21a figs. 8 and 31 to 33
(2026-10-21).** Fig. 38's Delta P_B is "P_B with fins minus P_B without
fins" (RM L52J21a p. 17): fig. 8's finned bodies (fin-supported) less the
same bodies sting-supported without fins (figs. 31 to 33 against
Reynolds number). Fig. 38(c) itself is read once (its symbols, three
noses, two bases, plain and flagged, stack at each Mach number; the
second reader could separate panel (a) only), so the member is formed
from figs. 8 and 31 to 33 by nose, each read twice
(`../scripts/w1/pair_round7.py`, output `w1_round7_pairing_output.txt`;
the earlier attempt, `../scripts/w1/zero_member_check.py`, is superseded).

- **The unfinned side** (figs. 31 to 33 (d), R 7e6 to 9.5e6): this work's
  first reading (template, made before round 6's was opened) and round 7's
  blind reading by symbol shape: 24 symbols pair by nose within 0.15e6 in
  R, the largest difference 0.0022 against a combined 0.0025, none beyond.
  This work's "radome" at M 2.41, R 7.54e6, is round 7's conical square, a
  wrong template call, and is left out.
- **The finned side** (fig. 8, R 8.06e6, cylindrical base): the noses
  called by three readers, this work's template (scores 0.19 to 0.44),
  round 6 (in part) and round 7 (blind, the M 2.41 stack and the M 1.62
  stack near -0.1485, from the free parts of each outline; 1cc821d):

| M    | This work (template)                           | Round 6                                        | Round 7                                        |
| ---- | ---------------------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| 1.62 | ogive -0.1611, conical -0.1485, radome -0.1488 | ogive -0.1485, ogive -0.1618                   | conical -0.1488, radome -0.1482                |
| 1.93 | ogive -0.1513, conical -0.1468, radome -0.1465 | conical -0.1454, radome -0.1448, ogive -0.1515 | not read                                       |
| 2.41 | ogive -0.1190, conical -0.1128, radome -0.1139 | stack ends only                                | ogive -0.1188, conical -0.1157, radome -0.1121 |

Two disagreements, each named and resolved by the third evidence:

- **M 2.41:** this work's conical call, -0.1128, lies 0.0029 from round
  7's, -0.1157 (combined 0.0025). Its circle and diamond fits lie 0.0010
  apart in P_B, where round 7 finds the two symbols 0.0036 apart: the
  template did not separate them. Round 7 calls them from the parts of
  each outline no other symbol covers (the diamond's pointed bottom
  vertex below the stack, the circle's round arcs), with high
  confidence; and fig. 38(c)'s relief there, +0.0020 +-0.002, agrees with
  round 7's call (Delta P_B +0.0034 to +0.0047 over the unfinned conical
  symbols near R 8.12e6) and not with this work's (+0.0063 to +0.0076).
  This work's conical and radome calls at M 2.41 are left out.
- **M 1.62:** round 6 names the -0.1485 symbol ogive; this work and round
  7 call that stack conical and radome (round 7: a diamond's vertices
  standing outside a circle with a flat round top and bottom), the ogive
  square apart near -0.161, where round 6 names one too. Round 6's -0.1485
  ogive call is left out.

F (finned over unfinned, each moved by its error toward more relief),
the least over each Mach number's calls and readings used:

- **M 1.62:** 0.970 (the conical nose); the ogive and radome above 1.
- **M 1.93:** **0.9378**, the conical nose (this work's -0.1468, called
  alike by round 6, over this work's unfinned -0.1524 at R 8.13e6); the
  ogive 0.970; Delta P_B +0.0038 to +0.0070 against fig. 38(c)'s +0.0055
  +-0.002.
- **M 2.41:** 0.941, the conical nose on round 7's call alone; the ogive
  (both readers) 0.961, the radome (round 7) 0.974.

So the member is **0.9378** (section 3.5), set at M 1.93 on calls two
readers agree on, and fig. 38(c)'s 0.9504 lies inside it. It is 0.013
below fig. 38(c): the difference of two plots carries both their reading
errors, the report's own difference one, and the nominal values agree.
The widened low end the coordinator set while the call was pending,
0.9052 (this work's conical call at M 2.41, now left out), goes back to
0.9378, not to 0.9504. What remains single: the conical and radome noses
at M 2.41 (round 7 alone), 0.003 above the member on the conical; a
second reading of that stack (fig. 8's lower right panel, R 8.06e6; the
other five panels are not needed) would clear `secondReadingPending` on
the results that use the zero member, or lower the member if it read the
circle less negative.

What moved (the high ends do not change):

| M   | Case                                  | Fig. 38(c), 0.9504               | Widened, 0.9052                  | Re-derived, 0.9378               |
| --- | ------------------------------------- | -------------------------------- | -------------------------------- | -------------------------------- |
| 1.5 | double wedge 2.4%, three fins, 45 deg | 0.9504, 1.2113, 1.4723 (+-21.5%) | 0.9052, 1.1888, 1.4723 (+-23.9%) | 0.9378, 1.2051, 1.4723 (+-22.2%) |
| 1.8 | the same                              | 0.9504, 1.1832, 1.4161 (+-19.7%) | 0.9052, 1.1607, 1.4161 (+-22.0%) | 0.9378, 1.1769, 1.4161 (+-20.3%) |
| 2.0 | the same                              | 0.9504, 1.1393, 1.3282 (+-16.6%) | 0.9052, 1.1167, 1.3282 (+-18.9%) | 0.9378, 1.1330, 1.3282 (+-17.2%) |
| 2.5 | the same                              | 0.9504, 1.1665, 1.3826 (+-18.5%) | 0.9052, 1.1439, 1.3826 (+-20.9%) | 0.9378, 1.1602, 1.3826 (+-19.2%) |
| 3.0 | the same (bounded)                    | 0.9504, 1.1657, 1.3811 (+-18.5%) | 0.9052, 1.1431, 1.3811 (+-20.8%) | 0.9378, 1.1594, 1.3811 (+-19.1%) |
| 1.8 | bevelled plate 3%, three fins, 45 deg | 0.9504, 1.2547, 1.5590 (+-24.3%) | 0.9052, 1.2321, 1.5590 (+-26.5%) | 0.9378, 1.2484, 1.5590 (+-24.9%) |

Flat plates (bounded from RM L52E06's relief), brackets whose lower
member is a measured family, and everything below M 1.5 are unchanged.
Since the review of 2026-10-21 the zero member below M 1.62 is RM
L52E06's 0.838 (section 3.5), so the first row is now 0.8379, 1.1551,
1.4723 (+-27.5%); the rows from M 1.8 are as in the last column.

**NSWCDD/TR-92/509 Table 2** (W1b, 3.4): this work's transcription; the
blind second is requested. **W2's readings**: section 11.

## 8. Coverage

0014's population (`docs/research/refusals/`, 2000 rockets, one
condition per Mach band), with `evaluate.ts` asking the library itself
(`bodyBaseDrag` with the fins' section and sweeps) at Mach 1.0 to 3.0.
Runs: before W1, `out/impact-before-w1.out` (0014's); after W1,
`out/impact-after-w1.out`; now (after W1b, W2, main's fin edges of flat
plates, the review of 2026-10-21 and main's fins' own-drag guard),
`out/impact.out`.

Totals (a number served for the whole rocket), share of the cases in each
band:

| Run                                                      | All bands  | M 1.0 to 1.2 | 1.2 to 1.5 | 1.5 to 1.8 | 1.8 to 3.0 |
| -------------------------------------------------------- | ---------- | ------------ | ---------- | ---------- | ---------- |
| Baseline population, before W1                           | 0.1%       | 0%           | 0%         | 0.2%       | 0.3%       |
| after W1                                                 | 0.7%       | 0%           | 0%         | 1.4%       | 1.4%       |
| after W1b and W2                                         | **1.0%**   | 0%           | **0.3%**   | 1.4%       | **2.4%**   |
| with main's fin edges of flat plates (0016, W3, W4)      | 2.1%       | 0%           | 0.3%       | 2.7%       | 5.5%       |
| after the review of 2026-10-21                           | 2.0%       | 0%           | 0.3%       | 2.5%       | 5.2%       |
| with main's fins' own-drag guard (7411c70), now          | **1.9%**   | 0%           | **0%**     | **2.5%**   | **5.2%**   |
| main alone, after its plates-at-base hotfix (e42d5d4)    | 0.2%       | 0%           | 0%         | 0.3%       | 0.5%       |
| Blunted tips entered as sharp, after W1, now             | 1.2%, 3.4% |              |            |            |            |
| Every condition at 0 km, and at 20 km, now               | 1.9%, 1.6% |              |            |            |            |
| Variant: four-fin, sharp-edged fins, after W1, now       | 1.6%, 2.6% |              |            |            |            |
| Variant: fewer Haack noses and blunt tips, after W1, now | 1.4%, 4.1% |              |            |            |            |

The fig. 35 correction of 2026-10-21 (section 3.1) and round 7's pairing
(fig. 18's row at M 1.4, W2's interpolation bound; section 7) move no
case between served and refused: `impact.out` is unchanged by either,
byte for byte. The later changes of that day (the zero member re-derived,
section 3.5; fins at the base from Mach 1.0, section 11.2; swept fins at
the base routed to the rebuilt factor, section 5, `evaluate.ts` passing
the edge sweeps the present factor now takes) leave the totals as above
and the cross-check at 824 of 824. What moves is at Mach 1.0 to 1.2: the
12.7% of that band's cases refused for fins at the base below M 1.1 are
asked of the rebuilt factor, which refuses 3.1 points of them for their
sweep, position or section and serves the rest, about 9.6% of the band;
totals there stay 0% (the nose, W7). With main's fin edges of flat plates
merged (0016: W3 and W4, a plate's largest t/c at its shorter end chord,
the present factor's thin-plate rule), the totals rise to 2.1% of all
bands (0.3%, 2.7% and 5.5% at Mach 1.2 to 1.5, 1.5 to 1.8 and 1.8 to 3.0)
against 0.3% for main's own run with the present factor alone
(`out/2026-10-21-w34-rereview/`); the cross-check covers 1200 cases, all
agreeing. Steep bevels refused rise from 4.2% to 6.5% of the cases, a
plate's t/c now taken at its tip.

**After the review of 2026-10-21** (B1 to B4 and the rest, sections 3.4,
3.5, 4, 5 and 11.2; `out/impact.out`, against the run before it kept in
the session as `impact-before-review.out`): totals of all bands 2.1% to
2.0%, Mach 1.5 to 1.8 2.7% to 2.5%, 1.8 to 3.0 5.5% to 5.2%, 1.2 to 1.5
unchanged at 0.3%, as the reviewer estimated. What moves is the swept
trailing edge at the base: the rebuilt factor's sweep refusals rise from
42.4% to 45.0% at Mach 1.5 to 1.8 and from 15.8% to 18.4% at 1.8 to 3.0
(the cases it no longer serves, a sharp section with its trailing edge
swept at the base or closer than 0.8 root chords, the threshold then). The totals lost are
ten cases, all of them that: double wedges and bevelled plates at the
base with the leading edge swept 45 to 60 deg and the trailing edge swept
15 to 53 deg aft, at Mach 1.5 to 3.0 (five rockets, each in two bands).
Routing flat plates by family (amendment i) moves no case between served
and refused: three of the totals served (four unswept rectangular plates
with rounded leading edges at Mach 1.8 to 3.0) took the present factor
before the review and now take the rebuilt factor's flat-plate value, and
main's `flat-plate-fins` refusal, which cut main's own run from 0.3% to
0.2%, is lifted here by the rebuilt factor. The zero member
below M 1.62 and the B2 correction below M 1.5 widen or move bands and
move no case. Of the 159 totals served (of 8000 cases), 80 carry the
rebuilt factor's flat-plate value (rounded-leading-edge plates with square
trailing edges), 58 the rebuilt factor on sharp sections, 2 the present
factor, and 19 the plain curve (fins a chord or more ahead); before the
review the reviewer counted 77 of 169 on the flat-plate value. The
cross-check agrees on all 1200 cases; it is not independent for the base
term (section 5).

**With main's fins' own-drag guard** (7411c70, 0014 section 10.7 (f),
merged after the review): below Mach 1.5 fin friction (every fin) and the
wave drag of sharp sections are refused, their band (the fins' own drag,
ARCAS) being measured at Mach 1.5 to 2.96 only. On main the body base
refused every total there already; here W2 serves it, so the guard is
what refuses them, and the coverage shows totals at Mach 1.0 to 1.5 only
where every component is served: none. Totals of all bands 2.0% to 1.9%,
Mach 1.2 to 1.5 0.3% to 0%: the six cases there (double wedges, two at
the base on the rebuilt factor and four a chord or more ahead on the plain
curve) are now refused for fin friction and fin wave drag; Mach 1.5 to
3.0 unchanged. Of the 153 totals served now, 80 carry the rebuilt
factor's flat-plate value, 56 the rebuilt factor on sharp sections, 2 the
present factor and 15 the plain curve. The rebuilt factor's part below
Mach 1.5 (section 11) is served in the body base term and enters no total
until the fin terms near Mach 1 are measured (W7, 0019). Cross-check 1200
of 1200.

**After the second review (2026-10-22):** the swept-trailing-edge
threshold moved from 0.8 to 0.9 root chords and forward-swept trailing
edges of sharp sections refused wherever they end (section 3.4). No case
moves between served and refused: 153 totals served, as before, each
with the same body base term, band and factor to 15 significant digits
(the served cases' terms compared between 0604b9b and this change), and
the cross-check agrees on all 1200 cases. Only the sweep refusal's rate
moves, 45.0% to 45.1% at Mach 1.5 to 1.8 and 18.4% to 18.5% at 1.8 to
3.0, on cases refused for other reasons too. The labels changed (the
carries on members, the plates' lower bound named), the numbers did not.

**A5, fins within a chord ahead of the base below Mach 1.5 (2026-10-26;
section 3.3, 0014 section 10.7 (ad)):** run before (main at 3389a04,
which reproduced the committed `out/impact.out` and `.json` byte for
byte) and after, the same 2000 rockets. The position refusal falls from
6.0% to 0% of the cases at Mach 1.0 to 1.2 and at 1.2 to 1.5 (about 120
rockets in each band, whose body base term is now served where nothing
else refuses it), and stays 0% at 1.5 to 1.8 and 11.5% at 1.8 to 3.0 (all
above Mach 2.0), 5.9% to 2.9% over all bands; its share as the sole
blocker of a total stays 0.11%, all above Mach 2.0. No total moves: 153
of 8000 served (1.9%; 0% below Mach 1.5, where amendment (f) refuses the
fins' own drag; 2.5% at 1.5 to 1.8; 5.2% at 1.8 to 3.0), and the
cross-check agrees on all 1200 cases. W1's package (what the rebuilt
factor still refuses) appears in 72.0% of the cases below Mach 1.5, from
78.0%. Every other line of `impact.out` is unchanged. (That was the first
build, to a chord ahead, commit 5c81b5b.)

**As narrowed to x/c 0.4 the same day** (section 3.3; `out/impact.out`
at commit 245a88e, against main's at 3389a04): the position refusal falls from 6.0% to
4.4% of the cases at Mach 1.0 to 1.2 and at 1.2 to 1.5 (about 32 rockets
in each band take the bounded value; those ending 0.4 to 1 chord ahead
stay refused), stays 0% at 1.5 to 1.8 and 11.5% at 1.8 to 3.0, and goes
from 5.9% to 5.1% over all bands; as the sole blocker of a total it stays
0.11%. Totals unchanged (153 of 8000, 1.9%), the cross-check 1200 of 1200. W1's package appears in 76.5% of the cases below Mach 1.5, from
78.0%. Every other line of `impact.out` is as on main.

**After the independent review (2026-10-26; section 3.3, 0014 section
10.7 (ad))**: below Mach 1.5 every position ahead of the base refused,
and at Mach 1.5 to 2.0 positions served only with TN 2360's root chord of
1.5 body diameters (`out/impact.out` now, against main's at 3389a04). The
position refusal is 6.0% of the cases at Mach 1.0 to 1.2 and 1.2 to 1.5
(as on main), 7.4% at 1.5 to 1.8 (0% on main) and 12.6% at 1.8 to 3.0
(11.5%), 8.0% over all bands (5.9%), and the sole blocker of a total in
0.15% (0.11%). The chord rule costs three totals: 150 of 8000 served
(153 on main), 47 at Mach 1.5 to 1.8 (49) and 103 at 1.8 to 3.0 (104),
none below 1.5. The cross-check agrees on all 1200 cases.

**Fins a chord or more ahead: the plain curve withdrawn (2026-10-27;
section 3.3, 0014 section 10.7 (ad), its amendment of that date):** on
the merged head (main at 5921198, whose audit counts the Von Karman noses
the page serves, merged at 1ec9df1), 155 of 8000 cases serve a total, 53
at Mach 1.5 to 1.8 and 102 at 1.8 to 3.0, none below 1.5. The same head
with fins more than a chord ahead put back on the plain curve (one line
changed for that run, `out/impact-merged-plain-curve.out`) serves 172 (62
and 110): the withdrawal costs 17 totals, all carried by the 81 rockets
with fins a chord or more ahead, and gains none; main serves 181, the
other 9 being this branch's rules within a chord. Before the merge (main
at 3389a04) it cost 15, 150 to 135. The position refusal, now every
position ahead of the base TN 2360 does not measure, is 23.8%, 23.8%,
23.6% and 23.7% of the four bands' cases (20.4%, 20.4%, 20.3% and 20.4%
with the plain curve), the sole blocker of a total in 0.57% (0.36%).
Ahead of the base the position is now named before the section, so the
rebuilt factor's sweep and section refusals fall on cases still refused
for the position. The cross-check agrees on all 1200 cases in each run.

The body base term alone (the probe of the research record,
`out/w1b-w2-probe.out`, whose totals agree with this run's): served in
12.2%, 20.4%, 31.4% and 45.8% of the four bands, from 0%, 0%, 31.4% and
29.5% after W1. Once W3, W4 and W5 are done the totals would be 6.3% at
Mach 1.2 to 1.5 and 13.5% at 1.8 to 3.0 (the probe, made before the fins'
own-drag guard; with it, 0% below Mach 1.5 until W7's fin terms), against
0014's projection of 16.3% and 17.1% with every base refusal lifted;
totals at Mach 1.0 to 1.2 stay 0% until W7.

The rebuilt factor's own refusals, as a share of each band's cases (now,
since 2026-10-27; ahead of the base the position is named first, so the
sweep and section rows count fewer cases than before, which were 55.0%,
55.0%, 45.1% and 18.5%, and 2.3%, 2.3%, 6.5% and 13.0%):

| Refusal (rebuilt factor)                                                                                                                              | 1.0 to 1.2 | 1.2 to 1.5 | 1.5 to 1.8 | 1.8 to 3.0 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------- | ---------- | ---------- |
| sweep not measured (below M 1.5 every swept sharp section; a swept trailing edge on a sharp section at the base)                                      | 41.3%      | 41.3%      | 34.1%      | 14.1%      |
| rounded or diverging blunt trailing edge                                                                                                              | 15.5%      | 15.5%      | 15.5%      | 15.5%      |
| section outside the 10% arc (steep bevels)                                                                                                            | 1.6%       | 1.6%       | 4.5%       | 9.6%       |
| fins ahead of the base where TN 2360 does not measure them (below M 1.5, above 2.0, another root chord, or more than a chord ahead; since 2026-10-27) | 23.8%      | 23.8%      | 23.6%      | 23.7%      |
| fins at the base below M 1.0 (below M 1.1 until 2026-10-21: 12.7% at M 1.0 to 1.2)                                                                    | 0%         | 0%         | 0%         | 0%         |
| fewer than two or more than four fins                                                                                                                 | 0%         | 0%         | 0%         | 0%         |

(Until 2026-10-27 sweep was checked before position, and the moderate
sweeps served at Mach 2.0 to 3.0 that end ahead of the base moved from
the first row to the fourth. Since then, ahead of the base, the position
is checked first, so a case ahead of the base that TN 2360 does not
measure is in the fourth row whatever its sweep or section, unless its
trailing edge is rounded or a blunt one the faces widen or narrow to,
which is named first (second row); the rounded trailing edges a chord or
more ahead, asked of the library since that date, add 0.7% to the
second.) The decomposition agrees with `src/total` on all 1200 cases the
library can represent (`impact.out`, cross-check). The flat plates'
bounded value is in 80 of the 159 totals served (above); this record said
before that it changed no total, which stopped being true when main's fin
edges of flat plates (0016) began serving plates with rounded leading
edges.

## 9. Hold-outs

None has been run. 0014 section 10.5 fixes when: BRL 934's range A (M 1.5
to 2.47) once W1 is committed with its band, which needs the second
readings in (rule 5 of 10.1: in, except RM L52J21a fig. 38(c), which
cannot have one, and NSWCDD/TR-92/509 Table 2 for W1b, section 7); its rounds are the Basic Finner's wedges,
which the rebuilt factor refuses, so range A tests the present factor
(10.3) and records the rebuilt one's refusal. The PARD standard body
(flat plates, 45 deg, at the base) needs W2, W3 and W4 besides W1's
bounded value; the Eglin set needs its fins' edges decided first; TN 3320
(the RM-10) needs W10. So W1 is "estimated on component data" with no
hold-out of its own yet.

## 10. Open

- The zero member is re-derived (0.9378 from M 1.62, RM L52E06's 0.838
  below it; section 3.5); the conical and radome noses of fig. 8's M 2.41
  stack are called by round 7 alone. A second reading of that stack (the
  lower right panel only) would clear `secondReadingPending` on the
  results that use the member from M 1.62 (section 7).
- The second reading requested: NSWCDD/TR-92/509 Table 2 (W1b). A third
  reading of TN 2360 fig. 6's cruciform t/c 0.10 at x/c 0.2, 0.6 and 1.0,
  where one reader alone found the symbols that set band ends (section 7).
- Moderate sweeps at Mach 1.5 to 2.0 (sharp sections; flat-faced fins
  with the trailing edge unswept: section 12), and with swept trailing
  edges: a measurement of such fins at the base (section 3.4); swept
  fins of sharp sections below Mach 1.5 (section 11.2); a sharp
  section's swept trailing edge at the base (refused since the review,
  section 3.4; a bounded treatment is proposed below).
- The steps at Mach 1.5, where W2's 1.065 ends (1.04 since 2026-10-27,
  0014 section 10.7 (ah)), and at 1.62, where the
  zero member changes (section 11.2).
- Rounded and diverging trailing edges at the base.
- Fins ahead of the base above M 2.0 (TN 3819 fig. 32's Langley symbols
  at M 2.41, x/c 0 to 1, are band-setting and read once, by round 6; a
  blind second reading is requested, 0014 section 10.7 (ad), and the
  method that uses them is written here after the pairing, before its
  code). NSWCDD/TR-92/509's fins one and two chords ahead were
  transcribed and examined before any registration, so they are a check
  that sets nothing, and only after Table 2's second transcription (0014
  section 10.7 (ad)). Fig. 32 has since had a blind second reading
  (round 14) and a third (round 16), and a three-way neutral pairing
  (`pairing-2026-10-26-fig32-three/`): readings 2 and 3 agree on all 12
  symbols, reading 1 differs at three symbols and the curve's left end;
  were they used, it would be as (ad)'s note of 2026-10-26 says (agreed
  values where all three agree, the envelope of all three where reading
  1 differs). Below M 1.5 every position ahead of the base is refused
  (section 3.3); what would reopen it is any measurement below M 1.5 with
  fins ahead of the base. At M 1.5 to 2.0 other root chords than TN
  2360's 1.5 body diameters need a measurement at another chord.
- **Route (i), fig. 32 at Mach 2.0 to 3.0: deferred** (the coordinator's
  decision of 2026-10-26). Nothing uses fig. 32, and any future route (i)
  needs a fresh registration in 0014 section 10.7, written before it is
  used. Four questions are open, and (ad)'s rules as written do not
  answer them:
  1. _The lower bound, the most important._ The three-way pairing's
     values were seen while the readings were being paired and checked,
     and were used for nothing. Its symbols a chord ahead of the base
     (x/c 1.0) read about -0.06 to -0.076 in P_B, where fig. 33 gives the
     body alone at Mach 2.41 as about -0.122: far on the relief side of
     the zero member (F 0.938 from Mach 1.62). So at Mach 2.41 fins ahead
     of the base can lower the base drag well past what the zero member
     allows, and whether the zero member still bounds thinner fins from
     below there is open.
  2. _Mach numbers._ Fig. 32 is at Mach 2.41 only: how it would cover
     Mach 2.0 to 2.41 (with TN 2360 at 2.0) and 2.41 to 3.0, where no
     carry is allowed now, is open.
  3. _Chord._ The chord rule names TN 2360's 1.5 body diameters at Mach
     1.5 to 2.0; fig. 32's model may have another root chord over
     diameter, and whether that sets its own domain is open.
  4. _Fin families._ Which fins fig. 32 measures, and whether section
     3.6's outward widening would reach the families it does not, is
     open.
- Whether the rebuilt factor replaces the present one inside the Basic
  Finner's class: the owner's decision after BRL 934's run (0014 section
  10.3). It would not today: it refuses the Basic Finner's wedges.

**Proposed for review, not shipped: a bounded value for a swept trailing
edge at the base.** The review of 2026-10-21 asked that sharp sections
with a swept trailing edge at the base be refused this round (section
3.4) and allowed a "bounded, not measured" treatment to be proposed
separately. The proposal: for a sharp section whose trailing edge is
swept L aft within 0.9 root chords of the base, the lower
bound the zero member, as for every swept fin; the upper bound the
unswept member that bounds a section k times as thick near its edges,
k = sqrt(M^2 - 1) / sqrt(M^2 - sec^2 L), linear theory's factor on the
pressures of the faces behind the edge (TN 2360 ties the increment to
those faces' pressures, "proportional to the local slopes", and in linear
theory a face of slope theta behind an edge swept L carries the pressure
of one of slope k theta behind an unswept edge): the section's tauEq
times k, refused above 0.10 and where the edge is subsonic (M cos L at
most 1, where linear theory gives no finite factor). For a 45 deg edge
k is 1.67 at M 1.6, 1.22 at 2.0 and 1.11 at 2.5, so a 2.4% double wedge
keeps four fins t/c 0.05 as its upper member from about M 1.52 (k at most
2.08), and a 5% double wedge takes the 10% reference; at M 1.8 to 3.0
the bands would be those of the unswept fin of k times its thickness.
The labels would say "bounded, not measured" and name linear theory as
the ordering. What it rests on is linear theory, not a measurement at the
base: RM L52J21a's 45/45 fins 0.85 root chords ahead lie inside the
unswept bracket, which says only that the effect is no larger there.
Questions for the review: whether linear theory's factor on the face
pressures bounds an increment that TN 2360 traces to the fins' pressure
field over the dead-air region (p. 6), a viscous interaction; whether the
tip's trailing edge, which a swept edge carries aft of the base (RM
L52J21a's crosses the base plane about a diameter out), changes the
argument; and whether a forward-swept edge, which no set measures, can
be ordered at all. It would reach the ten cases the refusal took from the totals
(section 8). Not shipped; no code carries it.

## 11. The base below Mach 1.5 (W2)

Work item W2 of 0014, variant (2b) of the research record
(`w1b_w2_proposal.md`), approved by the coordinator on 2026-10-20 with the
nominal at the band's midpoint and the linear band sum kept. Library:
`src/base/base-w2.ts`, routed in `src/base/base-drag.ts`; fins at the base
through `fins-on-base-w1.ts` below M 1.5; tests `tests/base/base-w2.test.ts`
and the W2 rows of `fins-on-base-w1.test.ts`.

Totals below Mach 1.5: W2 serves the body base term there, with fins at
the base, but since main's guard (0014 section 10.7 (f), merged here on
2026-10-21) fin friction and the wave drag of sharp sections are refused
below Mach 1.5, their band measured at Mach 1.5 to 2.96 only, so no total
below 1.5 is served until the fin terms near Mach 1 are (W7, design
record 0019). What this section sets is the base term such a total
would carry.

### 11.1 The body base, Mach 1.0 to 1.5

**Moved on 2026-10-27 by 0014 section 10.7 (ah); the text below is kept
as written.** The band of Mach 1.5 to 3.0 is now 0.77 to 1.17 (0008
section 3.3, corrected: RM L52J21a's unfinned radome nose at M 1.62 sets
its low end; 0.77 to 1.18 before the third addendum to (ah), 0.77 to
1.13 before round 20, both 2026-10-28, which moved its high end only). By this section's own rules the low end carried down is
0.77, and the nominal, the band's midpoint, is **1.04** (1.065 before);
the band below Mach 1.5 is **0.77 to 1.31**, about +-26% about the
nominal. The term without fins falls 2.3% (M 1.0: 0.1923, band 0.1424 to
0.2422). With fins at the base the members built on fig. 35's line are
divided by 1.04, so the term with four 10% arcs is unchanged (M 1.0:
0.3199, band 0.2148 to 0.4250); the three 2.4% double wedges of 11.2's
example give F on W2's term 0.838 to 1.778, nominal 1.308 (+-35.9%), the
term 0.2516 (0.0958 to 0.4073) at M 1.0, and 0.838 to 1.660, nominal 1.249
(+-32.9%), the term 0.2385 (0.0981 to 0.3789) at M 1.2. The steps of 11.2:
the same wedges from 0.2283 (0.0918 to 0.3648) just below M 1.5 to 0.2002
(0.0992 to 0.2892) at 1.5, -12.3%; at M 1.62 from 0.1947 (0.0953 to
0.2824) to 0.2031 (0.1101 to 0.2838); M 1.6's 0.1967 (0.0958 to 0.2857)
(the high ends from M 1.5 with 0.77 to 1.17, round 20; 0.2912, 0.2843,
0.2858 and 0.2877 with 1.18, and 0.2812, 0.2746, 0.2757 and 0.2779 with
1.13, before it);
four 10% arcs 0.2847 to 0.2817 at M 1.5, as before. On W2's term the
factor's half-width is +-32.8% to +-35.9% (`base-w2.test.ts`). No total
is served below Mach 1.5, so no served total moves. W2's label now names
its low end's source: the band of Mach 1.5 to 3.0 carried down, set by a
sting-supported tunnel body with a radome nose at Mach 1.62 (RM L52J21a).

- **Value:** Love's basic curve of TN 3819 fig. 18 continued below 1.5
  (its rows at M 1.0, 1.2, 1.4 and 1.5, linear in M as above 1.5, read
  twice since round 7; at M 1.4 round 7's -0.1776, round 1's -0.1796
  being a misread, section 7), times
  **1.065**, the band's midpoint. A method choice, as in W1's brackets:
  every free-flight datum below M 1.5 lies above the curve (1.03 to 1.30
  times it), so the curve itself would sit near the band's low end. The
  term steps up by that factor below M 1.5; the band steps too.
- **Band over the curve: 0.82 to 1.31.** High end: the largest
  free-flight datum over the curve below M 1.5 plus its reading error,
  rounded outward: RM L52E06 fig. 8's finless PARD body A at M 1.05 to
  1.055, 1.301 in both readings (this work's 0.2389 +-0.0012, where the
  curve runs along the 0.24 gridline; round 6's 0.2396 +-0.0005). TN 3819
  fig. 18's free-flight curve lies inside: 1.03 to 1.12 over the curves
  in 0008's reading, 1.05 to 1.125 over the basic curve with its error in
  round 7's (the two within 0.0005 of each other). Low end: no finless datum below the curve was
  found under M 1.5 (fig. 18's tunnel symbols start at M 1.50, where they
  reach 0.88), so 0.82, the band-setting low end of M 1.5 to 3.0, is
  carried down. Carried flat across M 1.3 to 1.5, where no free-flight
  data were found (0014's W2 item). About +-23% about the nominal, of the
  order 0014 planned (0.85 to 1.3).
- **The band sum** is the present linear one (0010 section 1.4): the
  curve's band, the interpolation bound and the fins-on-base band add.
  For fins at the base the nominal no longer counts the free-flight
  excess twice (section 11.2, since the review of 2026-10-21); the band
  still adds the curve's band to the factor's, which is conservative
  where the factor's member is itself a free-flight measurement of the
  whole term (the reference, fig. 35's line); narrowing it is a separate
  decision, not taken here.
- **The interpolation bound** between the rows takes a curvature bound of
  its own below M 1.5 (`W2_CURVATURE_BOUND`, 0.14): the bound of 0008's
  curve (0.063, set on twice-read nodes from M 1.5) does not hold there,
  since round 7's rows at M 1.1 and 1.3 lie 0.0006 and 0.00055 off the
  chord of their neighbours where it allows 0.0003; the basic curve bends
  near M 1.2. It is the largest |P_B''| of round 7's rows every 0.1, both
  curves; at most 0.0007 in P_B mid-interval, 0.4% of the term.
- **Label:** "correlation: compiled base-pressure curve of TN 3819 fig.
  18 (Love) continued below Mach 1.5, times 1.065, the midpoint of its
  band 0.82 to 1.31 over the curve, set on free-flight data at Mach 1.0 to
  1.3 (RM L52E06 fig. 8, TN 3819 fig. 18) and carried to 1.5 (0015 section
  11); the curve's rows below 1.5 and fig. 18's free-flight curve read
  twice; with fins at the base, the fins-on-base members built on TN 3819
  fig. 35's free-flight line apply to the curve itself, not on top of the
  1.065 (0015 section 11.2); tested only in the total".
- **Refused:** below Mach 1.0 (the data opened stop there for this term),
  and as above 1.5: boat-tails, laminar bases.

The overlap of 0014 section 10.1 holds: RM L52E06's base pressures set
this band while the PARD body's totals are held back, so the PARD set's
range A (Mach 1.2 and above) tests, at 1.2 to 1.3, a total whose base
term was set on that body; its run's record says so.

### 11.2 Fins at the base, Mach 1.0 to 1.5

**Moved on 2026-10-27 by 0014 section 10.7 (ah); the text below is kept
as written.** W2's nominal is 1.04, not 1.065, so where this section says
1.065 read 1.04; its terms and steps with the new values are in 11.1's
note above.

The rebuilt factor (sections 3 and 4) extended below its tunnel members:

- **Reference** (four unswept 10% arcs at the base): TN 3819 fig. 35's
  identified free-flight curve over Love's basic curve, read twice from M
  1.0 (0010 section 11.3; this work's reading from 1.4), low end the line
  less its error, high end the line plus the largest tunnel excess,
  0.2282, carried as above M 2.41 (3.1):

  | M      | 1.0    | 1.05   | 1.1    | 1.2    | 1.3    | 1.4    | 1.5    |
  | ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
  | F low  | 1.6106 | 1.5679 | 1.5338 | 1.4875 | 1.4856 | 1.4944 | 1.5228 |
  | F high | 1.8496 | 1.8069 | 1.7728 | 1.7265 | 1.7248 | 1.7344 | 1.7281 |

  Against the line and the curve used before the fig. 35 correction, the
  low end is within 0.002 at M 1.1 and 1.2 and the high end 0.034 to
  0.035 higher there, with the larger excess (at 1.5 the tunnel sets
  both); at M 1.3 and 1.4 both ends rise a further 0.008 and 0.017 with
  fig. 18's corrected row at 1.4 (section 7), the factor's denominator.
  The term with these fins barely moves there: F times the curve is the
  line.

- **Zero member:** 1 down to 0.838, RM L52E06's relief with flat plates
  at the base (M 1.06 to 1.10, two readings), the lowest relief measured
  below M 1.62, where RM L52J21a's measurements begin (section 3.5).
- **No ratio members** (TN 2360 measures at M 1.5 and 2.0 only): sections
  are bracketed between the zero member and the reference, three fins
  between zero and four, flat plates bounded between 0.838 and the
  reference (section 4's ordering). Fins ending ahead of the base are
  refused (a bound built on 2026-10-26 was withdrawn after the
  independent review, section 3.3).
- **Sweep:** RM L52E06's flat plates are swept 45 deg at the leading
  edge, so flat-faced fins are served swept (45 to 60 deg, as above M 1.5);
  swept fins of sharp sections are refused, since none is measured below
  M 1.49. Variant (2c), every section swept, was not approved: it would
  lean further on the RM-10 at M 1.49, whose totals (TN 3320) are held
  back (section 3.4).
- **From M 1.0** (the owner's decision of 2026-10-21: no blanket refusal
  below Mach 1.2; serve wherever the result is accurate, with its band).
  W2 had refused fins at the base below M 1.1 because fig. 35's line then
  had one reading there; the identified curve is read twice from M 1.0,
  so they are served from 1.0 (`W1_LOW_MACH`). At M 1.0 to 1.1:
  - _the reference_ is the identified curve from its start (both readings
    -0.2998 at M 1.0, -0.2914 and -0.2913 at 1.05) over fig. 18's basic
    curve, whose row at M 1.0 is read twice (-0.1849, round 7's -0.1851,
    which round 7 takes 0.010 in M from its clean points at M 1.010 to
    1.035, the curve starting in a heavy stroke on the border); the high
    end is the line plus the tunnel excess, carried as from M 1.1. Love
    notes the measured line levels off at the lower Mach numbers (shock
    detachment and the fins' shocks interacting, printed p. 23): it is
    measured there, not inferred.
  - _the zero member_ is RM L52E06 fig. 7's relief with flat plates, 0.838
    (M 1.06, the first reading, rim, with its errors toward relief). Fig.
    7's finned lines are read from M 1.05 (round 6) to 1.10; over M 1.0 to
    1.05 it is carried flat, the one extrapolation here (0.05 in M). The
    rim relief strengthens from 0.882 at M 1.10 to 0.852 at 1.06 and
    levels off by 1.05 (0.850 in round 6's reading, 0.847 with its errors,
    above 0.838).
  - Example: a 2.4% double wedge, three unswept fins, at M 1.0: the
    rebuilt factor's F on W2's term (below) 0.838 to 1.737, nominal 1.287
    (+-34.9%), on Love's curve 0.892 to 1.850, nominal 1.371 (this record
    gave 0.838 to 1.850, nominal 1.344, +-37.6%, as F over the curve until
    2026-10-26, mixing two bases; section 3.6), the body base term on the base area 0.2535, band 0.1067 to
    0.4003 in C_D (0.265, 0.104 to 0.425 before the review; 0.197, band
    0.152 to 0.242, without fins: W2's body base serves M 1.0 to 1.5,
    section 11.1).

- **On W2's term, not on top of it** (the review of 2026-10-21). Below
  M 1.5 the body base is Love's curve times 1.065 (11.1), and the factor's
  reference is fig. 35's free-flight line over Love's curve itself, its
  ratio members ratios to that reference: so the product counted the
  free-flight excess over the curve twice, the term with four 10% arcs
  1.065 times the line it rests on. `bodyBaseDrag` now states the factor
  on W2's term: the members built on fig. 35's line (the reference and
  its ratio members) divided by 1.065, the zero members (RM L52E06's and
  RM L52J21a's reliefs, ratios to the body without fins) and the flat
  plates' relief as they are, the band the envelope and the nominal its
  midpoint as before, the label saying so (`base-w2.test.ts`). With four
  10% arcs at M 1.0 the term is 0.3199 (band 0.2242 to 0.4156), the line
  itself 0.2998 (the nominal the band's midpoint, whose high end carries
  the tunnel excess); before, 0.3407.
- **The steps at M 1.5 and 1.62.** W2's 1.065 ends at M 1.5 and the
  ratio members begin there, so the term steps: with four 10% arcs from
  0.2847 just below to 0.2817 at M 1.5 (-1.1%), where only the 1.065 and
  its correction meet; with three 2.4% double wedges from 0.2301 (band
  0.1017 to 0.3585) to 0.2002 (0.1092 to 0.2712), -13%, where TN 2360's
  four fins t/c 0.05 replace the reference as the upper member. At M
  1.62 the zero member goes from RM L52E06's 0.838 to RM L52J21a's 0.938
  (section 3.5), and the same double wedges step up from 0.1947 (band
  0.1051 to 0.2649) just below to 0.2031 (0.1203 to 0.2655), +4.3% (+3.3%
  against M 1.6's 0.1967, 0.1056 to 0.2680): the low end rises with the
  member and the nominal, the band's midpoint, with it; four 10% arcs,
  a member that does not use the zero member, do not step there. The
  steps are the method's (members measured where they are, carried no
  further), not measurements; the labels name the members on each side,
  `base-w2.test.ts` holds these numbers, and smoothing them is not done
  here (section 10).

Example (section 3.6): a 2.4% double wedge, three unswept fins, at M 1.2:
the rebuilt factor's F on W2's term 0.838 to 1.621, nominal 1.230
(+-31.9%), on Love's curve 0.892 to 1.727, nominal 1.309 (this record
gave 0.838 to 1.727, nominal 1.282, +-34.7%, as F over the curve until
2026-10-26, mixing two bases; section 3.6), the term
on the base area 0.2404 with a band of 0.1085 to 0.3723 in C_D (0.251,
about 0.11 to 0.40, before the review).

### 11.3 Readings

| Input                                               | Readings                                                                                                                      |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| RM L52E06 fig. 8, A, M 1.025 to 1.28                | two: this work's (`w2_l52e06_fig8_output.txt`), round 6's; 8 pairs within their combined errors, largest 0.0008               |
| TN 3819 fig. 18, rows at M 1.0, 1.2, 1.4, 1.5       | two (round 1, round 7): within the combined errors but the basic curve at M 1.4, round 1's misread, now round 7's (section 7) |
| TN 3819 fig. 18, the free-flight curve              | two (0008, round 7), within 0.0005                                                                                            |
| TN 3819 fig. 35, the free-flight line, M 1.0 to 1.5 | two (the identified curve's, 0010 section 11.3), within 0.0006; this work's from M 1.4 within 0.0001                          |
| RM L52E06 fig. 7 (the zero member below M 1.62)     | two (section 7)                                                                                                               |

### 11.4 Hold-outs

None is run here. 0014 section 10.5: BRL 934's range B (Mach 1.2 to
1.5) needs W2 with W1's part below 1.5, now committed, but its rounds are
the Basic Finner's wedges, which the rebuilt factor refuses, so the range
would record refusals; the Eglin set's range B (shots at 1.42 to 1.47)
needs its fins' edges decided first; the PARD body's range A needs W3
and W4 besides. Each run is the coordinator's to schedule.

## 12. Flat-faced fins at the base at every leading-edge sweep (2026-10-26)

Written before the code, under 0014 section 10.7 (z). This section
changes one rule of section 3.4 as it applies to flat-faced fins (plates
with a square trailing edge, and sections whose faces are flat at the
trailing edge): the leading-edge sweeps section 3.4 refuses because "other
sweeps are not measured and their ordering is not shown" are the sweeps of
sharp sections, whose face pressures the sweep moves. For flat faces the
bounded value of section 4 does not rest on those pressures, and its
ordering does not use the leading edge at all. So flat-faced fins at the
base, or within a chord of it where section 3.3 serves positions, are
served at every leading-edge sweep when the trailing edge is unswept,
with the bounds of section 4 unchanged. No new data enter, no band moves:
the same two bounds, the same label, applied to more sweeps. Narrowed on
2026-10-27 (the rulings below, under "What the sweep moves"): below M
1.62 the plates swept more than 0 and under 45 deg, and those swept
beyond 60 deg, are refused.

**What the bounds rest on, and why the leading edge is not in them.**

- _Upper bound_, the unswept circular-arc member at least as thick as the
  plate (section 4). Its ordering is TN 2360's mechanism: the increment
  follows the faces' slope near the trailing edge (pp. 6, 10), zero on a
  flat face. Sweeping the leading edge of a flat plate changes nothing
  about its faces: between its nose and its square edge the plate is
  parallel to the stream at every sweep. In a sharp section the sweep acts
  through the pressures behind a swept edge on an inclined face (section
  3.4's linear-theory factor); a flat face has no slope for that factor to
  multiply, which is the reason section 4 already gives for serving swept
  plates at the sweeps section 3.4 measures, and the reason W1b's argument
  (the aft faces' pressures within 4% of the unswept fin's) is vacuous for
  plates. The upper member is measured unswept, so the sweep enters this
  bound only through the ordering, which does not use it.
- _Lower bound_, the lowest relief measured with flat-faced fins at the
  base, RM L52E06 fig. 7 (four 0.091 in plates swept 45 deg at the leading
  edge, F 0.838 with the reading errors toward relief). Hart traces the
  relief to "low-momentum air from the fin-body junctures" entering the
  base region, with the square edge's own low pressure "confined to a
  small region just behind the blunt trailing edge" (p. 5): both at the
  trailing edge. With the trailing edge unswept the plate's square edge
  lies along its whole span in one plane parallel to the base (the base
  plane itself for fins at the base; up to a root chord ahead of it for
  fins within a chord, section 3.3), and the root juncture that feeds the
  base is a root chord long, its leading edge a root chord ahead of that
  plane, whatever the leading edge does further out. The sources of the
  measured relief are not moved by the sweep; what the sweep does move is
  in the next two items. Section 4 already applies this bound at 45 to 60
  deg and, at M 2.0 to 3.0, at 0 to 45 deg (through W1b's routing); this
  section applies it below 45 deg below M 2.0 and above 60 deg, on the
  ground of the next two items.
- _What the sweep moves, and why the ends hold it._ At a fixed root
  chord c_r and semispan b with the trailing edge unswept, sweeping the
  leading edge by L moves three things, each one way only as L grows,
  and each acts on F as follows. (1) The fin's area and tip chord, the
  tip chord c_r - b tan L and the area b (c_r - b tan L / 2), both
  largest unswept. Taking the fin's effect on the base to grow with its
  size, shrinking the fin moves F toward 1, its value with no fin, which
  lies inside every bracket served, whichever side of 1 the fin's own
  effect is on. (2) The juncture vortex, the horseshoe vortex the root's
  leading edge stands in the body's boundary layer, driven by the
  pressure rise at that edge (the pressure a rounded or square edge
  stagnates, the shock at a bevel), which grows with the edge's normal
  Mach number M cos L, so strongest unswept. Which way it moves F the
  record does not show. Hart traces the relief to the junctures'
  low-momentum air: a stronger vortex could feed more of it into the
  base region (F down, more relief) or carry it off (F up). RM L52E06's
  relief weakens from M 1.06 to 1.10 while its edges' normal Mach number
  rises from 0.75 to 0.78, which leans to the second but does not
  separate the vortex from the Mach number. (3) The leading-edge shock:
  the bow wave a rounded or square edge stands off, a detached shock,
  normal at the edge, once M cos L is above 1; the shock at a bevel,
  attached and oblique while the bevel is below the detachment angle at
  M cos L; strongest unswept, and no shock of the edge's own once M cos
  L is below 1. It reaches F only through what is left of it at the
  trailing edge, a chord aft at the root, where a flat face has brought
  the flow back to nearly the stream's pressure: a compression left
  there would raise the base pressure (F down), an expansion lower it (F
  up), either one largest unswept.

  So in each of the three a plate swept 0 to 45 deg lies between the
  unswept plate, the extreme of all three, and RM L52E06's 45 deg
  plates, which set the floor (section 4 serves 45 to 60 deg), and it
  moves nothing in a direction the ends do not span. A plate swept
  beyond 60 deg moves each the same way as the step from 0 to 45 deg
  does, further from the unswept extreme (a smaller fin, a weaker
  juncture vortex, a weaker edge), while the relief's sources above stay
  where they are; that range rests on this argument alone, past the last
  sweep measured, which the label says.

  The premise this inherits: plates swept 0 to 45 deg are as safe as the
  unswept plate's bracket and no safer, and that bracket, served since
  0014 10.7 (i) (section 4), is argued, not measured: no flat plate
  swept less than 45 deg is measured at the base. The margin at the
  floor is thin: RM L52E06's 45 deg plates measured F 0.852 at M 1.06
  (0.866 and 0.882 at 1.08 and 1.10), and the floor, 0.838, is that
  reading moved by its error toward relief, 0.014 below it. An open risk
  follows from (2): if a stronger juncture vortex relieves more, the
  unswept plate, and the plates swept less than 45 deg between it and
  the measured ones, could lie below 0.838 below about M 1.62, where the
  floor is RM L52E06's alone (from M 1.62 RM L52J21a measures at most 5%
  relief with fins near the base, section 3.5, and the floor has about
  0.1 to spare). Nothing measured says they do or do not; base pressures
  with unswept plates at the base below M 1.62 would close it.

  **The ruling of 2026-10-27** (0014 10.7 (z), its dated note, after the
  review of A1's fixes; it narrows this section). Under 0014 section
  10.2, without the ordering shown the case stays refused: with (2)'s
  direction not shown, a plate swept more than 0 and under 45 deg is not
  shown to lie between the unswept plate and the 45 deg ones below M
  1.62, so it is refused there, at the base term, the page's words
  naming the missing measurement (base pressures with such plates at the
  base below M 1.62). From M 1.62 it stays served: there RM L52J21a
  measures at most 5% relief with fins near the base, against a floor
  16% down. The unswept plate, served since 0014 10.7 (i), is not
  changed by the ruling; whether it stays served below M 1.62 is the
  owner's question ((z)'s note). The same open direction bears on plates
  swept beyond 60 deg below M 1.62: if a weaker juncture vortex relieves
  more, they could lie below 0.838, and RM L52E06's trend (less relief
  as its edges' normal Mach number rises) leans that way. A second
  ruling the same day ((z)'s note) refuses them there too: (2)'s
  direction is not shown, and beyond 60 deg the plate is not even
  between two measured ends, it lies past the last one, so its ordering
  is not shown; the page's words name the missing measurement (base
  pressures with plates swept beyond 60 deg at the base below M 1.62).
  Exactly 60 deg, and 45 to 60, stay as section 4 serves them, and from
  M 1.62 plates beyond 60 deg stay served on the same RM L52J21a ground
  as those under 45 deg.

  The concrete case is a plate swept 20 deg at M 1.2. Its root edge sees
  a normal Mach number of 1.2 cos 20 deg = 1.13, near sonic, a state
  neither end has: the unswept plate's edge sees 1.2 and stands off a
  detached shock, and a 45 deg plate's sees 0.85 and stands off no shock
  of its own (RM L52E06's own, at M 1.06 to 1.10, see 0.75 to 0.78). On
  each of the three counts it lies between them: its tip chord and area;
  the pressure its root edge stagnates, which drives the juncture
  vortex, 2.21 times the free stream's against 2.41 unswept and 1.60 at
  45 deg (the pitot pressure at the normal Mach number, gamma 1.4); and
  its shock's jump, 0.32 of the free stream's pressure against 0.51
  unswept and none at 45 deg. Its bow wave stands further ahead of the
  edge than the unswept plate's (a detached shock's stand-off grows as
  the normal Mach number falls toward 1), but it is weaker, and it
  stands ahead of the root's edge, a root chord forward of the trailing
  edge, not at the trailing edge where both bounds rest.

- _The leading edge near the tip._ The sweep also moves the leading edge
  aft: at spanwise station y its nose lies c_r - y tan L ahead of the
  trailing edge. Above 60 deg the tip chord can reach zero (at 70 deg a
  semispan of 0.36 root chords leaves 0.01 of one), so the nose, and a
  bevel's shoulder behind it, reach the trailing edge's plane over the
  outer span. What keeps them out of both bounds is not a chord's
  distance but what they are and where they are. A plate's nose and a
  bevel's shoulder carry a thickness-sized field (a rounded or square
  edge's bow wave, a bevel's shock and the expansion at its shoulder,
  over a few plate thicknesses, 1.6 to 6.4 mm in the population), not a
  face's pressures. Where they reach the trailing edge's plane they are
  near the tip, a semispan from the body, not at the root juncture that
  feeds the relief. And in the supersonic stream their wave runs
  downstream from there: it cannot reach the juncture or the square edge
  inboard of it, both of which lie at or ahead of that plane. It can
  reach the near wake behind the base (for fins within a chord ahead,
  after crossing the body behind them), and through the wake's
  recompression, which sets the base pressure, the base itself. That
  path is open, and what bounds it is strength, not distance: those
  waves are weaker than the unswept plate's leading-edge wave, since
  their edge sees the normal Mach number M cos L, not M (above 60 deg
  below 1 at every Mach number to 2.0, so no shock of its own), and the
  unswept plate, whose stronger wave reaches the same wake from a chord
  further forward, is an end of the bracket, with the premise above.
  Nearer the wake, the swept plate's wave has less distance to weaken
  over; this argument does not weigh that, one more reason the label
  says "bounded, not measured". So the measured relief is set by what
  the sweep does not move.
- _Where the measurements sit._ The two bounds are measured at the two
  ends of the sweeps rockets fly: the arcs unswept (TN 2360, TN 3819 figs.
  33 and 35), the plates at 45 deg (RM L52E06); NSWCDD/TR-92/509's 43.9
  deg double wedges with unswept trailing edges, checks of the sweep
  bracket at M 2.0 to 3.0 (section 3.4), lie inside the unswept bracket.
  No fin of any section is measured at the base with the leading edge
  swept beyond the RM-10's 60 deg, and no flat plate below 45 deg; a plate
  there is served on the argument above, not on a measurement at its
  sweep, which is what the label "bounded, not measured" says.

**What it does not reach.** A plate with its trailing edge swept stays
as section 4 left it: served with the leading edge swept 45 to 60 deg and
the trailing edge swept no more than the leading edge, either way (RM
L52E06's plates and the RM-10 bracket it; the code took a plate's
trailing-edge sweep by its magnitude before this section, and still
does), refused at other sweeps, since a swept trailing edge carries the
square edge out of one plane parallel to the base, which this section's
argument does not cover. Sharp sections are untouched: section
3.4's rules, the linear-theory factor and the refusals below M 1.5
(section 11.2) stand as written. Rounded and diverging trailing edges stay
refused (section 4). The present factor (0010 section 1.3) is untouched;
flat-faced fins never reach it (0014 10.7 (i)).

**In the code.** `finsOnBaseFactorW1` tests the plate case (`bounded`,
flat faces at a square trailing edge) with the trailing edge unswept
before the sweep check of section 3.4, and serves it at any leading-edge
sweep; the label names the sweep and says the bounds are set at the
trailing edge, in the base plane for fins at the base and in one plane
parallel to it, that many root chords ahead (to two decimals), for fins
within a chord, which the leading-edge sweep does not move, citing this
section (the label said "in the base plane" for both until the review of
2026-10-26, wrong for fins ahead of the base). `fins-on-base-w1.test.ts`
holds, for plates at the base and within a chord, at M 1.0 to 3.0:
served at 20, 44 and 70 deg; each label placing the trailing edge where
it is (a test of its own on the review's case: a plate t/c 0.024, three
fins, the leading edge swept 20 deg, 0.5 root chords ahead of the base
at M 1.8, and the same at 1/3, printed 0.33, which A1's review of
2026-10-27 found printed in full); the band's ends and nominal at every
sweep equal to the same plate's unswept, to 1e-12 (the ordering says the
bracket is the same bracket); the same fins as a double wedge still
refused at 20 and 44 deg below M 2.0 and at 70 deg; a plate with the
trailing edge swept beyond 45 to 60 deg of leading edge, or swept more
than the leading edge, or forward, still refused.
`fins-on-base-routing.test.ts` and `total-drag.test.ts` hold the route
through `bodyBaseDrag` and the total. Since the ruling of 2026-10-27 the
plate case refuses, below `W1_RELIEF_MEASURED_FROM` (M 1.62), a leading
edge swept more than 0 and under 45 deg (`'fin-sweep'`, the message
carrying `W1_FLAT_UNDER_45_MARK`, on which the page's words for it key);
`fins-on-base-w1.test.ts` holds 20 deg refused at M 1.55 and served at
1.65, M 1.62 served and 1.6199 refused, 44.9 and 0.5 deg refused and 45
deg served at 1.55, the same within a chord, and unswept, 45 and 60 deg
plates served at M 1.0, 1.2 and 1.55; and, since the second ruling, a
leading edge swept beyond 60 deg below M 1.62 (the message carrying
`W1_FLAT_BEYOND_60_MARK`): 61 and 70 deg refused at M 1.55 and served at
1.65, served at 1.62 and refused at 1.6199, the same within a chord, 60
and 59.9 deg served and 60.1 refused at 1.55; `status-words.test.ts`
holds the page's three fin-sweep wordings to 0017's three rows. Since
the quick look of 2026-10-27, after main's A5 (0014 10.7 (ad)): both
rules are in `flatPlateSweepNarrowing`, and where the fins end ahead of
the base and their position is refused too (below Mach 1.5, another root
chord than 1.5 body diameters, or more than a chord ahead), the one
refusal names both, the position first (`fins-near-base`, the sweep's
reason after `W1_SWEEP_REFUSED_TOO`), in the factor and in
`bodyBaseDrag`, and the page's words for it advise the base with a sweep
served there, so that neither reason's advice leads into the other
(`status-words.test.ts`: a plate 0.5 and 1.5 root chords ahead, swept 20
and 70 deg, at Mach 1.2; `fins-on-base-w1.test.ts`: the same at Mach 1.2
and, with a 2.5-diameter chord, 1.55). _Merged with A5's follow-ups,
2026-10-28:_ in `bodyBaseDrag` the sweep is now named as the plate's
refusal at the base, which A5's chain carries beside the position's
refusal (0014 10.7 (ad), its bullet on every reason), not also in the
position's message, so it is named once; the factor called directly
still names both in one refusal, as above. A sweep is printed to one
decimal, or to as many as keep it on its own side of 45 and 60 deg
(44.99 deg is not printed 45.0; `sweepDegrees`), and the narrowed words
say "at or near the base", the first naming RM L52E06's Mach numbers,
1.06 to 1.10. A total that holds such a plate names the argument in its
claim (2026-10-28): the factor's `sweepByArgument` is set for flat-faced
fins with the trailing edge unswept at any leading-edge sweep outside 45
to 60 deg, 0 deg included, since no flat plate is measured at the base
unswept either (section 4, 0014 10.7 (i)), and `src/app/total-drag.ts`
then gives `W1_BOUNDED_SWEPT_REASON`, "... and the leading edge unswept
or swept where no flat plate is measured at the base, short of 45 deg or
beyond 60 deg, bounded by the argument of 0015 sections 4 and 12)", with
its own words (`total-drag.test.ts`, `status-words.test.ts`,
`fins-on-base-w1.test.ts`).

**Coverage.** Measured on the population of 0014 at 400 rockets, one
condition per Mach band (1,600 cases), before and after this section
(`docs/research/refusals/out/2026-10-26-a1-plates-any-sweep/before/` and
`after/`, run with `N_ROCKETS=400 CROSS_CHECK=100`, so the cross-check
against `src/total` covers the first 100 rockets' 400 cases, and agrees
on all 400 in each). The rebuilt factor's sweep refusal falls from 43.6%
of cases to 22.4% (Mach 1.5 to 1.8: 46.0% to 20.3%; 1.8 to 3.0: 17.0% to
9.3%). Totals served, with the nose as the audit counts it: 2.6% to 2.9%
of all bands (Mach 1.5 to 1.8: 3.8% to 5.0%; 1.8 to 3.0: 6.5%,
unchanged); with the nose assumed served, as the refusal plan counts
them, 123 to 144 of the 1,600 (Mach 1.5 to 1.8: 39 to 59; 1.8 to 3.0: 84
to 85; none below 1.5, 0014 10.7 (f)). Those counts were not printed as
such: they were read from each run's greedy table, the row after its
first two steps, which lift W5 and W6 (the before run lifts W6 first,
the after run W5), and with them every nose refusal at Mach 1.5 and
above (the other nose reasons are 0% there): 7.7% and 9.0% of all bands,
9.8% and 14.8% of the 400 cases at Mach 1.5 to 1.8, 21.0% and 21.3% at
1.8 to 3.0, each case 0.25% of a band. Since the review the audit prints
them (`impact.out`'s table "Totals with the nose assumed served"); the
after run, re-made with that table and nothing else changed, prints 144
of 1,600 (59 and 85), and at the default size 743 of 8,000. The gain is
small because the plates this section reaches at the base (304 of the
1,600 cases) are mostly refused for something else as well: 32 are
served; 100 have a square-cut leading edge (0016 W11), 44 a rounded
leading edge swept beyond 60 deg, 44 a thickness over the tip chord
above 0.10 (`fin-thickness`, section 3.6: a 1/4 in plate on a short
tip), 31 a bevelled leading edge whose reflected wave shock-expansion
theory refuses (0009), and below Mach 1.5 every one carries the fins'
own-drag guard and the trailing edges' Mach range. Each of those is its
own item; none is touched here. On main's audit since 2026-10-27
(5921198, which counts the Von Karman noses the page serves), this
section's change gave 228 totals of 8,000 against main's 181 (Mach 1.5
to 1.8: 68 to 111; 1.8 to 3.0: 113 to 117; none below 1.5). With the
ruling of 2026-10-27 it gives 209 (Mach 1.5 to 1.8: 92; 1.8 to 3.0: 117,
unchanged), `out/impact.out` as re-made then; with the nose assumed
served, 743 without the ruling and 687 with it (Mach 1.5 to 1.8: 323 to
267); the rebuilt factor's sweep refusal is 36.0% of cases (51.4% below
Mach 1.5, 29.5% at 1.5 to 1.8, 11.5% at 1.8 to 3.0); the cross-check
agrees on 1,200 of 1,200. The second ruling (beyond 60 deg) moves no
total: 209 served, 687 with the nose assumed served, the plates it
reaches being refused for something else as well; the sweep refusal goes
to 38.0% (55.0% below Mach 1.5, 30.7% at 1.5 to 1.8, 11.5% at 1.8 to
3.0). On 2026-10-28, after main's A5 (f88ecbe; 0014 10.7 (ad)), the same
run serves 179 totals of 8,000 against main's 155 (Mach 1.5 to 1.8: 53
to 73; 1.8 to 3.0: 102 to 106; none below 1.5), 614 with the nose
assumed served: A1's gain over main is 24, against 28 before A5 (181 to
209), the 4 lost all at Mach 1.8 to 3.0; the cross-check agrees on 1,200
of 1,200. Later on 2026-10-28, after main's A3 and A4 (3e026a8; 0014
10.7 (aa) and (ab)), it serves 184 against main's 155 (Mach 1.5 to 1.8:
53 to 73; 1.8 to 3.0: 102 to 111), 628 with the nose assumed served:
A1's gain is 29, 5 more than before A3 and A4, all at Mach 1.8 to 3.0,
where a rounded leading edge that A4 bounds past 60 deg can now meet
this section's plates at the base (0016 section 21.8's note). After
main's B1 and the body base band (cdd26e6 and 0b2def5, 2026-10-28; 0014
10.7 (ac) and (ah)) the counts are unchanged: 184 against main's 155
(Mach 1.5 to 1.8: 53 to 73; 1.8 to 3.0: 102 to 111), 628 with the nose
assumed served, A1's gain 29; the cross-check agrees on 1,200 of 1,200.
B1 newly serves square trailing edges only below Mach 1.5, where the fins'
own-drag guard refuses every total, and the body base's wider band
leaves its served value unchanged from Mach 1.5.
