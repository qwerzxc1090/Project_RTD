import json, re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# ── 파라미터 ──────────────────────────────────────────────────
SPAWN_MULT  = 1.10   # 리스폰 간격 +10%
HP21_MULT   = 0.85   # R21~R50 HP -15%
LINEAR_FROM = 10     # 선형 보간 시작 라운드 (고정 앵커)
LINEAR_TO   = 21     # 선형 보간 종점 라운드 (R21 새 HP와 연결)

with open('assets/data/stats.json', encoding='utf-8') as f:
    data = json.load(f)

hp = {m['id']: m for m in data['monsters'].values()}

# ─── 1단계: R21~R50 HP -15% ───────────────────────────────────
print("=== STEP 1: R21~R50 HP -15% ===")
for rid in range(21, 51):
    m = hp.get(rid)
    if not m: continue
    old = m['hp']
    m['hp'] = round(old * HP21_MULT)
    flag = '[BOSS]' if m['isBoss'] else ''
    print("  R{:02d}: {:>7} → {:>7} {}".format(rid, old, m['hp'], flag))

# ─── 2단계: 보간 필요 여부 확인 ───────────────────────────────
r10_hp  = hp[LINEAR_FROM]['hp']   # R10 앵커 (변경 없음)
r21_hp  = hp[LINEAR_TO]['hp']     # R21 새 HP
r20_hp  = hp[20]['hp']            # R20 현재 HP (아직 변경 안 됨)

print()
print("=== 보간 분석 ===")
print("  R10 (앵커): {:>7}".format(r10_hp))
print("  R20 (현재): {:>7}".format(r20_hp))
print("  R21 (새값): {:>7}".format(r21_hp))
if r21_hp < r20_hp:
    print("  → R20→R21 역행({:+d}) 감지! R10~R21 선형 보간 적용".format(r21_hp - r20_hp))
else:
    print("  → 역행 없음, 보간 생략")

# ─── 3단계: R11~R20 선형 보간 (보스 제외) ────────────────────
print()
print("=== STEP 2: R{}-R{} 선형 보간 (보스 라운드 제외) ===".format(LINEAR_FROM+1, LINEAR_TO-1))
span = LINEAR_TO - LINEAR_FROM  # 11
for r in range(LINEAR_FROM + 1, LINEAR_TO):
    m = hp.get(r)
    if not m: continue
    if m['isBoss']:
        print("  R{:02d}: {:>7} (보스 — 유지)".format(r, m['hp']))
        continue
    frac      = (r - LINEAR_FROM) / span
    new_hp    = round(r10_hp + frac * (r21_hp - r10_hp))
    old_hp    = m['hp']
    m['hp']   = new_hp
    print("  R{:02d}: {:>7} → {:>7}  (보간 {:.1f}%)".format(
        r, old_hp, new_hp, (new_hp - old_hp) / old_hp * 100))

# ─── stats.json 저장 ─────────────────────────────────────────
with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print("\nstats.json 저장 완료")

# ─── 4단계: SPAWN_INTERVAL +10% ──────────────────────────────
with open('js/config.js', encoding='utf-8') as f:
    cfg = f.read()
m_sp = re.search(r'(SPAWN_INTERVAL:\s*)(\d+)', cfg)
if m_sp:
    old_sp = int(m_sp.group(2))
    new_sp = round(old_sp * SPAWN_MULT)
    cfg = cfg[:m_sp.start(2)] + str(new_sp) + cfg[m_sp.end(2):]
    with open('js/config.js', 'w', encoding='utf-8') as f:
        f.write(cfg)
    print()
    print("=== STEP 3: SPAWN_INTERVAL +10% ===")
    print("  {}ms → {}ms".format(old_sp, new_sp))
    print("  config.js 저장 완료")

# ─── 최종 요약 ────────────────────────────────────────────────
print()
print("=== 최종 HP 흐름 확인 (R09~R22) ===")
all_m = sorted(data['monsters'].values(), key=lambda x: x['id'])
for m in all_m:
    r = m['id']
    if 9 <= r <= 22:
        flag = ' [BOSS]' if m['isBoss'] else ''
        print("  R{:02d}: {:>7}{}".format(r, m['hp'], flag))
