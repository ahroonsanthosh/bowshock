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
  elsewhere.
- **Date:** 2026-10-20; the gate's tolerances and the edge labels updated
  the same day for the round 5 audit (0010 section 10)
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

| Input               | Choices                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Body                | the nose solve's: nose shape and length, the cylinder behind it to the flat base; the overall length is shown                                                       |
| Fins                | count; planform rectangular, trapezoidal (leading- and trailing-edge sweep) or clipped delta (taper ratio), `src/fins/planform.ts`; root chord; span from the body  |
| Section             | single wedge to a blunt trailing edge (its thickness), double wedge (thickness, ridge) or hexagonal (thickness, bevels), `src/fins/section.ts`; leading-edge radius |
| Position            | distance of the root trailing edge ahead of the base                                                                                                                |
| Flight condition    | the solve's Mach number; the free-stream Reynolds number on the overall length (per calibre, that over the length); the static temperature                          |
| Inputs (bands only) | transition Reynolds numbers (none: fully turbulent); a wall temperature (none: adiabatic); a roughness band in C_D with its source (none: smooth)                   |

`src/fins` has no circular-arc section, so the fins-on-base factor is
always carried by analogy (`sectionFamily: 'other'`, 0010 section 1.3). No
standard atmosphere is offered: none exists in the repository with a cited
source and a test against its tables, so the Reynolds number is asked
directly.

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

| Condition                 | Inside                                | Why                                                                                                 |
| ------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Nose                      | a cone, 2.836 cal long, within 0.5%   | the 20 deg cone, 0.5 / tan(10 deg); fig. 2's printed 2.84 lies 0.15% from it                        |
| Overall length            | 10.0 cal, within 0.5%                 | L/d 10                                                                                              |
| Fins                      | four                                  | 0010 section 7                                                                                      |
| Planform                  | rectangular: unswept, constant chord  | sweeps zero, or a taper ratio of 1                                                                  |
| Root chord, span          | 1.0 cal each, within 0.5%             |                                                                                                     |
| Position                  | trailing edges at the base, exactly   | fins clear of the base may not be claimed                                                           |
| Section                   | single wedge to a blunt trailing edge | other sections may not be claimed                                                                   |
| Trailing-edge thickness   | 0.08 cal, within 0.5%                 |                                                                                                     |
| Leading-edge radius       | 0.004 cal, within 0.5%                | sharp-edged fins may not be claimed                                                                 |
| Mach number               | 1.799 to 3.0                          | 0010's 1.8 to 3.0, its low end at the lowest gated shot                                             |
| Reynolds number on length | 1.19e7 to 2.0e7                       | 0010's 1.2e7 to 2.0e7, its low end at the lowest gated shot                                         |
| Static temperature        | 293 to 295 K                          | the range's air: Table V's speed of sound, 343.4 to 344.0 m/s, is 293.4 to 294.5 K; rounded outward |

**The tolerance on dimensions, 0.5%,** is there for typing (2.84 for
2.836), not for other rockets. What it lets through is measured: at Mach
1.8, 2.4 and 3.0, each dimension moved to its tolerance moves the modelled
total by under 0.2% (at most: the cone's length 0.19%, the span 0.17%, the
trailing-edge thickness 0.12%, the overall length 0.09%, the leading-edge
radius 0.06%, the chord 0.01%, the temperature at 293 or 295 K under
0.005%), all of them together at most 0.7% (the sum), against residuals
that spread with standard deviations of 1.6% to 6.3% within a cluster
(`tests/validation/basic-finner.test.ts`) and a tolerance of about -20% to
+27%. Discrete features are exact: a cone, four fins, no sweep, the
trailing edges at the base, a single wedge.

**The Mach number and Reynolds number** are 0010 section 7's ranges,
widened only to take in the gated shots themselves (M 1.799, Re 1.19e7).
The box has corners no shot flew: the shots lie along Re = 6.6e6 M on
length (one range, one air; 6.53e6 to 6.72e6 per unit Mach number). At
Mach 1.8 and Re 2.0e7 the model lies 1.6% below its value on that line,
at Mach 3.0 and Re 1.19e7 2.1% above it. The box is kept as 0010 states the
class, and the corners are recorded here. Between M 2.97 and 3.0 no shot
was flown, and there the fins-on-base factor rests on readings
extrapolated past the drawn line (a note on the page).

**The static temperature** is not in 0010's statement of the class; the
gate ran at the range's air, and this rule keeps to it. The restriction is
conservative, not needed by the model: from 216.65 to 320 K the modelled
total moves by under 0.2% at Mach 1.8 and 3.0.

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
  independent audit, section 10)." The tolerance is 0010's as re-derived
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
Mach number, the gated shots' mean) and no inputs, the page shows, labelled
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
- `tests/gpu/nose-drag-page.test.ts` (headless Chromium, run by
  `npm run test:gpu`): the page opens on the Basic Finner inside the class
  with no number, and shows exactly the display's blocks for its fields;
  below Mach 1.8 it is refused with the reason; another nose is outside
  the class with the reason; swept fins are refused with both reasons; the
  Basic Finner button restores the class; and the layout of a total shows
  every block in order, the claim set apart. The nose solve itself is not
  run there: on software WebGPU it takes far longer than a test can wait.

## 8. Open

- A standard atmosphere, with its source cited and a test against its
  tables, so that altitude and speed can be asked instead of the Reynolds
  number.
- The export of C_D against Mach number (0002), with the same labels.
- A second hold-out for the Basic Finner's class, and any other class
  (0010 section 9).
