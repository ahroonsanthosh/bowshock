# 0010: Base drag and the total, and the Basic Finner gate (draft)

- **Status:** Draft. Libraries with tests (`src/base/`, `src/total/`, and
  additions to `src/fins/`); the total is on the drag page since
  [0011](0011-total-drag-on-the-page.md), labelled by section 7 (every
  total an estimate, not validated, since 2026-10-21: the claim is
  suspended, section 11.7; since 2026-10-22 a narrow sub-class at BRL
  Report 934's conditions is validated, the class still suspended,
  section 11.7 and 0014 section 10.7 (q)). Steps B3, B4's
  rounded-edge term and B5 of [0008](0008-total-drag.md), whose rules
  (section 6.1) govern everything here.
- **Date:** 2026-10-19; revised 2026-10-20 after the round 5 audit
  (section 10); the class narrowed to Mach 1.8 to 2.15 on 2026-10-20 and
  the fins-on-base factor corrected to TN 3819 fig. 35's free-flight curve
  on 2026-10-21 (section 11), and the validated claim suspended the same
  day (section 11.7); BRL Report 934's range A run and a narrow sub-class
  validated on 2026-10-22 (section 11.7)
- **Inputs:** 0008 sections 3, 4.1, 6.1 to 6.4 and its data files
  (`docs/research/total-drag/data/`: `love_tn3819_fig18.csv`,
  `love_fig35_tn3819.csv`, `love_fig35_factor.csv`,
  `basic_finner_ada636861.md` and `.csv`, `base_sources.md`,
  `validation_candidates.md`, `blunt_te_2d_base.md` and `.csv`,
  `le_bluntness.md` and `.csv`); the round-1 audit's fig. 18 table
  (`audit/readings/tn3819_fig18.csv`); the round-3 second readings of TN 3819
  figs. 35 and 18 (`audit/round3/`); the round-4 second readings of the
  fin-edge data and the Basic Finner's trailing-edge area
  (`audit_round4.md`, its `readings/` and `scripts/compare_round4.py`,
  `te_area_massprops.py`); [0007](0007-skin-friction.md) and
  `src/friction/`; [0009](0009-fin-wave-drag.md) and `src/fins/`;
  [0006](0006-shock-fitting.md) for the nose band;
  [0002](0002-architecture.md) section 12; the round 5 audit of the
  total (`audit/round5/audit_round5.md`, its `scripts/` and `outputs/`);
  the identification and the two readings of TN 3819 fig. 35's
  free-flight curve (`docs/research/total-drag/fig35-free-flight/`,
  section 11).

Every number below is asserted by a committed test named with it, or
printed by a run kept in
[`docs/research/base-and-total/`](../research/base-and-total/README.md).

**Result in one line.** The Basic Finner gate passes at all 11 shots
(second run, section 4.2): residuals -7.7% to +4.5% of the modelled total
(mean -1.9%; -6.5% at the two shots at M 2.97), inside tolerances of
-19.5% to -26.2% and +23.1% to +27.4%. Those are the tolerances as
re-derived after the round 5 audit (section 10), which changed the band
arithmetic after the hold-out was used; the second run's arithmetic gave
+26.5% to +31.4% on the high side, and every shot passes under both. The
fin-edge terms were implemented with the choices of section 5, fixed
before the run; the first run was refused for their absence (section 6).
Then (section 11) the fins-on-base factor was found to rest above about M
2.15 on one of Love's predictions in TN 3819 fig. 35, not its free-flight
curve, which ends at M 2.563: the validated class was narrowed to Mach
1.8 to 2.15, the factor corrected to the curve, bounded, not measured,
above its end, and the gate re-run as a recorded correction, not a
validation (residuals -5.1% to +7.5%, mean -0.4%; every shot inside its
tolerance). Because the correction changes a tested term, inside the
class too (by +0.0011 to -0.0004 in C_D at its three shots), the
validated claim is suspended by 0008 section 6.1. BRL Report 934's range
A, registered as the test of the corrected factor, was run on 2026-10-22
and passed, but at conditions outside the class (lower Reynolds numbers,
sharp fin leading edges): the class stays an estimate, not validated, and
a narrow sub-class at exactly the tested conditions is validated instead
(section 11.7; 0014 section 10.7 (q)).

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
consecutive twice-read nodes, nodes closer than 0.03 merged), over both
compiled curves: 0.0634, set by the more negative curve. The served curve
alone gives 0.039, so on it the bound is conservative by a factor of 1.6,
at most 1e-4 in P_B (round 5, finding 10). The bound is at most 3.2e-4
in P_B over M 1.5 to 3.0 (0.2% to 0.3% of P_B)
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

**Corrected 2026-10-27 (0014 section 10.7 (ah); 0008 section 3.3): 0.77
to 1.18.** 0008's rule, every base data set opened at these conditions,
now takes the body-alone sets opened since: TN 2360's body alone at M 1.5
and 2.0 and the Langley 9 in tunnel's at 2.41 (TN 3819 figs. 33 and 35,
every reading), RM L52J21a figs. 31 to 33 (d) (both readings) and TR 1051
fig. 23(b) at its thinnest sting (both readings). Against both curves they
span 0.7731 (RM L52J21a's radome nose at M 1.62, round 7, over the more
negative curve) to 1.1782 (TR 1051 at M 2.9, the audit's reading, over the
served curve); TN 2360 at M 1.5 is 1.1241, outside the band before. The
envelope rounded outward is 0.77 to 1.18 (`compiledCurveBandEvidence`,
`compiled-curve.test.ts`, which checks every one of these readings inside
the band `bodyBaseDrag` serves). Below Mach 1.5, W2's low end is this
band's carried down (0015 section 11.1), so 0.77, and its nominal, the
band's midpoint, 1.04 (1.065 before). The label is now "correlation:
compiled base-pressure curve of TN 3819 fig. 18 (Love), band 0.77 to 1.18
measured over curve, set on every body-alone base pressure opened in its
domain (0008 section 3.3, 0014 section 10.7 (ah)), tested only in the
total". This widens a band after the DREV gate and BRL 934's range A used
it (0014 section 10.7 (ah) records what it moves there: no modelled total,
no residual and no verdict). The paragraph above is kept as written.

### 1.3 The fins-on-base factor

**Superseded on 2026-10-21 by section 11.** This section is the factor as
the second run and round 5 used it. Both readings below took the most
negative with-fin line of fig. 35 for the free-flight line; above about M
2.15 that line is estimate B, one of Love's predictions. The rules below
stand; the readings, the rows and the identity-swap error are replaced
(section 11.4), and above M 2.56 the factor is bounded, not measured
(section 11.5). The superseded readings are kept as
`TN3819_FIG35_SUPERSEDED`, and the tests reproduce this section's rows
and findings from them.

`tn3819-fig35.ts` holds both readings of fig. 35's free-flight line (0008's
first reading, M 1.80 to 2.85 with 0008's extrapolation to 3.0 flagged; the
round-3 reading, M 1.1 to 2.99), both readings of the three tunnel pairs,
and each reading's stated error. Two of these values are not in round 3's
method note, and the record of them is here (round 5, findings 5 and 6):

- **Round 3's error at M 2.97 and 3.00 is +-0.003 in P_B**, and its value
  at M 2.97 -0.1290, both from round 3's factor script (`factor35.py`, "end
  of the traced line (2.99), short extrapolation"); its method note
  (`method_round3.md`) states +-0.002 at M 2.4 to 3.0. The table's rows at
  M 2.97 and 3.00 (low ends 1.146 and 1.147) follow from +-0.003; with
  +-0.002 they would be 1.150 and 1.151, and the body base at the two shots
  at M 2.97 0.00019 higher in C_D (+0.05% of the total).
- **The tunnel pairs stand at the tunnels' test Mach numbers**, 1.50, 2.00
  and 2.41, in both readings; round 3 read its symbols at 1.502, 2.003 and
  2.405. At 2.405 round 3's tunnel factor would not reach the M 2.41 row,
  whose high end would then be the first reading's free-flight factor plus
  its error, 1.3667, not the tunnel factor 1.3710; the body base at the
  shot at M 2.414 would be 0.00025 lower (-0.05% of the total).

`fins-on-base.ts` builds 0008's band at every Mach number where some
reading exists, as the envelope over the readings: low end, half the
10%-thick increment (TN 2360's 5%-thick fins); high end, the larger of the
free-flight factor plus its error and the tunnel factor; nominal, the
midpoint. Two changes from 0008, both taken from the round-3 readings and
adopted on their evidence, not on any gate data:

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

**Between the rows** (round 5, findings 2 and 3; this paragraph states
what the code does and what the gate ran; the code was not changed). The
rows are every Mach number at which either reading has a point of the
free-flight line in M 1.80 to 3.00: 1.80, 1.90, 2.00, 2.10, 2.20, 2.30,
2.40, 2.41, 2.50, 2.60, 2.70, 2.80, 2.85, 2.90, 2.97 and 3.00. Each row's
ends are built by the rules above at the row's Mach number. At any other
Mach number the low and high ends are interpolated linearly in M between
the two rows that bracket it, and the nominal is the midpoint of the
interpolated ends. The rules applied directly at a shot's Mach number
would give a different band between rows, in three ways
(`fins-on-base.test.ts`):

- **The step at M 2.41.** The rules put a step of +0.028 into the high end
  at M 2.41, where the tunnel pairs stop: the tunnel factor there, 1.3710,
  and the free-flight factor plus the carried excess (0.140) just above.
  Interpolation spreads the step over M 2.41 to 2.50. At the shot
  DA95021317 (M 2.414) the rules would give F = 1.2605 (1.1214 to 1.3997);
  the code gives 1.2471 (1.1213 to 1.3728). So the code's body base is
  0.0016 lower in C_D than the rules' (-0.35% of the modelled total), and
  its band's high end 0.0034 lower; under the rules the residual there
  would be -0.7%, not -0.3%.
- **At M 1.846 and 1.850** the high end, the free-flight factor plus its
  error, is not linear between the rows at 1.80 and 1.90: the code's body
  base is 0.0003 and 0.0004 above the rules' (+0.06%).
- **At M 2.348 and 2.364** the rules take the reading error at the shot's
  Mach number (the identity-swap error to M 2.35, then the larger error of
  each reading's bracketing points), which the interpolated rows carry only
  in part, so the rules' low end lies lower: the code's body base is
  0.0004 and 0.0002 above the rules' (+0.08%, +0.05%).

At the other five shots the two differ by at most 3e-5 in C_D.

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

**Beside it, the rebuilt factor** ([0015](0015-fins-at-the-base.md),
W1 of 0014). This factor and its labels are unchanged, and it serves the
fin families it was measured on, unswept wedge, circular-arc and
hexagonal sections 5% to 10% thick (with 0016 section 18's extension
below 5% for those families), so the Basic Finner's gated total keeps it
(0014 sections 10.3 and 10.7, amendment i). Where it refuses (fins other
than four, swept at either edge, Mach 1.0 to 1.8, fins within a chord of
the base), and for flat-faced fins (plates), which it is not measured on,
`base-drag.ts` asks the rebuilt factor (`src/base/fins-on-base-w1.ts`),
which brackets the fins between measured circular-arc families (plates:
bounded from RM L52E06's relief; a sharp section with its trailing edge
swept at the base refused, 0015 section 3.4), and labels it so. This holds until the
owner decides otherwise after BRL 934's run.

### 1.4 Body base drag and refusals

`base-drag.ts`: C_D = -P_B F (A_base / A_ref), its band the linear sum of
the curve's band on the term, the interpolation bound, and the
fins-on-base band, (F_low - F) and (F_high - F) times -P_B (0008 section
6.3). Fins with trailing edges at the base take the factor; fins one root
chord or more ahead take the plain curve, labelled not validated with fins
(0008 section 6.4); in between they were refused (TN 2360's variation not
transcribed) and are now served by the rebuilt factor at Mach 1.5 to 2.0,
where that variation is read (0015 section 3.3). Below Mach 1.5, down
to 1.0, the curve is continued with a band of 0.82 to 1.31 set on
free-flight data and the nominal at its midpoint, and fins at the base
from Mach 1.0 take the rebuilt factor (W2, 0015 section 11), whose
members built on fig. 35's free-flight line apply to the curve itself,
not on top of that midpoint (0015 section 11.2). Refused with
a message (`BaseRefusal`, with a reason): Mach numbers outside 1.0 to 3.0,
afterbodies other than cylinders, a laminar layer at the base, and the
fins' conditions of 1.3 and 0015.

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
| Nose wave drag         | given; `nose.ts` for a sharp cone: Taylor-Maccoll, exact                                              | given; for the cone the fitted solver's floor, 7e-5 of the value (0006)  |
| Body friction          | van Driest II, momentum integral, adiabatic (0007)                                                    | 0.88 to 1.19 (0007)                                                      |
| Fin friction           | van Driest II plates of the local chord, both faces                                                   | fins' own drag, 1.01 to 1.59 (0008 section 4.3)                          |
| Fin leading edges      | rounded and unswept: the nose of the tangent geometry at modified-Newtonian pressure (section 5.2)    | 0.99 to 1.06 (TN 2960), widened by +-0.03 where extrapolated in Reynolds |
| Fin wave drag          | exact section drag times the linear 3D ratio (0009); with a rounded edge, the faces on their own rise | the fins' own drag band, plus the quadrature error                       |
| Body base              | compiled curve times the fins-on-base factor (section 1)                                              | 0.82 to 1.08, interpolation, fins-on-base band                           |
| Fin trailing-edge base | blunt, unswept, turbulent: thin-layer two-dimensional base pressure at M_inf (section 5.1)            | 0.93 to 1.21                                                             |

Fin friction carries B4's band only and body friction 0007's, so each is
counted once. Input bands:

- **Transition**: a laminar run to each Re_T given, from the tip and from
  each fin's leading edge, against fully turbulent; a laminar layer at the
  base refuses the base. Each Re_T is one state of the boundary layer, and
  every component the run reaches changes together: the friction of the
  body and of the fins and, where the run leaves a fin laminar at its
  blunt trailing edge (Re_T at least Re_c, so the fin is laminar along its
  whole chord), the trailing-edge base at its laminar value (section 5.1).
  Since the body's transition need not follow the fins' (a body tripped
  near the tip, fins laminar), each state is also taken with the body
  turbulent. The input's ends are the lowest and highest change over these
  states and the fully turbulent nominal (zero). This is the arithmetic
  since round 5 (section 10, finding 7); before it, the trailing edges'
  laminar change was a separate input band, added on both sides
  independently of the friction.
- **Wall temperature**: from adiabatic to the temperature given. 0007's
  band is measured on adiabatic walls only, so this change is van Driest
  II's and the laminar solution's prediction, not validated.
- **Roughness**: smooth by default, no band; otherwise a band the caller
  supplies with its source, since no roughness model is validated in
  bowshock.

**The vacuum bound.** A base cannot carry less than zero absolute
pressure, so its drag on its own area is at most -P_B = 2 / (gamma M^2).
No base term, no end of its model-form band and no end of its laminar
state exceeds this bound on its area: each is clamped there, and the term
says which it clamped (`src/base/vacuum.ts`; round 5, finding 8, section
10.2).

Refused besides src/base's and src/fins's refusals: a rounded leading edge
on anything but a single-wedge fin of constant chord, and a blunt trailing
edge on a fin of varying chord.

**Not represented**, with sizes on the Basic Finner:

- **The nose's friction at its own surface state.** The cone's friction is
  taken at the free stream's edge conditions (0007 section 1). At the
  cone's Taylor-Maccoll surface state, q_c CF_c is 1.070 (M 1.80) to 1.289
  (M 2.97) times q_inf CF_inf (q_c / q_inf 1.26 and the cone's Mach number
  2.685 at M 2.97). The cone carries 21% of the body friction, so the term
  is short by about +0.0012 (M 1.80) to +0.0035 (M 2.97) in C_D, +0.2% to
  +0.9% of the modelled total, growing with Mach number (round 5, finding
  1, `cone_edge_output.txt`). This is a first-order estimate: the
  flat-plate ratio, the same Mangler-type geometry in both states, and the
  shoulder's expansion onto the cylinder left out. Not changed in the
  model: driving the integral with the cone's state is a change to a term
  the gate tested (section 9).
- **The wetted area at the fins' roots and tips.** The roots do not remove
  body wetted area: with the tangent geometry the section is 0.04385
  cal^2, so the four roots cover 0.1754 cal^2, 0.65% of the body's 27.03
  cal^2, and carry -0.00032 to -0.00045 in C_D at the local cf of the last
  calibre (`interpretations.out`'s 0.59% and 4e-4 took the sharp wedge's
  section, 0.04 cal^2, and the area share). The four tip faces (4 x
  0.04385 cal^2, parallel to the stream) carry no friction: +0.00057 to
  +0.00079. Net +0.00025 to +0.00034 omitted, +0.06% of the total (round 5,
  finding 4, `extras_output.txt`).
- Fin-body interference; the Mach number ahead of the base (the free
  stream's, fig. 18's abscissa for cylindrical afterbodies); fin cant and
  roll; nose-tip bluntness; the rounded edge's effect on the fin faces
  (section 5.2).

Tests: `tests/total/total-drag.test.ts` (each component against an
independent computation, the arithmetic, the inputs and their states, the
refusals).

## 4. B5: the Basic Finner gate

The gate has been run twice. The first run (section 6, kept as history)
was refused, because the two fin-edge terms had no method with a measured
band. This section is the second run, made once, after both terms were
implemented with the choices of section 5, written and ruled on before
it. After the round 5 audit its tolerances were re-derived with a changed
band arithmetic (section 10); its components and residuals stand as they
came out.

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
- the trailing edge's area, **0.32 cal^2**: four edges 0.08 cal thick over
  the full 1 cal span (constant spanwise thickness), as the independent
  reader decided it from the report's measured mass properties (round 4,
  section 4; no drag value used). Fig. 2 shows no spanwise section, so the
  text's "thickness of 0.08 cal at the base" allows constant thickness
  (0.32 cal^2) or a taper to zero at the tip (0.16). With steel fins and
  body and the nose density solved for the measured 1.58 kg, constant
  thickness gives a roll inertia Ix of 1.911 kg cm^2 against 1.92 measured
  (table I; 1.91 to 1.93 over the nine rounds of table II) and the CG at
  5.528 cal against 5.50 to 5.54; the taper gives 1.706, 11% below every
  round, and no plausible body raises it to the measured value (at most
  1.873 with a weightless nose; 1.856 with tungsten fins). Iy does not
  separate them (both within 0.6%);
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
band applies at every shot; at 1.6e6 they are laminar at the six shots up
to M 2.364, Re_c up to 1.56e6). Wall temperature: not stated by the
report. A model launched at the range's air temperature can only be
heated by the flow, toward the recovery temperature (463 K at M 1.80, 756
K at M 2.97), so its wall lies between the two unless the gun heated it,
which the report does not discuss. The wall is taken adiabatic (0007's condition)
with an input band to the air temperature, the cold end.

The gate's tolerance is 0008's (sections 6.2 B5 and 6.3), on the residual
CX0 / modelled - 1: the linear sum, over the modelled total, of every
component's model-form band (the fins-on-base and fin-edge bands
included), the input bands for the unknown transition and wall
temperature (high side), and the shot-to-shot spread of the shot's Mach
cluster (-3.3% to +2.0%, -2.2% to +3.4%, -7.6% to +4.5%, -1.2% to +1.2%).
At the second run the transition input entered as two independent ends:
friction on the low side and the trailing edges' laminar band on both
sides. Since round 5 it enters as its states (section 3): each Re_T moves
the friction and, where the fins are laminar at their trailing edges, the
trailing edges' base together, within the vacuum bound (section 10). A
shot passes when its residual lies inside its tolerance; a failed shot
refuses the configuration (0008 section 6.1).

### 4.2 The second run

(The gate was re-run on 2026-10-21 with the corrected fins-on-base
factor, as a recorded correction, not a validation; the corrected values
are in section 11.6, beside these.)

Made once, on 2026-10-19, after sections 4.1 and 5 were written and
committed with the reader's report applied (commit f4791ad), with the
runner kept as
[`runs/gate-second-run.test.ts`](../research/base-and-total/README.md) and
its output `runs/gate-second-run.out`; `tests/validation/basic-finner.test.ts`
holds every value below. Reported as it came out, with one change after
it: on the round 5 audit (section 10), the band arithmetic of the
tolerance was changed after the hold-out was used, and the tolerances were
re-derived (runner `runs/gate-round5.test.ts`, output
`runs/gate-round5.out` and `.json`, beside the second run's, which are
kept). The components, the model-form band and the residuals are as the
second run gave them; the tolerance's high end narrows from +26.5% to
+31.4% to +23.1% to +27.4%, its low end does not change, and every shot
still passes.

**Verdict: pass.** Every one of the 11 gated shots lies inside its
tolerance, at the second run and as re-derived.

| Shot       | M     | CX0   | Modelled C_D (model-form band) | Residual | Tolerance, round 5 (high end without the wall) | Second run's tolerance (without the wall) | Verdict |
| ---------- | ----- | ----- | ------------------------------ | -------- | ---------------------------------------------- | ----------------------------------------- | ------- |
| DA95021318 | 1.799 | 0.594 | 0.6123 (0.5311 to 0.7261)      | -3.0%    | -24.2% to +23.1% (+20.6%)                      | -24.2% to +26.5% (+24.0%)                 | pass    |
| DA95021529 | 1.846 | 0.598 | 0.5955 (0.5181 to 0.7053)      | +0.4%    | -23.8% to +23.1% (+20.4%)                      | -23.8% to +26.7% (+24.0%)                 | pass    |
| DA95021308 | 1.850 | 0.567 | 0.5944 (0.5172 to 0.7039)      | -4.6%    | -23.8% to +23.1% (+20.4%)                      | -23.8% to +26.6% (+23.9%)                 | pass    |
| DA95021328 | 2.348 | 0.500 | 0.4846 (0.4250 to 0.5720)      | +3.2%    | -21.3% to +25.6% (+21.4%)                      | -21.3% to +29.7% (+25.5%)                 | pass    |
| DA95020907 | 2.364 | 0.478 | 0.4824 (0.4234 to 0.5690)      | -0.9%    | -21.3% to +25.6% (+21.3%)                      | -21.3% to +29.6% (+25.3%)                 | pass    |
| DA95021317 | 2.414 | 0.473 | 0.4745 (0.4174 to 0.5587)      | -0.3%    | -21.0% to +25.5% (+21.1%)                      | -21.0% to +29.6% (+25.2%)                 | pass    |
| DA95020927 | 2.663 | 0.446 | 0.4428 (0.3892 to 0.5210)      | +0.7%    | -26.2% to +27.2% (+22.1%)                      | -26.2% to +31.2% (+26.1%)                 | pass    |
| DA95020906 | 2.741 | 0.400 | 0.4332 (0.3808 to 0.5097)      | -7.7%    | -26.1% to +27.4% (+22.1%)                      | -26.1% to +31.4% (+26.1%)                 | pass    |
| DA95020916 | 2.749 | 0.452 | 0.4323 (0.3800 to 0.5086)      | +4.5%    | -26.1% to +27.4% (+22.1%)                      | -26.1% to +31.4% (+26.1%)                 | pass    |
| DA95030603 | 2.969 | 0.385 | 0.4072 (0.3580 to 0.4786)      | -5.4%    | -19.5% to +24.6% (+18.7%)                      | -19.5% to +28.6% (+22.7%)                 | pass    |
| DA95022205 | 2.970 | 0.376 | 0.4071 (0.3579 to 0.4786)      | -7.6%    | -19.5% to +24.7% (+18.7%)                      | -19.5% to +28.6% (+22.7%)                 | pass    |

The residual is CX0 / modelled - 1. The tolerance is section 4.1's: the
model-form band (-12.0% to -13.3% and +17.5% to +18.6% of the modelled
total), the input bands and the cluster's shot spread. The input bands as
re-derived (section 10): transition, as its states, -0.0253 to -0.0466 in
C_D and 0 (no state lies above the fully turbulent nominal); the wall at
the air temperature, +0.0155 to +0.0241. At the second run: transition on
friction -0.0187 to -0.0301 and the trailing edges' laminar band, from
-0.0066 to +0.0163 at M 2.97 to -0.0165 to +0.0207 at M 1.80, added
independently. The smallest margin is 11.8 points, at DA95022205 (residual
-7.6% against -19.5%), unchanged; on the high side it is now 22.4 points
(DA95021328, +3.2% against +25.6%).

Per cluster:

| Cluster        | Shots | Mean residual | Range          | Standard deviation | CX0 spread about its mean |
| -------------- | ----- | ------------- | -------------- | ------------------ | ------------------------- |
| M 1.80 to 1.85 | 3     | -2.4%         | -4.6% to +0.4% | 2.6%               | -3.3% to +2.0%            |
| M 2.35 to 2.41 | 3     | +0.7%         | -0.9% to +3.2% | 2.2%               | -2.2% to +3.4%            |
| M 2.66 to 2.75 | 3     | -0.8%         | -7.7% to +4.5% | 6.3%               | -7.6% to +4.5%            |
| M 2.97         | 2     | -6.5%         | -7.6% to -5.4% | 1.6%               | -1.2% to +1.2%            |

Over the 11 shots the mean residual is -1.9%.

The components (C_D on the body's cross-section):

| Shot       | M     | Nose wave drag | Body friction | Fin friction | Fin leading edges | Fin wave drag | Body base | Fin trailing-edge base |
| ---------- | ----- | -------------- | ------------- | ------------ | ----------------- | ------------- | --------- | ---------------------- |
| DA95021318 | 1.799 | 0.1105         | 0.0804        | 0.0360       | 0.0439            | 0.0165        | 0.2177    | 0.1072                 |
| DA95021529 | 1.846 | 0.1090         | 0.0791        | 0.0355       | 0.0442            | 0.0160        | 0.2085    | 0.1033                 |
| DA95021308 | 1.850 | 0.1088         | 0.0792        | 0.0355       | 0.0442            | 0.0160        | 0.2077    | 0.1030                 |
| DA95021328 | 2.348 | 0.0968         | 0.0688        | 0.0309       | 0.0463            | 0.0121        | 0.1554    | 0.0742                 |
| DA95020907 | 2.364 | 0.0965         | 0.0686        | 0.0308       | 0.0464            | 0.0121        | 0.1545    | 0.0735                 |
| DA95021317 | 2.414 | 0.0956         | 0.0675        | 0.0303       | 0.0465            | 0.0118        | 0.1516    | 0.0712                 |
| DA95020927 | 2.663 | 0.0917         | 0.0632        | 0.0285       | 0.0471            | 0.0106        | 0.1408    | 0.0609                 |
| DA95020906 | 2.741 | 0.0906         | 0.0618        | 0.0278       | 0.0473            | 0.0103        | 0.1373    | 0.0581                 |
| DA95020916 | 2.749 | 0.0905         | 0.0617        | 0.0278       | 0.0473            | 0.0103        | 0.1369    | 0.0578                 |
| DA95030603 | 2.969 | 0.0878         | 0.0580        | 0.0261       | 0.0476            | 0.0095        | 0.1272    | 0.0508                 |
| DA95022205 | 2.970 | 0.0878         | 0.0580        | 0.0262       | 0.0476            | 0.0095        | 0.1272    | 0.0508                 |

As shares of the modelled total: the body base 31% to 36%, the nose 18%
to 22%, the fins' trailing-edge base 12% to 18%, body friction 13% to 14%,
the leading edges 7% to 12%, fin friction 6%, fin wave drag 2% to 3%. The
two fin-edge terms, both labelled analogies, carry 24% to 25% of the total,
and the body base carries the fins-on-base factor, itself an analogy
from circular-arc fins. The leading edges are labelled "extrapolated in
Reynolds number" at the six shots at M 1.80 to 2.41 and covered by RM
A55H31 at the five at M 2.66 to 2.97 (section 5.2). The trailing edges'
laminar band is flagged as extrapolated at the eight shots above M 2.3
(section 5.1). The five shots at M 1.06 to 1.33 are refused (the leading
edges below M 1.49, the base below M 1.5, the fin sections' detached
shocks below M 1.2), as 0008 has them: reported, not gated.

**What the result says, and what it does not.**

- Every residual, -7.7% to +4.5%, lies inside the model-form band alone,
  before the input bands and the shot spread are added.
- The tolerance is wide, -19.5% to -26.2% and +23.1% to +27.4% as
  re-derived after round 5 (+26.5% to +31.4% at the second run). 0008
  section 6.3 warns that a pass at such a width says little by itself;
  the residuals are the finding.
- At M 1.80 to 2.75 the cluster means lie within 2.4% of zero, and each
  cluster's residuals spread about as its CX0 does (the model changes by
  at most 3.0% within a cluster, so the residuals' spread is mostly the
  data's).
- At M 2.97 both shots lie below the model, by 5.4% and 7.6% (mean
  -6.5%), beyond that cluster's own spread of +-1.2%. That is a systematic
  offset inside the tolerance, which 0008 section 6.3 counts as a finding.
  Two shots cannot separate it from scatter of the size seen at M 2.74
  (-7.7%). Nothing was changed for it: the configuration is not retuned
  on its own hold-out (0008 section 6.1). One omission of section 3 grows
  with Mach number in the same direction: the cone's friction at its own
  surface state would add about +0.0035 at M 2.97 and deepen the offset to
  about -7.3% (round 5, finding 1).
- The Basic Finner is now used. Any later change to the terms it tested,
  or any band checked against these residuals, is "estimated on the Basic
  Finner, not validated", and needs another hold-out (0008 section 6.4).

## 5. The fin-edge terms: the choices made before the second run

Every choice below was made from geometry, physics and the component data
alone, written here and ruled on by the coordinator (2026-10-19) before the
second gate run, and is not revisited after it. The Basic Finner's drag
was used for none of them; its geometry, mass properties and Reynolds
numbers were used where stated.

The independent reader's second readings (round 4) are applied as the
coordinator ruled: each table's second reading is held beside the first,
and **every band is the envelope of both readings** (the conservative
rule). The second readings were made before the first was opened, except
three items the reader marks "not blind": RM A51J25 fig. 7's symbols, its
curve at M' 1.50 to 1.60 (re-read after the comparison), and the TN 2960
fig. 5(c) faired-curve check at 45 deg. Every second-reading value was
checked against the reader's files when transcribed
([`runs/second-readings.test.ts`](../research/base-and-total/README.md)).

### 5.1 The trailing edges (`src/base/fin-trailing-edge.ts`)

Data: `src/base/blunt-te-2d.ts`. The first readings are transcribed from
`docs/research/total-drag/data/blunt_te_2d_base.csv` and held to it by
`tests/base/fin-trailing-edge.test.ts`; the second readings (round 4) stand
beside them: TR 1109 fig. 29(a) and (b) (the comparison set of
`compare_round4.py`, which holds every fig. 29(a) value of the reader's csv;
of fig. 29(b) it leaves out the csv's points at 0.060 to 0.185 on the M 1.5
and 2.0 pair, whose identity the csv calls uncertain to the left and whose
0.786 at 0.080 lies on the first reading's M 2.0 curve, 0.012 below its M
1.5 curve, far from the fins' 0.0089 to 0.0115), fig. 8's 32 symbols and
its faired curves, RM A51J25 fig. 7's curve (M' 1.50 to 4.00; under the
PARD symbols below 1.50) and its symbols. Corrections from the second
reading: the first reading's fig. 8 point at M 3.1, X 2.0, 0.275 does not
exist and is dropped (it set no band end: 1.007 against its curve). TN
D-1056 table II was retyped in full and equals the first typing in every
row used.

- **Nominal.** C_D = -P_B(M) n h s / A_ref, P_B the thin-layer
  two-dimensional curve, RM A51J25 fig. 7's mean curve (first reading) at
  M' = M_inf (flat-sided sections), linear in M. This is 0008's method
  (section 3.4, B3). The second reading of the curve agrees within -0.005
  to +0.003 in p_b / p' at M' 1.50 to 4.00 (base drag 0.995 to 1.009), and
  enters through the band. No interpolation band is added: the band's
  evidence (the X-15 points, RM A51J25's symbols) was formed against the
  interpolated curves at each point's own Mach number. TN 3819 fig. 5's
  line A reproduces the curve within 0.987 to 1.018, a reading check (0.992
  to 1.024 on the second readings, the reader's figure).
- **Band, 0.93 to 1.21** on the term, measured over modelled: the
  envelope, over both readings, of the evidence 0008 lists (each item
  asserted by the test):

  | Evidence                                                            | First reading  | Second reading                                                                            |
  | ------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------- |
  | TR 1109 fig. 8, 32 symbols over their own faired curve              | 0.969 to 1.082 | 0.953 to 1.072                                                                            |
  | TR 1109 fig. 29(a) over fig. 8 (orifice position), 6 abscissas      | 0.933 to 1.010 | 0.946 to 1.011                                                                            |
  | RM A51J25 fig. 7, 11 symbols at M' 1.45 to 3.2, over the mean curve | 0.961 to 1.067 | 0.935 to 1.057 (second symbols, second curve); crossed: 0.941 to 1.065 and 0.942 to 1.057 |
  | X-15 fin, 18 points at M 1.52 to 3.24, over the mean curve          | 0.934 to 1.201 | 0.936 to 1.204 (second curve)                                                             |

  The RM A51J25 symbols are taken over each reading of the curve, each
  reading of the symbols, all four pairs; the second curve starts at M'
  1.50, so for the Ames square at 1.475 (first) or 1.492 (second) it is
  the one-interval envelope of its end value and its 1.50 to 1.55
  extrapolation, and both ends count (0.935 is the end value; the reader's
  0.939 is the extrapolation). The envelope is 0.933 to 1.204; rounded
  outward, **0.93 to 1.21**, as before the second reading (0008's "about
  0.93 to 1.20" would be narrower than the X-15's own points). The X-15
  count is 18 power-off rows at M 1.52 to 3.24 (the research note says
  19). Domain M 1.5 to 3.2.

- **Label.** For edges in the body's base plane, as on fins at the base:
  "an analogy, not a measurement", since no opened source measures such
  an edge (0008 section 3.4), with its band "tested only in the total"
  (section 7; added after round 5, as 0011 section 6 found it missing).
- **Since [0016](0016-fin-edges-of-flat-plates.md):** thick layers are
  served to c / [h Re_c^(1/5)] = 4.5 (TR 1109 fig. 29(a)'s fall from 1.0
  as a factor, with its two readings in the band) and fins of varying chord
  are integrated along the span; the limit at 1.0 below stays the
  thin-layer term's, so nothing at the Basic Finner's 0.69 to 0.76 changes.
- **Refused:** swept trailing edges (base pressure 20% to 50% higher at M
  1.41 and 1.96 with 45 deg of sweep, RM A51J25 p. 17); a laminar layer at
  the trailing edge as the nominal state; and thick layers, with c / [h
  Re_c^(1/5)] above 1.0. Up to 1.0, TR 1109 fig. 29(a)'s base drag lies
  within 0.4%, 1.4% and 1.8% of its lowest-abscissa value at M 1.5, 2.0
  and 3.1 in the first reading (from X 0.5, 0.5 and 0.75) and within 0.2%,
  1.5% and 4.0% in the second (from X 0.45, where its curves start); by
  4.5 it has fallen 11.8%, 15.0% and 29.3% (11.4%, 15.1%, 30.9%), which
  the thin-layer curve does not carry. The second reading's 4.0% at M 3.1
  comes from the part of the curve, X 0.45 to 0.75, that the first did not
  read; the limit stays 1.0 as ruled, and the Basic Finner's fins sit at
  0.69 to 0.76 (c / h 12.5, Re_c 1.19e6 to 1.98e6), where the second
  reading's base drag at M 3.1 is 1.5% to 2.2% below its value at 0.45.
- **Laminar input band**, in place of 0008's fixed -13% to +26%, which was
  computed at two read points (0.75 and 0.010) for the whole range of
  Reynolds numbers and is superseded. In a total this change is not a band
  of its own: it belongs to the transition state that causes it, with the
  laminar friction of the same fins (section 3; since round 5, section
  10). Every end is at most the vacuum bound (section 10.2). When a
  transition input leaves a fin laminar at its trailing edge (Re_T at
  least Re_c), the term changes by
  the laminar over turbulent base drag of TR 1109 fig. 29: laminar (29(b))
  at c / [h Re_c^(1/2)] over turbulent (29(a)) at c / [h Re_c^(1/5)], for
  the shot's own Re_c, at each of M 1.5, 2.0 and 3.1, and the band is the
  envelope over the three (the ratio changes sign between them, 1.26,
  0.87, 0.94 at the read points, 1.265, 0.878, 0.945 on the second
  reading, so it is not interpolated in Mach number) and over both
  readings of each curve. Where an abscissa lies beyond a curve's read
  range by at most one read interval, the value is the envelope of the end
  value and the end interval's linear extrapolation, flagged; further out,
  in either reading, the input is refused. For the Basic Finner the
  laminar abscissa is 0.0089 to 0.0115, below the first read point (0.010)
  at M 1.5 and 2.0 for Re_c above 1.56e6, and the turbulent one 0.688 to
  0.762, below M 3.1's first point in the first reading (0.75) for Re_c
  above 1.29e6; those shots are flagged.
- **The laminar band per shot, against the reader's.** Computed from each
  gated shot's Reynolds number alone, before the run
  ([`runs/laminar-band.test.ts`](../research/base-and-total/README.md)):
  -15.4% to +19.4%, -15.0% to +20.5% and -15.1% to +20.3% at the three
  shots at M 1.80 to 1.85 (Re_c 1.19e6 to 1.24e6, within the read range);
  -12.9% to +26.4% and +26.3% at M 2.348 and 2.364 (flagged for the
  turbulent curve only); -12.9% to +27.2%, +29.0%, +29.8% and +29.8% at M
  2.41 to 2.75; -13.0% to +32.0% and +31.9% at M 2.969 and 2.97 (Re_c
  1.98e6 and 1.97e6, laminar abscissa 0.0089, extrapolated below the M 1.5
  laminar curve's first read point), now clamped at the vacuum bound there,
  1.2995 and 1.2994 of the term, about +30% (round 5; a ratio of 1.320
  implies p_b / p_inf = -0.016). Over the shots, -15.4% to +32.0% as the
  ratio gives it, -15.4% to about +30% within the vacuum bound. The
  reader's figure over the fins' range is about -15% to +29%, or +32%
  extrapolated at the lowest abscissa: the same ends (its -15% is the M
  2.0 ratio 0.846 at 0.0115, here 0.8457; its +32% is the M 1.5 ratio
  1.319 extrapolated to 0.0089, here 1.3198; the report does not derive
  its +29%, and the M 2.66 shot, at 0.00948 near the M 1.5 laminar curve's
  drawn start, about 0.0095, gives +29.0%). The two agree; above +26.5%
  (the value at 0.010) every figure is extrapolated.
- **Area.** The library holds a trailing-edge thickness uniform along the
  span; the Basic Finner's is 0.32 cal^2, as section 4.1 records. A taper
  would put a thick layer near the tip and change the fins' section along
  the span, which `src/fins/` does not represent, and would be refused
  there.

### 5.2 The leading edges (`src/fins/rounded-leading-edge.ts`)

Data: `src/fins/tn2960.ts`. The first reading (faired curves) is from
`le_bluntness.csv`, held to it by `tests/fins/rounded-leading-edge.test.ts`,
with one correction: fig. 5(c) at M 1.98 and 45 deg is 0.884, not 0.918
(the reader's column scans of the faired curve at 42.0 and 48.6 deg, a
check made after the first reading was opened, so not blind). The second
reading (round 4) stands beside it: fig. 5(c)'s symbols at 15 deg steps,
and fig. 7's diamonds one by one.

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
  90 deg, trapezoid rule) over (2/3) Cp_pitot at M 1.49, 1.98, 2.90, the
  envelope of both readings, rounded outward: 0.995, 1.043, 1.056 on the
  first (1.049 at M 1.98 before the correction) and 1.002, 1.049, 1.052 on
  the second (the reader's Simpson rule gives 1.000, 1.046, 1.053), so
  0.995 to 1.056. As a check on the integration, the first reading's
  totals are 0.987, 0.996 and 0.985 of fig. 7's first reading; the second
  reading's are 0.980, 0.976 and 0.994 of the mean of fig. 7's diamonds
  (0.960 to 1.000 of single diamonds; at M 1.49 and 1.98 the integral lies
  at the low edge of the diamonds' scatter, 1.474 to 1.511 and 1.422 to
  1.482).
- **The faces.** Their wave drag is the exact two-dimensional drag of a
  wedge at delta on their own rise, times the linear 3D ratio of the
  planform (0009; the faces' sheet is taken from x = 0, a 0.4% shift of
  the chord). They keep the fins' own-drag band.
- **What is not modelled, the analogy.** The nose's effect on the faces:
  its entropy layer and the overexpansion behind the shoulder, where the
  cylinder has a separated wake and the fin has its faces. No opened
  source measures it; the term is labelled "an analogy, not a
  measurement", with its band "tested only in the total" (section 7;
  added after round 5, as 0011 section 6 found it missing).
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
- **Since [0016](0016-fin-edges-of-flat-plates.md):** flat plates (the
  limit at face angle zero) on any planform, and swept edges to 60 deg by
  the independence principle at normal Mach numbers 1.49 to 3.0, its
  error measured on RM A55H31's yawed cylinders; unswept single wedges are
  unchanged.
- **Refused:** swept leading edges (no swept-cylinder data at M 1.5 to 3;
  RM A55H31's eq. (14) would be an untested theory there), M below 1.49
  or above 3.0, Re_D below 6.7e3 or above 1e6, and sections other than a
  single wedge of constant chord. The limit at 1e6 is TN 2960's highest
  Reynolds number, added after round 5 (finding 11): no opened source
  measures the front side above it, and the +-3% allowance, set from the
  displacement scale at low Reynolds number, says nothing about a cylinder
  whose layer may turn turbulent before separation. Before, such edges
  were accepted and labelled "measured". The Basic Finner's edges (Re_D
  0.95e4 to 1.58e4) are not affected.

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

**Suspended since 2026-10-21 (section 11.7).** The fins-on-base factor
was corrected after the gate (section 11), a change to a tested term, so
by 0008 section 6.1 nothing below may be claimed as validated. BRL Report
934's range A, the registered test of the corrected factor, passed on
2026-10-22 at conditions outside this class, so the class stays
suspended; only a narrow sub-class at the tested conditions is validated
(section 11.7; 0014 section 10.7 (q)). The section stands as the claim the
second run opened:

The gate has passed at every shot (section 4.2), so 0008 section 6.4's
claim class opens, and no more:

- **May be claimed:** total zero-incidence, power-off C_D at **Mach 1.8 to
  2.15** (narrowed from 3.0 on 2026-10-20, since above M 2.15 the
  fins-on-base factor the gate tested was read, by both readings of
  section 1.3, from one of Love's estimates in TN 3819 fig. 35, not the
  free-flight curve, which ends at M 2.563; corrected since, after the
  residuals were known, the factor there has no hold-out: section 11.7)
  for the Basic Finner's class (a
  sharp-nosed cylindrical-afterbody body of L/d 10; four rectangular fins
  of 1 cal chord and span ending at
  the base; a single-wedge section with a blunt trailing edge 0.08 cal
  thick across the span and a 0.004 cal leading-edge radius; Reynolds
  number 1.2e7 to 2.0e7 on length; free flight), with the model-form band,
  the transition and wall-temperature bands shown separately, and the
  per-shot residuals of section 4.2 published. Labels: the fins-on-base
  term "measured on circular-arc fins, applied by analogy"; both fin-edge
  terms "an analogy, not a measurement", the leading edges "extrapolated
  in Reynolds number" below M 2.48; outside the class, "not validated".
- **May be claimed:** the breakdown into the nose wave drag (exact, band of
  order 1e-4), friction (0007's band, validated on component data), and
  the base and fin terms (bands estimated on component data, each
  "estimated, tested only in the total").
- **May be claimed:** agreement with the Basic Finner's free-flight drag
  within the tolerance, residuals -7.7% to +4.5%, on a set that took no
  part in setting any band; with the M 2.97 offset (-6.5% on two shots)
  stated beside it, and beside that the omitted friction of the cone at
  its own surface state, which grows with Mach number and would deepen
  the offset to about -7.3% (section 3; round 5, finding 1). The
  tolerance is the one re-derived after round 5, a change to the band
  arithmetic made after the hold-out was used (section 10), which narrows
  it and leaves every residual where it was. After the fins-on-base
  correction (section 11), a recorded correction, not a test: residuals
  -5.1% to +7.5% (mean -0.4%), -4.5% to +0.5% at the three shots inside
  the class, and -3.7% at M 2.97, each stated as made after the residuals
  were known.
- **May not be claimed:** anything outside that class (0008 section 6.4):
  sharp-edged fins at the base, Mach 1.5 to 1.8 (no shot), Mach 1 to 1.5
  (reported, refused here), Mach 2.15 to 3.0 (the factor the gate tested
  there rested on a prediction, and the corrected factor has no hold-out
  there; above M 2.56 it is bounded, not measured), fins clear of the
  base, other fin sections, thicknesses or planforms, other noses, fineness ratios or Reynolds
  numbers. Nor a tolerance narrower than the gate's: the pass is at -19.5%
  to -26.2% and +23.1% to +27.4% as re-derived after round 5 (+26.5% to
  +31.4% at the second run).
- B3 and B4's rounded-edge term remain **band estimation, not
  validation**, on their own; they are tested only through this total.
- Nothing is on the drag page; showing a total there is a separate step.
  (Taken in [0011](0011-total-drag-on-the-page.md), which decides the
  class in code and labels the page by this section.)

## 8. Corrections to 0008

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

The eleven corrections of sections 8.2 and 8.3 are made in 0008 (its
"Changes after the second Basic Finner gate run"), with the second readings
recorded in the two data notes (`blunt_te_2d_base.md`, `le_bluntness.md`,
section 7 of each).

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

### 8.3 From the second readings (round 4)

6. **The trailing-edge area** (0008 sections 3.4, 5 and 6.2 B1 and B5):
   0.32 cal^2, decided by the measured mass properties (section 4.1); the
   20% (0.16 cal^2) alternative can be dropped.
7. **`blunt_te_2d_base.md` and `.csv`**: the fig. 8 point at M 3.1, X 2.0,
   0.275 does not exist (no band end moves); the first reading of fig. 8's
   panel (c) is about 0.007 low, symbols and curve alike; two RM A51J25
   fig. 7 symbol abscissas are read 0.02 low (the diamond near M' 1.95 is
   at 1.961, the Ames square at 1.492); the curve below M' 1.50 is under
   the PARD symbols and cannot be checked.
8. **`le_bluntness.md` and `.csv`**: fig. 5(c) at M 1.98 and 45 deg is
   0.884, not 0.918, so that Mach number's front ratio is 1.043, not
   1.049; fig. 7 at M 2.9 is 1.336, not 1.346 (the reader's; this record
   keeps the first reading as read and holds the second beside it).
9. **The bands stand on both readings:** the trailing-edge band 0.93 to
   1.21 (envelope 0.933 to 1.204) and the leading-edge band 0.99 to 1.06
   (envelope 0.995 to 1.056); 0008 section 3.4's "about 0.93 to 1.20" and
   its single-reading notes should say so.
10. **The laminar trailing-edge band** over the Basic Finner's range is
    -15.4% to +32.0% (section 5.1), the reader's -15% to +29% (+32%
    extrapolated); above +26.5% it rests on extrapolation below the M 1.5
    laminar curve's first read point.
11. **The thin-layer support**: read from X 0.45 (second reading), TR 1109
    fig. 29(a) at M 3.1 lies within 4.0% of its lowest-abscissa value up to
    X 1.0, not 1.8%; at the Basic Finner's 0.69 to 0.76 it is 1.5% to 2.2%
    below that value.

## 9. Open

- The offset at M 2.97 (both shots 5.4% and 7.6% below the model, section
  4.2): to be checked on another set near Mach 3, not fitted on this one.
- The cone's friction at its own surface state (+0.0012 to +0.0035,
  section 3): driving the momentum integral with the Taylor-Maccoll state
  (0008 B2) changes a term the gate tested, so it needs another hold-out.
- TR 1109's laminar-over-turbulent ratio between M 2.0 and 3.1 at the
  fins' abscissa: near M 3 the laminar band's high end rests on the M 1.5
  ratio (section 10.2).
- The rounded edge at M 2.90 to 3.0 and Re_D 1.4e5 to 1e6: covered by TN
  2960's and RM A55H31's statements together (TN 2960 to M 2.90 at Re_D
  1e5 to 1e6, RM A55H31 from M 2.48 at Re 6.7e3 to 1.4e5), not by either
  alone, and labelled "covered by RM A55H31" (round 5's response, section
  10).
- A second hold-out for the Basic Finner's class: this one is used, so
  any change to the terms it tested is "estimated on the Basic Finner, not
  validated" until another set tests it.
- RM A51J25 fig. 7's curve below M' 1.50 (read once; under the PARD
  symbols, not checkable); the band's domain starts at M 1.5.
- The Basic Finner report's refs. 3 to 5: BRL Report 934 (MacAllister
  1955, the Basic Finner in the BRL spark range) is transcribed as a
  candidate second hold-out
  (`docs/research/total-drag/data/basic_finner_brl934.md`), not yet read
  by a second reader and not run; its fin leading-edge radius is not
  stated, which changes both the drag and the refusals. BRL Report 799
  and BuOrd Ballistic Technical Note 5 were not reached.
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

## 10. Round 5: the independent audit of the total

The round 5 audit
([`audit_round5.md`](../research/total-drag/audit/round5/audit_round5.md),
2026-10-20) re-implemented the Basic Finner's total from the records
alone, in Python, and committed it before opening any bowshock output.
It reproduced every component at every shot to within half a unit of the
gate record's fifth decimal; the body base differed, and it traced the
difference to three record-level choices (findings 2, 5 and 6). It found
no bug in the code's arithmetic. Its findings concern the records and the
physics of two bands. What was done about each (sizes in C_D on the
cylinder's cross-section and in % of the modelled total):

| #   | Finding                                                                                          | Size                                                                                               | Done                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | The cone's friction is taken at free-stream edge conditions, and no record listed it with a size | +0.0012 to +0.0035 omitted (+0.2% to +0.9%), largest at M 2.97                                     | Listed in section 3 with its size; stated beside the M 2.97 offset (sections 4.2, 7); the model not changed          |
| 2   | The fins-on-base band between rows: the record's rule at the shot's M is not what the code does  | at M 2.414 the code's body base 0.0016 below the rule's (-0.35%), its band's high end 0.0034 below | Section 1.3 now states what the code does (the gate ran it), with the step at M 2.41 and these sizes; code unchanged |
| 3   | The same at M 1.846 to 2.364                                                                     | the code's body base 0.0002 to 0.0004 above the rule's (+0.05% to +0.08%)                          | Section 1.3                                                                                                          |
| 4   | The fins' roots remove no body wetted area; the tip faces carry no friction                      | net +0.00025 to +0.00034 omitted (+0.06%)                                                          | Section 3, with the roots' area corrected: 0.1754 cal^2, 0.65% of the body's, not 0.59%                              |
| 5   | Round 3's +-0.003 at M 2.97 and 3.00 was in no record                                            | the body base at M 2.97 0.00019 lower than with +-0.002 (-0.05%)                                   | Section 1.3 states it and its origin                                                                                 |
| 6   | Round 3's tunnel pairs stand at the tunnels' Mach numbers, not at its read ones                  | the body base at M 2.414 0.00025 higher than at round 3's read Mach numbers (+0.05%)               | Section 1.3                                                                                                          |
| 7   | The transition input was added as two independent ends                                           | the tolerance's high end 3.4 to 4.1 points too wide at every shot                                  | The band arithmetic changed: the input as states of the boundary layer (10.1); the tolerance re-derived (10.3)       |
| 8   | The trailing edges' laminar band implies a negative base pressure at M 2.97                      | its high end, 1.320 of the term, means p_b / p_inf = -0.016                                        | Every base term and band end clamped at the vacuum bound; the envelope kept, with the reasoning (10.2)               |
| 9   | The nose band's unit: "7e-5" read as absolute would widen it                                     | +-6e-5 per band end                                                                                | Section 3 now says "7e-5 of the value", what the code applies; negligible                                            |
| 10  | The interpolation bound's curvature is the larger curve's                                        | conservative by a factor of 1.6 on the served curve, at most 1e-4 in P_B                           | Section 1.1 now says so; negligible                                                                                  |
| 11  | Rounded leading edges above Re_D 1e6 were accepted and labelled "measured"                       | does not reach the Basic Finner (Re_D 0.95e4 to 1.58e4)                                            | Refused above 1e6, TN 2960's highest (section 5.2, `rounded-leading-edge.test.ts`)                                   |

**This is a change to the band arithmetic, made after the hold-out was
used** (findings 7 and 8). It was made on the audit's physical arguments,
with the residuals known. It changes no component, no model-form band and
no residual; it narrows the tolerance's high end, so it cannot make a pass
easier, and the stricter tolerance still passes at every shot (10.3).
0008 section 6.1 labels a band set or widened with the gate's data
"estimated on the Basic Finner, not validated"; this change sets no band
from those data and widens none, but it was made with them known, so the
second run's output and tolerances are kept and reported beside the
re-derived ones (section 4.2, `runs/gate-second-run.out`), not replaced.

### 10.1 The transition input as states of the boundary layer (finding 7)

At the second run the tolerance took the transition input as two
independent ends: the friction change of the laminar runs on the low side
(the high side zero), and the trailing edges' laminar band on both sides.
The trailing edges' band exists only where a run leaves a fin laminar at
its trailing edge (Re_T at least Re_c). A fin laminar at its trailing edge
is laminar along its whole chord, so its friction falls at the same time,
by 0.0175 to 0.0242 in C_D on the Basic Finner, more than the laminar base
can rise (at most +0.0152 to +0.0212). The band's high end, added on its
own, is a state no boundary layer reaches.

`src/total/finned-body.ts` now evaluates each Re_T as one state, every
component it reaches changed together (section 3), each also with the
body turbulent, and takes the input's ends over the states and the
turbulent nominal (`tests/total/total-drag.test.ts` checks the states
against an independent computation). On the Basic Finner:

- **The high end is the fully turbulent nominal at every shot.** The
  highest state lies 0.0010 to 0.0034 below it (`gate-round5.out`); before,
  the high end was the trailing edges' laminar high end, +0.0162 to
  +0.0212, 3.4 to 4.1 points of the total.
- **The low end is unchanged,** -0.0253 to -0.0466: the run to 3e6 on the
  body and the fins, with the trailing edges laminar, the same state the
  sum of the two ends described.

### 10.2 The trailing edges' laminar band near M 3, and the vacuum bound (finding 8)

**The vacuum bound.** The laminar band takes the envelope of TR 1109's
laminar-over-turbulent ratio at M 1.5, 2.0 and 3.1, so its high end is the
M 1.5 ratio at every Mach number: 1.320 of the term at M 2.969, where the
nominal is p_b / p_inf = 0.230 and 1.320 times its base drag means p_b /
p_inf = -0.016, a negative absolute pressure. No base term, band end or
laminar end may exceed -P_B = 2 / (gamma M^2) on its area, so each is now
clamped there (`src/base/vacuum.ts`, `fin-trailing-edge.ts`,
`base-drag.ts`). At the Basic Finner's shots (`fin-trailing-edge.test.ts`,
`compiled-curve.test.ts`, `basic-finner.test.ts`):

- the trailing edges' laminar high end is clamped at M 2.969 and 2.970
  only, to 1.2995 and 1.2994 of the term (from 1.320 and 1.319); elsewhere
  it lies at up to 0.975 of the bound;
- the trailing edges' term and its model-form band lie inside, the high
  end at 0.72 to 0.93 of the bound;
- the body base never reaches it over M 1.5 to 3.0: its high end is at
  most 0.9535 of the bound (M 3.0, fins at the base), 0.656 without fins;
  0.8840 at M 3.0 since the correction of section 11.

The audit also found the term plus both bands' high ends beyond the bound
from M 2.35 on, by +0.0039 to +0.0117 in C_D. That sum was the second
run's tolerance arithmetic. With the states of 10.1 the transition input's
high end is the turbulent nominal, so at the tolerance's high end the
trailing edges stand at their model-form high end, 0.72 to 0.93 of the
bound. The clamp then changes no tolerance value at any shot; with the
second run's arithmetic it would have lowered the high end at the two
shots at M 2.97 only, from +28.6% to +28.4% (`gate-round5.out`). One
limit remains: the clamp holds each band end, not a sum of a model-form
end and an input end on the same term. Where a laminar state sets the
input's high end (not on the Basic Finner), that sum is not clamped.

**The envelope near M 3: kept.** Near M 3 the envelope's high end is the
M 1.5 ratio carried 1.5 in Mach number, while TR 1109's own ratio at M 3.1
is 0.955 to 0.968 at the M 2.97 shots' abscissa (0.915 to 0.968 over the
fins' range), and TR 1109 warns that its laminar M 3.1 curves "may be
partially in the transition region", their base pressure "a little too
low" (p. 16), which would put the true M 3.1 ratio lower still. No
measurement near M 3 supports a laminar ratio above 1. The envelope is
kept for four reasons:

1. It is the construction ruled before the gate (section 5.1): the ratio
   changes sign between M 1.5 (1.19 to 1.32 over the fins' range) and 2.0
   (0.85 to 0.90), so three Mach numbers give no basis for interpolation,
   and the M 1.5 and 2.0 laminar curves cross at 0.016 to 0.022, just
   above the fins' abscissa (0.0089 to 0.0115). Replacing it now would
   narrow a band after the hold-out was used, with the residuals known.
2. With the states of 10.1 its high end sets no tolerance end at any shot.
   The least plausible part no longer enters the gate.
3. Its low end at M 2.97 is M 2.0's ratio, 0.870: a measured value of the
   same sign as M 3.1's, and the wider of the two, so the conservative
   side.
4. The vacuum bound now holds it within physics.

The alternative, flagged and not adopted: the ratio at the read Mach
number nearest the shot's (M 2.0 up to M 2.41, M 3.1 from M 2.66). It
changes nothing at the six shots up to M 2.414 (the envelope's ends there
are M 2.0's) and narrows the tolerance's low end by 1.0 to 1.1 points at
the five from M 2.663: -25.0% to -25.1% for -26.1% to -26.2%, and -18.4%
for -19.5% at M 2.97, where both residuals (-5.4%, -7.6%) still lie
inside (`gate-round5.out`). The band stated beside the term at M 2.97
would be -4.5% to -3.2%, not -13.0% to +30%.

### 10.3 The re-derived tolerances

The tolerance of each shot is in section 4.2's table, with the second
run's beside it. Over the 11 shots:

| Tolerance on the residual       | Second run       | Re-derived after round 5 |
| ------------------------------- | ---------------- | ------------------------ |
| Low end                         | -19.5% to -26.2% | -19.5% to -26.2%         |
| High end                        | +26.5% to +31.4% | +23.1% to +27.4%         |
| High end without the wall input | +22.7% to +26.1% | +18.7% to +22.1%         |
| Smallest margin, low side       | 11.8 points      | 11.8 points              |
| Smallest margin, high side      | 26.2 points      | 22.4 points              |

The residuals are unchanged (-7.7% to +4.5%, mean -1.9%) and every shot
passes. The high end falls at each shot by exactly the trailing edges'
laminar high end (unclamped) over the total, 3.4 to 4.1 points: the test
reproduces the second run's tolerances from the present code by adding
that term back (`basic-finner.test.ts`), and `gate-round5.out` prints
both. The audit's own figures were +23.1% to +27.4%.

**With 0011 (the total on the drag page).** 0011 section 6 found the
leading-edge and trailing-edge labels without "tested only in the total",
which section 7 asks of the base and fin terms; both now say it. Its other
label finding is finding 11. The page quotes the re-derived tolerances
(`src/app/total-drag.ts`, held to the library by `tests/app/`).

**Also noted, not changed.** Found while acting on finding 11: between M
2.90 and 3.0 at Re_D 1.4e5 to 1e6 the rounded edge is labelled "covered by
RM A55H31", though RM A55H31's statement stops at Re 1.4e5 and TN 2960's
at M 2.90; the two together cover it, neither alone (section 9). The band
is the same either way, and the Basic Finner is not there.

## 11. The free-flight curve of TN 3819 fig. 35 identified, and the factor corrected (2026-10-20 and 21)

### 11.1 The finding

TN 3819 fig. 35 (Love 1957, NTRS 19930084517, printed page 64, PDF page 66) draws four curves: the faired free-flight curve of ref. 12, in the
long-short dash of the only line style its legend shows; Love's two
predictions, "estimate A" and "estimate B", both from M 1.5 to 3.0; and
the solid body-alone curve of fig. 18. Both readings behind section 1.3
took "the most negative with-fin line wherever the lines separate" for
the free-flight line. An independent identification from the report
alone found that above about M 2.15 that line is estimate B, a
prediction, and that the free-flight curve ends at M 2.563. So above
about M 2.15 the second run's fins-on-base term rested on a prediction,
and above M 2.56 on no free-flight data at all: 8 of the 11 gated shots
(M 2.35 to 2.97) were affected. The validated class was narrowed at once
to Mach 1.799 to 2.15 (section 7; 0011 section 3; commit 68ae3ee). This
section records the identification, the two readings of the identified
curve, the corrected factor, and the gate re-run with it, which is a
recorded correction, not a validation.

### 11.2 The identification

Made before either reading below, from the report alone; its crops,
overlay and scripts are in `docs/research/total-drag/fig35-free-flight/identification/`:

- **The legend** shows one line style, long dash, one short dash, long
  dash, for "Free-flight tests of finned model, ref. 12" (measured at 600
  dpi: long 96 px, short 20, long 80).
- **The text** (printed p. 23): "No calculations were made below M = 1.5"
  (both estimates start at M 1.5); "Shock detachment and the interaction
  of the shocks from opposite fins may explain the reason the
  experimental results level off at the lower Mach numbers" (only the
  free-flight line runs from M 1.0 and levels off); "the former estimate
  (labeled estimate A) is more in agreement with experiment at the higher
  Mach numbers, whereas the latter estimate (estimate B) tends to be more
  satisfactory at the lower Mach numbers".
- **The dash patterns**: the free-flight style on the line from M 1.0 to
  the knee near M 1.65, on the most negative line of the steep part to M
  2.0, and on the least negative with-fin line of the right-hand side,
  which ends at M 2.563 (a single short dash between long ones at M 2.31
  to 2.33 and 2.405 to 2.42; the independent review of 2026-10-21
  confirmed the first, at M 2.310 to 2.3235, on its own scan, but not the
  second, both of whose bounding gaps sit under gridline crossings); estimate A, long dashes with groups of
  short ones, on the middle line to M 3.0; estimate B, regular dashes, on
  the most negative line above about M 2.15, to M 3.0.

Found: the free-flight curve starts at M 1.0, levels off at M 1.2 to 1.7,
falls steeply as the most negative with-fin line, crosses estimate B near
M 2.0 to 2.1 and estimate A near 2.15, and ends at M 2.563 as the least
negative with-fin line. The identification's stated confidence: about 99%
for the legend and the left half, 95% for B along its length, 85% for
which right-hand line is free flight and which is A. Both readers checked
it on their own scans by the dash patterns (the second on its own render,
with its own dash profiles) and agree.

### 11.3 The two readings

Each read the free-flight curve from M 1.0 to its end, every 0.05, and
estimates A and B and the no-fin curve beside it, without seeing the
other's values:

- **First** (`fig35-free-flight/reading1/`), following the identification
  on its rectified render (160 px per grid cell): column tracking of each
  line along a guide, a darkness-weighted centre in every inked column,
  then a local quadratic over +-0.02 in M. Error +-0.002, +-0.003 where
  the line touches or merges with another.
- **Second** (`fig35-free-flight/reading2/`, the reader's commits 8c28afe
  and e1b70d3; audit round 6, revised), on its own 600 dpi render with a
  calibration from every gridline, skew-fitted: M 1.0 to 1.70 by column
  tracking (its blind first pass, unchanged); M 1.72 to the end by guided
  column reads along the line it identified by dash profile. Error the
  ink's, 0.0003, plus 0.002 where the line merges with B at the knee (M
  1.64 to 1.76) and 0.003 where it crosses A (M 2.0 to 2.25). Its first
  version had followed the middle line, estimate A, above about M 2.2;
  that part is replaced.

| M     | First   | Second  | Difference |
| ----- | ------- | ------- | ---------- |
| 1.00  | -0.2998 | -0.2998 | 0.0000     |
| 1.20  | -0.2751 | -0.2750 | 0.0001     |
| 1.40  | -0.2675 | -0.2675 | 0.0000     |
| 1.60  | -0.2654 | -0.2654 | 0.0000     |
| 1.70  | -0.2622 | -0.2611 | 0.0011     |
| 1.80  | -0.2362 | -0.2369 | 0.0007     |
| 1.90  | -0.2107 | -0.2108 | 0.0001     |
| 2.00  | -0.1903 | -0.1897 | 0.0006     |
| 2.10  | -0.1744 | -0.1746 | 0.0002     |
| 2.15  | -0.1675 | -0.1693 | 0.0018     |
| 2.20  | -0.1621 | -0.1633 | 0.0012     |
| 2.30  | -0.1512 | -0.1515 | 0.0003     |
| 2.40  | -0.1424 | -0.1425 | 0.0001     |
| 2.50  | -0.1353 | -0.1353 | 0.0000     |
| 2.55  | -0.1322 | -0.1321 | 0.0001     |
| 2.563 | (end)   | -0.1317 | (end)      |

**Paired** (0014 section 10.1, rule 5): at all 32 Mach numbers both read,
the two agree within their combined errors; the largest differences are
0.0018 at M 2.15 and 0.0012 at 2.20 (in the crossing with A), 0.0011 at
1.70 (the knee) and 0.0007 at 1.80; elsewhere at most 0.0006. No row
differs beyond the combined errors. Both end the line at M 2.563 +-0.002,
P_B -0.1318 (first, at M 2.56) and -0.1317 (second). Two of the second
reading's values sit off the line the first reading follows, each within
its own +-0.003 there: at M 2.15, -0.1693, on estimate B (0.0004 from its
own reading of B; the first reading's -0.1675 is on the free-flight line,
which at M 2.15 is one stroke with estimate A, the two merged from M
2.135 to 2.19), and at M 2.20, -0.1633, just past where they part
(0.0001 from its own reading of A; the first reading puts the free-flight line at
-0.1621 and A at -0.1626). They are kept as read; the rows there take
both readings, as every row does, inside the swap allowance.

**Calibration checks.** The no-fin curve of fig. 35 against fig. 18's
basic curve (`src/base/tn3819-fig18.ts`), which it reproduces within 0.001
(0008 section 3.4): the first reading within 0.0009 at the 13 Mach
numbers it tracked from M 1.0 to 3.2 (within 0.0005 at 11); the second
within 0.0008 at M
1.0 to 3.2 except two points. At M 2.4 it reads -0.1194 against -0.1224,
where the Langley no-fin diamond sits on the curve (it read the symbol at
M 2.4108, -0.1202); the first reading's track there gives -0.1223. At M
1.4 both readings put fig. 35's curve at -0.1774 to -0.1775, against
-0.1796 in fig. 18's adopted row at M 1.4, which rests on one reading
(0014 section 10.4): that row, or the drafting of fig. 35, differs there
by 0.002. Nothing is served below M 1.5, so neither changes a served
value; it is recorded for fig. 18's second reading.

**The earlier readings.** Both agree with the identified curve within
0.0003 at M 1.1 to 2.1 (round 3's -0.2588 at the knee, M 1.70, is 0.0034
from it, where P_B changes by that in 0.015 of M), and with estimate B
(the first reading's track of it) within 0.0004 at M 2.2 to 2.6. They are
kept, superseded, as `TN3819_FIG35_SUPERSEDED`; no row uses them.

**The identity-swap allowance.** The free-flight line's distance from the
nearer estimate at M 1.75 to 2.56, each reading against its own reading
of A and B (`TN3819_FIG35_ESTIMATES`): estimate B, 0.0058 to 0.0077 less
negative at M 1.75 to 1.85, one stroke with it at 2.05 to 2.10; estimate
A, one stroke at 2.15, then 0.0024 to 0.0054 more negative at 2.3 to
2.56. The allowance is the largest of these over both readings, 0.0077
(B at M 1.80, second reading; 0.0063 in the first), applied at M 1.75 to
2.56 so that a swap with the nearer line is covered (section 1.3's was
0.005 at M 1.75 to 2.35).

### 11.4 The corrected factor, M 1.80 to 2.56

The rules of section 1.3, unchanged, on the two readings of the
identified curve (`src/base/fins-on-base.ts`, `src/base/tn3819-fig35.ts`):
rows at every Mach number both read, every 0.05 from M 1.80 to 2.55, and
M 2.56 (`FIG35_FREE_FLIGHT_END`, the first reading's last point, inside
the second's end at 2.563). The tunnel excess over free flight, re-derived
against the corrected curve: 0.141 at M 1.50, 0.076 at 2.00 and **0.208
at 2.41** (round 3's reading of the Langley pair against the first
reading of the curve; 0.113 before), carried above M 2.41 as before.

| M    | F, free flight | Low   | High  | Half-width | Superseded (section 1.3) |
| ---- | -------------- | ----- | ----- | ---------- | ------------------------ |
| 1.80 | 1.510          | 1.228 | 1.559 | 11.9%      | 1.236 to 1.537           |
| 2.00 | 1.315          | 1.129 | 1.387 | 10.2%      | 1.140 to 1.387           |
| 2.20 | 1.227          | 1.080 | 1.378 | 12.1%      | 1.101 to 1.378           |
| 2.40 | 1.164          | 1.050 | 1.371 | 13.3%      | 1.120 to 1.371           |
| 2.50 | 1.154          | 1.044 | 1.363 | 13.2%      | 1.127 to 1.411           |
| 2.56 | 1.153          | 1.043 | 1.361 | 13.2%      |                          |

(F: the larger of the two readings' factors; every row is in
`gate-corrected.out`, asserted by `fins-on-base.test.ts`.) To M 2.15 the
rows barely move: the same line, read again, with the larger swap
allowance, a second reading and rows every 0.05 (what moved there, and
why, in section 11.7). Above it the free-flight factor falls, against the line read
before (estimate B), by 0.01 at M 2.2, 0.09 at 2.4 and 0.12 at 2.5, which
lowers the low end; the high
end is held up there by the tunnel factor to M 2.41 and by the carried
excess, now larger, beyond. The half-width is at most 13.3% (12.2%
before).

### 11.5 Above the curve's end: bounded, not measured (M 2.56 to 3.0)

Above M 2.56 the figure has no free-flight data. Decided by the owner on
2026-10-20, under 0014 section 10.2, before the gate was re-run: the term
is "bounded, not measured" (recorded in 0014 section 10.7, amendment a).

- **Which fins.** Only those the present factor's sources measured: four
  unswept fins, 5% to 10% thick, at the base (TN 3819 figs. 33 and 35, TN
  2360). Since 2026-10-21 the factor refuses fins with a swept leading or
  trailing edge, and so any tapered planform, in the measured and the
  bounded parts alike (`fin-sweep`; 0014 section 10.7, amendment d). Until
  then it took no sweep: the independent review of 2026-10-21 found four
  8% double wedges swept 45 deg at both edges, at the base, served at M
  2.0 as an analogy (F 1.258) and at M 2.8 as bounded, 1 to 1.3612, where
  RM L52J21a measures F of about 0.96 to 1.12 for four 45 deg swept 8%
  fins (0015 section 3.4), below this band. The rebuilt factor (W1)
  serves swept fins where it measures the sweep (0015 sections 3.4 and
  5), not these: a sharp section with its trailing edge swept at the base
  is refused there, since RM L52J21a's fins end 0.85 +-0.05 root chords
  ahead of it; plates go to it too (0014 section 10.7, amendment i).
- **Lower bound: no fin effect, F = 1** for the present factor. It is
  defined on Love's basic curve, which fig. 35's own no-fin curve
  reproduces, so no fin effect is exactly F = 1, and every source it is
  built on shows four unswept fins 5% to 10% thick at the base lowering
  the base pressure, never raising it. It is not the rebuilt factor's
  zero member's low end, 0.938 (0015 section 3.5), a relief measured on
  RM L52J21a's 45 deg swept fins, which the present factor refuses.
- **Upper bound: the factor at M 2.56 with its band's high end,** 1.3612
  (the free-flight factor 1.153 plus the carried excess 0.2083), carried
  as a ratio to M 3.0.
- **Served:** the midpoint, F = 1.1806, its band the whole gap, 1 to
  1.3612; the body base's label "bounded, not measured: the fins-on-base
  factor between no fin effect (F = 1 on the basic curve of TN 3819 fig. 18) and its value at M 2.56, where the free-flight curve of TN 3819 fig.
  35 ends (the high end of its band there, F = 1.361), ...", with the gap
  in C_D beside it (0.0396 at M 2.663 to 0.0352 at 2.97). A total that
  contains it is at best "an estimate, not validated", and its claim
  names the bounded component.
- **The step at M 2.56.** The served factor is not continuous there: the
  nominal falls from 1.2020 (the M 2.56 row, 1.043 to 1.361) to 1.1806,
  about -0.0024 in the Basic Finner's body base C_D, -0.55% of its total,
  and the low end from 1.043 to 1.

**The ordering** (that F lies between the bounds above M 2.56), written
before the number was served, as 0014 section 10.2 asks, and restated on
2026-10-21 after the review. As first written it rested on Love's "Also
indicated is the decrease in fin effects as Mach number increases"
(printed p. 23), which fig. 35 shows from M 1.7 to 2.56 (F - 1 falls from
0.51 at M 1.8 to 0.31 at 2.0 and 0.15 at 2.56). Above the curve's end the
figure does not show that: both of Love's predictions, in both readings,
rise from M 2.6 to 3.0 (A: F 1.20 to 1.23; B: 1.29 to 1.33). What holds
the bound is its margin, not a trend: the free-flight factor at the
curve's end is 1.153; held fixed in P_B (the fin effect at M 2.56 carried
as an increment) it would be 1.18 at M 3.0; the upper bound, 1.3612, lies
above both by the carried tunnel excess, 0.2083, and above both
predictions. That the predictions lie inside the band (at every Mach
number read from 2.6 to 3.0, `fins-on-base.test.ts`) checks two
predictions, not the bound. In linear theory a face of given slope
changes the pressure by an amount proportional to the slope over
sqrt(M^2 - 1); over M 2.56 to 3.0, sqrt(M^2 - 1) |P_B,no fins| changes
by +1.2% (0.2694 to 0.2727), so at fixed slope F - 1 would change by
about 1%: a judgement, not a measurement. Carried as an increment of the
high end instead, the high end would rise to 1.367 at M 2.6, 1.397 at
2.8 and 1.428 at 3.0, against 1.361.

### 11.6 The gate re-run: a recorded correction, not a validation

The hold-out is used. **The correction was made on the figure's evidence
alone, after the gate's residuals were known, and it moves the model
toward the shots at high Mach number.** It is recorded here, beside the
second run and round 5, as the corrected model against the same shots;
it is not a new test, and it validates nothing. Only the body base
moves; every other component and every input band is the second run's
(`basic-finner.test.ts`; `docs/research/base-and-total/runs/gate-corrected.out`
and `.json`).

After this re-run the compiled curve's band was widened from 0.82 to 1.08
to 0.77 to 1.18 (2026-10-27, 0014 section 10.7 (ah); section 1.2). The
table below keeps the re-run's bands and tolerances; with the widened band
the tolerances are -21.5% to -28.5% and +26.8% to +31.6%, the totals and
residuals are the same, and every shot stays inside.

| Shot       | M     | CX0   | Second run C_D | Residual | Tolerance (round 5) | Corrected C_D (band)      | Residual | Tolerance        |
| ---------- | ----- | ----- | -------------- | -------- | ------------------- | ------------------------- | -------- | ---------------- |
| DA95021318 | 1.799 | 0.594 | 0.6123         | -3.0%    | -24.2% to +23.1%    | 0.6134 (0.5296 to 0.7297) | -3.2%    | -24.6% to +23.5% |
| DA95021529 | 1.846 | 0.598 | 0.5955         | +0.4%    | -23.8% to +23.1%    | 0.5952 (0.5164 to 0.7064) | +0.5%    | -24.0% to +23.3% |
| DA95021308 | 1.850 | 0.567 | 0.5944         | -4.6%    | -23.8% to +23.1%    | 0.5940 (0.5155 to 0.7048) | -4.5%    | -24.0% to +23.3% |
| DA95021328 | 2.348 | 0.500 | 0.4846         | +3.2%    | -21.3% to +25.6%    | 0.4811 (0.4187 to 0.5718) | +3.9%    | -22.0% to +26.4% |
| DA95020907 | 2.364 | 0.478 | 0.4824         | -0.9%    | -21.3% to +25.6%    | 0.4787 (0.4166 to 0.5688) | -0.1%    | -22.0% to +26.5% |
| DA95021317 | 2.414 | 0.473 | 0.4745         | -0.3%    | -21.0% to +25.5%    | 0.4699 (0.4094 to 0.5581) | +0.7%    | -21.9% to +26.6% |
| DA95020927 | 2.663 | 0.446 | 0.4428         | +0.7%    | -26.2% to +27.2%    | 0.4314 (0.3763 to 0.5123) | +3.4%    | -27.0% to +28.5% |
| DA95020906 | 2.741 | 0.400 | 0.4332         | -7.7%    | -26.1% to +27.4%    | 0.4215 (0.3679 to 0.5002) | -5.1%    | -26.9% to +28.6% |
| DA95020916 | 2.749 | 0.452 | 0.4323         | +4.5%    | -26.1% to +27.4%    | 0.4206 (0.3672 to 0.4991) | +7.5%    | -26.8% to +28.6% |
| DA95030603 | 2.969 | 0.385 | 0.4072         | -5.4%    | -19.5% to +24.6%    | 0.3951 (0.3459 to 0.4678) | -2.6%    | -20.0% to +25.7% |
| DA95022205 | 2.970 | 0.376 | 0.4071         | -7.6%    | -19.5% to +24.7%    | 0.3951 (0.3458 to 0.4677) | -4.8%    | -20.0% to +25.7% |

(Tolerances by round 5's arithmetic, section 10.3; the second run's own
high ends were +26.5% to +31.4%. Corrected bands rounded outward, as the
page shows them, 0011 section 2; the run's output rounds to the nearest.) Every shot lies inside its tolerance.
Over the 11: residuals -5.1% to +7.5%, mean -0.4% (second run -7.7% to
+4.5%, mean -1.9%); tolerances -20.0% to -27.0% and +23.3% to +28.6%;
smallest margins 15.2 points on the low side and 21.1 on the high (11.8
and 22.4 after round 5). The modelled total falls by 2.6% to 3.0% at the
five shots above M 2.56 (the bounded factor, nominal 1.181 against
1.284 to 1.304 before), by 0.7% to 1.0% at M 2.35 to 2.41, and moves by
-0.07% to +0.17% at M 1.80 to 1.85 (printed as -0.17% to +0.07% when
first recorded, the signs swapped; corrected 2026-10-21 with section
11.7). Per cluster, mean (min, max, sd):
-2.4% (-4.5%, +0.5%, 2.6) at M 1.80 to 1.85, +1.5% (-0.1%, +3.9%, 2.2) at
2.35 to 2.41, +1.9% (-5.1%, +7.5%, 6.4) at 2.66 to 2.75, -3.7% (-4.8%,
-2.6%, 1.6) at 2.97; the second run's means were -2.4%, +0.7%, -0.8% and
-6.5%. The offset at M 2.97, -6.5% at the second run, is -3.7% after the
correction, which was not aimed at it: it follows from the figure.

### 11.7 What may be claimed after the correction: nothing validated, then a narrow sub-class

**The validated claim is suspended.** Decided by the owner on 2026-10-21,
by the rule of 0008 section 6.1: the hold-out is used, and "any later
change to a term it tested is 'estimated on the Basic Finner, not
validated' until another set tests it". The correction changes the
fins-on-base factor, a tested term, inside the class as well as above
it, so the Basic Finner's total drag is "an estimate, not validated"
everywhere until a held-back set tests the corrected factor. Nothing on
the page or in the library is labelled validated meanwhile (the claim
inside the class carries the reason; `src/app/total-drag.ts` has no
validated claim to show).

**Since 2026-10-22: range A run, the class still suspended, a narrow
sub-class validated** (0014 section 10.7 (q); the run, 0020). Range A was
run once as registered and the present model passed at all seven rounds
it serves: measured over modelled +3.9% to +11.0% (mean +7.3%, the model
low at every round), inside tolerances of +-25% to +-28%. It overlaps the
class in nothing: inside the class's Mach range its rounds flew at
Reynolds numbers of 7.96e6 to 8.87e6 on length, below the floor of
1.19e7, and every round was run with sharp fin leading edges, where the
class has DREV's 0.004 cal. So the class stays "an estimate, not
validated" (its values unchanged); its reason now says that the test was
run and passed at conditions outside it, so nothing has tested the
corrected factor inside it. By the owner's decision a new, narrow
sub-class is validated at exactly the tested conditions, and is the only
total labelled validated: the Basic Finner as transcribed, each dimension
within 0.5%, with sharp fin leading edges; Mach 1.801 to 1.827 or 2.423 to 2.468 (nothing between), with the Reynolds number on length 4.423e6 to 4.855e6 times the Mach number (the run's range at every round, from the diameter and the air); 288 to 298 K
(`brl934SubClass` in `src/app/total-drag.ts`). Its label says the test
was made once, that the model reads low at every round, that the
tolerance is wide, that the diameter, air and trailing-edge area at the
test were assumed (0014 section 10.6), that halving the trailing-edge
area raises the residuals to +14.5% to +22.3%, and that DREV's rounded
edge was refused at the five rounds at Mach 1.80 to 1.83 and lowers the
residuals at Mach 2.42 and 2.47 to -1.1% and -4.2%, a sensitivity. The rebuilt factor (W1) was refused at every round and has
no hold-out.

- **What moved inside the class, and why.** Below M 2.15 the superseded
  readings followed the free-flight curve too, but the corrected factor
  is not the same there. The body base drag, superseded to corrected,
  moves by +0.00105, -0.00031 and -0.00042 in C_D at the three shots (M
  1.799, 1.846, 1.85) and by -0.00082 and -0.00123 at M 2.0 and 2.15
  (`tests/base/fins-on-base.test.ts` reproduces both factors). Four
  causes, each taken alone against the superseded factor (the order of
  the steps moves the last digit):
  - the swap allowance, 0.005 to 0.0077: +0.00067, +0.00022, +0.00018,
    -0.00068 and -0.00068 at those five Mach numbers, by moving the
    band's ends and with them its midpoint, the nominal factor;
  - reading 2's -0.2369 at M 1.80 (reading 1's -0.2362): +0.00035 at M
    1.799 (+0.00037 taken in another order), through the high end, which
    is the larger over both readings;
  - the rows now every 0.05 in M, so a row at M 1.85 where the
    superseded factor interpolated from 1.8 to 1.9: -0.00072 and
    -0.00079 at M 1.846 and 1.85;
  - at M 2.10 to 2.15 the superseded factor was interpolated toward its
    M 2.2 row, which rested on estimate B, so the top of the old class
    partly rested on B: -0.00056 at M 2.15 from the readings and the
    rows, the allowance apart.

  The two readings differ by up to 0.0018 in P_B, at M 2.15, within their
  combined errors (section 11.3). The residuals at the three shots go
  from -3.0%, +0.4%, -4.6% to -3.2%, +0.5%, -4.5%, the totals by -0.07%
  to +0.17%, the tolerances by 0.2 to 0.4 points; the page's defaults (at
  the range's Reynolds number, section 5 of 0011) by +0.17%, -0.15% and
  -0.24% at M 1.8, 2.0 and 2.15 (-0.24% also at the class's corner of
  Reynolds number 2.0e7 at M 2.15); the factor's band at M 1.80 from 1.2365
  to 1.5373 to 1.2282 to 1.5590. Small, but a change to a term the gate
  tested, inside the class, and made after its residuals were known:
  together with the owner's decision, that is why the class's claim is
  suspended. Above the class the total falls by 0.7% to 1.0% at M 2.35
  to 2.41 and by 2.6% to 3.0% at M 2.66 to 2.97 (section 11.6).

- **The class is kept for the registered test** (as written on
  2026-10-21; that test has since run and covers nothing inside the
  class, so the class is kept for a test that covers it, none registered,
  0014 section 10.7 (q)): Mach 1.799 to 2.15
  with its other limits (0011 section 3). That test covers its Mach range
  at BRL's conditions, not the whole class: BRL's Reynolds numbers (about
  0.7 times DREV's, at or below the class's floor of 1.19e7) and its sharp
  leading edges lie outside it (0014 section 10.6). A
  case inside it is an estimate whose reason is the suspension; a case
  outside it, an estimate with every condition it fails. The class was
  first narrowed to 2.15 (2026-10-20) because the factor tested above it
  rested on a prediction; a correction made with the residuals of the
  shots at M 2.35 to 2.41 known cannot validate on those shots under the
  pre-registration of 0014 section 10, so they support no claim.
- **The route back:** BRL Report 934's range A, Mach 1.5 to 2.47 (0014
  section 10.5), the Basic Finner in free flight, run once as registered,
  after its second reading and the decisions of 0014 section 10.6, as the
  test of the corrected factor (the present model is reported at its
  rounds at M 1.798 to 2.47 beside the rebuilt one, 0014 section 10.3).
  If it passes, the class is validated over what that range supports; if
  it fails, the claim is withdrawn (0014 section 10.3). It covers 2.15 to
  2.47 beyond the class; no registered range of the Basic Finner covers
  2.47 to 2.56. Not run (as written on 2026-10-21). Run on 2026-10-22: it
  passed, but supports nothing inside the class, so the class stays
  suspended and the sub-class above is validated instead (0014 section
  10.7 (q)). No other registered test covers the class.
- **History, kept.** The second run (section 4.2) passed at all 11 shots
  and opened the class; round 5 re-derived its tolerances (section 10);
  the correction's re-run (section 11.6) is recorded beside both. At M
  2.35 to 2.41 the corrected model lies +3.9%, -0.1% and +0.7% from the
  shots (mean +1.5%), inside the tolerance, as the second run's -0.9% to
  +3.2% did: a comparison made after the residuals were known, labelled
  so, and not evidence for any claim.
- **Served:** the Basic Finner, outside the BRL sub-class, as "estimate,
  not validated", with the corrected band, never refused (tests at M 1.8, 2.0 and 2.15
  inside the class and 2.3, 2.5 and 2.9 above it, in
  `tests/app/total-drag.test.ts`, `tests/app/total-drag-display.test.ts`
  and `tests/gpu/nose-drag-page.test.ts`); above M 2.56 its claim also
  names the bounded factor.

### 11.8 Records and tests

- `docs/research/total-drag/fig35-free-flight/`: the identification, both
  readings, the pairing and the calibration checks (its README).
- `src/base/tn3819-fig35.ts`: the two readings (`TN3819_FIG35_FREE_FLIGHT`),
  the end, the swap allowance, the superseded readings and their
  allowance, Love's estimates as both readings read them.
- `tests/base/fins-on-base.test.ts`: the readings as recorded and paired;
  the swap allowance from both readings' estimates; the superseded
  readings on the curve to M 2.1 and on B above; 0008's and round 3's
  tables and the round 5 findings reproduced from the superseded readings;
  the corrected rows, excess and band; what moved inside the class and
  why (section 11.7); the bounded factor, its label, Love's estimates
  inside it and rising, the margin that holds the bound, the step at M
  2.56, the increment alternative and the linear-theory scale; swept and
  tapered fins refused in the measured and the bounded parts (section
  11.5).
- `tests/total/total-drag.test.ts`: the review's probe (four 8% double
  wedges swept 45 deg at the base) refused at M 2.0 and 2.8, and served
  a chord ahead of the base.
- `tests/validation/basic-finner.test.ts`: the second run and round 5 as
  recorded, the corrected run, every shot passing under each.
- `docs/research/base-and-total/runs/gate-corrected.test.ts` and its
  `.out` and `.json`: the run as it came out.
