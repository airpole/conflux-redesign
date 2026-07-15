# data-model — 데이터 구조 단일 출처

> 모든 저장 데이터 스키마를 여기 모은다. 다른 문서(glossary 등)는 개념만 정의하고 구조는 이 문서를 참조한다.
> 필드명은 [[naming]] 규칙을 따른다. 용어는 [[glossary]]. 값 실측은 [[EXTRACTED_FACTS]].

---

## 1. 최상위 — 독립 chart

영속되는 최상위 문서는 **chart 하나**다. 각 chart는 재생·편집에 필요한 metadata·timing·asset 참조·events를 스스로 소유한다 `[번복]`.

```js
chart = {
  schemaVersion,
  songId,
  chartId,

  metadata,
  tempos,
  timeSignatures,
  musicFile,
  jacketFile,

  difficulty,
  subtitle,
  level,
  chartBy,
  version,

  notes,
  shapeEvents,
  laneEvents,
  textEvents,
}
```

- `songId`가 같은 chart들은 관련 chart 집합으로 **파생 그룹화**된다. 별도의 canonical `song` 객체는 저장하지 않는다.
- 같은 그룹 안에서도 metadata·timing·music·jacket은 chart마다 다를 수 있다.
- game/library UI는 필요할 때 chart 집합에서 song view를 파생한다. 대표 표시 규칙은 [[cfx]] §6.
- 파일·workspace·editor session의 작업 단위는 모두 chart 하나다.

---

## 2. metadata — chart 소유 `[번복]`

```js
metadata = {
  title,        // chart가 표시할 곡 제목
  musicBy,      // 작곡 크레딧. "Music by"는 표시 레이어가 붙임
  jacketBy,     // 자켓 제작 크레딧. "Jacket by"는 표시 레이어가 붙임
  offset,       // 이 chart의 오디오 싱크 보정 ms (양수=음악 당김)
}
```

- metadata는 값만 저장한다. `Music by / Jacket by / Chart by` 라벨은 [[scene]]이 붙인다.
- `chartBy`·`difficulty`·`subtitle`·`level`은 chart 직속 필드다(§4).
- `jacketBrightness`는 전역 플레이어 설정([[settings]])이고 chart 데이터가 아니다.
- `measureLabelOffset`은 에디터 설정([[settings]])이며 chart 데이터가 아니다.
- 곡 부제용 metadata `subtitle`은 없다. `subtitle`은 chart 구분 필드 하나만 사용한다.

---

## 3. timing·asset 참조 — chart 소유 `[번복]`

```js
tempos:         [{ startTick, bpm }]
timeSignatures: [{ startTick, numerator, denominator }]
musicFile:      string | null
jacketFile:     string | null
```

- `tempos`·`timeSignatures`·`metadata.offset`은 현재 chart와 현재 music의 시간축을 정의한다.
- `timeSignatures`는 마디선 위치만 정한다. 노트 분박(`gridDivisor`)은 박자와 독립이다. → [[timing]] §4·§6
- `musicFile`·`jacketFile`은 경로가 아닌 **파일명만** 저장한다. 패키지 규칙·유효성은 [[cfx]] §7~§10.
- `musicFile: null`은 작업 중 chart JSON에서 허용된다. `.cfx` 포함 조건은 [[cfx]] §10.
- `jacketFile: null`은 항상 허용되며 표시 레이어는 placeholder를 사용한다.

---

## 4. chart identity·표시 필드

```js
chartId,       // songId 그룹 안의 식별 정수
 difficulty,   // init / Trace / Drift / Surge / Flux / Phase
 subtitle,     // 차분명·용도 설명 (선택 문자열)
 level,        // 난이도 수치
 chartBy,      // 채보 제작자. "Chart by"는 표시 레이어가 붙임
 version       // 내용의 판. export마다 +1
```

- identity = `songId + chartId`. 특정 revision = `songId + chartId + version`.
- `chartId 0`은 init, `1~4`는 Trace/Drift/Surge/Flux 고정 슬롯, `5+`는 추가 chart다. 상세 → [[cfx]] §5.
- `difficulty + normalized subtitle`은 같은 `songId` 그룹에서 playable chart를 사람이 구별하는 키다. identity나 파일명 유일성 자체는 아니다.
- `subtitle`은 저장 시 대괄호를 포함하지 않는다. 표시 레이어가 존재할 때 항상 `[...]`로 감싼다.

---

## 5. note

```js
note = { startTick, duration, lane, isWide }
```

- **lane** (1~4) — 노트가 사는 곳. (구 channel)
- **isWide** — true면 아무 키로나, false면 자기 lane 키로만.
- **duration** — 0이면 tap, >0이면 hold. ([[glossary]] duration 공통 규칙)
- 4종 = `isWide` × `duration`: Tap / Hold / WideTap / WideHold.

### 5.1 겹침 검출 — overlap / conflict (파생)

노트에 저장되는 필드가 아니라 notes에서 계산되는 파생 속성이다(`noteOverlapMap`). 재계산 트리거는 notes를 invalidate하는 dispatch뿐이다.

**활성구간**: Tap = `[t, t]`, Hold = `[head, head+dur)`.

**검출 = sweep-line** `[수정]`: 풀(lane 1~4 각각 + Wide)별로 시작/종료 이벤트를 정렬해 훑으며 동시 활성 수와 집합을 구한다. O(n log n).

**capacity로 분기**:
- lane 1·4 (1키): 2겹부터 conflict.
- lane 2·3 (2키, `OVERLAP_LANES`): 2겹 = overlap, 3겹부터 conflict.
- Wide 풀: 2겹부터 conflict.
- conflict는 그 순간 동시 활성인 노트 집합 전체에 표시한다. 해소 삭제는 [[editor-editing]] §1.

**overlap 세부 분류**:
- `merged` — 활성구간 동일. 한 장 표시, 다른 장 `hidden`.
- `yellow` / `clipped` — 부분 겹침. 늦은/짧은 쪽 겹침부가 `yellow`, 흰 노트 몸통은 `clipped`.

**conflict**:
- 흰 채움 + 빨간 경고 테두리. merged/yellow 분류 없음.

> **notes 배열 순서 = 배치 순서** `[신규]`: 직렬화에서도 보존한다. 시간순 접근은 정렬 캐시가 담당한다.
> 검출(domain)과 표시(render)를 분리한다. judge는 overlap/conflict를 모른다.

---

## 6. shapeEvents

```js
shapeEvent = { startTick, duration, isBlue, targetPos, easing }
```

- `isBlue`: Blue/Red 체인 식별자. 방향이 아니며 교차 가능.
- `targetPos`: 외부단위 -8~+8, 0.25 스텝.
- `easing`: Linear / In-Sine / Out-Sine / null(anchor).
- `duration`: 0이면 step, >0이면 easing 보간.
- 평가·좌표계·입력 라벨 Step/Arc는 [[shape]].

---

## 7. laneEvents

```js
laneEvent = { startTick, duration, lineNum, targetPos, easing }
```

- `lineNum ∈ {1,2,3}`.
- `targetPos`: 상대 실수 전체. 그 tick의 왼쪽 경계=0, 오른쪽 경계=1.
- easing/duration은 shape와 동일.
- 상세 → [[lane-events]].

---

## 8. textEvents

```js
textEvent = {
  startTick,
  duration,
  content,
  position, // left | middle | right | lane1 | lane2 | lane3 | lane4
}
```

- 개행 허용.
- 등장·퇴장 fade 각 300ms 고정 `[수정]`.
- 구 `transition`·`mode` 필드는 폐기.
- 스타일·배치는 [[theme]] §3, 편집은 [[editor-editing]] §1.

---

## 9. 런타임 상태 (저장 안 됨)

```js
editorState = { scrollSpeed, ...selection/tool/viewport/history }
playState   = {
  gauge: { hardPct, normalPct },
  tier,
  gaugeMode, combo, maxCombo, hits, misses, holds,
  keysHeld, laneMap, fastCount, slowCount, flashTiming, forceEnded, ...
}
```

- core 함수에는 **활성 chart**를 인자로 넘긴다. core는 library의 songId 그룹이나 멀티 chart 목록을 모른다.
- result(`score`/`accuracy`/`rank`/`state`/FAST·SLOW)는 `computeResult` 반환값이며 저장 chart 필드가 아니다.

---

## 10. 버전 / 교환

- `schemaVersion`: 재구현 시작값 `1`. 스키마 변경 때 명세가 올린다.
- `version`: chart 내용의 판. export할 때마다 +1.
- 파일 형태: chart `.json`(작업 단위) / `.cfx`(songId 그룹 배포 단위). 상세 → [[cfx]].

---

## 11. 결정 완료 / 잔여

확정:
- [x] canonical 저장 단위 = 독립 chart `[번복]`
- [x] song = 같은 `songId` chart들의 파생 그룹 `[번복]`
- [x] metadata·timing·asset 참조 = chart 소유 `[번복]`
- [x] `musicFile`·`jacketFile` 필드와 nullability
- [x] identity와 사용자 표시 구분
- [x] note/shape/lane/text 구조 및 런타임 상태

잔여:
- (없음 — records의 수정 chart 연결 정책은 [[records]] 범위에서 보류.)
