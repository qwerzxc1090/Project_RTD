import re
import json

with open('js/data/waveData.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

monsters = []
out_wave_lines = []
monster_id = 1

for line in lines:
    if '{ round:' in line and 'monsterType:' in line:
        m_round = re.search(r'round:\s*(\d+)', line).group(1)
        m_type = re.search(r'monsterType:\s*\'([^\']+)\'', line).group(1)
        m_count = re.search(r'count:\s*(\d+)', line).group(1)
        m_hp = re.search(r'hp:\s*(\d+)', line).group(1)
        m_speed = re.search(r'speed:\s*([\d\.]+)', line).group(1)
        m_gold = re.search(r'goldReward:\s*(\d+)', line).group(1)
        m_boss = re.search(r'isBoss:\s*(true|false)', line).group(1)
        m_tlimit = re.search(r'timeLimit:\s*(\d+)', line).group(1)
        m_tattack = re.search(r'timeAttack:\s*(true|false)', line).group(1)
        
        name = f'보스 {m_round}R' if m_boss == 'true' else f'몬스터 {m_round}R'
        
        monsters.append(f"        {{ id: {monster_id}, name: '{name}', type: '{m_type}', hp: {m_hp}, speed: {m_speed}, goldReward: {m_gold}, isBoss: {m_boss} }}")
        
        new_wave_line = f"        {{ round: {m_round}, monsterId: {monster_id}, count: {m_count}, timeLimit: {m_tlimit}, timeAttack: {m_tattack} }},"
        
        # Preserve leading spaces
        leading_spaces = len(line) - len(line.lstrip())
        out_wave_lines.append(" " * leading_spaces + new_wave_line.strip())
        monster_id += 1
    else:
        out_wave_lines.append(line.rstrip('\n'))

with open('js/data/monsterData.js', 'w', encoding='utf-8') as f:
    f.write('var Game = window.Game || {};\n\n')
    f.write('(function() {\n')
    f.write('    var DEFAULT_MONSTERS = [\n')
    f.write(',\n'.join(monsters) + '\n')
    f.write('    ];\n\n')
    f.write('    Game.MonsterData = {\n')
    f.write('        monsters: {},\n')
    f.write('        init: function() {\n')
    f.write('            for (var i = 0; i < DEFAULT_MONSTERS.length; i++) {\n')
    f.write('                var m = DEFAULT_MONSTERS[i];\n')
    f.write('                this.monsters[m.id] = m;\n')
    f.write('            }\n')
    f.write('        },\n')
    f.write('        getMonster: function(id) {\n')
    f.write('            return this.monsters[id];\n')
    f.write('        }\n')
    f.write('    };\n\n')
    f.write('    Game.MonsterData.init();\n\n')
    f.write('    // localStorage 오버라이드\n')
    f.write('    try {\n')
    f.write("        var raw = localStorage.getItem('rtd_monsterData');\n")
    f.write('        if (raw) {\n')
    f.write('            var saved = JSON.parse(raw);\n')
    f.write('            for (var id in saved) {\n')
    f.write('                if (Game.MonsterData.monsters[id]) {\n')
    f.write('                    Object.assign(Game.MonsterData.monsters[id], saved[id]);\n')
    f.write('                }\n')
    f.write('            }\n')
    f.write('        }\n')
    f.write('    } catch(e) {}\n')
    f.write('})();\n')

with open('js/data/waveData_new.js', 'w', encoding='utf-8') as f:
    for line in out_wave_lines:
        f.write(line + '\n')
