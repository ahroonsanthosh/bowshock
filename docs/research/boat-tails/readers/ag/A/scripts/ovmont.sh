#!/bin/bash
# usage: ovmont.sh <png> <res.json> <scale> <out.png> "x0 y0 x1 y1" ...   overlays per region, stacked horizontally
d="$(dirname "$0")"; png=$1; res=$2; sc=$3; out=$4; shift 4; fs=()
i=0; for r in "$@"; do set -- $r; python3 -I "$d/overlay.py" "$png" "$res" $1 $2 $3 $4 $sc "${out%.png}_$i.png" >/dev/null; fs+=("${out%.png}_$i.png"); i=$((i+1)); done
python3 -I -c "
import sys
from PIL import Image
ims=[Image.open(f) for f in sys.argv[1:-1]]
W=sum(i.size[0] for i in ims)+10*len(ims); H=max(i.size[1] for i in ims)
o=Image.new('RGB',(W,H),'white'); x=0
for i in ims: o.paste(i,(x,0)); x+=i.size[0]+10
o.save(sys.argv[-1])" "${fs[@]}" "$out"
rm -f "${fs[@]}"; echo "$out"
