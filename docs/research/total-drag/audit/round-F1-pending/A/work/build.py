import csv, numpy as np
# gridline pixel positions (pixel scan of native 300-dpi scan image)
XG={1:[661.9,703.0,744.3,785.4,826.4,867.5,908.5,949.6,990.6,1031.6,1073.3,1114.3,1155.4,1196.4,1237.6,1278.5,1319.5,1360.5,1401.4,1442.4,1483.3,1524.4,1565.0,1606.3,1646.5,1687.5,1728.4,1768.6,1809.6,1850.5,1891.5,1932.3,1973.0],
    2:[662.9,704.0,745.0,786.0,827.0,869.0,909.5,951.0,992.0,1033.0,1074.0,1115.0,1156.0,1197.0,1238.5,1279.1,1321.0,1361.0,1402.0,1443.0,1484.0,1525.0,1565.5,1607.0,1647.0,1688.0,1729.0,1769.0,1810.0,1850.0,1891.0,1932.0,1973.0],
    3:[662.0,703.5,744.6,786.0,827.0,868.5,909.4,950.5,991.5,1032.4,1073.5,1114.5,1156.0,1197.0,1238.0,1279.0,1320.4,1361.0,1401.5,1443.0,1483.6,1524.6,1565.5,1606.5,1647.4,1688.4,1728.6,1769.4,1810.4,1851.0,1892.0,1932.6,1973.4]}
XV=[0.80+0.02*i for i in range(33)]
YG={1:([578.5,617.1,657.0,696.0,735.4,774.4,814.0,853.0,892.0,932.0,971.0,1010.0,1049.0,1088.5,1127.0],[0.28-0.02*i for i in range(15)]),
    2:([1362.0,1401.0,1440.0,1479.5,1518.6],[0.04,0.02,0.0,-0.02,-0.04]),
    3:([1792.4,1831.0,1869.5,1908.6,1947.5,1986.5,2025.9,2065.4,2104.4,2143.9,2183.0,2222.0,2260.9,2299.9,2338.9],[0.28-0.02*i for i in range(15)])}
def X(p,x): return float(np.interp(x,XG[p],XV))
def Y(p,y):
    g,v=YG[p]; return float(np.interp(y,g,v))
def dX(p,x): # units per px locally
    return 0.02/np.mean(np.diff(XG[p]))
def dY(p): g,v=YG[p]; return 0.02/np.mean(np.diff(g))
CONF={'c':'wind tunnel, fins off','s':'wind tunnel, fins on','S':'wind tunnel, fins on, data at fins-off R','d':'free flight, fins on'}
LEG={'c':'circle','s':'square','S':'square (solid)','d':'diamond'}
YQ={1:'Total drag coefficient, C_D_T',2:'Base drag coefficient, C_D_b',3:'Net drag coefficient, C_D'}
PN={1:'top (total drag)',2:'middle (base drag)',3:'bottom (net drag)'}
rows=[]
def add(p,t,x,y,kind=None,flags='',alt='',e=2.0):
    if kind is None: kind='solid' if t=='S' else 'open'
    rows.append(dict(p=p,t=t,x=x,y=y,kind=kind,flags=flags,alt=alt,e=e))
O='overlap';A='ambiguous';H='partly-hidden';OL='out-of-line'
# ---------------- panel 1 ----------------
P=1
add(P,'S',681.5,815.5,flags=O,alt='one solid square at about M 0.8115, C_D_T 0.159 (the two may be a single blotted symbol)')
add(P,'S',688.5,825.5,flags=O,alt='see previous row')
add(P,'s',719,794,flags=O+';'+A,alt='single flagged square at this position (inner square read as flag/second outline)',e=3)
add(P,'s',724,801,flags=O+';'+A,alt='not a separate symbol: second outline of previous square',e=3)
add(P,'s',856,773.5,flags=O+';'+A,alt='single square at y 0.180 with vertical legs (flag or fairing) down to 0.172',e=3)
add(P,'s',856,787.5,flags=O+';'+A,alt='not a separate symbol (legs of previous square)',e=3)
add(P,'s',923,788,flags=A+';'+H,alt='internal vertical stroke may be a flag; bottom edge merged with fins-on fairing',e=3)
add(P,'s',970,782,kind='flagged',flags=A,alt='open square (tick at top right may be a scan artefact)',e=3)
add(P,'s',967,808,flags=A,e=3)
add(P,'s',1009,800)
add(P,'s',1064,762,flags=O,alt='overlaps free-flight diamond at M 0.997',e=3)
add(P,'s',1112,682,kind='flagged',flags=A,alt='open square; or two overlapping squares at C_D_T ~0.227 and ~0.222',e=3)
add(P,'s',1406,689,flags=A,alt='two squares offset ~0.004 in M (double left edge)',e=3)
add(P,'s',1446,673,flags=O+';'+A+';'+H,alt='single flagged square near M 1.208, C_D_T 0.225',e=4)
add(P,'s',1455,688,flags=O+';'+A+';'+H,alt='not separate: flag/second outline of previous square; left edge hidden by gridline',e=4)
add(P,'s',1519,671,flags=H,alt='right edge hidden by M=1.22 gridline',e=3)
add(P,'s',1590,685)
add(P,'s',1617,657,kind='flagged',flags=O,alt='open square (tick at upper right)',e=3)
add(P,'s',1611,677,flags=O,e=3)
add(P,'S',1723.5,692.5,flags=O,alt='overlapping pair read from blot outline')
add(P,'S',1738,699,flags=O)
add(P,'S',1884,695.5,flags=A,alt='short vertical stroke above symbol may be a flag (solid flagged)')
# circles
add(P,'c',683,915,flags=H+';'+A,alt='fragmentary; only arcs visible near the left frame',e=6)
add(P,'c',744,916,flags=A,alt='may be flagged (strokes up-right and down)',e=3)
add(P,'c',880,920,flags=O,e=3)
add(P,'c',893,910,flags=O+';'+A,alt='inner vertical stroke may be a flag (flagged circle)',e=3)
add(P,'c',965,920)
add(P,'c',1016,922)
add(P,'c',1080,928,flags=H+';'+A,alt='fragmentary circle below fairing start',e=5)
add(P,'c',1117,848,flags=H,alt='mostly hidden by fins-off fairing and gridlines',e=4)
add(P,'c',1398,826)
add(P,'c',1453,835,flags=A,alt='small tick at upper right may be a flag (flagged circle)')
add(P,'c',1541,826,flags=A+';'+H,alt='only left arc and a blob visible; may not be a symbol',e=6)
add(P,'c',1551,843)
add(P,'c',1616,831)
add(P,'c',1742,853,kind='flagged',flags=A,alt='open circle; tail at lower right may be a fairing fragment')
add(P,'c',1882,836,flags=A,alt='stroke on left/inside may be a flag (flagged circle)',e=3)
# diamonds (free flight)
D=[(689,864,6,A+';'+H,'only lower-left edge visible; may be a fairing fragment'),
   (709,856,3,'',''),(728,863,5,A+';'+H,'only lower edge visible'),(758,876,5,A+';'+H,'only lower V visible; may be a fairing fragment'),
   (779,857,3,A,''),(810,854,3,'',''),(835,857,3,O,''),(847,863,3,O,''),(860,857,3,O,''),(878,863,3,O,''),(890,850,3,O,''),(901,858,3,O,''),
   (921,845,5,H,'only upper half visible'),(935,860,3,O,''),(944,851,3,O,''),(955,862,4,O+';'+A,''),(954,882,3,'',''),(973,867,3,'',''),(999,848,3,'',''),
   (1015,851,4,O+';'+A,''),(1031,834,5,O+';'+A,'outline broken into dots; count of diamonds in this cluster uncertain (2-4)'),(1043,834,5,O+';'+A,'see previous'),(1036,847,5,O+';'+A,'see previous'),
   (1054,814,5,O+';'+A,''),(1060,798,4,O+';'+A,'may be two overlapping diamonds'),(1070,766,4,O,'inside wind-tunnel fins-on square'),(1085,749,3,O,''),(1096,729,3,O,''),
   (1122,725,3,O,''),(1147,723,4,O+';'+A,'zigzag; may be fairing dash pattern'),(1172,728,3,O,''),(1199,721,3,O,''),(1220,727,3,O,''),(1256,721,3,O,''),(1268,725,3,O,''),
   (1318,728,3,O,''),(1337,726,3,O,''),(1372,728,3,O,''),(1387,727,3,O,''),(1429,726,4,H,'right half missing'),(1474,729,3,A,'tail below may be a flag (flagged diamond)'),
   (1525,735,3,'',''),(1593,750,5,A+';'+H,'only a V-shape visible'),(1617,740,3,'',''),(1654,757,3,O,''),(1671,746,3,O,''),(1713,758,3,O,''),(1727,752,3,O,''),
   (1773,760,3,A,'small arc above may be a flag (flagged diamond)'),(1841,760,3,O,''),(1842,771,3,O,''),(1905,756,3,O,''),(1912,773,3,O,''),(1957,764,3,'','')]
for x,y,e,f,a in D: add(P,'d',x,y,flags=f,alt=a,e=e)
# ---------------- panel 2 ----------------
P=2
add(P,'S',682,1456,flags=O+';'+A,alt='single solid square at M 0.811, C_D_b -0.008 (blot is 27 px wide, a single square is ~21 px)',e=3)
add(P,'S',688,1456,flags=O+';'+A,alt='not a separate symbol',e=3)
add(P,'s',713,1458,flags=O,e=3)
add(P,'c',723,1458,flags=O,e=3)
add(P,'c',737,1456,flags=O+';'+A,e=4)
add(P,'c',749,1453,flags=O+';'+A,alt='third circle uncertain; may be part of previous',e=4)
add(P,'s',857,1462)
add(P,'c',886,1456,flags=A,alt='ticks above/right may be a flag; may be two overlapping circles',e=3)
add(P,'s',925,1467)
add(P,'s',962,1463,flags=O+';'+A,alt='cluster of 2 squares + 1 circle drawn over each other; decomposition uncertain',e=5)
add(P,'s',973,1463,flags=O+';'+A,alt='see previous',e=5)
add(P,'c',966,1462,flags=O+';'+A,alt='see previous',e=5)
add(P,'s',1007,1475)
add(P,'c',1014,1458,flags=A+';'+H,alt='only an upper arc visible; may be a fairing segment',e=5)
add(P,'s',1063,1474,flags=O)
add(P,'c',1078,1475,flags=A+';'+H+';'+O,alt='only a dense blot beside the square; may not be a symbol',e=6)
add(P,'c',1104,1475,flags=O+';'+A,e=4)
add(P,'c',1117,1462,flags=O+';'+A,e=4)
add(P,'c',1408,1432,flags=O,e=3)
add(P,'s',1412,1442,flags=O+';'+A,alt='single square near M 1.183, C_D_b -0.001',e=4)
add(P,'s',1424,1442,flags=O+';'+A,alt='not separate (see previous)',e=4)
add(P,'c',1452,1432,kind='flagged',flags=O,alt='open circle (tick at upper right)',e=3)
add(P,'s',1454,1442,flags=O+';'+H,alt='left edge on M=1.20 gridline',e=3)
add(P,'s',1515,1438)
add(P,'c',1545,1426,flags=O,e=3)
add(P,'c',1557,1428,flags=O,e=3)
add(P,'s',1590.5,1420)
add(P,'s',1610,1420,flags=O+';'+A,alt='may be part of the overlapping circle; second fins-on square at M~1.27',e=4)
add(P,'c',1617,1426,flags=O,e=3)
add(P,'S',1725,1433.5,flags=O)
add(P,'S',1738,1440,flags=O)
add(P,'c',1750,1441,flags=H+';'+O,alt='right arc only, behind solid squares',e=4)
add(P,'S',1884,1439,flags=A,alt='diagonal tick from upper-right corner may be a flag (solid flagged)')
# ---------------- panel 3 ----------------
P=3
add(P,'S',680.5,2006,flags=O); add(P,'S',690,2021,flags=O)
add(P,'s',716.5,1981.5,flags=O+';'+A,alt='single flagged square (second outline read as flag)',e=3)
add(P,'s',721.5,1988,flags=O+';'+A,alt='not separate',e=3)
add(P,'s',856,1960.5,flags=O+';'+A,alt='single square with legs (see panel 1 same M)',e=3)
add(P,'s',856,1970.5,flags=O+';'+A,alt='not separate',e=3)
add(P,'s',925,1974)
add(P,'s',971,1966.5,kind='flagged',flags=O+';'+A,alt='open square (tick top right); internal bars uncertain',e=3)
add(P,'s',966,1990.5,flags=O+';'+H,e=3)
add(P,'s',1009,1974,flags=A,e=3)
add(P,'s',1064,1937)
add(P,'s',1111,1874,kind='flagged',alt='open square (flag above)')
add(P,'s',1407,1899,flags=A,e=3)
add(P,'s',1420,1871,flags=O+';'+A,e=4)
add(P,'s',1451,1882,flags=O+';'+A,alt='inner outline: may be two overlapping squares',e=3)
add(P,'s',1516,1883)
add(P,'s',1591,1917)
add(P,'s',1618,1881,flags=A,e=3)
add(P,'s',1612,1907,flags=O,e=3)
add(P,'S',1726,1911,flags=O); add(P,'S',1738,1920.5,flags=O)
add(P,'S',1884,1911.5)
add(P,'c',676,2107,flags=H+';'+A,alt='left side hidden by frame; fragmentary',e=6)
add(P,'c',733,2106,flags=O+';'+A,alt='single circle at M ~0.838 (two arcs may be one symbol)',e=4)
add(P,'c',748,2112,flags=O+';'+A,e=4)
add(P,'c',893,2113,flags=A,alt='outline broken into dashes; may be two overlapping circles as in panel 1',e=3)
add(P,'c',970,2103,flags=A,alt='arcs below may be a flag or a second circle at about (M 0.957, C_D 0.117)',e=3)
add(P,'c',1021,2112)
add(P,'c',1084,2106,flags=H+';'+A,e=4)
add(P,'c',1118,2033,flags=H+';'+A,alt='only right arc visible; mark above may be a flag',e=5)
add(P,'c',1404,2040,flags=A,alt='may be two overlapping circles',e=4)
add(P,'c',1450,2051,flags=A,alt='may be flagged',e=3)
add(P,'c',1555,2060,flags=A,e=3)
add(P,'c',1617,2060,flags=A,alt='arc below may be a flag',e=3)
add(P,'c',1739,2067,flags=A,e=3)
add(P,'c',1767,2073,flags=A+';'+H,alt='right arc only; may be a flag/fragment of previous circle, not a symbol',e=6)
add(P,'c',1880,2062,flags=O+';'+A,alt='double outline: may be two overlapping circles',e=4)
# ---------------- curves without symbols ----------------
curves={2:[(988,1444.5),(994.5,1444.5),(1019,1446.8),(1039.5,1448.5),(1062,1450),(1082,1447),(1104,1436),(1126,1432.5),(1154,1429.5),(1185,1428),(1205,1428),(1232.5,1428.5),(1253,1428),(1274,1428.5),(1297,1428.5),(1320.5,1428.5),(1341.5,1430),(1360.5,1430),(1382.5,1430),(1477,1432),(1495.5,1432.5),(1513.5,1429),(1522,1429)],
        3:[(992,2062),(1015,2062.5),(1020,2057.5),(1040,2037.5),(1045,2033),(1050,2021),(1055,2016),(1060,1999),(1065,1983.5),(1085,1953),(1105,1942),(1110,1941),(1120,1939),(1130,1937.5),(1150,1939),(1170,1940),(1190,1941),(1210,1942),(1225,1943.5),(1344,1950),(1364,1952),(1384,1953),(1404,1953.8),(1424,1956),(1444,1956.9),(1464,1957.4),(1484,1958.1),(1504,1958.6),(1524,1960.2),(1544,1961.2),(1564,1962),(1584,1962.7),(1604,1963.5),(1624,1965.2),(1644,1966.1),(1664,1967.2),(1684,1967.5),(1704,1968.6),(1724,1970.5),(1744,1971.5),(1764,1971.9),(1784,1972.5),(1804,1972.8),(1824,1973.6),(1844,1975.5),(1864,1976.2),(1888,1976.8)]}
gaps={2:[(1382.5,1477,'hidden behind symbols')],3:[(1225,1344,'on the C_D=0.20 gridline')]}
stations=[round(0.82+0.02*i,2) for i in range(12)]+[round(1.14+0.02*i,2) for i in range(14)]
crow=[]
for p,pts in curves.items():
    xs=np.array([a for a,b in pts]); ys=np.array([b for a,b in pts])
    Mends=(X(p,xs[0]),X(p,xs[-1]))
    sts=[('end',Mends[0])]+[('st',m) for m in stations if Mends[0]+0.0015<m<Mends[1]-0.0015]+[('end',Mends[1])]
    for kind,m in sts:
        xp=float(np.interp(m,XV,XG[p])); yp=float(np.interp(xp,xs,ys))
        fl=['curve',A]
        for g0,g1,why in gaps[p]:
            if g0<xp<g1: fl.append(H)
        crow.append(dict(p=p,m=m,y=Y(p,yp),flags=';'.join(fl),end=kind))
with open('fig6.csv','w',newline='') as f:
    w=csv.writer(f)
    w.writerow('figure,panel,configuration,legend_symbol,kind,x_quantity,x,y_quantity,y,x_error,y_error,flags,alternatives'.split(','))
    for r in sorted(rows,key=lambda r:(r['p'],r['t'].lower(),r['t'],r['x'])):
        p=r['p']
        ex=max(r['e']*dX(p,r['x']),0.0005); ey=max(r['e']*dY(p),0.0005)
        w.writerow(['6',PN[p],CONF[r['t']],LEG[r['t']],r['kind'],'Mach number, M',f"{X(p,r['x']):.4f}",YQ[p],f"{Y(p,r['y']):.4f}",f"{ex:.4f}",f"{ey:.4f}",r['flags'],r['alt']])
    for c in crow:
        p=c['p']
        alt='configuration inferred (dashed line with no symbols; free flight per legend/text); could instead be a wind-tunnel fairing' if p==2 else 'configuration inferred (dashed line with no symbols; free flight per legend/text)'
        if c['end']=='end': alt+='; end of visible curve'
        w.writerow(['6',PN[p],'free flight, fins on (curve, no symbols)','none (dashed line)','curve','Mach number, M',f"{c['m']:.4f}",YQ[p],f"{c['y']:.4f}",'0.0020' if c['end']=='end' else '0.0005','0.0015' if p==3 else '0.0010',c['flags'],alt])
from collections import Counter
cnt=Counter((r['p'],CONF[r['t']],r['kind']) for r in rows)
for k in sorted(cnt): print(k,cnt[k])
print('curve rows',Counter(c['p'] for c in crow))
