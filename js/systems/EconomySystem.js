var Game = window.Game || {};

Game.EconomySystem = {
    _gold: 0,
    _lives: 0,
    _onGoldChange: null,
    _onLivesChange: null,
    
    init: function() {
        this._gold = Game.Config.INITIAL_GOLD;
        this._lives = Game.Config.INITIAL_LIVES;
    },
    
    // Gold management
    getGold: function() {
        return Math.floor(this._gold);  // 외부에는 항상 정수 반환
    },
    
    getGoldRaw: function() {
        return this._gold;  // 내부 실제 누적값 (화면 표시만 정수)
    },
    
    addGold: function(amount) {
        // 실제 골드값은 반올림하지 않고 누적하며, 외부 표시만 정수로 내림
        this._gold += Number(amount) || 0;
        if (this._onGoldChange) this._onGoldChange(Math.floor(this._gold));
    },
    
    spendGold: function(amount) {
        if (Math.floor(this._gold) < amount) return false;
        this._gold -= amount;
        if (this._onGoldChange) this._onGoldChange(Math.floor(this._gold));
        return true;
    },
    
    canAfford: function(amount) {
        return Math.floor(this._gold) >= amount;
    },
    
    // Lives management - now based on monster count on field
    getLives: function() {
        return this._lives;
    },
    
    setLives: function(lives) {
        this._lives = Math.max(0, Math.min(Game.Config.MAX_MONSTERS, lives));
        if (this._onLivesChange) this._onLivesChange(this._lives);
        return this._lives <= 0;
    },
    
    // Update lives based on monster count on field
    // lives = MAX_MONSTERS - currentMonsterCount
    updateLivesFromMonsterCount: function(monsterCount) {
        this._lives = Math.max(0, Game.Config.MAX_MONSTERS - monsterCount);
        if (this._onLivesChange) this._onLivesChange(this._lives);
        return this._lives <= 0;
    },
    
    isGameOver: function() {
        return this._lives <= 0;
    },
    
    // Callbacks
    onGoldChange: function(callback) {
        this._onGoldChange = callback;
    },
    
    onLivesChange: function(callback) {
        this._onLivesChange = callback;
    },
    
    // Reset
    reset: function() {
        this.init();
    }
};

window.Game = Game;
