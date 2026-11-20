import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('L'); s = 200/72
# boxes in PDF points (x0, y0, x1, y1), origin top-left, page 612.479 x 690.0 pt
boxes = [
 ('legend',        (100, 46, 465, 130), 0),
 ('ytitle_top',    (116, 136, 140, 272), -90),
 ('ytitle_mid',    (110, 300, 127, 404), -90),
 ('ytitle_bot',    (124, 440, 139, 562), -90),
 ('xtitle_top',    (260, 283, 360, 294), 0),
 ('xtitle_mid',    (260, 377, 360, 390), 0),
 ('xtitle_bot',    (260, 572.5, 360, 583), 0),
 ('caption',       (90, 597, 535, 640), 0),
]
crops = []
for name, (x0, y0, x1, y1), rot in boxes:
    c = im.crop((round(x0*s), round(y0*s), round(x1*s), round(y1*s)))
    if rot: c = c.rotate(rot, expand=True)  # -90: rotated text reads left to right
    crops.append((name, c))
pad = 20
W = max(c.size[0] for _, c in crops) + 2*pad
H = sum(c.size[1] + pad for _, c in crops) + pad
sheet = Image.new('L', (W, H), 255)
y = pad
for name, c in crops:
    sheet.paste(c, (pad, y)); y += c.size[1] + pad
    # separator line
    for x in range(W): sheet.putpixel((x, y - pad//2), 160)
sheet.save(out)
print(sheet.size)
