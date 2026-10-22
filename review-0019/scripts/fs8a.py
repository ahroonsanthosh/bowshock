import math
# FIRST LOOK at CR-149372 fig. 8a (PDF p. 25, 220 ppi crop), symbol centres by eye; not a reading for any band.
x0,pxd=32,(520-32)/90.0
y0,pxc=788,542.0
sets={
 0.9:[(32,130),(70,145),(141,233),(190,360),(234,513),(290,710),(357,950),(405,1138),(450,1278),(488,1278),(520,1278)],
 0.8:[(32,160),(100,205),(150,318),(185,415),(234,595),(290,820),(338,1030),(385,1240),(400,1295),(420,1325),(450,1335),(488,1340),(520,1355)],
 0.7:[(32,175),(190,470),(262,757),(305,968),(363,1255),(386,1305),(405,1335),(425,1345),(470,1360),(520,1365)],
 0.6:[(32,195),(68,215),(122,300),(170,452),(210,645),(268,905),(320,1145),(370,1345),(385,1385),(410,1408),(430,1425),(470,1400),(520,1370)],
}
def cp0(M): return ((1+0.2*M*M)**3.5-1)/(0.7*M*M)
def pinf_p0(M): return (1+0.2*M*M)**-3.5
def q_p0(M): return 0.7*M*M*pinf_p0(M)
def fs(th,cp,clip=None):
    s=0
    for i in range(len(th)-1):
        a,b=math.radians(th[i]),math.radians(th[i+1])
        c1,c2=cp[i],cp[i+1]
        if clip is not None:
            if th[i]>=clip: c1=max(c1,0)
            if th[i+1]>=clip: c2=max(c2,0)
        s+=0.5*(c1*math.cos(a)+c2*math.cos(b))*(b-a)
    return s
for M,pts in sets.items():
    th=[(x-x0)/pxd for x,y in pts]; cp=[(y0-y)/pxc for x,y in pts]
    C=fs(th,cp); Cn=fs(th,cp,clip=45)
    print(f"M {M}: Cp(0) {cp[0]:.3f} (isentropic {cp0(M):.3f}); front side on D {C:.3f}; kappa {C/(2/3*cp0(M)):.3f}; with no suction beyond 45 deg {Cn:.3f}")
# frozen p/p0 from M=1 (C(1)=0.6483, CR-149372 8b first reading; and the bound 0.6565)
for C1 in (0.6483,0.6565):
    I=pinf_p0(1)+C1*q_p0(1)
    print("freeze from C(1)=%.4f:"%C1, " ".join(f"M{M}:{(I-pinf_p0(M))/q_p0(M):.3f}" for M in (0.95,0.9,0.85,0.8)))
# kappa needed to reach the unswept upper bound 0.6565
print("kappa needed for C=0.6565:", " ".join(f"M{M}:{0.6565/(2/3*cp0(M)):.3f}" for M in (0.5,0.6,0.7,0.8,0.85,0.9)))
# Bryson eq. (43) form on the frontal height: dC/dM at M=1 = (4-2C)/(gamma+1)
print("dC/dM at M=1 for C=0.65:", (4-2*0.65)/2.4)
def cpstar(M): return 2/(1.4*M*M)*(((2+0.4*M*M)/2.4)**3.5-1)
print("--- suction limited to Cp* (separation at the sonic point, plateau at Cp*):")
for M,pts in sets.items():
    th=[(x-x0)/pxd for x,y in pts]; cp=[max((y0-y)/pxc,cpstar(M)) for x,y in pts]
    print(f"M {M}: Cp* {cpstar(M):.3f}; front side {fs(th,cp):.3f}")
