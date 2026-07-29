import json, io, sys, math

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# 등급 순서 (일반→태초, skill ID 6~14)
TIERS = [
    (6,  '앵벌이_일반'),
    (7,  '앵벌이_레어'),
    (8,  '앵벌이_고대'),
    (9,  '앵벌이_유물'),
    (10, '앵벌이_서사'),
    (11, '앵벌이_전설'),
    (12, '앵벌이_에픽'),
    (13, '앵벌이_신화'),
    (14, '앵벌이_태초'),
]

BASE_STACK = 150     # 일반 등급 스택 기준
BASE_GOLD  = 30      # 일반 등급 골드 기준
STACK_DEC  = 0.90    # 등급 상승 시 스택 10% 복리 감소
GOLD_INC   = 1.15    # 등급 상승 시 골드 15% 복리 증가

with open('assets/data/stats.json', encoding='utf-8') as f:
    data = json.load(f)

print("  ID   이름              스택(전→후)   골드(전→후)")
print("  " + "-"*58)

for step, (sid, name) in enumerate(TIERS):
    new_stack = max(1, round(BASE_STACK * (STACK_DEC ** step)))
    new_gold  = round(BASE_GOLD  * (GOLD_INC  ** step))

    s = data['skills'][str(sid)]
    old_stack = s.get('attacksToReward', '?')
    old_gold  = s.get('goldReward', '?')

    s['attacksToReward'] = new_stack
    s['goldReward']      = new_gold

    print(f"  {sid:>2}   {name:<14}   {old_stack:>5} -> {new_stack:>5}   {old_gold:>3} -> {new_gold:>3}")

with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("\n[PASS] stats.json saved")
