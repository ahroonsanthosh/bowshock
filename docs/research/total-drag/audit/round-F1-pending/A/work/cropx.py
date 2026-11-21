import sys
from PIL import Image, ImageDraw, ImageFilter
A=Image.open('nat-000.png').convert('L').filter(ImageFilter.GaussianBlur(0.6)).convert('RGB')
B=Image.open('degrid.png').convert('L').filter(ImageFilter.GaussianBlur(0.5)).convert('RGB')
name=sys.argv[1]; x0,y0,x1,y1,s=map(int,sys.argv[2:7])
pad=40
def panel(im):
    r=im.crop((x0,y0,x1,y1)).resize(((x1-x0)*s,(y1-y0)*s),Image.BICUBIC)
    c=Image.new('RGB',(r.width+2*pad,r.height+2*pad),'white'); c.paste(r,(pad,pad))
    d=ImageDraw.Draw(c)
    for x in range((x0//5+1)*5,x1,5):
        X=pad+(x-x0)*s; L=14 if x%50==0 else (9 if x%10==0 else 4)
        d.line([(X,pad-L),(X,pad)],fill=(255,0,0)); d.line([(X,c.height-pad),(X,c.height-pad+L)],fill=(255,0,0))
        if x%50==0: d.text((X-12,2),str(x),fill=(255,0,0)); d.text((X-12,c.height-12),str(x),fill=(255,0,0))
        if x%10==0:
            for y in range((y0//10+1)*10,y1,10):
                Y=pad+(y-y0)*s; d.point([(X,Y),(X+1,Y)],fill=(255,0,0))
    for y in range((y0//5+1)*5,y1,5):
        Y=pad+(y-y0)*s; L=14 if y%50==0 else (9 if y%10==0 else 4)
        d.line([(pad-L,Y),(pad,Y)],fill=(0,0,255)); d.line([(c.width-pad,Y),(c.width-pad+L,Y)],fill=(0,0,255))
        if y%50==0: d.text((0,Y-5),str(y),fill=(0,0,255)); d.text((c.width-30,Y-5),str(y),fill=(0,0,255))
    return c
a=panel(A); b=panel(B)
c=Image.new('RGB',(a.width+b.width,a.height),'white'); c.paste(a,(0,0)); c.paste(b,(a.width,0))
c.save('crops/'+name+'.png')
