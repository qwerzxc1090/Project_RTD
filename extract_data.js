const fs = require('fs');

const unitCode = fs.readFileSync('js/data/unitData.js', 'utf8');
const monsterCode = fs.readFileSync('js/data/monsterData.js', 'utf8');
const waveCode = fs.readFileSync('js/data/waveData.js', 'utf8');
const skillCode = fs.readFileSync('js/data/skillData.js', 'utf8');

const wrappedCode = `
    var window = { Game: {} };
    var localStorage = { getItem: function() { return null; } };
    
    (function() {
        ${unitCode}
    })();
    (function() {
        ${monsterCode}
    })();
    (function() {
        ${waveCode}
    })();
    (function() {
        ${skillCode}
    })();
    
    return window.Game;
`;

const Game = new Function(wrappedCode)();

const data = {
    units: Game.UnitData.units,
    monsters: Game.MonsterData.monsters,
    waves: Game.WaveData.waves,
    skills: Game.SkillData.skills
};

fs.mkdirSync('assets/data', { recursive: true });
fs.writeFileSync('assets/data/stats.json', JSON.stringify(data, null, 2));
console.log('JSON saved to assets/data/stats.json');
