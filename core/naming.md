# 명칭 규칙 (Naming Convention)

> **위치**: 새 설계 볼트의 1급 문서. 모든 다른 문서·코드가 여기 이름을 따른다.
> **목적**: 백지 재구현의 식별자를 역할에서 자명하게 짓는다. 현재 코드 이름은 *참조*일 뿐 계승하지 않는다.
> **짝 문서**: [[glossary]] (개념 사전 — 영어 용어 + 한국어 설명)

---

## 0. 출처 태그 (모든 동작 서술에 부착)

새 설계에서 각 동작은 현재 코드 대비 셋 중 하나다. 문서·테스트·커밋에 태그로 표시:

| 태그 | 의미 | 하네스 테스트 |
|---|---|---|
| `[보존]` | 현재 코드 동작을 1:1 유지. 바뀌면 회귀 버그. | 현재 테스트를 그대로 물려 통과 |
| `[수정]` | 현재는 이랬으나 의식적으로 바꿈. **왜** 한 줄 필수. | 테스트 새로 작성, 옛것 의도적 폐기 |
| `[신규]` | 현재 없음. 기획으로 결정. | 처음부터 작성 |

→ 이 태그가 "실수로 바뀐 것"과 "일부러 바꾼 것"을 항상 구분 가능하게 만든다.

---

## 1. 식별자 짓기 원칙

1. **약어 금지.** `t2ms` ❌ → `tickToMs` ✅. `sp2f`, `ms2t`, `pvSpd`, `CHL` 같은 암호 전면 폐기.
2. **함수는 동사+목적어.** 이름만 보고 무엇을 반환/수행하는지 안다. `getShape` 보다 `shapeGeometryAt(tick)`.
3. **불리언은 is/has/can.** `isWide`, `hasUndo`, `canPlace`.
4. **도메인 개념은 [[glossary]]의 영어 용어 하나로 고정.** 한 개념에 두 이름을 두지 않는다. 특히 `scrollSpeed`와 `playbackRate`는 영원히 분리. (한국어 설명은 쓰되, 개념을 가리키는 단어는 영어 그대로.)
5. **단위를 이름에 박는다.** ms/tick/px/pct가 헷갈리는 곳은 접미사로: `durationMs`, `startTick`, `widthPx`, `gaugePct`.
6. **상태 객체는 전체 단어.** `D`/`ES`/`PS` → `chart`/`editorState`/`playState`.
7. **레이어 접두사가 파일명.** `core-`, `env-`, `render-`, `edit-`, `game-`, `scene-`, `app-`. 파일명만 보고 의존 방향을 안다 (위→아래만 import). 레이어 정의 → [[architecture]].
8. **모든 시간축 이벤트는 `startTick`을 가진다.** duration 없는 순간 이벤트(tempo·timeSignature)도 `tick`이 아니라 `startTick`. 시작점 개념은 동일하다.
9. **이벤트 배열은 자연 복수.** 이미 "event"가 의미상 맞는 것만 `Events` 접미사(`shapeEvents`/`laneEvents`/`textEvents`), 나머지는 단순 복수(`tempos`/`timeSignatures`/`notes`). `tempoEvents`·`noteEvents` 같은 장황한 형태는 쓰지 않는다.

---

## 2. 함수 대응표 (현재 → 새 이름)

### 타이밍 / 스크롤 (상세 → [[timing]])
| 현재 | 새 이름 | 역할 | 태그 |
|---|---|---|---|
| `t2ms(tick)` | `tickToMs(tick)` | 틱 → 누적 경과 ms (BPM 세그먼트) | 보존 |
| `ms2t(ms)` | `msToTick(ms)` | ms → 틱 | 보존 |
| `t2y` 내부 클로저 (분리) | `scrollProgressAt(tick, nowMs)` | 단위 없는 스크롤 진행도 `(tickToMs−nowMs)/visMs`. core | 신규 |
| `t2y` 내부 클로저 (분리) | `scrollYAt(...)` → **render층** | 진행도를 화면 Y로. 캔버스 레이아웃 의존이라 core 아님 | 보존 |
| `tickToMeasure` / `measureToTick` | 동일 | 틱 ⇄ measure.beat.sub 표기 (마디 세그먼트) | 보존 |
| `getGridLines(st, et)` | 동일 | 범위 내 마디·박선 tick 목록. core (px는 render) | 보존 |
| `getMinTick()` | 동일 | 렌더 가능 최소 tick (1마디 pre-roll) | 보존 |
| `getBPMAt(tick)` | (제거) | 死코드(호출처 없음). 필요 시 세그먼트로 재추가 | 수정 |
| `compBPM()` / `invalidateTSCache()` | (제거) | 수동 캐시 무효화 → 의존성 선언으로 대체 | 수정 |

### Shape / 지오메트리
| 현재 | 새 이름 | 역할 | 태그 |
|---|---|---|---|
| `getShape(tick)` | `shapeGeometryAt(tick)` | 그 틱의 두 경계 위치 `{blue, red}` (구 `{left,right}`) | 수정 |
| `buildShapePointArrays` | `buildFieldSamplePoints` | 레인 곡선 샘플 배열 생성 | 보존 |
| `getLines(tick)` | `laneLayoutAt(tick)` | 그 틱의 구분선 1·2·3 상대위치(0~1) | 수정* |
| `normalizeShapeChain` | `normalizeShapeChain` (유지 가능) | shape 이벤트 체인 정규화 | 보존 |
| `sp2f(...)` | `shapePosToField(...)` | shape 외부단위(-8~+8) → 필드 좌표 (구 내부0~64) | 수정 |
| `getStepTicks` / `isStepTick` | `stepTicks` / `isStepTick` | step(즉시점프) 이벤트 틱 | 보존 |
| `applyEasing(t, type)` | `applyEasing(t, easing)` | easing 곡선 적용 (linear/arc/inSine/outSine 등) | 보존 |

\* `laneLayoutAt`은 구분선 상대위치만 반환. px 변환은 render가 경계와 lerp. 전체 설계 → [[lane-events]].

### 판정 / 입력
| 현재 | 새 이름 | 역할 | 태그 |
|---|---|---|---|
| `getPlayJudgment(ch, ms)` | `judgeKeyPress(key, nowMs)` | 키 입력에 대한 판정 후보 산출 | 보존 |
| `applyJudgment` | `commitJudgment` | 판정 확정 → 상태 반영 | 보존 |
| `applyTailSuccess` | `commitTailRelease` | hold tail 릴리즈 성공 → **SYNC로 처리** | 수정† |
| `applyMidRelease` | `commitMidRelease` | hold 중간 릴리즈 → **MISS로 처리** | 수정† |
| `seedPlayStateFromCurMs` | `seedPlayStateAt(nowMs)` | 중간 시작 시 과거 노트 SYNC 시드 | 보존 |
| `feedFastSlow` | `recordFastSlow` | Fast/Slow 피드백 기록 | 보존 |

† TAIL_OK/TAIL_MISS 판정 종류를 폐기하고 SYNC/MISS로 통합. 함수는 남되 별도 judgment kind를 만들지 않는다. ([[glossary]] 판정 종류 참조)

### 게이지 / 결과
| 현재 | 새 이름 | 역할 | 태그 |
|---|---|---|---|
| `gaugeOnJudgment(kind)` | `applyGaugeChange(judgment)` | 판정 결과를 게이지에 반영 | 보존 |
| `resetGauge` | `resetGauge` (유지) | 게이지 초기화 | 보존 |
| `computeResult` | `computeResult` (유지) | 곡 종료 결과 산출 (rank + state) | 보존 |
| `evaluateEnd` / `_evalSorted` | `evaluateState` / (내부화) | clear state(AS/AP/FC/H/C/F) 평가·terminate 판정 | 수정‡ |
| (신규) | `clearState(playState)` | 현재 달성 중인 state 산출 (rank와 별개 축) | 신규 |

‡ 기존 lock/clearMark 평가를 **state 축**으로 재정의. `fc`/`ap`/`as`/`cascade`는 gaugeMode 값(단일 축)이고, 결과는 rank와 **독립적으로** 기록되는 state(AS/AP/FC/H/C/F/N). gaugeMode 정의는 [[gauge]] 단일 출처.

### 노트 색/스킨
| 현재 | 새 이름 | 역할 | 태그 |
|---|---|---|---|
| `resolveNoteColor` | `noteColor(note, tick)` | 노트 렌더 색 결정 | 보존 |
| `headColorAtTick` | `noteHeadColorAt(tick)` | 헤드 색 | 보존 |
| `getNoteSkin`/`setNoteSkin` | `noteSkin` / `setNoteSkin` | 스킨 get/set | 보존 |
| `drawNoteHead` | `drawNoteHead` (유지, render층) | 헤드 그리기 | 보존 |

### 커맨드 / 히스토리
| 현재 | 새 이름 | 역할 | 태그 |
|---|---|---|---|
| `cmd` / `dispatch` | `runCommand` / `dispatch` | 커맨드 실행 (유일한 변경 통로) | 수정** |
| `undoCmd`/`redoCmd` | `undo` / `redo` | | 보존 |
| `hasUndo`/`hasRedo` | `canUndo` / `canRedo` | | 보존 |
| `clearAllHistory` | `clearHistory` | | 보존 |
| `AddNotes`,`DeleteNotes`,`MoveNotes`,`FlipNotes`,`ReplaceNotes`,`SetNoteDuration` | 동일 패턴 유지 (`AddNotes` 등) | 노트 커맨드들 | 보존 |
| `AddShapeEvents`,`DeleteShapeEvents`,`MutateShapeEvents`,`FlipShapeEvents`,`ApplyShapeOps` | 동일 유지 | shape 커맨드 | 보존 |
| `AddLineEvent` | `AddLaneEvent` (개명 확정, 시그니처는 laneEvents 기획 후) | | 수정 |
| `AddTempo`,`AddTimeSig`,`AddTextEvents` 등 | 동일 유지 | 메타 커맨드 | 보존 |

\** 커맨드는 보존하되, **saveHist 경로를 완전 제거하고 dispatch가 유일 통로**가 되는 게 [수정].

---

## 3. 상수 / 테이블 대응표

| 현재 | 새 이름 | 비고 |
|---|---|---|
| `CHL` | (폐기) | channel=lane 통일로 변환표 불필요 |
| `KEY2LINE` | `LANE_OF_KEY` | key(1~6)→lane(1~4) |
| `OVERLAP_CHANNELS` | `OVERLAP_LANES` | overlap 가능 lane(2,3) |
| `JUDGE_SYNC/PERFECT/GOOD` | `WINDOW_SYNC_MS` / `WINDOW_PERFECT_MS` / `WINDOW_GOOD_MS` | 단위 박기 |
| `JUDGE_WIDE_SYNC` | `WINDOW_WIDE_SYNC_MS` | wide는 SYNC/MISS만 |
| `GAUGE_DELTA` | `GAUGE_DELTA` (유지) | |
| `NORMAL_CLEAR_PCT` | `NORMAL_CLEAR_PCT` (유지) | |
| `RANK_TABLE` | `RANK_TABLE` (유지) | rank 축 |
| `LOCK_TIERS` | `GAUGE_MODE_TABLE` | gaugeMode 정의 (`normal`/`hard` 게이지 동작 + `fc`/`ap`/`as` terminate 조건 + `cascade` 강등 사슬). 단일 출처 [[gauge]] |
| `DEFAULT_KEYS` | `DEFAULT_LANE_KEYS` | |
| `DEFAULT_ACTION_KEYS` | `DEFAULT_ACTION_KEYS` (유지) | |
| `SPEED_MIN/MAX/STEP` | `SCROLL_SPEED_MIN/MAX/STEP` | scrollSpeed 명시 |
| (리터럴 `2000`) | `SCROLL_VIEW_MS` | game-render 내부 리터럴 → 명명 승격 ([[timing]] §3) |
| `LEAD_IN_MS`,`LN_RELEASE_GRACE_MS` | 유지 | |

---

## 4. 상태 객체 / 필드 대응표

| 현재 | 새 이름 | 비고 |
|---|---|---|
| `D` | `song` | 곡 전체 (2층 구조의 최상위) |
| (신규) | `chart` | song.charts[]의 한 원소 = 난이도 하나 |
| `ES` | `editorState` | 에디터 런타임 |
| `PS` | `playState` | 플레이 런타임 |
| `D.metadata` | `song.metadata` | 곡 공통 |
| `D.metadata.artist` | `song.metadata.musicBy` | 작곡 크레딧 개명. 표시 "Music by" → [[scene]] |
| (신규) | `song.metadata.jacketBy` | 자켓 크레딧 [신규]. 표시 "Jacket by" |
| `D.metadata.jacketBrightness` | (폐기) | 곡 데이터 아님 → 전역 [[settings]] `jacketBrightness`로 이전·개명 |
| `D.metadata.measureLabelOffset` | (폐기) | 곡 데이터 아님 → 에디터 [[settings]]로 이전 |
| `D.tempo` | `song.tempos` | 곡 공통. 복수형 + startTick |
| `D.timeSignatures` | `song.timeSignatures` | 곡 공통 |
| `D.schemaVersion` | `song.schemaVersion` | |
| (신규) | `song.charts` | 난이도 배열 |
| `D.notes` | `chart.notes` | chart별. note 필드: `{startTick, duration, lane, isWide}` (channel→lane) |
| `D.shapeEvents` | `chart.shapeEvents` | chart별 |
| `D.lineEvents` | `chart.laneEvents` | chart별. 개명 확정 |
| `D.textEvents` | `chart.textEvents` | chart별 |
| `D.metadata.difficulty/level/charter` | `chart.difficulty / .level / .chartBy` | metadata→chart로 내림. `charter`→`chartBy` 개명 |
| `ES` (현재 chart 포인터) | `editorState.currentChartIndex` | 편집 중 난이도 |
| `ES.pvSpd` | `editorState.scrollSpeed` | scrollSpeed (playbackRate 아님) |
| `PS.gaugeValue` | `playState.gaugePct` | 0~100 |
| `PS.gaugeType` + `lockTarget`/`lockMode` | `playState.gaugeMode` | normal / hard / fc / ap / as / cascade (단일 축, [[gauge]]) |
| `PS.playCombo`/`playMaxCombo` | `playState.combo` / `playState.maxCombo` | |
| `PS.playHitMap` | `playState.hits` | note→판정상태 |
| `PS.playMissSet` | `playState.misses` | |
| `PS.playHoldState` | `playState.holds` | key→지속중 hold 노트 |
| `PS.lineMap` | `playState.laneMap` | 미러 매핑 |
| `PS.fastCount`/`slowCount` | `playState.fastCount` / `slowCount` | 세션 누적, result 표시 |
| `PS.flashTiming` | `playState.flashTiming` | 'FAST'/'SLOW'/null 순간표시 (기록 안 됨) |
| (신규) | `playState.state` | 달성 중 clear state (AS/AP/FC/H/C/F/N) |

---

## 4.5 settings / scene 명칭

**settings** — 저장 안 되는 곡 데이터와 달리, 플레이어 1회 설정은 영속 단일 객체에 모인다. 정의·소속 단일 출처 → [[settings]]. 개명만 여기 기록:

| 현재 (settings.js 실측) | 새 이름 | 비고 |
|---|---|---|
| `bgBrightness` | `jacketBrightness` | 자켓 배경 밝기. 곡별 `metadata.jacketBrightness` 폐기하고 이 전역값으로 단일화 |
| `judgeLinePos` | `judgeLinePos` (유지) | 판정선 세로위치(분수). 기본=최하단(8/9), 작을수록 위로(raise-only) [보존] |
| `hiSpeed` | `scrollSpeed` | [[glossary]] scrollSpeed 단일 용어로 통일 (구 `ES.pvSpd` = settings `hiSpeed`) |
| `cmod` | (폐기) | 등속 스크롤. 미출시(soon) 기능, 재설계에서 삭제 → [[scene]] §5 |
| `hidden` | (폐기) | 레인 커버(상단). judgeLinePos(판정선 올리기)가 대체 → [[scene]] §5 |
| (에디터 전용) | `measureLabelOffset` | metadata에서 이전. 표시용 마디번호 보정(내부 인덱싱 불변) |

> `sudden`(상단 불투명 커버)은 **유지**. `hidden`만 폐기 — 둘은 코드상 별개 커버다.

**scene** — 화면 그래프 이름. 정의 → [[scene]]:

| 현재 | 새 이름 | 비고 |
|---|---|---|
| `scene-music-select` | `song-select` | 개명. song⊃chart 선택 의미 명확화 |
| `modeselect` | `mode-select` | 하이픈 표기 통일. 공용 진입 허브 |
| (신규) | `song-credit` | gameplay 직전 자동 인터스티셜 (이 곡의 크레딧) |
| (신규) | `credits` | 프로젝트 제작진 (게임 개발자·엔진 등). song-credit과 다른 화면 |
| play overlay | `gameplay` | overlay→정식 scene 승격. `play`는 모드 이름으로 예약, scene은 gameplay |
| result overlay | `result` | overlay→정식 scene 승격 |
| editor `play` 탭 | `test` (scene) | editor 그래프 scene. 모드 play와 충돌 회피 + "테스트 삼아 친다" 의미 |
| editor 탭(전체) | editor 그래프 scene | 탭 개념 폐기, notes/shapes/test/meta 각각 scene ([[architecture]] §5) |

> `play`는 **모드**(mode-select 항목), `gameplay`는 **scene**(곡 치는 화면), `test`는 **editor 그래프 scene**(같은 엔진 다른 호스트). 셋 다 안 겹친다.

---

## 5. 파일명 규칙 (접두사 = 레이어)

파일명 **접두사가 곧 레이어**다. 레이어 정의·의존 규칙의 단일 출처는 [[architecture]]; 여기는 명명 규칙만.

```
core-*    순수 로직
env-*     브라우저 설비 래핑 (구 plat-*)
render-*  캔버스 드로잉
edit-*    에디터 인터랙션
game-*    게임 인터랙션
scene-*   화면 그래프
app-*     부트스트랩 / 빌드별 진입점 / config
```

**철칙**: import는 위→아래 한 방향만(`core-*`가 `render-*`를 import하면 위반). 상세·근거 → [[architecture]].

---

## 6. 결정 완료 / 잔여

확정:
- [x] 용어 방향: **영어 단일 용어 + 한국어 설명** (한↔영 대응표 없음)
- [x] `lineEvents` → `laneEvents` 개명
- [x] 상태객체 `editorState` / `playState` (State 접미사)
- [x] core 함수 인자명 `nowMs` 통일
- [x] TAIL_OK/TAIL_MISS → SYNC/MISS 통합
- [x] clear state 축을 rank와 분리 (AS/AP/FC/H/C/F/N)

확정 (크레딧·settings 개명 세션):
- [x] `artist`→`musicBy`, `charter`→`chartBy`(chart별 유지), `jacketBy` 신규. "by" 접미사는 표시 레이어(credit 씬)
- [x] 곡별 `jacketBrightness` 폐기 → 전역 settings `bgBrightness`를 `jacketBrightness`로 개명·단일화
- [x] `measureLabelOffset` 곡 공통 번복 → 에디터 설정으로 이전
- [x] `judgeLinePos` 개명 안 함(이름 유지), settings 소속. raise-only [보존]

확정 (architecture 세션):
- [x] 레이어 `plat`→`env` 개명 (브라우저 설비 층, core↔env 대비). 레이어 정의 단일 출처를 [[architecture]]로, naming §5는 명명 규칙만·README는 요약
- [x] editor도 scene 그래프 [수정](탭 개념 폐기, scene-manager 재사용). game과 분리된 두 그래프, 형제 축
- [x] `cmod`·`hidden` 폐기 (sudden은 유지). `music-select`→`song-select`. credit/play/result scene 명칭

확정 (씬 구조·용어 세션):
- [x] `play`(모드)/`gameplay`(scene) 분리, `credit`→`song-credit`(곡)·`credits` 신규(제작진), editor `play`탭→`test`, `modeselect`→`mode-select`
- [x] overlay 정의(scene 소유 층, pause=overlay·result=scene), 빠른 옵션 패널 5종 song-select·test 공유

확정 (overlap/conflict 단일화 세션):
- [x] 단일 검출 + capacity 분기: 2키 lane(L2·L3)=`overlap`(노랑), 1키 lane(L1·L4)+Wide-on-Wide=`conflict`(빨강). 구 `invalid`/`misplaced`→`conflict`
- [x] 검출은 파생 속성(domain, `noteOverlapMap`), 알고리즘 단일 출처 [[data-model]] §5.1. render는 색·above/below 표시만, judge는 모름
- [x] 색 상수 `INVALID_COLOR`→`CONFLICT_COLOR` (묶음3 theme에서 적용 완료)
- [x] judge.md §8 문구 "render가 스스로 판단" → 검출=domain(`noteOverlapMap`)/표시=render로 정밀화 (data-model §5.1 링크)

확정 (theme 세션):
- [x] `colors.md`→`theme.md` 승격·개명 (render 표현값 단일 출처). core `constants`(로직)와 분리
- [x] draw order(z-층) 실측 확정, 판정/배경 색 추가. 치수·폰트는 placeholder(추출 세션)
- [x] colors 참조 전부 theme로 갱신 (gauge·README 등)

확정 (이번 논의):
- [x] 노트 4종 확정: Tap / Hold / WideTap / WideHold (`isWide` × `duration` 조합)
- [x] overlap은 노트 타입이 아니라 렌더 현상 (L2·L3 세로 겹침 금색 표시) → [[glossary]] 이동
- [x] gaugeMode terminate = "게이지 즉시 0" 단일 메커니즘 (hard 자연실패와 같은 경로)
- [x] laneEvents 설계 확정 → 별도 문서 [[lane-events]]
  - 데이터: `{startTick, duration, lineNum∈{1,2,3}, targetPos(0~1 상대), easing}`
  - 좌표계: 상대 단일 (전체비율). 절대는 에디터 입력보조로만(보류)
  - 구속: Blue≤1≤2≤3≤Red, 역전금지는 **에디터 단계** (가독성 보호, 코어는 무관)
  - 판정과 완전 분리: 판정 코어는 laneEvents를 모른다

확정 (데이터 구조 단순화):
- [x] song ⊃ chart[] 2층 구조. tempos/timeSignatures 곡공통, notes/events는 chart별
- [x] `D`→`song`, `chart`=난이도 하나, difficulty(명칭)/level(숫자) 구분
- [x] 모든 시간축 이벤트 `startTick` 통일, 이벤트 배열 자연복수(`tempos`/`notes` + `*Events`)
- [x] `channel`→`lane` 통일, 단어 폐기. `key`(1~6) 물리입력만 분리. `OVERLAP_LANES`
- [x] 5선 멘탈모델은 B/R 양끝 + 1·2·3, 데이터 병합 안 함 (isBlue/lineNum 유지). 0/4 숫자 폐기 → 순서 압박 제거, 교차 허용
- [x] state 색 → [[theme]] 단일출처(구 colors). EXTRACTED 새 볼트로 이전
- [x] audioFile/offset 곡공통(metadata) 고정 — 난이도별 음원/싱크 분기 차단
- [x] offset 정의 ([[glossary]] 타이밍): 오디오 시작 보정, 양수=음악 당김, leadIn과 별개
- [x] FAST/SLOW = 순간표시(flashTiming, 기록X) + 누적카운트(fastCount/slowCount, result 표시). SYNC바깥~MISS안쪽 normal만
- [x] textEvents = tick별 텍스트 연출, game/notes 양쪽 렌더, chart별

잔여 (기획 진행하며 확정):
- [x] easing shape/lane 100% 동일, symmetry 데칼코마니, init 이동 → [[lane-events]] §7
- [x] 분박 그리드: 1순위 드롭다운(3·4배수)/2순위 타이핑(특수 N), 박자 독립(마디선만 박자종속), 틱 반올림 스냅, lane도 공유 → [[glossary]] `gridDivisor`
- [x] core/judge.md 신설 (입력매칭 [보존] + overlap render이관 [수정])
- [x] core/data-model.md 신설 — 스키마 단일출처, glossary 경량화
- [x] gaugeMode+state 단일 표 통합 (AS/AP/FC 중복 제거)
- [x] 용어 잔재 정리 (Lane/Channel 제목 → Lane, EXTRACTED 옛용어 경고)
- [ ] textEvents 구체 필드 (편집 UI 설계 시)
- [ ] 입력단계 지역변수(linePos 등) lane/targetPos 기준 정리 (재구현 시)
- [ ] gridDivisor 드롭다운 기본 목록 값 확정
- [x] gridDivisor 상세를 timing.md로 이관 (glossary는 링크만)
- [x] core/timing.md 신설 — tick↔ms·스크롤 진행도·마디 세그먼트·gridDivisor. scrollYAt은 render, clock은 game으로 경계 확정. measure도 BPM과 같은 세그먼트 패턴으로 통일, sub 분할 gridDivisor와 통일(16 폐기)
