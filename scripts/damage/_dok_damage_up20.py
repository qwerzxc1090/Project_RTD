import json, re

with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)

print(f"{'ID':<14} {'이름':<16} {'구공격':>8} {'신공격':>8} (+20%)")
print("-" * 55)

changes = []
for u in s['units']:
    if u['id'].endswith('_dok'):
        old_dmg = u['damage']
        new_dmg = round(old_dmg * 1.20)
        u['damage'] = new_dmg
        changes.append((u['id'], old_dmg, new_dmg))
        print(f"{u['id']:<14} {u['name']:<16} {old_dmg:>8} {new_dmg:>8}")

with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(s, f, indent=2, ensure_ascii=False)
print(f"\nstats.json 저장 완료 ({len(changes)}개)")

# data-editor.html 동기화
with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    editor = f.read()

def patch_field(html, unit_id, field, new_val):
    pattern = r'(\{id:"' + re.escape(unit_id) + r'".*?' + re.escape(field) + r':)\d+'
    return re.sub(pattern, r'\g<1>' + str(new_val), html)

for uid, od, nd in changes:
    editor = patch_field(editor, uid, 'damage', nd)

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(editor)
print("data-editor.html 동기화 완료")
