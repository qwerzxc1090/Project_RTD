const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');
const statsPath = path.join(projectRoot, 'assets', 'data', 'stats.json');
const tierOrder = ['normal', 'rare', 'ancient', 'relic', 'saga', 'legend', 'epic', 'myth', 'primordial'];
const minRatio = 0.05;
const maxRatio = 0.08;

const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
const byId = new Map(stats.units.map((unit) => [unit.id, unit]));
let changed = 0;

for (const unit of stats.units) {
    if (!unit.id.endsWith('_dok')) continue;

    const base = byId.get(unit.id.slice(0, -'_dok'.length));
    if (!base) throw new Error(`Missing base tower for ${unit.id}`);
    const tierIndex = tierOrder.indexOf(unit.tier);
    if (tierIndex < 0) throw new Error(`Unknown tier for ${unit.id}: ${unit.tier}`);

    const targetRatio = minRatio + (maxRatio - minRatio) * tierIndex / (tierOrder.length - 1);
    const baseDps = Number(base.damage) * 1000 / Number(base.attackSpeed);
    unit.damage = Math.round(baseDps * targetRatio * Number(unit.attackSpeed) / 1000);
    changed++;
}

if (changed !== 27) throw new Error(`Expected 27 poison towers, found ${changed}`);
fs.writeFileSync(statsPath, `${JSON.stringify(stats, null, 2)}\n`, 'utf8');
console.log(`Synchronized ${changed} poison towers from 5% to 8% target DPS without changing range or attack speed.`);
