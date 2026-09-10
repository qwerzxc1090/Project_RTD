const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');
const statsPath = path.join(projectRoot, 'assets', 'data', 'stats.json');
const editorPath = path.join(projectRoot, 'tools', 'data-editor.html');
const damageRatios = {
    normal: 0.80,
    rare: 0.90,
    ancient: 0.91,
    relic: 0.92,
    saga: 0.93,
    legend: 0.94,
    epic: 0.95,
    myth: 0.96,
    primordial: 0.97
};

const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
const units = stats.units;
const byId = new Map(units.map((unit) => [unit.id, unit]));
let changed = 0;

for (const unit of units) {
    if (!unit.id.endsWith('_don')) continue;

    const baseId = unit.id.slice(0, -'_don'.length);
    const base = byId.get(baseId);
    if (!base) throw new Error(`Missing base tower for ${unit.id}: ${baseId}`);

    const damageRatio = damageRatios[unit.tier];
    if (!damageRatio) throw new Error(`Missing gold tower damage ratio for tier: ${unit.tier}`);

    unit.damage = Math.round(base.damage * damageRatio);
    unit.attackSpeed = base.attackSpeed;
    unit.range = base.range;
    changed++;
}

if (changed !== 27) {
    throw new Error(`Expected 27 gold towers, found ${changed}`);
}

fs.writeFileSync(statsPath, `${JSON.stringify(stats, null, 2)}\n`, 'utf8');

let editor = fs.readFileSync(editorPath, 'utf8');
const unitLines = units.map((unit) =>
    `  {id:"${unit.id}", name:"${unit.name}", tier:"${unit.tier}", attackType:"${unit.attackType}", damage:${unit.damage}, attackSpeed:${unit.attackSpeed}, range:${unit.range}, skillId:${unit.skillId}, gradeScore:${unit.gradeScore}, gachaAvailable:${unit.gachaAvailable}}`
);
const replacement = `const DEFAULT_UNITS = [\n${unitLines.join(',\n')}\n];`;
const updatedEditor = editor.replace(/const DEFAULT_UNITS = \[[\s\S]*?\];(\r?\n)/, `${replacement}$1`);
if (updatedEditor === editor) {
    throw new Error('Could not locate DEFAULT_UNITS in data-editor.html');
}
fs.writeFileSync(editorPath, updatedEditor, 'utf8');

console.log(`Synchronized ${changed} gold towers with tier DPS ratios, 100% attack speed, and 100% range.`);
