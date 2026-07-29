const fs = require('fs');

// ── 1. stats.json: R1-7 일반 몬스터 HP -10% (R8은 보스) ──
const stats = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));
let html = fs.readFileSync('tools/data-editor.html', 'utf8');

const targets = [1,2,3,4,5,6,7]; // R8은 보스 제외
const changes = [];

console.log('[1] R1-7 일반 몬스터 HP -10%');
targets.forEach(r => {
    const m = stats.monsters[r];
    if (!m || m.isBoss) return;
    const old = m.hp;
    m.hp = Math.round(old * 0.9);
    changes.push({ r, old, hp: m.hp });
    const scaled = Math.floor(m.hp * (1 + r * 0.1));
    console.log(`  R${r}: ${old} → ${m.hp} (scaled=${scaled})`);
});

fs.writeFileSync('assets/data/stats.json', JSON.stringify(stats, null, 2), 'utf8');
console.log('  stats.json 저장 완료');

// ── 2. data-editor.html HP 동기화 ──
let edHp = 0;
changes.forEach(c => {
    const re = new RegExp(
        "({ id: " + c.r + ",\\s*name: '[^']*',\\s*type: '[^']*',\\s*hp: )\\d+(,)", 'g'
    );
    html = html.replace(re, (match, pre, post) => { edHp++; return pre + c.hp + post; });
});
fs.writeFileSync('tools/data-editor.html', html, 'utf8');
console.log(`  data-editor.html HP 동기화: ${edHp}개`);

// ── 3. WaveSystem.js: R1-8 스폰 간격 +10% (1840 → 2024) ──
//    R9-10은 기존 1840 유지 → 조건 분리
let wave = fs.readFileSync('js/systems/WaveSystem.js', 'utf8');
wave = wave.replace(
    'if (round <= 10) return 1840;',
    'if (round <= 8)  return 2024;   // R1-8: +10% (1840→2024)\n        if (round <= 10) return 1840;'
);
fs.writeFileSync('js/systems/WaveSystem.js', wave, 'utf8');
console.log('\n[2] WaveSystem.js 스폰 간격 분리');
console.log('  R1-8:  1840ms → 2024ms (+10%)');
console.log('  R9-10: 1840ms 유지');
console.log('  WaveSystem.js 저장 완료');
