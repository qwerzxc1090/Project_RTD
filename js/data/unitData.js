var Game = window.Game || {};

Game.UnitData = {
    units: [],

    init: function(data) {
        this.units = Array.isArray(data) ? data : [];
        this.applyLocalOverrides();
    },

    applyLocalOverrides: function() {
        try {
            var raw = localStorage.getItem('rtd_unitData');
            if (!raw) return;
            var saved = JSON.parse(raw);
            if (!Array.isArray(saved) || saved.length === 0) return;

            for (var i = 0; i < saved.length; i++) {
                var savedUnit = saved[i];
                if (!savedUnit.id) continue;
                var existing = this.getById(savedUnit.id);
                if (existing) Object.assign(existing, savedUnit);
                else this.units.push(savedUnit);
            }
        } catch(e) {
            console.warn('[UnitData] localStorage override load failed:', e);
        }
    },

    getById: function(id) {
        return this.units.find(function(u) { return u.id === id; });
    },

    getByTier: function(tier) {
        return this.units.filter(function(u) { return u.tier === tier; });
    },

    // 뽑기 풀: gachaAvailable이 활성화된 기본·파생 타워를 모두 허용한다.
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

window.Game = Game;
