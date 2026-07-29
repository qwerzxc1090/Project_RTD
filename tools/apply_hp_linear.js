/**
 * 일반 몬스터 HP 선형 재설정 (min→max 단조 증가)
 * - 시작HP = 현재 데이터 최솟값 (963)
 * - 종료HP = 현재 데이터 최댓값 (1687)
 * - 43개 일반 스테이지에 선형 보간
 * - 보스: 변경 없음
 */
const fs = require('fs');
const stats = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));

const waves    = stats.waves;
const monsters = stats.monsters;

const normalWaves = waves.filter(w => !monsters[w.monsterId].isBoss);
const n = normalWaves.length; // 43

// 현재 min / max
const allHP  = normalWaves.map(w => monsters[w.monsterId].hp);
const minHP  = Math.min(...allHP); // 963
const maxHP  = Math.max(...allHP); // 1687

console.log('=== 선형 HP 설정 계획 ===');
console.log('시작HP (R1)  :', minHP, '→ 현재 min');
console.log('종료HP (R49) :', maxHP, '→ 현재 max');
console.log('스테이지당 증가:', ((maxHP - minHP) / (n - 1)).toFixed(2), 'HP/스테이지');
console.log('');

// ── 보스 HP ──
console.log('=== 보스 HP (변경 없음) ===');
waves.filter(w => monsters[w.monsterId].isBoss).forEach(w => {
    const m = monsters[w.monsterId];
    console.log('R' + String(w.round).padStart(2) + ' | HP: ' + m.hp.toLocaleString() + ' (1마리)');
});
console.log('');

// ── 일반 몬스터 재설정 ──
console.log('=== 일반 몬스터 HP 재설정 ===');
console.log('Pos | Round | 마리수 | 구HP  | 신HP  | 단일↑ | totalHP(신규)');
console.log('----|-------|-------|------|------|------|----------');

let prev = 0;
normalWaves.forEach((w, i) => {
    const pos   = i + 1;
    const newHP = Math.round(minHP + (maxHP - minHP) * (pos - 1) / (n - 1));
    const m     = monsters[w.monsterId];
    const check = newHP >= prev ? '✅' : '❌';
    const totalHP = newHP * w.count;

    console.log(
        String(pos).padStart(3) + ' | ' +
        ('R' + w.round).padStart(5) + ' | ' +
        String(w.count).padStart(5) + ' | ' +
        String(m.hp).padStart(5) + ' | ' +
        String(newHP).padStart(5) + ' | ' +
        check + ' | ' +
        totalHP.toLocaleString()
    );

    m.hp = newHP;
    prev = newHP;
});

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
