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
  updatedAt,

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
  category,     // 최상위 분류. 자유 문자열, 빈 값 허용 [신규]
  previewStartMs, // song-select preview 시작 지점 ms. 기본 0 [신규]
}
```

- metadata는 값만 저장한다. `Music by / Jacket by / Chart by` 라벨은 [[scene]]이 붙인다.
- `chartBy`·`difficulty`·`subtitle`·`level`은 chart 직속 필드다(§4).
- `jacketBrightness`는 전역 플레이어 설정([[settings]])이고 chart 데이터가 아니다.
- `measureLabelOffset`은 에디터 설정([[settings]])이며 chart 데이터가 아니다.
- `category`는 song-select의 최상위 탭을 파생하는 값이다([[song-select]] §2). enum이 아니며 빈 값은 `Uncategorized`로 모인다.
- `previewStartMs`는 song-select preview의 시작 지점이다. 루프·fade 규칙은 [[song-select]] §10, 수치는 [[constants]].
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
 version,      // 내용의 판. 저장 시 사용자가 현재보다 큰 값으로 확정 ([[persistence]] §4)
 updatedAt     // 마지막 저장 시각
```

- identity = `songId + chartId`. 특정 revision = `songId + chartId + version`.
- `chartId 0`은 init, `1~5`는 Trace/Drift/Surge/Flux/Phase 고정 슬롯, `6+`는 추가 chart다 `[번복]`. 상세 → [[cfx]] §4.
- `updatedAt`은 **ISO 8601 UTC 문자열**이다(`2026-08-08T05:10:00Z`) `[신규]`. 사전순 비교가 곧 시간순이다.
  - chart 생성 시각으로 초기화한다.
  - **에디터 파일 저장이 성공한 순간에만** 갱신한다([[persistence]] §4). 취소·실패 시 바뀌지 않는다.
  - import·`.cfx` 패키징·library 등록은 값을 다시 쓰지 않고 저장된 값을 계승한다([[cfx]] §2).
  - song-select의 `updated` 묶음 축이 소비한다([[song-select]] §4).
- `difficulty + normalized subtitle`은 같은 song에서 playable chart를 사람이 구별하는 키다. identity나 파일명 유일성 자체는 아니다.
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
- 영속 note ID는 없다. 판정 매칭은 `startTick`·`lane`·`isWide`·`duration`이 완전히 같은 노트를 서로 교환 가능한 것으로 다룬다([[judge]] §1).

### 5.1 겹침 검출 — overlap / conflict (파생)

노트에 저장되는 필드가 아니라 notes에서 계산되는 파생 속성이다(`noteOverlapMap`). 재계산 트리거는 notes를 invalidate하는 dispatch뿐이다.

**활성구간**: Tap = `[t, t]`, Hold = `[head, head+dur)`.

**검출 = sweep-line** `[수정]`: 풀(lane 1~4 각각 + Wide)별로 시작/종료 이벤트를 정렬해 훑으며 동시 활성 수와 집합을 구한다. O(n log n).

**로컬 capacity로 분기**:
- lane 1·4 (1키): 2겹부터 conflict.
- lane 2·3 (2키, `OVERLAP_LANES`): 2겹 = overlap, 3겹부터 conflict.
- Wide 풀: 2겹부터 conflict.
- conflict는 그 순간 동시 활성인 노트 집합 전체에 표시한다. 해소 삭제는 [[editor-editing]] §1.

**global 6키 conflict** `[번복]`: 로컬 capacity를 모두 만족해도 물리 키 총수요가 6을 넘으면 구조적으로 칠 수 없다. 매 tick에서:

```text
D1 = lane 1 활성 Hold + 이 tick의 lane 1 head 수
D2 = lane 2 활성 Hold + 이 tick의 lane 2 head 수
D3 = lane 3 활성 Hold + 이 tick의 lane 3 head 수
D4 = lane 4 활성 Hold + 이 tick의 lane 4 head 수
W  = 활성 WideHold 수요 + 이 tick의 wide head 수

D1<=1, D2<=2, D3<=2, D4<=1, W<=1
D1+D2+D3+D4+W <= 6
```

마지막 부등식이 로컬 capacity를 모두 통과해도 발생하는 7-입력 문제(예: 1+2+2+1+1=7)를 잡는다. lane별 키 집합이 서로소이고 wide 수요가 최대 1이므로, 이 부등식들은 현재 6키 구성에서 **완전한 배정 가능성 검사**다([[judge]] §12).

- 같은 tick에서는 **tail이 먼저 빠지고** 그다음 같은 tick의 head를 평가한다([[judge]] §7).
- global conflict group은 그 tick/상태에서 수요에 기여한 노트 전체를 포함하며, 로컬 overlap 표시보다 **우선**한다.
- global conflict 해소 삭제는 reverse-insertion으로 초과분(`총수요 − 6`)만 지운다 — 자동 삭제는 없다.
- 판정창은 구조적으로 불가능한 동시 chord를 눈감아주지 않는다 — 검증은 note domain의 문제이지 judge 판정 로직의 문제가 아니다.

**overlap 세부 분류**:
- `merged` — 활성구간 동일. 한 장 표시, 다른 장 `hidden`.
- `yellow` / `clipped` — 부분 겹침. 늦은/짧은 쪽 겹침부가 `yellow`, 흰 노트 몸통은 `clipped`.

**conflict** (로컬·global 공통):
- 흰 채움 + 빨간 경고 테두리. merged/yellow 분류 없음. global conflict가 로컬 overlap 표시를 덮는다.

> **notes 배열 순서 = 배치 순서** `[신규]`: 직렬화에서도 보존한다. 시간순 접근은 정렬 캐시가 담당한다.
> 검출(domain)과 표시(render)를 분리한다. judge는 overlap/conflict를 모른다. conflict 저장 필드·note ID는 두지 않는다.

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
- 등장·퇴장 fade 고정 — 값은 [[constants]] `TEXT_FADE_MS` 단일 출처 `[수정]`.
- 구 `transition`·`mode` 필드는 폐기.
- 스타일·배치는 [[theme]] §3, 편집은 [[editor-editing]] §1.

---

## 9. 런타임 상태 (저장 안 됨)

```js
editorState = { scrollSpeed, ...selection/tool/viewport/history }
playState   = {
  gauge: { hardPct, normalPct },
  tier,
  gaugeMode, combo, maxCombo, hits, misses,
  activeNormalHolds, activeWideHold, wideOwnerKey,
  keysHeld, keyPressSerial, nextPressSerial,
  laneMap, fastCount, slowCount, flashTiming, forceEnded, ...
}
```

- `activeNormalHolds`/`activeWideHold`/`wideOwnerKey`/`keyPressSerial`/`nextPressSerial`은 D-2026-024의 key-demand Hold 모델 상태다. 구 `holds`(key→note 소유 맵)를 대체한다 `[번복]` — 모델 단일 출처는 [[judge]] §5~§9, 이름 대응 [[naming]] §4.

- core 함수에는 **활성 chart**를 인자로 넘긴다. core는 library의 songId 그룹이나 멀티 chart 목록을 모른다.
- result(`score`/`accuracy`/`rank`/`state`/FAST·SLOW)는 `computeResult` 반환값이며 저장 chart 필드가 아니다.

---

## 10. 버전 / 교환

- `schemaVersion`: 재구현 시작값 `1`. 스키마 변경 때 명세가 올린다.
- `version`: chart 내용의 판. 저장 창에서 사용자가 현재 열린 version보다 큰 값으로 확정한다([[persistence]] §4). 저장 성공 시에만 확정된다.
- 파일 형태: chart `.json`(작업 단위) / `.cfx`(songId 그룹 배포 단위). 상세 → [[cfx]].

---

## 11. 검증 `[신규]`

검증은 **두 층**이며 층마다 실패의 뜻과 복구 경로가 다르다.

### structural — 이 파일이 chart인가

필수 필드의 존재·타입과 `schemaVersion`을 본다. 실패하면 chart로 취급하지 않고
**로드를 거부**한다. 열 수 없는 파일이지 고칠 파일이 아니다.

- 대상: §1 최상위 필드 전부, §2 metadata 필드 전부, `musicFile`·`jacketFile`의
  `string | null`, §3·§5~§8 컬렉션이 배열인지.
- `schemaVersion`이 현재 판과 다르면 거부한다. 상·하위 판을 가리지 않는다 —
  마이그레이션 체계는 실제로 판을 올릴 때 설계하며, 지금 필요한 것은 **거부
  지점이 있다**는 것뿐이다.
- 통과 여부는 boolean 하나가 아니라 자리별 오류 목록으로 보고한다.

### domain — 값이 말이 되는가

값의 범위·논리를 본다. **거부하지 않고 보고만 한다.**

- 대상 예: `lane`이 1~4 밖, `duration` 음수, `tempos`·`timeSignatures`가 빔,
  `bpm` 0 이하, `difficulty`가 목록 밖, `version` 1 미만, `updatedAt`이 ISO 8601로
  읽히지 않음, shape `targetPos`가 -8~+8 밖, `lineNum`이 1~3 밖, textEvent
  `position`이 목록 밖.
- **`laneEvent.targetPos`는 검사하지 않는다.** 저장 데이터는 무구속이고 구속은
  gameplay 투영이 맡는다(§7, [[lane-events]]). 역전·초과가 정상 값이다.
- 겹침(overlap/conflict)은 여기 없다 — §5.1의 파생 속성이며 별도로 계산한다.
- 첫 문제에서 멈추지 않고 전부 모아 보고한다.

거부하지 않는 이유: **편집 중 chart는 항상 잠깐 domain-invalid하다.** 노트를 놓다
보면 conflict가 생긴다. 여기서 거부하면 에디터를 못 쓴다. 실행·기록 여부는
호출측 정책(§5.1, [[editor-editing]] §1)이 정하고, 끝내 우회되면 [[judge]] §12
런타임 폴백이 받는다.

### 두 함수 모두 chart를 건드리지 않는다

결측 필드를 기본값으로 채워 돌려주지 않는다. "검증했다"와 "고쳤다"가 한 호출에
섞이면 무엇이 원본 데이터고 무엇이 채운 값인지 구별이 사라진다. 정규화가
필요하면 호출측이 별도 함수로 명시적으로 한다.

---

## 12. 결정 완료 / 잔여

확정:
- [x] canonical 저장 단위 = 독립 chart `[번복]`
- [x] song = 같은 `songId` chart들의 파생 그룹 `[번복]`
- [x] metadata·timing·asset 참조 = chart 소유 `[번복]`
- [x] `musicFile`·`jacketFile` 필드와 nullability
- [x] identity와 사용자 표시 구분
- [x] note/shape/lane/text 구조 및 런타임 상태
- [x] `updatedAt` = chart 소유 ISO 8601 문자열, 저장 성공 시에만 갱신 `[신규]` (D-2026-031)
- [x] 검증 2층(structural 거부 / domain 보고), 무mutate, `schemaVersion` 불일치 거부 §11 `[신규]` (D-2026-036)
- [x] key-demand Hold 런타임 상태(`activeNormalHolds`/`activeWideHold`/`wideOwnerKey`/`keyPressSerial`), global 6키 conflict 검출(D-2026-024) `[번복]`

잔여:
- (없음 — records의 내용 변경 무판별·identity 유지는 [[records]] §1에서 확정, D-2026-017.)
