import sys, csv; sys.path.insert(0,'/tmp/scratch/f1-readers/B/work')
from calfun import *
FO='Wind tunnel, fins off'; FN='Wind tunnel, fins on'; FF='Free-flight, fins on'
YQ={'P1':'Total drag coefficient, C_DT','P2':'Base drag coefficient, C_Db','P3':'Net drag coefficient, C_D'}
PN={'P1':'a (top): total drag','P2':'b (middle): base drag','P3':'c (bottom): net drag'}
ERR={'c':(0.0012,0.0012),'d':(0.002,0.002),'a':(0.004,0.004)}
S=[]  # panel,conf,shape,kind,x,y,errclass,flags,alts
def a(p,c,sh,k,x,y,e='c',f='',al=''): S.append([p,c,sh,k,x,y,e,f,al])
# ---------------- P1
P='P1'
a(P,FO,'circle','open',1346,1838,'a','ambiguous;partly-hidden','kind flagged (detached tick above at M~0.81); symbol heavily broken, left side merges with frame')
a(P,FO,'circle','flagged',1475,1838,'a','ambiguous','kind open (tick above may be a fragment); outline broken')
a(P,FO,'circle','flagged',1772,1828,'d','')
a(P,FO,'circle','flagged',1918,1840,'d','')
a(P,FO,'circle','open',2028,1850,'d','')
a(P,FO,'circle','open',2163,1865,'a','ambiguous;partly-hidden','upper and left parts hidden by gridlines; could also be read 0.005 higher (centre at top arc)')
a(P,FO,'circle','',None,None,'a','illegible;ambiguous','possible fins-off symbol near M~1.03, C_DT~0.15 (only a tick at start of fairing); alternatively not a symbol')
a(P,FO,'circle','flagged',2793,1648,'d','')
a(P,FO,'circle','flagged',2908,1678,'d','')
a(P,FO,'circle','flagged',3085,1678,'d','')
a(P,FO,'circle','open',3228,1658,'d','partly-hidden','kind flagged')
a(P,FO,'circle','flagged',3484,1702,'d','')
a(P,FO,'circle','flagged',3765,1668,'d','')
a(P,FN,'square','open',1425,1583,'d','overlap','one square with inner box (single reading at M~0.83, C_DT~0.170)')
a(P,FN,'square','open',1440,1600,'d','overlap','see previous row')
a(P,FN,'square','solid',1360,1635,'d','overlap','single solid square at M~0.81, C_DT~0.162')
a(P,FN,'square','solid',1373,1658,'d','overlap','see previous row')
a(P,FN,'square','open',1709,1549,'a','overlap;ambiguous','single tall symbol: one square centred C_DT~0.172, or square plus flag')
a(P,FN,'square','open',1709,1579,'a','overlap;ambiguous','see previous row')
a(P,FN,'square','open',1841,1576,'a','ambiguous;partly-hidden','extra vertical bar at M~0.94 could be a second square at x~M0.935 same C_DT')
a(P,FN,'square','flagged',1940,1558,'a','overlap;ambiguous','kind open; top part cluttered by crossbars')
a(P,FN,'square','open',1928,1608,'d','overlap','')
a(P,FN,'square','open',2012,1598,'a','ambiguous','second overlapping square below-left at about +0.006 lower C_DT; kind flagged')
a(P,FN,'square','open',2125,1525,'a','ambiguous;overlap','kind flagged; overlaps free-flight diamonds')
a(P,FN,'square','flagged',2218,1362,'d','overlap','two overlapping squares (cross pattern)')
a(P,FN,'square','open',2808,1375,'d','partly-hidden','')
a(P,FN,'square','open',2851,1372,'a','ambiguous;partly-hidden','not a symbol (fairing/flag fragments); or square at C_DT~0.231')
a(P,FN,'square','open',2889,1345,'a','overlap;ambiguous','left side hidden by gridline')
a(P,FN,'square','open',2901,1379,'d','overlap','')
a(P,FN,'square','flagged',3037,1340,'a','partly-hidden;ambiguous','kind open; mostly hidden by gridlines')
a(P,FN,'square','open',3174,1366,'d','partly-hidden','')
a(P,FN,'square','flagged',3230,1328,'d','overlap','')
a(P,FN,'square','open',3222,1355,'d','overlap','')
a(P,FN,'square','solid',3442,1382,'c','overlap','')
a(P,FN,'square','solid',3471,1395,'c','overlap','')
a(P,FN,'square','solid',3762,1386,'c','')
for x,y,e,f,al in [(1422,1715,'a','ambiguous','may be two overlapping diamonds'),(1548,1712,'a','partly-hidden',''),(1610,1710,'d','',''),
  (1672,1722,'a','overlap',''),(1697,1715,'a','overlap;ambiguous','not a separate symbol (hatching of neighbour)'),(1720,1720,'a','overlap;ambiguous',''),
  (1762,1715,'d','',''),(1838,1683,'a','partly-hidden',''),(1860,1725,'a','ambiguous','not a separate symbol (lower half of previous)'),
  (1882,1700,'a','partly-hidden;overlap',''),(1945,1740,'c','',''),(1905,1768,'c','out-of-line','reads ~0.007 below its neighbours; as plotted'),
  (1995,1705,'d','overlap',''),(2052,1668,'a','ambiguous;overlap','blotted cluster: one or two diamonds'),(2092,1665,'a','ambiguous;overlap','see previous row'),
  (2118,1597,'d','',''),(2157,1500,'a','ambiguous;overlap','overlaps square'),(2187,1458,'a','ambiguous;overlap',''),
  (2245,1451,'d','partly-hidden',''),(2297,1448,'a','partly-hidden',''),(2341,1456,'c','',''),(2390,1440,'a','ambiguous','fragment, may be dash-dot fairing'),
  (2420,1440,'a','overlap',''),(2445,1455,'a','overlap;ambiguous',''),(2505,1443,'d','overlap',''),(2533,1450,'a','overlap;ambiguous',''),
  (2625,1452,'a','ambiguous;partly-hidden','fragments around gridline'),(2672,1450,'d','',''),(2742,1452,'d','overlap',''),(2770,1450,'d','overlap',''),
  (2857,1455,'d','',''),(2952,1455,'d','',''),(3045,1475,'d','',''),(3195,1510,'a','ambiguous','one diamond at M~1.255, C_DT~0.193'),
  (3235,1478,'a','ambiguous','see previous row'),(3305,1508,'d','overlap',''),(3340,1490,'a','overlap;ambiguous',''),(3422,1512,'d','',''),
  (3555,1505,'a','ambiguous',''),(3678,1515,'d','overlap',''),(3675,1538,'a','overlap',''),(3810,1505,'d','overlap',''),(3820,1545,'d','overlap',''),
  (3910,1520,'d','partly-hidden','')]:
    a(P,FF,'diamond','open',x,y,e,f,al)
for M in ('0.81','0.84','0.86'):
    a(P,FF,'diamond','',None,None,'a','illegible;ambiguous','broken fragments near M~%s, C_DT~0.125-0.135; may be dash-dot fairing rather than symbols'%M)
# ---------------- P2
P='P2'
a(P,FO,'circle','open',1500,2914,'a','ambiguous;overlap','two overlapping circles; kind flagged')
a(P,FO,'circle','flagged',1768,2920,'d','')
a(P,FO,'circle','open',1925,2922,'a','ambiguous;overlap','inside blotted square; may be absent')
a(P,FO,'circle','open',2028,2925,'d','partly-hidden','')
a(P,FO,'circle','open',2205,2935,'a','ambiguous;overlap','one circle only at M~1.02')
a(P,FO,'circle','flagged',2235,2925,'a','ambiguous;overlap','kind open')
a(P,FO,'circle','flagged',2809,2860,'a','overlap','')
a(P,FO,'circle','flagged',2903,2860,'d','')
a(P,FO,'circle','flagged',3093,2850,'d','overlap','')
a(P,FO,'circle','open',3107,2862,'d','overlap','one circle with inner arc only')
a(P,FO,'circle','flagged',3238,2855,'d','overlap','')
a(P,FN,'square','solid',1364,2916,'d','overlap','single solid square at M~0.813')
a(P,FN,'square','solid',1378,2916,'d','overlap','see previous row')
a(P,FN,'square','open',1428,2920,'a','overlap;ambiguous','')
a(P,FN,'square','open',1455,2920,'a','overlap;ambiguous','may be a circle')
a(P,FN,'square','open',1711,2927,'d','','two stacked squares')
a(P,FN,'square','open',1850,2940,'d','')
a(P,FN,'square','flagged',1925,2930,'a','ambiguous;overlap','kind open; blotted')
a(P,FN,'square','open',2016,2952,'d','')
a(P,FN,'square','flagged',2125,2945,'a','ambiguous;partly-hidden','kind open')
a(P,FN,'square','open',2806,2886,'a','overlap','')
a(P,FN,'square','open',2855,2892,'d','overlap','')
a(P,FN,'square','open',3181,2837,'d','')
a(P,FN,'square','open',3228,2832,'a','ambiguous;overlap','not a square: top of the circle below')
a(P,FN,'square','solid',3450,2862,'c','overlap','')
a(P,FN,'square','solid',3476,2880,'c','overlap','')
a(P,FN,'square','solid',3767,2872,'c','')
# ---------------- P3
P='P3'
a(P,FO,'circle','open',1352,4220,'a','ambiguous;partly-hidden','broken outline, left side on frame')
a(P,FO,'circle','flagged',1478,4222,'a','ambiguous','kind open')
a(P,FO,'circle','flagged',1808,4222,'a','ambiguous','dashed-looking broken outline')
a(P,FO,'circle','open',1944,4208,'d','ambiguous','kind flagged (tick at top right); fragments below may be part of a second symbol')
a(P,FO,'circle','open',2043,4227,'d','partly-hidden','')
a(P,FO,'circle','flagged',2172,4215,'d','partly-hidden','')
a(P,FO,'circle','',None,None,'a','illegible;ambiguous','tick at top of fins-off fairing near M~1.025, C_D~0.17; possibly a symbol, possibly only a fairing end')
a(P,FO,'circle','flagged',2810,4085,'d','')
a(P,FO,'circle','flagged',2905,4097,'d','')
a(P,FO,'circle','flagged',3108,4118,'d','')
a(P,FO,'circle','open',3241,4122,'d','','kind flagged (tail at lower right)')
a(P,FO,'circle','flagged',3483,4132,'d','')
a(P,FO,'circle','open',3552,4148,'a','ambiguous;partly-hidden','not a symbol; left half hidden by gridline')
a(P,FO,'circle','flagged',3759,4125,'d','')
a(P,FN,'square','open',1437,3966,'d','overlap','')
a(P,FN,'square','open',1447,3980,'d','overlap','')
a(P,FN,'square','solid',1365,4008,'d','overlap','')
a(P,FN,'square','solid',1383,4045,'d','overlap','')
a(P,FN,'square','open',1713,3912,'d','overlap;ambiguous','single tall symbol; extra internal bar')
a(P,FN,'square','open',1713,3946,'d','overlap;ambiguous','see previous row')
a(P,FN,'square','open',1852,3950,'c','')
a(P,FN,'square','flagged',1943,3935,'d','overlap','')
a(P,FN,'square','open',1937,3988,'d','partly-hidden','')
a(P,FN,'square','flagged',2022,3950,'a','ambiguous','kind open (double top bar may be fairing); left side missing')
a(P,FN,'square','open',2135,3875,'d','partly-hidden','')
a(P,FN,'square','open',2227,3754,'d','','kind flagged')
a(P,FN,'square','open',2230,3720,'a','ambiguous;overlap','flag of the square below rather than a second square')
a(P,FN,'square','open',2815,3795,'d','partly-hidden','')
a(P,FN,'square','open',2823,3748,'a','ambiguous;overlap','fairing/flag fragments, not a symbol')
a(P,FN,'square','flagged',2854,3744,'a','overlap','kind open')
a(P,FN,'square','open',2900,3757,'d','overlap','')
a(P,FN,'square','open',2910,3772,'a','overlap;ambiguous','single square only')
a(P,FN,'square','open',3030,3766,'d','partly-hidden','')
a(P,FN,'square','open',3185,3833,'c','')
a(P,FN,'square','open',3225,3808,'d','overlap','')
a(P,FN,'square','open',3232,3820,'a','overlap;ambiguous','single square only')
a(P,FN,'square','flagged',3236,3762,'d','')
a(P,FN,'square','solid',3455,3818,'c','overlap','')
a(P,FN,'square','solid',3479,3841,'c','overlap','')
a(P,FN,'square','solid',3770,3818,'c','')
rows=[]
for p,c,sh,k,x,y,e,f,al in S:
    if x is None: M=C=''; ex=ey=''
    else:
        M,C=pix2val(p,x,y); ex,ey=ERR[e]; M='%.4f'%M; C='%.4f'%C; ex='%.4f'%ex; ey='%.4f'%ey
    rows.append(['6',PN[p],c,sh,k,'Mach number, M',M,YQ[p],C,ex,ey,f,al])
# curves: stations given as (M, C) or pixel
def cv(p,M,C,f,al,ex=0.0005,ey=0.0012):
    rows.append(['6',PN[p],FF,'none (curve)','curve','Mach number, M','%.4f'%M,YQ[p],'%.4f'%C,'%.4f'%ex,'%.4f'%ey,f,al])
P='P3'
for M in [0.82,0.84,0.86,0.88,0.90,0.92,0.94,0.96]:
    cv(P,M,0.140,'curve;partly-hidden;ambiguous','curve may not exist below M~0.97: it would lie on the C_D=0.14 gridline and only a thickened gridline is seen',ey=0.003)
Mx,Cy=pix2val(P,2020,4125); cv(P,Mx,Cy,'curve','visible left end of dashed curve (it may continue hidden along the 0.14 gridline)',ey=0.002)
for M,C in [(0.98,0.1500),(1.00,0.1886),(1.02,0.2035),(1.04,0.2040)]:
    cv(P,M,C,'curve','' ,ey=0.003 if M in (0.98,1.00) else 0.0015)
Mx,Cy=pix2val(P,2726,3903); cv(P,1.14,Cy,'curve;partly-hidden','merges with 0.20 gridline')
for M,C in [(1.16,0.1964),(1.18,0.1953),(1.20,0.1947),(1.22,0.1940),(1.24,0.1928),(1.26,0.1915),(1.28,0.1905),(1.30,0.1900),(1.32,0.1884),(1.34,0.1878),(1.36,0.1870),(1.38,0.1860),(1.40,0.1856)]:
    cv(P,M,C,'curve','')
Mx,Cy=pix2val(P,3784,3950.5); cv(P,Mx,Cy,'curve','right end of curve')
P='P2'
for nm,x,y,f,al,ey in [('le',2112,2898,'curve','visible left end; may continue to lower M hidden among symbols',0.002),
  (1.00,2147,2895,'curve','',0.0015),(1.02,2229,2869,'curve','',0.0015),(1.04,2314,2859.5,'curve','',0.001),
  (1.14,2724,2858.5,'curve','',0.001),(1.16,2804,2860,'curve','',0.001),(1.18,2885,2862,'curve','',0.001),
  (1.20,2969,2864,'curve','',0.001),(1.22,3051,2862,'curve','',0.0015),('re',3045,2866,'curve;ambiguous','last clearly separate dash; the curve may continue merged with the line just above the zero gridline to M~1.40',0.0015)]:
    Mx,Cy=pix2val(P,x,y)
    cv(P,Mx if nm in ('le','re') else nm,Cy,f,al,ey=ey)
for M in [1.24,1.26,1.28,1.30,1.32,1.34,1.36,1.38,1.40]:
    x,_=val2pix(P,M,0.0); Mx,Cy=pix2val(P,x,2871.5)
    cv(P,M,Cy,'curve;ambiguous;partly-hidden','curve may end at M~1.22; this is a line merged with the zero gridline that may instead be a wind-tunnel fairing',ey=0.002)
with open('/tmp/scratch/f1-readers/B/fig6.csv','w',newline='') as fh:
    w=csv.writer(fh); w.writerow('figure,panel,configuration,legend_symbol,kind,x_quantity,x,y_quantity,y,x_error,y_error,flags,alternatives'.split(','))
    w.writerows(rows)
from collections import Counter
cnt=Counter((r[1],r[2],r[4]=='curve') for r in rows)
for k in sorted(cnt): print(k,cnt[k])
