(function(root, factory) {
    var api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.RTDCalculationSimulator = api;
}(typeof self !== 'undefined' ? self : this, function() {
    'use strict';

    var VERSION = 11;
    var MODEL = 'quality-scaled-event-v11';
    var TIERS = ['primordial', 'myth', 'epic', 'legend', 'saga', 'relic', 'ancient', 'rare', 'normal'];
    var SYNTHESIS_TIERS = ['relic', 'ancient', 'rare'];
    var MONSTER_TYPES = ['small', 'general', 'large', 'boss_normal', 'boss_large', 'boss_small'];

    function createRng(seed) {
        var state = seed >>> 0;
        return function() {
            state = (1664525 * state + 1013904223) >>> 0;
            return state / 4294967296;
        };
    }

    function rollTier(random, rates, order) {
        var total = 0;
        var i;
        for (i = 0; i < order.length; i++) total += Number(rates[order[i]] || 0);
        if (total <= 0) return order[order.length - 1];
        var roll = Math.floor(random() * total);
        var cumulative = 0;
        for (i = 0; i < order.length; i++) {
            cumulative += Number(rates[order[i]] || 0);
            if (roll < cumulative) return order[i];
        }
        return order[order.length - 1];
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    // 실제 뽑기(UnitData.getGachaPool)와 같은 기준을 사용한다.
    // 기본형·파생형 구분 없이, gachaAvailable이 켜진 타워만 계산 풀에 넣는다.
    function getGachaEligibleUnits(units) {
        return (units || []).filter(function(unit) {
            return unit && unit.gachaAvailable === true;
        });
    }

    // 자동 배치가 경로 커버리지를 우선하는 현재 규칙을 빠른 계산용 가동률로 환산한다.
    // 기본 사거리 120은 약 54.5%, 장거리 220 이상은 최대 100% 가동으로 본다.
    function rangeUtilization(range) {
        return clamp(Number(range || 120) / 220, 0.45, 1);
    }

    // 실제 전투에서는 선두 한 마리가 사거리 밖이어도 뒤따르는 몬스터를 공격한다.
    // baseCoverage를 몬스터 한 마리의 사거리 체류 확률로 보고, 활성 몬스터 중
    // 최소 한 마리가 사거리 안에 있을 확률로 타워 가동률을 환산한다.
    function crowdUtilization(baseCoverage, activeMonsterCount) {
        var coverage = clamp(Number(baseCoverage || 0), 0, 1);
        var count = Math.max(0, Math.floor(Number(activeMonsterCount || 0)));
        // 같은 스폰 간격으로 이동하는 몬스터의 위치는 서로 독립적이지 않다.
        // 후속 개체는 45%만 독립 표본으로 보아 같은 스폰 열의 위치 상관을 반영한다.
        var effectiveCount = count > 0 ? 1 + (count - 1) * 0.45 : 0;
        return effectiveCount > 0 ? 1 - Math.pow(1 - coverage, effectiveCount) : 0;
    }

    function segmentCoverage(cx, cy, range, start, end) {
        var vx = end.x - start.x, vy = end.y - start.y;
        var px = start.x - cx, py = start.y - cy;
        var a = vx * vx + vy * vy;
        if (a <= 0) return 0;
        var b = 2 * (px * vx + py * vy);
        var c = px * px + py * py - range * range;
        var disc = b * b - 4 * a * c;
        if (disc <= 0) return 0;
        var root = Math.sqrt(disc);
        var from = Math.max(0, Math.min((-b - root) / (2 * a), (-b + root) / (2 * a)));
        var to = Math.min(1, Math.max((-b - root) / (2 * a), (-b + root) / (2 * a)));
        return to > from ? (to - from) * Math.sqrt(a) : 0;
    }

    function createPlacement(config, rangeBands) {
        var field = config.FIELD || { CENTER_X: 640, CENTER_Y: 320, SIZE: 440, PATH_WIDTH: 36 };
        var left = field.LEFT !== undefined ? field.LEFT : field.CENTER_X - field.SIZE / 2;
        var right = field.RIGHT !== undefined ? field.RIGHT : field.CENTER_X + field.SIZE / 2;
        var top = field.TOP !== undefined ? field.TOP : field.CENTER_Y - field.SIZE / 2;
        var bottom = field.BOTTOM !== undefined ? field.BOTTOM : field.CENTER_Y + field.SIZE / 2;
        var spawnX = field.SPAWN_X !== undefined ? field.SPAWN_X : field.CENTER_X;
        var halfPath = Number(field.PATH_WIDTH || 36) / 2;
        var slotSize = Number(config.TOWER_PLACEMENT && config.TOWER_PLACEMENT.SLOT_SIZE || 34);
        var margin = Math.ceil(slotSize / 2);
        var areaL = left + halfPath + margin, areaR = right - halfPath - margin;
        var areaT = top + halfPath + margin, areaB = bottom - halfPath - margin;
        var spacingX = Math.round((areaR - areaL) / 10), spacingY = Math.round((areaB - areaT) / 10);
        var slots = [];
        for (var row = 0; row < 11; row++) for (var col = 0; col < 11; col++) {
            slots.push({ col: col, row: row, x: areaL + col * spacingX, y: areaT + row * spacingY,
                maxCapacity: col === 5 && row === 5 ? 10 : 4 });
        }
        var points = [{x: spawnX, y: top}, {x: left, y: top}, {x: left, y: bottom},
            {x: right, y: bottom}, {x: right, y: top}, {x: spawnX, y: top}];
        var segmentLengths = [];
        for (var i = 0; i < points.length - 1; i++) {
            segmentLengths.push(Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y));
        }
        var placement = { slots: slots, occupancy: new Array(slots.length).fill(0), points: points,
            segmentLengths: segmentLengths, slotSize: slotSize, midReservedIndices: [] };
        var placementConfig = config.TOWER_PLACEMENT || {};
        var reserveCount = placementConfig.MID_RANGE_RESERVED_SLOT_COUNT !== undefined
            ? Math.max(0, Math.floor(Number(placementConfig.MID_RANGE_RESERVED_SLOT_COUNT))) : 2;
        var midRanges = rangeBands && rangeBands.mid || [];
        if (reserveCount > 0 && midRanges.length) {
            placement.midReservedIndices = slots.map(function(slot, index) {
                var point = slotPoint(placement, index);
                var bestCoverage = 0;
                midRanges.forEach(function(range) {
                    bestCoverage = Math.max(bestCoverage, pathUtilization(placement, point, range, 1));
                });
                return { index: index, coverage: bestCoverage };
            }).sort(function(a, b) {
                return b.coverage - a.coverage || a.index - b.index;
            }).slice(0, reserveCount).map(function(item) { return item.index; });
        }
        return placement;
    }

    function slotPoint(placement, index) {
        var slot = placement.slots[index], occ = placement.occupancy[index] || 0;
        if (slot.maxCapacity > 4) {
            var angle = -Math.PI / 2 + Math.PI * 2 * (occ % slot.maxCapacity) / slot.maxCapacity;
            return {x: slot.x + Math.cos(angle) * placement.slotSize * 0.42,
                y: slot.y + Math.sin(angle) * placement.slotSize * 0.42};
        }
        var q = placement.slotSize * 0.25;
        var offsets = [[-q,-q],[q,-q],[-q,q],[q,q]];
        return {x: slot.x + offsets[occ % 4][0], y: slot.y + offsets[occ % 4][1]};
    }

    function pathUtilization(placement, point, range, round) {
        var weights = round < 25 ? [1.30, 1.20, 1.10, 1, 1] : [1, 1, 1, 1, 1];
        var covered = 0, total = 0;
        for (var i = 0; i < 5; i++) {
            covered += segmentCoverage(point.x, point.y, range, placement.points[i], placement.points[i + 1]) * weights[i];
            total += placement.segmentLengths[i] * weights[i];
        }
        return total > 0 ? clamp(covered / total, 0, 1) : 0;
    }

    function selectPlacement(placement, range, round) {
        var best = -1, bestUtilization = -1;
        var placementConfig = placement.config || {};
        var midRangeMin = Number(placementConfig.MID_RANGE_MIN || 150);
        for (var i = 0; i < placement.slots.length; i++) {
            if (placement.occupancy[i] >= placement.slots[i].maxCapacity) continue;
            if (range < midRangeMin && placement.midReservedIndices.indexOf(i) >= 0) continue;
            var utilization = pathUtilization(placement, slotPoint(placement, i), range, round);
            if (utilization > bestUtilization) { best = i; bestUtilization = utilization; }
        }
        return {index: best, utilization: Math.max(0, bestUtilization)};
    }

    function typeEffectiveness(config, attackType, monsterType) {
        var table = monsterType.indexOf('boss_') === 0
            ? config.BOSS_EFFECTIVENESS
            : config.TYPE_EFFECTIVENESS;
        var row = table && table[attackType];
        var value = row && row[monsterType];
        return Number.isFinite(Number(value)) ? Number(value) : 1;
    }

    // DEV 976회 대비 정밀 경로의 잔차를 완만하게 보정한다. 초반은 과도한
    // 생존을 소폭 줄이고, R17~R24의 과도한 실패 집중은 전투력 성장분으로 보정한다.
    function precisionRoundDamageFactor(accuracyLevel, round, enabled) {
        if (!enabled || accuracyLevel < 11) return 1;
        if (round <= 16) return 0.985;
        if (round <= 24) return 1.08;
        return 1;
    }

    function prepare(options) {
        var units = getGachaEligibleUnits(options.units);
        var pools = {};
        units.forEach(function(unit) {
            if (!pools[unit.tier]) pools[unit.tier] = [];
            pools[unit.tier].push(unit);
        });

        var config = options.config || {};
        var skills = options.skills || {};
        var unitProfiles = {};
        units.forEach(function(unit) {
            var skill = skills[unit.skillId] || skills[String(unit.skillId)] || null;
            var rawDps = Number(unit.damage || 0) * 1000 / Math.max(1, Number(unit.attackSpeed || 1000));
            // 인게임 CombatSystem과 동일하게 지속 피해 스킬은 기본 공격 치명타를 비활성화한다.
            var critRate = skill && skill.category === 'duration'
                ? 0 : Number(unit.criticalRate || 0) / 10000;
            var critMultiplier = 1 + critRate * Number(config.CRITICAL_DAMAGE_RATIO || 0.5);
            var utilization = rangeUtilization(unit.range);
            var dps = {};
            MONSTER_TYPES.forEach(function(monsterType) {
                dps[monsterType] = rawDps * critMultiplier * utilization *
                    typeEffectiveness(config, unit.attackType, monsterType);
            });
            var fullDps = {};
            MONSTER_TYPES.forEach(function(monsterType) {
                fullDps[monsterType] = rawDps * critMultiplier *
                    typeEffectiveness(config, unit.attackType, monsterType);
            });
            unitProfiles[unit.id] = {
                unit: unit, skill: skill, utilization: utilization, dps: dps, fullDps: fullDps
            };
        });

        var waves = (options.waves || []).slice().sort(function(a, b) { return a.round - b.round; });
        var waveByRound = {};
        waves.forEach(function(wave) { waveByRound[wave.round] = wave; });

        var placementConfig = config.TOWER_PLACEMENT || {};
        var midRangeMin = Number(placementConfig.MID_RANGE_MIN || 150);
        var longRangeMin = Number(placementConfig.CORNER_MIN_RANGE || 180);
        var midRanges = [];
        units.forEach(function(unit) {
            var range = Number(unit.range || 0);
            if (range >= midRangeMin && range < longRangeMin && midRanges.indexOf(range) === -1) {
                midRanges.push(range);
            }
        });

        return {
            config: config,
            monsters: options.monsters || {},
            waves: waves,
            waveByRound: waveByRound,
            pools: pools,
            profiles: unitProfiles,
            rangeBands: { mid: midRanges },
            precisionCalibration: options.precisionCalibration !== false,
            accuracyLevel: Math.max(1, Math.min(13, Math.floor(Number(options.accuracyLevel || 6)))),
            totalRounds: Number(config.TOTAL_ROUNDS || 52),
            autoGachaInterval: Number(options.autoGachaInterval || 1111) / 1000,
            autoSynthesisDelay: Number(options.autoSynthesisDelay || 3000) / 1000
        };
    }

    function rollUnit(random, prepared, rates, order) {
        var tier = rollTier(random, rates, order);
        var pool = prepared.pools[tier] || [];
        if (!pool.length) {
            pool = [];
            order.forEach(function(fallbackTier) {
                pool = pool.concat(prepared.pools[fallbackTier] || []);
            });
        }
        return pool.length ? pool[Math.floor(random() * pool.length)] : null;
    }

    function emptyAggregate(iterations, seedBase, accuracyLevel) {
        return {
            version: VERSION,
            model: MODEL,
            total: iterations,
            clears: 0,
            failures: 0,
            clearGsSum: 0,
            clearGsCount: 0,
            failGsSum: 0,
            failGsCount: 0,
            failRoundSum: 0,
            totalTime: 0,
            failCounts: new Array(53).fill(0),
            failGsSums: new Array(53).fill(0),
            failGsCounts: new Array(53).fill(0),
            normalFails: 0,
            bossFails: 0,
            bossTimeouts: 0,
            hpSums: { early: 0, mid: 0, late: 0 },
            hpCounts: { early: 0, mid: 0, late: 0 },
            recentClearGs: [],
            seedBase: seedBase >>> 0,
            completedAt: 0,
            elapsedMs: 0,
            requestedIterations: iterations,
            stoppedByTimeLimit: false,
            precisionLimitHits: 0,
            assumptions: {
                accuracyLevel: Number(accuracyLevel || 6),
                autoGacha: true,
                autoSynthesis: true,
                combat: '일반 연속 DPS·보스 공격 단위 판정·선두 몬스터 우선 공격',
                towerPool: 'gachaAvailable=true인 모든 뽑기 가능 타워',
                coverage: '11×11 실제 슬롯·사각 경로 교차 길이·활성 몬스터 군집 가동률 기반',
                critical: '일반 기대값·보스 공격별 난수 적용',
                precisionCalibration: accuracyLevel >= 11
                    ? 'DEV 976회 잔차 보정: R1~R16 피해 0.985배, R17~R24 피해 1.08배'
                    : '미적용',
                specialTowerSimulation: accuracyLevel >= 13
                    ? '_연 연쇄·감쇠·이동, _독 개별 중첩·틱·상성, _돈 공격 횟수 골드·파밍 완료 합성 반영'
                    : '기본 공격 스탯만 반영'
            }
        };
    }

    function simulateOne(prepared, seed) {
        var config = prepared.config;
        var random = createRng(seed);
        var towers = [];
        var goldTowers = [];
        var placement = createPlacement(config, prepared.rangeBands);
        placement.config = config.TOWER_PLACEMENT || {};
        var dpsByType = {};
        var fullDpsByType = {};
        MONSTER_TYPES.forEach(function(type) { dpsByType[type] = 0; fullDpsByType[type] = 0; });
        var active = [];
        var projectiles = [];
        var nextMonsterInstanceId = 1;
        var nextTowerInstanceId = 1;
        var gold = Number(config.INITIAL_GOLD || 0);
        var time = 0;
        var currentRound = 0;
        var currentWave = null;
        var currentMonster = null;
        var spawned = 0;
        var waveKills = 0;
        var waveActive = false;
        var nextWaveAt = 0;
        var nextSpawnAt = Infinity;
        var deadline = Infinity;
        var nextGachaAt = prepared.autoGachaInterval;
        var nextSynthesisAt = Infinity;
        var victory = false;
        var failed = false;
        var failReason = '';
        var stepCount = 0;
        var hpRoundSums = { early: 0, mid: 0, late: 0 };
        var hpRoundCounts = { early: 0, mid: 0, late: 0 };
        var specialEventCounts = { chainHits: 0, poisonApplications: 0, poisonTicks: 0, goldRewards: 0, goldFarmCompletions: 0 };

        function addTower(unit) {
            if (!unit) return;
            var selectedPlacement = selectPlacement(placement, Number(unit.range || 120), Math.max(1, currentRound));
            if (selectedPlacement.index < 0) return;
            var placedPoint = slotPoint(placement, selectedPlacement.index);
            if (prepared.accuracyLevel >= 9) {
                var jitterPoint = { x: placedPoint.x, y: placedPoint.y };
                var jitter = placement.slotSize * 0.15;
                jitterPoint.x += (random() * 2 - 1) * jitter;
                jitterPoint.y += (random() * 2 - 1) * jitter;
                placedPoint = jitterPoint;
                selectedPlacement.utilization = pathUtilization(
                    placement, jitterPoint, Number(unit.range || 120), Math.max(1, currentRound)
                );
            }
            unit = Object.assign({}, unit, {
                _simTowerId: nextTowerInstanceId++,
                _simGoldAttackProgress: 0,
                _simGoldReward: null,
                _simGoldDeltaAccum: 0,
                _simGoldLastStack: false,
                _simGoldFarmComplete: false,
                _simSlotIndex: selectedPlacement.index,
                _simX: placedPoint.x,
                _simY: placedPoint.y,
                _simUtilization: selectedPlacement.utilization,
                _simNextAttackAt: time + Math.max(1, Number(unit.attackSpeed || 1000)) / 1000
            });
            placement.occupancy[selectedPlacement.index]++;
            towers.push(unit);
            var profile = prepared.profiles[unit.id];
            if (!profile) return;
            if (profile.skill && profile.skill.nameEn === 'GOLD_FARM') goldTowers.push(unit);
            MONSTER_TYPES.forEach(function(type) {
                dpsByType[type] += profile.dps[type] / Math.max(0.0001, profile.utilization) * unit._simUtilization;
                fullDpsByType[type] += profile.fullDps[type];
            });
        }

        function removeTower(unit) {
            var profile = unit && prepared.profiles[unit.id];
            if (!profile) return;
            unit._simRemoved = true;
            if (unit._simSlotIndex >= 0) placement.occupancy[unit._simSlotIndex] =
                Math.max(0, placement.occupancy[unit._simSlotIndex] - 1);
            MONSTER_TYPES.forEach(function(type) {
                dpsByType[type] = Math.max(0, dpsByType[type] -
                    profile.dps[type] / Math.max(0.0001, profile.utilization) * unit._simUtilization);
                fullDpsByType[type] = Math.max(0, fullDpsByType[type] - profile.fullDps[type]);
            });
        }

        function isSynthesisNormalTower(tower) {
            if (!tower || tower.tier !== 'normal') return false;
            return !/_don$/.test(String(tower.id || '')) || tower._simGoldFarmComplete === true;
        }

        function normalTowerCount() {
            var count = 0;
            for (var i = 0; i < towers.length; i++) if (isSynthesisNormalTower(towers[i])) count++;
            return count;
        }

        function scheduleSynthesisIfReady() {
            if (nextSynthesisAt === Infinity && normalTowerCount() >= 3) {
                nextSynthesisAt = time + prepared.autoSynthesisDelay;
            }
        }

        function accrueTowerGold(elapsed) {
            if (!currentMonster || !active.length || elapsed <= 0) return;
            for (var goldIndex = goldTowers.length - 1; goldIndex >= 0; goldIndex--) {
                var tower = goldTowers[goldIndex];
                if (tower._simRemoved || tower._simGoldReward === 0) {
                    goldTowers.splice(goldIndex, 1);
                    continue;
                }
                var profile = prepared.profiles[tower.id];
                var skill = profile && profile.skill;
                if (!skill) continue;
                var attacksToReward = Math.max(1, Number(skill.attacksToReward || 100));
                var goldAttackUtilization = prepared.accuracyLevel >= 10
                    ? crowdUtilization(tower._simUtilization, active.length)
                    : profile.utilization;
                tower._simGoldAttackProgress += elapsed * 1000 /
                    Math.max(1, Number(tower.attackSpeed || 1000)) * goldAttackUtilization;
                if (tower._simGoldReward === null) tower._simGoldReward = Number(skill.goldReward || 0);
                while (tower._simGoldAttackProgress >= attacksToReward && tower._simGoldReward > 0) {
                    tower._simGoldAttackProgress -= attacksToReward;
                    gold += Math.floor(tower._simGoldReward);
                    if (tower._simGoldLastStack) {
                        tower._simGoldReward = 0;
                        break;
                    }
                    tower._simGoldDeltaAccum += Number(skill.goldRewardDelta || 0);
                    tower._simGoldReward = Number(skill.goldReward || 0) *
                        Math.max(0, 1 + tower._simGoldDeltaAccum / 100);
                    if (tower._simGoldReward > 0 && tower._simGoldReward < 1) {
                        tower._simGoldReward = 1;
                        tower._simGoldLastStack = true;
                    }
                }
                if (tower._simGoldReward <= 0 && !tower._simGoldFarmComplete) {
                    tower._simGoldReward = 0;
                    tower._simGoldFarmComplete = true;
                    scheduleSynthesisIfReady();
                }
            }
        }

        function recordGoldAttack(tower) {
            var profile = prepared.profiles[tower.id];
            var skill = profile && profile.skill;
            if (!skill || skill.nameEn !== 'GOLD_FARM' || tower._simGoldFarmComplete) return;
            var attacksToReward = Math.max(1, Number(skill.attacksToReward || 100));
            tower._simGoldAttackProgress++;
            if (tower._simGoldAttackProgress < attacksToReward) return;
            tower._simGoldAttackProgress = 0;
            if (tower._simGoldReward === null) tower._simGoldReward = Number(skill.goldReward || 0);
            gold += Math.floor(tower._simGoldReward);
            specialEventCounts.goldRewards++;
            if (tower._simGoldLastStack) {
                tower._simGoldReward = 0;
            } else {
                tower._simGoldDeltaAccum += Number(skill.goldRewardDelta || 0);
                tower._simGoldReward = Number(skill.goldReward || 0) *
                    Math.max(0, 1 + tower._simGoldDeltaAccum / 100);
                if (tower._simGoldReward > 0 && tower._simGoldReward < 1) {
                    tower._simGoldReward = 1;
                    tower._simGoldLastStack = true;
                }
            }
            if (tower._simGoldReward <= 0) {
                tower._simGoldReward = 0;
                tower._simGoldFarmComplete = true;
                specialEventCounts.goldFarmCompletions++;
                scheduleSynthesisIfReady();
            }
        }

        function nextBossAttackTime() {
            var next = Infinity;
            for (var i = 0; i < towers.length; i++) {
                if (!towers[i]._simRemoved) next = Math.min(next, Math.max(time, towers[i]._simNextAttackAt));
            }
            return next;
        }

        function normalCrowdDps(monsterType) {
            if (prepared.accuracyLevel <= 3) {
                return Number(dpsByType[monsterType] || 0);
            }
            if (prepared.accuracyLevel >= 7) {
                var exactDps = 0;
                for (var towerIndex = 0; towerIndex < towers.length; towerIndex++) {
                    var exactTower = towers[towerIndex];
                    if (exactTower._simRemoved) continue;
                    var exactProfile = prepared.profiles[exactTower.id];
                    if (!exactProfile) continue;
                    exactDps += Number(exactProfile.fullDps[monsterType] || 0) *
                        crowdUtilization(exactTower._simUtilization, active.length);
                }
                return exactDps;
            }
            var fullDps = Number(fullDpsByType[monsterType] || 0);
            if (fullDps <= 0) return 0;
            // 타워별 DPS로 가중한 평균 커버리지. 군집 보정은 한 번만 계산해
            // 이벤트 수×타워 수로 커지는 비용을 피한다.
            var weightedCoverage = clamp(Number(dpsByType[monsterType] || 0) / fullDps, 0, 1);
            return fullDps * crowdUtilization(weightedCoverage, active.length);
        }

        function monsterPositionAt(monster, at) {
            var distance = Math.max(0, at - monster.spawnAt) * Number(monster.speed || 0) * 62.5;
            var lapLength = placement.segmentLengths.reduce(function(sum, value) { return sum + value; }, 0);
            var withinLap = lapLength > 0 ? distance % lapLength : 0;
            var traversed = 0;
            for (var segment = 0; segment < placement.segmentLengths.length; segment++) {
                var length = placement.segmentLengths[segment];
                if (withinLap <= traversed + length || segment === placement.segmentLengths.length - 1) {
                    var ratio = length > 0 ? (withinLap - traversed) / length : 0;
                    return {
                        x: placement.points[segment].x +
                            (placement.points[segment + 1].x - placement.points[segment].x) * ratio,
                        y: placement.points[segment].y +
                            (placement.points[segment + 1].y - placement.points[segment].y) * ratio,
                        progress: distance
                    };
                }
                traversed += length;
            }
            return { x: placement.points[0].x, y: placement.points[0].y, progress: distance };
        }

        function findSpatialTarget(tower, at) {
            var best = null, bestProgress = -1;
            var rangeSq = Number(tower.range || 120) * Number(tower.range || 120);
            for (var i = 0; i < active.length; i++) {
                var monster = active[i];
                if (monster.hp <= 0) continue;
                var point = monsterPositionAt(monster, at);
                var dx = point.x - tower._simX, dy = point.y - tower._simY;
                if (dx * dx + dy * dy <= rangeSq && point.progress > bestProgress) {
                    best = monster;
                    bestProgress = point.progress;
                }
            }
            return best;
        }

        function nextRangeEntryForMonster(tower, monster, after) {
            var pixelsPerSecond = Number(monster.speed || 0) * 62.5;
            if (pixelsPerSecond <= 0) return Infinity;
            var currentDistance = Math.max(0, after - monster.spawnAt) * pixelsPerSecond;
            var lapLength = placement.segmentLengths.reduce(function(sum, value) { return sum + value; }, 0);
            if (lapLength <= 0) return Infinity;
            var currentLap = Math.floor(currentDistance / lapLength);
            var range = Number(tower.range || 120);
            var cumulative = 0;
            var bestDistance = Infinity;
            for (var segment = 0; segment < placement.segmentLengths.length; segment++) {
                var start = placement.points[segment], end = placement.points[segment + 1];
                var vx = end.x - start.x, vy = end.y - start.y;
                var px = start.x - tower._simX, py = start.y - tower._simY;
                var a = vx * vx + vy * vy;
                var b = 2 * (px * vx + py * vy);
                var c = px * px + py * py - range * range;
                var disc = b * b - 4 * a * c;
                if (disc >= 0 && a > 0) {
                    var entry = Math.max(0, Math.min(1, (-b - Math.sqrt(disc)) / (2 * a)));
                    for (var lap = currentLap; lap <= currentLap + 1; lap++) {
                        var absoluteDistance = lap * lapLength + cumulative + entry * placement.segmentLengths[segment];
                        if (absoluteDistance > currentDistance + 1e-6) bestDistance = Math.min(bestDistance, absoluteDistance);
                    }
                }
                cumulative += placement.segmentLengths[segment];
            }
            return Number.isFinite(bestDistance)
                ? monster.spawnAt + bestDistance / pixelsPerSecond : Infinity;
        }

        function nextSpatialAttackTime() {
            var next = Infinity;
            for (var i = 0; i < towers.length; i++) {
                var tower = towers[i];
                if (tower._simRemoved) continue;
                var readyAt = Math.max(time, tower._simNextAttackAt);
                if (findSpatialTarget(tower, readyAt)) {
                    next = Math.min(next, readyAt);
                    continue;
                }
                for (var j = 0; j < active.length; j++) {
                    next = Math.min(next, nextRangeEntryForMonster(tower, active[j], readyAt));
                }
            }
            return next;
        }

        function killSpatialMonster(target) {
            var targetIndex = active.indexOf(target);
            if (targetIndex < 0 || target.hp > 0) return false;
            var killed = active.splice(targetIndex, 1)[0];
            gold += killed.gold;
            if (killed.round === currentRound) waveKills++;
            if (waveActive && currentWave.timeAttack && spawned >= currentWave.count &&
                waveKills >= currentWave.count) completeWave();
            return true;
        }

        function applyPoison(target, tower, skill) {
            if (prepared.accuracyLevel < 13 || !target || !skill) return;
            var duration = Math.max(1, Number(skill.poisonDuration || 0)) / 1000;
            var tickRate = Math.max(1, Number(skill.tickRate || 1000)) / 1000;
            if (!duration) return;
            var key = String(tower._simTowerId);
            target._simPoisons = target._simPoisons || {};
            var poison = target._simPoisons[key];
            specialEventCounts.poisonApplications++;
            if (poison) {
                poison.stacks = Math.min(poison.maxStacks, poison.stacks + 1);
                poison.expiresAt = time + duration;
                return;
            }
            target._simPoisons[key] = {
                tower: tower,
                stacks: 1,
                maxStacks: Math.max(1, Number(skill.maxPoisonStacks || 10)),
                ratio: Number(skill.poisonDamageRatio || 0),
                tickRate: tickRate,
                nextTickAt: time + tickRate,
                expiresAt: time + duration
            };
        }

        function nextPoisonTickTime() {
            if (prepared.accuracyLevel < 13) return Infinity;
            var next = Infinity;
            active.forEach(function(monster) {
                var poisons = monster._simPoisons || {};
                Object.keys(poisons).forEach(function(key) {
                    next = Math.min(next, poisons[key].nextTickAt);
                });
            });
            return next;
        }

        function processPoisonTicks() {
            if (prepared.accuracyLevel < 13) return;
            active.slice().forEach(function(monster) {
                var poisons = monster._simPoisons || {};
                Object.keys(poisons).forEach(function(key) {
                    var poison = poisons[key];
                    while (poison && poison.nextTickAt <= time + 1e-7) {
                        if (poison.nextTickAt <= poison.expiresAt + 1e-7) {
                            var effectiveness = typeEffectiveness(config, poison.tower.attackType, monster.type);
                            var tickDamage = Math.floor(Number(poison.tower.damage || 0) * poison.ratio * effectiveness) *
                                poison.stacks;
                            monster.hp = Math.max(0, monster.hp - tickDamage);
                            specialEventCounts.poisonTicks++;
                        }
                        poison.nextTickAt += poison.tickRate;
                        if (poison.nextTickAt > poison.expiresAt + 1e-7) {
                            delete poisons[key];
                            poison = null;
                        }
                    }
                    if (monster.hp <= 0) killSpatialMonster(monster);
                });
            });
        }

        function applySpatialHit(hit) {
            var targetIndex = active.indexOf(hit.target);
            if (targetIndex < 0 || hit.target.hp <= 0) return;
            hit.target.hp = Math.max(0, hit.target.hp - hit.damage);
            if (hit.target.hp > 0 && hit.durationSkill) applyPoison(hit.target, hit.tower, hit.skill);
            killSpatialMonster(hit.target);
        }

        function closestChainTarget(fromX, fromY, chain, includeHitTargets) {
            var best = null, bestDistance = Infinity;
            active.forEach(function(monster) {
                if (monster.hp <= 0 || (!includeHitTargets && chain.hitIds.indexOf(monster.instanceId) >= 0)) return;
                var point = monsterPositionAt(monster, time);
                var dx = point.x - fromX, dy = point.y - fromY;
                var distanceSq = dx * dx + dy * dy;
                if (Number(chain.skill.bounceRange || 0) > 0 && distanceSq >
                    Number(chain.skill.bounceRange) * Number(chain.skill.bounceRange)) return;
                if (distanceSq < bestDistance) { best = monster; bestDistance = distanceSq; }
            });
            return best;
        }

        function scheduleChainTravel(chain, fromX, fromY, target, returning) {
            var destination = returning
                ? { x: chain.tower._simX, y: chain.tower._simY }
                : monsterPositionAt(target, time);
            var speed = Math.max(1, Number(chain.skill.projectileSpeed || 1)) * 62.5;
            projectiles.push({
                kind: returning ? 'chainReturn' : 'chain',
                hitAt: time + Math.hypot(destination.x - fromX, destination.y - fromY) / speed,
                target: target,
                chain: chain
            });
        }

        function applyChainHit(event) {
            var chain = event.chain;
            if (!chain || chain.remaining <= 0 || chain.tower._simRemoved) return;
            var target = event.target;
            if (active.indexOf(target) < 0 || target.hp <= 0) {
                target = closestChainTarget(chain.fromX, chain.fromY, chain, false) ||
                    closestChainTarget(chain.fromX, chain.fromY, chain, true);
                if (!target) return;
            }
            var targetPoint = monsterPositionAt(target, time);
            var effectiveness = typeEffectiveness(config, chain.tower.attackType, target.type);
            var damage = Math.floor(Number(chain.tower.damage || 0) * effectiveness * chain.damageScale *
                precisionRoundDamageFactor(prepared.accuracyLevel, currentRound, prepared.precisionCalibration));
            if (chain.isCritical) damage = Math.floor(damage * (1 + Number(config.CRITICAL_DAMAGE_RATIO || 0.5)));
            applySpatialHit({ target: target, damage: damage });
            specialEventCounts.chainHits++;
            chain.hitIds.push(target.instanceId);
            chain.damageScale *= Number(chain.skill.bounceDamageMultiplier || 1);
            chain.remaining--;
            chain.fromX = targetPoint.x;
            chain.fromY = targetPoint.y;
            if (chain.remaining <= 0 || !active.length) return;
            var nextTarget = closestChainTarget(chain.fromX, chain.fromY, chain, false);
            if (nextTarget) {
                scheduleChainTravel(chain, chain.fromX, chain.fromY, nextTarget, false);
                return;
            }
            // 실제 단일 대상 연쇄와 같이 타워에 한 번 돌아오며 바운스 하나를 소모한다.
            if (active.length === 1) scheduleChainTravel(chain, chain.fromX, chain.fromY, null, true);
            else {
                chain.hitIds = [];
                nextTarget = closestChainTarget(chain.fromX, chain.fromY, chain, true);
                if (nextTarget) scheduleChainTravel(chain, chain.fromX, chain.fromY, nextTarget, false);
            }
        }

        function applyChainReturn(event) {
            var chain = event.chain;
            if (!chain || chain.remaining <= 0) return;
            chain.remaining--;
            if (chain.remaining <= 0) return;
            chain.hitIds = [];
            chain.fromX = chain.tower._simX;
            chain.fromY = chain.tower._simY;
            var nextTarget = closestChainTarget(chain.fromX, chain.fromY, chain, true);
            if (nextTarget) scheduleChainTravel(chain, chain.fromX, chain.fromY, nextTarget, false);
        }

        function performSpatialAttacks() {
            for (var i = 0; i < towers.length; i++) {
                var tower = towers[i];
                if (tower._simRemoved || tower._simNextAttackAt > time + 1e-7) continue;
                var target = findSpatialTarget(tower, time);
                if (!target) continue;
                tower._simNextAttackAt = time + Math.max(1, Number(tower.attackSpeed || 1000)) / 1000;
                var effectiveness = typeEffectiveness(config, tower.attackType, target.type);
                var damage = Math.floor(Number(tower.damage || 0) * effectiveness *
                    precisionRoundDamageFactor(prepared.accuracyLevel, currentRound, prepared.precisionCalibration));
                var profile = prepared.profiles[tower.id];
                var durationSkill = profile && profile.skill && profile.skill.category === 'duration';
                if (prepared.accuracyLevel >= 13) recordGoldAttack(tower);
                var isCritical = false;
                if (!durationSkill && random() * 10000 < Number(tower.criticalRate || 0)) {
                    isCritical = true;
                    damage = Math.floor(damage * (1 + Number(config.CRITICAL_DAMAGE_RATIO || 0.5)));
                }
                if (prepared.accuracyLevel >= 13 && profile && profile.skill &&
                    profile.skill.nameEn === 'CHAIN_ATTACK') {
                    var chain = {
                        tower: tower,
                        skill: profile.skill,
                        remaining: Math.max(1, Number(profile.skill.bounceCount || 1)),
                        damageScale: 1,
                        isCritical: isCritical,
                        hitIds: [],
                        fromX: tower._simX,
                        fromY: tower._simY
                    };
                    scheduleChainTravel(chain, tower._simX, tower._simY, target, false);
                } else if (prepared.accuracyLevel >= 12 && profile && profile.skill &&
                    Number(profile.skill.projectileSpeed || 0) > 0) {
                    var targetPoint = monsterPositionAt(target, time);
                    var distance = Math.hypot(targetPoint.x - tower._simX, targetPoint.y - tower._simY);
                    projectiles.push({
                        hitAt: time + distance / (Number(profile.skill.projectileSpeed) * 62.5),
                        target: target, damage: damage, tower: tower, skill: profile.skill,
                        durationSkill: durationSkill
                    });
                } else {
                    applySpatialHit({ target: target, damage: damage });
                }
            }
        }

        function performBossAttacks(head) {
            for (var i = 0; i < towers.length; i++) {
                var tower = towers[i];
                if (tower._simRemoved || tower._simNextAttackAt > time + 1e-9) continue;
                var attackInterval = Math.max(1, Number(tower.attackSpeed || 1000)) / 1000;
                tower._simNextAttackAt = time + attackInterval;
                if (random() > tower._simUtilization) continue;
                var effectiveness = typeEffectiveness(config, tower.attackType, head.type);
                var damage = Math.floor(Number(tower.damage || 0) * effectiveness);
                var profile = prepared.profiles[tower.id];
                var durationSkill = profile && profile.skill && profile.skill.category === 'duration';
                if (!durationSkill && random() * 10000 < Number(tower.criticalRate || 0)) {
                    damage = Math.floor(damage * (1 + Number(config.CRITICAL_DAMAGE_RATIO || 0.5)));
                }
                head.hp = Math.max(0, head.hp - damage);
            }
        }

        function performSynthesis() {
            var consumed = [];
            var kept = [];
            for (var i = 0; i < towers.length; i++) {
                if (isSynthesisNormalTower(towers[i]) && consumed.length < 3) consumed.push(towers[i]);
                else kept.push(towers[i]);
            }
            if (consumed.length < 3) {
                nextSynthesisAt = Infinity;
                return;
            }
            consumed.forEach(removeTower);
            towers = kept;
            addTower(rollUnit(random, prepared, config.SYNTHESIS_RATES || {}, SYNTHESIS_TIERS));
            nextSynthesisAt = Infinity;
            scheduleSynthesisIfReady();
        }

        function completeWave() {
            if (!waveActive || !currentWave) return;
            waveActive = false;
            deadline = Infinity;
            nextSpawnAt = Infinity;
            var roundBonus = Math.floor(currentRound * Number(config.ROUND_BONUS_MULTIPLIER || 0));
            roundBonus = Math.floor(roundBonus * (currentMonster && currentMonster.isBoss ? 1.5 : 0.7));
            gold += roundBonus + Number(currentWave.clearGoldBonus || 0);
            if (currentRound >= prepared.totalRounds) {
                victory = true;
                return;
            }
            var nextWave = prepared.waveByRound[currentRound + 1];
            var nextMonster = nextWave && prepared.monsters[String(nextWave.monsterId)];
            var delayMs = currentMonster && currentMonster.isBoss
                ? Number(config.BETWEEN_ROUND_DELAY_BOSS_END || 3000)
                : nextMonster && nextMonster.isBoss
                    ? Number(config.BETWEEN_ROUND_DELAY_BOSS_START || 3000)
                    : Number(config.BETWEEN_ROUND_DELAY || 1000);
            nextWaveAt = time + delayMs / 1000;
        }

        function startWave() {
            currentRound++;
            currentWave = prepared.waveByRound[currentRound];
            if (!currentWave) {
                victory = currentRound > prepared.totalRounds;
                return;
            }
            currentMonster = prepared.monsters[String(currentWave.monsterId)];
            if (!currentMonster) {
                failed = true;
                failReason = 'normal_life';
                return;
            }
            var group = currentRound <= 10 ? 'early' : (currentRound <= 30 ? 'mid' : 'late');
            if (currentRound >= 2) {
                hpRoundSums[group] += Math.max(0, Number(config.MAX_MONSTERS || 50) - active.length);
                hpRoundCounts[group]++;
            }
            spawned = 0;
            waveKills = 0;
            waveActive = true;
            nextWaveAt = Infinity;
            var interval = Number(currentWave.spawnInterval || config.SPAWN_INTERVAL || 1800);
            if (!currentMonster.isBoss) interval *= Number(config.NORMAL_SPAWN_INTERVAL_MULTIPLIER || 1);
            nextSpawnAt = time + Math.round(interval) / 1000;
            deadline = currentWave.timeAttack && Number(currentWave.timeLimit || 0) > 0
                ? time + Number(currentWave.timeLimit)
                : Infinity;
        }

        // 정확도 13은 파생 타워의 추가 적중·독 틱까지 개별 이벤트로 처리하므로
        // 상한을 넉넉히 둔다. 실제 종료 시간은 사용자가 설정한 계산 시간으로 제어한다.
        var precisionEventLimit = prepared.accuracyLevel >= 13 ? 5000000 : (prepared.accuracyLevel >= 12 ? 500000 :
            (prepared.accuracyLevel >= 11 ? 250000 : 20000));
        while (!victory && !failed && stepCount++ < precisionEventLimit && time < 20000) {
            var head = active.length ? active[0] : null;
            var headDps = head ? normalCrowdDps(head.type) : 0;
            var isBossHead = head && head.type.indexOf('boss_') === 0;
            var spatialMode = prepared.accuracyLevel >= 11;
            var deathAt = !spatialMode && head && !isBossHead && headDps > 0 ? time + head.hp / headDps : Infinity;
            var bossAttackAt = !spatialMode && isBossHead ? nextBossAttackTime() : Infinity;
            var spatialAttackAt = spatialMode && active.length ? nextSpatialAttackTime() : Infinity;
            var projectileHitAt = spatialMode && projectiles.length
                ? projectiles.reduce(function(next, projectile) { return Math.min(next, projectile.hitAt); }, Infinity)
                : Infinity;
            var poisonTickAt = spatialMode ? nextPoisonTickTime() : Infinity;
            var eventAt = Math.min(deathAt, bossAttackAt, spatialAttackAt, projectileHitAt,
                poisonTickAt, deadline, nextSynthesisAt, nextGachaAt, nextWaveAt, nextSpawnAt);
            if (!Number.isFinite(eventAt)) break;

            var elapsed = Math.max(0, eventAt - time);
            if (!spatialMode && head && !isBossHead && headDps > 0) head.hp = Math.max(0, head.hp - headDps * elapsed);
            if (!spatialMode) accrueTowerGold(elapsed);
            time = eventAt;

            if (deadline === eventAt) {
                failed = true;
                failReason = 'boss_timeout';
                break;
            }
            if (bossAttackAt === eventAt) {
                performBossAttacks(head);
                if (head.hp <= 0) {
                    var killedBoss = active.shift();
                    gold += killedBoss.gold;
                    if (killedBoss.round === currentRound) waveKills++;
                    if (waveActive && currentWave.timeAttack && spawned >= currentWave.count &&
                        waveKills >= currentWave.count) completeWave();
                }
                continue;
            }
            if (projectileHitAt === eventAt) {
                var dueProjectiles = [];
                var pendingProjectiles = [];
                projectiles.forEach(function(projectile) {
                    if (projectile.hitAt <= time + 1e-7) dueProjectiles.push(projectile);
                    else pendingProjectiles.push(projectile);
                });
                projectiles = pendingProjectiles;
                dueProjectiles.forEach(function(projectile) {
                    if (projectile.kind === 'chain') applyChainHit(projectile);
                    else if (projectile.kind === 'chainReturn') applyChainReturn(projectile);
                    else applySpatialHit(projectile);
                });
                continue;
            }
            if (poisonTickAt === eventAt) {
                processPoisonTicks();
                continue;
            }
            if (spatialAttackAt === eventAt) {
                performSpatialAttacks();
                continue;
            }
            if (deathAt === eventAt) {
                var killed = active.shift();
                gold += killed.gold;
                if (killed.round === currentRound) waveKills++;
                if (waveActive && currentWave.timeAttack && spawned >= currentWave.count &&
                    waveKills >= currentWave.count) completeWave();
                continue;
            }
            if (nextSynthesisAt === eventAt) {
                performSynthesis();
                continue;
            }
            if (nextGachaAt === eventAt) {
                nextGachaAt += prepared.autoGachaInterval;
                if (nextSynthesisAt === Infinity && gold >= Number(config.GACHA_COST || 100)) {
                    gold -= Number(config.GACHA_COST || 100);
                    addTower(rollUnit(random, prepared, config.GACHA_RATES || {}, TIERS));
                    scheduleSynthesisIfReady();
                }
                continue;
            }
            if (nextWaveAt === eventAt) {
                startWave();
                continue;
            }
            if (nextSpawnAt === eventAt) {
                var hpMult = 1 + currentRound * Number(config.MONSTER_HP_ROUND_RATE || 0.0115);
                var goldMult = 1 + currentRound * Number(config.GOLD_ROUND_RATE || 0.005);
                active.push({
                    instanceId: nextMonsterInstanceId++,
                    round: currentRound,
                    type: currentMonster.type,
                    hp: Math.floor(Number(currentMonster.hp || 0) * hpMult),
                    gold: Math.round(Number(currentMonster.goldReward || 0) * goldMult * 10) / 10,
                    speed: Number(currentMonster.speed || 0),
                    spawnAt: time,
                    _simPoisons: {}
                });
                spawned++;
                if (active.length >= Number(config.MAX_MONSTERS || 50)) {
                    failed = true;
                    failReason = currentMonster.isBoss ? 'boss_life' : 'normal_life';
                    break;
                }
                if (spawned >= Number(currentWave.count || 0)) {
                    nextSpawnAt = Infinity;
                    if (!currentWave.timeAttack) completeWave();
                } else {
                    var nextInterval = Number(currentWave.spawnInterval || config.SPAWN_INTERVAL || 1800);
                    if (!currentMonster.isBoss) nextInterval *= Number(config.NORMAL_SPAWN_INTERVAL_MULTIPLIER || 1);
                    nextSpawnAt = time + Math.round(nextInterval) / 1000;
                }
            }
        }

        if (!victory && !failed) {
            failed = true;
            failReason = currentMonster && currentMonster.isBoss ? 'boss_timeout' : 'normal_life';
        }

        var gsSum = 0;
        var gsCount = 0;
        towers.forEach(function(unit) {
            var gs = Number(unit.gradeScore || 0);
            if (gs > 0) { gsSum += gs; gsCount++; }
        });
        var hpAvg = {};
        ['early', 'mid', 'late'].forEach(function(group) {
            if (hpRoundCounts[group] > 0) hpAvg[group] = hpRoundSums[group] / hpRoundCounts[group];
        });
        return {
            win: victory,
            round: Math.min(prepared.totalRounds, Math.max(1, currentRound)),
            time: time,
            gs: gsCount > 0 ? Math.round(gsSum / gsCount) : 0,
            failReason: victory ? 'clear' : failReason,
            failCategory: victory ? 'clear' : (failReason.indexOf('boss_') === 0 ? 'boss' : 'normal'),
            hpAvg: hpAvg,
            specialEventCounts: specialEventCounts,
            precisionLimitReached: stepCount >= precisionEventLimit
        };
    }

    function addResult(aggregate, result) {
        aggregate.totalTime += result.time || 0;
        if (result.precisionLimitReached) aggregate.precisionLimitHits++;
        ['early', 'mid', 'late'].forEach(function(group) {
            if (result.hpAvg && Number.isFinite(result.hpAvg[group])) {
                aggregate.hpSums[group] += result.hpAvg[group];
                aggregate.hpCounts[group]++;
            }
        });
        if (result.win) {
            aggregate.clears++;
            if (result.gs > 0) {
                aggregate.clearGsSum += result.gs;
                aggregate.clearGsCount++;
                aggregate.recentClearGs.push(result.gs);
                if (aggregate.recentClearGs.length > 5) aggregate.recentClearGs.shift();
            }
            return;
        }
        aggregate.failures++;
        aggregate.failRoundSum += result.round;
        aggregate.failCounts[result.round]++;
        if (result.gs > 0) {
            aggregate.failGsSum += result.gs;
            aggregate.failGsCount++;
            aggregate.failGsSums[result.round] += result.gs;
            aggregate.failGsCounts[result.round]++;
        }
        if (result.failCategory === 'boss') aggregate.bossFails++;
        else aggregate.normalFails++;
        if (result.failReason === 'boss_timeout') aggregate.bossTimeouts++;
    }

    function mergeAggregates(existing, incoming) {
        if (!incoming) return existing || null;
        var existingAccuracy = existing && existing.assumptions && Number(existing.assumptions.accuracyLevel || 6);
        var incomingAccuracy = incoming.assumptions && Number(incoming.assumptions.accuracyLevel || 6);
        if (!existing || existing.version !== incoming.version || existing.model !== incoming.model ||
            existingAccuracy !== incomingAccuracy) {
            incoming.batches = Number(incoming.batches || 1);
            return incoming;
        }

        var merged = emptyAggregate(0, Number(existing.seedBase || incoming.seedBase || 0), incomingAccuracy);
        var sumFields = [
            'total', 'clears', 'failures', 'clearGsSum', 'clearGsCount',
            'failGsSum', 'failGsCount', 'failRoundSum', 'totalTime',
            'normalFails', 'bossFails', 'bossTimeouts', 'elapsedMs', 'precisionLimitHits'
        ];
        sumFields.forEach(function(field) {
            merged[field] = Number(existing[field] || 0) + Number(incoming[field] || 0);
        });
        ['failCounts', 'failGsSums', 'failGsCounts'].forEach(function(field) {
            for (var i = 0; i < merged[field].length; i++) {
                merged[field][i] = Number(existing[field] && existing[field][i] || 0) +
                    Number(incoming[field] && incoming[field][i] || 0);
            }
        });
        ['early', 'mid', 'late'].forEach(function(group) {
            merged.hpSums[group] = Number(existing.hpSums && existing.hpSums[group] || 0) +
                Number(incoming.hpSums && incoming.hpSums[group] || 0);
            merged.hpCounts[group] = Number(existing.hpCounts && existing.hpCounts[group] || 0) +
                Number(incoming.hpCounts && incoming.hpCounts[group] || 0);
        });
        merged.recentClearGs = (existing.recentClearGs || []).concat(incoming.recentClearGs || []).slice(-5);
        merged.batches = Number(existing.batches || 1) + Number(incoming.batches || 1);
        merged.requestedIterations = Number(existing.requestedIterations || existing.total || 0) +
            Number(incoming.requestedIterations || incoming.total || 0);
        merged.stoppedByTimeLimit = !!(existing.stoppedByTimeLimit || incoming.stoppedByTimeLimit);
        merged.completedAt = Number(incoming.completedAt || Date.now());
        merged.lastSeedBase = Number(incoming.seedBase || 0) >>> 0;
        merged.assumptions = incoming.assumptions || existing.assumptions || merged.assumptions;
        return merged;
    }

    function run(options, onProgress) {
        var iterations = Math.max(1, Math.floor(Number(options.iterations || 100000)));
        var seedBase = Number(options.seedBase === undefined ? 0x9e3779b9 : options.seedBase) >>> 0;
        var prepared = prepare(options);
        var aggregate = emptyAggregate(0, seedBase, prepared.accuracyLevel);
        aggregate.requestedIterations = iterations;
        var startedAt = Date.now();
        var maxDurationMs = Math.max(0, Number(options.maxDurationMs || 0));
        var progressStep = Math.max(100, Math.floor(iterations / 100));
        for (var i = 0; i < iterations; i++) {
            addResult(aggregate, simulateOne(prepared, (seedBase + i * 97) >>> 0));
            aggregate.total++;
            if (onProgress && ((i + 1) % progressStep === 0 || i + 1 === iterations)) {
                onProgress(i + 1, iterations);
            }
            if (maxDurationMs > 0 && Date.now() - startedAt >= maxDurationMs) {
                aggregate.stoppedByTimeLimit = i + 1 < iterations;
                break;
            }
        }
        aggregate.completedAt = Date.now();
        aggregate.elapsedMs = aggregate.completedAt - startedAt;
        aggregate.totalTime = Math.round(aggregate.totalTime);
        return aggregate;
    }

    return {
        VERSION: VERSION,
        MODEL: MODEL,
        createRng: createRng,
        crowdUtilization: crowdUtilization,
        getGachaEligibleUnits: getGachaEligibleUnits,
        mergeAggregates: mergeAggregates,
        simulateOne: function(options, seed) { return simulateOne(prepare(options), seed); },
        run: run
    };
}));
