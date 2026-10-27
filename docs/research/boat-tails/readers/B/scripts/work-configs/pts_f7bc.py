import json, sys
S = {"circle": 9.75, "square": 10.0, "diamond": 14.25}
ser = {"circle": "theta 15 deg (open circle)", "square": "theta 50 deg (open square)", "diamond": "theta 90 deg (open diamond)"}
rawb = [("s1","circle",738,1169),("s1","square",739,1146),("s1","diamond",738,1124),
 ("s2","circle",904,1563),("s2","square",904,1544),("s2","diamond",904,1553),
 ("s3","circle",1030,1468),("s3","square",1030,1468),("s3","diamond",1029,1450),
 ("s4","circle",1160,1372),("s4","square",1160,1372),("s4","diamond",1156,1390),
 ("s5","circle",1291,1283),("s5","square",1290,1310),("s5","diamond",1291,1334),
 ("s6","circle",1409,1238),("s6","square",1409,1238),("s6","diamond",1410,1262)]
rawc = [("s1","circle",905,1918),("s1","square",904,1954),("s1","diamond",905,1941),
 ("s2","circle",1074,2514),("s2","square",1075,2448),("s2","diamond",1076,2483),
 ("s3","circle",1211,2338),("s3","square",1210,2372),("s3","diamond",1211,2381),
 ("s4","circle",1352,2228),("s4","square",1352,2251),("s4","diamond",1353,2279),
 ("s5","circle",1462,2162),("s5","square",1460,2147),("s5","diamond",1461,2153)]
for name, raw in (("b", rawb), ("c", rawc)):
    pts = [dict(id=f"{name}{g[1:]}{k[0]}", group=g, kind=k, u=u, v=v, series=ser[k]) for g, k, u, v in raw]
    json.dump({"sizes": S, "radius": 4.0, "points": pts}, open(sys.argv[1] + f"/pts_f7{name}.json", "w"), indent=1)
