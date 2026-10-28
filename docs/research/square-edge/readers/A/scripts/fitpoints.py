"""Fit symbol centres for a figure and convert them to axis values.

usage: python3 -I fitpoints.py IMG CAL_OUT.json POINTS.json OUT.csv OVERLAY_PREFIX

POINTS.json: list of {"id", "type", "cx", "cy", "size", "search"?, "masks"?,
                      "series", "note"?, "fixed"?: true}
  "fixed": true keeps the given centre (used only where a symbol is too
  damaged or hidden for the fit; said in the note).
CAL_OUT.json: output of calib_report.py (global least-squares fit through
  labelled ticks). Values are then refined on the printed minor grid near
  each symbol (figlib.local_value); both are written.
Writes OUT.csv with pixel centre, reading error, global and local values,
and an overlay PNG per point (crop x6 with the fitted outline in black
dots) for checking by eye.
"""
import sys, os, json, csv
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
from figlib import load_grey, symfit, local_value

img, calp, ptsp, outp, ovp = sys.argv[1:6]
cal = json.load(open(calp))
cfg = json.load(open(ptsp))
pts = cfg["points"]
xstep, ystep = cfg["xstep"], cfg["ystep"]
g = load_grey(img)
cx_ = cal["x"]["coef"]; cy_ = cal["y"]["coef"]
fx = lambda px, py: cx_[0] + cx_[1] * px + cx_[2] * py
fy = lambda px, py: cy_[0] + cy_[1] * px + cy_[2] * py
bx = cx_[1]; by = cy_[2]
rows = []
src = Image.open(img).convert("RGB")
for p in pts:
    if p.get("fixed"):
        r = dict(x=p["cx"], y=p["cy"], size=p["size"], score=float("nan"), ex=p.get("ex", 3.0), ey=p.get("ey", 3.0), edge=False)
    else:
        masks = [tuple(m) for m in p.get("masks", [])]
        r = symfit(g, p["type"], p["cx"], p["cy"], p["size"], p.get("search", 5.0), masks)
    X, Y = r["x"], r["y"]
    gxv, gyv = fx(X, Y), fy(X, Y)
    lx = local_value(g, "x", X, Y, fx, xstep, half=cfg.get("half", 48), band=cfg.get("band", 28), exclude=cfg.get("exclude", 9))
    ly = local_value(g, "y", X, Y, fy, ystep, half=cfg.get("half", 48), band=cfg.get("band", 28), exclude=cfg.get("exclude", 9))
    row = dict(id=p["id"], series=p["series"], type=p["type"], px=round(X, 2), py=round(Y, 2),
               err_px_x=round(r["ex"], 2), err_px_y=round(r["ey"], 2), size=r["size"],
               score=round(r["score"], 1), edge=r["edge"],
               x_global=round(gxv, 5), y_global=round(gyv, 5),
               x_local=round(lx["value"], 5) if lx else "", y_local=round(ly["value"], 5) if ly else "",
               x_local_rms=round(lx["rms"], 5) if lx else "", y_local_rms=round(ly["rms"], 5) if ly else "",
               x_local_n=lx["n"] if lx else 0, y_local_n=ly["n"] if ly else 0,
               x_err_value=round(abs(r["ex"] * (lx["slope"] if lx else bx)), 5),
               y_err_value=round(abs(r["ey"] * (ly["slope"] if ly else by)), 5),
               note=p.get("note", ""))
    rows.append(row)
    print(f"{p['id']:>6} {p['series']:<10} {p['type']:<8} ({X:8.2f},{Y:8.2f}) +-({r['ex']:.2f},{r['ey']:.2f}) s={r['size']:.1f} sc={r['score']:.0f}"
          f"{' EDGE' if r['edge'] else ''}  x={row['x_local']} (g {gxv:.4f})  y={row['y_local']} (g {gyv:.4f})")
    # overlay
    R = 22
    crop = src.crop((int(X) - R, int(Y) - R, int(X) + R + 1, int(Y) + R + 1)).resize(((2 * R + 1) * 8, (2 * R + 1) * 8), Image.NEAREST)
    dr = ImageDraw.Draw(crop)
    ox, oy = (X - (int(X) - R)) * 8, (Y - (int(Y) - R)) * 8
    s = r["size"] * 8 / 2
    if p["type"] in ("disc", "ring"):
        dr.ellipse((ox - s, oy - s, ox + s, oy + s), outline=(255, 0, 0))
    elif p["type"] in ("square", "fsquare"):
        dr.rectangle((ox - s, oy - s, ox + s, oy + s), outline=(255, 0, 0))
    elif p["type"] == "diamond":
        dr.polygon([(ox, oy - s), (ox + s, oy), (ox, oy + s), (ox - s, oy)], outline=(255, 0, 0))
    elif p["type"] in ("rtri", "ltri"):
        w = r["size"] * 8 / 2; h = w * 25 / 29
        if p["type"] == "rtri":
            dr.polygon([(ox - w, oy - h), (ox + w, oy - h), (ox + w, oy + h)], outline=(255, 0, 0))
        else:
            dr.polygon([(ox - w, oy - h), (ox + w, oy - h), (ox - w, oy + h)], outline=(255, 0, 0))
    elif p["type"] == "triangle":
        dr.polygon([(ox, oy - s), (ox + s * 0.95, oy + s * 0.75), (ox - s * 0.95, oy + s * 0.75)], outline=(255, 0, 0))
    dr.line((ox - 4, oy, ox + 4, oy), fill=(0, 0, 255)); dr.line((ox, oy - 4, ox, oy + 4), fill=(0, 0, 255))
    crop.save(f"{ovp}_{p['id']}.png")
with open(outp, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    w.writeheader(); w.writerows(rows)
