# 현황 추출 (EXTRACTED FACTS)

> **출처**: `airpole/conflux-editor` main 브랜치 최신 (GitHub raw 직접 추출, 프로젝트 스냅샷보다 최신).
> **용도**: 오프라인 기획 시 "현황사항" 칸을 채우는 참조표. **여기 적힌 값은 추측이 아니라 코드 실측치**.
> **주의**: 이 값들은 "현재 코드가 이렇다"는 사실이지, "이렇게 유지해야 한다"는 결정이 아님.
> **⚠️ 옛 용어 사용**: 이 문서는 **현재 코드의 용어**(channel, lineEvents, gaugeType, D/ES/PS 등)를 그대로 쓴다. 새 설계 용어는 [[naming]] 대응표를 참조. 이 문서는 "코드 스냅샷"이므로 일부러 개명하지 않는다.
> 재구현 시 바꿀지 말지는 `_decisions/`에서 별도로 결정.

---

## 1. 시간 해상도 / 채널

| 항목 | 값 | 출처 |
|---|---|---|
| TPB (Ticks Per Beat) | `1920` | constants.js |
| 채널 → 라인 매핑 | ch1→L1, ch2→L2, ch3→L3, ch4→L4 (`CHL`) | constants.js |
| 6키 → 4라인 매핑 (`KEY2LINE`) | key1→L1, key2→L2, key3→L3, key4→L2, key5→L3, key6→L4 | constants.js |
| 2키→1라인 (오버랩 가능) 채널 | ch2, ch3 (`OVERLAP_CHANNELS`) | constants.js |

→ **의미**: L2와 L3는 각각 두 개의 물리 키로 칠 수 있음(동시치기/코드 가능). L1·L4는 단일 키.

---

## 2. 판정창 (Judgment Windows, ms)

| 판정 | 창 (±ms) | 상수명 |
|---|---|---|
| SYNC | 25 | `JUDGE_SYNC` |
| PERFECT | 50 | `JUDGE_PERFECT` |
| GOOD | 100 | `JUDGE_GOOD` |
| WIDE 전용 SYNC | 100 | `JUDGE_WIDE_SYNC` |

**판정 규칙 (play-judgment.js 실측)**:
- 일반 노트: `abs ≤ 25 → SYNC`, `≤ 50 → PERFECT`, `≤ 100 → GOOD`, 초과 → 미입력
- WIDE 노트: 항상 SYNC 또는 MISS만 발생 (±100ms 안이면 SYNC). PERFECT/GOOD 칸은 절대 안 닿음.
- **노멀 우선**: 같은 키 입력에 wide와 normal이 겹치면, 레인 키는 normal을 먼저 가져감 (normal은 그 레인 키로만 칠 수 있으므로). wide는 다른 키가 처리. → "입력 잡아먹힘(input eaten)" 버그 방지.
- **earliest-tick 선택**: 창 안에 여러 노트가 있으면 절대 거리가 가까운 게 아니라 **startTick이 가장 작은(가장 오래된)** 노트를 집음.
- **held-wide 제외**: 다른 키가 이미 지속 중인 wide는 head로 재판정 안 함 (콤보/점수 이중 카운트 방지).

---

## 3. 게이지 (Gauge) — gauge.js / constants.js 실측

### 공식
```
totalUnits   = Σ notes (tap=1, LN=2)
a (단위 스케일) = GAUGE_NORMAL_TOTAL_GAIN / totalUnits   = 150 / totalUnits
gaugeMax     = 100  (하드코딩, 초과분 버림)
gaugeValue   = clamp(0, 100, gaugeValue + delta)
```

### Normal 게이지 (회복형, 길이 무관)
| 판정 | delta | 종류 |
|---|---|---|
| SYNC | `+1.0 × a` | 곱셈(가변) |
| PERFECT | `+1.0 × a` | 곱셈 |
| GOOD | `+0.5 × a` | 곱셈 |
| TAIL_OK | `+1.0 × a` | 곱셈 |
| MISS | `−2.0%` | **절대값** |
| TAIL_MISS | `−2.0%` | **절대값** (MISS와 동일) |

- 시작값: `0`
- 클리어 기준: 곡 끝에서 `gauge ≥ 75%` (`NORMAL_CLEAR_PCT`)
- All-SYNC 시 잠재 회복 합 = +150% (100에서 캡, 즉 절반 유닛만 SYNC면 클리어 도달)
- 손실은 절대값이라 후살(late collapse) 비용이 곡 길이와 무관하게 일정

### Hard 게이지 (생존형)
| 판정 | delta |
|---|---|
| SYNC / PERFECT | `+0.15%` |
| GOOD | `0` |
| TAIL_OK | `+0.1%` |
| MISS | `−5.0%` |
| TAIL_MISS | `−2.5%` |
| 시작값 | `100` |
| 실패 | gauge가 `0` 닿는 즉시 |

- 모든 항목이 절대 퍼센트, **저게이지 자비(mercy) 없음**.

> ⚠️ **메모리와 코드 불일치 주의**: 시스템 메모리에는 "Hard mercy removed, TAIL_MISS = MISS, 100% cap, a=150%/total"로 잡혀있는데, 이는 **Normal 게이지** 기준 설명. 현재 코드에는 Normal/Hard **두 게이지가 공존**하고 Hard는 TAIL_MISS≠MISS(−2.5 vs −5). 재구현 시 "게이지를 몇 종류로 둘 것인가"는 미결정 → `_decisions/04_gauge_clear.md` 참조.

---

## 4. 클리어 마크 / 락 / 랭크

### 클리어 마크 락 (`LOCK_TIERS`)
순서: strict → loose = `as` (All Sync) → `ap` (All Perfect) → `fc` (Full Combo) → bare gauge
- `lockMode`:
  - `terminate` = 조건 깨지는 순간 강제 종료
  - `cascade` = 한 단계 강등(AS→AP→FC→게이지)하고 계속, 곡 끝에 살아남은 최고 티어가 최종 마크

### 랭크 (백만점제, `RANK_TABLE`, 높음→낮음 첫 도달)
| 랭크 | 점수 |
|---|---|
| U | 1,000,000 |
| S+ | 995,000 |
| S | 985,000 |
| A+ | 970,000 |
| A | 950,000 |
| B | 900,000 |
| C | 800,000 |
| D | 700,000 |
| E | 500,000 |
| F | 0 |

### 기록 적격성 (recordEligible)
`startedFromBeginning && !usedSlowRate && !autoplay` (메모리 기준; 코드에서 재확인 필요 → placeholder)

---

## 5. 색상 (Colors) — constants.js 실측

> **이 섹션은 [[colors]]로 이전됨.** 색의 단일 출처는 `render/colors.md`. 아래는 원본 보존용이며, 갱신은 colors.md에서 한다.


### 노트 렌더
| 용도 | HEX |
|---|---|
| WIDE 헤드 | `#4AE8FF` (밝은 ice-cyan) |
| WIDE 바디 | `#008898` / 반투명 `#008898cc` (≈80%, 그리드 비침) |
| 오버랩(코드) 노트 | `#FFE14A` (gold) |
| 오버랩 바디 | `#C89830` |
| 노멀 바디 | `#8888a0` (muted blue-gray) |
| 텍스트 이벤트 | `#4ae0ff` |
| 무효(L1/L4 오버랩 경고) | `#ff3040` |

### 게이지 / 상태
| 용도 | HEX |
|---|---|
| Normal 게이지 | `#4aff8a` (초록) |
| Hard 게이지 | `#ff4a5a` (빨강) |
| Lock none | `#9aa0a6` |
| Lock fc | `#5ad1ff` (하늘) |
| Lock ap | `#ffd23f` (노랑) |
| Lock as | `#ffffff` (흰) |
| Fast 피드백 | `#ff5a6a` (빨강) |
| Slow 피드백 | `#5aa0ff` (파랑) |

### Shape 에디터 선
| 용도 | HEX | 굵기(px) |
|---|---|---|
| L curve (Blue) | `#6bb5ff` | 1.5 |
| R curve (Red) | `#ff6b8a` | 1.5 |
| Step L connector | `#6bb5ffaa` | 1.5 |
| Step R connector | `#ff6b8aaa` | 1.5 |
| (Shape gap line) | null (안 그림) | — |

> ⚠️ **선 굵기·판정선 Y·HUD 앵커·히트이펙트 반지름 등 "렌더 레이아웃" 수치는 game-render.js / play-render.js / shape-render-helpers.js에서 추가 추출 필요.** 위는 Shape 에디터 선만 확정. 게임 플레이필드 레이아웃 수치(jY, gw/gh 비율, 레인 구분선 굵기, 콤보 블록 위치, 히트 이펙트 gw×0.045 등)는 온라인에서 game-render 정밀 추출 패스로 채울 placeholder.

---

## 6. 입력 / 키 바인딩 — constants.js 실측 (GitHub 최신)

### 레인 키 (`DEFAULT_KEYS`, 6키)
| key | 코드 |
|---|---|
| 1 | `KeyE` |
| 2 | `KeyR` |
| 3 | `Space` |
| 4 | `ArrowDown` |
| 5 | `Backslash` |
| 6 | `Numpad7` |

→ 메모리의 "E R Space ↓ \ Numpad7"과 일치 (스냅샷은 구버전 Numpad0/8/9였음).

### 액션 키 (`DEFAULT_ACTION_KEYS`, 비레인)
| 액션 | 코드 | 의미 |
|---|---|---|
| speedDown | `F1` | 배속(스크롤 속도) −0.1 |
| speedUp | `F2` | 배속 +0.1 |
| restart | `F5` | 처음부터 재시작 (풀스크린 세션 중에도) |

---

## 7. 배속 (SPEED / 배속) vs Pitch — 절대 혼동 금지

| 개념 | 코드 변수 | 범위 | 스텝 | 효과 |
|---|---|---|---|---|
| **배속 (SPEED)** | `ES.pvSpd` | `SPEED_MIN 1.0` ~ `SPEED_MAX 10.0` | `SPEED_STEP 0.1` | 노트 낙하/스크롤 속도만. 오디오 무관. |
| **pitch** | (재생 rate) | — | — | 오디오 재생 속도(음정 변함). **1.0 고정**. |

- F1/F2가 조정하는 건 **배속**, pitch 아님.
- 스크롤 시스템은 **가변 속도(BPM-weighted)**, 상수 아님. (CMOD처럼 보였던 건 차트측 tick 보정)

---

## 8. 리드인 / 타이밍 상수

| 항목 | 값 | 의미 |
|---|---|---|
| `LEAD_IN_MS` | 3000 | (GitHub 최신; 스냅샷은 2000) |
| `PLAY_RESUME_LEAD_MS` | 3000 | 중간 시작(Space) 시 선행 빈 스크롤 |
| `LN_RELEASE_GRACE_MS` | 50 | LN 테일 릴리즈 유예 |

---

## 9. 차트 데이터 모델 (state.js의 `D`)

```js
D = {
  meta: { ..., jacketImage: "", jacketBrightness: 50 },
  tempo:          [{tick: 0, bpm: 120}],
  timeSignatures: [{tick: 0, numerator: 4, denominator: 4}],
  shapeEvents:    [{startTick, duration, isBlue, targetPos, easing}],
  lineEvents:     [{startTick: 0, duration: 0, lines: [25, 25, 25, 25]}],   // ← 데이터만 존재, 편집 UI 없음
  notes:          [],
  textEvents:     []
}
```

### shapeEvents 필드
- `isBlue`: true=L(Blue), false=R(Red). **schema v3** (이전 `isRight` → `isBlue` 폴라리티 반전 마이그레이션 완료)
- `targetPos`: 도착 위치 (내부 단위)
- `easing`: `null`=Linear, `0`(duration=0)=Step. 'Step' easing 문자열은 v2→Linear 자동 마이그레이션됨.
- `duration`: 0이면 Step(즉시 점프), >0이면 Linear 보간

### lineEvents 필드 (⚠️ 핵심 미완성 영역)
- `lines: [25,25,25,25]` = 4개 라인 각각의 폭/위치 값 (내부 단위, 합 100 기준 추정)
- **state/cache/commands/load-chart에는 배선됨**: `lineEventsSorted` 캐시, `AddLineEvent` 커맨드, `invalidateLinesCache` 존재
- **편집 UI·렌더·게임 적용은 미구현** → `_decisions/03_lineevents.md`에서 결정 필요

### shape 위치 스냅
- `sPosSnapVals = [4, 2, 1]` (레벨 0/1/2)

---

## 10. Scene 시스템 — 인프라만 존재 (scene-manager.js 실측)

### 구현된 것
- `scene-manager.js` (125줄): `registerScene/goScene/goBack/currentScene/hasScene`
- 씬 = 에디터 탭 **위** 레이어. 씬 전환은 mount el의 `style.display` 토글; 탭 전환은 `.panel.on` 토글. 두 축은 같은 DOM 속성 안 건드림 (충돌 없음).
- 라이프사이클 훅: `mount()` (최초 1회 lazy DOM 빌드), `onEnter()` (보일 때마다), `onExit()` (나갈 때마다)
- 백스택: `goScene` push → `goBack` 으로 Title→Mode→Music 드릴다운 unwind
- 빌드 게이트: game-only 빌드는 editor 씬 mount() 안 돌아 비용 0

### 존재하는 씬 파일
| 파일 | 줄 | 상태 |
|---|---|---|
| scene-manager.js | 125 | ✅ 인프라 완성 |
| scene-title.js | 83 | 존재 (내용 확인 필요) |
| scene-modeselect.js | 128 | 존재 |
| scene-settings.js | 300 | 존재 |

### 없는 씬 (⚠️ 기획 공백)
- ❌ `scene-music-select.js` — 곡 선택 화면
- ❌ `scene-game.js` — 게임 플레이 씬 (현재 play-*는 에디터 play 탭 기반)
- ❌ Result 씬 독립 여부 미정 (play-result.js는 있으나 씬 통합 안 됨)

---

## 11. 아키텍처 부채 현황 (재구현 시 청산 대상)

| 지표 | 현재 | 목표 |
|---|---|---|
| `onclick=` (index.html) | **0** | 0 ✅ 이미 청산 |
| `saveHist` 잔존 | 11 (commands 3, history 1, meta-ui 1, notes-input 1, notes-tools 2, shape-input 2, shape-tools 1) | 0 (command 시스템 일원화) |
| lazy `import()` | 40 | 순환참조 정리로 감소 |
| 총 라인 (스냅샷) | ~9,700 | — |

### 의존성 레이어 (현재)
```
L0 state:   editor-state, audio-state, play-state, utility, constants
L1 data:    shape, timing, cache, overlaps, scheduler, commands, state, renderer
L1.5 helper: grid-render, shape-render-helpers
L2 service: jacket, audio, load-chart, history, fullscreen, canvas-resize
L3 UI tool: tab-nav, grid-picker, edit-options, text-events, notes-tools,
            shape-tools, key-config, meta-ui, file-manager, import-export, autosave
L4 render:  notes-render, shape-render, game-render, play-render
L5 input:   notes-input, shape-input, edit-playback, play-judgment, play-input, play, keyboard
L6 entry:   main
+ scene-*:  scene-manager, scene-title, scene-modeselect, scene-settings
```

> ⚠️ **핵심 구조 문제**: `play-*` 8개가 "에디터 play 탭"에서 자라나서 game 로직이 editor-state(`ES`)에 의존성을 끌 가능성. 재구현 시 **game을 editor의 하위가 아니라 동등한 씬으로 승격**, 공유 코어(판정·게이지·타이밍 순수 로직)를 아래로 내리는 의존성 역전 필요. → `_decisions/02_game_editor_split.md`

---

## 부록: 온라인에서 추가 추출 필요한 placeholder 목록

오프라인에서 결정만 하고, 아래는 온라인 복귀 시 정밀 추출:

- [ ] **렌더 레이아웃 전수**: jY(판정선 Y), gw/gh 산출, 레인 구분선 굵기, 콤보 블록 Y앵커, 게이지 바 위치/75% 색 반전, 히트이펙트 반지름(gw×0.045), sudden lane cover, 판정 텍스트 위치 — game-render.js/play-render.js 정밀 추출
- [ ] **play-* 의존성 그래프**: 각 play 파일이 ES(editor-state)를 import하는 지점 전수 → 분리 경계 확정 근거
- [ ] **scene-title/modeselect/settings 실제 내용**: 화면 구성·전환 타깃
- [ ] **recordEligible 코드 위치·정확한 조건**
- [ ] **textEvents/keybeam/shape boundary alpha** 등 세부 렌더 수치
- [ ] **.cfx 포맷 직렬화 코드** (import-export.js): fflate 사용부, content-hash asset ID, GC
- [ ] **timing의 t2y (tick→Y 좌표) 변환식** 전체 (가변속 스크롤 핵심)
