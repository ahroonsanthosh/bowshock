import json, sys
S = {"circle": 9.75, "square": 10.0, "diamond": 14.25}
ser = {"circle": "theta 15 deg (open circle)", "square": "theta 50 deg (open square)", "diamond": "theta 90 deg (open diamond)"}
raw = [  # group, kind, u, v
 ("s1","circle",622,488),("s1","square",624,461),("s1","diamond",623,449),
 ("s2","circle",740,809),("s2","square",741,786),("s2","diamond",741,792),
 ("s3","circle",907,697),("s3","square",907,710),("s3","diamond",906,702),
 ("s4","circle",1075,636),("s4","square",1074,612),("s4","diamond",1074,622),
 ("s5","circle",1244,511),("s5","square",1241,557),("s5","diamond",1240,574),
 ("s6","circle",1408,494),("s6","square",1408,490),("s6","diamond",1408,515)]
pts = [dict(id=f"a{g[1:]}{k[0]}", group=g, kind=k, u=u, v=v, series=ser[k]) for g, k, u, v in raw]
json.dump({"sizes": S, "radius": 4.0, "points": pts, "overlay_box": [520, 330, 1500, 930]}, open(sys.argv[1], "w"), indent=1)
