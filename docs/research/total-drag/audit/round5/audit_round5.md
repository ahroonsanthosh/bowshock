# Round 5 audit: the Basic Finner's total, re-implemented from the records

Scope: step B5 of 0008 as 0010 implements it (`src/total/`, on `src/friction/`,
`src/fins/`, `src/base/`), and its gate, the Basic Finner (DREV TM 9703) at the 11
gated shots, M 1.799 to 2.970 (0010 section 4.2,
`docs/research/base-and-total/runs/gate-second-run.out` and `.json`,
`tests/validation/basic-finner.test.ts`). Nothing in `src/`, `tests/` or
`docs/design/` was edited.

## 0. Verdict

**No bug was found in bowshock's total.** Written blind from the records, my
implementation reproduces every component at every shot to within half a unit of
the gate record's fifth decimal. The body base is the one exception, with three
traced causes. The transition, wall and trailing-edge input bands agree to the
fifth decimal. The residuals and tolerances agree within 0.05 points. The gate
passes in my implementation too, at every shot, inside the model-form band alone.

The findings are of three kinds:

- **Record versus code**, on the fins-on-base band. 0010 does not say how the
  band is evaluated between its rows. The code interpolates the row ends; the
  record's rule, applied at the shot's Mach number, gives a different value just
  above M 2.41. At shot DA95021317 (M 2.414) this moves the body base by 0.0016
  in C_D (0.35% of the total) and the total's band high end by 0.0035.
- **Physics of the tolerance.** The tolerance adds the trailing edges' laminar
  band at its high end without the laminar fin friction that the same
  boundary-layer state requires. That makes the high end 3.4 to 4.1 points too
  wide at every shot. The same band applies the M 1.5 laminar ratio at M 2.97,
  where it implies a negative base pressure, beyond the vacuum bound.
- **One omission not listed with a size.** The cone's friction is taken at
  free-stream edge conditions. At the cone's own surface state it would be 7% to
  29% higher: +0.0012 to +0.0035 in C_D (0.2% to 0.9% of the total), largest
  at M 2.97, where the model already lies 6.5% above the data.

None of these changes the verdict.

## 1. Method and files

1. **Blind phase.** I read 0007, 0008, 0009 and 0010 and the data notes they
   cite: `basic_finner_ada636861.md` and `.csv`, `base_sources.md`,
   `love_tn3819_fig18.csv`, `love_fig35_tn3819.csv`, `love_fig35_factor.csv`,
   `blunt_te_2d_base.md` and `.csv`, `le_bluntness.md` and `.csv`. I also used
   the round-1, round-3 and round-4 readings that 0010 names as inputs: the
   round-1 fig. 18 table, the round-3 fig. 35 csv and `factor35.py`, and the
   round-4 readings with the comparison set of `compare_round4.py`. I did not
   open `src/`, `tests/` or the gate outputs in this phase.

   I wrote the implementation in Python 3 with numpy, and committed it with its
   outputs and `outputs/blind_notes.txt` (the interpretations and the physics
   findings) as 456e73e, before opening any bowshock output.
2. **Comparison.** I compared the implementation against
   `gate-second-run.json` (5 decimals) and `.out` (component bands, 4 decimals),
   then opened the code for every difference.

| File (`round5/`) | What |
| --- | --- |
| `scripts/indep_lib.py` | Pitot (Rayleigh); oblique shock; Taylor-Maccoll cone; Sutherland; van Driest II in the TMR form; the exact Karman-Schoenherr law and its local form cf = CF / (1 + 2 / ln Y); the compressible laminar similarity solution (Pr 0.72, Sutherland, RK4 shooting); the flat plate with transition at a virtual origin of equal momentum thickness; the axisymmetric momentum integral d(r theta)/ds = r cf/2 |
| `scripts/bf_total_indep.py` | The total at the 11 shots: every component, its band, the input bands, the model-form band sum, the cluster spreads, the tolerance and the residual |
| `scripts/check_lib.py` | The library against closed forms and 0007's numbers |
| `scripts/convergence.py` | My own numerics: body friction steps doubled, 1e-12; Taylor-Maccoll steps doubled, 2e-8; laminar domain and steps, 1e-12 |
| `scripts/options.py` | Each record-level choice, measured |
| `scripts/physics_checks.py`, `extras.py`, `cone_edge.py`, `coherent_transition.py` | The physics checks of section 5 |
| `scripts/compare.py`, `tables.py`, `code_match.py` | The comparison |
| `outputs/*.txt`, `*.json`, `tables_output.md` | Every run's output |

## 2. What the records left open, and what I chose

Each choice was made blind. Its effect was measured in `options_output.txt` and
then checked against the code.

| # | Open point | My blind choice | Alternative, measured | The code |
| --- | --- | --- | --- | --- |
| I1 | Fins-on-base band at a shot between 0010's rows | The band evaluated at the shot's M, by the record's rules | The band at the rows, linear in M: -0.0019 at M 2.414 (-0.40% of the total), up to +0.0004 elsewhere | Rows, linear in M (stated only in `fins-on-base.ts`). Finding 2 |
| I2 | Round 3's reading error at M 2.97 and 3.00 | +-0.002 (`method_round3.md`) | +-0.003 (`factor35.py`): -0.0002 | +-0.003. Finding 5 |
| I3 | First reading's extrapolation to M 2.97 and 3.00 | In the envelope (0010's row at M 2.90, 1.148, needs it) | Without it, the M 2.90 low end is 1.1485 | In the envelope |
| I4 | Interpolation bound of fig. 18 | Times F | Without F: 5e-5 less band | Times F |
| I5 | Laminar trailing-edge band, both readings | Every pairing of laminar and turbulent readings | Matched pairs: the low end 1.6e-4 to 1.9e-4 higher | Every pairing |
| I6 | Re_T measured along | The surface from the tip | The axis: 1e-4 to 2.2e-4 more transition band | The surface |
| I7 | Cone friction | Axial component (cos 10 deg) | Surface shear: +0.0002 (0.3% of body friction) | Axial |
| I8 | Wall of a laminar run | The similarity solution's own adiabatic wall; turbulent at r 0.89 | | The same |
| I9 | Tunnel excess carried beyond M 2.41 | Largest over both readings: 0.1398 | | 0.1398 |
| I10 | Round 3's tunnel symbols | At its read M 1.502, 2.003, 2.405 | | At the tunnels' 1.50, 2.00, 2.41: +0.00025 at M 2.414. Finding 6 |
| I11 | Nose band "7e-5 (0006)" | Absolute, in C_D | | 7e-5 of the value: each band end 6e-5 narrower. Finding 9 |

## 3. Comparison

### 3.1 Components, C_D on the cylinder's cross-section

Mine with the blind choices / bowshock's `gate-second-run.json`. The base column
"rows" is mine with I1's alternative, which is the code's method.

| Shot | M | Nose | Body friction | Fin friction | Leading edges | Fin wave | Body base | Base (rows) | TE base | Total | Total (rows) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DA95021318 | 1.799 | 0.11054 / 0.11054 | 0.08038 / 0.08038 | 0.03604 / 0.03604 | 0.04394 / 0.04394 | 0.01655 / 0.01655 | 0.21768 / 0.21768 | 0.21768 | 0.10719 / 0.10719 | 0.61232 / 0.61232 | 0.61232 |
| DA95021529 | 1.846 | 0.10897 / 0.10897 | 0.07911 / 0.07911 | 0.03546 / 0.03546 | 0.04422 / 0.04422 | 0.01602 / 0.01602 | 0.20813 / 0.20846 | 0.20846 | 0.10330 / 0.10330 | 0.59521 / 0.59554 | 0.59554 |
| DA95021308 | 1.850 | 0.10885 / 0.10885 | 0.07916 / 0.07916 | 0.03549 / 0.03549 | 0.04424 / 0.04424 | 0.01598 / 0.01598 | 0.20731 / 0.20768 | 0.20768 | 0.10301 / 0.10301 | 0.59403 / 0.59440 | 0.59440 |
| DA95021328 | 2.348 | 0.09677 / 0.09677 | 0.06878 / 0.06878 | 0.03089 / 0.03089 | 0.04631 / 0.04631 | 0.01215 / 0.01215 | 0.15507 / 0.15545 | 0.15544 | 0.07423 / 0.07423 | 0.48420 / 0.48458 | 0.48457 |
| DA95020907 | 2.364 | 0.09647 / 0.09647 | 0.06863 / 0.06863 | 0.03083 / 0.03083 | 0.04636 / 0.04636 | 0.01206 / 0.01206 | 0.15430 / 0.15454 | 0.15453 | 0.07347 / 0.07347 | 0.48213 / 0.48237 | 0.48236 |
| DA95021317 | 2.414 | 0.09558 / 0.09558 | 0.06749 / 0.06749 | 0.03031 / 0.03031 | 0.04650 / 0.04650 | 0.01179 / 0.01179 | 0.15328 / 0.15164 | 0.15139 | 0.07118 / 0.07118 | 0.47613 / 0.47449 | 0.47424 |
| DA95020927 | 2.663 | 0.09168 / 0.09168 | 0.06321 / 0.06321 | 0.02845 / 0.02845 | 0.04710 / 0.04710 | 0.01064 / 0.01064 | 0.14081 / 0.14078 | 0.14078 | 0.06090 / 0.06090 | 0.44278 / 0.44275 | 0.44275 |
| DA95020906 | 2.741 | 0.09061 / 0.09061 | 0.06183 / 0.06183 | 0.02784 / 0.02784 | 0.04725 / 0.04725 | 0.01033 / 0.01033 | 0.13726 / 0.13727 | 0.13727 | 0.05811 / 0.05811 | 0.43322 / 0.43323 | 0.43323 |
| DA95020916 | 2.749 | 0.09050 / 0.09050 | 0.06172 / 0.06172 | 0.02779 / 0.02779 | 0.04727 / 0.04727 | 0.01030 / 0.01030 | 0.13690 / 0.13691 | 0.13691 | 0.05784 / 0.05784 | 0.43232 / 0.43233 | 0.43233 |
| DA95030603 | 2.969 | 0.08783 / 0.08783 | 0.05797 / 0.05797 | 0.02613 / 0.02613 | 0.04764 / 0.04764 | 0.00953 / 0.00953 | 0.12745 / 0.12724 | 0.12745 | 0.05081 / 0.05081 | 0.40737 / 0.40716 | 0.40737 |
| DA95022205 | 2.970 | 0.08781 / 0.08781 | 0.05801 / 0.05801 | 0.02615 / 0.02615 | 0.04764 / 0.04764 | 0.00953 / 0.00953 | 0.12741 / 0.12720 | 0.12741 | 0.05078 / 0.05078 | 0.40734 / 0.40713 | 0.40734 |

Largest |mine / bowshock - 1| over the 11 shots:

| Component | Blind choices | Rows (the code's method) | Half a unit of the json's 5th decimal, at the component's smallest value |
| --- | --- | --- | --- |
| Nose wave drag | 0.005% | 0.005% | 0.006% |
| Body friction | 0.007% | 0.007% | 0.009% |
| Fin friction | 0.017% | 0.017% | 0.019% |
| Fin leading edges | 0.009% | 0.009% | 0.011% |
| Fin wave drag | 0.041% | 0.041% | 0.052% |
| Body base | **1.083%** (M 2.414) | 0.169% (M 2.97) | 0.004% |
| Fin trailing-edge base | 0.008% | 0.008% | 0.010% |
| Total | 0.346% | 0.053% | |

Every component other than the body base agrees to the precision of bowshock's
record. That covers friction (body and fins, momentum integral, van Driest II,
Karman-Schoenherr), Taylor-Maccoll, the oblique shock, the 3D ratio, the
modified-Newtonian edge and the trailing-edge curve.

The body base, in three steps (`code_match_output.txt`):

1. **The method.** The code evaluates the fins-on-base band at its rows (every
   Mach number of either reading, M 1.80 to 3.00, M 2.41 among them) and
   interpolates the low and high ends linearly between the rows. With that,
   mine agrees within 0.17%.
2. **Round 3's tunnel symbols.** The code places them at the tunnels' nominal
   M 1.50, 2.00 and 2.41, where I had the read M 1.502, 2.003 and 2.405. With
   that, mine agrees within 2.5e-5 in C_D at every shot.
3. **Round 3's error and value at M 2.97.** The code takes round 3's error
   there as +-0.003 and its value as -0.1290, both from `factor35.py`. This
   accounts for the remaining 2.5e-5 at M 2.97.

### 3.2 Bands, inputs, residual and tolerance

Mine with the rows method / bowshock:

| Shot | Band low | Band high | Transition (friction) + TE laminar, low | TE laminar + wall, high | Residual | Tolerance low | Tolerance high |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DA95021318 | 0.53107 / 0.53113 | 0.72618 / 0.72612 | -0.04664 / -0.04664 | +0.03625 / +0.03625 | -2.99% / -2.99% | -24.18% / -24.17% | +26.51% / +26.50% |
| DA95021529 | 0.51799 / 0.51805 | 0.70534 / 0.70528 | -0.04467 / -0.04467 | +0.03713 / +0.03713 | +0.41% / +0.41% | -23.82% / -23.81% | +26.66% / +26.65% |
| DA95021308 | 0.51715 / 0.51721 | 0.70393 / 0.70387 | -0.04480 / -0.04480 | +0.03690 / +0.03690 | -4.61% / -4.61% | -23.83% / -23.82% | +26.62% / +26.61% |
| DA95021328 | 0.42492 / 0.42498 | 0.57203 / 0.57198 | -0.03302 / -0.03302 | +0.04005 / +0.04005 | +3.18% / +3.18% | -21.33% / -21.32% | +29.69% / +29.68% |
| DA95020907 | 0.42334 / 0.42340 | 0.56907 / 0.56903 | -0.03292 / -0.03292 | +0.03988 / +0.03988 | -0.90% / -0.91% | -21.27% / -21.26% | +29.62% / +29.61% |
| DA95021317 | 0.41736 / 0.41738 | 0.55825 / 0.55872 | -0.03201 / -0.03201 | +0.04026 / +0.04026 | -0.26% / -0.31% | -20.95% / -20.99% | +29.58% / +29.61% |
| DA95020927 | 0.38914 / 0.38920 | 0.52105 / 0.52099 | -0.02881 / -0.02881 | +0.04027 / +0.04027 | +0.73% / +0.73% | -26.17% / -26.15% | +31.25% / +31.23% |
| DA95020906 | 0.38074 / 0.38081 | 0.50971 / 0.50965 | -0.02786 / -0.02786 | +0.04035 / +0.04035 | -7.67% / -7.67% | -26.10% / -26.08% | +31.44% / +31.42% |
| DA95020916 | 0.37997 / 0.38003 | 0.50864 / 0.50858 | -0.02778 / -0.02778 | +0.04032 / +0.04032 | +4.55% / +4.55% | -26.09% / -26.07% | +31.44% / +31.43% |
| DA95030603 | 0.35825 / 0.35796 | 0.47869 / 0.47858 | -0.02533 / -0.02533 | +0.04036 / +0.04036 | -5.49% / -5.44% | -19.46% / -19.49% | +28.60% / +28.64% |
| DA95022205 | 0.35824 / 0.35795 | 0.47866 / 0.47855 | -0.02534 / -0.02534 | +0.04032 / +0.04032 | -7.69% / -7.65% | -19.46% / -19.49% | +28.59% / +28.63% |

- **The input bands agree to the fifth decimal at every shot.** These are
  friction transition (-0.0187 to -0.0301), the wall (+0.0155 to +0.0241) and
  the trailing-edge laminar band (-15.4% to +32.0% on the term). The band's
  extrapolation flags agree too: laminar M 1.5 and 2.0 at the shots from M
  2.414, turbulent M 3.1 at the shots from M 2.348.
- **The model-form band ends differ by 6e-5 on each side.** That is the
  nose-band unit (I11). They also differ at M 2.414 (finding 6) and M 2.97
  (finding 5).
- **The component band ends** (`compare_output.txt`, part B) agree within 1e-4
  of the `.out` file's 4 decimals (the nose's by I11's unit), except the body
  base's high end at M 2.414 (-0.0006, finding 6) and its low end at M 2.97
  (+0.0003, finding 5).

### 3.3 The fins-on-base factor at the shots

| Shot | M | The record's rule at the shot's M | Rows, linear in M (mine) | bowshock | Body base, rule minus bowshock |
| --- | --- | --- | --- | --- | --- |
| DA95021318 | 1.799 | 1.3869 (1.2365 to 1.5373) | 1.3869 (1.2365 to 1.5373) | 1.3869 | 0 |
| DA95021529 | 1.846 | 1.3509 (1.2121 to 1.4897) | 1.3530 (1.2115 to 1.4946) | 1.3530 | -0.00033 |
| DA95021308 | 1.850 | 1.3477 (1.2099 to 1.4854) | 1.3501 (1.2094 to 1.4908) | 1.3501 | -0.00037 |
| DA95021328 | 2.348 | 1.2387 (1.1045 to 1.3730) | 1.2417 (1.1105 to 1.3730) | 1.2418 | -0.00038 |
| DA95020907 | 2.364 | 1.2411 (1.1098 to 1.3724) | 1.2429 (1.1134 to 1.3724) | 1.2430 | -0.00024 |
| DA95021317 | 2.414 | **1.2605 (1.1214 to 1.3997)** | 1.2450 (1.1213 to 1.3686) | **1.2470** (1.1213 to 1.3728) | **+0.00164** |
| DA95020927 | 2.663 | 1.2847 (1.1365 to 1.4329) | 1.2845 (1.1364 to 1.4326) | 1.2845 | +0.00003 |
| DA95020906 | 2.741 | 1.2909 (1.1406 to 1.4412) | 1.2909 (1.1406 to 1.4413) | 1.2910 | -0.00001 |
| DA95020916 | 2.749 | 1.2915 (1.1410 to 1.4421) | 1.2916 (1.1410 to 1.4422) | 1.2916 | -0.00001 |
| DA95030603 | 2.969 | 1.3064 (1.1501 to 1.4627) | 1.3064 (1.1501 to 1.4627) | 1.3042 | +0.00021 |
| DA95022205 | 2.970 | 1.3065 (1.1501 to 1.4628) | 1.3065 (1.1501 to 1.4628) | 1.3043 | +0.00021 |

My builder reproduces all ten rows of 0010 section 1.3's table to the third
decimal (`options_output.txt`, part 1), once round 3's error at M 2.97 and 3.00
is +-0.003. With +-0.002, the rows at M 2.97 and 3.00 come out 1.150 and 1.151
against the table's 1.146 and 1.147.

## 4. Findings, ranked by their effect

Sizes are in C_D and in % of the modelled total. "Record" means the code does
what a record says or allows, and the record is the thing to fix.

### 4.1 Effect on the modelled total

**1. The cone's friction at free-stream edge conditions: about +0.0012 to
+0.0035 omitted (+0.2% to +0.9%), largest at M 2.97. Record.**

- **What the code does.** It takes the friction of the 10 deg cone at the free
  stream's edge state. This is stated as an assumption in 0007 section 1 and in
  `finned-body.ts` ("Friction is at free-stream edge conditions").
- **What the record says.** 0010 section 3's list of what is not represented,
  with sizes, does not include it. 0008 section 2.4 expects driving the
  integral with the solved pressure to move friction "by a few percent", without
  a size for this body.
- **The estimate** (`cone_edge_output.txt`). At the cone's Taylor-Maccoll
  surface state, q_c CF_c over q_inf CF_inf is 1.070 at M 1.80, 1.179 at M 2.41
  and 1.289 at M 2.97. For example q_c / q_inf is 1.26 at M 2.97, with the
  cone's Mach number 2.685. The cone carries 21% of the body friction, so the
  term is short by +0.0012 (M 1.80) to +0.0035 (M 2.97).
- **Why it matters for the comparison.** It is systematic in Mach number, in
  the direction that deepens the M 2.97 offset: about -6.5% to about -7.3%.
- **The estimate's limits.** It is first order. It uses the flat-plate ratio
  with the same Mangler-type geometry for both states, and leaves out the
  shoulder expansion on the cylinder.
- **Recommendation.** Add the term to 0010 section 3's list with this size, or
  drive the cone's integral with the Taylor-Maccoll state (the exact solution is
  already in `nose.ts`).

**2. The fins-on-base band between rows, at M 2.414: -0.0016 against the
record's rule (-1.1% of the body base, -0.35% of the total); the body base's
band high end -0.0034 (the total's -0.0035). Record and code differ.**

- **What the record says.** 0010 section 1.3: "Beyond 2.41 the high end is the
  free-flight factor plus the largest of these" (0.140).
- **What follows at the shot.** At M 2.414, that rule gives F_high = 1.3997 and
  F = 1.2605.
- **What the code does.** It interpolates the row ends linearly between M 2.41
  (high end 1.3711, from the tunnel factor) and M 2.50 (1.4111, carried). That
  gives 1.3728 and F = 1.2470. The interpolation is stated in
  `fins-on-base.ts`'s docstring ("Between rows the low and high ends are
  interpolated linearly in M"), not in 0010.
- **The cause underneath.** The rule as written puts a step of +0.027 into the
  high end at M 2.41, where the tunnel pairs stop. Interpolating smears the
  step over M 2.41 to 2.50, and the one shot just above M 2.41 falls on the
  smear.
- **Effect.** The residual is -0.31% in bowshock against -0.66% under the
  record's rule. The tolerance high end is 29.6% against 29.9%.
- **Recommendation.** 0010 section 1.3 should state that the band is
  interpolated between rows (or the code should evaluate at the shot's Mach
  number), and say what the step at M 2.41 is.

**3. The same cause at M 1.846 to 2.364: +0.0002 to +0.0004 (+0.05% to
+0.08%). Record.** The rows-and-interpolation method and the record's rules
evaluated at M differ there for two reasons:

- at M 1.846 and 1.850, the high end (F + e) is not linear between the rows at
  1.80 and 1.90;
- at M 2.348, the identity-swap error applies at the shot's Mach number but
  only at the M 2.30 row.

Same remedy as finding 2.

**4. Wetted area: the fin tip faces carry no friction, and the roots do not
remove body area. Net +0.00025 to +0.00034 omitted (+0.06%). Record, minor.**

- **The roots.** 0010 section 3 sizes the roots as 0.59% of the body's wetted
  area and 4e-4 in C_D (`interpretations.out`: 4 x 0.04 cal^2, the sharp
  wedge's section). With the tangent geometry the section is 0.04385 cal^2, so
  the roots are 0.1754 cal^2 (0.649%). At the local cf of the last calibre the
  root footprint carries -0.00032 to -0.00045, not the area-share 4e-4.
- **The tip faces.** The four tip faces (4 x 0.04385 cal^2, parallel to the
  stream) carry +0.00057 to +0.00079, and are not in 0010's list. The two
  omissions have opposite signs (`extras_output.txt`).

**5. Round 3's reading error at M 2.97 and 3.00 is in no record: -0.0002 at M
2.97 (-0.05%). Record (unreproducible).**

- **The value used.** `tn3819-fig35.ts` takes +-0.003 there, and the value
  -0.1290 at M 2.97, from `factor35.py` (a script, "end of the traced line
  (2.99), short extrapolation").
- **What the records say.** `method_round3.md` states +-0.002 at M 2.4 to 3.0.
  0010 says "each reading's stated error".
- **Effect.** 0010 section 1.3's rows at M 2.97 and 3.00 (1.146, 1.147) cannot
  be reproduced from the records. With +-0.002 they are 1.150 and 1.151. The
  shots at M 2.97 move by -0.0002, and the band's low end by -0.00016.
- **Recommendation.** 0010 section 1.3 should state the +-0.003 and its origin.

**6. Round 3's tunnel symbols at the nominal Mach numbers: +0.00025 at M 2.414
(+0.05%). Record, negligible.**

- **The choice.** The code places round 3's pairs at M 1.50, 2.00 and 2.41
  (documented in `tn3819-fig35.ts`). Round 3 read them at 1.502, 2.003 and
  2.405.
- **Why it matters at all.** With 2.405, round 3's tunnel factor does not reach
  the M 2.41 row. That row's high end is then 1.3667 (first reading), not
  1.3711. 0010 does not say which.

### 4.2 Effect on the bands and the tolerance

**7. The transition input is added as two independent ends. The tolerance's
high end is too wide by 3.4 to 4.1 points at every shot. Record (band
arithmetic).**

- **The rule.** 0010 section 4.1 and 0008 section 6.2 B5 build the tolerance
  from "the input bands for the unknown transition (friction, low side; the
  trailing edges' laminar band, both sides)". The code follows it.
- **Why the high end cannot occur.** The trailing-edge band exists only in a
  state where the fin is laminar at its trailing edge (Re_T at least Re_c).
  Then the fin is laminar over its whole chord, so its friction falls by 0.0175
  to 0.0242 at the same time. That fall is larger than the band's high end
  (+0.0162 to +0.0212) at every shot (`coherent_transition_output.txt`).
- **The coherent figure.** Taken as one boundary-layer state (fully turbulent,
  or a laminar run to 5e5, 1.6e6 or 3e6, with the body turbulent or not), the
  transition input's high end is **0 at every shot**. The low end, -0.0253 to
  -0.0466, is attainable as computed.
- **Effect.** The tolerance's high end becomes +23.1% to +27.4%, not +26.5% to
  +31.4%. The verdict is unchanged: the largest residual is +4.5%.
- **Why it matters.** A tolerance padded with an unreachable state makes a pass
  easier, not more conservative. This is the most visible band-arithmetic point
  for a public reader.

**8. The trailing-edge laminar band at M 2.97 implies a negative base pressure.
Its high end exceeds the vacuum bound at M 2.35 to 2.97 by +0.0039 to +0.0117
(0.8% to 2.9% of the total). Record (physics).**

- **The rule.** 0010 section 5.1 takes the laminar band as the envelope over
  the ratios at M 1.5, 2.0 and 3.1, whatever the shot's Mach number. The high
  end is then always the M 1.5 ratio: +26% to +32% on the term.
- **What it means at M 2.97.** The nominal is p_b/p_inf = 0.230, and 1.32 times
  its base drag is p_b/p_inf = **-0.016**. With the model-form high end (1.21)
  as well, p_b/p_inf runs from -0.037 at M 2.35 to -0.177 at M 2.97
  (`extras_output.txt`, part 3).
- **Against the vacuum bound.** The vacuum bound is 2/(gamma M^2) on 0.32 cal^2
  (0.0660 at M 2.97). The term plus both bands' high ends exceeds it from M
  2.35 on (`physics_checks_output.txt`, part 1).
- **What the shot's own Mach number gives.** TR 1109's ratio at M 3.1 is 0.91
  to 0.96 at these abscissas.
- **Relation to finding 7.** Finding 7's fix removes this high end from the
  tolerance. The laminar band would still state an impossible value beside the
  term.
- **Recommendation.** Cap every band end at the vacuum bound, or take the ratio
  at the shot's nearest read Mach number, with the envelope kept as a flagged
  alternative.

**9. The nose band's unit: +-6e-5 per band end. Record ambiguity,
negligible.** 0010 section 3's table says "the fitted solver's floor, 7e-5
(0006)". The code applies 7e-5 of the value (`nose.ts`). Read as an absolute
7e-5, the model-form band is 6e-5 wider on each side.

**10. The curvature bound is the larger curve's: conservative by a factor of
1.6, at most 1e-4. Record, negligible.**

- **What the code takes.** The largest |P_B''| over both compiled curves:
  0.0634, from the more negative curve (my recomputation from the twice-read
  nodes gives 0.0632).
- **The served curve's own value.** The less negative curve's is 0.039.
- **What the record says.** 0010 section 1.1 does not say "over both curves";
  the code's docstring does.

### 4.3 Refusal rules against the records

- **Agree.** I checked these one by one in the code: base Mach 1.5 to 3.0;
  afterbody; laminar base (any Re_T reaching the base); fins-on-base count 4,
  t/c 0.05 to 0.10, M 1.80 to 3.0 with the 0.002 allowance; fins between the
  base and one chord ahead; trailing edge M 1.5 to 3.2, swept, laminar nominal,
  c/[h Re_c^(1/5)] above 1.0, and the laminar input beyond one read interval;
  leading edge M 1.49 to 3.0, Re_D below 6.7e3, swept, and anything but a
  single wedge of constant chord; a blunt trailing edge on a fin of varying
  chord. The five shots at M 1.06 to 1.33 are refused for the reasons 0010
  gives.
- **11. A domain gap in both the record and the code: the rounded edge at Re_D
  above 1e6.**
  - **What the code does.** It labels Re_D at least 1e5 at M up to 2.90
    "measured", with no upper limit (`rounded-leading-edge.ts`).
  - **What the sources cover.** TN 2960 covers Re_D 1e5 to 1e6, RM A55H31 6.7e3
    to 1.4e5. 0010 section 5.2 states no upper limit either.
  - **Reach.** The Basic Finner (Re_D 0.95e4 to 1.58e4) is not affected.
  - **Recommendation.** State the upper limit, or refuse above 1e6.

### 4.4 My own errors, found and corrected

1. **The X-15 means.** My first X-15 check used the table's rounded means of
   flight B. With the orifice means it gives 0.934 to 1.201 and 0.936 to 1.204,
   the record's values. I corrected this before the comparison.
2. **Round 3's tunnel Mach numbers.** My placement of the pairs (I10) is a data
   choice, not an error. It is finding 6.

## 5. Independent physics checks

| Check | Result |
| --- | --- |
| Van Driest II (TMR form) against 0007 section 3.1's model column, M 1.99 to 3.60 | Equal to 4 decimals at all five Mach numbers |
| Karman-Schoenherr local form, cf = CF/(1 + 2/ln Y), against d(Re_x CF)/dRe_x | 4e-11 |
| Laminar similarity: Blasius limit; recovery factor at Pr 0.72 | 0.664115; 0.843 to 0.846 at M 1.8 to 3.0 |
| Momentum integral, laminar cone | theta ratio 1/sqrt(3) to 6 decimals (Mangler) |
| Vacuum bound of the trailing-edge base | The nominal and the model-form band (1.21) lie inside it at every shot. With the laminar high end they lie outside it from M 2.35 on (finding 8) |
| Modified-Newtonian front side, 2r(cos d - cos^3 d / 3), against a 2e5-point quadrature of Cp_pitot cos^2 over the arc | Equal to 1e-9; over (2/3)(2r) -6.4e-7, as 0010 says (1e-6) |
| Tangent geometry | d = 2.0699 deg (sharp wedge 2.2906); tangent point (0.003856, 0.003997); distance from the centre to the face 0.0040000; faces' rise 0.036003; frontal height 2 x rise + 2r cos d = 0.0800 |
| Faces' exact drag, rounded over sharp | 0.8095, 0.8088, 0.8078 at M 1.8, 2.4, 3.0 (0010: 0.808 to 0.810) |
| TN 2960 front side over (2/3) Cp_pitot (trapezoid) | First reading 0.995, 1.049, 1.056; with 0.884 at M 1.98 and 45 deg, 1.043; second 1.002, 1.049, 1.052 (Simpson 1.000, 1.046, 1.053); envelope 0.995 to 1.056, as 0010 |
| X-15 over RM A51J25 fig. 7 at M' = M, 18 power-off rows | 0.934 to 1.201 (first curve), 0.936 to 1.204 (second), as 0010 |
| Fins-on-base factor on the less negative curve only | Yes, in `fins-on-base.ts` and `base-drag.ts`, as 0008 and 0010 require |
| Fin friction counted once | Yes: fin friction only under the fins' own band 1.01 to 1.59; body friction only under 0.88 to 1.19 |
| Wetted areas | Body 27.030 cal^2 (cone 4.523, cylinder 22.508); fins 8 cal^2 (both faces, planform); not represented: the roots, 0.1754 cal^2, and the tip faces, 4 x 0.0439 cal^2 (finding 4) |
| 0010 section 4.1's drawn-cone interpretation (half-angle 9.985 deg) | -0.24% at M 1.80, -0.25% at M 2.97 (-2.7e-4, -2.2e-4), as 0010 |
| The trailing-edge laminar band per shot (0010 section 5.1) | -15.4% to +19.4% at M 1.799 through -13.0% to +32.0% at M 2.969, every value and flag as 0010 |

## 6. Commits

- 456e73e: the blind phase. The implementation, its outputs and
  `blind_notes.txt`, before the comparison.
- The commit that adds this report: the comparison, the traced causes and the
  remaining checks.
