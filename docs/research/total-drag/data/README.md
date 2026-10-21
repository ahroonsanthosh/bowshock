# Data transcriptions and computation outputs for draft 0008 (total drag)

Research material behind docs/design/0008-total-drag.md. Revised after the
audit (`../audit/audit.md`) and its second round (`../audit/round2/`), and
after the first Basic Finner gate run (docs/design/0010-base-drag-and-total.md
section 6): the files marked (0010) were added then, all first readings with
the second pending, none using Basic Finner drag data.

| File | Content |
| --- | --- |
| arcas_tn-d-4014_tn-d-4013.md, arcas_ca_alpha0.csv | ARCAS half-scale models: geometry, conditions, stated accuracy, CA at alpha 0 (resolved readings), chamber force, fin increments |
| d4014/tn-d-4014_CA_alpha0_resolved.csv | TN D-4014 CA at alpha 0: first, audit and third readings, adopted values, reading rule |
| d4014/tn-d-4014_fig4_chamber.csv | TN D-4014 fig. 4 chamber axial-force coefficient near alpha 0 (first reading) |
| d4014/grid*.json, curve*.json | Grid-line fits and curve readings behind the two files above |
| basic_finner_ada636861.md, .csv | Basic Finner in free flight (DREV range): geometry, conditions, accuracy, CX0 per shot (hold-out set) |
| basic_finner_stats_output.txt | Scatter between Basic Finner shots; 6DOF against linear-theory values |
| validation_candidates.md | Other candidates opened: RM L55G28a, TN 3320 (RM-10 flight base pressure), TR R-100 survey, TN 3372; sting-free base data; the second hold-out search (ranked candidates, sources not reached) |
| basic_finner_brl934.md, .csv, basic_finner_brl934_graph2.csv, basic_finner_brl934_output.txt | Basic Finner in free flight (BRL range, BRL Report 934): geometry, launch, the report's boundary-layer statement, Tables I to III per round (read twice), Graph II (read twice), Graph I symbols (read once), Reynolds estimates and domain checks; a candidate second hold-out, no model run |
| rm-l55g28a_fig5_first_reading.txt | RM L55G28a fig. 5, model 1 CD at M 2.5 to 2.9 (first reading) |
| tn3320_fig9_first_reading.txt | TN 3320 fig. 9, base-pressure coefficient of the full-scale RM-10 (first reading) |
| rm-a53d02.md, rm-a53d02_cd.csv | Fin-stabilised L/d 10 body in free flight: geometry, table I, CD digitised (M 1.04 to 3.3) |
| friction_sources.md | Friction sources and the sensitivity study (the band itself is now 0007-skin-friction's) |
| chapman_kester_tn3097_table3.csv | TN 3097 table III |
| base_sources.md | Love fig. 18 (revised), Chapman sting interference (two readings), Spahr and Dickey, Herrin and Dutton via Tucker, RM-10 flight, OpenRocket base drag |
| love_tn3819_fig18.csv | Love fig. 18: symbols (two readings), curves (adopted), free-flight curve |
| base_ratios_v2_output.txt, base_ratios_v3_output.txt | Data over curve; OpenRocket and Herrin and Dutton against the corrected curves |
| love18_trace_output.txt, love18_trace.json, love18_ransac.json, love18_ff_output.txt, love18_twice_output.txt | Fig. 18 grid model, curve traces, robust fits, free-flight curve, which curve values were read twice |
| love_fig35_tn3819.csv, love_fig35_factor.csv, love_fins_grid66.json, love_fig35_*_output.txt | TN 3819 fig. 35 (fins at the base, M 1.5 to 3.0): readings, grid, fins-on-base factor and its band (first reading) |
| bf_gate_width_output.txt, bf_gate_sum_output.txt | Basic Finner: friction and base shares, transition input, fins-on-base width; expected B5 gate tolerance |
| fin_computations.md, fin_linear_theory_results.json | Linear 3D against strip theory (validated), exact 2D against Ackeret, square leading-edge bound |
| fin_validation_output.txt, fin_validate2_output.txt, fin_tipcone_output.txt | The five checks of finwave.py |
| arcas_fin_check_output.txt, arcas_fin_check_v2_output.txt | ARCAS fins' own drag against the measured increment (v2: resolved readings and chamber change) |
| or_body_factor_output.txt | OpenRocket body friction with its wetted-area factor against VDII |
| band_sum_output.txt | Illustrative linear band combination |
| blunt_te_2d_base.md, blunt_te_2d_base.csv, blunt_te_2d_output.txt (0010) | Two-dimensional base pressure of blunt trailing edges at M 1.5 to 3: TR 1109 figs. 7, 8, 9, 29; RM A51J25 fig. 7; TN 3819 fig. 5; X-15 fin in flight (TN D-1056 table II); the band each would support |
| tr1109_fig29_runs_output.txt, tr1109_fig29b_cols_output.txt, tr1109_fig29a_grid.json, tr1109_fig29b_grid.json, love_fig5_runs_output.txt, love_fig5_cols_output.txt, a51j25_fig7_curve_output.txt (0010) | Column readings behind blunt_te_2d_base.md |
| le_bluntness.md, le_bluntness.csv, le_bluntness_output.txt (0010) | Rounded and blunt leading edges at M 1.5 to 3: TN 2960 figs. 5(c), 7; RM A55H31 eq. (14); RM A53D02 fig. 17; RM L55G28a; the band each would support |
| tn2960_fig7_first_reading.txt, tn2960_fig5c_integration_output.txt, a53d02_fig17_curve_output.txt (0010) | Readings and integration behind le_bluntness.md |
| base_band_ends_output.txt (0010) | The ends of the base band: tunnel envelope inside M 1.5 to 3.0, Herrin and Dutton low end at the audit's reading |
| bf_gate_width_v2_output.txt (0010) | Basic Finner gate sizing corrected (F on the less negative curve, fin friction once, 0010's F band, wall input); reproduces 0010's tolerances |
| band_sum_v2_output.txt (0010) | The illustrative band combination with 0010's fins-on-base half-width (12.2%) |
| fins_at_base_w1.md, fins_at_base_w1.csv, w1_*_output.txt (0015) | First readings for the rebuilt fins-on-base factor (W1 of 0014): TN 2360 fig. 6, TN 3819 figs. 33 to 35, RM L52J21a figs. 8 and 38(c), RM L52E06 fig. 7; method, calibration and errors; the second, blind reading (round 6) paired in fins_at_base_w1_second.csv |
| fins_at_base_w1_second.csv, w1_compare_round6_output.txt (0015) | The round-6 blind second readings of the same figures, restated by ../scripts/w1/round6_second.py, and the value-by-value comparison with the first (../scripts/w1/compare_round6.py): differences, combined errors, flagged disagreements |
| w1_l52j21a_fig31_33d_output.txt, w1_zero_member_check_output.txt (0015) | First reading of RM L52J21a figs. 31 to 33 panel (d) near R 8e6 (../scripts/w1/l52j21a_fig31_33d.py), and the check of the zero member against fig. 8 minus those (../scripts/w1/zero_member_check.py): a check, not a band |
| w2_l52e06_fig8_output.txt (0015 section 11) | First reading of RM L52E06 fig. 8 (../scripts/w1/l52e06_fig8.py), the finless PARD body's base drag: W2's band below Mach 1.5 |
| round7/tn3819_fig18.csv, round7/rml52j21a_figs31-33d.csv, round7/rml52j21a_fig8_lr.csv, w1_round7_pairing_output.txt (0015 sections 3.5, 7, 11.3) | Round 7's blind readings (copied unchanged from docs/research/total-drag/audit/round7/readings/ at 92fb693 and 1cc821d on another branch, method in its method.md): TN 3819 fig. 18's compiled curves and free-flight curve, RM L52J21a figs. 31 to 33 (d) by nose, fig. 8's nose calls at R 8.06e6; paired with the readings held by ../scripts/w1/pair_round7.py, and the zero member re-derived from them |
| w1b_w2_proposal.md, nswc_tr92_509_table2.csv | Research after W1, not implemented: moderately swept fins at the base (NSWCDD/TR-92/509, proposed for registration; its Table 2 at alpha 0, first transcription) and W2, the body base below Mach 1.5 (planning values from registered figures); proposals, bands, coverage and the readings owed |
| *_output.txt (others) | Raw outputs of the scripts below |

Scripts (in `../scripts/`, Python 3, numpy and Pillow only):

| Script | Purpose |
| --- | --- |
| vd2.py | Van Driest II with Karman-Schoenherr; self-check against the TMR file |
| sa_vs_vd.py | CFL3D SA against van Driest II from the TMR files |
| ck_compare.py | Van Driest II against TN 3097 table III |
| friction_study.py | Transition, roughness and correlation sensitivity for representative rockets |
| finwave.py, fin_validate.py, fin_validate2.py, fin_tipcone.py, fin_rect.py, fin_cases.py | Linear supersonic thickness drag of fins and its checks |
| section2d.py | Exact shock-expansion against Ackeret |
| blunt_le.py | Pitot-pressure bound for a square leading edge |
| arcas_fin_check.py, arcas_fin_check_v2.py | ARCAS fins' own drag against the measured fin increment |
| base_conversions.py, base_ratios_v2.py, base_ratios_v3.py | Base drag conversions and ratios |
| band_sum.py | Linear band combination (illustration) |
| d4014_grid.py, d4014_curve.py, d4014_overlay.py | TN D-4014 grid model, faired-curve reader, overlay check |
| f4_ruler.py, f4_clean.py, f4_circles.py | TN D-4014 fig. 4 calibration, declutter view, circle template |
| love18_trace.py, love18_ransac.py, love18_ff.py, love18_twice.py | TN 3819 fig. 18 grid model, robust curve fits, free-flight curve, read-twice count |
| love35_cal.py, love35_read.py, love35_cols.py, love35_track.py, love35_symbols.py, love35_factor.py | TN 3819 fig. 35 calibration, readings, fins-on-base factor |
| bf_gate_width.py, bf_gate_sum.py | Expected width of the Basic Finner gate, first version, kept as the record of its errors (F_high paired with the more negative curve; fin friction counted twice; no wall input) |
| bf_gate_width_v2.py, band_sum_v2.py | The corrected sizing and illustration (0010) |
| base_band_ends.py | Base band ends (0010) |
| tr1109_fig29.py, tr1109_fig29b_cols.py, tr1109_fig8_ruler.py, tr1109_fig8_zoom.py | TR 1109 figs. 29 and 8: calibration, column readings, ruler zooms (0010) |
| a51j25_fig7.py | RM A51J25 fig. 7: calibration, curve runs, ruler zoom (0010) |
| love5_cal.py, love5_read.py, love5_cols.py | TN 3819 fig. 5: calibration and column readings (0010) |
| blunt_te_2d.py | Conversions, comparisons and the X-15 check behind blunt_te_2d_base.md; writes its csv (0010) |
| tn2960_fig7.py, tn2960_fig5c.py | TN 2960 figs. 7 and 5(c): calibration, readings, integration (0010) |
| a53d02_fig17.py | RM A53D02 fig. 17: calibration and ruler zooms (0010) |
| le_bluntness.py | Computations behind le_bluntness.md; writes its csv (0010) |
| chap23b_read.py | TR 1051 fig. 23(b) local grid |
| tn3320_fig9.py, l55_fig5.py | First readings of TN 3320 fig. 9 and RM L55G28a fig. 5 |
| ntrs.sh, ntrs2.py | NTRS search |
| ia_search.py | Internet Archive advanced search (the DTIC mirror) |
| brl934.py | BRL 934: the two Graph II readings compared, yaw-corrected CD per round, Reynolds number estimates, domain checks; writes basic_finner_brl934_output.txt |
| brl934_grid_skew.py, brl934_degrid.py, brl934_ruler_crop.py, brl934_graph2_second.py, brl934_f3_measure.py | BRL 934: grid skew, grid-line removal, ruler crops, Graph II second reading, fig. 3 diameter |
| clean.py, ascii.py, cleanruler.py, xyruler.py, ruler.py, calib.py, near.py, refine_dot.py, dots.py, crop.py | Digitising aids of the first draft |
| w1/ (0015) | The W1 first readings: cal.py (grid lines located locally, interpolation between them), sym.py (symbol template match), colruns.py (curve runs by column), dig.py, montage.py, ov_tile.py and tn2360_fig6_scan.py (aids); one script per figure (tn2360_fig6_read.py with fig6_grids.py, tn3819_fig33_34.py, tn3819_fig35.py, l52j21a_fig38.py, l52j21a_fig8.py, l52e06_fig7.py), each run as `python3 -I script.py IMGDIR` on 300 dpi greyscale page renders kept outside the repository |

In the research scratchpad, downloaded PDFs are in `../pdfs/` (`../pdfs/new/` for TN 3320, TN 3372, RM
L55G28a and NTRS 19930086750; `../pdfs/ia/` for the Basic Finner; `../pdfs/r3/` for TR 1109, TN 2960, RM A52C20,
RM A55H31 and RM A51J25; `../pdfs/r4/` for TN D-1056), web pages
and TMR files in `../web/`, tool manuals in `../tools/`, rendered images in
`../img/` (`../img/d4014/` for the TN D-4014 overlays).
