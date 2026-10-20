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
  widened to 216.65 to 320 K (sections 9 and 3)
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
(section 6); and its flags from `src/base` (one reading of TN 3819 fig. 35
above M 2.85 up to 2.97, an extrapolated row above M 2.97, the M 1.80 row
taken just below it). Every total also carries the band's caveat (the
linear sum is a minimum, not a coverage interval, 0008 section 6.3), the
breakdown as 0010 section 7 allows it, and what `src/total` does not
represent.

A table of the gate's 11 shots is on the page, as printed in 0010 section
4.2 (`PUBLISHED_GATE`), and held to the library: each shot's modelled C_D,
its band, its residual and its tolerance, recomputed through the page's
code, round to the printed values.

## 3. The class rule

0010 section 7 opens one claim class, the Basic Finner's. The page decides
in code whether a case lies in it (`basicFinnerClass`): the Basic Finner as
transcribed (`src/validation/basic-finner.ts`), at the conditions the gate
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
| Mach number               | 1.799 to 3.0                          | 0010's 1.8 to 3.0, its low end at the lowest gated shot                                                            |
| Reynolds number on length | 1.19e7 to 2.0e7                       | 0010's 1.2e7 to 2.0e7, its low end at the lowest gated shot                                                        |
| Static temperature        | 216.65 to 320 K                       | the shots flew at the range's air, about 294 K; across this span the modelled total moves by at most 0.21% (below) |

**The tolerance on dimensions, 0.5%,** is there for typing (2.84 for
2.836), not for other rockets. What it lets through is measured: at Mach
1.8, 2.4 and 3.0, each dimension moved to its tolerance moves the modelled
total by under 0.2% (at most: the cone's length 0.19%, the span 0.17%, the
trailing-edge thickness 0.12%, the overall length 0.09%, the leading-edge
radius 0.06%, the chord 0.01%), all of them together at most 0.7% (the
sum), against residuals
that spread with standard deviations of 1.6% to 6.3% within a cluster
(`tests/validation/basic-finner.test.ts`) and a tolerance of about -20% to
+27%. Discrete features are exact: a cone, four fins, no sweep, the
trailing edges at the base, a single wedge.

**The page's own Basic Finner** is the exact body
(`basicFinnerBody` in `src/validation/basic-finner.ts`, which the live
flow page solves too): the page opens on, and the Basic Finner button
fills, a cone 2.835641 cal long on a 7.164359 cal cylinder. These were
2.836 and 7.164 until the interface's review (0012) found that the
rounding moved the solved wave drag by 2e-4 at Mach 2 (on the grid 20
cells across), three times the band's allowance of 7e-5; the class rule
and the gate's comparisons, which take the exact body, are unchanged.

**The Mach number and Reynolds number** are 0010 section 7's ranges,
widened only to take in the gated shots themselves (M 1.799, Re 1.19e7).
The box has corners no shot flew: the shots lie along Re = 6.6e6 M on
length (one range, one air; 6.53e6 to 6.72e6 per unit Mach number). At
Mach 1.8 and Re 2.0e7 the model lies 1.6% below its value on that line,
at Mach 3.0 and Re 1.19e7 2.1% above it. The box is kept as 0010 states the
class, and the corners are recorded here. Between M 2.97 and 3.0 no shot
was flown, and there the fins-on-base factor rests on readings
extrapolated past the drawn line (a note on the page).

**The static temperature** runs from 216.65 to 320 K. The gate's shots
flew in the range's air, about 294 K (Table V's speed of sound, 343.4 to
344.0 m/s, is 293.4 to 294.5 K), and this rule first kept to it, 293 to
295 K. It was widened on 2026-10-20, when the flight condition came to be
asked as an altitude (section 9), for three reasons. 0010 section 7's
claim names the Mach number, the geometry and the Reynolds number, not
the static temperature; the 293 to 295 K limit was this page's own
conservative addition. And the model's sensitivity to it is measured and
small: swept from 216.65 K (the standard atmosphere's coldest, 11 to 20
km') to 320 K in steps of 10 K at Mach 1.8, 2.4 and 3.0, with the
Reynolds number held at 1.19e7, 1.6e7 and 2.0e7, the modelled total moves
from its value at the range's air, 293.95 K, by at most 0.21% (at Mach
3.0, Re 1.19e7 and 216.65 K; 0.19% with Re held at 1.6e7;
`tests/app/total-drag.test.ts`). It moves monotonically, more at higher
Mach number and lower Reynolds number: at a given Reynolds number only
the friction terms read the temperature. Against the residuals, -7.7% to +4.5%, and the
tolerance, about -20% to +27%, that is small. The claim says so beside
the label (section 4). The Reynolds number remains the real constraint:
its limits are unchanged. In the standard atmosphere every altitude from
4,896 m below sea level to the top served, 51 km', lies inside these
temperatures.

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

- **Inside the class:** "Validated on the Basic Finner: this configuration
  and condition lie inside the one class whose total drag has passed a
  hold-out test, the Basic Finner in free flight (DREV TM 9703: 11 shots at
  Mach 1.80 to 2.97, Reynolds numbers 1.19e7 to 1.98e7 on length; design
  record 0010, section 4.2). Measured over modelled, the 11 residuals were
  -7.7% to +4.5% (mean -1.9%), inside a tolerance of -19.5% to -26.2% and
  +23.1% to +27.4% of the modelled total (as re-derived after an
  independent audit, section 10). The shots flew in the range's air,
  about 294 K; across static temperatures of 216.65 to 320 K the modelled
  total moves from its value there by at most 0.21% (design record 0011,
  section 3)." The tolerance is 0010's as re-derived
  after the round 5 audit, which changed the band arithmetic after the
  hold-out was used (the second run's high end was +26.5% to +31.4%; the
  residuals did not change); the published gate table on the page carries
  the re-derived tolerances. Beside it, always: that the
  tolerance is wide and a pass at that width says little by itself, the
  residuals being the finding; that the two fin-edge terms, both analogies,
  carry 24% to 25% of the Basic Finner's total and the body base carries
  the fins-on-base factor, an analogy from circular-arc fins; and the
  offset at Mach 2.97 (both shots 5.4% and 7.6% below the model, mean
  -6.5%, beyond that cluster's spread of +-1.2%, not corrected). From Mach
  2.86, nearer the two M 2.97 shots than the M 2.66 to 2.75 cluster (the
  midpoint of 2.749 and 2.969 is 2.859), the offset is highlighted and the
  page says the case lies nearest those shots.
- **Outside it:** "Estimate, not validated: this case lies outside the one
  class whose total drag has passed a hold-out test (the Basic Finner).
  Each component is inside the domain of its own band, so the total is
  computed, but no total-drag measurement tests this configuration or
  condition, and the component bands are estimates here." With every
  condition of section 3 the case fails, and the gate's tolerance.
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
button gives directly, section 9) and no inputs, the page shows, labelled
validated on the Basic Finner:

| M    | C_D    | Model-form band  | As percentages   |
| ---- | ------ | ---------------- | ---------------- |
| 1.8  | 0.6121 | 0.5309 to 0.7259 | -13.3% to +18.6% |
| 2.0  | 0.5501 | 0.4823 to 0.6493 | -12.4% to +18.1% |
| 2.4  | 0.4768 | 0.4193 to 0.5615 | -12.1% to +17.8% |
| 2.75 | 0.4320 | 0.3797 to 0.5083 | -12.1% to +17.7% |
| 2.97 | 0.4072 | 0.3579 to 0.4786 | -12.1% to +17.6% |
| 3.0  | 0.4040 | 0.3554 to 0.4746 | -12.1% to +17.5% |

At the 11 gated shots, with the gate's inputs (a laminar run to Re_T 5e5,
1.6e6 and 3e6; the wall to the air temperature), every value the page
shows, the total, each band, each component and each input band, equals
the gate's computation (`tests/validation/basic-finner.test.ts`) within
1e-12, every label is the same, and every shot is labelled validated. The
five shots at Mach 1.06 to 1.33 are refused, as in the gate.

## 6. Found in the libraries while integrating

- The fins-on-base factor (`src/base/fins-on-base.ts`) does not depend on
  the fins' size: fins of 0.1 cal span at the base take the same factor,
  band and body-base drag as fins of 1 cal. It refuses fin counts other
  than four and thicknesses outside 5% to 10%, not planforms or spans. A
  total with such fins is outside the class, so labelled an estimate, and
  the page says the factor does not depend on them; the factor's band
  carries nothing for it.
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

- `tests/app/total-drag.test.ts`: the class rule (the gated shots and the
  default inside; each dimension inside at 0.4% and outside at 0.6% with
  one reason; other noses, counts, planforms, positions and sections; the
  Mach, Reynolds-number and temperature limits); what the tolerances allow;
  the box's corners; the temperature; the default as shown (section 5); the
  notes; the 11 shots against the gate and the published table; the nose
  term and the states of the solve; estimates outside the class; refusals
  and the page's own input checks.
- `tests/app/total-drag-display.test.ts`: the fields as typed (the page's
  defaults inside the class, empty numbers refused, lists, one-sided
  roughness bands, each planform and section, which fields are asked, the
  Basic Finner button keeping the inputs); the nose solve's outcomes (a
  band, none, not converged, invalid, refused, stopped, a failed GPU, no
  WebGPU) and the key that ties a solve to its case; the display of each
  state (no number while waiting or refused; the gate's shot at Mach 2.97
  headed 0.4071, 0.3579 to 0.4786, -12.1% to +17.6%; every component's and
  input's label; the offset set apart near Mach 3 and not at 2.4; an
  estimate said in the headline and the claim, with its reasons); the gate
  as published.
- `tests/app/band.test.ts`: intervals rounded outward, never inward.
- `tests/atmosphere/us-standard-1976.test.ts` and
  `tests/app/flight-condition.test.ts`: the standard atmosphere against
  its tables and the flight condition from altitude (section 9); in
  `tests/app/total-drag-display.test.ts`, the page's default (the Basic
  Finner's shape at sea level, inside the class to Mach 2.86), the
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
  the class with the reason; swept fins are refused with both reasons; the
  Basic Finner button gives the range's conditions directly and restores
  the class; and the layout of a total shows every block in order, the
  claim set apart. The nose solve itself is not run there: on software
  WebGPU it takes far longer than a test can wait.

## 8. Open

- A day off the standard one (a temperature offset, humidity), and
  altitudes above 51 km: for now asked through the Reynolds number
  directly.
- The export of C_D against Mach number (0002), with the same labels.
- A second hold-out for the Basic Finner's class, and any other class
  (0010 section 9).

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
2.86, where its Reynolds number reaches 2.0e7 (at Mach 2.87, 2.01e7).
So the page opens labelled inside the class at Mach 2 (Re 1.40e7, 288.15
K). The Basic Finner button gives the range's conditions directly, as
before: it switches to "Reynolds number directly" with 6.62e6 times the
Mach number (to three figures) and 293.95 K, and sets the diameter to 30
mm. The gate's equality tests (section 5) build their forms directly and
are unchanged.
