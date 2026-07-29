"""
최종 전략:
- R20(517) -> R21~R23 선형 보간 -> R25(2918)로 자연스럽게 이어지게
- R24 보스는 원본(34021) 그대로 유지 (사용자 요청 없음)
- R25 이후도 원본 그대로

흐름: R20=517 -> R21=997 -> R22=1477 -> R23=1958 -> R24보스(원본) -> R25=2918 -> ...
R24 보스는 R25 이후 일반 몬스터보다 훨씬 높으므로 역전 없음.
"""

import json, re

with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)
monsters = s['monsters']

r20 = monsters['20']['hp']   # 517
r25 = monsters['25']['hp']   # 2918
base = r20
target = r25
steps = 5

r21_new = round(base + (target - base) * 1/steps)  # 997
r22_new = round(base + (target - base) * 2/steps)  # 1477
r23_new = round(base + (target - base) * 3/steps)  # 1958

adjustments = {
    '21': r21_new,
    '22': r22_new,
    '23': r23_new,
    # R24 보스: 원본 유지
}

print("=== 최종 적용 계획 ===")
prev = r20
for rnd in range(20, 29):
    k = str(rnd)
    hp = adjustments.get(k, monsters[k]['hp'])
    boss_tag = '(보스)' if monsters[k]['type'] == 'boss' else ''
    diff = hp - prev
    print(f"R{k.zfill(2)}: hp={hp:7}  diff={diff:+7}  {boss_tag}")
    prev = hp

# 적용
for k, hp in adjustments.items():
    monsters[k]['hp'] = hp

with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(s, f, indent=2, ensure_ascii=False)
print("\nstats.json 적용 완료")

# data-editor.html 동기화
with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    editor = f.read()

def patch_monster_hp(html, monster_id, new_hp):
    pattern = r'(\{ id:\s*' + str(monster_id) + r',\s*name:[^,]+,\s*type:[^,]+,\s*hp:\s*)\d+'
    replacement = r'\g<1>' + str(new_hp)
    new_html, count = re.subn(pattern, replacement, html)
    return new_html, count

total_patched = 0
for k, hp in adjustments.items():
    editor, cnt = patch_monster_hp(editor, int(k), hp)
    total_patched += cnt

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(editor)

print(f"data-editor.html 패치 완료 ({total_patched}개)")
print("완료!")
