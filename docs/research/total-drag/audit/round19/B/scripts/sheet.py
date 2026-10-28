import sys
from PIL import Image, ImageDraw
im=Image.open(sys.argv[1]).convert('L')
approx = [('C1',564,2511),('C2',712,2489),('C3',815,2454),('C4',915,2409),('C5',1015,2376),('C6',1115,2375),('C7',1208,2921),
          ('T1',513,2593),('T2',607,2591),('T3',815,2553),('T4',1113,2468),
          ('S1',512,2657),('S2',612,2650),('S3',815,2621),('S4',1115,2589)]
h=22; z=8
W=(2*h)*z
sheet=Image.new('L',(W*5+40, (W+30)*3+20),255)
d=ImageDraw.Draw(sheet)
for i,(n,x,y) in enumerate(approx):
    c=im.crop((x-h,y-h,x+h,y+h)).resize((W,W),Image.NEAREST)
    col=i%5 if i<15 else 0
    if n.startswith('C'): r=0; col=i
    elif n.startswith('T'): r=1; col=i-7
    else: r=2; col=i-11
    if r==0 and col>=5: r=0
    px=col*(W+8); py=r*(W+30)
    if n=='C6': px,py=4*(W+8),1*(W+30)
    if n=='C7': px,py=4*(W+8),2*(W+30)
    sheet.paste(c,(px,py+20)); d.text((px+4,py+4),f'{n} ({x},{y})',fill=0)
sheet.save(sys.argv[2])
