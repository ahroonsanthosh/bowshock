import sys
import numpy as np
from PIL import Image, ImageDraw
raw = Image.open(sys.argv[1]).convert('L')
syms = {
 'c1':(564,2512),'c2':(713,2489),'c3':(815,2455),'c4':(915,2408),'c5':(1015,2376),'c6':(1115,2376),'c7':(1207,2920),
 't1':(516,2593),'t2':(606,2590),'t3':(815,2554),'t4':(1115,2467),
 's1':(513,2656),'s2':(613,2649),'s3':(815,2623),'s4':(1115,2589)}
half=22; z=8
groups = [['c1','c2','c3','c4'],['c5','c6','c7','t1'],['t2','t3','t4','s1'],['s2','s3','s4']]
for gi,grp in enumerate(groups):
    sheet = Image.new('L', (len(grp)*(2*half*z+10), 2*half*z+30), 255)
    d = ImageDraw.Draw(sheet)
    for i,n in enumerate(grp):
        x,y = syms[n]
        c = raw.crop((x-half,y-half,x+half,y+half)).resize((2*half*z,2*half*z), Image.NEAREST)
        sheet.paste(c,(i*(2*half*z+10),25))
        d.text((i*(2*half*z+10)+5,5), f"{n} @({x},{y})", fill=0)
    sheet.save(f'sheet{gi}.png')
