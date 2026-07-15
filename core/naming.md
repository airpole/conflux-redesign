# 명칭 규칙 (Naming Convention)

> **위치**: 새 설계 볼트의 1급 문서. 모든 다른 문서·코드가 여기 이름을 따른다.
> **목적**: 백지 재구현의 식별자를 역할에서 자명하게 짓는다. 현재 코드 이름은 *참조*일 뿐 계승하지 않는다.
> **짝 문서**: [[glossary]] (개념 사전 — 영어 용어 + 한국어 설명)

---

## 0. 출처 태그 (모든 동작 서술에 부착)

새 설계에서 각 동작은 현재 코드·과거 명세 대비 넷 중 하나다. 문서·테스트·커밋에 태그로 표시:

| 태그 | 의미 | 하네스 테스트 |
|---|---|---|
| `[보존]` | 현재 코드 동작을 1:1 유지. 바뀌면 회귀 버그. | 현재 테스트를 그대로 물려 통과 |
| `[수정]` | 현재는 이랬으나 의식적으로 바꿈. **왜** 한 줄 필수. | 테스트 새로 작성, 옛것 의도적 폐기 |
| `[신규]` | 현재 없음. 기획으로 결정. | 처음부터 작성 |
| `[번복]` | 과거에 확정한 설계 결정을 이후 결정으로 대체. | 기존 spec·rationale·교차 참조를 함께 갱신 |

→ 이 태그가 "실수로 바뀐 것", "일부러 바꾼 것", "과거 결정을 뒤집은 것"을 구분한다. 결정 상태는 [[DECISION_LOG]]가 단일 출처다.

---

## 1. 식별자 짓기 원칙

1. **약어 금지.** `t2ms` ❌ → `tickToMs` ✅. `sp2f`, `ms2t`, `pvSpd`, `CHL` 같은 암호 전면 폐기.
2. **함수는 동사+목적어.** 이름만 보고 무엇을 반환/수행하는지 안다. `getShape` 보다 `shapeGeometryAt(tick)`.
3. **불리언은 is/has/can.** `isWide`, `hasUndo`, `canPlace`.
4. **도메인 개념은 [[glossary]]의 영어 용어 하나로 고정.** 한 개념에 두 이름을 두지 않는다. 특히 `scrollSpeed`와 `playbackRate`는 영원히 분리. (한국어 설명은 쓰되, 개념을 가리키는 단어는 영어 그대로.)
5. **단위를 이름에 박는다.** ms/tick/px/pct가 헷갈리는 곳은 접미사로: `durationMs`, `startTick`, `widthPx`, `hardPct`, `normalPct`.
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
| `getLines(tick)` | `laneLayoutAt(tick)` | 그 틱의 구분선 1·2·3 상대 실수 위치(무구속) | 수정* |
| `normalizeShapeChain` | `normalizeShapeChain` (유지 가능) | shape 이벤트 체인 정규화 | 보존 |
| `sp2f(...)` | `shapePosToField(...)` | shape 외부단위(-8~+8) → 필드 좌표 (구 내부0~64) | 수정 |
| `getStepTicks` / `isStepTick` | `stepTicks` / `isStepTick` | step(즉시점프) 이벤트 틱 | 보존 |
| `applyEasing(t, type)` | `applyEasing(t, easing)` | easing 곡선 적용 (linear/arc/inSine/outSine 등) | 보존 |

\* `laneLayoutAt`은 raw relative truth만 반환한다. px 변환과 boundary/order/min-gap 구속은 gameplay render의 projection 단계다. 전체 설계 → [[lane-events]].

### 판정 / 입력
| 현재 | 새 이름 | 역할 | 태그 |
|---|---|---|---|
| `getPlayJudgment(ch, ms)` | `judgeKeyPress(key, nowMs)` | 키 입력에 대한 판정 후보 산출 | 보존 |
| `applyJudgment` | `commitJudgment` | 판정 확정 → 상태 반영 | 보존 |
| `applyTailSuccess` | `commitTailRelease` | hold tail 릴리즈 성공 → **SYNC로 처리** | 수정† |
| `applyMidRelease` | `commitMidRelease` | hold 중간 릴리즈 → **MISS로 처리** | 수정† |
| `seedPlayStateFromCurMs` | `seedPlayStateAt(nowMs)` | 중간 시작 시 과거 노트 SYNC 시드 | 보존 |
| `feedFastSlow` | `recordFastSlow` | Fast/Slow 피드백 기록 | 보존 |

† TAIL_OK/TAIL_MISS 판정 종류를 폐기하고 SYNC/MISS로 통합 — **게이지 델타 포함 완전 통합**([[constants]] §2 `[수정]`, hard tail 특례 폐기). 함수는 남되 별도 judgment kind를 만들지 않는다. ([[glossary]] 판정 종류 참조)

### 게이지 / 결과
| 현재 | 새 이름 | 역할 | 태그 |
|---|---|---|---|
| `gaugeOnJudgment(kind)` | `applyGaugeChange(judgment)` | 판정 결과를 hard/normal 게이지에 병렬 반영 — 구 6종 kind(TAIL 포함) → judgment 4종 | 수정† |
| `resetGauge` | `resetGauge` (유지) | `hardPct`·`normalPct` 초기화 | 보존 |
| `computeResult` | `computeResult` (유지) | 곡 종료 결과 산출 (`score`/`accuracy`/`rank`/`state`) | 보존 |
| `evaluateEnd` / `_evalSorted` | (분해) | 판정 commit이 gauge·tier·`forceEnded`를 갱신하고, `computeResult`가 최종 state를 산출 | 수정‡ |

‡ `gaugeMode`는 `normal`/`hard`/`fc`/`ap`/`as`/`cascade`, runtime gauge는 `{hardPct, normalPct}`, 현재 생존 단계는 `tier`다. `state`는 `computeResult`가 반환하는 결과값이며 `playState` 저장 필드가 아니다. 정의는 [[gauge]], 구조는 [[data-model]] §9.

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
| `AddNotes`,`DeleteNotes`,`MoveNotes`,`ReplaceNotes`,`SetNoteDuration` | 동일 유지 | 노트 커맨드들 (시그니처 → [[editor-commands]] §6) | 보존 |
| `FlipNotes` | `MirrorNotes` | flip→mirror 재명명, 매핑은 [[judge]] §4 | 수정 |
| `AddShapeEvents`,`DeleteShapeEvents`,`MutateShapeEvents`,`ApplyShapeOps` | 동일 유지 | shape 커맨드 | 보존 |
| `FlipShapeEvents` | `MirrorShapeEvents` | flip→mirror 재명명 | 수정 |
| `AddLineEvent` | `AddLaneEvents` (+`DeleteLaneEvents`/`MutateLaneEvents` 신설) | 시그니처 확정 → [[editor-commands]] §6 | 수정 |
| `AddTempo`,`AddTextEvents` 등 | 동일 유지 | 메타 커맨드 | 보존 |
| `EditTempoBpm`,`AddTimeSig` 등 | `EditTempo`,`AddTimeSignature` 등 | 축약 해소 → [[editor-commands]] §6 | 수정 |

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
| `GDIVS` | `GRID_DIVISORS` | 분음표 표기 재명명(V=4N, +6, ~256) → [[timing]] §6 |
| (리터럴 `2000`) | `SCROLL_VIEW_MS` | game-render 내부 리터럴 → 명명 승격 ([[timing]] §3) |
| `LEAD_IN_MS` | 유지 | `LN_RELEASE_GRACE_MS`는 폐기 `[수정]` — [[judge]] §6 |

---

## 4. 상태 객체 / 필드 대응표

| 현재 | 새 이름 | 비고 |
|---|---|---|
| `D` | `chart` | 저장·편집·재생의 canonical 최상위 문서 하나 `[번복]` |
| (구 persisted `song` container) | (폐지) | 같은 `songId` chart들의 song group은 필요할 때 파생한다 |
| `ES` | `editorState` | 에디터 런타임 |
| `PS` | `playState` | 플레이 런타임 |
| `D.metadata` | `chart.metadata` | chart 소유 |
| `D.metadata.artist` | `chart.metadata.musicBy` | 작곡 크레딧 개명. 표시 "Music by" → [[scene]] |
| (신규) | `chart.metadata.jacketBy` | 자켓 크레딧. 표시 "Jacket by" |
| `D.metadata.jacketBrightness` | (폐기) | chart 데이터 아님 → 전역 [[settings]] `jacketBrightness`로 이전·개명 |
| `D.metadata.measureLabelOffset` | (폐기) | chart 데이터 아님 → 에디터 [[settings]]로 이전 |
| `D.tempo` | `chart.tempos` | chart 소유. 복수형 + startTick |
| `D.timeSignatures` | `chart.timeSignatures` | chart 소유 |
| `D.schemaVersion` | `chart.schemaVersion` | |
| (신규) | `chart.songId` | 관련 chart를 파생 그룹화하는 UUID |
| (신규) | `chart.chartId` | songId group 안의 chart identity 정수 |
| (신규) | `chart.version` | chart revision. export마다 +1 |
| (신규) | `chart.musicFile` / `chart.jacketFile` | chart별 명시적 asset 파일명 참조 |
| `D.notes` | `chart.notes` | note 필드: `{startTick, duration, lane, isWide}` (channel→lane) |
| `D.shapeEvents` | `chart.shapeEvents` | chart 소유 |
| `D.lineEvents` | `chart.laneEvents` | chart 소유. 개명 확정 |
| `D.textEvents` | `chart.textEvents` | chart 소유 |
| `D.metadata.difficulty/level/charter` | `chart.difficulty / .level / .chartBy` | chart 직속. `charter`→`chartBy` 개명 |
| (신규) | `chart.subtitle` | playable chart 구분용 선택 문자열 |
| `ES` (현재 chart 포인터) | active `chart` | 단일 chart session의 문서이자 core 입력. 멀티 chart 목록은 session 밖 |
| `ES.pvSpd` | `editorState.scrollSpeed` | scrollSpeed (playbackRate 아님) |
| (신규) | `editorState.laneGridDivisor` | lane 가로 분할 수 N (기본 4) — [[lane-events]] §5 |
| `PS.gaugeValue` | `playState.gauge = { hardPct, normalPct }` | 두 게이지를 모든 모드에서 병렬 누적 `[번복]` |
| `PS.gaugeType` + `lockTarget`/`lockMode` | `playState.gaugeMode` | normal / hard / fc / ap / as / cascade (단일 축, [[gauge]]) |
| (신규) | `playState.tier` | as / ap / fc / hard / normal 중 현재 생존 단계 |
| `PS.playCombo`/`playMaxCombo` | `playState.combo` / `playState.maxCombo` | |
| `PS.playHitMap` | `playState.hits` | note→판정상태 |
| `PS.playMissSet` | `playState.misses` | |
| `PS.playHoldState` | `playState.holds` | key→지속중 hold 노트. 이양 규칙 → [[judge]] §6 |
| `PS.playKeyHeld` | `playState.keysHeld` | 눌린 키 집합 |
| `PS.lineMap` | `playState.laneMap` | 미러 매핑 |
| `PS.fastCount`/`slowCount` | `playState.fastCount` / `slowCount` | 세션 누적, result 표시 |
| `PS.flashTiming` | `playState.flashTiming` | 'FAST'/'SLOW'/null 순간표시 (기록 안 됨) |
| (구 `playState.state`) | `computeResult(...).state` | state는 최종 result 값이며 runtime 저장 필드가 아님 `[번복]` |

---

## 4.5 settings / scene 명칭

**settings** — chart data와 달리 플레이어·에디터 설정은 영속 단일 객체에 모인다. 정의·소속 단일 출처 → [[settings]]. 개명만 여기 기록:

| 현재 (settings.js 실측) | 새 이름 | 비고 |
|---|---|---|
| `bgBrightness` | `jacketBrightness` | 자켓 배경 밝기. chart별 `metadata.jacketBrightness` 폐기하고 이 전역값으로 단일화 |
| `judgeLinePos` | `judgeLinePos` (유지) | 판정선 세로위치(분수). 기본=최하단(8/9), 작을수록 위로(raise-only) [보존] |
| `hiSpeed` | `scrollSpeed` | [[glossary]] scrollSpeed 단일 용어로 통일 (구 `ES.pvSpd` = settings `hiSpeed`) |
| `cmod` | (폐기) | 등속 스크롤. 미출시(soon) 기능, 재설계에서 삭제 → [[scene]] §5 |
| `hidden` | (폐기) | 레인 커버(상단). judgeLinePos(판정선 올리기)가 대체 → [[scene]] §5 |
| (에디터 전용) | `measureLabelOffset` | metadata에서 이전. 표시용 마디번호 보정(내부 인덱싱 불변) |

> `sudden`(상단 불투명 커버)은 **유지**. `hidden`만 폐기 — 둘은 코드상 별개 커버다.

**scene** — 화면 그래프 이름. 정의 → [[scene]]:

| 현재 | 새 이름 | 비고 |
|---|---|---|
| `scene-music-select` | `song-select` | 같은 songId의 파생 song group과 playable chart를 선택 |
| `modeselect` | `mode-select` | 하이픈 표기 통일. 공용 진입 허브 |
| (신규) | `song-credit` | gameplay 직전 자동 인터스티셜 (선택 active chart의 크레딧) |
| (신규) | `credits` | 프로젝트 제작진 (게임 개발자·엔진 등). song-credit과 다른 화면 |
| play overlay | `gameplay` | overlay→정식 scene 승격. `play`는 모드 이름으로 예약, scene은 gameplay |
| result overlay | `result` | overlay→정식 scene 승격 |
| editor `play` 탭 | `test` (scene) | editor 그래프 scene. 모드 play와 충돌 회피 + "테스트 삼아 친다" 의미 |
| editor 탭(전체) | editor 그래프 scene | 탭 개념 폐기, notes/shapes/test/meta 각각 scene ([[architecture]] §5) |

> `play`는 **모드**(mode-select 항목), `gameplay`는 **scene**(곡 치는 화면), `test`는 **editor 그래프 scene**(같은 엔진 다른 host). 셋 다 안 겹친다.

**영속성 / 파일** — 정의 → [[persistence]]·[[cfx]]:

| 현재 | 새 이름 | 비고 |
|---|---|---|
| autosave 슬롯(`__autosave__`) | `workspace` | 단일 복구 슬롯(마지막 chart + 연결된 music·jacket blob) |
| (신규) | `library` | game internal의 import된 `.cfx` blob store |
| duplicate(Ctrl+Shift+S) | `derive` | 현재 chart의 `songId`를 새 UUID로 바꾸어 새 group을 시작 |
| 오디오 에셋 | `music` | chart가 `musicFile`로 참조하는 audio asset. `musicBy`와 정합 |
| (신규) | `init` | chartId 0, 에디터 전용 템플릿 chart |
| 파일 매니저 overlay | (폐지) | Ctrl+O = OS 파일 픽커 직행 |

**에디터 툴** — 정의 → [[editor-editing]] §1·§2 (여기는 색인만):

| 현재 | 새 이름 | 비고 |
|---|---|---|
| `n` / `ln` / `w` / `wl` / `txt` | `tap` / `hold` / `wideTap` / `wideHold` / `text` | notes scene 툴 (키 Q/W/E/R/T) |
| `sel` / `del` | `select` / `delete` | 모디파이어 A·D가 기본 호출 |
| `L` / `C` / `R` / `P` | `Blue` / `center` / `Red` / `pinch` | shape 서브모드 툴 (키 Q/W/E/R) |
| (구 line 툴) | `line1` / `line2` / `line3` | lane 서브모드 툴 `[신규]` (키 Q/W/E) |

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

구 파일 행선지: `play-options.js`(에디터 Play탭 옵션바)는 **삭제가 아니라 흡수**된다 — gauge/lock은 [[settings]] scene으로 이미 이전됐고, 남은 mirror·F/S 토글은 빠른 옵션 패널 공유 컴포넌트(edit/game 공용, [[scene]] §5)로 흡수된다. mirror는 `setSetting`으로 settings에 라우팅되어 단일 출처 유지.

**core로 승격되는 현재 파일**(순수 로직·계산, 전역 `D` import를 active `chart` 인자 전달로 재배선 — [[architecture]] §2): `timing.js`·`shape.js`·`play-judgment.js`·`gauge.js`·`constants.js`. 이들이 `core-*` 접두 레이어가 된다.

---

## 6. 현재 동기화 상태 / 잔여

현재 유효한 결정 상태는 [[DECISION_LOG]], schema는 [[data-model]], 개념은 [[glossary]]가 단일 출처다. 이 절은 naming 관점의 동기화 확인만 기록한다.

확정:
- [x] 출처 태그 4종: `[보존]` / `[수정]` / `[신규]` / `[번복]`
- [x] 영어 단일 용어 + 한국어 설명
- [x] `lineEvents` → `laneEvents`, `channel` → `lane`
- [x] 상태 객체 `chart` / `editorState` / `playState`
- [x] canonical 저장 단위 = 독립 `chart`; persisted `song` container 없음 `[번복]`
- [x] song = 같은 `songId` chart들의 파생 group `[번복]`
- [x] metadata·tempos·timeSignatures·offset·`musicFile`·`jacketFile` = chart 소유 `[번복]`
- [x] chart identity=`songId+chartId`, revision=`+version`
- [x] `artist`→`musicBy`, `charter`→`chartBy`, `jacketBy` 신규
- [x] `jacketBrightness` = global setting, `measureLabelOffset` = editor setting
- [x] runtime gauge=`{hardPct, normalPct}`, 현재 단계=`tier`, 최종 `state`=result 값 `[번복]`
- [x] lane `targetPos` = 상대 실수 전체·데이터 무구속; gameplay projection이 boundary/order/min-gap을 적용 `[번복]`
- [x] `play`(mode) / `gameplay`(scene) / `test`(editor scene) 분리
- [x] `workspace` / `library` / `derive` / `init` 명칭과 역할
- [x] core 함수 인자명 `nowMs`, active `chart` 전달
- [x] TAIL_OK/TAIL_MISS → SYNC/MISS 통합
- [x] rank와 result state 분리

잔여:
- [ ] 재구현 시 입력 단계 지역변수(`linePos` 등)를 `lane`/`targetPos` 기준으로 정리
