"""Exact 2D inviscid (shock-expansion) drag of a symmetric double-wedge section vs Ackeret.
Oblique shock: theta-beta-M relation solved for the weak root; Prandtl-Meyer for the expansion.
cd (both surfaces, on chord) = (Cp_front - Cp_rear) * t/c for the ridge at mid-chord."""
import math
g = 1.4
def pm(M):
    return math.sqrt((g+1)/(g-1))*math.atan(math.sqrt((g-1)/(g+1)*(M*M-1))) - math.atan(math.sqrt(M*M-1))
def pm_inv(nu):
    lo, hi = 1.0, 50.0
    for _ in range(200):
        mid = 0.5*(lo+hi)
        if pm(mid) < nu: lo = mid
        else: hi = mid
    return 0.5*(lo+hi)
def theta_of_beta(M, b):
    return math.atan(2/math.tan(b)*(M*M*math.sin(b)**2-1)/(M*M*(g+math.cos(2*b))+2))
def oblique(M, th):
    mu = math.asin(1/M)
    # find max deflection
    bs = [mu + (math.pi/2-mu)*i/20000 for i in range(1, 20000)]
    tmax, bmax = max((theta_of_beta(M, b), b) for b in bs)
    if th > tmax: return None
    lo, hi = mu, bmax
    for _ in range(200):
        mid = 0.5*(lo+hi)
        if theta_of_beta(M, mid) < th: lo = mid
        else: hi = mid
    b = 0.5*(lo+hi)
    Mn1 = M*math.sin(b)
    p21 = 1 + 2*g/(g+1)*(Mn1*Mn1-1)
    Mn2 = math.sqrt((1+(g-1)/2*Mn1*Mn1)/(g*Mn1*Mn1-(g-1)/2))
    M2 = Mn2/math.sin(b-th)
    return p21, M2, math.degrees(b)
def cd_exact(M, tc):
    th = math.atan(tc)          # ridge at mid-chord: face slope = (t/2)/(c/2)
    r = oblique(M, th)
    if r is None: return None
    p21, M2, b = r
    # expansion by 2*theta at the ridge
    M3 = pm_inv(pm(M2) + 2*th)
    p32 = ((1+(g-1)/2*M2*M2)/(1+(g-1)/2*M3*M3))**(g/(g-1))
    q = g/2*M*M
    cp1 = (p21-1)/q
    cp3 = (p21*p32-1)/q
    return (cp1-cp3)*tc
if __name__ == '__main__':
    # self-check: weak small deflection -> Ackeret
    print('check M=2, tc=0.001: exact/Ackeret = %.5f' % (cd_exact(2.0, 0.001)/(4*0.001**2/math.sqrt(3))))
    for tc in (0.03, 0.05, 0.08):
        row = []
        for M in (1.2, 1.3, 1.5, 2.0, 2.5, 3.0):
            ex = cd_exact(M, tc)
            ack = 4*tc*tc/math.sqrt(M*M-1)
            row.append('M%.1f: %s' % (M, 'detached' if ex is None else '%.3f' % (ex/ack)))
        print('t/c=%.2f exact/Ackeret ' % tc + '  '.join(row))
