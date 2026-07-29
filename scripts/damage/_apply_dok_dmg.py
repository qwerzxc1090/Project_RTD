import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

DMGMULT = 0.75  # -25%

with open('assets/data/stats.json', encoding='utf-8') as f:
    data = json.load(f)

print("=== _독 타워 공격력 -25% ===")
print("{:<20} {:>6} {:>6}".format("ID", "전", "후"))
for u in data['units']:
    if '_dok' not in u['id']:
        continue
    old = u['damage']
    new = round(old * DMGMULT)
    u['damage'] = new
    print("{:<20} {:>6} {:>6}".format(u['id'], old, new))

with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print("\nstats.json 저장 완료")
