import sys, json
import numpy as np
from PIL import Image, ImageDraw
img = Image.open(sys.argv[1]).convert('RGB')
g = json.load(open(sys.argv[2]))
d = ImageDraw.Draw(img)
for k,(b,a) in g['h'].items():
    d.line([(200, a+b*200), (1260, a+b*1260)], fill=(255,0,0), width=1)
for k,(b,a) in g['v'].items():
    d.line([(a+b*2130, 2130), (a+b*2950, 2950)], fill=(0,0,255), width=1)
img.crop((150,2100,1300,2980)).save(sys.argv[3])
# quadrant zooms of raw image
raw = Image.open(sys.argv[1]).convert('RGB')
boxes = {'q1':(200,2130,740,2560),'q2':(700,2130,1260,2560),'q3':(200,2520,740,2960),'q4':(700,2520,1260,2960)}
for n,b in boxes.items():
    c = raw.crop(b); c = c.resize((c.width*2, c.height*2), Image.LANCZOS); c.save(f'zoom_{n}.png')
