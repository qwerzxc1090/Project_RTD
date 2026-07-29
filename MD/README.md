# 🏰 Lucky Defense — Project RTD

> Phaser 3 기반 랜덤 뽑기 타워 디펜스 게임  
> 최종 업데이트: 2026-07-25

---

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택 및 실행 방법](#2-기술-스택-및-실행-방법)
3. [디렉토리 구조](#3-디렉토리-구조)
4. [아키텍처 개요](#4-아키텍처-개요)
5. [게임 시스템](#5-게임-시스템)
6. [타워 데이터](#6-타워-데이터)
7. [스킬 시스템](#7-스킬-시스템)
8. [몬스터 & 보스 시스템](#8-몬스터--보스-시스템)
9. [타입 상성 시스템](#9-타입-상성-시스템)
10. [독(DoT) 시스템](#10-독dot-시스템)
11. [가챠 시스템](#11-가챠-시스템)
12. [데이터 관리 도구](#12-데이터-관리-도구)
13. [데이터 흐름 요약](#13-데이터-흐름-요약)

---

## 1. 프로젝트 개요

**Lucky Defense**는 랜덤 뽑기(가챠)로 타워를 획득하여 몬스터를 막는 **타워 디펜스 게임**입니다.

### 핵심 특징
- 정사각형 경로를 **반시계 방향**으로 순환하는 몬스터
- **9등급** 가챠로 타워 획득
- **3종 공격타입 × 3종 몬스터 크기** 타입 상성 시스템
- **보스 3종 분류** (보스_일반 / 보스_소형 / 보스_대형) 별 방어 특성
- **독(DoT) 지속 피해** 스킬 시스템 (맹독 중첩, 최대 20스택)
- 1~20라운드 초반 완만한 난이도 — 21라운드 이후 본격 상승

### 기본 수치
| 항목 | 값 |
|---|---|
| 해상도 | 1280 × 720 |
| 초기 골드 | 500G |
| 가챠 비용 | 100G / 회 |
| 총 라운드 | 50 |
| 보스 라운드 | R8, R16, R24, R32, R40, R48, R50 |
| 최대 라이프 | 50 (필드 최대 몬스터 수) |
| 라운드 클리어 보너스 | 라운드 × 4G |
| 치명타 배율 | × 1.5 (기본 공격력 + 50%) |

---

## 2. 기술 스택 및 실행 방법

### 기술 스택
| 항목 | 내용 |
|---|---|
| **엔진** | Phaser 3.60.0 (CDN) |
| **언어** | Vanilla JavaScript (ES5/ES6) |
| **데이터** | JSON (`assets/data/stats.json`) |
| **로컬 오버라이드** | `localStorage` (data-editor.html 연동) |
| **폰트** | Oxanium (Google Fonts) |

### 실행 방법
```bash
# 프로젝트 루트에서 로컬 서버 실행
python -m http.server 8080

# 브라우저에서 접속
http://localhost:8080
```

### 데이터 에디터
```
http://localhost:8080/tools/data-editor.html
```

---

## 3. 디렉토리 구조

```
Project_RTD/
├── index.html                  # 게임 진입점
├── style.css                   # 전역 스타일
├── assets/
│   ├── data/
│   │   └── stats.json          # ★ 핵심 게임 데이터 (타워/스킬/몬스터/DPS모드)
│   └── Art/
│       └── projectiles/        # 투사체 이미지 (PNG)
├── js/
│   ├── config.js               # 전역 설정 (수치, 타입상성, 색상 등)
│   ├── main.js                 # Phaser 앱 초기화
│   ├── data/
│   │   ├── unitData.js         # 유닛 데이터 로더
│   │   ├── skillData.js        # 스킬 데이터 로더 + localStorage 오버라이드
│   │   ├── monsterData.js      # 몬스터 데이터 로더
│   │   └── waveData.js         # 웨이브 데이터 로더
│   ├── entities/
│   │   ├── Tower.js            # 타워 엔티티 (공격, 시각화)
│   │   ├── Monster.js          # 몬스터 엔티티 (이동, 피격, 독 처리)
│   │   └── Projectile.js       # 투사체 엔티티 (충돌, 독 적용)
│   ├── skills/
│   │   └── SkillClasses.js     # 스킬 클래스 (SingleShot/ChainLightning/PoisonDot)
│   ├── systems/
│   │   ├── CombatSystem.js     # 데미지 계산, 타겟팅
│   │   ├── DamageTracker.js    # 데미지 추적 (DPS 측정)
│   │   ├── EconomySystem.js    # 골드 관리
│   │   ├── GachaSystem.js      # 뽑기 로직
│   │   ├── WaveSystem.js       # 웨이브 진행 관리
│   │   └── UILayout.js         # UI 레이아웃 계산
│   ├── scenes/
│   │   ├── BootScene.js        # 에셋 로드
│   │   ├── MenuScene.js        # 메인 메뉴 (DPS MODE 토글 포함)
│   │   ├── GameScene.js        # ★ 메인 게임 씬 (DPS MODE 포함)
│   │   └── GameOverScene.js    # 게임 오버/클리어
│   └── ui/
│       ├── HUD.js              # 인게임 HUD
│       ├── Inventory.js        # 인벤토리 UI
│       ├── GachaUI.js          # 뽑기 UI
│       ├── GoldLogPanel.js     # 골드 수입/지출 로그 패널
│       └── DPSMeterUI.js       # DPS 미터 UI
├── tools/
│   ├── data-editor.html        # ★ 통합 데이터 에디터 (브라우저 기반)
│   └── ui-editor.html          # UI 에디터
├── scripts/                    # ★ 데이터 관리 유틸리티 스크립트 (58개)
│   ├── monster/                # 몬스터 HP·속도·버프 조정 (15개)
│   ├── damage/                 # 타워 데미지·공격속도 조정 (7개)
│   ├── gold/                   # 골드·경제 시스템 (5개)
│   ├── gacha/                  # 가챠 시스템 (5개)
│   ├── editor_sync/            # 에디터 동기화 (10개)
│   ├── check/                  # 검증·분석 (8개)
│   ├── migrate/                # 이름변경·마이그레이션 (4개)
│   └── utility/                # 유틸리티 (4개)
├── MD/
│   ├── README.md               # ← 이 파일
│   └── 타워+스킬타입.md         # 타워/스킬 상세 기술 문서
└── caveman/                    # 기타 리소스
```

---

## 4. 아키텍처 개요

```
stats.json (데이터 소스)
    ├── units[]        ← 타워 45종 정의 (능력치 + skillId)
    ├── skills{}       ← 스킬 5종 정의 (발사체 동작 + category)
    └── monsters{}     ← 몬스터 50라운드 정의 (HP, 타입, 보스여부)

config.js (전역 설정)
    ├── TYPE_EFFECTIVENESS     ← 일반 몬스터 타입 상성 테이블
    ├── BOSS_EFFECTIVENESS     ← 보스 전용 방어 테이블
    ├── GACHA_RATES            ← 등급별 뽑기 확률
    └── COLORS                 ← 타워/몬스터 색상 정의

Game Loop (GameScene.js)
    Tower.update()
        └── skill.execute(tower, target)
                └── Projectile.fire() → hit()
                        ├── CombatSystem.calculateDamage()
                        └── monster.applyPoison()  ← duration 스킬만

Monster.update()
    └── _updatePoison(delta)   ← 독 틱 처리
```

---

## 5. 게임 시스템

### 경로 구조
몬스터는 정사각형(440×440px) 경로를 **반시계 방향**으로 무한 순환합니다.
```
스폰 (12시) → 좌상 → 좌하 → 우하 → 우상 → 스폰 (반복)
```

### 타워 배치
- 경로 안쪽과 바깥쪽의 **그리드 슬롯**에 배치
- 슬롯 크기: 34px, 인벤토리에서 드래그하여 배치

### 웨이브 시스템
| 항목 | 내용 |
|---|---|
| 몬스터 스폰 간격 | 1,600ms |
| 보스 라운드 | R8, R16, R24, R32, R40, R48, R50 |
| 보스 시간제한 | 있음 (초과 시 게임 오버) |

---

## 6. 타워 데이터

### 타워 그룹 (총 45종)

| 그룹 | 수 | 뽑기 가능 | 스킬 | 특징 |
|---|---|---|---|---|
| **일반 타워** | 27종 | ❌ (비활성) | 1~3번 (즉시) | 3공격타입 × 9등급 = 27종 |
| **연쇄_연 타워** | 9종 | ❌ (비활성) | 4번 (연쇄 번개) | 일반 공격타입, 체인 5회 |
| **독_dok 타워** | 9종 | ✅ **활성** | 5번 (맹독 중첩) | 폭발 공격타입, 치명타 0% |

### 등급 체계 (9단계)

| 등급 | 한글 | 뽑기 확률 |
|---|---|---|
| normal | 일반 | 50.000% |
| rare | 레어 | 33.100% |
| ancient | 고대 | 10.200% |
| relic | 유물 | 5.100% |
| saga | 서사 | 0.800% |
| legend | 전설 | 0.500% |
| epic | 에픽 | 0.200% |
| myth | 신화 | 0.080% |
| primordial | 태초 | 0.019% |

### 일반 타워 전체 목록 (27종)

| ID | 이름 | 등급 | 공격타입 | 공격력 | 공속(ms) | 사거리 | 스킬 |
|---|---|---|---|---|---|---|---|
| n1 | 병사 | normal | normal | 95 | 1000 | 120 | 1 |
| n2 | 폭파병 | normal | explosive | 108 | 1300 | 100 | 3 |
| n3 | 진동병 | normal | vibration | 76 | 700 | 132 | 3 |
| r1 | 기사 | rare | normal | 124 | 900 | 130 | 2 |
| r2 | 포병 | rare | explosive | 148 | 1170 | 110 | 3 |
| r3 | 음파사 | rare | vibration | 98 | 630 | 143 | 1 |
| a1 | 마법사 | ancient | normal | 224 | 800 | 145 | 2 |
| a2 | 화염포 | ancient | explosive | 270 | 1040 | 123 | 1 |
| a3 | 진동사 | ancient | vibration | 180 | 560 | 160 | 1 |
| e1 | 성기사 | relic | normal | 382 | 720 | 160 | 1 |
| e2 | 포격사 | relic | explosive | 458 | 936 | 136 | 3 |
| e3 | 공명사 | relic | vibration | 306 | 504 | 176 | 3 |
| s1 | 대마법사 | saga | normal | 1,980 | 600 | 190 | 3 |
| s2 | 파괴자 | saga | explosive | 2,376 | 780 | 162 | 2 |
| s3 | 공명자 | saga | vibration | 1,584 | 420 | 209 | 2 |
| l1 | 전설 전사 | legend | normal | 2,468 | 550 | 210 | 1 |
| l2 | 전설 포격 | legend | explosive | 2,960 | 715 | 179 | 2 |
| l3 | 전설 음률 | legend | vibration | 1,974 | 385 | 231 | 2 |
| ep1 | 에픽 현자 | epic | normal | 4,977 | 480 | 240 | 3 |
| ep2 | 에픽 파괴 | epic | explosive | 5,974 | 624 | 210 | 1 |
| ep3 | 에픽 공명 | epic | vibration | 3,984 | 336 | 264 | 2 |
| m1 | 신화 신관 | myth | normal | 9,443 | 400 | 280 | 3 |
| m2 | 신화 파괴 | myth | explosive | 11,328 | 520 | 238 | 2 |
| m3 | 신화 진동 | myth | vibration | 7,553 | 280 | 308 | 1 |
| p1 | 태초의 존재 | primordial | normal | 26,609 | 300 | 340 | 3 |
| p2 | 태초의 파괴 | primordial | explosive | 31,929 | 390 | 289 | 2 |
| p3 | 태초의 진동 | primordial | vibration | 21,281 | 210 | 374 | 3 |

### 독 타워 (_dok, 9종) — 현재 뽑기 활성

| ID | 이름 | 등급 | 공격력 | 공속(ms) | 특징 |
|---|---|---|---|---|---|
| n2_dok | 폭파병_독 | normal | 13 | 1300 | 치명타 0%, 맹독 20스택 |
| r2_dok | 포병_독 | rare | 18 | 1170 | 치명타 0%, 맹독 20스택 |
| a2_dok | 화염포_독 | ancient | 32 | 1040 | 치명타 0%, 맹독 20스택 |
| e2_dok | 포격사_독 | relic | 55 | 936 | 치명타 0%, 맹독 20스택 |
| s2_dok | 파괴자_독 | saga | 285 | 780 | 치명타 0%, 맹독 20스택 |
| l2_dok | 전설 포격_독 | legend | 355 | 715 | 치명타 0%, 맹독 20스택 |
| ep2_dok | 에픽 파괴_독 | epic | 717 | 624 | 치명타 0%, 맹독 20스택 |
| m2_dok | 신화 파괴_독 | myth | 1,359 | 520 | 치명타 0%, 맹독 20스택 |
| p2_dok | 태초의 파괴_독 | primordial | 3,831 | 390 | 치명타 0%, 맹독 20스택 |

> 독 타워 기본 공격력 = 동급 폭발형 타워의 **12% 수준**  
> 대신 적중 시 맹독 중첩(최대 20스택, 20초 지속)으로 지속 피해 누적

---

## 7. 스킬 시스템

### 스킬 목록 (5종)

| ID | 이름 | category | 투사체 속도 | 특징 |
|---|---|---|---|---|
| 1 | 느린 사격 | instant | 3 | 원형 대형 투사체 |
| 2 | 일반 사격 | instant | 5 | 기본 원형 투사체 |
| 3 | 빠른 사격 | instant | 7 | 다이아몬드형 투사체 |
| 4 | 연쇄 번개 | instant | 4 | 최대 5회 체인, 매 체인 85% 감쇠 |
| 5 | 맹독 중첩 | **duration** | 7 | 적중 시 독 중첩, 지속 20초, 최대 20스택 |

### category 비교

| 속성 | `instant` | `duration` |
|---|---|---|
| 치명타 | 발동 가능 (`criticalRate` 기반) | **항상 0%** |
| 독 적용 | 없음 | `monster.applyPoison()` 호출 |
| 스킬 클래스 | SingleShotSkill / ChainLightningSkill | PoisonDotSkill |

### 데미지 계산식

```
1. 타입 상성 배율 결정
   - 일반 몬스터: effectiveness = TYPE_EFFECTIVENESS[attackType][monsterSize]
   - 보스 타입:   effectiveness = BOSS_EFFECTIVENESS[attackType][bossType]

2. 치명타 판정 (instant 스킬만)
   isCritical = (random() * 10000 < criticalRate)
   criticalRate: 500=5%, 1000=10%, 0=불가능

3. 최종 데미지
   finalDamage = floor(damage × effectiveness)
   if isCritical: finalDamage = floor(finalDamage × 1.5)
```

---

## 8. 몬스터 & 보스 시스템

### 몬스터 크기 (3종)

| 타입 | 색상 | 모양 | 방어 특성 |
|---|---|---|---|
| small | 🟠 주황 | 원형 | 폭발 0.5×(강), 진동=1.0× |
| large | 🔵 파랑 | 사각형 | 폭발=1.0×, 진동 0.25×(강) |
| general | 💗 마젠타 | 별형 | 폭발 0.75×, 진동 0.5× |

### HP 곡선

| 구간 | 설명 |
|---|---|
| R01 ~ R20 | 기존 HP의 **10% → 20%** 선형 증가 (초반 완화) |
| R21 ~ R23 | R20(517) → R25(2,918) 선형 보간으로 자연 연결 |
| R25 ~ R50 | 원본 HP 곡선 (약 2,918 → 83,502) |

### 보스 시스템

보스는 `isBoss: true`로 식별되며, **48px 다이아몬드** 형태로 렌더링됩니다.

| 라운드 | 보스 타입 | HP | 색상 |
|---|---|---|---|
| R8 | boss_small (소형) | 1,270 | 🟠 주황 |
| R16 | boss_normal (일반) | 3,874 | 🔴 빨강 |
| R24 | boss_normal (일반) | 34,021 | 🔴 빨강 |
| R32 | boss_large (대형) | 46,392 | 🔵 파랑 |
| R40 | boss_normal (일반) | 58,762 | 🔴 빨강 |
| R48 | boss_small (소형) | 71,132 | 🟠 주황 |
| R50 | boss_large (대형) | 83,502 | 🔵 파랑 |

> 분포: 보스_일반 3개 / 보스_대형 2개 / 보스_소형 2개

---

## 9. 타입 상성 시스템

### 일반 몬스터 (TYPE_EFFECTIVENESS)

| 공격타입 | 소형(small) | 대형(large) | 일반(general) |
|---|---|---|---|
| 일반 | 1.0× | 1.0× | 1.0× |
| 폭발 | 🔵 0.5× | 1.0× | 🔵 0.75× |
| 진동 | 1.0× | 🔵 0.25× | 🔵 0.5× |

### 보스 전용 (BOSS_EFFECTIVENESS)

| 공격타입 | 보스_일반(boss_normal) | 보스_소형(boss_small) | 보스_대형(boss_large) |
|---|---|---|---|
| 일반 | 1.0× | 1.0× | 1.0× |
| 폭발 | 🔵 0.75× | 1.0× | 🔵 0.50× |
| 진동 | 🔵 0.50× | 🔵 0.25× | 1.0× |

> 🔵 = 저항 (해당 공격이 적게 들어옴)  
> 보스_대형은 폭발 타워에 강함, 보스_소형은 진동 타워에 강함

---

## 10. 독(DoT) 시스템

### 파라미터 (skillId 5 — 맹독 중첩)

| 파라미터 | 값 | 설명 |
|---|---|---|
| poisonDuration | 20,000ms | 독 지속 시간 (20초) |
| maxPoisonStacks | 20 | 최대 중첩 수 |
| tickRate | 1,000ms | 틱 간격 (1초마다 피해) |
| poisonDamageRatio | 1.0 | 틱당 기본 공격력의 100% |

### 처리 흐름

```
투사체 적중 → monster.applyPoison(towerId, unitData, skillData)
    → poisons[towerId] = { stacks, remaining, tickAccum, baseDamage, tickRate, ratio }

매 프레임 _updatePoison(delta):
    remaining -= delta
    tickAccum += delta
    while tickAccum >= tickRate:
        hp -= floor(baseDamage × ratio) × stacks  ← 스택 수 배수
        tickAccum -= tickRate
    if remaining <= 0: 해당 타워 독 항목 제거
```

### 시각 효과
- 적중 시 몬스터에 **초록 오버레이** 표시 (맥동 애니메이션)
- HP 바에 **보라색 영역**으로 예상 독 피해량 표시
- 독 소멸 시 오버레이 자동 제거

---

## 11. 가챠 시스템

### 확률 테이블

| 등급 | 확률 |
|---|---|
| normal | 50.000% |
| rare | 33.100% |
| ancient | 10.200% |
| relic | 5.100% |
| saga | 0.800% |
| legend | 0.500% |
| epic | 0.200% |
| myth | 0.080% |
| primordial | 0.019% |

### 현재 가챠 풀 상태

| 그룹 | 활성 여부 |
|---|---|
| 독_dok 타워 9종 | ✅ 활성 (뽑기 가능) |
| 일반 타워 27종 | ❌ 비활성 |
| 연쇄_연 타워 9종 | ❌ 비활성 |

---

## 12. 데이터 관리 도구

### 데이터 에디터 (`tools/data-editor.html`)

브라우저 기반 GUI. `localStorage`에 저장 → 게임 실행 시 config.js/unitData.js가 읽어 적용.

| 탭 | 내용 |
|---|---|
| 시스템 | 골드, 가챠 비용, 타입 상성, 보스 방어 테이블 |
| 타워 | 45종 유닛 능력치 (DPS 자동 계산, 가챠 활성 토글) |
| 스킬 | 5종 스킬 파라미터 (독 파라미터 포함) |
| 몬스터 | 50라운드 HP/타입/보스여부 |
| 스테이지 | 웨이브 구성 |

### DPS MODE

DPS 측정 전용 모드. 메인 메뉴에서 DPS MODE 토글 후 진입.

| 파라미터 | 기본값 | 설명 |
|---|---|---|
| spawnInterval | 2400ms | 몬스터 스폰 간격 |
| monsterHp | MAX_SAFE_INTEGER | 몬스터 HP (사실상 무한) |
| monsterSpeed | 0.9 | 몬스터 이동 속도 |
| goldReward | 0 | 킬당 골드 (비활성) |
| 일반 타입별 수량 | 4 | general/small/large 각 4마리 |
| 보스 타입별 수량 | 1 | boss_normal/boss_small/boss_large 각 1마리 |

> DPS MODE 설정은 `stats.json`의 `dpsMode` 객체 또는 `localStorage`의 `rtd_dpsModeData` 키로 관리

### 파이썬 유틸리티 스크립트 (`scripts/`)

모든 Python 스크립트는 `scripts/` 하위 8개 폴더로 분류 관리됩니다.

| 폴더 | 파일 수 | 설명 | 주요 스크립트 |
|---|---|---|---|
| `scripts/monster/` | 15 | 몬스터 HP·속도·버프 | `_adjust_early_hp.py`, `_apply_transition.py` |
| `scripts/editor_sync/` | 10 | 에디터 동기화 | `_sync_editor_units.py`, `_sync_check.py` |
| `scripts/check/` | 8 | 검증·분석 | `check.py`, `compare_run.py` |
| `scripts/damage/` | 7 | 타워 데미지·공속 | `_reduce_dok_damage_12.py`, `_rebalance_dok_speed.py` |
| `scripts/gold/` | 5 | 골드·경제 | `_redesign_gold.py`, `_linearize_gold.py` |
| `scripts/gacha/` | 5 | 가챠 시스템 | `_update_gacha.py`, `_enable_all_gacha.py` |
| `scripts/migrate/` | 4 | 이름변경·마이그레이션 | `_rename_boss_types.py`, `_rename_mixed.py` |
| `scripts/utility/` | 4 | 유틸리티 | `_stats_for_doc.py`, `update_index.py` |

---

## 13. 데이터 흐름 요약

```
[데이터 에디터]
  tools/data-editor.html
      │ localStorage 저장
      ▼
[런타임 오버라이드]
  config.js / unitData.js / skillData.js
      │ localStorage → 기본값 덮어쓰기
      ▼
[게임 실행 — GameScene.js]
  GachaSystem   → 타워 생성 (unitData)
  WaveSystem    → 몬스터 스폰 (monsterData + waveData)
  Tower.update()
      └── skill.execute()
              └── Projectile.hit()
                      ├── CombatSystem.calculateDamage()
                      │       ├── TYPE_EFFECTIVENESS  (일반 몬스터)
                      │       └── BOSS_EFFECTIVENESS  (보스 3종)
                      └── monster.applyPoison()  ← duration 스킬
                              └── _updatePoison(delta) ← 매 프레임 틱
```

---

## 📎 관련 문서

- [타워+스킬타입.md](타워+스킬타입.md) — 타워/스킬 상세 기술 사양
- `js/config.js` — 전역 수치 및 타입 상성 정의
- `assets/data/stats.json` — 실제 게임 데이터 (단일 진실 소스)

---

*Project RTD — Lucky Defense | Phaser 3 Tower Defense*
