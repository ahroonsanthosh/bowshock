"""Write the method appendices: flagged points and axis calibrations.

Usage: python -I appendix.py B_DIR OUT_FLAGS.md OUT_CALIB.md
"""
import csv
import json
import re
import sys

B = sys.argv[1].rstrip("/") + "/"
W = B + "work/"
CSVS = ["rml54c16_fig5.csv", "rml54i22_fig2.csv", "rme57e06_fig6.csv", "rme57e06_fig7.csv", "rme57e06_fig8.csv",
        "rme57e06_fig14.csv", "tnd6789_fig5.csv", "tnd6789_fig7.csv", "tnd6789_fig12.csv", "tnd6789_fig18.csv",
        "tnd6789_fig20.csv", "tmx1960_fig5.csv", "tmx1960_fig6.csv", "tmx1960_fig7.csv", "tmx1960_fig11.csv",
        "tmx1960_fig18.csv"]

with open(sys.argv[2], "w") as f:
    f.write("## Appendix A. Every ambiguous or illegible point and what I saw\n\n")
    f.write("One line per point: file, figure, series, Mach number, meridian, x, y, flag, alternatives, then what I saw "
            "(the note without its reading-error part). The point id (pid) ties the line to the CSV row.\n")
    for c in CSVS:
        rows = [r for r in csv.DictReader(open(B + c)) if r["flag"] not in ("ok",)]
        if not rows:
            continue
        f.write("\n### %s (%d points)\n\n" % (c, len(rows)))
        for r in rows:
            note = r["note"]
            pid = re.search(r"pid (\S+)$", note).group(1)
            seen = re.sub(r";? ?reading error 1 sd:[^;]*", "", note)
            seen = re.sub(r";? ?pid \S+$", "", seen).strip("; ")
            seen = re.sub(r";? ?symbol centre drawn at x = [0-9.]+ on the scale", "", seen)
            f.write("- %s, %s, M %s%s, x %s, y %s, %s%s: %s (pid %s)\n" % (
                r["item"], r["series"], r["mach"], (", phi " + r["meridian"]) if r["meridian"] else "",
                r["x"], r["y"] if r["y"] else "(empty)", r["flag"],
                ("; alternatives " + r["alternatives"]) if r["alternatives"] else "", seen, pid))

FITS = [
    ("RM L54C16", "fig. 5(a)", 22, "300 dpi render", "c16_f5a"),
    ("RM L54C16", "fig. 5(b)", 22, "300 dpi render", "c16_f5b"),
    ("RM L54I22", "fig. 2(a)", 16, "300 dpi render", "i22_f2a"),
    ("RM L54I22", "fig. 2(b)", 16, "300 dpi render", "i22_f2b"),
    ("RM L54I22", "fig. 2(c)", 16, "300 dpi render", "i22_f2c"),
    ("RM E57E06", "fig. 6(a)", 49, "300 dpi render", "e57_f6a"),
    ("RM E57E06", "fig. 6(b)", 49, "300 dpi render", "e57_f6b"),
    ("RM E57E06", "fig. 7(a)", 50, "300 dpi render", "e57_f7a"),
    ("RM E57E06", "fig. 8(a)", 52, "300 dpi render", "e57_f8a"),
    ("RM E57E06", "fig. 8(b)", 52, "300 dpi render", "e57_f8b"),
    ("RM E57E06", "fig. 14(a)", 60, "300 dpi render", "e57_f14a"),
    ("RM E57E06", "fig. 14(b)", 60, "300 dpi render", "e57_f14b"),
    ("RM E57E06", "fig. 14(c)", 60, "300 dpi render", "e57_f14c"),
    ("TN D-6789", "fig. 5 upper panel (M 1.83)", 21, "300 dpi render", "d67_f5u"),
    ("TN D-6789", "fig. 5 lower panel (M 2.20)", 21, "300 dpi render", "d67_f5l"),
] + [("TN D-6789", "fig. 7(%s), %s panel" % ("abcdef"[p - 23], {"top": "top (l/dm 0.6)", "mid": "middle (l/dm 0.8)", "bot": "bottom (l/dm 1.0)"}[s]), p, "300 dpi render", "f7_p%d_%s" % (p, s))
     for p in range(23, 29) for s in ("top", "mid", "bot")] + [
    ("TN D-6789", "fig. 12 top panel (l/dm 0.6)", 35, "300 dpi render", "f12_top"),
    ("TN D-6789", "fig. 12 middle panel (l/dm 0.8)", 35, "300 dpi render", "f12_mid"),
    ("TN D-6789", "fig. 12 bottom panel (l/dm 1.0)", 35, "300 dpi render", "f12_bot"),
    ("TN D-6789", "fig. 18 upper panel (M 1.83)", 47, "300 dpi render", "f18_top"),
    ("TN D-6789", "fig. 18 lower panel (M 2.20)", 47, "300 dpi render", "f18_bot"),
    ("TN D-6789", "fig. 20", 49, "300 dpi render", "f20"),
    ("TM X-1960", "fig. 5(c)", 34, "300 dpi render", "x5c"),
    ("TM X-1960", "fig. 6(c)", 37, "300 dpi render", "x6c"),
    ("TM X-1960", "fig. 18, M = 1.20 panel", 83, "300 dpi render", "x18"),
    ("TM X-1960", "fig. 7(a)", 38, "native 300 ppi bilevel scan, rotated to landscape and deskewed by -0.575 deg", "x7a"),
    ("TM X-1960", "fig. 7(b)", 39, "native 300 ppi bilevel scan, rotated and deskewed by -2.550 deg", "x7b"),
    ("TM X-1960", "fig. 7(c)", 40, "native 300 ppi bilevel scan, rotated and deskewed by -0.500 deg", "x7c"),
    ("TM X-1960", "fig. 7(d)", 41, "native 300 ppi bilevel scan, rotated and deskewed by -1.450 deg", "x7d"),
    ("TM X-1960", "fig. 11", 48, "native 300 ppi bilevel scan, rotated and deskewed by +0.300 deg", "x11"),
]
COMBF = {"x7a": "d38n", "x7b": "d39n", "x7c": "d40n", "x7d": "d41n", "x11": "d48n"}


def combrms(fn):
    r = [float(m) for m in re.findall(r"resid (-?[0-9.]+)", open(fn).read())]
    return len(r), (sum(x * x for x in r) / len(r)) ** 0.5, max(abs(x) for x in r)


with open(sys.argv[3], "w") as f:
    f.write("## Appendix B. Axis calibrations\n\n")
    f.write("Pixel positions are in the image named (the 300 dpi render of the PDF page, or the native scan "
            "where stated; origin top left). For grid-line fits each labelled line is listed as value @ pixel "
            "position (residual from the least-squares fit, px); rms is in the axis's own units. For comb fits "
            "(bold grid lines fitted as an evenly spaced comb) the reference line, the spacing and two labelled "
            "lines are given, with the rms and largest residual of the comb teeth.\n")
    for rep, fig, page, img, n in FITS:
        d = json.load(open(W + "out/%s.json" % n))
        sp_ = d["spec"]; spec = json.load(open(sp_ if sp_.startswith("/") else W + sp_))
        f.write("\n- %s %s, PDF p. %d, %s:\n" % (rep, fig, page, img))
        for ax in ("x", "y"):
            c = d[ax + "cal"]
            if spec.get("comb"):
                p0, sp, v0, dv = spec["comb"][ax]
                nt, rms, mx = combrms(W + "out/comb_%s_%s.txt" % (COMBF[n], ax))
                # two labelled lines: the reference and one far from it
                k2 = round((nt - 1))
                v2 = v0 + dv * k2
                p2 = p0 + sp * k2
                f.write("  - %s: comb of %d bold lines, %g at %.2f px and %g at %.2f px, spacing %.3f px per %g; "
                        "tooth residuals rms %.2f px, largest %.2f px; %.3g per px\n" % (
                            ax, nt, v0, p0, round(v2, 6), p2, sp, abs(dv), rms, mx, c["value_per_px"]))
            else:
                s = ", ".join("%g @ %.1f (%+.2f)" % (l["value"], l["mid"], l["res_px"]) for l in c["lines"])
                f.write("  - %s: %s; rms %.2g; %.3g per px\n" % (ax, s, c["rms_value"], c["value_per_px"]))
print("ok")
