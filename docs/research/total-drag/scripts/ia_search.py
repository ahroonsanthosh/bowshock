import sys, json, urllib.parse, urllib.request
q = sys.argv[1]
n = int(sys.argv[2]) if len(sys.argv) > 2 else 50
params = {"q": q, "fl[]": ["identifier", "title", "date"], "rows": str(n), "output": "json"}
url = "https://archive.org/advancedsearch.php?" + urllib.parse.urlencode(params, doseq=True)
try:
    with urllib.request.urlopen(url, timeout=90) as r:
        d = json.load(r)
except Exception as e:
    print("ERR", url, e); sys.exit()
resp = d.get("response", {})
print("found", resp.get("numFound"))
for doc in resp.get("docs", []):
    t = doc.get("title")
    if isinstance(t, list): t = t[0]
    print(doc.get("identifier"), "|", (doc.get("date") or "")[:10], "|", (t or "")[:170])
