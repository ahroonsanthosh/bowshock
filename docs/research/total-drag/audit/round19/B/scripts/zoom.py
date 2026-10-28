import sys
from PIL import Image, ImageDraw
im=Image.open(sys.argv[1]).convert('L')
out=sys.argv[2]; z=int(sys.argv[3]); h=int(sys.argv[4])
pts=[tuple(map(int,a.split(','))) for a in sys.argv[5:]]
tiles=[]
for (x,y) in pts:
    c=im.crop((x-h,y-h,x+h+1,y+h+1)).resize(((2*h+1)*z,(2*h+1)*z),Image.NEAREST).convert('RGB')
    d=ImageDraw.Draw(c)
    # pixel grid every 5 px, label center
    for k in range(0,2*h+2,1):
        col=(255,180,180) if (k-h)%5==0 else None
        if col:
            d.line([(k*z,0),(k*z,c.height)],fill=col); d.line([(0,k*z),(c.width,k*z)],fill=col)
    d.text((2,2),f'{x},{y}',fill=(255,0,0))
    tiles.append(c)
W=sum(t.width for t in tiles)+10*len(tiles)
sh=Image.new('RGB',(W,tiles[0].height),'white'); px=0
for t in tiles: sh.paste(t,(px,0)); px+=t.width+10
sh.save(out)
