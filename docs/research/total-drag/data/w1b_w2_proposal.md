# After W1: moderately swept fins at the base, and the base below Mach 1.5

Research for the two largest blockers W1's coverage run left (0015
section 8): fins at the base with the leading edge swept 0 to 45 deg, and
W2 of 0014 (the body base below Mach 1.5, with W1's part there). Nothing
here is implemented. It proposes methods and bands for the coordinator and
the owner to decide on, and names one new source for registration (0014
section 10.1, rule 2). The coverage figures are from
`docs/research/refusals/w1b-w2-probe.test.ts` (`out/w1b-w2-probe.out`),
on the cases of 0014's population run.

## The rules this work followed

- No held-back set was opened (TN 3697 fig. 5, TN 3650 fig. 4, RM L52E06
  figs. 9 to 12, BRL Report 934, the Eglin set, TN 3320), and nothing in
  `docs/research/total-drag/audit/round6/` was looked for or opened.
  For RM L52E06's fin geometry a keyword search of the text of its first
  six PDF pages was made; it showed the opening line of the drag section
  (which figure holds which data, no values), where reading stopped. Its
  PDF pages 18 to 20 were not rendered.
- Values were taken only from figures 0014 section 10.1 names as
  band-setting, and from NSWCDD/TR-92/509, proposed below for naming. The
  figures were read by eye at planning precision (as 0014 section 5 did);
  each value proposed for a band is listed with the readings it still
  needs (section 3).
- NSWCDD/TR-92/509's reference 26 (Butler, Sears and Pellas, AFATL-TR-77-8,
  an Eglin report on finless tangent-ogive cylinders) is not the
  registered Eglin set, but it was not opened: it has no fins and is not
  needed.

## 1. Fins at the base with the leading edge swept 0 to 45 deg

### 1.1 What was searched

| Source                                                                                         | What it has on sweep at the base                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TN 3819 figs. 32 to 35 and text pp. 20 to 23 (registered)                                      | Unswept fins (figs. 32, 33, 35); the RM-10, 60 deg (fig. 34); RM L52J21a's 45 deg cited (its ref. 17). Nothing between 0 and 45                                                                                                                          |
| RM L52J21a (registered)                                                                        | One fin set only, 45 deg (leading and trailing edges), 8% arcs; its other configurations are nose and base shapes with the same fins (fig. 39: base A of the parabolic body). More at 45 deg, nothing between                                            |
| TN 2360 (registered)                                                                           | Unswept only                                                                                                                                                                                                                                             |
| NSWCDD/TR-92/509 (Moore, Wilcox and Hymer 1992; DTIC ADA258753; the empirical base-drag model of the NSWC aeroprediction code). **Not registered: proposed below** | Four clipped-delta fins with the leading edge swept 43.9 deg and the trailing edge unswept, at the base and one and two chords ahead, t/c 0.05, 0.10, 0.15, tunnel, M 2.0 to 4.5, tabulated base drag (Table 2). The only measurement found between 0 and 45 deg |
| Heyser, Maurer and Oberdorffer, AGARD CP-10 (1966), pp. 263 to 290                             | Tail surfaces and angle of attack on base pressure, supersonic; TR-92/509 used it for thickness effects. Not online (library holdings only); whether it varies sweep is not known                                                                        |
| NASA Langley Tri-Service missile data base (TR-92/509's ref. 25)                               | Base pressures with several tail planforms; TR-92/509 judged their accuracy below its needs. Not opened                                                                                                                                                  |
| DATCOM                                                                                         | Not opened. The fins-at-the-base sources that the codes found here cite are TN 2360, Heyser et al. and TR-92/509                                                                                                                                         |

### 1.2 NSWCDD/TR-92/509 (DTIC ADA258753)

- **Model** (pp. 3 to 9, fig. 4): ogive-cylinder 5.0 in diameter, 36 in
  long, supported by a swept vertical strut from the upper surface near
  mid-body (no sting; the strut's Mach lines cross the axis at least 1.5
  diameters behind the base at the lowest Mach number). Four cruciform
  fins in plus orientation: root chord 4.00 in, tip chord 1.50 in,
  semispan 2.60 in, so the leading edge is swept atan(2.50 / 2.60) = 43.9
  deg and the trailing edge is unswept; aspect ratio 1.82; double-wedge
  sections with sharp edges, the ridge at mid-chord, t/c 0.05, 0.10 and
  0.15. 89 base orifices on 7 radii, area-weighted.
- **Test** (pp. 9 to 10): NASA Langley Unitary Plan tunnel, M 2.0 to 4.5,
  transition grit on the nose and on every fin leading edge (turbulent).
  Base drag coefficients "estimated to have an uncertainty of
  approximately +-5 percent of the calculated values" (p. 10).
- **Table 1** (p. 11): configuration 1 is the body alone; 2 to 10 the
  three thicknesses at fin deflections 0, 10 and 20 deg with the fins at
  the base; 11 to 13 one chord ahead; 14 to 16 two chords ahead. The
  table's x/c columns read 0.5, 1.5 and 2.5, the text's 0, 1.0 and 2.0
  (x from the base to the trailing edge, p. 2; the figure titles of
  configurations 2 to 10 say x/c = 0, of 13 x/c = 1.0, of 14 to 16 x/c =
  2.0): the table measures to mid-chord. The text's convention is used.
- **Table 2** (pp. 12, 13): C_DB at each configuration, Mach number and
  angle of attack; the alpha = 0 rows are transcribed in
  `nswc_tr92_509_table2.csv` (first reading, from a 200 dpi render; the
  scan's text layer agrees wherever it is legible).
- **Not used:** its figs. 1 to 3, 5 and 7 (the code's empirical curves,
  built on TN 2360, Heyser et al., Hill and Alpher, AFATL-TR-77-8 and
  judgement), and its angle-of-attack and deflection data.

The body alone over Love's basic curve: 0.954 (M 2.0), 0.904 (2.5), 0.934
(3.0), inside the curve's band 0.82 to 1.08: the strut-supported body
reads as the compiled data do.

F = C_DB with fins over C_DB of the body alone, alpha 0, fins undeflected
(in brackets: each C_DB moved by its +-5%, toward the ends):

| t/c (double wedge) | x/c | M 2.0                 | M 2.5                 | M 3.0                 | M 3.5 | M 4.0 | M 4.5 |
| ------------------ | --- | --------------------- | --------------------- | --------------------- | ----- | ----- | ----- |
| 0.05               | 0   | 1.072 [0.970, 1.185]  | 1.094 [0.990, 1.210]  | 1.111 [1.005, 1.228]  | 1.050 | 1.031 | 1.019 |
| 0.10               | 0   | 1.145 [1.036, 1.265]  | 1.198 [1.084, 1.324]  | 1.200 [1.086, 1.326]  | 1.112 | 1.092 | 1.094 |
| 0.15               | 0   | 1.210 [1.095, 1.338]  | 1.283 [1.161, 1.418]  | 1.267 [1.146, 1.400]  | 1.150 | 1.123 | 1.094 |
| 0.05               | 1   | 1.000                 | 1.028                 | 1.000                 | 0.988 | 0.985 | 0.981 |
| 0.10               | 1   | 1.007                 | 1.066                 | 1.067                 | 1.038 | 1.031 | 1.019 |
| 0.15               | 1   | 1.022                 | 1.142                 | 1.144                 | 1.087 | 1.046 | 1.038 |
| 0.10               | 2   | 1.022                 | 1.057                 | 1.056                 | 1.025 | 1.015 | 1.019 |
| 0.15               | 2   | 1.036                 | 1.094                 | 1.111                 | 1.050 | 1.046 | 1.038 |

At the base the factor grows with thickness at every Mach number, nearly
in proportion at M 2.0 (increments 0.072, 0.145, 0.210), as TN 2360 and
TN 3819 fig. 33 found for unswept arcs.

### 1.3 Is the effect bracketed?

The rebuilt factor's swept bracket (0015 section 3.4) runs from the zero
member to the unswept member that bounds the section. A double wedge t/c
tau lies between the arcs tau / 2 and tau (0015 section 3.6); its
trailing-edge slope, tau per side, is that of the arc tau / 2.

| M   | Double wedge, 43.9 deg | F measured | Bracket served (zero member to upper member) | Unswept member of the same trailing-edge slope |
| --- | ---------------------- | ---------- | -------------------------------------------- | ---------------------------------------------- |
| 2.0 | t/c 0.05               | 1.072      | 0.951 to 1.328 (four fins t/c 0.05)          | between zero and t/c 0.05 (1.128 to 1.328)     |
| 2.0 | t/c 0.10               | 1.145      | 0.951 to 1.441 (the reference)               | t/c 0.05: 1.128 to 1.328                       |
| 2.0 | t/c 0.15               | 1.210      | refused (tauEq 0.15)                         | between t/c 0.05 and 0.10: 1.128 to 1.441      |
| 2.5 | t/c 0.05               | 1.094      | 0.951 to 1.465 (the reference)               | not measured at M 2.5                          |
| 2.5 | t/c 0.10               | 1.198      | 0.951 to 1.465                               | not measured at M 2.5                          |
| 3.0 | t/c 0.05               | 1.111      | 0.951 to 1.519                               | not measured at M 3.0                          |
| 3.0 | t/c 0.10               | 1.200      | 0.951 to 1.519                               | not measured at M 3.0                          |

- **Inside the bracket, with margin.** Every value at the base lies inside
  the bracket at M 2.0, 2.5 and 3.0, with its +-5% too (lowest 0.970,
  highest 1.326), and every nominal value lies below the low end of the
  unswept member that bounds it (1.128 at M 2.0 for 5%; 1.281, 1.254,
  1.295 for the reference). The 15% fins, which the factor refuses, lie
  below the reference too (1.210, 1.283, 1.267).
- **With the trailing-edge slope matched, the swept fins sit at or a little
  below the unswept ones.** At M 2.0 the 10% wedge (slope 0.10 per side,
  the 5% arc's) gives 1.145 against the 5% arc member's 1.128 to 1.328;
  the 15% wedge (0.15) gives 1.210, between the 5% and 10% arc members;
  the 5% wedge (0.05) 1.072, between the zero member and the 5% arc. The
  increment follows the trailing-edge slope (TN 2360's finding) and the
  sweep takes a little off, as TN 3819 p. 22 expects and as the 45 and 60
  deg sets show (0015 section 3.4).
- **Between 0 and 43.9 deg.** No fins at an intermediate sweep were found.
  For fins with an unswept trailing edge the geometry at the base does
  not change with the leading-edge sweep: the trailing edge, its slope and
  its sweep stay the same, and only the isobars ahead of it turn. On a
  straight-tapered fin the line at fraction s of the chord is swept at
  tan L(s) = (1 - s) tan L_LE; linear theory scales the pressure on a
  face behind such a line by sqrt(M^2 - 1) / sqrt(M^2 - sec^2 L(s)) over
  the unswept fin's. At L_LE = 43.9 deg the ridge of these double wedges
  (s = 0.5) is swept 25.8 deg, a factor 1.04 at M 2.0 (1.11 at M 1.5); at
  s = 0.75, 1.01 (1.02); at the trailing edge, 1. So the aft faces, whose
  slope TN 2360 ties the increment to, carry within 4% of the unswept
  fin's pressures at M 2.0 and above, and less at lighter sweeps; the
  forward faces change more (1.20 at 43.9 deg, M 2.0) and the measured
  43.9 deg fins still came out at or below the unswept ones. With both
  ends measured inside the bracket, a margin of at least 0.14 in F below
  its upper end (0.26 at the nominal values) and the field near the base
  nearly unchanged between them, a fin at an intermediate sweep lies
  inside it. This is the ordering 0015 section 3.4 found missing; it holds
  for unswept trailing edges at M 2.0 to 3.0 and for nothing else.
- **At M 1.5 to 2.0** no fins with an unswept trailing edge and a moderate
  sweep were found. The aft faces' factor grows to 1.11 at M 1.5 and the
  forward faces' to 1.98 (the 43.9 deg edge is near sonic, M cos L_LE =
  1.08); the 45 and 60 deg sets there (RM L52J21a from M 1.62, the RM-10
  from 1.49) have other planforms and lie inside the bracket, which is
  suggestive but not the ordering.
- **Swept trailing edges with the leading edge 0 to 45 deg** have RM
  L52J21a's 45/45 deg set only (M 1.62 to 2.41): one end, no ordering.

### 1.4 Proposals

| Proposal | Fins served | Mach | Evidence | Recommended |
| --- | --- | --- | --- | --- |
| **(1a)** | leading edge 0 to 45 deg with the trailing edge unswept (and 45 to 60 deg as now); the swept bracket unchanged, its label citing TR-92/509 | 2.0 to 3.0 | both ends measured, inside the bracket; the field near the base within 4% (1.3) | yes |
| (1b) | as (1a) | 1.5 to 3.0 | (1a), plus the 45 and 60 deg sets at M 1.49 to 2.41 | no: an extrapolation the owner could accept, not shown |
| (1c) | (1b) and trailing edges swept up to the leading edge | 1.5 to 3.0 | one 45/45 deg set | no |

The band is the swept bracket's (0015 section 3.6): for example a 2.4%
double wedge, three fins, 30 deg leading edge, unswept trailing edge, at M
2.5: zero member to the reference, F 0.951 to 1.465, half-width 21%, as
the same fins at 45 deg are served today.

**Registration (rule 2 of 0014 section 10.1), proposed:** NSWCDD/TR-92/509
Table 2 (its alpha = 0 rows with the fins undeflected) and Table 1 (the
configuration index) set the swept bracket's ordering for unswept trailing
edges; fig. 4 and the text's geometry describe the model; figs. 1 to 3, 5
and 7, the angle-of-attack and deflection data, and its references set
nothing. It is band-setting only if registered before use, and read twice
before it sets anything (rule 5): this record's transcription is the first
reading; a blind second transcription is needed.

**What would open the rest:** for (1b), base pressures with and without
fins of moderate sweep (20 to 45 deg) and an unswept trailing edge at M
1.5 to 2.0; for (1c), the same with swept trailing edges; for leading
edges above 60 deg (5.7% of each band), any fins beyond the RM-10's 60
deg. Heyser, Maurer and Oberdorffer (AGARD CP-10) is the one candidate
known that might hold some of this; it needs a library copy.

**A side result, not proposed:** TR-92/509's fins one and two chords
ahead (F 1.00 to 1.14 at M 2.0 to 3.0) bear on 0015's refusal of fins
within a chord ahead above M 2.0 (7.2% of the 1.8 to 3.0 band). TN 3819
fig. 32 (registered, still unread) shows, by eye, a measured point at M
2.41 one chord ahead well below the finless base suction, a relief far
below the zero member; the two disagree, and fig. 32 has to be read
before any position bracket above M 2.0 is proposed.

### 1.5 Coverage (`out/w1b-w2-probe.out`)

Cases refused for sweep today, as a share of each band from Mach 1.5:
trailing edge unswept with the leading edge 0 to 45 deg, 32.5%; swept
trailing edges with the leading edge 0 to 45 deg, 4.2%; leading edges
above 60 deg, 5.7%.

| Proposal                              | Base term, M 1.5 to 1.8 | Base term, M 1.8 to 3.0 | Totals, 1.5 to 1.8 | Totals, 1.8 to 3.0 | Totals after W3 to W5, 1.5 to 1.8 | Totals after W3 to W5, 1.8 to 3.0 |
| ------------------------------------- | ----------------------- | ----------------------- | ------------------ | ------------------ | --------------------------------- | --------------------------------- |
| today (W1 committed)                  | 31.4%                   | 29.5%                   | 1.4%               | 1.4%               | 9.1%                              | 8.7%                              |
| (1a) TE unswept, LE 0 to 45, M 2 to 3 | 31.4%                   | 45.8%                   | 1.4%               | 2.4%               | 9.1%                              | 13.5%                             |
| (1b) as (1a), M 1.5 to 3              | 54.0%                   | 50.0%                   | 2.6%               | 2.5%               | 15.5%                             | 14.5%                             |
| (1c) (1b) and swept TE                | 56.5%                   | 52.2%                   | 2.6%               | 2.5%               | 15.8%                             | 14.8%                             |

(1a) serves the base term in 45.8% of the 1.8 to 3.0 band (from 29.5%);
the totals there go from 1.4% to 2.4% now, and from 8.7% to 13.5% once
W3, W4 and W5 are done. Nothing changes from M 1.5 to 1.8 or below.

## 2. W2: the body base below Mach 1.5

### 2.1 The band-setting data below Mach 1.5

| Source (registered)                        | What it gives (planning values; section 3 lists the readings owed)                                                                                                                                                                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TN 3819 fig. 18, the compiled curves        | Love's basic curve at M 1.0, 1.2, 1.4: -0.1849, -0.1836, -0.1796 (one reading, `src/base/tn3819-fig18.ts`); Chapman's within 0.005                                                                                                                                            |
| TN 3819 fig. 18, the free-flight curve      | Langley, R 30e6 to 35e6, M 1.0 to 1.26: 1.03 to 1.12 times the basic curve (0008's reading, `love18_ff_output.txt`)                                                                                                                                                           |
| TN 3819 fig. 18, tunnel symbols             | none below M 1.50 (the twelve run from 1.50 to 3.50); at M 1.50, 0.88 and 1.04 times the curve                                                                                                                                                                                |
| RM L52E06 fig. 8 (finless body A, free flight) | C_DB about 0.24 at M 1.045 (1.30 times the curve) and 0.224 at M 1.1 to 1.28 (1.22 to 1.23); by eye from a 300 dpi render                                                                                                                                                 |
| RM L52E06 fig. 6                            | A rear sting cuts the rim suction by about 40% below M 1.0 and has little effect above 1.15: tunnel points near M 1.0 read low                                                                                                                                                |
| RM L52E06 fig. 7                            | rim and centre of A, and of C (the same body with four flat plates at the base, leading edges swept 45 deg, 0.091 in thick): C over A 0.852 to 0.882 at the rim and 0.982 at the centre, M 1.06 to 1.10 (W1's reading), the lowest relief 0.838 with its errors                 |
| TN 3819 fig. 35, the free-flight line       | four unswept 10% arcs at the base: P_B -0.2844, -0.2751, -0.2705, -0.2678, -0.2661 at M 1.1 to 1.5 (round 3; one reading below 1.4), so F over the basic curve 1.544, 1.498, 1.490, 1.491, 1.536                                                                             |
| TN 3372 figs. 7 to 12                       | the finned PARD bodies (flat plates; closed base A, rocket chambers B and C, boat-tail D for W10), M 0.65 to 1.15: the same flights as RM L52E06's C for A; no finless body                                                                                                 |

Not used: TR R-100 (totals only); BRL 934 (range B is W2's hold-out, not
opened); RM L51F29 (Katz and Stoney) and Kell's R&M (free-flight base
pressures on bodies converging to the base, W10's subject, not
registered); the transonic tunnel compilations, sting-supported. No
free-flight finless base pressure between M 1.3 and 1.5 was found.

### 2.2 Proposed method and band: the body base

Cylindrical afterbody, turbulent layer, no fins within a chord of the
base, M 1.0 to 1.5:

- **Value:** Love's basic curve continued (the rows at M 1.0, 1.2, 1.4
  and 1.5), linear in M as above 1.5, so the term is continuous at M 1.5.
- **Band on the term: 0.82 to 1.33 times the curve** at M 1.0 to 1.5.
  High end: the largest free-flight datum over the curve below M 1.5 (RM
  L52E06's A at M 1.045, about 1.30) plus its reading error, to be fixed
  by the two readings; carried across M 1.3 to 1.5, where no free-flight
  data were found, as the envelope of both sides (0014's W2 item). Low
  end: no finless datum below the curve was found under M 1.5 (the tunnel
  symbols at M 1.50 reach 0.88); 0.82, the band-setting low end of M 1.5
  to 3.0, is carried down. The band steps at M 1.5 from 1.33 to 1.08 at
  its high end: below, free-flight data set it; above, none were found.
- **Nominal:** the curve, as 0008 serves it. Every free-flight datum below
  M 1.5 lies above it (1.03 to 1.30), so the band is lopsided; serving the
  band's midpoint (1.075 times the curve) instead is the owner's choice,
  and would make the term step at M 1.5.
- **Label:** "correlation: compiled base-pressure curve of TN 3819 fig. 18
  (Love) continued below Mach 1.5, band 0.82 to 1.33 set on free-flight
  data at Mach 1.0 to 1.3 (TN 3819 fig. 18, RM L52E06), carried to 1.5".
  The half-width, about +-25% of the term, is of the order 0014 planned
  (0.85 to 1.3).

### 2.3 Proposed method and band: fins at the base, M 1.1 to 1.5 (W1's part)

- **Reference member** (four fins t/c 0.10 at the base): fig. 35's
  free-flight line over the basic curve, low end the line less its error,
  high end the line plus 0.193, the largest tunnel excess over the line
  (TN 2360 at M 1.5), carried as W1 carries it beyond M 2.41: F about 1.48
  to 1.74 at M 1.1 to 1.5. The line starts at M 1.1 as read (round 3); M
  1.0 to 1.1 stays refused.
- **Zero member:** from 1 down to 0.838, the lowest relief measured with
  fins at the base at or below M 1.5 (RM L52E06, flat plates, M 1.06 to
  1.10). Above M 1.5 it stays 0.951.
- **No ratio members** (TN 2360 measures only at M 1.5 and 2.0): sections
  are bracketed between the zero member and the reference; three fins
  between zero and four; flat-faced fins bounded between 0.838 and the
  reference (0015 section 4, the same ordering); fins ahead of the base
  refused (no station below M 1.5).
- **Sweep below M 1.5:** RM L52E06's flat plates are swept 45 deg at the
  leading edge, so swept flat plates are measured there; no swept fins of
  other sections were measured below M 1.49 (the RM-10's lowest point).
  Proposed (2b): unswept fins, and swept flat plates (45 to 60 deg as
  above M 1.5); swept fins of other sections refused. (2c), not
  recommended: every section at 45 to 60 deg, citing the RM-10 at M 1.49.
- **Band on the term:** the factor's band and the curve's 0.82 to 1.33
  add linearly, as above M 1.5 (0010 section 1.4). For fins at the base
  this counts the free-flight excess twice, since fig. 35's line is
  itself a free-flight measurement over the curve; it is the conservative
  reading of the present composition, and narrowing it is a method change
  for the owner. Example: a 2.4% flat plate, four fins, at M 1.2: F 0.838
  to 1.692, nominal 1.265, the term 0.232 with a band of about 0.11 to
  0.39 in C_D on the base area.

### 2.4 Coverage (`out/w1b-w2-probe.out`)

| Proposal                                                    | Base term, M 1.0 to 1.2 | Base term, M 1.2 to 1.5 | Totals, 1.2 to 1.5 | Totals after W3 to W5, 1.2 to 1.5 |
| ----------------------------------------------------------- | ----------------------- | ----------------------- | ------------------ | --------------------------------- |
| today                                                       | 0%                      | 0%                      | 0%                 | 0%                                |
| (2a) the body base only (fins a chord or more ahead)        | 4.0%                    | 4.0%                    | 0.2%               | 0.9%                              |
| (2b) (2a) and fins at the base, M 1.1 to 1.5, as in 2.3      | 12.2%                   | 20.4%                   | 0.3%               | 6.3%                              |
| (2c) (2b) and every section swept 45 to 60 deg              | 16.4%                   | 28.9%                   | 1.1%               | 8.2%                              |

Totals at M 1.0 to 1.2 stay 0% whatever is done here: the nose solve
refuses every case there until W7. Under (2b) the base term is still
refused at M 1.2 to 1.5 for sweep in 40.5% of the band (unswept trailing
edges with the leading edge 0 to 45 deg among them: no data below M 2.0,
section 1.3), for fins ahead of the base in 23.4% (boat-tails included),
for rounded or diverging trailing edges in 11.8% and for steep bevels in
4.0%. 0014's plan (section 6.1) expected 16.3% of totals at M 1.2 to 1.5
after W1 to W5 and W2 with every base refusal lifted; (2b) reaches 6.3%,
(2c) 8.2%. With (1a) as well, all bands: base term 27.4% of cases, totals
1.0% now and 7.2% after W3 to W5 (from 0.7% and 4.5%).

## 3. Readings owed before anything is implemented

| What                                                              | Readings now                                         | Needed |
| ----------------------------------------------------------------- | ---------------------------------------------------- | ------ |
| NSWCDD/TR-92/509 Table 2, alpha 0 rows                             | this transcription                                   | a blind second transcription; registration first |
| TN 3819 fig. 18, rows at M 1.0, 1.2, 1.4                           | one (round 1)                                        | a second (0014 section 10.4) |
| TN 3819 fig. 18, the free-flight curve                             | one (0008)                                           | a second |
| RM L52E06 fig. 8, body A (and fig. 7's A, for the rim and centre)  | none (by eye here)                                   | two |
| TN 3819 fig. 35's free-flight line, M 1.1 to 1.4                   | one (round 3)                                        | a second (the round-6 reader may hold it: not looked at) |
