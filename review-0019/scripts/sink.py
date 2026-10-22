import math
def beta(m): return math.sqrt(1-m*m)
# 1. Linear 2D sink model applied to R&M 3348's single wedge (t/c_n = 0.14, face from 0 to c, closure a distance d behind the base)
def wedge(tc,mn,d_over_t):
    c=1.0; t=tc; d=d_over_t*t
    F=((c+d)*math.log(c+d)-d*math.log(d)-c*math.log(c))/d
    return -(t/(math.pi*beta(mn)*c))*F
for mn in (0.5,0.55,0.6,0.7):
    print(f"RM3348 single wedge, sink model, M_n {mn}: d=t {wedge(0.14,mn,1):.3f}, d=2t {wedge(0.14,mn,2):.3f}")
print("measured (first look, fig. 31b C_cf sec^2/0.07): 60 deg M_n 0.52-0.55: %.3f; 0.6: %.3f; 0 deg 0.6: %.3f, 0.7: %.3f; 45 deg 0.7: %.3f"%(-0.0105/0.07,-0.007/0.07,-0.006/0.07,-0.004/0.07,-0.0075/0.07))
# 2. The doc's plate bound vs the infinite swept-TE line sink in the normal plane / at the TE's own normal Mach
def doc(ct,mn): return -(1/ct)/(math.pi*beta(mn))
def swept_te(ct_stream,M,lam_le,lam_te):
    mte=M*math.cos(math.radians(lam_te))
    if mte>=1: return None
    # line sink along the TE, strength U cos(lam_te) t per unit TE length, perpendicular distance c cos(lam_te),
    # pressure on q, converted to q_n of the LE
    return -(math.cos(math.radians(lam_te))/math.cos(math.radians(lam_le))**2)*(1/ct_stream)/(math.pi*beta(mte))
cases=[("parallel edges 60 deg, M 1.2",23,1.2,60,60),("parallel edges 60 deg, M 1.6",23,1.6,60,60),
       ("parallel edges 42 deg, M 1.1 (hobby root c/t 40)",40,1.1,42,42),
       ("LE 42, TE swept 30, M 1.10, root c/t 40",40,1.10,42,30),("LE 42, TE swept 30, M 1.10, tip c/t 16",16,1.10,42,30),
       ("LE 45, TE swept 25, M 1.05, c/t 23",23,1.05,45,25),("LE 42, TE unswept, M 0.99 (limit from below)",40,0.99,42,0)]
for name,ct,M,ll,lt in cases:
    mn=M*math.cos(math.radians(ll)); s=swept_te(ct,M,ll,lt)
    print(f"{name}: M_n {mn:.3f}, TE normal Mach {M*math.cos(math.radians(lt)):.3f}; doc {doc(ct,mn):.4f}; infinite swept TE {('%.4f'%s) if s is not None else 'none (supersonic TE)'}")
# 3. body base as a 3D sink (incompressible), hobby rocket: 54 mm body, fin LE root 120 mm ahead of the base, LE 42 deg
A=math.pi*0.027**2; d=0.120
du=A/(4*math.pi*d*d)
print(f"body base 3D sink, incompressible: dCp on q {-2*du:.4f}, on q_n (42 deg) {-2*du/math.cos(math.radians(42))**2:.4f}")
