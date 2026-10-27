import json, sys
d = sys.argv[1]
S = {"circle": 15.25, "square": 14.0, "tri": 19.75, "diamond_tall": 13.25}
names = {"oc": ("circle", "open circle"), "fc": ("circle", "flagged circle (tick at upper right)"), "sq": ("square", "open square"),
         "tr": ("tri", "open triangle (apex up)"), "di": ("diamond_tall", "open diamond (taller than wide)")}
raw = [("A", "oc", 792, 453), ("A", "oc", 818, 453), ("A", "oc", 811, 469), ("A", "oc", 827, 494),
 ("B", "oc", 897.7, 580), ("B", "tr", 981.7, 628), ("B", "tr", 961.7, 680), ("B", "tr", 961.7, 745),
 ("B", "oc", 991.7, 655.8), ("B", "oc", 1021.7, 665), ("B", "oc", 987.5, 687.5), ("B", "oc", 1020.8, 695), ("B", "oc", 1006.7, 717.5),
 ("B", "oc", 1071.7, 680), ("B", "oc", 1130, 658.3), ("B", "oc", 1136.7, 698.3), ("B", "oc", 1144.2, 754.2), ("B", "oc", 1141.2, 758.3),
 ("B", "oc", 1150.8, 798.3), ("B", "oc", 1182.5, 773.3), ("B", "oc", 1193.3, 785),
 ("C", "sq", 1255.7, 853.7), ("C", "fc", 1254.3, 890), ("C", "sq", 1257.1, 940), ("C", "oc", 1254.3, 968.6), ("C", "tr", 1294.3, 986),
 ("C", "fc", 1368.6, 902.9), ("C", "oc", 1450, 951.4), ("C", "oc", 1448.6, 980), ("C", "oc", 1437.1, 997),
 ("D", "fc", 1683.3, 1104), ("D", "fc", 1648.3, 1154), ("D", "di", 1796, 1064.5), ("D", "fc", 1916.7, 1160.7), ("D", "fc", 1928.3, 1207.3),
 ("E", "fc", 2138.75, 1281.25), ("E", "fc", 2196.25, 1328.75), ("E", "fc", 2319, 1289), ("E", "fc", 2345, 1300), ("E", "fc", 2340, 1362.5)]
pts = []
for i, (g, t, u, v) in enumerate(raw):
    k, ser = names[t]
    pts.append(dict(id=f"p{i+1:02d}", group=f"p{i+1:02d}", cl=g, kind=k, sym=t, u=u, v=v, series=ser))
spec = json.load(open(f"{d}/t21.json"))
spec['panels']['main'].update({"sizes": S, "radius": 4.0, "points": pts})
json.dump(spec, open(f"{d}/t21.json", "w"), indent=1)
