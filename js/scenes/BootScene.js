var Game = window.Game || {};
var PROJECTILE_ASSET_VERSION = '1789006000';

function versionedAssetPath(path) {
    return path + (path.indexOf('?') === -1 ? '?' : '&') + 'v=' + PROJECTILE_ASSET_VERSION;
}

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
        this.load.json('stats', versionedAssetPath('assets/data/stats.json'));

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
                        self.load.image(imgKey, versionedAssetPath(path));
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
        // sessionStorage는 창(탭)별로 분리되어 다른 시뮬레이션 창과 충돌하지 않는다.
        var simAutoRestart = false;
        var simRunActive = false;
        var devModeEnabled = false;
        var dpsModeEnabled = false;
        var devToolsEnabled = !Game.Runtime || Game.Runtime.isDevToolsEnabled();
        var simInstanceId = null;
        try {
            simInstanceId = sessionStorage.getItem('rtd_simInstanceId');
            if (!simInstanceId) {
                simInstanceId = 'tab_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
                sessionStorage.setItem('rtd_simInstanceId', simInstanceId);
            }
            var autoRestartKey = 'rtd_simAutoRestart_' + simInstanceId;
            var runActiveKey = 'rtd_simRunActive_' + simInstanceId;
            simAutoRestart = sessionStorage.getItem(autoRestartKey) === '1';
            simRunActive = sessionStorage.getItem(runActiveKey) === '1';
            sessionStorage.removeItem(autoRestartKey);
            devModeEnabled = localStorage.getItem('rtd_devMode') === '1';
            dpsModeEnabled = localStorage.getItem('rtd_dpsMode') === '1';
        } catch(e) {}

        if (!devToolsEnabled) {
            devModeEnabled = false;
            dpsModeEnabled = false;
        }

        // 게임오버 직후뿐 아니라 브라우저의 탭 폐기·복원 등 예기치 않은 재로드 후에도
        // 실행 중이던 DEV 시뮬레이션을 계속한다. DPS 모드가 켜졌다면 DEV 복귀를 막는다.
        if ((simAutoRestart || simRunActive) && devModeEnabled && !dpsModeEnabled) {
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
