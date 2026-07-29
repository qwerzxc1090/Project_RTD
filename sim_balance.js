const fs = require('fs');

const statsPath = 'c:/Projects/Project_RTD/assets/data/stats.json';
const data = JSON.parse(fs.readFileSync(statsPath, 'utf8'));

const GACHA_RATES = [
    { tier: 'primordial', prob: 0.00019 },
    { tier: 'myth',       prob: 0.0008  },
    { tier: 'epic',       prob: 0.002   },
    { tier: 'legend',     prob: 0.005   },
    { tier: 'saga',       prob: 0.008   },
    { tier: 'relic',      prob: 0.051   },
    { tier: 'ancient',    prob: 0.102   },
    { tier: 'rare',       prob: 0.331   },
    { tier: 'normal',     prob: 0.50    }
];

function rollGacha() {
    let rand = Math.random();
    let cumulative = 0;
    for (let g of GACHA_RATES) {
        cumulative += g.prob;
        if (rand < cumulative) return g.tier;
    }
    return 'normal';
}

const towersByTier = {};
data.units.forEach(u => {
    if (!towersByTier[u.tier]) towersByTier[u.tier] = [];
    towersByTier[u.tier].push(u);
});

// Update damage for high tiers by +35% for simulation purposes
data.units.forEach(u => {
    if (['legend', 'epic', 'myth', 'primordial'].includes(u.tier)) {
        u.damage = Math.round(u.damage * 1.35);
    }
});

function calculateCoverageMultiplier(range) {
    if (range < 155) return 0.6;
    if (range < 205) return 0.8;
    if (range < 243) return 1.0;
    if (range < 280) return 1.2;
    if (range >= 280) return 1.5;
    return 1.0;
}

function simulateGame(hpScale) {
    let gold = 50;
    let towers = [];
    let dps = 0; // Total effective DPS
    
    for (let round = 1; round <= 50; round++) {
        let wave = data.waves[round - 1];
        let monster = data.monsters[round];
        
        let hp = Math.floor(monster.hp * hpScale);
        let timeLimit = wave.timeAttack ? 120 : 60; // Assuming 60s for normal waves to clear
        let totalHp = hp * wave.count;
        
        // Before round starts, roll as much as possible
        let rolls = Math.floor(gold / 10);
        gold -= rolls * 10;
        
        for (let i=0; i<rolls; i++) {
            let tier = rollGacha();
            let pool = towersByTier[tier];
            let unit = pool[Math.floor(Math.random() * pool.length)];
            towers.push(unit);
            
            let attacksPerSec = 1000 / unit.attackSpeed;
            let baseDps = unit.damage * attacksPerSec;
            // Adjust baseDps by range coverage mapping
            let effDps = baseDps * calculateCoverageMultiplier(unit.range);
            dps += effDps;
        }
        
        let totalDamage = dps * timeLimit;
        
        // If it's a boss round, time attack is strict.
        // For normal rounds, we assume if totalDamage < totalHp by a lot, we leak.
        // Let's assume a strict pass/fail. If totalDamage < totalHp, game over.
        if (totalDamage < totalHp) {
            return { win: false, round: round };
        }
        
        // Pass round, gain gold
        gold += monster.goldReward * wave.count;
    }
    
    return { win: true, round: 50 };
}

function runSimulations(hpScale, iterations=1000) {
    let wins = 0;
    for (let i=0; i<iterations; i++) {
        if (simulateGame(hpScale).win) wins++;
    }
    return wins / iterations;
}

// Binary search for the right hpScale
let low = 0.5;
let high = 5.0;
let bestScale = 1.0;

console.log("Finding optimal HP scale for 20-35% clear rate...");
for (let step = 0; step < 15; step++) {
    let mid = (low + high) / 2;
    let winRate = runSimulations(mid, 1000);
    console.log(`Scale ${mid.toFixed(3)} -> Win Rate: ${(winRate*100).toFixed(1)}%`);
    
    if (winRate > 0.35) {
        // Too easy, increase hpScale
        low = mid;
    } else if (winRate < 0.20) {
        // Too hard, decrease hpScale
        high = mid;
    } else {
        // Just right, but let's refine to get closer to 27.5%
        bestScale = mid;
        if (winRate > 0.275) low = mid;
        else high = mid;
    }
}

console.log(`\nOptimal HP Scale Factor: ${bestScale.toFixed(4)}`);
