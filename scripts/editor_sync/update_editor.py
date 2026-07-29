import re

with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add monsterData.js to scripts
content = content.replace('<script src="../js/data/skillData.js"></script>', '<script src="../js/data/skillData.js"></script>\n<script src="../js/data/monsterData.js"></script>')

# 2. Add Monster Tab
tab_bar_insertion = '''  <button class="tab-btn" onclick="switchTab('monster')">💀 몬스터 테이블</button>\n  <button class="tab-btn" onclick="switchTab('wave')">'''
content = content.replace('  <button class="tab-btn" onclick="switchTab(\'wave\')">', tab_bar_insertion)

# 3. Add Monster Content Panel
monster_panel = '''
<!-- Tab: Monster -->
<div class="tab-content" id="tab-monster">
  <div class="scroll-area">
    <div class="section">
      <div class="section-title">몬스터 테이블 (ID 1~50)</div>
      <div class="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th width="50">ID</th>
              <th width="120">이름</th>
              <th width="100">타입</th>
              <th width="80">보스여부</th>
              <th width="100">기본 HP</th>
              <th width="80">이속</th>
              <th width="80">골드보상</th>
            </tr>
          </thead>
          <tbody id="tbody-monster"></tbody>
        </table>
      </div>
    </div>
  </div>
</div>
'''
content = content.replace('<!-- Tab 4: Waves -->', monster_panel + '\n<!-- Tab 4: Waves -->')

# 4. Modify Wave Panel Table headers
wave_th_old = '''              <th width="90">타입</th>
              <th width="100">기본 HP</th>
              <th width="80">이속</th>
              <th width="60">마리수</th>
              <th width="60">골드</th>
              <th width="80">보스여부</th>'''
wave_th_new = '''              <th width="90">몬스터 ID</th>
              <th width="60">마리수</th>'''
content = content.replace(wave_th_old, wave_th_new)

# 5. Add renderMonster function
js_render_monster = '''
// ─── MONSTER RENDER ───
function renderMonster() {
    const tbody = document.getElementById('tbody-monster');
    tbody.innerHTML = '';
    const ids = Object.keys(Game.MonsterData.monsters).sort((a,b)=>a-b);
    
    ids.forEach(id => {
        const m = Game.MonsterData.monsters[id];
        const tr = document.createElement('tr');
        if (m.isBoss) tr.className = 'boss-row';
        
        tr.innerHTML = `
            <td>${m.id}</td>
            <td><input type="text" value="${m.name || ''}" data-id="${id}" data-field="name"></td>
            <td>
                <select data-id="${id}" data-field="type">
                    <option value="small" ${m.type==='small'?'selected':''}>소형</option>
                    <option value="large" ${m.type==='large'?'selected':''}>대형</option>
                    <option value="mixed" ${m.type==='mixed'?'selected':''}>혼합</option>
                    <option value="boss" ${m.type==='boss'?'selected':''}>보스</option>
                </select>
            </td>
            <td>
                <select data-id="${id}" data-field="isBoss">
                    <option value="false" ${!m.isBoss?'selected':''}>일반</option>
                    <option value="true" ${m.isBoss?'selected':''}>보스</option>
                </select>
            </td>
            <td><input type="number" value="${m.hp}" data-id="${id}" data-field="hp"></td>
            <td><input type="number" step="0.01" value="${m.speed}" data-id="${id}" data-field="speed"></td>
            <td><input type="number" value="${m.goldReward}" data-id="${id}" data-field="goldReward"></td>
        `;
        tbody.appendChild(tr);
    });
}
'''

content = content.replace('// ─── WAVE RENDER ───', js_render_monster + '\n// ─── WAVE RENDER ───')

# 6. Modify renderWave
wave_row_old = '''            <td>
                <select data-rd="${w.round}" data-field="monsterType">
                    <option value="small" ${w.monsterType==='small'?'selected':''}>소형</option>
                    <option value="large" ${w.monsterType==='large'?'selected':''}>대형</option>
                    <option value="mixed" ${w.monsterType==='mixed'?'selected':''}>혼합</option>
                    <option value="boss" ${w.monsterType==='boss'?'selected':''}>보스</option>
                </select>
            </td>
            <td><input type="number" value="${w.hp}" data-rd="${w.round}" data-field="hp"></td>
            <td><input type="number" step="0.01" value="${w.speed}" data-rd="${w.round}" data-field="speed"></td>
            <td><input type="number" value="${w.count}" data-rd="${w.round}" data-field="count"></td>
            <td><input type="number" value="${w.goldReward}" data-rd="${w.round}" data-field="goldReward"></td>
            <td>
                <select data-rd="${w.round}" data-field="isBoss">
                    <option value="false" ${!w.isBoss?'selected':''}>일반</option>
                    <option value="true" ${w.isBoss?'selected':''}>보스</option>
                </select>
            </td>'''
wave_row_new = '''            <td><input type="number" value="${w.monsterId}" data-rd="${w.round}" data-field="monsterId"></td>
            <td><input type="number" value="${w.count}" data-rd="${w.round}" data-field="count"></td>'''
content = content.replace(wave_row_old, wave_row_new)
content = content.replace("if (w.isBoss) tr.className = 'boss-row';", "const m = Game.MonsterData.monsters[w.monsterId]; if (m && m.isBoss) tr.className = 'boss-row';")

# 7. Modify collectMonster
js_collect_monster = '''
function collectMonster() {
    const data = {};
    const rows = document.querySelectorAll('#tbody-monster tr');
    rows.forEach(tr => {
        const id = tr.querySelector('input[data-field="name"]').getAttribute('data-id');
        data[id] = {
            id: parseInt(id),
            name: tr.querySelector('[data-field="name"]').value,
            type: tr.querySelector('[data-field="type"]').value,
            isBoss: tr.querySelector('[data-field="isBoss"]').value === 'true',
            hp: parseInt(tr.querySelector('[data-field="hp"]').value)||0,
            speed: parseFloat(tr.querySelector('[data-field="speed"]').value)||0,
            goldReward: parseInt(tr.querySelector('[data-field="goldReward"]').value)||0
        };
    });
    return data;
}
'''
content = content.replace('function collectWave() {', js_collect_monster + '\nfunction collectWave() {')

# 8. Modify collectWave
content = content.replace('''            monsterType: tr.querySelector('[data-field="monsterType"]').value,
            hp: parseInt(tr.querySelector('[data-field="hp"]').value)||0,
            speed: parseFloat(tr.querySelector('[data-field="speed"]').value)||0,
            count: parseInt(tr.querySelector('[data-field="count"]').value)||0,
            goldReward: parseInt(tr.querySelector('[data-field="goldReward"]').value)||0,
            isBoss: tr.querySelector('[data-field="isBoss"]').value === 'true',''', '''            monsterId: parseInt(tr.querySelector('[data-field="monsterId"]').value)||1,
            count: parseInt(tr.querySelector('[data-field="count"]').value)||0,''')

# 9. Modify saveData
content = content.replace("localStorage.setItem('rtd_waveData', JSON.stringify(collectWave()));", "localStorage.setItem('rtd_monsterData', JSON.stringify(collectMonster()));\n    localStorage.setItem('rtd_waveData', JSON.stringify(collectWave()));")

# 10. Modify resetData
content = content.replace("localStorage.removeItem('rtd_waveData');", "localStorage.removeItem('rtd_monsterData');\n    localStorage.removeItem('rtd_waveData');")

# 11. Add to DOMContentLoaded
content = content.replace('renderWave();', 'renderMonster();\n    renderWave();')

# 12. Modify saveToFiles
content = content.replace("const waveData = collectWave();", "const monsterData = collectMonster();\n        const waveData = collectWave();")

content = content.replace("const wavePath = 'js/data/waveData.js';", "const monsterPath = 'js/data/monsterData.js';\n            const wavePath = 'js/data/waveData.js';")

monster_save_logic = '''
            // 3. Monster Data
            let mContent = "var Game = window.Game || {};\\n\\n(function() {\\n    var DEFAULT_MONSTERS = [\\n";
            Object.values(monsterData).forEach(m => {
                mContent += `        { id: ${m.id}, name: '${m.name}', type: '${m.type}', hp: ${m.hp}, speed: ${m.speed}, goldReward: ${m.goldReward}, isBoss: ${m.isBoss} },\\n`;
            });
            mContent += "    ];\\n\\n    Game.MonsterData = {\\n        monsters: {},\\n        init: function() {\\n            for (var i = 0; i < DEFAULT_MONSTERS.length; i++) {\\n                var m = DEFAULT_MONSTERS[i];\\n                this.monsters[m.id] = m;\\n            }\\n        },\\n        getMonster: function(id) {\\n            return this.monsters[id];\\n        }\\n    };\\n\\n    Game.MonsterData.init();\\n\\n    // localStorage 오버라이드\\n    try {\\n        var raw = localStorage.getItem('rtd_monsterData');\\n        if (raw) {\\n            var saved = JSON.parse(raw);\\n            for (var id in saved) {\\n                if (Game.MonsterData.monsters[id]) {\\n                    Object.assign(Game.MonsterData.monsters[id], saved[id]);\\n                }\\n            }\\n        }\\n    } catch(e) {}\\n})();\\n";
            
            const mh = await dirHandle.getFileHandle(monsterPath.split('/').pop(), { create: false });
            const mw = await mh.createWritable();
            await mw.write(mContent);
            await mw.close();
'''
content = content.replace("// 3. Wave Data", monster_save_logic + "\n            // 4. Wave Data")

wave_save_replacement = '''let wContent = "var Game = window.Game || {};\\n\\n(function() {\\n    var DEFAULT_WAVES = [\\n";
            Object.values(waveData).forEach(w => {
                wContent += `        { round: ${w.round}, monsterId: ${w.monsterId}, count: ${w.count}, timeLimit: ${w.timeLimit}, timeAttack: ${w.timeAttack} },\\n`;
            });'''
old_wave_save_logic = '''let wContent = "var Game = window.Game || {};\\n\\n(function() {\\n    var DEFAULT_WAVES = [\\n";
            Object.values(waveData).forEach(w => {
                wContent += `        { round: ${w.round}, monsterType: '${w.monsterType}', count: ${w.count}, hp: ${w.hp}, speed: ${w.speed}, goldReward: ${w.goldReward}, isBoss: ${w.isBoss}, timeLimit: ${w.timeLimit}, timeAttack: ${w.timeAttack} },\\n`;
            });'''
content = content.replace(old_wave_save_logic, wave_save_replacement)


with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(content)
