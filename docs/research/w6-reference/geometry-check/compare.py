import json, sys, importlib.util
spec = importlib.util.spec_from_file_location('w6ref', sys.argv[1]); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
d = json.load(open(sys.argv[2]))
worst = {'offset': 0, 'tangentX': 0, 'parent': 0, 'radius': 0}
for c in d:
    shape = 'ogive' if c['kind'] == 'ogive' else 'vk'
    n = m.capped(shape, c['L'], c['ratio'] * 0.5)
    worst['offset'] = max(worst['offset'], abs(n['offset'] - c['offset']))
    worst['tangentX'] = max(worst['tangentX'], abs(n['xt'] - c['tangentX']))
    worst['parent'] = max(worst['parent'], abs(n['Lp'] - c['parentLength']))
    for x, r in zip(c['xs'], c['rs']):
        worst['radius'] = max(worst['radius'], abs(m.radius(n, x) - r))
print(json.dumps({k: f'{v:.2e}' for k, v in worst.items()}), 'cases', len(d))
