# 0010: Base drag and the total, and the Basic Finner gate (draft)

- **Status:** Draft. Libraries with tests (`src/base/`, `src/total/`, and
  additions to `src/fins/`); nothing on the drag page. Steps B3, B4's
  rounded-edge term and B5 of [0008](0008-total-drag.md), whose rules
  (section 6.1) govern everything here.
- **Date:** 2026-10-19
- **Inputs:** 0008 sections 3, 4.1, 6.1 to 6.4 and its data files
  (`docs/research/total-drag/data/`: `love_tn3819_fig18.csv`,
  `love_fig35_tn3819.csv`, `love_fig35_factor.csv`,
  `basic_finner_ada636861.md` and `.csv`, `base_sources.md`,
  `validation_candidates.md`, `blunt_te_2d_base.md` and `.csv`,
  `le_bluntness.md` and `.csv`); the round-1 audit's fig. 18 table
  (`audit/readings/tn3819_fig18.csv`); the round-3 second readings of TN 3819
  figs. 35 and 18 (`audit/round3/`); [0007](0007-skin-friction.md) and
  `src/friction/`; [0009](0009-fin-wave-drag.md) and `src/fins/`;
  [0006](0006-shock-fitting.md) for the nose band;
  [0002](0002-architecture.md) section 12.

Every number below is asserted by a committed test named with it, or
printed by a run kept in
[`docs/research/base-and-total/`](../research/base-and-total/README.md).

**Result in one line.** Pending: the second gate run (section 4.2) waits
for the independent reader's report. The first run was refused at all 11
shots for the two fin-edge terms (section 6); both are now implemented,
with the choices of section 5 fixed before the second run.

## 1. B3: base drag (`src/base/`)

### 1.1 The compiled curve

`tn3819-fig18.ts` holds TN 3819 fig. 18 as data: the two near-coincident
compiled curves at 25 Mach numbers from 1.0 to 3.5 (the round-1 audit's
table, which 0008 adopts; it contains 0008's 16 curve rows exactly), the
twelve tunnel symbols with their two readings, Herrin and Dutton's range,
and every second reading of a curve value as a separate check. A further
reading is added as data; the band and the tests follow it.

Which curve is served: Love's basic curve, the less negative. The audit
identified it by its leader; fig. 35's no-fin estimate reproduces it
within 0.001; the fins-on-base factor is defined against it, and against
the more negative (Chapman) curve that factor would be 2% to 3.5% too
small (round 3, section 4.2), so it must be applied to this curve and to
no other. The band (1.2) contains every data point against either curve,
and the more negative curve lies within 1.036 times this one.

Readings (`compiled-curve.test.ts`): 27 second readings (13 robust-fit
confirmations from 0008, 14 round-3 values) all agree with the adopted
values within their combined reading errors, the largest difference
0.0013 (round 3's merged bundle at M 3.243). Both curves are now read
twice at all ten ratio Mach numbers from 1.5 to 3.5; round 3 is the same
reader as round 1 with a different calibration and new columns, not a
different person. **One reading only:** the rows at M 1.0, 1.2, 1.4, 1.503,
1.6, 1.8, 2.009, 2.2, 2.4, 2.418, 2.6, 2.8, 3.2 and 3.5 (both curves).

Interpolation: linear in M. It reproduces every tabulated value, adds no
extremum, and its error is at most (M - a)(b - M)/2 times the largest
|P_B''| between nodes a and b. That curvature is estimated from the
twice-read values only (largest second divided difference over
consecutive twice-read nodes, nodes closer than 0.03 merged): 0.0634. The
bound is at most 3.2e-4 in P_B over M 1.5 to 3.0 (0.2% to 0.3% of P_B)
and 0 to 2.4e-4 at the gated shots; it is carried in the band. Check:
every single-read value in M 1.5 to 3.0 lies within the bound (at its
neighbours' spacing) of the line through its neighbours, the largest
excess 4e-5, below the reading error. A smoother interpolant would gain
little: the bound is a third of the curve's reading error (+-0.001).

### 1.2 The band

Recomputed from the data as 0008 computes it (data over curve, both
readings, both curves, each curve at the point's Mach number): tunnel
symbols 0.856 to 1.078, Herrin and Dutton 0.824 to 0.885; envelope 0.8237
to 1.0783, rounded outward to **0.82 to 1.08**, 0008's band. The low end
rests on one visual reading of a slide (Herrin and Dutton via Tucker,
+-0.01 in p_b/p_inf, which is about +-0.02 in the ratio and is not in the
band, as 0008's reading rule does not add reading errors), whose support
is not verified; the high end on the tunnel symbol at M 3.243, above the
range served (round 3 reads 1.072 against its own bundle there; the
adopted value stands since the readings agree). Labelled "correlation ...
estimated on its tunnel points and Herrin and Dutton, tested only in the
total".

### 1.3 The fins-on-base factor

`tn3819-fig35.ts` holds both readings of fig. 35's free-flight line (0008's
first reading, M 1.80 to 2.85 with 0008's extrapolation to 3.0 flagged; the
round-3 reading, M 1.1 to 2.99), both readings of the three tunnel pairs,
and each reading's stated error. `fins-on-base.ts` builds 0008's band at
every Mach number where some reading exists, as the envelope over the
readings: low end, half the 10%-thick increment (TN 2360's 5%-thick fins);
high end, the larger of the free-flight factor plus its error and the
tunnel factor; nominal, the midpoint. Two changes from 0008, both taken
from the round-3 readings and adopted on their evidence, not on any gate data:

1. **The tunnel excess carried to Mach 3.** 0008's high end fell from 1.37
   at M 2.4 to 1.29 at 2.5 only because the tunnel pairs stop at 2.41,
   though the tunnel factor exceeds free flight at all three tunnel Mach
   numbers: by 0.140 at M 1.50 (against round 3's reading of the line,
   the only one there), 0.072 at 2.00 and 0.113 at 2.41. Beyond 2.41 the
   high end is the free-flight factor plus the largest of these (round 3,
   section 4.1, option b, the conservative choice).
2. **The identity-swap error.** At M 1.75 to 2.35 the free-flight line runs
   0.003 to 0.005 from estimate B, and neither reading can tell them apart
   from the scan (both identified the line the same way, from the text
   and the leaders), so the reading error there is at least +-0.005,
   which covers a swap of the two lines. It widens the low end at M 2.2
   and 2.3 (1.101 against 0008's 1.112).

| M    | Low   | High  | Half-width | 0008's band    | Readings |
| ---- | ----- | ----- | ---------- | -------------- | -------- |
| 1.80 | 1.236 | 1.537 | 10.8%      | 1.237 to 1.537 | 2        |
| 2.00 | 1.140 | 1.387 | 9.7%       | 1.141 to 1.387 | 2        |
| 2.20 | 1.101 | 1.378 | 11.2%      | 1.112 to 1.377 | 2        |
| 2.40 | 1.120 | 1.371 | 10.1%      | 1.120 to 1.367 | 2        |
| 2.50 | 1.127 | 1.411 | 11.2%      | 1.127 to 1.288 | 2        |
| 2.60 | 1.133 | 1.425 | 11.4%      | 1.133 to 1.302 | 2        |
| 2.80 | 1.144 | 1.448 | 11.7%      | 1.144 to 1.327 | 2        |
| 2.90 | 1.148 | 1.457 | 11.9%      |                | 1        |
| 2.97 | 1.146 | 1.463 | 12.1%      | 1.150 to 1.341 | 1        |
| 3.00 | 1.147 | 1.465 | 12.2%      | 1.151 to 1.343 | 0        |

(Half-width: of the midpoint. Readings: of the free-flight line, not
counting extrapolations; at 2.9 and 2.97 round 3 alone, at 3.0 both are
extrapolated, round 3's by 0.01 in M. Every row is in `base-rows.out`.)
Checks (`fins-on-base.test.ts`): from the first reading alone, without the
two changes, the rows reproduce 0008's `love_fig35_factor.csv` within
6e-4 (2.3e-3 at M 2.6, where 0008 interpolated the no-fin curve past the
table's M 2.6 value); from round 3's reading alone, its recomputation
within 2e-3; the two readings of the line agree within 0.0003, inside
their combined errors. The half-width is at most 12.2%, against 0008's
"at most +-11%".

Labels, as 0008 sets them: on circular-arc fins "correlation: fins-on-base
factor measured on circular-arc fins (TN 3819 fig. 35)"; on any other
section, the Basic Finner's wedges with blunt trailing edges among them,
"an analogy, not a measurement: the fins-on-base factor measured on
circular-arc fins (TN 3819 fig. 35), applied by analogy to these fins (0008
section 3.4)". Refused: fin counts other than four; thickness ratios
outside 0.05 to 0.10; Mach numbers outside M 1.80 to 3.0. One interpretation:
a Mach number below 1.80 by no more than the figure's abscissa reading
error (0.002, round 3) takes the 1.80 row, flagged; this admits the gated
shot at M 1.799.

### 1.4 Body base drag and refusals

`base-drag.ts`: C_D = -P_B F (A_base / A_ref), its band the linear sum of
the curve's band on the term, the interpolation bound, and the
fins-on-base band, (F_low - F) and (F_high - F) times -P_B (0008 section
6.3). Fins with trailing edges at the base take the factor; fins one root
chord or more ahead take the plain curve, labelled not validated with fins
(0008 section 6.4); in between they are refused (TN 2360's variation not
transcribed). Refused with a message (`BaseRefusal`, with a reason): Mach
numbers outside 1.5 to 3.0, afterbodies other than cylinders, a laminar
layer at the base, and the fins' conditions of 1.3.

### 1.5 The fins' trailing-edge base

The two-dimensional base pressure of blunt trailing edges, 0008's method
for this term (section 3.4, B3), is now transcribed once and implemented
(`src/base/blunt-te-2d.ts`, `src/base/fin-trailing-edge.ts`). Its model,
band, refusals and input band, and the choices behind them, are in
section 5.1. The first gate run refused the term (section 6).

## 2. Single wedges in `src/fins/`

The Basic Finner's fins are single wedges from a sharp leading edge to a
blunt trailing edge, which `src/fins/` refused. A section may now declare a
blunt trailing edge (`singleWedge`, `bluntTrailingEdge: true`); its wave
drag is that of the faces alone (in supersonic flow nothing behind the
trailing edge reaches them), the base being 1.5's term. Undeclared
thickness at x = 1 stays refused, and a rounded leading edge is the
separate term of section 5.2.
(`blunt-trailing-edge.test.ts`; the existing fin tests pass unchanged.)

- 2D: the exact face drag equals the oblique-shock pressure on both faces
  by hand within 1e-15, with no reflected wave; Ackeret's is t^2 / beta.
- 3D: on a rectangle of chord c and span s the linear ratio is
  1 - c / (2 pi beta s) while beta s >= c (the tip-cone pressure of a
  constant-slope sheet, already a test in 0009, integrated over the tip's
  cone; the root is a plane of symmetry): matched within 2e-6 and within
  the result's own error estimate at six cases, M 1.5 to 3, span 0.5 to 2.
  For the Basic Finner's fins that is 0.894 at M 1.8 to 0.944 at 3.0: a
  blunt trailing edge does not cancel the tip loss as a closed section on
  this rectangle does (ratio 1).

## 3. The total (`src/total/`)

`total-drag.ts` combines components linearly, as 0008 section 6.3
requires: each component carries the lowest and highest C_D its band
allows, the total's band is their sum (a minimum), and the input bands
stay apart from it. A refused component refuses the total
(`TotalDragRefusal`, which lists every refusal). `finned-body.ts` builds
the components of a body with a nose, a cylinder to a flat base and a set
of fins, all on the cylinder's cross-section:

| Component              | Model                                                                                                 | Band                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Nose wave drag         | given; `nose.ts` for a sharp cone: Taylor-Maccoll, exact                                              | given; for the cone the fitted solver's floor, 7e-5 (0006)               |
| Body friction          | van Driest II, momentum integral, adiabatic (0007)                                                    | 0.88 to 1.19 (0007)                                                      |
| Fin friction           | van Driest II plates of the local chord, both faces                                                   | fins' own drag, 1.01 to 1.59 (0008 section 4.3)                          |
| Fin leading edges      | rounded and unswept: the nose of the tangent geometry at modified-Newtonian pressure (section 5.2)    | 0.99 to 1.06 (TN 2960), widened by +-0.03 where extrapolated in Reynolds |
| Fin wave drag          | exact section drag times the linear 3D ratio (0009); with a rounded edge, the faces on their own rise | the fins' own drag band, plus the quadrature error                       |
| Body base              | compiled curve times the fins-on-base factor (section 1)                                              | 0.82 to 1.08, interpolation, fins-on-base band                           |
| Fin trailing-edge base | blunt, unswept, turbulent: thin-layer two-dimensional base pressure at M_inf (section 5.1)            | 0.93 to 1.21                                                             |

Fin friction carries B4's band only and body friction 0007's, so each is
counted once. Input bands: transition (a laminar run to each Re_T given,
from the tip and from each fin's leading edge, against fully turbulent; a
laminar layer at the base refuses the base; where a fin is laminar at its
blunt trailing edge, the trailing-edge term's laminar-against-turbulent
change is a further band, section 5.1), wall temperature (from adiabatic to
the temperature given: 0007's band is measured on adiabatic walls only, so
this change is van Driest II's and the laminar solution's prediction, not
validated), roughness (smooth by default, no band; otherwise a band the
caller supplies with its source, since no roughness model is validated in
bowshock). Refused besides src/base's and src/fins's refusals: a rounded
leading edge on anything but a single-wedge fin of constant chord, and a
blunt trailing edge on a fin of varying chord. Not represented: the fin
roots' share of the body's wetted area (0.59% of it on the Basic Finner,
4e-4 in C_D), fin-body interference, the Mach number ahead of the base (the
free stream's, fig. 18's abscissa for cylindrical afterbodies), fin cant
and roll, nose-tip bluntness, and the rounded edge's effect on the fin
faces (section 5.2). Tests: `tests/total/total-drag.test.ts` (each
component against an independent computation, the arithmetic, the inputs,
the refusals).

## 4. B5: the Basic Finner gate

The gate has been run twice. The first run (section 6, kept as history)
was refused, because the two fin-edge terms had no method with a measured
band. This section is the second run, made once, after both terms were
implemented with the choices of section 5, written and ruled on before
it.

### 4.1 The configuration and its interpretations

As transcribed (`src/validation/basic-finner.ts`):

- a 20 deg cone, half-angle 10 deg, its length 0.5 / tan(10 deg) = 2.836 cal
  (fig. 2 prints 2.84; the half-angle atan(0.5 / 2.84) = 9.985 deg would
  lower the cone's drag by 0.24% to 0.25%, 2.2e-4 to 2.7e-4 in C_D);
- a cylinder to 10.0 cal;
- four rectangular fins, 1 cal chord and span, trailing edges at the base;
- single wedges with the leading edge rounded to the report's 0.004 cal
  ("very sharp with a radius 0.004 cal", p. 3), in the tangent geometry of
  section 5.2, to a blunt trailing edge 0.08 cal thick;
- the trailing edge's spanwise thickness, and so its area (0.32 or 0.16
  cal^2, "conical in shape", p. 3): as decided by the independent reader
  from the report's geometry (section 5.1);
- the 0.004 cal meplat of the nose neglected (at pitot pressure it would
  add 1.0e-4 in C_D);
- fin cant (0, 2 and 4 deg) not modelled; the report finds no effect on
  CX0.

Conditions: per shot, the Mach number and the Reynolds number on 0.300 m
(Table V), so 1/10 of it per caliber; the static temperature 293.95 K from
the range's speed of sound, 343.7 m/s (Table V gives 343.4 to 344.0, which
changed no value at the fourth decimal in the first run). The nose drag is
the exact Taylor-Maccoll value with the fitted solver's floor as its band
(the fitted solver was not run). Transition: 0008's input, a laminar run
to Re_T = 5e5, 1.6e6 and 3e6 against fully turbulent (at 3e6 the fins, Re_c
1.19e6 to 1.98e6, are laminar throughout, so the trailing-edge laminar
band applies at every shot). Wall temperature: not stated by the report. A
model launched at the range's air temperature can only be heated by the
flow, toward the recovery temperature (463 K at M 1.80, 756 K at M 2.97),
so its wall lies between the two unless the gun heated it, which the
report does not discuss. The wall is taken adiabatic (0007's condition)
with an input band to the air temperature, the cold end.

The gate's tolerance is 0008's (sections 6.2 B5 and 6.3), on the residual
CX0 / modelled - 1: the linear sum, over the modelled total, of every
component's model-form band (the fins-on-base and fin-edge bands
included), the input bands for the unknown transition (friction, low side;
the trailing edges' laminar band, both sides) and wall temperature (high
side), and the shot-to-shot spread of the shot's Mach cluster (-3.3% to
+2.0%, -2.2% to +3.4%, -7.6% to +4.5%, -1.2% to +1.2%). A shot passes
when its residual lies inside its tolerance; a failed shot refuses the
configuration (0008 section 6.1).

### 4.2 The second run

**Pending.** The run waits for the independent reader's report (the
trailing-edge area and the second readings of the edge data); it will be
made once and reported here as it comes out, pass or fail.

## 5. The fin-edge terms: the choices made before the second run

Every choice below was made from geometry, physics and the component data
alone, written here and ruled on by the coordinator (2026-10-19) before the
second gate run, and is not revisited after it. The Basic Finner's drag
was used for none of them; its geometry and Reynolds numbers were used
where stated.

### 5.1 The trailing edges (`src/base/fin-trailing-edge.ts`)

Data: `src/base/blunt-te-2d.ts`, transcribed from
`docs/research/total-drag/data/blunt_te_2d_base.csv` and held to it by
`tests/base/fin-trailing-edge.test.ts`. **Every value has one reading**
(TN D-1056 table II typed once); the second readings are the independent
reader's.

- **Nominal.** C_D = -P_B(M) n h s / A_ref, P_B the thin-layer
  two-dimensional curve, RM A51J25 fig. 7's mean curve at M' = M_inf
  (flat-sided sections), linear in M. This is 0008's method (section 3.4,
  B3). No interpolation band is added: the band's evidence (the X-15
  points, RM A51J25's symbols) was formed against this same interpolated
  curve at each point's own Mach number. TN 3819 fig. 5's line A
  reproduces the curve within 0.987 to 1.018, a reading check.
- **Band, 0.93 to 1.21** on the term, measured over modelled: the
  envelope of the evidence 0008 lists, recomputed from the tables: TR 1109
  fig. 8's symbols about their curves 0.969 to 1.082, fig. 29(a) against
  fig. 8 (orifice position) 0.933 to 1.010, RM A51J25 fig. 7's 11 symbols
  at M' 1.45 to 3.2 0.961 to 1.067, and the X-15 fin's 18 points at M 1.52
  to 3.24 0.934 to 1.201 (the research note counts 19; table II has 18
  power-off rows there). Rounded outward, the high end is 1.21: 0008's
  "about 1.20" would be narrower than the X-15's own point. Domain M 1.5
  to 3.2.
- **Label.** For edges in the body's base plane, as on fins at the base:
  "an analogy, not a measurement", since no opened source measures such
  an edge (0008 section 3.4).
- **Refused:** swept trailing edges (base pressure 20% to 50% higher at M
  1.41 and 1.96 with 45 deg of sweep, RM A51J25 p. 17); a laminar layer at
  the trailing edge as the nominal state; thick layers, c / [h Re_c^(1/5)]
  > 1.0, because up to 1.0 TR 1109 fig. 29(a)'s base drag lies within
  > 0.4%, 1.4% and 1.8% of its lowest-abscissa value at M 1.5, 2.0 and 3.1,
  > while by 4.5 it has fallen 11.8%, 15.0% and 29.3%, which the thin-layer
  > curve does not carry. The Basic Finner's fins sit at 0.69 to 0.76 (c / h
  > 12.5, Re_c 1.19e6 to 1.98e6).
- **Laminar input band**, in place of 0008's fixed -13% to +26%, which was
  computed at two read points (0.75 and 0.010) for the whole range of
  Reynolds numbers and is superseded. When a transition input leaves a fin
  laminar at its trailing edge (Re_T at least Re_c), the term changes by
  the laminar over turbulent base drag of TR 1109 fig. 29: laminar (29(b))
  at c / [h Re_c^(1/2)] over turbulent (29(a)) at c / [h Re_c^(1/5)], for
  the shot's own Re_c, at each of M 1.5, 2.0 and 3.1, and the band is the
  envelope over the three (the ratio changes sign between them, 1.26,
  0.87, 0.94 at the read points, so it is not interpolated in Mach number).
  Where an abscissa lies beyond a curve's read range by at most one read
  interval, the value is the envelope of the end value and the end
  interval's linear extrapolation, flagged; further out the input is
  refused. For the Basic Finner the laminar abscissa is 0.0089 to 0.0115,
  below the first read point (0.010) at M 1.5 and 2.0 for Re_c above
  1.56e6, and the turbulent one 0.688 to 0.762, below M 3.1's first point
  (0.75) for Re_c above 1.29e6; those shots are flagged.
- **Area.** The trailing edge's thickness along the span, so its area,
  0.32 cal^2 (0.08 cal across the span) or 0.16 (tapering to the tip), is
  taken as the independent reader decides it from the report's geometry.
  The library holds a uniform thickness along the span; a taper would put a
  thick layer near the tip and change the fins' section along the span,
  which `src/fins/` does not represent, and would be refused there.

### 5.2 The leading edges (`src/fins/rounded-leading-edge.ts`)

Data: `src/fins/tn2960.ts`, from `le_bluntness.csv`, **one reading** (the
second is the independent reader's).

- **Geometry.** The faces are tangent to the leading-edge circle (radius
  r, its front at x = 0) and pass through the trailing-edge corners (c,
  +-h): h cos(delta) - (c - r) sin(delta) = r. For the Basic Finner (r =
  0.004, h = 0.04, c = 1) delta = 2.070 deg, against 2.291 deg for a sharp
  wedge through the same corners; the faces start at x = 0.0039 and rise
  0.0360 each. **A consequence of the geometry: the faces' exact wave drag
  falls by 19.1% to 19.2% at M 1.8 to 3.0** against the sharp wedge
  (0.808 to 0.810 of it; Ackeret's slope squared alone gives 0.816).
- **The nose term.** The circle's front side up to the tangent points at
  modified-Newtonian pressure, Cp_pitot cos^2(phi): per unit span Cp_pitot
  r 2 (cos(delta) - cos^3(delta) / 3), which is (2/3) Cp_pitot (2r) to
  within 1e-6. Band **0.99 to 1.06**: TN 2960's front side (fig. 5(c), 0 to
  90 deg, trapezoid rule) over (2/3) Cp_pitot, 0.995, 1.049, 1.056 at M
  1.49, 1.98, 2.90 (the integrals reproduce fig. 7's totals within 0.985
  to 1.001), rounded outward.
- **The faces.** Their wave drag is the exact two-dimensional drag of a
  wedge at delta on their own rise, times the linear 3D ratio of the
  planform (0009; the faces' sheet is taken from x = 0, a 0.4% shift of
  the chord). They keep the fins' own-drag band.
- **What is not modelled, the analogy.** The nose's effect on the faces:
  its entropy layer and the overexpansion behind the shoulder, where the
  cylinder has a separated wake and the fin has its faces. No opened
  source measures it; the term is labelled "an analogy, not a
  measurement".
- **Domain.** TN 2960 covers M 1.49 to 2.90 and Re_D 1e5 to 1e6 (no
  Reynolds-number effect found there). Accepted beyond it, on RM A55H31's
  statement (pp. 13 to 14) that the front-half pressure distribution, as a
  ratio to the impact pressure, is a unique function of azimuth over Re
  6.7e3 to 1.4e5 and M 2.48 to 6.86: M up to 3.0, and Re_D down to 6.7e3 at
  M 2.48 and above, with the same band. Below M 2.48 no measurement covers
  Re_D near 1e4: there the band is widened by **+-3% of the term**, an
  allowance for an unmeasured regime set from the boundary-layer
  displacement scale (about 1% to 2% of D at Re_D 1e4, doubled), not from
  data, and the term is labelled "extrapolated in Reynolds number". The
  Basic Finner's edges have Re_D 0.95e4 to 1.58e4 (Table V's Reynolds
  numbers, D = 0.008 cal): its six shots at M 1.80 to 2.41 are
  extrapolated in Reynolds number, its five at M 2.66 to 2.97 covered by
  RM A55H31.
- **Refused:** swept leading edges (no swept-cylinder data at M 1.5 to 3;
  RM A55H31's eq. (14) would be an untested theory there), M below 1.49
  or above 3.0, Re_D below 6.7e3, and sections other than a single wedge
  of constant chord.

## 6. History: the first run (refused)

The first run, made before the fin-edge terms existed, is kept as it was
reported (its numbers are held by the first version of
`tests/validation/basic-finner.test.ts`, commit 3d9978a, and its runner by
`docs/research/base-and-total/runs/gate-table.test.ts`). Its leading edges
were modelled as sharp in the components (a sharp wedge through the
trailing-edge corners); section 5.2 replaces that.

### 6.1 The verdict

The total is refused at every gated shot, for two components
(`basic-finner.test.ts`):

- the fins' trailing-edge base: no two-dimensional base pressures
  transcribed then;
- the fins' leading edges: a radius of 0.004 cal, refused as blunt (0008
  B4); with the leading edges taken as sharp, as 0008 describes them, the
  total is still refused for the trailing edges.

**So the gate fails, and the configuration is refused** (0008 section
6.1). No band was widened and nothing was tuned on these shots. The five
shots at M 1.06 to 1.33 (reported, not gated) are refused as well: the
base correlation stops at M 1.5, the fins-on-base factor at 1.8, and
below M 1.2 the fins' shock detaches.

### 6.2 Diagnostic: the partial sum

Not a total and not a result to serve: the sum of every component that
has a band, with each shot's residual against it, CX0 / partial - 1, so
that what is missing is measured. Components (adiabatic wall; body base
with the nominal factor F; all on the cross-section):

| M     | Nose   | Body friction | Fin friction | Fin wave drag | Body base | F (band)               |
| ----- | ------ | ------------- | ------------ | ------------- | --------- | ---------------------- |
| 1.799 | 0.1105 | 0.0804        | 0.0360       | 0.0204        | 0.2177    | 1.387 (1.237 to 1.537) |
| 1.846 | 0.1090 | 0.0791        | 0.0355       | 0.0198        | 0.2085    | 1.353 (1.212 to 1.495) |
| 1.850 | 0.1088 | 0.0792        | 0.0355       | 0.0197        | 0.2077    | 1.350 (1.209 to 1.491) |
| 2.348 | 0.0968 | 0.0688        | 0.0309       | 0.0150        | 0.1554    | 1.242 (1.111 to 1.373) |
| 2.364 | 0.0965 | 0.0686        | 0.0308       | 0.0149        | 0.1545    | 1.243 (1.113 to 1.373) |
| 2.414 | 0.0956 | 0.0675        | 0.0303       | 0.0146        | 0.1516    | 1.247 (1.121 to 1.373) |
| 2.663 | 0.0917 | 0.0632        | 0.0285       | 0.0132        | 0.1408    | 1.285 (1.136 to 1.433) |
| 2.741 | 0.0906 | 0.0618        | 0.0278       | 0.0128        | 0.1373    | 1.291 (1.141 to 1.441) |
| 2.749 | 0.0905 | 0.0617        | 0.0278       | 0.0127        | 0.1369    | 1.292 (1.141 to 1.442) |
| 2.969 | 0.0878 | 0.0580        | 0.0261       | 0.0118        | 0.1272    | 1.304 (1.146 to 1.462) |
| 2.970 | 0.0878 | 0.0580        | 0.0262       | 0.0118        | 0.1272    | 1.304 (1.146 to 1.463) |

Per shot (residual with the wall adiabatic, and in brackets at the air
temperature; tolerance on the residual without, and in brackets with, the
wall-temperature band; gap = CX0 minus the partial sum):

| Shot       | M     | CX0   | Partial sum (band)        | Transition | Wall    | Residual        | Tolerance               | Gap    |
| ---------- | ----- | ----- | ------------------------- | ---------- | ------- | --------------- | ----------------------- | ------ |
| DA95021318 | 1.799 | 0.594 | 0.4651 (0.3932 to 0.5547) | -0.0301    | +0.0155 | +27.7% (+23.6%) | -25.2% to +21.3% (24.6) | 0.1289 |
| DA95021529 | 1.846 | 0.598 | 0.4518 (0.3833 to 0.5381) | -0.0292    | +0.0160 | +32.4% (+27.8%) | -24.9% to +21.1% (24.6) | 0.1462 |
| DA95021308 | 1.850 | 0.567 | 0.4509 (0.3827 to 0.5370) | -0.0292    | +0.0160 | +25.7% (+21.4%) | -24.9% to +21.1% (24.6) | 0.1161 |
| DA95021328 | 2.348 | 0.500 | 0.3669 (0.3144 to 0.4362) | -0.0235    | +0.0204 | +36.3% (+29.1%) | -22.9% to +22.3% (27.8) | 0.1331 |
| DA95020907 | 2.364 | 0.478 | 0.3654 (0.3134 to 0.4341) | -0.0234    | +0.0206 | +30.8% (+23.8%) | -22.8% to +22.2% (27.8) | 0.1126 |
| DA95021317 | 2.414 | 0.473 | 0.3596 (0.3094 to 0.4263) | -0.0228    | +0.0209 | +31.5% (+24.3%) | -22.5% to +21.9% (27.7) | 0.1134 |
| DA95020927 | 2.663 | 0.446 | 0.3373 (0.2885 to 0.4014) | -0.0209    | +0.0226 | +32.2% (+23.9%) | -28.2% to +23.5% (30.2) | 0.1087 |
| DA95020906 | 2.741 | 0.400 | 0.3303 (0.2825 to 0.3931) | -0.0203    | +0.0230 | +21.1% (+13.2%) | -28.2% to +23.5% (30.5) | 0.0697 |
| DA95020916 | 2.749 | 0.452 | 0.3297 (0.2819 to 0.3924) | -0.0203    | +0.0231 | +37.1% (+28.1%) | -28.2% to +23.5% (30.5) | 0.1223 |
| DA95030603 | 2.969 | 0.385 | 0.3110 (0.2658 to 0.3702) | -0.0187    | +0.0241 | +23.8% (+14.9%) | -21.7% to +20.2% (28.0) | 0.0740 |
| DA95022205 | 2.970 | 0.376 | 0.3110 (0.2658 to 0.3702) | -0.0188    | +0.0241 | +20.9% (+12.2%) | -21.7% to +20.2% (28.0) | 0.0650 |

Per cluster (residual, adiabatic wall): M 1.80 to 1.85, mean +28.6%,
range +25.7% to +32.4%, sd 3.4%; M 2.35 to 2.41, +32.9%, +30.8% to
+36.3%, sd 3.0%; M 2.66 to 2.75, +30.1%, +21.1% to +37.1%, sd 8.2%; M
2.97, +22.4%, +20.9% to +23.8%, sd 2.0%. With the wall at the air
temperature the means are +24.3%, +25.7%, +21.7% and +13.6%.

What this shows, and no more:

- The components that have bands sum to 73% to 83% of CX0 (residuals
  +20.9% to +37.1%). No shot lies below the partial sum's tolerance, so
  nothing computed already exceeds the data.
- The partial sum's own tolerance holds the data at 1 shot of 11 (M 2.741),
  at 3 with the wall-temperature band (adding M 2.969 and 2.970). Both
  missing terms are positive (the base drag of a blunt edge in supersonic
  flow; the drag a rounded leading edge adds), so the full model would
  lie above the partial sum: this is no verdict on the model, which is
  refused.
- The gap the missing terms would have to fill is 0.065 to 0.146 in C_D
  (17% to 27% of CX0; 0.041 to 0.130 with the wall cold). Their scales:
  the leading edges at pitot pressure on their frontal height, 0.066 to
  0.072 (a scale, not a bound); the trailing edges at the vacuum limit
  -P_B = 2 / (gamma M^2), 0.180 at M 1.80 to 0.066 at 2.97 on the 0.32
  cal^2 reading (half on 0.16), a bound. The gap lies below their sum at
  every shot, so the data are physically within reach of the complete
  model; nothing more follows.
- The residuals' spread within a cluster (sd 2.0% to 8.2%) follows the
  data's (the M 2.741 and 2.749 shots differ by 13% in CX0); the model
  varies smoothly with Mach number.

**Hold-out caution.** These residuals were computed. Whoever sets the band
of the fins' trailing-edge base (B1, Love's two-dimensional base
pressures) or of the leading-edge radius must do it from those data alone,
without reference to the gaps above; a band chosen or checked against
them is "estimated on the Basic Finner, not validated" (0008 section 6.1),
and the configuration then has no hold-out.

## 7. What may and may not be claimed

Pending the second run (section 4.2); restated once it is made. Until
then, as after the first run:

- B3 implements 0008 section 3, with the fins' trailing-edge base now
  included (section 5.1), and B4's rounded-edge term exists (section 5.2):
  correlations and analogies with bands estimated on component data,
  **band estimation, not validation**, tested only through a total.
- No total Cd may be claimed for any configuration until a gate passes.

## 8. Corrections proposed to 0008

### 8.1 After the first run

The eight corrections listed after the first run were made in 0008 at
2b538da (its "Changes after the first Basic Finner gate run"):

1. The Basic Finner's fin leading edges are blunt by 0008's own
   classification (pitot scale 0.066 to 0.072 in C_D, 11% to 19% of CX0).
2. B5 was blocked on B1 and on a leading-edge method, not on a band to
   add.
3. Wall temperature is an input of the Basic Finner (+0.0155 to +0.0241 in
   C_D with the wall at the air temperature, `magnitudes.out`).
4. The nose share on the Basic Finner is 18% to 23% of CX0, not the
   scoping 5%.
5. The fins-on-base band of section 1.3 (tunnel excess carried beyond M
   2.41, identity-swap error, half-width at most 12.2%; F on the less
   negative curve only; the sizing script's pairing error).
6. Fin friction counted once.
7. Transition's effect on base pressure carried by no band.
8. Small items (the base band's ends, the M 1.799 shot, the single-read
   fig. 18 rows).

### 8.2 With the fin-edge terms

1. **The laminar trailing-edge band** (0008 sections 2.3 and 3.4): 0008's
   fixed -13% to +26% used two read points of TR 1109 fig. 29 for the whole
   range of Reynolds numbers; it is superseded by the per-shot computation
   of section 5.1.
2. **The trailing-edge band's high end** is 1.21 rounded outward, not
   "about 1.20" (the X-15's highest point is 1.201).
3. **The X-15 count**: `blunt_te_2d_base.md` gives 19 points at M 1.52 to
   3.24; TN D-1056 table II has 18 power-off rows there (its script's own
   filter gives 18).
4. **The leading-edge domain** goes beyond TN 2960's measured Mach and
   Reynolds numbers, on RM A55H31's statement and, below M 2.48, with a
   stated +-3% allowance (section 5.2); 0008 section 4.1 should say so.
5. **The faces of a rounded wedge.** With the tangent geometry the faces'
   wave drag on the Basic Finner falls by 19.1% to 19.2% from the sharp
   wedge 0008 sized (section 5.2).

## 9. Open

- The second readings of the edge data (TR 1109 figs. 8 and 29, RM A51J25
  fig. 7, TN D-1056 table II, TN 2960 figs. 5(c) and 7): the independent
  reader's.
- The Basic Finner's trailing-edge area (the independent reader's).
- The rounded edge's effect on the fin faces (entropy layer,
  overexpansion), the analogy's gap: planar shock fitting (0008 B4).
- A measurement of a cylinder's front side near Re_D 1e4 at M 1.5 to 2.5.
- A blunt trailing edge in a body's base plane (no source opened).
- A validated cold-wall friction band (Hopkins and Inouye 1971, not
  opened).
- A third reader for figs. 18 and 35 (round 3 is the round-1 reader for
  fig. 18 and made the same line identification on fig. 35).
- A hold-out set with sharp-edged fins at the base, and one with fins
  clear of the base (0008 section 7).
