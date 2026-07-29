import json
from collections import defaultdict

with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)

tier_stats = defaultdict(lambda: {'total': 0, 'avail': 0})
for u in s['units']:
    t = u['tier']
    tier_stats[t]['total'] += 1
    if u.get('gachaAvailable') is True:
        tier_stats[t]['avail'] += 1

print("등급별 gachaAvailable 현황:")
tiers = ['normal','rare','ancient','relic','saga','legend','epic','myth','primordial']
for tier in tiers:
    st = tier_stats[tier]
    total = st['total']
    avail = st['avail']
    ratio = avail / total * 100 if total else 0
    flag = "  <<< 풀 없음!" if avail == 0 else ""
    print("  " + tier.ljust(12) + "  전체=" + str(total) + "  활성=" + str(avail) + "  " + str(round(ratio)) + "%" + flag)
