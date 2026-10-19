# Data transcriptions and computation outputs for draft 0008 (total drag)

Research material behind docs/design/0008-total-drag.md. Revised after the
audit (`../audit/audit.md`) and its second round (`../audit/round2/`).

| File | Content |
| --- | --- |
| arcas_tn-d-4014_tn-d-4013.md, arcas_ca_alpha0.csv | ARCAS half-scale models: geometry, conditions, stated accuracy, CA at alpha 0 (resolved readings), chamber force, fin increments |
| d4014/tn-d-4014_CA_alpha0_resolved.csv | TN D-4014 CA at alpha 0: first, audit and third readings, adopted values, reading rule |
| d4014/tn-d-4014_fig4_chamber.csv | TN D-4014 fig. 4 chamber axial-force coefficient near alpha 0 (first reading) |
| d4014/grid*.json, curve*.json | Grid-line fits and curve readings behind the two files above |
| basic_finner_ada636861.md, .csv | Basic Finner in free flight (DREV range): geometry, conditions, accuracy, CX0 per shot (hold-out set) |
| basic_finner_stats_output.txt | Scatter between Basic Finner shots; 6DOF against linear-theory values |
| validation_candidates.md | Other candidates opened: RM L55G28a, TN 3320 (RM-10 flight base pressure), TR R-100 survey, TN 3372; sting-free base data |
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
| bf_gate_width.py, bf_gate_sum.py | Expected width of the Basic Finner gate |
| chap23b_read.py | TR 1051 fig. 23(b) local grid |
| tn3320_fig9.py, l55_fig5.py | First readings of TN 3320 fig. 9 and RM L55G28a fig. 5 |
| ntrs.sh, ntrs2.py | NTRS search |
| clean.py, ascii.py, cleanruler.py, xyruler.py, ruler.py, calib.py, near.py, refine_dot.py, dots.py, crop.py | Digitising aids of the first draft |

In the research scratchpad, downloaded PDFs are in `../pdfs/` (`../pdfs/new/` for TN 3320, TN 3372, RM
L55G28a and NTRS 19930086750; `../pdfs/ia/` for the Basic Finner), web pages
and TMR files in `../web/`, tool manuals in `../tools/`, rendered images in
`../img/` (`../img/d4014/` for the TN D-4014 overlays).
