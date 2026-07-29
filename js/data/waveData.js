var Game = window.Game || {};

(function() {
    Game.WaveData = {
        waves: [],
        
        init: function(data) {
            this.waves = data || [];
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
