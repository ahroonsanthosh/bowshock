"""Extract the native scan image of one PDF page (lossless) and also a
pdftoppm rendering at the same nominal dpi, so orientation can be checked.

usage: python3 -I render.py PDF PAGE OUTDIR TAG [DPI]

Writes OUTDIR/TAG_pPAGE_native.png (native pixels, rotated upright to match
the page as displayed) and OUTDIR/TAG_pPAGE_r{DPI}.png (pdftoppm render).
"""
import sys, os, subprocess, glob, tempfile
from PIL import Image
import numpy as np

pdf, page, outdir, tag = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
dpi = int(sys.argv[5]) if len(sys.argv) > 5 else 300
os.makedirs(outdir, exist_ok=True)

# pdftoppm render (applies page /Rotate)
base = os.path.join(outdir, f"{tag}_p{page:02d}_r{dpi}")
subprocess.run(["pdftoppm", "-r", str(dpi), "-gray", "-png", "-singlefile",
                "-f", str(page), "-l", str(page), pdf, base], check=True)
rend = Image.open(base + ".png").convert("L")

# native image
with tempfile.TemporaryDirectory() as td:
    subprocess.run(["pdfimages", "-j", "-tiff", "-f", str(page), "-l", str(page), pdf,
                    os.path.join(td, "img")], check=True)
    files = sorted(glob.glob(os.path.join(td, "img-*.*")))
    imgs = [Image.open(f).convert("L") for f in files]
    imgs = [im.copy() for im in imgs]
big = max(imgs, key=lambda im: im.size[0] * im.size[1])

# choose the rotation of the native image that best matches the render
r_small = np.asarray(rend.resize((300, 400)), dtype=float)
best = None
for ang in (0, 90, 180, 270):
    cand = big.rotate(ang, expand=True)
    c_small = np.asarray(cand.resize((300, 400)), dtype=float)
    err = np.mean((c_small - r_small) ** 2)
    if best is None or err < best[0]:
        best = (err, ang, cand)
err, ang, cand = best
cand.save(os.path.join(outdir, f"{tag}_p{page:02d}_native.png"))
print(f"page {page}: native {big.size} rotated {ang} -> {cand.size}; render {rend.size}; match mse {err:.1f}; n_images {len(imgs)}")
