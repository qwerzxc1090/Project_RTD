import json, re

with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)

changes = []
for u in s['units']:
    if u['id'].endswith('_yeon') or u['id'].endswith('_dok'):
        if u.get('gachaAvailable'):
            u['gachaAvailable'] = False
            changes.append(u['id'])
            print(f"  비활성: {u['id']} ({u['name']})")

with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(s, f, indent=2, ensure_ascii=False)
print(f"\nstats.json: {len(changes)}개 비활성화")

# data-editor.html 동기화
with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    editor = f.read()

def patch_gacha(html, unit_id, val):
    pattern = r'(\{id:"' + re.escape(unit_id) + r'".*?gachaAvailable:)(?:true|false)'
    return re.sub(pattern, r'\g<1>' + str(val).lower(), html)

for uid in changes:
    editor = patch_gacha(editor, uid, False)

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(editor)
print(f"data-editor.html 동기화 완료")
