# Conflux — 재설계 명세 (Spec)

> Conflux를 **현재 동작은 보존하되 명칭·구조·파일을 백지에서 새로** 만들기 위한 설계 명세.
> 방법론: **Spec-Driven Development** — 명세가 source of truth, 코드는 명세에서 파생.

---

## 이 레포의 원칙

1. **정의(what)와 근거(why) 분리** — 정의는 spec, 이유는 [`_rationale/`](_rationale/rationale.md).
2. **현재 코드 = 관찰 자료** — 동작·수치는 [`_extracted/`](_extracted/EXTRACTED_FACTS.md)에서 추출하며 과거 구조는 계승하지 않는다.
3. **출처 태그** — `[보존]` / `[수정]` / `[신규]` / `[번복]`.
4. **용어는 영어 단일** — 색인은 [`core/glossary.md`](core/glossary.md).
5. **단일 출처** — 한 개념은 한 문서에서 정의하고 다른 문서는 링크한다.

설계 판단은 [DESIGN_PRINCIPLES](DESIGN_PRINCIPLES.md), 종료 검토는 [REVIEW_CHECKLIST](REVIEW_CHECKLIST.md)를 따른다.

---

## 문서 지도

### Project governance

| 문서 | 역할 |
|---|---|
| [PROJECT-OPERATING-GUIDELINE](PROJECT-OPERATING-GUIDELINE.md) | 세션·역할·결정·commit 절차 |
| [DESIGN_PRINCIPLES](DESIGN_PRINCIPLES.md) | 좋은 설계 판단 원칙 |
| [REVIEW_CHECKLIST](REVIEW_CHECKLIST.md) | Closure Gate |
| [DECISION_LOG](DECISION_LOG.md) | Accepted/Superseded/Deferred 결정 색인 |

권장 순서: `README → PROJECT-OPERATING-GUIDELINE → 대상 spec → rationale`.

### `core/`

| 문서 | 내용 |
|---|---|
| [naming](core/naming.md) | 명칭 규칙·대응표 |
| [glossary](core/glossary.md) | 개념 색인 |
| [data-model](core/data-model.md) | 독립 chart 스키마·note/event·runtime state |
| [timing](core/timing.md) | tick↔ms·scroll·measure·gridDivisor |
| [judge](core/judge.md) | 입력 판정·matching |
| [shape](core/shape.md) | Blue/Red 경계 변형 |
| [lane-events](core/lane-events.md) | 내부 구분선 변형 |
| [gauge](core/gauge.md) | gauge·clear·state·cascade·terminate |
| [constants](core/constants.md) | 로직 수치 단일 출처 |

### `render/`, `scene/`, `editor/`

| 문서 | 내용 |
|---|---|
| [theme](render/theme.md) | 색·draw order·표현 값 |
| [scene](scene/scene.md) | 공용 root + game/editor/settings 그래프 |
| [song-select](scene/song-select.md) | 곡 선택 화면 — 목록 모델·정렬·검색·기록 표시 |
| [editor-graph](editor/editor-graph.md) | editor scene 그래프 |
| [editor-commands](editor/editor-commands.md) | command·history 계약 |
| [editor-editing](editor/editor-editing.md) | 편집 interaction |

### `_meta/`

| 문서 | 내용 |
|---|---|
| [settings](_meta/settings.md) | player/editor settings |
| [records](_meta/records.md) | chart별 best record·no-record |
| [persistence](_meta/persistence.md) | workspace·library·autosave·open/save/package |
| [cfx](_meta/cfx.md) | chart JSON·`.cfx` format·identity·packager/loader |

### `_plan/`·받침 문서

| 문서 | 내용 |
|---|---|
| [architecture](_plan/architecture.md) | 레이어·의존 방향·CTX seam·build gate |
| [build-order](_plan/build-order.md) | 재구현 milestone·step·gate |
| [EXTRACTED_FACTS](_extracted/EXTRACTED_FACTS.md) | 과거 구현 실측 |
| [timing-verification](_extracted/timing-verification.md) | timing 대조 |
| [rationale](_rationale/rationale.md) | 설계 근거 |

---

## 확정된 핵심 결정

### 데이터 구조

- canonical 저장 단위는 **독립 chart**다 `[번복]`.
- chart가 metadata·tempos·timeSignatures·offset·music/jacket 참조·events를 소유한다.
- song은 별도 저장 객체가 아니라 같은 `songId` chart들의 파생 그룹이다.
- note 4종 = `isWide × duration`; `channel` 폐기 → `lane` 1~4.

### 판정 / gauge

- judgment = `abs(diff)` 임계(SYNC 25 / PERFECT 50 / GOOD 100).
- gaugeMode 6종 → state `AS/AP/FC/H/C/F/N`; rank는 독립.
- terminate는 gauge 0, cascade는 강등·병렬 gauge 평가.
- Hold 판정은 key-demand 모델(D-2026-024) `[번복]`: Normal Hold는 lane 익명 수요, WideHold는 Normal 수요 이후 남는 키에 원자적 단일 소유. tail release 임계는 `HOLD_RELEASE_WINDOW_MS`(GOOD 창 + grace = 150ms)로 원본과 같다 `[보존]`(D-2026-039), Hold head MISS는 2단위(score/게이지) 즉시 확정. 전체 6키 total demand가 로컬 capacity를 통과해도 초과하면 global conflict.

### shape / lane / grid

- shape=외곽 Blue/Red, laneEvents=내부 1/2/3. judge와 분리된 시각 연출.
- shape 좌표 -8~+8, easing 저장 3종+anchor; Step/Arc는 input label.
- gridDivisor는 박자와 독립인 분음표 표기. lane 가로 grid는 별도 `laneGridDivisor`.

### 파일 / 영속

- **정본 = 사용자 파일.** chart `.json` 작업 / `.cfx` 배포 ZIP.
- chart identity=`songId+chartId`, revision=`+version`.
- init(0)은 editor-only이며 `.cfx`에 필수 포함되는 고정 Representative Chart.
- chart는 `musicFile`·`jacketFile`을 명시한다. `.cfx`는 flat root와 전역 파일명 유일 규칙을 사용한다.
- packager는 chart JSON 직접 선택이 기본이며 folder scan은 optional prefill이다.
- Ctrl+S=현재 chart를 새 version JSON으로 저장(저장 창 매번 표시). Ctrl+E·Ctrl+Shift+S(derive)는 제거.
- workspace는 dirty 작업 전용 복구 슬롯(chart+asset blob+dirty+baseVersion), library는 `.cfx` blob.
- 새 song=새 chart(init) 만들기, 새 난이도=Start Blank/Use Current Chart 두 모드.
- `.cfx`/library는 record migration을 하지 않는다. 기록은 identity(`songId:chartId`)를 따라 유지되고 내용 변경을 판별하지 않으며(fingerprint 미도입), 유저가 기록 초기화(internal 게이트)로 관리한다.
- 다운그레이드 포함 같은-songId reimport는 confirm 후 blob 전체 교체로 허용한다.

---

## 아키텍처 방향

```text
core → env → render → edit/game → scene → app
```

- core는 환경과 library grouping을 모른 채 active chart를 입력으로 받는다.
- game과 editor는 같은 gameplay engine의 두 host다.
- 정의·의존 규칙·CTX seam·build gate 단일 출처는 [architecture](_plan/architecture.md).

---

## 작업 방식

- **User:** Product Owner, 최종 UX·범위 결정.
- **Design Steward:** 최신 main 복원, 조사·설계·Closure Review·Implementation Agent 지시·사후 검증.
- **Implementation Agent:** 승인된 문서 변경을 main에 직접 commit. 현재 agent는 Claude Code.
- 한 session은 한 논리적 commit 단위이며 commit 검증 후 새 대화를 권장한다.

---

## 진행 상태

### Current Focus

- **Active unit:** M1-9 [[shape]]·[[lane-events]] 체인 보간 — easing 3종 + anchor
- **Discussion Scope:** [[shape]]·[[lane-events]]. 대장 SH-1~SH-3.
- **Change Scope:** 보간 모듈(신설)과 그 테스트
- **Exit:** 같은 이벤트 열에서 임의 tick의 보간값이 골든 표와 일치한다. Step 입력이 `Linear + duration 0`으로 저장된다

### Completed

naming, glossary, timing, judge, lane-events, shape, gauge, theme, constants, scene, settings, editor 3문서, architecture 및 받침 문서의 1차 명세 완료.

`.cfx`는 Behavioral/Structural/Implementation Closure Review와 commit 검증을 통과했다. 독립 chart 소유·Representative Chart·명시적 asset 참조·user-selected packager·비파괴 packaging·전체 package validation이 최신 main에 반영되어 있다.

persistence/cfx meta-review를 반영했다. version-gated Ctrl+S 저장(Ctrl+E·derive 제거), dirty 전용 workspace 복구 슬롯과 세션 전환 confirm, 새 song=init 생성과 새 난이도 Start Blank/Use Current Chart 모드, `.cfx` init 필수 포함과 version 포함 파일명이 최신 main에 반영되어 있다.

프로젝트 운영 가이드와 Claude Code 구현 지침을 갱신했다. 설계 대화는 C → B → A 수렴 모델, 주제 분류, 범위 통제, 객관적 Closure Judgment를 따른다.

records/game library Closure Review를 완료했다(D-2026-017·018). 기록은 chart identity를 따라 유지되고 내용 변경을 판별하지 않으며(fingerprint 미도입), chart 단위 기록 초기화(confirm·song-select·`FEATURES.recordReset` internal 게이트)를 신설했다. 다운그레이드 포함 reimport는 confirm 후 blob 전체 교체로 허용한다. 서버 기반 기록은 D-2026-019로 보류했다.

scene 잔여를 확정했다(D-2026-020). song-credit fade 연출(`CREDIT_*`), settings graph = category별 4 scene, credits root 단일 scene(내용 placeholder), quick options host 소유 배치가 최신 main에 반영되어 있다. governance housekeeping으로 운영 가이드 역할명을 Design Steward로 통일하고 REVIEW_CHECKLIST 출력 템플릿의 Closure Gate 항목을 본문과 정합시켰다.

D-2026-016을 해소했다(Accepted). `.cfx` 내부는 flat root + 전역 파일명 유일을 확정 유지하고, 패키징 진입점은 chart JSON 직접 다중 선택 하나로 확정했다(폴더 스캔은 prefill 편의). 하위 폴더 구조와 폴더 우선 진입은 기각했다. cfx.md 잔여 항목이 소거됐다.

시나리오 워크스루 검증 패스를 완료했다(모순 0건, D-2026-022). pause Resume을 정지 카운트다운 재개(되감기 없음)로 바꾸고 기록을 유지한다. no-record의 mid-start는 "곡 처음이 아닌 지점에서 시작한 판"으로 좁혔다. quick options 5종은 settings 영속 필드의 진입점으로 명문화했다. gauge 서술에서 lock 묶음말을 제거하고 tier를 gauge 구성 값으로 격상했다. 공개 웹 배포·`.cfx` 보호·서버 기록은 D-2026-021로 보류했다.

결정 역질의 축소판을 완료했다(D-2026-023). 근거 미기록 `[수정]`·`[신규]` 10건을 재확인해 전부 현행 유지로 확정했고, lane 서브모드 상태 상시 표기·mirror 축 0 고정과 클립보드 규칙의 근거 기록·`TEXT_FADE_MS` constants 이관 3건만 부수 변경으로 반영했다.

judgment system을 key-demand 모델로 재설계했다(D-2026-024). Normal Hold를 lane별 익명 수요로, WideHold를 Normal 수요 이후 남는 키에 원자적 단일 소유로 관리한다. Hold release 임계를 `HOLD_RELEASE_GRACE_MS=50`ms로 적었고(→ **이 수치는 원본 오독이었다. D-2026-039에서 원본 실측대로 150ms로 정정**), Hold head MISS는 score·게이지 2단위를 즉시 확정한다. 후보 매칭은 normal/wide 분리 풀을 폐기하고 단일 결정론적 순서로 통합했다. 로컬 lane/wide capacity를 모두 통과해도 물리 키 총수요가 6을 넘으면 global conflict로 잡는다. mid-start crossing-Hold 시드와 pause Resume의 비-재시드 재조정을 분리해 정의했다.

song-select를 전면 재설계했다(D-2026-025~029). 목록을 category 탭 / groupBy folder / sortKey·sortDir 세 축으로 나누고, 항목 모델을 song row + chart slot으로 정의해 전용 문서 `scene/song-select.md`로 분리했다. slot은 level·difficulty·state 램프를 함께 표시하며, 타이핑 즉시 검색·정렬 변경 시 커서 유지·preview 지연 재생·`lastSelected` 복원을 확정했다. records는 `bestJudgments`·`bestState`·`maxCombo` 3필드로 바뀌어 score·rank·accuracy가 파생이 됐고, `playCount`는 제거했다. chartId 고정 슬롯을 `1~5`로 확장해 Phase를 정규 난이도로 편입했다. 화면 상태 전용 `viewState` store를 신설해 스토어를 5분리했다. 함께 스펙 공백 7건(preview 재생·탭 백그라운드 auto-pause·로딩 표시 임계·단축키 preventDefault·text input focus 격리·저장 실패 표시·빈 library 안내)을 확정했다.

곡 종료 시각을 정의했다(D-2026-030). `songEndMs = max(chartEndMs, musicEndMs) + SONG_END_TAIL_MS(3000)`로 통일하고, 진행 표시 분모 `contentEndMs`를 분리해 CTX 필드명을 바꿨다. 원본의 4s/2s 비대칭 tail·offset 미보정·5000ms 하한 겸용을 정정했고, autoplay 판은 result 없이 song-select로 복귀한다.

`updatedAt`을 신설하고 lane 매핑을 승격했다(D-2026-031). `updatedAt`은 chart 소유 ISO 8601 UTC 문자열로 생성 시각에 초기화되고 에디터 저장 성공 시에만 갱신되며, import·`.cfx` 패키징은 값을 계승한다. song-select `updated` 축의 row 대표값은 소속 chart의 최대값이다. `laneOf(key)` 매핑은 EXTRACTED_FACTS에서 `settings` §2 `DEFAULT_LANE_KEYS` 표로 올라가 key·binding·lane이 한 표에 모였다.

`_plan/build-order.md`를 작성했다(D-2026-032). milestone 6단계 아래 step을 두는 2단 구조로, step 경계는 소프트하되 gate 경계는 넘지 않는다. 완료 기준은 관찰 가능한 동작 문장이고, 회귀는 core 골든 테스트 + milestone별 수동 대조 시나리오 두 층이다. **M3와 M4를 뒤집어** persistence를 game graph보다 앞에 뒀고(song-select가 처음부터 실제 library·records를 읽는다), 그 귀결로 D-2026-021이 M3 진입 조건이 됐다. 실측 잔여는 milestone별 measurement gate로 모았다.

M1 진입 결정 gate를 닫았다(D-2026-033). 구현 코드는 명세 레포 안에 산다 — 스펙과 그 구현이 한 커밋에 묶인다. `FEATURES`는 `editor`·`recordReset` 2개뿐이고 빌드 프로필 기본값은 **`public`**이며, public 빌드는 경로를 잠그는 게 아니라 **editor 코드를 번들에서 제거**한다(`[번복]` — 원본은 코드를 그대로 배포했다). env는 실패 모드를 기준으로 6파일로 갈랐고, 골든 테스트는 원본을 Node에서 실행하는 추출 스크립트로 재생성 가능하게 만든다.

M1 실측 gate를 닫았다(D-2026-034). 원본 core 모듈 4종이 Node에서 그대로 돈다 — 스텁은 `audio.js` 하나뿐이다. 합성 chart 6종으로 골든 표 4개(총 2,986건)를 뽑았고, 추출 스크립트가 `tools/golden/`에 남아 언제든 재생성된다. 표는 원본 명칭을 쓰고 재설계 명칭 매핑은 테스트 쪽이 갖는다. 원본 함수는 필드명이 어긋나도 예외 대신 `null`을 조용히 돌려주므로, 기대값이 전부 비면 추출이 실패로 종료한다.

설계 대장을 세웠다(D-2026-035). 골든 표는 판정자가 아니라 **관측자**다 — 재구현은 원본을 따라가는 게 아니라 더 나은 설계로 다시 짓는 것이므로 어긋나는 자리가 정상적으로 생긴다. 의도한 차이는 `tests/golden/DIVERGENCES.md`에 등재하고 **대장에 없는 차이만 실패**한다. 대장은 어긋남뿐 아니라 `미커버`·`없음`도 담는다 — 골든도 안 걸고 대장에도 없으면 아무 검증 없이 통과하므로, 검증 공백이 어긋남보다 위험하다. 스펙 전체를 전수 대조해 M1 범위 27건(어긋남 5·미커버 17·대응물 없음 5)을 등재했고, M2 이후 영역은 대조 표가 없어 milestone별 수동 대조 시나리오 작성 시점에 절을 늘린다.

프로젝트 골격을 세웠다(M1-1). 7레이어 폴더와 레이어별 README, import 방향 린트(형제 축 `edit↔game` 포함), 파일명 접두사 검사, 빌드 프로필 주입이 선다. `VITE_BUILD_PROFILE`이 빌드 시 문자열로 치환돼 `FEATURES`가 상수로 접히며, 프로필 미지정 빌드는 `public`으로 떨어진다. 골든 표 로더와 설계 대장 파서를 배선해 "대장에 없는 차이는 실패"가 기계 규칙이 됐다.

chart 검증과 settings 기본값을 확정했다(D-2026-036). 검증은 두 층이다 — structural(필수 필드·타입·`schemaVersion`)은 로드를 거부하고, domain(값 범위·논리)은 거부하지 않고 보고한다. **편집 중 chart는 항상 잠깐 domain-invalid하므로** 한 층으로 묶어 거부하면 에디터를 못 쓴다. 두 함수 모두 chart를 mutate하지 않는다. settings 기본값 19필드를 원본에서 실측해 `settings` §4 표로 승격했고, 병합은 알 수 없는 키를 버리고 허용 밖 값을 필드 단위로 기본값으로 되돌린다(클램프 아님 — 되돌림은 보고 가능하고 클램프는 조용하다). `volMusic`(0.7 → 1.0)과 키 배치의 거처만 원본과 다르다. `constants`·`DEFAULT_SETTINGS`를 골든 표로 뽑아 구현과 대조한다 — 이 값들이 나머지 표를 만든 입력이라 틀리면 표 전체가 무의미해진다.

timing을 구현했다(M1-3, D-2026-037). 캐시와 invalidation이 사라졌다 — `buildTimeline(chart)`가 만든 파생 객체를 전 함수가 인자로 받으므로 "chart가 바뀌면 다시 만든다"가 규칙이 아니라 **호출 구조 그 자체**가 됐다. `bpmAt`을 만들지 않으면서도 골든 60건을 세그먼트 조회로 채점해 검증 공백을 막았다. `gridDivisor`는 상단을 `256`까지 늘리고 기본을 **8**로 올렸으며(원본 2), `sub` 표기가 이 격자를 탄다. 대조 과정에서 원본의 왕복 붕괴 하나를 찾았다 — `measureToTick("0")`이 마디 1로 떨어져 pre-roll 표기가 되돌아오지 못했다(TM-10). 골든이 `measureToTick`을 뽑지 않아 여태 드러나지 않았다.

judge 기본을 구현했다(M1-4, D-2026-038). `commitJudgment`은 게이지도 render도 호출하지 않고 `JudgmentEvent[]`를 반환만 하므로, 게이지가 붙는 M1-7이 judge를 열지 않는다. `visualOffset`은 진입 경계에서 한 번만 걸려 내부 함수가 인자로 받지 않는다 — "keydown만 보정하는 구현은 오류"라는 §1의 경고가 규율이 아니라 **표현 불가능한 상태**가 됐다.

두 가지가 이 과정에서 드러났다. 첫째, **구현이 `naming` §3을 이탈해 있었다** — M1-2가 대응표를 대조하지 않고 원본 이름을 그대로 써서 `WINDOW_*_MS`가 `JUDGE_*_MS`로, `DEFAULT_LANE_KEYS`가 `LANE_KEYS`로 살아 있었고 그 이탈이 M1-3을 지나 여기까지 왔다. 이름은 동작이 아니라 골든이 잡지 못하고 설계 대장도 담지 않는다 — 하마터면 명세를 구현에 맞춰 고치는 것으로 봉인될 뻔했다. 구현을 명세 쪽으로 바로잡고, `naming` §3을 파싱해 구현과 대조하는 **가드 테스트**를 신설해 이 부류를 기계 규칙으로 만들었다. 둘째, **JD-1이 어긋남이 아니다** — 골든 2,700건이 전부 새 규칙에서도 원본과 같은 노트를 고른다. 구·신 규칙이 갈리려면 같은 창 안에서 wide가 lane-매칭 normal보다 일러야 하는데, 여섯 fixture의 유일한 wide가 그 fixture의 가장 늦은 노트다. D-2026-024가 `[번복]`한 후보 순서 전체가 골든 밖에 있어 스펙 테스트가 유일한 판정자가 됐다(대장 `어긋남` → `미커버`).

Hold 소유를 구현했다(M1-5, D-2026-039). Normal Hold는 lane의 익명 수요가 되고 WideHold는 자격 있는 키 중 가장 최근에 누른 키로 원자적으로 이양된다 — 구 모델이 keydown/keyup마다 hold를 빈 키로 복사하던 크로스 바인딩 로직이 `reconcileHeldCapacity` 한 함수로 접혔다. §6 불변식은 상태 복사 대신 `heldCapacityViolations`가 문장으로 확인한다.

**원본을 다시 읽어 tail release 임계를 정정했다.** 이번에 처음 keyup 경로(`play-input.js`)를 직접 읽었는데, 원본의 임계는 `tailMs − JUDGE_GOOD − LN_RELEASE_GRACE_MS` = **150ms**였다 — `LN_RELEASE_GRACE_MS`(50)는 관용 폭 전체가 아니라 GOOD 창 위의 추가분이다. D-2026-024가 상수 파일만 읽고 사용처를 읽지 않아 관용 폭이 원본의 1/3로 좁아진 채 스펙에 남아 있었고, 골든이 keyup 경로를 뽑지 않아 자동으로는 드러나지 않는 자리였다. 두 상수의 합에 `HOLD_RELEASE_WINDOW_MS`라는 이름만 주고 값은 원본과 같게 되돌렸다 `[보존]`. 당시 근거였던 "grace를 넓히면 lane 수요 계산이 손 상태와 어긋난다"도 key-demand 모델에서는 성립하지 않는다 — keyup 즉시 키가 빠지므로 grace는 점유 기간이 아니라 분류 임계일 뿐이다.

같은 부류가 하나 더 나왔다. **구현이 `naming` §4를 다른 뜻으로 쓰고 있었다** — §4의 `hits`(note별 판정 상태)를 누적 개수 이름으로 쓰고 있었고, M1-4의 가드는 §3(상수)만 봐서 잡지 못했다. `hits`를 표의 뜻으로 되돌리고 누적 카운터는 judge에서 **제거**했다 — score·accuracy·게이지가 같은 단위를 쓴다는 계약(GA-5)의 실체는 `JudgmentEvent.units`이므로, judge가 합계를 따로 들면 두 수가 어긋날 자리가 생긴다. 가드 테스트를 §4 상태 필드까지 넓혔다.


중간 시작과 Resume을 갈랐다(M1-6, D-2026-040). 카운트다운은 **시각을 인자로 받지 않는** 등록 진입점 `registerKeyDown`/`registerKeyUp`이 맡는다 — pause 중 keyup이 tail을 자동 완료시키는 배선이 만들어질 수 없다. 시간이 흐르지 않는다는 사실이 규율이 아니라 시그니처에 있다.

`seedPlayStateAt`은 과거 노트를 SYNC로 놓고 crossing Hold를 활성 수요로 연 뒤 **나머지를 `reconcileHeldCapacity`에 넘긴다** — `judge` §10이 갖고 있던 시드 전용 배정 3단계가 §6과 문장까지 같은 말이어서 지웠다. 그 대가로 tail 분류 규칙이 §7 하나만 남고, anchor로부터 150ms 안쪽인 crossing Hold는 잡고 있지 않아도 tail SYNC가 된다 — 같은 사건에 두 개의 분류 규칙을 두는 것보다 낫다고 판단했다. 시드 판정은 다른 판정과 같은 이벤트 열로 나가므로 게이지·score가 별도 시드 경로를 갖지 않는다. Resume이 실수로 시드를 부르면 **조용히 이상해지는 대신 즉시 터진다**.

**설계 대장의 배정 두 건을 옮겼다.** global 6키 conflict(JD-5)는 M1-6 → **M1-8**이다 — `data-model` §5.1의 global 부등식은 별도 패스가 아니라 로컬 검출과 같은 sweep 위의 합산이고, `judge` §11이 검출을 judge 밖으로 못박고 있어 judge step에 둘 자리가 없었다. TM-5(Resume leadIn 미적용)는 M1-6 → **M2-5**다 — core에는 상수 하나뿐이라 M1에서는 확인할 대상이 없었다. 배정만 있고 검증이 없는 행은 공백을 덮어 가린다.

게이지를 구현했다(M1-7, D-2026-041). **state는 고른 모드가 아니라 성적이 정한다** `[보존]` — 어느 게이지로 쳐도 `FC`/`AP`/`AS`가 나오고, `tier`는 `H`와 `C`를 가르는 자리에서만 쓰인다. `gauge` §2의 "성공 시 state" 열은 그 반대로 읽혀 삭제했고 산출을 §3의 7줄 표 하나로 모았다 — **cascade가 별도 산출 경로를 갖지 않는다.**

그 결과 모드 표가 두 열로 줄었다. `gaugeMode` 6종이 정하는 것은 **시작 tier와 탈락 시 동작**뿐이다. 시작값·증감은 게이지의 성질이지 모드의 성질이 아니고(두 게이지는 전 모드 병렬 누적), 탈락 조건은 tier마다 하나씩 붙어 `TIER_LADDER`(`as > ap > fc > hard > normal`)로 내려갔다. terminate는 게이지 값을 밟지 않고 `forceEnded` 하나가 든다 `[번복]` — 두 값은 result 막대와 score가 함께 쓰는 회계다. 누산기도 하나로 모았다: 판정별 단위 수 `counts`를 gauge가 들고 게이지·score·accuracy·state가 전부 그것을 읽는다. judge에서 누적을 뺀 D-2026-039의 반대편이다.

**원본을 다시 읽어 구현을 한 번 되돌렸다.** 처음에는 terminate 즉시 회계를 끊었는데, 원본 `play.js`는 `PS.playForceEnded`를 **프레임 끝에서** 확인하므로 그 프레임의 남은 MISS가 게이지·score에 그대로 들어간다. 골든 30건 중 4건이 그 자리에서 어긋나 드러났다 — 판을 멈추는 것은 gauge가 아니라 host의 몫이다. 원본 조사에서 하나가 더 나왔다: `settings.js gaugeToLock`이 cascade를 `gaugeType: 'normal'`로 매핑하므로 **원본 cascade는 `H`를 낼 수 없었다**(코드 주석의 `AS→AP→FC→Hard→Normal`은 사실과 달랐다).

골든 `gauge.json`은 `computeState`·`computeResult`를 뽑지 않아 state·score·accuracy·rank 산출 전체가 대조 밖이었다 — 셋 다 `[보존]`이면서 검증이 없던 자리다. 대장에 `미커버` 3행(GA-6·GA-7·GA-8)을 늘려 스펙 테스트를 판정자로 세웠다. 테스트는 489건이며 골든 30건 중 GA-1 범위 6건을 뺀 24건이 값까지 일치한다.

겹침 검출을 구현했다(M1-8, D-2026-042). **활성을 점으로 정의했다** — tick `t`에서 Tap은 `startTick == t`, Hold는 `startTick <= t < startTick + duration`이다. 활성 집합은 `startTick`에서만 커지므로 검사 지점은 chart의 `startTick` 전부이고, sweep은 그것을 계산하는 **방법**이지 정의가 아니다. 이 한 줄이 이벤트 순서 규칙을 대신한다 — 같은 tick에서 tail이 먼저 빠지고 head가 평가되는 것이 별도 규칙이 아니라 귀결이 됐다. 구 표기 `Tap = [t, t]`를 sweep 이벤트로 옮기면 **같은 tick의 Tap 두 장이 서로 만나지 못한다**(자기 끝이 자기 시작을 밀어낸다).

conflict group이 `excess`를 함께 낸다 — capacity 규칙이 core와 editor 두 곳에 살면 화면의 빨간 노트 수와 삭제 개수가 어긋난다. group을 내는 것까지가 domain이고 지우는 것은 editor다. conflict가 세부 분류를 덮으므로 `merged`/`hidden`/`yellow`/`clipped`는 **정확히 2겹에서만** 생기고 쌍 개념으로 닫힌다 — n-way 규칙이 필요 없다.

**원본을 직접 돌려 대장 DM-3이 실제보다 작게 적혀 있었음을 확인했다.** `순회 기반 → sweep-line, O(n log n)` / `미커버`로 등재돼 있었지만 바뀌는 것은 계산 방식이 아니라 **검출되는 집합 자체**다 — 원본은 pairwise라 lane 2·3의 3겹 이상을 conflict로 잡지 못한다. 계단형 3겹은 `clipped`·`yellow`·`yellow`가 되고, 같은 tick 4겹은 `merged` 한 장에 `hidden` 세 장이 되어 **화면에 한 장만 보이는데 네 번 쳐야 한다.** DM-3을 3겹 행으로 재정의해 `어긋남`으로 올리고 우선순위를 DM-6으로 분리했다. DM-6은 `없음`이다 — 원본은 풀마다 낼 수 있는 표시 종류가 갈려 있어 두 종류가 한 노트를 두고 겨루는 상황 자체가 없다.

골든 `overlap.json` 54건을 새로 뽑았다. 원본 `overlaps.js`는 스텁 없이 Node에서 돈다. 갈리는 4 fixture를 뺀 14 fixture가 값까지 일치하며, 반개구간 경계·노랑 구간 좌표·`merged`/`hidden` 짝짓기·먼저 만난 쌍 우선이 전부 `[보존]`으로 확인됐다. 테스트는 545건이다.

### Deferred

- 서버 기반 기록(조작 방지·전체 유저 기록·리더보드) — `DECISION_LOG.md` D-2026-019
- 라이브 웹 배포·`.cfx` 보호(암호화)·공개 서비스 기록 위치 — `DECISION_LOG.md` D-2026-021 (**M3 진입 전** 해소)

### 다음 후보

- M1-9 [[shape]]·[[lane-events]] 체인 보간 (Current Focus)
- D-2026-021 사이클 (M3 진입 전)
- UI 디자인 명세 신설 (토큰·금지 목록·scene별 레이아웃·모션) — M2-6 최소본 / M4 전체
- credits scene 표시 내용 채우기 (소형, M4-2 전)
