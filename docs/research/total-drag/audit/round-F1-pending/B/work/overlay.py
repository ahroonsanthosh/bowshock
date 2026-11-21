import sys,csv; sys.path.insert(0,'/tmp/scratch/f1-readers/B/work')
from calfun import *
from PIL import Image, ImageDraw
im=Image.open('/tmp/scratch/f1-readers/B/p21_600-21.png').convert('RGB'); d=ImageDraw.Draw(im)
pm={'a':'P1','b':'P2','c':'P3'}; col={'Wind tunnel, fins off':(255,0,0),'Wind tunnel, fins on':(0,0,255),'Free-flight, fins on':(0,170,0)}
for r in csv.DictReader(open('/tmp/scratch/f1-readers/B/fig6.csv')):
    if not r['x']: continue
    p=pm[r['panel'][0]]; x,y=val2pix(p,float(r['x']),float(r['y'])); c=col[r['configuration']]
    d.ellipse([x-6,y-6,x+6,y+6],outline=c,width=3); d.line([x-12,y,x+12,y],fill=c,width=2)
for i,(y0,y1) in enumerate([(1250,1900),(2780,3000),(3650,4300)]):
    for j,(x0,x1) in enumerate([(1300,2650),(2600,3960)]):
        c=im.crop((x0,y0,x1,y1)); c=c.resize((int(c.width*1.2),int(c.height*1.2))); c.save('ov_%d%d.png'%(i,j))
