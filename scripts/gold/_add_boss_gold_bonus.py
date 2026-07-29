"""
1. stats.json waves 보스 라운드에 bossGoldBonus 필드 추가
   - timeAttack=true인 보스 라운드에만 설정
   - 라운드가 높을수록 더 많은 보너스 (난이도 보상)

보너스 기준:
  R8  : +150G
  R16 : +300G
  R24 : +500G
  R32 : +750G
  R40 : +1000G
  R48 : +1500G
  R50 : +2500G  (최종보스 클리어 보상)
"""
import json

BOSS_GOLD_BONUS = {
    8:  150,
    16: 300,
    24: 500,
    32: 750,
    40: 1000,
    48: 1500,
    50: 2500,
}

with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)

print("=== stats.json waves bossGoldBonus 추가 ===")
for w in s['waves']:
    r = w['round']
    if r in BOSS_GOLD_BONUS:
        w['bossGoldBonus'] = BOSS_GOLD_BONUS[r]
        print(f"  R{r:02d}: bossGoldBonus={BOSS_GOLD_BONUS[r]}G  (timeLimit={w['timeLimit']}s, timeAttack={w['timeAttack']})")
    elif 'bossGoldBonus' not in w:
        w['bossGoldBonus'] = 0

with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(s, f, indent=2, ensure_ascii=False)
print("stats.json 저장 완료")
