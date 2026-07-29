/**
 * data-editor.html의 DEFAULT_ 값들을 stats.json + config.js 실제값으로 동기화
 */
const fs = require('fs');

const stats = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));
let html = fs.readFileSync('tools/data-editor.html', 'utf8');

// ─────────────────────────────────────────────
// 1. DEFAULT_CONFIG
// ─────────────────────────────────────────────
const newConfig = `const DEFAULT_CONFIG = {
  INITIAL_GOLD: 500,
  GACHA_COST: 50,
  ROUND_BONUS_MULTIPLIER: 4.0,
  INITIAL_LIVES: 50,
  MAX_MONSTERS: 50,
  TOTAL_ROUNDS: 50,
  SPAWN_INTERVAL: 1600,
  GACHA_RATES: {
    normal: 0.5000, rare: 0.3310, ancient: 0.1020, relic: 0.0510,
    saga: 0.0080, legend: 0.0050, epic: 0.0020, myth: 0.0008, primordial: 0.00019
  },
  TYPE_AFFINITY: {
    normal:    { small: 1.00, mixed: 1.00, large: 1.00 },
    vibration: { small: 1.00, mixed: 0.50, large: 0.25 },
    explosive: { small: 0.50, mixed: 0.75, large: 1.00 }
  }
};`;

html = html.replace(/const DEFAULT_CONFIG = \{[\s\S]*?\};(\r?\n)/, newConfig + '$1');

// ─────────────────────────────────────────────
// 2. DEFAULT_UNITS (stats.json → units 배열)
// ─────────────────────────────────────────────
const unitLines = Object.values(stats.units).map(u => {
  const ga = u.gachaAvailable;
  return `  {id:"${u.id}", name:"${u.name}", tier:"${u.tier}", attackType:"${u.attackType}", damage:${u.damage}, attackSpeed:${u.attackSpeed}, range:${u.range}, skillId:${u.skillId}, gradeScore:${u.gradeScore}, gachaAvailable:${ga}}`;
});

const newUnits = `const DEFAULT_UNITS = [\n${unitLines.join(',\n')}\n];`;

html = html.replace(/const DEFAULT_UNITS = \[[\s\S]*?\];(\r?\n)/, newUnits + '$1');

// ─────────────────────────────────────────────
// 3. DEFAULT_SKILLS (stats.json → skills 객체)
// ─────────────────────────────────────────────
const skillEntries = Object.entries(stats.skills).map(([k, s]) => {
  let line = `  "${k}":{id:${s.id},name:"${s.name}",nameEn:"${s.nameEn}",desc:"${s.desc}",projectileSpeed:${s.projectileSpeed},displaySize:${s.displaySize},fallbackShape:"${s.fallbackShape}"`;
  if (s.fallbackColor) line += `,fallbackColor:"${s.fallbackColor}"`;
  if (s.imagePath) line += `,imagePath:"${s.imagePath}"`;
  if (s.bounceCount !== undefined) line += `,bounceCount:${s.bounceCount},bounceRange:${s.bounceRange},bounceDamageMultiplier:${s.bounceDamageMultiplier}`;
  line += '}';
  return line;
});

const newSkills = `const DEFAULT_SKILLS = {\n${skillEntries.join(',\n')}\n};`;

html = html.replace(/const DEFAULT_SKILLS = \{[\s\S]*?\};(\r?\n)/, newSkills + '$1');

// ─────────────────────────────────────────────
// 4. DEFAULT_MONSTERS (stats.json → monsters 배열)
// ─────────────────────────────────────────────
const monsterLines = Object.values(stats.monsters).map(m => {
  const img = m.imagePath || '';
  return `    { id: ${String(m.id).padStart(2)}, name: '${m.name}', type: '${m.type}', hp: ${m.hp}, speed: ${m.speed}, goldReward: ${m.goldReward}, isBoss: ${m.isBoss}, imagePath: '${img}' }`;
});

const newMonsters = `const DEFAULT_MONSTERS = [\n${monsterLines.join(',\n')}\n    ];`;

html = html.replace(/const DEFAULT_MONSTERS = \[[\s\S]*?\];(\r?\n)/, newMonsters + '$1');

// ─────────────────────────────────────────────
// 5. DEFAULT_WAVES (stats.json → waves 배열)
// ─────────────────────────────────────────────
const waveLines = stats.waves.map(w => {
  return `        { round: ${w.round}, monsterId: ${w.monsterId}, count: ${w.count}, timeLimit: ${w.timeLimit}, timeAttack: ${w.timeAttack} }`;
});

const newWaves = `const DEFAULT_WAVES = [\n${waveLines.join(',\n')}\n    ];`;

html = html.replace(/const DEFAULT_WAVES = \[[\s\S]*?\];(\r?\n)/, newWaves + '$1');

// ─────────────────────────────────────────────
fs.writeFileSync('tools/data-editor.html', html);
console.log('✅ data-editor.html 동기화 완료');
console.log('  - DEFAULT_CONFIG: config.js 기준값');
console.log('  - DEFAULT_UNITS:', Object.keys(stats.units).length, '개');
console.log('  - DEFAULT_SKILLS:', Object.keys(stats.skills).length, '개');
console.log('  - DEFAULT_MONSTERS:', Object.keys(stats.monsters).length, '개');
console.log('  - DEFAULT_WAVES:', stats.waves.length, '개');
