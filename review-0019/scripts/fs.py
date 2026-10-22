import math
# first look at CR-149372 fig. 8a, M 0.9 hexagons, pixel coords on the 110 ppi render (rough, not a reading)
x0,px_deg=297,(541-297)/90
y0,px_cp=612,(612-285)/1.2
pts=[(297,285),(318,291),(350,337),(376,400),(398,477),(425,575),(459,692),(483,789),(505,860),(527,860),(541,860)]
th=[(x-x0)/px_deg for x,y in pts]; cp=[(y0-y)/px_cp for x,y in pts]
def fs(th,cp):
    s=0
    for i in range(len(th)-1):
        a,b=math.radians(th[i]),math.radians(th[i+1])
        s+=0.5*(cp[i]*math.cos(a)+cp[i+1]*math.cos(b))*(b-a)
    return s
def cp0(M): return ((1+0.2*M*M)**3.5-1)/(0.7*M*M)
for t,c in zip(th,cp): print(f"{t:6.1f} {c:6.3f}")
C=fs(th,cp); print("front side on D, M0.9:",round(C,3)," kappa:",round(C/(2/3*cp0(0.9)),3), "Cp0",round(cp0(0.9),4))
