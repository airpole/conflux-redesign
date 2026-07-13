# timing — 시간축 단일 출처

> tick↔ms 변환, 스크롤 진행도, 마디·박 변환, 분박 그리드를 모은다.
> 용어는 [[glossary]], 데이터 구조는 [[data-model]], 값 실측은 [[EXTRACTED_FACTS]], 근거는 [[rationale]].
> 검증: [[timing-verification]] (현재 코드와 수치 1:1 대조 완료).

---

## 0. 핵심 패턴 — 정렬된 이벤트 → 누적 세그먼트 → 룩업

이 문서의 두 변환(시간·마디)은 **같은 모양**이다.

1. 시간축 이벤트(`tempos` 또는 `timeSignatures`)를 `startTick`으로 정렬한다.
2. 각 구간 시작점에 **누적값**(ms 또는 마디번호)을 미리 계산해 **세그먼트 배열**을 만든다.
3. 입력 tick(또는 ms)이 속한 세그먼트를 룩업하고, 세그먼트 시작값 + 구간 내 선형분으로 답한다.

- 세그먼트 = `startTick`을 넘지 않는 마지막 항목. 음수 tick(leadIn 구간)은 **첫 세그먼트 외삽**으로 자연 처리한다. 음수 전용 분기를 두지 않는다.
- `tempos`/`timeSignatures`는 곡 공통이다([[data-model]] §3). 세그먼트는 이들이 바뀔 때만 재생성한다(의존성 선언, [[#9-캐시]]).

---

## 1. tick

- **TPB** = `1920`. 1박(quarter note) = 1920 tick. [보존]
- 모든 시간축 이벤트는 `startTick`을 가진다([[naming]] §1.8).

---

## 2. tickToMs / msToTick — 시간 세그먼트

`tempos = [{startTick, bpm}]`에서 BPM 세그먼트를 만든다.

```
segment = { startTick, ms(누적), bpm, msPerTick }
msPerTick = 60000 / (bpm × TPB)
```

누적: 세그먼트 i의 `ms` = 세그먼트 i−1의 `ms` + (구간 길이 tick) × (i−1의 `msPerTick`).

- **`tickToMs(tick)`** = `seg.ms + (tick − seg.startTick) × seg.msPerTick`. [보존]
- **`msToTick(ms)`** = `seg.startTick + (ms − seg.ms) / seg.msPerTick`. [보존]
- 빈 `tempos`는 `[{startTick:0, bpm:120}]`로 본다.
- 둘은 왕복 항등(round-trip identity)을 만족한다(FP 한계 외).

> `bpmAt(tick)`은 현재 코드(`getBPMAt`)에 있으나 **호출처가 없다**(死코드). 재구현에서 만들지 않는다. 필요해지면 같은 세그먼트로 `seg.bpm`을 반환하게 추가한다. [수정: 제거]

---

## 3. 스크롤 — ms 등속

노트의 화면 위치는 **ms 공간에서 선형**이다. 즉 노트는 **시간 등속**으로 흐른다: 한 노트가 판정선까지 내려오는 속도(px/ms)는 BPM과 무관하게 일정하고, BPM은 노트 **사이 간격**만 바꾼다. 빠른 구간이 빽빽해 보이는 "가변속" 효과는 별도 메커니즘이 아니라 `tickToMs`가 BPM을 누적한 결과다.

- **`scrollProgressAt(tick, nowMs)`** = `(tickToMs(tick) − nowMs) / visMs`. [신규: 분리]
  - 단위 없는 진행도. `0` = 판정선, 양수 = 판정선 위(아직 안 온 노트), 음수 = 지나간 노트.
- **`visMs`** = `SCROLL_VIEW_MS / scrollSpeed`. 화면에 담는 시간 폭.
- **`SCROLL_VIEW_MS`** = `2000`. (현재는 game-render 내부 리터럴 → 명명 상수로 승격.) [수정: 명명]
- **`scrollSpeed`** — 진행도를 픽셀로 펼 때의 밀도만 바꾼다. 오디오와 무관([[glossary]] scrollSpeed/playbackRate 절대분리). 범위 1.0~10.0, 0.1 단위.

> **px 변환은 timing이 아니다.** 진행도를 화면 Y로 바꾸는 `scrollYAt`(= `judgeY − progress × (judgeY − topY)`)은 캔버스 레이아웃(judgeY/topY)에 의존하므로 **render 소관**이다. timing core는 px·캔버스를 모른다([[naming]] §5 레이어 철칙). → naming.md에서 `scrollYAt`은 render 행으로 둔다.

> **clock도 timing이 아니다.** `nowMs`는 재생 시계가 만든다: `nowMs = clockAnchorMs + (now() − t0) × playbackRate`. `now()`·`playbackRate`·재생상태에 의존하므로 **game 소관**이다. timing은 `nowMs`를 **인자로 받기만** 한다. (`playbackRate`는 항상 1.0이라 음정 불변.)

---

## 4. tickToMeasure / measureToTick — 마디 세그먼트

`timeSignatures = [{startTick, numerator, denominator}]`에서 마디 세그먼트를 만든다. §2와 같은 패턴.

```
segment = { startTick, measure(누적 마디번호), tpbUnit, tpm, numerator }
tpbUnit = TPB × 4 / denominator     // 1박의 tick (분모가 8이면 TPB/2)
tpm     = tpbUnit × numerator        // 1마디의 tick
```

- 빈 `timeSignatures`는 `[{startTick:0, numerator:4, denominator:4}]`로 본다. [보존] (§2 tempos fallback과 대칭.)

누적: 세그먼트 i의 `measure` = i−1의 `measure` + ⌊(구간 길이 tick) / (i−1의 `tpm`)⌋.

- **`tickToMeasure(tick, labelOffset)`** → `"measure.beat.sub"` 문자열. 세그먼트 룩업 후 한 번의 분해: [보존]
  - `rel = tick − seg.startTick`, `m = ⌊rel/seg.tpm⌋`, `r = rel − m·seg.tpm`
  - `beat = ⌊r/seg.tpbUnit⌋ + 1`, `subTick = r − (beat−1)·seg.tpbUnit`
  - `measure = 1 + seg.measure + m + labelOffset`
  - `subTick==0 && beat==1` → `"{measure}"`; `subTick==0` → `"{measure}.{beat}"`; else → `"{measure}.{beat}.{sub}"` (sub는 §5)
- **`measureToTick(str, labelOffset)`** — 역방향. `labelOffset`을 먼저 빼고 같은 세그먼트로 역산. [보존]
- **`measureLabelOffset`**([[settings]] §3 — 에디터 전용 설정) — 표시용 마디번호 보정. core는 settings를 모르므로 **인자 주입** `[신규]`: 호출측(edit)이 설정값을 `labelOffset` 인자로 전달하고, game 쪽 호출은 `0`을 넘긴다. 출력에 더하고 입력에서 빼므로 tick⇄문자열 왕복은 항등.
- 음수 tick은 첫 세그먼트 외삽으로 처리(현재 코드의 음수 전용 분기 3겹을 제거). [수정: 구조]
- **`getGridLines(startTick, endTick)`** → 그 범위의 마디선·박선 tick 목록. 같은 마디 세그먼트를 `tpbUnit` 간격으로 순회해 `{tick, isMeasure, measureNum, beatInMeasure, isPreRoll}`를 낸다. 순수 로직(px 없음) → timing core. render는 이 목록을 받아 그리기만 한다(`scrollProgressAt`↔`scrollYAt`과 같은 분리). [보존]

> **`timeSignatures`는 마디선 위치만 결정한다**([[data-model]] §3). 분박(노트 배치 격자)은 박자와 독립(§6).

---

## 5. sub — 마디 표기의 분할 = gridDivisor

`tickToMeasure`의 셋째 숫자(sub)는 **그 위치를 gridDivisor로 나눈 칸 번호**다.

```
칸 = TPB × 4 / gridDivisor          // gridDivisor = 분음표 값 V (§6)
sub = round(subTick / 칸)
```

- 현재 코드는 `gridDivisor`와 무관하게 **16 고정**이었다. 이를 폐기하고 gridDivisor로 통일한다. [수정]
- 효과: 격자에 놓은 노트의 sub 번호 = 격자 칸 번호. 셋잇단(gridDivisor 6·12·24 등)에서 16 기준이 정수로 안 떨어져 번호가 불규칙해지던 문제가 사라진다.
- 분박 격자의 정의가 §6 한 곳으로 모인다(단일 출처). 표기·스냅이 같은 V를 쓴다.

---

## 6. gridDivisor — 분박 그리드

노트 배치용 분박 그리드. 값 `V`는 **분음표 단위**다: "V분" 격자 = 4/4 기준 한 마디를 V등분하는 음표(1박 = V/4칸). 격자 간격 = `TPB × 4 / V` tick. 기본 `32`.

- **표기 [수정]**: 구 코드·초안은 "1박을 N등분"(기본 8, `GDIVS` = [1…64])이었다. 통상 채보 에디터·DAW 관례는 분음표 표기(4분·8분·16분…)라 **`V = 구 N × 4`**로 재명명한다(기본 8 → 32). 격자 좌표계는 동일하고 이름만 바뀐다. 6분(4분 셋잇단)처럼 박 단위 비정수 등분이 자연스럽게 표현되는 부수 효과. 근거 → [[rationale#gridDivisor 표기를 분음표 기준으로 바꾼 이유]].
- **박자 독립**(DAW 표준): 격자는 분음표 기준이라 박자(timeSignatures)와 무관하다. 박자는 **마디선 위치**(§4)만 결정한다.
- **입력 위계**: 1순위 **드롭다운** `GRID_DIVISORS = [4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256]` (구 `GDIVS` ×4 + `6` 추가). 2순위 **숫자 타이핑**(28·36 등 특수 V).
- **틱 정합**: `TPB×4` = 7680이 V로 안 나눠떨어지면 `round(7680 / V × k)`로 가장 가까운 정수 tick에 **반올림 스냅**. 오차 최대 0.5 tick(≈0.3ms), 인지 불가.
- **lane 스냅 공유**: laneEvents 구분선 스냅도 이 분박 시스템을 공유한다([[lane-events]]). 나누는 방식 동일, 적용 축만 다름.
- **표기 공유**: 마디 표기 sub도 이 V를 쓴다(§5).

---

## 7. getMinTick — 렌더 가능한 최소 tick

스크롤 시작 전 pre-roll 영역의 하한.

- **`getMinTick()`** = `−(TPB × 4 × numerator / denominator)` = 첫 박자 기준 **1마디 이전**. [보존]
- 에디터 스크롤 위치를 이 아래로 못 내리는 clamp에 쓰인다.

---

## 8. leadIn / offset — 시간축 정의

값은 [[EXTRACTED_FACTS]], 시계 적용은 game 소관. 여기서는 시간축 의미만.

- **leadIn** (`LEAD_IN_MS` = 3000) — 곡 시작(tick 0) 전 비어 있는 스크롤 구간. 처음부터 재생 시 clock이 `−LEAD_IN_MS`에서 출발한다. resume 시에는 요청 시에만 적용. [보존]
- **offset** (`metadata.offset`, ms) — 오디오 싱크 보정. **음악 시작 위치에만** 더해진다(`startAudio(startMs + offset)`). 양수면 음악을 당긴다. 곡 공통. tick↔ms 변환에는 들어가지 않는다(노트 타이밍 불변, 음원만 이동). [보존]
- 둘은 별개다: leadIn은 시작 전 빈 구간, offset은 음원 위치 보정.

---

## 9. 캐시

세그먼트(시간·마디)는 소스가 바뀔 때만 재생성한다.

- 의존성 선언 방식: `tempos` 변경 → BPM 세그먼트 무효, `timeSignatures` 변경 → 마디 세그먼트 무효.
- 현재 코드의 `compBPM`/`invalidateTSCache`는 무효화를 전달하는 레거시 래퍼다. 재구현은 의존성 선언만 두고 래퍼를 제거한다. [수정: 제거]

---

## 10. 출처 태그 요약

| 항목 | 태그 | 비고 |
|---|---|---|
| tickToMs / msToTick | 보존 | 세그먼트 모델·수치 그대로 |
| tickToMeasure / measureToTick / getGridLines | 보존 | 동작 동일, 음수 분기 3겹 제거(구조) |
| 빈 tempos/timeSignatures fallback | 보존 | 120bpm / 4·4 (현재 코드 기본값) |
| sub 분할 = gridDivisor | 수정 | 16 고정 폐기, gridDivisor 통일 |
| gridDivisor 분음표 표기 | 수정 | 구 N(박 등분) → V=4N, `GDIVS`→`GRID_DIVISORS`(+6, ~256) |
| scrollProgressAt 분리 | 신규 | px(scrollYAt)는 render로 |
| SCROLL_VIEW_MS 명명 | 수정 | 리터럴 2000 승격 |
| bpmAt 제거 | 수정 | 死코드 |
| compBPM/invalidateTSCache 제거 | 수정 | 의존성 선언으로 대체 |
| leadIn / offset / getMinTick | 보존 | 시간축 정의만(시계는 game) |

---

## 11. 미해결

(없음 — gridDivisor 드롭다운은 §6 `GRID_DIVISORS`로 확정. 구 `GDIVS` = `[1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64]` 실측 ×4 재명명 + `6` 추가.)
