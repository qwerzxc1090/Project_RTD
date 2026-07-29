const fs = require('fs');
const stats = JSON.parse(fs.readFileSync('assets/data/stats.json','utf8'));

const MIN_RED = 0.04;
const MAX_RED = 0.12;
const N = 8;

console.log('스테이지 | 타입   |  이전 HP | 감소율   |  신규 HP');
console.log('---------|--------|---------|---------|----------');

for (var i = 1; i <= N; i++) {
    var reduction = MAX_RED - (MAX_RED - MIN_RED) * (i - 1) / (N - 1);
    var m = stats.monsters[i];
    var before = m.hp;
    m.hp = Math.floor(m.hp * (1 - reduction));
    var pct = '-' + (reduction * 100).toFixed(2) + '%';
    console.log(
        'Stage ' + String(i).padStart(2) + '  | ' +
        m.type.padEnd(6) + ' | ' +
        String(before).padStart(8) + ' | ' +
        pct.padStart(8) + ' | ' +
        String(m.hp).padStart(8)
    );
}

fs.writeFileSync('assets/data/stats.json', JSON.stringify(stats, null, 2));
console.log('\n✅ stats.json 저장 완료');

// data-editor 동기화
var html = fs.readFileSync('tools/data-editor.html','utf8');
var lines = Object.values(stats.monsters).map(function(m) {
    var img = m.imagePath || '';
    return "    { id: " + String(m.id).padStart(2) + ", name: '" + m.name + "', type: '" + m.type + "', hp: " + m.hp + ", speed: " + m.speed + ", goldReward: " + m.goldReward + ", isBoss: " + m.isBoss + ", imagePath: '" + img + "' }";
});
var newM = 'const DEFAULT_MONSTERS = [\n' + lines.join(',\n') + '\n    ];';
html = html.replace(/const DEFAULT_MONSTERS = \[[\s\S]*?\];(\r?\n)/, newM + '$1');
fs.writeFileSync('tools/data-editor.html', html);
console.log('✅ data-editor.html 동기화 완료');
