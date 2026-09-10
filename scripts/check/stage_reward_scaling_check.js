const fs = require('fs');
const vm = require('vm');

const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/systems/WaveSystem.js', 'utf8'), context);
const source = fs.readFileSync('js/systems/WaveSystem.js', 'utf8');
if (!source.includes('1 + this.currentRound * 0.01')) throw new Error('스테이지 배율식이 없습니다.');
if (!source.includes('Math.floor(this.monsterData.hp * mult)')) throw new Error('HP 버림식이 없습니다.');
if (!source.includes('Math.round(this.monsterData.goldReward * mult * 10) / 10')) throw new Error('골드 소수점 1자리 식이 없습니다.');

const stats = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));
for (const round of [1, 8, 32, 50]) {
  const wave = stats.waves.find(item => item.round === round);
  const monster = stats.monsters[String(wave.monsterId)];
  const mult = 1 + round * 0.01;
  const hp = Math.floor(monster.hp * mult);
  const gold = Math.round(monster.goldReward * mult * 10) / 10;
  if (!Number.isInteger(hp)) throw new Error(`R${round} HP가 정수가 아닙니다.`);
  if (Math.round(gold * 10) !== gold * 10) throw new Error(`R${round} 골드가 1자리 정밀도가 아닙니다.`);
  console.log(`R${round}: x${mult.toFixed(2)} HP ${monster.hp}->${hp} GOLD ${monster.goldReward}->${gold} 화면 ${Math.floor(gold)}`);
}
