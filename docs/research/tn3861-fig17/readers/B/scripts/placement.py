import sys, pypdf
r = pypdf.PdfReader(sys.argv[1])
p = r.pages[int(sys.argv[2]) - 1]
print("mediabox", p.mediabox, "cropbox", p.cropbox, "rotate", p.get('/Rotate'))
c = p.get_contents().get_data()
print(c[:600])
