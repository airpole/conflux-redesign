# Glossary — 개념 사전

> 개념은 영어 이름 하나로 고정하고 설명은 한국어로 쓴다. 전체 schema는 [[data-model]], 명명 규칙은 [[naming]].

---

## ⚠️ scrollSpeed 와 playbackRate — 절대 분리

- **scrollSpeed** — note 화면 이동 밀도. audio와 무관. 범위는 [[constants]] §4.
- **playbackRate** — audio 재생 속도. 항상 1.0.

둘을 서로 곱하지 않는다.

---

## 데이터 구조 (Chart / Song group) `[번복]`

- **chart** — 저장·편집·재생의 canonical 문서 하나. metadata·timing·asset 참조·note/event를 독립 소유.
- **songId** — 관련 chart들을 묶는 UUID.
- **song group** — 같은 songId chart들의 파생 집합. 별도 persisted `song` object가 아니다.
- **Representative Chart** — group 선택 전 display default를 제공하는 chart. init 우선, 없으면 최저 playable chart. 다른 chart의 canonical source가 아니다.
- **active chart** — editor/game core가 현재 처리하는 chart 하나.
- **difficulty** — Trace/Drift/Surge/Flux/Phase/init 명칭.
- **level** — 난이도 숫자.
- **metadata·tempos·timeSignatures·offset·musicFile·jacketFile** — 모두 chart-owned.

runtime core에는 song group이 아니라 active chart를 넘긴다.

---

## 판정

- **judgment** — `abs(diff_ms)` threshold 결과: SYNC/PERFECT/GOOD/MISS.
- **window** — `WINDOW_*_MS` threshold.
- **judgeLine** — hit 기준선. raise하면 아래 HUD도 함께 이동.
- **FAST/SLOW** — judgment 종류가 아니라 diff 부호.
  - `flashTiming`: 순간 표시.
  - `fastCount/slowCount`: result 누적.
  - normal PERFECT/GOOD만 count; SYNC/MISS/wide/autoplay 제외.
- hold tail: success=SYNC, early release=MISS.

---

## Note

4종 = `isWide × duration`.

| | duration=0 | duration>0 |
|---|---|---|
| isWide=false | Tap | Hold |
| isWide=true | WideTap | WideHold |

- **lane** 1~4 — note logical lane.
- **key** 1~6 — physical input. `LANE_OF_KEY`로 lane mapping.
- **duration** — note/shape/laneEvent 공통: 0=instant, >0=sustained/interpolated.

### overlap / conflict

notes에서 sweep-line으로 계산하는 derived map.

- overlap: capacity 이내, L2/L3 2중, playable, yellow.
- conflict: capacity 초과, unplayable warning.
- judge는 모른다. render는 map을 소비한다.

상세 [[data-model]] §5.1.

---

## Lane / Shape

### 5선 mental model

```text
Blue · 1 · 2 · 3 · Red
```

- Blue/Red: shape chain identity, 교차 가능.
- 1/2/3: laneEvents lineNum.
- shape와 laneEvents는 좌표계가 달라 data type을 합치지 않는다.

### 용어

- **shape / shapeEvents** — 외곽 boundary motion.
- **laneEvents** — 내부 divider motion, visual only.
- **chain** — 같은 selector의 event time sequence.
- **anchor** — easing null, interpolation 없는 고정점.
- **Step/Arc** — 저장되지 않는 editor input label.
- **targetPos** — shape는 -8~+8, lane은 dynamic left=0/right=1 기준 실수 전체.
- **textEvents** — `{startTick,duration,content,position}` visual text.

---

## Gauge / Result / Record

- gauge/gaugeMode/state/cascade/terminate → [[gauge]].
- combo — GOOD 이상 연속, MISS reset.
- rank — score 등급, state와 독립.
- record — playable chart best(`bestScore/bestRank/bestState/maxCombo/playCount`).
- init은 record 대상이 아니다.

### identity

- **chartId** — songId group 내 정수. 0=init, 1~4 fixed slots, 5+=additional.
- **version** — chart revision. 저장 시 사용자가 현재보다 큰 값으로 확정 → [[persistence]] §4.
- **schemaVersion** — format generation.
- **subtitle** — chart variation label. 표시 시 `[...]`; identity 자체가 아님.
- record key·내용 변경 무판별·기록 초기화 → [[records]].

---

## Timing

- **tick** — 1 beat=1920.
- **leadIn** — start 전 empty scroll interval.
- **offset** — active chart music sync adjustment; chart-owned.
- **scroll** — ms-linear; BPM은 spacing만 변경.
- **gridDivisor** — note time grid의 note-value denominator, default 32.
- **laneGridDivisor** — lane horizontal spatial grid, default 4.
- **scrollSpeed** — visual density only.

---

## Scene

- **mode-select** — play/editor/settings hub.
- **song-select** — derived song group와 playable chart를 선택. selection 전 Representative Chart, 후 active chart preview.
- **song-credit** — 선택 playable chart credit의 자동 interstitial.
- **credits** — project staff screen.
- **gameplay** — active chart play scene.
- **result** — result scene.
- **test** — editor host play scene.
- **overlay** — scene을 살린 채 덮는 layer(pause/text-event/quick options).

---

## Settings

- **settings** — chart data와 별개의 player/editor persistent preferences.
- **quick options** — scrollSpeed/gaugeMode/mirror/staticShape/autoplay subset.
- **jacketBrightness** — global player setting.
- cmod·hidden은 폐기.

---

## Build / Structure / File

- build: editor / game-internal / game-public.
- layer: `core → env → render → edit/game → scene → app`.
- **CTX** — engine host injection seam.
- **chart JSON** — independent editor work file.
- **.cfx** — 같은 songId의 selected chart JSON과 referenced assets를 담는 flat distribution ZIP.
- **workspace** — dirty chart + connected asset blob의 복구 전용 슬롯 → [[persistence]] §6.
- **library** — imported `.cfx` blob store, key=songId.
- **dirty** — 마지막 성공한 파일 저장 이후 workspace-persisted state가 바뀐 상태 → [[persistence]] §5.
- **music** — chart가 `musicFile`로 참조하는 audio asset.
- **jacket** — chart가 `jacketFile`로 참조하는 optional image asset.
- **packager** — user-selected chart input을 group/validate해 `.cfx`를 만드는 UI.

---

## 사용 규칙

1. 새 개념은 먼저 이 사전에 등록한다.
2. 한 개념에 두 이름을 두지 않는다.
3. glossary와 code가 어긋나면 spec/glossary를 기준으로 code를 고친다.
4. 한국어 설명 안에서도 개념명은 위 English term을 사용한다.
