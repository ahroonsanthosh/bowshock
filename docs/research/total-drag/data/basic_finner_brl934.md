# Basic Finner in free flight (BRL Free Flight Aerodynamics Range), M 0.98 to 2.47

Transcription for a second hold-out of the Basic Finner class (0010 section 9).
Everything below is copied from the report's text, tables or graphs, or
computed from them (script named). **No drag model was run on these data and
no model value was looked at;** the choices a run needs are listed in section
9, with the evidence that decides each without the drag.

## 1. Source

L. C. MacAllister, _The Aerodynamic Properties of a Simple Non Rolling Finned
Cone-Cylinder Configuration Between Mach Numbers 1.0 and 2.5_, BRL Report No.
934, Ballistic Research Laboratories, Aberdeen Proving Ground, May 1955. DTIC
AD068959 (distribution changed to unlimited, BRL letter of 22 Apr 1981, PDF p.
1). Copy opened: the Internet Archive mirror,
archive.org/download/DTIC_AD0068959/DTIC_AD0068959.pdf (47 PDF pages; DTIC
itself answers 403). It is ref. 3 of the Basic Finner report (DREV TM 9703),
which plots its CX0 against DREV's in fig. 17(a) and calls the agreement
"excellent" (TM 9703 p. 15); bowshock never digitised that figure, and no
bowshock band was set on BRL 934.

Page numbers: PDF page = report page + 2 (report p. 5 is PDF p. 7).

| Item | Where (PDF page) |
| --- | --- |
| Abstract | 5 |
| Symbols (d = model diameter, "caliber"; S = reference area) | 6 |
| Range, programme, configuration (text "TEST") | 8 to 9 |
| Launch, yaw inducers, aerodynamic data, drag, boundary layer | 9 to 11 |
| Shadowgraphs (figs. 7, 8: M 0.975 to 1.070, 1.10 to 2.51) | 22, 23 |
| Fig. 3, model with sabot, with a 3 in ruler | 18 |
| Graph I, drag coefficient vs Mach number | 24 |
| Graph II, yaw drag coefficient vs Mach number | 25 |
| Graph IV, yaw moment derivative (legend gives c.g. in calibres) | 27 |
| Appendix B, effects of slow roll and of trim | 38 |
| Table I, physical properties of the models | 39 |
| Table II, launching conditions | 40 |
| Table III, reduction values (CD per round) | 41 |

## 2. Geometry (text pp. 6 and 8 of the report; fig. 3)

- "The model configuration was ten-calibers long with a 10 deg semi-angle
  conical nose. The cruciform tail section was located at the base of the
  body and consisted of 8% thick wedge-airfoil sections with a one-caliber
  chord and an overall span of three calibers" (p. 6). The abstract (p. 3): "a
  ten-caliber long cone-cylinder body with four rectangular fins, of 8% thick
  wedge section, set in a cruciform configuration".
- So: 10 deg half-angle cone, cylinder to the base, L/d 10.0; four
  rectangular fins, chord 1 cal, exposed span 1 cal (3 cal tip to tip on a 1
  cal body), trailing edges at the base; single-wedge section, 0.08 cal thick
  at the trailing edge (8% of the 1 cal chord). Cone length (computed, not
  stated): 0.5 / tan(10 deg) = 2.836 cal.
- **Not stated:** the model diameter; the nose tip radius; the fin
  leading-edge radius; whether the trailing edge is 0.08 cal thick across the
  whole span (a single wedge of constant section) or tapers; the base shape
  (fig. 3 hides the base in the sabot); surface finish.
- Model diameter, evidence (no drag used): Graph IV's legend gives the c.g.
  groups as 5.03, 3.93, 3.90, 3.30 and 2.76 cal from the base, Table I as
  4.002, 3.112, 3.045, 2.592 and 2.252 in: the five ratios are 0.796, 0.792,
  0.781, 0.785 and 0.816 in per calibre (mean 0.794). Fig. 3's ruler (1 in =
  160 px at 300 dpi) and the body's width in the photograph (116 to 129 px at
  four stations, highlights on the metal make the edges uncertain,
  `scripts/brl934_f3_measure.py`) give 0.72 to 0.81 in, with an unknown
  perspective. Taken here as **0.78 to 0.82 in** (about 20 mm). NOL's
  Basic Finner tunnel models were 0.75, 1.0, 1.5 and 1.87 in (NAVORD 6652
  fig. 1; NAVORD 4516 para. 4, PDF p. 8): other models, not these.
- Fin cant: "a series of models was designed and produced to have as little
  net deflection of the fin surfaces as was practical" (p. 5); measured roll
  "small (1/2 deg per foot)" on the two rounds checked (App. B, p. 36).

## 3. Models, launch and range

- BRL Free Flight Aerodynamics Range: an enclosed gallery with 46 spark
  shadowgraph stations (two planes) and chronograph timing (p. 6). Free
  flight: no support, no sting.
- Launched from a smooth-bore gun with an "X" shape bore, sabot and
  obturating wafers (p. 6).
- Phase 1 (rounds 2588 to 2599): twelve models planned, three c.g. positions,
  basic Mach number 1.8; yaw induced by sabot throwers and a shear pin (p. 7;
  Table II "Shear Pin"). Ten rounds are in Table III.
- Phase 2 (rounds 3246 to 3264): eighteen models planned, two c.g.
  positions, M about 1 to 3 (p. 6), flown M 0.98 to 2.47; yaw induced by a 4
  in long, 0.5 in diameter Alnico V magnet in the model and a pulsed
  electromagnet (p. 8; Table II "Electro-Magnetic Yaw Inducer"). Rounds 3255,
  3259 and 3260: "Model Magnet demagnetized" (Table II), average yaw 0.
- Range air: not stated (no temperature, pressure or humidity in the
  report). Reynolds numbers are not given.

## 4. Quantity and accuracy

- CD, "the drag coefficient", per round, "given in Table III and in Graphs I
  and II as a function of Mach number and yaw" (p. 8). Coefficients are on
  "S - Reference Area" (symbols, p. 4); the body cross-section is the
  convention of this range and of Table III's other coefficients (the c.g.
  ratios above use the calibre). At zero yaw this is the total drag, base and
  fins included.
- Table III's CD is the round value **at the round's yaw**: Graph I plots
  "+ round value", "value corrected for yaw" and "corrected for yaw and full
  turbulent B.L." as separate symbols, and the mean squared yaw is printed
  beside CD (deg^2). The yaw drag coefficient is Graph II: "decreases from
  about 15.0 per radian squared to 8.9 from a Mach number of 1.4 to 2.4"
  (p. 8).
- **No probable error is printed for CD** (Table III prints percentage
  errors for CNa, CMa and the damping sums only). The report says only that
  free-flight range testing "has been one of the most accurate means of
  determining the total drag" (p. 5).
- Scatter, computed from Table III (`basic_finner_brl934_output.txt`, the
  yaw-corrected values): the eight phase-1 rounds at M 1.784 to 1.827 with
  mean squared yaw at most 5.6 deg^2 give CD0 0.6006 to 0.6565, mean 0.622,
  -3.4% to +5.6% about it; the two rounds at M 2.42 and 2.47 differ by 0.021
  (0.4698 and 0.4484, 4.6%) for a Mach step of 0.045.
- The report's faired curve "was drawn for" the full turbulent state (p. 9).
  Its phase-1 "consolidation" symbol (Graph I) reads CD 0.605 at M 1.806
  (section 7), below the mean of the phase-1 rounds' own yaw-corrected values
  (0.622); how it was formed is not stated. Per-round values are used here,
  not the curve.

## 5. Transition

The report observed the boundary layer on the shadowgraphs (p. 9; figs. 7 and
8): "Several models of the second group had stable laminar boundary layers
over the cone and part of the cylindrical body. Since the majority of the
models had turbulent layers over the whole body, the frictional drags of the
models with laminar layers were corrected to a full turbulent condition and
the curve drawn for this latter state." Which rounds is not tabulated; Graph
I's "corrected for yaw and full turbulent B.L." symbol (an open circle) marks
them. Single reading (section 7): at M 1.5 and above, **one such circle, at M
2.05, round 3249** (its yaw-corrected value about 0.518 and its circle about
0.549 on the graph: the report's turbulent correction is about +0.03 in CD).
Below M 1.5 circles stand near M 1.0 to 1.1, 1.26 and 1.39 to 1.40 (rounds not
identified here; outside the libraries' Mach range). Phase-1 rounds (all at M
1.73 to 1.83) carry no circle. No trips; transition was natural.

So the report's own observation is that the phase-1 rounds and the phase-2
rounds other than those marked were turbulent "over the whole body". That is
more than TM 9703 states for its shots, and it bears on the transition input
(section 9).

## 6. Data (Table III, with Tables I and II)

`basic_finner_brl934.csv`, all 27 rounds of Table III. In the libraries'
Mach range (M 1.5 to 2.47) there are 16 rounds:

| Round | M | dbar2 (deg^2) | CD (Table III) | CD0, yaw-corrected (computed) | c.g. (in from base) | Flags |
| --- | --- | --- | --- | --- | --- | --- |
| 3254 | 1.506 | 3.7 | 0.710 | 0.6936 | 2.592 | below fins-on-base range |
| 2593 | 1.733 | 53.4 | 0.873 | 0.671 | 3.999 | yaw > 5; below fins-on-base range |
| 2594 | 1.745 | 36.2 | 0.777 | 0.641 | 4.001 | yaw > 5; below fins-on-base range |
| 2595 | 1.784 | 0.6 | 0.624 | 0.6218 | 3.109 | below fins-on-base range |
| 2599 | 1.788 | 1.5 | 0.662 | 0.6565 | 2.250 | below fins-on-base range |
| 2598 | 1.798 | 5.6 | 0.621 | 0.6006 | 2.258 | yaw > 5; at the 1.80 row |
| 2591 | 1.801 | 0.2 | 0.604 | 0.6033 | 4.002 | |
| 2588 | 1.802 | 0.4 | 0.616 | 0.6145 | 3.112 | |
| 2590 | 1.803 | 0.1 | 0.644 | 0.6436 | 3.112 | |
| 2596 | 1.814 | 1.5 | 0.629 | 0.6236 | 2.252 | |
| 2589 | 1.827 | 0.7 | 0.614 | 0.6115 | 3.114 | |
| 3256 | 1.993 | 6.6 | 0.584 | 0.5624 | 2.588 | yaw > 5 |
| 3255 | 2.032 | not printed | 0.568 | (no yaw printed; Table II average yaw 0) | 2.588 | magnet demagnetized |
| 3249 | 2.050 | 5.0 | 0.526 | 0.5101 | 3.051 | laminar (Graph I circle) |
| 3263 | 2.423 | 2.9 | 0.478 | 0.4698 | 2.595 | faint print |
| 3264 | 2.468 | 0.2 | 0.449 | 0.4484 | 3.076 | Graph I symbol does not match (section 7) |

CD0 = CD - C_D'(M) dbar2, dbar2 in rad^2, C_D' from Graph II; both readings of
Graph II give the same CD0 within 1e-3 for every round
(`basic_finner_brl934_output.txt`, part 2). The correction is at most 0.0055
(0.9%) on the rounds with dbar2 at most 1.5 deg^2, 0.016 to 0.022 at 3.7 to 6.6
deg^2.

Nothing at M 2.5 to 3.0: the report stops at 2.47. **This set cannot test the
M 2.97 offset.**

## 7. Graphs I and II: digitising record

**Graph II** (yaw drag coefficient, PDF p. 25), read twice
(`basic_finner_brl934_graph2.csv`):

- Render: 400 dpi, rotated 90 deg clockwise (4011 x 3371 px). Calibration
  from the grid, with the scan's skew measured on the grid lines
  (`scripts/brl934_grid_skew.py`): heavy vertical lines every 0.05 M, 63.5 px
  apart, M 1.40 at x 1429.5 at y 1450, skew dx/dy -0.0243; zero line y = 2528
  + 0.031 (x - 700), 64.1 px per unit; checked on the axis labels within 2 to
  8 px.
- Reading 1: the curve centre by eye on 1:1 crops with a 25 px ruler, after
  removing thin grid lines (`scripts/brl934_degrid.py`,
  `scripts/brl934_ruler_crop.py`); 26 points, M 1.28 to 2.52.
- Reading 2: scripted, at each of the 25 heavy vertical lines, M 1.30 to
  2.50 (`scripts/brl934_graph2_second.py`).
- Agreement: within 0.20 per rad^2 everywhere (mean +0.015). Reading error
  +-0.05 to +-0.1 in C_D' (+-3 px), +-0.01 in M. On CD0 the difference
  between the readings is below 1e-3 for every round.
- Text against curve: the text's "about 15.0 ... to 8.9 from a Mach number
  of 1.4 to 2.4" lies 0.7 to 0.9 below the curve at M 1.40 (15.7 to 15.9) and
  0.4 below it at M 2.40 (9.3). Kept as found. Using the text's figures
  instead of the curve (linear between the two quoted points) changes CD0 by
  at most 0.0003 at dbar2 up to 1.5 deg^2, 0.0004 at 2.9 deg^2 and 0.0002 to
  0.0012 at 3.7 to 6.6 deg^2.

**Graph I** (drag coefficient, PDF p. 24), one reading, of the symbols only
(the per-round values are Table III's):

- Render: 400 dpi, rotated 90 deg clockwise. The scan is skewed: horizontal
  lines fall by 0.020 px per px, vertical lines lean by -0.0136 px per px
  (`scripts/brl934_grid_skew.py`). Calibration: M 1.0 at x 907 and M 2.6 at x
  2955 (the lines through the decimal points of the labels, at y about 2590),
  1280 px per unit M; CD = 0.3 + (2461.5 + 0.020 (x - 700) - y) / 2565. This
  y calibration places the "+" symbols of rounds 3256, 3255, 3263 and 3246 at
  0.583, 0.565, 0.476 and 0.787 against Table III's 0.584, 0.568, 0.478 and
  0.789, so the reading error is about +-0.003 in CD and +-0.01 in M (the
  graph is hand-plotted; the alternative convention, labels centred on the
  lines, would put every value 0.010 higher and fails these checks).
- Read: the phase-1 consolidation symbol at M 1.806, CD 0.605; round 3256 "+"
  0.583 and its yaw-corrected dot 0.560 (computed from Table III and Graph
  II: 0.5624); 3255 "+" 0.565; 3249's open circle ("corrected for yaw and
  full turbulent B.L.") 0.549 and a dot 0.518 (computed yaw-corrected value
  0.510); 3263 "+" about 0.476 with a dot on the faired curve.
- **Mismatch, round 3264:** the only symbol at M about 2.47 is a filled dot at
  CD about 0.473; Table III prints 0.449 (dbar2 0.2 deg^2, so its corrected
  value is 0.448). No symbol is plotted near 0.449. The faired curve passes
  0.458 there and 0.465 at M 2.42, between the two rounds' Table III values.
  TM 9703 fig. 17(a) (PDF p. 77, viewed, not digitised) plots a BRL 934
  point near 0.44 to 0.45 at M 2.47, so DREV used Table III's value. The table value is kept; the mismatch is flagged for the second
  reader and for the run (section 9).
- The faired curve itself was not digitised (it is the report's turbulent-
  corrected curve and is not used).

## 8. Fit to the libraries (refusal checks only; no drag computed)

`basic_finner_brl934_output.txt`, parts 3 and 4, checks each round against
the limits that depend only on Mach and Reynolds numbers:

- Compiled base curve, M 1.5 to 3.0: all 16 rounds in.
- **Fins-on-base factor, M 1.798 to 3.0** (TN 3819 fig. 35, `src/base/fins-on-base.ts`):
  refuses 3254 (M 1.506) and 2593, 2594, 2595, 2599 (M 1.733 to 1.788). **So
  the M 1.5 to 1.8 gap is not filled by these data as the libraries stand**:
  the factor is read from M 1.80 only, though round 3 of fig. 35's free-flight
  line reaches M 1.1. Extending the factor below 1.80 would be a library
  change made on fig. 35 and TN 2360 alone, before any run on this set.
- Fin trailing-edge base, M 1.5 to 3.2, unswept, turbulent, thin layer: c /
  [h Re_c^(1/5)] = 0.76 to 0.86 (limit 1.0); the laminar input's abscissa c /
  [h Re_c^(1/2)] = 0.0114 to 0.0153, inside TR 1109 fig. 29(b)'s read range
  (from 0.010): no flag.
- Fin leading edge: **if sharp, no term and no refusal.** If the DREV
  models' 0.004 cal radius is assumed, Re_D = 6.4e3 to 7.1e3 at M 1.80 to 1.83
  straddles the rounded-edge model's limit of 6.7e3 (RM A55H31) and the M
  1.8 rounds are refused at the low end of the Reynolds range; at M 1.99 to
  2.47 they are "extrapolated in Reynolds number" (Re_D 7.0e3 to 9.6e3, below
  TN 2960's 1e5 and below RM A55H31's M 2.48).
- Section: single wedge with a blunt trailing edge, t/c 0.08 (inside the
  fins-on-base factor's 0.05 to 0.10); fins of constant chord, unswept; four
  fins; cylindrical afterbody; sharp cone: all accepted.
- Reynolds number on length, estimated: 7.9e6 to 8.9e6 at M 1.80 to 1.83,
  8.8e6 to 9.9e6 at M 2.0, 1.07e7 to 1.20e7 at M 2.42 to 2.47. **Below the
  claim class of 0010 section 7 (1.2e7 to 2.0e7)**: these rounds test the
  model at about 0.7 times the DREV Reynolds numbers at the same Mach number.

With a sharp leading edge, the rounds the libraries would accept are the 11
at M 1.798 to 2.468 (2588, 2589, 2590, 2591, 2596, 2598, 3249, 3255, 3256,
3263, 3264). A gate under the DREV gate's yaw rule (mean squared yaw at most 5
deg^2), without the laminar round and with the yaw printed, keeps 7: five at
M 1.80 to 1.83 (2588, 2589, 2590, 2591, 2596) and two at M 2.42 to 2.47
(3263, 3264).

## 9. Decisions to register before a run (and the evidence that decides each, without the drag)

1. **Which rounds.** Proposed: M within the libraries' range; mean squared
   yaw at most 5 deg^2 (the DREV gate's rule) and printed; not marked laminar
   by the report. Evidence: Tables II and III, Graph I's symbols (sections 5
   and 7). Open: whether 3255 (yaw not printed, Table II average yaw 0,
   magnet demagnetized, so no induced yaw) is admitted; whether 2598 (5.6
   deg^2) and 3256 (6.6 deg^2) are admitted with the yaw correction; whether
   3264 is used while its graph symbol disagrees (a second reading of Graph I
   decides whether the mismatch is the graph's or the reader's; the table is
   the primary record).
2. **Zero-yaw value.** Table III's CD is at yaw; the report corrects with
   Graph II. Proposed: CD0 with Graph II's curve (both readings agree within
   1e-3 in CD0); the text's rounded C_D' as the alternative (changes CD0 by
   at most 0.0004 on the proposed rounds, 0.0012 on any round). Not the report's turbulent-
   corrected curve.
3. **Model diameter and range air** (Reynolds number only). Evidence:
   Graph IV's legend against Table I (0.781 to 0.816 in per calibre), fig. 3
   (0.72 to 0.81 in). Proposed: d 0.78 to 0.82 in, air 288 to 298 K at 1 atm,
   carried as an input range; it moves Re by about +-5%, which moves
   turbulent friction by about 1% (cf varies roughly as Re^-0.2) and nothing
   else unless the leading edge is rounded (item 5). A BRL range report giving the air conditions of rounds
   2588 to 3264 would replace the range.
4. **Transition.** The report observed fully turbulent layers on the
   majority, laminar runs over the cone and part of the cylinder on some
   phase-2 rounds, marked in Graph I. Proposed: nominal fully turbulent (the
   report's observation, not an assumption, for the admitted rounds), with
   0008's transition input band as for the DREV gate; round 3249 either
   excluded or run with a laminar run over the cone and part of the body as
   its own input (its extent is not stated). The fins: transition on the fins
   is not discussed; the fins' trailing-edge laminar input band applies as
   for DREV.
5. **Fin leading-edge radius.** Not stated by BRL 934. Choices: sharp (no
   term), or the DREV design's 0.004 cal (DREV TM 9703 p. 3, its own models).
   Evidence that could decide: a drawing of the Army-Navy Basic Finner of the
   BRL/NOL period (BuOrd Ballistic Technical Note 5, not reached; NAVORD 6652
   fig. 1 shows the NOL tunnel model without a radius; Kermeen's Caltech
   water-tunnel report, DTIC AD146516, fig. 1 (PDF p. 11), sketches the
   Basic Finner with a sharp wedge "0.080" thick at the base); the
   shadowgraphs of figs. 7 and 8 at higher resolution (a detached leading-edge
   wave would show a radius). The choice matters for refusals as well as
   drag: with 0.004 cal the M 1.8 rounds straddle the rounded-edge limit
   (section 8). Note that 8% wedges machined to a knife edge on a 20 mm model
   are plausible, a 0.004 cal radius there is 0.08 mm.
6. **Trailing-edge area.** "8% thick wedge" at the base; spanwise
   distribution not stated. DREV's 0.32 cal^2 was decided on DREV's mass
   properties for DREV's models. For BRL: Table I gives masses and both
   inertias per round, but the internal construction (magnets, ballast,
   materials) is not described, so the fins' share of the axial inertia
   cannot be separated as round 4 did for DREV. Proposed: constant thickness
   (0.32 cal^2) as the same design, with the 0.16 cal^2 taper as a stated
   alternative unless a drawing (BTN 5) settles it. The libraries represent
   constant thickness only (0010 section 5.1, "Area"); a taper would be
   refused, so that alternative can only be bounded by hand.
7. **Wall temperature.** As for DREV: gun-launched at range-air temperature,
   adiabatic nominal with the cold-wall input.
8. **Nose.** Sharp 10 deg cone (tip radius not stated; DREV's 0.004 cal
   meplat added 1e-4 in C_D there). The Taylor-Maccoll nose term needs no
   choice.
9. **Tolerance.** 0008 section 6.3's construction, with the shot spread
   taken per Mach cluster from these rounds (M 1.80 to 1.83: CD0 0.6033 to
   0.6436 on the five proposed rounds, -2.6% to +3.9% about their mean 0.619; M 2.42
   to 2.47: two rounds), and the diameter and air ranges of item 3 as input
   bands.
10. **Independence.** BRL 934 is the same configuration class as the DREV
    gate (a different range, model size, launch, yaw method and Reynolds
    number; reported in 1955). It took no part in any bowshock band. TM 9703 fig.
    17(a) shows it beside the DREV data; that figure was not digitised and no
    BRL value was compared with a model value in this work.

## 10. Second reading: what was done and what remains

- Done (same reader, fresh 250 dpi autocontrast renders, typed before the
  comparison, not blind): Tables I, II and III in full. Every value agrees
  with the first reading. Smudged digits: Table III M of 2588 (second
  decimal), Table I M of 2589 and 2590 (taken from the clear other table,
  which agrees with Table II's two-decimal M); Table I mass of 2599
  (254.65, not used); round 3263's row is faint in all three tables
  (2.423, 2.9, 0.478 read at 600 dpi). Table I's axial inertia of 3253
  (28.18 g in^2 against 19.8 to 20.4 for its 227 g family) is printed so.
- Done: Graph II twice (two methods, section 7).
- Remains for an independent reader: Table III's drag columns and Table II's
  yaw (the gate's inputs); Graph I's symbols, in particular which symbols
  mark laminar rounds and the round 3264 mismatch; the text quotations of
  sections 2, 4 and 5; the diameter evidence of section 2.

## 11. Fit to the claim envelope

Matches: free flight (no sting), the Basic Finner geometry (cone-cylinder,
L/d 10, four rectangular 1 x 1 cal fins at the base, 8% single wedge),
non-rolling, natural transition with the boundary-layer state observed, M 1.80
to 2.47 inside the libraries' range.

Does not match or does not test: nothing at M 2.5 to 3.0 (the M 2.97 offset is
untested); M 1.5 to 1.8 refused by the fins-on-base factor's range (one round
at 1.506 and four at 1.73 to 1.79 are there, two of them at high yaw);
Reynolds numbers about 0.7 times DREV's; diameter, air, leading-edge radius and
trailing-edge span distribution not stated; no CD uncertainty stated.
