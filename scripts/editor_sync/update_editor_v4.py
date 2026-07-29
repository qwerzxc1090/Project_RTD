import re
import json

with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add tab content
target_tab_html = '<!-- Tab 4: Stages -->\n<div class="tab-content" id="tab-stage">'
new_tab_html = '''<!-- Tab: Monster -->
<div class="tab-content" id="tab-monster">
  <div class="scroll-area" id="monsterArea"></div>
</div>

<!-- Tab 4: Stages -->
<div class="tab-content" id="tab-stage">'''
text = text.replace(target_tab_html, new_tab_html)

# 2. Add to TABS array
text = text.replace("{id:'stage',  label:'📋 스테이지'}", "{id:'monster', label:'💀 몬스터 테이블'},\n  {id:'stage',  label:'📋 스테이지'}")

# 3. Add to LS_KEYS
text = text.replace("stage: 'rtd_waveData'", "monster: 'rtd_monsterData',\n  stage: 'rtd_waveData'")

# 4. Generate DEFAULT_MONSTERS and DEFAULT_WAVES
with open('js/data/monsterData.js', 'r', encoding='utf-8') as f:
    mon_js = f.read()
mon_match = re.search(r'var DEFAULT_MONSTERS = (\[.*?\]);', mon_js, re.DOTALL)
default_monsters = mon_match.group(1) if mon_match else '[]'

with open('js/data/waveData.js', 'r', encoding='utf-8') as f:
    wave_js = f.read()
wave_match = re.search(r'var DEFAULT_WAVES = (\[.*?\]);', wave_js, re.DOTALL)
default_waves = wave_match.group(1) if wave_match else '[]'

# Remove old DEFAULT_WAVES and insert both
old_waves_match = re.search(r'const DEFAULT_WAVES = \[.*?\];', text, re.DOTALL)
if old_waves_match:
    text = text.replace(old_waves_match.group(0), f'const DEFAULT_MONSTERS = {default_monsters};\n\nconst DEFAULT_WAVES = {default_waves};')

# 5. Add to getCollector, getDefaults, getRenderer
text = text.replace("case 'stage':  return { collect: collectStage,  key: LS_KEYS.stage };", "case 'monster': return { collect: collectMonster, key: LS_KEYS.monster };\n    case 'stage':  return { collect: collectStage,  key: LS_KEYS.stage };")
text = text.replace("case 'stage':  return DEFAULT_WAVES;", "case 'monster': return DEFAULT_MONSTERS;\n    case 'stage':  return DEFAULT_WAVES;")
text = text.replace("case 'stage':  return renderStage;", "case 'monster': return renderMonster;\n    case 'stage':  return renderStage;")

# 6. Add renderMonster and collectMonster
monster_functions = '''
function renderMonster(){
  const monsters = loadLS(LS_KEYS.monster, DEFAULT_MONSTERS);
  const area = document.getElementById('monsterArea');
  let html = '<div class="section"><div class="section-title">💀 몬스터 테이블 (ID 1~50)</div>';
  html += '<div class="tbl-wrap"><table id="monsterTable"><thead><tr>';
  html += '<th>ID</th><th>이름</th><th>타입</th><th>보스여부</th><th>기본HP</th><th>속도</th><th>골드보상</th>';
  html += '</tr></thead><tbody>';

  monsters.forEach((m, i) => {
    html += `<tr class="${m.isBoss?'boss-row':''}" data-idx="${i}">
      <td><input type="number" value="${m.id}" data-field="id" readonly style="width:50px"></td>
      <td><input type="text" value="${m.name}" data-field="name" style="width:100px"></td>
      <td><select data-field="type">${MONSTER_TYPES.map(t=>`<option value="${t}"${t===m.type?' selected':''}>${t}</option>`).join('')}</select></td>
      <td><input type="checkbox" data-field="isBoss" ${m.isBoss?'checked':''} style="width:auto"></td>
      <td><input type="number" value="${m.hp}" data-field="hp" style="width:80px"></td>
      <td><input type="number" step="0.01" value="${m.speed}" data-field="speed" style="width:70px"></td>
      <td><input type="number" value="${m.goldReward}" data-field="goldReward" style="width:70px"></td>
    </tr>`;
  });

  html += '</tbody></table></div></div>';
  area.innerHTML = html;

  const table = document.getElementById('monsterTable');
  table.addEventListener('change', e => {
    const tr = e.target.closest('tr');
    if(!tr) return;
    const field = e.target.dataset.field;
    if(field === 'isBoss'){
      tr.classList.toggle('boss-row', e.target.checked);
    }
  });
}

function collectMonster(){
  const rows = document.querySelectorAll('#monsterTable tbody tr');
  return Array.from(rows).map(tr => ({
    id: parseInt(tr.querySelector('[data-field="id"]').value) || 0,
    name: tr.querySelector('[data-field="name"]').value,
    type: tr.querySelector('[data-field="type"]').value,
    hp: parseInt(tr.querySelector('[data-field="hp"]').value) || 0,
    speed: parseFloat(tr.querySelector('[data-field="speed"]').value) || 0,
    goldReward: parseInt(tr.querySelector('[data-field="goldReward"]').value) || 0,
    isBoss: tr.querySelector('[data-field="isBoss"]').checked
  }));
}
'''

text = text.replace('function renderStage(){', monster_functions + '\nfunction renderStage(){')

# 7. Update renderStage and collectStage
old_renderStage_inner = '''  waves.forEach((w, i) => {
    const isBoss = w.isBoss || BOSS_ROUNDS.includes(w.round);
    const realHP = Math.round(w.hp * (1 + w.round * 0.1));
    const timeAttack = w.timeAttack !== undefined ? w.timeAttack : (w.timeLimit > 0 && isBoss);
    html += `<tr class="${isBoss?'boss-row':''}" data-idx="${i}">
      <td><input type="number" value="${w.round}" data-field="round" readonly style="width:50px"></td>
      <td><select data-field="monsterType">${MONSTER_TYPES.map(m=>`<option value="${m}"${m===w.monsterType?' selected':''}>${m}</option>`).join('')}</select></td>
      <td><input type="number" value="${w.count}" data-field="count" style="width:60px"></td>
      <td><input type="number" value="${w.hp}" data-field="hp" style="width:80px"></td>
      <td><span class="calc" id="rhp-${i}">${realHP.toLocaleString()}</span></td>
      <td><input type="number" step="0.1" value="${w.speed}" data-field="speed" style="width:70px"></td>
      <td><input type="number" value="${w.goldReward}" data-field="goldReward" style="width:70px"></td>
      <td><input type="checkbox" data-field="isBoss" ${isBoss?'checked':''} style="width:auto"></td>
      <td><input type="number" value="${w.timeLimit||0}" data-field="timeLimit" style="width:70px" min="0"></td>
      <td><input type="checkbox" data-field="timeAttack" ${timeAttack?'checked':''} style="width:auto"></td>
    </tr>`;
  });'''
new_renderStage_inner = '''  const monsters = loadLS(LS_KEYS.monster, DEFAULT_MONSTERS);
  waves.forEach((w, i) => {
    const m = monsters.find(x => x.id === w.monsterId) || monsters[0];
    const isBoss = m ? m.isBoss : false;
    const timeAttack = w.timeAttack !== undefined ? w.timeAttack : (w.timeLimit > 0 && isBoss);
    html += `<tr class="${isBoss?'boss-row':''}" data-idx="${i}">
      <td><input type="number" value="${w.round}" data-field="round" readonly style="width:50px"></td>
      <td><input type="number" value="${w.monsterId}" data-field="monsterId" style="width:70px"></td>
      <td><input type="number" value="${w.count}" data-field="count" style="width:60px"></td>
      <td><input type="number" value="${w.timeLimit||0}" data-field="timeLimit" style="width:70px" min="0"></td>
      <td><input type="checkbox" data-field="timeAttack" ${timeAttack?'checked':''} style="width:auto"></td>
    </tr>`;
  });'''
text = text.replace(old_renderStage_inner, new_renderStage_inner)

text = text.replace("html += '<th>라운드</th><th>몬스터 타입</th><th>수량</th><th>기본HP</th><th>실제HP</th><th>속도</th><th>골드</th><th>보스</th><th>⏱제한시간(초)</th><th>⚔️타임어택</th>';", "html += '<th>라운드</th><th>몬스터 ID</th><th>수량</th><th>⏱제한시간(초)</th><th>⚔️타임어택</th>';")

old_collectStage = '''    monsterType: tr.querySelector('[data-field="monsterType"]').value,
    count: parseInt(tr.querySelector('[data-field="count"]').value) || 0,
    hp: parseInt(tr.querySelector('[data-field="hp"]').value) || 0,
    speed: parseFloat(tr.querySelector('[data-field="speed"]').value) || 0,
    goldReward: parseInt(tr.querySelector('[data-field="goldReward"]').value) || 0,
    isBoss: tr.querySelector('[data-field="isBoss"]').checked,
    timeLimit: parseInt(tr.querySelector('[data-field="timeLimit"]').value) || 0,
    timeAttack: tr.querySelector('[data-field="timeAttack"]').checked'''
new_collectStage = '''    monsterId: parseInt(tr.querySelector('[data-field="monsterId"]').value) || 1,
    count: parseInt(tr.querySelector('[data-field="count"]').value) || 0,
    timeLimit: parseInt(tr.querySelector('[data-field="timeLimit"]').value) || 0,
    timeAttack: tr.querySelector('[data-field="timeAttack"]').checked'''
text = text.replace(old_collectStage, new_collectStage)

old_updateStageRow = '''  const round = parseFloat(tr.querySelector('[data-field="round"]').value) || 0;
  const hp = parseFloat(tr.querySelector('[data-field="hp"]').value) || 0;
  const realHP = Math.round(hp * (1 + round * 0.1));
  document.getElementById('rhp-'+idx).textContent = realHP.toLocaleString();'''
text = text.replace(old_updateStageRow, '')

# 8. Update applyToCode
monster_apply = '''    else if (activeTab === 'monster') {
       const fileHandle = await dataDirHandle.getFileHandle('monsterData.js');
       const file = await fileHandle.getFile();
       let text = await file.text();
       
       const newData = getCollector('monster').collect();
       let mContent = "var Game = window.Game || {};\\n\\n(function() {\\n    var DEFAULT_MONSTERS = [\\n";
       newData.forEach(m => {
           mContent += `        { id: ${m.id}, name: '${m.name}', type: '${m.type}', hp: ${m.hp}, speed: ${m.speed}, goldReward: ${m.goldReward}, isBoss: ${m.isBoss} },\\n`;
       });
       mContent += "    ];\\n\\n    Game.MonsterData = {\\n        monsters: {},\\n        init: function() {\\n            for (var i = 0; i < DEFAULT_MONSTERS.length; i++) {\\n                var m = DEFAULT_MONSTERS[i];\\n                this.monsters[m.id] = m;\\n            }\\n        },\\n        getMonster: function(id) {\\n            return this.monsters[id];\\n        }\\n    };\\n\\n    Game.MonsterData.init();\\n\\n    // localStorage 오버라이드\\n    try {\\n        var raw = localStorage.getItem('rtd_monsterData');\\n        if (raw) {\\n            var saved = JSON.parse(raw);\\n            for (var id in saved) {\\n                if (Game.MonsterData.monsters[id]) {\\n                    Object.assign(Game.MonsterData.monsters[id], saved[id]);\\n                }\\n            }\\n        }\\n    } catch(e) {}\\n})();\\n";
       
       const writable = await fileHandle.createWritable();
       await writable.write(mContent);
       await writable.close();
       showStatus('✅ monsterData.js 파일에 영구 적용 완료!', true);
    }'''

text = text.replace("if (activeTab === 'stage') {", monster_apply + "\n    else if (activeTab === 'stage') {")

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(text)
