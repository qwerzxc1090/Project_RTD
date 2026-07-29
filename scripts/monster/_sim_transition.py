import json

with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)
monsters = s['monsters']

r20 = monsters['20']['hp']   # 517
r25 = monsters['25']['hp']   # 2918
base = r20
target = r25
steps = 5

# 보간 값 계산
r21_new = round(base + (target - base) * 1/steps)
r22_new = round(base + (target - base) * 2/steps)
r23_new = round(base + (target - base) * 3/steps)
r24_new = round(r23_new * 15)  # 보스: 앞 일반몬 * 15배

print("=== R21~R27 전환 시뮬레이션 ===")
plan = {
    '20': r20,
    '21': r21_new,
    '22': r22_new,
    '23': r23_new,
    '24': r24_new,
    '25': monsters['25']['hp'],
    '26': monsters['26']['hp'],
    '27': monsters['27']['hp'],
}

prev = r20
for k, v in plan.items():
    diff = v - prev
    boss_tag = '(보스)' if monsters[k]['type'] == 'boss' else ''
    print(f"R{k.zfill(2)}: hp={v:7}  diff={diff:+7}  {boss_tag}")
    prev = v
