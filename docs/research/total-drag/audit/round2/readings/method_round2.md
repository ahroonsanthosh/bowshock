# Round 2 second readings: method notes

All readings were made before the first agent's corresponding files were opened. PDFs rendered with pdftoppm at the scans' native 300 dpi (Basic Finner at 150 dpi: typed tables, read as text from the page image, not from the OCR layer, which garbles several digits, for example "Dl\95022010" and "l.ll6").

Basic Finner (DTIC ADA636861): Table VIII single fits, Table IX multiple fits, Table V Reynolds numbers, tables I and II and fig. 2 for geometry. Typed values: transcription error zero by construction; each row was read twice from the image. Interpretation notes: Cxo is "axial force coefficient at zero angle of attack" on the cross-sectional area; CX2 marked (*) means held fixed, not fitted; for the multiple-fit groups at M 1.832, 2.375, 2.718, 3.147 the text says unique Cxo were solved per shot, so the CX printed for the group carries (*) and is not a fitted common value.

TN D-4014 fig. 4 (chamber axial force): gridlines located by row profiles near alpha 0 (labels .04, .08, .12 identified by glyph rows: 4(a) labels at y 380, 532, 688.5 px and 1153.5, 1305, 1461.5; 4(b) at 544.5, 705, 863.5 and 1179.5, 1341.5, 1500). Symbols at the alpha-0 columns overlap (four Mach numbers within 5 px on the fins-on panels), so identity is the main error; symbols read on 4x to 10x zooms with and without grid removal (scripts/degrid.py).

TN 3320 fig. 9 (base pressure, RM-10 with fins, flight): gridlines every 0.2 M and 0.05 in P_B (labels -.3, -.2, -.1, 0 at y 1640.5, 1891, 2142, 2392.5; M .8 to 3.2 at x 570 to 2072); lines tilt 4 px across. Symbol centre dots found automatically (scripts/specks.py, isolated dark specks with a clear annulus), each classified by shape on labelled zoom views (Model 1 full scale circles, Model A squares, Model E pentagons, Model D quarter-rounds, Model C triangles). Error +-0.008 in M and +-0.002 in P_B per symbol. The cluster of half-scale symbols at M 2.6 to 3.0 overlaps; only clear centres are listed, and the cluster spans P_B -0.066 to -0.088.

RM L55G28a fig. 5: see the CSV header.
