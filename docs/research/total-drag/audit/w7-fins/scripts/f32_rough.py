"""Write fig. 32's rough centres (zoomed views of the crop at page (380,
280)) and its grid file, in crop pixels. Usage: python3 -I f32_rough.py <out.csv> <grid.json>"""
import json
import sys

pts = [(196.3, 835.6), (444, 798.5), (634, 748.5), (716, 707.5), (789, 628.5), (851.5, 505), (912.5, 397.5), (965, 299),
       (1021, 155)]
with open(sys.argv[1], 'w') as f:
    f.write('id,kind,x,y\n')
    for i, (x, y) in enumerate(pts, 1):
        f.write(f'o{i:02d},circle,{x:.1f},{y:.1f}\n')
xs = [45, 217, 390, 562, 735, 908, 1081, 1253]
ys = [43, 160.5, 275, 390, 504, 618, 730.5, 842]
json.dump({'x': [[-5.0 + i, p] for i, p in enumerate(xs)],
           'y': [[3.0 - 0.5 * i, p] for i, p in enumerate(ys)], 'band': 60}, open(sys.argv[2], 'w'))
