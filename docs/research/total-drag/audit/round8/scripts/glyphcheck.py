"""Glyph-consistency check of a typed table against the scan (R&M 3348 table 3).

usage: python3 -I glyphcheck.py PASS1.txt OUT.json PAGE33.png ... PAGE38.png

1. Ink (gray < 128) of each native 300 dpi page is split into 8-connected
   components.
2. Components are grouped into words (same text line, gaps under 14 px).
   A word of five components whose second is a small dot ('0', point, three
   digits) is a tabulated value; the eta column of sub-table (a) is dropped
   (it is the leftmost word of each of the six lines that have six words).
3. Value words are put into text lines down the page; every six lines are
   one sub-table (holes 6 to 1), in the order of PASS1.txt, and the words of
   a line, left to right, are its incidence columns. The count of words per
   line must match the typed row, which checks the table's shape.
4. Each digit glyph gets the label typed in PASS1. Templates are the mean
   glyph of each label (leave-one-out), and each glyph is assigned the label
   of the nearest template (normalised correlation, best over +-2 px
   shifts). Glyphs whose nearest template is not their typed label, or whose
   margin over the second-best label is small, are listed for a look at
   high magnification.
"""
import json
import sys

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
CW, CH = 36, 44


def components(ink):
    H, W = ink.shape
    seen = np.zeros_like(ink, bool)
    ys, xs = np.nonzero(ink)
    out = []
    for y0, x0 in zip(ys, xs):
        if seen[y0, x0]:
            continue
        stack = [(y0, x0)]
        seen[y0, x0] = True
        pts = []
        while stack:
            y, x = stack.pop()
            pts.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    p, q = y + dy, x + dx
                    if 0 <= p < H and 0 <= q < W and ink[p, q] and not seen[p, q]:
                        seen[p, q] = True
                        stack.append((p, q))
        a = np.array(pts)
        out.append(dict(y0=int(a[:, 0].min()), y1=int(a[:, 0].max()), x0=int(a[:, 1].min()),
                        x1=int(a[:, 1].max()), n=len(pts)))
    return out


def words(comps):
    comps = [c for c in comps if c["n"] >= 6]
    for c in comps:
        c["yc"] = 0.5 * (c["y0"] + c["y1"])
    comps.sort(key=lambda c: (c["yc"], c["x0"]))
    lines = []
    for c in sorted(comps, key=lambda c: c["yc"]):
        for ln in lines:
            if abs(ln["yc"] - c["yc"]) < 14 and (c["y1"] - c["y0"]) < 60:
                ln["c"].append(c)
                ln["yc"] = np.mean([d["yc"] for d in ln["c"]])
                break
        else:
            lines.append(dict(yc=c["yc"], c=[c]))
    out = []
    for ln in lines:
        cs = sorted(ln["c"], key=lambda c: c["x0"])
        cur = [cs[0]]
        for c in cs[1:]:
            if c["x0"] - cur[-1]["x1"] < 14:
                cur.append(c)
            else:
                out.append(cur)
                cur = [c]
        out.append(cur)
    return out


def is_value(w):
    if len(w) != 5:
        return False
    h = [c["y1"] - c["y0"] for c in w]
    return h[1] < 0.4 * max(h) and min(h[0], h[2], h[3], h[4]) > 0.6 * max(h)


def glyph(img, c):
    g = np.zeros((CH, CW))
    sub = img[c["y0"]:c["y1"] + 1, c["x0"]:c["x1"] + 1]
    h, w = sub.shape
    oy, ox = (CH - h) // 2, (CW - w) // 2
    if oy < 0 or ox < 0:
        return None
    g[oy:oy + h, ox:ox + w] = sub
    return g


def ncc(a, b):
    best = -1
    for dy in (-2, -1, 0, 1, 2):
        for dx in (-2, -1, 0, 1, 2):
            s = np.roll(np.roll(b, dy, 0), dx, 1)
            a0, s0 = a - a.mean(), s - s.mean()
            v = (a0 * s0).sum() / np.sqrt((a0 * a0).sum() * (s0 * s0).sum())
            best = max(best, v)
    return best


def main():
    typed_path, out = sys.argv[1:3]
    pages = sys.argv[3:]
    blocks = []
    for line in open(typed_path):
        if line.startswith("#") or not line.strip():
            continue
        f = line.split()
        if f[0].isalpha():
            blocks.append(dict(sub=f[0], page=int(f[1]), M=f[2], phi=f[3], alphas=f[4].split(","), rows=[]))
        else:
            blocks[-1]["rows"].append((f[0], f[1:]))
    glyphs = []
    unchecked = []
    shape_ok = True
    for pg in pages:
        pnum = int(pg.split("img-")[1][:3])
        img = (np.asarray(Image.open(pg).convert("L")) < 128).astype(float)
        vw = [w for w in words(components(img > 0)) if is_value(w)]
        vw.sort(key=lambda w: w[0]["yc"])
        lines = []
        for w in vw:
            if lines and abs(lines[-1][0][0]["yc"] - w[0]["yc"]) < 14:
                lines[-1].append(w)
            else:
                lines.append([w])
        lines = [sorted(l, key=lambda w: w[0]["x0"]) for l in lines]
        bl = [b for b in blocks if b["page"] == pnum]
        rows = [(b, h, v) for b in bl for h, v in b["rows"]]
        if len(lines) != len(rows):
            print("page %d: %d value lines found, %d typed rows" % (pnum, len(lines), len(rows)))
            shape_ok = False
            continue
        # column centres per sub-table from its complete rows
        cols = {}
        for ln, (b, h, vals) in zip(lines, rows):
            if b["sub"] == "a" and len(ln) == 6:
                ln = ln[1:]
            if len(ln) == len(vals):
                cols.setdefault(b["sub"], []).append([0.5 * (w[0]["x0"] + w[-1]["x1"]) for w in ln])
        cols = {k: np.median(np.array(v), axis=0) for k, v in cols.items()}
        for ln, (b, h, vals) in zip(lines, rows):
            if b["sub"] == "a" and len(ln) == 6:
                ln = ln[1:]
            pairs = list(enumerate(zip(ln, vals)))
            if len(ln) != len(vals):
                shape_ok = False
                cx = cols[b["sub"]]
                pairs = []
                used = set()
                for w in ln:
                    k = int(np.argmin(np.abs(cx - 0.5 * (w[0]["x0"] + w[-1]["x1"]))))
                    used.add(k)
                    pairs.append((k, (w, vals[k])))
                miss = [k for k in range(len(vals)) if k not in used]
                for k in miss:
                    unchecked.append(dict(page=pnum, sub=b["sub"], hole=h, col=k, typed=vals[k],
                                          x=float(cx[k]), y=float(ln[0][0]["yc"])))
                print("page %d sub %s hole %s: %d words, %d typed; not segmented: columns %s" % (
                    pnum, b["sub"], h, len(ln), len(vals), miss))
            for k, (w, v) in pairs:
                digs = v.replace("0.", "", 1)
                for j, (c, ch) in enumerate(zip(w[2:], digs)):
                    g = glyph(img, c)
                    if g is None:
                        unchecked.append(dict(page=pnum, sub=b["sub"], hole=h, col=k, typed=v, why="glyph too big"))
                    else:
                        glyphs.append(dict(page=pnum, sub=b["sub"], hole=h, col=k, pos=j, label=ch,
                                           box=(c["x0"], c["y0"], c["x1"], c["y1"]), g=g))
    print("glyphs:", len(glyphs), "table shape matches the typing:", shape_ok)
    G = np.array([d["g"] for d in glyphs])
    labels = np.array([d["label"] for d in glyphs])
    sums = {L: G[labels == L].sum(axis=0) for L in "0123456789"}
    counts = {L: int((labels == L).sum()) for L in "0123456789"}
    flags = []
    for i, d in enumerate(glyphs):
        sc = {}
        for L in "0123456789":
            n = counts[L] - (1 if d["label"] == L else 0)
            if n <= 0:
                continue
            t = (sums[L] - (d["g"] if d["label"] == L else 0)) / n
            sc[L] = ncc(d["g"], t)
        order = sorted(sc, key=sc.get, reverse=True)
        best, second = order[0], order[1]
        margin = sc[best] - sc[second]
        own = sc.get(d["label"], -1)
        if best != d["label"] or margin < 0.05:
            flags.append(dict(page=d["page"], sub=d["sub"], hole=d["hole"], col=d["col"], pos=d["pos"],
                              typed=d["label"], best=best, best_score=round(sc[best], 3),
                              typed_score=round(own, 3), second=second, margin=round(margin, 3), box=d["box"]))
    print("flagged glyphs:", len(flags))
    for f in flags:
        print(f)
    print("unchecked cells:", len(unchecked))
    for u in unchecked:
        print(u)
    json.dump(dict(n_glyphs=len(glyphs), shape_ok=shape_ok, counts=counts, flags=flags, unchecked=unchecked),
              open(out, "w"), indent=1)


if __name__ == "__main__":
    main()
