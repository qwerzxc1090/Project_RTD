var Game = window.Game || {};

(function() {
    Game.MonsterData = {
        monsters: {},
        init: function(data) {
            this.monsters = data || {};
        },
        getMonster: function(id) {
            return this.monsters[id];
        }
    };

    Game.MonsterData.init();

    // localStorage 오버라이드
    try {
        var raw = localStorage.getItem('rtd_monsterData');
        if (raw) {
            var saved = JSON.parse(raw);
            for (var id in saved) {
                if (Game.MonsterData.monsters[id]) {
                    Object.assign(Game.MonsterData.monsters[id], saved[id]);
                }
            }
        }
    } catch(e) {}
})();
