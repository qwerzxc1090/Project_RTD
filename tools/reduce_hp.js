const fs = require('fs');

// ── stats.json: 비보스 몬스터 HP 25% 감소 ──
const stats = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));
let count = 0;
const changes = [];

Object.keys(stats.monsters).forEach(id => {
    const m = stats.monsters[id];
    if (!m.isBoss) {
        const oldHp = m.hp;
        m.hp = Math.round(m.hp * 0.75);
        changes.push({ id, oldHp, newHp: m.hp });
        count++;
    }
});

fs.writeFileSync('assets/data/stats.json', JSON.stringify(stats, null, 2), 'utf8');
console.log('stats.json: 비보스 ' + count + '개 HP 25% 감소 완료');
changes.forEach(c => console.log('  R' + c.id + ': ' + c.oldHp + ' -> ' + c.newHp));

// ── data-editor.html: DEFAULT_MONSTERS 동기화 ──
let html = fs.readFileSync('tools/data-editor.html', 'utf8');
let edited = 0;

changes.forEach(c => {
    // 패턴: { id: N,  name: '...', type: '...', hp: OLD,
    const pattern = '{ id: ' + c.id + ',';
    const idx = html.indexOf(pattern);
    if (idx === -1) return;

    // hp: 숫자 부분만 교체
    const segment = html.substring(idx, idx + 200);
    const hpMatch = segment.match(/hp:\s*(\d+),/);
    if (!hpMatch) return;

    const oldStr = pattern + segment.substring(0, hpMatch.index + hpMatch[0].length);
    const newSegment = segment.substring(0, hpMatch.index) + 'hp: ' + c.newHp + ',';
    html = html.substring(0, idx) + newSegment + html.substring(idx + hpMatch.index + hpMatch[0].length);
    edited++;
});

fs.writeFileSync('tools/data-editor.html', html, 'utf8');
console.log('\ndata-editor.html: ' + edited + '개 HP 동기화 완료');
