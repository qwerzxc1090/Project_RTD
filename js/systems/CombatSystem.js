var Game = window.Game || {};

Game.CombatSystem = {
    calculateDamage: function(tower, monster) {
        var baseDamage = tower.unitData.damage;
        var attackType = tower.unitData.attackType;
        var monsterType = monster.monsterType; // 'small','large','general','boss','boss_normal','boss_large','boss_small'
        
        var effectiveness;
        if (monsterType === 'boss_normal' || monsterType === 'boss_large' || monsterType === 'boss_small') {
            // ── 보스 전용 방어 테이블 조회 (BOSS_EFFECTIVENESS) ──
            var bossTable = Game.Config.BOSS_EFFECTIVENESS[attackType];
            effectiveness = bossTable ? (bossTable[monsterType] !== undefined ? bossTable[monsterType] : 0.80) : 0.80;
        } else {
            // ── 일반 몬스터 방어 테이블 조회 ──
            var monsterSize = monsterType;
            if (monsterSize === 'boss') monsterSize = 'large'; // 레거시 boss → large 폴백
            var typeTable = Game.Config.TYPE_EFFECTIVENESS[attackType];
            effectiveness = typeTable ? (typeTable[monsterSize] !== undefined ? typeTable[monsterSize] : 1.0) : 1.0;
        }
        
        var isCritical = false;
        // ── 스킬 카테고리 기반 치명타 비활성화 ──
        // category === 'duration' (지속 피해 계열: POISON_DOT 등)인 스킬은 치명타 발동 안 함
        // 새로운 지속 피해 스킬 추가 시 category: "duration" 만 설정하면 자동 적용
        var skillData = Game.SkillData ? Game.SkillData.getSkill(tower.unitData.skillId) : null;
        var isDurationSkill = skillData && skillData.category === 'duration';
        if (!isDurationSkill) {
            var critRate = tower.unitData.criticalRate !== undefined ? tower.unitData.criticalRate : 1000;
            if (Math.random() * 10000 < critRate) {
                isCritical = true;
            }
        }

        var finalDamage = Math.floor(baseDamage * effectiveness);
        if (isCritical) {
            finalDamage = Math.floor(finalDamage * (1 + (Game.Config.CRITICAL_DAMAGE_RATIO || 0.5)));
        }

        return { damage: finalDamage, isCritical: isCritical, effectiveness: effectiveness };
    },
    
    findTarget: function(tower, monsters) {
        var towerX = tower.x;
        var towerY = tower.y;
        var range = tower.unitData.range;
        var rangeSq = range * range; // 최적화: 사거리 제곱 
        var bestTarget = null;
        var bestProgress = -1; // Find the monster with the most total distance traveled
        
        for (var i = 0; i < monsters.length; i++) {
            var monster = monsters[i];
            if (!monster.active || monster.hp <= 0) continue;
            
            var dx = monster.x - towerX;
            var dy = monster.y - towerY;
            var distSq = dx * dx + dy * dy; // 최적화: Math.sqrt 제거
            
            if (distSq <= rangeSq) {
                // Prefer monster with greatest progress (totalDistance)
                var progress = monster.getProgress ? monster.getProgress() : 0;
                if (progress > bestProgress) {
                    bestProgress = progress;
                    bestTarget = monster;
                }
            }
        }
        
        return bestTarget;
    },
    
    isInRange: function(tower, monster) {
        if (!monster.active || monster.hp <= 0) return false;
        var dx = monster.x - tower.x;
        var dy = monster.y - tower.y;
        var distSq = dx * dx + dy * dy; // 최적화: Math.sqrt 제거
        var range = tower.unitData.range;
        return distSq <= range * range;
    },
    
    getEffectivenessText: function(attackType, monsterType) {
        var eff;
        if (monsterType === 'boss_normal' || monsterType === 'boss_large' || monsterType === 'boss_small') {
            var bossTable = Game.Config.BOSS_EFFECTIVENESS[attackType];
            eff = bossTable ? (bossTable[monsterType] !== undefined ? bossTable[monsterType] : 0.80) : 0.80;
        } else {
            var size = monsterType === 'boss' ? 'large' : monsterType;
            var tbl = Game.Config.TYPE_EFFECTIVENESS[attackType];
            eff = tbl ? (tbl[size] !== undefined ? tbl[size] : 1.0) : 1.0;
        }
        if (eff > 1.0) return '효과적!';
        if (eff < 1.0) return '비효과적...';
        return '';
    }
};

window.Game = Game;
