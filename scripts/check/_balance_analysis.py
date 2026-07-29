import json

with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)

monsters = s['monsters']
units = s['units']

# 후반 몬스터 HP 구간
print("=== R30~R50 몬스터 HP 및 타입 ===")
for k in range(30, 51):
    m = monsters[str(k)]
    boss = "★보스" if m.get('isBoss') else "  "
    print(f"  R{k:02d} {boss} hp={m['hp']:>8}  type={m['type']}")

# 가챠 확률 (상위 등급)
print("\n=== 상위 등급 가챠 확률 ===")
cfg_units = {u['id']: u for u in units if u.get('gachaAvailable')}
gacha_total = len(cfg_units)
print(f"  활성 유닛 수: {gacha_total}종 (전체 45종 중)")

with open('js/config.js', 'r', encoding='utf-8') as f:
    cfg_raw = f.read()

import re
rates = re.findall(r'(\w+):\s*([\d.]+),?\s*//.*?(\d+\.?\d*)%', cfg_raw)
print("\n  등급별 확률:")
for tier, val, pct in rates:
    if tier in ['normal','rare','ancient','relic','saga','legend','epic','myth','primordial']:
        print(f"    {tier:<12}: {float(val)*100:.4f}%")

# 경제 구조
print("\n=== 경제 구조 ===")
bonus_match = re.search(r'ROUND_BONUS_MULTIPLIER:\s*([\d.]+)', cfg_raw)
initial_gold = re.search(r'INITIAL_GOLD:\s*([\d.]+)', cfg_raw)
gacha_cost = re.search(r'GACHA_COST:\s*([\d.]+)', cfg_raw)
print(f"  초기 골드: {initial_gold.group(1)}")
print(f"  가챠 비용: {gacha_cost.group(1)}G")
print(f"  라운드 클리어 보너스: 라운드 × {bonus_match.group(1)}G")
print(f"  R50 클리어 보너스: 50 × {bonus_match.group(1)} = {50*float(bonus_match.group(1))}G")

# 클리어 관문 — 최후반 보스 DPS 요구량 추정
print("\n=== 클리어 관문 분석 ===")
r50 = monsters['50']
r48 = monsters['48']
spawn = 1600  # ms
print(f"  R48 보스: hp={r48['hp']:>8}  type={r48['type']}")
print(f"  R50 보스: hp={r50['hp']:>8}  type={r50['type']}")
print(f"  (보스 제한시간 내 처치가 핵심 관문)")
