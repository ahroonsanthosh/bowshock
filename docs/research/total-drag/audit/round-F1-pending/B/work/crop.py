import sys
from PIL import Image, ImageDraw, ImageFont
x0,y0,x1,y1,z=map(int,sys.argv[1:6]); out=sys.argv[6]
im=Image.open('/tmp/scratch/f1-readers/B/p21_600-21.png').convert('RGB').crop((x0,y0,x1,y1))
im=im.resize(((x1-x0)*z,(y1-y0)*z),(Image.LANCZOS if len(sys.argv)>7 else Image.NEAREST))
d=ImageDraw.Draw(im)
try: f=ImageFont.load_default(size=14)
except: f=ImageFont.load_default()
for x in range((x0//10+1)*10,x1,10):
    X=(x-x0)*z; L=12 if x%50 else 30
    d.line([(X,0),(X,L)],fill=(255,0,0)); d.line([(X,im.height-L),(X,im.height)],fill=(255,0,0))
    if x%50==0: d.text((X+2,30),str(x),fill=(255,0,0),font=f); d.text((X+2,im.height-46),str(x),fill=(255,0,0),font=f)
for y in range((y0//10+1)*10,y1,10):
    Y=(y-y0)*z; L=12 if y%50 else 30
    d.line([(0,Y),(L,Y)],fill=(0,0,255)); d.line([(im.width-L,Y),(im.width,Y)],fill=(0,0,255))
    if y%50==0: d.text((32,Y-7),str(y),fill=(0,0,255),font=f); d.text((im.width-75,Y-7),str(y),fill=(0,0,255),font=f)
im.save(out)
