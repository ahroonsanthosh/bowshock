import sys
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
x0,y0,x1,y1 = map(int, sys.argv[3:7]); step=int(sys.argv[7]); scale=float(sys.argv[8])
im = Image.open(src).convert('RGB').crop((x0,y0,x1,y1))
d = ImageDraw.Draw(im)
for y in range((y0//step+1)*step, y1, step):
    d.line([(0,y-y0),(im.width,y-y0)], fill=(255,0,0), width=1)
    d.text((2,y-y0-10), str(y), fill=(255,0,0))
for x in range((x0//step+1)*step, x1, step):
    d.line([(x-x0,0),(x-x0,im.height)], fill=(0,0,255), width=1)
    d.text((x-x0+2,2), str(x), fill=(0,0,255))
im = im.resize((int(im.width*scale), int(im.height*scale)), Image.LANCZOS)
im.save(out)
