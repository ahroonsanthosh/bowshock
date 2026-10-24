# 0022: The nose's model error, against measured pressures (draft)

- **Status:** draft for the owner's decision and an independent review.
  Design and registration only: no code, and no value of any source was
  read for this record.
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
about 1e-4 of the term to about a tenth of it. That is the price of a
band that covers the model, and section 4.8 says what it does to totals.

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

### 2.2 Other measured sets seen, not about this question

- **NACA TN 4233** (Page, a 7 deg cone-cylinder, indicated Mach 0.6 to
  1.4): transcribed (`src/validation/cone-cylinder-tn4233.ts`) and
  compared with the transonic solver in 0013. Where Taylor-Maccoll is
  exact (Mach 1.078 to 1.2) the cone orifices' mean lies below it by
  0.0004 to 0.0030 in Cp (0013). Seen, compared, read once.
- **NACA RM E51H17** (a 4.77 deg cone at Mach 3.85): one value digitised
  from fig. 4(a), about 34% above Taylor-Maccoll, which its report puts
  down to Reynolds-number effects; "not used" (sources.md). Seen.
- **NACA RM E52C10** (five cone-cylinders at Mach 3.12): opened; "not
  used" because zero incidence is only plotted. No value recorded.
- **NASA TN D-3516** (a 3-caliber tangent ogive, Mach 0.7 to 1.2):
  opened; "not digitised" (0013, sources.md). No value recorded.
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

| Set                                                                                                  | Covers                                         | State                                                                                                                                       | Proposed role                                                                                     |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| TN 3716, table I(a) zero-incidence column, and fig. 3's zero-incidence points                        | 3-caliber tangent ogive, Mach 1.98             | Typed once (2026-10-15); integrated once (2026-10-17); the result public                                                                    | See section 5: a floor on the allowance (recommended) or a check                                  |
| RM A53E01, table II(a) zero-incidence column; fig. 1 for the model                                   | 5.75-caliber tangent ogive, Mach 1.98          | Read once (2026-10-17), not typed; the integrated result public                                                                             | As TN 3716                                                                                        |
| TR 1386: its pressure distributions and foredrags at zero incidence, figures named when it is opened | Blunted cones, Karman ogives, Mach 1.24 to 7.4 | Not read                                                                                                                                    | Band-setting, read twice                                                                          |
| RM E52C10: its zero-incidence plotted points (figure named when it is opened for coverage)           | Cone-cylinders, Mach 3.12                      | Opened, no value recorded                                                                                                                   | Band-setting, read twice                                                                          |
| TN D-3516: fig. 5 and its table of orifices, the smooth model                                        | 3-caliber tangent ogive, Mach 1.1 and 1.2      | Opened and looked at (sources.md notes its stagnation pressures scatter by about 0.005 in Cp), not digitised, never compared with the model | Band-setting for Mach 1.1 to 1.2, read twice, used only once the nose is served there (0013)      |
| TN 4233: table I(a) and (b)                                                                          | 7 deg cone, Mach 1.078 to 1.4                  | Typed once and compared (0013)                                                                                                              | As TN 3716 (seen)                                                                                 |
| RM E51H17: fig. 4(a)                                                                                 | 4.77 deg cone, Mach 3.85                       | One value digitised; the result public                                                                                                      | As TN 3716 (seen); the owner decides whether a low-Reynolds tunnel set applies at all (section 8) |

Never used, by 0014 10.1: the PARD standard body's fore drag (RM L52E06
figs. 9 to 12) and every other held-back set. The search for further
sets (sharp cones and tangent ogives at Mach 1.2 to 3 especially) is part
of the work; each new set is named in a dated entry before it is opened
for values.

### 4.2 Reading

- Each named figure or table is read twice: a first reading, and a blind
  second by a reader who never opens the first. A neutral party, never a
  reader, pairs them. Each reading is committed before the pairing.
- Where a cell or point is ambiguous, every plausible reading is kept.
- The band uses the envelope of both readings, and of any earlier reading
  on record (TN 3716's typing of 2026-10-15). A disagreement is kept as an
  envelope, never resolved toward the narrower value.
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
3. **Coverage.** The share of the inviscid nose drag that lies ahead of
   the first orifice is reported. If it exceeds a quarter, that body sets
   nothing (the measurement covers too little of the drag).
4. **The difference.** r_bk = D_meas / D_inv - 1, from the two
   quadratures of item 2.
5. **The measurement's uncertainty.** The report's stated uncertainty e in
   Cp, taken as a bias common to every orifice (the worst case, and what a
   reference-pressure error does): it moves the integrated drag by e
   times the covered share of the projected area, u_b = e A_cov / D_inv,
   with A_cov the covered fraction of the base area (1 when the stations
   reach the shoulder).
6. **The interval for that body and Mach number.** The envelope over all
   readings k (and ambiguous alternatives) of [r_bk - u_b, r_bk + u_b],
   widened to include zero, since the model's value is what is served.

Disclosed: the coverage threshold of a quarter (item 3) was written by an
author who knows from 0004 that TN 3716's first orifice is at x/d 0.22,
but not what share of its drag lies ahead of it.

### 4.4 Per family and Mach number

- **Families** as the page serves them: cones, tangent ogives, secant
  ogives, parabolic, ellipsoid, Haack and Von Karman, power series, and
  each blunted variant separately.
- **The cover of a family** is the set of measured (fineness, Mach)
  pairs of that family, each widened by a margin fixed here: +-0.05 in
  Mach and +-0.25 calibers in fineness, and the convex hull of those
  boxes. Nothing is extrapolated beyond it.
- **The allowance** at any case inside the cover is the envelope of the
  intervals (4.3, item 6) of every measured case in that family's cover,
  not interpolated: a narrow case never narrows a wide one.
- **Inside the cover**, the nose's band is the numerical band (unchanged)
  plus the allowance, shown as two lines: "numerical error of the
  inviscid solve" and "inviscid model against measured pressures (n
  bodies, Mach range, sources)".
- **Outside the cover**, the nose stays labelled as section 6's interim
  label says it: numerical error only, the model's own error not in the
  band.

With the two sets seen today the cover would be two narrow boxes of
tangent ogives near Mach 1.98, and cones nowhere until TR 1386, RM
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
  bounded by measured pressures on <n> bodies of this family". The word
  "validated" is not used for the nose: a few tunnel bodies at one Mach
  number are component data, which the project's labels call
  "estimated on component data".
- Without: "verified (numerical error only); the model's own error is not
  in this band" (section 6).
- In the README the line follows the page.

### 4.7 What sets nothing

- No held-back set, ever.
- A set examined against the model before its dated entry, except as
  section 5 decides.
- A quantity defined after its ink was seen (precedent (r)).

### 4.8 What it costs

- Where the allowance applies, the nose's band grows by about a tenth of
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

**Why this case differs, and what is proposed.** The precedents guard
against a band or a method chosen after seeing data, which can only make
the model look better than it is. Here the seen data would be used only
to widen: an allowance can never be made narrower by including a body,
because 4.4 takes the envelope. Excluding them would serve a nose band
that leaves out a discrepancy everyone has seen, which is the opposite of
what the rule is for. So two routes:

- **Route 1 (recommended): a floor, never a test.** The seen sets are
  named in (w) as widening-only: each is read again from the source,
  twice, the second blind, by readers who have not seen the earlier
  typing or the integrated figures (the first reader may not have the
  earlier typing; neither has the 8 to 9% or 3% if that can be arranged,
  which for an agent is a matter of what its brief contains); the
  quantity is formed by 4.3, fixed here before these readings; and the
  result may only widen the allowance of its family and Mach number. It
  is never a test of the allowance, never a band's narrow end, and no
  claim rests on it as a validation. The entry says it was registered
  after it was seen, as (g) did. This departs from (r)'s words "not an
  allowance", so it needs the owner's decision.
- **Route 2 (the strict precedent).** The seen sets are checks that set
  nothing. The allowance is formed only from unseen sets (TR 1386, RM
  E52C10, TN D-3516 and any found later). Each seen set is then shown
  beside the allowance of its family and Mach number: if it falls outside,
  that is recorded as the allowance failing its check, and by rule 3 of
  10.1 (a failure refuses, does not widen) that family and Mach range stay
  "numerical error only". Today no unseen set covers tangent ogives near
  Mach 1.98, so under Route 2 the two ogives would stay numerical only.

Both are honest. Route 1 gives a number where Route 2 gives a label;
Route 1 needs a new rule, Route 2 does not.

## 6. The interim label

Until the allowance is built, the nose's band says what it is, wherever
it is shown:

> numerical error of the inviscid solve; the model's own error is not in
> this band

with a link to the comparison (`docs/validation/sources.md`, "Bodies of
revolution"), and in the README's table, in its short plain style:

> **Verified**, Mach 1.2 to 5, for the numerical error only: each result
> carries an error band measured from nested grids. The inviscid model's
> own error is not in that band; wind-tunnel pressures on two ogives
> differ from it by 3% and 8 to 9% ([details](docs/validation/sources.md#bodies-of-revolution))

Done as a separate commit on this branch, apart from this record: the
README line, `src/ui/help.ts` `bandSection`, `src/app/total-drag.ts`
`noseComponentOf` (the nose's band line in the breakdown) and
`BREAKDOWN_NOTE`, and the static notes of `demos/nose-drag.html` and
`demos/flow-view.html`. Text only; no number, band or claim changes.

## 7. Draft amendment (w), for 0014 section 10.7

Not yet in 0014. The coordinator adds it, dated when it is committed
there, before any set below is read for this purpose. The owner's choice
between Route 1 and Route 2 (section 5) is written into item 3 before it
is committed; the text below is Route 1, with Route 2's wording in
brackets.

> **2026-10-24 (w): measured nose pressures, named for the nose's
> model-form allowance before they are read** (rule 2 of 10.1; design
> record 0022; the advisor's report of 2026-10-22, section 6 item 4). The
> nose's band (0006) is the numerical error of the inviscid solve. An
> allowance "inviscid model against measured pressures" is formed per
> nose family and Mach number by 0022 section 4.3 and 4.4, fixed before
> any value below is read, and carried linearly in the total's model-form
> band as its own line; outside its cover the nose is labelled "numerical
> error of the inviscid solve; the model's own error is not in this
> band".
>
> 1. _Band-setting, no value read:_ NACA TR 1386 (Perkins, Jorgensen and
>    Sommer, 1958; NTRS 19930091022), its zero-incidence pressure
>    distributions and foredrags of blunted cones and Karman ogives,
>    the figures and tables named by a later dated entry when it is
>    opened to see what it covers, before any value is read; NACA RM E52C10
>    (Jack and Gould), its zero-incidence plotted pressures on the five
>    cone-cylinders at Mach 3.12, the figure named likewise; NASA TN D-3516
>    (Czarnecki and Monta), fig. 5 and its orifice table, the smooth model
>    at Mach 1.1 and 1.2, used only once the nose is served there. This
>    widens 10.1's "a check of the nose solve" for TR 1386 to band-setting
>    for this allowance only.
> 2. _Each is read twice_, the second reading blind, paired by a neutral
>    party; ambiguous cells keep every reading; the envelope of both, never
>    resolved toward the narrower.
> 3. _Seen before this entry:_ NACA TN 3716 (table I(a) and fig. 3, zero
>    incidence; typed once 2026-10-15, integrated once 2026-10-17), NACA RM
>    A53E01 (table II(a), zero incidence; read once 2026-10-17), NACA TN
>    4233 (tables I(a) and (b); typed and compared in 0013) and NACA RM
>    E51H17 (fig. 4(a); one value digitised). By the precedent of (g) they
>    are never a test, and no claim rests on any of them as one. Each is
>    read again twice, the second blind, by readers whose briefs omit the
>    earlier readings and their integrated results, and the result may
>    only widen the allowance of its family and Mach number, never set its
>    narrow end. [Route 2: by the precedent of (g) and (r) they are checks
>    that set nothing, not an allowance; each is shown beside the
>    allowance of its family and Mach number, and one falling outside it
>    leaves that family and Mach range "numerical error only".]
> 4. _Never used:_ every held-back set of 10.1, the PARD standard body's
>    fore drag (RM L52E06 figs. 9 to 12) included.
> 5. _Not changed:_ the nose's numerical band and its floor (0006), every
>    other component's band, and every registered test.

## 8. Open questions for the owner

1. **Route 1 or Route 2** (section 5): may the seen sets widen the
   allowance (a new rule, departing from (r)'s "not an allowance"), or
   are they checks only? Recommendation: Route 1.
2. **The measurement's uncertainty inside the allowance** (4.3, item 5):
   recommended, since a band narrower than the data's resolution claims
   what the data cannot show. It makes the allowance at least 5 to 13% of
   the term wherever these sets apply.
3. **Outside the cover** (4.4): label "numerical error only" (recommended
   for now), or serve a pooled allowance (the envelope of every measured
   case, all families and Mach numbers) labelled "estimated, outside the
   measured noses", or refuse the total. Recommendation: the label now;
   reconsider the pooled allowance once TR 1386 is read.
4. **Low-Reynolds tunnel sets** (RM E51H17's 34%): do sets whose Reynolds
   number lies far below rockets' flight values set the allowance at all?
   Deciding this now, with E51H17 seen, is itself a choice after seeing,
   so the recommendation is to let it widen like any other seen set, and
   say why.
5. **The BRL sub-class** (4.5): show the tested band and the widened band
   side by side, or the tested band with a note? Recommendation: both,
   the tested one marked as the band that passed.
6. **The margins** of the cover (+-0.05 Mach, +-0.25 calibers; 4.4) and
   the coverage threshold of a quarter (4.3): accept, or set others before
   any reading.
7. **The interim label** (section 6) can merge before any of this: does
   the owner want it on main now?

## 9. Order of work after the decisions

1. The owner's answers; this record revised; an independent review.
2. (w) committed to 0014 10.7 by the coordinator, dated.
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
