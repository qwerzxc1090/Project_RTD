const fs = require('fs');

const stats = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));
const html  = fs.readFileSync('tools/data-editor.html', 'utf8');
const cfg   = fs.readFileSync('js/config.js', 'utf8');

// ── 에디터 데이터 추출 ──
const matchU = html.match(/const DEFAULT_UNITS\s*=\s*\[([\s\S]*?)\];/);
const editorUnits = eval('[' + matchU[1] + ']');

const matchM = html.match(/const DEFAULT_MONSTERS\s*=\s*\[([\s\S]*?)\];/);
const editorMonsters = eval('[' + matchM[1] + ']');

let diffs = [];
let ok = true;

// ── 타워 유닛 비교 ──
editorUnits.forEach(eu => {
    const su = stats.units.find(u => u.id === eu.id);
    if (!su) { diffs.push('UNIT ' + eu.id + ' stats.json에 없음'); ok = false; return; }
    ['damage','attackSpeed','range','tier','attackType'].forEach(f => {
        if (eu[f] !== su[f]) {
            diffs.push('UNIT ' + eu.id + ' [' + eu.tier + '] ' + eu.name + '.' + f + ': editor=' + eu[f] + ' / stats=' + su[f]);
            ok = false;
        }
    });
});

// ── 몬스터 비교 ──
editorMonsters.forEach(em => {
    const sm = stats.monsters[em.id];
    if (!sm) { diffs.push('MON ' + em.id + ' stats.json에 없음'); ok = false; return; }
    ['hp','speed','goldReward','isBoss'].forEach(f => {
        if (em[f] !== sm[f]) {
            diffs.push('MON ' + em.id + ' ' + em.name + '.' + f + ': editor=' + em[f] + ' / stats=' + sm[f]);
            ok = false;
        }
    });
});

console.log('=== 유닛(타워) 비교 ===');
const unitOk = diffs.filter(d => d.startsWith('UNIT')).length === 0;
if (unitOk) console.log('✅ 타워 ' + editorUnits.length + '개 완전 일치');
else diffs.filter(d => d.startsWith('UNIT')).forEach(d => console.log('  ❌ ' + d));

console.log('');
console.log('=== 몬스터 비교 ===');
const monOk = diffs.filter(d => d.startsWith('MON')).length === 0;
if (monOk) console.log('✅ 몬스터 ' + editorMonsters.length + '개 완전 일치');
else diffs.filter(d => d.startsWith('MON')).forEach(d => console.log('  ❌ ' + d));

// ── 설정값 비교 ──
const cfgMaxM  = parseInt(cfg.match(/MAX_MONSTERS:\s*(\d+)/)[1]);
const cfgInitL = parseInt(cfg.match(/INITIAL_LIVES:\s*(\d+)/)[1]);
const cfgInitG = parseInt(cfg.match(/INITIAL_GOLD:\s*(\d+)/)[1]);
const cfgBonus = parseFloat(cfg.match(/ROUND_BONUS_MULTIPLIER:\s*([\d.]+)/)[1]);

// 에디터 DEFAULT_CONFIG 추출
const matchC = html.match(/const DEFAULT_CONFIG\s*=\s*\{([\s\S]*?)\};/);
const edCfgRaw = '{' + matchC[1] + '}';
const edMaxM  = edCfgRaw.match(/MAX_MONSTERS[^:]*:\s*(\d+)/);
const edInitL = edCfgRaw.match(/INITIAL_LIVES[^:]*:\s*(\d+)/);
const edInitG = edCfgRaw.match(/INITIAL_GOLD[^:]*:\s*(\d+)/);
const edBonus = edCfgRaw.match(/ROUND_BONUS_MULTIPLIER[^:]*:\s*([\d.]+)/);

console.log('');
console.log('=== 설정값 비교 (config.js vs data-editor) ===');
function chk(name, a, b) {
    const match = (a === b) ? '✅' : '❌';
    console.log(match + ' ' + name + ': config=' + a + ' / editor=' + b);
}
chk('MAX_MONSTERS',          cfgMaxM,  edMaxM  ? parseInt(edMaxM[1])  : '?');
chk('INITIAL_LIVES',         cfgInitL, edInitL ? parseInt(edInitL[1]) : '?');
chk('INITIAL_GOLD',          cfgInitG, edInitG ? parseInt(edInitG[1]) : '?');
chk('ROUND_BONUS_MULTIPLIER',cfgBonus, edBonus ? parseFloat(edBonus[1]) : '?');

console.log('');
console.log(ok ? '🎉 모든 데이터 일치!' : ('⚠️ 총 불일치: ' + diffs.length + '건'));
