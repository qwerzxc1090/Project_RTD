import json, re, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

with open("assets/data/stats.json", encoding="utf-8") as f:
    stats = json.load(f)

with open("tools/data-editor.html", encoding="utf-8") as f:
    html = f.read()

# DEFAULT_UNITS parsing
m = re.search(r"const DEFAULT_UNITS\s*=\s*\[(.*?)\];", html, re.DOTALL)
units_raw = m.group(1) if m else ""

def js_obj_to_json(s):
    s = re.sub(r'(\w+)\s*:', r'"\1":', s)
    s = s.replace("'", '"')
    s = re.sub(r',\s*}', '}', s)
    return s

editor_units = {}
for block in re.finditer(r'\{([^}]+)\}', units_raw):
    try:
        obj = json.loads('{' + js_obj_to_json(block.group(1)) + '}')
        uid = obj.get('id')
        if uid:
            editor_units[str(uid)] = obj
    except:
        pass

json_units = {str(u['id']): u for u in stats['units']}

# DEFAULT_SKILLS parsing
m2 = re.search(r"const DEFAULT_SKILLS\s*=\s*\{(.*?)\};", html, re.DOTALL)
editor_skills = {}
if m2:
    for block in re.finditer(r'"(\d+)"\s*:\s*\{([^}]+)\}', m2.group(1)):
        sid = block.group(1)
        try:
            obj = json.loads('{' + js_obj_to_json(block.group(2)) + '}')
            editor_skills[sid] = obj
        except:
            pass

json_skills = {str(k): v for k, v in stats.get('skills', {}).items()}

UNIT_FIELDS = ['tier','attackType','damage','attackSpeed','range',
               'skillId','gradeScore','gachaAvailable','criticalRate']
SKILL_FIELDS = ['nameEn','category','projectileSpeed','displaySize',
                'attacksToReward','goldReward','bounceCount',
                'bounceDamageMultiplier','poisonDuration',
                'maxPoisonStacks','tickRate','poisonDamageRatio']

def compare(label, json_data, editor_data, fields):
    print("\n" + "="*64)
    print("  " + label)
    print("="*64)

    only_json   = sorted([k for k in json_data   if k not in editor_data])
    only_editor = sorted([k for k in editor_data if k not in json_data])
    mismatches  = []

    for uid in sorted(json_data.keys()):
        if uid not in editor_data:
            continue
        jobj = json_data[uid]
        eobj = editor_data[uid]
        for f in fields:
            jv = jobj.get(f)
            ev = eobj.get(f)
            if jv is None and ev is None:
                continue
            if str(jv) != str(ev):
                mismatches.append((uid, f, jv, ev))

    if only_json:
        print(f"\n[stats.json 전용] {len(only_json)}개")
        for k in only_json:
            print(f"  - {k}  ({json_data[k].get('name','?')})")

    if only_editor:
        print(f"\n[editor 전용] {len(only_editor)}개")
        for k in only_editor:
            print(f"  - {k}  ({editor_data[k].get('name','?')})")

    if mismatches:
        print(f"\n[값 불일치] {len(mismatches)}건")
        print(f"  {'ID':<16} {'필드':<28} {'stats.json':>14} {'editor':>14}")
        print(f"  {'-'*16} {'-'*28} {'-'*14} {'-'*14}")
        for uid, f, jv, ev in mismatches:
            print(f"  {uid:<16} {f:<28} {str(jv):>14} {str(ev):>14}")
    else:
        print("\n  [OK] 공통 항목 값 모두 일치")

    total = len(only_json) + len(only_editor) + len(mismatches)
    if total == 0:
        print(f"  [PASS] 완전 동기화 ({len(json_data)}개)")
    else:
        print(f"\n  [FAIL] 총 {total}건 불일치")

compare("UNITS  (stats.json <-> DEFAULT_UNITS)", json_units, editor_units, UNIT_FIELDS)
compare("SKILLS (stats.json <-> DEFAULT_SKILLS)", json_skills, editor_skills, SKILL_FIELDS)

print("\n" + "="*64)
print("  요약")
print("="*64)
print(f"  stats.json  units  : {len(json_units)}개")
print(f"  editor      units  : {len(editor_units)}개")
print(f"  stats.json  skills : {len(json_skills)}개")
print(f"  editor      skills : {len(editor_skills)}개")
