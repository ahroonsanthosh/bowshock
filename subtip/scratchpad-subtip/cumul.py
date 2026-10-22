import json,math,struct,sys
S='/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/subtip'
probe={d['id']:d for d in map(json.loads,open(f'{S}/probe.jsonl'))}
cid=sys.argv[1]; start=float(sys.argv[2]) if len(sys.argv)>2 else 1e-3
anch=sys.argv[3] if len(sys.argv)>3 else None
F={}
for l in open(f'{S}/fits.jsonl'):
    d=json.loads(l)
    a=d.get('anchor'); a=None if a is None else str(a)
    if d['id']==cid and d['start']==start and a==anch: F[d['nj']]=d
P=probe[cid]; L=P['length']; R=0.5
m=P['mach']; u=struct.unpack('f',struct.pack('f',m*math.sqrt(1.4)))[0]; qd=0.5*u*u
def cumulative(d):
    w=d['wall']; nodes=[d['x0']]; ys=[]
    for f in w: nodes.append(2*f['x']-nodes[-1])
    # radius at nodes from face centre y: r_node via r_{k+1} = 2 y_k - r_k, r_0 = r(x0)
    r=[None]*(len(nodes))
    # use exact body radius for cones/ogive? use reconstruction from y
    r[0]=w[0]['y']-(w[1]['y']-w[0]['y'])*0.5*(nodes[1]-nodes[0])/(w[1]['x']-w[0]['x']) if False else None
    # simpler: radius at a node = linear interpolation of neighbouring face centre y (exact on straight segments)
    D=[d['tipDrag']]
    for k,f in enumerate(w):
        D.append(D[-1])
    return nodes,D
stations=[0.1,0.25,0.5,0.6,0.7,0.8,0.9,0.95,1.0]
def at(d,xl):
    # cumulative drag up to x = xl*L, exact for the discrete solution: sum (p-1) * d(r^2)/2 over faces, r from geometry
    import math
    x=xl*L; total=d['tipDrag']; w=d['wall']; prev=d['x0']
    def rad(x):
        if cid in('B','C','D'): return min(x/L,1)*R
        raise SystemExit('cone only')
    for f in w:
        b=2*f['x']-prev
        lo,hi=prev,min(b,x)
        if hi>lo: total+=(f['p']-1)*(rad(hi)**2-rad(lo)**2)/2*2/(qd*R*R)
        prev=b
        if b>=x: break
    return total
ns=sorted(F)
for n in ns: print('nj',n,'drag',F[n]['drag'],'cumul(end)',at(F[n],(F[n]['wall'][-1]['x']+1)/L))
print('cumulative drag to x/L:', 'nj=',ns)
for s in stations:
    v=[at(F[n],s) for n in ns]
    print(f'  {s:<5}', ' '.join(f'{x:.7f}' for x in v), ' diffs', ' '.join(f'{v[i+1]-v[i]:+.2e}' for i in range(len(v)-1)))
