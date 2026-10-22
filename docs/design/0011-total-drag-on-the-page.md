# 0011: Total drag on the drag page (draft)

- **Status:** Draft. Implemented: two DOM-free modules that hold all of
  it, `src/app/total-drag.ts` (the inputs to `src/total`, the nose term,
  the class rule, the claims) and `src/app/total-drag-display.ts` (the
  fields as typed, the nose solve's outcome, and every string the page
  shows, as display blocks); and, for the present page only,
  `src/app/total-drag-render.ts` (the blocks as DOM, layout only), the
  total-drag section of `demos/nose-drag.html` and its wiring in
  `src/app/nose-drag.ts`. A redesigned page reads its fields, calls the
  two modules and lays out the blocks; nothing it shows is decided
  elsewhere. The flight condition is asked by default as altitude, Mach
  number and diameter, in the U.S. Standard Atmosphere, 1976
  (`src/atmosphere/us-standard-1976.ts`, `src/app/flight-condition.ts`;
  section 9).
- **Date:** 2026-10-20; the gate's tolerances and the edge labels updated
  the same day for the round 5 audit (0010 section 10), and the flight
  condition from altitude added and the class's static temperature
  widened to 216.65 to 320 K (sections 9 and 3); the class's Mach range
  narrowed to 1.799 to 2.15 the same day (section 3); the fins-on-base
  factor corrected to TN 3819 fig. 35's free-flight curve on 2026-10-21,
  the page's numbers, labels and gate table with it (0010 section 11);
  the Basic Finner's validated claim suspended the same day, every total
  an estimate until the registered test of the corrected factor (section
  4; 0010 section 11.7); on 2026-10-22 that test, BRL Report 934's range
  A, run and passed at conditions outside the class, and a narrow BRL
  sub-class at exactly those conditions labelled validated, the class
  still an estimate (sections 3 and 4; 0014 section 10.7 (q))
- **Inputs:** [0010](0010-base-drag-and-total.md) section 7 (what may be
  claimed), section 4.2 (the gate) and section 10 (the round 5 audit),
  [0008](0008-total-drag.md) sections
  6.3 and 6.4, [0007](0007-skin-friction.md),
  [0006](0006-shock-fitting.md) for the nose solve, `src/total/` as it
  stands.

Every number below is asserted by a test in `tests/app/total-drag.test.ts`
or `tests/app/total-drag-display.test.ts` unless another test is named.

## 1. What the page computes

The total is `src/total`'s, unchanged: `finnedBodyComponents` and
`combineComponents` on a body of a nose and a cylinder to a flat base,
with a set of identical fins on the cylinder, every component on the
cylinder's cross-section, the bands summed linearly and the input bands
kept apart (0008 section 6.3). The page adds nothing to it and changes no
component, band or label.

**The nose term** is the page's own verified solve (0006): the finest
grid's forebody pressure drag, and its band (the grids' estimate plus the
allowance of 7e-5 of the value), passed as `src/total`'s given nose term,
value and band unchanged (`noseComponentOf`). The page computes the nose in
no other way: no Taylor-Maccoll value, no second solve. The total uses a
solve only while the nose, the body behind it and the Mach number are those
it was solved for; any change to them leaves the total waiting for a new
solve. A solve without a band (not verified), one that did not converge, a
case the solver refuses, and a browser without WebGPU each refuse the
total, with the reason.

**The inputs**, lengths in calibres (the body's diameter):

| Input               | Choices                                                                                                                                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Body                | the nose solve's: nose shape and length, the cylinder behind it to the flat base; the overall length is shown                                                                                                                                                                              |
| Fins                | count; planform rectangular, trapezoidal (leading- and trailing-edge sweep) or clipped delta (taper ratio), `src/fins/planform.ts`; root chord; span from the body                                                                                                                         |
| Section             | single wedge to a blunt trailing edge (its thickness), double wedge (thickness, ridge) or hexagonal (thickness, bevels), `src/fins/section.ts`; leading-edge radius                                                                                                                        |
| Position            | distance of the root trailing edge ahead of the base                                                                                                                                                                                                                                       |
| Flight condition    | the solve's Mach number; by default an altitude (m or ft) and the body's diameter (mm), which give the next two in the standard atmosphere (section 9); or, directly, the free-stream Reynolds number on the overall length (per calibre, that over the length) and the static temperature |
| Inputs (bands only) | transition Reynolds numbers (none: fully turbulent); a wall temperature (none: adiabatic); a roughness band in C_D with its source (none: smooth)                                                                                                                                          |

`src/fins` has no circular-arc section, so the fins-on-base factor is
always carried by analogy (`sectionFamily: 'other'`, 0010 section 1.3).
The Reynolds number and temperature come by default from an altitude and
a diameter in the U.S. Standard Atmosphere, 1976 (section 9).

The fields are read as typed (`formOf`): an empty number is refused, not
read as zero; transition Reynolds numbers are separated by commas or
spaces; a roughness band with one end empty takes zero there. The page's
own checks, beyond `src/total`'s: every number finite and
positive (or zero where zero means none); the fins on the cylinder (root
chord plus distance ahead of the base at most the cylinder's length); a
roughness band containing zero and given with its source, which the page
labels "supplied on this page". A method that throws (the laminar
similarity solution finding no solution, say) is shown as a refusal with
its message.

## 2. What the page shows

Three states, from `totalDragView`, each turned into display blocks
(paragraphs, lists, tables and the claim set apart, every string final)
by `totalDragDisplay`:

- **Refused:** "Total drag refused: no number is given", and every reason,
  each as `component (reason): message`, from the nose solve, the inputs
  and every component `src/total` refuses.
- **Waiting for the nose:** no number; whether the case lies inside the
  class, and if not, every reason.
- **The total:** C_D to four decimals and its model-form band, the band's
  ends rounded outward (down and up) and as percentages of the total, also
  rounded outward (`src/app/band.ts`, `outward`); a table of the input
  bands, each as `src/total` reports it, rounded outward; the model-form
  band with every input band added (`bandWithInputs`); a table of the
  components, each with its value, band, share of the total, label and the
  source of its band, as `src/total` reports them; the claim (section 4);
  and notes.

The notes carry what the labels do not: the band of fin friction and fin
wave drag runs from 1.01 to 1.59 times the value, above it (on the ARCAS
increments the model was never above the data, 0008 section 4.3); the
fins-on-base factor does not depend on the fins' span, chord or planform
(section 6); and its flags from `src/base` (above M 2.56, where TN 3819
fig. 35's free-flight curve ends, the factor bounded, not measured; one
reading of the curve, should a row ever rest on one; the M 1.80 row
taken just below it). Every total also carries the band's caveat (the
linear sum is a minimum, not a coverage interval, 0008 section 6.3), the
breakdown as 0010 section 7 allows it, and what `src/total` does not
represent.

A table of the gate's 11 shots is on the page (`PUBLISHED_GATE`), as
re-run with the corrected fins-on-base factor (0010 section 11.6), with
the second run's residual beside each (0010 section 4.2), and held to the
library: each shot's modelled C_D, its band, its residual and its
tolerance, recomputed through the page's code, round to the printed
values, the band outward as every band on the page (so the table and a
total's headline show the same interval for the same shot: 0.5155 to
0.7048 at DA95021308). Its caption says that the re-run is a recorded correction made
after the residuals were known, not a new test.

Beside it, since 2026-10-22, the BRL sub-class in words
(`SUB_CLASS_DESCRIPTION`) and BRL Report 934's range A as run
(`PUBLISHED_BRL934`, 0020 section 2): the seven rounds, each with its
zero-yaw CD0, the modelled C_D and band (rounded outward, so 0.5189, not
0020's 0.5188, at round 3263), the residual and the tolerance, held to
the run's recorded output and to the page's own total at each round
(`tests/app/brl934-sub-class.test.ts`), and a paragraph with the
sensitivities beside the verdict.

## 3. The class rule

0010 section 7 opens one claim class, the Basic Finner's; since
2026-10-21 its validated claim is suspended (0010 section 11.7). The
registered test of the corrected factor, BRL Report 934's range A, was
run on 2026-10-22 and passed at conditions outside the class (0020), so
the class stays suspended, and a narrow sub-class at the tested
conditions is validated instead (below, "The BRL sub-class"; 0014 section
10.7 (q)). The page
decides in code whether a case lies in it (`basicFinnerClass`): the
Basic Finner as transcribed (`src/validation/basic-finner.ts`), at the conditions the gate
covered. What the gate did not test is outside. Every condition is listed
on the page when it fails.

| Condition                 | Inside                                | Why                                                                                                                |
| ------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Nose                      | a cone, 2.836 cal long, within 0.5%   | the 20 deg cone, 0.5 / tan(10 deg); fig. 2's printed 2.84 lies 0.15% from it                                       |
| Overall length            | 10.0 cal, within 0.5%                 | L/d 10                                                                                                             |
| Fins                      | four                                  | 0010 section 7                                                                                                     |
| Planform                  | rectangular: unswept, constant chord  | sweeps zero, or a taper ratio of 1                                                                                 |
| Root chord, span          | 1.0 cal each, within 0.5%             |                                                                                                                    |
| Position                  | trailing edges at the base, exactly   | fins clear of the base may not be claimed                                                                          |
| Section                   | single wedge to a blunt trailing edge | other sections may not be claimed                                                                                  |
| Trailing-edge thickness   | 0.08 cal, within 0.5%                 |                                                                                                                    |
| Leading-edge radius       | 0.004 cal, within 0.5%                | sharp-edged fins may not be claimed                                                                                |
| Mach number               | 1.799 to 2.15                         | 0010's 1.8 to 2.15, its low end at the lowest gated shot; it was 3.0 until fig. 35's lines were identified (below) |
| Reynolds number on length | 1.19e7 to 2.0e7                       | 0010's 1.2e7 to 2.0e7, its low end at the lowest gated shot                                                        |
| Static temperature        | 216.65 to 320 K                       | the shots flew at the range's air, about 294 K; across this span the modelled total moves by at most 0.13% (below) |

**The tolerance on dimensions, 0.5%,** is there for typing (2.84 for
2.836), not for other rockets. What it lets through is measured: at Mach
1.8, 2.0 and 2.15, each dimension moved to its tolerance moves the modelled
total by under 0.2% (at most: the cone's length 0.17%, the span 0.17%, the
trailing-edge thickness 0.12%, the overall length 0.09%, the leading-edge
radius 0.04%, the chord 0.01%), all of them together at most 0.6% (the
sum; at Mach 1.8, 2.4 and 3.0, when the class ran to 3.0, 0.7%), against residuals
that spread with standard deviations of 1.6% to 6.3% within a cluster
(`tests/validation/basic-finner.test.ts`) and a tolerance of about -20% to
+27%. Discrete features are exact: a cone, four fins, no sweep, the
trailing edges at the base, a single wedge.

**The page's own Basic Finner** is the exact body (`basicFinnerBody` in
`src/validation/basic-finner.ts`) to six decimals: the page opens on,
and the Basic Finner button fills, a cone 2.835641 cal long on a
7.164359 cal cylinder (`BASIC_FINNER_LENGTHS`), and the live flow page
solves the same lengths read back (`basicFinnerBodyAsTyped`), so that
the two pages solve the same case to the last bit. These were 2.836 and
7.164 until the interface's review (0012) found that the rounding moved
the solved wave drag by 2.0e-4 of its value at Mach 2 (0.104596 for
0.104617 on the grid 20 cells across), three times the band's allowance
of 7e-5 of the value. The class rule and the gate's comparisons take the
exact body and are unchanged.

**The Mach number and Reynolds number** are 0010 section 7's ranges,
widened only to take in the gated shots themselves (M 1.799, Re 1.19e7).
The Mach range stops at 2.15, not 3.0 as first ruled, because above 2.15
the fins-on-base factor the gate tested was read from one of Love's
estimates in TN 3819 fig. 35, not the free-flight curve, and the factor
corrected since, after the residuals were known, has no hold-out there
(0010 sections 7 and 11.7); three of the 11 shots lie inside it. The box
has corners no shot flew: the shots lie along Re = 6.6e6 M on length (one range, one air; 6.53e6 to
6.72e6 per unit Mach number). At Mach 1.8 and Re 2.0e7 the model lies
1.6% below its value on that line, at Mach 2.15 and Re 1.19e7 0.7% above
it (at Mach 3.0, 2.1%, when the class ran to it). The box is kept as 0010
states the class, and the corners are recorded here.

**The static temperature** runs from 216.65 to 320 K. The gate's shots
flew in the range's air, about 294 K (Table V's speed of sound, 343.4 to
344.0 m/s, is 293.4 to 294.5 K), and this rule first kept to it, 293 to
295 K. It was widened on 2026-10-20, when the flight condition came to be
asked as an altitude (section 9), for three reasons. 0010 section 7's
claim names the Mach number, the geometry and the Reynolds number, not
the static temperature; the 293 to 295 K limit was this page's own
conservative addition. And the model's sensitivity to it is measured and
small: swept from 216.65 K (the standard atmosphere's coldest, 11 to 20
km') to 320 K in steps of 10 K at Mach 1.8, 2.0 and 2.15, with the
Reynolds number held at 1.19e7, 1.6e7 and 2.0e7, the modelled total moves
from its value at the range's air, 293.95 K, by at most 0.13% (at Mach
2.15, Re 1.19e7 and 216.65 K; 0.12% with Re held at 1.6e7;
`tests/app/total-drag.test.ts`; 0.21% at Mach 3.0 when the class ran to
it). It moves monotonically, more at higher
Mach number and lower Reynolds number: at a given Reynolds number only
the friction terms read the temperature. Against the residuals, -7.7% to +4.5%, and the
tolerance, about -20% to +27%, that is small. The claim says so beside
the label (section 4). The Reynolds number remains the real constraint:
its limits are unchanged. In the standard atmosphere every altitude from
4,896 m below sea level to the top served, 51 km', lies inside these
temperatures.

**The BRL sub-class** (`brl934SubClass`, `BRL934_SUB_CLASS`; 0014
section 10.7 (q)), since 2026-10-22 the only cases labelled validated:
BRL Report 934's range A as it was run (0020), every bound the run's and
none wider. Disjoint from the class: its fin leading edges are sharp.

| Condition                | Inside                                                                                            | Why                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Shape                    | the class's, each dimension within 0.5%, except the fin leading edges                             | the Basic Finner as transcribed; the trailing edge constant across the span, 0.32 cal^2 as run          |
| Fin leading edges        | sharp (radius 0); any rounded edge, DREV's 0.004 cal included, is outside                         | 0014 section 10.6 item 3: sharp, from period drawings of the model                                      |
| Mach and Reynolds number | Mach 1.801 to 1.827 at 7.965e6 to 8.870e6 on length, or Mach 2.423 to 2.468 at 1.072e7 to 1.198e7 | the rounds' Mach numbers; the least and greatest Reynolds number over the run's corners, rounded inward |
| Between the windows      | outside: Mach 1.827 to 2.423 was not tested, and nothing is interpolated across it                | its rounds 3249, 3255 and 3256 were out by the admission rule                                           |
| Static temperature       | 288 to 298 K                                                                                      | the range's air as the run took it (0014 section 10.6 item 2)                                           |

The Reynolds ends are the run's, 7.9642e6 to 8.8708e6 and 1.07147e7 to
1.19832e7 (`docs/research/base-and-total/runs/brl934-range-a.json`),
rounded inward to four figures; 0020's three-figure 7.96e6 and 1.20e7 lie
0.05% and 0.14% beyond what was run. The windows are boxes: their
corners lie up to 1.4% and 1.8% beyond the Reynolds numbers the nearest
round reached, as the class's box has corners no shot flew. A sharp
Basic Finner outside the windows is an estimate whose reasons name both
the class's conditions and the sub-class's.

On the page's own path, with the run's nose (Taylor-Maccoll with the
fitted solver's allowance), the total at each of the seven rounds, its
model-form band and every component and input band equal the run's
recorded values exactly; with the page's solve of the cone they lie
within its band of them, under 8e-6 in C_D, below the fourth decimal
shown (as for the class, below). The page's Basic Finner typed to six
decimals moves them by 6e-9.

**Not part of the rule:** the inputs (transition, wall temperature,
roughness), which move no nominal value and are shown apart; and the
nose term, which inside the class is the page's solve of the cone. The gate
took the exact Taylor-Maccoll value with the fitted solver's allowance as
its band. On cones of 5 to 30 deg at Mach 1.3 to 3 every band of the solve
measured contains its error against Taylor-Maccoll (0006; measured on the
CPU, which the page's GPU solver matches within 8e-7 there), so the page's
nose term lies within its own band of the gate's, of order 1e-5 in C_D
(the 7e-5 allowance alone, on a nose term of 0.088 to 0.111, is 6e-6 to
8e-6), below the fourth decimal shown.

## 4. The labels

Since 2026-10-22 one set of cases is labelled validated, the BRL
sub-class (section 3; 0014 section 10.7 (q)); every other total is an
estimate, not validated. From 2026-10-21 to then every total was an
estimate: the Basic Finner's validated claim was suspended (0010 section
11.7), because the fins-on-base factor was corrected after the gate (0010
section 11), a change to a term the gate tested, inside the class as well
as above it (the body base by +0.0011, -0.0003 and -0.0004 in C_D at the
three shots inside it), and by 0008 section 6.1 a term changed after a
test is not validated by it. The registered test of the corrected factor,
BRL Report 934's range A, was then run once and passed (0020), but its
rounds overlap the class in nothing: inside the class's Mach range they
flew at Reynolds numbers of 7.96e6 to 8.87e6 on length, below its floor
of 1.19e7, and with sharp fin leading edges. So the class stays an
estimate, its reason revised, and the sub-class at the tested conditions
is validated. The display has the "ok" tone again for that claim only;
every other headline ends ": an estimate, not validated".

- **Inside the BRL sub-class** (`VALIDATED_CLAIM`): "Validated: this case
  lies inside the Basic Finner's narrow sub-class at the conditions of BRL
  Report 934's range A, where this model was tested once, against seven
  rounds in free flight, and passed (design records 0020 and 0014,
  section 10.7 (q)). Measured over modelled was +3.9% to +11.0%: the
  model reads low at every round (mean +7.3%), inside tolerances of about
  +-27%. That tolerance is wide, so the pass alone says little (design
  record 0008, section 6.3)." Beside it, two caveats: the models'
  diameter, the range's air and the fins' trailing-edge area at the test
  were assumed, not printed in the report (0014 section 10.6); and with
  DREV's rounded fin leading edge (0.004 cal) the residuals at Mach 2.42
  and 2.47 fall to -1.1% and -4.2%, a sensitivity, not a verdict. The
  headline ends ": validated, on one test (BRL Report 934's range A)". The
  full list, each round with its residual and tolerance and the other
  sensitivities, is in the page's details (section 2) and in 0020.
- **Inside the class** (`CLASS_CLAIM`): an estimate, not validated: the
  case lies inside the Basic Finner's class, whose total drag passed a
  hold-out test in free flight (DREV TM 9703), but that claim is
  suspended, since the fins-on-base factor was corrected after it; the
  corrected factor has since passed its registered test, BRL Report 934's
  range A, but at conditions outside this class, so that test does not
  validate it. Under "Not validated because:", the reason
  (`SUSPENDED_REASON`), which until 2026-10-22 ended "until the registered
  test of the corrected factor, BRL Report 934's range A, is run and
  passes" and now says that the test has been run and passed, at
  conditions outside the class (inside its Mach range at Reynolds numbers
  of 7.96e6 to 8.87e6, below its 1.19e7, with sharp fin leading edges, not
  its 0.004 cal), that nothing has tested the corrected factor inside the
  class, and that the test validates only the sub-class; then the gate's
  tolerance, as corrected ("The Basic Finner's test was wide: with the
  corrected fins-on-base factor its tolerance is -20.0% to -27.0% and
  +23.3% to +28.6% of the modelled total over the 11 shots (-24.0% to
  -24.6% and +23.3% to +23.5% at the three inside the class)."). Before
  the suspension the claim inside the class was "Validated on the Basic
  Finner: ...", with the residuals, the tolerance, the temperature
  sensitivity and, beside it, caveats on the tolerance's width, the
  fin-edge terms' share (24% to 25%) and the offset at Mach 2.97 (5.4% and
  7.6% below the model at the second run, 2.6% and 4.8% after the
  correction); it is kept here as history and shown nowhere.
- **Outside both** (`ESTIMATE_CLAIM`): "Estimate, not validated: this case
  lies outside the Basic Finner's class (whose validated claim is
  suspended; design record 0010, section 11.7) and outside its narrow
  validated sub-class at the conditions of BRL Report 934's range A
  (design record 0014, section 10.7 (q)). Each component is inside the
  domain of its own band, so the total is computed, but no total-drag
  measurement tests this configuration or condition, and the component
  bands are estimates here." With every condition of section 3's class
  the case fails, and, for a Basic Finner with sharp fin leading edges,
  every condition of the sub-class it fails too (`outsideReasons`), and
  the gate's tolerance. Above Mach 2.15 the reason is "Mach M is outside
  1.799 to 2.15 (above Mach 2.15 the gate tested a fins-on-base factor
  read from one of Love's estimates in TN 3819 fig. 35, not from its
  free-flight curve; the factor corrected since has no hold-out there)";
  above 2.56, also "the body base's fins-on-base factor is bounded, not
  measured, above Mach 2.56, where the free-flight curve of TN 3819 fig.
  35 ends" (0014 section 10.2: the claim names the bounded component).
- **Refused:** no number, every reason.
- **The components**, the nose as the page labels its solve, "solved on
  this page: the inviscid forebody pressure drag, bow shock fitted, finest
  of N grids (0006)", and the others as `src/total` labels them (0010
  sections 1 to 5): body friction "correlation: van
  Driest II, momentum integral, adiabatic wall (0007)"; fin friction and
  fin wave drag "estimated on the ARCAS increments (TN D-4014), tested only
  in the total"; the leading edges "an analogy, not a measurement", with
  "extrapolated in Reynolds number" below M 2.48 where no measurement
  covers the edge's Reynolds number, or "covered by RM A55H31's statement",
  and "tested only in the total";
  the body base "correlation: compiled base-pressure curve of TN 3819 fig.
  18 (Love) ... tested only in the total" and, for fins at the base, "an
  analogy, not a measurement: the fins-on-base factor measured on
  circular-arc fins (TN 3819 fig. 35), applied by analogy to these fins",
  or for fins a chord or more ahead "not validated with fins"; the fins'
  trailing-edge base "an analogy, not a measurement" in the base plane, or
  a correlation for free edges, both "tested only in the total". The input
  bands keep `src/total`'s labels. Since the round 5 audit the transition
  band carries the trailing edges' laminar base together with the fins'
  laminar friction, as states of the boundary layer (0010 section 10), and
  its label says when the trailing edges' laminar ratio is extrapolated or
  clamped at the vacuum bound.

## 5. The Basic Finner on the page

With the nose as the gate gave it (on the page it is the solve's, which
agrees within its band), the range's Reynolds number (6.62e6 times the
Mach number, the gated shots' mean, and 293.95 K, which the Basic Finner
button gives directly, section 9) and no inputs, the page shows, every
total an estimate, not validated: inside the class (to Mach 2.15) because
its claim is suspended (section 4), above it because it lies outside
(section 3):

| M    | C_D    | Model-form band  | As percentages   | Label                          |
| ---- | ------ | ---------------- | ---------------- | ------------------------------ |
| 1.8  | 0.6131 | 0.5294 to 0.7293 | -13.7% to +19.0% | estimate, claim suspended      |
| 2.0  | 0.5493 | 0.4808 to 0.6493 | -12.5% to +18.2% | estimate, claim suspended      |
| 2.15 | 0.5176 | 0.4512 to 0.6141 | -12.9% to +18.7% | estimate, claim suspended      |
| 2.3  | 0.4896 | 0.4260 to 0.5818 | -13.0% to +18.9% | estimate                       |
| 2.4  | 0.4725 | 0.4115 to 0.5612 | -12.9% to +18.8% | estimate                       |
| 2.5  | 0.4564 | 0.3996 to 0.5401 | -12.5% to +18.4% | estimate                       |
| 2.75 | 0.4203 | 0.3669 to 0.4987 | -12.7% to +18.7% | estimate, fins-on-base bounded |
| 2.9  | 0.4028 | 0.3521 to 0.4775 | -12.6% to +18.6% | estimate, fins-on-base bounded |
| 2.97 | 0.3951 | 0.3459 to 0.4678 | -12.5% to +18.4% | estimate, fins-on-base bounded |
| 3.0  | 0.3919 | 0.3434 to 0.4636 | -12.4% to +18.3% | estimate, fins-on-base bounded |

With the corrected fins-on-base factor (0010 section 11); before it the
same rows were 0.6121, 0.5501, 0.5188, 0.4768 at M 2.4, 0.4320, 0.4072
and 0.4040. The Basic Finner is served as an estimate, not validated,
with the corrected band, and never refused (asserted at M 1.8, 2.0 and
2.15 inside the class and 2.3, 2.5 and 2.9 above it, on the page and in
`src/total`).

At the 11 gated shots, with the gate's inputs (a laminar run to Re_T 5e5,
1.6e6 and 3e6; the wall to the air temperature), every value the page
shows, the total, each band, each component and each input band, equals
the gate's computation (`tests/validation/basic-finner.test.ts`) within
1e-12, and every label is the same. Every shot is an estimate, not
validated: the three at Mach 1.80 to 1.85, inside the class, with the
suspension as the reason; the eight at Mach 2.35 to 2.97 by their Mach
number (and the five above 2.56 by the bounded factor too). The five
shots at Mach 1.06 to 1.33 are refused, as in the gate.

## 6. Found in the libraries while integrating

- The fins-on-base factor (`src/base/fins-on-base.ts`) does not depend on
  the fins' size: fins of 0.1 cal span at the base take the same factor,
  band and body-base drag as fins of 1 cal. It refuses fin counts other
  than four and thicknesses outside 5% to 10%, not spans. A total with
  such fins is outside the class, so labelled an estimate, and the page
  says the factor does not depend on them; the factor's band carries
  nothing for it. Until 2026-10-21 it did not refuse planforms either:
  swept and tapered fins at the base took the factor of unswept fins,
  which an independent review found served where RM L52J21a measures a
  smaller one. It now refuses fins swept at either edge, and so any
  tapered planform, with its reason (`fin-sweep`; 0010 section 11.5,
  0014 section 10.7); the page shows it beside the fins' own refusals.
- The leading-edge and trailing-edge labels said "an analogy, not a
  measurement" but not "tested only in the total", which 0010 section 7
  asks of the base and fin terms; the page states it once for all of them
  (the breakdown note). Fixed with the round 5 audit: both labels now say
  it (`src/fins/rounded-leading-edge.ts`, `src/base/fin-trailing-edge.ts`).
- The rounded leading edge's regime was "measured" for any Reynolds number
  on its diameter from 1e5 up, though TN 2960 covers 1e5 to 1e6 (round 5's
  finding 11 too). Fixed: above Re_D 1e6 the edge is refused (0010
  section 5.2), so the page refuses the total there with that reason.

## 7. Tests

- `tests/app/total-drag.test.ts`: the class rule (the gated shots to Mach
  2.15 and the default inside, the eight above outside by their Mach
  number alone; each dimension inside at 0.4% and outside at 0.6% with
  one reason; other noses, counts, planforms, positions and sections; the
  Mach, Reynolds-number and temperature limits); what the tolerances allow;
  the box's corners; the temperature; the default as shown (section 5),
  and above Mach 2.15 an estimate, never refused, at M 2.3, 2.5 and 2.9
  on the page and in `src/total`; the notes (the bounded factor's above M
  2.56); the 11 shots against the gate and the published (corrected)
  table; the nose term and the states of the solve; estimates outside the
  class; refusals and the page's own input checks.
- `tests/app/total-drag-display.test.ts`: the fields as typed (the page's
  defaults inside the class, empty numbers refused, lists, one-sided
  roughness bands, each planform and section, which fields are asked, the
  Basic Finner button keeping the inputs); the nose solve's outcomes (a
  band, none, not converged, invalid, refused, stopped, a failed GPU, no
  WebGPU) and the key that ties a solve to its case; the display of each
  state (no number while waiting or refused; the gate's shot at Mach 1.85
  headed 0.5940, 0.5155 to 0.7048, -13.2% to +18.7%, corrected; every
  component's and input's label; inside the class an estimate, its claim
  suspended, with the reason; an estimate said in the headline and the
  claim, with its reasons, and no total shown as validated at Mach 1.8,
  2.0, 2.15, 2.3 or 2.9); the gate as published, corrected, with the
  second run beside it.
- `tests/app/brl934-sub-class.test.ts`: the BRL sub-class (0014 section
  10.7 (q)): its bounds held to the run's recorded output; inside at every
  corner of both windows and both ends of the air, outside just beyond
  each bound, in the gap and at the other window's Reynolds number; the
  shape within 0.5%, any rounded edge outside; disjoint from the class;
  validated inside, with the label's plain words; sharp against rounded
  at each round (rounded refused at Mach 1.801 to 1.803, an estimate at
  the other four); the class's values unchanged, an estimate, its reason
  revised; the page's total at each of the seven rounds equal to the
  run's, with every band, component and input; the published table; the
  display in the "ok" tone, the pending texts, and the details.
- `tests/app/band.test.ts`: intervals rounded outward, never inward.
- `tests/atmosphere/us-standard-1976.test.ts` and
  `tests/app/flight-condition.test.ts`: the standard atmosphere against
  its tables and the flight condition from altitude (section 9); in
  `tests/app/total-drag-display.test.ts`, the page's default (the Basic
  Finner's shape at sea level, inside the class to Mach 2.15), the
  condition and the values shown beside it, its refusals said once each,
  the change of unit, and the Basic Finner button giving the range's
  conditions directly; in `tests/app/total-drag.test.ts`, the sweep of the
  static temperature over the class (section 3) and where the standard
  atmosphere lies inside it.
- `tests/gpu/nose-drag-page.test.ts` (headless Chromium, run by
  `npm run test:gpu`): the page opens on the Basic Finner's shape at sea
  level, asked as altitude and diameter, with the Reynolds number and
  temperature shown, inside the class, with no number, and shows exactly
  the display's blocks for its fields; the altitude in
  feet, converted, out of range refused, and the Reynolds number directly;
  below Mach 1.8 it is refused with the reason; another nose is outside
  the class with the reason; swept fins are refused with every reason
  (the fins' edges and, the fins ending at the base, the body base); the
  Basic Finner button gives the range's conditions directly and restores
  the class; the layout of a total shows every block in order, the claim
  set apart, as an estimate with the suspension's reason and nothing in
  the "ok" style; and inside the class and above it (M 1.8, 2.0, 2.15,
  2.3, 2.5, 2.9) the Basic Finner is laid out as an estimate, not
  validated, never refused. The nose solve itself is not run there: on
  software WebGPU it takes far longer than a test can wait.

## 8. Open

- A day off the standard one (a temperature offset, humidity), and
  altitudes above 51 km: for now asked through the Reynolds number
  directly.
- The export of C_D against Mach number (0002), with the same labels.
- The registered test of the corrected factor, BRL Report 934's range A
  (Mach 1.5 to 2.47; 0014 section 10.5), which if it passes restores the
  Basic Finner's validated claim over what that range supports (section
  4); and a hold-out for any other class (0010 section 9).

## 9. The flight condition from altitude, Mach number and diameter

Most teams know their altitude, Mach number and diameter, not their
Reynolds number. The page asks those by default ("Given as: Altitude (m)
and diameter", or in feet) and shows, read-only beside them, the Reynolds
number on the overall length and the static temperature they imply; the
total takes them unrounded. "Reynolds number directly" remains the
alternative, with the two fields as before. A change of unit converts the
altitude typed. The page opens on the Basic Finner's shape, 30 mm across
(its model's caliber, `src/validation/basic-finner.ts`), at sea level:
Re = 1.40e7 at Mach 2 and 288.15 K.

**The atmosphere** (`src/atmosphere/us-standard-1976.ts`) is the U.S.
Standard Atmosphere, 1976 (NOAA, NASA and USAF, Washington, D.C., 1976;
NOAA-S/T 76-1562, NASA-TM-X-74335; read on the NTRS scan,
<https://ntrs.nasa.gov/citations/19770009539>), implemented from its
defining constants and equations, from 5 km below sea level (where its
tables begin) to 51 km' geopotential, 51.41 km geometric, the top of the
stratopause: the layers b = 0 to 4 of its Table 4 (p. 3), H_b = 0, 11,
20, 32 and 47 km' with L_M,b = -6.5, 0, +1.0, +2.8 and 0 K/km'. Pages are
the document's printed ones.

| Quantity              | Equation                                                               | Constants                                                       |
| --------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| Geopotential altitude | (18) and (19), p. 8: H = r0 Z / (r0 + Z)                               | r0 = 6356.766 km (p. 4)                                         |
| Temperature           | (23), p. 10: T_M = T_M,b + L_M,b (H - H_b); T = T_M below 80 km (p. 9) | T0 = 288.15 K (Table 2)                                         |
| Pressure              | (33a) for L_M,b not 0 and (33b) for 0, p. 12                           | P0 = 101325 N/m^2; g0' = 9.80665 m^2/(s^2 m') (Table 2, p. 3)   |
| Density               | (42), p. 15: rho = P M0 / (R* T_M)                                     | M0 = 28.9644 kg/kmol (p. 9); R* = 8.31432e3 N m/(kmol K) (p. 3) |
| Speed of sound        | (50), p. 18: C_s = (gamma R* T_M / M0)^(1/2)                           | gamma = 1.40 (Table 2, p. 4)                                    |
| Dynamic viscosity     | (51), p. 19: mu = beta T^(3/2) / (T + S), Sutherland's law             | beta = 1.458e-6 kg/(s m K^1/2), S = 110.4 K (p. 19)             |
| Kinematic viscosity   | (52), p. 19: eta = mu / rho                                            |                                                                 |

The base temperature and pressure of each layer are carried up from sea
level by (23) and (33), as the document does. Table 2 (p. 2) misprints
three of these constants: R* a factor 1e6 small, r0 a factor 1e3 large in
the km it states, and S as 110 K, which p. 4 repeats. The values used are
those of the text; for S, the 110.4 K that the text of eq. (51) gives as
"used for computation of the tables" (p. 19), which the tables confirm
(with 110 K they are missed). An errata sheet appended to the NTRS scan
(a reader's letter to the NASA STI desk, 2015) says the same of all
three.

**Tested against the document's own tables**
(`tests/atmosphere/us-standard-1976.test.ts`; the values typed from the
page images, each with its pages, in
`tests/atmosphere/us-standard-1976-tables.ts`): Table I (temperature,
pressure, density) and Table III (speed of sound, dynamic and kinematic
viscosity) at 17 geometric altitudes from -1 to 50 km (sea level, points
inside each layer, the rows next to each layer base, inside the
stratopause; pp. 53 to 65 and 101 to 113) and at 5 geopotential ones, the
layer bases 11, 20, 32 and 47 km' and the top, 51 km' (pp. 58 to 64 and
106 to 112): 132 values, each compared in units of its last printed
digit.

- The pressure column is printed truncated, not rounded: at all 22
  altitudes the computed pressure lies at or above the printed one, by 0
  to 0.96 of a unit (read as rounded, 6 of the 22 would miss by more than
  half a unit). The test holds each within [0, 1) of a unit.
- Every other value rounds to the printed one, within half a unit, except
  three of 110, which lie 0.51 to 0.52 of a unit away: the speed of sound
  at 5.5 km, the density at 46 km and the kinematic viscosity at 40 km.
  Of the 22 altitudes paired in the tables with their other altitude, two
  lie 0.52 m from the printed meter (46 km geometric is 45669.52 m',
  printed 45669; 51 km' is 51412.48 m, printed 51413). The five were read
  again on the scans: they are as printed. These excesses, 0.02 of a unit
  (about 1e-6 relative), point to small differences in the document's own
  computation, not resolved here; each is listed in the test.
- The largest relative differences from the printed values: temperature
  2.2e-6, pressure 6.9e-5 (the truncation), density 3.0e-5, speed of
  sound 1.6e-5, dynamic viscosity 2.4e-5, kinematic viscosity 3.6e-5.
- The tests fail with the gas constant's modern value, 8.314462618e3 (1e-5
  relative), with r0 = 6371 km, or with S = 110 K.

**The conversion** (`src/app/flight-condition.ts`): the altitude, in
meters or in feet (0.3048 m exactly, Table 1), is geometric, above mean
sea level. The speed is V = M C_s, the length L is the body's overall
length in calibers times the diameter, and Re_L = V L / eta. An altitude
outside the range served, or a diameter, Mach number or length that is not
a positive number, is refused with every reason, and the total with it;
each reason is said once. Tested in `tests/app/flight-condition.test.ts`:
at all 17 geometric altitudes the temperature, the speed and the Reynolds
number agree with the tables' own temperature, speed of sound and
kinematic viscosity within their printing (the Reynolds number within
6e-5).

**The class.** The class takes static temperatures of 216.65 to 320 K
(section 3, widened from 293 to 295 K when this section was added): in the
standard atmosphere, every altitude from 4,896 m below sea level to 51 km'.
Its Reynolds numbers, 1.19e7 to 2.0e7, are unchanged, and are what limits
a case asked by altitude. At sea level the Basic Finner's 30 mm body gives
6.99e6 per unit Mach number (5.6% above the range's 6.62e6, its air
warmer, 293.95 K): inside the class from Mach 1.799 to
2.15, the class's top (section 3); its Reynolds number would reach 2.0e7
at Mach 2.86 (at Mach 2.87, 2.01e7).
So the page opens labelled inside the class at Mach 2 (Re 1.40e7, 288.15
K). The Basic Finner button gives the range's conditions directly, as
before: it switches to "Reynolds number directly" with 6.62e6 times the
Mach number (to three figures) and 293.95 K, and sets the diameter to 30
mm. The gate's equality tests (section 5) build their forms directly and
are unchanged.
