"""Turn digitiser output into rows of the brief's CSV format.

Usage: python -I mkcsv.py OUT.json META.json CSV [a]
META.json: {"common": {...csv fields...}, "xdec": 4, "ydec": 4,
            "points": {"id": {...field overrides..., "sig": px}}}
Fields: source,item,series,configuration,mach,meridian,x,x_quantity,y,
y_quantity,alternatives,flag,page,note.  A point listed in META with
"skip": true is not written.  "y_empty": true leaves y empty
(illegible).  The reading error (one standard deviation, from the
symbol-centre uncertainty in pixels, default 1.5 px, combined with the
axis-fit rms) is appended to the note.  Rows are written in the order
of the points in OUT.json.  With a fourth argument "a" rows are
appended (no header).  With "note_readx": true in META, rows whose x is
given (x_override) also note where the symbol centre was drawn on the
abscissa scale.
"""
import csv
import json
import math
import sys

COLS = ["source", "item", "series", "configuration", "mach", "meridian", "x", "x_quantity",
        "y", "y_quantity", "alternatives", "flag", "page", "note"]


def main():
    res = json.load(open(sys.argv[1]))
    meta = json.load(open(sys.argv[2]))
    path = sys.argv[3]
    app = len(sys.argv) > 4 and sys.argv[4] == "a"
    xdec = meta.get("xdec", 4)
    ydec = meta.get("ydec", 4)
    xc, yc = res["xcal"], res["ycal"]
    rows = []
    for p in res["points"]:
        m = dict(meta["common"])
        m.update(meta.get("series_defaults", {}).get(p["series"], {}))
        m.update(meta["points"].get(p["id"], {}))
        if m.get("skip"):
            continue
        sig = m.pop("sig", 1.5)
        sx = math.hypot(sig * xc["value_per_px"], xc["rms_value"])
        sy = math.hypot(sig * yc["value_per_px"], yc["rms_value"])
        r = {k: m.get(k, "") for k in COLS}
        r["series"] = m.get("series", p["series"])
        if m.get("x_override") is not None:
            r["x"] = m["x_override"]
        else:
            r["x"] = ("%." + str(xdec) + "f") % p["x"]
        r["y"] = "" if m.get("y_empty") else ("%." + str(ydec) + "f") % p["y"]
        alts = []
        for ap in m.get("alt_px", []):
            # [px, py, label]: another plausible centre, converted with the same calibration
            ax = xc["coef"][0] * ap[0] + xc["coef"][1] * ap[1] + xc["coef"][2]
            ay = yc["coef"][0] * ap[0] + yc["coef"][1] * ap[1] + yc["coef"][2]
            lab = (" (" + ap[2] + ")") if len(ap) > 2 else ""
            alts.append(("y=%." + str(ydec) + "f%s") % (ay, lab) if abs(ax - p["x"]) < 2 * xc["value_per_px"]
                        else ("x=%." + str(xdec) + "f y=%." + str(ydec) + "f%s") % (ax, ay, lab))
        if m.get("alternatives"):
            alts.append(m["alternatives"])
        r["alternatives"] = "; ".join(alts)
        if r["flag"] == "":
            r["flag"] = "ok"
        err = "reading error 1 sd: x +-%.*f, y +-%.*f" % (xdec, sx, ydec, sy)
        if m.get("x_override") is not None:
            err = "reading error 1 sd: y +-%.*f (x is the category, not read)" % (ydec, sy)
            if meta.get("note_readx"):
                err = ("symbol centre drawn at x = %.*f on the scale; " % (xdec, p["x"])) + err
        r["note"] = (r["note"] + "; " if r["note"] else "") + err + "; pid " + p["id"]
        rows.append(r)
    mode = "a" if app else "w"
    with open(path, mode, newline="") as f:
        w = csv.DictWriter(f, fieldnames=COLS)
        if not app:
            w.writeheader()
        for r in rows:
            w.writerow(r)
    print(path, len(rows), "rows")


if __name__ == "__main__":
    main()
