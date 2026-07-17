# timing — 시간축 단일 출처

> active chart의 tick↔ms, scroll progress, measure conversion, subdivision을 정의한다.
> 용어 [[glossary]], schema [[data-model]], 수치 [[EXTRACTED_FACTS]], 근거 [[rationale]].

---

## 0. 핵심 pattern — sorted events → accumulated segments → lookup

`tempos`와 `timeSignatures`는 **active chart 소유**다 `[번복 반영]`.

1. startTick 정렬.
2. segment start에 accumulated ms/measure 계산.
3. input이 속한 마지막 segment lookup 후 linear 계산.

negative tick은 first segment extrapolation으로 처리한다.

---

## 1. tick

- TPB=1920, quarter-note beat 하나.
- 모든 time-axis event는 startTick.

---

## 2. tickToMs / msToTick

```text
segment = {startTick, ms, bpm, msPerTick}
msPerTick = 60000 / (bpm × TPB)
```

- tickToMs=`seg.ms+(tick-seg.startTick)*seg.msPerTick`.
- msToTick=역산.
- empty tempos fallback=120bpm at tick0.
- round-trip identity.
- unused bpmAt은 만들지 않는다.

---

## 3. scroll — ms 등속

```text
scrollProgressAt(tick, nowMs) = (tickToMs(tick)-nowMs)/visMs
visMs = SCROLL_VIEW_MS/scrollSpeed
SCROLL_VIEW_MS = 2000
```

- 0=judge line, positive=future, negative=past.
- px mapping은 render 소관.
- clock/nowMs/playbackRate는 game 소관.

---

## 4. tickToMeasure / measureToTick

```text
segment = {startTick, measure, tpbUnit, tpm, numerator}
tpbUnit = TPB*4/denominator
tpm = tpbUnit*numerator
```

- empty timeSignatures fallback=4/4 at tick0.
- `tickToMeasure(tick,labelOffset)` → measure.beat.sub.
- `measureToTick(str,labelOffset)` inverse.
- measureLabelOffset은 editor setting을 caller가 인자로 주입; game은 0.
- getGridLines는 tick 목록을 반환하고 px를 모른다.
- timeSignatures는 **현재 chart의 measure boundary**만 결정하며 subdivision과 독립이다.

---

## 5. sub = gridDivisor cell

```text
cellTick = TPB*4/gridDivisor
sub = round(subTick/cellTick)
```

fixed 16 subdivision을 폐기하고 active gridDivisor와 표기·snap을 통일한다.

---

## 6. gridDivisor

note placement time grid. 값 V는 note-value denominator, default 32.

- dropdown=`[4,6,8,12,16,24,32,48,64,96,128,192,256]`.
- 특수 V는 typed integer.
- `round(7680/V*k)`로 integer tick snap.
- timeSignature와 독립.
- measure sub 표시와 공유.
- lane horizontal snap은 별도 laneGridDivisor([[lane-events]]), 공유하지 않는다 `[번복]`.

---

## 7. getMinTick

first time signature 기준 one-measure pre-roll:

```text
-(TPB*4*numerator/denominator)
```

editor scroll lower clamp.

---

## 8. leadIn / offset

- leadIn=3000ms, tick0 전 empty scroll. **플레이 시작 시에만** 적용 — pause Resume은 되감기 없는 정지 카운트다운 재개라 leadIn을 쓰지 않는다([[scene]] §9) `[수정]` (D-2026-022).
- offset=`activeChart.metadata.offset`, active chart music start에만 적용 `[번복 반영]`.
- offset은 tick↔ms chart note timing을 바꾸지 않고 audio position만 이동.
- player device audioOffset setting과 별개.

---

## 9. cache

- tempos 변경 → BPM segments invalidate.
- timeSignatures 변경 → measure segments invalidate.
- source는 active chart. chart session 교체 시 두 cache 모두 새 source로 재구성.
- legacy manual invalidation wrapper는 dependency declaration으로 대체.

---

## 10. 태그 요약

| 항목 | 태그 |
|---|---|
| tickToMs/msToTick | 보존 |
| tickToMeasure/measureToTick/getGridLines | 보존, 구조 단순화 |
| fallback 120bpm/4-4 | 보존 |
| sub=gridDivisor | 수정 |
| note-value gridDivisor naming | 수정 |
| scrollProgressAt 분리 | 신규 |
| bpmAt·legacy cache wrapper 제거 | 수정 |
| timing source=active independent chart | 번복 반영 |
| offset=active chart-owned | 번복 반영 |
| lane horizontal grid 분리 | 번복 |

---

## 11. 미해결

(없음)
