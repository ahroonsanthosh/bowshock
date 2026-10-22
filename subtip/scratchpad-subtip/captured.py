import json,math
S='/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/subtip'
L={}; R={}; G={}
for f in ('captured-run1.jsonl','captured.jsonl'):
    try:
        for l in open(f'{S}/{f}'):
            d=json.loads(l)
            if d['kind']=='captured-level': L[(d['id'],d['refinement'])]=d
            if d['kind']=='captured-result': R[d['id']]=d
            if d['kind']=='captured-grid': G[(d['id'],d['refinement'])]=d
    except FileNotFoundError: pass
for cid in sorted({k[0] for k in L}):
    v=[L[(cid,r)]['drag'] for r in (1,2,4,8) if (cid,r) in L]
    its=[L[(cid,r)]['iterations'] for r in (1,2,4,8) if (cid,r) in L]
    gates=[G[(cid,r)]['gateFailures'] for r in (1,2,4,8) if (cid,r) in G]
    print(cid,'captured drags',' '.join(f'{x:.7f}' for x in v),'iterations',its)
    for k in range(len(v)-2):
        r=(v[k]-v[k+1])/(v[k+1]-v[k+2]); print(f'   triple {k}: ratio={r:.3f} order={math.log2(abs(r)) if r>0 else float("nan"):.3f}')
    if cid in R:
        e=R[cid]['result']['estimate']; print('   result:',{k:e[k] for k in e}, 'total band',R[cid]['result']['uncertainty'])
    print('   gates:',gates)
