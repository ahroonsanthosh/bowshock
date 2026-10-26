import sys; sys.path.insert(0, sys.argv[1])
import digi
p = digi.load(sys.argv[2])
for shape, sz, xy in [("diamond", 30, (1292,2333)), ("circle", 26, (1300,2690)), ("square", 26, (1292,2512))]:
    for s in (sz-4, sz-2, sz, sz+2, sz+4):
        t = digi.tmpl(shape, s, 4)
        print(shape, s, digi.refine(p, xy[0], xy[1], t, 10))
