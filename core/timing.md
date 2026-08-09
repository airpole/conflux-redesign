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
- empty tempos fallback=120bpm at tick0. chart는 mutate하지 않는다.
- round-trip identity.
- unused bpmAt은 만들지 않는다. bpm·박자 값은 segment 조회(`tempoSegmentAt`·`measureSegmentAt`)에서 나온다.

---

## 3. scroll — ms 등속

```text
scrollProgressAt(tick, nowMs) = (tickToMs(tick)-nowMs)/visMs
visMs = SCROLL_VIEW_MS/scrollSpeed
```

`SCROLL_VIEW_MS` 값은 [[constants]] §4.

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
- `measureLabelOffset`(editor setting)과 `gridDivisor`(session editorState)는 **caller가 인자로 주입**한다. core는 둘 다 스스로 알 수 없다. game은 labelOffset 0.
- `gridLines`는 **px를 모르는 grid line 기술자** 목록을 반환한다: `{tick, isMeasure, measureNum, beatInMeasure, isPreRoll}`. `isPreRoll`(tick<0, 위치)과 `measureNum`(표시값)은 분리한다 — labelOffset이 붙으면 표시값으로 위치를 판별할 수 없다.
- grid line 간격은 **박 단위**다. 분박 선을 그릴지는 render의 밀도 판단이다.
- timeSignatures는 **현재 chart의 measure boundary**만 결정하며 subdivision과 독립이다.

---

## 5. sub = gridDivisor cell

```text
cellTick = TPB*4/gridDivisor
sub = round(subTick/cellTick)
```

fixed 16 subdivision을 폐기하고 active gridDivisor와 표기·snap을 통일한다 `[수정]`.
격자에 떨어지지 않는 tick은 반올림해 근사 표기한다.

---

## 6. gridDivisor

note placement time grid. 값 V는 note-value denominator이므로 **V가 클수록 촘촘하다**(한 칸 = `7680/V` tick). default 8 `[수정 — 구 2]`.

- dropdown=`[1,2,3,4,6,8,12,16,24,32,48,64,96,128,192,256]` `[수정]` — 원본 상단(64)에 `96·128·192·256` 추가. 넷 다 `7680/V`가 정수(80·60·40·30)라 반올림 오차가 없다.
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

## 9. song end

플레이가 끝나는 시각을 chart time으로 정의한다. 단위는 모두 ms.

| 값 | 정의 |
|---|---|
| `chartEndMs` | 모든 event(note·shapeEvent·laneEvent·textEvent)의 `startTick + duration` 최대값을 tickToMs한 값. event가 없으면 0. `[수정]` |
| `musicEndMs` | `musicDurationMs - offset`. music이 없으면 0. `[수정]` |
| `contentEndMs` | `max(chartEndMs, musicEndMs)` |
| `songEndMs` | `contentEndMs + SONG_END_TAIL_MS` `[수정]` |

- 종료 판정은 `currentMs > songEndMs`다. 종료 후 전이는 [[scene]] §9.
- 진행 표시의 분모는 `contentEndMs`다. CTX가 나르는 값도 이것이다 → [[architecture]] §3.
- `SONG_END_TAIL_MS`는 [[constants]] §9.
- 이 값들에 하한은 없다. editor timeline의 최소 표시 길이는 별개 값이며 [[editor-graph]] 소관이다.

---

## 10. cache

캐시와 invalidation을 두지 않는다 `[수정]`. `buildTimeline(chart)`가 BPM·measure segment를 함께 담은 파생 객체를 만들고, 이후 함수는 전부 그것을 인자로 받는다.

- chart가 바뀌면 `buildTimeline`을 다시 부른다 — "chart session 교체 시 재구성"이 규칙이 아니라 호출 구조 그 자체다.
- 두 segment는 항상 짝으로 쓰이므로 한 객체에 담는다.
- 전 함수 순수. 인자를 mutate하지 않는다.

---

## 11. 태그 요약

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
| chartEndMs = 전 event 최대 종료(laneEvent 포함) | 수정 |
| songEndMs tail 3000 단일화 | 수정 |
| musicEndMs offset 보정 | 수정 |
| 종료 조건에서 5000ms 하한 제거 | 수정 |
| lane horizontal grid 분리 | 번복 |
| gridDivisor 목록 상단 확장·기본 8 | 수정 |
| cache → buildTimeline 파생 객체 | 수정 |
| measureToTick 마디 0 왕복 복구 | 수정 |

---

## 12. 미해결

(없음)
