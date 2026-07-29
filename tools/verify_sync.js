const fs = require('fs');
const stats = JSON.parse(fs.readFileSync('assets/data/stats.json','utf8'));
const html  = fs.readFileSync('tools/data-editor.html','utf8');

var ok = true;

// ── 1. UNITS 비교 ──
const units = Object.values(stats.units);
var unitErrs = [];
units.forEach(function(u) {
    var pattern = 'id:"' + u.id + '"';
    var idx = html.indexOf(pattern);
    if (idx === -1) { unitErrs.push(u.id + ': 라인 없음'); return; }
    var chunk = html.substring(idx, idx + 200);

    var dmgM = chunk.match(/damage:(\d+)/);
    var spdM = chunk.match(/attackSpeed:(\d+)/);
    if (!dmgM) { unitErrs.push(u.id + ': damage 필드 없음'); return; }
    if (!spdM) { unitErrs.push(u.id + ': attackSpeed 필드 없음'); return; }
    if (parseInt(dmgM[1]) !== u.damage)      unitErrs.push(u.id + ' damage: editor=' + dmgM[1] + ' actual=' + u.damage);
    if (parseInt(spdM[1]) !== u.attackSpeed) unitErrs.push(u.id + ' attackSpeed: editor=' + spdM[1] + ' actual=' + u.attackSpeed);
});
if (unitErrs.length) {
    ok = false;
    console.log('❌ UNITS 불일치 (' + unitErrs.length + '건):');
    unitErrs.forEach(function(e){ console.log('   ' + e); });
} else {
    console.log('✅ UNITS (' + units.length + '개) 모두 일치');
}

// ── 2. MONSTERS 비교 ──
const monsters = Object.values(stats.monsters);
var monErrs = [];
monsters.forEach(function(m) {
    var pattern = '{ id: ' + String(m.id).padStart(2) + ',';
    var idx = html.indexOf(pattern);
    if (idx === -1) {
        pattern = '{ id: ' + m.id + ',';
        idx = html.indexOf(pattern);
    }
    if (idx === -1) { monErrs.push('monster ' + m.id + ': 라인 없음'); return; }
    var chunk = html.substring(idx, idx + 200);
    var hpM = chunk.match(/hp:\s*(\d+)/);
    if (!hpM) { monErrs.push('monster ' + m.id + ': hp 필드 없음'); return; }
    if (parseInt(hpM[1]) !== m.hp) monErrs.push('monster ' + m.id + '(' + m.name + ') hp: editor=' + hpM[1] + ' actual=' + m.hp);
});
if (monErrs.length) {
    ok = false;
    console.log('❌ MONSTERS 불일치 (' + monErrs.length + '건):');
    monErrs.forEach(function(e){ console.log('   ' + e); });
} else {
    console.log('✅ MONSTERS (' + monsters.length + '개) 모두 일치');
}

// ── 3. SKILLS 비교 ──
const skills = stats.skills;
var skillErrs = [];
Object.entries(skills).forEach(function(entry) {
    var k = entry[0], s = entry[1];
    var pattern = '"' + k + '":{id:' + s.id;
    var idx = html.indexOf(pattern);
    if (idx === -1) { skillErrs.push('skill ' + k + ': 라인 없음'); return; }
    var chunk = html.substring(idx, idx + 300);
    var spdM = chunk.match(/projectileSpeed:([0-9.]+)/);
    if (!spdM) { skillErrs.push('skill ' + k + ': projectileSpeed 없음'); return; }
    if (parseFloat(spdM[1]) !== s.projectileSpeed) skillErrs.push('skill ' + k + ' speed: editor=' + spdM[1] + ' actual=' + s.projectileSpeed);
});
if (skillErrs.length) {
    ok = false;
    console.log('❌ SKILLS 불일치 (' + skillErrs.length + '건):');
    skillErrs.forEach(function(e){ console.log('   ' + e); });
} else {
    console.log('✅ SKILLS (' + Object.keys(skills).length + '개) 모두 일치');
}

// ── 4. WAVES 비교 ──
const waves = stats.waves;
var waveErrs = [];
waves.forEach(function(w) {
    var pattern = '{ round: ' + w.round + ',';
    var idx = html.indexOf(pattern);
    if (idx === -1) { waveErrs.push('wave round=' + w.round + ': 라인 없음'); return; }
    var chunk = html.substring(idx, idx + 150);
    var midM  = chunk.match(/monsterId:\s*(\d+)/);
    var cntM  = chunk.match(/count:\s*(\d+)/);
    if (!midM || !cntM) { waveErrs.push('wave r' + w.round + ': 필드 파싱 실패'); return; }
    if (parseInt(midM[1]) !== w.monsterId) waveErrs.push('wave r' + w.round + ' monsterId: editor=' + midM[1] + ' actual=' + w.monsterId);
    if (parseInt(cntM[1])  !== w.count)    waveErrs.push('wave r' + w.round + ' count: editor=' + cntM[1] + ' actual=' + w.count);
});
if (waveErrs.length) {
    ok = false;
    console.log('❌ WAVES 불일치 (' + waveErrs.length + '건):');
    waveErrs.forEach(function(e){ console.log('   ' + e); });
} else {
    console.log('✅ WAVES (' + waves.length + '개) 모두 일치');
}

// ── 5. TYPE_AFFINITY 비교 ──
var affErrs = [];
var expectedAffinity = {
    normal:    { small: 1.00, mixed: 1.00, large: 1.00 },
    vibration: { small: 1.00, mixed: 0.50, large: 0.25 },
    explosive: { small: 0.50, mixed: 0.75, large: 1.00 }
};
Object.entries(expectedAffinity).forEach(function(entry) {
    var atkType = entry[0], targets = entry[1];
    Object.entries(targets).forEach(function(te) {
        var monType = te[0], expected = te[1];
        var pat = new RegExp(atkType + '\\s*:\\s*\\{[^}]*' + monType + '\\s*:\\s*([0-9.]+)');
        var m = html.match(pat);
        if (!m) { affErrs.push(atkType + '.' + monType + ': 없음'); return; }
        if (Math.abs(parseFloat(m[1]) - expected) > 0.001) affErrs.push(atkType + '.' + monType + ': editor=' + m[1] + ' expected=' + expected);
    });
});
if (affErrs.length) {
    ok = false;
    console.log('❌ TYPE_AFFINITY 불일치:');
    affErrs.forEach(function(e){ console.log('   ' + e); });
} else {
    console.log('✅ TYPE_AFFINITY (9개 항목) 모두 일치');
}

console.log('');
console.log(ok ? '🎉 전체 동기화 완료' : '⚠️  일부 항목 불일치');
