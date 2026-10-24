"""Write syms_johnston.json: Johnston figs. 10(a) to 10(c), symbols typed by eye.

Each figure's list holds, per legend entry (alpha 0 circle, 2 square, 4
diamond, 6 triangle, 8 right triangle with its right angle at the bottom
right), the approximate centres noted by eye on 1:1 crops with a pixel ruler.
Pairs that touch are fitted jointly ("pair"); centres read on a pixel map
instead of fitted are "manual". Symbols whose ink merges past separation are
"merged". Run: python3 -I mk_syms_johnston.py
"""
import json
import os

IMG = "/tmp/claude-0/-home-user-bowshock/dd60fc51-836c-5183-86f3-15ab54467394/scratchpad/round13-img/johnston/"
SHAPES = {"circle": ["circle", 13.5], "square": ["square", 11.75], "diamond": ["diamond", 17.0],
          "triangle": ["tri_up", 12.5, 21.0], "rtriangle": ["rtri_r", 14.0, 26.0]}
ALPHA = {"circle": "alpha 0 deg", "square": "alpha 2 deg", "diamond": "alpha 4 deg", "triangle": "alpha 6 deg",
         "rtriangle": "alpha 8 deg"}
PRE = {"circle": "c", "square": "s", "diamond": "d", "triangle": "t", "rtriangle": "r"}

FIG = {}
FIG["j10a"] = {
    "page": IMG + "p-032-031.png",
    "conditions": "Johnston fig. 10(a), section forebody drag coefficient c_d,f against M",
    "lists": {
        "circle": [(844, 2182), (938, 2138), (1050, 2052), (1168, 1965), (1262, 1882), (1367, 1776),
                   (1515, 1605), (1620, 1495), (1728, 1368), (1828, 1298), (1938, 1238), (1980, 1258)],
        "square": [(823, 2114), (927, 2089), (1042, 2025), (1157, 1917), (1261, 1829), (1361, 1736),
                   (1510, 1592), (1620, 1485), (1715, 1390), (1828, 1312), (1938, 1252), (1987, 1237)],
        "diamond": [(832, 1962), (938, 1890), (1094, 1828), (1200, 1778), (1305, 1710), (1411, 1600),
                    (1515, 1482), (1620, 1360), (1722, 1280), (1832, 1172), (1938, 1105), (1987, 1087)],
        "triangle": [(832, 1610), (940, 1563), (1103, 1500), (1160, 1448), (1262, 1418), (1410, 1268),
                     (1517, 1155), (1622, 1046), (1717, 949), (1832, 842), (1940, 775), (1960, 802)],
        "rtriangle": [(829, 1667), (940, 1635), (1095, 1663), (1200, 1562), (1310, 1412), (1408, 1238),
                      (1512, 1092), (1618, 924), (1723, 765), (1830, 633), (1935, 533)],
    },
    "pairs": [("c07", "s07"), ("c08", "s08"), ("c09", "s09"), ("c10", "s10"), ("c11", "s11"), ("c12", "s12"),
              ("t11", "t12")],
    "manual": {},
    "merged": {},
    "notes": {},
}


D_NOTE = ("diamond's lower half merged with a circle and square; centre read on a pixel map from its top apex "
          "(apex row + 18.5 px, the glyph's half diagonal) and apex column")
FIG["j10b"] = {
    "page": IMG + "p-033-032.png",
    "conditions": "Johnston fig. 10(b), base pressure coefficient C_p,b against M",
    "lists": {
        "circle": [(728, 1577), None, (938, 1380), (989, 1355), (1051, 1386), (1084, 1339), (1147.5, 1266),
                   (1197, 1085), (1251, 1025), None, None, None, None, (1505, 1458), None, None, None, None, None,
                   None, (1865, 2005)],
        "square": [(706, 1575), None, (925, 1396), (991, 1402), (1043, 1377), (1096, 1369), (1149, 1297.5),
                   (1200, 1153), (1250, 1046), None, None, None, None, (1511.5, 1454), None, None, None, None, None,
                   None, (1871.5, 2001)],
        "diamond": [(716, 1700), (822, 1664), (928, 1622), (980, 1549), (1032, 1486), (1085, 1486), (1139, 1404),
                    (1189, 1322), (1247, 1149), (1296, 1110), None, (1400.5, 1226.5), (1449.5, 1349.5),
                    (1506.5, 1439.5), (1558, 1553.5), (1608.5, 1621.5), (1663, 1715.5), (1716.5, 1801.5),
                    (1765.5, 1866.5), (1822, 1936.5), (1869, 1971)],
        "triangle": [(715, 2071), (822, 2123), (930, 1793), (988, 1704), (1042, 1760), (1097, 1648), (1147, 1639),
                     (1192.5, 1430), (1252, 1180), (1296, 1120), (1352, 1091), (1398, 1190), (1445, 1290),
                     (1505, 1397.5), (1557.5, 1485), (1607.5, 1565), (1662.5, 1672.5), (1717.5, 1750),
                     (1766, 1825), (1820, 1890), (1842, 1905)],
        "rtriangle": [(709, 2327), (817, 2296), (922, 1958), (978, 1956), (1026, 1871), (1080, 1722),
                      (1197.5, 1479), (1400, 1122), (1445, 1237.5), (1500, 1340), (1557.5, 1455), (1607.5, 1530),
                      (1655, 1620), (1722.5, 1715), (1755, 1762.5), (1820, 1840)],
    },
    "pairs": [("c01", "s01"), ("c03", "s03"), ("c05", "s05"), ("c09", "s09"), ("c14", "s14"), ("c21", "s21"),
              ("d10", "t10")],
    "manual": {"d12": [1400.5, 1226.5, 2.0], "d13": [1449.5, 1349.5, 2.0], "d14": [1506.5, 1439.5, 1.5],
               "d15": [1558, 1553.5, 2.0], "d16": [1608.5, 1621.5, 2.0], "d17": [1663, 1715.5, 2.0],
               "d18": [1716.5, 1801.5, 2.0], "d19": [1765.5, 1866.5, 2.0], "d20": [1822, 1936.5, 2.0]},
    # circle and square superposed (round inner field in a square outline); ink box read on pixel maps
    "merged": {"c02": [810, 1498, 838, 1525], "s02": [810, 1498, 838, 1525],
               "c10": [1281, 1005, 1311, 1034], "s10": [1281, 1005, 1311, 1034],
               "c11": [1335, 1098, 1366, 1127], "s11": [1335, 1098, 1366, 1127], "d11": [1335, 1098, 1366, 1127],
               "c12": [1383, 1213, 1413, 1243], "s12": [1383, 1213, 1413, 1243],
               "c13": [1434, 1334, 1466, 1362], "s13": [1434, 1334, 1466, 1362],
               "c15": [1542, 1542, 1574, 1570], "s15": [1542, 1542, 1574, 1570],
               "c16": [1597, 1633, 1627, 1666], "s16": [1597, 1633, 1627, 1666],
               "c17": [1646, 1717, 1677, 1745], "s17": [1646, 1717, 1677, 1745],
               "c18": [1695, 1790, 1729, 1819], "s18": [1695, 1790, 1729, 1819],
               "c19": [1752, 1868, 1782, 1895], "s19": [1752, 1868, 1782, 1895],
               "c20": [1809, 1940, 1839, 1968], "s20": [1809, 1940, 1839, 1968]},
    "notes": {"d11": "no diamond is seen apart at M about 0.98; the right side of merged cluster 11 is thickened as by a "
                     "diamond's right vertex, so a diamond is listed in the merged cluster; it may be absent",
              "t11": "upright triangle whose base merges with the top of merged cluster 11",
              "t10": "triangle mostly inside diamond d10; base and lower sides visible",
              "d10": "its lower half overlaps triangle t10",
              "t20": "faint, dotted outline", "t21": "faint, dotted outline",
              **{d: D_NOTE for d in ("d12", "d13", "d15", "d16", "d17", "d18", "d19", "d20")},
              "d14": "diamond above square s14 and circle c14; centre from its apex and side vertices on a pixel map"},
}


FIG["j10c"] = {
    "page": IMG + "p-034-033.png",
    "conditions": "Johnston fig. 10(c), section total-pressure drag coefficient c_d,t against M",
    "lists": {
        "circle": [(805, 2064), (897, 1946), (1012, 1733), (1126, 1652), (1222, 1450), (1325, 1103), (1469, 1133),
                   (1572, 1250), (1786, 1401), (1891, 1489), (1936, 1562)],
        "square": [(783, 1992), (897, 1894), (997, 1715), (1115, 1595), (1221, 1422), (1319, 1080), (1469, 1119),
                   (1572, 1234), (1682, 1332), (1786, 1418), (1891, 1506), (1941, 1528)],
        "diamond": [(789, 1952), (895, 1850), (1050, 1675), (1155, 1562), (1261, 1329), (1366, 1011), (1469, 1006),
                    (1574, 1098), (1680, 1198), (1786, 1272), (1889, 1333), (1941, 1350)],
        "triangle": [(797, 1983), (897, 1990), (1062, 1504), (1114, 1524), (1221, 1356), (1366, 687), (1467, 645),
                     (1574, 737), (1666, 818), (1786, 889), (1889, 964), (1911, 1003)],
        "rtriangle": [(788, 2296), (895, 2238), (1049, 1924), (1158, 1615), (1257, 1203), (1360, 652),
                      (1462.5, 520), (1572, 559), (1680, 603), (1786, 653), (1882, 679)],
    },
    "pairs": [("s01", "t01"), ("c06", "s06"), ("c07", "s07"), ("c08", "s08"), ("c09", "s10"), ("c10", "s11")],
    "manual": {},
    "merged": {},
    "sigma": {"t01": 3.0},
    "notes": {"t01": "right part of a triangle beside square s01, its left part hidden under the square and its apex "
                     "at diamond d01's lower vertex; centre sigma raised to 3 px",
              "s09": "square at M about 1.10 with no circle seen; its upper left is crossed by curves",
              "c09": "M about 1.16 (no circle was found at M about 1.10, where the square s09 stands alone)"},
}


def build(key, f):
    syms = []
    for typ, pts in f["lists"].items():
        for k, p in enumerate(pts, 1):
            sid = "%s%02d" % (PRE[typ], k)
            s = {"id": sid, "series": ALPHA[typ], "type": typ}
            if p is not None:
                s["at"] = [p[0], p[1]]
            elif sid not in f["merged"]:
                raise ValueError(sid + " has neither a position nor a merged box")
            if sid in f["manual"]:
                s["manual"] = f["manual"][sid]
            if sid in f["merged"]:
                s["merged"] = f["merged"][sid]
                s.pop("at", None)
            if sid in f.get("sigma", {}):
                s["sigma_px"] = f["sigma"][sid]
            if sid in f["notes"]:
                s["note"] = f["notes"][sid]
            syms.append(s)
    byid = {s["id"]: s for s in syms}
    for a, b in f["pairs"]:
        byid[a]["pair"] = b
    for s in syms:
        s["id"] = key[1:] + "-" + s["id"]
        if "pair" in s:
            s["pair"] = key[1:] + "-" + s["pair"]
    return {"page": f["page"], "shapes": SHAPES, "sw": 1.2, "conditions": f["conditions"], "symbols": syms,
            "merged_shrink": 10.0, "search": 6.0}


out = {k: build(k, f) for k, f in FIG.items()}
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "syms_johnston.json"), "w"), indent=1)
