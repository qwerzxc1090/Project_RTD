const fs = require('fs');

// ── 1. config.js INITIAL_GOLD 변경 ──
let cfg = fs.readFileSync('js/config.js', 'utf8');
cfg = cfg.replace(/INITIAL_GOLD:\s*\d+,/, 'INITIAL_GOLD: 500,');
fs.writeFileSync('js/config.js', cfg, 'utf8');
console.log('✅ config.js: INITIAL_GOLD → 500');

// ── 2. stats.json 몬스터 HP 수정 ──
const stats = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));
const R1_20 = [1,2,3,4,5,6,7,9,10,11,12,13,14,15,17,18,19,20];

console.log('\n[R1-20: ×0.833 조정 후 ×1.15] (최종 ×0.958)');
R1_20.forEach(id => {
    const m = stats.monsters[id];
    if (!m || m.isBoss) return;
    const old = m.hp;
    m.hp = Math.round(old * 0.833 * 1.15);
    console.log('  R' + id + ': ' + old + ' → ' + m.hp);
});

console.log('\n[R21+: ×1.15]');
Object.keys(stats.monsters).forEach(id => {
    const m = stats.monsters[id];
    if (m.isBoss || R1_20.includes(parseInt(id))) return;
    const old = m.hp;
    m.hp = Math.round(old * 1.15);
    console.log('  R' + id + ': ' + old + ' → ' + m.hp);
});

fs.writeFileSync('assets/data/stats.json', JSON.stringify(stats, null, 2), 'utf8');
console.log('\n✅ stats.json 저장 완료');

// ── 3. data-editor.html 동기화 ──
let html = fs.readFileSync('tools/data-editor.html', 'utf8');

// INITIAL_GOLD 변경
html = html.replace(/INITIAL_GOLD:\s*\d+,/, 'INITIAL_GOLD: 500,');
console.log('✅ data-editor: INITIAL_GOLD → 500');

// 몬스터 HP 동기화
let editorEdited = 0;
Object.keys(stats.monsters).forEach(id => {
    const m = stats.monsters[id];
    if (m.isBoss) return;
    const pattern = new RegExp(
        "({ id: " + id + ",\\s*name: '[^']*',\\s*type: '[^']*',\\s*hp: )\\d+(,)",
        'g'
    );
    html = html.replace(pattern, (match, pre, post) => {
        editorEdited++;
        return pre + m.hp + post;
    });
});

fs.writeFileSync('tools/data-editor.html', html, 'utf8');
console.log('✅ data-editor.html: 몬스터 HP ' + editorEdited + '개 동기화 완료');
