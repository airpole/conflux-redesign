# data-model — 데이터 구조 단일 출처

> 모든 데이터 스키마를 여기 모은다. 다른 문서(glossary 등)는 개념만 정의하고 구조는 여기를 참조한다.
> 필드명은 [[naming]] 규칙을 따른다. 용어는 [[glossary]]. 값 실측은 [[EXTRACTED_FACTS]].

---

## 1. 최상위 — song ⊃ chart[]

곡(song) 하나에 난이도별 보면(chart)이 배열로 들어가는 2층 구조.

```
song = {
  schemaVersion,
  metadata,          // 곡 공통 (아래 §2)
  tempos,            // 곡 공통 (§3)
  timeSignatures,    // 곡 공통 (§3)
  charts: [ chart ]  // 난이도들 (§4)
}
```

- **곡 공통**(song 직속): 오디오가 하나이므로 타이밍·메타도 하나. 난이도가 달라도 공유.
- **chart별**(charts[] 안): 난이도마다 자유.

---

## 2. metadata (곡 공통)

```
metadata = {
  title,        // 곡 제목
  subtitle,     // 부제
  musicBy,      // 작곡 크레딧 (구 artist). 표시 "Music by ○○○"는 credit 씬이 붙임 → [[scene]]
  jacketBy,     // 자켓 제작 크레딧 [신규]. 표시 "Jacket by ○○○"
  audioFile,    // 오디오 파일 참조 (곡 공통 — 난이도별로 안 갈림)
  offset,       // 오디오 싱크 보정 ms (양수=음악 당김). [[glossary]] offset
  jacketImage,  // 자켓 이미지 (없으면 placeholder 생성)
}
```

- 크레딧 필드는 **값만** 저장한다. "Music by / Jacket by / Chart by" 접미사는 표시 레이어(credit 씬)가 붙인다 → [[scene]] §6.
- `chartBy`(채보 크레딧) / `difficulty` / `level`은 metadata가 아니라 **chart별**이다 (§4).

> **제거됨**: `jacketBrightness`(자켓 배경 밝기)는 곡 데이터가 아니라 **전역 플레이어 설정**으로 이전·개명 → [[settings]] `jacketBrightness`. `measureLabelOffset`은 곡 데이터가 아니라 **에디터 설정**으로 이전 → [[settings]]. 근거 [[rationale]].

---

## 3. 곡 공통 타이밍

```
tempos:         [{ startTick, bpm }]                     // BPM 변화점. 오디오와 1:1
timeSignatures: [{ startTick, numerator, denominator }] // 박자. 마디선 위치 결정
```

- 둘 다 곡 공통. 난이도와 무관.
- `timeSignatures`는 **마디선 위치만** 정한다. 노트 분박(gridDivisor)은 박자와 독립. → [[timing]] §4·§6

---

## 4. chart (난이도 하나)

```
chart = {
  difficulty,    // 난이도 명칭 (문자열: "Trace" / "Drift" / "Surge" …)
  level,         // 난이도 수치 (숫자)
  chartBy,       // 이 난이도의 채보 제작자 (구 charter). 난이도마다 다를 수 있어 chart별. 표시 "Chart by ○○○"
  notes,         // §5
  shapeEvents,   // §6
  laneEvents,    // §7 (상세 [[lane-events]])
  textEvents,    // §8
}
```

---

## 5. note

```
note = { startTick, duration, lane, isWide }
```

- **lane** (1~4) — 노트가 사는 곳. (구 channel)
- **isWide** — true면 아무 키로나, false면 자기 lane 키로만.
- **duration** — 0이면 tap, >0이면 hold. ([[glossary]] duration 공통 규칙)
- 4종 = `isWide` × `duration`: Tap / Hold / WideTap / WideHold.

---

## 6. shapeEvents (플레이필드 바깥 경계)

```
shapeEvent = { startTick, duration, isBlue, targetPos, easing }
```

- **isBlue** — true=Blue 체인, false=Red 체인. 체인 식별자(방향 아님, 두 경계 교차 가능).
- **targetPos** — 도달 위치 (외부단위 -8~+8, 0.25 스텝).
- **easing** — Linear / In-Sine / Out-Sine (null=anchor, 보간 안 함). Step·Arc는 저장 안 되는 입력 라벨 → [[shape]] §4·§5.
- **duration** — 0이면 step(즉시 점프), >0이면 easing 보간.
- Blue·Red 두 체인이 각각 독립 시간축. 평가·좌표계·easing 전체는 → [[shape]].

---

## 7. laneEvents (안쪽 구분선)

```
laneEvent = { startTick, duration, lineNum, targetPos, easing }
```

- **lineNum** ∈ {1,2,3} — 어느 구분선.
- **targetPos** — 0~1 상대비율 (0=Blue, 1=Red). shape와 달리 **상대**.
- **easing / duration** — shape와 동일.
- 구분선 1·2·3이 각각 독립 체인. 구속·좌표계·렌더는 → [[lane-events]].

> shape와 동형이나 선택자(isBlue↔lineNum)와 좌표계(절대 -8~+8 ↔ 상대 0~1)가 다르다. 병합하지 않는다.

---

## 8. textEvents (연출 텍스트)

```
textEvent = { startTick, ... }   // 텍스트 내용·위치 (구체 필드 미확정)
```

- 특정 tick에 화면에 텍스트를 띄우는 연출. 특수 연출·튜토리얼용이라 드물다.
- 구체 필드는 편집 UI 설계 시 확정.

---

## 9. 런타임 상태 (저장 안 됨)

차트 데이터와 별개로, 플레이/편집 중에만 존재하는 상태. 저장 대상 아님.

```
editorState = { currentChartIndex, scrollSpeed, ... 선택/툴/뷰포트/히스토리 }
playState   = { gaugePct, gaugeMode, combo, maxCombo, hits, misses, holds,
                laneMap, fastCount, slowCount, flashTiming, forceEnded, ... }
```

- 코어 함수에는 song 전체가 아니라 **활성 보면**(곡 공통 tempos/timeSignatures + 현재 chart)을 펼쳐 넘긴다. 코어는 멀티 난이도 구조를 모른다.
- 필드 상세는 [[naming]] 상태 객체 대응표.

---

## 10. 버전 / 교환

- **`schemaVersion`** — 현재 코드 v3 (isRight→isBlue, jacketId 등). 재구현 시 증가.
- **`.cfx`** — 교환 포맷. ZIP(fflate), content-hash 에셋 ID. 오디오 1 + 자켓 1 + 난이도별 chart JSON N개. 상세는 별도 문서(미작성).

---

## 11. 미해결

- [ ] textEvent 구체 필드
- [ ] .cfx 포맷 상세 문서 (data-model에서 분리)
- [ ] schemaVersion 재구현 시작 번호
