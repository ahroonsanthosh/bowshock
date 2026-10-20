import sys
from PIL import Image
out=sys.argv[1]; ims=[Image.open(p) for p in sys.argv[2:]]
w=sum(i.width for i in ims); h=max(i.height for i in ims)
o=Image.new('L',(w,h),255); x=0
for i in ims: o.paste(i.convert('L'),(x,0)); x+=i.width
o.save(out)
