var Game = window.Game || {};

Game.GachaSystem = {
    // 티어 순서 (확률 낙은 순 → 높은 순)
    _tierOrder: [
        'primordial',
        'myth',
        'epic',
        'legend',
        'saga',
        'relic',
        'ancient',
        'rare',
        'normal'
    ],

    // 문자열 이름으로 등급 풀 가져오기 (보안)
    _getPool: function(tier) {
        return Game.UnitData.getGachaPool(tier);
    },

    // 전체 활성 풀 (등급 상관없이)
    _getFullPool: function() {
        return Game.UnitData.getAllGachaUnits();
    },

    roll: function() {
        var tier = this._getTierFromRoll();

        // 해당 등급에 활성 풀이 없으면 다른 등급로 폴오버
        var pool = this._getPool(tier);
        if (!pool || pool.length === 0) {
            // 활성된 전체 풀에서 랜덤 선택
            pool = this._getFullPool();
            if (!pool || pool.length === 0) {
                console.warn('[GachaSystem] 활성된 타워가 없습니다! gachaAvailable=true 인 유닛을 확인하세요.');
                return null;
            }
            console.warn('[GachaSystem] ' + tier + ' 등급 풀 비엄 → 전체 활성 풀에서 fallback');
        }

        var base = pool[Math.floor(Math.random() * pool.length)];
        if (!base) {
            console.warn('[GachaSystem] 풀에서 유닛을 가져오지 못함');
            return null;
        }

        // 인스턴스 복사
        var unit = {};
        for (var k in base) unit[k] = base[k];
        unit.instanceId = 'unit_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        return unit;
    },

    _getTierFromRoll: function() {
        var rates = Game.Config.GACHA_RATES;

        // 1. 활성 등급의 가중치 합산 (제외 등급은 0으로 설정됨)
        var total = 0;
        for (var i = 0; i < this._tierOrder.length; i++) {
            total += (rates[this._tierOrder[i]] || 0);
        }
        if (total <= 0) {
            console.warn('[GachaSystem] 모든 등급의 가중치가 0입니다!');
            return this._tierOrder[this._tierOrder.length - 1];
        }

        // 2. 0 ≤ roll < total 범위의 정수 난수
        var roll = Math.floor(Math.random() * total);

        // 3. 누적 가중치로 등급 결정
        var cumulative = 0;
        for (var i = 0; i < this._tierOrder.length; i++) {
            var tier = this._tierOrder[i];
            cumulative += (rates[tier] || 0);
            if (roll < cumulative) return tier;
        }
        return this._tierOrder[this._tierOrder.length - 1];
    },

    isSpecialTier: function(tier) {
        return Game.Config.LEGENDARY_THRESHOLD.indexOf(tier) !== -1;
    },

    canAfford: function() {
        return Game.EconomySystem.getGold() >= Game.Config.GACHA_COST;
    },

    performGacha: function() {
        if (!this.canAfford()) return null;
        Game.EconomySystem.spendGold(Game.Config.GACHA_COST);
        return this.roll();
    },

    getDropRates: function() {
        return Game.Config.GACHA_RATES;
    }
};

window.Game = Game;
