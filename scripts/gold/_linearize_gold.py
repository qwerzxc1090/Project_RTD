"""
일반 스테이지 goldReward를 라운드 번호 기반 선형 공식으로 재설계
  gold(r) = round(50 + (r - 1) * 11.5)
  clearGoldBonus = floor(gold * 0.2)
보스 스테이지는 건드리지 않음.
"""
import json, re, math

with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)

waves_map = {w['round']: w for w in s['waves']}
monsters  = s['monsters']

SLOPE = 11.5   # 라운드당 골드 증가량
BASE  = 50     # R1 기준값

print("=== 일반 스테이지 선형 골드 재설계 ===")
print(f"공식: gold = round({BASE} + (round-1) × {SLOPE})")
print()

issues = []   # 수정된 항목

for r_str, m in sorted(monsters.items(), key=lambda x: int(x[0])):
    r = int(r_str)
    w = waves_map.get(r)
    if not w or m['isBoss']:
        continue

    target = round(BASE + (r - 1) * SLOPE)
    old    = m['goldReward']
    clear  = math.floor(target * 0.2)
    changed = (old != target)

    m['goldReward']     = target
    w['clearGoldBonus'] = clear

    flag = "  ← 수정" if changed else ""
    print(f"R{r:02d}  {old:4d}G → {target:4d}G  clear=+{clear:3d}G{flag}")
    if changed:
        issues.append(r)

print()
print(f"수정된 라운드 수: {len(issues)}개 → {issues}")

# 저장
with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(s, f, indent=2, ensure_ascii=False)
print("stats.json 저장 완료")

# data-editor.html 동기화
with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    ed = f.read()

monsters_sorted = sorted(monsters.values(), key=lambda m: m['id'])
lines = ['const DEFAULT_MONSTERS = [']
for m in monsters_sorted:
    img  = m.get('imagePath', '')
    boss = 'true' if m['isBoss'] else 'false'
    lines.append(
        f'  {{id:{m["id"]},name:"{m["name"]}",type:"{m["type"]}",'
        f'hp:{m["hp"]},speed:{m["speed"]},goldReward:{m["goldReward"]},'
        f'isBoss:{boss},imagePath:"{img}"}},'
    )
lines[-1] = lines[-1].rstrip(',')
lines.append('];')

waves_sorted = sorted(s['waves'], key=lambda w: w['round'])
lines2 = ['const DEFAULT_WAVES = [']
for w in waves_sorted:
    ta = 'true' if w.get('timeAttack') else 'false'
    lines2.append(
        f'  {{round:{w["round"]},monsterId:{w["monsterId"]},'
        f'count:{w.get("count",1)},timeLimit:{w.get("timeLimit",0)},'
        f'timeAttack:{ta},clearGoldBonus:{w.get("clearGoldBonus",0)}}},'
    )
lines2[-1] = lines2[-1].rstrip(',')
lines2.append('];')

ed = re.sub(r'const DEFAULT_MONSTERS = \[.*?\];', '\n'.join(lines), ed, flags=re.DOTALL)
ed = re.sub(r'const DEFAULT_WAVES = \[.*?\];',    '\n'.join(lines2), ed, flags=re.DOTALL)

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(ed)
print("data-editor.html 동기화 완료")

# 선형성 검증
print()
print("=== 선형성 검증 (일반 스테이지만) ===")
prev_r, prev_g = None, None
non_linear = []
for r_str, m in sorted(monsters.items(), key=lambda x: int(x[0])):
    r = int(r_str)
    if monsters[r_str]['isBoss']:
        prev_r, prev_g = None, None  # 보스 이후 리셋
        continue
    g = m['goldReward']
    if prev_g is not None and g <= prev_g:
        non_linear.append((r, prev_r, prev_g, g))
    prev_r, prev_g = r, g

if non_linear:
    print("⚠️ 비선형 구간 발견:")
    for r, pr, pg, g in non_linear:
        print(f"  R{pr:02d}({pg}G) → R{r:02d}({g}G)  감소!")
else:
    print("✅ 모든 일반 스테이지 골드 선형 증가 확인")
