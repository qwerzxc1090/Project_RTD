const fs = require('fs');
const stats = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));

// R45, R46, R47의 total HP 추이
// R45: 48,552
// R46: 48,960
// R47: 49,368
// 증가량: +408
const r47Total = 49368;
const diff = 408;

// 선형 증가 시 R49의 목표 total HP (R47 기준 +2 라운드)
const targetTotalHP = r47Total + (diff * 2);

// R49 웨이브 및 몬스터 정보 찾기
const w49 = stats.waves.find(w => w.round === 49);
const m49 = stats.monsters[w49.monsterId];

// 새로운 개별 HP 계산
const newHP = Math.round(targetTotalHP / w49.count);
const oldHP = m49.hp;
const oldTotalHP = oldHP * w49.count;
const actualNewTotal = newHP * w49.count;

m49.hp = newHP;

console.log('=== R49 토탈 HP 선형 증가 조정 ===');
console.log('R47 Total HP: ' + r47Total.toLocaleString());
console.log('R49 목표 Total HP: ' + targetTotalHP.toLocaleString() + ' (스테이지당 +408)');
console.log('');
console.log('R49 마리수: ' + w49.count);
console.log('이전 개별 HP: ' + oldHP + ' -> 이전 토탈 HP: ' + oldTotalHP.toLocaleString());
console.log('신규 개별 HP: ' + newHP + ' -> 신규 토탈 HP: ' + actualNewTotal.toLocaleString());

// 저장
fs.writeFileSync('assets/data/stats.json', JSON.stringify(stats, null, 2));
console.log('\n✅ stats.json 저장 완료');

// data-editor 동기화
let html = fs.readFileSync('tools/data-editor.html', 'utf8');
const lines = Object.values(stats.monsters).map(m => {
    const img = m.imagePath || '';
    return "    { id: " + String(m.id).padStart(2) + ", name: '" + m.name + "', type: '" + m.type + "', hp: " + m.hp + ", speed: " + m.speed + ", goldReward: " + m.goldReward + ", isBoss: " + m.isBoss + ", imagePath: '" + img + "' }";
});
const newM = 'const DEFAULT_MONSTERS = [\n' + lines.join(',\n') + '\n    ];';
html = html.replace(/const DEFAULT_MONSTERS = \[[\s\S]*?\];(\r?\n)/, newM + '$1');
fs.writeFileSync('tools/data-editor.html', html);
console.log('✅ data-editor.html 동기화 완료');
