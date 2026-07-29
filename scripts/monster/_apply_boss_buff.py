import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BOSS_MULT = 1.25

with open('assets/data/stats.json', encoding='utf-8') as f:
    data = json.load(f)

print("=== 보스 HP 추가 +25% ===")
print("{:>3}  {:>8} {:>8}".format("R", "HP전", "HP후"))
for key, m in data['monsters'].items():
    if not m['isBoss']:
        continue
    old_hp = m['hp']
    new_hp = round(old_hp * BOSS_MULT)
    m['hp'] = new_hp
    print("R{:02d}  {:>8} {:>8}  [BOSS]".format(m['id'], old_hp, new_hp))

with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print("stats.json 저장 완료")
