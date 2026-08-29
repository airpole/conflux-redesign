# 현황 추출 (EXTRACTED FACTS)

> **출처**: `airpole/conflux-editor` main 브랜치 최신 (GitHub raw 직접 추출, 프로젝트 스냅샷보다 최신).
> **용도**: 오프라인 기획 시 "현황사항" 칸을 채우는 참조표. **여기 적힌 값은 추측이 아니라 코드 실측치**.
> **주의**: 이 값들은 "현재 코드가 이렇다"는 사실이지, "이렇게 유지해야 한다"는 결정이 아님.
> **⚠️ 옛 용어 사용**: 이 문서는 **현재 코드의 용어**(channel, lineEvents, gaugeType, D/ES/PS 등)를 그대로 쓴다. 새 설계 용어는 [[naming]] 대응표를 참조. 이 문서는 "코드 스냅샷"이므로 일부러 개명하지 않는다.
> 재구현 시 바꿀지 말지는 별도 결정 사항. (`_decisions/`는 현 볼트에 아직 없음 — 진짜 결정 문서가 생길 때까지 둔다. 이미 닫힌 결정은 본문에서 실재 문서로 연결.)

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

> **실측 주의**: Normal/Hard **두 게이지가 공존**하며, Hard는 TAIL_MISS(−2.5) ≠ MISS(−5).
>
> **구 코드 구조**: 2게이지(`gaugeType`) × lock(`lockTarget`/`lockMode`) 직교. → 재설계는 이를 단일 축 gaugeMode로 평탄화([수정]). 결정·표기·수치의 단일 출처 → [[gauge]].

---

## 4. 클리어 마크 / 락 / 랭크

### 클리어 마크 락 (`LOCK_TIERS`)
순서: strict → loose = `as` (All Sync) → `ap` (All Perfect) → `fc` (Full Combo) → bare gauge
- `lockMode`:
  - `terminate` = 조건 깨지는 순간 강제 종료
  - `cascade` = 한 단계 강등(AS→AP→FC→bare gauge)하고 계속, 곡 끝에 살아남은 최고 티어가 최종 마크. **코드의 bare gauge는 시작 시 고른 gaugeType 하나뿐**(fc 아래가 곧 끝).
    - → 재설계는 이 강등 모델을 [수정]. 병렬 평가·사슬 정의의 단일 출처 → [[gauge]] cascade.

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
`playStartedFromBeginning && !playAutoplay` (gauge.js:223 실측). 배속(`playUsedSlowRate`)은 기록을 막지 않는다 — 에디터 검수용 감속도 기록돼야 하고 게임은 rate 조절을 노출 안 함. 플래그는 미래 slow-practice용으로 추적만 유지.

---

## 5. 색상 (Colors) — constants.js 실측

> **이 섹션은 [[theme]]로 이전됨.** 색의 단일 출처는 `render/theme.md`. 아래는 원본 보존용이며, 갱신은 theme.md에서 한다.


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
| `LN_RELEASE_GRACE_MS` | 50 | LN 테일 릴리즈 유예 — **GOOD 창 위에 얹는 추가분**이지 관용 폭 전체가 아니다 (§8.1) |

---

### 8.1 LN tail 처리 — `play-input.js` `handlePlayKeyUp` 실측

```js
// play-input.js — keyup 경로
const tailMs = t2ms(note.startTick + note.duration);
if (curMs < tailMs - JUDGE_GOOD - LN_RELEASE_GRACE_MS) applyMidRelease(note, curMs);
else                                                    applyTailSuccess(note, curMs);
```

| 항목 | 실측 |
|---|---|
| tail 성공 임계 | `tailMs − JUDGE_GOOD(100) − LN_RELEASE_GRACE_MS(50)` = **`tailMs − 150ms`** |
| tail 자동완료 | **autoplay에서만** (`play.js` 루프). 수동 플레이는 keyup 전까지 tail이 미확정으로 남는다 |
| tail 성공 표시 | `applyTailSuccess` — `playCombo++`만 하고 판정 큐에 **아무것도 넣지 않는다**(화면에 텍스트 없음) |
| 중간 릴리즈 표시 | `applyMidRelease` — `playCombo = 0`, 큐에 `MISS` push |
| head MISS 회계 | `play.js` `checkPlayMisses` — 게이지 MISS **1회**. 주석: tail 손실은 점수에 이미 반영돼 이중 차감은 과벌이라고 적혀 있다 |
| hold 소유 | `PS.playHoldState[key] = note` (키 소유). keydown/keyup 양쪽에서 빈 키로 **상속(복사)**해 크로스 바인딩을 자가 치유한다 |

→ **의미**: 관용 폭 전체는 150ms다. `constants.js`만 읽으면 50으로 보이지만 사용처가 GOOD 창과 합산한다.
D-2026-024가 이 사용처를 읽지 않아 재설계 임계가 50으로 적혀 있었고, D-2026-039에서 150으로 정정했다.

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
- `targetPos`: 도착 위치 (내부 단위 0~64). 신 설계는 외부단위 −8~+8로 개명·재설계 → [[shape]].
- `easing`: `null`=Linear, `0`(duration=0)=Step. 'Step' easing 문자열은 v2→Linear 자동 마이그레이션됨.
- `duration`: 0이면 Step(즉시 점프), >0이면 Linear 보간

### lineEvents 필드 (⚠️ 핵심 미완성 영역)
- `lines: [25,25,25,25]` = 4개 라인 각각의 폭/위치 값 (내부 단위, 합 100 기준 추정)
- **state/cache/commands/load-chart에는 배선됨**: `lineEventsSorted` 캐시, `AddLineEvent` 커맨드, `invalidateLinesCache` 존재
- **편집 UI·렌더·게임 적용은 미구현** → 미사용 데이터라 보존 대상 아님. 신 설계는 백지 [신규] → [[lane-events]].

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

### 없는 씬 (구 코드에 파일 부재)
- ❌ `scene-music-select.js` — 곡 선택 화면
- ❌ `scene-game.js` — 게임 플레이 씬 (현재 play-*는 에디터 play 탭 기반)
- ❌ Result 씬 독립 여부 (play-result.js는 있으나 씬 통합 안 됨)

→ 닫힘: [[scene]]에서 재설계 확정 (song-select·gameplay scene 정의, result scene 승격). "코드에 파일 없음"은 구 코드 사실로 유지, 기획 공백은 해소됨.

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

> ⚠️ **핵심 구조 문제**: `play-*` 8개가 "에디터 play 탭"에서 자라나서 game 로직이 editor-state(`ES`)에 의존성을 끌 가능성. 재구현 시 **game을 editor의 하위가 아니라 동등한 씬으로 승격**, 공유 코어(판정·게이지·타이밍 순수 로직)를 아래로 내리는 의존성 역전 필요. → 닫힘: [[architecture]] §5 (game·editor 형제 그래프) + [[rationale]] (의존성 역전·editor scene 통일).

---

## 12. M2-2 렌더 레이아웃 전수 (`_plan/build-order.md` §3 M2-2 항목)

> 출처: `airpole/conflux-editor` commit `09aa8dad4` (2026-06-25) — `play-render.js`·`game-render.js`·`shape-render-helpers.js`·`constants.js`. D-2026-046으로 M2-1에서 이 항목으로 옮긴 실측 gate를 여기서 닫는다.

### 12.1 playfield 사각형 (`gw`/`gh`/`gx`/`gy`)

캔버스 CSS px 크기 `cw`×`ch`에서 **16:9로 letterbox**한다 (`drawPlayScreen`/`drawPlayIdle` 공통):

```js
const asp = 16 / 9;
if (cw / ch > asp) { gh = ch; gw = gh * asp; gx = (cw - gw) / 2; gy = 0; }
else { gw = cw; gh = gw / asp; gx = 0; gy = (ch - gh) / 2; }
```

DPR은 캔버스 픽셀→CSS px 환산에서 한 번 걷힌다(`cw = cv.width / dpr`) — 이후 `gw`/`gh`/`gx`/`gy`는 전부 CSS px 좌표계다. 배경은 두 겹: 캔버스 전체 `#000` 채움 뒤 playfield 영역만 `#050508`로 다시 채우고, 그 사각형으로 클립(clip)한 뒤 `drawGameFrame`을 부른다.

### 12.2 판정선 Y (`jY`)

```js
const JDEF = 8 / 9;
const frac = Math.min(JDEF, judgeLinePos ?? JDEF);  // 8/9보다 아래로만 허용(raise-only)
const jY = gy + gh * frac;
```

기본은 `gy + gh * 8/9`. `judgeLinePos`(CTX 필드, [[architecture]] §3에 이미 정본 seam 밖 host 주입 값으로 등재됨)는 **낮출 수만 있고 8/9보다 올릴 수 없다** — `Math.min(JDEF, …)`이 상한을 못박는다.

### 12.3 lane 구분선 굵기 · shape 경계 굵기 · 색

`shape-render-helpers.js`의 스타일 상수(게임/라이브 렌더용 `STYLE_GAME`·`STYLE_GAME_STEP`):

| 요소 | 굵기(px) | 색/알파 |
|---|---|---|
| shape 좌우 경계선(boundary) | **3** | `#ffffffc8` (≈0.78 알파) — 두 반투명 스트로크가 겹쳤을 때(shape가 선으로 collapse) 합성되는 값과 같게 맞춰서, 폭이 넓든 좁든 밝기가 안 변한다 |
| shape step 연결선(경계가 순간 이동하는 지점의 가로선) | 1.8 | `#ffffff88` |
| lane 내부 구분선(3개, `game-render.js` 인라인) | **1.5** | `#ffffff22` |
| 마디(measure)선 | 1.5 | `#ffffff44` |
| shape step 마커(가로선) | 2 | `#7ad6ff66` |

에디터 프리뷰용(`STYLE_SHAPE_EDITOR`)은 별도 색(`#6bb5ff`/`#ff6b8a`)이며 M2-2(게임 재생) 범위가 아니다 — 에디터 shape 탭은 M5.

### 12.4 shape 좌표 → canvas px 매핑

원본 raw 내부 단위 → 0..1 fraction: `sp2f(p) = p / 64`, 이어서 `x = gx + sp2f(p) * gw`(mirror 시 `gx + (1 - sp2f(p)) * gw`).

**재구현에서는 이 raw 상수(64)를 그대로 쓰지 않는다** — [[shape]] §1이 이미 좌표계를 외부단위 **-8~+8 단일**(저장=표시=입력)로 확정했고(`[수정]`), 원본의 `/64`는 그 통일 이전 원본 내부 표현(구 표기 스케일)에 대한 것이라 재설계 외부단위와 자릿수가 다르다. 재설계 매핑은 그 확정된 범위에서 직접 유도된다:

```
fraction = (value + 8) / 16    // value ∈ [-8, 8] → fraction ∈ [0, 1]
x = gx + fraction * gw          // mirror 시 gx + (1 - fraction) * gw
```

이 변환식 자체는 원본에 대응물이 없다(원본 좌표계가 다르므로) — [[shape]] §1의 좌표계 통일 결정에서 직접 유도되는 `[신규]`이며, 실측이 아니라 이미 닫힌 스펙 결정의 산수다.

### 12.5 콤보/판정/카운터/정확도 블록 (`drawUnifiedHUD`)

전부 `gw`/`gh` 비례, `cx_ = gx + gw/2` 중심 정렬. `cell = gw / 16`.

- **콤보 Y**: `comboY = jY - gh * (JDEF - 0.22)` — 판정선에서 고정 거리만큼 **위로 뜬 자리**. 판정선이 올라가면(=낮은 frac) 블록도 같이 올라가 기본 간격이 유지된다.
- 판정 텍스트 Y: `judgeY = comboY + comboSz/2 + G + judgeSz/2` (`G = gw * 0.008`)
- 카운터(SYNC/PERFECT/GOOD/MISS 4열) Y: `cntY = judgeY + judgeSz/2 + G + cntSz/2`, `cx_` 중심으로 `cntGap`(= `"9999"` 폭 + `cntSz*0.4`) 간격 4열
- 정확도 % Y: `pctY = cntY + cntSz/2 + G + pctSz/2`
- 폰트 크기: 콤보 `gw*0.06` / 판정 `gw*0.021` / 카운터 `gw*0.014` / 정확도 `gw*0.01625`
- 하단 스트립(제목·아티스트·난이도·score)은 **판정선이 움직여도 자리를 지킨다** — `jYDefault`(=`gy + gh*8/9`, raise 이전 기본값) 기준 고정 밴드 `[jYDefault, gy+gh]`에 배치되므로, 판정선을 올려도 늘어나거나 깨지지 않는다.
- 일시정지 버튼: 좌상단, `cell` 기준(`barW=cell*0.12`, `barH=cell*0.45`), 배경 없이 두 세로 막대.

### 12.6 게이지 바 위치 · 75% 색 반전

판정선이 **게이지 바를 겸한다**(별도 위치가 아니라 `jY` 그 자체):

```
바 트랙: fillRect(gx, jY - 3, gw, 6)   // 6px 두께, 전체 폭 fill (반투명 배경)
채움:    fillRect(gx, jY - 3, gw * frac, 6)   // frac = gaugeValue / 100
```

색: `gaugeType === 'hard'`면 항상 `#ff4a5a`(빨강, 반전 없음). Normal은 `NORMAL_CLEAR_PCT`(**75**, `constants.js`) 미만이면 `#4aff8a`(초록), **75 이상이면 `#4ad6ff`(하늘색)로 반전**한다 — 클리어 확정 신호. 채움 위에 흰 leading-edge 라인(1px)과 세로 글로우(±6px 그라디언트)가 겹친다.

### 12.7 히트 이펙트 반지름 · sudden lane cover

- 반지름은 **shape 폭이 아니라 `gw`(field 전체 폭)에서 고정 비율로** 뗀다 — shape가 collapse해도 이펙트가 안 보이는 문제를 막기 위한 의도적 설계: `FIXED_R = gw * 0.045`. wide 노트는 `FIXED_R * 1.6`.
- 이펙트는 판정선(`jY`) 위/아래 반원(semicircle) — normal은 채널 위치에 따라 위/아래, wide는 항상 위.
- sudden lane cover: `coverH = (jY - gy) * Math.min(0.95, sudden / 100)`, `gy`부터 `coverH`만큼 `#000` 불투명 사각형으로 덮는다(최대 판정선까지의 95%). 노트 렌더 **뒤**, 판정선/게이지/이펙트 **앞**에 그린다.

### 12.8 판정 텍스트(FAST/SLOW) 위치

정확도 % 아래: `fsY = pctY + pctSz/2 + G + fsSz/2`, `fsSz = gw*0.016`. FAST는 `#ff5a6a`, SLOW는 `#5aa0ff`(`constants.js` `FAST_COLOR`/`SLOW_COLOR`), 500ms 페이드.

### 12.9 lane 최소 간격 px — 원본에 대응물 없음 (`없음`) → 제한 없음으로 확정 (D-2026-048)

[[lane-events]] §7 잔여 "최소 간격의 구체 px 값"을 찾아 `shape.js`·`overlaps.js`·게임 렌더 전체를 뒤졌으나 **원본에 lane 최소 간격을 강제하는 코드가 없다**(`min`/`clamp`/`MIN_` 패턴 grep 0건). [[lane-events]] §1의 "투영(gameplay, 경계+순서 클램프+최소 간격)" 서술은 재설계가 새로 도입하려는 `[신규]` 개념이지 원본 실측이 아니었다 — 사용자 확인 결과 최소 간격 제한 자체가 없고, 구분선이 붙어 선처럼 좁아지는 것도 의도된 연출이다(D-2026-048). §1·§4·§7의 "최소 간격" 서술을 그에 맞춰 정정했다.

---

## 부록: 온라인에서 추가 추출 필요한 placeholder 목록

오프라인에서 결정만 하고, 아래는 온라인 복귀 시 정밀 추출:

- [x] **렌더 레이아웃 전수**: jY(판정선 Y), gw/gh 산출, 레인 구분선 굵기, 콤보 블록 Y앵커, 게이지 바 위치/75% 색 반전, 히트이펙트 반지름(gw×0.045), sudden lane cover, 판정 텍스트 위치 — §12로 이관 완료 (M2-2 gate 실측)
- [ ] **play-* 의존성 그래프**: 각 play 파일이 ES(editor-state)를 import하는 지점 전수 → 분리 경계 확정 근거
- [ ] **scene-title/modeselect/settings 실제 내용**: 화면 구성·전환 타깃
- [ ] **textEvents/keybeam/shape boundary alpha** 등 세부 렌더 수치
- [ ] **.cfx 포맷 직렬화 코드** (import-export.js): fflate 사용부, content-hash asset ID, GC
- [ ] **timing의 t2y (tick→Y 좌표) 변환식** 전체 (가변속 스크롤 핵심)
