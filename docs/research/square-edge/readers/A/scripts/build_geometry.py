"""Write reader A's geometry.csv (source,quantity,value,unit,page,note).
usage: python3 -I build_geometry.py OUT.csv
Values are as printed unless the note says 'scaled from the sketch' or
'derived from printed dimensions'.
"""
import sys, csv, math

R = []
def add(src, q, v, u, p, n=""):
    R.append(dict(source=src, quantity=q, value=v, unit=u, page=p, note=n))

T = "TN 4300"
add(T, "models tested (table I)", "A, B, C, D", "", 24, "A: 12 in., 0.032\" Inconel, runs 1-3, 27 by 27 in. jet, 22 thermocouples and 15 pressure points (runs 1 and 2 identical; for run 3 the disk was rotated 180 deg). B: 12 in., 0.064\" magnesium alloy (AZ31A-O), 16 thermocouples. C: 4 in., 0.032\" Inconel, 7 thermocouples, 8 in. diam. and 12 by 12 in. jets. D: 4 in., steel, 27 by 27 in. jet, 21 pressure points")
add(T, "diameter, model D (pressure model of fig. 7)", "4", "in.", 24, "table I")
add(T, "diameter, model A (pressure model of fig. 16)", "12", "in.", 24, "table I")
add(T, "model area / jet area, model D", "0.017", "", 24, "table I")
add(T, "model area / jet area, model A", "0.155", "", 24, "table I")
add(T, "corner", "sharp (no radius shown)", "", 28, "fig. 4 side view: thin face disk (0.032\" Inconel for A and C, steel for D) on mahogany and steel backing; square edge; figs. 3 and 4 give no corner radius")
add(T, "pressure orifice positions, model D", "21 dots", "", 27, "fig. 3 is an undimensioned sketch; r/R scaled from the drawing (circle fitted to the outline, R = 212.96 px): centre 0.025 (dot merged with a centre tick); horizontal diameter left: 0.249, 0.457, 0.747, 0.824, 0.887, 0.948 (two dots, just above and below the line); right: 0.227, 0.514, 0.730, 0.859, 0.925, 0.969 and 0.974 (two dots at the edge, above and below the line); vertical up: 0.240, 0.767, 0.949; down: 0.294, 0.601, 0.942. Sketch spacing is schematic (the same orifices plot at x/r 0.25, 0.5, 0.75, 0.87, 0.94, 0.96, 0.98 in fig. 7)")
add(T, "pressure orifice positions, model A", "15 dots", "", 27, "scaled from the sketch (R = 338.87 px): centre 0.048; main ray right (about 2 deg): 0.515, 0.745, 0.832, 0.902, 0.949, 0.987; main ray left (about 176 deg): 0.747, 0.820, 0.876, 0.923, 0.978; 45 deg: 0.725; 88 deg: 0.801; 129 deg: 0.699 (the last three and the 0.745/0.747 pair are the 75-percent stations of fig. 16(b), drawn between 0.70 and 0.80)")
add(T, "Mach number", "2", "", 3, "text PDF pp. 3-4: preflight jet at a Mach number of 2, sea-level conditions; fig. 7 legend: M = 2.00")
add(T, "jet total pressure at the data time", "about 106", "lb/sq in.", 29, "read from the fig. 5(a) curve at 2.0 s (\"Data worked at this time\"), not printed as a number; text: for models A, B and D conditions did not vary as much as 1 percent from fig. 5")
add(T, "jet total temperature at the data time", "about 946", "deg R", 29, "read from the fig. 5(b) curve at 2.0 s; levels off near 944 deg R by 2.4 s; not printed as a number")
add(T, "Reynolds number", "14 x 10^6", "per ft", 11, "text: 'the Reynolds number per foot was 2.7 x 10^6 in the Unitary Plan wind tunnel and 14 x 10^6 for the other data in figure 10' (heat-transfer data); no Reynolds number is given for the pressure data of figs. 7 and 16 beyond 'sea-level' (summary)")
add(T, "Reynolds number, Unitary tunnel 4-in. model", "2.7 x 10^6", "per ft", 11, "same sentence; stated for the heat-transfer test, M = 2.49")
add(T, "stated pressure accuracy", "not stated as a number", "", 8, "text PDF p. 8: the solid symbols were measured by low-range cells (difference from the centre-tube pressure) and are considerably more reliable than the open symbols, measured with total-pressure instruments of higher range; appendix B (PDF p. 16): the 12-in. model pressures differ from the 4-in. ones by more than the spread")
add(T, "pressure normalisation", "p_l/p_o", "", 7, "text PDF p. 7: pressures presented 'as fractions of the total pressure behind the shock'; axis label p_l/p_o; subscript o = stagnation point")
add(T, "comparison models in fig. 7", "4-in. model, Unitary tunnel, M = 2.49; 3-in. model, ref. 3 figure 4, M = 2.01", "", 31, "legend and text PDF p. 8; both flat faces")

M = "RM L57C18"
add(M, "flat-faced models", "B, C, D, F", "", 17, "fig. 1: B, C, D flat faces with corner radii 1.0, 0.4, 0.1 in.; F as D with a 0.200-in. flat depression in the face (text PDF p. 5); A is a hemisphere (2.5 rad.) and E has a 2.0-in.-radius dimple (1.0 rad. corner), so neither is flat-faced; the text (PDF p. 9) groups B, C, D and F as 'flat-faced models'")
add(M, "corner radius, model B", "1.0", "in.", 17, "fig. 1(a) '1.0 rad.'; circular-arc corner")
add(M, "corner radius, model C", "0.4", "in.", 17, "fig. 1(a) '0.4 rad.'")
add(M, "corner radius, model D", "0.1", "in.", 18, "fig. 1(b) '0.1 rad.'")
add(M, "corner radius, model F", "0.1", "in.", 18, "fig. 1(b) '0.1 rad.' at the lip of the 0.200-in. depression")
add(M, "depression depth, model F", "0.200", "in.", 18, "fig. 1(b) dimension 0.200 (text: '0.2-inch flat depression on the nose')")
add(M, "base diameter (all models)", "6.000", "in.", 17, "fig. 1, '6.000 diam.' (drawn on A and D; text: A to D differ only in flat size and corner radius)")
add(M, "length, face to base", "4.115", "in.", 17, "fig. 1 (A and D)")
add(M, "cone half-angle of afterbody", "14.5", "deg", 17, "fig. 1 (A and D); conical afterbody, not cylindrical")
Rf = 3.0 - 4.115 * math.tan(math.radians(14.5)); t = math.tan(math.radians(75.5 / 2)); arc = math.radians(75.5)
for m, rc in (("B", 1.0), ("C", 0.4), ("D", 0.1)):
    a = Rf - t * rc
    add(M, f"face diameter, model {m}", f"{2 * a:.3f}", "in.", 17 if m != "D" else 18,
        f"not printed; derived from printed dimensions (6.000, 4.115, 14.5 deg, {rc} rad.) assuming the corner arc is tangent to the face and the cone: face edge at s = {a:.3f} in., corner ends at s = {a + rc * arc:.3f} in.; used only to check the orifice locations shown on the fig. 5 inset sketches")
add(M, "face diameter, model F", "not printed", "", 18, "as model D apart from the depression; the sketch does not give the recessed face diameter")
add(M, "orifice positions", "see rml57c18_fig5.csv (s of each plotted point)", "", "23-27", "fig. 1 shows no orifices; fig. 5 insets show tick marks: B 2 on face, 1 on the corner arc, 1 at the arc-cone junction, 4 on the cone; C 2 on face, 6 on the cone; D 1 on face, a crowded group at the corner, 6 on the cone; F 2 on face, marks on the lip, 6 on the cone. Pressure tubes in the plane of the thermocouples, opposite side (text PDF p. 5)")
add(M, "Mach number", "2", "", 7, "text PDF p. 7: tests at a Mach number of 2 (12- by 12-in. preflight jet)")
add(M, "Reynolds number", "approximately 14 x 10^6", "per ft", 4, "text PDF pp. 3-4: free-stream Reynolds number per foot approximately 14 x 10^6")
add(M, "total pressure", "115", "lb/sq in. abs", 7, "text PDF p. 7: same for all tests within 1 percent, steady within 1 percent")
add(M, "stagnation temperature", "935", "deg R", 7, "text PDF p. 7: varied up to 2 percent between tests, 1/2 percent within a test")
add(M, "angles of attack (table I)", "0 and 5", "deg", 15, "table I: alpha 0 tests are 3 (A), 4 (B), 9 (C), 10 (D), 13 (E), 14 (F); table I holds no Mach or Reynolds number")
add(M, "stated pressure accuracy", "not stated", "", 8, "the 'approximately 15 percent' on PDF p. 8 is the overall accuracy of the heat-transfer data reduction")
add(M, "pressure normalisation", "C_p = (p_l - p_inf)/q_inf", "", 4, "symbols list: pressure coefficient (p_l - p_inf)/q_inf; fig. 5 axis C_p")

X = "TM X-19"
add(X, "diameter", "4.00", "in.", 15, "fig. 2 side view; symbols list: D = 0.3333 ft, r = 0.1667 ft")
add(X, "length of model drawn", "6.50", "in.", 15, "fig. 2")
add(X, "corner", "sharp (no radius shown)", "", 15, "fig. 2 side view shows a square corner")
add(X, "orifices", "43, 0.050 in. inside diameter", "", 5, "text PDF p. 5: pressure orifices in the same positions as the thermocouples of fig. 2 (pressure model machined from solid steel)")
face = [(1, "0.10", "-1.95"), (2, "-0.10", "-1.85"), (3, "0.00", "-1.75"), (4, "0.00", "-1.50"), (5, "0.00", "-1.00"), (6, "0.00", "-0.50"), (7, "0.00", "-0.25"),
        (8, "0.00", "0.00"), (9, "0.00", "0.25"), (10, "0.00", "0.50"), (11, "0.00", "1.00"), (12, "0.00", "1.50"), (13, "0.00", "1.75"), (14, "0.10", "1.85"),
        (15, "-0.10", "1.95"), (16, "1.95", "0.00"), (17, "1.50", "0.00"), (18, "0.50", "0.00"), (19, "-0.50", "0.00"), (20, "-1.50", "0.00"), (21, "-1.95", "0.00"),
        (22, "-1.00", "1.00"), (23, "1.00", "1.00"), (24, "-1.00", "-1.00"), (25, "1.00", "-1.00")]
for o, y, x in face:
    add(X, f"orifice {o} location (y, x) on the face", f"{y}, {x}", "in.", 15, "fig. 2 table 'Location y x', typed from the image (text layer checked digit by digit, it agrees for these columns); location: face")
aft = [(26, "0.25"), (27, "0.75"), (28, "1.25"), (29, "1.75"), (30, "2.25"), (31, "2.75"), (32, "3.50"), (33, "4.25"), (34, "5.00"),
       (35, "0.25"), (36, "0.75"), (37, "1.25"), (38, "1.75"), (39, "2.25"), (40, "2.75"), (41, "3.50"), (42, "4.25"), (43, "5.00")]
for o, z in aft:
    add(X, f"orifice {o} location z", z, "in.", 15, "fig. 2 table 'Location z' (axial distance along the cylindrical afterbody from the leading edge); location: afterbody; two rows (26-34 and 35-43)")
add(X, "Mach numbers of pressure tests", "2.49, 3.51, 4.44", "", 4, "text PDF p. 7: pressure distribution for every 0.5 increment in Mach number from 2.49 to 4.44; PDF p. 4 table of Mach variation near the pressure model: 2.49 +-0.01, 3.51 +-.02, 4.44 +-.01")
add(X, "Mach number, fig. 5", "2.49", "", 20, "fig. 5 caption")
add(X, "Reynolds number, fig. 5", "0.90 x 10^6", "", 20, "fig. 5 caption; R based on model diameter (symbols list); text PDF p. 7: pressures also at 1.4 x 10^6 with no noticeable effect")
add(X, "stated pressure accuracy", "not stated as a number", "", 8, "text PDF pp. 5 and 8: manometer boards with dibromoethylbenzene, photographed; differentials from the stagnation point to x/r 0.125 were within the accuracy of the recording equipment")
add(X, "pressure normalisation", "p_l/p_t,2", "", 5, "text PDF p. 5: local pressures on the front face reduced to p_l/p_t,2, p_t,2 measured by the orifice at the centre of the flat face at alpha 0; fig. 5 caption says the same in words")

D = "TN D-5392"
add(D, "flat-face cylinder", "model 1", "", 67, "fig. 1 table: rn/d infinite, rc/d 0, s1/d 0.500, s2/d 0.500 (model 1 is the only row with rc/d 0 and rn/d infinite)")
add(D, "afterbody diameter d", "7.5 (191 mm)", "in.", 67, "fig. 1 and text PDF p. 6")
add(D, "afterbody length", "4.00 (102 mm)", "in.", 67, "fig. 1 and text PDF p. 6 (cylindrical)")
add(D, "corner, model 1", "rc/d = 0 (sharp)", "", 67, "fig. 1 table")
add(D, "face extent", "s/d 0 to 0.500", "", 67, "s1/d = s2/d = 0.500; orifices with s/d > 0.5 are on the afterbody")
add(D, "orifices", "about 80 of 0.050 in. (1.27 mm) i.d.; model 1 tables list 74", "", 6, "text PDF p. 6 and fig. 1 sketch; positions phi and s/d as printed in tables I to III (see the table CSVs)")
add(D, "Mach numbers", "2.49 (+-0.018), 4.06 (+-0.061), 4.63 (+-0.045)", "", 5, "text PDF p. 5: deviation over the test section")
add(D, "stagnation temperature", "610 deg R (339 K) at 2.49; 635 (353 K) at 4.06 and 4.63", "", 6, "text PDF p. 6 table")
add(D, "Reynolds number", "1.88 x 10^6", "", 6, "text PDF p. 6: based on afterbody diameter, same at all Mach numbers")
add(D, "angles of attack", "nominal 0, 5, 10, 15; tables also give -5, -10, -15", "deg", 6, "text PDF p. 6; tables I to III columns")
add(D, "stated pressure accuracy", "1 percent of full scale: 1.44 psf (1-psi gage) and 14.4 psf (10-psi gage); manometers within 0.5 psf", "", 7, "text PDF p. 7; starred orifices measured by the 1-psi differential gage from the stagnation point")
add(D, "pressure normalisation", "p_l/p_t,2", "", 13, "table heading; p_t,2 = stagnation conditions behind a normal shock at the free-stream Mach number (symbols); text PDF p. 8 implies p_t,2 is computed")

with open(sys.argv[1], "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["source", "quantity", "value", "unit", "page", "note"])
    w.writeheader(); w.writerows(R)
print(len(R), "rows")
