"""
2차 변경 상태로 롤백:
  - R01~R20: 현재값 유지 (이미 2차 변경 적용된 값)
  - R21~R23:  3차 변경(_apply_transition.py)으로 997, 1477, 1958 로 바뀐 것을
              원본값(2669, 2752, 2835)으로 복원

원본 확인 근거 (트랜스크립트 로그):
  R21 원본 hp=2669  (로그 직접 확인)
  R22 원본 hp=2752  (로그 직접 확인)
  R23 원본 hp=2835  (R22+83 패턴 추정, 원본 R19~R22 각 83씩 증가)
"""

import json, re

# ── 복원 대상: 3차 변경(_apply_transition.py)으로 수정된 라운드 ──
ROLLBACK = {
    '21': 2669,
    '22': 2752,
    '23': 2835,
}

# ─── stats.json 복원 ───
with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)

monsters = s['monsters']

print("=== 롤백 적용 (3차 변경 → 2차 변경 상태) ===")
print(f"{'라운드':>6} {'현재 HP':>10} {'복원 HP':>10} {'변화':>10}")
print("-" * 45)
for k, orig_hp in ROLLBACK.items():
    cur_hp = monsters[k]['hp']
    diff = orig_hp - cur_hp
    print(f"  R{k.zfill(2)}  {cur_hp:>10} {orig_hp:>10} {diff:>+10}")
    monsters[k]['hp'] = orig_hp

print()
print("=== 전후 경계 확인 (R18~R26) ===")
for i in range(18, 27):
    k = str(i)
    hp = monsters[k]['hp']
    boss = " ← 보스" if monsters[k].get('isBoss') else ""
    print(f"  R{k.zfill(2)}: hp={hp:>7}{boss}")

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
for k, hp in ROLLBACK.items():
    editor, cnt = patch_monster_hp(editor, int(k), hp)
    total += cnt
    print(f"  data-editor R{k.zfill(2)}: hp → {hp} ({cnt}개 패치)")

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(editor)

print(f"\ndata-editor.html 동기화 완료 ({total}개)")
