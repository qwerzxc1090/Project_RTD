/**
 * 몬스터 HP 감소 적용:
 * - 스테이지 1-20:  8% 감소 (역순 20→1)
 * - 스테이지 21-40: 12% 감소 (역순 40→21)
 * - 스테이지 41-50: 16% 감소 (역순 50→41)
 */
const fs = require('fs');

const statsPath = 'assets/data/stats.json';
const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));

const log = [];

// ── Stage 1-20: 8% 감소 (역순: 20 → 1) ──
for (var i = 20; i >= 1; i--) {
    var m = stats.monsters[i];
    var before = m.hp;
    m.hp = Math.floor(m.hp * 0.92);
    log.push('Stage ' + String(i).padStart(2) + ' (' + m.type + '): ' + before + ' → ' + m.hp + ' (' + (m.hp - before) + ')');
}

// ── Stage 21-40: 12% 감소 (역순: 40 → 21) ──
for (var i = 40; i >= 21; i--) {
    var m = stats.monsters[i];
    var before = m.hp;
    m.hp = Math.floor(m.hp * 0.88);
    log.push('Stage ' + String(i).padStart(2) + ' (' + m.type + '): ' + before + ' → ' + m.hp + ' (' + (m.hp - before) + ')');
}

// ── Stage 41-50: 16% 감소 (역순: 50 → 41) ──
for (var i = 50; i >= 41; i--) {
    var m = stats.monsters[i];
    var before = m.hp;
    m.hp = Math.floor(m.hp * 0.84);
    log.push('Stage ' + String(i).padStart(2) + ' (' + m.type + '): ' + before + ' → ' + m.hp + ' (' + (m.hp - before) + ')');
}

// stats.json 저장
fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));

// 변경 로그 출력
console.log('=== Stage 1-20 (×0.92) ===');
log.filter(function(l){ return /Stage\s+(1|2|[1-9]|[1][0-9]|20)\s/.test(l); }).forEach(function(l){ console.log(l); });
console.log('\n=== Stage 21-40 (×0.88) ===');
log.filter(function(l){ return /Stage\s+(2[1-9]|3[0-9]|40)\s/.test(l); }).forEach(function(l){ console.log(l); });
console.log('\n=== Stage 41-50 (×0.84) ===');
log.filter(function(l){ return /Stage\s+(4[1-9]|50)\s/.test(l); }).forEach(function(l){ console.log(l); });

console.log('\n✅ stats.json 저장 완료');

// ── data-editor.html DEFAULT_MONSTERS 동기화 ──
var htmlPath = 'tools/data-editor.html';
var html = fs.readFileSync(htmlPath, 'utf8');

var monsterLines = Object.values(stats.monsters).map(function(m) {
    var img = m.imagePath || '';
    return "    { id: " + String(m.id).padStart(2) + ", name: '" + m.name + "', type: '" + m.type + "', hp: " + m.hp + ", speed: " + m.speed + ", goldReward: " + m.goldReward + ", isBoss: " + m.isBoss + ", imagePath: '" + img + "' }";
});

var newMonsters = 'const DEFAULT_MONSTERS = [\n' + monsterLines.join(',\n') + '\n    ];';
html = html.replace(/const DEFAULT_MONSTERS = \[[\s\S]*?\];(\r?\n)/, newMonsters + '$1');

fs.writeFileSync(htmlPath, html);
console.log('✅ data-editor.html DEFAULT_MONSTERS 동기화 완료');
