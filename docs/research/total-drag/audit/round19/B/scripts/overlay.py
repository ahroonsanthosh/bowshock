import sys, json
from PIL import Image, ImageDraw
im=Image.open(sys.argv[1]).convert('RGB'); c=json.load(open(sys.argv[2])); s=float(sys.argv[4]) if len(sys.argv)>4 else 1.0
z=12; h=14
order=['C1','C2','C3','C4','C5','C6','C7','T1','T2','T3','T4','S1','S2','S3','S4']
tiles=[]
for n in order:
    x,y=c[n]['x'],c[n]['y']
    X,Y=x*s,y*s; hh=h*s; zz=z/s
    crop=im.crop((int(X-hh),int(Y-hh),int(X+hh)+1,int(Y+hh)+1))
    ox,oy=int(X-hh),int(Y-hh)
    crop=crop.resize((int(crop.width*zz),int(crop.height*zz)),Image.NEAREST)
    d=ImageDraw.Draw(crop)
    px=(X-ox+0.5)*zz; py=(Y-oy+0.5)*zz
    d.line([(px-40,py),(px+40,py)],fill=(255,0,0),width=1); d.line([(px,py-40),(px,py+40)],fill=(255,0,0),width=1)
    d.ellipse([px-3,py-3,px+3,py+3],outline=(0,160,255))
    d.text((3,3),n,fill=(255,0,0))
    tiles.append(crop)
cols=5; tw=max(t.width for t in tiles); th=max(t.height for t in tiles)
sh=Image.new('RGB',(cols*(tw+6),3*(th+6)),'white')
for i,t in enumerate(tiles):
    r=0 if i<7 and i<5 else None
    pos={'C1':(0,0),'C2':(1,0),'C3':(2,0),'C4':(3,0),'C5':(4,0),'T1':(0,1),'T2':(1,1),'T3':(2,1),'T4':(3,1),'C6':(4,1),'S1':(0,2),'S2':(1,2),'S3':(2,2),'S4':(3,2),'C7':(4,2)}[order[i]]
    sh.paste(t,(pos[0]*(tw+6),pos[1]*(th+6)))
sh.save(sys.argv[3])
