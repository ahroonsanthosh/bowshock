# 0015: Fins at the base, the factor rebuilt (W1), and the base below Mach 1.5 (W2) (draft)

- **Status:** Draft. Library and tests: `src/base/fins-on-base-w1.ts`
  and its data `src/base/fins-on-base-w1-data.ts`, routed in
  `src/base/base-drag.ts`; `tests/base/fins-on-base-w1.test.ts`,
  `tests/total/fins-on-base-routing.test.ts`; since W1b and W2 also
  `src/base/base-w2.ts` and `tests/base/base-w2.test.ts`. Work items W1
  and W2 of [0014](0014-refusals.md), under its section 10's
  registration, with W1b (moderate sweeps, section 3.4) and W2 (section 11) as the coordinator decided on 2026-10-20. **Readings:** W1's are in
  twice (round 6's blind second reading, paired in section 7) except RM
  L52J21a fig. 38(c), which cannot be read a second time from the scan;
  NSWCDD/TR-92/509 Table 2 (W1b) and TN 3819 fig. 18's rows below Mach 1.5
  and free-flight curve (W2) have one reading, their blind seconds
  requested, and the code carries `secondReadingPending` and the labels
  say so. Every band is the envelope of every reading. No hold-out has
  been run (sections 9, 11.4). Revised on 2026-10-21 for the
  identification of TN 3819 fig. 35's free-flight curve (0010 section
  11): the reference member rests on the identified curve to Mach 2.56
  and is bounded, not measured, above it (sections 3.1, 7).
- **Date:** 2026-10-20 (revised 2026-10-21)
- **Inputs:** 0014 sections 5.1, 6.2 (W1) and 10; [0010](0010-base-drag-and-total.md)
  section 1.3 (the present factor, kept) and section 10; [0008](0008-total-drag.md)
  section 3.4; the first readings
  ([`fins_at_base_w1.md`](../research/total-drag/data/fins_at_base_w1.md),
  `.csv`, `../scripts/w1/`); the second
  (`fins_at_base_w1_second.csv`, from `audit/round6/`); the two readings of TN 3819 fig. 35's
  identified free-flight curve (0010 section 11, `src/base/tn3819-fig35.ts`); 0014's population
  (`docs/research/refusals/`).

## 1. Summary

The present fins-on-base factor F (P_B with fins over P_B without, 0010
section 1.3) is measured on one family, four unswept 10%-thick
circular-arc fins at the base, and serves four fins 5% to 10% thick at
Mach 1.80 to 3.0. It refuses 96% of 0014's population. The rebuilt
factor serves what the band-setting data of 0014 section 10.1 cover:

- **Sharp trailing edges** of any section that lies inside the 10%
  circular arc near its edges, two to four fins, unswept or with the
  leading edge swept 45 to 60 deg, at the base, at Mach 1.5 to 3.0; with
  the leading edge swept up to 45 deg and the trailing edge unswept at
  Mach 2.0 to 3.0 (W1b, section 3.4); fins ending up to a chord ahead of
  the base at Mach 1.5 to 2.0; and, below Mach 1.5 (W2, section 11),
  unswept fins at the base at Mach 1.1 to 1.5.
- **Flat faces at a square trailing edge** (flat plates), the same
  counts, sweeps and positions, swept also below Mach 1.5: "bounded, not
  measured" (0014 section 10.2), between the lowest relief measured with
  such fins and the circular-arc member at least as thick (section 4).
- **The body base below Mach 1.5** (W2, section 11): Love's curve
  continued to Mach 1.0 with a band of 0.82 to 1.31 set on free-flight
  data, the nominal at its midpoint.
- **Above Mach 2.56**, where the free-flight curve of TN 3819 fig. 35
  ends (0010 section 11), every case served is "bounded, not measured":
  the reference member there runs from the zero member's 0.9504 to its
  high end at Mach 2.56 (section 3.1).
- **Refused:** other counts, rounded or diverging trailing edges (the
  Basic Finner's wedges among them), thicker sections, sweeps not
  measured (0 to 45 deg with a swept trailing edge or below Mach 2.0,
  above 60 deg; swept sharp sections below 1.5), fins at the base below
  Mach 1.1 or above 3.0, positions ahead of the base above Mach 2.0 or
  below 1.5 (section 6).

**Routing (0014 section 10.3).** The present factor is kept wherever it
serves, so the Basic Finner's validated total is unchanged to 1e-12 at all
11 gated shots (`fins-on-base-routing.test.ts`); the rebuilt factor is
used only where the present one refuses, and says so in its label (section
5). This holds until the owner decides otherwise after BRL 934's run.

**Bands.** On F, from 0.95 up to 1.33 to 1.56 for thin sharp-edged fins
(+-17% to +-24% about the midpoint), from 0.84 up to 1.33 to 1.54 for
flat plates (+-23% to +-30%), +-7.3% to +-10.9% for the 5% circular arcs
that are members themselves (section 3.6). Wider than 0014's planning figure of +-10% to
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
asked on 2026-10-21): from the zero member's low end, **0.9504** (section
3.5), to the member's high end at M 2.56, **1.3811**, its band the whole
gap and its nominal the midpoint, 1.1657. The ordering is 0010 section
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
| F low  | 1.5228 | 1.5832 | 1.4563 | 1.2578 | 1.1750 | 1.1233 | 1.0996 | 1.0887 | 1.0855 | 0.9504     |
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

### 3.4 Sweep: only where measured

The band-setting data have swept fins at the base at two sweeps, both
with circular-arc sections: RM L52J21a's 45 deg (leading and trailing
edges) at M 1.62 to 2.41, and the RM-10's 60 deg at M 1.49 to 1.98. Both
lie inside the bracket from the zero member (3.5) to the unswept member
that bounds their thickness, at every Mach number measured (RM L52J21a's
fin effects over fig. 8's cylindrical-base P_B; `fins-on-base-w1.test.ts`):

| Set                               | M            | F measured     | Zero member | Unswept member (low end)                                                         |
| --------------------------------- | ------------ | -------------- | ----------- | -------------------------------------------------------------------------------- |
| RM L52J21a, 45 deg, 8%, R 8.06e6  | 1.62 to 2.41 | 0.963 to 1.119 | 0.950 to 1  | 1.568, 1.320, 1.100 at M 1.62, 1.93, 2.41 (the reference, which bounds 8% fins)  |
| RM-10, 60 deg, t/c 0.10 (fig. 34) | 1.49 to 1.98 | 1.137 to 1.229 | 0.950 to 1  | 1.523, 1.560, 1.477, 1.275 at M 1.5 (for 1.49), 1.59, 1.78, 1.98 (the reference) |

So swept fins are served with the leading edge swept 45 to 60 deg and the
trailing edge swept no more than the leading edge (as in both sets),
bracketed between the zero member and the unswept member that bounds the
section. The RM-10's base pressures (fig. 34) check this bracket at M 1.49
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
| 2.0 | t/c 0.05     | 1.072 (0.970, 1.185) | 0.950 to 1.328 (four fins t/c 0.05)                |
| 2.0 | t/c 0.10     | 1.145 (1.036, 1.265) | 0.950 to 1.441 (the reference)                     |
| 2.5 | t/c 0.05     | 1.094 (0.990, 1.210) | 0.950 to 1.383 (the reference)                     |
| 2.5 | t/c 0.10     | 1.198 (1.084, 1.324) | 0.950 to 1.383                                     |
| 3.0 | t/c 0.05     | 1.111 (1.005, 1.228) | 0.950 to 1.381 (bounded, not measured: above 2.56) |
| 3.0 | t/c 0.10     | 1.200 (1.086, 1.326) | 0.950 to 1.381 (bounded)                           |

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
2026-10-20): moderate sweeps at M 1.5 to 2.0 (no such fins with an
unswept trailing edge are measured there; the aft faces' factor grows to
1.11 at M 1.5 and the forward faces' to 1.98, the 43.9 deg edge near
sonic; the 45 and 60 deg sets there have other planforms, which is
suggestive but not the ordering), and moderate sweeps with a swept
trailing edge at any Mach number (one 45/45 deg set, RM L52J21a: one end,
no ordering). Leading edges above 60 deg stay refused (beyond the
RM-10's). Opening them needs base pressures with and without fins of 20
to 45 deg at M 1.5 to 2.0, with unswept and with swept trailing edges;
Heyser, Maurer and Oberdorffer (AGARD CP-10, 1966) is the one candidate
known that might hold them.

### 3.5 The zero member

No fins, or fins whose pressure field vanishes: F from 1 down to the
largest relief measured at M 1.5 or above with fins near the base and a
turbulent layer, RM L52J21a fig. 38(c) at R = 8.06e6 (its most positive
dPb at each Mach number, over fig. 8's least negative cylindrical-base
P_B in either reading, both read toward more relief): **0.9504** at M 1.93
(0.950 where three decimals are quoted)
(round 6's fig. 8, -0.1443, is less negative than the first's). The
plain and flagged symbols of fig. 38 cannot be told apart on the 1-bit
scan, so the cylindrical base's relief is at most the cluster's; its
least relief factor, 0.950, is carried to every Mach number from 1.5. It
is the lower member of every bracket whose section lies below t/c 0.05,
of every swept fin, and of three or two fins where two are not measured,
and the reference's low end above M 2.56 (3.1).
Fig. 38(c) is read once (section 7), so every result that uses this
member carries `secondReadingPending`.

Below M 1.5 (W2's part, section 11) RM L52J21a measures nothing; the zero
member there runs from 1 down to **0.838**, the lowest relief measured
with fins at the base at or below M 1.5 (RM L52E06 fig. 7, flat plates,
M 1.06 to 1.10, both readings), the flat plates' own lower bound.

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

| M   | Case                                                    | Lower, upper member                       | F low  | F nominal | F high | Half-width |
| --- | ------------------------------------------------------- | ----------------------------------------- | ------ | --------- | ------ | ---------- |
| 1.5 | double wedge 2.4%, three fins, 45 deg                   | zero; four fins t/c 0.05                  | 0.9504 | 1.2113    | 1.4723 | 21.5%      |
| 1.8 | the same                                                | zero; four fins t/c 0.05                  | 0.9504 | 1.1832    | 1.4161 | 19.7%      |
| 2.0 | the same                                                | zero; four fins t/c 0.05                  | 0.9504 | 1.1393    | 1.3282 | 16.6%      |
| 2.5 | the same                                                | zero; the reference                       | 0.9504 | 1.1665    | 1.3826 | 18.5%      |
| 3.0 | the same (bounded: above M 2.56)                        | zero; the reference, bounded above M 2.56 | 0.9504 | 1.1657    | 1.3811 | 18.5%      |
| 1.8 | double wedge 2.4%, four fins, unswept                   | zero; four fins t/c 0.05                  | 0.9504 | 1.1832    | 1.4161 | 19.7%      |
| 1.8 | bevelled plate 3% (bevel 0.085 chord), 45 deg           | zero; the reference                       | 0.9504 | 1.2547    | 1.5590 | 24.3%      |
| 1.8 | flat plate 2.4%, three fins, 45 deg (bounded)           | RM L52E06 relief; t/c 0.05                | 0.8379 | 1.1270    | 1.4161 | 25.7%      |
| 2.5 | the same (bounded)                                      | RM L52E06 relief; the reference           | 0.8379 | 1.1103    | 1.3826 | 24.5%      |
| 1.8 | circular arc 10%, three fins, unswept                   | two fins t/c 0.10; reference              | 1.2151 | 1.3870    | 1.5590 | 12.4%      |
| 1.8 | double wedge 2.4%, three fins, 45 deg, x/c 0.5          | zero; four fins t/c 0.05 at 0.4 and 1.0   | 0.9040 | 1.0897    | 1.2755 | 17.0%      |
| 2.0 | double wedge 2.4%, four fins, 30 deg, TE unswept (W1b)  | zero; four fins t/c 0.05                  | 0.9504 | 1.1393    | 1.3282 | 16.6%      |
| 2.5 | double wedge 2.4%, three fins, 30 deg, TE unswept (W1b) | zero; the reference                       | 0.9504 | 1.1665    | 1.3826 | 18.5%      |
| 1.2 | double wedge 2.4%, three fins, unswept (W2)             | zero below M 1.5; the reference           | 0.8379 | 1.2822    | 1.7265 | 34.7%      |
| 1.2 | flat plate 2.4%, three fins, 45 deg (W2, bounded)       | RM L52E06 relief; the reference           | 0.8379 | 1.2822    | 1.7265 | 34.7%      |

A member served as itself (four unswept 5% arcs at M 1.5 to 2.0) carries
+-7.3% to +-10.9%, the widest just above M 1.5, where its ratio range
becomes the envelope of both tunnel Mach numbers' (3.2); the reference
served as itself (four unswept 10% arcs) carries +-6.3% to +-7.5% at M
1.1 to 1.5, up to +-12.0% at M 2.56, and +-18.5% above it, where it is
bounded (3.1). On the body base term these widths are the fins-on-base
part of the band; the curve's 0.82 to 1.08 and the interpolation bound
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
0.9504) to its high end at M 2.56", and gives the gap in C_D. Every total
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
  the zero member's 0.950, so RM L52E06's reduction is contained.

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

| Refused                                                                                    | Why                                                                                |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| fewer than two or more than four fins                                                      | TN 2360 has two and four                                                           |
| sections outside the 10% arc (tauEq above 0.10)                                            | the thickest member; steep short bevels among them                                 |
| rounded, diverging and converging blunt trailing edges                                     | no measurement, no ordering (section 4)                                            |
| leading-edge sweep 0 to 45 deg with a swept trailing edge, or at M 1.5 to 2.0, or above 60 | not measured; ordering not shown (3.4)                                             |
| swept fins with a sharp trailing edge below M 1.5                                          | no swept fins of such sections measured there (section 11)                         |
| trailing edge swept more than the leading edge                                             | outside both swept sets                                                            |
| Mach below 1.1 or above 3.0                                                                | fins at the base from M 1.1, as W2 was approved (10); the body base below 1.0 (11) |
| fins ending ahead of the base above M 2.0 or below 1.5                                     | TN 2360 measures positions at M 1.5 and 2.0 only                                   |

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

**The comparison** (`../scripts/w1/compare_round6.py`, output
`w1_compare_round6_output.txt`): each value, first minus second, against
the combined reading error (the sum of the two); symbols paired by value
within a station.

| Figure                                     | Values paired                                                          | Largest difference                                            | Beyond the combined error                                                                                                                                                                                                                                                                                         |
| ------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TN 2360 fig. 6                             | 38 pairs                                                               | 0.0024                                                        | one: 6(b) cruciform t/c 0.05 at x/c 1.0, +0.0064 against +0.0040 (combined 0.0022)                                                                                                                                                                                                                                |
|                                            |                                                                        |                                                               | four symbols found by one reader: the second's +0.0094 (6(a) cruciform t/c 0.10, x/c 1.0) and -0.0644 (the same, x/c 0.2); the first's -0.0573 (6(b) cruciform t/c 0.10, x/c 0) and -0.0344 (the same, x/c 0.6). Round 6 marks the 6(b) cruciform naming LOW MARGIN (circles and squares stack two or three deep) |
| TN 3819 fig. 33                            | 8                                                                      | 0.0006                                                        | none                                                                                                                                                                                                                                                                                                              |
| TN 3819 fig. 34                            | 8                                                                      | 0.0002                                                        | none                                                                                                                                                                                                                                                                                                              |
| TN 3819 fig. 35, tunnel symbols            | 12 (against the first and round 3)                                     | 0.0007                                                        | none                                                                                                                                                                                                                                                                                                              |
| TN 3819 fig. 35, the identified line       | 32 (its two readings, 0010 section 11.3); 9 (this work's against them) | 0.0018 (M 2.15); 0.0023 (this work's, M 1.75, combined 0.006) | none                                                                                                                                                                                                                                                                                                              |
| RM L52E06 fig. 7                           | 13                                                                     | 0.0014                                                        | none; at M 1.06 the first reading could not separate the two centre lines (merged, +-0.003), the second separates them by 0.0055                                                                                                                                                                                  |
| RM L52J21a fig. 8, cylindrical base        | 3 (each Mach number's least negative)                                  | -0.0022 (M 1.93, combined 0.0027)                             | none. Two of round 6's stacks at M 2.41 are the panel's label and the NACA logo, not symbols (W1's look at the scan); left out                                                                                                                                                                                    |
| RM L52J21a fig. 8, conical base (not used) | 3                                                                      | +0.0065                                                       | one: M 1.62, -0.0322 against -0.0387 (combined 0.0037)                                                                                                                                                                                                                                                            |
| RM L52J21a figs. 31 to 33 (d), a check     | 8 (same nose, R within 0.15e6)                                         | 0.0011                                                        | none; 17 of the first reading's 25 symbols at R 7 to 9.5e6 have no second (round 6 found the radome nose's circles there, and the conical nose's squares at M 1.62 only), and 3 of the second's carry another nose than the first's at the same place                                                             |
| RM L52E06 fig. 8, A (W2)                   | 8                                                                      | 0.0008                                                        | none                                                                                                                                                                                                                                                                                                              |

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
(68ae3ee). At M 1.4 both readings of the identified curve put fig. 35's
no-fin curve at -0.1774 to -0.1775, against -0.1796 in fig. 18's
adopted row, read once (0010 section 11.3): the rebuilt factor divides by
that row at M 1.4, where a 0.002 change moves the reference by about 1%.
It is left for the pairing of fig. 18's rows, whose blind second reading
is under way (section 11.3).

**RM L52J21a fig. 38(c) is read once, and stays so; the zero member is
not re-derived.** Fig. 38(c)'s symbols (three noses, two bases, plain and
flagged) stack at each Mach number; the second reader could separate
panel (a) only. Fig. 38's Delta P_B is "P_B with fins minus P_B without
fins" (RM L52J21a p. 17): fig. 8's finned bodies (fin-supported) less the
same bodies sting-supported without fins (figs. 31 to 33 against
Reynolds number), so the zero member could rest on those instead, each
read twice. With round 6's fig. 8 and figs. 31 to 33 in, this was tried
(`../scripts/w1/zero_member_check.py`, output
`w1_zero_member_check_output.txt`; this work's first reading of figs. 31
to 33 panel (d) at R 7 to 9.5e6, `w1_l52j21a_fig31_33d_output.txt`, made
before round 6's was opened). It cannot replace fig. 38(c) yet:

- the unfinned values that matter, the conical and ogive noses near R =
  8.06e6 at M 1.93 and 2.41, have one reading: round 6's scan found only
  the radome nose's symbols there;
- fig. 8's symbols stand in stacks of up to seven at each Mach number,
  and neither reading can call their noses reliably (this work's
  template scores 0.19 to 0.44; round 6 reports the stacks' ends only),
  so a nose-paired difference rests on uncertain calls;
- without nose calls the bound mixes noses (the least negative finned
  value minus the most negative unfinned one): F at least 0.973, 0.929
  and 0.887 at M 1.62, 1.93 and 2.41. That is a difference between
  different bodies, not a fin effect, and not a member.

As a check, the nose-paired differences on the first reading's calls
agree with fig. 38(c) within the combined errors at all three Mach
numbers: -0.0150 to +0.0005 at M 1.62 (fig. 38(c): -0.0157 to +0.0017),
-0.0089 to +0.0056 at 1.93 (-0.0066 to +0.0055: its most positive symbol
is the cylindrical base's conical nose), and -0.0013 to +0.0076 at 2.41
(-0.0069 to +0.0020, the conical nose 0.0056 above it against a combined
0.006, where fig. 8's calls are least certain). So the zero member stays
on fig. 38(c), read once, now over fig. 8's two readings (0.950), and
`secondReadingPending` stays true on every result that uses it. Without
fig. 38(c) the zero member would be F = 1 and every bracket using it
would narrow from below by 0.050, as would the reference's band above M
2.56 (3.1):

| M   | Case                                  | F low, nominal, high (with fig. 38(c)) | Without it               |
| --- | ------------------------------------- | -------------------------------------- | ------------------------ |
| 1.5 | double wedge 2.4%, three fins, 45 deg | 0.9504, 1.2113, 1.4723 (+-21.5%)       | 1.0000, 1.2362 (+-19.1%) |
| 1.8 | the same                              | 0.9504, 1.1832, 1.4161 (+-19.7%)       | 1.0000, 1.2080 (+-17.2%) |
| 2.0 | the same                              | 0.9504, 1.1393, 1.3282 (+-16.6%)       | 1.0000, 1.1641 (+-14.1%) |
| 2.5 | the same                              | 0.9504, 1.1665, 1.3826 (+-18.5%)       | 1.0000, 1.1913 (+-16.1%) |
| 3.0 | the same (bounded)                    | 0.9504, 1.1657, 1.3811 (+-18.5%)       | 1.0000, 1.1905 (+-16.0%) |
| 1.8 | bevelled plate 3%, three fins, 45 deg | 0.9504, 1.2547, 1.5590 (+-24.3%)       | 1.0000, 1.2795 (+-21.8%) |

Flat plates (bounded from RM L52E06's relief), brackets whose lower
member is a measured family, and everything below M 1.5 are unchanged.
Re-deriving the zero member needs figs. 31 to 33 (d)'s conical and ogive
symbols near R = 8e6 read a second time, and fig. 8's nose calls settled
(a reader who can separate the stacks, or the report's tabulated values if
any are found).

**NSWCDD/TR-92/509 Table 2** (W1b, 3.4): this work's transcription; the
blind second is requested. **W2's readings**: section 11.

## 8. Coverage

0014's population (`docs/research/refusals/`, 2000 rockets, one
condition per Mach band), with `evaluate.ts` asking the library itself
(`bodyBaseDrag` with the fins' section and sweeps) at Mach 1.0 to 3.0.
Runs: before W1, `out/impact-before-w1.out` (0014's); after W1,
`out/impact-after-w1.out`; after W1b and W2, `out/impact.out`.

Totals (a number served for the whole rocket), share of the cases in each
band:

| Run                                                      | All bands  | M 1.0 to 1.2 | 1.2 to 1.5 | 1.5 to 1.8 | 1.8 to 3.0 |
| -------------------------------------------------------- | ---------- | ------------ | ---------- | ---------- | ---------- |
| Baseline population, before W1                           | 0.1%       | 0%           | 0%         | 0.2%       | 0.3%       |
| after W1                                                 | 0.7%       | 0%           | 0%         | 1.4%       | 1.4%       |
| after W1b and W2                                         | **1.0%**   | 0%           | **0.3%**   | 1.4%       | **2.4%**   |
| Blunted tips entered as sharp, after W1, now             | 1.2%, 1.8% |              |            |            |            |
| Every condition at 0 km, and at 20 km, now               | 1.0%       |              |            |            |            |
| Variant: four-fin, sharp-edged fins, after W1, now       | 1.6%, 2.3% |              |            |            |            |
| Variant: fewer Haack noses and blunt tips, after W1, now | 1.4%, 2.0% |              |            |            |            |

The fig. 35 correction of 2026-10-21 (section 3.1) moves no case between
served and refused: `impact.out` is unchanged by it, byte for byte.

The body base term alone (the probe of the research record,
`out/w1b-w2-probe.out`, whose totals agree with this run's): served in
12.2%, 20.4%, 31.4% and 45.8% of the four bands, from 0%, 0%, 31.4% and
29.5% after W1. Once W3, W4 and W5 are done the totals would be 6.3% at
Mach 1.2 to 1.5 and 13.5% at 1.8 to 3.0 (the probe), against 0014's
projection of 16.3% and 17.1% with every base refusal lifted; totals at
Mach 1.0 to 1.2 stay 0% until W7.

The rebuilt factor's own refusals, as a share of each band's cases:

| Refusal (rebuilt factor)                                   | 1.0 to 1.2 | 1.2 to 1.5 | 1.5 to 1.8 | 1.8 to 3.0 |
| ---------------------------------------------------------- | ---------- | ---------- | ---------- | ---------- |
| sweep not measured (below M 1.5 every swept sharp section) | 55.0%      | 55.0%      | 42.4%      | 15.8%      |
| rounded or diverging blunt trailing edge                   | 14.8%      | 14.8%      | 14.8%      | 14.8%      |
| section outside the 10% arc (steep bevels)                 | 0.2%       | 0.4%       | 5.6%       | 10.1%      |
| fins within a chord of the base, above M 2.0 or below 1.5  | 3.8%       | 6.6%       | 0%         | 12.8%      |
| fins at the base below M 1.1                               | 12.7%      | 0%         | 0%         | 0%         |
| fewer than two or more than four fins                      | 0%         | 0%         | 0%         | 0%         |

(Sweep is checked before position: the moderate sweeps served now at Mach
2.0 to 3.0 that end ahead of the base move from the first row to the
fourth.) The decomposition agrees with `src/total` on all 824 cases the
library can represent (`impact.out`, cross-check). The flat plates'
bounded value changes no total today: every flat plate is refused by its
edge terms or the page (F1 to F3, F12 of 0014's inventory).

## 9. Hold-outs

None has been run. 0014 section 10.5 fixes when: BRL 934's range A (M 1.5
to 2.47) once W1 is committed with its band, which needs the second
readings in (rule 5 of 10.1: in, except RM L52J21a fig. 8, pending, and
fig. 38(c), which cannot have one, section 7); its rounds are the Basic Finner's wedges,
which the rebuilt factor refuses, so range A tests the present factor
(10.3) and records the rebuilt one's refusal. The PARD standard body
(flat plates, 45 deg, at the base) needs W2, W3 and W4 besides W1's
bounded value; the Eglin set needs its fins' edges decided first; TN 3320
(the RM-10) needs W10. So W1 is "estimated on component data" with no
hold-out of its own yet.

## 10. Open

- The zero member re-derived from RM L52J21a figs. 8 and 31 to 33: needs
  figs. 31 to 33 (d)'s conical and ogive symbols near R = 8e6 read a
  second time and fig. 8's nose calls settled (section 7).
- The second readings requested: NSWCDD/TR-92/509 Table 2 (W1b), TN 3819
  fig. 18's rows at Mach 1.0, 1.2 and 1.4 and its free-flight curve (W2);
  with fig. 18's row at M 1.4, the 0.002 between it and fig. 35's no-fin
  curve there (section 7).
- Fins at the base at Mach 1.0 to 1.1: refused since W2 because fig. 35's
  line then had one reading below M 1.1; the identified curve is now read
  twice from M 1.0 (0010 section 11.3), so that reason no longer holds.
  Opening it is the coordinator's decision; the zero member there would
  rest on RM L52E06 fig. 7 (M 1.06 to 1.10), as below 1.5 now.
- Moderate sweeps at Mach 1.5 to 2.0, and with swept trailing edges: a
  measurement of such fins at the base (section 3.4); swept fins of sharp
  sections below Mach 1.5 (section 11.2).
- Rounded and diverging trailing edges at the base.
- Fins ahead of the base above M 2.0 (TN 3819 fig. 32's Langley symbols
  at M 2.41, x/c 0 to 1, are band-setting and not yet read twice;
  NSWCDD/TR-92/509's fins one and two chords ahead stay unused until they
  are, 0014 section 10.1), and below M 1.5.
- Whether the rebuilt factor replaces the present one inside the Basic
  Finner's class: the owner's decision after BRL 934's run (0014 section
  10.3). It would not today: it refuses the Basic Finner's wedges.

## 11. The base below Mach 1.5 (W2)

Work item W2 of 0014, variant (2b) of the research record
(`w1b_w2_proposal.md`), approved by the coordinator on 2026-10-20 with the
nominal at the band's midpoint and the linear band sum kept. Library:
`src/base/base-w2.ts`, routed in `src/base/base-drag.ts`; fins at the base
through `fins-on-base-w1.ts` below M 1.5; tests `tests/base/base-w2.test.ts`
and the W2 rows of `fins-on-base-w1.test.ts`.

### 11.1 The body base, Mach 1.0 to 1.5

- **Value:** Love's basic curve of TN 3819 fig. 18 continued below 1.5
  (its rows at M 1.0, 1.2, 1.4 and 1.5, linear in M as above 1.5), times
  **1.065**, the band's midpoint. A method choice, as in W1's brackets:
  every free-flight datum below M 1.5 lies above the curve (1.03 to 1.30
  times it), so the curve itself would sit near the band's low end. The
  term steps up by that factor below M 1.5; the band steps too.
- **Band over the curve: 0.82 to 1.31.** High end: the largest
  free-flight datum over the curve below M 1.5 plus its reading error,
  rounded outward: RM L52E06 fig. 8's finless PARD body A at M 1.05 to
  1.055, 1.301 in both readings (this work's 0.2389 +-0.0012, where the
  curve runs along the 0.24 gridline; round 6's 0.2396 +-0.0005). TN 3819
  fig. 18's free-flight curve, 1.03 to 1.12 over the curves (0008's
  reading), lies inside. Low end: no finless datum below the curve was
  found under M 1.5 (fig. 18's tunnel symbols start at M 1.50, where they
  reach 0.88), so 0.82, the band-setting low end of M 1.5 to 3.0, is
  carried down. Carried flat across M 1.3 to 1.5, where no free-flight
  data were found (0014's W2 item). About +-23% about the nominal, of the
  order 0014 planned (0.85 to 1.3).
- **The band sum** is the present linear one (0010 section 1.4): the
  curve's band, the interpolation bound and the fins-on-base band add.
  For fins at the base this counts the free-flight excess over the curve
  twice, since fig. 35's line is itself a free-flight measurement over the
  curve; narrowing it is a separate decision, not taken here.
- **Label:** "correlation: compiled base-pressure curve of TN 3819 fig.
  18 (Love) continued below Mach 1.5, times 1.065, the midpoint of its
  band 0.82 to 1.31 over the curve, set on free-flight data at Mach 1.0 to
  1.3 (RM L52E06 fig. 8, TN 3819 fig. 18) and carried to 1.5 (0015 section
  11); the curve's rows below 1.5 and fig. 18's free-flight curve are read
  once, the second readings pending; tested only in the total".
- **Refused:** below Mach 1.0 (the data opened stop there for this term),
  and as above 1.5: boat-tails, laminar bases.

The overlap of 0014 section 10.1 holds: RM L52E06's base pressures set
this band while the PARD body's totals are held back, so the PARD set's
range A (Mach 1.2 and above) tests, at 1.2 to 1.3, a total whose base
term was set on that body; its run's record says so.

### 11.2 Fins at the base, Mach 1.1 to 1.5

The rebuilt factor (sections 3 and 4) extended below its tunnel members:

- **Reference** (four unswept 10% arcs at the base): TN 3819 fig. 35's
  identified free-flight curve over Love's basic curve, read twice from M
  1.0 (0010 section 11.3; this work's reading from 1.4), low end the line
  less its error, high end the line plus the largest tunnel excess,
  0.2282, carried as above M 2.41 (3.1):

  | M      | 1.1    | 1.2    | 1.3    | 1.4    | 1.5    |
  | ------ | ------ | ------ | ------ | ------ | ------ |
  | F low  | 1.5338 | 1.4875 | 1.4774 | 1.4777 | 1.5228 |
  | F high | 1.7728 | 1.7265 | 1.7166 | 1.7176 | 1.7281 |

  Against the readings used before, the low end is unchanged within
  0.002 and the high end rises by 0.032 to 0.035 at M 1.1 to 1.4, with
  the larger excess (at 1.5 the tunnel sets it). At M 1.4 both rest on
  fig. 18's row, read once (section 7).

- **Zero member:** 1 down to 0.838, RM L52E06's relief with flat plates
  at the base (M 1.06 to 1.10, two readings), the lowest relief measured
  at or below M 1.5; RM L52J21a measures none there.
- **No ratio members** (TN 2360 measures at M 1.5 and 2.0 only): sections
  are bracketed between the zero member and the reference, three fins
  between zero and four, flat plates bounded between 0.838 and the
  reference (section 4's ordering). Fins ending ahead of the base are
  refused.
- **Sweep:** RM L52E06's flat plates are swept 45 deg at the leading
  edge, so flat-faced fins are served swept (45 to 60 deg, as above M 1.5);
  swept fins of sharp sections are refused, since none is measured below
  M 1.49. Variant (2c), every section swept, was not approved: it would
  lean further on the RM-10 at M 1.49, whose totals (TN 3320) are held
  back (section 3.4).
- **Below M 1.1** fins at the base are refused, as W2 was approved. The
  reason given then, that fig. 35's line had one reading below 1.1, no
  longer holds: the identified curve is read twice from M 1.0 (section
  10).

Example (section 3.6): a 2.4% double wedge, three unswept fins, at M 1.2:
F 0.838 to 1.727, nominal 1.282 (+-34.7%); the term on the base area is
0.251 with a band of about 0.11 to 0.40 in C_D.

### 11.3 Readings

| Input                                               | Readings                                                                                                        |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| RM L52E06 fig. 8, A, M 1.025 to 1.28                | two: this work's (`w2_l52e06_fig8_output.txt`), round 6's; 8 pairs within their combined errors, largest 0.0008 |
| TN 3819 fig. 18, rows at M 1.0, 1.2, 1.4            | one (round 1); the blind second requested                                                                       |
| TN 3819 fig. 18, the free-flight curve              | one (0008); the blind second requested                                                                          |
| TN 3819 fig. 35, the free-flight line, M 1.1 to 1.5 | two (the identified curve's, 0010 section 11.3), within 0.0006; this work's from M 1.4 within 0.0001            |
| RM L52E06 fig. 7 (the zero member below M 1.5)      | two (section 7)                                                                                                 |

### 11.4 Hold-outs

None is run here. 0014 section 10.5: BRL 934's range B (Mach 1.2 to
1.5) needs W2 with W1's part below 1.5, now committed, but its rounds are
the Basic Finner's wedges, which the rebuilt factor refuses, so the range
would record refusals; the Eglin set's range B (shots at 1.42 to 1.47)
needs its fins' edges decided first; the PARD body's range A needs W3
and W4 besides. Each run is the coordinator's to schedule.
