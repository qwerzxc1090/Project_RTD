var Game = window.Game || {};

// ── 밸런스 기준 (2025-06-07 v6) ──
//  보스 라운드: 8, 16, 24, 32, 40, 48, 49, 50
//  나머지: 일반 라운드
//
//  ★ 핵심: WaveSystem.getStageMultiplier(round) = 1 + round * 0.1
//    실제 HP = baseHP × (1 + round × 0.1)

// ── localStorage 오버라이드 지원 ──
// tools/data-editor.html 에서 저장한 값이 있으면 그 값을 사용
(function() {
    var DEFAULT_WAVES = [
        // ── Round 1-7: 초반 일반 ──
        { round: 1, monsterId: 1, count: 23, timeLimit: 0, timeAttack: false },
        { round: 2, monsterId: 2, count: 10, timeLimit: 0, timeAttack: false },
        { round: 3, monsterId: 3, count: 5, timeLimit: 0, timeAttack: false },
        { round: 4, monsterId: 4, count: 10, timeLimit: 0, timeAttack: false },
        { round: 5, monsterId: 5, count: 25, timeLimit: 0, timeAttack: false },
        { round: 6, monsterId: 6, count: 20, timeLimit: 0, timeAttack: false },
        { round: 7, monsterId: 7, count: 22, timeLimit: 0, timeAttack: false },

        // ── Round 8: 보스 1 (타임어택 60초) ──
        { round: 8, monsterId: 8, count: 1, timeLimit: 60, timeAttack: true },

        // ── Round 9-15: 일반 ──
        { round: 9, monsterId: 9, count: 25, timeLimit: 0, timeAttack: false },
        { round: 10, monsterId: 10, count: 27, timeLimit: 0, timeAttack: false },
        { round: 11, monsterId: 11, count: 29, timeLimit: 0, timeAttack: false },
        { round: 12, monsterId: 12, count: 25, timeLimit: 0, timeAttack: false },
        { round: 13, monsterId: 13, count: 27, timeLimit: 0, timeAttack: false },
        { round: 14, monsterId: 14, count: 29, timeLimit: 0, timeAttack: false },
        { round: 15, monsterId: 15, count: 27, timeLimit: 0, timeAttack: false },

        // ── Round 16: 보스 2 (타임어택 60초) ──
        { round: 16, monsterId: 16, count: 1, timeLimit: 60, timeAttack: true },

        // ── Round 17-23: 일반 ──
        { round: 17, monsterId: 17, count: 27, timeLimit: 0, timeAttack: false },
        { round: 18, monsterId: 18, count: 31, timeLimit: 0, timeAttack: false },
        { round: 19, monsterId: 19, count: 25, timeLimit: 0, timeAttack: false },
        { round: 20, monsterId: 20, count: 29, timeLimit: 0, timeAttack: false },
        { round: 21, monsterId: 21, count: 31, timeLimit: 0, timeAttack: false },
        { round: 22, monsterId: 22, count: 29, timeLimit: 0, timeAttack: false },
        { round: 23, monsterId: 23, count: 29, timeLimit: 0, timeAttack: false },

        // ── Round 24: 보스 3 (타임어택 60초) ──
        { round: 24, monsterId: 24, count: 1, timeLimit: 60, timeAttack: true },

        // ── Round 25-31: 일반 ──
        { round: 25, monsterId: 25, count: 29, timeLimit: 0, timeAttack: false },
        { round: 26, monsterId: 26, count: 31, timeLimit: 0, timeAttack: false },
        { round: 27, monsterId: 27, count: 29, timeLimit: 0, timeAttack: false },
        { round: 28, monsterId: 28, count: 29, timeLimit: 0, timeAttack: false },
        { round: 29, monsterId: 29, count: 31, timeLimit: 0, timeAttack: false },
        { round: 30, monsterId: 30, count: 31, timeLimit: 0, timeAttack: false },
        { round: 31, monsterId: 31, count: 31, timeLimit: 0, timeAttack: false },

        // ── Round 32: 보스 4 (타임어택 60초) ──
        { round: 32, monsterId: 32, count: 1, timeLimit: 60, timeAttack: true },

        // ── Round 33-39: 일반 ──
        { round: 33, monsterId: 33, count: 31, timeLimit: 0, timeAttack: false },
        { round: 34, monsterId: 34, count: 34, timeLimit: 0, timeAttack: false },
        { round: 35, monsterId: 35, count: 31, timeLimit: 0, timeAttack: false },
        { round: 36, monsterId: 36, count: 36, timeLimit: 0, timeAttack: false },
        { round: 37, monsterId: 37, count: 31, timeLimit: 0, timeAttack: false },
        { round: 38, monsterId: 38, count: 34, timeLimit: 0, timeAttack: false },
        { round: 39, monsterId: 39, count: 36, timeLimit: 0, timeAttack: false },

        // ── Round 40: 보스 5 (타임어택 60초) ──
        { round: 40, monsterId: 40, count: 1, timeLimit: 60, timeAttack: true },

        // ── Round 41-47: 일반 ──
        { round: 41, monsterId: 41, count: 34, timeLimit: 0, timeAttack: false },
        { round: 42, monsterId: 42, count: 38, timeLimit: 0, timeAttack: false },
        { round: 43, monsterId: 43, count: 36, timeLimit: 0, timeAttack: false },
        { round: 44, monsterId: 44, count: 36, timeLimit: 0, timeAttack: false },
        { round: 45, monsterId: 45, count: 34, timeLimit: 0, timeAttack: false },
        { round: 46, monsterId: 46, count: 34, timeLimit: 0, timeAttack: false },
        { round: 47, monsterId: 47, count: 34, timeLimit: 0, timeAttack: false },

        // ── Round 48-50: 보스 연속 (타임어택 60초) ──
        { round: 48, monsterId: 48, count: 1, timeLimit: 60, timeAttack: true },
        { round: 49, monsterId: 49, count: 1, timeLimit: 60, timeAttack: true },
        { round: 50, monsterId: 50, count: 1, timeLimit: 60, timeAttack: true },
    ];

    // localStorage 오버라이드 로드

    var waves = DEFAULT_WAVES;
    try {
        var saved = localStorage.getItem('rtd_waveData');
        if (saved) {
            var parsed = JSON.parse(saved);
            var loadedWaves = null;
            if (Array.isArray(parsed) && parsed.length === 50) {
                loadedWaves = parsed;
            } else if (parsed && parsed.waves && parsed.waves.length === 50) {
                loadedWaves = parsed.waves;
            }
            
            if (loadedWaves) {
                waves = loadedWaves;
                // timeAttack은 스테이지 데이터에 명시된 값만 사용한다.
                waves.forEach(function(w) {
                    if (w.timeAttack === undefined) {
                        w.timeAttack = false;
                    }
                });
            }
        }
    } catch(e) {}

    Game.WaveData = {
        waves: waves,

        getWave: function(round) {
            return this.waves.find(function(w) { return w.round === round; });
        },

        isBossRound: function(round) {
            var w = this.getWave(round);
            return w ? w.isBoss : false;
        },

        getBossRounds: function() {
            return this.waves.filter(function(w) { return w.isBoss; }).map(function(w) { return w.round; });
        }
    };
})();

window.Game = Game;
