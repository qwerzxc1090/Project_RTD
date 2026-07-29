import json, re

with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    stats = json.load(f)
with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    editor = f.read()
with open('js/config.js', 'r', encoding='utf-8') as f:
    cfg = f.read()

def cfg_val(key):
    m = re.search(key + r':\s*([\d.]+)', cfg)
    return float(m.group(1)) if m else None

def ed_cfg(key):
    m = re.search(key + r':\s*([\d.]+)', editor)
    return float(m.group(1)) if m else None

mismatches = []

# 1. CONFIG
print('[1] CONFIG')
for k in ['GACHA_COST','INITIAL_GOLD','SPAWN_INTERVAL','CRITICAL_DAMAGE_RATIO',
          'INITIAL_LIVES','MAX_MONSTERS','TOTAL_ROUNDS','ROUND_BONUS_MULTIPLIER']:
    a, e = cfg_val(k), ed_cfg(k)
    ok = 'OK' if a == e else 'NG'
    if a != e:
        mismatches.append('CONFIG.{}: stats={} editor={}'.format(k,a,e))
    print('  {} {}: {} / {}'.format(ok, k, a, e))

# 2. UNITS
print('\n[2] UNITS')
fields = ['damage','attackSpeed','range','skillId','gradeScore','criticalRate']
for u in stats['units']:
    uid = u['id']
    for f in fields:
        av = u.get(f)
        if av is None:
            continue
        pat = r'id:"' + re.escape(uid) + r'"[^}]*?' + f + r':(\d+\.?\d*)'
        m = re.search(pat, editor)
        if m:
            ev = float(m.group(1))
            ev = int(ev) if int(ev) == ev else ev
            if av != ev:
                mismatches.append('UNIT {}.{}: stats={} editor={}'.format(uid,f,av,ev))
                print('  NG {}.{}: {} / {}'.format(uid, f, av, ev))

# 3. SKILLS
print('\n[3] SKILLS')
num_fields = ['projectileSpeed','displaySize','poisonDuration','maxPoisonStacks',
              'tickRate','poisonDamageRatio','bounceCount','bounceRange','bounceDamageMultiplier']
str_fields = ['nameEn','category']

for sid, s in stats['skills'].items():
    # 숫자 필드
    for f in num_fields:
        av = s.get(f)
        if av is None:
            continue
        pat = r'id:' + re.escape(str(sid)) + r'[^}]*?' + f + r':([\d.]+)'
        m = re.search(pat, editor)
        if m:
            ev = float(m.group(1))
            ev = int(ev) if int(ev) == ev else ev
            if av != ev:
                mismatches.append('SKILL {}.{}: stats={} editor={}'.format(sid,f,av,ev))
                print('  NG skill{}.{}: {} / {}'.format(sid,f,av,ev))
    # 문자열 필드
    for f in str_fields:
        av = s.get(f, '')
        pat = r'id:' + re.escape(str(sid)) + r'[^}]*?' + f + r':"([^"]+)"'
        m = re.search(pat, editor)
        ev = m.group(1) if m else 'NOT_FOUND'
        if av != ev:
            mismatches.append('SKILL {}.{}: stats={} editor={}'.format(sid,f,av,ev))
            print('  NG skill{}.{}: {} / {}'.format(sid,f,av,ev))

print()
if mismatches:
    print('불일치 {}개:'.format(len(mismatches)))
    for x in mismatches:
        print(' ', x)
else:
    print('모든 데이터 완전 일치 (불일치 0개)')
