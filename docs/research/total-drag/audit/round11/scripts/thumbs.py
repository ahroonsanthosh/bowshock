"""Contact sheet of page thumbnails, to find a figure's page (exploratory).

usage: python3 -I thumbs.py DIR FIRST LAST OUT.png
DIR holds pdfimages -p output (p-NNN-MMM.png); pages FIRST..LAST.
"""
import glob
import sys

from PIL import Image, ImageDraw

Image.MAX_IMAGE_PIXELS = None


def main():
    d, a, b, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
    files = [f for f in sorted(glob.glob(d + "/p-*.png")) if a <= int(f.split("/")[-1].split("-")[1]) <= b]
    W = 360
    ims = []
    for f in files:
        im = Image.open(f).convert("L")
        r = W / max(im.size)
        ims.append((f, im.resize((int(im.size[0] * r), int(im.size[1] * r)))))
    cols = 5
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new("L", (cols * W, rows * (W + 20)), 255)
    dr = ImageDraw.Draw(sheet)
    for i, (f, im) in enumerate(ims):
        x, y = (i % cols) * W, (i // cols) * (W + 20)
        sheet.paste(im, (x, y + 20))
        dr.text((x + 5, y + 3), f.split("/")[-1], fill=0)
    sheet.save(out)


if __name__ == "__main__":
    main()
