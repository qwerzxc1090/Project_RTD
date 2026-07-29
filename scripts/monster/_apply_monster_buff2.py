import json, re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HP_MULT     = 1.20   # 생명력 +20%
SPEED_MULT  = 0.90   # 속도 -10%
SPAWN_MULT  = 0.70   # 리스폰속도 +30% → 간격 30% 감소

# ── 1. stats.json: HP +20%, 속도 -10% ──────────────────────────────
with open('assets/data/stats.json', encoding='utf-8') as f:
    data = json.load(f)

print("=== 몬스터 변경 (HP +20%, 속도 -10%) ===")
print("{:>3}  {:>8} {:>8}  {:>6} {:>6}  {}".format(
    "R", "HP전", "HP후", "SPD전", "SPD후", "보스"))

for key, m in data['monsters'].items():
    old_hp    = m['hp']
    old_speed = m['speed']
    new_hp    = round(old_hp * HP_MULT)
    new_speed = round(old_speed * SPEED_MULT, 2)
    m['hp']    = new_hp
    m['speed'] = new_speed
    flag = " [BOSS]" if m['isBoss'] else ""
    print("R{:02d}  {:>8} {:>8}  {:>6} {:>6}{}".format(
        m['id'], old_hp, new_hp, old_speed, new_speed, flag))

with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print("stats.json 저장 완료\n")

# ── 2. config.js: SPAWN_INTERVAL 30% 감소 ──────────────────────────
with open('js/config.js', encoding='utf-8') as f:
    cfg = f.read()

m = re.search(r'(SPAWN_INTERVAL:\s*)(\d+)', cfg)
if m:
    old_val = int(m.group(2))
    new_val = round(old_val * SPAWN_MULT)
    cfg = cfg[:m.start(2)] + str(new_val) + cfg[m.end(2):]
    with open('js/config.js', 'w', encoding='utf-8') as f:
        f.write(cfg)
    print("=== SPAWN_INTERVAL (리스폰속도 +30%) ===")
    print("{}ms  →  {}ms  ({:.0f}% 감소)".format(old_val, new_val, (1-SPAWN_MULT)*100))
    print("config.js 저장 완료")
else:
    print("ERROR: SPAWN_INTERVAL 항목을 찾지 못했습니다")
