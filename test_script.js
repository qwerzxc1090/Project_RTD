
// ═══════════════════════════════════════════════
// DEFAULT DATA
// ═══════════════════════════════════════════════
const DEFAULT_CONFIG = {
  INITIAL_GOLD: 500,
  GACHA_COST: 50,
  ROUND_BONUS_MULTIPLIER: 2.45,
  INITIAL_LIVES: 50,
  MAX_MONSTERS: 50,
  TOTAL_ROUNDS: 50,
  SPAWN_INTERVAL: 800,
  GACHA_RATES: {
    normal: 0.5000, rare: 0.3310, ancient: 0.1020, relic: 0.0510,
    saga: 0.0080, legend: 0.0050, epic: 0.0020, myth: 0.0008, primordial: 0.00019
  },
  TYPE_AFFINITY: {
    normal:    { small: 1.0, large: 1.0 },
    explosive: { small: 0.7, large: 1.5 },
    vibration: { small: 1.5, large: 0.7 }
  }
};

const DEFAULT_UNITS = [
  {id:"n1",name:"병사",tier:"normal",attackType:"normal",damage:20,attackSpeed:1000,range:120,skillId:1},
  {id:"n2",name:"폭파병",tier:"normal",attackType:"explosive",damage:23,attackSpeed:1300,range:100,skillId:3},
  {id:"n3",name:"진동병",tier:"normal",attackType:"vibration",damage:16,attackSpeed:700,range:132,skillId:3},
  {id:"r1",name:"기사",tier:"rare",attackType:"normal",damage:25,attackSpeed:900,range:130,skillId:2},
  {id:"r2",name:"포병",tier:"rare",attackType:"explosive",damage:30,attackSpeed:1170,range:110,skillId:3},
  {id:"r3",name:"음파사",tier:"rare",attackType:"vibration",damage:20,attackSpeed:630,range:143,skillId:1},
  {id:"a1",name:"마법사",tier:"ancient",attackType:"normal",damage:66,attackSpeed:800,range:145,skillId:2},
  {id:"a2",name:"화염포",tier:"ancient",attackType:"explosive",damage:79,attackSpeed:1040,range:123,skillId:1},
  {id:"a3",name:"진동사",tier:"ancient",attackType:"vibration",damage:52,attackSpeed:560,range:160,skillId:1},
  {id:"e1",name:"성기사",tier:"relic",attackType:"normal",damage:109,attackSpeed:720,range:160,skillId:1},
  {id:"e2",name:"포격사",tier:"relic",attackType:"explosive",damage:130,attackSpeed:936,range:136,skillId:3},
  {id:"e3",name:"공명사",tier:"relic",attackType:"vibration",damage:87,attackSpeed:504,range:176,skillId:3},
  {id:"s1",name:"대마법사",tier:"saga",attackType:"normal",damage:527,attackSpeed:600,range:190,skillId:3},
  {id:"s2",name:"파괴자",tier:"saga",attackType:"explosive",damage:632,attackSpeed:780,range:162,skillId:2},
  {id:"s3",name:"공명자",tier:"saga",attackType:"vibration",damage:421,attackSpeed:420,range:209,skillId:2},
  {id:"l1",name:"전설 전사",tier:"legend",attackType:"normal",damage:697,attackSpeed:550,range:210,skillId:1},
  {id:"l2",name:"전설 포격",tier:"legend",attackType:"explosive",damage:836,attackSpeed:715,range:179,skillId:2},
  {id:"l3",name:"전설 음률",tier:"legend",attackType:"vibration",damage:558,attackSpeed:385,range:231,skillId:2},
  {id:"ep1",name:"에픽 현자",tier:"epic",attackType:"normal",damage:1357,attackSpeed:480,range:240,skillId:3},
  {id:"ep2",name:"에픽 파괴",tier:"epic",attackType:"explosive",damage:1629,attackSpeed:624,range:204,skillId:1},
  {id:"ep3",name:"에픽 공명",tier:"epic",attackType:"vibration",damage:1086,attackSpeed:336,range:264,skillId:2},
  {id:"m1",name:"신화 신관",tier:"myth",attackType:"normal",damage:2487,attackSpeed:400,range:280,skillId:3},
  {id:"m2",name:"신화 파괴",tier:"myth",attackType:"explosive",damage:2984,attackSpeed:520,range:238,skillId:2},
  {id:"m3",name:"신화 진동",tier:"myth",attackType:"vibration",damage:1989,attackSpeed:280,range:308,skillId:1},
  {id:"p1",name:"태초의 존재",tier:"primordial",attackType:"normal",damage:6774,attackSpeed:300,range:340,skillId:3},
  {id:"p2",name:"태초의 파괴",tier:"primordial",attackType:"explosive",damage:8129,attackSpeed:390,range:289,skillId:2},
  {id:"p3",name:"태초의 진동",tier:"primordial",attackType:"vibration",damage:5418,attackSpeed:210,range:374,skillId:3}
];

const DEFAULT_SKILLS = {
  "1":{id:1,name:"느린 사격",nameEn:"SLOW SHOT",desc:"느린 속도의 투사체를 발사한다.",projectileSpeed:2,displaySize:24,fallbackShape:"circle_large",imagePath:"assets/Art/projectiles/proj_basic_slow_01.png"},
  "2":{id:2,name:"일반 사격",nameEn:"NORMAL SHOT",desc:"보통 속도의 투사체를 발사한다.",projectileSpeed:6,displaySize:16,fallbackShape:"circle",imagePath:"assets/Art/projectiles/proj_basic_normal_01.png"},
  "3":{id:3,name:"빠른 사격",nameEn:"FAST SHOT",desc:"빠른 속도의 투사체를 발사한다.",projectileSpeed:10,displaySize:20,fallbackShape:"diamond",imagePath:"assets/Art/projectiles/proj_basic_fast_01.png"}
};

const DEFAULT_MONSTERS = [
        { id: 1, name: '몬스터 1R', type: 'small', hp: 990, speed: 0.74, goldReward: 3, isBoss: false },
        { id: 2, name: '몬스터 2R', type: 'small', hp: 1000, speed: 1.5, goldReward: 15, isBoss: false },
        { id: 3, name: '몬스터 3R', type: 'large', hp: 1000, speed: 1.0, goldReward: 30, isBoss: false },
        { id: 4, name: '몬스터 4R', type: 'mixed', hp: 1100, speed: 1.5, goldReward: 20, isBoss: false },
        { id: 5, name: '몬스터 5R', type: 'small', hp: 1066, speed: 0.88, goldReward: 4, isBoss: false },
        { id: 6, name: '몬스터 6R', type: 'large', hp: 1092, speed: 0.49, goldReward: 5, isBoss: false },
        { id: 7, name: '몬스터 7R', type: 'mixed', hp: 1154, speed: 0.74, goldReward: 5, isBoss: false },
        { id: 8, name: '보스 8R', type: 'boss', hp: 26250, speed: 0.48, goldReward: 60, isBoss: true },
        { id: 9, name: '몬스터 9R', type: 'small', hp: 1320, speed: 0.98, goldReward: 5, isBoss: false },
        { id: 10, name: '몬스터 10R', type: 'large', hp: 1421, speed: 0.59, goldReward: 7, isBoss: false },
        { id: 11, name: '몬스터 11R', type: 'mixed', hp: 1675, speed: 0.74, goldReward: 9, isBoss: false },
        { id: 12, name: '몬스터 12R', type: 'small', hp: 1776, speed: 1.08, goldReward: 7, isBoss: false },
        { id: 13, name: '몬스터 13R', type: 'large', hp: 1853, speed: 0.49, goldReward: 6, isBoss: false },
        { id: 14, name: '몬스터 14R', type: 'mixed', hp: 1955, speed: 0.88, goldReward: 11, isBoss: false },
        { id: 15, name: '몬스터 15R', type: 'small', hp: 2081, speed: 1.08, goldReward: 8, isBoss: false },
        { id: 16, name: '보스 16R', type: 'boss', hp: 47250, speed: 0.41, goldReward: 100, isBoss: true },
        { id: 17, name: '몬스터 17R', type: 'large', hp: 2259, speed: 0.64, goldReward: 12, isBoss: false },
        { id: 18, name: '몬스터 18R', type: 'small', hp: 2361, speed: 1.23, goldReward: 7, isBoss: false },
        { id: 19, name: '몬스터 19R', type: 'mixed', hp: 2513, speed: 0.98, goldReward: 9, isBoss: false },
        { id: 20, name: '몬스터 20R', type: 'large', hp: 2665, speed: 0.59, goldReward: 14, isBoss: false },
        { id: 21, name: '몬스터 21R', type: 'small', hp: 2970, speed: 1.23, goldReward: 8, isBoss: false },
        { id: 22, name: '몬스터 22R', type: 'mixed', hp: 3096, speed: 0.98, goldReward: 14, isBoss: false },
        { id: 23, name: '몬스터 23R', type: 'large', hp: 3223, speed: 0.69, goldReward: 10, isBoss: false },
        { id: 24, name: '보스 24R', type: 'boss', hp: 79000, speed: 0.32, goldReward: 150, isBoss: true },
        { id: 25, name: '몬스터 25R', type: 'small', hp: 3426, speed: 1.37, goldReward: 9, isBoss: false },
        { id: 26, name: '몬스터 26R', type: 'large', hp: 3680, speed: 0.74, goldReward: 16, isBoss: false },
        { id: 27, name: '몬스터 27R', type: 'mixed', hp: 3857, speed: 1.13, goldReward: 12, isBoss: false },
        { id: 28, name: '몬스터 28R', type: 'small', hp: 4009, speed: 1.47, goldReward: 9, isBoss: false },
        { id: 29, name: '몬스터 29R', type: 'mixed', hp: 4162, speed: 0.98, goldReward: 13, isBoss: false },
        { id: 30, name: '몬스터 30R', type: 'large', hp: 4365, speed: 0.74, goldReward: 18, isBoss: false },
        { id: 31, name: '몬스터 31R', type: 'mixed', hp: 4669, speed: 1.08, goldReward: 18, isBoss: false },
        { id: 32, name: '보스 32R', type: 'boss', hp: 123750, speed: 0.36, goldReward: 200, isBoss: true },
        { id: 33, name: '몬스터 33R', type: 'small', hp: 5075, speed: 1.57, goldReward: 10, isBoss: false },
        { id: 34, name: '몬스터 34R', type: 'mixed', hp: 5253, speed: 1.08, goldReward: 15, isBoss: false },
        { id: 35, name: '몬스터 35R', type: 'large', hp: 5583, speed: 0.78, goldReward: 20, isBoss: false },
        { id: 36, name: '몬스터 36R', type: 'mixed', hp: 5836, speed: 1.23, goldReward: 16, isBoss: false },
        { id: 37, name: '몬스터 37R', type: 'large', hp: 6090, speed: 0.83, goldReward: 20, isBoss: false },
        { id: 38, name: '몬스터 38R', type: 'small', hp: 6344, speed: 1.72, goldReward: 11, isBoss: false },
        { id: 39, name: '몬스터 39R', type: 'mixed', hp: 6471, speed: 1.23, goldReward: 17, isBoss: false },
        { id: 40, name: '보스 40R', type: 'boss', hp: 196250, speed: 0.41, goldReward: 280, isBoss: true },
        { id: 41, name: '몬스터 41R', type: 'large', hp: 7283, speed: 0.88, goldReward: 22, isBoss: false },
        { id: 42, name: '몬스터 42R', type: 'mixed', hp: 7537, speed: 1.37, goldReward: 17, isBoss: false },
        { id: 43, name: '몬스터 43R', type: 'small', hp: 7740, speed: 1.86, goldReward: 12, isBoss: false },
        { id: 44, name: '몬스터 44R', type: 'mixed', hp: 7968, speed: 1.32, goldReward: 19, isBoss: false },
        { id: 45, name: '몬스터 45R', type: 'large', hp: 8248, speed: 0.98, goldReward: 24, isBoss: false },
        { id: 46, name: '몬스터 46R', type: 'mixed', hp: 8526, speed: 1.47, goldReward: 20, isBoss: false },
        { id: 47, name: '몬스터 47R', type: 'large', hp: 8729, speed: 0.98, goldReward: 26, isBoss: false },
        { id: 48, name: '보스 48R', type: 'boss', hp: 252500, speed: 0.44, goldReward: 350, isBoss: true },
        { id: 49, name: '보스 49R', type: 'boss', hp: 262500, speed: 0.44, goldReward: 400, isBoss: true },
        { id: 50, name: '보스 50R', type: 'boss', hp: 273125, speed: 0.48, goldReward: 1000, isBoss: true }
    ];

const DEFAULT_WAVES = [
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

const TIERS = ['normal','rare','ancient','relic','saga','legend','epic','myth','primordial'];
const TIER_LABELS = {normal:'일반',rare:'레어',ancient:'고대',relic:'유물',saga:'서사',legend:'전설',epic:'에픽',myth:'신화',primordial:'태초'};
const ATK_TYPES = ['normal','explosive','vibration'];
const ATK_LABELS = {normal:'일반',explosive:'폭발',vibration:'진동'};
const SHAPES = ['circle','circle_large','diamond'];
const MONSTER_TYPES = ['small','large','mixed','boss'];
const BOSS_ROUNDS = [8,16,24,32,40,48,49,50];

const LS_KEYS = {
  system: 'rtd_configOverride',
  tower: 'rtd_unitData',
  skill: 'rtd_skillData',
  monster: 'rtd_monsterData',
  stage: 'rtd_waveData'
};

const TABS = [
  {id:'system', label:'⚙️ 시스템 룰'},
  {id:'tower',  label:'🗼 타워 능력치'},
  {id:'skill',  label:'🎯 발사체(스킬)'},
  {id:'monster', label:'💀 몬스터 테이블'},
  {id:'stage',  label:'📋 스테이지'}
];

let activeTab = 'system';

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════
function deepClone(o){ return JSON.parse(JSON.stringify(o)); }
function showStatus(msg, ok){
  const el = document.getElementById('statusMsg');
  el.textContent = msg;
  el.className = 'status-msg ' + (ok ? 'ok' : 'err');
  clearTimeout(el._t);
  el._t = setTimeout(()=>{ el.textContent=''; }, 3000);
}
function loadLS(key, fallback){
  try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : deepClone(fallback); }
  catch(e){ return deepClone(fallback); }
}

// ═══════════════════════════════════════════════
// TAB MANAGEMENT
// ═══════════════════════════════════════════════
function initTabs(){
  const bar = document.getElementById('tabBar');
  TABS.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (t.id === activeTab ? ' active' : '');
    btn.textContent = t.label;
    btn.dataset.tab = t.id;
    btn.onclick = () => switchTab(t.id);
    bar.appendChild(btn);
  });
}

function switchTab(id){
  activeTab = id;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-'+id));
}

// ═══════════════════════════════════════════════
// TAB 1: SYSTEM RULES
// ═══════════════════════════════════════════════
function renderSystem(){
  const cfg = loadLS(LS_KEYS.system, DEFAULT_CONFIG);
  const area = document.getElementById('systemArea');

  // Ensure nested objects
  if(!cfg.GACHA_RATES) cfg.GACHA_RATES = deepClone(DEFAULT_CONFIG.GACHA_RATES);
  if(!cfg.TYPE_AFFINITY) cfg.TYPE_AFFINITY = deepClone(DEFAULT_CONFIG.TYPE_AFFINITY);

  const sections = [
    { title:'💰 경제 시스템', fields:[
      {key:'INITIAL_GOLD', label:'초기 골드', val:cfg.INITIAL_GOLD??500, type:'number'},
      {key:'GACHA_COST', label:'뽑기 비용', val:cfg.GACHA_COST??50, type:'number'},
      {key:'ROUND_BONUS_MULTIPLIER', label:'라운드 보너스 배율', val:cfg.ROUND_BONUS_MULTIPLIER??2.45, type:'number', step:'0.01'}
    ]},
    { title:'🧑 플레이어', fields:[
      {key:'INITIAL_LIVES', label:'초기 생명력', val:cfg.INITIAL_LIVES??50, type:'number'},
      {key:'MAX_MONSTERS', label:'최대 몬스터', val:cfg.MAX_MONSTERS??50, type:'number'}
    ]},
    { title:'🔄 라운드', fields:[
      {key:'TOTAL_ROUNDS', label:'총 라운드', val:cfg.TOTAL_ROUNDS??50, type:'number'},
      {key:'SPAWN_INTERVAL', label:'스폰 간격(ms)', val:cfg.SPAWN_INTERVAL??800, type:'number'}
    ]}
  ];

  let html = '';

  // Basic sections
  sections.forEach(sec => {
    html += `<div class="section"><div class="section-title">${sec.title}</div>`;
    sec.fields.forEach(f => {
      html += `<div class="form-row">
        <label>${f.label}</label>
        <input type="${f.type}" data-cfg="${f.key}" value="${f.val}" ${f.step?'step="'+f.step+'"':''}>
      </div>`;
    });
    html += '</div>';
  });

  // Gacha Rates
  html += '<div class="section"><div class="section-title">🎰 가차 확률</div>';
  const rateLabels = {normal:'일반',rare:'레어',ancient:'고대',relic:'유물',saga:'서사',legend:'전설',epic:'에픽',myth:'신화',primordial:'태초'};
  TIERS.forEach(t => {
    const v = cfg.GACHA_RATES[t] ?? DEFAULT_CONFIG.GACHA_RATES[t] ?? 0;
    const pct = (v * 100).toFixed(4);
    html += `<div class="form-row">
      <label>${rateLabels[t]}</label>
      <input type="number" step="0.0001" data-rate="${t}" value="${v}" style="width:120px">
      <span class="pct" id="pct-${t}">${pct}%</span>
    </div>`;
  });
  html += '<div class="sum-row" id="rateSum"></div></div>';

  // Type Affinity
  html += '<div class="section"><div class="section-title">⚔️ 타입 상성</div>';
  html += '<div class="tbl-wrap"><table class="affinity-tbl"><thead><tr><th>타입</th><th>소형 배율</th><th>대형 배율</th></tr></thead><tbody>';
  ['normal','explosive','vibration'].forEach(at => {
    const aff = cfg.TYPE_AFFINITY[at] ?? DEFAULT_CONFIG.TYPE_AFFINITY[at];
    html += `<tr>
      <td style="font-weight:600">${ATK_LABELS[at]}</td>
      <td><input type="number" step="0.1" data-aff="${at}-small" value="${aff.small}" style="width:80px"></td>
      <td><input type="number" step="0.1" data-aff="${at}-large" value="${aff.large}" style="width:80px"></td>
    </tr>`;
  });
  html += '</tbody></table></div></div>';

  area.innerHTML = html;

  // Rate change listeners
  area.querySelectorAll('[data-rate]').forEach(inp => {
    inp.addEventListener('input', updateGachaSum);
  });
  updateGachaSum();
}

function updateGachaSum(){
  let sum = 0;
  document.querySelectorAll('[data-rate]').forEach(inp => {
    const v = parseFloat(inp.value) || 0;
    sum += v;
    const pctEl = document.getElementById('pct-' + inp.dataset.rate);
    if(pctEl) pctEl.textContent = (v*100).toFixed(4) + '%';
  });
  const sumEl = document.getElementById('rateSum');
  const pct = (sum * 100).toFixed(4);
  const ok = sum >= 0.999 && sum <= 1.001;
  sumEl.textContent = `합계: ${pct}%`;
  sumEl.className = 'sum-row ' + (ok ? 'ok' : 'err');
  if(!ok) sumEl.textContent += ' ⚠️ 99.9~100.1% 범위를 벗어남!';
}

function collectSystem(){
  const cfg = {};
  document.querySelectorAll('[data-cfg]').forEach(inp => {
    cfg[inp.dataset.cfg] = parseFloat(inp.value);
  });
  cfg.GACHA_RATES = {};
  document.querySelectorAll('[data-rate]').forEach(inp => {
    cfg.GACHA_RATES[inp.dataset.rate] = parseFloat(inp.value) || 0;
  });
  cfg.TYPE_AFFINITY = {normal:{},explosive:{},vibration:{}};
  document.querySelectorAll('[data-aff]').forEach(inp => {
    const [at, size] = inp.dataset.aff.split('-');
    cfg.TYPE_AFFINITY[at][size] = parseFloat(inp.value) || 0;
  });
  return cfg;
}

// ═══════════════════════════════════════════════
// TAB 2: TOWER STATS
// ═══════════════════════════════════════════════
function renderTower(){
  const units = loadLS(LS_KEYS.tower, DEFAULT_UNITS);
  const area = document.getElementById('towerArea');
  let html = '<div class="section"><div class="section-title">🗼 타워 능력치 (27개 유닛)</div>';
  html += '<div class="tbl-wrap"><table id="towerTable"><thead><tr>';
  html += '<th>ID</th><th>이름</th><th>등급</th><th>공격타입</th><th>공격력</th><th>공속(ms)</th><th>사거리</th><th>스킬ID</th><th>DPS</th>';
  html += '</tr></thead><tbody>';

  units.forEach((u, i) => {
    const dps = (u.damage / (u.attackSpeed / 1000)).toFixed(1);
    html += `<tr class="tier-${u.tier}" data-idx="${i}">
      <td><input type="text" readonly value="${u.id}" data-field="id"></td>
      <td><input type="text" value="${esc(u.name)}" data-field="name"></td>
      <td><select data-field="tier">${TIERS.map(t=>`<option value="${t}"${t===u.tier?' selected':''}>${TIER_LABELS[t]}</option>`).join('')}</select></td>
      <td><select data-field="attackType">${ATK_TYPES.map(t=>`<option value="${t}"${t===u.attackType?' selected':''}>${ATK_LABELS[t]}</option>`).join('')}</select></td>
      <td><input type="number" value="${u.damage}" data-field="damage"></td>
      <td><input type="number" value="${u.attackSpeed}" data-field="attackSpeed"></td>
      <td><input type="number" value="${u.range}" data-field="range"></td>
      <td><select data-field="skillId">${[1,2,3].map(s=>`<option value="${s}"${s===u.skillId?' selected':''}>${s}(${['느린','일반','빠른'][s-1]})</option>`).join('')}</select></td>
      <td><span class="calc" id="dps-${i}">${dps}</span></td>
    </tr>`;
  });

  html += '</tbody></table></div></div>';
  area.innerHTML = html;

  // DPS recalc + tier color
  const table = document.getElementById('towerTable');
  table.addEventListener('input', e => {
    const tr = e.target.closest('tr');
    if(!tr) return;
    updateTowerRow(tr);
  });
  table.addEventListener('change', e => {
    const tr = e.target.closest('tr');
    if(!tr) return;
    if(e.target.dataset.field === 'tier'){
      tr.className = 'tier-' + e.target.value;
    }
    updateTowerRow(tr);
  });
}

function updateTowerRow(tr){
  const idx = tr.dataset.idx;
  const dmg = parseFloat(tr.querySelector('[data-field="damage"]').value) || 0;
  const spd = parseFloat(tr.querySelector('[data-field="attackSpeed"]').value) || 1;
  const dps = (dmg / (spd / 1000)).toFixed(1);
  document.getElementById('dps-'+idx).textContent = dps;
}

function collectTower(){
  const rows = document.querySelectorAll('#towerTable tbody tr');
  return Array.from(rows).map(tr => ({
    id: tr.querySelector('[data-field="id"]').value,
    name: tr.querySelector('[data-field="name"]').value,
    tier: tr.querySelector('[data-field="tier"]').value,
    attackType: tr.querySelector('[data-field="attackType"]').value,
    damage: parseFloat(tr.querySelector('[data-field="damage"]').value) || 0,
    attackSpeed: parseFloat(tr.querySelector('[data-field="attackSpeed"]').value) || 0,
    range: parseFloat(tr.querySelector('[data-field="range"]').value) || 0,
    skillId: parseInt(tr.querySelector('[data-field="skillId"]').value) || 1
  }));
}

// ═══════════════════════════════════════════════
// TAB 3: SKILLS
// ═══════════════════════════════════════════════
function renderSkill(){
  const skills = loadLS(LS_KEYS.skill, DEFAULT_SKILLS);
  const area = document.getElementById('skillArea');
  let html = '<div class="section"><div class="section-title">🎯 발사체(스킬) 데이터</div>';
  html += '<div class="tbl-wrap"><table id="skillTable"><thead><tr>';
  html += '<th>ID</th><th>이름</th><th>영문명</th><th>설명</th><th>투사체 속도</th><th>표시 크기(px)</th><th style="color:#666;" title="현재 이미지를 사용하므로 비활성화됨">Fallback 모양(미사용)</th><th title="적용 폴더: assets/Art/projectiles/ (파일 이름만 입력하세요)">이미지 <span style="font-size:10px;cursor:help">ℹ️</span></th>';
  html += '</tr></thead><tbody>';

  [1,2,3].forEach(sid => {
    const s = skills[String(sid)] || DEFAULT_SKILLS[String(sid)];
    const filename = s.imagePath ? s.imagePath.replace('assets/Art/projectiles/', '') : '';
    html += `<tr data-sid="${sid}">
      <td><input type="text" readonly value="${sid}" data-field="id"></td>
      <td><input type="text" value="${esc(s.name)}" data-field="name"></td>
      <td><input type="text" value="${esc(s.nameEn)}" data-field="nameEn"></td>
      <td><input type="text" value="${esc(s.desc)}" data-field="desc" style="min-width:200px"></td>
      <td><input type="number" step="0.5" value="${s.projectileSpeed}" data-field="projectileSpeed"></td>
      <td><input type="number" value="${s.displaySize}" data-field="displaySize"></td>
      <td><select data-field="fallbackShape" disabled style="color:#666; background:transparent; border-color:transparent; -webkit-appearance:none; -moz-appearance:none; appearance:none;">${SHAPES.map(sh=>`<option value="${sh}"${sh===s.fallbackShape?' selected':''}>${sh}</option>`).join('')}</select></td>
      <td><input type="text" value="${esc(filename)}" data-field="imagePath" style="min-width:150px" placeholder="파일명만 입력"></td>
    </tr>`;
  });

  html += '</tbody></table></div></div>';
  area.innerHTML = html;
}

function collectSkill(){
  const result = {};
  document.querySelectorAll('#skillTable tbody tr').forEach(tr => {
    const sid = tr.dataset.sid;
    const filename = tr.querySelector('[data-field="imagePath"]').value.trim();
    const fullPath = filename ? (filename.startsWith('assets') ? filename : 'assets/Art/projectiles/' + filename) : '';
    result[sid] = {
      id: parseInt(sid),
      name: tr.querySelector('[data-field="name"]').value,
      nameEn: tr.querySelector('[data-field="nameEn"]').value,
      desc: tr.querySelector('[data-field="desc"]').value,
      projectileSpeed: parseFloat(tr.querySelector('[data-field="projectileSpeed"]').value) || 0,
      displaySize: parseInt(tr.querySelector('[data-field="displaySize"]').value) || 0,
      fallbackShape: tr.querySelector('[data-field="fallbackShape"]').value,
      imagePath: fullPath
    };
  });
  return result;
}

// ═══════════════════════════════════════════════
// TAB 4: STAGES
// ═══════════════════════════════════════════════

function renderMonster(){
  const monsters = loadLS(LS_KEYS.monster, DEFAULT_MONSTERS);
  const area = document.getElementById('monsterArea');
  let html = '<div class="section"><div class="section-title">💀 몬스터 테이블 (ID 1~50)</div>';
  html += '<div class="tbl-wrap"><table id="monsterTable"><thead><tr>';
  html += '<th>ID</th><th>이름</th><th>타입</th><th>보스여부</th><th>기본HP</th><th>속도</th><th>골드보상</th>';
  html += '</tr></thead><tbody>';

  monsters.forEach((m, i) => {
    html += `<tr class="${m.isBoss?'boss-row':''}" data-idx="${i}">
      <td><input type="number" value="${m.id}" data-field="id" readonly style="width:50px"></td>
      <td><input type="text" value="${m.name}" data-field="name" style="width:100px"></td>
      <td><select data-field="type">${MONSTER_TYPES.map(t=>`<option value="${t}"${t===m.type?' selected':''}>${t}</option>`).join('')}</select></td>
      <td><input type="checkbox" data-field="isBoss" ${m.isBoss?'checked':''} style="width:auto"></td>
      <td><input type="number" value="${m.hp}" data-field="hp" style="width:80px"></td>
      <td><input type="number" step="0.01" value="${m.speed}" data-field="speed" style="width:70px"></td>
      <td><input type="number" value="${m.goldReward}" data-field="goldReward" style="width:70px"></td>
    </tr>`;
  });

  html += '</tbody></table></div></div>';
  area.innerHTML = html;

  const table = document.getElementById('monsterTable');
  table.addEventListener('change', e => {
    const tr = e.target.closest('tr');
    if(!tr) return;
    const field = e.target.dataset.field;
    if(field === 'isBoss'){
      tr.classList.toggle('boss-row', e.target.checked);
    }
  });
}

function collectMonster(){
  const rows = document.querySelectorAll('#monsterTable tbody tr');
  return Array.from(rows).map(tr => ({
    id: parseInt(tr.querySelector('[data-field="id"]').value) || 0,
    name: tr.querySelector('[data-field="name"]').value,
    type: tr.querySelector('[data-field="type"]').value,
    hp: parseInt(tr.querySelector('[data-field="hp"]').value) || 0,
    speed: parseFloat(tr.querySelector('[data-field="speed"]').value) || 0,
    goldReward: parseInt(tr.querySelector('[data-field="goldReward"]').value) || 0,
    isBoss: tr.querySelector('[data-field="isBoss"]').checked
  }));
}

function renderStage(){
  const waves = loadLS(LS_KEYS.stage, DEFAULT_WAVES);
  const area = document.getElementById('stageArea');
  let html = '<div class="section"><div class="section-title">📋 스테이지 (50 라운드)</div>';
  html += '<div class="tbl-wrap"><table id="stageTable"><thead><tr>';
  html += '<th>라운드</th><th>몬스터 ID</th><th>수량</th><th>⏱제한시간(초)</th><th>⚔️타임어택</th>';
  html += '</tr></thead><tbody>';

  const monsters = loadLS(LS_KEYS.monster, DEFAULT_MONSTERS);
  waves.forEach((w, i) => {
    const m = monsters.find(x => x.id === w.monsterId) || monsters[0];
    const isBoss = m ? m.isBoss : false;
    const timeAttack = w.timeAttack !== undefined ? w.timeAttack : (w.timeLimit > 0 && isBoss);
    html += `<tr class="${isBoss?'boss-row':''}" data-idx="${i}">
      <td><input type="number" value="${w.round}" data-field="round" readonly style="width:50px"></td>
      <td><input type="number" value="${w.monsterId}" data-field="monsterId" style="width:70px"></td>
      <td><input type="number" value="${w.count}" data-field="count" style="width:60px"></td>
      <td><input type="number" value="${w.timeLimit||0}" data-field="timeLimit" style="width:70px" min="0"></td>
      <td><input type="checkbox" data-field="timeAttack" ${timeAttack?'checked':''} style="width:auto"></td>
    </tr>`;
  });

  html += '</tbody></table></div></div>';
  area.innerHTML = html;

  // Real HP recalc
  const table = document.getElementById('stageTable');
  table.addEventListener('input', e => {
    const tr = e.target.closest('tr');
    if(!tr) return;
    updateStageRow(tr);
  });
  table.addEventListener('change', e => {
    const tr = e.target.closest('tr');
    if(!tr) return;
    const field = e.target.dataset.field;
    if(field === 'isBoss'){
      tr.classList.toggle('boss-row', e.target.checked);
    }
    updateStageRow(tr);
  });
}

function updateStageRow(tr){
  const idx = tr.dataset.idx;

}

function collectStage(){
  const rows = document.querySelectorAll('#stageTable tbody tr');
  return Array.from(rows).map(tr => ({
    round: parseInt(tr.querySelector('[data-field="round"]').value) || 0,
    monsterId: parseInt(tr.querySelector('[data-field="monsterId"]').value) || 1,
    count: parseInt(tr.querySelector('[data-field="count"]').value) || 0,
    timeLimit: parseInt(tr.querySelector('[data-field="timeLimit"]').value) || 0,
    timeAttack: tr.querySelector('[data-field="timeAttack"]').checked
  }));
}

// ═══════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════
function getCollector(tab){
  switch(tab){
    case 'system': return { collect: collectSystem, key: LS_KEYS.system };
    case 'tower':  return { collect: collectTower,  key: LS_KEYS.tower };
    case 'skill':  return { collect: collectSkill,  key: LS_KEYS.skill };
    case 'monster': return { collect: collectMonster, key: LS_KEYS.monster };
    case 'stage':  return { collect: collectStage,  key: LS_KEYS.stage };
  }
}

function getDefaults(tab){
  switch(tab){
    case 'system': return DEFAULT_CONFIG;
    case 'tower':  return DEFAULT_UNITS;
    case 'skill':  return DEFAULT_SKILLS;
    case 'monster': return DEFAULT_MONSTERS;
    case 'stage':  return DEFAULT_WAVES;
  }
}

function getRenderer(tab){
  switch(tab){
    case 'system': return renderSystem;
    case 'tower':  return renderTower;
    case 'skill':  return renderSkill;
    case 'monster': return renderMonster;
    case 'stage':  return renderStage;
  }
}

function saveCurrentTab(){
  try{
    const {collect, key} = getCollector(activeTab);
    const data = collect();
    localStorage.setItem(key, JSON.stringify(data));
    showStatus(`✅ [${LS_KEYS[activeTab]}] 저장 완료!`, true);
  }catch(e){
    showStatus('❌ 저장 실패: ' + e.message, false);
  }
}

function resetCurrentTab(){
  if(!confirm('현재 탭의 데이터를 기본값으로 되돌리시겠습니까?')) return;
  try{
    localStorage.removeItem(LS_KEYS[activeTab]);
    getRenderer(activeTab)();
    showStatus('↩ 기본값으로 복원됨', true);
  }catch(e){
    showStatus('❌ 복원 실패: ' + e.message, false);
  }
}

function copyJSON(){
  try{
    const {collect} = getCollector(activeTab);
    const json = JSON.stringify(collect(), null, 2);
    navigator.clipboard.writeText(json).then(()=>{
      showStatus('📋 JSON이 클립보드에 복사됨', true);
    }).catch(()=>{
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = json; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
      showStatus('📋 JSON이 클립보드에 복사됨', true);
    });
  }catch(e){
    showStatus('❌ 복사 실패: ' + e.message, false);
  }
}

function pasteJSON(){
  const raw = prompt('JSON 데이터를 붙여넣으세요:');
  if(!raw) return;
  try{
    const data = JSON.parse(raw);
    localStorage.setItem(LS_KEYS[activeTab], JSON.stringify(data));
    getRenderer(activeTab)();
    showStatus('📥 JSON 데이터 적용 완료', true);
  }catch(e){
    showStatus('❌ JSON 파싱 실패: ' + e.message, false);
  }
}

async function applyToCode() {
  if (!window.showDirectoryPicker) {
    alert('이 브라우저는 파일 시스템 API를 지원하지 않습니다. 크롬/엣지를 사용해주세요.');
    return;
  }
  if (!confirm('경고: 실제 자바스크립트 소스 파일을 덮어씁니다.\n\n진행하시겠습니까?\n\n(참고: 파일 선택기 창이 뜨면 프로젝트 루트 폴더인 "Project_RTD"를 선택해 주세요.)')) return;

  try {
    const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    let jsHandle = dirHandle;
    // 만약 유저가 루트를 골랐다면 js 폴더 진입 시도
    try { jsHandle = await dirHandle.getDirectoryHandle('js'); } catch(e) {}
    
    let dataDirHandle;
    try { 
        dataDirHandle = await jsHandle.getDirectoryHandle('data'); 
    } catch(e) {
        // 이미 data 폴더를 고른 경우 대비
        try {
            await jsHandle.getFileHandle('waveData.js');
            dataDirHandle = jsHandle;
        } catch(e2) {
            alert('"js" 또는 "js/data" 폴더를 찾을 수 없습니다. 올바른 프로젝트 폴더를 선택해주세요.');
            return;
        }
    }
    
    if (activeTab === 'monster') {
       const fileHandle = await dataDirHandle.getFileHandle('monsterData.js');
       const file = await fileHandle.getFile();
       let text = await file.text();
       
       const newData = getCollector('monster').collect();
       let mContent = "var Game = window.Game || {};\n\n(function() {\n    var DEFAULT_MONSTERS = [\n";
       newData.forEach(m => {
           mContent += `        { id: ${m.id}, name: '${m.name}', type: '${m.type}', hp: ${m.hp}, speed: ${m.speed}, goldReward: ${m.goldReward}, isBoss: ${m.isBoss} },\n`;
       });
       mContent += "    ];\n\n    Game.MonsterData = {\n        monsters: {},\n        init: function() {\n            for (var i = 0; i < DEFAULT_MONSTERS.length; i++) {\n                var m = DEFAULT_MONSTERS[i];\n                this.monsters[m.id] = m;\n            }\n        },\n        getMonster: function(id) {\n            return this.monsters[id];\n        }\n    };\n\n    Game.MonsterData.init();\n\n    // localStorage 오버라이드\n    try {\n        var raw = localStorage.getItem('rtd_monsterData');\n        if (raw) {\n            var saved = JSON.parse(raw);\n            for (var id in saved) {\n                if (Game.MonsterData.monsters[id]) {\n                    Object.assign(Game.MonsterData.monsters[id], saved[id]);\n                }\n            }\n        }\n    } catch(e) {}\n})();\n";
       
       const writable = await fileHandle.createWritable();
       await writable.write(mContent);
       await writable.close();
       showStatus('✅ monsterData.js 파일에 영구 적용 완료!', true);
    }
    else if (activeTab === 'stage') {
       const fileHandle = await dataDirHandle.getFileHandle('waveData.js');
       const file = await fileHandle.getFile();
       let text = await file.text();
       
       const newData = getCollector('stage').collect();
       text = text.replace(/var DEFAULT_WAVES\s*=\s*\[[\s\S]*?\];/, 'var DEFAULT_WAVES = ' + JSON.stringify(newData, null, 4) + ';');
       
       const writable = await fileHandle.createWritable();
       await writable.write(text);
       await writable.close();
       showStatus('✅ waveData.js 파일에 영구 적용 완료!', true);
    }
    else if (activeTab === 'tower') {
       const fileHandle = await dataDirHandle.getFileHandle('unitData.js');
       const file = await fileHandle.getFile();
       let text = await file.text();
       
       const newData = getCollector('tower').collect();
       let jsonStr = JSON.stringify(newData, null, 4).replace(/\n/g, '\n    ');
       text = text.replace(/units:\s*\[[\s\S]*?\n\s*\]/, 'units: ' + jsonStr.trim());
       
       const writable = await fileHandle.createWritable();
       await writable.write(text);
       await writable.close();
       showStatus('✅ unitData.js 파일에 영구 적용 완료!', true);
    }
    else if (activeTab === 'skill') {
       const fileHandle = await dataDirHandle.getFileHandle('skillData.js');
       const file = await fileHandle.getFile();
       let text = await file.text();
       
       const newData = getCollector('skill').collect();
       let jsonStr = JSON.stringify(newData, null, 4).replace(/\n/g, '\n    ');
       text = text.replace(/skills:\s*\{[\s\S]*?\n\s*\}(?=\s*,)/, 'skills: ' + jsonStr.trim());
       
       const writable = await fileHandle.createWritable();
       await writable.write(text);
       await writable.close();
       showStatus('✅ skillData.js 파일에 영구 적용 완료!', true);
    }
    else if (activeTab === 'system') {
       // system tab은 js 폴더 바로 안의 config.js
       // dataDirHandle이 아닌 jsHandle을 씀
       let cfgHandle;
       try { cfgHandle = await jsHandle.getFileHandle('config.js'); }
       catch(e) {
           // 루트를 고르지 않고 data를 고른 경우를 위해 위로 올라가는 처리 추가
           alert('config.js를 찾지 못했습니다. 프로젝트 루트 폴더를 선택해주세요.');
           return;
       }
       const file = await cfgHandle.getFile();
       let text = await file.text();
       
       const cfg = getCollector('system').collect();
       
       const keys = ['INITIAL_GOLD','GACHA_COST','ROUND_BONUS_MULTIPLIER','INITIAL_LIVES','MAX_MONSTERS','TOTAL_ROUNDS','SPAWN_INTERVAL'];
       keys.forEach(k => {
           const regex = new RegExp(k + ':\\s*[\\d\\.]+,');
           text = text.replace(regex, k + ': ' + cfg[k] + ',');
       });
       
       let ratesStr = JSON.stringify(cfg.GACHA_RATES, null, 8).replace(/\n/g, '\n        ');
       text = text.replace(/GACHA_RATES:\s*\{[\s\S]*?\n\s*\}/, 'GACHA_RATES: ' + ratesStr.trim());
       
       let typeStr = JSON.stringify(cfg.TYPE_EFFECTIVENESS, null, 8).replace(/\n/g, '\n        ');
       text = text.replace(/TYPE_EFFECTIVENESS:\s*\{[\s\S]*?\n\s*\}/, 'TYPE_EFFECTIVENESS: ' + typeStr.trim());
       
       const writable = await cfgHandle.createWritable();
       await writable.write(text);
       await writable.close();
       showStatus('✅ config.js 파일에 영구 적용 완료!', true);
    }
  } catch(e) {
    if(e.name !== 'AbortError') {
       showStatus('❌ 파일 적용 오류: ' + e.message, false);
    }
  }
}

// ═══════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ═══════════════════════════════════════════════
// KEYBOARD SHORTCUT
// ═══════════════════════════════════════════════
document.addEventListener('keydown', e => {
  if((e.ctrlKey || e.metaKey) && e.key === 's'){
    e.preventDefault();
    saveCurrentTab();
  }
});

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
initTabs();
renderSystem();
renderTower();
renderSkill();
renderMonster();
renderStage();
switchTab('system');
