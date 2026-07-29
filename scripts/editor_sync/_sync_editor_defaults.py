"""
stats.json → data-editor.html DEFAULT_MONSTERS / DEFAULT_WAVES 전체 동기화
"""
import json, re

with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)

with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    ed = f.read()

# ── 1. DEFAULT_MONSTERS 블록 재생성 ──────────────────────────
monsters_sorted = sorted(s['monsters'].values(), key=lambda m: m['id'])

lines = ['const DEFAULT_MONSTERS = [']
for m in monsters_sorted:
    img = m.get('imagePath', '')
    boss = 'true' if m['isBoss'] else 'false'
    line = (
        f'  {{id:{m["id"]},name:"{m["name"]}",type:"{m["type"]}",'
        f'hp:{m["hp"]},speed:{m["speed"]},goldReward:{m["goldReward"]},'
        f'isBoss:{boss},imagePath:"{img}"}}'
    )
    lines.append(line + ',')
lines[-1] = lines[-1].rstrip(',')   # 마지막 쉼표 제거
lines.append('];')
new_monsters_block = '\n'.join(lines)

# 기존 블록 교체
old_monster_re = re.compile(
    r'const DEFAULT_MONSTERS = \[.*?\];',
    re.DOTALL
)
if old_monster_re.search(ed):
    ed = old_monster_re.sub(new_monsters_block, ed)
    print("DEFAULT_MONSTERS 교체 완료")
else:
    print("WARNING: DEFAULT_MONSTERS 블록을 찾지 못했습니다")

# ── 2. DEFAULT_WAVES 블록 재생성 ─────────────────────────────
waves_sorted = sorted(s['waves'], key=lambda w: w['round'])

lines2 = ['const DEFAULT_WAVES = [']
for w in waves_sorted:
    ta  = 'true' if w.get('timeAttack') else 'false'
    tl  = w.get('timeLimit', 0)
    cnt = w.get('count', 1)
    cg  = w.get('clearGoldBonus', 0)
    si  = w.get('spawnInterval', 2000)
    line = (
        f'  {{round:{w["round"]},monsterId:{w["monsterId"]},'
        f'count:{cnt},timeLimit:{tl},timeAttack:{ta},clearGoldBonus:{cg},spawnInterval:{si}}}'
    )
    lines2.append(line + ',')
lines2[-1] = lines2[-1].rstrip(',')
lines2.append('];')
new_waves_block = '\n'.join(lines2)


old_waves_re = re.compile(
    r'const DEFAULT_WAVES = \[.*?\];',
    re.DOTALL
)
if old_waves_re.search(ed):
    ed = old_waves_re.sub(new_waves_block, ed)
    print("DEFAULT_WAVES 교체 완료")
else:
    print("WARNING: DEFAULT_WAVES 블록을 찾지 못했습니다")

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(ed)

# ── 3. 검증 ──────────────────────────────────────────────────
print("\n=== 검증: 일반 라운드 샘플 (R1~R5) ===")
for w in waves_sorted[:5]:
    r = w['round']
    m = s['monsters'][str(r)]
    print(f"R{r:02d} monsterId={w['monsterId']} count={w['count']} "
          f"gold={m['goldReward']} timeLimit={w['timeLimit']} "
          f"timeAttack={w['timeAttack']} clearGold={w['clearGoldBonus']}")

print("\n=== 검증: 보스 라운드 ===")
for w in waves_sorted:
    r = w['round']
    m = s['monsters'][str(r)]
    if m['isBoss']:
        print(f"R{r:02d} monsterId={w['monsterId']} count={w['count']} "
              f"gold={m['goldReward']} timeLimit={w['timeLimit']} "
              f"timeAttack={w['timeAttack']} clearGold={w['clearGoldBonus']}")

print("\n동기화 완료")
