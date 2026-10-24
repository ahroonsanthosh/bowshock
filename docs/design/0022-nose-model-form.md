# 0022: The nose's model error, against measured pressures

- **Status:** revision 5 (2026-10-24, before any row below Mach 1 is
  evaluated): the absolute measure below Mach 1 and the u_num term,
  section 8 item 10, under 0014 10.7 (y). Before that: adopted with Route 1, revision 3 (the coordinator, after an
  independent review of revision 1, df6e284, and a re-check of revision
  2, 37d154f; the owner chose Route 1). Registered as 0014 10.7 (w).
  Revision 4 (2026-10-24, before any reading, on the independent review
  of the script at 3e26e9a): u_meas acts over the area from the first
  orifice to the shoulder (4.3 item 5), not the orifices' span only.
  Design and registration only: no code, and no value of any source was
  read or computed for this record beyond the published figures it
  quotes.
- **Date:** 2026-10-24.
- **Concerns:** the nose wave drag's band (0005, 0006), its place in the
  total (0008 section 6.3, 0011 section 1), the labels (0014 section
  10.2, README "What works today"), and the registration (0014 section
  10.7).
- **Why now:** the advisor's report of 2026-10-22, section 6 item 4, and
  the handoff's queue (section 8, item 10). The nose's band is labelled
  "verified" and is of order 1e-4 of the value, while the inviscid
  model differs from measured nose pressures by 8 to 9% on one tangent
  ogive and by 3% the other way on another, "not explained", and no
  allowance for that enters the total. A hostile expert will put those two
  facts side by side.

## 1. Summary

The nose's band is the numerical error of the inviscid solve: the grids'
estimate plus a floor of 7e-5 of the value (0006). It is measured, and it
is small. It says nothing about how far the inviscid model itself is from
a real nose: no boundary layer, a perfect gas, an exactly sharp tip, the
geometry as drawn. The only comparisons with measurements on record are
two integrations of wind-tunnel pressures at Mach 1.98, made once by an
audit agent on 2026-10-17, with no recorded method, and since quoted in
the README, `docs/validation/sources.md`, the handoff and the advisor's
report.

This record proposes:

- **(a) The accuracy-first route.** Name the measured nose-pressure sets
  the records list (section 4.1) in a dated 0014 10.7 entry before any of
  them is read for this purpose (draft (w), section 7); read each twice,
  the second blind; form from them, per nose family and Mach number, an
  allowance "inviscid model against measured pressures" by a rule fixed
  here (section 4.3); carry it in the nose's band and so in the total's,
  linearly, as a separate named line; and leave every nose outside the
  measured cover labelled "numerical error only" (section 4.5).
- **(b) The interim label, now.** Until (a) is done, the nose's band on
  the page and in the README says what it is: "numerical error of the
  inviscid solve; the model's own error is not in this band", with a link
  to the comparison (section 6; a separate commit on this branch).

The honest size of what (a) will produce should be said before anyone
reads a value: the measured pressures carry a stated uncertainty of
+-0.004 to +-0.005 in Cp, which is 5 to 13% of these noses' drag
(`docs/validation/sources.md`). An allowance formed from such data cannot
be finer than that. Where it applies, the nose's band will grow from
about 1e-4 of the term to a tenth or more of it (14 to 16% in the two
boxes seen so far, section 5). That is the price of a band that covers
the model, and section 4.8 says what it does to totals.

## 2. What is known today

### 2.1 The comparisons on record

| Set                                                                       | What was looked at                                                                                                                                     | By whom, when                                                                                | Times read                                                                                                                                                                                                                                                                      | Where recorded                                                                                                                                                               |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NACA TN 3716 (Perkins and Jorgensen, 3-caliber tangent ogive, Mach 1.98)  | Table I(a), the zero-incidence pressure coefficients at every orifice                                                                                  | The first session's agent, 2026-10-15, by eye from the NTRS scan at 600 dpi (commit 5fcc92b) | **Once** as a whole. On review (the advisor's review of the grid generator, commit 399c8de, the same day) two cells were looked at again at 1200 dpi by the same session and found ambiguous (x/d 0.56 and 3.62); both readings are kept. No blind second reading exists        | `src/validation/ogive-cylinder-tn3716.ts` (the values), `docs/design/0004-grids.md` (a table of seven stations against the Euler solution and the method of characteristics) |
| TN 3716, figure 3                                                         | The plotted points, at the two ambiguous stations at least, as a check of the typing                                                                   | The same session, 2026-10-15 (399c8de)                                                       | Partly, once, not as a reading of its own                                                                                                                                                                                                                                       | The file's header comment                                                                                                                                                    |
| TN 3716, integrated over the nose                                         | The table's pressures integrated into a nose drag: 8 to 9% above the inviscid value (method of characteristics, 0.09880), three cells read uncertainly | An audit agent, 2026-10-17 (commit 298023c)                                                  | Once. The integration's method (quadrature, the tip ahead of the first orifice, the shoulder, which reading of each ambiguous cell) is **not recorded**: no script, no stations, no intermediate values                                                                         | `docs/validation/sources.md`; the README until the owner's rewrite (8c290f3)                                                                                                 |
| NACA RM A53E01 (Perkins and Kuehn, 5.75-caliber tangent ogive, Mach 1.98) | Table II(a), the zero-incidence pressures; the model, fig. 1; the stated uncertainty, +-0.004, p. 5; the report's own explanation, p. 8                | The same audit agent, 2026-10-17 (298023c)                                                   | Once. **Not transcribed**: no value of the table is in the repository. Only the integrated drag (0.0298, 3.1% below the inviscid 0.03074) and the report's explanation (a slightly smaller nose angle on the model, and surface slope errors) are recorded. Method not recorded | `docs/validation/sources.md`                                                                                                                                                 |

So, exactly what is known:

1. On two tangent ogives at Mach 1.98, the measured zero-incidence
   pressures, integrated by an unrecorded method from one reading each,
   gave nose drags 8 to 9% above (TN 3716) and 3.1% below (RM A53E01)
   the inviscid value computed for each body.
2. On TN 3716, station by station, the measured pressures lie above the
   inviscid solution by 0.002 to 0.022 in Cp at every unambiguous
   station, largest at the shoulder, and the converged Euler solution
   agrees with the method of characteristics to 4e-4 (0004). So the
   difference is the model's, not the solver's. Its cause is not
   established; a laminar boundary layer is worth about 0.002 in Cp
   there, a blunted model tip and the tunnel's Mach tolerance are untested
   candidates (0004).
3. On RM A53E01 the report itself attributes its low forward pressures to
   the model's geometry, not to the flow.
4. The stated measurement uncertainty (+-0.005 in Cp on TN 3716, +-0.004
   on RM A53E01) is, integrated, 5 to 13% of these drags: neither
   difference is outside what the data can resolve, and neither can test
   a band of 1e-4 (sources.md).
5. Nothing else measures a nose's pressures or fore drag against the
   model on record (section 4.1 lists what the records name and what
   state each is in).
6. A test already holds the solver to TN 3716's measured pressures:
   `tests/engine-cpu/body-validation.test.ts` lines 173 to 183 require
   the Euler solution within 0.025 in Cp of every unambiguous measured
   station. It calls itself "a regression bound, not an accuracy claim";
   its tolerance was set when it was written, after the differences
   (0.002 to 0.022) were seen. It is a comparison, not a validation, and
   sets nothing here.

Further facts the readings must allow for:

- **Every TN 3716 value is public in this repository**:
  `src/validation/ogive-cylinder-tn3716.ts` holds the whole typed table,
  and 0004 quotes seven stations. A reader is blind to them only if the
  reader's brief and working copy exclude the repository (and with it the
  README history, sources.md, 0004 and this record). Section 4.2 makes
  that a condition.
- **Three uncertain cells, not two.** sources.md says the integration
  read three cells uncertainly: x/d 0.56 and 3.62 (both readings kept in
  the file) and x/d 2.95, at the shoulder, where the first typing noted
  "possibly" another last digit (5fcc92b); the later revision (399c8de)
  dropped that note and keeps one value. The shoulder carries the largest
  difference, so that cell matters.
- **The audit integration probably differs from 4.3.** Its method is not
  recorded; it is unlikely to have used the same stations and quadrature
  for the inviscid value, or to have kept every ambiguous reading. The
  8 to 9% and 3.1% are therefore not 4.3's quantity, and a fresh reading
  formed by 4.3 may land elsewhere. That is why section 5's floor takes
  the published figures as they stand.

### 2.2 Other measured sets seen, not about this question

- **NACA TN 4233** (Page, a 7 deg cone-cylinder, indicated Mach 0.6 to
  1.4): transcribed (`src/validation/cone-cylinder-tn4233.ts`) and
  compared with the transonic solver in 0013. Where Taylor-Maccoll is
  exact (Mach 1.078 to 1.2) the cone orifices' mean lies below it by
  0.0004 to 0.0030 in Cp (0013). Seen, compared, read once.
- **NACA RM E51H17** (a 4.77 deg cone at Mach 3.85): one value digitised
  from fig. 4(a), about 34% above Taylor-Maccoll, which its report puts
  down to Reynolds-number effects; "not used" (sources.md). Seen.
- **NACA RM E52C10** (five cone-cylinders at Mach 3.12): opened by the
  first session; "not used" because zero incidence is only plotted
  (sources.md). No value is recorded. Whether its zero-incidence plots
  were looked at for values is not recorded either, so it is treated as
  possibly seen (section 4.1).
- **NASA TN D-3516** (a 3-caliber tangent ogive, Mach 0.7 to 1.2): its
  text, figure 1, figure 5 (the smooth model's pressures, plotted only)
  and table II (the orifices) were read for the transonic work; not
  digitised. sources.md records that figure 5's four stagnation pressures
  scatter by about 0.005 in Cp. So fig. 5 was looked at, but no value was
  recorded and none was compared with the model.
- **NACA TR 1386** (Perkins, Jorgensen and Sommer, 1958: blunted cones
  and Karman ogives, nose pressures and foredrags, Mach 1.24 to 7.4):
  named in 0014 10.1 as "a check of the nose solve, as 0006 uses TN 3716,
  not a total"; **not read** (0014 10.4, 10.7 (h)).
- TN 2399 (Rossow) and TN 2764 (Ehret) are theory, not measurement: they
  check the method of characteristics, not the model.

### 2.3 Where the nose's band is labelled today

- README, "What works today": "**Verified**, Mach 1.2 to 5: each result
  carries an error band measured from nested grids". The definition two
  lines below ("verified means the numerical error was measured") is
  true, but the table line does not say the band leaves the model out.
- The page: the help section shown on every page (`src/ui/help.ts`,
  `bandSection`), the nose's line in the total's breakdown
  (`src/app/total-drag.ts`, `noseComponentOf` and `BREAKDOWN_NOTE`), and
  the static explanations of `demos/nose-drag.html` and
  `demos/flow-view.html`.
- 0008 section 6.4's breakdown, "nose wave drag (solved, band of order
  1e-4)"; 0011 section 1, "the page's own verified solve".
- `src/total` carries no nose model-form allowance (the advisor's report,
  section 6 item 5).

### 2.4 What the Basic Finner's tests did and did not cover

The Basic Finner's nose is a 20 deg cone (0011 section 3), where the
inviscid value is Taylor-Maccoll's. Its free-flight tests (DREV, voided;
BRL 934 range A, passed) test the whole total, so whatever the nose model
gets wrong on that cone at those conditions is inside the measured
residuals. They say nothing about ogives, or about any nose apart from
the total.

### 2.5 What this record's author saw

For the record, since the author drafts a registration: while finding the
comparisons, this author saw the integrated figures above, the header of
`src/validation/ogive-cylinder-tn3716.ts` (the two ambiguous cells and
fig. 3's points there) and 0004's seven-station table. No other value of
TN 3716, and no value of RM A53E01, TN D-3516, RM E52C10 or TR 1386. The
author is not a reader and will not be one.

## 3. What the inviscid model leaves out, and what the data contain

The served nose term is the forebody pressure drag of inviscid flow
(0006). A real nose differs by:

- the boundary layer's displacement, which thickens the body and raises
  the pressure on the ogive's aft part; small and Reynolds-number
  dependent;
- transition, separation near a sharp shoulder, and laminar
  separation-like effects at low tunnel Reynolds numbers (RM E51H17's
  34% on a slender cone is the warning);
- the real tip (no model is sharp) and the real geometry (RM A53E01's own
  explanation);
- the gas (a perfect gas at gamma 1.4 is good at these Mach numbers).

Measured pressures also carry the tunnel: its Mach-number tolerance, flow
angularity, the sting, and the stated measurement uncertainty. An
allowance formed from measured pressures therefore bounds all of these
together. It is a model-form allowance for "an inviscid nose against a
tunnel model's measured pressures", which is what its label must say. It
does not double count the skin friction (0007): pressures carry no shear.

## 4. The accuracy-first route

### 4.1 The data, named before use

Every measured set of nose pressures or fore drag the records list, with
its state. Draft (w) (section 7) names them; the figures of a source not
yet opened are named by a later dated entry made when it is opened to see
what it covers, before any value is read (as 0014 10.1 does for TN 3548).

| Set                                                                                                  | Covers                                         | State                                                                                                                                          | Proposed role                                                                                                  |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| TN 3716, table I(a) zero-incidence column, and fig. 3's zero-incidence points                        | 3-caliber tangent ogive, Mach 1.98             | Typed once (2026-10-15); integrated once (2026-10-17); every value public in the repository                                                    | Seen: widening only, with a floor (section 5, Route 1)                                                         |
| RM A53E01, table II(a) zero-incidence column; fig. 1 for the model                                   | 5.75-caliber tangent ogive, Mach 1.98          | Read once (2026-10-17), not typed; the integrated result public                                                                                | As TN 3716                                                                                                     |
| TR 1386: its pressure distributions and foredrags at zero incidence, figures named when it is opened | Blunted cones, Karman ogives, Mach 1.24 to 7.4 | Not read                                                                                                                                       | Band-setting, read twice                                                                                       |
| RM E52C10: its zero-incidence plotted points (figure named when it is opened for coverage)           | Cone-cylinders, Mach 3.12                      | Opened, no value recorded; whether the plots were looked at is not recorded, so treated as possibly seen                                       | Band-setting, read twice; disclosed in (w)                                                                     |
| TN D-3516: fig. 5 and its table of orifices, the smooth model                                        | 3-caliber tangent ogive, Mach 1.1 and 1.2      | Fig. 5 read for the transonic work (its stagnation pressures' scatter, about 0.005 in Cp, noted), not digitised, never compared with the model | Band-setting for Mach 1.1 to 1.2, read twice, used only once the nose is served there (0013); disclosed in (w) |
| TN 4233: table I(a) and (b)                                                                          | 7 deg cone, Mach 1.078 to 1.4                  | Typed once and compared (0013)                                                                                                                 | As TN 3716 (seen)                                                                                              |
| RM E51H17: fig. 4(a)                                                                                 | 4.77 deg cone, Mach 3.85                       | One value digitised; the result public                                                                                                         | Seen: widening only, in its own box (the owner, 2026-10-24; section 8)                                         |

Never used, by 0014 10.1: the PARD standard body's fore drag (RM L52E06
figs. 9 to 12) and every other held-back set. The search for further
sets (sharp cones and tangent ogives at Mach 1.2 to 3 especially) is part
of the work; each new set is named in a dated entry before it is opened
for values.

### 4.2 Reading

- Each named figure or table is read twice: a first reading, and a blind
  second by a reader who never opens the first. A neutral party, never a
  reader, pairs them. Each reading is committed before the pairing.
- For a seen set (TN 3716, RM A53E01, TN 4233), both readers work from
  the source file alone: their briefs and working copies exclude this
  repository (where TN 3716's values and both integrated results are
  public), and the brief names no earlier value or percentage. Without
  that, the reading is recorded as not blind.
- Where a cell or point is ambiguous, every plausible reading is kept.
- The band uses the envelope of both readings and of every earlier
  reading on record, never resolved toward the narrower value:
  - TN 3716's typing of 2026-10-15 as it stands in
    `src/validation/ogive-cylinder-tn3716.ts`, and its first version's
    -0.038 at x/d 2.95 (5fcc92b), so that the shoulder cell counts as
    ambiguous in 4.3 (both -0.036 and -0.038, and whatever the fresh
    readings give);
  - TN 4233's existing typing (`src/validation/cone-cylinder-tn4233.ts`).
    TN 4233 has no published integrated figure, so no floor of section 5
    can be computed for it; its earlier typing, carried in the envelope,
    does the floor's job.
- The model's geometry is read from the report (stations, nose length,
  ogive radius, tip) and checked as `tests/validation/ogive-cylinder-tn3716.test.ts`
  checks TN 3716's (the ogive radius from the nose length).

### 4.3 The quantity, fixed now

For each measured body b at Mach number M and each reading k:

1. **Stations.** The orifices on the nose (from the tip to the shoulder)
   at zero incidence, with their x/d from the report's model figure.
   Ambiguous cells count with each of their readings in turn.
2. **Like for like.** The inviscid pressure is the converged inviscid
   solution for the report's body and Mach number (the method of
   characteristics where it runs, otherwise the finest fitted grid),
   sampled at the same stations. Both measured and inviscid Cp are
   integrated by the same quadrature over the same stations, so that the
   quadrature's own error largely cancels in the comparison: the
   trapezoid rule in r(x)^2 between stations; from the tip to the first
   orifice, both take the inviscid Cp of the solution there (so that
   stretch carries no difference); from the last orifice to the shoulder,
   each is held at its last station's value.
3. **Coverage.** The share of the inviscid nose drag that lies outside
   the orifices (ahead of the first, and between the last and the
   shoulder) is reported. If it exceeds a tenth, that body sets nothing
   (the measurement covers too little of the drag). Below a tenth, the
   uncovered part carries its own term (item 5): it is integrated with
   the inviscid Cp in both quadratures, so it shows no difference by
   construction, and the term stands in for the difference it could
   hide. This matters most for blunted families (TR 1386), whose cap
   carries a large share of the drag on few orifices.
4. **The difference.** r_bk = D_meas / D_inv - 1, from the two
   quadratures of item 2. (Below indicated Mach 1.000 the difference is
   absolute, d = D_meas - D_inv, and items 3 and 5 follow section 8 item
   10, dated 2026-10-24, before any such row was evaluated.)
5. **The uncertainty terms**, each relative to D_inv, summed linearly:
   - _measurement:_ the report's stated uncertainty e in Cp, taken as a
     bias common to every orifice (the worst case, and what a
     reference-pressure error does): u_meas = e A_bias / D_inv, with
     A_bias = (R^2 - r(x_first)^2) / R^2 the fraction of the base area
     from the first orifice to the shoulder (projected, in r^2): the value
     held behind the last orifice (item 2) carries the same bias, so the
     bias acts up to the shoulder. (Revision 3 had A_cov, the orifices'
     span only; changed before any reading, revision 4.)
   - _uncovered part:_ u_unc = A_unc max_j |Cp_meas,j - Cp_inv,j| /
     D_inv, with A_unc the uncovered fraction of the base area and the
     largest station difference of that reading (over every ambiguous
     alternative): the share times the largest station difference,
     written in area so that no station near Cp = 0 divides anything;
   - u_bk = u_meas + u_unc.
6. **The half-width for that body and Mach number.** a_b = the largest,
   over all readings k and ambiguous alternatives, of |r_bk| + u_bk.

**The sign: symmetric.** The band is symmetric about the served value,
with half-width a (relative) times the nose term. One body per box cannot
show the direction of the model's error: a single tunnel model's
difference mixes the inviscid model's error with that model's geometry
and that tunnel (the two seen ogives, one family at one Mach number but
different boxes, differ in opposite directions, 8 to 9% above and 3%
below). A one-sided band would assume a direction nobody measured. A
one-sided band, or a sign per family, may be adopted only by a later
dated entry, made before any reading, for a family with several bodies
in one box. In the total (0008 section 6.3,
the linear sum of the components' bands) the nose component's low and
high become D_nose (1 - a) - n and D_nose (1 + a) + n, with n the
numerical band (0006), and they add to the other components' lows and
highs as every band does. The allowance and n are shown as separate
lines.

Disclosed: the coverage threshold of a tenth (item 3) was written by an
author who knows from 0004 that TN 3716's first orifice is at x/d 0.22,
but not what share of its drag lies ahead of it.

**Fixed before any reading** (Route 1's condition (b), section 5): this
quantity, the integration script that implements it, the thresholds, the
cover rule (4.4) and the sign rule are committed and independently
reviewed before any new reading reaches them. The script's first run is
on the existing TN 3716 typing and is recorded as a run on seen data: it
checks the script, and its result is labelled so; it is not a reading.

### 4.4 Per family and Mach number

- **Families** as the page serves them: cones, tangent ogives, secant
  ogives, parabolic, ellipsoid, Haack and Von Karman, power series, and
  each blunted variant separately.
- **The cover of a family** is the union of boxes, one per measured
  (fineness, Mach) pair of that family: +-0.05 in Mach and +-0.25
  calibers in fineness about it. Not the convex hull: a hull would span
  finenesses and Mach numbers nobody measured (with the two seen ogives,
  every tangent ogive from 3 to 5.75 calibers). Nothing is extrapolated
  beyond the boxes.
- **The allowance** at a case is the largest half-width a_b (4.3, item 6) of every measured case whose box contains it, and never less than
  section 5's floor where a seen set's box contains it. Not
  interpolated: a narrow case never narrows a wide one.
- **Inside the cover**, the nose's band is the numerical band (unchanged)
  plus the allowance, shown as two lines: "numerical error of the
  inviscid solve" and "inviscid model against measured pressures (n
  bodies, Mach range, sources, tunnel Reynolds number)". The Reynolds
  number is each report's own (for TN 3716, 0.44e6 on the diameter), so a
  reader sees how far the tunnel lay from flight.
- **Outside the cover**, the nose stays labelled as section 6's interim
  label says it: numerical error only, the model's own error not in the
  band.

With the two sets seen today the cover would be two small boxes of
tangent ogives at Mach 1.93 to 2.03 (2.75 to 3.25 and 5.5 to 6.0
calibers), and cones nowhere until TR 1386, RM
E52C10 or another set is read. Coverage of the allowance will be small
at first. That is the honest consequence, and section 8 asks the owner
whether a pooled allowance should be offered outside the cover.

### 4.5 In the total

- The allowance enters the total's model-form band linearly, as every
  component's band does (0008 section 6.3), on the nose term, as its own
  named line. The numerical band is kept beside it, not merged.
- A total whose nose lies outside the cover keeps its present claim and
  gains the note "the nose's model error is not in this band". It is not
  refused for that reason alone (section 8 asks whether it should be).
- **The BRL 934 sub-class** (decision 7.1 revised, amendment (q)): its
  nose is a 20 deg cone at Mach 1.80 to 1.83. Its total was tested in
  free flight with the nose at its numerical band, and passed. Adding an
  allowance afterwards only widens a band that passed, so the pass
  stands, but the band shown would no longer be the band tested. The page
  states both (section 8).

### 4.6 Labels

- The nose with an allowance: "verified (numerical error); model error
  bounded by measured pressures on <n> bodies of this family, tunnel
  Reynolds number <Re>". Where a cover rests only on sets seen before
  registration (Route 1's condition (c)), the label adds "formed from
  data seen before registration" and never calls them a test. The word
  "validated" is not used for the nose: a few tunnel bodies at one Mach
  number are component data, which the project's labels call
  "estimated on component data".
- Without: "verified (numerical error only); the model's own error is not
  in this band" (section 6).
- In the README the line follows the page.

### 4.7 What sets nothing

- No held-back set, ever.
- A set examined against the model before its dated entry, except as
  section 5's Route 1 allows: widening only, never a test, never a
  validation.
- A quantity defined after its ink was seen (precedent (r)).

### 4.8 What it costs

- Where the allowance applies, the nose's band grows to a tenth or more of
  the nose term (section 1). The nose term is a part of the total; the
  growth of the total's band is measured by re-running
  `docs/research/refusals/` before and after, not guessed here.
- No case becomes refused by this record. Labels change.
- Work: one coverage pass over TR 1386, RM E52C10 and TN D-3516 (a dated
  entry naming figures); two readings of each named set; a neutral
  pairing; a small integration script implementing 4.3 exactly, reviewed
  before it is run on any reading; the inviscid solutions for each
  measured body; the page and `src/total` wiring, reviewed with the GPU
  job green.

## 5. Already seen: does it taint TN 3716 and RM A53E01?

Yes, as tests and as anything chosen. The integrated differences (8 to 9%
and 3%) and TN 3716's station-by-station differences have been seen by
every agent that read the README, sources.md, the handoff or the
advisor's report, and the coordinator. Under 0014 10.1 rule 2 a figure
sets nothing until a dated entry names it before it is used, and these
were used, as a comparison, before any entry named them.

**Precedent (g)** (NSWCDD/TR-92/509, examined against W1's bracket before
it was registered): "Since it was seen first, it is a check of the
ordering, never a test of it, and no claim rests on it as one." **(r)**
went further for a quantity defined after the ink was seen: "a check that
sets nothing: not a band, not a band's end, not an allowance". (s) and
(t) followed (r). Read strictly, TN 3716 and RM A53E01 (and TN 4233 and
RM E51H17, also seen) become checks that set nothing.

**Route 1, the owner's choice, and what it breaks.** Route 1 lets the
seen sets set the allowance's width, by a floor and by fresh readings,
widening only. That breaks (r)'s words twice, not once: the seen data
become "an allowance", and through the floor they set "a band's end" (the
band cannot be narrower than they say). It is still the more honest
outcome, for three reasons:

- **Widening only cannot flatter the width.** The precedents guard
  against a band, a quantity or a method chosen after seeing data, which
  can make the model look better than it is. Under Route 1 a seen set can
  only make the band wider (4.4 takes the largest half-width; the floor
  only raises it). No choice informed by the seen values can narrow
  anything.
- **Route 2 would keep a known discrepancy out of every band.** Under the
  strict precedent the seen sets set nothing, and no unseen set covers
  tangent ogives near Mach 1.98. The page would go on serving those noses
  with a band of 1e-4 beside a published 8 to 9% difference, merely
  labelled. That is the juxtaposition this record exists to remove.
- **Rule 3 of 10.1 was written for held-back tests, not checks.** "A
  failure refuses the configuration it tests and does not widen a band"
  governs the registered free-flight sets, so that a failed test cannot be
  absorbed by widening. A seen tunnel set tests nothing here; applying
  that rule to it (Route 2's "falls outside, stays numerical only")
  borrows a guard against flattery to keep out data that can only widen.

**Route 1's conditions**, all in (w):

- **(a) A floor.** In each seen set's family and Mach number (its box,
  4.4), the half-width is never less than the published integrated
  difference plus its measurement term, taken as they stand, whatever the
  fresh readings give:
  - TN 3716: 0.1068 to 0.1080 against 0.09880, r = +8.1% to +9.3%;
    u_meas = 0.005 / 0.09880 = 5.1%; floor 9.3% + 5.1% = **14.4%**;
  - RM A53E01: 0.0298 against 0.03074, r = -3.1%; u_meas = 0.004 /
    0.03074 = 13.0%; floor 3.1% + 13.0% = **16.1%**.

  These are computed from the figures already public (sources.md), not
  from any new reading. The floor is a lower limit only: fresh readings
  enter under 4.3 beside it and can raise the half-width, never replace
  or lower the floor. TN 4233 has no published integrated figure; its
  earlier typing, carried in the envelope (4.2), does the floor's job.

- **(b) Everything fixed and reviewed first.** The quantity (4.3), the
  integration script, the thresholds, the cover (4.4) and the sign rule
  are committed and independently reviewed before any reading reaches
  them; the script's first run is on the existing TN 3716 typing and is
  recorded as a run on seen data.
- **(c) Labelled for what it is.** Where a family's cover rests only on
  seen sets, the label says "formed from data seen before registration".
  No seen set is ever called a test or a validation, and no claim rests on
  one as such. The entry says the sets were registered after they were
  seen, as (g) did.

**Route 2, not chosen,** is recorded for the reviewer: the seen sets as
checks that set nothing, the allowance from unseen sets alone, and a seen
set falling outside it leaving its family "numerical error only".

## 6. The interim label

Until the allowance is built, the nose's band says what it is, wherever
it is shown:

> numerical error of the inviscid solve; the model's own error is not in
> this band

with a link to the comparison (`docs/validation/sources.md`, "Bodies of
revolution"), and in the README's table, in its short plain style:

> **Verified**, Mach 1.2 to 5, for the numerical error only, not the
> model's: tunnel pressures on two ogives at Mach 1.98 lie 8 to 9% above
> and 3% below it ([why](docs/validation/sources.md#bodies-of-revolution))

Done as a separate commit on this branch, apart from this record: the
README line, `src/ui/help.ts` `bandSection`, `src/app/total-drag.ts`
`noseComponentOf` (the nose's band line in the breakdown) and
`BREAKDOWN_NOTE`, and the static notes of `demos/nose-drag.html` and
`demos/flow-view.html` (d83b336; the direction and Mach number added in
b7d74ad, which also corrects a test comment that called the CPU engine
"validated" against TN 3716). Text only; no number, band or claim
changes.

## 7. Amendment (w), for 0014 section 10.7

Written into 0014 10.7 after (v), in the commit that follows this
revision, with this revision's commit filled in as the one it adopts. The
text below is the registered text; 0014 holds the record.

> **2026-10-24 (w): measured nose pressures, named for the nose's
> model-form allowance before they are read** (rule 2 of 10.1; design
> record 0022 as adopted at commit <this revision's commit, filled in
> in 0014>;
> the advisor's report of 2026-10-22, section 6 item 4; the owner's
> choice of 0022's Route 1). The nose's band (0006) is the numerical error
> of the inviscid solve. An allowance "inviscid model against measured
> pressures" is formed per nose family and Mach number by 0022 sections
> 4.3 and 4.4, fixed and reviewed before any value below is read. It is
> symmetric about the served value (one body per box cannot show the
> error's direction; a one-sided band or a sign per family only by a
> later dated entry, before any reading, for a family with several
> bodies in one box), half-width a times the nose term, a
> the largest |r| + u of every measured case whose box (+-0.05 Mach,
> +-0.25 calibers; the union of boxes, not their hull) contains the case;
> it enters the total's model-form band linearly, as its own line, beside
> the numerical band. Outside every box the nose is labelled "numerical
> error of the inviscid solve; the model's own error is not in this
> band".
>
> 1. _Band-setting, no value recorded:_ NACA TR 1386 (Perkins, Jorgensen
>    and Sommer, 1958; NTRS 19930091022), its zero-incidence pressure
>    distributions and foredrags of blunted cones and Karman ogives, the
>    figures and tables named by a later dated entry when it is opened to
>    see what it covers, before any value is read (not read before); NACA
>    RM E52C10 (Jack and Gould), its zero-incidence plotted pressures on
>    the five cone-cylinders at Mach 3.12, the figure named likewise
>    (opened by the first session; whether its plots were looked at for values is not
>    recorded, so it is disclosed as possibly seen); NASA TN D-3516
>    (Czarnecki and Monta), fig. 5 and table II, the smooth model at Mach
>    1.1 and 1.2, used only once the nose is served there (fig. 5 was read
>    for the transonic work and its stagnation pressures' scatter, about
>    0.005 in Cp, noted; no value recorded or compared with the model).
>    This widens 10.1's "a check of the nose solve" for TR 1386 to
>    band-setting for this allowance only.
> 2. _Each is read twice_, the second reading blind, paired by a neutral
>    party; ambiguous cells keep every reading; the envelope, never
>    resolved toward the narrower.
> 3. _Seen before this entry, widening only:_ NACA TN 3716 (table I(a) and
>    fig. 3, zero incidence; typed once 2026-10-15, integrated once
>    2026-10-17; every value public in the repository), NACA RM A53E01
>    (table II(a), zero incidence; read once 2026-10-17) and NACA TN 4233
>    (tables I(a) and (b); typed and compared in 0013). Registered after
>    they were seen, as (g) records NSWCDD/TR-92/509. Each is read again
>    twice, the second blind, by readers who work from the source file
>    alone, without this repository, and whose briefs name no earlier
>    value. The result may only widen the allowance of its box. It is never
>    a test or a validation, and no claim rests on it as one. Where a box
>    rests only on these sets the label says "formed from data seen before
>    registration". This departs from (r)'s "not a band's end, not an
>    allowance" for these sets only, because their use can only widen.
> 4. _The floor, a lower limit only:_ in TN 3716's box the half-width is
>    never below 14.4% (published 0.1068 to 0.1080 against 0.09880, plus
>    0.005 / 0.09880), and in RM A53E01's never below 16.1% (0.0298
>    against 0.03074, plus 0.004 / 0.03074). Fresh readings enter under
>    0022 section 4.3 beside the floor and can raise the half-width; they
>    never replace or lower it. TN 4233 has no published integrated
>    figure; its existing typing is carried in the envelope and does the
>    floor's job. In TN 3716 the shoulder cell (x/d 2.95) counts as
>    ambiguous, its first typing's -0.038 (5fcc92b) kept beside -0.036.
> 5. _Fixed first:_ the quantity, the integration script, the coverage
>    threshold (a tenth of the drag outside the orifices, with its own
>    term below that), the boxes and the sign rule are committed and
>    reviewed before any reading reaches them. The script's first run is
>    on the existing TN 3716 typing and is recorded as a run on seen data.
> 6. _Not settled here:_ NACA RM E51H17 (fig. 4(a); one value digitised
>    and seen). Whether it sets anything is the owner's open question,
>    decided by a later dated entry before it is read again.
> 7. _Never used:_ every held-back set of 10.1, the PARD standard body's
>    fore drag (RM L52E06 figs. 9 to 12) included.
> 8. _Not changed:_ the nose's numerical band and its floor (0006), every
>    other component's band, and every registered test.

## 8. Decisions, and the one question left open

Decided by the owner: Route 1 (section 5). Decided by the coordinator on
2026-10-24, after the independent re-check:

1. **The measurement's uncertainty counts inside the allowance** (4.3,
   item 5). With the floors of section 5 the allowance is at least 14 to
   16% of the term in the two seen boxes.
2. **Outside the cover the nose keeps "numerical error only"** (4.4,
   section 6). No pooled allowance; the total is not refused for this.
3. **The BRL sub-class** (4.5) shows the tested band and the widened band,
   the tested one marked as the band that passed.
4. **The box margins** (+-0.05 Mach, +-0.25 calibers; 4.4) and **the
   coverage threshold of a tenth** (4.3) stand.
5. **The interim label** may merge on its own (d83b336, b7d74ad).

Decided by the owner on 2026-10-24, settling the one question (w) left
open (its item 6), recorded in 0014 as a dated addition under (w):

6. **RM E51H17 counts, widening only, like the other seen sets.** Fig.
   4(a) (a 4.77 deg cone, about 6.0 calibers, at Mach 3.85) is re-read
   twice, the second blind, by readers working without the repository,
   as TN 3716 and RM A53E01 are. Its result may only widen the allowance,
   and only inside its own measured box (cones, its fineness and Mach
   number, 4.4). Its label names its stated tunnel Reynolds number as far
   below flight, and says "formed from data seen before registration". It
   is never a test. It has no published integrated figure, so it carries
   no floor of section 5 beyond what 4.3 gives from its readings; by 4.2
   its one digitised value on record (sources.md) stays in the envelope
   as an earlier reading.

Decided by the owner on 2026-10-24, after the blind readings were paired
(6019bbd) and before TN 4233 and RM E51H17 were run (the questions in
`docs/research/nose-model-form/out/blind-run-questions.txt`, cce5621).
Both widen only:

7. **Two values at one station enter as alternatives.** TN 4233's check
   orifices 16 and 17 (the opposite surface, at the stations of orifices
   4 and 7) and RM E51H17's two meridian symbols at each station are
   each an alternative of that station's value: the script takes every
   combination and the widest counts (4.3 item 6). Every TN 4233 row of
   tables I(a) and I(b) is run, the 1.080 and 1.400 rows included; a
   cell a reader flagged "typo?" enters with its alternative, where the
   reader gave one.
8. **A report that states no Cp uncertainty** (RM E51H17) takes the
   largest stated Cp uncertainty among the other nose reports of the set
   (TN 3716, RM A53E01, TN 4233) as its e in 4.3 item 5; the run says
   which value that is and where it comes from. A listed station with no
   plotted point is absent (recorded). RM E51H17's Reynolds-number basis
   conflict is recorded in the label, not resolved. Its earlier reading
   on record (one value, no station) stays in the envelope only as 4.2
   allows; if it cannot enter the script for lack of a station, the run
   records that and says so.
   _Clarified by the owner on 2026-10-24, after the run at 944f46f (a
   clarification, not a change):_ "the largest stated" is meant
   literally. For RM E51H17 that is +-0.006, RM A53E01's stated
   uncertainty off the plane of symmetry (p. 6), and it stays.

Decided by the owner on 2026-10-24, after the second blind run
(944f46f) and before the rows below were run. Widening only:

9. **TN 4233's rows below indicated Mach 1.078** (30 rows of tables I(a)
   and I(b), indicated Mach 0.600 to 1.064), where Taylor-Maccoll is not
   the inviscid solution, are run against the transonic solver of 0013 on
   its finest grid, as 4.3 item 2 allows ("otherwise the finest fitted
   grid"). Their result may only widen the cone allowance, in their own
   boxes and where those overlap the boxes already formed.
   _Added by the owner on 2026-10-24, before any of these rows was
   evaluated:_ the finest grid is r = 8, and the owner runs the r = 8
   solves on their own machine's GPU (12 GB or more) with the kit in
   `docs/research/nose-model-form/owner-kit/` (the page's GPU engine, the
   driver's settling tests unchanged); the files record the GPU used. No
   row below Mach 1 is evaluated until a verification plan for the solver
   below Mach 1 is registered.

Decided by the owner on 2026-10-24, before any row below Mach 1 is
evaluated (0014 10.7 (y), item 11; the solver's verification registered
there comes first):

10. **Below Mach 1 the measure is absolute, in CD on the base area.** The
    inviscid nose drag of a cone-cylinder in subsonic flow is near zero
    (exactly zero where shock-free, (y) R1), so the ratio r = D_meas /
    D_inv - 1 of 4.3 item 4 is ill-conditioned there. For a row at
    indicated Mach below 1.000 (`MEASURE_BOUNDARY_MACH`, fixed now, not
    after seeing values): d = D_meas - D_inv from the same two quadratures
    of 4.3 item 2; u_meas = e A_bias and u_unc = A_unc max|Cp_meas -
    Cp_inv|, in CD, not divided by D_inv; the half-width a_abs = max(|d| +
    u_meas + u_unc) over readings and alternatives, in CD; the box of 4.4
    carries it in absolute CD. Coverage (4.3 item 3) is by the uncovered
    base area, 1 - A_cov at most a tenth, since the share of a near-zero
    drag means nothing. At and above indicated Mach 1.000 the ratio form
    stands. A Mach number inside boxes of both forms (0.95 to 1.05 can be)
    takes, at a nose term D, the wider of a D (the ratio boxes) and a_abs
    (the absolute boxes): the band is D - max(a D, a_abs) - n to D +
    max(a D, a_abs) + n, both lines shown. The verified solver's own
    station band enters as a third term u_num ((y) item 11) in the
    measure's units. Coded in `src/validation/nose-model-form.ts`
    (`measure`, `measureFor`, `allowanceAt`'s `absolute`, `noseBand`),
    tested on synthetic bodies before any reading reached it.

## 9. Order of work after the decisions

1. Done: the decisions of section 8; this record revised; the
   independent re-check.
2. Done: (w) written into 0014 10.7, dated 2026-10-24.
3. TR 1386, RM E52C10 and TN D-3516 opened for coverage only; their
   figures named in a dated entry (a letter from the coordinator).
4. The integration script (4.3) written, reviewed and committed before
   any reading reaches it.
5. Readings, first and blind second; neutral pairing.
6. The inviscid solutions of each measured body; the allowance per family
   and Mach number.
7. `src/total` and the page carry the allowance as its own line;
   `docs/research/refusals/` re-run before and after; the GPU job green;
   an independent review; merge.
