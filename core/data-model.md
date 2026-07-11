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
  musicBy,      // 작곡 크레딧 (구 artist). 표시 "Music by ○○○"는 credit 씬이 붙임 → [[scene]]
  jacketBy,     // 자켓 제작 크레딧 [신규]. 표시 "Jacket by ○○○"
  offset,       // 오디오 싱크 보정 ms (양수=음악 당김). [[glossary]] offset
}
```

- 크레딧 필드는 **값만** 저장한다. "Music by / Jacket by / Chart by" 접미사는 표시 레이어(credit 씬)가 붙인다 → [[scene]] §6.
- `chartBy`(채보 크레딧) / `difficulty` / `level`은 metadata가 아니라 **chart별**이다 (§4).

> **제거됨**: `jacketBrightness`(자켓 배경 밝기)는 곡 데이터가 아니라 **전역 플레이어 설정**으로 이전·개명 → [[settings]] `jacketBrightness`. `measureLabelOffset`은 곡 데이터가 아니라 **에디터 설정**으로 이전 → [[settings]]. 근거 [[rationale]].
> **철회됨**: `subtitle`(곡 부제)·`audioFile`은 명세 초안이 추가했던 필드로 철회 — 구 코드에 없음(실측). 철회로 chart별 `subtitle`(§4)과의 이름 충돌도 소멸. `jacketImage`도 폐기 `[수정]` — **에셋은 참조 필드 없이 파일로만 존재**한다(파일명 접미 규칙 → [[cfx]] §3). 자켓 부재 시 placeholder 생성 규칙은 유지(표시 레이어).

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
  chartId,       // song 내 식별 정수. 0=init·1~4 고정 슬롯·5+ 추가 채보 → [[cfx]] §5
  difficulty,    // 6종 enum: init/Trace/Drift/Surge/Flux/Phase → [[cfx]] §6
  subtitle,      // 차분명·용도 설명 (선택 문자열) [신규] → [[cfx]] §6
  level,         // 난이도 수치 (숫자)
  chartBy,       // 이 난이도의 채보 제작자 (구 charter). 난이도마다 다를 수 있어 chart별. 표시 "Chart by ○○○"
  version,       // 내용의 판 — export마다 +1 [신규] → [[cfx]] §7
  notes,         // §5
  shapeEvents,   // §6
  laneEvents,    // §7 (상세 [[lane-events]])
  textEvents,    // §8
}
```

- chart가 **파일로 직렬화될 때는 곡 공통 필드(§1~§3) 사본을 함께 담는다**(자립 파일 — [[cfx]] §2). 논리 소유는 여전히 song이며, 이 문서의 소속 구분은 논리 모델 기준이다.

---

## 5. note

```
note = { startTick, duration, lane, isWide }
```

- **lane** (1~4) — 노트가 사는 곳. (구 channel)
- **isWide** — true면 아무 키로나, false면 자기 lane 키로만.
- **duration** — 0이면 tap, >0이면 hold. ([[glossary]] duration 공통 규칙)
- 4종 = `isWide` × `duration`: Tap / Hold / WideTap / WideHold.

### 5.1 겹침 검출 — overlap / conflict (파생)

노트에 저장되는 필드가 아니라 notes에서 **계산되는 파생 속성**이다(`noteOverlapMap`, notes 변하면 갱신). 개념·색은 → [[glossary]]; 여기는 알고리즘 단일 출처.

**활성구간**: Tap = `[t, t]`, Hold = `[head, head+dur)`. 두 노트의 활성구간이 겹치면 hit.

**단일 검출, capacity로 분기**:
- 같은 lane 안에서 같은 검출을 돌린다. lane이 2키(L2·L3, `OVERLAP_LANES`)면 `overlap`, 1키(L1·L4)면 `conflict`.
- Wide는 따로 모아 같은 활성구간 규칙으로 검출 → 겹치면 `conflict`(전폭이 겹쳐 독립 타격 불가).

**`overlap`(2키 lane) 세부 분류** — 두 노트 관계로:
- `merged` — 활성구간 동일 → 한 장만 노랗게(다른 한 장 `hidden`).
- `yellow` / `clipped` — 부분 겹침 → 늦은/짧은 쪽 겹침부가 노랗게(`yellow`), 흰 노트는 겹침구간 몸통을 깎음(`clipped`).

**`conflict`(1키 lane + Wide-on-Wide)**:
- 겹친 두 장 모두 `conflict`. 흰 채움 + 빨간 경고 테두리. merged/yellow 분류 없음(연주 불가라 표시가 목적).

> **검출(domain) vs 표시(render)**: 어느 노트끼리 겹쳤고 overlap이냐 conflict냐는 이 파생 패스(domain)가 정한다. 그 map을 받아 색·테두리·above/below 쌓임을 입히는 건 render다. judge는 둘 다 모른다(입력만). 구 `invalid`→`conflict` 개명. 근거 → [[rationale]].

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
textEvent = {
  startTick,   // 등장 tick
  duration,    // 표시 길이 (tick)
  text,        // 내용
  position,    // 'left' | 'middle' | 'right' | 'lane1' | 'lane2' | 'lane3' | 'lane4'
}
```

- 특정 tick에 화면에 텍스트를 띄우는 연출. 특수 연출·튜토리얼용이라 드물다.
- 등장·퇴장 연출은 **fade 고정** `[신규]`. 폰트·크기 등 표시 스타일은 [[theme]] 잔여. 편집은 text 툴 2클릭 → [[editor-editing]] §1.

---

## 9. 런타임 상태 (저장 안 됨)

차트 데이터와 별개로, 플레이/편집 중에만 존재하는 상태. 저장 대상 아님.

```
editorState = { scrollSpeed, ... 선택/툴/뷰포트/히스토리 }   // 세션 = chart 하나([[editor-graph]] §4) — chart 포인터 없음
playState   = { gaugePct, gaugeMode, combo, maxCombo, hits, misses, holds,
                keysHeld, laneMap, fastCount, slowCount, flashTiming, forceEnded, ... }
```

- 코어 함수에는 song 전체가 아니라 **활성 보면**(곡 공통 tempos/timeSignatures + 현재 chart)을 펼쳐 넘긴다. 코어는 멀티 난이도 구조를 모른다.
- playState 필드 구조의 단일 출처는 여기다. [[naming]] 상태 객체 대응표는 **구 `PS`→신 `playState` 개명 추적**용(이름 매핑만).
- result 산출물(`score`/`accuracy`/`rank`/`state` + `fastCount`/`slowCount`)은 `computeResult`가 playState에서 읽어 **반환**하는 값이지 playState 저장 필드가 아니다. 계산식 → [[constants]] §3, state → [[gauge]].

---

## 10. 버전 / 교환

- **`schemaVersion`** — 재구현 시작값 **`1`**(숫자, `v` 접두 없음). 구 코드의 v3 체계(isRight→isBlue 등)와 별개의 새 체계 — 포맷이 백지 재설계라 이어 세지 않는다.
- **파일 형태** — chart `.json`(에디터 작업 단위, 자립) / `.cfx`(게임 배포 단위, 수동 조립 ZIP). schemaVersion·version 두 축 포함 **상세 → [[cfx]]** (songId·chartId·difficulty 정의 포함).

---

## 11. 미해결

(없음 — textEvent 필드 확정(§8), .cfx는 [[cfx]]로 분리 완료.)
