# Data transcriptions and computation outputs for draft 0007

Draft material for review; nothing here is in the repository.

| File | Content |
| --- | --- |
| arcas_tn-d-4014_tn-d-4013.md, arcas_ca_alpha0.csv | ARCAS half-scale models: geometry, conditions, stated accuracy, CA at alpha 0 digitised (M 1.0 to 2.96), fin increments |
| rm-a53d02.md, rm-a53d02_cd.csv | Fin-stabilised L/d 10 body in free flight: geometry, table I, CD digitised (M 1.04 to 3.3) |
| friction_sources.md | TN 3097 table III with the van Driest II comparison, RM L54G14 flight friction, TN D-2896, TN D-6945, TMR files, hobby-tool correlations, friction sensitivity study |
| chapman_kester_tn3097_table3.csv | TN 3097 table III |
| base_sources.md | Love fig. 18 (digitised), Chapman sting interference, Spahr and Dickey, Herrin and Dutton via Tucker, TR 1160, OpenRocket base drag |
| love_tn3819_fig18.csv | Love fig. 18 readings |
| fin_computations.md, fin_linear_theory_results.json | Linear 3D against strip theory (validated), exact 2D against Ackeret, square leading-edge bound, ARCAS fin increment check |
| *_output.txt | Raw outputs of the scripts below |

Scripts (in `../scripts/`, Python 3, numpy and Pillow only):

| Script | Purpose |
| --- | --- |
| vd2.py | Van Driest II with Karman-Schoenherr; self-check against the TMR file |
| sa_vs_vd.py | CFL3D SA against van Driest II from the TMR files |
| ck_compare.py | Van Driest II against TN 3097 table III |
| friction_study.py | Transition, roughness and correlation sensitivity for representative rockets |
| finwave.py, fin_validate.py, fin_validate2.py, fin_rect.py, fin_cases.py | Linear supersonic thickness drag of fins and its checks |
| section2d.py | Exact shock-expansion against Ackeret |
| blunt_le.py | Pitot-pressure bound for a square leading edge |
| arcas_fin_check.py | ARCAS fins' own drag against the measured fin increment |
| base_conversions.py | OpenRocket base drag against Love; Herrin and Dutton ratios to CD |
| clean.py, ascii.py, cleanruler.py, xyruler.py, ruler.py, calib.py, near.py, refine_dot.py, dots.py, crop.py | Digitising aids (grid removal, pixel printouts, ruler overlays) |

Downloaded PDFs are in `../pdfs/`, web pages and TMR files in `../web/`,
tool manuals in `../tools/`, rendered images in `../img/`.
