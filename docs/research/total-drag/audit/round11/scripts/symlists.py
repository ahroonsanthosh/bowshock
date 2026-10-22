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
}
