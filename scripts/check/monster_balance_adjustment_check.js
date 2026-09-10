const assert = require('assert');
const stats = require('../../assets/data/stats.json');

const originalHp = [
  1380,1430,1482,1530,1578,1624,1670,12023,3422,4066,4696,5314,5921,
  6512,7094,39542,7403,8791,10152,11490,12802,14090,15352,100375,
  15537,17843,20108,22333,24519,26669,28782,236901,31173,33474,35736,
  37963,40152,42308,44428,369376,45025,44900,44823,46607,48362,50094,
  51799,472470,54606,56010,57414,646539
];
const originalBossGold = { 8:284.2, 16:413.9, 24:600.4, 32:762.3, 40:772.9, 48:772.4, 52:857.2 };

for (let round = 1; round <= 52; round++) {
  const wave = stats.waves.find(value => value.round === round);
  const monster = stats.monsters[String(wave.monsterId)];
  const factor = round <= 3 ? 0.94 : round === 4 ? 0.90 : round === 5 ? 0.88 :
    round <= 7 ? 0.92 : round === 8 ? 1 : 0.98;
  var expectedHp = Math.round(originalHp[round - 1] * factor);
  if (round >= 33) expectedHp = Math.round(expectedHp * (monster.isBoss ? 0.98 : 0.99));
  assert.equal(monster.hp, expectedHp, 'R' + round + ' HP');
  if (monster.isBoss) {
    assert.equal(monster.goldReward,
      Math.round(originalBossGold[round] * 1.10 * 10) / 10, 'R' + round + ' boss gold');
    assert.ok(Number.isInteger(monster.goldReward * 10), 'boss gold precision');
  }
}
console.log('PASS MONSTER_BALANCE (기존 조정 + R33~R52 일반 HP -1%, 보스 HP -2%)');
