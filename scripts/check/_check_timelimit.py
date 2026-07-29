import json

with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)

print("=== stats.json: 제한시간 있는 라운드 ===")
for w in s['waves']:
    tl = w.get('timeLimit', 0)
    ta = w.get('timeAttack', False)
    if tl > 0 or ta:
        r = w['round']
        m = s['monsters'][str(r)]
        print("R" + str(r).zfill(2) + "  timeLimit=" + str(tl) + "  timeAttack=" + str(ta) + "  isBoss=" + str(m['isBoss']))

print()
found60 = [w for w in s['waves'] if w.get('timeLimit') == 60]
print("=== 60초 항목 (stats.json) ===")
if found60:
    for w in found60:
        print("R" + str(w['round']) + ": " + str(w))
else:
    print("없음")

print()
# data-editor.html DEFAULT_WAVES 확인
with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    content = f.read()

import re
matches = re.findall(r'\{round:(\d+).*?timeLimit:(\d+).*?\}', content)
print("=== data-editor.html DEFAULT_WAVES 제한시간 ===")
for rnd, tl in matches:
    if int(tl) > 0:
        print("R" + rnd.zfill(2) + "  timeLimit=" + tl)

found60_ed = [(rnd, tl) for rnd, tl in matches if int(tl) == 60]
print()
print("=== 60초 항목 (data-editor.html) ===")
if found60_ed:
    for rnd, tl in found60_ed:
        print("R" + rnd + ": timeLimit=" + tl)
else:
    print("없음")
