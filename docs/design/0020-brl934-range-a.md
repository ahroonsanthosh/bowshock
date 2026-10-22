# 0020: BRL Report 934, range A: the run, once, as registered

- **Status:** Record of a held-back test, made once. Nothing here changes a
  method, a band, a label or a claim; the consequences 0014 section 10.3
  registers are the coordinator's and the owner's to apply.
- **Date:** 2026-10-22. Pre-run commit 1af3786 (the rounds, every input
  with its item of 0014 section 10.6, the harness, and 0014 section 10.7
  amendment (n)); run at that commit at 08:50 UTC.
- **Inputs:** [0014](0014-refusals.md) sections 10.1 (rules 3 to 5), 10.3,
  10.5, 10.6 and 10.7 (n); [0010](0010-base-drag-and-total.md) sections
  4.1, 6.2 and 10.3 (the tolerance), 11.7 (the route back);
  [0015](0015-fins-at-the-base.md) (W1); [0008](0008-total-drag.md)
  section 6; the transcription `docs/research/total-drag/data/basic_finner_brl934.md`
  and `.csv`, round 9 (`audit/round9/`), round 7 (`audit/round7/`).
- **Run and output:** `tests/validation/brl934-range-a.test.ts` (holds every
  value below), its machinery `src/validation/hold-out-run.ts` (validated on
  the DREV gate, `tests/validation/hold-out-run.test.ts`), the data
  `src/validation/brl934.ts` (held to both readings,
  `tests/validation/brl934-readings.test.ts`); the output as it came out,
  `docs/research/base-and-total/runs/brl934-range-a.out` and `.json`.

**Result in one line.** The present model (the present fins-on-base
factor, 0010 section 1.3) lies inside its tolerance at all seven rounds at
Mach 1.801 to 2.468, so by rule 4 of 0014 section 10.1 it passes:
residuals +3.9% to +11.0% (mean +7.3%), tolerances -24.8% to -27.1% and
+27.0% to +28.0%. The rebuilt factor (W1) is refused at all ten admitted
rounds, for the Basic Finner's wedges, whose faces diverge to the trailing
edge: it has no residual and does not pass.

## 1. What was run

As 0014 section 10.7 (n) fixes it, before the run:

- **Rounds** (10.6 item 5's rule, no drag value used). In: 3254 (M 1.506),
  2595 (1.784), 2599 (1.788), 2591 (1.801), 2588 (1.802), 2590 (1.803),
  2596 (1.814), 2589 (1.827), 3263 (2.423), 3264 (2.468). Out: 2593, 2594,
  2598, 3256 (mean squared yaw 53.4, 36.2, 5.6, 6.6 deg^2), 3255 (none
  printed), 3249 (marked laminar by both readings of Graph I).
- **The present model** at the seven rounds at M 1.798 and above (10.3):
  the library's total as served (`src/total/finned-body.ts`), its body base
  on the present factor at every one of them.
- **The rebuilt factor** at all ten: the same components, the body base's
  factor W1 (`src/base/fins-on-base-w1.ts`) asked directly. W2 serves the
  body base below Mach 1.5 only and served no admitted round.
- **Inputs** (10.6): diameter 0.78 to 0.82 in and air 288 to 298 K at 1
  atm, nominal at the midpoints, one input band over the four corners;
  sharp fin leading edges; trailing-edge area 0.32 cal^2; CD0 = C_D -
  C_D' dbar^2 with C_D' the mean of Graph II's two readings; fully
  turbulent nominal with 0008's transition input (Re_T 5e5, 1.6e6, 3e6, as
  states); adiabatic wall nominal with the wall at 293 K as an input; a
  sharp 10 deg cone (Taylor-Maccoll).
- **Tolerance** (rule 4; 0010 sections 4.1, 6.2, 10.3, as
  `basic-finner.test.ts` builds the DREV gate's): over the modelled total,
  the model-form band, the input bands (transition, wall, roughness at
  zero, diameter and air) and the round's Mach-cluster spread, taken over
  the rounds the model is run at (present: -2.6% to +3.9% at M 1.80 to
  1.83 over five rounds, -2.3% to +2.3% at 2.42 to 2.47 over two).

The run was made once. After it, its values were written into the test as
expectations, and the three test files were executed again to check that
the recording holds, with no change to any source file since 1af3786;
that check is not a second run and its output was not used.

## 2. The present model: pass

| Round | M     | CD0    | Modelled C_D (model-form band) | Residual | Tolerance (high end without the wall) | Verdict |
| ----- | ----- | ------ | ------------------------------ | -------- | ------------------------------------- | ------- |
| 2591  | 1.801 | 0.6033 | 0.5804 (0.4980 to 0.6974)      | +3.9%    | -27.1% to +27.0% (+24.3%)             | inside  |
| 2588  | 1.802 | 0.6145 | 0.5800 (0.4977 to 0.6968)      | +6.0%    | -27.1% to +27.0% (+24.3%)             | inside  |
| 2590  | 1.803 | 0.6436 | 0.5796 (0.4974 to 0.6963)      | +11.0%   | -27.1% to +27.0% (+24.2%)             | inside  |
| 2596  | 1.814 | 0.6236 | 0.5752 (0.4942 to 0.6907)      | +8.4%    | -27.0% to +27.0% (+24.2%)             | inside  |
| 2589  | 1.827 | 0.6115 | 0.5700 (0.4904 to 0.6840)      | +7.3%    | -26.8% to +27.0% (+24.1%)             | inside  |
| 3263  | 2.423 | 0.4698 | 0.4314 (0.3725 to 0.5188)      | +8.9%    | -24.9% to +27.9% (+22.8%)             | inside  |
| 3264  | 2.468 | 0.4484 | 0.4240 (0.3663 to 0.5097)      | +5.8%    | -24.8% to +28.0% (+22.8%)             | inside  |

**Verdict by rule 4: pass.** Every round lies inside its tolerance. The
residual is CD0 / modelled - 1; the smallest margin is 16.0 points on the
high side (2590, +11.0% against +27.0%) and 30.6 on the low side (3264).

The components (C_D on the body's cross-section) and input bands:

| Round | Nose   | Body friction | Fin friction | Fin wave drag | Body base | Fin trailing-edge base | Transition | Wall    | Diameter and air   |
| ----- | ------ | ------------- | ------------ | ------------- | --------- | ---------------------- | ---------- | ------- | ------------------ |
| 2591  | 0.1105 | 0.0854        | 0.0387       | 0.0204        | 0.2184    | 0.1070                 | -0.0588    | +0.0162 | -0.0010 to +0.0010 |
| 2588  | 0.1104 | 0.0854        | 0.0387       | 0.0204        | 0.2182    | 0.1069                 | -0.0587    | +0.0162 | -0.0010 to +0.0010 |
| 2590  | 0.1104 | 0.0853        | 0.0387       | 0.0204        | 0.2180    | 0.1068                 | -0.0587    | +0.0162 | -0.0010 to +0.0010 |
| 2596  | 0.1100 | 0.0851        | 0.0386       | 0.0202        | 0.2154    | 0.1058                 | -0.0581    | +0.0163 | -0.0010 to +0.0010 |
| 2589  | 0.1096 | 0.0847        | 0.0384       | 0.0200        | 0.2125    | 0.1047                 | -0.0575    | +0.0165 | -0.0010 to +0.0010 |
| 3263  | 0.0954 | 0.0717        | 0.0326       | 0.0145        | 0.1465    | 0.0708                 | -0.0379    | +0.0219 | -0.0009 to +0.0009 |
| 3264  | 0.0947 | 0.0708        | 0.0322       | 0.0142        | 0.1433    | 0.0688                 | -0.0368    | +0.0222 | -0.0008 to +0.0009 |

The transition input's high end is 0 at every round (no state lies above
the fully turbulent nominal), the wall input's low end 0. The body base is
labelled "an analogy, not a measurement: the fins-on-base factor measured
on circular-arc fins (TN 3819 fig. 35), applied by analogy to these fins"
at every round. Reynolds numbers on the 10 cal length: 8.35e6 to 8.47e6
(range 7.96e6 to 8.87e6) at M 1.80 to 1.83, 1.12e7 and 1.14e7 (1.07e7 to
1.20e7) at 2.42 to 2.47.

Per cluster: M 1.80 to 1.83, five rounds, mean residual +7.3%, +3.9% to
+11.0%, standard deviation 2.7%, the model changing by 1.8% across the
cluster; M 2.42 to 2.47, two rounds, mean +7.3%, +5.8% and +8.9%, sd 2.2%.
Over the seven, mean +7.3%.

## 3. The rebuilt factor: refused at every round

At all ten admitted rounds the body base is refused (`fin-trailing-edge`):
"faces that diverge to a blunt trailing edge (thickest at the edge, as the
Basic Finner's wedges) at the base: no band-setting source measures their
effect on the body base, and the ordering of 0015 section 4 does not reach
them". Every other component was computed; no total exists, so there is no
residual and no tolerance. This was known from the records before the run
(0015 sections 1, 4, 6 and 9; stated in 0014 section 10.7 (n)) and is what
the run gave.

The library's own routing, beside it: at the seven rounds at M 1.798 and
above it serves the present factor; at 3254 (M 1.506), 2595 (1.784) and
2599 (1.788) the present factor refuses (it is read from M 1.80) and the
rebuilt one refuses the wedges, so the library serves no total in range A
below M 1.798.

**Verdict by rule 4: no pass** (refused at every round, 3254, 2595, 2599,
2591, 2588, 2590, 2596, 2589, 3263, 3264).

## 4. Beside the verdict: the registered sensitivities and two readings

None of these is the verdict (0014 section 10.6). Residual and tolerance
for the present model:

| Round | The text's C_D'                | DREV's 0.004 cal edge                                   | Trailing-edge term halved      | Reading alternative                                    |
| ----- | ------------------------------ | ------------------------------------------------------- | ------------------------------ | ------------------------------------------------------ |
| 2591  | +3.9% (-27.1%, +27.1%), inside | refused: Re on the edge's diameter 6677, below 6700     | +14.5% (-26.9%, +27.3%) inside | seven-round spread: +3.9% (-28.0%, +28.2%), inside     |
| 2588  | +5.9% (-27.1%, +27.1%), inside | refused: 6681, below 6700                               | +16.7% (-26.9%, +27.3%) inside | seven-round spread: +6.0% (-28.0%, +28.2%), inside     |
| 2590  | +11.0% (-27.0%, +27.1%) inside | refused: 6684, below 6700                               | +22.3% (-26.9%, +27.3%) inside | seven-round spread: +11.0% (-27.9%, +28.2%), inside    |
| 2596  | +8.4% (-26.9%, +27.0%), inside | refused at the corner 0.78 in, 298 K (6417, below 6700) | +19.4% (-26.7%, +27.2%) inside | seven-round spread: +8.4% (-27.8%, +28.1%), inside     |
| 2589  | +7.3% (-26.8%, +27.0%), inside | refused at the corner 0.78 in, 298 K (6463, below 6700) | +18.1% (-26.6%, +27.2%) inside | seven-round spread: +7.3% (-27.7%, +28.1%), inside     |
| 3263  | +9.0% (-25.0%, +27.9%), inside | -1.1% (-23.3%, +26.0%), C_D 0.4752, inside              | +18.6% (-24.9%, +28.3%) inside |                                                        |
| 3264  | +5.8% (-24.9%, +28.0%), inside | -4.2% (-23.1%, +26.1%), C_D 0.4679, inside              | +15.1% (-24.8%, +28.4%) inside | 3263 out (spread zero): +5.8% (-22.5%, +25.7%), inside |

- **The text's C_D'** (the line through 15.0 at M 1.4 and 8.9 at 2.4)
  moves CD0 by at most 0.0004 and no residual by more than 0.1 point.
- **DREV's 0.004 cal edge** is refused at the five rounds at M 1.80 to
  1.83, where the edge's Reynolds number on its diameter lies below RM
  A55H31's 6.7e3 at the nominal or at a corner of the diameter and air
  ranges (0014 section 10.6 item 3 foresaw it: "the M 1.8 rounds straddle
  the rounded-edge limit"). Where served, at M 2.42 and 2.47, the edge adds
  about 0.044 in C_D and the residuals become -1.1% and -4.2%.
- **The trailing-edge term halved** (the tapered alternative, 0.16 cal^2,
  by hand) lowers the total by 8% to 9% and raises the residuals to +14.5%
  to +22.3%, every one still inside.
- **The reading alternatives** of 0014 section 10.7 (n), decided before the
  run: with 3263 out, 3264 stays inside a tolerance narrowed to -22.5% to
  +25.7%; with the present model's spread at M 1.78 to 1.83 taken over all
  seven admitted rounds there, every round stays inside. Neither changes
  the verdict.

## 5. What follows from 0014 section 10.3

- **The rebuilt factor (W1) did not pass its hold-out over range A.** It
  is refused at every round of the set, so range A gives it no residual.
  By 10.3 the rebuilt factor replaces the present one inside the Basic
  Finner's class only after it passes its own hold-out, BRL 934 first; it
  has not, and by rule 3 of 10.1 range A is not run again for the same
  cases. W1 stays "estimated on component data", served outside the class
  as 10.3's third bullet and amendment (i) have it, with no hold-out of
  its own (0015 section 9).
- **The present model did not fail: the Basic Finner's claim is not
  withdrawn.** 10.3's last bullet withdraws it if the present model fails
  at the rounds at Mach 1.798 to 2.47 by rule 4; it passes there at every
  round. Amendment (b) of 10.7 registered that "if it passes by rule 4 of
  10.1, the class is validated over what that range supports". What range
  A supports, stated for that decision and not taken here:
  - Mach numbers: rounds at M 1.801 to 1.827 and at 2.423 to 2.468 only.
    Inside the class's Mach range (1.799 to 2.15) that is M 1.80 to 1.83;
    nothing in range A tests M 1.83 to 2.42 (the rounds there, 3249, 3255
    and 3256, are out by the rule); M 2.42 to 2.47 lies above the class.
  - Conditions: as 10.6 item 6 registers, the test is the claim's
    configuration at BRL's conditions, outside the class as the page
    decides it: Reynolds numbers on length of 0.80e7 to 0.89e7 at M 1.80 to
    1.83 and 1.07e7 to 1.20e7 at 2.42 to 2.47, below the class's floor of
    1.19e7 (the top of the M 2.47 range reaches it), and sharp leading
    edges, where the class has DREV's 0.004 cal radius, so no leading-edge
    term was in the model tested.
  - The restoration of any validated label is a recorded decision, the
    owner's and the coordinator's; this record changes no claim, label or
    page text, and the README is untouched. That decision is now made
    (2026-10-22, 0014 section 10.7 (q)): since range A overlaps the class
    in nothing, the class stays "an estimate, not validated", its reason
    revised to say that this test was run and passed at conditions
    outside it, and a narrow sub-class is validated at exactly the tested
    conditions: the Basic Finner with sharp fin leading edges, at Mach
    1.801 to 1.827 with Reynolds number 7.965e6 to 8.870e6 on length or
    Mach 2.423 to 2.468 with 1.072e7 to 1.198e7 (the run's ranges in the
    json, rounded inward; section 2's 7.96e6 and 1.20e7 are rounded
    outward), nothing between, at 288 to 298 K. The page's total at the
    seven rounds equals the run's (`tests/app/brl934-sub-class.test.ts`).

## 6. Findings stated beside the verdict

- **Every residual is positive** (+3.9% to +11.0%, mean +7.3%, the same in
  both clusters): the model lies below the measured CD0 at every round.
  It is inside the model-form band alone at every round (-13.6% to -14.2%,
  +20.0% to +20.3%), before the input bands and the spread are added. On
  the DREV gate, the corrected run's residuals at M 1.80 to 1.85 had a mean
  of -2.4% and at 2.35 to 2.41 of +1.5% (0010 section 11.6), with DREV's
  0.004 cal edge in the model. Here the edges are sharp by 10.6 item 3, and
  where DREV's edge could be served (M 2.42 and 2.47) the residuals fall to
  -1.1% and -4.2%. That is a sensitivity, not a verdict, and nothing was
  changed for it (0008 section 6.1).
- **The tolerance is wide**, about +-25% to +-28%, as on DREV; 0008 section
  6.3 warns that a pass at such a width says little by itself, and the
  residuals are the finding. Within each cluster the residuals spread as
  CD0 does (2590's CD0, 0.6436, is the cluster's highest), the model moving
  by under 2%.
- **Range A below M 1.798 has no served total.** 3254, 2595 and 2599 are
  refused by both factors (section 3), so the library's claim gap at Mach
  1.5 to 1.8 noted in the transcription's section 8 remains.

## 7. Ambiguities in the registration, and how they were decided

Each was decided before the run, in 0014 section 10.7 (n), and is repeated
here so that the record stands alone.

- **"Neither reading marks laminar" against "3249 out if both mark it".**
  On the readings as recorded only 3249 is marked, by both, so the two
  wordings admit the same rounds.
- **Round 3263.** Round 7's blind call of its lower symbol was an open
  circle at low confidence ("could be a dot"); that reader's third look,
  made after the pairing, found a dot and is recorded as replacing the call
  for any use, and the first reading calls it a dot. 3263 was admitted on
  the readings as recorded; because the blind call was not a dot, 3264's
  verdict with 3263 out is reported beside (section 4). The text does not
  say which is more conservative: admitting 3263 adds a case that must
  pass but widens 3264's spread; both outcomes are inside.
- **The present model's cluster spread.** "The spread per Mach cluster
  from the admitted rounds" could include 2595 and 2599, admitted for W1
  but below the present model's Mach range. The narrower spread, over the
  five rounds the present model is run at, was taken (it is the
  transcription's section 9 item 9, which 10.6 item 5 adopts); the
  seven-round spread is reported beside (section 4).
- **The nominal of the diameter and air ranges.** 10.6 names ranges, not
  nominals: the midpoints were taken, the input band covering both ends of
  both. The air range is item 2's 288 to 298 K, not the transcription
  script's 288.15 to 298.15 K.
- **Which reading of Graph II.** Not stated: the mean of the two was
  taken; each alone moves no admitted round's CD0 by 1e-4.
- **The text's C_D' beyond M 2.4.** The text quotes 1.4 to 2.4; the line
  was continued to 2.423 and 2.468, as the transcription's section 7
  computes it.
- **The halved trailing-edge term.** "The trailing-edge term halved" was
  read as the term's nominal, band ends, laminar change in every
  transition state and corner values, each times 0.5.
- **The rebuilt factor's refusal.** The run asks the rebuilt factor
  directly at every round, whatever the library's routing; its refusal
  there is the library's own message, the run's result, and no attempt was
  made to serve the wedges otherwise.
