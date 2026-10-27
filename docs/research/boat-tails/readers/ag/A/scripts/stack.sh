#!/bin/bash
# usage: stack.sh <png> <x0> <y0> <x1> <y1> <out_prefix> <shapeA> <sizeA> <shapeB> <sizeB> [cov=0.75] [dark=60]
# runs rings.py for two shapes over the centre-search region and joins the two overlays side by side
d="$(dirname "$0")"; png=$1; x0=$2; y0=$3; x1=$4; y1=$5; o=$6; cov=${11:-0.75}; dk=${12:-60}
echo "-- $7"; python3 -I "$d/rings.py" "$png" $7 $8 $x0 $y0 $x1 $y1 ${o}_A.png $cov 0.5 3 $dk
echo "-- $9"; python3 -I "$d/rings.py" "$png" $9 ${10} $x0 $y0 $x1 $y1 ${o}_B.png $cov 0.5 3 $dk
python3 -I -c "
import sys
from PIL import Image
a=Image.open(sys.argv[1]); b=Image.open(sys.argv[2])
im=Image.new('RGB',(a.size[0]+b.size[0]+10,max(a.size[1],b.size[1])),'white'); im.paste(a,(0,0)); im.paste(b,(a.size[0]+10,0)); im.save(sys.argv[3])
" ${o}_A.png ${o}_B.png ${o}.png
