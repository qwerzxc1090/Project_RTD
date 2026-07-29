"""
1. R1~R7 총 골드를 마리수 무관하게 선형 증가로 재설계
2. 보스 골드 = goldReward + clearGoldBonus 합산 → monster goldReward에 반영, clearGoldBonus=0
"""
import json, re, math

with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)

waves_map = {w['round']: w for w in s['waves']}
monsters  = s['monsters']

# ── 1. R1~R7 선형 증가 재설계 ─────────────────────────────
# 마리수 무관, 총 획득 골드 기준으로 완만히 증가
EARLY_GOLD = {
    1: 50,
    2: 65,
    3: 80,
    4: 95,
    5: 110,
    6: 120,
    7: 130,
}

print("=== R1~R7 재설계 ===")
for r, total in EARLY_GOLD.items():
    m = monsters[str(r)]
    w = waves_map[r]
    cnt   = w['count']
    per   = round(total / cnt, 1)
    clear = math.floor(total * 0.2)

    m['goldReward']     = total
    w['clearGoldBonus'] = clear

    print(f"R{r:02d}  cnt={cnt}  총={total}G  마리당={per}G  클리어보너스={clear}G")

# ── 2. 보스 골드 합산 → clearGoldBonus 제거 ─────────────────
print()
print("=== 보스 스테이지 골드 합산 ===")
for r_str, m in monsters.items():
    r = int(r_str)
    if not m['isBoss']:
        continue
    w = waves_map.get(r)
    if not w:
        continue
    old_gold  = m['goldReward']
    clear_bonus = w.get('clearGoldBonus', 0)
    new_gold  = old_gold + clear_bonus
    m['goldReward']     = new_gold
    w['clearGoldBonus'] = 0   # 보스 클리어 골드는 제거
    print(f"R{r:02d}  {old_gold}G + {clear_bonus}G = {new_gold}G  (clearBonus→0)")

# 저장
with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(s, f, indent=2, ensure_ascii=False)
print("\nstats.json 저장 완료")

# ── 3. data-editor.html 동기화 ────────────────────────────
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

# ── 4. 최종 전체 요약 ────────────────────────────────────────
print()
print("=== 전체 골드 설계 요약 ===")
print("라운드  cnt  goldReward  clearBonus  마리당")
print("-" * 52)
for w in waves_sorted:
    r = w['round']
    m = monsters[str(r)]
    cnt  = w['count']
    gold = m['goldReward']
    cb   = w.get('clearGoldBonus', 0)
    per  = round(gold / cnt, 1)
    boss = " ★BOSS" if m['isBoss'] else ""
    print(f"R{r:02d}  cnt={cnt:2d}  gold={gold:5d}  clear=+{cb:4d}  {per}G/kill{boss}")
