import sys, json
from PIL import Image, ImageDraw, ImageFilter
# usage: ov.py name x0 y0 x1 y1 s marks.json
name=sys.argv[1]; x0,y0,x1,y1,s=map(int,sys.argv[2:7]); marks=json.load(open(sys.argv[7]))
A=Image.open(sys.argv[8] if len(sys.argv)>8 else 'nat-000.png').convert('L').filter(ImageFilter.GaussianBlur(0.5)).convert('RGB')
pad=40
r=A.crop((x0,y0,x1,y1)).resize(((x1-x0)*s,(y1-y0)*s),Image.BICUBIC)
c=Image.new('RGB',(r.width+2*pad,r.height+2*pad),'white'); c.paste(r,(pad,pad))
d=ImageDraw.Draw(c)
for x in range((x0//10+1)*10,x1,10):
    X=pad+(x-x0)*s; L=14 if x%50==0 else 7
    d.line([(X,pad-L),(X,pad)],fill=(255,0,0))
    if x%50==0: d.text((X-12,2),str(x),fill=(255,0,0))
for y in range((y0//10+1)*10,y1,10):
    Y=pad+(y-y0)*s; L=14 if y%50==0 else 7
    d.line([(pad-L,Y),(pad,Y)],fill=(0,0,255))
    if y%50==0: d.text((0,Y-5),str(y),fill=(0,0,255))
col={'d':(230,0,0),'c':(0,150,0),'s':(0,0,230),'S':(200,0,200)}
for i,m in enumerate(marks):
    t,x,y=m[0],m[1],m[2]; h=(m[3] if len(m)>3 else {'d':12,'c':13,'s':11,'S':10}[t])
    X=pad+(x-x0)*s; Y=pad+(y-y0)*s; H=h*s
    if not(x0-15<x<x1+15 and y0-15<y<y1+15): continue
    if t=='d': d.polygon([(X,Y-H),(X+H,Y),(X,Y+H),(X-H,Y)],outline=col[t],width=2)
    elif t=='c': d.ellipse([X-H,Y-H,X+H,Y+H],outline=col[t],width=2)
    else: d.rectangle([X-H,Y-H,X+H,Y+H],outline=col[t],width=2)
    d.text((X-4,Y-6),str(i),fill=col[t])
c.save('crops/'+name+'.png')
