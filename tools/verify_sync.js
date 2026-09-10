const fs = require('fs');
const vm = require('vm');

const stats = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));
const editorHtml = fs.readFileSync('tools/data-editor.html', 'utf8');

function loadEditorDefaults() {
    const start = editorHtml.indexOf('const DEFAULT_CONFIG');
    const end = editorHtml.indexOf('const LS_KEYS');
    if (start === -1 || end === -1 || end <= start) {
        throw new Error('data-editor.html 기본값 블록을 찾을 수 없습니다.');
    }
    const source = editorHtml.slice(start, end) + `
        globalThis.__defaults = {
            config: DEFAULT_CONFIG, units: DEFAULT_UNITS,
            skills: DEFAULT_SKILLS, monsters: DEFAULT_MONSTERS,
            waves: DEFAULT_WAVES, dpsMode: DEFAULT_DPS_MODE
        };
    `;
    const context = {};
    vm.runInNewContext(source, context);
    return JSON.parse(JSON.stringify(context.__defaults));
}

function loadRuntimeConfig() {
    const context = {
        window: {},
        localStorage: { getItem: function() { return null; } },
        console: console
    };
    vm.runInNewContext(fs.readFileSync('js/config.js', 'utf8'), context);
    return JSON.parse(JSON.stringify(context.window.Game.Config));
}

function equal(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

let failed = false;
function check(label, actual, expected) {
    if (equal(actual, expected)) {
        const count = Array.isArray(actual) ? ' (' + actual.length + '개)' : '';
        console.log('PASS ' + label + count);
        return;
    }
    failed = true;
    console.error('FAIL ' + label + ' 불일치');
}

const editor = loadEditorDefaults();
const config = loadRuntimeConfig();

check('UNITS', editor.units, stats.units);
check('SKILLS', editor.skills, stats.skills);
check('MONSTERS', editor.monsters, Object.values(stats.monsters));
check('WAVES', editor.waves, stats.waves);
check('DPS_MODE', editor.dpsMode, stats.dpsMode);

const scalarKeys = [
    'INITIAL_GOLD', 'GACHA_COST', 'ROUND_BONUS_MULTIPLIER',
    'INITIAL_LIVES', 'MAX_MONSTERS', 'TOTAL_ROUNDS', 'SPAWN_INTERVAL',
    'CRITICAL_DAMAGE_RATIO', 'BETWEEN_ROUND_DELAY',
    'BETWEEN_ROUND_DELAY_BOSS_START', 'BETWEEN_ROUND_DELAY_BOSS_END'
];
const editorScalars = {};
const runtimeScalars = {};
scalarKeys.forEach(function(key) {
    editorScalars[key] = editor.config[key];
    runtimeScalars[key] = config[key];
});
check('CONFIG_VALUES', editorScalars, runtimeScalars);
check('GACHA_RATES', editor.config.GACHA_RATES, config.GACHA_RATES);
check('SYNTHESIS_RATES', editor.config.SYNTHESIS_RATES, config.SYNTHESIS_RATES);
check('TYPE_EFFECTIVENESS', editor.config.TYPE_EFFECTIVENESS, {
    normal: config.TYPE_EFFECTIVENESS.normal,
    vibration: config.TYPE_EFFECTIVENESS.vibration,
    explosive: config.TYPE_EFFECTIVENESS.explosive
});

if (failed) {
    console.error('\nEditor defaults are out of sync. Run: node tools/sync_defaults.js');
    process.exitCode = 1;
} else {
    console.log('\nAll editor defaults are synchronized.');
}
