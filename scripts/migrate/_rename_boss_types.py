"""
보스 타입 명칭 변경 및 방어 상성 재조정

변경:
  boss_explosive → boss_large  : 대형 방어 패턴 (진동에 강함 — large 몬스터와 동일)
  boss_vibration → boss_small  : 소형 방어 패턴 (폭발에 강함 — small 몬스터와 동일)
  boss_normal    → 유지         : 일반형 방어 패턴 (general 몬스터와 동일)

방어 테이블 (일반 몬스터 TYPE_EFFECTIVENESS와 동일한 수치):
  공격\타입     boss_normal(일반) boss_large(대형) boss_small(소형)
  normal           1.0             1.0             1.0
  explosive        0.75            1.0             0.5    ← large=1.0, small=0.5
  vibration        0.50            0.25            1.0    ← large=0.25, small=1.0
"""

import json, re

OLD_TO_NEW = {
    'boss_explosive': 'boss_large',
    'boss_vibration': 'boss_small',
}

# ══════════════════════════════════════
# 1. stats.json — 몬스터 type 필드
# ══════════════════════════════════════
with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)

print("=== stats.json 보스 타입 변경 ===")
for k in sorted(s['monsters'].keys(), key=int):
    m = s['monsters'][k]
    if m.get('isBoss') and m['type'] in OLD_TO_NEW:
        old = m['type']
        m['type'] = OLD_TO_NEW[old]
        print(f"  R{k}: {old} → {m['type']}")

with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(s, f, indent=2, ensure_ascii=False)
print("stats.json 저장 완료\n")

# ══════════════════════════════════════
# 2. config.js
# ══════════════════════════════════════
with open('js/config.js', 'r', encoding='utf-8') as f:
    cfg = f.read()

# BOSS_EFFECTIVENESS 블록 전체 교체
OLD_BOSS_EFF = '''    // 보스 방어 테이블 룩업: 공격타입 → boss_X 서브테이블
    // 일반 몬스터 타입 상성표와 동일한 수치 사용
    //   boss_normal   (균형형) ↔ mixed  : 일반=1.0, 폭발=0.75, 진동=0.50
    //   boss_explosive(폭발저항) ↔ small  : 일반=1.0, 폭발=0.50, 진동=1.00
    //   boss_vibration(진동저항) ↔ large  : 일반=1.0, 폭발=1.00, 진동=0.25
    BOSS_EFFECTIVENESS: {
        normal:    { boss_normal: 1.00, boss_explosive: 1.00, boss_vibration: 1.00 },
        explosive: { boss_normal: 0.75, boss_explosive: 0.50, boss_vibration: 1.00 },
        vibration: { boss_normal: 0.50, boss_explosive: 1.00, boss_vibration: 0.25 }
    },'''

NEW_BOSS_EFF = '''    // 보스 방어 테이블 룩업: 공격타입 → boss_X 서브테이블
    // 일반 몬스터 크기별 방어 패턴과 동일한 수치 적용
    //   boss_normal (균형형) ↔ general : 일반=1.0, 폭발=0.75, 진동=0.50
    //   boss_large  (대형형) ↔ large   : 일반=1.0, 폭발=1.00, 진동=0.25 (진동에 강함)
    //   boss_small  (소형형) ↔ small   : 일반=1.0, 폭발=0.50, 진동=1.00 (폭발에 강함)
    BOSS_EFFECTIVENESS: {
        normal:    { boss_normal: 1.00, boss_large: 1.00, boss_small: 1.00 },
        explosive: { boss_normal: 0.75, boss_large: 1.00, boss_small: 0.50 },
        vibration: { boss_normal: 0.50, boss_large: 0.25, boss_small: 1.00 }
    },'''

if OLD_BOSS_EFF in cfg:
    cfg = cfg.replace(OLD_BOSS_EFF, NEW_BOSS_EFF)
    print("config.js: BOSS_EFFECTIVENESS 블록 교체 완료")
else:
    # 부분 교체 fallback
    cfg = cfg.replace('boss_explosive', 'boss_large')
    cfg = cfg.replace('boss_vibration', 'boss_small')
    print("config.js: fallback 치환 완료")

# COLORS.MONSTER 키 변경 + 색상 조정
cfg = cfg.replace(
    "boss_explosive: 0xFF6600,   // 보스_폭발: 주황 다이아 (폭발 저항)",
    "boss_large:     0x0066FF,   // 보스_대형: 파랑 다이아 (진동 저항 — large 방어)"
)
cfg = cfg.replace(
    "boss_vibration: 0xAA00FF    // 보스_진동: 보라 다이아 (진동 저항)",
    "boss_small:     0xFF6644    // 보스_소형: 주황 다이아 (폭발 저항 — small 방어)"
)
# fallback (이전 형식)
cfg = cfg.replace('boss_explosive:', 'boss_large:')
cfg = cfg.replace('boss_vibration:', 'boss_small:')

with open('js/config.js', 'w', encoding='utf-8') as f:
    f.write(cfg)
print("config.js 저장 완료\n")

# ══════════════════════════════════════
# 3. Monster.js — 주석, 조건문
# ══════════════════════════════════════
with open('js/entities/Monster.js', 'r', encoding='utf-8') as f:
    monster = f.read()

monster = monster.replace("'boss_explosive'", "'boss_large'")
monster = monster.replace("'boss_vibration'", "'boss_small'")
monster = monster.replace('.MONSTER.boss_explosive', '.MONSTER.boss_large')
monster = monster.replace('.MONSTER.boss_vibration', '.MONSTER.boss_small')
monster = monster.replace("'small', 'large', 'boss', 'boss_explosive', 'boss_vibration'",
                           "'small', 'large', 'boss', 'boss_large', 'boss_small'")

with open('js/entities/Monster.js', 'w', encoding='utf-8') as f:
    f.write(monster)
print("Monster.js 저장 완료")

# ══════════════════════════════════════
# 4. CombatSystem.js — 주석
# ══════════════════════════════════════
with open('js/systems/CombatSystem.js', 'r', encoding='utf-8') as f:
    combat = f.read()
combat = combat.replace('boss_explosive', 'boss_large').replace('boss_vibration', 'boss_small')
with open('js/systems/CombatSystem.js', 'w', encoding='utf-8') as f:
    f.write(combat)
print("CombatSystem.js 저장 완료")

# ══════════════════════════════════════
# 5. data-editor.html — 전체
# ══════════════════════════════════════
with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    editor = f.read()

# MONSTER_TYPES 배열
editor = editor.replace("'boss_explosive'", "'boss_large'")
editor = editor.replace("'boss_vibration'", "'boss_small'")

# MONSTER_TYPE_LABELS
editor = editor.replace("boss_explosive: '보스_폭발'", "boss_large: '보스_대형'")
editor = editor.replace("boss_vibration: '보스_진동'", "boss_small: '보스_소형'")

# 몬스터 목록 type 값
editor = editor.replace("type: 'boss_explosive'", "type: 'boss_large'")
editor = editor.replace("type: 'boss_vibration'", "type: 'boss_small'")

# 보스 방어 참조 테이블
OLD_TABLE_HEADER = "<th>공격타입</th><th>보스_일반(혼합형)</th><th>보스_폭발(폭발저항)</th><th>보스_진동(진동저항)</th>"
NEW_TABLE_HEADER = "<th>공격타입</th><th>보스_일반(균형형)</th><th>보스_대형(진동저항)</th><th>보스_소형(폭발저항)</th>"
editor = editor.replace(OLD_TABLE_HEADER, NEW_TABLE_HEADER)

OLD_EFF_BLOCK = """  const BOSS_EFF = {
    normal:    { boss_normal: 1.00, boss_explosive: 1.00, boss_vibration: 1.00 },
    explosive: { boss_normal: 0.75, boss_explosive: 0.50, boss_vibration: 1.00 },
    vibration: { boss_normal: 0.50, boss_explosive: 1.00, boss_vibration: 0.25 }
  };"""
NEW_EFF_BLOCK = """  const BOSS_EFF = {
    normal:    { boss_normal: 1.00, boss_large: 1.00, boss_small: 1.00 },
    explosive: { boss_normal: 0.75, boss_large: 1.00, boss_small: 0.50 },
    vibration: { boss_normal: 0.50, boss_large: 0.25, boss_small: 1.00 }
  };"""
editor = editor.replace(OLD_EFF_BLOCK, NEW_EFF_BLOCK)

# 컬럼 렌더링 키 (boss_explosive/boss_vibration → boss_large/boss_small)
editor = editor.replace('b.boss_explosive', 'b.boss_large')
editor = editor.replace('b.boss_vibration', 'b.boss_small')

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(editor)
print("data-editor.html 저장 완료\n")

# ══════════════════════════════════════
# 6. 최종 확인
# ══════════════════════════════════════
print("=== 최종 보스 방어 테이블 ===")
print(f"{'공격타입':>8}  {'보스_일반':>10}  {'보스_대형':>10}  {'보스_소형':>10}")
BOSS_EFF = {
    'normal':    {'boss_normal': 1.00, 'boss_large': 1.00, 'boss_small': 1.00},
    'explosive': {'boss_normal': 0.75, 'boss_large': 1.00, 'boss_small': 0.50},
    'vibration': {'boss_normal': 0.50, 'boss_large': 0.25, 'boss_small': 1.00},
}
for at, row in BOSS_EFF.items():
    labels = {'normal':'일반','explosive':'폭발','vibration':'진동'}
    bn = row['boss_normal']; bl = row['boss_large']; bs = row['boss_small']
    print(f"{labels[at]:>8}  {bn:>10}×  {bl:>10}×  {bs:>10}×")

print("\n=== 보스 라운드 최종 타입 ===")
with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s2 = json.load(f)
for k in sorted(s2['monsters'].keys(), key=int):
    m = s2['monsters'][k]
    if m.get('isBoss'):
        print(f"  R{k}: {m['type']}")
