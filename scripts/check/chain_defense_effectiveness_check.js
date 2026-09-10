const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const context = {
    window: {},
    Math: Object.create(Math)
};

context.window.Game = {
    Config: {
        CRITICAL_DAMAGE_RATIO: 0.5,
        TYPE_EFFECTIVENESS: {
            normal: { small: 1, general: 1, large: 1 },
            explosive: { small: 0.5, general: 0.75, large: 1 },
            vibration: { small: 1, general: 0.5, large: 0.25 }
        },
        BOSS_EFFECTIVENESS: {
            normal: { boss_normal: 1, boss_large: 1, boss_small: 1 },
            explosive: { boss_normal: 0.75, boss_large: 1, boss_small: 0.5 },
            vibration: { boss_normal: 0.5, boss_large: 0.25, boss_small: 1 }
        }
    },
    SkillData: {
        getSkill: function() { return { category: 'instant' }; }
    }
};

vm.createContext(context);
vm.runInContext(
    fs.readFileSync(path.join(root, 'js', 'systems', 'CombatSystem.js'), 'utf8'),
    context,
    { filename: 'CombatSystem.js' }
);

const combat = context.window.Game.CombatSystem;
let failures = 0;

function check(label, actual, expected) {
    if (actual !== expected) {
        failures++;
        console.error(`FAIL ${label}: expected ${expected}, received ${actual}`);
    } else {
        console.log(`PASS ${label}: ${actual}`);
    }
}

const explosive = { damage: 100, attackType: 'explosive', skillId: 4, criticalRate: 0 };
check('first target / general armor', combat.calculateScaledDamage(explosive, { monsterType: 'general' }, 1, false).damage, 75);
check('next target / small armor + chain decay', combat.calculateScaledDamage(explosive, { monsterType: 'small' }, 0.85, false).damage, 42);
check('next target / large armor + second decay', combat.calculateScaledDamage(explosive, { monsterType: 'large' }, 0.85 * 0.85, false).damage, 72);
check('boss-specific armor', combat.calculateScaledDamage(explosive, { monsterType: 'boss_small' }, 0.85, false).damage, 42);
check('legacy boss fallback', combat.calculateScaledDamage(explosive, { monsterType: 'boss' }, 0.85, false).damage, 85);
check('shared critical after armor and decay', combat.calculateScaledDamage(explosive, { monsterType: 'small' }, 0.85, true).damage, 63);

context.Math.random = function() { return 0; };
const firstCritical = combat.calculateDamage(
    { unitData: { damage: 100, attackType: 'vibration', skillId: 4, criticalRate: 10000 } },
    { monsterType: 'boss_large' }
);
check('first-hit critical flag', firstCritical.isCritical, true);
check('first-hit boss armor + critical', firstCritical.damage, 37);

if (failures > 0) process.exitCode = 1;
else console.log('Chain defense effectiveness checks passed.');
