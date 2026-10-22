"""Write the spec of one TN 3372 symbol panel (figs. 7 to 10) from the
probe's numbers: every panel has the same axes (M 0.6 to 1.2 by 0.05 and
Delta p / q from -0.32 to 0 by 0.04, or as given) and the same two legend
glyphs (square: edge orifice; circle: centre orifice).

Usage: python3 -I mkspec3372.py <out.json> <figure title> <page> <box x0 y0 x1 y1>
       <legend square X Y> <legend circle X Y> <region x0 y0 x1 y1> [xsel ...] [-- yvals...]
"""
import json
import sys


def main():
    a = sys.argv[1:]
    out, title, page = a[0], a[1], int(a[2])
    box = [int(v) for v in a[3:7]]
    sq = [int(v) for v in a[7:9]]
    ci = [int(v) for v in a[9:11]]
    reg = [int(v) for v in a[11:15]]
    rest = a[15:]
    yv = [-0.32, -0.28, -0.24, -0.20, -0.16, -0.12, -0.08, -0.04, 0.0]
    if "--" in rest:
        i = rest.index("--")
        yv = [float(v) for v in rest[i + 1:]]
        rest = rest[:i]
    xsel = [int(v) for v in rest] if rest else "all"
    spec = {
        "figure": title, "ntrs": "19930084618", "page": page, "box": box,
        "thr": 0.6, "grid_thr": 0.6, "longruns": True, "frac_v": 0.15, "frac_h": 0.15,
        "xsel": xsel, "xvals": [round(0.6 + 0.05 * i, 2) for i in range(13)],
        "ysel": "all", "yvals": yv,
        "dots": {"legend": [{"series": "edge orifice (square)", "at": sq},
                            {"series": "center orifice (circle)", "at": ci}],
                 "region": reg, "mask": "raw", "R": 40, "R_plot": 40, "scales": [1.0],
                 "classify": "corners", "half": 30, "square": "edge orifice (square)",
                 "circle": "center orifice (circle)", "exclude": [], "glyph_scales": [1.0, 1.08], "glyph_at": []},
        "scale": 0.3}
    json.dump(spec, open(out, "w"), indent=1)


if __name__ == "__main__":
    main()
