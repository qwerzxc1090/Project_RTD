import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
try:
    d = json.load(open('assets/data/stats.json', encoding='utf-8'))
    print("[PASS] JSON valid")
    skills = d['skills']
    for k in sorted(skills.keys(), key=lambda x: int(x)):
        v = skills[k]
        if int(k) >= 6:
            print(f"  skill {k:>2}: {v['name']:<16} attacksToReward={v.get('attacksToReward','N/A'):>4}  goldReward={v.get('goldReward','N/A')}")
except json.JSONDecodeError as e:
    print(f"[FAIL] JSON error: {e}")
