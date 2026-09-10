const fs = require('fs');

const statsPath = 'assets/data/stats.json';
const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));

let baseEnabled = 0;
let derivedDisabled = 0;

for (const unit of stats.units) {
  const isBaseTower = !unit.id.includes('_');
  unit.gachaAvailable = isBaseTower;
  if (isBaseTower) baseEnabled++;
  else derivedDisabled++;
}

fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2) + '\n', 'utf8');

console.log(JSON.stringify({
  baseEnabled,
  derivedDisabled,
  total: stats.units.length
}, null, 2));
