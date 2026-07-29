const fs = require('fs');

let html = fs.readFileSync('tools/data-editor.html', 'utf8');
const d = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));

// Update units
html = html.replace(/const INITIAL_UNITS = \[([\s\S]*?)\];/, (match, p1) => {
    let lines = p1.split('\n');
    let newLines = lines.map(line => {
        let m2 = line.match(/id:"([^"]+)"/);
        if (m2) {
            let id = m2[1];
            let unit = d.units.find(u => u.id === id);
            if (unit) {
                line = line.replace(/damage:\d+/, 'damage:' + unit.damage);
            }
        }
        return line;
    });
    return 'const INITIAL_UNITS = [' + newLines.join('\n') + '];';
});

// Update monsters
html = html.replace(/const INITIAL_MONSTERS = \{([\s\S]*?)\};/, (match, p1) => {
    let lines = p1.split('\n');
    let newLines = lines.map(line => {
        let m2 = line.match(/"?(\d+)"?:\{/);
        if (m2) {
            let round = m2[1];
            let monster = d.monsters[round];
            if (monster) {
                line = line.replace(/hp:\d+/, 'hp:' + monster.hp);
            }
        }
        return line;
    });
    return 'const INITIAL_MONSTERS = {' + newLines.join('\n') + '};';
});

fs.writeFileSync('tools/data-editor.html', html);
console.log('Updated data-editor.html successfully.');
