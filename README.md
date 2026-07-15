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

- **Active unit:** D-2026-016 해소 (`.cfx` 내부 ZIP 구조 × 패키징 진입점)
- **Discussion Scope:** flat vs 하위폴더 구조, 다중 파일 선택 vs 폴더 선택의 관계
- **Change Scope:** `_meta/cfx.md`, `_meta/persistence.md`, `DECISION_LOG.md`, `_rationale/rationale.md`, `README.md`
- **Exit:** D-2026-016이 Accepted 또는 명시적 유지 결정으로 전환

### Completed

naming, glossary, timing, judge, lane-events, shape, gauge, theme, constants, scene, settings, editor 3문서, architecture 및 받침 문서의 1차 명세 완료.

`.cfx`는 Behavioral/Structural/Implementation Closure Review와 commit 검증을 통과했다. 독립 chart 소유·Representative Chart·명시적 asset 참조·user-selected packager·비파괴 packaging·전체 package validation이 최신 main에 반영되어 있다.

persistence/cfx meta-review를 반영했다. version-gated Ctrl+S 저장(Ctrl+E·derive 제거), dirty 전용 workspace 복구 슬롯과 세션 전환 confirm, 새 song=init 생성과 새 난이도 Start Blank/Use Current Chart 모드, `.cfx` init 필수 포함과 version 포함 파일명이 최신 main에 반영되어 있다.

프로젝트 운영 가이드와 Claude Code 구현 지침을 갱신했다. 설계 대화는 C → B → A 수렴 모델, 주제 분류, 범위 통제, 객관적 Closure Judgment를 따른다.

records/game library Closure Review를 완료했다(D-2026-017·018). 기록은 chart identity를 따라 유지되고 내용 변경을 판별하지 않으며(fingerprint 미도입), chart 단위 기록 초기화(confirm·song-select·`FEATURES.recordReset` internal 게이트)를 신설했다. 다운그레이드 포함 reimport는 confirm 후 blob 전체 교체로 허용한다. 서버 기반 기록은 D-2026-019로 보류했다.

scene 잔여를 확정했다(D-2026-020). song-credit fade 연출(`CREDIT_*`), settings graph = category별 4 scene, credits root 단일 scene(내용 placeholder), quick options host 소유 배치가 최신 main에 반영되어 있다. governance housekeeping으로 운영 가이드 역할명을 Design Steward로 통일하고 REVIEW_CHECKLIST 출력 템플릿의 Closure Gate 항목을 본문과 정합시켰다.

### Deferred

- `.cfx` 내부 ZIP 폴더 구조(flat vs 종류별 하위폴더)와 패키징 진입점(다중 파일 선택 vs 작업 폴더 선택)의 관계 — `DECISION_LOG.md` D-2026-016
- 서버 기반 기록(조작 방지·전체 유저 기록·리더보드) — `DECISION_LOG.md` D-2026-019

### 다음 후보

- D-2026-016 해소 (Current Focus)
- credits scene 표시 내용 채우기 (소형)
- `_plan/build-order.md` — 재구현 직전
