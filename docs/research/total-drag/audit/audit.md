# Audit of draft 0007 (total drag)

Auditor's record, 2026-10-18. Draft audited:
`drag-research/0007-total-drag.md`, with its `data/`, `scripts/`, `pdfs/`,
`web/` and `tools/` (paths below are relative to the scratchpad directory).
Nothing in the draft, in the first agent's files or in the repository was
edited. My readings, scripts and working images are in `drag-audit/`.

How this audit was done:

- Every number in the draft that cites a source was checked at the cited page,
  table or figure. Text layers were used where they are good; scanned pages
  were viewed as images (RM L54G14 pp. 1, 4, 7, 8, 10; RM A53D02 fig. 1 and
  table I; TN D-4014 figs. 1 and 4; TR 1051 fig. 23; TR 1160 p. 120 and fig.
  13; Tucker slide 900).
- Every script that produced a cited number was read against its reference
  and re-run; outputs were diffed against the saved files (all identical).
  Van Driest II, the exact double-wedge drag and the linear 3D fin drag were
  re-implemented independently (different formulations) and compared.
- The figures of plan step B1 were read a second time before the first
  agent's readings were opened (one exception, recorded in section 4.0).
- The draft's conclusions were tested against the evidence, including two
  sources the draft cites but did not read in full (TN D-4014 fig. 4; TR 1051
  fig. 23(b) at the M 1.5 end).

## 0. Verdict in brief

The computational work is sound: every script reproduces its saved output,
and the three independent re-implementations agree with the first agent's
codes (van Driest II to 4e-7 against the TMR file, including cold walls;
exact double wedge to 3 decimals; linear 3D fin drag to 0.5% by a different
method, the supersonic area rule). The source citations are, with a few small
exceptions, accurate to the page.

The problems are in three places: (1) the TN 3819 fig. 18 curve readings,
which in several places read symbol outlines or Gabeaud's line instead of the
two compiled curves (errors of 0.004 to 0.009 in P_B against a stated
+-0.002), and which move the base-scatter statements; (2) the TN D-4014
fig. 6(b) calibration (config 2 fins-on values 0.0035 low) and an unstated
reading convention for the triangle symbols (0.003 to 0.006); (3) the
conclusions of sections 4.3, 6.2 and 6.4, of which two are contradicted or
not supported by the draft's own sources: the fin shortfall "points to the
base" (TN D-4014 fig. 4, which the draft did not digitise, shows the
chamber force changing by about a third of the shortfall at M 1.5), and the
first-release claims rest on hold-out cases that section 6.4 itself says
cannot be claimed.

## 1. Discrepancies, ranked by how much they matter

### High (change a conclusion or a gate)

H1. **The validation set lies outside the envelope the draft would claim.**
Section 6.4 "could claim" total Cd for "slender, cylindrical-afterbody,
finned rockets inside the envelope of the validation set" and "agreement with
the ARCAS wind-tunnel and RM A53D02 free-flight totals". But by the draft's
own "could not claim" list and B3/B4 refusals:
- ARCAS (TN D-4014) has a boat-tail ending in a reflexed lip (B3: "boat-tails
  refused"), fins whose trailing edges end 0.27 in ahead of the base (B3:
  "fins ending within one chord of the base ... refused" unless the TN 2360
  band is carried), and its CA includes a sting-affected base whose sting is
  not described in TN D-4014 at all (I searched the text: only "sting
  support"; TN D-4013's sting, d/h 0.68, is a different test).
- RM A53D02 has fins with subsonic leading edges for all M below 3.16
  (beta cot 71.6 deg below 1), which 6.4 excludes ("highly swept fins with
  subsonic leading edges"), blunt fin trailing edges at the base, and natural
  transition at R_T about 1.6e6 on bodies with R 1.5e6 to 4.9e6, so most of
  its friction is set by the transition input, which 6.4 also excludes
  ("predicted natural transition"). Its "agreement within those bands" would
  only test the tool when fed the report's own observed transition.
- No case in the validation set is a cylindrical-afterbody finned body with
  fins clear of the base. The 6.4 claim has no hold-out inside it.

H2. **"The evidence points to the base" (sections 1 and 4.3) is not supported,
and the deciding evidence was not read.** TN D-4014 fig. 4(a) (PDF p. 23,
chamber axial-force coefficient, config 1) was "viewed, not digitised". A
rough single reading (mine, +-0.007, near alpha 0; calibration from the
0, .04, .08, .12 gridlines at y 831.4, 676.6, 521.4, 366.4 px for the fins-off
panel and 1608.6 to 1142.0 px for the dF = 0 panel): fins off, M 1.50 about
0.005, M 1.80 about 0.012, M 2.30 and 2.96 about 0.03; fins on (dF = 0), all
four Mach numbers clustered at about 0.03 to 0.04. So the fins raise the
chamber force by about 0.025 at M 1.5 and 0.02 at M 1.8, roughly 0.035 if
scaled to the whole base annulus (the 1.250 in rear-view diameter against the
1.470 in base), against shortfalls of 0.095 and 0.058. The base explains
roughly a third of the M 1.5 shortfall, not the bulk of it. TN D-4014 (p. 6)
also attributes the low fins-off chamber force at M 1.5 and 1.8 to the
reflexed lip, which the fins' thicker boundary layer masks: a model-specific
effect, not the Spahr and Dickey trailing-edge mechanism the draft invokes.
Unquantified candidates for the rest, none mentioned in 4.3: the No. 60
carborundum trip strip on each fin face (TN D-4014 p. 4), the fin leading-edge
radius (not given in fig. 1; RM A53D02 p. 15 shows a blunt edge doubling fin
wave drag), the anchors and root gaps. The 49% to 85% figures themselves are
right (my readings give 0.49, 0.56 to 0.58, 0.73 to 0.76, 0.84 to 0.86).

H3. **TN 3819 fig. 18 curve readings are wrong at several Mach numbers, and the
base-scatter statements move.** Comparison in section 4.4. At the data Mach
numbers 1.63, 1.94, 2.42 and 3.51, and at the round values 2.0 and 3.0, one or
both bounds of the first reading lie on symbol outlines (the arch and D
symbols at M 1.63 to 2.42, the diamond at 3.51) or on Gabeaud's line (M 3.0,
3.26), off by 0.004 to 0.009 against a stated +-0.002 (overlay:
`drag-audit/work/v_love_ov1.png`, `v_love_ov2.png`). Consequences in the
draft:
- Section 3.1 row 1: "-0.138 to -0.145 at M 2.0" should be -0.145 to -0.150;
  "-0.096 to -0.101 at M 3.0" should be -0.096 to -0.098 (Gabeaud -0.100).
  (The draft's -0.138 also disagrees with its own CSV, -0.139.)
- Data over curve, ratio of base drag: M 1.50 to 1.63, 0.86 to 1.04 (draft
  0.86 to 1.05); M 1.94 to 2.42, **0.91 to 1.00** (draft 0.935 to 1.056);
  M 2.68 to 3.51, 0.91 to 1.05 (draft 0.91 to 1.09). Section 3.3 becomes
  "-14% to +4%, -9% to 0%, -9% to +5%".
- OpenRocket's 0.25/M: 3.8% to 16.4% below the curves (draft 3.7% to 17.5%).
- Herrin and Dutton: the curves give 13% to 21% more base drag than the
  sting-free data at M 2.46 (draft 12% to 18%); p_b/p_inf of the curves 0.484
  to 0.495 (draft about 0.50).

H4. **The base band ignores a one-sided bias the evidence shows.** With the
corrected readings, all seven tunnel points at M 1.9 to 2.7 lie at or below
the compiled curves (0.91 to 1.00), and the sting-free Herrin and Dutton point
is 13% to 21% below. The compiled tunnel data are sting-supported, and TR 1051
fig. 23(b) shows turbulent base pressure falling (base drag rising) with sting
diameter. The draft cites both facts (3.2) but never connects them: the curve
is likely biased towards too much base drag for a free-flying rocket, by
something like 5% to 15% at M 2 to 2.5. A symmetric "+-15 to 20%" band about
the curve is about the right width but in the wrong place; either the band is
asymmetric or the bias is corrected and gated.

H5. **Gates measured on the data that set the bands (circular).** Section 6.1
requires "a band measured on validation data that were not used to tune it".
B2 states the friction band from TN 3097 and RM L54G14 and gates on the same
two; B3 states the base band from TN 3819 fig. 18 and Herrin and Dutton and
gates on the same. These gates pass by construction. Either hold some of the
data out (for example RM L52H21, TR 1160 body-alone, TN 3708 at turbulent
Reynolds numbers) or call B2/B3 "band estimation", not gates.

### Medium (a number or a claim outside its stated error)

M1. **TN D-4014 fig. 6(b) calibration.** The first reading took the 0.5 and
0.2 gridlines at y 1331 and 1669 px; those are their heights at x about 1400.
Page 37's horizontal lines tilt 5 px across the plot (0.5 line: 1336.0 at x
620 to 760, 1335.0 at 800 to 900, 1333.0 at 1000 to 1200, 1331.4 at 1300 to
1500, 1329.5 at 1600 to 1800); at alpha 0 (x 848) the 0.5 line is at 1334.9.
The config 2 fins-on values are therefore about 0.0035 low: M 1.80 0.505
(mine 0.5088), M 2.30 0.4097 (mine 0.4128), outside the stated +-0.002.
Config 2 increments become 0.140 and 0.087 (from 0.136 and 0.085).

M2. **Triangle symbols (M 2.96): unstated reading convention.** On every panel
the faired curve passes 4 to 7 px below the triangles' bounding-box centre
(page 25: curve 1529.0 px, box centre 1524.2; page 28: 1492.5 against 1488.1;
page 34: 1614.5 against 1610.4 to 1611.4; page 37: 1524.5 against 1517.7),
while circles, squares and diamonds sit on the curve within 1 to 3 px. The
first reading used box centres; I read the curve. The difference is 0.003 to
0.006 in CA (fig. 6(a) 0.269 against 0.2654; fig. 6(b) 0.335 against 0.3317,
or 0.3385 against 0.3317 once M1 is corrected), more than the stated +-0.003.
Increments are nearly unaffected (same symbol on and off). B1 must fix one
convention (I recommend the faired curve, which is what the authors drew) and
state +-0.004 for triangles until it is fixed.

M3. **TR 1051 fig. 23(b) at M 1.5.** My reading (300 dpi, gridlines -0.32,
-0.24, -0.16, -0.08, 0 at y 2156.5, 2353, 2550.6, 2744.7, 2937.6 px; d/h 0.2,
0.4, 0.6, 0.8 at x 423, 618, 818, 1015): from d/h 0.35 to 0.85, M 1.5 -0.176
to -0.237, M 2.0 -0.147 to -0.189, M 2.9 -0.118 to -0.143. The draft has
-0.185 at the M 1.5 start, so its "about 0.04 to 0.05 more negative at M 1.5
and 2.0" should read "about 0.06 at M 1.5 and 0.04 at M 2.0". Outside the
stated +-0.01 at one end; strengthens H4.

M4. **"Twelve tunnel points from ten sources" (3.1).** The first agent did
not assign symbols to references, and the legend of fig. 18 has eleven tunnel
entries in all. The twelve points at M 1.5 to 3.5 carry about seven of them
(by symbol shape: Ref. 9 circle; Ref. 2 teardrop, two points; Langley 9-inch
SST "D", two or three; Ref. 15 arch, two or three; Ref. 23 thin diamond;
Ref. 5 ticked triangle; Ref. 24 diamond). Say "twelve points, about seven
sources (assignment by symbol shape, provisional)".

M5. **The friction band's "opposite signs" (2.2) compares different theories
and wall conditions.** RM L54G14's +7% is against "Van Driest's theory" of
1950 (AL-997, probably Van Driest I) under "strong skin heating to strong skin
cooling" (summary, p. 1), not adiabatic VDII. Only TN 3097 is a like-for-like
VDII comparison, and its spread (3.5% to 11.7%) comes mostly from the assumed
Reynolds number and T0. "No correction to apply" is premature until VDII is
computed for the RM-10 trajectories. The +-11% width follows from the numbers
(0.895 to 1.07), but it is a statement of two biases, -10.5% and +7%, not of
scatter; at M 1.0 to 1.99 only RM-10 contributes.

M6. **Band arithmetic and the "+-15 to 20%" claim (6.3, 6.4).** The sum is
right: 0.50 x 11 + 0.30 x 15 + 0.15 x 50 + 0.05 x 0.1 = 17.5%. But it uses the
low end of every band; with base +-20% it is 19%; the friction band is "at
least" 11%. The fin term "+-50% of the fin increment" is not derived anywhere
and the evidence for it is one-sided (own drag alone under-predicts by 15% to
51%). The arithmetic supports "at least about +-18%", not "of order +-15 to
20%"; the 15 end is not supported.

### Low (wording, traceability, small numbers)

L1. OpenRocket friction "1.1 to 4.4% below VDII" (2.1): `friction_study.py`
compares the Cf law only. OpenRocket multiplies body wetted area by
1 + 1/(2 fB) (eq. 3.85; +2% at fB = 25), so its body friction drag is about
2.4% below to 0.9% above flat-plate VDII. Say "Cf law" or include the factor.

L2. RM L54G14 p. 7: the 1.5% applies to laminar flow "back to station 20" with
the average measured ahead of the rake at station 125 (models 1 to 5), not "of
146.5" (the body length).

L3. TN D-4014 fig. 6(c) caption reads "dF = -2 deg"; the list of figures says
2 deg (not used by the draft; note it in the transcription).

L4. Traceability: the tip-cone check of `finwave.py` has no saved script, and
tests 3 and 4 have no saved output ("runs logged in the session"). I
reproduced both (section 3.3); save them before B4 relies on them.

L5. RM A53D02 fig. 11 Mach numbers sit 0.02 to 0.03 below table I below M 2:
confirmed by my reading (1.036 against 1.06, 1.297 against 1.32 and so on);
still unexplained. Matters for B5 only near the drag peak.

L6. TN 3819 data Mach numbers: the first reading gives 1.52 for the two points
I read at 1.500 and 1.503, and 3.26 and 3.51 for points I read at 3.243 and
3.497 (its single linear Mach formula ignores the 15 px lean of the vertical
gridlines). No error was stated for M; state one (+-0.02).

L7. Section 4.1: "within 0.5% at M 1.3" for t/c 0.03 is 0.52% (1.0052 in my
independent run); "+1.5% at M 1.3" for t/c 0.05 is 1.55%. Rounding only.

L8. ARCAS transcription omits three drawn items that will matter when the fin
and base are modelled: the fin root cut-out near the trailing edge (0.375
(0.952), 15 deg line, 0.120 (0.305) R), the trip line drawn 0.500 (1.270) aft
of the fin leading edge, and the meaning of the 1.250 (3.175) rear-view
diameter (most likely the base cavity, needed to convert fig. 4's chamber
coefficient to a base force).

## 2. Cited numbers checked against their sources

Verified means the number, the quote and the page agree. Only exceptions are
discussed at length; they are also in section 1.

| Draft claim | Source as cited | Result |
| --- | --- | --- |
| Shares 3 to 10%, 40 to 60%, 15 to 40%, 2 to 35% | 0002 section 1 table | Verified (repo `docs/design/0002-architecture.md` lines 20 to 23) |
| Wedge wall pressure 0.015% on 60 x 30, shared reconstruction | 0003 | Verified (0003 table, "Shared" column) |
| `fitted-flow.ts` sets `geometry: 'axisymmetric'`; blunt grid axisymmetric | repo source | Verified (fitted-flow.ts line 66; blunt-grid.ts header) |
| sources.md implies OpenRocket 24.12 | repo | Verified (sources.md line 105) |
| VDII matches TMR within 2.4e-7 | `vd2.py`, TMR file | Verified (2.41e-7, M 2 zone); my independent code: 1.9e-7 to 3.6e-7 on all four zones |
| RM A53D02 second friction method within 3% below M 7.2 | p. 10, fig. 8 | Verified ("agree within 3 percent below M = 7.2 and within 8 percent above") |
| TN 3097: +4% from L/D 8 to 23 subsonic; theories +1.5% and +15% | pp. 17 to 18 | Verified (p. 18) |
| OpenRocket Cf law and corrections, eqs. 3.78 to 3.85 | techdoc pp. 43 to 46 | Verified; see L1 for the comparison |
| RASAero transition at flat-plate Re 5e5; sand roughness input | manual pp. 52, 55 | Verified |
| CFL3D SA 2.0% below to 0.3% above VDII, M 2, Re_theta 4000 to 13000 | TMR files, `sa_vs_vd.py` | Verified (0.9802 to 1.0030; file header "CFL3D, SA model") |
| RM-10 flight: 7% above Van Driest; +-5% holds 66%; between models; earlier models up to 25% above; roughness under 60 microinches except joints | RM L54G14 pp. 4, 7, 10 | Verified (p. 1 summary, p. 4, p. 7, p. 10); omits "strong skin heating to strong skin cooling" (M5) |
| Cylinders: VDII 3.5 to 11.7% above measured ratio | TN 3097 table III (p. 33), `ck_compare.py` | Verified (table transcription correct, both columns; rerun identical; my code identical) |
| Flat plates: data sets differ up to 15%; balances +-2 to 3% | TN D-2896 pp. 1, 6 | Verified ("differences ... amount to 15 percent between references 2 and 3"; "differ from the average by from +-2 percent to 3 percent") |
| Incompressible laws "+-5 percent from a mean" | TN 3097 p. 25 | Verified ("only the order of +-5 percent from a mean") |
| Hopkins and Inouye found VDII most satisfactory, M 1.5 to 9 | TN D-6945 p. 1 | Verified (introduction) |
| 0.895 to 1.07 | arithmetic | Verified (1/1.117 = 0.895); see M5 |
| R_T about 1.6e6, "low in comparison with usual wind tunnel and free-flight experience" | RM A53D02 p. 13 | Verified |
| Body friction about fourfold, laminar to turbulent, low M | RM A53D02 p. 8 | Verified |
| Laminar run to station 20 lowers average 1.5% | RM L54G14 p. 7 | Verified; see L2 |
| Artificial transition raises base pressure 5 to 10% | TN 3819 p. 15 | Verified |
| Transition and roughness rows (friction study) | `friction_study.py` | Verified (rerun identical; OR equations coded as in techdoc) |
| Roughness labels 5 um "optimum paint-sprayed", 20 um "paint in aircraft mass production" | techdoc table 3.2 | Verified (cites [15, p. 5-3]) |
| TN 3097 "no significant effect ... of small changes in pressure gradient" | summary | Verified |
| Love curves and twelve-point ratios | TN 3819 fig. 18 | **Not verified**: see H3, M4 |
| Chapman's (L/h) R^(-1/5) questionable; "L/h is by far the predominant factor" | TN 3819 p. 15 | Verified |
| Love's method "fair predictions" | TN 3819 summary | Verified |
| OpenRocket 0.25/M, 3.7 to 17.5% below | techdoc eq. 3.94 (p. 50), `base_conversions.py` | Equation verified; percentages move to 3.8 to 16.4% (H3) |
| Herrin and Dutton p_b/p_inf 0.553 to 0.575; k-epsilon +14% and +39% | Tucker slide 900 (PDF p. 22) | Verified as visual readings (data circles 0.55 to 0.58; standard k-epsilon 0.38 outboard to 0.46 on axis; extended 0.48 to 0.61) |
| Curve 12 to 18% more base drag than H&D | computed | 13 to 21% with corrected curves (H3) |
| TN 2360: +70% at M 1.5, +35% at M 2.0; near zero one chord fore or aft; 5% thick about half | TN 2360 summary | Verified |
| "All the wind-tunnel base pressures for the body with fins are lower than the free-flight results" | TN 3819 p. 23 | Verified |
| Sting effect 0.04 to 0.05 at M 1.5 and 2.0, 0.02 at M 2.9; length beyond 3 diameters no effect at d/h 0.3 | TR 1051 figs. 22, 23(b) | M 2.0 and 2.9 verified within +-0.01; M 1.5 is about 0.06 (M3); fig. 22 statement verified from p. 19 text |
| ARCAS sting d/h 0.68 (TN D-4013) | TN D-4013 p. 4, TN D-4014 fig. 1 | Verified (2.54/3.734) |
| RM A53D02 bucket (0.446 to 0.494), base drag, transition and fin shocks | pp. 11, 14 | Verified |
| RM-10 small flight models' base drag "low for some as yet unknown reason" | TR 1160 p. 120, fig. 13 | Quote verified; fig. 13 values plausible at the resolution of the figure (visual +-0.005 not re-read in detail) |
| Exact double wedge against Ackeret | `section2d.py` | Verified, and independently (section 3.2) |
| Busemann equals Ackeret for a symmetric double wedge | derivation | Verified (the second-order terms of front and rear faces carry opposite slopes and cancel) |
| Square leading edge 4.6 to 41 times | `blunt_le.py` | Verified (Rayleigh pitot formula correct; rerun identical) |
| Blunt fin leading edge +0.02, about 100% of fin wave drag; bevel almost no change | RM A53D02 p. 15 | Verified |
| OpenRocket fin pressure drag (LE as cylinder times cos^2, TE as base) | techdoc pp. 49 to 50 | Verified |
| Strip-theory table and the 6%, 20%, -58% to +10%, factor 2.4 statements | `fin_cases.py` results | Verified (all 32 entries match the JSON; rerun identical); independently confirmed (section 3.3) |
| Rectangle span/chord 0.2: 0.65 at M 1.2 | `finwave.py` | Verified (0.653; my area-rule code 0.654) |
| ARCAS own drag 0.093, 0.079, 0.066, 0.056; ratios 0.49 to 0.85 | `arcas_fin_check.py` | Verified (rerun identical); conclusion drawn from it: H2 |
| TN D-4014 reports fins changing chamber force at M 1.5, 1.8 | p. 6 | Verified as a reading of the text; the report's mechanism is the reflexed lip (H2) |
| RM A53D02 neglected interference | p. 8 | Verified ("interference between adjacent wing panels ... ignored"; carry-over only below M 1.5) |
| TN D-4014: L/d 18.20 and 23.77; 9.84e6 per m; No. 60 trip; CA +-0.004; M +-0.015; not corrected to free-stream at base | pp. 3 to 5, test-conditions table | Verified |
| TN D-4013: sting 2.54 cm, 29.21 cm, 19.2 deg flare; 9.8e6 per m; No. 120 trip; CA +-0.004; Cp,b +-0.01; anchors on short model, balsa on long | pp. 3 to 5 | Verified |
| RM A53D02: geometry, R 1.5e6 to 4.9e6, scatter < +-2% at M 2, systematic < 1%, alpha correction 2.5% for most rounds | pp. 4, 6 to 7, table I | Verified (table I transcription correct row by row, M 1.06 to 3.99); "2.5%" holds for every round used (largest correction 6.8% at M 3.29, so +-1.7%) |
| Stoney: 177 models; CD +-0.01, M +-0.01 from identical models | TR R-100 pp. 2 to 3 | Verified |
| TN D-3588 is Peterson and Monta 1966 | NTRS 19660027862 | Verified (cover reads NASA TN D-3588) |
| Band sum about +-18% | arithmetic | Verified (17.5%); see M6 |

## 3. Scripts

All re-run under `nice`, outputs diffed against the saved files: `vd2.py`,
`sa_vs_vd.py`, `ck_compare.py`, `friction_study.py`, `section2d.py`,
`blunt_le.py`, `base_conversions.py`, `arcas_fin_check.py`, `fin_cases.py`
(run on copies in `drag-audit/work/finrun/` so that the first agent's JSON
was not overwritten; the new JSON is identical), `fin_validate.py`,
`fin_rect.py` (matches the section-drag values quoted in
`fin_computations.md`). All identical.

### 3.1 Van Driest II with Karman-Schoenherr (`vd2.py`)

Formula check: Fc = (Taw/Te - 1)/(asin A + asin B)^2 with
A = (2a^2 - b)/sqrt(b^2 + 4a^2), B = b/sqrt(b^2 + 4a^2),
a^2 = r (g - 1)/2 M^2 Te/Tw, b = Taw/Tw - 1; F_theta = mu_e/mu_w (Sutherland,
110.4 K); F_x = F_theta/Fc; average CF = CF_KS(F_x Re)/Fc; Karman-Schoenherr
0.242/sqrt(CF) = log10(Re CF); local fit 1/(17.08 L^2 + 25.11 L + 6.012).
All correct (Hopkins TN D-6945 form). Limitation, not an error: the self-check
uses only the adiabatic M 2 zone.

Independent check (`drag-audit/scripts/vd2_indep.py`): Fc from midpoint
quadrature of the Crocco-Busemann density profile, Fc = 1/[int sqrt(rho/rho_e)
dU]^2, rather than the arcsin closed form; Karman-Schoenherr by bisection.
Against the TMR file: M 2 adiabatic 1.9e-7; M 5 with Tw/Taw 0.2, 0.5, 1.0:
3.6e-7, 3.2e-7, 2.6e-7. It reproduces `ck_compare.py` exactly (+3.6% to
+11.7%; measured/VDII 0.895 to 0.966).

### 3.2 Exact shock-expansion against Ackeret (`section2d.py`)

theta-beta-M relation, normal-shock jumps, M2 = Mn2/sin(beta - theta),
Prandtl-Meyer turn of 2 theta at the ridge, cd = (Cp_front - Cp_rear) t/c,
Ackeret 4 (t/c)^2/beta: all correct. Independent check
(`drag-audit/scripts/dw_exact_indep.py`: weak root of the cubic in
sin^2 beta, Newton inversion of Prandtl-Meyer): t/c 0.03: 1.0175, 1.0052,
1.0013, 1.0004, 1.0006, 1.0011 at M 1.2, 1.3, 1.5, 2, 2.5, 3; t/c 0.05:
1.0609, 1.0155, 1.0036, 1.0011, 1.0017, 1.0029; t/c 0.08: detached, 1.0480,
1.0096, 1.0028, 1.0043, 1.0071. Same as the draft to its 3 decimals.

### 3.3 Linear supersonic source-sheet fin drag (`finwave.py`) and its checks

Formulation: phi = -(1/pi) int int lambda/sqrt((x - xi)^2 - beta^2 (y - eta)^2)
over the forward Mach cone; the chordwise integral of a constant-slope segment
done analytically (u kernel 1/sqrt(d^2 - B^2) for d > B, zero otherwise, which
is the correct derivative of the arccosh form); Cp = -2u; CD = (2/S) int int
Cp lambda; strip reference (4/(beta S)) int int lambda^2; image fin by
|eta| in the breakpoint lines. All correct. Planform and breakpoint geometry
of the eight cases checked (tip chords, tapers and sweeps as stated).

The four analytic checks are genuine analytic results and the code passes
them:
1. 2D limit: 1.000000 (rerun).
2. Infinite swept wing, supersonic edges, 4 (t/c)^2 cos L/sqrt(M^2 cos^2 L - 1):
   correct formula (normal-flow Ackeret with streamwise slope); 1.000000
   (rerun).
3. Subsonic-edge infinite swept wing, zero drag: rerun -0.000007 to +0.000001.
4. Tip cone of a constant-slope sheet, Cp/Cp_2D = 1/2 + asin(beta (s - y)/x)/pi:
   formula derived correctly (integral of 1/sqrt(x^2 - beta^2 (y - eta)^2) up
   to the tip); no script saved (L4); my own test (`work/tipcone.py`) agrees
   to 7 digits at 6 points, M 1.5 and 2.

Independent method (`drag-audit/scripts/hayes_fin.py`): the supersonic area
rule (Hayes; Lomax and Heaslet), averaging von Karman drags of oblique Mach
cuts of the fin plus image, with S'(x) computed exactly from the segment
lines. It converges slowly (log singularity of cuts parallel to the unswept
trailing edge), so two resolutions were extrapolated. Ratios 3D/strip, area
rule against `finwave.py`: ARCAS 1.024 / 1.024 (M 1.2), 1.058 / 1.056 (1.5),
1.027 / 1.031 (2.0), 1.017 / 1.012 (3.0); RM A53D02 planform 0.421 / 0.421
(1.2), 0.893 / 0.894 (2.0); swept trailing edge 1.196 / 1.195 (1.5);
clipped delta G 1.104 / 1.103 (1.5), 1.017 / 1.017 (3.0); trapezoid 1.100 /
1.100 (1.2); rectangle s/c 0.2 0.654 / 0.653 (1.2); unit rectangle converging
to 1.000 (0.976, 0.988, 0.994 with resolution). Agreement within 0.5%
everywhere: the strip-theory table is confirmed.

Caveat worth a line in the draft: a plane wall is a coarse stand-in for the
ARCAS body (body radius 1.125 in against fin span 2.103 in).

### 3.4 ARCAS fin check, base conversions, friction study

`arcas_fin_check.py`: geometry (S = 5.831 in^2, A_ref = 3.976 in^2,
t/c 0.0444, ridge 0.536 c), Re 9.84e6 per m and T0 339 K match TN D-4014; four
fins, both faces: correct. Friction is fully turbulent from the leading edge
at the mean geometric chord (an upper estimate, since the trip is 0.5 in aft
and the root runs in the body boundary layer), which makes the shortfall a
lower bound. Trip-strip drag is not included.

`base_conversions.py`: CD_base = -(p_b/p_inf - 1) 2/(g M^2) correct; the
Love inputs need the corrected curve values (H3).

`friction_study.py`: OpenRocket eqs. 3.78 to 3.84 coded as in the techdoc,
including the rule that the corrected roughness value is not used below the
smooth one; the laminar-then-turbulent virtual-origin procedure is correct;
laminar CF is incompressible Blasius (a 5 to 10% effect on the laminar part at
M 3, negligible on the totals quoted).

## 4. Figure readings (plan step B1, second reading)

Method notes and CSVs are in `drag-audit/readings/`. Summary of method: PDF
pages rendered at 300 dpi (the native resolution of every scan used);
gridlines located by row and column darkness profiles in two bands per axis,
labelled ticks identified on zoom views (at least two per axis, usually all
labelled lines); skew and shear handled by interpolating each gridline
between its bands; symbols centred on 3x to 9x zoom views with a pixel grid
overlay, cross-checked by ring-template detection for circles; faired curves
by column or narrow-band row profiles.

### 4.0 Independence

All four figures were read before the first agent's readings were opened,
with one partial exception: a header listing of its CSVs showed the first
agent's fig. 18 calibration constants and kinds of quantity read (not its
values), and the M column of `rm-a53d02_cd.csv` (not its CD values) after my
fig. 11 point readings were complete. No reading was changed afterwards.

### 4.1 TN D-4014 figs. 5 and 6, CA at alpha 0

| Panel | M | First | Mine | Diff | First's error | Mine | Note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 5(a) off | 1.50 | 0.3475 | 0.3461 | +0.0014 | 0.002 | 0.0020 | |
| 5(a) off | 1.80 | 0.3334 | 0.3320 | +0.0014 | 0.002 | 0.0020 | |
| 5(a) off | 2.30 | 0.2900 | 0.2899 | +0.0001 | 0.002 | 0.0020 | |
| 5(a) off | 2.96 | 0.242 | 0.2394 | +0.0026 | 0.003 | 0.0022 | triangle (M2) |
| 5(b) dF 0 | 1.50 | 0.5355 | 0.5342 | +0.0013 | 0.002 | 0.0013 | |
| 5(b) dF 0 | 1.80 | 0.4707 | 0.4691 | +0.0016 | 0.002 | 0.0013 | |
| 5(b) dF 0 | 2.30 | 0.382 | 0.3798 | +0.0022 | 0.002 | 0.0025 | diamond centre 0.3820 |
| 5(b) dF 0 | 2.96 | 0.308 | 0.3046 | +0.0034 | 0.003 | 0.0015 | triangle (M2) |
| 6(a) off | 1.80 | 0.369 | 0.3683 | +0.0007 | 0.002 | 0.0013 | |
| 6(a) off | 2.30 | 0.3245 | 0.3256 | -0.0011 | 0.002 | 0.0015 | |
| 6(a) off | 2.96 | 0.269 | 0.2654 | +0.0036 | 0.003 | 0.0015 | triangle (M2) |
| 6(b) dF 0 | 1.80 | 0.505 | 0.5088 | -0.0038 | 0.002 | 0.0013 | calibration (M1) |
| 6(b) dF 0 | 2.30 | 0.4097 | 0.4128 | -0.0031 | 0.002 | 0.0018 | calibration (M1) |
| 6(b) dF 0 | 2.96 | 0.335 | 0.3317 | +0.0033 | 0.003 | 0.0015 | triangle and calibration |

Six of fourteen differ by more than the first reading's stated error; four by
more than the two errors combined in quadrature. All are explained (M1, M2);
the remaining small systematic +0.0014 on pages 25 and 28 comes from the
horizontal-line tilt (I applied -1 px on page 28; page 25 has no lines near
alpha 0, so both readings carry about +-2 px there). Increments, mine against
first: config 1 0.188/0.188, 0.137/0.137, 0.090/0.092, 0.065/0.066; config 2
0.141/0.136, 0.087/0.085, 0.066/0.066.

### 4.2 TN D-4013 figs. 11 and 12

| Fig, curve | M | CA,corr first / mine | CA,b first / mine |
| --- | --- | --- | --- |
| 11, dF 0 | 1.00 | 0.685 / 0.6832 | 0.015 / 0.0142 |
| 11, fins off | 1.00 | 0.421 / 0.4180 | -0.023 / -0.0217 |
| 11, dF 0 | 1.20 | 0.592 / 0.5897 | 0.043 / 0.0427 |
| 11, fins off | 1.20 | 0.430 / 0.4290 | 0.026 / 0.0271 |
| 12, dF 0 | 1.00 | 0.728 / 0.7255 | 0.012 / 0.0114 |
| 12, fins off | 1.00 | 0.372 / 0.3689 | -0.029 / -0.0287 |
| 12, dF 0 | 1.20 | 0.624 / 0.6227 | 0.026 / 0.0261 |
| 12, fins off | 1.20 | 0.422 / 0.4221 | -0.043 / -0.0431 |

All sixteen agree within the first reading's stated errors (largest
difference 0.0031 against +-0.006). Both readings found the same 9 to 10 px
shear on page 62 and used the local zero line.

### 4.3 RM A53D02 fig. 11

| M first / mine | CD first / mine |
| --- | --- |
| 1.038 / 1.036 | 0.538 / 0.5374 |
| 1.292 / 1.297 | 0.514 / 0.5137 |
| 1.430 / 1.436 | 0.459 / 0.4595 |
| 1.452 / 1.454 | 0.476 / 0.4761 |
| 1.506 / 1.508 | 0.494 / 0.4938 |
| 1.561 / 1.554 | 0.458 / 0.4577 |
| 1.561 / 1.561 | 0.446 / 0.4464 |
| 1.933 / 1.935 | 0.447 / 0.4474 |
| 2.098 / 2.099 | 0.425 / 0.4253 |
| 2.303 / 2.304 | 0.391 / 0.3909 |
| 2.552 / 2.553 | 0.381 / 0.3805 |
| 2.909 / 2.906 | 0.324 / 0.3243 |
| 3.296 / 3.290 | 0.298 / 0.2985 |

All thirteen within 0.0006 in CD and 0.007 in M (stated +-0.0005 and
+-0.005 first; mine +-0.0009 to 0.0016 and +-0.011 to 0.018). Agreed. My CSV
also has the 18 other symbols (M 0.6 to 10) and the faired curve.

### 4.4 TN 3819 fig. 18

Data points (P_B): all twelve agree within the first reading's +-0.003
(largest difference 0.0027 at the M 1.5 circle); Mach numbers differ by up to
0.02 (L6). My CSV also has the seven points above M 3.5.

Curves (more negative / less negative bound), first against mine, with
Gabeaud where it matters:

| M | First | Mine | Outside +-0.002 |
| --- | --- | --- | --- |
| 1.50 | -0.177 / -0.173 | -0.1775 / -0.1733 | no |
| 1.52 | -0.177 / -0.170 | -0.1766 / -0.1723 | marginal (0.0023) |
| 1.63 | -0.170 / -0.162 | -0.1717 / -0.1667 | yes (0.0047; -0.162 is the "D" symbol at y 1316) |
| 1.94 | -0.145 / -0.142 | -0.1536 / -0.1484 | yes (0.009, 0.006; both on the arch and "D" symbols) |
| 2.00 | -0.145 / -0.139 | -0.1496 / -0.1447 | yes (0.005, 0.006) |
| 2.42 | -0.123 / -0.117 | -0.1240 / -0.1213 | yes (0.0043; -0.117 is the "D" symbol at y 1454) |
| 2.50 | -0.118 / -0.116 | -0.1196 / -0.1172 | no |
| 2.68 | -0.112 / -0.108 | -0.1107 / -0.1088 | no |
| 3.00 | -0.101 / -0.096 | -0.0978 / -0.0964 (Gabeaud -0.1002) | yes (-0.101 is Gabeaud) |
| 3.26 | -0.091 / -0.088 | -0.0880 / -0.0876 (Gabeaud -0.0887) | marginal (0.003) |
| 3.51 | -0.085 / -0.082 | -0.0800 / -0.0800 (Gabeaud -0.0789) | yes (0.005; -0.085 is the diamond's top) |

Identification of the curves (method note): below M about 2.9 there are two
near-coincident lines that cross at M about 1.35; the "Compilation by
Chapman" leader touches the more negative one at M 2.3 and the "Basic curve"
leaders the less negative; Gabeaud's steeper line joins them at M about 3.1;
from M 3.3 three lines run within 0.004 of each other and the lowest,
lightest one (continuing Gabeaud's slope) was taken to be Gabeaud. The
calibration was checked against the drawn vacuum curve, -1/(0.7 M^2):
residuals -0.0010 to +0.0004 over M 3.0 to 7.7.

## 5. The draft's conclusions

| Conclusion | Verdict |
| --- | --- |
| Data disagree at 5 to 20% for friction and base (section 1) | Supported (TN D-2896 15%; TN 3097 against RM-10 about 17% apart; H&D 13 to 21% from the curve) |
| Friction model-form band at least +-11% (2.2) | Width follows from the numbers; "opposite signs, no correction" is premature (M5); it describes two biases, not scatter; M 1 to 2 rests on RM-10 alone. Keep "at least", add these caveats |
| A boundary-layer method changes total friction 3% or less (2.4) | Reasonable inference, correctly labelled as one |
| Base band +-15 to 20% (3.3) | Width roughly supported after correcting the readings (-14% to +5% tunnel, 13 to 21% sting-free); the band is centred on a curve that the evidence suggests is biased high at M 2 to 2.5 (H4); the scatter numbers quoted need the H3 corrections |
| Fins ending near the base: no validated correlation, band or refuse (3.3) | Supported |
| Below M 1.5 not claimable (3.3) | Supported |
| Exact 2D within 1% of Ackeret at M 1.5 and above for sharp symmetric sections (4.1) | Supported (independently reproduced) |
| Strip-theory error table and its summary (4.2) | Supported (independently reproduced within 0.5%) |
| Fins' own drag 49% to 85% of the measured increment (4.3) | Numbers supported, robust to the reading (my increments give 0.49 to 0.86) |
| "The rest is interference and hardware; the evidence points to the base" (1, 4.3) | Overstated: fig. 4 indicates the base change is about a third of the shortfall at M 1.5; the report's mechanism is the reflexed lip; trip grit, leading-edge radius and anchors are not considered (H2). Say "partly base (about a third at M 1.5, from fig. 4, to be digitised); the rest unexplained" |
| Fins must be validated against increments or totals, never as isolated panels (4.3) | Supported |
| Band combination about +-18% (6.3) | Arithmetic right; "at least about +-18%" is what it supports; the fin +-50% term is not derived (M6) |
| Could claim: Cd at M 1.5 to 3 for cylindrical-afterbody finned rockets within +-15 to 20% | Overstated: no validation case lies in that envelope (H1); the low end 15% is not supported (M6) |
| Could claim: agreement with ARCAS and RM A53D02 totals | Contradicts the could-not-claim list and the B3/B4 refusals (H1); ARCAS carries sting interference of unknown size; RM A53D02 needs the observed transition as input |
| Could claim: breakdown with own bands | Supported as a plan |
| Could not claim: better than RASAero or OpenRocket; M 1 to 1.5; boat-tails, subsonic-edge fins, blunt edges, fins near base; transition, roughness, power-on | Supported; add "sting-free base drag" until H4 is resolved |
| B1 gate "readings agree within the stated reading error" | Fails today for 6 of 14 TN D-4014 values and for 6 of 11 TN 3819 curve ranges, 2 more marginal (section 4); passes for TN D-4013 and RM A53D02 |
| B2, B3 gates | Circular as written (H5) |

Missing from the draft altogether:

- TN D-4014's sting (size not stated) and its effect on the ARCAS CA totals,
  which are the main hold-out.
- The chamber-force figure, TN D-4014 fig. 4, which decides H2.
- A statement that RM A53D02's friction is mostly laminar at its Reynolds
  numbers (R 1.5e6 to 4.9e6 with R_T 1.6e6), so it tests the transition input
  more than the model-form band.

## 6. Geometry transcriptions

ARCAS (TN D-4014 fig. 1, PDF p. 10, read at 300 dpi): stations 0.000, 10.600
(26.924), 25.950 (65.913) moment centre, 37.300 (94.742), 40.950 (104.013) for
configuration 1; 0.000, 10.600, 35.500 (90.170), 49.850 (126.619), 53.500
(printed 195.890, should be 135.89) for configuration 2; nose tip 0.062 (0.157)
R; all ten ordinate pairs of the nose table (inch and cm columns consistent);
2.250 D (printed 5.815, should be 5.715); 1.840 (4.674) and 1.810 (4.597);
detail A: 0.030 (0.076) R, 15 deg, 90 deg, 0.031 (0.079), 0.060 (0.152) R,
0.053 (0.135) Ref, 1.470 D (3.734), 0.654 (1.661) R (Ref); rear view 1.250 D
(3.175); fin root 3.380 (8.585), tip 2.165 (5.499), span 2.103 (5.342), LE 30
deg, ridge 15 deg, 1.568 (3.983), thickness 0.150 (0.381) and 0.096 (0.244),
2.72 deg normal to the 15 deg line, 1.47 deg; anchor 2.165 (5.499), 0.500
(1.270), 0.035 (0.089), 15 deg, 1.088 (2.764), 0.220 (0.559), 0.330 (0.838),
0.360 (0.914), 1.125 (2.858) R, 1.225 (3.112) R and Ref. All transcribed
values verified; moment centres 63.37% and 66.36% and t/c 0.0444 verified by
arithmetic. Omissions: L8. The boat-tail profile needs the second reading the
draft already asks for.

RM A53D02 (fig. 1, PDF p. 23; text p. 4): 2.50 overall, 1.00 nose, 4 1/16 R,
0.250 body, 0.500 fin span tip to tip, root 0.75, tip 0.375, thickness 0.030
and 0.015, section A-A 20 deg asymmetric wedge normal to the LE, variants (b)
40 deg symmetric bevel and (c) blunt, base hole 3/16 diameter and 1.25 deep,
".016" unresolved. All verified. Aspect ratio: text 0.426, drawing 0.444
(verified; the inconsistency is real). LE sweep atan 3 = 71.57 deg verified.

## 7. Before the draft goes in

1. Re-read the TN 3819 fig. 18 curves at the data Mach numbers on the lines
   themselves (an overlay check like `work/v_love_ov1.png` catches symbol
   pickups), restate 3.1 and 3.3, the OpenRocket and Herrin and Dutton
   comparisons, and fix "ten sources".
2. Recalibrate TN D-4014 page 37 with local gridlines; adopt and state a
   convention for triangle symbols; restate the config 2 increments.
3. Digitise TN D-4014 fig. 4 (both configurations) and rewrite 4.3 and
   section 1's second finding from it.
4. Rewrite 6.4 so that every "could claim" item has a hold-out inside its
   envelope, or say that the first release has none for finned bodies; move
   ARCAS and RM A53D02 to "reported, with the listed confounders" unless the
   boat-tail, fins-near-base and subsonic-edge refusals are lifted with bands.
5. Make B2 and B3 hold data out, or call them band estimation.
6. Treat the base band as possibly biased (sting) and add a sting-free gate
   before claiming base drag for free flight.
7. Save the tip-cone and subsonic-edge checks as scripts with outputs.

## Files

- Audit: `drag-audit/audit.md` (this file).
- Readings: `drag-audit/readings/tn-d-4014_figs5-6_CA_alpha0.csv`,
  `tn-d-4013_figs11-12.csv`, `rm-a53d02_fig11_points.csv`,
  `rm-a53d02_fig11_curve.csv`, `tn3819_fig18.csv`, and one `method_*.md`
  per figure.
- Scripts: `drag-audit/scripts/` (`grid.py`, `lines.py`, `lines2.py`,
  `view.py`, `curve.py`, `bandprof.py`, `circles*.py`, `cdots.py`,
  `scan18.py`, `overlay18.py`, `labels.py`, `read_a53_fig11.py`,
  `read_tn3819_fig18.py`, `vd2_indep.py`, `dw_exact_indep.py`,
  `hayes_fin.py`); runs and images in `drag-audit/work/`.
