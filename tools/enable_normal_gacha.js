const fs = require('fs');
const stats = JSON.parse(fs.readFileSync('assets/data/stats.json','utf8'));
const units = Object.values(stats.units);

// normal attackType이고 _yeon이 아닌 타워 → gachaAvailable = true
var changed = [];
units.forEach(function(u) {
    if (u.attackType === 'normal' && u.id.indexOf('_yeon') === -1 && u.gachaAvailable === false) {
        u.gachaAvailable = true;
        changed.push(u.id + ' (' + u.name + ')');
    }
});

console.log('변경된 타워: ' + changed.join(', '));

// 변경 후 등급별 풀 확인
console.log('\n=== 변경 후 등급별 가챠 풀 ===');
var tiers = ['normal','rare','ancient','relic','saga','legend','epic','myth','primordial'];
tiers.forEach(function(tier) {
    var pool = units.filter(function(u) { return u.tier === tier && u.gachaAvailable; });
    var names = pool.map(function(u) { return u.id + '(' + u.attackType.substring(0,3) + ')'; }).join(', ');
    console.log(tier.padEnd(11) + ': ' + pool.length + '종 → 각 ' + (100/pool.length).toFixed(1) + '%  [' + names + ']');
});

fs.writeFileSync('assets/data/stats.json', JSON.stringify(stats, null, 2));
console.log('\n✅ stats.json 저장 완료');

// data-editor 동기화
var html = fs.readFileSync('tools/data-editor.html','utf8');
var unitLines = units.map(function(u) {
    return '  {id:"' + u.id + '", name:"' + u.name + '", tier:"' + u.tier + '", attackType:"' + u.attackType + '", damage:' + u.damage + ', attackSpeed:' + u.attackSpeed + ', range:' + u.range + ', skillId:' + u.skillId + ', gradeScore:' + u.gradeScore + ', gachaAvailable:' + u.gachaAvailable + '}';
});
var newUnits = 'const DEFAULT_UNITS = [\n' + unitLines.join(',\n') + '\n];';
html = html.replace(/const DEFAULT_UNITS = \[[\s\S]*?\];(\r?\n)/, newUnits + '$1');
fs.writeFileSync('tools/data-editor.html', html);
console.log('✅ data-editor.html 동기화 완료');
