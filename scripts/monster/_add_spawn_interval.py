"""
스테이지 데이터에 spawnInterval 필드 추가 (기본값 2000ms)
보스 라운드 포함 전체 50라운드 적용
"""
import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

DEFAULT_SPAWN_INTERVAL = 2000

with open('assets/data/stats.json', encoding='utf-8') as f:
    data = json.load(f)

print("=== spawnInterval 필드 추가 ({}ms) ===".format(DEFAULT_SPAWN_INTERVAL))
for w in data['waves']:
    if 'spawnInterval' not in w:
        w['spawnInterval'] = DEFAULT_SPAWN_INTERVAL
        print("  R{:02d} 추가: {}ms".format(w['round'], DEFAULT_SPAWN_INTERVAL))
    else:
        print("  R{:02d} 이미 존재: {}ms".format(w['round'], w['spawnInterval']))

with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print("\nstats.json 저장 완료 ({}개 웨이브)".format(len(data['waves'])))
