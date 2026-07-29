"""
골드 보상 재설계 + 일반 스테이지 clearGoldBonus = goldReward × 20%

설계 목표:
  - 일반 타워 3종으로 시작 → 5~10% 클리어율
  - 마리당 골드를 라운드 구간별 완만하게 증가
  - 보스 goldReward 유지, clearGoldBonus 유지

구간별 마리당 골드:
  R01~R07:  2~3G/kill   (초반 — 타이트한 경제)
  R09~R15:  4~5G/kill   (초중반)
  R17~R23:  6~7G/kill   (중반)
  R25~R31:  8~10G/kill  (중후반)
  R33~R39: 10~12G/kill  (후반)
  R41~R47: 13~15G/kill  (최후반)
  R49:      15G/kill    (막판)
"""
import json, math

with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)

waves_map = {w['round']: w for w in s['waves']}
monsters  = s['monsters']

# ── 라운드별 마리당 골드 설정 ──────────────────────────────
PER_KILL = {
     1: 2,  2: 3,  3: 4,  4: 3,  5: 3,  6: 3,  7: 3,
     9: 4, 10: 4, 11: 4, 12: 4, 13: 5, 14: 5, 15: 5,
    17: 6, 18: 6, 19: 6, 20: 6, 21: 7, 22: 7, 23: 7,
    25: 8, 26: 8, 27: 8, 28: 9, 29: 9, 30: 9, 31: 10,
    33: 10, 34: 10, 35: 11, 36: 11, 37: 11, 38: 12, 39: 12,
    41: 13, 42: 13, 43: 14, 44: 14, 45: 14, 46: 15, 47: 15,
    49: 15,
}

print("라운드  cnt  마리당  총골드  클리어보너스(20%)")
print("-" * 55)

for r_str, m in sorted(monsters.items(), key=lambda x: int(x[0])):
    r = int(r_str)
    w = waves_map.get(r)
    if not w:
        continue

    if m['isBoss']:
        print(f"R{r:02d}  BOSS  gold={m['goldReward']}  clearBonus={w.get('clearGoldBonus',0)}  (유지)")
        continue

    cnt      = w['count']
    per_kill = PER_KILL.get(r, 5)
    total    = per_kill * cnt
    clear_bonus = math.floor(total * 0.2)

    # 데이터 업데이트
    m['goldReward']       = total
    w['clearGoldBonus']   = clear_bonus

    print(f"R{r:02d}  cnt={cnt}  {per_kill}G/kill  총={total}G  +{clear_bonus}G")

# 저장
with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(s, f, indent=2, ensure_ascii=False)
print("\nstats.json 저장 완료")

# ── data-editor.html DEFAULT_MONSTERS / DEFAULT_WAVES 동기화 ──
import re

with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    ed = f.read()

# DEFAULT_MONSTERS 재생성
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
new_m = '\n'.join(lines)

# DEFAULT_WAVES 재생성
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
new_w = '\n'.join(lines2)

ed = re.sub(r'const DEFAULT_MONSTERS = \[.*?\];', new_m, ed, flags=re.DOTALL)
ed = re.sub(r'const DEFAULT_WAVES = \[.*?\];',    new_w, ed, flags=re.DOTALL)

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(ed)
print("data-editor.html 동기화 완료")

# ── 경제 요약 ──
total_kill_gold  = sum(m['goldReward'] for m in monsters.values())
total_clear_gold = sum(w.get('clearGoldBonus', 0) for w in s['waves'])
print(f"\n=== 경제 요약 ===")
print(f"  전체 킬골드 합계:    {total_kill_gold}G")
print(f"  전체 클리어보너스:   {total_clear_gold}G")
print(f"  시작골드:            500G")
print(f"  이론상 최대 총 수입: {total_kill_gold + total_clear_gold + 500}G (라운드보너스 제외)")
print(f"  가챠 가능 횟수(이론): {(total_kill_gold + total_clear_gold + 500) // 100}회")
