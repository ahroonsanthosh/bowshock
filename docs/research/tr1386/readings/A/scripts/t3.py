import sys; sys.path.insert(0, sys.argv[1])
import digi
p = digi.load(sys.argv[2])
shapes = {"tri": [(0,-12.5),(-13.5,12),(13.5,12)], "rtri": [(11.5,-11),(-11.5,11),(11.5,11)]}
for name, xy in (("tri",(1486,1345)),("rtri",(2524,952)),("tri",(2156,1354)),("rtri",(2153,942))):
    for sc in (0.9,1.0,1.1):
        t = digi.tmpl_poly([(a*sc,b*sc) for a,b in shapes[name]], 4)
        print(name, sc, digi.refine(p, xy[0], xy[1], t, 8))
