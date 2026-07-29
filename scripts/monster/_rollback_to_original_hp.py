"""
R01~R20 몬스터 HP를 원본(1차 변경 이전)으로 완전 복원.
원본값 출처: 트랜스크립트 step 770 — _adjust_early_hp.py 실행 전 출력값
"""

import json, re

# 트랜스크립트에서 직접 확인된 원본 HP 값
ORIGINAL_HP = {
    '1':  1180,
    '2':  1263,
    '3':  1345,
    '4':  1428,
    '5':  1511,
    '6':  1594,
    '7':  1676,
    '8':  9281,   # 보스 8R
    '9':  1759,
    '10': 1842,
    '11': 1925,
    '12': 2007,
    '13': 2090,
    '14': 2173,
    '15': 2256,
    '16': 21651,  # 보스 16R
    '17': 2338,
    '18': 2421,
    '19': 2504,
    '20': 2587,
}

# ─── stats.json 복원 ───
with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)
monsters = s['monsters']

print("=== R01~R20 원본 복원 ===")
print(f"{'라운드':>6}  {'현재 HP':>8}  {'복원 HP':>8}")
print("-" * 30)
for k, orig_hp in ORIGINAL_HP.items():
    cur_hp = monsters[k]['hp']
    boss_tag = " ← 보스" if monsters[k].get('isBoss') else ""
    print(f"  R{k.zfill(2)}  {cur_hp:>8}  {orig_hp:>8}{boss_tag}")
    monsters[k]['hp'] = orig_hp

with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(s, f, indent=2, ensure_ascii=False)
print("\nstats.json 저장 완료")

# ─── data-editor.html 동기화 ───
with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    editor = f.read()

def patch_monster_hp(html, monster_id, new_hp):
    pattern = r'(\{ id:\s*' + str(monster_id) + r',\s*name:[^,]+,\s*type:[^,]+,\s*hp:\s*)\d+'
    replacement = r'\g<1>' + str(new_hp)
    return re.subn(pattern, replacement, html)

total = 0
for k, hp in ORIGINAL_HP.items():
    editor, cnt = patch_monster_hp(editor, int(k), hp)
    total += cnt

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(editor)
print(f"data-editor.html 동기화 완료 ({total}개)")

# 경계 확인
print("\n=== 경계 확인 (R18~R23) ===")
for i in range(18, 24):
    k = str(i)
    hp = monsters[k]['hp']
    boss = " ← 보스" if monsters[k].get('isBoss') else ""
    print(f"  R{k.zfill(2)}: hp={hp:>7}{boss}")
