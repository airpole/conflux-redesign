# editor-editing — 편집 인터랙션·툴·단축키

> notes 탭과 shapes 씬(shape/lane 서브모드)의 툴·마우스 동작·단축키·클립보드·symmetry를 정의한다.
> 데이터 규칙은 core 문서가 단일 출처([[data-model]]·[[shape]]·[[lane-events]]·[[timing]]) — 여기는 "어떻게 입력하나"만.
> **에디터 단축키의 유일 출처는 이 문서다**(§1·§2 툴 키 + §5~§6 전역 키) — 다른 문서는 동작 정의만 갖고 키는 여기로 링크한다.
> 출처: `notes-input.js`·`notes-tools.js`·`shape-input.js`·`shape-tools.js`·`keyboard.js` 실측. 태그 명시 없으면 `[보존]`.

---

## 1. notes 탭

### 툴 7종 (구 → 신)

| 키 | 신 이름 | 구 | 동작 |
|---|---|---|---|
| `Q` | tap | n | 탭 배치. **롱프레스(300ms) = quick-hold** — 직전 hold 길이로 즉시 배치(아래 상세) |
| `W` | hold | ln | 2클릭: 시작점(pending 표시) → 끝점 확정. Esc 취소 |
| `E` | wideTap | w | wide 탭 배치. 롱프레스 quick-hold 동일 |
| `R` | wideHold | wl | wide hold 2클릭 |
| `T` | text | txt | textEvent 2클릭(시작→끝). 필드·연출은 [[data-model]] textEvent `[수정 — 구 U키]` |
| — | select | sel | 지속 선택 모드(빈 곳 드래그 = 사각 선택, 선택 위 드래그 = 이동) |
| — | delete | del | 클릭 삭제. **select 상태에서 선택이 있으면 delete는 툴 전환 대신 선택 삭제** |

- select/delete는 모디파이어 키(§5 `A`·`D`)로 부르는 게 기본 — 툴바 버튼도 유지.
- **quick-hold 상세** `[보존]`(실측: notes-input.js — 구 명세의 "hold 시작 모드 진입" 서술을 실측으로 정정): 롱프레스 **300ms**(그 사이 이동 없음) 발화 시 `savedLNDur` 길이의 hold를 **즉시 배치**한다 — 끝점 확정 단계 없음. `savedLNDur`는 hold 툴 2클릭 확정 때마다 그 duration으로 갱신된다. 배치 규칙: lane 2·3은 용량 초과 시 기존 tap 치환, lane 1·4는 기존 hold가 있으면 무시하되 기존 tap 위에는 그대로 얹어 conflict 경고로 노출(치환 안 함 — 유저가 보고 해소), wide는 기존 wide tap 치환.
- 판정 반경·드래그 임계 등 나머지 미세 수치는 재구현 시 원본 재실측으로 채움(기억 금지).

### 드래그 이동

- 가로: 히스테리시스 — 누적 이동이 칸폭×0.5를 넘을 때마다 ±1 lane. **그룹 연대 클램프**: 선택 중 하나라도 lane 1..4 경계를 넘으면 전체가 안 움직임. wide는 가로 이동 제외.
- 세로: tick 스냅 이동. drag-end에 커맨드 1개([[editor-commands]] §4).

### 클립보드

- 복사 = `{lane, relTick(선택 최소 tick 기준), duration, isWide}`. 붙여넣기 기준점 = 현재 스크롤 위치의 스냅 tick. 충돌(같은 lane+tick+isWide)은 조용히 스킵, 전부 충돌이면 토스트. 클립보드는 note/shape 별개(탭 로컬). 선택에 textEvents가 포함돼 있으면 **함께 복사·붙여넣기**된다 `[신규]`.

### 겹침 표시 — overlap / conflict `[수정]`

동시 입력 요구 수가 **그 대상의 키 수를 초과하면 conflict**, 키 수 이내의 겹침은 overlap으로 표시한다(검출 = domain, 표시 = render — [[judge]] §9와 동일 경계). 요구 수 계산에는 같은 tick의 노트뿐 아니라 **그 시점에 지속 중인 hold를 포함**한다 `[수정]` — lane 1·4에서 hold 중간의 같은 lane tap = conflict, lane 2·3의 hold 1 + tap 1 = overlap(2키 이내):

- lane 1·4 (키 1개): 2겹부터 conflict.
- lane 2·3 (키 2개): 2겹 = overlap, 3겹부터 conflict.
- wide: 동시 2겹부터 conflict.
- 검출 알고리즘(sweep-line·동시 활성 집합)의 단일 출처는 [[data-model]] §5.1 — conflict는 그 순간의 동시 활성 집합 전체에 표시된다.
- **conflict 해소 삭제** `[신규]`: conflict 집합을 대상으로 delete를 실행하면 **배치(추가)된 순서의 역순으로 capacity 초과분만** 삭제한다 — lane 2의 3겹 = 1개, 4겹 = 2개 삭제. 자동 삭제가 아니라 유저의 del 실행에만 반응한다. (notes 배열 순서 = 배치 순서 전제 → [[data-model]] §5.1. 근거 → [[rationale#overlap과 conflict 검출을 sweep-line n-way로 확장한 이유]].)

## 2. shapes 씬 — 서브모드 shape / lane

`T` = shape ⟷ lane 서브모드 전환 `[수정 — 구 line 툴 대체]`. 캔버스는 공유, 툴바·툴 키가 서브모드로 갈린다. lane 편집이 prompt(비율 4개) 방식이던 구 동작은 폐기([[lane-events]] 재설계에 따름).

- **선택·Ctrl+A는 서브모드 필터** `[신규]` — shape 모드에선 shape 이벤트만, lane 모드에선 lane 이벤트만 잡는다(A 드래그 포함). 유일한 예외는 mirror(Ctrl+F) — 현재 shape·lane 선택을 **합산**해 건다(§4).

### shape 서브모드 툴

| 키 | 툴 (구) | 동작 |
|---|---|---|
| `Q` | Blue (L) | Blue 체인 이벤트 탭 배치 |
| `W` | center (C) | 현재 폭 유지한 채 클릭 위치를 중심으로 Blue·Red 쌍 배치 |
| `E` | Red (R) | Red 체인 이벤트 탭 배치 |
| `R` | pinch (P) | 같은 위치에 Blue·Red 동시 배치(easing 좌/우 별도) |

- 배치 위치 스냅: `V` 순환 — 외부단위 `1 / 0.5 / 0.25` ([[shape]] §3과 동일 단위).
- init(easing null) 이동 = prompt 숫자 입력 **+ 드래그** `[신규]`. del·선택 삭제는 init을 지우지 않음(조용히 유지).
- 기존 이벤트 dot 드래그 = 위치 수정(drag-end 커맨드). 세부는 구 동작 재실측 그대로.

### lane 서브모드 툴 `[신규]`

| 키 | 툴 | 동작 |
|---|---|---|
| `Q`/`W`/`E` | line1 / line2 / line3 | 해당 구분선의 이벤트 탭 배치 (구분선은 툴로 명시 지정 — 클릭 추론 없음). **조합 유지(QW/WE/QE/QWE) = 그룹** `[신규]` |
| `R` (그룹 유지 중) | 간격 유지 ↔ pinch 전환 | 간격 유지 = 가장 오른쪽 라인이 커서를 따르고 나머지 오프셋 유지 / pinch = 그룹을 클릭 위치 한 점에 배치. S ON이면 조합은 symmetry 쌍 지정(§3) — 규칙 단일 출처는 [[lane-events]] §5 |

- 커맨드 3종(add/delete/mutate)은 [[editor-commands]] §6. 배치·수정 규칙은 [[lane-events]].

### easing 선택 (shape·lane 공통)

`1 / 2 / 3 / 4` = **Arc / In-Sine / Out-Sine / Linear** `[수정 — 구 1/2/3 = Arc/Out/In, Linear 키 추가·In-Out 순서 교체]`. 툴바 드롭다운 병행(pinch는 좌/우 별도). Arc는 입력 모드(문맥 자동 결정 — [[shape]]).

## 3. symmetry — `S` 토글 (shape·lane 공유) `[수정]`

ON이면 배치 시 대칭축 반대편에 자동 생성한다. **축 기본값 = 배치 지점에서 시간 그리드 스냅 기준 가장 가까운 tick 시점의 쌍 평균 위치** — shape는 Blue·Red 평균(=shape 중심), lane은 선택 쌍 평균. 축 드래그 범위는 좌표계별로 다르다: **shape 축 = −8~+8(외부단위), lane 축 = 상대 실수(가로 그리드 스냅 — [[lane-events]] §3·§5)**.

- `[번복]` 이전 확정("축 기본 0 고정" — shape / "쌍 init 중점" — lane)을 되돌린다. 구 코드 실측(동적 shape 중심)과 편집 감각이 이쪽이 맞다. → [[rationale#symmetry 축 기본값을 동적 스냅샷으로 되돌린 이유]]
- **lane 쌍 지정 = 두 키 조합** `Q+W`(1-2) / `W+E`(2-3) / `Q+E`(1-3) `[신규]`. 배치 클릭은 **쌍의 오른쪽 구분선** 위치를 찍고, 왼쪽 구분선이 축 대칭으로 자동 생성된다. 예: 구분선이 init 균등(0.25/0.5/0.75)인 상태에서 S ON + `Q+E`(쌍 1-3) + line3을 `0.9`에 클릭 → 축 = 쌍 평균 `0.5`, line1 = 2×0.5 − 0.9 = `0.1` 자동 생성. 대칭 결과가 0~1 밖이어도 그대로 저장된다([[lane-events]] §4 — 무구속).
- 생성 규칙(`targetPos′ = 2×축 − targetPos` 등) 자체는 [[shape]] §6·[[lane-events]] §5가 단일 출처.
- **적용 대상은 단일 배치 툴만** `[신규]` — shape Blue/Red, lane line1~3. center·pinch는 자체가 쌍 배치라 symmetry를 무시한다(4이벤트 생성 없음).
- **수동 축의 수명** `[신규]`: 드래그로 옮긴 축은 **토글 off까지 유지**된다(연속 배치에서 축이 튀지 않게). 자동(동적 스냅샷)으로 되돌리는 버튼을 둔다.

## 4. mirror — `Ctrl+F`, 선택 제자리 반전 `[수정]`

구 "flip-붙여넣기(Ctrl+F)"를 **선택물 제자리 mirror**로 바꾼다. 축은 **항상 중앙 0 고정**(symmetry의 동적 축과 별개).

- 노트: lane `1↔4, 2↔3`(wide 제외) — 매핑 표는 [[judge]] §4 단일 출처(플레이 mirror와 동일).
- shape: 위치 대칭 + **isBlue 반전**.
- lane: 구분선 순서 유지, 위치만 대칭.
- **shapes 씬에서 걸면 shape·lane 선택을 합쳐 한 번에** 건다.
- 클립보드 계열 이름: copy / paste / **mirror-paste**(구 flip-paste — Ctrl+F에서 해제, 버튼·메뉴로) / mirror.

## 5. 공통 모디파이어·전역 키

| 키 | 동작 | 태그 |
|---|---|---|
| `A` + 드래그 | 사각 선택 — **모디파이어**: 떼면 원래 툴 복귀, 선택은 유지. 기존 선택은 대체, `Shift` 병행 시 추가 | `[수정 — 구 A=sel 툴 전환]` |
| `S` | symmetry 토글 (shapes 씬) | `[수정]` |
| `D` | delete (선택 있으면 선택 삭제, 없으면 delete 툴) | |
| `Delete` | 선택 삭제 (**Backspace 제거**) | `[수정]` |
| `F` / `G` | follow(재생 따라가기) / grid 표시 토글 | |
| `Z` / `X` | 줌 아웃 / 인 (viewMs, [[editor-graph]] §3) | `[수정 — 구 +/-]` |
| `Space` | 재생 토글(notes/shapes = 현재 위치 미리보기, test = [[editor-graph]] §5) | |
| `Esc` | 취소 계단: 키설정 모드 → pending 입력 → 선택 해제 | |
| `Tab` | notes → shapes → test 순환 ([[editor-graph]] §1) | |

### test 씬 전용 키 (동작 정의 → [[editor-graph]] §5)

| 키 | 동작 |
|---|---|
| `Space` | 씬 안에서 현재 위치부터 즉시 재생 (lead-in 없음) — **idle 전용**: 세션 중 `Space`는 key3 lane 입력이고 정지는 `Esc`만. 우선순위 단일 출처 → [[settings]] §2 |
| `Enter` | gameplay scene 진입(전체화면) — 현재 위치부터 3초 lead-in |
| `Esc` | 세션 중단 → test idle 복귀 |
| `A` | autoplay 토글 (idle) |
| `F1` / `F2` / `F5` | 액션 키 — idle에서도 동작 `[보존]` |

## 6. Ctrl 계열

| 키 | 동작 | 태그 |
|---|---|---|
| `Ctrl+S` | workspace 즉시 저장 ([[persistence]] §4) | `[수정]` |
| `Ctrl+Shift+S` | **derive** — 새 UUID 파생 (confirm — [[persistence]] §4) | `[수정]` |
| `Ctrl+O` | 파일 열기 — OS 파일 픽커 직행 ([[persistence]] §5) | `[번복 — 파일 매니저 overlay 폐지]` |
| `Ctrl+E` | chart `.json` export — version +1, 현재 메모리 상태 기준 ([[persistence]] §4·[[cfx]] §7) | `[수정]` |
| `Ctrl+Z` / `Ctrl+Shift+Z`·`Ctrl+Y` | undo / redo (활성 scope — [[editor-commands]]) | |
| `Ctrl+C` / `Ctrl+V` | 복사 / 붙여넣기 | |
| `Ctrl+F` | **mirror** (§4) | `[수정 — 구 flip-paste]` |
| `Ctrl+D` | **duplicate 구간 복제** — 선택 구간을 그 길이만큼 바로 뒤에 복제 (Ableton식) | `[신규]` |
| `Ctrl+A` | 활성 탭 전체 선택 | |

- 에디터 키는 **고정(리바인딩 불가)** — settings 표에 편입하지 않는다(KEY-4a). 게임 키만 [[settings]] §2.

## 7. 결정 완료 / 잔여

확정:
- [x] note 툴 Q/W/E/R/T = tap/hold/wideTap/wideHold/text, sel+del 콤보, 드래그·클립보드 [보존]
- [x] quick-hold 실측 반영(300ms·savedLNDur 재사용·치환 규칙 — "시작 모드" 서술 정정)
- [x] overlap/conflict 기준 = 요구 입력 수 vs 키 수, **지속 중 hold 포함** / 클립보드 textEvents 동반
- [x] conflict 해소 삭제 = 배치 역순 초과분만 (검출 sweep-line·집합 표시는 data-model §5.1 단일 출처)
- [x] shapes 씬 서브모드(T 전환), shape 툴 Q/W/E/R = Blue/center/Red/pinch, lane 툴 Q/W/E = line1/2/3
- [x] easing 1/2/3/4 = Arc/In/Out/Linear, V = 위치 스냅 순환
- [x] symmetry(S): 동적 스냅샷 축 + 드래그(수동 축은 토글 off까지·자동 복귀 버튼), 단일 배치 툴만 적용, lane 쌍 = 키 조합, 오른쪽 기준 배치
- [x] mirror(Ctrl+F): 축 0 고정, isBlue 반전, shape+lane 합산, Ctrl+D 구간 복제 신설
- [x] A 드래그 선택(모디파이어 — 대체/Shift 추가) / D 삭제 / Delete만 / Z·X 줌 / F·G 유지 / 에디터 키 고정
- [x] 선택·Ctrl+A 서브모드 필터(mirror만 합산) / Ctrl+S=workspace·Ctrl+E=chart export·derive·Ctrl+O=OS 픽커 / **키 유일 출처 = 본 문서**

잔여:
- [ ] 히트 반경·드래그 임계 등 미세 수치 (재구현 시 원본 재실측 — 롱프레스 300ms는 실측 완료)
