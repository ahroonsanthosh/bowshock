# Audit, round 2: the revised total-drag draft (0008)

Second audit, of `docs/research/total-drag/draft.md` (repository commit
50eb046) and its new and revised files. I checked them read-only and wrote
only to `drag-audit/round2/`. As in round 1, my second readings of the new
figures and tables were made before I opened the first agent's files for
them (method: `round2/readings/method_round2.md`).

## 0. Verdict

The revision fixes every high and medium finding of round 1 except one,
mostly well. The second readings agree with the first (section 2). The
draft is fit to go in as a design record with status **draft**, provided
the items in section 4 are corrected first. Items 4.1 to 4.3 change what
the first release may claim, so they must be fixed before the record is
accepted; the rest are wording and traceability.

## 1. Round 1 findings: status

| Finding | Status | Evidence |
| --- | --- | --- |
| H1: validation set outside the claimed envelope | Fixed, with a new gap (4.1) | 6.4 now claims only the Basic Finner class. ARCAS, RM A53D02, RM L55G28a and RM-10 are reported with their confounders. Finding 3 states that no case with the fins clear of the base was found. |
| H2: "the shortfall points to the base" | Fixed | Fig. 4 digitised; my second reading agrees (2.2). Section 4.3 and finding 2 now say the chamber change explains 29% to 50% of the shortfall at M 1.5 to 1.8 on the short model and 15% to 20% on the long one, and that 21% to 37% of the increment is unexplained. The reflexed-lip mechanism and the other candidates (trip grit, LE radius, anchors) are listed. |
| H3: TN 3819 fig. 18 curves misread | Values fixed; one claim overstated (4.4) | The adopted curve values are my round-1 values, and the ratios are restated correctly (0.856 to 1.043, 0.913 to 1.009, 0.913 to 1.078; OpenRocket 3.8% to 16.4%; H&D 13% to 21%). |
| H4: base band ignores a one-sided bias | Fixed, better than I proposed | The band is now asymmetric, 0.82 to 1.08. The bias is stated as Mach-dependent and unestablished. The free-flight curve at M 1.06 to 1.21 (1.03 to 1.12, which I checked visually on the scan) is added. Herrin and Dutton's "sting-free" status is marked unverified, which corrects my own round-1 wording. |
| H5: gates on the data that set the bands | Fixed, with a loophole (4.3) | Hold-out rule added. B2 gates on TN D-2896 and RM L52H21. B3 and B4 are labelled band estimation. B5 gates on the Basic Finner. |
| M1: page 37 calibration | Fixed | Adopted 0.5084 and 0.4124 (mine 0.5088 and 0.4128). Config 2 increments are now 0.140, 0.087 and 0.067. |
| M2: triangle convention | Fixed | Reading rule stated: the faired curve where one is drawn, otherwise the centroid. Triangles carry an extra one-sided +0.004 (it cancels in increments). |
| M3: TR 1051 fig. 23(b) | Fixed | Two readings are kept and the larger change used. Their M 2.0 start (-0.141) is better than mine (-0.147, about 0.005 too negative on re-check); I withdraw that number. |
| M4: "ten sources" | Fixed | Now "about seven, provisional". |
| M5: friction band, opposite signs | Fixed | Taken from 0007 (0.88 to 1.19 over 23 comparisons, momentum integral on the RM-10 trajectories). Numbers match docs/design/0007 section 4. |
| M6: band arithmetic overstated | Fixed | Now "at least -11% to +21%" (arithmetic checked: -11.1% to +20.7%). The fin band is derived, and the missing fins-on-base band is acknowledged. |
| L1 to L8 | Fixed | OpenRocket -2.5% to +0.9%; RM L54G14 station 20 and rake; 6(c) caption noted; tip-cone script saved (5e-12); Mach error ±0.02; rounding in 4.1; ARCAS fig. 1 items noted. |

## 2. Second readings of the new transcriptions

### 2.1 Basic Finner (DTIC ADA636861): Table VIII, Table IX, Table V, geometry

Read from page images (150 dpi; the OCR layer garbles digits).

- **Table VIII:** all 19 rows the first agent transcribed (M, DBSQ, CX0, CX2, Re) agree with mine exactly.
- **Table IX:** all 8 groups agree. The M 2.375 entry (0.484), which the first agent read only from the text layer, is confirmed on the image.
- **Table VII:** spot-checked on the image for all 19 rows; it matches.
- **Geometry:** fig. 2, tables I and II, and text pp. 3 to 4 agree. The cone is 10 deg half-angle, 2.84 cal long. The fins are 1 x 1 cal, single wedge, sharp LE (0.004 cal), blunt TE 0.08 cal at the base. Cant axis 0.50 cal ahead of the base; CG at 5.50 cal.
- **Computed statistics:** the spreads (-3.3% to +3.4% at M 1.8 and 2.4, -7.6% to +4.5% at M 2.7) are correct.
- **One interpretation to flag:** "conical in shape with a thickness of 0.08 cal at the base of the fin" is read as a constant-thickness blunt TE across the span. That gives the "+41% base area". If "conical" means the thickness also tapers spanwise, it is about +20%. Mark it as an interpretation.

### 2.2 TN D-4014 fig. 4 (chamber force)

| Config, fins | M | First | Mine | Within combined error |
| --- | --- | --- | --- | --- |
| 1 off | 1.50 / 1.80 / 2.30 / 2.96 | 0.0055 / 0.012 / 0.031 / 0.0265 | 0.0054 / 0.0118 / 0.031 / 0.028 | yes |
| 1 dF 0 | all | band 0.033 ±0.006 | 0.035 / 0.031 / 0.036 / 0.029 (identity uncertain) | yes |
| 2 off | 1.80 / 2.30 / 2.96 | 0.030 / 0.0235 / 0.0215 | 0.030 / 0.024 / 0.020 | yes |
| 2 dF 0 | 1.80 / 2.30 / 2.96 | 0.039 / 0.029 / 0.022 | 0.040 / 0.028 / 0.023 | yes |

Changes with fins, first against mine:

- **Config 1:** +0.028/+0.030, +0.021/+0.019, +0.002/+0.005, +0.0065/+0.001.
- **Config 2:** +0.009/+0.010, +0.0055/+0.004, +0.0005/+0.003.

All pass the B1 rule. The one that matters is config 1 at M 2.96: with my +0.001 the fin band's low end becomes 1.12 instead of 1.01. Under the draft's band-widening rule 1.01 stands, but both readings should be recorded.

### 2.3 RM L55G28a fig. 5

My calibration check: the report's own estimate at M 2.75 reads 0.353 on the figure against 0.3511 in table I; at M 3.75 it reads 0.284 against 0.2835.

My cluster reading against the first:

| M | Mine | First |
| --- | --- | --- |
| 2.50 | about 0.387 | 0.387 |
| 2.65 | 0.376 | 0.371 |
| 2.75 | 0.368 | 0.368 |
| 2.85 | about 0.365 | 0.365 |
| 2.92 | 0.363 | 0.361 |

Agreement is within 0.005, usually 0.002. Two cautions:

- Three detections in the first agent's raw file are not data: 0.409 at M 2.85 is the "Model 1" leader arrow, and 0.330 and 0.326 at M 2.95 to 3.03 are the dashed fairing.
- The radar squares sit about 0.01 to 0.015 below the telemeter circles. The draft's values are telemeter only; say so if the set is ever used.

Table I, the ±7% CD accuracy (p. 9), L/d 21.4, fins 18/10 in, LE radius 0.032 in, and the 12% LE-drag share are all verified.

### 2.4 TN 3320 fig. 9 (base pressure, RM-10 with fins, flight)

I read 64 symbols by shape (`round2/readings/tn3320_fig9.csv`): 26 full-scale circles, 10 squares, 24 pentagons, and 4 quarter-round and triangle symbols. The overlapped half-scale cluster at M 2.6 to 3.0 spans P_B -0.066 to -0.088.

The first agent's ring-template list (27 entries, circles only) agrees with my circles within 0.001 in P_B and 0.003 in M at the 20 true matches. But 7 entries are not full-scale circles:

| First agent's entry (M, P_B) | What it is |
| --- | --- |
| 1.526, -0.0947 | A half-scale square |
| 0.980, -0.1266 | A phantom between two circles |
| 0.982, 1.009, 2.219, 2.419 (two) | Low-score hits on lines or other symbols |

It also misses the circles at M 0.966, 1.035 (the peak, -0.138) and 1.161. The draft uses no value from fig. 9, so this matters only if the set is used later: filter by score and symbol.

## 3. The new numbers and conclusions

| Item | Verdict |
| --- | --- |
| Fin band 1.18 to 2.03 (own drag only) and 1.01 to 1.59 (with the chamber change) | Arithmetic correct. One-sided: the model was never above the data. Two caveats: (a) the low end 1.01 rests on a chamber change at M 2.96 of +0.0065 ±0.007 that my reading puts at +0.001 (band 1.12 to 1.57); (b) the ARCAS increment includes the No. 60 grit trip on both faces of each fin. Standard No. 60 grit is about 0.25 mm (0.010 in), and by the draft's own 4.23 C k that is about 0.04 for C ≈ 1, the size of the whole unexplained part. The band is therefore conservative for an untripped rocket. The draft should also say how B4's band is applied: to the fins' own drag alone, or to own drag plus B3's fins-on-base increment. Otherwise the chamber term can be counted twice or not at all. |
| Base band 0.82 to 1.08, asymmetric | Supported. The low end rests on one experiment of unverified support and a visual reading of slides, as stated. The high end 1.078 comes from the first reading of the M 3.24 point (my reading gives 1.05), per the band-widening rule. |
| Band sum, at least -11% to +21% | Arithmetic correct; correctly labelled a minimum and illustrative. It excludes the fins-on-base increment band, which is not derived, and that band dominates for the only class claimed (4.2). |
| Hold-out rule and gates | Right in principle; B2's gates are independent. Loophole in 4.3. |
| Section 6.4, Basic Finner class only | Right direction, but the Mach range and the fins-on-base term need correcting (4.1, 4.2), and the gate width should be stated (4.5). |

## 4. What must change

**4.1 Mach range of the only claim.**
- **Problem:** the Basic Finner has no shot between M 1.38 and 1.80. The 11 gated shots sit in four clusters: M 1.80 to 1.85, 2.35 to 2.41, 2.66 to 2.75, and 2.97.
- **Fix:** 6.4 and B5 should say Mach 1.8 to 3.0, not 1.5 to 3.

**4.2 The fins-on-base increment the claim depends on is undefined beyond M 2.**
- **Problem:** the Basic Finner's fins end at the base with blunt trailing edges. B3 carries this as TN 2360's measured increment, but TN 2360 covers M 1.5 and 2.0 only, with 5% and 10% circular-arc fins of aspect ratio 2.33, on a sting. Its band is "not yet derived". So at M 2.4 to 3.0, eight of the 11 gated shots, the gate would test an extrapolation with no band.
- **Fix, one of:** derive the increment and its band from data covering M 2 to 3 (Love's fin data in TN 3819 figs. 26 to 35 are the obvious candidate), or restrict the claim to where the increment is measured (M 1.8 to 2.0, three shots).
- **Then:** state this in 6.3 and 6.4.

**4.3 Hold-out loophole.**
- **Problem:** "a failed gate widens a band or refuses a configuration". Widening a band to pass the Basic Finner tunes it on the gate, and leaves no hold-out.
- **Fix:** a failed gate refuses the configuration. Any band later widened using the Basic Finner is labelled "estimated on the Basic Finner, not validated".

**4.4 Fig. 18 "read twice ... agreeing with the audit's reading within 0.0004" is overstated.**
- **What the second method actually found:**
  - `love18_trace` followed Gabeaud's line above M 2.4: its "upper" values (-0.1317 at 2.5, -0.1190 at 2.68, -0.1002 at 3.0) are Gabeaud's line in the same file.
  - It found one compiled curve only at M 1.5.
  - `love18_ransac.json` confirms 13 of the 20 curve values within 0.0004. It misses the more negative curve at M 1.5, 1.94, 2.0 and 3.0. At M 3.24 it gives -0.0929, which is on the symbol, not the curve's -0.0885. At M 3.50 it is 0.0013 off.
- **Fix:** say that the less negative curve and the pair at M 1.63 and 2.41 to 2.68 were read twice, and that the rest rest on one reading. A third look at those points would close it.

**4.5 Gate width.**
- **Problem:** the B5 tolerance sums several terms: the model-form band (at least -11% to +21%), the fins-on-base band (not derived), the transition input band (several percent of total at Re 1.2e7 to 2e7 on a 0.3 m body), and the shot-to-shot spread (up to -7.6%/+4.5%). The result is likely ±25% or wider, and a pass at that width says little.
- **Fix:** state the expected width, and report per-shot residuals (data over model) and their spread, not only pass or fail.

**4.6 Repository paths.**
- The draft lives in `docs/research/total-drag/`, but its links `0002-architecture.md` and `0007-skin-friction.md` resolve to that folder; they need `../../design/`.
- "drag-research/scripts", "drag-research/data" and "drag-audit/audit.md" should be `scripts/`, `data/` and `audit/audit.md`.

**4.7 Small items.**
- Section 5, Basic Finner row: mention the fin cant (0, 2, 4 deg, spinning) and the report's finding of no cant effect on Cxo (fig. 10).
- Say the +41% base-area figure is an interpretation (2.1).
- Record both fig. 4 readings (2.2) and both RM L55G28a fig. 5 readings, as the B1 rule requires.

## 5. Files

- This report: `drag-audit/round2/audit_round2.md`.
- Readings, all in `drag-audit/round2/readings/`:
  - `basic_finner_table8_table9.csv` and `basic_finner_geometry.md`
  - `tn-d-4014_fig4_chamber.csv`
  - `rm-l55g28a_fig5.csv`
  - `tn3320_fig9.csv`
  - `method_round2.md`
- Scripts in `drag-audit/round2/scripts/`: `degrid.py`, `specks.py`, `read_tn3320_fig9.py`; working images in `drag-audit/round2/work/`.
