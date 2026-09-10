const fs = require('fs');
const vm = require('vm');

const stats = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));
const context = {
  window: {},
  console,
  localStorage: {
    getItem() { return null; }
  }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/data/unitData.js', 'utf8'), context);
context.window.Game.UnitData.init(JSON.parse(JSON.stringify(stats.units)));

const tiers = ['normal', 'rare', 'ancient', 'relic', 'saga', 'legend', 'epic', 'myth', 'primordial'];
const pools = Object.fromEntries(tiers.map(tier => [tier, context.window.Game.UnitData.getGachaPool(tier)]));
const fullPool = context.window.Game.UnitData.getAllGachaUnits();

for (const tier of tiers) {
  if (pools[tier].length !== 12) throw new Error(`${tier} 뽑기 풀이 12종이 아닙니다.`);
  const suffixCounts = ['_yeon', '_dok', '_don'].map(suffix =>
    pools[tier].filter(unit => unit.id.endsWith(suffix)).length
  );
  if (suffixCounts.some(count => count !== 3)) {
    throw new Error(`${tier} 풀의 _연/_독/_돈 구성이 각각 3종이 아닙니다.`);
  }
}
if (fullPool.length !== 108) throw new Error(`전체 뽑기 풀이 108종이 아닙니다: ${fullPool.length}`);

const enabled = stats.units.filter(unit => unit.gachaAvailable);
const enabledDerived = enabled.filter(unit => unit.id.includes('_'));
if (enabled.length !== 108) {
  throw new Error('stats.json의 타워 108종이 모두 활성화되지 않았습니다.');
}
if (enabledDerived.length !== 81) throw new Error('파생 타워 81종이 모두 활성 상태가 아닙니다.');

console.log(JSON.stringify({
  enabledTotal: enabled.length,
  enabledDerived: enabledDerived.length,
  fullPool: fullPool.length,
  perTierCount: Object.fromEntries(tiers.map(tier => [tier, pools[tier].length]))
}, null, 2));
