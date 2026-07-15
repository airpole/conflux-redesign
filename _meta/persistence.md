# persistence — 영속성 단일 출처

> editor workspace(복구)·autosave·game library·열기/저장/패키징의 계약을 정의한다.
> 정본은 유저의 chart JSON 파일이다([[cfx]]). `.cfx`는 배포 패키지이며 에디터가 직접 덮어쓰지 않는다. 로컬 영속은 복구·library·records·settings만 담당한다.
> 저장 설비는 env 소관([[architecture]]). 파일 포맷은 [[cfx]], 기록은 [[records]], 설정은 [[settings]].

---

## 1. 스토어 4분리 `[수정]`

`workspace / library / records / settings`.

- workspace: 아직 파일로 저장하지 않은 dirty 편집 작업의 비정상 종료 복구용 단일 슬롯.
- library: game-internal에서 import한 `.cfx` blob.
- records/settings: 각 문서가 스키마 단일 출처.
- 에디터 정본용 songs/assets store는 두지 않는다.

---

## 2. 파일 저장 모델과 정본 `[번복]`

- 사용자의 chart JSON 파일이 편집 작업의 정본이다.
- workspace는 아직 파일로 남기지 않은 dirty 작업의 비정상 종료 복구용 단일 슬롯이며 그 자체로 정본이 아니다(§6).
- `.cfx`는 배포 패키지이며 에디터가 직접 덮어쓰지 않는다([[cfx]]).
- 내부 metadata(`songId + chartId + version`)가 정본이고 파일명은 편의 규약이다([[cfx]] §2·§4).

---

## 3. 단축키 `[번복]`

| 키 | 동작 |
|---|---|
| `Ctrl+S` | 현재 chart를 새 version JSON 파일로 저장한다(§4) |
| `Ctrl+O` | 다른 chart JSON 또는 `.cfx`를 연다(§9) |

- `Ctrl+E`(chart export)와 `Ctrl+Shift+S`(derive)는 제거한다.
- derive·duplicate-as-new-song 기능은 더 이상 존재하지 않는다. 새 곡 그룹은 새 song 생성(§7)으로만 시작한다.

---

## 4. version 저장 `[번복]`

- 기존 저장 파일을 연 상태에서 `Ctrl+S`를 누르면 저장 창이 **매번 표시**되고 현재 version보다 큰 다음 version을 기본 제안한다.
- 저장 창에서 위치, 파일명, version을 확인·수정할 수 있다.
- 선택 version은 현재 열린 version보다 커야 한다.
- 과거 version에서 다시 시작해도 더 큰 version을 직접 지정할 수 있다(예: v3을 열어 v6으로 저장).
- 파일 저장에 성공한 경우에만 메모리의 version을 확정한다.
- 취소 또는 실패 시 version을 변경하지 않는다.
- 내용 변경이 없어도 명시적으로 저장하면 새 version을 만든다.
- chart 파일에는 작업 계보 메모나 revision note를 추가하지 않는다.
- 내부 metadata가 정본이고 파일명은 편의 규약이다.

### 신규 chart 첫 저장

- 새 init과 새 난이도는 생성 즉시 메모리에서 `version = 1`이다.
- 아직 파일로 저장되지 않았으므로 workspace의 `baseVersion = null`이다.
- 첫 `Ctrl+S`는 version을 올리지 않고 v1로 저장한다.
- 이후 저장부터 더 큰 version을 제안한다.

---

## 5. dirty와 세션 전환 `[신규]`

마지막 성공한 파일 저장 이후 workspace-persisted state가 변경되면 dirty다.

dirty 발생 대상:

- command dispatch
- undo/redo
- chart 필드 변경
- music 변경
- jacket 변경
- 그 밖의 workspace에 저장되는 편집 상태 변경

workspace autosave는 dirty를 해제하지 않는다.

다음 동작으로 현재 chart 세션을 교체하거나 이탈할 때 dirty라면 확인한다.

- `Ctrl+O`
- 새 난이도 생성
- editor에서 mode-select/title로 이탈
- 다른 복구 상태 또는 chart로 교체

선택지:

- `Save New Version`
- `Discard Changes`
- `Cancel`

규칙:

- Save 성공 후에만 전환을 계속한다.
- 저장 취소·실패 시 현재 세션을 유지한다.
- Discard는 현재 메모리 변경과 해당 workspace 복구본을 폐기한다.
- Cancel은 전환을 취소한다.
- clean이면 확인 없이 전환한다.

---

## 6. workspace — dirty 전용 복구 슬롯 `[번복]`

workspace는 dirty 작업만 저장하는 단일 복구 슬롯이다.

최소 복구 메타:

```text
chart
+ music Blob
+ jacket Blob | null
+ dirty
+ baseVersion
```

`dirty`·`baseVersion`은 chart JSON이나 `.cfx`에 포함하지 않는다([[data-model]]·[[cfx]] 스키마 밖).

규칙:

- autosave는 workspace-persisted state의 마지막 변경 30초 후 실행한다.
- editor 이탈 시 dirty라면 즉시 workspace 저장을 시도한다.
- 파일 저장 성공 시 dirty를 해제하고 workspace를 삭제한다.
- 저장 성공 후 삭제 전 workspace를 `dirty = false`로 갱신하고 삭제를 시도한다.
- workspace 삭제 실패가 파일 저장 성공을 무효화하지 않는다.
- Discard 시 workspace를 삭제한다.
- clean 상태에서는 workspace를 유지하지 않는다.
- 복구된 세션은 dirty 상태로 시작한다.
- "이어서 편집"은 유효한 dirty workspace가 있을 때만 표시한다(§9).
- 다음 실행에서 `dirty = false`인 workspace는 stale로 보고 노출하지 않고 정리한다.

---

## 7. 새 song과 init `[번복]`

새 song 생성 결과는 init chart다.

init:

- `chartId = 0`
- `difficulty = init`
- `version = 1`
- songId와 모든 chart 필드를 가질 수 있음
- notes, shapeEvents, laneEvents, textEvents는 빈 배열
- 편집·저장 가능한 JSON chart
- 새 난이도의 기본 출발점
- 기존 playable chart를 통제하는 정본은 아님

각 chart는 생성 후 완전히 독립적이다([[data-model]] §1).

---

## 8. 새 난이도 `[번복]`

새 난이도는 init 또는 현재 playable chart에서 만들 수 있다.

모드:

- `Start Blank`
- `Use Current Chart`

**Start Blank**

- 현재 chart의 모든 비플레이 필드를 초기값으로 복사한다.
- notes, shapeEvents, laneEvents, textEvents는 빈 배열이다.

**Use Current Chart**

복사할 배열을 사용자가 선택한다: Notes / Shapes / Lanes / Text. 기본값은 모두 선택이다. 선택하지 않은 배열은 빈 배열이다.

새 chart:

- 새 `chartId`·`difficulty`·`subtitle`·`level`·`chartBy`
- `version = 1`, workspace `baseVersion = null`
- 원본 chart의 version은 상속하지 않는다
- 원본 chart는 변경하지 않는다
- 생성 후 새 chart 세션으로 전환하고 히스토리를 초기화한다

command·세션 연계는 [[editor-commands]] §7, UI 진입은 [[editor-graph]] §4.

---

## 9. editor 진입·열기

start scene:

- 새 chart(init) 만들기 — 새 song 생성(§7);
- chart JSON 열기;
- `.cfx` 열기;
- 이어서 편집(§6의 유효한 dirty workspace가 있을 때만).

`Ctrl+O`는 OS file picker.

### chart JSON

- chart 데이터를 연다.
- asset은 workspace의 연결 또는 사용자가 선택한 파일로 해소한다.
- music decode 실패에도 데이터는 열고 수동 재지정 허용.
- jacket 실패는 placeholder + 재지정 허용.

### `.cfx`

1. package 전체 검증;
2. init 포함 chart 목록 표시;
3. chart 하나 선택;
4. 그 chart + 참조 asset만 workspace 복원;
5. 화면 동기화·history baseline clear·toast.

`.cfx` 전체를 multi-chart workspace로 복원하지 않는다. `.cfx` 직접 덮어쓰기 없음.

`Ctrl+O`·새 난이도 생성 등으로 현재 세션을 교체할 때 dirty라면 §5의 확인 절차를 따른다.

---

## 10. chart JSON asset — 열기·누락 처리 `[번복]`

asset 필드 스키마는 [[data-model]] §3, 패키지 유효성 규칙은 [[cfx]] §7~§10.

chart JSON을 단독으로 열 때:

- 실제 music/jacket Blob은 workspace에 없을 수 있다.
- 파일명은 유지한다.
- 필요한 경우 사용자가 asset을 다시 선택한다.
- 다시 선택한 파일명이 다르면 해당 필드를 새 이름으로 갱신한다.

music Blob이 없을 때:

- chart JSON 로드 허용.
- 시간 기반 타임라인과 탐색은 항상 활성화.
- chart 데이터 편집 허용.
- 오디오 재생 불가 상태 표시.
- 새 version JSON 저장 허용.
- `.cfx` 패키징은 차단([[cfx]] §10).

jacket이 없을 때:

- 편집, 저장, 패키징, 플레이 모두 허용.
- 완전한 검정이 아닌 눈이 편안한 기본 암색 배경을 표시한다(에디터와 게임이 자체 렌더링).
- 대체 jacket asset을 `.cfx`에 자동 추가하지 않는다.
- 범용 jacket 기능은 향후 후보이며 이번 범위에서 구현 계약을 만들지 않는다.

별도의 "미리듣기 기능"은 이번 명세에 새로 추가하지 않는다.

---

## 11. `.cfx` 패키징 UX `[신규]`

기본 입력은 user-selected chart JSON이다([[cfx]] §9).

- 선택 chart를 `songId`별로 그룹화한다.
- `chartId`별 최고 version을 기본 추천한다.
- equal-version duplicate는 사용자 해소가 필요하다.
- missing referenced asset만 추가 선택한다.
- 다른 파일명 asset으로 참조를 바꾸지 않는다. 정확한 이름의 파일만 허용한다.
- re-scan/rebuild 시 수동 구버전 선택을 버리고 최신을 다시 추천한다.
- group별로 독립 검증·생성한다.
- unused asset은 표시 후 제외한다.
- output 기본 이름 충돌은 사용자가 수정한다.

패키징은 비파괴다. 성공·취소·실패 모두 workspace/version/source file 불변이며 취소는 무변경 종료다.

---

## 12. game library — editor와 분리

- game-public: bundled curated `.cfx`만.
- game-internal: bundled + library store.
- library value: `.cfx` blob 통째, key=`songId`.
- import는 [[cfx]] 구조 검증 + playable music decode 검증을 통과해야 등록.
- jacket decode 실패는 placeholder와 경고.

### 같은 songId reimport

confirm UI에서:

- playable chart는 `songId:chartId`로 비교하고, version 비교는 각 chart 내부 version을 사용한다;
- init은 기록·버전 비교 대상에서 제외한다;
- 추가·삭제·upgrade·downgrade를 표시한다.

별개 song은 새 song 생성(§7)으로만 새 `songId`를 발급한다. derive 경로는 없다.

**구버전 reimport 정책은 보류한다.** 가져온 chart version이 보유 version보다 낮을 때 허용할지 거부할지는 persistence 후속 review에서 결정한다. 현재 단계에서는 자동 overwrite하지 않고 비교 결과를 사용자에게 표시한다.

**records migration은 수행하지 않는다.** chartId rename 감지·본문 비교·record key 이동을 하지 않는다([[records]]).

### 삭제

song-select에서 confirm 후 `.cfx` blob 삭제. records 삭제 여부는 [[records]]의 고아 기록 정책을 따른다.

---

## 13. records 경계

persistence와 `.cfx` loader는:

- record를 이동하거나 rewrite하지 않음;
- init을 records 대상으로 만들지 않음;
- 수정 chart content의 기록 연결을 판단하지 않음.

content fingerprint와 수정 chart 연결 정책은 [[records]] 후속 review로 보류한다.

---

## 14. 결정 완료 / 잔여

확정:

- [x] workspace/library/records/settings 4분리
- [x] chart JSON 파일이 정본, workspace는 dirty 전용 복구 슬롯 `[번복]`
- [x] Ctrl+S = 새 version JSON 저장(저장 창 매번 표시) `[번복]`
- [x] Ctrl+E·Ctrl+Shift+S·derive·duplicate-as-new-song 제거 `[번복]`
- [x] dirty 정의·세션 전환 confirm(Save New Version/Discard/Cancel) `[신규]`
- [x] workspace 최소 메타(chart·asset blob·dirty·baseVersion), autosave 30초·stale 정리
- [x] 새 song 생성 = init(`version=1`, 빈 이벤트) `[번복]`
- [x] 새 난이도 Start Blank / Use Current Chart 모드 `[번복]`
- [x] chart JSON 단독 열기·music/jacket 누락 처리, 미리듣기 기능 미추가
- [x] start scene·Ctrl+O·single-chart open
- [x] user-selected `.cfx` packaging UX·비파괴 상태 전이
- [x] library `.cfx` blob·songId:chartId 비교 UI
- [x] reimport records migration 폐기

잔여 `[보류]`:

- [ ] 구버전 `.cfx` reimport 허용/거부 정책
- [ ] records의 content 변경 연결/fingerprint([[records]] 후속 review)
