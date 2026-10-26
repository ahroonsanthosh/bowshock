# Builds the measure.py config for RM A52E20 figure 15 (PDF page 44).
import json, sys
A = sys.argv[1]
def XL(pos):
    v = [1.0 + 0.5 * k for k in range(11)]
    return [[pos[k], v[k], 1 if k % 2 == 0 else 0] for k in range(11)]
def YL(pos):
    v = [-0.24, -0.20, -0.16, -0.12, -0.08, -0.04, 0.0]
    return [[pos[k], v[k], 1] for k in range(7)]
YQ = "base pressure coefficient, Pb (axis label) = (pb - p0)/q0, referred to free-stream conditions (RM A52E20 symbol list, PDF p. 4); corrected for condensation (caption)"
cfg = {
 "image": A + "/render/a52e20_p44-000.jpg", "rot": 0, "page": 44, "source": "RM A52E20", "item": "fig. 15",
 "csv": "rma52e20_fig15.csv", "nd_x": 3, "mach_from_x": True, "maxw": 12, "line_half": 9,
 "xq": "Mach number, M0 (subscript 0 = free stream, symbol list PDF p. 5)", "yq": YQ,
 "symbols": {"circle": {"kind": "circle", "h": 8.5, "t": 2.0, "hrange": [7, 10]},
             "square": {"kind": "square", "h": 8, "t": 2.0, "hrange": [7, 9.5]},
             "cross": {"kind": "plus", "h": 6, "t": 1.0}},
 "panels": {
  "a": {"box": [685, 328, 2044, 1140], "xband": [745, 1133], "yband": [692, 1340],
        "xlines": XL([685, 819, 955.5, 1091.7, 1228, 1364.3, 1500, 1635.7, 1771.8, 1907.9, 2044]),
        "ylines": YL([328.1, 462.0, 598.4, 734.7, 870.7, 1006.0, 1140.4]),
        "item": "fig. 15(a)",
        "note": "panel (a): laminar boundary layer, Re = 3.0 x 10^6 (panel title); the symbol list (PDF p. 5) defines Re as based on model length"},
  "b": {"box": [681, 1543, 2039, 2362], "xband": [1962, 2355], "yband": [688, 1340],
        "xlines": XL([681, 815, 951, 1087, 1223, 1360, 1494.7, 1631, 1767, 1903, 2039]),
        "ylines": YL([1543.4, 1679.2, 1815.1, 1951.8, 2088.2, 2226.0, 2361.8]),
        "item": "fig. 15(b)",
        "note": "panel (b): turbulent boundary layer, Re = 5.0 x 10^6 (panel title); the symbol list (PDF p. 5) defines Re as based on model length"},
 },
 "points": []
}
UNB = "ogive-cylinder, l/d = 7 (legend sketch), no boattail; alpha 0 deg"
BT = "ogive-cylinder with boattail, l/d = 7 (legend sketch); alpha 0 deg"
def add(panel, sym, x, y, series, conf, **kw):
    d = {"panel": panel, "sym": sym, "x": x, "y": y, "series": series, "configuration": conf, "dot": True, "use_dot": True, "dot_r": 4, "sigma": 0.5}
    d.update(kw)
    d["note"] = (d.get("note", "") + ("; " if d.get("note") else "") + "Mach number read from the x axis (M0, free stream); the mach column repeats the x reading")
    cfg["points"].append(d)
add("a", "circle", 821.5, 455.9, "circle, From Ref. 4", UNB, note="centre dot visible; laminar boundary layer, Re = 3.0 x 10^6 (panel title)")
add("a", "circle", 958, 625.8, "circle, From Ref. 4", UNB, note="centre dot visible; laminar boundary layer, Re = 3.0 x 10^6 (panel title)")
add("a", "square", 822.2, 720.8, "square, From Ref. 10", BT, note="centre dot visible; laminar boundary layer, Re = 3.0 x 10^6 (panel title)")
add("b", "circle", 817.1, 1816.3, "circle, From Ref. 4", UNB, note="centre dot visible; turbulent boundary layer, Re = 5.0 x 10^6 (panel title)")
add("b", "circle", 951.7, 1893.1, "circle, From Ref. 4", UNB, note="centre dot visible; the circle outline is faint and broken on the scan; turbulent boundary layer, Re = 5.0 x 10^6 (panel title)")
add("b", "square", 813.9, 2295.3, "square, From Ref. 11", BT, note="centre dot visible; turbulent boundary layer, Re = 5.0 x 10^6 (panel title)")
add("b", "square", 937.6, 2191.9, "flagged square, From unpublished data NACA Ames 1- by 3-foot SSWT", BT, note="centre dot visible; flag at upper right; turbulent boundary layer, Re = 5.0 x 10^6 (panel title)")
add("b", "square", 1196.6, 2149.7, "square, From Ref. 11", BT, note="centre dot visible; the square sits on the dashed present-tests curve for model 8; turbulent boundary layer, Re = 5.0 x 10^6 (panel title)")
json.dump(cfg, open(sys.argv[2], "w"), indent=1)
cfg = json.load(open(sys.argv[2]))
UN = ("drawn only as a curve (a fairing of the present tests, no symbols); the brief does not name this curve, so under rule 7 it is not read; "
      "it spans about M0 %s in this panel")
cfg["extra_rows"] = [
 {"item": "fig. 15(a)", "series": "Present tests, Model 3 (solid line)", "configuration": UNB, "flag": "untraced", "note": UN % "2.6 to 4.7 (a second solid curve, the vacuum limit -2/(gamma M0^2), is theory)" + "; laminar boundary layer, Re = 3.0 x 10^6 (panel title)"},
 {"item": "fig. 15(a)", "series": "Present tests, Model 8 (dashed line)", "configuration": BT, "flag": "untraced", "note": UN % "3.1 to 4.7" + "; laminar boundary layer, Re = 3.0 x 10^6 (panel title)"},
 {"item": "fig. 15(b)", "series": "Present tests, Model 3 (solid line)", "configuration": UNB, "flag": "untraced", "note": UN % "2.6 to 4.7 (a second solid curve, the vacuum limit -2/(gamma M0^2), is theory)" + "; turbulent boundary layer, Re = 5.0 x 10^6 (panel title)"},
 {"item": "fig. 15(b)", "series": "Present tests (dashed line, model 8 per the legend sketch)", "configuration": BT, "flag": "untraced", "note": UN % "2.6 to 4.7" + "; turbulent boundary layer, Re = 5.0 x 10^6 (panel title)"},
]
json.dump(cfg, open(sys.argv[2], "w"), indent=1)
