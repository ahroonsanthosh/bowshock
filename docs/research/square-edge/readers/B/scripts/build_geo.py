"""Write geometry.csv for reader B.
usage: python3 -I build_geo.py outdir
"""
import csv
import os
import sys

R = []


def add(src, q, v, u, p, n=""):
    R.append({"source": src, "quantity": q, "value": v, "unit": u, "page": p, "note": n})


S = "TN 4300"
add(S, "model D (pressure model of fig. 7) diameter", "4", "in.", 24, "table I; steel disk; 1 run in the 27- by 27-in. jet; 21 pressure points; model area/jet area 0.017")
add(S, "model A (pressure model of fig. 16) diameter", "12", "in.", 24, "table I; 0.032-in. Inconel disk; runs 1, 2, 3 in the 27- by 27-in. jet; 22 thermocouples and 15 pressure points; runs 1 and 2 identical, for run 3 the disk was rotated 180 deg; model area/jet area 0.155")
add(S, "model B diameter", "12", "in.", 24, "table I; magnesium alloy; 16 thermocouples, no pressures")
add(S, "model C diameter", "4", "in.", 24, "table I; Inconel; thermocouples only; 8-in. diam. jet (area ratio 0.25) and 12- by 12-in. jet (0.087)")
add(S, "corner of the flat face", "sharp (square edge)", "", "27;28", "no corner radius is given anywhere; figure 3 draws plain disks and figure 4(b) draws a square-edged face plate (models A and B, closely similar to C per text); the steel model D is not detailed")
add(S, "model D orifice positions (fig. 3, scaled)", "r/R = 0 (centre); horizontal row: -0.947 (two orifices, just above and below the row), -0.888, -0.824, -0.748, -0.456, -0.249, +0.227, +0.514, +0.729, +0.859, +0.926, +0.982 and +0.986 (two, above and below the row); vertical row: +0.242, +0.767, +0.949 (up), -0.294, -0.602, -0.942 (down)", "r/R (radius over model radius), signed along each row", 27,
    "figure 3 has no dimensions: positions scaled from the drawn dots relative to a least-squares circle fitted to the model outline (centre px 1645.2, 2158.7; radius 212.9 px; fit rms 1.0 px); 21 dots, matching the 21 pressure points of table I; sketch only, the stations plotted in fig. 7 (x/r about 0.25, 0.50, 0.75, 0.87, 0.94, 0.96, 0.98) do not match these scaled values closely")
add(S, "model A orifice positions (fig. 3, scaled)", "centre 0.048; on the horizontal diameter: -0.978, -0.923, -0.876, -0.820, -0.747 (left) and +0.515, +0.745, +0.833, +0.903, +0.950, +0.989 (right); off-axis: 0.801 at 88 deg, 0.698 at 129 deg, 0.726 at 45 deg", "r/R (radius over model radius); angles from the right-hand horizontal, counter-clockwise", 27,
    "scaled from the drawn dots relative to a least-squares circle fitted to the outline (centre px 746.1, 908.0; radius 338.9 px; rms 1.1 px); 15 dots, matching the 15 pressure points of table I; no dimensions in the figure")
add(S, "position of the models in the jet", "face 2 in. downstream of the nozzle, centre line on the jet axis", "", 6, "text")
add(S, "Mach number (jet)", "2", "", "3;6", "text: preflight jet at a Mach number of 2 and sea-level conditions; fig. 7 legend gives M = 2.00 for the present tests")
add(S, "jet total pressure at the data time", "106", "lb/sq in.", 29, "read from figure 5(a) (plateau after the 'Data worked at this time' mark, y px 670 against grid lines 100 at 706.0 and 120 at about 588, 300 dpi); text: conditions did not vary by as much as 1 percent from figure 5 for models A, B and D")
add(S, "jet total temperature at the data time", "945", "deg R", 29, "read from figure 5(b) (plateau y px 1843 against grid lines 940 at 1871.1 and 960 at 1752.7); figure reading, about +-2 deg R")
add(S, "Reynolds number", "14 x 10^6", "per ft", 11, "text: Reynolds number per foot 14 x 10^6 'for the other data in figure 10' (the preflight-jet tests); 2.7 x 10^6 per ft in the Unitary Plan wind tunnel")
add(S, "stated accuracy of the pressures", "not stated as a number", "", 8, "text: solid symbols of fig. 7 were measured by low-range cells (difference from the centre tube) and are considerably more reliable than the open symbols (higher-range total-pressure instruments); pressures on the 12-in. model A were measured less accurately than on model D (also p. 8)")
add(S, "pressure normalisation", "p_l/p_o", "", "7;31;40", "axes of figs. 7 and 16 read p_l/p_o; subscript o = stagnation point (symbols list); text: pressures presented as fractions of the total pressure behind the shock")
add(S, "table I content", "test characteristics only (model, diameter, material, run, jet size, measurements, remarks, model area/jet area)", "", 24, "no pressures, so no tn4300_table1.csv")

S = "RM L57C18"
add(S, "flat-faced models", "B, C, D, F", "", "17;18", "figure 1: A is a 2.5-in. radius hemisphere nose; B, C, D have a flat face with corner radii 1.0, 0.4, 0.1 in.; E is B with a 2.0-in. radius dimple (concave, not flat); F is D with the flat face recessed 0.200 in. behind a 0.1-in. radius lip (included as flat-faced, flagged in method.md)")
add(S, "body shape (all models)", "14.5 deg half-angle cone frustum, 6.000-in. base diameter, 4.115 in. long", "in.", "17;18", "figure 1 dimensions (models A and D carry them); the afterbody is conical, not cylindrical")
add(S, "model B corner radius", "1.0", "in.", 17, "figure 1")
add(S, "model C corner radius", "0.4", "in.", 17, "figure 1")
add(S, "model D corner radius", "0.1", "in.", 18, "figure 1")
add(S, "model F lip radius and face recess", "0.1 rad.; 0.200 deep", "in.", 18, "figure 1")
add(S, "model B flat-face diameter (scaled)", "about 2.7", "in.", 17, "not printed; straight part of the drawn face 159 px against a 350 px base line drawn as 6.000 in.; drawing may not be to scale")
add(S, "model C flat-face diameter (scaled)", "about 3.3", "in.", 17, "not printed; 188 px face against 346 px base")
add(S, "model D flat-face diameter (scaled)", "about 3.7", "in.", 18, "not printed; 211 px face against 342 px base")
add(S, "model F recessed flat-face diameter (scaled)", "about 2.6", "in.", 18, "not printed; 150 px face against 343 px base")
add(S, "model B orifice positions s", ".56, 1.12, 1.78, 2.36, 2.86, 3.36, 4.36, 5.36", "in. along the surface from the centre line", 16, "table II (Distance, S, in.) rows with Cp; s = 0 has h only; figure 1 shows no orifices; fig. 5(b) inset shows 8 tick pairs: 2 on the flat face, 1 on the corner arc, 1 at the arc end, 4 on the cone")
add(S, "model C orifice positions s", ".75, 1.50, 2.30, 2.80, 3.30, 3.80, 4.80, 5.80", "in.", 16, "table II; fig. 5(c) inset: 2 ticks on the face, 1 at the end of the corner arc, 5 on the cone")
add(S, "model D orifice positions s", ".87, 1.75, 1.95, 2.15, 2.65, 3.15, 3.65, 4.65, 5.65", "in.", 16, "table II; fig. 5(d) inset: 2 ticks on the face, 1 on the corner arc, 1 at the arc end, 5 on the cone")
add(S, "model F orifice positions s", ".81, 1.60, 1.95, 2.25, 2.75, 3.25, 3.75, 4.75, 5.75", "in.", 16, "table II; fig. 5(f) inset: 2 ticks on the recessed face, 1 on the lip, 6 on the cone (first just behind the lip)")
add(S, "orifice plane", "same meridian plane as the thermocouples, opposite side", "", 5, "text")
add(S, "Mach number", "2", "", "3;7", "text and summary; 12- by 12-in. preflight jet, sea-level pressure and temperature")
add(S, "total pressure", "115", "lb/sq in. absolute", 7, "text: same for all tests within 1 percent, did not vary during tests more than 1 percent")
add(S, "stagnation temperature", "935", "deg R", 7, "text: varied as much as 2 percent between tests, not more than 1/2 percent during a test")
add(S, "Reynolds number", "about 14 x 10^6", "per ft", "3;4", "summary and introduction (free-stream)")
add(S, "stated accuracy of the pressures", "not stated", "", 8, "the only stated accuracy (about 15 percent) is for the heat-transfer data reduction")
add(S, "pressure normalisation", "C_p = (p_l - p_inf)/q_inf", "", "4;22-27", "symbols list; figure 5 axis C_p")
add(S, "table I content", "sequence of tests (test, model, alpha, surface)", "", 15, "brief expected conditions here; they are in the text. Model B, C, D tested at alpha 0 and 5 deg, E and F at 0 deg only")
add(S, "model position in jet", "tip about 1 in. downstream of the nozzle exit, centre line about 0.25 in. below the nozzle centre line", "", 6, "text")

S = "TM X-19"
add(S, "model diameter", "4.00", "in.", 15, "figure 2 (symbols list: D = 0.3333 ft, r = 0.1667 ft); steel pressure model, separate from the Inconel heat-transfer model")
add(S, "model length", "6.50", "in.", 15, "figure 2")
add(S, "corner", "sharp (square edge)", "", 15, "figure 2 draws a square corner; no radius given")
add(S, "face orifice positions (orifices 1-15, y = 0 line)", "x = -1.95 (y 0.10), -1.85 (y -0.10), -1.75, -1.50, -1.00, -0.50, -0.25, 0.00, 0.25, 0.50, 1.00, 1.50, 1.75, 1.85 (y 0.10), 1.95 (y -0.10)", "in.", 15, "figure 2 table (thermocouple and orifice No., location y, x); pressure orifices 0.050-in. i.d. at the same positions as the thermocouples (text p. 5); x/r = x/2.00")
add(S, "other face orifices (16-25)", "16 (1.95, 0), 17 (1.50, 0), 18 (0.50, 0), 19 (-0.50, 0), 20 (-1.50, 0), 21 (-1.95, 0), 22 (-1.00, 1.00), 23 (1.00, 1.00), 24 (-1.00, -1.00), 25 (1.00, -1.00)", "in. as (y, x)", 15, "figure 2 table")
add(S, "afterbody orifices (26-43)", "z = 0.25, 0.75, 1.25, 1.75, 2.25, 2.75, 3.50, 4.25, 5.00 (26-34 and again 35-43)", "in. from the leading edge", 15, "figure 2 table; not in figure 5")
add(S, "Mach number of figure 5", "2.49", "", 20, "caption; test-section Mach variation +-0.01 at 2.49 (+-0.02 at 3.51, +-0.01 at 4.44), table on p. 4")
add(S, "Reynolds number of figure 5", "0.90 x 10^6", "based on model diameter", 20, "caption; text p. 7: no change from 2.49 to 4.44 at R = 0.90 x 10^6, none on raising R to 1.4 x 10^6")
add(S, "stated accuracy of the pressures", "not stated as a number", "", 8, "text: pressure differentials between the stagnation point and x/r = 0.125 at alpha 0 were within the accuracy of the recording equipment; manometer boards (dibromoethylbenzene) photographically recorded (p. 5)")
add(S, "pressure normalisation", "p_l/p_t,2", "", "5;20", "text: p_t,2 measured by an orifice at the centre of the flat face at alpha 0; caption: ratio to the local pressure at the stagnation point for alpha 0")

S = "TN D-5392"
add(S, "flat-face cylinder", "model 1", "", 67, "figure 1 table: rn/d = infinity, rc/d = 0, s1/d = 0.500, s2/d = 0.500 (model 6 also has rc/d = 0 but rn/d = 1.933, a spherical cap)")
add(S, "afterbody diameter d", "7.5 (191 mm)", "in.", "4;67", "text and figure 1; cylindrical afterbody 4.00 in. (102 mm) long")
add(S, "orifice positions", "74 orifices on meridians phi = 0, 45, 90, 180, 270 deg; face s/d 0 to 0.4800, afterbody s/d 0.5600 to 0.7733", "s/d", "13;31;49;67", "tables (orifice, phi, s/d); figure 1 sketch shows the typical layout; 0.050-in. i.d.; s2/d = 0.500 is the face edge (sharp corner)")
add(S, "Mach numbers", "2.49, 4.06, 4.63", "", 5, "text: test-section deviation +-0.018, +-0.061, +-0.045")
add(S, "stagnation temperature", "610 (339 K) at 2.49; 635 (353 K) at 4.06 and 4.63", "deg R", 6, "text table")
add(S, "Reynolds number", "1.88 x 10^6", "based on afterbody diameter", 6, "text: same for all Mach numbers")
add(S, "stated accuracy of the pressures", "within 1 percent of full scale: 1.44 psf (1-psi gage, orifices marked *) and 14.4 psf (10-psi gage)", "lb/sq ft", "6;7", "text; mercury manometers within 0.5 psf; stagnation-point pressure by precision mercury manometer, 1-psi differential gage readings subtracted from it")
add(S, "pressure normalisation", "p_l/p_t,2", "", "13;31;49", "table heading; p_t,2 = stagnation conditions behind a normal shock at the free-stream Mach number (symbols list)")

with open(os.path.join(sys.argv[1], "geometry.csv"), "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["source", "quantity", "value", "unit", "page", "note"])
    w.writeheader()
    w.writerows(R)
print(len(R), "rows")
