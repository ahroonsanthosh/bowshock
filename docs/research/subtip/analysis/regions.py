import json,math,struct,sys
S='/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/subtip'
probe={d['id']:d for d in map(json.loads,open(f'{S}/probe.jsonl'))}
cid=sys.argv[1]; start=float(sys.argv[2]) if len(sys.argv)>2 else 1e-3
F={}
for l in open(f'{S}/fits.jsonl'):
    d=json.loads(l)
    if d['id']==cid and d['start']==start and d.get('anchor') is None: F[d['nj']]=d
P=probe[cid]; L=P['length']; R=0.5
m=P['mach']; u=struct.unpack('f',struct.pack('f',m*math.sqrt(1.4)))[0]; qd=0.5*u*u
# drag contribution per face: (p-1) * d(r^2)/2 * 2/(q R^2); faces: use y of face centre; approximate d(r^2) from neighbours via face area*nx... recompute from wall faces x,y list: use midpoints between face centres
bins=[0,0.25,0.5,0.7,0.8,0.9,0.95,0.98,1.0,1.02,1.1,10]
res={}
for n,d in sorted(F.items()):
    w=d['wall']; xs=[f['x'] for f in w]; ys=[f['y'] for f in w]
    # node radii: reconstruct faces' end points as midpoints of centres; ends at x0 and end
    contrib=[0]*(len(bins)-1)
    for k,f in enumerate(w):
        # node positions between centres
        xa = d['x0'] if k==0 else 0.5*(xs[k-1]+xs[k]); xb = xs[-1] if k==len(w)-1 else 0.5*(xs[k]+xs[k+1])
        def r(x):
            return min(x/L,1)*R if True else 0
        # cone only (r linear up to L) -- valid for cones B, C
        dr2=(r(xb)**2-r(xa)**2)/2
        c=(f['p']-1)*dr2*2/(qd*R*R)
        xl=f['x']/L
        for b in range(len(bins)-1):
            if bins[b]<=xl<bins[b+1]: contrib[b]+=c
    res[n]=contrib
    print(n, 'total', f"{sum(contrib):.7f}", 'fit drag', f"{d['drag']:.7f}")
ns=sorted(res)
print('bin x/L      '+'  '.join(f'nj={n:<9}' for n in ns)+'  diffs')
for b in range(len(bins)-1):
    vals=[res[n][b] for n in ns]
    diffs=[vals[i+1]-vals[i] for i in range(len(vals)-1)]
    print(f'{bins[b]:.2f}-{bins[b+1]:.2f}  '+'  '.join(f'{v:.7f}' for v in vals)+'  '+' '.join(f'{x:+.2e}' for x in diffs))
