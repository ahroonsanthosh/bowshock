"""Extract the native scan image of given PDF pages, rotated as the page displays.
usage: python3 -I extract.py pdf outdir page [page ...]
Writes outdir/p<NNN>.png at the scan's native resolution (no resampling;
a /Rotate of 90/180/270 is applied as a lossless pixel rotation).
"""
import os
import re
import subprocess
import sys
import tempfile
from PIL import Image

pdf, outdir = sys.argv[1], sys.argv[2]
pages = [int(p) for p in sys.argv[3:]]
os.makedirs(outdir, exist_ok=True)
for p in pages:
    info = subprocess.run(["pdfinfo", "-f", str(p), "-l", str(p), pdf],
                          capture_output=True, text=True).stdout
    m = re.search(r"Page\s+%d rot:\s+(\d+)" % p, info)
    rot = int(m.group(1)) if m else 0
    with tempfile.TemporaryDirectory() as td:
        subprocess.run(["pdfimages", "-png", "-f", str(p), "-l", str(p), pdf,
                        os.path.join(td, "img")], check=True)
        files = sorted(os.listdir(td))
        if len(files) != 1:
            print("page", p, "has", len(files), "images:", files)
        im = Image.open(os.path.join(td, files[0]))
        im.load()
    if im.mode not in ("L", "RGB"):
        im = im.convert("L")
    # /Rotate is clockwise when displayed; PIL rotates counter-clockwise.
    if rot:
        im = im.rotate(-rot, expand=True)
    out = os.path.join(outdir, "p%03d.png" % p)
    im.save(out)
    print(out, im.size, im.mode, "rot", rot)
