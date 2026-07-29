"""
[규칙 1] 기존 타워(non-dok) 최대 공격속도 350ms 제한
  - attackSpeed < 350 인 타워 → attackSpeed = 350
  - DPS 유지: new_damage = round(old_damage * 350 / old_attackSpeed)

[규칙 2] _dok 타워: n2_dok(일반) 기준 2500ms
  - n2_dok 원본 speed=1300, 새 speed=2500 → ratio = 2500/1300
  - 나머지 dok 타워: new_speed = round(old_speed * 2500/1300)
  - DPS 유지:  new_damage = round(old_damage * new_speed / old_speed)
               = round(old_damage * 2500/1300)  (같은 배율)
"""

import json, re

DOK_BASE_OLD = 1300   # n2_dok 원본 공격속도
DOK_BASE_NEW = 2500   # 목표 공격속도
SPEED_CAP    = 350    # 일반 타워 최대 공속(ms)

with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)

units = s['units']

normal_changes = []
dok_changes    = []

for u in units:
    uid = u['id']

    if uid.endswith('_dok'):
        # ── 규칙 2: dok 타워 ──
        old_speed  = u['attackSpeed']
        old_damage = u['damage']
        new_speed  = round(old_speed  * DOK_BASE_NEW / DOK_BASE_OLD)
        new_damage = round(old_damage * DOK_BASE_NEW / DOK_BASE_OLD)
        dok_changes.append((uid, u['name'], old_speed, new_speed, old_damage, new_damage))
        u['attackSpeed'] = new_speed
        u['damage']      = new_damage

    elif u['attackSpeed'] < SPEED_CAP:
        # ── 규칙 1: 350ms 미만 일반 타워 ──
        old_speed  = u['attackSpeed']
        old_damage = u['damage']
        new_damage = round(old_damage * SPEED_CAP / old_speed)
        normal_changes.append((uid, u['name'], old_speed, SPEED_CAP, old_damage, new_damage))
        u['attackSpeed'] = SPEED_CAP
        u['damage']      = new_damage

# 결과 저장
with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(s, f, indent=2, ensure_ascii=False)

# ── 출력 ──
print("=== [규칙 1] 350ms 캡 적용 ===")
print(f"{'ID':<12} {'이름':<14} {'구속도':>6} {'신속도':>6} {'구공격':>8} {'신공격':>8} {'DPS유지':>8}")
for uid, name, os, ns, od, nd in normal_changes:
    old_dps = round(od / os * 1000, 1)
    new_dps = round(nd / ns * 1000, 1)
    print(f"{uid:<12} {name:<14} {os:>6} {ns:>6} {od:>8} {nd:>8}  ({old_dps}→{new_dps})")

print("\n=== [규칙 2] _dok 타워 2500ms 기준 조정 ===")
print(f"{'ID':<14} {'이름':<16} {'구속도':>6} {'신속도':>6} {'구공격':>8} {'신공격':>8} {'DPS확인':>10}")
for uid, name, os, ns, od, nd in dok_changes:
    old_dps = round(od / os * 1000, 1)
    new_dps = round(nd / ns * 1000, 1)
    print(f"{uid:<14} {name:<16} {os:>6} {ns:>6} {od:>8} {nd:>8}  ({old_dps}→{new_dps})")

print(f"\nstats.json 저장 완료 (일반 {len(normal_changes)}개, dok {len(dok_changes)}개 변경)")

# ── data-editor.html 동기화 ──
with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    editor = f.read()

def patch_unit_field(html, unit_id, field, new_val):
    """DEFAULT_UNITS 배열에서 특정 id의 field 값을 교체"""
    # 해당 id 라인 전체를 파싱하여 field 값 교체
    # 라인 패턴: {id:"xxx", ..., field:값, ...}
    escaped_id = re.escape(unit_id)
    # field가 attackSpeed 또는 damage인 경우
    pattern = (r'(\{id:"' + escaped_id + r'".*?' + re.escape(field) + r':)\d+')
    return re.sub(pattern, r'\g<1>' + str(new_val), html)

total = 0
for uid, name, os, ns, od, nd in normal_changes:
    editor = patch_unit_field(editor, uid, 'attackSpeed', ns)
    editor = patch_unit_field(editor, uid, 'damage', nd)
    total += 1

for uid, name, os, ns, od, nd in dok_changes:
    editor = patch_unit_field(editor, uid, 'attackSpeed', ns)
    editor = patch_unit_field(editor, uid, 'damage', nd)
    total += 1

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(editor)
print(f"data-editor.html 동기화 완료 ({total}개 유닛)")
