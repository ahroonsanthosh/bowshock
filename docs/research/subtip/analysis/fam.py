import json,math
S='/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/subtip'
L={}; V={}
for l in open(f'{S}/family3.jsonl'):
    d=json.loads(l)
    if d['kind']=='level': L[(d['id'],d['family'],d['refinement'])]=d
    if d['kind']=='verified': V[(d['id'],d['family'])]=d['result']
keys=sorted({(k[0],k[1]) for k in L})
for cid,fam in keys:
    lv=[L[(cid,fam,r)] for r in (1,2,4,8) if (cid,fam,r) in L]
    print(f'{cid} {fam}:')
    for d in lv:
        print(f"   nj={d['nj']:<4} ni={d['ni']:<4} drag={d['drag']:.10f} start={d['start']:<16} its={d['iterations']:<6} remaining={d['remainingRelative']:.1e} speed={d['maxSpeed']:.1e} early={d['stoppedEarly']} conv={d['converged']} failure={d['failure']} t={d['elapsed']:.0f}s")
    v=[d['drag'] for d in lv]
    for k in range(len(v)-2):
        r=(v[k]-v[k+1])/(v[k+1]-v[k+2]); p=math.log2(r) if r>0 else float('nan')
        g=2**min(p,2)-1 if p==p else float('nan')
        print(f"   triple nj {20*2**k}-{20*2**(k+2)}: ratio={r:.3f} order={p:.3f} ext={v[k+2]+(v[k+2]-v[k+1])/g:.9f} band={1.25*abs(v[k+1]-v[k+2])/g:.2e}")
    if (cid,fam) in V and len(lv)==4:
        r=V[(cid,fam)]; print('   refineUntilVerified:', json.dumps(r['estimate']), 'total band', r.get('uncertainty'), 'verified', r.get('verified'))
