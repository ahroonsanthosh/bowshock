# 0016: The fin edges of flat plates (0014 W3, W4, W11)

- **Status:** Draft. Libraries with tests (`src/base/fin-trailing-edge.ts`,
  `src/fins/rounded-leading-edge.ts`, `src/fins/section.ts`,
  `src/total/finned-body.ts`) and the drag page's section input. The new
  bands rest on first readings where a figure was read for this record
  (RM A55H31 figs. 11 and 12; NASA CR-149372 figs. 8b and 5, section
  11); the independent reader's blind second readings (round 6) are
  held beside the first and every band is the envelope of both (TN 2960
  in section 13, RM A55H31 and CR-149372 in section 14; round 7's re-read
  of fig. 8b at M 1.2 and the third looks at RM A55H31 fig. 12 in section
  16, the review's fixes). TN 3861 figs. 15 and 16 are read twice and fig.
  17 once, a check on the sweep allowance, not a band (section 16).
- **Date:** 2026-10-20
- **Inputs:** [0014](0014-refusals.md) W3, W4, W11 and section 10 (what
  sets bands, what is held back, "bounded, not measured", the readings
  owed); [0010](0010-base-drag-and-total.md) sections 5.1, 5.2 and 10 (the
  present trailing-edge and rounded-edge terms); the first readings of
  `docs/research/total-drag/data/fin_edges_w34.md` (with its `.csv`, its
  output and `scripts/w34_*.py`); TR 1109 fig. 29(a), already read twice
  (`src/base/blunt-te-2d.ts`); the population of
  [`docs/research/refusals/`](../research/refusals/README.md).

Section 11 (W4(e), flat plates at normal Mach numbers 1.0 to 1.49) was
added after the research item of section 6 and approved by the
coordinator with conditions (2026-10-20), its 0014 amendment committed
first.

No held-back set was opened or used for anything here (0014 section 10.1):
not the PARD body's totals (TN 3697 fig. 5, TN 3650 fig. 4, RM L52E06
figs. 9 to 12), not BRL Report 934, not the Eglin set, not TN 3320.

**Result in one line.** Flat-plate fins with a rounded leading edge and a
square trailing edge, tapered and swept, are now served where the data
cover them: the trailing edge's thick-layer limit is lifted from
c / [h Re_c^(1/5)] = 1.0 to 4.5, tapered fins are integrated along the
span, and rounded leading edges are served on plates of any planform,
swept to 60 deg, at normal Mach numbers of 1.49 to 3.0, and since
section 11 from 1.0. Refused, with the reasons of sections 6 and 11:
normal Mach numbers below 1.0 (on rounded wedges too since section 12), swept
trailing edges, the trailing edges below Mach 1.5,
square-cut leading edges and rounded trailing edges. The Basic Finner's
gated numbers are unchanged, bit for bit; its reported shots, still
refused, change only their reasons (section 12).

_Since section 21 (2026-10-26):_ for rounded leading edges swept beyond
60 deg, a "bounded, not measured" term was written, between the term at
their sweep and the term at 60 deg, the band the whole gap. The re-review
of 2026-10-27 had it refused again until TN 3861 fig. 17 was read twice
afresh (section 21.7). Since section 21.8 it is served from 60 to 75.1
deg; beyond 75.1 deg the edge is refused at any Mach number. Square-cut leading edges were argued bounded between the sonic and
the pitot pressure on the whole face. The computed check registered for
that argument failed (section 21.3). Measured flat faces then bore out
the bounds' premises, but only at face Reynolds numbers far above a
fin's (section 21.6). So square-cut edges stay refused, as do rounded
trailing edges.

## 1. What is served, and on what

The table as of section 18 (the sections below record how each row came to be).

| Item                  | Method                                                                                                                                                                                                         | Band on the term                                                                                                                                                                          | Domain                          | Data                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| W3(a) thick layers    | thin-layer term times K(M, X) = D(X) / D(1.0) on TR 1109 fig. 29(a)                                                                                                                                            | 0.93 x K_low to 1.21 x K_high (section 2)                                                                                                                                                 | X 1.0 to 4.5 at M 1.5 to 3.1    | TR 1109 fig. 29(a), both readings                                                                                                     |
| W3(b) varying chord   | the term integrated along the span (unswept trailing edge); stations below X 0.45 take the thin-layer term, labelled; a tip sliver beyond fig. 29's laminar read range bounded by the vacuum (sections 16, 18) | as W3(a), station by station                                                                                                                                                              | as the term                     |                                                                                                                                       |
| W4(a) flat plates     | the rounded wedge's limit, face angle 0: (2/3) Cp_pitot (2r) per span                                                                                                                                          | 0.99 to 1.06 (0.98 at M_n 1.49, rising to 0.99 by 1.59)                                                                                                                                   | M_n 1.49 to 3.0                 | TN 2960 fig. 5(c) both readings; figs. 5(d), 5(e) as checks                                                                           |
| W4(b) any planform    | the nose term per unit span times the span (a plate's radius is the same at every station)                                                                                                                     | as W4(a)                                                                                                                                                                                  |                                 |                                                                                                                                       |
| W4(c) swept           | the independence principle: the front side at M_n = M cos(sweep) on the normal dynamic pressure                                                                                                                | W4(a)'s or W4(e)'s times the sweep allowance, 0.95 to 1.22 from 14.3 deg, the smallest yaw tested, tapered below it to none unswept (sections 18, 19); extrapolated in normal Mach number | sweep to 60 deg, M_n 1.0 to 3.0 | RM A55H31 figs. 11, 12 (two readings and third looks, r at the stated yaws); TN 3861 figs. 15, 16 (two readings), 17 (one), as checks |
| W4(e) M_n 1.0 to 1.49 | plates and rounded wedges: the term times kappa(M_n), the cylinder's front side over modified Newtonian (section 11)                                                                                           | the bracketing nodes' range (sections 11, 14, 16)                                                                                                                                         | M_n 1.0 to 1.49                 | NASA CR-149372 figs. 8b, 5 (two readings; fig. 8b at M 1.2 three); TN 2960 at 1.49                                                    |
| Fins at the base      | flat plates refused (RM L52E06 fig. 7 measures relief; section 20); the wedge, circular-arc and hexagonal families thinner than 5%, the factor extended (section 18)                                           | the factor's; extended, low end F = 1                                                                                                                                                     | t/c up to 0.10                  | as the factor (0010)                                                                                                                  |

## 2. W3(a): blunt trailing edges with thick layers

The thin-layer term (0010 section 5.1) is RM A51J25 fig. 7's mean curve at
the free-stream Mach number, ruled to hold up to X = c / [h Re_c^(1/5)] =
1.0, where TR 1109 fig. 29(a)'s base drag lies within 0.4% to 4.0% of its
value at its lowest read abscissa. Beyond 1.0 the boundary layer thickens
against the edge, the base pressure rises, and by 4.5 fig. 29(a)'s base
drag has fallen 11% to 31%. The population's blunt edges have X of about
1.3 to 3.8 (the middle 90% in every band; 0014 section 5.4), so the limit
at 1.0 refused nearly all of them (T4, 52.6% of cases).

**Method.** The term is the thin-layer term times

    K(M, X) = D(M, X) / D(M, 1.0),   D = 1 - p_b / p_inf on fig. 29(a),

the first reading's K interpolated linearly in M between the curves at M
1.5, 2.0 and 3.1. K = 1 at X = 1, so the term is continuous there and
unchanged below it (the Basic Finner's edges sit at 0.69 to 0.76). Taking
D(1.0) as the reference, not D at the lowest abscissa, keeps the ruled
thin-layer band's meaning: it covers X up to 1.0, and K carries only the
fall beyond.

**Band.** The term's band, 0.93 to 1.21, times the lowest and the highest
K over both readings of fig. 29(a) and over the curves that bracket the
Mach number (at a curve's own Mach number, that curve alone). Both
readings show K falling with Mach number at every abscissa read, 1.25 to
4.5 (`fin-trailing-edge-thick.test.ts`), so the bracketing curves bound it;
at 4.5 K is 0.885, 0.863, 0.719 at M 1.5, 2.0, 3.1 (first reading) and
0.887, 0.862, 0.720 (second). Examples (`thickLayerFactor`):

| M   | X   | K nominal | K low to high  | Band on the term, of the nominal |
| --- | --- | --------- | -------------- | -------------------------------- |
| 2.5 | 2.2 | 0.931     | 0.903 to 0.956 | 0.90 to 1.24                     |
| 1.8 | 3.3 | 0.923     | 0.909 to 0.944 | 0.92 to 1.24                     |
| 2.5 | 3.3 | 0.866     | 0.815 to 0.910 | 0.87 to 1.27                     |

On a 54 mm rocket at sea level with three 3 mm plates (root 120 mm, tip 48
mm, span 80 mm) at the base, the term is 0.082, 0.062, 0.051 and 0.038 in
C_D at M 1.8, 2.2, 2.5 and 3.0 (X 1.65 to 1.83 at the root), its band
-8% to -7% and +22% (an illustration, not a model value of any set).

**Refused.** X above 4.5, the end of fig. 29(a)'s readings (0.5% of the
population's edges); X above 1.0 at M 3.1 to 3.2 (the term's band reaches
3.2; fig. 29(a) stops at 3.1). The laminar input, the vacuum bound and the
labels are as in 0010; the label adds "a thick layer, c/[h Re_c^(1/5)] X:
the thin-layer term times TR 1109 fig. 29(a)'s fall in base drag from 1.0".

## 3. W3(b): fins of varying chord

With an unswept trailing edge (clipped deltas), the edge is a straight
line in the base plane whose chord, and so whose X and laminar Reynolds
number, varies along the span. The term is integrated along the span by
Gauss-Legendre (32 points) with the local chord c(y), thickness h(y) and
X(y): a flat plate's h is the same at every station; a section in chord
units has h proportional to the chord. Each band end is the integral of
its own end (K_low, K_high station by station). The vacuum bound is on the
whole edge's area.

**Transition states.** A transition Reynolds number Re_T leaves laminar at
its trailing edge the stations whose chord Reynolds number it reaches, a
single interval of the span since c(y) is linear. That interval's laminar
change (TR 1109 fig. 29 at each station's own c/h and Re_c, as 0010
section 5.1 takes it) is integrated over the interval alone (Gauss-Legendre,
64 points), so a state can leave the tip laminar and the root turbulent.
`src/total` takes each state's change as it took the constant-chord one.

**Accuracy.** Against 20000 midpoint strips: the term and both band ends
within 1e-5, the laminar changes within 1e-4 (`fin-trailing-edge-thick.test.ts`).

## 4. W4(a) and W4(b): rounded leading edges on flat plates

A flat plate with a rounded edge (a full radius, half its thickness) is the
present rounded wedge's limit at face angle zero: its nose is the front
half of a cylinder, exactly what TN 2960 measured, and the term is (2/3)
Cp_pitot (2r) per unit span, the same at every station whatever the chord.
On a plate this is the whole of the edge's pressure drag: the faces are
parallel to the stream, so the overexpansion behind the shoulder and the
recompression along them act normal to it and carry none. At the
supersonic normal Mach numbers served, the flow past the cylinder's sonic
point (about 45 to 55 deg) is supersonic, so the cylinder's front half and
the plate's nose see the same inviscid flow up to the shoulder; what the
cylinder's wake changes lies behind 90 deg. The term is still labelled
"an analogy, not a measurement": no source measures a fin's edge.

**Band: 0.99 to 1.06, unchanged**, the envelope of TN 2960 fig. 5(c)'s two
readings. The figures read for this record agree with it: fig. 5(e)'s M
1.49 and 2.90 curves give 0.994 and 1.049 of modified Newtonian, fig.
5(d)'s three Reynolds numbers at M 1.98 (1.3e5, 5.5e5, 13.2e5) give 1.035,
1.035 and 1.056 with no trend (`rounded-leading-edge-plates.test.ts`).

## 5. W4(c): swept rounded leading edges

**Method.** The independence principle: the front side at the normal Mach
number M_n = M cos(sweep) on the normal dynamic pressure q cos^2(sweep),

    D / (q s) = Cp_pitot(M_n) cos^2(sweep) r 2 (cos(delta) - cos^3(delta) / 3)

per unit span (the streamwise component of the normal force per unit edge
length, over the edge length per unit span). It is exact for the inviscid
flow past an infinite swept cylinder. The domain and regime (TN 2960's
Mach and Reynolds numbers, RM A55H31's statement, the +-3% allowance) are
decided on M_n and on the Reynolds number's normal component.

**Its error, on yawed cylinders** (`fin_edges_w34.md` section 3). RM A55H31
fig. 12 plots the front side's pressure drag, yawed over unyawed, for its
own tests (M 3.9) and Penland's (M 6.9, its reference 1), on absolute
pressures as its eq. (14) is (table II integrated both ways shows it).
Converted exactly to gauge pressure, (R P I_g - cos L) / (P I_g - 1) with P
= p_t2 / p_inf and I_g the unyawed shape integral of table II (section 16;
as first committed, through fig. 11's stagnation ratio, an approximation),
and divided by the model's ratio, cos^3(L) Cp_pitot(M cos L) /
Cp_pitot(M), each point gives r, measured over modelled relative to the
unyawed cylinder, at the test's yaw as the reports state it (section 18;
fig. 12 draws its symbols up to 0.25 deg below it; the second reading,
section 14; the third looks, section 16):

| Source, stated yaw | M_n  | r, first | r, second (third look) | Used                                                                                                                       |
| ------------------ | ---- | -------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| RM A55H31, 30 deg  | 3.38 | 1.069    | 1.072                  | yes                                                                                                                        |
| RM A55H31, 45 deg  | 2.76 | 1.128    | 1.129 (1.128)          | in the measured allowance, no: R 2.1e3, three-dimensional flow suspected (p. 14); in the served one, yes (sections 16, 18) |
| RM A55H31, 60 deg  | 1.95 | 1.263    | 1.210 (1.217)          | the same; the first reading's ratio misread (sections 16, 18)                                                              |
| Penland, 14.3 deg  | 6.65 | 0.996    | 0.995                  | yes                                                                                                                        |
| Penland, 29.6 deg  | 5.96 | 1.007    | 1.012                  | yes                                                                                                                        |
| Penland, 45.1 deg  | 4.84 | 1.030    | 1.034                  | yes                                                                                                                        |
| Penland, 59.8 deg  | 3.45 | 0.987    | 1.010                  | yes                                                                                                                        |
| Penland, 75.1 deg  | 1.76 | 1.170    | 1.013                  | no: an end effect (TN 3861 p. 10), and beyond 60 deg                                                                       |

The points set apart are set apart by the reports' own statements, made
before any of this, not by their values. Over those used, r is 0.987 to
1.072, so **the measured sweep allowance is 0.98 to 1.08** (rounded
outward; as first committed, on one reading, the approximate conversion
and the yaws as drawn, 0.99 to 1.07), at M_n 3.38 to 6.65. Every swept
edge served is at M_n 3.0 or less, so the allowance served is extrapolated
in normal Mach number and contains every yawed datum at served sweeps and
normal Mach numbers, the 45 and 60 deg points among them: **0.95 to 1.22**
from 14.3 deg of sweep, the smallest yaw tested, up, tapered linearly below
it to none unswept (sections 18 and 19; at f8df436 a flat 0.95 to 1.21).
The band on a swept edge is TN 2960's times it, rounded outward to 0.001:
**0.940 to 1.294** (0.931 at M_n 1.49, section 16's local low end), and
**0.912 to 1.330** where extrapolated in Reynolds number. The allowance is the larger of the two effects the checks
cannot separate: the independence principle's own error, and the
modified-Newtonian ratio's drift from M to M_n (TN 2960: 0.995 to 1.056
over 1.49 to 2.90).

**Served to 60 deg of sweep**, the largest yaw among the points used
(59.8 deg as stated); beyond it the only point is affected by an end effect.
Penland's ratios in RM A55H31 were formed on RM L54A14, before TN 3861
corrected its 90 deg data for a local Mach-number variation (p. 7), by an
amount neither report states; TN 3861's own polar plot (fig. 5) is too
coarse at low incidence to integrate (`fin_edges_w34.md` section 4).

**Label:** the rounded edge's, with "swept S deg: the independence
principle, the front side at the normal Mach number on the normal dynamic
pressure, checked on yawed cylinders (RM A55H31 figs. 11, 12), the band
widened by L to H for it (0.95 to 1.22 from 14.3 deg, the smallest yaw
tested, tapered below it to meet the unswept band), the sweep allowance
extrapolated in normal Mach number (...)" (section 19; as first committed, "read once, the second reading
pending" and 0.99 to 1.07).
Not modelled, the analogy's gap as before: a fin's edge is not an infinite
cylinder, and the root (the body's boundary layer) and the tip are not
represented.

## 6. Refused, with the reasons

**W4(d): normal Mach numbers below 1.49.** TN 2960's front sides at
subsonic Mach numbers (figs. 5(a), 5(b), 5(e), read for this record) are
0.10 to 0.39 of the modified-Newtonian value at M 0.05 to 0.70 below the
critical Reynolds number, and change sign above it (-0.40 and -0.43, a
thrust near potential flow's -1/3 on the diameter); with the second
readings, 0.10 to 0.41 and -0.43 to -0.40 (section 13). The front half's
pressures from about 50 deg on are set by where the layer separates and by
the wake, which a plate's edge, followed by its faces, does not have: in
subsonic flow the downstream shape is felt upstream. No source among those
that set bands measures a rounded nose followed by flat faces at subsonic
speeds. Between M 0.7 and 1.49 TN 2960 has no pressure distribution (its
fig. 7's points there are a fineness-60 cylinder's total drag in free
flight), and the ratios either side (0.39 at 0.70, 0.99 at 1.49) do not
agree, so 0014's condition for bridging the gap fails. This is where most
hobby leading edges run: M_n below 1.49 in 91% to 100% of the population's
rounded edges below Mach 1.8, 36% at 1.8 to 3.0 (`out/edges.out`). It is
the next research item: band-setting data of attached, airfoil-like
rounded edges at subsonic normal Mach numbers (swept and delta wings with
subsonic leading edges, bluntness series, leading-edge thrust).
_Since section 11:_ on flat plates, M_n 1.0 to 1.49 is served; below 1.0
it stays refused, with the reasons given there.

**W3(c): swept trailing edges.** RM L52D21 fig. 11 (alpha 0, h/t = 1.0):
base drag measured over the unswept thin-layer curve at the free-stream
Mach number is 1.00, 0.98 and 0.91 on its 45 deg swept wings at M 1.41,
1.62 and 1.96 (1.10, 1.02, 1.05 unswept), so carrying the unswept term
would fit there within -9%. But the data are one sweep, stop at M 1.96,
merge X of about 0.6 to 1.9 in the h/t = 1.0 curves (sweep and layer
thickness cannot be separated), and the report calls the swept wings'
spanwise variations "very large". The independence principle does not
hold for the base (it would give 0.41 to 0.48 of vacuum at the two upper
points against 0.55 to 0.58 measured). Kept refused (T2, 7.9% of the
population); the coordinator's ruling.

**W3(d): trailing edges below Mach 1.5.** Not done: no total uses them
until the body base is served there (W2). TN 3548 (one flight, two slits at
the base's centre) appears to be RM A51J25 fig. 7's PARD set, so it would
not be independent of the curve; its fig. 6 was not read.

**W11: square-cut leading edges and rounded trailing edges, "bounded, not
measured".** 0014 section 10.2 serves a bounded number only once the
ordering of its bounds is shown, by a measurement or an argument written
before. Neither is shown:

- _Square-cut leading edges_ (lower bound: the rounded edge of the same
  thickness; upper: pitot pressure on the face). The flat face's flow is
  subsonic up to its corners, so its pressure is at least the sonic
  pressure p*, which already exceeds the half-cylinder's beyond its sonic
  point (projected height above about 0.77 r); over the inner part of the
  face nothing shown orders them, and p* on the whole face is well below
  the half-cylinder's front side (0.70 against 1.15 on the height at M
  1.98). No flat-face measurement is among the sources that set bands.
- _Rounded trailing edges_ (lower bound: no base drag; upper: the square
  edge's). The nearest measurement contradicts the upper ordering: TN
  2960's cylinder rear side (fig. 5(c), 0010's readings) is 1.35 and 1.16
  times a square base of the same height at M 1.49 and 1.98 (0.72 at
  2.90). Its flow arrives already expanded, unlike a plate's, but a
  rounded rear surface plainly can carry more base drag than a square one.

Both are refused with these reasons (`square-leading-edge`,
`rounded-trailing-edge`); the page offers the plates so that users see
them. _Since section 21 (2026-10-26; 0014 section 10.7 (aa)):_ the
square-cut edge's lower bound is the sonic pressure on the whole face,
which needs no ordering against the rounded edge; but the computed check
registered for that argument failed (section 21.3), so the edge stays
refused, with that reason. The rounded trailing edge stays refused as
above.

## 7. In the code

- `src/fins/section.ts`: `FlatPlate` (uniform thickness in the body's
  length unit, its edges rounded or square-cut), `flatPlate`,
  `isFlatPlate`.
- `src/base/fin-trailing-edge.ts`: `thickLayerFactor`,
  `THICK_LAYER_LIMIT`, `THICK_LAYER_MACH_RANGE`; the term takes
  `tipChord` and `tipThickness` and returns `thickLayer` and, on fins of
  varying chord, `laminarStates`.
- `src/fins/rounded-leading-edge.ts`: sweep (`sweepChecks`,
  `SWEEP_ALLOWANCE`, `SWEEP_LIMIT_DEGREES`), the normal-Mach refusal with
  its reasons, `tn2960FrontSides`, `stagnationPressureCoefficient`;
  `src/fins/rm-a55h31.ts` and `TN2960_FRONT_SIDES` in `src/fins/tn2960.ts`
  hold the readings.
- `src/total/finned-body.ts`: flat plates (the nose of a rounded edge on
  any planform and sweep; faces of no wave drag; the trailing edge at the
  plate's thickness; the plate's t/c at the root for the body base); blunt
  trailing edges on fins of varying chord; the refusals of section 6;
  transition states on the part of the span they reach.
- Section 11: `src/fins/macha.ts` (CR-149372's readings);
  `machaFrontSides`, `machaBlockageSpread`, `TRANSONIC_NODES`,
  `transonicFrontSide` and `SWEEP_ALLOWANCE_EXTRAPOLATED` in
  `src/fins/rounded-leading-edge.ts`;
  `tests/fins/rounded-leading-edge-transonic.test.ts`.
- Tests: `tests/base/fin-trailing-edge-thick.test.ts`,
  `tests/fins/rounded-leading-edge-plates.test.ts` (the readings held to
  their csv), `tests/total/flat-plates.test.ts`, additions to
  `tests/app/` and `tests/gpu/nose-drag-page.test.ts`. The lifted
  refusals change the expectations of existing tests where they asserted
  them (a swept rounded edge, a clipped delta's blunt trailing edge, an
  edge swept beyond 60 deg, in `tests/fins`, `tests/total`, `tests/app`
  and the page's test); the fields shown gain the radius's visibility.

**The Basic Finner is unchanged.** Its single-wedge fins and their terms
take the code paths they took: K = 1 below X 1.0, the unswept rounded
edge's arithmetic and label as before. Over all 16 shots of DREV TM 9703
(the 11 gated and the 5 reported), every component, band, input band,
transition state, label and total equals the base commit's (5245241) bit
for bit: 1116 values, largest difference 0. `tests/validation/` passes
unchanged.

## 8. Readings, and what the second readings change

| Figure                               | Readings now     | Used for                                                 |
| ------------------------------------ | ---------------- | -------------------------------------------------------- |
| TR 1109 fig. 29(a)                   | two (0010)       | W3(a)'s K and band                                       |
| RM A55H31 figs. 11, 12               | two (section 14) | W4(c)'s sweep allowance                                  |
| TN 2960 figs. 5(a), 5(b), 5(d), 5(e) | two (section 13) | checks of the band and the reasons of W4(d); set nothing |
| RM L52D21 fig. 11                    | one              | the reason W3(c) stays refused                           |
| NASA CR-149372 figs. 8b, 5           | two (section 14) | W4(e)'s kappa nodes and their spread (section 11)        |

When the second readings of RM A55H31 figs. 11 and 12 arrive they are held
beside the first in `src/fins/rm-a55h31.ts`, the allowance becomes the
envelope of r over both, and the label drops "read once". If the envelope
moves the allowance, the band moves with it; no total has tested it. The
same for CR-149372: the second readings join `MACHA_FIG8B` (and fig. 5's
points) in `src/fins/macha.ts`, each node's nominal becomes the mean and
its range the envelope of both, widened as now.

## 9. Coverage

Measured with 0014's population (2000 rockets, one condition in each Mach
band; `docs/research/refusals/`, the run 0014 quotes in `out/impact.out`,
this one in `out/impact-w34.out`, `evaluate.ts` mirroring the code; its
cross-check against `src/total` passes, now on the flat plates as well).

| Share of cases                     | M 1.0 to 1.2 | 1.2 to 1.5 | 1.5 to 1.8 | 1.8 to 3.0 | All   |
| ---------------------------------- | ------------ | ---------- | ---------- | ---------- | ----- |
| W3 needed (trailing edges), before | 52.7%        | 52.7%      | 52.7%      | 52.7%      | 52.7% |
| W3 needed, now                     | 52.7%        | 52.7%      | 8.5%       | 8.3%       | 30.6% |
| W4 needed (leading edges), before  | 43.9%        | 43.9%      | 43.9%      | 43.9%      | 43.9% |
| W4 needed, now                     | 43.9%        | 43.7%      | 40.0%      | 15.7%      | 35.8% |
| Totals once W1 is done, before     | 0%           | 0%         | 2.8%       | 2.8%       | 1.4%  |
| Totals once W1 is done, now        | 0%           | 0%         | 3.3%       | 6.0%       | 2.3%  |
| Totals today, before and now       | 0.0%         | 0.0%       | 0.2%       | 0.3%       | 0.1%  |

- From Mach 1.5, the trailing edges now block only the swept ones (7.9%)
  and a few layers beyond 4.5; below 1.5 they stay refused with the base.
- The leading edges' remaining refusals are the normal Mach numbers below
  1.49 (12.7% of cases at M 1.8 to 3.0, 37.0% at 1.5 to 1.8), sweeps beyond
  60 deg (3.0%) and Reynolds numbers outside the domain (0.7%).
- No total is added today: every case these unlock is still blocked by
  the fins at the base (W1, 96%) or the nose. With W1 done, the totals at
  M 1.8 to 3.0 would more than double (2.8% to 6.0%).
- W11 is unchanged (30.8%): both of its edges stay refused (section 6).

## 10. The page

Extended only to describe these fins, in the existing controls:

- **Before:** the Section dropdown offers "Single wedge, blunt trailing
  edge", "Double wedge (sharp)" and "Hexagonal (sharp)"; the thickness is
  labelled "Trailing-edge thickness" or "Largest thickness"; "Leading-edge
  radius (0: sharp)" is always asked.
- **After:** the same dropdown adds "Flat plate, rounded leading edge,
  square trailing edge", "Flat plate, square edges" and "Flat plate,
  rounded edges"; for a plate the thickness is labelled "Plate thickness"
  and the radius field is hidden (a rounded edge is a full radius). The
  collapsed "What the total includes" adds one sentence: "A flat plate's
  rounded edge is a full radius, half its thickness; square-cut leading
  edges and rounded trailing edges are refused (design record 0016)." No
  other control, field or text changes; the plates' refusals reach the
  page with their reasons, as every refusal does.

## 11. W4(e): flat plates at normal Mach numbers 1.0 to 1.49

The research item of section 6. Approved by the coordinator on 2026-10-20
with conditions: (a) the 1.2 to 1.49 gap bridged by the bracketing-node
band, recorded first as an amendment to 0014 W4(d) and committed before
any hold-out run; (b) the sweep allowance widened below M_n 1.49. Both
are followed below.

**What was looked for, and found.** Band-setting measurements of the
zero-lift drag or the leading-edge pressures of thin wings or fins with
rounded leading edges at normal Mach numbers below about 1.4, at
free-stream Mach 1.2 to 2. None measures a semicircular nose followed by
flat faces (a plate's rounded edge) at a subsonic normal Mach number.
Every bluntness series found is of airfoil noses:

| Source                                                                              | What it measures                                                                                                     | Why it sets no band here                                                                                                 |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| RM L53L24a (Sandahl and Stoney), 60 deg delta, free flight, M 0.8 to 1.9            | zero-lift drag, LE radius 0 to 3 times the NACA 000X-X3 section's (M_n to 0.95): "no measurable effect", CD +-0.0007 | an airfoil nose; the increment within the error                                                                          |
| NASA TP 2204 (Wood and Miller), M 1.6 to 2.36                                       | 65A004 with r/c 0 to 0.004: bluntness "does not affect the zero-lift drag"                                           | r about a tenth of the thickness at most                                                                                 |
| NASA TN D-3634 (Kyle and Feryn), 67 deg slab wing, M 1.5 to 4.63 (M_n 0.59 to 1.81) | sharp, rounded and 6x-radius extensions: bluntness raises CD_min, CD +-0.0003                                        | the blunt nose has r about 0.57 of the half-thickness, faired over four half-thicknesses; not a semicircle on flat faces |
| RM L53I23 (Ulmann and Bertram); Welsh, Wallskog and Sandahl; TR 1238 (Love)         | 0003-63 and 2-006 noses against sharp sections                                                                       | airfoil noses                                                                                                            |
| TN 4204 (Lindsey and Landrum)                                                       | flow attachment at incidence, schlieren                                                                              | no drag                                                                                                                  |
| RM L52D29 (Hopko and Sandahl), model 2                                              | a constant-thickness 60 deg delta plate                                                                              | its edges are bevelled, not rounded                                                                                      |

No yawed-cylinder pressures were found at M_n 1.0 to 1.5 either (the
lowest used in section 5 are at 3.37 and 3.44). None of the held-back
sets was opened.

**The source that sets the band: NASA CR-149372** (Macha, Texas A&M
report 3318-76-01, 1976; `fin_edges_w34.md` section 9). Cylinder pressure
distributions in the Ames 2 by 2 ft transonic tunnel at M 0.6 to 1.2, Re_d
1e5 to 1e6, on four diameters (blockage 3.1% to 8.4%). Fig. 8b gives the
front side at M 1.0, 1.1 and 1.2; fig. 5 the four blockages at M 1.0. When
the normal flow is sonic or faster, the surface flow is supersonic from
the sonic point (about 50 deg at M 1.0, Cp = Cp* = 0 there) to 90 deg, so
the body behind 90 deg (a cylinder's continued curve and wake, a plate's
flat faces) is not felt ahead of it, except through the boundary layer:
the cylinder's front half and the plate's nose see the same flow, the
argument of section 4 carried down to M_n 1.0. Fig. 5 shows it: the four
cylinders' front sides coincide from 44 to about 78 deg while their
separation and aft pressures move with blockage. Below M_n 1.0 the
argument fails: the normal flow is subsonic and the faces are felt at the
nose.

**Method.** On a flat plate at 1.0 <= M_n < 1.49 the term of sections 4
and 5 times kappa(M_n), the cylinder's front side over modified Newtonian:

    D / (q s) = kappa(M_n) (2/3) Cp_pitot(M_n) cos^2(sweep) 2r

per unit span. Kappa's nodes (first reading; trapezoid rule over symbols
and faired curve, 0 to 90 deg):

| M_n  | kappa              | Range          | From                                                                                 |
| ---- | ------------------ | -------------- | ------------------------------------------------------------------------------------ |
| 1.0  | 0.762              | 0.751 to 0.770 | CR-149372 fig. 8b                                                                    |
| 1.1  | 0.831              | 0.818 to 0.839 | CR-149372 fig. 8b                                                                    |
| 1.2  | 0.897              | 0.883 to 0.906 | CR-149372 fig. 8b                                                                    |
| 1.49 | 1 (the term above) | 0.99 to 1.06   | TN 2960's band (its readings at 1.49: 0.994 to 1.002; 0.98 to 1.06 since section 16) |

Each CR-149372 node's range is its readings' lowest and highest widened by
a 1% reading error (the calibration's +-1 px moves the front side by 0.5%
in angle and 0.2% in Cp, rounded up) and by fig. 5's spread at M 1.0,
-0.56% to 0% (another run of the same model at Re_d 2.8e5 against 1.9e5,
and the larger blockages), applied at all three. Kappa is nominal linear
in M_n between the nodes. **Band:** at a node, its range; between two
nodes, from the lower node's lowest to the upper node's highest, over the
nominal. It rests on kappa rising at every pair of nodes (0.762, 0.831,
0.897, then TN 2960's 0.994 to 1.002 at 1.49, 1.035 to 1.056 at 1.98,
1.049 to 1.056 at 2.90) and on its physical approach to modified
Newtonian as the normal Mach number rises, the same rule as section 2's K.
On the term:

| M_n                   | Nominal kappa       | Band (unswept, measured Reynolds number) |
| --------------------- | ------------------- | ---------------------------------------- |
| 1.0, 1.1, 1.2 (nodes) | 0.762, 0.831, 0.897 | 0.985 to 1.010                           |
| 1.05                  | 0.796               | 0.942 to 1.053                           |
| 1.15                  | 0.864               | 0.947 to 1.049                           |
| 1.3                   | 0.932               | 0.947 to 1.137                           |
| 1.45                  | 0.986               | 0.896 to 1.075                           |

**Across 1.2 to 1.49 nothing is measured.** The ratios either side (0.90,
0.99) do not agree, so 0014 W4(d)'s condition for a bridge fails; the gap
is bridged by the bracketing-node band instead, by the amendment to 0014
W4(d) committed before this section, and the term there is labelled "an
analogy, interpolated across an unmeasured Mach range". From 1.0 to 1.2
it is "an analogy, not a measurement", like the term above.

**Reynolds number**, on the normal component, as above: 1e5 to 1e6
"measured" (TN 2960 shows no Reynolds-number effect on front sides at M
1.49 and 1.98 over 1.3e5 to 1.3e6; CR-149372's fig. 11 shows none on the
aft pressures at M 1.2 between 1.2e5 and 2.5e5, its fig. 12 none of
roughness at M 1.0 and above, and its fig. 5 run at 2.8e5 is inside the
spread); 6.7e3 to 1e5 "extrapolated in Reynolds number", +-3% of the term;
outside, refused.

**Sweep.** The independence principle as in section 5, at the normal
Mach number. Its checks reach down to M_n 3.37 only, so the allowance is
extrapolated in normal Mach number, labelled "the sweep allowance
extrapolated in normal Mach number". As first committed here, below 1.49
only, widened to twice its measured deviation from 1 (0.98 to 1.14); since
section 16, on every swept edge served (all are below 3.37), **0.95 to
1.21**. (At M_n just above 1 the bow shock stands far off a cylinder, so
the root and the tip reach further along a finite edge; that is the
analogy's gap of section 5, not represented.) The hobby example's fins
(three 3 mm plates, root 120 mm, tip 48 mm, span 80 mm, 42 deg, on a 54 mm
body at sea level), refused at M 1.8 before, give 0.161 (0.137 to 0.225)
at M 1.8 (M_n 1.34) and 0.131 (0.117 to 0.177) at M 1.5 (M_n 1.11), both
extrapolated in Reynolds number (section 16; as first committed here,
0.161 (0.141 to 0.212) and 0.131 (0.121 to 0.166)).

**Refused.** A flat plate below M_n 1.0: "below it the normal flow is
subsonic and the faces behind a rounded edge are felt at its nose, which a
cylinder's separation and wake replace (TN 2960 figs. 5(a), 5(b), 5(e)
...); no source measures a rounded nose followed by flat faces there, and
the leading-edge bluntness series at subsonic leading edges (RM L53L24a,
NASA TP 2204, NASA TN D-3634) are of airfoil noses, of radius about a
tenth of the thickness or less or faired into the section, their
increments within their errors". As first committed, rounded wedges
(0010's term, the Basic Finner's) kept the 1.49 floor, and the Basic
Finner's 16 shots were bit for bit the base commit's (1116 values); since
section 12 the wedges take this term too.

**Readings.** CR-149372 figs. 8b and 5 are read once; the round-6 reader
reads them blind. Until the second readings are held beside these, the
term's label says "read once, the second reading pending" (section 8).
(Both are read twice since section 14, and fig. 8b's M 1.2 curve from 22
to 65 deg three times since section 16; no label says "read once".)

**Coverage** (the same population and run as section 9, `out/impact-w4e.out`;
`evaluate.ts` mirrors the code, `EDGES=w4e` by default, `EDGES=w34` the
code of sections 1 to 10; its cross-check against `src/total` passes):

| Share of cases                               | M 1.0 to 1.2 | 1.2 to 1.5 | 1.5 to 1.8 | 1.8 to 3.0 | All   |
| -------------------------------------------- | ------------ | ---------- | ---------- | ---------- | ----- |
| Normal Mach refusal, sections 1 to 10 (1.49) | 40.8%        | 40.7%      | 37.0%      | 12.7%      | 32.8% |
| Normal Mach refusal, now (1.0 on a plate)    | 37.0%        | 22.8%      | 9.7%       | 0.5%       | 17.5% |
| W4 needed, sections 1 to 10                  | 43.9%        | 43.7%      | 40.0%      | 15.7%      | 35.8% |
| W4 needed, now                               | 40.1%        | 26.1%      | 13.0%      | 3.7%       | 20.7% |
| Totals once W1 is done, sections 1 to 10     | 0%           | 0%         | 3.3%       | 6.0%       | 2.3%  |
| Totals once W1 is done, now                  | 0%           | 0%         | 6.5%       | 7.2%       | 3.4%  |
| Totals today, sections 1 to 10               | 0.0%         | 0.0%       | 0.2%       | 0.3%       | 0.1%  |
| Totals today, now                            | 0.0%         | 0.0%       | 0.3%       | 0.5%       | 0.2%  |

The leading edges now block a case mostly below Mach 1.5 (where the base
and the trailing edges are refused anyway); from Mach 1.5 they block 13.0%
and 3.7%, the rest being sweeps beyond 60 deg (3.0%) and Reynolds numbers
outside the domain. With W1 done, the totals at M 1.5 to 1.8 would double
again (3.3% to 6.5%).

**The page.** Before (section 10): the collapsed "What the total
includes" says "A flat plate's rounded edge is a full radius, half its
thickness; square-cut leading edges and rounded trailing edges are
refused (design record 0016)." After (with section 12): "A flat plate's
rounded edge is a full radius, half its thickness; a rounded edge is
served where the Mach number normal to it, M cos(sweep), is 1.0 or more;
square-cut leading edges and rounded trailing edges are refused (design
record 0016)." No
control, field or other text changes; the term's label and the refusal's
reason reach the page as every component's do.

## 12. W4(e) on rounded wedges

A follow-up approved by the coordinator on 2026-10-20, with conditions:
the Basic Finner's 11 gated shots stay bit for bit; its five reported
shots at M 1.06 to 1.33 may change only their refusal reasons, not become
served.

**Method.** 0010's rounded wedge takes section 11's term: its nose up to
the tangent points, Cp_pitot(M_n) cos^2(sweep) r 2 (cos(delta) -
cos^3(delta) / 3) per unit span, times kappa(M_n) on the same nodes, with
the same band, sweep allowance and labels as a plate. The argument is
section 11's: with the normal flow sonic or faster, the surface flow is
supersonic from the sonic point to the tangent points (90 deg - delta, 88
deg on the Basic Finner), so the faces behind them are not felt ahead of
them. Below M_n 1.0 a wedge is refused with the plate's reasons. The
`plate` input of section 11 is gone: the domain no longer depends on the
section.

**The Basic Finner.** The 11 gated shots (M 1.80 to 2.97, unswept, M_n
at least 1.8) are bit for bit the base commit's (5245241): 693 values,
largest difference 0. The five reported shots stay refused; their reasons:

| Shot       | M     | Before                                                                                                             | Now                                                                                |
| ---------- | ----- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| DA95022010 | 1.056 | leading edges (normal Mach below 1.49), fin wave drag (detached shock), body base, trailing-edge base (Mach range) | leading edges (Re_D 5.59e3, below 6.7e3), the other three as before                |
| DA95022219 | 1.058 | as above                                                                                                           | leading edges (Re_D 5.63e3), the other three as before                             |
| DA95022230 | 1.116 | as above                                                                                                           | leading edges (Re_D 5.94e3), the other three as before                             |
| DA95030613 | 1.254 | leading edges (normal Mach), body base, trailing-edge base                                                         | leading edges (Re_D 6.69e3), body base, trailing-edge base                         |
| DA95022009 | 1.332 | as at 1.254                                                                                                        | body base, trailing-edge base; the leading edges served, 0.0375 (0.0340 to 0.0433) |

(The high-yaw shot at M 1.377, not reported, is like the 1.332 one.) The
reported shots' tests in `tests/validation/basic-finner.test.ts` and
`tests/app/total-drag.test.ts` now assert these reasons; nothing else in
`tests/validation/` changes.

**Coverage.** No gain: the population's rounded edges are all on flat
plates (its bevelled and double-wedge sections are sharp), and the re-run
(`OUT_NAME=impact-w4e-wedges`) reproduces `out/impact-w4e.out` line for
line, so it is not kept. The gain is for wedge fins with rounded edges
entered on the page (the "Single wedge, blunt trailing edge" section with
a radius) at M_n 1.0 to 1.49.

## 13. The second readings of TN 2960 (audit round 6)

The independent reader's blind second readings of TN 2960 figs. 5(a) to
5(e), 6 and 7 (commit 402c412 on the reader's branch,
`docs/research/total-drag/audit/round6/readings/tn2960_*.csv` and
`method_tn2960_figs5-7.md`), paired with this record's first readings of
figs. 5(a), 5(b), 5(d) and 5(e) by
`docs/research/total-drag/scripts/w34_pair_tn2960.py`; the reader's
branch was read with `git show`, not changed.

**Method.** Like against like: where the first reading is of a faired
curve and the second read that curve, the second's curve points; where
the first read symbols (fig. 5(d)'s Reynolds numbers), the second's
symbols, either side; fig. 5(e), where the second read only the symbols
of curves the first read, the symbols, which then carry the data's own
scatter about the fairing. Each point at 0 to 90 deg against the first
reading interpolated there, with the combined reading error: both
readings' stated errors in P plus the local slope times both readings'
errors in angle (0.5 deg on the first, the second's stated x error). The
second reading's front side is the first's plus the integral of the
difference, interpolated between the second's points, so that its gaps
(up to 20 deg where the ink is crowded or dashed) take the first
reading's curvature rather than a chord.

| Set                             | Second's points  | Mean difference | Largest          | Combined error | Within it | Front over (2/3) Cp_0, first | Second | Envelope            |
| ------------------------------- | ---------------- | --------------- | ---------------- | -------------- | --------- | ---------------------------- | ------ | ------------------- |
| 5(a) circles, M 0.05, R 3.14e5  | 5 (5 to 65 deg)  | -0.004          | -0.025 at 15 deg | 0.046          | 5 of 5    | 0.102                        | 0.100  | 0.100 to 0.102      |
| 5(a) squares, M 0.065, R 4.26e5 | 3 (65 to 85 deg) | +0.030          | +0.063 at 75 deg | 0.048          | 2 of 3    | -0.434                       | -0.402 | -0.434 to -0.402    |
| 5(b) M 0.7                      | 7 (5 to 85 deg)  | +0.010          | +0.022 at 75 deg | 0.034          | 7 of 7    | 0.395                        | 0.410  | 0.395 to 0.410      |
| 5(b) M 0.6                      | 6 (5 to 85 deg)  | -0.007          | -0.066 at 75 deg | 0.033          | 5 of 6    | 0.279                        | 0.290  | 0.279 to 0.290      |
| 5(b) M 0.5                      | 8 (5 to 85 deg)  | +0.007          | +0.056 at 85 deg | 0.035          | 6 of 8    | 0.184                        | 0.194  | 0.184 to 0.194      |
| 5(b) M 0.3                      | 6 (5 to 85 deg)  | -0.025          | -0.058 at 65 deg | 0.034          | 3 of 6    | 0.152                        | 0.133  | 0.133 to 0.152      |
| 5(d) faired curve, M 1.98       | 7 (5 to 85 deg)  | -0.005          | -0.058 at 75 deg | 0.034          | 4 of 7    | 1.040                        | 1.033  | 1.033 to 1.040      |
| 5(d) circles, R 13.2e5          | 16 (3 to 87 deg) | +0.007          | +0.054 at 60 deg | 0.025          | 12 of 16  | 1.035                        | 1.042  | 1.035 to 1.042      |
| 5(d) squares, R 5.5e5           | 10 (8 to 90 deg) | -0.007          | -0.087 at 45 deg | 0.023          | 6 of 10   | 1.035                        | 1.035  | 1.035               |
| 5(d) diamonds, R 1.3e5          | not read         |                 |                  |                |           | 1.056                        |        | 1.056 (one reading) |
| 5(e) M 0.06, R above critical   | 13 symbols       | -0.014          | -0.043 at 83 deg | 0.036          | 9 of 13   | -0.401                       | -0.398 | -0.401 to -0.398    |
| 5(e) M 0.70                     | 9 symbols        | -0.004          | -0.044 at 70 deg | 0.037          | 8 of 9    | 0.392                        | 0.391  | 0.391 to 0.392      |
| 5(e) M 1.49                     | 7 symbols        | -0.015          | -0.039 at 60 deg | 0.032          | 6 of 7    | 0.994                        | 0.982  | 0.982 to 0.994      |
| 5(e) M 2.90                     | 7 symbols        | -0.021          | -0.049 at 85 deg | 0.031          | 5 of 7    | 1.049                        | 1.037  | 1.037 to 1.049      |

The mean differences, -0.025 to +0.030, are inside the combined error in
every set; 78 of 104 points lie within it. Most of the points outside it are in the
steepest stretches (45 to 85 deg, where the slope is up to 0.05 per deg)
and, in fig. 5(e), are symbols against a fairing. Fig. 5(a)'s squares
were read by the second reader only from 65 deg (the curve is under the
symbols ahead of it), so their second front side rests on three points.

**What changes.**

- These sets set no band: they are checks of the band and the reasons
  of W4(d). The reasons' ranges become the envelope of both readings: 0.10
  to 0.41 of modified Newtonian below the critical Reynolds number (was
  0.10 to 0.39), -0.43 to -0.40 above it. The refusal text says "both
  readings: 0.10 to 0.41". The held second readings are
  `TN2960_FRONT_SIDES_SECOND` in `src/fins/tn2960.ts`, and
  `tests/fins/rounded-leading-edge-plates.test.ts` checks the envelopes.
- The supersonic checks: fig. 5(d)'s lie inside the band 0.99 to 1.06 on
  both readings. Fig. 5(e)'s M 1.49 symbols give 0.982, 0.8% below the
  band's low end: the second read only the symbols, which sit 0.015 below
  the fairing on average (the data's scatter, not a disagreement of the
  readers); the first reading's fairing gives 0.994. The band is set on
  fig. 5(c)'s faired curves, not on 5(e), and is not moved by this check.
- Fig. 5(c), which sets the band (0010, read twice: 0.995 to 1.056), the
  reader read a third time. Paired the same way, curve against curve, with
  0010's first reading: 1.023 at M 1.49, 1.043 at 1.98, 1.049 at 2.90,
  inside 0.99 to 1.06. **The band stands, 0.99 to 1.06**, and with it
  every term on it: the Basic Finner's, the plates' and W4(e)'s node at
  1.49. (Its M 2.90 curve has no ink from 40 to 95 deg; the paired value
  rests on 5 to 40 deg.) The third reading is not added to
  `src/fins/tn2960.ts`, whose two readings 0010 holds.
- Figs. 6 and 7: no term of this record uses them (fig. 7 is 0010's, read
  twice), so they are not paired here.
- No label changes: no TN 2960 term carried "read once". The terms still
  marked "read once" are those on RM A55H31 figs. 11 and 12 and NASA
  CR-149372 figs. 8b and 5, next in the reader's queue.

## 14. The second readings of RM A55H31 and CR-149372 (audit round 6)

The independent reader's blind second readings: RM A55H31 figs. 11 and 12
(commit 6e6d9be, all 17 symbols, ratio error 0.001 to 0.002; the theory
curves not read) and NASA CR-149372 figs. 8b and 5 (commit fc66a2f), on the
reader's branch, read with `git show` and not merged; paired by
`docs/research/total-drag/scripts/w34_pair_round6.py` and held beside the
first readings in `src/fins/rm-a55h31.ts` and `src/fins/macha.ts`. By 0014
section 10's rule each band is the envelope of both readings, and a pair
that disagrees beyond the combined reading error is named and either
resolved by a third look at the scan or left out of the band.

### RM A55H31 (the sweep allowance)

Combined reading error: 0.004 in the ratio and 0.2 deg in yaw on the first
reading, the reader's stated errors (0.0009 to 0.0019, and 0.04 to 0.09
deg) on the second. Yaw and value as read (fig. 12, fig. 11), and r:

| Point                      | Fig. 12, first | Second       | Fig. 11, first | Second       | r, first | r, second | Verdict                                                              |
| -------------------------- | -------------- | ------------ | -------------- | ------------ | -------- | --------- | -------------------------------------------------------------------- |
| M 3.9, 30 deg              | 30.1, 0.700    | 29.91, 0.702 | 30, 0.769      | 30.03, 0.770 | 1.067    | 1.064     | agree                                                                |
| M 3.9, 45 deg (set apart)  | 45.1, 0.410    | 44.75, 0.410 | 45, 0.530      | 44.81, 0.534 | 1.120    | 1.101     | yaw 0.35 apart; set apart by the report anyway                       |
| M 3.9, 60 deg (set apart)  | 60.1, 0.170    | 59.78, 0.164 | 60, 0.295      | 60.04, 0.303 | 1.226    | 1.158     | yaw and fig. 11 apart; set apart anyway                              |
| M 6.86, 14 deg             | 14.4, 0.907    | 14.15, 0.906 | 14.3, 0.972    | 14.44, 0.972 | 0.998    | 0.994     | agree                                                                |
| M 6.86, 30 deg             | 29.6, 0.665    | 29.38, 0.668 | 29.6, 0.750    | 30.05, 0.756 | 1.007    | 1.004     | fig. 11 apart (yaw 0.45, value 0.006): left out, no change           |
| M 6.86, 45 deg             | 45.2, 0.367    | 44.89, 0.368 | 45.1, 0.500    | 44.87, 0.507 | 1.034    | 1.021     | yaw 0.31 apart, fig. 11 0.007: left out, no change                   |
| M 6.86, 60 deg             | 59.9, 0.131    | 59.56, 0.134 | 59.8, 0.246    | 60.00, 0.252 | 0.990    | 0.983     | yaw 0.34 apart: third look 59.75 deg, 0.134, between them; both kept |
| M 6.86, 75 deg (set apart) | 75.5, 0.023    | 75.06, 0.021 | 75.2, 0.046    | 74.75, 0.057 | 0.866    | 0.839     | set apart anyway                                                     |

The first reading's yaws run 0.2 to 0.4 deg above the second's on fig. 12
(its grid is uniform to 0.06 deg, so the difference is in placing the
symbols). The model is sensitive to yaw (cos^3: 2.7% per 0.3 deg at 60
deg), so the pair at 60 deg, M 6.86, which sets the allowance's low end,
was looked at a third time on a 3x crop between the figure's own grid
lines: 59.75 deg, 0.134, between the readings, so both are kept and their
envelope brackets it. The present tests' 30 deg point, which sets the high
end, agrees (third look: 30.0 deg, 0.701). The pairs at 30 and 45 deg, M
6.86, are left out of the band; the allowance without them is the same,
their r lying inside the others' envelope. The theory curves feed nothing.

**The allowance: 0.98 to 1.07** (was 0.99 to 1.07), the envelope of r over
both readings' points the reports do not set apart, rounded outward. The
swept band above M_n 1.49 is **0.97 to 1.14** (was 0.98 to 1.14), and
**0.94 to 1.17** extrapolated in Reynolds number (was 0.95 to 1.17); below
M_n 1.49 the extrapolated allowance, twice the deviation from 1, is **0.96
to 1.14** (was 0.98 to 1.14). The label drops "read once".

### CR-149372 (kappa)

**Fig. 8b.** Each second-reading point at 0 to 90 deg against the first
reading interpolated there; combined error: 0.005 in Cp on the first, the
reader's err_y, plus the local slope times 0.3 deg and the reader's x
error (0.1 deg on its curve reads).

| M   | Points used | Mean difference | Combined error | Left out                                                                     | kappa, first | Second | Node: nominal, range  |
| --- | ----------- | --------------- | -------------- | ---------------------------------------------------------------------------- | ------------ | ------ | --------------------- |
| 1.0 | 28          | +0.003          | 0.016          | 54.2 deg (+0.053); a stray at 86.5 deg, Cp -0.08                             | 0.762        | 0.765  | 0.764, 0.751 to 0.772 |
| 1.1 | 25          | 0.000           | 0.016          | 3.4, 39.1, 41.3, 50.0, 53.5 deg (up to 0.059; symbols in the crowded middle) | 0.831        | 0.831  | 0.831, 0.818 to 0.839 |
| 1.2 | 15          | +0.002          | 0.013          | the curve at 25 to 60 deg and a "triangle" at 30.7 deg (below)               | 0.897        | 0.896  | 0.896, 0.882 to 0.906 |

The second reading's M 1.2 curve between 25 and 60 deg lies up to 0.10
below the first's and equals its own M 1.1 curve at 30 and 35 deg (0.911
against 0.908, 0.770 against 0.770): its path runs through a triangle it
found at 30.7 deg, Cp 0.890, which lies on the M 1.1 line. A third look on
a 1.6x crop shows three distinct lines there, the triangle at about 34
deg, 0.91, on the third (as the first reading has it), and none at 30.7
deg; those points are left out, so between 22 and 65 deg the second
reading's M 1.2 front side rests on the first's curve. The second front
sides are formed as in section 13, by the difference from the first.

**Fig. 5.** The reader names the symbols below 88 deg by shape, marked
uncertain. Where the four curves coincide (44 to 78 deg) the name does not
matter, so they are used as the shared curve, less the "60" axis label
read as symbols (59.6, 59.8 and 64.3 deg, near Cp 0) and one point at 69.7
deg outside the combined error. Where the curves part (78 to 88 deg) a
wrong name would put a point on the wrong cylinder, so they are excluded:
the first reading's branch points stand alone there. Above 88 deg the
reader names them by plateau; within 90 deg, the 2.54 cm square at 89.1 deg
(0.009 from the first) and the 3.81 cm circle at 89.7 deg (0.012). Values
below Cp -0.8 lie below the last gridline in both readings and are
extrapolated on its uniform spacing; they are kept, since a 2% scale error
there moves a front side by under 0.01%. The spread on the second reading
is -0.56%, -0.46% and -0.14% (first: -0.56%, -0.43%, -0.12%); the nodes take
-0.56% to 0%.

**The nodes**: nominal the mean of both readings, range their lowest and
highest widened by the 1% reading error and the spread. The band on the
term (unswept, measured Reynolds number):

| M_n  | Nominal kappa | Band, both readings | First reading alone (section 11) |
| ---- | ------------- | ------------------- | -------------------------------- |
| 1.0  | 0.764         | 0.983 to 1.012      | 0.985 to 1.010                   |
| 1.05 | 0.797         | 0.942 to 1.053      | 0.942 to 1.053                   |
| 1.1  | 0.831         | 0.984 to 1.010      | 0.985 to 1.010                   |
| 1.15 | 0.864         | 0.947 to 1.049      | 0.947 to 1.049                   |
| 1.2  | 0.896         | 0.984 to 1.010      | 0.985 to 1.010                   |
| 1.3  | 0.932         | 0.946 to 1.137      | 0.947 to 1.137                   |
| 1.45 | 0.986         | 0.895 to 1.075      | 0.896 to 1.075                   |

The label drops "read once" (from 1.2 to 1.49 it is still "an analogy,
interpolated across an unmeasured Mach range").

### What the pairing changed in the claims

- The term above M_n 1.49 on a swept edge: 0.97 to 1.14 (0.94 to 1.17
  extrapolated in Reynolds number). Unswept edges, the Basic Finner's
  among them, are unchanged.
- W4(e): kappa's nominal moves by at most 0.15% (at M_n 1.0) and its
  bands by 0.001 to 0.002; swept, below M_n 1.49, the allowance is 0.96 to
  1.14. The hobby example's leading edges: 0.131 (0.118 to 0.166) at M
  1.5, 0.161 (0.138 to 0.212) at M 1.8, 0.183 (0.177 to 0.208) at M 2.2.
- No refusal moves, so the coverage of section 11 stands (the run after
  merging main is in section 15).
- Nothing among the figures this record uses is read once any more,
  except fig. 5(d)'s R 1.3e5 diamonds (a check of the band, which the
  reader did not read).

## 15. Merged with the main line (68ae3ee)

The main line's narrowing of the Basic Finner class to Mach 1.799 to 2.15
(68ae3ee) is merged in; the page's explanation keeps both sentences (the
class's range, and where a rounded edge is served). Nothing in this
record's terms depends on the class. After the merge the population run
reproduces `out/impact-w4e.out` and `.json` exactly: the second readings
moved bands, not refusals, so the coverage of section 11 stands (W4 needed
in 20.7% of cases; totals once W1 is done 3.4%; totals today 0.2%).

## 16. The review of 2026-10-21

The coordinator's review named four items to fix before the merge and a
list of smaller ones. What each became:

### Item 1: the sweep allowance on the swept edges served

**(a) Why RM A55H31 sets its own 45 and 60 deg tests apart.** The report,
p. 14 (and again p. 17): "The pressure distribution over the cylinder
measured at 45 deg and 60 deg of yaw in the present tests departed from
that reported in reference 1 for azimuth angles greater than about 45 deg.
It is suspected that this departure is brought about by the fact that the
flow over the cylinder was becoming three-dimensional due to the
1-inch-diameter model in the 3-inch-diameter stream" (the departure is
fig. 10's). Its other doubt, p. 18, is about heat transfer at 60 deg (air
bubbles under the measuring plug, shorts in its heater wires), not the
pressure orifices; and the 45 deg run is at R 2.1e3 (table II), below the
6.7e3 of p. 13's statement. The suspicion is not tested in the report, and
the effect it names, a yawed model only a few diameters long in the
stream, is a finite-length effect that a fin's edge, with a root and a
tip, may share. So the reason does not hold for this use: the two are data
at served conditions (sweep 45 and 60 deg, M_n 2.77 and 1.96), and the
allowance served must contain them.

Their two readings disagree beyond the combined error (yaw 0.35 and 0.32
deg apart, the 60 deg ratio 0.006 apart), and at 60 deg r moves 0.126 per
degree of yaw (corrected in section 18; this section first said about 0.3), so each ring was looked at a third time, by a circle
fit on the deskewed scan (`fin_edges_w34.md` section 3): 44.76 deg, 0.410
and 59.83 deg, 0.165, within 0.05 deg and 0.001 of the second reading's
44.75, 0.410 and 59.78, 0.164. The first reading's two are misread (its
yaws run high, as section 14 found) and are set aside by 0014 section 10
(`RM_A55H31_FIG12_THIRD_LOOK`). r is 1.113 and 1.195 at the third looks,
1.113 and 1.183 on the second reading (the first's, set aside, 1.134 and
1.277). (Section 18: at the yaws the reports state, 1.128 and 1.217 at the
third looks, 1.129 and 1.210 on the second reading.)

**(b) TN 3861 figs. 15 and 16, both readings** (with fig. 17, which the
drag needs, read once; `fin_edges_w34.md` section 4). The first reading was
made and recorded before the blind second (audit round 7, commit e45e0d6)
was opened. Paired, fig. 15's ordinates disagreed by 0.012 to 0.025: the
scans are rotated or sheared by 0.4 to 0.8 deg, which the first reading's
axis-aligned calibrations ignored. Re-mapped through affine calibrations
fitted to every grid line detected on the scans, all 13 paired ordinates
agree within the combined error (largest 0.0097 against 0.0134). Six
abscissae still differ by 0.025 to 0.050; where the report states the
condition (Penland's alpha 30.2 deg, M_c 3.451; Lord and Ulmann's 15 deg,
M_c 1.04; TN 2960's M 2.90) the second reading is the closer, so the
first's are misread there; elsewhere both are carried (M_c moves the
reference Cp_pitot by under 0.3%).

What the pair shows:

- Fig. 15 is the stagnation pressure and fig. 16 the downstream-side
  pressure, against the crossflow Mach number; neither is the front side's
  drag. An estimate needs fig. 17's drag and the assumption that the
  downstream pressure holds over the rear half, F = C_D + Cp_down. On TN
  2960's own cylinders as replotted there it is off by up to 0.086 of the
  modified-Newtonian front side (1.126 at M 1.98, where TN 2960's
  integrated front side gives 1.040).
- Below M_c 3.37 the crossflow symbols are Penland's at alpha 14.9 deg (M_c
  1.76, sweep 75 deg), flagged by TN 3861 itself as an end effect, and Lord
  and Ulmann's unpublished M 4.04 points at alpha about 10, 15, 20 and 30
  deg (sweeps 80, 75, 70 and 60 deg; the 15 deg one flagged high, p. 11).
  Only the last is at a served sweep. Penland's 30.2 deg point is at M_c
  3.45: RM A55H31's reference-1 point at 59.9 deg, the same test.
- At that one point F over modified Newtonian is 1.121 and 1.122 (first and
  second reading of fig. 16): 1.078 and 1.079 of TN 2960's integrated front
  side at M 1.98, 0.995 and 0.998 of TN 2960's own F there (the same
  estimate both sides). Its stagnation pressure is 1.095 and 1.086 of
  Rayleigh's, as RM A55H31's 60 deg tests (1.10 and 1.13).

**Do the yawed points cover the served range?** No. At served sweeps (to
60 deg) and normal Mach numbers (1.0 to 3.0) the yawed data are three
points, all at sweeps of 45 to 61 deg and M_n 1.96 to 2.77: RM A55H31's 45
and 60 deg tests (r 1.113 and 1.183 to 1.195) and Lord and Ulmann's point
(0.995 to 1.079, an estimate). Nothing yawed lies below M_n 1.96 at a served
sweep, nor below 45 deg of sweep at M_n under 3.37. Below M_n 1.96 the only
yawed points are at sweeps of 70 and 75 deg (F 1.05 to 1.17 of modified
Newtonian, 1.45 where the report flags the point), beyond the served 60.

**(c) The allowance served.** Every swept edge served is at M_n 3.0 or
less, below the checks' 3.37, so every one is labelled "the sweep
allowance extrapolated in normal Mach number". The yawed data at served
sweeps and normal Mach numbers span 0.995 to 1.195 (RM A55H31's 45 and 60
deg points on the second reading and the third looks, and TN 3861's one
estimate); widened by twice the measured allowance's deviation from 1
(0.96 to 1.16) they set 0.96 to 1.20. The allowance is kept at the interim
floor that contains them, **0.95 to 1.21** (`SWEEP_ALLOWANCE_SERVED`),
since the points do not cover the range it serves. Kept, the misread
first-reading point would have made it 1.28. The label: "the band widened
by 0.95 to 1.21 for it, the sweep allowance extrapolated in normal Mach
number (checked at M_n 3.37 to 6.65; widened to contain RM A55H31's own
tests at 45 and 60 deg, M_n 1.96 to 2.77, and TN 3861's crossflow points;
no yawed datum below M_n 1.96 at a served sweep)". (Section 18 evaluates
r at the tests' stated yaws: the data span 0.995 to 1.217, the allowance
is 0.95 to 1.22, held from 14.3 deg up (section 19), and the label's M_n
is 1.95 to 2.76.)

**The coordinator's decision (2026-10-21): served.** Swept edges below M_n
1.95 (1.96 as first written, section 18), where no yawed datum lies at a
served sweep, are served, not refused, with the band that contains every
yawed datum (0.95 to 1.21 then; 0.95 to 1.22 from 14.3 deg, since sections
18 and 19) and the label above, under the owner's rule: serve rather than refuse wherever an honest
band can be given, and state plainly what it rests on (0014 W4, amended
2026-10-21). Refusing them would have refused the hobby example's leading
edges at M 1.5 and 1.8 again (M_n 1.11 and 1.34).

**What would replace the extrapolation:** front-side pressures (or the
front side's drag) on yawed circular cylinders or swept blunt leading
edges at M_n 1.0 to 1.96 and sweeps up to 45 deg, a free-stream Mach number
of about 1.0 to 2.8, each read twice. None opened for this record holds
them. Searched and not in range: Bursnall and Loftin, NACA TN 2463 (yawed
cylinder, M_n under 0.2); Sawyer and Daum, NACA wing-flow tests (NTRS
19930085324: a 45 deg swept cylinder at M 0.7 to 1.2, rear pressures,
M_n under 0.85); Pepper, free flight to M 1.4 (NTRS 19930087226: a 45 deg
blunt-edged wing, M_n under 1.0); Kyle and Feryn (NTRS 19660028010: 67 deg
of sweep). Candidates to open, not read here: O'Neal, free flight of
cylindrically blunted wedges swept 36.75 and 45 deg at M 1.78 to 2.99 (NTRS
19980227361; M_n about 1.26 to 2.4; heat transfer, whether it holds
pressures is not known until opened); Holdaway, Lazzeroni and Hatfield, a
45 deg swept wing with blunted leading edges to M 2.20 (NTRS 19980223578;
M_n up to 1.56; wing-body drag increments, a check at most, not a front
side).

### Item 2: fig. 12 converted exactly

Eq. (14)'s R is cos L times the ratio of the absolute front-side
integrals; with the unyawed absolute integral P I_g on p_inf (P = p_t2 /
p_inf, I_g = 0.721 from table II), the gauge ratio is exactly (R P I_g -
cos L) / (P I_g - 1). Applied to table II's own absolute ratio it returns
table II's gauge ratio (a test holds it). r, measured over modelled:

| Point                      | M_n  | r, first | r, second | Third look | Use                                    |
| -------------------------- | ---- | -------- | --------- | ---------- | -------------------------------------- |
| M 3.9, 30 deg              | 3.37 | 1.072    | 1.069     | 1.069      | measured allowance (its high end)      |
| M 3.9, 45 deg              | 2.77 | 1.134    | 1.113     | 1.113      | served allowance; the first misread    |
| M 3.9, 60 deg              | 1.96 | 1.277    | 1.183     | 1.195      | served allowance; the first misread    |
| M 6.86, 14 deg             | 6.64 | 0.997    | 0.993     |            | measured allowance                     |
| M 6.86, 30 deg             | 5.96 | 1.007    | 1.005     |            | measured allowance                     |
| M 6.86, 45 deg             | 4.83 | 1.036    | 1.022     |            | measured allowance                     |
| M 6.86, 60 deg             | 3.44 | 0.996    | 0.988     | 1.007      | measured allowance (its low end)       |
| M 6.86, 75 deg (set apart) | 1.72 | 1.287    | 1.004     |            | none: an end effect, and beyond 60 deg |

**The measured allowance: 0.98 to 1.08** (section 14: 0.98 to 1.07), at
M_n 3.37 to 6.65. (Section 14's third look at M 6.86, 60 deg, 59.75 deg and
0.134, lies between the readings in yaw but not in r: 1.007 against 0.988
and 0.996, inside the allowance either way; the low end stays the second
reading's.) The swept bands the review expected from it (0.97 to
1.15, 0.94 to 1.18, 0.96 to 1.16) are superseded by item 1: above M_n 1.49
a swept edge's band is **0.94 to 1.29** (0.93 at M_n 1.49, below), **0.91
to 1.32** extrapolated in Reynolds number; from 1.0 to 1.49, kappa's band
times 0.95 to 1.21.

### Item 3: fins at the base take a plate's largest t/c

`finned-body.ts` passes the plate's thickness over its tip chord, the
largest t/c, the fins-on-base factor's field (`evaluate.ts` mirrors it).
The review's case, four 7.2 mm plates of root 120 mm and tip 48 mm at M
2.0 at sea level (t/c 0.06 at the root, 0.15 at the tip), is refused: "the
fins-on-base band rests on fins 5% and 10% thick (TN 2360, TN 3819 fig.
35); t/c = 0.15 is outside them" (a test, with the same plates of
constant chord served). Left to W1: a tapered plate's root may be thinner
than 5% while its tip is inside (three 3 mm plates of root 120 mm, tip 48
mm: 0.025 to 0.0625); the factor's field is the largest t/c, so such a
plate passes its thickness check. Whether the thinnest station must also
lie inside is a rule of `src/base/fins-on-base.ts`, not changed here.

### Item 4: CR-149372 fig. 8b, M 1.2, 22 to 65 deg

The round-7 blind re-read (commit 47f32ec, the M 1.2 curve every 5 deg
from 0 to 95 deg and its triangles), paired with the first reading as in
section 14 (`w34_pair_round6.py`, the round-7 directory its second
argument):

| Span        | Points | Mean difference | Largest          | Within the combined error | kappa, first | Round 7 |
| ----------- | ------ | --------------- | ---------------- | ------------------------- | ------------ | ------- |
| 0 to 90 deg | 28     | +0.0006         | +0.012 at 5 deg  | 27 of 28                  | 0.8967       | 0.8990  |
| 22 to 65    | 12     | -0.0003         | +0.011 at 43 deg | 12 of 12                  |              |         |

The pair supports the first reading where the round-6 reading went astray,
so the label "the Mach 1.2 node rests on one reading of fig. 8b from 22 to
65 deg" is dropped (code, tests and page). The M 1.2 node takes the mean
of its three readings, **0.8973** (first 0.8967, round 6 0.8962, round 7
0.8990), range **0.879 to 0.908** (section 14: 0.896, 0.882 to 0.906; the
low end falls with fig. 5's wider spread below).

### The smaller items

- **TN 2960 fig. 5(e), M 1.49:** its symbols give 0.981 and 0.982 (both
  readings), below the band's 0.99. The band's low end is now local: 0.98
  at M_n 1.49, rising linearly to 0.99 by M_n 1.59 (TN 2960's lows by
  Mach number, 0.98 at 1.49 and 1.03 at 1.98 and 2.90, capped at the band's
  0.99: `roundedEdgeBandLow`), unchanged above. Lowering it everywhere moved
  the Basic Finner's gated shots; the local low end does not (its edges
  are unswept at M 1.8 and above). The 1.49 node's range is 0.98 to 1.06.
- **The transonic Reynolds regime** is "measured" only at CR-149372's own
  Re_d, 1.9e5 (fig. 8b) to 3.3e5 (fig. 5); elsewhere from M_n 1.0 to 1.49
  it is "extrapolated in Reynolds number" (+-3%), and outside 6.7e3 to 1e6
  refused (`MACHA_REYNOLDS`).
- **Points outside the combined error are kept** unless a third look
  shows a misread: fig. 8b's M 1.0 point at 54.2 deg and M 1.1 points at
  3.4, 39.1, 41.3, 50.0 and 53.5 deg, and fig. 5's shared-curve point at
  69.7 deg, now count. Still out: the stray at 86.5 deg (the "90" axis
  label), the "60" axis label read as symbols, the M 1.2 curve at 25 to 60
  deg and the "triangle" at 30.7 deg (a third look and now round 7 show
  them on the M 1.1 line), and fig. 5's 78 to 88 deg points whose cylinder
  the reader could not name. Second-reading kappa: 0.768, 0.831, 0.896
  (section 14: 0.765, 0.831, 0.896); fig. 5's spread on it -0.91%,
  -0.81%, -0.49% (was -0.56%, -0.46%, -0.14%).
- **Section 14 and the code on the M 6.86 30 and 45 deg pairs:** section 14
  left them out; the code kept them. Both keep them now: their r lies
  inside the envelope of the others, so the allowance is the same either
  way.
- **Stale numbers** corrected: sections 2 (M 2.5, X 3.3: 0.87, not 0.88), 5
  and 11 (each now gives the present values, with the first committed in
  brackets), the header comment of `rounded-leading-edge.ts`, and the CSV
  header, which said the second readings were pending.
- **0014's W4 amendment** extends to rounded wedges (section 12) and states
  the served sweep allowance.
- **W3(b), small tips.** Stations below fig. 29(a)'s lowest read abscissa,
  X 0.45, take the thin-layer term unchanged and the label says over what
  share of the span ("near the tip, over 9% of the span, c/[h Re_c^(1/5)]
  is below 0.45 ... an extrapolation"; fig. 29(a) varies by under 4% from
  0.45 to 1.0). With a transition input, stations beyond fig. 29's read
  range for the laminar change no longer refuse the whole term: that
  sliver takes the laminar change bounded between none and its value at
  the nearest station read, labelled with its share. A plate of taper 0.1
  (root 120 mm, span 80 mm, 3 mm) at M 2.2 with transition inputs keeps
  its trailing edge (19% of the span in the sliver; a test).
- **Boundary refusals** print the asked value with the digits that show
  which side it is on: "the Mach number 0.9999999 is below 1.0", "Reynolds
  number 1.0001e+6 on the edge's diameter is above 1000000".
- **The page.** `basicFinnerClass` no longer checks a hidden leading-edge
  radius on a flat plate (the plate's edge is half its thickness), and the
  explanation names the limits: M cos(sweep) 1.0 to 3.0, sweep to 60 deg,
  Re on the diameter 6.7e3 to 1e6, wedges only of constant chord, a swept
  edge's band wide and its allowance extrapolated.
- **Reproducibility.** `w34_pair_round6.py` reads RM A55H31's round-6 files
  and prints r on both readings and the third looks; with the round-7
  directory it pairs fig. 8b's M 1.2 re-read. `w34_fin_edges.py` holds TN
  3861's readings (the first as read and re-mapped, the second), pairs them
  and prints the estimates.
- **Tests** hold the hobby numbers and, where they can, values from the
  data or by hand (the nodes to four figures; r on each reading; the third
  looks).

### What the review changed

The hobby example's leading edges (three 3 mm plates, root 120 mm, tip 48
mm, span 80 mm, 42 deg, on a 54 mm body at sea level), C_D on the body's
area:

| M   | M_n   | Before the review         | After                     |
| --- | ----- | ------------------------- | ------------------------- |
| 1.5 | 1.115 | 0.1311 (0.1180 to 0.1664) | 0.1311 (0.1167 to 0.1770) |
| 1.8 | 1.338 | 0.1606 (0.1381 to 0.2120) | 0.1607 (0.1366 to 0.2249) |
| 2.2 | 1.635 | 0.1825 (0.1770 to 0.2080) | 0.1825 (0.1715 to 0.2354) |

The nominal moves only at M 1.8 (the M 1.2 node's third reading); the
bands widen with the served allowance (0.95 to 1.21 in place of 0.96 to
1.14 below M_n 1.49 and 0.97 to 1.14 above).

The Basic Finner's gated shots are bit for bit unchanged (components,
bands, inputs and states, to 1e-12), its edges unswept and of constant
chord.

**Coverage** (the same population and run, `out/impact-review.out`, its
cross-check against `src/total` agreeing on all 1200 cases): only item 3
moves a refusal. With a plate's largest t/c passed to the fins-on-base
factor, its thickness refusal falls from 71.7% to 53.1% of cases and
totals today rise from 0.2% to 0.4% (M 1.8 to 3.0: 0.5% to 1.2%); W1 is
needed in 90.0% of cases (was 95.8%), W4 still in 20.7%, and the totals
once W1 is done stay 3.4%. The bands moved by items 1, 2 and 4 refuse
nothing.

**Still read once:** TN 3861 fig. 17 (the drag behind the crossflow
estimates, a check on the allowance, not a band) and TN 2960 fig. 5(d)'s
R 1.3e5 diamonds (a check of the band, as in section 14).

## 17. Merged with the main line (96c7b22): the fig. 35 correction

The main line's correction of the fins-on-base factor (TN 3819 fig. 35's
free-flight curve, swept fins at the base refused by the present factor,
the Basic Finner's validated claim suspended) is merged in. Both stand:
the factor refuses a swept fin at the base whatever its edges, and takes a
plate's largest t/c (section 16); the page states the suspended claim and
where a rounded edge is served. Tests whose swept fins end at the base now
expect the body base's refusal ("fin-sweep") beside the edges' own
outcomes; the swept rounded leading edge stays served.

**Coverage** (the same population and run, `out/2026-10-21-w34-merge/`,
its cross-check against `src/total` agreeing on all 1200 cases): totals
today 0.2% (main alone 0.1%; this branch before the merge 0.4%), the swept
fins at the base refused in 69.0% of cases; W4 is needed in 20.7% of cases
(main alone 43.9%); totals once W1 is done 3.4% (main alone 1.4%).

## 18. The re-check of f8df436 (2026-10-21)

The original reviewer's re-check found items 2 and 4 of section 16 and
most smaller items held, and three problems remaining. What each became:

**1. r at the tests' stated yaws.** The reports state each test's yaw (the
present tests 30, 45, 60 deg, p. 10 and fig. 10's legend; reference 1's
14.3, 29.6, 45.1, 59.8 deg, fig. 10's legend, and 75.1, TN 3861 fig. 5).
Fig. 12 draws its symbols below them (0.15 to 0.25 deg on the second
reading, 0.09 and 0.04 at 30 and 75 deg), and fig. 11 draws the same tests
at 60.0 and 60.04 deg: section 16's third looks measured where the symbol
is drawn, not the test's yaw. r is now evaluated at the stated yaw
(`statedYaw` in `rm-a55h31.ts`; section 5's table): at 60 deg 1.210 on the
second reading's ratio, 1.217 on the third look's, 1.263 on the first's
(its ratio 0.170 misread, 0.165 on the third look, so set aside); at 45 deg
1.128 on all three. At 60 deg r moves 0.126 per degree of yaw (section 16
said about 0.3). The measured allowance stays 0.98 to 1.08 (r 0.987 to
1.072 at M_n 3.38 to 6.65); the allowance served is **0.95 to 1.22 at 60
deg**; the label's M_n is 1.95 to 2.76, and no yawed datum lies below M_n
1.95 at a served sweep. The 45 deg run is at R 2.1e3, below the served
6.7e3: counting it is conservative.

**The allowance grew with sweep (superseded, section 19).** Unswept the band was 0.99 to 1.06 and
at 1 deg of sweep 0.94 to 1.29, a step the data do not ask for: Penland's
14.3 deg point gives r 0.995 and 0.996. The allowance at a sweep S was set
here to 1 - 0.05 s to 1 + 0.22 s with s = sin(S) / sin(60 deg). The reason
given, that the data grow with sweep, does not hold: in RM A55H31's own
tests (r - 1 of 0.07, 0.13, 0.22 at 30, 45, 60 deg) sweep and normal Mach
number move together (M_n 3.38, 2.76, 1.95), so the rise cannot be put on
sweep, and Penland's series does not rise with sweep (section 19). The
swept band is rounded outward to 0.001, not 0.01, so it grows from the
unswept one without a step (with the grown allowance, at 1 deg 0.989 to
1.065; at 40 deg 0.953 to 1.234; at 60 deg 0.940 to 1.294).

The hobby example's leading edges (C_D; section 16's table):

| M   | Before the review         | At f8df436 (flat 0.95 to 1.21) | At 379d137 (0.961 to 1.170 at 42 deg) |
| --- | ------------------------- | ------------------------------ | ------------------------------------- |
| 1.5 | 0.1311 (0.1180 to 0.1664) | 0.1311 (0.1167 to 0.1770)      | 0.1311 (0.1182 to 0.1703)             |
| 1.8 | 0.1606 (0.1381 to 0.2120) | 0.1607 (0.1366 to 0.2249)      | 0.1607 (0.1388 to 0.2162)             |
| 2.2 | 0.1825 (0.1770 to 0.2080) | 0.1825 (0.1715 to 0.2354)      | 0.1825 (0.1735 to 0.2264)             |

A flat 0.95 to 1.22 gives high ends of 0.178, 0.227 and 0.237 (the
reviewer's figures; section 19 restores it).

**2. Thin plates at the base.** With the tip's t/c passed, 156 of the 376
four-plate rockets at the base in the population newly passed the
thickness check with a root thinner than 5% (a median 79% of the span
thinner than the factor's 5% data; the reviewer counts 157). After the
merge with the main line the present factor refuses fins swept at either
edge, and a tapered plate has a swept edge: it sees **none** of them. The
rule is now robust whatever the factor serves later: a plate's largest
t/c is its thickness over the shorter end chord and its smallest over the
longer (`finned-body.ts`). Within 0.05 to 0.10 at every station it is
served as before. Thinner than 0.05 anywhere, none thicker than 0.10, the
factor is taken at 5% with its low end at no fin effect (F = 1, the
physical limit, since thinner fins lower the base pressure less), its high
end kept and the nominal their midpoint, labelled "extended below the
data's 5% thickness: t/c down to X over Y% of the span, the low end taken
as no fin effect (F = 1; thinner fins lower the base pressure less), the
high end the 5% fins'" (reworded in section 19: the high end rests on the
10% fins and the tunnel data) (`base-drag.ts`, `BaseFins.thinnest`; the factor
itself, `fins-on-base.ts`, is not changed). A section of uniform t/c below
5% takes the same rule. Thicker than 0.10 stays refused. (Section 20:
flat plates at the base are refused; the extension holds for the wedge,
circular-arc and hexagonal families only.) In the population it lifts the thickness refusal from the 23 unswept four-plate rockets at the base, all thinner than 5%, and from unswept sections thinner than 5% (a test holds four 3 mm plates of constant chord 120 mm).

**3. The tip sliver's upper bound.** In the sliver the stations lie below
fig. 29(b)'s read range in c/[h Re^(1/2)], where the laminar base pressure
keeps falling (M 1.5: p_b/p_inf 0.4068 at 0.012, 0.3576 at 0.010; M 3.1:
0.2486 at 0.010, 0.1917 at 0.006), so the nearest station's value is not an
upper bound. The sliver now takes the vacuum bound as its high end (its low
end the smaller of none and the nearest station's value), labelled. The
station scan behind the sliver is made only when a sliver needs it, so the
transition test no longer nears its 5 s timeout under load.

**Smaller items.** Section 1's table is brought up to date. "Fig. 29(a)
varies by under 4% from 0.45 to 1.0" now reads "by up to 4.2% of its value
at 1.0, at M 3.1". The working tree is clean and both merges (7f1d579,
96c7b22; 4d6bbe5, 7cf5cab) are complete commits; the conflicted state the
reviewer saw was the first merge in progress.

The Basic Finner's gated shots are bit for bit the main line's (7cf5cab;
693 values, the largest difference 0); its reported shots change only
their reasons (the leading edges served at Mach 1.332 and 1.377).

**Coverage** (the same population and run, `out/2026-10-21-w34-rereview/`,
its cross-check against `src/total` agreeing on all 1200 cases): only item
2 moves a refusal. The thickness refusal at the base falls from 53.1% of
cases to 5.5% (thicker than 10% only); totals today rise from 0.2% to 0.3%
(M 1.8 to 3.0: 0.4% to 0.7%); W1 is needed in 94.6% of cases (was 96.0%),
W4 still in 20.7%, and the totals once W1 is done stay 3.4%. The swept
fins at the base stay refused in 69.0% of cases.

## 19. The third check of 379d137 (2026-10-21)

The third check found items 1, 3, 4 and 5 of section 18 held (r at the
stated yaws, the thin-plate rule, the vacuum bound, the Basic Finner bit
for bit, the coverage reproduced), and one blocking problem.

**The sweep allowance is held from the smallest tested sweep.** Section
18's growth with sin(sweep) is not supported by the data and narrowed the
served bands. In RM A55H31's own tests sweep and normal Mach number move
together (30 deg: M_n 3.38, r - 1 = 0.07; 45: 2.76, 0.13; 60: 1.95, 0.22),
so the rise cannot be attributed to sweep; Penland's series does not rise
with sweep (14.3, 29.6, 45.1, 59.8 deg: 0.995, 1.007 to 1.012, 1.030 to
1.034, 0.987 to 1.012); at matched M_n near 3.4 the order reverses (30 deg,
1.07; 59.8 deg, 0.99 to 1.01); and at 45 deg the grown allowance (1.180)
sat below the 1.217 measured at 60 deg and M_n 1.95, while 45 deg edges
are served down to M_n 1.0, where no datum exists at any sweep. The
allowance is now the full **0.95 to 1.22 from 14.3 deg**, the smallest yaw
tested (`SMALLEST_TESTED_SWEEP`), **up to 60 deg**, and below 14.3 deg it
tapers linearly to none unswept, for continuity with the unswept band, not
from data (`sweepAllowanceAt`; labelled "0.95 to 1.22 from 14.3 deg, the
smallest yaw tested, tapered below it to meet the unswept band"). Every
datum at a served sweep lies inside it (a test holds all 14). Swept bands:
0.940 to 1.294 (0.931 at M_n 1.49), 0.912 to 1.330 extrapolated in Reynolds
number, at every sweep from 14.3 deg; at 1 deg 0.986 to 1.077.

The hobby example's leading edges (C_D; sections 16 and 18):

| M   | Before the review         | At f8df436 (flat 0.95 to 1.21) | At 379d137 (grown)        | Now (0.95 to 1.22)        |
| --- | ------------------------- | ------------------------------ | ------------------------- | ------------------------- |
| 1.5 | 0.1311 (0.1180 to 0.1664) | 0.1311 (0.1167 to 0.1770)      | 0.1311 (0.1182 to 0.1703) | 0.1311 (0.1169 to 0.1776) |
| 1.8 | 0.1606 (0.1381 to 0.2120) | 0.1607 (0.1366 to 0.2249)      | 0.1607 (0.1388 to 0.2162) | 0.1607 (0.1372 to 0.2256) |
| 2.2 | 0.1825 (0.1770 to 0.2080) | 0.1825 (0.1715 to 0.2354)      | 0.1825 (0.1735 to 0.2264) | 0.1825 (0.1715 to 0.2361) |

The reviewer's 0.178, 0.227 and 0.237 are these to rounding (the swept band
is rounded outward to 0.001 here).

**Smaller items.** The leading edges' band text in the total (`band`)
printed bands rounded to 0.001 with toFixed(2), rounding inward (0.951 to
1.241 as 0.95 to 1.24); it is now printed to two decimals rounded outward.
The thin-plate label said the high end is the 5% fins'; it rests on the 10%
fins and the tunnel data, and now says so. The transition test of
`fin-trailing-edge-thick.test.ts` computed its reference integrals with
60000 readings of fig. 29; one pass of 8000 strips now gives both ends (the
same 1e-4 test), and its stated timeout, 30 s, reflects that work (about 1
s alone).

**Coverage.** The run on this code reproduces `out/2026-10-21-w34-rereview/`
exactly, its cross-check against `src/total` agreeing on all 1200 cases:
the allowance moves bands, not refusals. The Basic Finner's gated shots
stay bit for bit the main line's (693 values, the largest difference 0).

## 20. Flat plates at the base refused (hotfix, 2026-10-21)

W1's review found that the thin-plate rule of section 18 served unswept
flat plates at the base with the factor's low end at no fin effect (F =
1), while the only flat-plate source, RM L52E06 fig. 7 (four plates at the
base), measures relief, F 0.85 to 0.88: for plates F = 1 is not a lower
bound, and the coordinator's rule was wrong for them. Until W1's rebuilt
factor lands (it will serve plates with RM L52E06's relief as the low end),
the present factor refuses flat-faced fins at the base, flat plates with
square or rounded edges (`flat-plate-fins`): "flat plates at the base lower
the base drag by up to 15% (RM L52E06 fig. 7, F 0.85 to 0.88), which this
factor's data do not cover; the rebuilt factor will serve them"
(`base-drag.ts`, `BaseFins.flatFaced`, after the factor's own checks, so a
plate refused for count, thickness, sweep or Mach number shows that reason
first). The thin-fins extension of section 18 stays for the wedge,
circular-arc and hexagonal families only. A test holds plates of constant
chord, thin and inside the data, square and rounded, refused; a tapered
plate refused for its sweep first; a 3% double wedge served, extended; and
a 12% one refused (0014 section 10.7, amendment e).

**Coverage** (the same population and run, `out/2026-10-21-plates-at-base/`,
its cross-check against `src/total` agreeing on all 1200 cases): the
refusal applies to 43.5% of cases and is the sole blocker in 0.04%. Served
totals fall from 20 of 8000 cases to 17 (all at Mach 1.8 to 3.0: 13 of 2000
rockets to 10; totals today 0.3% to 0.2%, at Mach 1.8 to 3.0 0.7% to
0.5%). W1 is needed in 95.5% of cases (94.6% before); the totals once W1 is
done stay 3.4%.

**Superseded with W1 (2026-10-21; 0014 section 10.7, amendment i).** With
the rebuilt factor merged (0015), the refusal routes on: `bodyBaseDrag`
gives every flat-faced fin at the base the present factor's
`flat-plate-fins` refusal first, before its own checks (plates are not
among its measured families, whatever their count, sweep or Mach number),
and sends them to the rebuilt factor's flat-plate value, bounded from RM
L52E06's relief to the circular arc at least as thick (0015 section 4);
the message now reads "the present fins-on-base factor is measured on
wedge, circular-arc and hexagonal sections, not on fins with flat faces at
the trailing edge (plates), which lower the base drag by up to 15% at the
base (RM L52E06 fig. 7, F 0.85 to 0.88; 0014 section 10.7)". A plate with
a rounded trailing edge, which the rebuilt factor does not take, stays
refused, for its trailing edge, with both reasons. The 3 totals this
section's refusal removed are served again, on the flat-plate value (0015
section 8).

## 21. Square-cut leading edges, and rounded ones swept beyond 60 deg: bounded, not measured (2026-10-26)

Written before any code for either term, under 0014 section 10.7 (aa)
and (ab) (the coordinator's decisions of 2026-10-26, on the advisor's
plan of 2026-10-22, recommendation 4). Section 6 refused square-cut
leading edges because the lower bound 0014 section 10.2 named, the
rounded edge of the same thickness, was never shown to lie below the
flat face; section 5 refused rounded edges swept beyond 60 deg because
the yawed-cylinder checks of the independence principle stop there.
Neither term is measured. Both are served under 10.2 as "bounded, not
measured": the band runs from the lower bound's low end to the upper
bound's high end, the whole gap, and the value served is its midpoint
(as the fins-on-base factor's bounded values are, `src/base`).

### 21.1 Square-cut leading edges

**The term.** A plate's square-cut leading edge is a flat face of height
t, the plate's thickness, normal to the plate and to the edge. Its
pressure drag per unit span is (p_f - p_inf) t, with p_f the face's mean
pressure: the plate's faces behind the corners are parallel to the
stream and carry none (section 4), and the shear on the face acts in its
own plane, across the stream. Swept S deg, by the independence principle
(section 5), the flow normal to the edge is the two-dimensional flow at
M_n = M cos(S) on the normal dynamic pressure q cos^2(S), and the drag
per unit span is still (p_f - p_inf) t: the face's area per unit span,
t / cos(S), times the stream's component of its normal, cos(S).

**The bounds**, on the normal flow, with p02 the pitot pressure
(Rayleigh's) at M_n and p* = 0.5283 p02 the sonic pressure on a
streamline of that total pressure:

- lower: p* on the whole face, Cp* = (p* / p_inf - 1) / (gamma M_n^2 / 2),
  times q cos^2(S) t;
- upper: p02 on the whole face, Cp_pitot(M_n), times q cos^2(S) t.

Swept, each is widened by the sweep allowance served on rounded edges,
0.95 to 1.22 from 14.3 deg, tapered below it to none unswept (sections 18
and 19): the lower bound's low end takes the allowance's low end, the
upper bound's high end its high end. Unswept, on the thickness:

| M_n | Cp*   | Cp_pitot | Cp* / Cp_pitot | Midpoint |
| --- | ----- | -------- | -------------- | -------- |
| 1.0 | 0.000 | 1.276    | 0.000          | 0.638    |
| 1.2 | 0.270 | 1.396    | 0.193          | 0.833    |
| 1.5 | 0.510 | 1.532    | 0.333          | 1.021    |
| 2.0 | 0.707 | 1.657    | 0.427          | 1.182    |
| 2.5 | 0.801 | 1.720    | 0.466          | 1.261    |
| 3.0 | 0.853 | 1.756    | 0.486          | 1.304    |

The gap is the whole range: at M_n 2.0 the term is served between 0.43
and 1.0 of the pitot pressure's term (Cp 0.71 to 1.66 on the thickness),
at its midpoint, 1.18, with a band of +-40% of it. For comparison, the
rounded edge of the same thickness is (2/3) Cp_pitot t, 1.10 at M_n 2.0;
nothing here orders the two, and nothing needs to.

**The ordering, unswept** (the argument 10.2 asks for, written before the
number is served):

1. _A bow shock stands off the face at every M_n of 1.0 or more._ The face
   turns the flow 90 deg, and no attached shock turns it more than 45.6
   deg (gamma = 1.4, at any Mach number). Behind the shock's normal part
   the flow is subsonic.
2. _The upper bound, exactly, in inviscid flow._ The face is wetted by one
   streamline, the dividing streamline on the plate's mid-plane (by
   symmetry), which crosses the shock where the shock is normal to it.
   Entropy is constant along it, so the total pressure is p02 at every
   point of the face, and p is at most p02 there, equal at the stagnation
   point.
3. _The lower bound, exactly, in inviscid flow._ On a streamline of total
   pressure p02, p is at least p* exactly where the Mach number is at
   most 1. A subsonic flow along a straight wall that reaches a sharp
   convex corner becomes sonic at the corner and turns it by a centred
   expansion: the sonic line runs from the corner out to the shock, and
   the face lies inside the subsonic region behind it, whatever the Mach
   number. That is the standard result for flat-faced bodies (the sonic
   point at the shoulder). This record does not take it on authority: it
   is checked by computation (21.3) at M 1.2, 1.5, 2.0 and 3.0. So p is at
   least p* on the face, equal only at the corners. Every other
   streamline crosses a weaker part of the shock, so none near the face
   carries a total pressure below p02.
4. _The face's own expansion at the corners._ The centred expansion lies
   beyond the corner. In inviscid flow the face upstream of it stays
   subsonic: its pressure falls toward the corner and reaches p* there,
   not before. In the real flow the face's boundary layer is subsonic near
   the wall, and through it the corner's expansion reaches upstream a
   distance of the order of the layer's thickness, where the wall
   pressure can fall below p*: the layer's displacement rounds the
   corner, and on a rounded convex corner the sonic point lies on the
   rounding. 21.3 computes faces with corners rounded to 4% and 2% of the
   half-thickness, to see where the sonic point lies and how far its
   effect reaches up the straight face. The real-flow ordering of the
   lower bound is then shown by a margin: it holds if the computed face
   mean exceeds the lower bound by more than a vacuum (zero pressure) in
   place of p* over a tenth of the face's height at each corner, at every
   Mach number computed. A tenth of the height is to be at least twice
   the layer's thickness at the corner at the smallest Reynolds number
   served (21.3 estimates it from the computed velocity gradient at the
   stagnation point).
5. _The upper bound in the real flow._ The total pressure at the edge of
   the face's boundary layer exceeds p02 only at second order in the
   shock's departure from normal where those streamlines crossed it (of
   order 1e-5). The fin's root (the body's boundary layer and the
   junction's separation ahead of the face) and its tip are not
   represented, as for the rounded edge (section 5); a separation shock
   ahead of a blunt fin's root can raise the pressure on the face near
   the root above p02 locally. The margin to the upper bound (one less
   the computed face mean, 21.3) is stated beside it; nothing more is
   claimed for the root.
6. _Swept edges._ The independence principle is exact for the inviscid
   flow past an infinite swept face, so 1 to 4 hold in the normal flow.
   A finite, real edge departs from it: on yawed cylinders by 0.95 to
   1.22 of the front side's drag at the sweeps served (sections 5, 16, 18
   and 19), and at the stagnation line itself by up to 1.098 of the
   principle's pressure (RM A55H31 fig. 11, its own tests at 60 deg, M_n
   1.95; `stagnationChecks`). So a real swept face can carry more than the
   pitot pressure at the normal Mach number, and that pressure alone is
   not a limit there. Each bound is widened by the sweep allowance, which
   contains every yawed datum at the sweeps served; carried from cylinders
   to a flat face, it is an analogy, and is labelled as one.
7. _The domain._ Normal Mach numbers of 1.0 to 3.0: below 1.0 the normal
   flow is subsonic, no shock stands in it, p* falls below the free
   stream's pressure and the lower bound becomes a thrust, and no rounded
   edge is served there either (section 11); above 3.0 lies beyond the
   range served for every fin edge, the code taking gamma = 1.4
   throughout. Sweep up to 60 deg, the largest yaw checked (section 5).
   The Reynolds number on the thickness, normal component, at least
   6.7e3, the rounded edge's floor (RM A55H31's statement), so that the
   face's layer is thin (item 4). No upper Reynolds number: the face's
   flow is set by its choked corners whatever the layer does on it or
   behind them.

**Against 10.2's rules.** Each bound is a physical limit on the normal
flow, of the kind 10.2 lists (the pitot pressure, the vacuum bound): the
total pressure of the one streamline that wets the face, and the sonic
pressure of a subsonic streamline of that total pressure. Swept, each
carries the sweep allowance, a measured band, so each is then a physical
limit carried by a measured method with its own band, which 10.2 also
allows. The ordering is shown by items 1 to 7, committed before the code;
the computation of 21.3 checks its premise (item 3) and sets the margin
items 4 and 5 rest on, and sets nothing else: no band, no nominal. The
value served is the midpoint, the band the whole gap. The label names
both bounds and their sources, with the gap's size in C_D beside the
component, and a total that contains the term is at best an estimate and
names it. The one change to 10.2 is its lower bound, by amendment (aa).
Not shown: the computed face mean is inviscid, and the root and tip are
not represented.

**Refused**, with every reason: M_n below 1.0 or above 3.0, sweep beyond
60 deg, the Reynolds number below 6.7e3 (`square-leading-edge`).

### 21.2 Rounded leading edges swept beyond 60 deg

**The term** at sweep S is section 5's (and section 11's below M_n 1.49),

    D(S) / (q s) = kappa(M_n) Cp_pitot(M_n) cos^2(S) r 2 (cos(delta) - cos^3(delta) / 3),

M_n = M cos(S). Beyond 60 deg the principle's error is not measured well
enough to set a band: the yawed cylinders there are Penland's at 75.1
deg, which TN 3861 p. 10 flags for an end effect, and Lord and Ulmann's
at 70 and 75 deg on TN 3861's crossflow plots, unpublished, the 75 deg
one flagged high (p. 11). (As first committed, only Penland's point was
named here; the review of 2026-10-27, section 21.5.)

**The bounds**, at the case's Mach and Reynolds numbers:

- lower: the term at S, at its band's low end (TN 2960's or kappa's low
  end, the +-3% Reynolds allowance where it applies, times the sweep
  allowance's low end, 0.95);
- upper: the same term at 60 deg of sweep, at its band's high end (times
  the allowance's high end, 1.22), the Reynolds number's normal component
  taken at 60 deg.

Both must be served: M cos(S) at least 1.0 (so at most 60 deg at Mach
2.0, 65.4 deg at 2.4, 70.5 deg at 3.0) and the Reynolds number's normal
component inside the term's range at both sweeps. Elsewhere the edge is
refused with the term's own reasons, as at any sweep.

**The ordering.**

- _Upper._ (i) The principle: the term falls strictly as the sweep grows,
  since cos^2(S) falls, and M_n falls with it while kappa(M_n)
  Cp_pitot(M_n) rises with M_n (kappa's nodes 0.765, 0.831, 0.897 and 1
  at M_n 1.0, 1.1, 1.2 and 1.49, nominal linear between them, and
  Cp_pitot rising; a test holds it on a fine grid of M_n). (ii) Measured:
  the front side's drag per unit span falls with yaw on every series of
  RM A55H31 fig. 12, both readings (gauge, converted as in section 5,
  over the unyawed, divided by cos(yaw) to put it per unit span):

  | Series                 | 14.3 deg | 29.6 or 30 deg | 45 deg         | 59.8 or 60 deg | 75.1 deg       |
  | ---------------------- | -------- | -------------- | -------------- | -------------- | -------------- |
  | Penland, M 6.86        | 0.934    | 0.759 to 0.763 | 0.509 to 0.510 | 0.243 to 0.249 | 0.059 to 0.068 |
  | RM A55H31's own, M 3.9 |          | 0.794 to 0.797 | 0.549          | 0.279 to 0.291 |                |

  So the drag at a sweep beyond 60 deg lies below the drag at 60 deg,
  which the term at 60 deg contains within its served band (section 5).
  For the ordering to fail, the principle's error at S would have to
  exceed the upper bound's high end over the term at S, which is at
  least 1.234 and grows with S as the term at S falls below the term at
  60 deg (the least just past 60 deg at M 2.2, M_n 1.10, on kappa's 1.1
  node; as first committed, "at least 1.29", which was wrong: the review
  of 2026-10-27). Every measured ratio r at any yaw is 1.217 or less (the
  first reading's misread 1.263 at 60 deg aside, section 16), the 75.1
  deg point 1.013 and 1.170 as read. Just past 60 deg the margin is
  thin, 1.4% over 1.217, and there, at normal Mach numbers near 1.1, no
  yawed cylinder is measured (none below M_n 1.95 at a served sweep,
  section 16): the upper ordering there rests on the principle and on
  the sweep allowance extrapolated in normal Mach number, as the 60 deg
  term's own label, carried whole into the bounded label, says.

- _Lower._ The principle is exact for the inviscid flow past an infinite
  yawed cylinder at any sweep; what departs from it is the real flow,
  the boundary layer and, on a model, its ends. The lower bound is the
  term at S at its band's low end, 0.81 to 0.94 of the term (TN 2960's
  or kappa's low end, the Reynolds allowance where it applies, times
  0.95). To 60 deg the departures measured on RM A55H31 fig. 12 put the
  front side at 0.987 of the principle or more. Beyond 60 deg the yawed
  cylinders measured are the three crossflow points of TN 3861 figs. 15
  to 17 below a crossflow Mach number of 3.37 (section 16, item 1(b);
  `fin_edges_w34.md` section 4): the stagnation pressure (fig. 15) and
  the downstream-side pressure (fig. 16), each read twice, and the front
  side estimated from them with the drag (fig. 17, read once) as F =
  C_D + Cp_down:

  | Set, crossflow Mach number            | Sweep    | Stagnation pressure over Rayleigh's (two readings) | F over modified Newtonian (two readings of fig. 16)            | F over the term at its sweep | What TN 3861 says of it                                   |
  | ------------------------------------- | -------- | -------------------------------------------------- | -------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------- |
  | Lord and Ulmann, M 4.04, 1.38 to 1.41 | 70 deg   | 1.067, 1.066                                       | 1.053, 1.048                                                   | 1.08 to 1.10                 | unpublished; its Reynolds number not stated               |
  | Lord and Ulmann, M 4.04, 1.04         | 75 deg   | 1.528, 1.497                                       | 1.445, 1.445                                                   | 1.83                         | flagged high (p. 11); unpublished                         |
  | Penland, M 6.86, 1.73 to 1.76         | 75.1 deg | 1.171, 1.172                                       | 1.166, 1.165 (1.147, 1.146 of TN 2960's integrated front side) | 1.17                         | an end effect, the shock not parallel to the body (p. 10) |

  ("The term" is kappa times modified Newtonian below M_n 1.49, modified
  Newtonian above.) Every one lies above the principle, on the
  stagnation pressure (read twice) and on the front side estimated (read
  once in part). The estimate is off by up to 0.086 of modified
  Newtonian on TN 2960's own cylinders (section 16); with that taken
  off, every one still lies above the lower bound's end (at 70 deg 0.96
  of modified Newtonian against the bound's 0.81; at 75 deg 1.36 against
  0.69 to 0.71; at Penland's 1.08 against 0.94). Two of the three are
  flagged by the report, and neither flag says by how much, or which
  way, the front side is moved; the third is unpublished. The stagnation
  pressures alone, read twice, lie above the principle too, though the
  stagnation line alone does not make the front side. The lower ordering
  beyond 60 deg rests on these three points and on the principle, and
  the label says so; beyond 75.1 deg (served only above Mach 3.9, to
  80.4 deg at Mach 6.0) it rests on the principle alone, and the label
  says that too. Fig. 17 has one reading; a blind second reading of its
  three crossflow points is the coordinator's to arrange.

- _RM A55H31 at 75.1 deg, disclosed._ Penland's crossflow point is the
  same test as RM A55H31's reference-1 point at 75.1 deg. On fig. 11 its
  stagnation-line pressure over the free stream's pitot pressure is
  0.046 (first reading, at 75.2 deg as read) and 0.0567 (second, at
  74.75 deg): 0.631 and 0.738 of Rayleigh's pitot pressure on the normal
  Mach number, below the principle, against TN 3861 fig. 15's 1.171 and
  1.172 above it. The readings' own errors (0.004 and 0.001 of the
  ratio) move those by at most 0.06, so the two reports disagree at this
  point, and neither says why; RM A55H31's reference-1 values were
  formed on RM L54A14, before TN 3861's correction for its nozzle's local
  Mach number (section 5), by an amount neither report states. On fig.
  12 the point's r is 1.013 and 1.170 on the two readings, but there r
  moves 0.068 for each 0.001 of fig. 12's ratio (0.021 to 0.023), so
  within the second reading's stated error, 0.002, r spans 0.877 to
  1.149 (within the first's 0.004, 0.90 to 1.44): the point alone cannot
  show r of 0.95 or more. As first committed, this paragraph rested the
  lower ordering on this one point, "with an end effect that raised it";
  neither report says which way the end effect moved it, and that claim
  is withdrawn (the review of 2026-10-27).
- _A check that sets nothing._ At the 75.1 deg point's own conditions (M
  6.86, M_n 1.76) the bounds are 0.055 (the term at 75.1 deg, 0.0584 of
  the unyawed per unit span, times 0.99 and 0.95) and 0.315 (the term at
  60 deg, 0.2434, times 1.06 and 1.22), 0.94 to 5.4 of the principle at
  75.1 deg; the term at 60 deg is taken there at M_n 3.43, beyond the 3.0
  served, so this is a check only. The point's two readings, 0.059 and
  0.068 (r 1.013 and 1.170), lie inside; r at the second reading's error's
  low end, 0.877, would not. At Lord and Ulmann's points (M 4.04; M_n
  1.38 at 70 deg and 1.05 at 75 deg; their Reynolds numbers not stated,
  so the band of every regime the term serves there) the band is 0.81 to
  3.09 or 3.18 of modified Newtonian at 70 deg and 0.69 or 0.71 to 6.15
  or 6.32 at 75 deg, and the estimates, 1.048 to 1.053 and 1.445, lie
  inside. The review of 2026-10-27 made the same checks;
  `tests/fins/rounded-leading-edge-beyond-60.test.ts` holds them.

**Against 10.2's rules.** Both bounds are measured terms with their own
bands (section 5's, TN 2960 or NASA CR-149372 with RM A55H31's sweep
allowance), and the ordering is shown above, before the number is
served. Its evidence beyond 60 deg is TN 3861's three crossflow points
at 70 and 75 deg, two of them flagged by the report and one
unpublished, named for this use in (ab)'s addendum of 2026-10-27 (as
first committed, Penland's one point on fig. 12, named in (ab)). Fig.
12's values were read twice (and looked at a third time) for sections
5, 14 and 16, and TN 3861 figs. 15 and 16 twice and fig. 17 once for
section 16, before those entries, which name their new use and read
nothing new. The value served is the midpoint, the band the whole gap,
the label carries both bounds whole, each with its own sources, and a
total that contains it is at best an estimate and names it.

### 21.3 The computed check of 21.1 (registered here, before it is run)

Planar Euler solutions (`src/engine-cpu/euler2d.ts`, HLLC, steady, local
time steps) of half a flat-faced plate above its mid-plane: the face x =
0 from the mid-plane to y = 1 (the half-thickness), its corner rounded to
a radius of 0.04 and 0.02, then the plate's side y = 1 downstream; at M
1.2, 1.5, 2.0 and 3.0, on three nested grids (cells halved each way), the
corner resolved by at least eight cells on the finest. Reported for each:
on the straight face (y from 0 to 1 less the radius), the largest wall
Mach number and the smallest and largest wall pressure over p02; where
the sonic point lies; the face's mean gauge pressure over the pitot's,
(p_f - p_inf) / (p02 - p_inf), over the whole height; the velocity
gradient at the stagnation point; each with its change between the two
finest grids, the solution's own error.

- _Pass._ On the finest grid with the smaller radius, at every Mach
  number, the straight face's wall Mach number stays below 1 and its
  pressure above p* by more than the change between the two finest grids
  allows, and its pressure is at most p02 within that change.
- _Fail._ Otherwise. Then square-cut edges stay refused, and the result
  is recorded here.
- _The margin of items 4 and 5._ The computed face mean is set against
  the lower bound less a vacuum over a tenth of the height at each
  corner; if it does not exceed that at every Mach number computed, the
  real-flow ordering of the lower bound is not shown and the edges stay
  refused. The reach of the corner through the face's layer is estimated
  from the stagnation-point velocity gradient (the laminar
  stagnation-point layer, thickness 2.4 (nu / beta)^(1/2)) at the
  smallest Reynolds number served; if a tenth of the height is less than
  twice that thickness, the vacuum zone is widened to twice it.

The solution is inviscid and sets no band and no nominal: the term
served is the midpoint of the physical bounds whatever the computed mean
is.

**The protocol amended before the registered runs (2026-10-26, written
before any of them was started).** Trial solves at M 2.0 on the coarsest
grid only (`docs/research/square-edge/trials/`, with notes on the first runs, whose
files were overwritten) found
that the solutions with the registered radii do not settle: with a corner
radius of 0.04 the flow behind the corner (its inviscid expansion toward a
near vacuum along the plate's side, and its recompression) stays unsteady
whatever the iteration (block implicit or explicit local time steps), the
flux (HLLC, HLL, rotated hybrid; HLL with the implicit steps failed with
a non-physical state), the reconstruction (second order or first) or the
rounding's cells (4 or 12), and the face's mean gauge pressure over the
pitot's swings with it, between 0.77 and 0.96; at a radius of 0.08 the
residual falls to about 4e-4 of the start and the face mean holds within
0.003 (0.889 to 0.892), at 0.06 it does not settle. At the end of every trial that ran to its end
the straight face's least wall pressure was 0.67 to 0.80 of p02, against
p* at 0.528, and the sonic point lay on the rounding, 11 to 34 deg into
its turn. A trial with the side inclined after a 60 deg turn is set aside: its
outflow line ran back into the subsonic region. A
grid line from the rounding's end is subsonic from 1.25 to 4.4
half-thicknesses above the plate (normal Mach number down to 0.91), so
the domain cannot be cut there.
So the registered "steady" solutions cannot be had, and the pass criterion
is applied to the envelope over the oscillation instead, which is
stricter at each point than one settled solution:

- each grid runs a fixed number of explicit steps (HLLC, the registered
  reconstruction and limiter, local time steps, CFL 0.5): 20000 on the
  coarsest, 6000 and 4000 on the finer, each finer grid started from the
  coarser solution; the envelope is taken over every 100 steps of the
  second half: the straight face's largest wall Mach number (from the
  wall pressure on p02, isentropically), its least and largest wall
  pressure over p02, the face mean's least and largest values, every
  place the sonic point was seen;
- _pass_: on the finest grid, at both radii and all four Mach numbers,
  the straight face's largest wall Mach number stays below 1 and its
  least pressure above p* by more than the change in that least pressure
  between the two finest grids, and its largest pressure is at most p02
  within the same change;
- _the margin of items 4 and 5_: the face mean's least value over the
  envelope, against the lower bound less the vacuum zone as registered;
- _fail_: otherwise, and then square-cut edges stay refused.

**The result (2026-10-26): fail. Square-cut leading edges stay
refused.** The 24 solves (`docs/research/square-edge/out/flat-face.jsonl`,
`summary.out`, from `summary.py`), on the finest grid (144 x 96):

| M   | Radius | Residual | Largest wall Mach | Least p / p02 | Its change from the middle grid | Largest p / p02 | Face mean, gauge over pitot | Verdict |
| --- | ------ | -------- | ----------------- | ------------- | ------------------------------- | --------------- | --------------------------- | ------- |
| 1.2 | 0.04   | 2.3e-3   | 0.806             | 0.652         | 0.030                           | 1.015           | 0.865 to 0.888              | pass    |
| 1.2 | 0.02   | 1.4e-3   | 0.828             | 0.638         | 0.031                           | 1.013           | 0.886 to 0.907              | pass    |
| 1.5 | 0.04   | 5.3e-4   | 0.813             | 0.648         | 0.030                           | 0.999           | 0.887 to 0.888              | pass    |
| 1.5 | 0.02   | 3.2e-4   | 0.831             | 0.636         | 0.031                           | 1.001           | 0.907 to 0.908              | pass    |
| 2.0 | 0.04   | 3.3e-4   | 0.822             | 0.642         | 0.021                           | 0.999           | 0.899 to 0.901              | pass    |
| 2.0 | 0.02   | 6.5e-2   | 0.960             | 0.553         | 0.105                           | 1.074           | 0.862 to 0.942              | fail    |
| 3.0 | 0.04   | 2.5e-1   | 0.995             | 0.531         | 0.134                           | 1.023           | 0.844 to 0.949              | fail    |
| 3.0 | 0.02   | 9.3e-2   | 1.141             | 0.445         | 0.047                           | 1.187           | 0.819 to 0.991              | fail    |

(p* is 0.528 of p02; the residual is the density residual over its start.)
Where the finest solution settled, the straight face stayed subsonic, its
least pressure 0.636 to 0.652 of p02, clear of p* by 0.108 to 0.124
against grid changes of 0.021 to 0.031, its largest within 1.5% of p02, the
sonic point on the rounding (3 to 8 deg into its turn on the finest grid),
and the face mean 0.87 to 0.91 of the pitot term. Where it did not settle
(M 2.0 with the smaller radius, M 3.0 with both), the oscillation carried
the face's pressure to within 0.003 of p*, or below it (0.445 at M 3.0,
the sonic point then seen on the face, at y 0.96 to 0.975), and above p02
(up to 1.19). Those are excursions of an unsettled inviscid solution, not
a steady flow; but the registration asked for the face to be shown above p*
on the finest grid at every Mach number, and it was not, so the check fails
and square-cut edges stay refused (`SQUARE_EDGE_REFUSAL`, every reason in
words). The margin item (4 and 5) would have held everywhere: the face
mean's least value less a whole p02 over a tenth of the face's height at
each corner is 0.63 to 0.73 of p02 (against 0.528), and the layer's
thickness at the corner at Re 6.7e3, from the computed stagnation-point
velocity gradient (beta t / U 0.41 to 0.66 where settled), is 0.03 of the
thickness, so a tenth of the height is more than twice it.

What would lift the refusal, for a later record (none is done here): a
check that gives settled solutions at the small radii and Mach 3 (a
time-accurate solve averaged over its oscillation, or a viscous one in
which the corner separates as the real one does), registered before it
is run; or a measured flat-face pressure distribution, named in 0014
section 10.7 and read twice; or the owner's decision that the argument of
21.1 stands without its computed check. The term
(`src/fins/square-leading-edge.ts`) and its tests are kept, unwired, as
0019 section 3.2's bounded term is.

_The route taken (2026-10-26):_ the measured one. The owner's rule
admits no unverified estimate, so the argument is not served on its own;
0014 section 10.7 (af) names four sets of measured pressures on
flat-faced cylinders at Mach 2.0 to 4.63 (no planar or swept flat face
is measured at Mach 1 to 3), argues why they test the bounds' premises,
and registers the pass and fail criteria and what is served on each,
before any of them is read. The readers' brief is
`docs/research/square-edge/readers/brief.md`. The term stays unwired
until the readings are paired and judged under (af).

### 21.4 In the code, on the page, and the coverage

- `src/fins/rounded-leading-edge.ts`: beyond 60 deg of sweep
  `roundedLeadingEdgeDrag` returns the bounded term (`bounded`: the band's
  ends per unit span), the midpoint served; where either term is refused,
  the refusal carries both terms' reasons ("at 62.0 deg, ...; and at 60
  deg, ..."), under the first one's reason code. At 60 deg and below
  nothing changes.
- `src/total/finned-body.ts`: the leading edges' component carries the
  gap in C_D in its band text and `bounded` (`SWEPT_EDGE_BOUNDED_REASON`)
  for the total's claim; `DragComponent.bounded` is a new optional field
  (`src/total/total-drag.ts`). Square-cut edges: `SQUARE_EDGE_REFUSAL`.
  Since the review of 2026-10-27 (21.5) the band text names each bound's
  own source, band and regime (`roundedEdgeSource`), the label carries
  both terms whole, and `SQUARE_EDGE_REFUSAL` names all three failed
  cases.
- `src/app/total-drag.ts`: `boundedReasons` names every bounded component
  once in the claim, after the fins-on-base factor's.
  `src/app/status-words.ts`: "Estimate, bounded" with "An estimate with
  one part bounded, not measured: the fins' rounded leading edges, swept
  past 60 degrees, whose band runs from the drag at their sweep to that at
  60."; with more than one bounded part, words that say so; the square-cut
  edge's refusal words say its bounds' check has not passed.
- Tests: `tests/fins/rounded-leading-edge-beyond-60.test.ts` and
  `tests/fins/square-leading-edge.test.ts`; seven planted errors each fail
  them (the sonic exponent, the allowance swapped, cos for cos^2, the M_n
  floor, the upper bound at the actual sweep, the upper end served for
  the midpoint, the lower bound at its nominal).

The hobby example of section 16 with its edges square-cut, had the term
been served, at M 1.8: 0.188 in C_D, between 0.066 and 0.311 (a gap of
0.245), against 0.161 (0.137 to 0.225) for its rounded edges.

**Coverage** (the population of `docs/research/refusals/`, 2000 rockets
at four Mach bands, 8000 cases; `evaluate.ts` mirroring this code, its
cross-check against `src/total` agreeing on all 1200 cases). Before this
section main's run, re-run on 3389a04 and identical to it
(`out/2026-10-26-before-bounded-edges/`): totals served for 153 of 8000
cases (1.9%). After (`out/impact.out`): **153 of 8000, unchanged**. The
refusal "rounded leading edge swept beyond 60 deg" falls from 3.0% of
cases (240) to none; most of those edges are still refused, now for
their normal Mach number below 1.0 at their sweep (that refusal rises
from 17.5% to 20.0% of cases) or their Reynolds number (0.7% to 0.8%),
so about 30 cases (0.4%) have their leading edges served bounded, most
at Mach 1.8 to 3.0, and every one of them is refused for another part
(chiefly fins at the base the rebuilt factor does not measure, whose
share as the sole blocker rises from 1.13% to 1.19%). Square-cut edges
stay refused in 15.3% of cases (the sole blocker in 0.76%).

**The refused total's floor.** In those about 30 cases the refused
total (0011 section 10) shows the bounded edge among its served parts,
with its band and label, and where the floor is offered the edge's low
end, the term at its sweep at its band's low end, is in the sum. The
floor stays a floor there only if the lower ordering of 21.2 holds, so
for those cases the floor rests on it too. (As first committed, this
section did not say so; the review of 2026-10-27.)

### 21.5 The review of 2026-10-27

An independent review of 3389a04..2fbe1a3, with 5e47532, confirmed the
code, the numbers, the population and the square edge's verdict, and
found two blocking items and eight smaller ones. The fixes follow
5e47532 on this branch.

- _Blocking 1, the label beyond 60 deg._ At M 2.2 on a 3 mm plate (Re_D
  2e5) the term at 59.9 deg carried "extrapolated in Reynolds number",
  "no yawed datum below M_n 1.95 at a served sweep" and NASA CR-149372;
  the bounded term at 60.1 deg carried none of them, and called the 60
  deg term "the largest sweep checked on yawed cylinders", though at its
  normal Mach number, 1.10, no yawed cylinder is measured. Now the label
  carries each term whole, its own label after "Lower:" and "Upper:",
  and the component's band text names each bound's source, band and
  regime; `RoundedLeadingEdge.bounded` keeps both terms. Tested at the
  review's case either side of 60 deg, and the band text whole.
- _Blocking 2, the lower ordering beyond 60 deg._ Rewritten in 21.2 on
  TN 3861's crossflow points at 70 and 75 deg, with RM A55H31 fig. 11's
  disagreement at 75.1 deg and fig. 12's sensitivity there disclosed; "an
  end effect that raised it" withdrawn. Beyond 75.1 deg the label says
  the ordering rests on the principle alone
  (`LARGEST_YAWED_SWEEP_DEGREES`). The checks the review made (Penland's
  point inside 0.94 to 5.4 of the principle, Lord and Ulmann's inside the
  band at 70 and 75 deg) are in 21.2 and held by a test. (ab)'s addendum
  of 2026-10-27 names the new use of TN 3861's figures; nothing new is
  read.
- _The smaller items._ (1) 21.2's "at least 1.29" corrected to 1.234,
  with its thin margin disclosed; (2) a page test that a served total's
  claim names the bounded edge; (3) a test of the rounded wedge's path;
  (4) `demos/nose-drag.html` says a rounded edge beyond 60 deg is bounded;
  (5) `SQUARE_EDGE_REFUSAL` names every failed case; (6) 21.4 says the
  bounded edge's low end enters the refused total's floor; (7) a rounded
  edge refused past 60 deg is offered less sweep beside a bevelled edge;
  (8) the solver's output records its time scheme from now on (the
  registered runs used `SCHEME=explicit`, as 21.3's protocol states),
  and `summary.py` prints an envelope with no samples as empty.
- _Planted errors._ The claim built from the base alone, the wedge
  path's `bounded` dropped, the lower term's label left out of the
  bounded label, the band text without the bounds' sources, and the
  less-sweep change lost: each fails a test.
- _(af)_ is amended by a dated addendum, before any reading (0014
  section 10.7): criterion (ii) counts the error against the claim, P1's
  test is stated set by set, criterion (iii) is information only, and
  the Reynolds number is served only inside the range the paired sets
  measured.

### 21.6 (af) applied: pass (2026-10-27)

The measured flat-face pressures named in 0014 section 10.7 (af) were
read twice, the second blind (`docs/research/square-edge/readers/A` and
`B`, 370c1c4), and paired by a neutral party
(`readers/pairing-2026-10-27/`, eaee32b). (af) was then applied exactly
as written, with its addendum of 2026-10-27, by
`docs/research/square-edge/af/apply_af.py`, whose rules are fixed in its
header before it was first run. `af/out/verdict.txt` holds the result,
`face_margins.csv` the margin at every face orifice and `not_face.csv`
every point either reader puts off the face.

**How the rules were applied.**

- _Which sets test P1_ was decided in the pairing's `normalisation.txt`,
  before any value was compared. RM L57C18 (C_p on the free stream) tests
  it. TM X-19 (over its own face-centre pressure) does not. For TN 4300
  and TN D-5392 it is not established, so they do not test it either.
  One set tests P1.
- _Conversion to p / p02:_ TN 4300's p_l/p_o (o the stagnation point,
  "the total pressure behind the shock"), TM X-19's and TN D-5392's
  p_l/p_t,2 are taken as read; RM L57C18's C_p through Rayleigh's formula
  at its stated Mach number, 2.
- _a:_ 0.01 where no pressure accuracy is stated as a number (TN 4300,
  RM L57C18, TM X-19). TN D-5392 states 1% of full scale (1.44 psf on the
  1-psi gage, 14.4 psf on the 10-psi gage) and 0.5 psf on its
  manometers. Each orifice is taken with its gage's error plus 0.5 psf,
  over p02 computed from the paired conditions alone: Re 1.88e6 on the
  7.5 in. diameter, the stagnation temperature and the Mach number, with
  Sutherland's law. That gives 1279, 805 and 656 psf at Mach 2.49, 4.06
  and 4.63, so a is 0.012, 0.019 and 0.023 on the 10-psi gage.
- _Face points:_ only points both readers (or the one reader) place on
  the face. The seven points either reader calls corner or unclear, all
  on RM L57C18, are not face points, and none of the seven is one either
  reader puts on the face. The 64 afterbody points are listed too.
- _Readings:_ the two primaries, never an alternative. No face orifice
  is excluded, so the seven face points read once are used with their
  one reading. The six with no value from either reader cannot be
  evaluated; all six are TN 4300 marks that reader A lists without a
  value, at x/r 0.5 to 0.96, hidden behind or tangled with other
  symbols, and each is listed.

**Criterion (ii), every face reading at least 0.5283 + a on the lower
reading:**

| Set, item, series                          | Mach | Face points | Least lower reading, p / p02 (where)                  | a     | Margin         |
| ------------------------------------------ | ---- | ----------- | ----------------------------------------------------- | ----- | -------------- |
| TN 4300 fig. 7, 4-in. model D              | 2.00 | 15          | 0.692 (x/r 0.979)                                     | 0.01  | +0.154         |
| TN 4300 fig. 7, 3-in., ref. 3              | 2.01 | 13          | 0.901 (x/r 0.849)                                     | 0.01  | +0.363         |
| TN 4300 fig. 7, 4-in., Unitary Plan tunnel | 2.49 | 12          | 0.673 (x/r 0.975)                                     | 0.01  | +0.135         |
| TN 4300 fig. 16(a), 12-in. model A         | 2.0  | 20          | 0.737 (x/r 0.988; read once, A illegible)             | 0.01  | +0.199         |
| TN 4300 fig. 16(b), 12-in. model A         | 2.0  | 15          | 0.924 (station 3)                                     | 0.01  | +0.386         |
| RM L57C18 fig. 5, models B, C, D, F        | 2    | 2 each      | 0.931, 0.887, 0.822, 0.957                            | 0.01  | +0.284 or more |
| TM X-19 fig. 5, 4-in.                      | 2.49 | 15          | 0.565 (x/r 0.975)                                     | 0.01  | +0.027         |
| TN D-5392 table I, model 1                 | 2.49 | 59          | 0.786 (orifice 19, r/R 0.96)                          | 0.012 | +0.246         |
| TN D-5392 table II, model 1                | 4.06 | 59          | 0.584 (orifice 65*, r/R 0.37: B's 0.5844, A's 0.9844) | 0.002 | +0.054         |
| TN D-5392 table III, model 1               | 4.63 | 59          | 0.778 (orifice 19, r/R 0.96)                          | 0.023 | +0.227         |

**Criterion (i), P1, on RM L57C18:** the largest higher reading is 0.987
of p02 (model F, C_p 1.631 on B's calibration), against 1 + a = 1.01;
margin +0.023. **Criterion (iii)** (information only): the face mean
over the radius, zero over the outer fifth, is 0.738 to 0.799 in every
group. It does not test a planar face's margin.

**Disclosed** (from the pairing; no rule changes for them):

- Neither RM L57C18 fig. 5 reading is blind to its table II: both
  readers saw it before reading fig. 5 and say they did not use its
  values. Nothing is set from table II.
- RM L57C18 fig. 5(f), model F: the readers' axis calibrations differ by
  about one minor grid division and all nine points disagree. The
  calibration is not settled: (ii) takes the lower reading, (i) the
  higher.
- The pairing party, printing 0014 to read (af), also saw the record of
  (aa)'s computed check in words. It compared no reading with it.

**Verdict: pass.** P2 holds at every face orifice of every set, model
and Mach number. The least margin is TM X-19's orifice nearest the
corner, x/r 0.975, at +0.027. P1 holds on the one set that tests it.

**What (af) and its addendum would wire** (deferred: see the end of this section):

- the term of 21.1 unchanged, its band the whole gap between the
  physical bounds; the readings set no band and no nominal;
- normal Mach numbers 2.0 to 3.0, refused below 2.0, where no flat face
  is measured;
- sweep to 60 deg with the sweep allowance, labelled an analogy, since
  no swept flat face is measured;
- the face Reynolds number (on the thickness, its normal component) only
  inside the range the paired sets measured, **0.90e6 to 4.32e6**, and
  refused outside it in plain words. The ends of that range:
  - TM X-19's 0.90e6 on its 4.00 in. diameter, as both readers give it.
  - The top is RM L57C18's model D: the free-stream 14e6 per ft both
    give, times the smaller of the paired face diameters, 3.70 in.
    Model C, by the same rule, is 3.79e6.
  - RM L57C18's models B and F are not computed, their face diameters
    not paired.
  - TN 4300 does not widen the range: the per-foot value both readers
    quote is stated for its heat-transfer data, and the two differ on
    whether it applies to the pressure tests.
  - TN D-5392's 1.88e6 lies inside.
- the label names the four sets as tests of the bounds' premises, not
  of the value, and says a planar face's margin at its corners is an
  analogy, not tested.

**Caveats for the reviewer.**

- The top of the Reynolds range rests on RM L57C18's models C and D,
  whose corners are rounded (0.4 and 0.1 in.), not square. That is
  addendum (d) as written. Without them, the range would be TM X-19's
  and TN D-5392's, 0.90e6 to 1.88e6.
- What the pass shows:
  - the bounds' premises hold on measured axisymmetric flat faces, at
    Mach 2.0 to 4.63 and face Reynolds numbers of 0.9e6 to about 4e6;
  - P1 holds on one set only.
- It shows neither the value nor a planar face.
- A hobby fin's face Reynolds number, about 5e4 to 3e5, lies below
  every measured one, so hobby fins stay refused.

**The Reynolds range recomputed, and the wiring deferred (2026-10-27).**
The coordinator's definition of the Reynolds number arrived after this
verdict was committed. It takes the number on free-stream conditions, on
the face height, with the normal component on a swept edge, and converts
each report's basis to it. It is pinned in 0014 section 10.7, under
(af)'s addendum.

The coordinator's ruling:

- the pass stands for the premises, criteria (i) to (iii), which the
  definition does not touch;
- the range above, computed before the definition, does not stand;
- it is recomputed, a set counting only where the readers' paired
  records show its number is on that basis or converts exactly to it.

`apply_af.py` (its rule 6b, added after the first run and kept apart from
the rules fixed before it) gives:

- **TM X-19 and TN D-5392 do not count.** Their numbers are "based on
  the model (afterbody) diameter", and neither reader records the
  conditions they are on.
- **TN 4300 does not count**, as before.
- **RM L57C18 counts** for models C and D. It gives a free-stream value
  of about 14e6 per ft, which both readers record. Times the flat face's
  diameter, which neither reader prints, that is:
  - model C: 3.79e6 or 3.85e6;
  - model D: 4.34e6 or 4.32e6;
  - each pair on A's derived diameter or B's scaled one.
- **The range surely measured is 3.85e6 to 4.32e6.** It runs from the
  larger of model C's numbers to the smaller of model D's.

It differs from the 0.90e6 to 4.32e6 above in two ways. The two sets
that set that range's lower end no longer count. Model C is taken at the
larger of its two diameters. Both ends now rest on models C and D, whose
corners are rounded, not square.

**Coverage.** `af/coverage.test.ts` (output `af/out/coverage.out`) uses
the refusal audit's population, with the same draws as its run. 1220 of
the 8000 cases have square-cut leading edges, and the largest face
Reynolds number among them is 2.9e5. None of the 1220 lies inside the
recomputed range, and none inside the range above either.

**So square-cut leading edges stay unwired, and they stay refused.** The
premises pass. No hobby-scale fin face lies inside the measured Reynolds
range, so wiring is deferred and the term is not wired for zero
coverage. `SQUARE_EDGE_REFUSAL` and the page's words now say so: the bounds' premises are borne out only on flat faces far larger than a model rocket fin's. Extending the range
downward would be the owner's to agree, and nothing here proposes it.

### 21.7 The re-review of 2026-10-27: past 60 deg refused again

The re-review of 5e47532..ef7fc7d found both earlier blocking items and
all eight smaller ones fixed, and (af)'s addendum as asked. It found two
new blocking items.

- **The lower ordering from 60 to 75.1 deg rests on TN 3861 fig. 17,
  read once.** 21.2's front-side estimate uses fig. 17's C_D, and 21.2
  itself says the stagnation pressures alone, and Penland's point alone,
  cannot show the ordering. Fig. 17 was read on 2026-10-21, before any
  entry named it (10.1 names figs. 15 and 16 only). The first (ab)
  addendum named it only afterwards.
- **Beyond 75.1 deg the principle alone does not show the ordering.**
  The page reaches such sweeps (78.45 deg at Mach 5.0); the population
  does not. Mach 5.0 at 78 deg was served from 0.869 of the term.

**What changed.**

- `roundedLeadingEdgeDrag` refuses sweeps beyond 60 deg again, as main
  does. The reason code is `swept-leading-edge`, given first, with the
  term's other reasons beside it. The words say that past 60 deg the
  bounded term waits on two fresh readings of fig. 17, and that beyond
  75.1 deg no yawed cylinder is measured at all (false: fig. 17 has Lord
  and Ulmann's point at 80.1 deg; corrected in section 21.9).
- The bounded term is kept unwired as `roundedLeadingEdgeBeyond60`, and
  a test pins that nothing under `src/` calls it. It refuses beyond 75.1
  deg (`LARGEST_YAWED_SWEEP_DEGREES`) at any Mach number. After the
  pairing it is served again only if 21.2's rule, as the second (ab)
  addendum writes it out, holds on the paired values.
- The page's words for the refusal: "a rounded leading edge's drag is
  measured only up to 60 degrees of sweep", change "less sweep (60
  degrees or less), or a bevelled leading edge".
- `evaluate.ts` mirrors main's counting again: past 60 deg, the sweep
  alone.
- The finned-body and page branches that carry the bounded edge stay. In
  `tests/total/beyond-60-dormant.test.ts` they are reached with the
  served term replaced by the bounded one, so they stay tested for when
  it is served again.

**The smaller items, on the bounded term:**

- Past 60 deg, the lower term's own sweep clause says the allowance is
  carried past 60 deg, where its yawed-cylinder checks end. It no longer
  says "no yawed datum below M_n 1.95 at a served sweep", which is false
  there. The 60 deg term says "at 60 deg of sweep or less".
- The label is shortened from about 2,800 characters to under 1,800.
  It now gives each term's source, band and qualifiers in short form
  rather than its whole label.
- It names fig. 16 beside fig. 15. It says fig. 17's two readings are
  pending and the earlier one is not counted (`TN3861_FIG17_READINGS`).
- The top of the normal Mach range is compared with a relative tolerance
  of 1e-12. Mach 6.0 at 60 deg gives M cos(sweep) = 3.0000000000000004,
  which is now served as 3.0.

**Planted errors.** Seven errors were planted, one at a time, and each
fails a test:

- the refusal past 60 deg dropped;
- the 75.1 deg refusal dropped;
- the exact comparison at Mach 6;
- the lower clause given the upper's words;
- fig. 16 dropped from the label;
- the bounded edge's `bounded` dropped in the total;
- the less-sweep words lost.

**21.2's lower ordering**, its table of crossflow points and its
"check that sets nothing" stand as written, as the record of what was
argued. Their front-side estimates rest on the fig. 17 reading that
does not count. The fresh readings replace them when they are paired.

**Coverage.** The population re-run on d03083d (`docs/research/refusals/out/impact.out`) matches main's run
(`out/2026-10-26-before-bounded-edges/`) line for line, apart from two
labels: the square-cut edge's and the rounded edge's past 60 deg. Totals
are served for 153 of 8000 cases. The refusal "rounded leading edge swept
beyond 60 deg" is back at 3.0% of cases, and the cross-check against
`src/total` agrees on 1200 of 1200. `impact.json` is unchanged. The run
with the bounded edges served is kept in
`out/2026-10-27-bounded-edges-served/`: 153 of 8000 there too.

### 21.8 Fig. 17 read twice: 21.2's rule holds; 60 to 75.1 deg served again (2026-10-27)

TN 3861 fig. 17 was read twice afresh to the brief of the second (ab)
addendum, the second reading blind (d0094f2), and paired by a neutral
party (`docs/research/tn3861-fig17/readers/pairing-2026-10-27/`, 3d7dd16).
All 25 symbols pair and all 25 agree. 21.2's rule, as that addendum
writes it out, is applied by `docs/research/tn3861-fig17/rule/apply.test.ts`
(`out/verdict.txt`). It takes figs. 15 and 16 as read twice for section
16, every combination of the readings, and each pair's envelope against
the claim.

- **The estimate's error e is 0.0233.** It is the largest over TN 2960's
  three cylinders replotted on figs. 16 and 17 (P04, P08, P12), against
  TN 2960's integrated front side on both readings of its fig. 5. The
  reading that does not count gave 0.086, chiefly from its TN 2960
  point near M_c 1.96: 1.50 then against 1.447 now.
- **The 70 deg point is P03.** Each crossed Lord and Ulmann point's
  sweep is 90 deg less asin(M_c / 4.04):
  - P01: 80.1 deg;
  - P02: 74.9 deg (the stated 75 deg point);
  - P03: 69.7 deg;
  - P09: 60.3 deg (the one inside the served sweep, section 16).
- **The three points,** on the lowest combination:

  | Point                         | F over modified Newtonian | Stagnation over Rayleigh's | F over the term | F/MN less e, less the lower bound's end |
  | ----------------------------- | ------------------------- | -------------------------- | --------------- | --------------------------------------- |
  | Lord and Ulmann, 70 deg (P03) | 1.0420                    | 1.0656                     | 1.0774          | +0.1842 (end 0.8345)                    |
  | Lord and Ulmann, 75 deg (P02) | 1.4212                    | 1.4972                     | 1.7896          | +0.6879 (end 0.7100)                    |
  | Penland, 75.1 deg (P06)       | 1.1503                    | 1.1715                     | 1.1474          | +0.1870 (end 0.9400)                    |

  The lower bound's end is the highest over the regimes the term serves
  (here the measured regime). That is stricter than the addendum asks
  for Penland's point, whose Reynolds number TN 3861 states.

- **Verdict: the rule holds.** Rounded leading edges swept beyond 60 deg
  and up to 75.1 deg are served bounded again, with the label naming
  fig. 17 as read twice. Beyond 75.1 deg they stay refused, at any Mach
  number. 21.2's table of crossflow points stands as the record of what
  was argued. Its F values from the reading that does not count (1.053
  and 1.048, 1.445, 1.166 and 1.165 of modified Newtonian) are
  superseded by the table above.

**In the code (section 21.8).**

- `roundedLeadingEdgeDrag` serves the bounded term again from 60 to 75.1
  deg (`beyondSweepLimit`). It is refused beyond 75.1 deg at any Mach
  number.
- `TN3861_FIG17_READINGS` is 2, so the label says fig. 17 was read twice.
- The page's words for the refusal beyond 75.1 deg: "a rounded leading
  edge's drag is bounded only up to 75 degrees of sweep, the most at
  which a swept cylinder has been measured", change "less sweep (75
  degrees or less), or a bevelled leading edge". From 60 to 75.1 deg, a
  case the bounded term refuses keeps "less sweep (60 degrees or less),
  or a bevelled leading edge".
- `evaluate.ts` mirrors the bounded edges again, with beyond 75.1 deg
  refused.
- The tests go back to those of section 21.5 and the review fixes, with
  the 21.7 items kept:
  - the 75.1 deg refusal;
  - the Mach 6 edge;
  - the shortened label;
  - fig. 16 named in the label;
  - the lower clause.
- `tests/total/beyond-60-dormant.test.ts` is gone, since the branches it
  reached are served again.
- Eleven planted errors each fail a test:
  - the claim built from the base alone;
  - the wedge path's `bounded` dropped;
  - the lower term's summary left out of the label;
  - the band text without the bounds' sources;
  - the less-sweep change lost;
  - served beyond 75.1 deg;
  - the exact Mach 6 comparison;
  - the lower clause given the upper's words;
  - fig. 16 dropped;
  - fig. 17 counted as unread;
  - the 75 deg words lost.

**Coverage, merged with main 5921198.** Main's refusal audit now counts
the Von Karman noses the page serves: 181 of 8000 totals. Its run is kept
as the before in `docs/research/refusals/out/2026-10-27-main-5921198/`.
The re-run on the merged head (5e0259e, `out/impact.out`) gives **181 of
8000, unchanged**, and the cross-check against `src/total` agrees on 1200
of 1200.

- "Rounded leading edge swept beyond 60 deg" (3.0% of cases on main)
  becomes "beyond 75.1 deg", at none: no rocket in the population is
  swept that far.
- Most of the cases between 60 and 75.1 deg are still refused for their
  normal Mach number below 1.0 at their sweep (17.5% to 20.0% of cases)
  or their Reynolds number (0.7% to 0.8%).
- The rest have their leading edges served bounded, and every one is
  refused for another part. The sole-blocker shares of fins at the base
  the rebuilt factor does not measure rise slightly, for example 1.52%
  to 1.59% for its sweep refusal.

**Merged with main f88ecbe (A5, fins near the base), 2026-10-28.** Main's
run is kept in `docs/research/refusals/out/2026-10-28-main-f88ecbe/`:
155 totals of 8000. The run on the merged head gives 155 of 8000 too,
and the cross-check agrees on 1200 of 1200. Since A5, no served total
holds a rounded edge swept past 60 deg:

- at the base, the fins-on-base factors measure sweeps of 60 deg or
  less;
- more than a chord ahead, the body base is refused;
- within a chord, the body base is served only at Mach 1.5 to 2.0, where
  M cos(sweep) is below 1.0 past 60 deg.

So the bounded edge is served among a refused total's parts, with its
band and label, and enters no claim. The page test that checked the
claim through a served total now checks the edge among the refused
total's parts, and the claim's words through `boundedReasons` directly.

**Merged with lift-a1 (A1, 0015 section 12), 2026-10-28.** With A1 the
rebuilt fins-on-base factor takes flat plates with a square, unswept
trailing edge at the base at any leading-edge sweep from Mach 1.62
(below it only unswept or swept 45 to 60 deg, 0014 10.7 (z)'s notes), so
the first point above no longer holds there: a plate with a rounded
leading edge swept past 60 deg, at the base, can be served in a total,
the edge bounded as this section says and the body base the flat plates'
bounded value. The edge needs a normal Mach number M cos(sweep) of at
least 1.0, so the lowest Mach number served is 1/cos(sweep), 2.0 at 60
deg and 3.0 at 70.5 deg: such totals lie at about Mach 2.0 to 3.0 for
sweeps of 60 to 70.5 deg, and past 70.5 deg none within Mach 3.0. The
estimate's claim names both bounded parts, the base's reason with the
sweep argument of 0015 sections 4 and 12
(`tests/app/total-drag.test.ts`: a plate swept 66.4 deg at Mach 2.8 on a
3-calibre root chord; in the audit's population, five rockets, 112, 629,
1159, 1317 and 1986, each with three plate fins at the base swept 60.6
to 63.6 deg, at Mach 2.44 to 2.87, as the review of 2026-10-28 traced
them). The page test of the paragraph above, on a plate whose tip chord
is short, is refused at the base for its thickness over the tip chord,
not for its sweep. The other two points stand. (Corrected 2026-10-28:
this note first said "three such plates", miscounting the five rockets,
whose fins number three each; the message of commit eb0a646 has the same
slip and cannot be changed.)

### 21.9 Corrections after the re-review of ef7fc7d..5159cac (2026-10-28)

The re-review passed. It found three statements to correct and one
computation to widen, each made as its own commit after the merge with
main f88ecbe.

- **75.1 deg is not the largest sweep at which a yawed cylinder is
  measured.** The code, the page's words, 0017 and the second (ab)
  addendum said it was. Fig. 17 has Lord and Ulmann's point at 80.1 deg
  (P01, crossflow Mach number 0.695). What is true: 75.1 deg is the
  largest sweep at which a yawed cylinder's front side is estimated and
  the bounds' ordering checked. Fig. 16 has no downstream pressure for
  the 80.1 deg point (both readings of section 16 have three Lord and
  Ulmann points, at crossflow Mach numbers near 1.0, 1.4 and 2.0), so no
  front side is estimated there.
  - The constant is renamed `LARGEST_CHECKED_SWEEP_DEGREES`. Sections
    21.5 and 21.7 name it by its old name, `LARGEST_YAWED_SWEEP_DEGREES`.
  - The refusal's words say what is true.
  - The page says "the most at which its bounds have been checked
    against a measured swept cylinder".
  - 0014 carries a dated correction under the addendum.
- **The square-cut edge's words overstated what was tested.**
  - The page said measurements "bear them out" (the bounds). They bore
    out the bounds' premises, not the bounds. The words now say
    "measurements bear out what they rest on".
  - `SQUARE_EDGE_REFUSAL` said the premises held "at every orifice".
    It now says exactly what was tested: on all four sets, every face
    orifice given a value lay above the sonic pressure (six marks on TN
    4300's figures were given none); and on RM L57C18, the one set that
    tests it, the face lay below the pitot pressure.
  - A test pins the page's words exactly, so inverting "far larger"
    fails it.
- **e was taken on the primaries only.** As ambiguous points keep every
  reading, `docs/research/tn3861-fig17/rule/apply.test.ts` now takes
  every reading either reader states for a fig. 17 point: the
  primaries, the alternatives, and the cross-stroke and bounding-box
  readings. The table of 21.8 is superseded by:

  | Point                         | F over modified Newtonian | Stagnation over Rayleigh's | F over the term | F/MN less e, less the lower bound's end |
  | ----------------------------- | ------------------------- | -------------------------- | --------------- | --------------------------------------- |
  | Lord and Ulmann, 70 deg (P03) | 1.0420                    | 1.0656                     | 1.0774          | +0.1734 (end 0.8345)                    |
  | Lord and Ulmann, 75 deg (P02) | 1.4212                    | 1.4972                     | 1.7896          | +0.6771 (end 0.7100)                    |
  | Penland, 75.1 deg (P06)       | 1.1497                    | 1.1715                     | 1.1465          | +0.1756 (end 0.9400)                    |
  - e is 0.0341, at P08 on B's bounding-box reading (1.458); on the
    primaries it was 0.0233.
  - The verdict does not change: the rule holds at all three points.
    0014 carries a dated note after the verdict entry.
