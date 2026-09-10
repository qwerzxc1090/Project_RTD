var Game = window.Game || {};

Game.DamageTracker = {
    enabled: false,    // DPS 데이터 수집 활성화 여부 (false = 비활성)
    totalDamage: 0,
    elapsedSeconds: 0,
    towerMap: {},      // towerId -> unitData
    unitStats: {},     // unitId  -> { unitData, totalDamage, count }
    typeStats: {},     // attackType -> totalDamage  (normal/explosive/vibration)
    groupStats: {},    // groupKey -> { label, colorHex, totalDamage }

    // skillId -> 그룹 접미사 매핑
    _getGroupSuffix: function(skillId) {
        if (skillId === 4) return '_yeon';   // 연 (CHAIN_ATTACK)
        if (skillId === 5) return '_dok';    // 독 (POISON_DOT)
        if (skillId >= 6)  return '_don';    // 돈 (GOLD_FARM)
        return '';                           // 기본 (skillId 1~3)
    },

    _getGroupKey: function(unitData) {
        var suffix = this._getGroupSuffix(unitData.skillId);
        return unitData.attackType + suffix;
    },

    // 그룹 레이블 및 색상 정의
    GROUP_META: {
        'normal':           { label: '일반형',    colorHex: '#DDDDDD', hex: 0xDDDDDD },
        'explosive':        { label: '폭발형',    colorHex: '#FF6644', hex: 0xFF6644 },
        'vibration':        { label: '진동형',    colorHex: '#44FF88', hex: 0x44FF88 },
        'normal_yeon':      { label: '일반형_연', colorHex: '#44CCFF', hex: 0x44CCFF },
        'explosive_yeon':   { label: '폭발형_연', colorHex: '#FFAA44', hex: 0xFFAA44 },
        'vibration_yeon':   { label: '진동형_연', colorHex: '#AAFFCC', hex: 0xAAFFCC },
        'normal_dok':       { label: '일반형_독', colorHex: '#AA44FF', hex: 0xAA44FF },
        'explosive_dok':    { label: '폭발형_독', colorHex: '#FF44AA', hex: 0xFF44AA },
        'vibration_dok':    { label: '진동형_독', colorHex: '#44FF44', hex: 0x44FF44 },
        'normal_don':       { label: '일반형_돈', colorHex: '#FFD700', hex: 0xFFD700 },
        'explosive_don':    { label: '폭발형_돈', colorHex: '#FFA500', hex: 0xFFA500 },
        'vibration_don':    { label: '진동형_돈', colorHex: '#90EE90', hex: 0x90EE90 }
    },

    init: function() {
        this.reset();
    },

    reset: function() {
        this.totalDamage    = 0;
        this.elapsedSeconds = 0;
        this.towerMap       = {};
        this.unitStats      = {};
        this.typeStats      = { normal: 0, explosive: 0, vibration: 0 };
        this.groupStats     = {};
        var keys = Object.keys(this.GROUP_META);
        for (var i = 0; i < keys.length; i++) {
            this.groupStats[keys[i]] = 0;
        }
    },

    registerTower: function(tower) {
        if (!this.enabled) return;
        if (!tower || !tower.unitData) return;
        this.towerMap[tower.towerId] = tower.unitData;

        var uid = tower.unitData.id;
        if (!this.unitStats[uid]) {
            this.unitStats[uid] = { unitData: tower.unitData, totalDamage: 0, count: 0 };
        }
        this.unitStats[uid].count++;
    },

    unregisterTower: function(towerId) {
        if (!towerId || !this.towerMap[towerId]) return;
        var unitData = this.towerMap[towerId];
        var uid = unitData.id;
        if (this.unitStats[uid] && this.unitStats[uid].count > 0) {
            this.unitStats[uid].count--;
        }
        delete this.towerMap[towerId];
    },

    recordDamage: function(origin, amount) {
        if (!this.enabled) return;
        if (!amount || amount <= 0) return;

        var unitData = null;
        if (origin) {
            if (origin.unitData) unitData = origin.unitData;
            else if (origin.id)  unitData = origin;
        }

        this.totalDamage += amount;

        if (unitData && unitData.id) {
            var uid = unitData.id;

            // 유닛별
            if (!this.unitStats[uid]) {
                this.unitStats[uid] = { unitData: unitData, totalDamage: 0, count: 1 };
            }
            this.unitStats[uid].totalDamage += amount;

            // 공격 타입별
            var atype = unitData.attackType || 'normal';
            if (this.typeStats[atype] !== undefined) this.typeStats[atype] += amount;

            // 12그룹별
            var gkey = this._getGroupKey(unitData);
            if (this.groupStats[gkey] !== undefined) {
                this.groupStats[gkey] += amount;
            } else {
                this.groupStats[gkey] = amount;
            }
        }
    },

    recordDamageByTowerId: function(towerId, amount) {
        if (!this.enabled) return;
        if (!amount || amount <= 0) return;
        var unitData = this.towerMap[towerId];
        if (unitData) {
            this.recordDamage(unitData, amount);
        } else {
            this.totalDamage += amount;
        }
    },

    updateTime: function(deltaMs) {
        if (!this.enabled) return;
        this.elapsedSeconds += (deltaMs / 1000);
    },

    // ── 모드 0: 유닛 기본 (등급/이름) ──
    getStats: function() {
        var elapsed = Math.max(1, this.elapsedSeconds);
        var total   = Math.max(1, this.totalDamage);
        var list    = [];

        var keys = Object.keys(this.unitStats);
        for (var i = 0; i < keys.length; i++) {
            var stat = this.unitStats[keys[i]];
            if (stat.totalDamage > 0) {
                list.push({
                    id: stat.unitData.id,
                    name: stat.unitData.name,
                    tier: stat.unitData.tier,
                    attackType: stat.unitData.attackType,
                    damage: stat.totalDamage,
                    dps: Math.floor(stat.totalDamage / elapsed),
                    pct: ((stat.totalDamage / total) * 100).toFixed(1),
                    count: stat.count
                });
            }
        }
        list.sort(function(a, b) { return b.damage - a.damage; });
        return { totalDamage: this.totalDamage, totalDps: Math.floor(this.totalDamage / elapsed), units: list };
    },

    // ── 모드 1: 공격 타입별 (3종) ──
    getTypeStats: function() {
        var elapsed = Math.max(1, this.elapsedSeconds);
        var total   = Math.max(1, this.totalDamage);

        var types = ['normal', 'explosive', 'vibration'];
        var labels = { normal: '일반', explosive: '폭발', vibration: '진동' };
        var colorHex = { normal: '#DDDDDD', explosive: '#FF6644', vibration: '#44FF88' };

        var list = types.map(function(t) {
            var dmg = this.typeStats[t] || 0;
            return {
                id: t,
                name: labels[t],
                colorHex: colorHex[t],
                damage: dmg,
                dps: Math.floor(dmg / elapsed),
                pct: ((dmg / total) * 100).toFixed(1)
            };
        }, this);

        list.sort(function(a, b) { return b.damage - a.damage; });
        return { totalDamage: this.totalDamage, totalDps: Math.floor(this.totalDamage / elapsed), items: list };
    },

    // ── 모드 2: 12그룹별 (9등급 합산) ──
    getGroupStats: function() {
        var elapsed  = Math.max(1, this.elapsedSeconds);
        var total    = Math.max(1, this.totalDamage);
        var meta     = this.GROUP_META;
        var list     = [];

        var keys = Object.keys(this.groupStats);
        for (var i = 0; i < keys.length; i++) {
            var gkey = keys[i];
            var dmg  = this.groupStats[gkey] || 0;
            var m = meta[gkey] || { label: gkey, colorHex: '#AAAAAA', hex: 0xAAAAAA };
            list.push({
                id: gkey,
                name: m.label,
                colorHex: m.colorHex,
                hex: m.hex,
                damage: dmg,
                dps: Math.floor(dmg / elapsed),
                pct: total > 0 ? ((dmg / total) * 100).toFixed(1) : '0.0'
            });
        }
        list.sort(function(a, b) { return b.damage - a.damage; });
        return { totalDamage: this.totalDamage, totalDps: Math.floor(this.totalDamage / elapsed), items: list };
    }
};

window.Game = Game;
