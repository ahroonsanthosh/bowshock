"""Round 11: symbols identified by eye, per figure, for sym_refine.py.

Each entry: (id, legend type, approximate x, approximate y[, options]).
Approximate centres were read off zoomed crops (crop.py at 2x to 3x) and
pixel maps (pixmap.py); the identification is the legend entry, or the
labelled line, whose glyph the symbol matches. "legend" holds the glyph
used as a correlation template (a legend glyph where the figure has a
legend, otherwise an isolated plotted glyph, named in the comment). Most
glyphs here are small, so they are centred by an outline fit ("outline").
"""

FIGS = {
    # R&M 3427 fig. 39 (PDF p. 56, grey JPEG page). No legend: three labelled lines, "Basic model" (solid,
    # circles), "Model with 1 x h splitter plate" (dashed, crosses), "Backward-facing step" (solid, squares).
    # Templates are plotted glyphs at x/h about -1.65 (circle bm-1, cross sp-1, square st-1). The squares are
    # drawn wider than tall (14 to 16 by 12 to 13 px) and are fitted as rectangles.
    "r3427f39": dict(half=9, legend={"circ": (2159.5, 1319.5), "cross": (2157.5, 1311.0), "sq": (2159.0, 1347.0)},
                     outline={"circ": ("circle", 5.75), "cross": ("xcross", 5.0), "sq": ("rect", 6.5, 5.5)},
                     outline_search=3.0,
                     series={"circ": "basic model (solid line, labelled)",
                             "cross": "model with 1 x h splitter plate (dashed line, labelled)",
                             "sq": "backward-facing step (solid line, labelled)"}, symbols=[
        ("bm-1", "circ", 2159.5, 1319.5), ("bm-2", "circ", 2405.0, 1266.5), ("bm-3", "circ", 2495.0, 1194.0),
        ("bm-4", "circ", 2536.5, 1115.0), ("bm-5", "circ", 2576.0, 796.5, {"note": "on the Cp axis (x/h = 0); the solid line ends here"}),
        ("sp-1", "cross", 2157.5, 1311.0, {"e": 2.0, "note": "its lower arms run into circle bm-1"}),
        ("sp-2", "cross", 2403.5, 1259.0, {"e": 2.0, "note": "its lower arms run into circle bm-2"}),
        ("sp-3", "cross", 2495.0, 1207.5, {"e": 2.0, "note": "its upper arms run into circle bm-3"}),
        ("sp-4", "cross", 2535.0, 1177.5), ("sp-5", "cross", 2574.0, 1111.0, {"note": "on the Cp axis (x/h = 0), which hides its middle; the dashed line ends here"}),
        ("st-1", "sq", 2159.0, 1347.0), ("st-2", "sq", 2404.0, 1334.0), ("st-3", "sq", 2492.5, 1312.5),
        ("st-4", "sq", 2535.0, 1290.0), ("st-5", "sq", 2573.5, 1302.5, {"note": "on the Cp axis (x/h = 0)"}),
    ]),
    # R&M 3427 fig. 13 (PDF p. 37), lower set ("On surface upstream of base"), hole 4 only: the line labelled
    # "x/h = -0.167" and circled 4, drawn through upright pluses (hole 1, x/h -1.667, has diagonal crosses).
    # Template: the isolated plus h4-03 (arms 13 px, crossing at (1365, 2019.5) on the pixel map).
    "r3427f13h4": dict(half=8, legend={"plus": (1365.0, 2019.5)}, outline={"plus": ("plus", 6.5)},
                       outline_search=3.0, series={"plus": "hole 4 (surface, x/h = -0.167)"}, symbols=[
        ("h4-01", "plus", 1067.5, 2037.5, {"note": "on the M 0.4 gridline, which hides its vertical arm"}),
        ("h4-02", "plus", 1265.0, 2026.0, {"manual": (1263.75, 2025.5), "e": 1.0, "note": "on the M 0.6 gridline, which hides its vertical arm; the outline fit went 1.3 px left (the line touches the arm), so the centre is from the pixel map: horizontal arm x 1259 to 1268, rows 2025 to 2026"}),
        ("h4-03", "plus", 1365.0, 2019.5),
        ("h4-04", "plus", 1465.0, 2018.5, {"note": "on the M 0.8 gridline, which hides its vertical arm"}),
        ("h4-05", "plus", 1514.0, 2064.5),
        ("h4-06", "plus", 1537.5, 2094.5, {"note": "lowest point of the dip; two rising lines pass within 6 px"}),
        ("h4-07", "plus", 1565.0, 1982.0, {"e": 1.5, "note": "end of the second loop, on the vertical stroke that "
                                            "drops from the hole 1 cross at the top loop; typed a plus because its "
                                            "horizontal arm runs 3 px right of that stroke (x 1561 to 1568, rows "
                                            "1980 to 1981), which a bare junction would not"}),
        ("h4-08", "plus", 1589.0, 2022.0), ("h4-09", "plus", 1614.0, 2062.7), ("h4-10", "plus", 1639.0, 2103.0),
        ("h4-11", "plus", 1714.5, 2220.5, {"note": "last point"}),
    ]),
}

# NASA TN 3548 fig. 6 (PDF p. 17, colour JPEG page rotated 90 deg clockwise; pixel positions are of the
# rotated page). Legend: "o Outboard slit", "square Inboard slit"; both glyphs carry a centre dot. The plotted
# glyphs are 11 to 14 px across and drawn in a light line, so ink is grey < 200 and they are centred by outline
# fits. Templates: the isolated plotted circle at (1207, 847.5) and square at (1259.5, 868.5). Pairs of a
# circle and a square drawn 2 to 10 px apart overlap; there the type is called from the flat or round top and
# bottom edges on 7x to 8x zooms (zoom.py) and the error is raised.
_PAIR = "overlaps the other slit's symbol at the same Mach number; type from its flat or round edge"
_P2 = {"e": 2.0, "note": _PAIR}


def _pm(x, y, edges):
    """A symbol of an overlapping pair, centred from the stroke rows of the pair's top and bottom edges
    (colprofile.py, 5 px wide strip): a square's centre is 4.5 to 5 px below its top edge, a circle's
    5 to 5.5 px above its bottom edge (the isolated glyphs measure 9 to 10 px and 10.5 to 12 px between
    stroke centres)."""
    return {"manual": (x, y), "e": 2.0, "note": _PAIR + "; centre from the edges: " + edges}
FIGS["tn3548f6"] = dict(
    half=8, ink=200, outline_search=2.0,
    legend={"circ": (1207.0, 847.5), "sq": (1259.5, 868.5)},
    outline={"circ": ("circle", 5.75), "sq": ("rect", 4.75, 4.5)},
    series={"circ": "outboard slit (legend circle)", "sq": "inboard slit (legend square)"}, symbols=[
        ("ob-01", "circ", 875.5, 908.0, _pm(876.0, 909.0, "bottom edge row 914 (merges with the Cp -0.55 gridline at 915.9), top edge about 904")), ("ob-02", "circ", 905.0, 913.5),
        ("ob-03", "circ", 932.0, 892.5, _pm(933.25, 892.0, "bottom edge row 897, top edge 887")), ("ob-04", "circ", 961.0, 926.0), ("ob-05", "circ", 995.0, 902.5),
        ("ob-06", "circ", 1027.0, 903.0, _pm(1026.75, 901.75, "bottom edge row 907, top edge about 896.5")), ("ob-07", "circ", 1042.5, 894.5, _pm(1042.0, 893.5, "bottom edge row 899; the two glyphs are drawn almost on top of each other (ink rows 886 to 900, x 1037 to 1048), so this pair is the least certain")),
        ("ob-08", "circ", 1071.5, 878.5, _pm(1071.5, 880.0, "top edge row 875, bottom edge about 885; on the M 0.8 gridline")), ("ob-09", "circ", 1088.0, 887.0), ("ob-10", "circ", 1136.0, 873.5),
        ("ob-11", "circ", 1152.5, 872.0), ("ob-12", "circ", 1171.0, 874.5), ("ob-13", "circ", 1188.0, 862.5),
        ("ob-14", "circ", 1207.0, 847.5), ("ob-15", "circ", 1228.5, 847.0), ("ob-16", "circ", 1251.5, 842.5),
        ("ob-17", "circ", 1259.0, 829.5), ("ob-18", "circ", 1262.0, 793.5), ("ob-19", "circ", 1269.0, 724.0, _pm(1269.0, 725.5, "bottom edge row 731, top edge about 720")),
        ("ob-20", "circ", 1274.0, 641.0), ("ob-21", "circ", 1270.0, 607.5, _pm(1270.0, 609.0, "bottom edge row 614.5, top edge 603.5")), ("ob-22", "circ", 1312.5, 717.0),
        ("ob-23", "circ", 1344.5, 774.0), ("ob-24", "circ", 1366.5, 807.5), ("ob-25", "circ", 1401.0, 868.5),
        ("ob-26", "circ", 1434.0, 909.0), ("ob-27", "circ", 1483.0, 963.5), ("ob-28", "circ", 1508.5, 995.5),
        ("ob-29", "circ", 1550.0, 1027.0), ("ob-30", "circ", 1585.5, 1055.0), ("ob-31", "circ", 1627.5, 1082.5),
        ("ob-32", "circ", 1671.0, 1101.0), ("ob-33", "circ", 1717.0, 1111.5), ("ob-34", "circ", 1761.0, 1127.5),
        ("ob-35", "circ", 1810.0, 1145.5), ("ob-36", "circ", 1859.5, 1158.0), ("ob-37", "circ", 1909.5, 1173.5),
        ("ob-38", "circ", 1962.0, 1182.0, {"note": "last circle; the faired line ends beside it"}),
        ("ib-01", "sq", 875.5, 902.5, _pm(876.0, 902.75, "top edge row 898.5, bottom edge 907")), ("ib-02", "sq", 905.0, 949.0), ("ib-03", "sq", 932.0, 887.5, _pm(933.25, 887.5, "top edge row 883, bottom edge 892")),
        ("ib-04", "sq", 961.0, 879.5), ("ib-05", "sq", 1026.0, 896.0, _pm(1026.75, 895.5, "top edge row 891, bottom edge about 900")), ("ib-06", "sq", 1042.5, 891.0, _pm(1042.0, 891.5, "top edge row 887.5 (the darkest row, top of both glyphs); the two glyphs are drawn almost on top of each other, so this pair is the least certain")),
        ("ib-07", "sq", 1056.0, 888.0), ("ib-08", "sq", 1071.5, 889.5, _pm(1071.5, 889.5, "top edge row 885, bottom edge 894; on the M 0.8 gridline")), ("ib-09", "sq", 1104.0, 881.5),
        ("ib-10", "sq", 1119.5, 877.5, _pm(1120.5, 877.75, "top edge row 873, bottom edge 882.5; typed a square by its flat top, tentatively (see method.md)")), ("ib-11", "sq", 1119.5, 883.0, _pm(1120.5, 882.5, "top edge row 877.5, bottom edge 887.5; typed a square by its flat top and bottom, tentatively (see method.md)")), ("ib-12", "sq", 1136.0, 881.5),
        ("ib-13", "sq", 1152.5, 882.0), ("ib-14", "sq", 1171.0, 896.0), ("ib-15", "sq", 1189.0, 896.0),
        ("ib-16", "sq", 1207.0, 891.0), ("ib-17", "sq", 1229.5, 884.5), ("ib-18", "sq", 1252.5, 882.5),
        ("ib-19", "sq", 1259.5, 868.5), ("ib-20", "sq", 1261.5, 810.5), ("ib-21", "sq", 1269.0, 717.0, _pm(1269.0, 719.0, "top edge row 715, bottom edge about 723")),
        ("ib-22", "sq", 1274.0, 680.0), ("ib-23", "sq", 1270.0, 601.0, _pm(1270.0, 602.5, "top edge row 597.5, bottom edge 607.5")), ("ib-24", "sq", 1312.0, 745.0),
        ("ib-25", "sq", 1344.0, 796.5), ("ib-26", "sq", 1367.0, 840.0), ("ib-27", "sq", 1401.0, 887.5),
        ("ib-28", "sq", 1434.0, 934.0), ("ib-29", "sq", 1483.0, 986.0), ("ib-30", "sq", 1507.5, 1013.5),
        ("ib-31", "sq", 1550.0, 1042.5), ("ib-32", "sq", 1584.5, 1073.0), ("ib-33", "sq", 1627.0, 1099.5),
        ("ib-34", "sq", 1671.0, 1118.5), ("ib-35", "sq", 1716.0, 1130.5), ("ib-36", "sq", 1760.0, 1141.5),
        ("ib-37", "sq", 1809.0, 1162.0), ("ib-38", "sq", 1858.5, 1175.5), ("ib-39", "sq", 1909.0, 1188.0),
        ("ib-40", "sq", 1962.0, 1199.0, {"note": "last square"}),
    ])

# NACA RM A51J25 fig. 7 (PDF p. 14, 300 dpi CCITT), the part below M' 1.5 only. Legend: filled circle
# "Langley, PARD" (rect., AR 2.7); Ames 1 x 3-ft (rect., AR 3): triangle, square and inverted triangle for
# three profiles; Langley 9 x 12 in: diamond (rect., AR 2.7) and a glyph with a slanted flag at its top left
# (delta, AR 4); Langley 9 in (two-dimensional): right triangle; NPL England (two-dimensional, half-model):
# square with a rounded top. Legend glyph bounding-box centres from the pixel map. The filled PARD circles
# merge with the faired line into one band of ink below M' 1.5, read as band edges (band_edges.py), not as
# symbols, except the first circle, whose top and left outline is free.
FIGS["a51j25f7"] = dict(
    half=12, legend={"dia": (1251.5, 747.5), "sq": (1250.5, 653.0), "tri": (1251.5, 603.5),
                     "delta": (1250.5, 787.5), "pard": (1249.0, 560.0)},
    series={"dia": "Langley 9 x 12 in, rect. AR 2.7 (diamond)",
            "sq": "Ames 1 x 3-ft, rect. AR 3 (square, the second profile)",
            "tri": "Ames 1 x 3-ft, rect. AR 3 (triangle, the first profile)",
            "delta": "Langley 9 x 12 in, delta AR 4 (flagged glyph)",
            "pard": "Langley, PARD, rect. AR 2.7 (filled circle)"},
    symbols=[
        ("pard-1", "pard", 719.5, 872.0, {"manual": (719.5, 872.0), "e": 2.0, "note": "first filled circle at the "
         "top left end of the band; centre from its free top and left outline (x 711 to 727, y 864 to 880, "
         "16 px like the legend's); its lower right merges with the band"}),
        ("sq-1", "sq", 737.0, 925.0, {"manual": (736.75, 925.0), "e": 2.0, "note": "a square and a triangle "
         "drawn over each other; square from its flat top (rows 916 to 919) and sides (stroke centres x 730 and "
         "743.5), taken 19 px tall like the legend's; its bottom edge is hidden by the triangle"}),
        ("tri-1", "tri", 738.0, 932.5, {"manual": (738.0, 932.5), "e": 2.0, "note": "the triangle inside "
         "square sq-1: apex row 924, base rows 938 to 941, x 728 to 748; bounding-box centre"}),
        ("delta-1", "delta", 780.75, 905.0, {"manual": (780.75, 905.0), "e": 2.0, "note": "flagged glyph "
         "(slanted stroke from x 773, y 894) with its box (x 777 to 788, top row 900); its bottom edge (rows "
         "914 to 916) merges with the band; bounding-box centre, as for the legend glyph"}),
        ("dia-1", "dia", 783.5, 951.5, {"note": "isolated, below the band"}),
        ("sq-2", "sq", 804.0, 925.0, {"manual": (804.0, 925.0), "e": 2.0, "note": "at M' 1.50, the limit of "
         "this reading; a square and a triangle drawn over each other at the band's end, as sq-1 and tri-1: "
         "flat top rows 914 to 918, stroke centres x 797 and 811"}),
        ("tri-2", "tri", 807.5, 929.5, {"manual": (807.5, 929.5), "e": 2.5, "note": "at M' 1.50; the triangle "
         "inside square sq-2: apex (805.5, 921), base rows 935 to 938, merging with a filled circle below"}),
    ])
