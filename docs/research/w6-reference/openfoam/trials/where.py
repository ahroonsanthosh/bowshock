"""Where a run's flow moves: |d rho/dt| at a save, and the change between two saves, by cell (i along the wall from the axis, j outward)."""
import sys, numpy as np
sys.path.insert(0, "/home/user/bowshock/docs/research/w6-reference")
import w6ref, ofref
case, t0, t1, shape, cal, ratio, mach, lv = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], float(sys.argv[5]), float(sys.argv[6]), float(sys.argv[7]), int(sys.argv[8])
spec = w6ref.capped_spec(shape, cal, ratio, mach)
nose, x, r, marks = w6ref.grid(spec, lv)
ni, nj = x.shape[0] - 1, x.shape[1] - 1
xc = 0.25 * (x[:-1, :-1] + x[1:, :-1] + x[:-1, 1:] + x[1:, 1:]); rc = 0.25 * (r[:-1, :-1] + r[1:, :-1] + r[:-1, 1:] + r[1:, 1:])
d = ofref.read_internal(f"{case}/{t1}/ddt(rho)").reshape(ni, nj)
a = ofref.read_internal(f"{case}/{t0}/rho").reshape(ni, nj); b = ofref.read_internal(f"{case}/{t1}/rho").reshape(ni, nj)
p = ofref.read_internal(f"{case}/{t1}/p").reshape(ni, nj)
dr = np.abs(b - a)
print(f"grid {ni}x{nj}; rms ddt(rho) {np.sqrt((d**2).mean()):.3e}, max {np.abs(d).max():.3e}; max |rho change| {dr.max():.3e}")
for name, f in (("ddt(rho)", np.abs(d)), ("rho change", dr)):
    idx = np.argsort(f.ravel())[::-1][:12]
    print(name)
    for k in idx:
        i, j = divmod(k, nj)
        # where the shock is on this ray: the largest pressure jump outward
        js = int(np.argmax(np.abs(np.diff(p[i])))) 
        print(f"  i {i:4d} j {j:4d} x {xc[i,j]:+.4f} r {rc[i,j]:.4f} value {f[i,j]:.3e}  shock on ray near j {js}")
# share of the mean square by band of i and of j
tot = (d**2).sum()
for lo, hi in ((0, 4), (4, 16), (16, 64), (64, ni)):
    print(f"i {lo}-{hi}: {(d[lo:hi]**2).sum()/tot:.1%}", end="; ")
print()
