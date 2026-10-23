"""Crop a page region, scale it and draw a page-pixel coordinate grid on it
(for listing symbols by eye with approximate page coordinates).

usage: python3 -I gridcrop.py PAGE.png OUT.png x0 y0 x1 y1 SCALE STEP [MARKS.json|none] [BLUR]
Thin red lines every STEP page px, labelled with their page coordinate.
MARKS.json (optional): list of {x, y, label} drawn as small blue crosses.
BLUR (optional): box-blur radius applied to the page first (2 smooths the
dither of a halftone scan).

batch form: python3 -I gridcrop.py --batch PAGE.png OUTDIR SCALE STEP BLUR "name:x0,y0,x1,y1;..."
writes OUTDIR/name.png for each box.
"""
import json
import sys

from PIL import Image, ImageDraw, ImageFilter

Image.MAX_IMAGE_PIXELS = None


def render(page, dst, x0, y0, x1, y1, s, step, marks, blur):
    im = page
    if blur:
        im = im.crop((x0 - 8, y0 - 8, x1 + 8, y1 + 8)).filter(ImageFilter.BoxBlur(blur))
        im = im.crop((8, 8, 8 + x1 - x0, 8 + y1 - y0))
    else:
        im = im.crop((x0, y0, x1, y1))
    im = im.resize((int((x1 - x0) * s), int((y1 - y0) * s)), Image.LANCZOS).convert("RGB")
    dr = ImageDraw.Draw(im)
    for X in range((x0 // step + 1) * step, x1, step):
        a = (X - x0) * s
        dr.line((a, 0, a, im.size[1]), fill=(255, 150, 150))
        dr.text((a + 2, 2), str(X), fill=(200, 0, 0))
    for Y in range((y0 // step + 1) * step, y1, step):
        b = (Y - y0) * s
        dr.line((0, b, im.size[0], b), fill=(255, 150, 150))
        dr.text((2, b + 2), str(Y), fill=(200, 0, 0))
    if marks:
        for m in marks:
            a, b = (m["x"] - x0) * s, (m["y"] - y0) * s
            if 0 <= a < im.size[0] and 0 <= b < im.size[1]:
                dr.line((a - 5, b, a + 5, b), fill=(0, 0, 255))
                dr.line((a, b - 5, a, b + 5), fill=(0, 0, 255))
                dr.text((a + 4, b + 3), str(m.get("label", "")), fill=(0, 0, 200))
    im.save(dst, optimize=True)
    print(dst, im.size)


def main():
    if sys.argv[1] == "--batch":
        page = Image.open(sys.argv[2]).convert("L")
        outdir, s, step, blur = sys.argv[3], float(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6])
        for spec in sys.argv[7].split(";"):
            name, box = spec.split(":")
            x0, y0, x1, y1 = (int(v) for v in box.split(","))
            render(page, "%s/%s.png" % (outdir, name), x0, y0, x1, y1, s, step, None, blur)
        return
    src, dst = sys.argv[1], sys.argv[2]
    x0, y0, x1, y1 = (int(v) for v in sys.argv[3:7])
    s, step = float(sys.argv[7]), int(sys.argv[8])
    marks = json.load(open(sys.argv[9])) if len(sys.argv) > 9 and sys.argv[9] != "none" else None
    blur = int(sys.argv[10]) if len(sys.argv) > 10 else 0
    render(Image.open(src).convert("L"), dst, x0, y0, x1, y1, s, step, marks, blur)


if __name__ == "__main__":
    main()
