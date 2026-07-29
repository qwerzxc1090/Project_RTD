"""
_dok 타워 9등급 공격속도 재설정
  - 일반(normal): 2500ms (가장 느림)
  - 태초(primordial): 1500ms (가장 빠름)
  - 나머지: 2500~1500ms 사이 균등 분배 (125ms 간격)
  - DPS 유지: new_damage = round(current_DPS * new_speed / 1000)

등급 순서:
  0: n2_dok   → 2500ms
  1: r2_dok   → 2375ms
  2: a2_dok   → 2250ms
  3: e2_dok   → 2125ms
  4: s2_dok   → 2000ms
  5: l2_dok   → 1875ms
  6: ep2_dok  → 1750ms
  7: m2_dok   → 1625ms
  8: p2_dok   → 1500ms
"""

import json, re

SPEED_MAX = 2500   # 일반 등급 (가장 느림)
SPEED_MIN = 1500   # 태초 등급 (가장 빠름)
N_GRADES  = 9

# 등급 순서 (낮은 등급 → 높은 등급)
DOK_ORDER = ['n2_dok','r2_dok','a2_dok','e2_dok','s2_dok',
             'l2_dok','ep2_dok','m2_dok','p2_dok']

# 공격속도 배분 (균등)
step = (SPEED_MAX - SPEED_MIN) / (N_GRADES - 1)  # 125ms
new_speeds = {
    uid: round(SPEED_MAX - i * step)
    for i, uid in enumerate(DOK_ORDER)
}

with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)

print(f"{'ID':<14} {'이름':<16} {'구속도':>6} {'신속도':>6} {'구DPS':>10} {'구공격':>8} {'신공격':>8} {'신DPS':>10}")
print("-" * 95)

changes = []
for u in s['units']:
    uid = u['id']
    if uid not in new_speeds:
        continue

    old_speed  = u['attackSpeed']
    old_damage = u['damage']
    old_dps    = old_damage / (old_speed / 1000)

    ns = new_speeds[uid]
    nd = round(old_dps * ns / 1000)
    new_dps = nd / (ns / 1000)

    print(f"{uid:<14} {u['name']:<16} {old_speed:>6} {ns:>6} {round(old_dps,1):>10} {old_damage:>8} {nd:>8} {round(new_dps,1):>10}")

    changes.append((uid, old_speed, ns, old_damage, nd))
    u['attackSpeed'] = ns
    u['damage']      = nd

with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(s, f, indent=2, ensure_ascii=False)
print(f"\nstats.json 저장 완료 ({len(changes)}개 변경)")

# ─── data-editor.html 동기화 ───
with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    editor = f.read()

def patch_field(html, unit_id, field, new_val):
    escaped = re.escape(unit_id)
    pattern = r'(\{id:"' + escaped + r'".*?' + re.escape(field) + r':)\d+'
    return re.sub(pattern, r'\g<1>' + str(new_val), html)

for uid, os, ns, od, nd in changes:
    editor = patch_field(editor, uid, 'attackSpeed', ns)
    editor = patch_field(editor, uid, 'damage', nd)

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(editor)
print("data-editor.html 동기화 완료")

# ─── 최종 확인 ───
print(f"\n{'등급':<12} {'속도':>6}ms  {'125ms 간격 확인':>18}")
for i, uid in enumerate(DOK_ORDER):
    ns = new_speeds[uid]
    tier = uid.replace('2_dok','').replace('n','일반').replace('r','레어').replace('a','고대').replace('e','유물').replace('s','서사').replace('l','전설').replace('ep','에픽').replace('m','신화').replace('p','태초')
    print(f"  {uid:<12} {ns:>6}ms")
