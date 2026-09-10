/**
 * 초중반 필드 몬스터 점유 모델.
 *
 * 가정:
 * - 베이스 타워 3종만 사용
 * - 서사 이상을 제외한 저운 시나리오(일반~유물 확률 재정규화)
 * - 골드 100마다 즉시 추가 뽑기
 * - 사거리/이동에 따른 평균 전투 가동률은 utilization 인자로 반영
 * - 가장 진행도가 높은 몬스터부터 공격
 */
const fs = require('fs');
const vm = require('vm');

const stats = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/config.js', 'utf8'), context);
const config = context.window.Game.Config;

const simulations = Number(process.argv[2] || 5000);
const initialGold = Number(process.argv[3] || config.INITIAL_GOLD);
const utilization = Number(process.argv[4] || 0.55);
const maxRound = Number(process.argv[5] || 30);
const normalSpawnIntervalMultiplier = Number(config.NORMAL_SPAWN_INTERVAL_MULTIPLIER || 1);
const earlyHpScale = Number(process.argv[6] || 1);
const midHpScale = Number(process.argv[7] || 1);
const midEndHpScale = Number(process.argv[8] || midHpScale);
const bossHpScales = String(process.argv[9] || '')
  .split(',')
  .filter(Boolean)
  .map(Number);
const allowedTiers = ['normal', 'rare', 'ancient', 'relic'];
const baseUnits = stats.units.filter(unit => !unit.id.includes('_') && allowedTiers.includes(unit.tier));
const tierWeightTotal = allowedTiers.reduce((sum, tier) => sum + config.GACHA_RATES[tier], 0);

function createRng(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function rollLowLuckBaseTower(random) {
  let roll = random() * tierWeightTotal;
  let tier = allowedTiers[0];
  for (const candidate of allowedTiers) {
    roll -= config.GACHA_RATES[candidate];
    if (roll < 0) {
      tier = candidate;
      break;
    }
  }
  const pool = baseUnits.filter(unit => unit.tier === tier);
  return pool[Math.floor(random() * pool.length)];
}

function effectiveness(unit, monsterType) {
  const table = monsterType.startsWith('boss_')
    ? config.BOSS_EFFECTIVENESS
    : config.TYPE_EFFECTIVENESS;
  return table[unit.attackType][monsterType];
}

function simulate(seed) {
  const random = createRng(seed);
  const dpsByType = {};
  const active = [];
  const killsByRound = {};
  let gold = initialGold;
  let pulls = 0;
  let time = 0;
  let fieldIntegral = 0;
  let maxField = 0;
  let wave = null;
  let monster = null;
  let spawned = 0;
  let nextSpawnAt = Infinity;
  let nextWaveAt = 0;
  let deadline = Infinity;
  let completedRound = 0;
  let integralAt15 = null;
  let timeAt15 = null;
  let fieldAt15 = null;
  let fieldAt30 = null;
  let failed = false;

  function addTower() {
    const unit = rollLowLuckBaseTower(random);
    pulls++;
    const rawDps = unit.damage * 1000 / unit.attackSpeed;
    const critMultiplier = 1 + (unit.criticalRate || 0) / 10000 * config.CRITICAL_DAMAGE_RATIO;
    for (const type of ['small', 'large', 'general', 'boss_normal', 'boss_large', 'boss_small']) {
      dpsByType[type] = (dpsByType[type] || 0) + rawDps * effectiveness(unit, type) * critMultiplier;
    }
  }

  function spendGold() {
    while (gold >= config.GACHA_COST) {
      gold -= config.GACHA_COST;
      addTower();
    }
  }

  function scheduleNextWave() {
    if (completedRound >= maxRound) {
      nextWaveAt = Infinity;
      return;
    }
    const currentBoss = monster && monster.isBoss;
    const next = stats.waves.find(item => item.round === completedRound + 1);
    const nextMonster = next && stats.monsters[String(next.monsterId)];
    const nextBoss = nextMonster && nextMonster.isBoss;
    const delay = currentBoss
      ? config.BETWEEN_ROUND_DELAY_BOSS_END
      : nextBoss
        ? config.BETWEEN_ROUND_DELAY_BOSS_START
        : config.BETWEEN_ROUND_DELAY;
    nextWaveAt = time + delay / 1000;
  }

  function completeWave() {
    gold += wave.clearGoldBonus || 0;
    spendGold();
    completedRound = wave.round;
    if (completedRound === 15) {
      integralAt15 = fieldIntegral;
      timeAt15 = time;
      fieldAt15 = active.length;
    }
    if (completedRound === 30) fieldAt30 = active.length;
    nextSpawnAt = Infinity;
    deadline = Infinity;
    scheduleNextWave();
  }

  spendGold();

  while (!failed && completedRound < maxRound && time < 20000) {
    const head = active[0];
    const headDps = head ? (dpsByType[head.type] || 0) * utilization : 0;
    const deathAt = head && headDps > 0 ? time + head.hp / headDps : Infinity;
    const eventAt = Math.min(nextWaveAt, nextSpawnAt, deathAt, deadline);
    if (!Number.isFinite(eventAt)) break;

    const elapsed = Math.max(0, eventAt - time);
    fieldIntegral += active.length * elapsed;
    if (head && headDps > 0) head.hp = Math.max(0, head.hp - headDps * elapsed);
    time = eventAt;

    if (deadline === eventAt) {
      failed = true;
      break;
    }

    if (nextWaveAt === eventAt) {
      wave = stats.waves.find(item => item.round === completedRound + 1);
      monster = stats.monsters[String(wave.monsterId)];
      const spawnInterval = monster.isBoss
        ? wave.spawnInterval
        : wave.spawnInterval * normalSpawnIntervalMultiplier;
      spawned = 0;
      killsByRound[wave.round] = 0;
      nextWaveAt = Infinity;
      nextSpawnAt = time + spawnInterval / 1000;
      wave = { ...wave, _effectiveSpawnInterval: spawnInterval };
      deadline = wave.timeAttack && wave.timeLimit > 0 ? time + wave.timeLimit : Infinity;
      continue;
    }

    if (nextSpawnAt === eventAt) {
      const hpScale = wave.round <= 15
        ? earlyHpScale
        : wave.round <= 30
          ? midHpScale + (midEndHpScale - midHpScale) * ((wave.round - 16) / 14)
          : 1;
      const bossIndex = monster.isBoss
        ? stats.waves.filter(item => item.round <= wave.round && stats.monsters[String(item.monsterId)].isBoss).length - 1
        : -1;
      const bossHpScale = bossIndex >= 0 && Number.isFinite(bossHpScales[bossIndex])
        ? bossHpScales[bossIndex]
        : 1;
      active.push({
        round: wave.round,
        type: monster.type,
        hp: monster.hp * hpScale * bossHpScale,
        gold: monster.goldReward
      });
      spawned++;
      maxField = Math.max(maxField, active.length);
      if (active.length >= config.MAX_MONSTERS) {
        failed = true;
        break;
      }
      if (spawned >= wave.count) {
        nextSpawnAt = Infinity;
        if (!wave.timeAttack) completeWave();
      } else {
        nextSpawnAt = time + wave._effectiveSpawnInterval / 1000;
      }
      continue;
    }

    if (deathAt === eventAt) {
      const killed = active.shift();
      gold += killed.gold;
      spendGold();
      killsByRound[killed.round] = (killsByRound[killed.round] || 0) + 1;
      if (wave && wave.timeAttack && killed.round === wave.round &&
          spawned >= wave.count && killsByRound[wave.round] >= wave.count) {
        completeWave();
      }
    }
  }

  return {
    failed,
    completedRound,
    pulls,
    maxField,
    fieldAt15,
    fieldAt30,
    avgTo15: timeAt15 ? integralAt15 / timeAt15 : null,
    avgTo30: completedRound >= 30 ? fieldIntegral / time : null
  };
}

const results = [];
for (let i = 0; i < simulations; i++) results.push(simulate(0x9e3779b9 + i * 97));
const bossRounds = stats.waves
  .filter(wave => wave.round <= maxRound && stats.monsters[String(wave.monsterId)].isBoss)
  .map(wave => wave.round);

function summarize(key) {
  const values = results.map(result => result[key]).filter(Number.isFinite).sort((a, b) => a - b);
  if (!values.length) return null;
  const at = ratio => values[Math.min(values.length - 1, Math.floor(values.length * ratio))];
  return {
    samples: values.length,
    mean: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)),
    p10: Number(at(0.10).toFixed(2)),
    p50: Number(at(0.50).toFixed(2)),
    p90: Number(at(0.90).toFixed(2))
  };
}

console.log(JSON.stringify({
  assumptions: { simulations, initialGold, utilization, maxRound, earlyHpScale, midHpScale, midEndHpScale, bossHpScales, allowedTiers },
  survivalToMaxRoundPct: Number((results.filter(result => result.completedRound >= maxRound).length / simulations * 100).toFixed(2)),
  survivalByBossRoundPct: Object.fromEntries(bossRounds.map(round => [
    `R${round}`,
    Number((results.filter(result => result.completedRound >= round).length / simulations * 100).toFixed(2))
  ])),
  survivalTo15Pct: Number((results.filter(result => result.completedRound >= 15).length / simulations * 100).toFixed(2)),
  survivalTo30Pct: Number((results.filter(result => result.completedRound >= 30).length / simulations * 100).toFixed(2)),
  avgFieldTo15: summarize('avgTo15'),
  avgFieldTo30: summarize('avgTo30'),
  fieldAt15: summarize('fieldAt15'),
  fieldAt30: summarize('fieldAt30'),
  maxField: summarize('maxField'),
  pulls: summarize('pulls')
}, null, 2));
