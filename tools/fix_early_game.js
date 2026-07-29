const fs = require('fs');

// ─────────────────────────────────────────────
// 1. WaveSystem.js 스폰 간격 15% 증가
// ─────────────────────────────────────────────
let wave = fs.readFileSync('js/systems/WaveSystem.js', 'utf8');
wave = wave.replace('if (round <= 10) return 1600;', 'if (round <= 10) return 1840;');
wave = wave.replace('if (round <= 20) return 1000;', 'if (round <= 20) return 1150;');
wave = wave.replace('if (round <= 30) return 750;',  'if (round <= 30) return 863;');
wave = wave.replace('return 550;',                   'return 633;');
fs.writeFileSync('js/systems/WaveSystem.js', wave, 'utf8');
console.log('[1] WaveSystem.js 스폰 간격 15% 증가');
console.log('    R1-10:  1600 → 1840ms');
console.log('    R11-20: 1000 → 1150ms');
console.log('    R21-30:  750 →  863ms');
console.log('    R31+:    550 →  633ms');

// ─────────────────────────────────────────────
// 2. stats.json R1-10 HP 감소
// R1=-8%, R2=-7.2%, ..., R7=-3.2%, R8=보스skip, R9=-1.6%, R10=0%
// ─────────────────────────────────────────────
const stats = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));

const rateMap = { 1:8.0, 2:7.2, 3:6.4, 4:5.6, 5:4.8, 6:4.0, 7:3.2, 9:1.6, 10:0.0 };

console.log('\n[2] stats.json R1-10 HP 감소');
const changes = [];
Object.keys(rateMap).forEach(r => {
    const m = stats.monsters[r];
    if (!m || m.isBoss) return;
    const rate = rateMap[r];
    const old = m.hp;
    m.hp = Math.round(old * (1 - rate / 100));
    changes.push({ r, old, hp: m.hp, rate });
    console.log('    R' + r + ': -' + rate.toFixed(1) + '% → ' + old + ' → ' + m.hp);
});

fs.writeFileSync('assets/data/stats.json', JSON.stringify(stats, null, 2), 'utf8');
console.log('    stats.json 저장 완료');

// ─────────────────────────────────────────────
// 3. data-editor.html 동기화
// ─────────────────────────────────────────────
let html = fs.readFileSync('tools/data-editor.html', 'utf8');
let edited = 0;

changes.forEach(c => {
    const pattern = new RegExp(
        "({ id: " + c.r + ",\\s*name: '[^']*',\\s*type: '[^']*',\\s*hp: )\\d+(,)",
        'g'
    );
    html = html.replace(pattern, (match, pre, post) => {
        edited++;
        return pre + c.hp + post;
    });
});

fs.writeFileSync('tools/data-editor.html', html, 'utf8');
console.log('\n[3] data-editor.html 동기화: ' + edited + '개 HP 업데이트');
console.log('\n✅ 모든 작업 완료');
