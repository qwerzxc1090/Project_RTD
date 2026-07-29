var Game = window.Game || {};

Game.BootScene = new Phaser.Class({
    Extends: Phaser.Scene,
    
    initialize: function BootScene() {
        Phaser.Scene.call(this, { key: 'BootScene' });
    },
    
    preload: function() {
        // ── 투사체 이미지 프리로드 ──
        // 파일이 없으면 fallback(프로그래매틱) 렌더링으로 대체
        var self = this;
        this._missingTextures = {};

        this.load.on('fileerror', function(file) {
            self._missingTextures[file.key] = true;
            console.warn('[BootScene] 이미지 없음 (fallback 사용):', file.key, '→', file.src);
        });

        // ── 데이터 프리로드 (JSON) ──
        this.load.json('stats', 'assets/data/stats.json');

        this.load.once('filecomplete-json-stats', function(key, type, data) {
            var stats = data;
            // ── 스킬 투사체 이미지 로드 ──
            if (stats && stats.skills) {
                for (var sid in stats.skills) {
                    var sk = stats.skills[sid];
                    var path = sk.imagePath;
                    if (path) {
                        if (!path.startsWith('assets')) {
                            path = 'assets/Art/projectiles/' + path;
                        }
                        var imgKey = sk.imageKey || ('proj_' + sk.id);
                        self.load.image(imgKey, path);
                    }
                }
            }
            // ── 몬스터 이미지 로드 ──
            if (stats && stats.monsters) {
                for (var mid in stats.monsters) {
                    var mn = stats.monsters[mid];
                    if (mn.imagePath) {
                        var mPath = mn.imagePath;
                        if (!mPath.startsWith('assets')) {
                            mPath = 'assets/Art/monsters/' + mPath;
                        }
                        self.load.image('monster_' + mn.id, mPath);
                    }
                }
            }
        });
    },
    
    create: function() {
        // Generate textures programmatically
        this._generateTextures();
        
        // Remove loading screen
        var loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            setTimeout(function() {
                loadingScreen.style.display = 'none';
            }, 500);
        }
        
        // 데이터 주입 (JSON)
        var stats = this.cache.json.get('stats');
        if (stats) {
            if (Game.UnitData && Game.UnitData.init) Game.UnitData.init(stats.units);
            if (Game.MonsterData && Game.MonsterData.init) Game.MonsterData.init(stats.monsters);
            if (Game.WaveData && Game.WaveData.init) Game.WaveData.init(stats.waves);
            if (Game.SkillData && Game.SkillData.init) Game.SkillData.init(stats.skills);
            // DPS MODE 데이터
            if (stats.dpsMode) Game.DpsModeData = stats.dpsMode;
        }

        // ── SIM 자동 재시작(게임오버 후 리로드)이면 메뉴 건너뛰고 GameScene 직행 ──
        var simAutoRestart = false;
        try {
            simAutoRestart = localStorage.getItem('rtd_simAutoRestart') === '1';
            localStorage.removeItem('rtd_simAutoRestart');
        } catch(e) {}

        // 멀티 시뮬레이션(?sim=X)의 자동 재시작도 동일 처리
        var urlParams = new URLSearchParams(window.location.search);
        var simId = urlParams.get('sim');
        if (simId) {
            try {
                simAutoRestart = localStorage.getItem('rtd_simAutoRestart_' + simId) === '1';
                localStorage.removeItem('rtd_simAutoRestart_' + simId);
            } catch(e) {}
        }

        if (simAutoRestart) {
            this.scene.start('GameScene');
        } else {
            this.scene.start('MenuScene');
        }
    },
    
    _generateTextures: function() {
        // Generate a simple particle texture
        var particleG = this.add.graphics();
        particleG.fillStyle(0xFFFFFF, 1);
        particleG.fillCircle(4, 4, 4);
        particleG.generateTexture('particle', 8, 8);
        particleG.destroy();
        
        // Generate grid cell texture
        var gridG = this.add.graphics();
        gridG.fillStyle(0x1a1a2e, 0.3);
        gridG.fillRect(0, 0, Game.Config.TILE_SIZE, Game.Config.TILE_SIZE);
        gridG.lineStyle(1, 0x2a2a4e, 0.2);
        gridG.strokeRect(0, 0, Game.Config.TILE_SIZE, Game.Config.TILE_SIZE);
        gridG.generateTexture('gridCell', Game.Config.TILE_SIZE, Game.Config.TILE_SIZE);
        gridG.destroy();
        
        // Generate valid placement cell
        var validG = this.add.graphics();
        validG.fillStyle(0x224422, 0.5);
        validG.fillRect(0, 0, Game.Config.TILE_SIZE, Game.Config.TILE_SIZE);
        validG.lineStyle(1, 0x44FF44, 0.3);
        validG.strokeRect(0, 0, Game.Config.TILE_SIZE, Game.Config.TILE_SIZE);
        validG.generateTexture('gridCellValid', Game.Config.TILE_SIZE, Game.Config.TILE_SIZE);
        validG.destroy();
        
        // Generate invalid placement cell
        var invalidG = this.add.graphics();
        invalidG.fillStyle(0x442222, 0.5);
        invalidG.fillRect(0, 0, Game.Config.TILE_SIZE, Game.Config.TILE_SIZE);
        invalidG.lineStyle(1, 0xFF4444, 0.3);
        invalidG.strokeRect(0, 0, Game.Config.TILE_SIZE, Game.Config.TILE_SIZE);
        invalidG.generateTexture('gridCellInvalid', Game.Config.TILE_SIZE, Game.Config.TILE_SIZE);
        invalidG.destroy();
    }
});

window.Game = Game;
