import json, re, sys

BASE = r"c:/Projects/Project_RTD"

def parse_config_js(path):
    with open(path, encoding="utf-8") as f:
        src = f.read()
    def extract_num(key):
        m = re.search(re.escape(key) + r"\s*:\s*([0-9.]+)", src)
        return float(m.group(1)) if m else None
    simple_keys = ["INITIAL_GOLD","GACHA_COST","ROUND_BONUS_MULTIPLIER","INITIAL_LIVES","MAX_MONSTERS","TOTAL_ROUNDS","SPAWN_INTERVAL","CRITICAL_DAMAGE_RATIO"]
    result = {k: extract_num(k) for k in simple_keys}
    m = re.search(r"GACHA_RATES\s*:\s*\{([^}]+)\}", src, re.DOTALL)
    rates = {}
    if m:
        for line in m.group(1).splitlines():
            lm = re.search(r"(\w+)\s*:\s*([0-9.]+)", line)
            if lm:
                rates[lm.group(1)] = float(lm.group(2))
    result["GACHA_RATES"] = rates
    m2 = re.search(r"TYPE_EFFECTIVENESS\s*:\s*\{(.+?)\n    \}", src, re.DOTALL)
    affinity = {}
    if m2:
        block = m2.group(1)
        for am in re.finditer(r"(\w+)\s*:\s*\{\s*small\s*:\s*([0-9.]+)\s*,\s*mixed\s*:\s*([0-9.]+)\s*,\s*large\s*:\s*([0-9.]+)", block):
            affinity[am.group(1)] = {"small":float(am.group(2)),"mixed":float(am.group(3)),"large":float(am.group(4))}
    result["TYPE_AFFINITY"] = affinity
    return result

def parse_editor_config(path):
    with open(path, encoding="utf-8") as f:
        src = f.read()
    m = re.search(r"const DEFAULT_CONFIG\s*=\s*\{(.+?)\};\s*\n\s*const DEFAULT_UNITS", src, re.DOTALL)
    if not m:
        raise RuntimeError("DEFAULT_CONFIG block not found")
    block = m.group(1)
    def extract_num(key):
        mm = re.search(re.escape(key) + r"\s*:\s*([0-9.]+)", block)
        return float(mm.group(1)) if mm else None
    simple_keys = ["INITIAL_GOLD","GACHA_COST","ROUND_BONUS_MULTIPLIER","INITIAL_LIVES","MAX_MONSTERS","TOTAL_ROUNDS","SPAWN_INTERVAL","CRITICAL_DAMAGE_RATIO"]
    result = {k: extract_num(k) for k in simple_keys}
    rm = re.search(r"GACHA_RATES\s*:\s*\{([^}]+)\}", block, re.DOTALL)
    rates = {}
    if rm:
        for lm in re.finditer(r"(\w+)\s*:\s*([0-9.]+)", rm.group(1)):
            rates[lm.group(1)] = float(lm.group(2))
    result["GACHA_RATES"] = rates
    tm = re.search(r"TYPE_AFFINITY\s*:\s*\{(.+?)\}\s*\}", block, re.DOTALL)
    affinity = {}
    if tm:
        for am in re.finditer(r"(\w+)\s*:\s*\{\s*small\s*:\s*([0-9.]+)\s*,\s*mixed\s*:\s*([0-9.]+)\s*,\s*large\s*:\s*([0-9.]+)", tm.group(1)):
            affinity[am.group(1)] = {"small":float(am.group(2)),"mixed":float(am.group(3)),"large":float(am.group(4))}
    result["TYPE_AFFINITY"] = affinity
    return result

def parse_editor_units(path):
    with open(path, encoding="utf-8") as f:
        src = f.read()
    m = re.search(r"const DEFAULT_UNITS\s*=\s*\[(.+?)\];\s*\n", src, re.DOTALL)
    if not m:
        raise RuntimeError("DEFAULT_UNITS block not found")
    units = []
    for line in m.group(1).splitlines():
        line = line.strip().rstrip(",")
        if line.startswith("{") and line.endswith("}"):
            line2 = re.sub(r'(?<!["\w])(\w+)(?=\s*:)', r'"\1"', line)
            line2 = line2.replace(":true", ":true").replace(":false", ":false")
            line2 = re.sub(r',\s*}', '}', line2)
            try:
                units.append(json.loads(line2))
            except Exception as e:
                print(f"PARSE ERR: {e} | {line2[:80]}")
    return {u["id"]: u for u in units}

def parse_stats_json(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return {u["id"]: u for u in data["units"]}

def approx_eq(a, b, tol=1e-9):
    try:
        return abs(float(a) - float(b)) < tol
    except:
        return a == b

SEP = "-" * 72

def main():
    cfg_real   = parse_config_js(f"{BASE}/js/config.js")
    cfg_editor = parse_editor_config(f"{BASE}/tools/data-editor.html")
    units_editor = parse_editor_units(f"{BASE}/tools/data-editor.html")
    units_stats  = parse_stats_json(f"{BASE}/assets/data/stats.json")

    config_mismatches = 0
    print(f"\n{SEP}")
    print("[1] DEFAULT_CONFIG vs config.js")
    print(SEP)
    simple_keys = ["INITIAL_GOLD","GACHA_COST","ROUND_BONUS_MULTIPLIER","INITIAL_LIVES","MAX_MONSTERS","TOTAL_ROUNDS","SPAWN_INTERVAL","CRITICAL_DAMAGE_RATIO"]
    print(f"{'KEY':<32} {'EDITOR':>14} {'CONFIG.JS':>14}  STATUS")
    print("-" * 72)
    for k in simple_keys:
        ev = cfg_editor.get(k); rv = cfg_real.get(k)
        match = approx_eq(ev, rv)
        status = "OK" if match else "MISMATCH"
        if not match: config_mismatches += 1
        print(f"{k:<32} {str(ev):>14} {str(rv):>14}  {status}")

    print("\n[GACHA_RATES]")
    print(f"{'TIER':<15} {'EDITOR':>12} {'CONFIG.JS':>12}  STATUS")
    print("-" * 48)
    er = cfg_editor.get("GACHA_RATES", {}); rr = cfg_real.get("GACHA_RATES", {})
    for tier in ["normal","rare","ancient","relic","saga","legend","epic","myth","primordial"]:
        ev = er.get(tier); rv = rr.get(tier)
        match = approx_eq(ev, rv)
        status = "OK" if match else "MISMATCH"
        if not match: config_mismatches += 1
        print(f"{tier:<15} {str(ev):>12} {str(rv):>12}  {status}")

    print("\n[TYPE_AFFINITY vs TYPE_EFFECTIVENESS]")
    ea = cfg_editor.get("TYPE_AFFINITY", {}); ra = cfg_real.get("TYPE_AFFINITY", {})
    affinity_ok = True
    for typ in ["normal","vibration","explosive"]:
        for sub in ["small","mixed","large"]:
            ev2 = ea.get(typ,{}).get(sub); rv2 = ra.get(typ,{}).get(sub)
            if not approx_eq(ev2, rv2):
                print(f"  MISMATCH: {typ}.{sub}: editor={ev2}, config.js={rv2}")
                config_mismatches += 1; affinity_ok = False
    if affinity_ok:
        print("  All match OK")

    print(f"\nConfig mismatches: {config_mismatches}")

    print(f"\n{SEP}")
    print("[2] DEFAULT_UNITS vs stats.json units")
    print(SEP)
    compare_fields = ["damage","attackSpeed","range","criticalRate","tier","attackType","skillId","gradeScore","gachaAvailable"]
    all_ids = list(units_editor.keys())
    only_editor = set(units_editor.keys()) - set(units_stats.keys())
    only_stats  = set(units_stats.keys()) - set(units_editor.keys())

    all_mis = []
    for uid in all_ids:
        eu = units_editor.get(uid); su = units_stats.get(uid)
        if eu is None or su is None:
            continue
        for field in compare_fields:
            ev = eu.get(field); sv = su.get(field)
            if isinstance(ev,(int,float)) and isinstance(sv,(int,float)):
                match = approx_eq(ev,sv)
            else:
                match = (ev == sv)
            if not match:
                all_mis.append((uid, eu.get("name",uid), field, ev, sv))

    sample_ids = all_ids[:5] + [x for x in all_ids[-5:] if x not in all_ids[:5]]
    print("\n-- Sample (first5 + last5) --")
    print(f"{'ID':<14} {'NAME':<16}  RESULT")
    print("-" * 50)
    for uid in sample_ids:
        eu = units_editor.get(uid); su = units_stats.get(uid)
        if eu is None or su is None:
            print(f"{uid:<14} (not found)")
            continue
        mis_fields = []
        for f in compare_fields:
            ev = eu.get(f); sv = su.get(f)
            if isinstance(ev,(int,float)) and isinstance(sv,(int,float)):
                ok = approx_eq(ev,sv)
            else:
                ok = (ev==sv)
            if not ok:
                mis_fields.append(f)
        status = "OK" if not mis_fields else f"MISMATCH({','.join(mis_fields)})"
        print(f"{uid:<14} {eu.get('name',''):<16}  {status}")

    if all_mis:
        print(f"\n-- All mismatches ({len(all_mis)}) --")
        print(f"{'ID':<14} {'NAME':<16} {'FIELD':<16} {'EDITOR':>12} {'STATS.JSON':>12}")
        print("-" * 74)
        for uid,name,field,ev,sv in all_mis:
            print(f"{uid:<14} {name:<16} {field:<16} {str(ev):>12} {str(sv):>12}")
    else:
        print("\nAll unit data match perfectly!")

    if only_editor:
        print(f"\nOnly in editor: {sorted(only_editor)}")
    if only_stats:
        print(f"\nOnly in stats.json: {sorted(only_stats)}")

    print(f"\n{SEP}")
    print("SUMMARY")
    print(SEP)
    print(f"Config mismatches: {config_mismatches}")
    print(f"Unit mismatches:   {len(all_mis)}")
    print(f"Only in editor:    {len(only_editor)}")
    print(f"Only in stats:     {len(only_stats)}")
    total = config_mismatches + len(all_mis) + len(only_editor) + len(only_stats)
    if total == 0:
        print("\nAll data matches perfectly!")
    else:
        print(f"\nTotal mismatches: {total}")
    print(SEP)

main()
