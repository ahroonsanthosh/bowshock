#!/usr/bin/env python3
"""Wake-up watcher for long agent jobs. Reads markers.json (a list of
{"id", "file", "pattern"} for a line that marks a job finishing, or
{"id", "pgid"} for a process group that must stay alive), skips the ids listed
in fired.txt, and exits printing the first marker that fires (recording it in
fired.txt), or exits quietly after --max seconds so the caller can re-arm."""
import json, os, re, sys, time

D = os.path.dirname(os.path.abspath(__file__))
max_s = int(sys.argv[1]) if len(sys.argv) > 1 else 7000
fired_path = os.path.join(D, 'fired.txt')


def fired():
    try:
        return set(open(fired_path).read().split())
    except FileNotFoundError:
        return set()


def check(m):
    if 'pgid' in m:
        try:
            os.killpg(int(m['pgid']), 0)
            return False
        except ProcessLookupError:
            return True
        except PermissionError:
            return False
    try:
        with open(m['file'], errors='replace') as f:
            rx = re.compile(m['pattern'])
            return any(rx.search(line) for line in f)
    except FileNotFoundError:
        return False


start = time.time()
while time.time() - start < max_s:
    markers = json.load(open(os.path.join(D, 'markers.json')))
    done = fired()
    for m in markers:
        if m['id'] in done:
            continue
        if check(m):
            with open(fired_path, 'a') as f:
                f.write(m['id'] + '\n')
            print('FIRED', m['id'], m.get('file', 'pgid %s' % m.get('pgid')))
            sys.exit(0)
    time.sleep(60)
print('TIMEOUT no marker fired')
