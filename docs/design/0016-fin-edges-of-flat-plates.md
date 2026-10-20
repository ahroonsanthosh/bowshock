# 0016: The fin edges of flat plates (0014 W3, W4, W11)

- **Status:** Draft. Libraries with tests (`src/base/fin-trailing-edge.ts`,
  `src/fins/rounded-leading-edge.ts`, `src/fins/section.ts`,
  `src/total/finned-body.ts`) and the drag page's section input. The new
  bands rest on first readings where a figure was read for this record
  (RM A55H31 figs. 11 and 12); the independent reader's blind second
  readings (round 6) are pending, and each band becomes the envelope of
  both when they are held beside the first (section 8).
- **Date:** 2026-10-20
- **Inputs:** [0014](0014-refusals.md) W3, W4, W11 and section 10 (what
  sets bands, what is held back, "bounded, not measured", the readings
  owed); [0010](0010-base-drag-and-total.md) sections 5.1, 5.2 and 10 (the
  present trailing-edge and rounded-edge terms); the first readings of
  `docs/research/total-drag/data/fin_edges_w34.md` (with its `.csv`, its
  output and `scripts/w34_*.py`); TR 1109 fig. 29(a), already read twice
  (`src/base/blunt-te-2d.ts`); the population of
  [`docs/research/refusals/`](../research/refusals/README.md).

No held-back set was opened or used for anything here (0014 section 10.1):
not the PARD body's totals (TN 3697 fig. 5, TN 3650 fig. 4, RM L52E06
figs. 9 to 12), not BRL Report 934, not the Eglin set, not TN 3320.

**Result in one line.** Flat-plate fins with a rounded leading edge and a
square trailing edge, tapered and swept, are now served where the data
cover them: the trailing edge's thick-layer limit is lifted from
c / [h Re_c^(1/5)] = 1.0 to 4.5, tapered fins are integrated along the
span, and rounded leading edges are served on plates of any planform,
swept to 60 deg, at normal Mach numbers of 1.49 to 3.0. Refused, with the
reasons of section 6: normal Mach numbers below 1.49 (where most hobby
edges run), swept trailing edges, the trailing edges below Mach 1.5,
square-cut leading edges and rounded trailing edges. The Basic Finner's
numbers are unchanged, bit for bit.

## 1. What is served, and on what

| Item                | Method                                                                                          | Band on the term                                            | Domain                           | Data                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------- |
| W3(a) thick layers  | thin-layer term times K(M, X) = D(X) / D(1.0) on TR 1109 fig. 29(a)                             | 0.93 x K_low to 1.21 x K_high (section 2)                   | X 1.0 to 4.5 at M 1.5 to 3.1     | TR 1109 fig. 29(a), both readings                           |
| W3(b) varying chord | the term integrated along the span (unswept trailing edge)                                      | as W3(a), station by station                                | as the term                      |                                                             |
| W4(a) flat plates   | the rounded wedge's limit, face angle 0: (2/3) Cp_pitot (2r) per span                           | 0.99 to 1.06, as now                                        | as now                           | TN 2960 fig. 5(c) both readings; figs. 5(d), 5(e) as checks |
| W4(b) any planform  | the nose term per unit span times the span (a plate's radius is the same at every station)      | as W4(a)                                                    |                                  |                                                             |
| W4(c) swept         | the independence principle: the front side at M_n = M cos(sweep) on the normal dynamic pressure | 0.98 to 1.14 (0.95 to 1.17 extrapolated in Reynolds number) | sweep to 60 deg, M_n 1.49 to 3.0 | RM A55H31 figs. 11, 12 (one reading)                        |

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
thrust near potential flow's -1/3 on the diameter). The front half's
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

| Figure                               | Readings now | Used for                                                 |
| ------------------------------------ | ------------ | -------------------------------------------------------- |
| TR 1109 fig. 29(a)                   | two (0010)   | W3(a)'s K and band                                       |
| RM A55H31 figs. 11, 12               | one          | W4(c)'s sweep allowance                                  |
| TN 2960 figs. 5(a), 5(b), 5(d), 5(e) | one          | checks of the band and the reasons of W4(d); set nothing |
| RM L52D21 fig. 11                    | one          | the reason W3(c) stays refused                           |

When the second readings of RM A55H31 figs. 11 and 12 arrive they are held
beside the first in `src/fins/rm-a55h31.ts`, the allowance becomes the
envelope of r over both, and the label drops "read once". If the envelope
moves the allowance, the band moves with it; no total has tested it.

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
