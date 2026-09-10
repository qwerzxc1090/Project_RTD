var Game = window.Game || {};

(function() {
    Game.MonsterData = {
        monsters: {},
        init: function(data) {
            this.monsters = data || {};
            this.applyLocalOverrides();
        },
        applyLocalOverrides: function() {
            try {
                var raw = localStorage.getItem('rtd_monsterData');
                if (!raw) return;
                var saved = JSON.parse(raw);
                var entries = Array.isArray(saved) ? saved : Object.values(saved || {});
                for (var i = 0; i < entries.length; i++) {
                    var savedMonster = entries[i];
                    if (!savedMonster || savedMonster.id === undefined) continue;
                    var key = String(savedMonster.id);
                    if (this.monsters[key]) Object.assign(this.monsters[key], savedMonster);
                    else this.monsters[key] = savedMonster;
                }
            } catch(e) {
                console.warn('[MonsterData] localStorage override load failed:', e);
            }
        },
        getMonster: function(id) {
            return this.monsters[id];
        }
    };

})();
