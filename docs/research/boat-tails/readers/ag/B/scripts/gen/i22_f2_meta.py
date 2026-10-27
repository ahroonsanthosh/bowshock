import json, sys
base = sys.argv[1]
XQ = "x/L, body station (x from model nose, L = 8.25 in); printed labels read .80 .82 .86 .88 ... 1.00, axis fitted to the labels .86 to 1.00 (see method)"
YQ = "P, pressure coefficient (p - ps)/q"
sd = {"Shroud 1": {"series": "Shroud 1 (open circle)", "configuration": "shroud 1, d/DB = 0.82"},
      "Shroud 2": {"series": "Shroud 2 (open square)", "configuration": "shroud 2, d/DB = 0.73"}}
J = "jet off (legend: no primary or secondary flow)"
OV = "overlapping symbols in a vertical stack; centre from the visible arcs/edges with a fixed size (circle radius 10 px, square half side 9 px)"
def A(n, sig=1.5, flag="ambiguous", alt=None, alternatives=None):
    d = {"sig": sig, "flag": flag, "note": J + "; " + n}
    if alt: d["alt_px"] = alt
    if alternatives: d["alternatives"] = alternatives
    return d
metas = {
 "a": {"mach": "1.62", "item": "fig. 2(a)", "points": {
   "a1s": {"sig": 1.0, "note": J + "; square's bottom edge on the P = -0.12 grid line"},
   "a1c": A("circle's bottom stroke is doubled (5 px wide against 3 px at the top): possibly two coincident circles, the second about 2 px lower", 1.0,
            alt=[[1115.56, 905.5, "second coincident circle, if present"]]),
   "a2c1": A(OV + "; two circles about 3 px apart; pin dot at 971.9 px", 1.5, alt=[[1240.0, 971.9, "pin dot"]]),
   "a2c2": A(OV + "; lower circle of the pair, only its bottom arc clear (centre = bottom arc - r); pin dot at 977.0 px", 2.0, alt=[[1239.0, 977.5, "bottom arc - 10 px"]]),
   "a2s": {"sig": 1.0, "note": J + "; square's bottom edge on the P = -0.20 grid line"},
   "a3c1": A(OV + "; top circle of three, full outline", 1.0),
   "a3c2": A(OV + "; middle circle, top arc merged with the upper circle's bottom", 1.5),
   "a3c3": A(OV + "; lowest circle, only its bottom crescent visible", 1.5),
   "a4c1": A(OV + "; upper circle of a pair, only its top crescent visible", 1.5),
   "a4c2": A(OV + "; lower circle of the pair, full outline", 1.0),
   "a4c3": A(OV + "; upper circle of a second pair, full outline", 1.0),
   "a4c4": A(OV + "; lower circle of the pair, bottom on the P = -0.08 grid line", 1.0),
   "a4s": {"sig": 1.0, "note": J + "; clean square"},
   "a5c1": A(OV + "; top circle of four, only its top crescent visible", 1.5),
   "a5c2": A(OV + "; second circle of four, top crescent visible", 1.5),
   "a5c3": A(OV + "; third circle, full outline, crossed by the P = 0 grid line", 1.0),
   "a5c4": A(OV + "; fourth circle, bottom arc clear, top merged with the grid line", 1.5),
   "a5s": A(OV + "; square behind the circles: only its bottom edge and lower sides visible (centre = bottom edge - 9 px)", 1.5),
 }},
 "b": {"mach": "1.93", "item": "fig. 2(b)", "points": {
   "b1s1": A("two squares stacked; top square's top edge on the P = -0.08 grid line", 1.0),
   "b1s2": A("lower square of two, its bottom edge merged with circle arcs", 1.5),
   "b1c1": A(OV + "; upper circle of a pair 4 px apart, only its top crescent visible", 1.5),
   "b1c2": A(OV + "; lower circle of the pair, full outline, pin dot at 1641.5 px", 1.0, alt=[[1110.6, 1641.5, "pin dot"]]),
   "b1c3": A("circle just below the stack, crossed by the P = -0.12 grid line", 1.0, flag="ok"),
   "b2c1": A(OV + "; top circle of three, top crescent visible", 1.5),
   "b2c2": A(OV + "; middle circle, full outline, pin dot at 1698.9 px", 1.0, alt=[[1235.72, 1698.9, "pin dot"]]),
   "b2c3": A(OV + "; lowest circle, only its bottom crescent visible (bottom arc at about 1710 px)", 2.0),
   "b2s": A("square under the circles, top edge merged with arcs and the theory curve; centre = bottom edge - 9 px", 1.5),
   "b3c1": A(OV + "; top circle of three, full outline", 1.0),
   "b3c2": A(OV + "; middle circle mostly hidden: only its sides (widest at about 1729 to 1733 px) visible, bottom on the P = -0.16 grid line", 2.5,
             alt=[[1352.9, 1728.9, "outline search"], [1352.5, 1731.0, "widest sides"]]),
   "b3c3": A(OV + "; lowest circle, full outline", 1.0),
   "b3s1": A("two squares stacked under the circles; upper square, pin dot at 1759.5 px", 1.5),
   "b3s2": A("lower square of two, only its bottom edge and lower sides visible (centre = bottom edge - 9 px)", 1.5),
   "b4c1": A(OV + "; top circle of three, only top crescent visible, crossed by the P = -0.16 grid line", 1.5),
   "b4c2": A(OV + "; middle circle, full outline, pin dot at 1752.5 px", 1.0),
   "b4c3": A(OV + "; lowest circle, only its bottom crescent visible", 1.5),
   "b4s": {"sig": 1.0, "note": J + "; clean square"},
   "b5c1": A(OV + "; top circle, crossed by the P = -0.08 grid line", 1.0),
   "b5c2": A(OV + "; second circle, full outline, in front of the squares", 1.0),
   "b5s1": A("stack of squares behind the circles: horizontal edges at 1628.8, 1632.5 and 1640.8 px read as three squares' bottom edges; this one = edge 1628.8 - 9 px", 2.0,
             alternatives="may not be a separate square (the edge could belong to the stack's other strokes)"),
   "b5s2": A("stack of squares behind the circles; this one = bottom edge 1632.5 - 9 px; only the bottom edge is seen", 2.5,
             alternatives="may not be a separate square (the edge could belong to the stack's other strokes)"),
   "b5s3": A("stack of squares; lowest square, bottom edge 1640.8 px and straight sides below the circles", 1.5),
 }},
 "c": {"mach": "2.41", "item": "fig. 2(c)", "points": {
   "c1c1": A(OV + "; upper circle of a pair; a faint short vertical mark above the circle and a vertical streak inside it (pin mark?), not explained by the legend; theory curve crosses between the pair", 1.5,
             alt=[[1106.75, 2298.1, "top arc + 10 px"]]),
   "c1c2": A(OV + "; lower circle of the pair, crossed by the P = -0.08 grid line", 1.0),
   "c2s1": A(OV + "; square behind the circle: only its top edge and upper sides visible (centre = top edge + 9 px)", 1.5),
   "c2c1": A(OV + "; top circle of three, full outline", 1.0),
   "c2c2": A(OV + "; middle circle, bottom crescent visible", 1.5),
   "c2c3": A(OV + "; lowest circle, bottom crescent visible, bottom arc merged with the lower square's top edge", 1.5),
   "c2s2": A("square under the circles, top edge merged with the lowest circle's bottom arc", 1.0),
   "c3c1": A("two circles touching; upper circle, full outline, pin dot", 1.0),
   "c3c2": A("two circles touching; lower circle, full outline", 1.0),
   "c3s": {"sig": 1.0, "note": J + "; clean square, theory curve passes below"},
   "c4c1": A("upper circle of two touching circles, full outline", 1.0),
   "c4c2": A("lower circle of the pair, top on the P = -0.08 grid line", 1.0),
   "c4s1": A("circle drawn inside two overlapping squares: this square's top edge (2353.9 px) and top corners are visible (centre = top edge + 9 px)", 1.5),
   "c4c3": A("circle inside two overlapping squares; full outline", 1.0),
   "c4s2": A("circle inside two overlapping squares: this square's bottom edge (about 2376.5 px) and bottom corners are visible (centre = bottom edge - 9 px)", 2.0,
             alternatives="the two edges could belong to one square drawn larger than the others (centre about 2365 px)"),
   "c4s3": A("square below, bottom edge just under the P = -0.12 grid line; centre = top edge + 9 px", 1.0, flag="ok"),
   "c5c1": A(OV + "; top circle of three, full outline with pin dot, bottom near the P = -0.04 grid line", 1.0),
   "c5c2": A(OV + "; middle circle, top hidden in the grid line", 1.5),
   "c5c3": A(OV + "; lowest circle, only its bottom crescent visible", 2.0),
   "c5s": A("square under the circles, top edge merged with the lowest circle's bottom arc", 1.0),
 }}}
for k, m in metas.items():
    meta = {"xdec": 4, "ydec": 4,
            "common": {"source": "RM L54I22", "item": m["item"], "mach": m["mach"], "x_quantity": XQ, "y_quantity": YQ, "page": "16"},
            "series_defaults": sd, "points": m["points"]}
    json.dump(meta, open(base + "i22_f2%s.json" % k, "w"), indent=1)
print("ok")
