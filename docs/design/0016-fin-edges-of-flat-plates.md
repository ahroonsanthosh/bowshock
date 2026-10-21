# 0016: The fin edges of flat plates (0014 W3, W4, W11)

- **Status:** Draft. Libraries with tests (`src/base/fin-trailing-edge.ts`,
  `src/fins/rounded-leading-edge.ts`, `src/fins/section.ts`,
  `src/total/finned-body.ts`) and the drag page's section input. The new
  bands rest on first readings where a figure was read for this record
  (RM A55H31 figs. 11 and 12; NASA CR-149372 figs. 8b and 5, section
  11); the independent reader's blind second readings (round 6) are
  held beside the first and every band is the envelope of both (TN 2960
  in section 13, RM A55H31 and CR-149372 in section 14).
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

## 1. What is served, and on what

| Item                  | Method                                                                                            | Band on the term                                                    | Domain                                     | Data                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------- |
| W3(a) thick layers    | thin-layer term times K(M, X) = D(X) / D(1.0) on TR 1109 fig. 29(a)                               | 0.93 x K_low to 1.21 x K_high (section 2)                           | X 1.0 to 4.5 at M 1.5 to 3.1               | TR 1109 fig. 29(a), both readings                           |
| W3(b) varying chord   | the term integrated along the span (unswept trailing edge)                                        | as W3(a), station by station                                        | as the term                                |                                                             |
| W4(a) flat plates     | the rounded wedge's limit, face angle 0: (2/3) Cp_pitot (2r) per span                             | 0.99 to 1.06, as now                                                | as now                                     | TN 2960 fig. 5(c) both readings; figs. 5(d), 5(e) as checks |
| W4(b) any planform    | the nose term per unit span times the span (a plate's radius is the same at every station)        | as W4(a)                                                            |                                            |                                                             |
| W4(c) swept           | the independence principle: the front side at M_n = M cos(sweep) on the normal dynamic pressure   | 0.97 to 1.14 (0.94 to 1.17 extrapolated in Reynolds number)         | sweep to 60 deg, M_n 1.49 to 3.0           | RM A55H31 figs. 11, 12 (two readings)                       |
| W4(e) M_n 1.0 to 1.49 | plates: the term times kappa(M_n), the cylinder's front side over modified Newtonian (section 11) | the bracketing nodes' range (section 11); swept, times 0.96 to 1.14 | plates and rounded wedges, M_n 1.0 to 1.49 | NASA CR-149372 figs. 8b, 5 (two readings); TN 2960 at 1.49  |

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
| 2.5 | 3.3 | 0.866     | 0.815 to 0.910 | 0.88 to 1.27                     |

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
Converted to gauge pressure with fig. 11's stagnation ratio and the
unyawed shape integral of table II, and divided by the model's ratio,
cos^3(L) Cp_pitot(M cos L) / Cp_pitot(M), each point gives r, measured over
modelled relative to the unyawed cylinder:

| Source, yaw         | M_n  | r     | Used                                                                                      |
| ------------------- | ---- | ----- | ----------------------------------------------------------------------------------------- |
| RM A55H31, 30.1 deg | 3.37 | 1.067 | yes                                                                                       |
| RM A55H31, 45.1 deg | 2.75 | 1.120 | no: at R 2.1e3, below the 6.7e3 floor; the report suspects three-dimensional flow (p. 14) |
| RM A55H31, 60.1 deg | 1.94 | 1.226 | no: the same suspicion                                                                    |
| Penland, 14.4 deg   | 6.64 | 0.998 | yes                                                                                       |
| Penland, 29.6 deg   | 5.96 | 1.007 | yes                                                                                       |
| Penland, 45.2 deg   | 4.83 | 1.034 | yes                                                                                       |
| Penland, 59.9 deg   | 3.44 | 0.990 | yes                                                                                       |
| Penland, 75.5 deg   | 1.72 | 0.866 | no: an end effect (TN 3861 p. 10)                                                         |

The points set apart are set apart by the reports' own statements, made
before any of this, not by their values. Over those used, r is 0.990 to
1.067, so **the sweep allowance is 0.99 to 1.07** (rounded outward) and
the band on a swept edge is TN 2960's times it, rounded outward: **0.98 to
1.14**, and **0.95 to 1.17** where extrapolated in Reynolds number. Had
the three been kept, the high end would be 1.30 or more. The allowance is
the larger of the two effects the checks cannot separate: the
independence principle's own error, and the modified-Newtonian ratio's
drift from M to M_n (TN 2960: 0.995 to 1.056 over 1.49 to 2.90).

**Served to 60 deg of sweep**, the largest yaw among the points used
(59.9 deg); beyond it the only point is affected by an end effect.
Penland's ratios in RM A55H31 were formed on RM L54A14, before TN 3861
corrected its 90 deg data for a local Mach-number variation (p. 7), by an
amount neither report states; TN 3861's own polar plot (fig. 5) is too
coarse at low incidence to integrate (`fin_edges_w34.md` section 4).

**Label:** the rounded edge's, with "swept S deg: the independence
principle, the front side at the normal Mach number on the normal dynamic
pressure, checked on yawed cylinders (RM A55H31 figs. 11, 12, read once,
the second reading pending), the band widened by 0.99 to 1.07 for it".
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
them.

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

| M_n  | kappa              | Range          | From                                                  |
| ---- | ------------------ | -------------- | ----------------------------------------------------- |
| 1.0  | 0.762              | 0.751 to 0.770 | CR-149372 fig. 8b                                     |
| 1.1  | 0.831              | 0.818 to 0.839 | CR-149372 fig. 8b                                     |
| 1.2  | 0.897              | 0.883 to 0.906 | CR-149372 fig. 8b                                     |
| 1.49 | 1 (the term above) | 0.99 to 1.06   | TN 2960's band (its readings at 1.49: 0.994 to 1.002) |

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
Mach number. Its checks reach down to M_n 3.37 only, so below 1.49 the
allowance is extrapolated in normal Mach number and widened to twice its
measured deviation from 1: **0.98 to 1.14** in place of 0.99 to 1.07,
labelled "the sweep allowance extrapolated in normal Mach number". (At
M_n just above 1 the bow shock stands far off a cylinder, so the root and
the tip reach further along a finite edge; that is the analogy's gap of
section 5, not represented.) The hobby example's fins (three 3 mm plates,
root 120 mm, tip 48 mm, span 80 mm, 42 deg, on a 54 mm body at sea
level), refused at M 1.8 before, now give 0.161 (0.141 to 0.212) at M 1.8
(M_n 1.34) and 0.131 (0.121 to 0.166) at M 1.5 (M_n 1.11), both
extrapolated in Reynolds number.

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
