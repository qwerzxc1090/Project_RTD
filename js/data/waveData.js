var Game = window.Game || {};

(function() {
    Game.WaveData = {
        waves: [],
        
        init: function(data) {
            this.waves = data || [];
            this.applyLocalOverrides();
        },

        applyLocalOverrides: function() {
            try {
                var raw = localStorage.getItem('rtd_waveData');
                if (!raw) return;
                var saved = JSON.parse(raw);
                if (!Array.isArray(saved) || saved.length === 0) return;

                for (var i = 0; i < saved.length; i++) {
                    var savedWave = saved[i];
                    if (!savedWave || savedWave.round === undefined) continue;
                    var existing = this.getWave(savedWave.round);
                    if (existing) Object.assign(existing, savedWave);
                    else this.waves.push(savedWave);
                }
                this.waves.sort(function(a, b) { return a.round - b.round; });
            } catch(e) {
                console.warn('[WaveData] localStorage override load failed:', e);
            }
        },

        getWave: function(round) {
            return this.waves.find(function(w) { return w.round === round; });
        },

        isBossRound: function(round) {
            var w = this.getWave(round);
            if (!w) return false;
            var m = Game.MonsterData.getMonster(w.monsterId);
            return m ? m.isBoss : false;
        },

        getBossRounds: function() {
            var self = this;
            return this.waves.filter(function(w) { return self.isBossRound(w.round); }).map(function(w) { return w.round; });
        }
    };
})();

window.Game = Game;
