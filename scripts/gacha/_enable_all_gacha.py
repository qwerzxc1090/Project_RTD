import json, re

with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)

# 전체 활성화
cnt = 0
for u in s['units']:
    if not u.get('gachaAvailable'):
        u['gachaAvailable'] = True
        cnt += 1
        print(f"  활성화: {u['id']} ({u['name']})")

with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(s, f, indent=2, ensure_ascii=False)
print(f"\nstats.json: {cnt}개 활성화, 총 {len(s['units'])}개 전부 gachaAvailable=true")

# data-editor.html 동기화
with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    editor = f.read()

before = editor.count('gachaAvailable:false')
editor = editor.replace('gachaAvailable:false', 'gachaAvailable:true')
after = editor.count('gachaAvailable:false')

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(editor)
print(f"data-editor.html: {before - after}개 false → true 변경")
