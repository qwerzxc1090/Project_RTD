"""
기존 goldReward = 마리당 골드 → 신규 goldReward = 웨이브 총 골드
변환: 신규 = 구 × count (이전 의미 그대로 유지)
보스는 count=1이므로 변화 없음.
"""
import json

with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)

waves = {w['round']: w for w in s['waves']}
monsters = s['monsters']

print("=== goldReward 총골드로 변환 ===")
print("라운드  cnt  구값  신값(총)  마리당")
print("-" * 48)

for r_str, m in monsters.items():
    r = int(r_str)
    if r not in waves:
        continue
    if m['isBoss']:
        print(f"R{r:02d}  (BOSS)  gold={m['goldReward']}  변환없음")
        continue
    w = waves[r]
    cnt = w['count']
    old_gold = m['goldReward']
    new_total = old_gold * cnt          # 기존 마리당 × 수량 = 신규 총
    m['goldReward'] = new_total
    per_check = round(max(cnt, new_total) / cnt, 1)
    print(f"R{r:02d}  cnt={cnt}  구={old_gold}  총={new_total}  마리당={per_check}G")

with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(s, f, indent=2, ensure_ascii=False)
print("\nstats.json 저장 완료")

# data-editor.html 동기화
import re
with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    editor = f.read()

def patch_monster_field(html, monster_id, field, new_val):
    pattern = r'(\{id:"' + re.escape(str(monster_id)) + r'".*?' + re.escape(field) + r':)\d+'
    return re.sub(pattern, r'\g<1>' + str(new_val), html)

cnt_map = {int(w['round']): w['count'] for w in s['waves']}
for r_str, m in monsters.items():
    r = int(r_str)
    if not m['isBoss']:
        editor = patch_monster_field(editor, r, 'goldReward', m['goldReward'])

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(editor)
print("data-editor.html 동기화 완료")
