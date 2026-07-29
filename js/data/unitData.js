var Game = window.Game || {};

Game.UnitData = {
    units: [],

    init: function(data) {
        this.units = data;
    },

    getById: function(id) {
        return this.units.find(function(u) { return u.id === id; });
    },

    getByTier: function(tier) {
        return this.units.filter(function(u) { return u.tier === tier; });
    },

    // 뽑기 풀: gachaAvailable 플래그만으로 판단 (단일 제어 지점)
    getGachaPool: function(tier) {
        return this.units.filter(function(u) {
            return u.tier === tier && u.gachaAvailable === true;
        });
    },

    // 전체 활성 풀 (등급 무관) — 특정 등급 풀이 비었을 때 fallback용
    getAllGachaUnits: function() {
        return this.units.filter(function(u) {
            return u.gachaAvailable === true;
        });
    },

    getByAttackType: function(type) {
        return this.units.filter(function(u) { return u.attackType === type; });
    }
};

// ── localStorage 오버라이드 (tools/data-editor.html) ──
(function() {
    try {
        var raw = localStorage.getItem('rtd_unitData');
        if (!raw) return;
        var saved = JSON.parse(raw);
        if (!Array.isArray(saved) || saved.length === 0) return;
        // id 기준으로 머지
        for (var i = 0; i < saved.length; i++) {
            var su = saved[i];
            if (!su.id) continue;
            var existing = Game.UnitData.units.find(function(u) { return u.id === su.id; });
            if (existing) {
                Object.assign(existing, su);
            } else {
                Game.UnitData.units.push(su);
            }
        }
    } catch(e) {}
})();

window.Game = Game;
