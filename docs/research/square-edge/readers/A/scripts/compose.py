"""Place several column strips of one page side by side for reading a table.

usage: python3 -I compose.py IN OUT Y0 Y1 SCALE X0a X1a [X0b X1b ...]
Each (X0, X1) strip is cropped over rows Y0..Y1 (native pixels), the strips
are joined left to right with a 6-pixel grey separator, and the result is
scaled by SCALE (nearest neighbour above 1).
"""
import sys
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
y0, y1 = int(sys.argv[3]), int(sys.argv[4])
scale = float(sys.argv[5])
xs = [int(v) for v in sys.argv[6:]]
im = Image.open(src).convert("L")
strips = [im.crop((xs[i], y0, xs[i + 1], y1)) for i in range(0, len(xs), 2)]
w = sum(s.width for s in strips) + 6 * (len(strips) - 1)
canvas = Image.new("L", (w, y1 - y0), 160)
x = 0
for s in strips:
    canvas.paste(s, (x, 0))
    x += s.width + 6
if scale != 1.0:
    canvas = canvas.resize((int(canvas.width * scale), int(canvas.height * scale)),
                           Image.NEAREST if scale >= 1 else Image.LANCZOS)
canvas.save(out)
print(out, canvas.size)
