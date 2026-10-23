"""Write syms_rm3323.json: R&M 3323 fig. 4's symbols as typed by eye on pixel maps.

Each symbol: id, panel, legend glyph (reference number), filled / flagged as
seen, the centre of its ink bounding box read on a pixel map (flags and
gridlines left out) and its sigma in px, notes. Run: python3 -I mk_syms_rm3323.py
"""
import json
import os

PAGE = "/tmp/claude-0/-home-user-bowshock/dd60fc51-836c-5183-86f3-15ab54467394/scratchpad/round13-img/rm3323/p-023-022.png"
# plotted glyph sizes (to the stroke centre, px), measured on pixel maps; sw = stroke half width
SHAPES = {
    "31_half_flat_bottom": ["halfup", 5.75], "31_half_flat_bottom_f": ["halfup_f", 5.75],
    "32_tri_down": ["tri_down", 5.75, 9.0],
    "33_half_flat_top": ["halfdown", 5.75],
    "34_diamond": ["diamond", 6.0], "34_diamond_f": ["diamond_f", 6.0],
    "35_tri_up": ["tri_up", 6.25, 10.0],
    "38_circle": ["circle", 5.25],
    "39_square": ["square", 4.75],
    "40_rtri_right_angle_br": ["rtri_r", 4.5, 8.5],
    "41_rtri_right_angle_bl_f": ["rtri_l_f", 5.5, 10.0],
}
REF = {k: "(" + k[:2] + ")" for k in SHAPES}

# id, type, x, y, sigma_px, flagged, filled, note
P06 = [
    ("m06-01", "38_circle", 1043.5, 618.0, 0.75, False, False, "h/c 10 gridline through it"),
    ("m06-02", "39_square", 927.5, 667.5, 0.75, False, False, ""),
    ("m06-03", "34_diamond_f", 927.0, 687.0, 0.75, False, True, ""),
    ("m06-04", "32_tri_down", 869.5, 680.5, 1.0, False, False, "apex merges with the top of m06-05"),
    ("m06-05", "32_tri_down", 869.0, 691.5, 0.75, True, False, "flag from its top right corner"),
    ("m06-06", "40_rtri_right_angle_br", 824.5, 761.0, 0.75, True, False, "flag continues the hypotenuse beyond the apex"),
    ("m06-07", "32_tri_down", 823.0, 776.0, 0.75, True, False, "flag from its top right corner toward m06-06's base"),
    ("m06-08", "32_tri_down", 824.0, 817.5, 0.75, False, False, ""),
    ("m06-09", "33_half_flat_top", 796.5, 833.5, 0.75, False, False, ""),
    ("m06-10", "33_half_flat_top", 798.5, 886.5, 1.0, False, False, "its top lies on the -0.2 gridline"),
    ("m06-11", "33_half_flat_top", 799.0, 898.0, 0.75, False, False, ""),
    ("m06-12", "32_tri_down", 788.5, 916.5, 1.0, False, False, "its top edge joins m06-13's; no flag seen"),
    ("m06-13", "33_half_flat_top", 801.0, 914.0, 1.0, False, False, "joined to m06-12 along the top"),
    ("m06-14", "32_tri_down", 790.0, 930.0, 0.75, True, False, "flag from its top right corner"),
    ("m06-15", "40_rtri_right_angle_br", 761.0, 966.5, 0.75, True, False, "base runs into the h/c 0 axis"),
    ("m06-16", "40_rtri_right_angle_br", 754.0, 1026.5, 1.0, True, False, "on the h/c 0 axis; base crosses it"),
]
P08 = [
    ("m08-01", "35_tri_up", 1804.5, 486.0, 0.75, False, False, ""),
    ("m08-02", "38_circle", 1687.0, 567.0, 0.75, False, False, "h/c 10 gridline through it"),
    ("m08-03", "31_half_flat_bottom_f", 1806.0, 576.0, 0.75, False, True,
     "dome, flat bottom, filled but for a small hole; typed (31) filled"),
    ("m08-04", "32_tri_down", 1511.5, 618.5, 0.75, False, False, ""),
    ("m08-05", "32_tri_down", 1512.0, 635.0, 0.75, True, False, "flag from its top right corner"),
    ("m08-06", "39_square", 1572.0, 636.5, 0.75, True, False, "flag from its top right corner"),
    ("m08-07", "39_square", 1571.0, 649.5, 1.0, False, False, "the -0.6 gridline through it"),
    ("m08-08", "34_diamond_f", 1571.0, 666.5, 0.75, False, True, ""),
    ("m08-09", "33_half_flat_top", 1483.5, 690.5, 0.75, False, False, ""),
    ("m08-10", "33_half_flat_top", 1483.0, 703.0, 0.75, False, False, ""),
    ("m08-11", "40_rtri_right_angle_br", 1466.5, 740.5, 1.0, True, False, "flag continues the hypotenuse"),
    ("m08-12", "32_tri_down", 1466.5, 752.0, 0.75, True, False, "flag from its top right corner"),
    ("m08-13", "32_tri_down", 1466.5, 766.0, 1.0, False, False, "the -0.4 gridline through it"),
    ("m08-14", "33_half_flat_top", 1441.0, 825.0, 0.75, False, False, ""),
    ("m08-15", "33_half_flat_top", 1440.5, 883.5, 1.5, False, False,
     "on the -0.2 gridline; its bottom merges with m08-16's top; type (33) or (39) square, called (33) by its narrowing sides"),
    ("m08-16", "33_half_flat_top", 1440.5, 891.5, 0.75, False, False, ""),
    ("m08-17", "32_tri_down", 1430.0, 914.5, 1.0, True, False, "flag from its top right corner"),
    ("m08-18", "33_half_flat_top", 1442.0, 919.0, 1.0, False, False, "touches m08-17 and m08-19's flag"),
    ("m08-19", "32_tri_down", 1433.0, 932.5, 0.75, True, False, "flag from its top right corner reaches m08-18"),
    ("m08-20", "40_rtri_right_angle_br", 1403.5, 972.5, 1.0, True, False, "base runs into the h/c 0 axis"),
    ("m08-21", "40_rtri_right_angle_br", 1397.5, 1021.5, 1.0, True, False, "on the h/c 0 axis; base crosses it"),
]
P10 = [
    ("m10-01", "32_tri_down", 875.0, 1824.5, 0.75, False, False, ""),
    ("m10-02", "32_tri_down", 874.0, 1842.5, 0.75, True, False, "flag from its top right corner"),
    ("m10-03", "32_tri_down", 827.0, 1875.5, 1.0, False, False, "the -0.8 gridline through its top"),
    ("m10-04", "32_tri_down", 827.0, 1900.0, 1.0, True, False, "flag from its top right corner; apex merges with m10-05"),
    ("m10-05", "40_rtri_right_angle_br", 831.5, 1906.5, 1.5, True, False,
     "merges with m10-04's apex; its flag runs up to m10-04's right corner"),
    ("m10-06", "32_tri_down", 793.5, 1969.5, 0.75, False, False, ""),
    ("m10-07", "32_tri_down", 793.5, 2014.5, 0.75, True, False, "flag from its top right corner"),
    ("m10-08", "39_square", 933.0, 1860.0, 0.75, True, False, "flag from its top right corner"),
    ("m10-09", "34_diamond", 934.0, 1888.0, 1.5, False, False,
     "open diamond with a 2 px slit inside; its lower apex merges with m10-10's top; could be a filled diamond with a gap"),
    ("m10-10", "39_square", 934.0, 1899.5, 0.75, False, False, ""),
    ("m10-11", "38_circle", 1050.5, 1884.0, 0.75, False, False, "h/c 10 gridline through it"),
    ("m10-12", "35_tri_up", 1168.5, 1849.0, 0.75, False, False, ""),
    ("m10-13", "31_half_flat_bottom_f", 1169.0, 1876.0, 2.0, False, True,
     "flat-bottomed, partly filled glyph whose top half lies under the -0.8 gridline (rows 1873 and 1874); "
     "typed (31) filled by its flat bottom and its h/c, as m08-03 and m12-09; centre from the visible half"),
    ("m10-14", "40_rtri_right_angle_br", 768.0, 2380.0, 1.0, True, False, "base runs into the h/c 0 axis"),
    ("m10-15", "40_rtri_right_angle_br", 760.5, 2428.0, 1.0, True, False, "on the h/c 0 axis; base crosses it"),
]
P12 = [
    ("m12-01", "33_half_flat_top", 1450.5, 2004.5, 0.75, False, False, ""),
    ("m12-02", "33_half_flat_top", 1492.0, 1998.5, 1.0, False, False, "its bottom merges with m12-03's top"),
    ("m12-03", "33_half_flat_top", 1492.5, 2009.0, 0.75, False, False, ""),
    ("m12-04", "39_square", 1581.0, 1966.5, 0.75, True, False, "flag from its top right corner"),
    ("m12-05", "34_diamond_f", 1579.0, 2064.5, 0.75, False, True, ""),
    ("m12-06", "38_circle", 1698.0, 2034.5, 0.75, False, False, "h/c 10 gridline through it"),
    ("m12-07", "41_rtri_right_angle_bl_f", 1697.0, 2094.0, 0.75, False, True,
     "filled right triangle, vertical side on the left; the h/c 10 gridline is broken where it lies"),
    ("m12-08", "35_tri_up", 1813.0, 2014.0, 0.75, False, False, ""),
    ("m12-09", "31_half_flat_bottom_f", 1814.0, 2029.0, 1.0, True, True,
     "flat-bottomed dome with a tail at its top right and its inside partly inked; typed (31), flagged, fill uncertain"),
]


def entry(rows, cond):
    out = []
    for i, t, x, y, sg, flag, fill, note in rows:
        ref = REF[t]
        series = "ref " + ref + (" filled (free flight)" if fill else "") + (" flagged (roughness band)" if flag else "")
        out.append({"id": i, "series": series, "type": t, "manual": [x, y, sg], "note": note})
    return {"page": PAGE, "shapes": SHAPES, "sw": 1.5, "check_fit": True, "conditions": cond, "symbols": out}


S = {
    "r3323f4_m06": entry(P06, "R&M 3323 fig. 4, M = 0.6, zero incidence"),
    "r3323f4_m08": entry(P08, "R&M 3323 fig. 4, M = 0.8, zero incidence"),
    "r3323f4_m10": entry(P10, "R&M 3323 fig. 4 (continued), M = 1.0, zero incidence"),
    "r3323f4_m12": entry(P12, "R&M 3323 fig. 4 (continued), M = 1.2, zero incidence"),
}
json.dump(S, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "syms_rm3323.json"), "w"), indent=1)
