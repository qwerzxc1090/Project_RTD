"""
R20 (hp=517) -> R21~R23 -> R24(보스)까지 자연스럽게 연결
R24 이후는 손대지 않음.

전략:
  - R20 신규 HP: 517
  - R24 보스 HP: 34021 (고정)
  - R21~R23 일반 몬스터: R20(517)과 R25(2918) 사이를 선형 보간
    (보스 R24는 건드리지 않고, R21~R23은 517→R25(2918) 방향으로 보간)
  
  실제: R20=517, R25=2918
  R21 = 517 + (2918-517)*(1/5) = 997
  R22 = 517 + (2918-517)*(2/5) = 1477
  R23 = 517 + (2918-517)*(3/5) = 1957
  R24 (보스): 비율에 맞게 축소 (R24 원본 34021 → 적절히 조정)
              R16 보스(원본 21651→3874, 약 17.9%) 기준 비슷한 비율
              단순히 R24는 R23 * 8배 정도가 자연스러움: 1957*8 = 15656
  
  단, 사용자가 보스 HP를 별도 조정 요청 안 했으므로
  R24 보스는 조정 비율에 맞춰 34021 * 0.45 ≈ 15300 정도로 조정
  (R16 보스 비율 3874/21651=17.9%, R24는 좀 더 높게 45% 수준)
"""

import json, re

with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)

monsters = s['monsters']

# 현재 값 확인
r20_hp = monsters['20']['hp']   # 517
r25_hp = monsters['25']['hp']   # 2918 (R24 보스 이후, 원본 유지)
r24_boss_orig = monsters['24']['hp']  # 34021

print(f"R20 HP (신규): {r20_hp}")
print(f"R25 HP (원본): {r25_hp}")
print(f"R24 보스 HP (원본): {r24_boss_orig}")

# R21~R23 선형 보간 (R20 → R25)
# R20(base) -> R21, R22, R23, [R24보스], R25(target)
# 5단계 구간 (20→21→22→23→24→25)
base = r20_hp
target = r25_hp
steps = 5  # R20부터 R25까지 5칸

new_hps = {}
for i in range(1, 4):  # R21, R22, R23
    t = i / steps
    new_hps[str(20 + i)] = round(base + (target - base) * t)

# R24 보스: 앞뒤 일반몬스터 HP의 약 15배 (R23 기준)
# R23 신규 HP * 15배 정도를 보스로 설정 (게임 내 보스 비중 유지)
r23_new = new_hps['23']
r24_new = round(r23_new * 15)

print("\n=== R21~R24 조정 계획 ===")
for i in range(21, 25):
    k = str(i)
    old = monsters[k]['hp']
    if k == '24':
        nw = r24_new
    else:
        nw = new_hps[k]
    print(f"R{k.zfill(2)}: {old:7} -> {nw:7}  {'(보스)' if monsters[k]['type']=='boss' else ''}")

print(f"\nR25 (그대로): {r25_hp}")

confirm = input("\n적용하시겠습니까? (y/n): ").strip().lower()
if confirm != 'y':
    print("취소됨.")
    exit()

# stats.json 적용
for i in range(21, 24):  # R21, R22, R23
    monsters[str(i)]['hp'] = new_hps[str(i)]
monsters['24']['hp'] = r24_new

with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(s, f, indent=2, ensure_ascii=False)
print("✅ stats.json 적용 완료")

# data-editor.html 동기화
with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    editor = f.read()

def patch_monster_hp(html, monster_id, new_hp):
    pattern = r'(\{ id:\s*' + str(monster_id) + r',\s*name:[^,]+,\s*type:[^,]+,\s*hp:\s*)\d+'
    replacement = r'\g<1>' + str(new_hp)
    new_html, count = re.subn(pattern, replacement, html)
    return new_html, count

total_patched = 0
for i in range(21, 24):
    editor, cnt = patch_monster_hp(editor, i, new_hps[str(i)])
    total_patched += cnt
editor, cnt = patch_monster_hp(editor, 24, r24_new)
total_patched += cnt

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(editor)

print(f"✅ data-editor.html 패치 완료 ({total_patched}개 항목 수정)")
