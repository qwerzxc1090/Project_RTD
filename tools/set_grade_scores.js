const fs = require('fs');
const stats = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));

const BASE_RANGE = 120;

function calcPower(u) {
    const dps = u.damage * (1000 / u.attackSpeed);
    const rangeFactor = u.range / BASE_RANGE;
    return dps * rangeFactor;
}

// 노말 타워 평균 power = 100점 기준
const normals = stats.units.filter(u => u.tier === 'normal');
const normalAvgPower = normals.reduce((s, u) => s + calcPower(u), 0) / normals.length;

console.log('노말 평균 power=' + normalAvgPower.toFixed(1) + ' → 100점 기준');
console.log('');

stats.units.forEach(u => {
    const power = calcPower(u);
    u.gradeScore = Math.round(power / normalAvgPower * 100);
    console.log('id=' + u.id + ' [' + u.tier + '] ' + u.name + ' → gradeScore=' + u.gradeScore);
});

fs.writeFileSync('assets/data/stats.json', JSON.stringify(stats, null, 2), 'utf8');
console.log('\n✅ stats.json gradeScore 저장 완료');
