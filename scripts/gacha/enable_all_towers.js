const fs = require('fs');

const statsPath = 'assets/data/stats.json';
const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));

let changed = 0;
for (const unit of stats.units) {
    if (unit.gachaAvailable !== true) changed++;
    unit.gachaAvailable = true;
}

fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2) + '\n', 'utf8');
console.log(`Enabled ${stats.units.length} towers for gacha (${changed} changed).`);
