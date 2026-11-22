import sys, numpy as np
sys.path.insert(0, "/home/user/bowshock/docs/research/w6-reference")
import w6ref, ofref
case, t0, t1 = sys.argv[1], sys.argv[2], sys.argv[3]
spec = w6ref.capped_spec("hemisphere", 0.5, 1.0, 2.5); lv = 3
nose, x, r, marks = w6ref.grid(spec, lv); ni, nj = x.shape[0]-1, x.shape[1]-1
rd = lambda t, f: ofref.read_internal(f"{case}/{t}/{f}")
d = rd(t1, "ddt(rho)").reshape(ni, nj)
pa = rd(t0, "p").reshape(ni, nj); pb = rd(t1, "p").reshape(ni, nj)
T = rd(t1, "T").reshape(ni, nj); U = rd(t1, "U").reshape(ni, nj, 3)
M = np.sqrt((U**2).sum(-1)/T)
print("i  : wall p@t0  p@t1   M_wall | log10|ddt rho| at j=0,2,4,8,16,32,64,100,128 | sonic j on ray, shock j")
for i in range(20, 80, 2):
    js = int(np.argmax(np.abs(np.diff(pb[i]))))
    son = np.where(M[i] >= 1)[0]
    print(f"{i:3d}: {pa[i,0]:.5f} {pb[i,0]:.5f} {M[i,0]:.3f} |", " ".join(f"{np.log10(abs(d[i,j])+1e-12):5.1f}" for j in (0,2,4,8,16,32,64,100,128)), f"| {son[0] if len(son) else -1} {js}")
